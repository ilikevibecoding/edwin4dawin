# Round 4 — Critic C

**Incumbent:** round 2, build `a8ca6eb`, `shots/round2/` (103 frames).
**Candidate:** round 4, build `80cb5e6`, `shots/round4/` (103 frames, served from `?quality=fast`).
**Frames looked at:** all 103 candidate frames, each beside its incumbent (206 frames), on
two-up sheets at native scale plus 2×–4× nearest-neighbour crops of every region called
out below.

**How I measured.** Scratch scripts under `/tmp/criticC/` (PIL + numpy). For each box I
report mean sRGB, HSV hue/saturation of the mean, linear luminance Y (sRGB decoded,
Rec.709 weights), p5/p95 of Y, and where the consensus used it, sRGB-space "luma"
(0.2126 R + 0.7152 G + 0.0722 B on 0–1 sRGB) so the star numbers are comparable with
rounds 1 and 2. Ratios are given in stops = log2(Y_a / Y_b). "Blobs" are 8-connected
components of a thresholded mask. Boxes are in the frame's own pixel space.

**Tool notes before scoring (not scored against the game):**
- Frame sizes differ by family and were the same in both rounds: truck 640×360; camp,
  lions_day/dusk/walk 512×288; fleet 480×270. Round 2 `glass/*` are 320×180, round 4
  are 640×360 (the consensus recorded this fix). Glass texture/edge scores below are
  therefore read from the round-4 frames at face value and the round-2 column is a
  nearest-upscaled comparison; I did not penalise round 2 for the resolution.
- `camp_day/camp_interior.png` is the driver's seat looking out at the camp gate, not
  a view under the mess canopy. The consensus named it for the canopy blocker; it
  cannot show that. I measured it as a cab-interior frame only.
- `fleet/trailer_0_day.png` / `_night.png`: the round-2 framing sat inside the wheel
  arch; the round-4 framing sits on top of the trailer's lid, which fills 60 % of the
  frame. The bounding-sphere fix moved the camera, it did not frame the trailer. Not
  scored.
- `lions_walk/walk_00..07`: `tools/lions.mjs` advances `window.__sim(0.12)` between
  frames, so the strip is 0.96 s long. The lion's silhouette centroid moves 46 px
  (round 2) / 56 px (round 4) across a 512-px frame — about a third of a stride, not a
  crossing. Foot planting is scored on what those 0.96 s show; stride length cannot be.

---

## The three round-2 blockers

### 1. Night sky read as snow — **closed**

`truck_night/hero.png`, rows 0–79, luma > 0.35:

| | fraction > 0.35 | components | median blob | blobs > 50 px |
|---|---|---|---|---|
| round 1 (consensus) | 0.45 % | | | |
| round 2 `a8ca6eb` | **19.87 %** | 416 | 2 px | 56, 2492, 6362 (galaxy field) |
| round 4 `80cb5e6` | 10.50 % raw; **0.13 %** once the three lamp glows are masked | 32 | 2 px | 259, 1699, 3350 (see below) |

Stars are now 1–3 px points, 32 of them in the top 80 rows, not a field; the Milky Way
is a soft band (visible as a diagonal luminance gradient in `truck_night/road.png`
rows 0–140 and behind the camp in `camp_night/camp_fire_night.png`, where it reads as a
band and not as a denser dot field as it did in round 2). The truck is legible, not a
silhouette: 3011 pixels of green paint (hue 90–170°, sat > 0.15) at mean Y 0.026 in
round 4 against 1 pixel in round 2; the paint, roof rack and orange jerry can all read.

What is *not* stars: the 10.50 % raw figure is three blobs. Measured over rows 0–139 at
luma > 0.30 so each disc is captured whole: blob centred (274,73), 6850 px, peak luma
0.87, is the roof LED bar blooming into a slab ten times the bar's own area. Blobs
(73,64) 2481 px and (187,70) 449 px are two soft round discs in the sky, sRGB
(113,121,146) — the roof bar's cool colour, not the headlamps' warm one. They are the
bar's volumetric beam: `src/sky.js` `beamGeometry()` stacks camera-facing quads with
`t = pow((q+0.5)/SLICES, 1.35)` and `fast` runs `beamSlices: 12` (`sky.js:1417`); seen
broadside from above, with nothing but sky behind them, the far slices separate into
individual discs at `uIntensity = (0.5·I/13)·gain·(2/slices)` = 1/6 of the beam each.
`glows_hero` crop confirms: two gaussian discs, no cone between them. This is a new
defect, not a star defect. It is scored under Hero car cleanliness and Lighting.

### 2. Far hills saturated cobalt / cream band — **closed on three of four frames; not on `lion_far`**

Hill directly under the ridge sky vs that sky, both rounds (sky pixels identical between
rounds, so the ratios are directly comparable):

| frame (px space) | box hill / sky | R2 hue/sat | R2 hill/sky | R4 hue/sat | R4 hill/sky | target |
|---|---|---|---|---|---|---|
| `truck_day/mainroad.png` (640) sun behind | (200–320, 72–88) / (200–320, 40–60) | 219° / 0.35 | 0.62 (−0.68 st) | 219° / **0.19** | **0.87 (−0.21 st)** | 0.72–0.92, sat ≤ 0.25 |
| `camp_day/camp_beyond.png` (512) | (384–448, 88–98) / (384–448, 70–83) | 218° / 0.31 | 0.92 (−0.13 st) | 217° / **0.21** | **1.02 (+0.03 st)** | over by 0.10 |
| `fleet/pickup_0_day.png` (480) sun behind | (225–300, 39–52) / (225–300, 15–30) | 218° / 0.15 | 1.03 (+0.04 st) | 218° / 0.15 | 1.03 (+0.05 st) | over by 0.11, unchanged |
| `lions_day/lion_far.png` (512) into sun, near hill L | (32–112, 24–48) / (32–112, 3–16) | 220° / 0.43 | 0.31 (−1.69 st) | 221° / **0.24** | **0.54 (−0.88 st)** | **under by 0.18** |
| `lion_far` far hill R | (360–480, 40–60) / (360–480, 8–24) | 219° / 0.08 | 1.20 (+0.27 st) | 219° / 0.08 | 1.20 (+0.27 st) | over, unchanged |

Band beneath the hills vs sky:

| frame | band box | R2 band/sky | R4 band/sky |
|---|---|---|---|
| `mainroad` | (200–320, 92–100) | 0.32 (−1.66 st), sat 0.40 cobalt | 0.71 (−0.50 st), sat 0.15 |
| `camp_beyond` | (384–448, 98–102) | 0.64, sat 0.48 cobalt | 0.95, sat 0.22 |
| `pickup_0_day` | (225–300, 54–58) | 0.78 | 0.94 |
| `lion_far` cream strip | (32–112, 83–93) | **1.29 (+0.37 st)** brighter than sky | 0.85 (−0.23 st) |
| `lion_far` orange strip | (40–140, 104–116) | 1.00, hue 41° sat 0.48 | 0.68, hue 34° **sat 0.50** |

