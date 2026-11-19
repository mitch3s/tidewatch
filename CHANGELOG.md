# Changelog

Notable changes to Tidewatch, newest first. Versions follow `package.json`; each release is a commit on `main` whose message names the version. The specs in [`docs/specs/`](docs/specs/) have the full detail.

Add a line under **Unreleased** with each change that someone using the app would notice, and move them under a version heading when releasing.

## Unreleased

Toward 1.4. [Spec](docs/specs/2026-11-19-tidewatch-v1.4-moments.md)

- Moonlight follows the real moon: at night the reef and Amazon tanks get silver rays and a faint net of light on the floor, bright under a full moon and gone on a new moon. Before, every night had the same moonlight.
- The codex's Settings tab shows tonight's moon phase.
- `?moon=0.5` previews a moon phase; god mode can set it too.
- Still to come in 1.4: moments (rare animal behaviours to witness and record in the codex) and a timeline.

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
