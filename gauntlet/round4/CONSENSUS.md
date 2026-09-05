# Round 4 — consensus of three blind critics

Incumbent: round 2, build `a8ca6eb` (`shots/round2/`). Candidate: round 4,
build `80cb5e6` (`shots/round4/`, 103 frames, shot from a clean worktree at the
`80cb5e6` bundle commit; `SOURCE` records the served URL). Critics A, B and C
(`critic_{A,B,C}.md`) worked blind of one another and of the builders' reports,
read code only via `git show 80cb5e6:`, and measured what they scored. Key
frames are re-encoded in `frames/`.

## Verdict: **pass** — the first round since the gauntlet began to pass first time

All three critics pass the candidate on the rubric's terms. Round 4 is the
materials round; Materials rose in every family that can show them for A and B
(Hero car, Car glass, Fleet, Campground, Road, Vegetation, Lions 6→7 / 6→7 /
5→6 / 6→7 / 6→7 / 5→6 / 4→5) and in Car glass, Campground and Lions for C, flat
elsewhere and down nowhere. Mean over every scored category: A 5.67 → 6.19,
B 5.70 → 6.30, C 5.44 → 5.83.

No category of any family dropped by more than one point. The drops, each of
exactly one:

| Family / category | Critic | Frame | Cause |
|---|---|---|---|
| Hero car — Visual cleanliness 6 → 5 | B, C | `truck_night/hero.png` | light-bar bloom slab (B: 1 435 px over Y 0.5 vs 53; C: 6 850 px) and the "two moons" (below) |
| Car glass — Transparency 8 → 7 | A | `glass/ws_mid.png`, `moving.png`, `side_shade.png` | `see` down 0.05–0.09 on every daytime pane, veil up ~0.02 |
| Lions — Visual cleanliness 6 → 5 | C | `lions_dusk/lion_close_dusk.png` | contact decal greys the dusk ground instead of darkening it |

Colour/atmosphere, the category that failed round 2's gate, is back from 3–4
to 6–7 in Lighting, Road & terrain and Campground for all three.

The pass is not a clean bill. B: "the sky fix exposed a lamp defect that was
hiding under the snow, and the hill fix moved the value error rather than
removing it." C carries two items as blocking into round 5 (the night hero's
discs and `lion_far`'s hills). Both are in the round-5 briefs below with the
critics' numbers as the acceptance test.

## The three round-2 blockers

| # | Blocker | A | B | C | Status |
|---|---|---|---|---|---|
| 1 | Night sky as snow | 19.45 % → **0.15 %** of sky over Y 0.35, 22 stars ≤ 7 px, band reads | 20.3 % → **0.13 %** for the star field (10.55 % raw, of which 10.42 is three glows) | 19.87 % → **0.13 %** with the glows masked, 32 stars of 1–3 px | **Closed.** The raw figure is a new defect (below), not stars. Truck legible: flank Y 0.113 (A), +0.6 st over the sky (B), 3 011 green px (C). |
| 2 | Far hills cobalt / cream band | sat 0.41 → 0.13–0.19, band gone (`lion_far` band ÷ hill 0.00 st); `camp_beyond` 1.01 of sky, `lion_far` 0.61 | sat 0.42 → 0.21; sun-facing crests 1.02–1.24 of sky on four of eight ridges, backlit ridge 0.57 | sat ≤ 0.24 everywhere; `mainroad` 0.62 → 0.87 of sky, `camp_beyond` 1.02, `pickup_0_day` 1.03, `lion_far` near ridge 0.54 | **Half closed.** Saturation and the band are done. Value is not: hills into the sun are under the 0.72 floor (0.54–0.61), hills with the sun behind meet or exceed the sky (1.01–1.24). |
| 4 | Shade under the mess canopy | −6.3 → −2.85/−3.24 st, chairs readable, edge a 16 px dithered line | 2.6 → **1.5 st** on the open floor, table pockets 2.7–3.7 st, edge ~10 px | darkest tenth 6.15 → 3.44 st, pockets 2.8 st, ~60 px ramp | **Half closed.** The open floor is on target; the occluded pockets under the tables are a stop and a half too deep. The three critics measured three different regions and all three numbers are right. |

