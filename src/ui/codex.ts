import { BIOMES } from '../data/biomes';
import { buildTimeline } from '../game/timeline';
import { momentHint, MOMENTS, momentsFor, tankMoments as wholeTankMoments } from '../data/moments';
import { moonIconSvg, moonPhaseName } from '../util/moon';
import { APP_COMMIT, APP_VERSION } from '../version';
import { DEV_TOOLS } from '../dev/enabled';
import { ALL_SPECIES, getSpecies } from '../data/species';
import { BIOME_ORDER, BIOME_RULES } from '../data/progression';
import type { Codex } from '../data/codex';
import type { BiomeId, Species } from '../data/types';
import type { Action } from '../input/actions';
import { renderFish, restPose } from '../render/fish/renderFish';
import { type RotationMinutes, type SaveState, SOUND_LEVELS } from '../save/schema';
import { TAU } from '../util/math';
import { FocusGroup } from './focus';
import { escapeHtml, type UiRoot } from './root';
import { drawRangeMap } from './worldMap';

/** What the codex needs from the app. */
export interface CodexHost {
  readonly state: SaveState;
  setRotation(min: RotationMinutes): void;
  setDayNight(on: boolean): void;
  /** Change other settings (close-ups, sound). */
  setSettings(patch: Partial<SaveState['settings']>): void;
  resetProgress(): void;
  /** Close the app (only offered on the TV). */
  exitApp(): void;
  readonly canExit: boolean;
  /** Tonight's moon phase, 0 new .. 0.5 full (spec v1.4 §2). */
  moonPhase(): number;
  /** Called when the codex closes itself (Back from the grid). */
  onClose(): void;
  /**
   * Development builds only: open god mode. Shown as a settings row, for TV
   * remotes without the colour buttons (e.g. LG's Magic Remote).
   */
  openGodMode?: () => void;
}

/** A codex tab: one per tank, the timeline (v1.4), and settings. */
type Tab = BiomeId | 'timeline' | 'settings';
type Page = { kind: 'grid'; tab: Tab } | { kind: 'entry'; id: string };

/** How each size measure is explained after the number (see Codex.size). */
const SIZE_NOTE: Record<Codex['size']['measure'], string> = {
  TL: '',
  SL: ' (not counting the tail fin)',
  WD: ' across the bell',
};

const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare visitor' } as const;
const ROTATIONS: RotationMinutes[] = [0, 5, 15, 30];
const SOUND_LABEL = { off: 'Off', quiet: 'Quiet', normal: 'Normal' } as const;
/** Water behind fish on codex cards and entry pages, top and bottom colour per tank. */
const CARD_WATER: Record<BiomeId, [string, string]> = {
  reef: ['#0d5d7e', '#06324c'],
  amazon: ['#4c5126', '#232510'],
  deep: ['#0b1a30', '#02060e'],
};
const ENTRY_WATER: Record<BiomeId, [string, string]> = {
  reef: ['#0e6488', '#052b42'],
  amazon: ['#575c2c', '#1f210e'],
  deep: ['#0c1c34', '#02050c'],
};

/**
 * The codex (spec 5.2, 5.3, 5.4): a tab per tank with a card per species, a
 * detail page per species, and a settings tab. Fully usable with the D-pad.
 */
