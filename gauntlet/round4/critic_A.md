# Round 4 — Critic A

**Incumbent:** round 2, build `a8ca6eb`, `shots/round2/`.
**Candidate:** round 4, build `80cb5e6`, `shots/round4/`.
**Frames:** all 103 candidate frames against their 103 incumbent pairs (206 frames), viewed side by side on contact sheets, then as full-size vertical pairs and crops for every region quoted below.
**Method:** PIL + numpy scratch scripts under `/tmp/criticA/` (none in the repo). sRGB means, linear luminance Y (sRGB decoded), hue/saturation from the region mean, fractions over a threshold, 4-connected blob labelling for stars, a median-of-8 background for the walk strip. Ratios are in stops (log2 of linear Y). The `truck_*` and `glass/` frames are 640×360; `camp_*` and `lions_*` are 512×288; `fleet/` is 480×270; round-2 `glass/` frames are 320×180 (compared after resampling — resolution is not scored). Code was read only via `git show 80cb5e6:<path>`. I have not read `PROGRESS.md`, `CHANGELOG.md`, the other critics or any other `shots/` folder.

Softness, missing MSAA and the software rasteriser are not penalised anywhere below.

---

## The three round-2 blockers

### 1. Night sky read as snow — **closed**

`truck_night/hero.png`, top 80 rows, sky only (moon disc r ≤ 45 px around (72, 62) and the truck's light-bar glow in cols 160–480 / rows 40–80 masked out):

| | round 2 | round 4 |
|---|---|---|
| sky pixels > 0.35 luma | **19.45 %** | **0.15 %** |
| sky pixels > 0.5 | 1.46 % | 0.03 % |
| sky pixels > 0.2 | 48.7 % | 13.1 % |
| sky mean / p50 / p99 luma | 0.196 / 0.168 / 0.533 | 0.124 / 0.115 / 0.292 |
| blobs > 0.35 | 462 (87 % ≤ 4 px, max 6240 px) | 22 (95 % ≤ 4 px, max 7 px) |

Round 1 was 0.45 %; round 4 is a third of that. The stars are points: 22 blobs, median 2 px, none over 7 px. The Milky Way now reads as a band — a soft diagonal glow with mottled structure in `camp_night/camp_fire_night.png` and `camp_arrive_night.png` — not a dot field; the `starGrid` dusting is gone (`src/sky.js` L131–151: two grids plus an analytic `band × lane × cloud` profile). The truck is legible, not a silhouette: flank Y 0.113 (R2 0.090), the light bar's LED row, both headlamps with lens detail and the amber bumper markers all read (`truck_night/detail.png`).

Two things that come with it (scored under Lighting, not blockers): the moon is a 50‑px soft blob — ring luma 0.72 at r = 3, 0.55 at r = 15, 0.34 at r = 25, 0.17 at r = 40 — with no disc edge; and the sky itself is a saturated cobalt (right-hand sky box sRGB (0.050, 0.072, 0.149), hue 227°, **sat 0.66**, R2 sat 0.28).

### 2. Far hills saturated cobalt / cream band — **closed as a blocker; two of four frames sit outside the target band**

Hill box directly under the ridge sky, same sky box both rounds (the sky box measures the same to three decimals between rounds on `mainroad` and `camp_beyond` — Y 0.350 / 0.338 — so the change is all in the hills).

| frame (sun) | R2 hill hue / sat / Y÷sky | R4 hill hue / sat / Y÷sky | band below ÷ sky | verdict |
|---|---|---|---|---|
| `truck_day/mainroad.png` (sun behind-left) | 220° / 0.41 / 0.42 (−1.24 st) | 221° / **0.19** / **0.75** (−0.41 st) | 0.53 (was 0.28) | in band |
| `fleet/pickup_0_day.png` (sun behind) | 220° / 0.38 / 0.40 (−1.32 st) | 222° / **0.13** / **0.73** (−0.45 st) | 0.44 | in band |
| `camp_day/camp_beyond.png` (sun behind-right) | 217° / 0.33 / 0.74 (−0.43 st) | 218° / **0.16** / **1.01** (+0.02 st) | 0.76 | **over** — hills are the sky's luma, the ridge dissolves |
| `lions_day/lion_far.png` (into the sun) | 222° / 0.34 / 0.37 (−1.42 st) | 225° / **0.14** / **0.61** (−0.72 st) | 0.61, band ÷ hill **0.00 st** (was +1.05) | **under** by 0.15 |

Saturation is ≤ 0.19 everywhere (target ≤ 0.25). The cream band is gone: on `lion_far` the strip under the hills is now equal to the hill (R2 was a full stop brighter than it); no frame has a band brighter than its sky. The round-2 signs are still there — into the sun under, sun behind over — but the amplitude has collapsed from 2.5 stops under / 0.2 over to 0.11 under / 0.09 over the band, and the hue and saturation are the sky's. The two out-of-band frames are a tuning miss, not the round-2 defect. The dark 1–2° speckle on the faces is gone in all four.

### 3. Shade under the mess canopy a hole — **filled, but still a stop too deep and hard-edged**

`camp_day/camp_mess.png`, ground under the canopy (box 256,200–400,236) against sunlit dirt a metre either side:

| | R2 | R4 | target |
|---|---|---|---|
| shade Y | 0.0048 | 0.0450 | |
| vs sunlit dirt left (Y 0.42) | −6.47 st | **−3.24 st** | −1.5 … −2 |
| vs sunlit dirt right (Y 0.33) | −6.16 st | **−2.85 st** | −1.5 … −2 |
| shade colour | (0.059, 0.049, 0.052) | (0.266, 0.216, 0.184) hue 24° sat 0.31 | |

Chairs are readable (striped canvas seats, timber frames, the table top and the crate on it all resolve; R2 was a black slab). The edge: row 230 goes 0.30 → 0.19 → 0.09 → 0.05 → 0.03 over 16 px — softer than R2's 0.53 → 0.023 in 4 px, but still a defined line, with a visible PCSS dither speckle along it. The shade is a flat neutral grey-brown with no sky-blue in it and no bounce gradient toward the sunlit side. `camp_interior.png` shows the same grey under the mess from the cab. Three stops closer than round 2, one stop short of the target: I would not call this blocker closed; it is no longer a hole.

---

## 1 Hero car

Frames: `truck_day/*`, `truck_dusk/*`, `truck_night/*` (33 frames, `hud.png` scored under 10).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | same cameras; `road`/`mainroad` framing unchanged |
| 2 | Silhouette | 7 → 7 | roof rack, snorkel, jerry cans — unchanged geometry |
| 3 | Geometry | 7 → 7 | tyre lugs are still extruded cubes in `wheel.png`; rack tubes fine |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 7 | paint now reads as a clearcoated dielectric (bonnet carries a sky gradient, body p99 Y 0.54 → 0.59, > 0.6 fraction 0.19 → 0.74 %); door dust band drier and lighter (hue 36° → 40°, sat 0.47 → 0.41); rubber and blasted steel hold |
| 6 | Texture quality | 6 → 7 | dash crackle gone (`truck_day/interior.png`: dash top is a matt grey-beige grain, R2 was a marbled crackle on every surface); wheel-arch dust has streak shape |
| 7 | Glass / transparency | 8 → 7 | see 2 Car glass — panes veiled ~0.02 more, mirror a horizon card |
| 8 | Lighting | 7 → 7 | dusk front no longer clips: grille box p95 Y 0.60 → 0.51, > 0.7 fraction 1.3 → 0.0 %, sky p95 0.43; night lamps hour-keyed (LED bar and headlamps lit at dusk and night, off by day) |
| 9 | Shadows | 7 → 7 | contact under chassis holds; `wheel.png` tyre-to-rut contact holds |
| 10 | Reflections | 5 → 6 | bonnet and roof edge carry the sky; door skin reflection still a flat wash |
| 11 | Color / atmosphere | 6 → 7 | dusk holds its amber without the cream slab; night truck sits in a blue key |
| 12 | Animation | — | |
| 13 | Physics / contact | 8 → 8 | |
| 14 | Detail density | 7 → 7 | |
| 15 | Integration | 6 → 7 | dust runs with the arch fans; sill and rock slider grey film not clay |
| 16 | Cleanliness | 7 → 7 | no acne on the body; light-bar bloom is the only halo |
| 17 | Temporal | — | |

Queue check (consensus, hero car): dusk brightwork clip — **addressed** (`truck_dusk/hero.png`, grille p95 0.60 → 0.51, no pixels over 0.7); side-pane Fresnel and dust — **addressed** (`glass/side_sun.png`, veil 0.074 → 0.087, a grey film with a Fresnel rise at the grazing end); interior crackle — **addressed** on the dash and door cards (`truck_day/interior.png`), seat fabric was already its own map; mirror fallback at `fast` — **addressed** (`glass/mirror.png`, horizon card); night beam pool — **addressed** (`truck_night/hero.png`, ground ahead of the lamps Y 0.054 against 0.010 beside).

**What the materials are.** Paint: a dark green basecoat under a smooth clearcoat — the roof edge and bonnet catch the sky, the door skin a broad low-contrast wash (`makePaintMaterial`, `src/textures/vehicle.js`; the door needs a rougher clearcoat lobe or an env sample that isn't the horizon). Dust: a pale laterite film thickening downwards (`applyDirt` with `LATERITE`, `src/vehicle/materials.js` L60–95) — right for murram; the arch fan is a fan. Rubber: matt, dust in the sipes. Steel: blasted, warm. Dash: matt vinyl now, not crackle.

**Top three weaknesses**
1. `truck_night/hero.png` — the moon is a soft blob with no disc (ring luma 0.72 / 0.55 / 0.34 / 0.17 at r = 3 / 15 / 25 / 40 px). Fix: `src/sky.js` NIGHT preset (L318–333) `aureole: 0.10 → 0.03` and the disc glow `col += uSunColor * pow(cp, 90.0) * uGlow` needs a second, tighter term for the moon (`pow(cp, 600.0)`) gated by `uMoonDetail`, with `glow: 2.0 → 1.2`; then `src/post.js` night `bloom.threshold 2.0` is fine but `radius 0.35 → 0.25` so the bar and the moon do not merge.
2. `truck_day/wheel.png`, `truck_day/hero.png` — tyre lugs are rectangular prisms with hard vertical walls; at this distance they read as toy-block tread. Fix: `src/vehicle/wheels.js` lug profile — chamfer the lug top (two extra rows on the extruded star, 15 % inset) and add the sipe cut across the lug; sidewall lettering ring at the same time.
3. `truck_day/hero.png` door skin — the paint reflection on the vertical door is a flat wash (door box p95 Y 0.42, no gradient top to bottom). Fix: `applyBrightwork` clearcoat path (`src/textures/vehicle.js` L336–345) — grade `uBwStrength` by `clearcoatRoughness` as the comment says, but the door's `paintDark` in `src/vehicle/materials.js` L125–129 needs `clearcoatRoughness 0.11 → 0.06` and `envMapIntensity` one step up so the horizon line lands on the skin.

**Regressions.** Glass/transparency −1 (below). Nothing over one point.

**Must not regress.** Dusk front legibility (grille p95 0.51 against sky 0.43). Hour-keyed lamps. Chassis and tyre contact shadows. Dash without crackle. Dust fan shape.

---

## 2 Car glass

Frames: `glass/*` (13) + `metrics.json`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 5 | Materials | 6 → 7 | the pane now *is* a pane: a neutral grey Fresnel film with a dust band, not a tan tint (`side_sun`, `side_shade`) |
| 6 | Texture quality | 6 → 6 | dust film is an even veil, no wiper arcs, no streak direction |
| 7 | Glass / transparency | 8 → 7 | tool `see` down in 10 of 12 panes: `ws_mid` 0.850 → 0.787, `moving` 0.845 → 0.759, `side_shade` 0.743 → 0.678, `side_sun` 0.716 → 0.670, `interior` 0.834 → 0.789; veil up 0.01–0.03 everywhere. The interior still reads through every pane; the trade for a visible pane is real but the haze is uniform |
| 8 | Lighting | 7 → 7 | `dusk_ws` holds (see 0.82 → 0.84); `night_int` see 0.90 → 0.92 |
| 10 | Reflections | 4 → 5 | `mirror.png`: the orange-to-grey slab is now a horizon card — pale sky over a sand plain with a ridge line and two tree specks — a plausible mirror at `fast`, but static; side panes carry no environment |
| 11 | Color / atmosphere | 6 → 7 | tan film gone; film colour `0x9c8468` under the sky |
| 16 | Cleanliness | 7 → 7 | hot 0 in all twelve; hidden 43 → 44 |
| 17 | Temporal | 6 → 6 | `moving` flick 0.098 → 0.099, the worst pane, unchanged |

On the mirror's own numbers (`see` 0.59 → 0.33, veil 0.149 → 0.215): a mirror is not supposed to be seen through, so the tool's metric inverts here — score what is in the frame, which is better.

Queue check (consensus, glass): door mirror reflects nothing (#7) — **addressed** as a horizon card, not a live reflection; glass frames at 320×180 (tool) — **fixed**, round 4 is 640×360.

**Top three weaknesses**
1. `glass/mirror.png` — the horizon card is a flat gradient with the ridge at a fixed height; it does not move with the camera and shows no truck flank. Fix: `applyMirrorHorizon` (`src/textures/vehicle.js` L660, applied at `src/vehicle/materials.js` L295) — tilt the card's horizon by the mirror normal's pitch and add the truck's own flank as a dark lower third (the shader already samples `mhSkyRef` from the env at `src/textures/vehicle.js` L829 — use it for the top half and a `PALETTE.bodyPaintDark` band below the horizon).
2. `glass/side_sun.png`, `side_shade.png` — the dust film is a uniform veil (veil 0.087 / 0.124); real door glass wears a wiped arc, streaks from the top rail and a clean band at the seal. Fix: `pane('glassSide')` `film.dustAmount 1.0` is fine but `band: 0` should become `0.35` with a directional streak in `glassRoughness('side')` (`src/textures/vehicle.js`) — stretch the noise 6:1 vertically.
3. `glass/moving.png` — flick 0.099, ten times the other panes. Fix: the moving pane's reflection samples the env at mip 0.5 (`mhSkyRef`); clamp to mip ≥ 1.5 while `speed > 2 m/s` in `src/vehicle/mirrors.js`.

**Regressions.** Transparency 8 → 7 on `ws_mid`, `moving`, `side_shade` (numbers above): exactly one point, allowed, but it must not go further.

**Must not regress.** Zero hot pixels; `dusk_ws` and `night_*` see ≥ 0.84; the interior reading through the screen; the mirror showing a horizon rather than a slab.

---

## 3 Fleet

Frames: `fleet/*` (24).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | `trailer_0_day.png` / `trailer_0_night.png` still framed against the trailer's tarp — the bounding-sphere tool defect from round 2 is **not** fixed; not scored |
| 2 | Silhouette | 6 → 6 | |
| 3 | Geometry | 6 → 6 | `motorcycle_0_day.png`: wheel outline still notched at 480 wide; the code says 40 rim segments, the notch is the single lug row — cannot separate at this size |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 7 | `safari-jeep_0_day.png`: painted steel with rivets and a stripe, bonnet carries a sheen; spare tyre matt rubber; bumper tube a dull galvanised grey |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | 5 → 6 | magenta pane pixels 0.00–0.02 % → 0.00–0.01 % on `ranger`, `utility`, `safari-jeep_0` — gone; jeep screen shows the seat through a warm tint |
| 8 | Lighting | 5 → 6 | night: pools only under the arriving `pickup_0` (ground Y 0.085, > 0.6 fraction 5.7 %); unlit vehicles' ground Y 0.004–0.010 (R2 0.012–0.025) — the residue pools are gone; amber markers on `ranger`, `utility`; camper window lit; lanterns and fire glow behind the row |
| 9 | Shadows | 7 → 7 | |
| 11 | Color / atmosphere | 5 → 6 | night sky is the same saturated cobalt as the hero (sat 0.6–0.7); vehicles darker (mean Y halved) but still legible in `ranger_0_night.png` |
| 13 | Physics / contact | 7 → 7 | |
| 14 | Detail density | 6 → 6 | |
| 16 | Cleanliness | 6 → 6 | `trailer_0_night.png` tarp has 5.5 % hot pixels — a specular sheet at a grazing camera; tool framing, not scored |

Queue check (consensus, fleet): night markers and pools — **addressed** (`pickup_0_night.png` pool under lit lamps only; markers on `ranger`, `utility`; unlit ground Y ≤ 0.010); camp lanterns anchored near the row — **partly** (lanterns and fire behind the row, but the far vehicles sit at Y 0.009); magenta panes — **addressed** (0.00–0.01 %); motorcycle wheels — **not** (`motorcycle_0_day.png` unchanged); trailer bounds (tool) — **not** (both trailer frames still against the tarp); fleet night vehicles unlit silhouettes — **partly**.

**Top three weaknesses**
1. `fleet/trailer_0_day.png`, `trailer_0_night.png` — camera inside the trailer's bounding sphere, tarp fills the frame both rounds. Tool fix (`tools/fleetshots.mjs`): size the camera from the body's box, not the sphere the hitch pole inflates; until then the trailer has no score.
2. `fleet/safari-jeep_1_night.png`, `suv_0_night.png` — unlit vehicles are Y 0.009 bodies against Y 0.011 sky: silhouettes with no camp light on them. Fix: `src/campground/index.js` L119 `rowLamp{i}` (`intensity 12, distance 14, decay 1.6`) are the lights meant for the row and they do not reach the far vehicles at Y 0.009: `intensity 12 → 18`, `distance 14 → 18`; and the fleet paint's `envMapIntensity 0.3` (`src/vehicles/materials.js` L532) gives the moonlit sky nothing to sit on — `0.3 → 0.5`.
3. `fleet/motorcycle_0_day.png` — front wheel still a notched polygon at this distance, one lug row (`src/vehicles/parts.js` L235 `rows = style === 'moto' ? [[0, w*0.62, 0]]`). Fix: two staggered rows for `moto` as for the cars, lug height ×0.6.

**Regressions.** None over one point. Fleet night mean Y is halved (0.02 → 0.01) — a deliberate darkening, and the vehicles still read.

**Must not regress.** Magenta panes at 0 %. Pools only under lit lamps. The arriving pickup's lit pool.

---

## 4 Campground

Frames: `camp_day/*` (6), `camp_night/*` (4).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 3 | Geometry | 6 → 6 | gate poles, chairs, tables unchanged; new building at the gate's right (`camp_gate.png`) |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 7 | canvas: olive-khaki weave with translucency in the under-face (`camp_mess.png`); chair seats striped cotton; timber poles a brown bark cylinder (grain along, no end-grain); pad soil pale packed laterite with darker worn paths |
| 6 | Texture quality | 6 → 6 | canopy weave tiles cleanly; pad ground under the mess is still one scale (no fine grit under the chairs) |
| 8 | Lighting | 6 → 7 | shade −6.3 → −3.0 st (blocker 3); night pad no longer a snowfield: `camp_arrive_night.png` pad Y 0.036 → 0.007, hue 255° → 317°, sat 0.11 → 0.13 |
| 9 | Shadows | 6 → 6 | canopy edge softened but still a line with PCSS dither speckle; no penumbra gradient across the shade |
| 11 | Color / atmosphere | 6 → 7 | `camp_fire_night.png`: warm-lit pixels 21 → 41 % of the frame, spread across all five column-fifths (R2 5/23/38/29/10 %) — the fire reaches; the sky's Milky Way band is visible |
| 14 | Detail density | 7 → 7 | |
| 15 | Integration | 6 → 7 | worn paths from gate to mess read in `camp_overhead.png` |
| 16 | Cleanliness | 6 → 6 | shadow-edge dither; canopy under-face has a faint lit-from-within look in `camp_mess_night.png` |

Queue check (consensus, campground): fire reach — **addressed** (`camp_fire_night.png` warm-lit 21 → 41 %, all five column-fifths); flame size — **not** (pixels over 0.5 luma 2.5 → 0.8 %; the flame is smaller than round 2's); gate timber — **not** (`camp_gate.png` poles unchanged); ground tile scale under the mess — **not** (one grit scale under the chairs); worn paths — **partly** (present in both rounds, unchanged; `camp_overhead.png`); camp pad as a snowfield at night — **addressed** (pad Y 0.036 → 0.007, hue 255° → 317°).

**Top three weaknesses**
1. `camp_day/camp_mess.png` — shade one stop too deep (−2.85 / −3.24 st vs target −1.5 … −2). The sky module's own note (`src/sky.js` L370–387) says the remaining gap is on the receivers. Fix: `src/campground/ground.js` L505 `campWear` `envMapIntensity: 0.6 → 1.0` (the props sit at `ENV_MATT = 0.8`, the pad decal under them at 0.6); and `src/terrain.js` L2095–2096 stops folding `surfAo` into the albedo (`albedo *= mix(1.0, clamp(surfAo,0,1.3), 0.55)`) where the shadow term is < 0.3 — that 0.55 is taken twice in shade, once here and once in the indirect term.
2. `camp_day/camp_mess.png` shadow edge — dither speckle along the boundary and no gradient inside. Fix: `src/sky.js` L404 day `shadow.farRadius 2.4 → 3.6` texels (45 cm at 12.7 cm/texel), and `farStrength` (present in dusk/night, absent in day) `0.92` so the far cascade is not full black.
3. `camp_day/camp_gate.png` — gate timber is a smooth brown cylinder: no end grain on the cut ends, no checking, one roughness. Fix: `src/campground/textures.js` timber maps — add an end-cap UV region with concentric rings and a roughness map with 0.6/0.95 split along the grain; `src/campground/structures.js` gate poles use it on the caps.

**Regressions.** None.

**Must not regress.** Chairs readable in shade; night pad Y ≤ 0.01 with a warm hue; fire reach across the frame; canvas translucency.

---

## 5 Road & terrain

Frames: `truck_day/road.png`, `mainroad.png`, `forest.png`, `truck_dusk/*` and `truck_night/*` road frames, `camp_day/camp_beyond.png`, `lions_day/lion_far.png`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 3 | Geometry | 6 → 6 | ruts and crown hold; `mainroad.png` far hills are smooth silhouettes now |
| 5 | Materials | 6 → 7 | soil is laterite: foreground `truck_day/hero.png` sRGB (0.573, 0.364, 0.230), hue 24°, sat 0.60 (R2 24° / 0.59 — unchanged, correct); rut floors darker packed fines; straw crown |
| 6 | Texture quality | 6 → 6 | mid-ground road tile repeat still visible in `road.png` (the rut-wall speckle pattern recurs down the track); micro-contrast of the foreground unchanged (std 0.051 both) |
| 8 | Lighting | 6 → 7 | `mainroad.png` ground under the ridge is 0.86 of the sky, a plain in haze |
| 9 | Shadows | 6 → 6 | |
| 11 | Color / atmosphere | 4 → 7 | hills: sat 0.41 → 0.19, Y ratio 0.42 → 0.75 (`mainroad`); cream band gone (`lion_far` band ÷ hill 0.00 st) — blocker 2 |
| 14 | Detail density | 6 → 6 | |
| 16 | Cleanliness | 5 → 6 | hill speckle gone; `night_road` fog no longer grey-blue (fg hue 353° → 1°, sat 0.15 → 0.25) |

Queue check (consensus, road & terrain): far hills (#2) — **closed as a defect**, two frames outside the band (above); night ground / grade grey-blue — **addressed** (`truck_night/road.png` fg hue 353° → 1°, `camp_arrive_night.png` pad hue 255° → 317°); headlamps light nothing on the road — **addressed**; mid-ground road tile repeat — **not**; waterhole a flat disc with a stepped edge — **not** (`lions_day/lion_pride.png`: still a flat grey ellipse, edge unchanged).

**Top three weaknesses**
1. `camp_day/camp_beyond.png` — hills at 1.01 of the sky (target 0.72–0.92): the ridge line vanishes. `lions_day/lion_far.png` at 0.61: under the floor. Both come from the hill blend in `src/terrain.js` L5117–5150: `hillFog = smoothstep(100, 650, hillDist) * 0.76` leaves 24 % of the hill's own lit value into the sun (too dark on `lion_far`), while `hillAir = air × (0.85, 0.87, 0.91)` capped at `0.92 × hillAirL` is measured against the air in the hill's *own* direction — the horizon band, which is brighter than the sky over the ridge — so with the sun behind the camera the hill lands level with the ridge sky. Fix: `hillFog` floor `0.76 → 0.84`, `hillAir` factor `(0.85, 0.87, 0.91) → (0.80, 0.82, 0.88)`, cap `0.92 → 0.86`; re-measure the four frames against the 0.72–0.92 band.
2. `truck_day/road.png` — mid-ground repeat. Fix: the road-space `mTrack` mask at `src/terrain.js` L2085–2091 keys off `rsEdge.b + mid.g`; rotate the `mid` sample by the road-space distance (`d * 0.017`) so the tile does not align with the ruts.
3. `truck_night/road.png`, `truck_night/hero.png` — the headlamp pool is there now (bottom-third Y 0.059 in the column-fifth the truck points into, R2 0.043–0.065 with no lamps to explain it), but everything outside it is black: the other four fifths sit at Y 0.006–0.015 and the foreground p5 is 0.0013 — the moon key's shadow half has no texture at all. Fix: `src/sky.js` NIGHT L510 `hemi.intensity 0.22 → 0.35` and L558 `shadow.intensity 0.88 → 0.78`, so the shaded ground floors at Y ≈ 0.004 and the rut walls read; the pool (`src/vehicle/index.js` L91 `SpotLight(PALETTE.headlight, …, 34, 0.46, 0.3, 0.4)` aimed 6° down) stays as it is.

**Regressions.** None.

**Must not regress.** Hill saturation ≤ 0.19; no band below the hills brighter than the sky; laterite hue 24° / sat 0.60 on the foreground.

---

## 6 Vegetation

Frames: `truck_day/forest.png`, `hero.png`, `lions_day/lion_pride.png`, `lion_far.png`, `lion_medium.png`, `truck_dusk/forest.png`, `truck_night/forest.png`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 6 → 6 | acacia crowns are still flat discs on a fork |
| 3 | Geometry | 5 → 5 | grass tufts are crossed cards; no change |
| 5 | Materials | 5 → 6 | straw has a lit rim at dusk; canopy leaf cards carry a lit/shade split |
| 6 | Texture quality | 6 → 6 | |
| 8 | Lighting | 5 → 6 | crown lit/shade: `truck_day/hero.png` crown Y p10→p90 spread 1.9 → 2.6 st; `forest.png` crown p50 0.033 → 0.071 |
| 11 | Color / atmosphere | 5 → 6 | dusk canopies: top-half pixels Y < 0.01 12.2 → 8.3 % — still black cut-outs on the sun side |
| 14 | Detail density | 5 → 6 | straw/green pixel fraction: `lion_far` 27.5 → 42.5 %, `truck_day/hero` 10.2 → 14.3 %, `lion_medium` 15.0 → 18.3 %, **`lion_pride` 17.8 → 18.6 %** — the pride lawn is still bald |
| 15 | Integration | 6 → 6 | |
| 16 | Cleanliness | 6 → 6 | |

Queue check: plain density — partly (`lion_far`, `hero` yes; `lion_pride` no). Crown lit/shade split — partly (spread up 0.7 st, but no self-shadow inside the crown). Dusk translucency — partly (−4 % black). Night canopy ambient — addressed by the sky, not the canopy: `truck_night/forest.png` canopy band Y 0.0054 against sky 0.0063 (−0.2 st) — trees are silhouettes with a shape, no longer pale skeletons.

**Top three weaknesses**
1. `lions_day/lion_pride.png` — the near ground round the pride is still bare (18.6 % straw, `lion_far` 42.5 %). The lawn is already down to 7–11 m (`src/forest.js` L3255 `lawn: 1 - smoothstep(7, 11, lionD)`) but the grazed ring runs to 20 m (L3260 `graze: 1 - smoothstep(9, 20, lionD)`) and the tufts inside it are scaled to 0.68 (L3480 `sizeAt`) *and* thinned (L3442 `lerp(1, 0.7, s.lawn)`, L3536 forbs to zero at `lawn > 0.3`), so the pride frame's whole near ground is short, sparse straw. Fix: `graze` outer radius 20 → 14 m, `sizeAt` graze factor 0.68 → 0.8, and let forbs through at `lawn > 0.6` instead of 0.3.
2. `truck_dusk/forest.png` — 8.3 % of the upper half is under Y 0.01: sun-side canopies are cut-outs. Fix: `src/forest.js` leaf-card material — `MeshStandardMaterial.side: DoubleSide` with a transmission term (`emissive = albedo × backlight × 0.3` in `onBeforeCompile`, keyed by `dot(-N, sunDir)`), the same trick `canvasTranslucency` does for the canopy in `src/campground/materials.js`.
3. `truck_day/forest.png` — crowns lit as a whole disc. Fix: `src/forest.js` crown assembly — bake a vertex AO into the crown cards (`ao = 0.55 + 0.45 × height-in-crown`) and read it in the leaf shader.

**Regressions.** None.

**Must not regress.** Plain density on `lion_far` and `hero`; the night silhouette read.

---

## 7 Lions

Frames: `lions_day/*` (7), `lions_dusk/*` (3), `lions_walk/lion_*` (4).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 4 → 5 | `lion_side.png`: back line, deep chest, hip knuckle read; the neck still meets the skull as a wedge; tail hangs |
| 3 | Geometry | 4 → 5 | `lion_face.png`: the cone snout, floating ears and eyes on top of the skull are gone — brow ledge, muzzle box, chin, whisker pads, lids. Still a plush: the muzzle is a rounded loaf with no zygomatic shelf under the eye, the eyes are full spheres showing a ring of white round the iris head-on, the ears are cups on the crown corners, the torso is a smooth loft with the `muscle` bulges reading as soft swellings, not bone |
| 4 | Scale | 6 → 6 | head reads right against the trunk in the strip; cub-to-lioness ratio holds in `lion_close.png` |
| 5 | Materials | 4 → 5 | fur is a fine isotropic grain — flank micro-contrast std 0.056 (R2 0.062) with the deep shadows lifted (p1 Y 0.010 → 0.039). It is a tinted velvet, not fur: no strand direction, no rim scatter, no darker guard-hair line down the spine |
| 6 | Texture quality | 5 → 6 | saddle shading break and thigh seam gone in `lion_close.png`; belly tint reads |
| 8 | Lighting | 5 → 6 | |
| 9 | Shadows | 4 → 5 | `lion_side.png`: ground under the hindquarters Y 0.17–0.22 against 0.25–0.28 beside (≈ −0.4 st) — a soft dip, no crisp contact under any paw |
| 10 | Reflections (eyes) | 3 → 6 | amber iris with a catch-light is back (`lion_face.png`, `lion_close.png`) |
| 11 | Color / atmosphere | 6 → 6 | |
| 13 | Physics / contact | 5 → 5 | lying lioness's elbows and paws sit on the ground; no sink, no float |
| 14 | Detail density | 4 → 5 | nose leather, whisker dots, chin, lids, ear cups; no whiskers and no claws in any frame (`src/wildlife/lion/geometry.js` L38: detail tier 1 has `claws: false, whiskers: false`) |
| 15 | Integration | 5 → 5 | |
| 16 | Cleanliness | 5 → 6 | far-cascade acne on the neck not seen in `lion_close.png` |

**What the material is.** A velvet-textured tan dielectric with a lifted ambient. Real fur is anisotropic and scatters at the rim; this has neither — the silhouette is a hard line with no haze.

Queue check (consensus, lions): eyes and lids — **addressed** (amber iris, lids, catch-light; `lion_face.png`); mouth — **addressed** (a lip line with a chin, not a painted hook); ears — **addressed** (cups, not discs; still rooted on the crown corners); saddle normals and thigh weld — **addressed** (`lion_close.png`); shoulder/hip masses — **partly** (soft Gaussian mounds); paws — **partly** (the leg's colour with toe pads in `lion_close.png`; in the walk strip at 512 wide the feet still read as dark stubs); contact blobs — **partly** (a −0.4 st dip under the body, nothing under the paws; `lion_side.png`).

Note on the source: the head profile at `80cb5e6:src/wildlife/lion/headspec.js` carries comments describing a *round-5* head that measures a "round-4" head as bear-like (huge nose, close-set eyes). The `lion_face.png` frame shows the bear-like head. Either the frames were shot before that file's last edit or the build does not include it; the master should confirm `shots/round4` and `80cb5e6` agree before crediting the head.

**Top three weaknesses**
1. `lions_day/lion_face.png` — eyes are full spheres with visible sclera ring head-on, sitting proud of the face. Fix: `src/wildlife/lion/spec.js` `EYE.r 0.0195` with `EYE_LIDS.scale` giving a 0.0261 ball — sink the socket 30 % (the `lidL/lidR` joints at z 1.066 → 1.052) and close `lidUp/lidDown 0.46 → 0.38` so the lid covers the top third; paint the sclera the iris colour in `src/wildlife/lion/textures.js`.
2. `lions_day/lion_close.png` — the torso is a smooth loft; the `muscle()` bulges (`src/wildlife/lion/geometry.js` L440–461) are Gaussians of amplitude 0.024–0.05 m over radii 0.16–0.28 m — soft mounds. A lion's shoulder blade is a plane with an edge and the hip a knuckle. Fix: replace the scapula bulge (L448: `bulge(p, 0.19s, 1.0s, 0.34s, 0.28s, 0.024s)`) with a flat-topped profile (`smoothstep` plateau, `amt × (1 − smoothstep(0.6, 1.0, r))`) and add a negative bulge behind it for the triceps groove.
3. `lions_day/lion_close.png` fur — isotropic grain. Fix: `src/wildlife/lion/textures.js` body atlas — stretch the grain 4:1 along the `u` (spine-to-belly) direction, add a darker dorsal stripe 0.08 wide at `v ≈ 0.5`, and in the fur material set `sheen 0.4, sheenRoughness 0.6, sheenColor` the fur's own tint (MeshPhysicalMaterial) for the rim.

**Regressions.** None.

**Must not regress.** Amber eyes with catch-light; brow ledge and muzzle box; saddle without a shading break; the head-to-trunk scale.

---

## 8 Lion feet & gait

Frames: `lions_walk/walk_00..07`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 12 | Animation | 5 → 5 | the lion's centre travels 47 px (R2) → 59 px (R4) across eight frames of a 512-wide frame — 11 % of the width; it does not cross the frame in either round (tool interval or game speed — unresolved); elbow and stifle flexion now visible, the stifle reads as the leg's front point in `walk_02`, `walk_05` |
| 13 | Physics / contact | 4 → 5 | a planted hind foot holds x = 275, 276, 275, 276 across `walk_03`–`walk_06` (R2's plant drifted 300 → 308 over five frames); the front plant 232, 232, 229 over `walk_00`–`02` |
| 16 | Cleanliness | 5 → 5 | tail tuft pops between frames; no leg crossing |
| 17 | Temporal | 5 → 6 | body pixels move coherently (moving-pixel count 3.4–7.4 k per frame); no sliding of the contact foot |

Tail: swings a little (hangs, tip trails). Head bob: none measurable (head y stays 95–98 across the strip). Stride: still short — the moving bbox width oscillates 167–202 px, i.e. the legs open to about one body-length between plants.

Queue check (consensus, gait): stride — **not** (travel 47 → 59 px over the strip); elbow/stifle flexion — **partly** (visible in `walk_02`, `walk_05`; the forelegs still swing straighter than the hind); head bob — **not**; tail — **partly** (hangs and trails, no swing through the stride).

**Top three weaknesses**
1. `lions_walk/walk_00..07` — the lion covers 59 px in eight frames. If the tool's interval is fixed, the walk speed is; fix `src/wildlife/lion/spec.js` `KINDS.lioness.walk 1.0 → 1.35` and `src/wildlife/lion/pose.js` stride length ×1.3 (the stance phase should carry the body a full shoulder height per step, ≈ 0.8 m).
2. No head bob or shoulder roll. Fix: `src/wildlife/lion/pose.js` — add `head.y += 0.02 × sin(2φ)` and `chest.roll = 0.06 × sin(φ)` on the gait phase φ.
3. `walk_04`, `walk_06` — the swing foot passes at ground height; no lift arc. Fix: `src/wildlife/lion/feet.js` swing trajectory — lift ≥ 0.08 m at mid-swing (a cubic on the swing fraction).

**Regressions.** None.

**Must not regress.** The planted foot holding its pixel; no hind-leg crossing (`HIND_LATERAL_MIN 0.55`).

---

## 9 Lighting & atmosphere

Frames: every `*_night`, `*_dusk`, `truck_day/hero.png`, `mainroad.png`, `camp_day/*`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 8 | Lighting | 6 → 7 | day key-to-sky ratio believable (shade −3 st, not −6); night is a moon key with a blue fill; dusk aureole sits on the sun's side |
| 9 | Shadows | 6 → 6 | camp canopy edge still a line with dither; hero contact good |
| 11 | Color / atmosphere | 4 → 6 | hills fixed (blocker 2); night sky now a saturated cobalt — `truck_night/hero.png` sky sRGB (0.050, 0.072, 0.149) hue 227° **sat 0.66** (R2 0.28); fleet night skies sat 0.6–0.7. A moonlit sky is blue, but at a third of this saturation |
| 16 | Cleanliness | 4 → 7 | sky snow gone (19.45 → 0.15 % over 0.35); moon and light bar merge into one bloom in the hero |
| 14 | Detail density | 5 → 6 | Milky Way band with cloud structure; 22 point stars in the hero's sky |

Queue check (consensus, lighting): stars (#1) — **closed**; night grade and ground — **addressed** (hero ground Y 0.027 → 0.021 with a warm hue; camp pad 0.036 → 0.007); ground bounce — **partly** (shade −6.3 → −3.0 st, target −1.5 … −2); dusk key azimuth vs aureole — **addressed** (`truck_dusk/hero.png`: the lit faces and the aureole are on the same side of the frame); shadow softness — **partly** (canopy edge 16 px, dithered); far-cascade acne on the lion neck — **addressed** (not seen in `lion_close.png`, `lion_face.png`); night forest canopies black / missing — **addressed** by the sky (silhouettes with shape, `truck_night/forest.png`); dusk canopies black cut-outs — **partly** (Y < 0.01 fraction 12.2 → 8.3 %).

**Top three weaknesses**
1. `truck_night/hero.png`, `fleet/*_night.png` — night sky saturation 0.66. Fix: `src/sky.js` NIGHT palette `hemiSky` / zenith colour — desaturate the zenith toward (0.07, 0.085, 0.13) (sat ≈ 0.45) and keep the horizon band; `uZenithPow` unchanged.
2. `truck_night/hero.png` — moon has no disc (ring profile above). Fix as in 1 Hero car #1 (`aureole 0.10 → 0.03`, a `pow(cp, 600)` disc term under `uMoonDetail`, `bloom.radius 0.35 → 0.25`).
3. `camp_day/camp_mess.png` — shade one stop deep and hard-edged. Fix as in 4 Campground #1–2 (`campWear envMapIntensity 0.6 → 1.0`, terrain `surfAo` double count, day `shadow.farRadius 2.4 → 3.6` + `farStrength 0.92`).

**Regressions.** None. Night frames are darker overall (hero ground Y 0.027 → 0.021, fleet mean Y halved) — a grade change in the right direction, and the truck is more legible, not less.

**Must not regress.** Sky over 0.35 luma ≤ 0.5 %; stars ≤ 4 px; hill saturation ≤ 0.19; dusk grille p95 ≤ sky p95 + 0.1.

---

## 10 HUD

Frames: `truck_{day,dusk,night}/hud.png`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | overlay identical; the chase camera now sits back on the road behind the truck in all three (the round-2 "inside the flank" capture defect is gone — tool, not scored) |
| 11 | Color / atmosphere | 6 → 6 | |
| 16 | Cleanliness | 6 → 6 | |
| 8 | Lighting (legibility against the frame) | 5 → 6 | night: type dimmed to opacity 0.62 / speed 0.8 (`index.html` L80–84) — legend p99 luma 0.74 → 0.50, speed 0.89 → 0.73; the HUD is no longer the brightest thing in the frame. Day: legend contrast (text p99 + 0.05) ÷ (bg p40 + 0.05) = **1.73 → 1.73**, title 1.67 → 1.52 over a brighter sky — unchanged; the hints still vanish over sunlit dirt |

Queue check (consensus, HUD #8): hints compete at night — **addressed** (opacity 0.62 / 0.3 / 0.8 by class); hints vanish over sunlit dirt — **not** (day legend contrast 1.73 both rounds); chase camera inside the flank (tool) — **fixed**.

**Top three weaknesses**
1. `truck_day/hud.png` — legend contrast 1.73 over dirt, title 1.52 over sky. Fix: `index.html` `.hud-keys` / `.hud-title` — the `text-shadow` stack (`0 1px 2px rgba(0,0,0,.9), 0 2px 8px rgba(0,0,0,.8)`) is a shadow, not a plate; add a `background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.45))` on `.hud-bl` and `.hud-br` 90 px tall, or a 1 px `-webkit-text-stroke rgba(0,0,0,.6)`.
2. `truck_dusk/hud.png` — title over the aureole at 1.48. Same fix.
3. `truck_night/hud.png` — the `.hud-keys--rest` at opacity 0.3 (legend p99 0.50) is under the 3:1 floor for small type against a 0.09 ground. Fix: `0.3 → 0.42` at night, keep `.hud-title` at 0.62.

**Regressions.** None. **Must not regress.** Night dimming; chase camera position at capture.

---

## Overall

**Gate: pass, with blocker 3 carried open.** Round 4's categories are Materials and Texture quality. Materials is up in all seven families where it applies (hero 6 → 7, glass 6 → 7, fleet 6 → 7, campground 6 → 7, terrain 6 → 7, vegetation 5 → 6, lions 4 → 5); Texture quality is up in hero (6 → 7) and lions (5 → 6) and flat elsewhere, down nowhere. No approved category of any family drops by more than one point: the only drop is Car glass / transparency 8 → 7 (`ws_mid` see 0.850 → 0.787, `moving` 0.845 → 0.759, veil +0.02), a one-point trade for a pane that is now visibly a pane. Of the three round-2 blockers, the night sky is closed (0.15 % over 0.35, 22 point stars, a Milky Way band), the hills are closed as a defect (sat ≤ 0.19, no cream band) with `camp_beyond` (1.01 of sky) and `lion_far` (0.61) outside the 0.72–0.92 band, and the camp shade is filled from −6.3 to −3.0 stops but is one stop short of the −1.5 … −2 target with a dithered hard edge — I record that as *not closed* and the master should decide whether "no longer a hole" satisfies the round-2 deploy condition.

Tool defects, not scored: `fleet/trailer_0_{day,night}.png` (camera against the tarp, both rounds); the walk strip's 59 px of travel if the capture interval is what limits it; a possible mismatch between the lion head in `shots/round4` and the head profile at `80cb5e6` (see 7 Lions).

**Three weakest areas of the whole game**
1. **The lion** (Silhouette 5, Geometry 5, Materials 5). It is a good plush: eyes as full spheres proud of the face, a loaf muzzle without a zygomatic shelf, Gaussian mounds for muscle, isotropic velvet for fur, a walk that covers 11 % of the frame in eight steps.
2. **Shade and penumbra** (Campground Shadows 6, Lighting Shadows 6). The mess canopy is −3 st with a dithered edge; nothing in the game yet has a soft, graded, sky-coloured shadow.
3. **Vegetation geometry** (5). Crossed-card tufts, disc crowns on forks, black sun-side canopies at dusk, a bald pride lawn.

**Single most valuable next change.** Finish the camp shade on the receivers: `src/campground/ground.js` `campWear.envMapIntensity 0.6 → 1.0`, remove the `surfAo` albedo double-count in `src/terrain.js` L2096 under shadow, and `src/sky.js` DAY `shadow.farRadius 2.4 → 3.6` with `farStrength 0.92`. It closes the last round-2 blocker, it is measurable on one frame (`camp_day/camp_mess.png`, target −1.5 … −2 st with a ≥ 30 px penumbra), and every shaded surface in the game — under trees, under the truck, under the lions — inherits it.
