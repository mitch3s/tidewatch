import { NOT_A_FISH } from './notAFish';
import type { SpeciesDef } from '../types';

export const dumboOctopus: SpeciesDef = {
  id: 'dumbo-octopus',
  biome: 'deep',
  rarity: 'uncommon',
  commonName: 'Dumbo octopus',
  scientificName: 'Grimpoteuthis',
  displayLength: 130,
  groupSize: [1, 1],
  look: {
    ...NOT_A_FISH,
    creature: {
      kind: 'cephalopod',
      mantle: { width: 0.5, height: 0.5, color: '#eaa9a2', belly: '#d08782' },
      fins: { size: 0.22, color: '#f2bbb3', ears: true },
      web: { length: 0.38, color: '#c98179', arms: 8, armColor: '#b56b65' },
      eyeColor: '#2a2024',
      eyeSize: 0.05,
    },
    swim: { speed: [0.08, 0.2], tailHz: 0.4, flex: 0, depth: [0.55, 0.95], behaviour: 'drift' },
  },
};
