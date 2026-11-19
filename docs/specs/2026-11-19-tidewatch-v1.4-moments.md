# Tidewatch v1.4: moments

**Date:** 2026-11-19
**Status:** Parts 1 (the moon) and 2 (moments, with the first four) implemented; part 3 proposed.
**Builds on:** [`2026-11-18-tidewatch-v1.3-deep-sea.md`](2026-11-18-tidewatch-v1.3-deep-sea.md)

## 1. Why

There are 18 species: 6 starters, 8 that arrive every 20–40 minutes of runtime, and 4 rare visitors every 45–90 minutes. Someone who leaves Tidewatch on in the evenings will have collected everything in about a week or two. After that nothing is left to find, and the remote has nothing to do except feed the fish.

v1.4 adds a second thing to collect that comes from the animals already in the tanks rather than new ones: **moments**, rare real behaviours that happen now and then and are recorded in the codex when you see one. Some of them depend on the time of day or the moon, which gives people a reason to have the app on at a particular time. It keeps what Tidewatch already does: calm, nothing required, rewarding attention, every fact sourced.

The release has three parts, built and committed one at a time, plus a TV test pass.

## 2. Part 1: the moon

- The moon's phase is worked out from the date (a known new moon plus the 29.53-day average lunar month). No network is needed. Real lunar months vary, so it can be up to about half a day off, which doesn't matter for lighting.
- Since v1.1 every night has had the same faint moonlight: silver rays at 0.4 of daylight's strength and a weak caustic net. Now that light is scaled by how much of the moon is lit: at a full moon the rays are a little stronger than before (0.55) and the caustics 0.6 of daylight's; at the quarters about half that; on a new moon there are no rays or caustics and the night is dark.
- The deep sea is unchanged: no light reaches it.
- Off when day/night lighting is off.
- The codex's Settings tab shows tonight's phase as a small icon with its name, e.g. "Waxing gibbous".
- `?moon=0..1` (all builds, like `?hour`) previews a phase: 0 new, 0.5 full. God mode gets a phase slider.

## 3. Part 2: moments

### 3.1 What a moment is

A short scripted behaviour by one species (or a small group), 15–60 seconds long, that is rarer and more noticeable than its normal swimming. Each moment belongs to one species and has:

- an id, a name ("Courtship at dusk") and one sourced sentence about it for the codex;
- **conditions**: the species is collected and in the shown tank, plus optionally a time window (dusk, night, day) and a moon window;
- a **weight** for how often it is picked;
- a **script** that takes over the animal's steering for its length, then hands it back.

### 3.2 When they happen

- A moment timer runs while the app is in the foreground, like the arrival timer: every 8–15 minutes of runtime, one moment whose conditions are met in the **shown tank** is picked by weight and starts. Not-yet-witnessed moments get 3× the weight, so the collection progresses.
- Never with a rare visitor on screen, during a tank switch, with the codex open, or during a close-up (a close-up that is due waits).
- Tank rotation waits until a playing moment ends.
- If close-ups are on, the camera frames the moment the same way it frames a close-up. If they're off, the moment plays without the camera moving.
- A caption shows for about 6 seconds as an ordinary message (kicker "Moment" or "New moment", the moment's name, the animal's name). Messages already move slightly each time to avoid burn-in, and queue behind any other message.
- A due visitor waits until the moment ends. If the codex opens, the tank is switched, a visitor appears (god mode) or one of its animals leaves the tank, the moment is cut short and doesn't count.

### 3.3 Witnessing

- A moment counts as **witnessed** once it has played to the end on screen. No button press is needed, because the app is meant to be left on. Whoever is looking gets to see it.
- The first time, the caption says "New moment", and when it ends a "Moment recorded" message points to the codex, which records it with the date.
- Moments keep happening after they are witnessed, so the tank stays lively once the collection is complete.

### 3.4 The first moments

Every moment needs a source before it ships, the same rule as codex facts (FishBase, SeaLifeBase, Wikipedia, MBARI and so on). Each line below is the behaviour to check and, if the sources agree, to build. Any that don't hold up are dropped or changed.

