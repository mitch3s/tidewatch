import type { BiomeId, Species } from '../data/types';
import type { SaveState } from '../save/schema';

/** Rare fish not caught yet in an unlocked tank. */
export function visitorCandidates(state: SaveState, roster: readonly Species[], biome?: BiomeId): Species[] {
  return roster.filter(
    (s) =>
      s.rarity === 'rare' &&
      state.unlockedBiomes.includes(s.biome) &&
      (biome === undefined || s.biome === biome) &&
      state.species[s.id]?.state !== 'collected',
  );
}

/** Choose a rare visitor for the tank currently shown (spec 4.2). */
export function pickVisitor(state: SaveState, roster: readonly Species[], biome: BiomeId, rng: () => number): string | null {
  const c = visitorCandidates(state, roster, biome);
  if (c.length === 0) return null;
  return c[Math.floor(rng() * c.length)]!.id;
}
