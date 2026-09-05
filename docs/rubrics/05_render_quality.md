# Rubric 5 — Render quality: the "4K Minecraft with shaders" look

The user's words: "up the quality of your blocks, up the quality of how the Minecraft blocks look, the lighting, the
shade, everything needs to look increasingly like 4K." The reference look is Minecraft running a high-resolution
resource pack (Faithful 64x / Patrix style: still pixel art, still readable at block scale, but with real material
detail) under a shader pack (SEUS / BSL style: sun shadows, bloom on emissive blocks, filmic tone mapping, specular
on glass, metal and water, atmospheric sky). It must stay Minecraft: crisp texels, no smooth "realistic" textures, no
photo textures, cube faces still read as cube faces.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | HD block textures: every tile is authored at 64x64 (4x the old 16x16) with material-class detail (wood grain, stone chips, brushed metal, panel seams and bevels, glass reflections, fabric weave, leaf clusters); the 16x16 pixel layout stays recognisable (a Minecraft player still identifies each block instantly); NearestFilter preserved, per-tile mipmaps regenerated | Contact-sheet PNG of all tiles at 16 vs 64; critic verdict |
| 2 | Per-pixel material response: normal map (from a height field per tile) and material map (roughness, metalness, emissive) drive lighting; sun/moon direction gives a visible directional bump on stone/wood/plating; chrome/durasteel/steel glass/water show a specular highlight that moves with the camera; emissive blocks (glow panels, lamps, magma, holo signs, lit windows, torch flames) glow without depending on the light map | Screenshots at three times of day; shader compiles on WebGL2 without warnings |
| 3 | Sun shadows: cascaded shadow maps from the sun/moon (2 cascades: 0-48 blocks sharp, 48-160 blocks soft) with PCF filtering; towers cast long shadows across the Coruscant boulevards, the saloon porch shades the boardwalk, NPC/animals/vehicles cast and receive; no acne, no peter-panning larger than 0.15 blocks, no visible cascade seam in motion; shadow strength blends with the sky light so caves and interiors do not double-darken | Recording of a day cycle at 8x speed; critic verdict |
| 4 | HDR post: render to a half-float target; bloom (threshold on emissive/specular highlights, 5 mip blur, max +0.35 brightness contribution); ACES filmic tone mapping with exposure keyed to time of day (night exposure raised so Coruscant reads as a lit city, not black); subtle vignette; optional FXAA when antialias is off. Bloom must not haze the whole screen: a daytime frontier screenshot has < 2% of pixels changed by more than 8/255 outside emissive/specular regions | Screenshot pairs with post on/off; pixel diff numbers |
| 5 | Sky and atmosphere: physically-flavoured gradient (Rayleigh-ish blue at zenith, Mie-ish warm horizon at low sun), sun disc with glow, moon with phase, stars with twinkle, aerial perspective fog tinted toward the sun at dawn/dusk; Coruscant keeps its cloudless haze with a warm city-glow horizon band at night; space stays black | Screenshots at dawn, noon, dusk, midnight in the frontier and in Coruscant |
| 6 | Water: animated normals (two scrolling wave layers), Fresnel-weighted sky reflection, specular sun glint, depth-tinted transparency; the tsunami crest mesh keeps its own look but picks up the same specular | Recording of the shoreline and a flood |
| 7 | Quality presets scale the whole stack: Cinematic = everything on (shadows 2048px per cascade, bloom, HD textures, normal/material maps, FXAA); Balanced = shadows 1024px single cascade, bloom on, HD textures, no FXAA; Light = no shadows, no bloom, HD colour atlas only. Presets switch live without reload; a SwiftShader/llvmpipe renderer string auto-selects Light on first run | Panel toggle recording; `?quality=` URL param |
| 8 | Performance: on a real GPU (not SwiftShader) Cinematic at view distance 10 in the western town holds >= 60 fps at 1080p and >= 45 fps at 1440p; on SwiftShader the Light preset is within 15% of the pre-rubric frame time (measured by `scripts/bench.mjs`); GPU memory added by shadows + HDR + HD atlases <= 160 MB; the shadow pass draws only chunks inside the cascade frusta | Bench JSON before/after per preset committed under `bench/` |
| 9 | No visual regressions: block edits, cracks, selection box, hand item, particles, debris, speech bubbles, HUD, admin panel, F3 overlay all render exactly as before in the Light preset; disasters' sky/fog/flash overrides still work under the new sky and tone mapping | Existing screenshot tests + a critic pass on all three disasters |
| 10 | Determinism/multiplayer untouched: none of this touches the simulation, block data, light propagation results, or the network protocol | `npm test` green; mp-test green |

