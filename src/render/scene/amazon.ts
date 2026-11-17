/**
 * Amazon river scenery: tea-coloured blackwater in a flooded forest, with
 * tree trunks fading into the distance, sunken roots and branches, Amazon
 * sword plants, leaf litter and river stones, and floating leaves and roots
 * hanging down from the surface.
 */
import type { BiomeDef } from '../../data/biomes';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';
import { darken, lighten, paintFar, type Rng, sand, type Scenery } from './reef';

const W = STAGE_WIDTH;
const H = STAGE_HEIGHT;

export function createAmazonScenery(def: BiomeDef): Scenery {
  return {
    paintFar: (ctx) => {
      paintFar(ctx, def);
      paintFloodedForest(ctx, def);
    },
    paintMid: (ctx) => paintMid(ctx, def),
    drawLive: (ctx, time) => drawHangingRoots(ctx, time),
    // Angelfish and discus like to hover near the big root tangle on the right.
    home: { x: 1450, y: 560 },
    bubbleSources: [700, 1350],
    grass: [
      { x: 70, spread: 130, count: 14 },
      { x: 1860, spread: 120, count: 12 },
    ],
  };
}

/** Distant tree trunks of the flooded forest, fading into the haze. */
function paintFloodedForest(ctx: CanvasRenderingContext2D, def: BiomeDef): void {
  const rng = createRng(def.seed + 300);
  for (let layer = 0; layer < 2; layer++) {
    const n = layer === 0 ? 11 : 7;
    ctx.fillStyle = layer === 0 ? 'rgba(40,38,16,0.28)' : 'rgba(30,28,12,0.4)';
    for (let i = 0; i < n; i++) {
      const x = lerp(-60, W + 60, (i + rng()) / n);
      const w = lerp(18, 46, rng()) * (layer === 0 ? 0.8 : 1.2);
      const lean = lerp(-30, 30, rng());
      const bottom = def.floor.y - lerp(40, 120, rng());
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + lean, -100);
      ctx.lineTo(x + w / 2 + lean, -100);
      ctx.lineTo(x + w * 0.7, bottom);
      ctx.lineTo(x - w * 0.7, bottom);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Leaves floating on the surface throw dappled shade.
  for (let i = 0; i < 40; i++) {
    const x = rng() * (W + 200) - 100;
    const s = lerp(30, 70, rng());
    ctx.fillStyle = `rgba(25,30,10,${lerp(0.25, 0.5, rng()).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, lerp(-30, 12, rng()), s, s * 0.28, lerp(-0.2, 0.2, rng()), 0, TAU);
    ctx.fill();
  }
}

/** Fine roots hanging from the floating plants, swaying gently. */
function drawHangingRoots(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.strokeStyle = 'rgba(70,52,28,0.55)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = 120 + ((i * 271) % 1700);
    const len = 70 + ((i * 97) % 160);
    const sway = Math.sin(time * 0.4 + i * 1.7) * 10;
    ctx.lineWidth = 1.5 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.quadraticCurveTo(x + sway * 0.4, len * 0.5, x + sway, len);
    ctx.stroke();
  }
}

function paintMid(ctx: CanvasRenderingContext2D, def: BiomeDef): void {
  const rng = createRng(def.seed + 200);
  // Sunken roots and branches reaching in from the sides.
  root(ctx, -40, def.floor.y + 20, 520, -0.55, 46, rng);
  root(ctx, 180, def.floor.y + 30, 380, -0.95, 30, rng);
  root(ctx, W + 40, def.floor.y + 10, 600, -2.45, 52, rng);
  root(ctx, W - 260, def.floor.y + 30, 300, -2.1, 26, rng);
  // Amazon sword plants.
  swordPlant(ctx, 520, def.floor.y + 20, 230, rng);
  swordPlant(ctx, 1420, def.floor.y + 20, 280, rng);
  swordPlant(ctx, 1600, def.floor.y + 25, 180, rng);
  sand(ctx, def, rng);
  // River stones, half sunk in the sand.
  for (let i = 0; i < 9; i++) {
    const x = lerp(200, W - 200, rng());
    const y = def.floor.y + lerp(20, 90, rng());
    const rx = lerp(18, 46, rng());
    const g = ctx.createLinearGradient(0, y - rx * 0.6, 0, y + rx * 0.3);
    g.addColorStop(0, '#8a8068');
    g.addColorStop(1, '#4a4232');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.55, lerp(-0.2, 0.2, rng()), 0, TAU);
    ctx.fill();
  }
  // Leaf litter.
  for (let i = 0; i < 70; i++) {
    const x = rng() * W;
    const y = lerp(def.floor.y + 15, H + 30, rng());
    const s = lerp(8, 18, rng());
    ctx.fillStyle = ['#6b4a22', '#8a5f2a', '#4f3418', '#a07034'][Math.floor(rng() * 4)]!;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.4, rng() * TAU, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function root(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, width: number, rng: Rng): void {
  ctx.lineCap = 'round';
  const branch = (bx: number, by: number, a: number, l: number, w: number, depth: number) => {
    const ex = bx + Math.cos(a) * l;
    const ey = by + Math.sin(a) * l;
    const cx = bx + Math.cos(a + lerp(-0.4, 0.4, rng())) * l * 0.5;
    const cy = by + Math.sin(a + lerp(-0.4, 0.4, rng())) * l * 0.5;
    ctx.strokeStyle = '#3a2614';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,120,80,0.25)';
    ctx.lineWidth = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(bx, by - w * 0.2);
    ctx.quadraticCurveTo(cx, cy - w * 0.2, ex, ey - w * 0.2);
    ctx.stroke();
    if (depth <= 0) return;
    branch(ex, ey, a + lerp(0.2, 0.6, rng()), l * 0.6, w * 0.6, depth - 1);
    if (rng() < 0.7) branch(ex, ey, a - lerp(0.2, 0.6, rng()), l * 0.55, w * 0.55, depth - 1);
  };
  branch(x, y, angle, len * 0.5, width, 3);
}

function swordPlant(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rng: Rng): void {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + lerp(-0.9, 0.9, i / (n - 1)) + lerp(-0.1, 0.1, rng());
    const len = size * lerp(0.7, 1, rng());
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    const w = size * 0.11;
    const color = i % 2 ? '#4f8a2e' : '#3f7524';
    const g = ctx.createLinearGradient(x, y, ex, ey);
    g.addColorStop(0, darken(color, 0.3));
    g.addColorStop(1, lighten(color, 0.15));
    ctx.fillStyle = g;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    const mx = (x + ex) / 2;
    const my = (y + ey) / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx + nx, my + ny, ex, ey);
    ctx.quadraticCurveTo(mx - nx, my - ny, x, y);
    ctx.fill();
  }
}
