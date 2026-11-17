import { BIOMES } from './data/biomes';
import { ALL_SPECIES, getSpecies } from './data/species';
import type { Species } from './data/types';
import { IdleTracker } from './input/idle';
import { InputManager } from './input';
import { PointerInput } from './input/pointer';
import { createPlatform } from './platform';
import { renderFish, restPose } from './render/fish/renderFish';
import { TankScene } from './render/scene/tankScene';
import { STAGE_HEIGHT, STAGE_WIDTH, Stage } from './render/stage';
import { TAU } from './util/math';

const params = new URLSearchParams(location.search);
const host = document.getElementById('stage');
if (!host) throw new Error('#stage element missing');

const stage = new Stage(host);
const platform = createPlatform();
platform.keepAwake();

/** The species that start in the reef tank (spec 4.3). */
const STARTERS = ['ocellaris-clownfish', 'yellow-tang'];

/**
 * `?species=all` shows every species drawn so far; `?species=a,b` picks some.
 * Until the game logic arrives (Milestone 4), the default is the starter fish.
 */
function chosenSpecies(): Species[] {
  const p = params.get('species');
  if (p === 'all') return [...ALL_SPECIES];
  const ids = p ? p.split(',') : STARTERS;
  return ids.map((id) => {
    const s = getSpecies(id.trim());
    if (!s) throw new Error(`Unknown species: ${id}`);
    return s;
  });
}

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
  // `?hour=21.5` overrides the clock, to preview day/night lighting.
  const hourParam = params.get('hour');
  const scene = new TankScene(BIOMES.reef, chosenSpecies(), {
    hour: hourParam !== null ? () => Number(hourParam) : undefined,
  });
  scene.prepare(stage.pixelScale);
  stage.onResize(() => scene.prepare(stage.pixelScale));

  // Idle handling: the title fades out after 10 s without input (spec 5.1).
  const idle = new IdleTracker(10_000, performance.now());
  let uiAlpha = 1;
  const input = new InputManager();
  input.on((action) => {
    idle.handle(action, performance.now());
  });
  const pointer = new PointerInput({ canvas: stage.canvas, toStage: (x, y) => stage.clientToStage(x, y) });
  pointer.on(() => idle.poke(performance.now()));

  stage.start({
    update(dt) {
      scene.update(dt);
      idle.tick(performance.now());
      uiAlpha += ((idle.isIdle ? 0 : 1) - uiAlpha) * Math.min(1, dt * 2);
    },
    render(ctx, alpha, time) {
      scene.render(ctx, alpha, time);
      if (uiAlpha > 0.01) {
        ctx.globalAlpha = uiAlpha;
        ctx.fillStyle = 'rgba(230,245,255,0.9)';
        ctx.font = '600 44px system-ui, sans-serif';
        ctx.fillText('Tidewatch', 72, 104);
        ctx.font = '28px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(230,245,255,0.6)';
        ctx.fillText(`Milestone 3 preview · ${scene.biome.name}`, 72, 146);
        ctx.globalAlpha = 1;
      }
    },
  });
}
