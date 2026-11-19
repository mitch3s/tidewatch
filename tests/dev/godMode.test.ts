import { describe, expect, it } from 'vitest';
import { ALL_SPECIES } from '../../src/data/species';
import { ColorSequence } from '../../src/dev/colorSequence';
import { editableFields, setAtPath } from '../../src/dev/lookFields';
import { PRESETS } from '../../src/dev/presets';
import { migrate } from '../../src/save/migrations';
import { createRng } from '../../src/util/rng';

describe('ColorSequence (Red, Green, Yellow, Blue within 2 s)', () => {
  it('fires on the full sequence', () => {
    const s = new ColorSequence();
    expect(s.push('colorRed', 0)).toBe(false);
    expect(s.push('colorGreen', 300)).toBe(false);
    expect(s.push('colorYellow', 600)).toBe(false);
    expect(s.push('colorBlue', 900)).toBe(true);
  });

  it('needs it within 2 seconds', () => {
    const s = new ColorSequence();
    s.push('colorRed', 0);
    s.push('colorGreen', 800);
    s.push('colorYellow', 1600);
    expect(s.push('colorBlue', 2100)).toBe(false);
  });

  it('restarts on a wrong key', () => {
    const s = new ColorSequence();
    s.push('colorRed', 0);
    s.push('colorGreen', 100);
    s.push('left', 200);
    s.push('colorYellow', 300);
    expect(s.push('colorBlue', 400)).toBe(false);
    // A fresh attempt works.
    s.push('colorRed', 500);
    s.push('colorGreen', 600);
    s.push('colorYellow', 700);
    expect(s.push('colorBlue', 800)).toBe(true);
  });

  it('lets Red restart a sequence midway', () => {
    const s = new ColorSequence();
    s.push('colorRed', 0);
    s.push('colorRed', 100);
    s.push('colorGreen', 200);
    s.push('colorYellow', 300);
    expect(s.push('colorBlue', 400)).toBe(true);
  });
});

describe('editableFields (fish lab)', () => {
  const look = ALL_SPECIES[0]!.look;
  const fields = editableFields(look);

  it('finds numbers and colours throughout the look', () => {
    const paths = fields.map((f) => f.path);
    expect(paths).toContain('body.upper');
    expect(paths).toContain('palette.body');
    expect(paths).toContain('fins.0.size');
    expect(paths).toContain('pattern.0.at');
    expect(paths).toContain('eye.size');
    expect(paths).toContain('swim.speed.0');
  });

  it('gives sensible ranges', () => {
    const f = (p: string) => fields.find((x) => x.path === p)!;
    // Kept away from 0 and 1, where the body profile would divide by zero.
    expect(f('body.maxAt')).toMatchObject({ kind: 'number', min: 0.1, max: 0.9 });
    expect(f('body.bluntness')).toMatchObject({ kind: 'number', min: 0, max: 1 });
    expect(f('pattern.1.bulge.v')).toMatchObject({ kind: 'number', min: -1.5, max: 1.5 });
    expect(f('fins.4.angle')).toMatchObject({ kind: 'number', min: -30, max: 120 });
    expect(f('palette.body').kind).toBe('color');
    for (const x of fields) if (x.kind === 'number') expect(x.min).toBeLessThan(x.max);
  });

  it('setAtPath edits a copy, leaving the original alone', () => {
    const next = setAtPath(look, 'fins.0.size', 0.5);
    expect((next.fins[0] as { size: number }).size).toBe(0.5);
    expect((look.fins[0] as { size: number }).size).not.toBe(0.5);
    expect(next).not.toBe(look);
    expect(next.body).toBe(look.body);
  });
});

describe('save presets', () => {
  it('all produce valid saves', () => {
    for (const p of PRESETS) {
      const s = p.create(ALL_SPECIES, createRng(1));
      expect(migrate(JSON.parse(JSON.stringify(s)), ALL_SPECIES, createRng(1))).toEqual(s);
    }
  });

  it('"everything collected" collects everything', () => {
    const s = PRESETS.find((p) => p.id === 'all')!.create(ALL_SPECIES, createRng(1));
    expect(Object.values(s.species).every((p) => p.state === 'collected')).toBe(true);
    expect(s.unlockedBiomes).toEqual(['reef', 'amazon', 'deep']);
  });

  it('"reef nearly done" leaves only the rare reef visitor', () => {
    const s = PRESETS.find((p) => p.id === 'reef-nearly-done')!.create(ALL_SPECIES, createRng(1));
    const reef = ALL_SPECIES.filter((x) => x.biome === 'reef');
    const notCollected = reef.filter((x) => s.species[x.id]!.state !== 'collected').map((x) => x.id);
    expect(notCollected).toEqual(['mandarin-dragonet']);
  });
});
