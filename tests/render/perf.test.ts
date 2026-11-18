import { describe, expect, it } from 'vitest';
import { PerfGuard } from '../../src/render/perf';

/** Feed `ms`-long frames for `seconds`. */
const feed = (g: PerfGuard, ms: number, seconds: number) => {
  for (let t = 0; t < seconds * 1000; t += ms) g.sample(ms);
};

/** Feed `ms`-long frames until the target becomes `fps`; returns the seconds it took. */
const until = (g: PerfGuard, ms: number, fps: 60 | 30, maxSeconds = 1000) => {
  let t = 0;
  while (g.targetFps !== fps && t < maxSeconds * 1000) {
    g.sample(ms);
    t += ms;
  }
  return t / 1000;
};

describe('PerfGuard', () => {
  it('stays at 60 fps while frames are fast', () => {
    const g = new PerfGuard();
    feed(g, 10, 30);
    expect(g.targetFps).toBe(60);
  });

  it('drops to 30 fps after sustained slow frames', () => {
    const g = new PerfGuard();
    feed(g, 28, 15);
    expect(g.targetFps).toBe(30);
  });

  it('ignores a short hitch', () => {
    const g = new PerfGuard();
    feed(g, 10, 6);
    for (let i = 0; i < 600; i++) g.sample(i % 100 < 5 ? 80 : 10);
    expect(g.targetFps).toBe(60);
  });

  it('ignores a slow startup (backgrounds and sprites being prepared)', () => {
    const g = new PerfGuard();
    feed(g, 80, 4.5); // the first seconds are slow...
    feed(g, 12, 20); // ...then it runs fine
    expect(g.targetFps).toBe(60);
  });

  it('ignores the gap while the app was hidden', () => {
    const g = new PerfGuard();
    feed(g, 10, 6);
    for (let i = 0; i < 5; i++) g.sample(60_000);
    feed(g, 10, 5);
    expect(g.targetFps).toBe(60);
  });

  it('tries 60 fps again after a minute at 30, and keeps it if it holds', () => {
    const g = new PerfGuard();
    feed(g, 10, 6);
    until(g, 28, 30);
    expect(until(g, 33, 60)).toBeCloseTo(60, 0);
    feed(g, 12, 10);
    expect(g.targetFps).toBe(60);
  });

  it('goes back to 30 if the retry is still slow, and waits longer each time', () => {
    const g = new PerfGuard();
    feed(g, 10, 6);
    until(g, 28, 30);
    expect(until(g, 33, 60)).toBeCloseTo(60, 0);
    expect(until(g, 28, 30)).toBeLessThan(3); // the try is judged within a couple of seconds
    expect(until(g, 33, 60)).toBeCloseTo(120, 0);
    until(g, 28, 30);
    expect(until(g, 33, 60)).toBeCloseTo(240, 0);
  });

  it('never waits more than 10 minutes between tries', () => {
    const g = new PerfGuard();
    feed(g, 10, 6);
    until(g, 28, 30);
    for (let i = 0; i < 6; i++) {
      until(g, 33, 60);
      until(g, 28, 30);
    }
    expect(until(g, 33, 60)).toBeCloseTo(600, 0);
  });

  it('can be forced (god mode)', () => {
    const g = new PerfGuard();
    g.force(30);
    feed(g, 5, 10);
    expect(g.targetFps).toBe(30);
    g.force(null);
    expect(g.targetFps).toBe(60);
  });
});
