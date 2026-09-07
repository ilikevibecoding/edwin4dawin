# Round 5 — consensus of three blind critics

Incumbent: round 4, build `80cb5e6` (`shots/round4/`, walk strip
`lions_walk_fixed/`). Candidate: round 5, `shots/round5/` — `camp_*`, `fleet/`,
`lions_*`, `ultra_camp/`, `ultra_lions/` from `0dc79bb`; `truck_*`, `glass/`,
`ultra_day/`, `ultra_night/` from `84c1e5e`. Critics A, B and C
(`critic_{A,B,C}.md`) worked blind of one another and of the builders' reports,
read code only via `git show 0dc79bb:` / `16028cf:` / `84c1e5e:`, and measured
what they scored. Boxes are `(x0, y0, x1, y1)` at the frame's own resolution:
`truck_*`, `glass/` 640×360; `camp_*`, `lions_*` 512×288; `fleet/` 480×270;
`ultra_*` 1280×720. Stops are log2 of linear-luma ratios.

**The truck frames were shot twice.** The first `truck_*`, `glass/`,
`ultra_*` sets (`16028cf`) had the body pitched 5.7° nose-down at the shot — a
capture pre-roll artefact (the pinned pre-roll speed read as a brake held to
the floor; fixed in `84c1e5e`, "cruise": pitch 0.2°, round 4's was 0.31°). Those
frames are archived in `shots/round5_pitched/` and are not scored. The six sets
were re-shot from `84c1e5e` and all three critics re-judged Hero car and Car
glass on them and re-measured every attitude-dependent Lighting number; their
"Re-judge" notes head the changed families. Findings that were the pitch —
the nose-down glint, the dusk lamp hot spot and grille over the sky, the beam
pool slab, the `mirror` shot without its pane, the interior camera fallen
forward, "6–8 % larger", the dusk `front` sand pool — are withdrawn by the
critics who made them and are not carried here. Two things about the re-shot
frames that are still capture, not car: the truck stands within 0.35 m of the
round-4 spot but heads ~20° differently, so the truck-local cameras (`hero`,
`front`, `wheel`, the glass views) sit further round the nose and their sky is
a different sky (B: bar slope 10° → 20° in `truck_night/hero.png`; the
comparisons below are of like regions, not pixels); and `ultra_day/` timed
out under load and was re-shot last (00:21–00:41), after A and C had written —
their `ultra_day` lines (lugs, door streaks, lens) cite the pitched set and
are checked here on the re-shot frames where they carry weight.

Scratch and probe scripts under `/tmp/consensus/`; nothing under `src/` or
`tools/` was touched. Two live probes were run on clean worktrees of `84c1e5e`
(`vite preview`, port 5295, `?quality=fast&capture=1`): the walk strip's
contact decals (§4) and the glass tool's `moving.flick` with the panes hidden
(§14). Both worktrees and servers are gone.

## Verdict: **pass** on all ten families

The candidate beats the incumbent on the round's three categories where they
can be shown and no previously approved category of any family drops by more
than one point. Consensus (median of the three) on the gate categories,
R4 → R5:

| Family | Lighting | Shadows | Reflections |
|---|---|---|---|
| Hero car | 7 → 7 | 7 → 7 | 5 → 6 |
| Car glass | 6 → 6 | 6 → 6 (B only) | 5 → 7 |
| Campground | 7 → 7 | 6 → 6 | — |
| Fleet | 6 → 7 | 7 → 7 | 4.5 → 4.5 |
| Road & terrain | 6.5 → 7 | 6 → 6 | 5 → 6 |
| Vegetation | 6 → 7 | 6 → 6.5 | — |
| Lions | 6 → 7 | 5 → 6 | 5 → 5 |
| Lion feet & gait | 6 → 6 (B only) | 6 → 7 (B only; see §4 — held at 6) | — |
| Lighting & atmosphere | 6 → 7 | 6 → 7 | 4.5 → 6 |
| Performance | — | — | — |

Lighting up in five families (Fleet, Road & terrain, Vegetation, Lions,
Lighting & atmosphere), flat by the median in Hero car (A 7 → 8, B 6 → 7,
C 7 → 7), Campground (A 7 → 8, B 6 → 7, C 7 → 7), Car glass and Lion feet; no
critic is down on Lighting anywhere. Shadows up in Lions (the multiplying
decal) and Lighting, half a point in Vegetation (tuft self-shadow), flat
elsewhere — no penumbra moved anywhere (camp fly edge 12 px in both rounds,
all three). Reflections up in Hero car (the door mirror, B and C; A adds the
paint's sky), Car glass (5 → 7: the pane in `glass/mirror.png` and from the
seat), Road & terrain (the water hole reflects the dome and the kopje) and
Lighting; flat in Fleet and Lions. Nothing down. C's sums over the eight
families that carry them: Lighting 42.5 → 45.5, Shadows 32 → 32, Reflections
27 → 31.

**Drops, all of exactly one point** (verified from the tables):

| Family / category | Critic | Frame | Cause |
|---|---|---|---|
| Car glass — Temporal stability 6 → 5 | A, B (median 6 → 5) | `glass/metrics.json` `moving.flick` 0.099 → 0.156 | the tool's number; the probe (§14) puts the world alone, panes hidden, at 0.175 over the same pixels — the pane transmits the world's motion and adds none of its own. Held at 6 for the gate; C's "not a point" is right |
| Fleet — Visual cleanliness 6 → 5 | C | `fleet/safari-jeep_0_night.png` (214,115,252,153) | lantern glare disc on the bonnet, 123 px over 0.85, brighter than the lantern head that feeds it |
| Campground — Color / atmosphere 7 → 6 | A | `camp_night/camp_fire_night.png` (275,158,287,178) | "the flame is cream, sat 0.24" — not reproduced (§8); the pool, not the flame, is the regression |
| Vegetation — Color / atmosphere 6 → 5 | C | `lions_day/lion_pride.png` rows 192–288 | pride turf −1.4 st under the soil (§2 — C is right) |
| Lion feet & gait — Composition 6 → 5 | B | `lions_walk/walk_02..06.png` x 230–260, 290–310 | turf clumps between the camera and the paws in five of eight frames |

The drops the critics gave the pitched truck frames — Hero Composition (C),
Car glass Composition, Reflections and Temporal (A, C), Hero Cleanliness held
at 6 (B) — are withdrawn in their re-judges and are not in the tables.

Mean of the consensus medians over the categories scored in both rounds:
Hero car 6.66 → 6.91 (n 16), Car glass 6.53 → 6.67 (15; 6.73 with Temporal
held), Fleet 6.13 → 6.27 (15), Campground 6.57 → 6.64 (14), Road & terrain
6.37 → 6.47 (15), Vegetation 6.00 → 6.19 (13), Lions 5.36 → 5.93 (14), Lion
feet & gait 5.73 → 5.81 (13), Lighting & atmosphere 6.00 → 6.75 (10),
Performance 6 → 6 (1); all 126 cells 6.17 → 6.40. Family means per critic are
in §Weakest object.

The pass is C's "narrow" one. C's four acceptance tests for the next round all
stand after investigation (the fire pool, the turf, the night sky's balance
against the ground — reworded in §5 — and the mirror reflecting the scene
behind the truck rather than a plate, §15). B's "the hills are under the sky
at last, and they are a plate" is confirmed by measurement (§3) and is terrain
r6's brief. The round's one reflective object, the door mirror, went from a
black quadrant to a pane with sky, horizon, plain and flank in it, and it is
a painted plate at fast (§15): that is the car's brief for round 7.

## Score matrix

Cells are `R4→R5` per critic; consensus is the median of the critics who
scored the cell. `—` is not scored. Flags: **≥ 3** when the R5 scores spread by
three or more points; **dir** when critics disagree on direction (one up, one
down); **drop** when a critic drops and the others hold. Six cells are flagged
in ten families; each is investigated below. Cells where the critics are two
points apart with no direction split are marked (2) and settled where a
builder claim sits behind them (§13, §16).

### Hero car

Re-judged by all three on the re-shot frames. Frames: `truck_{day,dusk,night}/{hero,front,rear,wheel,detail,interior,forest,road,mainroad}.png`, `ultra_night/{hero,road}.png`, `ultra_day/{hero,interior}.png` (B re-shot; A, C pitched — see §17), `glass/ws_mid.png`, `glass/mirror.png`.

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 2 | Silhouette | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 3 | Geometry | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 4 | Scale | 7→7 | 8→8 | 7→7 | 7 → 7 | |
| 5 | Materials | 7→8 | 7→7 | 6→6 | 7 → 7 | (2) §13 |
| 6 | Texture quality | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 7 | Glass / transparency | 7→7 | 6→7 | 6→7 | 6 → 7 | |
| 8 | Lighting | 7→8 | 6→7 | 7→7 | 7 → 7 | |
| 9 | Shadows | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 10 | Reflections | 6→7 | 5→6 | 5→6 | 5 → 6 | |
| 11 | Color / atmosphere | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 13 | Physics / ground contact | 8→8 | 8→8 | 8→8 | 8 → 8 | |
| 14 | Detail density | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 15 | Environmental integration | 7→7 | 7→7 | 6→7 | 7 → 7 | |
| 16 | Visual cleanliness | 7→8 | 5→7 | 5→6 | 5 → 7 | (2) §16 |
| 18 | Browser performance | 5→5 | 6→6 | — (family 10) | 5.5 → 5.5 | |

Family mean per critic (categories scored both rounds): A 6.88 → 7.13, B 6.69 → 7.00, C 6.47 → 6.73; medians 6.66 → 6.91. No cell is three apart and no critic is down on anything; the two-point spreads are the clearcoat claim (A credits it, B and C cannot see it — §13) and the night bar (B: bloom gone; C: pods still touching at his threshold — §16).

**Regressions:** none by category (A, B, C). Claimed and checked: B's
headlamp glare balls "larger than R4" in `truck_night/front.png` — R4's size
within 6 % (§17), kept as a weakness, not a regression; C's 598 px over 0.5 in
the hero bar box — the same 218 px at sRGB 0.5 (§16); `rear` +30 calls at
every hour (A, B — Performance, noted, no point). **Must not regress** (the
three lists): nine separate pods with no disc in the night sky — `truck_night/
hero.png` bar box (220,55,335,105) ≤ 300 px over linear 0.5 (now 218), nine
peaks in `hero` and `front`, troughs ≤ 0.52 at 640, no sky blob over 100 px
outside the bar groups; the dusk front under the sky — `truck_dusk/front.png`
grille p95 ≤ sky p95 (now 0.076–0.235 vs 0.463–0.470), 0 px over 0.7 in the
frame (R4 304), no lamp blob over 0.85 in `truck_dusk/detail.png`; the soft
beam pool (no ground blob ≥ 20 px over sRGB 0.5 in `truck_night/hero.png` or
`front.png`); the night body a dark shape under the sky (door (320,155,400,195)
−0.36 st); the level body at the shot (pitch ≤ 0.5°) and tyre contact in
`wheel.png` at every hour; nothing over 0.9 in any truck frame; the door
mirror's pane in `glass/mirror.png` and its face from the seat in
`truck_day/interior.png`; see ≥ 0.87 on the four exterior day panes; ≤ 490
calls on the fast hero (488). A's "bonnet and door-skin gradients" are the
heading (§13) and are not carried.

### Car glass

Re-judged by all three. Frames: `glass/{ws_close,ws_mid,side_sun,side_shade,interior,int_side,rear_dust,mirror,dusk_ws,night_int,night_ext,moving}.png`, `glass/metrics.json`, `truck_day/interior.png`, `lions_day/lion_seat.png`.

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 2 | Silhouette | — | 7→7 | — | 7 → 7 | |
| 3 | Geometry | — | 7→7 | — | 7 → 7 | |
| 4 | Scale | — | 8→8 | — | 8 → 8 | |
| 5 | Materials | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 6 | Texture quality | 6→6 | 6→6 | 5→6 | 6 → 6 | |
| 7 | Glass / transparency | 7→8 | 6→7 | 6→7 | 6 → 7 | |
| 8 | Lighting | 7→7 | 6→6 | 6→6 | 6 → 6 | |
| 9 | Shadows | — | 6→6 | — | 6 → 6 | |
| 10 | Reflections | 5→6 | 5→7 | 6→7 | 5 → 7 | |
| 11 | Color / atmosphere | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 14 | Detail density | — | 6→6 | — | 6 → 6 | |
| 15 | Environmental integration | — | 7→7 | — | 7 → 7 | |
| 16 | Visual cleanliness | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 17 | Temporal stability | 6→5 | 6→5 | 6→6 | 6 → 5 | **drop** A, B — held at 6 (§14) |

Family mean per critic: A 6.56 → 6.67, B 6.53 → 6.67, C 6.00 → 6.33; medians 6.53 → 6.67. Reflections is the round's largest consensus move after Lions Lighting: the pane holds sky, a hard horizon, plain and the truck's flank where R4's had the flank as a black quadrant (`glass/mirror.png` pane (378,30,495,230); tool `mirror` see 0.331 → 0.890, veil 0.215 → 0.079, cover 19 → 65 %). A stops at 6 because the pane is a plate at fast and the windscreen returns no sky from the front quarter (§15, §17).

**Regressions:** Temporal stability 6 → 5 (A, B; `glass/metrics.json`
`moving.flick` 0.099 → 0.156) — the world through a clearer pane, 0.89 of the
background's own flick, held at 6 for the gate (§14); C: none. The
Composition 7 → 6 and Reflections 6 → 5 / 5 → 5 A and C gave the pitched
frames are withdrawn. **Must not regress** (the three lists): the pane in
`glass/mirror.png` with a horizon in it, its bezel and split bar, cover ≥ 60 %
(now 65 %) and see ≥ 0.85 (0.890); the seat's view of the mirror with the
flank in it in `glass/interior.png` and `truck_day/interior.png`; hot 0 and
clip 0 on every pane; see ≥ 0.87 on the four exterior day views (`ws_close`
0.925, `ws_mid` 0.874, `side_sun` 0.957, `side_shade` 0.919); `interior` see
≥ 0.79 with veil ≤ 0.065 (0.799 / 0.062) — the reading through the screen
from the seat; `night_int` see ≥ 0.92 (0.927), `night_ext` ≥ 0.96 (0.962) with
flick ≤ 0.002 (0.0014); `dusk_ws` see ≥ 0.84 (0.845); static-view flick
≤ 0.03 (`int_side` 0.030 is the ceiling); `rear_dust` unobstructed; the
door-glass edge tint.

### Campground

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 2 | Silhouette | — | 7→7 | — | 7 → 7 | |
| 3 | Geometry | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 4 | Scale | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 5 | Materials | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 6 | Texture quality | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 8 | Lighting | 7→8 | 6→7 | 7→7 | 7 → 7 | |
| 9 | Shadows | 6→6 | 6→7 | 6→6 | 6 → 6 | |
| 11 | Color / atmosphere | 7→6 | 6→7 | 6→7 | 6 → 7 | **dir** (§8) |
| 12 | Animation | — | 6→6 | — | 6 → 6 | |
| 13 | Physics / ground contact | — | 7→7 | — | 7 → 7 | |
| 14 | Detail density | 7→7 | 7→7 | 6→6 | 7 → 7 | |
| 15 | Environmental integration | 7→7 | 7→7 | 5→5 | 7 → 7 | |
| 16 | Visual cleanliness | 6→6 | 7→7 | 6→6 | 6 → 6 | |

### Fleet (as shot from `0dc79bb`, before fleet r4 `8611235`)

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 6→7 | 6→6 | 6→6 | 6 → 6 | |
| 2 | Silhouette | 6→6 | 7→7 | 6→6 | 6 → 6 | |
| 3 | Geometry | 6→6 | 7→7 | 6→6 | 6 → 6 | |
| 4 | Scale | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 5 | Materials | 7→7 | 6→6 | 6→6 | 6 → 6 | |
| 6 | Texture quality | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 7 | Glass / transparency | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 8 | Lighting | 6→7 | 6→7 | 5.5→6.5 (day 6→6, night 5→7) | 6 → 7 | |
| 9 | Shadows | 7→7 | 7→7 | 7→7 | 7 → 7 | |
| 10 | Reflections | — | 5→5 | 4→4 | 4.5 → 4.5 | |
| 11 | Color / atmosphere | 6→7 | 7→7 | 6→7 | 6 → 7 | |
| 13 | Physics / ground contact | 7→7 | 7→7 | — | 7 → 7 | |
| 14 | Detail density | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 15 | Environmental integration | — | 7→7 | 6→6 | 6.5 → 6.5 | |
| 16 | Visual cleanliness | 6→6 | 7→7 | 6→5 | 6 → 6 | **drop** C (§9) |

### Road & terrain

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 6→6 | 7→7 | — | 6.5 → 6.5 | |
| 2 | Silhouette | — | 7→7 | — | 7 → 7 | |
| 3 | Geometry | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 4 | Scale | — | 7→7 | — | 7 → 7 | |
| 5 | Materials | 7→7 | 7→7 | 6→7 | 7 → 7 | |
| 6 | Texture quality | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 8 | Lighting | 7→8 | 6→6 | — | 6.5 → 7 | |
| 9 | Shadows | 6→6 | 6→6 | — | 6 → 6 | |
| 10 | Reflections | 5→6 | 5→7 | 3→4 | 5 → 6 | **≥ 3** (R5 4/6/7; §7) |
| 11 | Color / atmosphere | 7→7 | 6→7 | 7→8 | 7 → 7 | |
| 13 | Physics / ground contact | — | 7→7 | — | 7 → 7 | |
| 14 | Detail density | 6→6 | 6→6 | — | 6 → 6 | |
| 15 | Environmental integration | — | 7→7 | 6→6 | 6.5 → 6.5 | |
| 16 | Visual cleanliness | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 18 | Browser performance | — | 6→6 | — | 6 → 6 | |

### Vegetation

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 6→6 | 6→6 | — | 6 → 6 | |
| 2 | Silhouette | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 3 | Geometry | 5→5 | 5→5 | — | 5 → 5 | |
| 4 | Scale | — | 7→7 | — | 7 → 7 | |
| 5 | Materials | 6→6 | 6→6 | 5→6 | 6 → 6 | |
| 6 | Texture quality | 6→6 | 6→6 | 5→5 | 6 → 6 | |
| 8 | Lighting | 6→7 | 6→7 | 5→6 | 6 → 7 | |
| 9 | Shadows | —→6 | 6→7 | — | 6 → 6.5 | |
| 11 | Color / atmosphere | 6→6 | 6→6 | 6→5 | 6 → 6 | **drop** C (§2) |
| 13 | Physics / ground contact | — | 6→6 | — | 6 → 6 | |
| 14 | Detail density | 6→7 | 5→7 | 7→7 | 6 → 7 | |
| 15 | Environmental integration | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 16 | Visual cleanliness | 6→6 | 6→6 | — | 6 → 6 | |

### Lions

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 2 | Silhouette | 5→6 | 5→6 | 5→5 | 5 → 6 | |
| 3 | Geometry | 5→6 | 5→6 | 5→5 | 5 → 6 | |
| 4 | Scale | 6→6 | 7→7 | 6→6 | 6 → 6 | |
| 5 | Materials | 5→6 | 5→6 | 5→5 | 5 → 6 | |
| 6 | Texture quality | 6→6 | 5→6 | 5→5 | 5 → 6 | |
| 8 | Lighting | 6→7 | 6→7 | 6→6 | 6 → 7 | |
| 9 | Shadows | 5→6 | 6→7 | 5→5 | 5 → 6 | |
| 10 | Reflections (eyes) | 6→6 | 5→5 | 5→5 | 5 → 5 | |
| 11 | Color / atmosphere | 6→6 | 6→6 | 6→6 | 6 → 6 | |
| 13 | Physics / ground contact | 5→6 | 7→7 | 5→5 | 5 → 6 | |
| 14 | Detail density | 5→5 | 6→6 | 5→5 | 5 → 5 | |
| 15 | Environmental integration | 5→6 | 6→7 | 5→6 | 5 → 6 | |
| 16 | Visual cleanliness | 6→6 | 6→6 | 5→6 | 6 → 6 | |

C scored the lion's body, fur and face unchanged between rounds ("all boxes
within 0.1 st") and so held Silhouette, Geometry, Materials at 5; A and B
measured the r6 landmarks (withers, sacrum, belly tuck in `lion_side.png`
(170,130,330,210); dusk rim +1.1 st at x = 360 of `lion_close_dusk.png`) and
gave +1. The frames carry lions r6 (`358f2be`); C's "unchanged" is not right
about the body, and the median follows A and B.

### Lion feet & gait (`lions_walk/` vs `lions_walk_fixed/`, 8 × 0.3 s, 512×288)

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | — | 6→5 | — | 6 → 5 | **drop** B |
| 2 | Silhouette | — | 5→5 | — | 5 → 5 | |
| 3 | Geometry | — | 5→5 | — | 5 → 5 | |
| 4 | Scale | — | 7→7 | — | 7 → 7 | |
| 8 | Lighting | — | 6→6 | — | 6 → 6 | |
| 9 | Shadows | — | 6→7 | — | 6 → 7 (held at 6, §4) | |
| 11 | Color / atmosphere | — | 6→6 | — | 6 → 6 | |
| 12 | Animation | 5→6 | 6→6 | 5→5 | 5 → 6 | |
| 13 | Physics / ground contact | 5→5 | 6→6 | 6→6 | 6 → 6 | |
| 14 | Detail density | — | 5→5 | — | 5 → 5 | |
| 15 | Environmental integration | — | 6→6 | — | 6 → 6 | |
| 16 | Visual cleanliness | 5→5 | 6→6 | — | 5.5 → 5.5 | |
| 17 | Temporal stability | 6→6 | 6→6 | 6→6 | 6 → 6 | |

### Lighting & atmosphere

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 1 | Composition | — | 6→7 | — | 6 → 7 | |
| 6 | Texture quality | — | 7→7 | — | 7 → 7 | |
| 8 | Lighting | 7→8 | 6→7 | 6→7 | 6 → 7 | |
| 9 | Shadows | 6→6 | 6→7 | 7→7 | 6 → 7 | |
| 10 | Reflections | —→6 | 5→6 | 4→5 | 4.5 → 6 | |
| 11 | Color / atmosphere | 6→6 | 6→7 | 7→7 | 6 → 7 | |
| 14 | Detail density | 6→6 | 7→7 | — | 6.5 → 6.5 | |
| 15 | Environmental integration | — | 6→7 | — | 6 → 7 | |
| 16 | Visual cleanliness | 7→8 | 5→6 | 6→7 | 6 → 7 | |
| 18 | Browser performance | — | 6→6 | — | 6 → 6 | |

### Performance (`stats.json` only)

| # | Category | A | B | C | median R4 → R5 | flag |
|---|---|---|---|---|---|---|
| 18 | Browser performance | 5→5 | 6→6 | 6→6 | 6 → 6 | |

Re-shot `stats.json` (`84c1e5e`, which carries fleet r4's one-program paint
merge): `truck_day/hero` calls 488 → 488, tris 2.169 → 2.183 M, programs
174 → 175, textures 295 → 293; `rear` 605 → 656 calls at every hour (+8 %,
the largest move; dusk 668 → 720, night 653 → 704 — the level truck's rear
camera takes in more verge); `road` 520 → 497, `mainroad` 620 → 611; runtime
totals 612/609/606 → 614/607/613, programs 175 → 176. The "+2 programs at
fast" claim was true of `16028cf` (176 hero, 177 runtime — the pitched set's
numbers, which C's line still quotes); the frames scored carry +1. Ultra
(re-shot): day hero 639 calls / 3.37 M tris / 178 programs, interior 778 /
4.62 M / 179; night hero 661 / 3.39 M / 179. No `stats.json` in `camp_*`,
`fleet/`, `lions_*`. fps is SwiftShader's and not scored.

## Investigated rather than averaged

Seventeen readings contradicted each other or the builders' evidence. Each was
measured on the frame; two needed a live probe (§4, §14).

### 1. The water hole's colour — the terrain builder is right, and so is B's number

The builder: blue-grey, hue 228° sat 0.08, in box (400–480, 148–160) of
`lions_day/lion_pride.png` *at 640×360*. The frame is 512×288; the box scales
to (320,118,384,128). Measured there: R4 Ymed 0.267, hue 357° sat 0.014
(neutral grey); **R5 Ymed 0.351, hue 228° sat 0.075, sRGB (151, 153, 163),
R − B −12** — the builder's number, to the degree. B's "clear pool"
(340,116,400,124): R4 hue 33° sat 0.12 → **R5 hue 17° sat 0.07, R − B +11** —
B's number, to the degree. Both boxes are right because the pool is two-toned,
row by row (cols 330–390, R5):

| rows | Y | hue | sat | R − B | what it mirrors |
|---|---|---|---|---|---|
| 115–118 (far shore) | 0.31–0.32 | 23–30° | 0.11–0.21 | +17 … +33 | the haze band over the ridge: sky rows 68–92 are hue 22–49°, sat 0.06–0.50, R − B +10 … +60 |
| 119 | 0.27 | 2° | 0.04 | +6 | the transition |
| 120–129 (near half) | 0.34–0.36 | 221–225° | 0.11–0.14 | −19 … −24 | the dome: sky rows 20–28 hue 210–219°, R − B −11 … −24 |

A pool mirrors the sky at the elevation its surface reflects: at the far shore
that is 2–5° up, the warm haze band; nearer the camera it is the blue dome.
R4's pool did neither (rows 113–119 hue 34° sat 0.16, rows 123–128 neutral at
sat 0.01–0.02). B's box straddles rows 116–123 and averages the two into
"neutral-warm"; B's reference sky (330,28,512,36) is 60 rows above the ridge,
which the far shore does not reflect. B's fix (tint the murk by `uSkyHor`,
Fresnel floor 0.25 → 0.35, halve the haze mixes in the reflection path) is
**not adopted**: the pool already matches the sky it reflects. A's "grey, not
blue-grey" (`lion_side.png` open water hue 10° sat 0.08) is the same effect
from a lower camera. Consensus: the builder's claim holds; Reflections 5 → 6.

