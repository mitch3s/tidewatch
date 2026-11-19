import { BIOME_ORDER, BIOME_RULES } from '../data/progression';
import type { BiomeId, Species } from '../data/types';
import {
  ARRIVAL_DELAY_MS,
  type CollectionState,
  MOMENT_DELAY_MS,
  MOMENT_RETRY_MS,
  randomDelay,
  type SaveState,
  VISITOR_DELAY_MS,
} from '../save/schema';
import { pickArrival } from './arrivals';
import { checkUnlocks } from './unlocks';
import { pickVisitor, visitorCandidates } from './visitors';

/** How long a rare visitor stays on screen, in real time (spec 4.2). */
export const CATCH_WINDOW_MS = 25_000;
/** When a visitor is due but can't appear in the shown tank, try again after this. */
const VISITOR_RETRY_MS = 5 * 60_000;

export type GameEvent =
  | { type: 'arrived'; speciesId: string; biome: BiomeId }
  | { type: 'collected'; speciesId: string; biome: BiomeId }
  | { type: 'visitorSpawned'; speciesId: string; biome: BiomeId }
  | { type: 'caught'; speciesId: string; biome: BiomeId }
  | { type: 'visitorMissed'; speciesId: string; biome: BiomeId }
  | { type: 'biomeUnlocked'; biome: BiomeId; starters: string[] }
  | { type: 'momentWitnessed'; momentId: string; first: boolean };

export interface TickContext {
  /** The tank currently on screen (visitors appear there). */
  biome: BiomeId;
  /** False while e.g. the codex is open; a due visitor waits. */
  visitorsAllowed: boolean;
}

export interface ActiveVisitor {
  speciesId: string;
  biome: BiomeId;
  /** Real time left in the catch window. */
  remainingMs: number;
}

/**
 * The game rules: arrivals, rare visitors, unlocks and collection state.
 * Pure logic: time, randomness and "now" are passed in, so it's fully
 * testable. Every change goes through here, god mode included.
 */
export class Game {
  activeVisitor: ActiveVisitor | null = null;
  private listeners: Array<(e: GameEvent) => void> = [];
  private changeListeners: Array<() => void> = [];

