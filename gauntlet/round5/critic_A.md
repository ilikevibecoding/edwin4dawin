# Gauntlet round 5 — Critic A

**Incumbent:** round 4, build `80cb5e6`, `shots/round4/` (`lions_walk_fixed/` for the walk strip).
**Candidate:** round 5, `shots/round5/`: `truck_{day,dusk,night}/`, `glass/`, `ultra_night/` re-shot from `84c1e5e` (cruising pre-roll, body pitch 0.2°; the first-pass frames from `16028cf`, body 5.7° nose-down, are kept in `shots/round5_pitched/` and are no longer scored); `camp_{day,night}/`, `fleet/`, `lions_{day,dusk,walk}/`, `ultra_camp/`, `ultra_lions/` from `0dc79bb`. `shots/round5/ultra_day/` is empty at the time of the re-judge, so the `ultra_day` observations below come from the pitched set and are marked as such. The car builder's round-6 commit (`5dc56cd`) is not in any frame and is not scored. The fleet frames predate fleet r4 (`8611235`) and are scored as shot.

**Frames looked at:** every candidate frame beside its incumbent pair — 30 `truck_*`, 13 `glass/` + `metrics.json`, 24 `fleet/`, 10 `camp_*`, 10 `lions_day` + `lions_dusk`, 8 `walk_00..07`, and the ultra frames (`ultra_night/` hero, road re-shot; `ultra_camp/` mess, gate; `ultra_lions/` close, face; `ultra_day/` hero, road, mainroad, forest, interior from the pitched set only). `hud.png` not scored (no HUD family this round). `stats.json` in `truck_*`, `ultra_night` (and the pitched `ultra_day`) for Performance.

**Method.** PIL + numpy/scipy scripts under `/tmp/criticA/r5/` and, for the re-judge, `/tmp/criticA/r5b/` (nothing in the repo). Linear luma Y from sRGB-decoded pixels (0.2126 R + 0.7152 G + 0.0722 B); stops = log2 of a Y ratio; hue/sat from the region mean or per pixel where stated; fractions over a threshold; 4-connected blob labelling; peaks along a row for the light bar. Boxes are `(x0, y0, x1, y1)` at the frame's own resolution: `truck_*`, `glass/` 640×360; `camp_*`, `lions_*` 512×288; `fleet/` 480×270; `ultra_*` 1280×720. Hills: ridge-row method per column — skyline = the largest downward luma step top-down; hill = rows +2..+8 under it; sky = rows −18..−4 over it; columns kept only where the step is ≥ 0.03 linear (≥ 0.012 where stated) and the hill's hue is 170–270° (drops trees, vehicles, poles, and columns of open sky — see §5 for the one I first got wrong). Walk strip: median of the eight frames as background, |frame − median| > 0.25 for the body, > 0.10 in the 15 rows above the body's bottom edge for the feet, then the ground-row clusters' centre columns per frame. Source read only via `git show 16028cf:<path>` / `git show 0dc79bb:<path>` / `git show 84c1e5e:<path>`. I have not read the other critics' files.

