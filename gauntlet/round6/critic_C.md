# Round 6 — Critic C (animation, physics, ground contact)

**Incumbent:** round 5, build `0dc79bb` (truck sets re-shot level), `shots/round5/`.
**Candidate:** round 6, `shots/round6/`, stated build `c2f0b83`. The HUD rendered in `round6/truck_dusk/hud.png` (crop (320–640, 300–360) at 3×) reads **`build 776d40a · 2026-09-06 15:44Z`** (round 5's reads `84c1e5e · 2026-09-05 21:25Z`), so at least the truck sets were captured from a build other than the one named; I score the frames, and carry the tag as a question.

**Frames looked at:** every candidate frame beside its incumbent — `truck_day/dusk/night` 33 (30 pairs + 3 unpaired `moon`), `glass` 13, `fleet` 24, `camp_day` 6, `camp_night` 4, `lions_day` 7, `lions_dusk` 3, `lions_walk` 12 (the 8-frame strip judged on its own, per the camera change), `ultra_*` 13 at 1280×720.

**How I measured.** Side-by-side sheets and 2–8× nearest-neighbour crops under `/tmp/critic-c/`. Luma is linear (sRGB decoded, Y = 0.2126 R + 0.7152 G + 0.0722 B); "st" is log2 of a ratio; HSV is of the box mean; blob counts are 8-connected on *sRGB* luma thresholds unless stated; boxes are `(x0–x1, y0–y1)` at the frame's own resolution (truck/glass 640×360, camp/lions/walk 512×288, fleet 480×270, ultra 1280×720). Hills use the consensus ridge-row method: per column the first step down of ≥ 6 % of the sky Y that persists (median rows r+2..r+8 ≤ 0.94 × median rows r−18..r−4), `camp_beyond` scanned from row 92; I report the median hill/sky over the columns. Eye boxes are 40 × 40 centred on the pupil; pale = V > 0.55 ∧ sat < 0.28, dark = V < 0.2. The dusk rim is continuity (columns whose top 3 rows are ≥ +0.3 st over rows +8..+18, longest gap). Glass numbers are the tool's `metrics.json` for both rounds; `moving` flicker is read against `flickBg`. Walk-strip paw columns were read by eye on 6–7× gridded crops (`/tmp/critic-c/sheets/kymo6b.png`, `legs6_c/d.png`) at ±3 px — as in round 5, automatic tracking fails because the straw tufts share the paw's hue and value. Performance is `stats.json` only. No source, changelog or builder report was read.

**On the like-for-like notes.** (5) does not hold in these frames: the truck stands on a different stretch of trail in every `truck_*` view (mean abs pixel Δ 0.17–0.32 against round 5; `truck_day/hero.png` paint mask columns 141–498 → 139–497 but the bank, the bush wall and the trail colour are all different; `truck_night/front` is a pale sand pan where round 5 had a red-earth bank). The body is level in both rounds, so attitude-dependent lines compare; anything that depends on what is under or behind the truck (beam pools, ground colour, tufts in frame) is noted as spot-dependent where it matters.

---

## 1 · Hero car

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Level, same framing per view; the new spot puts more straw around the sills (`hero`, `wheel`) and a two-track trail with ruts behind the truck in `forest` and `mainroad`. |
| 2 | Silhouette | 7 → 7 | Night paint-vs-sky (`truck_night/hero.png`, sky rows 5–40 stars masked): 0.0312 vs 0.0222 (+0.49 st) → 0.0291 vs 0.0198 (+0.56 st). Held. |
| 3 | Geometry | 7 → 7 | Lugs still separate blocks on the carcass (`truck_day/wheel.png` at 3×, `ultra_day/hero.png` (640–780, 380–520)). |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | Flank still returns one dark value: `truck_day/hero.png` green-mask p95 0.199 under sky p95 0.355, 2.6 % of paint pixels over the sky median (R5 0.233 / 0.391 / 3.1 %); door row medians rows 130–200 fall 0.133 → 0.076 with no band. |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass | 7 → 6 | Family 2 (dusk windscreen veil). |
| 8 | Lighting | **7 → 5** | **The beam-pool slab is back, at night and now at dusk.** `truck_night/front.png` ground rows 230–360: 77 764 px over sRGB 0.5 (R5: 0 on the ground — the 5 765 px I count there are the two lamp discs), box (100–540, 230–360) median Y **0.558**, p95 0.711, 5 738 px over 0.85 at (370, 304). `truck_night/hero.png` ground rows 150–360: a 4 900 px blob over 0.5 at (85, 283) (R5 no ground blob ≥ 20 px). `truck_night/road.png` a 20 693 px blob over 0.5 at (113, 294) (R5 8 px). `ultra_night/road.png` 81 792 px over 0.5 (R5 162); `ultra_night/hero.png` ground 26 232 px (R5 4 550, and those were in the lamps). **Dusk:** headlamps are on with the sun still up — `truck_dusk/front.png` ground rows 230–360 median 0.013 → **0.419**, 62 422 px over 0.5, 2 388 over 0.85 (R5 190 / 0); grille rows 100–260 p95 0.183 → 0.487 against sky p95 0.437 (R5 kept the grille 0.23–0.29 *under* the sky — that was on my must-not-regress list); `truck_dusk/detail.png` 8 727 px over 0.7 (R5 1 132). Against: the pods are separated (row 16) and the night ground beyond the beam is up (`mainroad` pad 0.0239 → 0.0262). Two points for a slab that whites out a third of two frames and lamps that out-shine the dusk sun. |
| 9 | Shadows | 7 → 7 | Soft contact shadow under sills and tyres (`truck_day/hero`, `wheel`; `ultra_day/hero`); moonlit night shadows on the new pale ground are soft and attached (`truck_night/wheel.png`). |
| 10 | Reflections | 6 → 7 | **Headlamp lenses return the sky.** `ultra_day/hero.png` upper lens (428–448, 345–372) medY 0.170, p90 0.413; lower lens (382–398, 410–438) 0.133 / 0.377; sky (900–1200, 40–120) 0.257 — −0.6 / −0.95 st with a visible blue-over-tan horizon line in the dome (R5: 0.069 / 0.107 under 0.315, −1.5 to −2 st, no sky). Mirror face still a plate (family 2). Flank unchanged (row 5). |
| 11 | Colour / atmosphere | 6 → 6 | |
| 12 | Animation | — | Nothing on the truck moves in a still; no dust in any frame (the truck is stationary in every capture). Not scored. |
| 13 | Physics / ground contact | 8 → 8 | Level stance on all four in `road`, `forest`, `mainroad`, `hero`; tyres in the dirt with a darkened contact band under the lugs (`truck_day/wheel.png` crop (350–640, 140–320) at 2×); the trail carries two ruts the track width of the truck in `forest` and `mainroad`. No fresh imprint directly behind the rear tyre in `rear.png` (the ground under (480–620, 300–360) is the undisturbed trail texture). |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 6 → 5 | Pods now separate at 0.5: `truck_night/hero.png` sky rows 0–150 over 0.5 624 → 302 px, largest blob 379 → 32 px; `ultra_night/hero.png` rows 0–300 3 882 → 91 px largest (asked for last round — holds). Against: the beam slabs above, and a lilac-white veil over the whole windscreen in `truck_dusk/hero.png` (family 2). |
| 17 | Temporal stability | — | |
| 18 | Browser performance | — | Family 10. |

**Top three weaknesses**

1. **Beam-pool slab, night and dusk.** `truck_night/front.png` (100–540, 230–360) median Y 0.558 / 77 764 px over 0.5; `truck_dusk/front.png` same rows median 0.419 / 62 422 px over 0.5; `truck_night/road.png` 20 693 px blob at (113, 294). The frame says: the lamp intensity or its ground gain is set for the round-5 red earth and is now landing on pale sand, and the lamps are lit while the dusk sun is still 0.35 Y in the sky. Fix I would prescribe from the frame: cap the headlamp ground return so the pool's p95 stays ≤ 0.15 at night on *any* albedo (a lamp intensity ≈ 3.5–4 st lower than what these frames show, or an exposure-relative clamp on the pool), and gate the lamps off at dusk until the sky Y in rows 0–60 is under ≈ 0.1 (R5's dusk hour had the lamps off and the grille under the sky). Test: no ground blob ≥ 20 px over 0.5 in `truck_night/hero`, `front`, `road` or `truck_dusk/front`; dusk grille p95 under sky p95.
2. **Dusk windscreen veil.** `truck_dusk/hero.png` pane (258–322, 112–148) medY 0.071 → 0.365, HSV (287°, 0.12, 0.62), p90 0.498 — a flat lilac-white pane at the sky's luma (sky median 0.35) with the interior gone; the side window beside it (380–420, 110–140) stays 0.024. The pane reflects the whole dusk sky at ≈ 1.0, so the Fresnel term (or a dusk sky env-map gain) is saturating at this 35–40° view angle. Fix: clamp the windscreen's reflectance at grazing to ≈ 0.35 of the sky and keep the pane's own transmission so the seat and console read through. Test: pane medY ≤ 0.6 × sky median with the interior visible at 3×.
3. **The flanks never reach the skyline** (unchanged from round 5: `truck_day/hero.png` paint p95 0.199 under sky p95 0.355; door row medians fall 0.133 → 0.076 with no band). Same prescription as round 5: lower the paint's sky line so a vertical door at hood height sees sky above ≈ 5° instead of 17°.

