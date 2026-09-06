# Round 5 — Critic C

**Incumbent:** round 4, build `80cb5e6`, `shots/round4/` (walk strip from `lions_walk_fixed/`).
**Candidate:** round 5, `shots/round5/`. `truck_*`, `glass/`, `ultra_night/` from `84c1e5e` (re-shot: the first `16028cf` capture had the body pitched 5.7° nose-down by the pre-roll; those frames are kept in `shots/round5_pitched/` and are referred to below as "pitched"); `camp_*`, `fleet/`, `lions_*`, `ultra_camp/`, `ultra_lions/` from `0dc79bb`. Fleet frames predate the fleet round-4 landing and are scored as shot. The car builder's round-6 landing (`5dc56cd`) is not in any frame.

**Frames looked at:** every candidate frame beside its incumbent pair — `truck_day/dusk/night` 30, `glass` 13, `fleet` 24, `camp_day` 6, `camp_night` 4, `lions_day` 7, `lions_dusk` 3, walk strip 8 (95 pairs) — plus the unpaired `ultra_*` frames at 1280×720. For the re-judge (families 1, 2 and the attitude-dependent lines of family 9) the 43 re-shot `truck_*`/`glass` frames and `ultra_night/hero`, `road` were looked at as R4 / pitched / re-shot triptychs. `ultra_day/` was **empty** at the time of the re-judge (re-render pending); the `ultra_day` numbers still quoted in family 1 (lugs, door streaks, arch rust, headlamp lens) are from the pitched `16028cf` frames and are marked as such.

**How I measured.** Side-by-side sheets and 2–8× nearest-neighbour crops under `/tmp/criticC/`. Luma is linear (sRGB decoded, Y = 0.2126 R + 0.7152 G + 0.0722 B); "st" is log2 of a ratio; HSV is of the box mean; blob counts use 8-connectivity on a threshold of *sRGB* luma unless stated; every box is `(x0–x1, y0–y1)` at the frame's own resolution (truck/glass 640×360, camp/lions/walk 512×288, fleet 480×270, ultra 1280×720). Hills use the ridge-row method: per column, top-down, the first *darkening* luma step (`Y[r−2] − Y[r+2] > 0.10·Y[r−2]`) is the skyline; hill = rows +2..+8, sky = rows −18..−4; I report the median of hill/sky over the columns. Glass numbers are the tool's own `metrics.json` (hide-and-diff: `see`, `veil`, `flick`) read for both rounds. Performance is from `stats.json` only. Source read via `git show 16028cf:` / `84c1e5e:` / `0dc79bb:`. Changelog numbers are treated as claims; each one I could reach in a frame is marked holds / does not hold below.

---

## 1 · Hero car

> **Re-judge (re-shot `84c1e5e` frames).** The body is level: `truck_day/hero.png` green-paint rows 84–205 against R4's 81–204 (pitched 84–228); the roll in `road`/`front` is the same camber R4 shows. What moved: Composition back to 7 (the nose-down, over-size framing and the grass across the front wheel in `front` were the pre-roll, not the car; one small verge tuft remains in `wheel`); Materials back to 6 (the bonnet "horizon band" I credited was the pitched bonnet tilted at the sky — on the level frames the `ws_mid` bonnet profile is R4's); the dusk headlamp glare is gone (it was the pitched lamp axis pointing at the camera); the night truck-vs-sky line is corrected (−0.16 st, not −1.1 st — the pitched hero camera looked into the brighter horizon sky). Reflections 5 → 6 stands, now on the mirror (the seat sees a face, R4 saw the housing back) rather than the bonnet. Family mean 6.73 unchanged. `ultra_day/` had not been re-rendered when I re-judged; lines that still cite it say "pitched".

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Level, same framing as R4: `truck_day/hero.png` paint rows 84–205 (R4 81–204; pitched 84–228, +17 % tall). `rear`, `detail`, `interior` frame as R4 did. Left over from the spot, not the attitude: one yellow-green verge tuft across the bottom-left of `truck_day/wheel.png` (296 px, x 1–203, y 164–306, sRGB (153, 147, 76)); R4 had none. Not worth a point. |
| 2 | Silhouette | 7 → 7 | Day unchanged. Night, one box for both rounds (sky = rows 5–40 stars masked, `truck_night/hero.png`): paint mean Y 0.0259 vs sky 0.0162 (+0.68 st) in R4 → 0.0319 vs 0.0222 (+0.52 st). Separation held to within 0.16 st; my earlier "−1.1 st" used a top-right sky box that the pitched camera had aimed at the horizon haze. |
| 3 | Geometry | 7 → 7 | "Chamfered, siped lugs" not resolvable at 640; at 1280 (pitched `ultra_day/hero.png` (330–470, 480–600) — lugs do not depend on pitch) they still read as separate blocks stuck on the carcass. |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | The band I scored in the first pass was the pitched bonnet: pitched `ws_mid` bonnet rows 246–266 medY 0.20–0.29 over a 0.10 base; re-shot `glass/ws_mid.png` bonnet row medians 0.115–0.153 (rows 216–256) then 0.084–0.12 — R4's 0.149–0.164 / 0.081–0.11. `ws_close` bonnet median 0.389 vs R4 0.413. At 640 the "clearcoat over satin" cannot be told from R4. Woven door cards and a black console in `truck_day/interior.png` — claim holds, but interior trim alone is not a point. |
| 6 | Texture quality | 6 → 6 | Flank still one horizontal streak frequency (pitched `ultra_day/hero.png` door (600–760, 330–430) reads as brushed metal, not scratched paint). |
| 7 | Glass | 6 → 7 | See family 2. |
| 8 | Lighting | 7 → 7 | Night: beam-slice discs gone. Beam pool on the level truck: `truck_night/hero.png` warm-lit ground (hue 10–50, Y > 0.03) in (0–260, 150–360) 8.9 % → 15.3 % of the box, p95 0.493 → 0.146 — broader and softer, R4's blown core gone; `front` (100–540, 230–360) 35.5 % → 22.7 %, p95 0.449 → 0.127, and the white slab R4 had between bumper and camera ((150–500, 290–360) median 0.524) is gone (0.021). On the faint side (pool pixels over Y 0.15 in `hero` 1 567 → 46) but a pool, not a slab. Dusk: grille rows (100–260) p95 0.183 `hero` / 0.235 `front` (R4 0.492 / 0.485) against sky p95 0.469 / 0.463, zero clip — the "+0.121 vs +0.1 not met" entry does not hold in these frames, the grille is 0.23–0.29 under the sky. The dusk glare I reported (pitched `detail` 107 px over 0.85) is not in the level frame: no blob over 0.85 in `truck_dusk/detail.png`, largest lamp blob over 0.6 in `hero` 94 px at (181, 166). |
| 9 | Shadows | 7 → 7 | Soft contact shadow under the sill and tyres (`truck_day/hero.png`; pitched `ultra_day/hero.png`); no acne, no peter-panning. |
| 10 | Reflections | 5 → 6 | The door mirror now faces the seat: `truck_day/interior.png` (70–130, 100–195) shows sky / tan plain / the truck's green flank where R4 showed the grey housing back. Bonnet: no change from R4 on the level frames (row 5). Headlamp lenses carry no sky (pitched `ultra_day/hero.png` left lens (262–292, 416–446) medY 0.069, right (392–422, 410–440) 0.107, sky (900–1200, 40–120) 0.315; a 5.7° pitch does not close a 1.5–2 st gap — re-check when `ultra_day` is re-shot). |
| 11 | Colour / atmosphere | 6 → 6 | |
| 12 | Animation | — | |
| 13 | Physics / ground contact | 8 → 8 | Tyres in the dirt; level stance with the 5.7° camber roll the trail has in both rounds. |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 6 → 7 | Dust settled to the sills instead of wiped across the panes (`glass/side_shade.png`); rust flare on the arches (pitched ultra). |
| 16 | Visual cleanliness | 5 → 6 | `truck_night/hero.png` rows 0–139 over sRGB 0.5: R4 blobs 2 967 (bar), 952 and 458 px (the two discs) → R5 379 + 219 (the bar, now in two groups), 12, 10, nothing else. Discs gone — claim holds. Nine cores at 0.85 in `hero` (8–11 px each), `front` (11–20 px) and `ultra_night/hero.png` (36–57 px) — nine-pod claim holds. Bar over 0.5: 598 px `hero` (two blobs), 1 396 (+401) px `front` (R4 4 903), 3 882 px `ultra_night/hero` (one blob); the builders' 417/300 is not what these frames show. |
| 17 | Temporal stability | — | |
| 18 | Browser performance | — | See family 10. |

