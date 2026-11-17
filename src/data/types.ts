import type { FishLook } from '../render/fish/look';

export type Rarity = 'common' | 'uncommon' | 'rare';
export type BiomeId = 'reef' | 'amazon';

/**
 * One species. The codex block (native range, facts, sources) is added in
 * Milestone 6, once every fact can be checked against a source.
 */
export interface Species {
  id: string;
  biome: BiomeId;
  rarity: Rarity;
  commonName: string;
  scientificName: string;
  /** Typical body length on screen, in logical pixels, before depth scaling. */
  displayLength: number;
  /** How many of this fish appear in the tank once collected. */
  groupSize: [number, number];
  look: FishLook;
}
