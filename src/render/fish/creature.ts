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

function cephShape(form: CephalopodForm, phase: number) {
  const p = pulse(phase);
  const m = form.mantle;
  // Mantle on top, arms and web below; the whole animal is about 1 unit tall.
  const mantleCy = -0.5 + m.height / 2;
  const base = mantleCy + m.height * 0.45;
  const webLen = form.web.length * (1 - 0.22 * p);
  const hemHalf = m.width * (0.55 + 0.5 * (1 - p));
  return { p, mantleCy, base, webLen, hemHalf };
}

/** Arm tip positions in body units (for glowing tips). */
export function cephalopodArmTips(form: CephalopodForm, phase: number): Array<[number, number]> {
  const { base, webLen, hemHalf } = cephShape(form, phase);
  const n = form.web.arms;
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const x = (t - 0.5) * 2 * hemHalf * 1.08;
    return [x, base + webLen * (1.08 + 0.1 * Math.sin(t * Math.PI))] as [number, number];
  });
}

function drawCephalopod(ctx: CanvasRenderingContext2D, form: CephalopodForm, pose: FishPose, opts: RenderOptions, look: FishLook): void {
  const sil = opts.silhouette;
  const m = form.mantle;
  const { mantleCy, base, webLen, hemHalf } = cephShape(form, pose.phase);
  const n = form.web.arms;

  // Fins on the mantle, flapping (big ear-like flaps on a dumbo octopus).
  const flap = Math.sin(pose.finPhase) * (form.fins.ears ? 0.5 : 0.25);
  ctx.fillStyle = sil ?? form.fins.color;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * m.width * 0.42, mantleCy - m.height * (form.fins.ears ? 0.05 : 0.25));
    ctx.rotate(side * (0.5 + flap));
    ctx.beginPath();
    const fs = form.fins.size;
    ctx.ellipse(side * fs * 0.5, 0, fs * 0.55, fs * (form.fins.ears ? 0.4 : 0.22), 0, 0, TAU);
    ctx.globalAlpha = sil ? 1 : 0.92;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // The web between the arms, from the base of the mantle down to a scalloped hem.
  const web = new Path2D();
  web.moveTo(-m.width * 0.42, base - 0.02);
  const hemY = base + webLen;
  web.quadraticCurveTo(-hemHalf * 1.05, base + webLen * 0.5, -hemHalf, hemY);
  for (let i = 1; i < n; i++) {
    const x0 = -hemHalf + (2 * hemHalf * (i - 1)) / (n - 1);
    const x1 = -hemHalf + (2 * hemHalf * i) / (n - 1);
    web.quadraticCurveTo((x0 + x1) / 2, hemY - webLen * 0.16, x1, hemY);
  }
  web.quadraticCurveTo(hemHalf * 1.05, base + webLen * 0.5, m.width * 0.42, base - 0.02);
  web.closePath();
  if (sil) {
    ctx.fillStyle = sil;
    ctx.fill(web);
  } else {
    const wg = ctx.createLinearGradient(0, base, 0, hemY);
    wg.addColorStop(0, form.mantle.color);
    wg.addColorStop(1, form.web.color);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = wg;
    ctx.fill(web);
    ctx.globalAlpha = 1;
    // Arms run through the web and poke out past the hem.
    ctx.strokeStyle = form.web.armColor;
    ctx.lineWidth = 0.014;
    ctx.lineCap = 'round';
    const tips = cephalopodArmTips(form, pose.phase);
    tips.forEach(([tx, ty], i) => {
      const sx = (i / (n - 1) - 0.5) * m.width * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, base);
      ctx.quadraticCurveTo(tx * 0.8, base + webLen * 0.6, tx, ty);
      ctx.stroke();
    });
  }

  // Mantle.
  const mantle = new Path2D();
  mantle.ellipse(0, mantleCy, m.width / 2, m.height / 2, 0, 0, TAU);
  if (sil) {
    ctx.fillStyle = sil;
    ctx.fill(mantle);
    return;
  }
  const mg = ctx.createLinearGradient(0, mantleCy - m.height / 2, 0, mantleCy + m.height / 2);
  mg.addColorStop(0, form.mantle.color);
  mg.addColorStop(1, form.mantle.belly);
  ctx.fillStyle = mg;
  ctx.fill(mantle);
  ctx.save();
  ctx.clip(mantle);
  const shade = ctx.createLinearGradient(0, mantleCy - m.height / 2, 0, mantleCy + m.height / 2);
  shade.addColorStop(0, 'rgba(255,255,255,0.22)');
  shade.addColorStop(0.35, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(4,10,24,0.3)');
  ctx.fillStyle = shade;
  ctx.fill(mantle);
  ctx.restore();

  // Eye, on the side the animal is heading toward.
  const ex = m.width * 0.22;
  const ey = mantleCy + m.height * 0.3;
  const r = form.eyeSize;
  ctx.fillStyle = 'rgba(10,6,10,0.85)';
  ctx.beginPath();
  ctx.arc(ex, ey, r * 1.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = form.eyeColor;
  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.arc(ex + r * 0.1, ey, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(ex + r * 0.35, ey - r * 0.35, r * 0.2, 0, TAU);
  ctx.fill();

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
