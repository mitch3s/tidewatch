import type { Species } from '../data/types';
import type { FishPose } from '../render/fish/renderFish';
import { clamp, lerp, TAU, type Vec } from '../util/math';
import type { Flake } from './food';
import { alignment, arrive, type Bounds, cohesion, containment, limit, separation } from './steering';

/** What's happening in the tank this step, beyond the other fish. */
export interface TankMood {
  /** Food in the water. */
  food: readonly Flake[];
  /** 1 = daytime activity, lower = resting at night (spec v1.2 §3). */
  activity: number;
  /** How far into the night it is, 0..1, for species that migrate up at night. */
  night?: number;
}

const CALM: TankMood = { food: [], activity: 1 };

/** Everything a fish knows about its surroundings. */
export interface TankEnv {
  /** Where fish may swim (fish centres). */
  bounds: Bounds;
  /** A home point for species that stay close to one spot (the anemone). */
  home?: Vec;
}

/** Shared state for a school of one species. */
export interface School {
  target: Vec;
  retarget: number;
  /** Number of fish sharing this school (each one counts the timer down). */
  size: number;
}

/**
 * One fish: steering, turning, and the animation values the renderer needs.
 * Positions are in world (tank) coordinates, velocities in px/s.
 */
export class FishAgent {
  readonly length: number;
  /** Depth: 0.7 (far) .. 1.1 (near). Scales size and sets draw order. */
  readonly z: number;
  pos: Vec;
  vel: Vec;
  facing: 1 | -1;
  /** Turn progress 0..1, or null when not turning. */
  turn: number | null = null;
  school: School | null = null;

  private readonly cruise: number;
  private readonly turnSeconds: number;
  private target: Vec;
  private retarget = 0;
  private pause = 0;
  private burst = 0;
  private turnCooldown = 0;
  private glide = 0;
  private phase: number;
  private finPhase: number;
  private pitch = 0;
  private prev: FishPose;
  private cur: FishPose;
  /** How much it's resting for the night, 0..1. */
  private rest = 0;
  /** How far into the night it is (for migrating species), 0..1. */
  private night = 0;
  /** The flake it's going for, if any. */
  private meal: Flake | null = null;

  constructor(
    readonly species: Species,
    env: TankEnv,
    private readonly rng: () => number,
    /** Start somewhere specific (e.g. swimming in from off-screen) instead of at random. */
    spawn?: { x: number; y: number; facing: 1 | -1 },
  ) {
    this.z = lerp(0.7, 1.1, rng());
    this.length = species.displayLength * this.z;
    const [lo, hi] = species.look.swim.speed;
    this.cruise = lerp(lo, hi, rng()) * this.length;
    this.turnSeconds = 0.75 + this.length / 300;
    const band = this.depthBand(env.bounds);
    this.pos = { x: lerp(env.bounds.left + 100, env.bounds.right - 100, rng()), y: lerp(band[0], band[1], rng()) };
    if (species.look.swim.behaviour === 'hover' && env.home) {
      this.pos = { x: env.home.x + lerp(-150, 150, rng()), y: env.home.y + lerp(-80, 40, rng()) };
    }
    this.facing = rng() < 0.5 ? 1 : -1;
    if (spawn) {
      this.pos = { x: spawn.x, y: spawn.y };
      this.facing = spawn.facing;
    }
    this.vel = { x: this.facing * this.cruise * 0.6, y: 0 };
    this.target = this.pickTarget(env);
    this.retarget = lerp(2, 8, rng());
    if (spawn) {
      // Swim well into the tank before doing anything else.
      const b = env.bounds;
      this.target = { x: spawn.facing > 0 ? lerp(b.left + 300, b.left + 700, rng()) : lerp(b.right - 700, b.right - 300, rng()), y: spawn.y };
      this.retarget = 15;
    }
    this.phase = rng() * TAU;
    this.finPhase = rng() * TAU;
    this.cur = this.pose(0);
    this.prev = this.cur;
  }

