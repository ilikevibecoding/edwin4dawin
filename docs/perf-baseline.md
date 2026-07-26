# Performance baseline — Northstar Rescue

**Owner:** Opus 4 (testing, performance, tools)
**Regenerate with:** `node tools/perf-baseline.mjs --json artifacts/perf-baseline.json`
(needs the dev server up: `npx vite --port 5187 --strictPort`; add `--tiers high` for a single tier)

## Read this before quoting any number

Rendering in this environment goes through **ANGLE/SwiftShader**, a software rasteriser on a shared
4-core VM that was carrying a load average of 5–17 from other agents throughout the measurements.
That splits the numbers below into two very different kinds:

| Kind | Trustworthy? | Why |
|---|---|---|
| Draw calls, triangles, shader programs, shadow-map size, nav region structure | **Yes** | Counted from the scene graph; identical on any machine. |
| Simulation cost per fixed step (ms) | **Yes, with margin** | Ordinary JavaScript. Absolute values move with CPU speed, but the *shape* — which system dominates, and by how much — carries over. |
| Boot-to-title, nav bake, mission reset (ms) | **Roughly** | Mostly JavaScript and allocation; noisy under contention. Treat the spread across tiers as noise, not as an effect of quality. |
| Frames per second | **No** | See below. |

**The frame rate reported here (0.4–0.6 fps) is an artefact and must not be quoted as a result.**
Headless Chrome with SwiftShader spends on the order of a second *presenting* each frame, outside
both the step and render timers. The renderer's own work — the `three.js` draw call itself — is only
**2.5–15 ms per frame at native 1080p**, measured by drawing frames back to back so presentation is
excluded. A hardware GPU has no equivalent of that presentation cost, so the honest statement is:
*we do not yet have a frame-rate measurement*. Getting one needs a run on a machine with a real GPU,
and that remains the single biggest gap in this baseline.

## Measured — 1920×1080, native resolution scale (1.0), seed 1337

Captured 2026-07-26T13:37Z from `artifacts/perf-baseline.json`.

| | low | medium | high |
|---|---|---|---|
| Shadow map | 1024² | 2048² | 4096² |
| Fill-light budget | 6 | 12 | 20 |
| Draw calls | 810 | 811 | 811 |
| Triangles | 296,628 | 296,628 | 296,628 |
| Shader programs | 12 | 13 | 13 |
| Geometries / textures | 747 / 79 | 748 / 79 | 748 / 79 |
| `renderer.render()` median | 15.2 ms | 10.4 ms | 14.7 ms |
| `renderer.render()` best | 2.5 ms | 6.1 ms | 3.1 ms |
| Boot to title | 3.6 s | 3.0 s | 4.6 s |
| Nav bake (22,002 nodes) | 95 ms | 133 ms | 204 ms |
| Mission reset | 82 ms | 148 ms | 111 ms |
| Reported fps (artefact) | 0.6 | 0.6 | 0.4 |

**The tiers barely differ where it counts.** Draw calls and triangle counts are identical to within
one call, and the software render times are ordered wrongly (medium fastest) because run-to-run noise
on a contended box exceeds the difference between tiers. The tiers currently change only the
shadow-map resolution, the fill-light budget, particle scale, anisotropy and the pixel-ratio cap
(`QUALITY` in `src/core/renderer.js`); they change neither the geometry submitted nor the number of
draw calls. On a GPU the shadow map will matter, but **"low" gives a player on weak hardware almost no
relief from the 810 draw calls**, which is the cost that scales with CPU. Filed as **NS-3**.

**810 draw calls at 297k triangles is the number to watch on real hardware.** The triangle count is
comfortable. The draw-call count is the risk: on a mid-range GPU, 810 calls per frame is a plausible
60 fps budget but leaves little headroom for VFX, and it is high enough that a weak CPU becomes the
bottleneck before the GPU does.

## Simulation cost per fixed step

The fixed timestep is 1/120 s, so **every step has 8.33 ms for simulation *and* rendering together**.
Measured with rendering suppressed, over 2-second windows, 14 live hostiles, `operator` difficulty.
The range spans the three quality tiers, which is a proxy for run-to-run noise since quality does not
touch the AI:

| Scenario | ms per step | Share spent in A* |
|---|---|---|
| Idle — player hidden in the janitor's closet, hostiles patrolling | 0.33 – 0.47 ms | 2 – 6 % |
| Alerted — whole roster in combat, player on the same floor | 0.54 – 1.03 ms | 6 – 12 % |
| **Cross-floor chase — roster alerted to a position on the other floor** | **5.7 – 10.9 ms** | **88 – 91 %** |
| **Firefight that wakes the building — 3 smoke clouds, a flash, continuous fire, roster converging** | **25 – 47 ms** | **97 %** |

