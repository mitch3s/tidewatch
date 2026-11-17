import type { Species } from '../types';
import { blueTang } from './blue-tang';
import { ocellarisClownfish } from './ocellaris-clownfish';
import { yellowTang } from './yellow-tang';

export const ALL_SPECIES: readonly Species[] = [ocellarisClownfish, yellowTang, blueTang];

export function getSpecies(id: string): Species | undefined {
  return ALL_SPECIES.find((s) => s.id === id);
}