**Regressions:** Lighting 7 → 5 (beam slabs, lamps on at dusk); Glass 7 → 6 (dusk veil); Visual cleanliness 6 → 5.
**Must not regress:** pods separated (largest sky blob ≤ 40 px over 0.5 at 640, ≤ 100 at 1280); lens sky return in `ultra_day/hero.png` (−1 st or better against the sky); level stance; contact shadows.

---

## 2 · Car glass

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | `glass/mirror.png` is a tool change (face now (395–510, 60–230), `cover` 64.8 → 9.1 %); `interior.png` frames the face at the same place; `rear_dust` unobstructed. |
| 5 | Materials | 6 → 6 | |
| 6 | Texture quality | 6 → 6 | Sill streaks still one frequency (`side_shade.png` rows 250–300 at 2×). |
| 7 | Glass / transparency | 7 → 6 | `metrics.json`, the 11 comparable views: `see` up on 8 (ws_close 0.925 → 0.934, ws_mid 0.874 → 0.877, side_sun 0.957 → 0.965, int_side 0.861 → 0.865, rear_dust 0.857 → 0.862, dusk_ws 0.845 → 0.862, night_int 0.927 → 0.965, moving 0.887 → 0.865 down), down on side_shade (0.919 → 0.914), interior (0.799 → 0.796) and **night_ext 0.962 → 0.876**; `veil` within ±0.004 on nine, up on moving (0.073 → 0.088) and night_ext (0.021 → 0.027), down on int_side (0.021 → 0.017); `clipPct` 0 and `hot` 0 everywhere. Flat on the tool's views — but the hero frame shows a pane the tool did not look at: `truck_dusk/hero.png` windscreen at 0.365 Y with no interior behind it (family 1 #2). One point for that. |
| 8 | Lighting | 6 → 6 | |
| 10 | Reflections | 7 → 7 | Mirror face still a painted plate: straw-hue fraction in the lower two-thirds of the face 0.000 (R5 0.001) while the scene beside it (0–360, 80–220) is 41.8 % straw (R5 21.1 %); the face's horizon is a bare dune line, no tussocks, no ridge. Same face from the seat in `interior.png` and `truck_day/interior.png` (sky, plain, green flank — holds). |
| 11 | Colour / atmosphere | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | 6 → 7 | `moving` flick 0.156 → 0.095 with `flickBg` 0.110 — **flickRatio 0.87**, the pane now flickers less than the background it shows; every static view is under 0.03 and under its own background (ratios 0.80–0.98: ws_close 0.86, side_sun 0.82, int_side 0.90, night_ext 0.93). The `mirror` ratio 4.37 is 0.0083 against a 0.0019 background on a 9 % pane — a mirror's content is not the background behind it, so I do not read it as flicker. |

