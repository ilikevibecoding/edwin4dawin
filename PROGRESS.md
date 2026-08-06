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

### Iteration 3 (gameplay-view polish) — avg ~7.4
- New `tests/visual.spec.js`: POV launch, intercept flash chase-cam, C2 interior, radar site, sentinel erect
  sequence, night-raid trail readability. All passing.
- Fixed: POV launch camera clear of blast walls (T-wall "behind" angle bug — walls were blocking the muzzle),
  Sentinel rebuilt (spaced canisters w/ ribs + two-tone sleeves, 4-leg lattice service tower w/ platforms,
  raised steel deck + handrails, trunnion blocks, dynamic hydraulic anchors that track the erecting cradle),
  partial-gamma vertex tint (pow 0.62 — paint reads correctly, rubber stays dark), Patriot wheels+hubs,
  C2 interior clutter pass 1 (keyboards, binders, notice board, extinguisher, racks, wall map).
- Night trails now read beautifully: reentry glow tip + long moonlit ribbons; intercept banner + debrief clear.
- Observations this pass: threat/booster smoke reads as flat marshmallow (uniform sprite interior + wide ribbon),
  intercept flash tiny at 6 km, apron pad stencils comically large, C2 too dark w/ bare left wall, Sentinel
  cradle side plates hid the round tubes.
- Fixes applied: trail shader wispy noise mask (along-ribbon value noise), smoke sprite interior structure,
  motor exhaust slimmed (60% emit, size1 12), airBurst flash distance compensation (d/950, cap 6.5×),
  pad stencils 2.2 m → 1.4 m @ 0.7 alpha, C2 monitor light spill + clock/readiness placard/duty whiteboard,
  Sentinel cradle rails lowered.
- Perf: 122–173 DC / ~70k tris across shots. Headroom intact.
- Scores: env 7 · batteries 7.5 · physics 7.5 · effects 6.5 · light/post 7.5 · UI 8 · perf 8.5 · loop 8.

### Iteration 4 (visual harmony) — avg ~7.8
- Root-caused the "giant ground text": full pad designation painted 17 m wide next to each pad — shortened to
  'PAD A/B/C'. Root-caused the "opaque trail column": it was a floodlight pole 2 m from the QA camera. Moved
  the camera; relaxed the over-corrected near-fades (ribbons smoothstep 10–48 m, smoke 6–26 m).
- Day palette harmony: warmer/dustier hemi + fog, asphalt texture warmed & lifted (was blue-dark vs mustard
  desert), sand slightly desaturated, mountains warm-hazed, large sun-bleach/resurfacing patches on apron.
- Kit-wide box UV tiling (3 m tile + RepeatWrapping): T-walls, C2 shelter, cabins, decks all show real
  texture density now (was one 512px tile stretched per face).
- THAAD: side stiffener ribs + hatches, underside rails (visible elevated), lighter panels. Patriot: ECS
  vents/door/AC. Interceptors: roll-reference paint bands.
- C2: brighter base light (setFloodAmount was clobbering it), monitor spill, textured walls.
- Full suite 11/11 green. Perf: 121 DC / 72.7k tris under saturation.
- Scores: env 7.5 · batteries 8 · physics 7.5 · effects 7 · light/post 8 · UI 8 · perf 8.5 · loop 8.
- Next: intercept flash verification at range, debris/aftermath shots, threat reentry readability by day,
  radar site detail, sentinel launch smoke variation, spawn-view composition.