Saturation is inside the 0.25 limit everywhere (max 0.24). The cobalt is gone; the hills
are a grey-blue airlight (sRGB ≈ 137,148,170 on `mainroad`). No band is brighter than the
sky any more. Two things stay open: (a) into the sun (`lion_far`) the near ridge is
still 0.88 stops under its sky, below the 0.72 floor — the `hillFog` term in
`src/terrain.js` `hazeChunk()` (`hillFog = smoothstep(100, 650, hillDist) * 0.76`) tops
out at 0.76 so a hill 200 m away keeps a quarter of its lit-side darkness against a sky
it should be melting into; (b) with the sun behind (`camp_beyond`, `pickup`) the hills
are 0.03–0.05 stops *brighter* than the sky, which is the opposite error at a tenth the
size and reads as a hazy plateau, acceptable. The orange laterite stripe behind the
pride's rock (`lion_far`, `lion_pride` rows 80–100) at sat 0.50 is a terrain colour band
with a stepped edge, not an airlight band; it is scored under Road & terrain.

### 3. Shade under the mess canopy a hole — **partly closed**

`camp_day/camp_mess.png` (512×288), sunlit pad box (104–144, 224–240) vs the ground under
the canopy:

| | R2 Y | R4 Y | R2 stops under sun | R4 stops under sun |
|---|---|---|---|---|
| sunlit pad, 1 m outside the canopy | 0.425 | 0.418 | — | — |
| canopy shade, open part (240–288, 240–260) | 0.129 | 0.325 | 1.73 | **0.36** |
| shade under the tables (300–340, 236–256) | 0.020 | 0.056 | 4.37 | **2.79** |
| p10 of all ground rows 236–270, x 150–400 | 0.006 | 0.039 | 6.15 | **3.44** |
| fraction of that ground below Y 0.1 | 27.8 % | 16.0 % | | |

Edge: a row profile at y 246–254 across x 150–330 in round 2 drops 0.36 → 0.12 within
6 px (hard) then trails to 0.00; in round 4 it ramps 0.42 → 0.05 over ~60 px with no
step — the penumbra is now a ramp (it is a dithered ramp: the pixel std inside the shade
band went from 0.113 to 0.026, and at 2× the dither pattern is visible as a fine
checker; software-rasteriser softness hides it at 1×). The chairs read: canvas seat,
timber frame, legs; the table-top objects read. The consensus target of 1.5–2 stops is
met at the canopy edge (0.4–1.7 st depending on how far in) and not met under the table
cluster (2.8 st) or at the darkest tenth of the pad (3.4 st). The change is
`src/sky.js:387` `hemi.intensity` 0.5 → 2.5 and `src/campground/materials.js`
`ENV_MATT` 0.3 → 0.8 on the ground pad and props: skylight now reaches the shade; what is
still missing is the ground-bounce term (sunlit laterite one metre away throws warm light
back under a canopy; the round-4 shade is cool-neutral, hue 26° sat 0.37 against the pad's
36° / 0.41).

`camp_interior.png` cannot show this (see tool notes). For the record, the cab's seat
back in shade sits at Y 0.011 against the sunlit ground seen through the windscreen at
0.302 — 4.8 stops, which is a plausible cab-to-outdoors ratio and unchanged from round
2 (0.008 / 0.300).

---

## 1 · Hero car

Frames: `truck_{day,dusk,night}/{hero,front,rear,wheel,detail,interior,forest,road,mainroad}`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Same cameras; the night hero now has three glows competing with the truck (see 16). |
| 2 | Silhouette | 7 → 7 | Unchanged outline; snorkel, rack, bull bar all read at every hour. |
| 3 | Geometry | 7 → 7 | Tread blocks still 16-ish around the tyre (`wheel.png`), rack tubing fine. |
| 4 | Scale | 7 → 7 | — |
| 5 | Materials | 6 → 6 | Paint is a **satin enamel**: within the green-paint mask on `truck_day/hero.png` (hue 90–170°, sat > 0.2, ~9500 px) mean Y 0.061 → 0.086 (+0.51 st brighter), p95 0.146 → 0.180, p99 0.34, max 0.46 against a sky at 0.35–0.40 — the brightest 1 % of the paint just reaches sky luminance, so there is no clearcoat sky return, only a broad satin lobe. It reads as a lighter, chalkier green than round 2. Bumper and rack are a **powder-coated steel** and read right. Dusk brightwork no longer clips. Interior lost its crackle (see 6). The side panes carry horizontal wipe streaks (`glass/side_shade.png`, 2×) that read as **brushed metal**, not dust on paint. |
| 6 | Texture quality | 6 → 6 | Interior swapped one uniform (crackle on everything) for another (flat grey-beige vinyl on dash, pillars and door cards; `truck_day/interior.png` dash box (380–560, 200–260) mean |ΔY| between neighbours 0.0138 → 0.0145 — same high-frequency energy, now noise not pattern). The `uDirtScratch` streak layer is a single horizontal frequency across the whole flank. |
| 7 | Glass | 6 → 6 | Scored in family 2. |
| 8 | Lighting | 6 → 7 | Dusk hero grille p95 Y 0.732 → **0.584**, 0 % over 0.9 either round, against sky p95 0.43: no longer a slab. Night truck is legible (3011 green pixels vs 1). |
| 9 | Shadows | 7 → 7 | Day contact shadow under the sills intact; wheel-well occlusion holds. |
| 10 | Reflections | 4 → 5 | Door mirror is now live at `fast` (`glass/mirror.png` shows road, trees, horizon). Paint still reflects only a uniform sky tone. |
| 11 | Colour / atmosphere | 6 → 6 | — |
| 12 | Animation | — | Stills. |
| 13 | Physics / contact | 8 → 8 | Tyres sit in the ruts; no float. |
| 14 | Detail density | 7 → 7 | — |
| 15 | Environmental integration | 6 → 6 | Mud splatter on `detail.png` is a dry, hard-edged cutout mask; no dust gradient up the flank. |
| 16 | Visual cleanliness | 6 → 5 | `truck_night/hero.png`: two beam-slice discs in the sky (2481 px, 449 px) and a 6850-px roof-bar bloom slab. Round 2 had none of these. One-point drop, called out. |
| 17 | Temporal stability | — | |
| 18 | Browser performance | — | Not from the picture. |

**Top three weaknesses**

