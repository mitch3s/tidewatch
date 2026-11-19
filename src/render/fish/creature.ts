import type { CephalopodForm, CreatureForm, FishLook, JellyForm } from './look';
import type { FishPose, RenderOptions } from './renderFish';
import { TAU } from '../../util/math';

/**
 * Animals that aren't fish (spec v1.3): jellyfish and deep-sea cephalopods.
 * Drawn in "body units" like fish: the creature is 1 unit across (a jelly's
 * bell diameter; a cephalopod's mantle plus arms, top to bottom), centred on
 * the pose position. `pose.phase` drives the pulse of the bell or web, and
 * `pose.finPhase` the fins.
 */
export function renderCreature(ctx: CanvasRenderingContext2D, look: FishLook, pose: FishPose, opts: RenderOptions = {}): void {
  const form = look.creature!;
  ctx.save();
  ctx.translate(pose.x, pose.y);
  // Facing only mirrors cephalopods (jellies look the same either way), and
  // they tilt into the direction they swim.
  const dir = form.kind === 'jelly' ? 1 : pose.facing < 0 ? -1 : 1;
  ctx.rotate(form.kind === 'jelly' ? pose.pitch * 0.3 : pose.pitch * 0.5 * dir);
  // A cephalopod turning round narrows and widens again, like a fish does.
  const turn = form.kind === 'jelly' ? 0 : pose.turn ?? 0;
  const squash = Math.max(0.08, Math.abs(Math.cos(Math.PI * turn)));
  ctx.scale(pose.length * dir * squash, pose.length);
  if (form.kind === 'jelly') drawJelly(ctx, form, pose, opts, look);
  else drawCephalopod(ctx, form, pose, opts, look);
  ctx.restore();
}

/** How contracted the bell or web is, 0 (open) .. 1 (squeezed). */
function pulse(phase: number): number {
  const s = Math.sin(phase);
  // Quick squeeze, slow relax.
  return s > 0 ? s * s : 0;
}

// ---------------------------------------------------------------- jellyfish

function jellyShape(form: JellyForm, phase: number) {
  const p = pulse(phase);
  const w = 1 - 0.16 * p;
  const h = form.height * (1 + 0.14 * p);
  const rim = h * 0.4;
  const top = -h * 0.6;
  return { w, h, rim, top, p };
}

/** Points around a jelly's rim, in body units, for photophores. */
export function jellyRimPoints(form: JellyForm, phase: number, count: number): Array<[number, number]> {
  const { w, rim } = jellyShape(form, phase);
  return Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const x = (t - 0.5) * w * 0.92;
    return [x, rim - 0.02 + 0.03 * Math.abs(x)] as [number, number];
  });
}

