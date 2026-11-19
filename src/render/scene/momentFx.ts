import type { MomentEffect } from '../../sim/moments';
import { lerp, TAU } from '../../util/math';

interface Egg {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
}

interface Ripple {
  x: number;
  y: number;
  t: number;
}

const EGG_S: [number, number] = [6, 9];
const RIPPLE_S = 1.6;

/** What moments leave in the water: a drifting cloud of eggs, a ripple at the surface (spec v1.4 §3). */
export class MomentFx {
  private eggs: Egg[] = [];
  private ripples: Ripple[] = [];

  add(e: MomentEffect): void {
    if (e.kind === 'eggs') {
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * TAU;
        const d = Math.random() * 18;
        const speed = lerp(4, 22, Math.random());
        const max = lerp(EGG_S[0], EGG_S[1], Math.random());
        this.eggs.push({
          x: e.x + Math.cos(a) * d,
          y: e.y + Math.sin(a) * d,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 6,
          r: lerp(1.2, 2.6, Math.random()),
          life: max,
          max,
        });
      }
    } else {
      this.ripples.push({ x: e.x, y: e.y, t: 0 });
    }
  }

  get active(): boolean {
    return this.eggs.length > 0 || this.ripples.length > 0;
  }

  update(dt: number): void {
    for (const g of this.eggs) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 1 - dt * 0.6;
      // Eggs float: they drift slowly upward with the water.
      g.vy = g.vy * (1 - dt * 0.6) - 2 * dt;
      g.life -= dt;
    }
    this.eggs = this.eggs.filter((g) => g.life > 0);
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < RIPPLE_S);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of this.eggs) {
      const fade = Math.min(1, g.life / 2, (g.max - g.life) / 0.4);
      ctx.fillStyle = `rgba(255,236,240,${(0.55 * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, TAU);
      ctx.fill();
    }
    ctx.lineWidth = 2;
    for (const r of this.ripples) {
      const k = r.t / RIPPLE_S;
      for (const lag of [0, 0.25]) {
        const q = k - lag;
        if (q <= 0) continue;
        ctx.strokeStyle = `rgba(225,245,255,${(0.5 * (1 - q)).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, 10 + 70 * q, 3 + 8 * q, 0, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
