import { describe, expect, it } from 'vitest';
import { MOMENTS } from '../../src/data/moments';
import { ALL_SPECIES } from '../../src/data/species';
import { Game, type GameEvent } from '../../src/game/game';
import { inMomentTime, type MomentContext, momentCandidates, pickMoment } from '../../src/game/moments';
import type { BiomeId } from '../../src/data/types';
import { createInitialState, MOMENT_DELAY_MS, MOMENT_RETRY_MS } from '../../src/save/schema';
import { createRng } from '../../src/util/rng';

const fresh = () => createInitialState(ALL_SPECIES, createRng(1), new Date('2026-01-01T00:00:00Z'));
const counts = (entries: Record<string, number>) => new Map(Object.entries(entries));
/** A context in a tank at an hour; a half moon in June unless given. */
const ctx = (biome: BiomeId, hour: number, c: Record<string, number>, extra: Partial<MomentContext> = {}): MomentContext => ({
  biome,
  hour,
  moonPhase: 0.25,
  month: 6,
  counts: counts(c),
  ...extra,
});

describe('inMomentTime', () => {
  it('knows day, dusk and night, wrapping past midnight', () => {
    expect(inMomentTime('day', 12)).toBe(true);
    expect(inMomentTime('day', 19)).toBe(false);
    expect(inMomentTime('dusk', 19)).toBe(true);
    expect(inMomentTime('dusk', 12)).toBe(false);
    expect(inMomentTime('night', 23)).toBe(true);
    expect(inMomentTime('night', 2)).toBe(true);
    expect(inMomentTime('night', 26)).toBe(true);
    expect(inMomentTime('night', 12)).toBe(false);
    expect(inMomentTime('any', 3)).toBe(true);
  });
});

describe('momentCandidates', () => {
  it('needs the animals in the tank, enough of them, at the right time of day', () => {
    const ids = (biome: BiomeId, hour: number, c: Record<string, number>) => momentCandidates(MOMENTS, ctx(biome, hour, c)).map((m) => m.id);
    expect(ids('reef', 12, { 'ocellaris-clownfish': 2, 'royal-gramma': 1 })).toEqual(['clownfish-shelter', 'gramma-ledge']);
    expect(ids('reef', 22, { 'ocellaris-clownfish': 2 })).toEqual([]);
    expect(ids('reef', 19, { 'mandarin-dragonet': 1 })).toEqual([]);
    expect(ids('reef', 19, { 'mandarin-dragonet': 2 })).toEqual(['mandarin-courtship']);
    expect(ids('amazon', 23, { 'neon-tetra': 10, 'bronze-corydoras': 3 })).toEqual(['corydoras-air', 'neon-night']);
    // Only the tank on screen counts.
    expect(ids('amazon', 12, { 'ocellaris-clownfish': 2 })).toEqual([]);
  });

  it('coral spawning needs night, a few nights after a full moon, from October to December', () => {
    const coral = (hour: number, moonPhase: number, month: number) =>
      momentCandidates(MOMENTS, ctx('reef', hour, {}, { moonPhase, month })).some((m) => m.id === 'coral-spawning');
    const nightsAfterFull = (n: number) => 0.5 + n / 29.53;
    expect(coral(23, nightsAfterFull(4), 11)).toBe(true);
    expect(coral(23, nightsAfterFull(3), 10)).toBe(true);
    expect(coral(23, nightsAfterFull(6), 12)).toBe(true);
    expect(coral(23, nightsAfterFull(0), 11)).toBe(false); // the full moon itself
    expect(coral(23, nightsAfterFull(9), 11)).toBe(false);
    expect(coral(23, nightsAfterFull(4), 6)).toBe(false); // wrong month
    expect(coral(13, nightsAfterFull(4), 11)).toBe(false); // daytime
  });
});

describe('pickMoment', () => {
  it('returns null when nothing fits', () => {
    expect(pickMoment(MOMENTS, fresh(), ctx('reef', 12, {}), Math.random)).toBeNull();
  });

  it('favours moments not yet witnessed, 3 to 1 at equal weight', () => {
    const s = fresh();
    s.moments['clownfish-shelter'] = { witnessedAt: '2026-01-01T00:00:00Z' };
    const rng = createRng(5);
    let unseen = 0;
    const defs = MOMENTS.filter((m) => m.id === 'clownfish-shelter' || m.id === 'corydoras-air').map((m) => ({ ...m, weight: 1 }));
    for (let i = 0; i < 4000; i++) {
      const both = defs.map((m) => ({ ...m, biome: 'reef' as const }));
      if (pickMoment(both, s, ctx('reef', 12, { 'ocellaris-clownfish': 2, 'bronze-corydoras': 3 }), rng)!.id === 'corydoras-air') unseen++;
    }
    expect(unseen / 4000).toBeCloseTo(0.75, 1);
  });
});

describe('Game: moments', () => {
  it('a moment comes due after its timer runs down, then waits the full gap once one starts', () => {
    const g = new Game(fresh(), ALL_SPECIES, createRng(2));
    expect(g.momentDue).toBe(false);
    g.tick(MOMENT_DELAY_MS[1], 0, { biome: 'reef', visitorsAllowed: false });
    expect(g.momentDue).toBe(true);
    g.momentHandled(true);
    expect(g.state.timers.nextMomentMs).toBeGreaterThanOrEqual(MOMENT_DELAY_MS[0]);
    g.forceMoment();
    g.momentHandled(false);
    expect(g.state.timers.nextMomentMs).toBe(MOMENT_RETRY_MS);
  });

  it('records a moment the first time it is witnessed, and says so', () => {
    const g = new Game(fresh(), ALL_SPECIES, createRng(2), () => new Date('2026-11-19T18:40:00Z'));
    const events: GameEvent[] = [];
    g.on((e) => events.push(e));
    g.witnessMoment('mandarin-courtship');
    g.witnessMoment('mandarin-courtship');
    expect(g.state.moments['mandarin-courtship']).toEqual({ witnessedAt: '2026-11-19T18:40:00.000Z' });
    expect(events).toEqual([
      { type: 'momentWitnessed', momentId: 'mandarin-courtship', first: true },
      { type: 'momentWitnessed', momentId: 'mandarin-courtship', first: false },
    ]);
    g.setMomentWitnessed('mandarin-courtship', false);
    expect(g.state.moments['mandarin-courtship']).toBeUndefined();
  });
});
