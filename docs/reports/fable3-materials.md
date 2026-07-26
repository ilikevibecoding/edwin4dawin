# Fable 3 report — procedural PBR material library (Wave A texture pass)

Owner: Fable 3 (props, materials, decals & storytelling).
Scope of this pass: `src/world/textures.js` (new), `src/world/materials.js`
(rewritten internals, all exports preserved), `assets/manifest/props-core.js`
(MAT-001 updated), this report.

## What was built

`src/world/textures.js` — a seeded, seamless canvas-texture toolkit plus one
generator per material family. Each generator returns
`{ map, normalMap, roughnessMap }` as `THREE.CanvasTexture`:

- Toolkit: `makeCanvas(size)`, wrapped-lattice value noise
  (`makeValueNoise`, anisotropic lattices supported for grain/brush streaks),
  `makeFbm`, per-cell `hash2`, Sobel `normalFromHeight(heightOrCanvas,
  strength)` with wrapped edges, a `bake(size, pixelFn, {post})` core, and a
  wrapping random-walk crack stamper.
- All maps: `RepeatWrapping`, anisotropy from `qualityPreset().anisotropy`.
  Color maps are `SRGBColorSpace`; normal/roughness stay linear (three.js
  reads roughness from the green channel; maps are grayscale).
- Determinism: every generator owns `new Rng(fixedSeed)` from `core/rng.js`.
  No `Math.random` anywhere. Patterns are period-exact (integer frequencies,
  integer cell counts), so every texture tiles seamlessly.
- No baked directional lighting anywhere — albedo variation + normal +
  roughness only (snow crevices get a slight blue *scatter* tint, garage
  tire-wear is albedo darkening, both view/light independent).

`src/world/materials.js` — same public API (`getMaterial`,
`getGlassMaterial`, `getCrackedGlassMaterial`, `FLOOR_STYLES`,
`materialNames`, `upgradeMaterial`, `MATERIAL_TILE_METERS`, `getUvScale`).
Every entry now binds its texture set; the maps carry full albedo/roughness
and the table keeps per-material `metalness` and `normalScale` scalars plus a
flat-color fallback (defensive only — every name has a generator). Glass
materials unchanged. Materials are never mutated at runtime.

## Families & sizes

512 px (architectural tileables): drywall, drywall_accent, drywall_blue,
plaster, brick, ceiling_tile, carpet, carpet_exec, carpet_worn, vinyl, tile,
tile_dark, tile_restroom, lobby_floor, concrete, concrete_dark, wet_concrete,
garage_floor, snow, server_floor.

256 px (prop-scale utility): wood, wood_dark, laminate, door_office,
door_exec, door_metal, door_fire, metal_painted, frame_metal, mullion,
metal_dark, metal_brushed, steel, aluminum, plastic_dark, plastic_light,
baseboard, rubber, fabric_blue, fabric_gray, leather_black, paper, cardboard,
entry_mat, ice.

New names added (for future prop/decoration work): `brick`, `drywall_blue`,
`wet_concrete`, `ice`, `carpet_worn`, `tile_restroom`. New additive
`FLOOR_STYLES` keys: `carpet_worn`, `restroom`, `ice`.

## MATERIAL_TILE_METERS (shipped)

| material | m/tile | rationale |
|---|---|---|
| ceiling_tile | 1.2 | texture holds 2×2 of the 0.6 m T-bar grid |
| tile / tile_dark / tile_restroom | 1.2 | 4×4 of 0.3 m ceramic (restroom 6×6 of 0.2 m) |
| lobby_floor | 2.4 | 3×3 of 0.8 m polished slabs |
| server_floor | 1.2 | 2×2 of 0.6 m raised-access panels w/ corner screws |
| carpet / carpet_exec / carpet_worn / vinyl | 2 | heather/mottle cadence |
| concrete / concrete_dark / wet_concrete | 2.4 | blotch + hairline-crack cadence |
| garage_floor | 3 | tire-wear lane pair spacing |
| drywall(+variants) / plaster | 2.4 | roller/mottle cadence |
| brick | 1.2 | 16 courses of 75 mm running bond |
| snow | 3 | large drift undulation |
| ice | 1.5 | frost streak cadence |
| wood / wood_dark / laminate | 1.2 | ring spacing at furniture scale |
| metal_painted 1.6, metal_dark 1.2, brushed/steel/aluminum 1 | | orange-peel / brush cadence |
| everything else | 1 (default) | prop scale |

