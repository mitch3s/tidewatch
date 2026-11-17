import type { BiomeId } from './types';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  /** Water gradient, top to bottom. */
  water: [string, string, string];
  /** Colour distant scenery fades into. */
  haze: string;
  /** Colours of the two rows of distant silhouettes (far, nearer). */
  farRows: [string, string];
  /** Greens for the foreground plants. */
  plants: string[];
  /** Floor: where it starts (logical y), and its colours. */
  floor: { y: number; top: string; bottom: string };
  /** Light ray colour as "r,g,b" (drawn additively). */
  rays: string;
  /** Seed for the generated scenery, so the tank looks the same every time. */
  seed: number;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  reef: {
    id: 'reef',
    name: 'Coral reef',
    water: ['#1b9cc0', '#0b6a93', '#053a5c'],
    haze: '#0d6f94',
    farRows: ['#1d5a74', '#174b63'],
    plants: ['#2f7a4a', '#3f8f5a', '#4f9f63', '#2a6b45', '#5aa66b'],
    floor: { y: 905, top: '#e8d8ae', bottom: '#b49f74' },
    rays: '200,245,255',
    seed: 7,
  },
  amazon: {
    // Placeholder scenery until Milestone 6.
    id: 'amazon',
    name: 'Amazon river',
    water: ['#7a7a3c', '#4a4a22', '#221f0e'],
    haze: '#5a5428',
    farRows: ['#3e3b1c', '#2d2a13'],
    plants: ['#4f7a2a', '#5f8f34', '#3f6a22', '#6f9f3c'],
    floor: { y: 915, top: '#9b7b4f', bottom: '#5e4628' },
    rays: '255,240,190',
    seed: 11,
  },
};
