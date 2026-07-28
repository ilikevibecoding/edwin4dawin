# Visual review — round 1

Reviewed at `high` preset unless noted. All numbers below are measured off the PNGs
(luminance on 0–255 sRGB, `B-R` = mean blue minus mean red, so negative = warm) or
quoted from source. Where I am inferring rather than confirming, I say so.

Eight of the expected ~11 `critique-r1` frames existed when I finished:
`market_hero`, `market_eye`, `souk`, `villa_court`, `rooftop`, `alley_eye`,
`cafe_window`, `fountain_low`.

---

## 1. Verdict

**`critique-r1/`**

| Frame | Pass as AAA? | The single giveaway |
|---|---|---|
| `market_hero` | Closest of the set. Would survive a thumbnail, not a full-size look. | Facades are one flat value — the plaster has no albedo contrast, so form comes only from the sun angle. |
| `market_eye` | No | Nearly frontal key. Nothing rakes across the street; every wall plane sits at the same value and the street has no floor shadow to sit on. |
| `souk` | No | The arcade is lit from nowhere. Under a cloth roof the floor still reads mid-grey, so the interior has no sense of being enclosed. |
| `villa_court` | No | Uniformly warm, shadowless. Sun/shade geometry is right for cross-light and it still comes out flat — that is the cloud-shadow bug (D3). |
| `rooftop` | No | Sky is the brightest thing by a mile and the roof deck reads as one untextured slab; no value hierarchy between parapet, deck and props. |
| `alley_eye` | **Spotted in half a second.** | The hanging laundry. Grey-green translucent slabs at `B-R = +2.4` (neutral/cool) hanging in a street where every warm surface is `B-R = −38` to `−88`. They look lit by a different scene. |
| `cafe_window` | **Spotted in half a second.** | Light transport is inverted. The ceiling measures L93 and the floor L5.7 — the ceiling is 16× brighter than the floor in a room lit by low side windows, and not one window casts a light pool. |
| `fountain_low` | **Spotted instantly.** | 60% of the frame is an out-of-focus stone rim. This is the frame that proves the 9× DOF multiplier (D6) is indefensible. |

**`sky/`** — the strongest subsystem. `sky_golden`, `sky_dawn`, `sky_dusk` would pass.
`sky_noon` and `sky_overcast` are honest. `sky_sandstorm` is the weakest (reads as a
flat orange fog plane, no visible particulate motion or density variation).
`sky_night_zenith` has visible gradient banding.

**`fx/`** — `fx_explosion_early` and `fx_muzzle` are good: real internal structure,
correct warm core to cool smoke falloff. `fx_smoke` and `fx_explosion_settle` read as
correct volumes. `fx_impacts` is fine. The FX system is the second-strongest subsystem
and has the only working light-transmission model in the codebase
(`src/shaders/fx/common.glsl.ts:146-162`).

**`airstrike/`** — `as_target` and `as_precision` are strong. `as_wide` fails: the
cloud layer resolves into a repeating geometric lattice and the jets are untextured
grey silhouettes with no panel lines, no insignia, no exhaust staining.
`as_napalm` scale reads wrong — the fire is too small relative to the buildings.

**`hud/`** — `hud_designate` is the best single frame in the entire set and looks
genuinely designed. `hud_combat` and `hud_strike` are good. `hud_menu` and
`hud_loadout` are weaker: spacing is uniform where it should be hierarchical, and
several labels are set at the same weight and size as the values they label.

**`ai/`** — all five fail. `ai_soldier` and `ai_cover` are the clearest: the soldier
is a smooth mannequin with no kit breakup on the silhouette, and shading is so soft
the limbs have no separation from the torso.

**`weapons/`** — `wpn_ads` and `wpn_scope` pass. `wpn_hip` and `wpn_lineup` show the
receiver as a smooth extruded box; no machining, no fastener detail, no wear on the
edges that a real weapon shows first.

---

## 2. Ranked defect list

### D1 — Procedural material bakes have a bimodal frequency spectrum, and macro features are baked into the tile

**This is the root cause of "everything looks like plastic" and it is the most
valuable thing to fix.**

What is wrong, measured off the material sheets:

- `mat_plaster` albedo standard deviation is **6.8** on 0–255. The entire wall
  surface sits within about ±5% of one value. Real render/plaster is 15–25. This is
  the material that covers most of every frame, and it is the flattest in the library.
