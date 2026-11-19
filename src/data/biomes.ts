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
  /** Caustic light on the sand: colour as "r,g,b" and strength at full daylight. */
  caustics: { rgb: string; strength: number };
  /**
   * No sunlight reaches this tank (the deep sea): no light rays, caustics,
   * surface shimmer or day/night colour grade. Animals make their own light.
   */
  lightless?: boolean;
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
    floor: { y: 905, top: '#d4c294', bottom: '#9c875e' },
    rays: '200,245,255',
    caustics: { rgb: '215,248,255', strength: 0.7 },
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
    // Tea-coloured, murky water: faint and warm.
    caustics: { rgb: '255,228,170', strength: 0.35 },
    seed: 11,
  },
  deep: {
    id: 'deep',
    name: 'Deep sea',
    water: ['#061426', '#030a16', '#01040a'],
    haze: '#04101e',
    farRows: ['#07162a', '#050f1e'],
    plants: [],
    floor: { y: 920, top: '#1c2430', bottom: '#0b0f15' },
    rays: '120,170,255',
    caustics: { rgb: '0,0,0', strength: 0 },
    lightless: true,
    seed: 23,
  },
};
