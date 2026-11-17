/**
 * The stage: one canvas with a fixed 1920×1080 logical size, scaled to fit
 * the viewport with letterboxing, and sharp on high-DPI screens.
 *
 * Everything else draws in logical coordinates (0..1920, 0..1080).
 */

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

/** Simulation runs at a fixed 60 Hz, independent of the display rate. */
export const SIM_STEP_S = 1 / 60;
/** Never simulate more than this many steps per frame (e.g. after a tab switch). */
const MAX_STEPS_PER_FRAME = 5;

export interface StageCallbacks {
  /** Advance the simulation by one fixed step of `dt` seconds. */
  update(dt: number): void;
  /**
   * Draw a frame. `alpha` (0..1) is how far we are between the last and next
   * simulation step, for smooth interpolation. `time` is seconds since start.
   */
  render(ctx: CanvasRenderingContext2D, alpha: number, time: number): void;
}

export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** CSS pixels per logical pixel (after letterboxing). */
  private cssScale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;
  private rafId = 0;
  private running = false;

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;
    host.appendChild(this.canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Fit the 16:9 stage into the host and size the backing store for the DPR. */
  resize(): void {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.cssScale = Math.min(w / STAGE_WIDTH, h / STAGE_HEIGHT);
    const cssW = Math.round(STAGE_WIDTH * this.cssScale);
    const cssH = Math.round(STAGE_HEIGHT * this.cssScale);
    this.offsetX = (w - cssW) / 2;
    this.offsetY = (h - cssH) / 2;
    // Cap the DPR: a 4K TV at DPR 2 would quadruple fill cost for little gain.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
  }

  /** Convert client (CSS) coordinates to logical stage coordinates. */
  clientToStage(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.cssScale,
      y: (clientY - rect.top) / this.cssScale,
    };
  }

  /** Letterbox offset in CSS pixels; useful for positioning DOM overlays. */
  get layout(): { scale: number; offsetX: number; offsetY: number } {
    return { scale: this.cssScale, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  start(cb: StageCallbacks): void {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    let acc = 0;
    const t0 = last;

    const frame = (now: number) => {
      if (!this.running) return;
      acc += Math.min((now - last) / 1000, SIM_STEP_S * MAX_STEPS_PER_FRAME);
      last = now;
      while (acc >= SIM_STEP_S) {
        cb.update(SIM_STEP_S);
        acc -= SIM_STEP_S;
      }
      const s = this.cssScale * this.dpr;
      this.ctx.setTransform(s, 0, 0, s, 0, 0);
      cb.render(this.ctx, acc / SIM_STEP_S, (now - t0) / 1000);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
