# Changelog

Newest first. Every entry names the build it shipped in, which is also what the
HUD shows in the bottom-right corner of the running game, so a screenshot can be
matched to an entry.

**Live preview:** https://htmlpreview.github.io/?https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/offroad-truck-forza-demo-8461/demo/index.html
— follows the branch tip. Add `?quality=ultra` for a discrete GPU, `?time=dusk|night` for the hour.
**Local fallback:** `npm install && npm run dev`, or `npm run build:single` and open `demo/index.html` over any static server.

Performance numbers in this file are measured with `tools/perfrun.mjs` from the
game's own frame loop. The development box renders in software, so fps and
frame time recorded here describe the rasteriser, not a GPU; draw calls,
triangles, visible objects, textures, heap and boot stages are real everywhere.
Run `node tools/perfrun.mjs --gpu` on a machine with a graphics card for the
numbers the targets are about.

---

## Round 4, wave B — the plain, the camp, the lions' head and walk, the car's materials

**Build `80cb5e6`** — live, smoke-tested (HUD reads `build 80cb5e6 · 2026-09-05 02:52Z`, zero page errors). Five landings on top of `4bdaba9`, each gated alone against HEAD, then the combined tree gated at fast/high/ultra with the interaction checks before the deploy.

- **Lion head, round 5** (`4de6628`): rebuilt to measured skull ratios instead of
  adjectives — zygomatic width 0.59 → 0.63 of head length, muzzle depth 0.28 →
  0.34 L, interpupillary 0.39 → 0.46 of cheek width, ears 0.41 → 0.25 L as
  rounded triangles on the skull corners, nose leather 0.37 → 0.15 L. The
  bear/hippo read was two structural faults rather than proportions: the nose
  sat level with the eyes' lower rims (now 6 cm under the eye centre with a
  real stop) and crown–brow–bridge was one ramp (now flat crown, brow ledge,
  straight bridge). `tools/lionhead_measure.mjs` prints the ratio table from the
  built mesh. Head triangles unchanged.
- **Lion gait, round 4** (`b71aa5f`): stride scales with √speed and the cadence
  is derived from it every frame (walk 1.0 m/s: 1.20 m cycle, per-foot
  excursion 1.05 shoulder heights; a half-speed amble state); elbow and stifle
  fold ~30° extra in swing with a 7.5 cm arc and the paw peeling from the heel;
  counter-phase shoulder and pelvis roll, head bob 3.6 cm with pitch and yaw,
  tail sway lagging bone by bone to ±33° at the tuft. The 20 cm chest drop at
  the start of every walk was time-based swings overlapping as the cadence
  tightened — three feet airborne; the phase now resets at set-off. Feet at
  machine precision through 20 s of walk, lie and sit.
- **Campground, round 3** (`52355df`): the black slab under the mess awning was
  a literal 8 × 5 m dark ground sheet — removed, matt `envMapIntensity` 0.3 →
  0.8, wear overlay 0.25 → 0.6: shade 2.7 → 1.5 stops under sunlit dirt, the
  round-2 blocker closed. Fire: six standing core tongues at every tier, the
  hottest colour pulled off white (17 clipped pixels → 0), glow disc 3.5 → 5 m,
  light decay 1.5 → 1.0; far chairs 0.13 → 0.24. Two pole lanterns over the
  parking row (the fleet hand-off; row mean 0.084 → 0.131). Five trunk paths
  and three footpaths with scuffed margins, slot ruts that run past the
  vehicles, packed patches under every seat, litter. Log gate posts with a
  whole-log texture, rolled hems and ridge rolls on every canvas, a 9 m stain
  map over the weave. 49 → 51 calls, +8.7 k tris, 5 → 7 point lights.
