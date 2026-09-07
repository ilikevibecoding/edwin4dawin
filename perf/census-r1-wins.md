## Top ten cheapest wins

Ordered by saving per line of code changed. Every number is from the tables above (build `ad7ef04+`, `quality=fast`, 1280x720); "per frame" means the beauty pass unless stated, and remember the AO G-buffer draws the scene a second time and the shadow map a third, so a beauty-pass triangle saved on a shadow-casting, depth-writing surface is saved three times.

### 1. main.js boot — the scene is compiled twice; 124 of 284 programs are never used

*Group/module:* boot sequence in `src/main.js` ("Compiling shaders" step).
*What:* `renderer.compile(scene, camera)` runs with no render target bound, so every material is compiled with `toneMapping = ACES, outputColorSpace = sRGB`; the composer then draws the scene into `renderTarget1` (`NoToneMapping`, linear), which is a different cache key, and every material compiles again. Both programs stay in `materialProperties.programs`. Measured: 124 tone-mapped programs are `currentProgram` for zero materials; 183 of 199 scene materials own exactly two programs whose keys differ only in those two fields.
*Change:* bind the composer's target before compiling — `renderer.setRenderTarget(post.composer.renderTarget1); renderer.compile(scene, camera); renderer.setRenderTarget(null);` — or delete the `renderer.compile` line and let the existing warm-up `p.render(1/60)` compile the programs that will actually be used.
*Saving:* −124 programs (284 → 160 after all views; 277 → ~153 at boot), and roughly half of the "Compiling shaders" stage (24.6 s with the box idle, 42.4 s in the loaded run recorded above; the two compile passes are the same shaders; the fraction carries to a GPU even though the seconds do not). Also 124 fewer GL program objects held for the session.
*Confidence:* high — measured, and the mechanism is three's `getParameters` reading `renderer.getRenderTarget()`.

### 2. terrain.js — `terrain` and `roadStones` are one mesh each, so every frame draws the whole route

*Group/module:* `terrain` (`src/terrain.js`, the ground mesh and the scatter bake that becomes `roadStones`).
*What:* `terrain` is 264,548 indexed triangles, `roadStones` is 14,540 baked pieces = 222,328 non-indexed triangles; both are single meshes, so the sphere test passes from anywhere on the route and they are drawn whole in the beauty pass and again in the AO G-buffer (487k + 491k tris per frame, every view). Measured per triangle centroid, the fraction actually inside the frustum is 3% / 1% (hero), 17% / 19% (mainroad), 26% / 27% (forest), 54% / 60% (camp), 5% / 4% (lions).
*Change:* bucket both by route parameter into tiles (12–16 along the trail + mainline, or a 4×4 world grid) and emit one Mesh per tile; keep `frustumCulled = true`. For `roadStones` the bake loop already knows each piece's road `t`, so the bucket is one array index at emit time.
*Saving:* 190k–450k beauty triangles and the same again in the G-buffer per frame — 380k–900k of the ~3.4M triangles the GPU rasterises for a frame today. Cost: ~30 more draw calls. Do **not** also index `roadStones`: its 666,984 vertices were measured 100% unique (per-face colour and normal), so an index buffer saves nothing there.
*Confidence:* high on triangles (measured), medium on wall-clock (how vertex-bound the GPU is was not measurable here).

### 3. fleet (vehicles/kit.js) — merged per material across the whole fleet, so it is drawn when none of it is on screen

*Group/module:* `fleet` (`src/vehicles/kit.js` `emit`, one merged mesh per material for all parked vehicles).
*What:* in the mainroad view the fleet costs 248,082 beauty + 247,308 shadow + 246,738 G-buffer triangles in 24 + 20 + 23 calls, and `fleet_steel`, `fleet_rubber` and `fleet_trim` (132k tris) have **0** triangles inside the frustum; only 58,914 of the 248,082 are. The merged bounding spheres cover the whole parking apron.
*Change:* merge per material *per vehicle* (or per parking slot) instead of per material per fleet. The kit already loops over placements; move the `mergeGeometries` inside that loop.
*Saving:* in views where the fleet is at the edge of the frame (mainroad, and every drive frame approaching the camp) ~190k beauty + ~190k G-buffer + up to 247k shadow triangles per frame. When the whole fleet is in frame nothing changes except draw calls (24 → up to 24 × vehicles, culled).
*Confidence:* high (measured).

### 4. forest.js — species-wide InstancedMeshes defeat culling for the grass, forbs, swaths and scrub