## Performance

All 31 generated sets (25 used by the world build + 6 new lazy names forced):
**~1.05 s total** on the SwiftShader QA runner — well inside the 2.5 s
budget. Generation is lazy per material and cached; the world build only pays
for what it uses (25 sets, ~0.8 s). Game reaches `playing` at the same speed
as the graybox build. `window.__texStats` exposes `{count, ms}` for QA.

## Screenshots taken (artifacts/)

Baseline: `f3_baseline_lobby.png` (pre-pass graybox, for comparison).
Mission lighting: `f3_lobby.png`, `f3_cubicles.png`, `f3_conference.png`,
`f3_north_corridor.png`, `f3_break_room.png`, `f3_server_room.png`,
`f3_server_close.png`, `f3_garage.png`, `f3_service_corridor.png`,
`f3_restrooms.png`, `f3_exec_office.png`, `f3_spawn.png`,
`f3_door_close.png`, `f3_newmats.png`.
Neutral (unlit material review): `f3_lobby_neutral.png`,
`f3_corridor_neutral.png`.

Every shot completed with **zero console errors and zero warnings** (no
magenta fallbacks, no unknown-material warnings).

## Self-scores (silhouette / materials / texture / lighting response / consistency)

| family | sil | mat | tex | light | cons | notes |
|---|---|---|---|---|---|---|
| drywall + accent/blue/plaster | 4 | 4 | 4 | 5 | 5 | subtle roller nap; plaster softened after round 1 |
| ceiling_tile | 5 | 5 | 5 | 4 | 5 | 0.6 m grid + pinholes read at all distances |
| carpet / carpet_exec / worn | 4 | 4 | 4 | 4 | 5 | heather retuned to kill corridor-scale repetition |
| vinyl | 4 | 4 | 4 | 4 | 5 | pale sheen with mottle |
| tile family + lobby terrazzo | 5 | 5 | 4 | 5 | 5 | terrazzo speckle softened after round 1 |
| concrete family + garage | 4 | 5 | 4 | 4 | 5 | cracks straightened after round 1 |
| woods (veneer/laminate/doors) | 4 | 4 | 4 | 4 | 5 | ring contrast reduced on doors |
| painted metals + fire door | 4 | 4 | 4 | 4 | 5 | orange-peel + chips; reads at prop scale |
| brushed metals | 4 | 4 | 4 | 4 | 5 | anisotropic roughness streaks |
| fabric/leather/plastic/rubber/paper/cardboard | 4 | 4 | 4 | 4 | 5 | prop-scale; will be exercised by Wave B props |
| snow / ice | 4 | 5 | 4 | 5 | 5 | cold, bright, matte; blue crevice scatter |
| entry_mat / server_floor | 5 | 5 | 5 | 4 | 5 | screws + panel gaps visible in close-up |

All shipped families ≥4 on every axis.

## Discrepancies / notes for other owners

1. **break_room floor strip (Fable 2 / builder.js)**: a raised
   concrete-textured strip crosses the vinyl floor diagonally through the
   room (`f3_break_room.png`, lower half). It is builder geometry at a
   floor-rect boundary, visible in graybox too but now more obvious with
   distinct materials. Not fixable from my files.
2. **north_corridor dark center band** under mission lighting is a
   lighting/shadow effect, not a texture artifact — verified absent under
   `qa.setLighting('neutral')` (`f3_corridor_neutral.png`).
3. Restrooms and some service rooms are very dim under mission lighting;
   material readability there is light-placement bound (Fable 2 light pass).
4. Metals have no environment map (forward renderer, lights only), so raw
   metals rely on roughness streak variation for interest; kept metalness
   at/below graybox values to avoid crushed blacks.
5. Door meshes use unit box UVs (unbatched), so door textures are authored to
   map one leaf ≈ one tile; wood grain runs up the door as intended.
