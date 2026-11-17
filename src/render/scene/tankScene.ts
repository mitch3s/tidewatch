import type { BiomeDef } from '../../data/biomes';
import type { Species } from '../../data/types';
import { Tank } from '../../sim/tank';
import { renderFish } from '../fish/renderFish';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { Bubbles } from './bubbles';
import { Camera } from './camera';
import { lightingAt } from './daynight';
import { StaticLayer } from './layers';
import { LightRays } from './lightRays';
import { drawAnemone, SeaGrass } from './plants';
import { layoutReef, paintFar, paintMid, type ReefLayout } from './reef';

/** Parallax per layer: 0 = fixed to the screen, 1 = moves with the fish. */
const PARALLAX = { far: 0.35, rays: 0.5, mid: 0.8, fish: 1, bubbles: 1.05, front: 1.25 } as const;

export interface TankSceneOptions {
  /** Time of day in hours. Defaults to the device clock. */
  hour?: () => number;
}

/** One complete aquarium: scenery, lighting, fish and effects (spec 5.1). */
export class TankScene {
  readonly camera = new Camera();
  readonly tank: Tank;
  private readonly layout: ReefLayout;
  private readonly far: StaticLayer;
  private readonly mid: StaticLayer;
  private readonly rays: LightRays;
  private readonly bubbles: Bubbles;
  private readonly grass: SeaGrass;
  private readonly hour: () => number;

  constructor(
    readonly biome: BiomeDef,
    species: readonly Species[],
    opts: TankSceneOptions = {},
  ) {
    this.layout = layoutReef(biome);
    this.far = new StaticLayer((ctx) => paintFar(ctx, biome));
    this.mid = new StaticLayer((ctx) => paintMid(ctx, biome, this.layout));
    this.rays = new LightRays(biome.seed + 1);
    this.bubbles = new Bubbles(this.layout.bubbleSources, biome.floor.y + 10, biome.seed + 2);
    this.grass = new SeaGrass(biome.seed + 3, [
      { x: 60, spread: 120, count: 16 },
      { x: 1870, spread: 110, count: 14 },
    ]);
    const a = this.layout.anemone;
    this.tank = new Tank(
      {
        bounds: { left: 60, right: STAGE_WIDTH - 60, top: 90, bottom: biome.floor.y - 30 },
        home: { x: a.x, y: a.y - a.size * 0.55 },
      },
      species,
      biome.seed + 4,
    );
    this.hour = opts.hour ?? (() => {
      const d = new Date();
      return d.getHours() + d.getMinutes() / 60;
    });
  }

  /** Paint the static layers for the current backing-store scale. */
  prepare(pixelScale: number): void {
    this.far.prepare(pixelScale);
    this.mid.prepare(pixelScale);
  }

  update(dt: number): void {
    this.tank.update(dt);
    this.bubbles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number, time: number): void {
    this.camera.update(time);
    const light = lightingAt(this.hour());
    const withCamera = (parallax: number, draw: () => void) => {
      ctx.save();
      this.camera.apply(ctx, parallax);
      draw();
      ctx.restore();
    };

    withCamera(PARALLAX.far, () => this.far.draw(ctx));
    withCamera(PARALLAX.rays, () => this.rays.draw(ctx, time, this.biome.rays, light.rays));
    withCamera(PARALLAX.mid, () => {
      this.mid.draw(ctx);
      const a = this.layout.anemone;
      drawAnemone(ctx, a.x, a.y, a.size, time);
    });
    withCamera(PARALLAX.fish, () => {
      for (const agent of this.tank.agents) renderFish(ctx, agent.species.look, agent.poseAt(alpha));
    });
    withCamera(PARALLAX.bubbles, () => this.bubbles.draw(ctx));
    withCamera(PARALLAX.front, () => this.grass.draw(ctx, time));

    // Screen-space effects: dawn/dusk warmth, night, and a soft vignette.
    if (light.warmth > 0.01) {
      ctx.fillStyle = `rgba(255,140,70,${(light.warmth * 0.12).toFixed(3)})`;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    }
    if (light.darkness > 0.01) {
      ctx.fillStyle = `rgba(2,10,38,${light.darkness.toFixed(3)})`;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    }
    const v = ctx.createRadialGradient(STAGE_WIDTH / 2, STAGE_HEIGHT * 0.45, STAGE_HEIGHT * 0.45, STAGE_WIDTH / 2, STAGE_HEIGHT * 0.45, STAGE_WIDTH * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,8,20,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  }
}
