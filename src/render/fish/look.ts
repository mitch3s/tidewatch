/**
 * The parameters that describe how a species looks and swims (spec section 6).
 *
 * Fish geometry is in "body units": the body (nose to tail base, without the
 * tail fin) is 1 unit long, facing +x, with the nose at x = +0.5.
 * Positions along the body use `u` (0 = nose, 1 = tail base) and positions
 * across it use `v` (-1 = top edge, 0 = spine, +1 = bottom edge).
 */

export type BodyTemplate = 'torpedo' | 'oval' | 'disc' | 'tall-disc' | 'elongated' | 'flat-bottom';

export interface BodyShape {
  template: BodyTemplate;
  /** Height above the spine at the deepest point, in body lengths. */
  upper?: number;
  /** Depth below the spine at the deepest point, in body lengths. */
  lower?: number;
  /** Where the body is deepest (0 = nose, 1 = tail base). */
  maxAt?: number;
  /** Height at the tail base, as a fraction of the maximum. */
  peduncle?: number;
  /** 0 = pointed snout, 1 = blunt, rounded head. */
  bluntness?: number;
  /** Length of a protruding tube-like snout, in body lengths (0 = none). */
  snout?: number;
  /** Snout height as a fraction of the body's maximum height. */
  snoutHeight?: number;
}

export type FinKind = 'dorsal' | 'anal' | 'caudal' | 'pectoral' | 'pelvic';
export type FinShape = 'rounded' | 'pointed' | 'trailing' | 'fan' | 'forked' | 'lyre' | 'square' | 'lunate';

export interface FinBase {
  shape: FinShape;
  /** Fin length, in body lengths. */
  size: number;
  /** Fill colour; defaults to `palette.fin`. */
  color?: string;
  /** Margin colour; defaults to `palette.finEdge` (none if unset). */
  edge?: string;
  /** Margin width, in body lengths. */
  edgeWidth?: number;
  /** 0..1; fins are slightly see-through by default. */
  opacity?: number;
  /** Draw faint fin rays. Default true. */
  rays?: boolean;
}

/** Dorsal and anal fins run along the top or bottom edge. */
export interface EdgeFin extends FinBase {
  kind: 'dorsal' | 'anal';
  /** Attachment along the body, 0 = nose, 1 = tail base. */
  from: number;
  to: number;
  /** Where along the base the tip sits (0 = front, 1 = back). Default 0.4. */
  tipAt?: number;
  /** How far the tip leans back toward the tail, in body lengths. Default 0. */
  sweep?: number;
}

export interface CaudalFin extends FinBase {
  kind: 'caudal';
  /** Half-height of the tail at its widest, in body lengths. */
  spread: number;
}

/** Pectoral and pelvic fins hang off a point on the body. */
export interface PointFin extends FinBase {
  kind: 'pectoral' | 'pelvic';
  /** Anchor position [u, v]. */
  at: [number, number];
  /** Angle in degrees below "straight back toward the tail". */
  angle: number;
  /** Half-width of the fin relative to its length. Default 0.35. */
  width?: number;
}

export type Fin = EdgeFin | CaudalFin | PointFin;

export interface Palette {
  body: string;
  /** Colour along the top of the back; defaults to `body`. */
  back?: string;
  /** Colour of the belly; defaults to `body`. */
  belly?: string;
  fin: string;
  finEdge?: string;
}

export type PatternLayer =
  /** A band across the body, e.g. clownfish bars. */
  | {
      type: 'band';
      at: number;
      width: number;
      color: string;
      edge?: string;
      edgeWidth?: number;
      /** Positive bows the middle of the band toward the tail. */
      curve?: number;
      /** A bump on the band's front edge at height `v`; negative points toward the head. */
      bulge?: { v: number; amount: number; spread?: number };
    }
  /**
   * A stripe along the body at height `v` (sloping to `vEnd` at the back,
   * if given); thickness is in v units.
   */
  | { type: 'stripe'; v: number; vEnd?: number; thickness: number; from: number; to: number; color: string; taper?: boolean }
  /** Fill everything above or below `boundary` (in v units) between `from` and `to`. */
  | { type: 'region'; side: 'upper' | 'lower'; boundary: number; from: number; to: number; color: string }
  | {
      type: 'spots';
      count: number;
      from: number;
      to: number;
      vRange: [number, number];
      radius: [number, number];
      color: string;
      seed: number;
    }
  /** Wavy lines along the body; `outline` draws each one with a darker edge. */
  | {
      type: 'swirls';
      count: number;
      color: string;
      width: number;
      amplitude: number;
      frequency: number;
      seed: number;
      outline?: string;
      /** Run every line the full length of the body (default: random lengths). */
      full?: boolean;
      /** With `full`: where the lines start and end along the body (default 0.02..1.02). */
      from?: number;
      to?: number;
    }
  /** Rows of scale or armour-plate outlines. */
  | { type: 'scales'; rows: number; cols: number; from: number; to: number; vRange: [number, number]; color: string; width: number }
  | { type: 'outline'; color: string; width: number };

