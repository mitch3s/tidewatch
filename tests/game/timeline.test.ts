import { describe, expect, it } from 'vitest';
import { MOMENTS } from '../../src/data/moments';
import { ALL_SPECIES } from '../../src/data/species';
import { Game } from '../../src/game/game';
import { buildTimeline } from '../../src/game/timeline';
import { createInitialState } from '../../src/save/schema';
import { createRng } from '../../src/util/rng';

const at = (d: string) => new Date(`2026-11-${d}Z`);

describe('buildTimeline', () => {
  it('starts with the reef being set up', () => {
    const s = createInitialState(ALL_SPECIES, createRng(1), at('17T20:00:00'));
    expect(buildTimeline(s, ALL_SPECIES, MOMENTS)).toEqual([
      { at: '2026-11-17T20:00:00.000Z', kind: 'start', title: 'Your first tank: Coral reef', detail: 'With the Ocellaris clownfish and Yellow tang' },
    ]);
  });

  it('lists arrivals, catches, missed visitors, new tanks and moments, newest first', () => {
    let now = at('17T20:00:00');
    const g = new Game(createInitialState(ALL_SPECIES, createRng(1), now), ALL_SPECIES, createRng(2), () => now);
    now = at('18T09:00:00');
    g.collect('blue-tang');
    now = at('18T10:00:00');
    g.forceVisitor('reef', 'mandarin-dragonet');
    g.tick(0, 30_000, { biome: 'reef', visitorsAllowed: true }); // missed
    now = at('18T11:00:00');
    g.collect('royal-gramma');
    g.collect('moorish-idol'); // the 4th reef species: the Amazon opens
    now = at('19T18:00:00');
    g.forceVisitor('reef', 'mandarin-dragonet');
    g.catchVisitor();
    now = at('19T18:40:00');
    g.witnessMoment('mandarin-courtship');

    const tl = buildTimeline(g.state, ALL_SPECIES, MOMENTS);
    expect(tl.map((e) => [e.at.slice(5, 16), e.title])).toEqual([
      ['11-19T18:40', 'Saw: Courtship at dusk'],
      ['11-19T18:00', 'Caught a Mandarin dragonet'],
      ['11-18T11:00', 'A Royal gramma settled in'],
      ['11-18T11:00', 'A Moorish idol settled in'],
      ['11-18T11:00', 'New tank discovered: Amazon river'],
      ['11-18T10:00', 'A Mandarin dragonet swam by'],
      ['11-18T09:00', 'A Blue tang settled in'],
      ['11-17T20:00', 'Your first tank: Coral reef'],
    ]);
    expect(tl[0]!.detail).toBe('Mandarin dragonet · Coral reef');
    expect(tl.find((e) => e.kind === 'tank')!.detail).toBe('With the Neon tetra and Bronze corydoras');
  });
});
