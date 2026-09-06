# Water physics — defect log

Categories: 11 object-water interaction (hero), 12 water impact / crash response (hero), 13 foam, 14 boat wakes
(hero), water-contact part of 8 aircraft physics. Views: `water-landing`, `water-landing-firm`, `harbor`,
`plane-rear-quarter`, `plane-front-quarter`, `island-pass`, plus `dev` views for the ditching matrix and the boat
wake zones. Frame numbers are 10 fps clip frames (frame n = n/10 s). Grid cells are 8x8 A-H (columns) / 1-8 (rows).

Method per round: observe (stills, clip frames, numeric probes) -> critique -> diagnose -> implement -> stress
(several speeds / distances) -> compare at the same camera / seed -> score -> reject or advance.

## Round 1 — baseline of the previous agent's work (commit 3f4754b0), harness, first captures

Harness: `allPass: true` (bench/reports/waterphys/flight_r1.json) with the rest datum measured above the local
surface (restY 1.963 in [1.91, 2.01]); nothing to fix there.

Captured `water-landing`, `water-landing-firm`, `harbor`, `plane-rear-quarter` (stills + clips, tag
`waterphys-r1`). What was visibly wrong:

1. **Spray was white airflow, not water** (`water-landing-firm` frames 4-8, D4-F6; `water-landing` flight frame
   at 3 s, whole lower half). Every sheet / droplet / mist quad was a soft radial-gradient disc; 20-30 of them
   at alpha 0.3-0.75 stacked into one opaque cotton mass that hid the floats, the hull and the tail. The mist
   quads grew to 5-6 m and drew as round translucent discs with a visible circular outline. Nothing thin, nothing
   lit through, no fine structure, no momentum readable.
2. **The impact splats never drew.** `console.txt` of every capture: `ERROR: 0:83: 'patch' : Illegal use of
   reserved word` — the splat fragment shader named a variable `patch`, reserved in GLSL ES 3.00, so the
   depression / ring wave / whitewater of a touchdown and every ditching contact compiled to nothing, and the
   console carried an [error] plus a `useProgram: program not valid` warning per frame. Budget "console clean"
   failed in every view.
3. **A row of sky-coloured dashes across the water ~30 m ahead of the aircraft** (`water-landing` still, row
   507 of 1080, cells B4-G4; every landing frame). The main plane discards its fragments inside the 64 m near
   region and the displaced patch draws them; a pixel straddling the region's edge has its centre inside (the
   plane discards the whole pixel) while the patch only covers the samples inside, so with MSAA the background
   showed through one sample row, periodically along the edge as the grazing edge line crosses pixel rows. Same
   on the side edges as a faint diagonal.
4. **Ditching matrix (numeric probe, /tmp/waterphys/ditchprobe.mjs driving FlightModel.step):** the wheels-down
   landing flipped nose-over in 0.6 s (real amphibian wheels-down water landings take about a second to dig in
   and go over); a nose-first entry left the wreck perfectly inverted and it never righted (the righting torque's
   cross product degenerates when the up vector is antiparallel); the wreck floated at its normal waterline
   with almost no list (flooded floats kept their static buoyancy); re-placing the aircraft after a crash kept
   `crashed` true for 3 s (crashTimer never cleared).
5. Boat wakes (`harbor` still): no boat in frame at the still, so nothing to judge yet; deferred to a dedicated
   dev view at boat level / 100 m / 1 km (round 3).

Perf r1 (SwiftShader, shared 4-core VM under load 10-12): water-landing 209 calls / 463 k tris, harbor 265 /
1.01 M, plane-rear-quarter 228 / 1.01 M; all within budget.

Self-scores after r1: 11: 6.5, 12: 5.5 (splats not drawing, wreck floating high), 13: 7.0, 14: 7.0 (unjudged).

## Round 2 — physics of the ditching matrix, wreck state, spray rebuilt, splats compiling, patch seam

