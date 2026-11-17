import { describe, expect, it } from 'vitest';
import { PerfGuard } from '../../src/render/perf';

describe('PerfGuard', () => {
  it('stays at 60 fps while frames are fast', () => {
    const g = new PerfGuard();
    for (let i = 0; i < 600; i++) g.sample(10);
    expect(g.targetFps).toBe(60);
  });

  it('drops to 30 fps after sustained slow frames', () => {
    const g = new PerfGuard();
    for (let i = 0; i < 300; i++) g.sample(28);
    expect(g.targetFps).toBe(30);
  });

  it('ignores a short hitch', () => {
    const g = new PerfGuard();
    for (let i = 0; i < 300; i++) g.sample(i % 100 < 5 ? 80 : 10);
    expect(g.targetFps).toBe(60);
  });

  it('can be forced (god mode)', () => {
    const g = new PerfGuard();
    g.force(30);
    for (let i = 0; i < 600; i++) g.sample(5);
    expect(g.targetFps).toBe(30);
    g.force(null);
    expect(g.targetFps).toBe(60);
  });
});
