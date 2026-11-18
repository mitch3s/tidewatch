import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { clamp, lerp, smoothstep, TAU } from '../../util/math';

/** Zoom of a close-up on one fish (spec v1.2 §4). */
export const CLOSEUP_ZOOM = 1.4;

/**
 * A very slow pan and zoom (spec 5.1), applied with parallax: distant
 * layers move less than near ones, which gives the tank depth. It also
 * keeps the whole picture moving, which helps avoid OLED burn-in.
 *
 * It can also blend into a close-up: zoomed in and centred on a point.
 */
export class Camera {
  /** Base zoom; always above 1 so the edges never show while panning. */
  zoom = 1.04;
  panX = 0;
  panY = 0;
  /** Close-up blend, 0 (none) .. 1 (fully zoomed in). Eased internally. */
  closeup = 0;
  /** What the close-up is centred on, in world coordinates of the fish layer. */
  focus = { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 };

  update(timeS: number): void {
    const zoom = 1.045 + 0.012 * Math.sin((timeS * TAU) / 173);
    const panX = 24 * Math.sin((timeS * TAU) / 241);
    const panY = 10 * Math.sin((timeS * TAU) / 197 + 1.3);
    const e = smoothstep(clamp(this.closeup, 0, 1));
    this.zoom = lerp(zoom, CLOSEUP_ZOOM, e);
    // Keep the view inside the tank at this zoom.
    const hw = STAGE_WIDTH / (2 * this.zoom);
    const hh = STAGE_HEIGHT / (2 * this.zoom);
    const fx = clamp(this.focus.x, hw, STAGE_WIDTH - hw);
    const fy = clamp(this.focus.y, hh, STAGE_HEIGHT - hh);
    this.panX = lerp(panX, STAGE_WIDTH / 2 - fx, e);
    this.panY = lerp(panY, STAGE_HEIGHT / 2 - fy, e);
  }

  /** Apply the camera for a layer. Parallax 0 = fixed, 1 = the fish layer. */
  apply(ctx: CanvasRenderingContext2D, parallax: number): void {
    const z = 1 + (this.zoom - 1) * parallax;
    ctx.translate(STAGE_WIDTH / 2, STAGE_HEIGHT / 2);
    ctx.scale(z, z);
    ctx.translate(-STAGE_WIDTH / 2 + this.panX * parallax, -STAGE_HEIGHT / 2 + this.panY * parallax);
  }

  /** Convert a stage (screen) point to world coordinates on a layer. */
  toWorld(x: number, y: number, parallax = 1): { x: number; y: number } {
    const z = 1 + (this.zoom - 1) * parallax;
    return {
      x: (x - STAGE_WIDTH / 2) / z + STAGE_WIDTH / 2 - this.panX * parallax,
      y: (y - STAGE_HEIGHT / 2) / z + STAGE_HEIGHT / 2 - this.panY * parallax,
    };
  }
}
