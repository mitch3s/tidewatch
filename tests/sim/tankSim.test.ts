import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, speciesIn } from '../../src/data/species';
import type { Species } from '../../src/data/types';
import { Tank } from '../../src/sim/tank';

const env = {
  bounds: { left: 60, right: 1860, top: 90, bottom: 875 },
  home: { x: 1150, y: 830 },
};

// A schooling species, to exercise the boids code before real schoolers exist.
const schooler: Species = {
  ...ALL_SPECIES[0]!,
  id: 'test-schooler',
  groupSize: [10, 10],
  displayLength: 40,
  look: { ...ALL_SPECIES[0]!.look, swim: { ...ALL_SPECIES[0]!.look.swim, behaviour: 'schooling', speed: [0.8, 1.4] } },
};

function tankCount(id: string): number {
  return new Tank(env, speciesIn('reef'), 42).agents.filter((a) => a.species.id === id).length;
}

function run(species: Species[], seconds: number, onStep?: (tank: Tank, t: number) => void): Tank {
  const tank = new Tank(env, species, 42);
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    tank.update(dt);
    onStep?.(tank, i * dt);
  }
  return tank;
}

describe('tank simulation (10 simulated minutes)', () => {
  it('keeps every fish inside the tank with finite numbers', () => {
    const margin = 80;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let finite = true;
    run([...ALL_SPECIES, schooler], 600, (tank) => {
      for (const a of tank.agents) {
        if (!Number.isFinite(a.pos.x) || !Number.isFinite(a.pos.y)) finite = false;
        minX = Math.min(minX, a.pos.x);
        maxX = Math.max(maxX, a.pos.x);
        minY = Math.min(minY, a.pos.y);
        maxY = Math.max(maxY, a.pos.y);
      }
    });
    expect(finite).toBe(true);
    expect(minX).toBeGreaterThan(env.bounds.left - margin);
    expect(maxX).toBeLessThan(env.bounds.right + margin);
    expect(minY).toBeGreaterThan(env.bounds.top - margin);
    expect(maxY).toBeLessThan(env.bounds.bottom + margin);
  }, 60_000);

  it("doesn't turn back and forth constantly", () => {
    const turns = new Map<string, number[]>();
    const wasTurning = new Map<object, boolean>();
    run(speciesIn('reef'), 600, (tank) => {
      for (const a of tank.agents) {
        const now = a.turn !== null;
        if (now && !wasTurning.get(a)) {
          const list = turns.get(a.species.id) ?? [];
          list.push(1);
          turns.set(a.species.id, list);
        }
        wasTurning.set(a, now);
      }
    });
    const perFish = new Map<string, number>();
    for (const [id, list] of turns) {
      const count = tankCount(id);
      perFish.set(id, list.length / count);
    }
    console.log('turns per fish in 10 min:', Object.fromEntries(perFish));
    // Cruisers swim long laps: on average no more than one turn every 15 s.
    expect(perFish.get('yellow-tang')!).toBeLessThan(600 / 15);
    expect(perFish.get('blue-tang')!).toBeLessThan(600 / 15);
    // Clownfish potter about near the anemone, but shouldn't fidget.
    expect(perFish.get('ocellaris-clownfish')!).toBeLessThan(600 / 8);
    expect(perFish.get('moorish-idol')!).toBeLessThan(600 / 15);
  });

  it('keeps clownfish near the anemone', () => {
    const clown = ALL_SPECIES.find((s) => s.id === 'ocellaris-clownfish')!;
    let far = 0;
    let samples = 0;
    run([clown], 600, (tank) => {
      for (const a of tank.agents) {
        samples++;
        if (Math.abs(a.pos.x - env.home.x) > 450) far++;
      }
    });
    expect(far / samples).toBeLessThan(0.05);
  });

  it('keeps a school together', () => {
    let spreadSum = 0;
    let n = 0;
    run([schooler], 300, (tank, t) => {
      if (t < 30) return;
      const xs = tank.agents.map((a) => a.pos.x);
      spreadSum += Math.max(...xs) - Math.min(...xs);
      n++;
    });
    expect(spreadSum / n).toBeLessThan(450);
  });
});