- **Vegetation, round 4** (`135d432`): the plain had gone bald partly through a
  tier bug — the grass count rode on `treeCount`, so `fast` shipped 70 % of the
  grass; decoupled, density window widened, far falloff ×0.33 → ×0.6. Straw
  tufts in the lower third of `lion_far` 5 → 149. Two card heights, root
  darkening into soil hue, a soil collar under every clump. Crowns carry a
  baked top/underside gradient (0.42 → 0.87 stops) with a lighter atlas and no
  dark cluster rims; transmission is Lambertian and gated by sun elevation, so
  dusk crowns read olive with lit sprays instead of brown-black while dusk
  grass stays at 0.052 (round 2's bleach was 0.078). The "dead" night canopy
  was the self-measured fill collapsing under a night hemisphere at 9 % of
  day, not alpha — a per-material night floor holds crowns at 0.48× the sky.
  The brown treeline wall in the pride views was the strip's scrub foot running
  full width; gated, thinned to seven trees per strip, hazed. Scrub, forb and
  swath on 2×2 buckets: draw calls −27 to −97 on every view but `mainroad`
  (+14); triangles +10–16 % from the restored grass.
- **Hero car, round 4** (`80cb5e6`): the dusk grille was A/B'd term by term
  (lamps, bloom, glow, brightwork env, clearcoat each under 0.05; the key alone
  −0.27) — lighting's key 4.0 takes it to clip 0 %, and lamp emissive and spot
  levels are now hour-keyed. Side glass gets its own wind-streaked roughness and
  a grazing term (door glass see-through held at 0.91). Screen dust reshaped to
  a cowl with a wiper ridge; the laterite film stops at the cabin box. Cabin
  soil per key with curvature-gated grime — the crackle net on column and dash
  is gone, night dash glow intact. The live mirror pass measured 98 calls /
  1.03 M tris per pane at high and zero passes from the seat (outboard face
  culled), so `fast` keeps a painted mirror, now sky / horizon / plain with the
  truck's own flank ray-tested in. Headlamp spot 13 → 40 at night aimed 6°
  down: pool +2.1 → +3.8 stops over the ground beside it. Paint
  `envMapIntensity` 0.3 → 0.75: the horizon band reads across door and wing.
  540 calls / 1.93 M tris before and after.
- Round-4 frame set shooting into `shots/round4/`; three blind critics score it
  against round 2 next.

## Gauntlet round 2 verdict, and the round-4 fixes for what it found

**Build `4bdaba9`** — live, smoke-tested (HUD reads `build 4bdaba9 · 2026-09-05 01:11Z`, zero page errors).

- **Verdict.** Three blind critics on 103 frames of `a8ca6eb` against round 1
  (`gauntlet/round2/critic_{A,B,C}.md`, consensus in `CONSENSUS.md`, 35 key
  frames in `frames/`): "round 2 fixed the car and broke the world." Hero car,
  glass, tyre contact, day shadows and gait scored up; the night sky (20 % of
  sky pixels lit — snow), the far hills (saturated cobalt, darker than the sky),
  the black shade under the mess canopy and the lions' eyes scored down two to
  three points. Round 2 therefore **did not pass** the non-regression gate, and
  had been deployed before the critics scored it; those three regressions were
  treated as blocking for this deploy. Four findings were the tools, not the
  game, and are fixed: the chase camera "inside the flank" was the HUD
  screenshot catching the camera mid-transition (`rig.snap()`), glass frames at
  half resolution, the HUD stamp naming the bundle commit, and a soil hue that
  measured unchanged.
- **Stars** (`4bdaba9`): points instead of pixel-floored discs, the dusting grid
  removed, the Milky Way a smooth band; the night palette had been converted to
  linear twice so the dome rendered black under the grade's grey lift. Sky pixels
  over 0.35 luma in the night hero: 19.8 % → 0.75 %. Night ground under the
  horizon again (pad/horizon 2.4 → 0.68); moon key, fill and grade retuned.
- **Hills** (`2c77f7f`): the hill airlight is now the displayed sky at the ray's
  own elevation (no cooling multiplier, no `hillSkyK`), the far mesh folded onto
  a sphere past 860 m, the straw flat and the forest skirt brought to the near
  terrain's level with a shared distance falloff. Hills sit at 0.72–0.92 of the
  ridge sky with saturation 0.47 → 0.25; the cream band is gone.
- **Camp shade** (`4bdaba9`): day hemisphere 0.5 → 2.5 with the sun 9.4 → 7.9 —
  the shade was hemisphere + environment and nothing else. Sunlit/shade 3.4 →
  2.25 stops; the chairs under the awning read (0.14 → 0.26). The rest is the
  camp's wear decal (`envMapIntensity` 0.25) and the terrain's indirect response,
  handed to their owners.
- **Dusk hero front** (`4bdaba9`): the clipped grille was a 7.0 key square to a
  6° sun, not the lamps; key 4.0 with a softer grade knee, clipped pixels
  14.5 % → 2.8 %.
- **Lions, round 4** (`b3f403b`): eyes set lower, closer and forward with 70 % of
  the iris visible (was ~35 %), amber iris with pupil and catchlight; mouth as a
  seam, ears 20 % smaller and ovoid; loft normals continuous across rows;
  forearm/gaskin +22 %, head +8 %; paws as feet, not boots; contact blobs per
  paw and body (chest dirt 1.47 stops under open dirt); a sheen so the dusk key
  rims the coat. Feet probe unchanged at machine precision.
- **Fleet, round 3** (`62d7e42`): lamp pools only under lit lamps, a seven-vehicle
  night set (markers, one arriving with headlamps, a dome light, a lit camper
  window), night hemisphere floor, neutral panes instead of the laterite film,
  motorcycle re-lathed, wheel contact blobs, and the trailer framed from its
  body box.
- **Hero car, round 3** (`d8b40ec`): live door mirrors at high/ultra (a 192×224
  target per pane from the eye reflected through the pane, one pane per frame,
  live within 5 m; ~105 calls per pass), lamp glow with a hot core and coloured
  rim, brake and reverse logic, a bedside ladder, calipers that read through
  the spokes, the cabin neutralised from amber.
- HUD: tight text shadow for legibility over sunlit dirt; the key legend rests
  ten seconds after the first gesture; type dims at night. Favicon request
  silenced.
- Running: hero-car materials (side-pane Fresnel, interior crackle, mirror at
  fast, beam pool), lion gait (stride, swing flexion, head and tail), lion head
  to measured skull ratios, campground (fire reach, fleet-row lanterns, paths,
  timber), vegetation (plain density, crown shading, night canopy, treeline).

## Gauntlet rounds 2 and 3 — every family rebuilt once

**Build `a8ca6eb`** — live, smoke-tested (HUD reads `build a8ca6eb · 2026-09-04 19:19Z`, zero page errors).

Eleven landings since `45a2074`, each gated by `tools/gate.mjs` (HEAD plus the
files being landed, built in a throwaway worktree, booted at fast/high/ultra
with program link status and page errors read back, then the interaction
checks). Frames for the critics are being shot into `shots/round2/` by
`tools/baseline.sh`; their verdict follows in the next entry.

- **Lions, rounds 2 and 3** (`01711a7`, `db81bb4`): body rebuilt with limb
  volumes and a heavier torso; gait and lie/sit on the feet solver; head
  rebuilt as a cat's — superellipse skull loft with brow ridge, zygomatic arch,
  whisker pads, a longer and deeper muzzle, eyes forward in carved sockets
  (1.35× and the cornea to match), broad nose leather, cupped ears on the sides
  at brow level; coat re-palettised tawny-ochre with dorsal darkening and worley
  tuft breakup instead of streaks; four-lobed paws with claw sheaths; the male
  mane's shell chain ends inside the skull with tapered shells and a 512 px
  strand map at every tier. The blink closes the full opening.
- **Glass, round 2** (`7cae2bd`): premultiplied panes so the PMREM reflection
  lands at full strength; neutral near-black tints; flat-metal mirror with a
  graded ground half; gasket and proud edge rim on every pane; frit bands; the
  black band behind the door glass was `body_gap` running 110 mm above the
  beltline — capped.
- **Lighting, rounds 2 and 3** (`e385d26`, `515984f`, `2e6dbc9`): a second
  shadow cascade (±130 m, 2048², texel-snapped) so the camp and the pride cast
  shadows from the road; the far map renders in its own pre-pass with casters
  picked by name and world size — 305 → 79 calls, 0.97 → 0.51 M tris. Night
  has a moon key, point stars and a Milky Way and a scotopic grade; dusk a
  lower, stronger sun. Fog now converges on the *displayed* sky dome evaluated
  at the ray's elevation and azimuth, so the sun-side plain no longer fogs to a
  cream band brighter than the sky (`camp_beyond` strip hue 136 → 210, matching
  the sky's 217). The PCSS installer stops at the cascade body — at high/ultra it
  had been replacing the cascade function and breaking 107 programs.
- **Terrain, round 2** (`a51ba8b`): roadside stones sunk, laterite-tinted,
  fewer and larger; far hills to Lambert with haze that follows the ray's
  elevation and a luma cap under the sky; the water hole's reflection had
  `flipY` on and read the zenith at grazing angles — fixed, with a dielectric
  Fresnel, khaki murk and a shore ring; mainline ruts with a compacted dark
  centre and lit lip.
- **Vegetation, round 2** (`0f8c00e`): grass glowed at dusk because the
  lamp-transmission path fired on the sun (view-space direction compared with a
  world-space `uSunDir`); per-instance scale/hue/value jitter and an fbm density
  mask replace identical clumps; acacia crowns get ragged tile edges, three
  tiers of fill cards, alpha-cut shadows; far trees to Lambert with fog.
- **Campground, round 2** (`e6385a2`): fire rebuilt (4-frame flame atlas,
  standing and rising tongues, embers, ground glow, charred logs); canvas with
  catenary sag and translucency; the gate 'slab' was a shadow-casting track
  overlay — now twin ruts that fade; footpaths, ash spill, woodpiles, jittered
  parking.
- **Fleet, round 2** (`5c16d3e`): trailer level on its jockey stand, every tyre
  on the ground, hour-gated lamps, real glass, a parking row that is not a row.
- **Hero car, round 2** (`308c476`): tyres deform in the vertex shader (21 mm
  squash by suspension load, flat patch sunk into the soil, sidewall belly,
  dirt line); one-mesh occlusion blobs under each tyre and a chassis pool
  sampled on the terrain; a 96-quad-per-wheel tread-track ring buffer; the old
  pale contact decals are gone (−4 draw calls).
- Measured on the integrated build at `fast` after the far-pass cull
  (`perf/…0f8c00e+.json`): sampled frame 962 → 649 draw calls, 3.35 → 2.38 M
  triangles, 168 programs; boot compile at `fast` 31 s under SwiftShader.
- Round 3 builders running: horizon integration (hills 1.3 stops under the sky
  at their base, the 0.56 straw flat, the skirt's lit term) and the hero car's
  geometry round (arches, brakes, suspension, lamps at night, cabin colour,
  door mirrors at high/ultra).

## Gauntlet round 1 — verdict, and two measured wins

**Build `45a2074`** — live, smoke-tested (HUD reads `build 45a2074 · 2026-09-04 14:17Z`, zero page errors).

- Three blind critics scored the baseline (`gauntlet/round1/critic_{A,B,C}.md`);
  consensus and the disagreements that were investigated rather than averaged
  are in `gauntlet/round1/CONSENSUS.md`, key frames in `gauntlet/round1/frames/`.
  Weakest area by unanimous verdict: the lions (head, proportions, coat, gait);
  system defect: glass and reflections; highest-leverage fix: shadow coverage —
  the sun's shadow box is 44 m around the truck, so the camp and the pride are
  shadowless from the road.
- Two unanimous critic findings were capture artefacts and are fixed in the
  tools: the walk strip's camera followed the lion (read as sliding feet — the
  probe was right, the feet hold), and the camp/lion tools did not move the
  shadow frustum with the teleported truck. Lion far/pride/seat and camp
  arrive/interior cameras re-planted so they show their subjects.
- HUD key strip wraps clear of the speed block at narrow widths.
- **Shader programs 277 → 159**: the boot compile ran with the screen bound and
  built every program tone-mapped, then the composer built them all again
  linear; now compiled into the composer's target. Draw calls and triangles
  unchanged.
- **JS heap 332 → 216 MB**: DataTexture pixel arrays dropped after upload
  (109 MB that was never read again). Flat over reset loops; frames identical.
- `perf/census-r1.md`: a measured attribution of programs, triangles, textures
  and heap to modules, with ten ranked wins; the rest go to their owners in
  round 2/3 (terrain tiles, fleet per-vehicle merge, forest cells, kit
  indexing, shadow-caster list, cache keys).
- Round 2 builders running in parallel: lion body+gait, lion head, glass,
  lighting, road/terrain, fleet, vegetation, campground.

## Gauntlet round 1 — baseline

**Build `8754528`** — live, smoke-tested (HUD reads `build 8754528 · 2026-09-04 12:46Z`, zero page errors).

- Removed the forest-era ridge cards: two unlit, unfogged rings of pale ridge
  silhouette at 560/690 m that stood among the far hills as a band brighter
  than the sky, with a dark line at their base. The horizon is the terrain's
  hills now. Before/after `shots/iter_16/forest.png` → `shots/cand_noridge/forest.png`.
- Seven fixed cameras for the car-glass gauntlet (`glass_*` views), hidden from
  the default capture and the digit keys. Round-one glass frames in
  `shots/glass_r1/day/`.
- `gauntlet/RUBRIC.md`: the eighteen categories, scale, report shape and gate.
  97 baseline frames in `shots/round1/`; three blind critics score them.
- Measured (`fast`, software raster): 453 calls, 2.57 M tris, 277 programs,
  275 textures, heap 334 MB flat over three reset loops, zero errors. Shader
  compile is 24.3 s of a 43 s software boot; the program count is the next
  performance target.

## Safari, iteration 16 — the biome change

**Build `2f0f5ba`** — live, smoke-tested (page boots, HUD reads `build 2f0f5ba · 2026-09-04 12:07Z`, zero page errors). Supersedes `34d3fc8`, which lacked the lions.

- **The pride landed**: a maned male, three lionesses, two cubs on a 34-bone
  skeleton with three detail tiers. Feet are solved, not approximated —
  independently re-run: 1,200 frames, 268 steps, max penetration 2.3e-14 m,
  max planted-foot slide 8.5e-14 m. Frames in `shots/lion_16/`. Round-one
  inventory for the lion gauntlet: the face is the weak point (small head,
  boxy muzzle, a mouth line that reads as a grin, fur as smooth suede), the jaw
  never opens, and the mane has no chest fringe.

### What changed

- **The world is East-African savanna.** Laterite roads, straw grassland, umbrella
  and flat acacias, marula, thorn scrub, dead trees, three granite kopjes,
  termite mounds, a dry riverbed under a culvert, a water hole with a mud margin,
  far hills. Trees thin toward the open plain.
- **Two roads and a route.** The spur crosses a graded gravel mainline; auto-drive
  turns toward the camp. A graded pad, an access apron, an overlook with a
  signboard, park signs, kilometre posts, a ranger boom gate.
- **A tented camp**: 118 objects, twelve parking slots, a lookout, radio mast,
  solar, water, fuel stored away from fire, thorn boma, fire pits with GPU
  particles and lanterns that light at night.
- **A fleet of twelve** (sixteen at `ultra`) across ten kinds, none clones.
- **Four hours**: day, dusk (golden hour), night, overcast; kilometre haze,
  crepuscular rays through dust, heat shimmer.
- **The hero truck** gains a roof tent, spotlight, swing-out spare, fridge slide,
  reverse lamps, laterite dust with bush scoring — and its glass, which round zero
  of the glass gauntlet found had never been rendering (see PROGRESS.md).
- **Sound**, all synthesised: engine with audible upshifts, tyres that change
  with the surface, wind, a savanna ambience bed, horn on `H`.
- Seven camera modes, a revision stamp in the HUD, a deploy tool that proves the
  live page serves HEAD, and a performance harness.

### Measured (`fast`, software raster — structural numbers are real, fps is not)

| | before | after |
|---|---|---|
| draw calls | 429 | 395 (hero) · 483 (camp arrival) |
| triangles | 3.64 M | 2.16 M |
| ride, chase / cockpit vertical RMS | 1.24 / 1.35 m/s² | 1.12 / 1.06 m/s² |
| worst in-game frame | 13,870 ms | 774 ms |
| heap over 3 reset loops | — | +0.2 MB |
| camera checks | 21 | 33, all passing |
| console / page errors | 0 | 0 |

### Frames

`shots/iter_16/`, `shots/iter_16d/`, `shots/iter_16n/`, `shots/camp_16/`, `shots/camp_16n/`.

### Known limitations

- The lions are still in flight; the wildlife camera points at where they will be.
- A pale band and a thin dark line at the far skyline (vegetation skirt at
  420 m plus forest-era ridge cards).
- Water reflections still forest-blue.
- GPU time reports n/a under the software rasteriser.

### Failed experiments

- Building the deploy bundle from the working tree while agents were editing:
  failed twice on half-finished terrain imports. Deploys now build from HEAD.
- Stubbing the Vite client with an empty body to survive HMR reloads: strips
  `define` and breaks the build stamp. Three agents hit it; the stub keeps the
  env module now.

### Next weakest area

The lions, then the far skyline band, then gauntlet round one across every
family with three critics.
