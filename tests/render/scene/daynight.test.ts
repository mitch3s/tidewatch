import { describe, expect, it } from 'vitest';
import { lightingAt } from '../../../src/render/scene/daynight';

describe('lightingAt', () => {
  it('is fully lit at noon', () => {
    const l = lightingAt(12);
    expect(l.darkness).toBe(0);
    expect(l.rays).toBe(1);
  });

  it('is dark at 2am with no light rays', () => {
    const l = lightingAt(2);
    expect(l.darkness).toBeGreaterThan(0.4);
    expect(l.rays).toBe(0);
  });

  it('transitions smoothly through dusk', () => {
    const a = lightingAt(18).darkness;
    const b = lightingAt(19.25).darkness;
    const c = lightingAt(20.5).darkness;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(lightingAt(19.25).warmth).toBeGreaterThan(0);
  });

  it('wraps around midnight', () => {
    expect(lightingAt(24).darkness).toBeCloseTo(lightingAt(0).darkness);
    expect(lightingAt(-1).darkness).toBeCloseTo(lightingAt(23).darkness);
  });
});
