import { describe, expect, it } from 'vitest';
import { speciesIn } from '../../src/data/species';
import { Camera, CLOSEUP_ZOOM } from '../../src/render/scene/camera';
import { Closeups } from '../../src/render/scene/closeups';
import { Tank } from '../../src/sim/tank';
import { createRng } from '../../src/util/rng';

const env = { bounds: { left: 60, right: 1860, top: 90, bottom: 875 }, home: { x: 1150, y: 830 } };

function run(c: Closeups, tank: Tank, cam: Camera, seconds: number, allowed = true): number {
  let maxZoom = 0;
  for (let i = 0; i < seconds * 60; i++) {
    tank.update(1 / 60);
    c.update(1 / 60, tank.agents, cam, allowed);
    cam.update(i / 60);
    maxZoom = Math.max(maxZoom, cam.zoom);
  }
  return maxZoom;
}

describe('close-ups', () => {
  it('zoom in, follow, and zoom back out', () => {
    const tank = new Tank(env, speciesIn('reef'), 3);
    const cam = new Camera();
    const c = new Closeups(createRng(1));
    expect(c.start(tank.agents)).toBe(true);
    expect(run(c, tank, cam, 8)).toBeCloseTo(CLOSEUP_ZOOM, 1);
    run(c, tank, cam, 40);
    expect(c.active).toBe(false);
    expect(cam.closeup).toBe(0);
  });

  it('never start while not allowed', () => {
    const tank = new Tank(env, speciesIn('reef'), 3);
    const cam = new Camera();
    const c = new Closeups(createRng(1));
    run(c, tank, cam, 400, false);
    expect(c.active).toBe(false);
  });

  it('start on their own when allowed', () => {
    const tank = new Tank(env, speciesIn('reef'), 3);
    const cam = new Camera();
    const c = new Closeups(createRng(1));
    let seen = false;
    for (let i = 0; i < 400 * 60 && !seen; i++) {
      c.update(1 / 60, tank.agents, cam, true);
      seen = c.active;
    }
    expect(seen).toBe(true);
  });

  it('back out smoothly when stopped', () => {
    const tank = new Tank(env, speciesIn('reef'), 3);
    const cam = new Camera();
    const c = new Closeups(createRng(1));
    c.start(tank.agents);
    run(c, tank, cam, 8);
    const before = cam.closeup;
    c.update(1 / 60, tank.agents, cam, false);
    expect(Math.abs(cam.closeup - before)).toBeLessThan(0.05);
    run(c, tank, cam, 6, false);
    expect(c.active).toBe(false);
  });

  it('keep the view inside the tank', () => {
    const cam = new Camera();
    cam.closeup = 1;
    cam.focus = { x: 0, y: 1080 };
    cam.update(0);
    const tl = cam.toWorld(0, 0);
    const br = cam.toWorld(1920, 1080);
    expect(tl.x).toBeGreaterThanOrEqual(-0.01);
    expect(br.y).toBeLessThanOrEqual(1080.01);
  });
});
