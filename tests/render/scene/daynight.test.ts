import { describe, expect, it } from 'vitest';
import { lightingAt, mixRgb } from '../../../src/render/scene/daynight';

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

describe('colour grade', () => {
  it('leaves the picture untouched at noon', () => {
    expect(lightingAt(12).grade).toEqual([255, 255, 255]);
    expect(lightingAt(12).moon).toBe(0);
  });

  it('is darker and bluer at night, with moonlight', () => {
    const l = lightingAt(2);
    const [r, g, b] = l.grade;
    expect(b).toBeLessThan(255);
    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
    expect(l.moon).toBe(1);
  });

  it('is warm at dusk', () => {
    const [r, , b] = lightingAt(19).grade;
    expect(r).toBeGreaterThan(b);
  });
});

describe('mixRgb', () => {
  it('blends two colours', () => {
    expect(mixRgb('0,0,0', '200,100,50', 0.5)).toBe('100,50,25');
    expect(mixRgb('10,20,30', '200,100,50', 0)).toBe('10,20,30');
  });
});