function drawJelly(ctx: CanvasRenderingContext2D, form: JellyForm, pose: FishPose, opts: RenderOptions, look: FishLook): void {
  const sil = opts.silhouette;
  const { w, h, rim, top } = jellyShape(form, pose.phase);
  const t = form.tentacles;

  // Tentacles hang behind the bell and trail in waves.
  ctx.lineCap = 'round';
  ctx.strokeStyle = sil ?? t.color;
  ctx.lineWidth = 0.008;
  const tentacle = (x0: number, len: number, seed: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, rim);
    for (let k = 1; k <= 10; k++) {
      const s = k / 10;
      const x = x0 * (1 - 0.3 * s) + Math.sin(pose.phase * 0.6 - s * 4 + seed) * 0.05 * s;
      ctx.lineTo(x, rim + s * len);
    }
    ctx.stroke();
  };
  for (let i = 0; i < t.count; i++) {
    const x0 = (i / (t.count - 1) - 0.5) * w * 0.85;
    tentacle(x0, t.length * (0.75 + 0.5 * ((i * 37) % 10) / 10), i * 1.7);
  }
  if (form.trailing) {
    ctx.lineWidth = 0.012;
    tentacle(w * 0.1, t.length * form.trailing, 3.1);
  }

  // The bell: a dome with a scalloped rim.
  const bell = new Path2D();
  bell.moveTo(-w / 2, rim);
  bell.bezierCurveTo(-w / 2, top * 0.2, -w * 0.32, top, 0, top);
  bell.bezierCurveTo(w * 0.32, top, w / 2, top * 0.2, w / 2, rim);
  const n = Math.max(4, form.lappets);
  for (let i = n - 1; i >= 0; i--) {
    const x0 = -w / 2 + (w * (i + 1)) / n;
    const x1 = -w / 2 + (w * i) / n;
    bell.quadraticCurveTo((x0 + x1) / 2, rim + h * 0.12, x1, rim);
  }
  bell.closePath();

  if (sil) {
    ctx.fillStyle = sil;
    ctx.fill(bell);
    return;
  }
  const g = ctx.createLinearGradient(0, top, 0, rim + h * 0.1);
  g.addColorStop(0, form.bell);
  g.addColorStop(1, form.rim);
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = g;
  ctx.fill(bell);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.clip(bell);
  // Inner stomach and the groove that rings the bell.
  ctx.fillStyle = form.inner;
  ctx.beginPath();
  ctx.ellipse(0, rim - h * 0.32, w * 0.27, h * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.ellipse(0, rim, w * 0.5, h * 0.18, 0, Math.PI, TAU);
  ctx.stroke();
  // Light from above, as on fish.
  const shade = ctx.createLinearGradient(0, top, 0, rim);
  shade.addColorStop(0, 'rgba(255,255,255,0.22)');
  shade.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = shade;
  ctx.fill(bell);
  ctx.restore();

  if (look.glow) {
    ctx.fillStyle = look.glow.color;
    for (const [x, y] of jellyRimPoints(form, pose.phase, look.glow.spots.length || 12)) {
      ctx.beginPath();
      ctx.arc(x, y, look.glow.size, 0, TAU);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- cephalopods

/**
 * Side view, heading toward +x: the mantle leans back, the arms meet at a
 * crown below its front, and the web trails behind like a half-open
 * umbrella. One fin on the near side; the far one just shows behind.
 */
function cephShape(form: CephalopodForm, phase: number) {
  const p = pulse(phase);
  const m = form.mantle;
  // Mantle on top, arms and web below; the whole animal is about 1 unit tall.
  const mantleCy = -0.5 + m.height / 2;
  const mantleCx = -0.05;
  const lean = -0.35;
  const crown = { x: 0.04, y: mantleCy + m.height * 0.42 };
  const webLen = form.web.length * (1 - 0.18 * p);
  // The web closes when it pulses: the hem draws in toward the crown.
  const front = crown.x + 0.1 + 0.08 * (1 - p);
  const back = crown.x - (0.26 + 0.24 * (1 - p));
  return { p, mantleCx, mantleCy, lean, crown, webLen, front, back };
}

/** Points along the web's hem, front to back, in body units. */
function hemPoints(form: CephalopodForm, phase: number): Array<[number, number]> {
  const { crown, webLen, front, back } = cephShape(form, phase);
  const n = form.web.arms;
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    // The back of the web trails a little higher, swept by the water.
    return [front + (back - front) * t, crown.y + webLen * (1 - 0.25 * t * t)] as [number, number];
  });
}

/** Arm tip positions in body units (for glowing tips): just past the hem. */
export function cephalopodArmTips(form: CephalopodForm, phase: number): Array<[number, number]> {
  const { crown } = cephShape(form, phase);
  return hemPoints(form, phase).map(([x, y]) => [crown.x + (x - crown.x) * 1.1, crown.y + (y - crown.y) * 1.1] as [number, number]);
}

function drawCephalopod(ctx: CanvasRenderingContext2D, form: CephalopodForm, pose: FishPose, opts: RenderOptions, look: FishLook): void {
  const sil = opts.silhouette;
  const m = form.mantle;
  const { mantleCx, mantleCy, lean, crown, webLen } = cephShape(form, pose.phase);
  const ears = form.fins.ears === true;
  const flap = Math.sin(pose.finPhase) * (ears ? 0.45 : 0.25);
  const fs = form.fins.size;

  // A fin (or ear) on the mantle, attached at (ax, ay) in the mantle's frame.
  const fin = (ax: number, ay: number, angle: number, scale: number) => {
    ctx.save();
    ctx.translate(mantleCx, mantleCy);
    ctx.rotate(lean);
    ctx.translate(ax, ay);
    // `angle` points outward from the mantle; the fin grows out that way.
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(fs * 0.45 * scale, 0, fs * 0.55 * scale, fs * (ears ? 0.38 : 0.22) * scale, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  // Attached near the top of the mantle, toward the back, sticking out
  // up and back (a dumbo octopus's "ears") or straight back (smaller fins).
  const finAt = ears ? { x: -m.width * 0.2, y: -m.height * 0.32 } : { x: -m.width * 0.36, y: -m.height * 0.22 };
  const finAngle = ears ? -2.2 : -2.75;

  // Far fin first, just peeking out behind the mantle, a little darker.
  ctx.fillStyle = sil ?? form.fins.color;
  ctx.globalAlpha = sil ? 1 : 0.75;
  fin(finAt.x + m.width * 0.14, finAt.y - m.height * 0.06, finAngle + 0.45 + flap * 0.8, 0.8);
  ctx.globalAlpha = 1;

  // The web: from the crown, its front edge drops down and its back edge
  // sweeps behind, to a scalloped hem between the arm tips.
  const hem = hemPoints(form, pose.phase);
  const web = new Path2D();
  web.moveTo(crown.x + 0.05, crown.y - 0.04);
  web.quadraticCurveTo(hem[0]![0] + 0.03, crown.y + webLen * 0.45, hem[0]![0], hem[0]![1]);
  for (let i = 1; i < hem.length; i++) {
    const [x0, y0] = hem[i - 1]!;
    const [x1, y1] = hem[i]!;
    web.quadraticCurveTo((x0 + x1) / 2 + 0.01, (y0 + y1) / 2 - webLen * 0.12, x1, y1);
  }
  const last = hem[hem.length - 1]!;
  web.quadraticCurveTo(last[0] + 0.02, crown.y + webLen * 0.2, mantleCx - m.width * 0.25, crown.y - 0.06);
  web.closePath();
  if (sil) {
    ctx.fillStyle = sil;
    ctx.fill(web);
  } else {
    const wg = ctx.createLinearGradient(0, crown.y, 0, crown.y + webLen);
    wg.addColorStop(0, form.mantle.belly);
    wg.addColorStop(1, form.web.color);
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = wg;
    ctx.fill(web);
    ctx.globalAlpha = 1;
    // Arms run from the crown through the web and poke out past the hem.
    ctx.strokeStyle = form.web.armColor;
    ctx.lineWidth = 0.014;
    ctx.lineCap = 'round';
    for (const [tx, ty] of cephalopodArmTips(form, pose.phase)) {
      ctx.beginPath();
      ctx.moveTo(crown.x, crown.y);
      ctx.quadraticCurveTo(crown.x + (tx - crown.x) * 0.4, crown.y + (ty - crown.y) * 0.75, tx, ty);
      ctx.stroke();
    }
  }

  // Mantle, leaning back.
  ctx.save();
  ctx.translate(mantleCx, mantleCy);
  ctx.rotate(lean);
  const mantle = new Path2D();
  mantle.ellipse(0, 0, m.width / 2, m.height / 2, 0, 0, TAU);
  if (sil) {
    ctx.fillStyle = sil;
    ctx.fill(mantle);
  } else {
    const mg = ctx.createLinearGradient(0, -m.height / 2, 0, m.height / 2);
    mg.addColorStop(0, form.mantle.color);
    mg.addColorStop(1, form.mantle.belly);
    ctx.fillStyle = mg;
    ctx.fill(mantle);
    ctx.save();
    ctx.clip(mantle);
    const shade = ctx.createLinearGradient(0, -m.height / 2, 0, m.height / 2);
    shade.addColorStop(0, 'rgba(255,255,255,0.22)');
    shade.addColorStop(0.35, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(4,10,24,0.3)');
    ctx.fillStyle = shade;
    ctx.fill(mantle);
    ctx.restore();
  }
  ctx.restore();

  // Near fin, over the mantle.
  ctx.fillStyle = sil ?? form.fins.color;
  fin(finAt.x, finAt.y, finAngle - flap, 1);
  if (sil) return;

  // The eye: low on the front of the head, just above the arms, in a slight bulge.
  ctx.save();
  ctx.translate(mantleCx, mantleCy);
  ctx.rotate(lean);
  const ex = m.width * 0.24;
  const ey = m.height * 0.2;
  const r = form.eyeSize;
  const bulge = ctx.createRadialGradient(ex, ey - r * 0.4, r * 0.4, ex, ey, r * 2.1);
  bulge.addColorStop(0, 'rgba(255,255,255,0.16)');
  bulge.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bulge;
  ctx.beginPath();
  ctx.arc(ex, ey, r * 2.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,6,10,0.6)';
  ctx.beginPath();
  ctx.arc(ex, ey, r * 1.15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = form.eyeColor;
  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.arc(ex + r * 0.15, ey, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(ex + r * 0.35, ey - r * 0.3, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.restore();

  if (look.glow) {
    ctx.fillStyle = look.glow.color;
    for (const [x, y] of cephalopodArmTips(form, pose.phase)) {
      ctx.beginPath();
      ctx.arc(x, y, look.glow.size, 0, TAU);
      ctx.fill();
    }
  }
}

/**
 * Where a creature's glowing spots are, in canvas coordinates, for the
 * live halos the tank draws around them.
 */
export function creatureGlowPoints(form: CreatureForm, look: FishLook, pose: FishPose): Array<[number, number]> {
  const local =
    form.kind === 'jelly' ? jellyRimPoints(form, pose.phase, look.glow?.spots.length || 12) : cephalopodArmTips(form, pose.phase);
  const dir = form.kind === 'jelly' ? 1 : pose.facing < 0 ? -1 : 1;
  const a = form.kind === 'jelly' ? pose.pitch * 0.3 : pose.pitch * 0.5 * dir;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return local.map(([x, y]) => {
    const lx = x * pose.length * dir;
    const ly = y * pose.length;
    return [pose.x + lx * c - ly * s, pose.y + lx * s + ly * c];
  });
}
