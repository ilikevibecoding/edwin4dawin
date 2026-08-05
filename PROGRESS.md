# AEGIS LINE — build log

A fictional first-person ballistic-missile interceptor base demo (three.js + Vite).
This file tracks each iteration: what changed, what the self-review scored, measured
performance, and the next fix list.

## Rubric (scored 1–10 each, reviewed every iteration)

| # | Area | What "10" looks like |
|---|------|----------------------|
| 1 | Site environment | Reads as a real, lived-in air-defence site: shelter, radar, three batteries, generators, trucks, antennas, barriers, floodlights, cables, cases, pads, markings, roads, fencing. Broad sky view from the operating area. |
| 2 | Battery hardware | Three unmistakably different silhouettes, moving erectors, hydraulics, cables, heat discolouration, decals, status lighting. |
| 3 | Flight physics | Curved ballistic arcs, gravity, boost/coast/manoeuvre/terminal phases, acceleration-limited steering, lead pursuit, velocity-aligned orientation, no jitter. |
| 4 | Effects | Trails that thin with altitude, launch plumes interacting with pad dust, fireballs, shockwaves, debris, decals, flares. |
| 5 | Lighting / weather / post | Convincing day, sunset and night. Bloom, grade, grain, vignette, no banding or blowouts. |
| 6 | Radar + HUD | Always clear: how many threats, which are tracked, which battery, its state, what is assigned, whether a round is in flight, and why an intercept succeeded or failed. |
| 7 | Controls and feel | Pointer lock, WASD, sprint, head bob, footsteps, solid capsule collision, working reduced-motion. |
| 8 | Gameplay loop | Console → conditions → scenario → battery → start → detect → assign → authorize → result → restart, in 45–90 s. |
| 9 | Performance | 60 fps on a mid-range laptop GPU; pooled everything; low draw calls. |
| 10 | Polish | No console errors, no z-fighting, no popping, no UI overlap, readable typography. |

---

## Iteration 1 — first playable

**Built:** whole project from scratch. Vite + three 0.185, Playwright harness, 13 gameplay
modules plus a procedural texture/geometry/noise/pool utility layer. Deterministic test
hooks on `window.__GAME`.

**Verified:** boots under SwiftShader, 73–260 draw calls, ~95–158 k triangles, a full
engagement runs from `START BALLISTIC MISSILES` to debrief.

**Self-review**

| Area | Score | Notes |
|---|---|---|
| 1 Site environment | 4 | Shelter blocks the main northern view from spawn. Distant ranges render as a row of identical pyramids — noise frequency too high for the mesh resolution. Desert floor is bare. |
| 2 Battery hardware | 4 | Silhouettes exist but read small and dark at distance; berms hide the launchers; erectors sit near-stowed so nothing is legible. |
| 3 Flight physics | 6 | Arcs and phases work. The single test engagement produced a miss, so lead pursuit or energy budget needs tuning. |
| 4 Effects | 5 | Trails and plumes fire, but a whole engagement only reached 3 k live smoke particles — trails read thin. |
| 5 Lighting/weather/post | 6 | Sky, cirrus and clouds are decent; sunset/night not yet reviewed. |
| 6 Radar + HUD | 6 | Panels populate correctly; help text overlaps the battery strip. |
| 7 Controls | 7 | Collision, bob and footsteps work. Spawn yaw was inverted (fixed). |
| 8 Gameplay loop | 7 | Full loop runs; scenario finished in 46 s. |
| 9 Performance | ? | Only measured under SwiftShader (10–30 fps), which is not a signal for GPU targets. Needs a real budget check. |
| 10 Polish | 5 | Fixed: NaN hydraulic geometry, failed geometry merges, missing fog uniform, fence wire orientation, canvas readback warnings. |

**Fixed this iteration:** `mergeGeometries` attribute normalisation, NaN hydraulic ram
length (argument-order bug), missing `fogDensity` declaration in the smoke vertex shader,
barbed-wire orientation, `willReadFrequently` canvas hints, inverted spawn yaw,
unpositioned HUD help block.

**Next fix list**

1. Move the command shelter off the northern sight line; respawn the player with an open
   view of the pads and sky.
2. Rebuild the distant terrain: lower-frequency ridges, a range mask so mountains cluster,
   more segments in the far mesh.
3. Make launchers read at distance — raise erectors to a working elevation, drop the berm
   that hides them, increase mechanical contrast.
4. Tune interception so a well-timed shot inside the envelope reliably hits.
5. Thicken trails and raise particle budgets.
6. Resolve HUD overlap at the bottom-right.