*Group/module:* `forest` (`src/forest.js`, the `grass_N`, `forb_N`, `swath_N`, `scrub_N`, `tree_*` InstancedMeshes).
*What:* the forest draws 414k instanced triangles in every view. Measured per instance bounding sphere, the instances inside the frustum are 31k / 52k / 141k / 151k / 27k triangles' worth (hero / mainroad / forest / camp / lions). `grass_1` alone: 73 of 1,865 instances in frustum (hero), 63 (lions), 884 (camp).
*Change:* when planting, bucket each species' instances into a 3×3 (or 4×4) grid of cells over the forest footprint and make one InstancedMesh per non-empty cell, sharing geometry and material (same program: the material is what keys the program, not the mesh). Trees (41 + 24 instances) can stay as they are.
*Saving:* 260k–385k beauty triangles per frame in the drive views (the shadow pass also culls per object: part of its 147k). Cost: ~8 species × (cells − 1) more InstancedMesh objects, of which only the in-frustum ones become draw calls.
*Confidence:* high on triangles (measured), medium-high on net effect (each extra call is cheap; the vertex work saved is not).

### 5. vehicle + fleet — index the merged kit geometry

*Group/module:* `vehicle` (`src/vehicle/body.js` `emitPieces`, `src/lib/geo.js` merge) and `fleet` (`src/vehicles/kit.js`); both merge with `toNonIndexed()` and `mergeGeometries(list, false)`.
*What:* 111 of the truck's 113 geometries and all 78 fleet geometries are non-indexed. Counted exactly (all attributes at 1e-4): the truck stores 1,427,405 vertices for 320,495 distinct ones (4.45×), the fleet 753,054 for 209,776 (3.6×). 44.9 MB + 43.1 MB of vertex buffers, in the JS heap and on the GPU.
*Change:* `BufferGeometryUtils.mergeVertices(merged)` at the end of each kit emit (or build indexed in the first place). The camp's kit is already 77% unique and not worth it.
*Saving:* 56.9 MB of vertex data (measured across the 95 large non-indexed geometries; ~57 MB off the 335 MB heap and off the GPU), and 3.6–4.5× fewer vertex-shader invocations for the truck and fleet across beauty, shadow and G-buffer (the truck alone is 1.4M vertices × 3 passes today). Cost: a one-off hash of ~2.2M vertices at boot.
*Confidence:* high on bytes (measured), medium on GPU time.

### 6. vehicle — 99 shadow casters, 404k shadow triangles, every frame

*Group/module:* `vehicle` (`src/vehicle/body.js` `UNSHADOWED`, `details.js` `castShadow`).
*What:* the truck's shadow pass is 99 draw calls / 404,280 triangles per frame: body 21 casters / 197,820, tyres 24 / 99,016, gear 21 / 81,652, brakes 28 / 10,224, axles 5 / 15,568. The 28 brake casters are behind wheels; `body_gap` (28,096 tris) and `cabin_gap` are shut-line recess geometry; `body_chrome`/`body_trim*` (87k tris) are fittings on panels that already cast.
*Change:* add `brakes`, `gap`, `trim`, `trimGloss`, `chrome`, `glassEdge`, `reflector`, `decal*` to `UNSHADOWED` (the mechanism exists), and consider a single low-poly caster proxy for the body shell.
*Saving:* −28 to −55 shadow calls and −40k to −150k shadow triangles per frame depending on how far the list goes; nothing in the beauty pass changes.
*Confidence:* medium — the triangle numbers are measured, which casters read on screen is a judgement.

### 7. vehicle/fleet materials — the material *name* is in the program cache key

*Group/module:* `vehicle` (`src/textures/vehicle.js` `extendMaterial` tags `bw:${tag}`, `dirt:${tag}`, `cb:${tag}`, `gf:${tag}`; `src/vehicle/interior.js` `cl:${tag}`; `src/vehicle/wheels.js` `loadedTyre_${mat.name}_`), `fleet` (`src/vehicles/materials.js` `fleetDirt:${tag}`, `sway:${tag}`).
*What:* every patch puts the material name into `customProgramCacheKey`, so materials whose patches receive identical baked parameters and whose built-in parameters agree still compile separately. Measured by stripping only the name and re-keying: `fleet_rust / fleet_rubber / fleet_tread / fleet_fabric / fleet_vinyl / fleet_vinylFaded` are 6 copies of one program; `paint / paintDark / paintAccent` 3; `chrome / alu`, `decalName / decalNumber`, `interiorPlastic / interiorFaded`, `tyreCarcass / tyreLug`, `brakeRotor / caliper`, `fleet_paint / fleet_paintOld`, `fleet_glass / fleet_glassDusty` (×2) 2 each.
*Change:* key on what changes the GLSL (`bw:${fresnel}:${clearcoat}:${pane}:${ccRough}:${flat>0}:${ambient>0}`, `dirt:${arch}:${scratch>0}`, `cb:${spec}`, `cl:${spec>0}:${y0}:${y1}`, `loadedTyre_${bulge}`) and leave the name out; per-material values are already uniforms (`u`).
*Saving:* −15 working programs (160 → 145; vehicle 58 → 51, fleet 32 → 24), −30 today because each also has a canvas twin. A further −24 (vehicle 45, fleet 18) is available if materials in the same class are given the same map set (a shared 1×1 white/flat map keeps `USE_MAP`/`USE_ROUGHNESSMAP` on), which is a bigger edit.
*Confidence:* high for the −15 (measured keys, uniforms verified in source), medium for the map-set −24.

