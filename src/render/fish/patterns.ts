import type { Body } from './body';
import type { PatternLayer } from './look';
import { lerp, TAU } from '../../util/math';
import { createRng } from '../../util/rng';

/**
 * Draw one pattern layer. Patterns are defined in body coordinates (u, v), so
 * they bend with the swimming body. The caller clips to the body outline,
 * which is why shapes are allowed to overshoot the edges (|v| > 1).
 */
export function drawPattern(ctx: CanvasRenderingContext2D, layer: PatternLayer, body: Body, px: number): void {
  switch (layer.type) {
    case 'band': {
      const curve = layer.curve ?? 0;
      const bulge = layer.bulge;
      const du = (v: number) => curve * (1 - v * v);
      // The bulge only moves the front edge, so the band widens into a point.
      const bump = (v: number) =>
        bulge ? bulge.amount * Math.exp(-(((v - bulge.v) / (bulge.spread ?? 0.35)) ** 2)) : 0;
      const vs: number[] = [];
      for (let i = 0; i <= 24; i++) vs.push(lerp(-1.4, 1.4, i / 24));
      const path = new Path2D();
      vs.forEach((v, i) => {
        const q = body.point(layer.at - layer.width / 2 + du(v) + bump(v), v);
        if (i === 0) path.moveTo(q.x, q.y);
        else path.lineTo(q.x, q.y);
      });
      for (let i = vs.length - 1; i >= 0; i--) {
        const v = vs[i]!;
        const q = body.point(layer.at + layer.width / 2 + du(v), v);
        path.lineTo(q.x, q.y);
      }
      path.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill(path);
      if (layer.edge) {
        ctx.strokeStyle = layer.edge;
        ctx.lineWidth = layer.edgeWidth ?? 2 * px;
        ctx.lineJoin = 'round';
        ctx.stroke(path);
      }
      return;
    }
    case 'stripe': {
      const n = 24;
      const path = new Path2D();
      const half = (s: number) => (layer.thickness / 2) * (layer.taper ? Math.pow(Math.sin(Math.PI * s), 0.5) : 1);
      const vAt = (s: number) => lerp(layer.v, layer.vEnd ?? layer.v, s);
      for (let i = 0; i <= n; i++) {
        const s = i / n;
        const q = body.point(lerp(layer.from, layer.to, s), vAt(s) - half(s));
        if (i === 0) path.moveTo(q.x, q.y);
        else path.lineTo(q.x, q.y);
      }
      for (let i = n; i >= 0; i--) {
        const s = i / n;
        const q = body.point(lerp(layer.from, layer.to, s), vAt(s) + half(s));
        path.lineTo(q.x, q.y);
      }
      path.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill(path);
      return;
    }
    case 'region': {
      const n = 24;
      const far = layer.side === 'upper' ? -1.4 : 1.4;
      const path = new Path2D();
      for (let i = 0; i <= n; i++) {
        const q = body.point(lerp(layer.from, layer.to, i / n), layer.boundary);
        if (i === 0) path.moveTo(q.x, q.y);
        else path.lineTo(q.x, q.y);
      }
      for (let i = n; i >= 0; i--) {
        const q = body.point(lerp(layer.from, layer.to, i / n), far);
        path.lineTo(q.x, q.y);
      }
      path.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill(path);
      return;
    }
    case 'spots': {
      const rnd = createRng(layer.seed);
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      for (let i = 0; i < layer.count; i++) {
        const u = lerp(layer.from, layer.to, rnd());
        const v = lerp(layer.vRange[0], layer.vRange[1], rnd());
        const r = lerp(layer.radius[0], layer.radius[1], rnd());
        const q = body.point(u, v);
        ctx.moveTo(q.x + r, q.y);
        ctx.arc(q.x, q.y, r, 0, TAU);
      }
      ctx.fill();
      return;
    }
    case 'swirls': {
      const rnd = createRng(layer.seed);
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = layer.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < layer.count; i++) {
        const v0 = lerp(-0.85, 0.85, rnd());
        const ph = rnd() * TAU;
        const u0 = lerp(0.05, 0.4, rnd());
        const u1 = lerp(0.6, 1.0, rnd());
        ctx.beginPath();
        for (let u = u0, j = 0; u <= u1; u += 0.015, j++) {
          const v = v0 + layer.amplitude * Math.sin(u * layer.frequency * TAU + ph);
          const q = body.point(u, v);
          if (j === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
      }
      return;
    }
    case 'outline':
      // Handled by the renderer, which owns the body path.
      return;
  }
}
