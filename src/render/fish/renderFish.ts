import { makeBody, resolveBody, type ResolvedBody } from './body';
import { finGeometry, type FinFrame } from './fins';
import type { Fin, FishLook } from './look';
import { drawPattern } from './patterns';
import { TAU } from '../../util/math';

/** Where a fish is and what its body is doing this frame. */
export interface FishPose {
  /** Centre of the body, in canvas coordinates. */
  x: number;
  y: number;
  /** Body length (nose to tail base) in canvas pixels. */
  length: number;
  /**
   * +1 faces right, -1 faces left. Values in between are mid-turn
   * (the fish is seen narrowing as it turns).
   */
  facing: number;
  /** Tilt in radians; positive points the nose down. */
  pitch: number;
  /** Swim phase in radians (drives the body wave and tail). */
  phase: number;
  /** Body flex amount; usually `look.swim.flex`, scaled by effort. */
  flex: number;
  /** Pectoral fin flap phase in radians. */
  finPhase: number;
}

export interface RenderOptions {
  /** Draw the whole fish in one flat colour (codex "sighted" silhouettes). */
  silhouette?: string;
}

const resolved = new WeakMap<FishLook, ResolvedBody>();
function bodyShapeOf(look: FishLook): ResolvedBody {
  let r = resolved.get(look);
  if (!r) {
    r = resolveBody(look.body);
    resolved.set(look, r);
  }
  return r;
}

/** A neutral pose, handy for thumbnails and screenshots. */
export function restPose(x: number, y: number, length: number, facing = 1): FishPose {
  return { x, y, length, facing, pitch: 0, phase: 1.2, flex: 0.02, finPhase: 0.6 };
}

/**
 * Draw one fish. Shared by the tank, the codex and the fish lab, so a
 * species looks the same everywhere (spec section 6).
 */
export function renderFish(
  ctx: CanvasRenderingContext2D,
  look: FishLook,
  pose: FishPose,
  opts: RenderOptions = {},
): void {
  if (Math.abs(pose.facing) < 0.01 || pose.length <= 0) return;
  const shape = bodyShapeOf(look);
  const body = makeBody(shape, pose.phase, pose.flex);
  const px = 1 / pose.length; // one canvas pixel, in body units
  const detailed = pose.length >= 60;
  const frame: FinFrame = { phase: pose.phase, flex: pose.flex, finPhase: pose.finPhase };
  const sil = opts.silhouette;

  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.facing < 0 ? -pose.pitch : pose.pitch);
  ctx.scale(pose.length * pose.facing, pose.length);

  const bodyPath = new Path2D();
  body.outline(detailed ? 40 : 20).forEach((q, i) => (i === 0 ? bodyPath.moveTo(q.x, q.y) : bodyPath.lineTo(q.x, q.y)));
  bodyPath.closePath();

  const drawFin = (fin: Fin) => {
    const g = finGeometry(fin, body, frame);
    if (sil) {
      ctx.fillStyle = sil;
      ctx.fill(g.path);
      return;
    }
    ctx.globalAlpha = fin.opacity ?? (fin.kind === 'pectoral' ? 0.7 : 0.88);
    ctx.fillStyle = fin.color ?? look.palette.fin;
    ctx.fill(g.path);
    ctx.save();
    ctx.clip(g.path);
    if (detailed && fin.rays !== false) {
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = px;
      ctx.beginPath();
      for (const [a, b] of g.rays) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
    const edge = fin.edge ?? look.palette.finEdge;
    if (edge) {
      // Stroke at double width inside the clip, so the margin sits inside the fin.
      ctx.globalAlpha = 1;
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2 * (fin.edgeWidth ?? 3 * px);
      ctx.lineJoin = 'round';
      ctx.stroke(g.path);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  // Fins behind the body.
  for (const fin of look.fins) if (fin.kind === 'dorsal' || fin.kind === 'anal' || fin.kind === 'caudal') drawFin(fin);

  // Body.
  if (sil) {
    ctx.fillStyle = sil;
    ctx.fill(bodyPath);
  } else {
    const { palette } = look;
    const grad = ctx.createLinearGradient(0, -shape.upper, 0, shape.lower);
    grad.addColorStop(0, palette.back ?? palette.body);
    grad.addColorStop(0.5, palette.body);
    grad.addColorStop(1, palette.belly ?? palette.body);
    ctx.fillStyle = grad;
    ctx.fill(bodyPath);

    ctx.save();
    ctx.clip(bodyPath);
    for (const layer of look.pattern) drawPattern(ctx, layer, body, px);

    // Soft lighting from above: a highlight on the back, shadow under the belly.
    const shade = ctx.createLinearGradient(0, -shape.upper, 0, shape.lower);
    shade.addColorStop(0, 'rgba(255,255,255,0.20)');
    shade.addColorStop(0.35, 'rgba(255,255,255,0)');
    shade.addColorStop(0.65, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = shade;
    ctx.fill(bodyPath);

    // Gill cover line.
    const gill = look.gill === undefined ? 0.22 : look.gill;
    if (detailed && gill !== null) {
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1.5 * px;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const v = -0.7 + (1.5 * i) / 12;
        const q = body.point(gill + 0.03 * (1 - v * v), v);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    ctx.restore();

    for (const layer of look.pattern) {
      if (layer.type === 'outline') {
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.width;
        ctx.stroke(bodyPath);
      }
    }
    // A faint darker rim keeps the fish readable against any background.
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2 * px;
    ctx.stroke(bodyPath);

    // Eye.
    const { eye } = look;
    const e = body.point(eye.u, eye.v);
    const r = eye.size;
    ctx.fillStyle = eye.ring ?? 'rgba(20,16,12,0.85)';
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 1.18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = eye.iris;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(e.x + r * 0.08, e.y, r * 0.58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(e.x + r * 0.32, e.y - r * 0.32, r * 0.2, 0, TAU);
    ctx.fill();

    // Mouth.
    if (detailed) {
      const m0 = body.point(0.005, 0.18);
      const m1 = body.point(0.04, 0.12);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5 * px;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.lineTo(m1.x, m1.y);
      ctx.stroke();
    }
  }

  // Fins in front of the body.
  for (const fin of look.fins) if (fin.kind === 'pelvic') drawFin(fin);
  for (const fin of look.fins) if (fin.kind === 'pectoral') drawFin(fin);

  ctx.restore();
}