export class CodexScreen {
  readonly el: HTMLDivElement;
  private readonly focus: FocusGroup;
  private page: Page;
  private time = 0;
  /** Canvases that need redrawing each frame, with what to draw. */
  private live: Array<{ canvas: HTMLCanvasElement; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> = [];
  private confirmReset: number | null = null;
  private confirmExit: number | null = null;

  constructor(
    root: UiRoot,
    private readonly host: CodexHost,
    startBiome: BiomeId,
    private readonly pixelScale: () => number,
  ) {
    this.el = root.add('div', 'tw-codex');
    this.focus = new FocusGroup(this.el);
    this.page = { kind: 'grid', tab: startBiome };
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.render();
    this.focus.focusFirst('[data-card]');
  }

  close(): void {
    this.el.remove();
  }

  /** Handle a remote action. Returns false if the codex should close. */
  handle(action: Action): boolean {
    switch (action) {
      case 'back':
        if (this.page.kind === 'entry') {
          this.showGrid(getSpecies(this.page.id)!.biome, this.page.id);
          return true;
        }
        return false;
      case 'up':
      case 'down':
        this.move(action);
        return true;
      case 'left':
      case 'right':
        if (this.page.kind === 'entry') {
          this.stepEntry(action === 'left' ? -1 : 1);
          return true;
        }
        if (this.adjustSetting(action === 'left' ? -1 : 1)) return true;
        this.move(action);
        return true;
      case 'select':
        this.activate(this.focus.focused);
        return true;
      default:
        return true;
    }
  }

  update(dt: number): void {
    this.time += dt;
    const ps = this.pixelScale();
    for (const l of this.live) {
      const ctx = l.canvas.getContext('2d');
      if (!ctx) continue;
      const w = l.canvas.width / ps;
      const h = l.canvas.height / ps;
      ctx.setTransform(ps, 0, 0, ps, 0, 0);
      l.draw(ctx, w, h);
    }
    const now = performance.now();
    if (this.confirmReset !== null && now > this.confirmReset) {
      this.confirmReset = null;
      this.refreshSettings();
    }
    if (this.confirmExit !== null && now > this.confirmExit) {
      this.confirmExit = null;
      this.refreshSettings();
    }
  }

  // ---------------------------------------------------------------- navigation

  private move(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.focus.move(dir)) return;
    const f = this.focus.focused;
    // Moving onto a tank tab shows that tank's cards.
    const tab = f?.dataset.tab as Tab | undefined;
    if (tab && this.page.kind === 'grid' && this.page.tab !== tab) {
      this.page = { kind: 'grid', tab };
      this.render();
      this.focus.focus(this.el.querySelector<HTMLElement>(`[data-tab="${tab}"]`));
    }
    this.liveFocusedCard();
    this.scrollTimeline();
  }

  private activate(el: HTMLElement | null): void {
    if (!el) return;
    if (el.dataset.species) {
      const p = this.host.state.species[el.dataset.species]?.state ?? 'unseen';
      if (p !== 'unseen') this.showEntry(el.dataset.species);
      return;
    }
    switch (el.dataset.setting) {
      case 'rotation':
      case 'daynight':
      case 'closeups':
      case 'sound':
        this.adjustSetting(1);
        return;
      case 'reset':
        if (this.confirmReset !== null) {
          this.confirmReset = null;
          this.host.resetProgress();
          this.page = { kind: 'grid', tab: 'settings' };
          this.render();
          this.focus.focus(this.el.querySelector('[data-setting="reset"]'));
        } else {
          this.confirmReset = performance.now() + 4000;
          this.refreshSettings();
        }
        return;
      case 'god':
        this.host.openGodMode?.();
        return;
      case 'exit':
        if (this.confirmExit !== null) this.host.exitApp();
        else {
          this.confirmExit = performance.now() + 4000;
          this.refreshSettings();
        }
        return;
    }
  }