### 2. The pride turf — pale straw (A, C); B on value; the vegetation builder's "green lawn" is not in the frame

`lions_day/lion_pride.png` lower third (rows 192–288):

| | R4 | R5 |
|---|---|---|
| khaki mask C (hue 35–70°, sat > 0.25, V 0.2–0.45) | 0.7 % | 12.1 % |
| turf pixels (hue 35–95°, sat > 0.25) | 20.3 %, Ymed 0.385, mean sRGB (186, 158, 103), hue 39° sat 0.46 | 34.2 %, Ymed 0.139, mean (129, 107, 60), hue 39° sat 0.61 |
| straw mask (g ≥ 0.8 r, g > 1.2 b, V > 0.45) | 18.8 % | 16.0 % |
| soil mask | 60.2 %, Ymed 0.159 | 43.1 %, Ymed 0.150 |
| turf (C mask) vs soil / vs standing straw | −1.02 st / −2.36 st | **−1.46 st / −2.77 st** |
| plain Ymed / p10 | 0.199 / 0.108 | 0.150 / **0.021** |
| open plain (150,250,300,285) Ymed (A) | 0.232 | 0.071 |
| in front of the lions (60,235,130,260) / (300,235,380,260) Ymed (A) | 0.195 / 0.222 | 0.189 / 0.219 |

The lawn has the standing straw's hue (39°) at half again its saturation and
1.5 st under it; its roots sit at Y 0.02–0.05 on soil at 0.15. It is not
green: `GI_LAWN = [GI_SHORT[1], GI_SHORT[3]]` (`src/forest.js` L3306) are the
two upright `G_SHORT` clumps and every `G_SHORT` entry is on atlas tile 1
(L3289–3294, `tiles: [1, 1, 1, 1]`), the "short khaki tuft" whose mid colour is
`SAV.khaki` (142, 124, 74) (`src/textures/nature.js` L1314). C's
"`[2,2,2,1]`/`[2,2,1,2]`, tile 2 green" are `G_GREEN`'s tiles, not the lawn's.
The darkness is two multipliers on that khaki: `grassMat` `tuftAO: 1.0`
(L2796; the shader takes the root to (0.43, 0.45, 0.32) of the tip, L1218–1220)
and `rootDark 0.8` (L978; the bottom third mixed toward the soil at 0.34 of its
luma, L1206–1207). A's cover point also holds: the two boxes in front of the
lions are unchanged (8–9 % khaki) because the `extra` count eases to 0.55
inside 2.5 m of the pride (L3624). **Decision: pale straw**, at the count and
size the builder reached (`sizeAt` L3667 stays: 0.85 × 0.85 × 0.8 = 0.58 at
the anchor). Knobs in the vegetation r6 brief. C's Color 6 → 5 is the fair
score; the median holds at 6 because A and B kept it flat while naming the same
fault.

