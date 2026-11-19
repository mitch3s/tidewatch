# Tidewatch v1.3: the deep sea

**Date:** 2026-11-18
**Status:** Released in 1.3.0 (19 November 2026).
**Builds on:** [`2026-11-18-tidewatch-v1.2-life.md`](2026-11-18-tidewatch-v1.2-life.md)

## 1. The tank

Almost black water far below the reach of sunlight, faint ridges in the distance, a dark silt floor with glass sponges and sea pens, marine snow drifting down, and tiny flashes of light from unseen animals. No light rays, caustics, surface shimmer or day/night colour grade: the animals make their own light. It suits OLED panels, which show true black.

Unlocks when 4 Amazon species are collected.

## 2. Roster

| Animal | Scientific name | Rarity | Notes |
|---|---|---|---|
| Atolla jellyfish | *Atolla wyvillei* | Common | Replaces the moon jellyfish from the first proposal, which lives in coastal surface water, not the deep sea. Ring of lights that chase round the rim. |
| Spotted lanternfish | *Myctophum punctatum* | Common | School with rows of glowing photophores. Rises toward the surface at night. |
| Lovely hatchetfish | *Argyropelecus aculeatus* | Common | Called "silver hatchetfish" when first proposed, but FishBase and Wikipedia both name it the lovely hatchetfish ("silver hatchetfishes" is the whole genus). Hatchet-shaped, silver, glowing belly, big upward-looking eyes. Rises at night. |
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

## 5. Codex facts

Every fact is checked against a source, as for v1: FishBase for the three fish; SeaLifeBase, FishBase's sister database, for the jellyfish and cephalopods; plus MBARI or Wikipedia for behaviour. Read on 18–19 November 2026. Notes:

- Sizes: the Atolla jellyfish's is the width of its bell (`WD`, shown as "across the bell"), as SeaLifeBase gives it. The vampire squid's is total length (30 cm; SeaLifeBase, MBARI and Wikipedia agree). The dumbo octopus is a genus, so its size is the largest SeaLifeBase lists for any species in it (*G. umbellata*, 40 cm TL). The anglerfish's is the female's (18 cm TL; males reach 2.9 cm).
- Atolla's depth is left out, because SeaLifeBase (0–1500 m) and Wikipedia (1,000–4,000 m) disagree.
- No source gave a water temperature for any of the six, so none is shown.
- Range maps follow the latitude ranges FishBase and SeaLifeBase give. The dumbo octopus is thought to live worldwide, so its map is a broad band over the places it has been found.

Development previews:

- `/?tank=deep` (development builds): the deep tank with the whole roster. Add `&hour=23` to see the night migration, `&closeup=now` for a close-up.
- `/?fish=<id>` works for the deep-sea animals as for the others.