**Top three weaknesses**

1. **Bar bloom still merges the pods.** `truck_night/hero.png` (200–300, 70–110): 598 px over 0.5 in two blobs (nine pods, so seven pairs touch); `front` (230–340, 80–110) one 1 396 px blob; `ultra_night/hero.png` one 3 882 px blob at (532, 162). The nine cores only separate at 0.85. Fix: `src/vehicle/materials.js` — the bar's nine `headlight` spheres share `m.headlight` (`applyLampGlow` core 2.5). Give them their own material (`m.barLed`, core 1.8, bleach 0.4, coreExp 1.0) so each pod's 0.5 contour stays inside the 24 px pod pitch at 640 wide; leave `m.barCover` (core 3.0, `BEAM.night.cover` 0.5) alone. Test: `hero` box over 0.5 ≤ 300 px and nine blobs at 0.5.
2. **Headlamp lens returns no sky.** Pitched `ultra_day/hero.png` lens boxes above: medY 0.07–0.11 under a 0.315 sky; the fluted dome is `m.lensClear` (`materials.js:774`, `transparent`, `opacity 0.1`, `envMapIntensity 1.4`, clearcoat 1). With `opacity 0.1` three.js scales the specular by alpha, so the sky return is 10 % of what the Fresnel term produces. Fix: `transmission: 1, opacity: 1, thickness: 0.002` (specular at full alpha, tint through transmission), or `onBeforeCompile` set `gl_FragColor.a = max( diffuseColor.a, luminance( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) )`. Same for `m.barCover`. Confirm on the re-shot `ultra_day/hero.png` (level lens, same boxes).
3. **The flanks never reach the skyline.** On the level frames the bonnet in `glass/ws_mid.png` (rows 216–296, green mask) and `ws_close` is R4's satin lobe (row 5), and the whole green mask of `truck_day/hero.png` has p95 0.233 under a sky p95 of 0.364, with 3 % of paint pixels over the sky median (R4 4 %) — a vertical door at hood height returns one dark value, no horizon line. Cause in the paint's own reflection model (`src/textures/vehicle.js` `makePaintMaterial`, the `bw` block): the reflected elevation of a vertical panel seen from hood height is `bwUp` ≈ 0.03–0.09, and the sky only starts at `line = 0.3` (`smoothstep(uBwLine, uBwLine + 0.25, bwUp)`, i.e. 17°–33° up), so every flank mirrors the `wall` colour 0x3a3226 — the comment says the bush wall is "only a few degrees deep", the constant makes it seventeen. Fix: body keys `line 0.3 → 0.08` (wall 0–4.6°, sky above), `band 0.5 → 0.65` so the rim highlight sits at the new line, keep `flat 0` on the body and the curvature/span gate as is; leave the roof key at `line 0.3` (it looks up anyway). Test: `truck_day/hero.png` door (green mask, rows 120–190) shows a ≥ +1 st band over its base; `glass/ws_mid.png` bonnet row medians ≥ +0.7 st at the skyline row on the level truck.

**Regressions:** none. (The Composition 7 → 6 I gave the pitched frames is withdrawn: `truck_day/hero.png` frames as R4 did.)
**Must not regress:** discs gone (no blob over 100 px in the sky rows of `truck_night/hero.png` other than the bar groups); dusk grille p95 under sky p95 with zero clip and no lamp blob over 0.85 in `truck_dusk/detail.png`; the mirror face from the seat in `truck_day/interior.png`; the soft beam pool (no ground blob ≥ 20 px over sRGB 0.5 in `truck_night/hero.png` or `front.png`); ground contact.

---

## 2 · Car glass

