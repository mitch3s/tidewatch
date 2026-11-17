import type { Action } from '../input/actions';

const SEQUENCE: readonly Action[] = ['colorRed', 'colorGreen', 'colorYellow', 'colorBlue'];
const WINDOW_MS = 2000;

/** Detects Red, Green, Yellow, Blue pressed within 2 seconds (opens god mode on a TV). */
export class ColorSequence {
  private step = 0;
  private startedAt = 0;

  /** Feed every action; returns true when the sequence completes. */
  push(action: Action, now: number): boolean {
    if (action === SEQUENCE[0]) {
      this.step = 1;
      this.startedAt = now;
      return false;
    }
    if (this.step > 0 && action === SEQUENCE[this.step] && now - this.startedAt <= WINDOW_MS) {
      this.step++;
      if (this.step === SEQUENCE.length) {
        this.step = 0;
        return true;
      }
      return false;
    }
    this.step = 0;
    return false;
  }
}
