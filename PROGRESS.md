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

---

## Iteration 1 - first light

**Built:** full module skeleton (`player`, `base`, `batteries`, `threats`,
`interceptors`, `physics`, `radar`, `effects`, `weather`, `audio`, `post`, `ui`,
`main`) plus procedural texture/material/kit-bash cores and pooling. Deterministic
seeded RNG, headless Playwright harnesses (`tools/probe.mjs`, `tools/gallery.mjs`,
`tools/quick.mjs`) with a `window.__GAME` test API that can step the simulation at
fixed dt and render on demand.

**Observations from the first screenshots:**

1. Entire frame was a white veil. Root cause: `UnrealBloomPass` ran on raw HDR
   output where the analytic sky sits at 10-30 linear, so the whole sky exceeded the
   bloom threshold. Fixed by tone-mapping first (`OutputPass` before bloom) so bloom
   only catches genuine highlights.
2. Environment-map ambient was swamping the sun (`environmentIntensity` 1.0 against
   a sun intensity of 3). Rebalanced to sun 3.6 / hemi 0.5 / env 0.17 with exposure
   0.5.
3. **All terrain normals pointed down.** The radial terrain grid was wound
   clockwise, so every ground surface was lit from below and read as flat black or
   flat grey. Reversing the winding fixed lighting, shadows and the entire mood of
   the scene.
4. Terrain was two mismatched meshes (square near plane + annulus) that z-fought at
   the seam. Replaced with two radial patches sharing identical ring topology, so
   the seam shares vertices exactly.
5. Distant ranges were small, spiky and too close. Reworked to a two-scale ridged
   massif ramping in from 2.6 km to 12 km, out to a 46 km ring.
6. Fog was eating the ranges. Reduced density and warmed the colour.

**Performance (headless SwiftShader, 1280x720):** sim 2.9 ms/step, ~2900 draw calls,
620k triangles. Draw calls are far too high and the sim step is dominated by the
radar canvas redraw.

**Scores:** A 5, B 4, C ?, D ?, E 6, F 6, G 3, H ?

**Next:**
- Verify the full engagement loop end to end and score C/D/H.
- Cut draw calls (merge static kit-bash geometry, instance repeated props).
- Throttle radar canvas redraw out of the fixed sim step.
- Deepen battery mechanical detail; the launchers still read as grey slabs.
- Reduce the Preetham horizon aureole that washes out the ranges.