> **Re-judge (re-shot `84c1e5e` frames).** The three one-point drops I gave the pitched frames were all the pre-roll: the pitched seat camera looked past the mirror at the cage bar and the spare filled `rear_dust`. On the level frames `glass/mirror.png` frames the mirror face and it shows sky, plain and the truck's flank; `glass/interior.png` shows the same face from the seat; `rear_dust` is R4's framing; `flick` on the static views is back within 0.006 of R4. Composition 6 → 7, Reflections 5 → 7, Temporal stability 5 → 6. Family mean 5.89 → 6.33.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | `glass/mirror.png` frames the face at (370–500, 45–245) — the cage bar crosses its top-right corner (430–500, 45–90), which is the one thing I would move; `interior.png` face at (70–130, 100–195) behind the A-pillar bar; `rear_dust` is R4's rear-window framing (the spare is gone). `side_sun`/`side_shade` see the housing back from outside — where a glass turned 22° inboard puts it; that R4's face was visible from outside in `side_sun` and not from the seat is consistent with the changelog's account of a glass that faced away from the driver. |
| 2 | Silhouette | — | |
| 3 | Geometry | — | |
| 4 | Scale | — | |
| 5 | Materials | 6 → 6 | |
| 6 | Texture quality | 5 → 6 | Dust at the sills, wiper arcs on the screen (`ws_close`); the sill streaks are still one frequency. |
| 7 | Glass / transparency | 6 → 7 | `metrics.json` (re-shot) `see` up on 10 of 12 views (side_shade 0.68 → 0.92, ws_mid 0.79 → 0.87, side_sun 0.67 → 0.96, moving 0.76 → 0.89, ws_close 0.87 → 0.93; down: int_side 0.875 → 0.861, rear_dust 0.873 → 0.857); `veil` down on 9 of 12 (side_shade 0.124 → 0.053, ws_mid 0.113 → 0.089, moving 0.121 → 0.073, rear_dust 0.103 → 0.071; up by ≤ 0.005 on dusk_ws, night_ext); `clipPct` 0 and `hot` 0 everywhere. Claims hold. |
| 8 | Lighting | 6 → 6 | |
| 9 | Shadows | — | |
| 10 | Reflections | 6 → 7 | Mirror face in `glass/mirror.png`: sky in the face (385–425, 50–72) medY 0.282 vs the real sky (200–360, 20–55) 0.433 (−0.62 st — a plausible mirror reflectance), tan plain (380–425, 100–145) 0.239 vs the real plain 0.261, and the truck's flank as a green curve (440–495, 95–145) where R4's lower pane had a black quarter-circle. Same face from the seat in `interior.png`. "Seat sees horizon and flank" — holds. Still a painted plate at `fast`: the hill ridge and straw tussocks behind the truck in the same frame ((200–360, 40–200)) are not in it, its horizon is a bare dune line with two acacia silhouettes the scene does not have. Bonnet: R4's (family 1 row 5). |
| 11 | Colour / atmosphere | 6 → 6 | |
| 12 | Animation | — | |
| 13 | Physics / ground contact | — | |
| 14 | Detail density | — | |
| 15 | Environmental integration | — | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | 6 → 6 | `flick` (re-shot): moving 0.099 → 0.156 (+57 %; `see` on that view is +0.13, so more moving background comes through the pane); static 2 mm-shift views int_side 0.024 → 0.030, side_shade 0.013 → 0.019, side_sun 0.017 → 0.021, ws_close 0.013 → 0.016, interior 0.015 → 0.015, mirror 0.0125 → 0.016; down on rear_dust, dusk_ws, night_int and night_ext (0.0055 → 0.0014). The pitched +82 % on int_side is +26 % level; nothing static is over 0.03. Not a point. |
| 18 | Browser performance | — | |

**Top three weaknesses**

1. **The mirror is a plate, not a mirror.** `glass/mirror.png` face (370–500, 45–245) shows a dune horizon, two acacia silhouettes and a bare tan plain; the scene behind the truck in the same frame ((200–360, 40–200)) is a hill ridge over straw tussocks, and none of it is in the face. At `fast` `src/vehicle/mirrors.js` draws a painted plane. Fix: a `Reflector`-style planar pass for the glass — `WebGLRenderTarget` 160×120, mirrored camera through the glass plane (`clipBias 0.003`), `camera.layers` = sky | terrain | vegetation swath | vehicle body, rendered every second frame and only when the seat or `mirror` camera is active (`frustum` test on the glass node); keep the painted plate as the `ultra`-off fallback. Test: the face's row profile has the same skyline row (±3 px) as the scene reflected in it, and a straw-hue fraction ≥ 10 % below the skyline.
2. **Bar across the mirror in the `mirror` view.** `glass/mirror.png` (430–500, 45–90): the cage bar hides the top-right of the face, the sky corner. Fix: `tools/glassgauntlet.mjs` `mirror` — lower the eye 40 mm and yaw 4° outboard so the face clears the bar; assert `mirror-glass mask ≥ 6 %` and `bar ∩ mask = 0`.
3. **Sill streaks still read as brushed metal.** `glass/side_shade.png` sill (0–640, 250–300) at 2×: one horizontal frequency. Fix: `uDirtScratch` in the paint shader — two octaves (0.6× and 2.3× the current frequency) with a ±12° rotation jitter per panel, amplitude halved on the vertical door skin.

Watch item, not a weakness: `moving` `flick` 0.156 (R4 0.099). If it is not the clearer pane, the next suspect is the flake normal on the bonnet (`clearcoatNormalScale` ≤ 0.15, `anisotropy 4`); test by re-running `moving` with the bonnet hidden.

**Regressions:** none. (Composition, Reflections and Temporal stability 7/6/6 → 6/5/5 on the pitched frames are withdrawn.)
**Must not regress:** `see`/`veil` on the daytime panes; zero clip; the mirror face with flank in `mirror.png` and `interior.png`; `night_ext` flick ≤ 0.002; `rear_dust` unobstructed.

---