1. **Roof-bar beam slices read as two moons.** `truck_night/hero.png`; blobs at (73,64)
   2481 px and (187,70) 449 px, sRGB (113,121,146), gaussian profile, no cone joining
   them. `src/sky.js` `beamGeometry(SLICES)` with `fast: { beamSlices: 12 }`
   (`sky.js:1417`) and per-slice weight `2.0 / slices` (`sky.js:~2712`). Fix: raise
   `fast` to ≥ 24 slices (24 quads is nothing) *and* in `beamFrag` multiply `density` by a
   lateral term `smoothstep(coneR * 2.5, coneR * 1.0, lateral)` computed from the
   already-present `axial`/`lateral` (the JS computes them at `sky.js:~2726`; pass
   `uLateral`), so a broadside camera above the beam sees a cone fading out, not discs.
   Also drop the LED bar's `uGlareGain` further or clamp the post bloom on it: the 6850-px
   slab is the bar lens at `0x6f6653 × 6.5` going over the night bloom threshold
   (`post.js:1173`).
2. **Paint has no clearcoat and the dust reads as brushed metal.** `glass/side_shade.png`
   at 2×: parallel horizontal streaks at one frequency across the door, sat 0.18, no
   vertical run marks, no thickening at the sill. `src/textures/vehicle.js` `uDirtScratch`
   scratch layer and `makePaintMaterial()` in `src/vehicle/materials.js`. Fix: in
   `makePaintMaterial` set `clearcoat: 1.0, clearcoatRoughness: 0.15` with the
   `paintFlakeNormal` bound to `clearcoatNormalMap` (not `normalMap`) so the base coat
   stays satin and the coat carries the sky; in `vehicle.js` build the dirt from a
   downward `fbm` streak field (v-axis frequency 40, u-axis 3 — the same recipe already
   used at `lion/textures.js:360`) masked by an AO-from-height gradient up the sill, and
   drop the horizontal scratch frequency to one octave at 1/8 the amplitude.
3. **Interior is one vinyl.** `truck_day/interior.png`, `glass/interior.png`: dash top,
   A-pillars, door cards and binnacle are one grey-beige at one roughness; the round-2
   crackle was wrong on all of them, but the replacement has no material split. Fix in
   `src/vehicle/interior.js` `clGrainF`: keep the flat vinyl for the dash top, give the
   door cards a coarse woven `fbm` (period 4, octaves 2) with roughness 0.9, and the
   binnacle/console a black `roughness 0.35` ABS with `paintPeelNormal` at 0.3 so there
   are three readable materials instead of one.

**Regressions:** Visual cleanliness 6 → 5 (`truck_night/hero.png` R2 vs R4: 0 vs 3 blobs > 100 px above the horizon). Within the one-point allowance, but it is in the first night frame a player sees.

**Must not regress:** dusk grille p95 0.584 with 0 % clip; night truck legibility (green mask Y 0.026, 3011 px); the live mirror at `fast`; tyre contact in all three `wheel.png`.

---

## 2 · Car glass

Frames: `glass/{ws_close,ws_mid,side_sun,side_shade,rear_dust,interior,int_side,mirror,dusk_ws,night_ext,night_int,moving,sheet}` + `metrics.json`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 7 → 7 | Same views. |
| 5 | Materials | 5 → 6 | Panes now have a gasket and an edge (`m.gasket`, `m.glassEdge`, `pane()` in `src/vehicle/materials.js`): the windscreen reads as a laminated sheet in a rubber seal, not a tinted plane. Mirror glass is a mirror. |
| 6 | Texture quality | 5 → 5 | Rear dust is a soft, even veil (`rear_dust.png` veil 0.069 → 0.103); no wiper arc, no edge accumulation. |
| 7 | Glass / transparency | 6 → 6 | Tool `see` fell on 9 of 12 conditions: ws_close 0.881 → 0.867, ws_mid 0.850 → 0.787, side_sun 0.716 → 0.670, side_shade 0.743 → 0.678, interior 0.834 → 0.789, rear_dust 0.907 → 0.873, moving 0.845 → 0.759; rose on dusk_ws 0.822 → 0.836 and night_int 0.902 → 0.921. Veil rose everywhere but int_side. What I see agrees: the side panes carry more milk. Zero hot pixels and 0 % clip in both rounds. |
| 8 | Lighting | 6 → 6 | Dusk windscreen holds its sky gradient without a hot spot. |
| 10 | Reflections | 4 → 6 | `mirror.png`: R2 an orange-to-grey gradient (`see` 0.589); R4 shows the road behind, two acacias and the horizon in the housing (`see` 0.331 — lower is correct for a mirror). `applyMirrorHorizon` / `m.mirrorGlass` in `materials.js`. Windscreen still shows no sky reflection band from outside. |
| 11 | Colour / atmosphere | 6 → 6 | Tint is a neutral grey-green; no magenta. |
| 16 | Visual cleanliness | 6 → 6 | No sorting errors in `int_side.png` where pillar, pane and mirror overlap. |
| 17 | Temporal stability | 6 → 6 | `moving` flick 0.098 → 0.099, identical. |

**Top three weaknesses**

1. **The side panes veil more than they did.** `glass/side_sun.png` and `side_shade.png`:
   `see` 0.716 → 0.670 and 0.743 → 0.678, veil 0.074 → 0.087 and 0.110 → 0.124; at 2×
   the door glass has a uniform grey wash with the same horizontal streak frequency as the
   paint. `pane()` in `src/vehicle/materials.js` and the side-pane dirt in
   `src/textures/vehicle.js`. Fix: pane `opacity`/`transmission` is fine — take the
   dust out of the diffuse `map` and put it in `roughnessMap` + a low-alpha
   `alphaMap`-driven veil (alpha ≤ 0.08 at the pane centre, rising to 0.25 only in the
   bottom 15 % of the pane), so the pane stays clear where the eye looks through.
2. **No Fresnel on the windscreen from outside.** `glass/ws_mid.png`: the pane is the same
   tint at grazing and at normal incidence; the sky never lands on it. `pane()`: add
   `envMapIntensity: 1.0` and `ior: 1.52` on the `MeshPhysicalMaterial` with
   `reflectivity` left default, and stop pre-multiplying the tint into `color` (set
   `color` white, carry tint in `attenuationColor`), so grazing angles brighten.
3. **Rear dust is featureless.** `glass/rear_dust.png`: veil 0.103 spread evenly; no
   wiper arc, no lower-edge build-up. In `src/textures/vehicle.js` build the rear-pane dust
   as `fbm` × (1 − wiper-arc mask) × vertical gradient, mask centre `(0.5, 0.35)`, radius
   0.42, feather 0.06.

**Regressions:** none over one point. Transparency `see` down 0.03–0.09 across conditions, scored as flat 6 → 6 because zero hot pixels/clip are held.

**Must not regress:** mirror live at `fast`; zero hot pixels and 0 % clip in all 12 conditions; `night_int` see 0.921; `moving` flick 0.099.

---

## 3 · Fleet

