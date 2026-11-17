import type { Species } from '../types';

const BAR = '#1f1f24';

// First draft; fine-tuned in Milestone 6.
export const freshwaterAngelfish: Species = {
  id: 'freshwater-angelfish',
  biome: 'amazon',
  rarity: 'uncommon',
  commonName: 'Freshwater angelfish',
  scientificName: 'Pterophyllum scalare',
  displayLength: 115,
  groupSize: [1, 2],
  look: {
    body: { template: 'disc', upper: 0.3, lower: 0.3, maxAt: 0.42, peduncle: 0.2, bluntness: 0.55 },
    palette: { body: '#d8dad2', back: '#b9bcae', belly: '#eceee6', fin: '#d6d7cc' },
    fins: [
      { kind: 'dorsal', shape: 'trailing', from: 0.3, to: 0.85, size: 0.55, tipAt: 0.55, sweep: 0.3, opacity: 0.8 },
      { kind: 'anal', shape: 'trailing', from: 0.38, to: 0.85, size: 0.6, tipAt: 0.55, sweep: 0.28, opacity: 0.8 },
      { kind: 'caudal', shape: 'lyre', size: 0.24, spread: 0.2, opacity: 0.6 },
      { kind: 'pelvic', shape: 'trailing', at: [0.3, 0.9], angle: 80, size: 0.55, width: 0.08, opacity: 0.85 },
      { kind: 'pectoral', shape: 'rounded', at: [0.3, 0.15], angle: 30, size: 0.12, opacity: 0.3 },
    ],
    pattern: [
      { type: 'band', at: 0.17, width: 0.05, color: BAR, curve: 0.02 },
      { type: 'band', at: 0.47, width: 0.07, color: BAR },
      { type: 'band', at: 0.8, width: 0.05, color: BAR, curve: -0.02 },
    ],
    eye: { u: 0.14, v: -0.2, size: 0.04, iris: '#b4302a' },
    swim: { speed: [0.25, 0.55], tailHz: 1.6, flex: 0.018, depth: [0.2, 0.7], behaviour: 'hover' },
  },
};