**Top three weaknesses**

1. **Dusk windscreen veil** — family 1 #2 (`truck_dusk/hero.png` (258–322, 112–148) medY 0.365 vs R5 0.071).
2. **Mirror is a plate, not a mirror** — `glass/mirror.png` face (395–510, 60–230): 0 % straw against 41.8 % in the scene it should show; the face's horizon row does not follow the ridge behind the truck. Same prescription as round 5: a low-res planar pass through the glass plane, sky | terrain | vegetation swath | body, every second frame when the seat or `mirror` camera is active. Test: skyline row in the face within ±3 px of the reflected ridge; straw fraction ≥ 10 % below it.
3. **`night_ext` see 0.96 → 0.88, veil 0.021 → 0.027, spread 0.105 → 0.172.** The night exterior pane is carrying more of something — with the moonlit ground now at 0.02–0.03 (family 9) the likely culprit is the pane's own reflection of the brighter ground. Fix: night reflectance on the exterior pane ×0.6. Test: `night_ext` see ≥ 0.95 with `hot` 0.

**Regressions:** Glass / transparency 7 → 6 (dusk veil in `truck_dusk/hero.png`).
**Must not regress:** `moving` flickRatio < 1; `see`/`veil` on the day panes; zero clip; mirror face visible from the seat.

---

## 3 · Fleet (materials round now in frame)

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | Day frames mean abs Δ 0.025–0.064 (the trailer 0.064 is the reframed lid again). |
| 2 | Silhouette | 6 → 6 | |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 7 | **Chrome and alloy landed.** `suv_0_day.png` bumper (105–185, 192–210) medY 0.063 → **0.343** (+2.4 st), above the sky median 0.294, with a blue upper band (HSV sat 0.38 → 0.24, V 0.44 → 0.59) and a tan lower band — a reflecting bar; wheel spokes (215–250, 165–195) p90 0.451 → 0.515. `pickup_0_day.png` spare rim brighter (frame pixels over 0.85: 532 → 1 300); `safari-jeep_2_day` 58 → 288. The tubular bull-bar on the SUV stays satin olive (the right call for a bull-bar). |
| 6 | Texture quality | 5 → 5 | |
| 7 | Glass | 6 → 6 | |
| 8 | Lighting | day 6 → 6, night 7 → 7 | Night: frame mean +0.15 to +0.91 st on 9 of 12 (supply-truck +0.91, trailer +0.58, jeep_0 +0.45) with the sky band (top 12 %) *down* 0.07–0.64 st on all 12 — a darker sky over a brighter row, legibility up; jeep_1 −0.01, jeep_2 −0.10, utility −0.06. |
| 9 | Shadows | 7 → 7 | |
| 10 | Reflections | 4 → 6 | The bumper returns sky and ground in two bands (row 5); the alloys catch the sun. Still no environment in the paint. |
| 11 | Colour / atmosphere | 7 → 7 | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 5 → 5 | `safari-jeep_0_night.png` disc at (238, 145): 123 → 114 px over 0.85 — still there, still larger than the lantern head that feeds it (3 px). `pickup_0_night.png` blooms unchanged (298 / 231 / 171 px over 0.85). New: `supply-truck_0_night.png` three specks over 0.85 (19, 16, 12 px at (159, 121), (57, 93), (46, 94)) and `motorcycle_0_night.png` pixels over 0.7 544 → 1 807 — the chrome catching the lamps. `safari-jeep_2_night` blobs over 0.85 gone (56 + 43 → 0). |

**Top three weaknesses**

1. **Jeep-0 night disc persists.** `safari-jeep_0_night.png` (214–252, 115–153), 114 px over 0.85 under a 3 px source. Same prescription as round 5: fleet `clearcoatRoughness` up to ≈ 0.22 and the lantern's point intensity down with the visible bulb carried by emissive. Test: no body-panel blob over 0.85 larger than the lamp's own.
2. **Pickup headlamp blooms** (298 / 231 / 171 px over 0.85 at (152, 144), (176, 168), (118, 160)) unchanged from round 5. Fix: fleet lamp core not scaled by the night gain.
3. **Chrome specks on the supply truck at night** (three 12–19 px blobs over 0.85 where a lamp reflects in chrome trim). Fix: chrome roughness floor 0.12 at night, or clamp the lamp's specular return at 0.8.

**Regressions:** none by category.
**Must not regress:** bumper sky return in `suv_0_day.png` (bumper median ≥ sky median); night row legibility; day frames otherwise identical.

---

