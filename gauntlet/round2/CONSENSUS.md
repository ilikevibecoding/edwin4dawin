# Round 2 — consensus and disagreements

Three critics, blind to one another, on the 103 frames of build `a8ca6eb`
(`shots/round2/`, shot by `tools/baseline.sh` from a clean worktree; 35 key
frames committed as JPEG in `frames/`) against the round-1 frames of `2f0f5ba`.
Reports: `critic_A.md`, `critic_B.md`, `critic_C.md`; 193–207 frames viewed each.
Scores below are A / B / C.

## The verdict in one line

Critic B's: "round 2 fixed the car and broke the world." The hero car, its
glass, its tyre contact, the day shadows and the camp props all scored higher;
the sky at night, the far hills by day, the shade under the camp canopy and the
lions' face scored lower — and three of those regressions sit in the very first
hero frame a player sees at each hour.

| Family | Round 1 → 2 (lowest category) | Direction |
|---|---|---|
| Hero car | Glass 5 → 8 / 5 → 6 / 6 → 6; Contact 7 → 8 (B); Shadows 6 → 7 | up |
| Car glass | Transparency 4 → 8 / 5 → 6 / 5 → 6; Reflections 4 → 4 (all) | up, mirror flat |
| Fleet | Shadows 5 → 7 (A); Lighting 6 → 5 / 6 → 4 (night lamps off) | mixed |
| Campground | Shadows 5 → 6 (A) / 6 → 4 / 6 → 4 (black slab); Lighting 5 → 6 / 6 → 4 / 6 → 5 | mixed |
| Road & terrain | Colour 5 → 4 / 6 → 3 / 6 → 4 (hills) | down |
| Vegetation | Density 6 → 5 / 6 → 4 / 6 → 5 (plain grass) | down |
| Lions | Silhouette 4 → 4 / 5 → 4 / 4 → 5; Geometry 4 → 4 / 5 → 4 / 4 → 4; Reflections (eyes) 3 → 2 (C) | flat, face down |
| Lion gait | Animation 3 → 5 / 5 → 5 / 4 → 5; Contact 3 → 4 / 4 → 5 / 4 → 5 | up |
| Lighting & atmosphere | Colour 5 → 4 / 6 → 3 / 6 → 4; Cleanliness 6 → 4 / 6 → 3 / 6 → 5 | down |
| HUD | Cleanliness 4 → 6 / 5 → 6 / 6 → 5 | up |

**Gate.** The rubric accepts a candidate only when no approved category drops by
more than one point. Colour/atmosphere and visual cleanliness dropped two to
three points in lighting, terrain and campground, so round 2 does **not** pass
the non-regression gate as a whole — and it was deployed (`a8ca6eb`) before the
critics scored it. Lesson recorded: the build stays live because the families
that improved are the ones the player looks at first, but the three regressions
below are **blocking for the next deploy**, not queue items.

## Where the critics agree (all three)

| # | Defect | Frames | Owner |
|---|---|---|---|
| 1 | **Night sky reads as snow.** A measured 20.0 % of sky pixels over 0.35 luma vs 0.45 % in round 1 (45×); the Milky Way is a denser field of the same dots, not a band. `starGrid` floors every star at a whole pixel at 640 wide. | `truck_night/hero.png`, `camp_night/camp_fire_night.png`, `fleet/*_night.png` | lighting |
| 2 | **Far hills are saturated cobalt and wrong against the sky.** Measured on `mainroad`: round 1 hills hue 33° sat 0.14 val 0.54, round 2 hue 220° sat 0.44 val 0.51 under a sky of 0.70. Into the sun (`lion_far`) they are 2.5 stops under the sky with a cream band beneath; with the sun behind (`fleet/*_day`) they are 0.2 stops *over* it. One shader, two opposite failures: the airlight is lit-dust `fogColor` times a cooling factor, not the sky. Dark "spots" 1–2° across on the faces are the macro/bush speckle at that distance. | `truck_day/mainroad.png`, `camp_day/camp_beyond.png`, `lions_day/lion_far.png`, `fleet/pickup_0_day.png` | horizon builder (running) |
| 3 | **Dusk hero: the front of the truck is blown.** Grille region p95 Y 0.71 with 23 % of pixels clipped against a sky p95 of 0.45 (A); B reads the key as coming from the wrong side of the sky; C reads a white slab. The `front` view at the same hour is fine, and `glass/dusk_ws` holds — so it is the brightwork/lamp path at that angle. | `truck_dusk/hero.png` | hero car + lighting |
| 4 | **Shade under the mess canopy is a hole.** Y 0.02–0.03 against sunlit dirt at 0.25 a metre away, hard edge, no bounce; chairs inside unreadable. | `camp_day/camp_mess.png`, `camp_interior.png` | lighting (ground bounce / hemisphere), campground |
| 5 | **Lions' face regressed while the skull improved.** Eyes read as dark slits set high and wide (A, B, C); the amber eye round 1 had is the one thing they all want back. Mouth is a painted hook; ears oversized (A) / discs (B). Body: a shading break along the saddle and a thigh seam (A, B); paws read as black boots (C, B); no contact shadow under any lion (A). | `lions_day/lion_face.png`, `lion_close.png`, `lion_side.png` | lions |
| 6 | **The plain around the pride went bald.** ~30 tufts in round 1's near ground, ~8 in round 2; bare dirt to the hills. Round 2's density mask and pride "lawn" exclusion overshot. | `lions_day/lion_pride.png`, `lion_far.png`, `truck_day/hero.png` | vegetation |
| 7 | **Door mirror reflects nothing at `fast`.** `see` 0.59 / `veil` 0.149, the worst pane; an orange-to-grey gradient. The live mirror landed after these frames (`d8b40ec`) but only at high/ultra. | `glass/mirror.png` | hero car |
| 8 | **HUD hints compete at night and vanish over sunlit dirt.** | `truck_*/hud.png` | master (shadow layer landed `6e4c0a4`; night opacity open) |

