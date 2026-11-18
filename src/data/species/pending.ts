import { type Codex, sealifebase } from '../codex';
import type { FishLook } from '../../render/fish/look';
import type { SpeciesDef } from '../types';

/**
 * The v1.3 deep-sea roster, drawn and tuned but NOT yet in the game: every
 * codex fact must be checked against a source first (spec v1.3 §5), and the
 * sources couldn't be reached from the session that built them. Only the
 * development previews (`?fish=<id>`, `?tank=deep`) use this list.
 */

/** Creatures aren't fish: these fish-only fields are required by the type but unused. */
const NOT_A_FISH: Pick<FishLook, 'body' | 'palette' | 'fins' | 'pattern' | 'eye'> = {
  body: { template: 'oval' },
  palette: { body: '#000', fin: '#000' },
  fins: [],
  pattern: [],
  eye: { u: 0.1, v: 0, size: 0.04, iris: '#000' },
};

export const atollaJellyfish: SpeciesDef = {
  id: 'atolla-jellyfish',
  biome: 'deep',
  rarity: 'common',
  commonName: 'Atolla jellyfish',
  scientificName: 'Atolla wyvillei',
  displayLength: 120,
  groupSize: [1, 2],
  look: {
    ...NOT_A_FISH,
    creature: {
      kind: 'jelly',
      height: 0.5,
      bell: '#a8202e',
      inner: '#3e0711',
      rim: '#cf3a44',
      lappets: 18,
      tentacles: { count: 18, length: 0.55, color: 'rgba(205,70,80,0.55)' },
      trailing: 3,
    },
    glow: { spots: Array.from({ length: 16 }, () => [0, 0] as [number, number]), size: 0.012, color: '#8fdcff', halo: '90,180,255', chase: true },
    swim: { speed: [0.05, 0.15], tailHz: 0.6, flex: 0, depth: [0.15, 0.75], behaviour: 'drift' },
  },
};

export const spottedLanternfish: SpeciesDef = {
  id: 'spotted-lanternfish',
  biome: 'deep',
  rarity: 'common',
  commonName: 'Spotted lanternfish',
  scientificName: 'Myctophum punctatum',
  displayLength: 62,
  groupSize: [8, 12],
  look: {
    body: { template: 'torpedo', upper: 0.12, lower: 0.12, maxAt: 0.3, peduncle: 0.32, bluntness: 0.75 },
    palette: { body: '#5d7189', back: '#27364c', belly: '#a4b6c7', fin: '#4a5a70' },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.38, to: 0.55, size: 0.1, tipAt: 0.4 },
      { kind: 'anal', shape: 'rounded', from: 0.55, to: 0.78, size: 0.07 },
      { kind: 'caudal', shape: 'forked', size: 0.24, spread: 0.16 },
      { kind: 'pectoral', shape: 'pointed', at: [0.24, 0.35], angle: 25, size: 0.12, opacity: 0.6 },
    ],
    pattern: [],
    eye: { u: 0.1, v: -0.15, size: 0.075, iris: '#2a3f5a' },
    glow: {
      spots: [
        ...Array.from({ length: 8 }, (_, i) => [0.16 + i * 0.1, 0.78] as [number, number]),
        ...Array.from({ length: 4 }, (_, i) => [0.3 + i * 0.12, 0.35] as [number, number]),
      ],
      size: 0.018,
      color: '#c4ecff',
      halo: '120,200,255',
    },
    swim: { speed: [0.6, 1.1], tailHz: 3.5, flex: 0.06, depth: [0.45, 0.9], behaviour: 'schooling', migrates: true },
  },
};

