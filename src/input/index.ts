import type { Action } from './actions';
import { keyToAction } from './keymap';

export type ActionListener = (action: Action, e: KeyboardEvent) => void;

/**
 * Listens for key events and turns them into semantic actions.
 * Handled keys get preventDefault so the browser (or webOS) doesn't also
 * act on them, e.g. Backspace navigating back or Back closing the app.
 */
export class InputManager {
  private listeners: ActionListener[] = [];
  private readonly onKeyDown = (e: KeyboardEvent) => {
    // Let people type in text fields (god mode, later) without triggering actions.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const action = keyToAction(e);
    if (!action) return;
    e.preventDefault();
    for (const l of this.listeners) l(action, e);
  };

  constructor(private readonly target: Window = window) {
    target.addEventListener('keydown', this.onKeyDown);
  }

  on(cb: ActionListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.listeners = [];
  }
}

export type { Action } from './actions';
