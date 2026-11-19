/**
 * Moments (spec v1.4 §3): rare, real behaviours that play out in the tank
 * now and then, and are recorded in the codex once you've seen one.
 *
 * Every fact is checked against the sources listed with it, like the codex
 * (November 2026). Each moment's script (how the animals move) is in
 * sim/moments.ts, under the same id.
 */

import { SYNODIC_DAYS } from '../util/moon';
import type { Source } from './codex';
import type { BiomeId } from './types';

/**
 * When a moment can happen, by the local clock (the same one that drives the
 * lighting). Dusk follows the lighting's sunset, 17:30–21:00.
 */
export type MomentTime = 'any' | 'day' | 'dusk' | 'night';

export interface MomentDef {
  id: string;
  /** The animal it's about, or null for the whole tank (coral spawning). */
  speciesId: string | null;
  /** The tank it happens in. */
  biome: BiomeId;
  /** Short name, used in the caption and the codex: "Courtship at dusk". */
  name: string;
  /** One sourced sentence for the codex. */
  fact: string;
  when: MomentTime;
  /** How many of the species must be in the tank. */
  minCount: number;
  /** Relative chance of being picked when several moments are possible. */
  weight: number;
  /** Only with the moon in this phase window (0 new .. 0.5 full .. 1). */
  moon?: [number, number];
  /** Only in these months (1–12). */
  months?: number[];
  /** Codex hint while not yet seen, instead of the time-of-day one. */
  hint?: string;
  /** Keep the camera wide instead of zooming in (a whole-tank moment). */
  wide?: boolean;
  sources: Source[];
}

/** Hours (local clock) that count as each time of day; ranges may wrap past midnight. */
export const MOMENT_HOURS: Record<Exclude<MomentTime, 'any'>, [number, number]> = {
  day: [8, 17.5],
  dusk: [17.5, 21],
  night: [21, 5.5],
};

/** The codex hint for a moment you haven't seen yet. */
export const MOMENT_HINT: Record<MomentTime, string> = {
  any: 'Keep watching',
  day: 'Watch during the day',
  dusk: 'Watch at dusk',
  night: 'Watch at night',
};

const wikipedia = (title: string, label = 'Wikipedia'): Source => ({ label, url: `https://en.wikipedia.org/wiki/${title}` });

