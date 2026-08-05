# AEGIS RIDGE — build log

Fictional first-person ballistic-missile-interceptor base demo. Three.js + Vite,
fully procedural assets, Playwright-driven self-evaluation loop.

## Rubric

Scored 0–10 each iteration, from screenshots taken by `tools/capture.mjs` and
telemetry from `tools/balance.mjs`.

| # | Criterion |
|---|-----------|
| 1 | Environment craft — terrain, base layout, architectural and support detail |
| 2 | Battery assets — silhouette, mechanical detail, decals, wear, animation |
| 3 | Flight physics — believable arcs, inertia, steering, phase readability |
| 4 | Effects — plumes, trails, explosions, debris, shockwaves, dust, decals |
| 5 | Lighting & atmosphere — sky, weather, day/night, post-processing |
| 6 | Interface — radar, HUD, prompts, clarity of state and outcomes |
| 7 | Gameplay loop — pacing, difficulty, readability of cause and effect |
| 8 | Performance discipline — draw calls, triangles, pooling, CPU frame cost |

## Test environment caveat

The build VM has **no GPU**; Chromium runs WebGL2 through SwiftShader (software).
Frames-per-second measured here is meaningless, so performance is tracked as:

- CPU simulation cost per frame (`measureSim`, render disabled) — directly
  comparable to a real machine.
- Draw calls / triangles / live particle count at peak load — the numbers that
  determine GPU cost.

Targets: **< 700 draw calls**, **< 1.2 M triangles**, **< 3 ms CPU sim** at peak.

---

## Iteration 1 — first end-to-end build

Everything wired up: terrain, base, three batteries, threats, interceptors,
radar, console, HUD, audio, post. Capture harness runs 20 scenes.

**Scores:** env 3, batteries 3, physics 2, effects 4, lighting 2, ui 6, loop 2, perf 7 — **avg 3.6**

Observations:

- Whole scene washed out: sun 3.5 + hemi 0.55 + full-strength sky environment
  blew every surface to white.
- Texture tiling applied twice (UV scale *and* `map.repeat`), so concrete looked
  like crumpled foil at ~1 m per tile.
- Console faced the wrong way; docking looked at the floor.
- Interceptors flew into the ground: `leadSolution` was seeded with the missile's
  *instantaneous* speed, which is ~38 m/s on the rail, so the predicted intercept
  point landed underground and guidance dived at it.
- Radar dropped every track: scan period (10.7 s at 5.6 rpm) exceeded the 3.2 s
  drop timeout.
- `renderer.info` only reported the last composer pass (1 draw call).
- Console errors: mixed indexed/non-indexed geometry in `mergeParts`, mediump/highp
  uniform precision mismatch, `MultiplyBlending` without premultiplied alpha.

## Iteration 2 — correctness pass

Fixed all of the above. Zero console errors/warnings across the whole capture run.

**Scores:** env 4, batteries 4, physics 5, effects 5, lighting 5, ui 7, loop 4, perf 8 — **avg 5.3**

Observations:

- Sky, mountains and aerial perspective now read properly.
- Every mapped material was double-darkening (baked albedo × `material.color`),
  so launchers and equipment rendered near-black.
- Threat trajectories were too short (~30 s) for the high-altitude batteries to
  have a usable window.

## Iteration 3 — balance + albedo

- Threat profiles lengthened to ~50 s of flight from 19–21 km / 42–46 km, which
  gives Sentinel → THAAD → Patriot a natural engagement sequence.
- Launcher elevation is now solved from the cued intercept point plus a per-family
  loft bias instead of a fixed angle, so long-range rounds start on a sane heading.
- Guidance simplified to rail-hold → gravity-compensated proportional navigation,
  with turn-**rate** limiting so a slow round off the rail cannot pivot.
- Decoy discrimination made late and ambiguous, so committing early is a real risk.
- Albedo maps no longer multiplied by a dark `material.color`.

Balance telemetry (2 runs per scenario, auto-engagement):

| Scenario | Duration | Spawned | Fired | Killed | Leakers |
|---|---|---|---|---|---|
| SINGLE | 29–30 s | 1 | 1 | 1 | 0 |
| SATURATION | 64–65 s | 5 | 4 | 3–4 | 1–2 |
| NIGHT RAID | 86 s | 8 | 4 | 3 | 2 |

Peak load: **533 draw calls, 557 k triangles, 720 particles, 0.1 ms CPU sim**.

**Scores:** env 5, batteries 5, physics 8, effects 6, lighting 7, ui 7, loop 8, perf 9 — **avg 6.9**

### Next fix list

1. Launcher assets read as plain boxes at distance — need canister separation,
   greebles, cables, hydraulics and wear that survive a 20 m view.
2. Base is sparse: needs revetments, tents, fuel/water storage, hardstands,
   antenna farm, cable runs, tyre tracks and better prop grounding.
3. Effects need thicker launch plumes, ground-interacting dust and longer-lived
   high-altitude contrails.
4. Sky needs sun shafts at sunset and stronger night lighting from site sources.
5. Console needs a stronger physical presence and a clearer holographic volume.