### 8. everything with a DataTexture — 109 MB of pixel arrays kept in the JS heap after upload

*Group/module:* `forest` 55 MB, `vehicle` 29 MB, `camp` 15 MB, `fleet` 6 MB, `terrain` 3 MB (`src/textures/*` build `DataTexture`s from typed arrays).
*What:* 211 of the 267 textures are `DataTexture`s. After `texImage2D` three never reads `image.data` again unless `needsUpdate` is set, but the arrays stay referenced: 108.8 MB of the 335 MB steady-state heap (exact: width × height × bytes/texel per texture).
*Change:* in the texture factory, `tex.onUpdate = () => { tex.image.data = null; }` (three calls `onUpdate` after upload) for textures that are never regenerated; keep the array only where time-of-day rebuilds it. Trade-off: after a WebGL context loss those textures cannot be re-uploaded from the array — acceptable for a page that reloads on context loss, or gate it behind the `capture` flag being absent.
*Saving:* up to 109 MB of JS heap (335 → ~226 MB) and the GC pressure that goes with it. Zero GPU change.
*Confidence:* medium — the byte count is measured; the context-loss trade-off is a product decision.

### 9. post — the AO G-buffer is a third full scene draw and inherits every culling fix

*Group/module:* `post` (`src/post.js` `patchGBufferPass`, three's `GTAOPass` normal/depth override).
*What:* per frame the G-buffer re-issues 157 (hero) to 241 (camp) draw calls and 1.05–1.57M triangles through `MeshNormalMaterial`, including the 490,924 terrain triangles and 129 truck parts. It cannot be cheaper than the beauty pass until items 2–4 land; after them it drops in step. The pass itself is already right-sized: it skips `depthWrite = false` materials and freezes shadow updates.
*Change:* nothing in `post.js` for now; the cheap post-side item is the memory line — 7 full-resolution RGBA16F targets (composer ×2, GTAO ×3, SMAA ×2 = 49 MB at 720p; 2.25× that at `high`'s pixel ratio 1.5), plus 13.5 MB bloom. SMAA's edge/weight targets do not need half-float (RGBA8 is what the reference implementation uses) and GTAO's `pdRenderTarget` does not either: −14 to −21 MB at 720p if the pass options allow it.
*Saving:* triangles: none directly (see 2–4); memory: 14–21 MB at 720p.
*Confidence:* medium on the format change (needs checking that the three passes accept RGBA8 targets without banding in the denoiser).

### 10. what is already cheap and should stay that way

*wildlife:* 10 beauty calls / 5,078 triangles at the pride with the truck beside it (LOD tiers working); 4 working programs, 5 canvas variants that item 1 removes. Nothing to do.
*camp:* 47 objects, 15 working programs for 98 materials (`timber` shared by 15 materials, `canvas` by 8, `solar` by 8) — the sharing the vehicle family should copy. Its only per-frame oddity is three `frustumCulled = false` fire meshes (144 triangles, 3 calls) drawn from anywhere on the map — trivial. Camp shadow casters are 24–31 calls / 130–145k triangles when the sun's shadow frustum covers the site.
*roadside:* 10 objects, 2 working programs, 6 MB of canvas textures. Nothing to do.
*sky/dust:* 12 calls, ~2k triangles. The 6 MB PMREM ping-pong target is retained for time-of-day rebuilds; deliberate.

Out of scope for this round but measured for the record: the camp's lamps put `numPointLights = 5, numSpotLights = 4` into every lit program in the scene, so every lit fragment at 1280×720 evaluates nine local lights whatever the distance to the camp; and the whole vehicle (161 calls, 563k triangles) is drawn in full from the driver's seat in the lions view (72 calls / 458k there, of which 306k inside the frustum). Neither has a one-line fix, and the light count cannot be changed without recompiling every program.
