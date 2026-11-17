/**
 * Watches frame times and drops to 30 fps when the device can't keep up
 * (spec section 6). It's one-way for the session: once at 30 fps we can no
 * longer tell how fast a 60 fps frame would be.
 */
export class PerfGuard {
  private readonly window: number[] = [];
  private sum = 0;
  private slowFrames = 0;
  private auto: 60 | 30 = 60;
  private forced: 60 | 30 | null = null;

  constructor(
    /** Rolling window size, in frames. */
    private readonly windowSize = 60,
    /** Average frame time (ms) above which frames count as slow. */
    private readonly slowMs = 22,
    /** How many consecutive slow frames before dropping to 30 fps (~2 s). */
    private readonly patience = 120,
  ) {}

  get targetFps(): 60 | 30 {
    return this.forced ?? this.auto;
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
    this.window.push(frameMs);
    this.sum += frameMs;
    if (this.window.length > this.windowSize) this.sum -= this.window.shift()!;
    if (this.auto === 30) return;
    if (this.window.length >= this.windowSize && this.averageMs > this.slowMs) this.slowFrames++;
    else this.slowFrames = 0;
    if (this.slowFrames >= this.patience) this.auto = 30;
  }
}
