import type { Action } from './actions';

export type IdleDecision = 'pass' | 'swallow';

/**
 * Tracks whether the user is idle (spec 5.1 / 5.5).
 *
 * - Goes idle after `timeoutMs` without input.
 * - The first input while idle only wakes the UI and is swallowed,
 *   except `select` while a rare visitor is present (it always catches).
 *
 * Time is passed in, so this is pure and easy to test.
 */
export class IdleTracker {
  private lastInput: number;
  private idle = false;
  private listeners: Array<(idle: boolean) => void> = [];

  constructor(
    private readonly timeoutMs: number,
    now: number,
  ) {
    this.lastInput = now;
  }

  get isIdle(): boolean {
    return this.idle;
  }

  onChange(cb: (idle: boolean) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  /** Call every frame (or so) with the current time. */
  tick(now: number): void {
    if (!this.idle && now - this.lastInput >= this.timeoutMs) this.set(true);
  }

  /** Decide what to do with an action, and record the activity. */
  handle(action: Action, now: number, ctx: { visitorPresent?: boolean } = {}): IdleDecision {
    const wasIdle = this.idle;
    this.poke(now);
    if (!wasIdle) return 'pass';
    if (action === 'select' && ctx.visitorPresent) return 'pass';
    return 'swallow';
  }

  /** Activity that isn't an action (e.g. pointer movement): wake up only. */
  poke(now: number): void {
    this.lastInput = now;
    if (this.idle) this.set(false);
  }

  private set(idle: boolean): void {
    this.idle = idle;
    for (const l of this.listeners) l(idle);
  }
}
