import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';

interface Mote {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  alpha: number;
}

/**
 * Tiny specks drifting slowly through the water ("marine snow" on the reef,
 * fine detritus in the river). Cheap, and makes the water feel deep.
 */
export class Particles {
  private readonly motes: Mote[];

  constructor(seed: number, count: number, private readonly color: string) {
    const rng = createRng(seed);
    this.motes = Array.from({ length: count }, () => ({
      x: rng() * STAGE_WIDTH,
      y: rng() * STAGE_HEIGHT,
      r: lerp(0.8, 2.4, rng() ** 2),
      vy: lerp(3, 12, rng()),
      phase: rng() * TAU,
      alpha: lerp(0.15, 0.45, rng()),
    }));
  }

  update(dt: number): void {
    for (const m of this.motes) {
      m.y += m.vy * dt;
      m.phase += dt * 0.5;
      if (m.y > STAGE_HEIGHT + 10) {
        m.y = -10;
        m.x = (m.x + 397) % STAGE_WIDTH;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const m of this.motes) {
      ctx.fillStyle = `rgba(${this.color},${m.alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(m.phase) * 6, m.y, m.r, 0, TAU);
      ctx.fill();
    }
  }
}