- Both `mat_plaster` and `mat_concrete` bake **recognisable low-frequency macro
  shapes** straight into a 2–3 m tile: a pale hook/comma-shaped blob, and
  peeled-render patches revealing brick. In the 2×2 tile view of `mat_plaster` the
  same hook appears four times at identical scale and identical orientation.
  `mat_concrete` repeats a dark squiggle-crack motif on a perfect grid.
- On the `alley_eye` right-hand facade this is plainly visible: the same hook blob
  stamped across the whole elevation at a fixed interval. The wall reads as
  **wallpaper**. `fountain_low` shows the concrete version at large scale — the
  fountain rim's "cracks" are near-black high-contrast squiggles that read as painted
  scribble rather than crevices, and they visibly repeat around the rim.
- The spectrum is dense micro-noise plus these macro blobs and **nothing in
  between** — no 10–60 cm trowel sweeps, patch boundaries, damp, or undulation. That
  missing mid-band is exactly what makes a surface read as a substance rather than as
  a painted primitive.
- The bakes are also **not seamless**. `mat_plaster`, `mat_fabric_canvas` and
  `mat_concrete` all show a hard horizontal value discontinuity across the middle of
  the tiling panel. On a large wall that produces a visible grid of seams, which is
  the patchwork-quilt effect on the `alley_eye` facade.
- `mat_concrete` is dead neutral (`B-R = −3.3`). Under a warm grade, neutral grey
  goes conspicuously cold and reads as a different scene from the ochre around it —
  the `fountain_low` rim is a cold grey-white object in a golden-hour frame.

**Shows in:** every frame; worst in `alley_eye`, `market_eye`, `souk`, `fountain_low`,
`ai_cover`, `rooftop`.