## 3 · Fleet (as shot, pre-`8611235`)

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | Day frames unchanged: mean abs pixel Δ ≤ 0.024 on 11 of 12. `trailer_0_day.png` is reframed (R4 a lid filling the frame, R5 the trailer body, mean abs Δ 0.193) — the orbit fix, not a fleet change. |
| 2 | Silhouette | 6 → 6 | |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | Pre-alloy/chrome build; `suv_0_day` bar and `camper_0_day` wheel identical to R4. |
| 6 | Texture quality | 5 → 5 | |
| 7 | Glass | 6 → 6 | |
| 8 | Lighting | day 6 → 6, night 5 → 7 | Night frame mean +0.66 to +2.33 st on 11 of 12 (utility +2.33, jeep_1 +2.26, jeep_0/jeep_2 +1.89, ranger +1.66; trailer −0.57 is the reframe). Sky band (top 12 %) +1.2 to +2.1 st; ground band (bottom 15 %) +0.6 to +2.2 st. Lamp posts now light the row (`utility_0_night`, `safari-jeep_1_night`); the `groundIndirect` claim is consistent with the ground rise. |
| 9 | Shadows | 7 → 7 | |
| 10 | Reflections | 4 → 4 | No chrome yet; the one bright return is wrong (below). |
| 11 | Colour / atmosphere | 6 → 7 | Night row reads: warm lamp over cool moonlit ground, paint colours legible (`ranger_0_night` green flank). |
| 12 | Animation | — | |
| 13 | Physics / ground contact | — | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 5 | `safari-jeep_0_night.png`: a 38 px soft disc on the bonnet at (233, 134), 123 px over 0.85, brighter and larger than the lantern head that feeds it (7 px over 0.85 at (244, 73)). `pickup_0_night.png` headlamp bloom 253 px over 0.7 (R4 tight disc). |
| 17 | Temporal stability | — | |
| 18 | Browser performance | — | no `stats.json` in `fleet/`. |

**Top three weaknesses**

1. **Clearcoat highlight brighter than its source.** `safari-jeep_0_night.png` (214–252, 115–153). Fleet paint is `clearcoat 1.0, clearcoatRoughness 0.08` (`src/vehicles/materials.js:528–529`); the camp lantern is `PointLight(0xffb35c, base 18, distance 12, decay 1.9)` (`src/campground/lights.js:65–68`). A 0.08 lobe under an 18-intensity point light at 3 m peaks far over 1.0 pre-tonemap and blooms. Fix: fleet `clearcoatRoughness` 0.08 → 0.22 (the hero uses 0.15) and lantern `base` 18 → 10 with the visible source carried by `mats.bulb.emissiveIntensity` (3.6 → 6). Test: no blob over 0.85 on a body panel larger than the lantern's own.
2. **Headlamp blooms grew with the night gain.** `pickup_0_night.png` 253 px over 0.7 at (152, 131). Fix: the fleet lamp `applyLampGlow` core should not scale with `groundIndirect` night — set the fleet `headlight` core to 1.8 at night (as for the hero bar above).
3. **Alloy/chrome still flat** (`suv_0_day.png` bar (330–420, 120–150) satin grey, no sky return; `camper_0_day.png` wheel). Landed in `8611235` after these frames; re-shoot before scoring.

**Regressions:** Visual cleanliness 6 → 5 (`safari-jeep_0_night`, `pickup_0_night`).
**Must not regress:** the night row's legibility (every vehicle's body over sky luma), lamp-post pools, day frames identical.

---

## 4 · Campground

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | Day frames near-identical (`camp_mess` mean abs pixel Δ 0.033). |
| 2 | Silhouette | — | |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | Canopy weave resolves at ultra (`ultra_camp/camp_mess.png`). |
| 6 | Texture quality | 5 → 5 | |
| 7 | Glass | — | |
| 8 | Lighting | 7 → 7 | Night ground +0.85 to +1.1 st (`camp_fire_night` near ground L (0–150, 230–288) 0.0125 → 0.0228, R (380–512, 230–288) 0.0333 → 0.0600; `camp_arrive_night` pad (0–512, 240–288) 0.0068 → 0.0142; `camp_gate_night` 0.0089 → 0.0189). Canopy top no longer lit orange from string lights underneath: `camp_fire_night` (190–270, 118–140) HSV (21°, 0.62) → (42°, 0.37). Against: the fire pool over-drives (below). |
| 9 | Shadows | 6 → 6 | Shade pockets under the tables `camp_day/camp_mess.png` (300–340, 236–256) 3.51 → 2.91 st under the sun pad (104–144, 224–240) 0.41; p10 of (150–400, 236–270) 3.42 → 2.80 st. +0.6 st, target 2 st not reached — the builders' "3.2 not met" holds. Penumbra still a 1-px checker at 3× (both rounds). Ultra: pockets 2.12 st, p10 2.79 st. |
| 10 | Reflections | — | |
| 11 | Colour / atmosphere | 6 → 7 | Far corner desaturated as asked: `camp_fire_night` (20–120, 230–280) sat 0.42 → 0.29, hue 7° → 14°; sky (0–512, 0–60) 0.0085 → 0.0168 (+0.99 st), stars 47 → 48 over 0.6. |
| 12 | Animation | — | Fire taller, plume settled to a wisp (`fleetshots` 90-frame step). |
| 13 | Physics / ground contact | — | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 5 → 5 | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | — | |
| 18 | Browser performance | — | no `stats.json` in `camp_*`. |

**Top three weaknesses**

1. **Fire pool over-exposed and pale.** `camp_night/camp_fire_night.png` pool (230–320, 185–210) medY 0.148 → 0.355 (+1.26 st), HSV (20°, 0.75, 0.66) → (31°, 0.33, 0.71); (235–275, 200–215) 0.099 → 0.197. Firelit ground at Y 0.35 pushes into the tone curve's shoulder and ACES desaturates it to tan. Fix: `src/campground/fire.js:388/417` — `PointLight` colour (1.0, 0.72, 0.45) → (1.0, 0.55, 0.25) and `intensity = (8.4 + 28 * night) * flicker * radius * 2` → `* 1.2`. Target: pool Y 0.10–0.14, saturation ≥ 0.6, pool/far-corner ≥ 3 st (now 3.41).
2. **Shade pockets still holes.** Box and numbers above. The pockets are hemisphere-lit only; the far cascade does not reach under the tables. Fix: `src/campground/ground.js` — bake a canopy AO decal under the mess (a 0.6-strength radial mask the size of the canopy footprint, multiplied into `indirectDiffuse` only) so the floor under the canopy sits 1.5–2 st under the pad and the pockets 2.5 st, instead of open floor 0.23 st and pockets 2.9.
3. **Penumbra checker.** `camp_day/camp_mess.png` shade edge (250–330, 246–254) at 3×: 1-px dither in both rounds. Fix: `renderer.shadowMap.type = PCFSoftShadowMap` with `shadow.radius 2` on the sun cascade that covers the camp, or a 2-tap rotated Poisson blur in the shadow sampling of `campground/materials.js`.

