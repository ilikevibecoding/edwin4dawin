# Changelog

Newest first. Every entry names the build it shipped in, which is also what the
HUD shows in the bottom-right corner of the running game, so a screenshot can be
matched to an entry.

**Live preview:** https://htmlpreview.github.io/?https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/offroad-truck-forza-demo-8461/demo/index.html
— follows the branch tip. Add `?quality=ultra` for a discrete GPU, `?time=dusk|night` for the hour.
**Local fallback:** `npm install && npm run dev`, or `npm run build:single` and open `demo/index.html` over any static server.

Performance numbers in this file are measured with `tools/perfrun.mjs` from the
game's own frame loop. The development box renders in software, so fps and
frame time recorded here describe the rasteriser, not a GPU; draw calls,
triangles, visible objects, textures, heap and boot stages are real everywhere.
Run `node tools/perfrun.mjs --gpu` on a machine with a graphics card for the
numbers the targets are about.

---

## Gauntlet round 6 verdict — pass, on a camera that finally looks down the beam — build `6fe9777` live

Three blind critics on 114 frames of `c2f0b83` against round 5
(`gauntlet/round6/`, 43 evidence frames under `frames/`). A passed the round;
B and C failed it on one picture — the ground ahead of the bumper blown white
in `truck_night/front.png` and `truck_dusk/front.png` (lower third median
0.016 → 0.493, 0 → 37 535 px over linear 0.5). The consensus rules it **a
capture-exposed pre-existing defect and passes all ten families**: the
deterministic pre-roll (`f8c0531`) puts the truck level on the straight where
round 5's live-drive pre-roll had left it mid-corner and rolled, so the
truck-relative cameras look at different ground and sky (88–93 % of pixels
differ in the day hero/front/rear/road frames against 28–41 % in the glass
set, whose cameras are fixed in the truck's frame). The builders' own stamped
sets settle it: the frame is already blown at `f8c0531` before any round-6 car
change (0.435 / 31 158 px), and hero car r7's spill without the reset does not
blow it (0.027 / 349). Rolling back every car change would leave the frame
white; only rolling back the reset would restore round 5's frame, and that
would restore a random camera. The four round-5 must-not-regress lines about
the beam pool rested on that camera and are rewritten as targets for lighting
r8. Hero car r7's spill does add a fifth on top and a hot patch on `road`
(0 → 817 px), which is real and new.

Family means of the consensus medians, R5 → R6: Hero car 6.91 → 6.78 (the two
cells above), Car glass 6.67 → 6.73, Fleet 6.27 → 6.57, Campground 6.64 →
6.64, Road & terrain 6.47 → 6.53, Vegetation 6.19 → 6.35, Lions 5.93 → 6.43,
Lion feet & gait 5.81 → 6.31, Lighting & atmosphere 6.75 → 6.70, Performance
6 → 6; all 126 cells **6.40 → 6.56**. The round's categories: Animation 6 → 7
and Physics / ground contact 6 → 7 on the walk strip, where all three critics
and the consensus's own tracker find planted paws holding their pixel for two
to three frames at four places with a contact darkening under each (−3.2 st
in the row under the paw, 0.00 the frame after lift-off) — round 5 measured
+0.00 st under every stance foot from its 9° camera. Weakest object: the lion
for the fourth round by two of three (a box muzzle with a drawn mouth, eyes a
ball proud of the lid, a rigid spine over a steady walk), and for B the ground
in front of the truck at night; it is also the round's largest gain (+0.50).

Regressions inside categories, none moving a median: the mess floor lifted
−1.50 → −0.59 st and the fast-tier table pockets washed 2.91 → 0.96 st since
the far cascade came alive; the fire lights 6 % of its frame (37 %); fleet
pads +2.0 to +2.9 st over their sky; the windscreen at the sky's luma from
the hero camera at dusk. Withdrawn by measurement: the dusk hour did not move
(the lamps were on at dusk in round 5 too); the lion's dusk rim is flat within
method noise on a lion in a different pose; the `night_ext` pane's `see` fell
because the moonlit background rose; the day `moon` frame aims at the sun by
design. Top hand-offs: lighting r8 (the `lens` disc peaked and 1.4 → 0.6, the
slice stack gated by the view ray's angle to the lamp axis; car `BEAM.night.
spill 10 → 2`; accept at `front` lower third median 0.06–0.10, p95 ≤ 0.35,
`road` 0 px over 0.5, `mainroad` pool 0.18 ± 0.03 held), lion gait r7 + form
r10, campground r6, the fleet pads with a same-clock tool probe, hero car r9.

### Landed after the frames, unscored until round 7

- **Car glass r7 (`173c55a`).** The door mirror is live from the seat at every
  tier (120×160 target through the convex cap, the two panes on alternating
  frames, only for a camera inside the cab within 1.5 m; the painted plate
  stays for exterior cameras with a (−0.3, −0.9) horizon ramp): treeline, road
  and flank behind the truck in the pane, straw 0 → 16 % below its skyline;
  +90 calls from in-cab cameras only, +1 program. The ultra door-glass stipple
  was the pane SSR march (SSR off: 3.61 → 0.15 %) — side and cabin panes off
  the reflector path, door pane checkerboard 4.24 → 0.43 %. Tool: `flick /
  flickBg` on every row (`moving` 0.87), `mirror` eye 140 mm lower and forward
  with a cabin-trim-in-pane assert.
- **Lion form r9 (`ee3a497`).** The mane as clumped locks — lock cards
  scattered on the ruff shell hanging with gravity (radial edges off the throat
  23 → 4 %, chest band −1.7 st under the cheek locks, saddle strands 27 → 62 %
  along the hang) — and the plank source found under the old rings too: `uvIn`
  clamped v, so the whole ruff behind the head sampled one texel row. Temporal
  fossa 3.9 → 6.8 mm a side, a lateral canthus cap (temporal lid coverage 62 →
  87 %), chin darkened to the jowl, hair strokes on the flow field. Head ratios
  held; head +168 tris, mane cards +30 %.
- **Hero car r8 (`0894c56`).** A horizon in the paint: the brightwork's sky
  ramp and blur become uniforms (`skyRamp 0.04`, `blurFloor 0.02`, `blurSlope
  0.5`), so a door panel mirrors sky above the skyline and ground below it —
  door band over base 0.59 → 1.37 st, `ws_mid` bonnet skyline +1.29 st, dusk
  grille over the sky held. Light-bar LED radius 0.024 → 0.022 (nine pods
  331 → 293 px over 0.5 at 1280). Two ablations: `clearcoatRoughness` never
  blurred the horizon (0.000 at 0.01 — the GLSL constants did), and the
  headlamp glare plateau is the beam sprite's flat-topped lens disc in
  `sky.js` (`uGlareGain 0` takes the front blob 801 → 191 px), not the lamp
  material — handed to lighting.
- **Perf census r2 (`86a4c74`).** Hero 492 calls / 2.18 M tris at fast,
  programs 175 at boot / 178 after a full drive, textures 292–313, heap flat
  over three load loops at fast and +1.7 MB at ultra, first frame 45.0 s in
  software against 43.0 in r1 (finding the pride 3.1 → 5.5 s). `rear`'s +172
  calls over the hero are the forest, fleet and camp behind the truck, not the
  roadside (8). `perfrun` prints the collision world's boot cost (506
  colliders, 5 ms).
- **Rear lamps (`6fe9777`).** The user's "lights phasing through each other"
  on the back of the truck: one `amber` material lit every orange lens (fender
  and side markers, mirror repeaters, front and rear indicators) at 3.2 all
  night beside tail cells at 4.0, both over the night bloom threshold of 2.0,
  so the chase cam saw a row of orange lamps with merging halos that never
  changed. Indicators are their own material (same program), lit 6.0 only while
  the relay ticks; marker and tail running levels 1.5 / 1.8 under the
  threshold; brake 11 and reverse 7 still bloom.

## Round 6, second half — the skirt was a material, the far shadows were never on, the stars were dashes — build `c2f0b83` live

Six more gated landings on top of `e244efd`. Three of them fixed things no
critic had named, found by ablation on the way to the thing they were sent for.

- **Terrain r6 (`ab2aaac`).** The hill floor and ceiling had never engaged on
  the ranges the critics box: both guards were weighted by a height key that
  read 0.57–0.75 on low far crests, so the 0.76 floor lifted an into-sun
  crest six tenths of the way and the over-ridge sky sample under-read a lit
  cirrus sheet by a fifth — 0.76 × 0.6 × 0.8 is the critics' 0.58. Guards keyed
  on height *or* distance, floor 0.84 / ceiling 0.87, the dome's cirrus and
  sun glow evaluated in the sample: `lion_far` ridge rows 51 → 92 % in band,
  its cols 0–80 0.61 → 0.79; `camp_beyond` 55 → 88 %; `lion_pride` 74 → 89 %.
  The kopje reflection samples the rock tile on each ellipsoid with the rims
  broken by the ripple; the pride ring is trodden earth inside 6 m (inner/plain
  1.03 → 0.86, pale stems 20.8 → 1.8 %). And the skirt band, ablated: with
  all vegetation hidden the terrain's far flat and near plain meet at −0.01 st.
- **Vegetation r6 (`0293443`).** The pale mid-ground band chased since round 4
  as terrain, grass density and tint was a material class: the far skirt was a
  `MeshStandardMaterial`, and at roughness 1 that still puts a ~4 % dielectric
  specular on the key which the Lambert terrain never had — +0.23 st over bare
  ground, +0.45 in the critics' box. `MeshLambertMaterial`: 0.343 → 0.251,
  which is the bare ground. The pride lawn is straw on the plain's own tile
  (lawn Y 0.09 → 0.27, straw mask 20 → 42 % of the lower third, saturation
  0.54 → 0.45 with a dust term); dusk crowns pass transmission broadside
  (−3.35 → −2.14 st under the sky, black 24 → 11 %); sun split on the crown
  +0.06 → +1.23 st. The first pass broke the near acacia into loose clumps
  (silhouette 46 → 36 %) and was sent back before landing; golden-angle card
  fill with ring tiers holds 45.5 % with no detached fragments.
- **Lighting r7 (`e298790`).** Every star was a vertical dash: the field is a
  Gaussian in octahedral map space, whose scale differs along azimuth and
  elevation. Evaluated in screen space through the map's Jacobian: aspect
  1.54 → 1.20, count held, a count-law magnitude curve (p90/p50 2.0 → 3.1) so
  the field has bright stars and faint ones instead of one brightness. The
  moonlit ground follows a luma-normalised night bounce tint with the warm
  day bias gated (hero ground hue 5° → 256°, sat 0.36 → 0.17). And the far
  shadow cascade's `uCascade` uniform had never reached a single program — its
  install guard keyed on a uniform three r185 no longer lists — so every far
  shadow since round 3 ran on the fallback constants; fixed, 9 taps, day
  `farRadius` 4.5: the mess awning's penumbra 12–19 → 25–38 px. Night fill
  34 → 56, `groundIndirect` 1.2, palette a quarter less saturated: pad/band
  0.88 → 0.67, paint over the upper sky +0.15 → +0.99 st, sky sat 0.68 →
  0.55. The dusk and night cascade values now apply for the first time and
  were written blind.
- **Capture (`f8c0531`).** `setView` resets the driver's dynamics, the truck
  (wheel angle, steer, suspension, tyre tracks) and the wheel dust's seeded
  stream before the pre-roll: two shots of one view in one page were 7.7 % of
  pixels apart (wheel spin phase, tracks) and are pose-identical now, with a
  residual 0.9 % over 8/255 in the dust sheet still unexplained.
- **Lion form r8 (`d75c60e`).** Skull rows a trapezoid widest 3 cm under the
  eye line with a flat crown (brow/zygomatic 0.773 → 0.742; the forehead 17 %
  narrower than the cheeks in frame); muzzle rows carry the upper lip with the
  sides drawn in under the whisker pads (lip/zygomatic 0.444 → 0.406; the lip
  hangs 8.5 mm over a narrower chin); the r7 under-eye black margin — the
  raccoon mask — replaced by a 4.5 mm tear line and a buff patch (dark pixels
  in the eye box 28 → 1.5 %); ball −5 %; coat streaks in an 8:1 flow field
  along the body; rim shadow gate floored (rim columns 82 → 86 %). Head
  ratios and tris held. Still: the eyeball laterally proud, the temporal
  hollow 3.4 of 6 mm, and the male's mane still radial ribbons.
- **Hero car r7 (`2250d88`).** The windscreen returns the sky from outside
  the cab (graze gated to exterior cameras: front-quarter screen hue 54° →
  216°, blue-leaning pixels 18 → 48 %, the seat veil held at 0.059); the
  `BEAM.dusk` cut that r6 made against the pitched truck had removed the dusk
  pool on the level one — the consensus's caution was right — and it is
  restored toward the band (mainroad pool 0.036 → 0.13, ground over the dusk
  sky 0 %); a near-field spill per side (dirt ahead of the bumper p95 0.036 →
  0.123); nine pods verified at 1280 (9 blobs over 0.5, 332 px in the critics'
  box). The builder stopped on a usage block before its report; the numbers
  are measured from its before/after sets. The glare profile and the paint
  horizon did not move and are carried.
- **Lion gait r6 (`c2f0b83`).** The swinging leg folds: hind hock at
  mid-swing 33° → 80°, stifle lift-to-mid change 21–50° on every leg, paw
  clearance 6–7 cm. The pad rides 6 mm over the contact with the decal
  carrying it, which ends the toe re-plant flicker (the probe reads the lift:
  float 3.8e-5 m, reach 7.2 mm, penetration 0, slide 1e-13). On the 2.2 m
  strip every planted paw holds its pixel to 0 px across every hold, before
  and after — the round-5 "sliding paw" is in no render. Head level on a
  12.5° slope (roll 1.42° → 0). The approach: a lion rises when the truck's
  nearest collision circle closes inside 6 m on a course past it, trots inside
  4 m (1.8–2.2 m/s by scale), walks beyond 5.5 m, lashes its tail once, and
  lies again once the truck is 12 m off. The builder stopped on the same usage
  block before its report; the numbers are from its before/after probes.
- **Capture (`2032e81`).** The beam dust flicker and the water hole's ripple
  read a simulation clock instead of `performance.now()`, so two frozen frames
  of one view agree on the water and the cones.

## Round 6 landed — the car's lamps, the lion's walk and face, the night, the fire — build `e244efd` live

Nine builds since fleet r4, each gated at fast, high and ultra with the
interaction suite before it went live. The round-5 verdict (three critics, all
pass, hero car and glass re-judged on corrected frames) is in
`gauntlet/round5/`; these landings are the round-6 fixes for what it found.

- **Hero car r6 (`5dc56cd`).** The dusk lamp pool is under the sky at last
  (`BEAM.dusk` beam 22 → 3.5, bar 26 → 4; ground over the sky's p95 12.8 % →
  0 %). The light bar reads as nine pods, and the round-5 diagnosis of *why*
  it did not was wrong: the cover was innocent, the pod cores themselves sat
  at 2.3 against a bloom threshold of 2.0. Cores 0.12 under the threshold, a
  radial lobe mask, a `barReflector` key: hero box over 0.5 681 → 118 px, all
  eight gaps under 0.6. Dusk reflector bowl halved (grille +0.100 → +0.091
  st over the band), legible sidewall lettering, one wiper sweep shared by the
  film and roughness maps with a park smear, headlamp cone 26.4 → 22°.
- **Lion gait r5 (`b8f1636`).** The tail is carried per state (walk root
  −14°, standing J, sway on the last third in step with the hind feet); the
  trunk rolls and lifts onto the plane of the planted feet on a side slope
  (hip roll 0 → 12.6° on a 12.5° flank, leg-extension asymmetry 0.07 →
  0.005); set-off from a lie without the 24 cm dip; a lion the truck pushes
  gets up, turns away and retreats 6–8 m across its line — the truck's heading
  and collision circles are passed to the pride. Feet probe unchanged at
  machine precision.
- **Lighting r6 (`cd33826`).** Night rebalanced (horizon band 2.4 → 2.0,
  `groundIndirect` 1.7, fill 34, an environment ground term for the boot hour:
  mainroad sky 0.024 → 0.019, ground 0.022 → 0.028, hero paint over the sky
  −0.37 → +0.10 st). Day hemisphere 2.5 → 3.25 with shadow 0.92 (mess shade
  median 2.07 → 1.49 st under the sunlit pad, pockets 3.6 → 2.9). Moon disc
  drawn after bloom (halo at r = 10 px 0.50 → 0.27, disc 0.81). The environment
  probe gets a plain with occlusion to the nadir (nadir/horizon step 0.46 →
  0.23, continuous), so chrome undersides no longer mirror a sunlit ground.
  Rear beam slice cores fade with distance (peak/trough 3.36 → flat). Sun
  azimuth verified identical across every consumer — the r5 vegetation
  hand-off that had them 20° apart was wrong.
- **Campground r5 (`0a52cc9`).** The campfire pool round 5 flagged as a tan
  slab: point light peak 5 + 16 n, hue 24° — pool median Y 0.36 → 0.17,
  saturation 0.33 → 0.51, flame box 536 → 100 px over 0.5. Mess day lamp reach
  for the eave pockets (darkest flat pocket −2.75 → −2.49 st, sunlit pad
  +0.2 %). Row lanterns re-aimed with 2.4× lamp glass and a third pole between
  the expedition and supply trucks (supply body 0.48 → 0.75 of the sky; the
  ranger's shadow-side door was the fleet r4 hand-off). Light cap 7 at fast,
  9 at high and ultra.
- **Lion form r7 (`522cbdc`).** Muzzle lofted on a superellipse with a nasal
  crest, a cheek-arch row, nose leather and a lip plane with a philtrum;
  cupped ears with a dark inner face; lids 0.55/0.68 over an eye 4 mm deeper
  with a black upper cap and no sheen — the pale hood over the iris and the
  crescent under it are gone (five colour-coded ablation builds showed the
  pale pixels a classifier still counts are lit cheek skin, not sclera); a 56°
  cornea cap; coat anisotropy 0.6 with 30:6 strands and dashed ticking; dusk
  rim power 4 with a front-light floor (rim median +0.55 → +0.86 st, columns
  carrying a rim 62 → 77 %); toe lobes with the pad under each tip. Head
  ratios held (muzzle/L 0.348, zygomatic/L 0.633); +1.2 k tris per lion at
  tier 0. Head-on at 1280 the head is still bear-like — flat brow, boxy muzzle
  — and the flank's coat grain did not reach the 512 frame (0.82 → 0.89
  against 1.3): both go to r8.
- **Capture (`84c1e5e`, `45bc696`, `e244efd`).** The pinned pre-roll cruises
  (throttle balancing drag) instead of reading its pin as a brake: body pitch
  at the shot 5.7 → 0.2°, the glass cameras back on the cab. A `moon` view
  from the hero position (64° lens along the hour's key light, turned so the
  disc sits at 0.7 W / 0.19 H with the horizon in frame) — round 5's critics
  found the moon in none of 29 night frames. The glass `mirror` shot measures
  the mirror glass alone and fails under 3 % frame cover; the lion walk-strip
  camera stands at 2.2 m so the paw decal shows under a planted foot.
- **Cleanup (`024daec`).** Two dead per-frame writes in the lion driver.

### Found by the moon view, not yet fixed

Every star is a vertical dash. The star field is drawn in octahedral map
space, whose scale differs along azimuth and elevation, so an isotropic blob
there is stretched on screen; in a sky-dominated frame the field reads as
falling snow. Lighting r7 (screen-space footprint via the map's Jacobian).

## Fleet round 4, and a capture spot that had moved — build `8611235` live

- **Fleet r4 (`8611235`).** Chrome and alloy had the environment all along and
  wasted it (`alu` metalness 0.86 under a satin map at env 0.3; `chrome` env
  0.45 under a tint a fifth of the sky). Alloy metalness 1, env 1.4; chrome
  F0 ≈ 0.6, env 1.5; the SUV's powder-coated bar is a rolled chrome bumper:
  top-of-curve to underside 1.9 st, sky-hued pixels 0 → 26 % of the bar
  (`shots/r4_fleet/after/suv_0_day.png`); camper wheel face +2.3 st. Paint on
  the hero's clearcoat model, aged per vertex from the kit (`aAge`: rougher,
  duller coat and greyer pigment on the old vehicles), one program for old and
  new paint (−1); frame hue held within 2°. Motorcycle: staggered lug rows,
  channel rim, 32 spokes, brake disc, calipers (+850 tris). One shared 256²
  sidewall map (bead, rim protector, mould rings, lettering band; dust settles
  in its grooves): 2.2 st of relief across the band. Night paint gain 1.35 for
  the row (bodies +0.3–0.7 st on the pale vehicles; the ranger's shadow-side
  door stays at 0.22× the sky — a lantern's job). Jeep canvas bleached at the
  ridge, dusted at the hem. Programs 176 → 175 at fast, calls unchanged.
- **Capture spot (`16028cf`).** Every round-5 truck view had verge grass
  across the truck, and no builder had touched anything visible there. The
  beauty views pre-roll 170 steps of auto-drive from a fixed start, and the
  curvature speed cap that landed with collision made the truck cover 6 m
  less in those steps — so the whole truck family was shot from a spot 6 m
  back along the spur (truck at (−36.5, −4.2) against (−36.5, 1.4) in round
  4). The pre-roll speed is pinned at 12 m/s now: the end of it is a fixed
  place on the road whatever the driver does, within half a metre of where
  rounds 1–4 shot it. The truck, glass and native-resolution sets of
  `shots/round5/` are re-shot from it.

## Round 5 landed — the road was a hole on real GPUs, collision, lighting, car, plain, hills, water

**Build `0dc79bb` live** (bundle `d8a9ed9`), then `6ca9b3e`, `3428229`, `f93a567`
on top; gate `CLEAR` at fast, high and ultra with all 57 interaction checks.

- **The dark road in the user's screenshot was the terrain mesh missing.** The
  terrain program bound 21 samplers. The software rasteriser every frame here
  is shot on offers 32 fragment texture units; ANGLE over D3D11 and the Mac and
  Windows Chromes people run offer 16. The program failed to link on the user's
  GPU, three dropped the mesh without a page error, and what showed was the
  far-plain mesh underneath — hiding the terrain here reproduces the screenshot
  pixel for pixel (`shots/r5_terrain/before/culvert_fast/culvert_hide_terrain.png`).
  That has been the state of the road on real hardware for four rounds while
  103 frames a round passed three critics. Terrain r5 (`0dc79bb`) packs ten
  tile maps into two `DataArrayTexture`s: 21 → 13 samplers, same bytes, no
  new textures. The gate now counts every program's sampler uniforms and
  fails past 16 (`3428229`; it fires on the pre-fix terrain, two programs at
  21). Not yet confirmed on the user's machine.
- **Collision (`f6b370b`).** ≈500 2-D colliders (circles and oriented boxes on
  an 8 m grid hash) from the forest instances, the roadside kit, the camp
  plan, the fleet and the lions; three circles for the truck. Head-on into a
  headwall from 6 m: contact, under 1 m/s in 0.28 s, penetration 0.0000 m,
  one impact event; a 15° glance off the boma slides at 97 %. Impact thud
  and a jolt into the heave/pitch springs and camera. Auto-drive had been
  cutting the spur into the kopje and guest tent 0 (pure-pursuit odometer
  falling behind on corner cuts); it re-projects and slows for curvature now,
  0 contacts over the whole route at fast and high. Resolve 0.001–0.005 ms a
  frame; static build 8 ms at boot. Roadside exports its kit (`6ca9b3e`) so
  every part gets one exact collider (6.2 → 2.6 ms).
- **Lighting r5 (`cef8466`).** The beam-slice discs are gone: a second
  representation of each cone, twelve axial sheet quads turned to the camera,
  cross-faded with the slice stack by view angle (broadside peak/trough 4.05 →
  1.26, bar 55.9 → 1.30). Night ground: `groundIndirect` had never been in
  effect — inserted after `outgoingLight` was summed — so the night dial of
  0.1 was a no-op; wired before `totalDiffuse`, night 1.4, mainroad ground
  median 0.011 → 0.023 with the pad still 0.58 of the horizon band. Moon:
  glow 2.0 → 0.035, `sunDisc` 26 → 4.5, a 0.5° disc with a tight corona
  (30 486 → 1 738 px over 0.35 within 60 px). Dusk sand brighter than the sky
  is the headlamp pool, not SSR (pass off: no pixel changed; lamps off: 30 %
  → 0 % over the sky) — `BEAM.dusk` is the car's knob.
- **Hero car r5 (`c8ccad2`).** The bar slab was the nine pod cores at 2.5× the
  bloom threshold; cover on its own key with a nine-lobe mask, pods at 0.25:
  hero box over 0.5 1449 → 417 px (target 300), front view shows nine peaks.
  Door mirror glass turned 22° inboard and 1.5° down — the seat sees horizon
  and flank instead of a culled back face. Day panes: side_shade see 0.68 →
  0.93, ws_mid 0.79 → 0.89, dust settled to the sills, wiper arcs. Clearcoat
  1.0 / 0.15 over a satin base with flake normals (grille bloom regression
  found and fixed at basecoat `specularIntensity` 0.2). Chamfered, siped
  lugs; woven door cards; black ABS console. +2 programs at fast (176).
- **Vegetation r5 (`f1689c7`).** The bald pride plain was 96 % soil fleck
  under a straw colour mask: lion × lawn × graze size factors stacked to 0.42
  and the lawn species were the two flat forms. Short upright turf at full
  count via an `extra` scatter pass (tuft cover 3.3 → 39.9 % of the lower
  third; the mask barely moves because the turf is khaki). Dusk crowns: one
  cap for shell and interior flattened them; the cap scales with `transLow`
  at low sun and the outer shell may pass over it (−3.33 → −2.13 st vs sky).
  Crown indirect scaled by sun side (+0.58 st sun half). Tuft self-shadow
  root → tip (+1.2 st per tuft; plain median −0.5 st).
- **Terrain r5 (`0dc79bb`).** Hills fog to the sky over their own ridge
  (dome uniforms), ramp 60–380 m to 0.90–0.94, a luminance ceiling 0.80 and a
  floor 0.76 pre-ACES: ridge rows vs the sky above, mainroad 0.67 → 0.80,
  lion_far 0.55 → 0.71, pickup 0.63 → 0.75; camp_beyond slipped 0.80 → 0.72.
  Water hole: Fresnel 0.25 + 0.75(1−f)³, reflection is the dome sample for
  the reflected ray, kopje boulders as analytic ellipsoids in the reflection,
  0.6 m wet annulus; pool −0.44 → −0.26 st under the sky, +0.97 st over the
  mud ring, grey → blue-grey. Two of the five round-4 hill boxes measure sky
  against sky in the frames as shot (`pickup_0_day`, `lion_far` far R).
- **Also.** Lions r6 (`358f2be`) and campground r4 (`fd28044`) as in the
  previous entry; `fleetshots` steps the camp 90 frames before a night frame
  (`b1c09e1`); native-resolution ultra frames in the baseline (`fb8239a`).
- **Not met / carried:** bar box 417 vs 300 (cover specular over the reflector
  bowls), dusk grille +0.121 vs +0.1, mess shade pockets 3.2 st (the
  hemisphere's, not the far cascade's — 3.6/0.92 moved nothing there),
  `lion_far` into-sun crest rows 0.55–0.65 under a floor that should hold
  0.76, moon bloom halo, rear-view residual slice cores at 32°.

## Gauntlet round 4 verdict — pass, first time

**Build `80cb5e6` stays live.** Three blind critics scored it against round 2
(`gauntlet/round4/critic_{A,B,C}.md`, consensus in `CONSENSUS.md`, 36 frames in
`frames/`) and all three pass it: Materials up in every family that can show
them, no category down more than one point, means 5.67 → 6.19 / 5.70 → 6.30 /
5.44 → 5.83. The three round-2 blockers: stars **closed** (0.13–0.15 % of sky
over Y 0.35 for the star field); hills **half** (saturation 0.42 → ≤ 0.24 and the
cream band gone, but sun-facing crests at 1.01–1.24 of the sky and `lion_far`'s
near ridge at 0.54–0.61 against a 0.72 floor); camp shade **half** (open floor
1.5 st, on target; pockets under the tables 2.7–3.7).

- **Investigated, not averaged.** The "two moons" in the night hero — A: a
  moon with no disc, B: moon plus a bloomed star, C: beam slices — were probed
  on a served build: they survive hiding the sky, the dust, every scene root
  and every post pass; the moon is at 51° elevation, out of frame; with only
  the lights left, a row of discs steps away from each lamp. They are the
  headlamp beams' cross-section slices (12 at `fast`, 1.35-power spacing) seen
  55–65° off-axis. The crown "defaults" one critic saw are on in the build
  (`crownGrad 1.0, transPeak 2.5`) — the dusk crown is 3.2 st under the sky
  with them on, which is a shader-cap problem. The pride plain is bald because
  the graze ring thins as well as shortens. The lion head in the frames is the
  round-5 head; from the side it still reads bear-like.
- **Two tool defects, three rounds old, fixed.** The trailer was framed through
  a tent roof because `fleetshots.mjs` built its occluder `Raycaster` from a
  second three imported at `/node_modules`, which a preview server never
  serves; `debugAPI.THREE` now carries the bundle's own (`7b83ecf`). The walk
  strip stepped 0.12 s from 6 m — 0.84 m of travel, a quarter of the frame —
  so no critic could judge planting or flexion; it steps 0.3 s from 8 m now
  (`0fa387c`), two stride cycles across the frame, and the round-4 incumbent
  is re-shot as `shots/round4/lions_walk_fixed/`.
- **Carried into round 5 as blocking:** the night hero's hot spots (light bar
  slab 1.4–6.9 k px of bloom, beam-slice discs); hills against the sky on all
  four frames; shade pockets. **Weakest object in the game:** the lion
  (Silhouette 5, Geometry 5, Materials 5 — "a large plush dog with lion eyes").
- Process: the gate now kills its preview's whole process group (fourteen
  orphaned servers were found alive, `d845bc3`); the rubric states the
  deploy/accept order and the rollback rule.
- Round 5 (lighting, shadows, reflections) is running on the consensus briefs:
  lighting, hero car, lions, campground, vegetation, with terrain still out on
  its round 4.

## Round 4, wave B — the plain, the camp, the lions' head and walk, the car's materials

**Build `80cb5e6`** — live, smoke-tested (HUD reads `build 80cb5e6 · 2026-09-05 02:52Z`, zero page errors). Five landings on top of `4bdaba9`, each gated alone against HEAD, then the combined tree gated at fast/high/ultra with the interaction checks before the deploy.

- **Lion head, round 5** (`4de6628`): rebuilt to measured skull ratios instead of
  adjectives — zygomatic width 0.59 → 0.63 of head length, muzzle depth 0.28 →
  0.34 L, interpupillary 0.39 → 0.46 of cheek width, ears 0.41 → 0.25 L as
  rounded triangles on the skull corners, nose leather 0.37 → 0.15 L. The
  bear/hippo read was two structural faults rather than proportions: the nose
  sat level with the eyes' lower rims (now 6 cm under the eye centre with a
  real stop) and crown–brow–bridge was one ramp (now flat crown, brow ledge,
  straight bridge). `tools/lionhead_measure.mjs` prints the ratio table from the
  built mesh. Head triangles unchanged.
- **Lion gait, round 4** (`b71aa5f`): stride scales with √speed and the cadence
  is derived from it every frame (walk 1.0 m/s: 1.20 m cycle, per-foot
  excursion 1.05 shoulder heights; a half-speed amble state); elbow and stifle
  fold ~30° extra in swing with a 7.5 cm arc and the paw peeling from the heel;
  counter-phase shoulder and pelvis roll, head bob 3.6 cm with pitch and yaw,
  tail sway lagging bone by bone to ±33° at the tuft. The 20 cm chest drop at
  the start of every walk was time-based swings overlapping as the cadence
  tightened — three feet airborne; the phase now resets at set-off. Feet at
  machine precision through 20 s of walk, lie and sit.
- **Campground, round 3** (`52355df`): the black slab under the mess awning was
  a literal 8 × 5 m dark ground sheet — removed, matt `envMapIntensity` 0.3 →
  0.8, wear overlay 0.25 → 0.6: shade 2.7 → 1.5 stops under sunlit dirt, the
  round-2 blocker closed. Fire: six standing core tongues at every tier, the
  hottest colour pulled off white (17 clipped pixels → 0), glow disc 3.5 → 5 m,
  light decay 1.5 → 1.0; far chairs 0.13 → 0.24. Two pole lanterns over the
  parking row (the fleet hand-off; row mean 0.084 → 0.131). Five trunk paths
  and three footpaths with scuffed margins, slot ruts that run past the
  vehicles, packed patches under every seat, litter. Log gate posts with a
  whole-log texture, rolled hems and ridge rolls on every canvas, a 9 m stain
  map over the weave. 49 → 51 calls, +8.7 k tris, 5 → 7 point lights.
- **Vegetation, round 4** (`135d432`): the plain had gone bald partly through a
  tier bug — the grass count rode on `treeCount`, so `fast` shipped 70 % of the
  grass; decoupled, density window widened, far falloff ×0.33 → ×0.6. Straw
  tufts in the lower third of `lion_far` 5 → 149. Two card heights, root
  darkening into soil hue, a soil collar under every clump. Crowns carry a
  baked top/underside gradient (0.42 → 0.87 stops) with a lighter atlas and no
  dark cluster rims; transmission is Lambertian and gated by sun elevation, so
  dusk crowns read olive with lit sprays instead of brown-black while dusk
  grass stays at 0.052 (round 2's bleach was 0.078). The "dead" night canopy
  was the self-measured fill collapsing under a night hemisphere at 9 % of
  day, not alpha — a per-material night floor holds crowns at 0.48× the sky.
  The brown treeline wall in the pride views was the strip's scrub foot running
  full width; gated, thinned to seven trees per strip, hazed. Scrub, forb and
  swath on 2×2 buckets: draw calls −27 to −97 on every view but `mainroad`
  (+14); triangles +10–16 % from the restored grass.
- **Hero car, round 4** (`80cb5e6`): the dusk grille was A/B'd term by term
  (lamps, bloom, glow, brightwork env, clearcoat each under 0.05; the key alone
  −0.27) — lighting's key 4.0 takes it to clip 0 %, and lamp emissive and spot
  levels are now hour-keyed. Side glass gets its own wind-streaked roughness and
  a grazing term (door glass see-through held at 0.91). Screen dust reshaped to
  a cowl with a wiper ridge; the laterite film stops at the cabin box. Cabin
  soil per key with curvature-gated grime — the crackle net on column and dash
  is gone, night dash glow intact. The live mirror pass measured 98 calls /
  1.03 M tris per pane at high and zero passes from the seat (outboard face
  culled), so `fast` keeps a painted mirror, now sky / horizon / plain with the
  truck's own flank ray-tested in. Headlamp spot 13 → 40 at night aimed 6°
  down: pool +2.1 → +3.8 stops over the ground beside it. Paint
  `envMapIntensity` 0.3 → 0.75: the horizon band reads across door and wing.
  540 calls / 1.93 M tris before and after.
- Round-4 frame set shooting into `shots/round4/`; three blind critics score it
  against round 2 next.

## Gauntlet round 2 verdict, and the round-4 fixes for what it found

**Build `4bdaba9`** — live, smoke-tested (HUD reads `build 4bdaba9 · 2026-09-05 01:11Z`, zero page errors).

- **Verdict.** Three blind critics on 103 frames of `a8ca6eb` against round 1
  (`gauntlet/round2/critic_{A,B,C}.md`, consensus in `CONSENSUS.md`, 35 key
  frames in `frames/`): "round 2 fixed the car and broke the world." Hero car,
  glass, tyre contact, day shadows and gait scored up; the night sky (20 % of
  sky pixels lit — snow), the far hills (saturated cobalt, darker than the sky),
  the black shade under the mess canopy and the lions' eyes scored down two to
  three points. Round 2 therefore **did not pass** the non-regression gate, and
  had been deployed before the critics scored it; those three regressions were
  treated as blocking for this deploy. Four findings were the tools, not the
  game, and are fixed: the chase camera "inside the flank" was the HUD
  screenshot catching the camera mid-transition (`rig.snap()`), glass frames at
  half resolution, the HUD stamp naming the bundle commit, and a soil hue that
  measured unchanged.
- **Stars** (`4bdaba9`): points instead of pixel-floored discs, the dusting grid
  removed, the Milky Way a smooth band; the night palette had been converted to
  linear twice so the dome rendered black under the grade's grey lift. Sky pixels
  over 0.35 luma in the night hero: 19.8 % → 0.75 %. Night ground under the
  horizon again (pad/horizon 2.4 → 0.68); moon key, fill and grade retuned.
- **Hills** (`2c77f7f`): the hill airlight is now the displayed sky at the ray's
  own elevation (no cooling multiplier, no `hillSkyK`), the far mesh folded onto
  a sphere past 860 m, the straw flat and the forest skirt brought to the near
  terrain's level with a shared distance falloff. Hills sit at 0.72–0.92 of the
  ridge sky with saturation 0.47 → 0.25; the cream band is gone.
- **Camp shade** (`4bdaba9`): day hemisphere 0.5 → 2.5 with the sun 9.4 → 7.9 —
  the shade was hemisphere + environment and nothing else. Sunlit/shade 3.4 →
  2.25 stops; the chairs under the awning read (0.14 → 0.26). The rest is the
  camp's wear decal (`envMapIntensity` 0.25) and the terrain's indirect response,
  handed to their owners.
- **Dusk hero front** (`4bdaba9`): the clipped grille was a 7.0 key square to a
  6° sun, not the lamps; key 4.0 with a softer grade knee, clipped pixels
  14.5 % → 2.8 %.
- **Lions, round 4** (`b3f403b`): eyes set lower, closer and forward with 70 % of
  the iris visible (was ~35 %), amber iris with pupil and catchlight; mouth as a
  seam, ears 20 % smaller and ovoid; loft normals continuous across rows;
  forearm/gaskin +22 %, head +8 %; paws as feet, not boots; contact blobs per
  paw and body (chest dirt 1.47 stops under open dirt); a sheen so the dusk key
  rims the coat. Feet probe unchanged at machine precision.
- **Fleet, round 3** (`62d7e42`): lamp pools only under lit lamps, a seven-vehicle
  night set (markers, one arriving with headlamps, a dome light, a lit camper
  window), night hemisphere floor, neutral panes instead of the laterite film,
  motorcycle re-lathed, wheel contact blobs, and the trailer framed from its
  body box.
- **Hero car, round 3** (`d8b40ec`): live door mirrors at high/ultra (a 192×224
  target per pane from the eye reflected through the pane, one pane per frame,
  live within 5 m; ~105 calls per pass), lamp glow with a hot core and coloured
  rim, brake and reverse logic, a bedside ladder, calipers that read through
  the spokes, the cabin neutralised from amber.
- HUD: tight text shadow for legibility over sunlit dirt; the key legend rests
  ten seconds after the first gesture; type dims at night. Favicon request
  silenced.
- Running: hero-car materials (side-pane Fresnel, interior crackle, mirror at
  fast, beam pool), lion gait (stride, swing flexion, head and tail), lion head
  to measured skull ratios, campground (fire reach, fleet-row lanterns, paths,
  timber), vegetation (plain density, crown shading, night canopy, treeline).

## Gauntlet rounds 2 and 3 — every family rebuilt once

**Build `a8ca6eb`** — live, smoke-tested (HUD reads `build a8ca6eb · 2026-09-04 19:19Z`, zero page errors).

Eleven landings since `45a2074`, each gated by `tools/gate.mjs` (HEAD plus the
files being landed, built in a throwaway worktree, booted at fast/high/ultra
with program link status and page errors read back, then the interaction
checks). Frames for the critics are being shot into `shots/round2/` by
`tools/baseline.sh`; their verdict follows in the next entry.

- **Lions, rounds 2 and 3** (`01711a7`, `db81bb4`): body rebuilt with limb
  volumes and a heavier torso; gait and lie/sit on the feet solver; head
  rebuilt as a cat's — superellipse skull loft with brow ridge, zygomatic arch,
  whisker pads, a longer and deeper muzzle, eyes forward in carved sockets
  (1.35× and the cornea to match), broad nose leather, cupped ears on the sides
  at brow level; coat re-palettised tawny-ochre with dorsal darkening and worley
  tuft breakup instead of streaks; four-lobed paws with claw sheaths; the male
  mane's shell chain ends inside the skull with tapered shells and a 512 px
  strand map at every tier. The blink closes the full opening.
- **Glass, round 2** (`7cae2bd`): premultiplied panes so the PMREM reflection
  lands at full strength; neutral near-black tints; flat-metal mirror with a
  graded ground half; gasket and proud edge rim on every pane; frit bands; the
  black band behind the door glass was `body_gap` running 110 mm above the
  beltline — capped.
- **Lighting, rounds 2 and 3** (`e385d26`, `515984f`, `2e6dbc9`): a second
  shadow cascade (±130 m, 2048², texel-snapped) so the camp and the pride cast
  shadows from the road; the far map renders in its own pre-pass with casters
  picked by name and world size — 305 → 79 calls, 0.97 → 0.51 M tris. Night
  has a moon key, point stars and a Milky Way and a scotopic grade; dusk a
  lower, stronger sun. Fog now converges on the *displayed* sky dome evaluated
  at the ray's elevation and azimuth, so the sun-side plain no longer fogs to a
  cream band brighter than the sky (`camp_beyond` strip hue 136 → 210, matching
  the sky's 217). The PCSS installer stops at the cascade body — at high/ultra it
  had been replacing the cascade function and breaking 107 programs.
- **Terrain, round 2** (`a51ba8b`): roadside stones sunk, laterite-tinted,
  fewer and larger; far hills to Lambert with haze that follows the ray's
  elevation and a luma cap under the sky; the water hole's reflection had
  `flipY` on and read the zenith at grazing angles — fixed, with a dielectric
  Fresnel, khaki murk and a shore ring; mainline ruts with a compacted dark
  centre and lit lip.
- **Vegetation, round 2** (`0f8c00e`): grass glowed at dusk because the
  lamp-transmission path fired on the sun (view-space direction compared with a
  world-space `uSunDir`); per-instance scale/hue/value jitter and an fbm density
  mask replace identical clumps; acacia crowns get ragged tile edges, three
  tiers of fill cards, alpha-cut shadows; far trees to Lambert with fog.
- **Campground, round 2** (`e6385a2`): fire rebuilt (4-frame flame atlas,
  standing and rising tongues, embers, ground glow, charred logs); canvas with
  catenary sag and translucency; the gate 'slab' was a shadow-casting track
  overlay — now twin ruts that fade; footpaths, ash spill, woodpiles, jittered
  parking.
- **Fleet, round 2** (`5c16d3e`): trailer level on its jockey stand, every tyre
  on the ground, hour-gated lamps, real glass, a parking row that is not a row.
- **Hero car, round 2** (`308c476`): tyres deform in the vertex shader (21 mm
  squash by suspension load, flat patch sunk into the soil, sidewall belly,
  dirt line); one-mesh occlusion blobs under each tyre and a chassis pool
  sampled on the terrain; a 96-quad-per-wheel tread-track ring buffer; the old
  pale contact decals are gone (−4 draw calls).
- Measured on the integrated build at `fast` after the far-pass cull
  (`perf/…0f8c00e+.json`): sampled frame 962 → 649 draw calls, 3.35 → 2.38 M
  triangles, 168 programs; boot compile at `fast` 31 s under SwiftShader.
- Round 3 builders running: horizon integration (hills 1.3 stops under the sky
  at their base, the 0.56 straw flat, the skirt's lit term) and the hero car's
  geometry round (arches, brakes, suspension, lamps at night, cabin colour,
  door mirrors at high/ultra).

## Gauntlet round 1 — verdict, and two measured wins

**Build `45a2074`** — live, smoke-tested (HUD reads `build 45a2074 · 2026-09-04 14:17Z`, zero page errors).

- Three blind critics scored the baseline (`gauntlet/round1/critic_{A,B,C}.md`);
  consensus and the disagreements that were investigated rather than averaged
  are in `gauntlet/round1/CONSENSUS.md`, key frames in `gauntlet/round1/frames/`.
  Weakest area by unanimous verdict: the lions (head, proportions, coat, gait);
  system defect: glass and reflections; highest-leverage fix: shadow coverage —
  the sun's shadow box is 44 m around the truck, so the camp and the pride are
  shadowless from the road.
- Two unanimous critic findings were capture artefacts and are fixed in the
  tools: the walk strip's camera followed the lion (read as sliding feet — the
  probe was right, the feet hold), and the camp/lion tools did not move the
  shadow frustum with the teleported truck. Lion far/pride/seat and camp
  arrive/interior cameras re-planted so they show their subjects.
- HUD key strip wraps clear of the speed block at narrow widths.
- **Shader programs 277 → 159**: the boot compile ran with the screen bound and
  built every program tone-mapped, then the composer built them all again
  linear; now compiled into the composer's target. Draw calls and triangles
  unchanged.
- **JS heap 332 → 216 MB**: DataTexture pixel arrays dropped after upload
  (109 MB that was never read again). Flat over reset loops; frames identical.
- `perf/census-r1.md`: a measured attribution of programs, triangles, textures
  and heap to modules, with ten ranked wins; the rest go to their owners in
  round 2/3 (terrain tiles, fleet per-vehicle merge, forest cells, kit
  indexing, shadow-caster list, cache keys).
- Round 2 builders running in parallel: lion body+gait, lion head, glass,
  lighting, road/terrain, fleet, vegetation, campground.

## Gauntlet round 1 — baseline

**Build `8754528`** — live, smoke-tested (HUD reads `build 8754528 · 2026-09-04 12:46Z`, zero page errors).

- Removed the forest-era ridge cards: two unlit, unfogged rings of pale ridge
  silhouette at 560/690 m that stood among the far hills as a band brighter
  than the sky, with a dark line at their base. The horizon is the terrain's
  hills now. Before/after `shots/iter_16/forest.png` → `shots/cand_noridge/forest.png`.
- Seven fixed cameras for the car-glass gauntlet (`glass_*` views), hidden from
  the default capture and the digit keys. Round-one glass frames in
  `shots/glass_r1/day/`.
- `gauntlet/RUBRIC.md`: the eighteen categories, scale, report shape and gate.
  97 baseline frames in `shots/round1/`; three blind critics score them.
- Measured (`fast`, software raster): 453 calls, 2.57 M tris, 277 programs,
  275 textures, heap 334 MB flat over three reset loops, zero errors. Shader
  compile is 24.3 s of a 43 s software boot; the program count is the next
  performance target.

## Safari, iteration 16 — the biome change

**Build `2f0f5ba`** — live, smoke-tested (page boots, HUD reads `build 2f0f5ba · 2026-09-04 12:07Z`, zero page errors). Supersedes `34d3fc8`, which lacked the lions.

- **The pride landed**: a maned male, three lionesses, two cubs on a 34-bone
  skeleton with three detail tiers. Feet are solved, not approximated —
  independently re-run: 1,200 frames, 268 steps, max penetration 2.3e-14 m,
  max planted-foot slide 8.5e-14 m. Frames in `shots/lion_16/`. Round-one
  inventory for the lion gauntlet: the face is the weak point (small head,
  boxy muzzle, a mouth line that reads as a grin, fur as smooth suede), the jaw
  never opens, and the mane has no chest fringe.

### What changed

- **The world is East-African savanna.** Laterite roads, straw grassland, umbrella
  and flat acacias, marula, thorn scrub, dead trees, three granite kopjes,
  termite mounds, a dry riverbed under a culvert, a water hole with a mud margin,
  far hills. Trees thin toward the open plain.
- **Two roads and a route.** The spur crosses a graded gravel mainline; auto-drive
  turns toward the camp. A graded pad, an access apron, an overlook with a
  signboard, park signs, kilometre posts, a ranger boom gate.
- **A tented camp**: 118 objects, twelve parking slots, a lookout, radio mast,
  solar, water, fuel stored away from fire, thorn boma, fire pits with GPU
  particles and lanterns that light at night.
- **A fleet of twelve** (sixteen at `ultra`) across ten kinds, none clones.
- **Four hours**: day, dusk (golden hour), night, overcast; kilometre haze,
  crepuscular rays through dust, heat shimmer.
- **The hero truck** gains a roof tent, spotlight, swing-out spare, fridge slide,
  reverse lamps, laterite dust with bush scoring — and its glass, which round zero
  of the glass gauntlet found had never been rendering (see PROGRESS.md).
- **Sound**, all synthesised: engine with audible upshifts, tyres that change
  with the surface, wind, a savanna ambience bed, horn on `H`.
- Seven camera modes, a revision stamp in the HUD, a deploy tool that proves the
  live page serves HEAD, and a performance harness.

### Measured (`fast`, software raster — structural numbers are real, fps is not)

| | before | after |
|---|---|---|
| draw calls | 429 | 395 (hero) · 483 (camp arrival) |
| triangles | 3.64 M | 2.16 M |
| ride, chase / cockpit vertical RMS | 1.24 / 1.35 m/s² | 1.12 / 1.06 m/s² |
| worst in-game frame | 13,870 ms | 774 ms |
| heap over 3 reset loops | — | +0.2 MB |
| camera checks | 21 | 33, all passing |
| console / page errors | 0 | 0 |

### Frames

`shots/iter_16/`, `shots/iter_16d/`, `shots/iter_16n/`, `shots/camp_16/`, `shots/camp_16n/`.

### Known limitations

- The lions are still in flight; the wildlife camera points at where they will be.
- A pale band and a thin dark line at the far skyline (vegetation skirt at
  420 m plus forest-era ridge cards).
- Water reflections still forest-blue.
- GPU time reports n/a under the software rasteriser.

### Failed experiments

- Building the deploy bundle from the working tree while agents were editing:
  failed twice on half-finished terrain imports. Deploys now build from HEAD.
- Stubbing the Vite client with an empty body to survive HMR reloads: strips
  `define` and breaks the build stamp. Three agents hit it; the stub keeps the
  env module now.

### Next weakest area

The lions, then the far skyline band, then gauntlet round one across every
family with three critics.
