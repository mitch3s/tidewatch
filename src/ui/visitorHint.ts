import type { UiRoot } from './root';

/**
 * "Press OK to catch" while a rare visitor is in the tank (spec 4.2). It
 * drifts slowly along the bottom so it never burns in, and a bar shows how
 * long is left.
 */
export class VisitorHint {
  private readonly el: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private visible = false;

  constructor(root: UiRoot) {
    this.el = root.add('div', 'tw-hint', '<b>OK</b> Catch the rare visitor!<div class="tw-bar"></div>');
    this.bar = this.el.querySelector('.tw-bar') as HTMLDivElement;
  }

  /** `remaining` is 0..1 of the catch window, or null to hide. */
  update(remaining: number | null, timeS: number): void {
    const show = remaining !== null;
    if (show !== this.visible) {
      this.visible = show;
      this.el.classList.toggle('tw-show', show);
    }
    if (remaining === null) return;
    this.bar.style.transform = `scaleX(${Math.max(0, remaining).toFixed(3)})`;
    const w = this.el.offsetWidth || 520;
    const x = 960 + Math.sin(timeS * 0.13) * 260 - w / 2;
    this.el.style.left = `${x.toFixed(1)}px`;
    this.el.style.marginBottom = `${(Math.sin(timeS * 0.21) * 20).toFixed(1)}px`;
  }
}
