import { Ambience } from './audio/ambience';
import { BIOMES } from './data/biomes';
import { APP_VERSION } from './version';
import { ALL_SPECIES, getSpecies } from './data/species';
import { BIOME_ORDER } from './data/progression';
import type { BiomeId, Species } from './data/types';
import { DEV_TOOLS } from './dev/enabled';
import { GodMode, type GodHost } from './dev/godMode';
import type { DevFlags } from './dev/urlFlags';
import { RuntimeClock } from './game/clock';
import { TankRotation } from './game/rotation';
import { CATCH_WINDOW_MS, Game, type GameEvent } from './game/game';
import type { Action } from './input/actions';
import { IdleTracker } from './input/idle';
import { InputManager } from './input';
import { PointerInput } from './input/pointer';
import type { Platform } from './platform';
import { type DebugView, TankScene } from './render/scene/tankScene';
import type { Stage } from './render/stage';
import { createInitialState, type RotationMinutes } from './save/schema';
import { clearSave, type KeyValueStore, loadSave, writeSave } from './save/storage';
import { CodexScreen } from './ui/codex';
import { escapeHtml, UiRoot } from './ui/root';
import { Toasts } from './ui/toast';
import { VisitorHint } from './ui/visitorHint';
import { moonPhase } from './util/moon';
import { createRng } from './util/rng';

/** Save at least this often while running (timers tick down constantly). */
const AUTOSAVE_MS = 30_000;
/** Cross-fade between tanks, in seconds: quicker when you switch by hand. */
const SWITCH_MANUAL_S = 0.8;
const SWITCH_AUTO_S = 2.5;
/** The codex closes itself after this long without input (OLED burn-in). */
const CODEX_IDLE_CLOSE_MS = 90_000;