## Design notes

- Vertex layout in `src/mesher.js` is tight (uint8 light pairs + shade index). Add a face-direction (3 bits) where
  needed for tangent frames rather than full normals; everything else can be derived in the fragment shader.
- Shadow sampling belongs in a shared GLSL chunk used by the world material, water material, entity material,
  voxel-vehicle material and the debris instanced material so every surface agrees on where the shadow falls.
- The light map stays authoritative for interiors: shadow = mix(1, shadowSample, skyLightAtVertex) so a room lit only
  by lamps is not darkened again by the sun's shadow map.
- Emissive: material map B channel. Emissive tiles are not affected by shadows or the sky light, but are still fogged.
- Colored block light (RGB propagation) is explicitly out of scope for this round; note it as a follow-up.
- Everything is procedural and generated at load; no image assets are added to the repo.

## Status / decisions (R2): HD tiles + normal / material atlases (criterion 1, texture half of criterion 2)

### What exists

- `src/constants.js`: `BASE_PX = 16` (painter resolution, unchanged), `HD_SCALE = 4`, `TILE_PX = 64`. The atlas is
  `ATLAS_TILES * TILE_PX` = 1024 px. `tileUV()` is normalised, so every consumer (mesher, HUD icons, hand, particles,
  crack overlay, debris, wave meshes, remote players) works unchanged; `tilePixels()` now returns the 64x64 tile.
- `src/render/hdTiles.js`: `refineTile(base16, name, rng?, opts?) -> { color: ImageData(64), height: Float32Array(4096),
  material: Uint8ClampedArray(4096*4) }`, `normalFromHeight(height, strength)`, `buildMipChain(rgba, mode)`,
  `buildTileMaps(base16, name)` (everything the atlas needs for one tile), `blockMeanError()` (test helper).
- `src/render/materials.js`: `classify(name) -> { cls, roughness, metalness, emissive, relief, ...refiner params }`
  from an explicit per-tile table, then keyword rules (dynamic tiles: `sign:*`, `destroy_*`, names other builders
  add), then a flagged `stone` fallback. `npm run material-table` prints the whole table and exits non-zero if any
  tile is on the fallback.
- `src/render/materialMaps.js`: `getMaterialMaps()` / `setMaterialMaps(normal, material)` registry with 1x1
  placeholders (normal (128,128,255), material (230,0,0,255)) until the atlases exist. R1's shaders sample from here.
- `src/textures.js` (atlas end of the file only): `finalizeAtlas()` refines every registered tile once (cached, so a
  rebuild after `addSignTiles` only refines the new tiles), assembles the colour, normal and material atlases with
  per-tile 7-level mip chains (64 -> 1), builds `atlasTexture` / `atlasNormalTexture` / `atlasMaterialTexture`
  (+ `atlasCanvas` / `atlasNormalCanvas` / `atlasMaterialCanvas`), calls `setMaterialMaps()`, and logs the build
  time once with `console.info` (`atlasBuildStats` keeps the numbers). `?hd=0` keeps the plain 16px look
  (nearest-neighbour upsample, flat normals) for before/after comparisons and as a fallback.
- Tooling: `scripts/tile-sheet.mjs` (`sheets` = contact sheets + raw atlases, `zoom` = a few tiles at 3-4x,
  `shots` = in-game views before/after via `--hd 0|1`), `scripts/material-table.mjs`, `scripts/test-textures.mjs`
  (in `npm test`).

### Refinement rules (all enforced by `scripts/test-textures.mjs`)

1. Layout preservation: every opaque 4x4 block of HD texels averages back to its base texel (mean error <= 0.5/255,
   max <= 3/255 over all tiles; measured worst: `holo_sign` 2.3, a clipping artefact of a fully saturated neon).
   The correction is applied as a smooth interpolated field plus a per-block residual, so block means are exact
   without visible block edges. Consequence: the 16px mip level of the 64px chain equals the old atlas (within 4/255)
   and the tile reads identically at distance.
