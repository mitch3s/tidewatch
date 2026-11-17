import type { Species } from '../data/types';
import type { FishPose } from '../render/fish/renderFish';
import { STAGE_WIDTH } from '../render/stage';
import { clamp, lerp, TAU } from '../util/math';

/**
 * A very simple swimmer for the Milestone 2 preview: it cruises across the
 * tank, turns around near the edges and bobs gently. Milestone 3 replaces it
 * with proper steering and schooling.
 */
export class DemoSwimmer {
  private x: number;
  private t: number;
  private dir: 1 | -1;
  /** Current facing, moves smoothly between -1 and +1 while turning. */
  private facing: number;
  private phase = 0;
  private finPhase = 0;
  private prev: FishPose;
  private cur: FishPose;
  private readonly speedPx: number;

  constructor(
    private readonly species: Species,
    private readonly baseY: number,
    seed: number,
  ) {
    this.x = lerp(300, STAGE_WIDTH - 300, (seed * 0.37) % 1);
    this.t = seed * 10;
    this.dir = seed % 2 < 1 ? 1 : -1;
    this.facing = this.dir;
    const [lo, hi] = species.look.swim.speed;
    this.speedPx = lerp(lo, hi, 0.5) * species.displayLength;
    this.cur = this.pose();
    this.prev = this.cur;
  }

  update(dt: number): void {
    this.t += dt;
    const margin = 160;
    if (this.dir > 0 && this.x > STAGE_WIDTH - margin) this.dir = -1;
    if (this.dir < 0 && this.x < margin) this.dir = 1;
    // Turn over about 0.8 s.
    this.facing = clamp(this.facing + Math.sign(this.dir - this.facing) * dt * 2.5, -1, 1);
    // Slow down while turning.
    const effort = Math.abs(this.facing);
    this.x += this.dir * this.speedPx * dt * (0.25 + 0.75 * effort);
    const swim = this.species.look.swim;
    this.phase += dt * swim.tailHz * TAU * (0.6 + 0.4 * effort);
    this.finPhase += dt * 1.6 * TAU;
    this.prev = this.cur;
    this.cur = this.pose();
  }

  /** Pose interpolated between the last two simulation steps. */
  poseAt(alpha: number): FishPose {
    const p = this.prev;
    const c = this.cur;
    return {
      ...c,
      x: lerp(p.x, c.x, alpha),
      y: lerp(p.y, c.y, alpha),
      facing: lerp(p.facing, c.facing, alpha),
      phase: lerp(p.phase, c.phase, alpha),
      finPhase: lerp(p.finPhase, c.finPhase, alpha),
    };
  }

  private pose(): FishPose {
    const bob = Math.sin(this.t * 0.45) * 36;
    const dy = Math.cos(this.t * 0.45) * 36 * 0.45;
    const f = this.facing;
    // Ease the facing so the fish narrows smoothly as it turns.
    const eased = Math.sign(f) * Math.sin((Math.abs(f) * Math.PI) / 2);
    return {
      x: this.x,
      y: this.baseY + bob,
      length: this.species.displayLength,
      facing: eased === 0 ? 0.01 : eased,
      pitch: Math.atan2(dy, this.speedPx) * 0.6,
      phase: this.phase,
      flex: this.species.look.swim.flex,
      finPhase: this.finPhase,
    };
  }
}