Two of three: night forest canopies are black or missing so trees are pale
skeletons (A, B); night ground/grade grey-blue, camp pad reads as a snowfield
(A, B); headlamps light nothing on the road in the night hero (A, B; C says the
pool is there — it is faint); fire too small and short-reaching at night (B, C);
acacia crowns one flat green with no lit/shade split (A, C); dusk canopies black
cut-outs with no translucency (C) / lime plywood cards (B); walk stride short
and legs swing as sticks (A, B, C on stride; B, C on flexion); tail stiff (B, C —
A says it swings); fleet night vehicles unlit silhouettes (B, C); interior wears
one crackle/dust texture on every surface (B, plus the hero-car builder);
waterhole a flat disc with a stepped edge (A); mid-ground road tile repeat (A);
ranger/utility windscreens magenta (A); motorcycle wheels 12-segment (C).

## Investigated rather than averaged

- **"Chase camera sits inside the truck's flank" (B, on every `hud.png`).**
  Capture artefact: the tool parked the camera on the hero view for its shader
  warm-up, and the HUD screenshot two seconds after `resume()` caught the chase
  camera still easing back. `rig.snap()` added and called by the tool
  (`6e4c0a4`); re-shot, the frame shows the chase cam seven metres back on the
  road.
- **"Soil went magenta-pink" (B).** Measured on the foreground ground of the day
  hero: round 1 rgb (0.57, 0.36, 0.22) hue 24° sat 0.61; round 2 (0.56, 0.36,
  0.23) hue 24° sat 0.60. Unchanged; the reading is complementary contrast
  against the new blue hills.
- **"HUD stamp says `e524952`, not `a8ca6eb`" (C).** The worktree was at the
  bundle commit, which is one ahead of the source commit and identical in
  source. `baseline.sh` now records the served URL alongside the frames.
- **Glass frames at 320×180 (A, C).** The glass gauntlet's default; `baseline.sh`
  now passes 640×360 (`fa9dfec`).
- **Fleet headlamps off at night (B, C) vs "spurious headlamp blasts gone" (A).**
  Round 2 gated the fleet's lamps by hour and lit only the arriving vehicle,
  which is what a parked overland camp looks like; A is right that round 1's
  every-vehicle blast was wrong. What is wrong in round 2 is the residue: pools
  on the ground under vehicles whose lamps are off, and no camp light reaching
  the row. Fleet brief: markers/parking lamps on a few vehicles, pools only
  under lit lamps, camp lanterns anchored near the row.
- **Trailer night plate framed inside its wheel arch (B).** The fleet capture
  rig sizes the camera from the kind's bounding sphere, which the trailer's
  hitch pole inflates; a tool fix, with the frame re-shot next round.

## Round-4 briefs (in flight)

Blocking for the next deploy: #1 stars, #2 hills, #4 camp shade. Then, by
family: lighting (stars, night grade and ground, ground bounce, dusk key
azimuth vs aureole, shadow softness, far-cascade acne on the lion neck); lions
(eyes and lids, mouth, ears, saddle normals and thigh weld, shoulder/hip masses,
paws, contact blobs) and gait (stride, elbow/stifle flexion, head bob, tail);
hero car materials (dusk brightwork clip, side-pane Fresnel and dust, interior
crackle, mirror fallback at fast, night beam pool); fleet (night markers and
pools, magenta panes, motorcycle wheels, trailer bounds); vegetation (plain
density, crown lit/shade split, dusk translucency, night canopy ambient);
campground (fire reach and flame size, gate timber, ground tile scale under the
mess, worn paths).

Frames the verdict rests on are in `frames/`; the full 103 are on the build
machine under `shots/round2/`.
