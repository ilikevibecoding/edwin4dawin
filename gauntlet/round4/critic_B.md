# Round 4 — Critic B

**Incumbent:** round 2, build `a8ca6eb`, `shots/round2/`.
**Candidate:** round 4, build `80cb5e6`, `shots/round4/`.
**Frames looked at:** all 103 candidate frames and their 103 incumbent pairs, side by side (206), plus 12 region crops at 3–4× and 14 gridded pairs for coordinate picking. Glass frames in round 2 are 320×180 and in round 4 640×360; wherever I compare glass texture statistics I box-filtered the candidate down to 320×180 first so the numbers are like for like.
**How I measured:** scratch scripts under `/tmp/criticB/` (PIL + numpy). Mean sRGB and HSV of a box; linear luminance Y = 0.2126 R + 0.7152 G + 0.0722 B after sRGB→linear; fractions of pixels over a threshold (the "0.35 luma" of the night-sky blocker is the round-1/2 definition, Rec.601 on sRGB values, and I kept that definition for that one number so the series is comparable); 4-connected blob counting on thresholded masks for stars and glows; high-frequency texture as the std of (Y − 5×5 box blur of Y) divided by mean Y; ratios in stops = log2(Y_a / Y_b). Walk strip: median-of-eight background subtraction, then the lion's foreground pixel count, centroid, x-extent, lowest row and clustered foot columns per frame. Performance from `truck_*/stats.json` only. Source read read-only with `git show 80cb5e6:<path>`.

Scores are 0–10 per the rubric, Round 2 → Round 4. Round 2 values are my own re-score of the incumbent frames this pass (they agree with the round-2 consensus rows where those quote B). `—` where the frame cannot show the category.

---

## The three round-2 blockers, first

| Blocker | Frame(s) | Round 2 | Round 4 | Verdict |
|---|---|---|---|---|
| Night sky reads as snow | `truck_night/hero.png`, top 80 rows | 20.3 % of sky pixels > 0.35 luma; 553 blobs, 122 of them ≥ 4 px; Milky Way = a denser field of the same dots | 10.55 % > 0.35 — but 10.42 of those 10.55 points are three bloomed objects (roof light bar 5 582 px, moon 1 960 px, one bloomed star 259 px). Excluding those three blobs the star field is **0.13 %** of the sky over 0.35; 56 blobs total, 9 of them ≥ 4 px, median 1 px. p50 of the sky 0.139 (was 0.141), p99 outside the glows 0.24. The Milky Way is now a smooth tilted band with a dust lane (`camp_night/camp_fire_night.png`: 0.56 % > 0.35, 86 blobs, was 14.5 % / 957 blobs). | **Closed** as a sky. Stars read as points; the band reads as a band. What is left over 0.35 is lamp and moon bloom, which is a different defect (Hero car / Lighting below). |
| Truck a silhouette or legible at night | `truck_night/hero.png` | body Y 0.0133 vs sky 0.0046 (+1.5 st), p95 0.032 | body Y 0.0115 vs sky 0.0076 (+0.6 st), p95 0.027; door skins, rack, jerrycans, spare all readable, wheel arches readable. | Legible, not a silhouette. The sky came up 0.7 st (13,19,39 vs 11,12,15) and went blue (sat 0.28 → 0.66); the body did not, so it sits closer to the sky but still over it. |
| Far hills saturated cobalt / cream band | `truck_day/mainroad.png` (sun behind, right ridge) | hill hue 219° sat 0.42 Y 0.142 = **0.41** of sky; band under it 0.27 of sky | hill hue 220° sat **0.21** Y 0.259 = **0.75** of sky; band under it 0.50 of sky | Closed on this ridge: in the 0.72–0.92 window, sat ≤ 0.25, band darker than sky. |
| | `truck_day/mainroad.png` left ridge (into sun) | hill 1.12 of sky, sat 0.15 | hill **1.12** of sky, sat 0.14 (unchanged); the skirt below it 0.40 → 0.76 | **Not closed** on this ridge: the sunlit face is still 0.16 st brighter than the sky above it. Same in `lions_day/lion_far.png` right ridge (1.24 of sky, both rounds) and `fleet/pickup_0_day.png` right ridge (1.01 → **1.11**). |
| | `camp_day/camp_beyond.png` | hill 0.77 of sky, sat 0.35 | hill **1.02** of sky, sat 0.18; left ridge 0.75 → 0.94 | Saturation fixed; value overshot — the hill is now level with the sky. Reads as a pale ghost, not a hill. |
| | `lions_day/lion_far.png` (backlit ridge) | hill 0.30 of sky, sat 0.36; band 0.17 | hill **0.57** of sky, sat 0.19; band 0.45 | Half-closed: saturation in spec, value still 0.8 st too dark. |
| | `fleet/pickup_0_day.png` | hill 0.34 of sky, sat 0.44; cream band **1.35** of sky | hill 0.75 of sky, sat 0.18; cream band **1.05** of sky (161,156,154 vs sky 139,155,179) | Hill closed; the band under it is still brighter than the sky (0.07 st). |
| | **Overall** | | Cobalt: gone everywhere (sat 0.09–0.21). Cream band: down from 1.35 to 1.05 of sky in the one frame where it exceeds, 0.45–0.76 elsewhere. Value against the sky: 2 of 8 measured ridges inside 0.72–0.92 (both 0.75), one at 0.94, 4 over 1.0 (1.02–1.24), 1 under 0.6 (0.57). | **Partly closed.** The colour blocker is closed, the value blocker is not: sun-facing crests are still brighter than the sky in both sun directions. |
| Shade under the mess canopy a hole | `camp_day/camp_mess.png` (512×288) | shaded floor box (200,200)–(330,235) Y 0.061 vs sunlit dirt L 0.367 / R 0.317: **2.6 / 2.4 st**; darkest floor under the tables Y 0.00–0.01 (> 5 st, clipped to black); chairs black shapes; edge 0.64 → 0.18 in 5 px | shaded floor Y **0.134** vs 0.378 / 0.306: **1.5 / 1.2 st**; darkest floor under the tables Y 0.03–0.06 (2.7–3.7 st); chairs readable (green canvas, timber legs, tabletops); edge 0.45 → 0.15 over ~10 px | **Closed on the target** (1.5–2 st at the floor, chairs readable). The edge is still semi-hard for a 6 m canvas at 640 wide, and the floor under the tables goes darker than a bounce-lit pad would. |
| | `camp_day/camp_interior.png` | | This frame is the truck cab at the gate barrier (dash, wheel, A-pillar, gate boom through the glass). It does not contain the mess canopy in either round. Tool/brief mismatch; not scored as shade. | — |

So: blocker #1 **closed**, #4 **closed**, #2 **half-closed** (hue yes, value no). Details, fixes and the new night defect the sky fix exposed are in the families below.

## Round-2 queued items — checklist

Every item the round-2 consensus queued (the all-three table, the two-of-three list, and the round-4 briefs), with the frame that shows it. Measurements are in the family sections.

