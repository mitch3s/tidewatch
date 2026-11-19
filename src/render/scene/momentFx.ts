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
  /** 1 for a small gulp, larger for a splash. */
  size: number;
}

/** One cluster of coral spawn, rising slowly to the surface. */
interface Cluster {
  x: number;
  y: number;
  vy: number;
  sway: number;
  r: number;
  rgb: string;
  age: number;
  /** Seconds since it reached the surface, or null while still rising. */
  surfaced: number | null;
}

/** Pale, warm colours for the spawn clusters (an artistic choice: the sources don't give one). */
const CLUSTER_RGB = ['255,214,222', '255,236,214', '252,246,236', '255,200,190'];
/** The clusters gather and fade just under the surface. */
const SURFACE_Y = 56;

const EGG_S: [number, number] = [6, 9];
const RIPPLE_S = 1.6;
/** Seconds a spawn cluster takes to fade once it reaches the surface. */
const CLUSTER_FADE_S = 6;

/** What moments leave in the water: eggs, ripples and splashes, coral spawn rising (spec v1.4 §3–4). */
export class MomentFx {
  private eggs: Egg[] = [];
  private ripples: Ripple[] = [];
  private clusters: Cluster[] = [];
  /** Bubbles knocked under by a splash. */
  private foam: Egg[] = [];

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
    } else if (e.kind === 'cluster') {
      this.clusters.push({
        x: e.x,
        y: e.y,
        vy: -lerp(18, 42, Math.random()),
        sway: Math.random() * TAU,
        r: lerp(3, 6, Math.random()),
        rgb: CLUSTER_RGB[Math.floor(Math.random() * CLUSTER_RGB.length)]!,
        age: 0,
        surfaced: null,
      });
    } else if (e.kind === 'splash') {
      this.ripples.push({ x: e.x, y: e.y, t: 0, size: 2.2 });
      for (let i = 0; i < 26; i++) {
        const max = lerp(0.8, 1.8, Math.random());
        this.foam.push({
          x: e.x + lerp(-50, 50, Math.random()),
          y: e.y + lerp(4, 40, Math.random()),
          vx: lerp(-30, 30, Math.random()),
          vy: lerp(-40, 10, Math.random()),
          r: lerp(1.5, 4, Math.random()),
          life: max,
          max,
        });
      }
    } else {
      this.ripples.push({ x: e.x, y: e.y, t: 0, size: 1 });
    }
  }

  get active(): boolean {
    return this.eggs.length > 0 || this.ripples.length > 0 || this.clusters.length > 0 || this.foam.length > 0;
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
    this.ripples = this.ripples.filter((r) => r.t < RIPPLE_S * r.size);
    for (const f of this.foam) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy -= 30 * dt;
      f.life -= dt;
    }
    this.foam = this.foam.filter((f) => f.life > 0);
    for (const c of this.clusters) {
      c.age += dt;
      c.y = Math.max(SURFACE_Y, c.y + c.vy * dt);
      c.x += Math.sin(c.age * 0.6 + c.sway) * 14 * dt;
      if (c.surfaced !== null) c.surfaced += dt;
      else if (c.y <= SURFACE_Y) c.surfaced = 0;
    }
    // They gather at the surface, then fade.
    this.clusters = this.clusters.filter((c) => c.surfaced === null || c.surfaced < CLUSTER_FADE_S);
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
    for (const c of this.clusters) {
      const fadeIn = Math.min(1, c.age / 0.8);
      const fadeOut = c.surfaced === null ? 1 : 1 - c.surfaced / CLUSTER_FADE_S;
      // A soft glow round a brighter core, so they read as clusters, not bubbles.
      const a = fadeIn * fadeOut;
      ctx.fillStyle = `rgba(${c.rgb},${(0.25 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(${c.rgb},${(0.95 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, TAU);
      ctx.fill();
    }
    for (const f of this.foam) {
      ctx.strokeStyle = `rgba(230,248,255,${(0.6 * (f.life / f.max)).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, TAU);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (const r of this.ripples) {
      const k = r.t / (RIPPLE_S * r.size);
      for (const lag of [0, 0.25]) {
        const q = k - lag;
        if (q <= 0) continue;
        ctx.strokeStyle = `rgba(225,245,255,${(0.5 * (1 - q)).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, (10 + 70 * q) * r.size, (3 + 8 * q) * Math.sqrt(r.size), 0, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
