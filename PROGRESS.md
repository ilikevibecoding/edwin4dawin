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

## Iterations 5 to 8 — chasing the key light

Four iterations went almost entirely into one rubric item: **1, lighting reads
intentional**. The truck kept coming back lit by ambient fill with no key on it,
and each attempt found a different reason.

- **5** — tiled the shaft and mote fields around the vehicle so they are on
  screen at all, killed the dust-atlas mipping (a 2x2 sprite atlas averages all
  four cells at the smaller mips, so every puff resolved to a hard dark square),
  and pulled the paint's `envMapIntensity` from 1.5 to 0.7 — over a bright sky
  that much environment fills the basecoat with white before the clearcoat
  contributes anything, which is why the green read as pale mint.
- **6** — put a sunlit clearing in the canopy over the landing so there is
  somewhere for the key to arrive from, and gave foliage an ambient floor.
- **7** — compensated alpha-test mip erosion in the foliage shader, cleared the
  verge back from the camera line, firmed up the key/fill ratio.
- **8** — raised the sun to 61 degrees to clear the tree line entirely.

Iteration 8 is where the conflict became explicit and worth writing down: **a low
sun rakes the flanks but a 24 m tree needs about 40 m of clearance before it
stops shading the road, and a sun high enough to clear the canopy arrives from
almost overhead, which leaves every vertical panel flat.** Moving the sun cannot
satisfy both.

---

## Iteration 9 — a bounce card instead of a higher sun

Car photography does not solve that conflict by moving the sun, it solves it with
a bounce card. So: sun back down to 47 degrees for the rake, plus a low, warm,
unshadowed directional fill at azimuth 252 standing in for light coming off the
clearing floor. Hemisphere down to 0.44 so the fill is doing the modelling rather
than competing with a flat ambient.

That worked — the truck finally has a light side and a shadow side. Scoring the
eight views honestly:

**1 PASS** (key/fill contrast on the truck reads deliberate at last),
**2 FAIL**, **3 FAIL**, **4 PASS**, **5 PASS**, **6 FAIL**, **7 FAIL**,
**8 FAIL**, **9 PASS.**

What the shots actually showed, worst first:

- **Dark torn-paper slivers through the canopy in every exterior view.** Most
  obvious in `front.png`. Present since iteration 6 and never correctly
  diagnosed.
- **The distance is a comb of pale, near-white spires that are brighter than the
  sky above them** (`forest.png`), with findable repetition.
- **The trail is the brightest thing in every frame and reads as beach sand**,
  with a fine white speckle over it that reads as snow, and no legible two-track
  from 15 m. Close up (`road.png`, `wheel.png`) it is a smooth blur.
- **Undergrowth a metre from the lens is a flat dark cutout** — the right half of
  `wheel.png` is one enormous green paper shape.
- **The interior is a pale lavender blob** with two featureless knobs, and the
  brightwork on the nose is chalky white rather than metal.

---

## Iteration 10 — one pipeline bug, then three parallel rebuilds

### The canopy slivers were a texture upload bug

Worth writing up properly because four iterations of shader tuning had been
spent on it. The foliage atlases are drawn on a canvas, and the code already
ended every atlas with a `bleedBackground` pass that wrote a mid green into
every fully transparent pixel — the standard fix for black fringing.

**A canvas stores its pixels premultiplied.** Colour written where alpha is zero
is gone before the texture is ever uploaded: it reads back as black. So the bleed
pass was a no-op, every cutout had a black transparent side, and both bilinear
filtering and GPU mip generation averaged that black into the visible edge. A
probe over the uploaded bytes confirmed it — 77 to 87 per cent of transparent
pixels were pure black.

Fixed in `textures/core.js` with `cutoutTexture()`: draw on the canvas, read the
pixels back, flood the colour through the *entire* transparent field with a
push-pull pyramid fill, and upload as a `DataTexture` so nothing is premultiplied
on the way in. A border dilation is not enough — GPU mip generation averages
colour over the whole tile, so a sparse needle spray on a black field still
resolves to black a few mips down, which is exactly the distance the slivers
appeared at. Transparent pixels now come back at a black fraction of ~0.

### Three parallel rebuild agents

Given the master model was upgraded mid-run, the remaining failures were handed
to three concurrent sub-agents with disjoint file ownership, each briefed to
*rebuild* rather than tune, each running its own capture loop:

| Agent | Owns | Brief |
|-------|------|-------|
| ground | `terrain.js`, `textures/ground.js`, `dust.js` | trail reads as sand; no two-track; mushy close up |
| forest | `forest.js`, `textures/nature.js` | glowing spiky distance; foliage crushes to black; flat undergrowth |
| cabin | `vehicle/interior.js`, `vehicle/materials.js`, `textures/vehicle.js` | lavender dash blob; chalky brightwork; characterless glass |

Their findings are the interesting part, and none of them were the thing the
master loop had assumed:

- **The far billboards were squeezed 2.4x horizontally.** A tile-width constant
  claimed the painted fir filled 0.42 of its cell width; dumping the atlas showed
  it fills the square. Every stand card was a flat-topped organ pipe. That, not
  fog and not the texture, is what the "glowing spires" were.
- **The geometry conifers collapsed to columns at distance** because every volume
  card was created facing radially outward from the bole — which is edge-on
  *exactly* at the crown's outline, so the silhouette was only ever the cards
  packed round the trunk. Ruled out mip erosion first by rendering at `alphaTest`
  0.04 and 0.55 and getting identical images.
- **The broadleaves were parasols**: crowns started at 0.4–0.5 of tree height, so
  the bottom three fifths was bare pole under a disc.
- **The interior's pale wedge was the windscreen, not geometry.** The analytic
  pane reflection had no concept of being indoors, so on a raked screen the
  reflected ray climbed above the canopy line and graded the whole lower
  windscreen to pale sky. Gating it on `gl_FrontFacing` opened the view back up.
- **Judging "is this brown or is it red" through ACES by eye is guesswork.** The
  ground agent added an on-screen red/blue ratio readout to its capture tool and
  drove the trail from 2.4 (terracotta) to 2.0 with it.

### Master-side fixes this iteration

- Fog and dirt values dropped: both were reading *above* the sky they sat
  against, which is what made haze look like glare and dirt look like plaster.
- The dust motes were additive, orange, and uncapped in size, so a mote near the
  lens became a bright disc — they read as dirt on the lens over the whole
  canopy. Capped, cooled and faded out at the near end.
- `debugAPI.stats()` was reporting `renderer.info` after the composer had
  finished, which describes the last fullscreen quad: every iteration so far has
  logged "1 draw call, 1 triangle". Now sampled from a probe pass sitting
  directly behind the scene render.

---

## Iteration 11 — naming the tells instead of the faults

The scores were no longer moving, because "the foliage looks wrong" is not a fix
list. So iteration 11 started by writing down the four things that specifically
say *Three.js demo* rather than *game*, and handing one to each agent:

1. **Cut paper.** Foliage was flat filled shapes with a hard edge and no interior
   value range, so a leaf mass read as one die-cut sheet.
2. **Substitution instead of soiling.** Dirt was replacing the surface it sat on
   rather than sitting in its low spots, so a muddy panel was a brown panel.
3. **Uniform aggregate.** The trail was a texture rather than a surface: no stone
   stood proud of it, nothing was wet, and it therefore had no thickness.
4. **Tidy edges.** Every panel break was a clean chamfer of a constant radius,
   which is a modelling default and reads as one.

What came back:

- **Foliage atlases repainted from value, not colour.** Each leaf gets its own
  base value before hue, plus a vein break-up, so a crown has interior contrast
  at every mip. This is the single biggest change in the whole run.
- **Dirt reworked to bound by ratio and gate on curvature.** It darkens and
  roughens what is under it and collects where geometry turns, so paint stays
  paint underneath. The previous version could take a panel to 88 per cent mud
  regardless of shape.
- **Aggregate that stands proud, and standing water in the ruts** — the trail is
  a surface now, and the wet patches are what sells its depth.
- **Pressed panel forms and deliberately broken edges** on the body, and the
  rubber taken properly black; tyres had been dark grey, which reads as plastic.

Two diagnoses in here were misattributions worth recording, because in both cases
the obvious culprit was innocent:

- **The corduroy ribbing across the trail was anisotropic filtering**, not the
  tread pattern. The footprint smears along the direction of travel at grazing
  angles, and the tool had been used to iterate on the tread for two rounds.
- **The weave crawling over the paint was a period mismatch** between two noise
  octaves sampled at nearly-but-not-quite the same frequency, i.e. a beat
  frequency, not a normal-map amplitude problem.

Master side: an S-curve grade that cannot clip by construction, sub-pixel
chromatic aberration, and airlight in the forest so the depth cue is scattering
rather than a fog fade.

---

## Iteration 12 — the stopping point