  /** Where it's heading (for the god-mode debug overlay). */
  get debugTarget(): Vec {
    return this.target;
  }

  get behaviour() {
    return this.species.look.swim.behaviour;
  }

  /** Whether it's chasing food right now. */
  get feeding(): boolean {
    return this.meal !== null;
  }

  update(dt: number, env: TankEnv, all: readonly FishAgent[], mood: TankMood = CALM): void {
    const rng = this.rng;
    const swim = this.species.look.swim;
    this.turnCooldown = Math.max(0, this.turnCooldown - dt);
    this.burst = Math.max(0, this.burst - dt);
    // Food in the water wakes everyone up.
    this.rest = mood.food.length > 0 ? 0 : 1 - mood.activity;
    this.night = mood.night ?? 0;

    // ---- food: eat what's in reach, then go for the nearest flake
    if (this.meal && this.meal.eaten) this.meal = null;
    if (mood.food.length > 0) {
      const mouth = { x: this.pos.x + this.facing * this.length * 0.45, y: this.pos.y };
      for (const f of mood.food) {
        if (!f.eaten && Math.hypot(f.x - mouth.x, f.y - mouth.y) < Math.max(12, this.length * 0.3) && this.canEat(f, env)) {
          f.eaten = true;
          if (this.meal === f) this.meal = null;
        }
      }
      this.meal = this.nearestFlake(mood.food, env);
    } else this.meal = null;

    // ---- choose where to go
    if (this.meal) {
      this.target = { x: this.meal.x, y: this.meal.y };
      this.pause = 0;
      this.retarget = lerp(1, 3, rng());
    } else if (this.school) {
      this.school.retarget -= dt / this.school.size;
      if (this.school.retarget <= 0) {
        this.school.target = this.pickTarget(env);
        this.school.retarget = lerp(6, 14, rng());
      }
      this.target = this.school.target;
    } else {
      this.retarget -= dt;
      const arrived = Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y) < this.length * 0.8;
      if (this.pause > 0) {
        this.pause -= dt;
      } else if (arrived || this.retarget <= 0) {
        const pauseChance = this.behaviour === 'bottom-dweller' ? 0.55 : this.behaviour === 'hover' || this.behaviour === 'drift' ? 0.35 : 0.05;
        // Resting fish stop more often, and for longer.
        if (arrived && rng() < lerp(pauseChance, Math.max(pauseChance, 0.6), this.rest)) {
          this.pause = lerp(1.5, this.behaviour === 'bottom-dweller' ? 6 : 4, rng()) * (1 + 1.5 * this.rest);
        }
        this.target = this.pickTarget(env);
        this.retarget = lerp(6, 14, rng());
      }
      if (this.behaviour === 'darting' && this.burst <= 0 && rng() < dt * 0.08) this.burst = 0.6;
    }

    // Slower at night; quicker when there's food.
    const pace = this.meal ? 1.5 : lerp(1, 0.45, this.rest);
    const speedNow = this.pause > 0 ? 0 : this.cruise * pace * (this.burst > 0 ? 2.2 : 1);
    const maxSpeed = this.cruise * pace * (this.burst > 0 ? 2.4 : 1.25);
    const maxAcc = maxSpeed * (this.burst > 0 ? 3 : 1.1);

    // ---- steering forces
    let ax = 0;
    let ay = 0;
    const seekF = arrive(this.pos, this.vel, this.target, speedNow, this.length * 2);
    const seekW = this.school && !this.meal ? 0.5 : 1;
    ax += seekF.x * seekW;
    ay += seekF.y * seekW;

    // Food may be outside the usual depth band: then only the tank's walls count.
    const contain = containment(this.pos, this.meal ? env.bounds : this.boundsFor(env), 140);
    ax += contain.x * maxSpeed * 3;
    ay += contain.y * maxSpeed * 3;

