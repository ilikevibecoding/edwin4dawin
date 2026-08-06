# AEGIS LINE - build log

A fictional first-person ballistic-missile-interceptor range demo (Three.js + Vite).
Self-evaluating build loop: implement -> run headless -> screenshot -> score against
the rubric -> fix -> repeat.

All hardware, ranges, speeds, radar behaviour, guidance and procedures are invented
and balanced for gameplay. Nothing here represents real system performance.

## Rubric (scored 0-10 each iteration)

| # | Criterion |
|---|-----------|
| A | Base environment: architecture, layout, clutter, believability |
| B | Battery assets: silhouette, mechanical detail, animation |
| C | Flight physics: arcs, phases, steering, readability |
| D | Effects: trails, plumes, explosions, debris, dust |
| E | Lighting / weather / post: mood, exposure, day-sunset-night |
| F | Radar, HUD, interaction clarity, accessibility |
| G | Performance: draw calls, frame cost, stability |
| H | Gameplay loop: select, assign, authorize, result, restart |

| iteration | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| 1 first light | 5 | 4 | - | - | 3 | 6 | 3 | - |
| 2 perf + loop | 5 | 4 | 6 | 5 | 6 | 6 | 7 | 7 |
| 3 assets pass | 8 | 8 | 6 | 5 | 6 | 6 | 8 | 7 |
| 4 look pass | 8 | 8 | 6 | 8 | 9 | 9 | 8 | 7 |
| 5 physics fix | 8 | 8 | 9 | 8 | 9 | 9 | 8 | 9 |
| 6 polish | 9 | 8 | 9 | 9 | 9 | 9 | 8 | 9 |

---

## Iteration 1 - first light

**Built:** full module skeleton (`player`, `base`, `batteries`, `threats`,
`interceptors`, `physics`, `radar`, `effects`, `weather`, `audio`, `post`, `ui`,
`main`) plus procedural texture/material/kit-bash cores and pooling. Deterministic
seeded RNG, headless Playwright harnesses with a `window.__GAME` API that steps the
simulation at fixed dt and renders on demand.

**Observations from the first screenshots:**

1. Entire frame was a white veil. `UnrealBloomPass` ran on raw HDR output where the
   analytic sky sits at 10-30 linear, so the whole sky exceeded the bloom threshold.
   Fixed by tone-mapping first (`OutputPass` before bloom).
2. Environment-map ambient swamped the sun (`environmentIntensity` 1.0 against sun
   intensity 3). Rebalanced.
3. **All terrain normals pointed down.** The radial terrain grid was wound clockwise,
   so every ground surface was lit from below and read as flat black. Reversing the
   winding fixed lighting, shadows and the entire mood of the scene.
4. Terrain was a square near plane plus an annulus that z-fought at the seam.
   Replaced with two radial patches sharing identical ring topology.
5. Distant ranges were small, spiky and too close. Reworked to a two-scale ridged
   massif ramping in from 2.6 km to 12 km, out to a 46 km ring.

**Performance:** sim 2.9 ms/step, ~2900 draw calls, 620k triangles. Both far too
high; the sim step was dominated by the radar canvas redraw.

**Next:** verify the loop end to end, cut draw calls, throttle the radar redraw.

---

## Iteration 2 - draw calls and the loop

**Changed:**

- `core/merge.js` folds the kit-bashed site into one mesh per material. Animated
  sub-assemblies are tagged `markDynamic` and each becomes its own merge root, so
  nested assemblies (turntable inside chassis, erector inside turntable, rod inside
  ram) keep working. Getting this wrong bakes the current pose in permanently -
  which happened once and showed up immediately as a launcher frozen mid-elevation.
- Cached decal materials so repeated stencils share a draw call.
- Split `effects` and `radar` into `simulate()` (fixed step) and `present()` (per
  frame). The radar PPI now repaints at 20 Hz and the status panel at 5 Hz.
- Autopilot fires one round per assignment instead of emptying the battery.

**Performance:** draw calls 2916 -> 648, sim 2.9 ms -> 0.29 ms per step.

**Gameplay verified:** single 1/1, saturation 3/4, night 5/5 with a decoy correctly
wasting a round.

---

## Iteration 3 - specialist pass on assets

Two bounded specialists worked in parallel with strict file ownership.

**Launchers (`batteries.js`):** PALISADE's canister block now owns the silhouette
over open I-section rails instead of being boxed in by frame plates. HALBERD was
rebuilt as a high, chunky 8-tube pod on tall trunnion towers - the tube mouths are
stub barrels standing proud of the face plate, because a flat plate at 60 degrees is
edge-on from the pad and read as a blank slab. SENTINEL became a heavy static gantry
over a concrete flame pit. All three gained bolt runs, weld beads, walkways,
ladders, umbilicals, heat-stained deflectors and status panels.

**Environment (`base.js`):** shelter interior rebuilt as a believable command post
(lined walls, cable void with a real lift-out plate, surface trunking, routed cable
runs, warm lighting fighting the cold sky ambient through the door). The radar array
face was inverted - the radiating elements were hidden behind an opaque cover - and
now sits proud of a textured backing. The gravel skirt was z-fighting the terrain
and became a draped radial mesh with a hole for the apron. World-space UVs on apron
and roads killed a grid of bright normal-map spots visible under floodlights.

