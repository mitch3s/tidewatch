import type { Stage } from '../render/stage';
import './ui.css';

/** A 1920×1080 DOM layer kept exactly on top of the canvas. */
export class UiRoot {
  readonly el: HTMLDivElement;

  constructor(private readonly stage: Stage) {
    this.el = document.createElement('div');
    this.el.className = 'tw-ui';
    document.body.appendChild(this.el);
    this.layout();
    stage.onResize(() => this.layout());
  }

  setIdle(idle: boolean): void {
    this.el.classList.toggle('tw-idle', idle);
  }

  add<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, html = ''): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    e.className = className;
    e.innerHTML = html;
    this.el.appendChild(e);
    return e;
  }

  private layout(): void {
    const r = this.stage.canvas.getBoundingClientRect();
    this.el.style.transform = `translate(${r.left}px, ${r.top}px) scale(${this.stage.layout.scale})`;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
