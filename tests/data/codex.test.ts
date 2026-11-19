import { describe, expect, it } from 'vitest';
import { CODEX } from '../../src/data/codex';
import { ALL_SPECIES } from '../../src/data/species';

/** Every codex entry must be complete and sourced (plan 6.4). */
describe.each(ALL_SPECIES.map((s) => [s.id, s] as const))('codex: %s', (id, s) => {
  const c = s.codex;

  it('has every field filled in', () => {
    for (const field of [c.nativeRange, c.habitat, c.diet]) expect(field.trim().length).toBeGreaterThan(10);
    expect(c.size.cm).toBeGreaterThan(0);
    expect(s.look.creature ? ['TL', 'WD'] : ['TL', 'SL']).toContain(c.size.measure);
    expect(c.water.type).toBe(s.biome === 'amazon' ? 'fresh' : 'salt');
    if (c.water.tempC) {
      expect(c.water.tempC[0]).toBeLessThan(c.water.tempC[1]);
      // Deep-sea water is cold, often just a few degrees.
      expect(c.water.tempC[0]).toBeGreaterThanOrEqual(s.biome === 'deep' ? -2 : 15);
      expect(c.water.tempC[1]).toBeLessThanOrEqual(35);
    }
  });

  it('has 2 or 3 fun facts, each a full sentence', () => {
    expect(c.funFacts.length).toBeGreaterThanOrEqual(2);
    expect(c.funFacts.length).toBeLessThanOrEqual(3);
    for (const f of c.funFacts) {
      expect(f).toMatch(/^[A-Z'"]/);
      expect(f).toMatch(/[.!]$/);
      expect(f.length).toBeLessThan(200);
    }
  });

  it('cites FishBase (SeaLifeBase for animals that aren\'t fish) plus any other sources, as https links', () => {
    expect(c.sources.length).toBeGreaterThanOrEqual(1);
    const primary = s.look.creature ? 'SeaLifeBase' : 'FishBase';
    expect(c.sources.some((x) => x.label === primary)).toBe(true);
    for (const src of c.sources) {
      expect(src.label.length).toBeGreaterThan(2);
      expect(src.url).toMatch(/^https:\/\/[^\s]+$/);
    }
  });

  it('has a plausible range map', () => {
    expect(c.range.length).toBeGreaterThanOrEqual(1);
    for (const poly of c.range) {
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const [lon, lat] of poly) {
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
        // Reef and Amazon species are tropical or subtropical; deep-sea ones range much wider.
        expect(Math.abs(lat)).toBeLessThanOrEqual(s.biome === 'deep' ? 85 : 40);
      }
    }
    // Reef fish live in the oceans' tropics, Amazon fish in South America.
    if (s.biome === 'amazon') {
      for (const poly of c.range) for (const [lon, lat] of poly) {
        expect(lon).toBeGreaterThan(-82);
        expect(lon).toBeLessThan(-34);
        expect(lat).toBeLessThan(13);
      }
    }
  });

  it('is keyed by the species id', () => {
    expect(CODEX[id]).toBe(c);
  });
});

it('has no codex entries for species that do not exist', () => {
  const ids = new Set(ALL_SPECIES.map((s) => s.id));
  for (const id of Object.keys(CODEX)) expect(ids.has(id)).toBe(true);
});

it('starts every tank with species that exist, in that tank', async () => {
  const { BIOME_RULES } = await import('../../src/data/progression');
  for (const rule of BIOME_RULES) {
    for (const id of rule.starters) expect(ALL_SPECIES.find((sp) => sp.id === id)?.biome).toBe(rule.biome);
  }
});
