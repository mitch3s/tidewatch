/**
 * Steering behaviours (Craig Reynolds style). Each returns a steering
 * vector: a change of velocity the caller scales by a weight and adds up.
 * All pure functions on plain {x, y} vectors.
 */
import type { Vec } from '../util/math';

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const ZERO: Vec = { x: 0, y: 0 };

export function limit(v: Vec, max: number): Vec {
  const l = Math.hypot(v.x, v.y);
  if (l <= max || l === 0) return v;
  return { x: (v.x / l) * max, y: (v.y / l) * max };
}

/** Steer toward a target at full speed. */
export function seek(pos: Vec, vel: Vec, target: Vec, maxSpeed: number): Vec {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { x: -vel.x, y: -vel.y };
  return { x: (dx / d) * maxSpeed - vel.x, y: (dy / d) * maxSpeed - vel.y };
}

/** Like seek, but slowing down within `slowRadius` of the target. */
export function arrive(pos: Vec, vel: Vec, target: Vec, maxSpeed: number, slowRadius: number): Vec {
  const d = Math.hypot(target.x - pos.x, target.y - pos.y);
  const speed = d < slowRadius ? (maxSpeed * d) / slowRadius : maxSpeed;
  return seek(pos, vel, target, speed);
}

/** Push away from neighbours closer than `radius`, harder when closer. */
export function separation(pos: Vec, others: readonly Vec[], radius: number): Vec {
  let x = 0;
  let y = 0;
  for (const o of others) {
    const dx = pos.x - o.x;
    const dy = pos.y - o.y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d >= radius) continue;
    const strength = (radius - d) / radius;
    x += (dx / d) * strength;
    y += (dy / d) * strength;
  }
  return { x, y };
}

/** Offset to the centre of the neighbours (boids cohesion). */
export function cohesion(pos: Vec, others: readonly Vec[]): Vec {
  if (others.length === 0) return ZERO;
  let x = 0;
  let y = 0;
  for (const o of others) {
    x += o.x;
    y += o.y;
  }
  return { x: x / others.length - pos.x, y: y / others.length - pos.y };
}

/** Average velocity of the neighbours (boids alignment). */
export function alignment(_vel: Vec, otherVels: readonly Vec[]): Vec {
  if (otherVels.length === 0) return ZERO;
  let x = 0;
  let y = 0;
  for (const v of otherVels) {
    x += v.x;
    y += v.y;
  }
  return { x: x / otherVels.length, y: y / otherVels.length };
}

/** Push back inside `bounds` when within `margin` of an edge (0..1 per axis, squared). */
export function containment(pos: Vec, b: Bounds, margin: number): Vec {
  const push = (d: number) => (d >= margin ? 0 : ((margin - Math.max(d, 0)) / margin) ** 2);
  return {
    x: push(pos.x - b.left) - push(b.right - pos.x),
    y: push(pos.y - b.top) - push(b.bottom - pos.y),
  };
}
