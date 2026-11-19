import type { Species } from '../data/types';
import { createRng } from '../util/rng';
import { FishAgent, type School, type TankEnv } from './fishAgent';
import { Food } from './food';
import { planPopulation } from './population';

/** Maximum fish in one tank (spec 4.4); tuned on real TVs in Milestone 8. */
export const FISH_CAP = 40;

/** All the fish in one tank. */
export class Tank {
  agents: FishAgent[] = [];
  readonly food: Food;
  /** 1 = daytime, lower = resting at night. Set by the scene from the lighting. */
  activity = 1;
  /** 0 (day) .. 1 (night), for species that migrate up at night. */
  night = 0;
  private readonly rng: () => number;

  constructor(
    readonly env: TankEnv,
    species: readonly Species[],
    seed: number,
    cap = FISH_CAP,
  ) {
    this.rng = createRng(seed);
    // Flakes settle just above the sand, where bottom-dwellers feed.
    this.food = new Food(env.bounds.bottom + 8, createRng(seed + 99));
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

  /**
   * Add a newly collected species. With `enter`, the fish swim in from the
   * side of the tank; otherwise they appear at `at` (a caught visitor).
   */
  addSpecies(species: Species, opts: { enter?: boolean; at?: { x: number; y: number; facing: 1 | -1 } } = {}): FishAgent[] {
    const [lo, hi] = species.groupSize;
    let n = lo + Math.floor(this.rng() * (hi - lo + 1));
    while (n > 1 && this.agents.length + n > FISH_CAP) n--;
    const school: School | null =
      species.look.swim.behaviour === 'schooling' && n > 1 ? { target: { x: 960, y: 500 }, retarget: 0, size: n } : null;
    const fromLeft = this.rng() < 0.5;
    const b = this.env.bounds;
    const [d0, d1] = species.look.swim.depth;
    const added: FishAgent[] = [];
    for (let i = 0; i < n; i++) {
      let spawn = opts.at;
      if (opts.enter) {
        const y = b.top + (b.bottom - b.top) * (d0 + (d1 - d0) * this.rng());
        spawn = { x: fromLeft ? b.left - 160 - i * 40 : b.right + 160 + i * 40, y, facing: fromLeft ? 1 : -1 };
      }
      const a = new FishAgent(species, this.env, this.rng, spawn);
      a.school = school;
      added.push(a);
    }
    this.agents.push(...added);
    this.sortByDepth();
    return added;
  }

  /** Add fish beyond the cap, for stress testing (god mode). */
  addExtras(species: readonly Species[], n: number): void {
    for (let i = 0; i < n; i++) {
      const s = species[Math.floor(this.rng() * species.length)]!;
      this.agents.push(new FishAgent(s, this.env, this.rng));
    }
    this.sortByDepth();
  }

  update(dt: number): void {
    this.food.update(dt);
    const mood = { food: this.food.flakes, activity: this.activity, night: this.night };
    for (const a of this.agents) a.update(dt, this.env, this.agents, mood);
  }

  /** Sprinkle food around x (world). Returns false while on cooldown. */
  feed(x: number): boolean {
    return this.food.drop(x);
  }

  /** Far fish first, so near fish are drawn on top. */
  private sortByDepth(): void {
    this.agents.sort((a, b) => a.z - b.z);
  }
}
