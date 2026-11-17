import { describe, expect, it } from 'vitest';
import { IdleTracker } from '../../src/input/idle';

describe('IdleTracker', () => {
  it('starts active and goes idle after the timeout', () => {
    const t = new IdleTracker(10_000, 0);
    expect(t.isIdle).toBe(false);
    t.tick(9_999);
    expect(t.isIdle).toBe(false);
    t.tick(10_000);
    expect(t.isIdle).toBe(true);
  });

  it('input resets the timer', () => {
    const t = new IdleTracker(10_000, 0);
    t.tick(8_000);
    expect(t.handle('left', 8_000)).toBe('pass');
    t.tick(17_000);
    expect(t.isIdle).toBe(false);
    t.tick(18_000);
    expect(t.isIdle).toBe(true);
  });

  it('swallows the first input while idle, then passes the next', () => {
    const t = new IdleTracker(10_000, 0);
    t.tick(10_000);
    expect(t.handle('left', 10_500)).toBe('swallow');
    expect(t.isIdle).toBe(false);
    expect(t.handle('left', 10_600)).toBe('pass');
  });

  it('never swallows select while a rare visitor is present', () => {
    const t = new IdleTracker(10_000, 0);
    t.tick(10_000);
    expect(t.handle('select', 10_500, { visitorPresent: true })).toBe('pass');
    expect(t.isIdle).toBe(false);
  });

  it('still swallows other keys while a visitor is present', () => {
    const t = new IdleTracker(10_000, 0);
    t.tick(10_000);
    expect(t.handle('up', 10_500, { visitorPresent: true })).toBe('swallow');
  });

  it('notifies listeners on state changes only', () => {
    const t = new IdleTracker(10_000, 0);
    const events: boolean[] = [];
    t.onChange((idle) => events.push(idle));
    t.tick(5_000);
    t.tick(10_000);
    t.tick(11_000);
    t.handle('down', 12_000);
    t.handle('down', 12_100);
    expect(events).toEqual([true, false]);
  });

  it('pointer activity wakes without being an action', () => {
    const t = new IdleTracker(10_000, 0);
    t.tick(10_000);
    t.poke(10_200);
    expect(t.isIdle).toBe(false);
  });
});
