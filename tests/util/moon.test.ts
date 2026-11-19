import { describe, expect, it } from 'vitest';
import { moonIconSvg, moonIllumination, moonPhase, moonPhaseName, SYNODIC_DAYS } from '../../src/util/moon';

/** Distance between two phases, going round the cycle either way. */
const apart = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
/** Half a day, as a fraction of a lunar month: real lunar months vary by hours around the average. */
const HALF_DAY = 0.5 / SYNODIC_DAYS;

describe('moonPhase', () => {
  it('matches published new and full moons', () => {
    // Times from timeanddate.com / USNO tables (UTC).
    expect(apart(moonPhase(new Date('2024-04-08T18:21Z')), 0)).toBeLessThan(HALF_DAY); // eclipse new moon
    expect(apart(moonPhase(new Date('2025-09-07T18:09Z')), 0.5)).toBeLessThan(HALF_DAY); // eclipse full moon
    expect(apart(moonPhase(new Date('2026-03-03T11:38Z')), 0.5)).toBeLessThan(HALF_DAY); // eclipse full moon
  });

  it('stays in 0..1, also before the reference new moon', () => {
    for (const d of ['1990-05-01', '2000-01-01', '2026-11-19', '2080-07-15']) {
      const p = moonPhase(new Date(d));
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });

  it('advances by a whole cycle every synodic month', () => {
    const a = new Date('2026-11-19T12:00Z');
    const b = new Date(a.getTime() + SYNODIC_DAYS * 86_400_000);
    expect(apart(moonPhase(a), moonPhase(b))).toBeLessThan(1e-6);
  });
});

describe('moonIllumination', () => {
  it('is dark at new moon, full at full moon, half at the quarters', () => {
    expect(moonIllumination(0)).toBeCloseTo(0);
    expect(moonIllumination(0.5)).toBeCloseTo(1);
    expect(moonIllumination(0.25)).toBeCloseTo(0.5);
    expect(moonIllumination(0.75)).toBeCloseTo(0.5);
  });
});

describe('moonPhaseName', () => {
  it('names the eight phases', () => {
    expect(moonPhaseName(0)).toBe('New moon');
    expect(moonPhaseName(0.99)).toBe('New moon');
    expect(moonPhaseName(0.12)).toBe('Waxing crescent');
    expect(moonPhaseName(0.25)).toBe('First quarter');
    expect(moonPhaseName(0.37)).toBe('Waxing gibbous');
    expect(moonPhaseName(0.5)).toBe('Full moon');
    expect(moonPhaseName(0.62)).toBe('Waning gibbous');
    expect(moonPhaseName(0.75)).toBe('Last quarter');
    expect(moonPhaseName(0.88)).toBe('Waning crescent');
  });
});

describe('moonIconSvg', () => {
  it('draws no lit part at new moon', () => {
    expect(moonIconSvg(0)).not.toContain('<path');
    expect(moonIconSvg(0.5)).toContain('<path');
  });
});
