import type { SpeciesDef } from '../types';

export const spottedLanternfish: SpeciesDef = {
  id: 'spotted-lanternfish',
  biome: 'deep',
  rarity: 'common',
  commonName: 'Spotted lanternfish',
  scientificName: 'Myctophum punctatum',
  displayLength: 62,
  groupSize: [8, 12],
  look: {
    body: { template: 'torpedo', upper: 0.12, lower: 0.12, maxAt: 0.3, peduncle: 0.32, bluntness: 0.75 },
    palette: { body: '#5d7189', back: '#27364c', belly: '#a4b6c7', fin: '#4a5a70' },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.38, to: 0.55, size: 0.1, tipAt: 0.4 },
      { kind: 'anal', shape: 'rounded', from: 0.55, to: 0.78, size: 0.07 },
      { kind: 'caudal', shape: 'forked', size: 0.24, spread: 0.16 },
      { kind: 'pectoral', shape: 'pointed', at: [0.24, 0.35], angle: 25, size: 0.12, opacity: 0.6 },
    ],
    pattern: [],
    eye: { u: 0.1, v: -0.15, size: 0.075, iris: '#2a3f5a' },
    glow: {
      spots: [
        ...Array.from({ length: 8 }, (_, i) => [0.16 + i * 0.1, 0.78] as [number, number]),
        ...Array.from({ length: 4 }, (_, i) => [0.3 + i * 0.12, 0.35] as [number, number]),
      ],
      size: 0.018,
      color: '#c4ecff',
      halo: '120,200,255',
    },
    swim: { speed: [0.6, 1.1], tailHz: 3.5, flex: 0.06, depth: [0.45, 0.9], behaviour: 'schooling', migrates: true },
  },
};
