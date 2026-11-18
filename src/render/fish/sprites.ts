import type { Species } from '../../data/types';
import type { FishLook } from './look';
import { type FishPose, renderFish } from './renderFish';
import { TAU } from '../../util/math';

/** Frames per swim cycle. More is smoother but uses more memory. */
const FRAMES = 16;
/** Sprites are drawn at the largest size a tank fish can have (depth scale 1.1). */
const SIZE_FACTOR = 1.12;

/**
 * Depth levels: 0 = near (as drawn), 1 = middle distance, 2 = far. Distant
 * fish are tinted towards the water's haze colour (no blur: blurred fish
 * looked bad), baked into the cached frames so it costs nothing per frame.
 */
export type DepthLevel = 0 | 1 | 2;
export const HAZE_ALPHA: Record<DepthLevel, number> = { 0: 0, 1: 0.2, 2: 0.4 };

/** The depth level for a fish's depth value z (0.7 far .. 1.1 near). */
export function depthLevel(z: number): DepthLevel {
  return z < 0.83 ? 2 : z < 0.96 ? 1 : 0;
}


interface SpriteSet {
  look: FishLook;
  level: DepthLevel;
  pixelScale: number;
  /** Fish length the frames were drawn at, in logical pixels. */
  refLength: number;
  /** Frame size and where the fish's centre sits in it, in device pixels. */
  w: number;
  h: number;
  cx: number;
  cy: number;
  frames: Array<HTMLCanvasElement | null>;
}

/**
 * Caches each species' swim cycle as a few small images, so drawing a fish
 * in the tank is one image copy instead of a full vector render (the
 * biggest cost on TV hardware). Frames are drawn on first use. Turning fish
 * aren't cached; the caller draws those with renderFish.
 */
export class FishSprites {
  private readonly sets = new Map<string, SpriteSet>();

  /**
   * @param haze colour distant fish fade into (the biome's haze), as a CSS colour.
   */
  constructor(
    private readonly pixelScale: () => number,
    private readonly haze = '#0d6f94',
  ) {}

  /** Draw a fish from the cache. Returns false if the caller should draw it directly. */
  draw(ctx: CanvasRenderingContext2D, species: Species, pose: FishPose, level: DepthLevel = 0): boolean {
    if ((pose.turn ?? 0) > 0.001 || Math.abs(Math.abs(pose.facing) - 1) > 0.001) return false;
    const set = this.setFor(species, level);
    if (!set) return false;
    const phase = ((pose.phase % TAU) + TAU) % TAU;
    const i = Math.floor((phase / TAU) * FRAMES) % FRAMES;
    const frame = set.frames[i] ?? (set.frames[i] = this.renderFrame(species.look, set, i));
    if (!frame) return false;

    const ps = set.pixelScale;
    const s = pose.length / set.refLength;
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.facing < 0 ? -pose.pitch : pose.pitch);
    ctx.scale(s * pose.facing, s);
    ctx.drawImage(frame, -set.cx / ps, -set.cy / ps, set.w / ps, set.h / ps);
    ctx.restore();
    return true;
  }

  /** Forget everything (e.g. after a resize changes the pixel scale). */
  clear(): void {
    this.sets.clear();
  }

  private setFor(species: Species, level: DepthLevel): SpriteSet | null {
    const ps = Math.min(this.pixelScale(), 2);
    const key = `${species.id}:${level}`;
    let set = this.sets.get(key);
    if (set && set.look === species.look && set.pixelScale === ps) return set;
    const refLength = species.displayLength * SIZE_FACTOR;
    const bounds = measure(species.look, refLength, ps);
    if (!bounds) return null;
    set = { look: species.look, level, pixelScale: ps, refLength, ...bounds, frames: new Array(FRAMES).fill(null) };
    this.sets.set(key, set);
    return set;
  }

  private renderFrame(look: FishLook, set: SpriteSet, i: number): HTMLCanvasElement | null {
    const c = document.createElement('canvas');
    c.width = set.w;
    c.height = set.h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(set.pixelScale, 0, 0, set.pixelScale, 0, 0);
    renderFish(ctx, look, framePose(look, set.cx / set.pixelScale, set.cy / set.pixelScale, set.refLength, i));
    const haze = HAZE_ALPHA[set.level];
    if (haze > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = haze;
      ctx.fillStyle = this.haze;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    return c;
  }
}

/** The pose for cache frame i. Fins flap once per cycle so the loop is seamless. */
function framePose(look: FishLook, x: number, y: number, length: number, i: number): FishPose {
  const phase = (i / FRAMES) * TAU;
  return { x, y, length, facing: 1, pitch: 0, phase, flex: look.swim.flex, finPhase: phase };
}

/**
 * Find how big a frame needs to be: draw a few phases of the cycle into an
 * oversized canvas and take the bounding box of everything drawn.
 */
function measure(look: FishLook, length: number, ps: number): { w: number; h: number; cx: number; cy: number } | null {
  const W = Math.ceil(length * 2.6 * ps);
  const H = Math.ceil(length * 3 * ps);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const ox = W / 2 / ps;
  const oy = H / 2 / ps;
  ctx.setTransform(ps, 0, 0, ps, 0, 0);
  for (let i = 0; i < FRAMES; i += 4) renderFish(ctx, look, framePose(look, ox, oy, length, i));
  const data = ctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3]! > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  // A little margin for the parts of the cycle that weren't sampled.
  const m = Math.ceil(6 * ps);
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  x1 = Math.min(W - 1, x1 + m);
  y1 = Math.min(H - 1, y1 + m);
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, cx: ox * ps - x0, cy: oy * ps - y0 };
}
