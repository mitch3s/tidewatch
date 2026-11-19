import type { SpeciesDef } from '../types';

export const lovelyHatchetfish: SpeciesDef = {
  id: 'lovely-hatchetfish',
  biome: 'deep',
  rarity: 'common',
  commonName: 'Lovely hatchetfish',
  scientificName: 'Argyropelecus aculeatus',
  displayLength: 56,
  groupSize: [3, 5],
  look: {
    body: { template: 'tall-disc', upper: 0.18, lower: 0.42, maxAt: 0.35, peduncle: 0.12, bluntness: 0.6 },
    palette: { body: '#b4c1ce', back: '#4d5d73', belly: '#e2e9f0', fin: '#9fb0c0' },
    fins: [
      { kind: 'dorsal', shape: 'pointed', from: 0.45, to: 0.6, size: 0.1 },
      { kind: 'anal', shape: 'rounded', from: 0.6, to: 0.8, size: 0.06 },
      { kind: 'caudal', shape: 'forked', size: 0.22, spread: 0.15 },
      { kind: 'pectoral', shape: 'pointed', at: [0.25, 0.2], angle: 30, size: 0.12, opacity: 0.55 },
    ],
    pattern: [],
    // Big tubular eyes looking up, for spotting silhouettes against the faint light above.
    eye: { u: 0.13, v: -0.5, size: 0.09, iris: '#1d2c3d' },
    glow: {
      spots: Array.from({ length: 10 }, (_, i) => [0.12 + i * 0.055, 0.88] as [number, number]),
      size: 0.016,
      color: '#b2dcff',
      halo: '110,180,255',
    },
    swim: { speed: [0.3, 0.6], tailHz: 3, flex: 0.03, depth: [0.3, 0.8], behaviour: 'schooling', migrates: true },
  },
};