Final integrated capture. Scoring the eight views honestly:

**1 PASS, 2 PASS, 3 PASS, 4 PASS, 5 PASS, 6 PASS, 7 PASS, 8 PASS, 9 PASS** —
with two localised blemishes recorded below that do not fall cleanly under a
rubric item but are the first things I would fix next.

Fixes that landed this iteration:

- **The hemisphere sky term was raw zenith blue.** Open zenith measures 0.32
  saturation, almost none of which reaches a forest floor undiluted, and the
  PMREM environment was already carrying the real sky's colour — so every
  shadowed surface in the scene had a cobalt cast from double-counting it. Same
  luminance, a tenth the chroma, green fractionally over blue.
- **The step pads were the brightest surface on the truck**, at 0.675 luma —
  brighter than sunlit paint, on the one part that sits directly in the spray off
  the front tyre. They were bare aluminium on the theory that the sill needs
  something to pick the sky up out of the env map. Serrated plate instead.
- Mud tint darkened and its brightening multiplier taken from 1.34x to 1.02x:
  dried mud is lighter than wet mud, not lighter than the truck.

### Known blemishes at stop

- **The `wheel` view is hot.** At 1 m the dirt shader's lower band covers the
  entire tyre, so the close-up caked mud sits far brighter than it does at any
  other camera distance. The fix is a distance or footprint term on the band, not
  another tint change — three tint changes have now failed to move it.
- **A specular streak across the tailgate in `rear`.** Swapping the applique from
  satin aluminium to steel and knocking the decal off paper-white both failed to
  kill it, which means it is the gate's own recess edge catching the fill, not
  the trim. Wants the fill spot's cone pulled off the rear three-quarter.

---

## Iteration 13 — night, a calmer ride, and live instruments

Reopened on feedback: less bumpy, look around in first person, gauges that move,
a longer course, better suspension, better graphics, and a night mode.

### The ride was two separate bugs, and neither was the terrain

Worth writing up because the symptom — "bumpy" — pointed at the ground, and the
ground was innocent both times.

**The body was pinned to a point sample.** The chassis sat at `heightAt()` under
its own centre and took its attitude from the terrain normal sampled 1.1 m out.
On a two-track that radius reaches from the crown into the ruts, so the sampled
normal swung with every heading change. Worse, the corridor deliberately carries
noise at 2.8 m and 1.05 m wavelengths, which at cruise are 3.4 Hz and 9 Hz, and
the body was following all of it. Measured vertical acceleration at the cockpit
was 83 m/s² RMS — over eight g.

The fix is the standard one and should have been there from the start: sample the
four contact patches, least-squares fit a plane through them, and follow *that*
through critically damped springs. A plane through the wheels filters everything
shorter than the wheelbase for free.

**Half of it was the steering.** Auto-drive aimed at a point four metres ahead
with a gain of 1.9 — 0.4 s of preview — so the truck weaved down every straight.
Lookahead now scales with speed and the controller is damped by the yaw rate it
already has.

**And the chase camera added its own.** It hangs seven metres behind the axle, so
a fifth of a degree of body pitch is a centimetre of camera travel. Hanging it
off the truck's heading alone rather than its full orientation took the default
view from 3.70 m/s² to 1.44.

`tools/ride.mjs` is how any of this is known. Ride quality is a property of the
motion, so it is invisible in a screenshot and unreliable to judge by watching.
It steps the driver and the rig by hand rather than from inside the app, which is
what lets the same probe run against the previous build:

| camera | vertical, m/s² | pitch, rad/s² | yaw, rad/s² |
|--------|----------------|---------------|-------------|
| chase | 91.1 → 1.44 | 11.6 → 0.03 | 2.30 → 0.39 |
| bonnet | 23.9 → 1.64 | 16.3 → 0.57 | 4.49 → 0.98 |
| cockpit | 82.9 → 1.65 | 88.4 → 0.56 | 11.2 → 0.96 |

It also caught `applyLook` referencing a temporary that only exists in
`drive.js`, which would have shipped first person broken.

### Three parallel agents again

| Agent | Owns | Brief |
|-------|------|-------|
| night | `sky.js`, `post.js`, `palette.js` | build night and dusk, then lift the whole light and post chain |
| gauges | `vehicle/interior.js`, `textures/vehicle.js` | the cluster is a painted texture; make it read the driving |
| environment | `forest.js`, `textures/nature.js`, `textures/ground.js` | find what still reads as painted |

Their findings, again mostly not what was assumed:

- **The blown headlight pool at night was the grade, not the lamps.** Removing
  the stand-in throw lights changed the clipped fraction by 0.3 points. Disabling
  stages one at a time on the same frame put it at 5.0 per cent after render and
  ACES, 9.3 after the grade, 10.4 after bloom.
- **`scene.environmentIntensity` was a silent no-op.** It only reaches materials
  with no `envMap` of their own, and almost nothing here is in that set — so
  every mode's environment setting had been doing nothing at all.
- **Undergrowth leaves were 30 cm across.** `shrubTile` drew 60 leaves at 0.13 of
  a cell onto a card authored 1.3–2.3 m wide, so one leaf was a tenth of the
  plant: salal drawn as a rubber plant.
- **Fern fronds were solid blades.** At 44 pinnae the leaflets overlapped by more
  than half their width, so a frond closed up and five fanning from a crown made
  a pale spiky rosette. That, not instancing, was the mid-distance repetition.
- **A star field can be a snowstorm.** Magnitudes peaked at 2.7 linear against a
  bloom threshold of 0.42, so every star convolved into a glowing ball.

### The longer trail moved the shot

The centreline went from 354 m to about 456 m, which put `t = 0.42` somewhere
else entirely: the hero came back at 0.210 mean luma against 0.247, in shade,
with the sun landing on a slope behind it. The clearing is two overlapping
circles now, stretched along the trail to cover the beauty pre-roll, and both are
pushed seven metres up-sun — a gap centred on the road is only half a gap,
because at 47 degrees the trees on the sun side are still standing in the light
and what gets lit is the verge opposite. Back to 0.244.

### Known issues carried forward

- The wheel close-up is still hot, and the tailgate streak is still there.
- The night agent reports `roadStones` reading as hard-edged flat facets in some
  night framings. The stone prototypes have been through several rounds of
  tuning already and this could not be reproduced in the frames captured here,
  so it is recorded rather than acted on.
- Night material separation is thin: 52–59 per cent of coloured pixels sit within
  12 degrees of hue 220. Partly correct for one blue key over a forest.

---

## Iteration 14 — "fading through each other"

The user's remaining complaint, and it named a real bug precisely: *"stuff like
fading through each other, like the thing on the dashboard, maybe some of the
mirrors or seats."*

### The kits were merging things that have to be sorted

`Kit.build` merges every piece sharing a material into one mesh — which is the
whole point of it, and is why the truck is 400 draw calls rather than 4000. But
**there is no sorting inside a mesh.** Triangles blend in whatever order they sit
in the buffer, and the glass is `depthWrite: false`, so nothing rejects them
either.

Every window on the truck was therefore one mesh, and every instrument cover was
another — the windscreen, the side glass and "the thing on the dashboard",
exactly as reported.

Splitting them is only half the fix, and the other half is the interesting part:
**three sorts transparent objects by the object's origin, not by its geometry.**
These kits bake every placement into the vertices, so all four dash covers would
still have reported the truck's origin, tied in the sort, and come out in map
order. Each split piece now gets moved onto its own origin with the offset put on
the mesh.

Flagged per material rather than inferred from `transparent`, because most
transparent materials here are small scattered decals that never overlap and are
better merged. Five windows, four dash covers, ten lenses: **419 draw calls
against 394.**

Worth noting the bug had already been found once and patched locally — the
cabin's screen film carried a hand-set `renderOrder` with a comment describing
exactly this symptom. One instance got a workaround; the general case did not.

### The white blob was not a seat

A close-up of the cabin showed a blown white highlight on what looked like pale
plastic upholstery. Two things were wrong with that reading. The seats were
genuinely too pale — rebuilt with bolsters, a wear dish, piping that follows the
form, and cloth that measures dark and matte — but the *blob* survived with bloom
disabled and turned out not to be on a seat at all.

### applyBrightwork has no cabin gate

The systemic find of the round. `applyCabinBounce` is gated to an object-space
box around the cab so a shared material can behave differently inside and out.
`applyBrightwork` — the analytic sky reflection — has no such gate, so a gear
lever, a seat frame and a mirror pivot sealed inside a closed cab were all
collecting a reflection of the sky. That is why the cabin was full of objects
reading as white PVC pipe.

Fixed surface by surface this round, by moving cabin hardware onto materials with
lower cabin light terms. **The general fix is deliberately not applied**: every
one of those surfaces has now been compensated by hand, so adding the box gate
underneath them would double-correct. It wants doing together with backing out
the workarounds.

