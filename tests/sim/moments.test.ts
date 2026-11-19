import { describe, expect, it } from 'vitest';
import { MOMENTS } from '../../src/data/moments';
import { getSpecies } from '../../src/data/species';
import { MOMENT_SCRIPTS, momentActors, type MomentEffect, startMoment } from '../../src/sim/moments';
import { Tank } from '../../src/sim/tank';
import { createRng } from '../../src/util/rng';

const env = { bounds: { left: 60, right: 1860, top: 90, bottom: 900 }, home: { x: 960, y: 760 } };

/** A tank with just this species, and the moment run to the end (or a time limit). */
function play(id: string, limitS = 90) {
  const def = MOMENTS.find((m) => m.id === id)!;
  const tank = new Tank(env, [getSpecies(def.speciesId)!], 7);
  const rng = createRng(3);
  const actors = momentActors(def, tank.agents, rng)!;
  const run = startMoment(def, actors, tank.env, rng);
  const fx: MomentEffect[] = [];
  const track: Array<{ t: number; ys: number[] }> = [];
  for (let t = 0; t < limitS && !run.done; t += 1 / 30) {
    fx.push(...run.update(1 / 30));
    tank.update(1 / 30);
    track.push({ t: run.t, ys: actors.map((a) => a.pos.y) });
  }
  return { def, run, actors, fx, track, tank };
}

describe('moment scripts', () => {
  it('every moment has a script', () => {
    for (const m of MOMENTS) expect(MOMENT_SCRIPTS[m.id]).toBeTypeOf('function');
  });

  it.each(MOMENTS.map((m) => m.id))('%s ends and gives its animals back', (id) => {
    const { run, actors } = play(id);
    expect(run.done).toBe(true);
    for (const a of actors) expect(a.directive).toBeNull();
  });

  it('the corydoras reaches the surface, gulps, and goes back down', () => {
    const { fx, track, actors } = play('corydoras-air');
    expect(fx.map((f) => f.kind)).toEqual(['gulp']);
    const minY = Math.min(...track.map((s) => s.ys[0]!));
    expect(minY).toBeLessThan(90);
    // Its nose reaches the surface without leaving the water.
    expect(minY).toBeGreaterThan(25);
    expect(actors[0]!.pos.y).toBeGreaterThan(env.bounds.bottom - 100);
    // Up within a few seconds: a dash, not a stroll.
    const up = track.find((s) => s.ys[0]! < 90)!;
    expect(up.t).toBeLessThan(6);
  });

  it('the mandarin pair rises well above the bottom and spawns once', () => {
    const { fx, track } = play('mandarin-courtship');
    expect(fx.filter((f) => f.kind === 'eggs')).toHaveLength(1);
    const top = Math.min(...track.flatMap((s) => s.ys));
    expect(top).toBeLessThan(env.bounds.bottom - 200);
  });

  it('the lanternfish school rises toward the surface together', () => {
    const { track } = play('lanternfish-rise');
    const at = (t: number) => track.find((s) => s.t >= t)!.ys;
    const mean = (ys: number[]) => ys.reduce((a, b) => a + b, 0) / ys.length;
    expect(mean(at(7))).toBeGreaterThan(600);
    expect(mean(at(30))).toBeLessThan(300);
  });

  it('the clownfish settle into the anemone', () => {
    const { track } = play('clownfish-shelter');
    const mid = track.find((s) => s.t >= 18)!.ys;
    for (const y of mid) expect(Math.abs(y - (env.home.y + 32))).toBeLessThan(60);
  });

  it('a pair moment needs two animals', () => {
    const def = MOMENTS.find((m) => m.id === 'mandarin-courtship')!;
    const tank = new Tank(env, [], 1);
    expect(momentActors(def, tank.agents, Math.random)).toBeNull();
  });
});