export interface AppOptions {
  store: KeyValueStore;
  flags: DevFlags | null;
  /** Override the time of day for lighting (`?hour=`). */
  hour?: number;
  /** Override the moon's phase, 0 new .. 0.5 full (`?moon=`). */
  moon?: number;
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
  /** God mode: fixed moon phase, or null to follow the date. */
  moonOverride: number | null = null;
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
  /** Tank cross-fade in progress. */
  private switching: { from: BiomeId; to: BiomeId; t: number; duration: number } | null = null;
  private fadeCanvas: HTMLCanvasElement | null = null;
  private readonly rotation = new TankRotation();
  private codex: CodexScreen | null = null;
  private lastInputAt = performance.now();
  private time = 0;
  /** Ambient sound (spec v1.2 §5). */
  private readonly ambience = new Ambience();

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
    new InputManager().on((action) => {
      // Sound may only start after a key press (TV and browser rules).
      this.ambience.unlock();
      this.onAction(action);
    });
    const pointer = new PointerInput({ canvas: stage.canvas, toStage: (x, y) => stage.clientToStage(x, y) });
    pointer.on((e) => {
      if (e.kind === 'down') this.ambience.unlock();
      this.idle.poke(performance.now());
      this.lastInputAt = performance.now();
      if (e.kind !== 'down' || e.overUi || this.codex || this.god?.isOpen) return;
      if (this.scene().hitsVisitor(e.x, e.y)) this.tryCatch();
      else this.scene().feed(e.x);
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
    this.ambience.setLevel(this.game.state.settings.sound);
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
    this.game.tick(gameMs, realMs, { biome: this.current, visitorsAllowed: this.switching === null && this.codex === null });

    for (const [biome, s] of this.scenes) {
      s.closeupsAllowed = biome === this.current && this.switching === null && this.codex === null;
      s.update(dt);
    }
    this.ambience.setNight(this.scene().night);
    this.ambience.setDucked(this.codex !== null);
    this.idle.tick(performance.now());
    if (this.idleDisabled) this.ui.setIdle(false);
    this.god?.update(dt);
    this.codex?.update(dt);
    if (this.codex && performance.now() - this.lastInputAt > CODEX_IDLE_CLOSE_MS) this.closeCodex();
    this.updateRotation(dt);
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
    const sw = this.switching;
    if (!sw) {
      this.scene().render(ctx, alpha, time);
      return;
    }
    // Cross-fade: the old tank, with the new one drawn over it, fading in.
    this.scene(sw.from).render(ctx, alpha, time);
    const c = this.stage.canvas;
    if (!this.fadeCanvas) this.fadeCanvas = document.createElement('canvas');
    const fc = this.fadeCanvas;
    if (fc.width !== c.width || fc.height !== c.height) {
      fc.width = c.width;
      fc.height = c.height;
    }
    const fctx = fc.getContext('2d');
    if (!fctx) return;
    const s = this.stage.pixelScale;
    fctx.setTransform(s, 0, 0, s, 0, 0);
    this.scene(sw.to).render(fctx, alpha, time);
    const t = Math.min(1, sw.t / sw.duration);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = t * t * (3 - 2 * t);
    ctx.drawImage(fc, 0, 0);
    ctx.restore();
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
        moonPhase: () => this.moonPhase(),
        dayNight: () => this.game.state.settings.dayNight,
        closeups: () => this.game.state.settings.closeups,
        // Only the tank on screen makes bubble sounds.
        onBubble: (r, x) => {
          if (biome === this.current && this.switching === null) this.ambience.bubble(Math.min(1, r / 7), x / 960 - 1);
        },
        debug: this.debugView,
      });
      s.prepare(this.stage.pixelScale);
      this.scenes.set(biome, s);
    }
    return s;
  }

  /** The moon's phase for lighting and the codex: god mode, then `?moon=`, then today's. */
  moonPhase(): number {
    return this.moonOverride ?? this.opts.moon ?? deviceMoon();
  }

  /** Show a tank straight away (god mode). */
  switchTo(biome: BiomeId): void {
    this.currentBiome = biome;
    this.switching = null;
    this.rotation.reset();
    this.scene();
    this.updateBrand();
  }

  /** Throw away the scenes and rebuild them from the saved state (god mode). */
  rebuildScenes(): void {
    this.scenes.clear();
    this.ambience.setLevel(this.game.state.settings.sound);
    if (!this.game.state.unlockedBiomes.includes(this.currentBiome)) this.currentBiome = this.game.state.unlockedBiomes[0]!;
    this.scene();
    this.updateBrand();
  }

  private switchTank(delta: 1 | -1, duration = SWITCH_MANUAL_S): void {
    const unlocked = BIOME_ORDER.filter((b) => this.game.state.unlockedBiomes.includes(b));
    if (unlocked.length < 2) return;
    // Pressing again mid-fade finishes that fade at once, so quick presses never feel ignored.
    this.switching = null;
    const i = unlocked.indexOf(this.current);
    const to = unlocked[(i + delta + unlocked.length) % unlocked.length]!;
    this.scene(to); // make sure it exists (and is painted) before fading in
    this.switching = { from: this.current, to, t: 0, duration };
    this.currentBiome = to;
    this.rotation.reset();
    this.updateBrand();
  }

  private updateSwitch(dt: number): void {
    if (!this.switching) return;
    this.switching.t += dt;
    if (this.switching.t >= this.switching.duration) this.switching = null;
  }

  /** Automatic tank rotation (spec 5.1): not while a visitor is here or the codex is open. */
  private updateRotation(dt: number): void {
    const v = this.game.activeVisitor;
    const due = this.rotation.update(dt, {
      minutes: this.game.state.settings.rotationMin,
      tanks: this.game.state.unlockedBiomes.length,
      hold: this.codex !== null || this.switching !== null || (v !== null && v.biome === this.current),
    });
    if (due) this.switchTank(1, SWITCH_AUTO_S);
  }

  // ---------------------------------------------------------------- codex

  private openCodex(): void {
    if (this.codex) return;
    const app = this;
    this.codex = new CodexScreen(
      this.ui,
      {
        get state() {
          return app.game.state;
        },
        setRotation: (min: RotationMinutes) => this.game.setSettings({ rotationMin: min }),
        setDayNight: (on: boolean) => this.game.setSettings({ dayNight: on }),
        setSettings: (patch) => {
          this.game.setSettings(patch);
          if (patch.sound) this.ambience.setLevel(patch.sound);
        },
        resetProgress: () => {
          this.game.replaceState(createInitialState(ALL_SPECIES, createRng(Date.now())));
          this.rebuildScenes();
          this.save();
        },
        exitApp: () => this.platform.exitApp(),
        canExit: this.platform.name === 'webos',
        moonPhase: () => this.moonPhase(),
        onClose: () => this.closeCodex(),
        openGodMode: this.god
          ? () => {
              this.closeCodex();
              this.god?.open();
            }
          : undefined,
      },
      this.current,
      () => this.stage.pixelScale,
    );
    this.ui.el.classList.add('tw-codex-open');
  }

  private closeCodex(): void {
    this.codex?.close();
    this.codex = null;
    this.ui.el.classList.remove('tw-codex-open');
    this.save();
  }

  // ---------------------------------------------------------------- input

  private onAction(action: Action): void {
    this.lastInputAt = performance.now();
    if (this.god?.handleAction(action, performance.now())) {
      this.idle.poke(performance.now());
      return;
    }
    if (this.codex) {
      this.idle.poke(performance.now());
      if (!this.codex.handle(action)) this.closeCodex();
      return;
    }
    const v = this.game.activeVisitor;
    const decision = this.idle.handle(action, performance.now(), { visitorPresent: !!v && v.biome === this.current });
    if (decision === 'swallow') return;
    switch (action) {
      case 'select':
        if (!this.tryCatch()) this.feed();
        break;
      case 'left':
        this.switchTank(-1);
        break;
      case 'right':
        this.switchTank(1);
        break;
      case 'up':
      case 'back':
        this.openCodex();
        break;
      default:
        break;
    }
  }

  /** Catch the rare visitor in this tank, if there is one. */
  private tryCatch(): boolean {
    const v = this.game.activeVisitor;
    if (!v || v.biome !== this.current) return false;
    this.game.catchVisitor();
    return true;
  }

  /** Sprinkle food somewhere in the middle part of the tank (spec v1.2 §2). */
  private feed(): void {
    this.scene().feed(480 + Math.random() * 960);
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
          body: 'Press ◀ ▶ to visit, or ▲ to see it in the codex',
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
    if (flags.closeupNow) requestAnimationFrame(() => this.scene().startCloseup());
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
    this.brand.innerHTML = `<h1>Tidewatch <span class="tw-version">v${APP_VERSION}</span></h1><p>${escapeHtml(BIOMES[this.current].name)}${multi ? ' · ◀ ▶ switch tank' : ''} · OK feed</p>`;
  }

  keepAwakeStatus(): string {
    return this.platform.keepAwakeStatus();
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
      `fps           ${this.stage.perf.averageMs ? Math.round(1000 / this.stage.perf.averageMs) : '-'} (target ${this.stage.perf.targetFps})\n` +
      `draw time     ${this.stage.perf.workMs.toFixed(1)} ms per frame\n` +
      `fish          ${this.scene().tank.agents.length}\n` +
      `canvas        ${this.stage.canvas.width}×${this.stage.canvas.height} (pixel ratio ${window.devicePixelRatio})\n` +
      `keep awake    ${this.platform.keepAwakeStatus()}`;
  }
}

function deviceMoon(): number {
  return moonPhase(new Date());
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
