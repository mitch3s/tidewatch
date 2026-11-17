import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { BLEED } from './reef';

/**
 * A pre-rendered layer: painted once into an offscreen canvas (with a bleed
 * margin for camera drift), then drawn every frame with one drawImage.
 */
export class StaticLayer {
  private canvas: HTMLCanvasElement | null = null;
  private scale = 0;

  constructor(private readonly paint: (ctx: CanvasRenderingContext2D) => void) {}

  /** (Re)paint at the given backing-store scale if it changed. */
  prepare(pixelScale: number): void {
    // Offscreen layers don't need more than 1.5× (they're soft scenery anyway).
    const s = Math.min(pixelScale, 1.5);
    if (this.canvas && Math.abs(s - this.scale) < 0.01) return;
    this.scale = s;
    const c = this.canvas ?? document.createElement('canvas');
    c.width = Math.ceil((STAGE_WIDTH + 2 * BLEED) * s);
    c.height = Math.ceil((STAGE_HEIGHT + 2 * BLEED) * s);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported');
    ctx.setTransform(s, 0, 0, s, BLEED * s, BLEED * s);
    ctx.clearRect(-BLEED, -BLEED, STAGE_WIDTH + 2 * BLEED, STAGE_HEIGHT + 2 * BLEED);
    this.paint(ctx);
    this.canvas = c;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.canvas) return;
    ctx.drawImage(this.canvas, -BLEED, -BLEED, STAGE_WIDTH + 2 * BLEED, STAGE_HEIGHT + 2 * BLEED);
  }
}
