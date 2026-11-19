import { describe, expect, it } from 'vitest';
import { momentHint, MOMENTS } from '../../src/data/moments';
import { getSpecies } from '../../src/data/species';

/** Every moment must belong to a real animal and be sourced, like the codex (spec v1.4 §3.4). */
describe.each(MOMENTS.map((m) => [m.id, m] as const))('moment: %s', (_id, m) => {
  it('belongs to a species in its tank, with enough of them to play it (or to the whole tank)', () => {
    expect(m.weight).toBeGreaterThan(0);
    if (m.speciesId === null) {
      expect(m.minCount).toBe(0);
      return;
    }
    const s = getSpecies(m.speciesId);
    expect(s).toBeDefined();
    expect(s!.biome).toBe(m.biome);
    expect(m.minCount).toBeGreaterThanOrEqual(1);
    expect(m.minCount).toBeLessThanOrEqual(s!.groupSize[1]);
  });

  it('has a short name, a one-sentence fact and a hint', () => {
    expect(m.name.length).toBeGreaterThan(3);
    expect(m.name.length).toBeLessThan(30);
    expect(m.fact).toMatch(/^[A-Z]/);
    expect(m.fact).toMatch(/[.!]$/);
    expect(m.fact.length).toBeLessThan(160);
    expect(momentHint(m).length).toBeGreaterThan(5);
    if (m.moon) expect(m.moon[0]).toBeLessThan(m.moon[1]);
    for (const month of m.months ?? []) expect(month).toBeGreaterThanOrEqual(1);
  });

  it('cites its sources as https links', () => {
    expect(m.sources.length).toBeGreaterThanOrEqual(1);
    for (const src of m.sources) expect(src.url).toMatch(/^https:\/\/[^\s]+$/);
  });
});

it('moment ids are unique', () => {
  expect(new Set(MOMENTS.map((m) => m.id)).size).toBe(MOMENTS.length);
});
