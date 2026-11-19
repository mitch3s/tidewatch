import type { SoundLevel } from '../save/schema';

/** Master volume per setting. */
const LEVEL_GAIN: Record<SoundLevel, number> = { off: 0, quiet: 0.22, normal: 0.5 };
/** Shortest time between two bubble sounds, in seconds. */
const BUBBLE_GAP_S = 0.07;

/**
 * Overall volume for a setting and what's going on: quieter at night and
 * while the codex is open.
 */
export function ambienceGain(level: SoundLevel, night: number, ducked: boolean): number {
  return LEVEL_GAIN[level] * (1 - 0.4 * Math.min(1, Math.max(0, night))) * (ducked ? 0.35 : 1);
}

type Ctx = AudioContext;

/**
 * The tank's ambient sound (spec v1.2 §5), generated with the Web Audio API
 * so there are no sound files: a soft water bed that slowly "breathes", and
 * small bubble sounds when bubbles rise in the tank.
 *
 * TVs and browsers only allow sound after a key press, so the audio starts
 * in `unlock()`, which the app calls on every input.
 */
export class Ambience {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private level: SoundLevel = 'off';
  private night = 0;
  private ducked = false;
  private lastBubble = 0;

  /** Whether the browser can play generated sound at all. */
  static get supported(): boolean {
    return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
  }

  setLevel(level: SoundLevel): void {
    this.level = level;
    if (level === 'off') {
      this.apply();
      // Stop the audio thread entirely when it's off.
      void this.ctx?.suspend().catch(() => undefined);
    } else {
      this.unlock();
    }
  }

  /** 0 = day .. 1 = night. */
  setNight(night: number): void {
    if (Math.abs(night - this.night) < 0.02) return;
    this.night = night;
    this.apply();
  }

  /** Quieter while something else (the codex) has the attention. */
  setDucked(ducked: boolean): void {
    if (ducked === this.ducked) return;
    this.ducked = ducked;
    this.apply();
  }

  /** Call on user input: creates or resumes the audio once that's allowed. */
  unlock(): void {
    if (this.level === 'off' || !Ambience.supported) return;
    try {
      if (!this.ctx) this.build();
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
      this.apply();
    } catch {
      // No sound on this device; the app works without it.
      this.ctx = null;
    }
  }

  /** A bubble rose. `size` 0..1, `pan` -1 (left) .. 1 (right). */
  bubble(size: number, pan: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running' || this.level === 'off') return;
    const now = ctx.currentTime;
    if (now - this.lastBubble < BUBBLE_GAP_S) return;
    this.lastBubble = now;
    // A short sine "bloop" whose pitch rises quickly, like a bubble leaving.
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const f0 = 380 + (1 - size) * 520 + Math.random() * 120;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 2.6, now + 0.07);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.05 + 0.07 * size, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(env);
    let out: AudioNode = env;
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan)) * 0.7;
      env.connect(p);
      out = p;
    }
    out.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private apply(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(ambienceGain(this.level, this.night, this.ducked), this.ctx.currentTime, 0.6);
  }

  private build(): void {
    const ctx = new window.AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Water bed: brown noise through a low-pass filter whose cut-off slowly
    // swells and falls, like water moving.
    const bed = ctx.createBufferSource();
    bed.buffer = noiseBuffer(ctx, 6, 'brown');
    bed.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    low.Q.value = 0.4;
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.07;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 180;
    breath.connect(breathDepth).connect(low.frequency);
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.55;
    bed.connect(low).connect(bedGain).connect(master);

    // A faint, higher trickle that comes and goes.
    const trickle = ctx.createBufferSource();
    trickle.buffer = noiseBuffer(ctx, 5, 'white');
    trickle.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2400;
    band.Q.value = 0.7;
    const trickleGain = ctx.createGain();
    trickleGain.gain.value = 0.012;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.11;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.01;
    swell.connect(swellDepth).connect(trickleGain.gain);
    trickle.connect(band).connect(trickleGain).connect(master);

    bed.start();
    breath.start();
    trickle.start();
    swell.start();
    this.ctx = ctx;
    this.master = master;
  }
}

/** A loopable noise buffer. Brown noise is deep and soft; white noise is hiss. */
function noiseBuffer(ctx: Ctx, seconds: number, kind: 'brown' | 'white'): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  // Generate a little extra and cross-fade it into the start, so the end of
  // the buffer runs straight on into its beginning without a click.
  const fade = Math.floor(ctx.sampleRate * 0.05);
  const src = new Float32Array(n + fade);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    let last = 0;
    for (let i = 0; i < src.length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === 'white') src[i] = white;
      else {
        last = (last + 0.02 * white) / 1.02;
        src[i] = last * 3.5;
      }
    }
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) {
      if (i < fade) {
        const t = i / fade;
        d[i] = src[i]! * t + src[n + i]! * (1 - t);
      } else d[i] = src[i]!;
    }
  }
  return buf;
}
