# Water physics — report

Subsystem: object–water interaction, water impact / crash response, foam, boat wakes (rubric 11, 12, 13, 14,
and the water-contact part of 8). Owned files: `src/render/wakes.ts`, `src/plane/effects.ts`, `src/world/waves.ts`,
and the water-contact parts of `src/plane/physics.ts` / `src/plane/aircraft.ts`. Shared-file hunks in
`src/world/water.ts` and `src/game.ts` are minimal and listed at the end for the lead. `src/plane/model.ts` was
not touched; the hooks I would want from it are listed at the end.

Full round-by-round observations, diagnoses and the numeric ditching matrix are in `DEFECTS.md` beside this file.
Frame numbers are 10 fps clip frames (frame n = n/10 s). Change size vs the r1 baseline (`3f4754b0`):
`effects.ts` +307/-163, `physics.ts` +140 net, `wakes.ts` +113, `water.ts` +29, `game.ts` +12.

## What was visibly wrong, what changed, why it is more real

### 12 — Water impact and crash response (hero)

- **The impact splats never drew** — the splat fragment shader named a variable `patch`, a GLSL ES 3.00 reserved
  word, so the touchdown depression, ring waves and whitewater of every contact compiled to nothing and the
  console carried the error in every view. Renamed to `ww`; splats draw, console is clean.
- **Spray was opaque white airflow.** Rebuilt the spray as water: a filament sheet tile, hard-dot droplets and a
  clumpy mist tile; per-instance noise erosion that frays a sheet into strands as it ages; the touchdown sheets
  leave the chines at 35–55° as two curtains with the fuselage visible between them. Alphas cut, mist quads
  shrunk (they had grown to 5–6 m soft discs that hid everything).
- **A level wing slapping the water raised two starbursts at the tips and nothing along the 15 m between** (the
  wing station is the tip). The impact record now carries a *wetted extent*: the length of wing within
  `max(0.35, 0.3·sink)` m of the surface (the whole half-span when level, under a metre at 30° of bank; the
  inverted cabin ±2.5 m along the fuselage). The curtain, drops and mist are laid along that line and thrown to
  both sides of it, and the splat is a band stretched along the wing. So a belly-flat or an inverted airframe
  falls as a wall of water the width of the aircraft, not two point splashes.
- **Splats did not scale with the body.** An airframe part (wing tip, nose) now drives a 60 % wider cavity and a
  deeper depression than a float's V-bottom; the splat is stretched along the travel direction by the speed.
- **The ditching physics** (numeric matrix, `/tmp/waterphys/ditchnode.mjs`, and the dev clips): wheels-down goes
  over the nose in ~0.9 s from the bite (not 0.6 s); a nose-first entry pitches through the vertical, lands
  inverted and *rights itself* (the righting-torque degeneracy at the antiparallel up-vector is broken by the
  heavier flooded side); the wreck floods over ~10 s and settles low. **Flooding scales with the airframe's CG
  speed, not the striking tip's**: the second wing of a slewing wreck meets the water at 24 m/s of tip speed on
  150°/s of yaw while the airframe is down to 17 m/s, and it used to flood its float as hard as the first strike
  so every wing-strike wreck ended level. It now lists 12° onto the struck side (flood 0.49 / 0.80). A nose-over
  splits both bows (flood ≥ 0.6) and the roll back onto the floats comes over the lower wing, whose float is
  dragged through the water and its strut wrenched (≥ 0.85): the righted wreck sits 50 cm low with a 17° list
  instead of level and 17 cm low as if merely wetted.
- **A deeply flooded hull met the water cleanly**, as if set down in it. The wake ribbon head now carries each
  float's immersion (from the wreck's flood level): the hull outline widens 35 % to the section that cuts the
  surface and the meniscus becomes a patchy collar of foam and bubbles a few decimetres wide.
- **A flooding hull boils**: the air driven out of a split float breaks the surface in bursts of drops and small
  froth splats while it fills, and the churn keeps bubbling for ~25 s, so the wreck no longer lies in glassy
  water seconds after it stops.

### 13 — Foam quality; 11 — Object–water interaction (hero)

- **A row of sky-coloured dashes ~30 m ahead of the aircraft** at the near-region rim: the main plane discarded
  whole pixels whose centre was inside the region while the displaced patch only covered the samples inside, so
  the background showed through the straddling row. The plane now keeps a ~1 m band under the patch's rim.
