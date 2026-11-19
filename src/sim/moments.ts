import type { MomentDef } from '../data/moments';
import { clamp, lerp, smoothstep, type Vec } from '../util/math';
import type { FishAgent, TankEnv } from './fishAgent';

/**
 * Something for the scene to draw at a point in a moment: a cloud of eggs,
 * a ripple where a fish gulps air, a splash, or one cluster of coral spawn.
 */
export interface MomentEffect {
  kind: 'eggs' | 'gulp' | 'splash' | 'cluster';
  x: number;
  y: number;
}

/** A moment playing in a tank: steers its animals until it's over (spec v1.4 §3). */
export interface MomentRun {
  readonly def: MomentDef;
  readonly actors: readonly FishAgent[];
  /** Seconds since it started. */
  readonly t: number;
  readonly done: boolean;
  /** Where the camera should look. */
  focus(): Vec;
  /** Advance; returns effects to draw from this step. */
  update(dt: number): MomentEffect[];
  /** Hand the animals back to their usual behaviour (also on abort). */
  release(): void;
}

interface Script {
  duration: number;
  step(t: number, dt: number, fx: MomentEffect[]): boolean | void;
  focus(): Vec;
}

type ScriptFactory = (actors: FishAgent[], env: TankEnv, rng: () => number) => Script;

/** A scenery point where it shows on screen, in fish coordinates (see TankEnv.fromScenery). */
const onScenery = (env: TankEnv, p: Vec): Vec => env.fromScenery?.(p) ?? p;

const centroid = (fish: readonly FishAgent[]): Vec => ({
  x: fish.reduce((s, f) => s + f.pos.x, 0) / fish.length,
  y: fish.reduce((s, f) => s + f.pos.y, 0) / fish.length,
});

/** Clownfish settle low into the anemone and weave among its tentacles. */
const shelter: ScriptFactory = (actors, env) => {
  const anemone = env.home ?? centroid(actors);
  let home = onScenery(env, anemone);
  return {
    duration: 30,
    step(t) {
      home = onScenery(env, anemone);
      actors.forEach((f, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const settle = smoothstep(clamp(t / 5, 0, 1));
        f.directive = {
          target: {
            x: home.x + side * 38 + 26 * Math.sin(t * 1.2 + i * 2.1),
            y: home.y + lerp(-30, 32, settle) + 8 * Math.sin(t * 0.8 + i),
          },
          pace: 0.55,
        };
      });
    },
    // The camera follows the scenery itself (converting it would chase its own tail).
    focus: () => ({ x: anemone.x, y: anemone.y + 20 }),
  };
};

/** A mandarin pair meets on the bottom, rises side by side, spawns at the top, and darts back down. */
const courtship: ScriptFactory = (actors, env) => {
  const b = env.bounds;
  const floor = b.bottom;
  const meet = clamp(centroid(actors).x, b.left + 320, b.right - 320);
  const apex = floor - 290;
  let spawned = false;
  return {
    duration: 40,
    step(t, _dt, fx) {
      actors.forEach((f, i) => {
        const side = i === 0 ? -1 : 1;
        if (t < 12) {
          f.directive = { target: { x: meet + side * 45, y: floor }, pace: 1 };
        } else if (t < 30) {
          const up = smoothstep((t - 12) / 16);
          f.directive = { target: { x: meet + side * (26 + 6 * Math.sin(t * 2)), y: lerp(floor, apex, up) }, pace: 2.2, steep: true };
        } else {
          f.directive = { target: { x: meet + side * 170, y: floor }, pace: 2.5, steep: true };
        }
      });
      if (!spawned && t >= 30) {
        spawned = true;
        // Released where the pair is, just above them.
        const c = centroid(actors);
        fx.push({ kind: 'eggs', x: c.x, y: c.y - 20 });
      }
    },
    focus: () => centroid(actors),
  };
};

/** The lanternfish school gathers low down, then rises together toward the surface. */
const eveningRise: ScriptFactory = (actors, env, rng) => {
  const b = env.bounds;
  const cx = clamp(centroid(actors).x, b.left + 440, b.right - 440);
  const low = b.bottom - 110;
  const high = b.top + 40;
  const spots = actors.map(() => ({ x: lerp(-130, 130, rng()), y: lerp(-60, 60, rng()), lag: rng() * 1.5 }));
  return {
    duration: 36,
    step(t) {
      actors.forEach((f, i) => {
        const s = spots[i]!;
        const up = smoothstep(clamp((t - 8 - s.lag) / 16, 0, 1));
        const y = lerp(low + s.y * 0.6, high + Math.abs(s.y) * 0.8, up);
        f.directive = { target: { x: cx + s.x + 40 * Math.sin(t * 0.45), y }, pace: t < 8 ? 1.2 : 1.3, steep: true };
      });
    },
    focus: () => centroid(actors),
  };
};

