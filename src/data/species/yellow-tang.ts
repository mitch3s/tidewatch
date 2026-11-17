import type { Species } from '../types';

export const yellowTang: Species = {
  id: 'yellow-tang',
  biome: 'reef',
  rarity: 'common',
  commonName: 'Yellow tang',
  scientificName: 'Zebrasoma flavescens',
  displayLength: 150,
  groupSize: [1, 2],
  look: {
    // Tall, flat disc with a pointed snout.
    body: { template: 'disc', upper: 0.3, lower: 0.29, maxAt: 0.46, peduncle: 0.18, bluntness: 0.25 },
    palette: { body: '#ffd21a', back: '#f5c400', belly: '#ffe259', fin: '#ffcf0d' },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.22, to: 0.93, size: 0.17, tipAt: 0.45, sweep: 0.04, opacity: 0.95 },
      { kind: 'anal', shape: 'rounded', from: 0.45, to: 0.93, size: 0.15, tipAt: 0.45, sweep: 0.04, opacity: 0.95 },
      { kind: 'caudal', shape: 'square', size: 0.22, spread: 0.2, opacity: 0.95 },
      { kind: 'pelvic', shape: 'pointed', at: [0.33, 0.9], angle: 70, size: 0.11 },
      { kind: 'pectoral', shape: 'pointed', at: [0.3, 0.12], angle: 30, size: 0.17, width: 0.3, opacity: 0.55 },
    ],
    pattern: [
      // The white "scalpel" spine at the base of the tail.
      { type: 'spots', count: 1, from: 0.93, to: 0.93, vRange: [0.05, 0.05], radius: [0.024, 0.024], color: '#fbfbf2', seed: 1 },
    ],
    eye: { u: 0.17, v: -0.3, size: 0.034, iris: '#3a3020' },
    swim: { speed: [0.35, 0.7], tailHz: 1.6, flex: 0.02, depth: [0.15, 0.75], behaviour: 'cruiser' },
  },
};
