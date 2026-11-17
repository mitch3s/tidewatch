import { ALL_SPECIES } from '../data/species';
import { BIOME_RULES } from '../data/progression';
import type { BiomeId } from '../data/types';
import type { SaveState } from '../save/schema';

/** Tanks that should unlock now, with their starter fish (spec 4.3). */
export function checkUnlocks(state: SaveState): Array<{ biome: BiomeId; starters: string[] }> {
  const out: Array<{ biome: BiomeId; starters: string[] }> = [];
  for (const rule of BIOME_RULES) {
    if (!rule.requires || state.unlockedBiomes.includes(rule.biome)) continue;
    const { biome, collected } = rule.requires;
    const have = ALL_SPECIES.filter((s) => s.biome === biome && state.species[s.id]?.state === 'collected').length;
    if (have >= collected) out.push({ biome: rule.biome, starters: [...rule.starters] });
  }
  return out;
}