/** One corydoras darts up to the surface, gulps air, and sinks back down. */
const gulp: ScriptFactory = (actors, env) => {
  const f = actors[0]!;
  const b = env.bounds;
  const surface = 52;
  const x0 = clamp(f.pos.x + f.facing * 80, b.left + 120, b.right - 120);
  let gulpedAt: number | null = null;
  return {
    duration: 24,
    step(t, _dt, fx) {
      if (t < 1.2) {
        // A moment's stillness, then up it goes.
        f.directive = { target: { x: f.pos.x + f.facing * 4, y: f.pos.y }, pace: 0.2 };
        return;
      }
      if (gulpedAt === null) {
        f.directive = { target: { x: x0, y: surface + 4 }, pace: 7, steep: true, top: surface };
        if (f.pos.y < surface + 60) {
          gulpedAt = t;
          fx.push({ kind: 'gulp', x: f.pos.x + f.facing * f.length * 0.35, y: surface - 6 });
        }
        return;
      }
      f.directive = { target: { x: x0 + f.facing * 140, y: b.bottom }, pace: 2.4, steep: true };
      // Over once it's back near the bottom.
      return t - gulpedAt > 3 && f.pos.y > b.bottom - 90;
    },
    focus: () => f.pos,
  };
};

/** Stay put, drifting gently (the deep sea's slow animals during a display). */
const hold = (from: Vec, t: number): Vec => ({ x: from.x + 14 * Math.sin(t * 0.3), y: from.y + 8 * Math.sin(t * 0.23) });

/** The Atolla jellyfish's alarm: its ring of lights flashes fast and bright. */
const alarm: ScriptFactory = (actors) => {
  const f = actors[0]!;
  const from = { ...f.pos };
  return {
    duration: 22,
    step(t) {
      // A few seconds of calm, then bursts of flashing, then calm again.
      const on = t > 2 && t < 15;
      const burst = Math.sin(t * 2.4) > -0.3 ? 1 : 0.35;
      f.directive = { target: hold(from, t), pace: 0.4, show: { glow: on ? burst : 0 } };
    },
    focus: () => f.pos,
  };
};

/** The vampire squid turns its cloak up over its body, inside out, and holds it. */
const pineapple: ScriptFactory = (actors) => {
  const f = actors[0]!;
  const from = { ...f.pos };
  return {
    duration: 24,
    step(t) {
      f.directive = { target: hold(from, t), pace: 0.4, show: { cloak: t > 2 && t < 16 ? 1 : 0 } };
    },
    focus: () => f.pos,
  };
};

/** The arowana cruises just under the surface, then leaps clean out of the water and dives back in. */
const leap: ScriptFactory = (actors, env) => {
  const f = actors[0]!;
  const b = env.bounds;
  const surface = 44;
  const LEAP_S = 1.6;
  const SPAN = 380;
  const HEIGHT = 240;
  let start: { t: number; x: number; y: number; dir: number } | null = null;
  let splashed = 0;
  return {
    duration: 18,
    step(t, _dt, fx) {
      if (!start) {
        const dir = f.facing;
        // Room ahead for the leap and the dive.
        const aheadX = clamp(f.pos.x + dir * 300, b.left + 200, b.right - 200);
        f.directive = { target: { x: aheadX, y: 72 }, pace: 1.6, steep: true, top: 60 };
        const room = dir > 0 ? b.right - f.pos.x : f.pos.x - b.left;
        if (t > 4 && f.pos.y < 110 && room > SPAN + 200) start = { t, x: f.pos.x, y: f.pos.y, dir };
        else if (t > 9) start = { t, x: f.pos.x, y: f.pos.y, dir: room > SPAN + 200 ? dir : -dir };
        return;
      }
      const u = (t - start.t) / LEAP_S;
      if (u <= 1) {
        // A ballistic arc: out of the top of the picture and back.
        const x = start.x + start.dir * SPAN * u;
        const y = start.y - HEIGHT * 4 * u * (1 - u);
        f.directive = { target: { x, y }, pace: 1, pos: { x, y } };
        if (splashed === 0 && y < surface) {
          splashed = 1;
          fx.push({ kind: 'splash', x, y: surface });
        }
        if (splashed === 1 && u > 0.6 && y > surface) {
          splashed = 2;
          fx.push({ kind: 'splash', x, y: surface });
        }
        return;
      }
      if (splashed === 1) {
        splashed = 2;
        fx.push({ kind: 'splash', x: f.pos.x, y: surface });
      }
      // Dive back down a little, then carry on.
      f.directive = { target: { x: start.x + start.dir * (SPAN + 260), y: 200 }, pace: 1.8, steep: true };
      return t - start.t > LEAP_S + 3;
    },
    focus: () => ({ x: f.pos.x, y: Math.max(f.pos.y, 220) }),
  };
};

