import { describe, expect, it } from 'vitest';
import { findNext, type Rect } from '../../src/ui/focus';

const r = (x: number, y: number, w = 100, h = 60): Rect => ({ x, y, w, h });

// A 3×2 grid of cards with a row of tabs above it:
//   [tabA]   [tabB]   [tabC]
//   [c0]     [c1]     [c2]
//   [c3]     [c4]     [c5]
const items = [
  { id: 'tabA', rect: r(0, 0, 100, 40) },
  { id: 'tabB', rect: r(200, 0, 100, 40) },
  { id: 'tabC', rect: r(400, 0, 100, 40) },
  { id: 'c0', rect: r(0, 100) },
  { id: 'c1', rect: r(200, 100) },
  { id: 'c2', rect: r(400, 100) },
  { id: 'c3', rect: r(0, 200) },
  { id: 'c4', rect: r(200, 200) },
  { id: 'c5', rect: r(400, 200) },
];
const at = (id: string) => items.find((i) => i.id === id)!.rect;
const next = (id: string, dir: 'up' | 'down' | 'left' | 'right') => findNext(at(id), items, dir)?.id ?? null;

describe('findNext (D-pad navigation)', () => {
  it('moves within a grid', () => {
    expect(next('c0', 'right')).toBe('c1');
    expect(next('c1', 'right')).toBe('c2');
    expect(next('c1', 'down')).toBe('c4');
    expect(next('c4', 'left')).toBe('c3');
    expect(next('c4', 'up')).toBe('c1');
  });

  it('goes up from the grid to the tab above', () => {
    expect(next('c1', 'up')).toBe('tabB');
    expect(next('c2', 'up')).toBe('tabC');
  });

  it('returns null at the edges', () => {
    expect(next('c2', 'right')).toBeNull();
    expect(next('c3', 'down')).toBeNull();
    expect(next('tabA', 'up')).toBeNull();
  });

  it('prefers what is straight ahead over something closer but off to the side', () => {
    const list = [
      { id: 'here', rect: r(0, 0) },
      { id: 'diag', rect: r(110, 70) },
      { id: 'ahead', rect: r(300, 0) },
    ];
    expect(findNext(list[0]!.rect, list, 'right')?.id).toBe('ahead');
  });

  it('still reaches an item that is only diagonally in that direction', () => {
    const list = [
      { id: 'here', rect: r(0, 0) },
      { id: 'lower-right', rect: r(300, 200) },
    ];
    expect(findNext(list[0]!.rect, list, 'right')?.id).toBe('lower-right');
  });
});

import { viewFor } from '../../src/ui/worldMap';
import { ALL_SPECIES } from '../../src/data/species';

describe('range map view', () => {
  it('contains the whole range for every species, at the requested aspect', () => {
    for (const s of ALL_SPECIES) {
      const v = viewFor(s.codex.range, 2.15);
      for (const poly of s.codex.range) {
        for (const [lon, lat] of poly) {
          expect(lon).toBeGreaterThanOrEqual(v.lon0 - 1e-9);
          expect(lon).toBeLessThanOrEqual(v.lon1 + 1e-9);
          expect(lat).toBeGreaterThanOrEqual(v.lat0 - 1e-9);
          expect(lat).toBeLessThanOrEqual(v.lat1 + 1e-9);
        }
      }
      expect(v.lon1 - v.lon0).toBeGreaterThanOrEqual(70);
    }
  });
});
