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

---

## Iteration 3 — lighting and cameras

Sun to 46°, cabin/well fills, cameras in the clearing. Luma recovered
(forest 0.30, interior 0.18, hero 0.31). The Jeep is lit. It is still a toy.

| # | Result | Note |
|---|--------|------|
| 1 Lighting | FAIL | Key exists, shadows exist, but the body is still ambient-flat. Interior is a brown slab. |
| 2 Materials | FAIL | Matte plastic. No flake, no tread map, no wet dirt. |
| 3 Detail | FAIL | Box panels, cone pines, empty dash. |
| 4 Post | FAIL | Bloom on lamps in some views. AO/grain not selling the frame. |
| 5 Place | FAIL | Road is a dark strip. Trees are Christmas cones. |
| 6 Palette | FAIL | Red toy + beige fog. Closer, not cohesive bronze/pine. |
| 7 Tech | FAIL | Faceted everything. Stats still noisy. |
| 8 Cold-look | FAIL | Low-poly indie prototype. |
| 9 Interact | PASS | Unchanged, still proven. |

---

## Iteration 4 — albedo maps actually show

White material color so canvas maps are not multiplied into mud. Stronger
paint/dirt contrast. Contact shadow under the Jeep. Paint now reads orange
with a mottled hood in the detail shot. Still a toy.

| # | Result | Note |
|---|--------|------|
| 1 Lighting | FAIL | Directional + contact. No clearcoat streak. Wheel well still dim. |
| 2 Materials | FAIL | Mottling on paint, still no metal/rubber read. |
| 3 Detail | FAIL | Tread blocks and hinges exist; large flats remain. Cone forest. |
| 4 Post | FAIL | Bloom on lamps. No readable AO. |
| 5 Place | FAIL | Two-track hinted. Cones + fog. |
| 6 Palette | FAIL | Orange / pine / tan is closer. Still toy-orange. |
| 7 Tech | FAIL | Jagged edges, floating rocks in some views. |
| 8 Cold-look | FAIL | Anyone says Three.js low-poly. |
| 9 Interact | PASS | |

### Fix list for iteration 5

1. Break the Christmas-tree cone silhouette.
2. Put a catchlight in the env so clearcoat/metal have something to reflect.
3. Keep scoring honestly. Do not inflate.

---

## Iteration 5 — pine crowns and env disc

Icosahedron clumps instead of cones. Brighter clamped sun in the PMREM.
Vision still reads the trees as stacked pyramids. Paint still toy-orange.

| # | Result | Note |
|---|--------|------|
| 1 Lighting | FAIL | Hero has direction and lamp bloom. Body still flat. |
| 2 Materials | FAIL | Mottled orange, not metal flake. |
| 3 Detail | FAIL | Faceted crowns, box body, empty-looking ground from the road view. |
| 4 Post | FAIL | Fast path skipped SMAA — jagged. |
| 5 Place | FAIL | Fog + dark strip. Log in the road helps a little. |
| 6 Palette | FAIL | Orange / pine / tan is a palette, still toy. |
| 7 Tech | FAIL | Jagged edges, floating debris. |
| 8 Cold-look | FAIL | |
| 9 Interact | PASS | |

### Fix list for iteration 6

1. SMAA on in the capture path.
2. Thin the fog so the stand reads as a forest, not a beige wall.

---

## Iteration 6 — SMAA and thinner fog

Edges are cleaner. The read is now "stylized indie racer" (Art of Rally /
Lonely Mountains), not Forza. That is progress on cohesion, not on realism.

| # | Result | Note |
|---|--------|------|
| 1 Lighting | FAIL | Directional, lamps bloom, still no clearcoat streak on paint. |
| 2 Materials | FAIL | Grainy orange panels, matte rubber, no wet dirt. |
| 3 Detail | FAIL | 7-slot grille reads. Large flats remain. |
| 4 Post | FAIL | SMAA + vignette + grain on. AO still invisible. |
| 5 Place | FAIL | Forest + path exist. Motes read as floating shards. |
| 6 Palette | PASS | Orange Jeep, pine, tan haze, blackout trim. Same in every shot. |
| 7 Tech | FAIL | Some floating debris, faceted rocks. |
| 8 Cold-look | FAIL | Indie low-poly, not a shipped offroad game. |
| 9 Interact | PASS | |

Palette is the second pass. Do not inflate the others.

### Fix list for iteration 7

1. Kill capture-time god-ray cards. Shrink motes.
2. Darken verge rocks so they stop reading as white crystals.

---

## Iteration 7 — quieter air, darker rocks

Motes no longer dominate. Rocks no longer blow out. The hero still reads as
a kit-bashed orange truck in a foggy pine stand.

| # | Result | Note |
|---|--------|------|
| 1 Lighting | FAIL | Key + hard shadows. Paint has no specular peak. |
| 2 Materials | FAIL | Satin orange, not clearcoat. |
| 3 Detail | FAIL | Grille and light bar read. Hood is still a slab. |
| 4 Post | FAIL | Vignette/grain/SMAA on. AO not visible. |
| 5 Place | FAIL | Path + trees + puddles. Not a trail you'd drive. |
| 6 Palette | PASS | |
| 7 Tech | FAIL | Faceted crowns, some haze-floaters. |
| 8 Cold-look | FAIL | |
| 9 Interact | PASS | |