**Regressions:** none by category. Fire pool saturation 0.75 → 0.33 is a regression inside Lighting, offset by the ground and canopy fixes.
**Must not regress:** far-corner saturation ≤ 0.3 at night; canopy top not lit from beneath; night pad at 0.014–0.02 (not a snowfield); gate timber and mess day frames unchanged.

---

## 5 · Road & terrain

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | — | |
| 2 | Silhouette | — | |
| 3 | Geometry | 5 → 5 | |
| 4 | Scale | — | |
| 5 | Materials | 6 → 7 | Water reads as water: `lions_day/lion_pride.png` pool body ≈ −3.6 st under the sky, far band 0 to +0.3 st (sky reflection), a paler wet annulus round it; R4 a flat grey-brown slab 1.3 st under the sky. Ultra: pool surface (380–470, 180–215) HSV (222°, 0.09, 0.68) Y 0.385 against sky p90 0.46. |
| 6 | Texture quality | 6 → 6 | No tiling in the pride plain: autocorrelation of `ultra_lions/lion_close.png` ground (0–330, 300–700) has no peak over 0.12 at any lag 8–200 px; the grey ovals are placed stones (5 blobs ≥ 15 px, 0.4 % cover). |
| 7 | Glass | — | |
| 8 | Lighting | — | Night ground scored under family 9. |
| 9 | Shadows | — | |
| 10 | Reflections | 3 → 4 | Sky in the water (+). The kopje reflection is wrong (below). |
| 11 | Colour / atmosphere | 7 → 8 | Ridge-row hill/sky medians (method in header): `truck_day/mainroad` (cols 40–600) 0.69 → 0.81; `lions_day/lion_far` (0–512) 0.52 → 0.74, all three thirds 0.73–0.76; `fleet/pickup_0_day` 0.68 → 0.82; `lions_day/lion_pride` 0.57 → 0.82; `camp_day/camp_beyond` (40–500) 0.87 → 0.78; `camp_arrive` 0.96 → 0.88; `camp_gate` (300–512) 0.94 → 0.86. Claims (0.67 → 0.80, 0.55 → 0.71, 0.63 → 0.75, camp_beyond slipped) hold in direction and within 0.05. Every ridge now in 0.74–0.88; R4 spread 0.52–0.96. Ultra `mainroad` (cols 560–1240) 0.74. |
| 12 | Animation | — | |
| 13 | Physics / ground contact | — | |
| 14 | Detail density | — | |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 6 | Hard aliased arc on the middle water dome at ultra (below). |
| 17 | Temporal stability | — | |
| 18 | Browser performance | — | |

**Top three weaknesses**

1. **Kopje "reflections" are smooth dark domes.** `ultra_lions/lion_face.png` (150–250, 160–230) and (312–383, 164–227); `lion_close.png` (330–600, 190–260); also visible at 512 wide in `lion_pride.png` (270–290, 115–125). Dome interior medY 0.096 / 0.171, HSV (27°, 0.21, 0.40) — a shaded gradient with a clean elliptical rim — under a boulder that renders pale speckled granite at medY 0.42 (40–160, 40–100). Cause: `src/terrain.js` water sheet, `WATER_ROCKS = 20` analytic ellipsoids (`uRockInv` from the instance matrix × 0.5 flattening, line ~5300) shaded `uRockCol · (uSkyHor · 0.35 + uSunCol · ndl)` (line ~5162) — the bounding ellipsoid of a lumpy `rockGeo` with a constant colour. Fix: replace the ellipsoid loop with a real planar reflection — a 256×128 `WebGLRenderTarget`, a camera mirrored about `y = LAND.hole.level`, layer mask `kopje_* + sky`, sampled in the sheet shader with the ripple offset. If the trace must stay: scale the ellipsoid to the rock's inscribed radius (0.5 → 0.38), triplanar-sample the kopje's `rockMat` albedo with the hit normal, and jitter `R` by 3× the ripple normal in the rock test so the rim breaks.
2. **Hills still 0.74–0.82 where haze should carry them to 0.85–0.9** (`lion_far`, `lion_pride`, `pickup`). Fix: `src/terrain.js` hill fog — raise the far ramp end from 0.90–0.94 to 0.94–0.97 at 380 m and lower the pre-ACES floor 0.76 → 0.80 so the far crest sits just under the sky.
3. **Culvert / cut faces** unchanged from R4 (Geometry 5): the trail's edge is a texture seam, not a berm. Fix: `terrain.js` displacement — a 0.15 m shoulder lip on the verge mask (`mShld`) with its own normal.

**Regressions:** none.
**Must not regress:** ridge/sky in 0.74–0.88 on all seven frames; pool sky return; wet annulus.

---

## 6 · Vegetation

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | — | |
| 2 | Silhouette | 6 → 6 | Turf cards are blocky at 3× (`lion_pride.png` (0–512, 192–288)); a detached leaf card floats above the acacia crown in `truck_day/forest.png` (both rounds). |
| 3 | Geometry | — | |
| 4 | Scale | — | |
| 5 | Materials | 5 → 6 | Dusk crowns are no longer black cut-outs: `truck_dusk/forest.png` crown (green mask) median 0.0115 → 0.0354 (+1.6 st); still ≈3.3 st under the sky in my box — the builders' −3.33 → −2.13 is a different box; direction holds. (Measured on the pitched frame; the re-shot `truck_dusk/forest.png` — a world-placed view, truck small on the trail — shows the same lit olive crown at 3×; not re-scored.) |
| 6 | Texture quality | 5 → 5 | |
| 7 | Glass | — | |
| 8 | Lighting | 5 → 6 | Dusk crown lit through (above). Day crown sun-side split claim (+0.58 st) not confirmable: the camera moved between rounds and the crown medians match within 0.1 st. |
| 9 | Shadows | — | Tuft root self-shadow: turf pixels medY 0.055 vs soil 0.146 (below). |
| 10 | Reflections | — | |
| 11 | Colour / atmosphere | 6 → 5 | Pride turf is dark khaki, not straw: `lions_day/lion_pride.png` lower third, khaki mask (hue 35–70°, sat > 0.25, V 0.2–0.45) 0.7 → 12.0 % of pixels; straw mask (g ≥ 0.8 r, g > 1.2 b, V > 0.45) 18.8 → 16.0 %; turf medY 0.055 = −1.4 st under the soil (0.146) and −2.7 st under the verge straw (0.370); plain median 0.199 → 0.150 (−0.41 st; claim −0.5 holds). HSV of the turf (40°, 0.68, 0.32). A dry-season lie-up is pale straw at +1 st over the soil; dark clumps at −1.4 st read as wet-season scrub and the lions lose their camouflage against them. **Pale straw is the right call.** |
| 12 | Animation | — | |
| 13 | Physics / ground contact | — | |
| 14 | Detail density | 7 → 7 | Cover is there (tuft pixels 3 → 40 % claim consistent with the 0.7 → 12 % khaki fraction plus the straw share). |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | — | |
| 17 | Temporal stability | — | |
| 18 | Browser performance | — | |

