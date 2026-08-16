# Per-asset agent brief

You own a disjoint set of files. Do not edit files outside your set.
The look is the goal: stylized-realistic, Forza / Starfield neighborhood.
No downloaded models or textures. Kit-bash primitives + canvas maps.

## Shared contracts

- Units are metres. +X right, +Y up, +Z forward. Origin on the ground between the axles.
- Read `src/vehicle/spec.js` and `src/palette.js`. Do not invent a second palette.
- Materials must stay PBR (`MeshStandardMaterial` / `MeshPhysicalMaterial`) with roughness variation.
- Do not use three's physical `Sky` shader (NaN around the sun disc poisons bloom).
- Capture is software WebGL. Keep triangle counts honest. Instancing over unique meshes.

## Ownership

| Agent | Files |
|-------|-------|
| body | `src/vehicle/body.js`, `src/vehicle/materials.js`, `src/textures.js` (paint/metal only) |
| wheels | `src/vehicle/wheels.js` |
| interior | `src/vehicle/interior.js` |
| details | `src/vehicle/details.js` |
| forest | `src/forest.js` |
| road | `src/road.js` |
| lighting | `src/sky.js`, `src/post.js`, `src/palette.js` |
| player | `src/player.js`, `src/interact.js` |

## Loop

Improve your asset, then stop. The master loop screenshots `hero`, `front`, `rear`, `wheel`, `interior`, `forest`, `road`, `detail` and scores the rubric in `PROGRESS.md`.
