import type { Species } from '../data/types';
import { migrate } from './migrations';
import { createInitialState, type SaveState, SAVE_KEY } from './schema';

/** The part of `localStorage` we use; easy to fake in tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Load progress, falling back to a fresh start if it's missing or unusable. */
export function loadSave(store: KeyValueStore, roster: readonly Species[], rng: () => number): SaveState {
  try {
    const text = store.getItem(SAVE_KEY);
    if (text) {
      const state = migrate(JSON.parse(text), roster, rng);
      if (state) return state;
      console.warn('Tidewatch: saved progress could not be read; starting fresh.');
    }
  } catch (e) {
    console.warn('Tidewatch: could not load progress; starting fresh.', e);
  }
  return createInitialState(roster, rng);
}

/** Save progress. Never throws: a full or blocked storage just logs a warning. */
export function writeSave(store: KeyValueStore, state: SaveState): void {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Tidewatch: could not save progress.', e);
  }
}

export function clearSave(store: KeyValueStore): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** `localStorage` if it's usable here, otherwise an in-memory stand-in. */
export function defaultStore(): KeyValueStore {
  try {
    const ls = window.localStorage;
    const probe = '__tidewatch_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    };
  }
}
