import type { Species } from '../data/types';
import type { FishPose } from '../render/fish/renderFish';
import { clamp, lerp, TAU, type Vec } from '../util/math';
import { alignment, arrive, type Bounds, cohesion, containment, limit, separation } from './steering';

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

  update(dt: number, env: TankEnv, all: readonly FishAgent[]): void {
    const rng = this.rng;
    const swim = this.species.look.swim;
    this.turnCooldown = Math.max(0, this.turnCooldown - dt);
    this.burst = Math.max(0, this.burst - dt);

    // ---- choose where to go
    if (this.school) {
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
        const pauseChance = this.behaviour === 'bottom-dweller' ? 0.55 : this.behaviour === 'hover' ? 0.35 : 0.05;
        if (arrived && rng() < pauseChance) this.pause = lerp(1.5, this.behaviour === 'bottom-dweller' ? 6 : 4, rng());
        this.target = this.pickTarget(env);
        this.retarget = lerp(6, 14, rng());
      }
      if (this.behaviour === 'darting' && this.burst <= 0 && rng() < dt * 0.08) this.burst = 0.6;
    }

    const speedNow = this.pause > 0 ? 0 : this.cruise * (this.burst > 0 ? 2.2 : 1);
    const maxSpeed = this.cruise * (this.burst > 0 ? 2.4 : 1.25);
    const maxAcc = maxSpeed * (this.burst > 0 ? 3 : 1.1);

    // ---- steering forces
    let ax = 0;
    let ay = 0;
    const seekF = arrive(this.pos, this.vel, this.target, speedNow, this.length * 2);
    const seekW = this.school ? 0.5 : 1;
    ax += seekF.x * seekW;
    ay += seekF.y * seekW;

    const contain = containment(this.pos, this.boundsFor(env), 140);
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

    if (this.school && school.length) {
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

  /** The vertical range this species likes, in world y. */
  private depthBand(b: Bounds): [number, number] {
    const [d0, d1] = this.species.look.swim.depth;
    return [lerp(b.top, b.bottom, d0), lerp(b.top, b.bottom, d1)];
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