### 3. The hills — in band on every frame, the `forest` view included; B's "plate" is real; A's 1.02 is sky against sky

Ridge rows, C's method (first top-down darkening step ≥ 10 % of the sky's Y;
hill = rows +2..+8, sky = rows −10..−3), median over kept columns, R4 → R5:

| frame | hill / sky | body (+12..+22) / crest (+2..+8) | kept |
|---|---|---|---|
| `truck_day/mainroad.png` cols 40–600 | 0.68 → **0.81** (p10 0.75, p90 0.88) | 0.96 → **1.11** | 542/560 |
| `mainroad` L 0–200 / mid / R | 0.98 / 0.68 / 0.99 → 0.86 / 0.81 / 0.83 | 0.69 / 0.98 / 1.02 → 1.06 / 1.12 / 1.07 | |
| `lions_day/lion_far.png` | 0.50 → **0.74** (0.69–0.79) | 1.03 → **1.11** | 373/512 |
| `lions_day/lion_pride.png` | 0.59 → 0.89 | 1.00 → 1.05 | 413/512 |
| `fleet/pickup_0_day.png` | 0.68 → 0.83 | 1.03 → 1.12 | 433/480 |
| `camp_day/camp_beyond.png` cols 40–500 | 0.90 → 0.87 | 1.08 → 1.08 | 414/460 |
| `truck_day/forest.png` cols 150–300, rows 100–130 | **0.68 → 0.78** (ridge row 106 → 122) | — | 134 / 94 of 150 |
| `ultra_day/forest.png` cols 300–800 (step ≥ 6 %) | — → **0.77** (ridge row 171) | | 414/500 |

Every ridge is inside 0.72–0.92 (`camp_beyond` at 0.87 here, 0.72–0.78 by A,
B and C — the sky window differs; in band on every method). The builder's four
numbers (0.80 / 0.71 / 0.75 / 0.72) hold within 0.05, as B and C found. The
`mainroad` camera is placed on the mainline and the `forest` camera is
world-placed: their backgrounds are the same in the pitched and the level
frames (the `mainroad` row reads 0.81 / 1.11 / row 66 on both), so the pitch
never touched these numbers; the `forest` ridge row moved 115 → 122 with the
re-shoot and the ratio by 0.01.

**A's `forest` range "at the sky, 1.02 in both rounds, 0.99 at 1280"** does not
hold. With the ridge taken at the first step ≥ 3 % (A used ≥ 0.012 linear for
these rows), the detector stops in the sky's own gradient (row 28–34 at
≥ 3 %, rows 78–82 at ≥ 1.2 %) and reports 1.03–1.08 — sky against sky, the same
defect A caught and corrected on `ultra_camp/camp_gate.png`. The real ridge is
a step of 0.47 → 0.35 linear (−25 %) at row 115–122 (R5; row 106 in R4, 0.46 →
0.34) and at rows 165–175 at 1280 (x = 500: sky 0.44–0.47, slab 0.35–0.39). The
range went from under the floor (0.68) to in band (0.78), and A's hillK-gate
fix (`terrain.js` L5754,
`max(hillK, smoothstep(300, 380, hillDist))`) is **not adopted**. What is
true in A's reading is the form: at 1280 the range is a blue-grey slab 8–13
rows deep with pale scrub dashes and no internal modelling.

**B's plate holds and is the finding.** In R4 the body was darker than the
crest (0.96–1.03: a lit crest over a shaded flank, with the crest over the
sky); in R5 the body is 5–13 % *paler* than the crest on every frame (1.05–1.12)
— the near flank fogs toward the plain's band, the crest toward 0.8 × the sky.
B's fix is the brief (terrain r6). C's "raise the far crests to 0.85–0.90"
is taste inside the band and is not a must.

### 4. The lion walk — planted feet hold to 0.1 px (probe); no decal reaches the strip because the camera is 9° off the ground

Background-subtracted foot track (median of the eight frames as background;
ground-row clusters, centre column and width), R5 `lions_walk/`:

| frame | ground-row clusters |
|---|---|
| 00 | 223 (26) · 296 (7) · 314 (9) · 359 (61) |
| 01 | 223 (27) · 334 (85) |
| 02 | 223 (27) · 295 (27) · 332 (33) |
| 03 | 240 · 275 · 291 · 299 |
| 04 | 225 (31) · 261 (16) · 296 (16) |
| 05 | 207 (55) · 254 (6) · 300 (39) |
| 06 | 196 (16) · 212 (8) · 296 (35) |
| 07 | 155 (29) · 198 (44) · 297 (32) |

Held columns: 223 across `walk_00–02` (0 px drift), 334/332 across `01–02`,
296/300/296/297 across `05–07` (a hind paw, 0.9 s). A's track (296/296/297
over `02–04`, 334/334 over `01–02`) and B's ((299–306) through `05–07`,
(221–228) through `00–02`) agree with it. **C's "hind paw drifts 8–12 px per
step while planted (384 → 376 → 364 → 334, frames 0–3)"** was read by eye
(±5 px) after C's automatic track failed; the columns C quotes are the rear of
the body in frames 0–2, where the ground-row clusters are at 359/334/332 and
the moving clusters at 383–395, 367–382, 355 are a swinging hind leg and the
tail. Live probe on `84c1e5e` (same `feet.js`), the strip camera planted as
`tools/lions.mjs` plants it, three frames 0.3 s apart: FL planted at screen
x 294.3 / 294.3 then swings (276.6, h 0.068 m); HR lands (h 0.010) then planted
at 330.7 / 330.7; HL planted at 375.3 then swings 357.1 → 294.0. Planted feet
move 0.0–0.1 px between frames. **No slide.** C's fix (pin the hind paw) is
declined; the pin is there.

**A's "+0.00 st under planted paws — the decal is not reaching the frame"**
is the right measurement and the wrong diagnosis. My track: −0.08 … +0.06 st
under every foot in both strips. The probe read the contact mesh at the strip
camera: `contact.mesh.visible` true, tier 0, in frustum, alpha **0.40 under
each planted paw** (`h` 0, `k` 1), 0.03–0.32 under swinging ones. The decal is
drawn. Its quad projects to **rows 178.6–182.9** — a 0.56 m disc seen from
1.3 m up at 8 m is 9.2° off the ground and 4 rows tall, half of it behind the
paw; rendered with the decal material forced to opaque black it is a 4–7 row
band along the ground line from the fore paw to the hind (`/tmp/consensus/
probe_black_00.png`). A's box (rows 182–188) is in front of it. Nothing in
`contact.js` is at fault; if the strip is to judge contact the strip camera
must be higher (tool, §Tool defects). B's Lion-feet **Shadows 6 → 7** cites the
decal "travelling with the feet" from family 7; the strip cannot show it, and
the family's Shadows is held at 6 → 6 for the gate (the family passes either
way).

Gait: body travel −105 px over the strip (R4 −83; A), even 13–19 px steps;
elbow and stifle flex in `walk_02`/`walk_05` (A) against B and C's "stifle
straight in swing" (`walk_03`, `walk_04`) — B and C's frames are the swing
frames and A's the stance; both are right, the swing wants flexion (lion form
r7). C's "no gait change landed" is right about the code (`feet.js`/`pose.js`
unchanged between the builds) and wrong about the travel.

### 5. The night sky — the intended trade, overshot by about half a stop; not a regression by the rubric

Sky and ground, linear Y medians, R4 → R5:

| frame, box | R4 | R5 | Δ |
|---|---|---|---|
| `truck_night/mainroad.png` sky rows 40–58 | 0.0103 | 0.0260 | **+1.34 st** (C: +1.36) |
| same, upper sky (100,0,540,30) | 0.0081 | 0.0187 | +1.21 st |
| same, ground (0,240,640,360) | 0.0110 | 0.0238 | +1.12 st (claim 0.011 → 0.023 holds; B 0.0238, C 0.0240) |
| `truck_night/hero.png` sky (300,0,640,10) — the level frame has crowns over R4's (330,0,640,40) box | 0.0075 | 0.0233 | +1.64 st (A: +1.6) |
| same, paint mask mean Y / paint over that sky | 0.0258 / **+1.78 st** | 0.0292 / **+0.33 st** | −1.45 st of separation against the upper sky; against C's whole-sky mask (rows 5–40, stars masked) +0.68 → +0.52 st; B's door panel −0.36 st under the sky p50 where R4's was +0.91 over a darker sky |
| `truck_night/rear.png`, `forest.png`, `wheel.png` sky rows 0–30 | 0.0073 / 0.0059 / 0.0040 | 0.0174 / 0.0146 / 0.0057 | +1.26 / +1.30 / +0.52 st (`road` (100,0,540,30) −0.32 st) |
| `camp_night/camp_arrive_night.png` sky (0,0,512,60) | 0.0099 | 0.0152 | +0.62 st |
| same, horizon band (0,105,512,115) / pad (150,200,400,285) | 0.0109 / 0.0069 | 0.0233 / 0.0146 | +1.1 / +1.08 st |
| pad ÷ band | **0.63** | **0.63** | — |

Sky hue 225–227° both rounds; sat 0.63–0.65 → 0.67–0.70. Stars survive
(C: 29 → 32 blobs, 0.13 → 0.33 % of the sky over 0.35; A 0.00–0.02 %); the
sky p95 is 0.034, nowhere near round 2's snow (19 % over 0.35).

The mechanism is deliberate and documented at the line: `src/sky.js`
`NIGHT_SKY.horizon: rad(NIGHT.skyHorizon, 1.0) → 2.4` with `haze`/`anti`
0.72 → 1.73 ("the band is the ceiling, so the band comes up with the ground
under it"), and `groundIndirect` 0.8 → 1.0 (day) / 0.1 → 1.4 (night). The
round-4 brief asked for two numbers at once — `mainroad` ground 0.02–0.03 and
the pad ≤ 0.7 of the horizon band — and together they force a band ≥ 0.03,
which is what R5 has. So C's acceptance test as written (sky rows 40–58
≤ 0.016 with the pad ≥ 0.02) contradicts the round-4 rule (pad/band would be
1.25). **Decision: the trade is intended and the ground target is met; the cost
is about 1.4 st of truck/sky separation against the upper sky in the night
hero (the paint is still +0.3–0.5 st over the sky, not under it — C is right
that the silhouette held; B's door panel reads −0.36 st because the level
camera's sky is the brighter horizon) and a sky at sat 0.67–0.69 that round 4
asked to bring down, not up (A).** The rebalance for lighting r7 keeps the R5
ground: band 2.4 → 1.8 (−0.4 st) with `groundIndirect` night 1.4 → 1.7
holding `mainroad` ground at 0.02, sky sat toward 0.5 (`HUE_NIGHT_DEEP`
`0x3d5c8c`, L1414, and `uSkyLow` night mul 0.2 → 0.16 per A); targets
`mainroad` sky rows 40–58 0.017–0.020, `camp_arrive_night` pad ≤ 0.7 of the
band and ≥ 0.013, `truck_night/hero.png` paint ≥ +0.8 st over the upper sky
(300,0,640,10). The pad/band test is only valid on the camp approach: on
`mainroad` the pad rows carry the headlamp pool (B: +3.3 st over the band), which
is why C read "the pad *at* the horizon" there. Lighting r6 (`cd33826`, after
the frames, not scored) records a rebalance on these lines — horizon band
2.4 → 2.0, `groundIndirect` 1.7, `mainroad` sky 0.024 → 0.019, ground 0.028,
paint over sky −0.37 → +0.10 st — so the r7 item is to verify those numbers
on round-6 frames against the targets here, not to re-derive them.

The other night colour finding stands on its own: the moonlit ground went
red. `truck_night/hero.png` (450,300,640,360) hue 353° sat 0.22 → **hue 3° sat
0.36**, sRGB (37, 24, 24) (A: hue 3° sat 0.36; the pitched frame read 4° /
0.37); `mainroad` (0,240,640,360) hue 288° → 320°; `ultra_night/hero.png`
(900,600,1280,720) hue 3° sat 0.37; under a sky of hue 224°. A and B name the
same cause — `groundIndirect 1.4` now really multiplies the terrain's bounce
(`terrain.js` L3318, albedo squared) and its day warm bias
`vec3(1.09, 1.0, 0.9)` (L3276) — and give compatible fixes; reconciled in
lighting r7.

### 6. The campfire — C is right about the pool; B's "holds" is a flame number

`camp_night/camp_fire_night.png`, R4 → R5:

| box | Ymed | hue / sat (box mean) | note |
|---|---|---|---|
| pool (230,185,320,210) C | 0.148 → **0.355 (+1.26 st)** | 20° / 0.749 → **31° / 0.334**, sRGB (181, 151, 120) | per-pixel sat median 0.758 → 0.372; pixels over Y 0.3: **6 → 62 %** |
| pool2 (235,200,275,215) C | 0.099 → 0.197 (+0.99 st) | 17° / 0.73 → 28° / 0.42 | |
| ground 3 m (230,200,330,220) B | 0.110 → 0.219 (+1.0 st) | sat 0.731 → 0.417 | B's "0.756 → 0.449 holds" is this box: right number, and it is a stop brighter |
| ground 8 m (200,240,320,288) B | 0.049 → 0.080 | sat 0.610 → 0.431 | |
| far corner (20,230,120,280) C | 0.011 → 0.019 | sat 0.419 → 0.286 | as asked (≤ 0.3) |
| flame core (275,158,287,178) A | 0.518 → 0.465 | 38° / 0.53 → 38° / **0.63** | A's "cream, sat 0.24" not reproduced (§8) |
| flame box (270,150,310,205) B | 0.153 → 0.356 | | pixels over 0.5: **161 → 529** (B) |

The round-4 brief asked for ground sat ≤ 0.55 within 3 m. The campground
builder took the point light to (1.0, 0.72, 0.45), distance 14, decay 1.6,
peak ×1.4 (`src/campground/fire.js` L388, L417), the glow disc to
`uTint (1.0, 0.68, 0.4)` and `uGlow` night 0.40 → 0.48 (L359, L412), and the
flames to premultiplied over-blending at `fade 0.72 + 0.24 n` (L98) with the
comment "the ring itself goes paler rather than brighter". It went paler
(0.75 → 0.33, past the 0.55 target) **and** a stop and a quarter brighter,
and 62 % of the pool is now over Y 0.3 — the tan slab C describes; the
firelit pad at that level is in the tone curve's shoulder and ACES takes the
rest of the colour. `campshots.mjs` stepped the camp 60 frames in round 4 too,
so the R4 frame was at its night level and the comparison is clean. The
`Color` median 6 → 7 stands on the far corners and the canopy top (C: canopy
(190,270,140) hue 21° sat 0.62 → 42° / 0.37); the pool is carried as a
regression inside the category with the reconciled fix in campground r5.

### 7. Road & terrain Reflections R5 4 / 6 / 7 (spread 3)

Same frames, different weights. B (7): the pool is under the sky and over the
mud (+0.30 → −0.19 st vs sky; +0.43 → +0.77 st vs the mud ring), the kopje
mirrored as a dark mass at (229–307, 117–126) — measured: Ymed 0.045, the
kopje above it 0.082. A (6): the same, and the wet annulus a pale line
(`lion_far` rim 0.169 vs plain 0.159), the mirrored boulders "featureless grey
eggs". C (4): the twenty analytic ellipsoids (`WATER_ROCKS`, `uRockInv`,
`terrain.js` ~L5140–5167, one flat `rockShade` per hit) read at 1280 as smooth
dark domes with clean rims under speckled granite (`ultra_lions/lion_face.png`
(150,160,250,230) medY 0.096, HSV (27°, 0.21) against the rock at 0.42). All
three are describing the frame; C prices the domes at the resolution where
they show. Median 6 stands. The domes are terrain r6's (A and C give the same
two routes).

