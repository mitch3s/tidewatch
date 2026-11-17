import { describe, expect, it } from 'vitest';
import { TankRotation } from '../../src/game/rotation';

const run = (r: TankRotation, seconds: number, ctx: { minutes: number; tanks: number; hold: boolean }) => {
  let switches = 0;
  for (let t = 0; t < seconds; t++) if (r.update(1, ctx)) switches++;
  return switches;
};

describe('TankRotation', () => {
  it('switches every N minutes', () => {
    expect(run(new TankRotation(), 15 * 60 * 3, { minutes: 15, tanks: 2, hold: false })).toBe(3);
  });

  it('never switches when off or with only one tank', () => {
    expect(run(new TankRotation(), 3600, { minutes: 0, tanks: 2, hold: false })).toBe(0);
    expect(run(new TankRotation(), 3600, { minutes: 5, tanks: 1, hold: false })).toBe(0);
  });

  it('waits while held (visitor here, codex open), without losing progress', () => {
    const r = new TankRotation();
    expect(run(r, 4 * 60, { minutes: 5, tanks: 2, hold: false })).toBe(0);
    expect(run(r, 30 * 60, { minutes: 5, tanks: 2, hold: true })).toBe(0);
    expect(run(r, 60, { minutes: 5, tanks: 2, hold: false })).toBe(1);
  });

  it('restarts after a manual switch', () => {
    const r = new TankRotation();
    run(r, 4 * 60, { minutes: 5, tanks: 2, hold: false });
    r.reset();
    expect(run(r, 4 * 60, { minutes: 5, tanks: 2, hold: false })).toBe(0);
  });
});
