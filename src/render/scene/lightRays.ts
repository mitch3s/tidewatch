import { lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';

interface Ray {
  x: number;
  topW: number;
  bottomW: number;
  slant: number;
  phase: number;
  speed: number;
}

/** Soft shafts of sunlight that sway and shimmer slowly. */
export class LightRays {
  private readonly rays: Ray[];

  constructor(seed: number, count = 7) {
    const rng = createRng(seed);
    this.rays = Array.from({ length: count }, (_, i) => ({
      x: lerp(120, 1800, (i + rng() * 0.6) / count),
      topW: lerp(40, 120, rng()),
      bottomW: lerp(180, 360, rng()),
      slant: lerp(-260, -140, rng()),
      phase: rng() * TAU,
      speed: lerp(0.04, 0.09, rng()),
    }));
  }

  /** `rgb` is "r,g,b"; `intensity` 0..1 (0 at night). */
  draw(ctx: CanvasRenderingContext2D, time: number, rgb: string, intensity: number): void {
    if (intensity <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bottom = 980;
    for (const r of this.rays) {
      const sway = Math.sin(time * r.speed * TAU + r.phase) * 50;
      const shimmer = 0.6 + 0.4 * Math.sin(time * r.speed * 2.3 * TAU + r.phase * 1.7);
      const a = 0.085 * intensity * shimmer;
      const x0 = r.x + sway;
      const x1 = x0 + r.slant;
      const g = ctx.createLinearGradient(0, -40, 0, bottom);
      g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
      g.addColorStop(0.6, `rgba(${rgb},${(a * 0.35).toFixed(3)})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0 - r.topW / 2, -40);
      ctx.lineTo(x0 + r.topW / 2, -40);
      ctx.lineTo(x1 + r.bottomW / 2, bottom);
      ctx.lineTo(x1 - r.bottomW / 2, bottom);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
