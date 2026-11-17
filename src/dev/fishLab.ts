import { getSpecies } from '../data/species';
import type { Species } from '../data/types';
import { renderFish, type FishPose } from '../render/fish/renderFish';
import { STAGE_HEIGHT } from '../render/stage';
import { TAU } from '../util/math';

/** Width of the god-mode panel; the lab draws in the space to its left. */
const PANEL_W = 620;

/**
 * The fish lab (spec 5.6): one species shown large, swimming in place
 * slowly, with a real-size copy underneath. The god-mode panel edits its look.
 */
export class FishLab {
  speciesId: string;
  /** Swim cycle speed, 0 (frozen) .. 1 (normal). */
  speed = 0.35;
  showRealSize = true;
  private phase = 0;
  private finPhase = 0;
  private facing: 1 | -1 = 1;
  private turn: number | null = null;

  constructor(speciesId: string) {
    this.speciesId = speciesId;
  }

  get species(): Species {
    return getSpecies(this.speciesId)!;
  }

  /** Play a turn, to check how the fish looks mid-turn. */
  startTurn(): void {
    if (this.turn === null) this.turn = 0;
  }

  update(dt: number): void {
    const s = this.species.look.swim;
    this.phase += dt * s.tailHz * TAU * this.speed;
    this.finPhase += dt * 1.6 * TAU * this.speed;
    if (this.turn !== null) {
      this.turn += dt / 1.2;
      if (this.turn >= 1) {
        this.turn = null;
        this.facing = this.facing > 0 ? -1 : 1;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = 1920 - PANEL_W;
    const g = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
    g.addColorStop(0, '#0c5a7a');
    g.addColorStop(0.55, '#063550');
    g.addColorStop(1, '#021a2b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1920, STAGE_HEIGHT);

    const sp = this.species;
    const turn = this.turn ?? 0;
    const pose = (x: number, y: number, length: number): FishPose => ({
      x,
      y,
      length,
      facing: this.facing,
      pitch: 0,
      phase: this.phase,
      flex: sp.look.swim.flex * (1 + 0.8 * Math.sin(Math.PI * turn)),
      finPhase: this.finPhase,
      turn,
    });
    renderFish(ctx, sp.look, pose(w / 2 + 30, 450, Math.min(720, 260 / Math.max(0.15, sp.look.body.upper ?? 0.2))));

    ctx.fillStyle = 'rgba(230,245,255,0.9)';
    ctx.font = '600 40px system-ui, sans-serif';
    ctx.fillText(sp.commonName, 60, 80);
    ctx.font = 'italic 26px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(230,245,255,0.65)';
    ctx.fillText(`${sp.scientificName} · fish lab`, 60, 118);

    if (this.showRealSize) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(60, 860);
      ctx.lineTo(w - 60, 860);
      ctx.stroke();
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(230,245,255,0.55)';
      ctx.fillText('in the tank:', 60, 900);
      renderFish(ctx, sp.look, pose(w / 2, 960, sp.displayLength));
    }
  }
}