Frames: `fleet/{camper,expedition-truck,motorcycle,pickup,ranger,safari-jeep_0/1/2,supply-truck,suv,trailer,utility}_0_{day,night}` (480×270).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | Trailer framing is a tool defect in both rounds (arch → lid). |
| 2 | Silhouette | 6 → 6 | — |
| 3 | Geometry | 6 → 6 | Motorcycle wheels: cannot count segments at 480 wide; the day rim reads round, the night rim shows spokes. Not verifiable, unchanged. |
| 4 | Scale | 7 → 7 | Pickup against the jeep row and the camp structures reads right. |
| 5 | Materials | 6 → 6 | Pickup is a **white painted steel with a satin finish**; ranger green paint reads as **enamel**; canvas tilts on the jeeps read as **dyed cotton duck**. No change in material behaviour; paint still has no clearcoat sky. |
| 6 | Texture quality | 5 → 5 | Decals and panel lines hold at 480; tyre sidewalls plain. |
| 7 | Glass | 5 → 6 | Magenta panes gone: magenta-ish fraction in the vehicle box `ranger_0_day` 0.11 % → 0.09 %, `utility_0_day` 0.19 % → **0.05 %**; the utility's screen reads as glass. |
| 8 | Lighting | day 6 → 6, night 4 → 5 | Night: markers now exist — warm-lamp blobs (hue 20–70°, sat > 0.3, Y > 0.3) `ranger` 2 → 4 blobs (largest 53 px), `safari-jeep_0` 1 → 2 (45 px), `suv` 6 → 5 (259 px), `pickup` headlamps 752 + 914 px and a red-lit cab. But the row itself went darker: body box Y `ranger` 0.0155 → 0.0098 (−0.66 st), `safari-jeep_0` 0.0147 → 0.0098 (−0.58 st), `motorcycle` 0.0426 → 0.0239 (−0.84 st); no camp lantern reaches the row. Vehicles are still silhouettes with a marker on them. |
| 9 | Shadows | 7 → 7 | Day contact shadows intact under every vehicle. |
| 10 | Reflections | 4 → 4 | — |
| 11 | Colour / atmosphere | 5 → 6 | Hills behind the row fixed (`pickup_0_day` band sat 0.22 → 0.12). |
| 14 | Detail density | 6 → 6 | — |
| 15 | Environmental integration | 6 → 6 | Wheel dust ring under the pickup; no wear on the jeep tilts. |
| 16 | Visual cleanliness | 6 → 6 | `supply-truck_0_night` warm pixels 174 → 25: the residual pools under off lamps are gone. |

**Top three weaknesses**

1. **The night row is unlit by the camp.** `fleet/ranger_0_night.png`,
   `safari-jeep_0_night.png`: body Y 0.0098, frame mean 0.0111 (R2 0.0229); the fire and a
   lantern are visible in the background and light nothing in the foreground. Fix in
   `src/campground/lights.js`: anchor two `PointLight`s (colour 0xffb060, intensity 6,
   distance 14, decay 2) on the lantern poles at the row's ends and give them the
   `layers` mask the fleet reads; the consensus brief asked for camp lanterns near the
   row and the frames show none.
2. **Motorcycle tread and rim.** `fleet/motorcycle_0_day.png`: tyre is a smooth torus
   with a painted tread; rim is a flat disc. `src/vehicles/parts.js` wheel builder for
   `kind: 'motorcycle'`: `TorusGeometry` radial segments ≥ 24, tubular ≥ 48, and
   a real spoke ring (`CylinderGeometry` r 0.004 × 24 instances) instead of a disc.
3. **Trailer frame is a tool defect** — `tools/fleetshots.mjs` sizes the camera from the
   bounding sphere; for the trailer, fit on the *box* of the body mesh only, excluding the
   hitch pole, and set the elevation to 12° so the wheel and body both land in frame.

**Regressions:** none over one point. Night lighting up one on markers, but the row body luminance is down 0.6–0.8 st.

**Must not regress:** magenta-free panes; pools only under lit lamps (`supply-truck_0_night` 25 warm px).

---

## 4 · Campground

Frames: `camp_day/{arrive,beyond,gate,interior,mess,overhead}`, `camp_night/{arrive,fire,gate,mess}` (512×288).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | — |
| 3 | Geometry | 6 → 6 | Canopy frame, poles, guy lines read; chairs are boxy. |
| 4 | Scale | 7 → 7 | Chairs to tables to poles to truck consistent. |
| 5 | Materials | 5 → 6 | Canopy is a **woven camouflage tarp** — the weave reads at 2× on `camp_mess.png`, the underside is a lit translucent olive; that is the right material. Poles are **peeled timber** but one tone end to end with no end grain or checking (`camp_gate.png` at 3×). Ground pad is a **compacted laterite** (hue 36°, sat 0.41, Y 0.42 in sun) and correct. Tent walls at `camp_arrive` read as canvas but the frame is hazed and too small to judge weave. |
| 6 | Texture quality | 5 → 5 | Pad tiling is not visible at the mess; the tarp weave is a fine, even repeat along the ridge with no wear, stain or sag pattern to break it. |
| 8 | Lighting | 5 → 7 | Shade filled (blocker 3: p10 of ground 6.15 → 3.44 st under sun). Night (`camp_fire_night.png`): ground at the fire (235–275, 200–215) vs far corner (20–120, 230–280) 1.55 → **2.88 st** — the fire now owns its pool; the pool itself is dimmer (Y 0.164 → 0.107) and the flame reads as a flame rather than a hot dot. |
| 9 | Shadows | 4 → 6 | Slab gone; penumbra ramp ~60 px; dithered pattern visible at 2× (software rasteriser softens it at 1×). |
| 11 | Colour / atmosphere | 5 → 6 | Night ground is now a uniform dark red: `camp_fire_night` far-corner hue 7° sat **0.42** (R2 12° / 0.27), `camp_mess_night` far-corner 12° / **0.55** (R2 0.30). Moonlit dirt 20 m from the fire should not be more saturated than the firelit dirt. `camp_arrive_night` pad is no longer a snowfield: Y 0.033 → 0.0065 (−2.3 st), hue 307° sat 0.14 — very dark with a faint magenta cast. |
| 14 | Detail density | 6 → 6 | — |
| 15 | Environmental integration | 5 → 5 | `camp_overhead.png`: no worn paths between tents and mess in either round. |
| 16 | Visual cleanliness | 5 → 6 | No z-fight on the pad; guy lines alias equally in both. |

**Queued items:** fire reach and flame size — **partly** (`camp_fire_night` near/far 2.88 st and the flame reads; the pool is still a round disc with a visible edge, and the far ground is a saturated red rather than moonlit); gate timber — **not** (`camp_gate` poles uniform); ground tile scale under the mess — **addressed** (no visible repeat); worn paths — **not** (`camp_overhead` identical).

**Top three weaknesses**

1. **Deep shade under the tables is still 2.8–3.4 st.** `camp_day/camp_mess.png` boxes
   above. The hemisphere fills the open shade; the occluded pockets get nothing warm.
   Fix in `src/sky.js:387`: set `hemi.ground` to the sunlit laterite (0xc8956a) rather
   than `PALETTE.bounce`, and in `src/campground/ground.js` give the mess pad
   `campWear` material `envMapIntensity` 0.8 → 1.2 so the PMREM (which already contains
   the lit ground) lifts the pockets; then re-measure for 1.5–2 st.
