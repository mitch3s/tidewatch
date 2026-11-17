import type { Action } from '../input/actions';
import { escapeHtml } from '../ui/root';

/** One row in the god-mode panel. */
export type Row =
  | { kind: 'header'; label: string }
  | { kind: 'info'; label: string; get: () => string }
  | { kind: 'button'; label: string; run: () => void; danger?: boolean }
  | { kind: 'toggle'; label: string; get: () => boolean; set: (v: boolean) => void }
  | { kind: 'choice'; label: string; options: () => Array<{ label: string; value: string }>; get: () => string; set: (v: string) => void }
  | { kind: 'slider'; label: string; min: number; max: number; step: number; get: () => number; set: (v: number) => void; format?: (v: number) => string }
  | { kind: 'color'; label: string; get: () => string; set: (v: string) => void }
  | { kind: 'textarea'; label: string; get: () => string; set: (v: string) => void };

const focusable = (r: Row) => r.kind !== 'header' && r.kind !== 'info';

/**
 * A side panel of rows, navigable with a TV remote (up/down to move,
 * left/right to adjust, OK to press) and with a mouse.
 */
export class Panel {
  readonly el: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly titleEl: HTMLDivElement;
  private rows: Row[] = [];
  private els: HTMLElement[] = [];
  private focus = -1;
  /** Buttons marked `danger` need a second press within 3 s. */
  private armed: { index: number; until: number } | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tw-god-panel';
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'tw-god-title';
    this.body = document.createElement('div');
    this.body.className = 'tw-god-body';
    this.el.append(this.titleEl, this.body);
    parent.appendChild(this.el);
  }

  setPage(title: string, rows: Row[], keepFocus = false): void {
    this.titleEl.innerHTML = `${escapeHtml(title)}<span>↑↓ move · ←→ adjust · OK press · Back close</span>`;
    const prevFocus = this.focus;
    this.rows = rows;
    this.body.innerHTML = '';
    this.els = rows.map((r, i) => this.renderRow(r, i));
    this.body.append(...this.els);
    const first = rows.findIndex(focusable);
    this.setFocus(keepFocus && prevFocus >= 0 && prevFocus < rows.length && focusable(rows[prevFocus]!) ? prevFocus : first);
    this.refresh();
  }

  /** Update every row's displayed value (call a few times a second). */
  refresh(): void {
    this.rows.forEach((r, i) => {
      const el = this.els[i]!;
      const value = el.querySelector('.tw-god-value') as HTMLElement | null;
      switch (r.kind) {
        case 'info':
          if (value) value.textContent = r.get();
          break;
        case 'toggle':
          if (value) value.textContent = r.get() ? 'on' : 'off';
          el.classList.toggle('tw-on', r.get());
          break;
        case 'choice': {
          const opt = r.options().find((o) => o.value === r.get());
          if (value) value.textContent = `‹ ${opt?.label ?? r.get()} ›`;
          break;
        }
        case 'slider': {
          const v = r.get();
          if (value) value.textContent = r.format ? r.format(v) : String(Math.round(v * 1000) / 1000);
          const input = el.querySelector('input') as HTMLInputElement;
          if (document.activeElement !== input) input.value = String(v);
          break;
        }
        case 'color': {
          const input = el.querySelector('input') as HTMLInputElement;
          const hex = toHex(r.get());
          if (hex && document.activeElement !== input) input.value = hex;
          if (value) value.textContent = r.get();
          break;
        }
        case 'textarea': {
          const ta = el.querySelector('textarea') as HTMLTextAreaElement;
          if (document.activeElement !== ta) ta.value = r.get();
          break;
        }
        default:
          break;
      }
    });
    if (this.armed && performance.now() > this.armed.until) this.disarm();
  }

  /** Handle a remote action. Returns true if the panel used it. */
  handle(action: Action): boolean {
    const row = this.rows[this.focus];
    switch (action) {
      case 'up':
        this.move(-1);
        return true;
      case 'down':
        this.move(1);
        return true;
      case 'left':
      case 'right': {
        const dir = action === 'left' ? -1 : 1;
        if (row?.kind === 'slider') {
          row.set(clampStep(row.get() + dir * row.step, row.min, row.max, row.step));
        } else if (row?.kind === 'choice') {
          const opts = row.options();
          const i = opts.findIndex((o) => o.value === row.get());
          const next = opts[(i + dir + opts.length) % opts.length];
          if (next) row.set(next.value);
        } else if (row?.kind === 'toggle') {
          row.set(dir > 0);
        }
        this.refresh();
        return true;
      }
      case 'select':
        if (row) this.activate(this.focus);
        return true;
      default:
        return false;
    }
  }

  private activate(i: number): void {
    const row = this.rows[i];
    if (!row) return;
    if (row.kind === 'button') {
      if (row.danger && !(this.armed && this.armed.index === i)) {
        this.armed = { index: i, until: performance.now() + 3000 };
        this.els[i]!.classList.add('tw-armed');
        (this.els[i]!.querySelector('.tw-god-value') as HTMLElement).textContent = 'press again to confirm';
        return;
      }
      this.disarm();
      row.run();
    } else if (row.kind === 'toggle') {
      row.set(!row.get());
    } else if (row.kind === 'color') {
      (this.els[i]!.querySelector('input') as HTMLInputElement).click();
    } else if (row.kind === 'textarea') {
      (this.els[i]!.querySelector('textarea') as HTMLTextAreaElement).focus();
    } else if (row.kind === 'choice') {
      this.handle('right');
    }
    this.refresh();
  }

  private disarm(): void {
    if (!this.armed) return;
    const el = this.els[this.armed.index];
    el?.classList.remove('tw-armed');
    const v = el?.querySelector('.tw-god-value') as HTMLElement | null;
    if (v) v.textContent = '';
    this.armed = null;
  }

  private move(dir: 1 | -1): void {
    let i = this.focus;
    for (let n = 0; n < this.rows.length; n++) {
      i = (i + dir + this.rows.length) % this.rows.length;
      if (focusable(this.rows[i]!)) break;
    }
    this.setFocus(i);
  }

  private setFocus(i: number): void {
    this.els[this.focus]?.classList.remove('tw-focus');
    this.focus = i;
    const el = this.els[i];
    if (!el) return;
    el.classList.add('tw-focus');
    // Keep the focused row in view (scrollIntoView with options isn't on old webOS).
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < this.body.scrollTop + 40) this.body.scrollTop = top - 40;
    else if (bottom > this.body.scrollTop + this.body.clientHeight - 40) this.body.scrollTop = bottom - this.body.clientHeight + 40;
  }

  private renderRow(r: Row, i: number): HTMLElement {
    const el = document.createElement('div');
    el.className = `tw-god-row tw-${r.kind}${r.kind === 'button' && r.danger ? ' tw-danger' : ''}`;
    const label = `<span class="tw-god-label">${escapeHtml(r.label)}</span>`;
    const value = '<span class="tw-god-value"></span>';
    switch (r.kind) {
      case 'header':
        el.innerHTML = escapeHtml(r.label);
        break;
      case 'slider':
        el.innerHTML = `${label}${value}<input type="range" min="${r.min}" max="${r.max}" step="${r.step}">`;
        el.querySelector('input')!.addEventListener('input', (e) => {
          r.set(Number((e.target as HTMLInputElement).value));
          this.refresh();
        });
        break;
      case 'color':
        el.innerHTML = `${label}${value}<input type="color">`;
        el.querySelector('input')!.addEventListener('input', (e) => {
          r.set((e.target as HTMLInputElement).value);
          this.refresh();
        });
        break;
      case 'textarea':
        el.innerHTML = `${label}<textarea spellcheck="false"></textarea>`;
        el.querySelector('textarea')!.addEventListener('change', (e) => r.set((e.target as HTMLTextAreaElement).value));
        break;
      default:
        el.innerHTML = `${label}${value}`;
    }
    if (focusable(r)) {
      el.addEventListener('click', (e) => {
        this.setFocus(i);
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') this.activate(i);
      });
    }
    return el;
  }
}

