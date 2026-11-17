# Tidewatch

An ambient aquarium for LG webOS TVs. Leave it running like a screensaver and slowly collect real fish species; a codex tells you where each one comes from, plus fun facts.

- Design: [`docs/specs/2026-11-17-tidewatch-design.md`](docs/specs/2026-11-17-tidewatch-design.md)
- Plan: [`docs/plans/2026-11-17-tidewatch-plan.md`](docs/plans/2026-11-17-tidewatch-plan.md)

**Status:** Milestone 6 of 8. The game works, god mode is in place, and all 12 species are tuned, with sourced codex facts. Both tanks have full scenery.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173) in Chrome. The app is designed for a 1920×1080 screen; press F11 for full screen.

### Controls on a PC

| TV remote | Keyboard |
|---|---|
| Arrows | Arrow keys |
| OK | Enter |
| Back | Escape or Backspace |
| Red / Green / Yellow / Blue | 1 / 2 / 3 / 4 |
| Magic Remote pointer | Mouse |

### Controls

| Action | Remote | Keyboard |
|---|---|---|
| Catch a rare visitor | OK | Enter (or click it) |
| Switch tank | ◀ ▶ | ← → |

### Useful URLs

These debug flags work in development builds only (`npm run dev` or `npm run build:dev`):

| URL | What it does |
|---|---|
| `/?timescale=600` | Game time runs 600× faster (1 real second = 10 game minutes) |
| `/?visitor=now` | A rare visitor appears straight away |
| `/?arrival=now` | The next fish arrives straight away |
| `/?unlockAll` | Unlock every tank |
| `/?collectAll` | Collect every species |
| `/?reset` | Start from a fresh save |
| `/?debug` | Show the timers and frame rate |
| `/?god` | Open god mode at startup |

Flags can be combined, e.g. `/?reset&visitor=now&debug`. These work in every build:

- `/?hour=21.5`: preview the lighting at a time of day (otherwise it follows the clock).
- `/?fish=ocellaris-clownfish`: one species large and centred, swimming in place. Add `&still` to freeze it and `&turn=0.5` to see a turn stage.

### God mode

A developer panel for testing everything without waiting. It exists only in development builds; release builds don't contain it (packaging checks this).

- **Open it:** press `G` on a PC, or Red, Green, Yellow, Blue on the remote within 2 seconds (keys 1, 2, 3, 4 on a PC). `?god` opens it at startup.
- **Use it:** ↑↓ move, ←→ adjust, OK press, Back close. The mouse works too. Buttons in red ask you to press twice.
- **What's in it:** summon any visitor, trigger arrivals, show any message; speed up, pause or set the time of day; lock and unlock tanks; set any species to unseen, sighted or collected; debug overlays (movement, bounds, school links, frame rate); a stress test with up to 200 extra fish; saved progress (presets, reset, export, import).
- **Fish lab:** one species shown large with a real-size copy below. Every number and colour of its look can be adjusted live (the fish in the tank change too), then copied as JSON into `src/data/species/<id>.ts`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright) |
| `npm run test:visual` | Screenshot comparison of every species (add `-- --update-snapshots` after an intended change) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Release build into `dist/` |
| `npm run build:dev` | Build with god mode and debug flags |
| `npm run package:webos` | Release build, then create an `.ipk` in `out/` |
| `npm run package:webos:dev` | The same with god mode, for testing on the TV |

## Running on an LG TV

You need the TV and your PC on the same network.

1. On the TV, install **Developer Mode** from the LG Content Store, sign in with an LG developer account, and turn on *Dev Mode Status* and *Key Server*. Note the TV's IP address and passphrase.
2. Register the TV (one time):
   ```bash
   npx ares-setup-device
   ```
   Choose *add*, give it a name (e.g. `tv`), enter the IP address and port `9922`, user `prisoner`. Then fetch the key:
   ```bash
   npx ares-novacom --device tv --getkey
   ```
   and enter the passphrase shown on the TV.
3. Build, install and launch:
   ```bash
   npm run package:webos
   npx ares-install --device tv out/com.tidewatch.app_0.1.0_all.ipk
   npx ares-launch --device tv com.tidewatch.app
   ```

Developer Mode sessions expire after a while; extend them in the Developer Mode app on the TV.

### webOS TV Simulator

LG's webOS TV Simulator (part of the webOS TV SDK, for Windows, macOS and Linux) runs the packaged app on your PC in a webOS environment. After installing it:

```bash
npm run build && node scripts/package-webos.mjs
npx ares-launch -s <simulator version, e.g. 24> dist
```

It checks webOS behaviour (Back key, app lifecycle), not TV performance.

## Project layout

```
src/
  main.ts            entry point
  app.ts             wires the game, tanks, input, saving and messages together
  game/              the rules: arrivals, rare visitors, unlocks, game clock
  save/              saved progress: format, checks, storage
  ui/                on-screen messages and hints (HTML over the canvas)
  dev/               god mode, fish lab and debug URL flags (development builds only)
  input/             keyboard, remote and pointer → actions; idle tracking
  platform/          browser vs webOS differences
  render/stage.ts    1920×1080 canvas and game loop
  render/fish/       code-drawn fish: body, fins, patterns, renderer
  render/scene/      the tank: scenery, light rays, bubbles, plants, camera, day/night
  render/perf.ts     drops to 30 fps on slow devices
  data/species/      one file per species (how it looks and swims)
  data/codex.ts      codex facts per species, each with its sources
  data/biomes.ts     colours and settings per tank
  data/progression.ts which fish each tank starts with, and how it unlocks
  sim/               fish movement: steering, schooling, population
webos/               appinfo.json and icons
scripts/             packaging
tests/               unit tests and Playwright tests
```

The production build is a single classic script (no ES modules) targeting ES2017, so it should run on webOS 5 (2020 TVs) and newer. The minimum version is confirmed in Milestone 8.
