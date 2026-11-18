import { lerp, TAU } from '../util/math';

/** One food flake drifting down (or lying on the floor). */
export interface Flake {
  x: number;
  y: number;
  vy: number;
  /** Wobble phase. */
  phase: number;
  /** Size in px. */
  size: number;
  /** Index into FLAKE_COLORS. */
  color: number;
  /** Seconds since it landed on the floor (0 while sinking). */
  rest: number;
  landed: boolean;
  eaten: boolean;
}

export const FLAKE_COLORS = ['#d9783a', '#c9a24a', '#9a6b3c', '#7f9e4c', '#e0a060'] as const;

/** Flakes per sprinkle. */
const FLAKES = 14;
/** Minimum seconds between sprinkles. */
export const FEED_COOLDOWN_S = 10;
/** Seconds an uneaten flake lies on the floor before it's gone. */
export const FLAKE_REST_S = 20;

/** Food in one tank (spec v1.2 §2). */
export class Food {
  flakes: Flake[] = [];
  private cooldown = 0;

  constructor(
    /** Where flakes come to rest (world y). */
    readonly floorY: number,
    private readonly rng: () => number,
  ) {}

  /** Whether fish are currently being fed. */
  get active(): boolean {
    return this.flakes.length > 0;
  }

  /** Seconds until food can be dropped again. */
  get cooldownLeft(): number {
    return this.cooldown;
  }

  /** Sprinkle food from the surface around x. Returns false while on cooldown. */
  drop(x: number): boolean {
    if (this.cooldown > 0) return false;
    this.cooldown = FEED_COOLDOWN_S;
    const rng = this.rng;
    for (let i = 0; i < FLAKES; i++) {
      this.flakes.push({
        x: x + lerp(-140, 140, rng()),
        y: lerp(-30, 40, rng()),
        vy: lerp(26, 48, rng()),
        phase: rng() * TAU,
        size: lerp(4, 7, rng()),
        color: Math.floor(rng() * FLAKE_COLORS.length),
        rest: 0,
        landed: false,
        eaten: false,
      });
    }
    return true;
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const f of this.flakes) {
      f.phase += dt * 1.8;
      if (f.landed) {
        f.rest += dt;
        continue;
      }
      f.y += f.vy * dt;
      f.x += Math.sin(f.phase) * 14 * dt;
      if (f.y >= this.floorY) {
        f.y = this.floorY;
        f.landed = true;
      }
    }
    this.flakes = this.flakes.filter((f) => !f.eaten && f.rest < FLAKE_REST_S);
  }
}
