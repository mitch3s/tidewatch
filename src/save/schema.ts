import { BIOME_RULES } from '../data/progression';
import type { BiomeId, Species } from '../data/types';
import { lerp } from '../util/math';

export const SAVE_KEY = 'tidewatch.save';
export const SAVE_VERSION = 1;

export type CollectionState = 'unseen' | 'sighted' | 'collected';
export type RotationMinutes = 0 | 5 | 15 | 30;
export type SoundLevel = 'off' | 'quiet' | 'normal';
export const SOUND_LEVELS: readonly SoundLevel[] = ['off', 'quiet', 'normal'];

export interface SpeciesProgress {
  state: CollectionState;
  /** ISO timestamp, set when collected. */
  collectedAt?: string;
}

/** Everything that is saved on the TV (spec section 8). */
export interface SaveState {
  version: typeof SAVE_VERSION;
  species: Record<string, SpeciesProgress>;
  unlockedBiomes: BiomeId[];
  /** Remaining game time (ms) until the next event. */
  timers: { nextArrivalMs: number; nextVisitorMs: number };
  settings: {
    rotationMin: RotationMinutes;
    dayNight: boolean;
    /** Slow camera close-ups on one fish (v1.2). */
    closeups: boolean;
    /** Ambient sound (v1.2). */
    sound: SoundLevel;
  };
}

const MIN = 60_000;
export const ARRIVAL_DELAY_MS: [number, number] = [20 * MIN, 40 * MIN];
export const VISITOR_DELAY_MS: [number, number] = [45 * MIN, 90 * MIN];

export function randomDelay([lo, hi]: [number, number], rng: () => number): number {
  return Math.round(lerp(lo, hi, rng()));
}

export function createInitialState(roster: readonly Species[], rng: () => number, now = new Date()): SaveState {
  const species: Record<string, SpeciesProgress> = {};
  for (const s of roster) species[s.id] = { state: 'unseen' };
  const unlockedBiomes: BiomeId[] = [];
  for (const rule of BIOME_RULES) {
    if (rule.requires !== null) continue;
    unlockedBiomes.push(rule.biome);
    for (const id of rule.starters) if (species[id]) species[id] = { state: 'collected', collectedAt: now.toISOString() };
  }
  return {
    version: SAVE_VERSION,
    species,
    unlockedBiomes,
    timers: { nextArrivalMs: randomDelay(ARRIVAL_DELAY_MS, rng), nextVisitorMs: randomDelay(VISITOR_DELAY_MS, rng) },
    settings: { rotationMin: 15, dayNight: true, closeups: true, sound: 'off' },
  };
}
