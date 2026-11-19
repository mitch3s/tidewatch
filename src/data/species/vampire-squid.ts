import { NOT_A_FISH } from './notAFish';
import type { SpeciesDef } from '../types';

export const vampireSquid: SpeciesDef = {
  id: 'vampire-squid',
  biome: 'deep',
  rarity: 'uncommon',
  commonName: 'Vampire squid',
  scientificName: 'Vampyroteuthis infernalis',
  displayLength: 140,
  groupSize: [1, 1],
  look: {
    ...NOT_A_FISH,
    creature: {
      kind: 'cephalopod',
      mantle: { width: 0.42, height: 0.45, color: '#6a1e2a', belly: '#3e0f18' },
      fins: { size: 0.16, color: '#7a2834' },
      web: { length: 0.42, color: '#2c0912', arms: 8, armColor: '#1c060b' },
      eyeColor: '#4f95e6',
      eyeSize: 0.06,
    },
    glow: { spots: [], size: 0.016, color: '#c4ecff', halo: '120,200,255' },
    swim: { speed: [0.08, 0.2], tailHz: 0.5, flex: 0, depth: [0.3, 0.8], behaviour: 'drift' },
  },
};