export const hatchetfish: SpeciesDef = {
  id: 'silver-hatchetfish',
  biome: 'deep',
  rarity: 'common',
  commonName: 'Silver hatchetfish',
  scientificName: 'Argyropelecus aculeatus',
  displayLength: 56,
  groupSize: [3, 5],
  look: {
    body: { template: 'tall-disc', upper: 0.18, lower: 0.42, maxAt: 0.35, peduncle: 0.12, bluntness: 0.6 },
    palette: { body: '#b4c1ce', back: '#4d5d73', belly: '#e2e9f0', fin: '#9fb0c0' },
    fins: [
      { kind: 'dorsal', shape: 'pointed', from: 0.45, to: 0.6, size: 0.1 },
      { kind: 'anal', shape: 'rounded', from: 0.6, to: 0.8, size: 0.06 },
      { kind: 'caudal', shape: 'forked', size: 0.22, spread: 0.15 },
      { kind: 'pectoral', shape: 'pointed', at: [0.25, 0.2], angle: 30, size: 0.12, opacity: 0.55 },
    ],
    pattern: [],
    // Big tubular eyes looking up, for spotting silhouettes against the faint light above.
    eye: { u: 0.13, v: -0.5, size: 0.09, iris: '#1d2c3d' },
    glow: {
      spots: Array.from({ length: 10 }, (_, i) => [0.12 + i * 0.055, 0.88] as [number, number]),
      size: 0.016,
      color: '#b2dcff',
      halo: '110,180,255',
    },
    swim: { speed: [0.3, 0.6], tailHz: 3, flex: 0.03, depth: [0.3, 0.8], behaviour: 'schooling', migrates: true },
  },
};

export const vampireSquid: SpeciesDef = {
  id: 'vampire-squid',
  biome: 'deep',
  rarity: 'uncommon',
  commonName: 'Vampire squid',
  scientificName: 'Vampyroteuthis infernalis',
  displayLength: 140,
  groupSize: [1, 1],
  look: {
    ...NOT_A_FISH,
    creature: {
      kind: 'cephalopod',
      mantle: { width: 0.42, height: 0.45, color: '#6a1e2a', belly: '#3e0f18' },
      fins: { size: 0.16, color: '#7a2834' },
      web: { length: 0.42, color: '#2c0912', arms: 8, armColor: '#1c060b' },
      eyeColor: '#4f95e6',
      eyeSize: 0.06,
    },
    glow: { spots: [], size: 0.016, color: '#c4ecff', halo: '120,200,255' },
    swim: { speed: [0.08, 0.2], tailHz: 0.5, flex: 0, depth: [0.3, 0.8], behaviour: 'drift' },
  },
};

export const dumboOctopus: SpeciesDef = {
  id: 'dumbo-octopus',
  biome: 'deep',
  rarity: 'uncommon',
  commonName: 'Dumbo octopus',
  scientificName: 'Grimpoteuthis',
  displayLength: 130,
  groupSize: [1, 1],
  look: {
    ...NOT_A_FISH,
    creature: {
      kind: 'cephalopod',
      mantle: { width: 0.5, height: 0.5, color: '#eaa9a2', belly: '#d08782' },
      fins: { size: 0.22, color: '#f2bbb3', ears: true },
      web: { length: 0.38, color: '#c98179', arms: 8, armColor: '#b56b65' },
      eyeColor: '#2a2024',
      eyeSize: 0.05,
    },
    swim: { speed: [0.08, 0.2], tailHz: 0.4, flex: 0, depth: [0.55, 0.95], behaviour: 'drift' },
  },
};

export const humpbackAnglerfish: SpeciesDef = {
  id: 'humpback-anglerfish',
  biome: 'deep',
  rarity: 'rare',
  commonName: 'Humpback anglerfish',
  scientificName: 'Melanocetus johnsonii',
  displayLength: 120,
  groupSize: [1, 1],
  look: {
    body: { template: 'oval', upper: 0.32, lower: 0.35, maxAt: 0.45, peduncle: 0.25, bluntness: 0.95 },
    palette: { body: '#3c3539', back: '#221d22', belly: '#4c4448', fin: '#352e33' },
    fins: [
      { kind: 'dorsal', shape: 'rounded', from: 0.62, to: 0.8, size: 0.1 },
      { kind: 'anal', shape: 'rounded', from: 0.66, to: 0.82, size: 0.08 },
      { kind: 'caudal', shape: 'rounded', size: 0.22, spread: 0.16 },
      { kind: 'pectoral', shape: 'rounded', at: [0.38, 0.15], angle: 30, size: 0.12, opacity: 0.7 },
    ],
    pattern: [],
    eye: { u: 0.16, v: -0.4, size: 0.03, iris: '#3c4c5c' },
    // A huge, gaping mouth slanting up toward the front.
    mouth: { length: 0.3, slope: -0.9 },
    lure: { at: [0.06, -0.95], length: 0.45, color: '#2e272c', bulb: '#dcf8ff', halo: '150,230,255' },
    swim: { speed: [0.1, 0.25], tailHz: 1.5, flex: 0.03, depth: [0.4, 0.85], behaviour: 'drift' },
  },
};

