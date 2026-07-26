# Ridgeline Trail — build log

A Forza-style beauty showcase: one procedurally built 4x4 truck, a dirt two-track,
and the forest around it. Everything is generated in code — no downloaded models,
no downloaded textures.

## Method

Numbered iterations. Each iteration:

1. Implement the current fix list.
2. Run the dev server, capture the beauty views with `node tools/shots.mjs --iter N`.
3. Actually open the screenshots and look at them.
4. Score every rubric item pass/fail below, write the next fix list. A maybe is a fail.
5. Loop. Stop when everything passes twice in a row, or at iteration 12.

Per-asset work is farmed out to parallel sub-agents that each own a disjoint set of
files and run the same loop at lower resolution on their own port. The master loop
judges the integrated result at 1280x720.

## Rubric

| # | Item |
|---|------|
| 1 | Lighting reads intentional: key/fill contrast, believable shadow, nothing flat, nothing blown out |
| 2 | Materials read physical: paint / worn metal / rubber / bark / dirt are all clearly different substances |
| 3 | Detail density: no large undetailed surface anywhere — panel lines, greebles, tread, bark, undergrowth, ruts |
| 4 | Post stack on and balanced: ACES, bloom, AO, vignette, grain. No clipped highlights, no crushed blacks |
| 5 | The scene sells place and motion: dust, wind, light shafts, wheels planted in the dirt |
| 6 | One cohesive palette across every shot |
| 7 | Tech clean: 60 fps target, no z-fighting, no shadow acne, no missing faces, no visible instance repetition |
| 8 | Cold-look test: a stranger would call it a screenshot from a real offroad game, not a Three.js demo |
| 9 | Controls work: drive, camera modes, lights, HUD readout |

## Views

`hero`, `front`, `rear`, `wheel`, `detail`, `interior`, `forest`, `road` — all defined in
`src/camera.js` and driven deterministically through `window.debugAPI.setView(name)`.

---

## Iteration 1 — scaffold and first light

Built the whole stack from scratch: procedural texture toolkit, kit-bash geometry
helpers, truck (body / wheels / gear / interior), terrain with a graded dirt road,
instanced forest, physical sky with PMREM, post chain, arcade driving, debug API,
Playwright harness.

Two bugs dominated the first render:

- `clock.getDelta()` returns 0 on the first frame, so `accel = 0/0 = NaN` poisoned the
  sprung-mass transform and **the entire truck body vanished** while the axles stayed.
- Foliage used `alphaMap`, which three samples from the **green** channel — every dark
  leaf was discarded, so the trees were bare sticks.

### Score

| # | Item | Result | Note |
|---|------|--------|------|
| 1 | Lighting | **FAIL** | Sun blows the right half of the hero shot to pure white |
| 2 | Materials | **FAIL** | Paint at metalness 0.72 reads as bare aluminium, not paint |
| 3 | Detail density | **FAIL** | Road surface and terrain are large flat areas |
| 4 | Post balance | **FAIL** | Clipped highlights everywhere, blacks crushed in shadow |
| 5 | Place / motion | **FAIL** | No visible dust, shafts washed out |
| 6 | Palette | **FAIL** | Everything desaturates to white/black; no palette survives |
| 7 | Tech clean | **FAIL** | Visible terrain edge at the horizon, obvious fern repetition |
| 8 | Cold look | **FAIL** | Reads as a Three.js demo |
| 9 | Controls | PASS | Drive, camera cycle, lights, HUD all work |

### Fix list for iteration 2

1. Kill the blowout: exposure down, sun down, bloom threshold up, paint metalness to a
   dielectric value with clearcoat doing the work.
2. Fog colour and density retune — currently a bright grey wash.
3. Road has to read as a road: lighter compacted dirt against dark litter, deeper ruts.
4. Fern cards are enormous, identical and emissive — rescale, vary, de-glow.
5. Trees are bare sticks with sparse cards — raise foliage density, hide bare branches.
6. Hide the terrain edge at the horizon.