### 8. Campground Color, A 7 → 6 against B and C 6 → 7 (direction)

A's drop is "the flame is pale cream: core sat 0.24, (0.74, 0.67, 0.57)" in
(275,158,287,178). In that box the R5 mean is sRGB (207, 160, 77), hue 38°,
sat 0.63 (R4 0.53); the flame is more saturated, not less, and visibly
yellow-orange in the frame. A's number is not reproduced at 512×288 and is
set aside. The thing that *is* pale is the pool under the flame (§6), which A
measured at sat 0.42 within 3 m and called "right". B and C's +1 is for the
far corners and the canopy top. The median 6 → 7 stands with the pool carried.

### 9. Fleet Visual cleanliness, C 6 → 5 against A and B flat

All three measure the same blob: `fleet/safari-jeep_0_night.png` lantern glare
in the bonnet paint, 461 px over 0.5 (A, B), 123 px over 0.85 (C), brighter
and larger than the lantern head that feeds it (7 px over 0.85). B: "they read
as lamps, not defects; held at 7". C: a highlight brighter than its source is
wrong. C is right that it is a defect (a `clearcoatRoughness 0.08` lobe under
an 18-intensity point light at 3 m); the drop is one point, inside the gate.
Three fixes at three different lamps are reconciled in campground r5 / fleet.

### 10. B's Lion feet Composition 6 → 5

Confirmed on the frames and in the probe render: tufts at x 230–260 and
290–310 stand between the strip camera and the paws in `walk_02`–`walk_06`.
The turf pass reaches the walk track; a trodden track is a fix for vegetation
r6 (B's `reserved(x, z, 1.2)` along the walk line) or for the tool (a higher
camera, which the contact question also wants).

### 11. "Dusk crowns −3.33 → −2.13 st" (vegetation builder)

A: crown median −4.51 → −3.32 st in (250,30,600,120); B: −5.09 → −3.54 st in
(290,45,470,90), rim +0.67 → +1.51 st; C: +1.6 st, still −3.3 st. Three boxes,
one answer: +1.2–1.6 st landed, the crown is still 0.8–1.0 st under the
≤ 2.5 st target, and the gain is a lit rim over a dark shell (B), not a lit
crown. The claim holds in direction and not in level. Fix in vegetation r6.

### 12. The `camp_mess` pockets

A: under the table −3.66 → −1.88 st, darkest 8×8 pocket −4.26 → −3.38 st at
(404,223). B: interior p5 −4.1 → −3.2 st, p2 −4.8 → −4.1. C: (300–340,
236–256) 3.51 → 2.91 st, p10 3.42 → 2.80. Three regions, all right: the open
floor and the near table are on target (≤ 2 st); the far bench and right floor
outside the 6 m `messLamp` day fill sit at 2.8–3.4 st. The builders' own "3.2,
not met" is the honest number. Fix reconciled in campground r5.

### 13. Hero car Materials 7 → 8 / 7 → 7 / 6 → 6 — "clearcoat over satin" is not shown at 640