Idle and same-floor combat are healthy: well under a millisecond, with room for rendering. The bottom
two rows are the finding, and the fourth row is the realistic one — a player who opens fire in the
lobby produces it.

**The VFX in that fourth scenario are not the cost.** Particle updates were timed separately:
`Particles.update()` costs **0.135–0.362 ms per call and 0.2–2.8 % of the window** while carrying
56–94 live particles plus three 16-second smoke volumes. The other 97 % is pathfinding. That row is
labelled a VFX scenario in the harness for historical reasons; what it actually measures is a
roster-wide chase, and the particle numbers are the evidence that the FX systems are cheap.

### Where the pathfinding time goes

Two separate effects compound, and both are `src/ai/` (Opus 3):

**A cross-floor query is ~55× more expensive than a same-floor one.** Measured directly:
**9.0 ms median** for lobby → conference against **0.16 ms** for a same-floor route of comparable
length, with worst cases of 13–24 ms per query (41 ms observed once). The `NavGrid` heuristic is
straight-line XZ distance plus twice the height difference, which points the search at the target's
column rather than at the stairwell that actually reaches it, so A* expands a large fraction of the
22,002-node graph. A single query can therefore exceed the entire 8.33 ms step budget on its own.

**Hostiles ask far more often than the design intends.** The re-path interval in `src/ai/enemy.js` is
`repathT = 0.9 + rng * 0.7`, so roughly one request per hostile per second. Measured during a
cross-floor chase: **6.84 requests per hostile per second on average, and 76.3 per second for the
worst single hostile** — nearly one on every one of the 120 sim steps. **85.4 % of all requests are
issued while the backoff timer is still positive**, i.e. through a path that bypasses it. That one
hostile consumed **1,592 ms of a 2,155 ms window — 74 % of all wall time in a single character's
pathfinding**. Filed as **NS-7**; it is the largest single performance defect in the game right now.

Note that none of these requests *fail*: `unreachableCalls` and `failedCalls` are **0** in every
scenario and all 14 hostiles bake into the same nav region. The navmesh connectivity bug (**NS-1**)
that dominated the previous edition of this baseline is fixed.

## Navmesh structure

22,002 nodes, baked in 95–204 ms. A flood fill finds 113 regions, but the shape is benign:

| Region | Nodes | What it is |
|---|---|---|
| 0 | 14,579 | The whole playable space — both floors, the stairwells and the exterior |
| 1 | 6,744 | The roof (y ≈ 6.7), which nothing is ever asked to walk to |
| 2–112 | 143, 48, 42, 40, … | 110 pockets under 50 nodes: prop tops, crate faces, ledges |

All **30 checkpoints in `src/map/layout.js` are mutually reachable** (verified by asking for a route
from the lobby to each one), and cross-floor routes resolve in 29–32 waypoints. This is asserted by
`ai › PW-14 the navmesh is a connected whole so hostiles can chase between floors`, which also fails
if any island grows large enough to hold a room.

## What this means for 60 fps on a mid-range GPU

- **Rendering: probably fine, still unproven.** 297k triangles is modest and the software rasteriser
  manages the scene in single-digit to mid-teen milliseconds at 1080p. The 810 draw calls are the
  thing to verify first on real hardware.
- **Simulation: will not hold 60 fps in a building-wide firefight.** At 25–47 ms per step the
  simulation exceeds its budget by 3–6× on its own, and a 60 fps frame runs two 120 Hz steps. This is
  now a pure pathfinding problem, and NS-7 is the cheapest part of it to fix — honouring the backoff
  that the code already sets would cut the request count by roughly an order of magnitude without
  touching the search itself.
- **Quality tiers are not yet a usable performance lever** — see NS-3. They also cannot help here,
  because they do not touch the AI.

Recommended next measurements, in order: (1) fix NS-7 and re-run the simulation table — the expensive
rows should collapse; (2) run `tools/perf-baseline.mjs` on a machine with a GPU to get a real frame
rate and a draw-call verdict; (3) profile `NavGrid.findPath` expansions per query directly, to decide
between a better heuristic, a hierarchical graph, and a per-frame A* budget.

## Test-suite runtime

The Playwright matrix is dominated by the same presentation cost, which is why the harness stops the
`requestAnimationFrame` loop and renders only on demand (see the comments in
`tests/helpers/game.js`). For the record, on this box:

- A frame drawn as the only work in an event-loop task: **5–15 s**.
- The same frames drawn back to back inside one task: **~30 ms each**.
- A stepped simulation tick with rendering suppressed: **0.3–1.0 ms** idle.

That 300× gap between the two rendering figures is what turns an 8-minute suite into a 40-minute one,
and it is purely an artefact of headless software rendering. The 42-test matrix runs in 6–9 minutes
depending on how loaded the box is.
