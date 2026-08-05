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

---

## Iteration 2 — lighting/tinting/detail fixes

**Status:** all 7 gameplay tests green after changes.

**Scores:** R1 5 · R2 6 · R3 6.5 · R4 7 · R5 8 · R6 8 · R7 8 (305 calls / 135k tris night scene) · R8 pass
**Average: 6.8 — keep iterating.**

**Fixed this iteration**
- Trails + smoke now tinted by time-of-day light (`ctx.world.trailTint`); threat trails keep a
  0.45 emissive floor (reentry heat), interceptor smoke 0.12.
- Per-particle sprite rotation (aRot/aRotVel) removes the "perfect ball" smoke look.
- Distance-compensated explosion flashes (readable at multi-km).
- Rampart rack rebuilt: separated canisters w/ per-canister camo offset, ribs, frames, red
  covers + rims, rear closures — was rendering as a black slab (cloned textures needed
  `needsUpdate`, rest heading faced away from sun).
- Sentinel now carries a visible loaded round (hides on launch, returns after reload).
- Night: brighter moonlight/hemisphere, PMREM environment maps per time-of-day (metals no
  longer black), floodlights balanced (260 cd — 6500 washed the scene out), unlit ground
  decals switched to lit materials.
- Debrief modal no longer leaks into subsequent scenario starts.
- Launch smoke: lower buoyancy, more size/alpha variation.

**Next (iteration 3 — parallel specialist passes)**
1. Base/terrain detail density (clutter, fence, shelter interior, radar install, mountains).
2. Battery visual overhaul (silhouettes, greebles, decals, wear).
3. Explosions/trails quality (sparks streaks, debris trails, shockwaves, reentry look).
4. Sky/clouds/sunset/night drama + grading polish.
5. Radar holo + PPI + HUD refinement.
