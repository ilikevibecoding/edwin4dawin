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

### Iteration 1 (first run) — avg ~4.5
- All 7 tests pass; full loop works (track → assign → authorize → launch → intercept/miss/impact → debrief).
- Observations: chromatic aberration way too strong (rainbow edges); vertex-tint × grunge map double-darkening
  rendered launchers near-black; fence dissolved into white noise; day desert washed out; markings bug drew giant
  red rectangles; trails nearly invisible against sky; perf meter read the wrong pass.
- Scores: env 4 · batteries 4 · physics 6.5 · effects 4 · light/post 3.5 · UI 6.5 · perf n/a · loop 7.

### Iteration 2 (visual overhaul) — avg ~6.9
- Fixed: `tintGeometry` linear conversion (albedo correct), aberration/grain/vignette toned down, PMREM sky
  environment (metals no longer black), Lambert terrain w/ `reflectivity: 0` (killed mirror-sky wash),
  **terrain winding bug** (ground was backface-culled from above — the big white void), mountain massif pass
  (valley gaps, darker rock, baked haze), apron split into tiled asphalt + markings overlay, fence darkened,
  trails: soft-edge shader fix + width growth + additive glow-trail pool, distance-compensated threat glow,
  renderer.info accounting.
- Perf: 119 draw calls / 70k tris under saturation load. Big headroom.
- Scores: env 6 · batteries 6.5 · physics 7 · effects 5.5 (unverified new trails) · light/post 7 · UI 7.5 · perf 8 · loop 8.
- Next: gameplay-view screenshots (launch/intercept from player POV), battery mechanical detail, C2 interior,
  night trail readability, plume shape.
