# Tidewatch v1.2: life

**Date:** 2026-11-18
**Status:** Approved ("let's continue" after v1.1.1)
**Builds on:** [`2026-11-17-tidewatch-design.md`](2026-11-17-tidewatch-design.md), [`2026-11-18-tidewatch-v1.1-look.md`](2026-11-18-tidewatch-v1.1-look.md)

## 1. Why

v1.1 made the tank prettier. v1.2 makes it feel alive, and gives people more reasons to keep it on and to pick up the remote now and then. It covers four features, built and committed one at a time.

## 2. Feeding

- **OK** in the aquarium (with no rare visitor on screen) sprinkles food from the surface. With the Magic Remote pointer, clicking the water drops food at that spot.
- About 14 flakes drift down, wobbling. Fish that are free to swim (not bottom-dwellers) break off what they're doing, swim to the nearest flake, a bit faster than usual and outside their usual depth band, and eat it. Bottom-dwellers eat the flakes that reach the floor. Uneaten flakes on the floor fade after about 20 s.
- At most once every 10 s, so pressing OK repeatedly doesn't flood the tank.
- The first press after the UI has faded only wakes it (spec 5.5, unchanged); the tank name line now says "OK feed".
- Feeding is just for fun: it has no effect on collecting.

## 3. Night rest

The original spec asked for this (5.1, "some species idle near the bottom"), but v1 never had it.
- Fish activity follows the light: in full night fish swim at about half speed, pause more often, and free-swimming species sink into the lower part of their depth band.
- Feeding wakes them up: while there's food in the water, fish swim at their day speed.
- Off when day/night lighting is off.

## 4. Close-ups

- Every 3 to 6 minutes, the camera slowly zooms in (to about 1.4×) on one fish and follows it for 20 to 30 seconds, then drifts back out. It feels like a nature documentary.
- Never while a rare visitor is in the tank (it cuts short if one appears), during a tank switch, or with the codex open.
- Fish sprites are cached at 1.4× resolution so they stay sharp when zoomed in.
- Setting: **Close-ups** on (default) or off.

## 5. Ambient sound

- Generated in code with the Web Audio API (no sound files, nothing to license): a soft, slowly breathing water sound, and small bubble sounds in time with the bubble streams in the tank.
- Quieter at night, and quieter still while the codex is open.
- Setting: **Sound** off (default), quiet or normal. TVs only allow sound after a key press, which the setting itself provides; a saved "on" setting starts on the first key press.

## 6. Settings and saving

Two new settings: `closeups: boolean` (default true) and `sound: 'off' | 'quiet' | 'normal'` (default off). Old saves get the defaults; no save version change is needed because missing settings are already filled in on load.

## 7. Version

1.2.0, shown in the app as before.