**Top three weaknesses**

1. **Turf palette and root darkening.** Numbers above. `src/forest.js:3306` `GI_LAWN = [GI_SHORT[1], GI_SHORT[3]]` picks short clumps whose tile lists are `[2,2,2,1]`/`[2,2,1,2]` (tile 2 green, tile 1 khaki), and `grassMat` has `tuftAO: 1.0` (line 2796) with `rootDark 0.8` (line 978) darkening root → tip. Fix: add two `plantClump` entries to `G_SHORT` with tiles `[0, 0, 1, 0]` (tile 0 red-oat straw), point `GI_LAWN` at them, and give the lawn scatter its own material clone with `tuftAO 0.45`. Target: turf medY within ±0.5 st of the soil, straw mask on the lower third ≥ 30 %.
2. **Turf card silhouettes.** `lion_pride.png` (0–512, 192–288) at 3×: hard-edged rectangular sods. Fix: `plantClump` for the lawn forms — `planes 5 → 7`, `spread 0.36 → 0.5`, `ragged 1.0 → 1.6`, `alphaTest` 0.3 → 0.45 so the card edge follows the blade alpha.
3. **Floating leaf card.** `truck_day/forest.png` (300–330, 60–80) both rounds: a crown card detached above the canopy. Fix: `forest.js` crown builder — clamp card centres to `r ≤ 0.92 · crownRadius` and reject cards whose bounding box does not overlap the crown ellipsoid.

**Regressions:** Colour / atmosphere 6 → 5 (`lion_pride`, `lion_far`, `lion_medium` lower thirds).
**Must not regress:** dusk crowns lit; tuft count under the pride; hill/verge palette.

---

## 7 · Lions

Body, fur and face are unchanged between rounds (all boxes below within 0.1 st); only the ground and the dusk light moved.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 5 → 5 | `ultra_lions/lion_close.png`: bear proportions — head ≈ 0.42 of body length, forelegs short, no shoulder blade or hip. |
| 3 | Geometry | 5 → 5 | Muzzle a smooth sculpt; toes pale blocks (`lion_close.png` (200–260, 262–288)). |
| 4 | Scale | 6 → 6 | |
| 5 | Materials | 5 → 5 | Coat is an isotropic mottle at 1280 too (`ultra_lions/lion_face.png` flank (300–560, 300–700)): no hair direction, no rim sheen. |
| 6 | Texture quality | 5 → 5 | |
| 7 | Glass | — | |
| 8 | Lighting | 6 → 6 | `lions_day/lion_close.png` back (300–380, 120–135) 0.485 → 0.516, belly (300–360, 215–235) 0.066 → 0.076; dusk body (240–390, 130–250) median 0.102 both rounds, p95 0.162 → 0.210 (a lit flank), body 2.16 st under the sky both rounds. |
| 9 | Shadows | 5 → 5 | Ground under the chest (255–300, 262–282) 0.110 vs open ground (150–200) 0.190: −0.79 st (R4 −0.68). Soft, no penumbra structure. |
| 10 | Reflections (eyes) | 5 → 5 | Highlight dot present in `lion_face.png` and `ultra_lions/lion_face.png` both eyes. |
| 11 | Colour / atmosphere | 6 → 6 | |
| 12 | Animation | — | family 8 |
| 13 | Physics / ground contact | 5 → 5 | |
| 14 | Detail density | 5 → 5 | |
| 15 | Environmental integration | 5 → 6 | The pride lies in ground cover, paws partly in turf, rather than on a bald pan (`lion_pride.png`, `lion_close.png`). |
| 16 | Visual cleanliness | 5 → 6 | The R4 dark line across the near foreleg's ankle in `lion_close.png` (295–305, 240–248) is gone; the grey decal slab beside the cub in `lion_close_dusk.png` (30–130, 165–195) medY 0.040 → 0.026 is under turf. |
| 17 | Temporal stability | — | family 8 |
| 18 | Browser performance | — | no `stats.json` in `lions_*`. |

**Top three weaknesses**

1. **Proportions.** `ultra_lions/lion_close.png`: head 0.42 of body length (a lioness is ≈ 0.28), foreleg from elbow to paw ≈ 0.6 of chest depth. Fix: `src/wildlife/lion/spec.js` — head scale 0.72×, foreleg and hind leg lengths ×1.3, add a scapula bulge (0.08 m lateral, 0.12 m long) to the `rig.js` shoulder loft.
2. **Coat is a mottle.** Flank box above: |dY| between neighbours 0.041 with zero directional anisotropy. Fix: `src/wildlife/lion/textures.js:188` — replace the isotropic `fbm` with a stretched (8:1) noise in the local hair direction from a flow field (rump → tail, shoulder → elbow), and drive a `sheenRoughness 0.35`, `sheenColor` warm-white anisotropic sheen so the back edge catches the low sun (dusk rim should sit ≥ +0.7 st over the flank; now +0.06 st).
3. **Toes and pads.** `lion_close.png` (200–260, 262–288), `ultra_lions/lion_close.png` (300–520, 400–470): four pale cubes. Fix: `geometry.js` paw — five toe capsules (r 0.02 m) with a dark pad decal and claw slits; darken the toe albedo 15 % relative to the leg.

**Regressions:** none.
**Must not regress:** eye highlights; contact shadow under the chest; turf under the pride (colour aside).

---

## 8 · Lion feet & gait (walk strip)

