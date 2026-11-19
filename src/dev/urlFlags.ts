/** Debug URL flags (spec section 10): shortcuts to god-mode actions. */
export interface DevFlags {
  /** `?timescale=60`: game time runs this many times faster. */
  timescale: number | null;
  /** `?visitor=now`: a rare visitor appears straight away. */
  visitorNow: boolean;
  /** `?arrival=now`: the next fish arrives straight away. */
  arrivalNow: boolean;
  /** `?unlockAll`: unlock every tank. */
  unlockAll: boolean;
  /** `?collectAll`: collect every species (and so unlock every tank). */
  collectAll: boolean;
  /** `?reset`: start from a fresh save. */
  reset: boolean;
  /** `?debug`: show timers and frame rate. */
  debug: boolean;
  /** `?god`: open god mode at startup. */
  god: boolean;
  /** `?closeup=now`: start a close-up straight away. */
  closeupNow: boolean;
}

export function parseDevFlags(search: string): DevFlags {
  const p = new URLSearchParams(search);
  const ts = Number(p.get('timescale'));
  return {
    timescale: p.has('timescale') && Number.isFinite(ts) && ts > 0 ? ts : null,
    visitorNow: p.get('visitor') === 'now',
    arrivalNow: p.get('arrival') === 'now',
    unlockAll: p.has('unlockAll'),
    collectAll: p.has('collectAll'),
    reset: p.has('reset'),
    debug: p.has('debug'),
    god: p.has('god'),
    closeupNow: p.get('closeup') === 'now',
  };
}
