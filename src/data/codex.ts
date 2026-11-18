/**
 * Codex entries (spec 3, 5.3): where each fish comes from, and facts about it.
 *
 * Every fact here was checked against the sources listed with it (November
 * 2026). FishBase is the primary source; others are used for behaviour and
 * fun facts. Where sources disagreed, the entry says less rather than more:
 * no water temperature where none was found, and "threatened" for the zebra
 * pleco, whose exact IUCN category is reported inconsistently.
 *
 * `range` is a rough outline of the native range as [longitude, latitude]
 * polygons, for the codex map. It is approximate, for display only.
 */

export interface Source {
  label: string;
  url: string;
}

export interface Codex {
  /** Short description of the native range. */
  nativeRange: string;
  /** Rough outline(s) of the native range, as [lon, lat] polygons. */
  range: Array<Array<[number, number]>>;
  habitat: string;
  /**
   * Maximum recorded size. TL = total length, SL = standard length (without the
   * tail fin); WD = width of a jellyfish's bell, as SeaLifeBase gives it.
   */
  size: { cm: number; measure: 'TL' | 'SL' | 'WD' };
  diet: string;
  water: { type: 'salt' | 'fresh'; tempC?: [number, number] };
  funFacts: string[];
  sources: Source[];
}

const fishbase = (path: string): Source => ({ label: 'FishBase', url: `https://www.fishbase.se/summary/${path}` });
/** SeaLifeBase: FishBase's sister database, for animals that aren't fish (deep sea, v1.3). */
export const sealifebase = (path: string): Source => ({ label: 'SeaLifeBase', url: `https://www.sealifebase.se/summary/${path}` });