Changed (commit 85050689 + this round's commit):

- `physics.ts`: wheel plough drag 70 v + 8 v^2 (was 100 v + 12 v^2) -> nose-over in ~1 s; flooded floats lose
  buoyancy in proportion to flood ((1 - flood) on static + deck-awash terms) so the wreck sits deep and lists
  (flood targets raised, more asymmetric for wing / nose strikes); degenerate righting axis when inverted
  replaced by a roll about the forward axis toward the less flooded side; an inverted wreck rolls back onto its
  floats kinematically after 1.5 s on its back (rotateTowards at 3.2 rad/s, y eased to the rest datum) instead
  of teleporting; `clearWreck()` resets crashTimer / wreckedTimer / flags and the plough list; `dbg=geardown`
  forces the wheels down for the wheels-first bench. Harness: allPass (flight_r2.json).
- `wakes.ts`: splat shader variable renamed (`ww`); the splats now compile: depression, ring packet and
  whitewater draw in the near and far maps at every contact. Console clean.
- `effects.ts`: spray atlas rebuilt — sheet tile is 90 fanned filaments from a dense root to a frayed tip;
  droplet tile is 34 hard dots with no soft halo; mist tile is 900 faint dots in 7 clumps, no radial envelope.
  Spray shader (`plane-spray-v4`): per-instance seed (instance index) drives a two-octave noise erosion whose
  threshold rises with age, so a sheet frays into strands and a mist rag dissolves instead of fading as one
  shape; the quad window is itself ragged by the noise; sheets get fine strands along the motion axis. Emission:
  touchdown sheets leave the chines at 35-55 deg from vertical (lateral 2.4-5.6 m/s, up 1.8-6 m/s) as two
  curtains, not one plume up around the fuselage; counts -25 %, sheet alpha 0.24-0.6 (was 0.3-0.75); mist quads
  1-1.9 m (was 1.6-3 m) growing to x1.6 (was x2), alpha 0.07-0.25 (was 0.12-0.4); planing / rooster / plough
  emitters retuned the same way.
- `water.ts` (one hunk, WATER_FRAG_SURFACE, the plane's near-region discard): the plane keeps a 1.5 % (~1 m)
  band inside the region's edge under the patch's undisplaced rim, so no pixel is left to neither mesh.

Why this reduces the defects: the eye keys spray as water from thin lit strands with gaps, from drops that fall
on parabolas and from the fuselage still being visible through it; the erosion gives every quad its own ragged
outline so overlaps no longer sum to a disc. The splats put the surface response (depression -> whitewater ->
rings) under the spray, which is what makes the water look like it has mass. The seam fix removes the only
straight line in the landing views.

Evidence: `water-landing-firm` frames 4 / 6 / 10 / 20 (1280x720, medium) before / after at the same seed:
frame 6 before = one cotton mass over D4-F6 hiding the tail; after = two streaky curtains left and right of the
floats with the fuselage, struts and tail visible between them, dots (droplets) above the sheets, whitewater
lanes under both floats (crops in REPORT.md / artifacts).

Remains after r2: the densest sheet roots still stack to pure white (3-4 quads of alpha 0.5 over each other);
planing spray blister still to be checked at 3 s / 4.5 s (round 3); no ring wave readable from the chase camera
(splat rings are 5-13 cm and the near map's slope only shows in the reflection); boat wake zones unjudged.

Self-scores after r2: 11: 7.0, 12: 6.5, 13: 7.0, 14: 7.0 (unjudged).

## Round 3 — boat wakes at boat level / 100 m / 1 km, and a ship

Views (all `dev`, time 13, aircraft parked at 300 m so only boats mark the water; tags `waterphys-r3-wakes`
before, `waterphys-r3b-wakes` / `r3c` after): `wake-fast-low` (camera 3 m up, 30 m abeam of a 7 m runabout at
14.5 m/s), `wake-fast-100` (60 m up, 100 m behind the same boat), `wake-ship-100` (90 m up, 200 m astern of a 137 m
cargo ship at 5.6 m/s), `wake-1km` (450 m up, the Garza channel with 6 wakes). Boat positions came from a state
probe of the frozen frame (`/tmp/waterphys/boats.mjs`), not from guessing.

Defects seen before:

1. **Runabout at boat level and from 100 m: the lane was a soft, straight, uniform white stripe** (D5-H5 in
   `wake-fast-low`, the whole diagonal in `wake-fast-100`). Cause: the far map has 1.56 m texels and a runabout's
   lane is 2-3 m wide, so from anywhere near the water it is two bilinearly magnified texels: no froth patches,
   no windows, no edges; the near map only exists around the aircraft.
2. **Ship from 100 m: a solid white band a full beam (22 m) wide for 200 m** behind the transom, and the Kelvin
   arms as broad white smears 300 m long. A container ship at 11 kt leaves pale turbulence with the prop wash as
   its only white core, and glassy (unbroken) arms. Causes: the lane density multiplied by the ship's churn (1.4)
   and a linear froth gate (0.6 at 5.6 m/s); "fresh churn" decayed over 1.5 hull lengths (260 m) instead of over
   the ~15 s the froth lasts; the arm break-up threshold admitted ~40 % of the arm length at any speed.
3. No Kelvin V readable near a planing runabout from 100 m; the transverse stern waves not readable anywhere.
4. Hulls looked pasted on the surface at boat level (no bow wave, no spray): the bow zone's curl and sheet exist
   in the ribbon but were two texels wide in the far map.

Changed (`wakes.ts`, `water.ts` one sampling hunk, `game.ts` two lines):

- **A mid wake map**: 400 m at 0.39 m/texel, centred 120 m ahead of the camera along its horizontal view
  direction, rendered by the same batch (one more pass, +2 draw calls) and sampled by the water shader inside its
  region with a 40 m soft edge, between the far and the near maps. The froth patches, dark windows, wandering
  edges, bow curl and arm crests of every boat within ~200 m of the camera now exist at sub-metre scale.
- Lane density: displacement hulls pale (froth gate squared: 0.36 at 5.6 m/s), churn scales persistence
  (remnants) not density, fresh churn limited to `min(1.5 lead + 6 w0, 12 v + 20)` m (ship 87 m, runabout 17 m),
  prop-wash core limited to `min(2.5 lead + 4, 20 v + 10)` m; beam-sized dark windows carved into the coarse
  lane; lane grain streakier along the track.
- Arms: break only when the Froude number `v / sqrt(g L)` exceeds 0.35 (never the ship), within ~2.5 hull
  lengths in the mid/near maps (glassy crest, slope only, beyond) and further out in the far map where the texel
  averages a crest's glitter into a pale line (that pale V near a runabout was the one thing the 1 km view lost
  when the gating first went in — restored this way).
- Thresholded froth noise capped at a 5-texel period with a wider transition (`fl = 0.2 / texel`, +-0.2): at a
  3-texel period the mid map's froth patches magnified into texel-aligned blocks (r3b `wake-fast-100`).

After (r3b/r3c): runabout at boat level = froth patches over dark water with ragged edges, a bow curl at the
stem; from 100 m = a dense rail off the transom breaking into elongated patches with windows; ship = a white
prop-wash core inside pale turbulence, arms glassy; 1 km = continuous pale lanes with the V near the fast boats.
Perf: `wake-fast-100` 112 calls / 241 k tris (was 111 / 234 k), `wake-ship-100` unchanged within noise; console
clean in all four.

Remains: no spray from boats (traffic.ts, not mine); stern-wave undulation still not readable at 100 m (slope
only; the sky is too uniform for a 4 deg tilt to show — a foam-free brightness cue would need the water shader);
boat hulls without a height patch still sit on a flat waterline at boat level.

Self-scores after r3: 11: 7.0, 12: 6.5, 13: 7.5, 14: 7.5.

## Round 4 — ditching matrix: the physics, run numerically

The FlightModel bundled for Node (`esbuild src/plane/physics.ts`, `/tmp/waterphys/ditchnode.mjs`) over deep flat
water at 30 Hz, 20 s per case, the same set-ups as the `dev` views below (heading east, controls held):

| case | set-up | result before this round | after |
|---|---|---|---|
| belly (soft) | 27 m/s, +1 deg, 1.3 m/s sink | touch 0.3 s, no bounce, sink 1.31, planes 5-6 deg nose-up, 27 -> 9.5 m/s in 20 s | same |
| firm | 28 m/s, -3 deg, 2.5 m/s | one skip of 0.6 s (clears the water 1.1-1.6 s), settles on the second touch | same |
| wheels down | 30 m/s, +1 deg, gear forced down | wheels bite 0.67 s, wreck 1.13 s, on its back 1.6 s (0.9 s after the bite), rolled back 2.2 s later, stops 3.5 s; floods 0.80 / 0.80 | floods 0.60 / 0.60: sits 17 cm low, level (a nose-over splits both bows) |
| wing tip | 30 m/s, 32 deg bank | tip in at 0.23 s, slews 110 deg in 1 s (peak 150 deg/s), rolls onto the other wing (-41 deg) at 1.7 s, upright by 5 s, floods 0.80 / 0.80: **level** | floods 0.72 / 0.80: lists 6 deg to the struck side |
| nose first | 38 m/s, -14 deg, 4 m/s sink | floats 0.73 s, nose ploughs 1.0 s, pitches through vertical 1.0-1.4 s (CG vaults 1.4 m), slams on its back 2.0 s, rolled back 2.2 s later, then floods over 10 s to 0.92 / 0.80, lists 20 deg | 0.92 / 0.60, lists 21 deg, sits 70 cm low |
| flat, fast | 48 m/s, level, 60 % power | two skips and it is flying again (94 kt with power) | same |
| slam | 40 m/s, -8 deg from 12 m, 4.5 m/s | wreck at the touch, over on its back 0.6 s later, righted, lists 20 deg | same |
| taxi stop | 12 m/s, idle | 12 -> 8 m/s in 5.5 s (0.85 m/s^2, consistent with the harness's 318 m landing run) | same |

Defects found and fixed (`physics.ts`):

1. **Every wing strike ended level.** The wreck's flood targets are merged with `max`; the other wing dipping in at
   14 m/s as the wreck slewed round flooded the second float as hard as the 30 m/s strike. The flooding of a
   structural strike now scales with the striking part's speed (`smoothstep(10, 26, v)`), so the first blow decides
   the list.
2. **A nose-over left the wreck within a few centimetres of its waterline** once the speed-scaling above took the
   inverted slam's flood away: the kinematic righting (the salvage stand-in) now marks both bows split (flood
   target >= 0.6) so the righted wreck sits deep and nearly level, as a nosed-over floatplane does when pumped
   upright.

Judged sound and left alone: the nose-over time (0.9 s from the wheels' bite), the wing strike's slew (a
cartwheel's first quarter turn at 30 m/s is that violent), the skip of a firm touchdown, the take-off-again of a
flat fast touch, the reversed heading after a nose-over (it ends on its back pointing the other way; the roll
back keeps that), the slow flooding (10 s to the final list).

Harness after: see flight_r4.json (queued behind the Chrome slot gate at the time of writing).

## Round 4b — ditching matrix: the pictures (`/tmp/waterphys/r4`, dev chase view, 1280x720, medium)

Frames at 0.3 s steps through each case (the machine was carrying 14 Chromes on 4 cores at the time: 5-8 s per
simulated frame, so the matrix ran for an hour and a half in one held browser session).

**wheels down** (30 m/s, gear forced down): the wheels bite at 0.7 s, the nose is under by 1.2 s (pitch -38) and the
aircraft goes over its nose (pitch -83 at 1.5 s), lands on its back at 2 s pointing the other way, and is rolled
back upright by 4.5 s among the remnant patches of the touchdown lane. Reads right as a sequence.

1. **Touchdown spray** (f9, f12): two streaky, translucent curtains off the chines and a whitewater lane behind —
   water now, not the r1 white airflow. The spray's dense root still starts white; a fresh sheet is a clear film
   (fixed in r5 below).
2. **Wing shadows read as dark blotches** beside the floats at touchdown (f9): the two curtains hide the inner half
   of each wing's shadow on the water and what is left looks like a dark moustache. Physically right (the spray
   does occlude the shadow), not a water defect; left.
3. **A row of equal white dashes ~30 m ahead of the wreck** (f30, camera looking back over the touchdown point):
   the near region's rim (the patch is 64 m, so the rim is 32 m out) crossing the touchdown splat's whitewater.
   Diagnosis by geometry (camera 24.7 m back, 7.5 m up, look pitch -9.8 deg; the row is 35 px above centre, so
   the ray meets the water 33 m ahead) and by the shader: in the mid map (0.39 m/texel) the splat's noise
   frequency cap `fl = 0.2 / texel = 0.51` clamps both `n1` and `n2`, so the thresholded froth field was one
   octave of value noise on a 2 m lattice: equal blobs in rows, which the plane's 5 m handover band toward that
   map shows along the rim as dashes (the near map's grain is fine, the mid map's is a row of blobs; the
   discontinuity is the seam). Fixed: three lattices turned against each other (0 / 20 / 50 deg) at three
   frequencies, none finer than 5 texels (`wakes.ts`); and the patch's wake-height displacement now fades over the
   outer 8 % of the region like the fragment's near-map slope so a ring or stern wave reaching the rim never
   stands as a step against the flat plane (`water.ts`, 3 lines).
4. **The inverted airframe falling flat raised two starbursts at the wing tips and nothing along the 15 m of wing
   between** (nose f20, wheels f30): the wing stations are the tips, so a level wing slapping down was two point
   splashes. Fixed: the impact record carries a wetted extent (from the tip toward the root, as far as the wing is
   within `max(0.35, 0.3 sink)` m of the surface: the whole half span level, under a metre at 30 deg of bank; the
   inverted cabin 2.5 m either way along the fuselage); the curtain, drops and mist are laid along it and thrown
   out to either side of the line, and the splat is a band stretched along the wing (`physics.ts`, `effects.ts`).
5. **The righted wreck sits near its waterline for the first seconds** (f45): the flooding takes ~10 s to reach its
   target, as intended (a split hull fills over tens of seconds); the frames end at 4.5 s. The 6 s nose frame
   shows it settling deep. Left.

**wing tip** (30 m/s, 32 deg bank): the tip in at 0.6 s throws a swept-back plume with a whitewater lane (f6, good);
the aircraft slews 145 deg in 2.5 s, skidding sideways on its floats (f12), rolls onto the other wing (f20-f30),
stops listing to the left with the left float under (f45).

6. **Skidding floats threw their spray off both chines as if running straight** (f12: the hull is moving at 20 m/s
   nearly beam-on). Fixed: the bow spray follows the slip — past 15-40 deg of slip the emitters slide along the
   upstream side of the hull and the water is thrown along the motion and up (the wall a hull pushes sliding
   sideways), at 2.5 x the rate (`effects.ts`).
7. **The wreck ended nearly level** (flood 0.64 / 0.60 at 4.5 s, targets 0.72 / 0.80): the numeric probe showed
   the second wing entering at 24 m/s of *tip* speed (150 deg/s of yaw x 7.5 m on 17 m/s of airframe speed), so
   the r4 speed scaling still flooded the second float. The flooding now scales with the airframe's CG speed (it
   is the airframe's momentum through the struts that stoves in a hull): the wing-strike wreck ends 0.49 / 0.80,
   listing 12 deg onto the struck side, 33 cm low (`physics.ts`).

**nose first** (38 m/s, -14 deg): floats 0.6 s, nose under, through the vertical at 0.9 s, on its back at 1.2 s,
slams inverted at 2 s (defect 4), rolled back by 4.5 s, settling deep (f60: floats awash, the list building).
**flat, fast** (48 m/s, 60 %): a kiss at 0.6 s with two streaky fans off the steps and it flies on. Fine.

Remaining, for later rounds: a hull sitting deep has no wet line or foam ring where its geometry cuts the
surface (compositing / model hooks: see the report); the wreck at rest lies in glassy water within seconds (the
churn should keep bubbling up around a flooding hull for a while).

## Round 5 — splash vs spray vs mist

1. **Every sheet was born opaque white.** A fresh sheet is a film of clear water: translucent and tinted by the sea
   behind it, glinting, and it only whitens as it breaks into drops. The sheet fragment now mixes toward a
   water tint at 55 % and cuts alpha by 45 % while `ageK < 0.1`, fading that film out by `ageK 0.45` (roughness
   0.3 while it is a film), so a single sheet reads glassy and the stacked roots of many at the chine read white
   (`effects.ts`, SprayCloud shader v5). Verification frames: `/tmp/waterphys/r5/sheets_f00[5-9]` (a dollying
   camera 16 m abeam of the firm touchdown) and `water-landing` f25/30/35.
