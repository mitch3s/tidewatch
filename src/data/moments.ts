/**
 * Moments (spec v1.4 §3): rare, real behaviours that play out in the tank
 * now and then, and are recorded in the codex once you've seen one.
 *
 * Every fact is checked against the sources listed with it, like the codex
 * (November 2026). Each moment's script (how the animals move) is in
 * sim/moments.ts, under the same id.
 */

import type { Source } from './codex';

/**
 * When a moment can happen, by the local clock (the same one that drives the
 * lighting). Dusk follows the lighting's sunset, 17:30–21:00.
 */
export type MomentTime = 'any' | 'day' | 'dusk' | 'night';

export interface MomentDef {
  id: string;
  speciesId: string;
  /** Short name, used in the caption and the codex: "Courtship at dusk". */
  name: string;
  /** One sourced sentence for the codex. */
  fact: string;
  when: MomentTime;
  /** How many of the species must be in the tank. */
  minCount: number;
  /** Relative chance of being picked when several moments are possible. */
  weight: number;
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
];

export function getMoment(id: string): MomentDef | undefined {
  return MOMENTS.find((m) => m.id === id);
}

export function momentsFor(speciesId: string): MomentDef[] {
  return MOMENTS.filter((m) => m.speciesId === speciesId);
}
