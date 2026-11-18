import { clamp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';

/** Tile size in pixels and number of frames in the loop. */
const TILE = 192;
const FRAMES = 12;
/** Seconds for one full loop of the animation. */
const LOOP_S = 5;
/** Number of light cells in a tile. */
const CELLS = 11;

const cache = new Map<string, HTMLCanvasElement[]>();
/** Brightness of each frame (0..255 per pixel), shared by every colour. */
let shapes: Uint8ClampedArray[] | null = null;

/**
 * The bright, wobbling net of light that sunlight focused by surface waves
 * throws onto the floor. Computed once as a few tileable frames (warped
 * Voronoi cell edges on a torus, so the tile repeats seamlessly and the
 * loop closes), then drawn each frame as two cross-faded pattern fills.
 */
export function causticFrames(rgb: string): HTMLCanvasElement[] {
  const hit = cache.get(rgb);
  if (hit) return hit;
  const [r, g, b] = rgb.split(',').map(Number) as [number, number, number];
  shapes ??= computeShapes();
  const frames: HTMLCanvasElement[] = [];
  for (const shape of shapes) {
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    if (!ctx) return [];
    const img = ctx.createImageData(TILE, TILE);
    const d = img.data;
    for (let k = 0, n = 0; n < shape.length; n++, k += 4) {
      d[k] = r;
      d[k + 1] = g;
      d[k + 2] = b;
      d[k + 3] = shape[n]!;
    }
    ctx.putImageData(img, 0, 0);
    frames.push(c);
  }
  cache.set(rgb, frames);
  return frames;
}

/** The expensive part: the light net's brightness for every frame. */
function computeShapes(): Uint8ClampedArray[] {
  const rng = createRng(4242);
  const points = Array.from({ length: CELLS }, () => ({
    x: rng() * TILE,
    y: rng() * TILE,
    // Each point circles with a whole number of turns per loop, so frame
    // FRAMES equals frame 0.
    rx: 10 + rng() * 12,
    ry: 10 + rng() * 12,
    turns: rng() < 0.5 ? 1 : -1,
    phase: rng() * TAU,
  }));
  const out: Uint8ClampedArray[] = [];
  const px = new Float32Array(CELLS);
  const py = new Float32Array(CELLS);
  for (let f = 0; f < FRAMES; f++) {
    const t = (f / FRAMES) * TAU;
    points.forEach((p, i) => {
      px[i] = p.x + Math.cos(t * p.turns + p.phase) * p.rx;
      py[i] = p.y + Math.sin(t * p.turns + p.phase) * p.ry;
    });
    const shape = new Uint8ClampedArray(TILE * TILE);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        // Periodic warp: whole numbers of waves per tile keep it tileable.
        const wx = x + 7 * Math.sin((TAU * 2 * y) / TILE + t) + 3 * Math.sin((TAU * 5 * y) / TILE - t);
        const wy = y + 7 * Math.sin((TAU * 2 * x) / TILE - t) + 3 * Math.sin((TAU * 4 * x) / TILE + t);
        let d1 = 1e9;
        let d2 = 1e9;
        for (let i = 0; i < CELLS; i++) {
          let dx = Math.abs(wx - px[i]!) % TILE;
          let dy = Math.abs(wy - py[i]!) % TILE;
          if (dx > TILE / 2) dx = TILE - dx;
          if (dy > TILE / 2) dy = TILE - dy;
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
          } else if (dd < d2) d2 = dd;
        }
        // Distance to the nearest cell edge, roughly.
        const edge = Math.sqrt(d2) - Math.sqrt(d1);
        const line = clamp(1 - edge / 5, 0, 1);
        // Large, slowly shifting patches of brighter and dimmer light, so the
        // net doesn't look like a regular mesh (whole waves per tile: tileable).
        const patch =
          0.5 +
          0.3 * Math.sin((TAU * x) / TILE + (TAU * 2 * y) / TILE + t) +
          0.2 * Math.sin((TAU * 3 * x) / TILE - (TAU * y) / TILE - t);
        const v = line * clamp(patch, 0.25, 1);
        shape[y * TILE + x] = Math.round(255 * v * v);
      }
    }
    out.push(shape);
  }
  return out;
}

export interface CausticsStyle {
  /** Light colour as "r,g,b". */
  rgb: string;
  /** Overall strength at full daylight; above 1 draws the net more than once. */
  strength: number;
}

/** Caustic light on the sand, from the floor line down to the bottom of the screen. */
export class Caustics {
  private frames: HTMLCanvasElement[] = [];
  private patterns: Array<CanvasPattern | null> = [];

  constructor(
    private readonly floorY: number,
    private readonly style: CausticsStyle,
  ) {}

  draw(ctx: CanvasRenderingContext2D, time: number, intensity: number): void {
    const a = intensity * this.style.strength;
    if (a <= 0.01) return;
    if (this.frames.length === 0) {
      this.frames = causticFrames(this.style.rgb);
      this.patterns = this.frames.map((f) => ctx.createPattern(f, 'repeat'));
    }
    if (this.patterns.length === 0) return;
    const pos = ((time / LOOP_S) % 1) * FRAMES;
    const i = Math.floor(pos);
    const f = pos - i;
    // The sand's top edge undulates about ±15 px around floorY; start below
    // it and fade in over the first bands so no light lands on open water.
    const top = this.floorY + 16;
    const bands: Array<[number, number, number]> = [
      [top, top + 16, 0.3],
      [top + 16, top + 40, 0.65],
      [top + 40, top + 400, 1],
    ];
    const SX = 2.1;
    const SY = 0.75;
    const drift = (time * 12) % (TILE * SX);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(drift, top);
    ctx.scale(SX, SY);
    const x0 = (-200 - drift) / SX;
    const w = 2400 / SX;
    for (const [k, fw] of [
      [i % FRAMES, 1 - f],
      [(i + 1) % FRAMES, f],
    ] as const) {
      const p = this.patterns[k];
      if (!p || fw <= 0.01) continue;
      ctx.fillStyle = p;
      // Additive light can't exceed alpha 1 per fill, so strong settings
      // stack a second fill.
      const passes = Math.ceil(a);
      for (let pass = 0; pass < passes; pass++) {
        for (const [y0, y1, fade] of bands) {
          ctx.globalAlpha = (a / passes) * fw * fade;
          ctx.fillRect(x0, (y0 - top) / SY, w, (y1 - y0) / SY);
        }
      }
    }
    ctx.restore();
  }
}
