import type { SpeciesDef } from '../types';

// First draft; fine-tuned in Milestone 6.
export const silverArowana: SpeciesDef = {
  id: 'silver-arowana',
  biome: 'amazon',
  rarity: 'rare',
  commonName: 'Silver arowana',
  scientificName: 'Osteoglossum bicirrhosum',
  displayLength: 300,
  groupSize: [1, 1],
  look: {
    body: { template: 'elongated', upper: 0.1, lower: 0.11, maxAt: 0.35, peduncle: 0.5, bluntness: 0.25 },
    palette: { body: '#cdd6d9', back: '#8a9ea4', belly: '#eef3f3', fin: '#b9c4c7' },
    fins: [
      // Long, low dorsal and anal fins reaching back to the small tail.
      { kind: 'dorsal', shape: 'rounded', from: 0.62, to: 0.99, size: 0.075, tipAt: 0.78, sweep: 0.03, opacity: 0.8 },
      { kind: 'anal', shape: 'rounded', from: 0.45, to: 0.99, size: 0.1, tipAt: 0.78, sweep: 0.03, opacity: 0.8 },
      { kind: 'caudal', shape: 'rounded', size: 0.13, spread: 0.1, opacity: 0.85 },
      { kind: 'pelvic', shape: 'pointed', at: [0.42, 0.9], angle: 60, size: 0.05 },
      { kind: 'pectoral', shape: 'pointed', at: [0.2, 0.6], angle: 40, size: 0.09, opacity: 0.5 },
    ],
    pattern: [
      // Large, shiny scales.
      { type: 'scales', rows: 5, cols: 15, from: 0.16, to: 0.98, vRange: [-0.85, 0.85], color: 'rgba(60,80,90,0.35)', width: 0.0045 },
      { type: 'spots', count: 30, from: 0.2, to: 0.9, vRange: [-0.6, 0.6], radius: [0.014, 0.02], color: 'rgba(255,190,210,0.16)', seed: 6 },
    ],
    eye: { u: 0.08, v: -0.32, size: 0.022, iris: '#c9b46a' },
    // The big, upturned mouth, and two barbels on the chin.
    mouth: { length: 0.1, slope: 0.85 },
    barbels: { count: 2, length: 0.07, color: 'rgba(90,100,105,0.8)' },
    swim: { speed: [0.25, 0.5], tailHz: 1.2, flex: 0.012, depth: [0, 0.25], behaviour: 'cruiser' },
  },
};
