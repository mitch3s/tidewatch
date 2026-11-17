import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { TAU } from '../../util/math';

/**
 * A very slow pan and zoom (spec 5.1), applied with parallax: distant
 * layers move less than near ones, which gives the tank depth. It also
 * keeps the whole picture moving, which helps avoid OLED burn-in.
 */
export class Camera {
  /** Base zoom; always above 1 so the edges never show while panning. */
  zoom = 1.04;
  panX = 0;
  panY = 0;

  update(timeS: number): void {
    this.zoom = 1.045 + 0.012 * Math.sin((timeS * TAU) / 173);
    this.panX = 24 * Math.sin((timeS * TAU) / 241);
    this.panY = 10 * Math.sin((timeS * TAU) / 197 + 1.3);
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
