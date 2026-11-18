/**
 * God mode (spec 5.6): a developer panel for testing everything without
 * waiting. Development builds only. Every change goes through the game's own
 * actions, so it can't create a state normal play couldn't reach (except
 * summoning a visitor that's already been caught).
 */
import { BIOMES } from '../data/biomes';
import { ALL_SPECIES, getSpecies, speciesIn } from '../data/species';
import { BIOME_ORDER } from '../data/progression';
import type { BiomeId } from '../data/types';
import type { RuntimeClock } from '../game/clock';
import type { Game } from '../game/game';
import type { Action } from '../input/actions';
import type { DebugView, TankScene } from '../render/scene/tankScene';
import type { Stage } from '../render/stage';
import { migrate } from '../save/migrations';
import type { CollectionState, SaveState } from '../save/schema';
import type { KeyValueStore } from '../save/storage';
import type { UiRoot } from '../ui/root';
import type { Toasts } from '../ui/toast';
import { createRng } from '../util/rng';
import { ColorSequence } from './colorSequence';
import { FishLab } from './fishLab';
import { editableFields, getAtPath, setAtPath } from './lookFields';
import { PANEL_CSS, Panel, type Row } from './panel';
import { PRESETS } from './presets';

/** What god mode needs from the app. */
export interface GodHost {
  readonly game: Game;
  readonly clock: RuntimeClock;
  readonly stage: Stage;
  readonly ui: UiRoot;
  readonly toasts: Toasts;
  readonly store: KeyValueStore;
  readonly debugView: DebugView;
  readonly current: BiomeId;
  hourOverride: number | null;
  idleDisabled: boolean;
  debugHudOn: boolean;
  renderOverride: ((ctx: CanvasRenderingContext2D, alpha: number, time: number) => void) | null;
  switchTo(biome: BiomeId): void;
  rebuildScenes(): void;
  scene(): TankScene;
  setDebugHud(on: boolean): void;
  keepAwakeStatus(): string;
  save(): void;
}

const STATE_OPTIONS = [
  { label: 'unseen', value: 'unseen' },
  { label: 'sighted', value: 'sighted' },
  { label: 'collected', value: 'collected' },
];

export class GodMode {
  private panel: Panel | null = null;
  private badge: HTMLDivElement | null = null;
  private readonly sequence = new ColorSequence();
  private lab: FishLab | null = null;
  private refreshIn = 0;
  private visitorChoice: string;
  private extras = 50;
  private saveText = '';
  private labJson = '';
  /** The original looks, so a species can be reset in the lab. */
  private readonly originalLooks = new Map(ALL_SPECIES.map((s) => [s.id, s.look]));

