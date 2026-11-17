import { describe, expect, it } from 'vitest';
import { ALL_SPECIES } from '../../src/data/species';
import { CATCH_WINDOW_MS, Game, type GameEvent } from '../../src/game/game';
import { pickArrival } from '../../src/game/arrivals';
import { pickVisitor } from '../../src/game/visitors';
import { checkUnlocks } from '../../src/game/unlocks';
import { createInitialState } from '../../src/save/schema';
import type { SaveState } from '../../src/save/schema';
import { createRng } from '../../src/util/rng';

const MIN = 60_000;
const fresh = (seed = 1) => createInitialState(ALL_SPECIES, createRng(seed), new Date('2026-01-01T00:00:00Z'));

function collect(s: SaveState, ...ids: string[]) {
  for (const id of ids) s.species[id] = { state: 'collected', collectedAt: '2026-01-01T00:00:00.000Z' };
}

describe('pickArrival', () => {
  it('only picks uncollected common/uncommon fish from unlocked tanks', () => {
    const s = fresh();
    const rng = createRng(3);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(pickArrival(s, ALL_SPECIES, rng)!);
    expect([...seen].sort()).toEqual(['blue-tang', 'moorish-idol', 'royal-gramma']);
  });

  it('picks common fish about 3x as often as uncommon ones', () => {
    const s = fresh();
    const rng = createRng(4);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const id = pickArrival(s, ALL_SPECIES, rng)!;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    // Weights: blue tang 3, royal gramma 1, moorish idol 1 → 60% / 20% / 20%.
    expect(counts['blue-tang']! / 5000).toBeCloseTo(0.6, 1);
    expect(counts['royal-gramma']! / 5000).toBeCloseTo(0.2, 1);
  });

  it('returns null when everything available is collected', () => {
    const s = fresh();
    collect(s, 'blue-tang', 'royal-gramma', 'moorish-idol');
    expect(pickArrival(s, ALL_SPECIES, createRng(1))).toBeNull();
  });
});

describe('pickVisitor', () => {
  it('picks an uncaught rare fish from the shown tank', () => {
    const s = fresh();
    expect(pickVisitor(s, ALL_SPECIES, 'reef', createRng(1))).toBe('mandarin-dragonet');
  });

  it('can bring back a sighted (missed) visitor', () => {
    const s = fresh();
    s.species['mandarin-dragonet'] = { state: 'sighted' };
    expect(pickVisitor(s, ALL_SPECIES, 'reef', createRng(1))).toBe('mandarin-dragonet');
  });

  it("doesn't pick from a locked tank or caught fish", () => {
    const s = fresh();
    expect(pickVisitor(s, ALL_SPECIES, 'amazon', createRng(1))).toBeNull();
    collect(s, 'mandarin-dragonet');
    expect(pickVisitor(s, ALL_SPECIES, 'reef', createRng(1))).toBeNull();
  });
});

describe('checkUnlocks', () => {
  it('unlocks the Amazon after 4 reef fish', () => {
    const s = fresh();
    collect(s, 'blue-tang');
    expect(checkUnlocks(s)).toEqual([]);
    collect(s, 'royal-gramma');
    expect(checkUnlocks(s)).toEqual([{ biome: 'amazon', starters: ['neon-tetra', 'bronze-corydoras'] }]);
  });

  it("doesn't unlock twice", () => {
    const s = fresh();
    collect(s, 'blue-tang', 'royal-gramma');
    s.unlockedBiomes.push('amazon');
    expect(checkUnlocks(s)).toEqual([]);
  });
});