### Known issues carried forward

- A `cabin_steelDark` bar in the driver's footwell still renders near-white. Only
  visible from about 25 cm, a framing the showcase never uses.
- The door mirror's glass reads dark. It has a real housing, a recessed pane and
  its own material now, but a mirror is only as good as what it has to reflect,
  and what it has is an analytic approximation.
- The awning is a pale near-uniform tube with no light and dark side.
- The wheel close-up is still hot and the tailgate streak is still there.

---

## Iteration 15 — a second road, a GPU tier, and Rust

Asked for: a main road to drive onto, better foliage, "use my GPU power", and
"use different languages or textures this time."

### Three tiers, and `ultra`

`?quality=` resolves to `fast`, `high` or `ultra`, passed through to the sky, the
post chain, the terrain and the forest. `fast` exists for the software capture
harness. `high` is roughly what shipped before. `ultra` is there because a
discrete card finishes a `high` frame with most of its budget unspent:

| | fast | high | ultra |
|---|---|---|---|
| draw calls | 429 | 470 | 595 |
| triangles | 3.6 M | 4.7 M | 9.6 M |
| shadow map | 1024 | 2048 | 4096 |
| forest instances | 39 k | 55 k | 92 k |
| SSR | no | opt-in | yes |

### The environment map had been black the whole time

The single biggest find of the round, and it had been wrong since iteration 1.
`PMREMGenerator.fromScene` defaults its far plane to 100. The sky dome in the
environment scene sits at 500, the ground disc at 400, the horizon trunks at 120
to 150 — so **every object was outside the cube camera and the environment map
was clear colour.** Reading the target back: mean luma 0.00071 before, 0.03003
after. Separately the tier's sample count was being passed as `sigma`, a pre-blur
in radians, rather than as a resolution.

Every material's ambient and specular response depends on that map, so a great
deal of earlier tuning was done against a black environment.

### The canopy was painted in the colour of the sun

Three's `lights_physical_pars_fragment` adds a multiscatter GGX term to
`directSpecular`. On foliage that was a third to a half of every lit crown pixel.
A leaf albedo is about 0.03 linear; a rough GGX lobe off a 4 per cent white
Fresnel under a key of intensity 3 returns about 0.014 — **and it carries the
light's colour, not the leaf's.**

Proved by ablation rather than argument: killing the key moved the median canopy
hue from 72 degrees (khaki) to 147, while the hemisphere, probe, spot, haze, rim,
transmission and sheen each moved it two degrees or less.

Removing it was correct and cost the frame most of a stop, because a canopy is
most of a wide shot — the hero went 0.243 mean to 0.183. Day exposure is up from
1.34 to 1.52 to put that back.

### The gravel road, and three iterations on the wrong cause

The mainline's near field rendered as cobbled pavement, and three rounds went
into the aggregate — piece size, facet tilt, AO, palette — each landing and
changing nothing. Rendering the unlit albedo showed a clean smooth surface: it
was all in the shading. It was the **anisotropic footprint smear** this project
had already solved for the trail, which the gravel had been explicitly exempted
from on the argument that packed aggregate is isotropic where the trail's crack
network is directional. That argument is wrong. The smear is the sampler, not the
features: a footprint twenty times longer than it is wide averages twenty texels
along the view ray and one across, and the gravel tile is *finer* than the
trail's, so it was always going to smear harder.

### Rust, and why bit-exact was the requirement

`fbm` is the hot path of the whole boot. It now has a Rust implementation
compiled to wasm32 — 4 kB, inlined as base64 so the single-file build stays
self-contained — and the port is **bit-exact**, verified over 300,000 samples.

That constraint is the whole design. Twelve iterations of art direction are
pinned to the exact output of these functions, so a port that was merely close
would quietly rebuild the world. The app checks 4096 samples at boot and stands
down to the JS if any disagree.

Two things that would have made it merely close: `core` has no `f64::floor`, so
it is open-coded rather than taken from libm, whose rounding is not guaranteed to
match V8's; and `Math.round` rounds half towards +infinity while Rust's rounds
half away from zero. `worley` is deliberately not ported, because `Math.hypot`'s
precision is implementation-defined.

Measured in a browser, so V8's JIT against V8's wasm engine: **0 mismatches,
74.6 ms against 39.6 ms, 1.88x.** Boot went from about 23 s to 19 s.

### Known issues carried forward

- Arriving at the junction from the spur does not read as arriving anywhere: the
  spur's churned mouth is the same value as the graded surface beyond it, so no
  road ever *appears*.
- `terrain.roadDistance` returns a sentinel past about 78 m, which caps how far
  the forest's density bands can reach however they are set.
- SSR competes with `applyBrightwork`'s fake analytic skyline; that amplitude
  wants a uniform so SSR can turn it down.
- TAA and per-object motion blur were rejected, not attempted: both need a
  velocity buffer, and neither could have been scored from stills.

---

# Part two: the safari

## Iteration 16 — the biome change

**Build `34d3fc8`, live.** The forest offroad demo becomes a safari driving game.
One route: hero truck on the spur → junction → graded mainline → a tented camp
beside it → open grassland → the pride. Eight specialists in parallel with
disjoint file ownership; the master owns the route (`src/world.js`), the
cameras, the ride, the integration, the harness and the deploy.

### Infrastructure first

- The build stamps its git revision into the bundle and the HUD shows it. The
  deploy tool builds from a clean worktree of HEAD — never the working tree, which
  with eight agents editing is routinely half-finished — pushes, opens the public
  link in a browser and reads the revision back out of the running page.
- Performance sampling from the live loop. Its first run found "Compiling
  shaders" reporting 6 ms and the worst in-game frame at 13.9 s: the browser
  compiles lazily on the first frame, behind a loading screen that has gone.
  Compiling during the load took the worst frame to 774 ms.
- Seven camera modes, 33 automated checks.

### What the specialists found

Every one of these was a diagnosis, not a tuning decision.

- **The glass was never there.** Round zero of the glass gauntlet measured nearly
  every pane at zero coverage. `Kit.emit` recentred each sorted pane by holding a
  *reference* to `boundingSphere.center` and then recomputing the sphere — so the
  reference read back as zero and every pane rendered at the truck's origin,
  inside the chassis. The windscreen the game shipped with since iteration 14 was
  the interior dust film. The gauntlet's hide-and-show A/B per pane is what
  caught it.
- **Any road with real grade was a staircase.** `fillNear` returned the nearest
  centreline sample's grade height: a 4–5 cm riser every 0.37 m, 20 Hz at speed,
  worst analytic acceleration 17.8 m/s². The chassis springs had been hiding most
  of it, but the terrain mesh and the scatter sat on the same stairs. Central
  differences along the tangent: 1.9 m/s², and the mainline now measures smoother
  than the trail on both cameras.
- **Mid-distance trunks were black because of a helper.** `linear()` in the
  vegetation shaders double-converted sRGB — `Color(hex)` already does it — so
  every haze target was about ten times darker than its hex. Fixing that exposed
  a second bug: fixed daytime haze colours glow once night makes them visible.
  Both shaders now fade toward the hour's fog colour without knowing the hour.
- **Stubbing the Vite client breaks `define`.** Three agents independently
  patched the capture tools because blocking `/@vite/client` with an empty body
  strips the dev server's defines and the build stamp throws. The stub keeps the
  env module now.
- **The overhead white blob was a roof.** A galvanised cabin roof at roughness
  0.42, traced by raycast. Matte oxide now.
- **`ultra` was quietly a different biome.** The finer site grid and the density
  multiplier compounded, so 1.5 meant 2.5× the plants and ground cover closed
  over the trail. The multiplier is grid-compensated and means plants per m².

### Measured

| | before (`fast`) | after (`fast`) |
|---|---|---|
| draw calls | 429 | 395 (hero) · 483 (camp arrival) |
| triangles | 3.64 M | 2.16 M |
| ride, chase / cockpit vertical RMS | 1.24 / 1.35 m/s² | 1.12 / 1.06 m/s² (now including the mainline) |
| worst in-game frame (software raster) | 13,870 ms | 774 ms |
| JS heap over 3 reset loops | — | +0.2 MB |
| console / page errors | 0 | 0 |

Budgets at `high`: fleet 78 calls / ~0.5 M tris for 12 vehicles; camp 50 calls /
186 k tris / 7 real lights; savanna 309 meshes / 37 k instances / 582 k tris.
Audio: one noise buffer, 17 oscillators, ~30 biquads, under 1% of a core; a 30 s
scripted drive peaks at 0.73 with the compressor never pulling more than 3.9 dB.

### Frames

`shots/iter_16/` (day: hero, mainroad, forest, front, interior), `shots/iter_16d/`
(dusk), `shots/iter_16n/` (night), `shots/camp_16/` and `shots/camp_16n/`.

### The pride

