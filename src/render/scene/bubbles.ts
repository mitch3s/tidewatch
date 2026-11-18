import { lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  wobble: number;
  phase: number;
}

interface Source {
  x: number;
  /** Seconds until the next burst starts. */
  wait: number;
  /** Bubbles left to release in the current burst. */
  left: number;
  next: number;
}

/** Streams of bubbles rising from the floor in occasional bursts. */
export class Bubbles {
  private readonly bubbles: Bubble[] = [];
  private readonly sources: Source[];
  private readonly rng: () => number;

  constructor(
    sources: number[],
    private readonly floorY: number,
    seed: number,
    private readonly max = 70,
    /** Called for each new bubble (radius in px, x), e.g. to play a sound. */
    private readonly onSpawn?: (r: number, x: number) => void,
  ) {
    this.rng = createRng(seed);
    this.sources = sources.map((x) => ({ x, wait: lerp(0, 4, this.rng()), left: 0, next: 0 }));
  }

  update(dt: number): void {
    const rng = this.rng;
    for (const s of this.sources) {
      if (s.left > 0) {
        s.next -= dt;
        if (s.next <= 0) {
          this.spawn(s.x + lerp(-6, 6, rng()), this.floorY);
          s.left--;
          s.next = lerp(0.08, 0.35, rng());
          if (s.left === 0) s.wait = lerp(4, 11, rng());
        }
      } else {
        s.wait -= dt;
        if (s.wait <= 0) s.left = 4 + Math.floor(rng() * 9);
      }
    }
    // An occasional lone bubble from anywhere on the floor.
    if (rng() < dt * 0.15) this.spawn(lerp(100, 1820, rng()), this.floorY + lerp(0, 60, rng()));

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]!;
      b.y += b.vy * dt;
      b.phase += dt * 3;
      if (b.y < -30) this.bubbles.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 1.5;
    for (const b of this.bubbles) {
      const x = b.x + Math.sin(b.phase) * b.wobble;
      ctx.fillStyle = 'rgba(210,245,255,0.12)';
      ctx.strokeStyle = 'rgba(225,250,255,0.55)';
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.28, 0, TAU);
      ctx.fill();
    }
  }

  private spawn(x: number, y: number): void {
    if (this.bubbles.length >= this.max) return;
    const r = lerp(2, 7, this.rng() ** 2);
    this.bubbles.push({ x, y, r, vy: -(45 + r * 12), wobble: lerp(2, 6, this.rng()), phase: this.rng() * TAU });
    this.onSpawn?.(r, x);
  }
}
