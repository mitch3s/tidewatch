import worldLand from '../assets/world-land.json';
import { TAU } from '../util/math';

type Ring = Array<[number, number]>;
const LAND = worldLand as Ring[];

export interface MapView {
  lon0: number;
  lon1: number;
  lat0: number;
  lat1: number;
}

/**
 * Choose a map window around a species' range: its bounding box with some
 * margin, widened to the canvas's aspect ratio, and never smaller than ~70°
 * across so the viewer can tell where in the world it is.
 */
export function viewFor(range: Ring[], aspect: number): MapView {
  let lonMin = Infinity;
  let lonMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;
  for (const poly of range) {
    for (const [lon, lat] of poly) {
      lonMin = Math.min(lonMin, lon);
      lonMax = Math.max(lonMax, lon);
      latMin = Math.min(latMin, lat);
      latMax = Math.max(latMax, lat);
    }
  }
  const cx = (lonMin + lonMax) / 2;
  const cy = (latMin + latMax) / 2;
  let w = Math.max(70, (lonMax - lonMin) * 1.35);
  let h = Math.max(30, (latMax - latMin) * 1.35);
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  w = Math.min(w, 360);
  h = Math.min(h, 150);
  const lon0 = Math.max(-180, Math.min(180 - w, cx - w / 2));
  const lat1 = Math.max(-75 + h, Math.min(80, cy + h / 2));
  return { lon0, lon1: lon0 + w, lat0: lat1 - h, lat1 };
}

/** Draw land, the highlighted native range, and a marker for tiny ranges. */
export function drawRangeMap(ctx: CanvasRenderingContext2D, w: number, h: number, range: Ring[], time = 0): void {
  const view = viewFor(range, w / h);
  const x = (lon: number) => ((lon - view.lon0) / (view.lon1 - view.lon0)) * w;
  const y = (lat: number) => ((view.lat1 - lat) / (view.lat1 - view.lat0)) * h;

  ctx.fillStyle = '#0a2c40';
  ctx.fillRect(0, 0, w, h);

  // Faint graticule every 30°.
  ctx.strokeStyle = 'rgba(160,210,240,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let lon = -180; lon <= 180; lon += 30) {
    ctx.moveTo(x(lon), 0);
    ctx.lineTo(x(lon), h);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.moveTo(0, y(lat));
    ctx.lineTo(w, y(lat));
  }
  ctx.stroke();
  // The equator a bit stronger.
  ctx.strokeStyle = 'rgba(160,210,240,0.18)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, y(0));
  ctx.lineTo(w, y(0));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#2f5566';
  ctx.strokeStyle = 'rgba(190,225,240,0.35)';
  for (const ring of LAND) {
    ctx.beginPath();
    ring.forEach(([lon, lat], i) => (i === 0 ? ctx.moveTo(x(lon), y(lat)) : ctx.lineTo(x(lon), y(lat))));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // The range itself.
  ctx.fillStyle = 'rgba(255,190,80,0.6)';
  ctx.strokeStyle = 'rgba(255,215,140,0.95)';
  ctx.lineWidth = 2;
  let area = 0;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const poly of range) {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const px = x(lon);
      const py = y(lat);
      sx += px;
      sy += py;
      n++;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    area += Math.abs(polygonArea(poly.map(([lon, lat]) => [x(lon), y(lat)])));
  }
  // A small range (like the zebra pleco's) gets a pulsing marker so it's visible.
  if (area < 400 && n > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.strokeStyle = `rgba(255,215,140,${(0.5 + 0.5 * pulse).toFixed(2)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx / n, sy / n, 14 + 6 * pulse, 0, TAU);
    ctx.stroke();
  }
}

function polygonArea(pts: number[][]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p[0]! * q[1]! - q[0]! * p[1]!;
  }
  return a / 2;
}
