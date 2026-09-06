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
