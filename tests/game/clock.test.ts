import { describe, expect, it } from 'vitest';
import { RuntimeClock } from '../../src/game/clock';

describe('RuntimeClock', () => {
  it('passes real time through at 1x', () => {
    const c = new RuntimeClock();
    expect(c.advance(1000)).toBe(1000);
  });

  it('scales time', () => {
    const c = new RuntimeClock();
    c.timescale = 600;
    expect(c.advance(1000)).toBe(600_000);
  });

  it('stops while hidden or paused', () => {
    const c = new RuntimeClock();
    c.visible = false;
    expect(c.advance(1000)).toBe(0);
    c.visible = true;
    c.paused = true;
    expect(c.advance(1000)).toBe(0);
  });

  it('ignores huge gaps (e.g. the TV was asleep)', () => {
    const c = new RuntimeClock();
    expect(c.advance(60 * 60_000)).toBe(5000);
  });
});
