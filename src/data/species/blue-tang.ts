import type { SpeciesDef } from '../types';

const BLACK = '#0f1426';

export const blueTang: SpeciesDef = {
  id: 'blue-tang',
  biome: 'reef',
  rarity: 'common',
  commonName: 'Blue tang',
  scientificName: 'Paracanthurus hepatus',
  displayLength: 165,
  groupSize: [1, 2],
  look: {
    body: { template: 'oval', upper: 0.24, lower: 0.23, maxAt: 0.45, peduncle: 0.24, bluntness: 0.65 },
    palette: { body: '#2364d8', back: '#1c53bd', belly: '#3d7fe8', fin: '#1f58c9', finEdge: BLACK },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.2, to: 0.9, size: 0.11, tipAt: 0.6, sweep: 0.03, edgeWidth: 0.014 },
      { kind: 'anal', shape: 'rounded', from: 0.5, to: 0.9, size: 0.1, tipAt: 0.5, sweep: 0.03, edgeWidth: 0.014 },
      // Yellow tail with black upper and lower margins.
      { kind: 'caudal', shape: 'lunate', size: 0.26, spread: 0.24, color: '#ffd21a', edge: BLACK, edgeWidth: 0.018 },
      { kind: 'pelvic', shape: 'pointed', at: [0.32, 0.88], angle: 65, size: 0.1 },
      { kind: 'pectoral', shape: 'pointed', at: [0.3, 0.1], angle: 28, size: 0.18, width: 0.32, color: '#f2d23a', edge: 'rgba(0,0,0,0)', opacity: 0.75 },
    ],
    pattern: [
      // The black "palette" marking: a band from the eye to the tail, and a
      // second one that loops round to enclose a blue patch.
      // Upper band from the eye to the tail.
      { type: 'stripe', v: -0.42, vEnd: -0.12, thickness: 0.5, from: 0.12, to: 0.99, color: BLACK, taper: true },
      // The lower arm: down from mid-body, then back up to the tail, enclosing a blue patch.
      { type: 'stripe', v: -0.3, vEnd: 0.32, thickness: 0.28, from: 0.34, to: 0.62, color: BLACK },
      { type: 'stripe', v: 0.32, vEnd: -0.05, thickness: 0.28, from: 0.6, to: 0.97, color: BLACK },
      // The yellow tail base.
      { type: 'region', side: 'upper', boundary: 1.4, from: 0.93, to: 1.02, color: '#ffd21a' },
    ],
    eye: { u: 0.13, v: -0.2, size: 0.036, iris: '#1a1a1a' },
    swim: { speed: [0.38, 0.75], tailHz: 1.9, flex: 0.025, depth: [0.2, 0.7], behaviour: 'cruiser' },
  },
};
