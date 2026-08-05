# PROGRESS — Castellan Ridge interceptor demo

Self-evaluation loop: build → run → play (Playwright) → screenshot → judge vs rubric → fix → commit.

## Rubric (0–10 each)

1. Base environment & composition
2. Battery assets & animation
3. Flight physics believability (threats + interceptors)
4. Effects: trails, explosions, shockwaves, debris
5. Lighting / weather / post-processing
6. Radar, HUD, UX clarity
7. Performance (60 fps target on mid-range GPU; headless numbers recorded as proxy)
8. Gameplay loop completeness & readability

**Stopping condition:** every category ≥ 8, average ≥ 8.5, all Playwright tests green, and a full
manual play-through of all three scenarios completes without errors or visual breakage.

## Iteration log

### Iteration 1 — initial build + first fix pass

**Built:** full module set (13 modules), deterministic RNG + manual-step test hooks, 17 Playwright
tests + screenshot gallery. Complete gameplay loop works: console → scenario → radar tracks →
assign → authorize → intercept/miss/decoy/impact → debrief → restart.

**Bugs found by self-test and fixed:**
- Terrain triangle winding inverted → terrain was backface-culled (world looked white); fixed CCW indices.
- First RAF timestamp predates module eval → negative dt poisoned FPS/UI throttling; clamped.
- `renderer.info` reset per composer pass → draw-call counter useless; switched to manual reset.
- UI sync throttled by wall-clock → stale HUD in manual-step tests; test hooks force-sync now.
- Playwright `baseURL` missing; sentinel test didn't wait for reload between shots.
- Searchlight cones were solid triangles → replaced with fresnel-faded double-cone shader beams.
- Air bursts invisible at multi-km range → scaled flash/shockwave/debris ~2×.
- Added PMREM environment lighting baked from the procedural sky (metals no longer black).
- Chromatic aberration far too strong; concrete/sun exposure rebalanced; sky dither added.

**Test results:** 17/17 passing after fixes. Headless SwiftShader proxy: 10.3 fps @ 960×540 (q1),
153 draw calls, 0.06M tris — well inside budget; real-GPU check pending.

**Rubric scores (self-judged from gallery):**
| Category | Score | Notes |
|---|---|---|
| Base environment | 4.5 | works but sparse; apron empty, props washed out |
| Battery assets | 5.5 | silhouettes recognizable; need mechanical detail |
| Flight physics | 7 | arcs + guidance believable; polish steering/readability |
| Effects | 6 | trails good; launch/explosion need verification + drama |
| Lighting/weather/post | 6 | day fixed, night dramatic; banding + washout spots |
| Radar/HUD/UX | 7 | holo + console + HUD all functional; PPI wedge misaligned |
| Performance | 7 | budgets green; real-GPU 60 fps check pending |
| Gameplay loop | 8 | complete, tested, restartable |

**Next fix list (iteration 2):** parallel specialist passes — base density/composition, battery
detail, effects drama, lighting/grade, radar/UI polish, physics feel. Then re-shoot + re-score.