| Item (consensus) | Status | Frame |
|---|---|---|
| #3 Dusk hero front blown | **Partly** — grille p95 0.70 → 0.56, clipped 23 % → 0 %, still +0.3 st over the sky | `truck_dusk/hero.png` |
| #5 Lions' eyes: amber back, lids | **Addressed** | `lions_day/lion_face.png` |
| #5 Mouth a painted hook | **Partly** — a chin and lower lip now; the mouth line is still paint | `lions_day/lion_face.png` |
| #5 Ears oversized / discs | **Addressed** — 0.25 L × 0.2 L on the skull corners | `lions_day/lion_face.png`, `lion_side.png` |
| #5 Saddle shading break, thigh seam | **Partly** — saddle break gone, cheek/muzzle crease and a faint thigh line remain | `lions_day/lion_side.png`, `lion_face.png` |
| #5 Paws as black boots | **Partly** — toes read from the front, soles still black from the side | `lions_day/lion_close.png` |
| #5 No contact shadow under lions | **Addressed** | `lions_day/lion_medium.png`, `lions_walk/walk_*.png` |
| #6 Plain around the pride bald | **Not** — ~10 near tufts (R2 ~8, R1 ~30) | `lions_day/lion_pride.png` |
| #7 Door mirror reflects nothing at `fast` | **Not** — worse by the tool's numbers (see 0.589 → 0.331) | `glass/mirror.png` |
| #8 HUD hints compete at night / vanish over dirt | **Addressed** | `truck_night/hud.png`, `truck_day/hud.png` |
| Night forest canopies black or missing | **Addressed** — canopies present at −1.0 st under the sky | `truck_night/forest.png` |
| Night ground grey-blue, camp pad a snowfield | **Addressed** — pad +2.1 st over sky → −0.4 st | `camp_night/camp_arrive_night.png`, `truck_night/hero.png` |
| Headlamps light nothing on the road | **Addressed** — low-beam pool on the trail | `truck_night/hud.png`, `truck_night/front.png` |
| Fire too small and short-reaching | **Partly** — reach and falloff yes; flame still 152 px > 0.5 in a 640 frame | `camp_night/camp_fire_night.png` |
| Acacia crowns one flat green | **Partly** — a top/bottom split, not a sun-side split | `truck_day/forest.png` |
| Dusk canopies black cut-outs | **Not** | `truck_dusk/forest.png` |
| Walk stride short, legs as sticks | **Partly** — stride +24 %, fore-leg pastern lean, stifle still straight | `lions_walk/walk_02..05.png` |
| Tail stiff | **Addressed** — sway and pitch sway | `lions_walk/walk_00..07.png` |
| Fleet night vehicles unlit silhouettes | **Partly** — markers on a few, a lantern by the row; the row is still dim | `fleet/ranger_0_night.png`, `camp_night/camp_arrive_night.png` |
| Interior one crackle/dust texture | **Addressed** | `truck_day/interior.png`, `glass/interior.png` |
| Waterhole flat disc, stepped edge | **Not** | `lions_day/lion_pride.png` |
| Mid-ground road tile repeat | **Partly** — macro variation hides it on `mainroad`; a faint period remains in the verge on `road` | `truck_day/mainroad.png`, `truck_day/road.png` |
| Ranger/utility windscreens magenta | **Cannot confirm** — not magenta in R4; not magenta in the R2 frame at this camera either | `fleet/ranger_0_day.png`, `fleet/utility_0_day.png` |
| Motorcycle wheels 12-segment | **Addressed** — 28 segments | `fleet/motorcycle_0_day.png` |
| Trailer plate framed inside its wheel arch | **Not** — tool defect carried over, not re-shot | `fleet/trailer_0_night.png` |
| Brief: dusk key azimuth vs aureole | **Partly** — aureole sits in the haze band; front of the truck still over the sky | `truck_dusk/hero.png`, `truck_dusk/front.png` |
| Brief: shadow softness | **Flat** — penumbra unchanged; mess-fly edge 10 px | `camp_day/camp_mess.png` |
| Brief: far-cascade acne on the lion neck | **Addressed** — none seen | `lions_day/lion_medium.png` |
| Brief: shoulder/hip masses | **Not** | `lions_day/lion_side.png` |
| Brief: head bob | **Unmeasurable** at this size | `lions_walk/walk_*.png` |
| Brief: side-pane Fresnel and dust | **Addressed** | `glass/side_shade.png`, `glass/rear_dust.png` |
| Brief: night beam pool | **Addressed** | `truck_night/hud.png` |
| Brief: gate timber | **Partly** — posts read as debarked poles, cabin boardwalls as grey weathered board; grain is not resolvable at 640 | `camp_day/camp_gate.png` |
| Brief: ground tile scale under the mess | **Addressed** | `camp_day/camp_mess.png` |
| Brief: worn paths | **Flat** — pale trodden lanes between the tents are in both rounds' frames; nothing new | `camp_day/camp_overhead.png` |
| Brief: crown lit/shade split, dusk translucency, night canopy ambient | Partly / Not / Addressed | `truck_day/forest.png`, `truck_dusk/forest.png`, `truck_night/forest.png` |

---

## 1 Hero car

Frames: `truck_{day,dusk,night}/{hero,front,rear,wheel,detail,interior,forest,road,mainroad}` (27 pairs).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Same cameras; the night hero now has three competing hot spots (bar, moon, bloomed star) where it had one. |
| 2 | Silhouette | 7 → 7 | Unchanged outline; rack, snorkel, spare, jerrycans all read at every hour. |
| 3 | Geometry | 7 → 7 | Not the round's subject; no new facets or gaps. Light bar pods (9 × 14-seg reflectors) still there in `truck_day/detail.png`. |
| 4 | Scale | 8 → 8 | Truck vs gate boom, chairs, lion: consistent. |
| 5 | **Materials** | 6 → 7 | Paint is now a **painted dielectric with a clear coat**: sun-side door in `truck_day/hero.png` carries a soft sky reflection and a specular rim; the dirt is a separate low layer on the sills rather than baked into every panel. The round-2 paint was a dirt-mottled matte. Bed cover is a stuffed PVC cover with humps between straps (`truck_day/rear.png`). Tyres are dusty rubber. Aluminium rack is a brushed alloy, not white. At night the bar cover is an emitter with no structure — see weakness 1. |
| 6 | **Texture quality** | 5 → 7 | Paint high-frequency noise halved: door paint `glass/side_shade` hf-std/mean 0.590 → 0.306, roof rail 0.525 → 0.422, rear panel 0.486 → 0.336 (at matched 320×180). What remains is grain and dust, not tiling. Interior is no longer one crackle texture: dash pad, door card and A-pillar each carry their own map (`truck_day/interior.png`, `truck_dusk/interior.png`). No visible seams on the bonnet or roof. |
| 7 | Glass / transparency | 6 → 6 | Scored in family 2; unchanged at this camera distance. |
| 8 | Lighting | 6 → 6 | Day and dusk correct for the hour. Night: the body is 0.6 st over the sky and the low-beam pool is on the road and legible in `truck_night/hud.png`; but the light bar is a 1.3 m white slab (weakness 1). Dusk grille: p95 Y 0.70 → 0.56, clipped fraction 23 % → 0 %; still 0.5 st over the dusk sky where it faces away from the sun — partly fixed, not fixed. |
| 9 | Shadows | 7 → 7 | Contact under tyres present at all three hours; day shadow soft edge ok. No acne seen on the body. |
| 10 | Reflections | 4 → 5 | Sky in the paint at last (`truck_day/hero.png` door, `truck_dusk/rear.png` tailgate carries the aureole). Chrome/alu is still flat. Mirror: family 2. |
| 11 | Color / atmosphere | 6 → 7 | Night no longer grey-blue: ground fg (28,20,21) hue 353 vs (40,34,36) hue 340 — darker than the sky (−0.25 st vs +2.0 st in R2), which is right for dirt under a moon. |
| 12 | Animation | — → — | Static frames. |
| 13 | Physics / ground contact | 8 → 8 | Tyres sit in their ruts; dust kicks from the rear wheels in `road`. |
| 14 | Detail density | 7 → 7 | Loom down the A-pillar, P-clips, recovery gear, buckles present. |
| 15 | Environmental integration | 7 → 7 | Sill dust matches the road colour. |
| 16 | Visual cleanliness | 6 → 5 | The bar bloom and the bloomed star are artefacts a player will see in the first night frame. Day and dusk are clean. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | `stats.json` hero: 542 → 488 draw calls, 1.93 M → 2.17 M triangles, 10 → 10 fps under SwiftShader; programs 168 → 174. Fewer calls, more triangles, same frame time. |

