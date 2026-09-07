# Scene census r2 (gauntlet round 7, performance)

Build `cbf506a` (the bundle commit of `ee3a497`, live), measured 2026-09-06 21:00–21:20Z on the
development box (4 cores, SwiftShader; 1-minute load 2–8 during the runs, three critics and a
car builder sharing it). Everything here is structural — draw calls, triangles, programs,
textures, heap, boot stages, CPU-side timings — and real. **fps, frame time and GPU time are
the software rasteriser's and are not performance numbers**; they are listed only where the
tool prints them, and never scored.

Tools: `tools/census.mjs` at 1280×720 (the r1 census's resolution, so the tables compare) on
`fast` for `hero`, `mainroad`, `camp` (campshots' *arrive*), `lions` (lions' *seat*) and
`interior`, and on `ultra` for `hero` and `interior`; `tools/perfrun.mjs` (`--seconds 30
--loops 3`) at `fast` and `ultra`; and two throw-away probes at the frames' own 640×360 —
a per-group draw-call hook over the nine truck views (round-5 build `84c1e5e` and HEAD, same
box, back to back) and a per-frame probe of the interior with the live-mirror pass. The
tool-generated `fast` census follows the hand-written part verbatim (§A), then the `ultra`
census's headline, per-group and heap/boot sections (§B). Raw JSON: `/tmp/perf-r7/census/`
on the box at the time of writing (not committed; the tables below carry every number used).

One tool change this round: `tools/perfrun.mjs` prints the collision world's boot cost and
collider count (it is built between "Posting the signs" and "Compiling shaders" without a
boot step of its own; `debugAPI.collision.stats.boot` had the number and nothing printed it).

## Headline — r1 → round 5 → now

`fast`, 1280×720 census unless marked; `stats.json` numbers are the 640×360 shot frames.

| | r1 `ad7ef04+` | round 5 (`84c1e5e` truck sets) | **now `cbf506a`** | budget / acceptance |
|---|---|---|---|---|
| hero calls / tris (shots, 640×360) | 453 / 2.57 M (perfrun) | 488 / 2.18 M | **492 / 2.18 M** | ≤ 490 — **over by 2** |
| hero calls / tris (census, 1280×720) | 396 / 2.15 M | — | 492 / 2.18 M | |
| mainroad (census) | 491 / 2.80 M | 611 / 2.94 M (shots) | 628 / 2.96 M | |
| camp arrival (census) | 614 / 2.86 M | — | 849 / 3.26 M | |
| pride seat (census `lions`) | 296 / 1.93 M | — | 359 / 1.84 M | |
| interior (shots 640×360, mirror pass off / on) | — | 516 / 2.30 M | 525 / 2.30 M · **615 / 3.02 M** on pass frames | pass ≤ 100 calls: 90 ✓ |
| rear (shots 640×360, day / dusk / night) | — | 656 / 720 / 704 | 664 (day) | ≤ 610 — **not reachable from `roadside.js`**, see item 1 |
| programs at fast: boot / hero night / after every view | 277 (160 working) | 175 / 176 / — | **175 / 176 / 178** (179 with the beam at night) | ≤ 176 — hero ✓, whole game 178–179 |
| programs at high / ultra (boot) | — | 176 / 178 | 176 / 178 (ultra 179 with `mirrorLive`) | |
| max samplers in any program | 21 | 13 | 13 (gate) | ≤ 16 ✓ |
| textures at fast: hero / after every view | 275 | 293 / 304 | **292** / 313 | ≤ 300 — hero ✓ |
| texture memory estimate, fast / ultra | 268 MB | — | 311 MB / 803 MB | |
| JS heap, steady after 3 reset loops, fast | 333.6 MB | — | 233.4 MB (census) · 238 MB (perfrun) | |
| heap growth over 3 loops, fast / ultra | −0.1 MB | — | **0.0 / +0.5 MB** (fast, census / perfrun) · **+1.7 MB** (ultra) | ≤ +2 MB ✓ (ultra close to the line) |
| time to first frame, fast (this box) | 43.0 s (perfrun, idle) · 117.5 s (census, loaded) | — | 45.0 s (perfrun, load 2.3) · 49.5 s (census, load 4.6) | within 10 % of r1: total ✓ (+4.6 %); *Finding the pride* ✗ (see boot) |
| shader compile, fast | 24.3 s (277 programs) | — | 22.2 s / 19.7 s (175 programs) | |
| long frames > 50 ms in 30 s drive (CPU, SwiftShader) | 2 | — | 1 (fast) · 1 (ultra) | not scoreable on this box |
| collision world | — | ≈500 colliders, 0.001–0.005 ms/frame | 506 colliders (fast) / 668 (ultra), built in 5 ms, resolve mean 0.008 ms | |
| lights at night (scene) | — | — | 8 point (7 camp = the `fast` cap in `campground/lights.js`, + the fire), 6 spot (4 truck lamps + 2 `headlampSpill`), 3 directional, 1 hemisphere; every lit program compiled with `numPointLights 8, numSpotLights 6` | camp cap 7 at fast ✓ |

## Where the growth came from

Per-group beauty calls / triangles from the two censuses (`fast`, 1280×720); the shadow pass is
the same object set through the shadow camera and moves with it.

| view · group | r1 beauty calls / tris | now beauty calls / tris | r1 → now shadow calls |
|---|---|---|---|
| hero · forest | 70 / 417 k | **145 / 377 k** | 31 → 47 |
| hero · vehicle | 161 / 563 k | 160 / 582 k | 99 → 103 |
| hero · terrain | 4 / 510 k | 5 / 480 k | 0 |
| hero · camp / roadside / sky / dust | 4 / 2 / 10 / 1 | 4 / 2 / 10 / 1 (+1 `groundContact`) | 9 / 5 → 9 / 5 |
| mainroad · forest | 71 / 414 k | **174 / 474 k** | 30 → 54 |
| mainroad · camp + fleet + wildlife | 16 + 24 + 4 | 18 + 27 + 4 | 31 + 20 → 31 + 20 |
| camp · forest | 74 / 423 k | **285 / 754 k** | 31 → 47 |
| camp · camp + fleet | 47 + 127 / 190 k + 254 k | 52 + 126 / 184 k + 254 k | 24 + 16 → 24 + 15 |
| lions · forest | 66 / 399 k | **106 / 284 k** | 27 → 41 |
| lions · vehicle (from the seat) | 72 / 458 k | 75 / 470 k | 99 → 103 |
| lions · wildlife | 10 / 5.1 k | 10 / 5.0 k | 0 → 0 |

1. **The forest is the growth, in calls.** r1's win #4 landed: the ground cover is no longer
   eight species-wide `InstancedMesh`es but 355 buckets on a grid (3.08 MB of instance
   matrices), so a frustum can drop most of the plain — the hero's instanced triangles fell
   414 k → 375 k and the pride seat's 399 k → 284 k — at the price of one call per bucket in
   view: +75 calls in the hero, +103 on the mainroad, +211 at the camp arrival (285 forest
   calls there for 754 k instanced triangles, of which the census measures 1.66 M of 2.26 M
   beauty triangles inside the frustum). The camp's +330 k instanced triangles are the
   vegetation rounds' new species and counts (turf at full count, swaths, litter), not the
   grid. Rounds 5–6's "the `extra` lawn pass is two meshes / +2 calls" is two *prototypes*
   (`grass_12_b0`, `grass_13_b0`, 174 + 180 instances at the seat): the `extra` stream
   already plants into the same two `InstancedMesh`es (`forest.js` `scatter`, the `mk`
   instances), and two geometries cannot be one instanced draw without a `BatchedMesh` —
   a new program variant. Left as is.
2. **The truck: +3 beauty, +3 shadow, +3 G-buffer since round 5** — `body_mirrorGlass`
   split into four panes (`body_mirrorGlass_0..3`) so the live mirror can hang a render
   target on each (round 6/7 mirrors); `gear_reflector → gear_barReflector` is a rename.
   That is the whole of the hero's 488 → 492 (object-level diff of `84c1e5e` against HEAD,
   same box, same frame). Since r1 the truck's shadow pass is 99 → 103 casters / 404 k →
   424 k triangles; r1's win #6 (the `UNSHADOWED` list: brakes, gaps, trim, chrome, glass
   edges, decals, 28–55 casters) is still open, and it is the cheapest route back under 490.