## Investigated rather than averaged

Nine readings contradicted each other or the builders' evidence. Each was
checked against the frame, the build or a probe before it went into a brief.

1. **"The moon is a soft blob with no disc" (A), "moon 1 960 px plus a bloomed
   star 259 px" (B), "two roof-bar beam-slice discs" (C)** — the two cool discs
   at (73, 64) and (187, 70) in `truck_night/hero.png`. Probed on a served
   `80cb5e6`: they survive hiding the sky (no stars, no moon), the dust points,
   every scene root and every post pass; the moon projects to screen (1 490,
   −1 385) at 51° elevation with the camera pitched 2.4°, so it is not in the
   frame at all. With everything but the lights hidden, the frame holds a row of
   cool discs along the light bar's line and a row of warm ones along the
   headlamps', each stepping away from its lamp and shrinking — the headlamp
   beams' cross-section slices. `fast` draws a beam as 12 quads spaced by a
   1.35 power along the axis; from the hero camera, 55–65° off the beam axis,
   each slice's bright core reads as its own soft disc. (My hide of the beam
   group had not held because `update()` sets `group.visible = true` every
   frame.) **C is right about the mechanism; A and B were reading the moon into
   it.** Owner: lighting — more slices at `fast` and an off-axis fade so a
   broadside camera sees a cone, not a string of discs.
2. **"Crown gradient and transmission are at their defaults" (C).** They are
   not: the acacia crown material passes `crownGrad: 1.0, trans: 1.1,
   transMax: 0.8, transPeak: 2.5` (`forest.js` ~2615–2627). The finding that
   stands is the measurement, not the cause: a dusk crown at median Y 0.036
   against a sky of 0.329 is 3.2 st down (round 2 was 4.1) with the knobs on.
   The lever is the shader's cap — transmission is bounded at `transMax` × the
   lit face, and at a 6° sun the lit face is itself in shade. Owner: vegetation.
3. **Trailer framed on a tarp (A, B, C — three rounds running).** A tool
   defect, and now understood: `fleetshots.mjs` tests camp structures as
   occluders with a `Raycaster` it built from a second three imported at
   `/node_modules/three`, which only the dev server serves. Every baseline is
   shot from a preview server, so the import 404'd and the camp raycast was
   silently off; the trailer is parked beside the mess tents. `debugAPI.THREE`
   now carries the bundle's own three and the tool uses it (`7b83ecf`); re-shot,
   the tool orbits 10° and the trailer is clear. Not a fleet defect.
