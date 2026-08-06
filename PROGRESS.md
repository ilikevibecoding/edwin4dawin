# AEGIS RIDGE — build log

Fictional first-person ballistic-missile-interceptor base demo. Three.js + Vite,
fully procedural assets, Playwright-driven self-evaluation loop.

## Rubric

Scored 0–10 each iteration from screenshots taken by `tools/capture.mjs` and
telemetry from `tools/balance.mjs`, `tools/audio-check.mjs` and the test suite.

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

The build VM has **no GPU**; Chromium runs WebGL2 through SwiftShader (software),
where a single 1280×720 frame takes seconds. Frames-per-second measured here is
therefore meaningless, so performance is tracked as:

- **CPU simulation cost per frame** (`measureSim`, rendering disabled) — the
  GPU-independent half of the frame budget, directly comparable to a real machine.
- **Draw calls / triangles / live particles at peak load** — the numbers that
  determine GPU cost.

Targets: **< 700 draw calls**, **< 1.2 M triangles**, **< 1.5 ms median CPU sim**.
The harness fast-forwards the simulation without drawing and renders only the
frames it is about to screenshot, which is what makes the loop practical at all.

---

## Iteration 1 — first end-to-end build

Everything wired up: terrain, base, three batteries, threats, interceptors,
radar, console, HUD, audio, post. Capture harness runs 20 scenes.

**env 3 · batteries 3 · physics 2 · effects 4 · lighting 2 · ui 6 · loop 2 · perf 7 — avg 3.6**

- Scene washed out: sun 3.5 + hemi 0.55 + full-strength sky environment blew
  every surface white.
- Texture tiling applied twice (UV scale *and* `map.repeat`), so concrete looked
  like crumpled foil at ~1 m per tile.
- Console faced the wrong way; docking looked at the floor.
- Interceptors flew into the ground: `leadSolution` was seeded with the missile's
  *instantaneous* speed, which is ~38 m/s on the rail, so the predicted intercept
  point landed underground and guidance dived at it.
- Radar dropped every track: the 10.7 s scan period at 5.6 rpm exceeded the 3.2 s
  drop timeout.
- `renderer.info` only reported the last composer pass (1 draw call).
- Console errors: mixed indexed/non-indexed geometry in `mergeParts`,
  mediump/highp uniform precision mismatch, `MultiplyBlending` without
  premultiplied alpha.

## Iteration 2 — correctness pass

Fixed all of the above. Zero console errors or Three.js warnings across the run.

**env 4 · batteries 4 · physics 5 · effects 5 · lighting 5 · ui 7 · loop 4 · perf 8 — avg 5.3**

- Every mapped material was double-darkening (baked albedo × `material.color`),
  so launchers and equipment rendered near-black.
- Threat trajectories were too short (~30 s) for the high-altitude batteries to
  have a usable window.

## Iteration 3 — balance and albedo

- Threat profiles lengthened to ~50 s of flight from 19–21 km / 42–46 km, giving
  Sentinel → THAAD → Patriot a natural engagement sequence.
- Launcher elevation is now solved from the cued intercept point plus a per-family
  loft bias instead of a fixed angle.
- Guidance simplified to rail-hold → gravity-compensated proportional navigation
  with turn-**rate** limiting, so a slow round off the rail cannot pivot.
- Decoy discrimination made late and ambiguous: a decoy reads as a normal
  ballistic track until it bleeds speed below 9 km or has been watched 15 s.
- Albedo maps no longer multiplied by a dark `material.color`.

**env 5 · batteries 5 · physics 8 · effects 6 · lighting 7 · ui 7 · loop 8 · perf 9 — avg 6.9**

Peak load: 533 draw calls, 557 k triangles, 720 particles.

## Iteration 4 — parallel specialist passes

Six bounded specialists worked on disjoint modules, with the primary agent
integrating, resolving conflicts and owning the quality decision.

| Specialist | Files | Outcome |
|---|---|---|
| Battery assets | `batteries.js` | Three distinct silhouettes with drawbars, jacks, cabs, tube grids, gantries, cryo lines, ground cabinets; one marking atlas per vehicle |
| Base environment | `base.js`, `util/textures.js` | Hardstands, joint grid, drains, stains, tents, fuel and water storage, bunker, guard post, antenna farm, gate, revetments |
| Effects | `effects.js` | Rolling ground surge, hot-core exhaust with smoke sheath, turbulent ribbon cross-section, cooling fireballs, ejecta |
| Sky and post | `weather.js`, `post.js`, `TOD` | Graded sunset, moonlit night, layered haze, sun-shafted clouds, filmic grade |
| Console and HUD | `radar.js`, `ui.js`, `hud.css` | Physical console with PPI, weapon-status panel, illuminated control bank, holographic track volume; HUD steps back when docked |
| Airframes | `interceptors.js`, `threats.js` | Per-family rounds with staging joints, divert ports, nozzle bells; ablative re-entry body, lightweight decoy, bow-shock sheath |

Bugs the integration pass caught that the specialists had not:

