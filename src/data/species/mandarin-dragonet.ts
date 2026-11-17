import type { Species } from '../types';

// First draft; fine-tuned in Milestone 6.
export const mandarinDragonet: Species = {
  id: 'mandarin-dragonet',
  biome: 'reef',
  rarity: 'rare',
  commonName: 'Mandarin dragonet',
  scientificName: 'Synchiropus splendidus',
  displayLength: 80,
  groupSize: [1, 1],
  look: {
    body: { template: 'flat-bottom', upper: 0.14, lower: 0.1, maxAt: 0.32, peduncle: 0.4, bluntness: 0.85 },
    palette: { body: '#1d6fd1', back: '#1559b0', belly: '#3a8ae0', fin: '#e8762a', finEdge: '#1d6fd1' },
    fins: [
      { kind: 'dorsal', shape: 'fan', from: 0.3, to: 0.45, size: 0.22, tipAt: 0.3, sweep: 0.03, edgeWidth: 0.012 },
      { kind: 'dorsal', shape: 'rounded', from: 0.5, to: 0.9, size: 0.12, tipAt: 0.5, sweep: 0.05, edgeWidth: 0.012 },
      { kind: 'anal', shape: 'rounded', from: 0.5, to: 0.9, size: 0.1, tipAt: 0.5, sweep: 0.04, edgeWidth: 0.012 },
      { kind: 'caudal', shape: 'rounded', size: 0.26, spread: 0.18, edgeWidth: 0.014 },
      { kind: 'pectoral', shape: 'fan', at: [0.28, 0.3], angle: 35, size: 0.2, width: 0.5, color: '#2b86e0', opacity: 0.7 },
    ],
    pattern: [{ type: 'swirls', count: 11, color: '#ff8a2a', width: 0.03, amplitude: 0.13, frequency: 1.7, seed: 9 }],
    eye: { u: 0.12, v: -0.45, size: 0.05, iris: '#e86a1e' },
    swim: { speed: [0.2, 0.45], tailHz: 2.5, flex: 0.025, depth: [0.85, 1], behaviour: 'bottom-dweller' },
  },
};
