# Performance baseline — Northstar Rescue

**Owner:** Opus 4 (testing, performance, tools)
**Regenerate with:** `node tools/perf-baseline.mjs --json artifacts/perf-baseline.json --seconds 6`
(needs the dev server up: `npx vite --port 5187 --strictPort`; add `--tiers high` for a single tier)

Re-baselined for WP-016, superseding the WP-008 edition. Captured 2026-07-27T00:08Z at 1920×1080,
native resolution scale, seed 1337, `operator` difficulty, 14 live hostiles.

## Read this before quoting any number

Rendering in this environment goes through **ANGLE/SwiftShader**, a software rasteriser on a shared
4-core VM. That splits the numbers below into two very different kinds:

| Kind | Trustworthy? | Why |
|---|---|---|
| Draw calls, triangles, shader programs, shadow-map size, nav structure | **Yes** | Counted from the scene graph; identical on any machine. |
| Simulation cost per fixed step (ms) | **Yes, with margin** | Ordinary JavaScript. Absolute values move with CPU speed, but the *shape* — which system dominates, and by how much — carries over. |
| Boot to title, nav bake, mission reset (ms) | **Roughly** | Mostly JavaScript and allocation; noisy under contention. Treat the spread across tiers as noise, not as an effect of quality. |
| Frames per second, deploy-to-playing **wall** time | **No** | Dominated by presentation cost; see below. |

**The frame rate here (0.17–0.33 fps) is an artefact and must not be quoted as a result.** Headless
Chrome with SwiftShader spends on the order of a second *presenting* each frame, outside both the
step and the render timer. The renderer's own work — the `three.js` draw submission — is only
**1.7–7.6 ms per frame at native 1080p**, measured by drawing frames back to back so presentation is
excluded. A GPU has no equivalent of that presentation cost, so the honest statement remains: *we do
not have a frame-rate measurement*. That is still the single biggest gap in this baseline, and it
needs one run on a machine with a real GPU to close.

The same caveat applies to **deploy-to-playing wall time (26–44 s)**: the loading screen presents
several frames, each costing seconds here. The game's own work between `loading` and `playing` is
measured in-page and is **1.40 s on every tier** — that is the number that carries over.

## Scene cost per quality tier, at three cameras

`renderer.render()` medians over 8 back-to-back frames, after warming shader permutations.

| Camera (checkpoint) | | low | medium | high |
|---|---|---|---|---|
| **Lobby atrium** (`lobby`) | draw calls | 570 | 569 | 569 |
| | triangles | 293,334 | 293,286 | 293,286 |
| | render median | 7.2 ms | 3.6 ms | 7.6 ms |
| **Open office** (`cubes`) | draw calls | 722 | 723 | 723 |
| | triangles | 321,958 | 321,958 | 321,958 |
| | render median | 5.5 ms | 6.0 ms | 6.1 ms |
| **Extraction garage** (`garage`) | draw calls | 469 | 470 | 470 |
| | triangles | 270,564 | 270,564 | 270,564 |
| | render median | 1.7 ms | 2.1 ms | 2.8 ms |
| **All cameras** | shader programs | 20 | 20 | 20 |
| | geometries / textures | 682 / 96 | 682 / 96 | 682 / 96 |
| | shadow map | 1024² | 2048² | 4096² |
| | fill-light budget | 6 | 12 | 20 |

**The open-plan office is the worst camera in the building: 723 draw calls at 322k triangles.** The
garage is the cheapest at 469. The triangle counts are all comfortable; the draw-call count is the
thing to verify on real hardware, because at 723 calls a weak CPU becomes the bottleneck before the
GPU does.

**The tiers still do not differ where it counts.** Draw calls and triangles are identical to within
one call across low, medium and high, and the render medians are ordered wrongly (medium fastest at
the lobby) because run-to-run noise on a contended box exceeds the difference between tiers. Quality
changes only `pixelRatioCap`, `shadowSize`, `fillLights`, `particles`, `anisotropy` and
`shadowRadius` (`QUALITY` in `src/core/renderer.js`) — never the geometry submitted. A player on weak
hardware gets no relief from the draw-call count by choosing "low". **NS-3 remains open**; the
draw-call count did improve in absolute terms since WP-008 (810 → 569 at the lobby camera), but not
as a function of tier.

