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