2. **Night ground is one saturated red.** `camp_night/camp_mess_night.png` far corner
   sRGB (58,33,27) hue 12° sat 0.55 at Y 0.022. The fire's `PointLight` in
   `src/campground/fire.js:368` is `new THREE.PointLight(0xff9448, 0, 20, 1.0)` — 20 m
   reach at `decay 1`, intensity `(6 + 20·night)·flicker·radius·2` (`:394`) — so its
   orange is the only light on the far corners. Fix: `decay 1.0 → 1.6`, `distance 20 → 14`,
   and give the night `key` (`sky.js:505`, `color: NIGHT.moon, intensity 0.4`) enough
   presence on the pad (0.4 → 0.6) that the far ground goes cool grey (sat ≤ 0.25) where
   the fire does not reach.
3. **Timber is one tone.** `camp_day/camp_gate.png` 3× crop: poles are a flat tan cylinder
   with a faint bark noise, no end grain on cut ends, no checking. In
   `src/campground/textures.js` timber map: add a ring-grain `fbm` on the end caps
   (period 0.5, octaves 3) and a longitudinal crack layer (v-frequency 60, u 2, thresholded
   at 0.72) on the shaft; `roughness 0.85`.

**Regressions:** none. Night colour saturation is up but the category as a whole is up one on the fixed pad and hills.

**Must not regress:** shade fill (p10 3.44 st; chairs readable); penumbra ramp; `camp_arrive_night` pad not a snowfield; fire pool-to-corner 2.88 st.

---

## 5 · Road & terrain

Frames: `truck_*/{road,mainroad}`, `lions_day/{lion_far,lion_pride}`, `camp_day/camp_beyond`, `fleet/*_day` backgrounds.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 3 | Geometry | 5 → 5 | Waterhole is still a flat disc with a stepped edge (`lion_pride.png` rows 112–128, at 2×: 3–4 px stair steps along the far shore). |
| 5 | Materials | 6 → 6 | The road is a **dry laterite two-track**: hue 29–36°, sat 0.4–0.5, with stones and rut shading — correct. Water is **not water**: `lion_pride` water box (230–320, 114–126) sRGB (129,119,106), hue 34°, sat 0.18, Y 0.240 = 0.57 st *under* the sky it should mirror and 0.03 st from the mud beside it. It is a lighter mud. |
| 6 | Texture quality | 6 → 6 | Mid-ground road tile repeat (queued, A): at 640 wide on `truck_day/mainroad.png` the ruts read continuous and I cannot confirm a repeat either way; foreground stones and rut shading fine. |
| 10 | Reflections | 3 → 3 | Water shows nothing (no rock, no tree, no sky gradient). |
| 11 | Colour / atmosphere | 4 → 7 | Blocker 2 table above; cobalt gone; airlight grey-blue; one frame still under target. |
| 15 | Environmental integration | 6 → 6 | Verge grass onto the road is good; stones sit on the surface. |
| 16 | Visual cleanliness | 5 → 6 | Cream band beneath hills gone; orange stripe behind the pride remains (sat 0.50). |

**Queued item:** waterhole a flat disc with a stepped edge — **not**; mid-ground road tile repeat — **not verifiable at 640**.

**Top three weaknesses**

1. **The waterhole is mud.** `lions_day/lion_pride.png` numbers above. `src/terrain.js`
   waterhole shader: `fres = clamp(0.42 + 0.58·pow(1−f, 3), 0, 1)` then over the
   `hole` mask `fres = mix(fres, clamp(0.08 + 0.62·pow(1−f, 5)), hole)` (`terrain.js:4834`,
   `:4865`) and `murk = mix(vec3(0.15,0.12,0.07), vec3(0.085,0.07,0.042), …)`
   (`:4858`). At the pride camera's grazing angle f ≈ 0.25, so `fres` over the hole is
   0.08 + 0.62 · 0.24 = 0.23: three quarters of the pixel is murk. A pool at 15° grazing
   should be ≥ 0.6 reflectance. Fix: `fres = clamp(0.25 + 0.75·pow(1−f, 3), 0, 1)` over
   the hole, and make `refl` the actual sky sample (`horizonOf(sky)` toward the zenith
   gradient) rather than the fog colour, so the water goes light blue-grey against the
   red ground.
2. **Into-sun hills still 0.88 st under the sky.** `lions_day/lion_far.png` near ridge
   (32–112, 24–48) Y 0.174 vs sky 0.320. `src/terrain.js` `hazeChunk()`:
   `hillFog = smoothstep(100.0, 650.0, hillDist) * 0.76` (`:5124`). Raise the cap to 0.9
   and start the ramp at 60 m; and multiply `hillAir` by the sun-facing factor already
   available in `sky.js` `HAZE.uHazeAniso` so into-sun hills brighten toward the sky
   rather than staying at the shadow-side value.
3. **Waterhole edge and the orange stripe.** `lion_pride.png` far shore stair-steps;
   `lion_far.png` rows 104–116 an orange band hue 34° sat 0.50 with a hard top edge. In
   `src/terrain.js` `buildFarHills()` the plain-to-hill transition mesh takes one colour
   from `PALETTE`; blend it to the near-ground `laterite` map over 40 m and fog it with the
   same `hazeChunk`. For the shore, write the waterhole `vDepth` from a smooth SDF and
   feather `holeA` over 0.6 m instead of per-vertex alpha.

**Regressions:** none.

**Must not regress:** hill saturation ≤ 0.24 on all four frames; no band brighter than the sky; road laterite hue/sat.

---

## 6 · Vegetation

Frames: `truck_*/forest`, `lions_day/*`, `truck_day/hero` foreground.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 2 | Silhouette | 6 → 6 | Acacia crowns read as flat plates at every hour. |
| 5 | Materials | 5 → 5 | Grass is **cut card**: pale straw blades with individual highlights (`veg_grass` 2×), plausible as dry tussock. Crowns are **one flat green** in day (`truck_day/forest.png`), **black cut-outs** at dusk (`truck_dusk/forest.png`), lit in the beam only at night. |
| 6 | Texture quality | 5 → 5 | Leaf cards hold at 640; no tiling visible. |
| 8 | Lighting | 5 → 5 | No lit/shade split on crowns (queued) — not addressed. Dusk translucency — not addressed. |
| 11 | Colour / atmosphere | 6 → 6 | — |
| 14 | Detail density | 5 → 7 | Plain around the pride repopulated: `lion_pride.png` near ground rows 150–288 has tuft clumps every 20–40 px; `lion_far` likewise. Consensus #6 **addressed**. |
| 15 | Environmental integration | 6 → 6 | Tufts sit on the ground; no floating cards. |

