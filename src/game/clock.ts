/** Longest real gap we count in one step, so a TV waking from sleep doesn't jump ahead. */
const MAX_STEP_MS = 5000;

/**
 * Game time. It only runs while the app is visible (spec 4.1: progress only
 * while the app is open), and can be sped up or paused for testing.
 */
export class RuntimeClock {
  timescale = 1;
  paused = false;
  visible = true;

  /** Turn a real elapsed time into game time. */
  advance(realMs: number): number {
    if (!this.visible || this.paused) return 0;
    return Math.min(realMs, MAX_STEP_MS) * this.timescale;
  }
}
