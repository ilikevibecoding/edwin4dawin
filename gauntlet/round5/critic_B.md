# Critic B — round 5 (lighting, shadows, reflections)

**Incumbent:** round 4, build `80cb5e6`, `shots/round4/` (walk strip from `lions_walk_fixed/`).
**Candidate:** round 5, `shots/round5/` — `truck_*`, `glass/`, `ultra_day/`, `ultra_night/` **re-shot from `84c1e5e`** (see the re-judge note below); `camp_*`, `fleet/`, `lions_*`, `ultra_camp/`, `ultra_lions/` from `0dc79bb`. `84c1e5e` differs from the first candidate build `16028cf` only in the capture pre-roll (`src/drive.js`, `src/main.js`) and in fleet r4 (`8611235`, `src/vehicles/*`, not in any truck view); `src/vehicle/`, `src/sky.js`, `src/textures/`, `src/post.js` are identical between the two, so every hero-car code reference below holds for the frames as shot. Between `80cb5e6` and `0dc79bb` the candidate also carries terrain r4 (`9171493`), HUD plates (`9f44f70`), campground r4 (`fd28044`), the fleet-tool hour fix (`b1c09e1`), lions r6 (`358f2be`) and the five round-5 landings. The fleet frames predate fleet r4; scored as shot. The car builder's round-6 landing (`5dc56cd`) is in none of these frames.

**Re-judge (truck families).** The first round-5 truck, glass and ultra frames (`16028cf`) had the body pitched 5.7° nose-down at the shot — the pinned pre-roll speed read as a brake held to the floor — which aimed the lamps and the bar at the ground and at the cameras and put the glass tool's cameras off the cab. `84c1e5e` fixes the pre-roll (body pitch 0.2°; round 4's was 0.31°; roll 5.7° in both rounds, the truck is mid-corner at that spot) and the six sets were re-shot; the pitched frames are kept in `shots/round5_pitched/`. Families 1 (Hero car) and 2 (Car glass) below are re-judged on the re-shot frames against the same round-4 incumbent, and the attitude-dependent numbers in family 9 (Lighting) and the truck lines in family 10 (Performance) are re-measured; what moved is stated at the top of each of those families. Everything else in `shots/round5/` is unchanged and so are families 3–8. The re-shot `ultra_day/` set landed while this re-judge was being written (00:21–00:41) and was looked at last; its numbers are in families 1 and 10.

**Frames looked at:** every candidate frame beside its incumbent pair — `truck_day|dusk|night` (10 views × 3), `camp_day` (6), `camp_night` (4), `fleet` (12 × day/night), `lions_day` (7), `lions_dusk` (3), `lions_walk/walk_00..07` + 4 stills, `glass` (12) — 103 pairs — plus the 11 unpaired 1280×720 ultra frames (`ultra_day` hero/road/mainroad/forest/interior, `ultra_night` hero/road, `ultra_camp` mess/gate, `ultra_lions` close/face). `ultra_night/road.png` was present. For the re-judge: the 30 re-shot truck frames, the 12 re-shot glass frames and the 7 re-shot ultra frames (`ultra_day` hero/road/mainroad/forest/interior, `ultra_night` hero/road), each beside its round-4 pair and beside its pitched predecessor (`/tmp/criticB/rj/cmp/`, `*_pv.png`). Composites and 3–8× crops under `/tmp/criticB/cmp/`, `/tmp/criticB/r5/` and `/tmp/criticB/rj/`.

**How I measured:** PIL + numpy scripts under `/tmp/criticB/`. Linear luma Y = 0.2126 R + 0.7152 G + 0.0722 B after sRGB → linear; stops = log2 of a ratio of medians unless a percentile is named; HSV of a box's mean sRGB; fractions of pixels over a threshold; 4-connected blobs on thresholded masks; high-frequency texture = std(Y − 5×5 box blur) / mean Y. Every box is given at the frame's own resolution as (x0, y0, x1, y1), exclusive of x1/y1. **Hills:** the round-4 boxes are abandoned. Skyline per column = first row, scanning down, where the R4-vs-R5 pixel difference exceeds 12/255 for six consecutive rows (the terrain shader changed between rounds and the day sky did not: sky rows differ by ≤ 3/255 of dither; `camp_beyond` is pixel-identical above row 92, threshold 3/255 there). Hill = rows +2..+8 under that row, sky = rows −18..−4 over it, in each round's own frame; columns whose sky window has std/mean > 15 % (cloud edge, tree) are dropped. The detected skyline was checked by eye on overlays (`/tmp/criticB/r5/skl3_*.png`). **Walk strip:** median of the eight frames as background; a "lion" pixel differs from it by > 0.10 in any channel; a planted foot = a lion pixel in rows 168–185 that also does not change between consecutive frames (|Δ| < 0.05), clustered by column. **Performance:** `stats.json` only. **Source:** read with `git show <rev>:<path>` at `16028cf` (truck, glass — `git diff 16028cf 84c1e5e -- src/vehicle src/sky.js src/textures src/post.js src/camera.js` is empty, so the same lines hold for the re-shot build) and `0dc79bb` (the rest); every module, parameter and line number quoted below was checked against those revisions, not the working tree, which had moved on by the time this was written.

**A caveat that runs through the truck families.** The re-shot truck stands level — the nose-down look of the pitched frames is gone (`/tmp/criticB/rj/cmp/truck_night_hero_pv.png`: the pitched sill line falls to the front, the re-shot sill is level) — but it is mid-corner, and every camera in `src/camera.js` `VIEWS` is placed in the truck's local space off its position and heading (hero, front, rear, wheel, detail, interior, forest, the glass views). The cameras therefore sit further round the nose than in round 4: in `truck_night/hero.png` the bar's pods run (242, 79) → (306, 68) in R4, a 10° screen slope, and (234, 93) → (296, 70) in the re-shot, 20° (the pitched frame: 16°); in `truck_night/front.png` the camera sees the nose 20–30° off-axis, so the headlamp pool falls right of the frame. `mainroad` is placed on the mainline (`place: 'main'`) and `forest` sits 10.5 m behind on the heading; both match round 4 to the pixel in the background. Where a box had to move with the truck I say so; sky/background comparisons in the moved views are of different sky.

---

## 1 Hero car

