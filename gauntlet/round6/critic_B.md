# Critic B — round 6 (animation, physics, ground contact)

**Incumbent:** round 5, `shots/round5/` (build `0dc79bb`; truck, glass and ultra sets re-shot level from `84c1e5e`).
**Candidate:** round 6, `shots/round6/` (build `c2f0b83` per the brief; the HUD plate in `truck_day/hud.png` reads `build 776d40a · 2026-09-06 15:44Z` — see the questions at the end). Blind: no changelog, progress, consensus hand-off, builder report or `src/` was read; where a fix below names a module or parameter it is one I quoted in my own round-5 report, and the line numbers are that report's.

**Frames looked at:** every candidate frame beside its incumbent pair — `truck_day|dusk|night` (10 views × 3, plus the three new `moon` frames), `camp_day` (6), `camp_night` (4), `fleet` (12 × day/night), `lions_day` (7), `lions_dusk` (3), `lions_walk/walk_00..07` + 4 stills, `glass` (12 + `metrics.json`) — 113 pairs and 3 new frames — plus the ultra sets (`ultra_day` hero/road/mainroad/forest/interior, `ultra_night` hero/road, `ultra_camp`, `ultra_lions` close/face) and every `stats.json`. Composites, grids and 2–5× crops under `/tmp/critic-b/cmp/`; scripts under `/tmp/critic-b/` (`diffstats.py`, `pair.py`, `crop.py`, `fleetgrid.py`, `meas.py`, `hills.py`).

**How I measured:** PIL + numpy. Linear luma Y = 0.2126 R + 0.7152 G + 0.0722 B after sRGB → linear; stops = log2 of a ratio of medians unless a percentile is named; HSV of a box's mean sRGB; 4-connected blobs on thresholded masks (scipy `ndimage.label`). Boxes are (x0, y0, x1, y1) at the frame's own resolution, exclusive of x1/y1. **Hills:** per column, ridge row = first row (scanning down from row 30, or 92 on `camp_beyond`) where Y falls ≥ 6 % under the median of rows r−18..r−4 *and* the median of rows r+2..r+8 stays ≤ 0.94 × that sky; ratio = hill (r+2..r+8) / sky (r−18..r−4); columns whose sky window has std/mean > 15 % dropped. **Eyes:** box centred on the pupil; pale = V > 0.55 ∧ sat < 0.28, dark = V < 0.2, counted separately. **Lion rim:** per column the first outline step (|ΔY| > 0.10 scanning down), rim = rows +1..+3, interior = rows +7..+14; continuity = share of dorsal columns carrying ≥ +0.3 st and the longest gap. **Walk strip:** median of the eight frames as background; lion pixel = differs from it by > 0.10 in any channel; a planted paw = lion pixels in rows 172–185 that also do not change between consecutive frames (|Δ| < 0.05), clustered by column — at the new 2.2 m camera the walker's shadow falls across the tufts ahead of it and the median background is itself shadowed where the lion spent most frames, so the automatic clusters were checked against 3–4× crops with pixel rulers (`walk6_feet.png`, `walk6_ruler.png`, `walk6_maskvis.png`) and only clusters that a crop confirms as a paw are used below. **Glass:** the tool's `metrics.json`, `moving.flick` read against its new `flickBg`. **Foliage:** the round-5 0.6×-sky cap was dropped; crown pixels are the non-sky pixels of rows 30–110 by colour (day: B > 1.02 G ∧ Y > 0.5 × sky is sky; dusk: Y > 0.6 × sky is sky). **Performance:** `stats.json` only.

**Two caveats that run through the truck families.** (a) The brief says the pre-roll is deterministic and the truck sits at the same spot and pose in both rounds. The frames say otherwise: in `truck_*/forest.png` the placed camera shows the same acacia, the same ruts and the same skyline in both rounds, and the truck is *mid-corner, rolled, nose left* in round 5 and *straight in the ruts, level* in round 6; the truck-relative cameras (hero, front, rear, wheel, detail, road, interior) therefore look at different ground and sky (88–93 % of pixels differ by > 12/255 in `truck_day` hero/front/rear/road/detail, against 28–41 % in the `glass/` set, whose own cameras show the same truck at the same spot as round 5). The bar-pod line in `truck_night/hero.png` runs (238, 89) → (300, 72), a 15° screen slope, where round 5's was (234, 93) → (296, 70), 20°; the `mainroad` ridge rows move 3–6 px. Where a box had to move with the truck I say so; where the round-5 number depended on the truck's attitude I say which way the attitude moved it. (b) The `front` camera now sees the nose on-axis, so the headlamp pool that fell right of the frame in round 5 is in the frame at dusk and at night — and it is blown out (family 1, weakness 1). That is partly why the pool is visible and wholly why it is white.

---

