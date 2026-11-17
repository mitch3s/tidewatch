import type { Rarity, Species } from '../data/types';
import type { SaveState } from '../save/schema';

/** Common fish arrive 3× as often as uncommon ones (spec 4.1). Rare fish only visit. */
const WEIGHT: Partial<Record<Rarity, number>> = { common: 3, uncommon: 1 };

/** Choose the next fish to arrive, or null if there's nothing left to arrive. */
export function pickArrival(state: SaveState, roster: readonly Species[], rng: () => number): string | null {
  const candidates = roster.filter(
    (s) => WEIGHT[s.rarity] && state.unlockedBiomes.includes(s.biome) && state.species[s.id]?.state !== 'collected',
  );
  const total = candidates.reduce((sum, s) => sum + WEIGHT[s.rarity]!, 0);
  if (total === 0) return null;
  let r = rng() * total;
  for (const s of candidates) {
    r -= WEIGHT[s.rarity]!;
    if (r < 0) return s.id;
  }
  return candidates[candidates.length - 1]!.id;
}
