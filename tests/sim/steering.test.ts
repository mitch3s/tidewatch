import { describe, expect, it } from 'vitest';
import { alignment, arrive, cohesion, containment, limit, separation, seek } from '../../src/sim/steering';

const len = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

describe('steering', () => {
  it('seek accelerates toward the target', () => {
    const f = seek({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 50);
    expect(f.x).toBeCloseTo(50);
    expect(f.y).toBeCloseTo(0);
  });

  it('seek corrects the current velocity', () => {
    const f = seek({ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, 50);
    expect(len(f)).toBeCloseTo(0);
  });

  it('arrive slows down near the target', () => {
    const far = arrive({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 500, y: 0 }, 50, 100);
    const near = arrive({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 20, y: 0 }, 50, 100);
    expect(far.x).toBeCloseTo(50);
    expect(near.x).toBeCloseTo(10);
  });

  it('separation pushes away from close neighbours only', () => {
    const f = separation({ x: 0, y: 0 }, [{ x: 10, y: 0 }, { x: 500, y: 0 }], 50);
    expect(f.x).toBeLessThan(0);
    expect(f.y).toBeCloseTo(0);
    expect(len(separation({ x: 0, y: 0 }, [{ x: 500, y: 0 }], 50))).toBe(0);
  });

  it('cohesion pulls toward the centre of the neighbours', () => {
    const f = cohesion({ x: 0, y: 0 }, [{ x: 10, y: 10 }, { x: 30, y: -10 }]);
    expect(f).toEqual({ x: 20, y: 0 });
    expect(cohesion({ x: 0, y: 0 }, [])).toEqual({ x: 0, y: 0 });
  });

  it('alignment matches the average neighbour velocity', () => {
    const f = alignment({ x: 0, y: 0 }, [{ x: 10, y: 0 }, { x: 30, y: 0 }]);
    expect(f).toEqual({ x: 20, y: 0 });
  });

  it('containment is zero well inside and points inward near the edges', () => {
    const b = { left: 0, top: 0, right: 1000, bottom: 500 };
    expect(len(containment({ x: 500, y: 250 }, b, 100))).toBe(0);
    expect(containment({ x: 20, y: 250 }, b, 100).x).toBeGreaterThan(0);
    expect(containment({ x: 990, y: 250 }, b, 100).x).toBeLessThan(0);
    expect(containment({ x: 500, y: 480 }, b, 100).y).toBeLessThan(0);
    // Pushes harder the closer it gets.
    expect(containment({ x: 10, y: 250 }, b, 100).x).toBeGreaterThan(containment({ x: 60, y: 250 }, b, 100).x);
  });

  it('limit caps the length and keeps the direction', () => {
    const v = limit({ x: 30, y: 40 }, 10);
    expect(v.x).toBeCloseTo(6);
    expect(v.y).toBeCloseTo(8);
    expect(limit({ x: 1, y: 1 }, 10)).toEqual({ x: 1, y: 1 });
  });
});
