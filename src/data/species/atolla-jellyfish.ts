import { NOT_A_FISH } from './notAFish';
import type { SpeciesDef } from '../types';

export const atollaJellyfish: SpeciesDef = {
  id: 'atolla-jellyfish',
  biome: 'deep',
  rarity: 'common',
  commonName: 'Atolla jellyfish',
  scientificName: 'Atolla wyvillei',
  displayLength: 120,
  groupSize: [1, 2],
  look: {
    ...NOT_A_FISH,
    creature: {
      kind: 'jelly',
      height: 0.5,
      bell: '#a8202e',
      inner: '#3e0711',
      rim: '#cf3a44',
      lappets: 18,
      tentacles: { count: 18, length: 0.55, color: 'rgba(205,70,80,0.55)' },
      trailing: 3,
    },
    glow: { spots: Array.from({ length: 16 }, () => [0, 0] as [number, number]), size: 0.012, color: '#8fdcff', halo: '90,180,255', chase: true },
    swim: { speed: [0.05, 0.15], tailHz: 0.6, flex: 0, depth: [0.15, 0.75], behaviour: 'drift' },
  },
};
