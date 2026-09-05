# Critic B — Round 1: baseline and defect inventory

Blind review. Only the frames under `shots/round1/**`, `shots/glass_r1/day/**`, the `stats.json` files and `perf/2026-09-04T12-46-27-505Z-ad7ef04+.json` (label `integrated-r1`) were consulted. Scores are per family, 0–10, `—` where the frames cannot show the category. The weakest frame of a family sets its floor.

Scale reminder used throughout: 7 = a player would not complain; 9–10 = marketing screenshot.

---

## 1. Car glass

Frames: `shots/glass_r1/day/glass_{screen,side,shade,rear,mirror,inside,moving}.png`, `shots/round1/truck_{day,dusk,night}/interior.png`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | 6 |
| 3 | Geometry | 5 |
| 4 | Scale | 7 |
| 5 | Materials | 3 |
| 6 | Texture quality | 5 |
| 7 | Glass / transparency | 3 |
| 8 | Lighting | 5 |
| 9 | Shadows | 4 |
| 10 | Reflections | 2 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | — |
| 14 | Detail density | 6 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 5 |

### Top three weaknesses

1. **No environment reflection on any pane, at any angle.**
   Frame: `shots/glass_r1/day/glass_screen.png` (also `glass_side.png`, `glass_rear.png`).
   The windscreen is seen from a front-quarter at roughly 50–60° to the surface with a bright blue sky and acacia canopy directly behind the camera, and the pane shows nothing of either. It is a clear window with a flat amber cast onto the cabin behind; the pillars and dashboard are as sharp through the glass as the hood is in front of it. Real glass at that angle would be mostly sky. `glass_side.png` (sunlit side) is the same: no sky band, no Fresnel brightening toward the edge of the pane, no highlight from the sun even though the paint next to it has a specular.
   Fix: glass material must have an environment map (the sky/scene cubemap the paint uses, or at minimum a static PMREM of the sky) with `roughness ≈ 0.05`, `metalness 0`, `ior 1.5`, and Fresnel-driven reflectivity so the pane goes from ~4% reflective head-on to near-mirror at grazing. Add a subtle horizontal gradient tint (darker top band) so the pane has a top edge. Reduce the amber transmission tint; the cabin should read grey-brown through neutral glass, not sepia.

2. **Wing mirror does not mirror.**
   Frame: `shots/glass_r1/day/glass_mirror.png`.
   The mirror housing is well modelled (bracket, amber indicator, hinge) but the glass face is a uniform light-grey/beige square with a soft dark blob. Nothing of the truck flank, road or sky behind is in it. At this camera distance (mirror fills ~8% of frame) a player will look straight at it.
   Fix: either a small render-to-texture (a 128×128 second camera behind the mirror plane, updated every third frame) or a mirrored cube-camera probe baked once per hour; failing both, at least a high-`metalness` `roughness 0.02` material with the same envmap as the paint so it shows a sky/horizon gradient rather than flat beige.

3. **Edge and thickness artefacts on every pane.**
   Frames: `shots/glass_r1/day/glass_shade.png` (hard black diagonal line across the pane), `glass_rear.png` (dark horizontal band across the rear cab glass behind the ladder), `glass_screen.png` (bright white specular streak at left of screen that stops at a hard edge rather than fading).
   These read as unsorted double-faces, a seam between two glass meshes, or a shadow of a mesh that has no visible caster. The windscreen also has no visible thickness or rubber seal depth at its edge — the glass sits flush with the paint like a decal.
   Fix: make each pane a single-sided mesh, `depthWrite false`, rendered after opaque with `side: FrontSide`; remove the interior duplicate that produces the black diagonal; add a 10–15 mm dark rubber gasket geometry around each pane, and bevel the glass edge so the highlight breaks at the edge instead of being a flat streak. Check the streak in `glass_screen.png` against the shadow camera: if it is a shadow-map edge on the pane, exclude glass from `receiveShadow`.

### Strong — do not regress
- The interior behind the glass is properly dark relative to the exterior (`glass_inside.png`, `truck_*/interior.png`); the A-pillar, dash and seat read as an enclosed cabin.
- Wiper blades, mirror bracket and snorkel are correctly ordered in front of the pane in `glass_screen.png` and `glass_mirror.png`; no sorting pop between opaque props and glass.
- The `interior.png` views at three hours show the correct brightness fall between day, dusk and night through the windscreen.

---

## 2. Hero car