## 1 Hero car

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Truck level and straight (caveat a); `front` on-axis; the two verge tufts that stood in front of the tyre in `truck_day/wheel.png` are gone from the frame. Capture placement, not art, both ways. |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | Nine pods at every hour (`truck_night/hero.png` bar peaks > 0.45 at x = 238, 245, 252, 259, 267, 275, 283, 292, 300 — nine). Lugs, sipes and now sidewall lettering resolve in `truck_day/wheel.png` (4× crop `/tmp/critic-b/cmp/wheel_contact.png`). |
| 4 | Scale | 8 → 8 | |
| 5 | Materials | 7 → 7 | Sidewall brand lettering is new and reads; the clearcoat still carries no horizon on the bonnet (`glass/ws_mid.png`, same camera both rounds: one soft sky lobe). |
| 6 | Texture quality | 7 → 7 | |
| 7 | Glass / transparency | 7 → 7 | Tool see-through flat on the same cameras: ws_close 0.925 → 0.934, ws_mid 0.874 → 0.877, side_sun 0.957 → 0.965, side_shade 0.919 → 0.914; veil 0.02–0.09; clip 0 %. |
| 8 | **Lighting** | 7 → 6 | The lamps now light the ground the near cameras see — what I asked for in round 5 — and at the `front` camera they light it white. `truck_night/front.png` lower third (0, 240, 640, 360): median Y 0.0159 → **0.4934**, 37 535 px over 0.5 (was 0); against a sky p50 of 0.026 the dirt is +4.3 st *over the sky*. `truck_dusk/front.png` lower third 0.0135 → **0.4392**, 30 951 px over 0.5, +0.35 st over a dusk sky of 0.346. The moonlit body is a gain: door panel (320, 155, 400, 195) 0.0158 → 0.0303 (+0.6 st over the sky top; was −0.36 st under it) and `ultra_night/hero.png` reads the whole truck. The headlamp ellipses are unchanged: 493 + 304 px over 0.5 in the night hero (was 488 + 309). Trade, scored down for the two blown frames. |
| 9 | Shadows | 7 → 7 | Contact shadow under every lug at the ground line (`wheel_contact.png`); tyre shadow on the boulder in `truck_day/road.png`. |
| 10 | Reflections | 6 → 6 | Mirror mirrors the world (family 2); clearcoat lobe soft as before. |
| 11 | Color / atmosphere | 7 → 7 | Night ground under the truck now blue-grey (hero fg hue 4° → 242°) — family 9. |
| 12 | Animation | — → — | The truck stands at the shot in every frame; the only motion evidence is the orange dust puff behind the rear wheel in `truck_dusk/mainroad.png`, present and alike in both rounds. Not scorable from a still. |
| 13 | **Physics / ground contact** | 8 → 8 | Tyres grounded at every camera I can check: `truck_day/wheel.png` 4× crop — lugs bite the laterite with a dark contact line, no gap; `truck_day/road.png` and `truck_night/road.png` — the front tyre straddles a boulder and sits on it, no float (I suspected a gap under the front-left tyre at row ~250 in the night road frame; the 4× crop `/tmp/critic-b/cmp/c_road_wheel.png` shows tread on rock); `truck_day/hero.png` front tyre shadow meets the tread. Ruts deeper and continuous under the truck in `truck_*/forest.png`. Nothing floats, nothing sinks. |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 7 → 7 | Mud on the tread matches the ruts. |
| 16 | **Visual cleanliness** | 7 → **5** | Two of the thirty truck frames have their lower third blown white: `truck_dusk/front.png` 48 216 px over 0.35 / 30 951 over 0.5 in (0, 240, 640, 360); `truck_night/front.png` 49 882 / 37 535 (round 5: 7 / 0 and 0 / 0; round 4's pool, which I scored 5, was 20 380 over 0.35). A textured bank with tufts silhouetted against it — lit ground plus a veil that carries little texture at the bottom edge (`/tmp/critic-b/cmp/front_bank.png`). Smaller versions at the other night cameras: `truck_night/hero.png` a lit slab at (17–70, 273–289), 407 px at Y 0.60, brighter than anything but the lamps; `truck_night/road.png` lower third 817 px over 0.5 (was 0); `ultra_night/road.png` 29 368 px over 0.35 in its lower third (was 2). Bar bloom, beam discs and dusk hot spot stay gone. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | `truck_day/hero` 488 → 486 calls, programs 175 → 175, textures 293 → 292; `rear` 656 → 658; `mainroad` 611 → 622; `moon` 510. |

**Top three weaknesses**

1. **The near-field lamp spill is a floodlight.** `truck_night/front.png` (0, 240, 640, 360): median Y 0.49, p95 0.71 — the dirt 3–9 m ahead of the bumper is the brightest surface in the frame, brighter than the lens glare (0.72 peak) is wide, and it is white at dusk too (0.44 median against a 0.35 sky). In round 5 I asked for spill at 0.15 of the beam so the dirt would read at Y 0.05–0.10; the frame shows the dirt at 0.5. Fix: whatever the spill light is (`src/vehicle/index.js` spot loop, the second `SpotLight` per lamp or the sheet's near term), take its night intensity down by 2.3 st (÷5) and its dusk intensity by 3 st (÷8), and give it `decay` 2 so the pool falls off with distance; target the `front` lower-third median at 0.06–0.10 at night and ≤ 0.25 × sky at dusk, with p95 ≤ 0.35. The lens glow itself (`applyLampGlow(m.headlight, …)` core 2.5 / coreExp 1.0 / bleach 0.6) is unchanged from round 5 and my prescription there (1.6 / 1.8 / 0.4) stands.
2. **The veil in the beam.** Same two frames: below row ~300 the bank loses its ground texture and becomes a cream field (`front_bank.png`; box (380, 320, 560, 360) median Y 0.54 dusk / 0.62 night with hf-std/mean 0.060 / 0.052, against 0.090 / 0.082 in the textured bank at (200, 250, 400, 300) above it) — a fog/dust sheet lit by the lamps and drawn over the ground, not the ground. Whether it is the beam sheet seen end-on or a dust volume, its density at the front camera is at least 3 st too high. Fix: clamp the sheet's accumulated alpha at 0.35 where the view ray is within 15° of the lamp axis (`wSlice`'s `smoothstep(0.80, 0.97, ax)` is the place; add `* (1 − smoothstep(0.85, 1.0, ax))` so a camera looking down the beam does not see the sheet at full weight), and keep the ground under it visible: p5 of the lower third should stay ≤ 0.03 at night (it is 0.13 now).
3. **Clearcoat still does not show at 640.** `glass/ws_mid.png` bonnet (120, 200, 280, 240): unchanged camera, one soft sky lobe, no horizon line in the paint in either round. Fix as round 5: `clearcoatRoughness` 0.15 → 0.06, `clearcoatNormalScale` 0.3 → 0.15 in `makePaintMaterial`.

**Regressions:** Lighting 7 → 6, Visual cleanliness 7 → 5 (both the `front` frames at dusk and night, numbers above).

**Must not regress:** nine pods; tyre contact at every camera (no gap under a tyre at 4×); ruts under the truck; door mirror; dusk grille and bar under the dusk sky; 486 calls on the hero.

---

## 2 Car glass

The `glass/` tool's cameras show the same truck at the same spot as round 5 (28–41 % of pixels differ, and those are the sky, the moonlit body and the mirror), so this family is like-for-like except `mirror.png`, whose eye moved (tool change 2).

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Mirror eye lower/outboard: the head sits at (300–440, 20–210) as before, more of the rack rail across its top corner; tool `cover` 65 → 9 % is the pane alone now. |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | |
| 4 | Scale | 8 → 8 | |
| 5 | Materials | 7 → 7 | |
| 6 | **Texture quality** | 6 → 7 | A wiper-arc boundary is now in the frame: `glass/ws_close.png` 2× crop (`/tmp/critic-b/cmp/wsclose.png`) shows a pale dust band along the top of the screen with a curved lower edge — the swept/unswept line — where round 5 had a uniform veil. Sill film still not resolvable. |
| 7 | Glass / transparency | 7 → 7 | See-through, R5 → R6: ws_close 0.925 → 0.934, ws_mid 0.874 → 0.877, side_sun 0.957 → 0.965, side_shade 0.919 → 0.914, interior 0.799 → 0.796, int_side 0.861 → 0.865, dusk_ws 0.845 → 0.862, rear_dust 0.857 → 0.862, night_int 0.927 → 0.965, night_ext 0.962 → 0.876 (the moonlit body behind the pane raised `bgLuma` 0.075 → 0.103; the pane is not dirtier — veil 0.021 → 0.027), moving 0.887 → 0.865 (veil 0.073 → 0.088). Clip 0 % everywhere. Flat. |
| 8 | Lighting | 6 → 6 | |
| 9 | Shadows | 6 → 6 | |
| 10 | Reflections | 7 → 7 | The pane still holds sky, a far crown, laterite and the green flank (4× crop `/tmp/critic-b/cmp/mirror_pane.png`); the mirror's sky vs the window's sky (weakness 2) closed a little: sky pixels in the pane (mask B > R + 0.04, Y > 0.15) mean sRGB (137, 152, 179) → (127, 145, 174), sat 0.23 → 0.27, median Y 0.318 → 0.289; the sky through the door glass (210, 15, 330, 45) (167, 172, 183) → (153, 163, 182), sat 0.09 → 0.16, Y 0.407 → 0.363. Pane vs window −0.35 → −0.33 st; saturation ratio 2.7× → 1.7×. |
| 11 | Color / atmosphere | 7 → 7 | |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | — → — | |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 7 → 7 | |
| 17 | **Temporal stability** | 5 → 6 | Tool `moving.flick` 0.156 → **0.095**, and the tool now reports the background's own flicker, 0.110: the pane shimmers *less* than what is behind it (`flickRatio` 0.87). Round 4's 0.099 is recovered. `int_side` 0.030 → 0.029, `interior` 0.015 → 0.016, `night_int` 0.013 → 0.017 (ratio 0.98). The one ratio over 1 is `mirror` at 4.4 — 0.0083 against a background of 0.0019, i.e. the reflection moves and the bezel does not; absolute 0.008 is below anything visible. |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **The mirror's sky is still not the window's sky.** Numbers above: −0.33 st darker and 1.7× as saturated as the sky beside it. The pane's reflected sky is the environment cube; the window's is the dome with its haze. Fix as round 5 (`applyMirrorHorizon`: mix the sky half toward the fog colour by `0.7 × (1 − smoothstep(0, 0.25, mhUp))`, `uMhSky` 1.15 → 1.0); target within 0.1 st and 0.05 of saturation.
2. **A floating disc in the mirror.** `glass/mirror.png` 4× crop: a far acacia crown mirrors as a dark lens-shaped disc at about (423–438, 84–89) with no trunk under it and the horizon running through it — it reads as an object in the sky. The same disc is in round 5's pane. Fix: the mirror's horizon composite drops the far cards' trunks (below its horizon line); either draw the far tree row with trunks into the mirror's ground half or fade crowns that sit within 4 px of the composite horizon.
3. **Sill dust is below the pixel.** `glass/ws_close.png`: the arc reads now, the sill film does not (bottom 20 px of the pane at the same veil as its middle, 0.046 both rounds). Fix as round 5: lift the `low` sill term to 3× the top rail's weight and take the `settle` floor 0.25 → 0.12.

**Regressions:** none.

**Must not regress:** `moving.flick` ≤ 0.10 with `flickRatio` < 1; see-through ≥ 0.87 on the four exterior day views; the mirror as a mirror; 0 % clip.

---

## 3 Fleet

Fleet materials are in these frames (tool change 4): changes are real.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 7 → 7 | |
| 4 | Scale | 7 → 7 | |
| 5 | **Materials** | 6 → 7 | Chrome is chrome: `fleet/suv_0_day.png` bumper (115, 192, 210, 212) median Y 0.074 → 0.336 with a sky-blue band along its top face and a dark under-face (3× crop `/tmp/critic-b/cmp/fleet_suv_bumper.png`). Alloy and aged paint I could not separate from round 5's at 480 wide; the bumper is the evidence. |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | 6 → 6 | |
| 8 | Lighting | 7 → 7 | Row lanterns light the row as before; the far end is still dark (supply-truck body ~0.015, expedition ~0.013 at night). The ground is now over the sky in ten of twelve night frames (below) — a change in the night rig, not the fleet; scored in family 9. |
| 9 | Shadows | 7 → 7 | |
| 10 | **Reflections** | 5 → 6 | The sky is in the bumper (above). Nothing else in the frames resolves a reflection at 480 wide. |
| 11 | Color / atmosphere | 7 → 7 | Night ground hue in the fleet frames (rows 200–270): round 5 hue 0–27° at sat 0.14–0.45; round 6 hue 308–359° (magenta) at sat 0.07–0.20 on eleven vehicles and 218° (blue) on the trailer. Cooler and less saturated but not yet the blue the truck frames now have (family 9). |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 7 → 7 | Every wheel on the pad with its shadow under it; the trailer's jockey wheel and stands touch. |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 7 → 7 | Lantern glare balls: `safari-jeep_0_night.png` (228–263, 134–157) 479 px over 0.5, peak 0.76, still on the bonnet (was 461); `safari-jeep_1` 550 → 376; `safari-jeep_2` 687 → 268 px; new balls in `supply-truck_0_night.png` (37–64, 85–102) 350 px and `motorcycle_0_night.png` (186–206, 98–120) 349 px. Held at 7 as before: they read as lamps. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **The lantern glare still sits on the jeep.** `fleet/safari-jeep_0_night.png` blob (228–263, 134–157), 479 px over 0.5 on the bonnet of a jeep whose body sits at ~0.06. Fix as round 5: `rowLamps` `height` 3.0 → 3.8 and `lampGlass.emissiveIntensity` 5.0 → 2.4 × lvl so only the core passes the night bloom threshold (2.0).
2. **Night ground over the sky in the fleet frames.** Ground (rows 200–270) vs sky (rows 5–40), R5 → R6: camper −0.76 → −0.06 st, expedition −2.10 → −1.26, motorcycle +0.19 → +1.11, pickup +0.14 → +1.63, ranger −0.72 → +0.03, jeep_0 −0.28 → +1.13, jeep_1 −0.47 → +1.18, jeep_2 −0.13 → +1.43, supply −0.94 → +0.11, suv −0.95 → −0.05, **trailer +0.60 → +2.88**, utility +0.63 → +2.00. `trailer_0_night.png` has no lantern in it and its pad reads Y 0.114 under a sky of 0.016 — a snowfield. Fix: family 9, weakness 2 (the moon/indirect ground term is 1.5–2 st too strong relative to the sky it is lit by).
3. **Far end of the row unlit.** `supply-truck_0_night.png` body ~0.015, `expedition-truck_0_night.png` ~0.013 while the pad around them is 0.015–0.008 — the vehicles are the same value as the dirt. Fix as round 5: a third `rowLamp` at u −2, or amber marker lamps on the cabs.

**Regressions:** none.

**Must not regress:** chrome gradient on the SUV bumper (top face ≥ 0.3, under-face ≤ 0.1); jeep_0/jeep_2/utility lit at night.

---

## 4 Campground

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 2 | Silhouette | 7 → 7 | |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 7 | |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 7 → 6 | The fly no longer shades the floor: `camp_day/camp_mess.png` shaded floor (200, 200, 330, 235) median Y 0.120 → **0.230** against sunlit dirt L (0, 240, 120, 288) 0.339 → 0.346: **−1.50 → −0.59 st**. A 6 m canvas at noon at −0.6 st is not shade. Night: gate pad (60, 200, 452, 288) 0.0210 → 0.0247 while the horizon band (0, 60, 512, 80) fell 0.0204 → 0.0157 — pad vs band **−0.03 → +0.65 st**, over the sky. The fire's pool on the ground fell −1.4 st (3 m box (230, 200, 330, 220) 0.219 → 0.082). Two of three are the wrong direction for the hour. |
| 9 | **Shadows** | 7 → 6 | Fly shadow: column 255–265, 10–90 % edge width 16 → 35 rows, but the step it crosses is 0.082 → 0.395 in round 5 and 0.224 → 0.355 now — a soft edge on a shadow that is only 0.65 st deep (2× crop `/tmp/critic-b/cmp/mess_shade.png`: the chairs cast readable shadows, the fly casts a tint). Pockets under the tables did reach the target: canopy interior (150, 150, 400, 240) p5 −3.22 → −2.48 st, p2 −4.11 → −3.53 st under the sunlit pad — because the whole floor came up, not because the pockets opened. |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 7 → 7 | Fire ground sat at 3 m 0.42 → 0.34; 8 m box hue 20° → 330° (the fire's warmth no longer reaches it; the moon's grey does). Night pad hue 334° → 229°, blue — right direction. Canopy top at night hue 225° → 224°, sat 0.63 → 0.50. |
| 12 | **Animation** | 6 → 6 | Flame box (270, 150, 310, 205): 529 → **116** px over 0.5, p95 0.60 → 0.50, peak 0.70 → 0.57; whole frame 878 → 138 px over 0.5. The over-blend body I flagged is gone and a smoke plume rises from the pit (`camp_fire_night.png` rows 60–150 over the fire). The flame is now small and its light on the ground is −1.4 st down; a still cannot judge the flicker. Held. |
| 13 | Physics / ground contact | 7 → 7 | Tables, chairs, drums and the pole bases sit on the pad with their shadows under them. |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 7 → 7 | |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **The fly casts no shadow.** `camp_day/camp_mess.png` floor under the fly −0.59 st vs the sunlit pad (round 5 −1.50, round 4 −3.1). The day fill was doubled without the sun being taken out from under the canvas. Fix: in `src/campground/index.js` the mess lamp's `day` block — intensity 12 → 5 — and, if the pad's `envMapIntensity` mask I proposed went in, `mix(1.0, 1.7, inFly)` → `mix(1.0, 1.3, inFly)`; target the floor at −1.6 ± 0.2 st with the table pockets at −2.5 st (they are there now and would go to about −3.0).
2. **The fire went out of the ground.** `camp_night/camp_fire_night.png` ground at 3 m 0.219 → 0.082, at 8 m 0.080 → 0.042 with hue 20° → 330°: the fire's pool is now under the moon's, and the camp sits in grey. Flame 529 → 116 px over 0.5 is the right size; the light was cut with it. Fix: `src/campground/fire.js` — keep the sprite alpha change and restore the point light: `uGain`/the fire `PointLight` intensity back up 1 st (×2), `distance` 12, so the 3 m ground reads 0.15–0.18 at sat ≤ 0.42 and the 8 m ground keeps a warm hue (≥ 15°).
3. **Night pad over the horizon band.** `camp_gate_night.png` pad +0.65 st over the band (was −0.03). Fix: family 9, weakness 2.

**Regressions:** Lighting 7 → 6 (fly floor −0.59 st; pad over the band), Shadows 7 → 6 (fly shadow 0.65 st deep).

**Must not regress:** table pockets p5 ≤ −2.5 st; fire flame ≤ 200 px over 0.5; both gate lanterns; smoke plume.

---

## 5 Road & terrain

Frames: `truck_*/road`, `mainroad`, `forest`, `camp_day/camp_beyond`, `lions_day/lion_far`, `lion_pride` (water hole), `fleet/pickup_0_day` (hills). The `mainroad` camera moved 3–6 rows with the truck (caveat a); ridge ratios are per-column and do not depend on it.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | |
| 2 | Silhouette | 7 → 7 | Ridge lines the same shape (skyline row medians per segment within the camera shift). |
| 3 | Geometry | 6 → 6 | |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 7 → 7 | |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 6 → 6 | Hills still a plate: `truck_day/mainroad.png`, 20 sampled columns, body (rows +12..+22) paler than crest (+2..+8) in 17 of 20 (round 5: 20 of 20); e.g. x = 170 crest 0.80, body 0.96 of the sky. |
| 9 | Shadows | 6 → 6 | |
| 10 | Reflections | 7 → 7 | The pool is pixel-identical: `lion_pride.png` clear part (340, 116, 400, 124) mean sRGB (156, 148, 145), hue 17°, sat 0.07, −0.19 st under the sky over the ridge, +0.77 st over the mud ring, in both rounds. Still warm-neutral, not sky. At dusk (`lion_pride_dusk.png` band (200, 122, 480, 131)) p95 0.45–0.46 against a sky of 0.41, both rounds. |
| 11 | Color / atmosphere | 7 → 7 | Ridge/sky with the persist rule, R5 → R6: `mainroad` L 0.853 → 0.891, mid 0.814 → 0.851, R 0.780 → 0.895; `lion_far` L 0.757 → 0.829, mid 0.721 → 0.808, R 0.749 → 0.803; `pickup_0_day` mid 0.829 → 0.896; `camp_beyond` L 0.736 → 0.796, mid 0.746 → 0.749, R 0.780 → 0.827. Every segment moved toward the sky by 0.00–0.11; ten of ten inside 0.72–0.92, two of them (0.895, 0.896) on the ceiling. Hazier, still under the sky. `lion_far` far-plain band (0, 117, 150, 129) vs the sky over it (0, 20, 150, 30): −0.24 → −0.45 st. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | 7 → 7 | Ruts hold the truck's wheels in `truck_*/forest.png` and `truck_day/mainroad.png` (both rounds); the boulder under the front tyre in `road.png` takes the tyre. |
| 14 | Detail density | 6 → 6 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | `mainroad` 611 → 622 calls, `road` 497 → 496; programs 176 flat. |

**Top three weaknesses**

1. **The pool mirrors a warm grey, not the sky.** Unchanged from round 5 to the pixel; the fix I gave (tint the murk by `uSkyHor`, Fresnel floor 0.25 → 0.35, halve the haze mixes in the reflection path) has not been applied. Target B ≥ R in the clear pool.
2. **Hills are a flat plate.** Body paler than crest in 17/20 columns. Fix as round 5: `hillFar = 1` for the hill mesh so the whole hill keys to `hillSkyUp × hillTone`, `hillFog` floor 0.90/0.94 → 0.82/0.90.
3. **Two ridge segments on the 0.92 ceiling.** `mainroad` R 0.895 and `pickup` mid 0.896; the hills drifted 0.04–0.11 toward the sky this round with the darker night sky's daytime sibling (haze). Fix: hold the ridge at 0.80–0.85 — `hillTone` × 0.94 — before the next haze change pushes them over.

**Regressions:** none.

**Must not regress:** ridge/sky inside 0.72–0.92 on every segment; the pool under the sky and over the mud; ruts under the truck.

---

## 6 Vegetation

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | Silhouette | 6 → 6 | |
| 3 | Geometry | 5 → 5 | |
| 4 | Scale | 7 → 7 | |
| 5 | **Materials** | 6 → 7 | Straw transmits: in `lions_dusk/lion_close_dusk.png` and `truck_dusk/forest.png` the backlit tufts glow near-white against the ground; day crowns lighter (below). |
| 6 | Texture quality | 6 → 6 | |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 7 → 8 | Crowns are no longer buried. `truck_day/forest.png` rows 30–110, non-sky pixels: median −2.81 → **−1.58 st** under the sky, p95 +0.21 → +0.51 st, share under Y 0.02 38 → 28 %. `truck_dusk/forest.png`: median −3.38 → **−1.92 st**, p95 −1.10 → −0.82 st, under 0.02 39 → 15 % — the dusk crown is a translucent canopy with a rim, not a cut-out (composite `/tmp/critic-b/cmp/truck_dusk__forest.png`). The truck moved (caveat a) but the placed camera and its acacia did not. |
| 9 | Shadows | 7 → 7 | Tuft root shade is now a half-stop, not three: `lion_pride.png` lower third p10 Y 0.021 → 0.089; dark tuft pixels (hue 45–110°, V < 0.35) 1.22 → 0.10 %. That is what I asked for ("roots a half-stop under the tips"); the contact under each clump is still there as a soft base (4× crop `/tmp/critic-b/cmp/turf.png`). Held. |
| 10 | Reflections | — → — | |
| 11 | **Color / atmosphere** | 6 → 7 | The lie-up is straw: `lion_pride.png` lower third straw mask (g ≥ 0.8 r, g > 1.2 b) 20.5 → **44.0 %**, pale (V > 0.5, sat < 0.4) 4.9 → 19.6 %, khaki 16.0 → 25.2 %, soil 54 → 52 %; box sat 0.54 → 0.44, median Y 0.150 → 0.194. `lion_side.png` lower third sat 0.54 → 0.42. The soil under it is still laterite (hue 31–35°, sat 0.42–0.44). |
| 12 | **Animation** | — → 4 | First scored, on the walk strip: over the seven 0.3 s intervals of `lions_walk/walk_00..07`, the foreground tufts (rows 200–288, all columns) change **0.00 %** of their pixels by > 12/255, and so does the far field (rows 0–100). No wind, no sway, nothing breathes — the same in round 5's strip, so this is not a drop; it is the first time the strip is read for it. |
| 13 | Physics / ground contact | 6 → 6 | Straw litter lies on the soil between the clumps (`turf.png`), which ties them down; clump bases still meet the ground at a hard line. |
| 14 | Detail density | 7 → 7 | |
| 15 | **Environmental integration** | 6 → 7 | Litter on the pad, straw of one colour from the lie-up to the far plain, the lions' colour in the grass. |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Nothing moves.** The strip's tufts are pixel-static across 2.1 s. Fix: a vertex wind on the tuft and grass cards — `sin(time × 1.3 + worldX × 0.4) × 0.03 × height²` in the card's vertex shader (`src/forest.js` grass material), with a 0.5 Hz gust envelope — enough that a 20-px tuft moves 1–2 px between strip frames; cap it so a planted paw's contact is not hidden by a swaying blade.
2. **Soil under the straw is still laterite.** `lion_pride.png` lower third soil pixels hue 31–35°, sat 0.42 — the straw sits on red. Fix as round 5: the `uPride` terrain term inside the 7–11 m ring, soil albedo toward (0.62, 0.55, 0.48) × 1.15.
3. **Clump bases are a hard line.** `turf.png` 4×: each clump meets the soil on one row. Fix: the tuft card's AO term (`uTuftAO`, now capped) — add a 2-px ground darkening decal under each clump at 0.7 alpha, radius 0.6 × the clump's width, so the base sits *in* the dust.

**Regressions:** none (Animation is a first score).

**Must not regress:** straw ≥ 40 % of the lie-up's lower third; crowns ≤ 2 st under the sky by day and dusk; the tuft base shade.

---

## 7 Lions

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | |
| 2 | **Silhouette** | 6 → 7 | The head outline has a muzzle, a brow and a cupped ear (`ultra_lions/lion_face.png`, `/tmp/critic-b/cmp/ultra_face.png`); the body landmarks of round 5 hold in `lion_side.png`. |
| 3 | **Geometry** | 6 → 8 | The box is gone. At 1280 the muzzle is a rounded block with a nasal ridge falling to the cheeks, the nostrils sit in a nose pad, the eye sits under a lid with a brow shadow over it, the ear is a cup with a dark inner face and a rim, and the mouth line sits over a chin. That was my "weakest object in the game" in round 5; it is an animal now. |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | 6 → 6 | Dusk rim present along the neck and back in `lion_close_dusk.png` (3× crop `/tmp/critic-b/cmp/dusk_rim.png`). Continuity on my column method: dorsal columns carrying ≥ +0.3 st 46 % → 33 %, median +0.26 → +0.12 st, longest gap 13 → 40 columns (337–376, over the withers). The lion's pose differs between the rounds (turned toward the camera, back foreshortened), so this is not like-for-like — a question below, not a drop. |
| 6 | **Texture quality** | 6 → 7 | Whisker pores on the muzzle and streaks radiating from the nose onto the cheeks at 1280 (`ultra_face.png`); the face is no longer smoother than the flank. |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 7 → 7 | |
| 9 | Shadows | 7 → 7 | Decal multiplies (walk strip: paw column profile darkens 0.25–0.5× the ground with no hue shift). |
| 10 | Reflections | 5 → 5 | Eye unchanged: box (637, 206, 701, 254) on `ultra_lions/lion_face.png`, 3 072 px — pale 43 → 40, dark 849 → 879, max Y 0.673 → 0.668, one highlight. Amber iris, round pupil, wet. The eye still stands proud of the socket (5× crop `/tmp/critic-b/cmp/eyes.png`). |
| 11 | Color / atmosphere | 6 → 6 | |
| 12 | **Animation** | — → 6 | First scored. Rest poses: `lions_day/lion_close.png` a sphinx crouch, forelegs forward and paws flat; `lion_far.png`/`lion_medium.png` a lion on its side with the hind legs out; the resting lion in the walk strip is the sphinx. Over the strip's 2.1 s the resting lion changes 0.43 % of its pixels (box (20, 60, 140, 130)) — something moves (a breath or the tail), barely. No head turn, no ear flick in eight frames. |
| 13 | Physics / ground contact | 7 → 7 | Bellies and elbows on the ground with the decal under them; no paw floats in any of the ten still frames. |
| 14 | **Detail density** | 6 → 7 | Pores, lid, ear cup, chin, straw around the animals. |
| 15 | Environmental integration | 7 → 7 | |
| 16 | **Visual cleanliness** | 6 → 7 | The muzzle-box edge and the disc ear — round 5's seams — are gone; no crease on the cheek. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **The eye is a ball on the face.** `eyes.png`: the globe bulges past the lid margin by ~3 px at 1280 on both rounds; the lid is a thin rim, not a fold. Fix: `src/wildlife/lion/headspec.js` — sink the eye socket 4 mm and thicken the upper lid row to 3 mm with a 1.5 mm overhang, so the globe reads as set in; keep the highlight.
2. **The resting lions are statues.** 0.43 % of pixels move in 2.1 s. Fix: an idle layer in `src/wildlife/lion/pose.js` — a 0.25 Hz chest rise of 6 mm, an ear flick every 4–8 s (random phase), a tail-tip sweep of 15° at 0.4 Hz — so any two strip frames of a resting lion differ.
3. **Day rim absent** (unchanged from round 5): `lions_day/lion_close.png` outline at the interior's value. Fix as before: a 0.35 floor on the `furRim()` term with the sky's horizon colour as its light.

**Regressions:** none.

**Must not regress:** the head (muzzle, ear cup, lid, chin); eye highlight; dusk rim; decal; straw under the pride.

---

## 8 Lion feet & gait

Strip: round 6 `lions_walk/walk_00..07`, 8 frames at 0.3 s, 512×288, camera at 2.2 m looking down 15° (tool change 1). The round-5 strip stood at 1.3 m and is not comparable frame-to-frame; scored on its own terms against the same scale.

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | **Composition** | 5 → 7 | Feet visible in all eight frames — no tuft between the camera and a planted paw (grid `/tmp/critic-b/cmp/walk6_grid.png`, crops `walk6_feet.png`). The resting lion at left gives the walker scale; the pool and kopje sit behind. Round 5's occlusion (five of eight frames) is gone with the camera height. |
| 2 | **Silhouette** | 5 → 6 | Legs read as jointed: elbow and wrist on the fore, stifle and hock on the hind, at every phase. Paws are tapered cones with a pale tip. |
| 3 | Geometry | 5 → 5 | Legs are still tubes — no thigh mass against the hip, no carpal pad, no toes (4× crops). |
| 4 | Scale | 7 → 7 | |
| 5 | Materials | — → — | |
| 6 | Texture quality | — → — | |
| 7 | Glass / transparency | — → — | |
| 8 | Lighting | 6 → 6 | |
| 9 | Shadows | 7 → 7 | The body shadow is an ellipse under the belly that falls across the tufts ahead (`walk6_maskvis.png`); the paw decal is under every planted paw. Column profile through the planted hind paw (`walk_01`, cols 322–350): rows 168–180 at 0.32–0.52 of the background (paw + decal), row 182 at 0.71, background by row 184; through the planted fore paw (`walk_06`, cols 168–192): rows 172–180 at 0.24–0.40, row 182 at 0.87, background at 184. The decal is 2–3 px tall at this camera — small; weakness 3. |
| 10 | Reflections | — → — | |
| 11 | Color / atmosphere | 6 → 6 | |
| 12 | **Animation** | 6 → 7 | The swinging hind leg flexes: in `walk_01`, `walk_03`, `walk_05`, `walk_07` the trailing hind limb is a Z — stifle forward, hock back, paw hanging toe-down (`walk6_feet.png` right column) — where round 5's was one line from hip to paw. The swinging foreleg folds at the wrist with the paw trailing (`walk_01`, `walk_03`). Head carried low and forward, neck level with the withers; tail hangs in a curve with the tuft clear of the ground and changes its angle from frame to frame. Stride: coat-mask centroid 334 → 192 over seven steps (142 px), steps 21, 16, 25, 20, 27, 16, 18 px — the speed wobbles ±25 % (weakness 2). |
| 13 | **Physics / ground contact** | 6 → 7 | Planted paws hold their pixel: the hind paw at columns 329–342 stays within 2 px through `walk_00`–`walk_02` (three frames); the fore paw at 172–185 through `walk_05`–`walk_07` (three frames, ≤ 5 px at a tuft edge); the hind paw at 287–307 through `walk_05`–`walk_07`. Lowest coat row 179–182 in every frame — no float, no sink. No sliding column. The round-5 re-plant flicker (a paw present, absent, present on one column) does not recur on any paw I could follow; the automatic clusters flagged one at x ≈ 252, which the crops show to be a tuft edge in the walker's shadow, not a paw. |
| 14 | Detail density | 5 → 5 | |
| 15 | **Environmental integration** | 6 → 7 | The shadow crosses the tufts and the decal darkens straw and soil alike; the walker overlaps the resting lion in `walk_06`–`walk_07` with no visible sorting fault at 1×. |
| 16 | Visual cleanliness | 6 → 6 | |
| 17 | Temporal stability | 6 → 6 | Held columns jitter ≤ 2 px; the background is pixel-static (0.00 % change in rows 0–100 and 200–288 between any two consecutive frames). The stride wobble is the only temporal fault. |
| 18 | Browser performance | — → — | |

**Top three weaknesses**

1. **Legs are tubes with cones for paws.** `walk6_feet.png`: no thigh against the hip, the hind leg a bent pipe of one diameter from hip to hock, the paw a taper with a pale tip and no toes; the fore paw is the same taper. Fix: `src/wildlife/lion/geometry.js` leg loft — thigh row at 1.6× the hock diameter tapering to 1.0× at the hock; paw as a flattened pad 1.3× the cannon width with four toe bumps (two rows, +600 tris per leg); the walk's flexion is right and would show on a leg with mass.
2. **Stride speed wobbles ±25 %.** Centroid steps 21, 16, 25, 20, 27, 16, 18 px per 0.3 s — a 16-px step follows a 25–27-px one twice. A walk at a steady pace should move the trunk within ±10 %. Fix: `src/wildlife/lion/pose.js` — the trunk's forward motion is tied to the stance foot's phase and the two hind stances overlap unevenly; drive the root translation from a constant speed and let the feet plant to it (the probe already lands them), or symmetrise the left/right stance durations.
3. **The paw decal is 2–3 px at 15°.** Profile above: the darkening under the planted paw returns to the background two rows under the paw tip. A 0.3 m contact decal seen at 15° at this range would span ~6 px. Fix: decal radius 0.15 → 0.25 m with the multiply held at 0.5× at the centre falling to 1.0× at the edge, so the paw sits in a visible shadow pool as the body does.

**Regressions:** none.

**Must not regress:** planted paws held ≥ 3 frames within 2 px; hind flexion in swing; feet unoccluded at the strip camera; static background.

---

## 9 Lighting & atmosphere

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | The moon is in the frame at last (`truck_night/moon.png`, disc at (442–447, 64–68) among stars and a cloud wisp; a tower at right). The night `front` camera contains its subject — and the subject is white (family 1). |
| 2 | Silhouette | — → — | |
| 3 | Geometry | — → — | |
| 4 | **Scale** | — → 7 | Moon disc 6 × 5 px at 640 wide — about 0.5° at this lens; 23 px over 0.35, peak 0.83. Right size; it reads as the brightest star rather than a moon because nothing in the disc resolves (weakness 3). New; no incumbent. |
| 5 | Materials | — → — | |
| 6 | Texture quality | 7 → 7 | Stars are points: `truck_night/mainroad.png` rows 0–85, 4 blobs over 0.35 (none ≥ 4 px), 11 over 0.2 — half round 5's 9 / 22 — the field is thinner under the darker sky. Points, not discs. |
| 7 | Glass / transparency | — → — | |
| 8 | **Lighting** | 7 → 7 | Three moves. The night ground is blue (Color, below). The moon lights the truck: `truck_night/hero.png` door panel 0.0158 → 0.0303, +0.6 st over the sky top (was −0.36 st under); at 1280 the truck reads as a lit object for the first time. The sky darkened by 0.5 st everywhere (mainroad sky profile rows 0–110: 0.018–0.032 → 0.013–0.020, same shape) while the ground did not (mainroad ground (0, 240, 640, 360) 0.0238 → 0.0249), so the ground is over the horizon band in every night frame: mainroad −0.01 → **+0.58 st**, camp pad −0.03 → +0.65 st, fleet frames +0.0 to +2.9 st (family 3). Beam pool on `mainroad` 0.235 → 0.182 (−0.37 st; the truck moved 3–6 rows). The lamp spill at the near cameras is a floodlight (family 1). Gains and losses in equal measure — held. |
| 9 | Shadows | 7 → 7 | Fly shadow lost (family 4); tuft roots softened by design; decal under every paw; body shadow across tufts. |
| 10 | Reflections | 6 → 6 | Chrome in the fleet gained; the pool did not move; the mirror's sky closed a little. |
| 11 | **Color / atmosphere** | 7 → 8 | Night ground is moonlit, not magenta: `truck_night/mainroad.png` ground hue 320° → **226°**, sat 0.11 → 0.24, mean sRGB (44, 39, 42) → (43, 46, 56); `hero.png` fg (420, 300, 640, 360) hue 4° → 242°; `forest.png` verge 3° → 222°; camp pad 334° → 229°. The night sky stays blue (hue 223–224°, sat 0.50–0.57, p50 0.020 at the top of the hero frame). Dusk aureole and haze band unchanged. Hills hazier but inside the band. |
| 12 | Animation | — → — | |
| 13 | Physics / ground contact | — → — | |
| 14 | Detail density | 7 → 7 | |
| 15 | Environmental integration | 7 → 7 | |
| 16 | **Visual cleanliness** | 6 → 5 | Added to the leftover headlamp ellipses (493 + 304 px) and the fleet's lantern balls (479 px on the jeep): the blown `front` bank at dusk and night (30 951 / 37 535 px over 0.5), the lit slab in the night hero (407 px at 0.60), and the day `moon.png` frame, which looks at the sun and is a 79 141-px sheet over 0.35 — 64 560 px over 0.5, 28 % of the frame — with no disc in it. |
| 17 | Temporal stability | — → — | |
| 18 | Browser performance | 6 → 6 | Night hero 537 → 533 calls; programs 176; textures 292 → 291. |

**Top three weaknesses**

1. **The lamp bank at the front camera** — family 1, weaknesses 1 and 2. Numbers: `truck_night/front.png` lower third median 0.49 (+4.3 st over the sky); `truck_dusk/front.png` 0.44 (+0.35 st over the dusk sky).
2. **Night ground over the horizon band everywhere.** `truck_night/mainroad.png` ground 0.0249 vs band (0, 95, 640, 115) 0.0166: +0.58 st (round 5 −0.01); camp pad +0.65 st; `fleet/trailer_0_night.png` +2.88 st, `utility_0_night.png` +2.00. The sky came down 0.5 st and the moon term did not follow it. Fix: the night `groundIndirect` (1.4 in round 5) scaled by the same factor as the sky — ×0.7 — and the moon's diffuse on the terrain ×0.6; target the mainroad ground at −0.3 to −0.1 st under its horizon band with the blue hue kept (hue 220–240°), and the fleet pads ≤ +0.5 st.
3. **The moon is a bright star.** `truck_night/moon.png` disc 6 × 5 px, peak 0.83, no limb, no maria; corona: Y 0.080 at r = 3 px, 0.037 at r = 10, 0.026 at r = 15, 0.011 at r = 60 (sky 0.008) — a soft +1.7 st halo out to 15 px that is the right idea. Fix: the disc sprite needs 3–4 grey levels inside it (a maria texture at 16 × 16 on the 0.5° quad, contrast 0.25) and a limb darkening of 0.15 so it reads as a body; and the day `moon` view should not aim at the sun — if the tool aims at the moon's true position by day, mask the sun's bloom when it is within 5° of the view axis, or shoot the view at night only.

**Regressions:** Visual cleanliness 6 → 5 (the front bank, the night-hero slab, the day moon sheet).

**Must not regress:** night ground hue 220–245°; blue sky at p50 ≈ 0.02 at the top of the frame; stars as points; moonlit truck body readable at 1280; the moon in the frame; nine pods.

---

## 10 Performance

Only category 18 applies; from `stats.json` (truck and ultra sets carry one; camp, fleet and lions do not).

| # | Category | R5 → R6 | Note |
|---|---|---|---|
| 1–17 | | — → — | |
| 18 | **Browser performance** | 6 → 6 | Fast, 640×360, R5 → R6: `truck_day/hero` 488 → 486 calls, 2.18 → 2.18 M tris, programs 175 → 175, textures 293 → 292, geometries 336 → 334; `front` 518 → 514; `rear` 656 → 658; `wheel` 458 → 459; `detail` 490 → 486; `interior` 516 → 521; `forest` 553 → 551; `road` 497 → 496; `mainroad` 611 → 622 (+11, the largest move, at every hour: 607 → 621 dusk, 611 → 618 night); new `moon` 510 / 430 / 547. Runtime 614 / 607 / 613 → 570 / 637 / 621. Programs 175 (day) / 176 (dusk, night) flat; textures −1 throughout. Ultra 1280×720: day hero 639 → 637, road 656, mainroad 733 → 738, forest 693; **interior 778 → 654 calls, 4.62 → 3.48 M tris** — my round-5 weakness 3 (the cab kit drawing every part) is answered; night hero 661 → 658, road 677; programs 178–180 flat. No console errors beyond the two Canvas2D `willReadFrequently` warnings per set. |

**Top three weaknesses:** (1) `mainroad` +11 calls at every hour and +38 k tris at ultra — the new straw/litter scatter in the mainline's frustum; fix: fold the litter into the lawn species' instanced mesh. (2) Programs 175–180 unchanged — the beam sheet, hole shader and lion coat each still own one; fix as round 5 (share the sheet's program with the slice stack). (3) `rear` 658 calls remains the heaviest fast view; fix as round 5 (one draw per chunk for the `extra` lawn pass).

**Regressions:** none. **Must not regress:** ≤ 490 calls on the fast hero (486); ultra interior ≤ 660.

---

## Verdict

**Gate: fail** — Hero car **Visual cleanliness 7 → 5**, a two-point drop in a previously approved category, on `truck_dusk/front.png` and `truck_night/front.png`: the ground in front of the bumper is blown white by the headlamp spill and a lit veil (lower-third median Y 0.44 at dusk, +0.35 st over the sky; 0.49 at night, +4.3 st over the sky; 30 951 / 37 535 px over 0.5 where round 5 had 0 / 0). The same bank lights a 407-px slab in the night hero and 29 368 px over 0.35 in `ultra_night/road.png`. If the consensus reads the `front` camera's on-axis view as a capture change (caveat a) and discounts it, the drop is one point and the gate passes on every other count; I do not read it that way — the ground is white at whatever angle it is seen from, and the night hero and ultra road show it off-axis.

- **The round's categories** are flat or up in every family. **Animation:** Lion feet 6 → 7 (hind stifle and hock flex in swing, wrist fold, head and tail carriage), Campground 6 → 6 (flame 529 → 116 px, smoke plume), first scores for Lions (6: poses, a barely breathing rest) and Vegetation (4: no wind — the strip's tufts are pixel-static over 2.1 s, as they were in round 5). **Physics / ground contact:** Lion feet 6 → 7 (planted paws held three frames within 2 px, no float, no slide, no re-plant flicker), Hero 8 → 8 (tyres bite at every camera; ruts), Fleet, Campground, Road, Vegetation, Lions all flat. **Temporal stability:** Car glass 5 → 6 (`moving.flick` 0.156 → 0.095, under the background's own 0.110), Lion feet 6 → 6 (≤ 2 px jitter; stride speed wobbles ±25 %).
- **Drops:** Hero car Lighting 7 → 6 and Visual cleanliness 7 → 5 (the front bank); Campground Lighting 7 → 6 (fly floor −1.50 → −0.59 st; night pad over the horizon band +0.65 st) and Shadows 7 → 6 (the fly casts a 0.65-st tint); Lighting & atmosphere Visual cleanliness 6 → 5 (the bank, the hero slab, the day `moon` frame at 64 560 px over 0.5). All but the first are one point.
- **Round-5 must-not-regress lines broken:** night ground under the horizon band (now +0.58 st over on `mainroad`, +0.65 camp, up to +2.9 in the fleet — the sky fell 0.5 st and the ground did not); floor under the fly at −1.5 st (−0.59); night body a dark shape under the sky (now +0.6 st over — a gain in the picture, listed for the record). Held: nine pods; see-through ≥ 0.87 on the exterior day views; the mirror as a mirror; 0 % clip; dusk grille and bar under the dusk sky; ridge/sky inside 0.72–0.92; the pool under the sky and over the mud; turf at full count; dusk crown rim; contact decal; planted columns; eye highlight and lid; 486 calls on the hero.
- **Gains this round, in order of size:** the lion's head (Geometry 6 → 8 — muzzle, nasal ridge, lid, ear cup, lip; the box and the disc are gone); the lie-up is straw (straw mask 20 → 44 %, dark roots 1.2 → 0.1 %); crowns out of the black (day −2.8 → −1.6 st, dusk −3.4 → −1.9 st under the sky); the walk (flexed swing leg, planted paws that hold, feet unoccluded); night ground hue 320° → 226°; `moving.flick` back under 0.10 with the pane calmer than its background; chrome in the fleet (SUV bumper 0.07 → 0.34 with a sky band); the moon in a frame, the right size; ultra interior 778 → 654 calls; the fire's over-blend body gone; the wiper arc readable.
- **Not moved:** the pool (pixel-identical, hue 17°, R > B); the hills (a plate, 17/20 columns body paler than crest; ratios drifted 0.04–0.11 toward the sky); the mirror's sky (−0.33 st, 1.7× sat vs the window's); the headlamp ellipses (493 + 304 px); the lantern ball on the jeep (479 px); the eye (a ball on the face, unchanged counts); day rim on the lion.

**Weakest object in the game now:** the ground in front of the truck at night — white where the lamps touch it, over the sky where they do not. Second: the lion's legs, which flex correctly and are still pipes with cones on the ends.

**Family means (R5 → R6):** Hero car 7.00 → 6.81; Car glass 6.67 → 6.80; Fleet 6.53 → 6.67; Campground 6.79 → 6.64; Road & terrain 6.53 → 6.53; Vegetation 6.23 → 6.36 (6.54 on the cells scored both rounds; the new Animation 4 pulls the mean); Lions 6.29 → 6.67 (6.71 on common cells); Lion feet & gait 5.85 → 6.31; Lighting & atmosphere 6.70 → 6.73 (6.70 on common cells); Performance 6.00 → 6.00. Mean of the nine visual families 6.51 → 6.61; all scored cells 6.52 (126) → 6.61 (129), 6.52 → 6.64 on the 126 cells scored in both rounds.

**Five biggest findings**

1. `truck_dusk/front.png` and `truck_night/front.png`: the ground ahead of the bumper is blown white — lower-third median Y 0.44 / 0.49, 30 951 / 37 535 px over 0.5, a lit bank with a textureless veil at its foot; 407 px at 0.60 on a slab in the night hero, 29 368 px over 0.35 in `ultra_night/road.png`. The near-field spill I asked for in round 5 landed 2–3 st too hot and the beam veil is drawn over the ground. Gate drop.
2. The night sky came down 0.5 st (mainroad sky profile 0.018–0.032 → 0.013–0.020) and the ground did not, so every night frame has its ground over the horizon band: `mainroad` +0.58 st, camp pad +0.65, fleet trailer +2.88 — while the ground's hue is finally blue (320° → 226°). One scalar fix (moon/indirect ×0.7) keeps the hue and restores the order.
3. The walk strip, on its own terms, is a walk: swinging hind leg a Z (stifle forward, hock back) in `walk_01/03/05/07`, wrist fold on the swinging fore, planted paws held three frames within 2 px (hind 329–342 through `00–02`, fore 172–185 through `05–07`), decal under each, no float, no slide, no re-plant flicker; the stride speed wobbles 16–27 px per 0.3 s and the legs are tubes.
4. The lion's head is rebuilt (`ultra_lions/lion_face.png`): rounded muzzle with a nasal ridge, nose pad, lid and brow shadow, cupped ear with a dark inner face, lower lip, pores and radiating streaks — Geometry 6 → 8; the eye is unchanged (pale 43 → 40, dark 849 → 879 in the pupil box) and still stands proud of the lid.
5. The campground traded its fly shadow for fill: floor under the fly −1.50 → −0.59 st against the sunlit pad, the fly's shadow a 35-row soft edge on a 0.65-st step; the table pockets reached −2.48 st (target −2.5) only because the whole floor rose. The fire's flame is the right size now (529 → 116 px over 0.5) and its light on the ground fell −1.4 st with it.

**Questions a frame could not settle**

1. **Is the pre-roll deterministic?** The brief says the truck sits at the same spot and pose in both rounds. `truck_*/forest.png` (placed camera, same acacia and ruts in both rounds) shows the truck mid-corner, rolled, nose left in round 5 and straight and level in the ruts in round 6; the truck-relative views differ on 88–93 % of their pixels, the `glass/` tool's views on 28–41 %; the bar-pod slope in the night hero is 20° → 15°; the `mainroad` ridge rows move 3–6 px. Either the pre-roll stops at a different point, or round 5's re-shot frames were not from the same pre-roll as round 6's. Every truck-relative comparison in families 1 and 9 carries this.
2. **Which build are the round-6 frames from?** The HUD plate in `shots/round6/truck_day/hud.png` reads `build 776d40a · 2026-09-06 15:44Z`; the brief says `c2f0b83`.
3. **Is the front bank the beam sheet, a dust volume, or the ground?** The upper part of the bank has laterite texture and tufts silhouetted against it (lit ground); the lower part is a cream field with less texture (a volume or sheet). The fix differs — spill intensity for the first, sheet alpha for the second — and I have prescribed both. A `front` frame with the sheet disabled would separate them.
4. **Did the dusk rim on the lion lose continuity, or did the pose turn?** `lion_close_dusk.png` dorsal columns carrying ≥ +0.3 st 46 % → 33 %, longest gap 13 → 40 columns over the withers, median +0.26 → +0.12 st — on a lion that is turned further toward the camera than round 5's. Same-pose frames would settle it; I have not scored it down.
5. **Does anything breathe?** The resting lion changes 0.43 % of its pixels over the strip's 2.1 s and the tufts change none. If there is an idle or a wind in the build that the software rasteriser's capture cadence misses, a two-frame capture 1.5 s apart of the resting pride would show it.
6. **What does the day `moon` view aim at?** The frame looks into the sun (79 141 px over 0.35). If the view is meant to be night-only, the day and dusk frames should not be scored; I have counted the day frame under Visual cleanliness in family 9 and would withdraw that if it is a tool artefact.
7. **Is the decal's size at 15° what the builders intend?** Under a planted paw the darkening returns to the background two rows under the paw tip (2–3 px). A 0.3 m radius at this range and angle would be ~6 px; either the radius is ~0.12 m or the decal fades with the paw's height and the strip's cadence never catches it fully down.
