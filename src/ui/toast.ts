import { escapeHtml, type UiRoot } from './root';

export interface ToastMessage {
  kicker: string;
  title: string;
  body?: string;
  rare?: boolean;
}

const SHOW_MS = 6000;
/** Small position shifts so a toast never sits in exactly the same place (OLED). */
const OFFSETS: Array<[number, number]> = [
  [0, 0],
  [-60, 30],
  [70, 10],
  [-30, 50],
  [40, -10],
];

/** Short messages near the top of the screen, one at a time (spec 4.1, 4.2). */
export class Toasts {
  private queue: ToastMessage[] = [];
  private busy = false;
  private n = 0;

  constructor(private readonly root: UiRoot) {}

  show(msg: ToastMessage): void {
    this.queue.push(msg);
    if (!this.busy) this.next();
  }

  private next(): void {
    const msg = this.queue.shift();
    if (!msg) {
      this.busy = false;
      return;
    }
    this.busy = true;
    const [dx, dy] = OFFSETS[this.n++ % OFFSETS.length]!;
    const el = this.root.add(
      'div',
      `tw-toast${msg.rare ? ' tw-rare' : ''}`,
      `<div class="tw-kicker">${escapeHtml(msg.kicker)}</div>` +
        `<div class="tw-title">${escapeHtml(msg.title)}</div>` +
        (msg.body ? `<div class="tw-body">${escapeHtml(msg.body)}</div>` : ''),
    );
    el.setAttribute('role', 'status');
    el.style.marginLeft = `${dx}px`;
    el.style.marginTop = `${dy}px`;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('tw-show')));
    setTimeout(() => {
      el.classList.remove('tw-show');
      setTimeout(() => {
        el.remove();
        this.next();
      }, 900);
    }, SHOW_MS);
  }
}
