import type { BiomeId } from './types';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  /** Water gradient, top to bottom. */
  water: [string, string, string];
  /** Colour distant scenery fades into. */
  haze: string;
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
    floor: { y: 905, top: '#e8d8ae', bottom: '#b49f74' },
    rays: '200,245,255',
    seed: 7,
  },
  amazon: {
    // Placeholder until Milestone 6 adds the Amazon scenery.
    id: 'amazon',
    name: 'Amazon river',
    water: ['#5f6a35', '#3d4521', '#1f2410'],
    haze: '#4a5229',
    floor: { y: 915, top: '#9b7b4f', bottom: '#5e4628' },
    rays: '255,240,190',
    seed: 11,
  },
};
