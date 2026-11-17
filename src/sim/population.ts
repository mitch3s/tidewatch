import type { Rarity } from '../data/types';

export interface PopulationEntry {
  id: string;
  rarity: Rarity;
  groupSize: [number, number];
  /** Display length; bigger fish are kept over smaller ones when trimming. */
  length: number;
}

const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2 };

/**
 * Decide how many of each collected species to show (spec 4.4).
 * Keeps the total within `cap` by trimming the biggest groups of common,
 * small fish first. Every species keeps at least one fish, even if that
 * means going over the cap.
 */
export function planPopulation(species: readonly PopulationEntry[], cap: number, rnd: () => number): Map<string, number> {
  const plan = new Map<string, number>();
  for (const s of species) {
    const [lo, hi] = s.groupSize;
    plan.set(s.id, lo + Math.min(hi - lo, Math.floor(rnd() * (hi - lo + 1))));
  }
  let total = 0;
  for (const n of plan.values()) total += n;

  while (total > cap) {
    let pick: PopulationEntry | undefined;
    for (const s of species) {
      const n = plan.get(s.id)!;
      if (n <= 1) continue;
      if (!pick) {
        pick = s;
        continue;
      }
      const pn = plan.get(pick.id)!;
      const better =
        RARITY_RANK[s.rarity] < RARITY_RANK[pick.rarity] ||
        (RARITY_RANK[s.rarity] === RARITY_RANK[pick.rarity] && (n > pn || (n === pn && s.length < pick.length)));
      if (better) pick = s;
    }
    if (!pick) break;
    plan.set(pick.id, plan.get(pick.id)! - 1);
    total--;
  }
  return plan;
}
