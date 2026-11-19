import type { MomentDef } from '../data/moments';
import { clamp, lerp, smoothstep, type Vec } from '../util/math';
import type { FishAgent, TankEnv } from './fishAgent';

/** Something for the scene to draw at a point in a moment, e.g. a cloud of eggs. */
export interface MomentEffect {
  kind: 'eggs' | 'gulp';
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

const centroid = (fish: readonly FishAgent[]): Vec => ({
  x: fish.reduce((s, f) => s + f.pos.x, 0) / fish.length,
  y: fish.reduce((s, f) => s + f.pos.y, 0) / fish.length,
});

/** Clownfish settle low into the anemone and weave among its tentacles. */
const shelter: ScriptFactory = (actors, env) => {
  const home = env.home ?? centroid(actors);
  return {
    duration: 30,
    step(t) {
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
    focus: () => ({ x: home.x, y: home.y + 20 }),
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

/** Each moment's script, by moment id (data/moments.ts). */
export const MOMENT_SCRIPTS: Record<string, ScriptFactory> = {
  'clownfish-shelter': shelter,
  'mandarin-courtship': courtship,
  'lanternfish-rise': eveningRise,
  'corydoras-air': gulp,
};

/** The animals a moment needs, from those in the tank, or null if there aren't enough. */
export function momentActors(def: MomentDef, agents: readonly FishAgent[], rng: () => number): FishAgent[] | null {
  const own = agents.filter((a) => a.species.id === def.speciesId);
  if (own.length < def.minCount) return null;
  switch (def.id) {
    case 'mandarin-courtship':
      return own.slice(0, 2);
    case 'corydoras-air':
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
