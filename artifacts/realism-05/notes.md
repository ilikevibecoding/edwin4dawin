# Realism pass 05 — tower masonry + volume

- New `stoneCourses` masonry: staggered per-brick blocks with tone variance,
  recessed mortar joints and a lit top bevel per block (clipped to the wall).
- Side turret and king keep both get a cylindrical light overlay (lit left,
  shaded right edge) plus grime gradient at the footing.
- Platform: lit deck gradient, front face as stacked blocks with seams and a
  bright top lip, soft occlusion ellipse where the body meets the deck.
- King rear turrets shaded toward their outer edges; roofs get a lit facet.
- `damageTint` now emits hex so the shading helpers can keep operating on
  damaged walls.

Verified in tower crops of `3-battle-mid.png`: walls read as coursed stone
with volume rather than flat fills.
