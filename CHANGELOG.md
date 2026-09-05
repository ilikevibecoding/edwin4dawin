# Changelog

Build ids are `<source sha>-<utc timestamp>`; the deployed build's id is served in `window.__build` and in
`BUILD_ID.txt` next to the deployed `index.html`.

## Unreleased

## iter08 — wave 4 builders and lead fixes (deployed as 45d3ba89fc54-20260905T040053Z)
- Aircraft loop 3: welded airfoil tail (t/c 0.09 -> 0.12, open trailing edge, hinge lines, swept dorsal
  fillet), wing lowered onto a boxier cabin roof with a flush root fairing, chined/stepped float hulls with
  strut shoes, spreader bars, bracing wires and water rudder, rounded prop blades with an ogival spinner,
  fin livery and calmer tail panel lines, float hull maps (walkway, boot-top at the waterline, wet band),
  plan-shaped hull meniscus with bow ripples. Flight harness 23/23; draw calls unchanged.
- Shadows loop: CascadeFitter replaces CSM.update — splits from camera height / aircraft distance (low
  views 0-24 / 24-290 / 290-3500 m), cascades fit to the receiver slab, per-cascade bias (1 texel normal,
  -0.25 texel depth); cascade-bitmask caster routing with shadow-only building/prop proxies; airframe
  shadow casting double-sided (the cabin used to count as lit because only back faces were recorded);
  overcast dims the shadow term. Contact shadow gap at the floats 0 px; draw calls at or below baseline
  in all 13 views (plane-rear-quarter 392 -> 366, island-pass 449 -> 368).
- Lead: propeller tip ring NaN (pow of a -2e-16 base) found by the live verifier's console check, fixed and
  redeployed.
- Iteration 07 scored (4 critics x 13 frames x 27 categories, bench/results/iter07/scores.md): category
  median 5.5 (iter06: 5.0-5.5); +1.5 water reflections, +1.0 water colour / vegetation / bridges, but two
  regressions — aircraft geometry 6.5 -> 5.5 (paper-thin tail read, wing-root gap, struts piercing floats,
  floats resting on rather than in the water) and cloud volume 6.0 -> 5.0 (pancake clouds with straight
  undersides after the loop-2 cell field, night clouds lit by the below-horizon sun). Wave 4 builders
  target both plus shadow quality (4.5).
- Planar water reflections merged (render/reflection.ts): mirrored scene at 0.25-0.5 scale blended into
  the sky reflection along the wave-perturbed ray; aircraft, floats, piers, boats and bridges now mirror on
  calm water (hard failure "no reflection of the aircraft" in the three fixed aircraft views). Cost at
  quality=high: +15..34 % draw calls (plane-rear-quarter 341 -> 392, glass-sun 322 -> 402, bridge-low
  308 -> 412), triangles +3..29 %; the 400-call budget is now exceeded on two views (perf pass pending).
- Wake foam no longer saturates: the wake-map term is capped below 1 and modulated by a fine
  world-anchored grain; fresh ribbons ramp in over their first points and a bounce/skip closes the old
  ribbon instead of bridging the airborne gap (the water-landing clip showed two flat white bars).
- Clouds loop 3 (cloud volume): the macro field is baked raw (half float) and each column's height is
  derived from how far it exceeds the coverage threshold (+ slow tower field + ~1 km turret field), so
  cells are domed towers up to 2 km tall with steep walls instead of 300 m pancakes; the base footprint is
  unchanged so ground shadows still match and weather changes no longer need a rebake. Light march: 3
  short noised steps (lobe self-shadowing) + 3 long envelope-only steps (no terraced shading) + analytic
  remainder of the column above; 3 scattering octaves each with a flatter phase (rims glow toward a low
  sun, cores stay shaded); ambient split into sky (occluded from above) and ground bounce / city glow
  (occluded from below); moon key at night, stars occluded by cloud alpha. Presets: cloudTop 3500 (clear,
  scattered), 2000 (cloudy), 3200 (storm); coverage clear 0.27, scattered 0.37, cloudy 0.70.

## iter07 — wave 3 builders and lead fixes (deployed as a73e7fb62028-20260904T202825Z)
- Water loop 2: physical absorption (red dies within a metre), bay/ocean reflectances re-derived, sediment
  and caustics, horizon-haze de-whitened sky reflection, glitter as a world-anchored multi-octave slope
  field (small stable glints instead of a blown column), surf/whitecap streaks; night wedge artefact gone.
