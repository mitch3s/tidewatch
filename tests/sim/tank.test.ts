import { describe, expect, it } from 'vitest';
import { planPopulation, type PopulationEntry } from '../../src/sim/population';

const sp = (id: string, rarity: PopulationEntry['rarity'], groupSize: [number, number], length = 100): PopulationEntry => ({
  id,
  rarity,
  groupSize,
  length,
});

describe('planPopulation', () => {
  it('gives each species a group within its group size', () => {
    const plan = planPopulation([sp('a', 'common', [2, 2]), sp('b', 'common', [3, 5])], 40, () => 0.5);
    expect(plan.get('a')).toBe(2);
    expect(plan.get('b')).toBe(4);
  });

  it('keeps to the fish cap', () => {
    const many = Array.from({ length: 10 }, (_, i) => sp(`s${i}`, 'common', [8, 12]));
    const plan = planPopulation(many, 40, () => 0.99);
    const total = [...plan.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(40);
    for (const n of plan.values()) expect(n).toBeGreaterThanOrEqual(1);
  });

  it('trims big schools before rare or large fish', () => {
    const plan = planPopulation(
      [sp('school', 'common', [12, 12], 40), sp('rare', 'rare', [1, 1], 200), sp('big', 'uncommon', [2, 2], 180)],
      8,
      () => 0,
    );
    expect(plan.get('rare')).toBe(1);
    expect(plan.get('big')).toBe(2);
    expect(plan.get('school')).toBe(5);
  });

  it('always shows at least one of every collected species', () => {
    const list = Array.from({ length: 50 }, (_, i) => sp(`s${i}`, 'common', [3, 3]));
    const plan = planPopulation(list, 40, () => 0);
    expect(plan.size).toBe(50);
    for (const n of plan.values()) expect(n).toBe(1);
  });
});