  constructor(private readonly host: GodHost) {
    this.visitorChoice = speciesIn(host.current).find((s) => s.rarity === 'rare')?.id ?? ALL_SPECIES[0]!.id;
    window.addEventListener('keydown', (e) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'g' || e.key === 'G') this.toggle();
    });
  }

  get isOpen(): boolean {
    return this.panel !== null;
  }

  toggle(): void {
    if (this.panel) this.close();
    else this.open();
  }

  /** Feed every remote action. Returns true if god mode used it. */
  handleAction(action: Action, now: number): boolean {
    if (this.sequence.push(action, now)) {
      this.toggle();
      return true;
    }
    if (!this.panel) return false;
    if (action === 'back') {
      if (this.lab) this.closeLab();
      else this.close();
      return true;
    }
    this.panel.handle(action);
    return true;
  }

  update(dt: number): void {
    this.lab?.update(dt);
    if (!this.panel) return;
    this.refreshIn -= dt;
    if (this.refreshIn <= 0) {
      this.refreshIn = 0.25;
      this.panel.refresh();
    }
  }

  // ---------------------------------------------------------------- open / close

  open(): void {
    if (this.panel) return;
    if (!document.getElementById('tw-god-style')) {
      const style = document.createElement('style');
      style.id = 'tw-god-style';
      style.textContent = PANEL_CSS;
      document.head.appendChild(style);
    }
    this.badge = this.host.ui.add('div', 'tw-god-badge', 'GOD');
    this.panel = new Panel(this.host.ui.el);
    this.host.ui.el.classList.add('tw-god-open');
    this.showMain();
  }

  close(): void {
    this.closeLab(false);
    this.panel?.el.remove();
    this.badge?.remove();
    this.host.ui.el.classList.remove('tw-god-open');
    this.panel = null;
    this.badge = null;
  }

  private showMain(keepFocus = false): void {
    this.panel?.setPage('God mode', this.mainRows(), keepFocus);
  }

  // ---------------------------------------------------------------- main page

  private mainRows(): Row[] {
    const h = this.host;
    const g = h.game;
    const rows: Row[] = [];
    const fmt = (ms: number) => {
      const s = Math.max(0, Math.round(ms / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };

    rows.push({ kind: 'header', label: 'Fish lab' });
    rows.push({ kind: 'button', label: 'Open the fish lab', run: () => this.openLab() });

    rows.push({ kind: 'header', label: 'Events' });
    rows.push({
      kind: 'choice',
      label: 'Visitor',
      options: () => speciesIn(h.current).map((s) => ({ label: `${s.commonName}${s.rarity === 'rare' ? ' ★' : ''}`, value: s.id })),
      get: () => this.visitorChoice,
      set: (v) => (this.visitorChoice = v),
    });
    rows.push({
      kind: 'button',
      label: 'Summon this visitor',
      run: () => {
        if (getSpecies(this.visitorChoice)?.biome !== h.current) this.visitorChoice = speciesIn(h.current)[0]!.id;
        if (!g.forceVisitor(h.current, this.visitorChoice, true)) this.note('A visitor is already here');
      },
    });
    rows.push({ kind: 'button', label: 'Next fish arrives now', run: () => g.forceArrival() });
    rows.push({
      kind: 'button',
      label: 'Show an arrival message',
      run: () => h.toasts.show({ kicker: 'New arrival', title: 'A Royal gramma has settled in' }),
    });
    rows.push({
      kind: 'button',
      label: 'Show a catch message',
      run: () => h.toasts.show({ kicker: 'Rare visitor caught', title: 'You caught a Mandarin dragonet!', rare: true }),
    });
    rows.push({
      kind: 'button',
      label: 'Show a new-tank message',
      run: () => h.toasts.show({ kicker: 'New tank discovered', title: 'Amazon river', body: 'Press ◀ ▶ to visit' }),
    });

    rows.push({ kind: 'header', label: 'Time' });
    rows.push({ kind: 'info', label: 'Next arrival', get: () => fmt(g.state.timers.nextArrivalMs) });
    rows.push({ kind: 'info', label: 'Next visitor', get: () => (g.activeVisitor ? `here now (${fmt(g.activeVisitor.remainingMs)} left)` : fmt(g.state.timers.nextVisitorMs)) });
    rows.push({
      kind: 'choice',
      label: 'Time speed',
      options: () => [1, 10, 60, 600].map((n) => ({ label: `${n}×`, value: String(n) })),
      get: () => String(h.clock.timescale),
      set: (v) => (h.clock.timescale = Number(v)),
    });
    rows.push({ kind: 'toggle', label: 'Pause game time', get: () => h.clock.paused, set: (v) => (h.clock.paused = v) });
    rows.push({
      kind: 'toggle',
      label: 'Override time of day',
      get: () => h.hourOverride !== null,
      set: (v) => (h.hourOverride = v ? (h.hourOverride ?? new Date().getHours()) : null),
    });
    rows.push({
      kind: 'slider',
      label: 'Time of day',
      min: 0,
      max: 24,
      step: 0.25,
      get: () => h.hourOverride ?? new Date().getHours() + new Date().getMinutes() / 60,
      set: (v) => (h.hourOverride = v),
      format: (v) => `${Math.floor(v) % 24}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`,
    });

    rows.push({ kind: 'header', label: 'Tanks' });
    for (const b of BIOME_ORDER) {
      rows.push({
        kind: 'toggle',
        label: `${BIOMES[b].name} unlocked`,
        get: () => g.state.unlockedBiomes.includes(b),
        set: (v) => {
          if (v) g.unlockBiome(b);
          else g.lockBiome(b);
          h.rebuildScenes();
        },
      });
      rows.push({ kind: 'button', label: `Go to ${BIOMES[b].name}`, run: () => (g.state.unlockedBiomes.includes(b) ? h.switchTo(b) : this.note('That tank is locked')) });
    }

    rows.push({ kind: 'header', label: 'Collection' });
    rows.push({ kind: 'button', label: 'Collect everything', run: () => this.collectWhere(() => true) });
    for (const b of BIOME_ORDER) {
      rows.push({ kind: 'button', label: `Collect all in ${BIOMES[b].name}`, run: () => this.collectWhere((s) => s.biome === b) });
    }
    for (const s of ALL_SPECIES) {
      rows.push({
        kind: 'choice',
        label: `${s.commonName}${s.rarity === 'rare' ? ' ★' : ''}`,
        options: () => STATE_OPTIONS,
        get: () => g.state.species[s.id]?.state ?? 'unseen',
        set: (v) => {
          g.setSpeciesState(s.id, v as CollectionState);
          h.rebuildScenes();
        },
      });
    }

    rows.push({ kind: 'header', label: 'Rendering & debug' });
    rows.push({ kind: 'toggle', label: 'Frame rate & timers readout', get: () => h.debugHudOn, set: (v) => h.setDebugHud(v) });
    rows.push({ kind: 'toggle', label: 'Movement vectors & targets', get: () => h.debugView.vectors, set: (v) => (h.debugView.vectors = v) });
    rows.push({ kind: 'toggle', label: 'Fish bounds', get: () => h.debugView.bounds, set: (v) => (h.debugView.bounds = v) });
    rows.push({ kind: 'toggle', label: 'School neighbours', get: () => h.debugView.neighbours, set: (v) => (h.debugView.neighbours = v) });
    rows.push({ kind: 'toggle', label: 'Draw fish as vectors (no sprite cache)', get: () => h.debugView.noSprites === true, set: (v) => (h.debugView.noSprites = v) });
    rows.push({ kind: 'toggle', label: 'Keep UI visible (no idle fade)', get: () => h.idleDisabled, set: (v) => (h.idleDisabled = v) });
    rows.push({
      kind: 'choice',
      label: 'Frame rate',
      options: () => [
        { label: 'automatic', value: 'auto' },
        { label: 'force 60', value: '60' },
        { label: 'force 30', value: '30' },
      ],
      get: () => this.forcedFps,
      set: (v) => {
        this.forcedFps = v;
        h.stage.perf.force(v === 'auto' ? null : (Number(v) as 60 | 30));
      },
    });

    rows.push({ kind: 'header', label: 'Stress test' });
    rows.push({ kind: 'info', label: 'Fish in this tank', get: () => String(h.scene().tank.agents.length) });
    rows.push({
      kind: 'info',
      label: 'Frame rate',
      get: () => (h.stage.perf.averageMs ? `${Math.round(1000 / h.stage.perf.averageMs)} fps (${h.stage.perf.averageMs.toFixed(1)} ms)` : '-'),
    });
    rows.push({ kind: 'info', label: 'Draw time per frame', get: () => `${h.stage.perf.workMs.toFixed(1)} ms` });
    rows.push({ kind: 'info', label: 'Keep awake', get: () => h.keepAwakeStatus() });
    rows.push({ kind: 'info', label: 'Canvas', get: () => `${h.stage.canvas.width}×${h.stage.canvas.height} @ ${window.devicePixelRatio}x` });
    rows.push({ kind: 'slider', label: 'Extra fish to add', min: 10, max: 200, step: 10, get: () => this.extras, set: (v) => (this.extras = v) });
    rows.push({ kind: 'button', label: 'Add extra fish', run: () => h.scene().tank.addExtras(speciesIn(h.current), this.extras) });
    rows.push({ kind: 'button', label: 'Remove extra fish', run: () => h.rebuildScenes() });

    rows.push({ kind: 'header', label: 'Saved progress' });
    for (const p of PRESETS) {
      rows.push({ kind: 'button', label: `Load preset: ${p.label}`, danger: true, run: () => this.replace(p.create(ALL_SPECIES, createRng(Date.now()))) });
    }
    rows.push({ kind: 'button', label: 'Reset progress', danger: true, run: () => this.replace(PRESETS[0]!.create(ALL_SPECIES, createRng(Date.now()))) });
    rows.push({ kind: 'button', label: 'Export save (copy + download)', run: () => this.exportSave() });
    rows.push({ kind: 'textarea', label: 'Save JSON (paste here to import)', get: () => this.saveText, set: (v) => (this.saveText = v) });
    rows.push({ kind: 'button', label: 'Import the JSON above', danger: true, run: () => this.importSave() });
    return rows;
  }

  private forcedFps = 'auto';

  private collectWhere(pred: (s: (typeof ALL_SPECIES)[number]) => boolean): void {
    for (const s of ALL_SPECIES) if (pred(s)) this.host.game.collect(s.id);
    this.host.rebuildScenes();
  }

  private replace(state: SaveState): void {
    this.host.game.replaceState(state);
    this.host.rebuildScenes();
    this.host.save();
    this.note('Progress replaced');
  }

  private exportSave(): void {
    this.saveText = JSON.stringify(this.host.game.state, null, 2);
    copyText(this.saveText).then((ok) => this.note(ok ? 'Save copied to the clipboard' : 'Save shown below'));
    download('tidewatch-save.json', this.saveText);
    this.panel?.refresh();
  }

  private importSave(): void {
    try {
      const state = migrate(JSON.parse(this.saveText), ALL_SPECIES, createRng(Date.now()));
      if (!state) throw new Error('not a Tidewatch save');
      this.replace(state);
    } catch (e) {
      this.note(`Import failed: ${(e as Error).message}`);
    }
  }

  // ---------------------------------------------------------------- fish lab

  private openLab(id?: string): void {
    const startId = id ?? this.lab?.speciesId ?? speciesIn(this.host.current)[0]!.id;
    if (!this.lab) this.lab = new FishLab(startId);
    else this.lab.speciesId = startId;
    const lab = this.lab;
    this.host.renderOverride = (ctx) => lab.render(ctx);
    this.host.ui.el.classList.add('tw-god-lab');
    this.panel?.setPage('Fish lab', this.labRows());
  }

  private closeLab(backToMain = true): void {
    if (!this.lab) return;
    this.lab = null;
    this.host.renderOverride = null;
    this.host.ui.el.classList.remove('tw-god-lab');
    if (backToMain) this.showMain();
  }

  private labRows(): Row[] {
    const lab = this.lab!;
    const sp = lab.species;
    const rows: Row[] = [
      {
        kind: 'choice',
        label: 'Species',
        options: () => ALL_SPECIES.map((s) => ({ label: s.commonName, value: s.id })),
        get: () => lab.speciesId,
        set: (v) => {
          lab.speciesId = v;
          // Rebuild the rows for the new species (after this key press is handled).
          setTimeout(() => this.panel?.setPage('Fish lab', this.labRows(), true));
        },
      },
      { kind: 'slider', label: 'Swim speed', min: 0, max: 1, step: 0.05, get: () => lab.speed, set: (v) => (lab.speed = v) },
      { kind: 'button', label: 'Turn around', run: () => lab.startTurn() },
      { kind: 'toggle', label: 'Show real size', get: () => lab.showRealSize, set: (v) => (lab.showRealSize = v) },
      { kind: 'button', label: 'Copy look as JSON', run: () => this.copyLook() },
      { kind: 'button', label: "Reset this species' look", danger: true, run: () => this.resetLook() },
      { kind: 'textarea', label: 'Look JSON', get: () => this.labJson, set: (v) => (this.labJson = v) },
      { kind: 'button', label: 'Back to god mode', run: () => this.closeLab() },
    ];
    let section = '';
    for (const f of editableFields(sp.look)) {
      const top = f.path.split('.')[0]!;
      const sectionName = top === 'fins' || top === 'pattern' ? `${top} ${f.path.split('.')[1]}` : top;
      if (sectionName !== section) {
        section = sectionName;
        rows.push({ kind: 'header', label: describeSection(sp.look, f.path, sectionName) });
      }
      const label = f.path.split('.').slice(top === 'fins' || top === 'pattern' ? 2 : 1).join('.');
      const get = () => getAtPath(lab.species.look, f.path);
      const set = (v: unknown) => {
        // Species objects are shared, so the fish in the tank change too.
        (lab.species as { look: typeof sp.look }).look = setAtPath(lab.species.look, f.path, v);
      };
      if (f.kind === 'number') {
        rows.push({ kind: 'slider', label, min: f.min, max: f.max, step: f.step, get: () => get() as number, set });
      } else {
        rows.push({ kind: 'color', label, get: () => get() as string, set });
      }
    }
    return rows;
  }

  private copyLook(): void {
    this.labJson = JSON.stringify(this.lab!.species.look, null, 2);
    copyText(this.labJson).then((ok) => this.note(ok ? 'Look copied to the clipboard' : 'Look shown in the panel'));
    this.panel?.refresh();
  }

  private resetLook(): void {
    const sp = this.lab!.species;
    (sp as { look: typeof sp.look }).look = this.originalLooks.get(sp.id)!;
    this.panel?.setPage('Fish lab', this.labRows(), true);
  }

  private note(text: string): void {
    this.host.toasts.show({ kicker: 'God mode', title: text });
  }
}

function describeSection(look: unknown, path: string, name: string): string {
  const [top, idx] = path.split('.');
  if (top === 'fins' || top === 'pattern') {
    const item = getAtPath(look, `${top}.${idx}`) as { kind?: string; type?: string; shape?: string };
    return top === 'fins' ? `Fin ${idx}: ${item.kind} (${item.shape})` : `Pattern ${idx}: ${item.type}`;
  }
  return name;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function download(name: string, text: string): void {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch {
    /* not available (e.g. on the TV) */
  }
}
