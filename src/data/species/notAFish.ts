import type { FishLook } from '../../render/fish/look';

/** Creatures aren't fish: these fish-only fields are required by the type but unused. */
export const NOT_A_FISH: Pick<FishLook, 'body' | 'palette' | 'fins' | 'pattern' | 'eye'> = {
  body: { template: 'oval' },
  palette: { body: '#000', fin: '#000' },
  fins: [],
  pattern: [],
  eye: { u: 0.1, v: 0, size: 0.04, iris: '#000' },
};
