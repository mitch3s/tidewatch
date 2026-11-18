# Tidewatch v1.1: the look pass

**Date:** 2026-11-18
**Status:** Approved (direction "premium illustrated", option A from the v1 review). After the first review the effects were too subtle, so the sand light, haze and blur were strengthened. After the second review (1.1.1) the sand light was toned down and the blur removed: blurred fish looked bad.
**Builds on:** [`2026-11-17-tidewatch-design.md`](2026-11-17-tidewatch-design.md)

## 1. Why

v1 works, but it reads as cartoonish: fish are flat fills with dark outlines and look pasted on top of the water, every fish is equally sharp whatever its distance, and night is the day picture with a dark overlay. v1.1 changes **lighting and depth**, not the art style. Fish stay code-drawn and stylised.

This comes before any new species or biomes, so new content is tuned once, in the final look.

## 2. Changes

### 2.1 Fish lighting (shared renderer)
- Countershading with a narrow sheen just below the back (light from the surface) and a blue-tinted shadow under the belly instead of black.
- A thin rim light along the top edge of the body.
- The dark rim around the body and the fin rays are tinted with deep water blue instead of black, so fish sit in the water instead of on top of it.
- Same renderer everywhere (tank, codex, fish lab), so the codex gets the new look too. The @visual reference images are updated.

### 2.2 Depth
- Tank fish get a wider depth range (z 0.7–1.1 instead of 0.85–1.1).
- Fish are drawn in three depth levels. Far fish are tinted towards the biome's haze colour (not blurred: tried in 1.1.0 and it looked bad); the middle level is lightly tinted; near fish are untouched.
- The tint is baked into the cached sprites when they are first drawn (a few extra sprite sets per species), so they cost nothing per frame. `ctx.filter` is never used per frame.
- Fish near the floor cast a soft shadow on the sand.

### 2.3 Water
- **Caustics:** an animated, tileable network of light on the sand (pre-computed once, 12 looping frames, cross-faded). Strong by day, faint by moonlight; weaker and warmer in the murky Amazon. The reef sand is a little darker than in v1 so the light shows up.
- **Surface shimmer:** faint moving bright bands at the top of the screen, the underside of the surface.
- **Two layers of particles:** the existing fine specks stay in the middle distance; a few large, soft, out-of-focus motes drift in front of everything.

### 2.4 Time of day
- Night uses a **multiply** colour grade (darker and bluer, keeping contrast) instead of a flat translucent overlay that washed colours out to grey.
- **Moonlight:** faint silver light rays at night instead of none.
- **Dawn and dusk:** a warm colour grade plus a warm glow from the surface.

### 2.5 Version in the app
- The version (from `package.json`, now 1.1.0) is shown next to the title, and the codex's Settings tab shows the version and the git commit of the build (`+` if it had uncommitted changes), so you can tell which build is installed on the TV.

## 3. Performance budget

The C6 used about 3 ms of its 16.7 ms frame. v1.1 adds per frame: two pattern fills (caustics), a few gradient strokes (shimmer), up to 40 shadow sprite copies, 14 mote sprite copies and one full-screen multiply fill. All tinted fish come from the sprite cache. Target: stays well inside the 60 fps budget on the C6; check with the god-mode performance readout.

- *PC measurement (headless Chromium, 1920×1080, all species):* draw time went from 0.8 to 1.2 ms per frame by day and from 0.7 to 1.3 ms at night. On the C6 (2.9 ms in v1) that should still leave most of the 16.7 ms budget. **To check on the TV.**
- The caustic pattern is computed once at startup (about 0.1 s on a PC, so expect up to about a second on the TV, while the frame-rate guard still ignores slow frames) and only recoloured per biome.

## 4. Out of scope

New species and biomes, sound, cinematic camera, night-only behaviour (later releases, see the v1 review).
