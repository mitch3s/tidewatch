/**
 * Coral reef scenery, generated from a seed. The far and mid layers are
 * painted once into offscreen canvases (see layers.ts); only the anemone,
 * plants, bubbles and light rays are animated every frame.
 */
import type { BiomeDef } from '../../data/biomes';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { lerp, TAU, type Vec } from '../../util/math';
import { createRng } from '../../util/rng';
import { drawAnemone } from './plants';

export type Rng = () => number;
const W = STAGE_WIDTH;
const H = STAGE_HEIGHT;
/** Extra margin painted around layers so camera drift never shows an edge. */
export const BLEED = 80;

interface Rock {
  cx: number;
  rx: number;
  ry: number;
  baseY: number;
  phases: [number, number, number];
}

export interface ReefLayout {
  rocks: Rock[];
  anemone: { x: number; y: number; size: number };
  /** Just under the left edge of the lowest plate coral on the big right rock. */
  ledge: Vec;
  /** Where the corals grow (as painted in paintMid), for coral spawning. */
  corals: Vec[];
  bubbleSources: number[];
}

export function layoutReef(def: BiomeDef): ReefLayout {
  const rng = createRng(def.seed);
  const base = def.floor.y + 30;
  const rock = (cx: number, w: number, h: number): Rock => ({
    cx,
    rx: w / 2,
    ry: h,
    baseY: base,
    phases: [rng() * TAU, rng() * TAU, rng() * TAU],
  });
  // Big formations at the sides keep the middle of the tank open for fish.
  const rocks = [rock(150, 560, 330), rock(470, 300, 165), rock(1760, 600, 380), rock(1460, 300, 150), rock(1150, 240, 80)];
  // The anemone grows on the top of the small middle rock, its foot slightly
  // sunk into the surface so it never looks like it's floating.
  const top = rockPoint(rocks[4]!, 0.5);
  return {
    rocks,
    anemone: { x: top.x, y: top.y + 18, size: 120 },
    // Matches the plate coral painted at t = 0.75 on rock 2 (paintMid): its
    // lowest plate is 150 wide at y + 4, with open water under its left side.
    ledge: (() => {
      const p = rockPoint(rocks[2]!, 0.75);
      return { x: p.x - 42, y: p.y + 4 + 26 };
    })(),
    // The rock positions paintMid decorates with corals (not the sponges or sea fans).
    corals: (
      [
        [0, [0.18, 0.3, 0.7, 0.82]],
        [1, [0.3, 0.62]],
        [2, [0.42, 0.55, 0.75, 0.88]],
        [3, [0.35, 0.7]],
        [4, [0.85]],
      ] as Array<[number, number[]]>
    ).flatMap(([i, ts]) => ts.map((t) => rockPoint(rocks[i]!, t))),
    bubbleSources: [430, 1530, 860],
  };
}

/** A point on a rock's upper outline; t = 0 (right) .. 1 (left). */
function rockPoint(r: Rock, t: number): Vec {
  const th = Math.PI * t;
  const n = 1 + 0.07 * Math.sin(3 * th + r.phases[0]) + 0.05 * Math.sin(7 * th + r.phases[1]) + 0.025 * Math.sin(13 * th + r.phases[2]);
  return { x: r.cx + Math.cos(th) * r.rx * n, y: r.baseY - Math.sin(th) * r.ry * n };
}

function rockPath(r: Rock): Path2D {
  const p = new Path2D();
  for (let i = 0; i <= 60; i++) {
    const q = rockPoint(r, i / 60);
    if (i === 0) p.moveTo(q.x, q.y);
    else p.lineTo(q.x, q.y);
  }
  p.lineTo(r.cx - r.rx, r.baseY + 60);
  p.lineTo(r.cx + r.rx, r.baseY + 60);
  p.closePath();
  return p;
}

/** What a biome's scenery provides to the tank scene. */
export interface Scenery {
  paintFar(ctx: CanvasRenderingContext2D): void;
  paintMid(ctx: CanvasRenderingContext2D): void;
  /** Animated scenery drawn with the mid layer (e.g. the anemone). */
  drawLive?(ctx: CanvasRenderingContext2D, time: number): void;
  /** Where 'hover' fish like to stay. */
  home?: Vec;
  /** Under an overhang, where a royal gramma can swim upside down (v1.4). */
  ledge?: Vec;
  /** Where corals grow, for coral spawning (v1.4). */
  corals?: Vec[];
  bubbleSources: number[];
  grass: Array<{ x: number; spread: number; count: number }>;
}

