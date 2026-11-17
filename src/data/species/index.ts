import type { Species } from '../types';
import { ocellarisClownfish } from './ocellaris-clownfish';

export const ALL_SPECIES: readonly Species[] = [ocellarisClownfish];

export function getSpecies(id: string): Species | undefined {
  return ALL_SPECIES.find((s) => s.id === id);
}
