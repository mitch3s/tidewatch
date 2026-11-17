/**
 * When to switch tanks automatically (spec 5.1): every N minutes the
 * current tank has been on screen, but never while something should hold
 * it (a visitor in this tank, the codex open, a switch in progress).
 */
export class TankRotation {
  private shownFor = 0;

  /** Call when the tank changes for any reason (manual switches restart the timer). */
  reset(): void {
    this.shownFor = 0;
  }

  /**
   * Advance by `dt` seconds. Returns true when it's time to switch.
   * `minutes` 0 means automatic switching is off.
   */
  update(dt: number, ctx: { minutes: number; tanks: number; hold: boolean }): boolean {
    if (ctx.minutes <= 0 || ctx.tanks < 2 || ctx.hold) return false;
    this.shownFor += dt;
    if (this.shownFor >= ctx.minutes * 60) {
      this.shownFor = 0;
      return true;
    }
    return false;
  }
}