- **The near-region rim showed the splat's whitewater as a row of equal dashes** (wheels-down, t = 3 s). In the
  0.4 m mid map the splat's froth-noise frequency cap collapsed both octaves onto one 2 m value-noise lattice,
  so the thresholded froth was equal blobs in rows and the plane's handover band toward that map traced them.
  The splat froth now runs on three lattices turned 0/20/50° against each other, none finer than 5 texels.
- **A ring or stern wave reaching the patch rim stood as a step against the flat plane.** The patch's
  wake-height displacement now fades over the outer 8 % of the region, matching the fragment's near-map slope
  fade, so the displaced water meets the plane level (`water.ts` vertex hunk).

### 14 — Boat wakes (hero)

- **Boat wakes were a solid white stripe a beam wide for 200 m, or a two-texel soft smear from 100 m.** Added a
  **mid wake map** (400 m at 0.4 m/texel) centred ahead of the camera, between the far (1.56 m) and near (6 cm)
  maps, so a runabout's lane at 100 m carries froth patches, dark windows and arm crests. Retuned the lane:
  froth gate squared and churn scaling persistence not density (displacement-hull lanes go pale), fresh churn
  and prop-wash limited to seconds of travel (not hull-lengths, so a ship's dense band is ~120 m not 260 m),
  Kelvin arms broken only within a couple of hull-lengths and only above a Froude threshold (a ship's arms are
  glassy, a runabout's break near the hull), beam-sized dark windows carved into the coarse lane.
- **The taxi wake did not read at all**: behind two floats at 3.8 m/s the water was glass with two soft smudges
  10 m astern, though the 5 cm transverse train and the arm crests were in the height map. Three causes, all
  fixed: the height map was 8-bit (a 5 cm wave over 9 m changed 8 mm between the two texels of the normal's
  difference — two quanta — so its slope decoded to a 0.9° staircase or nothing; now half float); the arm crests
  at displacement speed were 2.7 cm (now 4–5 cm); and the one cue that carries a taxi wake in reality — the
  **slick road** where the hull's turbulence has wiped the short ripples off the surface — was missing: the water
  shader now keeps the short ripple sets apart and adds them after the wake maps are read, scaled down 80 % inside
  the lane's coverage, so the lane lies as a smooth road mirroring the sky in the rippled sea, behind a taxiing
  float and behind every boat. The coverage outlasts the froth (2.2 lane lengths for a float, 4 for a ship, toward
  a kilometre at 11 kt) and float lanes live 30 s (a 16 s ribbon ended in the chase camera's foreground).
- **The lane's froth never died behind a hull that stopped.** Every time-like decay of the foam pass was written
  in ribbon distance, which is speed × time only while the hull keeps going; the points just astern of a stopped
  hull kept `d ≈ 0`, so the churn held its transom density for the ribbon's whole life and the slick never let go.
  The pass now reads its decays at `max(d, speed × age)`, the distance the point would lie behind a hull that had
  kept going: a stopping hull's lane dissolves in place into sparse patches over 10–15 s and its slick lets go
  over ~20 s; a hull under way is unchanged.

### 10 — Water wave physics; float wave-following

- Confirmed numerically (`/tmp/waterphys/swellnode.mjs`, deep open water): a floating aircraft rides the swell
  the CPU field (`waves.ts`) reports with a **follow ratio of 0.97 and a mean lag of 13 mm**, and the field is
  the water shader's mirror by construction (same sets, same phase-warp / group / shelter terms, kept in step by
  hand). No harness tolerance was loosened.

## Stress and regression

- Ditching matrix run as eight numeric cases and as five dev clips (wheels, wing tip, nose, flat-fast, taxi
  stop) at 0.3 s steps; the pictures match the numbers (touchdown → slew/nose-over → inverted → righted → wreck).
- Float displacement and the near/far handover checked in the chase view at 3.5 m/s taxi and on swell: the
  handover is invisible (water tone and ripple continuous; no patch square) and the displacement is correctly
  slight at idle taxi.
- Budgets, every captured view: ≤ 289 draw calls (< 400) and ≤ 0.94 M triangles (< 1.5 M); console clean
  (0 messages) in all of them.
- **Flight harness in Node** (`/tmp/waterphys/flightnode.mjs`: the real map heightfield, the CPU wave field and
  the flight model bundled with esbuild, the page suite line for line minus the chase-camera test): 19 / 19 physics
  checks pass, deterministic, in 2 s of compute, on every physics commit of this branch. It matches the page
  harness to the last digit on every still-air test (roll, elevator, turn, stalls, phugoid) and within a few
  percent on the contact tests (the gust field is noise of the model's own clock, which the page advances before
  the suite). The page harness remains the authority for `allPass`.

## Perf

Draw calls / triangles (SwiftShader, shared 4-core VM under load 5–12): water-landing 219 / 472 k,
plane-front-quarter 289 / 858 k, ditch chase views 203–262 / 0.63–0.93 M, swell chase 276 / 942 k. The mid wake
map adds one 1024² render-target pass of the wake batch per frame and one texture sample in the water fragment;
it stays within budget. A clean interleaved A/B ratio for that pass is the one perf measurement still owed (see
next attack).

## Rubric self-scores (honest; a score rises only where a named defect was reduced)

| cat | | r1 | r2 | r3 | now | why |
|---|---|---|---|---|---|---|
| 11 | object–water interaction | 6.5 | 7.0 | 7.0 | **7.5** | patch-rim step and dashes gone; wing slaps along its span; boil around a flooding hull. Still no wet-line where a deep hull cuts the surface (model hook). |
| 12 | water impact / crash response | 5.5 | 6.5 | 6.5 | **7.5** | splats draw; spray is water; ditching matrix physically right; wreck list decided by the first blow, not averaged. |
| 13 | foam quality | 7.0 | 7.0 | 7.5 | **8.0** | froth decorrelated off its lattice (no dashes/blocks), variable density with dark windows, translucent sheet films. |
| 14 | boat wakes | 7.0 | 7.0 | 7.5 | **8.0** | mid map gives zoned wakes (bow, arms, lane, wash, remnants) at boat level / 100 m; hull-appropriate breaking. |

## Weakest points remaining / highest-value next attack

1. **The wet line on a deeply flooded hull itself**: the water now wears a foam collar around it (r8), but the
   hull's paint shows no waterline stain or sheen where it cuts the surface. This needs a hull-waterline decal
   from `model.ts` (see hooks). Highest value for 11/12.
2. **The interleaved A/B perf ratio for the mid-map pass** is not yet measured; do it on two preview ports.
3. Wake **turning / shore interaction** and **1 km persistence** are only spot-checked (the `turn100` and ship
   views); stopping is handled (r9) but its frames are still to be reviewed.
4. Reflections/glitter over the churned lane (cat 26) are only lightly touched.

## Failed / reverted candidates

- A fully glassy churned lane (slick reflection) mirrored the horizon sky as a bright haze band from a low
  camera and swallowed the foam; kept the slickness moderate.
- Raising the spray line-contact emitter multiplier to `1 + L/3` overflowed the 480-particle cloud and evicted
  the planing spray; settled on `1 + L/5` and raised the capacity to 640.

## Shared-file hunks for the lead

`src/world/water.ts` (all minimal, compositing only):
- vertex: `wakeEdgeF = smoothstep(0.0, 0.08, 0.5 - edgeR)` fades the patch's wake-height displacement to the rim.
- fragment: mid-map uniforms `uWakeMidTex` / `uWakeMidRegion` and a soft-edged blend of the mid map into
  `wakeFar` inside its region; the near-region `discard` keeps a `> 0.015` (≈1 m) band under the patch rim.
- class `Water`: constructor takes `wakeMidTex`; `update()` takes `wakeMidCenter` / `wakeMidSize` and sets
  `uWakeMidRegion`.

`src/game.ts`:
- pass `this.wakes.midTexture` to `new Water(...)`; pass the camera's horizontal forward `(fwdX, fwdZ)` to
  `wakes.render(...)` and `midCenter` / `midSize` to `water.update(...)`; a `?dbg=geardown` flag sets
  `flight.gearOverride` for the wheels-first ditching bench.

## Requested `model.ts` hooks (not edited)

1. A **hull-waterline decal / foam collar** driven by each float's immersion (`FloatState`) so a deeply flooded
   or wrecked hull shows a wet line and a thin foam ring where it cuts the surface. Today the hull just
   intersects the water cleanly.
2. Optionally expose the float hull's **section outline** at the waterline so the splat/boil can be emitted from
   the real chine line rather than the stern/bow station points.