/** The royal gramma swims under a ledge, rolls over, and hangs there upside down. */
const upsideDown: ScriptFactory = (actors, env) => {
  const f = actors[0]!;
  const plate = env.ledge ?? { x: f.pos.x, y: f.pos.y };
  let ledge = onScenery(env, plate);
  const HOLD_S = 16;
  let under: number | null = null;
  return {
    duration: 45,
    step(t) {
      ledge = onScenery(env, plate);
      if (under === null) {
        f.directive = { target: { x: ledge.x, y: ledge.y }, pace: 2.4 };
        // Rolls over once it's there (or soon, whatever happens).
        if (Math.hypot(f.pos.x - ledge.x, f.pos.y - ledge.y) < 36 || t > 15) under = t;
        return;
      }
      const held = t - under;
      if (held < HOLD_S) {
        // Belly to the rock above: upside down, nosing along under the plate.
        f.directive = { target: { x: ledge.x + 24 * Math.sin(held * 0.35), y: ledge.y }, pace: 0.45, show: { roll: 1 } };
        return;
      }
      f.directive = { target: { x: ledge.x - 240, y: ledge.y + 140 }, pace: 1 };
      return held > HOLD_S + 4;
    },
    focus: () => plate,
  };
};

/** The neon tetras gather low among the plants and come to rest, their stripes fading to grey. */
const settle: ScriptFactory = (actors, env, rng) => {
  const b = env.bounds;
  const cx = clamp(centroid(actors).x, b.left + 400, b.right - 400);
  const low = b.bottom - 150;
  const spots = actors.map(() => ({ x: lerp(-170, 170, rng()), y: lerp(-50, 50, rng()) }));
  return {
    duration: 40,
    step(t) {
      actors.forEach((f, i) => {
        const s = spots[i]!;
        const settled = t > 8;
        f.directive = {
          target: { x: cx + s.x + (settled ? 6 * Math.sin(t * 0.4 + i) : 0), y: low + s.y },
          pace: settled ? 0.25 : 0.9,
          show: { fade: t > 6 ? 1 : 0 },
        };
      });
    },
    focus: () => centroid(actors),
  };
};

/** Coral spawning: clusters of eggs and sperm rise from corals all over the reef, filmed wide. */
const spawning: ScriptFactory = (_actors, env, rng) => {
  const b = env.bounds;
  const sites = env.corals?.length ? env.corals : [{ x: b.left + 200, y: b.bottom - 100 }, { x: b.right - 200, y: b.bottom - 150 }];
  const RATE = 12;
  const RELEASE_S = 36;
  let due = 0;
  return {
    duration: 70,
    step(t, dt, fx) {
      if (t > RELEASE_S) return;
      // Slowly at first, then the whole reef at once.
      due += dt * RATE * smoothstep(clamp(t / 10, 0, 1));
      while (due >= 1) {
        due -= 1;
        const site = onScenery(env, sites[Math.floor(rng() * sites.length)]!);
        fx.push({ kind: 'cluster', x: site.x + lerp(-70, 70, rng()), y: site.y + lerp(-15, 25, rng()) });
      }
    },
    focus: () => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 }),
  };
};

/** Each moment's script, by moment id (data/moments.ts). */
export const MOMENT_SCRIPTS: Record<string, ScriptFactory> = {
  'clownfish-shelter': shelter,
  'mandarin-courtship': courtship,
  'lanternfish-rise': eveningRise,
  'corydoras-air': gulp,
  'atolla-alarm': alarm,
  'vampire-pineapple': pineapple,
  'arowana-leap': leap,
  'gramma-ledge': upsideDown,
  'neon-night': settle,
  'coral-spawning': spawning,
};

/** The animals a moment needs, from those in the tank, or null if there aren't enough. */
export function momentActors(def: MomentDef, agents: readonly FishAgent[], rng: () => number): FishAgent[] | null {
  // A whole-tank moment needs no animals.
  if (def.speciesId === null) return [];
  const own = agents.filter((a) => a.species.id === def.speciesId);
  if (own.length < Math.max(1, def.minCount)) return null;
  switch (def.id) {
    case 'mandarin-courtship':
      return own.slice(0, 2);
    case 'corydoras-air':
    case 'atolla-alarm':
    case 'vampire-pineapple':
    case 'arowana-leap':
    case 'gramma-ledge':
      return [own[Math.floor(rng() * own.length)]!];
    default:
      return own;
  }
}

/** Start a moment with these animals. */
export function startMoment(def: MomentDef, actors: FishAgent[], env: TankEnv, rng: () => number): MomentRun {
  const factory = MOMENT_SCRIPTS[def.id];
  if (!factory) throw new Error(`No script for moment ${def.id}`);
  const script = factory(actors, env, rng);
  let t = 0;
  let done = false;
  const release = () => {
    for (const a of actors) a.directive = null;
  };
  return {
    def,
    actors,
    get t() {
      return t;
    },
    get done() {
      return done;
    },
    focus: () => script.focus(),
    update(dt) {
      const fx: MomentEffect[] = [];
      if (done) return fx;
      t += dt;
      const finished = script.step(t, dt, fx) === true;
      if (finished || t >= script.duration) {
        done = true;
        release();
      }
      return fx;
    },
    release,
  };
}
