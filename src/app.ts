import { BIOMES } from './data/biomes';
import { ALL_SPECIES, getSpecies } from './data/species';
import { BIOME_ORDER } from './data/progression';
import type { BiomeId, Species } from './data/types';
import { DEV_TOOLS } from './dev/enabled';
import { GodMode, type GodHost } from './dev/godMode';
import type { DevFlags } from './dev/urlFlags';
import { RuntimeClock } from './game/clock';
import { CATCH_WINDOW_MS, Game, type GameEvent } from './game/game';
import type { Action } from './input/actions';
import { IdleTracker } from './input/idle';
import { InputManager } from './input';
import { PointerInput } from './input/pointer';
import type { Platform } from './platform';
import { type DebugView, TankScene } from './render/scene/tankScene';
import { STAGE_HEIGHT, STAGE_WIDTH, type Stage } from './render/stage';
import { clearSave, type KeyValueStore, loadSave, writeSave } from './save/storage';
import { escapeHtml, UiRoot } from './ui/root';
import { Toasts } from './ui/toast';
import { VisitorHint } from './ui/visitorHint';
import { createRng } from './util/rng';

/** Save at least this often while running (timers tick down constantly). */
const AUTOSAVE_MS = 30_000;
/** Fade-through-dark when switching tanks, in seconds (each half). */
const SWITCH_FADE_S = 0.35;

export interface AppOptions {
  store: KeyValueStore;
  flags: DevFlags | null;
  /** Override the time of day for lighting (`?hour=`). */
  hour?: number;
}

/**
 * The running app: owns the game, one scene per unlocked tank, input,
 * saving, and the messages on screen.
 */
export class App implements GodHost {
  readonly game: Game;
  readonly clock = new RuntimeClock();
  readonly ui: UiRoot;
  readonly toasts: Toasts;
  readonly store: KeyValueStore;
  /** God-mode debug drawing, shared by every scene. */
  readonly debugView: DebugView = { vectors: false, bounds: false, neighbours: false };
  /** God mode: fixed time of day for lighting, or null to follow the clock. */
  hourOverride: number | null = null;
  /** God mode: keep the UI visible instead of fading it when idle. */
  idleDisabled = false;
  /** God mode (fish lab): draw this instead of the tank. */
  renderOverride: ((ctx: CanvasRenderingContext2D, alpha: number, time: number) => void) | null = null;
  private readonly scenes = new Map<BiomeId, TankScene>();
  private currentBiome: BiomeId;
  private readonly hint: VisitorHint;
  private readonly brand: HTMLDivElement;
  private debugEl: HTMLDivElement | null = null;
  private readonly idle: IdleTracker;
  private readonly god: GodMode | null = null;
  private sinceSave = 0;
  private dirty = false;
  /** Tank switch in progress: fading out to `to`, or back in. */
  private switching: { to: BiomeId; t: number } | null = null;
  private fade = 0;
  private time = 0;

  constructor(
    readonly stage: Stage,
    private readonly platform: Platform,
    private readonly opts: AppOptions,
  ) {
    const flags = opts.flags;
    this.store = opts.store;
    if (flags?.reset) clearSave(opts.store);
    const state = loadSave(opts.store, ALL_SPECIES, createRng(Date.now()));
    this.game = new Game(state, ALL_SPECIES, createRng(Date.now() ^ 0x5eed));
    this.currentBiome = state.unlockedBiomes[0] ?? 'reef';

    this.ui = new UiRoot(stage);
    this.brand = this.ui.add('div', 'tw-brand tw-idle-fade');
    this.toasts = new Toasts(this.ui);
    this.hint = new VisitorHint(this.ui);
    if (flags?.debug) this.setDebugHud(true);
    this.updateBrand();

    this.game.on((e) => this.onGameEvent(e));
    this.game.onChange(() => (this.dirty = true));

    this.idle = new IdleTracker(10_000, performance.now());
    this.idle.onChange((idle) => this.ui.setIdle(idle && !this.idleDisabled));

    if (DEV_TOOLS) {
      this.god = new GodMode(this);
      if (flags?.god) this.god.open();
    }
    if (flags) this.applyDevFlags(flags);
    new InputManager().on((action) => this.onAction(action));
    const pointer = new PointerInput({ canvas: stage.canvas, toStage: (x, y) => stage.clientToStage(x, y) });
    pointer.on((e) => {
      this.idle.poke(performance.now());
      if (e.kind === 'down' && !e.overUi && this.scene().hitsVisitor(e.x, e.y)) this.tryCatch();
    });

    platform.onVisibilityChange((visible) => {
      this.clock.visible = visible;
      if (!visible) this.save();
    });
    window.addEventListener('pagehide', () => this.save());
    stage.onResize(() => this.scene().prepare(stage.pixelScale));
  }

