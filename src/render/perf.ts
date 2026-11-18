/**
 * Watches frame times and drops to 30 fps when the device can't keep up
 * (spec section 6), and tries 60 fps again later.
 *
 * - The first few seconds are ignored: startup (painting backgrounds,
 *   preparing fish sprites) is slow on every device.
 * - At 30 fps it can't tell whether 60 would now work, so every so often
 *   it tries 60 again for a moment. If that holds, it stays at 60; if not,
 *   it goes back to 30 and waits longer before the next try.
 */
export class PerfGuard {
  private readonly window: number[] = [];
  private sum = 0;
  private slowFrames = 0;
  private auto: 60 | 30 = 60;
  private forced: 60 | 30 | null = null;
  /** Total time sampled so far (ms), to skip the warm-up. */
  private elapsed = 0;
  /** Time spent at 30 fps since the last try at 60. */
  private at30 = 0;
  private retryMs: number;
  /** A trial at 60 fps is running. */
  private trial = false;
  private workAvg = 0;

  constructor(
    /** Rolling window size, in frames. */
    private readonly windowSize = 60,
    /** Average frame time (ms) above which frames count as slow. */
    private readonly slowMs = 22,
    /** How many consecutive slow frames before dropping to 30 fps (~2 s). */
    private readonly patience = 120,
    /** Startup time to ignore, in ms. */
    private readonly warmupMs = 5000,
    /** First wait before trying 60 fps again, in ms; doubles after each failed try. */
    private readonly firstRetryMs = 60_000,
    private readonly maxRetryMs = 600_000,
  ) {
    this.retryMs = firstRetryMs;
  }

  get targetFps(): 60 | 30 {
    return this.forced ?? this.auto;
  }

  /**
   * Rolling average of the time spent simulating and drawing each frame,
   * in ms. Unlike the frame interval this shows the headroom left: at
   * 60 fps the budget is 16.7 ms.
   */
  get workMs(): number {
    return this.workAvg;
  }

  /** Record how long one frame's update and render took. */
  sampleWork(ms: number): void {
    this.workAvg = this.workAvg === 0 ? ms : this.workAvg * 0.95 + ms * 0.05;
  }

  /** Rolling average frame time in ms (for the god-mode overlay). */
  get averageMs(): number {
    return this.window.length ? this.sum / this.window.length : 0;
  }

  /** Force a frame rate (god mode), or `null` to go back to automatic. */
  force(fps: 60 | 30 | null): void {
    this.forced = fps;
  }

  /** Record the time since the previous frame, in ms. */
  sample(frameMs: number): void {
    // A long gap (app hidden, TV waking up) says nothing about drawing speed.
    const ms = Math.min(frameMs, 250);
    this.elapsed += ms;
    this.window.push(ms);
    this.sum += ms;
    if (this.window.length > this.windowSize) this.sum -= this.window.shift()!;
    if (this.elapsed < this.warmupMs) return;

    if (this.auto === 30) {
      this.at30 += ms;
      if (this.at30 >= this.retryMs) this.startTrial();
      return;
    }

    const full = this.window.length >= this.windowSize;
    if (this.trial) {
      // Decide as soon as a full window of 60 fps frames is in.
      if (!full) return;
      this.trial = false;
      if (this.averageMs > this.slowMs) this.dropTo30(Math.min(this.retryMs * 2, this.maxRetryMs));
      else this.retryMs = this.firstRetryMs;
      return;
    }

    if (full && this.averageMs > this.slowMs) this.slowFrames++;
    else this.slowFrames = 0;
    if (this.slowFrames >= this.patience) this.dropTo30(this.retryMs);
  }

  private dropTo30(nextRetryMs: number): void {
    this.auto = 30;
    this.retryMs = nextRetryMs;
    this.at30 = 0;
    this.slowFrames = 0;
  }

  private startTrial(): void {
    this.auto = 60;
    this.trial = true;
    this.window.length = 0;
    this.sum = 0;
    this.slowFrames = 0;
  }
}
