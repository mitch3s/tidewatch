import { describe, expect, it } from 'vitest';
import { getSpecies, speciesIn } from '../../src/data/species';
import type { Species } from '../../src/data/types';
import { Tank } from '../../src/sim/tank';

const env = { bounds: { left: 60, right: 1860, top: 90, bottom: 875 }, home: { x: 960, y: 520 } };
const asSpecies = (id: string): Species => getSpecies(id)!;

function meanY(tank: Tank, id: string, seconds: number): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < seconds * 60; i++) {
    tank.update(1 / 60);
    if (i > seconds * 30) {
      for (const a of tank.agents) if (a.species.id === id) {
        sum += a.pos.y;
        n++;
      }
    }
  }
  return sum / n;
}

describe('deep-sea behaviour', () => {
  it('lanternfish rise toward the surface at night', () => {
    const day = new Tank(env, [asSpecies('spotted-lanternfish')], 4);
    const night = new Tank(env, [asSpecies('spotted-lanternfish')], 4);
    night.night = 1;
    expect(meanY(night, 'spotted-lanternfish', 60)).toBeLessThan(meanY(day, 'spotted-lanternfish', 60) - 150);
  });

  it('drifters stay slow and inside the tank', () => {
    const tank = new Tank(env, [asSpecies('atolla-jellyfish'), asSpecies('dumbo-octopus'), asSpecies('vampire-squid')], 9);
    for (let i = 0; i < 60 * 60; i++) {
      tank.update(1 / 60);
      for (const a of tank.agents) {
        expect(Math.hypot(a.vel.x, a.vel.y)).toBeLessThan(a.length * 0.6);
        expect(a.pos.x).toBeGreaterThan(env.bounds.left - 150);
        expect(a.pos.x).toBeLessThan(env.bounds.right + 150);
      }
    }
  });
});

describe('deep-sea roster', () => {
  it('has the six planned animals, with the anglerfish as its rare visitor', () => {
    const deep = speciesIn('deep');
    expect(deep.map((d) => d.id).sort()).toEqual(
      ['atolla-jellyfish', 'dumbo-octopus', 'humpback-anglerfish', 'lovely-hatchetfish', 'spotted-lanternfish', 'vampire-squid'],
    );
    expect(deep.filter((d) => d.rarity === 'rare').map((d) => d.id)).toEqual(['humpback-anglerfish']);
  });
});
