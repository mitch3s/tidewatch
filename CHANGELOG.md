# Changelog

Notable changes to Tidewatch, newest first. Versions follow `package.json`; each release is a commit on `main` whose message names the version. The specs in [`docs/specs/`](docs/specs/) have the full detail.

Add a line under **Unreleased** with each change that someone using the app would notice, and move them under a version heading when releasing.

## Unreleased

Toward 1.4 part 3. [Spec](docs/specs/2026-11-19-tidewatch-v1.4-moments.md)

- Six more moments: the Atolla jellyfish's alarm display, the vampire squid's "pineapple" pose, an arowana leaping out of the water (by day), a royal gramma swimming upside down under the plate coral (by day), the neon tetra school settling for the night, and coral spawning across the whole reef (at night, a few nights after a full moon, October to December).
- Timeline: a new codex tab listing everything that has happened, newest first: tanks discovered, fish arrived, visitors caught or missed, moments seen.
- Neon tetras' stripes now fade to grey whenever they rest at night, as they do in the wild.
- The Atolla jellyfish's alarm flashes moved from the codex's fun facts into its moment.
- During moments, fish now line up with the scenery (the anemone, the plate coral) when the camera zooms in; before, the scenery's lower parallax put them slightly off.

## 1.4.0 (2026-11-19)

The moon and moments. [Spec](docs/specs/2026-11-19-tidewatch-v1.4-moments.md)

- Moonlight follows the real moon: at night the reef and Amazon tanks get silver rays and a faint net of light on the floor, bright under a full moon and gone on a new moon. Before, every night had the same moonlight.
- The codex's Settings tab shows tonight's moon phase.
- `?moon=0.5` previews a moon phase; god mode can set it too.
- Moments: now and then an animal does something special, and the camera follows it. The first four: clownfish sheltering in their anemone (by day), a mandarin dragonet pair rising to spawn (at dusk), the lanternfish school's evening rise (at dusk), and a corydoras darting up for a gulp of air.
- Watch a moment to the end and the codex records it on the animal's page, with the date; moments you haven't seen show a hint of when to watch. Each tank's codex page shows how many of its moments you've seen.
- Mandarin dragonets now come as a pair. Their dusk spawning moved from the codex's fun facts into their moment.
- `?moment=<id>` starts a moment (development builds); god mode can play any moment and mark moments as seen.

## 1.3.0 (2026-11-19)

The deep sea. [Spec](docs/specs/2026-11-18-tidewatch-v1.3-deep-sea.md)

- New tank: the deep sea. It unlocks after collecting 4 Amazon species. The water is almost black, and the only light comes from the animals.
- Six new animals: Atolla jellyfish, spotted lanternfish, lovely hatchetfish, vampire squid, dumbo octopus and the humpback anglerfish (rare visitor).
- Jellyfish and cephalopods are drawn with their own body shapes, and bioluminescent spots, halos and an anglerfish lure glow.
- Lanternfish and hatchetfish rise toward the surface at night.
- Codex entries for all six, with sources (FishBase, SeaLifeBase, MBARI).

## 1.2.1 (2026-11-18)

- Fixed: distant fish turned see-through for a moment while turning.

## 1.2.0 (2026-11-18)

Life. [Spec](docs/specs/2026-11-18-tidewatch-v1.2-life.md)

- Feeding: OK, or a click on the water, drops food, and the fish come to eat it.
- Night rest: at night fish swim slower and sink lower in the water.
- Close-ups: every few minutes the camera slowly follows one fish for a while. Can be turned off in Settings.
- Ambient sound: soft water and bubble sounds generated in code. Off by default; quiet or normal in Settings.

## 1.1.1 (2026-11-18)

- Softer light on the sand, and no more blur on distant fish.

## 1.1.0 (2026-11-18)

The look pass. [Spec](docs/specs/2026-11-18-tidewatch-v1.1-look.md)

- New lighting, depth and colour grading that follows the time of day.
- The version is shown next to the title, and Settings shows the exact build.

## 0.1.0 (2026-11-18)

The first version, built in milestones 0–8 of the [plan](docs/plans/2026-11-17-tidewatch-plan.md) and tested on an LG C6. [Spec](docs/specs/2026-11-17-tidewatch-design.md)

- Coral reef and Amazon river tanks with 12 code-drawn species.
- Collecting: new fish arrive over time, and rare visitors can be caught with OK.
- The codex: range maps, sourced facts, and progress per tank.
- Settings: automatic tank switching, day and night lighting, reset.
- Works with a D-pad remote and the Magic Remote pointer. The on-screen text fades out when idle, so nothing static burns into OLED panels, and the TV's screensaver is kept away.
- Tank fish are drawn from cached sprites, and the frame rate drops to 30 fps on slow TVs and recovers when it can.
- God mode and the fish lab for development builds.
