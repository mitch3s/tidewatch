import { describe, expect, it } from 'vitest';
import { MOMENT_HINT, MOMENTS } from '../../src/data/moments';
import { getSpecies } from '../../src/data/species';

/** Every moment must belong to a real animal and be sourced, like the codex (spec v1.4 §3.4). */
describe.each(MOMENTS.map((m) => [m.id, m] as const))('moment: %s', (_id, m) => {
  it('belongs to a species, with enough of them in a tank to play it', () => {
    const s = getSpecies(m.speciesId);
    expect(s).toBeDefined();
    expect(m.minCount).toBeGreaterThanOrEqual(1);
    expect(m.minCount).toBeLessThanOrEqual(s!.groupSize[1]);
    expect(m.weight).toBeGreaterThan(0);
  });

  it('has a short name, a one-sentence fact and a hint', () => {
    expect(m.name.length).toBeGreaterThan(3);
    expect(m.name.length).toBeLessThan(30);
    expect(m.fact).toMatch(/^[A-Z]/);
    expect(m.fact).toMatch(/[.!]$/);
    expect(m.fact.length).toBeLessThan(160);
    expect(MOMENT_HINT[m.when]).toBeTruthy();
  });

  it('cites its sources as https links', () => {
    expect(m.sources.length).toBeGreaterThanOrEqual(1);
    for (const src of m.sources) expect(src.url).toMatch(/^https:\/\/[^\s]+$/);
  });
});

it('moment ids are unique', () => {
  expect(new Set(MOMENTS.map((m) => m.id)).size).toBe(MOMENTS.length);
});