Method: median of the eight frames as background; mover mask |Δ| > 0.15 with the persistent-pixel filter; automatic column tracking failed on this strip because the turf and the lion's shadow share the leg's hue and value, so the planted-foot columns were read by eye on 10-px gridded 3× crops (`/tmp/criticC/walk_legs_r{4,5}_{0,1}.png`), ±5 px per reading.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 12 | Animation | 5 → 5 | Body advances 19–25 px per 0.3 s (frames 0–7, `walk_00..07.png`). Fore paws hold their column within 0–4 px for 2 frames then swing 25–30 px; the hind paws drift 8–12 px per step while "planted" (R5 near hind x 384 → 376 → 364 → 334, frames 0–3) then swing 30–47 px. R4 identical within reading error on every frame — no gait change landed. Stiff swing, no ankle roll. |
| 13 | Physics / ground contact | 6 → 6 | Hind-foot slide ≈ half the body's advance per step; turf now hides the paw-ground line, which reads better but is cosmetic. |
| 17 | Temporal stability | 6 → 6 | No flicker or popping across the eight frames; the water hole and turf are stable frame to frame. |
| others | — | — | |

**Top three weaknesses**

1. **Hind paw slide.** Frames 0–3 above. Fix: `src/wildlife/lion/feet.js` — lock the planted hind paw's world x/z at footfall for the stance phase (the same IK pin the forepaws already hold to within 4 px) and derive the hip translation from the pinned foot, not the other way round.
2. **Swing has no flexion.** Knee/ankle angles constant through swing (frames 1–2, 5–6). Fix: `pose.js` — add 25° of tarsal flexion and 15° of carpal flexion peaking at mid-swing.
3. **Feet read as blocks at the plant.** As family 7 #3.

**Regressions:** none. **Must not regress:** forepaw pin; frame-to-frame stability.

---