Frames: `shots/round1/truck_{day,dusk,night}/{hero,front,rear,wheel,detail,interior,road,forest,mainroad,hud}.png`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 7 |
| 2 | Silhouette | 8 |
| 3 | Geometry | 6 |
| 4 | Scale | 7 |
| 5 | Materials | 6 |
| 6 | Texture quality | 6 |
| 7 | Glass / transparency | 3 |
| 8 | Lighting | 6 |
| 9 | Shadows | 4 |
| 10 | Reflections | 3 |
| 11 | Color / atmosphere | 6 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 4 |
| 14 | Detail density | 8 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 5 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 4 |

### Top three weaknesses

1. **The truck does not touch the ground.**
   Frame: `shots/round1/truck_day/hero.png` (also `truck_dusk/hero.png`, `truck_day/wheel.png`).
   Under all four tyres there is no contact shadow, no darkening of the red soil, no displaced dust or tyre print. The sun is high left, so a hard shadow should fall right of the truck, and the frame shows only a faint blur under the sill. The wheel rims and the terrain are both fully lit where they meet, so the 2.5 t vehicle looks pasted onto the ground plate. In `wheel.png` the tyre's bottom edge is a clean arc on flat colour.
   Fix: (a) add a per-wheel contact-shadow decal (soft radial gradient, ~1.4× tyre width, alpha 0.6, projected onto terrain height) that follows suspension travel; (b) ensure the vehicle is in the shadow-casting set with a shadow camera tight enough (~12 m frustum, 2048 map) to produce a visible penumbra under the sills; (c) add a dust-tint decal or darker soil ring around each tyre when stationary. Check the tyres actually intersect the terrain by 1–2 cm (currently they look tangent or above).

2. **Headlights dead at night; no beam on the road.**
   Frame: `shots/round1/truck_night/hero.png`, `truck_night/front.png`, `truck_night/road.png`.
   At night the truck is lit by a flat blue-grey ambient; the twin headlamps and the roof light bar are dark discs, and there is no pool of light in front of the bumper. Only the roof-rack amber sign panel is emissive. A safari truck at night with everything dark is the first thing a player would notice. Meanwhile the fleet vehicles at camp (see §4) *do* have their headlamps on while parked, so the priority is inverted.
   Fix: emissive material on the lamp lenses (`emissive #fff4d0`, intensity 4–6 with bloom) plus two `SpotLight`s (angle ~25°, penumbra 0.5, distance 40 m, intensity tuned so the road ahead reads warm) and a cheap additive light-cone quad for the volumetric look. Light bar: 8 small emissive squares, no spot needed. Tail lights: red emissive at `rear.png` night.

3. **Sky and horizon are a poster.**
   Frames: `shots/round1/truck_night/hero.png` (star sprites 3–5 px, blurry, uniform size and brightness; visible as soft white blobs), `truck_day/mainroad.png` (hill silhouette is a flat olive slab with no shading or detail; the pale sand ridges behind it are a repeated horizontal strip texture), `truck_dusk/hero.png` (sky gradient banding).
   Fix: stars as a single point-sprite geometry with size 1–1.5 px, brightness varied by a per-star scalar, and a Milky Way band in the sky texture; distant hills need at least a normal-based shading gradient and a haze lerp toward the sky colour by distance (`fog` colour matched to horizon), not a constant colour; the dune strip should be a proper far-terrain mesh or a randomised skyline, not a tiled billboard.

Secondary (not in top three, still fix): tyre lugs are blocky rectangular prisms in `truck_day/wheel.png`; a black rectangular slab is visible under the driver door in `truck_day/detail.png`; the dashboard texture in `interior.png` is high-frequency noise with no readable dials.

### Strong — do not regress
- Silhouette and prop dressing: roof rack with jerry cans, light bar, snorkel, winch, ladder, sand tracks, spare wheel (`hero.png`, `rear.png`) read as one coherent expedition build. This is the best asset in the game.
- Paint has a believable satin green with a Fresnel sheen and real wear at the panel edges; the hood ribs and bonnet hinges (`glass_screen.png`) are well modelled.
- Suspension and wheel geometry are sound in silhouette: the wheel arches clear the tyres, the ride height is correct for the class.
- HUD (`hud.png`) is unobtrusive and legible.

---

## 3. Campground

Frames: `shots/round1/camp_day/{camp_arrive,camp_beyond,camp_gate,camp_interior,camp_mess,camp_overhead}.png`, `shots/round1/camp_night/{camp_arrive_night,camp_fire_night,camp_gate_night,camp_mess_night}.png`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 4 |
| 2 | Silhouette | 5 |
| 3 | Geometry | 5 |
| 4 | Scale | 6 |
| 5 | Materials | 5 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 3 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 5 |
| 14 | Detail density | 6 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 3 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 6 |

### Top three weaknesses

