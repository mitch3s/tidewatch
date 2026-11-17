import type { Body } from './body';
import type { CaudalFin, EdgeFin, Fin, PointFin } from './look';
import { DEG, lerp, type Vec } from '../../util/math';

/** A fin outline plus the rays to draw inside it. */
export interface FinGeometry {
  path: Path2D;
  /** Ray line segments [from, to]; they are clipped to the fin when drawn. */
  rays: Array<[Vec, Vec]>;
}

const add = (a: Vec, b: Vec, s = 1): Vec => ({ x: a.x + b.x * s, y: a.y + b.y * s });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const norm = (a: Vec): Vec => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};
const mix = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export interface FinFrame {
  /** Swim phase (radians), drives the tail. */
  phase: number;
  /** Body flex amount; the tail foreshortens more when flexing harder. */
  flex: number;
  /** Pectoral fin phase (radians), drives the fin flapping. */
  finPhase: number;
}

export function finGeometry(fin: Fin, body: Body, frame: FinFrame): FinGeometry {
  switch (fin.kind) {
    case 'dorsal':
    case 'anal':
      return edgeFin(fin, body);
    case 'caudal':
      return caudalFin(fin, body, frame);
    case 'pectoral':
    case 'pelvic':
      return pointFin(fin, body, frame);
  }
}

/** Dorsal and anal fins: rooted along the top or bottom edge of the body. */
function edgeFin(fin: EdgeFin, body: Body): FinGeometry {
  const side = fin.kind === 'dorsal' ? -1 : 1;
  // Root slightly inside the body so there is never a gap at the seam.
  const inset = 0.85;
  const A = body.point(fin.from, side * inset);
  const B = body.point(fin.to, side * inset);
  const tipU = lerp(fin.from, fin.to, fin.tipAt ?? 0.4);
  const out = scale(body.normal(tipU), side); // away from the body
  const back = body.tangent(tipU); // toward the tail
  const size = fin.size;
  const tip = add(add(body.point(tipU, side), out, size), back, fin.sweep ?? 0);

  const p = new Path2D();
  p.moveTo(A.x, A.y);
  switch (fin.shape) {
    case 'pointed': {
      const c1 = add(A, out, size * 0.5);
      const c2 = add(tip, back, -size * 0.2);
      p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, tip.x, tip.y);
      const c3 = add(mix(tip, B, 0.5), out, -size * 0.15);
      p.quadraticCurveTo(c3.x, c3.y, B.x, B.y);
      break;
    }
    case 'trailing': {
      const c1 = add(A, out, size * 0.4);
      const c2 = add(add(tip, back, -size * 0.35), out, -size * 0.1);
      p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, tip.x, tip.y);
      const c3 = add(mix(tip, B, 0.55), out, -size * 0.3);
      p.quadraticCurveTo(c3.x, c3.y, B.x, B.y);
      break;
    }
    case 'fan': {
      const c1 = add(A, out, size * 0.9);
      const c2 = add(tip, back, -size * 0.6);
      p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, tip.x, tip.y);
      const c3 = add(tip, back, size * 0.6);
      const c4 = add(B, out, size * 0.8);
      p.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, B.x, B.y);
      break;
    }
    default: {
      // 'rounded' and anything else.
      const c1 = add(A, out, size * 0.7);
      const c2 = add(tip, back, -size * 0.45);
      p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, tip.x, tip.y);
      const c3 = add(tip, back, size * 0.45);
      const c4 = add(B, out, size * 0.5);
      p.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, B.x, B.y);
    }
  }
  p.closePath();

  const rays: Array<[Vec, Vec]> = [];
  const n = Math.max(4, Math.round((fin.to - fin.from) * 40));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const root = mix(A, B, t);
    const dir = norm(mix(norm(sub(tip, root)), norm(add(out, back, 0.6)), t));
    rays.push([root, add(root, dir, size * 2)]);
  }
  return { path: p, rays };
}