## 4 · Campground

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | Day frames mean abs Δ 0.013–0.045. |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | |
| 6 | Texture quality | 5 → 5 | |
| 8 | Lighting | 7 → 7 | **Fire pool fixed:** `camp_fire_night.png` pool (230–320, 185–210) medY 0.355 → **0.135**, HSV (31°, 0.33, 0.71) → (23°, 0.46, 0.53); (235–275, 200–215) 0.196 → 0.061. Y inside my 0.10–0.14 target; saturation 0.46 short of the 0.6 I asked. Against: the night ground came down — near ground L (0–150, 230–288) 0.0228 → 0.0148, R (380–512, 230–288) 0.060 → 0.038 (−0.6 st), `camp_arrive_night` pad (0–512, 240–288) 0.0142 → 0.0112 (under the 0.014 floor I set), `camp_gate_night` 0.0189 → 0.0209 up; sky (0–512, 0–60) 0.0168 → 0.0135. Flame smaller: pixels over 0.7 in (200–330, 120–215) 1 186 → 261, largest tongue 568 → 149 px, with a grey smoke puff above it that round 5 lacked. Net flat. |
| 9 | Shadows | 6 → 5 | **Table pockets gone at the fast tier.** `camp_day/camp_mess.png` pocket (300–340, 236–256) 0.054 → 0.218 under a pad (104–144, 224–240) 0.406 → 0.426: **2.91 → 0.96 st**, p10 of (150–400, 236–270) 2.80 → 0.98 st. The target was 2 st; the frame has overshot to where the tables cast no readable shadow — the floor under the canopy is one flat tone (median 0.374 vs the pad 0.426, 0.19 st). `ultra_camp/camp_mess.png` keeps the pocket at 1.7 st (0.134 under 0.431), so the loss is in the fast tier's shadow filtering, not the light. Penumbra still a 1-px checker at 3× (both rounds). |
| 11 | Colour / atmosphere | 6 → 7 | Far corner now moonlit: `camp_fire_night.png` (20–120, 230–280) HSV (14°, 0.29, 0.20) → (290°, 0.09, 0.14) — cool, desaturated, 2.9 st under the pool; canopy top (190–270, 118–140) V 0.28 → 0.15, no orange from beneath. Stars over 0.6 in rows 0–60: 41 → 19 (the darker sky). |
| 12 | Animation | — | One frame of a fire: a shorter, wider tongue (149 px over 0.7 at (284, 169)) with a ragged card edge and a smoke puff at (300–330, 120–150); embers present. Motion cannot be judged from one frame — question below. |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 5 → 5 | |
| 16 | Visual cleanliness | 6 → 6 | |

**Top three weaknesses**

1. **Table shadows lost at fast.** Numbers above: 0.96 st at 512 wide against 1.7 st at 1280 for the same pocket. The fast tier's shadow blur (or a lower cascade resolution) is wider than a chair leg. Fix: keep the softening that brought the canopy from 2.9 st toward 2 st, but halve the blur radius on the near cascade at fast (or raise its map to 2048) so a 40-px table pocket at 512 reads ≥ 1.5 st. Test: (300–340, 236–256) 1.5–2.2 st under the pad at both tiers.
2. **Night pad under the floor.** `camp_arrive_night` pad 0.0112 and `camp_fire_night` near ground 0.0148 — under the 0.014–0.02 band I set last round (the pad median in `truck_night/mainroad` is 0.026, so the camp is now ≈ 1 st darker than the trail at the same hour). Fix: raise the camp's moon/ground indirect 0.5 st; keep the far-corner saturation ≤ 0.1.
3. **Fire saturation.** Pool HSV sat 0.46 at Y 0.135 — target ≥ 0.6. Fix: warm the fire light's colour (its hue is 23°; the R5 prescription (1.0, 0.55, 0.25) stands) with intensity as now. Test: sat ≥ 0.6 at Y 0.10–0.14.

**Regressions:** Shadows 6 → 5 (`camp_mess` pockets 2.91 → 0.96 st).
**Must not regress:** pool Y ≤ 0.15; far corner sat ≤ 0.1; canopy top not lit from beneath; gate pad ≥ 0.02.

---

## 5 · Road & terrain

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 3 | Geometry | 5 → 5 | Trail edge still a texture seam, no berm (`truck_day/road.png`, `mainroad.png`). Ruts read as two darker bands the track width apart (`forest`, `mainroad`) — a texture, not a displacement (no shading change across the rut edge at 3×). |
| 5 | Materials | 7 → 7 | Water brighter and bluer: `lions_day/lion_pride.png` pool body (270–290, 115–125) 0.076 → 0.178 (−2.2 st → −0.97 st under the sky 0.349); wet annulus still present. |
| 6 | Texture quality | 6 → 6 | |
| 10 | Reflections | 4 → 4 | The kopje reflections are still smooth dark domes hanging from the far shore — `ultra_lions/lion_close.png` (300–640, 150–280) at 2×, both rounds, same clean elliptical rims. |
| 11 | Colour / atmosphere | 8 → 8 | Ridge/sky (persist method): `truck_day/mainroad` (cols 40–600) 0.805 → 0.862; `lions_day/lion_far` 0.726 → 0.801; `fleet/pickup_0_day` 0.820 → 0.893; `lions_day/lion_pride` 0.819 → 0.881; `camp_day/camp_beyond` (40–500, from row 92) 0.764 → 0.808; `camp_arrive` 0.872 → 0.899; `camp_gate` (300–512) 0.864 → 0.889. All seven up; five of seven inside the 0.85–0.90 I asked for. Against: the `lion_far` far-plain band (0–150, 117–129) medY 0.274 → 0.240 (0.76 → 0.66 of the sky 0.362) — the far plain got darker while the hills above it got hazier, so the plain now sits under the ridge it should fade into. Held at 8. |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 6 | |

**Top three weaknesses**