1. **Camera inside the truck cab for the "interior" camp view.**
   Frame: `shots/round1/camp_day/camp_interior.png`.
   The shot is taken from inside the truck: the top third is the cab roof lining (a brown slab), the left third is a grey door pillar, and the camp is glimpsed through the windscreen with the wiper and the snorkel cutting across the middle. The gate sign is legible only as a smear. A camp beauty frame is occluded ~60% by the vehicle.
   Fix: this is a camera bug. Move the `camp_interior` camera outside the cab (2 m above ground, 8 m from the gate, ~35° FOV) or, if the intent is "arrive through the windscreen", dolly it forward 0.4 m so the pillars and roof are out of frame and lower the pitch 8°.

2. **The ground is a single flat colour with no shadows.**
   Frames: `shots/round1/camp_day/camp_overhead.png`, `camp_mess.png`, `camp_night/camp_fire_night.png`.
   The camp sits on a uniform red-brown plane. Tents, tables, chairs, crates and vehicles cast no shadow on it at any hour, so everything appears to hover. In `camp_gate.png` the ground near the gate is washed almost white by over-exposure; in `camp_mess.png` there is a dark rectangular mat under the mess tables that is darker than any shadow in the scene and reads as a texture patch. At night the campfire is bright but its light stops at the fire ring — chairs 2 m away are the same blue-grey as chairs 20 m away.
   Fix: put the camp props in the shadow caster set and give the camp its own shadow cascade (~40 m frustum); add trampled-dirt, tyre-rut and ash decals around the fire and tents; fix the gate over-exposure by capping terrain albedo at ~0.55 and lowering the sun-facing specular. Campfire: a `PointLight` with `distance 14 m`, `decay 2`, colour `#ff9a3c`, intensity high enough to warm the chairs and the tent fronts, plus a flicker on intensity ±10%; remove the fixed dark mat under the mess tables or turn it into a proper canvas-floor material with an edge.

3. **Layout and readability.**
   Frames: `shots/round1/camp_day/camp_arrive.png`, `camp_gate.png`, `camp_overhead.png`.
   The camp reads as a random scatter of boxes and tents rather than an organised safari lodge: no paths between tents, tents not aligned to anything, vehicles parked at arbitrary angles, and the gate sign text at `camp_gate.png` is unreadable at the intended reading distance (letters ~2 px). The skyline behind (`camp_beyond.png`) is the same flat olive hill slab as the truck frames.
   Fix: lay the camp out on a plan — a central fire ring, tents in an arc facing it, a single service road with parking bays and rope/stake lines; render the sign text into a 1024×256 texture with a 3 mm border and use `anisotropy 8`; add a footpath decal network. Give distant hills a haze/fog lerp.

### Strong — do not regress
- The variety of props (tents, tables, chairs, crates, drums, water tank, mess tent frame) is generous and correctly scaled against the vehicles.
- The campfire itself (`camp_fire_night.png`) is a good focal point: warm colour, sparks, a believable flame quad.
- The night sky over camp is dark enough to feel like night (unlike the horizon band, see cross-family).

---

## 4. Campground vehicles (fleet)

Frames: `shots/round1/fleet/*_{day,night}.png` (camper, expedition-truck, motorcycle, pickup, ranger, safari-jeep ×3, supply-truck, suv, trailer, utility).

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 3 |
| 2 | Silhouette | 6 |
| 3 | Geometry | 3 |
| 4 | Scale | 6 |
| 5 | Materials | 5 |
| 6 | Texture quality | 5 |
| 7 | Glass / transparency | 3 |
| 8 | Lighting | 5 |
| 9 | Shadows | 3 |
| 10 | Reflections | 3 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 3 |
| 14 | Detail density | 6 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 3 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 6 |

### Top three weaknesses

1. **The trailer is broken geometry.**
   Frame: `shots/round1/fleet/trailer_0_day.png` (and `_night`).
   The trailer body is pitched nose-down ~20°, its drawbar runs off to the left and ends in the air with nothing attached, a spare wheel sits at the left edge of frame separated from the body, a jerry can floats in front of the trailer with its base above the ground, and the trailer's own wheel is buried to the hub. A second wheel at right edge belongs to no visible vehicle. This is the single worst frame in the whole set.
   Fix: assemble the trailer as one rigid hierarchy — body, A-frame drawbar, axle, two wheels, jockey wheel — and place it with a ground-probe at the axle and at the jockey wheel so it sits level; hitch it to a vehicle or drop the drawbar onto a jockey stand; parent the jerry can to the body; check the ground raycast uses the wheel radius, not the body origin.