- Sky/clouds loop 2: short-tail sky gradient with a saturated blue-cyan horizon key and a narrow warm haze
  band, domain-warped Worley cloud cells (1-4 km) with clear sky between them, thickness AO and base
  mottling, 42 km horizon fade; presets re-tuned (scattered 0.34, clear 0.24, cloudy 0.66).
- Flight physics/camera: published-inertia values, roll 147 -> 51 deg/s, elevator authority with q-based
  hinge factor and Cm_q -36, adverse aileron yaw, power-on pitch-up, floats on the visual keel with 5500
  N.s/m heave damping, bow wheels + structure contacts + crash reset, camera shake 0.35 m -> <= 0.10 m,
  input slew 0.22 s; 18-check deterministic harness (all pass) in bench/scripts/flighttest.mjs.
- Lead: aerial-a aircraft attitude corrected to the reference (approaching the camera, seen from above the
  starboard bow); whole-aircraft reference bbox added to the reference package; paler livery yellow.

## iter06 — wave 2 builders and lead fixes (deployed as 32aab3d85421-20260904T180514Z)
- Lighting: CSM sun carries physical irradiance (sun:sky 5:1 on a horizontal white; was 1:1 with 2.5x the
  blue), saturated zenith, warm haze band, neutral overcast, ground-bounce term in the IBL probe; bloom
  threshold raised; per-material IBL hack removed. Water reflectances re-tuned to the neutral irradiance.
- Aircraft loop 2: static parts merged per material (119 meshes / 374 calls -> 25 / 75), cockpit eye and
  slim frame with headliner, registration on the rear fuselage, propeller blur disc + visible spinner,
  night lights driven by a single emissive mesh, exhaust/oil/seam wear, closed-section propeller blades.
- Composition: Isla Garza re-authored (990 x 630 m, elongated along the view, spit, lagoon) and aerial-a
  camera placed so horizon 0.249, island bbox IoU 0.944, bridge start (0.40, 0.51), aircraft (0.80, 0.74)
  match the reference measurements; reference boat channel routed into the lower-left water.
- Wakes: wake map v-axis mismatch fixed (wakes were mirrored about the camera and never under their
  boats), 2048 px wake map, continuous foam core with fainter V arms.
- Shadows/performance: correct frustum culling for city/vegetation tiles (world-space spheres were being
  re-transformed per instance), props/lamps chunked and batched, boats in one BatchedMesh, per-cascade
  caster routing; aerial-a 1407 calls / 7.0 M tris (iter04) -> 428 / 1.31 M including shadow passes.

## iter05 — wave 1 builders (five isolated worktrees, merged after review)
- Aircraft: cabin built as an inset of the fuselage loft (no interior poke-through), two-shell physically
  based glass (alpha 0.12, Fresnel reflection, interior visible), correct registration on both sides,
  airfoil wing with flap/aileron notches and a lofted roof hump, yellow body / cream roof livery.
- Clouds: adaptive three-level raymarch over a baked coverage field, half-resolution cloud layer composited
  at full resolution (no speckle), cumulus volume/lighting rework, horizon fade, overcast cell structure.
- Water: Schlick Fresnel against the sky PMREM, three swell sets + wind sea + advected chop with
  footprint fading, coastal absorption depth colour, exposure-driven foam, anisotropic sun glitter.
- City: twelve facade families with per-building night lighting, tower massing recipes and height
  hierarchy, varied low-rise roofs; bridges with girder decks, parapets, piers with footings, cable-stayed
  pylons and tied arches, concrete pavement shader.
- Terrain/vegetation: five tree archetypes with impostor LOD (aerial-a 7.0 M -> 3.3 M triangles), dense
  island canopy, organic island tracks, exposure-driven beaches and sand flats, mainland relief, lakes,
  canals, parks, varied props and a rebuilt port.
- Lead fixes: chase camera look-target aliasing (camera lost the aircraft in flight clips), aerial-a
  aircraft at reference scale and rear three-quarter angle, hull foam/meniscus decals and contact probe
  for statically placed aircraft, log-depth support for scene ShaderMaterials, PMREM render-target leak,
  traffic vehicles baked to one mesh each (257 -> 85 draw calls), named scene groups for cost breakdown.

