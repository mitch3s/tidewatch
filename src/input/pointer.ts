/**
 * Mouse and LG Magic Remote pointer input, in logical stage coordinates.
 *
 * The Magic Remote behaves like a mouse. webOS also fires a
 * `cursorStateChange` event on document when the pointer appears or hides
 * (e.g. the user switches to the D-pad).
 */

export type PointerEventKind = 'move' | 'down';

export interface StagePointerEvent {
  kind: PointerEventKind;
  x: number;
  y: number;
  /** True if the event landed on a DOM overlay rather than the canvas. */
  overUi: boolean;
}

export interface PointerOptions {
  toStage(clientX: number, clientY: number): { x: number; y: number };
  canvas: HTMLCanvasElement;
}

export class PointerInput {
  private listeners: Array<(e: StagePointerEvent) => void> = [];
  private visibilityListeners: Array<(visible: boolean) => void> = [];
  private _visible = false;

  constructor(private readonly opts: PointerOptions) {
    window.addEventListener('pointermove', (e) => this.emit('move', e));
    window.addEventListener('pointerdown', (e) => this.emit('down', e));
    document.addEventListener('cursorStateChange', (e: Event) => {
      const detail = (e as CustomEvent<{ visibility?: boolean }>).detail;
      this.setVisible(Boolean(detail?.visibility));
    });
  }

  /** Whether the pointer is currently in use (Magic Remote shown, or mouse moved). */
  get visible(): boolean {
    return this._visible;
  }

  on(cb: (e: StagePointerEvent) => void): void {
    this.listeners.push(cb);
  }

  onVisibilityChange(cb: (visible: boolean) => void): void {
    this.visibilityListeners.push(cb);
  }

  private emit(kind: PointerEventKind, e: PointerEvent): void {
    this.setVisible(true);
    const { x, y } = this.opts.toStage(e.clientX, e.clientY);
    const overUi = e.target !== this.opts.canvas;
    for (const l of this.listeners) l({ kind, x, y, overUi });
  }

  private setVisible(v: boolean): void {
    if (v === this._visible) return;
    this._visible = v;
    for (const l of this.visibilityListeners) l(v);
  }
}
