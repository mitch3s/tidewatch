import type { SpeciesDef } from '../types';

// First draft; fine-tuned in Milestone 6.
export const discus: SpeciesDef = {
  id: 'discus',
  biome: 'amazon',
  rarity: 'uncommon',
  commonName: 'Blue discus',
  scientificName: 'Symphysodon aequifasciatus',
  displayLength: 120,
  groupSize: [1, 2],
  look: {
    body: { template: 'disc', upper: 0.42, lower: 0.42, maxAt: 0.48, peduncle: 0.14, bluntness: 0.9 },
    palette: { body: '#c8622c', back: '#a84e22', belly: '#d9783a', fin: '#b9562a', finEdge: '#3fc1c9' },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.18, to: 0.95, size: 0.09, tipAt: 0.7, sweep: 0.03, edgeWidth: 0.01 },
      { kind: 'anal', shape: 'rounded', from: 0.3, to: 0.95, size: 0.09, tipAt: 0.7, sweep: 0.03, edgeWidth: 0.01 },
      { kind: 'caudal', shape: 'rounded', size: 0.16, spread: 0.13, opacity: 0.6 },
      { kind: 'pelvic', shape: 'pointed', at: [0.3, 0.9], angle: 70, size: 0.12, color: '#d64a2a' },
      { kind: 'pectoral', shape: 'rounded', at: [0.3, 0.1], angle: 30, size: 0.12, opacity: 0.3 },
    ],
    pattern: [
      { type: 'swirls', count: 12, color: 'rgba(80,205,215,0.8)', width: 0.012, amplitude: 0.03, frequency: 2.6, seed: 21, full: true, from: 0.05, to: 0.86 },
      // Faint vertical bars.
      { type: 'band', at: 0.15, width: 0.035, color: 'rgba(60,20,10,0.4)' },
      { type: 'band', at: 0.33, width: 0.03, color: 'rgba(60,20,10,0.18)' },
      { type: 'band', at: 0.5, width: 0.03, color: 'rgba(60,20,10,0.18)' },
      { type: 'band', at: 0.67, width: 0.03, color: 'rgba(60,20,10,0.18)' },
      { type: 'band', at: 0.84, width: 0.03, color: 'rgba(60,20,10,0.18)' },
    ],
    eye: { u: 0.13, v: -0.12, size: 0.035, iris: '#d22a1e' },
    swim: { speed: [0.25, 0.5], tailHz: 1.6, flex: 0.015, depth: [0.25, 0.75], behaviour: 'hover' },
  },
};