    const near: Vec[] = [];
    // Cohesion pulls toward the whole school (so it doesn't split in two);
    // alignment only follows nearby schoolmates.
    const school: Vec[] = [];
    const mates: FishAgent[] = [];
    for (const o of all) {
      if (o === this) continue;
      const d = Math.hypot(o.pos.x - this.pos.x, o.pos.y - this.pos.y);
      if (d < (o.length + this.length) * 0.6) near.push(o.pos);
      if (this.school && o.school === this.school) {
        school.push(o.pos);
        if (d < 260) mates.push(o);
      }
    }
    // Only heading and walls decide whether to turn round; other fish just
    // make it slow down or swerve up or down.
    const turnIntentX = ax;
    const sep = separation(this.pos, near, this.length * 1.2);
    ax += sep.x * maxSpeed * 1;
    ay += sep.y * maxSpeed * 3;

    if (this.school && school.length && !this.meal) {
      const coh = cohesion(this.pos, school);
      ax += coh.x * 0.9;
      ay += coh.y * 0.9;
    }
    if (mates.length) {
      const ali = alignment(this.vel, mates.map((m) => m.vel));
      ax += (ali.x - this.vel.x) * 0.8;
      ay += (ali.y - this.vel.y) * 0.8;
    }

    const acc = limit({ x: ax, y: ay }, maxAcc);

    // ---- move
    if (this.turn === null) {
      this.vel = limit({ x: this.vel.x + acc.x * dt, y: this.vel.y + acc.y * dt }, maxSpeed);
      // Fish mostly swim level.
      this.vel.y = clamp(this.vel.y, -maxSpeed * 0.45, maxSpeed * 0.45);
      // Fish don't swim backwards: they turn round instead.
      if (this.vel.x * this.facing < 0) {
        this.vel.x = 0;
        if (turnIntentX * this.facing < -maxAcc * 0.15 && this.turnCooldown <= 0) {
          this.turn = 0;
          this.glide = Math.max(this.cruise * 0.35, Math.abs(this.vel.x)) * 0.5;
        }
      }
    } else {
      this.turn += dt / this.turnSeconds;
      // Glide forward on momentum, then pick up the new direction.
      this.vel.x = this.facing * this.glide * Math.cos(Math.PI * Math.min(this.turn, 1));
      this.vel.y += acc.y * dt * 0.5;
      this.vel.y *= 1 - Math.min(1, dt * 1.5);
      if (this.turn >= 1) {
        this.turn = null;
        this.facing = this.facing > 0 ? -1 : 1;
        this.vel.x = this.facing * this.glide;
        this.turnCooldown = lerp(1, 2.5, rng());
      }
    }
    this.pos = { x: this.pos.x + this.vel.x * dt, y: this.pos.y + this.vel.y * dt };