**Capture note (not scored).** In the re-shot truck frames the body is level (no nose-down; the roll of the cornering truck is the same as round 4's). The truck stands on the round-4 spot but heads ~20° differently and sits ~18 % larger in the fixed views (lit bar span in `truck_night/front.png` 113 → 133 px), so `hero`, `front`, `dusk/hero` are not pixel-comparable and I compare like regions, not pixels. The `glass/` cameras are back on the cab: `interior.png` has the round-4 framing (wheel, dash, screen, door mirror at left), and `mirror.png` holds the pane. The low `road` camera puts the light bar at the top edge of the frame in both rounds (`truck_night/road.png`, `ultra_night/road.png`); that is the view, not the pose.

---

## Claims checked against the frames

| Claim (CHANGELOG / commit) | Frame, box | Measured | Holds? |
|---|---|---|---|
| Beam-slice discs gone from the night hero | `truck_night/hero.png` | R4 disc blob 428 px > 0.35 at (62,53,86,77), Ymax 0.54; R5 no blob ≥ 12 px over 0.35 above the bar's bottom row outside the bar box and the lamps (the one 11 px blob at (341,96) is a specular on the snorkel cap) | yes |
| Light bar reads as nine pods; hero box over 0.5 1449 → 417 px; front view shows nine peaks | bar box R4 (235,51,317,89), R5 (220,55,335,105); `truck_night/front.png` (236,74,372,117) | hero > 0.5: 1435 → 218 px; > 0.35: 1978 → 358; column peaks over 0.5 on the bar 10 with troughs 0.70–0.71 (a slab) → 9 (cols 234, 242, 248, 256, 263, 272, 280, 288, 296) with troughs 0.21–0.52 under peaks of 0.74; front: 9 peaks (238 … 333), troughs 0.44–0.59 | yes (218, under the 417 quoted and the 300 target; the bar is foreshortened in this heading) |
| Night mainroad ground median 0.011 → 0.023 | `truck_night/mainroad.png` (200,250,440,360) | 0.0113 → 0.0233 | yes |
| Pad ≤ 0.7 of the horizon band at night | `camp_night/camp_arrive_night.png` pad (150,200,400,285) vs band 10 rows over the skyline (row 118) | pad 0.0146, band 0.0289, ratio 0.51 (R4 0.52) | yes |
| Moon a 0.5° disc with a tight corona | any night frame | the moon (el 43°) is not in any frame; the bright blobs are lamps | untestable |
| Dusk sand brighter than the sky is the headlamp pool; `BEAM.dusk` lowered | `truck_dusk/front.png` | R4: > 0.6 pool blob 976 px at (328,274,454,313), sand rows 250–360 over 0.5: 16.5 %. R5 level: no ground blob over 0.6, 0.0 % of the sand rows over 0.5, frame over 0.7: 304 → 0 px. With the body level the beams (`BEAM.dusk.beam 22`) run out along the trail instead of into the sand 10 m ahead, so the pool is out of this frame; the pitched frame still had 5.1 % | yes in the frame (pose-dependent) |
| Dusk grille under sky p95 + 0.1 | `truck_dusk/front.png` grille R5 (235,190,360,232) | p95 0.076, median 0.010 vs sky rows 0–50 p95 0.470 (R4 0.27 vs 0.42): the grille is a black mesh with two dim lamp bowls | yes |
| Door mirror toed in 22°, the seat sees horizon and flank | `glass/mirror.png` pane (378,30,495,230); `glass/interior.png` pane (75,115,130,200) | the pane is in the frame and shows, top to bottom, sky (11 % of the pane, Ymed 0.271), a hard horizon with one acacia crown, a plain (46 %, Ymed 0.127) and the truck's own flank with its laterite film (R4's pane had the flank as a black quadrant). Tool: see 0.331 → 0.890, veil 0.215 → 0.079, cover 19.4 → 64.8 %. From the seat the same content at 50 px wide | yes |
| Day panes side_shade see 0.68 → 0.93, ws_mid 0.79 → 0.89 | `glass/metrics.json` | 0.678 → 0.919; 0.787 → 0.874 | yes / short by 0.016 |
| Dust to the sills, wiper arcs | `glass/ws_close.png` pane lower band (120,240,400,268) vs mid (120,150,400,200) | lower band +1.3 st over the mid pane (R4 +1.4 st): the base-of-screen dust gradient was already there; what changed is a thinner film (mid Ymed 0.131 → 0.103); no arc resolved at 640, wipers parked | film thinner; arcs not shown |
| Clearcoat over satin base | `truck_day/hero.png` bonnet | bonnet median per row (x 170–250, rows 151→181): 0.303, 0.331, 0.257, 0.222, 0.161, 0.162, 0.094, 0.089, 0.081, 0.080 — a graded sky; R4 0.34–0.375 flat. Door skin (x 340–420, rows 150→210) 0.145 → 0.078, R4 0.05–0.09 flat | yes |
| Chamfered, siped lugs | `truck_day/wheel.png` (180,20,520,300), pitched `ultra_day/hero.png` (490,370,700,560) | the chamfer reads at 640 as a lighter bevel on each block's leading edge; the sipes read only at 1280 | chamfer yes; sipes at ultra |
| +2 programs at fast | `truck_day/stats.json` hero | 174 → 176 in the pitched set (`16028cf`); 174 → 175 in the re-shot set (`84c1e5e` carries fleet r4's one-program paint merge) | yes, net +1 in the frames scored |
| Pride turf: tuft cover 3.3 → 39.9 % of the lower third; straw mask 19 → 21 % | `lions_day/lion_pride.png` rows 192–288 | straw mask 19.0 → 20.5 %; khaki mask (hue 38–95°, sat > 0.15) 12.6 → 22.5 %; open plain (150,250,300,285) 17 → 49 %, but 8 → 9 % in the two boxes right in front of the lions (60,235,130,260), (300,235,380,260) | partly — the turf is in the middle of the plain, not under the lions |
| Dusk crowns −3.33 → −2.13 st vs sky | `truck_dusk/forest.png` acacia (250,30,600,120), crown = Y < 0.5 sky | crown median −4.51 → −3.32 st; pixels < 0.01: 35.8 → 20.3 % | +1.2 st holds; still 0.8 st under the ≤ 2.5 st target |
| Tuft self-shadow, plain median −0.5 st | `lion_pride.png` lower third | Ymed 0.199 → 0.150 (−0.41 st) | yes |
| Hills mainroad 0.67 → 0.80, lion_far 0.55 → 0.71, pickup 0.63 → 0.75, camp_beyond 0.80 → 0.72 | ridge rows, table in §5 | 0.63 → 0.80; 0.50 → 0.75; 0.63 → 0.81; 0.85 → 0.76 | yes, better than claimed on `pickup` |
| Water hole −0.44 → −0.26 st under the sky, +0.97 st over the mud ring, grey → blue-grey | `lion_far.png` pool (130,112,260,124); `lion_side.png` open water (80,128,200,150) | far pool −0.96 → −0.51 st vs sky, +0.65 st over its rim; side open water −0.40 → −0.56 st; colour hue 28° sat 0.16 → hue 10° sat 0.08 — greyer, not bluer; the kopje's reflection box (0,128,55,150) is the only blue (hue 240°, sat 0.04) | half |
| Mess: under table 2.83 → 1.44 st, chairs 3.92 → 1.93; pockets stay 2.5 st | `camp_day/camp_mess.png` | under table (275,205,305,220) −3.66 → −1.88 st; under chairs (330,205,360,222) −2.48 → −1.53; open floor (250,235,330,255) −2.39 → −1.90; darkest 8×8 pocket −4.26 → −3.38 st at (404,223) | yes; worst pocket 3.4 st |
| Fire ground sat within 3 m 0.756 → 0.449, 8 m 0.551 → 0.369 | `camp_night/camp_fire_night.png` | near ground 0.702 → 0.421; 8 m 0.554 → 0.418; flame core sat 0.533 → 0.238 | yes — and the flame went with it |
| Row lanterns light the row | `fleet/*_night.png` | body/sky: jeep_1 0.28 → 2.65, camper 1.26 → 1.76; suv 0.70 → 0.59, ranger 0.43 → 0.26 (shadow side) | mostly |
| Lion contact decal multiplies (blue +26 → 0, sat −0.20 → +0.01 at dusk) | `lions_dusk/lion_close_dusk.png` under chest (330,232,380,250) vs beside (405,232,470,250) | blue +0.068 → −0.007 sRGB, sat −0.11 → +0.01, Y +0.49 → +0.03 st | yes |
| Dusk rim +0.24 st on the top 3 px of the dorsal outline | same frame, outline x 270–420 | rim rows (edge..+3) vs interior (+10..+20): −0.35 → −0.15 st (+0.20) | yes, and it is dotted (see §7) |
| Terrain samplers 21 → 13; collision | — | not visible in frames | not scored |

---

## 1 Hero car

**Re-judge (frames re-shot from `84c1e5e`, body level).** Two things moved. The bonnet-lip glint that was weakness #3 (dusk hero 511 px pale blob, ultra day 212 px over 0.7) is not in the level frames — no pale specular blob over 15 px on any paint in `truck_dusk/hero.png`, and `truck_day/hero.png` has no paint blob over 0.7 larger than 9 px — so it was the nose-down chamfer catching the sun, and it is dropped; Cleanliness goes 7 → 8 with it. The door mirror is in the `mirror` frame and returns a horizon and the flank (it was weakness #1 — a dark disc — measured on a shot aimed under the pane and an interior camera that had fallen forward), so Reflections 7 stands on more than the bonnet now. The bar box is 218 px over 0.5 (was 326 pitched; target 300). Everything else — Materials, Lighting, Shadows, Color — was re-measured on the new frames; the numbers in the table are the new ones, and none of them moves a score (the largest shift is the contact shadow, −5.9 → −5.5 st, still a point-holding contact).

Frames: `truck_{day,dusk,night}/{hero,front,rear,wheel,detail,interior,forest,road,mainroad}.png`, `ultra_night/{hero,road}.png`; `ultra_day/{hero,interior}.png` from the pitched set only (the re-shot `ultra_day/` is empty).

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | same spot, level body, heading ~20° off round 4's and ~18 % larger in the fixed views; the low `road` camera has the bar at the top edge in both rounds (`truck_night/road` rows 0–14, `ultra_night/road` 577 px > 0.5 in rows 0–12) — capture |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | lug chamfer reads at 640 (`wheel.png` (180,20,520,300): a lighter bevel on each block's leading edge, R4 blocks square); sipes only at 1280 (pitched `ultra_day/hero` (490,370,700,560)); the carcass shows pale between the blocks in both rounds |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 8 | paint is a clearcoated satin: bonnet row medians 0.331 → 0.081 (x 170–250, rows 154→181; R4 flat 0.34–0.375); door skin graded too now, 0.145 → 0.078 (x 340–420, rows 150→210; R4 0.05–0.09); paint-mask p50 0.076 → 0.131, p99 0.333 → 0.314, sat 0.46 → 0.48, hue 138° both; console black ABS with a lit radio face, dash matt (`interior.png` (400,180,640,300)) |
| 6 | Texture quality | 7 → 7 | flecks over the door skin: bright specks (Y > 1.8× the 5×5 median) 5.1 % and dark flecks 6.0 % of (300,150,430,205) — R4 7.2 % / 5.1 % in (150,110,400,200), so no change; they read as chips at 4×, as noise at 640 |
| 7 | Glass / transparency | 7 → 7 | panes clearer (see 0.80–0.96, §2); the screen carries nothing of the sky from the front quarter; door-glass edge shows the green thickness tint |
| 8 | Lighting | 7 → 8 | night: discs gone, nine pods (troughs 0.21–0.52 under peaks of 0.74; R4 0.70 — a slab), warm beam cone through the verge (0,170,120,230) hue 32° sat 0.31; frame > 0.7: 382 → 112 px, > 0.5: 2484 → 1061. Dusk: front frame > 0.7: 304 → 0 px, grille p95 0.076 under sky 0.470, lamp bowls dim and pale; hero frame > 0.7: 96 → 0 px. At 1280 the pods sit on a lit strip (weakness #2) |
| 9 | Shadows | 7 → 7 | contact holds: darkest ground under the truck (412,238) 0.0022 vs sunlit (450,300,640,360) 0.103 (−5.5 st; R4 −6.3); pitched `ultra_day/hero` under-bumper (300,520,420,560) −3.97 st, edge 16 px at col 360 (rows 548–564) |
| 10 | Reflections | 6 → 7 | bonnet, roof and now the door skin carry a graded sky; the door mirror returns sky / horizon / plain / flank (§2); the windscreen from the front quarter carries no sky (weakness #3) |
| 11 | Color / atmosphere | 7 → 7 | dusk amber holds with a black grille where R4 had a cream front (R4 grille block Y 0.249 vs sky 0.333); night ground under the truck hue 353° sat 0.22 → hue 3° sat 0.36 (450,300,640,360) — redder under a cobalt sky (§9) |
| 12 | Animation | — | |
| 13 | Physics / contact | 8 → 8 | tyres in the ruts at every hour; level body, roll as round 4 |
| 14 | Detail density | 7 → 7 | |
| 15 | Integration | 7 → 7 | |
| 16 | Cleanliness | 7 → 8 | nothing over 0.9 in any truck frame; no glint on the paint; bar bloom 358 px > 0.35 in the hero box (R4 1978); the only smears are the pods' halo at 1280 and the door flecks, both carried from R4 |
| 17 | Temporal | — | |
| 18 | Performance | 5 → 5 | `stats.json` hero: calls 488 → 488, tris 2.169 → 2.183 M, programs 174 → 175, textures 295 → 293; rear 605 → 656 calls (+8 %), 2.712 → 2.834 M tris |

**Top three weaknesses**
1. `truck_night/hero.png` (450,300,640,360), `ultra_night/hero.png` (900,600,1280,720), `ultra_night/road.png` (900,600,1280,720) — the moonlit ground is red: hue 3–6°, sat 0.32–0.37, sRGB (0.145, 0.094, 0.092) under a sky of hue 220–224° sat 0.59–0.67 (ground/sky in the hero −1.31 st). `groundIndirect 1.4` (`src/sky.js` L729) now really multiplies `reflectedLight.indirectDiffuse`, and that term includes the terrain's own `albedo * mix(0.5, 0.17, share) * ambientOcclusion` bounce (`src/terrain.js` L3318 — albedo squared) and the `vec3(1.09, 1.0, 0.9)` warm bias (L3276). Fix: gate both by the hour — `uBounceFollow 0 → 1` as the hand-off comment at L3312–3316 says, so the bounce follows the night irradiance's colour and level, and add a `uBounceWarm` uniform beside `uTodIndirect` (`src/sky.js` L2183; 1 by day, 0 at night) so the bias reads `mix(vec3(1.0), vec3(1.09, 1.0, 0.9), uBounceWarm)`; hold `groundIndirect 1.4` and re-measure `mainroad` (target 0.02–0.03) after.
2. `ultra_night/hero.png` bar (455,125,610,200) — nine pods at 1280, but joined: the column-max profile has nine peaks at 0.74 (cols 468, 482, 496, 511, 527, 541, 559, 575, 592) and the eight troughs between them at 0.59–0.63 — 0.3 st under the pods — so at native resolution the bar is one lit strip with nine brighter spots (one blob of 1984 px at > 0.5; the pods separate only at > 0.7, 35–51 px each). At 640 the troughs are 0.21–0.52 in the hero and 0.44–0.59 in `truck_night/front.png`. The strip is the cover's scatter plus the nine `headlight` discs' bloom overlapping at 14 px pitch. Fix: `src/vehicle/index.js` L135 `BEAM.night.cover 0.5 → 0.3`, and the cover's `applyLampGlow` (`src/vehicle/materials.js` L908) `core 3.0 → 2.0` with the `lampHot` lobe mask (`src/vehicle/body.js` L76–102) tightened so the cover's emissive between two lobes is under 0.1 of a lobe's peak; leave the `headlight` discs (`core 2.5`) and the night bloom (`src/post.js` L1212 `strength 0.55, radius 0.25, threshold 2.0`) alone. Target: troughs ≤ 0.45 at 1280 with the pod peaks still ≥ 0.7.
3. `truck_day/hero.png` windscreen (245,100,320,140) — from the front quarter the screen is hue 53°, sat 0.20, Ymed 0.117 (the seats and film behind it) under a sky of hue 216°, Ymed 0.29; R4's screen in the same view read hue 215°, Ymed 0.32 — a sky mirror. There is no blue anywhere in the pane at 5× (`/tmp/criticA/r5b/day_screen_new_x5.png`). A pane at 50–60° to the eye under a clear sky returns 6–9 % of it, which on this sky is 0.02–0.03 of luma — small but visible against a 0.12 interior. Fix as glass #1: `pane('glass')` (`src/vehicle/materials.js` L623) has `bw: { graze: 0 }` while the door glass has `graze 0.14`; give the screen `graze 0.12` (the `bwPaneOut` factor in `src/textures/vehicle.js` L690 keeps it off the cabin side, so `interior` see 0.80 does not move). Target: the box's hue moves ≥ 20° toward the sky's with `ws_mid` see ≥ 0.85.

**Regressions.** None. Night ground hue (Color 7 → 7, noted). `rear` +8 % calls (Performance 5 → 5, noted). The night bar box is 218 px over 0.5 — the 300 target is met in the frame (foreshortened bar); the front view's troughs of 0.44–0.59 say the pods are not yet fully separate.

**Must not regress.** Nine separate pods with no disc in the night sky (troughs ≤ 0.52 at 640); dusk front with 0 px over 0.7 and grille p95 under sky p95; the bonnet and door-skin gradients; the level body at the shot (pitch ≤ 0.5°); tyre contact in `wheel.png` at every hour; nothing over 0.9 in any truck frame; the door mirror's pane in `glass/mirror.png` and from the seat.

---

## 2 Car glass

**Re-judge (frames re-shot from `84c1e5e`, glass cameras back on the cab).** The two one-point drops that were the pose's were withdrawn: `mirror.png` now frames the pane (Composition 6 → 7), and the pane returns sky / horizon / plain / flank, so Reflections goes 4 → 6 — one over round 4, not more, because at fast the plain in the glass is a painted grade 1.1 st under the trail beside it and the windscreen still returns no sky from the front quarter. `interior.png` has its round-4 framing back, and with it the interior veil claim shrinks: 0.067 → 0.062 (the pitched frame's 0.042 was a different part of the screen). `moving` flick is 0.156 against R4's 0.099 (pitched 0.172) — the Temporal drop stands. Against the pitched frames the four exterior day panes moved ≤ 0.015 in see; the seat cameras moved more (interior 0.850 → 0.799, int_side 0.847 → 0.861) because they are back on the cab.

Frames: `glass/{ws_mid,ws_close,side_sun,side_shade,interior,int_side,rear_dust,moving,mirror,dusk_ws,night_int,night_ext}.png`, `glass/metrics.json`.

Tool numbers R4 → R5 — see: side_sun 0.670 → 0.957, side_shade 0.678 → 0.919, ws_mid 0.787 → 0.874, ws_close 0.867 → 0.925, moving 0.759 → 0.887, interior 0.789 → 0.799, dusk_ws 0.836 → 0.845, night_int 0.921 → 0.927, night_ext 0.927 → 0.962, rear_dust 0.873 → 0.857, int_side 0.875 → 0.861, mirror 0.331 → 0.890; veil side_shade 0.124 → 0.053, side_sun 0.087 → 0.031, ws_mid 0.113 → 0.089, moving 0.121 → 0.073, rear_dust 0.103 → 0.071, interior 0.067 → 0.062, mirror 0.215 → 0.079; flick moving 0.099 → 0.156, int_side 0.024 → 0.030, interior 0.015 → 0.015, mirror 0.013 → 0.016, others ≤ 0.021; hot 0, hidden 44, clip 0 % in all twelve. Mirror cover 19.4 → 64.8 % — the pane fills two thirds of the ROI.

The pane itself (`mirror.png` (378,30,495,230), crop `/tmp/criticA/r5b/mirror_pane_x4.png`): sky 11 % of the pane at Ymed 0.271, one hard horizon with a single acacia crown, plain 46 % at Ymed 0.127, the truck's flank below the beltline with its laterite film, dark 29 % (the flank's shadow side). Against the world in the same frame: sky (200,0,340,40) 0.374, trail (150,250,340,360) 0.275 — the mirrored sky is −0.47 st, the mirrored plain −1.11 st, so the mirror's ground/sky contrast is −1.09 st where the world's is −0.44 st. R4's pane (305,40,415,195): plain 75 % at 0.238 and the flank as a black quadrant (12 % under 0.02).

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | `mirror.png` frames the pane at 120 × 200 px with the trail and verge behind; `interior.png` is the round-4 view (wheel, dash, screen, door mirror at left) |
| 5 | Materials | 7 → 7 | neutral film, thinner (mid-screen Ymed 0.131 → 0.103 in `ws_close`); the base-of-screen dust band is +1.3 st over the mid pane (R4 +1.4) — the gradient was already there |
| 6 | Texture quality | 6 → 6 | no wiper arc resolved at 640 with the wipers parked; the film is an even veil still |
| 7 | Glass / transparency | 7 → 8 | see up in 10 of 12 panes (`int_side` −0.014, `rear_dust` −0.016), veil down 15–64 % on the day panes; the interior reads through every pane; the door-glass edge carries its thickness tint. The trade: the pane is nearly absent — nothing of the sky in `side_sun` (6–10° off the pane's normal, where that is right) and none in the screen from the front quarter (weakness #1) |
| 8 | Lighting | 7 → 7 | dusk_ws 0.845, night_int 0.927, night_ext 0.962 |
| 10 | Reflections | 5 → 6 | the door mirror returns a legible reflection from the `mirror` camera and from the seat (`interior.png` (75,115,130,200): sky, horizon, sand, flank with the dust film) — R4's black-quadrant flank is a painted door now; against that, the plain in the glass is 1.1 st under the trail beside it and featureless (no track, no tufts), the flank/plain edge is a curve, the screen carries no sky from the front quarter, and the interior rear-view is a static green-black card (`interior.png` (445,130,540,150)) |
| 11 | Color / atmosphere | 7 → 7 | |
| 16 | Cleanliness | 7 → 7 | hot 0, clip 0, hidden 44 at fast; at ultra every pane seen from the seat carries a 1-px checkerboard stipple (pitched `ultra_day/interior.png` (40,120,140,220): the sky through the door glass alternates two values pixel by pixel; pose-independent, not re-checked because the re-shot `ultra_day/` is empty) |
| 17 | Temporal | 6 → 5 | `moving` flick 0.099 → 0.156 (×1.6), `int_side` ×1.25, `interior` and `mirror` ×1.0–1.2 |

**Top three weaknesses**
1. `truck_day/hero.png` windscreen (245,100,320,140), `ws_close.png` — the screen from outside returns no sky: hue 53°, sat 0.20 against a sky of hue 216°; R4's screen in the same view read hue 215° (a sky mirror at veil 0.11). The side views are not the place to look for this: `side_sun`/`side_shade` sit 6–10° off the pane's normal (camera `[2.15, 1.72, 0.55]` → `[0.85, 1.66, 0.42]`), where 4 % Fresnel of a 0.35 sky is a 0.014 veil, so the clean pane there is right. Fix: `pane('glass')` (`src/vehicle/materials.js` L623) has `bw: { graze: 0 }` while the door glass has `graze 0.14` gated from 50° (`src/textures/vehicle.js` L690 `gzG = uBwGraze * smoothstep(0.36, 0.9, gzE) * bwPaneOut`); give the screen `graze 0.12` — the `bwPaneOut` factor keeps it off the cabin side, so the `interior` veil (0.062) does not move. Target: the box's hue moves ≥ 20° toward the sky's with `ws_mid` see ≥ 0.85 and `ws_close` see ≥ 0.90.
2. `glass/mirror.png` pane (378,30,495,230) — the reflected plain is 1.1 st under the trail beside the mirror and has no feature in it; the flank meets it along a curve. At fast the pane is `materials.mirrorGlass` (`src/vehicle/materials.js` L284: metal, roughness 0.02, PMREM at 1.0) with `applyMirrorHorizon` (`src/textures/vehicle.js` L715) grading everything under the horizon: the PMREM plain × `ground (1.0, 0.86, 0.74)`, pulled a third to grey, then × `groundNear (0.3, 0.27, 0.25)` over `smoothstep(−0.08, −0.7, mhUp)` — which starts darkening 4.6° under the horizon, where the whole visible plain sits, and is what puts the plain at 0.127. Fix: start the near-darkening at `−0.3` (17°, the ground within ~5 m of the pane, which is where the truck's own shadow is) — `smoothstep(−0.3, −0.9, mhUp)` — and hold `ground` at unit luma (1.06, 0.98, 0.9); the flank envelope's `mhBox` edges at `mhE = 0.02 + 0.01 * mhT` are fine, the curve is the pane's own convexity (`convexPane(0.136, 0.163, 0.32)`, `src/vehicle/body.js` L2428 — a 136 mm pane on a 0.32 m sphere), leave it. Target: mirrored plain within 0.5 st of the trail beside the mirror, sky within 0.3 st. Longer term the seat should get the live pane at fast too — `liveMirrorsWanted` (`src/vehicle/mirrors.js` L68) is `high || ultra`; a `NEAR 5` gate that also fires at fast when the camera is inside the cab (interior cameras only, dist < 1.5 m) costs the 98-call pass only from the seat, where the pane is 50 px wide and the painted plain is what the eye lands on.
3. `glass/moving.png` flick 0.156 (0.099), and the ultra stipple. Flick is the tool's mean |ΔY| over the pane between two renders 2 mm apart (two sim steps for `moving`), and it rose in every pane that got clearer (see +0.01 … +0.29) — most of the rise is the scene behind a thinner film, which is not a pane fault. What is a fault is the 1-px checkerboard over every pane at ultra (pitched `ultra_day/interior.png` (40,120,140,220) and round the mirror): a per-pixel screen-space pattern on the glass layer, which at ultra is the SSR pass (`src/post.js` `REFLECTORS.glass/glassSide/cabinGlass` on `SSR_LAYER`, tier `ssr: { steps 40, refine 5, blurTaps 4 }`) with its jittered start and too few taps. Fix: A/B the interior frame with `?ssrpane=off` (the flag exists: `uPaneDepth`); if the stipple goes, `blurTaps 4 → 8` on the pane path or keep panes off `SSR_LAYER` at ultra; and report flick normalised by transmission (flick / see) so a clearer pane is not scored as a flickering one.

**Regressions.** Temporal 6 → 5 (`moving` flick 0.099 → 0.156) — one point. Composition and Reflections no longer drop (the drops were the pitched shot's).

**Must not regress.** The pane in `mirror.png` with a horizon in it and `cover ≥ 60 %`; the seat's view of the mirror in `interior.png`; hot 0 / clip 0 on every pane; `night_int` see ≥ 0.92; `dusk_ws` ≥ 0.84; the interior reading through the screen; door-glass edge tint.

---

## 3 Fleet

Frames: `fleet/*_{day,night}.png` (480×270), as shot from `0dc79bb` (before fleet r4).

Day frames are the same picture as round 4 (mean |Δ| per pixel 0.016–0.024; only the hills changed). Night frames: mean Y ×2–4 (jeep_1 0.0092 → 0.0442, utility 0.0104 → 0.0522, ranger 0.0111 → 0.0349, suv 0.0142 → 0.0301); sky Ymed 0.013 → 0.033, hue 224°, sat 0.63–0.66. Body/sky: jeep_1 0.28 → 2.65 (lit by the parked pickup's lamp), camper 1.26 → 1.76, suv 0.70 → 0.59, ranger 0.43 → 0.26 (shadow-side door; the hut behind it is lit warm). Ground under the unlit vehicles 0.0048 → 0.0133 (suv). Trailer frames now framed (tool); `trailer_0_night` 0 % over 0.7 both rounds.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 7 | `trailer_0_{day,night}` show the trailer and its jerry cans — the round-2 tool defect is closed |
| 2 | Silhouette | 6 → 6 | |
| 3 | Geometry | 6 → 6 | motorcycle wheel unchanged in these frames (fleet r4 not in them) |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 7 | day frames identical; chrome/alloy as round 4 |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | 6 → 6 | magenta 0 % |
| 8 | Lighting | 6 → 7 | the row is lit: lanterns on the poles over the dark vehicles, pools under lamps only; `safari-jeep_2_night` own wing lamp lit with a pool +0.95 st over the far ground (0.037 vs 0.019). Against: the lantern's reflection in `safari-jeep_0_night`'s bonnet is a 461 px blob over 0.5 at (238,145), Ymax 0.73 — the biggest bright thing in the frame, reads as a lamp on the bonnet; `jeep_2` 687 px |
| 9 | Shadows | 7 → 7 | |
| 11 | Color / atmosphere | 6 → 7 | cobalt sky ×2.5 brighter, vehicles legible in every night frame (`ranger_0_night` body still the darkest at 0.26 of the sky) |
| 13 | Physics / contact | 7 → 7 | |
| 14 | Detail density | 6 → 6 | |
| 16 | Cleanliness | 6 → 6 | glare blobs 461–687 px over 0.5 on the jeep bonnets; trailer tarp 0 % hot |

**Top three weaknesses**
1. `fleet/safari-jeep_0_night.png` (170,80,330,200) — lantern glare in the bonnet paint, 461 px over 0.5, 117 px over 0.7 in the frame. Fix: `src/campground/index.js` L207 `rowLamp{i}` `intensity 26, distance 20, decay 1.6` at 0.62 m in front of the pole — a lantern 4 m over a bonnet at 26 is a floodlight; `intensity 26 → 16` with `distance 20 → 24` keeps the row bodies at their Y (jeep_1 0.087) and drops the specular peak by 0.7 st; and the fleet paint's clearcoat lobe needs the same `clearcoatRoughness` floor as the hero's (0.15) so a point light is a soft highlight, not a disc.
2. `fleet/ranger_0_night.png` — the ranger's near side is 0.26 of the sky (Y 0.0086) while the hut behind it is lit: the lantern is behind the vehicle. Fix: `plan.rowLamps` poles (u −8.6 / 10.0) — add a third lantern at the ranger's end of the row, or turn the second pole's `facing` 30° toward the ranger; target body Y ≥ 0.02.
3. `fleet/motorcycle_0_day.png` — front wheel a notched polygon, one lug row (pre-r4 frame). Score the r4 motorcycle when it is shot.

**Regressions.** None.

**Must not regress.** Pools only under lit lamps; magenta 0 %; trailer framing; night vehicles legible (body/sky ≥ 0.26 on the darkest).

---

## 4 Campground

Frames: `camp_day/{camp_arrive,camp_beyond,camp_gate,camp_interior,camp_mess,camp_overhead}.png`, `camp_night/{camp_arrive_night,camp_fire_night,camp_gate_night,camp_mess_night}.png`, `ultra_camp/{camp_mess,camp_gate}.png`.

Shade (`camp_mess.png`, sunlit pad Ymed 0.351/0.299 L/R both rounds): open floor (250,235,330,255) −2.39 → −1.90 st; under the table (275,205,305,220) −3.66 → −1.88; under the right chairs (330,205,360,222) −2.48 → −1.53; darkest 8×8 pocket −4.26 st at (296,207) → −3.38 st at (404,223). Shade edge, 10–90 % width along columns 270–342: median 12 px in both rounds (R4 10–22, R5 10–29). Fire (`camp_fire_night.png`): flame core sRGB (0.848, 0.685, 0.400) sat 0.53 → (0.740, 0.665, 0.565) sat 0.24; ground within 3 m sat 0.70 → 0.42 at Ymed 0.11 → 0.14; 8 m 0.55 → 0.42; far corners 0.40/0.51 → 0.26/0.42; warm-lit pixels (hue 10–50°, sat > 0.3) 29.1 → 35.7 % of the frame. Night pad (`camp_arrive_night.png` (150,200,400,285)) Ymed 0.0069 → 0.0146, 0.51 of the horizon band, sRGB (0.145, 0.124, 0.136) hue 326° sat 0.14. Gate timber at 512 unchanged (sign post (110,200,120,260) Ymed 0.400 → 0.401, std 0.134 both); end grain reads only at 1280 on the firewood stack in `ultra_camp/camp_mess` (90,275,190,320 in display terms — the log ends).

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 7 | timber end grain and checks invisible at 512; at 1280 the firewood shows rings; canvas and chair cotton as round 4 |
| 6 | Texture quality | 6 → 6 | |
| 8 | Lighting | 7 → 8 | table and chair pockets at −1.9 / −1.5 st (target ≤ 2); open floor −1.9; night pad at 0.51 of the band; the row lanterns; the lookout lit |
| 9 | Shadows | 6 → 6 | the canopy edge is the same 12 px line with dither; the pockets were filled by a 6 m point light (`messLamp` day state), not by sky light — the far bench and right floor it does not reach sit at −3.4 st |
| 11 | Color / atmosphere | 7 → 6 | the fire is cream: core sat 0.24, (0.74, 0.67, 0.57); the ground it lights went from sat 0.70 to 0.42 as asked, but the flame and its glow disc lost their colour with the light |
| 14 | Detail density | 7 → 7 | |
| 15 | Integration | 7 → 7 | |
| 16 | Cleanliness | 6 → 6 | shade-edge dither; `ultra_camp/camp_gate` (330,300,760,480): a dotted pale speckle runs down the sign posts' edges — shadow-map acne at grazing |

**Top three weaknesses**
1. `camp_night/camp_fire_night.png` (275,158,287,178) — the flame is pale cream, sat 0.24. The r4 commit desaturated the PointLight (`src/campground/fire.js` L388 `(1.0, 0.72, 0.45)`) and turned the flame to premultiplied over-blending; the sum of tongues drives the core to white. Fix: `fire.js` L359 `uTint (1.0, 0.68, 0.4) → (1.0, 0.52, 0.18)`; in the tongue shader (L190) keep the ramp but clamp the accumulated premultiplied colour before tint (`c = min(c, vec3(1.0)) * uTint`); leave the light at its paler amber — the ground numbers are right. Target: core sat ≥ 0.5 at the same Y 0.5.
2. `camp_day/camp_mess.png` (404,223) 8×8 — the darkest pocket is −3.4 st; the right floor and far bench are outside the 6 m `messLamp` fill. Fix: `src/campground/index.js` L253 day fill `distance 6.0 → 9.0, decay 1.2 → 1.0`, and keep the `intensity 12` (pad budget +2.5 % was measured at 6 m; re-measure); target every pocket ≤ 2.5 st.
3. `camp_day/camp_mess.png` shade edge (columns 270–342, rows 236–265) — 12 px hard line with dither both rounds; `shadow.farRadius 3.6 / farStrength 0.92` (`src/sky.js` L499) moved nothing here because the canopy's shadow is in the near cascade. Fix: the same line's near `radius 1.2 → 2.5` and `sun.shadow.blurSamples 12 → 24` (L1795); target a ≥ 30 px 10–90 % transition at 512 wide with no dither.

**Regressions.** Color / atmosphere 7 → 6 (`camp_fire_night.png`, the flame), one point.

**Must not regress.** Pockets under the table and chairs ≤ 2 st; night pad ≤ 0.7 of the band; the row lanterns; the fire's reach (warm-lit 36 % of the frame).

---

## 5 Road & terrain

Frames: `truck_*/{road,mainroad}.png`, `camp_day/camp_beyond.png`, `lions_day/{lion_far,lion_pride,lion_medium,lion_side}.png`, `fleet/*_day.png` skylines, `ultra_day/{mainroad,forest}.png`, `ultra_camp/camp_gate.png`.

Hills, ridge rows against the sky over them (median of kept columns; p10–p90):

| frame | R4 | R5 | kept cols R5 |
|---|---|---|---|
| `truck_day/mainroad.png` | 0.63 (0.55–0.68) | **0.80** (0.71–0.88) | 496/640 |
| `fleet/pickup_0_day.png` | 0.63 (0.58–0.71) | **0.81** (0.73–0.85) | 360/480 |
| `fleet/camper_0_day.png` | 0.67 | **0.75** (0.64–0.82) | 206/480 |
| `fleet/suv_0_day.png` | 0.99 | **0.88** (0.82–0.94) | 159/480 |
| `fleet/ranger_0_day.png` | 0.94 | **0.85** (0.66–0.91) | 123/480 |
| `camp_day/camp_beyond.png` | 0.85 | **0.76** (0.67–0.84) | 360/512 |
| `lions_day/lion_far.png` | 0.50 (0.43–0.84) | **0.75** (0.72–0.78) | 281/512 |
| `lions_day/lion_pride.png` | 0.54 | **0.81** (0.73–0.85) | 164/512 |
| `lions_day/lion_medium.png` | 0.67 | **0.76** | 44/512 |
| `truck_day/forest.png` cols 150–400 | 1.10 (1.01–2.55) | **1.02** (0.87–1.12) | 56 → 93/250 |
| `ultra_day/mainroad.png` | — | 0.75 (0.55–0.83) | 833/1280 |
| `ultra_day/forest.png` cols 300–800 | — | **0.99** (0.94–1.05) | 204/500 |
| `ultra_camp/camp_gate.png` | — | 0.80 (0.53–0.90) | 582/1280 |

Every 640/512/480 frame with a real skyline step is inside 0.72–0.92; the spread went 0.50–0.99 → 0.75–0.88. Hill hue 217–221°, sat 0.13–0.19 — the sky's. The exception is the `forest` view: its range is at the sky in both rounds and at both resolutions (crest/sky 1.02 at 640, 0.99 at 1280; display-luma contrast sky − crest −0.007 and +0.002 against the 0.06 floor the code aims for) — a blue-grey slab with a hard top edge and pale scrub dashes (`ultra_day/forest.png` (300,110,800,200)), which the eye reads as a plate, not a range. A correction to my own first pass: I first read the right of `ultra_camp/camp_gate.png` (850–1280, rows 150–260) at 1.04 — that region is open sky (the dome brightens 0.256 → 0.376 down the column with no step > 0.012), i.e. sky measured against sky. Ridge columns are kept at a step ≥ 0.03 now (the table's 640/512/480 rows do not change under that threshold); the two `forest` rows are the exception, taken at ≥ 0.012 because the sky-to-slab step there is 0.01–0.02 — which is the finding.

Water hole: `lion_far.png` pool (130,112,260,124) −0.96 → −0.51 st vs sky, +0.65 st over its rim (130,126,260,130); `lion_side.png` open water (80,128,200,150) −0.40 → −0.56 st, sRGB (0.564, 0.526, 0.518) hue 10° sat 0.08 (R4 hue 28° sat 0.16); the kopje reflects (reflection box (0,128,55,150) hue 240°, +0.39 st over the open water). `lion_pride_dusk.png` pool (260,118,420,132) −1.61 → −0.31 st vs sky. Road: `truck_day/road.png` band (220,200,420,300) — no autocorrelation peak > 0.25 down the track in either round; laterite `road` foreground (200,300,440,360) hue 22 → 26°, sat 0.60 → 0.55.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 3 | Geometry | 6 → 6 | kopje boulders in the reflection are analytic ellipsoids: two smooth grey domes in `ultra_lions/lion_face.png` (60,110,300,150) under textured rocks |
| 5 | Materials | 7 → 7 | laterite hue 21–27°, sat 0.55–0.65; the water is a grey mirror with Fresnel |
| 6 | Texture quality | 6 → 6 | no repeat detected on `road`; at 1280 the pride plain's dark pebbles are evenly spaced round dots (`ultra_lions/lion_close`, lower half) |
| 8 | Lighting | 7 → 8 | hills in band on all nine incumbent-pair frames with a skyline; the `forest` range at the sky in both rounds (no change); night `mainroad` ground 0.011 → 0.023 |
| 9 | Shadows | 6 → 6 | |
| 10 | Reflections | 5 → 6 | water reflects the kopje and the sky (R4 pool a flat warm grey, hue 30° sat 0.14; I read that as 5); the shore annulus is a pale line, not a wet darkening |
| 11 | Color / atmosphere | 7 → 7 | hills the sky's hue at sat ≤ 0.19; the pool is grey (sat 0.08), not blue-grey; night ground red (hue 4–5°) under a cobalt sky |
| 14 | Detail density | 6 → 6 | |
| 16 | Cleanliness | 6 → 6 | |

**Top three weaknesses**
1. `truck_day/forest.png` (120,30,420,110), `ultra_day/forest.png` (300,110,800,200) — the range in the forest view is at the sky (1.02 / 0.99 of the sky over its crest, display contrast ≤ 0.007) in both rounds; a slab with a hard top edge and pale dashes. The far-hills shader has the rule (`src/terrain.js` `buildFarHills`): `hillTone = mix(vec3(0.86), vec3(0.76, 0.765, 0.78), hillDusk)` (L5649), `hillCeil = mix(0.80, 0.78, hillDusk)` (L5726), and the guard `gl_FragColor.rgb *= mix(1.0, min(1.0, hillUpL * hillCeil / hillOutL), hillK)` (L5754) — but the guard is gated by `hillK`, the height key, and the comment says the flat "which meets the near terrain at 146 m" is not touched. Whatever carries the forest skyline is outside that key (`uHillDebug 4` shows it). Fix: gate the ceiling on `max(hillK, smoothstep(300.0, 380.0, hillDist))`, as the floor on the next line already is, so anything past 300 m sits under 0.80 of the sky over it; target display contrast ≥ 0.03 on `truck_day/forest` cols 150–400 and the `mainroad` band unchanged (0.75–0.80).
2. `lions_day/lion_side.png` (0,88,220,160), `ultra_lions/lion_face.png` — the 0.6 m wet annulus reads as a pale rim (`lion_far` rim Y 0.169 vs plain 0.159, `lion_pride` rim sRGB (0.51, 0.40, 0.28) sat 0.45) and the boulder reflections are featureless grey eggs. Fix: `src/terrain.js` L3036 `roughnessFactor = mix(roughnessFactor, 0.35, smoothstep(0.984, 0.996, zMud))` only changes the finish, and a 0.35 finish mirrors the sky, which is why the rim comes out brighter than the plain; darken the albedo in the same band by `mix(1.0, 0.6, smoothstep(0.984, 0.996, zMud))` (wet laterite is darker as well as glossier). For the reflection, L5140–5167 shade each ellipsoid hit as one flat value, `rockShade = uRockCol[i].rgb * (uSkyHor.rgb * 0.35 + uSunCol * ndl)`; modulate it by a granite fbm on the ellipsoid-local hit point `nl` (±0.15) so the reflected boulder has the grain the boulder above it has.
3. `truck_night/{hero,road}.png`, `ultra_night/*` ground — hue 4–5°, sat 0.32–0.39 (hero-car #2; same fix in `src/terrain.js` L3276/L3318).

**Regressions.** None.

**Must not regress.** Nine ridges at 0.75–0.88 of the sky (and `ultra_camp/camp_gate` at 0.80 full width); hill sat ≤ 0.19; the kopje in the water; night `mainroad` ground 0.02–0.03.

---

## 6 Vegetation

Frames: `lions_day/{lion_pride,lion_far,lion_medium}.png`, `truck_{day,dusk,night}/{forest,hero,mainroad}.png`, `lions_dusk/lion_medium_dusk.png`, `ultra_day/forest.png`.

Pride plain (`lion_pride.png` rows 192–288): straw mask 19.0 → 20.5 %; khaki mask (hue 38–95°, sat > 0.15) 12.6 → 22.5 %; soil (hue < 30°, sat > 0.3) 60.2 → 43.2 %; Ymed 0.199 → 0.150. The new turf: hue 41°, sat 0.68, Ymed 0.074 (7 633 px in rows 150–288) against the standing straw at hue 39°, sat 0.44, Ymed 0.409 — same hue, 2.5 st darker and half again as saturated. Dusk crowns: `truck_dusk/forest.png` acacia (250,30,600,120) crown median −4.51 → −3.32 st vs sky, p90 −1.67 → −1.56, pixels < 0.01: 35.8 → 20.3 %; `truck_dusk/mainroad.png` band (0,40,640,150) −1.79 → −2.22 st (pose); `lions_dusk/lion_medium_dusk.png` acacia against the aureole −0.82 → −0.72 st (lit through, not black, both rounds). Day split: `truck_day/forest.png` acacia halves L/R −0.56 → −1.01 st; `lion_medium.png` acacia (215,5,385,55) L/R +2.18 → +2.89 st, crown median −3.56 → −2.60 st vs sky. Night canopy `truck_night/forest.png`: canopy band rows 60–160 Ymed 0.0049 → 0.0142 against sky 0.0056 → 0.0155; pixels < 0.005 in the band 51.6 → 17.5 %.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 6 → 6 | acacia crowns still flat discs on a fork (`ultra_day/mainroad` (400,85,560,165)) |
| 3 | Geometry | 5 → 5 | crossed-card tufts; the new turf is more of them |
| 5 | Materials | 6 → 6 | |
| 6 | Texture quality | 6 → 6 | |
| 8 | Lighting | 6 → 7 | dusk forest crown +1.2 st with 15 % fewer black pixels; tuft root shadow (plain −0.41 st); night canopy dark not missing (17.5 % under 0.005); crown split wider on the sun side |
| 9 | Shadows | — → 6 | tuft self-shadow root → tip reads on the pride plain; no cast shadow from any tuft or crown on the ground at 640 |
| 11 | Color / atmosphere | 6 → 6 | dusk crown still 3.3 st under the sky (target ≤ 2.5); the turf is a dark olive against pale straw — see below |
| 14 | Detail density | 6 → 7 | pride plain khaki 12.6 → 22.5 % of the lower third, 49 % in the open-plain box; the lie-up itself (in front of the lions) unchanged at 8–9 % |
| 15 | Integration | 6 → 6 | |
| 16 | Cleanliness | 6 → 6 | |

**Khaki turf or pale straw.** Pale straw. A dry-season lie-up is bleached, short, trampled grass in the same light as the standing tufts; the turf as shot is the straw's hue at 2.5 st darker and sat 0.68, so it reads as shaded weed clumps on red soil, not as ground cover. Keep the count; move the colour: the lawn forms onto the straw tile (Y ≥ 0.25, sat ≤ 0.45), keep a khaki tint only inside the water hole's 6 m damp ring.

**Top three weaknesses**
1. `lions_day/lion_pride.png` (150,250,300,285) — turf colour as above. The lawn is `src/forest.js` grass scatter (`f1689c7`): `select` returns `pickOf(GI_LAWN)` where `s.lawn > 0.5` (L3628), and `GI_LAWN = [GI_SHORT[1], GI_SHORT[3]]` (L3306) are `plantClump`s on atlas tile 1 — the "short khaki" tile (L3289–3294, tiles `[1, 1, 1, 1]`). Fix: two more short clumps (the rosette and the fan) on tile 0, the tall-straw tile, and point `GI_LAWN` at them; keep the `extra` count (L3624, `grassCount × 1.6 × s.lawn`) and the root-to-tip shadow. The inner ease on the same line, `lerp(0.55, 1, smoothstep(2.5, 6, d))`, is why the two boxes in front of the lions stay at 8–9 %: `0.55 → 0.8` if the lie-up is to read as trodden turf rather than soil; size stays at `sizeAt` L3667 (0.85 × 0.85 × 0.8 = 0.58 at the anchor).
2. `truck_dusk/forest.png` (250,30,600,120) — crown median 3.3 st under the sky, 20 % of crown pixels under Y 0.01. In the canopy shader (`src/forest.js` L1453–1454) the over-cap pass at low sun is `through = min(raw, cap) + shell * min(max(raw − cap, 0), cap * uTransRim)` with `shell = (1 − smoothstep(0.25, 0.75, vShade)) * lowSun` — the outer shell only; the buried cards stay under the cap and are the black fifth. Fix: `shell = mix(0.6, 1.0, 1 − smoothstep(0.25, 0.75, vShade)) * lowSun` (acacia `transLow 2.2` at L2742 kept); target median ≤ 2.5 st, pixels < 0.01 ≤ 10 %.
3. `ultra_day/mainroad.png` (400,85,560,165) — acacia crowns are discs on forks at 1280 as at 640. The `flat` acacia species (`src/forest.js` L1823: `dome 0.7, limbs [3, 4], cards 170, spread [0.5, 0.7], thick [0.24, 0.32]`) is one cap. Fix: `thick [0.24, 0.32] → [0.34, 0.46]` with the cards split over two tiers (the limbs' ends and a lower ring at 0.6 of the height), so the fork reaches into the crown instead of holding a plate.

**Regressions.** None.

**Must not regress.** Night canopies dark, not missing; the pride plain's tuft count; the day crown split; laterite hue.

---

## 7 Lions

Frames: `lions_day/{lion_close,lion_face,lion_far,lion_medium,lion_pride,lion_seat,lion_side}.png`, `lions_dusk/{lion_close_dusk,lion_medium_dusk,lion_pride_dusk}.png`, `ultra_lions/{lion_close,lion_face}.png`.

Coat (`lion_close.png`): flank (295,150,355,200) Ymed 0.064 → 0.098, std 0.037 → 0.073, p99 0.231 → 0.378; gradient anisotropy |dY/dy| / |dY/dx| 0.87 → 0.81 (streaks along the body, weak); neck (250,120,290,160) 0.067 → 0.107. Eyes (`lion_face.png`): iris pixels (hue 18–55°, sat > 0.55) 467 → 516 right eye (255,100,292,126), 188 → 258 left (188,96,222,122); catch-light Ymax 0.64/0.78 → 0.68/0.78; the left eye shows 78 pale pixels (13 in R4) — lid and sclera round a proud ball. Contact, day (`lion_close.png`): under the forepaws (240,262,300,280) −0.43 → −0.63 st vs beside; R4's black crescent on the right foreleg (287,250,302,265) gone. Contact, dusk (`lion_close_dusk.png`): under chest (330,232,380,250) vs beside (405,232,470,250): Y +0.49 → +0.03 st, blue +0.068 → −0.007, sat −0.11 → +0.01; under the cub (60,165,150,180) −2.03 → −2.37 st, R4's grey pool gone. Dusk rim: outline rows edge..+3 vs interior +10..+20, −0.35 → −0.15 st; isolated bright specks (Y > 1.8× the 5×5 median, > 0.25) in the lion band (rows 100–290, cols 0–480) 533 → 651 px; the rim runs as a 1 px dotted line along the cub's back and the toes (20,105,170,180), (200,240,320,285).

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 5 → 6 | withers, sacrum rise and belly tuck read in `lion_close` and the dusk close; from the side (`walk_*`, `lion_side`) the head is still a bear's |
| 3 | Geometry | 5 → 6 | eyes sunk under lids, brow one plateau, ears at the skull corners (`lion_face`); at 1280 (`ultra_lions/lion_face`) the muzzle is a box with a flat front, the body a smooth loft, the eyeballs still proud spheres — a plush with a better head |
| 4 | Scale | 6 → 6 | |
| 5 | Materials | 5 → 6 | streak grain along the body, twice the flank contrast, backlight wrap at dusk; anisotropy weak (0.81); no guard-hair line resolved |
| 6 | Texture quality | 6 → 6 | |
| 8 | Lighting | 6 → 7 | day body +0.6 st with a lit/shade split across the barrel; dusk wrap +0.20 st on the outline |
| 9 | Shadows | 5 → 6 | the decal multiplies: no grey pool under any lion at dusk; paws sit in a −0.6 st contact |
| 10 | Reflections (eyes) | 6 → 6 | amber iris, catch-light 0.78 |
| 11 | Color / atmosphere | 6 → 6 | |
| 13 | Physics / contact | 5 → 6 | elbows, paws and belly on the ground with a contact under each; no float, no sink |
| 14 | Detail density | 5 → 5 | no whiskers, no claws in any frame at either resolution |
| 15 | Integration | 5 → 6 | decal + the turf ring |
| 16 | Cleanliness | 6 → 6 | R4's foreleg crescent gone; new: the dotted rim (651 specks) |

**Top three weaknesses**
1. `ultra_lions/lion_face.png`, `lion_close.png` — the head: a loaf muzzle with a flat front plane, eyeballs proud of the lids (78 pale pixels round the left iris), no zygomatic shelf. Fix: `src/wildlife/lion/spec.js` L144 `EYE_LIDS = { up: 0.46, down: 0.62, scale: 1.34, roll: 0.14 }` → `up 0.55, down 0.68`, and the eye joint 4 mm deeper into the orbit (`HEAD_JOINTS` eye offset, `headspec.js` `FACE.eye`); in `headspec.js` add a cheek-arch row between the zygomatic row (L50) and the muzzle root (L79) at 0.85 of the skull half-width; break the muzzle row (L85) into a nose-leather block and an upper-lip plane with a philtrum groove.
2. `lions_dusk/lion_close_dusk.png` (20,105,170,180), (200,240,320,285) — the backlight rim is a 1 px dotted outline. `furRim()` (`src/wildlife/lion/index.js` L99–122) adds `uRim × pow(1 − N·V, 6) × rimBehind × rimWrap` on `geometryNormal`, which is the vertex normal, so the dots are not the normal map; they are the fur shells: the same material runs on every shell and each shell alpha-tests (`if (diffuseColor.a < vShell * 0.97 + 0.02) discard;`, L75), so at the silhouette the outer shells are isolated strand pixels and the rim lights each one. Fix: scale the rim by `(1.0 − vShell)` so the fringe is carried by the body and the inner shells, and power 6 → 4 so it is 2–3 px wide; target the +0.20 st rim kept with specks in the lion band ≤ R4's 533.
3. `lions_day/lion_close.png` (295,150,355,200) — the coat is a tinted grain with a 0.81 anisotropy; fur has direction. The coat is `coatNormal(256)` (`textures.js` L697–727: strands `fbm((u + wx) × 48, (v + wy) × 8)` at 0.55 of the height, `normalFromHeight(…, 0.8)`, repeat 5 × 5) under `normalScale 0.35`, `roughness 0.84`, `sheen 0.5`, `sheenRoughness 0.6` (`index.js` L142–161) — the sheen lobe is isotropic and cannot give the streaks a direction. Fix: three r185's `anisotropy` on the coat material — `anisotropy 0.6` with `anisotropyRotation` along v (the body axis), `roughness 0.84 → 0.7` so the stretched lobe shows — and the strands `48:8 → 32:6` at repeat 4 so one strand is ≥ 2 px at 512; target |dY/dy| / |dY/dx| ≥ 1.3 on the flank box.

**Regressions.** None.

**Must not regress.** Multiplying decal; amber eyes with catch-light; the body landmarks; no saddle break; no black crescents on the legs.

---

## 8 Lion feet & gait

Frames: `lions_walk/walk_00..07.png` (R5) vs `lions_walk_fixed/walk_00..07.png` (R4), 512×288, 0.3 s steps, world-fixed camera.

Body centre travel over the eight frames: R4 −83 px (16 % of the width), steps 8.6–14.1 px; R5 −105 px (20.5 %), steps 13.4–18.6 px (more even). Ground-row feet (cluster centre column, width in px):

| frame | R4 feet | R5 feet |
|---|---|---|
| 00 | 230(29) 266(28) 315(15) 361(65) | 351(87) |
| 01 | 230(29) 331(73) | 266(5) 334(75) |
| 02 | 229(26) 274(10) 295(23) 334(31) | 229(19) 272(5) 296(24) 334(36) |
| 03 | 223(12) 240(11) 263(19) 295(13) | 240(16) 269(26) 296(12) 323(8) |
| 04 | 216(9) 232(11) 260(20) 296(10) | 224(25) 264(14) 297(9) |
| 05 | 207(50) 250(7) 286(4) | 207(53) 256(3) |
| 06 | 203(52) | 166(4) 202(54) |
| 07 | 156(30) 199(45) | 180(79) |

Planted feet: R5 holds 296 / 296 / 297 across `walk_02–04` (3 frames, 0.9 s) and 334 / 334 across `walk_01–02`; R4 holds 230 / 230 / 229 (`walk_00–02`) and 295 / 295 / 296 (`walk_02–04`). Both rounds have one plant that drifts 4–5 px per frame late in the strip (R4 207 → 203 → 199 over `walk_05–07`; R5 207 → 202 over `walk_05–06`) — a foot at lift-off or a slide; at 0.3 s steps I cannot separate them. Body bottom row 182–185 in every frame (no bob). Contact: the ground in rows 182–188, ±6 columns under each planted foot, against the background median: R4 median +0.00 st (−0.08 … +0.02, n = 24), R5 +0.00 st (−0.06 … +0.01, n = 19) — the walking lion's paws cast nothing onto the ground in either round (`walk_04` (180,150,330,195)); the lying lions' decal does not follow the walker.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 12 | Animation | 5 → 6 | 27 % more travel, even 13–19 px steps, elbow and stifle flex in `walk_02`, `walk_05`; the head is carried rigid |
| 13 | Physics / contact | 5 → 5 | plants hold for 2–3 frames in both rounds; one 4–5 px/frame drift in both; no contact darkening under any planted paw (+0.00 st) |
| 16 | Cleanliness | 5 → 5 | R5 tufts cross the near legs in `walk_04`–`walk_06` (the turf pass reaches the strip's track) |
| 17 | Temporal | 6 → 6 | coherent body pixels (4.5–6.5 k per frame); no pane or ground flicker across the strip |

**Top three weaknesses**
1. Every frame — no contact under the planted paws: ground under each stance foot is the background's Y to within 0.02 st. `src/wildlife/lion/contact.js` does draw a paw decal per foot (five quads per lion; `CONTACT.paw 0.4`, −0.74 st at the centre, radius `foot + 0.6 × penumbra` ≈ 0.28 m, alpha `k²` where `k = 1 − h / 0.12 m` for the paw's height over `lion.groundAt`) — so the decal exists and is not reaching the strip. Two things to read at the strip camera: `k` per planted paw (if `h` is not ≈ 0 while `feet.js` reports the foot planted, the paw's y and the decal's `groundAt` are two different heights and the decal has faded itself out), and the quad's depth (polygonOffset −2 / −4 on a slope can lose to the terrain — lift the quad 1.5 cm along the normal). Target −0.5 st in a 6 px ring outside each planted paw at 512 wide, as the lying lions have (−0.63 st in `lion_close`).
2. `walk_05`–`walk_07` — a planted column that moves 4–5 px per frame (207 → 202). `feet.js` already holds a planted foot in world space ("either planted or swinging", `PHASE`, `STANCE_AHEAD`), so the drift is either lift-off caught mid-step at 0.3 s or the body sliding under a foot the code reports planted. Fix: log each planted foot's world position per frame in the strip and assert < 1 cm drift over the stance; if it fails, the root-space rebuild each step (`contact.js` "rebuilt in root space every step") is where the planted position moves with the root.
3. Side profile of the head across the strip — a bear's snout (lions #1 fix).

**Regressions.** None. **Must not regress.** The 3-frame plant; the flexion; the 0.3 s strip as the judging frame.

---

## 9 Lighting & atmosphere

**Re-judge.** Scores unchanged; the truck-dependent numbers below are from the re-shot frames. What moved: the `truck_night/road.png` "9 % of the sky box over 0.35" was my box holding the light bar, not the bar's bloom reaching the sky — the low `road` camera has the bar at the top edge in both rounds, and outside the bar's columns the box has 55 px over 0.35 against R4's 53 — so weakness #3 is withdrawn and replaced. The dusk sand pool is out of the level frame altogether (0 px over 0.6). The ultra headlamp pool measures warm (hue 32°), not the blue-white I had from the pitched frame's box.

Frames: every hour of every family.

Night (`truck_night/hero.png`): sky, R4 (330,0,640,40) Ymed 0.0076 → R5 (300,0,640,10) 0.0233 (+1.6 st; the level frame has trees over most of the old box), hue 227 → 224°, sat 0.60 → 0.67; ground (450,300,640,360) 0.0063 → 0.0094, hue 353 → 3°, sat 0.22 → 0.36; ground/sky −0.26 → −1.31 st (the ground now sits under the sky in the hero; in `mainroad` the ground is 0.0250, +0.42 st over the upper sky (200,250,440,360) vs (100,0,540,30), 0.51 of the horizon band on the camp approach). Sky pixels over 0.35: 0.02 % in `mainroad`; blobs ≤ 12 px 2–4 per frame; the Milky Way band reads. `truck_night/road.png` sky box (100,0,540,30): 8.2 % over 0.35, all of it in cols 100–355 where the bar and its pods sit at the frame's top edge; outside those columns 55 px (R4 53). Dusk (`truck_dusk/front.png`, the one dusk frame with the sky fully in it both rounds): sky rows 0–50 Ymed 0.356 → 0.384, p95 0.420 → 0.470; frame over 0.7: front 304 → 0 px, hero 96 → 0 px. The dusk bar pods sit at Ymax 0.69 against that sky. Day shade: camp canopy −1.9 st open floor, edge 12 px; under the truck −5.5 st (contact); pitched ultra bumper shade −3.97 st with a 16 px edge. Fleet night skies sat 0.63–0.66, ×2.5 brighter. `ultra_night/hero.png`: bar (455,125,610,200) nine pod groups at threshold 0.7 (centres 468, 482, 496, 511, 527, 541, 559, 575, 592), pod Ymax 0.74, troughs between pods 0.59–0.63, nothing over 0.8 in the frame; headlamps two blobs of 1770 and 1217 px over 0.5; the beam cone and the verge it lights (0,330,200,480) hue 32° sat 0.30 at 1280, (0,170,120,230) hue 32° sat 0.31 at 640 — warm, as the lamp colour; the ground beyond it red (hue 3°). Sky (600,0,1280,60) 0.0100, hue 220°, sat 0.59, no blob over 0.35.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 8 | Lighting | 7 → 8 | night ground under the sky in the hero and at 0.51 of the band on the pad; the bar as pods; dusk front with nothing over 0.7; the camp fill; the lanterns |
| 9 | Shadows | 6 → 6 | no penumbra change anywhere (camp edge 12 px both rounds); contact shadows hold; the lion decal is the one shadow that improved |
| 10 | Reflections | — → 6 | paint gradient on bonnet and door, the door mirror's sky and horizon, water hole, eyes; no pane sheen from the front quarter |
| 11 | Color / atmosphere | 6 → 6 | night sky cobalt at sat 0.67 (round 4 asked for a third of 0.66 — it went up, and brighter); the moonlit soil is red (hue 4°, sat 0.37) under that sky; dusk holds its amber |
| 14 | Detail density | 6 → 6 | stars ≤ 0.02 % of sky, Milky Way band; the moon is out of every frame, so its disc is unjudged |
| 16 | Cleanliness | 7 → 8 | discs gone; bar and lamps separate; night frames over 0.7: 382 → 116 px (hero) |

**Top three weaknesses**
1. Night colour — `truck_night/hero.png` (450,300,640,360) ground hue 3° sat 0.36 under a sky of hue 224° sat 0.67. Two dials pulling apart: `NIGHT_SKY` band ×2.4 with `HUE_NIGHT_DEEP 0x3d5c8c` (`src/sky.js` L1414) for the sky, and the terrain's albedo-squared bounce for the ground (hero #1). Fix: the ground fix above, plus `uSkyLow night mul 0.2 → 0.16` and sat of the band ×0.8 so the horizon is a blue-grey (target sky sat 0.45–0.5, ground hue ≥ 340° or ≤ 20° at sat ≤ 0.2).
2. Shade penumbra — every shadow in the game is a 12–16 px line at 512–1280 wide. Fix as campground #3 (`src/sky.js` L499 day `shadow.radius 1.2 → 2.5`, L1795 `blurSamples 12 → 24`); measure on `camp_mess` and the pitched `ultra_day/hero` rows 548–564 (or its re-shot successor).
3. `ultra_night/hero.png` bar (455,125,610,200), `truck_night/front.png` (236,74,372,117) — the nine pods stand on a lit strip: troughs between pods 0.59–0.63 at 1280 and 0.44–0.59 in the front view at 640, against pod peaks of 0.74 (0.3–0.7 st of separation; the hero at 640 gets 0.21–0.52 only because the bar is foreshortened there). The night bloom is at `radius 0.25, strength 0.55, threshold 2.0` (`src/post.js` L1212) and its own note says the footprint is the cover's emissive, not the bloom: `BEAM.night.cover 0.5` (`src/vehicle/index.js` L135) through `applyLampGlow(m.barCover, { core 3.0, bleach 0.4, coreExp 1.5 })` (`src/vehicle/materials.js` L908) on the `lampHot` nine-lobe mask (`src/vehicle/body.js` L76–102). Fix as hero #2: `cover 0.5 → 0.3`, `core 3.0 → 2.0`, lobes tightened so the cover between two pods is under 0.1 of a lobe's peak. Target: troughs ≤ 0.45 at 1280 with the pods still ≥ 0.7; nothing in the night sky boxes over 0.35 outside the bar's own columns (55 px now, R4 53).

**Regressions.** None.

**Must not regress.** No disc in the night sky; stars ≤ 0.5 % of sky over 0.35 outside the bar's columns; ground under the horizon band at night; dusk front with 0 px over 0.7 and grille p95 under sky p95; the warm beam cone; the camp fill.

---

## 10 Performance

From `stats.json` only (fast, 640×360; ultra, 1280×720 — software raster, fps not used).

| set | view | R4 calls / tris / programs / textures | R5 |
|---|---|---|---|
| truck_day | hero | 488 / 2.169 M / 174 / 295 | 488 / 2.183 M / 175 / 293 |
| truck_day | mainroad | 620 / 2.959 M / 175 / 306 | 611 / 2.942 M / 176 / 304 |
| truck_day | rear | 605 / 2.712 M / 174 / 302 | 656 / 2.834 M / 175 / 302 |
| truck_dusk | hero | 551 / 2.481 M / 175 / 295 | 552 / 2.498 M / 176 / 293 |
| truck_night | hero | 535 / 2.469 M / 175 / 294 | 537 / 2.486 M / 176 / 292 |
| ultra_day (pitched set) | hero / interior | — | 628 / 3.339 M / 179 / 298 ; 780 / 4.615 M / 180 / 304 |
| ultra_night | hero / road | — | 661 / 3.391 M / 179 / 299 ; 677 / 3.415 M / 180 / 299 |

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 18 | Browser performance | 5 → 5 | +1 program at fast in the frames scored (the +2 claimed, less fleet r4's merge); calls within ±5 % except `rear` +8 %; triangles −0.6 to +4.5 %; textures −2 to 0. 2.2–2.9 M triangles and 490–660 calls a frame at `fast` is a heavy frame for a browser scene at 640×360; unchanged this round |

**Weakness.** `truck_day/rear.png` 656 calls / 2.83 M tris (+51 calls, +8 %; `dusk/rear` 668 → 720, `night/rear` 653 → 704) — the roadside kit behind the truck. Fix: `src/roadside.js` — the kit export (`6ca9b3e`) gave the collision world one exact collider per part; merge the drawn parts per material the same way so the kit behind the truck is a handful of calls.

---

## Native-resolution ultra sets (no incumbent; observations that fed the scores above)

- `ultra_day/hero.png` (pitched set — `shots/round5/ultra_day/` is empty at the time of the re-judge) — nine unlit pods on the bar, snorkel ribs, beadlock bolts, lug chamfer and sipe all read; bonnet sky gradient; under-bumper shade −3.97 st with a 16 px edge; paint specks 1.3–1.6 % of the bonnet and door pixels (Y > 1.8× the local median) — flake sparkle plus dirt flecks; the windscreen shows the cab with no sky sheen at all. The bonnet-lip glint I measured here (212 px over 0.7) was the nose-down pose's and is not scored.
- `ultra_day/interior.png` (pitched set; the camera had fallen forward with the body) — the door mirror read as a dark disc from that camera; in the level `glass/interior.png` at 640 it returns sky / horizon / sand / flank, so the disc was the camera, not the pane. Still valid from this frame: rear-view a static card; dash gauges, black console, cage tubes; a 1-px checkerboard stipple over every pane (40,120,140,220).
- `ultra_day/mainroad.png`, `forest.png` (pitched set) — ruts, roadside signs, acacia band; hills 0.75 of the sky on `mainroad`; the `forest` range at the sky (0.99, contrast 0.002) as a hard-edged slab with pale scrub dashes; truck shadow soft to the left.
- `ultra_night/hero.png`, `road.png` (re-shot) — nine pods at Ymax 0.74 on a strip whose troughs are 0.59–0.63, no clipping; warm beam cone (hue 32°); red moonlit ground (hue 3–6°); stars sparse (no blob over 0.35 in (600,0,1280,120)); `road` has the bar at the top edge (577 px over 0.5 in rows 0–12 — the view, in both rounds).
- `ultra_camp/camp_mess.png`, `camp_gate.png` — firewood end grain reads; the mess shade is a soft dark patch with readable chairs; dotted speckle along the sign posts' edges (330,300,760,480); the gate's hills at 0.80 of the sky over 582 columns (the right of the frame is open sky).
- `ultra_lions/lion_close.png`, `lion_face.png` — the head is plainly a plush at this size (flat muzzle front, proud eyeballs, cup ears); fur streaks read as fibre; grey ellipsoid domes in the water (60,110,300,150); evenly spaced dark pebble dots on the plain.

---

## Verdict

**Gate: pass** (re-judged on the level truck frames; the verdict holds and is cleaner than before). On the round's three categories the candidate beats the incumbent where they can be shown: Lighting is up in hero (7 → 8), fleet (6 → 7), campground (7 → 8), terrain (7 → 8), vegetation (6 → 7), lions (6 → 7) and the lighting family (7 → 8), flat in glass (7 → 7). Shadows is up in lions (5 → 6, the multiplying decal), flat in hero, fleet, campground, terrain and the lighting family — nothing's penumbra moved (12 px edge on the mess canopy both rounds), so "shadows" this round is the decal and the filled pockets. Reflections is up in hero (6 → 7, the clearcoat's sky on bonnet and door), terrain (5 → 6, the kopje in the water) and car glass (5 → 6): the door mirror, the one reflective object the round set out to fix, returns sky, a horizon and the truck's painted flank from the `mirror` camera and from the seat (R4's pane had the flank as a black quadrant). What it does not do at fast is show the ground behind at the ground's level (the painted plain is 1.1 st under the trail beside it), and the windscreen still returns no sky from the front quarter. No previously approved category of any family drops by more than one point; the one-point drops are glass Temporal (`moving` flick 0.099 → 0.156) and campground Color (the cream flame). The first-pass drops in glass Composition and Reflections were the pitched capture's — a `mirror` shot aimed under the pane and an interior camera that had fallen forward with the body — and are withdrawn.

**Carried as blocking into round 6:** the red night ground (hue 3–6° at sat 0.32–0.37 under a cobalt sky) which the now-live `groundIndirect 1.4` made worse; the `forest` view's range at the sky (1.02 at 640, 0.99 at 1280, in both rounds) outside the far-hills guard. Carried, not blocking: the bar's pods on a lit strip at 1280 (troughs 0.59–0.63); the windscreen without sky from outside; the mirror's painted plain at fast.

**Claims that did not hold:** "grey → blue-grey" water (it is grey, sat 0.08); "9 → 21 %" turf under the lions (the turf is in the middle of the plain, 8–9 % in front of the lions); dusk crown ≤ 2.5 st (3.3 st by the crown median); "+2 programs at fast" is +1 in the frames scored (175). Claims that held better than stated: `pickup_0_day` hills 0.81; the night hero bar box 218 px over 0.5 against the 417 quoted and the 300 target (on a foreshortened bar); the dusk front with nothing over 0.7 where a ≤ 50 px pool was asked. Claim that held on re-shoot after failing on the first pass: the door mirror — the seat sees horizon and flank.

**Weakest object in the game:** the lion, as in round 4 — Silhouette 6, Geometry 6, Materials 6 at 512 wide, and at 1280 (`ultra_lions/lion_face.png`) a plush: loaf muzzle with a flat front, eyeballs proud of the lids, a smooth loft for a body, no whiskers, no claws. The weakest single part of the car is now the windscreen seen from outside: a clear pane over the cab that returns none of the sky it faces (hue 53° against a sky of 216° in `truck_day/hero.png` (245,100,320,140); R4's read 215°).

**Family means (R4 → R5, over the categories scored in both rounds):** Hero car 6.88 → 7.13 (114/16) · Car glass 6.56 → 6.67 · Fleet 6.31 → 6.54 · Campground 6.64 → 6.64 · Road & terrain 6.20 → 6.40 · Vegetation 5.90 → 6.10 · Lions 5.50 → 6.00 · Lion feet 5.25 → 5.50 · Lighting 6.40 → 6.80 · Performance 5.00 → 5.00 · all scored categories 6.24 → 6.47 (n = 93). Before the re-judge (pitched truck frames): Hero car 7.06, Car glass 6.33, all 6.43.
