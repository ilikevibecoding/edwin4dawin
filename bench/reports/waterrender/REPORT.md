# Water rendering — report (branch `cursor/waterrender-loop-8213`)

Owner: water rendering agent. Rubric categories genuinely affected: 9 (base ocean), 10 (wave physics, hero),
13 (foam: compositing only), 26 (water sunlight and reflections, hero). Files changed: `src/world/water.ts`
(shader: sky reflection, glitter, sparkle field, mirror reflection filter, set fades, roughness modulation),
`src/render/reflection.ts` (streak tuning), `src/game.ts` (one line: the water receives the atmosphere uniforms),
`src/render/wakes.ts` (one rename: a reserved GLSL word that broke the splat shader, see below). The wave sets
and `waves.ts` are unchanged, so the CPU/GPU parity of the flight model holds (no flight-harness run needed).

Defect log with per-round evidence: `DEFECTS.md`; crops in `crops/` (labelled r<round>_<view>_<before>_vs_<after>).

## What was visibly wrong (round 0 observation)

1. **Brown / chocolate glaze in the sun path from the aircraft** (hero 26). At 17:30 the sun path was a broad
   flat beige column with dark specks and the horizon water beside it a muddy pink-orange; from the chase camera
   the whole lower third of the frame sat in the tan range. Diagnosed with an offline replica of the compose
   stage and the post grade as two terms: (a) the glitter radiance carried a 0.25 scale left over from a light
   rebalance, so the fall-off zone of the sun path (a few sigma off the specular direction, i.e. most of a chase
   frame at low sun) was a mid-tone orange over a near-black body — exactly the brown band of the tone curve —
   and the path core never exceeded sunlit white, so it did not read as the image of the sun; (b) the sky term
   sampled the PMREM probe, which is blended 65 % toward a warm ground fill for the diffuse IBL, and then boosted
   its chroma ×2.4 to compensate: on a warm horizon that made the reflected sky more saturated and darker than
   the dome it mirrors (orange-brown instead of pale peach); by day it greyed the blue.
2. **Glitter texture**: at a quarter brightness the sparkle octaves were a pale mottling; at the physical
   brightness they became white cotton blobs 20–40 px across under a high sun (sun14, high1500, down300) and
   white paint dabs at 30 m.
3. **Night reflections**: the city reflected as a row of pale grey rounded blobs a few pixels under the
   waterline; no vertical streaking of the lights along the waves.
4. **Mid-distance texture at 30 m**: oily, because every wave set faded on the pixel's along-view stretch even
   when its crests ran away from the camera and were perfectly sampled across the screen.
5. A GLSL ES 3.00 reserved word (`patch`) in the merged wake splat shader made that program fail to compile and
   logged a console error in every view (the console budget).

## What changed (concrete)

- **Sky reflection from the analytic dome** (`skyReflection`): `skyRadiance()` of the sky's own shader,
  integrated over the reflected lobe with a 3-point Gauss–Hermite rule in elevation (rms 2σ of the unresolved
  slopes), rays below the horizon clamped to the sky above it; the overcast band of the probe is kept for the
  cloudy preset. No ground fill, no chroma hack. `game.ts` shares the atmosphere uniforms with the water.
- **Physical glitter radiometry**: radiance = E × (D F G / 4 N·V) × N·L with the CSM sun's irradiance and no
  scale; cap 2.5 E (bounds bloom energy only).
- **Sparkle field** (`sparkleSlope`, shared by glitter and mirror reflection): world-fixed cells aligned with
  the wind and 2.5× longer along the crests (a short-crested sea), so the frame's foreshortening flattens them
  into the horizontal dashes of a sun path seen from altitude and the pattern never morphs with the camera;
  cells from 0.175 m; each octave holds the share of the slope variance the sea puts in waves of its size
  (0.12 per octave through the equilibrium range, none beyond the spectral peak ≈ 0.5 U² m).
- **Roughness bunched by the wave groups**: the unresolved slope variance is modulated ×0.55–1.45 by a
  40 × 16 m noise travelling at the group speed (faded once a pixel covers 8–20 m), which breaks a sun path's
  margins into streaks across the waves with darker water between them and mottles the far sky reflection.
