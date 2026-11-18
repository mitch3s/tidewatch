import { describe, expect, it } from 'vitest';
import { depthLevel } from '../../src/render/fish/sprites';

describe('depthLevel', () => {
  it('puts the farthest fish in the haziest level and near fish in none', () => {
    expect(depthLevel(0.75)).toBe(2);
    expect(depthLevel(0.9)).toBe(1);
    expect(depthLevel(1.1)).toBe(0);
  });

  it('never gets nearer as z decreases', () => {
    let prev = depthLevel(1.1);
    for (let z = 1.1; z >= 0.75; z -= 0.01) {
      const l = depthLevel(z);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
  });
});
