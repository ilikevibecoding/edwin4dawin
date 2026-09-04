# Round 1 — consensus and disagreements

Three critics, blind to one another, on the identical 97 + 7 frames of build
`2f0f5ba` (`shots/round1/`, `shots/glass_r1/day/` — full sets on the build
machine; the frames this verdict rests on are committed as JPEG in `frames/`).
Reports: `critic_A.md`, `critic_B.md`, `critic_C.md`. Scores below are A / B / C.

## Where the critics agree (all three)

| Family | Consensus defect | Frames |
|---|---|---|
| Lions | Head reads as bear/dog: round skull, short flat muzzle, button nose, ears on top, no brow, no cheek mass; no mane on the individuals shot | `lions_day/lion_face.png`, `lion_close.png` |
| Lions | Body is a greyhound's: long thin tube, straight back, stick legs with no elbow/wrist/stifle/hock volume, paws taper to points; cub is a scaled adult | `lions_walk*/walk_*.png`, `lion_side.png` |
| Lions | Fur is flat tan mottle: no grain, no dorsal darkening, no pale belly/muzzle, no tail tuft | `lion_close.png`, `lion_close_dusk.png` |
| Car glass | No environment reflection on any pane at any angle (Reflections 2 / 2 / 1); the mirror face is not a mirror; interior seen through glass is a uniform amber | `glass_r1/day/glass_screen.png`, `glass_mirror.png`, `glass_side.png` |
| Hero car | Tyres do not visibly bear weight: tangent contact, no squash, no contact shadow, no soil disturbance | `truck_day/wheel.png`, `truck_*/road.png` |
| Fleet | The trailer is broken: pitched nose-down, wheel/hitch/jerry-can relationships wrong | `fleet/trailer_0_day.png` |
| Road | Small roadside stones are flat grey confetti: unlit, unembedded, un-graded by hour | `truck_*/road.png`, `truck_day/hero.png` |
| Vegetation | Acacia canopies are flat cards with hard cut edges at close range | `truck_*/forest.png`, `lion_far.png` |
| Lighting | Night is a flat blue-grey wash with no key direction; stars are uniform blobs | `truck_night/*.png`, `camp_night/*.png` |
| Lighting | Dusk is a grade, not a light: no long shadows, no rim, no sun disc in the truck views | `truck_dusk/hero.png`, `truck_dusk/mainroad.png` |
| Performance | 277–285 shader programs, 24 s of shader compile; 2.1–2.85 M triangles at `fast` | `perf/…ad7ef04+.json`, `stats.json` |

Two of three: grass clumps identical and regularly spaced (A, B); grass glows at
dusk/night, brighter than the ground (A, C); night ambient has a pale horizon
band brighter than the sky (B, C); campfire is a disc with no flame shape and a
3 m throw (A, C); tent canvas is a rigid plane with no sag (A, C); camp props
and fleet cast no shadows (A, B); motorcycle headlamp blown at midday (A, B);
fleet wheels sunk or floating (A, B); one crackle texture on every interior
surface (A, C); water hole a flat pale disc with no reflection (B, C); distant
trees black cut-outs without fog (C, and B's "poster horizon").

## Investigated rather than averaged

- **"Feet slide / the lion treadmills" (all three).** Contradicted the probe
  (planted-foot slide 8.5e-14 m). Cause found in the tool: the walk-strip
  camera hung off the lion's root, so the animal stayed put in frame while the
  ground scrolled 12 cm a frame. Re-shot from a world-fixed camera
  (`shots/round1/lions_walk_fixed/`): stance feet hold their pixel while the
  body passes over them. What remains true is that the walk is a ~0.5 m/s amble
  with short steps against a full leg swing, hind legs cross, the cub clips
  the adult's legs, and there is no body bob — so the feet brief is stride
  length and cadence, joint limits and secondary motion, not planting.
- **"No cast shadows anywhere" (B; A and C saw shadows missing on camp and
  lions).** The hero frames do have a shadow. The sun's shadow frustum is a
  44 m box around the truck (`shadowExtent: 22` at fast/high), so the camp,
  the pride from the road and the roadside trees are shadowless whenever the
  truck is more than ~22 m away — an in-game defect, and the top lighting item.
  The camp and lion capture tools also failed to move the frustum with the
  teleported truck; fixed (`02cde5d`).
- **"Headlights dead at night" (B, C) vs "night pool well shaped" (A).** Lamps
  are on and there is a pool ahead of the truck (`truck_night/front.png`), but
  the lenses do not bloom and the throw barely reads from the side. Item:
  lamp read, not lamp state.
- **"HUD text collides" (A, C).** Real at 640 px: the key strip ran under the
  speed block. Fixed (`95288b3`).
- **Hard horizon band / dark canopy-height line (all three).** The forest-era
  ridge cards, removed in `ad7ef04` after the baseline was shot. The far-hill
  exposure C flags (crests near white by day) is separate and stands.
- **Paint: "satin green with Fresnel sheen and real wear" (B) vs "flat, banded,
  horizontal streaks" (C).** Both looking at the same bush scoring along the
  flank, which reads as stretched texture at 640 px. Materials round; shoot at
  1280 before judging.
- **Fleet night lamps: "must not regress" (C) vs "parked vehicles with
  headlamps on is wrong" (B).** B is right for a camp at night; the fix is
  most lamps off, one or two vehicles with cabin or marker light.
- **Fleet Composition 6 / 3 / 3.** B and C are right that the supply-truck,
  safari-jeep and camper framings are occluded by neighbours; a tool defect.

## Camera defects to fix before round 2 is scored

`lion_far` (inside a canopy), `lion_seat` (headrest fills the frame),
`lion_pride` (animals 10–15 px), `lion_pride_dusk` (bonnet intrudes),
`camp_interior` (60 % cab), `camp_arrive` (subject too far),
`fleet/supply-truck_0`, `safari-jeep_0`, `camper_0` (occluded).

## Weakest area

All three name the lions — head, proportions, coat, and gait together — and
two of three name glass/reflections as the system defect that drags the hero
car, the fleet and the water down at once. The single highest-leverage change
is shadow coverage beyond the truck.

## Round 1 floors (lowest of the three, per family, on the categories the frames could show)

| Family | Floor categories |
|---|---|
| Car glass | Reflections 1, Materials 3, Glass 3 |
| Hero car | Reflections 2, Glass 3, Ground contact 4 |
| Campground | Shadows 3, Visual cleanliness 3, Animation 3 |
| Fleet | Composition 3, Geometry 3, Ground contact 3 |
| Road / terrain | Reflections 2, Shadows 3, Texture 4 |
| Vegetation | Lighting 3, Shadows 3, Animation 3 |
| Lions | Silhouette 3, Geometry 3, Detail 3, Animation 3 |
| Lion feet | Animation 2, Shadows 2, Ground contact 3 |
| Lighting | Reflections 2, Shadows 3, Lighting 4 |
| Performance | 4 |
