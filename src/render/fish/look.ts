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
  | { type: 'swirls'; count: number; color: string; width: number; amplitude: number; frequency: number; seed: number }
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

export type SwimBehaviour = 'schooling' | 'bottom-dweller' | 'cruiser' | 'hover' | 'darting';

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
}

export interface FishLook {
  body: BodyShape;
  palette: Palette;
  fins: Fin[];
  pattern: PatternLayer[];
  eye: Eye;
  /** Draw a faint gill-cover line at this u. Default 0.22; null to hide. */
  gill?: number | null;
  swim: Swim;
}
