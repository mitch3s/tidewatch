import { describe, expect, it } from 'vitest';
import { makeBody, resolveBody } from '../../src/render/fish/body';

const shape = resolveBody({ template: 'oval', upper: 0.2, lower: 0.18, maxAt: 0.4, peduncle: 0.4, bluntness: 0.7 });

describe('resolveBody', () => {
  it('fills missing values from the template', () => {
    const r = resolveBody({ template: 'disc' });
    expect(r.upper).toBeGreaterThan(0);
    expect(r.lower).toBeGreaterThan(0);
    expect(r.maxAt).toBeGreaterThan(0);
    expect(r.maxAt).toBeLessThan(1);
  });

  it('lets explicit values override the template', () => {
    expect(resolveBody({ template: 'disc', upper: 0.11 }).upper).toBe(0.11);
  });
});

describe('makeBody', () => {
  it('has zero height at the nose', () => {
    const b = makeBody(shape, 0, 0);
    expect(b.halfHeight(0, -1)).toBeCloseTo(0, 6);
    expect(b.halfHeight(0, 1)).toBeCloseTo(0, 6);
  });

  it('is deepest at maxAt and matches the profile there', () => {
    const b = makeBody(shape, 0, 0);
    expect(b.halfHeight(0.4, -1)).toBeCloseTo(0.2, 6);
    expect(b.halfHeight(0.4, 1)).toBeCloseTo(0.18, 6);
    for (const u of [0.1, 0.3, 0.5, 0.8]) {
      expect(b.halfHeight(u, -1)).toBeLessThanOrEqual(0.2 + 1e-9);
    }
  });

  it('narrows to the peduncle height at the tail base', () => {
    const b = makeBody(shape, 0, 0);
    expect(b.halfHeight(1, -1)).toBeCloseTo(0.2 * 0.4, 6);
  });

  it('places the nose at +0.5 and the tail base at -0.5 when straight', () => {
    const b = makeBody(shape, 0, 0);
    expect(b.spine(0)).toEqual({ x: 0.5, y: 0 });
    expect(b.spine(1).x).toBeCloseTo(-0.5, 9);
  });

  it('maps (u, v) onto the body edges when straight', () => {
    const b = makeBody(shape, 0, 0);
    const top = b.point(0.4, -1);
    const bottom = b.point(0.4, 1);
    expect(top.y).toBeCloseTo(-0.2, 6);
    expect(bottom.y).toBeCloseTo(0.18, 6);
    expect(top.x).toBeCloseTo(0.1, 6);
  });

  it('never bends at the head, whatever the swim phase', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      const b = makeBody(shape, phase, 0.05);
      expect(b.spine(0).y).toBeCloseTo(0, 9);
    }
  });

  it('bends at the tail when flexing', () => {
    const b = makeBody(shape, Math.PI / 2, 0.05);
    expect(Math.abs(b.spine(1).y)).toBeGreaterThan(0.01);
  });

  it('produces a closed outline that starts and ends at the nose', () => {
    const b = makeBody(shape, 1.3, 0.04);
    const o = b.outline(32);
    expect(o.length).toBeGreaterThan(60);
    const first = o[0]!;
    const last = o[o.length - 1]!;
    expect(first.x).toBeCloseTo(last.x, 6);
    expect(first.y).toBeCloseTo(last.y, 6);
  });
});

describe('turning (yaw)', () => {
  it('a full turn mirrors the fish', () => {
    const b = makeBody(shape, 0, 0, { head: Math.PI, tail: Math.PI });
    expect(b.spine(0).x).toBeCloseTo(-0.5, 9);
    expect(b.spine(1).x).toBeCloseTo(0.5, 9);
    // Heights don't change when turning.
    expect(b.point(0.4, -1).y).toBeCloseTo(-0.2, 6);
  });

  it('mid-turn, the head has swung round before the tail', () => {
    const b = makeBody(shape, 0, 0, { head: Math.PI * 0.75, tail: Math.PI * 0.25 });
    // Head is pointing back the other way: it sits behind the body's middle...
    expect(b.tangent(0).x).toBeGreaterThan(0);
    // ...while the tail still points the original way.
    expect(b.tangent(1).x).toBeLessThan(0);
  });

  it('keeps the middle of the body in place while turning', () => {
    for (const head of [0, 0.5, 1.5, 3]) {
      const b = makeBody(shape, 0, 0, { head, tail: head * 0.4 });
      expect(b.spine(0.5).x).toBeCloseTo(0, 9);
    }
  });

  it('winds every body segment the same way, even when folded', () => {
    const b = makeBody(shape, 0, 0, { head: Math.PI * 0.9, tail: Math.PI * 0.1 });
    for (const q of b.segments(24)) {
      let area = 0;
      for (let j = 0; j < 4; j++) {
        const a = q[j]!;
        const c = q[(j + 1) % 4]!;
        area += a.x * c.y - c.x * a.y;
      }
      expect(area).toBeGreaterThanOrEqual(0);
    }
  });
});
