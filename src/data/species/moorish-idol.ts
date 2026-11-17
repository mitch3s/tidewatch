import type { Species } from '../types';

const BLACK = '#121212';

// First draft; fine-tuned in Milestone 6.
export const moorishIdol: Species = {
  id: 'moorish-idol',
  biome: 'reef',
  rarity: 'uncommon',
  commonName: 'Moorish idol',
  scientificName: 'Zanclus cornutus',
  displayLength: 140,
  groupSize: [1, 2],
  look: {
    body: { template: 'disc', upper: 0.36, lower: 0.34, maxAt: 0.45, peduncle: 0.18, bluntness: 0.15 },
    palette: { body: '#f4f0e2', back: '#f1e9c8', belly: '#f7f4ea', fin: '#f4f0e2' },
    fins: [
      // The long trailing white filament from the dorsal fin.
      { kind: 'dorsal', shape: 'trailing', from: 0.3, to: 0.62, size: 0.7, tipAt: 0.15, sweep: 0.6, opacity: 0.95 },
      { kind: 'anal', shape: 'pointed', from: 0.45, to: 0.85, size: 0.22, tipAt: 0.2, sweep: 0.12 },
      { kind: 'caudal', shape: 'lunate', size: 0.2, spread: 0.18, color: BLACK, edge: '#f4f0e2', edgeWidth: 0.012 },
      { kind: 'pelvic', shape: 'pointed', at: [0.35, 0.9], angle: 70, size: 0.14, color: BLACK },
      { kind: 'pectoral', shape: 'pointed', at: [0.33, 0.1], angle: 30, size: 0.14, color: '#f8e6a0', opacity: 0.5 },
    ],
    pattern: [
      { type: 'region', side: 'upper', boundary: 0.4, from: 0.5, to: 0.8, color: '#ffd23a' },
      { type: 'band', at: 0.27, width: 0.16, color: BLACK, curve: 0.03 },
      { type: 'band', at: 0.74, width: 0.15, color: BLACK, curve: -0.02 },
      // Orange saddle on the snout.
      { type: 'spots', count: 1, from: 0.05, to: 0.05, vRange: [-0.35, -0.35], radius: [0.035, 0.035], color: '#ff9a2e', seed: 3 },
    ],
    eye: { u: 0.2, v: -0.12, size: 0.032, iris: '#222' },
    gill: null,
    swim: { speed: [0.35, 0.7], tailHz: 1.7, flex: 0.02, depth: [0.15, 0.7], behaviour: 'cruiser' },
  },
};