Landed last, and the feet are the only thing on this project measured to
machine precision: over 1,200 walk frames and 268 steps the probe reports max
penetration 2.3e-14 m, max planted-foot slide 8.5e-14 m and max float 4.4e-15 m,
re-run independently on the integrated build. A planting-and-swing gait that
samples terrain, predicts the landing, shortens steps downhill and holds a
planted foot where it landed while the body moves over it.

The body is right; the face is not yet. At two metres the head is small for the
body, the muzzle boxy, the mouth line reads as a grin, and the fur as suede. At
eight metres in the grass under an acacia it is unmistakably a lion. Build
`2f0f5ba`, live.

### Still open, carried into round one of the gauntlets

- Lion face and head fur; a jaw that opens; a chest fringe on the mane; shorter
  grass in a 15 m radius around the anchor so lying lions are visible at 40 m;
  the midday key plus laterite bounce pushing tawny toward orange.
- A pale band and a thin dark line at the far skyline: the vegetation's
  `forestSkirt` at 420 m fogged to airlight, plus the sky's `ridge_*` cards that
  were authored for the forest ridge. Three agents saw it from three sides.
- Puddle and water-hole reflections return a saturated forest blue that no
  longer matches the warm sky.
- Dusk crown undersides read a touch blue: the `uSky` dusk hue was tuned for a
  closed canopy.
- Brake caliper barely reads through the rim; interior vinyl a touch pale in
  full sun; the door mirror reflects an analytic sky, not the scene.
- Fleet: dents are shade only; cracked lenses read clean at three-quarter angles;
  tread is a lug ring.
- Camp: thin poles flat-shade at close range (merged non-indexed geometry
  recomputes face normals); slot-turn ruts read as a lattice from low angles;
  sub-pixel lanterns vanish at 512 px.
- Crown foliage shows flat cards inside 5 m; termite mounds too smooth; plume
  tufts read near-white in low sun.

## Gauntlet round 1 — baseline and defect inventory

**Build `8754528`**, live: HUD reads `build 8754528 · 2026-09-04 12:46Z`,
zero page errors, smoke-tested by `tools/deploy.mjs`. The rubric every critic
scores against is `gauntlet/RUBRIC.md`.

### Two master-side fixes before the frames were shot

- **The skyline band was the forest's ridge cards.** Two rings of 44–66 m ridge
  silhouettes at 560 and 690 m — unlit, `fog: false`, pale grey-beige — stood
  among the terrain's new far hills as a band brighter than the sky behind it,
  with a dark line along their base at canopy height. The `forestSkirt` was
  already carrying the terrain's far-ground map, so it was not the skirt.
  Removed; the hills carry the horizon and take the hour's fog. Before/after:
  `shots/iter_16/forest.png` → `shots/cand_noridge/forest.png`.
- The water reflection and the dusk `uSky` hue were checked against the frames
  and are fine as landed (the reflection panorama was already redrawn for the
  savanna); dropped from the list.

### A camera family for the glass loop

Seven fixed cameras, `glass_screen / side / shade / rear / mirror / inside /
moving`, in `src/camera.js` under `family: 'glass'`, so the default capture and
the digit keys never see them. The truck heads the same way on the spur every
time, so `+X` is the sunlit flank by day and `-X` the shaded one, and the two
side views are the sun/shade pair. Every frame is taken at 8.6 m/s after the
pre-roll, so the wheel dust is up in all of them. Two framings were moved after
the first capture (the rear view was a picture of the rack ladder, the mirror
view a picture of the snorkel). Round-one glass frames: `shots/glass_r1/day/`.

### Baseline frames

97 frames in `shots/round1/`: `truck_day|dusk|night` (nine views + HUD each),
`camp_day` (six), `camp_night` (four), `fleet` (twelve vehicles, day and
night), `lions_day` (seven), `lions_dusk` (three), `lions_walk` (an eight-frame
strip of one lion walking past a fixed camera, plus close/medium/far/seat), and
`shots/glass_r1/day` (seven). Three critics, blind to each other, score the
identical set; their reports land in `gauntlet/round1/critic_{A,B,C}.md`.

### Measured on the integrated build (`fast`, software raster)

`perf/2026-09-04T12-46-27-505Z-ad7ef04+.json`: 453 draw calls, 2.57 M
triangles, 254 visible objects, 26.9 k visible instances, 4 animated animals,
277 shader programs, 275 textures, 319 geometries, JS heap 334 MB and flat
(−0.3 MB) over three reset loops, zero errors. Boot 43 s under SwiftShader, of
which shader compilation is 24.3 s — 277 programs is the number to bring down,
and a census (`tools/census.mjs`) is attributing them to modules before anyone
guesses.

### The verdict

Three critics, blind to one another (`gauntlet/round1/critic_{A,B,C}.md`,
consensus in `CONSENSUS.md`). Unanimous: the lions are the weakest family —
a bear's head on a greyhound's body with suede for fur — and glass that
reflects nothing is the system defect dragging the hero car, the fleet and the
water down together. Every family floors at 2–4 in at least one category.

Three unanimous findings were investigated rather than averaged, and two of
them were mine, not the game's. "The feet slide": the walk-strip camera hung
off the lion's root, so the animal stayed put in frame while the ground
scrolled 12 cm a frame; shot from a world-fixed camera the stance feet hold
their pixel, the probe was right, and what is actually wrong is a 0.5 m/s
amble with short steps against a full leg swing. "No shadows on the camp or
the lions": true in the frames because the capture tools teleported the truck
without moving the shadow frustum — and true in the game too, because the
sun's shadow box is 44 m around the truck (`shadowExtent: 22`), so the camp
and the pride are shadowless from the road. That is the top lighting item.
"Headlights dead at night": on, with a pool ahead; the lenses do not bloom and
the throw does not read from the side.

### Two wins from the census (`perf/census-r1.md`)

- The boot compile ran with the screen bound, so three keyed every program
  tone-mapped, and the composer's first frame — drawn linear — built them all
  again: 124 of 284 programs were never used. Compiled into the composer's
  target: **277 → 159 programs**, calls and triangles unchanged.
- 211 of 267 textures are DataTextures whose pixel arrays sat in the heap
  after upload, never read again: **JS heap 332 → 216 MB**, frames identical.

Build `45a2074`, live. Round 2 (silhouette, scale, composition) is eight
builders in parallel with disjoint files; the remaining census wins go to
their owners (terrain tiles, fleet per-vehicle merge, forest cells, kit
indexing, shadow-caster list, cache keys).

## Gauntlet rounds 2 and 3 — every family rebuilt once

**Build `a8ca6eb`**, live: HUD reads `build a8ca6eb · 2026-09-04 19:19Z`, zero
page errors, smoke-tested by `tools/deploy.mjs`. Eleven landings since the
round-1 verdict, listed with their builds in `CHANGELOG.md`.

### The landing gate

Round 2 ran eight builders at once in one checkout, so "build the working tree
and boot it" stopped meaning anything: the tree was always somebody's
half-finished work. `tools/gate.mjs` builds HEAD plus only the files being
landed, in a throwaway worktree, boots it at fast, high and ultra, reads the
link status back from every program (three logs a failed compile and carries
on with the program invalid, so the console alone misses it), then runs the
interaction checks. The first thing it caught was mine: the PCSS installer at
high/ultra replaced the stock `getShadow` span up to the point-light block —
exactly where the new cascade had just been spliced — and 107 programs failed
to link at `high` while `fast` was clean (`515984f`).

### What the builders found

- **Lions.** Two builders, body and head, sharing `textures.js`, landed
  together. The head is now built as a cat's — skull loft, brow ridge,
  zygomatic arch, whisker pads, a deeper and longer muzzle, eyes forward in
  carved sockets and 1.35× larger — and the coat is tawny-ochre with dorsal
  darkening and tuft-cell breakup instead of the parallel streaks the critics
  called "suede". The male's mane no longer shows the open ends of its shells as
  rings around the face; the chain ends inside the skull. Two cross-file
  fixes came out of the head work: the blink closed three quarters of the new,
  wider opening (`pose.js` read the old lid angles) and the cornea sat inside
  the enlarged ball (`index.js` read the old radius).
- **Lighting.** Three's `WebGLShadowMap` tests layers against the *rendering*
  camera, not the shadow camera, so putting the far cascade's casters on a
  layer did nothing until the far map got its own pre-pass. With casters picked
  by name and world size the far pass went from 305 calls to 79. The sun-side
  "cream band" survived round 2 because fog converged on a fixed lit-dust colour
  1.35× brighter and warmer than the sky at 1–7° elevation; fog now converges on
  the displayed dome evaluated at the ray's own elevation and azimuth. What is
  left of the band is terrain's: the hills render 1.3 stops under the sky at
  their base (`hillSkyK` multiplies an already-correct airlight down) and the
  0.56 straw flat at 70–300 m is brighter than the foreground ground into the
  sun. That is the round-3 horizon builder's brief, with the frames.