- **Directional shadows never worked.** `THREE.DirectionalLightShadow` builds its
  camera as `OrthographicCamera(-5, 5, 5, -5, 0.5, 500)` and `updateMatrices()`
  does not call `updateProjectionMatrix()`, so mutating the frustum extents left
  the shadow map covering a 10 × 10 m box. Proved with an A/B render that was
  pixel-identical with `castShadow` toggled. Fixed and retuned for close range.
- **A continuous sand berm walled in the pad**, breaking the requirement for an
  unobstructed view of the sky and horizon from the operating area.
- **Aerial-perspective inversion.** With a 1400 m height falloff, flat desert at
  12 km accumulated more optical depth than a 2 km ridge behind it, producing a
  white band of ground in front of darker mountains.
- **Launch dust stayed fully lit at midnight** — smoke is drawn in a custom
  shader with no scene lights, so it needed an explicit ambient term.
- **The DOM HUD covered the physical console** it was sitting on.

## Iteration 5 — integration, optimisation, QA

- Replaced the allocating `Array.sort` in the billboard depth pass with an
  in-place insertion sort over the previous frame's order. Particle slots are
  stable and depths barely change between frames, so it is near-linear and
  touches no heap.
- Halved sandbag and scatter-rock triangle counts (885 k → 666 k in the wide
  static view) with no visible difference at their on-screen size.
- Added a per-time-of-day ambient multiplier to non-emissive particle albedo.
- Kept the control-hint strip and result banner clear of the corner panels, and
  faded the hint once read.

**env 8 · batteries 8 · physics 9 · effects 8 · lighting 8 · ui 9 · loop 9 · perf 9 — avg 8.5**

## Iteration 6 — intercept readability

The walkthrough video was reviewed by a separate visual model, which reported no
visible launches, contrails or explosions — only HUD icons. Investigation showed
two separate causes:

1. The video's camera script tracked the round's *altitude*, so within a second
   of launch it was staring at empty sky with the launcher and its dust cloud out
   of frame. The launch beat now holds on the launcher and then leads the round
   upward.
2. A 30 m fireball 22 km away subtends about a tenth of a degree — a single dim
   pixel. Intercept extents now scale with view distance (counts and lifetimes
   stay keyed to the true yield so a far-off kill costs no more), and the flash
   uses the broad soft-edged puff rather than the flare sprite, whose alpha
   collapses well inside its own quad and so read as a pinprick however large
   the quad was made.

Re-review confirmed all nine storyboard beats: a launch with exhaust flame and
ground dust at 0:11 with the launcher in frame, a tracked climb with a persistent
contrail from 0:12 to 0:16, a legible fireball at 0:17, and two more rounds in
flight at 0:20.

### Final measurements

Peak load (SATURATION at sunset, three rounds in flight, sunset preset, `high`):

| Metric | Value | Budget |
|---|---|---|
| Draw calls | 417 | 700 |
| Triangles | 828 k | 1.2 M |
| Live particles | 1 340 | — |
| CPU sim, median | 0.20 ms | 1.5 ms |
| CPU sim, p95 | 0.30 ms | — |
| CPU sim, max | 2.0 ms | — |
| Console errors / Three.js warnings | 0 | 0 |

Balance telemetry (`tools/balance.mjs`, 2 runs per scenario, auto-engagement):

| Scenario | Duration | Spawned | Fired | Killed | Leakers | Decoys engaged |
|---|---|---|---|---|---|---|
| SINGLE TRACK | 29–30 s | 1 | 1 | 1 | 0 | 0 |
| SATURATION | 64–65 s | 5 | 4 | 4 | 1 | 0 |
| NIGHT RAID | 81–90 s | 8 | 3–5 | 3 | 2 | 0–2 |

Per-battery single-target probe: all three families intercept reliably inside
their advertised basket, with typical miss distances of 2–30 m and occasional
fuze-radius failures that are reported with a reason.

Audio (`tools/audio-check.mjs`, analyser spliced onto the master bus): every cue
produces signal, and a 700 m ground blast stays at the ambient floor for its
2.06 s travel time before arriving at 6.5× that level.

Test suite: **23/23 Playwright tests pass** — boot integrity, performance budget,
movement and capsule collision, reduced motion, radar track lifecycle, both
engagement control paths, per-battery intercept capability, ballistic arc shape,
leaker reporting, miss explanations, scenario pacing, decoy ambiguity, restart
state, seed determinism, run-to-run variation, and three presentation captures.

### Remaining fix list

1. A high-altitude kill still reads as a fairly small bloom from the pad. An
   optional in-game "engagement view" that zooms toward the assigned track would
   give the payoff more weight without inflating world-space effect sizes further.
2. Launchers sit at 23–27 draw calls each rather than the ~8 aimed for, because
   nothing merges across the chassis → azimuth → elevation → lid node boundaries.
   Collapsing to a single master atlas plus vertex colours would fix it at the
   cost of surface variety.
3. Battery triangle budget has little headroom (≈199 k of ~200 k); the Sentinel
   gantry lattice and THAAD pod structure are the two biggest buckets.
4. Ground decals do not project onto sloped terrain, so scorch marks off the
   apron can float slightly.
5. No volumetric shadowing in the searchlight beams; they are additive cones.
