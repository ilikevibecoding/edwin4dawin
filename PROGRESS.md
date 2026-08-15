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

Scoring after screenshots.