2. Alpha is inherited from the base texel (no new holes, no filled holes). The only exception is silhouette
   rounding for `roundAlpha` classes (leaf clusters), which may cut the corner texel of an opaque block next to a hole.
3. Determinism: the per-tile RNG is seeded from an FNV-1a hash of the tile name; the shared noise banks have fixed
   seeds. Two runs are byte-identical; a different name with identical pixels gives different detail.
4. Base upsample is edge-aware: neighbouring base texels of the same structure code (face / groove / dot / hole)
   whose colours are within the class `blend` tolerance are interpolated smoothly, everything else stays a crisp
   step. This is what removed the 4x4 grid that showed through the first noisy versions (stone, dirt, sand) while
   keeping grooves, rivets, mortar and glass frames sharp.
5. Detail is composed from small layer primitives (noise banks sampled through a per-tile transform, grain with
   fading streaks and knots, cracks/scratches/blades, chips/lumps/leaves, basket weave, ripples, ore facets, glass
   streaks, neon tubes / LED glow / halo for emissive texels) followed by a structure pass (domes on isolated dots,
   1-texel bevels along face/groove borders lit from the top-left), silhouette rounding (dots, cobble stones, leaf
   holes) and, for rounded classes, mild shading baked from the base relief into the colour.
6. Normal map: Sobel on the wrapped 64x64 height field, OpenGL convention (R = +u right, G = toward the top of the
   tile canvas, B = out), slope scaled by 3 * class `relief`; flat height -> exactly (128,128,255). Mip levels of the
   normal atlas are renormalised per level; the colour atlas keeps the old alpha-aware downsample rule.
7. Material atlas: R roughness, G metalness, B emissive, A 255, per base texel (grooves +0.12 roughness, ore
   nuggets metallic, emissive masked per texel from luminance/saturation thresholds so frames and dark panels never
   glow).

### Material class table

| class | tiles | rough | metal | emis | relief | notes |
| --- | --- | --- | --- | --- | --- | --- |
| wood | oak/spruce/white/charred planks, logs (bark), log tops (rings), barrel, crate, shelf, bookshelf, doors, saloon door, sign, dead bush, chests, trough, stripped oak, `sign:*` | 0.72 (bark 0.85, birch 0.7) | 0 | 0 | 0.6 (bark 0.8) | grain h/v/rings, knots, bark furrows, `nearMedian` keeps books/handles clean |
| stone | stone, bedrock, stone_bricks, sandstone top/side, gravestone, smooth_stone, scorched_stone | 0.7-0.92 | 0 | scorched 0.5 | 0.3-0.9 | chips, cracks, specks; bevelled joints on stone_bricks/sandstone |
| brick | bricks | 0.82 | 0 | 0 | 0.75 | mortar = light grooves (recessed), brick face speckle |
| cobble | cobblestone, furnace side/front | 0.84 | 0 | furnace 0.9 | 0.9 | rounded stones (dome heights, corner chamfer, baked shading) |
| dirt | dirt, grass_side, dirt_path top/side, mud, coarse_dirt, farmland, ash | 0.55-0.94 | 0 | 0 | 0.3-0.6 | lumps + dots as pebbles |
| sand | sand | 0.9 | 0 | 0 | 0.25 | ripples, specks |
| gravel | gravel | 0.88 | 0 | 0 | 0.65 | blobs -> rounded pebbles |
| plaster | plaster, snow | 0.76 / 0.6 | 0 | 0 | 0.3 / 0.25 | coarse undulation; snow sparkles |
| metal | durasteel, durasteel_dark, deck_plate, hull_plate, iron_block, gold_block, anvil, anvil_top, rail, iron_bars | 0.35-0.62 | 0.8-1 | 0 | 0.5 | brushed streaks, scratches with shadow, rivet domes, seam bevels |
| chrome | chrome | 0.12 | 1 | 0 | 0.3 | long soft streaks |
| panel | panel_black/red/stripe, piano (0.22 rough), console top/side (emissive LEDs), vent, hull_trench (lit strip) | 0.22-0.5 | 0.15-0.55 | consoles/trench 1 | 0.25-0.5 | seam bevels, light scuffs |
| glass | glass, steel_glass, window_lit (emissive panes), window_dark | 0.06-0.1 | 0 | window_lit 1 | 0.25 | streak core, lit frame edge, alpha-aware bevel |
| fabric | beds, wool white/red/blue/green | 0.95 | 0 | 0 | 0.35 | basket weave per base texel |
| foliage | grass_top (blades), oak/spruce/birch leaves (clusters, hole rounding), tall_grass, wheat, dandelion, poppy, cactus (ridges) | 0.6-0.7 | 0 | 0 | 0.45-0.7 | |
| liquid | water | 0.1 | 0 | 0 | 0.15 | soft undulation only (R1 animates the surface) |
| glow | lantern (metal detail), torch (wood detail), glow_panel, glow_panel_blue, holo_sign, city_lamp (panel detail), magma (stone detail) | 0.3-0.8 | 0-0.4 | 1 | 0.35-0.6 | emissive mask per texel; frames/borders are not emissive |
| ore | coal_ore, iron_ore (metal 0.55 nuggets), gold_ore (0.8) | 0.82 | nuggets only | 0 | 0.8 | faceted nuggets, stone elsewhere |
| organic | hay side/top (straw), pumpkin side/top (ribs) | 0.55-0.9 | 0 | 0 | 0.6 | |
| plain | missing, destroy_0..9 | 0.9 | 0 | 0 | 0 | nearest-neighbour, no relief (crack overlay must stay identical) |