describe('Game', () => {
  const setup = (seed = 1) => {
    const state = fresh(seed);
    const game = new Game(state, ALL_SPECIES, createRng(seed + 10), () => new Date('2026-03-03T12:00:00Z'));
    const events: GameEvent[] = [];
    game.on((e) => events.push(e));
    return { state, game, events };
  };
  const tick = (game: Game, ms: number, biome: 'reef' | 'amazon' = 'reef') => {
    // Step in 1 s chunks like a real clock would.
    for (let t = 0; t < ms; t += 1000) game.tick(1000, 1000, { biome, visitorsAllowed: true });
  };

  it('brings an arrival when the timer runs out, then schedules the next', () => {
    const { state, game, events } = setup();
    const first = state.timers.nextArrivalMs;
    tick(game, first + 1000);
    const arrived = events.filter((e) => e.type === 'arrived');
    expect(arrived).toHaveLength(1);
    const id = (arrived[0] as { speciesId: string }).speciesId;
    expect(state.species[id]).toEqual({ state: 'collected', collectedAt: '2026-03-03T12:00:00.000Z' });
    expect(state.timers.nextArrivalMs).toBeGreaterThanOrEqual(19 * MIN);
  });

  it('only counts game time, which can be scaled', () => {
    const { state, game, events } = setup();
    const first = state.timers.nextArrivalMs;
    // At 600x, 1 real second is 10 game minutes.
    for (let i = 0; i < Math.ceil(first / 600_000) + 1; i++) game.tick(600_000, 1000, { biome: 'reef', visitorsAllowed: true });
    expect(events.some((e) => e.type === 'arrived')).toBe(true);
  });

  it('spawns a visitor, and catching it collects it', () => {
    const { state, game, events } = setup();
    game.forceVisitor('reef');
    expect(events).toContainEqual({ type: 'visitorSpawned', speciesId: 'mandarin-dragonet', biome: 'reef' });
    expect(game.activeVisitor?.speciesId).toBe('mandarin-dragonet');
    expect(game.catchVisitor()).toBe(true);
    expect(events).toContainEqual({ type: 'caught', speciesId: 'mandarin-dragonet', biome: 'reef' });
    expect(state.species['mandarin-dragonet']?.state).toBe('collected');
    expect(game.activeVisitor).toBeNull();
    expect(game.catchVisitor()).toBe(false);
  });

  it('marks a missed visitor as sighted when the catch window ends', () => {
    const { state, game, events } = setup();
    game.forceVisitor('reef');
    // The window is real time, not game time: a huge timescale doesn't shorten it.
    game.tick(10 * 60 * MIN, CATCH_WINDOW_MS - 1000, { biome: 'reef', visitorsAllowed: true });
    expect(game.activeVisitor).not.toBeNull();
    game.tick(1000, 1000, { biome: 'reef', visitorsAllowed: true });
    expect(game.activeVisitor).toBeNull();
    expect(events).toContainEqual({ type: 'visitorMissed', speciesId: 'mandarin-dragonet', biome: 'reef' });
    expect(state.species['mandarin-dragonet']?.state).toBe('sighted');
  });

  it("doesn't overwrite collected with sighted", () => {
    const { state, game } = setup();
    game.forceVisitor('reef', 'mandarin-dragonet', true);
    collectViaCatch(game);
    expect(state.species['mandarin-dragonet']?.state).toBe('collected');
    game.forceVisitor('reef', 'mandarin-dragonet', true);
    game.tick(1000, CATCH_WINDOW_MS + 1000, { biome: 'reef', visitorsAllowed: true });
    expect(state.species['mandarin-dragonet']?.state).toBe('collected');
  });

  it('holds back visitors while not allowed (e.g. codex open), then spawns', () => {
    const { state, game, events } = setup();
    const t = state.timers.nextVisitorMs;
    for (let ms = 0; ms < t + 2000; ms += 1000) game.tick(1000, 1000, { biome: 'reef', visitorsAllowed: false });
    expect(events.some((e) => e.type === 'visitorSpawned')).toBe(false);
    game.tick(1000, 1000, { biome: 'reef', visitorsAllowed: true });
    expect(events.some((e) => e.type === 'visitorSpawned')).toBe(true);
  });

  it('unlocks the Amazon with its starters when the 4th reef fish arrives', () => {
    const { state, game, events } = setup();
    collect(state, 'blue-tang');
    game.collect('royal-gramma');
    expect(state.unlockedBiomes).toEqual(['reef', 'amazon']);
    expect(state.species['neon-tetra']?.state).toBe('collected');
    expect(state.species['bronze-corydoras']?.state).toBe('collected');
    expect(events).toContainEqual({ type: 'biomeUnlocked', biome: 'amazon', starters: ['neon-tetra', 'bronze-corydoras'] });
  });

  it('notifies on every state change (for saving)', () => {
    const { game } = setup();
    let changes = 0;
    game.onChange(() => changes++);
    game.collect('blue-tang');
    expect(changes).toBe(1);
  });
});

function collectViaCatch(game: Game) {
  expect(game.catchVisitor()).toBe(true);
}

describe('Game.unlockBiome', () => {
  it('unlocks a tank with its starters, in tank order', () => {
    const state = fresh();
    const game = new Game(state, ALL_SPECIES, createRng(2));
    const events: GameEvent[] = [];
    game.on((e) => events.push(e));
    game.unlockBiome('amazon');
    game.unlockBiome('amazon');
    expect(state.unlockedBiomes).toEqual(['reef', 'amazon']);
    expect(state.species['neon-tetra']?.state).toBe('collected');
    expect(events.filter((e) => e.type === 'biomeUnlocked')).toHaveLength(1);
  });
});

describe('god-mode actions', () => {
  const setup = () => {
    const state = fresh();
    const game = new Game(state, ALL_SPECIES, createRng(2), () => new Date('2026-04-04T00:00:00Z'));
    const events: GameEvent[] = [];
    game.on((e) => events.push(e));
    return { state, game, events };
  };

  it('setSpeciesState can mark a species unseen, sighted or collected', () => {
    const { state, game } = setup();
    game.setSpeciesState('ocellaris-clownfish', 'unseen');
    expect(state.species['ocellaris-clownfish']).toEqual({ state: 'unseen' });
    game.setSpeciesState('mandarin-dragonet', 'sighted');
    expect(state.species['mandarin-dragonet']).toEqual({ state: 'sighted' });
    game.setSpeciesState('blue-tang', 'collected');
    expect(state.species['blue-tang']).toEqual({ state: 'collected', collectedAt: '2026-04-04T00:00:00.000Z' });
  });

  it('setSpeciesState to collected still runs unlocks', () => {
    const { state, game } = setup();
    game.setSpeciesState('blue-tang', 'collected');
    game.setSpeciesState('royal-gramma', 'collected');
    expect(state.unlockedBiomes).toContain('amazon');
  });

  it('lockBiome locks a tank but never the last one', () => {
    const { state, game } = setup();
    game.unlockBiome('amazon');
    game.lockBiome('amazon');
    expect(state.unlockedBiomes).toEqual(['reef']);
    game.lockBiome('reef');
    expect(state.unlockedBiomes).toEqual(['reef']);
  });
});