export const PENDING_DEEP: readonly SpeciesDef[] = [
  atollaJellyfish,
  spottedLanternfish,
  hatchetfish,
  vampireSquid,
  dumboOctopus,
  humpbackAnglerfish,
];

/**
 * Codex entries already checked against their sources (18 November 2026),
 * ready to move into codex.ts when the species are registered. Only the three
 * animals that aren't fish are here: FishBase couldn't be reached for the
 * three fish (spotted lanternfish, silver hatchetfish, humpback anglerfish).
 * Where sources disagreed (Atolla's depth), the entry says less.
 */
export const PENDING_CODEX: Record<string, Codex> = {
  'atolla-jellyfish': {
    nativeRange: 'Oceans around the world: the Atlantic, Indian and Pacific oceans and the Antarctic, from tropical to polar waters',
    // SeaLifeBase: 78°N to 44°S, all longitudes.
    range: [
      [
        [-180, 78],
        [180, 78],
        [180, -44],
        [-180, -44],
      ],
    ],
    habitat: 'Open water far offshore, in the deep sea',
    size: { cm: 15, measure: 'WD' },
    diet: 'Crustaceans and other drifting food',
    water: { type: 'salt' },
    funFacts: [
      'When attacked, it sets off a series of blue flashes, which may draw in bigger predators more interested in its attacker than in the jelly itself.',
      'One of its tentacles grows much longer than the others, and is thought to help it catch prey.',
      'The marine biologist Edith Widder built a camera lure, the E-jelly, that copies its alarm flashes.',
    ],
    sources: [sealifebase('Atolla-wyvillei'), { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Atolla_jellyfish' }],
  },

  'vampire-squid': {
    nativeRange: 'Tropical and temperate oceans around the world',
    // SeaLifeBase: 44°N to 35°S, all longitudes.
    range: [
      [
        [-180, 44],
        [180, 44],
        [180, -35],
        [-180, -35],
      ],
    ],
    habitat: 'The open ocean at about 600 to 900 m and deeper, where no sunlight reaches; especially common where the water holds very little oxygen',
    size: { cm: 30, measure: 'TL' },
    diet: 'Marine snow: drifting detritus, including the remains of jelly-like zooplankton, plus small zooplankton',
    water: { type: 'salt' },
    funFacts: [
      'Despite its name it is neither a vampire nor a squid, but the last surviving member of an ancient group of cephalopods.',
      "It doesn't drink blood: it gathers drifting bits of food with two long, thin, sticky filaments.",
      'If disturbed, it can release a sticky cloud of glowing blue mucus from its arm tips.',
    ],
    sources: [
      sealifebase('Vampyroteuthis-infernalis'),
      { label: 'MBARI', url: 'https://www.mbari.org/animal/vampire-squid/' },
      { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Vampire_squid' },
    ],
  },

  'dumbo-octopus': {
    nativeRange: 'Probably all the world\'s oceans: found off Oregon, California, the Azores, New Zealand, Australia, the Philippines and Argentina, and in the Gulf of Mexico',
    // Thought to be worldwide; drawn as a broad band covering the places it has been found.
    range: [
      [
        [-180, 55],
        [180, 55],
        [180, -50],
        [-180, -50],
      ],
    ],
    habitat: 'On and just above the seafloor in the cold deep sea; species in the genus have been found from about 480 m down to nearly 7,000 m',
    // The largest length SeaLifeBase lists for the genus (Grimpoteuthis umbellata).
    size: { cm: 40, measure: 'TL' },
    diet: 'Crustaceans, bivalves, worms and copepods',
    water: { type: 'salt' },
    funFacts: [
      'Its nickname comes from the two ear-like fins above its eyes, which recall the title character of Disney\'s 1941 film Dumbo.',
      'Dumbo octopuses are the deepest-living octopuses known: one was filmed 6,957 m down in the Java Trench in 2020.',
      'It swims by flapping its fins, and rests on the seafloor with its arms and web spread out.',
    ],
    sources: [
      sealifebase('Grimpoteuthis-umbellata'),
      { label: 'SeaLifeBase (genus)', url: 'https://www.sealifebase.se/identification/SpeciesList.php?genus=Grimpoteuthis' },
      { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Grimpoteuthis' },
    ],
  },
};