  private adjustSetting(dir: 1 | -1): boolean {
    const s = this.focus.focused?.dataset.setting;
    const settings = this.host.state.settings;
    if (s === 'rotation') {
      const i = ROTATIONS.indexOf(settings.rotationMin);
      this.host.setRotation(ROTATIONS[(i + dir + ROTATIONS.length) % ROTATIONS.length]!);
      this.refreshSettings();
      return true;
    }
    if (s === 'daynight') {
      this.host.setDayNight(!settings.dayNight);
      this.refreshSettings();
      return true;
    }
    if (s === 'closeups') {
      this.host.setSettings({ closeups: !settings.closeups });
      this.refreshSettings();
      return true;
    }
    if (s === 'sound') {
      const i = SOUND_LEVELS.indexOf(settings.sound);
      this.host.setSettings({ sound: SOUND_LEVELS[(i + dir + SOUND_LEVELS.length) % SOUND_LEVELS.length]! });
      this.refreshSettings();
      return true;
    }
    return false;
  }

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-focus]');
    if (!el) return;
    this.focus.focus(el);
    if (el.dataset.tab && this.page.kind === 'grid') {
      this.page = { kind: 'grid', tab: el.dataset.tab as Tab };
      this.render();
      this.focus.focus(this.el.querySelector(`[data-tab="${el.dataset.tab}"]`));
      return;
    }
    if (el.dataset.nav) {
      this.stepEntry(el.dataset.nav === 'prev' ? -1 : 1);
      return;
    }
    this.activate(el);
  }

  // ---------------------------------------------------------------- pages

  private showGrid(tab: Tab, focusId?: string): void {
    this.page = { kind: 'grid', tab };
    this.render();
    if (focusId) this.focus.focus(this.el.querySelector(`[data-species="${focusId}"]`));
    else this.focus.focusFirst('[data-card]');
    this.liveFocusedCard();
  }

  private showEntry(id: string): void {
    this.page = { kind: 'entry', id };
    this.render();
  }

  /** The species you can step through on entry pages: not-unseen ones in that tank. */
  private browsable(biome: BiomeId): Species[] {
    return ALL_SPECIES.filter((s) => s.biome === biome && (this.host.state.species[s.id]?.state ?? 'unseen') !== 'unseen');
  }

  private stepEntry(dir: 1 | -1): void {
    if (this.page.kind !== 'entry') return;
    const sp = getSpecies(this.page.id)!;
    const list = this.browsable(sp.biome);
    const i = list.findIndex((s) => s.id === sp.id);
    const next = list[(i + dir + list.length) % list.length];
    if (next) this.showEntry(next.id);
  }

  private render(): void {
    this.live = [];
    this.el.innerHTML = this.page.kind === 'grid' ? this.gridHtml(this.page.tab) : this.entryHtml(this.page.id);
    this.el.className = `tw-codex tw-codex-${this.page.kind}`;
    if (this.page.kind === 'grid') this.setupGridCanvases();
    else this.setupEntryCanvases(this.page.id);
  }

  private gridHtml(tab: Tab): string {
    const state = this.host.state;
    const tabs = BIOME_ORDER.map((b) => {
      const all = ALL_SPECIES.filter((s) => s.biome === b);
      const have = all.filter((s) => state.species[s.id]?.state === 'collected').length;
      const unlocked = state.unlockedBiomes.includes(b);
      const label = unlocked ? `${have} / ${all.length}` : 'locked';
      return `<div class="tw-tab${tab === b ? ' tw-active' : ''}" data-focus data-tab="${b}">${escapeHtml(BIOMES[b].name)}<span>${label}</span></div>`;
    }).join('');
    const timelineTab = `<div class="tw-tab tw-tab-timeline${tab === 'timeline' ? ' tw-active' : ''}" data-focus data-tab="timeline">Timeline</div>`;
    const settingsTab = `<div class="tw-tab tw-tab-settings${tab === 'settings' ? ' tw-active' : ''}" data-focus data-tab="settings">Settings</div>`;
    const header = `<header><h1>Codex</h1><nav>${tabs}${timelineTab}${settingsTab}</nav></header>`;
    const footer = `<footer><b>▲ ▼ ◀ ▶</b> move &nbsp; <b>OK</b> open &nbsp; <b>BACK</b> close</footer>`;
    if (tab === 'settings') return `${header}${this.settingsHtml()}${footer}`;
    if (tab === 'timeline') return `${header}${this.timelineHtml()}${footer}`;

    if (!state.unlockedBiomes.includes(tab)) {
      const rule = BIOME_RULES.find((r) => r.biome === tab)!;
      const req = rule.requires!;
      const have = ALL_SPECIES.filter((s) => s.biome === req.biome && state.species[s.id]?.state === 'collected').length;
      return `${header}<div class="tw-locked"><div class="tw-lock-icon">🔒</div><h2>${escapeHtml(BIOMES[tab].name)} is locked</h2>
        <p>Collect ${req.collected} fish in the ${escapeHtml(BIOMES[req.biome].name.toLowerCase())} to discover it. You have ${Math.min(have, req.collected)} of ${req.collected}.</p></div>${footer}`;
    }

    const cards = ALL_SPECIES.filter((s) => s.biome === tab)
      .map((s) => {
        const p = state.species[s.id]?.state ?? 'unseen';
        const name = p === 'unseen' ? 'Not found yet' : s.commonName;
        const status = p === 'collected' ? RARITY_LABEL[s.rarity] : p === 'sighted' ? 'Sighted · catch it to learn more' : s.rarity === 'rare' ? 'Watch for rare visitors' : 'Keep watching';
        return `<div class="tw-card tw-${p}" data-focus data-card data-species="${s.id}"><canvas></canvas><div class="tw-card-name">${escapeHtml(name)}</div><div class="tw-card-status">${escapeHtml(status)}</div></div>`;
      })
      .join('');
    // Moments seen in this tank (spec v1.4 §3.5).
    const tankMoments = MOMENTS.filter((m) => m.biome === tab);
    const seen = tankMoments.filter((m) => state.moments[m.id]).length;
    const gridFooter = tankMoments.length
      ? footer.replace('</footer>', `<span class="tw-footer-stat">Moments seen: ${seen} / ${tankMoments.length}</span></footer>`)
      : footer;
    // Whole-tank moments (coral spawning) don't belong to one animal: one line under the grid.
    const whole = wholeTankMoments(tab)
      .map((m) => {
        const w = state.moments[m.id];
        const body = w
          ? `${escapeHtml(m.fact)} <span class="tw-moment-date">Seen ${escapeHtml(longDate(w.witnessedAt))}</span>`
          : `<span class="tw-moment-unseen">Not seen yet · ${escapeHtml(momentHint(m))}</span>`;
        return `<div class="tw-tank-moment tw-moment"><b>${escapeHtml(m.name)}</b> ${body}</div>`;
      })
      .join('');
    return `${header}<div class="tw-grid">${cards}</div>${whole}${gridFooter}`;
  }

  private settingsHtml(): string {
    const s = this.host.state.settings;
    const rot = s.rotationMin === 0 ? 'Off' : `Every ${s.rotationMin} min`;
    const reset = this.confirmReset !== null ? 'Press OK again to erase all progress' : 'Start over with a fresh collection';
    const exit = this.confirmExit !== null ? 'Press OK again to close Tidewatch' : 'Close the app';
    return `<div class="tw-settings">
      <div class="tw-setting" data-focus data-setting="rotation"><span>Switch tanks automatically</span><b>‹ ${rot} ›</b></div>
      <div class="tw-setting" data-focus data-setting="daynight"><span>Day and night lighting</span><b>‹ ${s.dayNight ? 'On' : 'Off'} ›</b></div>
      <div class="tw-setting" data-focus data-setting="closeups"><span>Close-ups of fish now and then</span><b>‹ ${s.closeups ? 'On' : 'Off'} ›</b></div>
      <div class="tw-setting" data-focus data-setting="sound"><span>Ambient sound</span><b>‹ ${SOUND_LABEL[s.sound]} ›</b></div>
      <div class="tw-setting tw-danger${this.confirmReset !== null ? ' tw-armed' : ''}" data-focus data-setting="reset"><span>Reset progress</span><b>${reset}</b></div>
      ${DEV_TOOLS && this.host.openGodMode ? `<div class="tw-setting" data-focus data-setting="god"><span>Open god mode</span><b>Development build</b></div>` : ''}
      ${this.host.canExit ? `<div class="tw-setting${this.confirmExit !== null ? ' tw-armed' : ''}" data-focus data-setting="exit"><span>Exit Tidewatch</span><b>${exit}</b></div>` : ''}
      <p class="tw-moon">${moonIconSvg(this.host.moonPhase())}<span>Tonight's moon: <b>${moonPhaseName(this.host.moonPhase())}</b>${s.dayNight ? '' : ' (moonlight needs day and night lighting on)'}</span></p>
      <p class="tw-about">Fish facts come from FishBase and the other sources listed in each codex entry. Map data: Natural Earth.</p>
      <p class="tw-about tw-build">Tidewatch ${APP_VERSION} · build ${APP_COMMIT}</p>
    </div>`;
  }

  /** Update the settings rows in place (keeps focus). */
  private refreshSettings(): void {
    if (this.page.kind !== 'grid' || this.page.tab !== 'settings') return;
    const focused = this.focus.focused?.dataset.setting;
    const box = this.el.querySelector('.tw-settings');
    if (!box) return;
    box.outerHTML = this.settingsHtml();
    if (focused) this.focus.focus(this.el.querySelector(`[data-setting="${focused}"]`));
  }

  private entryHtml(id: string): string {
    const s = getSpecies(id)!;
    const p = this.host.state.species[id]!;
    const c = s.codex;
    const browsable = this.browsable(s.biome);
    const pos = `${browsable.findIndex((x) => x.id === id) + 1} of ${browsable.length}`;
    const footer =
      browsable.length > 1
        ? `<footer><span class="tw-navkey" data-focus data-nav="prev">◀</span><span class="tw-navkey" data-focus data-nav="next">▶</span> previous / next (${pos}) &nbsp; <b>BACK</b> codex</footer>`
        : `<footer><b>BACK</b> codex</footer>`;
    if (p.state !== 'collected') {
      return `<div class="tw-entry"><div class="tw-entry-visual"><canvas class="tw-entry-fish"></canvas></div>
        <div class="tw-entry-text"><div class="tw-kicker">${escapeHtml(BIOMES[s.biome].name)} · Sighted</div><h2>${escapeHtml(s.commonName)}</h2>
        <p class="tw-sighted-note">You've seen this rare visitor swim by. Catch it next time it appears to unlock its codex entry.</p></div></div>
        ${footer}`;
    }
    const date = p.collectedAt ? new Date(p.collectedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const temp = c.water.tempC ? `, ${c.water.tempC[0]}–${c.water.tempC[1]} °C` : '';
    const size = `Up to ${c.size.cm} cm${SIZE_NOTE[c.size.measure]}`;
    const fact = (label: string, value: string) => `<div class="tw-fact"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
    const sourceLabels = [...new Set([...c.sources, ...momentsFor(id).flatMap((m) => m.sources)].map((x) => x.label))];
    return `<div class="tw-entry">
      <div class="tw-entry-visual"><canvas class="tw-entry-fish"></canvas><canvas class="tw-entry-map"></canvas><div class="tw-map-label">Native range</div></div>
      <div class="tw-entry-text">
        <div class="tw-kicker">${escapeHtml(BIOMES[s.biome].name)} · ${RARITY_LABEL[s.rarity]}${date ? ` · collected ${escapeHtml(date)}` : ''}</div>
        <h2>${escapeHtml(s.commonName)}</h2>
        <div class="tw-sci">${escapeHtml(s.scientificName)}</div>
        <dl>
          ${fact('Native range', c.nativeRange)}
          ${fact('Habitat', c.habitat)}
          ${fact('Size', size)}
          ${fact('Diet', c.diet)}
          ${fact('Water', `${c.water.type === 'salt' ? 'Salt water' : 'Fresh water'}${temp}`)}
        </dl>
        <h3>Did you know?</h3>
        <ul>${c.funFacts.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        ${this.momentsHtml(id)}
        <div class="tw-sources">Sources: ${sourceLabels.map(escapeHtml).join(' · ')}</div>
      </div></div>
      ${footer}`;
  }

  /** Everything that happened, newest first, grouped by day (spec v1.4 §4). */
  private timelineHtml(): string {
    const entries = buildTimeline(this.host.state, ALL_SPECIES, MOMENTS);
    if (!entries.length) return `<div class="tw-timeline"><p class="tw-tl-empty">Nothing has happened yet. Keep watching.</p></div>`;
    let day = '';
    const rows: string[] = [];
    for (const e of entries) {
      const d = longDate(e.at);
      if (d !== day) {
        day = d;
        rows.push(`<h3 class="tw-tl-day">${escapeHtml(d)}</h3>`);
      }
      const time = new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      rows.push(
        `<div class="tw-tl-row tw-tl-${e.kind}" data-focus data-tl><span class="tw-tl-time">${escapeHtml(time)}</span>` +
          `<span class="tw-tl-title">${escapeHtml(e.title)}</span><span class="tw-tl-detail">${escapeHtml(e.detail)}</span></div>`,
      );
    }
    return `<div class="tw-timeline">${rows.join('')}</div>`;
  }

  /** Keep the focused timeline row in view as the D-pad moves through it. */
  private scrollTimeline(): void {
    const el = this.focus.focused;
    const box = el?.closest<HTMLElement>('.tw-timeline');
    if (!el || !box) return;
    const top = el.offsetTop - box.scrollTop;
    if (top < 60) box.scrollTop = Math.max(0, el.offsetTop - 60);
    else if (top + el.offsetHeight > box.clientHeight - 20) box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 20;
  }

  /** A species' moments: what you've seen, and when to watch for the rest (spec v1.4 §3.5). */
  private momentsHtml(speciesId: string): string {
    const list = momentsFor(speciesId);
    if (!list.length) return '';
    const items = list
      .map((m) => {
        const w = this.host.state.moments[m.id];
        if (!w) return `<li class="tw-moment tw-moment-unseen"><b>?</b> Not seen yet · ${escapeHtml(momentHint(m))}</li>`;
        const date = longDate(w.witnessedAt);
        return `<li class="tw-moment"><b>${escapeHtml(m.name)}</b> ${escapeHtml(m.fact)} <span class="tw-moment-date">Seen ${escapeHtml(date)}</span></li>`;
      })
      .join('');
    return `<h3>Moments</h3><ul class="tw-moments">${items}</ul>`;
  }

  // ---------------------------------------------------------------- canvases

  private sizeCanvas(c: HTMLCanvasElement): void {
    const ps = this.pixelScale();
    c.width = Math.round(c.clientWidth * ps);
    c.height = Math.round(c.clientHeight * ps);
  }

  private setupGridCanvases(): void {
    this.el.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      const canvas = card.querySelector('canvas')!;
      this.sizeCanvas(canvas);
      this.drawCard(canvas, card.dataset.species!, false);
    });
    this.liveFocusedCard();
  }

  /** Only the focused card swims; the others are drawn once, still. */
  private liveFocusedCard(): void {
    this.live = this.live.filter((l) => !l.canvas.closest('[data-card]'));
    this.el.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      if (card !== this.focus.focused) this.drawCard(card.querySelector('canvas')!, card.dataset.species!, false);
    });
    const f = this.focus.focused;
    if (f?.dataset.card !== undefined && f.dataset.species) {
      const canvas = f.querySelector('canvas')!;
      const id = f.dataset.species;
      this.live.push({ canvas, draw: (ctx, w, h) => this.paintCard(ctx, w, h, id, true) });
    }
  }

  private drawCard(canvas: HTMLCanvasElement, id: string, animate: boolean): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ps = this.pixelScale();
    ctx.setTransform(ps, 0, 0, ps, 0, 0);
    this.paintCard(ctx, canvas.width / ps, canvas.height / ps, id, animate);
  }

  private paintCard(ctx: CanvasRenderingContext2D, w: number, h: number, id: string, animate: boolean): void {
    const s = getSpecies(id)!;
    const state = this.host.state.species[id]?.state ?? 'unseen';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, CARD_WATER[s.biome][0]);
    g.addColorStop(1, CARD_WATER[s.biome][1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (state === 'unseen') {
      ctx.fillStyle = 'rgba(220,240,255,0.35)';
      ctx.font = `600 ${Math.round(h * 0.5)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', w / 2, h / 2);
      return;
    }
    const length = Math.min(w * 0.62, (h * 0.5) / Math.max(0.2, (s.look.body.upper ?? 0.2) + 0.12));
    const pose = restPose(w / 2 + length * 0.05, h / 2, length);
    if (animate) {
      pose.phase = this.time * s.look.swim.tailHz * TAU * 0.6;
      pose.finPhase = this.time * 1.4 * TAU;
      pose.y += Math.sin(this.time * 1.2) * h * 0.03;
    }
    renderFish(ctx, s.look, pose, state === 'sighted' ? { silhouette: 'rgba(3,12,22,0.85)' } : {});
  }

  private setupEntryCanvases(id: string): void {
    const s = getSpecies(id)!;
    const collected = this.host.state.species[id]?.state === 'collected';
    const fish = this.el.querySelector<HTMLCanvasElement>('.tw-entry-fish')!;
    this.sizeCanvas(fish);
    this.live.push({
      canvas: fish,
      draw: (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, ENTRY_WATER[s.biome][0]);
        g.addColorStop(1, ENTRY_WATER[s.biome][1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const length = Math.min(w * 0.6, (h * 0.62) / Math.max(0.2, (s.look.body.upper ?? 0.2) + 0.14));
        const pose = restPose(w / 2 + length * 0.05, h / 2 + Math.sin(this.time * 0.9) * h * 0.03, length);
        pose.phase = this.time * s.look.swim.tailHz * TAU * 0.5;
        pose.finPhase = this.time * 1.3 * TAU;
        pose.flex = s.look.swim.flex;
        renderFish(ctx, s.look, pose, collected ? {} : { silhouette: 'rgba(3,12,22,0.85)' });
      },
    });
    const map = this.el.querySelector<HTMLCanvasElement>('.tw-entry-map');
    if (map) {
      this.sizeCanvas(map);
      this.live.push({ canvas: map, draw: (ctx, w, h) => drawRangeMap(ctx, w, h, s.codex.range, this.time) });
    }
    this.focus.focus(null);
  }
}

/** "19 November 2026", in the TV's language. */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
