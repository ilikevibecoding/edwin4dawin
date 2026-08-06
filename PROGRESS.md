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

### Iterations 5–6 (night & distance readability) — avg ~8.0
- Night dust wash fixed: smoke ambient lerp-to-white now scaled by ambient luminance (moonlit dust stays dim);
  trail ribbons keep a readability floor so contrails stay a gameplay cue.
- Sky: moon disc crispened (night scattering term cut to 0.30) — no more fuzzy lantern; stars brightened.
- Radar array face lifted (brighter element texture, less metalness) — readable even angled off-sun.
- Desert depth: analytic `terrainHeight()` shared by mesh + scatter; aerial-perspective bake on far flats;
  mountain bajada foot blend; 620 terrain-conforming bushes + 480 grass tufts (alpha-tested crossed quads).
- Kill signature at range: airBurst core flash + shock ring distance-compensated, amber afterglow (2.6 s),
  radial fragment flares, drifting burst-smoke ball → intercept point stays marked ~10 s from 6 km away.
- Launch-plume ground dust trimmed (shorter life/size) — pads no longer sit in permanent haze.
- Perf: 124 DC / 81.8k tris. Scores: env 7.5 · batteries 8 · physics 8 · effects 7.5 · light/post 8 · UI 8 ·
  perf 9 · loop 8.5.

### Iteration 7 (day terrain + trail blob + C2 floor) — avg ~8.3
- 7a: canister stencils on all three batteries (RAMPART / TX-11 / XM-EXP + unit codes), center prompt moved
  below crosshair (was covering the launcher/target), result banner yields to debrief panel.
- Day desert de-mudded: sand map desaturated (green ×0.875, blue ×0.735), vertex tints rebalanced, and an
  `onBeforeCompile` macro-variation overlay (two world-scale samples of a seamless fbm texture: km-scale
  luminance + clustered scrub-patch mottling) breaks the 37 m tile repetition.
- "Mist ring" root-caused: the old vertex-baked gravel ring was a neutral gray — equal-luminance gray next to
  warm sand reads as blue haze. Rebuilt per-pixel in the terrain shader with a compacted-aggregate brown.
- Mountains: warm-dark haze bake + custom boosted fog curve (screen-space aerial perspective per condition).
  First pass (×2.4) erased them by day; settled at ×1.55 — day shows layered hazy ranges, sunset gains depth.
- Terrain rim extended 14 → 20 km so the mesh edge rides ~90% scene fog and dissolves into the sky instead of
  cutting a hard dark line at the horizon; haze bake re-ranged 2–12 km.
- Boost-trail white blob fixed: bloom threshold 1.02 → 1.12 (sunlit smoke no longer feeds bloom), main ribbon
  7.2 w @ 0.64 α, glow ribbon 3.4 w @ 0.9/0.55 — near view now shows motor glow + structured expanding cone.
- C2 interior floor scribbles root-caused: outdoor apron crack/stain decals showing through — painted interior
  floor plane added (0x3d4038 @ y 0.125).
- Full suite 11/11 green. Perf worst case (night raid, 4 tracks + 2 birds): 264 DC / 89k tris.
- Scores: env 8 · batteries 8 · physics 8 · effects 8 · light/post 8.5 · UI 8.5 · perf 9 · loop 8.5.
- Next: battery ground-cable runs + generator hookups, post-launch heat discoloration/scorch verification,
  ground-impact signature (dust column + shock ring) for leakers, mid-ground dune banding from altitude.