function clampStep(v: number, min: number, max: number, step: number): number {
  const s = Math.round((v - min) / step) * step + min;
  return Math.min(max, Math.max(min, Number(s.toFixed(6))));
}

/** A colour as #rrggbb for <input type=color>, or null if it isn't plain hex. */
function toHex(c: string): string | null {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toLowerCase();
  return null;
}

export const PANEL_CSS = `
.tw-god-badge { position: absolute; right: 648px; top: 24px; padding: 6px 14px; border-radius: 8px;
  background: #d6336c; color: #fff; font: 700 22px/1 system-ui, sans-serif; letter-spacing: 0.12em; pointer-events: none; }
.tw-god-panel { position: absolute; right: 0; top: 0; bottom: 0; width: 620px; display: flex; flex-direction: column;
  background: rgba(8, 14, 24, 0.9); border-left: 1px solid rgba(255,255,255,0.12); pointer-events: auto;
  font: 22px/1.3 system-ui, sans-serif; color: #e8f1f8; }
.tw-god-title { padding: 22px 26px 14px; font-size: 30px; font-weight: 650; border-bottom: 1px solid rgba(255,255,255,0.1); }
.tw-god-title span { display: block; margin-top: 4px; font-size: 17px; font-weight: 400; opacity: 0.55; }
.tw-god-body { flex: 1; overflow-y: auto; padding: 8px 0 40px; position: relative; }
.tw-god-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 9px 26px; border-left: 4px solid transparent; cursor: pointer; }
.tw-god-row.tw-header { margin-top: 14px; padding-top: 14px; font-size: 17px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: #7cc7ee; cursor: default; }
.tw-god-row.tw-info { cursor: default; opacity: 0.8; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 19px; }
.tw-god-row.tw-focus { background: rgba(124, 199, 238, 0.16); border-left-color: #7cc7ee; }
.tw-god-label { flex: 1; }
.tw-god-value { opacity: 0.85; font-variant-numeric: tabular-nums; }
.tw-god-row.tw-button .tw-god-label::before { content: '▸ '; opacity: 0.6; }
.tw-god-row.tw-danger .tw-god-label { color: #ff9b9b; }
.tw-god-row.tw-armed { background: rgba(255, 90, 90, 0.25); }
.tw-god-row.tw-on .tw-god-value { color: #8be08b; }
.tw-god-row input[type=range] { width: 100%; }
.tw-god-row input[type=color] { width: 56px; height: 30px; border: 0; padding: 0; background: none; }
.tw-god-row textarea { width: 100%; height: 160px; background: #0b1622; color: #cfe3f2; border: 1px solid #2a3a4c;
  border-radius: 6px; font: 15px/1.35 ui-monospace, Menlo, Consolas, monospace; }
/* Keep the timers readout clear of the panel, and hide the tank title in the lab. */
.tw-ui.tw-god-open .tw-debug { right: auto; left: 24px; }
.tw-ui.tw-god-lab .tw-brand { display: none; }
`;
