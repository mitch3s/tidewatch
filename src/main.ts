import { getSpecies } from './data/species';
import { ocellarisClownfish } from './data/species/ocellaris-clownfish';
import { IdleTracker } from './input/idle';
import { InputManager } from './input';
import { PointerInput } from './input/pointer';
import { createPlatform } from './platform';
import { renderFish, restPose } from './render/fish/renderFish';
import { STAGE_HEIGHT, STAGE_WIDTH, Stage } from './render/stage';
import { DemoSwimmer } from './sim/demoSwimmer';
import { TAU } from './util/math';

const params = new URLSearchParams(location.search);
const host = document.getElementById('stage');
if (!host) throw new Error('#stage element missing');

const stage = new Stage(host);
const platform = createPlatform();
platform.keepAwake();

function drawWater(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
  g.addColorStop(0, '#0c5a7a');
  g.addColorStop(0.55, '#063550');
  g.addColorStop(1, '#021a2b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
}

// `?fish=<id>`: show one species large and centred (screenshots, and the
// starting point for the god-mode fish lab). Add `&still` to freeze it.
const previewId = params.get('fish');
if (previewId) {
  const species = getSpecies(previewId);
  if (!species) throw new Error(`Unknown species: ${previewId}`);
  const still = params.has('still');
  stage.start({
    update() {},
    render(ctx, _alpha, time) {
      drawWater(ctx);
      const pose = restPose(STAGE_WIDTH / 2 + 40, STAGE_HEIGHT / 2, 900);
      if (!still) {
        pose.phase = time * species.look.swim.tailHz * TAU * 0.5;
        pose.finPhase = time * 1.6 * TAU * 0.5;
        pose.flex = species.look.swim.flex;
      }
      renderFish(ctx, species.look, pose);
    },
  });
} else {
  // Milestone 2 demo: a pair of clownfish swimming across open water.
  const swimmers = [new DemoSwimmer(ocellarisClownfish, 470, 1), new DemoSwimmer(ocellarisClownfish, 640, 2.6)];

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
      for (const s of swimmers) s.update(dt);
      idle.tick(performance.now());
      uiAlpha += ((idle.isIdle ? 0 : 1) - uiAlpha) * Math.min(1, dt * 2);
    },
    render(ctx, alpha) {
      drawWater(ctx);
      for (const s of swimmers) renderFish(ctx, ocellarisClownfish.look, s.poseAt(alpha));
      if (uiAlpha > 0.01) {
        ctx.globalAlpha = uiAlpha;
        ctx.fillStyle = 'rgba(230,245,255,0.9)';
        ctx.font = '600 44px system-ui, sans-serif';
        ctx.fillText('Tidewatch', 72, 104);
        ctx.font = '28px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(230,245,255,0.6)';
        ctx.fillText('Milestone 2 preview', 72, 146);
        ctx.globalAlpha = 1;
      }
    },
  });
}
