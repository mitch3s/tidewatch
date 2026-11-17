import type { Species } from '../types';

// First draft; fine-tuned in Milestone 6.
export const royalGramma: Species = {
  id: 'royal-gramma',
  biome: 'reef',
  rarity: 'uncommon',
  commonName: 'Royal gramma',
  scientificName: 'Gramma loreto',
  displayLength: 85,
  groupSize: [1, 2],
  look: {
    body: { template: 'oval', upper: 0.17, lower: 0.16, maxAt: 0.38, peduncle: 0.45, bluntness: 0.7 },
    palette: { body: '#8b3fd2', back: '#7432b8', belly: '#a55be0', fin: '#8b3fd2' },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.25, to: 0.9, size: 0.12, tipAt: 0.7, sweep: 0.04 },
      { kind: 'anal', shape: 'rounded', from: 0.55, to: 0.9, size: 0.12, tipAt: 0.6, sweep: 0.04, color: '#ffc81a' },
      { kind: 'caudal', shape: 'square', size: 0.22, spread: 0.17, color: '#ffc81a' },
      { kind: 'pelvic', shape: 'trailing', at: [0.3, 0.85], angle: 60, size: 0.16, color: '#8b3fd2' },
      { kind: 'pectoral', shape: 'rounded', at: [0.3, 0.15], angle: 30, size: 0.13, color: '#d9c0f0', opacity: 0.45 },
    ],
    pattern: [
      // Purple front half, yellow back half, and a dark line through the eye.
      { type: 'region', side: 'lower', boundary: -1.4, from: 0.5, to: 1.05, color: '#ffc81a' },
      { type: 'stripe', v: -0.3, thickness: 0.09, from: 0, to: 0.16, color: '#2a1240' },
    ],
    eye: { u: 0.12, v: -0.25, size: 0.045, iris: '#e0b84a' },
    swim: { speed: [0.3, 0.7], tailHz: 3, flex: 0.03, depth: [0.45, 0.88], behaviour: 'hover' },
  },
};