  constructor(
    readonly state: SaveState,
    private readonly roster: readonly Species[],
    private readonly rng: () => number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  on(cb: (e: GameEvent) => void): void {
    this.listeners.push(cb);
  }

  /** Called after any change to the saved state. */
  onChange(cb: () => void): void {
    this.changeListeners.push(cb);
  }

  /**
   * Advance the game. `gameMs` drives arrivals and visitor timing (it can be
   * scaled); `realMs` drives the catch window, which stays real time.
   */
  tick(gameMs: number, realMs: number, ctx: TickContext): void {
    const t = this.state.timers;
    let changed = false;

    if (gameMs > 0) {
      t.nextArrivalMs -= gameMs;
      t.nextVisitorMs -= gameMs;
      t.nextMomentMs -= gameMs;
      changed = true;
    }

    if (t.nextArrivalMs <= 0) {
      t.nextArrivalMs = randomDelay(ARRIVAL_DELAY_MS, this.rng);
      const id = pickArrival(this.state, this.roster, this.rng);
      if (id) {
        this.markCollected(id);
        this.emit({ type: 'arrived', speciesId: id, biome: this.biomeOf(id) });
        this.runUnlocks();
      }
    }

    if (this.activeVisitor) {
      this.activeVisitor.remainingMs -= realMs;
      if (this.activeVisitor.remainingMs <= 0) this.missVisitor();
    } else if (t.nextVisitorMs <= 0 && ctx.visitorsAllowed) {
      if (!this.spawnVisitor(ctx.biome)) {
        // Nothing to show here; if another tank has a visitor waiting, try again soon.
        const elsewhere = visitorCandidates(this.state, this.roster).length > 0;
        t.nextVisitorMs = elsewhere ? VISITOR_RETRY_MS : randomDelay(VISITOR_DELAY_MS, this.rng);
      }
    }

    if (changed) this.changed();
  }

  /** Try to catch the current visitor. Returns true if there was one. */
  catchVisitor(): boolean {
    const v = this.activeVisitor;
    if (!v) return false;
    this.activeVisitor = null;
    this.markCollected(v.speciesId);
    this.emit({ type: 'caught', speciesId: v.speciesId, biome: v.biome });
    this.runUnlocks();
    this.changed();
    return true;
  }

  /** Collect a species directly (god mode, presets). */
  collect(id: string): void {
    if (this.state.species[id]?.state === 'collected') return;
    this.markCollected(id);
    this.emit({ type: 'collected', speciesId: id, biome: this.biomeOf(id) });
    this.runUnlocks();
    this.changed();
  }

  /** Set a species to any collection state (god mode). */
  setSpeciesState(id: string, state: CollectionState): void {
    if (state === 'collected') {
      this.markCollected(id);
      this.emit({ type: 'collected', speciesId: id, biome: this.biomeOf(id) });
      this.runUnlocks();
    } else {
      this.state.species[id] = { state };
    }
    this.changed();
  }

  /** Whether a moment is due (spec v1.4 §3.2). The app decides which one can play. */
  get momentDue(): boolean {
    return this.state.timers.nextMomentMs <= 0;
  }

  /**
   * A due moment was dealt with: one started (wait the full gap until the
   * next), or none could play (look again soon).
   */
  momentHandled(started: boolean): void {
    this.state.timers.nextMomentMs = started ? randomDelay(MOMENT_DELAY_MS, this.rng) : MOMENT_RETRY_MS;
    this.changed();
  }

  /** Bring the next moment forward to now (god mode). */
  forceMoment(): void {
    this.state.timers.nextMomentMs = 0;
  }

  /** A moment played to the end on screen. */
  witnessMoment(id: string): void {
    const first = !this.state.moments[id];
    if (first) this.state.moments[id] = { witnessedAt: this.now().toISOString() };
    this.emit({ type: 'momentWitnessed', momentId: id, first });
    this.changed();
  }

  /** Mark a moment as witnessed or not (god mode). */
  setMomentWitnessed(id: string, witnessed: boolean): void {
    if (witnessed) this.state.moments[id] ??= { witnessedAt: this.now().toISOString() };
    else delete this.state.moments[id];
    this.changed();
  }

  /** Change a setting (codex settings page). */
  setSettings(patch: Partial<SaveState['settings']>): void {
    Object.assign(this.state.settings, patch);
    this.changed();
  }

  /** Lock a tank again (god mode). The last unlocked tank stays unlocked. */
  lockBiome(biome: BiomeId): void {
    if (this.state.unlockedBiomes.length <= 1) return;
    this.state.unlockedBiomes = this.state.unlockedBiomes.filter((b) => b !== biome);
    this.changed();
  }

  /** Replace all progress, e.g. with an imported save or a preset (god mode). */
  replaceState(next: SaveState): void {
    this.activeVisitor = null;
    Object.assign(this.state, next);
    this.changed();
  }

  /** Unlock a tank and its starter fish (god mode / `?unlockAll`). */
  unlockBiome(biome: BiomeId): void {
    if (this.state.unlockedBiomes.includes(biome)) return;
    const rule = BIOME_RULES.find((r) => r.biome === biome);
    this.state.unlockedBiomes.push(biome);
    // Keep tanks in their usual order.
    this.state.unlockedBiomes.sort((a, b) => BIOME_ORDER.indexOf(a) - BIOME_ORDER.indexOf(b));
    const starters = rule ? [...rule.starters] : [];
    for (const id of starters) if (this.state.species[id]?.state !== 'collected') this.markCollected(id);
    this.emit({ type: 'biomeUnlocked', biome, starters });
    this.changed();
  }

  /** Bring the next arrival forward to now (god mode / `?arrival=now`). */
  forceArrival(): void {
    this.state.timers.nextArrivalMs = 0;
  }

  /**
   * Spawn a visitor right away (god mode / `?visitor=now`). With a species
   * id, that species is used, and `allowCaught` lets it be one already caught.
   */
  forceVisitor(biome: BiomeId, speciesId?: string, allowCaught = false): boolean {
    if (this.activeVisitor) return false;
    if (speciesId) {
      if (!allowCaught && this.state.species[speciesId]?.state === 'collected') return false;
      this.startVisitor(speciesId, biome);
      return true;
    }
    return this.spawnVisitor(biome);
  }

  private spawnVisitor(biome: BiomeId): boolean {
    const id = pickVisitor(this.state, this.roster, biome, this.rng);
    if (!id) return false;
    this.startVisitor(id, biome);
    return true;
  }

  private startVisitor(id: string, biome: BiomeId): void {
    this.activeVisitor = { speciesId: id, biome, remainingMs: CATCH_WINDOW_MS };
    this.state.timers.nextVisitorMs = randomDelay(VISITOR_DELAY_MS, this.rng);
    this.emit({ type: 'visitorSpawned', speciesId: id, biome });
  }

  private missVisitor(): void {
    const v = this.activeVisitor!;
    this.activeVisitor = null;
    const p = this.state.species[v.speciesId];
    if (p && p.state === 'unseen') {
      p.state = 'sighted';
      p.sightedAt = this.now().toISOString();
    }
    this.emit({ type: 'visitorMissed', speciesId: v.speciesId, biome: v.biome });
    this.changed();
  }

  private markCollected(id: string): void {
    // Keep when it was first seen swimming by, for the timeline.
    const sightedAt = this.state.species[id]?.sightedAt;
    this.state.species[id] = { state: 'collected', collectedAt: this.now().toISOString(), ...(sightedAt ? { sightedAt } : {}) };
  }

  private runUnlocks(): void {
    for (const u of checkUnlocks(this.state)) {
      this.state.unlockedBiomes.push(u.biome);
      for (const id of u.starters) if (this.state.species[id]?.state !== 'collected') this.markCollected(id);
      this.emit({ type: 'biomeUnlocked', biome: u.biome, starters: u.starters });
    }
  }

  private biomeOf(id: string): BiomeId {
    const s = this.roster.find((r) => r.id === id);
    if (!s) throw new Error(`Unknown species: ${id}`);
    return s.biome;
  }

  private emit(e: GameEvent): void {
    for (const l of this.listeners) l(e);
  }

  private changed(): void {
    for (const l of this.changeListeners) l();
  }
}
