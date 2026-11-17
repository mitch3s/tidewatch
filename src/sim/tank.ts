import type { Species } from '../data/types';
import { createRng } from '../util/rng';
import { FishAgent, type School, type TankEnv } from './fishAgent';
import { planPopulation } from './population';

/** Maximum fish in one tank (spec 4.4); tuned on real TVs in Milestone 8. */
export const FISH_CAP = 40;

/** All the fish in one tank. */
export class Tank {
  agents: FishAgent[] = [];
  private readonly rng: () => number;

  constructor(
    readonly env: TankEnv,
    species: readonly Species[],
    seed: number,
    cap = FISH_CAP,
  ) {
    this.rng = createRng(seed);
    this.populate(species, cap);
  }

  populate(species: readonly Species[], cap = FISH_CAP): void {
    const plan = planPopulation(
      species.map((s) => ({ id: s.id, rarity: s.rarity, groupSize: s.groupSize, length: s.displayLength })),
      cap,
      this.rng,
    );
    this.agents = [];
    for (const s of species) {
      const n = plan.get(s.id) ?? 0;
      const school: School | null =
        s.look.swim.behaviour === 'schooling' && n > 1 ? { target: { x: 960, y: 500 }, retarget: 0, size: n } : null;
      for (let i = 0; i < n; i++) {
        const a = new FishAgent(s, this.env, this.rng);
        a.school = school;
        this.agents.push(a);
      }
    }
    this.sortByDepth();
  }

  update(dt: number): void {
    for (const a of this.agents) a.update(dt, this.env, this.agents);
  }

  /** Far fish first, so near fish are drawn on top. */
  private sortByDepth(): void {
    this.agents.sort((a, b) => a.z - b.z);
  }
}
