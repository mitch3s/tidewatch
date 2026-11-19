import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { clamp, lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';

/** A soft round blob, pre-rendered once and reused as a sprite. */
function softDot(size: number, rgb: string, stops: Array<[number, number]>): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, a] of stops) g.addColorStop(at, `rgba(${rgb},${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}

/**
 * Soft shadows on the sand under fish swimming close to the floor. A cue
 * for depth that flat drawings lack.
 */
export class FloorShadows {
  private sprite: HTMLCanvasElement | null = null;

  constructor(
    private readonly floorY: number,
    /** How far above the floor a fish still casts a visible shadow. */
    private readonly reach = 260,
  ) {}

  /** `fish` gives each fish's position and length; `intensity` 0..1 (weaker at night). */
  draw(ctx: CanvasRenderingContext2D, fish: Iterable<{ x: number; y: number; length: number }>, intensity: number): void {
    if (intensity <= 0.01) return;
    this.sprite ??= softDot(64, '2,14,24', [
      [0, 0.55],
      [0.6, 0.25],
      [1, 0],
    ]);
    for (const f of fish) {
      const h = this.floorY - f.y;
      if (h > this.reach || h < -40) continue;
      const near = 1 - clamp(h / this.reach, 0, 1);
      const w = f.length * lerp(1.6, 1.0, near);
      ctx.globalAlpha = intensity * near * near * 0.55;
      ctx.drawImage(this.sprite, f.x - w / 2, this.floorY + 14 - w * 0.09, w, w * 0.18);
    }
    ctx.globalAlpha = 1;
  }
}

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  alpha: number;
}

/**
 * A few large, out-of-focus specks drifting right in front of the camera.
 * Together with the fine specks further back they give the water volume.
 */
export class NearMotes {
  private readonly motes: Mote[];
  private sprite: HTMLCanvasElement | null = null;

  constructor(
    seed: number,
    private readonly rgb: string,
    count = 14,
  ) {
    const rng = createRng(seed);
    this.motes = Array.from({ length: count }, () => ({
      x: rng() * STAGE_WIDTH,
      y: rng() * STAGE_HEIGHT,
      r: lerp(8, 26, rng() ** 1.5),
      vx: lerp(-6, 6, rng()),
      vy: lerp(-2, 7, rng()),
      phase: rng() * TAU,
      alpha: lerp(0.08, 0.22, rng()),
    }));
  }

  update(dt: number): void {
    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.phase += dt * 0.3;
      if (m.y > STAGE_HEIGHT + 40) m.y = -40;
      if (m.y < -40) m.y = STAGE_HEIGHT + 40;
      if (m.x > STAGE_WIDTH + 40) m.x = -40;
      if (m.x < -40) m.x = STAGE_WIDTH + 40;
    }
  }

  draw(ctx: CanvasRenderingContext2D, brightness: number): void {
    this.sprite ??= softDot(64, this.rgb, [
      [0, 0.9],
      [0.35, 0.55],
      [0.8, 0.12],
      [1, 0],
    ]);
    for (const m of this.motes) {
      const twinkle = 0.75 + 0.25 * Math.sin(m.phase * 3);
      ctx.globalAlpha = m.alpha * twinkle * brightness;
      const d = m.r * 2;
      ctx.drawImage(this.sprite, m.x + Math.sin(m.phase) * 10 - m.r, m.y - m.r, d, d);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * The underside of the water surface: faint bright bands near the top of
 * the screen that ripple slowly.
 */
export class SurfaceShimmer {
  private readonly bands: Array<{ y: number; amp: number; k: number; speed: number; phase: number; width: number; alpha: number }>;

  constructor(seed: number) {
    const rng = createRng(seed);
    this.bands = Array.from({ length: 4 }, (_, i) => ({
      y: lerp(-14, 50, i / 3) + rng() * 10,
      amp: lerp(4, 12, rng()),
      k: lerp(0.004, 0.011, rng()),
      speed: lerp(0.25, 0.6, rng()) * (rng() < 0.5 ? -1 : 1),
      phase: rng() * TAU,
      width: lerp(6, 18, rng()),
      alpha: lerp(0.03, 0.08, 1 - i / 3),
    }));
  }

  /** `rgb` is "r,g,b"; `intensity` 0..1. */
  draw(ctx: CanvasRenderingContext2D, time: number, rgb: string, intensity: number): void {
    if (intensity <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const b of this.bands) {
      ctx.strokeStyle = `rgba(${rgb},${(b.alpha * intensity).toFixed(3)})`;
      ctx.lineWidth = b.width;
      ctx.beginPath();
      for (let x = -120; x <= STAGE_WIDTH + 120; x += 40) {
        const y =
          b.y +
          b.amp * Math.sin(x * b.k + time * b.speed + b.phase) +
          b.amp * 0.5 * Math.sin(x * b.k * 2.7 - time * b.speed * 1.3);
        if (x === -120) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