**Performance:** 646 draw calls / 834k triangles.

---

## Iteration 4 - specialist pass on look and interface

Three bounded specialists in parallel.

**Effects:** the launch plume became a sustained emitter with a long-lived radial
ground dust ring; exhaust now emits per metre flown rather than per frame, which is
what turns a bead chain into a rope; contrail width and persistence swing hard with
air density. A mirrored perpendicular in the stretched-particle vertex shader was
back-face culling every spark, so sparks had never been visible. Particles now fade
on ground contact instead of being sliced along a straight line by the terrain.

**Lighting/post:** the blown-out daylight horizon is gone - lower turbidity and mie,
a desaturating luminance shoulder patched into the sky shader, a higher bloom
threshold, and height-attenuated fog so aerial perspective reads as depth instead of
a white veil. The shadow frustum tightened from 95 m to 78 m with texel snapping
(tightening alone just makes the crawl more visible) and normal-bias-dominant
offsets to remove 0.38 m of peter-panning. The grade shader was rewritten with
log-pivot contrast, highlight desaturation, split toning and a key-light lens veil.

**Radar/HUD:** the hologram became a volumetric plot with labelled range rings,
altitude references, track history, predicted impact points and a selected-track
callout. The HUD now answers every required question at a glance and keeps a
persistent LAST RESULT block with the reason. The console gained a numbered step
rail and disabled controls that state why they are disabled.

---

## Iteration 5 - the guidance bug

Headless balance runs kept producing `ROUND FELL SHORT - GROUND IMPACT`. Three
guesses failed, so the next step was instrumentation rather than more guessing.

**Root cause:** every failure was a SENTINEL round that could not fly the shot it
was given. `aimAt()` biases toward the middle of the elevation range, so SENTINEL
always left the rail at 71.6 degrees while the geometry needed 40-44. A missile's
turn rate is `a_lateral / speed`, and `pitchOverDelay` of 1.9 s meant it only began
turning after boosting to Mach 3 - integrating available heading change over the
boost gave 17 degrees against a 30 degree error. It saturated its turn limit for
100% of the flight, lobbed 10-19 km above the intercept, sailed over the target and
flew a 90 km ballistic arc into the desert.

Two further defects turned that miss into a nose-dive: `timeToGo()`'s fixed-point
iteration diverged once the round was receding (logged `tti` of 221 s, driving the
aim point 27 km underground), and nothing terminated an overshooting round because
the fuze only armed inside 900 m.

**Fixes:** SENTINEL pitches over early with more lateral authority; `timeToGo()`
solves the intercept quadratic in closed form with a closest-approach fallback;
`predictInterceptPoint()` gained a lead bound and had its gravity-compensation sign
corrected (it was aiming *below* the meeting point); the fuze arms at terminal range
so near misses report as misses; a round that passes 2 km beyond closest approach
self-destructs and frees the track. The autopilot now runs one engagement per
battery instead of one at a time.

**Balance across seeds:** single 100%, saturation 9/10 stopped, night all real
inbounds stopped with decoys correctly wasting rounds. A wider six-seed sweep gives
59/60 with one genuine leaker, so outcomes still vary.

**Added:** `tests/game.spec.js`, 21 deterministic Playwright tests. All pass.

---

## Iteration 6 - polish and performance honesty

- `assign()` now refuses shots with no window and says why; the lead cue reports the
  predicted intercept altitude and whether the window is optimal or marginal.
- Saturation raised to five inbounds over 12 s.
- HUD left column hugs the bottom instead of stretching an empty log box up the
  frame, and the duplicated action row was removed in favour of the step rail.
- `tests/shots.spec.js` captures a 17-image reference set.
- `tools/film.mjs` renders demo clips offline, frame by frame, then encodes at real
  speed.

**On the 60 fps target.** This VM has no GPU: headless Chromium falls back to
SwiftShader, a software rasteriser. Measured there, the game runs at 4-6 fps, and
feature-toggle profiling was self-contradictory (hiding the sky doubled the rate,
hiding the terrain on top of that made it slower), so those numbers say nothing
useful about real hardware. What can be measured honestly is held inside budget:

| metric | value | budget |
|---|---|---|
| draw calls | 647 | < 800 |
| triangles | 835k | < 900k |
| simulation step | 0.28 ms | < 1 ms |
| CPU render work | 5-7 ms | - |
| effects draw calls | 6 | - |

Since the real GPU cost cannot be verified from here, the game protects the target
itself: an **adaptive quality governor** watches its own smoothed frame time and
steps between low/medium/high when it cannot hold 60 fps, with hysteresis in both
directions. Each tier changes pixel ratio, shadow map size, anti-aliasing and - most
importantly - the particle density multiplier, since large alpha-blended particles
are the dominant overdraw risk. The setting can be switched off to pin a tier.

---

## Known limitations

- Absolute frame timing is unverified on real GPU hardware for the reason above.
- The player's feet rest on terrain height rather than the shelter's 0.14 m finished
  floor; `CollisionWorld.supportHeight` has no support box registered for the deck.
  Eye height and the doorway are unaffected.
- The demonstration autopilot exists for the headless tests and the capture tools. It
  is not exposed as an in-game assist.
