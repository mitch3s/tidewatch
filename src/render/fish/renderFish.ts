import { makeBody, resolveBody, type ResolvedBody } from './body';
import { finGeometry, type FinFrame } from './fins';
import type { Fin, FishLook } from './look';
import { drawPattern } from './patterns';
import { clamp, smoothstep, TAU } from '../../util/math';

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
  /**
   * Progress of a turn, 0..1 (0 = not turning). The head swings round first
   * and the tail follows; at 1 the fish faces the other way, so the caller
   * then flips `facing` and resets this to 0.
   */
  turn?: number;
}

/** Head and tail yaw for a turn in progress. */
export function turnYaw(turn: number): { head: number; tail: number } {
  const ease = (t: number) => smoothstep(clamp(t, 0, 1));
  return { head: Math.PI * ease(turn * 1.6), tail: Math.PI * ease(turn * 1.6 - 0.6) };
}

export interface RenderOptions {
  /** Draw the whole fish in one flat colour (codex "sighted" silhouettes). */
  silhouette?: string;
}

/** Colour for fine dark details (fin rays): deep water blue instead of black. */
const SHADOW_INK = '#06182a';

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
  const turn = pose.turn ?? 0;
  const body = makeBody(shape, pose.phase, pose.flex, turnYaw(turn));
  // How folded the body is mid-turn (0 = straight, 1 = most folded).
  const fold = Math.sin(Math.PI * clamp(turn, 0, 1));
  const px = 1 / pose.length; // one canvas pixel, in body units
  const detailed = pose.length >= 60;
  const frame: FinFrame = { phase: pose.phase, flex: pose.flex, finPhase: pose.finPhase };
  const sil = opts.silhouette;

  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.facing < 0 ? -pose.pitch : pose.pitch);
  ctx.scale(pose.length * pose.facing, pose.length);

  const samples = detailed ? 40 : 20;
  // Filled as a strip of consistently wound quads, so a body folded over
  // itself mid-turn has no holes. The outline is only used for the rim.
  const bodyPath = new Path2D();
  for (const quad of body.segments(samples)) {
    quad.forEach((q, i) => (i === 0 ? bodyPath.moveTo(q.x, q.y) : bodyPath.lineTo(q.x, q.y)));
    bodyPath.closePath();
  }
  const rimPath = new Path2D();
  body.outline(samples).forEach((q, i) => (i === 0 ? rimPath.moveTo(q.x, q.y) : rimPath.lineTo(q.x, q.y)));
  rimPath.closePath();

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
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = SHADOW_INK;
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

    // Lighting from the surface: a soft sheen just below the back, and a
    // shadow under the belly tinted by the water rather than black.
    const shade = ctx.createLinearGradient(0, -shape.upper, 0, shape.lower);
    shade.addColorStop(0, 'rgba(255,255,255,0.10)');
    shade.addColorStop(0.16, 'rgba(255,255,255,0.36)');
    shade.addColorStop(0.36, 'rgba(255,255,255,0.04)');
    shade.addColorStop(0.55, 'rgba(255,255,255,0)');
    shade.addColorStop(0.62, 'rgba(4,22,44,0)');
    shade.addColorStop(1, 'rgba(4,22,44,0.42)');
    ctx.fillStyle = shade;
    ctx.fill(bodyPath);

    // Rim light along the top edge (stroked inside the body clip, so only
    // the inner half of the line shows).
    if (detailed && fold < 0.95) {
      const rim = ctx.createLinearGradient(0, -shape.upper, 0, 0);
      rim.addColorStop(0, `rgba(235,250,255,${(0.55 * (1 - fold)).toFixed(3)})`);
      rim.addColorStop(1, 'rgba(235,250,255,0)');
      ctx.strokeStyle = rim;
      ctx.lineWidth = 5 * px;
      ctx.stroke(rimPath);
    }

    // Gill cover line.
    const gill = look.gill === undefined ? 0.22 : look.gill;
    if (detailed && gill !== null) {
      ctx.strokeStyle = 'rgba(4,22,44,0.22)';
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
        ctx.stroke(rimPath);
      }
    }
    // A faint darker rim keeps the fish readable against any background.
    // Deep water blue rather than black, so it doesn't read as a cartoon
    // outline. (Faded out mid-turn, when the outline crosses over the body.)
    if (fold < 0.95) {
      ctx.strokeStyle = `rgba(4,22,44,${(0.2 * (1 - fold)).toFixed(3)})`;
      ctx.lineWidth = 1.2 * px;
      ctx.stroke(rimPath);
    }

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
      const mouth = look.mouth ?? { length: 0.035, slope: -1.6 };
      const m0 = body.point(0.005, 0.18);
      const m1 = { x: m0.x - mouth.length, y: m0.y + mouth.slope * mouth.length };
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5 * px;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.lineTo(m1.x, m1.y);
      ctx.stroke();
    }

    // Barbels: fine whiskers hanging from the mouth.
    if (look.barbels && pose.length >= 40) {
      const b = look.barbels;
      const root = body.point(0.02, 0.45);
      ctx.strokeStyle = b.color ?? 'rgba(60,45,30,0.75)';
      ctx.lineWidth = Math.max(1.2 * px, 0.006);
      ctx.lineCap = 'round';
      for (let i = 0; i < b.count; i++) {
        const spread = b.count > 1 ? i / (b.count - 1) - 0.5 : 0;
        const sway = Math.sin(pose.finPhase * 0.7 + i) * 0.15;
        // Pointing down and forward from the chin.
        const ang = Math.PI / 2 - 0.55 + spread * 0.8 + sway;
        ctx.beginPath();
        ctx.moveTo(root.x, root.y);
        ctx.quadraticCurveTo(
          root.x + Math.cos(ang - 0.4) * b.length * 0.5,
          root.y + Math.sin(ang - 0.4) * b.length * 0.5,
          root.x + Math.cos(ang) * b.length,
          root.y + Math.sin(ang) * b.length,
        );
        ctx.stroke();
      }
    }
  }

  // Fins in front of the body.
  for (const fin of look.fins) if (fin.kind === 'pelvic') drawFin(fin);
  for (const fin of look.fins) if (fin.kind === 'pectoral') drawFin(fin);

  ctx.restore();
}
