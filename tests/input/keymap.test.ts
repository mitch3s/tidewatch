import { describe, expect, it } from 'vitest';
import { keyToAction } from '../../src/input/keymap';

const k = (keyCode: number, key = '') => ({ keyCode, key });

describe('keyToAction', () => {
  it('maps the D-pad / arrow keys', () => {
    expect(keyToAction(k(37, 'ArrowLeft'))).toBe('left');
    expect(keyToAction(k(38, 'ArrowUp'))).toBe('up');
    expect(keyToAction(k(39, 'ArrowRight'))).toBe('right');
    expect(keyToAction(k(40, 'ArrowDown'))).toBe('down');
  });

  it('maps OK / Enter to select', () => {
    expect(keyToAction(k(13, 'Enter'))).toBe('select');
  });

  it('maps the webOS Back key and desktop equivalents to back', () => {
    expect(keyToAction(k(461))).toBe('back');
    expect(keyToAction(k(27, 'Escape'))).toBe('back');
    expect(keyToAction(k(8, 'Backspace'))).toBe('back');
  });

  it('maps the remote colour buttons', () => {
    expect(keyToAction(k(403))).toBe('colorRed');
    expect(keyToAction(k(404))).toBe('colorGreen');
    expect(keyToAction(k(405))).toBe('colorYellow');
    expect(keyToAction(k(406))).toBe('colorBlue');
  });

  it('maps desktop keys 1-4 to the colour buttons', () => {
    expect(keyToAction(k(49, '1'))).toBe('colorRed');
    expect(keyToAction(k(50, '2'))).toBe('colorGreen');
    expect(keyToAction(k(51, '3'))).toBe('colorYellow');
    expect(keyToAction(k(52, '4'))).toBe('colorBlue');
  });

  it('ignores unknown keys', () => {
    expect(keyToAction(k(65, 'a'))).toBeNull();
    expect(keyToAction(k(0, ''))).toBeNull();
  });
});