3. **The mirror pass** (interior cameras only, `fast`): 90 calls / 715 k triangles every
   second frame with one pane live (the seat's own door), into a 120×160 target — 525 → 615
   calls on the frames it runs, 525 on the frames between, nothing from any exterior camera
   (hero: 0 passes, `live 0`). At `ultra` both panes are live (5 m range): 189 calls /
   1.27 M triangles a pass, 654 → 843 calls on pass frames; round 5's "ultra interior 780 /
   4.6 M" was a pass frame of the older mirror. One program (`mirrorLive`) at every tier,
   compiled the first time a seat camera is used: 175 → 176 at fast, 178 → 179 at ultra.
4. **The lion mane (+30 % cards, r9):** the pride seat draws 10 wildlife calls / 4,990
   triangles for four animals at their LOD (r1: 10 / 5,078) — the mane cards are alpha
   cards, cheap on the GPU. Where the lions cost is boot: *Finding the pride* 3.1 s (r1
   perfrun) → 5.5 s (perfrun) / 10.1 s (census, load 4.6) at fast, 13.2–18.1 s at ultra
   with six animals — the one boot stage more than 10 % over r1 (see §Boot). One program
   follows the lions into a frame: the skinned `MeshNormalMaterial` variant for the AO
   G-buffer (id 176, flags `skinning`) compiles when an animal first enters that frustum
   (pride +1). The other late program (id 175, mainroad +1) is the seventh shadow-depth
   variant — the alpha-tested, double-sided flags of the foliage casters' depth program
   (#147) under the far cascade's single-light key — compiled when that camera first put
   those casters in the far map. With the seat's `mirrorLive` that is the 175 → 178 at
   fast: three first-use compiles, not a leak.
5. **The collision world:** 506 colliders at fast (97 trees, 241 rocks, 56 signs, 17
   headwall parts, 26 structures, 9 tents, 44 props, 12 vehicles, 4 lions) built in 5 ms
   (forest 1.3, roadside 2.8, camp + fleet + lions 0.2, grid 0.5); resolve mean 0.008 ms,
   p99 0.1 ms per frame at fast. No draw calls, no GPU memory, ≈0 heap. Not a performance
   item.
6. **Near-field spill lights (hero car r7):** two `headlampSpill` spotlights, on at night —
   the scene's light counts are baked into every lit program's key (`numPointLights 8,
   numSpotLights 6` at fast), so their cost is one more spot-light loop iteration per lit
   fragment across the whole frame at night, not calls. The camp holds its cap (7 point
   lights at fast; the eighth is the campfire's `fireLight`). Any further light is a
   recompile of every lit program, at every hour.
7. **Terrain, unchanged since r1 and still the largest single item:** `terrain` (264,548
   tris) and `roadStones` (180,520) are one mesh each, drawn whole from every camera —
   3 % / 1 % of their triangles inside the hero frustum, and drawn again in the AO G-buffer
   (464 k). r1's win #2 (route tiles) is the biggest triangle saving still on the table:
   ≈430 k beauty + ≈430 k G-buffer triangles a frame for ≈9 k that are seen.
8. **Programs, r1 win #7 still open:** stripping the material *name* out of the vehicle and
   fleet `customProgramCacheKey`s collapses 178 → 165 at fast (fleet `fleet_tyre / tread /
   rust / fabric / vinyl / vinylFaded` 6 → 1; vehicle `paint / paintDark / paintAccent`
   3 → 1, `amber / taillight / reverseLamp` 3 → 1, `alu / chrome`, `decalNumber / decalName`,
   `interiorPlastic / interiorFaded`, `brakeRotor / caliper` 2 → 1 each) — the same GLSL
   compiled 13 times over, and the route to "≤ 176 at fast" that costs no pixel.
9. **Heap:** 333.6 → 233.4 MB steady at fast (r1 win #8, the DataTexture pixel arrays
   dropped after upload), flat over three reset loops (233.4 / 233.5 / 233.4; perfrun 238.0
   / 237.8 / 238.5). Ultra 319.5 / 319.1 / 319.1 (census) and 319.2 / 320.5 / 320.9
   (perfrun, +1.7 MB) — under the 2 MB line but not flat; the perfrun loops drive the truck
   2.5 s each, and the ultra tree count (380) and six animals leave more per-frame garbage
   (dust, decals) for the GC to catch up on. Watch it in r3 with 6 loops. Note the census's
   "DataTexture pixel MB in heap" column still multiplies width × height × bpp for every
   DataTexture (114 MB) although the arrays are released after upload — the heap total is
   233 MB with 152 MB of geometry, so those bytes are not there; the column is a texture
   size inventory, not a heap measurement, and reads as such.
10. **Textures:** 292 at the fast hero (budget 300), 313 once every view has been drawn
    (fleet +9 on the mainroad, camp +2, lions +9, the mirror target +1) — textures upload on
    first use, so the count is a function of what has been seen; 311 MB estimated at fast,
    of which shadow maps 40 MB (2 × 2048² pairs), post targets 60 MB (seven RGBA16F
    1280×720 + bloom), forest 73 MB (one 2048² foliage atlas = 21 MB), vehicle 59 MB, camp
    38 MB. Ultra: 803 MB — shadow maps 4 × 4096² = 256 MB, PMREM 2 × 3072×4096 f16 = 192 MB,
    forest 135 MB (3072² atlas, five 1536²). Nothing over 4096; nothing compressed.

## Item 1 — `rear` +30 calls (A, B), prescribed `src/roadside.js`: ablated, cause elsewhere

Per-group draw calls in the nine truck views at 640×360, HEAD by day (beauty + shadow =
`stats.json` `calls`; the AO G-buffer is listed because the GPU draws it):

| view | calls | forest b/s/g | vehicle b/s/g | camp b/s/g | fleet b/s/g | roadside b/s/g | terrain · sky · dust · contact |
|---|---|---|---|---|---|---|---|
| hero | 492 | 145 / 47 / 139 | 160 / 103 / 134 | 4 / 9 / 0 | 0 | 2 / 5 / 2 | 5 · 10 · 1 · 1 |
| front | 520 | 173 / 47 / 167 | 160 / 103 / 134 | 4 / 9 / 0 | 0 | 2 / 5 / 2 | 5 · 10 · 1 · 1 |
| **rear** | **664** | **240 / 47 / 234** | 160 / 103 / 134 | **33 / 9 / 29** | **39 / 0 / 25** | **10 / 5 / 10** | 6 · 10 · 1 · 1 |
| wheel | 462 | 142 / 47 / 136 | 133 / 103 / 119 | 4 / 9 / 0 | 0 | 2 / 5 / 2 | 5 · 10 · 1 · 1 |
| detail | 492 | 145 / 47 / 139 | 160 / 103 / 134 | 4 / 9 / 0 | 0 | 2 / 5 / 2 | 5 · 10 · 1 · 1 |
| interior | 525 (+90 on mirror frames) | 218 / 47 / 212 | 117 / 103 / 95 | 4 / 9 / 0 | 0 | 5 / 5 / 5 | 5 · 10 · 1 · 1 |
| forest | 557 | 210 / 47 / 204 | 160 / 103 / 134 | 4 / 9 / 0 | 0 | 2 / 5 / 2 | 5 · 10 · 1 · 1 |
| road | 502 | 158 / 47 / 152 | 157 / 103 / 134 | 4 / 9 / 0 | 0 | 2 / 5 / 2 | 5 · 10 · 1 · 1 |
| mainroad | 628 | 174 / 54 / 168 | 160 / 103 / 134 | 18 / 31 / 14 | 27 / 20 / 25 | 9 / 10 / 9 | 6 · 10 · 1 · 1 (+4 wildlife) |

`rear` is +172 over the hero, not +30, and the roadside is 8 of them (10 beauty calls
against 2; its shadow calls are the same 5). The rest: forest +95 (grid buckets in the view
direction), fleet +39 (the whole fleet, 253 k triangles), camp +29 (the whole camp, 165 k).
None of the three is in the picture (`shots/round5/truck_day/rear.png` is the truck, grass,
a hill and one acacia) — the rear camera at (−41.7, 5.1, −2.8) looks along (0.82, −0.21,
0.53), i.e. straight down the spur: the junction is 40 m ahead of it, the camp's anchor 64 m,
the gate and its signs 40–75 m, the river crossing's headwalls 98 m, the overlook 126 m, the
lions' board 145 m — the whole mainline is 343 m. Everything the roadside owns is inside
that frustum at 40–150 m and hidden behind the truck's own body, along with the camp and the
fleet. That is frustum culling working as designed: the calls are occluded, not off-screen.

Why `roadside.js` cannot deliver the acceptance (`rear` ≤ 610): its ten meshes are one per
material for the entire route (bounding spheres 58–143 m), and 10 calls / 11.4 k triangles is
the *minimum* for a per-material merge — chunking it by location would only raise the count
in any camera that looks along the road (every chunk between 40 and 150 m is still in the
frustum), and a distance cull tight enough to drop the junction's boards from the rear
camera (< 40 m) would remove signs the driver reads. The 46-call saving the acceptance asks
for is 4× the roadside's whole beauty cost in the view. So `src/roadside.js` is unchanged
this round, on evidence; the `rear` number is the cost of a camera that looks at the busiest
150 m of the map through the truck, and the honest levers are elsewhere:

- **fleet** (`src/vehicles/kit.js`): still merged per material across the fleet (`fleet_paint
  ×1` for every vehicle, r1 win #3 not landed) — 39 beauty + 25 G-buffer calls / 253 k
  triangles from behind the truck in `rear`. Per-vehicle merges would not help *this* view
  (the vehicles are inside the frustum) but would in every drive frame approaching the camp;
  what would help `rear` is occlusion, which three does not do.
- **truck shadow casters** (`src/vehicle/body.js`, `details.js` `UNSHADOWED`): −28 to −55
  shadow calls in *every* view including `rear`, no beauty change (r1 win #6).

Round 5's own record agrees: `rear` 605 → 656 at the re-shot level truck "takes in more
verge" — it was +51 from the framing, and the same +8 roadside were in both.

## Item 2 — the lawn's `extra` pass (B), `src/forest.js`: already one mesh per prototype, skipped

`scatter()` plants the `extra` stream (`mk: true`) into the same `perGeo[gi][bucket]` lists
as the main stream, so the lawn is exactly two `InstancedMesh`es, one per `G_LAWN`
prototype (`grass_12_b0` 174 instances, `grass_13_b0` 180 at the pride seat; the lawn's
`mats` entry pins each prototype to one bucket). The two calls B counts are two geometries
(a 7-plane clump and its `fan` sibling). Folding them into one draw means either one
geometry (both clumps under every instance — a visible change) or a `THREE.BatchedMesh`
(`batching` + `batchingColor` program flags — a new program, +1 at every tier). Both fail the
acceptance's own conditions ("same program, identical pixels"), so: not done, `forest.js`
unchanged.

## Item 3 — beam sheet sharing the slice stack's program (B), `src/sky.js`: already shared, skipped

`beamGeometry()` builds the slice stack, the glare quad and the axial sheet into **one**
`BufferGeometry` (`aGlare` 0 / 1 / 2 tells the fragment shader which it is drawing), every
beam mesh gets one `ShaderMaterial` with the same source, and three keys a `ShaderMaterial`
program on its source: measured at night, the three lamps' meshes (two headlamps, the bar)
resolve to **one** program, `headlightBeam` id 175, `usedTimes 3`, `programs.size 1` on each
material. Programs at fast: 175 by day → 176 at night, and that one is the beam. There is no
second program to fold; 175 → 174 by this route is not available. `sky.js` unchanged.

## Item 5 — budget check (`fast`, the frames' 640×360)

| target | measured | verdict | cheapest way back (no visible quality cost) |
|---|---|---|---|
| hero ≤ 490 calls | **492** (day), 539 (night, +3 beams, camp lamps) | over by 2 | the truck's four `body_mirrorGlass_N` panes cast shadows (4 shadow calls for glass smaller than a hand, inside the housing's shadow) — `mirrorGlass` into `UNSHADOWED` → 488; then r1 win #6 (brakes, gaps, trim, chrome, glass edges, decals out of the caster list: −28 to −55 more). `src/vehicle/*`, hero car r8's files |
| programs ≤ 176 at fast | 175 boot, 176 hero at night, 176 with the mirror pass by day, **178 after a full drive** (a far-cascade depth variant, the lions' skinned G-buffer normal variant, `mirrorLive`), 179 with everything at night | hero ✓, whole game over by 2–3 | strip material names from the vehicle/fleet cache keys (r1 win #7): 178 → 165 with identical GLSL; `src/textures/vehicle.js`, `src/vehicles/materials.js` |
| textures ≤ 300 at fast | 292 (hero), 313 after every view | hero ✓ | none needed; the growth is first-use uploads (fleet 9, lions 9, camp 2, mirror target 1) |
| max samplers 13 | 13 at fast / high / ultra (gate) | ✓ | — |
| `rear` ≤ 610 | 664 | over by 54 | not from `roadside.js` (8 calls in play); see item 1 |
| interior ultra (B: 780 / 4.6 M) | 654 / 3.48 M; 843 / 4.75 M on the frames the two mirror panes render | — | the pass is one pane a frame by design; halving its rate again (every fourth frame) is the only cheap cut and costs mirror latency |

## Boot stages, `fast` (ms, this box)

| stage | r1 perfrun (idle box) | r1 census (loaded) | now perfrun (load 2.3) | now census (load 4.6) | now / r1 perfrun |
|---|---|---|---|---|---|
| Compiling noise kernel | 9 | 33 | 10 | 7 | — |
| Building sky | 45 | 203 | 77 | 62 | — |
| Grading the road | 5,467 | 17,279 | 5,872 | 6,385 | +7 % |
| Planting the forest | 3,033 | 7,812 | 2,907 | 3,367 | −4 % |
| Assembling the truck | 3,991 | 7,082 | 4,653 | 5,364 | +17 % |
| Pitching camp | 1,743 | 2,664 | 2,200 | 2,396 | +26 % |
| Parking the fleet | 565 | 1,415 | 699 | 1,060 | +24 % |
| **Finding the pride** | 3,124 | 36,486 | **5,500** | **10,131** | **+76 %** |
| Posting the signs | 56 | 114 | 73 | 178 | — |
| Building the collision world | — | — | 5 | — | new |
| Compiling shaders | 24,298 (277 programs) | 42,422 | 22,164 (175) | 19,737 | −9 % |
| **time to first frame** | **43,031** | 117,533 | **44,986** | 49,537 | **+4.6 %** |

Ultra (perfrun, load 6.9): 77.7 s to first frame — road 8.3 s, forest 5.1 s, truck 5.6 s,
camp 2.7 s, fleet 2.0 s, **pride 18.1 s**, compile 25.1 s (178 programs); census (load ~5):
72.3 s, pride 13.2 s, compile 24.8 s. The total at fast is within the 10 % line against r1's
idle-box run; the pride stage is not — it has grown with every lion round (head loft, mane
locks, cards +30 %, six animals at ultra) and is now the second-largest stage after the
compile. The camp and fleet stages are +24–26 % on smaller bases (camp r5's layout and
lights, fleet r4's vehicles). Compile time fell with the program count, as r1 predicted.
Load on the box moves every stage by tens of per cent between runs (the two "now" columns
are the same build twenty minutes apart), so a stage inside ±20 % of r1 is noise here; the
pride's +76 % (+176 % under load) is not.

## Method notes and what the tools still cannot see

- The census frame for `interior` never carries the mirror pass (the pass alternates frames
  and the census's second frame is the pane's off frame); the per-frame probe above does,
  and the numbers with the pass are the ones to score the seat views by.
- `renderer.info.render.calls` (= `stats.json` `calls`) is beauty + shadow; the AO G-buffer
  and, at ultra, the SSR reflector mask are extra renders the GPU pays for (hero at fast:
  +163 G-buffer calls / 1.16 M triangles; ultra hero: +177 / 1.25 M and +32 SSR). Total
  triangles the rasteriser sees per hero frame: 3.33 M at fast, 5.04 M at ultra.
- Frame times are the software rasteriser's: `perfrun` samples 12–19 rAF frames in 30 s at
  16.6 ms p50 because the frame clock is throttled, and the p99/max (100–144 ms) are the
  frames it did time. They say nothing about a GPU and are not in the table above as
  performance.
- Not measured, still: varying-vector and uniform-vector limits on a 16-unit GPU (the gate
  counts samplers only); GPU time anywhere; texture memory as the driver actually allocates
  it (the estimate is width × height × bytes × 4/3 for mips).

---

# §A. Tool-generated census, `fast` (`tools/census.mjs --tag r2-fast-before`, verbatim)


Build `cbf506a` (2026-09-06 20:32Z), quality `fast`, 1280x720, renderer `WebKit WebGL` (WebGL 2.0 (OpenGL ES 3.0 Chromium)). Measured 2026-09-06T20:43:08.640Z from `http://127.0.0.1:5790/?quality=fast` by `tools/census.mjs`.

Every number below is measured: from a hook on `renderer.renderBufferDirect` during one rendered frame per view, from `renderer.info`, from `renderer.properties`, or from the objects themselves. The only estimates are GPU texture bytes (width x height x bytes/texel x 4/3 when mipmapped) and geometry bytes (attribute byte lengths), and they are labelled. Frame times are not reported: this machine rasterises in software.

Groups are the top-level scene children and the module that built them: `terrain`, `forest`, `vehicle` (the truck), `camp`, `fleet`, `wildlife`, `roadside`, `sky` (dome, headlamp beams, light shafts and dust motes from sky.js), `dust` (wheel dust), `post` (compositor passes), `shadow` (the renderer's own depth materials).

## A.Headline

| view | draw calls (renderer.info) | beauty calls | shadow calls | AO G-buffer calls | post calls | triangles (renderer.info) | beauty tris | instanced tris | regular tris | beauty tris inside frustum | shadow tris | AO G-buffer tris | programs (cumulative) | textures | geometries | visible objects | visible instances |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hero | 492 | 328 | 164 | 163 | 23 | 2,177,112 | 1,461,942 | 374,752 | 1,087,190 | 704,257 (48%) | 715,170 | 1,157,548 | 175 | 292 | 337 | 316 | 14,137 |
| mainroad | 628 | 410 | 218 | 213 | 23 | 2,955,518 | 1,930,624 | 473,900 | 1,456,724 | 990,905 (51%) | 1,024,894 | 1,524,970 | 176 | 301 | 346 | 398 | 19,381 |
| camp | 849 | 655 | 194 | 250 | 23 | 3,261,650 | 2,263,386 | 753,518 | 1,509,868 | 1,658,924 (73%) | 998,264 | 1,585,896 | 176 | 303 | 369 | 597 | 35,675 |
| lions | 359 | 209 | 150 | 104 | 23 | 1,837,836 | 1,251,918 | 284,042 | 967,876 | 426,452 (34%) | 585,918 | 1,044,162 | 177 | 312 | 379 | 198 | 9,475 |
| interior | 525 | 361 | 164 | 128 | 23 | 2,302,628 | 1,587,458 | 568,988 | 1,018,470 | 882,263 (56%) | 715,170 | 1,089,546 | 178 | 313 | 379 | 351 | 25,817 |

`renderer.info` counts the shadow-map pass together with the beauty pass; that is the number `debugAPI.stats()` and the perf reports quote (beauty + shadow = renderer.info in every row above). The AO G-buffer is the scene drawn a third time through `MeshNormalMaterial` as `scene.overrideMaterial`; the composer issues that render separately so it is not in `renderer.info`. The GPU therefore rasterises beauty + shadow + G-buffer triangles per frame: hero 3,334,660, mainroad 4,480,488, camp 4,847,546, lions 2,881,998, interior 3,392,174. SSR is off at this quality tier, so its reflector-mask pass does not appear.

Programs: 178 compiled, of which 0 are canvas variants (tone mapping on) that no frame uses because the scene is always drawn into the composer's render target; 178 do the work. JS heap: 413.2 MB after boot, 410.1 MB after the 5 views, reset loops 233.4 / 233.5 / 233.4 MB, 233.4 MB after a forced GC. Textures: 289 objects, est. 311.29 MB. Geometries: 397, est. 148.47 MB.

Note that `hero` and `forest` draw exactly the same set of objects from different cameras: culling in this scene is by whole-object bounding sphere, and nearly every object (terrain, route-long stone mesh, forest-wide instanced meshes, the truck) is large enough to intersect any frustum near the truck. What changes between views is only which camp/fleet/wildlife objects fall inside.

## A.1. Shader programs

178 compiled programs after all views (175 straight after boot). 143 are used by exactly one material, 12 by two, 13 by three or more, 10 could not be linked to any material this census could reach (the renderer's own shadow depth materials, PMREM scratch; their `type` says what they are).

### A.Canvas variants: the boot-time double compile

Three keys a program on `toneMapping` and `outputColorSpace`, which it takes from the *currently bound render target* at compile time: no target bound means the canvas (ACES, sRGB); the composer's target means (none, linear). `main.js` calls `renderer.compile(scene, camera)` with no target bound and then `post.render()`, which draws into the composer's target — so 0 programs are compiled for the canvas, never used by a frame (`currentProgram` for 0 materials), and kept alive in each material's program map; then the same materials compile again for the target. 15 of 212 scene materials carry exactly two programs for this reason. The fix is one line in `main.js` (bind the composer's read buffer before `renderer.compile`, or drop the `compile` and let the warm-up `render` do it) and halves the "Compiling shaders" stage.

| group | programs | canvas variants (unused) | render-target programs | never current | would remain with material names out of cache keys |
| --- | --- | --- | --- | --- | --- |
| terrain | 7 | 0 | 7 | 1 | 7 |
| forest | 7 | 0 | 7 | 1 | 7 |
| vehicle | 66 | 0 | 66 | 5 | 58 |
| camp | 21 | 0 | 21 | 1 | 21 |
| fleet | 30 | 0 | 30 | 3 | 25 |
| wildlife | 8 | 0 | 8 | 1 | 8 |
| roadside | 2 | 0 | 2 | 0 | 2 |
| sky | 5 | 0 | 5 | 0 | 5 |
| dust | 1 | 0 | 1 | 0 | 1 |
| post | 22 | 0 | 22 | 3 | 22 |
| shadow | 7 | 0 | 7 | 7 | 7 |
| other:groundContact | 1 | 0 | 1 | 0 | 1 |
| unattributed | 3 | 0 | 3 | 3 | 3 |

The last column applies one rule to the 178 working programs: take the material *name* out of every `tag:name:...` segment of `customProgramCacheKey` (the vehicle family's `bw:`, `dirt:`, `cb:`, `cl:`, `gf:`, the fleet's `fleetDirt:`/`sway:`, the tyres' `loadedTyre_name_`) and keep everything else — the numbers those patches bake into GLSL, the map set, the flags. Programs whose keys then agree compile identical GLSL and would be one program: 178 → 165.

Groups of programs that differ only by the material name in the key:

| # | type | programs | groups | materials (names) | shared key after stripping |
| --- | --- | --- | --- | --- | --- |
| 1 | MeshStandardMaterial | 6 | fleet | fleet_tyre, fleet_tread, fleet_rust, fleet_fabric, fleet_vinyl, fleet_vinylFaded | `function(e,t){f&&f.call(this,e,t),Object.assign(e.uniforms,d),e.vertex` |
| 2 | MeshPhysicalMaterial | 3 | vehicle | paint, paintDark, paintAccent | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw::0:full:0:true:true:true\|` |
| 3 | MeshStandardMaterial | 3 | vehicle | amber, taillight, reverseLamp | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|lamp:` |
| 4 | MeshStandardMaterial | 2 | vehicle | alu, chrome | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|dirt::1:false:0\|bw::0:false:` |
| 5 | MeshStandardMaterial | 2 | vehicle | decalNumber, decalName | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|dirt::1:false:0` |
| 6 | MeshStandardMaterial | 2 | vehicle | interiorPlastic, interiorFaded | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|dirt::0:false:0\|cb::0\|cl::0:` |
| 7 | MeshStandardMaterial | 2 | vehicle | brakeRotor, caliper | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw::0.5:false:0:false:false:` |

### A.Programs per group

A program shared by materials in two groups is counted in both; `exclusive` is the number only that group uses.

| group | programs | exclusive | material links | by material type |
| --- | --- | --- | --- | --- |
| terrain | 7 | 7 | 7 | MeshStandardMaterial 3, ShaderMaterial 2, MeshLambertMaterial 2 |
| forest | 7 | 7 | 23 | MeshStandardMaterial 4, MeshLambertMaterial 3 |
| vehicle | 66 | 65 | 72 | MeshStandardMaterial 48, MeshPhysicalMaterial 13, MeshBasicMaterial 4, ShaderMaterial 1 |
| camp | 21 | 20 | 53 | MeshStandardMaterial 15, ShaderMaterial 4, MeshPhysicalMaterial 2 |
| fleet | 30 | 29 | 39 | MeshStandardMaterial 21, MeshPhysicalMaterial 8, ShaderMaterial 1 |
| wildlife | 8 | 7 | 14 | MeshStandardMaterial 4, MeshPhysicalMaterial 2, MeshBasicMaterial 2 |
| roadside | 2 | 2 | 10 | MeshStandardMaterial 2 |
| sky | 5 | 5 | 12 | ShaderMaterial 5 |
| dust | 1 | 1 | 1 | ShaderMaterial 1 |
| post | 22 | 22 | 22 | ShaderMaterial 17, MeshNormalMaterial 4, RawShaderMaterial 1 |
| shadow | 7 | 7 | 0 | MeshDepthMaterial 7 |
| other:groundContact | 1 | 1 | 1 | ShaderMaterial 1 |
| unattributed | 3 | 3 | 0 | MeshBasicMaterial 2, ShaderMaterial 1 |

### A.Programs by shader and material type

| material type / shader | programs | canvas variants | materials | groups |
| --- | --- | --- | --- | --- |
| MeshStandardMaterial / physical | 96 | 0 | 159 | terrain, forest, vehicle, wildlife, camp, fleet, roadside |
| MeshPhysicalMaterial / physical | 24 | 0 | 30 | vehicle, camp, fleet, wildlife |
| MeshBasicMaterial / basic | 8 | 0 | 6 | vehicle, wildlife |
| MeshDepthMaterial / depth | 7 | 0 | 0 | - |
| MeshLambertMaterial / lambert | 5 | 0 | 9 | terrain, forest |
| ShaderMaterial / custom(36,37) | 5 | 0 | 5 | post |
| MeshNormalMaterial / normal | 4 | 0 | 4 | post |
| ShaderMaterial / custom(28,29) | 2 | 0 | 2 | post |
| ShaderMaterial / custom(0,1) | 1 | 0 | 1 | sky |
| ShaderMaterial / 2 | 1 | 0 | 0 | - |
| ShaderMaterial / custom(0,4) | 1 | 0 | 1 | sky |
| ShaderMaterial / custom(2,3) | 1 | 0 | 1 | sky |
| ShaderMaterial / custom(5,6) | 1 | 0 | 1 | terrain |
| ShaderMaterial / custom(7,8) | 1 | 0 | 1 | terrain |
| ShaderMaterial / custom(9,10) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(11,12) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(13,14) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(15,16) | 1 | 0 | 1 | camp |
| ShaderMaterial / custom(17,18) | 1 | 0 | 1 | fleet |
| ShaderMaterial / custom(19,20) | 1 | 0 | 8 | sky |
| ShaderMaterial / custom(21,22) | 1 | 0 | 1 | sky |
| ShaderMaterial / custom(23,24) | 1 | 0 | 1 | dust |
| ShaderMaterial / custom(25,26) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(25,27) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(30,31) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(32,33) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(34,35) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(36,38) | 1 | 0 | 1 | post |
| RawShaderMaterial / custom(39,40) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(32,41) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(42,43) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(44,45) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(46,47) | 1 | 0 | 1 | post |
| ShaderMaterial / custom(48,49) | 1 | 0 | 1 | other:groundContact |
| ShaderMaterial / custom(50,51) | 1 | 0 | 1 | vehicle |

### A.Top 20 most-duplicated variants (working programs only)

Programs are clustered by material type plus their `customProgramCacheKey` with every number and uuid blanked out, so programs whose *only* difference is an id inside the key land together, and so do programs with identical `onBeforeCompile` source that differ in a define. `custom keys` is how many distinct custom keys the cluster has (more than one with one head = an id in the key is forking the program: avoidable, that is a uniform), `heads` how many distinct built-in parameter sets (a real define difference; the differing fields are named). `#` in a preview is a blanked number.

| # | type | programs | materials | groups | custom keys | heads | differing params | differing flags | defines | key preview / names |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ShaderMaterial (custom(0,1)) | 32 | 39 | sky,terrain,camp,fleet,dust,post,other:groundContact,vehicle | 1 | 32 | outputColorSpace toneMapping fogExp2 numDirLights numPointLights numSpotLights numHemiLights numDirLightShadows precision envMapMode envMapCubeUVHeight mapUv alphaMapUv lightMapUv aoMapUv bumpMapUv normalMapUv displacementMapUv emissiveMapUv metalnessMapUv roughnessMapUv anisotropyMapUv clearcoatMapUv clearcoatNormalMapUv clearcoatRoughnessMapUv iridescenceMapUv iridescenceThicknessMapUv sheenColorMapUv sheenRoughnessMapUv specularMapUv specularColorMapUv specularIntensityMapUv transmissionMapUv thicknessMapUv combine sizeAttenuation morphTargetsCount morphAttributeCount numSpotLightMaps numRectAreaLights numPointLightShadows numSpotLightShadows numSpotLightShadowsWithMaps numLightProbes shadowMapType numClippingPlanes numClipIntersection depthPacking rendererColorSpace | hasPositionAttribute vertexNormals fog shadowMapEnabled flipSided opaque premultipliedAlpha useFog doubleSided | GGX_SAMPLES CUBEUV_TEXEL_WIDTH CUBEUV_TEXEL_HEIGHT CUBEUV_MAX_MIP PERSPECTIVE_CAMERA SAMPLES NORMAL_VECTOR_TYPE DEPTH_SWIZZLING SCREEN_SPACE_RADIUS SCREEN_SPACE_RADIUS_SCALE SCENE_CLIP_BOX SAMPLE_VECTORS  0 vec3(6.123233995736766e-17  0.14285714285714285) KERNEL_RADIUS NUM_MIPS SMAA_THRESHOLD SMAA_MAX_SEARCH_STEPS SMAA_AREATEX_MAX_DISTANCE SMAA_AREATEX_PIXEL_SIZE  560.0 ) ) | `onBeforeCompile(){}` — EquirectangularToCubeUV, PMREMGGXConvolution, ProceduralSky, fleet_pool, sunShaft, SanitizeShader |
| 2 | MeshStandardMaterial (physical) | 27 | 71 | terrain,forest,vehicle,wildlife,camp,fleet,roadside | 1 | 27 | mapUv aoMapUv normalMapUv roughnessMapUv metalnessMapUv emissiveMapUv | vertexColors dithering instancing instancingColor normalMapTangentSpace alphaTest doubleSided opaque skinning | - | `onBeforeCompile(){}` — decalBadge, reflectorRed, rimMachined, wheelVoid, rock, galv |
| 3 | MeshStandardMaterial (physical) | 13 | 14 | fleet | 13 | 4 | mapUv normalMapUv roughnessMapUv | normalMapTangentSpace alphaTest doubleSided | - | `function(e,t){f&&f.call(this,e,t),Object.assign(e.uniforms,d` — fleet_tyre, fleet_tread, fleet_gap, fleet_steel, fleet_rust, fleet_trim |
| 4 | MeshBasicMaterial (basic) | 6 | 6 | vehicle,wildlife | 1 | 6 | envMapMode envMapCubeUVHeight | opaque vertexNormals vertexColors vertexAlphas flipSided envMap | - | `onBeforeCompile(){}` — lion-contact |
| 5 | MeshNormalMaterial (normal) | 4 | 4 | post | 1 | 4 | - | instancing instancingColor skinning | - | `onBeforeCompile(){}` |
| 6 | MeshPhysicalMaterial (physical) | 3 | 4 | camp,fleet,wildlife | 1 | 3 | - | flipSided clearcoat skinning | - | `onBeforeCompile(){}` — glass, lion-cornea |
| 7 | MeshLambertMaterial (lambert) | 2 | 6 | forest | 1 | 2 | - | flipSided | - | `treeline-r4` |
| 8 | MeshPhysicalMaterial (physical) | 2 | 2 | vehicle | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:glass:0:false:0` — glass |
| 9 | MeshPhysicalMaterial (physical) | 2 | 2 | vehicle | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:glassDark:0:fal` — glassDark |
| 10 | MeshPhysicalMaterial (physical) | 2 | 2 | vehicle | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:glassSide:0:fal` — glassSide |
| 11 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:fleet_glassCrac` — fleet_glassCracked |
| 12 | MeshPhysicalMaterial (physical) | 2 | 4 | fleet | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:fleet_glass:0:t` — fleet_glassDusty |
| 13 | MeshPhysicalMaterial (physical) | 2 | 2 | fleet | 1 | 2 | - | flipSided | - | `function(e,t){r&&r.call(this,e,t),n(e,t)}\|bw:fleet_glassDark` — fleet_glassDark |
| 14 | MeshStandardMaterial (physical) | 2 | 2 | fleet | 2 | 2 | - | doubleSided | - | `function(e,t){i&&i.call(this,e,t),Object.assign(e.uniforms,r` — fleet_whip, fleet_canvas |

Reading the columns: three builds a program cache key from (a) the built-in shader id, (b) `material.defines`, (c) ~50 parameters (which maps are present and their UV channel, light counts, tone mapping, fog...), (d) two bitmasks of booleans (instancing, vertexColors, alphaTest, doubleSided, flipSided, skinning, `opaque` i.e. `!transparent`, dithering, premultipliedAlpha...), (e) `customProgramCacheKey()`, which defaults to `onBeforeCompile.toString()`. Any difference in (a)-(e) is a separate compile. A different *uniform value* never is — so when two programs in a cluster differ only in (e) and the difference is a name or a number that is only ever read through a uniform, the material author has put a per-instance value into the key and is paying one compile per material for it. When they differ in (c)/(d) the fix is to make the materials agree: same set of maps (a shared 1x1 white/flat texture keeps the define on), same `side`, same `transparent`, same `vertexColors`. `flipSided` pairs on the glass materials are legitimate: a pane drawn back-face-first then front needs both.

### A.Every program

| id | type | shader | name | materials | groups | canvas variant | flags | maps | lights | custom key | key len |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 93 | MeshPhysicalMaterial | physical | glass | 1 | camp |  | clearcoat flipSided transparent | - | d3 p8 s6 h1 ds2 | default | 281 |
| 94 | MeshPhysicalMaterial | physical | glass | 2 | camp,fleet |  | clearcoat transparent | - | d3 p8 s6 h1 ds2 | default | 281 |
| 85 | MeshStandardMaterial | physical | alu | 1 | camp |  | - | normal roughness | d3 p8 s6 h1 ds2 | default | 265 |
| 92 | MeshStandardMaterial | physical | ash | 2 | camp |  | - | mapUv normal emissive roughness | d3 p8 s6 h1 ds2 | default | 259 |
| 101 | MeshStandardMaterial | physical | bulb | 1 | camp |  | instancing | - | d3 p8 s6 h1 ds2 | default | 271 |
| 102 | MeshStandardMaterial | physical | campFlag | 1 | camp |  | doubleSided | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 95 | MeshStandardMaterial | physical | campWear | 1 | camp |  |  transparent | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 84 | MeshStandardMaterial | physical | chairCloth | 7 | camp |  | doubleSided | mapUv normal roughness | d3 p8 s6 h1 ds2 | `function rE(e){e.uniforms.uTransmit={value:nE},e.uniforms.uS` | 2,521 |
| 83 | MeshStandardMaterial | physical | galv | 1 | camp |  | doubleSided | mapUv normal metalness roughness | d3 p8 s6 h1 ds2 | default | 259 |
| 96 | MeshStandardMaterial | physical | grass | 1 | camp |  | instancing alphaTest doubleSided | mapUv emissive | d3 p8 s6 h1 ds2 | default | 265 |
| 88 | MeshStandardMaterial | physical | lampGlass | 1 | camp |  |  transparent | - | d3 p8 s6 h1 ds2 | default | 271 |
| 82 | MeshStandardMaterial | physical | rock | 17 | camp |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | default | 262 |
| 91 | MeshStandardMaterial | physical | rope | 1 | camp |  | - | mapUv normal | d3 p8 s6 h1 ds2 | default | 265 |
| 89 | MeshStandardMaterial | physical | signOffice | 8 | camp |  | - | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 87 | MeshStandardMaterial | physical | steel | 1 | camp |  | - | mapUv normal metalness roughness | d3 p8 s6 h1 ds2 | default | 259 |
| 90 | MeshStandardMaterial | physical | steelWhite | 1 | camp |  | doubleSided | mapUv normal roughness | d3 p8 s6 h1 ds2 | default | 262 |
| 86 | MeshStandardMaterial | physical | wire | 2 | camp |  | - | - | d3 p8 s6 h1 ds2 | default | 271 |
| 97 | ShaderMaterial | custom(9,10) |  | 1 | camp |  |  transparent | - | d3 p8 s6 h1 ds2 | default | 249 |
| 98 | ShaderMaterial | custom(11,12) |  | 1 | camp |  | premultipliedAlpha transparent | - | d3 p8 s6 h1 ds2 | default | 250 |
| 99 | ShaderMaterial | custom(13,14) |  | 1 | camp |  |  transparent | - | d3 p8 s6 h1 ds2 | default | 250 |
| 100 | ShaderMaterial | custom(15,16) |  | 1 | camp |  |  transparent | - | d3 p8 s6 h1 ds2 | default | 256 |
| 143 | ShaderMaterial | custom(23,24) |  | 1 | dust |  | doubleSided transparent | - | d3 p8 s6 h1 ds2 | default | 250 |
| 103 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet |  | clearcoat flipSided transparent | mapUv emissive roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleet_glassCracked:0:true:1.2:false:false:fals` | 374 |
| 104 | MeshPhysicalMaterial | physical | fleet_glassCracked | 1 | fleet |  | clearcoat transparent | mapUv emissive roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleet_glassCracked:0:true:1.2:false:false:fals` | 374 |
| 107 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet |  | clearcoat flipSided transparent | mapUv | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleet_glassDark:0:true:1.1:false:false:false\|g` | 372 |
| 108 | MeshPhysicalMaterial | physical | fleet_glassDark | 1 | fleet |  | clearcoat transparent | mapUv | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleet_glassDark:0:true:1.1:false:false:false\|g` | 372 |
| 105 | MeshPhysicalMaterial | physical | fleet_glassDusty | 2 | fleet |  | clearcoat flipSided transparent | mapUv roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleet_glass:0:true:1.2:false:false:false\|gf:fl` | 363 |
| 106 | MeshPhysicalMaterial | physical | fleet_glassDusty | 2 | fleet |  | clearcoat transparent | mapUv roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleet_glass:0:true:1.2:false:false:false\|gf:fl` | 363 |
| 112 | MeshPhysicalMaterial | physical | fleet_paint | 1 | fleet |  | clearcoat vertexColors | mapUv roughness clearcoatNormal | d3 p8 s6 h1 ds2 | `function(e,n){t&&t.call(this,e,n),e.vertexShader=e.vertexSha` | 1,561 |
| 125 | MeshStandardMaterial | physical | fleet_alu | 1 | fleet |  | vertexColors | normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,707 |
| 120 | MeshStandardMaterial | physical | fleet_amberOn | 5 | fleet |  | vertexColors | normal | d3 p8 s6 h1 ds2 | default | 268 |
| 128 | MeshStandardMaterial | physical | fleet_canvas | 1 | fleet |  | vertexColors doubleSided | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader` | 903 |
| 114 | MeshStandardMaterial | physical | fleet_chrome | 1 | fleet |  | vertexColors | normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleetChrome:0:false:0:false:true:false` | 329 |
| 126 | MeshStandardMaterial | physical | fleet_decal | 1 | fleet |  | alphaTest vertexColors doubleSided | mapUv | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,673 |
| 121 | MeshStandardMaterial | physical | fleet_fabric | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,668 |
| 113 | MeshStandardMaterial | physical | fleet_gap | 1 | fleet |  | vertexColors | - | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,716 |
| 119 | MeshStandardMaterial | physical | fleet_headOff | 2 | fleet |  | vertexColors | - | d3 p8 s6 h1 ds2 | default | 271 |
| 130 | MeshStandardMaterial | physical | fleet_lampWarmOn | 1 | fleet |  | vertexColors | - | d3 p8 s6 h1 ds2 | `fleetWarmTint` | 265 |
| 131 | MeshStandardMaterial | physical | fleet_mesh | 1 | fleet |  | alphaTest vertexColors doubleSided | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 124 | MeshStandardMaterial | physical | fleet_plate | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,707 |
| 118 | MeshStandardMaterial | physical | fleet_reflector | 1 | fleet |  | vertexColors doubleSided | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:fleetRefl:0:false:0:false:false:false` | 325 |
| 116 | MeshStandardMaterial | physical | fleet_rust | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,666 |
| 115 | MeshStandardMaterial | physical | fleet_steel | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,710 |
| 111 | MeshStandardMaterial | physical | fleet_tread | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,667 |
| 117 | MeshStandardMaterial | physical | fleet_trim | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,707 |
| 129 | MeshStandardMaterial | physical | fleet_trimGloss | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,718 |
| 110 | MeshStandardMaterial | physical | fleet_tyre | 2 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,668 |
| 122 | MeshStandardMaterial | physical | fleet_vinyl | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,667 |
| 123 | MeshStandardMaterial | physical | fleet_vinylFaded | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,d),e.vertexShader=e.vertexShader` | 7,672 |
| 127 | MeshStandardMaterial | physical | fleet_whip | 1 | fleet |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{Object.assign(e.uniforms,r),e.vertexShader=e.vertexShader` | 884 |
| 109 | ShaderMaterial | custom(17,18) | fleet_pool | 1 | fleet |  | doubleSided transparent | - | d3 p8 s6 h1 ds2 | default | 256 |
| 16 | MeshLambertMaterial | lambert |  | 1 | forest |  | - | mapUv | d3 p8 s6 h1 ds2 | `forest-skirt-r4` | 254 |
| 17 | MeshLambertMaterial | lambert |  | 3 | forest |  | alphaTest flipSided transparent | mapUv | d3 p8 s6 h1 ds2 | `treeline-r4` | 250 |
| 18 | MeshLambertMaterial | lambert |  | 3 | forest |  | alphaTest transparent | mapUv | d3 p8 s6 h1 ds2 | `treeline-r4` | 250 |
| 12 | MeshStandardMaterial | physical |  | 4 | forest |  | instancing instancingColor | mapUv ao normal roughness | d3 p8 s6 h1 ds2 | `wind\|bark-standing-v1` | 261 |
| 13 | MeshStandardMaterial | physical |  | 8 | forest |  | instancing instancingColor alphaTest doubleSided | mapUv | d3 p8 s6 h1 ds2 | `wind\|foliage-v6` | 264 |
| 14 | MeshStandardMaterial | physical |  | 2 | forest |  | instancing instancingColor | mapUv ao normal roughness | d3 p8 s6 h1 ds2 | default | 259 |
| 15 | MeshStandardMaterial | physical |  | 2 | forest |  | instancing instancingColor | mapUv ao normal roughness | d3 p8 s6 h1 ds2 | `wind\|bark-deadfall-v1` | 261 |
| 173 | ShaderMaterial | custom(48,49) | groundContact | 1 | other:groundContact |  | premultipliedAlpha doubleSided transparent | - | d3 p8 s6 h1 ds2 | default | 250 |
| 148 | MeshNormalMaterial | normal |  | 1 | post |  |  transparent | - | d3 p8 s6 h1 ds2 | default | 257 |
| 149 | MeshNormalMaterial | normal |  | 1 | post |  | instancing instancingColor transparent | - | d3 p8 s6 h1 ds2 | default | 257 |
| 150 | MeshNormalMaterial | normal |  | 1 | post |  | instancing transparent | - | d3 p8 s6 h1 ds2 | default | 257 |
| 176 | MeshNormalMaterial | normal |  | 1 | post |  | skinning transparent | - | d3 p8 s6 h1 ds2 | default | 257 |
| 164 | RawShaderMaterial | custom(39,40) | OutputShader | 1 | post |  | - | - | - | default | 66 |
| 151 | ShaderMaterial | custom(25,26) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 390 |
| 152 | ShaderMaterial | custom(25,27) |  | 1 | post |  | - | - | - | default | 718 |
| 153 | ShaderMaterial | custom(28,29) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 251 |
| 154 | ShaderMaterial | custom(30,31) |  | 1 | post |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 251 |
| 156 | ShaderMaterial | custom(34,35) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 251 |
| 157 | ShaderMaterial | custom(36,37) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 267 |
| 158 | ShaderMaterial | custom(36,37) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 159 | ShaderMaterial | custom(36,37) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 160 | ShaderMaterial | custom(36,37) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 161 | ShaderMaterial | custom(36,37) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 268 |
| 162 | ShaderMaterial | custom(36,38) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 262 |
| 163 | ShaderMaterial | custom(28,29) |  | 1 | post |  | premultipliedAlpha transparent | - | d0 p0 s0 h0 ds0 | default | 251 |
| 166 | ShaderMaterial | custom(42,43) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 270 |
| 167 | ShaderMaterial | custom(44,45) |  | 1 | post |  | - | - | - | default | 398 |
| 168 | ShaderMaterial | custom(46,47) |  | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 244 |
| 165 | ShaderMaterial | custom(32,41) | GradeShader | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 251 |
| 155 | ShaderMaterial | custom(32,33) | SanitizeShader | 1 | post |  | - | - | d0 p0 s0 h0 ds0 | default | 251 |
| 139 | MeshStandardMaterial | physical |  | 4 | roadside |  | dithering | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 140 | MeshStandardMaterial | physical |  | 6 | roadside |  | dithering | - | d3 p8 s6 h1 ds2 | default | 271 |
| 142 | ShaderMaterial | custom(21,22) |  | 1 | sky |  |  transparent | - | d3 p8 s6 h1 ds2 | default | 250 |
| 0 | ShaderMaterial | custom(0,1) | EquirectangularToCubeUV | 1 | sky |  | - | - | d0 p0 s0 h0 ds0 | default | 236 |
| 4 | ShaderMaterial | custom(0,4) | PMREMGGXConvolution | 1 | sky |  |  transparent | - | d0 p0 s0 h0 ds0 | default | 358 |
| 5 | ShaderMaterial | custom(2,3) | ProceduralSky | 1 | sky |  | flipSided | - | d3 p8 s6 h1 ds2 | default | 254 |
| 141 | ShaderMaterial | custom(19,20) | sunShaft | 8 | sky |  | doubleSided transparent | - | d3 p8 s6 h1 ds2 | default | 256 |
| 10 | MeshLambertMaterial | lambert |  | 1 | terrain |  | dithering | mapUv | d3 p8 s6 h1 ds2 | `e=>{Object.assign(e.uniforms,l),e.vertexShader=e.vertexShade` | 4,936 |
| 11 | MeshLambertMaterial | lambert |  | 1 | terrain |  | dithering | - | d3 p8 s6 h1 ds2 | `e=>{e.uniforms.uHillDebug=l.uHillDebug,e.uniforms.uHillSky=l` | 1,391 |
| 6 | MeshStandardMaterial | physical |  | 1 | terrain |  | - | - | - | - | 263 |
| 7 | MeshStandardMaterial | physical |  | 1 | terrain |  | vertexColors dithering | - | d3 p8 s6 h1 ds2 | default | 271 |
| 171 | MeshStandardMaterial | physical |  | 1 | terrain |  | dithering | mapUv normal | d3 p8 s6 h1 ds2 | `terrain-relief-v1\|tod` | 267 |
| 8 | ShaderMaterial | custom(5,6) |  | 1 | terrain |  | premultipliedAlpha transparent | - | d3 p8 s6 h1 ds2 | default | 248 |
| 9 | ShaderMaterial | custom(7,8) |  | 1 | terrain |  |  transparent | - | d3 p8 s6 h1 ds2 | default | 248 |
| 71 | MeshBasicMaterial | basic |  | 1 | vehicle |  | - | mapUv | d3 p8 s6 h1 ds2 | default | 254 |
| 72 | MeshBasicMaterial | basic |  | 1 | vehicle |  |  transparent | mapUv | d3 p8 s6 h1 ds2 | default | 254 |
| 172 | MeshBasicMaterial | basic |  | 1 | vehicle |  | - | mapUv | d3 p8 s6 h1 ds2 | default | 256 |
| 174 | MeshBasicMaterial | basic |  | 1 | vehicle |  |  transparent | mapUv | d3 p8 s6 h1 ds2 | default | 256 |
| 53 | MeshPhysicalMaterial | physical | barCover | 1 | vehicle |  | clearcoat premultipliedAlpha transparent | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|lensClose:barCover\|lamp:barCover` | 333 |
| 66 | MeshPhysicalMaterial | physical | cabinGlass | 1 | vehicle |  | clearcoat transparent | - | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:cabinGlass:0.5:true:0.8:false:false:false\|cl:c` | 374 |
| 39 | MeshPhysicalMaterial | physical | glass | 1 | vehicle |  | premultipliedAlpha flipSided transparent | mapUv roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:glass:0:false:0.7:false:false:false\|gf:glass:s` | 352 |
| 40 | MeshPhysicalMaterial | physical | glass | 1 | vehicle |  | premultipliedAlpha transparent | mapUv roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:glass:0:false:0.7:false:false:false\|gf:glass:s` | 352 |
| 43 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle |  | premultipliedAlpha flipSided transparent | mapUv | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:glassDark:0:false:0.7:false:false:false\|gf:gla` | 361 |
| 44 | MeshPhysicalMaterial | physical | glassDark | 1 | vehicle |  | premultipliedAlpha transparent | mapUv | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:glassDark:0:false:0.7:false:false:false\|gf:gla` | 361 |
| 46 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle |  | premultipliedAlpha flipSided transparent | mapUv roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:glassSide:0:false:0.7:false:false:false\|gf:gla` | 358 |
| 47 | MeshPhysicalMaterial | physical | glassSide | 1 | vehicle |  | premultipliedAlpha transparent | mapUv roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:glassSide:0:false:0.7:false:false:false\|gf:gla` | 358 |
| 37 | MeshPhysicalMaterial | physical | lensClear | 1 | vehicle |  | clearcoat premultipliedAlpha transparent | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|lamp:lensClear\|lensClose:lensClear` | 335 |
| 27 | MeshPhysicalMaterial | physical | paint | 1 | vehicle |  | clearcoat | mapUv roughness clearcoatNormal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:paint1921860:0:full:0:true:true:true\|dirt:pain` | 361 |
| 38 | MeshPhysicalMaterial | physical | paintAccent | 1 | vehicle |  | clearcoat | mapUv roughness clearcoatNormal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:paintaccent:0:full:0:true:true:true\|dirt:paint` | 359 |
| 28 | MeshPhysicalMaterial | physical | paintDark | 1 | vehicle |  | clearcoat | mapUv roughness clearcoatNormal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:paintdark:0:full:0:true:true:true\|dirt:paintda` | 355 |
| 49 | MeshPhysicalMaterial | physical | paintRoof | 1 | vehicle |  | clearcoat | mapUv roughness clearcoatNormal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:paintroof:0:full:0:true:true:true\|dirt:paintro` | 356 |
| 62 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cl:consoleAbs:1:0.86:1.42` | 316 |
| 63 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cl:rubber:1:0.86:1.42` | 306 |
| 64 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cl:paper:0:0.86:1.42` | 311 |
| 69 | MeshStandardMaterial | physical |  | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cl:cardWoven:0:0.86:1.42` | 309 |
| 73 | MeshStandardMaterial | physical |  | 1 | vehicle |  | vertexColors | - | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|ndlemi` | 300 |
| 21 | MeshStandardMaterial | physical | alu | 1 | vehicle |  | - | normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:alu:1:false:0\|bw:alu:0:false:0:false:true:fa` | 359 |
| 33 | MeshStandardMaterial | physical | amber | 1 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|lamp:amber` | 301 |
| 50 | MeshStandardMaterial | physical | bedLiner | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:liner:0.45:false:0\|bw:liner:0.5:false:0:fals` | 346 |
| 80 | MeshStandardMaterial | physical | brakeRotor | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:brakeRotor:0.5:false:0:false:false:true` | 327 |
| 56 | MeshStandardMaterial | physical | cabinPanel | 1 | vehicle |  | - | mapUv normal emissive roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cb:cabinPanel:0\|cl:cabinPanel:0:0.86:1.42` | 323 |
| 81 | MeshStandardMaterial | physical | caliper | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:caliper:0.5:false:0:false:false:true` | 324 |
| 52 | MeshStandardMaterial | physical | canvasKhaki | 1 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:canvasKhaki:0:false:0\|bw:canvasKhaki:0.5:fal` | 360 |
| 74 | MeshStandardMaterial | physical | castIron | 1 | vehicle |  | vertexColors | mapUv normal metalness roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:castIron:0.5:false:0:false:false:true` | 322 |
| 29 | MeshStandardMaterial | physical | chrome | 1 | vehicle |  | - | normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:chrome:1:false:0\|bw:chrome:0:false:0:false:t` | 368 |
| 32 | MeshStandardMaterial | physical | decalBadge | 4 | vehicle,wildlife |  | alphaTest doubleSided | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 31 | MeshStandardMaterial | physical | decalName | 1 | vehicle |  | alphaTest doubleSided | mapUv | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:decalName:1:false:0` | 315 |
| 30 | MeshStandardMaterial | physical | decalNumber | 1 | vehicle |  | alphaTest doubleSided | mapUv | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:decalNumber:1:false:0` | 317 |
| 65 | MeshStandardMaterial | physical | fabric | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:seat:0:false:0\|cb:fabric:0\|cl:fabric:0:0.56:` | 337 |
| 58 | MeshStandardMaterial | physical | floorMat | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:floor:0:false:0\|cb:floorMat:0\|cl:floorMat:0:` | 342 |
| 55 | MeshStandardMaterial | physical | fridgeCase | 1 | vehicle |  | - | normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:fridgeCase:0:false:0\|bw:fridgeCase:0.35:fals` | 356 |
| 23 | MeshStandardMaterial | physical | gap | 1 | vehicle |  | - | - | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:gap:1:false:1\|bw:gap:0.55:false:0:false:fals` | 377 |
| 42 | MeshStandardMaterial | physical | gasket | 1 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:gasket:0.5:false:0:false:false:true\|cb:gasket:` | 341 |
| 41 | MeshStandardMaterial | physical | glassEdge | 1 | vehicle |  | - | - | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:glassEdge:0.3:false:0:false:false:false` | 336 |
| 36 | MeshStandardMaterial | physical | headlight | 1 | vehicle |  | - | - | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|lamp:headlight` | 308 |
| 70 | MeshStandardMaterial | physical | headliner | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cb:headliner:0\|cl:headliner:0:0.86:1.42` | 324 |
| 59 | MeshStandardMaterial | physical | interiorFaded | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:cabinTop:0:false:0\|cb:interiorFaded:0\|cl:int` | 356 |
| 57 | MeshStandardMaterial | physical | interiorPlastic | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:cabin:0:false:0\|cb:interiorPlastic:0\|cl:inte` | 357 |
| 61 | MeshStandardMaterial | physical | louvre | 1 | vehicle |  | alphaTest doubleSided | mapUv | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cb:louvre:0.3\|cl:louvre:1:0.86:1.42` | 326 |
| 48 | MeshStandardMaterial | physical | mirrorGlass | 1 | vehicle |  | - | - | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|mh:mirrorGlass:1` | 310 |
| 77 | MeshStandardMaterial | physical | mudCake | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `loadedTyre_mudCake` | 261 |
| 26 | MeshStandardMaterial | physical | plate | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:plate:1:false:0\|bw:plate:0:false:0:false:tru` | 340 |
| 35 | MeshStandardMaterial | physical | reflector | 2 | vehicle |  | doubleSided | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:refl:0:false:0:false:false:false\|lamp:reflecto` | 335 |
| 34 | MeshStandardMaterial | physical | reflectorRed | 2 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | default | 268 |
| 51 | MeshStandardMaterial | physical | reverseLamp | 1 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|lamp:reverseLamp` | 307 |
| 75 | MeshStandardMaterial | physical | rimMachined | 2 | vehicle |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | default | 262 |
| 25 | MeshStandardMaterial | physical | rubber | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:rubber:1:false:0\|bw:rubber:0.6:false:0:false` | 345 |
| 22 | MeshStandardMaterial | physical | steel | 1 | vehicle |  | - | mapUv normal metalness roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:steel:1:false:0\|bw:steel:0:false:0:false:tru` | 337 |
| 19 | MeshStandardMaterial | physical | steelDark | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:steelDark:1:false:1\|bw:steelDark:0.25:false:` | 393 |
| 60 | MeshStandardMaterial | physical | stitch | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|cb:stitch:0\|cl:stitch:0:0.56:1.2` | 317 |
| 45 | MeshStandardMaterial | physical | taillight | 1 | vehicle |  | - | normal | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|lamp:taillight` | 305 |
| 54 | MeshStandardMaterial | physical | tread | 1 | vehicle |  | - | mapUv ao normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:tread:1:false:0` | 302 |
| 20 | MeshStandardMaterial | physical | trim | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:trim:1:false:1\|bw:trim:0.4:false:0:false:tru` | 370 |
| 24 | MeshStandardMaterial | physical | trimGloss | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|dirt:trimGloss:1:false:1\|bw:trimGloss:0.45:false:` | 394 |
| 79 | MeshStandardMaterial | physical | tyreCarcass | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `loadedTyre_tyreCarcass` | 265 |
| 76 | MeshStandardMaterial | physical | tyreLug | 1 | vehicle |  | vertexColors | mapUv normal roughness | d3 p8 s6 h1 ds2 | `loadedTyre_tyreLug` | 261 |
| 68 | MeshStandardMaterial | physical | wheelRim | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:rimMould:0.45:false:0:false:false:false\|cb:whe` | 365 |
| 78 | MeshStandardMaterial | physical | wheelVoid | 1 | vehicle |  | vertexColors doubleSided | - | d3 p8 s6 h1 ds2 | default | 271 |
| 67 | MeshStandardMaterial | physical | wheelWorn | 1 | vehicle |  | - | mapUv normal roughness | d3 p8 s6 h1 ds2 | `fn{n(e,t)}\|bw:rimWorn:0.3:false:0:false:false:false\|cb:wheel` | 368 |
| 177 | ShaderMaterial | custom(50,51) | mirrorLive | 1 | vehicle |  | - | - | d3 p8 s6 h1 ds2 | default | 256 |
| 135 | MeshBasicMaterial | basic | lion-contact | 1 | wildlife |  | vertexColors vertexAlphas flipSided transparent | mapUv | d3 p8 s6 h1 ds2 | default | 251 |
| 136 | MeshBasicMaterial | basic | lion-contact | 1 | wildlife |  | vertexColors vertexAlphas transparent | mapUv | d3 p8 s6 h1 ds2 | default | 251 |
| 132 | MeshPhysicalMaterial | physical | lion-coat | 4 | wildlife |  | vertexColors anisotropy skinning sheen | mapUv normal | d3 p8 s6 h1 ds2 | `lionfurrim\|MeshPhysicalMaterial\|m` | 289 |
| 134 | MeshPhysicalMaterial | physical | lion-cornea | 1 | wildlife |  | skinning transparent | - | d3 p8 s6 h1 ds2 | default | 281 |
| 137 | MeshStandardMaterial | physical | lion-mane-base | 1 | wildlife |  | skinning | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 138 | MeshStandardMaterial | physical | lion-mane-shells | 1 | wildlife |  | vertexColors vertexAlphas skinning doubleSided | mapUv | d3 p8 s6 h1 ds2 | `lionshell\|MeshStandardMaterial\|` | 280 |
| 133 | MeshStandardMaterial | physical | lion-strands | 1 | wildlife |  | alphaTest skinning doubleSided | mapUv | d3 p8 s6 h1 ds2 | default | 268 |
| 3 | MeshBasicMaterial | basic |  | 0 | unattributed |  | - | - | - | - | 258 |
| 1 | MeshBasicMaterial | basic | PMREM.Background | 0 | unattributed |  | - | - | - | - | 258 |
| 144 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 145 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 146 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 147 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 169 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 170 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 175 | MeshDepthMaterial | depth |  | 0 | shadow |  | - | - | - | - | 257 |
| 2 | ShaderMaterial | 2 | ProceduralSky | 0 | unattributed |  | - | - | - | - | 255 |

## A.2. Triangles per frame

Beauty pass only (the shadow pass and the AO G-buffer are broken out in the group tables). `instanced` triangles are `instanceCount x triangles per instance` for `InstancedMesh`; `regular` is everything else.

### A.hero

Camera at (-30.67, 3.56, 5.74) fov 36, truck at (-36.58, 2.63, 1.76). Beauty 1,461,942 tris in 328 calls (374,752 instanced in 138 calls, 1,087,190 regular); shadow pass 715,170 tris in 164 calls. 319 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 104 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 479,690 | 0 | 44,003 (9%) | 5 | 5 | 0 | 0 | 4 | 464,316 |
| forest | 145 | 377,460 | 374,752 | 55,462 (15%) | 142 | 6 | 47 | 184,408 | 23 | 111,846 |
| vehicle | 160 | 582,388 | 0 | 582,388 (100%) | 154 | 60 | 103 | 424,284 | 134 | 578,518 |
| camp | 4 | 16,504 | 0 | - | 4 | 4 | 9 | 100,076 | 0 | 0 |
| roadside | 2 | 2,868 | 0 | - | 2 | 1 | 5 | 6,402 | 2 | 2,868 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 936 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 704,257 of 1,461,942 beauty triangles (48%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 7,818 tris (3%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 1,563 tris (1%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 2/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 21,112 | 21,112 tris (100%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 41 | 1 | 20,828 | 2/41 instances | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 5/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| campWear | camp | Mesh | campWear | - | 1 | 16,400 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |
| cabin_fabric | vehicle | Mesh | fabric | - | 1 | 15,720 | sphere yes | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 15,374 | sphere yes | yes |
| farScrub | terrain | Mesh | MeshLambertMaterial | - | 1 | 15,200 | sphere yes | no |
| cabin_steelDark | vehicle | Mesh | steelDark | - | 1 | 14,736 | sphere yes | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 24 | 1 | 14,112 | 5/24 instances | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 7,818 |
| vehicle/body | 42 | 48 | 217,444 | 217,444 |
| terrain/roadStones | 1 | 1 | 180,520 | 1,563 |
| vehicle/cabin | 28 | 28 | 146,676 | 146,676 |
| forest/grass | 48 | 48 | 124,924 | 22,450 |
| vehicle/tyre | 24 | 24 | 106,456 | 106,456 |
| forest/tree | 10 | 10 | 101,380 | 9,792 |
| vehicle/gear | 21 | 21 | 85,720 | 85,720 |
| forest/forb | 10 | 10 | 35,720 | 3,120 |
| forest/scrub | 20 | 20 | 35,268 | 4,364 |
| forest/litter | 16 | 16 | 19,296 | 3,944 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| forest/log | 3 | 3 | 15,872 | 2,232 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| terrain/roadStoneShadows | 1 | 1 | 15,374 | 15,374 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 25 | 25 | 206,316 |
| vehicle/tyre | 24 | 24 | 106,456 |
| forest/tree | 10 | 10 | 101,380 |
| camp/camp | 9 | 9 | 100,076 |
| vehicle/gear | 21 | 21 | 85,720 |
| forest/scrub | 24 | 24 | 38,312 |
| forest/log | 3 | 3 | 15,872 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/rock | 4 | 4 | 10,120 |
| forest/termite | 3 | 3 | 8,464 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| camp_timber | camp | - | 1 | 32,992 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| gear_steelDark | vehicle | - | 1 | 21,112 |
| tree_umbrella_foliage | forest | 41 | 1 | 20,828 |
| camp_deadwood | camp | - | 1 | 19,790 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| fireEmbers | camp | Mesh | - | 1 | 36 |
| fireFlames | camp | Mesh | - | 1 | 32 |

### A.mainroad

Camera at (26.03, 5.05, 9.95) fov 44, truck at (35.34, 2.05, 11.5). Beauty 1,930,624 tris in 410 calls (473,900 instanced in 168 calls, 1,456,724 regular); shadow pass 1,024,894 tris in 218 calls. 401 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 104 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 6 | 480,170 | 0 | 122,383 (25%) | 6 | 6 | 0 | 0 | 4 | 464,316 |
| forest | 174 | 472,576 | 469,868 | 120,132 (25%) | 171 | 6 | 54 | 183,424 | 23 | 107,692 |
| vehicle | 160 | 582,388 | 0 | 582,388 (100%) | 154 | 60 | 103 | 424,284 | 134 | 578,518 |
| camp | 18 | 127,992 | 4,032 | 91,172 (71%) | 18 | 11 | 31 | 156,296 | 14 | 111,488 |
| fleet | 27 | 253,232 | 0 | 60,564 (24%) | 27 | 23 | 20 | 249,464 | 25 | 251,722 |
| wildlife | 4 | 8 | 0 | - | 4 | 1 | 0 | 0 | 4 | 8 |
| roadside | 9 | 11,226 | 0 | - | 9 | 2 | 10 | 11,426 | 9 | 11,226 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 936 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 990,905 of 1,930,624 beauty triangles (51%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 45,525 tris (17%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 41,756 tris (23%) | yes |
| fleet_steel | fleet | Mesh | fleet_steel | - | 1 | 47,020 | 0 tris (0%) | yes |
| fleet_tyre | fleet | Mesh | fleet_tyre | - | 1 | 44,528 | 0 tris (0%) | yes |
| fleet_trim | fleet | Mesh | fleet_trim | - | 1 | 41,628 | 0 tris (0%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| camp_timber | camp | Mesh | timber | - | 1 | 32,992 | 0 tris (0%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| fleet_paint | fleet | Mesh | fleet_paint | - | 1 | 31,240 | 0 tris (0%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| fleet_chrome | fleet | Mesh | fleet_chrome | - | 1 | 28,252 | 0 tris (0%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 3/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 21,112 | 21,112 tris (100%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 41 | 1 | 20,828 | 3/41 instances | yes |
| camp_deadwood | camp | Mesh | deadwood | - | 1 | 19,790 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 0/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 45,525 |
| fleet/fleet | 27 | 27 | 253,232 | 60,564 |
| vehicle/body | 42 | 48 | 217,444 | 217,444 |
| forest/grass | 64 | 64 | 215,184 | 92,416 |
| terrain/roadStones | 1 | 1 | 180,520 | 41,756 |
| vehicle/cabin | 28 | 28 | 146,676 | 146,676 |
| camp/camp | 13 | 13 | 107,456 | 74,464 |
| vehicle/tyre | 24 | 24 | 106,456 | 106,456 |
| forest/tree | 11 | 11 | 98,010 | 4,722 |
| vehicle/gear | 21 | 21 | 85,720 | 85,720 |
| forest/forb | 12 | 12 | 43,602 | 5,390 |
| forest/scrub | 23 | 23 | 33,292 | 1,438 |
| forest/litter | 17 | 17 | 21,032 | 7,600 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| forest/log | 3 | 3 | 15,872 | 496 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| fleet/fleet | 20 | 20 | 249,464 |
| vehicle/body | 25 | 25 | 206,316 |
| camp/camp | 31 | 31 | 156,296 |
| vehicle/tyre | 24 | 24 | 106,456 |
| forest/tree | 9 | 9 | 96,720 |
| vehicle/gear | 21 | 21 | 85,720 |
| forest/scrub | 32 | 32 | 41,988 |
| forest/log | 3 | 3 | 15,872 |
| vehicle/axles | 5 | 5 | 15,568 |
| roadside/roadside | 10 | 10 | 11,426 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| fleet_steel | fleet | - | 1 | 47,020 |
| fleet_tyre | fleet | - | 1 | 44,528 |
| fleet_trim | fleet | - | 1 | 41,628 |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| camp_timber | camp | - | 1 | 32,992 |
| body_trim | vehicle | - | 1 | 32,592 |
| fleet_paint | fleet | - | 1 | 31,240 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| fleet_chrome | fleet | - | 1 | 28,252 |
| body_gap | vehicle | - | 1 | 28,096 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| fireEmbers | camp | Mesh | - | 1 | 36 |
| fireFlames | camp | Mesh | - | 1 | 32 |

### A.camp

Camera at (-30.2, 5.85, 32.99) fov 50, truck at (-6.67, 3.64, 23.71). Beauty 2,263,386 tris in 655 calls (753,518 instanced in 280 calls, 1,509,868 regular); shadow pass 998,264 tris in 194 calls. 597 objects drawn, 0 of them outside the frustum (`frustumCulled = false`) costing 0 tris / 0 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 6 | 480,170 | 0 | 289,734 (60%) | 6 | 6 | 0 | 0 | 4 | 464,316 |
| forest | 285 | 748,834 | 746,126 | 335,216 (45%) | 282 | 6 | 47 | 184,408 | 25 | 113,046 |
| vehicle | 160 | 582,388 | 0 | 582,388 (100%) | 154 | 60 | 103 | 424,284 | 134 | 578,518 |
| camp | 52 | 183,536 | 7,392 | 183,128 (100%) | 51 | 20 | 24 | 137,694 | 45 | 166,524 |
| fleet | 126 | 253,992 | 0 | 253,992 (100%) | 78 | 27 | 15 | 245,476 | 28 | 252,058 |
| wildlife | 4 | 8 | 0 | - | 4 | 1 | 0 | 0 | 4 | 8 |
| roadside | 10 | 11,426 | 0 | - | 10 | 2 | 5 | 6,402 | 10 | 11,426 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 936 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 1,658,924 of 2,263,386 beauty triangles (73%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 142,351 tris (54%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 112,281 tris (62%) | yes |
| fleet_steel | fleet | Mesh | fleet_steel | - | 1 | 47,020 | 47,020 tris (100%) | yes |
| fleet_tyre | fleet | Mesh | fleet_tyre | - | 1 | 44,528 | 44,528 tris (100%) | yes |
| fleet_trim | fleet | Mesh | fleet_trim | - | 1 | 41,628 | 41,628 tris (100%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| camp_timber | camp | Mesh | timber | - | 1 | 32,992 | 32,992 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| fleet_paint | fleet | Mesh | fleet_paint | - | 1 | 31,240 | 31,240 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| fleet_chrome | fleet | Mesh | fleet_chrome | - | 1 | 28,252 | 28,252 tris (100%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 12/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 21,112 | 21,112 tris (100%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 41 | 1 | 20,828 | 12/41 instances | yes |
| camp_deadwood | camp | Mesh | deadwood | - | 1 | 19,790 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 3/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| forest/grass | 126 | 126 | 430,162 | 244,972 |
| terrain/terrain | 1 | 1 | 264,548 | 142,351 |
| fleet/fleet | 30 | 30 | 253,568 | 253,568 |
| vehicle/body | 42 | 48 | 217,444 | 217,444 |
| terrain/roadStones | 1 | 1 | 180,520 | 112,281 |
| camp/camp | 43 | 44 | 159,468 | 159,468 |
| vehicle/cabin | 28 | 28 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 106,456 | 106,456 |
| forest/tree | 14 | 14 | 103,806 | 22,032 |
| vehicle/gear | 21 | 21 | 85,720 | 85,720 |
| forest/forb | 17 | 17 | 51,862 | 18,278 |
| forest/litter | 40 | 40 | 51,296 | 24,672 |
| forest/scrub | 32 | 32 | 41,988 | 5,884 |
| forest/swath | 30 | 30 | 21,308 | 4,440 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| fleet/fleet | 15 | 15 | 245,476 |
| vehicle/body | 25 | 25 | 206,316 |
| camp/camp | 24 | 24 | 137,694 |
| vehicle/tyre | 24 | 24 | 106,456 |
| forest/tree | 10 | 10 | 101,380 |
| vehicle/gear | 21 | 21 | 85,720 |
| forest/scrub | 24 | 24 | 38,312 |
| forest/log | 3 | 3 | 15,872 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/rock | 4 | 4 | 10,120 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| fleet_steel | fleet | - | 1 | 47,020 |
| fleet_tyre | fleet | - | 1 | 44,528 |
| fleet_trim | fleet | - | 1 | 41,628 |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| camp_timber | camp | - | 1 | 32,992 |
| body_trim | vehicle | - | 1 | 32,592 |
| fleet_paint | fleet | - | 1 | 31,240 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| fleet_chrome | fleet | - | 1 | 28,252 |
| body_gap | vehicle | - | 1 | 28,096 |

### A.lions

Camera at (103.82, 2.77, -27.19) fov 50, truck at (104.03, 1.15, -26.87). Beauty 1,251,918 tris in 209 calls (284,042 instanced in 99 calls, 967,876 regular); shadow pass 585,918 tris in 150 calls. 202 objects drawn, 4 of them outside the frustum (`frustumCulled = false`) costing 104 tris / 4 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 6 | 480,170 | 0 | 54,481 (11%) | 6 | 6 | 0 | 0 | 4 | 464,316 |
| forest | 106 | 286,750 | 284,042 | 59,555 (21%) | 103 | 6 | 41 | 153,712 | 20 | 97,988 |
| vehicle | 75 | 470,486 | 0 | 297,904 (63%) | 71 | 47 | 103 | 424,284 | 65 | 470,466 |
| camp | 3 | 104 | 0 | - | 3 | 3 | 0 | 0 | 0 | 0 |
| wildlife | 10 | 4,990 | 0 | - | 10 | 4 | 0 | 0 | 10 | 4,990 |
| roadside | 5 | 6,402 | 0 | - | 5 | 2 | 6 | 7,922 | 5 | 6,402 |
| sky | 2 | 960 | 0 | - | 2 | 2 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 936 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 426,452 of 1,251,918 beauty triangles (34%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 12,275 tris (5%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 7,104 tris (4%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 2,141 tris (6%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 4,073 tris (12%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 1,449 tris (5%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 2,520 tris (9%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 2/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 6,652 tris (26%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 5,961 tris (27%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 21,112 | 882 tris (4%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 41 | 1 | 20,828 | 1/41 instances | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 0/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |
| cabin_fabric | vehicle | Mesh | fabric | - | 1 | 15,720 | sphere yes | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 15,374 | sphere yes | yes |
| farScrub | terrain | Mesh | MeshLambertMaterial | - | 1 | 15,200 | sphere yes | no |
| cabin_steelDark | vehicle | Mesh | steelDark | - | 1 | 14,736 | sphere yes | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 24 | 1 | 14,112 | 0/24 instances | yes |
| body_paint | vehicle | Mesh | paint | - | 1 | 13,972 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| terrain/terrain | 1 | 1 | 264,548 | 12,275 |
| vehicle/body | 28 | 32 | 213,130 | 95,893 |
| terrain/roadStones | 1 | 1 | 180,520 | 7,104 |
| vehicle/cabin | 22 | 22 | 144,088 | 108,973 |
| forest/grass | 28 | 28 | 96,800 | 40,738 |
| forest/tree | 7 | 7 | 87,460 | 3,070 |
| vehicle/gear | 13 | 13 | 77,364 | 57,134 |
| forest/forb | 9 | 9 | 25,342 | 1,822 |
| vehicle/tyre | 3 | 3 | 20,336 | 20,336 |
| forest/log | 3 | 3 | 15,872 | 496 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| terrain/roadStoneShadows | 1 | 1 | 15,374 | 15,374 |
| terrain/farScrub | 1 | 1 | 15,200 | 15,200 |
| forest/litter | 12 | 12 | 11,528 | 3,240 |
| forest/scrub | 12 | 12 | 10,568 | 638 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 25 | 25 | 206,316 |
| vehicle/tyre | 24 | 24 | 106,456 |
| forest/tree | 7 | 7 | 91,648 |
| vehicle/gear | 21 | 21 | 85,720 |
| forest/scrub | 22 | 22 | 18,820 |
| forest/log | 3 | 3 | 15,872 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/rock | 4 | 4 | 10,120 |
| roadside/roadside | 6 | 6 | 7,922 |
| forest/termite | 2 | 2 | 6,992 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| gear_steelDark | vehicle | - | 1 | 21,112 |
| tree_umbrella_foliage | forest | 41 | 1 | 20,828 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |
| body_chrome | vehicle | - | 1 | 17,672 |
| gear_trim | vehicle | - | 1 | 16,264 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| fireEmbers | camp | Mesh | - | 1 | 36 |
| fireFlames | camp | Mesh | - | 1 | 32 |
| Points#1047 | sky | Points | - | 1 | 0 |

### A.interior

Camera at (-36.17, 4.21, 1.61) fov 62, truck at (-36.58, 2.63, 1.76). Beauty 1,587,458 tris in 361 calls (568,988 instanced in 211 calls, 1,018,470 regular); shadow pass 715,170 tris in 164 calls. 354 objects drawn, 3 of them outside the frustum (`frustumCulled = false`) costing 104 tris / 3 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 479,690 | 0 | 176,433 (37%) | 5 | 5 | 0 | 0 | 4 | 464,316 |
| forest | 218 | 571,696 | 568,988 | 290,632 (51%) | 215 | 6 | 47 | 184,408 | 24 | 112,556 |
| vehicle | 117 | 510,134 | 0 | 389,260 (76%) | 113 | 53 | 103 | 424,284 | 95 | 506,272 |
| camp | 4 | 16,504 | 0 | - | 4 | 4 | 9 | 100,076 | 0 | 0 |
| roadside | 5 | 6,402 | 0 | - | 5 | 2 | 5 | 6,402 | 5 | 6,402 |
| sky | 10 | 976 | 0 | - | 10 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 936 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 882,263 of 1,587,458 beauty triangles (56%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 87,340 tris (33%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 54,471 tris (30%) | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 17,986 tris (49%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 13,393 tris (41%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 9,603 tris (32%) | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 10,711 tris (38%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 41 | 1 | 26,076 | 23/41 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 10,475 tris (41%) | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 10,196 tris (46%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 21,112 | 3,022 tris (14%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 41 | 1 | 20,828 | 23/41 instances | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 24 | 1 | 18,864 | 10/24 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| campWear | camp | Mesh | campWear | - | 1 | 16,400 | sphere yes | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |
| cabin_fabric | vehicle | Mesh | fabric | - | 1 | 15,720 | sphere yes | yes |
| roadStoneShadows | terrain | Mesh | ShaderMaterial | - | 1 | 15,374 | sphere yes | yes |
| farScrub | terrain | Mesh | MeshLambertMaterial | - | 1 | 15,200 | sphere yes | no |
| cabin_steelDark | vehicle | Mesh | steelDark | - | 1 | 14,736 | sphere yes | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 24 | 1 | 14,112 | 10/24 instances | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| forest/grass | 93 | 93 | 284,288 | 147,036 |
| terrain/terrain | 1 | 1 | 264,548 | 87,340 |
| vehicle/body | 33 | 37 | 210,798 | 135,071 |
| terrain/roadStones | 1 | 1 | 180,520 | 54,471 |
| vehicle/cabin | 28 | 28 | 146,676 | 119,619 |
| forest/tree | 12 | 12 | 102,536 | 52,432 |
| vehicle/gear | 15 | 15 | 78,452 | 60,362 |
| vehicle/tyre | 12 | 12 | 53,228 | 53,228 |
| forest/litter | 32 | 32 | 44,952 | 25,312 |
| forest/scrub | 24 | 24 | 38,312 | 19,528 |
| forest/forb | 12 | 12 | 37,312 | 17,200 |
| camp/campWear | 1 | 1 | 16,400 | 16,400 |
| forest/swath | 19 | 19 | 15,884 | 6,540 |
| forest/log | 3 | 3 | 15,872 | 6,944 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| vehicle/body | 25 | 25 | 206,316 |
| vehicle/tyre | 24 | 24 | 106,456 |
| forest/tree | 10 | 10 | 101,380 |
| camp/camp | 9 | 9 | 100,076 |
| vehicle/gear | 21 | 21 | 85,720 |
| forest/scrub | 24 | 24 | 38,312 |
| forest/log | 3 | 3 | 15,872 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/rock | 4 | 4 | 10,120 |
| forest/termite | 3 | 3 | 8,464 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| camp_timber | camp | - | 1 | 32,992 |
| body_trim | vehicle | - | 1 | 32,592 |
| body_steelDark | vehicle | - | 1 | 29,964 |
| body_gap | vehicle | - | 1 | 28,096 |
| tree_umbrella_trunk | forest | 41 | 1 | 26,076 |
| gear_steelDark | vehicle | - | 1 | 21,112 |
| tree_umbrella_foliage | forest | 41 | 1 | 20,828 |
| camp_deadwood | camp | - | 1 | 19,790 |
| tree_umbrella_trunk | forest | 24 | 1 | 18,864 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 36 |
| fireEmbers | camp | Mesh | - | 1 | 36 |
| fireFlames | camp | Mesh | - | 1 | 32 |

## A.3. Textures

289 texture objects reachable from scene materials, post passes, the sky rig and the shadow map (289 distinct image sources; 288 have a GL texture). `renderer.info.memory.textures` says 313; the difference is textures the renderer owns that nothing in the scene graph points to any more (composer swap buffers' depth attachments, PMREM scratch, textures created and dropped during boot). Estimated GPU memory 311.29 MB (0 compressed). 3 texture(s) are 2048 on a side: (unnamed) 2048x2048 21.33 MB (forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2]), (unnamed) 2048x2048 16 MB (shadow:DirectionalLight), sunFar.shadowMap 2048x2048 16 MB (shadow:DirectionalLight); 0 exceed 2048. Canvas-backed textures also keep their canvas alive on the CPU: 35.79 MB of RGBA bitmaps; the DataTextures keep their typed arrays (counted in the JS heap).

| group | textures | sources | est. GPU MB | CPU canvas MB | sizes |
| --- | --- | --- | --- | --- | --- |
| forest | 42 | 42 | 73.08 | 0 | 16x 256x512, 11x 256x256, 5x 1024x1024, 5x 512x512, 3x 1024x256, 1x 2048x2048, 1x 128x128 |
| vehicle | 99 | 99 | 59.16 | 13.88 | 54x 256x256, 15x 128x128, 14x 512x512, 4x 64x64, 3x 1024x1024, 3x 512x320, 2x 512x256, 1x 512x288, 1x 512x128, 1x 120x160, 1x 256x72 |
| shadow | 4 | 4 | 40 | 0 | 2x 2048x2048, 2x 1024x1024 |
| camp | 83 | 83 | 38.3 | 11.07 | 52x 256x256, 14x 128x128, 4x 512x512, 4x 64x64, 2x 1024x512, 1x 1200x984, 1x 512x384, 1x 512x256, 1x 512x192, 1x 512x160, 1x 256x192, 1x 256x160 |
| post:gtao | 6 | 6 | 24.63 | 0 | 4x 1280x720, 1x 64x64, 1x 5x5 |
| post:smaa | 4 | 4 | 14.41 | 0 | 2x 1280x720, 1x 160x560, 1x 66x33 |
| post:bloom | 12 | 12 | 13.47 | 0 | 3x 640x360, 2x 320x180, 2x 160x90, 2x 80x45, 2x 40x23, 1x 1280x720 |
| fleet | 15 | 15 | 12.79 | 4.25 | 10x 256x256, 3x 512x512, 1x 1024x1024, 1x 256x128 |
| sky | 3 | 3 | 12.02 | 0.02 | 2x 768x1024, 1x 64x64 |
| post:sanitize | 1 | 1 | 7.03 | 0 | 1x 1280x720 |
| roadside | 4 | 4 | 6.08 | 4.56 | 2x 256x256, 1x 1024x1024, 1x 128x128 |
| wildlife | 8 | 8 | 5.85 | 2.02 | 4x 512x512, 2x 128x128, 1x 256x256, 1x 64x64 |
| terrain | 6 | 6 | 4.04 | 0 | 3x 256x256, 2x 512x512, 1x 512x192 |
| dust | 1 | 1 | 0.25 | 0 | 1x 256x256 |
| other | 1 | 1 | 0.17 | 0 | 1x 128x256 |

Top 20 by estimated memory:

| name | class | image | size | format | mips | est. MB | owner (first) | owners |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (unnamed) | DataTexture | Object | 2048x2048 | RGBA/u8 | yes | 21.33 | forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2] | 1 |
| (unnamed) | RenderTargetTexture | render target | 2048x2048 | RGBA/u8 | no | 16 | shadow:DirectionalLight | 1 |
| sunFar.shadowMap | DepthTexture | Object | 2048x2048 | Depth/u32 | no | 16 | shadow:DirectionalLight | 1 |
| EffectComposer.rt1 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:sanitize:uniforms.tDiffuse.value | 5 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:gtaoRenderTarget.texture | 3 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:pdRenderTarget.texture | 3 |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:gtao:normalRenderTarget.texture | 5 |
| EffectComposer.rt2 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:bloom:highPassUniforms.tDiffuse.value | 8 |
| SMAAPass.edges | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:smaa:_edgesRT.texture | 4 |
| SMAAPass.weights | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | no | 7.03 | post:smaa:_weightsRT.texture | 4 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1200x984 | RGBA/u8 | yes | 6.01 | camp:campWear.map [campWear] | 1 |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | no | 6 | sky:pmrem._pingPongRenderTarget.texture | 3 |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | no | 6 | sky:envTarget.texture | 190 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [treeFar_0, treeFar_1 +1] | 1 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [grass_0_b1, grass_0_b2 +175] | 2 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [scrub_0_b0, scrub_0_b1 +30] | 1 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [forb_0_b3, forb_1_b0 +15] | 1 |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | yes | 5.33 | forest:MeshStandardMaterial.map [swath_0_b0, swath_0_b1 +29] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | vehicle:cabinPanel.map [gear_cabinPanel, cabin_cabinPanel] | 1 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | yes | 5.33 | vehicle:cabinPanel.emissiveMap [gear_cabinPanel, cabin_cabinPanel] | 1 |

Render targets:

| owner | size | samples | colour textures | depth |
| --- | --- | --- | --- | --- |
| post:gtao:gtaoRenderTarget | 1280x720 | 0 | 1 | renderbuffer |
| post:gtao:pdRenderTarget | 1280x720 | 0 | 1 | renderbuffer |
| post:gtao:normalRenderTarget | 1280x720 | 0 | 1 | depth texture |
| post:bloom:renderTargetsHorizontal[0] | 640x360 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[1] | 320x180 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[2] | 160x90 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[3] | 80x45 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsHorizontal[4] | 40x23 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[0] | 640x360 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[1] | 320x180 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[2] | 160x90 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[3] | 80x45 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetsVertical[4] | 40x23 | 0 | 1 | renderbuffer |
| post:bloom:renderTargetBright | 640x360 | 0 | 1 | renderbuffer |
| post:smaa:_edgesRT | 1280x720 | 0 | 1 | none |
| post:smaa:_weightsRT | 1280x720 | 0 | 1 | none |
| post:composer:renderTarget1 | 1280x720 | 0 | 1 | renderbuffer |
| post:composer:renderTarget2 | 1280x720 | 0 | 1 | renderbuffer |
| sky:pmrem._pingPongRenderTarget | 768x1024 | 0 | 1 | none |
| sky:envTarget | 768x1024 | 0 | 1 | renderbuffer |
| shadow:DirectionalLight | 1024x1024 | 0 | 1 | depth texture |
| shadow:DirectionalLight | 2048x2048 | 0 | 1 | depth texture |

Every texture:

| name | class | image | size | format | mips | est. MB | GL | owners |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (unnamed) | DataTexture | Object | 2048x2048 | RGBA/u8 | y | 21.33 | y | forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +2] |
| (unnamed) | RenderTargetTexture | render target | 2048x2048 | RGBA/u8 | n | 16 | y | shadow:DirectionalLight |
| sunFar.shadowMap | DepthTexture | Object | 2048x2048 | Depth/u32 | n | 16 | y | shadow:DirectionalLight |
| EffectComposer.rt1 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:sanitize:uniforms.tDiffuse.value; post:composer:renderTarget1.texture; post:composer:renderTarget1.textures[0] |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:gtao:gtaoRenderTarget.texture; post:gtao:gtaoRenderTarget.textures[0]; post:gtao:pdMaterial.u.tDiffuse |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:gtao:pdRenderTarget.texture; post:gtao:pdRenderTarget.textures[0]; post:gtao:blendMaterial.u.tDiffuse |
| (unnamed) | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:gtao:normalRenderTarget.texture; post:gtao:normalRenderTarget.textures[0]; post:gtao:normalTexture |
| EffectComposer.rt2 | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:bloom:highPassUniforms.tDiffuse.value; post:composer:renderTarget2.texture; post:composer:renderTarget2.textures[0] |
| SMAAPass.edges | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:smaa:_edgesRT.texture; post:smaa:_edgesRT.textures[0]; post:smaa:_uniformsWeights.tDiffuse.value |
| SMAAPass.weights | RenderTargetTexture | render target | 1280x720 | RGBA/f16 | n | 7.03 | y | post:smaa:_weightsRT.texture; post:smaa:_weightsRT.textures[0]; post:smaa:_uniformsBlend.tDiffuse.value |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1200x984 | RGBA/u8 | y | 6.01 | y | camp:campWear.map [campWear] |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | n | 6 | y | sky:pmrem._pingPongRenderTarget.texture; sky:pmrem._pingPongRenderTarget.textures[0]; sky:pmrem._ggxMaterial.u.envMap |
| PMREM.cubeUv | RenderTargetTexture | render target | 768x1024 | RGBA/f16 | n | 6 | y | sky:envTarget.texture; sky:envTarget.textures[0]; sky:env |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [treeFar_0, treeFar_1 +1] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [grass_0_b1, grass_0_b2 +175]; forest:MeshStandardMaterial.map [grass_12_b0, grass_13_b0] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [scrub_0_b0, scrub_0_b1 +30] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [forb_0_b3, forb_1_b0 +15] |
| (unnamed) | DataTexture | Object | 1024x1024 | RGBA/u8 | y | 5.33 | y | forest:MeshStandardMaterial.map [swath_0_b0, swath_0_b1 +29] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.map [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.emissiveMap [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | vehicle:cabinPanel.roughnessMap [gear_cabinPanel, cabin_cabinPanel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | fleet:fleet_decal.map [fleet_decal] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x1024 | RGBA/u8 | y | 5.33 | y | roadside:MeshStandardMaterial.map [roadside_sign] |
| (unnamed) | RenderTargetTexture | render target | 1024x1024 | RGBA/u8 | n | 4 | y | shadow:DirectionalLight |
| sun.shadowMap | DepthTexture | Object | 1024x1024 | Depth/u32 | n | 4 | y | shadow:DirectionalLight |
| (unnamed) | DepthTexture | Object | 1280x720 | DepthStencil/u24_8 | n | 3.52 | y | post:gtao:depthTexture; post:gtao:normalRenderTarget.depthTexture; post:gtao:gtaoMaterial.u.tDepth |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x512 | RGBA/u8 | y | 2.67 | y | camp:signGate.map [camp_signGate] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 1024x512 | RGBA/u8 | y | 2.67 | y | camp:signSpeed.map [camp_signSpeed] |
| UnrealBloomPass.h0 | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetsHorizontal[0].texture; post:bloom:renderTargetsHorizontal[0].textures[0]; post:bloom:copyUniforms.tDiffuse.value |
| UnrealBloomPass.v0 | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetsVertical[0].texture; post:bloom:renderTargetsVertical[0].textures[0]; post:bloom:compositeMaterial.u.blurTexture1 |
| UnrealBloomPass.bright | RenderTargetTexture | render target | 640x360 | RGBA/f16 | n | 1.76 | y | post:bloom:renderTargetBright.texture; post:bloom:renderTargetBright.textures[0] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | terrain:MeshStandardMaterial.map [terrain] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | terrain:MeshStandardMaterial.normalMap [terrain] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.map [litter_0_b1, litter_0_b2 +57] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.map [log_1, log_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.aoMap [log_1, log_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.normalMap [log_1, log_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | forest:MeshStandardMaterial.roughnessMap [log_1, log_2] |
| (unnamed) | DataTexture | Object | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshLambertMaterial.map [treeline_0] |
| (unnamed) | DataTexture | Object | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshLambertMaterial.map [treeline_1] |
| (unnamed) | DataTexture | Object | 1024x256 | RGBA/u8 | y | 1.33 | y | forest:MeshLambertMaterial.map [treeline_2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.map [body_steelDark, gear_steelDark +1] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.normalMap [body_steelDark, gear_steelDark +1]; fleet:fleet_steel.normalMap [fleet_steel]; fleet:fleet_whip.normalMap [fleet_whip] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steelDark.roughnessMap [body_steelDark, gear_steelDark +1]; fleet:fleet_steel.roughnessMap [fleet_steel]; fleet:fleet_whip.roughnessMap [fleet_whip] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.map [body_steel, gear_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.metalnessMap [body_steel, gear_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.normalMap [body_steel, gear_steel]; vehicle:chrome.normalMap [body_chrome, gear_chrome +1]; fleet:fleet_chrome.normalMap [fleet_chrome] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:steel.roughnessMap [body_steel, gear_steel]; fleet:fleet_rust.roughnessMap [fleet_rust] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paint.map [body_paint]; vehicle:paintRoof.map [body_paintRoof] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paint.roughnessMap [body_paint]; vehicle:paintDark.roughnessMap [body_paintDark]; vehicle:paintAccent.roughnessMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paintDark.map [body_paintDark] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:paintAccent.map [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:glass.map [body_glass_0]; vehicle:glassDark.map [body_glassDark_0]; vehicle:glassSide.map [body_glassSide_0, body_glassSide_1 +2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:glass.roughnessMap [body_glass_0]; fleet:fleet_glassCracked.roughnessMap [supply-truck_0_glassCracked_0, safari-jeep_0_glassCracked_0 +1]; fleet:fleet_glassDusty.roughnessMap [supply-truck_0_glassDusty_1, supply-truck_0_glassDusty_2 +13] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | vehicle:glassSide.roughnessMap [body_glassSide_0, body_glassSide_1 +2] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.map [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.metalnessMap [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.normalMap [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | camp:steel.roughnessMap [camp_steel] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_paint.map [fleet_paint] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_steel.map [fleet_steel]; fleet:fleet_whip.map [fleet_whip] |
| (unnamed) | DataTexture | Uint8Array data | 512x512 | RGBA/u8 | y | 1.33 | y | fleet:fleet_rust.map [fleet_rust] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-coat.map [lion-body-0, lion-body-1 +1] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-strands.map [lion-strands-0, lion-strands-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-coat-cub.map [lion-body-0, lion-body-1 +1] |
| (unnamed) | DataTexture | Object | 512x512 | RGBA/u8 | y | 1.33 | y | wildlife:lion-mane-base.map [lion-mane-0, lion-mane-1 +1]; wildlife:lion-mane-shells.map [lion-mane-shells-0, lion-mane-shells-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x384 | RGBA/u8 | y | 1 | y | camp:mapBoard.map [camp_mapBoard] |
| (unnamed) | DataTexture | Object | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.map [tyre_carcass] |
| (unnamed) | DataTexture | Object | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.normalMap [tyre_carcass] |
| (unnamed) | DataTexture | Object | 512x320 | RGBA/u8 | y | 0.83 | y | vehicle:tyreCarcass.roughnessMap [tyre_carcass] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x288 | RGBA/u8 | y | 0.75 | y | vehicle:MeshBasicMaterial.map [cabin_screenFilm] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_umbrella_trunk, tree_flat_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_round_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_thorn_trunk] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.map [tree_dead_trunk, log_0]; camp:deadwood.map [camp_deadwood] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.aoMap [tree_dead_trunk, log_0] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.normalMap [tree_dead_trunk, log_0]; camp:deadwood.normalMap [camp_deadwood] |
| (unnamed) | DataTexture | Object | 256x512 | RGBA/u8 | y | 0.67 | y | forest:MeshStandardMaterial.roughnessMap [tree_dead_trunk, log_0]; camp:deadwood.roughnessMap [camp_deadwood] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | vehicle:decalNumber.map [body_decalNumber] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | vehicle:decalBadge.map [body_decalBadge, gear_decalBadge] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x256 | RGBA/u8 | y | 0.67 | y | camp:signFuel.map [camp_signFuel] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x192 | RGBA/u8 | y | 0.5 | y | camp:signLatrine.map [camp_signLatrine] |
| UnrealBloomPass.h1 | RenderTargetTexture | render target | 320x180 | RGBA/f16 | n | 0.44 | y | post:bloom:renderTargetsHorizontal[1].texture; post:bloom:renderTargetsHorizontal[1].textures[0]; post:bloom:separableBlurMaterials[1].u.colorTexture |
| UnrealBloomPass.v1 | RenderTargetTexture | render target | 320x180 | RGBA/f16 | n | 0.44 | y | post:bloom:renderTargetsVertical[1].texture; post:bloom:renderTargetsVertical[1].textures[0]; post:bloom:compositeMaterial.u.blurTexture2 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x160 | RGBA/u8 | y | 0.42 | y | camp:signOffice.map [camp_signOffice] |
| (unnamed) | DataTexture | Object | 512x192 | RGBA/u8 | n | 0.38 | y | terrain:ShaderMaterial.u.uCanopy [roadWater] |
| SMAAPass.area | Texture | HTMLImageElement | 160x560 | RGBA/u8 | n | 0.34 | y | post:smaa:_areaTexture; post:smaa:_materialWeights.u.tArea |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | terrain:ShaderMaterial.u.uRipple [roadWater] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | terrain:ShaderMaterial.u.uRockMap [roadWater]; forest:MeshStandardMaterial.map [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | terrain:MeshLambertMaterial.map [farHills] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [kopje_0, kopje_1 +5] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [termite_0, termite_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.map [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.aoMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.normalMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | forest:MeshStandardMaterial.roughnessMap [logEnd_0, logEnd_1 +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.map [body_trim, gear_trim +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.normalMap [body_trim, gear_trim +1]; fleet:fleet_trim.normalMap [fleet_trim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trim.roughnessMap [body_trim, gear_trim +1]; fleet:fleet_trim.roughnessMap [fleet_trim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:alu.normalMap [body_alu, gear_alu +1]; camp:alu.normalMap [camp_alu]; fleet:fleet_alu.normalMap [fleet_alu] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:alu.roughnessMap [body_alu, gear_alu +1]; camp:alu.roughnessMap [camp_alu] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.map [body_trimGloss, gear_trimGloss +1] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.normalMap [body_trimGloss, gear_trimGloss +1]; vehicle:fridgeCase.normalMap [gear_fridgeCase]; fleet:fleet_trimGloss.normalMap [fleet_trimGloss] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:trimGloss.roughnessMap [body_trimGloss, gear_trimGloss +1]; vehicle:fridgeCase.roughnessMap [gear_fridgeCase]; fleet:fleet_trimGloss.roughnessMap [fleet_trimGloss] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.map [body_rubber, gear_rubber]; vehicle:tread.map [gear_tread]; vehicle:MeshStandardMaterial.map [cabin_rubber] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.normalMap [body_rubber, gear_rubber]; vehicle:gasket.normalMap [body_gasket]; vehicle:MeshStandardMaterial.normalMap [cabin_rubber] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rubber.roughnessMap [body_rubber, gear_rubber]; vehicle:MeshStandardMaterial.roughnessMap [cabin_rubber]; camp:rubber.roughnessMap [camp_rubber] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.map [body_plate, gear_plate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.normalMap [body_plate, gear_plate]; fleet:fleet_plate.normalMap [fleet_plate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:plate.roughnessMap [body_plate, gear_plate]; fleet:fleet_plate.roughnessMap [fleet_plate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:paint.clearcoatNormalMap [body_paint]; vehicle:paintDark.clearcoatNormalMap [body_paintDark]; vehicle:paintAccent.clearcoatNormalMap [body_paintAccent, gear_paintAccent] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:chrome.roughnessMap [body_chrome, gear_chrome +1]; fleet:fleet_chrome.roughnessMap [fleet_chrome]; fleet:fleet_alu.roughnessMap [fleet_alu] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 512x128 | RGBA/u8 | y | 0.33 | y | vehicle:decalName.map [body_decalName] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.map [body_reflector]; vehicle:barReflector.map [gear_barReflector]; fleet:fleet_reflector.map [fleet_reflector] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.normalMap [body_reflector]; vehicle:barReflector.normalMap [gear_barReflector]; fleet:fleet_reflector.normalMap [fleet_reflector] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:reflector.roughnessMap [body_reflector]; vehicle:barReflector.roughnessMap [gear_barReflector]; fleet:fleet_reflector.roughnessMap [fleet_reflector] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.map [body_bedLiner] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.normalMap [body_bedLiner] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:bedLiner.roughnessMap [body_bedLiner] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:canvasTop.normalMap [gear_canvasTop]; vehicle:canvasKhaki.normalMap [gear_canvasKhaki]; vehicle:fabric.normalMap [cabin_fabric] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.aoMap [gear_tread] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.normalMap [gear_tread] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:tread.roughnessMap [gear_tread] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:cabinPanel.normalMap [gear_cabinPanel, cabin_cabinPanel]; vehicle:interiorPlastic.normalMap [cabin_interiorPlastic]; fleet:fleet_vinyl.normalMap [fleet_vinyl] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorPlastic.map [cabin_interiorPlastic] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorPlastic.roughnessMap [cabin_interiorPlastic]; fleet:fleet_vinyl.roughnessMap [fleet_vinyl] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.map [cabin_floorMat] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.normalMap [cabin_floorMat] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:floorMat.roughnessMap [cabin_floorMat] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.map [cabin_interiorFaded] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.normalMap [cabin_interiorFaded]; vehicle:MeshStandardMaterial.normalMap [cabin_paper]; fleet:fleet_vinylFaded.normalMap [fleet_vinylFaded] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:interiorFaded.roughnessMap [cabin_interiorFaded]; fleet:fleet_vinylFaded.roughnessMap [fleet_vinylFaded] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:MeshStandardMaterial.normalMap [cabin_consoleAbs] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:fabric.map [cabin_fabric] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:fabric.roughnessMap [cabin_fabric]; fleet:fleet_fabric.roughnessMap [fleet_fabric]; fleet:fleet_canvas.roughnessMap [fleet_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.map [cabin_wheelRim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.normalMap [cabin_wheelRim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:wheelRim.roughnessMap [cabin_wheelRim] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:MeshStandardMaterial.map [cabin_cardWoven] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:MeshStandardMaterial.normalMap [cabin_cardWoven] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:MeshStandardMaterial.roughnessMap [cabin_cardWoven] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.map [axles_cast, brakes_cast]; vehicle:caliper.map [brakes_caliperM] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.metalnessMap [axles_cast, brakes_cast] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.normalMap [axles_cast, brakes_cast]; vehicle:caliper.normalMap [brakes_caliperM] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:castIron.roughnessMap [axles_cast, brakes_cast]; vehicle:caliper.roughnessMap [brakes_caliperM] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.map [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.map [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.normalMap [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.normalMap [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:rimMachined.roughnessMap [axles_machined, tyre_machined +1]; vehicle:rimPowdercoat.roughnessMap [axles_anod, tyre_anod] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.map [brakes_rotor] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.normalMap [brakes_rotor] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | vehicle:brakeRotor.roughnessMap [brakes_rotor] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.map [camp_rock] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.normalMap [camp_rock] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:rock.roughnessMap [camp_rock] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.map [camp_timber]; camp:pole.map [camp_pole] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.normalMap [camp_timber]; camp:pole.normalMap [camp_pole] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timber.roughnessMap [camp_timber]; camp:pole.roughnessMap [camp_pole] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.map [camp_timberWarm] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.normalMap [camp_timberWarm] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:timberWarm.roughnessMap [camp_timberWarm] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.map [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.metalnessMap [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.normalMap [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:galv.roughnessMap [camp_galv] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.map [camp_steelBlack] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.normalMap [camp_steelBlack] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlack.roughnessMap [camp_steelBlack] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:crate.map [camp_crate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:crate.normalMap [camp_crate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:crate.roughnessMap [camp_crate] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.map [camp_steelRed] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.normalMap [camp_steelRed] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelRed.roughnessMap [camp_steelRed] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.map [camp_steelWhite] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.normalMap [camp_steelWhite] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelWhite.roughnessMap [camp_steelWhite] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.map [camp_steelGreen] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.normalMap [camp_steelGreen] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelGreen.roughnessMap [camp_steelGreen] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | camp:solar.map [camp_solar] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.map [camp_steelBlue] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.normalMap [camp_steelBlue] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelBlue.roughnessMap [camp_steelBlue] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.map [camp_steelYellow] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.normalMap [camp_steelYellow] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:steelYellow.roughnessMap [camp_steelYellow] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.map [camp_canvasSand]; camp:tarp.map [camp_tarp] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.normalMap [camp_canvasSand]; camp:tarp.normalMap [camp_tarp] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasSand.roughnessMap [camp_canvasSand]; camp:tarp.roughnessMap [camp_tarp] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasGreen.map [camp_canvasGreen]; camp:canvasChair.map [camp_canvasChair] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasGreen.normalMap [camp_canvasGreen]; camp:canvasChair.normalMap [camp_canvasChair] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasGreen.roughnessMap [camp_canvasGreen]; camp:canvasChair.roughnessMap [camp_canvasChair] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.map [camp_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.normalMap [camp_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvas.roughnessMap [camp_canvas] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.map [camp_canvasOlive] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.normalMap [camp_canvasOlive] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:canvasOlive.roughnessMap [camp_canvasOlive] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:post.map [camp_post] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:post.normalMap [camp_post] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:post.roughnessMap [camp_post] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | camp:grass.map [campGrass]; camp:grass.emissiveMap [campGrass] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | camp:ShaderMaterial.u.uTex [fireFlames] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_glassCracked.emissiveMap [supply-truck_0_glassCracked_0, safari-jeep_0_glassCracked_0 +1] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_tyre.map [fleet_tyre]; fleet:fleet_tread.map [fleet_tread]; fleet:fleet_rubber.map [fleet_rubber] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_tyre.normalMap [fleet_tyre] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_tyre.roughnessMap [fleet_tyre] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_trim.map [fleet_trim] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_fabric.map [fleet_fabric]; fleet:fleet_canvas.map [fleet_canvas] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_vinyl.map [fleet_vinyl] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_vinylFaded.map [fleet_vinylFaded] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_plate.map [fleet_plate] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | y | 0.33 | y | fleet:fleet_trimGloss.map [fleet_trimGloss] |
| (unnamed) | DataTexture | Object | 256x256 | RGBA/u8 | y | 0.33 | y | wildlife:lion-coat.normalMap [lion-body-0, lion-body-1 +1]; wildlife:lion-coat-cub.normalMap [lion-body-0, lion-body-1 +1] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | roadside:MeshStandardMaterial.map [roadside_timber] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x256 | RGBA/u8 | y | 0.33 | y | roadside:MeshStandardMaterial.map [roadside_concrete] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x192 | RGBA/u8 | y | 0.25 | y | camp:signRadio.map [camp_signRadio] |
| (unnamed) | DataTexture | Uint8Array data | 256x256 | RGBA/u8 | n | 0.25 | y | dust:ShaderMaterial.u.uMap [wheelDust] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x160 | RGBA/u8 | y | 0.21 | y | camp:campFlag.map [campFlag] |
| (unnamed) | DataTexture | Object | 128x256 | RGBA/u8 | y | 0.17 | y | other:groundContact:groundContact.u.uMap [groundContact] |
| (unnamed) | RenderTargetTexture | render target | 120x160 | RGBA/f16 | n | 0.15 | y | vehicle:mirrorLive.u.tMirror [body_mirrorGlass_2] |
| (unnamed) | DataTexture | Uint8Array data | 256x128 | RGBA/u8 | n | 0.13 | y | fleet:fleet_pool.u.uMap [fleet_pool] |
| UnrealBloomPass.h2 | RenderTargetTexture | render target | 160x90 | RGBA/f16 | n | 0.11 | y | post:bloom:renderTargetsHorizontal[2].texture; post:bloom:renderTargetsHorizontal[2].textures[0]; post:bloom:separableBlurMaterials[2].u.colorTexture |
| UnrealBloomPass.v2 | RenderTargetTexture | render target | 160x90 | RGBA/f16 | n | 0.11 | y | post:bloom:renderTargetsVertical[2].texture; post:bloom:renderTargetsVertical[2].textures[0]; post:bloom:compositeMaterial.u.blurTexture3 |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 256x72 | RGBA/u8 | y | 0.09 | y | vehicle:MeshBasicMaterial.map [cabin_mirrorGlass] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | forest:MeshLambertMaterial.map [forestSkirt] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:amber.normalMap [body_amber]; vehicle:reflectorRed.normalMap [body_reflectorRed, cabin_reflectorRed]; vehicle:taillight.normalMap [body_taillight] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mesh.map [body_mesh, gear_mesh]; fleet:fleet_mesh.map [fleet_mesh] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:lensClear.normalMap [body_lensClear_0, body_lensClear_1 +6]; vehicle:barCover.normalMap [gear_barCover] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.map [cabin_wheelWorn] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.normalMap [cabin_wheelWorn] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:wheelWorn.roughnessMap [cabin_wheelWorn] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.map [cabin_headliner] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.normalMap [cabin_headliner] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:headliner.roughnessMap [cabin_headliner] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.map [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.normalMap [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:tyreLug.roughnessMap [axles_lugRub, tyre_lugRub +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.map [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.normalMap [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | vehicle:mudCake.roughnessMap [axles_mudM, tyre_mudM +1] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.map [camp_polyBlack]; camp:poly.map [camp_poly]; camp:polyBlue.map [camp_polyBlue] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.normalMap [camp_polyBlack]; camp:poly.normalMap [camp_poly]; camp:polyBlue.normalMap [camp_polyBlue] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:polyBlack.roughnessMap [camp_polyBlack]; camp:poly.roughnessMap [camp_poly]; camp:polyBlue.roughnessMap [camp_polyBlue] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:chairCloth.map [camp_chairCloth] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:chairCloth.normalMap [camp_chairCloth] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:chairCloth.roughnessMap [camp_chairCloth] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.map [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.emissiveMap [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.normalMap [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:ash.roughnessMap [camp_ash] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.map [camp_charLog] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.emissiveMap [camp_charLog] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.normalMap [camp_charLog] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | camp:charLog.roughnessMap [camp_charLog] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | wildlife:lion-card.map [lion-card] |
| (unnamed) | DataTexture | Object | 128x128 | RGBA/u8 | y | 0.08 | y | wildlife:lion-card.map [lion-card] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 128x128 | RGBA/u8 | y | 0.08 | y | roadside:MeshStandardMaterial.map [roadside_steel] |
| UnrealBloomPass.h3 | RenderTargetTexture | render target | 80x45 | RGBA/f16 | n | 0.03 | y | post:bloom:renderTargetsHorizontal[3].texture; post:bloom:renderTargetsHorizontal[3].textures[0]; post:bloom:separableBlurMaterials[3].u.colorTexture |
| UnrealBloomPass.v3 | RenderTargetTexture | render target | 80x45 | RGBA/f16 | n | 0.03 | y | post:bloom:renderTargetsVertical[3].texture; post:bloom:renderTargetsVertical[3].textures[0]; post:bloom:compositeMaterial.u.blurTexture4 |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.map [cabin_stitch] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.normalMap [cabin_stitch] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:stitch.roughnessMap [cabin_stitch] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | vehicle:louvre.map [cabin_louvre] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | camp:rope.map [camp_rope] |
| (unnamed) | DataTexture | Object | 64x64 | RGBA/u8 | y | 0.02 | y | camp:rope.normalMap [camp_rope] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | camp:ShaderMaterial.u.uTex [fireSmoke] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | camp:ShaderMaterial.u.uTex [fireEmbers] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | n | wildlife:lion-contact.map [lion-contact] |
| (unnamed) | CanvasTexture | HTMLCanvasElement | 64x64 | RGBA/u8 | y | 0.02 | y | sky:ShaderMaterial.u.uMap [Points#1047] |
| (unnamed) | DataTexture | Uint8Array data | 64x64 | RGBA/u8 | n | 0.02 | y | post:gtao:pdNoiseTexture; post:gtao:pdMaterial.u.tNoise |
| SMAAPass.search | Texture | HTMLImageElement | 66x33 | RGBA/u8 | n | 0.01 | y | post:smaa:_searchTexture; post:smaa:_materialWeights.u.tSearch |
| UnrealBloomPass.h4 | RenderTargetTexture | render target | 40x23 | RGBA/f16 | n | 0.01 | y | post:bloom:renderTargetsHorizontal[4].texture; post:bloom:renderTargetsHorizontal[4].textures[0]; post:bloom:separableBlurMaterials[4].u.colorTexture |
| UnrealBloomPass.v4 | RenderTargetTexture | render target | 40x23 | RGBA/f16 | n | 0.01 | y | post:bloom:renderTargetsVertical[4].texture; post:bloom:renderTargetsVertical[4].textures[0]; post:bloom:compositeMaterial.u.blurTexture5 |
| (unnamed) | DataTexture | Uint8Array data | 5x5 | RGBA/u8 | n | 0 | y | post:gtao:gtaoNoiseTexture; post:gtao:gtaoMaterial.u.tNoise |

## A.4. Geometries

397 geometries in the scene graph (`renderer.info.memory.geometries` = 379; the difference is geometries in the graph that have never been drawn, e.g. hidden LOD tiers, minus the compositor's quads). Estimated 148.47 MB of vertex/index data for 3,550,278 vertices / 1,572,584 triangles, plus 3.08 MB of instance matrices/colours on 355 InstancedMeshes. 235 of the 397 geometries are non-indexed (three vertices stored per triangle). For the 94 non-indexed geometries with 3,000+ vertices the census counted their distinct vertices exactly (all attributes compared at 1e-4): an index buffer would remove 59.71 MB of the 118.29 MB they occupy.

| group | geometries | non-indexed | vertices | unique vertices (measured subset) | est. MB | triangles (one instance each) |
| --- | --- | --- | --- | --- | --- | --- |
| terrain | 6 | 2 | 798,576 | 550,680 of 587,160 | 37.92 | 480,170 |
| forest | 78 | 7 | 17,252 | - | 0.73 | 15,233 |
| vehicle | 115 | 114 | 1,469,593 | 328,587 of 1,427,490 | 46.37 | 494,866 |
| camp | 51 | 23 | 382,240 | 138,606 of 314,958 | 12.05 | 175,898 |
| fleet | 78 | 78 | 761,340 | 213,665 of 748,692 | 43.96 | 253,780 |
| wildlife | 46 | 0 | 84,239 | - | 6.28 | 139,114 |
| roadside | 10 | 10 | 34,278 | 27,435 of 30,540 | 1.05 | 11,426 |
| sky | 11 | 1 | 1,093 | - | 0.03 | 1,159 |
| dust | 1 | 0 | 4 | - | 0.02 | 2 |
| other:groundContact | 1 | 0 | 1,663 | - | 0.06 | 936 |

Top 20 by bytes:

| geometry / objects | group | vertices | unique | triangles | indexed | attributes | users | est. MB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| roadStones | terrain | 541,560 | 541,560 | 180,520 | n | position 3x541560, normal 3x541560, color 3x541560 | 1 | 18.59 |
| terrain | terrain | 178,231 | - | 264,548 | y | position 3x178231, normal 3x178231, uv 2x178231, aSide 1x178231, aEdge 1x178231, aAlong 1x | 1 | 17.31 |
| fleet_steel | fleet | 141,060 | 37,653 | 47,020 | n | position 3x141060, normal 3x141060, uv 2x141060, color 3x141060, aWear 4x141060 | 1 | 8.07 |
| fleet_tyre | fleet | 133,584 | 24,960 | 44,528 | n | position 3x133584, uv 2x133584, normal 3x133584, color 3x133584, aWear 4x133584 | 1 | 7.64 |
| fleet_trim | fleet | 124,884 | 30,264 | 41,628 | n | position 3x124884, normal 3x124884, uv 2x124884, color 3x124884, aWear 4x124884 | 1 | 7.15 |
| fleet_paint | fleet | 93,720 | 30,627 | 31,240 | n | position 3x93720, uv 2x93720, normal 3x93720, color 3x93720, aWear 4x93720, aAge 1x93720 | 1 | 5.72 |
| fleet_chrome | fleet | 84,756 | 23,652 | 28,252 | n | position 3x84756, normal 3x84756, uv 2x84756, color 3x84756, aWear 4x84756 | 1 | 4.85 |
| body_trimGloss | vehicle | 110,304 | 20,754 | 36,768 | n | position 3x110304, normal 3x110304, uv 2x110304 | 1 | 3.37 |
| camp_timber | camp | 98,976 | 28,695 | 32,992 | n | position 3x98976, normal 3x98976, uv 2x98976 | 1 | 3.02 |
| body_trim | vehicle | 97,776 | 19,660 | 32,592 | n | position 3x97776, normal 3x97776, uv 2x97776 | 1 | 2.98 |
| body_steelDark | vehicle | 89,892 | 17,856 | 29,964 | n | position 3x89892, normal 3x89892, uv 2x89892 | 1 | 2.74 |
| body_gap | vehicle | 84,288 | 18,342 | 28,096 | n | position 3x84288, normal 3x84288, uv 2x84288 | 1 | 2.57 |
| cabin_gap | vehicle | 76,632 | 18,217 | 25,544 | n | position 3x76632, normal 3x76632, uv 2x76632 | 1 | 2.34 |
| fleet_tread | fleet | 37,860 | 25,240 | 12,620 | n | position 3x37860, normal 3x37860, uv 2x37860, color 3x37860, aWear 4x37860 | 1 | 2.17 |
| cabin_trimGloss | vehicle | 66,552 | 11,941 | 22,184 | n | position 3x66552, normal 3x66552, uv 2x66552 | 1 | 2.03 |
| fleet_gap | fleet | 35,484 | 16,348 | 11,828 | n | position 3x35484, normal 3x35484, uv 2x35484, color 3x35484, aWear 4x35484 | 1 | 2.03 |
| gear_steelDark | vehicle | 63,336 | 17,750 | 21,112 | n | position 3x63336, normal 3x63336, uv 2x63336 | 1 | 1.93 |
| body_chrome | vehicle | 53,016 | 8,962 | 17,672 | n | position 3x53016, normal 3x53016, uv 2x53016 | 1 | 1.62 |
| fleet_fabric | fleet | 26,568 | 4,592 | 8,856 | n | position 3x26568, normal 3x26568, uv 2x26568, color 3x26568, aWear 4x26568 | 1 | 1.52 |
| fleet_rust | fleet | 26,292 | 6,826 | 8,764 | n | position 3x26292, normal 3x26292, uv 2x26292, color 3x26292, aWear 4x26292 | 1 | 1.5 |

Instance buffers:

| object | group | instances | est. MB |
| --- | --- | --- | --- |
| grass_1_b2 | forest | 424 | 0.03 |
| grass_3_b2 | forest | 395 | 0.03 |
| grass_0_b2 | forest | 391 | 0.03 |
| grass_4_b2 | forest | 390 | 0.03 |
| grass_2_b2 | forest | 389 | 0.03 |
| forb_1_b2 | forest | 384 | 0.03 |
| forb_2_b2 | forest | 367 | 0.03 |
| forb_2_b1 | forest | 329 | 0.02 |
| forb_1_b1 | forest | 305 | 0.02 |
| litter_0_b14 | forest | 296 | 0.02 |
| litter_3_b14 | forest | 292 | 0.02 |
| grass_6_b2 | forest | 284 | 0.02 |
| campGrass | camp | 336 | 0.02 |
| grass_0_b7 | forest | 277 | 0.02 |
| grass_3_b7 | forest | 275 | 0.02 |
| grass_8_b2 | forest | 274 | 0.02 |
| grass_2_b14 | forest | 265 | 0.02 |
| grass_2_b7 | forest | 264 | 0.02 |
| litter_3_b8 | forest | 264 | 0.02 |
| grass_1_b14 | forest | 263 | 0.02 |

## A.5. Draw calls per group per view

Beauty pass calls, with the shadow-map and AO G-buffer calls the same group adds. One `InstancedMesh` is one call however many instances it carries; an object with an array material is one call per material group.

| group | hero beauty | mainroad beauty | camp beauty | lions beauty | interior beauty | hero shadow | mainroad shadow | camp shadow | lions shadow | interior shadow | hero G-buffer | mainroad G-buffer | camp G-buffer | lions G-buffer | interior G-buffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 6 | 6 | 6 | 5 | 0 | 0 | 0 | 0 | 0 | 4 | 4 | 4 | 4 | 4 |
| forest | 145 | 174 | 285 | 106 | 218 | 47 | 54 | 47 | 41 | 47 | 23 | 23 | 25 | 20 | 24 |
| vehicle | 160 | 160 | 160 | 75 | 117 | 103 | 103 | 103 | 103 | 103 | 134 | 134 | 134 | 65 | 95 |
| camp | 4 | 18 | 52 | 3 | 4 | 9 | 31 | 24 | 0 | 9 | 0 | 14 | 45 | 0 | 0 |
| fleet | 0 | 27 | 126 | 0 | 0 | 0 | 20 | 15 | 0 | 0 | 0 | 25 | 28 | 0 | 0 |
| wildlife | 0 | 4 | 4 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 4 | 10 | 0 |
| roadside | 2 | 9 | 10 | 5 | 5 | 5 | 10 | 5 | 6 | 5 | 2 | 9 | 10 | 5 | 5 |
| sky | 10 | 10 | 10 | 2 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dust | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

| phase | hero | mainroad | camp | lions | interior |
| --- | --- | --- | --- | --- | --- |
| shadow | 164 | 218 | 194 | 150 | 164 |
| beauty | 328 | 410 | 655 | 209 | 361 |
| override:MeshNormalMaterial | 163 | 213 | 250 | 104 | 128 |
| post | 23 | 23 | 23 | 23 | 23 |

## A.6. JS heap

| point | MB |
| --- | --- |
| after boot (first frame drawn) | 413.2 |
| after 5 census views | 410.1 |
| reset loop 1 (setView hero, resetAuto, 2.5 s drive, gc) | 233.4 |
| reset loop 2 (setView hero, resetAuto, 2.5 s drive, gc) | 233.5 |
| reset loop 3 (setView hero, resetAuto, 2.5 s drive, gc) | 233.4 |
| after loops, forced GC | 233.4 |

Growth over the 3 loops: 0.0 MB — no leak. Typed arrays count toward `usedJSHeapSize` in Chromium (checked: a 100 MB Float32Array moves it by 100.0 MB), so of the 233.4 MB steady state, geometry attribute arrays are 151.55 MB (they stay referenced after upload) and DataTexture pixel arrays another 114.11 MB — 114% of the heap is upload-side copies of GPU data. The canvas bitmaps behind the CanvasTextures (35.79 MB) are held by the browser outside the JS heap.

| group | DataTexture pixel MB in heap | geometry MB in heap |
| --- | --- | --- |
| terrain | 3.13 | 37.92 |
| forest | 54.81 | 0.73 |
| vehicle | 30.38 | 46.37 |
| camp | 17.66 | 12.05 |
| fleet | 5.38 | 43.96 |
| wildlife | 2.38 | 6.28 |
| roadside | 0 | 1.05 |
| sky | 0 | 0.03 |
| dust | 0.25 | 0.02 |
| post | 0.02 | 0 |
| other | 0.13 | 0 |
| other:groundContact | 0 | 0.06 |

## A.7. Boot stages

Time to first frame 49,537 ms in-page (SwiftShader; shader compilation dominates and is many times slower than on a GPU, but the *number* of programs it compiles is the same: 175, 0 of them for the canvas and unused).

| stage | ms | share |
| --- | --- | --- |
| Compiling noise kernel | 7 | 0.0% |
| Building sky | 62 | 0.1% |
| Grading the road | 6,385 | 12.9% |
| Planting the forest | 3,367 | 6.8% |
| Assembling the truck | 5,364 | 10.8% |
| Pitching camp | 2,396 | 4.8% |
| Parking the fleet | 1,060 | 2.1% |
| Finding the pride | 10,131 | 20.5% |
| Posting the signs | 178 | 0.4% |
| Compiling shaders | 19,737 | 39.8% |



---

# §B. Tool-generated census, `ultra` (`--tag r2-ultra-before`; headline, programs per group, triangles, textures by group, calls per group, heap, boot)

Build `cbf506a` (2026-09-06 20:32Z), quality `ultra`, 1280x720, renderer `WebKit WebGL` (WebGL 2.0 (OpenGL ES 3.0 Chromium)). Measured 2026-09-06T21:01:02.215Z from `http://127.0.0.1:5790/?quality=ultra` by `tools/census.mjs`.

Every number below is measured: from a hook on `renderer.renderBufferDirect` during one rendered frame per view, from `renderer.info`, from `renderer.properties`, or from the objects themselves. The only estimates are GPU texture bytes (width x height x bytes/texel x 4/3 when mipmapped) and geometry bytes (attribute byte lengths), and they are labelled. Frame times are not reported: this machine rasterises in software.

Groups are the top-level scene children and the module that built them: `terrain`, `forest`, `vehicle` (the truck), `camp`, `fleet`, `wildlife`, `roadside`, `sky` (dome, headlamp beams, light shafts and dust motes from sky.js), `dust` (wheel dust), `post` (compositor passes), `shadow` (the renderer's own depth materials).

## B.Headline

| view | draw calls (renderer.info) | beauty calls | shadow calls | AO G-buffer calls | post calls | triangles (renderer.info) | beauty tris | instanced tris | regular tris | beauty tris inside frustum | shadow tris | AO G-buffer tris | programs (cumulative) | textures | geometries | visible objects | visible instances |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hero | 636 | 417 | 219 | 209 | 24 | 3,371,678 | 1,775,372 | 673,816 | 1,101,556 | 736,956 (42%) | 1,596,306 | 1,669,848 | 178 | 298 | 389 | 402 | 21,542 |
| interior | 652 | 433 | 219 | 168 | 24 | 3,476,202 | 1,879,896 | 847,062 | 1,032,834 | 1,047,822 (56%) | 1,596,306 | 1,598,008 | 179 | 299 | 389 | 420 | 32,587 |

`renderer.info` counts the shadow-map pass together with the beauty pass; that is the number `debugAPI.stats()` and the perf reports quote (beauty + shadow = renderer.info in every row above). The AO G-buffer is the scene drawn a third time through `MeshNormalMaterial`, `SsrReflectors` as `scene.overrideMaterial`; the composer issues that render separately so it is not in `renderer.info`. The GPU therefore rasterises beauty + shadow + G-buffer triangles per frame: hero 5,041,526, interior 5,074,210. SSR is off at this quality tier, so its reflector-mask pass does not appear.

Programs: 179 compiled, of which 0 are canvas variants (tone mapping on) that no frame uses because the scene is always drawn into the composer's render target; 179 do the work. JS heap: 537.5 MB after boot, 566.9 MB after the 2 views, reset loops 319.5 / 319.1 / 319.1 MB, 319.1 MB after a forced GC. Textures: 296 objects, est. 802.9 MB. Geometries: 487, est. 224.63 MB.

Note that `hero` and `forest` draw exactly the same set of objects from different cameras: culling in this scene is by whole-object bounding sphere, and nearly every object (terrain, route-long stone mesh, forest-wide instanced meshes, the truck) is large enough to intersect any frustum near the truck. What changes between views is only which camp/fleet/wildlife objects fall inside.
### B.Programs per group

A program shared by materials in two groups is counted in both; `exclusive` is the number only that group uses.

| group | programs | exclusive | material links | by material type |
| --- | --- | --- | --- | --- |
| terrain | 7 | 7 | 7 | MeshStandardMaterial 3, ShaderMaterial 2, MeshLambertMaterial 2 |
| forest | 7 | 7 | 23 | MeshStandardMaterial 4, MeshLambertMaterial 3 |
| vehicle | 66 | 65 | 72 | MeshStandardMaterial 48, MeshPhysicalMaterial 13, MeshBasicMaterial 4, ShaderMaterial 1 |
| camp | 21 | 20 | 57 | MeshStandardMaterial 15, ShaderMaterial 4, MeshPhysicalMaterial 2 |
| fleet | 30 | 29 | 39 | MeshStandardMaterial 21, MeshPhysicalMaterial 8, ShaderMaterial 1 |
| wildlife | 9 | 8 | 22 | MeshStandardMaterial 5, MeshPhysicalMaterial 2, MeshBasicMaterial 2 |
| roadside | 2 | 2 | 10 | MeshStandardMaterial 2 |
| sky | 5 | 5 | 26 | ShaderMaterial 5 |
| dust | 1 | 1 | 1 | ShaderMaterial 1 |
| post | 23 | 23 | 23 | ShaderMaterial 19, MeshNormalMaterial 3, RawShaderMaterial 1 |
| shadow | 6 | 6 | 0 | MeshDepthMaterial 6 |
| other:groundContact | 1 | 1 | 1 | ShaderMaterial 1 |
| unattributed | 3 | 3 | 0 | MeshBasicMaterial 2, ShaderMaterial 1 |

## B.2. Triangles per frame

Beauty pass only (the shadow pass and the AO G-buffer are broken out in the group tables). `instanced` triangles are `instanceCount x triangles per instance` for `InstancedMesh`; `regular` is everything else.

### B.hero

Camera at (-30.67, 3.56, 5.74) fov 36, truck at (-36.58, 2.63, 1.76). Beauty 1,775,372 tris in 417 calls (673,816 instanced in 211 calls, 1,101,556 regular); shadow pass 1,596,306 tris in 219 calls. 408 objects drawn, 6 of them outside the frustum (`frustumCulled = false`) costing 512 tris / 6 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 479,690 | 0 | 44,003 (9%) | 5 | 5 | 0 | 0 | 5 | 728,864 |
| forest | 218 | 676,536 | 673,816 | 103,287 (15%) | 215 | 6 | 68 | 379,652 | 37 | 200,002 |
| vehicle | 160 | 582,388 | 0 | 582,388 (100%) | 154 | 60 | 103 | 424,284 | 165 | 737,274 |
| camp | 7 | 29,992 | 0 | 512 (2%) | 7 | 4 | 24 | 147,720 | 0 | 0 |
| fleet | 0 | 0 | 0 | - | 0 | 0 | 19 | 637,408 | 0 | 0 |
| roadside | 2 | 3,708 | 0 | - | 2 | 1 | 5 | 7,242 | 2 | 3,708 |
| sky | 23 | 1,002 | 0 | - | 23 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 936 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 736,956 of 1,775,372 beauty triangles (42%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 7,818 tris (3%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 1,563 tris (1%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 44 | 1 | 38,632 | 7/44 instances | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 36,768 tris (100%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 32,592 tris (100%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 29,964 tris (100%) | yes |
| campWear | camp | Mesh | campWear | - | 1 | 29,480 | 0 tris (0%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 31 | 1 | 29,450 | 2/31 instances | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 28,096 tris (100%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 44 | 1 | 27,984 | 6/44 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 25,544 tris (100%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 25 | 1 | 23,150 | 0/25 instances | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 31 | 1 | 22,754 | 2/31 instances | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 22,184 tris (100%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 21,112 | 21,112 tris (100%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 19 | 1 | 18,962 | 1/19 instances | yes |
| tree_dead_trunk | forest | Mesh | MeshStandardMaterial | 15 | 1 | 18,870 | 2/15 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 25 | 1 | 17,350 | 0/25 instances | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| forest/tree | 37 | 37 | 291,710 | 30,320 |
| terrain/terrain | 1 | 1 | 264,548 | 7,818 |
| vehicle/body | 42 | 48 | 217,444 | 217,444 |
| terrain/roadStones | 1 | 1 | 180,520 | 1,563 |
| forest/grass | 78 | 78 | 175,444 | 36,918 |
| vehicle/cabin | 28 | 28 | 146,676 | 146,676 |
| vehicle/tyre | 24 | 24 | 106,456 | 106,456 |
| vehicle/gear | 21 | 21 | 85,720 | 85,720 |
| forest/forb | 12 | 12 | 55,936 | 5,456 |
| forest/scrub | 21 | 21 | 49,330 | 6,836 |
| forest/litter | 29 | 29 | 35,592 | 7,480 |
| camp/campWear | 1 | 1 | 29,480 | 0 |
| forest/swath | 15 | 15 | 24,092 | 8,300 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| terrain/roadStoneShadows | 1 | 1 | 15,374 | 15,374 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| fleet/fleet | 19 | 19 | 637,408 |
| forest/tree | 31 | 31 | 286,396 |
| vehicle/body | 25 | 25 | 206,316 |
| camp/camp | 24 | 24 | 147,720 |
| vehicle/tyre | 24 | 24 | 106,456 |
| vehicle/gear | 21 | 21 | 85,720 |
| forest/scrub | 24 | 24 | 52,452 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 12,896 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 9,568 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| fleet_steel | fleet | - | 1 | 200,152 |
| fleet_trim | fleet | - | 1 | 89,114 |
| fleet_paint | fleet | - | 1 | 66,592 |
| fleet_tyre | fleet | - | 1 | 57,376 |
| fleet_tread | fleet | - | 1 | 52,796 |
| fleet_chrome | fleet | - | 1 | 40,176 |
| tree_umbrella_foliage | forest | 44 | 1 | 38,632 |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| fleet_gap | fleet | - | 1 | 36,552 |
| fleet_alu | fleet | - | 1 | 35,392 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 96 |
| fireSmoke | camp | Mesh | - | 1 | 96 |
| fireEmbers | camp | Mesh | - | 1 | 96 |
| fireEmbers | camp | Mesh | - | 1 | 96 |
| fireFlames | camp | Mesh | - | 1 | 64 |
| fireFlames | camp | Mesh | - | 1 | 64 |

### B.interior

Camera at (-36.17, 4.21, 1.61) fov 62, truck at (-36.58, 2.63, 1.76). Beauty 1,879,896 tris in 433 calls (847,062 instanced in 268 calls, 1,032,834 regular); shadow pass 1,596,306 tris in 219 calls. 426 objects drawn, 6 of them outside the frustum (`frustumCulled = false`) costing 512 tris / 6 calls.

| group | beauty calls | beauty tris | of which instanced | tris inside frustum (measured) | objects | programs touched | shadow calls | shadow tris | G-buffer calls | G-buffer tris |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 479,690 | 0 | 176,433 (37%) | 5 | 5 | 0 | 0 | 5 | 728,864 |
| forest | 275 | 849,782 | 847,062 | 470,334 (55%) | 272 | 6 | 68 | 379,652 | 36 | 198,302 |
| vehicle | 117 | 510,134 | 0 | 389,260 (76%) | 113 | 53 | 103 | 424,284 | 122 | 663,600 |
| camp | 7 | 29,992 | 0 | 1,497 (5%) | 7 | 4 | 24 | 147,720 | 0 | 0 |
| fleet | 0 | 0 | 0 | - | 0 | 0 | 19 | 637,408 | 0 | 0 |
| roadside | 5 | 7,242 | 0 | - | 5 | 2 | 5 | 7,242 | 5 | 7,242 |
| sky | 22 | 1,000 | 0 | - | 22 | 3 | 0 | 0 | 0 | 0 |
| dust | 1 | 1,120 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 936 | 0 | - | 1 | 1 | 0 | 0 | 0 | 0 |

"Tris inside frustum" is measured per triangle centroid for every regular mesh of 20k+ triangles and per instance bounding sphere for every InstancedMesh; smaller regular meshes are counted whole. It is the ceiling on what finer-grained culling can remove for this camera. Whole frame: 1,047,822 of 1,879,896 beauty triangles (56%) are inside the frustum.

Top 20 objects by triangles:

| object | group | type | material | instances | calls | tris | inside frustum | frustumCulled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| terrain | terrain | Mesh | MeshStandardMaterial | - | 1 | 264,548 | 87,340 tris (33%) | yes |
| roadStones | terrain | Mesh | MeshStandardMaterial | - | 1 | 180,520 | 54,471 tris (30%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 44 | 1 | 38,632 | 23/44 instances | yes |
| body_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 36,768 | 17,986 tris (49%) | yes |
| body_trim | vehicle | Mesh | trim | - | 1 | 32,592 | 13,393 tris (41%) | yes |
| body_steelDark | vehicle | Mesh | steelDark | - | 1 | 29,964 | 9,603 tris (32%) | yes |
| campWear | camp | Mesh | campWear | - | 1 | 29,480 | 985 tris (3%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 31 | 1 | 29,450 | 14/31 instances | yes |
| body_gap | vehicle | Mesh | gap | - | 1 | 28,096 | 10,711 tris (38%) | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 44 | 1 | 27,984 | 22/44 instances | yes |
| cabin_gap | vehicle | Mesh | gap | - | 1 | 25,544 | 10,475 tris (41%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 25 | 1 | 23,150 | 11/25 instances | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 31 | 1 | 22,754 | 14/31 instances | yes |
| cabin_trimGloss | vehicle | Mesh | trimGloss | - | 1 | 22,184 | 10,196 tris (46%) | yes |
| gear_steelDark | vehicle | Mesh | steelDark | - | 1 | 21,112 | 3,022 tris (14%) | yes |
| tree_umbrella_foliage | forest | Mesh | MeshStandardMaterial | 19 | 1 | 18,962 | 13/19 instances | yes |
| tree_dead_trunk | forest | Mesh | MeshStandardMaterial | 15 | 1 | 18,870 | 6/15 instances | yes |
| body_chrome | vehicle | Mesh | chrome | - | 1 | 17,672 | sphere yes | yes |
| tree_umbrella_trunk | forest | Mesh | MeshStandardMaterial | 25 | 1 | 17,350 | 11/25 instances | yes |
| gear_trim | vehicle | Mesh | trim | - | 1 | 16,264 | sphere yes | yes |

Beauty pass by object-name prefix (top 15; `body_`, `cabin_`, `gear_`, `tyre_` are the truck kits):

| group/prefix | objects | calls | tris | tris inside frustum |
| --- | --- | --- | --- | --- |
| forest/grass | 117 | 117 | 319,984 | 200,012 |
| forest/tree | 35 | 35 | 287,146 | 144,624 |
| terrain/terrain | 1 | 1 | 264,548 | 87,340 |
| vehicle/body | 33 | 37 | 210,798 | 135,071 |
| terrain/roadStones | 1 | 1 | 180,520 | 54,471 |
| vehicle/cabin | 28 | 28 | 146,676 | 119,619 |
| vehicle/gear | 15 | 15 | 78,452 | 60,362 |
| forest/litter | 39 | 39 | 56,720 | 38,784 |
| forest/forb | 12 | 12 | 55,936 | 26,324 |
| vehicle/tyre | 12 | 12 | 53,228 | 53,228 |
| forest/scrub | 24 | 24 | 52,452 | 26,564 |
| forest/swath | 22 | 22 | 33,112 | 12,440 |
| camp/campWear | 1 | 1 | 29,480 | 985 |
| vehicle/axles | 5 | 5 | 15,568 | 15,568 |
| terrain/roadStoneShadows | 1 | 1 | 15,374 | 15,374 |

Shadow pass, by name prefix (top 12) and top 10 casters:

| group/prefix | casters | shadow calls | shadow tris |
| --- | --- | --- | --- |
| fleet/fleet | 19 | 19 | 637,408 |
| forest/tree | 31 | 31 | 286,396 |
| vehicle/body | 25 | 25 | 206,316 |
| camp/camp | 24 | 24 | 147,720 |
| vehicle/tyre | 24 | 24 | 106,456 |
| vehicle/gear | 21 | 21 | 85,720 |
| forest/scrub | 24 | 24 | 52,452 |
| vehicle/axles | 5 | 5 | 15,568 |
| forest/log | 3 | 3 | 12,896 |
| forest/kopje | 3 | 3 | 10,260 |
| vehicle/brakes | 28 | 28 | 10,224 |
| forest/termite | 3 | 3 | 9,568 |

| caster | group | instances | calls | shadow tris |
| --- | --- | --- | --- | --- |
| fleet_steel | fleet | - | 1 | 200,152 |
| fleet_trim | fleet | - | 1 | 89,114 |
| fleet_paint | fleet | - | 1 | 66,592 |
| fleet_tyre | fleet | - | 1 | 57,376 |
| fleet_tread | fleet | - | 1 | 52,796 |
| fleet_chrome | fleet | - | 1 | 40,176 |
| tree_umbrella_foliage | forest | 44 | 1 | 38,632 |
| body_trimGloss | vehicle | - | 1 | 36,768 |
| fleet_gap | fleet | - | 1 | 36,552 |
| fleet_alu | fleet | - | 1 | 35,392 |

Drawn while outside the frustum (`frustumCulled = false`):

| object | group | type | instances | calls | tris |
| --- | --- | --- | --- | --- | --- |
| fireSmoke | camp | Mesh | - | 1 | 96 |
| fireSmoke | camp | Mesh | - | 1 | 96 |
| fireEmbers | camp | Mesh | - | 1 | 96 |
| fireEmbers | camp | Mesh | - | 1 | 96 |
| fireFlames | camp | Mesh | - | 1 | 64 |
| fireFlames | camp | Mesh | - | 1 | 64 |

## B.3. Textures

296 texture objects reachable from scene materials, post passes, the sky rig and the shadow map (293 distinct image sources; 281 have a GL texture). `renderer.info.memory.textures` says 299; the difference is textures the renderer owns that nothing in the scene graph points to any more (composer swap buffers' depth attachments, PMREM scratch, textures created and dropped during boot). Estimated GPU memory 802.9 MB (0 compressed). 0 texture(s) are 2048 on a side; 8 exceed 2048: PMREM.cubeUv 3072x4096 (sky:pmrem._pingPongRenderTarget.texture), PMREM.cubeUv 3072x4096 (sky:envTarget.texture), (unnamed) 4096x4096 (shadow:DirectionalLight), sun.shadowMap 4096x4096 (shadow:DirectionalLight), (unnamed) 4096x4096 (shadow:DirectionalLight), sunFar.shadowMap 4096x4096 (shadow:DirectionalLight), (unnamed) 3072x3072 (forest:MeshStandardMaterial.map [tree_umbrella_foliage, tree_flat_foliage +5]), (unnamed) 2200x1804 (camp:campWear.map [campWear]). Canvas-backed textures also keep their canvas alive on the CPU: 52.71 MB of RGBA bitmaps; the DataTextures keep their typed arrays (counted in the JS heap).

| group | textures | sources | est. GPU MB | CPU canvas MB | sizes |
| --- | --- | --- | --- | --- | --- |
| shadow | 4 | 4 | 256 | 0 | 4x 4096x4096 |
| sky | 3 | 3 | 192.02 | 0.02 | 2x 3072x4096, 1x 64x64 |
| forest | 43 | 43 | 135.08 | 0 | 16x 256x512, 12x 256x256, 5x 1536x1536, 4x 512x512, 3x 1024x256, 1x 3072x3072, 1x 768x768, 1x 128x128 |
| vehicle | 100 | 100 | 59.67 | 13.88 | 54x 256x256, 15x 128x128, 14x 512x512, 4x 64x64, 3x 1024x1024, 3x 512x320, 2x 512x256, 2x 192x224, 1x 512x288, 1x 512x128, 1x 256x72 |
| camp | 86 | 83 | 52.85 | 21.73 | 53x 256x256, 14x 128x128, 6x 64x64, 4x 512x512, 2x 1024x512, 1x 2200x1804, 1x 512x384, 1x 512x256, 1x 512x192, 1x 512x160, 1x 256x192, 1x 256x160 |
| post:gtao | 6 | 6 | 24.63 | 0 | 4x 1280x720, 1x 64x64, 1x 5x5 |
| post:smaa | 4 | 4 | 14.41 | 0 | 2x 1280x720, 1x 160x560, 1x 66x33 |
| wildlife | 9 | 9 | 14.19 | 8.27 | 2x 1024x1024, 2x 512x512, 2x 256x256, 2x 128x128, 1x 64x64 |
| post:bloom | 12 | 12 | 13.47 | 0 | 3x 640x360, 2x 320x180, 2x 160x90, 2x 80x45, 2x 40x23, 1x 1280x720 |
| fleet | 15 | 15 | 12.79 | 4.25 | 10x 256x256, 3x 512x512, 1x 1024x1024, 1x 256x128 |
| post:ssr | 2 | 2 | 10.55 | 0 | 2x 1280x720 |
| post:sanitize | 1 | 1 | 7.03 | 0 | 1x 1280x720 |
| roadside | 4 | 4 | 6.08 | 4.56 | 2x 256x256, 1x 1024x1024, 1x 128x128 |
| terrain | 5 | 5 | 3.71 | 0 | 2x 512x512, 2x 256x256, 1x 512x192 |
| dust | 1 | 1 | 0.25 | 0 | 1x 256x256 |
| other | 1 | 1 | 0.17 | 0 | 1x 128x256 |

Top 20 by estimated memory:

## B.5. Draw calls per group per view

Beauty pass calls, with the shadow-map and AO G-buffer calls the same group adds. One `InstancedMesh` is one call however many instances it carries; an object with an array material is one call per material group.

| group | hero beauty | interior beauty | hero shadow | interior shadow | hero G-buffer | interior G-buffer |
| --- | --- | --- | --- | --- | --- | --- |
| terrain | 5 | 5 | 0 | 0 | 5 | 5 |
| forest | 218 | 275 | 68 | 68 | 37 | 36 |
| vehicle | 160 | 117 | 103 | 103 | 165 | 122 |
| camp | 7 | 7 | 24 | 24 | 0 | 0 |
| fleet | 0 | 0 | 19 | 19 | 0 | 0 |
| roadside | 2 | 5 | 5 | 5 | 2 | 5 |
| sky | 23 | 22 | 0 | 0 | 0 | 0 |
| dust | 1 | 1 | 0 | 0 | 0 | 0 |
| other:groundContact | 1 | 1 | 0 | 0 | 0 | 0 |

| phase | hero | interior |
| --- | --- | --- |
| shadow | 219 | 219 |
| beauty | 417 | 433 |
| override:MeshNormalMaterial | 177 | 140 |
| post | 24 | 24 |
| override:SsrReflectors | 32 | 28 |

## B.6. JS heap

| point | MB |
| --- | --- |
| after boot (first frame drawn) | 537.5 |
| after 2 census views | 566.9 |
| reset loop 1 (setView hero, resetAuto, 2.5 s drive, gc) | 319.5 |
| reset loop 2 (setView hero, resetAuto, 2.5 s drive, gc) | 319.1 |
| reset loop 3 (setView hero, resetAuto, 2.5 s drive, gc) | 319.1 |
| after loops, forced GC | 319.1 |

Growth over the 3 loops: -0.4 MB — no leak. Typed arrays count toward `usedJSHeapSize` in Chromium (checked: a 100 MB Float32Array moves it by 100.0 MB), so of the 319.1 MB steady state, geometry attribute arrays are 229.01 MB (they stay referenced after upload) and DataTexture pixel arrays another 160.61 MB — 122% of the heap is upload-side copies of GPU data. The canvas bitmaps behind the CanvasTextures (52.71 MB) are held by the browser outside the JS heap.

| group | DataTexture pixel MB in heap | geometry MB in heap |
| --- | --- | --- |
| terrain | 2.88 | 37.92 |
| forest | 101.31 | 1.89 |
| vehicle | 30.38 | 46.37 |
| camp | 17.91 | 12.97 |
| fleet | 5.38 | 111.74 |
| wildlife | 2.38 | 12.47 |
| roadside | 0 | 1.12 |
| sky | 0 | 0.06 |
| dust | 0.25 | 0.02 |
| post | 0.02 | 0 |
| other | 0.13 | 0 |
| other:groundContact | 0 | 0.06 |

## B.7. Boot stages

Time to first frame 72,331 ms in-page (SwiftShader; shader compilation dominates and is many times slower than on a GPU, but the *number* of programs it compiles is the same: 178, 0 of them for the canvas and unused).

| stage | ms | share |
| --- | --- | --- |
| Compiling noise kernel | 15 | 0.0% |
| Building sky | 86 | 0.1% |
| Grading the road | 8,886 | 12.3% |
| Planting the forest | 6,801 | 9.4% |
| Assembling the truck | 5,423 | 7.5% |
| Pitching camp | 2,677 | 3.7% |
| Parking the fleet | 2,121 | 2.9% |
| Finding the pride | 13,193 | 18.2% |
| Posting the signs | 147 | 0.2% |
| Compiling shaders | 24,799 | 34.3% |


