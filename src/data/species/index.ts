import type { BiomeId, Species } from '../types';
import { blueTang } from './blue-tang';
import { bronzeCorydoras } from './bronze-corydoras';
import { discus } from './discus';
import { freshwaterAngelfish } from './freshwater-angelfish';
import { mandarinDragonet } from './mandarin-dragonet';
import { moorishIdol } from './moorish-idol';
import { neonTetra } from './neon-tetra';
import { ocellarisClownfish } from './ocellaris-clownfish';
import { royalGramma } from './royal-gramma';
import { silverArowana } from './silver-arowana';
import { yellowTang } from './yellow-tang';
import { zebraPleco } from './zebra-pleco';

/** The v1 roster (spec section 3), in codex order. */
export const ALL_SPECIES: readonly Species[] = [
  ocellarisClownfish,
  yellowTang,
  blueTang,
  royalGramma,
  moorishIdol,
  mandarinDragonet,
  neonTetra,
  bronzeCorydoras,
  freshwaterAngelfish,
  discus,
  zebraPleco,
  silverArowana,
];

export function getSpecies(id: string): Species | undefined {
  return ALL_SPECIES.find((s) => s.id === id);
}

export function speciesIn(biome: BiomeId): Species[] {
  return ALL_SPECIES.filter((s) => s.biome === biome);
}
