import type { FishLook } from '../render/fish/look';

export type LookField =
  | { kind: 'number'; path: string; min: number; max: number; step: number }
  | { kind: 'color'; path: string };

/** Sensible slider ranges, by property name. */
const RANGES: Record<string, [number, number, number]> = {
  // Positions along the body and 0..1 ratios.
  u: [0, 1, 0.005],
  at: [0, 1.05, 0.005],
  from: [0, 1.05, 0.005],
  to: [0, 1.05, 0.005],
  tipAt: [0, 1, 0.01],
  maxAt: [0.1, 0.9, 0.01],
  peduncle: [0.05, 1, 0.01],
  bluntness: [0, 1, 0.01],
  opacity: [0, 1, 0.01],
  depth: [0, 1, 0.01],
  // Positions across the body.
  v: [-1.5, 1.5, 0.01],
  vEnd: [-1.5, 1.5, 0.01],
  boundary: [-1.5, 1.5, 0.01],
  vRange: [-1.5, 1.5, 0.01],
  angle: [-30, 120, 1],
  tailHz: [0.3, 6, 0.1],
  speed: [0, 3, 0.05],
  frequency: [0.2, 4, 0.05],
  count: [0, 120, 1],
  seed: [0, 100, 1],
  gill: [0, 1, 0.005],
};

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\()/i;

/** Every number and colour in a look, with a slider range for each (fish lab). */
export function editableFields(look: FishLook): LookField[] {
  const out: LookField[] = [];
  const walk = (value: unknown, path: string[], key: string) => {
    const p = path.join('.');
    if (typeof value === 'number') {
      const r = RANGES[key];
      if (r) out.push({ kind: 'number', path: p, min: r[0], max: r[1], step: r[2] });
      else {
        // Sizes and widths in body lengths: up to a bit more than the value.
        const max = Math.max(0.5, Math.ceil(Math.abs(value) * 3 * 100) / 100);
        out.push({ kind: 'number', path: p, min: 0, max, step: max / 200 });
      }
    } else if (typeof value === 'string' && COLOR.test(value)) {
      out.push({ kind: 'color', path: p });
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, [...path, String(i)], typeof v === 'number' ? key : String(i)));
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, [...path, k], k);
    }
  };
  walk(look, [], '');
  return out;
}

export function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

/**
 * Return a copy of `obj` with the value at `path` replaced. Only the objects
 * along the path are copied, so a new look object is produced each time
 * (the renderer caches per look object).
 */
export function setAtPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const copy = (Array.isArray(obj) ? [...obj] : { ...(obj as object) }) as Record<string, unknown>;
  copy[head!] = rest.length ? setAtPath(copy[head!], rest.join('.'), value) : value;
  return copy as T;
}