1. **Kopje domes** (as round 5 #1): `ultra_lions/lion_close.png` (330–600, 190–260), smooth shaded ellipsoids with clean rims under a speckled granite boulder. Prescription unchanged: a real planar reflection, or scale the trace ellipsoid to the inscribed radius and jitter its rim with the ripple normal.
2. **Far plain under the ridge.** `lions_day/lion_far.png` (0–150, 117–129) 0.66 of the sky against a ridge at 0.80 — the plain's distance fog is ≈ 0.3 st short of the hill fog at the same depth. Fix: apply the hill's far ramp to the terrain sheet beyond ≈ 250 m so the band reaches ≥ 0.75 of the sky. Test: band/sky ≥ 0.75 with the acacia rows 128–144 still darker than it.
3. **Ruts are paint.** `truck_day/forest.png` two rut bands with no relief at 3×. Fix: a 0.06 m displacement in the wheel-track mask with its own normal, so the low sun (dusk `forest`) shades the rut's far wall.

**Regressions:** none.
**Must not regress:** ridge/sky ≥ 0.80 on all seven frames; pool body ≥ −1.2 st under the sky; wet annulus.

---

## 6 · Vegetation

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 2 | Silhouette | 6 → 6 | Straw tufts still hard-edged card sods at 3× (`lion_pride.png` rows 192–288), now pale instead of khaki. |
| 5 | Materials | 6 → 6 | Dusk crowns: `truck_dusk/forest.png` green-mask median 0.0208 under a sky of 0.348 (a different spot from R5; lit olive, not black, at 3×). |
| 6 | Texture quality | 5 → 5 | |
| 8 | Lighting | 6 → 6 | |
| 11 | Colour / atmosphere | 5 → 7 | **Pale straw, as asked.** `lions_day/lion_pride.png` lower third: straw mask (g ≥ 0.8 r, g > 1.2 b, V > 0.45) 16.0 → **41.6 %**, khaki mask (hue 35–70°, sat > 0.25, V 0.2–0.45) 12.0 → 4.4 %, plain median 0.150 → 0.194 (+0.37 st). Straw ≥ 30 % was my acceptance test; met. The lions now sit in cover the colour of their coat (`lion_medium`, `lion_far`). |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 6 → 6 | |

**Top three weaknesses**

1. **Card silhouettes.** `lion_pride.png` (0–512, 192–288) and the walk strip foreground (`walk_00.png` (0–120, 150–220)): rectangular sods with a hard alpha edge; in the strip a tuft at (330–345, 160–190) hides the hind paw for three frames. Fix as round 5: more planes per clump, `ragged` up, alpha test up so the edge follows the blade.
2. **Turf occludes the gait.** The strip's foreground tufts sit exactly on the paw row (rows 165–190) — see family 8. Fix (tooling, not the world): move the strip's start point 0.5 m so the paw row is clear, or thin the lawn scatter within 1 m of the walk line.
3. **Dusk crown still ≈ 4 st under the sky** (`truck_dusk/forest.png` 0.0208 vs 0.348). Fix: crown translucency at dusk +0.5 st.

**Regressions:** none. (Colour 5 → 7 recovers last round's drop.)
**Must not regress:** straw ≥ 30 % under the pride; plain median within ±0.5 st of the soil; dusk crowns lit.

---

## 7 · Lions

The head is remodelled and the coat has direction; the body is round 5's.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 5 → 6 | Ears now stand on top of the skull, the muzzle has a nose and a brow (`ultra_lions/lion_face.png`, `lion_close.png`). Length against length on the side view (`lions_walk/walk_02.png`, 4× grid): head nose-to-ear 226–250 = 24 px, body chest-to-rump 250–335 = 85 px → **0.28** — a lioness's ratio; shoulder height 66 px against a nose-to-rump 110 px (0.60). The barrel body and short forelegs remain (`ultra_lions/lion_close.png`, forearm ≈ 0.6 of chest depth). |
| 3 | Geometry | 5 → 6 | **Toes.** `lions_day/lion_close.png` (180–340, 235–288) at 3×: five rounded toe capsules per paw with dark claw dots and a contact shadow under the toe line (R5 four pale cubes, no shadow). |
| 4 | Scale | 6 → 6 | |
| 5 | Materials | 5 → 6 | Coat has hair direction: strands run shoulder → elbow and down the chest ruff in `lions_dusk/lion_close_dusk.png` (220–420, 100–260) at 3× and `ultra_lions/lion_close.png` chest. Dusk rim continuity over the back (cols 250–390): 75/140 → 86/140 columns carry ≥ +0.3 st, longest gap 23 → 12 px. |
| 6 | Texture quality | 5 → 6 | |
| 8 | Lighting | 6 → 6 | `lion_close.png` back (300–380, 120–135) 0.516 → 0.592, belly (300–360, 215–235) 0.076 → 0.112; dusk body (240–390, 130–250) median 0.102 → 0.099, p95 0.210 → 0.259 (the rim). |
| 9 | Shadows | 5 → 6 | Under the chest (255–300, 262–282) 0.110 → 0.072 against open ground (150–200) 0.190 → 0.163: **−0.79 → −1.18 st**, and it now follows the toes. |
| 10 | Reflections (eyes) | 5 → 5 | `ultra_lions/lion_face.png` 40 × 40 boxes on the pupils: left (646–686, 213–253) dark 508 / pale 17, right (671–711, 195–235 — the eye nearest the camera) dark 452 / pale 0; iris hue 25–29°, highlight V 0.86–0.90 (R5: dark 522–613, pale 12–31, hue 23–29°, V 0.89–0.90). Same eye, larger iris; pupil still a round disc. |
| 11 | Colour / atmosphere | 6 → 6 | |
| 12 | Animation | — | Family 8. |
| 13 | Physics / ground contact | 5 → 6 | Paws rest in straw with a shadow under the toes (`lion_close`, `lion_side`); the resting poses are round 5's sphinx and lie-flat. |
| 14 | Detail density | 5 → 6 | |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 6 | `lion_close_dusk.png` decal slab (30–130, 165–195) 0.026 → 0.030, still under turf. |
| 17 | Temporal stability | — | Family 8. |

**Top three weaknesses**

1. **The face is a toy's.** `ultra_lions/lion_face.png` (560–900, 150–340) at 2×: round eyes 40 px across on a 340-px head (a lioness's eye is ≈ 1/12 of head width, this is 1/8), a smooth sculpted muzzle with a painted nose, no whisker pads, no lip line. Fix: eye scale ×0.75, a vertical-slit-to-round pupil blend, whisker pad geometry (two 0.03 m bulges) with a dark lip seam.
2. **Body is still a barrel on short legs** — forearm ≈ 0.6 of chest depth in `lion_close.png`; no scapula, no hip point in `lion_side.png`. Prescription from round 5 stands: leg lengths ×1.3, a scapula bulge, a hip.
3. **Kopje reflections** behind every pride frame (family 5 #1).

**Regressions:** none.
**Must not regress:** toe capsules with claws and their contact shadow; chest shadow ≤ −1 st; dusk rim continuity ≥ 85/140; head/body length ≤ 0.30 on the side view.

---

## 8 · Lion feet & gait (walk strip)

Camera at 2.2 m now, ground seen at 15°: the round-5 strip is not comparable frame-to-frame; the categories below are judged on this strip's own evidence, then placed on the same scale as last round's numbers (which were: hind paws drifting 8–12 px per frame while planted, no flexion). Method: 6–7× nearest-neighbour crops of rows 166–186 over the leg columns, stacked as a kymograph (`/tmp/critic-c/sheets/kymo6b.png`), 5-px grid; readings ±3 px.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 12 | Animation | 5 → 6 | Body advances ≈ 15 px per 0.3 s (leg group and tail shift 14–19 px per frame, frames 0–7). **Flexion is there:** in `walk_01.png` the reaching foreleg (253–262, 150–178) lands toe-first with the carpus flexed and the far hind leg is lifted with the hock bent (paw bottom row 172 against the ground row 178); in `walk_02.png` the passing foreleg (268–276) carries its paw curled under at mid-swing; `walk_04.png` hind leg (265–280) mid-swing with a visible hock angle. Head carried level with the back, slightly lowered (rows 110–140), no bob I can measure (back top row 60–61 on all eight frames — the spine does not rise and fall at all, which is the part that still reads stiff); tail carried in a raised S with the dark tip swinging (tip x 355 → 347 → 346 → 358 → 357 → 377 across frames 1–7, rising 163 → 152). One point up for flexion and carriage; a rigid spine and constant-speed swing keep it at 6. |
| 13 | Physics / ground contact | 6 → 7 | **Planted paws hold their pixel.** The paw at x ≈ 292–300 (bottom row 175–177) is at the same column in `walk_00` through `walk_04` (five frames, 1.2 s, within ±3 px) while the body moves ≈ 60 px; the paw at x ≈ 250–258 holds from `walk_01` (touch-down at 253–262) through `walk_03`; the forepaw at x ≈ 232–246 holds `walk_04`–`walk_07`. No paw slides ≥ 5 px while in contact (R5 hind paws 8–12 px per frame). **Contact darkening under the planted paw:** ground box (292–300, 178–182) 0.159 / 0.126 / 0.118 / 0.135 / 0.165 while the paw is on it (frames 0–4) against 0.178 once it lifts (frames 5–7) — −0.4 to −0.6 st; under the paw at (250–258, 179–183) 0.107 / 0.095 / 0.104 (frames 2–4) against 0.205 free (frames 0, 7) — −1.0 st, part of which is the body shadow. **Toe re-plant:** `walk_01` → `walk_02` the reaching paw settles 253–262 → 250–258 (toes down, −3 px), the one place a paw moves after contact, and it moves the right way. Against: the ground is dead flat sand — no scuff, no print left behind a lifted paw (the box at 292–300 returns exactly to 0.178 in frame 5), and the foreground tuft at (330–345, 160–190) hides the near hind paw in frames 1–3. |
| 17 | Temporal stability | 6 → 6 | No popping or flicker in the lion across the eight frames. Everything else in the frame is **bit-identical** from frame to frame: sky rows 0–45 mean abs Δ 0.0000, water (0–200, 55–80) 0.0000, the resting lions at (400–512, 60–130) 0.0001, foreground rows 200–288 0.0000. Stable — but a frozen world (no ripple, no breath, no grass movement over 2.1 s) is a question for the consensus writer (below), not a point either way. |

**Top three weaknesses**

1. **Rigid spine and a constant-speed swing.** Back top row 60–61 on all eight frames; the swing leg travels ≈ 30 px per frame in `walk_01`–`walk_02` with the same angular rate at lift-off and touch-down. Fix: a ±2 px (≈ 3 cm) vertical spine oscillation at twice the stride frequency, phase-locked to the hind-foot plants, and an ease-out on the swing (protraction fastest at mid-swing, ≤ 40 % of that speed in the last 20 % before contact). Test: back row varies ≥ 2 px across the strip; swing-paw x-step in the last frame before plant ≤ 8 px.
2. **No trace on the ground.** Box (292–300, 178–182) returns to 0.178 the frame after the paw lifts. Fix: a fading print decal (−0.3 st, 1.5 s decay) spawned at each plant. Test: a lifted paw's spot stays ≥ 0.2 st under the free ground one frame later.
3. **Tuft on the paw row.** (330–345, 160–190) hides the near hind paw in `walk_01`–`walk_03`. Family 6 #2 (tooling).

**Regressions:** none. **Must not regress:** planted paws within ±4 px for ≥ 2 frames; contact darkening ≥ 0.4 st under a planted paw; the toe-down settle.

---

## 9 · Lighting & atmosphere (all hours)

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 8 | Lighting | 7 → 6 | Up: night ground beyond the beam (`truck_night/mainroad` pad rows 300–360 0.0239 → 0.0262; `wheel` 0.0106 → 0.0183; `rear` 0.0100 → 0.0161), moonlit ground and cast shadows in every night truck frame (`truck_night/wheel`, `rear`, `interior`), the fire pool (family 4), the fleet night row up over a darker sky (family 3). Down: the beam-pool slab in four night frames and the dusk `front` (family 1 row 8 — 77 764 / 20 693 / 26 232 / 81 792 / 62 422 px over 0.5), lamps lit at dusk with the grille over the sky, camp night ground −0.6 st. One point net. |
| 9 | Shadows | 7 → 7 | Lion contact −0.79 → −1.18 st (+); camp pockets 2.91 → 0.96 st at fast (−); truck contact soft and attached at all three hours. |
| 10 | Reflections | 5 → 6 | Headlamp lenses return the sky (−0.6 / −0.95 st, family 1); chrome bumper at +2.4 st with sky and ground bands (family 3); water at −0.97 st under the sky. Mirror still a plate; kopje domes remain. |
| 11 | Colour / atmosphere | 7 → 7 | Hills 0.80–0.90 on all seven frames (family 5). **Night sky darker, as asked:** `truck_night/mainroad` sky rows 5–40 (stars masked) 0.0206 → 0.0149 (my target ≤ 0.016), `hero` 0.0222 → 0.0198, `forest` 0.0152 → 0.0140, `camp_fire_night` (0–512, 0–60) 0.0168 → 0.0135, with the pad still ≥ 0.02 on `mainroad` — the pad/sky I asked for. Stars thinner (hero rows 0–79 blobs over 0.6: 120 → 69; mainroad 16 → 7; camp 41 → 19). Camp far corner moonlit blue-grey. Against: **the dusk hour is brighter and pinker** — `truck_dusk/hero.png` sky rows 0–60 median 0.159 → 0.350 (+1.1 st), p95 0.458 → 0.437; the dusk frames now read as late afternoon with the lamps on. Held at 7. |
| 16 | Visual cleanliness | 7 → 6 | Pods separated at every resolution (+); beam slabs and the dusk windscreen veil (−). |
| — | Moon (new, own terms) | — → 7 (night) | `truck_night/moon.png`: a 21 px disc over 0.7 at (444, 65), bounding box 442–447 × 64–68, halo falling 0.039 (r 3) → 0.029 (r 10) → 0.020 (r 24) → 0.015 (r 40) over a sky of 0.0068 — a tight disc with a soft halo, thin cirrus, 104 star blobs over 0.5, the watchtower silhouetted. No clip. **Day and dusk `moon.png` show no moon:** the day frame is a sun-glare wash — 81 449 px over 0.7 (35 % of the frame), sky median 0.43, no disc edge anywhere; the dusk frame is the sun on the horizon behind an acacia (28 001 px over 0.7). If those two views are meant to frame the moon, it is not there; if they are meant to frame the sun, the day glare is oversized. Question below. |

**Top three weaknesses**

1. **Beam slabs** — family 1 #1. Five frames white out; the largest single artefact in the round.
2. **Dusk hour drifted.** Sky median 0.159 → 0.350 and the lamps on: either the dusk capture time moved earlier or the dusk sky rig gained a stop. Fix: put the dusk sky back to ≈ 0.16 at rows 0–60 (or the capture back to the same solar elevation) and gate the lamps on the sky's Y (family 1 #1). Test: `truck_dusk/hero` sky median 0.14–0.20, grille p95 under sky p95.
3. **Camp night a stop under the trail.** `camp_arrive_night` pad 0.0112 vs `truck_night/mainroad` pad 0.0262 at the same hour. Fix: family 4 #2.

**Regressions:** Lighting 7 → 6, Visual cleanliness 7 → 6 (both the beam slabs).
**Must not regress:** night sky rows 5–40 ≤ 0.016 on `mainroad` with the pad ≥ 0.02; pods separated; hills ≥ 0.80; moon disc ≤ 30 px over 0.7 with a halo that decays to the sky by r 40; camp far corner cool.

---

## 10 · Performance (`stats.json` only)

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 18 | Browser performance | 6 → 6 | `runtime` totals, 640×360: calls 614 / 607 / 613 → 570 / 637 / 621 (day / dusk / night), triangles 2.932 / 2.920 / 2.935 M → 2.424 / 2.748 / 2.736 M (−17 % / −6 % / −7 %), programs 176 → 176, textures 304 → 303, geometries 344 → 343–344. Ultra 1280×720: 681 / 702 → 682 / 705 calls, 3.500 / 3.559 → 3.559 / 3.578 M triangles (+1.7 % / +0.5 %), programs 179 / 180 unchanged, textures 306 / 301 → 305 / 300. The triangle drop on the 640 sets coincides with the truck's new spot (fewer swath cards in frame) and does not show at ultra, so I do not credit it; programs flat, no new textures. Per-view `views` is 10 entries now (the `moon` view) but carries no per-view counts. fps is SwiftShader (19–44) and not comparable. No `stats.json` in `camp_*`, `fleet/`, `lions_*`. |

**Weakness:** 2.4–2.9 M triangles and 570–640 calls for a static truck view (round-4 finding, unchanged); dusk calls up 607 → 637 with the lamps lit. Fix as before: swath LOD past 200 m; merge the fleet row by material. **Must not regress:** programs ≤ 177 at fast, no new textures.

---

## Verdict on the gate

**The round's categories — Animation, Physics / ground contact, Temporal stability (R5 → R6):**

| Family | Animation | Physics / ground contact | Temporal stability |
|---|---|---|---|
| Hero car | — | 8 → 8 | — |
| Car glass | — | — | 6 → 7 |
| Campground | — (one frame of fire; not scoreable) | — | — |
| Lions | — | 5 → 6 | — |
| Lion feet & gait | 5 → 6 | 6 → 7 | 6 → 6 |
| **Sum** | **5 → 6** | **19 → 21** | **12 → 13** |

The round's own categories are flat or up in every family: the walk strip's planted paws hold their pixel for two to five frames where round 5's hind paws slid 8–12 px a frame, the swing leg flexes at the carpus and hock, the resting lions have toes with a shadow under them, the moving pane flickers less than its background. On those terms the round did what it set out to do.

**But a previously approved category drops by two points: Hero car Lighting 7 → 5.** `truck_night/front.png` ground median Y 0.558 with 77 764 px over sRGB 0.5, `truck_night/road.png` a 20 693 px ground blob, `ultra_night/road.png` 81 792 px, `ultra_night/hero.png` 26 232 px, and `truck_dusk/front.png` 62 422 px over 0.5 with the lamps lit under a 0.35 Y sky — the soft pool that round 5 approved ("no ground blob ≥ 20 px over 0.5 in `hero` or `front`") is a slab again in five frames, and the dusk grille sits over the sky where round 5 held it 0.23–0.29 under. Whether the cause is the pale sand at the new spot, a lamp gain, or the dusk clock, the frames are the evidence and the drop is two points. **Gate: fail — Hero car Lighting 7 → 5.** One-point drops, inside the rule: Hero Glass 7 → 6 and Car glass Glass 7 → 6 (the dusk windscreen veil, one frame), Hero Visual cleanliness 6 → 5, Campground Shadows 6 → 5 (table pockets 2.91 → 0.96 st at fast), Lighting & atmosphere Lighting 7 → 6 and Visual cleanliness 7 → 6 (the same slabs).

Acceptance tests I would carry: (1) no ground blob ≥ 20 px over sRGB 0.5 in `truck_night/hero`, `front`, `road`, `ultra_night/road` or `truck_dusk/front`, on *this* spot; (2) `truck_dusk/hero` sky rows 0–60 median 0.14–0.20 with the grille p95 under the sky p95 and the windscreen pane ≤ 0.6 × sky; (3) `camp_mess` pocket (300–340, 236–256) 1.5–2.2 st under the pad at 512 wide; (4) walk strip: a planted paw within ±4 px for ≥ 2 frames, contact darkening ≥ 0.4 st, back row varying ≥ 2 px across the strip; (5) `night_ext` see ≥ 0.95.

**Weakest object in the game:** still the lion, but less so — the head is now a lion's shape with a toy's eyes, the coat has direction, the toes have claws and a shadow, and the walk plants its feet; the barrel body, the rigid spine and the kopje domes in the water behind it remain. Second: the headlamp beam on the ground at night and dusk. Third: the door mirror — a painted plate at every angle.

**Family means (categories scored in both rounds):**

| Family | R5 | R6 | Δ |
|---|---|---|---|
| Hero car (15) | 6.73 | 6.60 | −0.13 |
| Car glass (9) | 6.33 | 6.22 | −0.11 |
| Fleet (14, lighting as day/night mean) | 5.96 | 6.18 | +0.21 |
| Campground (11) | 6.09 | 6.00 | −0.09 |
| Road & terrain (7) | 6.00 | 6.00 | 0 |
| Vegetation (7) | 5.86 | 6.14 | +0.29 |
| Lions (14) | 5.43 | 5.93 | +0.50 |
| Lion feet & gait (3) | 5.67 | 6.33 | +0.67 |
| Lighting & atmosphere (5) | 6.60 | 6.40 | −0.20 |
| Performance (1) | 6.00 | 6.00 | 0 |
| **All scored categories (86)** | **6.09** | **6.19** | **+0.10** |

**Five biggest findings**

1. **Beam-pool slab returned, night and dusk** — `truck_night/front.png` ground median 0.558 / 77 764 px over 0.5; `truck_dusk/front.png` 62 422 px with the lamps lit under a 0.35 sky; four more frames the same. The gate failure.
2. **The walk plants its feet** — paws hold their column within ±3 px for 2–5 frames (x ≈ 295 frames 0–4, x ≈ 254 frames 1–3, x ≈ 238 frames 4–7) while the body moves 15 px a frame; carpal and hock flexion visible in frames 1, 2, 4; contact darkening −0.4 to −0.6 st under the planted paw; a toe-down settle of 3 px after touch-down. Spine rigid (back row 60–61 on all eight frames).
3. **Lion head, coat and toes** — head/body length 0.28 on the side view; fur strands with direction and a rim continuous over 86/140 columns (longest gap 12 px); five toe capsules with claws and a shadow; chest shadow −1.18 st. Lions +0.50, the largest family gain.
4. **Dusk drifted** — sky median 0.159 → 0.350, the lamps on, the grille over the sky, and a lilac-white windscreen at 0.365 Y with the interior gone (`truck_dusk/hero.png` (258–322, 112–148)).
5. **Straw, chrome, hills, fire, night sky — five round-5 asks met:** pride straw 16 → 41.6 %; SUV bumper 0.063 → 0.343 (+2.4 st) with sky and ground bands; ridges 0.80–0.90 on all seven frames; fire pool 0.355 → 0.135 at sat 0.46; `mainroad` night sky 0.0206 → 0.0149 with the pad at 0.026. Against them: camp table pockets washed to 0.96 st at fast and the camp night ground down 0.6 st.

**Questions a frame could not settle**

1. The candidate HUD reads `build 776d40a · 2026-09-06 15:44Z`, not `c2f0b83`. Which build are the `truck_*`, `glass` and `ultra_*` sets from, and are the `camp_*`, `fleet`, `lions_*` sets from the same one?
2. The truck stands on a different stretch of trail in every `truck_*` view (pale sand at night, a two-track trail in `forest`/`mainroad`); note (5) says the same spot and pose. Did the pre-roll change the spot, or the world change under it? The beam slab reads very differently on pale sand than on red earth — the fix in family 1 #1 should be tested on both.
3. Is the dusk capture at the same solar elevation as round 5? Sky 0.159 → 0.350 and the headlamps lit suggest either an earlier clock or a rule that switches the lamps on at dusk. If the lamps are meant to be on at dusk, the grille-under-sky test from round 5 needs rewriting, but the ground slab does not.
4. The walk strip's world is bit-identical across 2.1 s — water, resting lions, grass, sky all Δ 0.0000. Is the scene clock frozen for the strip capture (deterministic pre-roll), or do the water, the resting lions' breathing and the grass not animate at all? If the former, the strip cannot show ripple or breath and Temporal stability is judged on the lion alone; if the latter, that is an Animation finding for families 4, 5 and 7.
5. `truck_day/moon.png` is a 35 %-of-frame glare with no disc and `truck_dusk/moon.png` frames the sun: are those two views meant to hold the moon (then it is missing by day), or the sun (then the day glare is over-sized)?
6. The camp night ground fell 0.6 st while the trail's rose: is the camp's moon/indirect rig separate from the truck sets', or is the `camp_night` capture at a different clock?
7. The fire is one frame: is the shorter, wider tongue with the smoke puff a new flame animation or a different phase of the same one? A 3-frame strip at 0.1 s would settle flicker rate, plume drift and ember motion.
