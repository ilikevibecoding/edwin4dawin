# Realism pass 11 — explosions

- Added a ground shockwave: flattened additive ring pair (hot core + amber
  echo) that expands with ease-out and thins as it fades.
- Added 12 hot embers per blast: additive velocity-streaked sparks that
  gutter white -> amber -> red under gravity.
- Added a scorch decal: dark radial burn on the ground that fades in fast and
  fades out over ~1.5 s.
- Kept the two-tone smoke and debris chunks from the earlier system; embers
  and rings composite over them additively.

Verified in `4-battle-towerdown.png`: destruction site shows ember spray and
smoke volume; scorch/ring confirmed in motion (they decay before the still).
