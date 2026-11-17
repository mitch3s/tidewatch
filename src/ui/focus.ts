/**
 * Spatial navigation for the D-pad (plan 7.1): from the focused element,
 * pick the best candidate in the pressed direction.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Choose the next item in a direction, or null if there's none. Candidates
 * must lie beyond the current item in that direction; among them, distance
 * along the direction counts, and being off to the side counts much more,
 * so what's straight ahead wins over something closer on a diagonal.
 */
export function findNext<T extends { rect: Rect }>(from: Rect, candidates: readonly T[], dir: Direction): T | null {
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  let best: T | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const r = c.rect;
    if (r === from || (r.x === from.x && r.y === from.y && r.w === from.w && r.h === from.h)) continue;
    let along: number;
    let side: number;
    switch (dir) {
      case 'right':
        along = r.x - (from.x + from.w);
        side = gap(cy, r.y, r.y + r.h);
        if (r.x + r.w / 2 <= cx) continue;
        break;
      case 'left':
        along = from.x - (r.x + r.w);
        side = gap(cy, r.y, r.y + r.h);
        if (r.x + r.w / 2 >= cx) continue;
        break;
      case 'down':
        along = r.y - (from.y + from.h);
        side = gap(cx, r.x, r.x + r.w);
        if (r.y + r.h / 2 <= cy) continue;
        break;
      case 'up':
        along = from.y - (r.y + r.h);
        side = gap(cx, r.x, r.x + r.w);
        if (r.y + r.h / 2 >= cy) continue;
        break;
    }
    const score = Math.max(0, along) + side * 8;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/** Distance from a point to a span (0 if inside it). */
function gap(p: number, lo: number, hi: number): number {
  return p < lo ? lo - p : p > hi ? p - hi : 0;
}

/**
 * Manages focus among the focusable elements inside a container
 * (elements with a `data-focus` attribute).
 */
export class FocusGroup {
  private current: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {}

  get focused(): HTMLElement | null {
    return this.current && this.root.contains(this.current) ? this.current : null;
  }

  elements(): HTMLElement[] {
    return Array.from(this.root.querySelectorAll<HTMLElement>('[data-focus]')).filter((e) => !e.hasAttribute('data-disabled'));
  }

  focus(el: HTMLElement | null): void {
    this.current?.classList.remove('tw-focused');
    this.current = el;
    el?.classList.add('tw-focused');
  }

  focusFirst(selector = '[data-focus]'): void {
    this.focus(this.root.querySelector<HTMLElement>(selector) ?? this.elements()[0] ?? null);
  }

  /** Move focus in a direction. Returns false if there was nowhere to go. */
  move(dir: Direction): boolean {
    const els = this.elements();
    const from = this.focused;
    if (!from) {
      this.focus(els[0] ?? null);
      return true;
    }
    const rectOf = (e: HTMLElement): Rect => ({ x: e.offsetLeft + offsetX(e), y: e.offsetTop + offsetY(e), w: e.offsetWidth, h: e.offsetHeight });
    const next = findNext(
      rectOf(from),
      els.filter((e) => e !== from).map((el) => ({ el, rect: rectOf(el) })),
      dir,
    );
    if (!next) return false;
    this.focus(next.el);
    return true;
  }
}

// Positions relative to the 1920×1080 UI root, unaffected by CSS scaling.
function offsetX(e: HTMLElement): number {
  let x = 0;
  let p = e.offsetParent as HTMLElement | null;
  while (p && !p.classList.contains('tw-ui')) {
    x += p.offsetLeft;
    p = p.offsetParent as HTMLElement | null;
  }
  return x;
}
function offsetY(e: HTMLElement): number {
  let y = 0;
  let p = e.offsetParent as HTMLElement | null;
  while (p && !p.classList.contains('tw-ui')) {
    y += p.offsetTop - p.scrollTop;
    p = p.offsetParent as HTMLElement | null;
  }
  return y;
}
