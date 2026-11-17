// Builds src/assets/world-land.json: a small, simplified outline of the
// world's land (Natural Earth 1:110m, public domain, via the world-atlas
// package) as [lon, lat] rings, for the codex range map.
// Run with: node scripts/build-world-map.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'));
const land = feature(topo, topo.objects.land);

const round = (v) => Math.round(v * 2) / 2; // half-degree precision is plenty
const rings = [];
for (const f of land.features ?? [land]) {
  const geom = f.geometry;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    const outer = poly[0];
    const ring = [];
    for (const [lon, lat] of outer) {
      if (lat < -60) continue; // skip Antarctica's interior; the map stops at 60°S
      const p = [round(lon), round(lat)];
      const last = ring[ring.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) ring.push(p);
    }
    if (ring.length >= 4) rings.push(ring);
  }
}
writeFileSync(new URL('../src/assets/world-land.json', import.meta.url), JSON.stringify(rings));
console.log(`${rings.length} land outlines, ${rings.reduce((n, r) => n + r.length, 0)} points`);
