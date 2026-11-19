import type { SpeciesDef } from '../types';

// First draft; fine-tuned in Milestone 6.
export const neonTetra: SpeciesDef = {
  id: 'neon-tetra',
  biome: 'amazon',
  rarity: 'common',
  commonName: 'Neon tetra',
  scientificName: 'Paracheirodon innesi',
  displayLength: 44,
  groupSize: [8, 12],
  look: {
    body: { template: 'torpedo', upper: 0.13, lower: 0.12, maxAt: 0.4, peduncle: 0.38, bluntness: 0.6 },
    palette: { body: '#c9c2ac', back: '#6c6652', belly: '#ece8dc', fin: '#ddd7c6' },
    fins: [
      { kind: 'dorsal', shape: 'pointed', from: 0.42, to: 0.55, size: 0.12, tipAt: 0.3, sweep: 0.04, opacity: 0.35 },
      // The small adipose fin near the tail.
      { kind: 'dorsal', shape: 'rounded', from: 0.82, to: 0.88, size: 0.04, tipAt: 0.5, opacity: 0.35, rays: false },
      { kind: 'anal', shape: 'rounded', from: 0.58, to: 0.85, size: 0.08, tipAt: 0.3, opacity: 0.35 },
      { kind: 'caudal', shape: 'forked', size: 0.24, spread: 0.16, opacity: 0.4 },
      { kind: 'pectoral', shape: 'pointed', at: [0.28, 0.2], angle: 30, size: 0.1, opacity: 0.3 },
    ],
    pattern: [
      { type: 'region', side: 'lower', boundary: 0.05, from: 0.5, to: 1.0, color: '#e2302e' },
      { type: 'stripe', v: -0.15, thickness: 0.5, from: 0.12, to: 0.88, color: '#33bbff', taper: true },
    ],
    eye: { u: 0.13, v: -0.18, size: 0.055, iris: '#4aa6d8' },
    gill: null,
    swim: { speed: [0.9, 1.6], tailHz: 4.5, flex: 0.035, depth: [0.3, 0.7], behaviour: 'schooling', fadesAtNight: true },
  },
};