/** The tail fin. It swings with the spine and foreshortens as it beats. */
function caudalFin(fin: CaudalFin, body: Body, frame: FinFrame): FinGeometry {
  const C = body.spine(1);
  const T = body.tangent(1);
  const N = body.normal(1);
  // Seen from the side, the tail looks shorter when it's swung toward or away from us.
  const swing = Math.abs(Math.sin(frame.phase - 3));
  const k = 1 - 0.25 * swing * Math.min(1, frame.flex / 0.03);
  const L = fin.size;
  const S = fin.spread;
  const wTop = body.halfHeight(1, -1) * 0.9;
  const wBot = body.halfHeight(1, 1) * 0.9;
  const a0 = -0.03;
  // Local (a along the tail, b across it; negative b is the top) → fish coordinates.
  const at = (a: number, b: number): Vec => add(add(C, T, a * k), N, b);

  const p = new Path2D();
  const move = (a: number, b: number) => {
    const q = at(a, b);
    p.moveTo(q.x, q.y);
  };
  const line = (a: number, b: number) => {
    const q = at(a, b);
    p.lineTo(q.x, q.y);
  };
  const quad = (ca: number, cb: number, a: number, b: number) => {
    const c = at(ca, cb);
    const q = at(a, b);
    p.quadraticCurveTo(c.x, c.y, q.x, q.y);
  };
  const cubic = (c1a: number, c1b: number, c2a: number, c2b: number, a: number, b: number) => {
    const c1 = at(c1a, c1b);
    const c2 = at(c2a, c2b);
    const q = at(a, b);
    p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, q.x, q.y);
  };

  move(a0, -wTop);
  switch (fin.shape) {
    case 'square':
      quad(L * 0.5, -S * 0.8, L, -S);
      line(L * 0.96, 0);
      line(L, S);
      quad(L * 0.5, S * 0.8, a0, wBot);
      break;
    case 'forked':
      quad(L * 0.55, -S * 0.75, L, -S);
      quad(L * 0.7, -S * 0.25, L * 0.55, 0);
      quad(L * 0.7, S * 0.25, L, S);
      quad(L * 0.55, S * 0.75, a0, wBot);
      break;
    case 'lyre':
    case 'trailing':
      quad(L * 0.6, -S * 0.6, L * 1.25, -S * 1.1);
      quad(L * 0.75, -S * 0.3, L * 0.45, 0);
      quad(L * 0.75, S * 0.3, L * 1.25, S * 1.1);
      quad(L * 0.6, S * 0.6, a0, wBot);
      break;
    case 'lunate':
      quad(L * 0.45, -S * 0.85, L, -S);
      quad(L * 0.85, -S * 0.35, L * 0.72, 0);
      quad(L * 0.85, S * 0.35, L, S);
      quad(L * 0.45, S * 0.85, a0, wBot);
      break;
    case 'pointed':
      quad(L * 0.5, -S, L, 0);
      quad(L * 0.5, S, a0, wBot);
      break;
    default:
      // 'rounded' / 'fan'
      cubic(L * 0.35, -S * 1.05, L, -S * 0.95, L, 0);
      cubic(L, S * 0.95, L * 0.35, S * 1.05, a0, wBot);
  }
  p.closePath();

  const rays: Array<[Vec, Vec]> = [];
  const origin = at(a0 - 0.05, 0);
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const ang = lerp(-1.1, 1.1, i / n);
    const dir = norm(add(scale(T, Math.cos(ang) * k), N, Math.sin(ang)));
    rays.push([origin, add(origin, dir, L * 2)]);
  }
  return { path: p, rays };
}

/** Pectoral and pelvic fins hang from a point and flap gently. */
function pointFin(fin: PointFin, body: Body, frame: FinFrame): FinGeometry {
  const P = body.point(fin.at[0], fin.at[1]);
  const T = body.tangent(fin.at[0]);
  const N = body.normal(fin.at[0]);
  const flapping = fin.kind === 'pectoral';
  const theta = (fin.angle + (flapping ? 14 * Math.sin(frame.finPhase) : 0)) * DEG;
  const dir = norm(add(scale(T, Math.cos(theta)), N, Math.sin(theta)));
  const perp = { x: -dir.y, y: dir.x };
  const L = fin.size * (flapping ? 0.75 + 0.25 * (0.5 + 0.5 * Math.cos(frame.finPhase)) : 1);
  const W = fin.size * (fin.width ?? 0.35);
  const at = (a: number, b: number): Vec => add(add(P, dir, a), perp, b);

  const p = new Path2D();
  p.moveTo(P.x, P.y);
  if (fin.shape === 'pointed' || fin.shape === 'trailing') {
    const c1 = at(L * 0.4, -W);
    const tip = at(L, 0);
    const c2 = at(L * 0.4, W * 0.6);
    p.quadraticCurveTo(c1.x, c1.y, tip.x, tip.y);
    p.quadraticCurveTo(c2.x, c2.y, P.x, P.y);
  } else {
    const c1 = at(L * 0.3, -W * 1.2);
    const e1 = at(L * 0.85, -W * 0.8);
    const c2 = at(L * 1.08, 0);
    const e2 = at(L * 0.85, W * 0.8);
    const c3 = at(L * 0.3, W * 1.2);
    p.quadraticCurveTo(c1.x, c1.y, e1.x, e1.y);
    p.quadraticCurveTo(c2.x, c2.y, e2.x, e2.y);
    p.quadraticCurveTo(c3.x, c3.y, P.x, P.y);
  }
  p.closePath();

  const rays: Array<[Vec, Vec]> = [];
  for (let i = 0; i <= 6; i++) {
    const ang = lerp(-0.45, 0.45, i / 6);
    const d = norm(add(scale(dir, Math.cos(ang)), perp, Math.sin(ang)));
    rays.push([P, add(P, d, L * 1.5)]);
  }
  return { path: p, rays };
}
