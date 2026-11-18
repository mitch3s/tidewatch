import { describe, expect, it } from 'vitest';
import { Ambience, ambienceGain } from '../src/audio/ambience';

describe('ambienceGain', () => {
  it('is silent when off', () => {
    expect(ambienceGain('off', 0, false)).toBe(0);
  });

  it('is louder on normal than quiet', () => {
    expect(ambienceGain('normal', 0, false)).toBeGreaterThan(ambienceGain('quiet', 0, false));
  });

  it('is quieter at night and while ducked', () => {
    const day = ambienceGain('normal', 0, false);
    expect(ambienceGain('normal', 1, false)).toBeLessThan(day);
    expect(ambienceGain('normal', 0, true)).toBeLessThan(day);
  });
});

describe('Ambience without Web Audio', () => {
  it('does nothing and never throws', () => {
    const a = new Ambience();
    expect(Ambience.supported).toBe(false);
    a.setLevel('normal');
    a.unlock();
    a.setNight(1);
    a.setDucked(true);
    a.bubble(0.5, 0);
    a.setLevel('off');
  });
});
