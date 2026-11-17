import type { BiomeDef } from '../../data/biomes';
import type { Species } from '../../data/types';
import { CATCH_WINDOW_MS } from '../../game/game';
import { Tank } from '../../sim/tank';
import { VisitorSwimmer } from '../../sim/visitor';
import { renderFish } from '../fish/renderFish';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage';
import { createAmazonScenery } from './amazon';
import { Bubbles } from './bubbles';
import { Camera } from './camera';
import { lightingAt } from './daynight';
import { StaticLayer } from './layers';
import { LightRays } from './lightRays';
import { SeaGrass } from './plants';
import { createReefScenery, type Scenery } from './reef';
import { Sparkles } from './sparkles';
import { TAU } from '../../util/math';
import { createRng } from '../../util/rng';

/** Parallax per layer: 0 = fixed to the screen, 1 = moves with the fish. */
const PARALLAX = { far: 0.35, rays: 0.5, mid: 0.8, fish: 1, bubbles: 1.05, front: 1.25 } as const;

/** God-mode debug drawing, shared by all scenes. */
export interface DebugView {
  vectors: boolean;
  bounds: boolean;
  neighbours: boolean;
}

export interface TankSceneOptions {
  /** Time of day in hours. Defaults to the device clock. */
  hour?: () => number;
  /** Turn day/night lighting off (always daylight). */
  dayNight?: () => boolean;
  /** God-mode debug drawing. */
  debug?: DebugView;
}

function sceneryFor(biome: BiomeDef): Scenery {
  return biome.id === 'reef' ? createReefScenery(biome) : createAmazonScenery(biome);
}

/** One complete aquarium: scenery, lighting, fish and effects (spec 5.1). */
export class TankScene {
  readonly camera = new Camera();
  readonly tank: Tank;
  visitor: VisitorSwimmer | null = null;
  private readonly scenery: Scenery;
  private readonly far: StaticLayer;
  private readonly mid: StaticLayer;
  private readonly rays: LightRays;
  private readonly bubbles: Bubbles;
  private readonly grass: SeaGrass;
  private readonly sparkles = new Sparkles();
  private readonly hour: () => number;
  private readonly dayNight: () => boolean;
  private readonly debug: DebugView | undefined;
  private readonly rng: () => number;
  private time = 0;

  constructor(
    readonly biome: BiomeDef,
    species: readonly Species[],
    opts: TankSceneOptions = {},
  ) {
    this.scenery = sceneryFor(biome);
    this.far = new StaticLayer((ctx) => this.scenery.paintFar(ctx));
    this.mid = new StaticLayer((ctx) => this.scenery.paintMid(ctx));
    this.rays = new LightRays(biome.seed + 1);
    this.bubbles = new Bubbles(this.scenery.bubbleSources, biome.floor.y + 10, biome.seed + 2);
    this.grass = new SeaGrass(biome.seed + 3, this.scenery.grass, biome.plants);
    this.rng = createRng(biome.seed + 5 + Date.now());
    this.tank = new Tank(
      {
        bounds: { left: 60, right: STAGE_WIDTH - 60, top: 90, bottom: biome.floor.y - 30 },
        home: this.scenery.home,
      },
      species,
      biome.seed + 4,
    );
    this.hour =
      opts.hour ??
      (() => {
        const d = new Date();
        return d.getHours() + d.getMinutes() / 60;
      });
    this.dayNight = opts.dayNight ?? (() => true);
    this.debug = opts.debug;
  }

  /** Paint the static layers for the current backing-store scale. */
  prepare(pixelScale: number): void {
    this.far.prepare(pixelScale);
    this.mid.prepare(pixelScale);
  }

  /** A newly collected species swims in from the side. */
  addArrival(species: Species): void {
    this.tank.addSpecies(species, { enter: true });
  }

  /** Start a rare visitor crossing the tank. */
  startVisitor(species: Species): void {
    this.visitor = new VisitorSwimmer(species, this.tank.env.bounds, CATCH_WINDOW_MS / 1000, this.rng);
  }