**Cause:** `src/materials/MaterialLibrary.ts` bakes macro features into the tiling
albedo, and the noise stack has no mid-frequency octaves. The source already knows
about this class of problem — `src/world/Architecture.ts:915-921` documents pulling
`concrete_damaged` off spall patches for exactly this reason ("a couple of arbitrary
crack lines with no relationship to the patch outline") — but the fix was applied to
one call site instead of to the library.

**Fix:**
1. Strip every recognisable macro shape out of the tiling albedos — peeled patches,
   brick reveals, large cracks, the hook blobs. Those belong on the sparse,
   architecturally-placed layer that already exists in `applyWallWear`, where their
   position is driven by sills, cornices and the base course rather than by UV.
2. Add 2–3 octaves in the 10–60 cm band, domain-warped so it is not isotropic, and
   drive both albedo (±10% value is enough) and the normal. This alone will take
   `mat_plaster` from sd 6.8 to a believable 18–20.
3. Bake tileable: use a periodic noise lattice so there is no seam at all.
4. Break the residual grid with per-surface UV randomisation — `addBox` already
   accepts `uvOffset`, so feed it a per-quad random offset and 90° rotation
   everywhere — plus one extra macro-variation sample at 1/8 the tile rate
   multiplying albedo. That is the standard trick and costs one texture fetch.
5. Warm `concrete` to roughly `B-R = −20` so it belongs in the town.

---

### D2 — Cloth receives no transmitted light and its albedo is olive drab

The laundry in `alley_eye` is the most damning object in the review, and it is a
two-line fix in the material plus a small shader term.

- Measured: laundry `B-R = +2.4`, luminance 135. The sunlit wall directly behind it
  is `B-R = −37.8`. Every other warm surface in frame runs `−38` to `−88`. The cloth
  is the **only** neutral-to-cool thing in a golden-hour street.
- `mat_fabric_canvas` albedo measures **RGB (77, 75, 63)** — olive drab at roughly
  30% reflectance. This is the material used for hanging laundry (`CLOTH_MAT =
  'cloth_wind'` wraps `fabric_canvas`, `src/world/Vegetation.ts:72`). White cotton
  should be 0.7–0.8 reflectance, around (220, 218, 212).
- There is **no transmission term for opaque world surfaces**. The camera-facing
  sheet face is lit by sky irradiance only, which at golden hour is blue, so a
  high-value sheet comes out bright neutral-blue. `src/world/Geo.ts:223-239`
  documents the intent — "one layer of cotton with the sun behind it is meant to be
  the brightest thing in the lane" — and implements it by offsetting a second face
  with a hand-aimed `farNormal` and authoring a brighter vertex colour on it
  (`src/world/Town.ts:1540`). That is a per-vertex fake that only works when the
  camera can see the far face. It does nothing here.
- Secondary: the sheets have no fold structure or wind shape. `windVariant`
  amplitude is `0.05` (`Vegetation.ts:73`), so they are effectively rigid. The top
  edge is dead straight and passes through the wire instead of draping over it.
- The canvas bake also carries the same hook blobs as the plaster, plus a repeating
  rectangular stitched-box motif that reads as a printed logo.

**Shows in:** `alley_eye` (severe), `souk`, `market_eye`, `rooftop` (roof laundry),
awnings throughout.

**Fix:**
1. Give `fabric_canvas` — or a new `cotton_white` variant for laundry, keeping canvas
   olive for awnings where drab is correct — an albedo near (0.72, 0.71, 0.69).
2. Add a wrapped-transmission term to the world surface shader for materials flagged
   thin: `+ transmitTint * saturate(dot(-N, L)) * sunRadiance * thinness`. The FX
   shader already has exactly this model at
   `src/shaders/fx/common.glsl.ts:146-162` (`wrap`, `transmit`, forward lobe) — lift
   it. With the sun 6° up and sheets roughly vertical this immediately makes backlit
   laundry the hottest value in the lane, which is what the code comments already say
   should happen.
3. Raise the wind amplitude and add a second lateral flex term so the sheets have a
   varying silhouette; drape the top edge over the wire.

---

### D3 — Cloud shadows use a top-down projection, so a cloud overhead kills 90% of the sun with no directional shadow

This is a real bug, not a tuning problem, and it is why some frames are inexplicably
flat while others in the same level look correct.

- `src/render/atmosphere/CloudVolume.ts` builds `shadowMatrix` as a **purely vertical
  projection** — it maps `worldPos.xz` straight to shadow UV and ignores sun azimuth
  entirely.
- `src/shaders/lighting/csm.glsl.ts` then does
  `shadow *= mix(1.0, texture2D(uCloudShadowMap, uv).r, uCloudShadowStrength * inside)`
  with `uCloudShadowStrength = 0.9` (`src/render/LightingSystem.ts`).
- With the golden preset at `timeOfDay 17.75` — about **6° elevation** at
  `SITE_LATITUDE 32.5N` (`src/render/atmosphere/Celestial.ts`) — a cloud's shadow
  should land roughly 9.5 horizontal metres away for every vertical metre. Instead it
  lands directly underneath. `cloudCover` is `0.38` in the golden preset, so a third
  of the town is randomly having 90% of its direct sun removed while the sky, the
  visible clouds and the aerial perspective all still say full sun.
- The result is a scene with sky-only lighting: warm, low contrast, no shadow
  anywhere. `villa_court` is exactly this. `market_hero`, captured from a spot that
  happened to be outside a cloud footprint, shows good sun/shade separation and
  correctly cool shadows — proof the lighting rig itself works.

**Shows in:** `villa_court` (severe), `market_eye`, `souk`, `rooftop`. Not
`market_hero`.

**Fix:**
1. Project along the sun vector, not down: build the shadow matrix from a basis
   oriented to the sun direction so a cloud at altitude `h` displaces its shadow by
   `h / tan(elevation)` horizontally.
2. Drop `uCloudShadowStrength` to 0.5–0.6. A cumulus at 6° elevation is a long thin
   band of soft shade, not a 90% blackout.
3. Guard the near-horizon case: below about 8° elevation the displacement exceeds the
   shadow map extent, so fade cloud shadowing out rather than clamping the UV (the
   current `clamped` sample smears the map edge across the whole level).

---

### D4 — Interior light transport is inverted: ceilings are bright, floors are black, windows spill nothing

`cafe_window` is the clearest single failure of lighting in the set, and the numbers
are unambiguous.

- **Ceiling L93.5 (sd 5.5). Floor L5.7 (sd 3.9).** The ceiling is **16× brighter
  than the floor**. In a room lit through low side windows at a 6° sun, the floor
  receives the direct light pool and the ceiling receives only weak bounce off it —
  the exact opposite. A ceiling whose normal points down should be among the darkest
  major surfaces in the room.
- The ceiling's `sd = 5.5` says it is being lit by a **flat, non-directional,
  unshadowed fill** rather than by anything in the room. It has no gradient away from
  the windows at all.
- **Not one window casts a light pool.** The windows themselves measure L106 at
  `B-R = −50.7`, so they are correctly bright and warm — but the floor beneath them
  is at L5.7. At 6° elevation a sun-side window should throw a long bright
  parallelogram deep into the room, and that pool is the single strongest cue that a
  space is real. There are instead a couple of hard-edged pale quads on the floor
  that do not line up with any window and read as mis-projected decals.
- **The right-hand wall is genuinely blue**: RGB (35.6, 40.7, 48.0), `B-R = +12.5`,
  at L40 — while the left wall is L107 at `B-R = −51.0`. So one room contains a warm
  wall and a blue wall 2.7 stops apart. Interior surfaces away from the windows are
  receiving raw sky irradiance with no warm bounce from the sunlit exterior, so they
  go cold. The wall beside the warm pendant lamp measures `B-R = −6.4`, nearly
  neutral — a warm practical cannot produce a neutral wall, which confirms the fill is
  swamping it.
- **22.3% of the frame is below L8.** So interiors *crush* while exteriors are milky
  (D5). Both are the same underlying problem: there is no indirect transport, so a
  surface is either hit by flat fill or by nothing.

**Shows in:** `cafe_window` (severe), `souk`, `hud_interior`.

**Cause:** the interior fill described in `src/world/Practicals.ts:10-16` is doing the
work that bounce light should do, and it is neutral-to-cool and normal-agnostic. The
irradiance probe grid appears not to have usable interior samples, so surfaces fall
back to an exterior sky value that is blue and unoccluded.

**Fix:**
1. Make the window openings actual light emitters: place a portal/area light in each
   opening oriented into the room, tinted to the sun colour, and let it cast. One
   bright shadowed pool on the floor per sun-side window will transform this frame.
2. Warm the interior bounce. Whatever fills interiors must be tinted by the floor and
   wall albedo it is nominally bouncing off — warm ochre, not sky blue. Weight it by
   `N·up` so it lands on floors and up-facing surfaces rather than on ceilings.
3. Give the fill a directional falloff from the openings so it decays with distance
   into the room instead of being uniform.
4. Verify probe placement actually samples interior volumes; if a probe is outside the
   wall it will hand the interior an exterior sky value, which is what the blue wall
   looks like.

---

### D5 — Shadows are neutral, not cool, so there is no complementary contrast

- `alley_eye` shadows measure `B-R = −5.8` — essentially neutral. Midtones are
  `−38.5`. So shadow and light differ in value but barely in hue, and the frame reads
  as one ochre wash. `fountain_low`'s shaded left-hand building is `B-R = −11.9`,
  again drifting to neutral rather than to blue.
- Golden hour is the single easiest lighting condition to sell precisely *because*
  the shadows go blue: they are lit by a large blue sky while the key is 2000–2500 K.
  CoD leans on this hard. Here that free contrast is being thrown away.
- Cause is a stack of things fighting each other. `src/render/RenderPipeline.ts`
  defaults `temperature: 0.16` (warms globally, including shadows), `contrast: 1.04`
  and `saturation: 1.02` (both nearly inert). The `desert` LUT in
  `src/render/passes/LutLibrary.ts` does put teal in the shadows via `splitTone`, then
  immediately undoes it with `saturation(c, 0.86)` and
  `boostHue(0.55, 1.3, 0.5)`, which pushes 1.3× gain into exactly the orange/yellow
  band the whole frame already sits in. Net effect: desaturate everything, then
  re-saturate only the ochre.

**Shows in:** all `critique-r1` frames; worst in `alley_eye`, `villa_court`.

**Fix:**
1. Stop warming the shadows: move the +0.16 temperature out of the global lift and
   into the highlight/mid range only, or apply it to the sun radiance rather than to
   the final image.
2. Drop `boostHue` from the `desert` LUT, or narrow it well away from the dominant
   ochre. It is currently amplifying the exact problem the grade is meant to solve.
3. Push real cool into the ambient instead of the grade: the sky IBL at 6° elevation
   should already be delivering blue shadow fill. Verify the irradiance probes are
   not being warmed on bake. Target shadow `B-R` around `+15` to `+25` against
   midtones at `−40`.

---

### D6 — Depth of field is 9× physical, and `fountain_low` is the proof

- `src/render/passes/DepthOfFieldPass.ts` sets `focus = 12`, `aperture = 4`,
  `focalLength = 0.014`, `SENSOR_HEIGHT = 0.024`, and then **`scale = 9`**, applied
  directly to the CoC (lines 194-199).
- Worked through, `cocScale` comes out at about **16.5 px at 900p**. The far field is
  actually mild — roughly 1 px at 40 m and 1.4 px at infinity — so I am **not**
  blaming DOF for the general softness of the exterior frames (that is D1 and D9). The
  near field is the problem: about **4 px at 3 m and 15 px at 1 m**, against a
  physical 1.7 px.
- `fountain_low` is the consequence. The camera sits at fountain-rim height, so a
  stone rim roughly a metre away fills the bottom 60% of the frame and is blurred into
  complete mush. No CoD gameplay frame has ever looked like this. A stranger would
  call it in well under a second.
- The `maxCocFraction = 0.022` cap (≈20 px) is not binding, so nothing protects
  against this.

**Shows in:** `fountain_low` (severe), `alley_eye` foreground, `wpn_hip`,
`hud_interior`.

**Fix:** set `scale` to 1.0–1.5 and keep DOF physical. If a shallower look is wanted
for cinematics, expose it as a separate cinematic-only multiplier rather than baking
9× into the gameplay path. In CoD the gameplay DOF budget is a couple of pixels at
most. Independently, raise the `fountain_low` camera — see D11.

---

### D7 — Black level is lifted in exteriors; nothing reaches a true black or a clipped highlight

- `alley_eye`: only **3.07%** of pixels below L16, **0.91%** below L8, and the 25th
  percentile sits at L42. Median 54. Nothing reaches L250 (**0.00%**).
- A CoD golden-hour street frame typically puts 10–18% of pixels below L16, holds a
  true black somewhere, and lets specular hits and sky clip. `alley_eye` occupies
  roughly L20–L210 and reads milky as a direct result.
- The deep interiors that *should* supply the blacks are being filled: `souk` shows
  arcade floor at mid-grey under a cloth roof. `src/world/Practicals.ts:10-16`
  explains why — real occlusion measured "two thousandths of the value of the lit
  arcade", so practical lights and canopy rips were added to lift it. That was the
  right instinct applied too generously: the lane is now uniformly lit instead of dark
  with shafts in it.
- `exposureBias: -0.3` in the golden preset is trying to compensate at the wrong end
  of the pipe.
- Note the contrast with D4: interiors crush 22% of pixels to black while exteriors
  will not reach L16 at all. The grade is not the whole story — the transport is.

**Shows in:** `alley_eye`, `market_eye`, `souk`, `rooftop`, `villa_court`.

**Fix:**
1. Raise grade `contrast` from 1.04 to about 1.12–1.15 and pull `lift` slightly
   negative so the toe reaches black. AgX will hold the roll-off.
2. Let the interiors go genuinely dark and control them with *contrast* rather than
   fill: fewer, brighter canopy rips make bright shafts against dark floor, which
   reads as an enclosed space. Uniform fill reads as no space at all.
3. Once the toe is fixed, remove the `-0.3` exposure bias so highlights can clip
   properly.

---

### D8 — Soldiers are smooth mannequins

- No kit breaking the silhouette: no pouches, straps, magazines, helmet cover,
  antenna, or slung weapon interrupting the outline. Outline is the only thing that
  reads at 20 m, and this outline says "shop dummy".
- Shading is so soft that upper arm does not separate from torso, and there is no
  occlusion in the armpit, under the chin, under the vest lip, or in the knee crease.
- No wear: uniforms are uniform. No dust build-up at the boots and knees, no sweat
  darkening, no scuffing on the vest.
- Faces read as blank volumes.

**Shows in:** `ai_soldier`, `ai_cover`, `ai_squad`, `ai_firefight`, `ai_ragdoll`.

**Fix:** silhouette first — add 6–10 procedural kit volumes on the outline
(magazine pouches, canteen, radio, helmet strap, shoulder seams) before touching
shading. Then add a cavity/AO term at the joint creases and a dust gradient rising
from the boots. Procedurally cheap and it is what makes a figure read as a soldier.

---

### D9 — Window and door openings have no reveal depth

- On the `alley_eye` right facade the windows are flat black rectangles with a thin
  warm frame. No reveal, no sill shadow, no glass, no hint of interior, no reflection.
  At golden hour a real reveal throws a hard triangular shadow into the opening on the
  sun side, which is one of the strongest form cues a facade has.
- Some openings show a bright band that looks like the frame catching light with
  nothing behind it, which reads as a decal rather than a hole.
- Seen from inside in `cafe_window` the same openings have no jamb thickness either,
  so the wall reads as infinitely thin card.

**Shows in:** `alley_eye`, `market_eye`, `souk`, `villa_court`, `rooftop`,
`cafe_window`.

**Fix:** inset the glass plane 15–25 cm behind the wall face and give every opening
four actual reveal faces. This is a few extra quads per opening and buys more
perceived fidelity per triangle than anything else in `src/world/Architecture.ts`.
Add a dark interior box behind the glass so it reads as volume, and a weak sky
reflection on the glass.

---

### D10 — Aerial perspective is doing too much of the work at close range

- `alley_eye` distant buildings at maybe 40 m measure L82 against a foreground at
  L52–73 — the distance is *brighter* than the foreground and heavily veiled, and the
  distant plane has lost essentially all surface detail.
- Golden preset sets `haze: 0.48`. That is a lot for a coastal town, and the falloff
  appears to start close enough that mid-ground geometry is already being flattened.
  CoD uses aerial perspective to separate depth *layers* while keeping mid-ground
  material legible.

**Shows in:** `alley_eye`, `market_eye`, `rooftop`, `as_wide`.

**Fix:** reduce `haze` to about 0.3 and push the onset further out so surfaces inside
30 m keep full contrast. Compensate for lost depth separation with light — a dark
foreground frame against a bright mid-ground — rather than with fog density.

---

### D11 — Vantage points are working against the lighting and the composition

Two problems, same owner.

- **The sun is behind the camera.** With the golden preset at 6° elevation and roughly
  88° west azimuth, the `market_eye`, `souk`, `villa_court` and `rooftop` vantages
  (`src/core/Vantage.ts`, `src/world/WorldSystem.ts`) all look broadly east, so every
  shadow falls **away** from the camera, hidden by the object casting it. A 6° sun is a
  gift — shadows are 9.5× object height and rake across a street beautifully. None of
  these frames use it. `market_hero` is the only one with any cross-light and it is
  visibly the best frame.
- **No composed value hierarchy.** The frames are busy edge to edge with no dark
  foreground frame, no bright focal accent, and no reason for the eye to land
  anywhere. `alley_eye` has a genuine one-point alley perspective available and wastes
  it: the vanishing area is the haziest, lowest-contrast part of the image. Props are
  scattered at even density rather than clustered to lead the eye.
- **`fountain_low` is a badly chosen camera**, independent of the DOF: placing the eye
  at rim height means 60% of the frame is a single foreground object. Its 3×3
  luminance grid runs 36/40/37 across the bottom against 45/148/115 across the top —
  all the information is in the top third.

**Shows in:** `market_eye`, `souk`, `villa_court`, `rooftop`, `alley_eye`,
`fountain_low`.

**Fix:**
1. Rotate the hero vantages 90–150° so the key is three-quarter back or three-quarter
   side. Every frame should have a long shadow entering from one side and crossing the
   floor plane. This is free — it is camera placement, not rendering.
2. Raise `fountain_low` to standing eye height and step back so the fountain reads as
   an object in a courtyard rather than as a wall of blurred stone.
3. At each hero vantage, deliberately place a dark near-silhouette element in one
   third of the frame (an arch edge, a hanging awning, a parked vehicle) and put the
   brightest value at the focal point. Cluster props into piles with clear ground
   between them.

---

### D12 — Contact shadows and dirt build-up missing at object bases

- The barrels in `alley_eye` and the furniture in `cafe_window` meet the ground on a
  clean line with no darkening, no dust fillet, no settled grit. They read as placed
  on the surface rather than resting in it.
- Same at wall/ground junctions: no sand banking against the base course.

**Shows in:** `alley_eye`, `cafe_window`, `market_eye`, `souk`, `fx_impacts_settled`.

**Fix:** GTAO is present but is not resolving the small-scale ground contact — check
its radius, and add an explicit contact-shadow term at short range. Independently, add
a procedural dust/grime fillet decal at every prop base and wall foot; it is cheap and
it is most of what "grounded" means visually.

---

### D13 — Untextured primitives in frame

- The right-hand foreground column in `alley_eye` measures `B-R = −20.7` at L68 with
  sd 28.9 — a smooth desaturated grey-brown cylinder with no material read at all. It
  occupies a full vertical strip of the frame.
- `cafe_window` is a bare rectangular volume: no cornice, no skirting, no pipework or
  clutter at the wall/floor junction. The table and stools are dark silhouettes with
  no material read. It reads as a whitebox that has been lit.
- The jets in `as_wide` are flat grey silhouettes: no panel lines, no insignia, no
  exhaust staining, no canopy glass.
- The `wpn_lineup` and `wpn_hip` receiver is a smooth extruded box — no machining
  chamfers, no fasteners, no edge wear.
- The fountain in `fountain_low` contains no water: the basin is a flat dark void with
  no surface, no reflection, no caustics. A dry fountain is a legitimate art choice,
  but then it needs debris and staining in the basin to say so.

**Shows in:** `alley_eye`, `cafe_window`, `fountain_low`, `as_wide`, `as_jets`,
`wpn_lineup`, `wpn_hip`.

**Fix:** give the column a real material and a capital/base break. Dress the café
interior with skirting, a cornice, wall clutter and grounded furniture. Add panel-line
normal detail and a dirt gradient to the aircraft. Chamfer and detail the receiver;
edge wear on a weapon appears first at the magazine well, charging handle and muzzle.
Either put water in the fountain with a reflection, or fill the basin with drifted
sand and litter.

---

### D14 — Wall wear reads as scattered rectangles rather than as damage

- `applyWallWear` (`src/world/Architecture.ts:853-994`) places every mark as an
  axis-aligned box lying 6–20 mm proud: craters 5–13 cm, a 2.1× pale halo, spalls
  0.7–1.9 m, sill drips, cornice streaks 1–3 m. Because every mark shares the wall's
  rotation and is rectangular, a heavily worn wall reads as a collage of rectangles.
- The sill drips and cornice streaks are the good part — they are placed by
  architecture and they work. The bullet bursts are the weak part.

**Shows in:** `market_eye`, `alley_eye`, `ai_cover`, `souk`.

**Fix:** keep the architectural placement logic, replace the rectangle with a shaped
mark — an alpha-tested quad with a procedural radial-noise crater mask gives an
irregular outline for the same triangle count. Vary rotation per mark so the grid
reading breaks.

---

### D15 — Sandstorm and `as_wide` cloud layer resolve into pattern

- `sky_sandstorm` reads as a flat orange fog plane with no density variation or
  particulate structure.
- `as_wide` clouds resolve into a repeating geometric lattice — the noise basis is
  showing its grid at that viewing distance.

**Fix:** add a second, much lower-frequency density modulation to the sandstorm and
some advected streaking. For the clouds, rotate/offset the noise basis per octave and
add a curl-noise warp so the lattice cannot align.

---

### D16 — Menu and loadout typography is not hierarchical

- `hud_menu` and `hud_loadout` set labels and values at the same weight and size, and
  space rows uniformly, so nothing tells the eye what matters. `hud_designate` gets
  this right and should be the reference.

**Fix:** two clear type levels minimum — labels small, tracked out, 60% opacity;
values larger and full opacity. Group rows with unequal spacing so related items read
as a block.

---

### D17 — Gradient banding in sky and shadow

- `alley_eye` has only **177 unique blue levels** against 256 red. `sky_night_zenith`
  shows visible steps in the zenith gradient.
- Grain is at `0.03`, too weak to dither the gradient, and the dither in the final
  encode is evidently not covering the blue channel adequately.

**Fix:** apply proper triangular-PDF dither at the sRGB encode, sized to 1 LSB. Two
lines of shader, removes the banding entirely.

---

### D18 — Chromatic aberration and vignette are visible

- `chromaticStrength: 0.35` and `vignetteStrength: 0.55` in
  `src/render/RenderPipeline.ts`. Both are noticeable, and any lens artefact you can
  consciously see is too strong. The vignette is clearly readable in the
  `fountain_low` corners, and it is fighting the frame's already low contrast by
  darkening corners that have no detail to lose.

**Fix:** chromatic to 0.10–0.15, confined to the outer third of the frame. Vignette to
0.25–0.30.

---

### D19 — `as_napalm` fire is scaled too small

The fire volume reads small against the surrounding buildings, which makes the
buildings read as toys. Scale the napalm spread and flame height against a known
reference — a 3 m storey — and make the fire taller than it is wide.

---

## 3. Subsystem assignment

**`src/materials/**`**
- D1 material frequency spectrum, baked macro features, non-seamless tiles, neutral concrete *(highest value in the whole list)*
- D2 (part) `fabric_canvas` olive albedo

**`src/render/RenderPipeline.ts`, `src/render/passes/**`**
- D5 (part) global temperature warming shadows; `desert` LUT `boostHue`
- D6 DOF `scale = 9`
- D7 contrast/lift, black level, exposure bias
- D17 dither/banding
- D18 chromatic aberration and vignette strength
- D12 (part) GTAO radius / contact shadow term

**`src/render/LightingSystem.ts`, `src/render/lighting/**`**
- D4 window portal lights, warm normal-weighted interior bounce, interior probe placement *(second highest value)*
- D3 (part) `uCloudShadowStrength = 0.9`
- D5 (part) cool sky ambient actually reaching shadows; probe bake warmth
- D2 (part) wrapped-transmission term in the world surface shader

**`src/render/SkySystem.ts`, `src/render/atmosphere/**`**
- D3 (part) `CloudVolume.shadowMatrix` top-down projection — **the bug**
- D10 haze strength and onset
- D15 sandstorm density, cloud noise lattice

**`src/world/**`**
- D2 (part) cloth geometry, drape, wind amplitude
- D4 (part) `Practicals.ts` interior fill tint and falloff
- D9 window and door reveal depth
- D11 vantage sun-relative orientation, `fountain_low` camera height, composition, prop clustering
- D12 (part) prop base grounding and dust fillets
- D13 (part) untextured column, café interior dressing, fountain basin
- D14 wall wear mark shape
- D7 (part) souk interior fill vs. contrast

**`src/fx/**`**
- D12 (part) settled-impact grounding
- (FX is in good shape — its transmission model is the reference for D2)

**`src/weapons/**`**
- D13 (part) receiver detail, machining, edge wear

**`src/ai/**`**
- D8 soldier silhouette kit, joint occlusion, uniform wear, faces

**`src/ui/**`**
- D16 menu and loadout typographic hierarchy

**`src/killstreaks/**`**
- D13 (part) aircraft panel lines, insignia, exhaust staining
- D19 napalm scale

---

## 4. The three things that would most improve the game

**1. Fix the material bakes (D1).** Strip macro shapes out of the tiling albedos, add
the missing 10–60 cm frequency band, make the bakes seamless, and randomise UVs per
surface. `mat_plaster` at albedo sd 6.8 is why every wall in every frame reads as
painted plastic, and the repeating hook blob is why the town reads as wallpaper. One
subsystem, entirely achievable procedurally, and it lifts every single frame.

**2. Make light behave: fix the cloud-shadow projection, get the key raking, and
invert the interiors back (D3 + D11 + D4).** Project cloud shadows along the sun
vector instead of straight down, drop the strength to 0.5, rotate the hero vantages so
a 6° sun cross-lights the streets, and make window openings emit into rooms so floors
get light pools and ceilings do not outshine them 16:1. `market_hero` already proves
the rig produces good sun/shade separation and cool shadows when a cloud is not
silently deleting 90% of the sun. This converts five flat frames into lit ones.

**3. Set `DepthOfFieldPass.scale` to 1 (D6).** A one-character change. It is the
difference between `fountain_low` being a screenshot and being 60% blurred stone, and
a heavily blurred foreground is the most reliable tell of a hobby project there is.

Honourable mentions, both cheap: give cloth a transmission term and a white albedo
(D2) — the FX shader already has the model, and it turns the worst object in the set
into the most attractive one. And fix the black level (D7), a handful of grade
constants that would visibly sharpen every exterior.

## What not to break

The sky system, the FX system, and `hud_designate` are all at or near the bar. The
`sky_golden`/`sky_dawn`/`sky_dusk` presets, the explosion internal structure and warm
core-to-cool-smoke falloff, the palm fronds in `fountain_low` (genuinely good
silhouette and translucency), the sill-drip and cornice-streak placement logic in
`applyWallWear`, and the targeting HUD's type and layout are the things this project
has got right. Leave them alone.
