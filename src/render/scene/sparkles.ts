import { lerp, TAU } from '../../util/math';

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

/** A short burst of sparkles, for catching a visitor. */
export class Sparkles {
  private items: Sparkle[] = [];

  burst(x: number, y: number, count = 40): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const speed = lerp(60, 260, Math.random());
      const max = lerp(0.8, 1.6, Math.random());
      this.items.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: max, max, size: lerp(3, 8, Math.random()) });
    }
  }

  update(dt: number): void {
    for (const s of this.items) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 1 - dt * 2;
      s.vy = s.vy * (1 - dt * 2) - 20 * dt;
      s.life -= dt;
    }
    this.items = this.items.filter((s) => s.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.items.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.items) {
      const a = s.life / s.max;
      ctx.fillStyle = `rgba(255,236,160,${(a * 0.9).toFixed(3)})`;
      const r = s.size * (0.5 + a * 0.5);
      // Four-pointed star.
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - r * 2);
      ctx.quadraticCurveTo(s.x, s.y, s.x + r * 2, s.y);
      ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r * 2);
      ctx.quadraticCurveTo(s.x, s.y, s.x - r * 2, s.y);
      ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
