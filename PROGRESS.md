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
files and run the same loop at lower resolution on their own port (see
`AGENT_BRIEF.md`). The master loop judges the integrated result.

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

`hero`, `front`, `rear`, `wheel`, `detail`, `interior`, `forest`, `road` — all defined
in `src/camera.js` and driven deterministically through `window.debugAPI.setView(name)`.

## A note on the harness

Rendering here is software (SwiftShader), roughly 60–170 s per frame at 880x495 for
the finished scene. Two harness problems cost real time before they were understood
and are worth recording:

- **`page.screenshot` races the compositor.** With a frame taking a minute, the
  capture regularly grabbed an empty buffer, which looked exactly like a rendering
  bug. Fixed by rendering N frames with `gl.finish()` between them and reading the
  canvas back with `toDataURL` (`preserveDrawingBuffer` under `?capture=1`).
- **A black frame needs to be detected, not eyeballed.** `sampleLuma()` reports mean
  and peak luminance and the tool warns when a view comes back essentially black.

---

## Iteration 1 — scaffold and first light

Built the whole stack: procedural texture toolkit, kit-bash geometry helpers, truck
(body / wheels / gear / interior), terrain with a graded dirt road, instanced forest,
sky with PMREM, post chain, arcade driving, debug API, Playwright harness.

Two bugs dominated the first render:

- `clock.getDelta()` returns 0 on the first frame, so `accel = 0/0 = NaN` poisoned the
  sprung-mass transform and **the entire truck body vanished** while the axles stayed.
- Foliage used `alphaMap`, which three samples from the **green** channel — every dark
  leaf was discarded, so the trees were bare sticks.

**Score: 1 FAIL, 2 FAIL, 3 FAIL, 4 FAIL, 5 FAIL, 6 FAIL, 7 FAIL, 8 FAIL, 9 PASS.**

---

## Iteration 2 — the black frame, and what caused it

Every view rendered pure black. The luminance probe confirmed it was the render, not
the capture. Bisecting the post stack in a single page load showed the frame was fine
with bloom disabled and black with it enabled — *at any bloom strength, including
zero*. Strength-independence is the signature of NaN: `0 * NaN` is still NaN.

The source was **three's physical `Sky` shader**, which emits NaN and near-infinite
pixels around the sun disc at some turbidity/rayleigh combinations. Those pixels went
into the PMREM environment map, from there into every PBR material in the scene, and
the bloom blur chain then spread them across the entire frame.

Two fixes, both worth having on their own merits:

- Replaced the physical sky with a hand-written analytic one. Always finite, cheaper,
  and the horizon band, aureole, cirrus and sun disc are separate dials.
- Added a firefly-guard pass between the render and bloom that strips NaN and clamps
  the HDR buffer. This is what a production renderer does anyway, and it gives direct
  control over highlight rolloff.

Also swept the key light empirically (`tools/sweep.mjs` renders one view under six
lighting setups in a single page load) and moved the sun to a front-three-quarter
rake that actually lights the truck.

**Score: 1 FAIL, 2 FAIL, 3 FAIL, 4 FAIL, 5 FAIL, 6 FAIL, 7 FAIL, 8 FAIL, 9 PASS.**
Everything still failed, but for ordinary reasons rather than a broken pipeline.

---

## Iteration 3 — four parallel asset agents

Ran four sub-agents concurrently, each owning a disjoint set of files, each running
this same loop at 560x315 on its own port: **body** (`body.js`, `textures/vehicle.js`,
`materials.js`), **wheels** (`wheels.js`), **forest** (`forest.js`,
`textures/nature.js`), **terrain** (`terrain.js`, `textures/ground.js`, `dust.js`).

Between them they added roughly 8,000 lines. Their most useful findings:

- The tyre atlas was uploaded with the default `flipY`, so every bit of moulded
  sidewall lettering landed on the **inboard** sidewall facing the axle, where nothing
  could see it. No amount of contrast in the map would have fixed that.
- Machined aluminium at `metalness: 1` has no diffuse term at all, so inside a wheel
  well — which never sees a bright environment — it renders black. Dropping the rim
  and rotor to partly metallic is what gave the wheel a light end.
- The "pale sticks" forest failure was neither fog nor albedo: the conifer crowns were
  thin enough that bright fog showed through the gaps, and trunks were taking half
  their value from the sky environment. Fixed with fuller crowns, `envMapIntensity`
  down from 0.5 to 0.22, and instance tints that only ever darken.
- Undergrowth that looked absent was actually dense — it was crushing to black against
  the lit dirt. A value problem, not a density problem.

**Score: 1 FAIL** (no key light reaches the subject; everything is ambient fill),
**2 PASS, 3 PASS, 4 FAIL** (blacks crushed, no highlights), **5 FAIL** (no shafts, no
motes), **6 PASS, 7 FAIL** (hex artifact on the ground, dark shards in the plume),
**8 FAIL, 9 PASS.**

---

## Iteration 4 — exposure, and finding the real cause of "no atmosphere"

Raised the sun, opened the canopy corridor, and lifted exposure. Mean luminance went
from 0.126 to 0.238 on the hero view and the truck finally reads properly.

The important discovery was why rubric item 5 had never passed: **the light shafts and
the dust motes were both anchored at the world origin**, with a 60 m and 46 m extent,
while the truck drives hundreds of metres away down the road. Neither had ever been
within sight of the camera in any screenshot.

**Score: 1 FAIL, 2 FAIL** (paint washed out to pale mint), **3 PASS, 4 FAIL, 5 FAIL,
6 PASS, 7 FAIL, 8 FAIL, 9 PASS.**

### Fix list for iteration 5

1. Tile the shaft and mote fields around the vehicle so they are actually on screen.
2. Sun to 52 degrees — at 36 the canopy still closed over the road and nothing but
   ambient reached the truck.
3. Dust plume renders as a cloud of hard-edged dark shards. The sprite is a 2x2 atlas
   being mipmapped, so the smaller mips average all four cells into one solid square.
4. Paint reads as pale mint. `envMapIntensity` was 1.5 over a bright sky, which fills
   the basecoat with white before the clearcoat contributes anything.
5. Honeycomb pattern across the road: the dried-clay Voronoi net is too regular at that
   frequency. Warp the cells.
6. Blacks crushed in the corners — lift the shadows, ease the vignette.

---

## Iteration 5 — in progress

All six items above implemented. Captured to `shots/iter_5/`.
