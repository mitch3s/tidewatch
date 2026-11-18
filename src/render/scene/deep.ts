/**
 * Deep sea scenery (spec v1.3): almost black water far below the reach of
 * sunlight, faint ridges in the distance, a dark silt floor with glass
 * sponges and sea pens, and tiny flashes of bioluminescence in the water.
 * There is no surface light here: the animals make their own.
 */
import type { BiomeDef } from '../../data/biomes';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';
import { BLEED, type Rng, type Scenery } from './reef';

const W = STAGE_WIDTH;
const H = STAGE_HEIGHT;

export function createDeepScenery(def: BiomeDef): Scenery {
  const sparks = new Sparks(def.seed + 300);
  return {
    paintFar: (ctx) => paintFar(ctx, def),
    paintMid: (ctx) => paintMid(ctx, def),
    drawLive: (ctx, time) => sparks.draw(ctx, time),
    home: { x: 960, y: 520 },
    bubbleSources: [],
    grass: [],
  };
}

function paintFar(ctx: CanvasRenderingContext2D, def: BiomeDef): void {
  const rng = createRng(def.seed + 100);
  const g = ctx.createLinearGradient(0, -BLEED, 0, H + BLEED);
  g.addColorStop(0, def.water[0]);
  g.addColorStop(0.55, def.water[1]);
  g.addColorStop(1, def.water[2]);
  ctx.fillStyle = g;
  ctx.fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);

  // The faintest memory of light far above.
  const glow = ctx.createRadialGradient(W * 0.5, -300, 50, W * 0.5, -300, 1100);
  glow.addColorStop(0, 'rgba(40,80,140,0.18)');
  glow.addColorStop(1, 'rgba(40,80,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);

  // Distant ridges, barely darker than the water.
  for (const [base, height, color] of [
    [880, 170, def.farRows[0]],
    [930, 120, def.farRows[1]],
  ] as Array<[number, number, string]>) {
    const ph = rng() * TAU;
    ctx.beginPath();
    ctx.moveTo(-BLEED, H + BLEED);
    for (let x = -BLEED; x <= W + BLEED; x += 8) {
      const h = height * (0.5 + 0.3 * Math.sin(x * 0.003 + ph) + 0.15 * Math.sin(x * 0.011 + ph * 2) + 0.05 * Math.sin(x * 0.05));
      ctx.lineTo(x, base - h);
    }
    ctx.lineTo(W + BLEED, H + BLEED);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function paintMid(ctx: CanvasRenderingContext2D, def: BiomeDef): void {
  const rng = createRng(def.seed + 200);
  // A couple of dark outcrops.
  outcrop(ctx, 230, def.floor.y + 20, 420, 210, rng);
  outcrop(ctx, 1640, def.floor.y + 20, 520, 260, rng);
  // Glass sponges: pale, see-through vases.
  glassSponge(ctx, 300, def.floor.y - 150, 70, 150);
  glassSponge(ctx, 1560, def.floor.y - 205, 90, 190);
  glassSponge(ctx, 1730, def.floor.y - 190, 55, 120);
  // Sea pens: feathery stalks rising from the silt.
  for (const [x, h] of [
    [640, 120],
    [700, 90],
    [1120, 140],
    [1190, 100],
    [1300, 80],
  ] as Array<[number, number]>) {
    seaPen(ctx, x, def.floor.y + 18, h, rng);
  }

  // Silt floor.
  const top = def.floor.y;
  const p = new Path2D();
  p.moveTo(-BLEED, H + BLEED);
  const ph = rng() * TAU;
  for (let x = -BLEED; x <= W + BLEED; x += 8) p.lineTo(x, top + 8 * Math.sin(x * 0.005 + ph) + 4 * Math.sin(x * 0.017));
  p.lineTo(W + BLEED, H + BLEED);
  p.closePath();
  const fg = ctx.createLinearGradient(0, top - 10, 0, H + BLEED);
  fg.addColorStop(0, def.floor.top);
  fg.addColorStop(1, def.floor.bottom);
  ctx.fillStyle = fg;
  ctx.fill(p);
  // Specks of settled marine snow.
  ctx.save();
  ctx.clip(p);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(170,190,210,${lerp(0.05, 0.22, rng()).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(rng() * W, lerp(top + 10, H + 20, rng()), lerp(0.8, 2.2, rng()), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function outcrop(ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number, rng: Rng): void {
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = cx - w / 2 + w * t;
    const y = base - h * Math.sin(Math.PI * t) ** 0.8 * lerp(0.75, 1.05, rng());
    ctx.lineTo(x, y);
  }
  ctx.lineTo(cx + w / 2, base);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, base - h, 0, base);
  g.addColorStop(0, '#1a2433');
  g.addColorStop(1, '#0b1119');
  ctx.fillStyle = g;
  ctx.fill();
}

function glassSponge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  // A vase widening upward, with a lattice of fine lines.
  const path = new Path2D();
  path.moveTo(x - w * 0.18, y + h);
  path.bezierCurveTo(x - w * 0.3, y + h * 0.5, x - w * 0.6, y + h * 0.2, x - w * 0.5, y);
  path.lineTo(x + w * 0.5, y);
  path.bezierCurveTo(x + w * 0.6, y + h * 0.2, x + w * 0.3, y + h * 0.5, x + w * 0.18, y + h);
  path.closePath();
  ctx.fillStyle = 'rgba(190,210,225,0.13)';
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = 'rgba(210,228,240,0.22)';
  ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.12, y);
    ctx.lineTo(x + i * w * 0.05, y + h);
    ctx.stroke();
  }
  for (let j = 1; j < 8; j++) {
    ctx.beginPath();
    ctx.moveTo(x - w, y + (h * j) / 8);
    ctx.lineTo(x + w, y + (h * j) / 8);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(220,235,245,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, w * 0.1, 0, 0, TAU);
  ctx.stroke();
}

function seaPen(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, rng: Rng): void {
  const lean = lerp(-0.15, 0.15, rng());
  ctx.strokeStyle = 'rgba(200,120,90,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + lean * h, base - h);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(225,150,115,0.45)';
  for (let i = 0; i < 12; i++) {
    const t = 0.3 + (0.7 * i) / 12;
    const px = x + lean * h * t;
    const py = base - h * t;
    const len = 14 * Math.sin(Math.PI * t);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + side * len, py - len * 0.5);
      ctx.stroke();
    }
  }
}

/** Tiny flashes of light in the water: something unseen glowing for a moment. */
class Sparks {
  private readonly sparks: Array<{ x: number; y: number; period: number; offset: number; r: number }>;

  constructor(seed: number) {
    const rng = createRng(seed);
    this.sparks = Array.from({ length: 26 }, () => ({
      x: rng() * W,
      y: lerp(80, 880, rng()),
      period: lerp(7, 19, rng()),
      offset: rng() * 20,
      r: lerp(1.5, 3.5, rng()),
    }));
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.sparks) {
      // Each one flashes briefly once per period.
      const t = ((time + s.offset) % s.period) / s.period;
      if (t > 0.08) continue;
      const a = Math.sin((t / 0.08) * Math.PI);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
      g.addColorStop(0, `rgba(140,220,255,${(0.8 * a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(140,220,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