export const MOMENTS: readonly MomentDef[] = [
  {
    id: 'clownfish-shelter',
    speciesId: 'ocellaris-clownfish',
    biome: 'reef',
    name: 'Shelter in the anemone',
    fact: 'The anemone shelters the pair with its stinging tentacles; a coat of mucus keeps the clownfish from being stung.',
    when: 'day',
    minCount: 1,
    weight: 3,
    sources: [wikipedia('Ocellaris_clownfish'), { label: 'FishBase', url: 'https://www.fishbase.se/summary/6509' }],
  },
  {
    id: 'mandarin-courtship',
    speciesId: 'mandarin-dragonet',
    biome: 'reef',
    name: 'Courtship at dusk',
    fact: 'At dusk a pair meets on the reef and rises together above it to release their eggs, then darts back down.',
    when: 'dusk',
    minCount: 2,
    weight: 3,
    sources: [
      { label: 'Smithsonian Ocean', url: 'https://ocean.si.edu/ocean-life/fish/mandarinfish-duo' },
      { label: 'Goda & Fujii (1995), Zoological Science', url: 'https://doi.org/10.2108/zsj.12.811' },
    ],
  },
  {
    id: 'lanternfish-rise',
    speciesId: 'spotted-lanternfish',
    biome: 'deep',
    name: 'The evening rise',
    fact: 'At dusk the school leaves the depths and swims up toward the surface, where it feeds through the night.',
    when: 'dusk',
    minCount: 3,
    weight: 3,
    sources: [{ label: 'FishBase', url: 'https://www.fishbase.se/summary/1328' }, wikipedia('Myctophum_punctatum')],
  },
  {
    id: 'corydoras-air',
    speciesId: 'bronze-corydoras',
    biome: 'amazon',
    name: 'A gulp of air',
    fact: 'It darts to the surface, gulps a bubble of air, and absorbs the oxygen through the wall of its gut.',
    when: 'any',
    minCount: 1,
    weight: 2,
    sources: [
      { label: 'FishBase', url: 'https://www.fishbase.se/summary/7777' },
      { label: 'Scotcat', url: 'https://www.scotcat.com/factsheets/osteogaster_aenea.html' },
    ],
  },
  // ---- added in part 3 (spec v1.4 §4)
  {
    id: 'atolla-alarm',
    speciesId: 'atolla-jellyfish',
    biome: 'deep',
    name: 'The alarm display',
    fact: 'When attacked, it sets off a series of blue flashes, which may draw in bigger predators more interested in its attacker than in the jelly.',
    when: 'any',
    minCount: 1,
    weight: 2,
    sources: [{ label: 'SeaLifeBase', url: 'https://www.sealifebase.se/summary/Atolla-wyvillei' }, wikipedia('Atolla_jellyfish')],
  },
  {
    id: 'vampire-pineapple',
    speciesId: 'vampire-squid',
    biome: 'deep',
    name: 'The pineapple pose',
    fact: 'If disturbed, it curls its arms up over its body, turning itself inside out to look bigger and show the soft spines on its arms.',
    when: 'any',
    minCount: 1,
    weight: 2,
    sources: [wikipedia('Vampire_squid')],
  },
  {
    id: 'arowana-leap',
    speciesId: 'silver-arowana',
    biome: 'amazon',
    name: 'A leap for insects',
    fact: "It leaps out of the water to snatch insects from overhanging branches, which is why it's nicknamed the water monkey.",
    when: 'day',
    minCount: 1,
    weight: 3,
    sources: [{ label: 'FishBase', url: 'https://www.fishbase.se/summary/6234' }, wikipedia('Silver_arowana')],
  },
  {
    id: 'gramma-ledge',
    speciesId: 'royal-gramma',
    biome: 'reef',
    name: 'Upside down',
    fact: 'Under a ledge it swims with its belly toward the rock, so it looks as if it is upside down.',
    when: 'day',
    minCount: 1,
    weight: 2,
    sources: [{ label: 'FishBase', url: 'https://www.fishbase.se/summary/5281' }, wikipedia('Royal_gramma')],
  },
  {
    id: 'neon-night',
    speciesId: 'neon-tetra',
    biome: 'amazon',
    name: 'Settling for the night',
    fact: 'At night, as the school rests, its blue and red stripes turn grey or black; they light up again in the morning.',
    when: 'night',
    minCount: 3,
    weight: 3,
    sources: [wikipedia('Neon_tetra')],
  },
  {
    id: 'coral-spawning',
    speciesId: null,
    biome: 'reef',
    name: 'Coral spawning',
    fact: 'A few nights after a full moon, corals all over the reef release their eggs and sperm at once, in clusters that float up to the surface.',
    when: 'night',
    minCount: 0,
    weight: 6,
    // Three to six days after the full moon (Wikipedia, Coral reef).
    moon: [0.5 + 2.5 / SYNODIC_DAYS, 0.5 + 6.5 / SYNODIC_DAYS],
    // On the Great Barrier Reef: October inshore, November and December offshore.
    months: [10, 11, 12],
    hint: 'Only at night, a few nights after a full moon, October to December',
    wide: true,
    sources: [wikipedia('Coral'), wikipedia('Coral_reef'), wikipedia('Great_Barrier_Reef')],
  },
];

export function getMoment(id: string): MomentDef | undefined {
  return MOMENTS.find((m) => m.id === id);
}

/** What the codex says about when to watch for a moment you haven't seen. */
export function momentHint(m: MomentDef): string {
  return m.hint ?? MOMENT_HINT[m.when];
}

/** Moments that belong to the whole tank rather than one animal. */
export function tankMoments(biome: BiomeId): MomentDef[] {
  return MOMENTS.filter((m) => m.speciesId === null && m.biome === biome);
}

export function momentsFor(speciesId: string): MomentDef[] {
  return MOMENTS.filter((m) => m.speciesId === speciesId);
}
