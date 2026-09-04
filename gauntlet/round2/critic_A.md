# Round 2 — Critic A

Incumbent: round 1, build 2f0f5ba (`shots/round1/`, `shots/glass_r1/day/`).
Candidate: round 2, build a8ca6eb (`shots/round2/`).

Frames looked at: **193** — every candidate frame (99: truck_day/dusk/night 30, camp_day 6, camp_night 4, fleet 24, lions_day 7, lions_dusk 3, lions_walk 12, glass 13 incl. `sheet.png`) and every matching incumbent frame (94: truck 30, camp 10, fleet 24, lions_day 7, lions_dusk 3, lions_walk_fixed 12, glass_r1 8). Every pair was viewed side by side at 1:1 and the regions called out below were cropped at 2–4× nearest-neighbour and measured (mean sRGB, linear luminance Y, hue/sat, fraction of pixels over threshold). Numbers below are from those measurements; "stops" are log2 of linear Y ratios. Scores are what is in the frame at 640×360 under SwiftShader; softness and missing MSAA are not penalised.

Code references are to the a8ca6eb tree (`git show a8ca6eb:<path>`), read only.

---

## 1. Hero car — `truck_day|truck_dusk|truck_night/{hero,front,rear,wheel,detail,interior}`

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Composition | 7 | 7 | Same camera; the truck sits well in all three hours |
| Silhouette | 7 | 7 | Roof rack, snorkel, jerrycans, spare all read at hero distance |
| Geometry | 7 | 7 | Bull bar, rack, hinges hold up in `detail`; no gaps or floaters found |
| Scale | 8 | 8 | Wheel/body/rack proportions are right against the acacias |
| Materials | 6 | 6 | Day paint is good; dusk grille and cab glass turn into an emissive panel (see W1) |
| Texture quality | 6 | 7 | Day `detail`/`wheel`: tread, mud spatter and decals are crisp; no visible tiling |
| Glass / transparency | 5 | 5 | Scored in the glass family; hero glass at dusk is the weakness |
| Lighting | 6 | 5 | Day fine; dusk over-drives the sun-side; night truck is a silhouette with two orange discs |
| Shadows | 6 | 7 | Day contact shadow under the chassis is darker and tighter than R1; no acne seen |
| Reflections | 5 | 5 | Paint carries a sky gradient only; no environment shapes in the body or chrome |
| Color / atmosphere | 6 | 5 | Night grade goes grey-blue with a bright speckled sky behind the truck |
| Detail density | 7 | 7 | Rack load, cans, lights, tow points — good |
| Environmental integration | 6 | 7 | Dust on lower panels and tyres sits in the ruts convincingly in day |
| Visual cleanliness | 6 | 5 | Night: star speckle behind every rack bar; dusk: clipped louvres |

**Top three weaknesses in round 2**

1. `shots/round2/truck_dusk/hero.png` — the grille and the cab glass are blown out. Grille region (x 140–235, y 150–172) measures mean Y 0.315, p95 Y 0.709, with **23 % of pixels having a channel over 0.9**; the brightest sun-side sky in the same frame is p95 Y 0.452. A dark-painted louvre grille is 0.6 stops brighter than the sky that is lighting it. R1's grille in the same frame is Y 0.114 / 2.5 % clipped. The windshield and door glass carry the same cream sheet (crop at 2× shows a flat cream fill across the whole pane, not a sun highlight with a shape). Fix: in `src/vehicle/materials.js` the grille/`steelDark` family and the pane compositing in `applyBrightwork`: clamp the specular contribution of the sunset (`f0`/roughness for the grille louvres — the comments at lines ~152–234 already record chasing louvre luma upward) so that a dielectric painted surface at grazing sun cannot exceed the sky it reflects; for the panes, the glass Fresnel term in the `pane()` path (`opacity` 0.1–0.16, `film`) needs the horizon-sun reflection scaled by the pane's roughness map (`glassRoughness()`) instead of applied at full strength, and the dusk `stars`/`sun` env in `src/sky.js` dusk config should not hand the truck an env map brighter than the displayed sky.
2. `shots/round2/truck_night/hero.png` — the headlamps are two soft orange blobs (~28 px) with no beam, no pool on the road in front, and no illuminated dust; the roof bar gives one 20 px white bloom disc. Headlamp region mean Y 0.020 while the ground ahead is Y 0.027 — the lamps are barely brighter than the ground they should be lighting. `src/vehicle/index.js`: `SpotLight(PALETTE.headlight, 0, 32, 0.5, 0.55, 0.4)` at `intensity 13` and `barLight` 18 are not landing anywhere the frame can see; `parts.js:526` "light pool on the ground ahead" is additive and invisible here. Fix: raise the beam spot intensity to the point the pool reads (target ground under the beam at ≥ 3 stops over the surrounding ground, so Y ≈ 0.2 at 10 m), tighten `penumbra` 0.55 → 0.3 so the pool has an edge, and give the `headlight` emissive (6.5) a small `hot` bloom via the post threshold rather than a soft orange disc: `post.js` bloom threshold should let the lamp clip white while the disc stays small.
3. `shots/round2/truck_night/hero.png`, `truck_night/rear.png`, `truck_night/mainroad.png` — the sky is a snowstorm. Over the top 80 rows of `hero.png`, **20.0 % of sky pixels are above 0.35 luma in R2 vs 0.45 % in R1 (45×)**; above 0.6 luma, 0.93 % vs 0.17 %. Sky mean Y is 0.049 vs 0.030 (+0.7 stop), and the speckle sits on top of the rack bars and the snorkel outline so the truck's own silhouette is eaten. `src/sky.js` `starGrid()` is floored at `r = max(radius, px * cells * 0.62)`: at a 640-wide capture every star of the 210-cell grid at fill 0.06 and the Milky Way dusting at 420 cells / fill 0.35 rounds up to a whole lit pixel. Fix: drop the fills to `0.015` / `0.10`, drop the floor factor 0.62 → 0.4, and gate the Milky Way grid behind `mag > 0.5` so only the top of the h4⁴ distribution survives; then re-measure for < 2 % of sky pixels over 0.35.