4. **The walk strip (A: "59 px in eight frames", B: "stride short, swing a
   scissors", C: "strip is 0.96 s — a tool defect").** C is right. The strip
   stepped 0.12 s from 6 m: 0.84 m of travel, a quarter of the frame, seven
   tenths of one stride cycle. It now steps 0.3 s from 8 m (`0fa387c`): two
   cycles, the lion crossing from the left third to the right, and it is
   re-shot for the incumbent into `shots/round4/lions_walk_fixed/`. Every gait
   reading in this round — stride, elbow and stifle flexion, head bob, tail —
   is re-judged on that strip in round 5. B's stride fix (×1.6 reach) is
   withheld until then; the builder's probe puts the walk at 1.20 m per cycle
   and 1.05 shoulder heights per foot, which is a lion's.
5. **"A possible source/frame mismatch on the lion head" (A).** None. The
   frames were shot from a worktree at the `80cb5e6` bundle commit, whose
   source includes the round-5 head (`4de6628`); the HUD stamp in `hud.png`
   is that commit. A's reading stands as a finding: lying and seen from the
   side (`lions_day/lion_side.png`), the head still reads bear-like.
6. **Mirror `see` 0.589 → 0.331 (B: "shows nothing at `fast`").** The metric
   correlates the pane against the door well behind it; a pane now painted with
   sky, horizon and plain cannot score on it and a real reflection never will.
   A's visual read is the one to act on: the horizon card is a flat gradient at
   a fixed height and shows no truck flank. The car builder's own report says
   why — the mirror glass is aimed ~13° back of straight outboard, so from the
   seat it is culled and the painted flank never faces the camera. Owner: car
   (geometry, `body.js`) with the gauntlet's mirror camera moved to match.
7. **"Pride plain still bald" (A, B) against the vegetation builder's 5 → 149
   tufts in `lion_far`.** Both true. The plain came back; the pride's own
   ground did not, and A read the code for why: the grazed ring runs to 20 m
   with its tufts scaled to 0.68 *and* thinned (`lerp(1, 0.7, lawn)`) *and*
   forbs cut at `lawn > 0.3`, so `lion_pride`'s whole near ground is short,
   sparse straw (18.6 % cover against `lion_far`'s 42.5 %). A's fix is the
   brief: graze radius 20 → 14 m, size 0.68 → 0.8, forbs through at `lawn > 0.6`.
8. **`camp_interior.png` (A, B, C).** The brief named it as a canopy-shade
   frame; it is the cab at the gate. A brief error, not a defect.
9. **Hero paint — "a clearcoated dielectric" (A, B; Materials 6 → 7) against
   "satin enamel with no clearcoat, the brightest 1 % just reaching sky
   luminance" (C; 6 → 6).** One point apart, so not investigated; both
   measured. C's fix is the next materials step: a real `clearcoat: 1.0,
   clearcoatRoughness: 0.15` with the flake normal on `clearcoatNormalMap`
   rather than a brightened satin lobe.

## Where the critics agree

| # | Finding | Frames | Owner |
|---|---|---|---|
| 1 | **The night hero's three hot spots** — the light bar as a blown slab (B 1 435 px over Y 0.5, C 6 850 px; nine pods invisible, one plateau row at Y 0.7), and the beam-slice discs (#1 above). The first night frame has three things in it brighter than anything real. | `truck_night/hero.png`, `front.png` | car (bar cover), lighting (beams) |
| 2 | **Hills against the sky.** Sun-facing crests 1.01–1.24 of the sky (`camp_beyond`, `mainroad` left ridge, `pickup_0_day`, `lion_far` right ridge); into the sun `lion_far`'s near ridge at 0.54–0.61 against a 0.72 floor. All three name the same span: `hazeChunk`/`buildFarHills`, `hillFog = smoothstep(100, 650, d) * 0.76` and `hillAir` capped at 0.92 of an airlight measured in the hill's own direction. B's fix is the simplest: clamp the fogged colour to 0.9 × the sky sample at that pixel, and lower the lit scrub albedo so the clamp is a guard. | `truck_day/mainroad.png`, `camp_day/camp_beyond.png`, `lions_day/lion_far.png`, `fleet/pickup_0_day.png` | terrain |
| 3 | **Shade pockets under the mess tables 2.7–3.7 st.** Receivers, not the light: `campWear` decal `envMapIntensity` 0.6 → 1.0–1.2 (A, C), the terrain folding `surfAo` into albedo and again into the indirect term in shade (A), day `shadow.farRadius` 2.4 → 3.6 with a `farStrength` 0.92 (A), `hemi.ground` toward the sunlit laterite (C), a local warm fill under the fly (B). | `camp_day/camp_mess.png` | campground, terrain, lighting |
| 4 | **The lion is a plush toy** — Silhouette 5, Geometry 5, Materials 5, the lowest on the board. Body: a constant-radius loft with Gaussian "muscle" mounds, no scapula plane, no hip knuckle, no belly tuck (A, B, C). Fur: isotropic mottle with no rim response (A, B, C — all three name `sheen` 0.4–0.6 and an anisotropic grain). Eyes proud of the face as full spheres with a sclera ring (A). Muzzle welded to the skull with a crease from the eye's outer corner (B). Contact decal greys the dusk ground (C: −0.38 st, blue +11; `MultiplyBlending`, white colour). | `lions_day/lion_face.png`, `lion_close.png`, `lion_side.png`, `lions_dusk/lion_close_dusk.png` | lions |
| 5 | **The water hole is mud** — 0.57 st under the sky and 0.03 st from the mud beside it, a stepped shore, no kopje reflection (B, C; Road & terrain Reflections 3 for C). C traced the number: `fres = 0.08 + 0.62·(1−f)^5` over the hole gives 0.23 at the pride camera's grazing angle, so three quarters of the pixel is murk. | `lions_day/lion_pride.png`, `lions_dusk/lion_pride_dusk.png` | terrain |
| 6 | **Daytime panes veil more** — `see` down 0.03–0.09 on nine of twelve conditions, uniform dust with no wiper arc or sill build-up (A, B, C). Fixes agree: the grazing gain ~30 % down, dust moved from the diffuse map to roughness/alpha and settled to the bottom 15 % of the pane, wiper arcs. | `glass/ws_mid.png`, `moving.png`, `side_shade.png`, `rear_dust.png` | car glass |
| 7 | **Dusk crowns opaque; crowns lit as a disc** — 3.2 st under the sky at dusk; by day the split is top/bottom regardless of sun azimuth (B), the crown one green (C). | `truck_dusk/forest.png`, `truck_day/forest.png` | vegetation |
| 8 | **Night ground black beyond the lamps** — `truck_night/mainroad` ground median Y 0.011 (round 2 0.032), `road` 0.008, foreground p5 0.0013; the moon key's shadow side has no texture (A, C). `hemi` 0.22 → 0.35, moon key 0.4 → 0.6, `shadow.intensity` 0.88 → 0.78 — while the night pad stays under the sky (≤ 0.7 of it), which lighting fought for in round 4. | `truck_night/mainroad.png`, `road.png` | lighting |
| 9 | **Firelit ground saturates** — sat 0.72 within 3 m of the pit, 0.55–0.58 at 8 m (B, C). Desaturate the fire's `PointLight` toward (1.0, 0.72, 0.45), decay 1.0 → 1.6, distance 20 → 14; keep the night grade's saturation push off the fire layer. | `camp_night/camp_fire_night.png`, `camp_mess_night.png` | campground, lighting |
| 10 | **The parked row is unlit at night** — bodies at Y 0.009 against a sky of 0.011 (A, C). The two pole lanterns are there and do not reach: `rowLamp` 12 → 18, distance 14 → 18; fleet paint `envMapIntensity` 0.3 → 0.5; chrome/alloy flat grey with no environment (B: `metalness 1, roughness 0.12, env ≥ 1.4`). | `fleet/safari-jeep_1_night.png`, `suv_0_night.png`, `ranger_0_night.png`, `suv_0_day.png` | campground (lights), fleet |
| 11 | **Timber one tone** — no end grain, no checking, one roughness (A, C). | `camp_day/camp_gate.png` | campground |
| 12 | **HUD** — legend contrast 1.5–1.7 over sunlit dirt and sky (A, C: a plate or a 1 px stroke); night hint opacity 0.3 → 0.42–0.45 (A, B); speed unit with no weight hierarchy (B, C); hint row wraps to three lines at 640 (B). C's "hide the build stamp" is declined: the stamp in the running game is a requirement of the brief. | `truck_*/hud.png` | master |
| 13 | **Dusk front** — closed as clipping (0 % everywhere) but B still has the grille at p95 0.56 against a sky of 0.45 and dry sand brighter than the sky in `front` (32 % of ground pixels; the post SSR lobe on roughness ≥ 0.85 dirt). `BEAM.dusk.lens` 0.8 → 0.3, `head` 3.6 → 2.4; SSR weight gated by ground roughness. A and C list the dusk grille under "must not regress". | `truck_dusk/hero.png`, `front.png` | car, lighting/post |
| 14 | Tyre lugs are rectangular prisms (A, C); interior is one vinyl (C); moon has no disc (A — the `pow(cp, 90)` glow is 7° wide; a real moon is half a degree); a first-magnitude star blooms into a 259 px ball (B, `starGrid hi 1.1 → 0.8`). | `truck_day/wheel.png`, `interior.png`, `truck_night/hero.png` | car, lighting |

## Must not regress (union of the three lists)

Stars ≤ 0.5 % of sky over Y 0.35 with 1 px median blobs and the Milky Way as a
band; hill saturation ≤ 0.21 on all four frames and no band under the hills
brighter than the sky; mess shade ≤ 1.5 st on the open floor with readable
chairs; the dusk grille at p95 ≤ sky p95 + 0.1 and 0 % clip; the night truck
legible over a dark sky; night pad under the sky; zero hot pixels and 0 % clip
on every glass pane, `night_int` see ≥ 0.92, `dusk_ws` and `night_*` see ≥ 0.84;
the door glass reading the interior; the mirror showing a horizon; paint as a
painted dielectric with a sky reflection; per-surface interior textures without
crackle; tyre and chassis contact at every hour; magenta-free fleet panes and
pools only under lit lamps; amber lion eyes with pupil and catch-light; the brow
ledge and muzzle box; no saddle break; three-toed paws; contact blobs under every
lion; the planted foot holding its pixel; plain density on `lion_far` and
`hero`; night canopies dark, not missing; the day crown split; laterite hue
24° / sat 0.60; the chase camera seven metres back on every HUD frame; the
night HUD dimming.

## Round 5

The rubric's round 5 is lighting, shadows and reflections, and that is where
the open items sit: hills against the sky, the night hero's lamps, shade
pockets, the water hole, the mirror, chrome, night ground. Briefs by owner, each
with the critics' numbers as the acceptance test:

- **Lighting** (`sky.js`, `post.js`, `palette.js`): beam slices at `fast` (a
  cone from 60° off-axis, no discs over Y 0.35 in the sky of the night hero);
  the light bar under the bloom threshold with nine pods readable (with the car
  builder); night `hemi`/moon key so `mainroad` ground sits at Y 0.02–0.03
  while the pad stays ≤ 0.7 of the sky; the moon as a disc; the star `hi` cap;
  day `shadow.farRadius` and `farStrength`; dusk `BEAM` levels and the SSR
  roughness gate.
- **Terrain** (in flight, `bc-3d3ae159`): the hill clamp and into-sun floor
  (every ridge in the four frames at 0.72–0.92 of the sky above it); the water
  hole's reflectance (≥ 0.6 at 15° grazing, reflecting the sky sample, shore
  feathered over 0.6 m); the `surfAo` double count in shade.
- **Campground**: `campWear` env 0.6 → 1.0–1.2 and a warm fill under the fly
  (table pockets ≤ 2 st); fire light desaturated and shortened (ground sat
  ≤ 0.55 within 3 m); row lanterns 12 → 18 / 14 → 18 (row bodies ≥ 0.02 Y);
  timber end grain and checks.
- **Lions**: body landmarks (scapula plane, hip knuckle, belly tuck, joint
  radius steps), fur sheen and anisotropy, eye socket depth and lids, muzzle–
  skull blend row, contact decal to multiply. Gait re-judged on
  `lions_walk_fixed/`.
- **Car**: bar cover as its own material with a nine-lobe emissive mask; door
  mirror toed in with the gauntlet camera moved; pane veil −30 % with dust to
  the sill and wiper arcs; clearcoat proper; tyre lug chamfer and sipes; three
  interior materials.
- **Vegetation**: pride graze ring 20 → 14 m at 0.8 with forbs; dusk
  transmission cap (crown ≤ 2.5 st under the dusk sky with a lit rim); sun-
  azimuth crown split from the shell normals.
- **Fleet**: chrome and alloy with environment; paint env 0.3 → 0.5.
- **Master**: HUD plate/stroke, night hint opacity, speed hierarchy, hint wrap.

The build stays live: the candidate passed. `lions_walk_fixed/` and the trailer
re-shoot are the incumbent frames for those two views in round 5.
