import { lerp, smoothstep } from '../../util/math';

export interface Lighting {
  /** Strength of the dark-blue night overlay, 0..1. */
  darkness: number;
  /** Light ray intensity, 0..1. */
  rays: number;
  /** Warm dawn/dusk tint, 0..1. */
  warmth: number;
}

const NIGHT_DARKNESS = 0.5;

/** [hour, dayness] keyframes; dayness 1 = full daylight. */
const KEYS: Array<[number, number]> = [
  [0, 0],
  [5.5, 0],
  [7.5, 1],
  [18, 1],
  [20.5, 0],
  [24, 0],
];

/** Lighting for a time of day, in hours (fractions allowed; wraps around). */
export function lightingAt(hour: number): Lighting {
  const h = ((hour % 24) + 24) % 24;
  let day = 0;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [h0, v0] = KEYS[i]!;
    const [h1, v1] = KEYS[i + 1]!;
    if (h >= h0 && h <= h1) {
      day = lerp(v0, v1, smoothstep((h - h0) / (h1 - h0)));
      break;
    }
  }
  let warmth = 0;
  if (h > 18 && h < 20.5) warmth = 0.6 * Math.sin((Math.PI * (h - 18)) / 2.5);
  else if (h > 5.5 && h < 7.5) warmth = 0.5 * Math.sin((Math.PI * (h - 5.5)) / 2);
  return { darkness: (1 - day) * NIGHT_DARKNESS, rays: day, warmth };
}
