import type { FishLook } from '../render/fish/look';
import type { Codex } from './codex';

export type Rarity = 'common' | 'uncommon' | 'rare';
export type BiomeId = 'reef' | 'amazon' | 'deep';

/** One species: how it looks and swims, and what the codex says about it. */
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
  /** Facts for the codex (see codex.ts, where every fact has a source). */
  codex: Codex;
}

/** A species as defined in its own file; the codex is joined in species/index.ts. */
export type SpeciesDef = Omit<Species, 'codex'>;
