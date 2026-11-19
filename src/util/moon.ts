/**
 * The moon's phase, worked out from the date (spec v1.4 §2). No network:
 * a known new moon plus whole average lunar months. Real months vary in
 * length, so it can be up to about half a day off: plenty for lighting a tank.
 */

/** Average length of a lunar month (new moon to new moon), in days. */
export const SYNODIC_DAYS = 29.530588853;
/** A known new moon: 6 January 2000, 18:14 UTC. */
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

/** Phase at a moment: 0 = new moon, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
export function moonPhase(date: Date): number {
  const days = (date.getTime() - NEW_MOON_MS) / DAY_MS;
  const p = (days / SYNODIC_DAYS) % 1;
  return p < 0 ? p + 1 : p;
}

/** How much of the moon's disc is lit, 0 (new) .. 1 (full). */
export function moonIllumination(phase: number): number {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

/** Within about a day of a new, quarter or full moon, it gets that name. */
const EXACT = 1 / SYNODIC_DAYS;

/** The usual name of a phase, e.g. "Waxing gibbous". */
export function moonPhaseName(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  const near = (target: number) => Math.min(Math.abs(p - target), 1 - Math.abs(p - target)) <= EXACT;
  if (near(0)) return 'New moon';
  if (near(0.25)) return 'First quarter';
  if (near(0.5)) return 'Full moon';
  if (near(0.75)) return 'Last quarter';
  if (p < 0.25) return 'Waxing crescent';
  if (p < 0.5) return 'Waxing gibbous';
  if (p < 0.75) return 'Waning gibbous';
  return 'Waning crescent';
}

/**
 * A small moon picture as inline SVG: a dark disc with the lit part on top,
 * as seen from the northern hemisphere (waxing lit on the right).
 */
export function moonIconSvg(phase: number, size = 40): string {
  const p = ((phase % 1) + 1) % 1;
  const r = 10;
  // The terminator is half an ellipse whose width follows the phase.
  const rx = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  const waxing = p < 0.5;
  const crescent = p < 0.25 || p > 0.75;
  // Lit limb: the right half when waxing, the left when waning.
  const limbSweep = waxing ? 1 : 0;
  // Back along the terminator: bulging toward the limb makes a crescent.
  const termSweep = waxing === crescent ? 0 : 1;
  const lit =
    moonIllumination(p) < 0.005
      ? ''
      : `<path d="M0,${-r} A${r},${r} 0 0 ${limbSweep} 0,${r} A${rx.toFixed(2)},${r} 0 0 ${termSweep} 0,${-r} Z" fill="#e9efff"/>`;
  return `<svg class="tw-moon-icon" width="${size}" height="${size}" viewBox="-11 -11 22 22" aria-hidden="true"><circle r="${r}" fill="#26334d" stroke="#5d6f94" stroke-width="0.6"/>${lit}</svg>`;
}