The claim (`c8ccad2`): a clearcoat over a satin base that returns the horizon.
A credits it from `truck_day/hero.png`: bonnet row medians 0.331 → 0.081 down
the bonnet (x 170–250, rows 154 → 181) against R4's flat 0.34–0.375, and the
door skin graded 0.145 → 0.078. B and C read the same paint in `glass/ws_mid.png`
— a camera fixed in the truck's frame, so the only frame where the two rounds'
bonnets are the same surface at the same angle — and find R4's profile.
Measured there, bonnet rows 228–296 × cols 100–300, green paint pixels only:
Ymed 0.150 → 0.151, p10 0.089 → 0.090, p90 0.302 → 0.294, p99 0.402 → 0.395;
the leading-edge lobe row 229 → 232 at Y 0.37 → 0.43; high-frequency grain
(std of Y − 5×5 blur, over mean) 0.283 → 0.276 (B: 0.289 → 0.306 in (120,200,
280,240)). The door skin in the same frame (330,190,420,260): row medians
0.086 / 0.089 / 0.077 / 0.072 → 0.076 / 0.075 / 0.078 / 0.080 — flat both rounds.
`ws_close` bonnet 0.413 → 0.389 (C). A's hero gradient is real but is the
heading: the hero camera is truck-local and sits ~20° further round the nose
(B's caveat), so the R5 bonnet mirrors a different strip of sky and crown from
a different angle, and A's R4/R5 rows are not the same surface. Whole-frame
paint mask in the hero: p50 0.076 → 0.132, p95 0.188 → 0.227, paint over the
sky median 1.8 → 1.5 % (C: 4 → 3 %) — the paint got paler with the heading and
no more sky-like. **Decision: the claim is not shown at 640; Materials 7 → 7.**
What C then points at is the finding: a vertical panel at hood height mirrors
the `wall` colour because the paint's brightwork sky term only starts at
`line = 0.3` (17° up; `src/textures/vehicle.js` L373, L582 `smoothstep(uBwLine,
uBwLine + 0.25, bwUp)`; body keys `src/vehicle/materials.js` L170, L219) — the
comment says a scrub wall "a few degrees deep", the constant makes it
seventeen. B's `clearcoatRoughness 0.15 → 0.06` / `clearcoatNormalScale
0.3 → 0.15` (`makePaintMaterial`, L3868–3870) sharpens the lobe but does not
put a horizon in it. Reconciled in Hero car r7: C's line first, B's roughness
second.

### 14. Car glass Temporal 6 → 5 (A, B) against C's 6 → 6 — the flick is the world through a clearer pane (probe)

`glass/metrics.json` `moving.flick` 0.099 → 0.156 (+57 %); the pitched run gave
0.172. `flick` is the tool's mean |ΔY| over the glass region between the truck
at its pre-roll spot and six sim steps on (`tools/glassgauntlet.mjs` L210–219):
for the `moving` view it is the world going by behind the pane. A and C both
say most of the rise is the scene behind a thinner film (`see` 0.759 → 0.887,
`veil` 0.121 → 0.073) and still A drops a point; B names two new sub-pixel
inputs in the pane itself — `glassLayerMap` grit at 46× and `glassRoughness`
spots at 40× (`src/textures/vehicle.js` ~L1944, ~L1868) — swimming under
motion. The frame cannot separate the two, so the pair was re-rendered on a
worktree of `84c1e5e` at fast, 640×360, the tool's own camera, pre-roll and
mask (`/tmp/consensus/p2/probe_flick.mjs`; `hiddenCount` 44, `cover` 7.49 %
vs the tool's 7.51 %, the truck moves 1.319 m): **flick with the glass 0.1556
(the tool: 0.1561); the same pixels with every pane hidden, 0.1749.** The pane
passes 0.89 of the world's own change — which is the view's `see`, 0.887 —
and adds none: in every 30-row band of the pane the glass flicks less than
the background (rows 90–119 0.174 vs 0.182; 120–149 0.153 vs 0.156; 150–179
0.133 vs 0.161; 180–209 0.183 vs 0.211; 210–239 0.154 vs 0.155). R4's pane at
`see` 0.76 under a 0.12 veil transmitted less of the same motion, which is all
0.099 → 0.156 says. The static 2 mm-nudge views, where the world does not move,
are the pane's own number and stay under 0.03 in both rounds (`int_side` 0.024
→ 0.030, `side_shade` 0.013 → 0.019, `interior` 0.015 → 0.015; `night_ext`
0.0055 → 0.0014). **Decision: not a pane fault and not a regression; Temporal
held at 6 for the gate (C).** The tool is the defect: `flick` on the moving
view should be reported against the background's own flick (flick ÷ flickBg,
0.89 here; A's flick ÷ see is the cheaper proxy) — item 9 under tool defects.
B's grit/spots widening is not adopted on this evidence. The ultra 1-px
stipple A saw on the seat panes (pitched `ultra_day/interior.png`
(40,120,140,220)) is in the re-shot frame too, and it is the door glass, not
every pane: pixels whose 3×3 high-pass has the opposite sign to all four
neighbours (a checkerboard test) are 5.2 % of the door-glass sky
(0,90,110,150) and 2.9 % of the whole door pane (0,60,200,300), against
0.1–0.2 % on the windscreen sky (560,70,1000,170) and 0.5 % on the opaque dash
(500,340,760,440); the pitched frame's door pane read 5.5 %. It comes in
bands along the pane's edges and the mirror surround (2.7 %), the shape of a
dithered pass, and is pose-independent as A said. A separate SSR item, in the
Car glass hand-off as an A/B to run (`?ssrpane=off`), not a fix.

### 15. The door mirror — a legible pane, a painted plate (C); B's "not the window's sky" is elevation; A's "1.1 st under the trail" is the flank

`glass/mirror.png` R5, pane (378,30,495,230), horizon row 88 (the largest
downward step in x 395–415, 0.395 linear). Column band x 388–420, per row:
sky Y 0.363 / sat 0.20 at row 44 (a cloud smear), 0.278 / 0.33 at rows 56–60,
brightening and desaturating to 0.422 / 0.09 at row 84 just over the horizon;
plain 0.28 at row 108 falling to 0.19 at row 152; the flank 0.02–0.05 from
row 156. The sky seen directly through the door glass beside it, x 200–340:
0.330 / sat 0.15 at row 0, 0.457 / 0.05–0.08 at rows 40–52 (the scene's
skyline is row 52). With an 18° vertical field over 360 rows the window holds
2.6° of sky — the horizon haze band only — while the pane, convex
(`convexPane(0.136, 0.163, 0.32)`), folds 0–13° of elevation into 44 rows.
Where the two show the same elevation they agree: pane horizon row Y 0.40–0.42
sat 0.09 against the window's 0.42–0.46 sat 0.05–0.08. B's 2.7× saturation
and −0.31 st compare the pane's mid rows (the dome 5–13° up, sat 0.33) with
the window's haze band; C's −0.62 st (pane (385,50,425,72) 0.282 vs (200,20,
360,55) 0.433) is the same comparison. **B's fog-mix fix (`uMhSky` 1.15 → 1.0,
sky toward `uMhFog` over `mhUp` 0–0.25) is not adopted**: it would flatten a
gradient that is the dome's, the same reading as the water hole's (§1). The
plain: pane (385,105,430,150) Ymed 0.238 (B), (380,100,425,145) 0.239 (C)
against the trail beside the mirror (150,250,340,360) 0.275 — −0.21 st; C's
"real plain" (200,120,360,200) 0.210 puts it +0.18 st over. A's −1.11 st and
"plain 46 % at 0.127" come from a pane box that runs to row 230 and takes in
the flank's dark rows; the plain itself is within a quarter-stop of the ground
beside it at the horizon and 0.55 st under it by row 152, where the
`groundNear` ramp (`applyMirrorHorizon`, `src/textures/vehicle.js` L847
`smoothstep(−0.08, −0.7, mhUp)`, from 4.6° below the horizon) has started
darkening ground that is 6–9 m from the pane. A's ramp start −0.08 → −0.3 is a
half-stop taste fix and is kept as a minor knob. **What is wrong is C's
finding: the pane is a plate.** The scene behind the truck in the same frame
(200–360, 40–200) is a hill ridge at row 52 over straw tussocks; the pane's
horizon is a bare dune with a scrub band on the left and one acacia
silhouette the scene does not have, over a plain with no track and no tuft,
and the flank meets it along the pane's own curve. All three read it that way
(A: "a painted grade"; B: "the mirror shows a sky ... with a cloud"; C: "a
plate, not a mirror"). At fast `liveMirrorsWanted` is `high || ultra`
(`src/vehicle/mirrors.js` L68–69) and the pane is `materials.mirrorGlass`
(metal, roughness 0.02, PMREM) under `applyMirrorHorizon`. Reconciled in the
Car glass hand-off: A's gate (the live pane at fast for cameras inside the
cab) with C's pass spec and acceptance.

### 16. Hero car Cleanliness 7 → 8 / 5 → 7 / 5 → 6 — the bar meets its target at linear 0.5; C's 598 px is the same pixels at sRGB 0.5

`truck_night/hero.png` bar box (220,55,335,105) (A; B's (225,58,312,102) and
R4's (215,35,335,110) give the same count): **218 px over linear 0.5** (R4
1 435), 358 over 0.35 (R4 2 079). C's 598 px "in two blobs" is the same box at
0.5 in *sRGB* luma, which is linear 0.214 — where 598 px are indeed two blobs
(377 + 219 px), and where R4 had 3 442. The changelog's 417 and the 300 target
are linear numbers; the frame beats both (the bar is foreshortened at this
heading — A). Column-max profile along the bar: nine peaks at 0.72–0.74
(x 234, 242, 248, 256, 263, 272, 280, 288, 296) with troughs 0.21–0.52; R4 had
twenty local maxima at 0.71–0.73 over troughs of 0.70–0.72 — a slab. At 1280
(`ultra_night/hero.png` (455,125,610,200)) the same pods are one 1 984-px blob
over 0.5 with nine blobs of 35–51 px over 0.7 (peaks 0.73–0.74) and troughs of
0.59–0.63 between them: a lit strip with nine brighter spots — A's weakness,
B's "nine lobes on one glowing body", C's "one 3 882-px blob" (sRGB). The
discs are gone in every reading (R4's 428-px blob at (62,53,86,77) has no
counterpart; nothing over 0.35 above the bar outside the bar and lamps but an
11-px snorkel specular). Frame over 0.5: 2 484 → 1 061 px; over 0.7 382 → 112;
over 0.9 0 → 0. The two headlamp glare blobs, 488 and 309 px over 0.5 in the
hero, are what is left (§17). **Decision: Cleanliness 5 → 7 as the table has
it — B's +2 and C's +1 describe the same bar at two thresholds; the 300 target
is met at 640; the strip at 1280 is the open item.** Hero car r6 (`5dc56cd`, after the frames, not scored) claims the
pods "for real" — cores 0.12 under the bloom threshold, a radial lobe mask, a
`barReflector` key, hero box 681 → 118 px over 0.5, 8/8 gaps under 0.6 — so
the r7 item is to verify it at 1280 against the trough target below.

### 17. Headlamps — B's glare balls are R4's size; the lens returns no sky on the level frame either; the lamps light nothing the near cameras see

`truck_night/front.png` blobs over linear 0.5 at the lamps: R5 1 584 px
(332–379, 151–202) and 1 325 px (198–239, 187–237); **R4 1 495 px (332–378,
163–215) and 1 288 px (193–235, 157–197)** — +6 % and +3 %, with the bar-and-
lamps column span 131 px in both frames. Over 0.35: 2 353 / 1 979 vs R4
2 327 / 2 059. B's "+23 %, +33 %" used 1 288 / 1 000 for R4 — the second is a
clipped blob. **The balls are not larger than round 4's**; what B describes is
right and unchanged: filled ellipses flat at 0.5–0.73 across 31 × 21 px in the
hero with no lens structure inside them — `applyLampGlow(m.headlight, { core
2.5, bleach 0.6, coreExp 1.0 })` (`src/vehicle/materials.js` L897), a bleached
core with a linear profile. Kept as a weakness with B's fix, not as a
regression. The near field: `front` lower third (0,240,640,360) median 0.0159,
20 px over 0.2, 0 over 0.35 (R4 20 380 over 0.35 — the blown pool); `detail`
ground under the bumper p95 0.014 both rounds; the hero's warm-lit ground
(hue 10–50°, Y > 0.03) in (0,150,260,360) 10.6 → 17.4 % of the box with p95
0.153 → 0.079 and pixels over 0.15 2 744 → 1 314 — C's "broader and softer, a
pool not a slab" and B's "nothing the near cameras see" are the same frames:
the beams reach the trail 10–20 m out (`mainroad` pool (120,150,280,200) median
0.235, +3.3 st over the band) and put Y ≤ 0.08 on the dirt the `front` and
`detail` cameras frame. Hero car r6 narrowed the cone 26.4° → 22°, which will
not add near light. The lens: C's "returns no sky" was measured on the pitched
`ultra_day/hero.png`; on the re-shot frame the left lens (285,364,302,388)
Ymed 0.110 and the right (438,344,456,374) 0.129, hue 34–36°, against a sky of
0.291 — **−1.40 / −1.17 st** (pitched −2.2 / −1.5) — the domes mirror the
straw ahead, not the sky over them. The cause C names is in the code:
`m.lensClear` is `transparent, opacity 0.1` (L774–788) and, unlike the panes,
gets no premultiplied close, so the fluted dome's specular is blended at a
tenth. Fix in Hero car r7.

## Where the critics agree — top weaknesses per family, one fix each

| Family | Weakness (frames, boxes) | Reconciled fix (module, parameter, value) | Target |
|---|---|---|---|
| **Hero car** | Pods on a lit strip at 1280: `ultra_night/hero.png` (455,125,610,200) one 1 984-px blob over 0.5, nine 35–51 px blobs over 0.7, troughs 0.59–0.63 under peaks of 0.74; `truck_night/front.png` (225,65,355,115) troughs 0.44–0.59 (A, B, C — §16) | landed after the frames in hero car r6 `5dc56cd` (pod cores 0.12 under the bloom threshold, radial lobe mask, `barReflector` key) — verify; if short: `src/vehicle/index.js` L135 `BEAM.night.cover 0.5 → 0.3` and `applyLampGlow(m.barCover)` `core 3.0 → 2.0` (`src/vehicle/materials.js` L908) so the cover between two lobes is ≤ 0.1 of a lobe's peak (A); leave the night bloom (`src/post.js` L1212) alone | troughs ≤ 0.45 at 1280 with pod peaks ≥ 0.7; nine blobs over 0.5 in the hero bar box; ≤ 300 px over linear 0.5 |
| Hero car | Headlamp glare a filled ellipse with no lens in it: `truck_night/hero.png` 488 + 309 px over 0.5 at (196–227,172–193), (126–149,184–201), flat 0.5–0.73; `front` 1 584 + 1 325 px (R4 1 495 + 1 288 — the same size, §17) (B; A, C count them) | `applyLampGlow(m.headlight, …)` `src/vehicle/materials.js` L897: `core 2.5 → 1.6`, `coreExp 1.0 → 1.8`, `bleach 0.6 → 0.4` — a peaked centre and a falloff inside the housing (B); `lensClear`/`lensRibbed` cores stay | each `front` lamp blob ≤ 600 px over 0.5 with a peaked centre; nine pods untouched |
| Hero car | No horizon in the paint (§13): a vertical panel at hood height mirrors the `wall` colour — `truck_day/hero.png` green mask p95 0.227 under a sky p95 0.382, 1.5 % of paint over the sky median; `glass/ws_mid.png` bonnet R4's profile (B, C; A credits the hero gradient — the heading) | `src/vehicle/materials.js` body paint keys L170, L219 `line 0.3 → 0.08`, `band 0.5 → 0.65` (C: the sky starts 4.6° up, not 17°; roof key stays at 0.3); then `makePaintMaterial` `src/textures/vehicle.js` L3868 `clearcoatRoughness 0.15 → 0.06`, L3870 `clearcoatNormalScale 0.3 → 0.15` (B) | door (green mask rows 120–190 of `truck_day/hero.png`) a ≥ +1 st band over its base; `ws_mid` bonnet row medians ≥ +0.7 st at the skyline row; grain hf ≤ 0.30 |
| Hero car | Windscreen returns no sky from the front quarter: `truck_day/hero.png` (245,100,320,140) hue 53° sat 0.20 Ymed 0.117, 30 % blue-leaning pixels, under a sky of hue 208–216°; R4's screen read hue 194° at 80 % (a sky mirror under a 0.11 veil) (A) | `pane('glass')` `src/vehicle/materials.js` L638 `bw: { graze: 0 }` → `graze 0.10`, gated to cameras outside the cab by a per-frame uniform (camera position against the cab bounds) — `bwPaneOut` alone did not keep the seat clean when the builder tried 0.12 (L634–637: `interior` veil 0.048 → 0.075, see 0.81 → 0.78), which is why the screen has none | screen box hue ≥ 120° with blue-leaning px ≥ 60 %; `ws_mid` see ≥ 0.85, `ws_close` ≥ 0.90; `interior` veil ≤ 0.065 and see ≥ 0.79 unchanged |
| Hero car | Headlamp lens returns no sky: re-shot `ultra_day/hero.png` left lens (285,364,302,388) Ymed 0.110, right (438,344,456,374) 0.129, hue 34–36°, sky 0.291 — −1.4 / −1.2 st (C, re-checked §17) | `m.lensClear` and `m.barCover` (`src/vehicle/materials.js` L774, L797): `transparent, opacity 0.1` blends the specular at a tenth — give them the panes' premultiplied close (`gl_FragColor.a = max(diffuseColor.a, luminance(directSpecular + indirectSpecular))`) or `transmission 1, opacity 1, thickness 0.002` (C) | lens boxes within 1 st of the sky with a visible sky/ground split in the dome; night pods and lamp glow unchanged |
| Hero car | Lamps light nothing the near cameras see: `truck_night/front.png` lower third median 0.016, 0 px over 0.35; `detail.png` under-bumper p95 0.014 both rounds; hero warm-lit ground p95 0.079 (B; C: "faint but a pool") | `src/vehicle/index.js` ~L90–95: one near-field spill `SpotLight` per side beside the spot, half-angle 0.7 rad, distance 8, penumbra 0.6, aimed 20° down, 0.15 × `BEAM.night.beam`, 0 by day (B) — inside the light cap campground r5 records (7/9); do not move `VIEWS.front` (comparability) — add a `front_low` night view if the subject is wanted in frame | dirt 1–3 m ahead of the bumper Y 0.05–0.10 under the pods; `front` lower third median ≥ 0.03; `mainroad` pool unchanged |
| **Car glass** | The mirror is a plate (§15): `glass/mirror.png` pane (378,30,495,230) shows a dune horizon at row 88, one acacia, a bare plain; the scene behind (200–360, 40–200) is a hill ridge at row 52 over straw tussocks (C; A "painted grade", B) | `src/vehicle/mirrors.js` L68 `liveMirrorsWanted`: also true at fast for cameras inside the cab (`NEAR 5` gate, interior cameras only, dist < 1.5 m — A); the pass as C specifies: 160×120 `WebGLRenderTarget`, mirrored camera through the pane plane, `clipBias 0.003`, layers sky \| terrain \| vegetation swath \| body, every second frame, only while the seat or `mirror` camera is active; the painted plate stays for exterior cameras and `liveMirrors` off, with A's `applyMirrorHorizon` L847 `smoothstep(−0.08, −0.7, mhUp) → (−0.3, −0.9, …)` so its plain within 5 m is not pre-darkened | pane skyline row within ±3 px of the scene's reflected ridge; straw-hue fraction ≥ 10 % below the skyline; pane sky at its horizon row within 0.1 st and 0.05 sat of the window's horizon sky (0.42–0.46, sat 0.05–0.08); ≤ 100 calls added, from the seat only |
| Car glass | `moving.flick` 0.099 → 0.156 (§14: the world through a clearer pane, 0.89 of the background's own 0.175) (A, B; C not a point) | none in the pane. Tool: report `flick / flickBg` (or `flick / see`) on the moving view; A/B the ultra 1-px door-glass stipple (re-shot `ultra_day/interior.png` (0,90,110,150): 5.2 % checkerboard pixels vs 0.1 % on the windscreen, §14) with `?ssrpane=off` — if it goes, `blurTaps 4 → 8` on the pane SSR path or panes off `SSR_LAYER` at ultra | `flick / flickBg` ≤ 1.0 on `moving`; static views ≤ 0.03; checkerboard pixels ≤ 0.5 % on the door glass at 1280 (the dash's level) |
| Car glass | Wiper arcs and sill dust below the pixel: `ws_close.png` veil 0.046 an even film, no arc boundary at 640 (A, B; C sees arcs) | landed after the frames in hero car r6 (`5dc56cd`: one wiper sweep shared by film and roughness with a park smear) — verify; if short, `glassLayerMap` `src/textures/vehicle.js` ~L1970–2000 `grow 0.055 → 0.02`, ridge weight 0.5 → 1.0, `settle` floor 0.25 → 0.12 (B) | wiped/unwiped boundary ≥ 0.06 of veil across two texels in `ws_close`; `see` ≥ 0.90 there |
| Car glass | Cage bar across the pane's sky corner in the `mirror` view: `glass/mirror.png` (430–500, 45–90) (C) | tool: `tools/glassgauntlet.mjs` `mirror` — eye 40 mm lower, 4° outboard; keep `minCover 3`, add `bar ∩ pane = 0` (C) | pane cover ≥ 60 % with its top-right corner clear |
| **Campground** | Fire pool a tan slab: `camp_night/camp_fire_night.png` (230,185,320,210) Ymed 0.148 → 0.355, sat 0.75 → 0.33, 62 % over Y 0.3; flame body 161 → 529 px over 0.5 (C, B; A on the flame) | `src/campground/fire.js`: point light peak L417 `(8.4 + 28·night)` → `(6 + 20·night)` (undo the ×1.4; keep distance 14, decay 1.6); light colour L388 `(1.0, 0.72, 0.45)` → `(1.0, 0.62, 0.33)`; glow L359 `uTint (1.0, 0.68, 0.4)` → `(1.0, 0.58, 0.26)`, L412 `uGlow` night 0.48 → 0.30; flame L177 alpha floor `0.5 + 0.5·smoothstep` → `0.3 + 0.7·pow(smoothstep(0.05, 0.45, heat), 1.6)`, `uGain` night 0.85 → 0.7 (B) | pool Ymed 0.14–0.20, sat 0.50–0.60, hue 22–26°; 8 m sat ≤ 0.5; far corner sat ≤ 0.3 kept; flame box ≤ 250 px over 0.5 |
| Campground | Shade pockets 2.8–3.4 st: `camp_day/camp_mess.png` (404,223) 8×8 −3.38 st; interior p5 −3.2 st (A, B, C) | `src/campground/ground.js` ~L512 `campWear`: `envMapIntensity` 0.65 masked by a `uFly` ellipse (centre `plan.mess`, the fly's half-sizes) `× mix(1.0, 1.7, inFly)` (B) — the sky term the pockets lack, without lifting the pad; `src/campground/index.js` ~L253 `messLamp.day` `distance 6 → 9`, `decay 1.2 → 1.0` (A) so the far bench is inside it, `intensity 12 → 8` (B) so the open floor does not double | every pocket ≤ 2.5 st, interior p5 ≥ −2.5 st, open floor −1.5 to −2 st, pad Ymed within 3 % |
| Campground / Lighting | Penumbra a 12 px line with 1 px dither, both rounds: `camp_mess.png` cols 270–342 rows 236–265 (A, B, C) | `src/sky.js` ~L499 day `shadow.radius 1.2 → 2.5` (A, B: 2.5–3.0), ~L1795 `sun.shadow.blurSamples 12 → 24` (or `PCFSoftShadowMap`, C) | 10–90 % transition ≥ 25 px at 512 wide, no checker at 3× |
| **Fleet** | Lantern glare on the bonnet: `fleet/safari-jeep_0_night.png` (214,115,252,153) 461 px over 0.5, 123 over 0.85, peak 0.75; `jeep_2` 687 px (A, B, C) | `src/vehicles/materials.js` ~L528 fleet paint `clearcoatRoughness 0.08 → 0.20` (C; hero is 0.15); `src/campground/index.js` L207 `rowLamp` `intensity 26 → 16`, `distance 20 → 24` (A); `src/campground/lights.js` ~L94 `lampGlass.emissiveIntensity 5.0 → 2.4 × lvl` (B: the night bloom threshold is 2.0) | no blob over 0.5 on a body panel larger than the lantern head's own; row bodies hold (jeep_1 Y 0.087) |
| Fleet | Dark end of the row: `ranger_0_night.png` body 0.26 of the sky (A), `supply-truck_0_night` 0.27, `expedition-truck_0_night` 0.51 (B) | `src/campground/layout.js` `rowLamps` (~L102): a third pole between the two (B: u −2; A: at the ranger's end), same 20 m range | every row body ≥ 0.5 of the sky |
| Fleet | Chrome/alloy flat grey (all three) — the frames predate `8611235` | none: re-shoot `fleet/` on a build with fleet r4 and score it then | — |
| **Road & terrain** | Hills a plate: crest the darkest rows, body 5–13 % paler (`mainroad` body/crest 1.11, `lion_far` 1.11, `pickup` 1.12; R4 0.96–1.03) (B; form also A at 1280) | `src/terrain.js` `hazeChunk` (~L5515–5720): for the hill mesh (`hillK > 0.5`) `hillFar = 1` so `hillAir = hillSkyUp × hillTone` over the whole hill, keep the 400–620 m ramp for the flat, `hillFog` floor 0.90/0.94 → 0.82/0.90 (B); the 0.80 ceiling guard stays | body/crest ≤ 0.95 on `mainroad` and `lion_far` with every crest still 0.72–0.92 of the sky |
| Road & terrain | Kopje reflection as smooth dark domes: `ultra_lions/lion_face.png` (150,160,250,230), (312,164,383,227); `lion_pride.png` (270,115,290,125) (C, A) | `src/terrain.js` water sheet L5140–5167: ellipsoid scale 0.5 → 0.38 (inscribed radius), `rockShade` modulated by a granite fbm on the ellipsoid-local hit `nl` (±0.15, A) or the kopje `rockMat` albedo triplanar-sampled at the hit normal (C), rock test jittered by 3× the ripple normal so the rim breaks (C); a 256×128 planar reflection target if the trace cannot be made to read | dome interior std ≥ 0.4 × the boulder's above it; no clean elliptical rim at 1280 |
| Road & terrain | Wet annulus a pale line: `lion_far.png` rim (130,126,260,130) Y 0.169 vs plain 0.159; `lion_pride.png` rim sRGB (0.51, 0.40, 0.28) (A) | `src/terrain.js` L3036: alongside `roughnessFactor → 0.35` in the `zMud` band, darken albedo `× mix(1.0, 0.6, smoothstep(0.984, 0.996, zMud))` (A) | rim −0.4 to −0.7 st under the dry plain, glossier |
| **Vegetation** | Pride turf dark khaki (§2) | `src/forest.js`: two upright `plantClump`s in `G_SHORT` on tile 0 (`tiles [0, 0, 1, 0]`, `reach 0.62`, rosette and fan forms) and `GI_LAWN` (L3306) pointed at them (A, C); the lawn scatter on a `grassMat` clone with `tuftAO 1.0 → 0.5` (B 0.7, C 0.45; root ≈ 0.72 of the tip, −0.5 st), `rootDark 0.8` kept; `extra` L3624 inner ease `lerp(0.55, 1, …)` → `lerp(0.8, 1, …)` (A); `sizeAt` L3667 unchanged (0.58 at the anchor) | lawn pixels (hue 35–70°) Ymed 0.25–0.35, sat ≤ 0.45; straw mask ≥ 30 % of the lower third; the two boxes in front of the lions ≥ 20 % cover; count and −0.4 st plain median kept |
| Vegetation | Dusk crown a black shell with a lit rim: `truck_dusk/forest.png` crown median −3.3 to −3.5 st vs sky, 20 % of crown pixels under Y 0.01 (A, B, C) | `src/forest.js` L1453–1454 over-cap pass: `shell = mix(0.6, 1.0, 1 − smoothstep(0.25, 0.75, vShade)) × lowSun` so the buried cards pass part of the cap (A); if short, acacia `transLow 2.2` (L2742) × 1.6 (B) | crown median ≤ 2.5 st under the dusk sky, pixels < 0.01 ≤ 10 %, rim kept |
| Vegetation | Day crown split not from the sun: `truck_day/forest.png` halves (300,60,350,100)/(350,60,400,100) +0.78 → +0.62 st with the sun on the left (B); crowns discs on forks at 1280 (`ultra_day/mainroad.png` (400,85,560,165), A) | `sideK` (shader ~L1340–1367) applied to the direct `wrap` share and the transmission, or `sunSide 1.8 → 2.6` (B); `flat` acacia L1823 `thick [0.24, 0.32] → [0.34, 0.46]` with cards on two tiers (A) | split ≥ +1.0 st sunward; the fork reaches into the crown |
| **Lions** | The head: `ultra_lions/lion_face.png` (260,60,760,460) — loaf muzzle with a flat front, eyeballs proud of the lids (78 pale px round the left iris), flat brow plateau, leaf-disc ear, painted mouth (A, B; C: "smooth sculpt") | `src/wildlife/lion/headspec.js`: muzzle rows lofted on a superellipse (exponent 2.5) with a nasal-bridge ridge falling to the cheeks, a cheek-arch row between the zygomatic row (L50) and the muzzle root (L79) at 0.85 of the skull half-width, a nose-leather block and an upper-lip plane with a philtrum groove, a lower-lip row; ear as a cupped shell (two rows, 8 mm rim, dark inner face); `spec.js` L144 `EYE_LIDS up 0.46 → 0.55, down 0.62 → 0.68`, eye joint 4 mm deeper (A, B); +1 500 tris | no pale sclera px round the iris at 512; muzzle cross-section round at 1280 |
| Lions | Coat an isotropic mottle: `lion_close.png` flank (295,150,355,200) anisotropy 0.81 (A), zero directional (C) | `src/wildlife/lion/index.js` L142–161 coat material `anisotropy 0.6` along the body axis, `roughness 0.84 → 0.7`, `sheen 0.5` kept (A); `textures.js` L697–727 strands `48:8 → 32:6` at repeat 4 (A) or an 8:1 flow-field stretch rump → tail, shoulder → elbow (C); head atlas gets the streak fbm at 0.6 amplitude radiating from the nose (B) | flank \|dY/dy\| / \|dY/dx\| ≥ 1.3; dusk rim ≥ +0.7 st over the flank (C) with the +1.1 st at x = 360 kept |
| Lions | Dotted dusk rim: `lions_dusk/lion_close_dusk.png` (20,105,170,180), (200,240,320,285) — 1 px specks, 533 → 651 in the lion band (A) | `furRim()` L99–122 scaled by `(1 − vShell)` and power 6 → 4 (A); a 0.35 floor on the rim weight in front light with the sky's horizon colour as its light (B) | specks ≤ 533, rim 2–3 px wide, a rim readable by day |
| **Lion feet & gait** | Swing without flexion: `walk_03`, `walk_04` hind leg one line hip to paw (B, C) | `src/wildlife/lion/pose.js` ~L72–76 swing shaping: hind stifle/tarsal flexion 25° and carpal 15° peaking at mid-swing, 0 at contact (B, C) | stifle angle change ≥ 20° between `walk_03` and `walk_05` at the strip |
| Lion feet & gait | Turf across the paws in five of eight frames (B); contact unreadable at 9° grazing (§4) | vegetation r6: skip the `extra` lawn pass within 1.2 m of the walk line (`reserved(x, z, 1.2)`, B); tool: `tools/lions.mjs` walk camera `w([8.0, 1.3, 1.2]) → w([8.0, 2.2, 1.2])` (ground at 15°, the decal 7 rows) — a tool change, so both strips are re-shot on it | paws unoccluded in all eight; −0.5 st in a 6 px ring outside each planted paw measurable |
| Lion feet & gait | Toe re-plant flicker: column (259–263) in `00–01`, gone `01–02`, back `02–03` (B, both strips); toes pale cubes (C) | paw contact target lifted 6 mm, the decal carries the contact (B); `geometry.js` paw: five toe capsules with a dark pad decal, toe albedo −15 % (C) | no one-frame column gaps; toes read as toes at 512 |
| **Lighting & atmosphere** | Moonlit ground red under a cobalt sky: `truck_night/hero.png` (450,300,640,360) hue 3° sat 0.36; `ultra_night/hero.png` (900,600,1280,720) hue 3° sat 0.37; `mainroad` (0,240,640,360) hue 320° (A, B) | `src/terrain.js`: `uBounceFollow 0 → 1` (L3312–3316) so the albedo-squared bounce (L3318) follows the night irradiance, `uBounceWarm` gating the `vec3(1.09, 1.0, 0.9)` bias (L3276) to day (A); the night `groundIndirect` term × normalised `uSkyHor.rgb` (B) | ground sat ≤ 0.2, hue within 60° of the sky's (190–260°) on both boxes; `mainroad` ground held at 0.02–0.03 |
| Lighting & atmosphere | Night sky +1.2–1.6 st, truck over the upper sky +1.78 → +0.33 st (§5); lighting r6 `cd33826` (not in frames) records the rebalance | `src/sky.js` `NIGHT_SKY.horizon` 2.4 → 1.8–2.0 with `haze`/`anti` scaled (1.73 → 1.3), night `groundIndirect 1.4 → 1.7` to hold the ground; band sat toward 0.5 — verify r6's numbers on round-6 frames | `mainroad` sky rows 40–58 0.017–0.020; pad ≤ 0.7 of the band; paint ≥ +0.8 st over the upper sky (300,0,640,10) in the hero |
| Lighting & atmosphere | The moon is in no frame (A, B, C) | tool: a `moon` night view in `tools/shots.mjs` at the hero position, yawed to put the moon at (0.7 W, 0.25 H) (B) | the 0.5° disc, corona and star cap scorable |
| **Performance** | `rear` +30 calls at every hour (A, B); programs 176/181; ultra `interior` 780 calls / 4.6 M tris (B) | `src/roadside.js` kit drawn per material (A); the lawn `extra` pass folded into the lawn species' instanced mesh (B); beam sheet sharing the slice stack's program (B) | ≤ 490 calls on the fast hero, `rear` ≤ 610, programs ≤ 176 |

## Weakest object in the game

**The lion, for the third round** — Silhouette 6, Geometry 6, Materials 6 at
512 wide, the lowest cells on the board with Lion feet. All three name it; B
names the head: at 1280 (`ultra_lions/lion_face.png` (260,60,760,460)) a
rectangular muzzle block under a flat brow, a leaf-shaped disc for an ear, a
painted mouth; A: eyeballs proud of the lids, a smooth loft for a body, no
whiskers, no claws; C: bear proportions (head ≈ 0.42 of body length — C's
figure, unmeasured by A or B; lion form r7 to verify on `ultra_lions/
lion_close.png` before scaling), an isotropic mottle, cube toes. Lions r6 fixed
the body (Silhouette, Geometry, Materials 5 → 6; a dusk rim; a decal that
multiplies) and left the head. Second: the water hole's kopje reflection, three
smooth dark domes (C; A's "grey eggs"). Third (C): the tyre lugs, chamfered
and siped now but still separate blocks stuck on a pale carcass at every
resolution (`ultra_day/hero.png` (420,380,640,560), re-shot). The weakest
part of the car after the re-judge: for A the windscreen seen from outside, a
clear pane over the cab that returns none of the sky it faces (§17's
neighbour, hero weakness 4); for B the headlamp glare balls and a clearcoat
that cannot be told from R4's paint; for C the mirror that is a plate. All
three name the pods on a lit strip at 1280.

Family means, R4 → R5, over the categories each critic scored in both rounds
(Hero car and Car glass as re-judged; the pitched-frame means were A 7.06 /
6.33, B 6.94 / 6.67, C 6.73 / 5.89):

| Family | A | B | C |
|---|---|---|---|
| Hero car | 6.88 → 7.13 | 6.69 → 7.00 | 6.47 → 6.73 |
| Car glass | 6.56 → 6.67 | 6.53 → 6.67 | 6.00 → 6.33 |
| Campground | 6.64 → 6.64 | 6.57 → 6.79 | 6.00 → 6.09 |
| Fleet | 6.31 → 6.54 | 6.47 → 6.53 | 5.89 → 5.96 |
| Road & terrain | 6.20 → 6.40 | 6.33 → 6.53 | 5.57 → 6.00 |
| Vegetation | 5.90 → 6.10 | 5.92 → 6.23 | 5.71 → 5.86 |
| Lions | 5.50 → 6.00 | 5.79 → 6.29 | 5.29 → 5.43 |
| Lion feet & gait | 5.25 → 5.50 | 5.85 → 5.85 | 5.67 → 5.67 |
| Lighting & atmosphere | 6.40 → 6.80 | 6.00 → 6.70 | 6.00 → 6.60 |
| Performance | 5.00 → 5.00 | 6.00 → 6.00 | 6.00 → 6.00 |
| all scored | 6.24 → 6.47 (n 93) | 6.26 → 6.52 (n 126) | 5.88 → 6.09 (n 86) |

## Tool and process defects

1. **The pre-roll pitch** (all three, every first-pass truck frame): body 5.7°
   nose-down at the shot; A read it as "turned ~20°", B as "rolled on a
   hummock", C scored Hero Composition 7 → 6 on it, and all three scored a
   `mirror` frame with no mirror in it. Fixed in `84c1e5e`; the six sets were
   re-shot and Hero car and Car glass re-judged — every drop the pitched frames
   drew is withdrawn and both families end up over their first-pass means
   (A 7.06 → 7.13 / 6.33 → 6.67; B 6.94 → 7.00 / 6.67; C 6.73 / 5.89 → 6.33).
   The frames are kept in `shots/round5_pitched/` for the record. What a
   shot tool should have caught: the body pitch at the shot is a number
   (`vehicle.root` quaternion → pitch) — assert |pitch| ≤ 1° and |spot − R4
   spot| ≤ 0.5 m before writing a truck set.
2. **Sky against sky in the ridge detector** (A, self-caught on
   `ultra_camp/camp_gate.png` cols 850–1280, and — found here — the two
   `forest` rows, where A lowered the step to ≥ 0.012 and the detector stopped
   in the sky's own gradient at row 78–82; §3). Rule for round 6: ridge = the
   first top-down darkening step ≥ 6 % of the sky's Y (C's method at 10 %
   agrees with it), and drop any column whose "hill" hue and saturation are the
   sky's within 2° / 0.02.
3. **The walk strip cannot show contact** (§4): at 1.3 m over 8 m the ground is
   9° off and a 0.56 m decal is 4 rows, behind the paw. A measured +0.00 st
   correctly and blamed the decal; B scored the walker's Shadows from the
   lying lions. Tool fix above (camera 2.2 m). C's automatic column tracker
   failed on the turf and C read the columns by eye — the source of the
   "slide". The tool's `--probe` (planted slide at machine precision) and this
   probe agree; a strip reading that contradicts the probe should be checked
   against it before it is scored.
4. **The `mirror` view was off the pane on the pitched frames, and nothing in
   the tool said so** (A: "aimed under"; B: "the mirror head was not in the
   frame at all"; C: a housing back). On the level truck the same camera
   (`tools/glassgauntlet.mjs` L78, eye `[0.3, 1.6, −0.16]` → pane centre
   `[1.13, 1.657, 0.805]`, fov 18) frames the pane at 120 × 200 px with cover
   65 %, so the aim was never wrong — the cab had moved under it. The tool at
   HEAD now narrows the mask to `_mirrorGlass` and fails the run under 3 %
   cover (`minCover: 3`); that assert is the wanted one and stays. C's
   remaining ask (the cage bar across the pane's top-right corner, (430–500,
   45–90)): eye 40 mm lower, 4° outboard, and `bar ∩ pane = 0` beside the cover
   assert.
5. **The moon is out of every night frame** (A, B, C: 29 frames scanned). The
   disc, corona and star-cap claims are untestable until a `moon` view exists.
6. **Fleet frames predate fleet r4 (`8611235`)** (all three): chrome, alloy and
   the sidewall map are unscored. Also the first night fleet frames shot at the
   hour's lamp level (`b1c09e1`): the round-4 night fleet frames were at boot
   level, so the fleet night Lighting +1 is partly the tool catching up.
7. **A builder's box at the wrong resolution**: the water-hole claim was
   quoted at 640×360 for a family shot at 512×288. It scaled and held (§1),
   but a box should be given at the frame's own size.
8. **Boxes that straddle two things**: B's water box (rows 116–124) spans the
   warm and the blue reflection (§1); A's flame-core saturation (0.24) is not
   reproducible in the box given (§8). Where a colour claim rests on a box, the
   row profile should be shown.
9. `stats.json` missing for `camp_*`, `fleet/`, `lions_*`; per-view `views`
   empty in both rounds (C). Glass `flick` scales with transmission — report
   `flick / flickBg` (the probe's ratio, 0.89 on `moving`; A's `flick / see`
   is the cheaper proxy) so a clearer pane is not scored as a flickering one
   (§14).
10. **`ultra_day/` timed out under load and was re-shot last.** The re-shoot
   of the six truck sets ran `truck_*` and `glass/` first (21:32–22:51) and
   `ultra_night/` at 23:22–23:28; `ultra_day/` failed its capture timeout with
   three builders on the box and landed at 00:21–00:41 (`hero` 00:27,
   `interior` 00:41, `stats.json` 00:41). C wrote at 00:10 and A at 00:15
   against an empty directory and both say so — their `ultra_day` lines (lugs,
   door streaks, headlamp lens, the seat-pane stipple) cite the pitched set and
   are marked; B wrote at 00:45 with the new set in. The four readings that
   carry weight are re-checked on the re-shot frames here: the lens (§17,
   −1.4 / −1.2 st, the finding stands and is softer than the pitched −2.2 /
   −1.5); the lugs (chamfer and dashed sipes resolve at 640 in
   `truck_day/wheel.png` and at 1280 in `ultra_day/hero.png` (420,380,640,560)
   — A's and C's "not resolved" was the pitched wheel, and B's re-judge says
   the same); the stipple (§14, present on the door glass, 5.2 %); the ultra
   `interior` framing, which matches the level `glass/interior.png` (wheel,
   dash, screen, door mirror at left). C's door-streak line (pitched `hero` door (600–760, 330–430), one
   horizontal frequency) is a texture note that moved no score and was not
   re-measured. Rule for round 6: the capture writes `stats.json` last and the
   critics wait on every set's `stats.json` before writing; a set that is
   re-shot after a critic has written is re-judged, not footnoted.

## Must not regress (union of the three lists)

Hero car and Car glass (the lists in full under their matrices): nine
separate pods, ≤ 300 px over linear 0.5 in the hero bar box (218), no disc
in the night sky, troughs ≤ 0.52 at 640; dusk grille and bar under the dusk
sky with 0 px over 0.7 in `truck_dusk/front.png` and no lamp blob over 0.85
in `detail`; the soft beam pool (no ground blob ≥ 20 px over sRGB 0.5); the
night body under the sky; the level body (pitch ≤ 0.5°) and tyre contact at
every hour; nothing over 0.9 in a truck frame; the mirror pane in
`glass/mirror.png` (cover ≥ 60 %, see ≥ 0.85, bezel, split bar, horizon,
flank) and its face from the seat; see ≥ 0.87 on the four exterior day
panes, `interior` 0.79 / veil ≤ 0.065, `night_int` ≥ 0.92, `night_ext` ≥ 0.96
with flick ≤ 0.002, `dusk_ws` ≥ 0.84; hot 0 / clip 0 on every pane; static
flick ≤ 0.03; `rear_dust` unobstructed; door-glass edge tint; 488 calls on
the fast hero.

The other eight families: every ridge 0.72–0.92 of the sky over it on `mainroad`, `lion_far`,
`lion_pride`, `pickup_0_day`, `camp_beyond`, `forest` (and `ultra_camp/
camp_gate` at 0.80); hill sat ≤ 0.22; the pool under the sky and over the mud
ring, mirroring the haze band at the far shore and the dome nearer, the kopje
in it; the wet annulus; night `mainroad` ground 0.02–0.03 and the camp pad
≤ 0.7 of the horizon band; stars ≤ 0.5 % of the sky over 0.35 as points, no
disc in the night sky; night vehicles legible (darkest body ≥ 0.26 of the sky,
jeep_0/jeep_2/utility ≥ 0.8) with pools only under lit lamps, magenta 0 %,
the trailer framed; mess open floor ≤ 2 st with readable chairs, the fly
edge no harder than 12 px; fire far corners sat ≤ 0.3, canopy top not lit
from beneath, the fire's reach (warm-lit 36 % of the frame); both gate
lanterns; turf at full count under the pride with tuft self-shadow (colour
aside); dusk crown rim; night canopies dark, not missing; laterite hue
21–27° / sat 0.55–0.65; the lion's body landmarks, multiplying decal (−0.6 st
under the lying lions, no grey pool at dusk), amber eyes with catch-light,
dusk rim, no black crescents on the legs; planted feet holding their pixel
for 2–3 frames with ≤ 1 px jitter, the flexion in `walk_02`/`walk_05`; the
0.3 s strip as the judging frame; ≤ 490 calls on the fast hero, programs
≤ 177, 13 samplers on the terrain program.

## Hand-offs to round 6 builders

Each item carries the frame, the box and the number that accepts it; the
knob values are the reconciled ones from the table above.

- **Campground r5** (`src/campground/fire.js`, `ground.js`, `index.js`,
  `layout.js`, `lights.js`):
  - Fire pool: `camp_night/camp_fire_night.png` (230,185,320,210) Ymed
    0.355 → 0.14–0.20, sat 0.33 → 0.50–0.60, hue 22–26°, ≤ 30 % of the box
    over Y 0.3; flame box (270,150,310,205) ≤ 250 px over 0.5; far corner
    (20,230,120,280) sat ≤ 0.3 kept; 8 m (200,240,320,288) sat ≤ 0.5. Light
    peak back to `(6 + 20·night)`, colour (1.0, 0.62, 0.33), glow tint
    (1.0, 0.58, 0.26), `uGlow` night 0.30, flame alpha floor 0.3.
  - Shade pockets: `camp_day/camp_mess.png` every 8×8 pocket ≤ 2.5 st under
    the sunlit pad (now −3.38 at (404,223)), interior (150,150,400,240) p5
    ≥ −2.5 st (now −3.2), pad Ymed 0.30–0.35 unchanged within 3 %. `campWear`
    env × 1.7 inside a `uFly` ellipse; `messLamp.day` distance 9, decay 1.0,
    intensity 8.
  - Row lanterns: `rowLamp` 26 → 16 / 20 → 24 m; lamp glass emissive 5.0 →
    2.4 × lvl; a third pole toward the ranger/supply end. Accept on
    `fleet/safari-jeep_0_night.png`: no blob over 0.5 on the bonnet larger
    than the lantern head; every body in `fleet/*_night.png` ≥ 0.5 of the sky
    (ranger now 0.26, supply 0.27).
  - Shadow-map acne along the sign posts at 1280 (`ultra_camp/camp_gate.png`
    (330,300,760,480), A): with lighting's `shadow.radius`/bias.
- **Vegetation r6** (`src/forest.js`, `src/textures/nature.js`):
  - Turf to straw: `lions_day/lion_pride.png` rows 192–288 — lawn pixels
    (hue 35–70°) Ymed 0.25–0.35 and sat ≤ 0.45 (now 0.139 / 0.61), straw mask
    ≥ 30 % (now 16 %), soil mask ≤ 45 %, the boxes in front of the lions
    (60,235,130,260) and (300,235,380,260) ≥ 20 % cover (now 8–9 %), plain
    median within 0.1 st of 0.150, tuft count kept. `GI_LAWN` → two upright
    clumps on tile 0 (`[0, 0, 1, 0]`), lawn `tuftAO 0.5`, `extra` inner ease
    0.55 → 0.8, `sizeAt` unchanged.
  - Dusk crown: `truck_dusk/forest.png` crown median ≤ 2.5 st under the sky
    (A's box (250,30,600,120), now −3.32; B's (290,45,470,90), now −3.54),
    pixels < Y 0.01 ≤ 10 % (now 20 %), rim kept. `shell = mix(0.6, 1.0, …)`;
    `transLow` × 1.6 if short.
  - Day split: `truck_day/forest.png` halves (300,60,350,100) vs
    (350,60,400,100) ≥ +1.0 st sunward (now +0.62). `sideK` on the direct
    wrap and transmission, or `sunSide 2.6`.
  - Acacia discs: `flat` `thick [0.34, 0.46]`, two card tiers;
    `ultra_day/mainroad.png` (400,85,560,165).
  - Turf cards: `plantClump` lawn forms `planes 7`, `spread 0.5`, `ragged
    1.6`, `alphaTest 0.45` (C); the floating leaf card `truck_day/forest.png`
    (300,330,60,80) — card centres clamped to r ≤ 0.92 crownRadius (C).
  - Walk track: no `extra` tufts within 1.2 m of the walk line.
- **Terrain r6** (`src/terrain.js`):
  - Hill form: body (+12..+22) / crest (+2..+8) ≤ 0.95 on `truck_day/
    mainroad.png` cols 40–600 (now 1.11) and `lions_day/lion_far.png` (1.11),
    with every crest still 0.72–0.92 of the sky and `forest` at ≥ 0.75.
    `hillFar = 1` on the hill mesh, `hillFog` floor 0.82/0.90. No hillK-gate
    change (§3).
  - Kopje reflection: `ultra_lions/lion_face.png` (150,160,250,230) —
    reflected boulder std ≥ 0.4 × the boulder above it, no clean elliptical
    rim; inscribed radius 0.38, granite fbm / triplanar albedo, ripple jitter
    3×, or the 256×128 planar target.
  - Wet annulus: `lions_day/lion_far.png` rim (130,126,260,130) −0.4 to
    −0.7 st under the plain (now +0.09); albedo × 0.6 in the `zMud` band.
  - Night bounce (with lighting): `uBounceFollow 1`, `uBounceWarm` gated to
    day; accept on `truck_night/hero.png` (450,300,640,360) hue 190–260° or
    sat ≤ 0.2 (now 3° / 0.36; `ultra_night/hero.png` (900,600,1280,720)
    3° / 0.37).
  - Optional: a `uPride` 7–11 m ring mixing the soil albedo toward dust
    (0.62, 0.55, 0.48) × 1.15 (B); the pebble dots evenly spaced at 1280
    (`ultra_lions/lion_close.png` lower half, A); the culvert shoulder lip
    (C, Geometry 5 unchanged since round 3).
- **Lion form r7** (`src/wildlife/lion/headspec.js`, `spec.js`, `index.js`,
  `textures.js`, `geometry.js`, `pose.js`):
  - Head: `ultra_lions/lion_face.png` (260,60,760,460) — round muzzle
    cross-section, cheek-arch row, nose leather and upper lip, lower lip,
    cupped ear with dark inner face, `EYE_LIDS up 0.55 / down 0.68`, eye 4 mm
    deeper. Accept: no pale sclera pixels round the iris at 512
    (`lions_day/lion_face.png` (188,96,222,122), now 78), the ear reads as a
    cup at 1280.
  - Coat: `lion_close.png` flank (295,150,355,200) anisotropy ≥ 1.3 (now
    0.81); dusk rim ≥ +0.7 st over the flank; specks in the dusk lion band
    ≤ 533 (now 651). `anisotropy 0.6`, `roughness 0.7`, strands 32:6 at
    repeat 4, rim × (1 − vShell) at power 4, a 0.35 rim floor in front light.
  - Proportions (C alone): measure head/body on `ultra_lions/lion_close.png`
    first; if ≥ 0.35, head scale 0.72×, legs ×1.3 with the scapula bulge.
  - Toes: five capsules with a dark pad decal (`lion_close.png`
    (200,260,262,288) reads as toes at 512).
  - Gait: hind stifle/tarsal 25°, carpal 15° at mid-swing (`walk_03`,
    `walk_04` stifle change ≥ 20°); paw contact target +6 mm (no one-frame
    column gaps). The planted-foot pin and the contact decal are **not** to be
    touched: probe-verified (§4).
- **Lighting r7** (`src/sky.js`, `src/post.js`, `src/palette.js`, with
  terrain for the bounce):
  - Night balance: `truck_night/mainroad.png` sky rows 40–58 0.017–0.020
    (now 0.0260; C 0.0244), ground (0,240,640,360) held at 0.02–0.03 (0.0238);
    `camp_night/camp_arrive_night.png` pad (150,200,400,285) ≤ 0.7 of the band
    (0,105,512,115) (0.63) and ≥ 0.013; `truck_night/hero.png` paint ≥ +0.8 st
    over the upper sky (300,0,640,10) (now +0.33, §5); sky sat 0.45–0.55 (now
    0.67–0.70).
    `NIGHT_SKY.horizon` 1.8, `haze`/`anti` 1.3, night `groundIndirect` 1.7,
    `uSkyLow` night mul 0.16.
  - Night ground hue: as terrain r6, plus the palette's night shadow tint
    4° toward blue (B).
  - Penumbra: `shadow.radius 2.5`, `blurSamples 24`; `camp_day/camp_mess.png`
    cols 270–342 10–90 % ≥ 25 px, no checker; `ultra_day/hero.png` rows
    548–564 likewise (re-shot frame).
  - Dusk lamp levels and the beam pool: nothing to change. On the level
    frames the dusk front is under the sky — `truck_dusk/front.png` grille
    (235,190,360,232) p95 0.076 (A; C's rows 100–260 0.183 `hero` / 0.235
    `front`) against sky rows 0–50 p95 0.470, B −0.41 st in `hero`; frame
    over 0.7 304 → 0 px (`front`), 96 → 0 (`hero`); no lamp blob over 0.85 in
    `truck_dusk/detail.png` — and the night pool is a pool, not a slab
    (`front` (150–500, 290–360) median 0.524 → 0.021, `hero` warm-lit p95
    0.493 → 0.146, C). B's `BEAM.dusk` cuts, A's dusk `bloom.threshold
    0.86 → 1.0` and C's hour-scaled lamp core were the pitched lamp axis and
    are withdrawn by their authors; hold the numbers above as must-not-regress.
  - The `moon` view (tool) so the disc can be scored.
- **Hero car r7** (`src/vehicle/materials.js`, `src/vehicle/index.js`,
  `src/textures/vehicle.js`; hero car r6 `5dc56cd` landed after the frames
  and is unscored — verify its claims first, on frames from a build that
  carries it):
  - Pods on a lit strip at 1280: `ultra_night/hero.png` (455,125,610,200) —
    now one 1 984-px blob over 0.5 with nine 35–51 px blobs over 0.7, troughs
    0.59–0.63 under peaks of 0.74; `truck_night/front.png` (225,65,355,115)
    troughs 0.44–0.59. r6 claims cores 0.12 under the bloom threshold, a
    radial lobe mask, `barReflector`, hero box 681 → 118 px over 0.5 and 8/8
    gaps under 0.6 — measure that; if short, `BEAM.night.cover 0.5 → 0.3`
    (`src/vehicle/index.js` L135) and `applyLampGlow(m.barCover)` `core
    3.0 → 2.0` (`materials.js` L908). Accept: troughs ≤ 0.45 at 1280 with pod
    peaks ≥ 0.7; nine separate blobs over 0.5 in the hero bar box
    (220,55,335,105) with ≤ 300 px over linear 0.5 (now 218); nothing over
    0.9 in any truck frame; night bloom (`src/post.js` L1212) untouched.
  - Windscreen sky from the front quarter: `truck_day/hero.png` (245,100,
    320,140) hue 53° sat 0.20 Ymed 0.117, blue-leaning pixels 30 %, under a
    sky of hue 208–216° (R4's screen: hue 194° at 80 %). `pane('glass')`
    (`materials.js` L638) `bw: { graze: 0 }` → `graze 0.10`, gated to cameras
    outside the cab by a per-frame uniform (camera position against the cab
    bounds) — the builder's un-gated 0.12 cost the seat (`interior` veil
    0.048 → 0.075, see 0.81 → 0.78) and was pulled, which is why the screen
    has none. Accept: screen box hue ≥ 120° with blue-leaning px ≥ 60 %;
    `ws_mid` see ≥ 0.85 (0.874), `ws_close` ≥ 0.90 (0.925); `interior` veil
    ≤ 0.065 and see ≥ 0.79 unchanged (0.062 / 0.799).
  - Headlamp glare balls: `truck_night/front.png` 1 584 and 1 325 px over 0.5
    (R4 1 495 / 1 288 — not a regression, §17), `hero` 488 + 309 px at
    (196–227, 172–193) and (126–149, 184–201), flat 0.5–0.73 across 31 × 21
    with no lens inside. `applyLampGlow(m.headlight, …)` (`materials.js`
    L897) `core 2.5 → 1.6`, `coreExp 1.0 → 1.8`, `bleach 0.6 → 0.4` (B).
    Accept: each `front` lamp blob ≤ 600 px over 0.5 with a peaked centre
    (centre 5×5 ≥ +0.4 st over the ring at its 0.5 contour); pods unchanged.
  - Near-field spill: `truck_night/front.png` lower third (0,240,640,360)
    median 0.016, 20 px over 0.2, 0 over 0.35; `detail.png` under-bumper p95
    0.014 (both rounds); `hero` warm-lit ground p95 0.079. One spill
    `SpotLight` per side beside the beam spot (`src/vehicle/index.js`
    ~L90–95): half-angle 0.7 rad, distance 8, penumbra 0.6, 20° down,
    0.15 × `BEAM.night.beam`, 0 by day (B) — inside the light cap campground
    r5 records (7/9). Do not move `VIEWS.front`; add a `front_low` night view
    if the lit dirt is wanted in frame. Accept: dirt 1–3 m ahead of the bumper
    Y 0.05–0.10; `front` lower third median ≥ 0.03; no ground blob ≥ 20 px
    over sRGB 0.5 in `hero`/`front` (C); `mainroad` pool (120,150,280,200)
    0.235 ± 0.02.
  - Clearcoat legibility: `truck_day/hero.png` green-paint p95 0.227 under a
    sky p95 0.382, paint over the sky median 1.5 %; `glass/ws_mid.png` bonnet
    rows 228–296 × cols 100–300 Ymed 0.150 / p90 0.294 — R4's 0.151 / 0.302
    (§13). Body paint keys (`materials.js` L170, L219) `line 0.3 → 0.08`,
    `band 0.5 → 0.65` (C; roof key stays 0.3), then `makePaintMaterial`
    (`src/textures/vehicle.js` L3868–3870) `clearcoatRoughness 0.15 → 0.06`,
    `clearcoatNormalScale 0.3 → 0.15` (B). Accept: the door (green mask rows
    120–190 of the hero) carries a ≥ +1 st band over its base; `ws_mid`
    bonnet row medians ≥ +0.7 st at the skyline row against the rows below;
    paint over the sky median ≥ 5 % in the hero; hf grain ≤ 0.30; `ws_close`
    bonnet ≤ 0.45 (0.389, no new hot spot).
  - Headlamp lens: re-shot `ultra_day/hero.png` left lens (285,364,302,388)
    Ymed 0.110, right (438,344,456,374) 0.129, hue 34–36°, sky 0.291 —
    −1.4 / −1.2 st (C, §17). `m.lensClear` and `m.barCover` (`materials.js`
    L774, L797) `transparent, opacity 0.1` → the panes' premultiplied close
    (`gl_FragColor.a = max(diffuseColor.a, luminance(directSpecular +
    indirectSpecular))`) or `transmission 1, opacity 1, thickness 0.002`.
    Accept: both lens boxes within 1 st of the sky over them with a
    sky/ground split visible in the dome; night pods and lamp glow unchanged.
  - Verify from r6 (no frames yet): wiper arcs in `glass/ws_close.png` (a
    wiped/unwiped boundary ≥ 0.06 of veil across two texels, see ≥ 0.90
    kept). And the dusk beams: r6 cut `BEAM.dusk` beam 22 → 3.5 and bar
    26 → 4 for "the dusk lamp pool under the sky at last" — that pool was the
    pitched frames'. On the level `84c1e5e` truck at 22/26 the dusk sand pool
    is already out of the near frames (`truck_dusk/front.png` lower half warm-
    lit 25.1 % → 1.4 %, `hero` 3.2 → 0.6 %, `road` 6.3 → 0.8 %; 0 px over 0.7
    in all three) while the trail pool stands: `truck_dusk/mainroad.png`
    (120,150,280,200) Ymed 0.145 (R4 0.150), +2.9 st over the lower half. Shoot
    r6 and measure that box; if it has fallen under 0.10, restore `BEAM.dusk`
    toward 22/26 with r6's pod cores kept. Accept: `mainroad` dusk pool
    0.10–0.16; `front` 0 px over 0.7; grille p95 ≤ sky p95.
- **Car glass** (`src/vehicle/mirrors.js`, `src/textures/vehicle.js`
  `applyMirrorHorizon`, `tools/glassgauntlet.mjs`):
  - The mirror as a mirror at fast: `glass/mirror.png` pane (378,30,495,230)
    shows a dune horizon at row 88, one acacia and a bare plain; the scene
    behind the truck in the same frame (200–360, 40–200) is a hill ridge at
    row 52 over straw tussocks (§15, all three). `liveMirrorsWanted`
    (`mirrors.js` L68) also true at fast when the camera is inside the cab
    (dist < 1.5 m, the `NEAR 5` gate kept for exterior cameras — A); the pass
    as C specifies: 160×120 `WebGLRenderTarget`, mirrored camera through the
    pane plane, `clipBias 0.003`, layers sky | terrain | vegetation swath |
    body, every second frame, only while the seat or `mirror` camera is
    active; the painted plate stays for exterior cameras and `liveMirrors`
    off. Accept: pane skyline row within ±3 px of the scene's reflected ridge
    (C's test 1); straw-hue (35–70°) fraction ≥ 10 % below the skyline (now
    0); the flank still in the pane's lower rows (from row ~156, Y 0.02–0.05);
    `mirror` see ≥ 0.85 (0.890) and cover ≥ 60 % kept; ≤ 100 calls added,
    from the seat only.
  - Mirror sky saturation and the ground ramp: B's `uMhSky 1.15 → 1.0` with
    sky toward `uMhFog` over `mhUp` 0–0.25 is **not** adopted — the pane's
    mid rows (sat 0.33 at 5–13° up) were compared with the window's 2.6° haze
    band (sat 0.05–0.08); at the same elevation they agree within 0.05 sat
    and 0.1 st (§15). For the plate that remains on exterior cameras, A's
    `applyMirrorHorizon` (`src/textures/vehicle.js` L847) `smoothstep(−0.08,
    −0.7, mhUp) → smoothstep(−0.3, −0.9, mhUp)`. Accept: pane plain
    (385,105,430,150) Ymed within 0.25 st of the trail beside the mirror
    (150,250,340,360) (now −0.21) and row 152 within 0.3 st (now −0.55); pane
    horizon row (84–88) Y 0.40–0.46 sat ≤ 0.10 kept.
  - `moving.flick`: 0.099 → 0.156 is the world through a clearer pane
    (flick with every pane hidden 0.175 over the same pixels; §14) — no pane
    change. Tool: report `flick / flickBg` on `moving` (0.89 now) beside
    `flick`. Accept: `flick / flickBg` ≤ 1.0; static views ≤ 0.03 (`int_side`
    0.030); `night_ext` ≤ 0.002 (0.0014).
  - The ultra door-glass stipple: re-shot `ultra_day/interior.png`
    (0,90,110,150) 5.2 % checkerboard pixels, (0,60,200,300) 2.9 %, the mirror
    surround (150,120,280,200) 2.7 %, against 0.1 % on the windscreen sky and
    0.5 % on the dash (§14). A/B with `?ssrpane=off`; if it goes, `blurTaps
    4 → 8` on the pane SSR path or the door panes off `SSR_LAYER` at ultra.
    Accept: ≤ 0.5 % on the door glass at 1280, `see` on `side_shade`/`int_side`
    unchanged.
  - Sill and door streaks one frequency (C: hero Texture 6 → 6, glass Texture
    5 → 6): `glass/side_shade.png` sill (0,250,640,300) at 2×, pitched
    `ultra_day/hero.png` door (600–760, 330–430) "brushed metal". `uDirtScratch`
    in the paint shader: two octaves (0.6× and 2.3× the current frequency),
    ±12° rotation jitter per panel, amplitude halved on the vertical door
    skin. Accept: two peaks in the sill band's column spectrum at 1280; the
    door skin's streak contrast ≤ half the sill's.
  - Tool, the `mirror` view: eye 40 mm lower and 4° outboard so the cage bar
    leaves the pane's top-right corner (`glass/mirror.png` (430–500, 45–90),
    C); keep `minCover 3` — it is the assert the pitched round needed — and
    add `bar ∩ pane = 0`. Accept: cover ≥ 60 % with the corner clear.
- **Fleet**: re-shoot `fleet/` on a build carrying `8611235` before scoring
  chrome/alloy; `clearcoatRoughness 0.20`; fleet `headlight` core not scaled
  by the night gain (`pickup_0_night.png` 253 px over 0.7, C).
- **Master / tools**: the walk camera at 2.2 m and both strips re-shot; the
  truck-set pitch/spot assert (|pitch| ≤ 1°, |spot − R4| ≤ 0.5 m) before a
  set is written; the `mirror` view's `minCover 3` kept, with `bar ∩ pane = 0`
  and the eye 40 mm lower / 4° outboard; the capture order and the
  `stats.json`-last rule for the `ultra_*` sets (§Tool defects 10); the
  `moon` view; ridge-detector rule (§Tool defects 2); `stats.json` for every
  family; `flick / flickBg` on `moving`.