- **Glass.** Reflections were landing at a fraction of their strength because
  the panes were not premultiplied; fixed, with neutral tints. The SSR
  windscreen still shows no bonnet: from the driver-side cameras the reflected
  ray points toward the lens and the thickness test misses; a proper fix is
  two-sided thickness or a depth pyramid, and it is deferred with that reason.
  Door mirrors as real render targets at high/ultra are with the hero-car
  builder.
- **Vegetation.** The grass "glow" at dusk was a bug, not a tuning problem: the
  lamp-transmission path compared a view-space light direction with a
  world-space sun direction and so never recognised the sun.
- **Terrain.** The water hole's panorama reflection had `flipY` on and read the
  zenith at grazing angles — the "flat pale blue disc".
- **Hero car.** Tyres now bear weight: squash by suspension load in the vertex
  shader, a flat patch sunk into the soil, occlusion blobs and a chassis pool
  sampled on the terrain, and tracks left behind.

### Measured (`fast`, software raster)

After the far-pass cull (`perf/…0f8c00e+.json`): sampled frame 962 → 649 draw
calls, 3.35 → 2.38 M triangles, 168 programs, boot compile 31 s at fast, 46 s
at ultra. Heap unchanged from round 1's 216 MB.

### Next

`tools/baseline.sh` is shooting the full round-2 frame set into `shots/round2/`
from a clean worktree of `a8ca6eb`; three blind critics score it against
`shots/round1/` next, and their consensus decides the round-4 briefs. Running
now: the horizon builder (`src/terrain.js` far hills and flat, `src/forest.js`
skirt and treeline) and the hero car's geometry round (arches, brakes,
suspension, lamp lenses at night, cabin colour, door mirrors at high/ultra).

## Gauntlet round 2 — verdict, and round 4

**Build `4bdaba9`**, live: HUD reads `build 4bdaba9 · 2026-09-05 01:11Z`, zero
page errors, smoke-tested by `tools/deploy.mjs`.

### The critics on round 2

Three blind critics on 103 frames of `a8ca6eb` against round 1
(`gauntlet/round2/`). Critic B's line stands for all three: "round 2 fixed the
car and broke the world." The families that were rebuilt from the inside — hero
car, glass, tyre contact, day shadows, gait — scored up, some by three points.
The three things that sit behind the truck in every frame scored down: the night
sky (A counted 20 % of sky pixels lit, against 0.45 % in round 1 — it read as
snow), the far hills (measured on `mainroad`: hue 33° sat 0.14 in round 1, hue
220° sat 0.44 in round 2, darker than the sky at their base) and the shade under
the mess canopy (3.4 stops under sunlit dirt, a hole). The lions' eyes, the one
lion-like feature round 1 had, closed to slits in the round-3 head.

By the rubric round 2 did not pass: colour/atmosphere and cleanliness dropped
two to three points in three families. It had also been deployed before the
critics scored it. Both facts are in the consensus; the regressions were made
blocking for the next deploy rather than queue items, and the process note is
that the live preview follows *scored* candidates from here.

### Investigated rather than averaged

Four findings were mine, not the game's. B's "chase camera inside the truck's
flank" on every HUD frame: the tool parks the camera on the hero view for its
shader warm-up, and the HUD screenshot two seconds after `resume()` caught the
chase camera still easing back across the flank — `rig.snap()` now lands it
first, and the re-shot frame shows the chase cam seven metres back. B's
"magenta soil": measured hue 24° sat 0.60 in both rounds, unchanged — a contrast
illusion against the new blue hills. C's "HUD stamp is the wrong build": the
worktree was at the bundle commit, one ahead of the source. A and C's half-size
glass frames: the glass gauntlet's default, now 640×360.

### Round 4

- **Stars.** `starGrid` floored every star at a whole pixel at 640 wide, and the
  night palette went through `lin()` twice so the dome was black and the stars
  sat on the grade's grey lift. Points, two grids, no dusting, a Gaussian Milky
  Way band: 19.8 % → 0.75 % of sky pixels over 0.35 luma.
- **Hills.** The hill airlight was lit-dust `fogColor` times a cooling factor —
  navy into the sun, brighter than the sky with the sun behind. It is now the
  displayed sky at the ray's own elevation, toned 0.87 so the range sits under
  the ridge sky at 0.72–0.92 of it. The straw flat and the forest skirt take the
  near terrain's level with one shared falloff, so the cream band is gone.
- **Camp shade.** Ablation showed the shade was hemisphere + environment and
  nothing else, at a key:sky ratio of 8:0.2 on a horizontal surface. Hemisphere
  0.5 → 2.5, sun 9.4 → 7.9: 3.4 → 2.25 stops, chairs readable. The rest is the
  camp's wear decal at `envMapIntensity` 0.25 and the terrain's own indirect
  response, both handed to their owners with numbers.
- **Dusk front.** Ablation: lights off −0.04, bloom off −0.05, key off −0.24. It
  was a 7.0 key square to a 6° sun. Key 4.0; clipped pixels 14.5 % → 2.8 %.
- **Lions.** Eyes measured by raycast against the mesh: 35 % → 70 % of the iris
  unoccluded from the face camera. Paws, contact blobs, continuous loft normals,
  thicker legs, a sheen for the dusk rim. From the front the head still reads
  bear-like; the next head round works to measured skull ratios (zygomatic width
  0.62–0.68 of head length, a 0.33 L boxed muzzle, eyes at 0.45 of cheek width)
  instead of adjectives.
- **Fleet.** Pools only under lit lamps; a parked camp shows markers, one arrival
  with headlamps, a dome light and a lit window, not twelve headlamp blasts.

### Measured (`fast`, software raster)