export function createReefScenery(def: BiomeDef): Scenery {
  const layout = layoutReef(def);
  const a = layout.anemone;
  return {
    paintFar: (ctx) => paintFar(ctx, def),
    paintMid: (ctx) => paintMid(ctx, def, layout),
    drawLive: (ctx, time) => drawAnemone(ctx, a.x, a.y, a.size, time),
    home: { x: a.x, y: a.y - a.size * 0.55 },
    ledge: layout.ledge,
    corals: layout.corals,
    bubbleSources: layout.bubbleSources,
    grass: [
      { x: 60, spread: 120, count: 16 },
      { x: 1870, spread: 110, count: 14 },
    ],
  };
}

// ---------------------------------------------------------------- far layer

/** Water, glow from the surface, and distant silhouettes in the haze. Shared by all biomes. */
export function paintFar(ctx: CanvasRenderingContext2D, def: BiomeDef): void {
  const rng = createRng(def.seed + 100);
  const g = ctx.createLinearGradient(0, -BLEED, 0, H + BLEED);
  g.addColorStop(0, def.water[0]);
  g.addColorStop(0.5, def.water[1]);
  g.addColorStop(1, def.water[2]);
  ctx.fillStyle = g;
  ctx.fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);

  const glow = ctx.createRadialGradient(W * 0.45, -120, 50, W * 0.45, -120, 900);
  glow.addColorStop(0, 'rgba(220,250,255,0.35)');
  glow.addColorStop(1, 'rgba(220,250,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-BLEED, -BLEED, W + 2 * BLEED, H + 2 * BLEED);

  // Two rows of distant scenery, fading into the haze.
  const rows: Array<{ base: number; height: number; alpha: number; color: string }> = [
    { base: 860, height: 150, alpha: 0.35, color: def.farRows[0] },
    { base: 905, height: 190, alpha: 0.55, color: def.farRows[1] },
  ];
  for (const row of rows) {
    const ph = [rng() * TAU, rng() * TAU, rng() * TAU];
    ctx.beginPath();
    ctx.moveTo(-BLEED, H + BLEED);
    for (let x = -BLEED; x <= W + BLEED; x += 6) {
      const hgt =
        row.height *
        (0.45 + 0.3 * Math.sin(x * 0.004 + ph[0]!) + 0.15 * Math.sin(x * 0.013 + ph[1]!) + 0.08 * Math.sin(x * 0.041 + ph[2]!));
      ctx.lineTo(x, row.base - Math.max(10, hgt));
    }
    ctx.lineTo(W + BLEED, H + BLEED);
    ctx.closePath();
    ctx.globalAlpha = row.alpha;
    ctx.fillStyle = row.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Haze over the distance.
  const haze = ctx.createLinearGradient(0, 600, 0, H + BLEED);
  haze.addColorStop(0, 'rgba(0,0,0,0)');
  haze.addColorStop(1, hexA(def.haze, 0.45));
  ctx.fillStyle = haze;
  ctx.fillRect(-BLEED, 600, W + 2 * BLEED, H + BLEED);
}

// ---------------------------------------------------------------- mid layer

/** Sand, rocks and corals. Painted on a transparent layer. */
export function paintMid(ctx: CanvasRenderingContext2D, def: BiomeDef, layout: ReefLayout): void {
  const rng = createRng(def.seed + 200);

  // Sea fans grow behind the rocks.
  seaFan(ctx, rockPoint(layout.rocks[0]!, 0.42), 210, '#c9533f', rng);
  seaFan(ctx, rockPoint(layout.rocks[2]!, 0.62), 250, '#d7684a', rng);
  seaFan(ctx, rockPoint(layout.rocks[2]!, 0.3), 150, '#b9446a', rng);

  for (const r of layout.rocks) paintRock(ctx, r, rng);

  // Corals on the rocks, sampled along each rock's top.
  const decorate = (r: Rock, items: Array<[number, (p: Vec) => void]>) => {
    for (const [t, draw] of items) draw(rockPoint(r, t));
  };
  const [r0, r1, r2, r3, r4] = layout.rocks as [Rock, Rock, Rock, Rock, Rock];
  decorate(r0, [
    [0.18, (p) => brainCoral(ctx, p.x, p.y + 8, 70, 46, '#c9b277', rng)],
    [0.3, (p) => staghorn(ctx, p.x, p.y + 6, 120, '#e7a07c', '#ffd6bf', rng)],
    [0.55, (p) => tubeSponge(ctx, p.x, p.y + 10, 110, '#7d4fb0', rng)],
    [0.7, (p) => plateCoral(ctx, p.x, p.y + 4, 120, '#8a9a58', rng)],
    [0.82, (p) => softCoral(ctx, p.x, p.y + 6, 40, '#f29fb9', rng)],
  ]);
  decorate(r1, [
    [0.3, (p) => softCoral(ctx, p.x, p.y + 6, 34, '#ffd36b', rng)],
    [0.62, (p) => staghorn(ctx, p.x, p.y + 6, 80, '#9fc7d9', '#e6f6ff', rng)],
  ]);
  decorate(r2, [
    [0.15, (p) => tubeSponge(ctx, p.x, p.y + 10, 90, '#e0743b', rng)],
    [0.42, (p) => staghorn(ctx, p.x, p.y + 6, 150, '#d98bb5', '#ffd9ec', rng)],
    [0.55, (p) => brainCoral(ctx, p.x, p.y + 10, 95, 60, '#a8b86a', rng)],
    [0.75, (p) => plateCoral(ctx, p.x, p.y + 4, 150, '#b88c5c', rng)],
    [0.88, (p) => softCoral(ctx, p.x, p.y + 6, 46, '#9fe0c8', rng)],
  ]);
  decorate(r3, [
    [0.35, (p) => brainCoral(ctx, p.x, p.y + 8, 60, 38, '#d5a35c', rng)],
    [0.7, (p) => softCoral(ctx, p.x, p.y + 6, 36, '#ff9f7a', rng)],
  ]);
  decorate(r4, [[0.85, (p) => softCoral(ctx, p.x, p.y + 4, 22, '#ffe08a', rng)]]);

  // Sand last, so it covers the rock bases; then shells and pebbles.
  sand(ctx, def, rng);
  for (let i = 0; i < 40; i++) {
    const x = rng() * W;
    const y = lerp(def.floor.y + 25, H + 20, rng());
    const s = lerp(2, 7, rng());
    ctx.fillStyle = rng() < 0.5 ? 'rgba(120,100,70,0.45)' : 'rgba(255,250,235,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, s * 1.3, s, rng() * TAU, 0, TAU);
    ctx.fill();
  }
}

export function sand(ctx: CanvasRenderingContext2D, def: BiomeDef, rng: Rng): void {
  const top = def.floor.y;
  const ph = rng() * TAU;
  const p = new Path2D();
  p.moveTo(-BLEED, H + BLEED);
  for (let x = -BLEED; x <= W + BLEED; x += 8) {
    p.lineTo(x, top + 10 * Math.sin(x * 0.006 + ph) + 5 * Math.sin(x * 0.019));
  }
  p.lineTo(W + BLEED, H + BLEED);
  p.closePath();
  const g = ctx.createLinearGradient(0, top - 20, 0, H + BLEED);
  g.addColorStop(0, def.floor.top);
  g.addColorStop(1, def.floor.bottom);
  ctx.fillStyle = g;
  ctx.fill(p);
  // Ripples.
  ctx.save();
  ctx.clip(p);
  ctx.strokeStyle = 'rgba(120,100,70,0.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const y = lerp(top + 20, H + 10, rng());
    const x = lerp(-100, W, rng());
    const len = lerp(80, 260, rng());
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y - 8, x + len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function paintRock(ctx: CanvasRenderingContext2D, r: Rock, rng: Rng): void {
  const p = rockPath(r);
  const g = ctx.createLinearGradient(0, r.baseY - r.ry, 0, r.baseY);
  g.addColorStop(0, '#857c84');
  g.addColorStop(0.5, '#625c6c');
  g.addColorStop(1, '#3f3c4e');
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  // Texture: pits, light flecks and patches of pink coralline algae.
  const area = r.rx * r.ry;
  // Soft patches of pink coralline algae and darker weathering.
  for (let i = 0; i < area / 2500; i++) {
    const x = r.cx + (rng() * 2 - 1) * r.rx;
    const y = r.baseY - rng() * r.ry;
    const s = lerp(18, 50, rng());
    ctx.fillStyle = rng() < 0.5 ? 'rgba(200,110,150,0.13)' : 'rgba(25,25,45,0.12)';
    ctx.beginPath();
    ctx.ellipse(x, y, s * lerp(1, 2.2, rng()), s, rng() * TAU, 0, TAU);
    ctx.fill();
  }
  // Fine pits and flecks.
  for (let i = 0; i < area / 90; i++) {
    const x = r.cx + (rng() * 2 - 1) * r.rx;
    const y = r.baseY - rng() * r.ry;
    const s = lerp(1, 3.5, rng());
    ctx.fillStyle = rng() < 0.65 ? 'rgba(15,15,30,0.2)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(x, y, s, 0, TAU);
    ctx.fill();
  }
  // Light from above.
  const shade = ctx.createLinearGradient(0, r.baseY - r.ry, 0, r.baseY);
  shade.addColorStop(0, 'rgba(255,255,255,0.14)');
  shade.addColorStop(0.4, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,20,0.35)');
  ctx.fillStyle = shade;
  ctx.fill(p);
  ctx.restore();
}

function staghorn(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, tip: string, rng: Rng): void {
  ctx.lineCap = 'round';
  const branch = (bx: number, by: number, angle: number, len: number, width: number, depth: number) => {
    const ex = bx + Math.cos(angle) * len;
    const ey = by + Math.sin(angle) * len;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + Math.cos(angle + 0.25) * len * 0.5, by + Math.sin(angle + 0.25) * len * 0.5, ex, ey);
    ctx.stroke();
    if (depth <= 0 || len < 8) {
      ctx.fillStyle = tip;
      ctx.beginPath();
      ctx.arc(ex, ey, width * 0.55, 0, TAU);
      ctx.fill();
      return;
    }
    const n = rng() < 0.35 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spread = lerp(0.25, 0.6, rng()) * (i === 0 ? -1 : i === 1 ? 1 : 0.2);
      branch(ex, ey, angle + spread, len * lerp(0.62, 0.82, rng()), width * 0.78, depth - 1);
    }
  };
  for (let i = 0; i < 3; i++) {
    branch(x + (i - 1) * size * 0.12, y, -Math.PI / 2 + (i - 1) * 0.45, size * 0.38, size * 0.11, 4);
  }
}

