import type { Species } from '../data/types';
import type { FishPose } from '../render/fish/renderFish';
import { STAGE_WIDTH } from '../render/stage';
import { lerp, TAU } from '../util/math';
import type { Bounds } from './steering';

/**
 * A rare visitor: crosses the tank on a gentle scripted path, entering on
 * one side and leaving on the other, in about the catch window (spec 4.2).
 */
export class VisitorSwimmer {
  readonly length: number;
  private t = 0;
  private readonly dir: 1 | -1;
  private readonly y0: number;
  private readonly x0: number;
  private readonly x1: number;
  private phase = 0;
  private finPhase = 0;
  private prev: FishPose;
  private cur: FishPose;

  constructor(
    readonly species: Species,
    bounds: Bounds,
    private readonly durationS: number,
    rng: () => number,
  ) {
    // Shown a bit larger than usual, and through open water rather than at
    // its usual depth, so it's easy to spot.
    this.length = species.displayLength * 1.45;
    this.dir = rng() < 0.5 ? 1 : -1;
    this.y0 = lerp(bounds.top, bounds.bottom, lerp(0.3, 0.6, rng()));
    const margin = this.length + 60;
    this.x0 = this.dir > 0 ? -margin : STAGE_WIDTH + margin;
    this.x1 = this.dir > 0 ? STAGE_WIDTH + margin : -margin;
    this.cur = this.pose();
    this.prev = this.cur;
  }

  /** True once it has swum out of the other side. */
  get done(): boolean {
    return this.t >= this.durationS;
  }

  get position(): { x: number; y: number } {
    return { x: this.cur.x, y: this.cur.y };
  }

  update(dt: number): void {
    this.t += dt;
    this.phase += dt * this.species.look.swim.tailHz * TAU;
    this.finPhase += dt * TAU * 1.3;
    this.prev = this.cur;
    this.cur = this.pose();
  }

  poseAt(alpha: number): FishPose {
    return {
      ...this.cur,
      x: lerp(this.prev.x, this.cur.x, alpha),
      y: lerp(this.prev.y, this.cur.y, alpha),
      phase: lerp(this.prev.phase, this.cur.phase, alpha),
      finPhase: lerp(this.prev.finPhase, this.cur.finPhase, alpha),
    };
  }

  private pose(): FishPose {
    // Ease in and out a little, so it lingers in the middle of the tank.
    const s = this.t / this.durationS;
    const eased = s + 0.06 * Math.sin(s * TAU);
    const bob = Math.sin(this.t * 0.5) * 40;
    return {
      x: lerp(this.x0, this.x1, eased),
      y: this.y0 + bob,
      length: this.length,
      facing: this.dir,
      pitch: Math.cos(this.t * 0.5) * 0.08,
      phase: this.phase,
      flex: this.species.look.swim.flex,
      finPhase: this.finPhase,
    };
  }
}
