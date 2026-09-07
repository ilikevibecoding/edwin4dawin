# Gauntlet round 6 — Critic A

**Incumbent:** round 5, build `0dc79bb` (truck sets re-shot level), `shots/round5/`.
**Candidate:** round 6, build `c2f0b83`, `shots/round6/`: `truck_{day,dusk,night}/` (+ `moon.png`, new), `camp_{day,night}/`, `fleet/`, `lions_{day,dusk,walk}/`, `glass/` + `metrics.json`, `ultra_{day,night,camp,lions}/`. Round theme: animation, physics, ground contact.

**Frames looked at:** every candidate frame beside its incumbent — 30 `truck_*` + 3 `moon`, 12 `glass/` + `metrics.json`, 24 `fleet/`, 10 `camp_*`, 10 `lions_day` + `lions_dusk`, 8 `walk_00..07` (+ the 4 static `lions_walk` views, which are pixel-identical to their `lions_day` twins), 13 ultra frames. `hud.png` not scored. `stats.json` in `truck_*`, `ultra_day`, `ultra_night` for Performance.

**Blindness.** I read `gauntlet/RUBRIC.md` and my own `gauntlet/round5/critic_A.md`; nothing else in the repo (no `CHANGELOG`, `PROGRESS`, consensus hand-off, builder reports or `src/`). Where a fix below names a parameter, the name comes from my round-5 report; where I could not infer one from the frame I say what the frame should measure instead.

**Method.** PIL + numpy/scipy under `/tmp/critic-a/` (nothing in the repo). Linear luma Y from sRGB-decoded pixels (0.2126 R + 0.7152 G + 0.0722 B); stops = log2 of a Y ratio; hue/sat from the region mean or per pixel where stated; 4-connected blobs; column-max profiles for the light bar. Boxes are `(x0, y0, x1, y1)` at the frame's own resolution: `truck_*`, `glass/` 640×360; `camp_*`, `lions_*` 512×288; `fleet/` 480×270; `ultra_*` 1280×720. **Hills** as the consensus asked: per column, the ridge row is the first step down of ≥ 6 % of the sky Y that persists (median rows r+2..r+8 ≤ 0.94 × median rows r−18..r−4), scanning from row 20 (from row 92 on `camp_beyond`, under the cirrus; from row 60 on `forest`, under its cloud), hill hue gated 170–270°. **Eyes**: box centred on the pupil (darkest 3×3), ±12 px; pale = V > 0.55 & sat < 0.28, dark = V < 0.2. **Rim**: per column of the dorsal outline x 270–420, rows edge+1..+3 vs +10..+20; continuity = columns at ≥ +0.3 st and the longest gap. **Walk strip**: planted-paw holds read at 8× with a pixel grid; the contact decal measured as the rows under the paw in the frame against the same pixels in two frames where the lion has gone (not against a median background — the lion is in too many frames for a median to be clean). **Glass flicker** against `flickBg` where the tool carries it.

**Capture note (not scored).** The brief says the pre-roll is deterministic and the truck sits at the same spot and pose in both rounds. The frames do not show that: `truck_*` frames differ by a mean |Δ| of 0.16–0.32 per pixel where the `camp_*` frames differ by 0.01–0.05; in `truck_day/forest.png` the round-5 truck rolls left on a bend and the round-6 truck runs upright down the ruts; in `truck_{dusk,night}/front.png` round 5 is a front-quarter view and round 6 is head-on; in `hero` the heading differs by ~15° and the day sky is a deeper blue (sat 0.12 → 0.35). I compare like regions, not pixels, and the head-on `front` views put the headlamp pools in the frame where round 5's ran off along the trail — the pools' brightness is scored, their being in frame is not. **Question for the consensus:** was round 5 also shot with the deterministic pre-roll, or only round 6?

---

## Round-5 asks checked against the frames

| Round-5 item | Frame, box | Measured R5 → R6 | Holds? |
|---|---|---|---|
| Red moonlit ground (blocking) → blue-grey | `truck_night/hero.png` (450,300,640,360); `ultra_night/{hero,road}.png` (900,600,1280,720) | hue 3° sat 0.36 → hue 242° sat 0.15, sRGB (0.145, 0.095, 0.092) → (0.140, 0.140, 0.164); ultra hero hue 3° → 240° sat 0.13; ultra road hue 6° → 257° sat 0.16 | yes |
| Nine pods on a lit strip at 1280, troughs 0.59–0.63 → ≤ 0.45 | `ultra_night/hero.png` (400,100,680,220) | nine peaks at 0.72–0.73 (cols 477 … 603), troughs 0.13–0.24; > 0.5: 1984 → 355 px; > 0.7: 367 → 182 px. At 640: hero troughs 0.21–0.52 → 0.12–0.25; `front` 0.44–0.59 → 0.15–0.32 | yes, beyond target |
| Windscreen returns no sky from the front quarter | `truck_day/hero.png` (245,100,320,140) | hue 53° sat 0.20 Ymed 0.117 → hue 160° sat 0.06 Ymed 0.240 under a sky of hue 217° — a pale grey sheen where the cab used to show through | yes (a grey sheen, not a blue one) |
| Mirror's plain 1.1 st under the trail | `glass/mirror.png` pane plain (395,105,470,130) vs trail (150,250,340,360) | −1.11 → −0.65 st; pane sky (395,20,470,60) 0.096 vs world sky 0.355 (−1.9 st) | half |
| `moving` flick 0.156 | `glass/metrics.json` | 0.156 → 0.095, `flickBg` 0.110, ratio 0.87; every pane ≤ 0.98 of its background except `mirror` (4.37×) | yes |
| Ultra pane stipple | `ultra_day/interior.png` (40,120,140,220) | 1-px vs 2-px gradient energy ratio 1.00 → 0.76 (a checkerboard is > 1; a natural image 0.5–0.8) | yes |
| Flame cream, core sat 0.24 → ≥ 0.5 | `camp_night/camp_fire_night.png` | core sat 0.29 → 0.53, hue 43°, sRGB (0.832, 0.704, 0.393) | yes — and the fire's reach went with it (§4) |
| Fire reach: warm-lit ≥ 36 % (must not regress) | same frame | warm-lit (hue 10–50°, sat > 0.3) 37.4 → 6.2 %; Y > 0.05: 29.8 → 15.6 %; ground 3 m Ymed 0.101 → 0.049 | **broken** |
| Mess pockets ≤ 2.5 st | `camp_day/camp_mess.png` | under table −2.03 → −1.22 st; chairs −1.68 → −0.81; darkest 8×8 −3.56 → −2.59 at (450,202); open floor −2.05 → −0.57 | yes — the open floor overshoots (§4) |
| Shade edge ≥ 30 px | same, cols 270–342 | 10–90 % width 10.5 → 17 px | half |
| Dusk front 0 px > 0.7 (must not regress) | `truck_dusk/front.png` | 0 → 1639 px > 0.7; pool blob 14 341 px > 0.6 at (191,262,499,360), Ymed 0.603; 42.9 % of rows 250–360 over 0.5; grille p95 0.076 → 0.282 (sky p95 0.424) | **broken** (head-on pose puts the pool in frame; the pool itself is blown) |
| Dusk crown ≤ 2.5 st, < 0.01 ≤ 10 % | `truck_dusk/forest.png` (250,30,600,120) | −3.38 → −2.24 st; 24.0 → 9.8 % | yes |
| Turf as pale straw, not dark khaki | `lions_day/lion_pride.png` rows 192–288 | turf Ymed 0.163 → 0.341 (+1.07 st), sat 0.51 → 0.41, hue 43° both; straw 13.6 → 27.5 % of the lower third; khaki 22.5 → 32.3 %; in front of the lions (60,235,130,260) 9 → 30 %, (300,235,380,260) 8 → 9 % | yes |
| `forest` range at the sky (blocking) | `truck_day/forest.png` cols 0–300, `ultra_day/forest.png` cols 0–600 | with the consensus ridge method: 0.78 (0.70–0.81) → 0.84 (0.75–0.90) at 640; 0.77 → 0.81 at 1280 | **my round-5 finding does not survive the method** — the range was in band both rounds; withdrawn |
| Walk strip: no contact under planted paws | `lions_walk/walk_02..04.png` | rows under the planted paw −0.6 … −2.2 st against the same pixels with the lion gone (was +0.00) | yes (§8) |
| Lion head: proud eyeballs, loaf muzzle | `ultra_lions/lion_face.png`, `lions_day/lion_face.png` | eyes under lid margins, brow ridge, nose leather, whisker spots; still a box muzzle with a drawn mouth (§7) | half |
| Coat anisotropy ≥ 1.3 | `lions_day/lion_close.png` (295,150,355,200) | 0.81 → 0.79 (neck 0.94 → 1.08) | no |
| Dusk rim +0.20 st kept, specks ≤ 533 | `lions_dusk/lion_close_dusk.png` | rim median +0.29 → +0.13 st; columns ≥ +0.3 st 72 → 34 of 150; longest gap 22 → 26; specks 651 → 411 | specks yes, rim **lost half its lift** |
| Ranger body ≥ 0.02 at night | `fleet/ranger_0_night.png` (150,90,330,200) | 0.0085 → 0.0157 (0.37 → 0.90 of its sky) | nearly |
| Jeep glare 461–687 px > 0.5 | `fleet/safari-jeep_{0,1,2}_night.png` | 461 → 479 / 550 → 376 / 687 → 268 px; > 0.7 in frame 117 → 111 / 112 → 61 / 83 → 0. At 2× the jeep_0 blob is the jeep's own lit headlamp, not a lantern in the paint — my round-5 reading was wrong | jeep_2 yes; jeep_0 is a lamp |
| `rear` +8 % calls | `stats.json` | 656 → 658; `ultra_day/interior` 778 → 654 calls, 4.62 → 3.48 M tris | flat; interior −16 % |

