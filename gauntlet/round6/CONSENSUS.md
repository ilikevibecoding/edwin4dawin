# Round 6 — consensus of three blind critics

Incumbent: round 5, `shots/round5/` (`truck_*`, `glass/`, `ultra_day/`,
`ultra_night/` from `84c1e5e`; `camp_*`, `fleet/`, `lions_*`, `ultra_camp/`,
`ultra_lions/` from `0dc79bb`). Candidate: round 6, `shots/round6/`, all
sets from `c2f0b83` (the HUD plate reads `776d40a`, which is the bundle commit
of `c2f0b83` — the tree that was served, one ahead of the source commit, as
`tools/baseline.sh` notes; B's question 2 and C's question 1). The round's
categories: Animation, Physics / ground contact, Temporal stability. Critics A,
B and C (`critic_{A,B,C}.md`) worked blind of one another, of the builders'
reports and of `src/`, and measured what they scored. Boxes are
`(x0, y0, x1, y1)` at the frame's own resolution: `truck_*`, `glass/` 640×360;
`camp_*`, `lions_*` 512×288; `fleet/` 480×270; `ultra_*` 1280×720. Stops are
log2 of linear-luma ratios; "sRGB 0.5" is a threshold on sRGB luma (linear
0.214).

**The truck framing changed between the rounds, and it changed for a tool
reason.** All three critics saw it (A's capture note, B's caveat (a), C's
"like-for-like" note): in `truck_*/forest.png` — a world-placed camera, the
same acacia and ruts in both rounds — the round-5 truck is mid-corner, rolled
and nose-left, and the round-6 truck is straight and level in the ruts; the
truck-relative cameras therefore look at different ground and sky (B: 88–93 %
of pixels differ in `truck_day` hero/front/rear/road/detail against 28–41 % in
`glass/`, whose cameras are fixed in the truck's frame). On a fresh boot
`setView` leaves the truck at (−36.6, 2.63, 1.77), heading 11.5°, autoT 0.5032
in every build from `84c1e5e` through `ab2aaac`, `e298790` and `c2f0b83` (probed
each). But `tools/shots.mjs` drives the game live for two seconds (the HUD
frame) before its per-view `setView`s, and until the capture reset `f8c0531`
("setView resets the driver's dynamics…") the pre-roll inherited that live
drive's steer, yaw rate and body springs. Round 5's truck ended wherever the
live drive left it; round 6's is deterministic. The world under the truck is
the same in both rounds; the camera is not. Every truck-relative comparison
below is of like regions, not pixels, and §1 is about what the new camera
shows.

Scratch and scripts under `/tmp/consensus6/`; nothing under `src/` or `tools/`
was touched and no live probe was needed — the one question a frame could not
settle on its own (whether the blown ground is the round-6 car or the camera)
was settled from the builders' own before/after sets in `shots/r7_car/` and
`shots/r8_car/`, whose HUD plates carry their builds (§1).

## Verdict: **pass** on all ten families

The candidate beats the incumbent on the round's three categories wherever
they can be shown, and no previously approved category of any family drops by
more than one point **in the world**. One cell drops two points **on the
frames** — Hero car Visual cleanliness, median 7 → 5 (A 8 → 7, B 7 → 5,
C 6 → 5) — on the ground ahead of the bumper blown white in
`truck_night/front.png`, `truck_dusk/front.png`, `truck_night/road.png` and the
ultra equivalents. §1 rules it a **capture-exposed pre-existing defect**: the
head-on beam sprite and its ground pool were in the world in round 5 (and were
scored at 5 in round 4, whose `front` camera also saw them); round 5's camera
missed them because the pre-roll was not deterministic, and round 6's
deterministic camera looks straight down the beam. Rolling back every round-6
car change would leave the frame blown (the measured contribution of hero car
r7's spill is a fifth of the pool's brightness); only rolling back the capture
reset would restore round 5's frame, and that would restore a random camera.
B's and C's two-point drops are recorded in the matrix with the frames that
carry them, the rewritten must-not-regress lines are in §Regressions, and the
head-on beam is the round's first hand-off (lighting r8 owns the sprite, the
car owns the spill level).

Consensus (median of the three) on the round's categories, R5 → R6:

| Family | Animation | Physics / ground contact | Temporal stability |
|---|---|---|---|
| Hero car | — (a still at the shot; A, B, C) | 8 → 8 | — |
| Car glass | — | — | 5 (held 6) → 6 |
| Campground | 6 → 6 (B; A, C: one frame of fire is not scoreable) | 7 → 7 | — |
| Fleet | — | 7 → 7 | — |
| Road & terrain | — | 7 → 7 | — |
| Vegetation | — (B's 4 set aside, §9: the strip holds the clock) | 6 → 6 | — |
| Lions | — → 6 (B, poses) | 6 → 7 | — |
| Lion feet & gait | 6 → 7 | 6 → 7 | 6 → 6 |
| Lighting & atmosphere | — | — | — |
| Performance | — | — | — |

The evidence for the round is the walk strip, on which all three agree and
which I re-measured (§5): planted paws hold their pixel for two to three
frames at four places in the strip (pixel-identity clusters at x ≈ 321–347
through `walk_00`–`02`, 259–273 at `02`–`03`, 287–313 and 195–222 through
`05`–`07`, 170–193 at `06`–`07`), with a contact darkening under each planted
paw that leaves with the paw (col 336: −3.2 / −1.7 / −1.2 / −0.5 st in the
four rows under the paw, 0.00 the frame after lift-off); the swing leg flexes
at carpus, stifle and hock (`walk_01`, `_03`, `_05`, `_07`); the tail swings; a
cub follows. Round 5 measured +0.00 st under every stance foot and could not
see the decal at all (the camera was 9° off the ground; it is 15° now).

**Drops in the medians (all previously approved categories):**

| Family / category | R5 → R6 | Critics | Frame | Cause and ruling |
|---|---|---|---|---|
| Hero car — Visual cleanliness | **7 → 5** | A 8→7, B 7→5, C 6→5 | `truck_night/front.png` lower third (0,240,640,360) median Y 0.016 → **0.493**, 0 → **37 535** px over linear 0.5, p95 0.71; `truck_dusk/front.png` 0.014 → **0.439**, 30 951 px; `truck_night/road.png` 0 → 817 px, p95 0.06 → 0.41 | §1: the head-on beam sprite (`src/sky.js` lens disc + slice stack) and its ground pool, in the world since before round 5, exposed by the deterministic camera; hero car r7's spill adds a fifth (0.435 → 0.494) and the `road` hot patch, which is real and new. Capture-exposed, not a regression of the world; the pool is hand-off 1 |
| Hero car — Lighting | 7 → 6 | A 8→7, B 7→6, C 7→5 | same frames | same; the moonlit body (+1.33 st over the upper sky, target +0.8 met), the nine pods (troughs 0.13–0.25, target ≤ 0.45 beaten) and the blue-grey ground are the gains the three also score |
| Lighting & atmosphere — Visual cleanliness | 7 → 6 | A 8→7, B 6→5, C 7→6 | same frames; B also the day `moon.png` sheet (64 560 px over 0.5) | same; B's day-moon item is withdrawn — the view aims at the hour's key light by design (`src/camera.js` L44 `aim: 'key'`), the sun by day and dusk (§13) |

Single-critic drops that the medians absorb, each investigated: Hero car
Glass 7 → 6 (C, the dusk windscreen — §3), Car glass Glass 7 → 6 (C, same),
Campground Lighting 8 → 7 (A, the fire's reach) and 7 → 6 (B, the fly floor
and the pad over the band), Campground Shadows 7 → 6 (B) and 6 → 5 (C, the
mess pockets 2.91 → 0.96 st — §6), Lighting & atmosphere Lighting 8 → 7 (A) and
7 → 6 (C, the same pools). Three of these — the mess floor, the fire's reach
and the fleet pads over their sky — are real and are carried as weaknesses
with reconciled fixes; none moves a median by more than one point.

Mean of the consensus medians over the categories scored in both rounds:
Hero car 6.91 → 6.78 (n 16), Car glass 6.67 → 6.73 (15), Fleet 6.27 → 6.57
(15), Campground 6.64 → 6.64 (14, on the round-5 consensus medians), Road &
terrain 6.47 → 6.53 (15), Vegetation 6.19 → 6.35 (13), Lions 5.93 → 6.43 (14),
Lion feet & gait 5.81 → 6.31 (13), Lighting & atmosphere 6.75 → 6.70 (10),
Performance 6 → 6 (1); all 126 cells **6.40 → 6.56**. Per critic over the
cells each scored both rounds: A 6.46 → 6.72 (n 95), B 6.52 → 6.63 (126),
C 6.08 → 6.19 (86). The largest family gain is Lions (+0.50, the round's
category emphasis: head, toes, contact, walk); the one family down is the Hero
car (−0.13), entirely the two cells above.

## Score matrix

Cells are `R5→R6` per critic as the critics gave them in their round-6
reports; consensus is the median of the critics who scored the cell. Flags:
**≥ 3** when the R6 scores spread by three or more points; **dir** when
critics disagree on direction; **drop** when one or two critics drop and the
others hold; **all down** when every critic drops; (2) a two-point R6 spread.
Every flagged cell is investigated below. The critics' R5 columns agree with
the round-5 consensus medians in every cell but one (Campground Color: C now
gives his round-5 score as 6; the round-5 table has 7 — the R5 baseline used
for the gate is the round-5 consensus, 7 → 7).

### Hero car

Frames: `truck_{day,dusk,night}/{hero,front,rear,wheel,detail,interior,forest,road,mainroad}.png`, `truck_night/moon.png`, `ultra_day/{hero,interior,road,mainroad,forest}.png`, `ultra_night/{hero,road}.png`, `glass/ws_mid.png`.

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 2 | Silhouette | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 3 | Geometry | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 4 | Scale | 7→7 | 8→8 | 7→7 | 7 → 7 | |
| 5 | Materials | 8→8 | 7→7 | 6→6 | 7 → 7 | (2) — R5 §13 stands; car r8 landed after the frames |
| 6 | Texture quality | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 7 | Glass / transparency | 7→7 | 7→7 | 7→6 | 7 → 7 | **drop** C (§3) |
| 8 | Lighting | 8→7 | 7→6 | 7→5 | 7 → 6 | **all down** (2) (§1) |
| 9 | Shadows | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 10 | Reflections | 7→8 | 6→6 | 6→7 | 6 → 7 | (2) (§3, §15) |
| 11 | Color / atmosphere | 7→8 | 7→7 | 6→6 | 7 → 7 | (2) |
| 12 | Animation | — | — | — | — | a still at the shot (all three) |
| 13 | Physics / ground contact | 8→8 | 8→8 | 8→8 | 8 → 8 | |
| 14 | Detail density | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 15 | Environmental integration | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 16 | Visual cleanliness | 8→7 | 7→5 | 6→5 | **7 → 5** | **all down** (2) (§1) |
| 18 | Browser performance | 5→5 | 6→6 | — | 5.5 → 5.5 | |

Family mean per critic: A 7.12 → 7.12, B 7.00 → 6.81, C 6.73 → 6.53; medians
6.91 → 6.78. Everything the three agree went up is measured and holds: the
nine pods separate at 640 and 1280 (`truck_night/hero.png` bar box
(220,55,335,105) 218 → **91** px over linear 0.5, nine peaks at 0.71–0.73,
troughs 0.13–0.25 where round 5's were 0.21–0.52; `ultra_night/hero.png`
troughs 0.13–0.24 — the round-5 carry closed beyond its ≤ 0.45 target); the
moonlit body over the sky (door (320,155,400,195) 0.0158 → 0.0303 against an
upper sky (300,0,640,10) of 0.0233 → 0.0121: **−0.56 → +1.33 st**, target
+0.8); the night soil blue-grey (hero (450,300,640,360) hue 3° sat 0.36 →
**242° / 0.15**); the windscreen returning the sky from outside (§3); tyre
contact at every camera with the body level (pitch 0.2°, both rounds);
sidewall lettering at 640; 486 calls on the fast hero. What all three score
down is one thing, §1.

### Car glass

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 7→7 | 7→7 | 7→7 | 7 → 7 | `mirror` eye moved (tool) |
| 2 | Silhouette | — | 7→7 | — | 7 → 7 | |
| 3 | Geometry | — | 7→7 | — | 7 → 7 | |
| 4 | Scale | — | 8→8 | — | 8 → 8 | |
| 5 | Materials | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 6 | Texture quality | 6→6 | 6→7 | 6→6 | 6 → 6 | B: the wiper arc reads in `ws_close` |
| 7 | Glass / transparency | 8→8 | 7→7 | 7→6 | 7 → 7 | **drop** C (2) (§3) |
| 8 | Lighting | 7→7 | 6→6 | 6→6 | 6 → 6 | |
| 9 | Shadows | — | 6→6 | — | 6 → 6 | |
| 10 | Reflections | 6→7 | 7→7 | 7→7 | 7 → 7 | |
| 11 | Color / atmosphere | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 14 | Detail density | — | 6→6 | — | 6 → 6 | |
| 15 | Environmental integration | — | 7→7 | — | 7 → 7 | |
| 16 | Visual cleanliness | 7→8 | 7→7 | 6→6 | 7 → 7 | (2) |
| 17 | Temporal stability | 5→6 | 5→6 | 6→7 | 5 (held 6) → 6 | |

Family mean per critic: A 6.67 → 7.00, B 6.67 → 6.80, C 6.33 → 6.33; medians
6.67 → 6.73. `glass/metrics.json` R5 → R6 (the tool now carries `flickBg`,
`flickRatio`, `barPx`, `paneFullPct`, `calls`): `moving` flick 0.156 →
**0.095** against a background of 0.110 (ratio 0.87 — the round-5 probe's
0.89, now a tool number: §14 of round 5 closed); every world pane at 0.80–0.98
of its background; see ws_close 0.925 → 0.934, ws_mid 0.874 → 0.877, side_sun
0.957 → 0.965, side_shade 0.919 → 0.914, interior 0.799 → 0.796, int_side
0.861 → 0.865, rear_dust 0.857 → 0.862, dusk_ws 0.845 → 0.862, night_int
0.927 → 0.965; hot 0, clip 0, `barPx` 0 on every pane. `night_ext` see 0.962 →
0.876 with veil 0.021 → 0.027 and `bgLuma` 0.075 → 0.103 (§12: the moonlit
ground behind the pane, not the pane). `mirror` is a different measurement now
(the pane alone: cover 9.1 %, see 0.21, flick 0.008 against a surround of
0.002 — §12). The mirror is a painted plate in these frames on all three
readings (A: sky 1.9 st under the world's, plain a grade; B: −0.33 st and 1.7×
the saturation of the window's sky, a floating crown disc at (423–438, 84–89);
C: straw 0 % against 41.8 % in the scene) — car glass r7 `173c55a` made it live
from the seat after the frames and is unscored.

### Fleet (fleet r4 `8611235` is in these frames)

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 7→7 | 6→6 | 6→6 | 6 → 6 | |
| 2 | Silhouette | 6→6 | 7→7 | 6→6 | 6 → 6 | |
| 3 | Geometry | 6→7 | 7→7 | 6→6 | 6 → 7 | A: motorcycle wheels round with spoked hubs |
| 4 | Scale | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 5 | Materials | 7→8 | 6→7 | 6→7 | 6 → 7 | chrome and alloy landed (all three) |
| 6 | Texture quality | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 7 | Glass / transparency | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 8 | Lighting | 7→7 | 7→7 | 6.5→6.5 | 7 → 7 | |
| 9 | Shadows | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 10 | Reflections | — | 5→6 | 4→6 | 4.5 → 6 | |
| 11 | Color / atmosphere | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 13 | Physics / ground contact | 7→7 | 7→7 | — | 7 → 7 | |
| 14 | Detail density | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 15 | Environmental integration | — | 7→7 | 6→6 | 6.5 → 6.5 | |
| 16 | Visual cleanliness | 6→7 | 7→7 | 5→5 | 6 → 7 | (2) |

Family mean per critic: A 6.54 → 6.77, B 6.53 → 6.67, C 5.96 → 6.18; medians
6.27 → 6.57. The SUV bumper (115,192,210,212) Ymed 0.074 → **0.336** under a
sky of 0.303, a sky band along its top face and a dark under-face (B, C;
measured). Night: `safari-jeep_2` 687 → 277 px over 0.5 and 0 over 0.7 (A, B,
C agree); `safari-jeep_0` 461 → 479 px on the bonnet, 111 px over 0.7 (A now
reads it as the jeep's own lit headlamp and withdraws his round-5 "lantern in
the paint"; B "reads as lamps"; C 114 px over 0.85 sRGB under a 3-px source —
C's defect stands, one point, as in round 5 §9); new lamp-in-chrome blobs on
the motorcycle (349 + 164 px over 0.5) and the supply truck (350 + 170) — the
chrome that landed catching the row lanterns (A, B, C). Body/sky at night:
ranger 0.36 → 0.87, supply 0.26 → 0.57 (the third pole), expedition 0.50 →
1.30, jeep_2 0.83 → 0.44 (A: the darkest in the row now). Fleet-frame
*ground* over its sky is §7.

### Campground

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 2 | Silhouette | — | 7→7 | — | 7 → 7 | |
| 3 | Geometry | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 4 | Scale | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 5 | Materials | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 6 | Texture quality | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 8 | Lighting | 8→7 | 7→6 | 7→7 | 7 → 7 | **drop** A, B (§6) |
| 9 | Shadows | 6→6 | 7→6 | 6→5 | 6 → 6 | **drop** B, C (§6) |
| 11 | Color / atmosphere | 6→7 | 7→7 | 6→7 | 7 → 7 (R5 consensus 7) | |
| 12 | Animation | — | 6→6 | — | 6 → 6 | one frame of fire (A, C: `—`) |
| 13 | Physics / ground contact | — | 7→7 | — | 7 → 7 | |
| 14 | Detail density | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 15 | Environmental integration | 7→7 | 7→7 | 5→5 | 7 → 7 | (2) |
| 16 | Visual cleanliness | 6→6 | 7→7 | 6→6 | 6 → 6 | |

Family mean per critic: A 6.64 → 6.64, B 6.79 → 6.64, C 6.00 → 6.00; medians
6.64 → 6.64. Three critics, three different drops, one frame each: A the
fire's reach, B the fly floor, C the table pockets. All three are measured
and real (§6); the medians hold because each is one critic's.

### Road & terrain

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 6→6 | 7→7 | — | 6.5 → 6.5 | |
| 2 | Silhouette | — | 7→7 | — | 7 → 7 | |
| 3 | Geometry | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 4 | Scale | — | 7→7 | — | 7 → 7 | |
| 5 | Materials | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 6 | Texture quality | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 8 | Lighting | 8→8 | 6→6 | — | 7 → 7 | (2) |
| 9 | Shadows | 6→6 | 6→6 | — | 6 → 6 | |
| 10 | Reflections | 6→6 | 7→7 | 4→4 | 6 → 6 | **≥ 3** (R6 6/7/4; §8) |
| 11 | Color / atmosphere | 7→8 | 7→7 | 8→8 | 7 → 8 | |
| 13 | Physics / ground contact | — | 7→7 | — | 7 → 7 | |
| 14 | Detail density | 6→6 | 6→6 | — | 6 → 6 | |
| 15 | Environmental integration | — | 7→7 | 6→6 | 6.5 → 6.5 | |
| 16 | Visual cleanliness | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 18 | Browser performance | — | 6→6 | — | 6 → 6 | |

Family mean per critic: A 6.40 → 6.50, B 6.53 → 6.53, C 6.00 → 6.00; medians
6.47 → 6.53. Color 7 → 8 on the ridges (§10) and the moonlit ground.

### Vegetation

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 6→6 | 6→6 | — | 6 → 6 | |
| 2 | Silhouette | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 3 | Geometry | 5→5 | 5→5 | — | 5 → 5 | |
| 4 | Scale | — | 7→7 | — | 7 → 7 | |
| 5 | Materials | 6→6 | 6→7 | 6→6 | 6 → 6 | |
| 6 | Texture quality | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 8 | Lighting | 7→8 | 7→8 | 6→6 | 7 → 8 | (2) (§9) |
| 9 | Shadows | 6→6 | 7→7 | — | 6.5 → 6.5 | |
| 11 | Color / atmosphere | 6→7 | 6→7 | 5→7 | 6 → 7 | |
| 12 | Animation | — | —→4 | — | — | B's 4 set aside (§9): the strip holds the clock |
| 13 | Physics / ground contact | — | 6→6 | — | 6 → 6 | |
| 14 | Detail density | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 15 | Environmental integration | 6→6 | 6→7 | 6→6 | 6 → 6 | |
| 16 | Visual cleanliness | 6→6 | 6→6 | — | 6 → 6 | |

Family mean per critic: A 6.09 → 6.27, B 6.23 → 6.54, C 5.86 → 6.14; medians
6.19 → 6.35. The pride turf is pale straw on every reading and mine:
`lions_day/lion_pride.png` lower third straw mask (round-5 definition) 16.0 →
**41.8 %**, khaki 11.9 → 4.4 %, Ymed 0.150 → 0.194, p10 0.021 → 0.089; cover in
front of the left lion (60,235,130,260) 17 → 44 %, in front of the right
(300,235,380,260) 16 → 15 % (A's finding: the ease keys off one anchor). C's
Color 5 → 7 recovers last round's drop.

### Lions

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 2 | Silhouette | 6→7 | 6→7 | 5→6 | 6 → 7 | |
| 3 | Geometry | 6→7 | 6→8 | 5→6 | 6 → 7 | (2) (§11) |
| 4 | Scale | 6→6 | 7→7 | 6→6 | 6 → 6 | |
| 5 | Materials | 6→7 | 6→6 | 5→6 | 6 → 6 | |
| 6 | Texture quality | 6→7 | 6→7 | 5→6 | 6 → 7 | |
| 8 | Lighting | 7→7 | 7→7 | 6→6 | 7 → 7 | A's rim "lost half its lift" — §4, not reproduced |
| 9 | Shadows | 6→7 | 7→7 | 5→6 | 6 → 7 | |
| 10 | Reflections (eyes) | 6→6 | 5→5 | 5→5 | 5 → 5 | |
| 11 | Color / atmosphere | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 12 | Animation | — | —→6 | — | — → 6 | B, poses; the "statues" are the held clock (§5) |
| 13 | Physics / ground contact | 6→7 | 7→7 | 5→6 | 6 → 7 | |
| 14 | Detail density | 5→6 | 6→7 | 5→6 | 5 → 6 | |
| 15 | Environmental integration | 6→7 | 7→7 | 6→6 | 6 → 7 | |
| 16 | Visual cleanliness | 6→6 | 6→7 | 6→6 | 6 → 6 | |

Family mean per critic: A 6.00 → 6.57, B 6.29 → 6.71, C 5.43 → 5.93; medians
5.93 → 6.43 — the round's largest family move, with every critic up. The head
(lion form r7 `522cbdc`, r8 `d75c60e`) is what moved it: brow, lids with dark
margins, nose leather, cupped ear, lip and chin (A, B; C "a lion's shape with
a toy's eyes"); toes with claws and a shadow under them (C); contact under the
forepaws `lion_close.png` (240,262,300,280) vs beside −0.40 → **−1.00 st**
(A; C's boxes −0.79 → −1.18). Coat anisotropy in the flank box (295,150,355,200)
0.81 → 0.79 at 512 and 0.99 → 0.77 at 1280 (§11: the round-5 target ≥ 1.3 is
not met on this metric).

### Lion feet & gait (`lions_walk/walk_00..07`, 8 × 0.3 s, 512×288, camera at 2.2 m — not frame-comparable with round 5's 1.3 m strip; judged on its own terms, as all three did)

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | — | 5→7 | — | 5 → 7 | C's tuft on the paw row — §5 |
| 2 | Silhouette | — | 5→6 | — | 5 → 6 | |
| 3 | Geometry | — | 5→5 | — | 5 → 5 | legs tubes, paws cones (B) |
| 4 | Scale | — | 7→7 | — | 7 → 7 | |
| 8 | Lighting | — | 6→6 | — | 6 → 6 | |
| 9 | Shadows | — | 7→7 | — | 7 (held 6 in R5) → 7 | the decal is in the frame now |
| 11 | Color / atmosphere | — | 6→6 | — | 6 → 6 | |
| 12 | Animation | 6→7 | 6→7 | 5→6 | 6 → 7 | |
| 13 | Physics / ground contact | 5→7 | 6→7 | 6→7 | 6 → 7 | |
| 14 | Detail density | — | 5→5 | — | 5 → 5 | |
| 15 | Environmental integration | — | 6→7 | — | 6 → 7 | |
| 16 | Visual cleanliness | 5→6 | 6→6 | — | 5.5 → 6 | |
| 17 | Temporal stability | 6→7 | 6→6 | 6→6 | 6 → 6 | |

Family mean per critic: A 5.50 → 6.75, B 5.85 → 6.31, C 5.67 → 6.33; medians
5.81 → 6.31. Three critics, one strip, the same reading: the paws hold, the
swing flexes, the decal is under each planted paw; and three complaints that
are one complaint — A "the head is a fixed block", C "a rigid spine" (back row
within 1–2 px across the strip; mine within 107–111 on the mask's top row),
B "the stride wobbles ±25 %" (steps 21/16/25/20/27/16/18 px; A 13–23, C 14–19).
§5 for the settled details.

### Lighting & atmosphere

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | — | 7→7 | — | 7 → 7 | the moon is in a frame |
| 4 | Scale | — | —→7 | — | — → 7 | the moon: 6 × 5 px ≈ 0.5° (B; C 7 on its own terms) |
| 6 | Texture quality | — | 7→7 | — | 7 → 7 | stars as points |
| 8 | Lighting | 8→7 | 7→7 | 7→6 | 7 → 7 | **drop** A, C (§1, §6) |
| 9 | Shadows | 6→7 | 7→7 | 7→7 | 7 → 7 | |
| 10 | Reflections | 6→7 | 6→6 | 5→6 | 6 → 6 | |
| 11 | Color / atmosphere | 6→7 | 7→8 | 7→7 | 7 → 7 | |
| 14 | Detail density | 6→7 | 7→7 | — | 6.5 → 7 | |
| 15 | Environmental integration | — | 7→7 | — | 7 → 7 | |
| 16 | Visual cleanliness | 8→7 | 6→5 | 7→6 | 7 → 6 | **all down** (2) (§1; B's day-moon item withdrawn, §13) |
| 18 | Browser performance | — | 6→6 | — | 6 → 6 | |

Family mean per critic: A 6.67 → 7.00, B 6.70 → 6.70, C 6.60 → 6.40; medians
6.75 → 6.70. Lighting r7's round-5 targets, measured (§7): `truck_night/
mainroad.png` sky rows 40–58 0.0260 → **0.0181** (target 0.017–0.020), ground
(0,240,640,360) 0.0238 → 0.0249 (0.02–0.03), `camp_arrive_night` pad ÷ band
0.63 → 0.67 (≤ 0.7) with the pad at 0.0118 (asked ≥ 0.013 — a hair under),
hero paint over the upper sky −0.56 → +1.33 st (≥ +0.8), sky sat 0.67 → 0.55
(asked 0.45–0.55), moonlit ground hue 3° → 242° (190–260°). Every number the
round-5 consensus set for lighting r7 is met or within 10 %. The moon
(`truck_night/moon.png`): a 23-px disc over 0.35 at (442–448, 64–69), peak
0.83, corona +2.0 st at r 10, +1.0 st at r 24 over a sky of 0.010; thin cirrus
and the watchtower; no clip (A, B, C agree; B: it reads as a bright star — no
limb or maria, weakness).

### Performance (`stats.json`)

| # | Category | A | B | C | median R5 → R6 | flag |
|---|---|---|---|---|---|---|
| 18 | Browser performance | 5→5 | 6→6 | 6→6 | 6 → 6 | |

`truck_day/hero` 488 → 486 calls, 2.183 → 2.177 M tris, programs 175 → 175,
textures 293 → 292; `mainroad` 611 → 622 (+11 at every hour, the largest move
— B: the litter scatter); `rear` 656 → 658; runtime 614 / 607 / 613 →
570 / 637 / 621 (day / dusk / night), 2.93 → 2.42–2.75 M tris (C does not
credit the drop: it follows the truck's new spot); `ultra_day/interior` 778 →
654 calls, 4.62 → 3.48 M tris (B's round-5 weakness answered); new `moon`
views 430–547 calls; per-view `views` is populated in the truck sets now (round
5 tool defect 9, half closed — `camp_*`, `fleet/`, `lions_*` still carry no
`stats.json`).

## Investigated rather than averaged

### 1. The head-on beam — the verdict question

Three critics, one set of frames, two readings. A (pass): "the pose has now
shown the pool and it is too bright" — Lighting and Cleanliness 8 → 7 each,
and the question "was round 5 also shot with the deterministic pre-roll?". B
(fail): Cleanliness 7 → 5, "the ground is white at whatever angle it is seen
from", with the caveat that if the consensus reads the on-axis `front` as a
capture change the drop is one point. C (fail): Lighting 7 → 5, "whether the
cause is the pale sand at the new spot, a lamp gain, or the dusk clock, the
frames are the evidence".

**The frames, R5 → R6, my measurements** (linear Y unless marked):

| frame, box | R5 | R6 |
|---|---|---|
| `truck_night/front.png` lower third (0,240,640,360): median / p5 / p95 | 0.0159 / 0.003 / 0.068 | **0.4934 / 0.076 / 0.705** |
| same: px over linear 0.5 / over 0.7 / frame over 0.9 | 0 / 0 / 0 | **37 535 / 4 934 / 0** |
| same: largest ground blob over sRGB 0.5 (rows 230–360) | 175 px (a lamp's foot) | **61 760 px** — the whole third |
| `truck_dusk/front.png` lower third median / px over 0.5 / frame over 0.7 | 0.0135 / 0 / 0 | **0.439 / 30 951 / 1 639** |
| same: grille (235,190,360,232) p95 vs sky rows 0–50 p95 | 0.076 vs 0.470 | 0.282 vs 0.424 (still under the sky) |
| `truck_night/road.png` lower third: px over 0.5 / p95 | 0 / 0.058 | **817 / 0.411** |
| `truck_night/hero.png` lower third: px over 0.5 / p95; largest sRGB-0.5 ground blob | 0 / 0.057; none (the two lamps only) | 523 / 0.283; **4 900 px at (0–187, 258–319)** |
| `ultra_night/road.png` lower third over 0.35 / over 0.5 | 2 / 0 | 29 368 / 2 633 |
| headlamp blobs over 0.5, `front` (rows < 230) | 1 586 + 1 276 | 2 694 + 2 017 (they run into the pool) |
| headlamp blobs over 0.5, `hero` | 489 + 309 | 495 + 304 (unchanged — B) |
| B's veil: hf-std/mean in (380,320,560,360) vs the textured bank (200,250,400,300), night | — | 0.052 vs 0.082 (dusk 0.060 vs 0.090) |

B's and C's counts reproduce to the pixel (B 37 535 / 30 951; C's 77 764 and
62 422 are the same rows at sRGB 0.5 — mine 59 911 / 59 208 over the lower
third, the difference being C's rows 230–360). Nothing is over 0.9 in any truck
frame (the round-5 line holds). The thing in the frame is not only lit ground:
below row ~300 the bank loses its texture (hf 0.052 against 0.082 above it)
and becomes a cream field — B's "veil in the beam" — and at 3× the frame shows
the beam's cross-section slices stacked into the camera. **What the camera is
looking at, head-on from a level road, is the beam sprite itself: the
flat-topped `lens` disc (`src/sky.js` L2919 `smoothstep( lensR * 1.6, lensR *
0.7, vRad )`, weighted 1.4 against the core's 0.8 at L2931) and the additive
slice stack that "integrates" when the eye looks down the beam (L2937–2941),
over the beam's pool on the sand.**

**Is it the round-6 world or the round-6 camera?** Four facts, two of them
re-verified here from frames:

1. *The framing changed for a tool reason.* On a fresh boot `setView` leaves
   the truck at (−36.6, 2.63, 1.77), heading 11.5°, autoT 0.5032 in every build
   from `84c1e5e` through `ab2aaac`, `e298790` and `c2f0b83`. Round 5's truck
   ended mid-corner and rolled because `tools/shots.mjs` drives the game live
   for two seconds before the per-view `setView`s and, before `f8c0531`, the
   pre-roll inherited that drive's steer, yaw rate and body springs. The
   round-5 `front` frames show the bend and the ruts at a front-quarter angle
   with the beams running off along the trail to the right (`/tmp/consensus6/
   pair_front_night.png`); round 6's is head-on. The world under the truck did
   not change; the camera did. This answers A's first question, B's question 1
   and C's question 2 — and C's "pale sand at the new spot" is the same trail
   seen along its axis rather than across the bank.
2. *At the deterministic spot the blown ground predates every round-6 car
   change.* The master's ablation on fresh worktrees, night `front`, lower
   third: `f8c0531` (capture reset landed, lighting r7 landed, no hero car r7)
   **median 0.435, 31 158 px over 0.5 — already blown**; `2250d88` (hero car
   r7, the near-field spill) 0.494 / 37 704; `c2f0b83` 0.493 / 37 535. The
   frames corroborate it from the other side: the hero car r7 builder's own
   after-set `shots/r7_car/after_night/front.png` is stamped `d35416d+`
   (the HUD plate: vegetation r6's bundle, a worktree *without* the capture
   reset) and has the spill in it — and its lower third reads **0.027 / 349 px**,
   the pool off frame; `shots/r8_car/before_night/front.png`, stamped `7827d1d`
   (after `c2f0b83`), reads 0.494 / 37 712, and car r8's after-set 0.494 /
   37 699 (car r8 changed no glare). So the spill without the deterministic
   camera does not blow the frame, and the camera without the spill does. The
   spill's own increment is a fifth of the pool (0.435 → 0.494, +0.18 st;
   31 158 → 37 704 px) plus the `road` hot patch: `r7_car/before_night/road.png`
   (no spill) 0 px over 0.5, p95 0.107; `after_night` (spill, old camera)
   2 645 px, p95 0.469; the round-6 frame 817 px, p95 0.411. **That patch is
   real and new** — B's "smaller versions at the other night cameras".
3. *Round 4 saw this pool.* The round-5 consensus §17 recorded the round-4
   `front` with **20 380 px over 0.35** — "the blown pool" — and B scored
   round-4 Cleanliness 5 on it; round 5's "0 px over 0.35" (and the
   must-not-regress lines "no ground blob ≥ 20 px over sRGB 0.5 in `hero` or
   `front`", "0 px over 0.7 in `truck_dusk/front.png`") were written on a
   camera that the live drive had turned off the beam. On comparable framings
   the category reads R4 5 → R6 5: the pool was never fixed, and round 5's 7
   was the camera.
4. *Dusk.* C's "lamps lit with the sun still up" and "R5's dusk hour had the
   lamps off" — §2: the lamps were on at dusk in round 5 (`truck_dusk/
   mainroad.png` pool 0.145 → 0.156, the round-5 must-not-regress "the trail
   pool stands"), the dusk clock did not move (`mainroad` sky rows 0–60 0.360 →
   0.360), and the grille is still under the sky (p95 0.282 vs 0.424). The
   dusk `front` shows the same sprite and pool the night one does, 0.5 st
   dimmer.

**Ruling.** The gate concerns the world. The round-6 world did not regress on
the hero car's lighting or cleanliness: a deterministic camera exposed a
pre-existing defect that round 5 approved by accident, and hero car r7 added a
fifth to it and a hot patch in `road`. **Capture-exposed pre-existing defect;
the gate passes.** B's 7 → 5 and C's 7 → 5 are recorded in the matrix with
these frames, the median Cleanliness 7 → 5 stands *on the frames*, and the
round-5 must-not-regress lines that rested on the accidental camera are
rewritten below. Had it been ruled a regression, what would have to be rolled
back is `f8c0531` — the capture reset — because rolling back `2250d88`'s spill
leaves the frame at 0.435 / 31 158; nobody should want that, and the world
under the truck did not change either way. Two readings are right at once:
A's "the pose has now shown the pool and it is too bright" and B's "the ground
is white at whatever angle it is seen from" — a beam that whites out a third
of the frame when looked into is the round's top hero-car and lighting
weakness whoever owns the camera, and it is hand-off 1.

**Who owns what.** Lighting r8 owns the sprite (`src/sky.js`): the `lens` disc
is flat-topped and weighted 1.4; hero car r8's ablation (`0894c56`, after the
frames) puts `uGlareGain` to 0 and takes the front lamp blob **801 → 191 px** —
the glare plateau all three critics described (B: "filled ellipses flat at
0.5–0.73 with no lens structure") is the sprite's lens disc, not the lamp
material's `applyLampGlow`, so B's round-5 prescription for `applyLampGlow`
(1.6 / 1.8 / 0.4) is redirected to the sprite. The slice stack seen down its
axis needs B's gate: the sheet's accumulated alpha clamped where the view ray
is within ~15° of the lamp axis (B: `* (1 − smoothstep(0.85, 1.0, ax))` beside
`wSlice`'s `smoothstep(0.80, 0.97, ax)`), so a camera looking into the beam
sees the pool on the ground, not the sheet. The car owns the spill level
(`src/vehicle/index.js` L182–200, `BEAM.night.spill 10`, `BEAM.dusk.spill 0`):
B's ÷5 at night is the number that takes `road`'s p95 0.41 back toward 0.15;
the dusk pool needs no spill change (spill 0 at dusk — the dusk slab is the
beam sprite and pool alone). Targets in the hand-off.

### 2. The dusk hour did not move; the lamps were on at dusk in round 5 too (C)

C: "`truck_dusk/hero.png` sky rows 0–60 median 0.159 → 0.350 (+1.1 st); the
dusk frames now read as late afternoon with the lamps on" — Lighting &
atmosphere weakness 2, and the ask to gate the lamps off at dusk. Measured on
the cameras that do not move with the truck: `truck_dusk/mainroad.png` sky rows
0–60 median **0.360 → 0.360**, p95 0.449 → 0.448, hue 22° sat 0.30 both rounds;
`truck_dusk/forest.png` 0.338 → 0.348. The hour is the same. C's hero box
changed content with the heading: round 5's rows 0–20 read 0.365 and rows
0–60 0.159 — the rolled truck's hero camera had crowns in rows 20–60; round
6's rows 0–20 read 0.318, rows 0–60 0.350 — open sky. And the dusk lamps were
on in round 5: the trail pool the round-5 consensus recorded as a
must-not-regress (`truck_dusk/mainroad.png` (120,150,280,200) Ymed 0.145) reads
**0.156** now (hero car r7 restored `BEAM.dusk` toward it after r6's cut; the
round-5 hand-off asked 0.10–0.16 — met). C's lamp gate is **declined**; C's
rewrite of the grille test is not needed — grille p95 ≤ sky p95 holds (0.282 vs
0.424); what fell is the "0 px over 0.7 in `truck_dusk/front.png`" line, which
was the camera (§1) and is rewritten as a target.

### 3. The windscreen from outside — A's grey sheen, C's lilac veil, and the box (Hero Reflections 8/6/7, Glass drops)

Hero car r7 (`2250d88`) gated the screen's grazing sky term to cameras
outside the cab (`src/vehicle/materials.js` L640–663, `graze 0.5` ramping from
45° to 66° of incidence). Three readings of it. A (Reflections 7 → 8, weakness
3): a sheen at last, but grey — (245,100,320,140) hue 53° → 160°, sat 0.06
under a sky of sat 0.35. C (Glass 7 → 6 in two families, weakness 2):
`truck_dusk/hero.png` pane (258,112,322,148) medY 0.071 → **0.365**, hue 287°
sat 0.12, "a flat lilac-white pane at the sky's luma with the interior gone".
B: flat (the tool's cameras, `see` within ±0.01).

Measured. A's box straddles the frame and the cab: at 512 it holds 55 % of
pixels with a sky hue. Hero car r8's proposed re-site (262,114,322,146) is
~95 % glass, and there the round-6 screen reads **Ymed 0.438, mean hue 223°,
sat 0.15, blue-leaning pixels 91–92 %** under a sky of hue 217° sat 0.37 —
the round-5 acceptance (hue ≥ 120°, blue-leaning ≥ 60 %) is met, and A's
"grey" is his box. C's is the finding: at dusk the pane sits at **1.04 × the
sky median** (0.365 vs 0.350) with p90 0.498, and by day the re-sited box
(0.438) is +0.85 st *over* the sky in (400,0,640,40) — the term reaches the
full reflected radiance where a glass at 55–59° should return 0.3–0.4 of it
(the code's own estimate, "0.6–0.84 of 0.5", does not match the frame), and
the pane's saturation (0.12–0.15) is under the sky's (0.29–0.37). The seat is
untouched (`interior` see 0.796, veil 0.059; `ws_mid` 0.877). **Decision:**
Reflections 6 → 7 stands (the screen returns the sky it faces; the lens too,
§15); C's one-point Glass drop is fair and is carried as the car's second
weakness with the reconciled fix: `graze 0.5 → 0.3` (pane ≤ 0.6 × the sky
median from the hero camera at every hour, C), the reflected term tinted by
the sky's chroma so the pane's saturation is ≥ 0.6 of the sky's (A), the
re-sited box (262,114,322,146) as the box, and `interior` / `ws_mid` `see`
held.

### 4. The lion's dusk rim — flat within method noise, on a lion in a different pose

A: "the rim lost half its lift" (+0.29 → +0.13 st median, columns ≥ +0.3 st
72 → 34 of 150, gap 22 → 26) — Lighting held at 7 but a must-not-regress line
"half-broken". B: 46 % → 33 % of columns, gap 13 → 40, median +0.26 → +0.12 —
"the pose differs; a question, not a drop". C: 75/140 → **86/140**, gap 23 →
12 — a *gain*, in C's must-not-regress. Three methods, three directions.

I ran all three column methods on both frames (`lions_dusk/lion_close_dusk.png`,
first outline step ≥ 0.10 scanning down, rim rows over interior rows):

| method | R5 | R6 |
|---|---|---|
| A: cols 270–420, +1..+3 vs +10..+20 | median +0.23 st, **61**/150 ≥ +0.3, gap 16 | +0.15 st, **61**/150, gap 15 |
| B: +1..+3 vs +7..+14 | +0.15 st, 48/150, gap 13 | +0.11 st, 44/150, gap 28 |
| C: cols 250–390, +0..+2 vs +8..+18 | +0.30 st, 69/140, gap 22 | +0.26 st, 61/140, gap 18 |

The count of rim columns is flat on A's method (61 → 61) and within 4–8 columns
on the other two; the median lift is 0.04–0.08 st lower; the longest gap
shrinks on two methods and grows on one. Neither A's collapse nor C's gain
reproduces; what all three of us measured is a rim of the same reach on a lion
whose outline is not the same (top-of-outline rows at cols 200–450, every 25:
R5 81/25/78/89/77/62/76/56/57/107; R6 79/48/49/67/78/102/81/61/105/82 — the
head turned toward the camera, the back foreshortened, as B said). Specks in
the lion band (pixels > 0.08 over their 3×3 median) 913 → 608 (A: 651 → 411 on
his definition) — the dots are fewer, as asked. **Decision: the rim is held;
not a regression, not a gain.** The round-5 line "dusk rim ≥ +0.7 st over the
flank" was a builder's number on a different measure (lion form r7 reports
+0.55 → +0.86 st on its own tool) and is not comparable to a column method;
rule for round 7 under tool defects (one method, a fixed pose).

### 5. The walk strip — the holds are real, one of C's is the body shadow, the decal is four rows, the world is frozen by design

**Holds.** All three read planted paws holding (A: cols 336 `00–02`, 258
`02–04`, 182 `05–07`; B: 329–342 `00–02`, 172–185 `05–07`, 287–307 `05–07`;
C: 292–300 `00–04`, 250–258 `01–03`, 232–246 `04–07`). Pixel-identity clusters
(lion pixels in rows 168–186 that differ from the eight-frame median by > 0.10
and change by < 0.02 between consecutive frames): `00→01` 321–347 and 292–306;
`01→02` 299–342 and 274–288; `02→03` 259–273; `03→04` 288–297; `04→05`
214–230; `05→06` 287–313, 249–262, 195–215, 180–184; `06→07` 262–313, 204–222,
170–193. A's and B's columns are in the clusters. **C's five-frame hold at
x ≈ 292–300 is not a paw**: C's own box (292,178,300,182) reads 0.159 / 0.126 /
0.118 / 0.135 / 0.165 over frames 0–4 and 0.178 once "free" — a value that
changes every frame is the body's shadow ellipse passing over the ground, not a
paw holding its pixel (a planted paw holds to < 0.02, as the clusters show).
C's other two holds are real. The builder's probe (`c2f0b83`: slide 1.1e-13 m,
penetration 0) and the frames agree; **the plant is not to be touched**.

**Decal depth** (A: a 6-row patch; B: 2–3 px, "small"): under the hind paw at
col 336, rows 176–186 in `walk_01` against the same pixels free in `walk_07`:
the paw itself occupies rows 176–179 (−3.5 to −5 st: black fur on straw), and
the rows below it read **−3.2 / −1.7 / −1.2 / −0.5 / −0.08 st** (rows 180–184).
The darkening is four rows at ≥ 0.5 st, then a tail — between A's six (he
counted the paw) and B's two or three (he stopped at 0.7 of the background).
Part of the four rows is the body shadow. At 15° a 0.15 m decal radius
projects to ~4 rows; it is what the code draws. B's "radius 0.15 → 0.25 m" is a
taste knob, optional.

**Stride and spine.** B's coat-mask centroid steps 21/16/25/20/27/16/18 px per
0.3 s (±25 %); A 13–23; C 14–19 on the leg group. My mask is contaminated by
the median background where the lion lingers and does not improve on B's. The
top of the walker's outline holds within 1–2 px across the strip (C: rows
60–61 on his crop; mine 107–111 on the mask), the nose row and eye line do not
move against the withers (A), no toe-off frame (A). Three complaints, one
fix: a spine/head track keyed to the stance phase and a root translation at
constant speed (hand-off 4).

**The tuft on the paw row** (C: "(330–345, 160–190) hides the near hind paw in
`walk_01`–`_03`"; B: "no tuft between the camera and a planted paw"; A: the
crossings are tufts in front, legitimate). The crop (`/tmp/consensus6/
walk_tuft_123.png`, 5×): the tuft stands at the toe of the planted hind paw in
`walk_01`–`_02` and overlaps its tip by a few pixels; the paw and its shadow
are readable in all three frames. B's Composition 5 → 7 stands; C's ask (thin
the lawn within 1 m of the walk line, or move the strip's start 0.5 m) is kept
as a tool item — the round-5 hand-off "no `extra` tufts within 1.2 m of the
walk line" (vegetation r6) did not reach this tuft.

**The frozen world** (C's question 4; B's question 5 and Vegetation Animation
4; A's fire question). Between any two strip frames the sky, the water, the
foreground tufts and the resting lions change **0.00000** (mean |Δ|; the
resting lions 0.00007 once, `00→01`). This is by design: the capture holds the
simulation clock (`src/clock.js`: `main.js` zeroes `simClock.t` at the start of
a pre-roll and a frozen frame holds it; `2032e81d` moved the beam dust and the
ripple onto it so two shots of one view agree), and the strip steps only the
lions. The tuft and foliage materials *do* carry wind (`src/forest.js` L221
`applyWind`, `uTime` fed from `simClock` at L4479; `grassMat` is a
`foliageMaterial` and gets it) — the strip cannot show it. **B's Vegetation
Animation 4 is set aside as `—`**, the rubric's rule for a category the frame
cannot show; B's Lions Animation 6 stands on the poses it scores; the resting
lions' idle (chest, ear, tail), the flame's flicker and the water's ripple are
scorable only on a clock-running pair, which is a tool item for round 7
(atmosphere) and not a finding against the world.

### 6. The campground — the fire pool cut as asked, the reach line rewritten; the mess floor lifted twice over

**Fire.** `camp_night/camp_fire_night.png`, round-5 targets in brackets:

| box | R5 | R6 | target |
|---|---|---|---|
| pool (230,185,320,210) Ymed / hue / sat / % over 0.3 | 0.355 / 31° / 0.33 / 62 % | **0.135 / 23° / 0.46 / 13 %** | 0.14–0.20 / 22–26° / 0.50–0.60 / ≤ 30 % |
| flame box (270,150,310,205) px over 0.5 | 529 | **116** | ≤ 250 |
| far corner (20,230,120,280) sat | 0.29 | 0.09 | ≤ 0.3 |
| 8 m (200,240,320,288) sat / hue | 0.43 / 20° | 0.13 / **330°** | ≤ 0.5 |
| warm-lit (hue 10–50°, sat > 0.3) share of frame (A) | 37.4 % | **6.2 %** | R5 "must not regress": 36 % |
| ground 3 m: A (200,200,360,288) / B (230,200,330,220) | 0.101 / 0.219 | 0.049 / 0.082 | — |

Campground r5 (`0a52cc9`) did what the round-5 hand-off asked — peak
`(5 + 16·night)`, hue 24°, pool 0.36 → 0.17 on the builder's box — and the pool
landed a hair under the floor (0.135 against 0.14) with the saturation short
(0.46 against 0.50) and the flame small enough. The cost is A's finding: the
fire lights 6 % of its frame where it lit 37 %, the 8 m ground has gone to the
moon's hue, the chairs round the pit are silhouettes. **The round-5
must-not-regress line "the fire's reach (warm-lit 36 %)" contradicted the
round-5 pool target** — a pool at 0.14–0.20 with a flame under 250 px cannot
light 36 % of a 512×288 frame warm — and it is rewritten: warm-lit 15–25 %,
8 m hue ≥ 15°. B's read ("the flame is the right size; the light was cut with
it") and C's ("Y inside my target, saturation short") are the same frame; A's
Lighting 8 → 7 is fair on his line. Reconciled fix: the point light's peak up
a third (`src/campground/fire.js` L427 `(5 + 16·night)` → `(6 + 21·night)`,
≈ +0.4 st) with the colour warmer (C's `(1.0, 0.55, 0.25)`) so the pool lands
0.16–0.18 at sat ≥ 0.5 and the 8 m hue comes back over 15°; flame sprite
unchanged; A's "tongue count back toward round 5's footprint" is declined —
the 529-px over-blend body was round 5's regression.

**Mess floor and pockets.** `camp_day/camp_mess.png`, measured:

| box | R5 | R6 | target |
|---|---|---|---|
| C pocket (300,236,340,256) under pad (104,224,144,240) | 2.91 st | **0.96 st** | ≤ 2.5 (round 5); C's "1.5–2.2" |
| interior (150,150,400,240) p5 under the pad (B) | −3.29 st | **−2.57 st** | ≥ −2.5 |
| B floor (200,200,330,235) vs sunlit L (0,240,120,288) | −1.50 st | **−0.59 st** | "open floor −1.5 to −2" |
| A open floor (250,235,330,255) / table (275,205,305,220) / chairs (330,205,360,222) | −2.02 / −2.00 / −1.65 | −0.54 / −1.19 / −0.78 | |
| darkest 8×8 pocket in the interior | 3.28 st | 2.90 st | ≤ 2.5 |
| `ultra_camp/camp_mess.png` same pocket (750,590,850,640) | 2.95 st | **1.69 st** | |
| fly edge 10–90 % (A / B) | 10.5 / 16 px | 17 / 35 px | ≥ 25 |

Two things landed on the same floor. Campground r5 gave the mess day lamp
reach for the eave pockets (`src/campground/index.js` L270 `day: { intensity
13, distance 6.5 }`) — that is tier-independent and shows at 1280 (the pocket
2.95 → 1.69 st). Lighting r7 found that the far shadow cascade's `uCascade`
uniform had never reached a program and fixed the guard with `farRadius 4.5`
(`src/sky.js` L615–633): the day far cascade is live for the first time, its
penumbra is what A and B measure (17 / 35 px), and at the fast tier's map
resolution a 4.5-texel radius is wider than a table leg — that is the
tier-dependent part (0.96 st at 512 against 1.69 at 1280; C's finding). The
pockets reached their target (p5 −2.57 st, darkest 2.90) *because the whole
floor came up* (B), and the open floor overshot the round-5 window by a stop.
A's Shadows flat, B's 7 → 6 and C's 6 → 5 describe the same floor from three
boxes; the median holds at 6 and the fix is one item: `messLamp.day intensity
13 → 6`, `distance 6.5` kept (B, A), and the fast tier's `farRadius` scaled to
its map (C) — targets: floor −1.5 ± 0.2 st, C's pocket 1.5–2.2 st at both
tiers, p5 ≥ −2.6 st, edge ≥ 25 px kept.

### 7. Night ground over the horizon band (B) — lighting r7's targets are met on the trail; the fleet pads are the finding

B, Lighting & atmosphere weakness 2: the sky came down 0.5 st and the ground
did not — `mainroad` ground +0.58 st over its horizon band (round 5 −0.01),
camp pad +0.65, fleet trailer +2.88, utility +2.00; fix "moon/indirect ×0.7".
A: the hero's upper sky 0.0233 → 0.0121 (1 st dimmer) with the ground now
+0.62 st over it. C: the night sky darker "as asked", and the *camp* pad
0.6 st down against the trail.

Measured against what the round-5 consensus asked of lighting r7:
`truck_night/mainroad.png` sky rows 40–58 0.0260 → **0.0181** (asked
0.017–0.020), ground (0,240,640,360) 0.0238 → **0.0249** (asked 0.02–0.03), band
(0,95,640,115) 0.0240 → 0.0166, ground ÷ band **−0.01 → +0.59 st** (B's
number). The two round-5 targets together — a sky at 0.017–0.020 over a ground
held at 0.02–0.03 — *put the trail over its band by construction*; B's line
"night ground under the horizon band" was B's own, not the consensus's, and
on the trail the r7 numbers are the ones asked for. Camp: `camp_arrive_night`
pad (150,200,400,285) 0.0146 → 0.0118 against a band (0,105,512,115) 0.0233 →
0.0176, **pad ÷ band 0.63 → 0.67** (asked ≤ 0.7; the pad is a hair under the
0.013 floor — C's finding, and C's "camp a stop under the trail" is the pad's
albedo against the laterite, both rounds); B's +0.65 st is on `camp_gate_night`
with the band taken at rows 60–80, 25 rows above the skyline (row ~100), where
the sky is 0.0157 — a box, not the pad.

**The fleet pads are the finding.** Ground rows 200–270 against sky rows 5–40,
R5 → R6: trailer +0.60 → **+2.88 st** (ground 0.032 → 0.114, hue 23° → 218°),
utility +0.63 → +2.00, jeep_2 −0.13 → +1.43, jeep_0 −0.28 → +1.13, motorcycle
+0.19 → +1.11; ranger −0.72 → +0.03, supply −0.94 → +0.11, expedition −2.10 →
−1.26. `fleet/trailer_0_night.png` is a cool floodlit pan under a dark sky
(`/tmp/consensus6/pair_trailer.png`); it has no lantern in it and its hue is
blue, so it is not the row lamps. The camp's own pads at the same hour rose
0.021 → 0.025 (`camp_gate_night`) or fell (`camp_arrive_night`), so either
lighting r7's fill (`src/sky.js` L805 `fill 34 → 56`, `groundIndirect 1.2`)
reads ×3.5 on the pale fleet-pad albedo, or `tools/fleetshots.mjs` is at a
different night level than `campshots.mjs`. **A frame cannot separate those**;
carried as a lighting r8 item with the probe in the hand-off, and B's ×0.7 is
**not adopted** as written because it would take the `mainroad` ground under
its 0.02 floor. A's "sky band ×1.4 back toward 0.017" would undo the r7 target
(the hero's upper sky is a different elevation from `mainroad`'s rows 40–58 at
a different heading; the r7 target was the latter) — noted, not adopted.

### 8. Road & terrain Reflections 6 / 7 / 4 (spread 3) — the round-5 §7 reading, unchanged

B: the pool is pixel-identical — (340,116,400,124) mean sRGB (156, 148, 145),
hue 17°, sat 0.07, −0.19 st under the sky over the ridge, +0.77 over the mud
ring, in both rounds (measured: identical to the digit). C: Reflections 4,
the kopje reflections "still smooth dark domes with clean elliptical rims" at
2× in `ultra_lions/lion_close.png` (300–640, 150–280); and, under Materials,
the pool *body* (270,115,290,125) 0.076 → 0.178 (−2.2 → −0.97 st under the
sky) — brighter and bluer. A: 6, water unchanged, the wet annulus still a
pale line (`lion_far` rim 0.169 both rounds, measured). Terrain r6
(`ab2aaac`) is in the frames and claims the domes now sample the rock tile
with rims broken by the ripple at radius 0.44; C's body box did brighten
(+1.2 st: the rock tile), and C still reads clean rims at 2×. Three critics
describing one pool at three weights, as in round 5; the median 6 stands, C's
domes are terrain r7's (hand back the rim break — the claim is not shown at
1280), and B's "tint the murk by `uSkyHor`" is **not adopted** for the round-5
§1 reason (the clear pool mirrors the haze band it faces; B's box straddles
the two-toned pool). A's rim fix (albedo × 0.6 in the `zMud` band) is carried
unchanged — the round-5 hand-off did not reach the frame (rim/plain −0.05 st
both rounds).

### 9. Vegetation — the dusk crown target is met; C's "≈ 4 st" is a mask; B's Animation 4 set aside; the far plain's fall is the skirt fix

Lighting 8 / 8 / 6: A and B measure the dusk crown lit through
(`truck_dusk/forest.png` (250,30,600,120) median −3.38 → −2.24 st (A), −3.38 →
−1.92 (B, whole-row mask), black pixels 24 → 9.8 %); C reads the green-mask
median at 0.0208 under a sky of 0.348, "≈ 4 st under", and holds 6. Measured
on A's box: non-sky crown pixels median **−3.27 → −2.01 st**, p90 −1.30 → −0.97,
pixels under Y 0.01 **23.2 → 9.0 %** (targets ≤ 2.5 st and ≤ 10 %: met); the
green-hue mask (hue 50–160°, sat > 0.2) median −4.15 → **−1.25 st** — C's
0.0208 is not reproduced on any mask I can build in that box, and his own R5
line (−3.3 st, round-5 §11) matches A's. The median 8 stands. Vegetation r6's
"pale straw" and "sun split" claims hold (§Vegetation matrix). B's Animation 4
is `—` (§5). One more finding sits under Road & terrain: the `lion_far` far-
plain band (0,117,150,129) went 0.85 → **0.73** of the sky over it (B −0.24 →
−0.45 st; C 0.76 → 0.66 on a different sky box) — that is vegetation r6's
skirt-band fix (`0293443`: the far skirt was `MeshStandardMaterial` with a
specular the Lambert terrain lacks, +0.45 st in the critics' box → Lambert,
"band = bare"). The band is now the bare plain's value; whether that plain
should fog toward the ridge above it (C's far ramp beyond 250 m) is a terrain
r7 taste item, not a regression.

### 10. Hills — in band on every frame, at the ceiling on some

All three, and mine (consensus ridge method, median over kept columns):
`truck_day/mainroad.png` 0.81 → **0.86** (p90 0.92); `fleet/suv_0_day.png`
0.84 → 0.88 (p90 0.93); `ranger_0_day` 0.84 → 0.87; `lions_day/lion_pride.png`
0.82 → 0.88; `lion_far` 0.74 → 0.80. Terrain r6 set floor 0.84 / ceiling 0.87
and the frames sit there. B's two segments at 0.895 and A's "hold here; do not
lift the hill tone again" are the same warning; C asked 0.85–0.90 and has it.
The plate (B: body paler than crest in 17 of 20 columns, was 20 of 20) is not
fixed — terrain r6's `hillFar` item did not land — and stays terrain r7's.

### 11. Lions — Geometry 7 / 8 / 6, the eyes, the catch-light, the coat's lie

**Geometry** (B 6 → 8, A 6 → 7, C 5 → 6): the same head. B credits the loft
(muzzle, nasal ridge, nose pad, lid, ear cup, chin); A sees the same and a
muzzle "still a box with a drawn mouth" at 1280; C "a lion's shape with a
toy's eyes" — eyes 40 px on a 340-px head (1/8; a lioness's ≈ 1/12) — and the
barrel body. Median 7; C's eye scale and A's philtrum/whiskers are the
hand-off. **Eyes:** `lions_day/lion_face.png` pale pixels round the left iris
(193,91,217,115) 49 → **113** — A read it right: it is the buff patch lion form
r8 painted under the eye (`d75c60e`: "the under-eye black margin replaced by a
4.5 mm tear line and a buff patch"), not sclera; the right eye 20 → 16. At 1280
B's box is unchanged (pale 43 → 47, dark 849 → 906) and C's right-eye box
reads pale 19 → 0 with **Ymax 0.67 → 0.47** — the catch-light is dimmer at
ultra (A: 0.57 → 0.48 / 0.65 → 0.56), lion form r7's "56-degree cornea cap and
no sheen". Reflections 5 held by all three; the dim highlight is a lion form
item. **The coat's lie** (A: anisotropy 0.79, "no direction yet"; C: "strands
run shoulder → elbow", Materials 5 → 6): the gradient ratio |dY/dy| / |dY/dx|
in the flank box is 0.81 → 0.79 at 512 and 0.99 → **0.77** at 1280 — on this
metric the coat has *less* vertical structure than before, not more; lion form
r7's `anisotropy 0.6` and r8's 8:1 flow field do not show in it. C reads
direction at 3× on the dusk frame, where the rim lights the strands. Two
metrics, one coat; the round-5 acceptance (≥ 1.3) was the gradient ratio and
it is not met. Carried, with the ask that lion form r10 report the ratio on
its own before/after.

### 12. Glass tool numbers — `night_ext` is the background; `mirror` flick is not comparable

`night_ext` see 0.962 → 0.876 (A weakness 3, C weakness 3 with a fix). The row
carries `bgLuma` 0.075 → **0.103** and veil 0.021 → 0.027: the pane's own
number moved 0.006; the background behind it — the moonlit ground lighting r7
lifted — moved 37 %. B's reading. `see` is background-relative and a darker or
brighter world behind the same pane moves it; C's "night reflectance ×0.6" is
**not adopted** on this evidence (the pane paid 0.006 of veil). `mirror` flick
0.0083 against `flickBg` 0.0019 (ratio 4.4, A weakness 2): the tool's
background for the `mirror` view is the surround (frame, door), which does not
move, while the pane's content is the reflected world, which does — the ratio
is not the world-pane ratio the other rows carry (C's reading; B: "absolute
0.008 is below anything visible"). Tool items 5 and 6.

### 13. The moon by day and dusk

A, B and C: `truck_day/moon.png` is a 64 560-px sheet over 0.5 (21 273 over 0.7)
with no disc; `truck_dusk/moon.png` frames the sun behind an acacia. The view
aims at the hour's *key light* by design — `src/camera.js` L44 `aim: 'key'`,
"the sun by day, the moon at night" — so the day and dusk frames are the sun's
aureole and are not scored; the moon is scored at night only (B's Scale 7,
C's 7). B's Cleanliness count of the day sheet is withdrawn by his own rule
("I would withdraw that if it is a tool artefact"); the median 7 → 6 does not
move. Tool item 3: document the view or shoot it at night only.

### 14. The build stamp

`776d40a` (the HUD) is the bundle commit of `c2f0b83` (the source commit), as
`tools/baseline.sh` L42 records for every deploy. B's question 2 and C's
question 1: one build, all sets. `shots/round6/SOURCE` carries only the URL;
tool item 2.

### 15. The headlamp lens (C, Reflections 6 → 7) — the boxes do not track the truck

C: `ultra_day/hero.png` upper lens (428–448, 345–372) Ymed 0.170, lower
(382–398, 410–438) 0.133 against a sky of 0.257 — −0.6 / −0.95 st with a
blue-over-tan horizon in the dome (round 5: −1.5 to −2 st, no sky). On the
round-5 consensus boxes ((285,364,302,388), (438,344,456,374)) the round-6
frame reads −2.07 / −1.83 st — because the truck moved in the frame with the
heading and those boxes are no longer on the lenses; C's boxes on the round-5
frame read +0.01 / −0.51 for the same reason. Like regions: C's boxes on the
round-6 lenses are the reading, and hero car r7's "lens/cover close" landed
(within 1 st of the sky, hue 24–28° — still warmer than the sky it should
mirror). Tool item 9.

## Where the critics agree — top weaknesses per family, one fix each

| Family | Weakness (frames, boxes) | Reconciled fix (module, parameter, value) | Target |
|---|---|---|---|
| **Hero car / Lighting** | The beam looked into: `truck_night/front.png` lower third median 0.493, 37 535 px over 0.5, p5 0.076, hf 0.052 under the bank's 0.082 (the sheet); `truck_dusk/front.png` 0.439 / 30 951; `truck_night/hero.png` 4 900-px sRGB-0.5 ground blob at (0–187, 258–319); `truck_night/road.png` 817 px, p95 0.41 (A, B, C — §1) | **Lighting r8**, `src/sky.js`: the glare sprite's `lens` disc (L2919, weight 1.4 at L2931) peaked, not flat-topped — car r8's ablation says `uGlareGain 0` takes the front blob 801 → 191 px, so the plateau is here, not in `applyLampGlow`; the slice stack gated where the view ray is within ~15° of the lamp axis (B: `* (1 − smoothstep(0.85, 1.0, ax))` beside `wSlice`'s gate) so a camera looking down the beam sees the pool, not the sheet. **Hero car**: `BEAM.night.spill 10 → 2` (`src/vehicle/index.js` L268; B's ÷5), `decay 1 → 2` on the spill spots (L185) | `front` night lower third median 0.06–0.10, p95 ≤ 0.35, p5 ≤ 0.03; dusk ≤ 0.25 × sky; no ground blob ≥ 20 px over sRGB 0.5 in `hero`/`front`/`road` at the deterministic spot; each `front` lamp blob ≤ 600 px over 0.5 with a peaked centre; `road` lower third p95 ≤ 0.15; `mainroad` pools kept (night 0.18 ± 0.03, dusk 0.10–0.16); nine pods untouched (troughs ≤ 0.25 at 640) |
| Hero car | Windscreen from outside at the sky's luma: `truck_dusk/hero.png` (258,112,322,148) 0.071 → 0.365 vs sky 0.350, hue 287° sat 0.12, interior gone (C); day re-sited box (262,114,322,146) 0.438 vs sky 0.242, sat 0.15 vs 0.37 (A "grey") — §3 | `src/vehicle/materials.js` L663 `graze 0.5 → 0.3`; the grazing term's colour multiplied by the sky's chroma (A) | pane ≤ 0.6 × sky median from the hero camera at every hour with the cabin readable at 3×; box (262,114,322,146) hue 180–260°, blue-leaning ≥ 60 % (91 % now), pane sat ≥ 0.6 × sky's; `interior` see ≥ 0.79 / veil ≤ 0.065, `ws_mid` see ≥ 0.85 held |
| Hero car | No dust, no print behind a cruising truck: every `truck_*` frame; `wheel.png` rows 200–360 no particle; `rear.png` the undisturbed trail under (480–620, 300–360) (A, C) — round 7's theme | `src/dust.js` emitter keyed to speed ≥ 3 m/s per wheel; a tread-print decal along the wheel path for the last ~15 m, −0.3 to −0.5 st under the rut (A) | `rear.png`: a print band under each rear wheel −0.3 to −0.5 st; a dust veil (sat ≤ 0.3, +0.2 st) over the ground behind the truck; the capture's seeded dust stream (`f8c0531`) keeps two shots identical |
| **Car glass** | The mirror a painted plate on exterior cameras: `glass/mirror.png` pane sky 1.9 st under the world's (A), −0.33 st and 1.7× sat vs the window's (B), straw 0 % vs 41.8 % in the scene, a floating crown disc at (423–438, 84–89) (B, C) | landed after the frames in car glass r7 `173c55a` (live from the seat at every tier; plate ramp (−0.3, −0.9); straw 0 → 16 %) — **verify**; for the plate that remains on exterior cameras: its sky term at the live sky's luminance (A) and the far tree row drawn with trunks or crowns within 4 px of the composite horizon faded (B) | pane skyline within ±3 px of the reflected ridge from the seat; straw ≥ 10 % below it; plate sky within 0.3 st of the world's; no crown disc without a trunk; ≤ 100 calls added, seat only |
| Car glass | `night_ext` see 0.962 → 0.876 — the moonlit background (`bgLuma` 0.075 → 0.103), veil +0.006 (§12) | none in the pane; tool: report `see` with `veil` and `bgLuma` on the same row, and `mirror` flick against the `moving` background (0.110) or absolute | veil ≤ 0.03 on `night_ext`; `moving` flickRatio < 1 kept (0.87) |
| **Fleet** | Lamp in chrome and the jeep's disc: `safari-jeep_0_night.png` (228–264, 134–158) 479 px over 0.5, 114 px over sRGB 0.85 under a 3-px source (C); `motorcycle_0_night` 349 + 164 px, `supply-truck_0_night` 350 + 170 (A, B, C) | `src/vehicles/materials.js` fleet `clearcoatRoughness 0.08 → 0.22` (C), chrome roughness floor 0.12–0.15 at night (A, C); `lampGlass.emissiveIntensity` 2.4 × lvl kept | no body-panel or chrome blob over 0.5 larger than the lamp head's own; jeep_2 0 px over 0.7 kept |
| Fleet | The dark end and the darkest body: `safari-jeep_2_night` body 0.44 of its sky (A); supply 0.57, expedition body ≈ the pad (B) | `src/campground/layout.js` `rowLamps`: the third pole's `facing` toward jeep_2, or a fourth at u −2 (A, B) | every row body ≥ 0.5 of its sky (jeep_2 0.44) |
| Fleet | Fleet-frame ground over the sky: trailer +2.88 st, utility +2.00 (B — §7) | lighting r8 with tools: probe `fleetshots.mjs`'s night level against `campshots.mjs`'s; if the same hour, the night fill's pad term (`src/sky.js` L805 `fill 56`) keyed by ground albedo | fleet pads ≤ +0.5 st over their sky, trailer ≤ +1.0; `mainroad` ground 0.02–0.03 and sky 40–58 0.017–0.020 held |
| **Campground** | The fly floor lifted a stop and the table pockets washed out at fast: `camp_day/camp_mess.png` floor −1.50 → −0.59 st (B), C's pocket 2.91 → 0.96 st (1.69 at 1280), open floor −0.54 st (A) — §6 | `src/campground/index.js` L270 `messLamp.day intensity 13 → 6`, distance 6.5 kept (B, A); `src/sky.js` L633 `farRadius 4.5` scaled by the fast tier's map resolution (C) so the far cascade's blur stays under a table leg | floor −1.5 ± 0.2 st; pocket (300,236,340,256) 1.5–2.2 st at both tiers; interior p5 ≥ −2.6 st; penumbra ≥ 25 px kept; pad Ymed within 3 % |
| Campground | The fire lights 6 % of its frame (37 %): 3 m ground 0.101 → 0.049, 8 m hue 330°, pool 0.135 / sat 0.46 (A; B, C) — §6 | `src/campground/fire.js` L427 peak `(5 + 16·night) → (6 + 21·night)`, light colour `(1.0, 0.55, 0.25)` (C); flame sprite unchanged | pool 0.16–0.18, sat ≥ 0.5, hue 22–26°; warm-lit 15–25 % (the round-5 36 % line rewritten); 8 m hue ≥ 15°, sat ≤ 0.5; flame ≤ 250 px over 0.5; far corner sat ≤ 0.3 |
| Campground | Camp night pad under its floor: `camp_arrive_night` pad 0.0118 (asked ≥ 0.013), `camp_fire_night` near ground L 0.0228 → 0.0148 (C) | with the fleet-pad item: the night fill's pad term; +0.15 st on the camp pad only | pad 0.013–0.016 with pad ÷ band ≤ 0.7 (0.67) |
| **Road & terrain** | Hills a plate at the ceiling: body paler than crest 17/20 columns (B); ridges 0.86–0.90 with p90 0.92–0.93 (A, B, C — §10) | `src/terrain.js` `hazeChunk`: `hillFar = 1` on the hill mesh, `hillFog` floor 0.82/0.90 (B, round 5); `hillTone × 0.94` on the two segments at 0.895 (B); ceiling 0.87 kept | body/crest ≤ 0.95; every ridge 0.75–0.88, none over 0.90 |
| Road & terrain | Kopje domes with clean rims at 1280 (C; terrain r6's rim break not shown), the wet annulus a pale line (A: rim/plain −0.05 st both rounds), the pool warm-neutral (B, not adopted — §8) | ellipsoid rims: the ripple jitter on the rock *test*, not only the shade, or the 256×128 planar target (C, round 5); `zMud` band albedo × 0.6 (A, round 5 — did not land) | dome interior std ≥ 0.4 × the boulder above; no clean elliptical rim at 2×; rim −0.4 to −0.7 st under the plain |
| Road & terrain | Far plain 0.73 of the sky under a ridge at 0.80–0.86 (`lion_far` (0,117,150,129); B, C — §9) | `src/terrain.js`: the hill's far ramp on the terrain sheet beyond ≈ 250 m (C) | band ≥ 0.75 of the sky with the acacia rows still under it |
| **Vegetation** | Tufts from above are flat pale ellipses: `lions_walk/walk_04.png` (180,175,330,196) nine blobs at aspect 1.3–2.8 : 1 (A); card sods with hard alpha edges at 3× (C) | `src/forest.js` near-LOD tuft: a third card at 30° from vertical or a horizontal crown card (A); `planes 7`, `ragged 1.6`, `alphaTest 0.45` (C, round 5) | no pale blob ≥ 10 px wide with aspect > 1.5 : 1 in the strip's ground band |
| Vegetation | The lie-up ease keys off one anchor: cover in front of the right lion 15 % vs 44 % left (A) | `src/forest.js` `extra` inner ease per lion, `lerp(0.55, 1, …) → lerp(0.8, 1, …)` (A, round 5) | both boxes ≥ 20 % |
| Vegetation | Wind unscorable on the strip (§5) | tool: a clock-running two-frame idle pair (1.5 s apart) of the pride and the strip camera | a 20-px tuft moves 1–2 px between the pair; the planted paw's contact still readable |
| **Lions** | The face at 1280: eyes 1/8 of head width, a ball proud of the lid (B, C); muzzle a plane with a drawn mouth, no whisker pads or strands (A, C); catch-light 0.67 → 0.47 (§11) | `src/wildlife/lion/headspec.js`: eye ×0.75 (C), socket 4 mm deeper with a 3 mm upper lid and 1.5 mm overhang (B); nose block / upper-lip planes with a philtrum, two whisker-pad domes, eight whisker strands per side (A); cornea highlight back to ≥ 0.6 | no globe past the lid margin at 1280; ≥ 0.4 st lit/shade split across the philtrum; catch-light Ymax ≥ 0.6 at 1280 |
| Lions | Coat has no lie on the gradient metric: flank (295,150,355,200) 0.79 at 512, 0.77 at 1280 (A; C reads direction at 3× — §11) | `src/wildlife/lion/textures.js` strand stretch 8:1 already in; make it show: strand contrast ×1.5 along the flow with the isotropic mottle halved (A's `roughness 0.84 → 0.7` kept) | anisotropy ≥ 1.3 on the flank box at both resolutions, measured by the builder |
| Lions | Barrel body on short legs: forearm ≈ 0.6 of chest depth, no scapula or hip point (C; B's "legs are tubes") | `src/wildlife/lion/geometry.js` leg loft: thigh 1.6× the hock diameter tapering to 1.0×, a scapula bulge and a hip point (B, C); legs ×1.3 only after the head/body ratio (0.28, C) is re-checked | thigh reads against the hip in `walk_*` at 4×; forearm ≥ 0.75 of chest depth |
| **Lion feet & gait** | A rigid spine and head over a steady walk; the stride wobbles 13–27 px per 0.3 s (A, B, C — §5) | `src/wildlife/lion/pose.js`: ±1.5 cm vertical spine/head track at twice the stride frequency phase-locked to the hind plants, ±3° head pitch, a slow ±8° yaw drift (A, C); root translation from a constant speed with the feet planting to it (B); swing ease-out — protraction ≤ 40 % of mid-swing speed in the last 20 % before contact (C) | back row varies ≥ 2 px across the strip; nose travel ≥ 2 px between stance phases; centroid steps within ±10 %; swing-paw x-step in the last frame before plant ≤ 8 px; the plant untouched (0 px holds) |
| Lion feet & gait | Paws are cones, legs tubes (B); no toe-off frame (A) | lion form: paw as a flattened pad 1.3× the cannon width with four toe bumps (B); pose: a toe joint with 25° dorsiflex at lift-off (A) | one frame per step with only the toe pad down at 0.3 s; toes read at 512 |
| Lion feet & gait | The tuft at the toe of the planted paw, `walk_01`–`_02` (330–345, 160–190) (C) | tool: `tools/lions.mjs` strip start +0.5 m along the line, or the lawn `reserved()` widened to 1.5 m on the walk line | no tuft touching a planted paw in the eight frames |
| **Lighting & atmosphere** | The beam looked into (all three) — row 1 | lighting r8, row 1 | row 1 |
| Lighting & atmosphere | Fleet pads +2.0 to +2.9 st over their sky; camp pad a hair under its floor (B, C — §7) | rows Fleet 3 / Campground 3 | as there |
| Lighting & atmosphere | The moon a bright star: 23 px over 0.35, no limb or maria (B) | `src/sky.js` moon sprite: a 16×16 maria texture at contrast 0.25 and limb darkening 0.15 (B) | 3–4 grey levels inside the disc at 640; corona kept (+1 st at r 24) |
| **Performance** | `mainroad` +11 calls at every hour (the litter); `rear` 658 the heaviest fast view (A, B); programs 175–180 flat (B) | the litter folded into the lawn species' instanced mesh (B); the perf census `86a4c74` (after the frames) finds `rear`'s +172 over the hero is the forest/fleet/camp behind the truck — merge the fleet row by material (C) | ≤ 490 calls on the fast hero (486), `mainroad` ≤ 615, programs ≤ 177 |

## Regressions and must-not-regress

**Regressions by median:** Hero car Visual cleanliness 7 → 5 and Lighting
7 → 6, Lighting & atmosphere Visual cleanliness 7 → 6 — one cause, §1, ruled
capture-exposed with a fifth of the pool and the `road` patch owed to hero car
r7's spill. Recorded, not counted against the gate. **Regressions inside
categories** (no median moved): the mess floor −1.50 → −0.59 st and the fast-
tier pockets 2.91 → 0.96 st (§6); the fire's reach 37 → 6 % (§6, the line
rewritten); the fleet pads +2.0 to +2.9 st over their sky (§7); the camp pad
0.0118 against a 0.013 floor (§7); the ultra catch-light 0.67 → 0.47 (§11);
the windscreen at the sky's luma from the hero camera (§3). **Claimed and
not a regression:** the dusk hour (§2), the lion's dusk rim (§4), the `night_ext`
pane (§12), the frozen strip (§5), the far-plain band (§9), the day `moon`
frame (§13), the coat's lie (unchanged, 0.81 → 0.79).

**Round-5 lines that rested on the accidental camera, rewritten as targets**
(they were never true of the world): "no ground blob ≥ 20 px over sRGB 0.5 in
`truck_night/hero.png` or `front.png`", "the soft beam pool", "0 px over 0.7 in
`truck_dusk/front.png`", "`front` lower third median 0.016 with 0 over 0.35" —
all now the acceptance for lighting r8 / hero car r9 at the deterministic
spot (table, row 1). Kept from round 5 as must-not-regress because they hold
on the new camera too: dusk grille p95 ≤ sky p95 (0.282 vs 0.424); nothing
over 0.9 in any truck frame (0 everywhere); no lamp blob over 0.85 in
`truck_dusk/detail.png` (0); the `mainroad` pools (night 0.182, dusk 0.156).

**Must not regress (union of the three lists, with the numbers that hold
them):** *Hero car and glass* — nine separate pods with troughs ≤ 0.25 at 640
and ≤ 0.25 at 1280 (0.13–0.25 / 0.13–0.24), ≤ 100 px over linear 0.5 in the
hero bar box (91), no disc in the night sky, largest sky blob ≤ 40 px at 640
and ≤ 100 at 1280 (32 / 91); the moonlit body over the upper sky ≥ +0.8 st
(+1.33) and the night silhouette (paint over the whole sky +0.56 st, C); the
level body (pitch 0.2°) and tyre contact at every camera (no gap at 4×); the
screen box (262,114,322,146) blue-leaning ≥ 60 % (91 %); lens boxes within 1 st
of the sky (−0.6 / −0.95); `see` ≥ 0.87 on the four exterior day panes,
`interior` 0.79 / veil ≤ 0.065, `night_int` ≥ 0.92 (0.965), `moving` flickRatio
< 1 (0.87), static flick ≤ 0.03, hot 0 / clip 0 / `barPx` 0; the mirror's face
from the seat; 486 calls on the fast hero. *Fleet* — the SUV bumper's sky band
(top face ≥ 0.3, under-face ≤ 0.1); the chrome wheel; jeep_2 0 px over 0.7;
darkest body ≥ 0.4 of its sky; magenta 0 %; the trailer framed. *Campground*
— pockets p5 ≤ −2.5 st; flame ≤ 250 px over 0.5; pool Y ≤ 0.20 and far corner
sat ≤ 0.3; canopy top not lit from beneath; both gate lanterns; the smoke
plume; pad ÷ band ≤ 0.7. *Road & terrain* — every ridge 0.72–0.92 (0.80–0.90);
hill sat ≤ 0.22; the pool under the sky and over the mud ring, the kopje in
it; ruts under the truck; night `mainroad` ground 0.02–0.03 and sky rows 40–58
0.017–0.020. *Vegetation* — straw ≥ 30 % of the pride's lower third (41.8 %);
dusk crown ≤ 2.5 st under the sky and ≤ 10 % black (−2.01 st, 9.0 %); the day
crown split sunward (+1.23 st, builder); night canopies dark, not missing;
tuft base shade. *Lions* — the head (muzzle, ear cup, lid, chin, buff patch),
toes with claws and their shadow, chest/forepaw contact ≤ −1.0 st, the
multiplying decal, amber eyes with a catch-light, the dusk rim at 61/150
columns on A's method, no crescents. *Lion feet & gait* — planted paws holding
within 2 px for ≥ 2 frames (0 px on the clusters), the four-row contact under
each planted paw, hind flexion in swing, feet unoccluded, the 2.2 m camera and
the 0.3 s strip as the judging frame. *Lighting* — moonlit ground hue 190–260°
with sat ≤ 0.25 on every night frame; stars as points (≤ 0.5 % of the sky over
0.35); the moon in `truck_night/moon.png` with its corona; the mess penumbra
≥ 25 px; programs ≤ 177 at fast.

## Weakest object in the game

**The lion, for the fourth round, by two of three — but it is the round's
largest gain and the gap is closing.** A: still the lion at 1280, "a cat now,
not a plush" — brow, lids, nose leather, ruff there; a box muzzle with a drawn
mouth and no whiskers. C: still the lion, "less so" — a lion's shape with a
toy's eyes, a barrel body on short legs, a rigid spine. B names something
else: **the ground in front of the truck at night** — white where the lamps
touch it, over the sky where they do not — and the lion's legs second. All
three name `truck_dusk/front.png` / `truck_night/front.png` as the weakest
single picture in the set (A: "a white sheet of sand under a truck whose
grille is lit from below by its own pool"). Lions' medians 5.93 → 6.43, the
cells at 5 down from four to one (Reflections, the eyes); Lion feet 5.81 →
6.31. Third: the door mirror, a plate at every exterior angle (C; live from
the seat since `173c55a`, unscored). Fourth: the kopje domes (C, three
rounds).

Family means, R5 → R6, over the categories each critic scored in both rounds:

| Family | A | B | C |
|---|---|---|---|
| Hero car | 7.12 → 7.12 | 7.00 → 6.81 | 6.73 → 6.53 |
| Car glass | 6.67 → 7.00 | 6.67 → 6.80 | 6.33 → 6.33 |
| Fleet | 6.54 → 6.77 | 6.53 → 6.67 | 5.96 → 6.18 |
| Campground | 6.64 → 6.64 | 6.79 → 6.64 | 6.00 → 6.00 |
| Road & terrain | 6.40 → 6.50 | 6.53 → 6.53 | 6.00 → 6.00 |
| Vegetation | 6.09 → 6.27 | 6.23 → 6.54 | 5.86 → 6.14 |
| Lions | 6.00 → 6.57 | 6.29 → 6.71 | 5.43 → 5.93 |
| Lion feet & gait | 5.50 → 6.75 | 5.85 → 6.31 | 5.67 → 6.33 |
| Lighting & atmosphere | 6.67 → 7.00 | 6.70 → 6.70 | 6.60 → 6.40 |
| Performance | 5.00 → 5.00 | 6.00 → 6.00 | 6.00 → 6.00 |
| all scored | 6.46 → 6.72 (n 95) | 6.52 → 6.63 (n 126) | 6.08 → 6.19 (n 86) |

## Tool and process defects

1. **The pre-roll was not deterministic before `f8c0531`, and round 5 approved
   a camera.** Round 5's truck frames were shot from wherever the two-second
   live drive left the truck (mid-corner, rolled — `truck_*/forest.png`), the
   round-5 consensus recorded a "level" truck on the pitch number alone
   (0.2°), and four must-not-regress lines about the beam pool were written
   on a camera that had turned off the beam (§1). Round 5's tool defect 1
   asked for a pitch/spot assert; the assert should be the deterministic
   pose: spot (−36.6, 2.63, 1.77) ± 0.1 m, heading 11.5° ± 1°, roll ≤ 0.5°,
   autoT 0.5032 — read from `vehicle.root` before a truck set is written, and
   written into `stats.json` so a critic can see it.
2. **`SOURCE` carries a URL, the HUD a bundle hash, the brief a source hash**
   (B, C). `shots/roundN/SOURCE` should carry both hashes (`c2f0b83` /
   `776d40a`) and the capture time; the same for builders' before/after sets —
   `shots/r7_car/after_night` is stamped `d35416d+`, a worktree behind the
   capture tooling, which is why its `front` frame did not show the pool its
   spill was landing in (§1). A builder's after-set must be on a worktree at or
   ahead of the current capture commit.
3. **The `moon` view aims at the key light** (`src/camera.js` L44) — the sun by
   day and dusk. Either document it in the view's name (`key`) and score the
   night frame only, or shoot it at night only (A's, B's and C's question).
4. **The strip holds the simulation clock** (`src/clock.js`; §5) so the world
   is bit-identical across it. Right for the gait; it means wind, ripple,
   flame and idle cannot be scored on any current frame (B's Vegetation
   Animation 4 set aside). Round 7 (atmosphere) needs a clock-running pair:
   two frames 1.5 s apart of the pride and of the fire at night, and A's 0.1 s
   sub-strip over one step for the toe-off.
5. **`glass` tool: `see` is background-relative** — `night_ext` 0.962 → 0.876 on
   a veil change of 0.006 (§12). Report `veil` and `bgLuma` on the row and
   score the pane on `veil`.
6. **`glass` tool: `mirror`'s `flickBg` is the surround**, so its ratio (4.4) is
   not the other rows' number (§12). Report the pane's flick absolute, or
   against the `moving` background.
7. **Rim continuity has three methods and a moving pose** (§4): A 72 → 34, B
   46 → 33 %, C 75 → 86 on the critics' own runs; 61 → 61 / 48 → 44 / 69 → 61
   on mine. Rule for round 7: one method (first outline step ≥ 0.10 scanning
   down, rim rows +1..+3 against +10..+20, columns 270–420 on the 512 dusk
   close-up), and the builder's `--probe`/studio frame for the pose, since
   the lions' poses change between rounds (gait r5/r6 changed the resting
   states).
8. **Paw holds read by eye can be shadows** (§5): C's five-frame hold at
   x ≈ 292–300 is the body shadow crossing a box (0.159 → 0.126 → 0.118 →
   0.135 → 0.165). A hold claim should be a pixel-identity cluster (|Δ| < 0.02
   between frames on lion pixels), which B's and my trackers both produce at
   the 2.2 m camera; C's "automatic tracking fails" was the 1.3 m camera's
   problem.
9. **Boxes that do not track the subject between rounds** (§15): the round-5
   lens boxes on `ultra_day/hero.png` read −2.1 / −1.8 st on the round-6 frame
   because the truck moved in the frame with the heading. A box on a truck
   part should be quoted with a landmark (the lens rim's own pixel bounds) or
   the shot tool should emit part boxes with the frame.
10. **Three campground drops from three boxes on one floor** (§6): A "open
    floor", B "shaded floor", C "pocket" — all right, none the same number.
    Where a family has a hand-off target, the critics should measure the
    target's box first and their own second.
11. `stats.json` still missing for `camp_*`, `fleet/`, `lions_*` (C; round 5
    item 9); per-view `views` populated for the truck sets now (closed);
    `moon` view has no per-view counts (C).
12. **The `mainroad` night pad carries the beam pool** (round 5 §5) and B's
    "ground over band" on `mainroad` is what the r7 targets asked for (§7);
    the pad/band test stays a camp-approach test.

## Landed after the frames — unscored

- **Car glass r7 `173c55a`**: the door mirror live from the seat at every tier
  (120×160 target, alternating frames, in-cab cameras within 1.5 m only; the
  plate for exterior cameras with the (−0.3, −0.9) ramp; straw 0 → 16 % below
  the skyline; +90 calls from in-cab cameras, +1 program); the ultra door-glass
  stipple was the pane SSR march (side and cabin panes off the reflector path,
  checkerboard 4.24 → 0.43 %); tool: `flick/flickBg` on every row (in these
  frames), `mirror` eye 140 mm lower and forward with a trim-in-pane assert.
- **Lion form r9 `ee3a497`**: the mane as clumped locks; the plank source
  under the old rings (`uvIn` clamped v); temporal fossa, lateral canthus, chin.
- **Hero car r8 `0894c56`**: a horizon in the paint — brightwork sky ramp and
  blur as uniforms (`skyRamp 0.04`, `blurFloor 0.02`, `blurSlope 0.5`; door
  band over base 0.59 → 1.37 st, `ws_mid` bonnet skyline +1.29 st); light-bar
  LED radius 0.024 → 0.022 (293 px over 0.5 at 1280); the two ablations folded
  in here: clearcoatRoughness never blurred the horizon (the GLSL constants
  did — B's `0.15 → 0.06` is withdrawn by the evidence), and `uGlareGain 0`
  takes the front blob 801 → 191 px (§1); the windscreen box re-site (§3).
  Round 5 §13's "clearcoat not shown at 640" is the claim to verify on round-7
  frames.
- **Perf census r2 `86a4c74`**: hero 492 calls / 2.18 M at fast, programs 175
  boot / 178 after a full drive, heap flat; `rear`'s +172 over the hero is the
  forest/fleet/camp behind the truck, not the roadside.
- **Rear lamps `6fe9777`** (HEAD): one `amber` material lit every orange lens
  on the truck (fender and side markers, mirror repeaters, front and rear
  indicators) at 3.2 all night beside tail cells at 4.0, both over the night
  bloom threshold 2.0 — the row of orange lamps with merging halos on the back
  of the truck in the chase cam. Indicators are their own material now, lit
  6.0 only while the relay ticks; marker/tail running levels 1.5 / 1.8, brake
  11 and reverse 7 still bloom. In none of the round-6 frames (the round-6
  `hero` night frame shows the old amber on the roof-box lamp); to be scored on
  `truck_night/rear.png` and the chase cam in round 7.

## Hand-offs to round 7 builders

In priority order. Each carries the frame, the box and the number that
accepts it; knob values are the reconciled ones from the table.

1. **Lighting r8 — the beam looked into** (`src/sky.js` glare sprite and slice
   stack; with hero car for the spill). `truck_night/front.png` lower third
   (0,240,640,360) median 0.493 → **0.06–0.10**, p95 0.705 → ≤ 0.35, p5 0.076 →
   ≤ 0.03 (the ground visible under the sheet); `truck_dusk/front.png` median
   0.439 → ≤ 0.25 × the sky median (≤ 0.09), ≤ 50 px over 0.7 (1 639), grille
   p95 ≤ sky p95 kept (0.282 vs 0.424); no ground blob ≥ 20 px over sRGB 0.5 in
   `truck_night/hero.png` (4 900 now), `front` (61 760), `road` (20 693) or
   `truck_dusk/front.png` (61 108) at the deterministic spot; each `front` lamp
   blob ≤ 600 px over linear 0.5 with a peaked centre (2 694 / 2 017 now,
   flat); `truck_night/road.png` lower third p95 0.41 → ≤ 0.15 and 0 px over
   0.5 (817). Held: `mainroad` night pool (120,150,280,200) 0.18 ± 0.03, dusk
   0.10–0.16 (0.156); the nine pods (troughs ≤ 0.25 at 640, ≤ 100 px over 0.5 in
   the hero bar box); nothing over 0.9. The sprite: the `lens` disc (L2919)
   peaked (`smoothstep(lensR·1.6, lensR·0.3, vRad)` × a radial falloff) and its
   weight 1.4 → 0.6 against the core's 0.8, since car r8's ablation shows the
   plateau is the disc (801 → 191 px at `uGlareGain 0`); the slice stack gated
   by the view ray's angle to the lamp axis (B's `(1 − smoothstep(0.85, 1.0,
   ax))` beside `wSlice`'s gate) so the sheet's accumulated alpha is ≤ 0.35
   looked into. Car: `BEAM.night.spill 10 → 2`, spill `decay 1 → 2`
   (`src/vehicle/index.js` L185, L268); `BEAM.dusk.spill` stays 0. Test on
   this spot *and* on a red-earth bank (C): the ablation numbers above are
   the deterministic spot's; the round-4 bank read 20 380 px over 0.35.
2. **Lion gait r7 + lion form r10 — the walk's spine and the face's eye**
   (`src/wildlife/lion/pose.js`, `headspec.js`, `geometry.js`, `textures.js`).
   Gait: back row varying ≥ 2 px across `lions_walk/walk_00–07` (now ≤ 2), nose
   travel ≥ 2 px between stance phases (0), centroid steps within ±10 % (B's
   16–27 px), swing-paw x-step ≤ 8 px in the last frame before plant, a toe-off
   frame per step — spine/head track at twice the stride frequency
   phase-locked to the hind plants, root at constant speed with the feet
   planting to it, swing ease-out, a 25° toe dorsiflex at lift-off. **The plant
   is not to be touched** (0 px holds on every cluster; probe slide 1e-13).
   Form: eye ×0.75 with the socket 4 mm deeper and a 3 mm lid (no globe past
   the lid margin at 1280 in `ultra_lions/lion_face.png` (637,206,701,254));
   catch-light Ymax 0.47 → ≥ 0.6 at 1280 in C's right-eye box (671,195,711,235);
   nose block / upper-lip planes with a philtrum and two whisker-pad domes,
   eight whisker strands a side (≥ 0.4 st lit/shade split across the philtrum
   at 1280); thigh 1.6× the hock, a scapula bulge and a hip point, paw pads
   with four toe bumps (thigh reads at 4× in `walk_*`; forearm ≥ 0.75 of chest
   depth in `lions_day/lion_close.png`); coat anisotropy on the flank box
   (295,150,355,200) ≥ 1.3 at 512 (0.79) and its 2.5× box at 1280 (0.77),
   measured by the builder before and after. Re-check head/body (0.28 on
   `walk_02`, C) before any leg scaling. Resting idle (chest 0.25 Hz, ear flick,
   tail tip) lands with the clock-running pair (tools item).
3. **Campground r6 — the mess floor and the fire** (`src/campground/index.js`,
   `fire.js`; with lighting for the far cascade). `camp_day/camp_mess.png`: B's
   floor (200,200,330,235) vs sunlit L (0,240,120,288) −0.59 → **−1.5 ± 0.2 st**;
   C's pocket (300,236,340,256) under the pad (104,224,144,240) 0.96 → 1.5–2.2 st
   at 512 *and* 1280 (1.69 there now); interior (150,150,400,240) p5 ≥ −2.6 st
   (−2.57); A's fly edge ≥ 25 px kept (17 / 35). `messLamp.day intensity 13 →
   6`; `farRadius 4.5` scaled by the fast tier's map so the far cascade's blur
   at 512 stays under a table leg. `camp_night/camp_fire_night.png`: pool
   (230,185,320,210) 0.135 → 0.16–0.18 at sat ≥ 0.5 (0.46), hue 22–26° (23°);
   warm-lit (hue 10–50°, sat > 0.3) 6.2 → 15–25 %; 8 m (200,240,320,288) hue
   ≥ 15° (330°), sat ≤ 0.5; flame box (270,150,310,205) ≤ 250 px over 0.5
   (116); far corner sat ≤ 0.3 (0.09). Peak `(6 + 21·night)`, colour
   `(1.0, 0.55, 0.25)`. Camp pad (`camp_arrive_night` (150,200,400,285)) 0.0118 →
   0.013–0.016 with pad ÷ band ≤ 0.7 — with lighting r8's pad item.
4. **Lighting r8 (second item) with tools — the pads over their sky.**
   `fleet/trailer_0_night.png` ground rows 200–270 vs sky rows 5–40 +2.88 st →
   ≤ +1.0; `utility_0_night` +2.00 → ≤ +0.5; every other fleet pad ≤ +0.5 st
   over its sky; `mainroad` ground 0.0249 (0.02–0.03) and sky rows 40–58 0.0181
   (0.017–0.020) **held**; hero paint over the upper sky ≥ +0.8 st held
   (+1.33); ground hue 190–260° held. First a probe: `fleetshots.mjs` and
   `campshots.mjs` at the same night clock reading the gate pad — if the fleet
   frames are at a different level it is the tool; if the same, the night
   `fill` (`src/sky.js` L805, 56) and `groundIndirect 1.2` need an albedo-aware
   pad term (the fleet pad is the palest ground in the game) rather than B's
   global ×0.7. The moon disc: 3–4 grey levels and limb darkening 0.15 (B).
5. **Hero car r9 — the screen, the spill, the dust, the rear lamps**
   (`src/vehicle/materials.js`, `index.js`, `src/dust.js`). Windscreen from
   outside: `truck_dusk/hero.png` (258,112,322,148) 0.365 → ≤ 0.6 × the sky
   median (0.350) with the cabin readable at 3×; the day box (262,114,322,146)
   hue 180–260° and blue-leaning ≥ 60 % kept (223° / 91 %), pane sat ≥ 0.6 ×
   the sky's (0.15 vs 0.37 now); `interior` see ≥ 0.79 / veil ≤ 0.065 and
   `ws_mid` see ≥ 0.85 held — `graze 0.5 → 0.3` (L663), the term tinted by the
   sky's chroma. Spill: item 1's `road` numbers. Dust and prints (round 7's
   theme): `truck_day/rear.png` a print band under each rear wheel −0.3 to
   −0.5 st under the rut; a dust veil (sat ≤ 0.3, +0.2 st) over the ground
   behind a truck cruising ≥ 3 m/s; `wheel.png` rows 200–360 with particles
   in frame — the seeded stream (`f8c0531`) keeps two shots identical. Rear
   lamps (`6fe9777`, landed-unscored): `truck_night/rear.png` — no orange blob
   over the bloom threshold except while the relay ticks; tail cells at 1.8
   under the threshold, brake/reverse not in the frame; score it and the chase
   cam. Verify car r8's paint horizon on the round-7 frames: door band over
   base ≥ +1 st (builder 1.37), `glass/ws_mid.png` bonnet skyline ≥ +0.7 st
   (1.29), `ws_close` bonnet ≤ 0.45, dusk grille over the sky ≤ 0 st.
6. **Terrain r7** (`src/terrain.js`): the plate — body (+12..+22) / crest
   (+2..+8) ≤ 0.95 on `truck_day/mainroad.png` and `lions_day/lion_far.png`
   (17/20 columns paler now), `hillFar = 1` on the hill mesh, `hillFog` floor
   0.82/0.90, and `hillTone × 0.94` on the two segments at 0.895 so no ridge
   passes 0.90 (0.86–0.90 now, p90 0.92–0.93); the kopje rims —
   `ultra_lions/lion_close.png` (330–600, 190–260) no clean elliptical rim at
   2×, dome std ≥ 0.4 × the boulder's (terrain r6's ripple jitter on the shade
   did not break the rim; jitter the rock *test*, or the 256×128 planar
   target); the wet annulus `lion_far` (130,126,260,130) −0.4 to −0.7 st under
   the plain (−0.05 both rounds — the round-5 knob did not land); the far
   plain band (0,117,150,129) ≥ 0.75 of the sky (0.73) via the hill's far ramp
   on the sheet beyond 250 m (C) — optional; ruts as displacement (C) —
   optional.
7. **Vegetation r7** (`src/forest.js`): near-LOD tufts with a crown from
   above — no pale blob ≥ 10 px wide with aspect > 1.5 : 1 in the strip's ground
   band (`lions_walk/walk_04.png` (180,175,330,196), nine now); the right
   lion's cover (300,235,380,260) ≥ 20 % (15 %) with the left kept (44 %); the
   tuft at the planted paw (330–345, 160–190) off the walk line (`reserved`
   1.5 m or the strip start +0.5 m — with tools); card silhouettes (`planes 7`,
   `ragged 1.6`, `alphaTest 0.45`, C); wind scored on the clock-running pair
   (a 20-px tuft moving 1–2 px between frames; `applyWind` L221 is in the code).
8. **Car glass r8** (`src/vehicle/mirrors.js`, `src/textures/vehicle.js`): score
   `173c55a` first on round-7 frames — pane skyline within ±3 px of the
   reflected ridge from the seat, straw ≥ 10 % below it (builder 16 %), see ≥
   0.85 and `paneFullPct` reported; the plate on exterior cameras: its sky
   within 0.3 st of the world's (−1.9 st now), no crown disc without a trunk
   (B's (423–438, 84–89)); sill dust (`settle` floor 0.25 → 0.12, B); tool items
   5 and 6.
9. **Fleet**: `clearcoatRoughness 0.08 → 0.22`, chrome roughness floor 0.12
   at night — `safari-jeep_0_night.png` (228–264, 134–158) no blob over 0.5
   larger than the lamp head (479 px), `motorcycle_0_night` ≤ 120 px per disc
   (349 / 164), `supply-truck_0_night` no speck over sRGB 0.85 (48 px);
   `rowLamps` third pole facing jeep_2 (body ≥ 0.5 of its sky; 0.44); pickup
   headlamp core not scaled by the night gain (C, 298 px over 0.85, unchanged
   two rounds).
10. **Master / tools**: the deterministic-pose assert written to `stats.json`
    (item 1); `SOURCE` with source and bundle hashes and time for every set,
    builders' included (item 2); the `moon` view night-only or renamed (3);
    the clock-running pair (4) and A's 0.1 s sub-strip; `glass` rows with
    `veil`/`bgLuma` and an absolute `mirror` flick (5, 6); the rim method and
    the studio pose (7); pixel-identity holds as the paw claim (8); part boxes
    from the shot tool (9); `stats.json` for `camp_*`, `fleet/`, `lions_*` (11);
    the walk-line tuft (7 above).
