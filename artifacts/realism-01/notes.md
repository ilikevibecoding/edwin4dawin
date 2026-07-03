# Realism pass 01 — grass field texture

Goal: kill the "flat vector" read of the biggest surface (the turf) and add the
shared shading toolkit used by every later pass.

- Added `mix`, `shade`, `rgba`, `grad`, `rgrad` helpers to `art.js` (single warm
  key light + cool shadow tint so every surface shades consistently).
- Grass base is now a lit vertical gradient (deep green far end -> sunlit near end)
  instead of one flat fill.
- Checkers became translucent light tiles so the lighting shows through them.
- 15 seeded soft mottling patches (dark olive / sunny lime) break up the plane.
- 330 seeded blade strokes (dark + light) give the turf a real nap.
- Inner ambient-occlusion ring where the turf meets the frame.

Verified in `3-battle-mid.png`: field reads as textured ground, not a paint fill;
tiles still countable; units/HUD unchanged.
