import { MOMENT_HOURS, type MomentDef, type MomentTime } from '../data/moments';
import type { SaveState } from '../save/schema';

/** Moments you haven't seen yet are this many times as likely (spec v1.4 §3.2). */
export const UNSEEN_WEIGHT = 3;

/** Whether an hour (0..24, local clock) is in a moment's time of day. */
export function inMomentTime(when: MomentTime, hour: number): boolean {
  if (when === 'any') return true;
  const h = ((hour % 24) + 24) % 24;
  const [from, to] = MOMENT_HOURS[when];
  return from < to ? h >= from && h < to : h >= from || h < to;
}

export interface MomentContext {
  /** Hour of the day, as for the lighting. */
  hour: number;
  /** How many of each species are in the tank on screen. */
  counts: ReadonlyMap<string, number>;
}

/** The moments that could start now in the tank on screen. */
export function momentCandidates(defs: readonly MomentDef[], ctx: MomentContext): MomentDef[] {
  return defs.filter((m) => (ctx.counts.get(m.speciesId) ?? 0) >= m.minCount && inMomentTime(m.when, ctx.hour));
}

/** Pick a moment by weight, favouring ones not yet witnessed. Null when none fits. */
export function pickMoment(defs: readonly MomentDef[], state: SaveState, ctx: MomentContext, rng: () => number): MomentDef | null {
  const pool = momentCandidates(defs, ctx);
  if (!pool.length) return null;
  const weight = (m: MomentDef) => m.weight * (state.moments[m.id] ? 1 : UNSEEN_WEIGHT);
  const total = pool.reduce((s, m) => s + weight(m), 0);
  let r = rng() * total;
  for (const m of pool) {
    r -= weight(m);
    if (r < 0) return m;
  }
  return pool[pool.length - 1]!;
}