**Regressions**

- Night exposure/grade: `shots/round1/truck_night/hero.png` → `shots/round2/truck_night/hero.png`. R1 was a dark blue night with a legible truck and a few stars; R2 is grey-blue (sky sRGB 45/48/60 vs 34/40/58), the truck door is 0.8 stops darker (Y 0.013 vs 0.023) so the truck is a silhouette, and the sky is filled with speckle. The same in `truck_night/front.png`, `rear.png`, `forest.png`, `mainroad.png`.
- Dusk grille and glass: `shots/round1/truck_dusk/hero.png` → `shots/round2/truck_dusk/hero.png` (numbers above); also visible in `truck_dusk/front.png` where the whole bull bar/grille stack is cream.

**Keep**

- `shots/round2/truck_day/hero.png`, `detail.png`, `wheel.png`: the day truck is the best thing in the build — dust on sills, decals, tyre tread, tow points, and a tight dark contact shadow under the chassis. Do not touch the day paint or the day contact shadow.
- `truck_day/interior.png`: dash, wheel, seats read at the right scale; the A-pillar dust film is heavy but the cabin is coherent.

---

## 2. Car glass — `shots/round2/glass/*` vs `shots/glass_r1/day/*`

R2 glass frames are 320×180 (half the R1 resolution), so all R2 panes were viewed at 2× and 4×. Mapped by content: `ws_close`/`ws_mid` ↔ `glass_screen`, `side_sun`/`side_shade` ↔ `glass_side`/`glass_shade`, `interior`/`int_side` ↔ `glass_inside`, `rear_dust` ↔ `glass_rear`, `mirror` ↔ `glass_mirror`, `moving` ↔ `glass_moving`; `dusk_ws`, `night_int`, `night_ext` have no R1 counterpart.

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Glass / transparency | 5 | 6 | Windshield tint and dust are believable; side glass is nearly an open window |
| Materials | 5 | 6 | Dust veil on the screen has grain and wiper arcs; the mirror glass is not glass |
| Reflections | 4 | 4 | No sky/tree shapes anywhere in any pane; mirror is a flat gradient (see 0.59) |
| Texture quality | 5 | 6 | Dust map on `ws_close` is fine-grained, no tiling |
| Visual cleanliness | 6 | 7 | `hot` = 0 on every pane; `flick` 0.098 only on `moving`, which is legitimate motion |
| Temporal stability | — | 7 | `flick` ≤ 0.02 for a 2 mm camera shift on all static panes; no sorting popping seen |
| Lighting | 5 | 6 | `night_int` dash glow through glass is right; `night_ext` sky speckle shows through |

**Top three weaknesses in round 2**

1. `shots/round2/glass/mirror.png` — the door mirror shows a warm orange-to-grey vertical gradient with no horizon, no road, no truck flank; the `metrics.json` row confirms it: `see` **0.59** (lowest of the set; every other pane is ≥ 0.72) and `veil` **0.149** (highest). The spotter mirror under it is a flat dark disc. At the gauntlet's quality the live mirror is off (`src/vehicle/mirrors.js` `liveMirrorsWanted()` only for `high|ultra`) and the pane falls back to `src/vehicle/interior.js:1227` `mirrorGlass: MeshBasicMaterial({ map: mirrorTexture() })`, a painted 256×72 canvas. Fix: either run the gauntlet at `?quality=high` so `createLiveMirrors` feeds the RT into `liveMaterial`, or make the fallback canvas a horizon: paint `mirrorTexture()` as sky-band/hill-line/road in the truck's palette with the horizon at 40 % height instead of a dark cab with a letterbox slot. The exterior `mirrorGlass` in `src/vehicle/materials.js:282` (`post.js` `mirrorGlass: { f0: 0.7, roughness: 0.08 }`) should at minimum sample the sky dome by reflected direction so it is never a flat gradient.
2. `shots/round2/glass/side_sun.png` — the sunlit door glass reads as an open window. `cover` 59 % of the frame, `veil` 0.074, `spread` 0.39: the pane adds almost no luma and no gradient over the scene behind it, and the crop at 4× shows the seat and door card behind at full contrast with no Fresnel brightening at the top edge and no dust film. `src/vehicle/materials.js` `pane('glassSide', { opacity: 0.14 … })`: raise the side pane's grazing-angle reflectance (the `film` term) so that at the shot's ~60° incidence the top third of the pane picks up 0.1–0.15 luma of sky, and give `glassSide` the same `glassRoughness()` dust map the screen has at 40 % strength.
3. `shots/round2/glass/interior.png` and `int_side.png` — the A-pillar and header rail carry a heavy uniform dust film (dust on interior trim is a flat tan wash, no gradient toward the base of the glass), and through the windshield the far field is sharp while the near dust is painted at one depth, so the pane reads as a decal. `veil` 0.038 / 0.023 are fine numerically; the problem is the film's shape. Fix: in the `glassRoughness()` / dust map generation, weight the dust to the lower 30 % of the pane and the wiper-arc boundary (the arcs are present on `ws_close.png` — reuse them), and take the flat tan off the interior trim materials in `src/vehicle/interior.js` (the pillar trim is picking up the exterior dust `wear.js` pass).