Every painted tile is in the explicit table; only `destroy_*` and `sign:*` use keyword rules (by design). Nothing is on
the fallback (`npm run material-table` and the unit test both check this).

### Performance

- Measured in headless Chrome (SwiftShader) on this 4-core VM while ~20 other builders' processes were running (load
  average 24-28, i.e. 6-7x oversubscribed): full build of the three 1024x1024 atlases with 7 mip levels for 118 tiles,
  10 consecutive page loads = 194 / 265 / 268 / 302 / 309 / 309 / 331 / 340 / 359 / 424 ms wall (median 309; the 424
  had a 147 ms canvas upload stall, normally 20-30 ms). Split: refine 170-320 ms, mip assembly 7-13 ms, canvas +
  texture creation 20-30 ms. Node (`scripts/test-textures.mjs`): the same work cold 180-400 ms wall; warm (JIT
  compiled) 40 ms. Log: `/opt/cursor/artifacts/r2_atlas_build_time.log`.
- The cold cost is V8 tier-up, not the algorithm: fully unoptimised (`node --no-opt --no-maglev`) one pass takes
  ~900 ms and ~800 scavenges, warm optimised 40 ms and 1 scavenge; the cold pass sits in between (~60 scavenges: the
  boxed doubles of the loops that run before their TurboFan code lands, which on a loaded machine is late). What
  helped: shared noise banks + per-tile index transforms instead of per-tile noise, scratch buffers and slab-allocated
  outputs, precomputed pair similarities for the edge-aware weights, fused colour-channel and noise passes, hoisting
  material reads out of hot loops, one fixed object shape for material descriptors. On an idle machine the build is
  well under the 350 ms budget; under this VM's load 7 of 10 samples are under it.

### Known imperfections / follow-ups

- Nothing samples the normal / material atlases yet in this branch: they are built, registered through
  `setMaterialMaps()` and exported next to `atlasTexture`, but the bump/specular/emissive response only appears once
  R1's shaders read them (`getMaterialMaps()`).
- Near-white tiles (snow, wool_white, iron_block) show little colour detail because there is no headroom above 255;
  their relief lives in the normal map. Fully saturated neons (holo_sign) clip slightly (block error 2.3/255).
- Detail is per base texel and mean-preserving, so an HD tile can never introduce shapes larger than a base texel
  (no long diagonal cracks across a whole stone block); this is the price of keeping the 16px layout identical.
- `plain` tiles (crack overlay) are nearest-neighbour upsampled: the destroy stages stay pixel-identical to before.
- Material values are per base texel (16x16 resolution inside a tile), not per HD texel, except the emissive mask
  which is also per base texel; per-HD-texel roughness variation (wet spots, polished scratches) is a follow-up.
- Cold build time depends on JIT warm-up; a fixed-point (Int32) version of the noise/compose loops would remove the
  interpreter's double boxing if the budget ever needs to hold on much slower machines.