Draw calls and triangles unchanged by lighting, horizon and fleet: day hero 540
calls / 1.93 M tris, camp mess 566 / 2.12 M, lion close 535 / 1.78 M. Fleet at
`high` 78 calls / 514 k tris (+0.3 %). Boot compile at fast 62 s under a
saturated box (four builders' browsers running).

## Round 4, wave B — five builders, five diagnoses

**Build `80cb5e6`**, live: HUD reads `build 80cb5e6 · 2026-09-05 02:52Z`, zero
page errors. Combined gate on HEAD: 174/175/177 programs linked at fast/high/
ultra, 33 interaction checks passing.

The pattern of this wave is that every builder found the cause of its brief
somewhere other than where the critics pointed, and each time the measurement
came first and the fix was small.

### What the critics saw, and what it was

- **"Black hole under the mess canopy."** Round-2 lighting had already brought
  it from 3.4 to 2.25 stops by raising the hemisphere. The campground builder
  found the remainder: the mess tent laid an 8 × 5 m dark ground sheet, which
  was the slab, and the camp's matt materials sat at `envMapIntensity` 0.3 so
  the raised sky never reached them. Sheet removed, env 0.8: 1.5 stops, inside
  the 1.5–2 band the consensus asked for. Third and last round-2 blocker closed.
- **"The fire is a candle."** Not the night gate (`camp.level` was already 1).
  Four core tongues at `fast`, the tripod pot hanging on the flame axis in front
  of the camera, and decay 1.5 concentrating the light at the ring. Six standing
  tongues at every tier, tripod swung 0.5 m off axis, decay 1.0; the hottest
  colour moved off white so the additive stack stops summing to a clipped disc.
- **"The plain went bald."** Partly a tier bug: the grass count was a function
  of `treeCount`, so `fast` was silently shipping 70 % of the grass the other
  tiers had. The rest was the density field's window clearing whole cells and a
  ×0.33 falloff at 22–48 m. Tufts in the lower third of `lion_far`: round 1
  21, round 2 0, now 149.
- **"Trees are black at night."** Not alpha. The crown fill self-measures the
  hemisphere, and under the new night sky the hemisphere is 9 % of day and the
  key 5 %, so the fill collapsed to 0.025 and the cards sat at 0.37× the sky.
  A per-material night floor holds them at 0.48× — present, darker than the sky.
  The floor is a stopgap and should come down if lighting brightens the night
  hemisphere; noted for both builders.
- **"Brown wall behind the pride."** Hide-by-name: `treeline_*`. Its "gated"
  scrub foot ran the full strip width because the fbm sat above the gate. One
  layer, gated, seven trees per strip bunched into two thirds of it, aerial
  perspective toward the hour's fog. The yellow band beyond it persists with the
  skirt hidden — that is terrain past 860 m, handed to terrain.
- **"Lions lurch into a walk."** The feet probe said planted feet never moved,
  and it was right; the 20 cm chest drop over the first second of every walk was
  swings started as time-based durations at the slow ramp speed, which then
  overlapped as the cadence tightened and put three feet in the air. The cycle
  phase now resets at set-off and swings run on the phase. Never more than two
  feet airborne from stand to walk.
- **"Bear, hippo, plush."** The head builder measured the mesh against a lion
  skull and found two structural faults, not proportions: the nose leather sat
  level with the eyes' lower rims, and crown–brow–bridge was one ramp. Nose 6 cm
  under the eye centre with a real stop, flat crown, brow ledge, straight bridge;
  then the ratios (zygomatic 0.63 L, muzzle depth 0.34 L, interpupillary 0.46 of
  cheek width, ears 0.25 L). `tools/lionhead_measure.mjs` prints the table from
  the built mesh so the next round can be argued in numbers.
- **"Dusk grille blown."** The car builder A/B'd every term it owned — lamps,
  bloom, lamp glow, brightwork env, clearcoat — and none moved the clip more
  than five points; the key alone took p95 from 0.85 to 0.58. Lighting's key
  4.0 lands the grille at clip 0 %; to sit under the sky it reflects, the car
  builder's number is a key of ≈3.0 at 6°, offered to lighting as optional.
- **"Side glass is an open window."** Measured: the gauntlet's `side_sun`
  camera is 1.3 m from the door at 0–20° incidence, where no Fresnel
  brightening is physically due. A grazing term now shows in raked views, and
  the metric's drop (0.72 → 0.67) is entirely the mirror pane the gauntlet
  counts as glass — door glass alone is 0.91 both before and after.

### Decisions

- **Mirror at `fast` stays painted.** The live pass costs 98 calls / 1.03 M tris
  per pane at high, and from the seat cameras the pass count is zero — the pane
  faces outboard and is back-face culled. A live mirror at `fast` would have
  bought nothing where the critics looked. The painted version now samples the
  PMREM by reflected direction with the truck's flank ray-tested in.
- **Bucket grids per family.** Profiling put scrub at 56 calls for 16 k tris and
  swath at 44 for 5.5 k — a call per 300 triangles. Scrub, forb and swath go to
  2×2; grass and litter, which carry the triangles, keep 4×4. Calls net down on
  every view but `mainroad` (+14); triangles +10–16 %, which is the grass coming
  back.

### Measured (`fast`, software raster)

Truck at hero 540 calls / 1.93 M tris, unchanged by its materials round. Camp
49 → 51 calls, 169.5 → 178.2 k tris, 5 → 7 point lights. Vegetation: day forest
622 → 544 calls, day hero 539 → 487, mainroad 604 → 618. Lion head triangles
unchanged; feet probe pen 1.7e-14, slide 1.1e-13, float 2.7e-14 m. Boot at
fast 33 s on a quiet box (62 s under four builders in the last entry).

### Hand-offs carried

Lighting: night hemisphere is what would carry the crowns further; dusk key
≈3.0 optional. Terrain: the far-ground band past the skirt in the pride views;
indirect response in shade. Car geometry: the door mirror is aimed ~13° back of
outboard instead of toed in, so neither the live pass nor the flank paint shows
from the driver's cameras — `body.js` plus the gauntlet's mirror camera. Lions:
tail-root sway is ±10° against a 12–20° spec because more crossed the hind legs
in the medium view; `anim.headBob`/`roll` in `index.js` are now dead and can go.
Camp: a non-additive flame core (premultiplied with a heat LUT), the fire pool
to 4 m if the night ground stays warm, the second gate post a step less silver.

### Next

`tools/baseline.sh` is shooting `shots/round4/` from a clean worktree of
`80cb5e6`. Three blind critics score it against round 2; if the three blockers
read as closed and no family drops two points, round 4 passes the gate the
first time and rounds 5–10 begin on the consensus.

## Gauntlet round 4 — verdict

**Pass, first time.** Three blind critics on 103 frames of `80cb5e6` against
round 2 (`gauntlet/round4/`). Every family flat or up; Materials — the round's
category — up in every family that can show it for A and B and in three for C;
the only drops are single points on new artefacts (the night light bar for B
and C, glass see-through for A, the dusk contact decal for C). Means 5.67 →
6.19, 5.70 → 6.30, 5.44 → 5.83.

### What the three agree on

The lion is the weakest object in the game and all three say why in the same
words: a constant-radius body with Gaussian mounds where a scapula plane and a
hip knuckle should be, fur that is an isotropic mottle with no rim response, eyes
proud of the face. The night hero has three things in it brighter than anything
real: the light bar, and two discs in the sky. The hills lost their cobalt but
not their value error — into the sun they are under the floor, with the sun
behind they meet the sky. The shade under the mess is right on the open floor
and a stop and a half too deep in the pockets. The water hole is mud.

### Investigated rather than averaged

The discs were the interesting one. A read a moon with no disc, B a moon and a
bloomed star, C the headlamp beams' slices. On a served build they survive
hiding the sky (no stars, no moon), the dust points, every scene root and every
post pass; the moon projects to (1 490, −1 385) at 51° elevation with the camera
pitched 2.4°, so it is not in the frame. With everything but the lights hidden
the frame holds a row of cool discs along the light bar's line and a row of
warm ones along the headlamps', each stepping away from its lamp and shrinking.
`fast` draws a beam as twelve cross-section quads spaced by a 1.35 power; from
55–65° off-axis each slice's bright core is its own soft disc. (My own hide of
the beam group had not held: `update()` sets it visible every frame.) C had the
mechanism; A and B had the moon.

Two readings that all three critics made were tool defects, and old ones. The
trailer has been framed through a tent roof since round 2 because the fleet
tool's occluder raycast needed a `Raycaster` it imported from `/node_modules`,
which only the dev server serves — every baseline is shot from a preview, so the
camp's tents never counted. The walk strip stepped 0.12 s from six metres and
the lion moved a quarter of the frame in eight frames; every gait reading this
round — stride, flexion, head bob, tail — was made on seven tenths of one cycle.
Both are fixed and the incumbent frames re-shot.

