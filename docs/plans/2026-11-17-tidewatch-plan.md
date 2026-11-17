# Tidewatch — Implementation Plan

**Spec:** `docs/specs/2026-11-17-tidewatch-design.md`
**Approach:** Build in small vertical slices. Every milestone ends with something you can run in a desktop browser. The pure game logic (`game/`, `save/`, `sim/` maths) is written test-first with Vitest. The visual parts are checked with Playwright screenshots and by eye.

Each task lists its **files**, **what done means**, and **how to verify** it.

---

## Milestone 0 — Project skeleton
*Result: an empty dark-blue canvas that runs in the browser and builds as a webOS package.*

**0.1 Scaffold**
- Files: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`, `README.md`.
- Vite + TypeScript (strict mode). Build target `es2017` for older webOS Chromium versions. Use a relative `base: './'`, because webOS loads the app from the file system.
- Scripts: `dev`, `build`, `test`, `test:e2e`, `package:webos`.
- Done when: `npm run dev` shows a full-screen page, and `npm run build` outputs `dist/`.

**0.2 Fixed 1920×1080 stage**
- Files: `src/render/stage.ts`.
- A canvas with a 1920×1080 logical size that scales to fit the viewport with letterboxing and handles devicePixelRatio. A `requestAnimationFrame` loop with fixed-step simulation (60 Hz) and interpolated rendering.
- Verify: resize the browser window; the content keeps a 16:9 shape and stays sharp.

**0.3 webOS packaging**
- Files: `webos/appinfo.json` (id `com.tidewatch.app`, type `web`, `main: index.html`, `resolution: 1920x1080`, `disableBackHistoryAPI: true`), `webos/icon.png`, `webos/largeIcon.png`, `scripts/package-webos.mjs`.
- The script copies `webos/*` into `dist/`, then runs `ares-package dist -o out/`.
- Verify: an `.ipk` is produced. It is tested in the simulator later, in Milestone 8.

**0.4 Test harness**
- Files: `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`.
- Smoke test: the page loads, the canvas exists, and there are no console errors.

---

## Milestone 1 — Input and platform layer
*Result: the keyboard, mouse and TV remote all map to the same actions.*

**1.1 Semantic actions** *(test-first)*
- Files: `src/input/actions.ts`, `src/input/keymap.ts`, `tests/input/keymap.test.ts`.
- Actions: `up`, `down`, `left`, `right`, `select`, `back`, `colorRed`, `colorGreen`, `colorYellow`, `colorBlue`.
- Key codes:
  - Arrows: 37–40.
  - Enter: 13.
  - Back: 461 on webOS; Escape or Backspace on desktop.
  - Colour buttons: 403–406. On desktop, the keys 1–4 stand in for them.

**1.2 Pointer support**
- Files: `src/input/pointer.ts`.
- Mouse and Magic Remote pointer events go through one handler that hit-tests the canvas (for catching visitors) and passes events through to DOM overlays.
- Handle webOS `cursorStateChange` so the UI can react when the pointer becomes visible or hidden.

**1.3 Platform abstraction**
- Files: `src/platform/index.ts`, `src/platform/browser.ts`, `src/platform/webos.ts`.
- Interface: `isWebOS`, `keepAwake()`, `onVisibilityChange(cb)`, `exitApp()`.
- The webOS implementation is detected through `window.PalmSystem` / `webOS` (the webOSTV.js library is loaded only on the TV).
- `keepAwake()` is left as a stub here and investigated in Milestone 8.

**1.4 Idle tracker** *(test-first)*
- Files: `src/input/idle.ts`, `tests/input/idle.test.ts`.
- Emits `active` and `idle` after 10 seconds with no input. The first input while idle is swallowed, except `select` while a visitor is present (spec section 5.5).

---

## Milestone 2 — One fish, drawn by code
*Result: an Ocellaris clownfish swims across the screen and looks like a clownfish.*

**2.1 Look types**
- Files: `src/render/fish/look.ts`.
- `FishLook` types: `bodyShape`, `fins`, `palette`, `pattern`, `eye`, `swim` (spec section 6).

**2.2 Body geometry** *(test the maths)*
- Files: `src/render/fish/body.ts`, `tests/render/body.test.ts`.
- Builds an outline from a template and proportions as a spine of N segments with a half-width profile. The flex is applied as a travelling sine wave along the spine.
- Tests: the outline is closed, its width matches the profile, and the flex is zero at the head.

**2.3 Fins**
- Files: `src/render/fish/fins.ts`.
- Fin shapes: `rounded`, `forked`, `lyre`, `trailing`, `fan`, attached to points on the spine. The tail fin trails the tail by one phase step.

**2.4 Patterns**
- Files: `src/render/fish/patterns.ts`.
- Pattern layers clipped to the body path: `vertical-bands`, `horizontal-stripe`, `spots`, `swirls`, `edge-outline`, `gradient`.

**2.5 Fish renderer**
- Files: `src/render/fish/renderFish.ts`.
- `renderFish(ctx, look, pose, time)` draws the body, pattern, fins and eye. Turning mirrors the fish with an eased scale. This one function is also used by the codex views and the fish lab.

**2.6 First species data**
- Files: `src/data/species/ocellaris-clownfish.ts`, `src/data/species/index.ts`.
- Verify: a Playwright screenshot of a single fish, checked by eye against reference photos.

---

## Milestone 3 — The tank
*Result: a coral reef scene with several fish swimming naturally.*

**3.1 Scene layers**
- Files: `src/render/scene/background.ts`, `lightRays.ts`, `bubbles.ts`, `plants.ts`, `src/data/biomes.ts`.
- Each biome sets its colours and silhouettes. Static layers are pre-rendered to offscreen canvases. Light rays move, bubbles rise and plants sway.

**3.2 Steering** *(test-first)*
- Files: `src/sim/steering.ts`, `src/sim/fishAgent.ts`, `tests/sim/steering.test.ts`.
- Steering forces: wander within the fish's preferred depth band, avoid the tank edges, keep apart from other fish. Speed is limited per species.

**3.3 Behaviours**
- Files: `src/sim/behaviours.ts`.
- Behaviours: `schooling` (boids within one species), `bottom-dweller`, `cruiser`, `hover`, `darting`.

**3.4 Tank population** *(test-first)*
- Files: `src/sim/tank.ts`, `tests/sim/tank.test.ts`.
- Builds fish groups from the collected species and `groupSize`, keeping to the 40-fish cap (rare and large species take priority over extra schooling fish).

**3.5 Camera drift and day/night**
- Files: `src/render/scene/camera.ts`, `src/render/scene/daynight.ts`.
- The camera drifts slowly in pan and zoom. Day/night tint follows the clock, and the clock value can be overridden for god mode.

**3.6 Performance guard**
- Files: `src/render/perf.ts`.
- Tracks rolling frame time and switches to 30 fps when frames run over budget.

---

## Milestone 4 — Game logic and saving
*Result: fish arrive over time and progress survives a reload. All of it is unit-tested.*

**4.1 Save state** *(test-first)*
- Files: `src/save/schema.ts`, `src/save/storage.ts`, `src/save/migrations.ts`, `tests/save/*.test.ts`.
- Saved in `localStorage` under the key `tidewatch.save`. The starting state is spec section 4.3. A corrupt save resets to the starting state, and the code is ready for version migrations.

**4.2 Game state and actions** *(test-first)*
- Files: `src/game/state.ts`, `src/game/actions.ts`, `tests/game/actions.test.ts`.
- Pure actions: `collect`, `sight`, `unlockBiome`, `tick(dtMs)`. An event bus emits `arrived`, `visitorSpawned`, `visitorLeft`, `caught` and `biomeUnlocked`.

**4.3 Arrivals** *(test-first)*
- Files: `src/game/arrivals.ts`.
- Arrivals happen every 20–40 minutes of runtime, picking common fish 3× as often as uncommon ones, and only from unlocked biomes. The timer stops once everything is collected. Randomness comes from an injectable seeded RNG so tests are repeatable.

**4.4 Rare visitors** *(test-first)*
- Files: `src/game/visitors.ts`.
- A visitor every 45–90 minutes of runtime, of a rare species not yet caught, in the tank currently shown. The catch window is about 25 seconds. A miss marks the species `sighted`, and it can come back later.

**4.5 Unlocks** *(test-first)*
- Files: `src/game/unlocks.ts`.
- Collecting 4 reef fish unlocks the Amazon, along with its starter fish.

**4.6 Runtime clock**
- Files: `src/game/clock.ts`.
- Counts only while the app is visible, and supports timescale and pause (needed for god mode and URL flags).

**4.7 Wiring**
- Files: `src/main.ts`, `src/app.ts`.
- Game events drive the tank: add fish, fly in a visitor, catch.
- Verify: open with `?timescale=600`, watch fish arrive, reload, and check progress is still there.

---

## Milestone 5 — God mode
*Result: every mechanic can be tested in seconds. It comes before the other content so the content work can use it.*

**5.1 Build flag and entry**
- Files: `src/dev/index.ts`, `vite.config.ts`.
- Loaded only when `import.meta.env.DEV || VITE_GOD_MODE`. Opened with `G`, `?god`, or Red, Green, Yellow, Blue within 2 seconds.
- Test: a release build contains no `dev/` code (grep `dist/` for a marker string).

**5.2 Panel shell**
- Files: `src/dev/panel.ts`, `src/dev/panel.css`.
- A DOM side panel with remote-navigable sections, plus the "GOD" badge.

**5.3 Collection, biome, event and time controls**
- Files: `src/dev/controls/*.ts`.
- Everything calls the `game/` actions (spec rule). Spawning a visitor of a chosen species is the one exception and is clearly marked.

**5.4 Debug overlays and stress test**
- Files: `src/dev/overlays.ts`.
- Overlays: fps and frame time, steering vectors, fish bounds, schooling neighbours. Also the option to keep the UI from fading, forcing 30 or 60 fps, and spawning N extra fish.

**5.5 Fish lab**
- Files: `src/dev/fishLab.ts`.
- Shows one fish large with its swim cycle slowed, with live sliders and colour pickers for its `look` and a "copy as JSON" button.

**5.6 Saves and URL flags**
- Files: `src/dev/saves.ts`, `src/dev/presets/*.json`, `src/dev/urlFlags.ts`.
- Reset, export and import, and the three preset saves. URL flags: `?timescale`, `?visitor=now`, `?arrival=now`, `?unlockAll`, `?reset`, `?debug`, `?god`.

---

## Milestone 6 — All 12 species
*Result: both biomes are fully populated and every fish is recognisable.*

**6.1 Amazon biome scene**
- Files: `src/data/biomes.ts`.
- Tea-coloured water, roots, sand, and plants that sway.

**6.2 Coral reef species**
- Files: `src/data/species/*.ts`.
- One file per species, tuned in the fish lab: yellow tang, blue tang, royal gramma, Moorish idol, mandarin dragonet. The Moorish idol and mandarin dragonet need extra time for their patterns.

**6.3 Amazon species**
- Files: `src/data/species/*.ts`.
- Neon tetra, bronze corydoras, angelfish, discus, zebra pleco, silver arowana.

**6.4 Codex facts and sources**
- Fill in each species' `codex` block, with every fact traced to a source URL (FishBase first).
- Done when: a lint test checks that every species has 2–3 fun facts, at least one source, and every field filled.

**6.5 Visual regression**
- Files: `tests/e2e/species.spec.ts`.
- A Playwright screenshot per species, rendered with a fixed pose and time.

---

## Milestone 7 — Codex, toasts and settings UI
*Result: the full experience works with only a remote.*

**7.1 Focus manager** *(test-first)*
- Files: `src/ui/focus.ts`, `tests/ui/focus.test.ts`.
- Spatial D-pad navigation between focusable elements, a visible focus ring, and support for pointer hover.

**7.2 Overlay manager**
- Files: `src/ui/overlay.ts`.
- A stack of screens (aquarium, codex, entry, settings). Back pops the stack, and Back on the aquarium opens the codex as the spec says. Closing the app is offered only from the codex screen, with a confirmation.

**7.3 Codex grid**
- Files: `src/ui/codexGrid.ts`, `src/ui/codex.css`.
- Biome tabs, cards for collected, sighted and unseen fish, animated thumbnails (using the shared renderer, on a few small canvases), and a progress count for each biome.

**7.4 Codex entry**
- Files: `src/ui/codexEntry.ts`, `src/ui/worldMap.ts`, `src/assets/world.svg`.
- A live fish view, names, rarity, the date collected, the range map with highlighting, facts, fun facts and sources. Left and Right go to the previous and next entry.

**7.5 Toasts and celebrations**
- Files: `src/ui/toast.ts`, `src/render/scene/celebrate.ts`.
- Arrival, unlock and catch messages. Positions shift slightly so nothing stays in one place on OLED screens.

**7.6 Visitor hint and catch**
- Files: `src/ui/visitorHint.ts`.
- The "Press OK" hint drifts around. Catching works with OK or a pointer click on the fish.

**7.7 Settings**
- Files: `src/ui/settings.ts`.
- Rotation interval, day/night on or off, and reset with a confirmation.

**7.8 Tank rotation**
- Files: `src/app.ts`.
- A cross-fade between unlocked tanks on the chosen interval. It waits while a visitor is present. Left and Right switch tanks by hand.

**7.9 End-to-end tests**
- Files: `tests/e2e/flow.spec.ts`.
- Keyboard-only flows:
  - Open the codex, browse, open an entry, go back.
  - Force a visitor, catch it, see it in the codex.
  - Force a visitor, miss it, see it as sighted.

---

## Milestone 8 — webOS integration and the TV
*Result: Tidewatch runs on a real LG TV.*

**8.1 Simulator run**
- Package the app and run `ares-launch -s <ver> dist`. Check the Back key, the colour buttons, `appinfo`, and app lifecycle (`visibilitychange` / `webOSRelaunch`).

**8.2 Keep-awake investigation**
- Research the options and test them on a TV. Implement `platform/webos.keepAwake()` with the approach that works, and use a muted looping video as the fallback. Write down the result in the spec's open questions.

**8.3 On-TV performance pass**
- Use the god-mode stress test to find the fish limit. Adjust the 40-fish cap and the fps fallback. Decide the minimum supported webOS version.

**8.4 Couch review**
- Check that text sizes are readable from about 3 m, the focus ring is visible, and the idle fade timing feels right.

**8.5 Release build**
- Run `npm run package:webos` without god mode. Confirm no dev code is in the package. Write the TV install steps in `README.md`.

---

## Order and checkpoints

| # | Milestone | Checkpoint to review together |
|---|---|---|
| 0–1 | Skeleton + input | — |
| 2 | One fish | **Does the clownfish look right?** (screenshot) |
| 3 | Tank | **Does the reef feel calm and alive?** (short recording) |
| 4 | Game logic | All tests pass |
| 5 | God mode | You try it locally |
| 6 | All species | **A gallery of all 12 fish** |
| 7 | UI | You try the full flow locally with the keyboard |
| 8 | TV | You install it on your TV |

Milestones 2, 3 and 6 are where most of the look and feel is decided. Getting your feedback early there saves the most rework.
