# Trailhead Jeep — build log

A Forza-style beauty showcase: one procedurally built Jeep, a dirt two-track,
and the forest around it. Everything is generated in code — no downloaded models,
no downloaded textures.

Environment: `ilikevibecoding/edwin4dawin`.

## Method

Numbered iterations. Each iteration:

1. Implement the current fix list.
2. Run the dev server, capture beauty views with `node tools/shots.mjs --iter N`.
3. Open the screenshots and look at them.
4. Score every rubric item pass/fail. A maybe is a fail.
5. Loop. Stop when everything passes twice in a row, or at iteration 12.

Per-asset work is farmed to parallel sub-agents that each own a disjoint set of
files (see `AGENT_BRIEF.md`). The master loop judges the integrated result.

## Rubric

| # | Item |
|---|------|
| 1 | Lighting reads intentional: key/fill contrast, glowing emissives, no flat ambient-only look |
| 2 | Materials read physical: paint / metal / rubber / fabric / dirt / bark are distinct |
| 3 | Detail density: no large undetailed surface — panel lines, greebles, tread, bark, ruts |
| 4 | Post stack on and balanced: ACES, bloom, AO, vignette, grain. No blown highlights, no crushed blacks |
| 5 | The scene sells place: dirt road, forest, Jeep planted, it reads as a trail |
| 6 | One cohesive palette across every shot |
| 7 | Tech clean: 60 fps target, no z-fighting, no shadow acne, no missing faces |
| 8 | Cold-look test: a stranger would call it a screenshot from a real offroad game, not a Three.js demo |
| 9 | Interactions work: pointer lock, prompts, climb in, lights, engine check with fades and status |

## Views

`hero`, `front`, `rear`, `wheel`, `interior`, `forest`, `road`, `detail` — driven
through `window.debugAPI.setView(name)`.

## Iteration 1 — scaffold

First complete stack: Jeep body / wheels / interior / details, dirt road with
ruts and puddles, instanced-feeling forest, analytic sky + bounce-card lighting,
ACES / bloom / GTAO / vignette / grain, first-person walk, three interactions,
Playwright harness.

Eight views captured at 960×540 in 33s (SwiftShader). Luma is healthy on most
frames (hero mean 0.28) except **wheel** (mean 0.07) which is crushed.

Looked at every shot. This is a blockout, not a beauty pass.

| # | Result | Note |
|---|--------|------|
| 1 Lighting | FAIL | Headlights bloom, but paint is ambient-flat. Wheel well is a black hole. No readable key/fill on the body. |
| 2 Materials | FAIL | Bronze reads as toy red plastic. No metal flake, no rubber tread, no wet dirt. Glass is a pale plane. |
| 3 Detail | FAIL | Box body, Christmas-tree cones, empty hood, grille is a dark slab, road is a brown plane with pyramid ferns. |
| 4 Post | FAIL | Grain + vignette + bloom are on, but blacks crush (wheel) and highlights on lamps blow. AO not readable. |
| 5 Place | FAIL | Fog soup. Road does not read as a two-track. Wheels not planted. Shafts look like stacked cards. |
| 6 Palette | FAIL | Cohesive haze, but the Jeep is fire-engine red against beige fog — not the bronze / pine / terracotta brief. |
| 7 Tech | FAIL | Stats report 1 triangle (info reset bug). Wheel view underexposed. Geometry is visibly faceted. |
| 8 Cold-look | FAIL | Anyone would say "low-poly Three.js demo". Not close. |
| 9 Interact | FAIL | Harness not yet proven in this iteration. Prompts exist in code only. |

### Fix list for iteration 2 (worst first)

1. **Cold-look / detail** — agents on body, wheels, interior, details, forest, road. Silhouette must read Wrangler. Tread, 7-slot grille, bark, ruts.
2. **Materials** — paint must read metal flake + clearcoat, not red plastic. Tire map must show. Dirt must show ruts.
3. **Lighting** — bounce card actually on the subject; lift wheel-well; stop crushing the wheel shot. Paint less red.
4. **Post** — raise shadow lift, drop bloom on always-on lamps, fix renderer.info stats.
5. **Place** — real two-track, planted wheels, forest that is not stacked cones.
6. **Interact** — prove door / lights / hood with the harness.
7. **Camera** — wheel view is too low and inside the arch; interior is staring at a flat hood.

Eight parallel asset agents launched after this iteration.

---

## Iteration 2 — parallel asset pass

Agents thickened every module. Interactions pass the harness (door / lights / hood).
Shots at 960×540. Forest mean luma 0.032 (black). Wheel 0.069, interior 0.067.

| # | Result | Note |
|---|--------|------|
| 1 Lighting | FAIL | Front is a silhouette. Sun at 24° never clears the canopy. Wheel/cabin crushed. |
| 2 Materials | FAIL | Still reads as matte red plastic. Tread blocks exist but sit in darkness. |
| 3 Detail | FAIL | More gizmos, still boxy. Forest still stacked cones. Road still a brown strip. |
| 4 Post | FAIL | God-ray cards dominate. Grain + vignette crush the dark views. |
| 5 Place | FAIL | Fog + cheap shafts. Wheels not clearly planted. |
| 6 Palette | FAIL | Fire-engine red vs beige soup. |
| 7 Tech | FAIL | Forest camera inside a trunk. Interior camera on the hood. |
| 8 Cold-look | FAIL | Still a Three.js blockout with extra parts. |
| 9 Interact | PASS | `tools/interact-check.mjs`: lights, hood fade, climb-in all fire. |

### Fix list for iteration 3

1. Raise the sun so the key actually hits the Jeep. Bounce + cabin/well fills.
2. Move cameras into the clearing; sit the interior view in the seat.
3. Kill the cheap god-ray planes. Lift crushed shadows.
4. Shift paint off fire-engine red.