---

## 1 Hero car

Frames: `truck_{day,dusk,night}/{hero,front,rear,wheel,detail,interior,forest,road,mainroad,moon}.png`, `ultra_day/{hero,interior,road,mainroad,forest}.png`, `ultra_night/{hero,road}.png`.

Night (`truck_night/hero.png`): bar box (200,40,360,120) nine peaks 0.71–0.73 at cols 238 … 301, troughs 0.12–0.25 (R5 0.21–0.52), 223 → 93 px over 0.5; frame > 0.7: 112 → 65; sky box over 0.35 outside the bar's columns 0 → 2 px. Ground (450,300,640,360) Ymed 0.0094 → 0.0186, hue 3° → 242°, sat 0.36 → 0.15; sky (300,0,640,10) 0.0233 → 0.0121, sat 0.67 → 0.55 — the ground now sits +0.62 st over the upper sky in this view (R5 −1.31). Beam verge (0,170,120,230) hue 32° both rounds, sat 0.31 → 0.20, Ymed 0.036 → 0.049. Day: darkest 8×8 under the truck 0.0015 at (431,245) vs sunlit ground (450,300,640,360) 0.161 — −6.7 st (R5 −5.7); bonnet row medians x 170–250, rows 151 → 181: 0.278, 0.238, 0.189, 0.171, 0.134, 0.077, 0.079, 0.059, 0.048 — graded still; door skin (300,150,430,205) 0.104 → 0.074; flecks bright 6.5 → 7.4 %, dark 10.3 → 10.6 %. `wheel.png`: sidewall lettering reads at 640 now; lug chamfer as before; tyre on the laterite with a contact shadow, no sink, no deformation, no tread mark behind the wheel, no dust in any hour. Front views: `truck_dusk/front.png` 1639 px > 0.7 (R5 0), pool blob 14 341 px > 0.6 at (191,262,499,360) Ymed 0.603 — +0.8 st over the sky median (0.354) at dusk; `truck_night/front.png` 5977 px > 0.7 (R5 1001), pool 20 680 px > 0.6 at (145,256,535,360), 52 % of rows 250–360 over 0.5 (R5 0 %). Nothing over 0.9 in any truck frame.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | pose/heading differs from round 5 in every fixed view (capture note); `moon` views frame the sky with a verge and the lookout tower |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 8 → 8 | clearcoat gradient on bonnet and door as round 5 |
| 6 | Texture quality | 7 → 7 | tyre sidewall lettering reads at 640 (`truck_day/wheel.png` (300,60,470,200)); door flecks unchanged (7.4 / 10.6 %) |
| 7 | Glass / transparency | 7 → 7 | panes as round 5 (see ±0.01 on 9 of 12); the screen now carries a sheen (below) |
| 8 | Lighting | 8 → 7 | **up:** pods fully separate at 640 and 1280 (troughs 0.12–0.32, target ≤ 0.45); moonlit ground blue-grey; beam cone warm. **down:** the headlamp pool is blown at both hours in the head-on `front` view — dusk sand at Ymed 0.60 under a 0.35 sky (+0.8 st over the sky at dusk is a floodlight, not a dipped beam); night pool 20 680 px > 0.6, 5977 px > 0.7. Round 5's "0 px over 0.7" was pose-dependent and I said so; the pose has now shown the pool and it is too bright |
| 9 | Shadows | 7 → 7 | contact −6.7 st under the truck; dusk −3.3 st |
| 10 | Reflections | 7 → 8 | the windscreen returns a sky sheen from the front quarter: (245,100,320,140) hue 53° → 160°, Ymed 0.117 → 0.240 under a sky of 0.253 (R5 showed the seats through it); bonnet/door/roof gradients kept |
| 11 | Color / atmosphere | 7 → 8 | night soil hue 242° sat 0.15 under a sky of hue 225° sat 0.55 — the round-5 blocker closed; dusk paler and less amber (sky sat 0.36 → 0.29) |
| 12 | Animation | — | no frame shows the truck moving: wheels, suspension and dust cannot be judged from a still at the shot; see Physics |
| 13 | Physics / contact | 8 → 8 | tyres in the ruts at every hour with a contact shadow; body upright (the round-5 `forest` roll is not in this pose); no tyre track distinct from the ruts, no dust behind a cruising truck (weakness #2) |
| 14 | Detail density | 7 → 7 | |
| 15 | Integration | 7 → 7 | |
| 16 | Cleanliness | 8 → 7 | `truck_dusk/front.png` 1639 px > 0.7, `truck_night/front.png` 5977 — the two biggest bright areas in the truck set; nothing > 0.9 anywhere; bar bloom 93 px > 0.5 in the hero box |
| 17 | Temporal | — | |
| 18 | Performance | 5 → 5 | hero 488 → 486 calls, 2.18 → 2.18 M tris, programs 175, textures 293 → 292 |

**Top three weaknesses**
1. `truck_dusk/front.png` (191,262,499,360), `truck_night/front.png` (145,256,535,360) — the dipped-beam pool on the sand is Ymed 0.60 at dusk (sky 0.35, +0.8 st over it; grille p95 0.076 → 0.282 from the bounce) and > 0.6 over 20 680 px at night, lighting the verge grass to the frame edge. A dipped beam 10 m out on laterite should sit at or under the dusk sky, and at night the pool should be the brightest thing after the lamps but not a sheet — target: dusk pool Ymed ≤ 0.30 with ≤ 50 px > 0.7 in the frame; night pool ≤ 8 000 px > 0.6, ≤ 1 500 px > 0.7. Fix: the `BEAM.dusk` / `BEAM.night` beam intensities I named in round 5 are the dials — halve `beam` at dusk and take a third off at night, and tilt the cone down 2° so the hot spot lands 6–8 m out, not on the near sand; keep the nine pods (`cover`) where they are.
2. Every `truck_*` frame — a cruising truck on dry laterite raises no dust and leaves no mark: `truck_day/wheel.png` rows 200–360 have no particle, no soil spray, no tread print behind the tyre (frac > 0.3 in the band 6.3 → 5.4 %, all of it lit paint); `rear.png` shows the ruts but nothing fresh. Fix: a wheel-following dust emitter keyed to speed (≥ 3 m/s) and a tread-print decal along the wheel path for the last ~15 m, 0.3 st darker than the rut; target in `rear.png` a 0.3–0.5 st darker print band under each rear wheel and a dust veil (sat ≤ 0.3, +0.2 st) over the ground behind the truck.
3. `truck_day/hero.png` (245,100,320,140) — the new screen sheen is grey (sat 0.06) under a blue sky (sat 0.35); a pane at this angle returns the sky's colour, not a neutral. Fix: the graze term's tint — multiply by the sky colour (it is reading the PMREM's average, not the direction); target the box's hue within 30° of the sky's at the same Ymed.

**Regressions.** Lighting 8 → 7 and Cleanliness 8 → 7 (the front-view pools) — one point each. Noted, no drop: the night sky is 1 st dimmer than round 5 in the hero (0.0233 → 0.0121) and the ground now sits over it there; the pad/band ratio on the camp approach holds at 0.71.

**Must not regress.** Pods separate (troughs ≤ 0.32 at 640, ≤ 0.25 at 1280); moonlit ground blue-grey (hue 220–260°, sat ≤ 0.2); the screen sheen; the bonnet and door gradients; −6 st contact under the truck; nothing > 0.9.

---

## 2 Car glass

Frames: `glass/{ws_mid,ws_close,side_sun,side_shade,interior,int_side,rear_dust,moving,mirror,dusk_ws,night_int,night_ext}.png`, `glass/metrics.json`.

Tool numbers R5 → R6 — see: ws_close 0.925 → 0.934, ws_mid 0.874 → 0.877, side_sun 0.957 → 0.965, side_shade 0.919 → 0.914, interior 0.799 → 0.796, int_side 0.861 → 0.865, rear_dust 0.857 → 0.862, dusk_ws 0.845 → 0.862, night_int 0.927 → 0.965, night_ext 0.962 → 0.876, moving 0.887 → 0.865; veil within ±0.004 on nine panes, moving 0.073 → 0.088, night_ext 0.021 → 0.027; flick moving 0.156 → 0.095 (`flickBg` 0.110, ratio 0.87), int_side 0.030 → 0.029 (0.90), others 0.002–0.023 at 0.80–0.98 of their background; hot 0, clip 0, hidden 44 on all eleven world panes. `mirror` is a different measurement now (pane alone): cover 64.8 → 9.1 % (`paneFullPct` 9.1), see 0.210, veil 0.209, flick 0.008 against `flickBg` 0.002 (ratio 4.37), hidden 2. New columns `barPx/barPct` 0 on every pane, `calls` 443–730 per glass view.

The pane (`mirror.png`, crop `/tmp/critic-a/mirror_r6_x3.png`): sky band at the top with one acacia crown (395,20,470,60) Ymed 0.096 hue 221° — 1.9 st under the world's sky (0.355); a featureless sand grade (395,105,470,130) 0.165, −0.65 st under the trail beside the mirror (R5 −1.11); the flank as a curved green edge over a dark blue-grey quadrant (395,65,470,100) 0.019. From the seat (`interior.png` (75,115,130,200)) the same content, Ymed 0.030 both rounds.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | the pane fills 9 % of the `mirror` frame (tool definition), eye lower and outboard; `interior` framing as round 5 |
| 5 | Materials | 7 → 7 | film: `ws_close` lower band (120,240,400,268) +1.08 st over the mid pane (R5 +1.29); mid pane 0.103 → 0.117 |
| 6 | Texture quality | 6 → 6 | no wiper arc at 640, wipers parked |
| 7 | Glass / transparency | 8 → 8 | see within ±0.01 on nine panes, `night_int` +0.04; `night_ext` −0.086 and `moving` −0.022 (noted) |
| 8 | Lighting | 7 → 7 | dusk_ws 0.862, night_int 0.965 |
| 10 | Reflections | 6 → 7 | the windscreen returns a sky sheen from outside (hero §1); the mirror's plain is 0.46 st closer to the trail; still a painted grade with no track or tuft in it, and its sky is 1.9 st under the real one |
| 11 | Color / atmosphere | 7 → 7 | |
| 16 | Cleanliness | 7 → 8 | hot 0, clip 0; the ultra pane stipple is gone (`ultra_day/interior.png` (40,120,140,220) 1-px/2-px gradient ratio 1.00 → 0.76) |
| 17 | Temporal | 5 → 6 | `moving` flick 0.095 at 0.87 of the background's own; every world pane flickers less than what is behind it. Held at 6 because the mirror pane flickers at 4.4× its background (0.008 vs 0.002) — a painted card should not flicker at all |

**Top three weaknesses**
1. `glass/mirror.png` pane (395,20,470,130) — the mirrored sky is 1.9 st under the sky over the truck and the plain is a smooth grade with nothing in it; the world behind the camera has ruts and tufts. Fix as round 5 #2: hold `ground` at unit luma and start the near-darkening at −0.3 (17° under the horizon); and give the sky term the live sky's luminance (the pane's sky should be within 0.3 st of the world's). Target: pane sky ≥ 0.25, plain within 0.5 st of the trail.
2. `glass/metrics.json` `mirror` flick 0.008 / `flickBg` 0.002 — 4.4× the background. Two renders 2 mm apart should move a painted pane by nothing; the number says something on the pane re-samples (a jittered PMREM lookup or the SSR pass at fast). **Question:** does `flickBg` for `mirror` measure the pane's surroundings (frame, door) rather than the world the pane reflects? If so the ratio is not comparable and the tool should report the pane's flick against the `moving` background's 0.110 instead.
3. `glass/night_ext.png` — see 0.962 → 0.876 with veil 0.021 → 0.027; the one pane that got worse. **Question:** the night sky is 1 st dimmer this round (§9) — is the drop the pane or the tool's `bgLuma` moving under a darker sky?

**Regressions.** None by category. Noted: `night_ext` see −0.086.

**Must not regress.** `moving` flick ≤ its background; hot 0 / clip 0; `night_int` ≥ 0.92; the seat's view of the mirror; the screen sheen; no stipple at ultra.

---

## 3 Fleet

Frames: `fleet/*_{day,night}.png` (480×270). The set carries the fleet materials round now, so changes are real.

Day bodies (150,90,330,200) brighter in every frame: +0.16 (motorcycle) to +0.98 st (supply truck), sat down 0.02–0.05 — a satin over the flat paint; `motorcycle_0_day.png` front wheel is a round chromed spoked hub with a treaded tyre (R5: a dark notched wheel), panniers brushed alloy. Night: skies dimmer (Ymed 0.0164–0.0341 → 0.0124–0.0276, −0.2 to −0.6 st) and less saturated (0.57–0.72 → 0.41–0.58); ground blue-grey. Body/sky: ranger 0.37 → 0.90, suv 0.61 → 1.26, camper 2.25 → 4.4, expedition 0.51 → 1.30, supply 0.29 → 0.62, jeep_1 0.41 → 0.56, jeep_2 0.86 → 0.44 (body −1.37 st; the lamp that lit it in round 5 no longer does), pickup 1.45 → 2.16. Glare: jeep_2 blob 687 → 268 px > 0.5 and 83 → 0 px > 0.7; jeep_1 550 → 376; jeep_0 461 → 479 — at 2× this is the jeep's own headlamp, lit, with a soft pool in front (my round-5 "lantern in the paint" was wrong). New lit marker lamps on the parked supply truck (`supply-truck_0_night.png` blobs 350 + 170 px > 0.5, 36 px > 0.7). `trailer_0_night` mean |Δ| 0.078 — the trailer is now lit by the row lamp (Ymean 0.041 → 0.061).

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 2 | Silhouette | 6 → 6 | |
| 3 | Geometry | 6 → 7 | motorcycle wheels round with a spoked hub (`motorcycle_0_day.png` (55,175,130,270)) |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 8 | chrome spokes, alloy panniers, satin paint (+0.2–1.0 st on the day bodies with the hue held ±1°) |
| 6 | Texture quality | 6 → 6 | tread on the motorcycle tyre; body panels otherwise as round 5 |
| 7 | Glass / transparency | 6 → 6 | magenta 0 % |
| 8 | Lighting | 7 → 7 | ranger and expedition truck legible now (0.90 / 1.30 of sky); jeep_2 dropped to 0.44 of sky; lit lamps on jeep_0, jeep_1, pickup, supply truck |
| 9 | Shadows | 7 → 7 | |
| 11 | Color / atmosphere | 7 → 7 | night sky sat 0.41–0.58, ground grey-blue; day paint hue held |
| 13 | Physics / contact | 7 → 7 | every vehicle on its tyres with a contact shadow; parked, so nothing more to judge |
| 14 | Detail density | 6 → 6 | |
| 16 | Cleanliness | 6 → 7 | jeep_2 0 px > 0.7; jeep_0's 111 px are a lit lamp; trailer 0 % hot |

**Top three weaknesses**
1. `fleet/safari-jeep_2_night.png` (150,90,330,200) — body Ymed 0.0238 → 0.0092, 0.44 of its sky; the darkest vehicle in the row now (round 5's was the ranger at 0.26; it is fixed). Fix: the row lantern that reached it in round 5 — restore its `facing` or add the third pole at this end; target body ≥ 0.6 of sky.
2. `fleet/safari-jeep_0_night.png` (228,134,264,158) — the headlamp is a hot disc of 479 px > 0.5 with 111 px > 0.7 and a pool that stops 1 m out; a parked jeep with its lamps on all night in a lit row is odd, and if it is on, the pool should reach the pickup beside it. Fix: either off (the row is lit) or `distance` up with the disc's `core` down so the frame's > 0.7 count is ≤ 40.
3. `fleet/motorcycle_0_night.png` — new blobs 349 px > 0.5 at (186,98,207,121) and 162 px at (162,144,179,162): the chrome now mirrors the lantern as two hard discs. Fix: `clearcoatRoughness`/metal roughness floor 0.15 on the chrome so the lantern is a soft highlight; target ≤ 120 px > 0.5 per disc.

**Regressions.** None by category. Noted: jeep_2 body −1.37 st at night.

**Must not regress.** Pools only under lit lamps; magenta 0 %; trailer framing and lighting; the chrome wheel; darkest body ≥ 0.4 of sky.

---

## 4 Campground

Frames: `camp_day/{camp_arrive,camp_beyond,camp_gate,camp_interior,camp_mess,camp_overhead}.png`, `camp_night/{camp_arrive_night,camp_fire_night,camp_gate_night,camp_mess_night}.png`, `ultra_camp/{camp_mess,camp_gate}.png`.

Day (`camp_mess.png`, sunlit pad Ymed 0.375 / 0.321 L/R): open floor (250,235,330,255) −2.05 → −0.57 st; under the table (275,205,305,220) −2.03 → −1.22; under the right chairs (330,205,360,222) −1.68 → −0.81; darkest 8×8 −3.56 → −2.59 at (450,202); shade edge 10–90 % width cols 270–342: 10.5 → 17 px. Day frames otherwise the same picture (mean |Δ| 0.013–0.045; `camp_gate` has a new tuft on the drive at (150,200,175,225)). Night: `camp_fire_night.png` flame core (Y > 0.4, hue < 60°) 1682 → 431 px — one tongue 21 × 32 px at (270,153,291,185) where round 5 had a 59 × 50 px body; core sRGB (0.816, 0.728, 0.577) sat 0.29 → (0.832, 0.704, 0.393) sat 0.53; warm-lit (hue 10–50°, sat > 0.3) 37.4 → 6.2 % of the frame; Y > 0.05: 29.8 → 15.6 %; ground within 3 m (200,200,360,288) Ymed 0.101 → 0.049, sat 0.43 → 0.17; far ground (0,200,120,288) 0.029 → 0.019, sat 0.36 → 0.11; glow ring at 30 px 0.298 → 0.157, 60 px 0.125 → 0.060, 100 px 0.074 → 0.045; frame Ymean 0.053 → 0.033. `camp_mess_night.png` frame Ymed −0.71 st, hue 10° → 341° (the warm cast is gone); `camp_gate_night` −0.28 st; pad (150,200,400,285) 0.0146 → 0.0118, hue 326° → 230°, 0.69 → 0.71 of the band over the skyline. Gate timber unchanged at 512 (sign post 0.401 → 0.410).

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 7 | |
| 6 | Texture quality | 6 → 6 | |
| 8 | Lighting | 8 → 7 | **up:** every mess pocket ≤ 2.6 st, table −1.2, chairs −0.8; night pad blue-grey at 0.71 of the band. **down:** the campfire lights nothing — warm-lit 37 → 6 % of the frame, ground 3 m out −1.0 st, 8 m −0.6 st, the chairs round the fire are silhouettes; the round-5 must-not-regress was 36 % |
| 9 | Shadows | 6 → 6 | edge 10.5 → 17 px (softer; target 30); but the canopy's shade on the open floor is −0.57 st — a canvas roof that shades the ground by half a stop reads as gauze; the pockets were asked to ≤ 2.5 st, the open floor should have stayed near −2 |
| 11 | Color / atmosphere | 6 → 7 | flame core sat 0.53, hue 43° — orange again (the round-5 regression closed); night frames blue-grey |
| 14 | Detail density | 7 → 7 | |
| 15 | Integration | 7 → 7 | |
| 16 | Cleanliness | 6 → 6 | `ultra_camp/camp_gate` post-edge speckle as round 5 |

**Top three weaknesses**
1. `camp_night/camp_fire_night.png` (200,200,360,288) — the fire's light: the flame got its colour back and lost its reach. Ground 3 m out Ymed 0.049 (R5 0.101), ring at 60 px 0.060 (0.125), warm-lit 6.2 % (37.4 %). Whatever desaturated the point light in round 5 (`(1.0, 0.72, 0.45)`) and whatever fixed the flame this round has taken the light's intensity or distance with it. Fix: fire PointLight `intensity` ×2 and `distance` back to where warm-lit is 30–36 %, colour held at the paler amber; target ground 3 m Ymed 0.09–0.11, sat 0.35–0.45, 8 m ≥ 0.025.
2. `camp_night/camp_fire_night.png` (270,153,291,185) — one tongue 21 px wide and 32 tall, 431 core px; a camp fire of that size has a body of flame, not a candle. Fix: tongue count/size back toward round 5's footprint (59 × 50 px) with the new tint; target core 1 000–1 500 px at sat ≥ 0.5 and nothing over 0.7.
3. `camp_day/camp_mess.png` (250,235,330,255) — open floor under the canopy −0.57 st. Fix: the day fill (`messLamp`) is now overfilling the whole pad, not the pockets — `intensity` down a third or `distance` back to 6–7 m; target open floor −1.5 to −2.0 st with pockets ≤ 2.5 st and the edge ≥ 17 px.

**Regressions.** Lighting 8 → 7 (fire reach), one point. Noted: canopy shade density (Shadows flat — the softer edge offsets it).

**Must not regress.** Flame sat ≥ 0.5; pockets ≤ 2.6 st; edge ≥ 17 px; pad ≤ 0.75 of the band; row lanterns; the gate at 1280.

---

## 5 Road & terrain

Frames: `truck_*/{road,mainroad,forest}.png`, `camp_day/camp_beyond.png`, `lions_day/{lion_far,lion_pride,lion_medium,lion_side}.png`, `fleet/*_day.png`, `ultra_day/{mainroad,forest}.png`, `ultra_camp/camp_gate.png`.

Hills, consensus ridge method (median of kept columns; p10–p90; kept columns):

| frame | R5 | R6 | kept cols R6 |
|---|---|---|---|
| `truck_day/mainroad.png` | 0.80 (0.73–0.87) | **0.86** (0.81–0.92) | 600/640 |
| `truck_day/hero.png` | 0.84 | **0.89** (0.81–0.93) | 185/640 |
| `truck_day/forest.png` cols 0–300, from row 60 | 0.78 (0.70–0.81) | **0.84** (0.75–0.90) | 200/300 |
| `fleet/pickup_0_day.png` | 0.81 (0.73–0.85) | **0.88** (0.15–0.92) | 327/480 |
| `fleet/camper_0_day.png` | 0.80 | **0.85** (0.79–0.90) | 258/480 |
| `fleet/suv_0_day.png` | 0.86 | **0.90** (0.86–0.93) | 268/480 |
| `fleet/ranger_0_day.png` | 0.86 | **0.90** (0.78–0.93) | 243/480 |
| `camp_day/camp_beyond.png` (from row 92) | 0.76 (0.67–0.85) | **0.81** (0.75–0.89) | 398/512 |
| `lions_day/lion_far.png` | 0.74 (0.63–0.77) | **0.81** (0.75–0.84) | 395/512 |
| `lions_day/lion_pride.png` | 0.82 | **0.89** (0.84–0.92) | 328/512 |
| `lions_day/lion_medium.png` | 0.81 | **0.86** (0.76–0.90) | 352/512 |
| `ultra_day/mainroad.png` | 0.72 (0.56–0.81) | **0.76** (0.69–0.85) | 1218/1280 |
| `ultra_day/forest.png` cols 0–600, from row 120 | 0.77 (0.74–0.79) | **0.81** (0.77–0.88) | 234/600 |
| `ultra_camp/camp_gate.png` | 0.84 (0.58–0.93) | **0.84** (0.61–0.93) | 936/1280 |

Every ridge rose 0.04–0.07 toward the sky; the spread is 0.81–0.90 at 480–640 wide (R5 0.74–0.86), 0.76–0.84 at 1280. Under this method the `forest` range was in band in round 5 too (0.78 / 0.77) — my round-5 "at the sky" finding was the old largest-step method catching the cloud edge, and I withdraw it. The trend matters: at 0.90 (`suv`, `ranger`) the ridge is 0.15 st under the sky and the p90 columns are at 0.93; one more step and the far range vanishes into haze on the small frames. Far-plain band `lion_far.png` (0,117,150,129): Ymed 0.274 → 0.240, −0.27 → −0.23 st under the sky band (0,60,512,100), hue 45° → 43° sat 0.43 — a lit straw plain, not haze. Water: `lion_far` pool (130,112,260,124) −0.32 → −0.37 st vs sky, rim (130,126,260,130) 0.169 both rounds (+0.00), so the pool sits +0.65 → +0.37 st over its rim; `lion_side` open water (80,128,200,150) hue 10° → 12°, sat 0.08 — grey, unchanged; `lion_pride_dusk` pool −0.13 → +0.00 st vs sky. Night `mainroad` ground (200,250,440,360) 0.0250 → 0.0230, hue 340° → 232°; `road` 0.0102 → 0.0164, hue 2° → 339° sat 0.12.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 3 | Geometry | 6 → 6 | ellipsoid boulders in the water as round 5 (`ultra_lions/lion_face.png` (0,40,160,110)) |
| 5 | Materials | 7 → 7 | laterite hue 33° sat 0.50 on the trail; water a grey mirror |
| 6 | Texture quality | 6 → 6 | |
| 8 | Lighting | 8 → 8 | hills in band on all fourteen frames (0.76–0.90); night ground 0.016–0.023 and blue-grey |
| 9 | Shadows | 6 → 6 | |
| 10 | Reflections | 6 → 6 | water unchanged (kopje reflected, pool grey, rim still a pale line) |
| 11 | Color / atmosphere | 7 → 8 | moonlit ground blue-grey (hue 232–257°, sat 0.12–0.20) under a sky of hue 224° — the blocker closed; hills hue 217–221° |
| 14 | Detail density | 6 → 6 | |
| 16 | Cleanliness | 6 → 6 | |

**Top three weaknesses**
1. `fleet/suv_0_day.png`, `fleet/ranger_0_day.png` ridges 0.90 (p90 0.93); `lions_day/lion_pride.png` 0.89 — the far hills are 0.15 st under the sky at 480–512 wide, and every frame moved the same way. Hold here; do not lift the hill tone again. Target band 0.75–0.88, none over 0.90.
2. `lions_day/lion_side.png` (80,128,200,150), `lion_far.png` rim (130,126,260,130) — water grey (sat 0.08) and the wet annulus a pale line (+0.00 st change), as round 5 #2: darken the mud-ring albedo `mix(1.0, 0.6, …)` in the wet band; granite grain on the reflected ellipsoids.
3. Every `truck_*` frame — no tyre print or dust on the trail (hero #2).

**Regressions.** None.

**Must not regress.** Ridges 0.75–0.90 with no frame over 0.90; hill sat ≤ 0.19; the kopje in the water; night ground 0.015–0.03 and blue-grey.

---

## 6 Vegetation

Frames: `lions_day/{lion_pride,lion_far,lion_medium}.png`, `truck_{day,dusk,night}/{forest,hero,mainroad}.png`, `lions_dusk/lion_medium_dusk.png`, `lions_walk/walk_*.png`, `ultra_day/forest.png`, `ultra_lions/*`.

Pride plain (`lion_pride.png` rows 192–288): straw (hue 30–60°, sat < 0.5, Y > 0.25) 13.6 → 27.5 %; khaki mask (hue 38–95°, sat > 0.15) 22.5 → 32.3 %; soil 43.1 → 37.1 %; Ymed 0.150 → 0.194; the turf pixels: hue 43° both, sat 0.51 → 0.41, Ymed 0.163 → 0.341 (+1.07 st) — it is the straw's colour now. In front of the lions: (60,235,130,260) khaki 9 → 30 %, (300,235,380,260) 8 → 9 %. Dusk crowns `truck_dusk/forest.png` (250,30,600,120): median −3.38 → −2.24 st vs sky, p90 −1.42 → −1.21, pixels < 0.01: 24.0 → 9.8 %. `lion_medium.png` acacia (215,5,385,55): crown −3.46 → −3.39 st, L/R −0.65 → −0.31 st. Night canopy `truck_night/forest.png` rows 60–160: Ymed 0.0149 → 0.0091 against a sky of 0.0136 (0.67 of it), < 0.005: 18.8 → 24.4 % — dark, not missing. New view: from the 2.2 m strip camera (`lions_walk/walk_*.png`, e.g. `walk_02` (100,150,420,200)) the near tufts read as flat pale ellipses lying on the soil — crossed cards seen from 15° above; `walk_04` (180,175,330,196) holds nine pale blobs (V > 0.55, sat < 0.42), the four largest 14–51 px wide at aspect 1.3–2.8 : 1 — lying wider than they are tall.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 6 → 6 | acacia crowns discs on forks (`ultra_day/mainroad` (400,85,560,165)) |
| 3 | Geometry | 5 → 5 | crossed-card tufts; from above they lie flat |
| 5 | Materials | 6 → 6 | |
| 6 | Texture quality | 6 → 6 | |
| 8 | Lighting | 7 → 8 | dusk crown −2.24 st with 9.8 % black — both round-5 targets met; night canopy 0.67 of the sky; day crown split |
| 9 | Shadows | 6 → 6 | tuft root shade; no cast shadow from any tuft at 512 |
| 11 | Color / atmosphere | 6 → 7 | the lie-up is pale straw (Ymed 0.341, sat 0.41) — the round-5 fix landed |
| 14 | Detail density | 7 → 7 | khaki 32 % of the lower third, 30 % in front of the left lion, 9 % in front of the right |
| 15 | Integration | 6 → 6 | tufts stand through the walker's legs in `walk_03`, `walk_06` (legit occlusion); pale discs on the ground near the strip camera |
| 16 | Cleanliness | 6 → 6 | |

**Top three weaknesses**
1. `lions_walk/walk_04.png` (180,175,330,195), any frame from ≥ 2 m up — near tufts are pale flat ellipses on the soil: the crossed cards have no top and the near ones are foreshortened to their footprint. Fix: a third, horizontal card (or a 3-card fan with one at 30° from vertical) on the near-LOD tuft so the clump has a crown from above; target no pale blob ≥ 10 px wide with aspect > 1.5 : 1 in the strip's ground band.
2. `lions_day/lion_pride.png` (300,235,380,260) — 9 % in front of the right lion where the left has 30 %: the lie-up ease still keys off one anchor. Fix as round 5 #1's second half (`0.55 → 0.8` on the inner ease per lion); target ≥ 20 % in both boxes.
3. `ultra_day/mainroad.png` (400,85,560,165) — crowns as plates on forks, as round 5 #3 (`thick [0.24, 0.32] → [0.34, 0.46]`, two tiers of cards).

**Regressions.** None.

**Must not regress.** Dusk crown ≤ 2.5 st and ≤ 10 % black; the pale straw turf; night canopies dark not missing; the day crown split.

---

## 7 Lions

Frames: `lions_day/{lion_close,lion_face,lion_far,lion_medium,lion_pride,lion_seat,lion_side}.png`, `lions_dusk/{lion_close_dusk,lion_medium_dusk,lion_pride_dusk}.png`, `ultra_lions/{lion_close,lion_face}.png`.

Head (`ultra_lions/lion_face.png`, `/tmp/critic-a/pair_ultra_face.png`): the skull is broader with a brow ridge over the eyes, the eyes sit under dark lid margins, a dark nose leather, whisker spots, a mouth line and a neck ruff; the muzzle is still a box with a flat front and the mouth is drawn, not modelled; no whiskers, no claws. Eyes (`lion_face.png`, pupil-centred ±12 px): right (264,92,288,116) pale 20 → 16, dark 33 → 61, iris 328 → 323, catch-light Ymax 0.79 → 0.78; left (193,91,217,115) pale 41 → 113, dark 7 → 38, iris 248 → 236, Ymax 0.79 → 0.80 — the pale count on the left is the pale fur of the new cheek inside the box, not sclera (8× crop `/tmp/critic-a/eyes_r6.png`). At 1280: pale 0–6, dark 52 → 99 / 62 → 129, iris 254 → 246 / 420 → 191, catch-light 0.57 → 0.48 / 0.65 → 0.56 — the eye is smaller and its highlight dimmer at ultra. Coat (`lion_close.png`): flank (295,150,355,200) Ymed 0.098 → 0.140, std 0.073 → 0.092, p99 0.378 → 0.438, bright specks 33 → 53; anisotropy |dY/dy| / |dY/dx| 0.81 → 0.79 (neck 0.94 → 1.08). Contact, day: under the forepaws (240,262,300,280) vs beside (320,262,400,280) −0.40 → −1.00 st. Dusk (`lion_close_dusk.png`): under chest (330,232,380,250) vs beside (405,232,470,250) Y +0.03 → +0.26 st, blue −0.007 → −0.018, sat +0.01 → +0.04 (the ruff now hangs over the box — pose, not decal); under the cub (60,165,150,180) −2.46 → −2.48 st. Rim: median +0.29 → +0.13 st, columns ≥ +0.3 st 72 → 34 of 150, segments 27 → 18, longest gap 22 → 26 px; specks 651 → 411. Poses at rest: sphinx lie-up (`lion_close`), side-lie cub, the sitting lion at dusk — elbows, hocks and belly on the ground with the contact under each; no float, no sink.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 6 → 7 | brow, stop and ruff read from the side (`walk_*`, `lion_side`); the round-5 bear's snout is a cat's at 512 — still short in the muzzle at 1280 |
| 3 | Geometry | 6 → 7 | eyes under lids with dark margins, brow ridge, cheek, nose leather; muzzle still a box with a drawn mouth (`ultra_lions/lion_face.png` (560,300,900,470)) |
| 4 | Scale | 6 → 6 | |
| 5 | Materials | 6 → 7 | flank +0.5 st with 25 % more contrast and 60 % more specks — fur reads as fibre; anisotropy 0.79, no direction yet |
| 6 | Texture quality | 6 → 7 | face fur, whisker spots and lid margins at 1280 |
| 8 | Lighting | 7 → 7 | day body lit/shade split; dusk wrap softer and wider but the crisp rim lift halved (+0.29 → +0.13 st) |
| 9 | Shadows | 6 → 7 | −1.0 st contact under the forepaws (was −0.4); the cub's pool −2.5 st |
| 10 | Reflections (eyes) | 6 → 6 | catch-light 0.78–0.80 at 512; 0.48–0.56 at 1280 (was 0.57–0.65) |
| 11 | Color / atmosphere | 6 → 6 | |
| 13 | Physics / contact | 6 → 7 | every resting lion's elbows, hocks, paws and belly on the ground with a contact under each; the sitting lion's haunches spread on the soil |
| 14 | Detail density | 5 → 6 | whisker spots, nose leather, lid margins; still no whiskers or claws at either resolution |
| 15 | Integration | 6 → 7 | straw round the lie-up, −1.0 st contact, decal multiplies |
| 16 | Cleanliness | 6 → 6 | rim specks 651 → 411 (fewer dots); no crescents |

**Top three weaknesses**
1. `ultra_lions/lion_face.png` (560,300,900,470) — the muzzle: a flat front plane with the mouth as a dark line and the lips a painted V; the nose leather sits on the plane. Fix: `headspec.js` muzzle row split into nose block / upper-lip planes with a philtrum groove (round 5 #1's last clause, not yet done); whisker pads as two low domes; and eight whisker strands per side (line geometry, 0.5 px at 1280 is enough). Target: a ≥ 0.4 st lit/shade split across the philtrum at 1280.
2. `lions_dusk/lion_close_dusk.png` outline x 270–420 — the backlight rim is +0.13 st median with 34 of 150 columns over +0.3 st and a 26-column gap; round 5 had +0.29 with 72 columns. The dots went (411 specks) but the rim went with them. Fix: the `(1 − vShell)` scaling I proposed should only kill the outer-shell dots — put `uRim` back up ×1.5 so the body-carried rim is +0.25–0.3 st; target ≥ 100 of 150 columns over +0.3 st with a longest gap ≤ 12.
3. `lions_day/lion_close.png` (295,150,355,200) — anisotropy 0.79: the coat is a brighter grain with no lie. Fix as round 5 #3 (`anisotropy 0.6` along the body axis, `roughness 0.84 → 0.7`); target ≥ 1.3.

**Regressions.** None by category. Noted: dusk rim lift +0.29 → +0.13 st (Lighting held at 7 because the wrap itself is wider); ultra catch-light −0.1.

**Must not regress.** Eyes under lids; the −1.0 st contact; the multiplying decal; the brow and ruff; no crescents.

---

## 8 Lion feet & gait

Frames: `lions_walk/walk_00..07.png` (512×288, 0.3 s apart), camera at 2.2 m (round 5's at 1.3 m — not frame-comparable; judged on its own terms). Crops: `/tmp/critic-a/walker_r6_x3.png`, `feet_r6_ruler.png` (8×), `hold_{180,255,335}.png` (pixel grid).

The walker crosses right to left from x ≈ 380 to ≈ 150 over the eight frames, passing in front of the lying lion and followed by a cub; steps between frames 13–23 px where the body is cleanly segmented. **Planted paws hold their pixel:** the hind paw at col 336 is at the same pixel in `walk_00`, `walk_01`, `walk_02` while the leg over it rotates from trailing to vertical to hock-lifted (grid crop `hold_335.png`), and is gone in `walk_03`; the forepaw at col 258 holds through `walk_02`, `walk_03`, `walk_04` (`hold_255.png`) and lifts in `walk_05`; a third plant at col 182 holds `walk_05`–`walk_07`. Three frames = 0.9 s of stance with no drift I can see at 8×. **Contact decal under the planted paw** — the rows under the paw in the frame against the same pixels in two frames where the lion has gone: col 258, rows 177–182: `walk_02` −2.04, −1.75, −2.22, −0.81, −0.63, −0.21 st; `walk_03` −0.86, −1.46, −1.45, −1.06, −0.81, −0.33; `walk_04` −0.84, −1.72, −0.73, −0.65, −0.55, −0.30; `walk_05` (lifting) −0.97 … −0.51; rows 183–185 0.00 in every frame — a soft dark patch 6 rows deep and ~12 px wide. Col 336, rows 177–183: `walk_00` −0.56, −1.68, −2.27, −2.17, −1.48, −1.16, −0.81; `walk_01` to −2.9; `walk_02` to −2.89; `walk_03` (paw gone) −0.13, −0.01, −0.03 … — the decal leaves with the paw. Round 5 measured +0.00 st under every stance foot. **Flexion:** the swinging foreleg bends at the carpus with the paw curled under (`walk_00` left fore, `walk_06` right fore), the swinging hind leg flexes at stifle and hock with the paw trailing (`walk_02`, `walk_04` right hind); the planted leg is straight under the shoulder and rotates over the fixed paw. **Head and tail:** the head is carried level, a little below the withers, and does not bob or turn across the strip; the tail hangs in a curve with a black tuft and swings between frames (tuft at the hock in `walk_01`, `walk_03`, raised in `walk_02`, `walk_05`). Body bottom edge at row 180–182 in every frame where the torso segments cleanly (no bob at 512). Toe re-plant: at 0.3 s I see the lift-off (`hold_255.png` f5: heel up, toes last) but not a re-plant of the toes; the paw goes from flat to gone. The cub behind walks with its own gait (visible at (400,130,470,175) in `walk_00`–`walk_03`).

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 12 | Animation | 6 → 7 | carpal and hock flexion on the swing leg, straight stance leg rotating over a fixed paw, tail swinging, a following cub; the head is still rigid — no nod with the stride, no ear or turn |
| 13 | Physics / contact | 5 → 7 | plants hold their pixel for three frames at three places in the strip; a −0.6 … −2.9 st contact patch 6 rows deep under each planted paw that leaves with the paw; no slide, no float |
| 16 | Cleanliness | 5 → 6 | no tuft crosses a leg unphysically (the crossings in `walk_03`, `walk_06` are tufts in front); the pale tuft discs on the ground are a vegetation fault (§6 #1), not the strip's |
| 17 | Temporal | 6 → 7 | the planted pixel holds; body coherent across the strip; the contact patch is stable while the paw is down (rows under col 336: −2.2 / −2.9 / −2.9 st over three frames) |

**Top three weaknesses**
1. Every frame — the head is a fixed block on the neck: the nose row and the eye line do not move relative to the withers across `walk_00`–`walk_07` (3× crops); a walking cat's head nods 2–3 cm per stride and the ears track. Fix: a head-bob track keyed to the stance phase (±1.5 cm vertical, ±3° pitch) and a slow yaw drift (±8° over 2–3 s); target ≥ 2 px of nose travel between the two stance phases at 512.
2. `walk_05` col 258 — lift-off is flat-to-gone: the heel rises in `walk_05` but the toes do not stay down for a frame, and there is no toe re-plant at touch-down (`walk_02` col 258 is already flat). Fix: a toe joint with a 25° dorsiflex at lift-off and a 15° plantarflex at touch-down; target: in a 0.3 s strip, one frame per step where only the toe pad is on the ground. **Question:** the strip is 0.3 s per frame — a faster strip (0.1 s) would settle whether the toe-off exists and is just missed.
3. The contact patch is a disc (12 px wide, 6 rows) with the same darkness under a forepaw and a hind paw (−2.2 / −2.9 st peaks); the hind paw is larger and the shadow should be an ellipse along the stride. Cosmetic; keep it.

**Regressions.** None. **Must not regress.** Three-frame plants at the pixel; the contact patch under every planted paw (≥ 0.5 st, ≤ 8 rows deep at this camera); the flexion; the tail swing.

---

## 9 Lighting & atmosphere

Frames: every hour of every family; `truck_night/moon.png` for the moon.

Night (`truck_night/hero.png`): sky (300,0,640,10) 0.0233 → 0.0121, hue 224° → 225°, sat 0.67 → 0.55; ground (450,300,640,360) 0.0094 → 0.0186, hue 3° → 242°, sat 0.36 → 0.15; ground/sky −1.31 → +0.62 st in this view; `mainroad` sky 0.0187 → 0.0136 (sat 0.69 → 0.57), ground 0.0250 → 0.0230 hue 232°; camp pad 0.71 of the band. Sky boxes over 0.35 outside the bar's columns: 0 → 2 px. Bar: nine pods, troughs 0.12–0.25 (640 hero), 0.15–0.32 (640 front), 0.13–0.24 (1280); pod peaks 0.71–0.73; `ultra_night/hero.png` > 0.7: 449 → 293 px. Headlamp pools (§1): dusk front 14 341 px > 0.6 at Ymed 0.60; night front 20 680 px. Beam cone (0,170,120,230) hue 32°, sat 0.31 → 0.20. Dusk sky (`truck_dusk/front.png` rows 0–50) 0.384 → 0.354, hue 31° → 23°, sat 0.36 → 0.29 — a paler, hazier dusk; the dusk `hero` frame Ymean 0.067 → 0.148 (+1.1 st) with the haze. Fire: reach collapsed (§4). Camp shade edge 10.5 → 17 px; lion contact −0.4 → −1.0 st; walker contact patch present. **Moon** (`truck_night/moon.png`, new): a disc 6 × 5 px at (443,64,449,69), Ymax 0.83, sRGB (0.351, 0.407, 0.531) — a cool white; corona from the centre +3.6 st at r = 2 px, +2.4 at 4, +1.5 at 10, +1.0 at 14, +0.6 at 24 px against a sky of 0.0134 — a tight corona about 1.3° to the +1 st point at a 60° horizontal field (6 px ≈ 0.55° on that assumption); 181 star blobs over 0.1 in rows 0–200 and a Milky Way band; the lookout tower and grass in the foreground. `truck_day/moon.png` and `truck_dusk/moon.png` show the sun's aureole (58 323 and 14 187 px > 0.5) — no moon disc is discernible in either.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 8 | Lighting | 8 → 7 | **up:** pods separate at 1280 (target beaten), moonlit soil blue-grey, dusk crowns lit through, mess pockets filled. **down:** headlamp pools blown in both front views (dusk pool +0.8 st over the sky), the campfire lights 6 % of its frame (was 37 %) |
| 9 | Shadows | 6 → 7 | the round's shadows moved: mess edge 10.5 → 17 px, lion contact −1.0 st, a contact patch under every planted paw in the strip; the canopy's shade density overshot (−0.57 st) |
| 10 | Reflections | 6 → 7 | the windscreen returns a sheen from outside; bonnet and door gradients; the mirror's plain 0.46 st closer to the ground beside it |
| 11 | Color / atmosphere | 6 → 7 | night soil blue-grey under a sky of sat 0.55 (I asked 0.45–0.5; close); flame orange again; dusk paler (sat 0.29) with a haze band — plausible for a dusty dusk |
| 14 | Detail density | 6 → 7 | the moon: a 6 px disc with a tight corona; 181 stars over 0.1 and the Milky Way in `moon.png` |
| 16 | Cleanliness | 8 → 7 | 1639 / 5977 px > 0.7 in the front views; nothing > 0.9 anywhere; sky boxes clean (2 px over 0.35 outside the bar) |

**Top three weaknesses**
1. `truck_dusk/front.png`, `truck_night/front.png` — the pools (hero #1). Target dusk pool Ymed ≤ 0.30, ≤ 50 px > 0.7; night ≤ 8 000 px > 0.6.
2. `camp_night/camp_fire_night.png` — the fire's reach (campground #1); the same frame is the only one in the set where the temporal question of the round — does the flame flicker — could be judged, and one frame cannot judge it. **Question:** a two-frame fire pair 0.1 s apart (as the walk strip) would settle whether the tongue moves.
3. `truck_night/hero.png` — ground +0.62 st over the upper sky in this view where round 5 had it −1.3 st under, with the sky itself 1 st dimmer (0.0121). A moonlit plain can sit near the horizon sky's level; over it, with the sky this dark, the horizon reads as a dark band over a lit floor. Fix: sky band ×1.4 (back toward 0.017) with sat held at 0.55; target ground within ±0.3 st of the upper sky in `hero`, pad ≤ 0.75 of the band.

**Regressions.** Lighting 8 → 7 and Cleanliness 8 → 7 (the pools, the fire) — one point each.

**Must not regress.** Pods separate; no disc in the night sky; moonlit soil blue-grey; dusk crowns ≤ 2.5 st; the mess pockets; the moon's disc and corona; stars in `moon.png`.

---

## 10 Performance

From `stats.json` only (fast 640×360; ultra 1280×720).

| set | view | R5 calls / tris / programs / textures | R6 |
|---|---|---|---|
| truck_day | hero | 488 / 2.183 M / 175 / 293 | 486 / 2.177 M / 175 / 292 |
| truck_day | mainroad | 611 / 2.942 M / 176 / 304 | 622 / 2.956 M / 176 / 303 |
| truck_day | rear | 656 / 2.834 M / 175 / 302 | 658 / 2.841 M / 175 / 301 |
| truck_day | moon | — | 510 / 2.269 M / 176 / 303 |
| truck_dusk | hero / rear | 552 / 2.498 M ; 720 / 3.149 M | 549 / 2.490 M ; 721 / 3.153 M |
| truck_night | hero / rear | 537 / 2.486 M ; 704 / 3.138 M | 533 / 2.477 M ; 705 / 3.141 M |
| ultra_day | hero / interior | 639 / 3.366 M / 178 ; 778 / 4.617 M / 179 | 637 / 3.372 M / 178 ; **654 / 3.476 M** / 179 |
| ultra_night | hero / road | 661 / 3.391 M / 179 ; 677 / 3.415 M / 180 | 658 / 3.398 M / 179 ; 677 / 3.422 M / 180 |

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 18 | Browser performance | 5 → 5 | calls within ±2 % on every re-shot view; `ultra_day/interior` −16 % calls, −25 % triangles; programs flat (175/176 fast, 178–180 ultra); textures −1 everywhere; the new `moon` views 430–547 calls. Still 2.2–3.2 M triangles and 490–720 calls a frame at fast |

**Weakness.** `truck_*/rear.png` 658 / 721 / 705 calls — the roadside kit behind the truck, as round 5. The `ultra_day/interior` drop shows a merge is possible; do the same for the kit.

---

## Native-resolution ultra sets (observations that fed the scores)

- `ultra_day/hero.png` — nine unlit pods, sidewall lettering, lug chamfer and sipes; the screen carries a grey sheen over the cab; 1538 px > 0.7 (1213), all on lamp lenses, chrome and the roof box; nothing > 0.9.
- `ultra_day/interior.png` — no checkerboard on the panes (gradient ratio 0.76); the door mirror returns sky / horizon / sand / flank; rear-view a static card as before; 654 calls (778).
- `ultra_day/mainroad.png`, `forest.png` — ridges 0.76 and 0.81 of the sky over them; the forest range is a band under the sky with a soft top, not a slab, at both resolutions and in both rounds under the consensus method.
- `ultra_night/hero.png`, `road.png` — nine pods at 0.72–0.73 with troughs 0.13–0.24 (pods separate at native resolution — the round-5 carry closed); ground hue 240–257°, sat 0.13–0.16; the `road` view still has the bar at the top edge (the view, both rounds); no clipping.
- `ultra_camp/camp_mess.png`, `camp_gate.png` — as round 5 (mean |Δ| 0.029 / 0.011): firewood end grain, the sign-post edge speckle, ridges 0.84.
- `ultra_lions/lion_close.png`, `lion_face.png` — the new head: brow ridge, lid margins, nose leather, whisker spots, ruff; muzzle still a box with a drawn mouth; catch-lights dimmer (0.48 / 0.56); pale straw around the lie-up; ellipsoid domes in the water as before.

---

## Verdict

**Gate: pass.** The round's three categories are flat or up in every family where they are scored: Animation — lion feet 6 → 7 (the hero car's is unscored: no frame shows it moving); Physics / contact — hero 8 → 8, fleet 7 → 7, lions 6 → 7, lion feet 5 → 7; Temporal — car glass 5 → 6, lion feet 6 → 7. The walk strip is the round's evidence: planted paws hold their pixel for three frames at three places, and each has a −0.6 … −2.9 st contact patch under it that leaves with the paw — round 5 measured +0.00 st under every stance foot. No previously approved category drops by more than one point. The one-point drops are all one cause each: **Lighting 8 → 7 and Cleanliness 8 → 7 in Hero car and in Lighting & atmosphere** (the headlamp pool is blown in the head-on `front` views — dusk sand at Ymed 0.60, +0.8 st over its sky, 1639 px > 0.7; night 20 680 px > 0.6, 5977 > 0.7), and **Campground Lighting 8 → 7** (the campfire lights 6 % of its frame where it lit 37 %; ground 3 m out −1.0 st). Two round-5 must-not-regress lines are broken by those (dusk front 0 px > 0.7; fire reach ≥ 36 %) and one is half-broken (dusk rim +0.29 → +0.13 st, no category drop).

**Closed from round 5's blocking list:** the red moonlit ground (hue 3° → 242°, sat 0.36 → 0.15 in every night frame); the `forest` range "at the sky" — withdrawn, a method artifact (0.78 → 0.84 under the consensus ridge rule, in band both rounds). **Closed from the carried list:** pods on a lit strip at 1280 (troughs 0.59–0.63 → 0.13–0.24); the windscreen without sky from outside (hue 53° → 160°, Ymed 0.117 → 0.240); the cream flame (sat 0.29 → 0.53); the dark khaki turf (Ymed 0.163 → 0.341); the dusk crowns (−3.38 → −2.24 st, black 24 → 9.8 %); the ultra pane stipple; `moving` flick over its background (0.87 of it now). **Still open:** the mirror's painted plain (−0.65 st under the trail, sky −1.9 st); coat anisotropy (0.79); the box muzzle; no whiskers or claws; no dust or tyre print behind a cruising truck; ellipsoid boulders in the water; crown plates on forks.

**Corrections to my round-5 report:** the `forest` range was in band (see above); `safari-jeep_0_night`'s "lantern glare in the bonnet" is the jeep's own lit headlamp.

**Weakest object in the game:** still the lion at 1280 — but it is a cat now, not a plush: brow, lids, nose leather and ruff are there; the muzzle is a box with a drawn mouth and there are no whiskers. The weakest single picture in the set is `truck_dusk/front.png`: a white sheet of sand under a truck whose grille is lit from below by its own pool.

**Family means (R5 → R6, over the categories scored in both rounds):** Hero car 7.13 → 7.13 (114/16 both; +2 Reflections/Color, −2 Lighting/Cleanliness) · Car glass 6.67 → 7.00 · Fleet 6.54 → 6.77 · Campground 6.64 → 6.64 · Road & terrain 6.40 → 6.50 · Vegetation 6.09 → 6.27 · Lions 6.00 → 6.57 · Lion feet & gait 5.50 → 6.75 · Lighting & atmosphere 6.67 → 7.00 (6 categories; round 5 quoted 6.80 over the 5 that had a round-4 score) · Performance 5.00 → 5.00 · all scored categories 6.46 → 6.72 (n = 95).

**Five biggest findings.**
1. The walk strip has ground contact: three-frame plants at the pixel (cols 336, 258, 182) with a 6-row contact patch of −0.6 … −2.9 st under each planted paw that vanishes the frame after lift-off; carpal and hock flexion on the swing leg; tail swing; a following cub. Head rigid, no toe-off roll.
2. The headlamp pool is blown in both head-on `front` views: dusk sand Ymed 0.60 under a 0.35 sky (14 341 px > 0.6, 1639 px > 0.7, grille p95 0.076 → 0.282 from the bounce); night 20 680 px > 0.6, 5977 px > 0.7, 52 % of the sand rows over 0.5.
3. The campfire got its colour (core sat 0.53) and lost its light: warm-lit 37.4 → 6.2 % of the frame, ground 3 m out 0.101 → 0.049, the glow ring at 60 px 0.125 → 0.060; the flame a single 21 × 32 px tongue.
4. Night is fixed where it was red: soil hue 242° sat 0.15 under a sky of hue 225° sat 0.55 in every night frame, nine pods with troughs ≤ 0.25 at 1280, the moon a 6 px disc with a +1 st corona at 14 px, sky boxes clean. The sky is 1 st dimmer than round 5 and the hero's ground now sits +0.6 st over it.
5. The lion's head is a cat's at 512 (brow, lids with dark margins, nose leather, ruff; Silhouette and Geometry 6 → 7) and the pride plain is pale straw (turf Ymed 0.163 → 0.341); the dusk rim lost half its lift with its dots (+0.29 → +0.13 st, 72 → 34 columns), and the coat still has no lie (anisotropy 0.79).

**Questions a frame could not settle.**
- Was round 5 shot with the deterministic pre-roll? The truck's heading, roll and distance differ in every fixed view (`forest`: rolled vs upright; `front`: quarter vs head-on; mean |Δ| 0.16–0.32 on truck frames vs 0.01–0.05 on camp frames), which is why the pools are in frame this round and were not last round.
- Does `moon.png` aim at the moon at day and dusk? Both frames hold the sun's aureole (58 323 / 14 187 px > 0.5) and no disc; if the moon is within ~10° of the sun at those hours it is new and rightly invisible — but then the view should be documented as such.
- What does `flickBg` measure for `mirror` — the world the pane reflects, or the frame around the pane? Its 4.4× ratio (0.008 vs 0.002) is either a real re-sampling flicker on a painted card or an incomparable baseline.
- Does the flame move? One frame per hour cannot judge the campfire's temporal behaviour; a two-frame pair 0.1 s apart would.
- Is there a toe-off at all? At 0.3 s per frame the paw goes from flat to gone; a 0.1 s strip over one step would show whether the toes leave last.
- Is `night_ext`'s see 0.962 → 0.876 the pane or the tool's `bgLuma` under a sky 1 st dimmer?
- Does the truck raise dust when it moves? Every frame is at the shot after a cruising pre-roll and none has a particle or a fresh print; a frame 0.5 s into the pre-roll would settle whether the emitter exists.
