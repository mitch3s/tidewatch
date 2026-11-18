import { App } from './app';
import { BIOMES } from './data/biomes';
import { getSpecies } from './data/species';
import { PENDING_DEEP } from './data/species/pending';
import type { Species, SpeciesDef } from './data/types';
import { DEV_TOOLS } from './dev/enabled';
import { parseDevFlags } from './dev/urlFlags';
import { createPlatform } from './platform';
import { renderFish, restPose } from './render/fish/renderFish';
import { TankScene } from './render/scene/tankScene';
import { STAGE_HEIGHT, STAGE_WIDTH, Stage } from './render/stage';
import { defaultStore } from './save/storage';
import { TAU } from './util/math';

const params = new URLSearchParams(location.search);
const host = document.getElementById('stage');
if (!host) throw new Error('#stage element missing');
const platform = createPlatform();
const stage = new Stage(host, platform.name === 'webos' ? 1 : 2);

/**
 * Development builds only: deep-sea species that aren't in the game yet
 * (their codex facts still need checking), for the previews below.
 */
const pending = (def: SpeciesDef): Species => ({
  ...def,
  codex: { nativeRange: '', range: [], habitat: '', size: { cm: 0, measure: 'TL' }, diet: '', water: { type: 'salt' }, funFacts: [], sources: [] },
});
const findSpecies = (id: string): Species | undefined => {
  const s = getSpecies(id);
  if (s || !DEV_TOOLS) return s;
  const def = PENDING_DEEP.find((d) => d.id === id);
  return def && pending(def);
};

const previewId = params.get('fish');
const previewTank = DEV_TOOLS ? params.get('tank') : null;
if (previewTank === 'deep') {
  // `?tank=deep` (development builds): the deep-sea tank with its pending roster.
  const hour = Number(params.get('hour') ?? 12);
  const scene = new TankScene(BIOMES.deep, PENDING_DEEP.map(pending), { hour: () => hour, closeups: () => params.get('closeup') === 'now' });
  scene.closeupsAllowed = true;
  if (params.get('closeup') === 'now') requestAnimationFrame(() => scene.startCloseup());
  scene.prepare(stage.pixelScale);
  stage.onResize(() => scene.prepare(stage.pixelScale));
  stage.start({ update: (dt) => scene.update(dt), render: (ctx, alpha, time) => scene.render(ctx, alpha, time) });
} else if (previewId) {
  // `?fish=<id>`: show one species large and centred (screenshots, and the
  // starting point for the god-mode fish lab). Add `&still` to freeze it, and
  // `&turn=0..1` to see a stage of turning around.
  const species = findSpecies(previewId);
  if (!species) throw new Error(`Unknown species: ${previewId}`);
  const still = params.has('still');
  const turn = Number(params.get('turn') ?? 0);
  const deep = species.biome === 'deep';
  stage.start({
    update() {},
    render(ctx, _alpha, time) {
      const g = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
      g.addColorStop(0, deep ? '#0a1a30' : '#0c5a7a');
      g.addColorStop(0.55, deep ? '#050e1c' : '#063550');
      g.addColorStop(1, deep ? '#02060e' : '#021a2b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      const pose = restPose(STAGE_WIDTH / 2 + 40, STAGE_HEIGHT / 2, 900);
      pose.turn = turn;
      if (!still) {
        pose.phase = time * species.look.swim.tailHz * TAU * 0.5;
        pose.finPhase = time * 1.6 * TAU * 0.5;
        pose.flex = species.look.swim.flex;
      }
      renderFish(ctx, species.look, pose);
    },
  });
} else {
  const hour = params.get('hour');
  const app = new App(stage, platform, {
    store: defaultStore(),
    flags: DEV_TOOLS ? parseDevFlags(location.search) : null,
    // `?hour=21.5` overrides the clock, to preview day/night lighting.
    hour: hour !== null && Number.isFinite(Number(hour)) ? Number(hour) : undefined,
  });
  app.start();
}