2. **Cameras aimed into other vehicles.**
   Frames: `shots/round1/fleet/safari-jeep_0_day.png`, `supply-truck_0_day.png` (and their nights).
   The safari-jeep frame is dominated by the roof and bull-bar of a foreground vehicle; the supply-truck frame is taken from on top of another vehicle's roof with the subject partly hidden. `camper_0_day.png` has a large dark blur in the foreground that is an out-of-focus part of another vehicle.
   Fix: the fleet-shot camera should raycast from camera to subject bounding-box centre and, if another vehicle is hit, orbit ±30° until clear; alternatively render each fleet vehicle isolated on the camp ground with the others hidden.

3. **Wheels sunken or missing; headlights on while parked.**
   Frames: `shots/round1/fleet/pickup_0_day.png` (all four tyres sunk ~⅓ into the soil), `suv_0_day.png` (front wheel arch is open — the tyre is missing or offset so the arch shows through), `motorcycle_0_day.png` (front wheel is a fuzzy disc; headlamp is a blown white bloom in full daylight), all `*_night.png` (parked, unattended vehicles have headlamps on; the hero truck's are off).
   Fix: per-wheel ground probe with tyre radius offset; check the SUV wheel transform / instancing index; motorcycle wheel needs a real rim and tyre mesh with spokes, and its lamp emissive should be gated by hour; fleet headlamps off (or a single dim parking-light emissive) at night; give the hero truck the beams instead.

### Strong — do not regress
- Ten distinct vehicle types with recognisable silhouettes (camper cab-over, expedition truck with box body, ranger with roll cage, safari jeep with open top) — the variety sells a working lodge.
- Paint and decal work on the expedition truck and ranger is at hero-truck standard.

---

## 5. Road and terrain

Frames: `shots/round1/truck_*/{road,mainroad,forest}.png`, `shots/round1/camp_day/{camp_arrive,camp_beyond,camp_gate}.png`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | — |
| 3 | Geometry | 5 |
| 4 | Scale | 7 |
| 5 | Materials | 5 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 6 |
| 9 | Shadows | 3 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | 6 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 5 |
| 14 | Detail density | 5 |
| 15 | Environmental integration | 5 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 4 |

### Top three weaknesses

1. **Visible tiling on the terrain and identical grey rock sprites.**
   Frames: `shots/round1/truck_day/hero.png`, `truck_day/road.png`, `truck_day/mainroad.png`.
   The red soil is a single high-frequency crack/noise texture repeated at ~2 m period — the repeat is obvious across the foreground of `hero.png`. Scattered on it are dozens of small grey "rocks" that are all the same flat grey blob (identical size, identical colour, no shading, no shadow), like a stipple brush. In `mainroad.png` the ruts are two straight lighter stripes with no depth.
   Fix: two-octave albedo blend (macro 30 m tile + detail 2 m tile) with a slope/height mask; rocks as 3–4 actual low-poly meshes with a normal map, random scale 0.15–0.6 m, random yaw, receiving shadow and with a small contact decal; ruts as a displaced/normal-mapped road spline with darker compacted centre and lighter ridges.

2. **Distant terrain is flat slabs and repeated strips.**
   Frames: `shots/round1/truck_day/mainroad.png`, `camp_day/camp_beyond.png`, `lions_walk/walk_00.png`.
   Beyond ~200 m the world becomes: a flat olive hill silhouette with no shading, and behind it a pale horizontal band of "dunes" that looks like a repeated strip, sometimes reading as snow or a white wall. The transition between the near terrain and the far slab is a hard line.
   Fix: far terrain as a real low-res heightmesh (or 3–4 LOD rings) that shares the near terrain's albedo and receives fog; haze lerp toward horizon colour with distance; remove the dune-strip billboard or give it noise-based variation and a matching haze.

3. **No shadows on the ground.**
   Frames: `shots/round1/truck_day/forest.png`, `camp_day/camp_arrive.png`.
   Trees, shrubs, signs and the truck itself put no shadow on the terrain in daylight. The `forest.png` view under a canopy is evenly lit like open ground. This robs the terrain of all form.
   Fix: cascaded shadow maps with the terrain receiving; trees in the caster set (billboard trees can use a simple projected blob decal); check that the terrain material has `receiveShadow` and a normal map so the sun actually shades slopes.

### Strong — do not regress
- The red-earth palette against green truck and gold grass is a good Kalahari colour key (`mainroad.png` is the best terrain frame).
- Road signage (`mainroad.png`: speed limit, chevron, marker post) is correctly sized and placed on the verge.
- Rut alignment follows the road spline correctly; the road width relative to the truck is right.

---

## 6. Vegetation

Frames: `shots/round1/truck_*/{forest,mainroad}.png`, `camp_day/camp_beyond.png`, `lions_day/{lion_far,lion_pride}.png`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | 6 |
| 3 | Geometry | 4 |
| 4 | Scale | 6 |
| 5 | Materials | 5 |
| 6 | Texture quality | 5 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 3 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | 6 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 5 |
| 14 | Detail density | 6 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 5 |

### Top three weaknesses

1. **Grass is a field of identical crossed cards.**
   Frames: `shots/round1/lions_day/lion_far.png`, `lions_day/lion_close.png`, `truck_day/mainroad.png`.
   Every grass clump is the same two-card cross with the same yellow-green gradient, planted at the same size on a regular scatter; from the lion camera the clumps stand up as sharp-edged paper cut-outs with a visible dark base line where they meet the ground. There is no colour variation by dryness, no lean, no clumping into drifts, and the clumps do not fade into the terrain colour at the base.
   Fix: 3–4 clump variants (tall dry, short green, seed-head, tussock) with per-instance random scale 0.6–1.4, random hue ±8°, a wind-lean vertex offset, and a base alpha gradient plus a terrain-colour tint at the bottom 20% of each card. Cluster with a noise mask instead of uniform scatter; add a sparse ground-cover texture so bare soil between clumps is not perfectly clean.

2. **Trees are flat and do not shade.**
   Frames: `shots/round1/truck_day/forest.png`, `camp_day/camp_beyond.png`.
   Acacias are readable in silhouette but their canopies are flat green with no light/dark side, no self-shadow and no ground shadow; the trunks are uniform grey cylinders. In `forest.png` the canopy occludes the top of frame but the ground under it is fully lit. In the lion frames a canopy at top-left covers 15% of the frame as a blurry dark mass.
   Fix: canopy material with translucency (backlit greens) and a normal-based light/dark split; trees in the shadow-caster set; trunk texture with bark and a darker wet base; move or thin the tree that intrudes into the lion cameras.

3. **Grass and shrub billboards do not sit on the slope.**
   Frames: `shots/round1/lions_walk/walk_00.png`, `lions_day/lion_pride.png`.
   Clumps on the bank around the water are vertical regardless of slope and several show a gap between the card base and the ground; some intersect the water edge.
   Fix: orient each instance to the terrain normal (or at least tilt to 50% of slope), push the base 5 cm into the ground, and exclude a 1 m ring around water bodies from the scatter.

### Strong — do not regress
- Tree density and spacing in `forest.png` gives a believable acacia woodland; the road corridor through it is well framed.
- Colour mix of gold grass against red soil is right for the biome.

---

## 7. Lions

Frames: `shots/round1/lions_day/{lion_close,lion_face,lion_far,lion_medium,lion_pride,lion_seat,lion_side}.png`, `shots/round1/lions_dusk/{lion_close_dusk,lion_medium_dusk,lion_pride_dusk}.png`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | 3 |
| 3 | Geometry | 3 |
| 4 | Scale | 5 |
| 5 | Materials | 4 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 3 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | 3 |
| 13 | Physics / ground contact | 4 |
| 14 | Detail density | 4 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 3 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 5 |

### Top three weaknesses

1. **The lion does not read as a lion.**
   Frames: `shots/round1/lions_day/lion_close.png`, `lion_face.png`.
   The head is a rounded bear/dog skull: round ears set high, a small black button nose, large forward-facing orange eyes, white cheek patches and an angular white lower jaw; there is no muzzle bridge, no brow ridge, no whisker pads, no mane or ruff on any animal. The body is barrel-shaped with short thick legs when lying, and stretched horse-like (long neck, straight back, stick legs) when standing (`lion_side.png`). The animal behind the lion in `lion_close.png` has a spotted coat and a sloped back and reads as a hyena, not a lioness or cub.
   Fix: rebuild the head from lion reference — broad flat skull, ears low and rounded but small relative to head, long muzzle with a wide nose leather, eyes amber but smaller and set under a brow, dark lip line; give males a mane mesh (hair cards) and lionesses a light ruff; body with a visible shoulder blade, a sagging belly line and a heavy tail tuft. Texture: tawny with darker back and lighter belly, no white cheek patches, spots only on cubs.

2. **Rigid, stiff pose and no ground shadow.**
   Frames: `shots/round1/lions_day/lion_medium.png`, `lion_pride.png`, `lions_dusk/lion_pride_dusk.png`.
   Every lion in the pride is in one of two poses (sphinx-lie or straight stand) with no weight shift, no head turn, no tail motion and no ear motion. No lion casts a shadow, so they sit on top of the grass field rather than in it. The pride in `lion_pride.png` is a row of the same model at the same scale.
   Fix: idle animation set (breathe, head turn, ear flick, tail swish, lie-to-sit) blended per animal with random phase; per-animal scale 0.85–1.15 and cub scale 0.4–0.5; lions in the shadow-caster set plus a contact-shadow decal under the body; ground-flatten the grass under each lying lion.

3. **Water pool is a flat grey disc; horizon behind is layered wrongly.**
   Frames: `shots/round1/lions_day/lion_far.png`, `lions_walk/walk_00.png`, `lions_dusk/lion_pride_dusk.png` (white blob clipping into the left edge).
   The waterhole is a flat matte grey-blue ellipse with a hard shore edge and no reflection of the sky or the lions. Behind it a sharp navy ridge sits over a bright pale-cream strip (the same dune billboard as everywhere) and then a flat blue sky, so the scene looks like three stacked posters. At dusk a white shape intrudes at frame left.
   Fix: water as a planar reflector (or at least `roughness 0.05` + sky envmap + Fresnel) with a shore darkening decal and a wet-sand band; fix the far-terrain/dune strip (see Road & Terrain); find and remove the white blob (a terrain patch or a scatter instance at the wrong height).

### Strong — do not regress
- Fur shading has a decent soft rim and a warm tawny base colour at medium distance (`lion_medium_dusk.png` is the best lion frame).
- Camera placement for `lion_seat.png` (from the driver's seat) is a good player-view moment; keep it.

---

## 8. Lion feet / ground contact

Frames: `shots/round1/lions_walk/walk_00.png` … `walk_07.png`, `lions_walk/{lion_close,lion_far,lion_medium,lion_seat}.png`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 5 |
| 2 | Silhouette | 3 |
| 3 | Geometry | 3 |
| 4 | Scale | 5 |
| 5 | Materials | 4 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 2 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | 2 |
| 13 | Physics / ground contact | 3 |
| 14 | Detail density | 4 |
| 15 | Environmental integration | 3 |
| 16 | Visual cleanliness | 3 |
| 17 | Temporal stability | 4 |
| 18 | Browser performance | 5 |

### Top three weaknesses

1. **Legs are jointless poles; hind legs cross into an X.**
   Frames: `shots/round1/lions_walk/walk_04.png`, `walk_02.png`, `walk_06.png`.
   Each leg is a tapered stick with no visible elbow, wrist, stifle or hock; the paw is the same diameter as the leg with no pad. In `walk_04.png` the two hind legs cross each other and the near foreleg is fully extended forward while the far hind leg trails straight back, a pose no quadruped hits. Across the strip the legs swing from the hip/shoulder like pendulums.
   Fix: rig with proper limb chains (shoulder–elbow–wrist–paw, hip–stifle–hock–paw) and a lateral-sequence walk cycle from reference (LF, RH, RF, LH at ~0.25 phase offsets); add IK foot placement with the paw flat on the terrain during stance; paw geometry ~1.6× leg diameter with four toe lumps; forbid hind-leg crossing by clamping hip abduction.

2. **Feet float and slide; the lion barely travels.**
   Frames: `shots/round1/lions_walk/walk_00.png` → `walk_07.png`.
   Over eight frames the lion's body moves only ~40 px (≈0.5 m) while the legs complete more than a full cycle, so stance feet slide backwards over the ground. The paws are never visibly on the ground plane: the near feet show a 2–4 px gap of lit soil beneath them and there is no contact shadow at all, so the whole animal appears to hover. The cub behind (walk_03–walk_06) walks through the adult's hind legs.
   Fix: lock the root motion to the stride length (body speed = stride × cadence) so stance feet have zero ground velocity; raycast each paw to terrain and pin it during stance; add a soft blob shadow under each paw and a body contact shadow; separation steering for the cub (min 0.8 m from the adult's bounding capsule).

3. **Temporal artefacts in the strip.**
   Frames: `shots/round1/lions_walk/walk_01.png` (stray saturated red pixel on the flank), `walk_05.png`/`walk_06.png` (extra animal shapes pop in at frame right that were not present in `walk_00`), the grass field in the background changes card orientation between frames.
   Fix: check for an un-initialised vertex colour / NaN normal producing the red pixel; freeze secondary animals during the strip or increase their pop-in distance so they do not appear mid-strip; grass card billboarding should be camera-facing with a fixed yaw, not re-oriented per frame.

### Strong — do not regress
- The camera is genuinely fixed across the strip (background is pixel-stable except for the noted pop-ins), which makes the strip usable as a diagnostic.
- Overall walk cadence (about one stride per 3–4 frames) is in the right range; only the root translation is wrong.

---

## 9. Lighting and atmosphere

Frames: all, compared across `truck_day/dusk/night`, `camp_day/night`, `fleet *_day/night`, `lions_day/dusk`.

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | — |
| 3 | Geometry | — |
| 4 | Scale | — |
| 5 | Materials | 5 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 3 |
| 10 | Reflections | 3 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | — |
| 14 | Detail density | — |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **Night is a blue-grey ambient wash with a bright horizon.**
   Frames: `shots/round1/truck_night/hero.png`, `camp_night/camp_arrive_night.png`, `fleet/*_night.png`.
   Every night frame has the same flat desaturated blue-grey fill from all directions: no moon direction, no dark side to any object, and no shadows. The horizon band behind the camp and the truck is brighter than the sky above it and brighter than a moonless night should allow, so the silhouetted hills float on a luminous strip. Stars are large soft blobs of one brightness.
   Fix: a single directional moon (`#9db4ff`, low intensity, ~35° elevation) with shadows, plus a very dark hemispheric ambient (sky `#0a1226`, ground `#000`); horizon gradient darker than the zenith glow, or at least no brighter than 30% of the campfire; star field as 1 px point sprites with brightness variance.

2. **No sun shadows in daylight, anywhere.**
   Frames: `shots/round1/truck_day/hero.png`, `camp_day/camp_overhead.png`, `lions_day/lion_pride.png`.
   With a high sun and a clear sky there are no cast shadows from truck, trees, tents or lions. This is the single largest reason the scenes look like a diorama rather than a place.
   Fix: enable cascaded shadow maps (3 cascades, 2048, `PCFSoft`, bias tuned per cascade), all opaque geometry casting, terrain receiving; verify the sun direction in the shadow pass matches the specular direction visible on the paint.

3. **Dusk is a colour shift, not a light change.**
   Frames: `shots/round1/truck_dusk/hero.png`, `lions_dusk/lion_medium_dusk.png`, `truck_dusk/mainroad.png`.
   Dusk is achieved by tinting everything orange-magenta while the light stays as directionless as midday: no long shadows, no rim light from a low sun, no cooler sky-fill on the shadow side, and the sky gradient shows visible banding steps.
   Fix: drive sun elevation to 4–8° at dusk so shadows stretch, add a warm key from the sun side and a cool `HemisphereLight` fill; dither the sky gradient (or use a 16-bit gradient texture) to remove banding; add distance haze that picks up the sunset colour.

### Strong — do not regress
- Daytime colour key is coherent and attractive across families (red soil, gold grass, blue sky, green truck).
- The campfire and the truck's amber sign panel are correctly the brightest things in their night frames — the exposure hierarchy is right even if the fill is wrong.
- Day-to-night brightness falls in the correct direction inside the cab (`interior.png` at three hours).

---

## 10. Browser performance

Sources: `perf/2026-09-04T12-46-27-505Z-ad7ef04+.json` (label `integrated-r1`, SwiftShader, `quality=fast`), `shots/round1/truck_*/stats.json`, `shots/glass_r1/day/stats.json`. FPS ignored (software rasteriser).

| # | Category | Score |
|---|----------|-------|
| 1–17 | (picture categories) | — |
| 18 | Browser performance | 4 |

Key numbers (integrated-r1): `readyMs` 43 031 (bootWall 43 035); boot stages — Compiling shaders 24 298 ms, Grading the road 5 467 ms, Assembling the truck 3 991 ms, Finding the pride 3 124 ms, Planting the forest 3 033 ms, Pitching camp 1 743 ms, Parking the fleet 565 ms; drive — calls 453, triangles 2 570 014, programs 277, textures 275, geometries 319, visibleObjects 254, visibleInstances 26 852, jsHeapMB 333.8, longFrames 2. Truck beauty views: 2.15–2.85 M triangles, 370–512 calls, 283–285 programs. Compared with the earlier `baseline-swiftshader` run of the same day: programs 96 → 277, heap 224 → 334 MB, ready 19.5 s → 43 s.

### Top three weaknesses

1. **277–285 shader programs and a 24 s shader-compile stage.**
   Source: `integrated-r1` boot `Compiling shaders` 24 298 ms; `truck_day/stats.json` programs 283.
   Nearly three hundred distinct programs for one scene means almost every material variant is compiling its own shader (per-vehicle paint colours, per-prop material tweaks, per-light-count permutations). The earlier baseline had 96. Even on hardware GPUs this is a multi-second first-frame stall and a hitch when each new variant enters view.
   Fix: share `MeshStandardMaterial` instances across the fleet and props and drive colour through instance attributes / `onBeforeCompile` uniforms instead of new materials; ensure every material has the same shadow/fog/light-count defines; use `renderer.compileAsync` behind the loading screen for the remainder. Target ≤ 60 programs.

2. **2.2–2.8 M triangles per frame with 26 852 visible instances and no evident LOD.**
   Source: `truck_day/stats.json` (`mainroad` 2.8 M, `hero` 2.15 M); perf `triangles` 2 570 014, `visibleInstances` 26 852.
   The triangle budget is dominated by vegetation and rock instances that the frames show as tiny 2–10 px sprites — thousands of clumps that could be a single card are full meshes. Draw calls (~450) are acceptable, triangles are not for a browser title on integrated GPUs.
   Fix: two LOD tiers on grass/rock/tree instancing (full mesh < 40 m, 2-card cross 40–150 m, cull beyond) with distance-based density falloff; merge the truck's small hardware (bolts, rivets, cable ties) into one geometry; target ≤ 900 k triangles in beauty views.

3. **43 s boot and 334 MB heap.**
   Source: `readyMs` 43 031; `jsHeapMB` 333.8 (baseline run 224 MB); `Grading the road` 5.5 s, `Assembling the truck` 4.0 s, `Finding the pride` 3.1 s, `Planting the forest` 3.0 s.
   Excluding shader compile there is still 18 s of main-thread CPU work in generation stages that block the loading screen, and the heap grew by 110 MB with the camp/fleet/pride integration. Textures at 275 also suggests many un-atlased small maps.
   Fix: move road grading and forest planting into a Web Worker with transferable buffers; cache generated road/forest geometry in IndexedDB keyed by seed; atlas the prop and vehicle textures (target ≤ 80 textures); dispose of intermediate noise buffers after generation; profile `Finding the pride` — 3 s for a handful of animals indicates per-animal skeleton cloning or texture re-decoding.

### Strong — do not regress
- Draw calls (370–512) are in a sane band for the scene complexity.
- Only 2 long frames during the drive segment; heap growth over loops was flat (0.2 MB) on the earlier run — no leak signature.
- No console errors in the perf run (only Canvas2D `willReadFrequently` warnings).

---

## Cross-family defects

1. **No cast shadows anywhere in daylight.** Truck (`truck_day/hero.png`), camp (`camp_day/camp_overhead.png`), fleet (`fleet/pickup_0_day.png`), lions (`lions_day/lion_pride.png`), trees (`truck_day/forest.png`). One shadow-map fix lifts categories 9, 13 and 15 in every family at once. This is the highest-leverage change in the whole inventory.

2. **The horizon/far-terrain poster.** A flat olive (day) or navy (dusk/night) hill silhouette with zero shading, sitting on a bright pale "dune" strip that is visibly a repeated horizontal texture, then a flat sky. Visible in `truck_day/mainroad.png`, `camp_day/camp_beyond.png`, `lions_walk/walk_00.png`, `lions_day/lion_far.png`, `camp_night/camp_arrive_night.png`, `fleet/trailer_0_day.png`. At night the strip is brighter than the sky. Replace with a shaded far-terrain mesh plus distance haze.

3. **Identical grey rock stipple and terrain tiling.** The same flat grey rock sprite at the same size appears in truck, camp, fleet and lion frames on the same ~2 m-period red-soil tile.

4. **Emissive/hour gating is inverted.** Fleet vehicles have headlamps on while parked at night; the hero truck's are off; the motorcycle's headlamp is blown out at midday. One hour-gated emissive rule needs to apply to all vehicle lamps.

5. **Ground contact of all placed objects.** Tyres tangent to or floating above terrain (hero truck, camper), tyres sunk (pickup, trailer), jerry cans floating (trailer), lion paws floating (walk strip), grass cards gapped on slopes. A single "probe terrain at contact points, offset by contact radius" placement routine is missing.

6. **Night ambient.** The same flat blue-grey fill on the truck, the camp, the fleet and the lions. No moon direction, no shadows, luminous horizon.

7. **Glass.** Every pane on every vehicle (hero windscreen, fleet windows, mirror) is reflectionless and amber-tinted; the fleet inherits the hero truck's glass problem.

8. **Camera bugs in the shot tooling.** `camp_day/camp_interior.png`, `fleet/safari-jeep_0_day.png`, `fleet/supply-truck_0_day.png`, `fleet/camper_0_day.png` are occluded by the vehicle the camera is in or near. Not an art problem but they poison the frame set and must be fixed before round 2 (silhouette / composition) can be scored honestly.

## Overall verdict

It does not yet read as one polished high-end safari game. It reads as a very good hero vehicle placed in a diorama: the truck's dressing, paint and silhouette are at shippable quality, but the moment the eye leaves the truck it finds a shadowless world, a poster horizon, tiled soil with stamped grey pebbles, glass that reflects nothing, a campground that hovers, a trailer that has fallen apart, and lions that are stiff bear-dogs on jointless legs sliding over the ground. The single weakest area is the lions — both the model (silhouette, head, coat) and the locomotion (jointless legs, no root motion, floating paws) are below what a player would accept for the animal the game is named for — but the single most valuable fix is global: turn on real cast shadows and contact shadows, because that one change moves shadows, ground contact and integration in all ten families at once, and until it lands nothing here can score above a 6 on integration.