**Regressions**

- `shots/glass_r1/day/glass_mirror.png` → `shots/round2/glass/mirror.png`: R1's mirror at least showed a dark cab with a light slot and a headrest; R2's is a gradient with nothing recognisable in it.
- Resolution: the R2 glass set is shot at 320×180 (`sheet.png` too) where R1 was 640×360; fine textures (the dust grain, the wiper arcs) cannot be judged at the rubric's stated resolution. Not a game defect, but the gauntlet should shoot at 640×360 or 1280×720.

**Keep**

- `shots/round2/glass/ws_close.png`, `ws_mid.png`: windshield tint, dust grain, wiper arcs, and a clean edge to the frame; `see` 0.88/0.85 with `hot` 0. This is the reference pane.
- `shots/round2/glass/night_int.png`: instrument glow through the screen with `veil` ≈ 0 and no bloom halo.
- `shots/round2/glass/rear_dust.png`: `see` 0.91 through a dusty rear pane — the dust does not kill the view.

---

## 3. Fleet — `shots/round2/fleet/*` (12 vehicles × day/night)

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Composition | 6 | 6 | Same framing; the ranger/utility trucks overlap the pickup on the left |
| Silhouette | 7 | 7 | Each kind reads as its kind at fleet distance (camper, trailer, motorcycle) |
| Geometry | 6 | 6 | Motorcycle and trailer hold up; supply-truck canopy edges are hard straight boxes |
| Scale | 7 | 7 | Vehicles are the right size against one another and the tents behind |
| Materials | 6 | 7 | R2 body paint is more saturated with a harder key; ranger/utility screens carry a pink-magenta tint |
| Texture quality | 6 | 6 | Body decals are fine; the ground plane under the fleet is one repeated dirt tile |
| Lighting | 6 | 6 | Day: harder shadows, better; night: vehicles are silhouettes with a black sky |
| Shadows | 5 | 7 | R2 day shadows are dark, sharp and land under the chassis — a clear improvement |
| Reflections | 4 | 4 | Paint carries a single gradient; the pink screens are the only "reflection" |
| Color / atmosphere | 5 | 4 | Distant hills behind the fleet are blue-white and lighter than the sky (see W1) |
| Detail density | 6 | 6 | Rack loads, spare tyres, jerrycans present on the right kinds |
| Visual cleanliness | 5 | 6 | R1's night headlamp "blasts" on unlit vehicles are gone |

**Top three weaknesses in round 2**

