# PROGRESS — IRONVEIL RANGE (fictional interceptor base demo)

Self-evaluating build loop: build → run → play → screenshot → judge vs rubric → fix → commit.

## Rubric (self-judged from Playwright screenshots + test results, 1–10)

| # | Category | Target |
|---|----------|--------|
| R1 | Base environment & terrain believability | ≥ 8 |
| R2 | Battery asset quality (silhouette, detail, animation) | ≥ 8 |
| R3 | Effects: trails, launches, explosions, debris | ≥ 8 |
| R4 | Lighting, sky, weather, post-processing | ≥ 8 |
| R5 | UI/HUD/radar clarity & readability | ≥ 8 |
| R6 | Gameplay flow & feedback (assign → authorize → result) | ≥ 8 |
| R7 | Performance budgets (calls < 400, tris < 1.5M, 60 fps on mid-GPU) | ≥ 8 |
| R8 | Stability: all Playwright tests green | pass |

**Stopping condition:** all categories ≥ 8, average ≥ 8.5, full test suite green — or the
iteration budget is exhausted (whichever first). Headless CI runs on SwiftShader, so absolute
fps is judged via draw-call/triangle budgets + real-GPU spot checks, not headless fps.

---

## Iteration 1 — v0.1.0 scaffold (complete game, first visual pass)

**Status:** All 7 gameplay tests green. Screenshot harness produces 14 deterministic shots.

**Scores:** R1 4 · R2 4 · R3 6 · R4 6 · R5 8 · R6 8 · R7 8 (calls ~150, tris ~450k) · R8 pass
**Average: 6.1 — keep iterating.**

**What works**
- Full loop: console (scenario/time-of-day/battery, START), radar detection following the
  rotating array, track selection (PPI + holo table + HUD list), ASSIGN / AUTHORIZE, outdoor
  aim-assign (E/F), intercept/miss/decoy/impact outcomes with reasons, debrief + restart.
- Deterministic seeds; fixed-step test API (`window.__game`); object pools for threats,
  interceptors, particles, trails, debris, flashes, decals.
- Procedural audio (wind, hum, klaxon, launches, distance-delayed booms).

**Observations (fix list for iteration 2)**
1. ~~Chromatic aberration catastrophically strong~~ → fixed (subtle now).
2. ~~Trail ribbons zig-zag~~ → fixed (per-vertex direction sign).
3. Trails + smoke are unlit → full-bright at night, too white at sunset. Need time-of-day tint.
4. Night intercept scene unreadable: gray blobs; explosion flash too small at km distances.
5. Rampart canister rack reads as one plywood slab: needs frames, per-canister texture offsets,
   visible covers on both ends, more mechanical detail.
6. Sentinel rail is bare: needs a visible loaded missile, cable dressing.
7. Launch smoke rises too fast and forms perfect balls: reduce buoyancy, add per-particle
   rotation, more size/alpha variation.
8. Mountains too smooth/pale, terrain lacks near-ground detail.
9. Hazard rings slightly gaudy; pad concrete washed out.
10. Fence chainlink aliases to dark bands at distance.

**Perf:** headless (SwiftShader) ~150 draw calls, ~450k tris in overview shot — well inside
budget; real-GPU spot check pending.
