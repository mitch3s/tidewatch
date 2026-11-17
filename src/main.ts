import { App } from './app';
import { getSpecies } from './data/species';
import { DEV_TOOLS } from './dev/enabled';
import { parseDevFlags } from './dev/urlFlags';
import { createPlatform } from './platform';
import { renderFish, restPose } from './render/fish/renderFish';
import { STAGE_HEIGHT, STAGE_WIDTH, Stage } from './render/stage';
import { defaultStore } from './save/storage';
import { TAU } from './util/math';

const params = new URLSearchParams(location.search);
const host = document.getElementById('stage');
if (!host) throw new Error('#stage element missing');
const stage = new Stage(host);

const previewId = params.get('fish');
if (previewId) {
  // `?fish=<id>`: show one species large and centred (screenshots, and the
  // starting point for the god-mode fish lab). Add `&still` to freeze it, and
  // `&turn=0..1` to see a stage of turning around.
  const species = getSpecies(previewId);
  if (!species) throw new Error(`Unknown species: ${previewId}`);
  const still = params.has('still');
  const turn = Number(params.get('turn') ?? 0);
  stage.start({
    update() {},
    render(ctx, _alpha, time) {
      const g = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
      g.addColorStop(0, '#0c5a7a');
      g.addColorStop(0.55, '#063550');
      g.addColorStop(1, '#021a2b');
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
  const app = new App(stage, createPlatform(), {
    store: defaultStore(),
    flags: DEV_TOOLS ? parseDevFlags(location.search) : null,
    // `?hour=21.5` overrides the clock, to preview day/night lighting.
    hour: hour !== null && Number.isFinite(Number(hour)) ? Number(hour) : undefined,
  });
  app.start();
}
