# Critic B — Round 2 (build a8ca6eb) vs Round 1 (build 2f0f5ba)

Blind review. Frames read with the image tool at native 640×360 (the round-2 glass set is 320×180 plus the contact sheet). Scored on what is in the frame. SwiftShader softness and missing MSAA are not penalised; everything the game does is.

Frames looked at: **207** — 98 in `shots/round1/`, 99 in `shots/round2/` (including `glass/sheet.png`), 10 in `shots/glass_r1/` (all seven `day/` panes, plus `dusk/glass_screen`, `night/glass_screen`, `night/glass_inside` to match the candidate's dusk/night glass conditions). `metrics.json` was read alongside the glass frames.

Headline: round 2 fixed the car and broke the world. The truck, its glass, its wheels and the campfire-less camp *props* are better than round 1. The sky, the far hills, the ground cover, the lions' bodies and the night exposure are worse, and three of those are visible in the very first hero frame a player sees.

---

## 1. Hero car (`truck_day|dusk|night/` hero, front, rear, wheel, detail, interior, road)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 7 | 7 | Same camera set; `truck_day/road.png` still crops the bonnet through the top edge. |
| Silhouette | 8 | 8 | Snorkel, roof rack, light bar, spare read instantly at every hour. |
| Geometry | 7 | 8 | R2 `truck_day/detail.png`: grille bars, winch drum, D-rings, mesh stone-guard all modelled; the plate steps have real thickness. |
| Scale | 8 | 8 | Tyre-to-body and cab-to-rack ratios plausible; 33-inch tyre reads as 33-inch. |
| Materials | 7 | 8 | R2 paint has a broken clearcoat with dust film on the horizontal panels; R1 was one flat green. Rubber on `wheel.png` is genuinely matte. |
| Texture quality | 7 | 7 | Dash in `interior.png` (both rounds) is one crack/mud noise over every surface — gauge bezels, vinyl, steel all share it; reads as dirt-splat noise, not wear. |
| Glass / transparency | 5 | 8 | See family 2. |
| Lighting | 6 | 6 | Day good. Dusk hero has the front bar and bumper glowing near-white (`truck_dusk/hero.png`) while the sun is behind the truck to the right; the key is on the wrong side of the car for the sky it stands under. |
| Shadows | 6 | 7 | R2 ground shadow under the truck is soft and anchored; the underbody is dark. |
| Reflections | 5 | 7 | Mirror in `glass/side_sun.png` shows sky/horizon instead of chrome smear. |
| Colour / atmosphere | 6 | 5 | The car is fine; the pink-magenta soil under it at day and the cobalt hills behind it are not (scored in family 5, but they sit in every hero frame). |
| Physics / ground contact | 7 | 8 | Tyres sink a few cm into the rut in `truck_day/wheel.png`; contact shadow present at all four corners. |
| Detail density | 8 | 8 | Rack load, jerry cans, sand ladders, shovel, hi-lift — busy without noise. |
| Visual cleanliness | 7 | 7 | Small: `truck_dusk/hero.png` cabin shows two cream rectangles (seat backs) lit brighter than the exterior sun-facing panels. |

**Top three weaknesses (round 2)**

1. `shots/round2/truck_dusk/hero.png` — the whole front clip (bumper, grille, light bar housing, winch) is lit to ~0.85 luma while the sky behind the truck is at ~0.55 and the flanks facing the camera at ~0.2. The truck is lit from camera-left-low, the sun is camera-right and setting. Fix: `src/sky.js` `MODES.dusk.key` azimuth is inconsistent with `DUSK_SKY` aureole position — put `key.az` on the same side as the disc, or drop `DUSK.sunLow` intensity on the key by one stop and let the environment map carry the fill.
2. `shots/round2/truck_day/interior.png`, `truck_night/interior.png` — the dashboard, pillars, steering column and door cards all carry the same high-frequency grime texture at the same amplitude. Fix: in `src/vehicle/materials.js`, split the `interior` grime map into two tilings and mask it with the dash AO/curvature so it collects in seams and under the dash lip, not across the gauge faces; drop its amplitude on the vinyl by half.
3. `shots/round2/truck_night/hero.png` — headlamps are lit (amber-white lenses with halo) but throw no light on the ground in front of the truck; the light pool in `truck_night/forest.png` proves the spot exists, so in the hero view the cone is simply not reaching the ground 2 m ahead. Fix: `src/vehicle/index.js` L78 `new THREE.SpotLight(PALETTE.headlight, 0, 32, 0.5, 0.55, 0.4)` — the intensity is 0 at construction and evidently never raised in the hero shot's mode; set it with the lamp-glow toggle that drives `applyLampGlow(m.headlight, …)` in `src/vehicle/materials.js` L818, lower the target y (aim ~0.5 m down over 8 m) and widen `angle` 0.5 → 0.6 rad so the pool starts at the bumper.

**Regressions**: none on the vehicle itself. Background and ground regressions that appear behind the car are in families 5 and 9.

**Keep**: the R2 tyre (`truck_day/wheel.png`) — tread blocks, chains, sidewall lettering, matte rubber, mud in the lugs; the `detail.png` front end; the clearcoat break-up on the bonnet; the mirror pane.

---

## 2. Car glass (`shots/glass_r1/day/*` vs `shots/round2/glass/*` + `metrics.json`)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Glass / transparency | 4 | 8 | R1 windscreen (`glass_r1/day/glass_screen.png`) is a cream veil with a bloomed hot streak on the snorkel; R2 `ws_close` see=0.88, veil=0.05, no clip. |
| Materials | 5 | 8 | R2 dust cover 30 % on the screen, 59 % on `side_sun` (heavier where the wiper does not reach) — reads as a real dirty pane. |
| Reflections | 4 | 7 | `side_sun.png`: a single specular streak along the top of the pane and a horizon in the mirror; `mirror.png` see=0.59 is the weakest pane — the mirror glass veils 0.15. |
| Lighting | 5 | 6 | `dusk_ws.png` keeps the interior legible (see 0.82) but the cab interior seats are brighter than the exterior; `night_int.png` interior is pitch-black except gauges. |
| Visual cleanliness | 5 | 6 | `night_int.png`: fine grey speckle across the dark dash and A-pillar (looks like shadow-map noise or dust motes rendered at night). |
| Temporal stability | — | 7 | `moving` flick=0.098 (vs ≤0.02 static) — a visible shimmer on the screen dust when driving. |

**Top three weaknesses**

1. `shots/round2/glass/mirror.png` — mirror glass see=0.59, veil=0.15, the lowest see and highest veil in the set; the reflection is a milky sky with no defined horizon. Fix: `src/vehicle/mirrors.js` — the mirror pane material (the `roughness 0.02` flat metal noted in `src/vehicle/materials.js` ~L275) still has a dust/veil layer applied; zero the dust film on the mirror pane and give it `envMapIntensity 1.0`.
2. `shots/round2/glass/night_int.png` — the pane shows the star field at full sky intensity through the screen while the dash is in black; there is no interior bounce from the gauge lights, and the grey speckle across the dash reads as noise. Fix: `src/post.js` night grade — raise the shadow floor (`exposure` 1.02 → ~1.25 for `night` with `bloom.threshold` unchanged) and, in `src/vehicle/interior.js`, add a 0.3-intensity `PointLight` at the gauge cluster with 1.2 m range.
3. `shots/round2/glass/moving.png` — flick 0.098: the dust map moves relative to the pane per frame. Fix: in `src/vehicle/materials.js` glass shader, the dust UV must be in pane-local space, not view/screen space; remove any `uTime`/velocity term from the dust lookup.

**Regressions**: none. Every R2 glass pane beats its R1 counterpart.

**Keep**: the windscreen in `ws_close.png`/`ws_mid.png` (see 0.85–0.88, veil ≤0.10, no clipped pixels) — this is the best material in the game. `side_sun.png`'s single specular streak. `rear_dust.png` rear glass see=0.91 with 23 % dust cover.

---

## 3. Fleet (`fleet/` twelve vehicles × day/night)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Silhouette | 7 | 7 | Twelve distinct kinds; motorcycle and trailer weakest. |
| Geometry | 6 | 7 | Wheel arches, bull bars, canopy frames cleaner in R2. |
| Materials | 6 | 7 | Wear/mud pass (`src/vehicles/wear.js`) reads; dust film heavier at the sills. |
| Lighting | 6 | 5 | R2 `safari-jeep_1_night.png` and `utility_0_night.png` have headlamps off; in R1 they were lit — a parked fleet at night with no lights and no camp light is a black shape. |
| Composition | 6 | 5 | `trailer_0_night.png` R2 is framed on a wheel and a hitch with the trailer body out of frame. |
| Colour / atmosphere | 6 | 4 | Every R2 night plate has a dense white star field that reads as snowfall (see family 9). |
| Detail density | 6 | 7 | Loads, spares, canopies. |

**Top three weaknesses**

1. `shots/round2/fleet/safari-jeep_1_night.png`, `utility_0_night.png` — vehicle is a silhouette with no lamps; luma on the body <0.08 with no rim. Fix: `src/vehicles/index.js` L274/L401 — `lightsOn: i === arriving` and `lamps: { head: i === arriving, … }` light exactly one vehicle; for the night plates either set `markers: true` for every kind (parking lamps are what a parked overland fleet actually shows) or add a camp `PointLight` anchor near each fleet slot in `src/campground/lights.js`.
2. `shots/round2/fleet/trailer_0_night.png` — camera is inside the wheel arch; the frame shows tyre, hub and hitch. Fix: the fleet shot rig uses the kind's `boundingSphere` — the trailer's sphere is set by the hitch pole; use the body box extents in `src/vehicles/kinds.js` for the camera distance.
3. All `fleet/*_night.png` — the star field. Fix in family 9.

**Regressions**: headlamps off (`round1/fleet/safari-jeep_1_night.png` → `round2/fleet/safari-jeep_1_night.png`; same for `utility_0`); trailer framing (`round1/fleet/trailer_0_night.png` → `round2/fleet/trailer_0_night.png`); every night plate's sky.

**Keep**: day plates — the expedition truck, camper and supply truck are the strongest set pieces after the hero car; the mud/wear pass.

---

## 4. Campground (`camp_day/`, `camp_night/`)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 7 | 7 | Same six day / four night set-ups. |
| Geometry | 7 | 7 | Tents, mess frame, watchtower, furniture solid in both. |
| Materials | 6 | 6 | Canvas is fine; the ground is the problem. |
| Lighting | 6 | 4 | R2 `camp_fire_night.png`: fire is a 3-pixel amber dot, ground glow radius ~1 m; R1 lit the mess tent front and six chairs. |
| Shadows | 6 | 4 | R2 `camp_mess.png`/`camp_overhead.png`: the mess tent throws a hard flat black rectangle, ~2 stops darker than the R1 penumbra shadow. |
| Colour / atmosphere | 6 | 4 | R2 night ground is frosty grey-white (`camp_arrive_night.png`), R1 was warm red soil under a blue sky. |
| Environmental integration | 6 | 5 | R2 has bare pink dirt between everything; the camp sits on a car park. |
| Detail density | 7 | 7 | Same props. |
| Visual cleanliness | 6 | 4 | Snow-star sky in every night frame. |

**Top three weaknesses**

1. `shots/round2/camp_night/camp_fire_night.png` — the fire is barely visible: flame quad luma ~0.5 over 3–4 px, no bloom, ground glow does not reach the chairs 1.5 m away. R1 (`round1/camp_night/camp_fire_night.png`) had a clipped-orange flame ~20 px tall and the mess tent front lit amber. Fix: `src/campground/fire.js` — `pointLight.intensity = (7 + 26 * night) * flicker * radius * 2` is fine but `night` is evidently near 0 in this mode; check `setMode` passes `night = 1`; raise `glowR = radius * 5.5` to `* 8` and the flame `makeSystem(Math.round(22 * tier))` core height by 1.5× so the flame is ≥12 px at this distance.
2. `shots/round2/camp_day/camp_mess.png` — the mess tent shadow is a single-value black (luma ~0.06) with a hard edge; the sky at that hour is putting ~0.3 luma of ambient on every other shaded face. Fix: `src/sky.js` L703 `renderer.shadowMap.type = THREE.BasicShadowMap` — this is the source of the hard edge; the PCF path at `src/post.js` L1529 is not the one that wins. Use `PCFSoftShadowMap` and set `sun.shadow.radius` ≥ 2 for the day config; and raise the hemisphere/ground term so the shadow floor is ~0.15.
3. `shots/round2/camp_night/camp_arrive_night.png` — ground is grey-white (R 0.42 G 0.42 B 0.40 by eye) under a moonless sky; the soil is warm red at day. Fix: `src/palette.js` `NIGHT.ground` is being applied as an additive/desaturating fog rather than a lit albedo; set `NIGHT.ground` to a dark warm value (~0x1a1410 lin) and lower `NIGHT_SKY.ground` from 1.0.

**Regressions**: fire (`round1/camp_night/camp_fire_night.png` → `round2/camp_night/camp_fire_night.png`); mess-tent shadow (`round1/camp_day/camp_mess.png` → `round2/camp_day/camp_mess.png`); night ground colour (`round1/camp_night/camp_arrive_night.png` → `round2/camp_night/camp_arrive_night.png`); background hills in `camp_beyond.png`, `camp_gate.png`, `camp_arrive.png` (family 5).

**Keep**: the tent kit, mess frame and furniture geometry; the watchtower; the day camp layout reads as a real overland camp.

---

## 5. Road & terrain (road, mainroad, hero backgrounds, lion_far/pride backgrounds, camp_beyond)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Geometry | 6 | 6 | Two-track ruts, road crown, verge good in both. |
| Materials | 6 | 6 | Rut floor compacted-darker; gravel road in `mainroad.png` reads. |
| Texture quality | 6 | 5 | R2 soil is magenta-pink at day (`truck_day/hero.png` foreground ~ R0.75 G0.45 B0.42); R1 was red-brown. |
| Colour / atmosphere | 6 | 3 | Far hills are saturated cobalt (`truck_day/mainroad.png`, `camp_day/camp_beyond.png`, `lions_day/lion_pride.png`): hue ~225°, sat ~0.6, when the sky at their base is sat ~0.25. |
| Environmental integration | 6 | 3 | `truck_day/mainroad.png`: a hard, straight seam between a pale-gold far plain and the blue hills; white specks scattered on the hill faces. |
| Scale | 6 | 5 | R2 hills read as 300 m away, not 1.5 km; the plain band in front of them is a wall. |
| Detail density | 6 | 5 | Far plain is a flat gold card. |

**Top three weaknesses**

1. `shots/round2/truck_day/mainroad.png` (also `camp_day/camp_beyond.png`, `lions_day/lion_far.png`, `lions_day/lion_pride.png`) — the far-hills mesh is cobalt blue, roughly 1.5 stops darker and 2.5× more saturated than the sky at its base, with a razor seam against a bright gold far plain, and white specks on its faces. Fix: `src/terrain.js` `buildFarHills` — the `MeshLambertMaterial` crest tint at "a twentieth" plus the `hazeChunk` mix to 0.62 by the crests is producing haze-coloured *blue* not haze-coloured *grey*: the haze colour the chunk mixes toward is `PALETTE.haze`-derived airlight, but the blend is being fed the zenith blue. Feed it `horizonOf(sky)` (the horizon band colour) and raise the plain→hill blend width (`smoothstep(400, 620, r)` drop) so the plain/hill join is 200 m of gradient, not a line. The white specks are the far ground map's brightest texels at mip 0 — force `farGroundMap().minFilter = LinearMipmapLinear` and `anisotropy 4`.
2. `shots/round2/truck_day/hero.png`, `lions_day/lion_medium.png`, `lions_walk/lion_medium.png` — near ground is bare pink dirt over 60–70 % of the frame; R1 had continuous tufts. Fix: `src/forest.js` ~L3000 `drift = smoothstep(0.3, 0.7, fbm(x * 0.055 …))` clears too much: widen to `smoothstep(0.15, 0.85, …)` so the low end never hits zero, and add a 0.25 floor. And the soil albedo: `src/textures/ground.js` day soil is too magenta — pull saturation to R1's red-brown.
3. `shots/round2/truck_day/mainroad.png` — the far plain between road end and hills is one flat pale-gold value (~0.85 luma) with no tufts, trees or texture; it reads as a card. Fix: `buildFarHills` plain tint 0.56 → 0.42 and extend the mid-distance grass swath cell grid (`src/forest.js` L124) out to 600 m with a 1-per-4-cells decimation.

**Regressions**: far hills colour and seam (`round1/truck_day/mainroad.png` → `round2/truck_day/mainroad.png`; `round1/camp_day/camp_beyond.png` → `round2/camp_day/camp_beyond.png`; `round1/lions_day/lion_pride.png` → `round2/lions_day/lion_pride.png`); ground cover density (`round1/truck_day/hero.png` → `round2/truck_day/hero.png`); soil hue (`round1/truck_day/forest.png` → `round2/truck_day/forest.png`).

**Keep**: the two-track road itself — rut floor darkening, crown, verge fade in `truck_day/mainroad.png` and `truck_day/forest.png`; road signs and fence posts.

---

## 6. Vegetation (forest views, backgrounds)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Silhouette | 6 | 5 | R2 acacia in `truck_day/forest.png` is a flat-topped fan of large lime cards; R1 crown was denser and greener. |
| Materials | 5 | 5 | Leaf cards have a black-vein pattern that reads at 30 m as cracks. |
| Texture quality | 6 | 5 | R2 tufts are a fine bleached straw, good up close, but there are far fewer of them. |
| Detail density | 6 | 4 | Bare ground between sweeps; see family 5 fix 2. |
| Environmental integration | 6 | 4 | `camp_day/camp_gate.png`: bushes on the right are lime-yellow, bushes on the left are dry grey — same species, one metre apart. |
| Colour / atmosphere | 6 | 4 | Canopy lime-yellow at noon; night canopy is missing entirely. |
| Visual cleanliness | 6 | 4 | `truck_night/forest.png`: trees are bare white branch skeletons — the leaf cards are not drawn at night. |

**Top three weaknesses**

1. `shots/round2/truck_night/forest.png` — every acacia is a bare, pale branch skeleton; R1 (`round1/truck_night/forest.png`) kept dark foliage masses. The leaf cards are either alpha-tested away or their material's night tint is black on black. Fix: `src/forest.js` leaf-card material — the night key (`0.1` per the comment at L1147) is being applied to the card's *alpha-weighted* emissive/ambient path; ensure the canopy's ambient term uses `NIGHT.skyTop` hemisphere light, not the key, so it holds at ~0.04 luma instead of 0.
2. `shots/round2/truck_day/forest.png`, `truck_dusk/forest.png` — the hero acacia crown is ~15 large leaf cards with visible black vein lines; at 25 m they read as painted plywood. Fix: `src/forest.js` L1588-ish tree specs — raise `clumps` for the acacia from 58 toward 90 with `leafScale` 0.13 → 0.09, and in `src/textures/nature.js` drop the vein contrast on the leaf atlas by half.
3. `shots/round2/camp_day/camp_gate.png` — adjacent bushes differ by a full hue step (lime vs grey-straw). Fix: `src/forest.js` bush prototype — the per-plant hue jitter (L3135 "per-plant hue and value jitter") is too wide; clamp hue jitter to ±6° and keep the value jitter.

**Regressions**: night canopy (`round1/truck_night/forest.png` → `round2/truck_night/forest.png`); day canopy density/colour (`round1/truck_day/forest.png` → `round2/truck_day/forest.png`); ground cover density (see family 5).

**Keep**: the close-range tuft cards in `truck_day/hero.png` left edge and `lions_walk/lion_close.png` — bowed, bleached, catch light well; the marula/round trees in the mid-distance at dusk.

---

## 7. Lions (`lions_day`, `lions_dusk`, walk statics)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Silhouette | 5 | 4 | R2 body is longer, legs thinner, head smaller; `lions_walk/walk_03.png` reads as a stylised dog. |
| Geometry | 5 | 4 | `lions_day/lion_close.png` R2: muzzle flattened, eye is a horizontal slit with a seam, ear is a disc. |
| Scale | 5 | 5 | Lioness vs cub ratio plausible in `lions_walk/lion_close.png`. |
| Materials | 5 | 6 | R2 fur is a finer, non-shiny tan; R1 had a bright rim stripe down the spine. |
| Texture quality | 5 | 5 | R2 paws are black, tail tuft black — good — but the flank has no shading gradient. |
| Lighting | 5 | 4 | `lions_dusk/lion_close_dusk.png`: face is a black silhouette with two hot-pink ear interiors. |
| Colour / atmosphere | 5 | 4 | `lions_dusk/lion_medium_dusk.png`: orange haze washes the lion to the same value as the ground. |
| Environmental integration | 5 | 4 | `lions_day/lion_pride.png`: three lions on bare pink dirt, a hard gold grass band behind, cobalt hills behind that. |

**Top three weaknesses**

1. `shots/round2/lions_day/lion_close.png`, `lions_day/lion_face.png` — head: the eyes are two dark slits ~2 px tall with a visible seam line through them, the muzzle is a flat wedge, the ears are perfect discs. R1 (`round1/lions_day/lion_close.png`) had a rounder muzzle and eyes with a visible iris. Fix: `src/wildlife/lion/headspec.js` / `head.js` — eye ball radius and lid gap (the `EYE` spec at `spec.js` L108) has been closed too far: open the lid rim gap by ~40 %, and in `head.js` add the brow ridge back above the orbit; ear: use an ovoid with a folded back edge, not a disc.
2. `shots/round2/lions_walk/walk_03.png`, `lions_day/lion_side.png` — legs are ~60 % of the R1 thickness and the torso ~15 % longer, so the body reads canine. Fix: `src/wildlife/lion/spec.js` `KINDS.lioness.leg` 1.0 → 1.25, `male.leg` 1.0 → 1.3, and in `geometry.js` `legStations` raise the forearm station `[0.38, 0.094, 0.114, 0.108]` radii by 25 % and the gaskin `[0.42, 0.098, 0.12, 0.112]` by 25 %.
3. `shots/round2/lions_dusk/lion_close_dusk.png` — face in shadow at ~0.05 luma, ear interiors hot pink at ~0.7; the sub-surface ear term is applied at full strength against a face with no fill. Fix: `src/wildlife/lion/textures.js` — the `earIn` atlas tile (L34) is painted far pinker/brighter than `earBack` (L72, `[30, 24, 20]`); pull `earIn` toward the coat's own value, and give the lion material a hemisphere fill from `DUSK.antiSun` so the face holds ~0.15 instead of 0.05.

**Regressions**: head shape and eyes (`round1/lions_day/lion_close.png` → `round2/lions_day/lion_close.png`); overall proportions (`round1/lions_walk_fixed/walk_03.png` → `round2/lions_walk/walk_03.png`); ground around the pride (`round1/lions_day/lion_pride.png` → `round2/lions_day/lion_pride.png`).

**Keep**: the R2 fur material (no more spine rim stripe); black paws and tail tuft; the cub's proportions in `lions_walk/lion_close.png`; the dusk pride staging in `lions_dusk/lion_pride_dusk.png` (waterhole and rock lit warm).

---

## 8. Lion feet & gait (`lions_walk_fixed/walk_00..07` vs `lions_walk/walk_00..07`)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Animation | 5 | 5 | Steady forward progress in both; R2 stride is longer but the legs swing as sticks from the shoulder. |
| Physics / ground contact | 4 | 5 | R2 paws touch the dirt in 6 of 8 frames; `walk_01` and `walk_05` show a hind paw ~4 cm above ground. |
| Temporal stability | 5 | 6 | No popping between frames; the fur and head are consistent across the strip. |
| Geometry | 5 | 4 | Legs too thin (family 7 fix 2). |
| Silhouette | 5 | 4 | Motion silhouette is canine. |

**Top three weaknesses**

1. `shots/round2/lions_walk/walk_01.png`, `walk_05.png` — trailing hind paw floats above the ground at the end of stance; the foot should be flat and loaded until toe-off. Fix: `src/wildlife/lion/feet.js` — extend the stance phase on the hind pair (contact window 0.5 → 0.6 of the cycle) and clamp paw y to the terrain sample in `contact.js` for the whole stance.
2. `shots/round2/lions_walk/walk_02.png`..`walk_04.png` — the elbow and stifle do not visibly flex during swing; the whole leg rotates from the root. Fix: `src/wildlife/lion/pose.js` — add swing-phase flexion at `mid` (elbow/stifle) of ~35° peaking at mid-swing, and ~15° at the `low` joint (wrist/hock).
3. `shots/round2/lions_walk/walk_00..07` — the head is locked to the spine; a walking cat's head bobs ~3 cm and the tail swings. Fix: `pose.js` — add head pitch ±4° and tail lateral ±12° at half the stride frequency.

**Regressions**: leg thickness and proportions vs `round1/lions_walk_fixed/walk_03.png`. R1 had stiff stick legs too, so gait itself is not worse.

**Keep**: the strip's temporal consistency; forward speed matches stride (no moon-walk); the removed spine highlight.

---

## 9. Lighting & atmosphere (across hours)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Lighting | 6 | 5 | Day key good; dusk key on wrong side of the truck; night exposure now correct on the car but the ground is grey. |
| Shadows | 6 | 4 | Hard black shadow edges in camp; fine under the truck. |
| Colour / atmosphere | 6 | 3 | Cobalt hills at day; over-orange haze at dusk (`lions_dusk/lion_medium_dusk.png`); snow-white star field at night. |
| Visual cleanliness | 6 | 3 | Every R2 night frame — `truck_night/hero.png`, `camp_night/*`, `fleet/*_night.png`, `glass/night_ext.png` — has a dense field of white discs 1–3 px across, densest in a diagonal Milky Way band; it reads as a snowstorm, not stars. |
| Temporal stability | 6 | 6 | Not measurable in stills beyond glass `flick`. |

**Top three weaknesses**

1. `shots/round2/truck_night/hero.png` (and every night frame) — the star field: several thousand white points, many 2–3 px, the Milky Way band a solid grey-white smear across a third of the sky. R1 (`round1/truck_night/hero.png`) had ~200 faint points. Fix: `src/sky.js` `NIGHT_SKY.stars: 0.7` → 0.25 and `milkyWay: 0.85` → 0.35; in `starGrid` the `radius 0.03` arguments give discs — the comment says "points now" but at 640 px the derivative floor still yields 2 px; halve `radius` and drop the third (`420 cells, fill 0.35`) grid to `fill 0.12`.
2. `shots/round2/truck_day/mainroad.png` — hills 1.5 stops darker and far more saturated than the sky at their base (family 5 fix 1). This is the single most visible flaw at day.
3. `shots/round2/camp_night/camp_arrive_night.png` — ground luma ~0.42 grey under a sky whose horizon is ~0.12; the ground is brighter than the sky at night with no moon in frame. Fix: `src/palette.js` `NIGHT.ground` and `NIGHT_SKY.ground: lin(NIGHT.ground, 1.0)` — the ground term is feeding the fog colour at full; take it to 0.35 and let the soil albedo carry the value.

**Regressions**: stars (`round1/truck_night/hero.png` → `round2/truck_night/hero.png`); night ground colour (`round1/camp_night/camp_arrive_night.png` → `round2/camp_night/camp_arrive_night.png`); hill colour (family 5); camp shadow hardness (family 4).

**Keep**: R2 night exposure on the truck itself — R1's `glass_r1/night/glass_screen.png` lit the bonnet cobalt-blue like daylight through a filter; R2's `glass/night_ext.png` is a truck at night. The dusk sky gradient (amber horizon to violet zenith) in `truck_dusk/hero.png`. The day sky.

---

## 10. HUD (`truck_*/hud.png`)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 4 | 3 | R1: key legend collides with "CHASE CAM" (`round1/truck_day/hud.png`, "N TIME" over "L LIGHTS" over "CHASE CAM"). R2 fixed the legend wrap but the chase camera is clipped into the truck's flank in all three hours. |
| Visual cleanliness | 5 | 6 | R2 legend is three clean rows; build stamp legible. |
| Detail density | 5 | 5 | Speed, cam name, trail name, hints — adequate, nothing else. |

**Top three weaknesses**

1. `shots/round2/truck_day/hud.png`, `truck_dusk/hud.png`, `truck_night/hud.png` — the chase camera sits ~1 m off the truck's left flank at door height; the frame is 60 % green panel, and "47 km/h" overlays the rear quarter. R1 chase cam was 6 m back and 2 m up. Fix: `src/camera.js` — `chaseOffset = (0, 2.35, -7.2)` is right; what is in the frame is a camera at roughly (−1.5, 1.2, 0), so the offset is being applied after the drag-look yaw (`CLICK TO LOOK AROUND` is live in the shot) rotates it into the truck's side. Apply the look yaw to the *view direction* only, not to the offset vector, and collide the chase camera against the body box so it can never sit inside the flank.
2. `shots/round2/truck_day/hud.png` — the legend and speed overlap the vehicle because there is no backing; text drops to ~0.6 contrast over the green. Fix: `src/hud.js` — add a 40 % black gradient strip 90 px tall behind the bottom row.
3. `shots/round2/truck_night/hud.png` — the trail name and hints are pure white at night with no dimming; they are the brightest thing in the frame. Fix: `src/hud.js` — scale text alpha by the mode (0.7 at night).

**Regressions**: chase camera position (`round1/truck_day/hud.png` → `round2/truck_day/hud.png`).

**Keep**: the R2 three-row legend layout; the build stamp.

---

## Overall

**Three weakest families in round 2 (ranked)**

1. **Lighting & atmosphere** — the snow-star sky is in every one of the ~30 night frames, the cobalt hills are in every daytime frame with a horizon, and the camp shadows went hard black. This family regressed in all three hours.
2. **Road & terrain / Vegetation** (tied, same root cause) — bare pink dirt over most of the near ground, the flat gold far plain, lime plywood acacia crowns, missing night canopy.
3. **Lions** — the round-2 body is a thinner, longer, smaller-headed animal with slit eyes and disc ears; it reads as a stylised dog in motion and a flattened cow at rest. Round 1 was not good either, but it was more lion.

**Single highest-leverage fix**: the far-hills / haze mix in `src/terrain.js buildFarHills` plus `NIGHT_SKY.stars`/`milkyWay` in `src/sky.js`. Two numeric changes in two files clean the horizon of every day frame and the sky of every night frame — the two things that sit behind the hero car in the first second of play.

**First ten seconds of the hero view**

- *Day* (`shots/round2/truck_day/hero.png`): a very good truck — tyres, rack, winch, paint break-up — parked on magenta-pink dirt with patchy straw, in front of a row of saturated cobalt hills with a hard seam under them. The eye goes to the car (good), then to the hills (bad) within a second.
- *Dusk* (`shots/round2/truck_dusk/hero.png`): a handsome amber-to-violet sky and a truck whose front bumper glows white from a light source that is not the sun in that sky. A player will register "the front is lit wrong" without knowing why. The ground reads as wet red clay — acceptable.
- *Night* (`shots/round2/truck_night/hero.png`): it is snowing. The truck itself is finally exposed like a truck at night, with lit lamps, but the sky is a blizzard of white points and the lamps light nothing on the ground. The first thought is "why is it snowing on the savanna."
