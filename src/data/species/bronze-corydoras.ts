import type { SpeciesDef } from '../types';

// First draft; fine-tuned in Milestone 6.
export const bronzeCorydoras: SpeciesDef = {
  id: 'bronze-corydoras',
  biome: 'amazon',
  rarity: 'common',
  commonName: 'Bronze corydoras',
  scientificName: 'Corydoras aeneus',
  displayLength: 72,
  groupSize: [3, 5],
  look: {
    body: { template: 'flat-bottom', upper: 0.19, lower: 0.1, maxAt: 0.33, peduncle: 0.45, bluntness: 0.85 },
    palette: { body: '#b48d50', back: '#4f6a52', belly: '#ead9b5', fin: '#cdb68a' },
    fins: [
      { kind: 'dorsal', shape: 'pointed', from: 0.3, to: 0.46, size: 0.22, tipAt: 0.15, sweep: 0.05, opacity: 0.7 },
      { kind: 'dorsal', shape: 'pointed', from: 0.8, to: 0.87, size: 0.06, tipAt: 0.7, opacity: 0.6, rays: false },
      { kind: 'anal', shape: 'rounded', from: 0.7, to: 0.82, size: 0.08, opacity: 0.6 },
      { kind: 'caudal', shape: 'forked', size: 0.22, spread: 0.16, opacity: 0.7 },
      { kind: 'pelvic', shape: 'rounded', at: [0.45, 0.85], angle: 55, size: 0.08, opacity: 0.6 },
      { kind: 'pectoral', shape: 'pointed', at: [0.25, 0.6], angle: 40, size: 0.16, opacity: 0.6 },
    ],
    pattern: [
      // Metallic green flank patch.
      { type: 'stripe', v: -0.25, thickness: 0.7, from: 0.3, to: 0.85, color: 'rgba(70,120,90,0.55)', taper: true },
      // Two rows of bony armour plates.
      { type: 'scales', rows: 2, cols: 10, from: 0.3, to: 0.98, vRange: [-0.75, 0.55], color: 'rgba(60,45,25,0.35)', width: 0.008 },
    ],
    eye: { u: 0.13, v: -0.35, size: 0.05, iris: '#d9c27a' },
    barbels: { count: 3, length: 0.07 },
    swim: { speed: [0.3, 0.7], tailHz: 3, flex: 0.025, depth: [0.88, 1], behaviour: 'bottom-dweller' },
  },
};
