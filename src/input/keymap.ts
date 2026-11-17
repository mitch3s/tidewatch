import type { Action } from './actions';

/** webOS remote key codes (LG webOS TV developer docs). */
export const WEBOS_KEY = {
  BACK: 461,
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
} as const;

const BY_CODE: Record<number, Action> = {
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  13: 'select',
  [WEBOS_KEY.BACK]: 'back',
  27: 'back', // Escape (desktop)
  8: 'back', // Backspace (desktop)
  [WEBOS_KEY.RED]: 'colorRed',
  [WEBOS_KEY.GREEN]: 'colorGreen',
  [WEBOS_KEY.YELLOW]: 'colorYellow',
  [WEBOS_KEY.BLUE]: 'colorBlue',
  // Desktop stand-ins for the colour buttons.
  49: 'colorRed',
  50: 'colorGreen',
  51: 'colorYellow',
  52: 'colorBlue',
};

/**
 * Map a key event to an action. `keyCode` is used because older webOS
 * browsers don't fill in `key` for remote buttons.
 */
export function keyToAction(e: { keyCode: number; key?: string }): Action | null {
  return BY_CODE[e.keyCode] ?? null;
}
