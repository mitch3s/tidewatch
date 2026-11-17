import { STAGE_HEIGHT } from '../stage';
import { lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';

interface Blade {
  x: number;
  h: number;
  w: number;
  color: string;
  phase: number;
}

/**
 * Foreground sea grass in the bottom corners. Kept to the sides so it frames
 * the tank without hiding fish.
 */
export class SeaGrass {
  private readonly blades: Blade[] = [];

  constructor(seed: number, clusters: Array<{ x: number; spread: number; count: number }>) {
    const rng = createRng(seed);
    const greens = ['#2f7a4a', '#3f8f5a', '#4f9f63', '#2a6b45', '#5aa66b'];
    for (const c of clusters) {
      for (let i = 0; i < c.count; i++) {
        this.blades.push({
          x: c.x + lerp(-c.spread, c.spread, rng()),
          h: lerp(140, 330, rng()),
          w: lerp(9, 16, rng()),
          color: greens[Math.floor(rng() * greens.length)]!,
          phase: rng() * TAU,
        });
      }
    }
    // Draw short blades in front of tall ones.
    this.blades.sort((a, b) => b.h - a.h);
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const baseY = STAGE_HEIGHT + 30;
    for (const b of this.blades) {
      const sway = 0.13 * Math.sin(time * 0.55 + b.phase) + 0.05 * Math.sin(time * 1.3 + b.phase * 2);
      const tipX = b.x + Math.sin(sway) * b.h;
      const tipY = baseY - Math.cos(sway) * b.h;
      const cx = b.x + Math.sin(sway * 0.4) * b.h * 0.5;
      const cy = baseY - b.h * 0.5;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(b.x - b.w / 2, baseY);
      ctx.quadraticCurveTo(cx - b.w / 2, cy, tipX, tipY);
      ctx.quadraticCurveTo(cx + b.w / 2, cy, b.x + b.w / 2, baseY);
      ctx.closePath();
      ctx.fill();
      // A lighter midrib.
      ctx.strokeStyle = 'rgba(200,255,200,0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x, baseY);
      ctx.quadraticCurveTo(cx, cy, tipX, tipY);
      ctx.stroke();
    }
  }
}

/** A sea anemone with swaying tentacles: the clownfish's home. */
export function drawAnemone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number): void {
  // Column.
  const colTop = y - size * 0.32;
  const g = ctx.createLinearGradient(x - size * 0.4, 0, x + size * 0.4, 0);
  g.addColorStop(0, '#7a3f62');
  g.addColorStop(0.5, '#b0628c');
  g.addColorStop(1, '#6d3757');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.3, y);
  ctx.quadraticCurveTo(x - size * 0.32, y - size * 0.2, x - size * 0.45, colTop);
  ctx.lineTo(x + size * 0.45, colTop);
  ctx.quadraticCurveTo(x + size * 0.32, y - size * 0.2, x + size * 0.3, y);
  ctx.closePath();
  ctx.fill();

  // Tentacles: back row first (darker), then the front row.
  const rows = [
    { n: 26, dy: -size * 0.06, color: '#a85d8a', tip: '#e2a9c8', len: 0.62 },
    { n: 30, dy: size * 0.03, color: '#c97aa6', tip: '#f7cfe3', len: 0.55 },
  ];
  ctx.lineCap = 'round';
  for (const row of rows) {
    for (let i = 0; i < row.n; i++) {
      const t = i / (row.n - 1);
      const bx = x + lerp(-0.45, 0.45, t) * size;
      const by = colTop + row.dy + Math.sin(t * Math.PI) * -size * 0.04;
      // Fan outward from the centre; a slow wave runs across the tentacles.
      const base = -Math.PI / 2 + lerp(-1.1, 1.1, t);
      const wave = 0.28 * Math.sin(time * 1.1 - t * 5) + 0.08 * Math.sin(time * 2.3 + i);
      const len = size * row.len * (0.85 + 0.15 * Math.sin(i * 12.9898));
      const a1 = base + wave * 0.5;
      const a2 = base + wave * 1.4;
      const mx = bx + Math.cos(a1) * len * 0.5;
      const my = by + Math.sin(a1) * len * 0.5;
      const ex = mx + Math.cos(a2) * len * 0.5;
      const ey = my + Math.sin(a2) * len * 0.5;
      ctx.strokeStyle = row.color;
      ctx.lineWidth = size * 0.055;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
      ctx.fillStyle = row.tip;
      ctx.beginPath();
      ctx.arc(ex, ey, size * 0.035, 0, TAU);
      ctx.fill();
    }
  }
}
