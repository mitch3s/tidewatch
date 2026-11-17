import type { BodyShape, BodyTemplate } from './look';
import type { Vec } from '../../util/math';

/** A body shape with every value filled in. */
export type ResolvedBody = Required<BodyShape>;

const TEMPLATES: Record<BodyTemplate, Omit<ResolvedBody, 'template'>> = {
  torpedo: { upper: 0.13, lower: 0.12, maxAt: 0.35, peduncle: 0.35, bluntness: 0.5 },
  oval: { upper: 0.19, lower: 0.17, maxAt: 0.4, peduncle: 0.4, bluntness: 0.7 },
  disc: { upper: 0.3, lower: 0.3, maxAt: 0.45, peduncle: 0.25, bluntness: 0.8 },
  'tall-disc': { upper: 0.38, lower: 0.38, maxAt: 0.45, peduncle: 0.2, bluntness: 0.7 },
  elongated: { upper: 0.08, lower: 0.08, maxAt: 0.3, peduncle: 0.5, bluntness: 0.4 },
  'flat-bottom': { upper: 0.14, lower: 0.08, maxAt: 0.35, peduncle: 0.45, bluntness: 0.8 },
};

export function resolveBody(shape: BodyShape): ResolvedBody {
  const t = TEMPLATES[shape.template];
  return {
    template: shape.template,
    upper: shape.upper ?? t.upper,
    lower: shape.lower ?? t.lower,
    maxAt: shape.maxAt ?? t.maxAt,
    peduncle: shape.peduncle ?? t.peduncle,
    bluntness: shape.bluntness ?? t.bluntness,
  };
}

/** How many radians the swimming wave travels along the body. */
const WAVE_K = 3;

export interface Body {
  /** Half-height above (side -1) or below (side +1) the spine at u. */
  halfHeight(u: number, side: -1 | 1): number;
  /** Spine position at u (nose = 0, tail base = 1). */
  spine(u: number): Vec;
  /** Unit tangent at u, pointing from head toward tail. */
  tangent(u: number): Vec;
  /** Unit normal at u, pointing toward the belly (+v). */
  normal(u: number): Vec;
  /** Map body coordinates (u along, v across) to local fish coordinates. */
  point(u: number, v: number): Vec;
  /** Closed outline: along the top from nose to tail, back along the bottom. */
  outline(samples: number): Vec[];
  /**
   * The body as a strip of quads, all wound the same way. Filling these
   * (instead of the outline) leaves no holes while the body is folded
   * over itself mid-turn.
   */
  segments(samples: number): Vec[][];
}

/**
 * Turning. A fish turns by swinging its head round first, with the body
 * following. Seen from the side, each part of the body is foreshortened by
 * how far it has turned: `yaw` 0 faces the original way, π faces the
 * opposite way (the same as a mirrored fish).
 */
export interface Yaw {
  head: number;
  tail: number;
}

/**
 * Build the body for one frame.
 * @param phase swim phase in radians (advances with the tail beat)
 * @param flex  sideways bend at the tail, in body lengths
 */
export function makeBody(shape: ResolvedBody, phase: number, flex: number, yaw: Yaw = { head: 0, tail: 0 }): Body {
  const { upper, lower, maxAt, peduncle, bluntness } = shape;
  // Blunt heads rise steeply from the nose (small exponent).
  const headExp = 1.1 - 0.8 * bluntness;

  const profile = (u: number): number => {
    if (u <= 0) return 0;
    if (u >= 1) return peduncle;
    if (u <= maxAt) return Math.pow(Math.sin((u / maxAt) * (Math.PI / 2)), headExp);
    const s = (u - maxAt) / (1 - maxAt);
    return peduncle + (1 - peduncle) * Math.pow(Math.cos(s * (Math.PI / 2)), 1.2);
  };

  // The swim wave: zero at the head, growing toward the tail.
  const disp = (u: number) => flex * u * u * Math.sin(phase - u * WAVE_K);
  const dispDu = (u: number) =>
    flex * (2 * u * Math.sin(phase - u * WAVE_K) - u * u * WAVE_K * Math.cos(phase - u * WAVE_K));

  // Yaw varies linearly from head to tail; x is the integral of cos(yaw)
  // along the body, centred so the middle of the body stays put.
  const yawK = yaw.tail - yaw.head;
  const yawAt = (u: number) => yaw.head + yawK * u;
  const along = (u: number) =>
    Math.abs(yawK) < 1e-6 ? u * Math.cos(yaw.head) : (Math.sin(yaw.head + yawK * u) - Math.sin(yaw.head)) / yawK;
  const mid = along(0.5);

  const spine = (u: number): Vec => ({ x: -(along(u) - mid), y: disp(u) });
  /** Tangent toward the tail, foreshortened by the yaw (so not always unit length). */
  const tangent = (u: number): Vec => {
    const dy = dispDu(u);
    const len = Math.hypot(1, dy);
    return { x: -Math.cos(yawAt(u)) / len, y: dy / len };
  };
  /** Normal toward the belly. Turning doesn't change which way is down. */
  const normal = (u: number): Vec => {
    const dy = dispDu(u);
    const len = Math.hypot(1, dy);
    return { x: (dy * Math.cos(yawAt(u))) / len, y: 1 / len };
  };
  const halfHeight = (u: number, side: -1 | 1) => (side < 0 ? upper : lower) * profile(u);

  const point = (u: number, v: number): Vec => {
    const s = spine(u);
    const n = normal(u);
    const h = halfHeight(u, v < 0 ? -1 : 1);
    return { x: s.x + n.x * v * h, y: s.y + n.y * v * h };
  };

  const outline = (samples: number): Vec[] => {
    const pts: Vec[] = [];
    // Denser sampling near the nose, where the curve changes fastest.
    const us: number[] = [];
    for (let i = 0; i <= samples; i++) us.push(Math.pow(i / samples, 1.4));
    for (const u of us) pts.push(point(u, -1));
    for (let i = us.length - 1; i >= 0; i--) pts.push(point(us[i]!, 1));
    return pts;
  };

  const segments = (samples: number): Vec[][] => {
    const quads: Vec[][] = [];
    let prevU = 0;
    for (let i = 1; i <= samples; i++) {
      const u = Math.pow(i / samples, 1.4);
      const quad = [point(prevU, -1), point(u, -1), point(u, 1), point(prevU, 1)];
      // Shoelace area; flip quads that point the other way (folded parts).
      let area = 0;
      for (let j = 0; j < 4; j++) {
        const a = quad[j]!;
        const b = quad[(j + 1) % 4]!;
        area += a.x * b.y - b.x * a.y;
      }
      quads.push(area < 0 ? quad.reverse() : quad);
      prevU = u;
    }
    return quads;
  };

  return { halfHeight, spine, tangent, normal, point, outline, segments };
}