  start(): void {
    this.platform.keepAwake();
    this.stage.start({
      update: (dt) => this.update(dt),
      render: (ctx, alpha, time) => this.render(ctx, alpha, time),
    });
  }

  // ---------------------------------------------------------------- loop

  private update(dt: number): void {
    this.time += dt;
    const realMs = dt * 1000;
    const gameMs = this.clock.advance(realMs);
    this.game.tick(gameMs, realMs, { biome: this.current, visitorsAllowed: this.switching === null });

    for (const s of this.scenes.values()) s.update(dt);
    this.idle.tick(performance.now());
    if (this.idleDisabled) this.ui.setIdle(false);
    this.god?.update(dt);
    this.updateSwitch(dt);

    const v = this.game.activeVisitor;
    this.hint.update(v && v.biome === this.current ? v.remainingMs / CATCH_WINDOW_MS : null, this.time);

    this.sinceSave += realMs;
    if (this.dirty && this.sinceSave >= AUTOSAVE_MS) this.save();
    if (this.debugEl) this.updateDebug();
  }

  private render(ctx: CanvasRenderingContext2D, alpha: number, time: number): void {
    if (this.renderOverride) {
      this.renderOverride(ctx, alpha, time);
      return;
    }
    this.scene().render(ctx, alpha, time);
    if (this.fade > 0.001) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade.toFixed(3)})`;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    }
  }

  // ---------------------------------------------------------------- tanks

  /** The tank on screen. */
  get current(): BiomeId {
    return this.currentBiome;
  }

  /** The scene for a tank, created on first use with its collected fish. */
  scene(biome: BiomeId = this.current): TankScene {
    let s = this.scenes.get(biome);
    if (!s) {
      const fish = ALL_SPECIES.filter((sp) => sp.biome === biome && this.game.state.species[sp.id]?.state === 'collected');
      s = new TankScene(BIOMES[biome], fish, {
        hour: () => this.hourOverride ?? this.opts.hour ?? deviceHour(),
        dayNight: () => this.game.state.settings.dayNight,
        debug: this.debugView,
      });
      s.prepare(this.stage.pixelScale);
      this.scenes.set(biome, s);
    }
    return s;
  }

  /** Show a tank straight away (god mode). */
  switchTo(biome: BiomeId): void {
    this.currentBiome = biome;
    this.switching = null;
    this.scene();
    this.updateBrand();
  }

  /** Throw away the scenes and rebuild them from the saved state (god mode). */
  rebuildScenes(): void {
    this.scenes.clear();
    if (!this.game.state.unlockedBiomes.includes(this.currentBiome)) this.currentBiome = this.game.state.unlockedBiomes[0]!;
    this.scene();
    this.updateBrand();
  }

  private switchTank(delta: 1 | -1): void {
    const unlocked = BIOME_ORDER.filter((b) => this.game.state.unlockedBiomes.includes(b));
    if (unlocked.length < 2 || this.switching) return;
    const i = unlocked.indexOf(this.current);
    const to = unlocked[(i + delta + unlocked.length) % unlocked.length]!;
    this.switching = { to, t: 0 };
  }

  private updateSwitch(dt: number): void {
    if (!this.switching) {
      this.fade = Math.max(0, this.fade - dt / SWITCH_FADE_S);
      return;
    }
    this.switching.t += dt;
    this.fade = Math.min(1, this.switching.t / SWITCH_FADE_S);
    if (this.fade >= 1) {
      this.currentBiome = this.switching.to;
      this.switching = null;
      this.scene();
      this.updateBrand();
    }
  }

  // ---------------------------------------------------------------- input

  private onAction(action: Action): void {
    if (this.god?.handleAction(action, performance.now())) {
      this.idle.poke(performance.now());
      return;
    }
    const v = this.game.activeVisitor;
    const decision = this.idle.handle(action, performance.now(), { visitorPresent: !!v && v.biome === this.current });
    if (decision === 'swallow') return;
    switch (action) {
      case 'select':
        this.tryCatch();
        break;
      case 'left':
        this.switchTank(-1);
        break;
      case 'right':
        this.switchTank(1);
        break;
      default:
        // Codex, menus and god mode arrive in later milestones.
        break;
    }
  }

  private tryCatch(): void {
    const v = this.game.activeVisitor;
    if (v && v.biome === this.current) this.game.catchVisitor();
  }

  // ---------------------------------------------------------------- game events

  private onGameEvent(e: GameEvent): void {
    const name = (id: string) => getSpecies(id)?.commonName ?? id;
    const tankName = (b: BiomeId) => BIOMES[b].name.toLowerCase();
    switch (e.type) {
      case 'arrived':
      case 'collected':
        this.scenes.get(e.biome)?.addArrival(getSpecies(e.speciesId)!);
        if (e.type === 'arrived') {
          this.toasts.show({
            kicker: 'New arrival',
            title: `${article(name(e.speciesId))} ${name(e.speciesId)} has settled in`,
            body: e.biome === this.current ? undefined : `in the ${tankName(e.biome)} tank`,
          });
        }
        this.save();
        break;
      case 'visitorSpawned':
        this.scene(e.biome).startVisitor(getSpecies(e.speciesId)!);
        break;
      case 'caught':
        this.scenes.get(e.biome)?.catchVisitor();
        this.toasts.show({ kicker: 'Rare visitor caught', title: `You caught ${article(name(e.speciesId), false)} ${name(e.speciesId)}!`, rare: true });
        this.save();
        break;
      case 'visitorMissed':
        this.toasts.show({
          kicker: 'Rare visitor',
          title: `${article(name(e.speciesId))} ${name(e.speciesId)} swam by`,
          body: 'Keep watching: it may come back.',
          rare: true,
        });
        this.save();
        break;
      case 'biomeUnlocked': {
        const starters = e.starters.map((id) => getSpecies(id)).filter((s): s is Species => !!s);
        // A scene that already exists gets the starters; otherwise they appear when it's first shown.
        for (const s of starters) this.scenes.get(e.biome)?.addArrival(s);
        this.toasts.show({
          kicker: 'New tank discovered',
          title: BIOMES[e.biome].name,
          body: 'Press ◀ ▶ to visit',
        });
        this.updateBrand();
        this.save();
        break;
      }
    }
  }

  // ---------------------------------------------------------------- saving & dev

  save(): void {
    writeSave(this.opts.store, this.game.state);
    this.dirty = false;
    this.sinceSave = 0;
  }

  private applyDevFlags(flags: DevFlags): void {
    if (!DEV_TOOLS) return;
    if (flags.timescale) this.clock.timescale = flags.timescale;
    if (flags.unlockAll) for (const b of BIOME_ORDER) this.game.unlockBiome(b);
    if (flags.collectAll) for (const s of ALL_SPECIES) this.game.collect(s.id);
    if (flags.arrivalNow) this.game.forceArrival();
    if (flags.visitorNow) {
      // Wait for the first frame so the scene exists, then summon.
      requestAnimationFrame(() => {
        if (!this.game.forceVisitor(this.current)) {
          this.toasts.show({ kicker: 'Debug', title: 'No rare visitor left for this tank' });
        }
      });
    }
  }

  private updateBrand(): void {
    const multi = this.game.state.unlockedBiomes.length > 1;
    this.brand.innerHTML = `<h1>Tidewatch</h1><p>${escapeHtml(BIOMES[this.current].name)}${multi ? ' · ◀ ▶ switch tank' : ''}</p>`;
  }

  get debugHudOn(): boolean {
    return this.debugEl !== null;
  }

  setDebugHud(on: boolean): void {
    if (on && !this.debugEl) this.debugEl = this.ui.add('div', 'tw-debug');
    if (!on && this.debugEl) {
      this.debugEl.remove();
      this.debugEl = null;
    }
  }

  private updateDebug(): void {
    const t = this.game.state.timers;
    const fmt = (ms: number) => {
      const s = Math.max(0, Math.round(ms / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    const collected = Object.values(this.game.state.species).filter((p) => p.state === 'collected').length;
    this.debugEl!.textContent =
      `next arrival  ${fmt(t.nextArrivalMs)} (game time)\n` +
      `next visitor  ${fmt(t.nextVisitorMs)}\n` +
      `timescale     ${this.clock.timescale}x\n` +
      `collected     ${collected}/${ALL_SPECIES.length}\n` +
      `fps           ${this.stage.perf.averageMs ? Math.round(1000 / this.stage.perf.averageMs) : '-'} (target ${this.stage.perf.targetFps})`;
  }
}

function deviceHour(): number {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

/** "a"/"an" for a species name; capitalised to start a sentence. */
function article(name: string, capital = true): string {
  const a = /^[aeiou]/i.test(name) ? 'an' : 'a';
  return capital ? a[0]!.toUpperCase() + a.slice(1) : a;
}
