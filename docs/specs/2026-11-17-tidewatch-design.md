# Tidewatch — Design Spec

**Date:** 2026-11-17
**Status:** Approved
**Platform:** LG webOS TV (web app), developed and tested in a desktop browser first

## 1. Summary

**Tidewatch** is an ambient aquarium app for LG webOS TVs. You launch it and leave it running, like a screensaver. While it runs you slowly collect **real fish species**. A **codex** shows each fish's native range, habitat, size, diet, temperament and fun facts.

Third-party webOS apps cannot replace the TV's system screensaver, so this is a full-screen app designed to be left on.

## 2. Goals and non-goals

**Goals**
- Beautiful, calm, always-moving aquarium suitable for hours of idle display.
- Gentle collection loop that progresses with no input, but rewards attention.
- Educational codex with accurate, sourced facts.
- Fully usable with a D-pad remote and the LG Magic Remote pointer.
- Safe for OLED panels (no static UI left on screen).
- Fast iteration on a PC; the TV is only needed for final verification.

**Non-goals (v1)**
- No accounts, cloud sync, or multiplayer.
- No progress while the app is closed (it is a screensaver; time counts only while running).
- No tank decoration or fish care/feeding mechanics.
- No sound (possible later: optional ambient bubbles).

## 3. Content: v1 roster (2 biomes, 12 species)

| Biome | Species | Scientific name | Rarity |
|---|---|---|---|
| Coral reef | Ocellaris clownfish | *Amphiprion ocellaris* | Common |
| Coral reef | Yellow tang | *Zebrasoma flavescens* | Common |
| Coral reef | Blue tang | *Paracanthurus hepatus* | Common |
| Coral reef | Royal gramma | *Gramma loreto* | Uncommon |
| Coral reef | Moorish idol | *Zanclus cornutus* | Uncommon |
| Coral reef | Mandarin dragonet | *Synchiropus splendidus* | Rare visitor |
| Amazon river | Neon tetra | *Paracheirodon innesi* | Common |
| Amazon river | Bronze corydoras | *Corydoras aeneus* | Common |
| Amazon river | Freshwater angelfish | *Pterophyllum scalare* | Uncommon |
| Amazon river | Blue discus | *Symphysodon aequifasciatus* | Uncommon |
| Amazon river | Zebra pleco | *Hypancistrus zebra* | Rare visitor |
| Amazon river | Silver arowana | *Osteoglossum bicirrhosum* | Rare visitor |

All codex facts are checked against a cited source (FishBase as the primary source, plus others where needed). Each entry stores its source URLs.

## 4. Game mechanics

### 4.1 Time-based arrivals
- An **arrival timer** runs only while the app is in the foreground.
- Every *arrival interval* (default: random 20–40 min, tunable), one not-yet-collected **common or uncommon** species from an unlocked biome arrives. Weights: common 3, uncommon 1.
- The new fish swims into its biome's tank. A small toast ("A Royal gramma has settled in") shows for about 6 seconds, then fades.
- Once every common and uncommon fish is collected, the timer stops.

### 4.2 Rare visitors
- On a random interval (default: 45–90 min of runtime), a **rare visitor** not yet caught appears in the **currently shown** tank.
- It crosses the tank slowly with a subtle shimmer. A soft "Press OK" hint appears near the bottom edge (it moves around slightly to avoid burn-in).
- The **catch window** is the time the fish is on screen (about 25 seconds). Pressing **OK**, or clicking it with the pointer, catches it: a short celebration, then it joins the tank and the codex.
- If it is missed, the species is marked **Sighted**: the codex shows a silhouette, its name and biome, but no details.
- Visitors appear only for unlocked biomes.

### 4.3 Biome unlocks
- The coral reef is unlocked at the start, with 2 starter fish: the Ocellaris clownfish and the Yellow tang.
- The **Amazon river** unlocks when 4 coral reef species are collected. It arrives with 2 starter fish of its own: the Neon tetra and the Bronze corydoras.
- An unlock shows a one-time "New tank discovered" toast.

### 4.4 Tank population
- Each collected species appears as a small group appropriate to the species: tetras school (8–12), corydoras in groups (3–5), tangs 1–2, arowana 1.
- The fish count is capped per tank for performance (target: 40 fish maximum).

### 4.5 Collection states
`unseen` → `sighted` (rare visitors only) → `collected` (with a timestamp).

