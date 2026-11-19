import type { FishAgent } from '../../sim/fishAgent';
import { lerp, type Vec } from '../../util/math';
import type { Camera } from './camera';

/** Seconds to zoom in, and to zoom back out. */
const EASE_S = 5;
/** Seconds between close-ups. */
const GAP_S: [number, number] = [180, 360];
/** Seconds spent following the fish. */
const HOLD_S: [number, number] = [20, 30];

/**
 * Now and then, zooms the camera in on one fish and follows it for a while,
 * like a nature documentary (spec v1.2 §4).
 */
export class Closeups {
  /** `fish` is set for an ordinary close-up; a moment's shot follows `focusOn` until ended. */
  private shot: { fish: FishAgent | null; focusOn: () => Vec; t: number; hold: number } | null = null;
  private wait: number;
  private readonly focus = { x: 0, y: 0 };

  constructor(private readonly rng: () => number) {
    this.wait = lerp(GAP_S[0], GAP_S[1], rng());
  }

  /** Whether a close-up is on screen (zooming in, following or zooming out). */
  get active(): boolean {
    return this.shot !== null;
  }

  /** Start one now (god mode, `?closeup=now`). Returns false if there's no fish to film. */
  start(fish: readonly FishAgent[]): boolean {
    // Prefer fish big enough to fill the shot and not hugging the edges.
    const good = fish.filter((f) => f.length >= 45 && f.pos.x > 300 && f.pos.x < 1620);
    const pool = good.length ? good : fish;
    if (!pool.length) return false;
    const pick = pool[Math.floor(this.rng() * pool.length)]!;
    // Frame a little ahead of where the fish is going.
    this.shot = {
      fish: pick,
      focusOn: () => ({ x: pick.pos.x + pick.facing * pick.length * 0.4, y: pick.pos.y }),
      t: 0,
      hold: lerp(HOLD_S[0], HOLD_S[1], this.rng()),
    };
    this.focus.x = pick.pos.x;
    this.focus.y = pick.pos.y;
    return true;
  }

  /** Zoom in on a moment and follow it until `end()` (spec v1.4 §3.2). */
  follow(focusOn: () => Vec): void {
    const p = focusOn();
    this.shot = { fish: null, focusOn, t: 0, hold: Infinity };
    this.focus.x = p.x;
    this.focus.y = p.y;
  }

  /** Zoom back out now (e.g. a rare visitor appeared). */
  end(): void {
    const s = this.shot;
    if (!s || s.t >= EASE_S + s.hold) return;
    // Continue from the current zoom so there's no jump.
    const amount = Math.min(1, s.t / EASE_S);
    s.hold = 0;
    s.t = EASE_S + (1 - amount) * EASE_S;
  }

  /**
   * @param allowed whether a close-up may run now (setting on, no visitor,
   *   tank on screen, codex closed). When it turns false, a running one ends.
   * @param mayStart whether a new close-up may start by itself (not during a moment).
   */
  update(dt: number, fish: readonly FishAgent[], camera: Camera, allowed: boolean, mayStart = true): void {
    if (!this.shot) {
      camera.closeup = 0;
      if (!allowed || !mayStart) return;
      this.wait -= dt;
      if (this.wait > 0) return;
      this.wait = lerp(GAP_S[0], GAP_S[1], this.rng());
      if (!this.start(fish)) return;
    }
    const s = this.shot!;
    if (!allowed || (s.fish && !fish.includes(s.fish))) this.end();
    s.t += dt;
    const out = s.t - EASE_S - s.hold;
    camera.closeup = s.t < EASE_S ? s.t / EASE_S : out > 0 ? 1 - out / EASE_S : 1;
    // Follow smoothly.
    const p = s.focusOn();
    const k = Math.min(1, dt * 1.2);
    this.focus.x += (p.x - this.focus.x) * k;
    this.focus.y += (p.y - this.focus.y) * k;
    camera.focus.x = this.focus.x;
    camera.focus.y = this.focus.y;
    if (out >= EASE_S) {
      this.shot = null;
      camera.closeup = 0;
    }
  }
}
