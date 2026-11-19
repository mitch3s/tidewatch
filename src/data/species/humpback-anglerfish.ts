import type { SpeciesDef } from '../types';

export const humpbackAnglerfish: SpeciesDef = {
  id: 'humpback-anglerfish',
  biome: 'deep',
  rarity: 'rare',
  commonName: 'Humpback anglerfish',
  scientificName: 'Melanocetus johnsonii',
  displayLength: 120,
  groupSize: [1, 1],
  look: {
    body: { template: 'oval', upper: 0.32, lower: 0.35, maxAt: 0.45, peduncle: 0.25, bluntness: 0.95 },
    palette: { body: '#3c3539', back: '#221d22', belly: '#4c4448', fin: '#352e33' },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.62, to: 0.8, size: 0.1 },
      { kind: 'anal', shape: 'rounded', from: 0.66, to: 0.82, size: 0.08 },
      { kind: 'caudal', shape: 'rounded', size: 0.22, spread: 0.16 },
      { kind: 'pectoral', shape: 'rounded', at: [0.38, 0.15], angle: 30, size: 0.12, opacity: 0.7 },
    ],
    pattern: [],
    eye: { u: 0.16, v: -0.4, size: 0.03, iris: '#3c4c5c' },
    // A huge, gaping mouth slanting up toward the front.
    mouth: { length: 0.3, slope: -0.9 },
    lure: { at: [0.06, -0.95], length: 0.45, color: '#2e272c', bulb: '#dcf8ff', halo: '150,230,255' },
    swim: { speed: [0.1, 0.25], tailHz: 1.5, flex: 0.03, depth: [0.4, 0.85], behaviour: 'drift' },
  },
};
