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

The codex tests also need adjusting for the deep sea: temperatures below 15 °C, latitudes beyond 40°, and SeaLifeBase accepted instead of FishBase for animals that aren't fish.

## 6. Then

Register the species, add the progression rule, codex tab colours, presets, README and version 1.3.0.