| Species | Moment | Conditions | Part |
|---|---|---|---|
| Ocellaris clownfish | Shelters in the anemone: both fish settle low among its tentacles | Day | 2 ✓ |
| Mandarin dragonet | A pair rises from the bottom side by side to spawn | Dusk | 2 ✓ |
| Spotted lanternfish | The whole school rises toward the surface together | Dusk | 2 ✓ |
| Bronze corydoras | One dashes to the surface to gulp air, then sinks back | Any | 2 ✓ |
| Atolla jellyfish | "Burglar alarm": a ring of light flashes round the rim | Any | 3 |
| Vampire squid | Turns its cloak inside out ("pineapple" pose) | Any | 3 |
| Silver arowana | Leaps at the surface after an insect | Day | 3 |
| Royal gramma | Swims upside down under a rock ledge | Day | 3 |
| Neon tetra | Stripes fade as the school rests | Night | 3 |
| Coral reef (whole tank) | Coral spawning: a slow upward drift of pink and white egg bundles | Night, a few nights after a full moon, November–December only | 3 |

Notes on part 2 (checked 19 November 2026):

- **Clownfish:** first proposed as "nestles among its tentacles". Wikipedia (the only one of its sources reachable when checking) says the anemone shelters the fish with its tentacles and the fish's mucus keeps it from being stung, but doesn't describe nestling, so the moment is "Shelter in the anemone" and says only that.
- **Mandarin dragonet:** the codex already said, from the Smithsonian and Goda & Fujii (1995), that pairs rise at dusk to spawn. That fun fact moved into the moment, so the codex shows it once you've seen it. Mandarin dragonets now come as a pair (group size 2) so the moment can happen.
- **Lanternfish and corydoras:** use what their codex entries already say, with the same sources (FishBase, Wikipedia; FishBase, Scotcat).
- Times of day: day 8:00–17:30, dusk 17:30–21:00, night 21:00–5:30, by the same clock as the lighting.

Coral spawning belongs to the tank, not to one species: it shows under the reef tab in the codex, next to the species.

A rare visitor's moments can only happen once it has been caught and lives in the tank.

### 3.5 Codex

- Each species' detail page gets a **Moments** section listing that species' moments: a witnessed one shows its name, its fact and the date; an unwitnessed one shows "?" and a hint of when to watch ("Watch at dusk", "Only on nights after a full moon").
- Each tank's grid shows how many of its moments you've seen in the footer: "Moments seen: 1 / 2". (The tab labels stay as they are, to keep the tab row short.)
- God mode can trigger any moment (when its species is in the tank, ignoring its time conditions), and set any moment to witnessed or not. `?moment=<id>` (development builds) starts one straight away.

### 3.6 Saving

A new field `moments: Record<string, { witnessedAt: string }>` plus the moment timer in `timers`. Old saves start with no moments witnessed and a fresh timer. As with the v1.2 settings, missing fields are filled in on load, so `SAVE_VERSION` stays 1.

## 4. Part 3: more moments and the timeline

- The rest of the moments in 3.4.
- **Timeline** in the codex: a new tab, after the tanks and before Settings, listing everything in the order it happened: tanks discovered, fish arrived, visitors caught or missed, moments witnessed. Newest first, scrollable with the D-pad. It covers the "'first caught' history timeline" from the v1 spec's future ideas. Older events are rebuilt from the saved `collectedAt` dates (missed visitors and unlocks have no saved date, so they only appear from 1.4 onward).

## 5. Alongside: TV test pass and housekeeping

- Run 1.2's sound and close-ups and 1.3's deep sea on the LG C6 and record the results in the specs, as for v1. Check that the moonlight and moment scripts stay within the frame budget.
- Decide the minimum supported webOS version (still open from v1).
- README: replace the out-of-date status line ("Milestone 7 of 8") and the `0.1.0` package name in the install steps.
- Record each change in [`CHANGELOG.md`](../../CHANGELOG.md).

## 6. Out of scope

- Amazon high and low water seasons, and a "this week" line (e.g. "Full moon on Friday") in the codex: candidates for 1.5, building on the moon.
- Tank switching as a dive or ascent between tanks.
- Interactions between species (tetras bunching when the arowana passes, cleaner fish).
- A fourth tank (African rift lake or Asian river).

## 7. Version

1.4.0, shown in the app as before. Parts 1 and 2 can ship as 1.4.0 on their own if part 3 runs long; part 3 then becomes 1.4.1 or 1.5.