    // ---- animation
    const speed = Math.hypot(this.vel.x, this.vel.y);
    const effort = this.turn !== null ? 1.3 : clamp(0.3 + (0.7 * speed) / this.cruise, 0.3, 1.8);
    this.phase += dt * swim.tailHz * TAU * effort;
    // Pectoral fins work harder when hovering in place.
    this.finPhase += dt * TAU * (speed < this.cruise * 0.3 ? 2.2 : 1.2);
    const targetPitch = this.turn !== null ? 0 : clamp(Math.atan2(this.vel.y, Math.abs(this.vel.x) + this.cruise * 0.3), -0.35, 0.35);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 3);

    this.prev = this.cur;
    this.cur = this.pose(effort);
  }

  /** Pose interpolated between the last two simulation steps. */
  poseAt(alpha: number): FishPose {
    const p = this.prev;
    const c = this.cur;
    if (p.facing !== c.facing) return c;
    return {
      ...c,
      x: lerp(p.x, c.x, alpha),
      y: lerp(p.y, c.y, alpha),
      pitch: lerp(p.pitch, c.pitch, alpha),
      phase: lerp(p.phase, c.phase, alpha),
      finPhase: lerp(p.finPhase, c.finPhase, alpha),
      turn: lerp(p.turn ?? 0, c.turn ?? 0, alpha),
    };
  }

  private pose(effort: number): FishPose {
    const turn = this.turn ?? 0;
    const flex = this.species.look.swim.flex * (0.5 + 0.5 * Math.min(effort, 1.3)) * (1 + 0.8 * Math.sin(Math.PI * turn));
    return {
      x: this.pos.x,
      y: this.pos.y,
      length: this.length,
      facing: this.facing,
      pitch: this.pitch,
      phase: this.phase,
      flex,
      finPhase: this.finPhase,
      turn,
    };
  }

  /**
   * The vertical range this species likes, in world y. At night free
   * swimmers sink into the lower part of it.
   */
  private depthBand(b: Bounds): [number, number] {
    let [d0, d1] = this.species.look.swim.depth;
    const b2 = this.behaviour;
    // Diel vertical migration: up toward the surface at night.
    if (this.species.look.swim.migrates && this.night > 0) {
      d0 = lerp(d0, 0.05, this.night);
      d1 = lerp(d1, 0.4, this.night);
    }
    if (this.rest > 0 && b2 !== 'bottom-dweller' && b2 !== 'hover') {
      const sink = this.rest * 0.6;
      d0 = lerp(d0, (d0 + d1) / 2, sink);
      d1 = lerp(d1, Math.max(d1, 0.9), sink * 0.5);
    }
    return [lerp(b.top, b.bottom, d0), lerp(b.top, b.bottom, d1)];
  }

  /** Bottom-dwellers eat off the floor; everyone else catches flakes as they sink. */
  private canEat(f: Flake, env: TankEnv): boolean {
    if (this.behaviour === 'bottom-dweller') return f.y > env.bounds.bottom - 40;
    if (f.landed) return false;
    // Fish that stay near home (clownfish at the anemone) only take food that comes close to it.
    if (this.behaviour === 'hover') {
      const home = env.home ?? this.pos;
      return Math.hypot(f.x - home.x, f.y - home.y) < 380;
    }
    return true;
  }

  private nearestFlake(food: readonly Flake[], env: TankEnv): Flake | null {
    let best: Flake | null = null;
    let bestD = Infinity;
    for (const f of food) {
      if (f.eaten || !this.canEat(f, env)) continue;
      // Don't chase flakes still above the top of the tank's swimming area.
      if (f.y < env.bounds.top - 40) continue;
      const d = Math.hypot(f.x - this.pos.x, f.y - this.pos.y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best;
  }

  /** Bounds narrowed to the species' depth band (soft: containment pushes back). */
  private boundsFor(env: TankEnv): Bounds {
    const [top, bottom] = this.depthBand(env.bounds);
    return { left: env.bounds.left, right: env.bounds.right, top: top - 30, bottom: bottom + 30 };
  }

  private pickTarget(env: TankEnv): Vec {
    const rng = this.rng;
    const b = env.bounds;
    const [top, bottom] = this.depthBand(b);
    const y = lerp(top, bottom, rng());
    switch (this.behaviour) {
      case 'hover':
        if (env.home) return { x: env.home.x + lerp(-230, 230, rng()), y: env.home.y + lerp(-110, 30, rng()) };
        return { x: this.pos.x + lerp(-250, 250, rng()), y };
      case 'drift':
        // Short, lazy wanders in any direction.
        return { x: clamp(this.pos.x + lerp(-320, 320, rng()), b.left + 80, b.right - 80), y };
      case 'bottom-dweller':
        return { x: clamp(this.pos.x + lerp(-350, 350, rng()), b.left + 50, b.right - 50), y: lerp(bottom - 20, bottom, rng()) };
      default: {
        // Long, calm laps: keep going the way we face while there's room,
        // otherwise head for the far side of the tank.
        const ahead = this.facing > 0 ? b.right - 80 - this.pos.x : this.pos.x - (b.left + 80);
        if (ahead > 350) return { x: this.pos.x + this.facing * lerp(300, ahead, rng()), y };
        const x = this.facing > 0 ? lerp(b.left + 80, b.left + 500, rng()) : lerp(b.right - 500, b.right - 80, rng());
        return { x, y };
      }
    }
  }
}