## 9 · Lighting & atmosphere (all hours)

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 8 | Lighting | 6 → 7 | (Re-shot numbers.) Night ground: `truck_night/mainroad.png` pad (0–640, 300–360) median 0.0111 → 0.0240 (+1.11 st; claim 0.011 → 0.023 holds); `hero` ground (250–360) 0.0080 → 0.0114 (+0.51 st; the 0.0149 I first quoted had the pitched beam pool in it); `forest` 0.0056 → 0.0085; the trail beyond the beam is no longer near-black. Pad/horizon: pad median 0.0263 vs sky rows 40–58 0.0244 (1.08×), vs hills rows 62–75 0.0182 (1.44×) — the "pad still 0.58 of the horizon band" claim does not hold for these boxes; the pad is *at* the horizon sky. Beam discs gone; bar pods; the beam pool on the level truck is soft (family 1 row 8); camp moonlight + lamps; dusk grille under the sky with no lamp glare. Against: fire pool over-driven (family 4). |
| 9 | Shadows | 7 → 7 | Mess pockets +0.6 st; nothing else moved; penumbra dither unchanged. |
| 10 | Reflections | 4 → 5 | Water returns the sky; the door mirror faces the seat with sky, plain and flank in it (re-shot `glass/mirror.png`, `truck_day/interior.png`); the bonnet is R4's on the level truck (the band I first credited was the pitched bonnet); lens, painted-plate mirror and kopje domes as above. |
| 11 | Colour / atmosphere | 7 → 7 | Hills tightened to 0.74–0.88 (+). Night sky brightened without a claim (re-shot numbers, sky = rows 5–40 stars masked unless stated): `truck_night/mainroad` sky (0–640, 40–58) sRGB (16, 23, 46) → (26, 42, 84), Y 0.0100 → 0.0256 (+1.36 st — the truck is far in this view, so this number did not move with the attitude); `rear` 0.0066 → 0.0185 (+1.49 st); `forest` 0.0060 → 0.0152 (+1.34 st); `hero` 0.0162 → 0.0222 (+0.45 st, was +0.75 pitched); `wheel` 0.0038 → 0.0057 (+0.58 st, was +1.9 pitched); `road` 0.0241 → 0.0174 (−0.47 st); `camp_fire_night` (0–512, 0–60) +0.99 st. Still far under a snow sky (p95 0.034) and stars survive (`hero` rows 0–79 star blobs 29 → 35, star fraction 0.13 → 0.17 %), but it is a saturated (S 0.69) blue-hour sky, not night. It did **not** cost the truck its silhouette: paint-vs-sky in `hero` +0.68 → +0.52 st (the "−1.1 st" in my first pass was the pitched camera's sky box). |
| 16 | Visual cleanliness | 6 → 7 | Discs gone, slab → pods; the fleet bonnet glow is the one new artefact. |
| — | Moon | — | Not in any of the 29 candidate night frames scanned (`truck_night` 10, `camp_night` 4, `fleet/*_night` 12, `glass/night_ext`, `ultra_night/hero`, `road`) (every blob over 0.7 in the sky rows is a bar pod or a lamp; the only near-white blobs at the top edge of `truck_night/detail`, `road` and `ultra_night/road` are the bar's pods clipped by the frame). The 30 486 → 1 738 px disc claim cannot be checked; the "moon bloom halo" carried item likewise. |

**Top three weaknesses**

1. **Night sky a stop too bright.** Boxes above. Fix: `src/sky.js` night rig — bring the dome's horizon and zenith terms down 0.7 st (the `horizonOf(sky)` fog colour for the night rig from Y 0.025 to ≈ 0.015 at the horizon, zenith 0.020 → 0.012) while keeping the new `groundIndirect` night 1.4 so the ground holds; target `mainroad` sky rows 40–58 ≈ 0.013–0.016 and truck paint ≥ +1 st over it.
2. **Fire pool.** Family 4 #1.
3. **Bar bloom merges the pods in every night frame.** Family 1 #1: `truck_night/hero.png` 598 px over 0.5 in two blobs, `front` 1 396 px in one, `ultra_night/hero.png` 3 882 px in one; cores separate only at 0.85. (Re-judge: the "beam pool slab" I had here — 4 493 px over 0.5 at (56, 317) — was the pitched nose pointing the lamps into the dirt; on the level truck no ground blob ≥ 20 px reaches 0.5 in `hero` or `front`, where R4 had 1 359 and 23 382 px. Withdrawn.)

**Regressions:** none by category; night sky brightness and fire saturation are inside-category trade-offs recorded above.
**Must not regress:** discs gone; night ground medians ≥ 0.02 on `mainroad`, ≥ 0.010 on `hero`; the soft beam pool (no ground blob ≥ 20 px over 0.5 in `truck_night/hero`/`front`); hills 0.74–0.88; camp far corner desaturated; stars visible; dusk grille under the sky with no lamp blob over 0.85.

---

## 10 · Performance (`stats.json` only)

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 18 | Browser performance | 6 → 6 | `runtime` totals (per-view `views` is empty in both rounds). Truck views 640×360: calls 612/609/606 → 615/612/613 (day/dusk/night), triangles 2.909/2.898/2.894 M → 2.934/2.938/2.938 M (+0.8–1.5 %), programs 175 → 177 (+2, claim holds), textures 306 → 303 (−3; the 21 → 13 sampler packing is not visible in a frame and not scored). Ultra 1280×720: 685/708 calls, 3.51/3.58 M triangles, 180/181 programs, 305/300 textures. No `stats.json` in `camp_*`, `fleet/`, `lions_*`. fps is SwiftShader and not comparable between runs. |

**Weakness:** 2.9 M triangles and 600+ calls a frame at 640×360 for a static truck view is heavy; the far grass swath and the fleet row are the obvious budget (R4 finding, unchanged). Fix: `forest.js` swath LOD — halve the 380 m ring's card count past 200 m; merge the fleet-row instanced meshes by material (`vehicles/kit.js`). **Must not regress:** programs ≤ 177 at fast, no new textures.

---

## Verdict on the gate

**Lighting, shadows, reflections across the families (R4 → R5):**

| Family | Lighting | Shadows | Reflections |
|---|---|---|---|
| Hero car | 7 → 7 | 7 → 7 | 5 → 6 |
| Car glass | 6 → 6 | — | 6 → 7 |
| Fleet | 5.5 → 6.5 | 7 → 7 | 4 → 4 |
| Campground | 7 → 7 | 6 → 6 | — |
| Road & terrain | — | — | 3 → 4 |
| Vegetation | 5 → 6 | — | — |
| Lions | 6 → 6 | 5 → 5 | 5 → 5 |
| Lighting & atmosphere | 6 → 7 | 7 → 7 | 4 → 5 |
| **Sum** | **42.5 → 45.5** | **32 → 32** | **27 → 31** |

(Re-judge: Car glass Reflections was 6 → 5 on the pitched frames; on the re-shot frames it is 6 → 7, so the reflections sum is 27 → 31, not 27 → 29. Lighting and shadows did not move.)

The candidate beats the incumbent on lighting (+3 over seven families: night ground wired, discs gone, fleet night row, dusk crowns) and on reflections (+4: water returns the sky, the door mirror faces the seat with the flank in it, R4's black mirror quarter gone). It **ties on shadows**: the only shadow that moved is the mess pocket (+0.6 st, target not reached). No previously approved category of any family drops by more than one point; the one-point drops left after the re-judge are Fleet Visual cleanliness (bonnet glow) and Vegetation Colour (khaki turf) — the Hero Composition and Car glass Composition / Reflections / Temporal stability drops were the pre-roll attitude and are withdrawn. **Gate: pass** — on lighting and reflections, with shadows unmoved. Four items I would carry as acceptance tests into the next round: (1) the mirror face in `glass/mirror.png` reflects the scene that is behind the truck in that frame (skyline row within ±3 px of the reflected ridge), not a plate; (2) `camp_fire_night` pool saturation ≥ 0.6 at Y ≤ 0.15; (3) pride turf medY within ±0.5 st of the soil under a straw mask ≥ 30 %; (4) `truck_night/mainroad` sky rows 40–58 ≤ 0.016 with the pad median still ≥ 0.02.

Changelog claims checked (re-shot frames where the attitude mattered): discs gone — holds; nine pods — holds; hero bar over 0.5 "417 px" — 598 px in two blobs in this frame (−80 % vs R4's 2 967; the ratio matches, the absolute does not); night ground 0.011 → 0.023 — holds (0.024); pad 0.58 of horizon — does not hold (1.08); dusk grille +0.121 not met — the frames show the grille 0.23–0.29 *under* the sky; glass `see`/`veil` — hold; mirror "seat sees horizon and flank" — holds in `glass/mirror.png`, `glass/interior.png` and `truck_day/interior.png`; clearcoat "returns the horizon" — not distinguishable from R4 on the level truck at 640; hills mainroad/lion_far/pickup/camp_beyond — hold within 0.05; water blue-grey and brighter than the mud ring — holds; turf 3 → 40 %, mask barely moves — holds; dusk crowns +1.2 st — holds in direction (my box +1.6 st, still −3.3 st vs sky); plain median −0.5 st — holds (−0.41); moon disc — not in frame (re-scanned the 12 re-shot night frames: every sky blob over 0.7 is a bar pod or a lamp), unverifiable; +2 programs — holds.

**Weakest object in the game:** the lion. At 1280×720 (`ultra_lions/lion_close.png`, `lion_face.png`) it is a bear-proportioned body with an isotropic mottle for a coat, a smooth sculpted muzzle, cube toes and a hind foot that slides half a body-step while planted. Second: the water hole's kopje reflection — three smooth dark domes hanging from the far shore. Third: the tyre lugs, separate blocks on the carcass at every resolution.

**Family means (categories scored in both rounds):**

| Family | R4 | R5 | Δ |
|---|---|---|---|
| Hero car (15) | 6.47 | 6.73 | +0.27 |
| Car glass (9) | 6.00 | 6.33 | +0.33 |
| Fleet (14, lighting as day/night mean) | 5.89 | 5.96 | +0.07 |
| Campground (11) | 6.00 | 6.09 | +0.09 |
| Road & terrain (7) | 5.57 | 6.00 | +0.43 |
| Vegetation (7) | 5.71 | 5.86 | +0.14 |
| Lions (14) | 5.29 | 5.43 | +0.14 |
| Lion feet & gait (3) | 5.67 | 5.67 | 0 |
| Lighting & atmosphere (5) | 6.00 | 6.60 | +0.60 |
| Performance (1) | 6.00 | 6.00 | 0 |
| **All scored categories (86)** | **5.88** | **6.09** | **+0.21** |

Re-judge deltas against my first pass on the pitched frames: Hero car 6.73 → 6.73 (Composition 6 → 7 and Materials 7 → 6 cancel); Car glass 5.89 → 6.33 (Composition 6 → 7, Reflections 5 → 7, Temporal stability 5 → 6); all 86 categories 6.04 → 6.09. Nothing else was re-scored.
