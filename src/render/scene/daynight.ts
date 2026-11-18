import { lerp, smoothstep } from '../../util/math';

export interface Lighting {
  /** How dark it is, 0 (day) .. NIGHT_DARKNESS (night). */
  darkness: number;
  /** Sunlight ray intensity, 0..1. */
  rays: number;
  /** Moonlight, 0..1 (1 in the middle of the night). */
  moon: number;
  /** Warm dawn/dusk tint, 0..1. */
  warmth: number;
  /**
   * Colour to multiply the whole picture by, as [r, g, b] in 0..255.
   * White means no change. Night is darker and bluer; dawn and dusk warmer.
   */
  grade: [number, number, number];
}

const NIGHT_DARKNESS = 0.5;
/** Multiply colour in the middle of the night: about half as bright, shifted to blue. */
const NIGHT_GRADE: [number, number, number] = [92, 118, 178];
/** Multiply colour at the warmest point of dawn or dusk. */
const WARM_GRADE: [number, number, number] = [255, 196, 160];

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
  const night = 1 - day;
  const grade = [0, 1, 2].map((i) => {
    const cooled = lerp(255, NIGHT_GRADE[i]!, night);
    return Math.round(lerp(cooled, (cooled * WARM_GRADE[i]!) / 255, warmth));
  }) as [number, number, number];
  return { darkness: night * NIGHT_DARKNESS, rays: day, moon: night, warmth, grade };
}

/** Mix two "r,g,b" colours. */
export function mixRgb(a: string, b: string, t: number): string {
  const pa = a.split(',').map(Number);
  const pb = b.split(',').map(Number);
  return pa.map((v, i) => Math.round(lerp(v, pb[i]!, t))).join(',');
}
