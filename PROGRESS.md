# ARC WARDEN — build progress

Self-evaluating loop: build → run → screenshot → judge vs rubric → fix → commit.

## Rubric (0–10 each; stop when average ≥ 8.5 and no category < 8)

1. Base environment detail & believability
2. Battery asset quality & distinct silhouettes
3. Flight physics believability (arcs, guidance, orientation)
4. Effects: trails, plumes, explosions, debris, shockwaves
5. Lighting / weather / post-processing
6. Radar, HUD & interaction clarity
7. Performance (draw calls < 420, tris < 1.6M, stable stepping; 60 fps target on mid-range GPU)
8. Gameplay loop completeness & readability

## Iteration log

### Iteration 0 (scaffold)
- Full module split (player/base/batteries/threats/interceptors/physics/radar/effects/weather/audio/post/ui/main).
- Procedural-only assets; pooled particles/trails/debris/decals; seeded RNG + `?test=1` fixed-step API.
- Playwright suite: boot, beauty shots, deterministic single scenario, console, night raid, perf budgets.
- Status: written, not yet run. Next: build, fix runtime errors, first screenshot review.
