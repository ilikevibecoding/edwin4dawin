# Gauntlet rubric

Every major asset family — car glass, hero car, campground, road, vegetation,
lions, lion feet, lighting, browser performance — is judged by at least three
independent critics on identical frames, ten rounds or more, and a candidate is
accepted only when it beats the incumbent without regressing anything already
approved.

## Frames

Deterministic. `tools/shots.mjs` (truck-relative beauty views), `tools/lions.mjs`
(pride, close, medium, seat, `--walk` contact strip), `tools/campshots.mjs`,
`tools/fleetshots.mjs`, and the `glass_*` view family in `src/camera.js`. The
same view name at the same hour and the same resolution is the same camera,
the same pre-roll, the same wheel dust. Round N's frames live in
`shots/roundN/<family>_<hour>/`; candidates in `shots/cand_<name>/`.

Software rasteriser (SwiftShader) at 640×360 unless the round is about texture
resolution or temporal stability, which are shot at 1280×720.

## Scores

0–10 in each category, per family, where 10 is "indistinguishable from a
shipped high-end title in this frame". Score what is in the frame, not what
the code is trying to do. A category the frame cannot show is `—`, not a guess.

| # | Category | What it means here |
|---|----------|--------------------|
| 1 | Composition | Does the frame read; is the subject where the eye goes |
| 2 | Silhouette | Outline of the subject against its background |
| 3 | Geometry | Enough polygons in the right places; no facets, gaps, floating parts |
| 4 | Scale | Sizes relative to the truck, a person, a lion |
| 5 | Materials | Does each surface behave like what it is |
| 6 | Texture quality | Resolution, tiling, blur, stretching, seams |
| 7 | Glass / transparency | Tint, reflection, refraction, thickness, edges, sorting |
| 8 | Lighting | Direct and indirect light believable for the hour |
| 9 | Shadows | Contact, penumbra, acne, peter-panning, missing casters |
| 10 | Reflections | Environment in paint, glass, chrome, water, eyes |
| 11 | Color / atmosphere | Grading, haze, sky, palette coherence |
| 12 | Animation | Motion believable (lions, wind, dust, wheels) |
| 13 | Physics / ground contact | Feet, tyres, props on the ground; no floating or sinking |
| 14 | Detail density | Enough small things, and the right small things |
| 15 | Environmental integration | Does it belong where it stands; edges, dust, wear |
| 16 | Visual cleanliness | Artefacts: z-fighting, sparkle, banding, cracks, popping |
| 17 | Temporal stability | Across the walk strip / frames: flicker, sliding, jitter |
| 18 | Browser performance | From stats.json / perf report, not from the picture |

## Report

Per family: the scores, then the **top three weaknesses**, each with the frame
that shows it, what exactly is wrong, and an exact fix in terms of the code
(module, material, parameter, geometry), not a wish. Then anything that is
strong and must not regress.

Critics work blind of one another. Where they disagree by three points or
more, the master investigates the frame rather than averaging.

## Rounds

1 baseline and defects · 2 silhouette, scale, composition · 3 geometry ·
4 materials · 5 lighting, shadows, reflections · 6 animation, physics, contact ·
7 atmosphere, dust, sound, integration · 8 close and distant LOD ·
9 performance and memory · 10 blind full-scene review and regression.
Past ten while anything scores under 7.

## Gate

A candidate is accepted when the consensus of three critics scores it higher
than the incumbent on the round's categories and no previously approved
category of any family drops by more than one point. Build, `tools/interact.mjs`,
the lion feet probe (`tools/lions.mjs --probe`) and `tools/perfrun.mjs` must
pass on the accepted candidate before it is deployed.