  /** The visitor was caught: sparkles, and it joins the tank where it is. */
  catchVisitor(): void {
    const v = this.visitor;
    if (!v) return;
    const p = v.position;
    this.sparkles.burst(p.x, p.y);
    const facing = v.poseAt(1).facing > 0 ? 1 : -1;
    this.tank.addSpecies(v.species, { at: { x: p.x, y: p.y, facing } });
    this.visitor = null;
  }

  /** Whether a screen point (stage coordinates) is on the visitor, for pointer catching. */
  hitsVisitor(x: number, y: number): boolean {
    if (!this.visitor) return false;
    const w = this.camera.toWorld(x, y, PARALLAX.fish);
    const p = this.visitor.position;
    return Math.hypot(w.x - p.x, w.y - p.y) < Math.max(80, this.visitor.length * 0.7);
  }

  update(dt: number): void {
    this.time += dt;
    this.tank.update(dt);
    this.bubbles.update(dt);
    this.sparkles.update(dt);
    if (this.visitor) {
      this.visitor.update(dt);
      if (this.visitor.done) this.visitor = null;
    }
  }

  render(ctx: CanvasRenderingContext2D, alpha: number, time: number): void {
    this.camera.update(time);
    const light = lightingAt(this.dayNight() ? this.hour() : 12);
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
      this.scenery.drawLive?.(ctx, time);
    });
    withCamera(PARALLAX.fish, () => {
      for (const agent of this.tank.agents) renderFish(ctx, agent.species.look, agent.poseAt(alpha));
      if (this.visitor) this.drawVisitor(ctx, alpha, time);
      this.sparkles.draw(ctx);
      if (this.debug) this.drawDebug(ctx, alpha);
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

  private drawDebug(ctx: CanvasRenderingContext2D, alpha: number): void {
    const d = this.debug!;
    if (!d.vectors && !d.bounds && !d.neighbours) return;
    ctx.save();
    ctx.lineWidth = 2;
    const agents = this.tank.agents;
    if (d.bounds) {
      const b = this.tank.env.bounds;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
      ctx.setLineDash([]);
    }
    for (const a of agents) {
      const p = a.poseAt(alpha);
      if (d.bounds) {
        ctx.strokeStyle = 'rgba(255,230,120,0.7)';
        ctx.strokeRect(p.x - a.length * 0.6, p.y - a.length * 0.35, a.length * 1.2, a.length * 0.7);
      }
      if (d.vectors) {
        ctx.strokeStyle = 'rgba(120,255,160,0.9)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + a.vel.x * 0.8, p.y + a.vel.y * 0.8);
        ctx.stroke();
        const t = a.debugTarget;
        ctx.strokeStyle = 'rgba(255,120,200,0.45)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,120,200,0.8)';
        ctx.fillRect(t.x - 4, t.y - 4, 8, 8);
      }
      if (d.neighbours && a.school) {
        ctx.strokeStyle = 'rgba(120,200,255,0.35)';
        for (const o of agents) {
          if (o === a || o.school !== a.school) continue;
          if (Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < 260) {
            ctx.beginPath();
            ctx.moveTo(a.pos.x, a.pos.y);
            ctx.lineTo(o.pos.x, o.pos.y);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  /** The visitor, with a soft pulsing glow so it stands out even at night. */
  private drawVisitor(ctx: CanvasRenderingContext2D, alpha: number, time: number): void {
    const v = this.visitor!;
    const pose = v.poseAt(alpha);
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);
    const r = v.length * (1.05 + 0.2 * pulse);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(pose.x, pose.y, 0, pose.x, pose.y, r);
    g.addColorStop(0, `rgba(255,240,190,${(0.34 + 0.16 * pulse).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(255,230,160,${(0.12 + 0.06 * pulse).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pose.x, pose.y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
    renderFish(ctx, v.species.look, pose);
  }
}