**Queued items:** plain density — **addressed** (`lion_pride`, `lion_far`, `truck_day/hero`); crown lit/shade split — **not** (`truck_day/forest`); dusk translucency — **not** (`truck_dusk/forest`, canopies black); night canopy ambient — **partly** (`truck_night/forest.png` crowns read where the beam hits; elsewhere black, ground median −1.24 st vs R2).

**Top three weaknesses**

1. **Crowns have no lit side and no dusk glow.** `truck_day/forest.png`: the near acacia's
   crown is a single green with no gradient sun-to-shade; `truck_dusk/forest.png` crown
   (400–560, 30–110) median Y 0.036 against a sky of 0.329 — 3.2 st down (R2 4.1 st),
   a black cut-out with no back-light. `src/forest.js` `foliageMaterial()` (`:906`) already has
   the knobs and they are off for the crowns: `crownGrad = 0.0` ("0 leaves the albedo
   alone; 1 is the full split, top +0.3 st warm, underside −0.7 st blue-grey"),
   `transPeak = 0.0` ("the aureole a thin leaf shows at sunset"), `transMax = 0.5`. Fix:
   for the acacia/marula crown materials pass `crownGrad: 0.8, transPeak: 1.2,
   transMax: 1.0`; the frames show the defaults.
2. **Grass reads as card.** `veg_grass` 2× from `truck_day/hero.png`: blades are single
   bright edges with no self-shadow. In `src/roadside.js` tuft material: add a vertex-AO
   gradient (0.45 at the root to 1.0 at the tip) and drop the specular; blade colour
   `0xc9b37a` toward `0x8a7a48` at the root.
3. **Crown silhouettes are plates.** `truck_dusk/forest.png` at 2×: each crown is 2–3
   planar layers seen edge-on. `src/forest.js` crown builder: add a third, tilted layer set
   (±25°) and jitter card yaw by ±30° so a side view never sees all cards edge-on.

**Regressions:** none.

**Must not regress:** plain density around the pride; tuft grounding.

---

## 7 · Lions

Frames: `lions_day/{close,face,far,medium,pride,seat,side}`, `lions_dusk/{close,medium,pride}`, `lions_walk/{lion_close,lion_medium,lion_far,lion_seat}` (512×288).

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | 6 → 6 | — |
| 2 | Silhouette | 5 → 5 | Body is still a smooth tube with tube legs (`lion_side.png` 3×); no shoulder blade, no hip point, no belly line. The maneless adult with an enlarged head (`spec.js:17-18` `head: 1.14 / 1.08`, "+8 %") reads as a **large dog**, not a lioness. |
| 3 | Geometry | 4 → 5 | Muzzle now has a brow, a nose leather and jowls with whisker dots; toes are modelled (`lion_close.png`). Ears are cupped but still oversized (`lion_face.png`: ear ~48 px tall against ~67 px between the eye centres, 0.72; a lioness's ear is about half the interocular distance). |
| 4 | Scale | 6 → 6 | Cub-to-adult right; adult head large. |
| 5 | Materials | 4 → 5 | Coat is a **short matte fur with a speckle** (`lion_face.png` flank box (300–380, 200–260): mean |dY| 0.0132, std 0.036 vs R2 0.0048 / 0.012 — three times the grain). The grain is isotropic `fbm` (`lion/textures.js:188` "none of it is directional"), so it is a mottle, not hair; there is no rim-light sheen on the back edge (`MeshPhysicalMaterial` `sheen` in `lion/index.js` reads as a faint uniform lift, not a directional highlight). |
| 6 | Texture quality | 4 → 5 | No visible seams at 512; belly/back tone split is present. |
| 8 | Lighting | 6 → 6 | — |
| 9 | Shadows | 5 → 5 | Contact decal exists and reads by day; at dusk it greys the ground rather than darkening it (below). |
| 10 | Reflections (eyes) | 2 → 5 | Amber is back: `lion_face.png` eye boxes (190–220, 90–110), (258–290, 92–114): amber pixels (hue 20–50°, sat > 0.5) 32.8 % / 28.3 % of the box, pupil black 0.3 / 10.4 %, pale ring 2.5 %. Round 2 the same region was a dark slit. They face forward and round like a plush toy's, but they are eyes. |
| 11 | Colour / atmosphere | 6 → 6 | Coat hue 25–28°, sat 0.50 in side view — slightly hot. |
| 13 | Physics / ground contact | 5 → 5 | Paws on the ground; at dusk the grey decal under them reads as a smear rather than a shadow, so the paws look set on the pan, not in it (see 16). |
| 14 | Detail density | 5 → 5 | — |
| 15 | Environmental integration | 5 → 5 | No dust on the belly or paws; the coat is clean against a red laterite pan. |
| 16 | Visual cleanliness | 6 → 5 | `lions_dusk/lion_close_dusk.png`: the contact decal reads as a grey smear under the cub (60–130, 168–180) and under the adult's forepaws (205–290, 262–276). Under the paws: patch sRGB (115,62,45) sat 0.61 vs ground beside it (134,67,34) sat 0.75 — blue channel 45 vs 34, only −0.38 st darker (round 2: −0.89 st). The decal adds grey instead of darkening. |

**Queued items:** eyes and lids — **addressed** (`lion_face`); mouth — **partly** (a modelled muzzle, but the mouth line is a straight dark seam and the jowls read canine); ears — **partly** (cupped, still oversized); saddle normals and thigh weld — **addressed** (no shading break on `lion_close`/`lion_face`); shoulder/hip masses — **not** (`lion_side`); paws — **partly** (toes modelled; black-boot tone gone; still mittens); contact blobs — **addressed by day, wrong at dusk** (`lion_close_dusk`).

**Top three weaknesses**

1. **The contact shadow greys the ground at dusk instead of darkening it.**
   `lions_dusk/lion_close_dusk.png` under the adult's forepaws: patch (115,62,45) sat
   0.61, ground (134,67,34) sat 0.75; the patch is only 0.38 st darker and its blue
   channel is 11 higher than the dirt's. A multiplicative shadow of that ground would be
   ≈ (95,47,24) at −0.5 st. `src/wildlife/lion/contact.js` `contactMaterial()`:
   `MeshBasicMaterial`, `color (0.1, 0.085, 0.075)`, `transparent: true`, default
   `NormalBlending`, `toneMapped: false`. A fixed grey-brown alpha-blended over a
   saturated dark ground pulls it toward grey. Fix: `blending: THREE.MultiplyBlending`
   (or `CustomBlending` with `blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor`)
   and `color` white with the darkening carried in the texture → the decal then only
   scales whatever the ground already is, at every hour.
2. **The body is a sausage.** `lions_day/lion_side.png` 3×: constant-radius trunk from
   chest to rump, cylinder legs, no scapula or pelvis, no belly tuck. `src/wildlife/lion/
   geometry.js` body lathe: the cross-section radii along `spec.js` bones `chest → pelvis`
   need a scapula bulge (+12 % radius at the withers, lateral only), a belly tuck (−15 %
   at 0.65 of trunk length, ventral only), and a hip point (+10 % at the pelvis, dorsal-
   lateral); leg tubes need an elbow/stifle radius step (0.8× above, 0.6× below).
3. **Fur is a mottle, not hair.** `lion_face.png` flank: isotropic speckle, no direction.
   `src/wildlife/lion/textures.js` coat grain (`:188–193`, `m0..m2` isotropic `fbm`): swap
   `m2` for an anisotropic streak `fbm(su·6, sv·60)` oriented along the body's `v`
   (the same recipe as the `streak` at `:360`) at amplitude 0.06 and feed the same field
   as a `normalMap` at `normalScale 0.35`; set `sheenRoughness 0.5`, `sheen 0.4`,
   `sheenColor` warm cream so the back edge takes a rim.

**Regressions:** Visual cleanliness 6 → 5 (`lion_close_dusk` grey contact patch, numbers above). Within one point.

**Must not regress:** amber eyes with pupils; toes; no saddle break; day contact decal.

---

## 8 · Lion feet & gait

Frames: `lions_walk/walk_00..07` (512×288, 0.96 s), `lions_walk/{lion_close,lion_medium,lion_far,lion_seat}`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 12 | Animation | 5 → 5 | Over 0.96 s: the near foreleg swings as a straight rod (no elbow break visible at 2× in frames 02–05), the hind leg reaches; head is fixed relative to the chest; tail hangs. Stride length cannot be read from a third of a cycle (tool). |
| 13 | Physics / ground contact | 5 → 6 | Leading edge of the lion mask in its lowest 8 rows (the planted lead paw), per frame: round 4 x = 207, 207, 207 (frames 00–02), then 215, 214, 214 (03–05), then 195, 158 (swing). Round 2: 224 × 4 frames, 221, then 199 × 3. Planted paws hold their pixel to within 1 px for three to four consecutive frames on a world-fixed camera in both rounds; no sink, no float at the paw. |
| 17 | Temporal stability | 6 → 6 | No pop; grass and ground pixel-stable across the strip (background diff median 0). |

**Queued items:** stride — **not verifiable** (strip too short); elbow/stifle flexion — **not**; head bob — **not**; tail — **not** (hangs straight in all 8 frames, both rounds).

**Top three weaknesses**

1. **Legs swing as sticks.** `walk_02`–`walk_05`, 2× on the near foreleg: the elbow angle
   does not change through swing. The joints exist (`spec.js:68–92` `shoulder → elbow →
   wrist → paw`, `hip → knee → hock → paw`); `src/wildlife/lion/pose.js` drives them by
   analytic IK to the wrist/hock and only folds the pastern (`SWING_FOLD = 0.45`,
   `pose.js:75`). The IK target itself barely lifts, so the elbow barely bends. Fix: in the
   swing-phase shaping (`pose.js:72–80`) raise the wrist/hock IK target by
   `0.12 · scale · sin(π·u)` and pull it back by `0.06 · scale · sin(π·u)` at mid-swing,
   so the two-bone IK has to fold the elbow (target 35–40°) and the stifle.
2. **No head bob or tail.** `walk_00..07`: head-to-chest offset constant to 1 px; tail a
   straight rod. `src/wildlife/lion/pose.js`: add `head.y += 0.02·sin(2·phase)` and a
   tail lag chain (`tail1..3` in `spec.js`) driven by `sin(phase − k·0.6)`.
3. **Strip length is a tool defect.** `tools/lions.mjs:497` `window.__sim(0.12)`: at the
   lion's walk speed 8 × 0.12 s covers ~0.35 m. Use `0.30` so eight frames cover a full
   stride and the lion actually crosses the 3.2 m frame width.

**Regressions:** none.

**Must not regress:** world-fixed camera; planted forepaw holding within 1 px.

---

## 9 · Lighting & atmosphere

Frames: all, weighted to `truck_*/hero`, `truck_night/*`, `camp_night/*`, `fleet/*_night`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 8 | Lighting | 5 → 6 | Day: shade fill (hemi 2.5) gives the camp and the truck's shaded flank a sky term; `truck_day/hero` shaded door Y readable. Dusk: key no longer blows the grille (p95 0.58). Night: the truck is lit (front pool +0.69 st mean frame, `truck_night/front`), but the world is darker — ground median `hero` −1.09 st, `road` −1.25, `mainroad` −1.51, `forest` −1.24 vs R2 — the grey-blue grade is gone and the trail beyond the beam is now near-black (Y 0.008). |
| 9 | Shadows | 6 → 7 | Penumbra ramps (`camp_mess` ~60 px); no acne visible on the lion's neck at 512 (`lion_medium`, `lion_close`) — the far-cascade item is not visible at this size. |
| 10 | Reflections | 4 → 4 | Sky in paint still a flat tone; water reflects nothing. |
| 11 | Colour / atmosphere | 4 → 7 | Hills fixed on three of four frames (table above); night Milky Way a band; camp night ground over-saturated (sat 0.42–0.55 at Y 0.02). |
| 16 | Visual cleanliness | 5 → 6 | Stars fixed (0.13 %); new: two beam-slice discs and a bloom slab in `truck_night/hero` (scored under Hero car). |

**Queued items:** stars — **addressed**; night grade and ground — **addressed** (grey-blue gone; pad Y 0.033 → 0.0065), with the caveat that the far ground is now black rather than moonlit; ground bounce — **partly** (open shade 0.4–1.7 st, pockets 2.8–3.4 st); dusk key azimuth vs aureole — **addressed** (`truck_dusk/hero.png` sky rows 0–40 by thirds: R2 0.322 / 0.379 / 0.286 (aureole camera-left), R4 0.298 / 0.378 / 0.298 (centred behind the truck); the lit face is the grille at Y 0.333 with the camera-side flank at 0.021, 4 st down — consistent with a sun beyond the nose); shadow softness — **addressed**; far-cascade acne on the lion neck — **not visible at 512**.

**Top three weaknesses**

1. **Beam slices in the sky** — see Hero car weakness 1; it is the lighting module's
   defect (`src/sky.js` `beamGeometry`, `fast.beamSlices: 12`).
2. **Night far ground is black.** `truck_night/mainroad.png` ground rows 250–360 median
   Y 0.0111 (R2 0.0317); `truck_night/road.png` 0.0084. A quarter moon lights dirt to
   Y ≈ 0.02–0.03 at this exposure. `src/sky.js:510` night `hemi: { ground: 0x0a0907,
   intensity: 0.22 }` and `:505`
   `key: { az: 140, el: 43, color: NIGHT.moon, intensity: 0.4 }`: raise the hemisphere to
   0.35 with `ground 0x2a2620` and the moon key to 0.6, keeping the beam pool where it is
   (it is already +0.69 st over R2). The comment at `:500` records that the moon sweep
   0.35–0.9 moved the near ground by ±0.01 — that was measured on the camp pad under the
   grade lift that has since been removed; the trail frames now need the moon.
3. **Roof LED bar blooms into a slab.** `truck_night/hero.png` blob at (274,73), 6850 px,
   peak luma 0.87, for a bar whose own footprint is ~600 px; `truck_night/front.png` the
   same bar is a white bar with no individual LEDs. `src/sky.js:~2717`
   `uGlareGain = cfg.beams.glare · 0.32 · (led ? 0.3 : 1)` with night `glare: 2.8`, and
   the lens emissive `0x6f6653 × 6.5` crossing the night bloom threshold (`post.js:1173`).
   Fix: LED factor 0.3 → 0.12, and give the bar's lens material an `emissiveMap` of
   discrete LED dots (8–10 across) so the bloom is a row of points, not a strip.

**Regressions:** none over one point.

**Must not regress:** star fraction 0.13 %; Milky Way as a band; hill saturation; dusk grille; shade fill; penumbra ramps.

---

## 10 · HUD

Frames: `truck_{day,dusk,night}/hud.png`.

| # | Category | R2 → R4 | Note |
|---|---|---|---|
| 1 | Composition | — (tool) → 7 | The `shots/round2/truck_*/hud.png` on disk are still the flank-framed captures (the truck's door fills 70 % of the frame); the consensus's re-shot frames are not in this folder, so round 2 is not scored here. Round 4: chase camera seven metres back on the road at all three hours, truck centred, road leading in. |
| 11 | Colour / atmosphere | 6 → 6 | Ink colour neutral; shadow layer present. |
| 14 | Detail density | 6 → 6 | — |
| 16 | Visual cleanliness | 5 → 5 | A build stamp (`build e524952 · 2026-09-04…` in round 2, `build 80cb5e6 · …` in round 4) sits bottom-right in all three hours (`index.html` `.hud-rev`, `src/hud.js:41`) — a debug element in a scored frame, both rounds. The keys legend's secondary grey (`--ink` at `opacity 0.42` in `--rest`) sits over a 0.6-luma sky in `truck_day/hud.png` and over sunlit dirt in `truck_dusk/hud.png` with only the text-shadow separating it; the bold key letters read, the grey verbs (`VIEWS`, `LOOK`, `DRIVE`) do not at 640 wide. Night `.hud-keys` opacity 0.62 (`index.html:82`) is readable and no longer competes. |

**Queued item (#8):** hints compete at night — **addressed** (opacity 0.62/0.30); vanish over sunlit dirt — **not** (`truck_dusk/hud.png` grey verbs unreadable).

**Top three weaknesses**

1. **Build stamp in a scored frame.** `truck_night/hud.png` bottom-right. `src/hud.js:41`
   writes `build ${__BUILD_REV__} · ${__BUILD_STAMP__}` unconditionally; gate it on
   `?debug` and hide `.hud-rev` by default.
2. **Legend contrast over sky and sunlit dirt.** `truck_day/hud.png`, `truck_dusk/hud.png`
   keys block. In `index.html` `.hud-keys`: add a `background: rgba(0,0,0,0.28)` pill with
   `backdrop-filter: blur(6px)` and raise `--rest` opacity 0.42 → 0.6; the `text-shadow`
   alone does not carry a grey secondary over a 0.6-luma sky.
3. **Speed readout weight.** `truck_dusk/hud.png`: the numeral is the same weight as the
   hint text. `.hud-speed` `font-weight 600 → 700`, `font-size` +20 %.

**Regressions:** none.

**Must not regress:** chase-camera framing seven metres back (`rig.snap()` in the tool); night legend opacity.

---

## Overall

### Gate verdict: **pass** (narrow), with two items to carry as blocking into round 5

- **Non-regression:** no category of any family drops by more than one point. Three
  categories drop by exactly one, each on a measured new artefact: Hero car cleanliness
  (beam discs + bloom slab, `truck_night/hero.png`), Lions cleanliness (grey contact
  patch, `lions_dusk/lion_close_dusk.png`), and — flat, but the tool's own number went
  the wrong way — glass transparency (`see` down 0.03–0.09 on 9 of 12 panes). One
  category goes up on a tool fix rather than the game (HUD composition: the round-2
  folder's frames are the flank-framed captures).
- **Round's categories (Materials, Texture quality):** up in Car glass (5 → 6), Campground
  (5 → 6), Lions (4 → 5 / 4 → 5); flat in Hero car (6 → 6 / 6 → 6), Fleet, Road &
  terrain, Vegetation. Nothing down. The materials that now read as what they are: the
  mess tarp (woven camo canvas), the camp pad and the road (dry laterite), the powder-
  coated steel bumper and rack, the door mirror (a mirror), the lion's eye (amber iris,
  black pupil). The ones that still do not: hero paint (satin enamel with no clearcoat),
  the side-pane dust (brushed metal), the interior (one vinyl), water (lighter mud),
  timber (one tone), fur (mottle), acacia crowns (flat green / black cut-outs).
- **Round-2 blockers:** #1 stars **closed** (0.13 %); #2 hills **closed on `mainroad`,
  `camp_beyond`, `pickup_0_day`**, open on `lion_far` (near ridge 0.54 of sky vs 0.72
  floor; far ridge 1.20 of sky, unchanged); #4 camp shade **half closed** (open shade at
  target, pockets 2.8–3.4 st vs 1.5–2 target, chairs readable, edge soft).

The candidate is better than the incumbent in the round's categories and does not
regress past the allowance, so it passes. It should not go a round further with the
beam discs in the first night frame or with `lion_far` still under target; both are
single-parameter fixes named above.

### Three weakest areas of the whole game

1. **Lions as objects** (Silhouette 5, Materials 5, Geometry 5): a constant-radius body,
   stick legs, isotropic coat, over-sized head and ears — a large plush dog with lion
   eyes. `lions_day/lion_side.png`, `lion_face.png`.
2. **Water and reflections** (Road & terrain Reflections 3, Lighting Reflections 4): the
   waterhole is 0.57 st under the sky and 0.03 st from the mud, with a stepped shore;
   nothing in the world shows the sky back. `lions_day/lion_pride.png`.
3. **Night world beyond the lamps** (Fleet night Lighting 5, Lighting 6): the row and the
   trail past the beam sit at Y 0.008–0.011, camp ground is a uniform sat 0.42–0.55 red,
   and the one thing that is bright is a pair of beam-slice discs in the sky.
   `fleet/ranger_0_night.png`, `truck_night/mainroad.png`, `truck_night/hero.png`.

### Single most valuable next change

`src/wildlife/lion/contact.js` + `src/wildlife/lion/geometry.js` together are the
highest-value change, but if it must be one line: **`contactMaterial()` →
`blending: THREE.MultiplyBlending`, `color: 0xffffff`.** It turns a decal that greys the
ground at dusk (−0.38 st, blue +11) into one that only darkens it, in every lion frame at
every hour, and it is the difference between a lion standing on the pan and a lion pasted
onto it.
