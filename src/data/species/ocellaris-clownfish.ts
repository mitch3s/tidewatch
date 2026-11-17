import type { SpeciesDef } from '../types';

const ORANGE = '#ff7a1a';
const WHITE = '#fbfaf4';
const BLACK = '#151311';

export const ocellarisClownfish: SpeciesDef = {
  id: 'ocellaris-clownfish',
  biome: 'reef',
  rarity: 'common',
  commonName: 'Ocellaris clownfish',
  scientificName: 'Amphiprion ocellaris',
  displayLength: 100,
  groupSize: [2, 2],
  look: {
    body: { template: 'oval', upper: 0.22, lower: 0.21, maxAt: 0.4, peduncle: 0.45, bluntness: 0.78 },
    palette: { body: ORANGE, back: '#f0600c', belly: '#ff9a45', fin: '#ff8424', finEdge: BLACK },
    fins: [
      // Spiny front dorsal (lower) and soft rear dorsal (taller, rounded), with a notch between.
      { kind: 'dorsal', shape: 'rounded', from: 0.26, to: 0.53, size: 0.09, tipAt: 0.4, sweep: 0.02, edgeWidth: 0.012 },
      { kind: 'dorsal', shape: 'rounded', from: 0.54, to: 0.88, size: 0.15, tipAt: 0.35, sweep: 0.06, edgeWidth: 0.012 },
      { kind: 'anal', shape: 'rounded', from: 0.6, to: 0.88, size: 0.14, tipAt: 0.35, sweep: 0.05, edgeWidth: 0.012 },
      { kind: 'caudal', shape: 'rounded', size: 0.24, spread: 0.19, edgeWidth: 0.012 },
      { kind: 'pelvic', shape: 'rounded', at: [0.3, 0.8], angle: 48, size: 0.15, width: 0.38, edgeWidth: 0.012 },
      { kind: 'pectoral', shape: 'fan', at: [0.3, 0.15], angle: 34, size: 0.15, width: 0.42, edge: 'rgba(0,0,0,0.25)', edgeWidth: 0.004, opacity: 0.6 },
    ],
    pattern: [
      // Head bar behind the eye, bowed toward the tail like the gill cover.
      { type: 'band', at: 0.235, width: 0.075, color: WHITE, edge: BLACK, edgeWidth: 0.014, curve: 0.045 },
      // Middle bar with its forward-pointing bulge.
      {
        type: 'band',
        at: 0.57,
        width: 0.075,
        color: WHITE,
        edge: BLACK,
        edgeWidth: 0.014,
        bulge: { v: -0.1, amount: -0.09, spread: 0.45 },
      },
      // Tail bar on the caudal peduncle.
      { type: 'band', at: 0.94, width: 0.06, color: WHITE, edge: BLACK, edgeWidth: 0.014, curve: 0.015 },
    ],
    eye: { u: 0.115, v: -0.28, size: 0.048, iris: '#d4661c' },
    gill: null, // the head bar already marks the gill cover
    swim: { speed: [0.35, 0.9], tailHz: 2.6, flex: 0.035, depth: [0.3, 0.75], behaviour: 'hover' },
  },
};