**Re-judge (re-shot from `84c1e5e`).** One score moved: Visual cleanliness 5 → 6 becomes **5 → 7**. The pitched truck had aimed its lamps and bar at the dusk camera and at the ground; on the level truck the dusk front is *under* the sky (grille p95 −0.41 st, bar p95 −0.26 st, where the pitched frame read +0.36 st and an 885-px bar blob), the near-field pool that filled the pitched night frames is gone, and the frame's pixels over Y 0.5 fall from 1 886 to 1 061 (R4 2 484), leaving the two headlamp ellipses as the only hot spots. My former weakness 1 (dusk lamps over the sky) was the capture, not the car, and is withdrawn; the dusk claim in the changelog holds. Lighting stays 6 → 7 (the glare balls, below), Reflections 5 → 6, Glass 6 → 7. The chamfered/siped lugs, which I could not resolve in the pitched `wheel` frame, resolve in the re-shot one.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Level truck (pitch 0.2°), rolled 5.7° through a corner as in R4; the cameras sit further round the nose (bar slope 10° → 20° in `truck_night/hero.png`), `front` sees the nose 20–30° off-axis, and two verge tufts stand in front of the tyre in `truck_day/wheel.png` (124–175, 165–210), (294–320, 175–215). Capture placement, not art. |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | Nine pod reflectors read as nine at every hour. Chamfered lugs with a sipe line resolve in `truck_day/wheel.png` (lug at (270–330, 130–170), 4× crop): claim holds. |
| 4 | Scale | 8 → 8 | |
| 5 | Materials | 7 → 7 | Clearcoat over a satin base claimed. Bonnet in `glass/ws_mid.png` (120, 200, 280, 240): hf-std/mean 0.289 → 0.306 (flake grain), median Y 0.217 → 0.214, one broad sky lobe (p95 0.503). At 1280 (`ultra_day/hero.png` bonnet (200, 340, 330, 400), 2× crop) the same: a satin wash with a bright line on the leading edge, no horizon in the coat. Reads the same as R4's painted dielectric. |
| 6 | Texture quality | 7 → 7 | |
| 7 | **Glass / transparency** | 6 → 7 | Panes clearer: tool see-through side_shade 0.678 → 0.919, ws_mid 0.787 → 0.874, ws_close 0.867 → 0.925, veil 0.124 → 0.053; a tinted sun band across the top of the screen and the cab visible through it (`glass/ws_mid.png` crop). Claim (0.68 → 0.93) holds to 0.01. |
| 8 | **Lighting** | 6 → 7 | The bar slab is nine pods. `truck_night/hero.png` bar box (225, 58, 312, 102): 218 px over Y 0.5 (R4 box (215, 35, 335, 110): 1 435); local maxima > 0.45 with 5-px NMS: 9 (R4 12). `truck_night/front.png` bar box (225, 65, 355, 115): 505 px, 9 peaks (R4 (245, 55, 380, 110): 1 948 px, 20). Claim 1 449 → 417 holds (mine 1 435 → 218). At 1280 (`ultra_night/hero.png` (440, 110, 630, 210)) nine lobes on one glowing body, 1 984 px over 0.5, peak 0.74. Dusk under the sky now (re-judge note). Night body a dark shape under a brighter sky: door panel (320, 155, 400, 195) median 0.0158 vs sky p50 0.0203, −0.36 st (R4 (255, 125, 330, 158): +0.91 st over a darker sky). Held at 7 for the headlamp glare — weakness 1. |
| 9 | Shadows | 7 → 7 | |
| 10 | **Reflections** | 5 → 6 | Door mirror mirrors the world, now in the mirror frame itself: `glass/mirror.png` main pane (385–455, 45–150) holds sky over a horizon with a far crown, laterite, and the green flank inboard, in a metal bezel with a split bar; tool `mirror` see 0.331 → 0.890; `lions_day/lion_seat.png` (unchanged frame) shows the same from the seat. Sky lobe on the bonnet, soft. |
| 11 | Color / atmosphere | 7 → 7 | |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 8 → 8 | |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | **Visual cleanliness** | 5 → 7 | Bar bloom gone; no beam-slice discs off-axis (`truck_night/road.png`: R4's disc at (315, 120) has no counterpart); no bloomed star; no dusk hot spot (frame pixels over 0.5 in `truck_dusk/hero.png` 3 798 → 431, the largest blob 85 px in a sky gap between crowns). Night hero total over 0.5: 2 484 → 1 061 px, of which the two headlamp glare blobs are 488 + 309 — a lighting flaw, counted under 8. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | `truck_day/hero` calls 488 → 488, programs 174 → 175 (fleet r4 folded the old/new paint into one program), textures 295 → 293; `rear` 605 → 656 calls (+51, the largest move, at every hour); `road` 520 → 497, `mainroad` 620 → 611. |

**Top three weaknesses**

1. **Headlamp glare is a filled ellipse, and bigger than round 4's at the front camera.** `truck_night/hero.png` blobs over 0.5 at the lamps: (196–227, 172–193) 488 px and (126–149, 184–201) 309 px; the near one is a smooth filled ellipse with no lens structure inside it (5× crop `/tmp/criticB/rj/night_lamps_new.png`), flat at Y 0.5–0.73 across 31 × 21 px. `truck_night/front.png`: two glare balls (332–379, 151–202) 1 584 px and (198–239, 187–237) 1 325 px over 0.5 — R4's were 1 288 and 1 000 (+23 %, +33 %); over 0.35 they are 2 353 and 1 979 px, 47–64 px across at 9 m. The beam-slice cores are gone (the sheet takes over past `wSlice = smoothstep(0.80, 0.97, ax)`, `src/sky.js` ~2718); what is left is the lens's own glow — `applyLampGlow(m.headlight, { core: 2.5, bleach: 0.6, coreExp: 1.0 })` (`src/vehicle/materials.js` ~897), a bleached core with a linear profile. Fix: `core` 2.5 → 1.6, `coreExp` 1.0 → 1.8, `bleach` 0.6 → 0.4, so the lens has a peaked centre and a falloff inside its own housing instead of a filled disc; the `lensClear`/`lensRibbed` cores at 7.0 stay. (The round-6 cone change 26.4° → 22° is not in these frames.)
2. **Clearcoat does not show at 640.** `glass/ws_mid.png` bonnet (120, 200, 280, 240): one soft sky gradient, hf 0.306; the flake normals raise grain, not sparkle, and there is no sharp horizon line in the paint at any camera (`truck_day/hero.png` bonnet and wing, 3× crop: the lobe is a pale wash). Fix: `makePaintMaterial` in `src/textures/vehicle.js` (~3868) — `clearcoatRoughness` 0.15 → 0.06 so the clearcoat lobe carries a legible horizon, and `clearcoatNormalScale` 0.3 → 0.15 (the flake now rides the coat normal, `paintCoatNormal()`, and at this pixel size it reads as noise); keep the base satin and the roof's 0.18.
3. **The lamps light nothing the near cameras can see.** `truck_night/front.png` lower third (0, 240, 640, 360): median 0.0159, 20 px over 0.2, 0 over 0.35 (R4: 20 380 px over 0.35 — a blown pool; the truth is between); `detail.png` ground under the bumper (0, 280, 640, 360) p95 0.014 in both rounds. The spots are aimed 6° down with a 26° half-angle "whose lower edge reaches the dirt 1.7 m ahead" (`src/vehicle/index.js` ~85–94), yet the only pool in the set is the far one in `mainroad.png` ((120, 150, 280, 200), median 0.235, well ahead of the bumper) and the `front` camera at 9 m, off the nose in this shot, sees none of it. Fix: a near-field spill beside each spot in the same loop (`src/vehicle/index.js` ~90–95) — a second `SpotLight`, half-angle 0.7 rad, distance 8, penumbra 0.6, aimed 20° down, at 0.15 of `BEAM.night.beam` (40, ~135) and 0 by day — so the dirt in front of the bumper reads at Y 0.05–0.10 under the pods; and in `src/camera.js` `VIEWS.front` (~21) take the target from (0.0, 1.15, 0.8) to (0.0, 0.4, 3.5) — the ground three metres ahead of the bumper — so the night front shot contains its subject.

**Regressions:** none.

**Must not regress:** nine pods at night (218 px over 0.5 in the hero bar box, 9 peaks front and hero); dusk front under the sky (grille p95 ≤ sky p95); clear day panes (see ≥ 0.87 on the exterior views); the door mirror showing sky, horizon, ground and flank; night body a readable dark shape under the sky (door −0.36 st); 488 calls on the hero.

---

## 2 Car glass

**Re-judge (re-shot from `84c1e5e`).** No score moves; two findings do. In the pitched `glass/mirror.png` the mirror head was not in the frame at all — the tool's cameras had slipped off the cab with the pitch, and what I measured as "the reflected road filling (120–350, 18–360) with no bezel" was the direct view past the door pillar, and the tool's see 0.986 was read off that frame. My former weakness 2 is withdrawn. The re-shot frame has the head in the right third with its bezel and split bar, and the pane holds sky, horizon, ground and flank (tool see 0.890, cover 65 %) — the Reflections 5 → 7 now rests on the mirror frame as well as on `lion_seat`. The flicker regression stands on the re-shot tool run at 0.156 (was 0.172 pitched; R4 0.099). The see-through gains hold on the four exterior day views; the three from-the-seat views (`interior`, `int_side`, `dusk_ws`) are flat against R4 on the level truck, where the pitched run had them up.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | The tool's `mirror` view moved from outside the truck to the driver's eye (`tools/glassgauntlet.mjs`: pos (2.25, 1.68, 0.2) → (0.3, 1.6, −0.16), fov 16 → 18); the re-shot frame is the composition intended — door glass and verge left, mirror head at (300–440, 20–210) right, spotter mirror below it. The R4/R5 mirror frames are different pictures. |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | |
| 4 | Scale | 8 → 8 | |
| 5 | Materials | 7 → 7 | Thin dielectric with a Fresnel sheen at the top of the door pane; dust is a thin film at the sill. |
| 6 | Texture quality | 6 → 6 | "Dust settled to the sills, wiper arcs" claimed. A sun band and a faint sill film are visible in `glass/ws_mid.png`; no wiper arc is resolvable at 640 in `ws_close` or `ws_mid` (2× crop `/tmp/criticB/rj/wsclose_crop.png`). Cannot confirm. |
| 7 | **Glass / transparency** | 6 → 7 | Tool see-through, R4 → R5 (re-shot): ws_close 0.867 → 0.925, ws_mid 0.787 → 0.874, side_sun 0.670 → 0.957, side_shade 0.678 → 0.919; from the seat flat — interior 0.789 → 0.799, int_side 0.875 → 0.861, dusk_ws 0.836 → 0.845; veil 0.02–0.09 (was 0.02–0.12). Night panes 0.92 → 0.93 (int), 0.93 → 0.96 (ext). Clip 0 % everywhere. |
| 8 | Lighting | 6 → 6 | |
| 9 | Shadows | 6 → 6 | |
| 10 | **Reflections** | 5 → 7 | The mirror reflects the scene: `glass/mirror.png` main pane — sky (385, 45, 420, 85) median Y 0.327, horizon with a far crown at row ~95, laterite (385, 105, 430, 150) 0.238, the green flank inboard (430–455, 100–150) and the rack rail across the top corner; tool see 0.331 → 0.890, cover 19 → 65 %. In `lions_day/lion_seat.png` (world camera, unchanged) the same from the seat where R4 held a white glare. Claim (22° inboard, 1.5° down) holds in the picture. The mirror's sky is not the window's sky — weakness 2. |
| 11 | Color / atmosphere | 7 → 7 | |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | — → — | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 7 → 7 | |
| 17 | **Temporal stability** | 6 → 5 | Tool `flick` on the `moving` view 0.099 → 0.156 (+58 %; the pitched run gave 0.172), `int_side` 0.024 → 0.030, `interior` 0.015 → 0.015. The still cannot show it; the number is the tool's. |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Flicker on the moving windscreen.** `glass/metrics.json` `moving.flick` 0.099 → 0.156 on the level truck (0.172 pitched). The clearer pane passes more of the interior and the scene behind, so whatever shimmered under the veil now shimmers in the open. Two new sub-pixel inputs are in the pane itself: `glassLayerMap` (`src/textures/vehicle.js` ~1944) puts `grit` as `smoothstep(0.72, 0.95, fbm(u * 46, v * 46, octaves 2))` — one- to two-texel hard spots on a 512 map — into the lit dust, and `glassRoughness` (~1868) does the same with `spots` at 40× (`smoothstep(0.72, 0.95, …) * 0.16`) in the pane's roughness; both are above the Nyquist of the pane's screen footprint at 640 and swim under motion. Fix: widen both to a 3-texel feature (`fbm(u * 16, v * 16)` with `smoothstep(0.6, 0.9, …)`), and set `anisotropy` 4 on the two glass textures where `roughnessTexture` builds them; with the paint's `clearcoatNormalScale` 0.3 → 0.15 (family 1) re-run the tool for `flick ≤ 0.10`.
2. **The mirror's sky is not the window's sky.** `glass/mirror.png`: the sky in the pane (385, 45, 420, 85) is mean sRGB (136, 152, 180), hue 218°, sat 0.24, median Y 0.327, with a cloud; the sky seen directly through the door glass beside it (210, 15, 330, 45) is (167, 172, 183), sat 0.09, Y 0.407 — the mirror shows a sky 2.7× as saturated and −0.31 st darker than the one outside the window, so the two do not read as the same afternoon. `applyMirrorHorizon` (`src/textures/vehicle.js` ~715–860; the sky/ground split is `radiance = mix(radiance * uMhSky, mhG, mhBelow)` at ~850) leaves the sky half of the pane as the PMREM's radiance at `uMhSky` 1.15 — the environment cube, which has no horizon haze — and grades only the ground half. Fix: in the same shader, for the reflected ray's elevation `mhUp` in 0–0.25 mix the sky radiance toward the scene fog colour (`uMhFog`, set from `scene.fog.color` like the water shader does) by `0.7 * (1 − smoothstep(0.0, 0.25, mhUp))`, and take `uMhSky` 1.15 → 1.0; target the pane's sky within 0.1 st and 0.05 of saturation of the sky through the glass beside it.
3. **Windscreen wiper arcs and sill dust are below the pixel.** `glass/ws_close.png`: the dust layer reads as a uniform veil (tool veil 0.046); no arc boundary is visible at 640. Fix: `glassLayerMap` in `src/textures/vehicle.js` (~1970–2000) — the blade's `ridge` is `clamp(sweep(0.055) − swept) * 0.5`, a band 5.5 % of the pane wide at half weight, which at this camera is a 6–8 px gradient; make it a step: `grow` 0.055 → 0.02 and the ridge weight 0.5 → 1.0, so the wiped/unwiped boundary is ≥ 0.06 of veil across two texels. The sill term is already there (`low = 1 − smoothstep(0.02, 0.34, v)` over `settle(0.25)`); lift `low`'s weight so the sill film is 3× the top rail's, and take the `settle` floor 0.25 → 0.12 so the top of the pane is clear glass against which the sill reads.

**Regressions:** Temporal stability 6 → 5 (`moving.flick` 0.099 → 0.156).

**Must not regress:** see-through ≥ 0.87 on the four exterior day views; the mirror as a mirror (bezel, split bar, sky/horizon/ground/flank in the pane); 0 % clip; the night panes' 0.93/0.96.

---

## 3 Fleet

Frames predate fleet r4 (`8611235`): chrome, alloy and the sidewall map are not in them. Night frames are the first shot with the camp lamps at their hour level (`b1c09e1`).

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | Chrome/alloy still flat grey in these frames (`fleet/suv_0_day.png` bumper, sat 0.03). Fleet r4 is not in the shot. |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | 6 → 6 | |
| 8 | **Lighting** | 6 → 7 | Row lanterns light the row. Body median Y (480×270, body box per vehicle), R4 → R5, and body/sky: camper 0.023 → 0.046; motorcycle 0.006 → 0.016; pickup 0.022 → 0.052; ranger 0.005 → 0.009 (0.38 of sky); safari-jeep_0 0.003 → 0.032 (+3.3 st, 1.08 of sky); jeep_1 0.003 → 0.012; jeep_2 0.004 → 0.023; suv 0.008 → 0.019; utility 0.006 → 0.017. Far ends unlit as claimed: expedition 0.011 → 0.013 (0.51 of sky), supply 0.003 → 0.005 (0.27). Trailer 0.136 → 0.014 — the R4 frame was the tool defect (plate in the arch), the R5 one is a dark trailer. |
| 9 | Shadows | 7 → 7 | |
| 10 | Reflections | 5 → 5 | Nothing in these frames reflects anything; the fleet r4 chrome will be the next round's evidence. |
| 11 | Color / atmosphere | 7 → 7 | Night sky in the fleet frames p50 0.005–0.012 → 0.013–0.034, blue. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 7 → 7 | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 7 → 7 | Lit sign board and lantern poles tie the row to the camp at night. |
| 16 | Visual cleanliness | 7 → 7 | Lantern glare balls are new hot spots: `safari-jeep_0_night.png` blob (227–255, 133–157) 461 px over 0.5 sitting on the jeep's bonnet; pixels over 0.5 per frame 9 → 963 (jeep_1), 50 → 730 (utility), 10 → 524 (ranger). They read as lamps, not defects; held at 7. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Chrome and alloy are flat grey in the frames as shot.** `fleet/suv_0_day.png` bumper, `camper_0_day.png` wheel trims: sat 0.03, no gradient across the curve (unchanged from R4). The fix is already claimed in `8611235` (`alu` metalness 1 / env 1.4, `chrome` F0 0.6 / env 1.5 in `src/vehicles/materials.js`); it needs a re-shot fleet set to be scored.
2. **The lantern glare sits on the vehicle.** `fleet/safari-jeep_0_night.png`: the pole lantern's bloom (461 px over 0.5, peak 0.75) lands on the bonnet at (227–255, 133–157) and is the brightest thing in the frame; the jeep it lights is at 0.032. Fix: `src/campground/layout.js` `rowLamps` (~102) `height` 3.0 → 3.8, so the lantern hung at `height − 0.6` (`structures.js` `poleLantern`) sits at 3.2 m, above the fleet camera's top edge; and `src/campground/lights.js` ~94 `mats.lampGlass.emissiveIntensity` 5.0 → 2.4 × lvl — the night bloom is `{ strength 0.55, radius 0.25, threshold 2.0 }` (`src/post.js` ~1212), so a glass at 5.0 is 2.5× over the threshold and blooms to a 28-px ball; at 2.4 only its core passes.
3. **Far end of the row unlit.** `fleet/supply-truck_0_night.png` body 0.005 (0.27 of sky), `expedition-truck_0_night.png` 0.013 (0.51). Fix: a third `rowLamp` at u −2 with the existing 20 m range, or a marker lamp material on each cab (`amber` at `BEAM.night.amber` 3.2 for the fleet kit) so the dark bodies carry one point each.

**Regressions:** none.

**Must not regress:** jeep_0/jeep_2/utility lit to ≥ 0.8 of the sky at night; camp lamps at hour level in every fleet night frame.

---

## 4 Campground

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 7 | Timber end grain and checks claimed; posts in `camp_day/camp_gate.png` read as poles at 512 wide, grain not resolvable. |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 6 → 7 | Day fill under the fly: `camp_day/camp_mess.png` shaded floor (200, 200, 330, 235) median Y 0.041 → 0.120 against sunlit dirt L (0, 240, 120, 288) 0.341 / R (400, 240, 512, 288) 0.307: **−3.1 / −2.9 st → −1.5 / −1.4 st**. Night: gate lanterns on both posts (`camp_gate_night.png` left blob (49–65, 156–171) 189 px over 0.35, R4 0); pad (60, 200, 452, 288) 0.0071 → 0.0152 at −0.40 st under the horizon band (R4 −0.50). |
| 9 | **Shadows** | 6 → 7 | Pockets under the tables: canopy interior (150, 150, 400, 240) p5 Y 0.0195 → 0.0364 = −4.1 → −3.2 st under the sunlit pad; p2 −4.8 → −4.1 st. Chairs readable. Matches the builders' "3.2 st, not met" — it is closer, not closed. Fly edge still ~10 px. |
| 10 | Reflections | — → — | |
| 11 | **Color / atmosphere** | 6 → 7 | Fire no longer a saturation clamp: `camp_fire_night.png` ground at 3 m (230, 200, 330, 220) sat 0.73 → 0.42 (claim 0.756 → 0.449 holds), 8 m (200, 240, 320, 288) 0.61 → 0.43, far corners 0.42/0.53 → 0.31/0.43. Canopy top at night (260, 60, 440, 110) hue 26° → 42°, sat 0.77 → 0.53. |
| 12 | Animation | 6 → 6 | Flame over-blend: flame box (270, 150, 310, 205) 161 → 529 px over 0.5, p95 0.54 → 0.60. Bigger and hotter; a still cannot judge the motion. |
| 13 | Physics / ground contact | 7 → 7 | |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 7 → 7 | |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **The shade pockets are still 3.2 st.** `camp_day/camp_mess.png` p5 of the canopy interior 0.036 vs pad 0.34 (−3.2 st), p2 −4.1 st. The daytime fill is the mess lamp's `day` block (`src/campground/index.js` ~248: intensity 12, distance 6, decay 1.2, `dy −0.7` → 1.9 m) and it reaches the open floor, not under the table tops. Fix: this is a hemisphere problem, as the builders say. The pad's `campWear` material (`src/campground/ground.js` ~512) holds the sky term at `envMapIntensity 0.65` for the whole pad because raising it lifts the sunlit pad too; give it a footprint mask instead — a `uFly` ellipse (centre `plan.mess`, the fly's half-sizes) in the material's `onBeforeCompile`, multiplying `envMapIntensity` by `mix(1.0, 1.7, inFly)` — so the shade gets 1.1 of sky and the pad keeps 0.65; then `day.intensity` 12 → 8 so the open floor does not double up. Target p5 ≥ −2.5 st.
2. **The flame is now a 529-px hot body.** `camp_night/camp_fire_night.png` flame box 529 px over 0.5 (R4 161), peak 0.70, in a 512-wide frame. The premultiplied over-blend was meant to put tongues inside the body; it also raised the whole body over the bloom threshold. `src/campground/fire.js` ~177: `alpha = s.a * vFade * (0.5 + 0.5 * smoothstep(0.05, 0.45, heat))` — the 0.5 floor lets the cool half of every sprite write at half opacity, and six sprites deep that is an opaque body. Fix: floor 0.5 → 0.2 with `pow(smoothstep(0.05, 0.45, heat), 1.6)` for the heat share, and `uGain` 0.9 → 0.7 (~316), so only the tongue cores pass 0.5; hold the ground's 3 m sat at 0.42.
3. **Hard fly edge.** `camp_day/camp_mess.png` column 260: Y 0.09 at row 230 → 0.42 at row 246, the whole step in 12 rows for a 6 m canvas at 4 m. Fix: `src/sky.js` day rig `shadow.radius` 1.2 → 3.0 (~499) and `sun.shadow.blurSamples` 12 → 16 (~1795); a 6 m fly at 4 m wants a penumbra of 25–30 px at this camera, not 12.

**Regressions:** none.

**Must not regress:** floor under the fly at −1.5 st with readable chairs; fire ground sat ≤ 0.45; both gate lanterns; pad under the horizon band at night.

---

## 5 Road & terrain

Frames: `truck_*/road`, `mainroad`, `camp_day/camp_beyond`, `lions_day/lion_far`, `lion_pride` (water hole), `fleet/pickup_0_day` (hills). The 21-sampler link failure and collision are not in the frames and are not scored.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 2 | Silhouette | 7 → 7 | Ridge lines unchanged (same skyline rows in both rounds, 502/512 columns within ±1 on `camp_beyond`). |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 7 | |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 6 → 6 | Hills sit under the sky now (below) but have lost their form: in 10 of 13 sampled `mainroad` columns the hill body (rows +12..+22) is 5–15 % *paler* than the crest rows (+2..+8) — e.g. x = 190: crest 0.349, body 0.380 of a 0.331 sky. A pale plate with a darker rim, not a lit and a shaded flank. R4's body was darker than the crest in half the columns and the crest was over the sky. Trade, not gain. |
| 9 | Shadows | 6 → 6 | |
| 10 | **Reflections** | 5 → 7 | The water hole is water. `lions_day/lion_pride.png` pool clear part (340, 116, 400, 124) median Y 0.448 → 0.318 against the sky over the ridge (330, 28, 512, 36) 0.364: **+0.30 st over → −0.19 st under**; pool vs mud ring below (200, 132, 440, 140) +0.43 → +0.77 st (claim +0.97). The kopje is mirrored as a dark mass (229–307, 117–126) at Y 0.05 (crop 4×), boulders inverted under the far bank; `lion_side.png` and `ultra_lions/lion_face.png` show the same. Wet annulus reads. Colour claim does not hold — weakness 1. |
| 11 | **Color / atmosphere** | 6 → 7 | Ridge rows vs sky over them, per column (method in the header), R4 → R5 medians: `truck_day/mainroad.png` L (0–200) 0.65 → 0.80 (strict veto, n = 22) / 0.93 (all columns, n = 194); mid (200–440) 0.67 → 0.83; R (440–640) 0.93 → 0.79. `lions_day/lion_far.png` L 0.43 → 0.72, mid 0.45 → 0.73, R 0.53 → 0.75. `fleet/pickup_0_day.png` mid 0.61 → 0.81, R 0.61 → 0.81 (L has the vehicle; n = 9/56). `camp_day/camp_beyond.png` L 0.83 → 0.72, mid 0.82 → 0.76, R 0.90 → 0.77. Hill sat 0.06–0.22. Claims (0.67 → 0.80, 0.55 → 0.71, 0.63 → 0.75, 0.80 → 0.72) hold within a few hundredths. Eleven of twelve segments are inside 0.72–0.92; the one out is `mainroad` L at 0.93 when every column is counted. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 7 → 7 | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | `mainroad` 620 → 609 calls, `road` 520 → 500; programs 175 → 177. The sampler pack cannot be seen here. |

**Top three weaknesses**

1. **The pool mirrors a warm grey, not the sky.** `lions_day/lion_pride.png` clear pool (340, 116, 400, 124): mean sRGB (156, 148, 145), hue 17°, sat 0.07, R > B; the sky it should mirror is (153, 161, 171) over the ridge and (146, 158, 178) higher up — B > R by 25–32. R4 was (178, 169, 157), hue 33°. "Grey → blue-grey" is not in the frame: it went from warm to neutral. In the `src/terrain.js` water shader the hole's path is `sky = skyDome(R)` (5135, when the dome uniforms are live), `refl = sky * key` with the card's luminance key held ≥ 0.78 (5118, 5136) — a darkening only, no hue — and then `col = mix(body, refl, fres)` (5235) with `fres = 0.25 + 0.75 (1 − f)^3` over the hole (5234) and `body = murk` = (0.15, 0.12, 0.07) → (0.085, 0.07, 0.042) with depth (5221): R/B 2.1, laterite. At the pride camera's few degrees `fres` is 0.6–0.85, so 15–40 % of every pool pixel is that brown, and the dome sample itself at 4–8° elevation is pulled toward `uSkyHaze` twice (`hz * 0.52` and `hz * side * uSkySun.w`, 5033–5034) on the sun side. The fog-colour `uSkyLow`/`uSkyTop` copy (5339) is only the fallback when the dome is not live. Fix: tint the murk by the sky it is lit by — `murk *= uSkyHor.rgb / dot(uSkyHor.rgb, LUMA)` — so the body under the sheet is sky-lit silt, not laterite; raise the hole's Fresnel floor 0.25 → 0.35; and in the reflection path evaluate the dome with the two haze mixes halved (a `skyDome(R, 0.5)` haze scale), then re-measure the pool's B − R against the sky over the ridge (target B ≥ R). The puddles keep the card.
2. **Hills are a flat plate.** `truck_day/mainroad.png` column profiles (x = 40, 120, 190): the crest band (0.80 of the sky) is the darkest part of the hill and the body under it is 0.85–1.15 of the sky — the near flank fogs to the plain's band (brighter) while the far crest fogs to 0.86 × the sky over the ridge. `hazeChunk` in `src/terrain.js` (~5515–5720): `hillAir = mix(air, hillSkyUp * hillTone, hillFar)` with `hillFar = smoothstep(400, 620, hillDist)`, so a flank at 450 m takes the band. Fix: for the hill mesh (`hillK > 0`) drive `hillAir` to `hillSkyUp * hillTone` for the whole hill (`hillFar = 1` when `hillK > 0.5`), keep the 400–620 ramp for the flat only, and lower `hillFog`'s floor from 0.90/0.94 to 0.82/0.90 so the lit-vs-shaded term is a stop, not a twentieth — the 0.80 ceiling guard keeps the crest under the sky either way.
3. **`mainroad` left crest still level with the sky when clouds are counted.** Same frame, columns 0–200: crest/sky 0.93 over all columns, 0.80 in the 22 columns with clean sky over them; the difference is a pale cloud streak lying on the ridge, which the eye reads as the crest. Fix: the `hillSkyUp` sample is the dome without cloud; add the cloud term (`sky.js` cloud layer evaluated at the same `upW`) to `hillSkyUp` so the hill keys to the sky it actually stands against.

**Regressions:** none.

**Must not regress:** ridge/sky inside 0.72–0.92 on eleven of twelve segments; the pool under the sky and over the mud; hill sat ≤ 0.22.

---

## 6 Vegetation

**Re-judge (partial).** The acacia numbers in this family come from `truck_day/forest.png` and `truck_dusk/forest.png`, which are in the re-shot truck sets; they were re-run on the re-shot frames. No score moves. The dusk rim reads +1.36 st (was +1.51); the day sun-side split, measured about the trunk instead of on two fixed boxes, is present and larger than R4's, so my former weakness 3 is withdrawn and the day crown's buried body takes its place. The turf, tuft and pride numbers are from the unchanged `lions_*` frames.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 6 → 6 | |
| 3 | Geometry | 5 → 5 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | Dusk crowns transmit now (below); day crowns unchanged. |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 6 → 7 | Re-measured on the re-shot `forest` frames (the forest camera rides the truck's heading; skyline within 3 px of the pitched frame). Dusk crown, `truck_dusk/forest.png` box (290, 45, 470, 90), crown-only pixels (Y < 0.6 sky): median −5.09 → −3.50 st vs sky, p95 −1.94 → −1.18 st; rim (2 px inside the outline) vs interior +0.67 → **+1.36 st** (pitched frame: +1.51) — a lit rim over a dark shell. Claim (−3.33 → −2.13 st) holds in direction; my box gives larger numbers both rounds. Day sun-side split, `truck_day/forest.png` acacia, foliage pixels (colour sky mask) split at the trunk (R4 x = 405, R5 x = 395), sun on the left: medians +0.74 → +0.93 st, means +0.09 → +0.78 st, p90 of the two halves 0.191/0.191 → 0.240/0.137 — the lit clusters now sit on the sun side. Claim ("+0.58 st sun half") holds; my pitched-frame reading (+0.78 → +0.62 st on fixed boxes) straddled the trunk and is withdrawn. |
| 9 | **Shadows** | 6 → 7 | Tuft self-shadow root → tip: `lions_day/lion_pride.png` lower third p10 Y 0.108 → 0.021; dark tuft pixels (hue 45–110°, V < 0.35) 0.0 → 1.2 % at Y 0.04. Contact under every tuft. |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 6 → 6 | The pride turf is khaki by hue and reads dark olive by value — weakness 1. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 6 → 6 | |
| 14 | **Detail density** | 5 → 7 | The bald plain is planted. `lion_pride.png` lower third (rows 192–288): soil pixels (hue < 35°, sat > 0.35, V > 0.3) 78 → 54 %; khaki/olive pixels (hue 40–110°, sat > 0.15) 8.3 → 15.6 %; straw mask (g ≥ 0.8 r, g > 1.2 b) 19.0 → 20.5 % — the mask does not move, as the builders say. `lion_medium.png`, `lion_side.png` mid-ground carries the same turf. |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Khaki turf reads as dark weed clumps on red soil.** `lions_day/lion_pride.png` crop (0, 190, 256, 288) 4×: tuft pixels are hue 44–49° (khaki) but the lit faces sit at Y 0.31 (mean (167, 152, 90)) and the roots at Y 0.04 (mean (65, 58, 24)), against soil at Y 0.20 (152, 105, 68), hue 26°, sat 0.55. Each clump is a 3-st object on a saturated orange ground — a cabbage field, not a lie-up. A savanna lie-up is trampled straw over dust: pale (Y 0.3–0.45), sat ≤ 0.35, roots a half-stop under the tips, soil grey-tan. Khaki turf is the right *form* (short, upright, full count); its value and the ground under it are wrong. Fix: `src/forest.js` grass species pick (~3628) — for `s.lawn > 0.5` pick from the straw forms with the `[1.06, 0.98, 0.88]` hue row (~3653) instead of `GI_LAWN`, cap the self-shadow inside the lawn (`uTuftAO`, "root to 0.45 of the tip", ~1012) at 0.7; and the terrain has no lawn term for the soil — add a `uPride` (xz, 11 m) uniform to the terrain material and, inside `smoothstep(11, 7, dist)` (the same 7–11 m ring `forest.js` uses for `lawn`, ~3396), mix the soil albedo toward (0.62, 0.55, 0.48) × 1.15 so the pad is dust, not laterite.
2. **The dusk crown rim is a fringe the crown does not sit inside.** `truck_dusk/forest.png` (290, 45, 470, 90): rim +1.36 st over an interior at median 0.021 — the shell is still −3.5 st under the sky, so the tree is a black cut-out with a bright edge. Fix: the transmission cap scales with `transLow`; raise the interior transmission floor at low sun so the crown interior sits at ≥ −2.5 st (`transLow` × 1.6) and keep the rim as is.
3. **The day crown is a dark mass with a lit side, not a lit crown with a shaded side.** `truck_day/forest.png` acacia (280, 35, 440, 100), foliage pixels: median Y 0.0274 against a sky of 0.253, **−3.2 st** (R4 −3.7 st); 42 % of the foliage is under Y 0.02 (R4 51 %); the upper quartile sits at −1.5 st. At a 58° sun a real acacia's canopy is mostly lit leaf at −0.5 to −1.5 st under the sky with a shaded underside; here the sun side gained (above) but the body is still buried. The term is the baked occlusion `open = 1.0 − uShade * vShade` (`src/forest.js` ~1282) with `shade: 0.86` on the crown material (~2756), so a card at `aShade` 1 keeps 14 % of its light. Fix: `shade` 0.86 → 0.70 on the day crowns (the dusk shell keeps its own `lowSun` path at ~1453), and measure the foliage median on this box — target ≥ −2.3 st under the sky with the sun-side split kept ≥ +0.7 st.

**Regressions:** none.

**Must not regress:** turf at full count under the pride; dusk crown rim; tuft self-shadow.

---

## 7 Lions

Lions r6 (`358f2be`) is in the candidate and not in the incumbent.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | **Silhouette** | 5 → 6 | `lions_day/lion_side.png` crop (170, 130, 330, 210) 4×: withers rise, a saddle behind them, a raised sacrum and a belly tuck are now in the top and bottom outlines; the R4 back was one straight cylinder. Shoulder mass reads at dusk (`lion_close_dusk.png`). |
| 3 | **Geometry** | 5 → 6 | Scapula plateau and a triceps groove behind it; leg steps at elbow and stifle. The muzzle is still a box: `ultra_lions/lion_face.png` (260, 60, 760, 460) shows a rectangular muzzle block, a flat brow plateau and an ear that is a flat leaf-shaped disc. |
| 4 | Scale | 7 → 7 | |
| 5 | **Materials** | 5 → 6 | A backlight rim exists. `lions_dusk/lion_close_dusk.png` column x = 360: dorsal outline rows 84–87 Y 0.44–0.50, body rows 93–100 Y 0.19–0.28: **+1.1 st** at the rim; R4 at the same columns has no outline step (0.35–0.46 throughout). Claim (+0.24/+0.39 st) holds and understates it in this column. Day rim unchanged (sun in front), as claimed. Coat streaks visible at 1280. |
| 6 | **Texture quality** | 5 → 6 | Streak fbm along the body reads as hair direction in `ultra_lions/lion_close.png`; whisker pores on the face at 1280. Face still smoother than the flank. |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 6 → 7 | Rim at dusk; contact decal multiplies (below). |
| 9 | **Shadows** | 6 → 7 | Multiplying decal: `lions_dusk/lion_medium_dusk.png` crop (180, 150, 320, 205) 4× — R4 has a pale pink-grey halo along the belly line (190–260, 172–178) where the decal painted grey-brown over orange; R5 darkens the same ground without a hue change. Under-lion box (215, 180, 290, 192) vs beside (300, 180, 380, 192): −0.65 → −0.57 st, blue channel −12 → −6. |
| 10 | Reflections | 5 → 5 | Eye highlight kept; the eye now sits in a socket under a lid (`ultra_lions/lion_face.png`). |
| 11 | Color / atmosphere | 6 → 6 | |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 7 → 7 | |
| 14 | Detail density | 6 → 6 | |
| 15 | **Environmental integration** | 6 → 7 | Turf under the pride, decal that scales the ground, kopje mirrored in the pool behind the lions. |
| 16 | Visual cleanliness | 6 → 6 | Ear as a disc and the muzzle box are the seams now; the cheek crease is gone (`ultra_lions/lion_face.png`). |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **The head is a box with a disc for an ear.** `ultra_lions/lion_face.png` (260, 60, 760, 460): the muzzle is a rectangular block whose top face meets the brow plateau at a straight edge; the ear at (450–560, 100–210) is a flat leaf with a rim and no cup; the mouth is a painted line. At 1280 the lion's head is the least animal-like object in the game. Fix: `src/wildlife/lion/headspec.js` — round the muzzle's cross-section (rows lofted on a superellipse with exponent 2.5 instead of the box rows), carry the nasal bridge as a ridge that falls to the cheeks; build the ear as a cupped shell (two rows deep, 8 mm rim) with a dark inner face; give the mouth line 6 mm of geometry (a lower lip row). Head tris budget: +1 500 is enough.
2. **Day rim is absent because the day sun is in front.** `lions_day/lion_close.png`: outline at the same value as the interior. The rim term is scaled by how far behind the animal the sun is, so in every day framing it is zero and the day coat is the R4 suede. Fix: the `furRim()` `(1 − N·V)^6` term should keep a floor of 0.35 × its full weight regardless of sun side — velvet darkening and a sky-lit fringe exist in front light too — with the sky's horizon colour as the rim's light, not the sun's.
3. **Face texture smoother than the body.** `ultra_lions/lion_face.png`: forehead and cheek carry pores only; the flank carries streaks. Fix: extend the coat's streak fbm (`src/wildlife/lion/textures.js` ~204: `fbm(su * 60, sv * 10)` at 0.11 into the albedo; ~716: the 48:8 strand into the normal) onto the head atlas at 0.6 of those amplitudes, radiating from the nose.

**Regressions:** none.

**Must not regress:** the dusk rim; multiplying contact decal; body landmarks in the side view; eye highlight and lid.

---

## 8 Lion feet & gait

Walk strip: R4 `lions_walk_fixed/` vs R5 `lions_walk/`, 8 frames at 0.3 s past a world-fixed camera, 512×288.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | **Composition** | 6 → 5 | The new turf stands in front of the feet: tufts at x 230–260 and 290–310 sit on the ground line (row 181) between the camera and the paws in `walk_02`–`walk_06` (grid crops `/tmp/criticB/r5/feet_R5_0.png`, `feet_R5_1.png`). A strip about feet now hides one or two of them in five of eight frames. |
| 2 | Silhouette | 5 → 5 | |
| 3 | Geometry | 5 → 5 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | — → — | |
| 6 | Texture quality | — → — | |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 6 → 6 | |
| 9 | **Shadows** | 6 → 7 | The decal travels with the feet and multiplies the ground (family 7). |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 6 → 6 | |
| 12 | Animation | 6 → 6 | Gait unchanged. Coat-mask centroid 329 → 191 (R4, 137 px over seven steps) vs 332 → 191 (R5, 141 px). Lowest coat row 180–182 in both. |
| 13 | Physics / ground contact | 6 → 6 | Planted columns (lion pixels static between consecutive frames, rows 168–185) are the same in both strips: (299–306) held through `walk_05`–`07` (three frames), (221–228) through `walk_00`–`02`, (259–263) in `00`–`01` and `02`–`03` but not `01`–`02`. No drifting column, no sliding, no float; one paw re-plants on its own column with a one-frame gap (the R4 toe flicker, still there). |
| 14 | Detail density | 5 → 5 | |
| 15 | Environmental integration | 6 → 6 | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | 6 → 6 | Held columns jitter ≤ 1 px, both strips. |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Turf occludes the feet at the strip camera.** `lions_walk/walk_02.png`–`walk_06.png`: clumps at x 230–260 and 290–310, rows 165–185, sit between the camera and the planted paws. Fix: `tools/lions.mjs` walk view — raise the camera 0.25 m and pitch down 4°, or in `src/forest.js` the `extra` lawn pass (~3624) skip tufts within 1.2 m of the walk line (`reserved(x, z, 1.2)` along the path), which also matches a trodden track.
2. **Stifle still straight in swing.** `walk_03.png`, `walk_04.png` (grid crop): hind leg a single line from hip to paw. Fix: `src/wildlife/lion/pose.js` swing-phase shaping (~72–76, `SWING_FOLD` 0.45 is the wrist/pastern fold) — add a hind stifle flexion of 25° peaking at mid-swing, damped to 0 at contact.
3. **Paw re-plant flicker.** Column (259–263) present in `00`–`01`, gone in `01`–`02`, back in `02`–`03`: a toe clipping under the ground plane for a frame. Fix: the feet probe already lands "at machine precision"; the clip is the decal or the paw sole against the turf card — lift the paw contact target 6 mm and let the decal carry the contact.

**Regressions:** Composition 6 → 5 (turf across the paws in `walk_02`–`walk_06`, five of eight frames).

**Must not regress:** planted columns held 2–3 frames with ≤ 1 px jitter; the decal under the feet.

---

## 9 Lighting & atmosphere

**Re-judge (truck frames re-shot from `84c1e5e`).** No score moves. The numbers that depended on the truck's attitude are re-measured below on the re-shot frames: the dusk grille/bar hot spot (my former weakness 1) does not exist on the level truck — `truck_dusk/hero.png` grille p95 0.351 against sky p95 0.466, −0.41 st; bar p95 0.390, −0.26 st; `truck_dusk/front.png` lower third 0.0 % over sky p50 (R4 22.0 %) — so it is withdrawn and the changelog's dusk claim holds; the night ground medians on the `mainroad` (placed) and `forest` (heading-relative, skyline within 3 px of the pitched frame) cameras move by ≤ 0.002 and the `mainroad` beam pool by 0.012 (+3.30 → +3.29 st over the band) — the truck stood level on the mainline in both shots; the headlamp glare balls at the night `front` camera are larger than R4's and take the vacated slot in the weaknesses; `moving.flick` is 0.156 (family 2). Camp, fleet and lion numbers are as before.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1 | **Composition** | 6 → 7 | `truck_night/hero.png` has one hot object (the bar as pods, with the two lamps under it) where R4 had three (bar slab, moon halo, bloomed star). The night `front` camera no longer contains the lamp pool (it falls right of the frame; family 1). The moon is out of frame in every round-5 night frame (searched all of them, re-shot included, for compact sky blobs over 0.35; the candidates were the bar pods and a specular on the snorkel in `road.png`). |
| 2 | Silhouette | — → — | |
| 3 | Geometry | — → — | |
| 4 | Scale | — → — | Moon disc: **cannot check** — no frame contains it. The claim (glow 2.0 → 0.035, 0.5° disc, 30 486 → 1 738 px over 0.35) stands untested. |
| 5 | Materials | — → — | |
| 6 | Texture quality | 7 → 7 | Star field with the star cap, on the placed `mainroad` camera (same sky both rounds): rows 0–85, 9 blobs over 0.35, none ≥ 4 px, 22 over 0.2 (R4: 8 and 24, none ≥ 4 px over 0.35). The re-shot hero's patch of sky (rows 0–50, 40 % crowns) holds none over 0.35. Points, not discs. |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 6 → 7 | Night indirect is wired: `truck_night/mainroad.png` ground (0, 240, 640, 360) median 0.0110 → 0.0238 (claim 0.011 → 0.023 holds); road centre (250, 290, 450, 360) 0.0113 → 0.0239; `forest.png` verge L 0.0051 → 0.0156. Night sky brighter and bluer: `mainroad` horizon band (0, 95, 640, 115) median 0.0078 → 0.0240, mean sRGB (13, 20, 41) → (25, 40, 78), sat 0.68 both. Ground stays under the sky: mainroad −0.01 st vs the horizon band (was +0.49 — the ground had been *over* the band), hero fg (420, 300, 640, 360) −1.01 st, camp pad −0.40 st. Beam pool on `mainroad` (120, 150, 280, 200) median 0.185 → 0.235, +3.3 st over the band. Dusk lamps under the dusk sky (re-judge note). Bar pods, day fill under the fly, lanterns, fire, dusk crown rim: above. |
| 9 | **Shadows** | 6 → 7 | Fly pockets −4.1 → −3.2 st; tuft self-shadow; multiplying decal; door-mirror flank. Penumbra unchanged. |
| 10 | **Reflections** | 5 → 6 | Water hole mirrors the dome and the kopje; door mirror mirrors the world; clearcoat lobe on the bonnet. The pool's colour is wrong (family 5). |
| 11 | **Color / atmosphere** | 6 → 7 | Hills inside 0.72–0.92 on eleven of twelve ridge segments with sat ≤ 0.22; fire ground sat 0.42; night sky a saturated blue (hue 223°, sat 0.62–0.68) over a warm-grey ground (`mainroad` hue 320–340°, sat 0.10–0.14; hero fg hue 4°, sat 0.36) — moonlit ground should lean cool, this leans magenta; the dusk aureole in the haze band. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | — → — | |
| 14 | Detail density | 7 → 7 | |
| 15 | **Environmental integration** | 6 → 7 | Hills, plain and sky in one air; the row lanterns tie the fleet to the camp. |
| 16 | **Visual cleanliness** | 5 → 6 | Bar bloom 1 435 → 218 px over 0.5 in the hero bar box; no bloomed star; beam-slice discs gone; no dusk hot spot. Left over: the headlamp ellipses (488 + 309 px in the night hero, 1 584 + 1 325 px at the night `front` camera), lantern glare balls of 400–500 px in the fleet night frames. Held at 6 for those. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | Night hero 535 → 537 calls; programs 175 → 176; textures 294 → 292. |

**Top three weaknesses**

1. **Night ground hue.** `truck_night/mainroad.png` ground (0, 240, 640, 360) mean sRGB (44, 39, 42), hue 320°; `hero.png` fg (39, 26, 25), hue 4°; under a horizon band of (25, 40, 78). The wired `groundIndirect` at 1.4 carries the day albedo's warmth; moonlight and a blue sky dome should pull the ground to hue 220–250° at sat 0.1–0.2. Fix: `src/terrain.js` ground shader — multiply the night `groundIndirect` by the sky dome's horizon colour (`uSkyHor.rgb` normalised) instead of a neutral scalar; `src/palette.js` night grade: pull the shadow tint 4° toward blue.
2. **Headlamp glare balls at the night front camera.** `truck_night/front.png`: (332–379, 151–202) 1 584 px and (198–239, 187–237) 1 325 px over Y 0.5, 2 353 and 1 979 px over 0.35 — filled discs 47–64 px across at 9 m, larger than R4's 1 288 / 1 000 px, with nothing of the lens inside them; the same lens glow that makes the 488-px ellipse in the hero. The bar beside them is nine clean pods (505 px over 0.5 in (225, 65, 355, 115)), so the pods' recipe is the reference. Fix: `applyLampGlow(m.headlight, …)` in `src/vehicle/materials.js` ~897 — `core` 2.5 → 1.6, `coreExp` 1.0 → 1.8, `bleach` 0.6 → 0.4 (family 1, weakness 1); then the front's two blobs over 0.5 should each be under 600 px with a peaked centre.
3. **The moon is not in the evidence.** No round-5 frame shows it, re-shot frames included; the disc, corona and halo claims cannot be scored. Fix (tooling, not rendering): add a `moon` view to `tools/shots.mjs` at night — camera at the hero position, yawed to put the moon at (0.7 W, 0.25 H) — so the next round has it.

**Regressions:** none.

**Must not regress:** night ground under the horizon band; nine pods; dusk lamps and bar under the dusk sky (grille p95 ≤ sky p95); blue night sky at p50 ≈ 0.02–0.03; star field of points; fire sat ≤ 0.45.

---

## 10 Performance

Only category 18 applies; from `stats.json`. **Re-judge:** the truck and `ultra_night` lines are re-read from the re-shot sets' `stats.json` (`84c1e5e`); score unchanged.

| # | Category | R4 → R5 | Note |
|---|---|---|---|
| 1–17 | | — → — | |
| 18 | **Browser performance** | 6 → 6 | Truck lines re-read from the re-shot `stats.json` (`84c1e5e`, which carries fleet r4's one-program paint). Fast, 640×360, R4 → R5 per view: `truck_day/hero` 488 → 488 calls, 2.17 → 2.18 M tris, programs 174 → 175, textures 295 → 293; `front` 520 → 518; `rear` 605 → 656 (+51, the largest move, three hours alike: 668 → 720 dusk, 653 → 704 night; the pitched shot had +30 — the level truck's rear camera takes in more verge); `wheel` 457 → 458; `detail` 500 → 490; `interior` 518 → 516; `forest` 544 → 553; `road` 520 → 497; `mainroad` 620 → 611. Runtime 612 → 614 / 609 → 607 / 606 → 613. Programs +1 at fast (the claim "+2 at fast (176)" was true of `16028cf`; fleet r4 folded one back), textures −2. Ultra 1280×720 (re-shot): day hero 639, road 656, mainroad 733, forest 693, interior 778 calls, 3.4–4.6 M tris, 178–179 programs; night hero 661, road 677, 3.4 M tris, 179–180 programs. fps is the software rasteriser's and is not scored. No console errors beyond two Canvas2D `willReadFrequently` warnings per set. |

**Top three weaknesses:** (1) `rear` +51 calls at every hour — the new lawn `extra` scatter and the water-hole/kopje work land in the rear view's frustum; fix: fold the `extra` pass into the lawn species' existing instanced mesh instead of a second draw per chunk. (2) Programs 175 at fast, 180 at ultra — the lion coat, beam sheet and hole shader each add one; fix: share the beam sheet's program with the slice stack (one material, a `uSheet` branch). (3) Ultra `interior` 778 calls / 4.6 M tris — the cab kit draws every part; fix: merge the static cab parts into one geometry per material.

**Regressions:** none. **Must not regress:** ≤ 490 calls on the fast hero (488); 13 samplers on the terrain program (cannot be seen here; the gate counts it).

---

## Verdict

**Gate: pass.**

- **Lighting** is up in six of the nine families that can show it — Hero car 6 → 7, Fleet 6 → 7, Campground 6 → 7, Vegetation 6 → 7, Lions 6 → 7, Lighting & atmosphere 6 → 7 — and flat in Car glass, Road & terrain and Lion feet. **Shadows** up in five — Campground, Vegetation, Lions, Lion feet, Lighting (all 6 → 7) — flat in Hero, Glass, Fleet, Road. **Reflections** up in four — Hero 5 → 6, Car glass 5 → 7, Road & terrain 5 → 7, Lighting 5 → 6 — flat in Fleet and Lions (nothing in those frames reflects). No family is down on any of the three. The candidate beats the incumbent on the round's categories.
- **Drops:** two, both one point: Car glass Temporal stability 6 → 5 (`moving.flick` 0.099 → 0.156 on the re-shot run) and Lion feet Composition 6 → 5 (turf across the paws). Nothing drops by more than one.
- **Re-judge:** the truck, glass and ultra-night frames were re-shot from `84c1e5e` after the first set proved to have the body pitched 5.7° nose-down. On the level truck one score moved — Hero car Visual cleanliness 5 → 7 (was 5 → 6) — and two of my findings were the capture, not the car: the dusk grille/bar hot spot (now −0.41 / −0.26 st under the sky) and "the mirror frame has no bezel" (the mirror was not in the pitched frame at all). Both are withdrawn; the dusk claim holds, the mirror claim holds in the mirror frame itself. Re-running the `forest` acacia on the re-shot frames also overturned my Vegetation weakness 3 (the sun-side split is there once the halves are split at the trunk). The hills on the placed `mainroad` camera re-measure to the same ratios (L 0.92, mid 0.83, R 0.79). The gate result is unchanged.
- **Claims tested:** bar 1 449 → 417 px (mine 1 435 → 218 in the re-shot hero box, 12 → 9 pods) holds; nine peaks in the front view hold; night ground 0.011 → 0.023 holds (0.024); dusk lamp levels under the sky hold; the mirror aimed at the world holds (see 0.33 → 0.89); hills 0.67/0.55/0.63/0.80 → 0.80/0.71/0.75/0.72 hold within a few hundredths on the per-column method; side_shade see 0.68 → 0.93 holds (0.919); chamfered/siped lugs hold in the re-shot `wheel`; fire sat 0.756 → 0.449 holds; mess pockets 3.2 st holds (and is the builders' own "not met"); dusk crown rim holds; lion dusk rim holds and is larger than claimed; contact decal holds. **Do not hold:** the pool is neutral-warm grey (hue 17°, R > B), not blue-grey; the from-the-seat panes are flat against R4 (interior 0.789 → 0.799) though the exterior views cleared. (The day crown sun-side split, which I had listed here from the pitched frame, holds on the re-shot `forest` frame measured about the trunk: means +0.09 → +0.78 st.) **Cannot test:** the moon (out of every frame), wiper arcs and sill dust (below the pixel at 640), timber end grain, collision, the 13-sampler terrain program.

The round's one real trade is the hills: they are under the sky at last, and they are a plate — the crest is the darkest row and the body lightens toward the plain. Under the sky is the rubric's ask; the form is the next one.

**Weakest object in the game:** the lion's head. At 1280×720 (`ultra_lions/lion_face.png`) it is a rectangular muzzle block under a flat brow, with a flat leaf-shaped disc for an ear and a painted mouth. Lions r6 fixed the body (Silhouette and Geometry 5 → 6, a dusk rim, a decal that behaves) and left the head as it was. Second: the pride turf, khaki in hue and black at the root on saturated orange soil.

**Family means (R4 → R5):** Hero car 6.69 → 7.00 (6.94 before the re-judge); Car glass 6.53 → 6.67; Fleet 6.47 → 6.53; Campground 6.57 → 6.79; Road & terrain 6.33 → 6.53; Vegetation 5.92 → 6.23; Lions 5.79 → 6.29; Lion feet & gait 5.85 → 5.85; Lighting & atmosphere 6.00 → 6.70; Performance 6.00 → 6.00. Mean of the nine visual families 6.24 → 6.51 (was 6.50); all 126 scored cells 6.26 → 6.52 (was 6.51). (The HUD family of my round-4 report is not in this round's list; HUD plates landed in `9f44f70` and the three `hud.png` frames were looked at but not scored.)