- **Mirror reflection** (`sceneReflection`): the wave normal is tilted by the sparkle facets before the mirror
  ray is built (a light lands on the cells whose facet points at it: a column of glints over the mirror image,
  near reflections shatter at their edges); the residual variance drives a streak filter of physical length
  (1.2 × rms slope, was 0.38) whose cross blur equals the across-spread instead of half the streak, with as many
  taps as the streak needs one footprint apart (Gaussian, normalised, up to 13); the image fades only for streaks
  of 0.35–0.8 of the height so a city's lights keep their columns.
- **Set fades along the wave vector** (`footAlong`): each set leaves on the pixel's extent along its own wave
  vector, so sets whose crests run away from the camera stay resolved across the screen.
- `wakes.ts`: `patch` → `wwPatch` (compile fix only).

## Why it improves realism

The sun path's core is now brighter than sunlit white, which is what the image of the sun is, so the tonemapper
takes it to white and only the outer fall-off keeps the sun's hue (cream at sunset, never brown); the horizon
water shows the dome's own colours. Glitter texture follows the wave field, not the camera: crest-aligned
dashes that get finer with distance and stop being drawn at all beyond the spectral peak, so the sea from
1500 m is grain and gust mottling. Distant lights reflect as long soft columns of the right length and width
(Cox–Munk geometry: full tilt in elevation, tilt × sin(grazing angle) across) instead of hard blobs.

## Evidence

See `DEFECTS.md` (per round, with the glaze metric) and `crops/`. Final-state stills: `/tmp/waterrender/r7`
copied to `crops/r7_*` and `/opt/cursor/artifacts/waterrender_*`.

## What remains weak (self-criticism)

- The core of the sun path at 16:30–17:30 is a saturated white area a good part of the frame wide; that is the
  radiometry of a 3.5 m/s sea (Cox–Munk mss 0.02) with an exposure set for the land, and a camera does the same,
  but a human eye keeps texture in it. The structure now lives in the margins (group streaks, dashes).
- The mid-distance at 30 m is still soft: the noise chop layers have no sharp crests, and the short sets fade at
  10–4.5 px per wavelength for moiré safety.
- The wave stack itself was not changed (owned jointly with the physics agent; their swell sets are in); no
  lattice was found at 30/300/1500 m in stills, but the clip audit (motion) is limited by capture throughput.
- Shallow water (caustic filaments, bed, refraction) was reviewed only in stills at the island pass; no change.

## Performance

Shader cost: the analytic sky term is three `skyRadiance` evaluations per water pixel in place of one PMREM
lookup; the sparkle field is evaluated only inside the (widened) glitter lobe and under reflected objects; the
group noise is one value-noise per pixel; the streak filter is up to 13 taps only where the mirror sees an
object. Interleaved A/B ratio: see the perf section of `DEFECTS.md` (last round).

## Self-scores

| category | before (critics, iter09) | now (self) | basis |
| --- | --- | --- | --- |
| 9 base ocean | – | – | see DEFECTS.md final round |
| 10 wave physics [hero] | – | – | |
| 13 foam | – | – | compositing unchanged; foam shaded by the diffuse irradiance (grey in shadow) |
| 26 sun and reflections [hero] | – | – | |

## Highest-value next attack

Sharp-crested short waves in the 30 m mid-distance (a Gerstner sum for the 1–5 m band with an anisotropic fade)
and the caustic/refraction pass for the near shallows.

## Failed / reverted candidates

- Round 2 (932c5846): sparkle cells stretched along the view azimuth — a camera-relative axis fans the dashes
  into arcs around the camera's footprint (a radial comb over the whole glitter zone) and morphs in every turn.
  Superseded by the wind-aligned cells of round 3.

## Shared-file hunks for the lead

- `src/game.ts`, constructor after `this.water.attachReflection(...)`: `this.water.attachAtmosphere(this.atmos.uniforms);`
- `src/render/wakes.ts`, impact splat shader: local `patch` renamed `wwPatch` (4 lines; reserved word).
