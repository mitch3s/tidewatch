import { describe, expect, it } from 'vitest';
import { ALL_SPECIES } from '../../src/data/species';
import { createInitialState, SAVE_KEY, SAVE_VERSION } from '../../src/save/schema';
import { loadSave, writeSave, type KeyValueStore } from '../../src/save/storage';
import { createRng } from '../../src/util/rng';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const rng = () => createRng(1);

describe('createInitialState', () => {
  it('starts with the reef unlocked and its starter fish collected', () => {
    const s = createInitialState(ALL_SPECIES, rng(), new Date('2026-01-01T10:00:00Z'));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.unlockedBiomes).toEqual(['reef']);
    expect(s.species['ocellaris-clownfish']?.state).toBe('collected');
    expect(s.species['yellow-tang']?.state).toBe('collected');
    expect(s.species['ocellaris-clownfish']?.collectedAt).toBe('2026-01-01T10:00:00.000Z');
    expect(s.species['blue-tang']?.state).toBe('unseen');
    expect(s.species['neon-tetra']?.state).toBe('unseen');
    expect(Object.keys(s.species)).toHaveLength(ALL_SPECIES.length);
  });

  it('schedules the first arrival and visitor within the spec ranges', () => {
    const s = createInitialState(ALL_SPECIES, rng());
    expect(s.timers.nextArrivalMs).toBeGreaterThanOrEqual(20 * 60_000);
    expect(s.timers.nextArrivalMs).toBeLessThanOrEqual(40 * 60_000);
    expect(s.timers.nextVisitorMs).toBeGreaterThanOrEqual(45 * 60_000);
    expect(s.timers.nextVisitorMs).toBeLessThanOrEqual(90 * 60_000);
  });
});

describe('loadSave / writeSave', () => {
  it('returns a fresh state when nothing is saved', () => {
    const store = new MemoryStore();
    const s = loadSave(store, ALL_SPECIES, rng());
    expect(s.unlockedBiomes).toEqual(['reef']);
  });

  it('round-trips a saved state', () => {
    const store = new MemoryStore();
    const s = createInitialState(ALL_SPECIES, rng());
    s.species['blue-tang'] = { state: 'collected', collectedAt: '2026-02-02T00:00:00.000Z' };
    s.settings.rotationMin = 5;
    writeSave(store, s);
    const back = loadSave(store, ALL_SPECIES, rng());
    expect(back).toEqual(s);
  });

  it('resets when the save is corrupt', () => {
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, '{not json');
    expect(loadSave(store, ALL_SPECIES, rng()).unlockedBiomes).toEqual(['reef']);
    store.setItem(SAVE_KEY, JSON.stringify({ version: 1, species: 'nope' }));
    expect(loadSave(store, ALL_SPECIES, rng()).unlockedBiomes).toEqual(['reef']);
  });

  it('resets when the save is from a newer, unknown version', () => {
    const store = new MemoryStore();
    const s = createInitialState(ALL_SPECIES, rng());
    store.setItem(SAVE_KEY, JSON.stringify({ ...s, version: 99 }));
    expect(loadSave(store, ALL_SPECIES, rng()).version).toBe(SAVE_VERSION);
  });

  it('adds species that are new since the save, and drops unknown ones', () => {
    const store = new MemoryStore();
    const s = createInitialState(ALL_SPECIES, rng());
    delete (s.species as Record<string, unknown>)['discus'];
    (s.species as Record<string, unknown>)['made-up-fish'] = { state: 'collected' };
    store.setItem(SAVE_KEY, JSON.stringify(s));
    const back = loadSave(store, ALL_SPECIES, rng());
    expect(back.species['discus']?.state).toBe('unseen');
    expect(back.species['made-up-fish']).toBeUndefined();
  });

  it('ignores invalid values field by field', () => {
    const store = new MemoryStore();
    const s = createInitialState(ALL_SPECIES, rng());
    const raw = JSON.parse(JSON.stringify(s));
    raw.species['blue-tang'] = { state: 'banana' };
    raw.unlockedBiomes = ['reef', 'moon'];
    raw.settings.rotationMin = 7;
    raw.timers.nextArrivalMs = -5;
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    const back = loadSave(store, ALL_SPECIES, rng());
    expect(back.species['blue-tang']?.state).toBe('unseen');
    expect(back.unlockedBiomes).toEqual(['reef']);
    expect(back.settings.rotationMin).toBe(15);
    expect(back.timers.nextArrivalMs).toBeGreaterThan(0);
  });

  it("doesn't throw when storage is unavailable", () => {
    const broken: KeyValueStore = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('denied');
      },
      removeItem() {},
    };
    const s = loadSave(broken, ALL_SPECIES, rng());
    expect(() => writeSave(broken, s)).not.toThrow();
  });
});