export interface Eye {
  u: number;
  v: number;
  /** Radius in body lengths. */
  size: number;
  iris: string;
  /** Ring around the iris; defaults to a pale ring. */
  ring?: string;
}

/** `drift`: slow, wandering anywhere, never in a hurry (jellies, deep-sea cephalopods). */
export type SwimBehaviour = 'schooling' | 'bottom-dweller' | 'cruiser' | 'hover' | 'darting' | 'drift';

export interface Swim {
  /** Cruising speed range, in body lengths per second. */
  speed: [number, number];
  /** Tail beats per second at cruising speed. */
  tailHz: number;
  /** How much the body bends, in body lengths at the tail. */
  flex: number;
  /** Preferred depth band, 0 = surface, 1 = bottom. */
  depth: [number, number];
  behaviour: SwimBehaviour;
  /**
   * Rises toward the surface at night and sinks back by day (diel vertical
   * migration, e.g. lanternfish). Shifts the depth band up at night.
   */
  migrates?: boolean;
}

/** Light-producing spots (photophores), drawn as bright dots that glow in the dark. */
export interface Glow {
  /** Spot positions [u, v] on the body. */
  spots: Array<[number, number]>;
  /** Dot radius in body lengths. */
  size: number;
  color: string;
  /** Halo colour as "r,g,b" (drawn additively in the tank, gently pulsing). */
  halo: string;
  /** Light travels from spot to spot instead of all glowing together (Atolla's alarm display). */
  chase?: boolean;
}

/** An anglerfish's fishing lure: a stalk from the head with a glowing bulb. */
export interface Lure {
  /** Where the stalk starts [u, v]. */
  at: [number, number];
  /** Stalk length in body lengths. */
  length: number;
  color: string;
  /** Bulb colour, and halo colour as "r,g,b". */
  bulb: string;
  halo: string;
}

/** A jellyfish: a pulsing bell with hanging tentacles. Body length = bell diameter. */
export interface JellyForm {
  kind: 'jelly';
  /** Bell height as a fraction of its width. */
  height: number;
  bell: string;
  /** Darker inner colour (stomach) and the bell's rim. */
  inner: string;
  rim: string;
  /** Number of scalloped lobes on the rim. */
  lappets: number;
  tentacles: { count: number; length: number; color: string };
  /** One much longer trailing tentacle (Atolla), as a multiple of `tentacles.length`. */
  trailing?: number;
}

/**
 * A deep-sea cephalopod seen side-on: a rounded mantle with two fins, eyes,
 * and arms joined by a web that opens and closes like an umbrella.
 * Body length = mantle plus arms.
 */
export interface CephalopodForm {
  kind: 'cephalopod';
  mantle: { width: number; height: number; color: string; belly: string };
  /** Fins on the mantle: size, and whether they're big ear-like flaps (dumbo). */
  fins: { size: number; color: string; ears?: boolean };
  web: { length: number; color: string; arms: number; armColor: string };
  eyeColor: string;
  eyeSize: number;
}

export type CreatureForm = JellyForm | CephalopodForm;

export interface FishLook {
  body: BodyShape;
  palette: Palette;
  fins: Fin[];
  pattern: PatternLayer[];
  eye: Eye;
  /** Draw a faint gill-cover line at this u. Default 0.22; null to hide. */
  gill?: number | null;
  /** Mouth line from the snout tip, going back: length in body lengths, and slope (dy/dx; positive slants down). */
  mouth?: { length: number; slope: number };
  /** Whisker-like barbels at the mouth: how many, and their length. */
  barbels?: { count: number; length: number; color?: string };
  /** Glowing photophores (deep-sea species). */
  glow?: Glow;
  /** Anglerfish lure. */
  lure?: Lure;
  /**
   * Not a fish: drawn by the creature renderer instead (body, fins, pattern
   * and eye are then ignored, apart from what sizing needs).
   */
  creature?: CreatureForm;
  swim: Swim;
}
