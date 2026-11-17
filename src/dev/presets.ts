import type { Species } from '../data/types';
import { createInitialState, type SaveState } from '../save/schema';

export interface Preset {
  id: string;
  label: string;
  create(roster: readonly Species[], rng: () => number): SaveState;
}

const now = () => new Date().toISOString();

/** Ready-made saves for testing (spec 5.6). */
export const PRESETS: readonly Preset[] = [
  { id: 'fresh', label: 'Fresh start', create: (roster, rng) => createInitialState(roster, rng) },
  {
    id: 'reef-nearly-done',
    label: 'Reef nearly done',
    create(roster, rng) {
      const s = createInitialState(roster, rng);
      for (const sp of roster) if (sp.biome === 'reef' && sp.rarity !== 'rare') s.species[sp.id] = { state: 'collected', collectedAt: now() };
      s.unlockedBiomes = ['reef', 'amazon'];
      for (const id of ['neon-tetra', 'bronze-corydoras']) s.species[id] = { state: 'collected', collectedAt: now() };
      return s;
    },
  },
  {
    id: 'all',
    label: 'Everything collected',
    create(roster, rng) {
      const s = createInitialState(roster, rng);
      for (const sp of roster) s.species[sp.id] = { state: 'collected', collectedAt: now() };
      s.unlockedBiomes = ['reef', 'amazon'];
      return s;
    },
  },
];