## Wall times a player waits for

| | low | medium | high |
|---|---|---|---|
| Boot to title | 3.3 s | 3.3 s | 3.9 s |
| Nav bake (21,953 nodes) | 120 ms | 87 ms | 96 ms |
| Mission reset | 89 ms | 72 ms | 60 ms |
| Deploy → playing (game's own work) | 1.40 s | 1.40 s | 1.40 s |
| Deploy → playing (wall, **artefact**) | 26 s | 33 s | 44 s |
| Measured fps (**artefact**) | 0.33 | 0.17 | 0.17 |

## Simulation cost per fixed step

The fixed timestep is 1/120 s, so **every step has 8.33 ms for simulation *and* rendering together**.
Measured with rendering suppressed, in 2-second windows of 240 individually timed steps, so a
worst-step figure is possible rather than only an average. Ranges span the three tiers and all
windows of each scenario.

| Scenario | mean/step | p95/step | **worst step** | steps over 8.33 ms (of 240) | A* share |
|---|---|---|---|---|---|
| Idle — player hidden in the janitor's closet, hostiles patrolling | 0.33 – 0.38 ms | 0.6 – 0.7 ms | 1.7 – 3.4 ms | 0 | 3 – 4 % |
| One-floor combat — everything on the player's floor engaging | 0.48 – 0.90 ms | 1.1 – 4.7 ms | 5.3 – 9.5 ms | 0 – 2 | 1 – 8 % |
| Cross-floor chase — roster alerted to a position on the other floor | 0.71 – 1.10 ms | 1.3 – 4.9 ms | **7.9 – 31.8 ms** | 0 – 6 | 35 – 47 % |
| Building-wide firefight — 3 smoke clouds, a flash, continuous fire, roster converging | 0.58 – 1.04 ms | 1.5 – 4.6 ms | **5.6 – 20.3 ms** | 0 – 3 | 15 – 25 % |

**The NS-7 fix landed and it is dramatic.** The firefight scenario went from **25–47 ms per step** to
**0.58–1.04 ms** — a 25–45× reduction in the average. The mechanism is visible in the counters: A*
requests over a 2-second window dropped to **13–24** (from roughly one per hostile per step), the
re-path backoff is honoured, and the per-step budget now refuses **0–6** requests per window instead
of serving everything. Every scenario's *average* is comfortably inside budget with room for
rendering. This was the largest performance defect in the game and it is closed.

**The worst-step budget is still breached, and it is now a single-query problem.** The brief for this
work package asked for `worst step < 8.33 ms` on the firefight scenario; measured, it is **5.6 ms on
low, 9.9 ms on medium and 20.3 ms on high**, so the check fails on two of three tiers. The cause is
not accumulated load — the median step is 0.3–0.4 ms everywhere — but individual A* queries costing
**5.1–15.7 ms** each. One query is enough to blow a whole step on its own, and the fixed-step loop
has no way to spread it. Filed as **NS-9**, with the root cause below.

**VFX are not the cost, and this is now measured rather than assumed.** `Particles.update()` costs
**0.015–0.109 ms per call and 2.4–12.4 % of a window** while carrying up to 87 live particles plus
three 16-second smoke volumes. In the firefight scenario the particle system is a *larger* share of
the window than in the cross-floor chase, simply because pathfinding shrank so much.

### Where the remaining A* time goes

Two effects, both in `src/ai/` (Opus 3):

**A cross-floor query still costs far more than a whole step.** Measured over a 6-second cross-floor
chase: same-floor queries are **0.3 ms median / 1.0 ms max**, cross-floor queries are **4.8 ms median
/ 13.9 ms max**. The `NavGrid` heuristic is straight-line XZ distance plus twice the height
difference, which aims the search at the target's column rather than at the stairwell that reaches
it. **NS-8 is improved but not closed** — the WP-008 figure was 9.0 ms median, so the search itself is
roughly twice as fast, but a single query can still exceed the 8.33 ms step budget.

**Queries that cannot possibly succeed are the most expensive queries in the game.** New in this
baseline: `failedCalls` is **1–5 per 2-second window** in the cross-floor scenario, where WP-008
measured **0** everywhere. Those calls target a node in a *different* connected component of the
navmesh, so A* exhausts the entire 14,507-node main region before returning null. Measured over a
6-second chase: **9 failed queries costing 94 ms in total, median 9.9 ms, worst 16.1 ms** — the worst
single query type in the profile, worse than a legitimate cross-floor route. The targets are all
prop-top islands 0.7–0.9 m above the floor (`[17.8, 4.3, 3.3]`, `[10.3, 4.5, 11.3]` and similar,
3–48 nodes each). See **NS-9** and **NS-10** in `docs/reports/wp-016.md`: a reachability pre-check
in `findPath` fixes the cost, and the checkpoint placement fixes the cause.

## Navmesh structure

21,953 nodes, baked in 87–120 ms. A flood fill finds 116 regions, and the shape is mostly benign:

| Region | Nodes | What it is |
|---|---|---|
| 0 | 14,507 | The whole playable space — both floors, the stairwells and the exterior |
| 3 | 6,744 | The roof (y ≈ 6.7), which nothing is ever asked to walk to |
| others | 143, 48, 42, 40, … | 114 pockets under 150 nodes: prop tops, crate faces, ledges |

All 14 hostiles bake into region 0, and every checkpoint declared in `src/map/layout.js` is mutually
reachable — asserted by `ai › PW-14 the navmesh is a connected whole so hostiles can chase between
floors`. The residual risk is not connectivity but the pockets: a character *standing* on one is
unreachable, which is what NS-9 and NS-10 are about. PW-14 tests the declared checkpoint
coordinates, which resolve to floor nodes; it does not test where a teleported player actually ends
up standing.

## What this means for 60 fps on a mid-range GPU

- **Rendering: probably fine, still unproven.** 322k triangles at the worst camera is modest and the
  software rasteriser manages the scene in 1.7–7.6 ms at 1080p. The 723 draw calls in the open office
  are the thing to verify first on real hardware.
- **Simulation: averages now fit, spikes do not.** Every scenario averages under 1.1 ms per step
  against an 8.33 ms budget, which is a comfortable place to be. What is left is a stutter problem
  rather than a throughput problem: 0–6 steps in 240 exceed the budget, each because of one A* query.
  A player will feel these as occasional hitches when a firefight spreads across floors, not as a
  low frame rate.
- **Quality tiers are still not a usable performance lever** (NS-3), and they cannot help here anyway,
  because they do not touch the AI.

Recommended next measurements, in order: (1) land the NS-9 reachability pre-check and re-run the
worst-step column — the spikes should collapse to the cost of a legitimate cross-floor query;
(2) run `tools/perf-baseline.mjs` on a machine with a GPU to get a real frame rate and a draw-call
verdict; (3) profile `NavGrid.findPath` expansions per query to decide between a better heuristic and
a hierarchical graph, which is what remains of NS-8.

## Test-suite runtime

The Playwright matrix is dominated by the same presentation cost, which is why the harness stops the
`requestAnimationFrame` loop and renders only on demand (see the comments in `tests/helpers/game.js`).
For the record, on this box:

- A frame drawn as the only work in an event-loop task: **5–15 s**.
- The same frames drawn back to back inside one task: **~30 ms each**.
- A stepped simulation tick with rendering suppressed: **0.3–1.0 ms** idle.

That 300× gap is purely an artefact of headless software rendering. The 47-test matrix runs in
**8.1–8.3 minutes**, against a 15-minute cap.
