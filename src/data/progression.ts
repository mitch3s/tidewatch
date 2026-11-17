import type { BiomeId } from './types';

/** How each tank is unlocked, and the fish it starts with (spec 4.3). */
export interface BiomeRule {
  biome: BiomeId;
  /** Species added as collected when the tank unlocks. */
  starters: string[];
  /** Unlocked from the start when null. */
  requires: { biome: BiomeId; collected: number } | null;
}

export const BIOME_RULES: readonly BiomeRule[] = [
  { biome: 'reef', starters: ['ocellaris-clownfish', 'yellow-tang'], requires: null },
  { biome: 'amazon', starters: ['neon-tetra', 'bronze-corydoras'], requires: { biome: 'reef', collected: 4 } },
];

/** Biome order for switching tanks and codex tabs. */
export const BIOME_ORDER: readonly BiomeId[] = ['reef', 'amazon'];
