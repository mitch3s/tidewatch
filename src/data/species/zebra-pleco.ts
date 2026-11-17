import type { Species } from '../types';

const BLACK = '#141416';

// First draft; fine-tuned in Milestone 6.
export const zebraPleco: Species = {
  id: 'zebra-pleco',
  biome: 'amazon',
  rarity: 'rare',
  commonName: 'Zebra pleco',
  scientificName: 'Hypancistrus zebra',
  displayLength: 90,
  groupSize: [1, 1],
  look: {
    body: { template: 'flat-bottom', upper: 0.14, lower: 0.07, maxAt: 0.3, peduncle: 0.4, bluntness: 0.75 },
    palette: { body: '#f1f0ea', back: '#e4e3dc', belly: '#f6f5f0', fin: '#efeee8', finEdge: BLACK },
    fins: [
      { kind: 'dorsal', shape: 'fan', from: 0.3, to: 0.55, size: 0.22, tipAt: 0.5, sweep: 0.05, edgeWidth: 0.02 },
      { kind: 'caudal', shape: 'lunate', size: 0.2, spread: 0.16, edgeWidth: 0.02 },
      { kind: 'pectoral', shape: 'pointed', at: [0.25, 0.7], angle: 45, size: 0.2, width: 0.3, color: BLACK, opacity: 0.85 },
    ],
    pattern: [
      { type: 'band', at: 0.1, width: 0.05, color: BLACK, curve: -0.03 },
      { type: 'band', at: 0.26, width: 0.07, color: BLACK, curve: 0.05 },
      { type: 'band', at: 0.45, width: 0.08, color: BLACK, bulge: { v: 0.2, amount: -0.08 } },
      { type: 'band', at: 0.66, width: 0.08, color: BLACK, curve: 0.04 },
      { type: 'band', at: 0.86, width: 0.07, color: BLACK },
      { type: 'stripe', v: 0, thickness: 0.18, from: 0.48, to: 0.98, color: BLACK },
    ],
    eye: { u: 0.18, v: -0.65, size: 0.04, iris: '#3a3a3a' },
    gill: null,
    swim: { speed: [0.2, 0.45], tailHz: 2.2, flex: 0.02, depth: [0.92, 1], behaviour: 'bottom-dweller' },
  },
};