Also checked: the crown knobs one critic called defaults are on (the dusk crown
is 3.2 st under the sky *with* them, a cap problem); the pride plain is bald
because the graze ring thins as well as shortens (A read the code and gave the
fix); the lion head in the frames is the round-5 head (A suspected a mismatch —
the side read stands as a finding); the mirror metric cannot pass a real
reflection (the finding is the aim, 13° back of outboard, from the car
builder's own report).

### Process

Fourteen orphaned preview servers from earlier gates were alive on the box: the
gate killed the `npx` wrapper and not the node child. It kills the process group
now. The rubric records the deploy/accept order — the live preview follows
gated builds, acceptance needs a scored consensus, a rejection rolls the preview
back the same day.

### Next

Round 5 is the rubric's lighting, shadows and reflections round, which is where
the open items sit. Five builders are on the consensus briefs (lighting, hero
car, lions, campground, vegetation) with terrain still out on its round 4; the
HUD items are mine. Then `shots/round5/`, three critics against round 4.

## Round 5 — six builders, and the finding that outranks the round

Landed in order: lighting `cef8466`, collision `f6b370b`, hero car `c8ccad2`,
vegetation `f1689c7`, terrain `0dc79bb` (live, bundle `d8a9ed9`), roadside
`6ca9b3e`, gate `3428229`, terrain cap `f93a567`. One gate on the whole tree,
three tiers, 57 interaction checks, `CLEAR`.

### The road on real hardware

The user sent a screenshot: the truck through a culvert headwall, the road
around it near-black with lit stones on it. Two defects, and the second is the
one that matters. The first is that there was no collision — that is the
collision entry below. The second is that the road was not dark: it was
*absent*. The terrain program bound 21 sampler uniforms. SwiftShader, which
every frame in every gauntlet round is shot on, offers 32 fragment texture
units; ANGLE over D3D11, and the Chrome on a Mac or a Windows machine, offers
16. On the user's GPU the program failed to link, three logged it and dropped
the mesh, and the far-plain mesh underneath rendered as the road. Hiding the
terrain here reproduces the screenshot pixel for pixel (crops of the user's
frame beside it under `shots/r5_terrain/crops/`). Stones lit, ground dark: the
stones were real, the ground was a different object.

So for four rounds — 103 frames a round, three critics, a pass in round 4 —
the road every real player saw was a hole, and nothing in the process could
have caught it, because the process shot on a device with twice the limit.
That is the lesson of round 5, and it is a process lesson: the gate read
link status back from every program (a round-2 fix) and it was true here and
false there. The terrain builder found it while chasing the user's screenshot
and could not reproduce it; the sampler count in the program's link log was
the tell. Fix: ten of the terrain's tile maps ride in two `DataArrayTexture`s,
21 → 13 samplers, same bytes. The gate now counts every program's sampler
uniforms and fails past 16; run against the pre-fix terrain it fires on two
programs at 21, and on the landed tree the maximum at any tier is 13. What it
still cannot see: varying-vector and uniform-vector limits, which differ by
less between the two, and anything a driver does differently at equal limits.
Confirmation on the user's own machine is the only real test; the preview is
that test.

### What else landed, and what each found

- **Collision.** The truck had no colliders at all. ≈500 2-D colliders now
  (trees from the instance matrices, roadside parts from the kit, camp from the
  plan's own segments, fleet OBBs, lions as soft circles), three circles for
  the truck, MTV push-out with a velocity split into scrape/bounce, a yaw kick
  from the lever arm, impact and jolt for audio and camera. The builder's own
  finding: auto-drive was clipping the camp side of the spur — kopje boulders
  and a guest tent — because the pure-pursuit odometer fell behind on corner
  cuts and the layout scattered rocks onto the road. The headwall the user hit
  is 70 m from the junction; that was manual driving, and it stops at the face
  now. 0.001–0.005 ms a frame.
- **Lighting.** The beam discs are two representations of one cone,
  cross-faded by view angle; broadside peak/trough 4.05 → 1.26. And a latent
  bug: `groundIndirect` had been multiplied in after `outgoingLight` was
  summed, so the night dial had never done anything since it was written.
  The dusk sand over the sky that round 4 pinned on SSR is the lamp pool —
  the pass off changes no pixel, the lamps off take it to zero. Two of the
  round-4 diagnoses were wrong in the same way: a plausible mechanism named
  from the frame, not the ablation. The critics' hypotheses are leads, not
  causes; every builder ablates first now.
- **Hero car.** The bar slab was the nine pods themselves, each a hot core at
  2.5× the bloom threshold; the cover was innocent. Nine pods read now, the
  box is 417 px over 0.5 against a 300 target, and what remains is the cover's
  specular over the reflector bowls. The mirror was culled from every seat
  camera (normal 13° aft); turned 22° inboard it shows horizon and flank. The
  clearcoat change regressed the dusk grille by a fifth of a stop before the
  builder found the satin base's direct lobe and index-matched it.
- **Vegetation.** The pride plain's "18.6 % straw" was 96 % soil fleck; the
  grass under the lions was 3 % of the pixels. Three size factors stacked to
  0.42 and the lawn species were the flat ones. Turf at full count now — but
  khaki, so a straw colour mask reads it as unchanged. The round-5 critics are
  told.
- **Terrain.** Hills fog to the sky over their own ridge, with a ceiling and a
  floor as luminance scales pre-ACES. Three of four frames in band; the
  into-sun crest rows of `lion_far` are not lifted by a floor that should hold
  them and the builder ran out of session on it. The water hole reflects the
  dome and the kopje. Two of the five round-4 hill boxes were sky against sky.

### Measured (`fast`, software raster)

| | round 4 (`80cb5e6`) | round 5 (`0dc79bb`) |
|---|---|---|
| programs / textures at fast | 174 / 293 | 176 / 290 |
| max samplers in any program | 21 | 13 |
| hero view, whole frame: calls / tris | 560 / 2.37 M | 560 / 2.37 M |
| collision resolve, mean / batched pushing | — | 0.001 / 0.005 ms |
| interaction checks | 30 | 57 |
| night mainroad ground median (linear Y) | 0.011 | 0.023 |
| beam broadside peak/trough | 4.05 (bar 55.9) | 1.26 (bar 1.30) |
| pride tuft cover, lower third | 3.3 % | 39.9 % |

### Process

The terrain builder timed out after finishing its edits and its after set but
before its report and gate; the tree was complete (the after frames were shot
from it), so it was gated and landed as-is and the report asked for
afterwards, read-only. Three builders' gates failed on the collision builder's
uncommitted `interact.mjs`, which asserted a collision world no HEAD build had:
a check landed in the tool before the feature it tests. Order of landing now
follows that dependency (collision first), and a builder adding checks says so
in its report's first line.

### Next

`shots/round5/` is being shot from `0dc79bb` (with the native-resolution ultra
frames for the first time); three critics against round 4, with the hill
boxes moved onto the ridge rows and the note about the khaki lawn. Fleet r4 is
running. Round 6 briefs come from the consensus; the standing hand-offs are the
bar cover's specular, the hemisphere for the shade pockets, `BEAM.dusk`, the
into-sun crest floor, and the lion's day rim.

## Gauntlet round 5 — verdict, and round 6 so far

**Pass on all ten families** (`gauntlet/round5/`, 34 evidence frames under
`frames/`). Three blind critics on 111 frames of `0dc79bb` against round 4;
the round's categories — lighting, shadows, reflections — up in five, two and
four families and down nowhere. The only drops are single points, and the one
on a gate-adjacent category (Car glass Temporal 6 → 5 for A and B) was run
down to the tool: `moving.flick` rose because the pane is clearer and the
metric measures the world through it (0.89 of the background's own flicker),
so it is held at 6 and the tool is told to report `flick / flickBg`. Means
6.24 → 6.47, 6.26 → 6.52, 5.88 → 6.09; all 126 cells 6.17 → 6.40. Lions
5.36 → 5.93 is the largest move and still the lowest row.

### The frames were wrong before the critics were

The truck sets were shot twice. The first set had the truck 6 m back along
the spur with verge grass across it (the collision builder's curvature speed
cap, fixed by pinning the pre-roll speed) and then, pinned, nose-down 5.7°
(the driver reading its pin as a brake held to the floor, fixed by a cruise
mode that balances throttle against drag). Critic C had already passed the
pitched set; A and B were mid-review. The truck, glass and native-resolution
sets were re-shot level and all three re-judged Hero car and Car glass on
them: Cleanliness 7 → 8 / 5 → 7 / 5 → 6, glass Reflections up for A and C,
and four findings withdrawn that had been the pitch — a dusk bar blob of
885 px, the grille over the sky, a bonnet band, a beam-pool slab. The
`mirror` frame in the pitched set had no mirror in it and was scored anyway;
the tool fails under 3 % pane cover now. Capture placement must not depend on
driver dynamics, and a tool must say when its subject is not in the frame:
both are process rules from this round.

### Investigated rather than averaged

Seventeen splits settled by measurement (`CONSENSUS.md` §1–17). The ones that
changed a brief: the water hole is the colour the terrain builder says *and*
B's number is right (a dome sample that the shore's mud ring pulls down); the
pride turf is khaki because it is turf, not straw — the species, not the
count; the hills are in band on every frame including the one A read at 1.02
(sky against sky) while B's "plate" — crest darker than body by 11 % — is
real and new; the lion's planted feet hold to 0.1 px on the probe and the
decal is invisible only because the strip's camera was 9° off the ground; the
night sky is the intended lighting trade overshot by half a stop, not a
regression; the campfire pool is C's slab and B's "holds" was a flame number;
the hero's bar meets its target at linear 0.5 and C's 598 px is the same
pixels counted at sRGB 0.5; the door mirror is a legible pane and a painted
plate, both true.

Not settled: hero car r6 (`5dc56cd`) is in no scored frame — its pod claims
and its `BEAM.dusk` cut wait on round-6 frames, and the consensus found the
dusk trail pool on the level truck was already in band (0.145 vs 0.150 in
round 4), so the cut was made against the pitched pool and r7 must re-measure
before keeping it; a 1 px stipple on the door glass at 1280 that a frame
cannot attribute (pane SSR or dithered alpha — an `?ssrpane=off` A/B is the
hand-off); the lion's head-to-body ratio C put at 0.42 (measured since by lion
form r7 on the mesh: 0.233 lioness, 0.244 male — C's figure is a width ratio
in a foreshortened pose, and nothing was scaled).

### Round 6 so far

Landed and live in order: hero car r6 `5dc56cd`, lion gait r5 `b8f1636`,
lighting r6 `cd33826`, campground r5 `0a52cc9`, lion form r7 `522cbdc`, then
the capture and tool fixes (`CHANGELOG.md`, "Round 6 landed"). Two of the
consensus's diagnoses were overturned by ablation on the way, which is now the
rule for every brief: the bar's residual was the pod cores over the bloom
threshold, not the cover's specular; the dusk sand over the sky was the lamp
pool, not SSR. Lion form r7's own finding is of the same kind — the "pale
sclera" a classifier still counts (78 → 69 px re-centred) is lit cheek skin
50–62 mm from the eye, not sclera, after five colour-coded ablation builds.

The new `moon` view found something no critic could: every star is a vertical
dash — the field is drawn in octahedral map space, whose scale differs along
azimuth and elevation, so an isotropic blob there is stretched on screen, and
in a sky-dominated frame the field reads as falling snow. Lighting r7.

### Measured (`fast`, software raster)

| | round 4 (`80cb5e6`) | round 5 (`0dc79bb`) | now (`e244efd`) |
|---|---|---|---|
| programs at fast / high / ultra | 176 / — / — | 175 / 176 / 178 | 175 / 176 / 178 |
| max samplers in any program | 21 | 13 | 13 |
| interaction checks | 30 | 57 | 57 |
| campfire pool median Y / sat (night) | 0.148 / 0.75 | 0.355 / 0.33 | 0.17 / 0.51 |
| hero bar over linear 0.5, critics' box (night) | — | 218 px | verify on round-6 frames |
| lion dusk rim median over the flank | — | +0.55 st | +0.86 st |
| lion tris, lioness tier 0 | 23 151 | 25 397 | 26 685 |
| body pitch at the truck shot | 0.2° | 5.7° (re-shot 0.2°) | 0.2° |

### Process

A machine overload — two builders, a native-resolution capture and a
consensus writer at once, load 54–63 on four cores — killed five builders'
sessions with their edits intact in the tree. Every builder now runs one
capture at a time and checks the load before it; at most two builders and one
capture run together. A builder that dies is resumed, not restarted, and told
which of its hunks are in the tree. Landing order follows tool dependency:
a check lands with the feature it tests, never before.

### Next

Vegetation r6 (straw lawn, dusk crown cap, sun split, forks) and terrain r6
(into-sun ridge rows, kopje reflection, trodden pride ground, skirt band) are
running; lighting r7 (star footprint, night ground hue, penumbra, camp band,
paint over sky) and hero car r7 (pods at 1280, windscreen graze from outside,
glare profile, near-field spill, clearcoat, `BEAM.dusk` re-measure) follow,
then the live mirror pane from the seat and lion form r8 (the brow, the
muzzle head-on, the coat's flow field). Then `shots/round6/` from the landed
tree — with `moon`, the 2.2 m walk strip and a fleet set that finally carries
fleet r4 — and three critics against round 5.

## Gauntlet round 6 — verdict

**Pass on all ten families** (`gauntlet/round6/`, 43 evidence frames under
`frames/`), but not unanimously at the critic level, and the split is the
round's lesson. Three blind critics on 114 frames of `c2f0b83` against round
5: A passed; B and C failed the round on one picture, the ground ahead of the
bumper blown white in `truck_night/front.png` and `truck_dusk/front.png`
(lower third median 0.016 → 0.493, 0 → 37 535 px over linear 0.5; Hero car
Visual cleanliness 7 → 5 for both). The round's own categories — Animation,
Physics / ground contact, Temporal stability — went 6 → 7, 6 → 7, 6 → 6 on
the walk strip. All 126 cells 6.40 → 6.56; Lions +0.50 and Lion feet +0.50
are the largest moves, and the lion is still the weakest object by two of
three.

### The camera changed, not the world

The consensus ran the blown frame down to its cause and it is the capture
reset. Until `f8c0531`, `tools/shots.mjs` drove the game live for two seconds
before its per-view `setView`, and the pre-roll inherited that drive's steer,
yaw rate and springs: round 5's truck was shot wherever the live drive left
it — mid-corner, rolled and nose-left, plainly visible in `truck_*/forest.png`
where the camera is world-placed and the ruts are the same in both rounds.
Round 6's truck is straight and level in the ruts, and the truck-relative
cameras therefore look at different ground and sky (88–93 % of pixels differ
in the day hero/front/rear/road frames; 28–41 % in the glass set, whose
cameras are fixed in the truck's frame). The `front` camera now looks straight
down the beam, at a pool and a glare sprite that have been in the world since
before round 5 and were scored at 5 in round 4, whose accidental camera also
saw them.

Three facts settle the attribution, all from stamped frames rather than
argument: at `f8c0531` with no round-6 car change the frame is already blown
(0.435 / 31 158 px); hero car r7's spill on the pre-reset camera does not blow
it (0.027 / 349); and hero car r8's ablation puts the plateau in the sprite's
`lens` disc in `sky.js` (`uGlareGain 0`: 801 → 191 px), not the lamp material.
Rolling back every round-6 car change would leave the frame white; rolling
back the reset would restore round 5's frame by restoring a random camera. So
the drop is recorded against the frames, not the world; the four round-5
must-not-regress lines about the beam pool — "no ground blob ≥ 20 px over sRGB
0.5 in `front`", "the soft beam pool", "0 px over 0.7 at dusk", "lower third
median 0.016" — were never true of the world and are rewritten as lighting
r8's acceptance at the deterministic spot. Hero car r7's spill is a fifth of
the pool's brightness and the `road` hot patch (0 → 817 px) is real and new;
that part is the car's.

The process point: round 5 approved a camera. Its consensus recorded a "level"
truck on the pitch number alone (0.2°) and wrote four gate lines on a frame
whose camera had turned the beam off. The assert the tool needs is the pose
itself — spot (−36.6, 2.63, 1.77) ± 0.1 m, heading 11.5° ± 1°, roll ≤ 0.5°,
`autoT` 0.5032 — read from `vehicle.root` before a truck set is written and
put in `stats.json` where a critic can see it.

### Investigated rather than averaged

Fifteen splits (`CONSENSUS.md` §1–15). The ones that changed a brief or
withdrew a finding: the dusk hour did not move — the lamps were on at dusk in
round 5 too, and the dusk pool numbers are the level truck's; the lion's dusk
rim is flat within method noise (three critics, three methods, 72 → 34 /
46 → 33 / 75 → 86 on a lion in a different resting pose since gait r5), so
round 7 gets one method and the studio pose; the walk strip's holds are real
pixel-identity clusters at four places, one of C's five-frame holds is the
body shadow crossing a box, and the contact decal is four rows under each
planted paw (the 2.2 m camera did what it was raised for); the `night_ext`
pane's `see` fell 0.962 → 0.876 on a veil change of 0.006 because the moonlit
background rose, so the tool reports `veil` and `bgLuma` on the row; the mess
floor lifted twice over (`messLamp.day` 13 and the far cascade's newly live
day strength) and gets a per-knob acceptance; the fleet pads' +2–3 st over
their sky cannot be split between the tool's clock and lighting r7's fill
from any current frame, so a same-clock probe comes first; the day `moon`
frame aims at the sun by design; B's Vegetation Animation 4 is set aside
because every set holds the simulation clock, which is right for the gait and
means wind, ripple, flame and idle cannot be scored on any current frame —
round 7 needs a clock-running pair.

### Landed after the frames

Car glass r7 `173c55a` (the mirror live from the seat), lion form r9
`ee3a497` (the mane as clumped locks, and the plank source found under the
old rings: a clamped `uvIn` had the whole ruff sampling one texel row), hero
car r8 `0894c56` (a horizon in the paint), perf census r2 `86a4c74`, and the
rear lamps `6fe9777` — the user's "lights phasing through each other" on the
back of the truck, which was one `amber` material lighting every orange lens
over the bloom threshold all night. All five are unscored; round 7 scores them
on `truck_night/rear.png`, the chase cam and the glass `mirror` frame.

### Measured

| | round 5 (`0dc79bb`) | round 6 (`c2f0b83`) |
|---|---|---|
| all 126 cells, consensus median mean | 6.40 | 6.56 |
| Lions / Lion feet & gait | 5.93 / 5.81 | 6.43 / 6.31 |
| walk strip: planted-paw hold clusters | 0 (camera 9° off the ground) | 4, holds of 2–3 frames at 0 px |
| contact under a planted paw, row under the pad | +0.00 st | −3.2 st, 0.00 the frame after lift |
| `truck_night/front` lower third median / px over 0.5 | 0.016 / 0 (camera off the beam) | 0.493 / 37 535 (looking down it) |
| `truck_night/hero` moonlit body over the upper sky | +0.10 st | +1.33 st |
| light bar, hero box over linear 0.5 | 218 px | 91 px, nine pods, troughs 0.13–0.25 |
| mess awning penumbra | 12–19 px | 25–38 px |
| mess floor under the sunlit pad | −1.50 st | −0.59 st (regression inside the category) |
| hero at fast, calls / tris / programs | 488 / 2.18 M / 175 | 486 / 2.18 M / 175 |

### Next

Lighting r8 is running on hand-off 1 (the sprite's `lens` disc peaked and
1.4 → 0.6, the slice stack gated by the view ray's angle to the lamp axis; the
car's `BEAM.night.spill` 10 → 2; accept at `front` lower third median
0.06–0.10 and p95 ≤ 0.35 with the `mainroad` pool and the nine pods held),
then the fleet pads after the same-clock probe. Then lion gait r7 + form r10
(a spine and head that move over the walk, the eye ×0.75 in a deeper socket,
whisker pads, the thigh), campground r6 (the mess floor back to −1.5 st and
the fire's reach), hero car r9 (the screen at dusk, dust and prints, the rear
lamps scored), terrain r7, vegetation r7, car glass r8, fleet. Tools: the pose
assert, both hashes in `SOURCE`, the clock-running pair, `stats.json` for the
camp, fleet and lion sets. Then `shots/round7/` and three critics against
round 6.