function brainCoral(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, rng: Rng): void {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, 0, Math.PI, TAU);
  p.closePath();
  const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.7, 5, x, y, rx * 1.1);
  g.addColorStop(0, lighten(color, 0.25));
  g.addColorStop(1, darken(color, 0.3));
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.strokeStyle = darken(color, 0.45);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) {
    const yy = y - ry + (i + 0.5) * (ry / 9) * 1.1;
    const ph = rng() * TAU;
    ctx.beginPath();
    for (let xx = x - rx; xx <= x + rx; xx += 4) {
      const wy = yy + Math.sin(xx * 0.18 + ph) * 3.5;
      if (xx === x - rx) ctx.moveTo(xx, wy);
      else ctx.lineTo(xx, wy);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function tubeSponge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rng: Rng): void {
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const w = lerp(0.18, 0.28, rng()) * size;
    const h = lerp(0.5, 1, rng()) * size;
    const tx = x + (i - (n - 1) / 2) * w * 0.8;
    const lean = (i - (n - 1) / 2) * 0.12;
    ctx.save();
    ctx.translate(tx, y);
    ctx.rotate(lean);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, darken(color, 0.3));
    g.addColorStop(0.45, lighten(color, 0.15));
    g.addColorStop(1, darken(color, 0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 * 1.1, -h);
    ctx.lineTo(w / 2 * 1.1, -h);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = darken(color, 0.6);
    ctx.beginPath();
    ctx.ellipse(0, -h, w * 0.55, w * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = lighten(color, 0.2);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function plateCoral(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rng: Rng): void {
  for (let i = 0; i < 3; i++) {
    const w = size * (1 - i * 0.22);
    const yy = y - i * size * 0.16;
    const xx = x + (rng() - 0.5) * size * 0.15;
    // Stem.
    ctx.fillStyle = darken(color, 0.35);
    ctx.fillRect(xx - 4, yy, 8, size * 0.16);
    const g = ctx.createLinearGradient(0, yy - 12, 0, yy + 12);
    g.addColorStop(0, lighten(color, 0.25));
    g.addColorStop(1, darken(color, 0.3));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(xx, yy, w / 2, w * 0.09, 0, 0, TAU);
    ctx.fill();
  }
}

function softCoral(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, rng: Rng): void {
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI * lerp(0.1, 0.9, rng());
    const d = size * Math.sqrt(rng());
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.8;
    const r = lerp(0.12, 0.22, rng()) * size;
    ctx.fillStyle = rng() < 0.5 ? color : lighten(color, 0.2);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fill();
  }
}

function seaFan(ctx: CanvasRenderingContext2D, base: Vec, size: number, color: string, rng: Rng): void {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineCap = 'round';
  const branch = (x: number, y: number, angle: number, len: number, width: number, depth: number) => {
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (depth <= 0) return;
    branch(ex, ey, angle - lerp(0.15, 0.4, rng()), len * 0.78, width * 0.75, depth - 1);
    branch(ex, ey, angle + lerp(0.15, 0.4, rng()), len * 0.78, width * 0.75, depth - 1);
  };
  branch(base.x, base.y, -Math.PI / 2, size * 0.28, 5, 6);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- colour helpers

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}
export function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}
export function hexA(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