## iter03 — clouds, bathymetry, cockpit
- Cloud density/lighting rewrite: cumulus towers with flat bases, overcast cell structure, brighter sunlit
  sides and darker bases; larger coverage masses.
- Seagrass/sand flats in the bay; wider, higher reference causeway (30 m, 6 lanes); stronger, longer boat wakes.
- Cockpit rebuilt as an explicit cabin room (walls, ceiling, bulkheads), instrument panel oriented
  correctly, thinner windshield centre post, pilot figure.
- Sky zenith deepened toward the reference, vegetation/sand/livery colours corrected.
- Bench: synchronous frame profiling (`__bench.profile`), automated flight test, Pages workflow shipped in
  the gh-pages branch, live-link verifier that clicks through the githack notice.

## iter02 — composition and physics
- Isla Tortuga added where the reference bridge lands; reference causeway re-routed from Isla Garza's
  north shore toward it; reference camera moved higher/further back; aircraft placed by screen position.
- Fixed inverted winding of road/deck/wake ribbons and of the fuselage/float lofts (aircraft rendered as a
  dark inside-out shell before), texture orientation, heading placement mirror (views were looking south).
- Continuous seabed across landmass boundaries (removed rectangular depth steps) and along the ocean shelf.
- Moon key light and night exposure; sunset view at true low-sun time.
- Flight model: three-station float hydrostatics with planing, retuned drag, thrust falloff and elevator
  authority; chase camera with velocity feed-forward; shadow range follows altitude.

## iter01 — baseline
- First complete pipeline: authored geography, GPU clipmap terrain, water, analytic sky with raymarched
  cloud layer, aerial-perspective post pass, CSM shadows, procedural city/roads/bridges/vegetation/props/
  traffic, procedural seaplane with canvas PBR textures, rigid-body flight model, deterministic bench mode.

## Deployments

| build id | gh-pages commit | live link | notes |
|---|---|---|---|
| 03aacefc4377-20260904T101257Z | 7557979bb140b196590ad9bb5f77ca49ef23e291 | https://raw.githack.com/ilikevibecoding/edwin4dawin/gh-pages/play.html | verified: build id matched, loaded in 9 s, flew |
| 32aab3d85421-20260904T180514Z | c3a351f8276056fc04dd89dc766a8c5550d032a6 | https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/c3a351f8276056fc04dd89dc766a8c5550d032a6/play.html | verified: build id matched, loaded in 12.4 s, water takeoff to 67 m in 30 s (deterministic, identical to local), no console errors; 177 draw calls / 0.79 M tris in the water-landing view |
| a73e7fb62028-20260904T202825Z | e05ebaf37fcf09e9154c1746c85c7d9f6ea2f30c | https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/e05ebaf37fcf09e9154c1746c85c7d9f6ea2f30c/play.html | verified: build id matched, loaded in 15.3 s, water takeoff to 81 m in 30 s (new flight model), no console errors; 174 draw calls / 0.79 M tris in the water-landing view |
| 45d3ba89fc54-20260905T040053Z | a94d74e3d96a3d8d54f274bf1dc6b9c42865909f | https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/a94d74e3d96a3d8d54f274bf1dc6b9c42865909f/play.html | verified: build id matched, loaded in 16.9 s, water takeoff to 86 m in 30 s, no console errors; 171 draw calls / 0.59 M tris in the water-landing view. Wave 4 (aircraft 3, shadows, clouds 3) + planar reflections + wake foam fix. A first deploy of this round (1b11b7f0e45c) was replaced after the verifier caught a NaN propeller tip ring |
| 4642d4630c87-20260904T235001Z | a3c7ba5670942411bf607043d4a14a60dbb8ef81 | https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/a3c7ba5670942411bf607043d4a14a60dbb8ef81/play.html | verified: build id matched, loaded in 15.5 s, water takeoff to 86 m in 30 s, no console errors; 164 draw calls / 0.49 M tris in the water-landing view. Includes bridges/skyline loop 2, cockpit with live instruments, vegetation loop 2, IBL-hitch and shader warm-up fixes, night exposure, play-feel changes |
