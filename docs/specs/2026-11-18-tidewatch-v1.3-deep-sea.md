# Tidewatch v1.3: the deep sea

**Date:** 2026-11-18
**Status:** Roster approved. Rendering, behaviour and scenery built; **not yet playable** because the codex facts still need checking against sources (§5).
**Builds on:** [`2026-11-18-tidewatch-v1.2-life.md`](2026-11-18-tidewatch-v1.2-life.md)

## 1. The tank

Almost black water far below the reach of sunlight, faint ridges in the distance, a dark silt floor with glass sponges and sea pens, marine snow drifting down, and tiny flashes of light from unseen animals. No light rays, caustics, surface shimmer or day/night colour grade: the animals make their own light. It suits OLED panels, which show true black.

Unlocks when 4 Amazon species are collected (planned; wired in when the species go in).

## 2. Roster

| Animal | Scientific name | Rarity | Notes |
|---|---|---|---|
| Atolla jellyfish | *Atolla wyvillei* | Common | Replaces the moon jellyfish from the first proposal, which lives in coastal surface water, not the deep sea. Ring of lights that chase round the rim. |
| Spotted lanternfish | *Myctophum punctatum* | Common | School with rows of glowing photophores. Rises toward the surface at night. |
| Silver hatchetfish | *Argyropelecus aculeatus* | Common | Hatchet-shaped, silver, glowing belly, big upward-looking eyes. Rises at night. |
| Vampire squid | *Vampyroteuthis infernalis* | Uncommon | Glowing arm tips, webbed cloak. |
| Dumbo octopus | *Grimpoteuthis* (genus) | Uncommon | Ear-like fins that flap. |
| Humpback anglerfish | *Melanocetus johnsonii* | Rare visitor | Glowing lure that lights its own face. |

Planned starters: Atolla jellyfish and spotted lanternfish.

## 3. Rendering

- **Creatures that aren't fish** (`look.creature`): a jellyfish form (pulsing scalloped bell, inner stomach, wavy tentacles, optional long trailing tentacle) and a cephalopod form (mantle with flapping fins or "ears", eyes, arms joined by a web that opens and closes). Same renderer for the tank, codex and fish lab; cached as sprites like fish.
- **Bioluminescence:** `look.glow` (photophore dots baked into the sprite, plus a soft halo drawn live and additively, gently pulsing; `chase` makes a pulse run round the spots in turn) and `look.lure` (an anglerfish stalk and bulb, whose halo is wide enough to light the fish's face).

## 4. Behaviour

- `drift`: slow, lazy wandering anywhere, with pauses (jellies, cephalopods, anglerfish).
- `migrates`: diel vertical migration. At night the depth band moves up toward the surface (lanternfish, hatchetfish), following the clock even though the tank's light doesn't change.

## 5. Codex facts (blocking)

Every fact must be checked against a source, as for v1 (FishBase for fish; SeaLifeBase, FishBase's sister database, for the jellyfish and cephalopods; plus MBARI or Wikipedia for behaviour). The session that built this couldn't reach those sites. Until the facts are in, the six animals live in `src/data/species/pending.ts` and only appear in development previews:

- `/?tank=deep` (development builds): the deep tank with the whole roster. Add `&hour=23` to see the night migration, `&closeup=now` for a close-up.
- `/?fish=<id>` (development builds) works for the pending animals too.

## 6. Finishing (in a session that can reach the sources)

Everything except the facts is wired and tested. To go live:

1. For each of the six animals, write its entry in `src/data/codex.ts` from the sources only (no facts from memory): native range and a rough `range` outline, habitat and depth, maximum size (TL/SL, or bell diameter / total length for the non-fish, stated in the entry), diet, water type `salt` and temperature if a source gives one, 2–3 fun facts, sources. Fish cite FishBase; the jellyfish and cephalopods cite SeaLifeBase (`sealifebase()` helper). Where sources disagree, say less.
2. Move the six definitions from `src/data/species/pending.ts` into their own files and `ALL_SPECIES` in `src/data/species/index.ts`; delete them from `PENDING_DEEP` (a test fails while a species is in both).
3. Set `DEEP_SEA_READY = true` in `src/data/progression.ts`. That adds the unlock rule (4 Amazon species; starters Atolla jellyfish and spotted lanternfish), the codex tab and tank switching.
4. Add the six to the @visual species test, update the README (tanks, roster) and the original design spec's roster, and release 1.3.0.

Already done: codex card colours for the deep tank, codex test rules for deep-sea animals (cold water down to −2 °C, latitudes to 85°, SeaLifeBase for non-fish), the "everything collected" god-mode preset, and a test that every tank's starters exist in that tank.
