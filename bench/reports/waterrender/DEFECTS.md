# Water rendering — defect log (branch `cursor/waterrender-loop-8213`)

Owner: water rendering agent (categories 9 base ocean, 10 wave physics [hero], 13 foam (compositing), 26 sun and
reflections [hero]). Files: `src/world/water.ts`, `src/render/reflection.ts`, `src/world/waves.ts` (kept literally
parallel with the shader's wind-sea / swell sets). The Water Physics Agent's branch (`cursor/waterphys-loop-8213`,
commit 3f4754b0: swell sets in `waves.ts`, `swellHeight()` in the patch vertex stage) is merged in as the base.

Method per round: OBSERVE (stills at fixed dev cameras, same seed) → DIAGNOSE (offline replica of the compose
stage where useful: `/tmp` scripts are re-created from the notes below) → IMPLEMENT → STRESS (time-of-day sweep,
altitude sweep, toward/away from the sun, clips) → COMPARE (same camera before/after) → SCORE.

Dev cameras used throughout (all `?bench=dev&…&freeze=1&seed=20260904`, 1280×720 unless stated):

| id | query | purpose |
| --- | --- | --- |
| sun10 | `cam=800,250,1000&hdg=114&pch=-18&fov=50&time=10` | toward the sun, 250 m, high sun (el 57°) |
| sun14 | `cam=800,250,1000&hdg=246&pch=-18&fov=50&time=14` | toward the sun, 250 m, high sun (el 57°) |
| sun1630 | `cam=800,250,1000&hdg=270&pch=-14&fov=50&time=16.5` | toward the sun, 250 m, sun el 24.5° |
| sun1730 | `cam=800,250,1000&hdg=276&pch=-10&fov=50&time=17.5` | toward the sun, 250 m, sun el 11° (the brown case) |
| chase1730 | `mode=chase&plane=800,250,1000,276,0,0,55,0.7&time=17.5` | the user's view: from the aircraft toward the low sun |
| low30 | `cam=800,30,1000&hdg=276&pch=-12&fov=50&time=14` | 30 m: wave stack resolved, repetition check |
| high1500 | `cam=800,1500,1000&hdg=246&pch=-35&fov=50&time=14` | 1500 m: filtered stack, mottling, no lattice |
| down300 | `cam=800,300,1000&hdg=0&pch=-88&fov=50&time=14` | straight down: body colour, no sky rim |
| night | `mode=chase&plane=-400,320,-900,318,0,0,55,0.7&time=22` | city-light reflections |

## Round 0 — observation and diagnosis (baseline = merge of lead 6130eae7 + waterphys 3f4754b0)

Baseline stills reviewed: `bench/results/iter09/{sunset,island-pass,water-landing,night,aerial-a}_still.jpg` and
the dev cameras above on the baseline build (`/tmp/waterrender/r0`).

Observed:
1. **Brown / beige glaze in the sun path** (`sunset` still, cells E5–F7 and the whole lower-right quarter of
   `sun1730`): the sun path is a broad, flat beige column with dark specks instead of a white core that
   fragments into glints; the water beside it toward the horizon is a muddy orange-grey.
2. **Night light reflections** (`night` still, C4–E4): short blobs a few pixels tall under the city; no vertical
   streaking toward the camera.
3. **Wave stack**: from 130–400 m the open water reads smooth (gust mottling only); to be audited at 30 m /
   300 m / 1500 m once the dev stills are in.

Diagnosis of (1), by replicating the compose stage (`WATER_FRAG_COMPOSE`) and the post grade (`post.ts` lift/gain,
saturation 1.16, ACES fit, gamma) for a flat-normal pixel, unresolved slope variance mss = 0.02 (the shader's
own sum of filtered layers at 250 m for 3.5 m/s, which matches Cox–Munk 0.003 + 0.00512 U):

| case | glitter BRDF·NdotL | glitter radiance (linear) | body | result sRGB |
| --- | --- | --- | --- | --- |
| 17:30, view depression 3–15° (path core) | 5–6 (cap) | ×0.25 → (4.9, 3.3, 1.9) | (0.007, 0.015, 0.03) | (255, 253, 243) white — fine |
| 17:30, depression 30° (below the core) | 0.29 | ×0.25 → (0.24, 0.16, 0.09) | (0.007, 0.015, 0.03) | **(158, 127, 103) tan/brown** |
| same without the 0.25 scale | 0.29 | (0.94, 0.63, 0.37) | | (230, 213, 179) cream |
| 17:30, 10° off the sun azimuth, depression 3° (horizon water) | 0 | 0 | sky term F=0.6 × whitened probe (0.78, 0.38, 0.22) | **(198, 142, 102) orange-brown** |
| same, F × the visible dome (1.02, 0.70, 0.54) | | | | (200, 170, 150) pale peach (what the dome shows) |

So the brown is two terms:
- the **glitter fall-off zone**: the mean glitter radiance a few sigma from the path is 0.1–0.3 × the orange sun
  irradiance over a near-black body; with the 0.25 scale left over from the pre-x6 light rebalance the whole
  fall-off zone (25–35° of view depression at 17:30: the lower third of a chase frame) sits in the tan/brown
  range of the tone curve. The sun path was also never brighter than sunlit white (peak 1.5 E, sunlit white
  1.9), so the core did not read as the image of the sun.
- the **sky reflection**: the PMREM probe is blended 65 % toward a haze/ground fill (for the diffuse IBL) and the
  water then boosted its chroma ×2.4 near the horizon to undo that; on a warm low-sun horizon the boost makes the
  reflected sky more saturated and darker than the dome it mirrors (orange-brown instead of pale peach), and by
  day the fill (warm ground bounce) greys the blue.
Not the cause: the aerial perspective (additive haze of the dome's colour, 2 % at 500 m), the ACES fit itself
(it maps a bright warm core to white correctly once the core is bright), the body colour (dark navy there).

## Round 1 — sky reflection from the analytic dome; physical glitter radiometry

Change (`water.ts`):
- `skyReflection(R, mss)`: the sky term is now `skyRadiance()` (the dome's own function, shared through
  `GLSL_SKY`, atmosphere uniforms attached by `game.ts` in one line) integrated over the reflected lobe with a
  3-point Gauss–Hermite rule in elevation (rms 2σ_slope = sqrt(2 mss)); rays sent below the horizon are clamped to
  the sky just above it; the probe's overcast grey band is kept for the `cloudy` preset. No fill, no chroma hack.
  The sun disc is not in this term (the glitter is its reflection), so the disc is no longer double counted as a
  broad warm lobe through the PMREM blur.
- glitter = E × (D F G / 4 NdotV) with no scale; cap 6 → 2.5 E (the cap only bounds bloom energy: everything past
  ~1.5 E is white after ACES); sparkle share 0.42 → 0.5 so the fall-off zone fragments into glints.
Why it reduces the defect: the path's core is now brighter than sunlit white (the image of the sun), the
fall-off zone moves up the tone curve from tan into cream and narrows (a Gaussian's band between two radiance
levels shrinks as it moves outward), and the horizon water shows the dome's own colours (pale peach at sunset,
cerulean by day, city glow at night) instead of a re-saturated grey fill.
Result (`crops/r1_sun1730_path_r0_vs_r1.jpg`, `crops/r1_chase1730_r0_vs_r1.jpg`; brown-glaze metric = share of
pixels with hue 15–50°, saturation ≥ 0.22, value 0.18–0.8 over the water region x 0.33–0.72, y 0.5–0.75 of the
frame, which excludes land and bridge):

| view | r0 brown | r1 brown | r0 white | r1 white | note |
| --- | --- | --- | --- | --- | --- |
| sun1730 (path + margins) | 4.7 % | 2.1 % | 9.9 % | 17.2 % | path core white-cream, margins cream; water beside it blue |
| chase1730 | 3.9 % | 3.6 % | 3.2 % | 5.7 % | residual "brown" is the mangrove islands and cars in the crop |
| sun1630 | 0 | 0 | 26 % | 30 % | white core of the 24° path grows: it is the image of the sun (see round 2/3 for its texture) |

The purple-pink horizon water of r0 (whitened probe × chroma boost) is a pale peach that darkens into blue
toward the camera, which is what the dome shows above it. No regression at `down300` (body colour, no rim),
`high1500` (turquoise shelf, gust mottling), `night` (dark water, city glow along the horizon).
New defect exposed by the brighter glitter (`crops/r2_sun14_r0_r1_r2.jpg`, left and middle): under a high sun
(sun14, high1500, down300) the sparkle octaves resolve as **white cotton blobs** 20–40 px across scattered over
the turquoise; at 30 m (`low30`) the crest highlights are white paint dabs. The r0 build had the same blobs at
a quarter of the brightness (pale mottling).
Perf: skyRadiance ×3 per pixel replaces one textureCubeUV lookup; A/B measured with the capture run (round 5).

## Round 2 — sparkle cells stretched along the view azimuth (REJECTED, kept in history as 932c5846)

Change: cells stretched along the view azimuth by sqrt(1 / sin(depression)) (was: along the sun's azimuth by the
sun's elevation), finest octave from 2 px with most of the share, coarse octave damped.
Result: the blobs are gone at low30 (grain in the same places, `crops/r2_low30_r1_vs_r2.jpg`), but a camera-relative
axis is wrong in perspective: cells elongated across the view azimuth project as arcs around the camera's
footprint, so the whole glitter zone at sun14 and sun1630 is combed into a **radial fan of streaks** converging
on the horizon (`crops/r2_sun14_r0_r1_r2.jpg` right), and the sunset path lost its fragments to an airbrushed
column (`crops/r2_sun1730_r1_vs_r2.jpg`). The texture also morphs in every turn. Rejected on shape.

## Round 3 — sparkle cells are crest segments of the wind sea

Change: the cells are world-fixed and wind-aligned, 2.5× longer along the crests than across (a short-crested
sea); the pixel footprint that picks the octave is measured in that metric. No camera term at all: the frame's
foreshortening flattens the cells into the thin horizontal dashes of a sun path seen from altitude (what a
photograph shows: crest segments of 5–15 m waves foreshortened to a few pixels tall), leaves them ovals on steep
near water, and points them at the horizon where the crests run away from the camera. Same 2 px finest octave.
Why: glitter texture at altitude is set by the wave field (crest-aligned bands), not by the camera; a world axis
also makes the pattern stable under camera motion (no morphing, glints only move with the water).
Result (`crops/r3_sun14_r2_vs_r3.jpg`, `crops/r3_high1500_r1_vs_r3.jpg`, `crops/r3_low30_r1_vs_r3.jpg`,
`crops/r3_sun1730_r1_vs_r3.jpg`): the fan is gone; the high-sun glitter zone is a field of short crest-aligned
dashes (they slant with the ESE wind in the WSW views, which is right); the 1500 m cotton became crest-aligned
strokes; the 30 m dabs became clusters of dashes. Accepted. Two texture defects remain and are the next round:
- **30 m**: the finest cell is 0.7 m, which at 70 m range is 6 × 36 px, so a glint is still a dab, not a point;
  the footprint there allows 0.2 m cells.
- **250–1500 m**: the coarse cells (10–50 m, 25–110 m along the crest) carry half the slope variance, so they
  paint 30–100 px white strokes; real waves longer than the spectral peak (≈ 0.5 U² ≈ 6 m at 3.5 m/s) carry
  almost none of the slope variance, and the sun path at 17:30 has become an airbrushed column with no
  structure across it at all (the resolved wind-sea sets are footprint-faded 1 km out, so nothing modulates
  the lobe there).

## Round 4 — mirror reflection tilted by the sparkle facets (defect 3, night streaks)

Observed (`night`, r0 = r1, crop of the shoreline under the towers): the city's reflection is a row of pale
grey rounded blobs ("teeth") a few pixels below the waterline, brighter and greyer than the towers themselves
(the lit windows average to grey through the mip chain, then the streak filter smears them into 3:1 ellipses);
no vertical streaking of the lights along the waves.
Change (`sceneReflection`): the wave normal is tilted by the same sparkle slope field the glitter uses
(`sparkleSlope`, factored out of `sunGlitter`), before the mirror ray is built, so the light of a distant window
lands on the cells whose facet points at it: a column of glints scattered along the wave slopes over the mirror
image, moving with the water, instead of one soft blob; the residual (unresolved) variance sets the streak
filter; the lookup displacement bound goes 0.08 → 0.25 of the image (a light's glints do reach that far).
Evaluated only where the coarse mip of the reflection shows something within reach (one extra tap), so the cost
lands on the pixels under reflected objects.

## Round 5 — sparkle octaves follow the slope spectrum; roughness bunched by the wave groups

Change: each octave's share of the slope variance is 0.12 (the equilibrium range puts about the same slope
variance in every octave from the spectral peak down to the capillaries), tapering to zero for cells longer than
the spectral peak (0.5 U²: 6 m at 3.5 m/s, 18 m at 6 m/s); the octave floor drops from 0.7 m to 0.175 m; the
unresolved roughness is modulated ×0.55–1.45 by a wave-group noise (40 m along the wind × 16 m across,
travelling at the group speed, faded out once a pixel covers 8–20 m).
Why: from 30 m the 0.2–0.7 m cells now carry a third of the unresolved variance and glint as points; from 1500 m
the 10–50 m cells carry almost none, so the altitude view is grain and gust mottling; and the group modulation
is the term that breaks a sun path's margins into streaks across the waves with darker water between them (a
rough cell reaches the sun from farther off the path than a glassy one), which is what the resolved sets cannot
do 1 km out.

## Round 6 — footprint fade along each set's own wave vector

Observed (`low30`, r3/r5): the mid-distance (100–400 m) at 30 m altitude went oily: the wind-sea sets were faded
out by a footprint measured along the view (the pixel's long axis), although their crests run across the view
and are still 3–4 px apart there.
Change: `footAlong(k, dx, dy)` = the pixel's extent along the set's wave vector; every set (swell, wind, chop)
fades on that, so a set whose crests run across the view stays resolved to the distance where its wavelength
really reaches the pixel size, and only sets seen along their crests leave early.
Result (`crops/r7_low30_r3_vs_r7.jpg`, right): the mid-distance shows the wind sea as fine dashes/ripples out to
the horizon band; the highlight dabs of r3 are clusters of 1–3 px glints.

## Round 7 — streak filter of the mirror image (night)

Observed (`night`, r4–r6, `crops/r7_night_teeth.jpg`): the towers' reflections were hard-edged pale teeth: a
sharp silhouette of the tower's mirror image filled with a flat blur, brighter than the towers themselves.
Change (r7, `uReflTune`): streak per unit rms slope 0.38 → 1.2 (Cox–Munk 1.41; the measured distribution is
peaked, so a little under), cross-blur = the across-spread instead of half the streak, taps one footprint apart,
as many as the streak needs (≤ 13, Gaussian), the image fade moved to streaks of 0.35–0.8 of the height.
Result: no change in shape: the teeth got bigger and flatter. A debug view of the kernel (`crops/r7_night_kernel_debug.jpg`,
R = share of the mirror distance beyond the surface, G = streak, B = lod) showed why: all three are
step functions of the *pixel's own* mirror hit (the tower's texels read share 0.3, the sky next to them share
0.05 from the sky fallback), so the kernel is long inside the silhouette and 3 texels outside it. The blur
has the right length; it is applied on the wrong side of the silhouette (a gather set by the receiver, where the
physics is a scatter from the source: a window's light lands on the water below *and above* its mirror image).
Also confirmed in the debug: the share of a tower window is y / (H + y) (window height over camera height plus
it), 0.24–0.5 from 320 m, not ~1 — from an aircraft the streaks are compact; from a beach they are the long
pillars of the photographs.

## Round 8 — scatter kernel over a share pyramid

Change (`reflection.ts`, `water.ts`): the resolve pass writes a second target, the share 1 − wp/wq of every
texel's mirror distance beyond the surface (premultiplied by the coverage), and builds the same Gaussian pyramid
over it; a coarse tap of it gives the mean share of the objects in the tap's footprint. The water's kernel: the
reach is 1.5 × the rms streak of the mean share in reach (top level, ×1.5 so the taller objects of a mixed
footprint keep their tails), 6 taps a side one quarter of that rms apart; each tap reads the share of its cell
and is weighted by *its own* Gaussian (light of a source conserved whatever its streak: 0.4 step/σ e^{−½(y/σ)²}),
its colour read at the level of its own across-spread (floored at half the spacing so the taps tile). The
wave-tilt displacement of the lookup uses the share of the reach as well, so it is continuous across silhouettes.
No per-pixel depth reads any more (were 8), and open water leaves after one top-level coverage read (the r7
kernel ran its taps on every water pixel).
Why it reduces the defect: a sky pixel below a tower now gathers the tower's light with the tower's streak, so
the reflection is a soft column fading out at ±1.5 rms with no silhouette; a hull's reflection (share 0) keeps
its edges because its own taps have a 0.6-texel σ.
Cost: 2 reads (gate) + 13 × (share + colour) in the reach of a reflected object; the reflection pass renders one
more 640 × 360 resolve and 6 small pyramid levels (+7 draw calls).
Checked offline before the capture (1-D replica of the kernel and the pyramid, `/tmp/waterrender/kernel_sim.py`:
a 60-texel object over sky): share 0 → extent 149–211 (its own), share 0.05 → ±6 texels soft, share 0.3 → a
smooth column 111–255 with a largest texel-to-texel step of 0.03 of the peak, energy 59.1/60. The same replica
found that the single top-level read cut the streak of a share-0.8 object at a quarter of its peak (a 0.1 step:
the top texel's footprint is shorter than that streak), so the gate reads the top level at the pixel and one
longest-streak up and down (9c5f6e34): share 0.8 → 55–313, largest step 0.005; share 1 → 86 % of the energy
(the ±1.5 rms truncation).

## Round 9 — cumulus mirrored in the sky term

Observed (iter09 technical critic on `aerial-a`, and every partly cloudy still here): "clouds at E1–F2 leave no
reflection under them on the water": the sky term is the analytic dome (round 1) and the environment probe
before it was "analytic sky only", so no version of the water has ever mirrored a cumulus; only a closed deck
was represented, as a uniform grey band.
Change (`skyReflection`): the lobe's centre ray is carried to the cloud base plane and the shared 2D cloud
field (`cloudFieldRaw`/`cloudThreshold`, the field the dome's raymarch and the ground shadows use, with the same
wind offset) says whether a cloud hangs there; the sky is blended toward the colour of a lit base (first the
deck's grey, horizon luminance × 1.15, then × 0.8; replaced in round 10 by the dome's own base lighting) by that
coverage × the haze extinction of the path up to the base; the field's edge ramp is widened by the lobe's
footprint on the base plane (chop blurs the mirrored
cloud). One field evaluation per pixel, skipped where the sky term weighs under 6 % of the pixel (steep views:
Fresnel), where the ray is within 2.3° of the horizon (haze band anyway), and in clear presets (uniform gate).
The overcast band stays as the floor (`max`), so the cloudy preset's look is unchanged.
Why: a cumulus over water is mirrored as a bright patch under itself on every real sea; it is the most visible
sky feature the water can carry after the sun path, and the field is exactly the one the visible cloud has, so
the patch sits under its cloud and drifts with it.

## Round 10 — the mirrored base in the dome's own light

Observed (reasoning over the dome's shader, before the round 9 captures landed — the slot queue held them): the
sky dome lights a cloud sample with `skyAmb · aoSky + gndAmb + lightCol · lt` (`sky.ts`: the sky's ambient
occluded by the column above, the world's bounce plus the sun-side haze at a low sun, and the sun that leaks
through, 5–25 % of it at the base of a tower, most of it when a low sun reaches the bases from below). At a 30°
sun that puts a lone cumulus base near (0.43, 0.45, 0.48) linear — 1.6 × the horizon luminance, brighter than the
horizon sky, as the visible bases in every 14:00 still are — while round 9's mirrored base was a *neutral grey at
0.8 × the horizon luminance*: darker than the sky around it, and at 17:45 a grey cut-out in a salmon sky whose
clouds the dome lights pink from below.
Change (`skyReflection`): the lone base's colour is the dome's formula at the mean values of a base (`aoSky` 0.4,
`lt` 0.13 under a high sun rising to 0.5 at a low one, the same `lowSun`/`nightMix` ramps as `sky.ts`), from the
shared atmosphere uniforms (`uSunColor`, `uZenithColor`, `uHazeColor`, `uSunHazeColor`); a closed deck keeps the
probe's 1.9 band. No extra texture reads.
Why it reduces the defect: the water mirrors the cloud the player sees, in the colour the player sees it — a light
neutral grey by day, salmon at sunset, blue-grey at dusk — instead of a second, unrelated shade of grey.
Evidence to capture: `low30` (three cumulus over the bridge at 14:00, r7 without any cloud term vs r10),
`tod1745`, `aerial-a` (cloud and its mirror in one frame), `cloudy` (the deck: unchanged).

## Audit — repetition in the wave stack (defect 2), offline

The numpy port of the resolved slope field (`tools/wavefield.py`: the four swell sets with their phase warp and
groups, the three wind-sea sets, the three noise chop layers, the capillary sets, the lanes and the gust field,
open deep water at 3.5 m/s) was autocorrelated over three squares (`tools/repeat.py`, Hann window, lags up to a
quarter of the extent): a lattice or synchronised crests would put a secondary peak of 0.5–1 at the repeat
vector. Found: 400 m at 0.5 m/px, largest |correlation| beyond 8 m 0.13 (at 12 m, the 11.6 m set's own period);
2.4 km at 2.5 m/px, beyond 60 m 0.10; 8 km at 8 m/px, beyond 300 m 0.11; ring means 0.014–0.046 everywhere.
The sets' wavelengths (340 / 83 / 51.3 / 33.7 / 14 / 11.6 / 7.1 / 5 / 4.7 / 3.4 / 2.15 / 1.7 / 1.3 / 0.5 m) and
headings are incommensurate and each carries a noise phase warp, so nothing beats into a grid. In the stills at
30 / 300 / 1500 m (r7 `low30`, `chase30`, `down300`, `high1500`; r9/r10 `chase30`, `aeriala`) no lattice is
visible either; motion is checked with the 24-frame `water-landing` clips of the base and final builds (flicker
metric, below).

## Round 11 — the mirrored cloud footprint from the sky's own bake

Observed (cost audit of round 9, offline): `cloudFieldRaw` is three `fbm3` and two 9-cell Worley evaluations
(~550 ALU) per grazing water pixel with the sky term above 6 % — most of the water in a low view — on top of the
one the post pass already spends on the cloud shadows; against the +10 % shader budget that is the largest single
cost this branch added, and the A/B under a load of 10 on 4 cores cannot resolve it (round 7 quads spread
0.3–2.0).
Change (`sky.ts` +6 lines: `Sky.coverageField` exposes the raymarch's own 1024² bake of the raw field, 76 km
around the camera in cloud space; `water.ts`: `uCloudFieldTex/Center/Extent`, one `texture2D` in place of the
field evaluation; `game.ts` one line: `attachCloudField`). The bake is what the visible cloud's base footprint
is thresholded from, so the mirror now follows the visible footprint exactly (the analytic field and the bake
differ only by the bake's 74 m filtering). Look unchanged otherwise: r10 vs r11 `low30` is the check.

## Results of the round-11 captures (landed after the cut-off; `/tmp/waterrender/r11`, `perf/`)

Ten r11 stills, 0 console errors each. Interleaved A/B (base 4510 = r0 vs r11, 6 rounds ABBA, 12 frames a side):
`night` median ratio 1.004 (min-frame 1.052), `sun1730` 0.989 (1.056), `waterlanding` **1.503 (min-frame 1.173)** —
the water-landing view was over the +10 % budget. Base clip `waterlanding` had 1 error (the r0 build's `patch`
GLSL reserved word in wakes.ts, fixed since), the r11 clip 0. Cause of the water-landing cost, by reading the
kernel: the first gate of `sceneReflection` reads the pyramid's top level, whose texels are a tenth of the image,
so around the aircraft's mirror image and the shore's horizon band most of the water passed it and ran the sparkle
field plus 13 taps × 2 texture reads (SwiftShader's filtered reads are the expensive instruction here).

## Critic h03 (`bench/reports/critics/h03/visual-2.md`, build 7fe5d685 = this branch at 7ab21f54, after round 10)

| # | finding | camera / cells | diagnosis (this round) |
| --- | --- | --- | --- |
| 1 | REGRESSION: sunset sun path truncated (h00 ran to the frame bottom) | sunset E2–F4 | see round 12: the unresolved floor was a tenth of the short-wave variance; the drawn chop at 7 m/s held 3× a whole sea's variance |
| 2 | REGRESSION (flag): grazing water cyan → deep blue | glass G5–H8, aircraft_rear A7–D8 | the analytic sky term mirrors the dome's mid-elevation blue (the PMREM horizon band was whiter); round 13 |
| 3 | no local reflections (aircraft, piers, towers) | aircraft_rear C6–F8, highway_bridge E6–F8, city_200m G5–H6 | at 40–45° depression F ≈ 0.022: a pier's mirror is 1 % of the frame's radiance (physical); at the low cameras F ≈ 0.2–0.3 and the aircraft should show — debug output `wdbg=3` this round |
| 4 | glint speckle; one ripple frequency | shore_beach E4–H5 | not glitter (the half vector there needs a 1.0 rad slope): the noise chop layers were drawn only while undersampled, 1.2–3.5 px per cell, mirroring the horizon haze as a fine white speckle; round 12 |
| 5 | water shadows black, hard, structureless | aircraft_rear A6–H8, highway_bridge A4–D7 | the shadowed body is skylight (14 % of the irradiance at clear noon: `uSunShare` 0.86) plus the 0–45 % leak; the sky term at 45° is 2 % — a clear-water shadow is dark; structure inside it is the bed; round 13 |

## Round 12 — the never-resolved short waves; chop variance linear in the wind; noise layers faded before they alias; cheaper mirror gather

Observed: h03 `sunset` (7 m/s, sun el 5.7°, camera 290 m): a broad bright band from the horizon to ~12°
depression, dark blue-purple water below, no glitter in the foreground; h00 had a grainy path to the frame bottom.
h03 `shore_beach`: fine white speckle over all the water in the lower half (the sun is 72° off the view: not
glitter). h03 `glass`, `aircraft_rear`: the near water shows the 0.5 m and 1.7 m chop as crisp ripples, the far
water is speckled.

Diagnosis (offline, `tools/path.py`: the analytic glitter of `sunGlitter` along the sun's azimuth against the view
depression with the round-11 and round-12 bookkeeping of the unresolved variance):
- The unresolved variance the glitter lobe is built from is the sum of what the footprint fades take out of the
  drawn layers plus a floor. The floor was `0.002 + 0.003 windG · shelter` ≈ 0.0055 at 7 m/s, i.e. a lobe 2.4° wide
  (1σ per axis) where every drawn layer is resolved. Cox and Munk's clean-surface fit is 0.003 + 0.00512 U; their
  slick-surface fit 0.008 + 0.00156 U; a slick damps just the waves under ~30 cm, so those hold 0.00356 U − 0.005:
  0.0074 at 3.5 m/s (a third of the sea's variance), 0.020 at 7 (half). Nothing drawn is shorter than the 0.5 m
  layer, so that variance is never resolved and must stay in the lobe at every distance. With a tenth of it, the
  path at 22–36° depression (the sunset's foreground needs 0.14–0.27 rad of slope) fell to e^−5 of its peak.
- The three noise chop layers had slope amplitudes ∝ windG, i.e. variance ∝ windG²: at 7 m/s a1² + a2² + a3² =
  0.053 against 0.039 for a whole sea (Cox–Munk), 0.13 at 10 m/s. The far field of the sunset was a lobe of
  σ ≈ 0.26–0.38 rad (gusts and groups on top): the broad diffuse band. Slope variance grows linearly with U.
- The layers faded on the pixel diagonal `foot` between 5 and 2.3 px per L, but their cells are L/stretch along the
  wind (7 / 2.8 / 1.2 / 0.31 m for the 14 / 5 / 1.7 / 0.5 m layers), so each was drawn only through 1.2–3.5 px per
  cell: undersampled slopes, i.e. a per-pixel random normal that mirrors the bright horizon haze in a fine white
  speckle wherever the sky term is large (the shore_beach lower half at 0.1–0.25 m/px is exactly the 0.5 m layer's
  fade range). Their variance was booked as resolved while what they drew was noise.

Change (`water.ts`):
- `mssS += max(0.02136 windG − 0.005, 0.0015) · mix(0.4, 1, 0.6 o1 + 0.4 open) · smoothstep(0, 0.5, depth)` in
  place of `0.003 windG mix(0.3, 1, open)`; the 0.002 slick floor stays in `mss`.
- `windA`: the chop amplitude factor follows the slick fit above the clear preset's 3.5 m/s (`0.583 sqrt((0.008 +
  0.00936 windG) / 0.01346)`, = windG at 0.583; below it unchanged). Far-field totals (gust 1): 3.5 m/s 0.027
  (was 0.021; CM 0.021), 7 m/s 0.048 (was 0.065; CM 0.039), 10 m/s ~0.08 (was 0.13; CM 0.054).
- `noiseFade(L, stretch)`: per-axis fades on the cell sizes (feature = cell / 1.5, the sets' 10 → 4.5 px rule):
  the 5 m layer now leaves between 0.19 and 0.41 m of along-wind footprint (was 1.0–2.2 m of diagonal), the 0.5 m
  layer between 0.021 and 0.046 m (was 0.1–0.22). The lanes (value noise, 1.8 m cells across the wind) fade on
  2.4 m; the group roughness modulation on its 40 × 16 m cells. The 14 m and 5 m layers keep being evaluated (for
  their value, which groups and bends the sets under them) while those sets are drawn: a set drawn with its warp
  frozen at 0.5 would have run straight (the lattice risk of the audit above).
- Replica (`tools/path.py`, 7 m/s, gust 1): analytic path at depression 14 / 18 / 22 / 26 / 30 / 36°: r11
  1.6 / 0.98 / 0.58 / 0.34 / 0.20 / 0.07 → r12 2.4 / 1.36 / 0.75 / 0.41 / 0.21 / 0.07 × E (capped at 2.5). The far
  field (σ 0.22 rad instead of 0.26) is the narrower band; the resolved wind sea and the group modulation break it
  across the waves as before. At 3.5 m/s the path is unchanged to 18° and 2× brighter at 36°.
- `sceneReflection`: a second gate at the gather's own place and size — after the flat-mirror lookup point and the
  reach's streak are known, one read of the share pyramid's coverage at `lod = ceil(log2(3 σ_L))` (a cell the size
  of the whole gather plus the sparkle tilt) exits where every tap below would find nothing; the sparkle field is
  evaluated after it. Taps 0.375 rms apart, four a side (a Gaussian summed at that spacing is within 10⁻³ of its
  integral; the colour read's lod floor of half the spacing still tiles the streak).
- `WATER_DEBUG` from the URL (`wdbg=1..6`): the diagnosis outputs no longer need a rebuild.

Expected: the sunset path continues to the frame bottom as an orange band broken across the wind sea, narrower at
the horizon; the shore_beach lower half loses its speckle and shows the 3.4 / 2.15 m sets and the 1.7 m chop
resolved (0.1–0.25 m/px is inside their range); the water-landing frame cost back within budget.

## Round 13 — Fresnel inside the sky lobe, per node; the low node held at the horizon

Diagnosis of the grazing colour (finding 2), first pass: at a low camera the sky term is the lobe integral over
facets tilted ±d (d = √3 · √(2 mss): 18° at the clear preset's far field), weighted by one Fresnel of the mean
normal times an ad hoc ensemble drop. A facet tilted away from the camera meets the view ray less obliquely and
reflects less, one tilted toward it more; the lobe's low node, sent below the horizon, read the dome's below-horizon
fill. Change (`skyReflection` → vec4): Schlick per Gauss–Hermite node for the facet that reflects V into that
node (`fresnelNode`), the mean Fresnel `fw` returned and used as the body's loss; the low node clamped at the
horizon (a facet tilted away by more than the view elevation is masked by the wave in front) and given 0.7 of the
horizon sky (the sea mirrored a second time), fading in over the 3° below the horizon. Compose: `body (1 − F) +
sky_weighted + glitter`; the mirrored scene takes `F` as its weight. Cache key water-v19. (Evidence: h15.)

## Evidence from the hourly snapshot h14 (build with round 12, 23:17–00:35; `progress/shots/h14` once published)

The hourly integration frames are the progress cameras on the merged lead; with the capture slots contended for
hours by other builders' sessions they are this branch's steadiest evidence (h13 = round 11, h14 = round 12).
- `sunset`: the path is a solid column from the horizon through the bridge to the aircraft's wing (h13: it ended at
  the bridge); below the wing a smooth orange glow with soft crest-aligned streaks fades to the frame bottom — no
  discrete glints (h00 had glints to the bottom). Profile down the sun's azimuth (sRGB, h14 vs h00): y 480 70/52/65
  vs 76/55/66; y 570 66/49/63 vs 78/57/64; y 630 61/54/79 vs 79/65/83 — the same mean, none of the sparkle.
- `aircraft_rear`, `glass`: the fine speckle is gone; the near water shows the chop as smooth facets (finding 4
  closed for the speckle). The water is a deep navy at every angle; the wing's shadow covers the whole foreground
  of `aircraft_rear`; no mirror image of the aircraft is readable.
- Depth at the marina (`WorldMap.heightAt`, bundled with esbuild): −2.6 to −3.0 m under and around the aircraft and
  the cameras of both views; `shore_beach` camera −4.65 m.
- The h13 → h14 darkening of the shadowed side of the aircraft and of the water under the wing (−40 % in both) is
  the lead's lighting round 5 (df8b092d: a cloud's footprint now removes the whole direct share; a cumulus shades
  the marina in this frame), not the water.

Diagnosis of the grazing colour, second pass (the depth above, the body model as coded): with K = (0.9, 0.23,
0.18) /m the 3 m bed at a 25° depression (view path 4.1 m, sun path 3.2 m) returns T = (0.002, 0.20, 0.28) of its
light — the body is Rinf (deep-water blue) with a fifth of the sand's green on top: navy. At 5° depression the
path is only 1.5× the vertical one (refraction), so the bed's light is not what a grazing angle loses; Fresnel is,
and the sky the lobe mirrors (the dome's mid-elevation blue) is darker than the horizon band. Jerlov's type III /
coastal 1 water attenuates 0.42–0.5 /m at 650 nm, 0.12–0.15 at 550, 0.1–0.15 at 450: the coded K was coastal type
3 in the green and off the scale in the red. The h00 cyan at these cameras came from the old environment-map sky
term (a chroma-boosted, whitened probe) — the body was the same; the regression is that a physically darker sky
term exposed a body that was too absorbing for the water it stands for.

## Round 14 — glint count statistics on the sun path (finding 1: the foreground glitter)

Observed: h14 `sunset` foreground is the analytic mean of the lobe — a smooth glow; h00's foreground glitter was the
undersampled chop layers (a random per-pixel normal) that round 12 stopped drawing.

Diagnosis: the analytic lobe is the mean over infinitely many facets. The facets that mirror the sun's disc are
centimetre facets whose normal lies within the disc's angular radius / 2 of the half vector (1.7e-5 of slope space,
a few cm² each): the expected number in a pixel is λ = P · 1.7e-5 / 4e-4 m² · A_px = P · 0.0425 A_px. Replica
(`tools/path.py` bookkeeping): sunset core (2–8° depression, 2–8 km) λ 15–950; the bridge (14–18°) λ 1–2.6; the
foreground (22–36°) λ 0.04–0.5; a 60 m camera at 100–350 m λ 0.02–0.05 everywhere in the path; 1500 m λ 5–116. A
pixel with λ ≪ 1 either holds a glint or not: the margins of a path seen from altitude and the whole path of a
near view are discrete sparkles over darker water, the core of the sunset path is a solid band — the look of every
photograph, and of h00 by accident.

Change (`sunGlitter`, `sparkleSlope`): the analytic radiance × a lognormal gain of mean one, exp(c g − c² / 2),
g a unit-variance zero-mean process of the two finest sparkle octaves (world-fixed crest segments, phase rate of
their wave period, cross-faded by √w), c = min(1 / √λ, 1.2). Nothing changes where λ ≫ 1 (c → 0). The cap keeps the
water between glints at ≥ 0.5 of the mean and a glint ≤ ~4× it (7 % of the pixels > 3× at c = 1.2). Cache key
water-v20. Cost: two value-noise reads per octave where the glitter is evaluated.

## Round 15 — clear shelf water; more of the beam scattered in under a shadow (findings 2, 5)

Change (`water.ts`): K = (0.7, 0.15, 0.11) /m (type III / coastal 1). Body reflectance R = bed T + Rinf (1 − T),
sand bed 0.52/0.49/0.42, replica: nadir 2.7 m (path 5.5 m) (0.041, 0.205, 0.261) → (0.048, 0.27, 0.306); nadir
6 m (0.038, 0.117, 0.196) → (0.038, 0.157, 0.234); nadir 10 m (0.038, 0.098, 0.174) → (0.038, 0.113, 0.19); the
marina at 5° depression (path 6.9 m) (0.038, 0.175, 0.24) → (0.04, 0.236, 0.286). The shore gradient keeps its
shape (the bed still vanishes by 10–12 m) and reaches ~2 m deeper; the swash zone shows more of the sand's warmth
(T_red at 0.5 m 0.39 → 0.48). The shadow leak `0.45 (1 − e^(−depth / 2.5))` → `0.55 (1 − e^(−depth / 2.2))`: over
the 3 m bed 0.31 → 0.41 of the beam; with the clearer water the bed's grain stays readable in the shadow. Cache
key water-v21. Risk: the protected top-down turquoise brightens by a quarter over 2–4 m beds; to be read in h16
(`island_pass`, `shore_beach`) against h14/h15, reverted or halved if it reads pale.