## 5. Screens and UX

### 5.1 Aquarium (main)
- Full-screen tank. Background layers: water gradient, distant silhouettes (rocks and coral, or roots and plants), moving light rays, rising bubbles, foreground plants that sway.
- **Idle mode:** after 10 seconds with no input, all UI fades out completely.
- **Slow camera drift:** a gentle pan and zoom of a few percent over minutes.
- **Tank rotation:** if more than one biome is unlocked, the app cross-fades to the next tank every 15 minutes (configurable). It doesn't rotate while a rare visitor is present.
- **Day/night:** tint and brightness follow the local clock. Night is dimmer and bluer, and some species idle near the bottom.

### 5.2 Codex
- Opened with **Up**, the menu, or the **Back** key from the aquarium.
- One tab per biome (Left and Right switch tabs when focus is in the tab row).
- A grid of cards: a collected card shows a coloured, animated thumbnail; a sighted card shows a silhouette and name; an unseen card shows "?".
- A progress count for each biome (for example "4 / 6").

### 5.3 Codex entry (detail)
- A large live-rendered fish swimming in a small window.
- Common name, scientific name, rarity badge, the date collected.
- **Native range:** a simplified world map with the native region highlighted (one SVG world map, with a region polygon or bounding area per species).
- Facts: habitat, maximum size, diet, water type, and temperature where a source gives it.
  *(Changed in Milestone 6: temperament was dropped, because it's aquarium-hobby opinion rather than something the sources state.)*
- 2–3 **fun facts**.
- Sources, in small print.
- **Left and Right** move to the previous and next entry, and **Back** returns to the grid.

### 5.4 Settings (minimal)
- Tank rotation interval: off, 5, 15 or 30 minutes.
- Day/night lighting: on or off.
- Reset progress (with a confirmation).

### 5.5 Input mapping

| Action | Remote | Desktop keyboard |
|---|---|---|
| Navigate | D-pad arrows | Arrow keys |
| Select / catch | OK (keyCode 13) | Enter |
| Back | Back (keyCode 461) | Escape / Backspace |
| Switch tank (aquarium) | Left / Right | Left / Right |
| Open codex | Up or Back | Up or Escape |
| Pointer | Magic Remote | Mouse |

Any input wakes the UI from idle mode. The first press only wakes the UI; it doesn't perform an action. **Exception:** OK during a rare visitor always catches it.

### 5.6 God mode (development builds only)

A developer panel for testing all content and mechanics without waiting.

**Availability**
- It is compiled into **dev builds** only, behind a build flag (`import.meta.env.DEV` or `VITE_GOD_MODE=1`). Release builds strip it out completely.
- That includes dev packages installed on the TV or in the simulator, so it works there too.

**Opening it**
- Desktop: press `G`, or add `?god` to the URL to open it at startup.
- Remote: the colour-button sequence **Red, Green, Yellow, Blue** (keyCodes 403, 404, 405, 406) within 2 seconds.
- A small "GOD" badge stays in a corner while god mode is active. That's acceptable because god mode is dev-only, so OLED burn-in doesn't matter here.

**Panel features**
- **Collection**
  - Set any species to unseen, sighted or collected.
  - Collect all fish.
  - Collect all fish in one biome.
- **Biomes**
  - Unlock or lock each biome.
  - Jump to any tank instantly.
- **Events**
  - Spawn a rare visitor of a **chosen** species, even one that's already caught.
  - Trigger the next arrival now.
  - Show any toast or celebration.
- **Time**
  - Timescale: 1×, 10×, 60× or 600×.
  - Pause the simulation.
  - Override the time of day with a slider, to preview day/night lighting.
  - Show the arrival and visitor timers as live countdowns.
- **Rendering and debug**
  - Overlays: fps and frame time, steering vectors, fish bounds, schooling neighbours.
  - Turn off the idle UI fade.
  - Force 30 or 60 fps.
- **Stress test:** spawn N extra fish (up to 200) to find the performance limit on a given TV.
- **Fish lab**
  - Show one species large, in the middle of the screen, with its swim cycle slowed down.
  - Live-tweak its `look` parameters (colours, fin sizes, pattern settings) and copy the result as JSON. This is the main tool for making each fish look right.
- **Save data**
  - Reset progress.
  - Export the save as JSON (copy or download).
  - Import a save from JSON.
  - Load preset saves: "fresh start", "reef nearly done", "everything collected".

**Rules**
- God mode writes through the same `game/` actions as normal play, so it can't create states the real game couldn't reach. The only exception is spawning a visitor for an already-caught species.
- The URL flags in section 10 are shortcuts to the same god-mode actions.

## 6. Rendering

- **Canvas 2D** on a fixed 1920×1080 logical canvas, scaled to fit the viewport. The codex and menus are DOM/CSS overlays for focus handling and readable text.
- **Fish are drawn by code from parameters**, not image files. Each species has a `look` definition:
  - `bodyShape`: outline control points or a template (`torpedo`, `disc`, `tall-disc`, `elongated`, `flat-bottom`) plus proportions.
  - `fins`: dorsal, anal, pectoral, pelvic and caudal, each with a shape type (`rounded`, `forked`, `lyre`, `trailing`, `fan`) and size.
  - `palette`: base colour, belly colour, fin colour, accent colours.
  - `pattern`: a list of pattern layers (`vertical-bands`, `horizontal-stripe`, `spots`, `swirls`, `edge-outline`, `gradient`) with parameters.
  - `eye`: size and colour.
  - `swim`: speed range, tail beat frequency and amplitude, body-flex amount, preferred depth band, and behaviour (`schooling`, `bottom-dweller`, `cruiser`, `hover`, `darting`).
- Animation: the body flexes through a sine wave along its length, the tail fin trails the body, and the fish turns smoothly by mirroring with an eased scale.
- The renderer is **shared** by the tank, the codex thumbnails and the detail view, so one species looks the same everywhere.
- **Performance target:** a steady 60 fps on recent LG TVs, with automatic fallback to 30 fps if frame times exceed the budget. Static background layers are pre-rendered to offscreen canvases.

## 7. Behaviour simulation

- Each fish has a position, a velocity and a target. Steering forces pull it toward a wander target within its preferred depth band, away from the tank edges, and apart from other fish.
- **Schooling** species use simple boids (cohesion, alignment, separation) within their own species.
- **Bottom-dwellers** stay in the bottom 15% and pause now and then.
- **Rare visitors** follow a scripted path that enters from one side and leaves from the other.

## 8. Data model

```ts
type Rarity = 'common' | 'uncommon' | 'rare';
type BiomeId = 'reef' | 'amazon';

interface Species {
  id: string;                 // 'ocellaris-clownfish'
  biome: BiomeId;
  rarity: Rarity;
  commonName: string;
  scientificName: string;
  look: FishLook;             // rendering parameters (section 6)
  groupSize: [number, number];
  codex: {                    // kept in src/data/codex.ts, joined to the species
    nativeRange: string;      // "Eastern Indian Ocean & Western Pacific"
    range: [lon, lat][][];    // rough polygon(s) to highlight on the world map
    habitat: string;
    size: { cm: number; measure: 'TL' | 'SL' };  // maximum recorded length
    diet: string;
    water: { type: 'salt' | 'fresh'; tempC?: [number, number] };  // only where sourced
    funFacts: string[];       // 2–3
    sources: { label: string; url: string }[];
  };
}

interface SaveState {
  version: 1;
  species: Record<string, { state: 'unseen' | 'sighted' | 'collected'; collectedAt?: string }>;
  unlockedBiomes: BiomeId[];
  timers: { nextArrivalMs: number; nextVisitorMs: number }; // remaining runtime
  settings: { rotationMin: 0 | 5 | 15 | 30; dayNight: boolean };
}
```

- Progress is saved in `localStorage` under one versioned key, every 30 seconds and on every state change.
- On load, a missing or corrupt save resets to the starting state. A future `version` triggers a migration step.

## 9. Architecture

```
src/
  main.ts              app bootstrap, game loop
  platform/            webOS vs browser: key codes, keep-awake, visibility/suspend
  input/               key + pointer → semantic actions (navigate, select, back)
  render/
    fish/              parametric fish renderer
    scene/             background layers, light rays, bubbles, day/night tint
  sim/                 steering, schooling, visitor paths
  game/                arrivals, visitors, unlocks, collection state (pure logic, unit-tested)
  data/species/        one file per species (look + codex)
  ui/                  codex grid, entry view, toasts, settings (DOM overlays + focus manager)
  dev/                 god mode panel, fish lab, debug overlays, save presets (dev builds only)
  save/                persistence + migrations
webos/
  appinfo.json, icons
```

- **Language and tooling:** TypeScript, Vite, Vitest for game logic, and Playwright for screenshot and smoke tests.
- `game/` is pure and driven by a `clock` value passed in, so time-based mechanics can be tested without waiting.
- `platform/` hides the webOS specifics behind an interface. The browser implementation is the default for development.

## 10. Testing locally on a PC

Three levels, from fastest to most realistic. Almost all development happens on level 1.

1. **Desktop browser (daily development).** `npm run dev` serves the app. Open it in Chrome at 1920×1080, or full-screen. The keyboard stands in for the remote, as in the input mapping table in section 5.5. **Debug URL flags** make the slow mechanics testable:
   - `?timescale=60`: 1 real minute equals 1 game hour.
   - `?visitor=now`: spawn a rare visitor immediately.
   - `?arrival=now`: trigger the next arrival.
   - `?unlockAll`, `?reset`: change the save state.
   - `?debug`: show an fps counter and the steering vectors.
   - `?god`: open god mode (section 5.6) at startup.
2. **LG webOS TV Simulator (on the PC, before the TV).** It is part of LG's webOS TV SDK and runs on Windows, macOS and Linux. It runs the packaged app in a webOS environment, which checks `appinfo.json`, the Back key (461), app lifecycle events and webOS APIs. Launch it with `ares-launch -s <version> ./dist`. It does **not** reproduce TV performance.
3. **Real TV (final check).** Turn on Developer Mode on the TV, then `ares-setup-device`, `ares-package` and `ares-install` from the PC. This checks frame rate on real hardware, readability from the couch, burn-in behaviour and keep-awake.

## 11. Open questions / risks

- **Keep-awake on webOS:** confirmed needed: on the LG C6 the TV's screensaver appeared over the app. LG documents no API for this, and the standard Wake Lock API reportedly hangs on webOS. Implemented (2026-11-18), awaiting a TV test:
  1. The undocumented TV power service handshake used by several open-source webOS apps: register with `luna://com.webos.service.tvpower/power/registerScreenSaverRequest`, then refuse each screensaver request by replying to `responseScreenSaverRequest` with `ack: false` and the request's timestamp. It's unofficial, firmware-dependent, and may not be allowed in an LG Content Store submission.
  2. Fallback, if that's unavailable or not active within 5 s: a tiny muted looping video, full-size behind the canvas (LG says the screensaver stays away during full-size video; reports vary).
  The debug readout shows which one is active and how many times the screensaver was refused.
  - *TV test (LG C6, 2026-11-18):* works. After almost 20 minutes untouched the readout showed "veto active (said no 6×)" and no screensaver appeared.
- **Frame rate fallback:** the same test showed the app stuck at 30 fps while using only 2.9 ms of its 16.7 ms frame budget: a slow moment (probably startup) had dropped it to 30 for good. The guard now ignores the first 5 seconds, and at 30 fps tries 60 again after a minute (then 2, 4, … up to 10 minutes after each failed try).
- **TV performance:** older webOS versions have slow Chromium builds. Mitigations: pre-rendered backgrounds, a fish cap, and an fps fallback. Decide on the minimum supported webOS version once we test on real hardware.
  - *First TV test (LG C6, 2026-11-18):* it ran, but not entirely smoothly. Measuring showed drawing the fish as vectors every frame was the biggest cost, so tank fish are now drawn from cached swim-cycle sprites (about 55% faster in testing), and on webOS the canvas is capped at 1920×1080. After that change, the C6 runs it noticeably smoother. The minimum webOS version is still open: the C6 is a current model.
- **Remotes without colour buttons:** the LG Magic Remote (e.g. on the C6) has no Red/Green/Yellow/Blue buttons, so development builds also open god mode from the codex's Settings tab.
- **Recognisable art:** some species (Moorish idol, Mandarin dragonet) have complex patterns. Budget extra tuning time for them, and accept a stylised look.
- **Fact accuracy:** every fact needs a source (checked by a test). The discus entry is the blue discus, *S. aequifasciatus*. Where sources disagree (e.g. the zebra pleco's IUCN category), the codex says less rather than picking one.

## 12. Out of scope for v1 / future ideas
- More biomes: deep sea, African rift lakes (Malawi/Tanganyika), Asian rivers.
- Optional ambient sound.
- Legendary or mythical species (if desired later).
- Tank decoration.
- Achievements and a "first caught" history timeline.
