# Realism pass 02 — dimensional arena frame

Goal: replace the flat gridded stone border with terrain that reads as built geometry.

- Frame is now staggered stone slabs (brick-course offset) with per-slab tone
  variance, a lit top bevel and sunk bottom edge on every slab.
- Seeded cracks and pebbles so slabs aren't stamped clones.
- Corner boulder clusters (gradient-shaded, specular dot, contact shadow).
- Moss patches creep onto the walkway along the turf edge.

Verified in `3-battle-mid.png`: border reads as a raised walkway around the
field; no readability change to units/HUD.