export const CODEX: Record<string, Codex> = {
  'ocellaris-clownfish': {
    nativeRange: 'Eastern Indian Ocean and western Pacific: from the Ryukyu Islands of Japan through Southeast Asia to northwest Australia',
    range: [
      [
        [95, 12],
        [108, 22],
        [127, 30],
        [134, 26],
        [131, 8],
        [134, -8],
        [126, -16],
        [113, -22],
        [104, -8],
        [95, 2],
      ],
    ],
    habitat: 'Coral reefs and sheltered lagoons, from 3 to 15 m deep, always living with a host sea anemone',
    size: { cm: 11, measure: 'TL' },
    diet: 'Zooplankton, small crustaceans such as copepods and isopods, and algae; it also takes food from its host anemone',
    water: { type: 'salt', tempC: [24, 32] },
    funFacts: [
      'Every clownfish starts life as a male, and some later become female. In each group the largest fish is the female and the second largest is her breeding male.',
      'It lives among the stinging tentacles of just a few kinds of sea anemone, such as the magnificent sea anemone and the giant carpet anemone.',
    ],
    sources: [
      fishbase('6509'),
      { label: 'Florida Museum of Natural History', url: 'https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/clown-anemonefish/' },
      { label: 'Animal Diversity Web', url: 'https://animaldiversity.org/accounts/Amphiprion_ocellaris/' },
      { label: 'Reef Life Survey', url: 'https://reeflifesurvey.com/species/Amphiprion-ocellaris' },
    ],
  },

  'yellow-tang': {
    nativeRange: 'Pacific Ocean, mainly Hawaii, and parts of the northwest Pacific',
    range: [
      [
        [-161, 18],
        [-154, 18],
        [-154, 23],
        [-161, 23],
      ],
      [
        [128, 12],
        [168, 8],
        [170, 20],
        [140, 28],
        [127, 26],
      ],
    ],
    habitat: 'Reefs, from about 2 to 46 m deep',
    size: { cm: 20, measure: 'TL' },
    diet: 'Filamentous algae, which it scrapes off rocks and coral',
    water: { type: 'salt', tempC: [25, 29] },
    funFacts: [
      'It has a sharp, white, scalpel-like spine on each side of its tail, used for defence. That spine is why tangs are also called surgeonfish.',
      'It is a strict vegetarian: studies of its stomach contents found algae and nothing else.',
      'It is the aquarium fish most often collected in Hawaii.',
    ],
    sources: [
      fishbase('6018'),
      { label: 'Animal Diversity Web', url: 'https://animaldiversity.org/accounts/Zebrasoma_flavescens/' },
      { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Yellow_tang' },
    ],
  },

  'blue-tang': {
    nativeRange: 'Indo-Pacific: East Africa to Kiribati, north to southern Japan, south to the Great Barrier Reef, New Caledonia and Samoa',
    range: [
      [
        [38, 2],
        [45, 12],
        [75, 8],
        [100, 18],
        [130, 33],
        [180, 5],
        [180, -18],
        [165, -25],
        [145, -25],
        [113, -20],
        [60, -22],
        [38, -15],
      ],
      [
        [-180, 5],
        [-170, 2],
        [-170, -15],
        [-180, -18],
      ],
    ],
    habitat: 'Clear, current-swept terraces on the outer reef, 2 to 40 m deep; young fish stay near branching coral heads',
    size: { cm: 31, measure: 'TL' },
    diet: 'Mostly zooplankton, and occasionally algae',
    water: { type: 'salt', tempC: [25, 29] },
    funFacts: [
      'It is also known as the palette surgeonfish or the regal tang.',
      'Unlike most surgeonfish, which graze on algae, it mostly eats plankton in open water.',
      'Young blue tangs live in groups around branching coral heads and dive in among the branches when alarmed.',
    ],
    sources: [fishbase('6017')],
  },

  'royal-gramma': {
    nativeRange: 'Western Atlantic: Bermuda and the Bahamas, through Central America to northern South America',
    range: [
      [
        [-89, 21],
        [-84, 9],
        [-62, 9],
        [-60, 16],
        [-66, 22],
        [-73, 27],
        [-78, 27],
        [-85, 23],
      ],
      [
        [-65.2, 32],
        [-64.4, 32],
        [-64.4, 32.6],
        [-65.2, 32.6],
      ],
    ],
    habitat: 'Caves and ledges on coral reefs, usually 1 to 40 m deep (recorded to 60 m)',
    size: { cm: 8, measure: 'TL' },
    diet: 'Zooplankton and small crustaceans; it also picks parasites off other fish',
    water: { type: 'salt' },
    funFacts: [
      'Under ledges it swims with its belly towards the rock, so it often looks as if it is upside down.',
      'Males build nests in small holes in the reef. Females visit around dawn to lay their eggs, and the male guards them.',
    ],
    sources: [fishbase('5281'), { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Royal_gramma' }],
  },

  'moorish-idol': {
    nativeRange: 'Indo-Pacific from East Africa to the islands of the central Pacific, and the eastern Pacific from the Gulf of California to Peru',
    range: [
      [
        [38, 4],
        [50, 14],
        [75, 10],
        [125, 32],
        [180, 28],
        [180, -30],
        [150, -32],
        [113, -26],
        [60, -26],
        [38, -18],
      ],
      [
        [-180, 28],
        [-150, 24],
        [-124, -18],
        [-128, -26],
        [-180, -30],
      ],
      [
        [-112, 28],
        [-104, 20],
        [-82, 4],
        [-80, -8],
        [-88, -2],
        [-110, 16],
      ],
    ],
    habitat: 'Lagoons, reef flats and clear outer reefs; recorded from the surface down to 182 m',
    size: { cm: 23, measure: 'TL' },
    diet: 'Small encrusting animals, especially sponges',
    water: { type: 'salt' },
    funFacts: [
      'It feeds mainly on encrusting sponges, which is one reason it is so hard to keep in an aquarium.',
      'It has been recorded from right at the surface all the way down to 182 m.',
    ],
    sources: [fishbase('5950'), { label: 'Fishes of Australia', url: 'https://fishesofaustralia.net.au/Home/species/1891' }],
  },

  'mandarin-dragonet': {
    nativeRange: 'Western Pacific: from the Ryukyu Islands of Japan to Australia',
    range: [
      [
        [112, 18],
        [122, 26],
        [130, 29],
        [140, 12],
        [155, -4],
        [154, -24],
        [140, -14],
        [118, -12],
        [106, 2],
      ],
    ],
    habitat: 'Sheltered lagoons and inshore reefs, 1 to 18 m deep',
    size: { cm: 6, measure: 'TL' },
    diet: 'Tiny bottom-living invertebrates such as small crustaceans',
    water: { type: 'salt' },
    funFacts: [
      'It has no scales. Instead its skin is covered in a thick, bad-smelling mucus that may help keep predators away.',
      'Its blue is a real blue pigment, held in special cells called cyanophores. Almost every other blue animal gets its colour from structure, not pigment.',
      'Pairs spawn at dusk, rising together above the reef to release their eggs.',
    ],
    sources: [
      fishbase('12644'),
      { label: 'Animal Diversity Web', url: 'https://animaldiversity.org/accounts/Synchiropus_splendidus/' },
      { label: 'Smithsonian Ocean', url: 'https://ocean.si.edu/ocean-life/fish/mandarinfish-duo' },
      { label: 'Goda & Fujii (1995), Zoological Science', url: 'https://doi.org/10.2108/zsj.12.811' },
    ],
  },

  'neon-tetra': {
    nativeRange: 'Upper Amazon basin: southeastern Colombia, eastern Peru and western Brazil',
    range: [
      [
        [-76, -1],
        [-71, 2],
        [-64, 0],
        [-62, -4],
        [-70, -8],
        [-75, -6],
      ],
    ],
    habitat: 'Blackwater and clearwater streams flowing into the Solimões, the upper Amazon',
    size: { cm: 2.5, measure: 'SL' },
    diet: 'Worms, small insects, crustaceans and plant matter',
    water: { type: 'fresh', tempC: [20, 26] },
    funFacts: [
      'In the wild it lives in very soft, acidic water, with a pH as low as 5.',
      'Its whole body, not counting the tail fin, is only about 2.5 cm long.',
    ],
    sources: [fishbase('10691')],
  },

  'bronze-corydoras': {
    nativeRange: 'Much of tropical South America; first described from Trinidad',
    range: [
      [
        [-76, 9],
        [-62, 11],
        [-52, 5],
        [-44, -3],
        [-40, -14],
        [-48, -26],
        [-58, -28],
        [-65, -20],
        [-72, -10],
        [-78, -2],
      ],
    ],
    habitat: 'Mostly quiet, shallow water over soft bottoms, but also running water',
    size: { cm: 7.5, measure: 'SL' },
    diet: 'Worms and other small bottom-living invertebrates, and some plant matter',
    water: { type: 'fresh' },
    funFacts: [
      'It can breathe air. It darts to the surface, gulps a bubble, and absorbs the oxygen through the wall of its gut.',
      'In 2024 scientists moved it to a new genus, so its official name is now Osteogaster aenea.',
    ],
    sources: [
      fishbase('7777'),
      { label: 'Scotcat', url: 'https://www.scotcat.com/factsheets/osteogaster_aenea.html' },
      {
        label: 'The Online Guide to the Animals of Trinidad and Tobago',
        url: 'https://sta.uwi.edu/fst/lifesciences/sites/default/files/lifesciences/documents/ogatt/Corydoras_aeneus%20-%20Bronze%20Corydoras.pdf',
      },
    ],
  },

  'freshwater-angelfish': {
    nativeRange: 'Amazon basin in Peru, Colombia and Brazil, plus rivers in Amapá (Brazil), French Guiana and Guyana',
    range: [
      [
        [-77, -3],
        [-70, 2],
        [-60, 7],
        [-52, 5],
        [-50, 0],
        [-56, -3],
        [-66, -5],
        [-74, -8],
      ],
    ],
    habitat: 'Slow-moving, plant-rich waters of the river basins',
    size: { cm: 15, measure: 'TL' },
    diet: 'Small fish, shrimps, worms and other invertebrates',
    water: { type: 'fresh', tempC: [24, 30] },
    funFacts: [
      'Both parents guard their eggs, which they stick to a leaf or a sunken log, and fan them to keep fresh water flowing over them.',
      'With its tall fins, an adult can be taller than it is long.',
      'Almost all angelfish in aquariums today are captive-bred.',
    ],
    sources: [fishbase('4717'), { label: 'Seriously Fish', url: 'https://seriouslyfish.com/species/pterophyllum-scalare' }],
  },

  discus: {
    nativeRange: 'Eastern Amazon: the lower Amazon and its tributaries east of where the Negro meets the Solimões',
    range: [
      [
        [-60, -1],
        [-50, -0.5],
        [-50, -3.5],
        [-60, -4],
      ],
    ],
    habitat: 'Slow-moving tributaries and forest pools, rather than the main river channels',
    size: { cm: 13.7, measure: 'SL' },
    diet: 'Mostly detritus, plant material and algae, plus small invertebrates',
    water: { type: 'fresh', tempC: [26, 30] },
    funFacts: [
      'Both parents feed their babies with a mucus they produce from their skin, a little like milk, and wean them after about three weeks.',
      'Early fishkeepers who raised young discus away from their parents lost many to starvation, because the babies would not eat ordinary food.',
    ],
    sources: [
      fishbase('Symphysodon-aequifasciatus'),
      { label: 'Buckley et al. (2010), Journal of Experimental Biology', url: 'https://www.sciencedaily.com/releases/2010/10/101029104603.htm' },
      { label: 'Seriously Fish', url: 'https://seriouslyfish.com/species/symphysodon-aequifasciatus' },
    ],
  },

  'zebra-pleco': {
    nativeRange: 'Only a short stretch of the Xingu River in Brazil, around its big bend below Altamira',
    range: [
      [
        [-53, -2.8],
        [-51.5, -2.8],
        [-51.5, -3.8],
        [-53, -3.8],
      ],
    ],
    habitat: 'Fast-flowing, oxygen-rich water, hiding in crevices between rocks',
    size: { cm: 7, measure: 'TL' },
    diet: 'Small invertebrates such as insect larvae',
    water: { type: 'fresh', tempC: [23, 26] },
    funFacts: [
      'It lives nowhere else in the world: its whole range lies in the area affected by the Belo Monte hydroelectric dam.',
      'It is a threatened species, and exporting it from Brazil has been illegal since 2004.',
    ],
    sources: [
      { label: 'FishBase', url: 'https://fishbase.net.br/summary/53570' },
      { label: 'Neotropical Ichthyology (2025)', url: 'https://www.scielo.br/j/ni/a/ZRNq9v4jM5jH8GqZHRBbkLH/?lang=en' },
      { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Zebra_pleco' },
    ],
  },

  'silver-arowana': {
    nativeRange: 'Amazon basin, plus the Rupununi (Essequibo) and Oyapock rivers',
    range: [
      [
        [-78, -3],
        [-70, 2],
        [-62, 4],
        [-58, 5],
        [-51, 4],
        [-50, -1],
        [-58, -6],
        [-68, -10],
        [-76, -8],
      ],
    ],
    habitat: 'Just below the surface of rivers and flooded forest',
    size: { cm: 90, measure: 'TL' },
    diet: 'Insects, crustaceans, snails and small fish',
    water: { type: 'fresh', tempC: [24, 30] },
    funFacts: [
      "It's nicknamed the 'water monkey', because it leaps out of the water to snatch insects from overhanging branches.",
      'The father carries the eggs, and later the young, in his mouth.',
    ],
    sources: [fishbase('6234'), { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Silver_arowana' }],
  },
};
