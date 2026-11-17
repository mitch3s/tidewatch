import type { Species } from '../data/types';
import type { FishPose } from '../render/fish/renderFish';
import { STAGE_WIDTH } from '../render/stage';
import { lerp, TAU } from '../util/math';

/** How long a turn takes, in seconds. */
const TURN_S = 1.1;

/**
 * A very simple swimmer for the Milestone 2 preview: it cruises across the
 * tank, turns around near the edges and bobs gently. Milestone 3 replaces it
 * with proper steering and schooling.
 */
export class DemoSwimmer {
  private x: number;
  private t: number;
  private dir: 1 | -1;
  /** Turn progress 0..1 while turning, otherwise null. */
  private turning: number | null = null;
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
    const [lo, hi] = species.look.swim.speed;
    this.speedPx = lerp(lo, hi, 0.5) * species.displayLength;
    this.cur = this.pose();
    this.prev = this.cur;
  }

  update(dt: number): void {
    this.t += dt;
    const margin = 220;
    if (this.turning === null) {
      if ((this.dir > 0 && this.x > STAGE_WIDTH - margin) || (this.dir < 0 && this.x < margin)) this.turning = 0;
    }

    let effort = 1;
    let vx = this.dir * this.speedPx;
    if (this.turning !== null) {
      const p = this.turning;
      // Glide forward on momentum, then pick up speed the new way.
      vx = this.dir * this.speedPx * 0.45 * Math.cos(Math.PI * p);
      // Beat the tail harder through the turn.
      effort = 1.3;
      this.turning += dt / TURN_S;
      if (this.turning >= 1) {
        this.turning = null;
        this.dir = this.dir > 0 ? -1 : 1;
      }
    }
    this.x += vx * dt;

    const swim = this.species.look.swim;
    this.phase += dt * swim.tailHz * TAU * effort;
    this.finPhase += dt * 1.6 * TAU * effort;
    this.prev = this.cur;
    this.cur = this.pose();
  }

  /** Pose interpolated between the last two simulation steps. */
  poseAt(alpha: number): FishPose {
    const p = this.prev;
    const c = this.cur;
    // Don't interpolate across the flip at the end of a turn.
    if (p.facing !== c.facing) return c;
    return {
      ...c,
      x: lerp(p.x, c.x, alpha),
      y: lerp(p.y, c.y, alpha),
      phase: lerp(p.phase, c.phase, alpha),
      finPhase: lerp(p.finPhase, c.finPhase, alpha),
      turn: lerp(p.turn ?? 0, c.turn ?? 0, alpha),
    };
  }

  private pose(): FishPose {
    const bob = Math.sin(this.t * 0.45) * 36;
    const dy = Math.cos(this.t * 0.45) * 36 * 0.45;
    const turn = this.turning ?? 0;
    return {
      x: this.x,
      y: this.baseY + bob,
      length: this.species.displayLength,
      facing: this.dir,
      // Level out while turning.
      pitch: Math.atan2(dy, this.speedPx) * 0.6 * (1 - Math.sin(Math.PI * turn)),
      phase: this.phase,
      // A turning fish bends its body more.
      flex: this.species.look.swim.flex * (1 + 0.8 * Math.sin(Math.PI * turn)),
      finPhase: this.finPhase,
      turn,
    };
  }
}