1. `shots/round2/fleet/pickup_0_day.png` (and every `*_day.png`) — the hills behind the fleet are lighter than the sky above them. Hill band (x 250–370, y 45–60) Y **0.433** vs the sky directly above (y 8–20) Y **0.376**: hills 0.2 stops *lighter* than the sky, sRGB 167/174/188, hue 219°. Real hills in haze sit at 0.7–0.9 of the horizon sky, never above it; these read as snowfields. `src/terrain.js` far-hills material, the `hazeChunk` blend: `hillAir = mix(fogColor * vec3(0.76,0.86,1.0), fogColor * vec3(0.86,0.91,0.98), …)` then `hillAir *= hillSkyK` and `hillWall` takes the mesh to `0.86` of that colour by 800 m. `fogColor` toward the sun is a lit-dust cream brighter than the sky at the crest's elevation. Fix: the airlight the hills fog to must be the displayed sky sampled at the ray's elevation (the same dome the sky shader draws), not `fogColor` with a cooling multiplier, and the cap `hillAirL = dot(hillAir, LUMA) * 0.92` must be applied *after* the wall mix, not before, so the wall cannot re-lighten the crest.
2. `shots/round2/fleet/ranger_0_day.png`, `utility_0_day.png` — the windshields carry a pink-magenta reflection (crop at 3×: the glass is sRGB ≈ 190/150/175 where the sky it faces is 155/165/185). No other pane in the build does this; it is the `steelDark`/grille magenta tint the comments in `src/vehicle/materials.js` (≈ line 200, "tinting `steelDark` magenta doubled it") record being applied, leaking through the shared `glass` pane's `film` colour for those kinds. Fix: in `src/vehicles/materials.js` give the ranger/utility `glass` pane its own `film` colour (neutral 0.9/0.92/0.95) rather than inheriting the body's brightwork tint.
3. `shots/round2/fleet/camper_0_night.png`, `supply-truck_0_night.png`, `trailer_0_night.png` — the vehicles are near-black silhouettes against a black sky with a dense speckle field; nothing of the material reads. The R2 night key is too low for unlit vehicles and the sky is doing the same snow as in the hero (`src/sky.js` `starGrid`, see Hero W3). Fix: raise the night hemisphere/ambient floor on the vehicle materials (`src/vehicles/materials.js` night `envMapIntensity` or the sky's `night.ambient`) so an unlit white camper reads at Y ≥ 0.04, and fix the star fills as in Hero W3.

**Regressions**

- Night sky: `shots/round1/fleet/pickup_0_night.png` → `shots/round2/fleet/pickup_0_night.png` — R1 had a dark blue gradient sky with a few stars; R2 is black with speckle. All twelve `*_night.png` pairs.
- Hills: `shots/round1/fleet/suv_0_day.png` → `shots/round2/fleet/suv_0_day.png` — R1's hills were muted grey-lilac (already slightly lighter than the sky: Y 0.453 vs 0.342); R2's are more saturated and closer to white at the crest.

**Keep**

- Day shadows under every fleet vehicle (`shots/round2/fleet/safari-jeep_1_day.png`): dark, sharp, correct direction — the clearest single improvement in the family.
- The removal of R1's spurious headlamp blasts on parked vehicles (`shots/round1/fleet/motorcycle_0_night.png` had a white disc on a bike with no lamp lit; R2 does not).
- Kind silhouettes — the motorcycle, camper, trailer and supply truck are each unmistakable.

---

## 4. Campground — `shots/round2/camp_day/*`, `camp_night/*`

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Composition | 6 | 7 | `camp_arrive` and `camp_gate` lead the eye down the track to the gate |
| Silhouette | 6 | 6 | Tents, canopies, water tower read; the mess canopy is a flat plane |
| Geometry | 6 | 6 | Tent poles and guy lines present; `camp_overhead` shows the canopies as zero-thickness sheets |
| Scale | 7 | 7 | Tents vs truck vs chairs is right |
| Materials | 5 | 6 | Canvas has weave and stains; the gate timber is a flat brown |
| Texture quality | 6 | 6 | Canvas is fine; ground under the mess is one tile at one scale |
| Lighting | 5 | 6 | Shadow-to-sun ratio under the canopies is now realistic (measured ≈ 3 stops) but the shade is featureless |
| Shadows | 5 | 6 | Sharp canopy shadows; contact under chairs and tables present |
| Color / atmosphere | 5 | 4 | `camp_beyond` hills are saturated cobalt and darker than the sky (see W1) |
| Detail density | 6 | 6 | Chairs, tables, cans, firewood — enough; no people, no laundry, no tracks in the dirt |
| Environmental integration | 5 | 6 | Tent skirts sit on the ground; the fire pit has ash |
| Visual cleanliness | 6 | 5 | Night: the same speckle sky; `camp_fire_night` has ~300× the R1 count of bright sky pixels |

**Top three weaknesses in round 2**

1. `shots/round2/camp_day/camp_beyond.png` (512×288) — the distant hills are saturated cobalt. Right hill body (x 400–480, y 105–113) sRGB 113/138/174, Y **0.246**, hue 216°, **saturation 0.35**; left hill sRGB 102/131/180, saturation **0.44**; the sky directly above them is Y 0.359, saturation 0.21. The hills are 0.55 stops under the sky and twice as saturated as it — no dusty air produces a hill bluer than the sky behind it. R1's hills in the same frame were warm grey (hue 34°, sat 0.13, Y 0.272) and the left one was too light (Y 0.528); wrong the other way, but not a colour the eye rejects. Same shader as Fleet W1 but the opposite failure: the `hillSkyK = mix(1, vec3(0.5,0.66,1.0), …)` then `vec3(0.36,0.56,1.0)` per-elevation cooling on the *linear* `fogColor` produces a navy once the frame is tone-mapped, and the `hillCapL` knee then pins the lit value under it. Fix as Fleet W1: replace the cooling multipliers with a sample of the displayed dome, and target crests at 0.75–0.85 of the sky luminance with hue within 10° of the sky and saturation ≤ 0.2.
2. `shots/round2/camp_day/camp_mess.png`, `camp_interior.png` — under the mess canopy everything is a single dark value: the tables, chairs and crates in shade measure Y ≈ 0.02–0.03 with no bounce from the sunlit dirt a metre away (which is Y ≈ 0.25). The ratio is physically plausible for direct-vs-shade, but there is no indirect fill at all, so the shade is a hole. Fix: `src/campground` materials get a ground-bounce hemisphere term (warm, from the dirt albedo) — a `HemisphereLight` with `groundColor` from `palette.js` dirt at ≈ 0.35 of the sky intensity — or raise the night/shade ambient floor in `src/sky.js` day config `ambient`.
3. `shots/round2/camp_night/camp_fire_night.png` — the fire is the right colour but the sky behind is a wall of white points: **≈ 300× more sky pixels over 0.35 luma than R1's `camp_fire_night.png`**; the tent ridge lines and the water tower are lost in it. Fix: Hero W3 (`src/sky.js` `starGrid` fills and floor).

**Regressions**

- `shots/round1/camp_night/camp_fire_night.png` → `shots/round2/camp_night/camp_fire_night.png`: night sky speckle; the R1 frame's quiet dark sky was better.
- `shots/round1/camp_day/camp_beyond.png` → `shots/round2/camp_day/camp_beyond.png`: R1's hills were grey-lilac and too light; R2's are navy and far too dark — a different wrong answer, and more conspicuous.

**Keep**

- `shots/round2/camp_day/camp_arrive.png`, `camp_gate.png`: the track, gate posts, and the arrival composition. The canopy shadow shapes on the ground are crisp and correctly angled.
- Canvas material on the tents (`camp_interior.png`): weave, sag and stain read as canvas.

---

## 5. Road & terrain — `truck_*/road.png`, `mainroad.png`, hero backgrounds, `lions_*/lion_far.png`, `lion_pride.png`, `camp_beyond.png`

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Composition | 6 | 7 | `lion_far` framing is fixed (R1's was broken — the pride was a smear at the frame edge) |
| Geometry | 6 | 6 | Ruts and camber on `road.png` are good; the waterhole is a flat disc with a hard edge |
| Scale | 7 | 7 | Rut width vs tyre is right; termite mounds and rocks are the right size |
| Materials | 6 | 6 | Dry dirt with a fine-grain scatter is convincing near; far ground goes to a flat wash |
| Texture quality | 6 | 6 | Near tile is fine; the mid-ground (20–80 m) shows the tile repeat in `mainroad.png` |
| Lighting | 6 | 6 | Sun on the road is right; the road at dusk keeps its day colour |
| Shadows | 6 | 6 | Rut walls shade correctly; rock shadows present |
| Color / atmosphere | 5 | 4 | Far hills wrong in both directions — navy in `lion_far`, white in fleet |
| Detail density | 6 | 5 | R2 foreground grass tufts are fewer (see Vegetation); the ground reads barer |
| Environmental integration | 6 | 6 | Tyre tracks run into the distance and stay on the road |
| Visual cleanliness | 6 | 5 | Hard cream band under every far hill; the waterhole edge is a step |

**Top three weaknesses in round 2**

1. `shots/round2/lions_day/lion_far.png` — the hills at ~1 km are **2.5 stops darker than the sky at their base** (hill body Y 0.066, sRGB 56/71/105, hue 221°, sat 0.47; sky above Y 0.373, sat 0.13). Below the hills a cream band (Y 0.34, hue 34°) runs the full frame width with a hard upper edge, then blotchy dark "trees", then the plain. So the horizon is four stacked stripes: grey sky, navy hill, cream wall, red plain. R1 (`shots/round1/lions_day/lion_far.png`) had hills at Y 0.184 (1 stop under the sky), grey-brown, hue 33°: dull but plausible. Fix: `src/terrain.js` `buildFarHills` / `hazeChunk` as above; specifically remove `hillSkyK` and the `vec3(0.76,0.86,1.0)` cooling, set the hill airlight to the sky sample, and let the plain past 380 m take the ordinary scene fog rather than the folded hill treatment (`hillK = max(…, smoothstep(380, 640, hillDist))` is what paints the cream band).
2. `shots/round2/lions_day/lion_side.png`, `lion_far.png` — the waterhole is a flat grey-blue disc with a stepped edge and no bank: no wet margin, no reflection of the rock or tree, no darkening of the dirt around it. Fix: `src/terrain.js` the water/wetness field (≈ line 4484 "terrain shader already darkens and cools the dirt where the wetness field…") needs its radius extended ~1.5 m past the water edge with a 0.5 m falloff, and the water material needs the sky dome reflection by reflected-ray elevation (a flat `MeshStandardMaterial` colour cannot show the rock).
3. `shots/round2/truck_day/mainroad.png` — the mid-ground road (20–80 m) shows the dirt tile repeating at a visible period; the rut texture at that distance is a regular ripple. Fix: `src/terrain.js` road material: add a second detail octave at 1/7 of the base tile period and fade the base tile's high-frequency component out past 25 m (the LOD comments around line 2170–2270 handle the near tread; there is no mid-distance break-up).

**Regressions**

- Far hills: `shots/round1/lions_day/lion_far.png` → `shots/round2/lions_day/lion_far.png` (numbers above); same in `lion_side.png` and `lion_pride.png`.
- Foreground ground cover: `shots/round1/lions_day/lion_far.png` → `shots/round2/lions_day/lion_far.png` — R1 had ~30 grass tufts in the near ground; R2 has ~8 and the plain reads bare.

**Keep**

- `shots/round2/truck_day/road.png`: rut geometry, camber, tread prints in the dirt and the dust film on the truck's flank are the best terrain in the build.
- The `lion_far` framing fix itself (the pride is now in the frame).

---

## 6. Vegetation — `truck_*/forest.png`, hero and lion backgrounds

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Silhouette | 6 | 6 | Acacia crowns read as acacias at 50–200 m |
| Geometry | 5 | 5 | Crowns are card clusters; trunks are straight cylinders; night forest is skeletal |
| Scale | 7 | 7 | Trees vs truck is right |
| Materials | 5 | 5 | Leaf cards have no translucency; grass tufts are flat opaque cards |
| Texture quality | 5 | 5 | Card edges alias but that is the rasteriser; the grass card texture is low-frequency |
| Lighting | 5 | 4 | Night `forest.png`: trees are black silhouettes with speckle sky between every branch |
| Shadows | 5 | 6 | Tree shadows on the ground in `hero.png` are present and shaped |
| Color / atmosphere | 5 | 5 | Day greens are a single hue; no yellow-green sunlit vs blue-green shaded split |
| Detail density | 6 | 5 | Fewer grass tufts in R2 near ground (`lion_far`, `lion_pride`) |
| Environmental integration | 5 | 5 | Tufts sit on the ground but not *in* it: no dirt darkening at the base |
| Visual cleanliness | 6 | 5 | Night: branch–sky edges are ringed by speckle |

**Top three weaknesses in round 2**

1. `shots/round2/truck_night/forest.png` — every tree is a flat black cut-out and the sky between the branches is peppered with single lit pixels, so the canopy edge is a lace of white dots. The lit fraction over 0.35 luma in the sky between crowns is ~20 % (same field as Hero W3). Fix: `src/sky.js` `starGrid` as Hero W3; then give the night `forest.js` foliage a sky-ambient term so the crowns are dark green-grey (Y ≈ 0.01–0.015) rather than pure black.
2. `shots/round2/lions_day/lion_pride.png`, `lion_far.png` — the plain has lost most of its grass: R1's near ground carried a dense scatter of straw tufts (≈ 30 in the lower third); R2 shows ≈ 8 with wide bare dirt between them, and the tufts that remain are the same card at the same scale. Fix: `src/roadside.js` / `src/terrain.js` grass scatter density for the savanna biome (the `plain` factor at `terrain.js:270–275`) back up to R1's count, with two card sizes (0.6 m and 1.1 m) and a 20 % hue jitter.
3. `shots/round2/truck_day/hero.png` (background acacias) — the crowns are a single flat green with no lit/shaded split; the sunlit side of the crown and the underside are the same value. Fix: `src/forest.js` leaf-card material: add a normal-based two-tone (top of crown +0.3 stops warm, underside −0.7 stops blue-grey) via the card's baked normal, or `MeshStandardMaterial` with `side: DoubleSide` and a translucency term keyed to the sun.

**Regressions**

- Grass density: `shots/round1/lions_day/lion_far.png` → `shots/round2/lions_day/lion_far.png` and `lion_pride.png`.
- Night canopy against sky: `shots/round1/truck_night/forest.png` → `shots/round2/truck_night/forest.png`.

**Keep**

- Acacia silhouettes and tree shadow shapes on the ground in `shots/round2/truck_day/hero.png`.

---

## 7. Lions — `lions_day/*`, `lions_dusk/*`, `lions_walk/{close,medium,far,seat}.png`

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Composition | 5 | 6 | `lion_far` framing fixed; `lion_face` fills the frame |
| Silhouette | 4 | 4 | Capsule body, stubby legs, no shoulder/hip masses — reads as a bear or a large dog |
| Geometry | 4 | 4 | Neck seam, cheek pads pasted on, shoulder plate; visible hard shading break along the back |
| Scale | 6 | 6 | Lioness vs ground and rock is right; ears are oversized (see W2) |
| Materials | 5 | 5 | Fur is a flat tan albedo with a painted highlight stripe; no fur normal or sheen |
| Texture quality | 5 | 5 | Muzzle whisker dots and nose are painted; the body has no fur texture at this range |
| Lighting | 5 | 5 | Sun key is right; the yellow "highlight stripe" along the spine is painted, not lit |
| Shadows | 4 | 4 | No visible contact shadow under any lion; belly-to-ground has no dark |
| Color / atmosphere | 5 | 5 | Tan is plausible; dusk lions carry the dusk warm well |
| Detail density | 4 | 5 | Whisker pads, nose, ear insides added |
| Environmental integration | 4 | 4 | Lions sit on the ground plane like placed models; no dust, no flattened grass |

**Top three weaknesses in round 2**

1. `shots/round2/lions_day/lion_face.png` — the head does not read as a lion. At 2×: the eyes are dark squints (almost no visible iris — R1's amber eyes were the one lion-like thing and they are gone), the ears are ~1.4× a lion's relative to the skull and pink-lined, the mouth is a black painted "moustache" line with three whisker dots each side, and the cheeks are two pads with a visible boundary to the muzzle. `src/wildlife/lion/headspec.js`: `eye: [0.05, 0.056, 0.175]`, `eyeR 0.0263` — the lid aperture function (line ≈ 123, "how open the skin is") is closing over the ball; open it to show ≥ 60 % of the iris disc in the frontal view. Ear radius in `spec.js`/`geometry.js` down 25 %. The mouth line in `textures.js` should be a thin dark seam that follows the jowl (it stops at the corner in a hard hook now). Cheek sections at `headspec.js:35–48` need a smooth taper into the muzzle root rather than the 2.6/2.7 exponent step.
2. `shots/round2/lions_day/lion_close.png`, `lion_medium.png`, `lions_dusk/lion_close_dusk.png` — a hard shading break runs along the back where the upper "saddle" and the flank meet, with a visible seam down the thigh, and the neck joins the chest with a step. The body is a capsule with no shoulder blade or hip bone. `src/wildlife/lion/geometry.js` lofts: the normal is not continuous across the loft rows (flat-shaded ring), and the neck loft's last row is not welded to the chest's first. Fix: compute smooth normals across the rows (average adjacent ring normals) and weld the neck/chest rows; add a shoulder mass (+8 % section width at `shoulderL/R` pos [0.17, 0.86, 0.42]) and a hip mass over the pelvis.
3. `shots/round2/lions_day/lion_side.png`, `lion_pride.png`, `lion_seat.png` — no contact shadow under any lion: the belly-to-ground gap is the same value as the open dirt. `src/wildlife/lion/contact.js` `ContactShadows` with `contactTexture(64)` is not visible in any frame at this range. Fix: raise the contact blob's opacity so the dirt directly under the chest measures ≥ 1 stop darker than open dirt (Y 0.12 vs 0.25), extend it under the paws when the animal is lying, and give it a 0.3 m penumbra.

**Regressions**

- Eyes: `shots/round1/lions_day/lion_face.png` → `shots/round2/lions_day/lion_face.png` — R1 had open amber eyes; R2's are dark slits.
- Body shading: `shots/round1/lions_day/lion_close.png` → `shots/round2/lions_day/lion_close.png` — R1's flank was smooth; R2 has the saddle break and thigh seam.

**Keep**

- The muzzle *block* and brow ridge in R2 (`lion_face.png`) — the skull proportion is closer to a cat than R1's snout. Keep the proportion; fix the features on it.
- The `lion_far` framing.

---

## 8. Lion feet & gait — `shots/round2/lions_walk/walk_00..07.png` vs `shots/round1/lions_walk_fixed/walk_00..07.png`

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Animation | 3 | 5 | R2 has visible knee/elbow flexion and alternating strides; R1 was two rigid poses |
| Physics / ground contact | 3 | 4 | Paws are at ground height but there is no shadow, so they float visually |
| Geometry | 4 | 5 | Legs are thicker and articulated; black "sock" paws with white toe highlights |
| Silhouette | 4 | 5 | Tail hangs and swings; R1's tail was a fixed stiff arc |
| Temporal stability | 5 | 6 | No jitter or popping across the 8 frames; the highlight stripe is stable |
| Visual cleanliness | 5 | 5 | The yellow spine highlight stripe survives in every frame |

**Top three weaknesses in round 2**

1. `shots/round2/lions_walk/walk_05.png` (and every frame of the strip) — no ground shadow under the walking lion; crop at 4× (`walk_05` x 190–390, y 110–230) shows the paw's lower edge against dirt of the same value as the open plain. A walking animal with no shadow floats regardless of where its feet are. Fix: `src/wildlife/lion/contact.js` — the `ContactShadows` quad follows the root, not the paws; drive one blob per `paw*` bone at ≥ 1 stop darkening, and a body blob under the chest.
2. `shots/round2/lions_walk/walk_02.png` vs `walk_05.png` — the stride is short: the front paw reaches only ~0.5 body-lengths ahead of the shoulder at full extension, and the hind leg never trails behind the hip; the animal minces. `src/wildlife/lion/pose.js` / `rig.js` walk cycle: stride amplitude for `walk: 1.0` should carry the paw ±0.35 m about the joint on a lioness; currently it looks like ±0.2 m. Also the hocks barely flex on the swing phase.
3. `shots/round2/lions_walk/walk_00..07.png` — the painted yellow highlight stripe along the spine and the "saddle" shading break stay fixed to the mesh while the sun is world-fixed, so as the lion walks past the camera the "highlight" does not move on the body. Fix: remove the painted stripe from `src/wildlife/lion/textures.js` and let the fur `MeshStandardMaterial` roughness (0.7–0.8) plus a sheen term produce the rim.

**Regressions**

- None against R1 in this family; R1's strip was worse on every count.

**Keep**

- Joint articulation and alternating gait in R2 (`walk_02` → `walk_05` shows a real swing/plant alternation). Tail motion. The dark paws reading as feet.

---

## 9. Lighting & atmosphere — across hours

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Lighting | 6 | 5 | Day best; dusk over-drives specular; night under-lights the subject |
| Shadows | 5 | 7 | Day shadows are the biggest improvement across all families |
| Color / atmosphere | 5 | 4 | Far-hill colour wrong in both directions; night sky speckle |
| Visual cleanliness | 6 | 4 | Star snow at night in every night frame |
| Reflections | 4 | 4 | Nothing reflects an environment shape anywhere |

**Top three weaknesses in round 2**

1. Night sky star density — `shots/round2/truck_night/hero.png`: 20.0 % of sky pixels over 0.35 luma (R1 0.45 %), sky mean +0.7 stops. `shots/round2/camp_night/camp_fire_night.png`: ≈ 300× R1's bright-pixel count. `shots/round2/fleet/*_night.png`: same. Fix: `src/sky.js` `starGrid` — fills 0.06/0.03/0.35 → 0.015/0.02/0.10, floor `px * cells * 0.62` → `0.4`, Milky Way dusting gated on `mag`. Target: < 2 % of sky pixels over 0.35 luma at 640 wide.
2. Far-hill airlight — `shots/round2/lions_day/lion_far.png` hills 2.5 stops *under* the sky at hue 221° sat 0.47; `shots/round2/fleet/pickup_0_day.png` hills 0.2 stops *over* the sky. One shader, two opposite failures depending on sun azimuth, because the airlight is `fogColor` (lit dust, cream toward the sun) times a cooling factor, not the sky. Fix: `src/terrain.js` `hazeChunk` — airlight = displayed sky sampled at the ray's elevation and azimuth; drop `hillSkyK` and the 0.76/0.86/1.0 multipliers; cap after the wall mix.
3. Dusk specular — `shots/round2/truck_dusk/hero.png` grille p95 Y 0.71 vs sky p95 0.45; 23 % of grille pixels clipped. `shots/round2/glass/dusk_ws.png` by contrast holds (`hot` 0, `spread` 0.31), so it is the body brightwork/grille path, not the glass shader. Fix as Hero W1.

**Regressions**

- Night, every family: `shots/round1/truck_night/hero.png` → `shots/round2/truck_night/hero.png`; `shots/round1/camp_night/camp_fire_night.png` → `shots/round2/camp_night/camp_fire_night.png`; `shots/round1/fleet/pickup_0_night.png` → `shots/round2/fleet/pickup_0_night.png`.
- Far hills: `shots/round1/lions_day/lion_far.png` → `shots/round2/lions_day/lion_far.png`; `shots/round1/camp_day/camp_beyond.png` → `shots/round2/camp_day/camp_beyond.png`.

**Keep**

- Day shadows (direction, hardness, contact) in `shots/round2/truck_day/hero.png` and `shots/round2/fleet/*_day.png`.
- The dusk sky gradient itself (`shots/round2/truck_dusk/hero.png` sky: warm band to blue zenith with no banding) and the dusk windshield (`glass/dusk_ws.png`).
- `shots/round2/glass/night_int.png` dash glow.

---

## 10. HUD — `truck_*/hud.png`

| Category | Round 1 | Round 2 | Note |
|---|---|---|---|
| Composition | 5 | 6 | R1's key legend overlapped the build stamp; R2 wraps it to three lines and clears the stamp |
| Visual cleanliness | 4 | 6 | No overlap; text is legible at 640 wide |
| Color / atmosphere | 5 | 5 | White text with a drop shadow reads on all three hours; no hour-aware tint |
| Detail density | 5 | 5 | Title, hint, speed, camera name — enough, no more |

**Top three weaknesses in round 2**

1. `shots/round2/truck_day/hud.png` — the key legend is three lines of eleven tokens ("CLICK view DRAG look WASD drive / C camera P photo N time L lights / H horn") set in the same weight as the title; it competes with the speed readout. Fix: `src/hud.js` — collapse the legend to one row of key glyphs with 60 % opacity labels and fade it out 8 s after first input.
2. `shots/round2/truck_night/hud.png` — the white legend at full opacity sits on a night frame whose subject is Y ≈ 0.02; the HUD is the brightest thing on screen by two stops. Fix: `src/hud.js` scale text opacity with the scene's exposure (the sky config already carries the hour).
3. `shots/round2/truck_dusk/hud.png` — the speed readout's `km/h` and `CHASE CAM` label are set at two different baselines and tracking. Fix: one baseline, one tracking value in `src/hud.js` styles.

**Regressions**

- None. R2 fixes R1's overlap bug.

**Keep**

- The overlap fix and the build stamp position.

---

## Overall

**Three weakest families in round 2 (ranked):**

1. **Lions** — silhouette/geometry/shadows all at 4; the face regressed (eyes) even as the skull proportion improved; no contact shadow anywhere. This is the family a player will photograph, and it does not read as a lion at any distance.
2. **Lighting & atmosphere** — cleanliness 4 and colour 4: the night sky speckle touches every night frame in every family, and the far hills are wrong in two opposite ways depending on where the sun is.
3. **Road & terrain / Vegetation (tied)** — far-hill colour and the cream band under it, the flat waterhole, the loss of grass density, and mid-distance tile repeat.

**Single highest-leverage fix:** `src/sky.js` `starGrid` fills and floor (Hero W3). It is a three-number change, it is visible in 28 of the 99 candidate frames (every night frame: 10 truck_night, 4 camp_night, 12 fleet night, 2 glass night), it currently drives cleanliness down in five families at once, and no other single change touches as many frames. Second is the far-hill airlight in `src/terrain.js` `hazeChunk`, visible in every daytime frame with a horizon.

**What a first-time player notices in the first ten seconds of the hero view:**

- **Day** (`shots/round2/truck_day/hero.png`): a convincing dusty green expedition truck with a proper shadow under it, on good rutted dirt — then the flat single-green acacia crowns and, if they look up, hills that are slightly lighter than the sky. Impression: "this looks decent."
- **Dusk** (`shots/round2/truck_dusk/hero.png`): a good warm sky, and then the grille and windshield glowing cream like a lit panel — the truck looks like it has a light box for a nose. Impression: "why is the front lit up?"
- **Night** (`shots/round2/truck_night/hero.png`): snow. The sky is a field of white points, the truck is a grey silhouette with two orange blobs that light nothing, and the road ahead is as dark as the ditch. Impression: "is it snowing? where are my headlights?"

**Frames looked at: 193** (99 candidate, 94 incumbent).
