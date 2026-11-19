import { MOMENTS } from '../data/moments';
import { BIOME_ORDER } from '../data/progression';
import type { BiomeId, Species } from '../data/types';
import {
  ARRIVAL_DELAY_MS,
  type CollectionState,
  MOMENT_DELAY_MS,
  createInitialState,
  randomDelay,
  type RotationMinutes,
  type SaveState,
  SAVE_VERSION,
  SOUND_LEVELS,
  type SoundLevel,
  type SpeciesProgress,
  VISITOR_DELAY_MS,
} from './schema';

const STATES: readonly CollectionState[] = ['unseen', 'sighted', 'collected'];
const ROTATIONS: readonly RotationMinutes[] = [0, 5, 15, 30];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Turn whatever was in storage into a valid SaveState, or null if it can't
 * be used at all. Fields are checked one by one, so one bad value doesn't
 * throw away the rest of the player's progress.
 *
 * Future versions add a step here: `if (raw.version === 1) raw = v1ToV2(raw)`.
 */
export function migrate(raw: unknown, roster: readonly Species[], rng: () => number): SaveState | null {
  if (!isObject(raw) || raw.version !== SAVE_VERSION || !isObject(raw.species)) return null;
  const base = createInitialState(roster, rng);

  const species: Record<string, SpeciesProgress> = {};
  for (const s of roster) {
    const p = raw.species[s.id];
    if (isObject(p) && STATES.includes(p.state as CollectionState)) {
      const entry: SpeciesProgress = { state: p.state as CollectionState };
      if (typeof p.collectedAt === 'string') entry.collectedAt = p.collectedAt;
      species[s.id] = entry;
    } else {
      species[s.id] = base.species[s.id]!;
    }
  }

  const unlocked = Array.isArray(raw.unlockedBiomes)
    ? BIOME_ORDER.filter((b) => (raw.unlockedBiomes as unknown[]).includes(b))
    : [];
  const unlockedBiomes: BiomeId[] = unlocked.length ? unlocked : base.unlockedBiomes;

  const timers = isObject(raw.timers) ? raw.timers : {};
  const validMs = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max;
  const nextArrivalMs = validMs(timers.nextArrivalMs, ARRIVAL_DELAY_MS[1])
    ? (timers.nextArrivalMs as number)
    : randomDelay(ARRIVAL_DELAY_MS, rng);
  const nextVisitorMs = validMs(timers.nextVisitorMs, VISITOR_DELAY_MS[1])
    ? (timers.nextVisitorMs as number)
    : randomDelay(VISITOR_DELAY_MS, rng);

  const nextMomentMs = validMs(timers.nextMomentMs, MOMENT_DELAY_MS[1])
    ? (timers.nextMomentMs as number)
    : randomDelay(MOMENT_DELAY_MS, rng);

  // Moments (v1.4): saves from before have none; unknown ids are dropped.
  const moments: SaveState['moments'] = {};
  if (isObject(raw.moments)) {
    for (const m of MOMENTS) {
      const w = raw.moments[m.id];
      if (isObject(w) && typeof w.witnessedAt === 'string') moments[m.id] = { witnessedAt: w.witnessedAt };
    }
  }

  const settings = isObject(raw.settings) ? raw.settings : {};
  return {
    version: SAVE_VERSION,
    species,
    unlockedBiomes,
    moments,
    timers: { nextArrivalMs, nextVisitorMs, nextMomentMs },
    settings: {
      rotationMin: ROTATIONS.includes(settings.rotationMin as RotationMinutes)
        ? (settings.rotationMin as RotationMinutes)
        : base.settings.rotationMin,
      dayNight: typeof settings.dayNight === 'boolean' ? settings.dayNight : base.settings.dayNight,
      closeups: typeof settings.closeups === 'boolean' ? settings.closeups : base.settings.closeups,
      sound: SOUND_LEVELS.includes(settings.sound as SoundLevel) ? (settings.sound as SoundLevel) : base.settings.sound,
    },
  };
}