**Top three weaknesses**

1. **Roof light bar is a blown white slab at night.** `truck_night/hero.png` vs `shots/round2/truck_night/hero.png`. Box (215,35)–(335,110): pixels with Y > 0.5 **1 435** (R2: 53), Y > 0.7 **347** (R2: 2); the core row is a plateau at Y 0.69–0.72 for 60 px with 22 local maxima that are noise, not pods — in R2 the same row shows 6 real pod peaks at 0.4–0.5 between dark gaps. The 9 optics behind the cover are invisible. Cause in code: `src/vehicle/details.js` `lightBar()` puts one `lensClear` cover `hotSpot(gbox(1.30, 0.075, 0.012, 0.006), 0.55)` over all nine pods; `src/vehicle/index.js` `BEAM.night.lens = 2.2` drives `materials.lensClear.emissiveIntensity` and `src/vehicle/materials.js` `applyLampGlow(m.lensClear, { core: 7.0, bleach: 0.55, coreExp: 2.0 })` multiplies that over most of the aperture, so the whole 1.3 m cover sits above the night bloom threshold (`src/post.js` `GRADES.night.bloom.threshold = 2.0`) and bloom merges it. **Fix:** give the bar its own material key (`barCover`) so the headlamp clear lenses keep `lens: 2.2`; for `barCover` set night `emissiveIntensity` ≈ 0.5 and replace the uniform `hotSpot(…, 0.55)` weight with a nine-lobe mask — sum of `exp(-((x - x_i) / 0.03)^2)` at the pod x positions `(i - 4) * (1.32 / 9)` — written into the same vertex attribute `hotSpot` fills, so the cover glows *at the pods* and is dark between them. Keep the nine `headlight` discs at `head: 9.0`; they are what should bloom.
2. **Dusk front still brighter than the sky where it faces away from the sun.** `truck_dusk/hero.png`: grille box p95 Y 0.56 vs sky p95 0.45 (+0.3 st; R2 was 0.70 / 23 % clipped). `truck_dusk/front.png`: 32 % of the ground pixels bottom-right (rows 260+, cols 300+) are brighter than the sky (Y 0.374), p95 0.64, mean of those pixels (209,193,170) — R2 24 % / p95 0.61. Sand at 14° sun should sit under the aureole sky, not over it. Cause: `src/post.js` road wetness/SSR path (`uStrength`, `ssr: 1.0` in the dusk grade) puts a glossy lobe on dry sand and the dusk `exposure` is tuned to the hero. **Fix:** in `GRADES.dusk` set `ssr` to 0.35 and gate the wetness weight in the reflector shader (`weight = fres * glossy * facing * uStrength`) by the ground material's roughness so dry dirt (roughness ≥ 0.85) contributes zero; for the grille, drop `BEAM.dusk.lens` from 0.8 to 0.3 and `head` 3.6 → 2.4 — the dusk lamps are on but should not out-shine the sky.
3. **Mirror still shows nothing at `fast`.** `glass/mirror.png`: `see` 0.589 → **0.331**, `veil` 0.149 → **0.215** (metrics.json), and to the eye it is a blue-to-sand gradient with a smear where the road should be. `src/vehicle/mirrors.js` `liveMirrorsWanted()` returns false unless quality is `high`/`ultra`; at `fast` the pane is "flat metal on the scene's PMREM". **Fix:** allow a live mirror at `fast` with `RT_W × RT_H` = 96 × 64 and an update every 3rd frame (`createLiveMirrors(…, { quality })` already fits the reflection camera's frustum to the pane, so the cost is one small render); if that is refused, at least sample the PMREM with the pane's reflected view vector in a custom `onBeforeCompile` so the horizon line in the glass matches the horizon behind the truck.

**Regressions:** Visual cleanliness 6 → 5 (night bar bloom; `truck_night/hero.png`, 1 435 px > 0.5 vs 53). One point; does not trip the gate. Nothing else in this family drops.

**Must not regress:** painted-dielectric paint with sky reflection (`truck_day/hero.png`); halved paint noise (hf-std/mean 0.31–0.42); per-surface interior textures (`truck_day/interior.png`); tyre contact and ruts at all hours; night body legible over a genuinely dark sky; draw calls 488 on the hero.

---

## 2 Car glass

Frames: `glass/{ws_close,ws_mid,side_sun,side_shade,rear_dust,interior,int_side,mirror,dusk_ws,night_ext,night_int,moving,sheet}` (13 pairs) + `metrics.json`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Same rig; now 640×360 so panes are actually inspectable. |
| 2 | Silhouette | 7 → 7 | Pane edges and rubbers read. |
| 3 | Geometry | 7 → 7 | Frame/rubber/pane thickness visible on `side_sun`; no z-fight on the door seal. |
| 4 | Scale | 8 → 8 | |
| 5 | **Materials** | 6 → 7 | Glass is a **thin dielectric with a Fresnel rim and a dust film**: `side_shade` shows a low-angle sky sheen that dies toward the centre; `rear_dust` is a dust film on glass (see-through 0.873, veil 0.103, fine grain hf-std/mean 0.675 vs 0.847) rather than a brown card. Tint is neutral-green; interior view through the windscreen is tinted, not grey. |
| 6 | **Texture quality** | 5 → 6 | Dust film grain no longer coarse pixel noise (rear glass hf 0.85 → 0.68); windscreen has no visible tiling. The dust is still uniform across the pane — no wiper arcs, no denser lower band where dust settles. |
| 7 | **Glass / transparency** | 6 → 6 | Tool numbers: `see` fell on every daytime pane (ws_close 0.881 → 0.867, ws_mid 0.850 → 0.787, side_sun 0.716 → 0.670, side_shade 0.743 → 0.678, interior 0.834 → 0.789, moving 0.845 → 0.759); `veil` rose 0.01–0.03 on each. To the eye that is the Fresnel and dust doing their job at the price of see-through — the pane finally *has* a surface. Night panes improved (night_int see 0.902 → 0.921, veil 0.003). No sorting faults, no hot pixels (`hot` 0 everywhere, `clipPct` 0). Net: same score; better material, less window. |
| 8 | Lighting | 6 → 6 | Dusk windscreen holds the aureole without clipping (`dusk_ws` peak 0.864, was 0.891). |
| 9 | Shadows | 6 → 6 | Pillar shadow across the dash correct. |
| 10 | Reflections | 4 → 5 | A real horizon reflection on `side_sun` and `ws_close`; mirror still a gradient (weakness 3 above) — this is what holds the score at 5. |
| 11 | Color / atmosphere | 6 → 7 | Hero glass tint consistent between exterior and interior views (`glass/ws_close` vs `glass/interior`); dusk pane carries the aureole colour without going cream. |
| 12 | Animation | — → — | `moving` flick 0.098 → 0.099: unchanged. |
| 13 | Physics / ground contact | — → — | |
| 14 | Detail density | 6 → 6 | Rubbers, clips; no wiper streaks, no chips. |
| 15 | Environmental integration | 6 → 7 | Dust on the rear glass matches the tailgate dust. |
| 16 | Visual cleanliness | 7 → 7 | No sparkle, no sorting. |
| 17 | Temporal stability | 6 → 6 | `flick` unchanged on all panes. |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Mirror reflects nothing at `fast`** — `glass/mirror.png`, `see` 0.331 / `veil` 0.215, worst pane by a wide margin. Fix as in Hero car weakness 3 (`src/vehicle/mirrors.js` `liveMirrorsWanted`, `RT_W/RT_H`).
2. **See-through fell 0.05–0.09 on every daytime pane** — `glass/ws_mid.png` see 0.850 → 0.787, veil 0.096 → 0.113; `glass/moving.png` see 0.845 → 0.759. In the frame the cowl through the glass is milkier than it should be at that angle (the Fresnel term is not angle-gated enough). Fix: in `src/vehicle/materials.js` the `glass`/`glassSide` `MeshPhysicalMaterial` — lower `specularIntensity` (or the custom Fresnel gain) by ~30 % and let `roughness` on the pane stay at 0.04 so the reflection sharpens rather than veils; keep the dust in `roughnessMap` alpha, not in the base colour.
3. **Dust is uniform across each pane.** `glass/rear_dust.png`, `glass/side_shade.png`: the film has the same density at the top rail as at the sill. Fix: in `src/textures/vehicle.js` the glass dust map — multiply by `smoothstep(0.2, 1.0, v)` so dust settles toward the lower edge, and on the windscreen cut two wiper arcs (`1 - smoothstep(r - 0.02, r, dist)` about the pivot points) from the same map.

**Regressions:** none by a point. (`see` down on six panes is a tool number; the visible pane reads better as a material.)

**Must not regress:** dust-film rear glass; Fresnel rim on side glass; zero hot pixels and zero clip on every pane; night glass (night_ext see 0.927, veil 0.018).

---

## 3 Fleet

Frames: `fleet/{camper,expedition-truck,motorcycle,pickup,ranger,safari-jeep_0/1/2,supply-truck,suv,trailer,utility}_0_{day,night}` (24 pairs).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | Same rig. Trailer still framed inside its wheel arch (tool: bounding sphere inflated by the hitch pole; the consensus said re-shoot — it was not). |
| 2 | Silhouette | 6 → 7 | Motorcycle wheels round (`wheelProto` 28 segments on the 34 cm tyre, `src/vehicles/parts.js`); safari jeep roll cage clean against the hills. |
| 3 | Geometry | 6 → 7 | 12-segment moto wheels gone (`fleet/motorcycle_0_day.png`, crop at 4×: no visible facets on the rim). |
| 4 | Scale | 7 → 7 | Pickup vs hero truck vs person-sized props consistent. |
| 5 | **Materials** | 5 → 6 | Fleet paint is the same painted dielectric family as the hero (pickup bonnet sky sheen); canvas on the safari jeeps is matte cloth (roughness 1); the supply truck's tarp is a poly tarp (`m.tarp`, roughness 0.7) and reads glossier than the canvas beside it, correctly. Chrome is still flat grey. |
| 6 | **Texture quality** | 5 → 6 | Wear pass (`src/vehicles/wear.js`) puts dust on sills and a dirt fade on the lower third; no tiling seen. Lettering on the ranger is soft at this resolution (not penalised). |
| 7 | Glass / transparency | 5 → 6 | Ranger and utility windscreens: at this rig's camera the pane shows the cab interior and the plain behind in **both** rounds (`fleet/ranger_0_day.png` pane box (270,135)–(400,180) hue 38° → 39°, sat 0.44 → 0.41; `utility` 33° → 33°). No magenta in the candidate; none visible in the incumbent frame either, so the consensus item cannot be confirmed closed from these frames — it needs a frame with the sky in the pane. Fleet glass otherwise carries the hero's Fresnel and dust. |
| 8 | Lighting | 4 → 6 | Night: markers/parking lamps on a few vehicles, no ground pools under unlit lamps (`fleet/pickup_0_night.png`), a warm lantern near the row in `camp_night/camp_arrive_night.png`. Row still dim as a whole — the camp lanterns reach the near two vehicles only. |
| 9 | Shadows | 7 → 7 | Day contact shadows under every vehicle. |
| 10 | Reflections | 4 → 5 | Sky in fleet paint; chrome still nothing. |
| 11 | Color / atmosphere | 4 → 7 | Fleet day hills: pickup hill sat 0.44 → 0.18, cream band 1.35 → 1.05 of sky; night sky 2.15 % → 0.15 % over 0.35 luma. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 7 → 7 | Tyres on the ground; trailer jockey wheel touches. |
| 14 | Detail density | 6 → 6 | Roof loads, jerrycans, spare on the jeeps. Same as R2. |
| 15 | Environmental integration | 6 → 7 | Sill dust now the plain's colour; vehicles no longer sit on a pool of their own light at night. |
| 16 | Visual cleanliness | 6 → 7 | Night sky clean; no snow. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Cream band under the pickup's hill still brighter than the sky.** `fleet/pickup_0_day.png`: band (161,156,154) Y 0.340 vs sky above the ridge Y 0.323 → +0.07 st (R2 +0.43 st). The band is the far plain between the forest's straw skirt and the hill foot, fogged at the plain fog density toward the airlight (`src/terrain.js`, far-plain haze chunk under `buildFarHills` — the "plain tint … 0.56" term). Fix: clamp the far-plain fogged colour to `min(plainCol, skyAtHorizon * 0.9)` in `hazeChunk` (the sky's patched chunk already carries the view vector), so nothing on the ground can exceed the sky it meets.
2. **Trailer night plate framed inside its wheel arch.** `fleet/trailer_0_night.png` (and day). Tool defect carried over: `tools/fleetshots.mjs` sizes from the kind's bounding sphere, which the hitch pole inflates. Fix in the tool: compute the sphere from the body pieces only (exclude `hitch`/`jockey` tagged pieces) or fit the camera from the OBB of the box, not the sphere. Not scored.
3. **Chrome and polished alloy are flat grey.** `fleet/suv_0_day.png` bumper, `fleet/camper_0_day.png` wheel trims: no environment in the metal (mean sat 0.03, no gradient across the curve). Fix: `src/vehicles/materials.js` `chrome`/`alu` — `metalness 1`, `roughness 0.12`, `envMapIntensity` ≥ 1.4 and make sure the fleet materials receive the scene PMREM (the hero's do; the fleet's brushed alloy looks like it does not).

**Regressions:** none.

**Must not regress:** see-through ranger/utility panes; 28-segment moto wheels; no light pools under unlit lamps; desaturated fleet-frame hills; clean night sky.

---

## 4 Campground

Frames: `camp_day/{arrive,beyond,gate,interior,mess,overhead}`, `camp_night/{arrive,fire,gate,mess}` (10 pairs).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Same cameras. `camp_interior` is the truck cab at the gate, not a camp frame (tool). |
| 2 | Silhouette | 7 → 7 | Mess roof, lookout, cabin gables read. |
| 3 | Geometry | 6 → 6 | Canvas roofs sag and belly (`gable(… sag, belly, wrinkle)` in `src/campground/structures.js`); chairs are still four sticks and a plane. |
| 4 | Scale | 7 → 7 | Chairs vs tables vs truck consistent. |
| 5 | **Materials** | 6 → 7 | Canvas is **matte cloth with transmission**: the mess fly is lit from above and shows a warm glow on its underside (`CANVAS_TRANSMIT 0.13`, `canvasTranslucency`), stains in the sag lines. Cabin boardwalls are grey weathered board (`timberMaps('grey')`); the gate posts are darker debarked poles — two timbers, correctly different, though neither shows grain at 640. Ground is a laterite: red-brown (hue 22–24°, sat 0.60) with darker compacted centres in the paths. The poly tarp on the store reads as plastic beside the canvas — correct. |
| 6 | **Texture quality** | 5 → 6 | Mess ground tile scale now reads as gravel/dirt at the right scale (no repeat visible in `camp_mess`). Worn paths in `camp_day/camp_overhead.png` are pale trodden lanes between the tents, the same in both rounds. Canvas weave is soft at 640 but not blurred to flat. |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 4 → 6 | Shade under the mess 2.4–2.6 st → **1.2–1.5 st** at the floor; chairs readable. Night: the pad is no longer a snowfield (pad (54,52,58) Y 0.037 = +2.1 st over the sky → (23,20,22) Y 0.008 = −0.4 st under the sky). Fire light has visible inverse-square falloff. |
| 9 | Shadows | 4 → 6 | The black slab is gone. Edge still 10 px hard for a 6 m fly at 25 m; darkest floor under the tables Y 0.03–0.06 (2.7–3.7 st) — the hemisphere ground term is not reaching in under furniture. |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 5 → 6 | Night camp blue-grey gone. Firelit ground over-saturated (weakness 1). Day hills behind `camp_beyond` now level with the sky (1.02) — a pale wall, not a ridge. |
| 12 | Animation | 5 → 6 | Flames have core tongues and rising tongues (`fire.js` `FLAME_MOTION`), smoke rises; still 152 px > 0.5 in the flame box — it is a small fire for a camp of this size. |
| 13 | Physics / ground contact | 7 → 7 | Chairs and tables sit on the ground; poles planted. |
| 14 | Detail density | 7 → 7 | Same kit: lanterns, crates, jerrycans, sign, radio mast. |
| 15 | Environmental integration | 6 → 7 | Dust on tent skirts, canvas stains in the sag lines, night pad in the same darkness as the plain. |
| 16 | Visual cleanliness | 5 → 7 | No snow sky, no black slab. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Firelit dirt is over-saturated.** `camp_night/camp_fire_night.png`: ground within ~3 m of the pit (137,69,38) hue 19° sat **0.72** Y 0.119; foreground dirt 8 m off (87,49,36) sat **0.58** (R2 0.55 / 0.38). Laterite under a 1 900 K flame should go to orange-brown, not to a saturation clamp; sat 0.72 is a colour that has run out of green and blue. Fix: `src/campground/fire.js` fire `PointLight` colour — desaturate from the flame colour toward (1.0, 0.72, 0.45) and raise `decay` to 2 with `distance` ~14 m; and in `src/post.js` `GRADES.night.grade` lower `saturation` (it is pushed up on purpose — the comment says so) or exclude the fire layer from the saturation push.
2. **Shade floor under the tables goes 2.7–3.7 st down, edge 10 px.** `camp_day/camp_mess.png` rows 215–230, x 220–260: 0.45 → 0.15 → 0.05. The 1.5-st shade is only the open floor. Fix: `src/sky.js` day `hemi: { sky: 0x93a9c2, ground: PALETTE.bounce, intensity: 2.5 }` — the ground colour is right but the canopy's cast shadow removes the sun *and* most of the sky; add a `shadow.radius` of 4–6 on the day `DirectionalLight` for the camp cascade so the 6 m fly gets a real penumbra, and give the mess pad a local bounce (`src/campground/lights.js` anchors) — a warm `HemisphereLight`-like fill of ~0.6 under the fly by day so tables do not carve black.
3. **`camp_beyond` hill is level with the sky.** `camp_day/camp_beyond.png`: hill (147,159,179) Y 0.344 vs sky 0.338 → 1.02; left ridge 0.94. Fix: `src/terrain.js` `buildFarHills` haze — the blend "runs to 0.62 by the crests"; cap the fogged hill colour at 0.9 × the sky sample at that pixel (`min(hillCol, sky * 0.9)` in the far-hill fragment after the haze mix) so a hill can approach the sky but never meet it.

**Regressions:** none.

**Must not regress:** 1.2–1.5 st mess shade with readable chairs; night pad darker than the sky; canvas transmission; trodden lanes in `camp_overhead`; fire with real falloff.

---

## 5 Road & terrain

Frames: `truck_*/{road,mainroad,forest}`, `lions_day/lion_far.png`, `camp_day/camp_beyond.png`, `fleet/*_day` backgrounds (≈ 24 pairs bearing on it).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 2 | Silhouette | 6 → 7 | Ridge lines no longer a hard cut against the sky; macro two-tone on the mid hills (`uHillMacro`). |
| 3 | Geometry | 6 → 6 | Ruts, washboard as slope; waterhole still a flat disc with a stepped edge (`lions_day/lion_pride.png`). |
| 4 | Scale | 7 → 7 | |
| 5 | **Materials** | 6 → 7 | Road is **compacted laterite**: darker centre in the ruts, lighter crowns, loose sand at the verge; the trail at night behaves as a dry surface (no false wet sheen) except the dusk `front` patch. Soil hue 22° sat 0.61 (R2 23° / 0.60) — the soil did not change colour; the hills stopped making it look pink. |
| 6 | **Texture quality** | 5 → 6 | Mid-ground road tile repeat much less visible in `truck_day/mainroad.png` (macro variation at 460 m); still a faint period in the verge sand at ~40 m in `truck_day/road.png`. Hill-face "dark spots" 1–2° across from the bush speckle — still there at low contrast in `lion_far`. |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 6 → 6 | Night road darker than the sky (correct); dusk ground patch brighter than the sky (wrong; hero weakness 2). |
| 9 | Shadows | 6 → 6 | Tree shadows on the road present; ruts have AO. |
| 10 | Reflections | 5 → 5 | Wet-rut reflector at night reads; by day the SSR puts gloss on dry sand. |
| 11 | **Color / atmosphere** | 3 → 6 | Cobalt gone: hill sat 0.42 → 0.21 (mainroad), 0.36 → 0.19 (lion_far), 0.44 → 0.18 (pickup). Value still wrong on sun-facing crests (1.11–1.24 of sky) and too dark on backlit ones (0.57). Bands: 1.35 → 1.05 in the worst case. Three points up; not the last three. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 7 → 7 | |
| 14 | Detail density | 6 → 6 | Verge litter, stones; same as R2. |
| 15 | Environmental integration | 6 → 7 | Hills now in the same air as the plain. |
| 16 | Visual cleanliness | 5 → 6 | No hard fog wall at the far plane; a faint horizontal step where the far-plain mesh meets the hill foot in `pickup_0_day` (the 1.05 band). |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | `mainroad` 2.59 M → 2.96 M triangles, 601 → 620 calls, 15 → 15 fps. |

**Top three weaknesses**

1. **Sun-facing crests brighter than the sky.** `truck_day/mainroad.png` left ridge 1.12 (both rounds), `lions_day/lion_far.png` right ridge 1.24 (both), `fleet/pickup_0_day.png` right ridge 1.01 → 1.11. Consensus target 0.72–0.92. The haze mix is a blend of the lit albedo toward the airlight, and the lit albedo under a 58° sun is already brighter than the horizon sky; blending toward a bright airlight can only push it up. Fix: `src/terrain.js` `buildFarHills` fragment — after the haze mix, `col = min(col, skySample * 0.9)` where `skySample` is the sky shader's colour for the same view vector (the hazeChunk already carries it); and reduce the sunlit scrub albedo term (the comment names "a real scrub value (0.06)") so the lit face starts under the sky instead of relying on the clamp.
2. **Backlit ridge too dark.** `lions_day/lion_far.png` left: 0.57 of sky (target ≥ 0.72). Same shader, opposite sign: the shadowed face only gets the 0.62 haze blend. Fix: raise the haze fraction for faces with `dot(n, sunDir) < 0` — `hazeK = mix(0.62, 0.80, shadowSide)` — so backlit hills scatter more, which is what real distant hills do.
3. **Waterhole is a flat disc with a stepped edge.** `lions_day/lion_pride.png`, `lions_dusk/lion_pride_dusk.png`: the rim is a dark ring 2–3 px wide with a visible polygonal step; no wet margin, no reflection of the kopje. Fix: in the waterhole geometry (`src/terrain.js`, the kopje/pride composition near line 2474) raise the ring segments to ≥ 48, add a 0.6 m wet-mud annulus with roughness 0.35 and the plain's albedo × 0.6, and put the water plane on the SSR layer post.js already runs for the ruts.

**Regressions:** none.

**Must not regress:** hill saturation ≤ 0.21; hills in the plain's air; night road under the sky; laterite ruts.

---

## 6 Vegetation

Frames: `truck_*/forest`, `truck_day/hero`, `lions_day/{pride,far,medium}`, `lions_dusk/*`, `camp_day/*` (≈ 20 pairs bearing on it).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 6 → 6 | Acacia crowns still card-flat at the rim in `truck_dusk/forest.png`. |
| 3 | Geometry | 5 → 5 | Cards; trunks cylinders. Not this round's subject. |
| 4 | Scale | 7 → 7 | |
| 5 | **Materials** | 5 → 6 | Leaves are thin dielectrics by day (a lit/shade split across the crown in `truck_day/forest.png` — the round-2 crown was one flat green); grass is dry straw with per-plant hue jitter (`forest.js` ~3396). Dusk crowns are still opaque cut-outs: no transmission with the sun behind them (`truck_dusk/forest.png`, crown mean (52,44,30), no lit rim). |
| 6 | **Texture quality** | 5 → 6 | Tuft cards no longer one green; card alpha edges clean at 640. |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 5 → 6 | Night canopies are present and dark, not missing (`truck_night/forest.png`, big acacia box (340,40)–(460,72): crown Y 0.0036 = **−1.0 st** under the sky (13,19,39); in R2 the same box is Y 0.0047, −0.4 st, because most of it is sky seen through a canopy that is not there — the tree is a pale skeleton of branches). |
| 9 | Shadows | 6 → 6 | Tree shadows on the road. |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 5 → 6 | Straw plain, grazed khaki ring, green only where drainage says so. |
| 12 | Animation | — → — | Static frames. |
| 13 | Physics / ground contact | 6 → 6 | Tufts rooted; no floating cards seen. |
| 14 | **Detail density** | 4 → 5 | The pride plain is still bald in the foreground: ~10 tufts in the near 45 % of `lions_day/lion_pride.png` (R2 ~8, R1 ~30). The lawn is `1 - smoothstep(7, 11, lionD)` (`src/forest.js` ~3255) and the pride camera stands inside 11 m, so the whole near ground is inside the lawn. Outside the lawn the plain is much better: `lions_day/lion_seat.png` and `lion_medium.png` now have a waist-high straw belt across the mid-ground where R2 had bare dirt; `truck_day/hero.png` verge density is fine. |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Pride plain still bald.** `lions_day/lion_pride.png`, `lions_dusk/lion_pride_dusk.png`, `lions_walk/lion_far.png`: bare dirt from the camera to the kopje. Fix: `src/forest.js` pride patch — `lawn: 1 - smoothstep(4, 7, lionD)` (was 7, 11), and make the grazed ring "knee-high" tufts at the *same count* actually render (they are described but the frame shows bare ground) — check the `lawn` term is not also multiplying the ring's instance count to zero.
2. **Dusk crowns opaque.** `truck_dusk/forest.png`, `lions_dusk/lion_close_dusk.png` background: crowns with the sun behind them show no transmitted light; rim = interior. Fix: the crown card material in `src/forest.js` — add a transmission term in `onBeforeCompile` like the canvas one in `src/campground/materials.js` (`uTransmit` ≈ 0.25 × leaf colour × `max(0, -dot(n, sunDir))`), gated by `aCrown` so only the outer shell glows.
3. **Crown lit/shade split is coarse.** `truck_day/forest.png`: the split is a top/bottom gradient per crown (`crownWeight`), so every acacia is lit on top and dark below regardless of sun azimuth; the side facing the sun is not brighter than the side away from it. Fix: feed the canopy-shell normal (`forest.js` line 39 already assigns shell normals) into the diffuse term at full weight instead of the `aCrown` gradient, and keep `aCrown` only for the AO term.

**Regressions:** none.

**Must not regress:** night canopies dark not missing; day crown split; straw plain with jitter; clean card edges.

---

## 7 Lions

Frames: `lions_day/{close,face,far,medium,pride,seat,side}`, `lions_dusk/{close,medium,pride}`, `lions_walk/{lion_close,lion_medium,lion_far,lion_seat}` (14 pairs).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | **Silhouette** | 4 → 5 | Ears smaller and set on the upper corners (`headspec.js`: "ears 0.25 L by 0.2 L"); the skull is a tall box, which is at least not a bear's dome. Shoulder and hip masses still absent in `lion_side.png` — the back is one straight cylinder from neck to tail root. |
| 3 | **Geometry** | 4 → 5 | The muzzle is a separate box lofted onto the skull: in `lion_face.png` (crop 4×) there is a vertical crease at the cheek where the muzzle rows meet the zygomatic rows, and the brow is a flat plane. Legs are cylinders with a ball at the elbow. Paws: three toes now read in `lion_close.png`; still black-soled boots from the side. |
| 4 | Scale | 7 → 7 | Lion vs truck door ≈ 1.1 m at the shoulder; right. |
| 5 | **Materials** | 4 → 5 | The coat is a **dyed suede** — a matte, evenly lit skin with a faint mottle (flank hf-std/mean 0.389, unchanged from 0.403) and a hair-direction normal (`coatNormal`, "kept mild") that does not show at this camera. Fur should break the sun at the silhouette (a lit rim, an anisotropic sheen along the flank); here the rim is the same value as the interior, so the lion reads as a plush toy: a smooth skin over rounded boxes. Nose leather is wet-dark and correct. Eyes are amber glass with a lid and a highlight — back, and good. |
| 6 | **Texture quality** | 5 → 5 | Coat atlas has no seam I can find; but the face texture is *smoother* than the body (face hf 0.150 → 0.122 vs flank 0.39), so the head reads as a different, plastic material. Whisker dots painted, not modelled — fine at 640. |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 6 → 6 | Correct hour; no far-cascade acne seen on the neck in `lion_medium.png` this round. |
| 9 | Shadows | 4 → 6 | **Contact blobs under every lion** (`contact.js`), penumbra beyond the silhouette; `lion_medium.png` shows a real dark patch under the belly and paws. |
| 10 | Reflections | 2 → 5 | Eye highlight and an amber iris with a dark pupil (`lion_face.png`). Nose specular. |
| 11 | Color / atmosphere | 6 → 6 | Coat hue 24–27° sat 0.60–0.64 — a tawny, not orange. |
| 12 | Animation | — → — | Static poses; gait in family 8. |
| 13 | Physics / ground contact | 6 → 7 | Lying lions press the grass (contactPoints push); seated lion's haunches on the ground. |
| 14 | Detail density | 5 → 6 | Whisker pads, lids, nose leather, toes; no tail tuft detail, no mane on the male (if one is intended). |
| 15 | Environmental integration | 5 → 6 | Contact shadow and grass push do most of this. |
| 16 | Visual cleanliness | 6 → 6 | Cheek crease is the one visible seam. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Plush-toy coat: no fur response at the rim.** `lions_day/lion_close.png` (crop 4×): the flank shades like a matte sphere — one smooth Lambert fall-off from the dorsal line to the belly, no lift where the outline meets the background and no velvet darkening at grazing angles; the mottle is the same amplitude at the rim as at the centre (flank hf-std/mean 0.389, R2 0.403). A furred animal in a 58° sun has a rim 0.5–1 st brighter where hair catches the light behind the silhouette. Fix: the coat material in `src/wildlife/lion/textures.js` / lion material setup — add a sheen term (`MeshPhysicalMaterial.sheen = 0.6`, `sheenRoughness = 0.7`, `sheenColor` = coat × 1.3) which is Three's cloth/fur lobe, and raise `coatNormal`'s strand amplitude (`strand` fbm at line 685 is "kept mild") so the anisotropy shows at 640; keep `roughness` 0.9 so nothing goes glossy.
2. **Muzzle box welded to the skull.** `lions_day/lion_face.png`: a vertical crease from the eye's outer corner down the cheek where the muzzle loft meets the zygomatic loft, and a flat brow plane between the eyes. Fix: `src/wildlife/lion/headspec.js` rows — blend the "root of the muzzle" row (`[0.215, 0.022, 0.073, …]`) with the brow row (`[0.165, 0.046, 0.106, …]`) by inserting one intermediate row at 0.19 with widths interpolated at 0.6/0.4 and a `topTaper` between the two, and smooth the loft normals across that row (`computeVertexNormals` after merging the two lofts rather than per loft).
3. **No shoulder or hip mass.** `lions_day/lion_side.png`: dorsal line is straight from withers to sacrum; the scapula does not rise over the ribcage, the thigh is a cylinder. Fix: `src/wildlife/lion/geometry.js` body loft — add +0.04 L to the dorsal radius at the scapula station and a lateral bulge of 0.06 L on the thigh rows, and a saddle dip of −0.02 L behind the withers.

**Regressions:** none. Every scored category is flat or up.

**Must not regress:** amber eyes with lids and highlight; smaller ears on the skull corners; contact blobs under every lion; three-toed paws; grass push under lying lions.

---

## 8 Lion feet & gait

Frames: `lions_walk/walk_00..07` (8 pairs), plus `lions_walk/lion_close.png` for the foot.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | World-fixed camera; the lion crosses right-to-left in both. |
| 2 | Silhouette | 5 → 5 | Legs as sticks in mid-swing (`walk_03`). |
| 3 | Geometry | 5 → 5 | Elbow/stifle a hinge ball. |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | — → — | See family 7. |
| 6 | Texture quality | — → — | |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 6 → 6 | |
| 9 | Shadows | 4 → 6 | Contact blob travels with the lion and darkens under the planted feet. |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 6 → 6 | |
| 12 | **Animation** | 5 → 6 | Centroid travel over 8 frames 304 → 258 px (R2, 46 px) vs 302 → 245 px (R4, 57 px): stride up 24 %. Foreground pixel count swings 7 530 → 3 300 → 7 183 as the legs pass through (R2 7 130 → 3 442 → 6 644) — the leg swing is still a scissors; elbow flexion is visible in `walk_03`/`walk_04` (a pastern lean, `pose.js` swing-phase shaping) but the stifle barely breaks. Head bob not measurable at this size. Tail: sway present (`TAIL_SWAY`, `TAIL_PITCH_SWAY`) — the tuft changes x by 6–9 px between frames; no longer a rod. |
| 13 | **Physics / ground contact** | 5 → 6 | Planted feet hold their pixel: foot cluster at x 267–285 present in `walk_02` through `walk_07` (six frames, same 18 px), and 256–286 in `walk_00`/`walk_01`/`walk_05`; R2's longest hold was 289–311 for three frames then 297–307 for three. Lowest row 192–194 in every frame (R2 193–196). No sinking, no float. One flicker: a 5-px cluster at x 336–341 is present in `walk_01` and `walk_03` and absent in `walk_02` — a toe clipping in and out of the ground. |
| 14 | Detail density | 5 → 5 | |
| 15 | Environmental integration | 5 → 6 | Blob and grass push. |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | **Temporal stability** | 5 → 6 | Planted-foot pixel jitter ≤ 1 px on the held cluster across six frames (R2 ≤ 2 px over three). |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Stride still short and the swing is a scissors.** `lions_walk/walk_02.png` → `walk_05.png`: 57 px of body travel over 8 frames for a lion ~230 px long is 0.25 body lengths — a walking lion covers ~0.6 body lengths per stride cycle. Fix: `src/wildlife/lion/pose.js` — raise the stride length parameter that sets foot placement ahead of the hip (the swing shaping in "Swing-phase shaping of the leg" uses progress `u`; the reach amplitude feeding it needs ×1.6) and lower the stride frequency to match so the feet do not skate.
2. **Stifle does not flex.** `walk_03.png`, `walk_04.png` crop: the hind leg swings as a straight strut from hip to paw; the hock stays at one angle. Fix: `pose.js` swing shaping — add a stifle flexion curve `sin(pi u) * 0.55 rad` on the hind `stifle` bone and hock counter-flex `-0.35 rad`, peaking at u 0.45; the fore leg already has the pastern lean.
3. **Toe clip in `walk_01`/`walk_03`.** The 336–341 px cluster is a paw whose sole sits 1–2 cm under the ground and pokes through; `feet.js` planting resolves the heel, not the toe. Fix: in `src/wildlife/lion/feet.js` sample the ground at the toe (`+0.12 L` ahead of the ankle) as well as the heel and take the max height for the planted foot.

**Regressions:** none.

**Must not regress:** six-frame planted hold at ±1 px; lowest row constant 192–194; contact blob travelling with the lion; tail sway.

---

## 9 Lighting & atmosphere

Frames: `truck_{day,dusk,night}/*`, `camp_night/*`, `lions_dusk/*`, `glass/{dusk_ws,night_ext,night_int}` (≈ 40 pairs bearing on it).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | Night hero has three hot spots (bar, moon, bloomed star) pulling the eye off the truck. |
| 2 | Silhouette | — → — | |
| 3 | Geometry | — → — | |
| 4 | Scale | — → — | Moon has a detailed disc (`moonDetail 1.0`) inside a 52-px halo (blob (47–99, 39–89)); the disc reads as a moon, the halo is bloom, not sky scatter. |
| 5 | Materials | — → — | |
| 6 | Texture quality | 5 → 7 | Star field: 553 → 56 blobs over 0.35 in the hero sky, median 1 px, the sparse grid gives a handful of first-magnitude points (`starGrid(o + 7.3, px, 72.0, …, 1.1, 3.0)`); Milky Way a smooth band with a dust lane (`band`, `lane`, `cloud` in `sky.js`), not a dot field. |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 5 → 6 | Day key and hemisphere correct; dusk aureole in the right place and the far half of the sky carries the earth's shadow; night: moon key, blue sky (13,19,39), ground darker than sky, low-beam pool on the road. Held back by: the bar slab, and dusk ground brighter than the sky. |
| 9 | Shadows | 6 → 6 | Day shadow softness fine; no acne on the lion neck this round. |
| 10 | Reflections | 5 → 5 | |
| 11 | **Color / atmosphere** | 3 → 6 | The three-point drop of round 2 is recovered: no cobalt hills (sat ≤ 0.21), no snow sky, no grey-blue night pad; dusk palette coherent. Not higher because sun-facing crests still exceed the sky (1.11–1.24) and the fire is a saturation clamp (0.72). |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | — → — | |
| 14 | Detail density | 6 → 7 | Milky Way structure, moon detail, a Belt of Venus at dusk (`truck_dusk/rear.png` rose band opposite the sun). |
| 15 | Environmental integration | 5 → 6 | Hills and plain in the same air. |
| 16 | **Visual cleanliness** | 3 → 5 | Snow gone (+). New: bloomed star at (177–195, 61–79) in `truck_night/hero.png`, 259 px over 0.35 with no core — a soft ball that reads as a lens smudge; bar bloom 5 582 px. Two artefacts in the first night frame. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | Night hero 584 → 535 calls, 11 → 10 fps; programs 169 → 175. |

**Top three weaknesses**

1. **Light bar bloom** — see Hero car weakness 1 (`BEAM.night.lens 2.2`, `hotSpot(…, 0.55)`, `applyLampGlow core 7.0`, `GRADES.night.bloom.threshold 2.0`). This is the lighting family's defect too because it is what keeps 10.4 % of the sky over 0.35.
2. **A first-magnitude star blooms into a ball.** `truck_night/hero.png` (177–195, 61–79): peak Y 0.54, 259 px over 0.35, Gaussian profile with no point core — the sparse grid's `hi = 1.1` × `uStars` × exposure 1.15 lands over the 2.0 bloom threshold for the brightest cells. Fix: `src/sky.js` line 132 — `starGrid( o + 7.3, px, 72.0, 0.05, 0.08, 0.8, 3.0 )` (hi 1.1 → 0.8), or clamp `sf = min( sf, vec3( 1.5 ) )` before `col += ( sf * uStars + way ) * gate;` so no star can cross the night bloom threshold. A star may be bright; it may not be a ball.
3. **Firelight saturation** — see Campground weakness 1 (`fire.js` PointLight colour/decay; `GRADES.night.grade` saturation push applied to the fire layer).

**Regressions:** none by a point. Visual cleanliness is up from 3 to 5, not to the 6 of round 1, because of the two night artefacts above.

**Must not regress:** 0.13 % star-field fraction over 0.35 with 1-px median blobs; Milky Way as a band; night ground under the sky; dusk aureole and Belt of Venus; hill saturation.

---

## 10 HUD

Frames: `truck_{day,dusk,night}/hud.png` (3 pairs).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 7 | Chase camera now seven metres back on the road at all three hours (the `rig.snap()` fix holds); title top-left, hints bottom-left, speed bottom-right. |
| 2 | Silhouette | — → — | |
| 3 | Geometry | — → — | |
| 4 | Scale | 7 → 7 | Type size right for 640. |
| 5 | Materials | — → — | |
| 6 | Texture quality | 7 → 7 | Crisp text. |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | — → — | |
| 9 | Shadows | 6 → 7 | Text shadow layer holds over sunlit dirt in `truck_day/hud.png` (hints legible over the pale road). |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 6 → 7 | Night hints dimmed (`truck_night/hud.png` hint block, rows 88–97 %, cols 2–32 %: glyph highlights p99 Y 0.197 → 0.116, −0.76 st; pixels over 0.05 luma 7.5 % → 3.6 %; the day block's p99 is 0.47). The block no longer competes with the lamp pool and is still legible. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | — → — | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 6 → 7 | |
| 16 | Visual cleanliness | 6 → 7 | No overlap, no clipping of the build stamp. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Night hints are at the edge of legibility on a 640 frame.** `truck_night/hud.png`: glyph highlights p99 Y 0.116 over a ground at Y ~0.01 — 3.5 st of contrast on the brightest strokes, but the median hint pixel sits at 0.011, i.e. most of the stroke is at the ground's level; readable here, marginal on a dim monitor. Fix: `src/hud.js` night opacity — floor the hint alpha at 0.45 rather than the current value (it reads as ≈ 0.3) and keep the deeper dimming for the title only.
2. **Speed readout has no unit weight hierarchy.** `47 km/h`: the unit is the same weight as the number. Fix: `src/hud.js` speed style — unit at 0.55 × size, 70 % alpha.
3. **Hint row wraps to two lines at 640.** `truck_day/hud.png`: `CLICK VIEWS · DRAG LOOK · WASD DRIVE` then `C CAMERA · P PHOTO · N TIME · L LIGHTS`, then `H HORN` alone on a third line. Fix: `src/hud.js` — collapse to two rows by moving `H HORN` onto the second row (drop the gap to 1.2 em at widths < 720).

**Regressions:** none.

**Must not regress:** chase camera position on every HUD frame; text shadow over sunlit dirt; dimmed night hints.

---

## Overall

**Gate verdict: pass.**

- Round 4's categories are Materials and Texture quality. Materials went up in every family that can show them: Hero car 6 → 7, Car glass 6 → 7, Fleet 5 → 6, Campground 6 → 7, Road & terrain 6 → 7, Vegetation 5 → 6, Lions 4 → 5. Texture quality went up in Hero car 5 → 7, Car glass 5 → 6, Fleet 5 → 6, Campground 5 → 6, Road 5 → 6, Vegetation 5 → 6, Lighting 5 → 7; flat only in Lions (5 → 5). The candidate beats the incumbent on the round's categories.
- No category of any family drops by more than one point. The only drop is Hero car Visual cleanliness 6 → 5 (`truck_night/hero.png`, light-bar bloom 1 435 px > 0.5 vs 53).
- Of the three round-2 blockers, two are closed with numbers (night sky 20.3 % → 0.13 % of the star field over 0.35 with the glows excluded; mess shade 2.6 st → 1.5 st with readable chairs) and the third is half-closed (hill saturation 0.42 → 0.21 everywhere; hill value still 1.11–1.24 of the sky on sun-facing crests and 0.57 on the backlit ridge). Colour/atmosphere, the category that failed round 2's gate, is back from 3 to 6 in Lighting, Road and Campground.

The pass is on the rubric's terms. It is not a clean bill: the sky fix exposed a lamp defect that was hiding under the snow, and the hill fix moved the value error rather than removing it.

**Three weakest areas of the whole game**

1. **The lion as a material and a form.** Materials 5, Geometry 5, Silhouette 5 — the lowest scores on the board. A dyed-suede skin over rounded boxes with a welded muzzle and no shoulder or hip: it is a plush toy because the coat has no rim response and the body has no bony landmarks. The eyes and the contact shadow are the first things about the lion that read as an animal.
2. **Far-hill value against the sky.** Sun-facing crests 1.02–1.24 of the sky on four of the eight ridges I measured across the four blocker frames, the backlit ridge 0.57; only two ridges sit in the 0.72–0.92 window. The cobalt is gone; the hills still do not sit *under* the sky.
3. **The night hero's hot spots.** Light bar slab (5 582 px of bloom), a bloomed star (259 px), fire ground at sat 0.72. The first night frame has three things in it that are brighter or more saturated than anything real would be.

**The single most valuable next change**

Clamp everything the far-hill and far-plain shaders emit to below the sky they stand against — `col = min(col, skySample * 0.9)` after the haze mix in `src/terrain.js` `buildFarHills` and in the far-plain `hazeChunk` — and lower the sunlit scrub albedo so the clamp is a guard, not the look. It closes the last open blocker in every daytime frame at once (`mainroad`, `lion_far`, `pickup_0_day`, `camp_beyond`), it costs nothing at runtime, and it is the one defect that sits in the background of every day and dusk family. The light-bar fix (`barCover` material, nine-lobe emissive mask, `BEAM.night.lens` split) is the second, and it is a smaller edit.
