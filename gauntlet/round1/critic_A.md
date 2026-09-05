# Critic A — Round 1: baseline and defect inventory

Scope: every frame under `shots/round1/**`, `shots/glass_r1/day/**`, the `stats.json` files and `perf/2026-09-04T12-46-27-505Z-ad7ef04+.json` (label `integrated-r1`, build `ad7ef04+`). Judged blind, from the pixels only. Scale per `RUBRIC.md`: 7 = a player would not complain, 9–10 = marketing screenshot. Each family is floored by its weakest frame.

Category order in every table: Composition, Silhouette, Geometry, Scale, Materials, Texture quality, Glass / transparency, Lighting, Shadows, Reflections, Color / atmosphere, Animation, Physics / ground contact, Detail density, Environmental integration, Visual cleanliness, Temporal stability, Browser performance.

---

## 1. Car glass

| Category | Score |
|---|---|
| Composition | 6 |
| Silhouette | 6 |
| Geometry | 6 |
| Scale | 7 |
| Materials | 4 |
| Texture quality | 4 |
| Glass / transparency | 4 |
| Lighting | 5 |
| Shadows | 5 |
| Reflections | 2 |
| Color / atmosphere | 5 |
| Animation | — |
| Physics / ground contact | — |
| Detail density | 6 |
| Environmental integration | 5 |
| Visual cleanliness | 5 |
| Temporal stability | — |
| Browser performance | 6 |

**Top three weaknesses**

1. `shots/glass_r1/day/glass_screen.png` — **no environment reflection on the windscreen.** The camera is at roughly 50–60° to the glass in full sun, the windscreen shows the interior (seats, roll bar, a dashboard block) at near 100% clarity with a flat, uniform warm-amber cast, and not one pixel of the sky, the light bar or the acacia behind the camera is mirrored in it. Fresnel at that angle should put the sky at ~20–30% over the whole pane. The only "highlight" is the white smear on the snorkel at right, which is the metal, not the glass. Fix: give the windscreen a dedicated glass material with `transmission ≈ 0.9`, `roughness ≤ 0.05`, `ior 1.5`, `envMapIntensity ≥ 1` against a real sky/scene env map (PMREM of the sky dome at minimum), Fresnel-driven reflection so edge-on views go mirror-like. Add a faint dust/streak map (0.05–0.1 roughness variation) so the glass has a surface at all.
2. `shots/glass_r1/day/glass_mirror.png` — **the wing mirror is not a mirror.** The mirror face is a flat, matte, orange-brown rectangle with a slightly darker top half; it reflects nothing (no road, no truck flank, no sky). It reads as a painted panel. Also the amber indicator lens beside it is a uniform emissive orange square with no lens facets or bezel. Fix: render the mirror face with a `CubeCamera`/planar reflection or at minimum `metalness 1, roughness 0` with the scene env map and a 1.5% bevel so the edge catches a highlight; add a Fresnel rim on the lens with a 3–4 mm dark bezel.
3. `shots/glass_r1/day/glass_side.png` and `glass_inside.png` — **the side glass is an amber tint with a dust texture painted onto it, and the A-pillar/glass boundary is a hard black band.** In `glass_side.png` the whole pane is one flat tan wash through which the seats are visible; there is a visible seam where the two side panes meet with no rubber or frame depth, and no sky reflection despite the sun being on this side. In `glass_inside.png` the bottom edge of the windscreen is a 12-px-tall solid black band running the full width — no dashboard top surface, no defroster vent, just a void. Fix: separate tint (pane colour, ≈ 15% grey-green) from dust (a decal on a second surface or an alpha-tested dirt map concentrated at the edges/wiper arcs); model a 20 mm rubber gasket and a dashboard cowl mesh under the glass so the interior/exterior join is a surface, not a black gap.

**Strong / must not regress**
- Glass is actually transmissive: seats, roll bar, head-rests are legible through the side glass (`glass_side.png`) — many games fake this with opaque tint.
- The rear/cargo cage and rack ladder read correctly behind the rear glass (`glass_rear.png`); the sun-shaded vs sun-lit sides differ in value (`glass_shade.png` vs `glass_side.png`), so at least a side-dependent tint exists.
- Interior view (`glass_inside.png`) has a plausible cluster of gauges and a working speedometer readout — keep the cockpit content.

---

## 2. Hero car

| Category | Score |
|---|---|
| Composition | 7 |
| Silhouette | 8 |
| Geometry | 6 |
| Scale | 7 |
| Materials | 6 |
| Texture quality | 5 |
| Glass / transparency | 4 |
| Lighting | 6 |
| Shadows | 5 |
| Reflections | 3 |
| Color / atmosphere | 7 |
| Animation | — |
| Physics / ground contact | 5 |
| Detail density | 8 |
| Environmental integration | 6 |
| Visual cleanliness | 5 |
| Temporal stability | — |
| Browser performance | 5 |

**Top three weaknesses**

1. `shots/round1/truck_day/wheel.png`, `truck_dusk/road.png`, `truck_night/road.png` — **tyres are blocky and the wheels hover.** The tread is a ring of hard-edged rectangular lugs with no sidewall bulge, no rounded shoulder and no contact flattening; at the low road angle in `truck_dusk/road.png` the front tyre's bottom edge is a straight horizontal line sitting on the dirt with a visible sliver of light beneath it, and no contact shadow or dirt displacement around the footprint. Fix: a proper tyre profile (torus-like cross-section with a 30–40 mm shoulder radius), 3–5% squash at the contact patch, a dark projected contact blob (soft ellipse, ~0.6 alpha, 1.3× tyre width) under each wheel, and mud/dust smear decals on the lower sidewall.
2. `shots/round1/truck_day/interior.png`, `truck_dusk/interior.png`, `truck_night/interior.png` — **the cockpit is one texture.** Steering wheel rim, wheel spokes, dash top, door card, seats and the gauge bezels all share the same cream "crackle/leather" pattern at the same scale, so there is no material hierarchy at all; at night (`truck_night/interior.png`) the gauge faces are uniform yellow emissive discs with no needle glow gradient and no dash reflection on the inside of the glass. The wing-mirror stalk crosses the windscreen at an odd angle top-left and the interior rear-view mirror shows the same flat tan as the wing mirror. Fix: at least four materials — black soft-touch rubber for the wheel rim (`roughness 0.7`), brushed dark metal for spokes, matte painted metal dash, cloth/leather seats with a fabric normal map; back-lit gauges with a radial gradient emissive and an inner bezel; give the inside of the windscreen a faint dashboard reflection at night.
3. `shots/round1/truck_day/hud.png`, `truck_night/hud.png` — **HUD text collides.** Bottom key-strip: "N TIME" and "C LAUNCH" overprint "L LIGHTCAM"/"C CAMERA" into "CLAUNCHTAM" — the strings physically overlap. The speed readout ("47 km/h") sits over the truck's tail lights so the number fights the brightest pixels on screen. Also the whole page frame at night is much darker than the offscreen render, so the HUD is the only readable thing. Fix: fixed-width key chips (or `flex` with `gap`) and drop the extra "LAUNCH" entry into a second row; give the speed block a 40% black gradient plate and pin it 24 px from the corner; letter-space the title less (the 0.35 em tracking on "RIDGELINE TRAIL" is fashionable but collides with the readable-at-a-glance job).

Also noted: `truck_day/hero.png` — the body panel paint is perfectly uniform green with zero clear-coat highlight or environment reflection (Reflections 3); `truck_*/rear.png` — the roof-rack cargo (jerry cans, boxes) has no shadow onto the roof; the spare wheel floats ~10 cm proud of the tailgate with no bracket visible.

**Strong / must not regress**
- Silhouette and kit: the snorkel, light bar, roof rack, sand ladders, winch, bull bar and spare all read instantly as an expedition Defender-class truck (`truck_day/hero.png`, `truck_dusk/hero.png`). This is the best asset in the game.
- Dusk hero (`truck_dusk/hero.png`) — warm rim light on the rack rails and the amber spot lamps make a genuinely attractive frame.
- Night headlight pool on the road (`truck_night/mainroad.png`) is well shaped: two lobes, correct falloff, catches the road signs.
- Detail density on the front (`truck_*/front.png`) — mesh grille, lamp guards, hooks, number plate — is high and consistent.

---

## 3. Campground

| Category | Score |
|---|---|
| Composition | 6 |
| Silhouette | 6 |
| Geometry | 5 |
| Scale | 6 |
| Materials | 5 |
| Texture quality | 4 |
| Glass / transparency | — |
| Lighting | 5 |
| Shadows | 4 |
| Reflections | — |
| Color / atmosphere | 6 |
| Animation | 3 |
| Physics / ground contact | 5 |
| Detail density | 6 |
| Environmental integration | 4 |
| Visual cleanliness | 5 |
| Temporal stability | — |
| Browser performance | 6 |

**Top three weaknesses**

1. `shots/round1/camp_day/camp_overhead.png` — **the camp is a bald rectangle stamped on the savannah.** From above, the compound is a hard-edged orange trapezoid with a perfectly straight lower boundary and a pale sand "sidewalk" strip along its road side; vegetation stops dead at the edge, the parked fleet is a single row of identical rectangles evenly spaced along the fence, and the tents are flat coloured quads with no shadows at all under a high sun. Fix: break the compound boundary with a 3–6 m noise-displaced blend zone where grass density ramps from 100% to 0% and the ground albedo mixes; scatter tyre ruts, a firewood pile, and randomise vehicle yaw ±12° and spacing; enable cast shadows on tents and vehicles (the overhead shows none).
2. `shots/round1/camp_night/camp_fire_night.png` — **the campfire is a blown-out orange disc.** The fire is a single saturated blob with no flame shape, no embers/sparks, no smoke column, and its light reaches barely 3 m: the chairs around it are lit, the mess tent 10 m behind is uniformly dark, and there is no flicker gradient on the ground. The rest of the compound is lit by a flat blue ambient with the horizon a hard dark cut-out against a lighter sky band. Fix: 3–4 layered flame sprites with additive blending and a 4–8 Hz noise-driven intensity, a point light of ~10 m range with a 0.9 falloff and a 1–2 Hz jitter, a sparse particle ember stream and a smoke sprite drift; give the mess tent and nearby vehicles a warm bounce from the fire and a cool fill from the sky.
3. `shots/round1/camp_day/camp_interior.png`, `camp_mess.png` — **props are untextured primitives with no self-shadow.** Tables are flat boxes, chairs are stick frames with a single-colour seat, crates are uniform brown cubes, and the tent canvas is one flat colour with no wrinkle normal, no seam, no sag between poles. Nothing casts a shadow on the tent floor. Fix: a canvas fabric normal/roughness map with pole-to-pole catenary sag, AO baked into props, a wood grain albedo with edge wear on tables/crates, and a shadow-casting light so the tent interior has depth.

**Strong / must not regress**
- Layout logic is readable: gate, mess tent, sleeping tents, vehicle line, fire ring (`camp_arrive.png`, `camp_overhead.png`).
- Night camp string lights / lantern glow (`camp_arrive_night.png`, `camp_gate_night.png`) give warm anchor points in the frame.
- The entry gate sign and post structure (`camp_gate.png`) is a good landmark silhouette.

---

## 4. Campground vehicles (fleet)

| Category | Score |
|---|---|
| Composition | 6 |
| Silhouette | 6 |
| Geometry | 4 |
| Scale | 5 |
| Materials | 5 |
| Texture quality | 4 |
| Glass / transparency | 4 |
| Lighting | 5 |
| Shadows | 5 |
| Reflections | 3 |
| Color / atmosphere | 6 |
| Animation | — |
| Physics / ground contact | 3 |
| Detail density | 5 |
| Environmental integration | 4 |
| Visual cleanliness | 4 |
| Temporal stability | — |
| Browser performance | 6 |

**Top three weaknesses**

1. `shots/round1/fleet/trailer_0_day.png` — **the trailer is broken.** Its body sits pitched ~15° nose-down with the tow-bar plunging into the ground, the single visible wheel is detached from the axle line and hovering, a jerry can sits at the hitch on nothing, and a second wheel from an adjacent vehicle intrudes at the right edge. This is the worst frame in the family and floors it. Fix: reset the trailer's rest pose to the ground plane (raycast both wheels and the jockey wheel/hitch to terrain), attach the wheels to the axle transform, park the jerry can on the drawbar tray.
2. `shots/round1/fleet/motorcycle_0_day.png` — **the motorcycle is a headlight with a bike attached.** The headlight is a full-white bloomed disc at midday that reads brighter than the sky, the front wheel is a stepped low-poly ring, and the bike stands perfectly vertical with no side stand, casting a shadow that does not match the wheel positions. The panniers are plain grey boxes. Fix: daytime headlight emissive ≤ 0.1 (or off), 32+ segment wheels, a lean of 8–10° onto a modelled side stand, and a contact shadow under each tyre.
3. `shots/round1/fleet/camper_0_night.png`, `supply-truck_0_night.png`, `safari-jeep_*_night.png` — **night fleet is lit like day, only darker.** Every vehicle at night is a uniform dim blue-grey silhouette: no cabin light, no reflector catch, no headlight/taillight emissive, no camp-light warm side vs sky-blue side. The same wheel-floating and glass problems from day persist (the jeep windscreens are opaque grey planes). Fix: give each fleet vehicle a night material variant with emissive tail/marker lights (~0.3), a warm point light from the nearest camp lantern, and a real glass material shared with the hero truck.

Also noted: all fleet tyres are the same blocky tread as the hero; `pickup_0_day.png`, `suv_0_day.png` have wheels not touching the ground by several cm; `ranger_0_day.png` cab glass is an opaque lighter panel; `safari-jeep_0/1/2` are palette swaps with identical pose.

**Strong / must not regress**
- Variety of vehicle classes (camper, expedition truck, motorcycle, pickup, ranger, three jeeps, supply truck, SUV, trailer, utility) — the fleet makes the camp read as an operation, not a car park.
- `expedition-truck_0_day.png` is the best of the set: proportions and rack detail match the hero's language.

---

## 5. Road and terrain

| Category | Score |
|---|---|
| Composition | 7 |
| Silhouette | 6 |
| Geometry | 5 |
| Scale | 6 |
| Materials | 6 |
| Texture quality | 5 |
| Glass / transparency | — |
| Lighting | 6 |
| Shadows | 5 |
| Reflections | — |
| Color / atmosphere | 7 |
| Animation | — |
| Physics / ground contact | 5 |
| Detail density | 6 |
| Environmental integration | 5 |
| Visual cleanliness | 5 |
| Temporal stability | — |
| Browser performance | 6 |

**Top three weaknesses**

1. `shots/round1/truck_day/road.png`, `truck_dusk/road.png`, `truck_night/road.png` — **the "rocks" are dark flat-shaded triangles.** The foreground trackside is scattered with black/grey polyhedra of 6–10 faces with no texture, no AO where they meet the dirt, and no tonal match to the red soil they sit on; at night they are pure black cut-outs. Fix: rock meshes of ≥ 200 tris with a triplanar rock albedo/normal that inherits 30–40% of the soil colour at the base, half-buried (sink 20–30% into the terrain), a contact AO decal.
2. `shots/round1/truck_day/mainroad.png`, `truck_dusk/mainroad.png`, `truck_night/mainroad.png` — **the main road is a flat ribbon with painted ruts.** Twin tyre ruts are darker stripes with no height, the road edge is a sharp albedo transition into grass with no shoulder, kerb-side white marker posts are perfectly evenly spaced and identical, and the chevron/wildlife signs are crisp while the road surface has visibly lower texel density (soft, blurry gravel at 10 m). Fix: displace the ruts 5–8 cm with parallax or geometry, add a 1–2 m gravel shoulder blend with sparse stones, jitter post spacing and tilt ±5°, and raise road texel density to match the sign textures.
3. `shots/round1/camp_day/camp_arrive.png`, `camp_beyond.png`, `camp_gate.png`, and `truck_day/forest.png` — **terrain is a single-frequency noise blanket.** The ground has one scale of albedo variation (the red/ochre mottle), so at 5 m and at 200 m it looks identical: no pebbles close, no drainage lines or erosion gullies far, no colour shift by slope/aspect. The horizon is a hard line where the terrain mesh ends against the sky (see cross-family). Fix: a 3-octave detail blend (macro colour map ~500 m, mid ~20 m, micro ~1 m), slope-based darkening/rock exposure, and a far LOD/fog blend so the mesh edge never shows.

**Strong / must not regress**
- Red laterite colour and the way it turns wine-red at dusk (`truck_dusk/mainroad.png`) is convincing and distinctly East-African.
- Track routing: the two-track curving into the distance in `truck_*/forest.png` gives a real sense of travel and leads the eye to the acacia.
- The road signs (`truck_*/mainroad.png`) are legible and correctly scaled.

---

## 6. Vegetation

| Category | Score |
|---|---|
| Composition | 6 |
| Silhouette | 5 |
| Geometry | 4 |
| Scale | 6 |
| Materials | 5 |
| Texture quality | 5 |
| Glass / transparency | — |
| Lighting | 5 |
| Shadows | 4 |
| Reflections | — |
| Color / atmosphere | 7 |
| Animation | 3 |
| Physics / ground contact | 5 |
| Detail density | 6 |
| Environmental integration | 5 |
| Visual cleanliness | 5 |
| Temporal stability | — |
| Browser performance | 5 |

**Top three weaknesses**

1. `shots/round1/truck_dusk/forest.png`, `truck_day/forest.png` — **acacia canopies are flat leaf-blob discs.** The large tree upper-right has a canopy that is a horizontal stack of 3–4 planar clusters with hard jagged edges, uniform dark green, no translucency against a bright dusk sky, and no leaf-shadow on the trunk or ground under it. The trunk is a single cylinder with two forks. Fix: canopy from 8–12 crossed alpha cards with backface subsurface tint (dusk sun behind → ~20% yellow-green bleed), an AO/shadow blob under the crown, and a trunk with ≥ 3 branch orders.
2. `shots/round1/lions_day/lion_pride.png`, `lion_far.png`, `camp_day/camp_beyond.png`, `lions_walk/walk_*.png` — **grass is the same 3 clumps stamped thousands of times.** The pale tussocks are identical in shape and orientation, laid out on a visibly even density; they are unlit sprites (same brightness on sun and shade sides), never intersect one another, and stand at exactly the same height, so the plain reads as a tiled pattern. There is no wind motion evident (identical tips across frames in the walk strip). Fix: ≥ 6 clump variants with ±25% scale, random yaw, colour jitter (hue ±5°, value ±15%), a density noise mask, a vertex wind sway (0.5–1 Hz, 3–5° amplitude), and a normal-driven lighting so clumps are lit by the sun direction.
3. `shots/round1/truck_day/mainroad.png`, `truck_dusk/hero.png` — **bushes are single billboards that flip with the camera.** The foreground bushes in `truck_dusk/hero.png` (left edge) and the roadside shrubs in `mainroad.png` are one card each, so they show a paper-thin edge in three-quarter views and pop when the camera swings; at night (`truck_night/hero.png`) the left-side bush is an unlit bright-green silhouette against the dark, brighter than the truck's own paint. Fix: 3-card cross billboards or low-poly hull meshes for anything within 30 m, and lit vegetation shaders that respect the night ambient.

**Strong / must not regress**
- Colour palette: straw-gold grass against red soil under a warm sky (`truck_dusk/forest.png`) is exactly the right savannah key; do not desaturate it.
- Acacia silhouette in wide shots (`truck_day/forest.png` right tree) is recognisable from 200 m.

---

## 7. Lions

| Category | Score |
|---|---|
| Composition | 6 |
| Silhouette | 3 |
| Geometry | 3 |
| Scale | 5 |
| Materials | 4 |
| Texture quality | 4 |
| Glass / transparency | — |
| Lighting | 5 |
| Shadows | 4 |
| Reflections | — |
| Color / atmosphere | 6 |
| Animation | 4 |
| Physics / ground contact | 5 |
| Detail density | 3 |
| Environmental integration | 5 |
| Visual cleanliness | 5 |
| Temporal stability | — |
| Browser performance | 7 |

**Top three weaknesses**

1. `shots/round1/lions_day/lion_face.png` — **the lion does not read as a lion.** Rounded teddy-bear skull, round ears on top of the head, a small black button nose, a hard-edged flat muzzle with a straight mouth line, amber cartoon eyes with no depth or wet highlight, no whisker spots, no mane on any individual, no brow ridge. A player would call this a bear or a dog. Fix: rebuild the head — elongated skull, ears set to the side, wide flat nose bridge, split upper lip with philtrum, eye sockets with a reflective cornea and dark tear line, a coarse mane card set on males; add a fur normal/roughness map with directional strand flow.
2. `shots/round1/lions_walk/walk_02.png`, `walk_05.png`, `lions_day/lion_side.png` — **body proportions are a greyhound's.** The walking adult is gaunt: a deep chest tapering to a wasp waist, stick legs with knees at the wrong height, a rope tail, and a neck as long as the head. Lions are heavy-shouldered and barrel-bodied. The cub beside it is a straight scale-down of the adult, so it has adult proportions at half size. Fix: re-proportion the torso (chest depth ≈ 1.2× belly depth, not 2×), thicken forelimbs and paws (paw width ≈ 40% of forearm length), give the cub a bigger head-to-body ratio and shorter legs.
3. `shots/round1/lions_day/lion_close.png`, `lions_dusk/lion_close_dusk.png` — **fur is a flat tan with a soft mottle.** The coat shows no fur direction, no darker back stripe, no white muzzle/chin/belly, no paw pad or claw detail (paws end in smooth mittens with four faint gaps), and lighting is diffuse-only: no rim, no specular on the coat, no self-shadow under the belly. At dusk the lion picks up the sky colour uniformly with no warm/cool split. Fix: albedo with dorsal darkening and ventral lightening, an anisotropic sheen or fur-flow normal, cast shadows on the animal itself, and a subtle SSS/wrap on the sun side.

**Strong / must not regress**
- Pose library exists: seated, lying sphinx, standing, walking (`lion_seat.png`, `lion_close.png`, `lion_pride.png`); the sphinx pose is anatomically the best.
- The lions are correctly placed on the ground plane and correctly scaled against the grass clumps (no giant/miniature lions).

---

## 8. Lion feet / ground contact

| Category | Score |
|---|---|
| Composition | 6 |
| Silhouette | 4 |
| Geometry | 3 |
| Scale | 5 |
| Materials | 4 |
| Texture quality | 4 |
| Glass / transparency | — |
| Lighting | 5 |
| Shadows | 4 |
| Reflections | — |
| Color / atmosphere | 6 |
| Animation | 3 |
| Physics / ground contact | 4 |
| Detail density | 3 |
| Environmental integration | 5 |
| Visual cleanliness | 5 |
| Temporal stability | 5 |
| Browser performance | 7 |

**Top three weaknesses**

1. `shots/round1/lions_walk/walk_00.png` … `walk_07.png` — **legs swing but feet do not plant.** Across the strip the body translates ~1.5 body-lengths while the legs describe a pendulum swing whose contact points drift forward with the body: there is no frame where a foot is visibly locked to one patch of ground. The stride cycle is also faster than the translation, so feet slide. Fix: IK-driven foot placement (raycast per foot, plant for the stance phase ≈ 60% of the cycle) and a stride length tied to velocity (stride ≈ 1.1× shoulder height per cycle at a walk).
2. `walk_02.png`, `walk_05.png` — **feet penetrate and float.** In `walk_02.png` the near forepaw disappears below the ground surface at the toe, the rear paws end ~5 cm above it; in `walk_05.png` the rear legs are splayed with one paw hovering while the other is rotated ~30° outwards from the direction of travel (twisted). There is no contact shadow under any paw, so the ambiguity is doubled. Fix: foot IK with a ground offset of paw height, clamp hind-leg yaw to ±10° of the spine, a soft contact shadow blob per paw.
3. `walk_00.png` … `walk_07.png` — **the cub is a copy of the adult playing the same clip in lockstep.** Both animals hit identical phases of the walk cycle in every frame and travel at exactly the same speed, so the pair reads as one instanced mesh. Temporal stability itself is fine (no popping, grass and shadows are stable) but nothing in the shot breathes — no tail sway, no head bob, no ear movement. Fix: offset animation phase per individual by a random 0–1 cycle, scale playback rate by leg length, add a secondary tail/ear/head layer with low-frequency noise.

**Strong / must not regress**
- Camera is stable and the scene does not flicker between frames — no shadow acne swimming, no grass LOD popping in the strip.
- The two animals do stay in a plausible formation (cub trailing at the flank).

---

## 9. Lighting and atmosphere

| Category | Score |
|---|---|
| Composition | 7 |
| Silhouette | 6 |
| Geometry | — |
| Scale | — |
| Materials | 5 |
| Texture quality | — |
| Glass / transparency | 4 |
| Lighting | 6 |
| Shadows | 5 |
| Reflections | 3 |
| Color / atmosphere | 7 |
| Animation | 4 |
| Physics / ground contact | — |
| Detail density | — |
| Environmental integration | 5 |
| Visual cleanliness | 5 |
| Temporal stability | 6 |
| Browser performance | 6 |

**Top three weaknesses**

1. Every wide frame (`truck_day/forest.png`, `truck_dusk/mainroad.png`, `camp_day/camp_beyond.png`, `lions_walk/walk_*.png`, `lions_day/lion_pride.png`) — **the horizon is a hard cut.** The far terrain ends in a razor line (or in `walk_*.png` a jagged dark strip that looks like a low-res mountain texture) against the sky with no aerial perspective: the ground 2 km away is the same saturation as the ground 20 m away. At night (`camp_fire_night.png`, `truck_night/mainroad.png`) it becomes a black cut-out against a lighter blue band. Fix: height-based exponential fog matched to the sky's horizon colour (density so that 1.5 km ≈ 60% fogged), far terrain skirt or a distant-hills ring rendered with the same fog, and desaturation with distance.
2. `truck_night/hero.png`, `truck_night/front.png`, `camp_night/*.png`, `fleet/*_night.png` — **night is day with a blue multiply.** Ambient is a flat blue-grey that lights the undersides of the truck as much as the tops, foliage stays saturated green, the star field is uniform white pixels of equal brightness with no Milky Way or twinkle, and there is no moon or moon-direction key light so nothing has a lit side. The headlights in `truck_night/front.png` are on (glowing lamp discs) yet cast no visible beam onto the ground ahead in that frame. Fix: a directional moon key (blue-white, ~0.15 intensity) with shadows, hemisphere ambient with dark ground colour so undersides go black, star texture with varied magnitudes, headlight spot lights with visible ground pools and a faint volumetric cone.
3. `truck_dusk/hero.png`, `truck_dusk/road.png`, `lions_dusk/*.png` — **dusk is a single orange grade.** The sky is a smooth peach-to-grey gradient with no sun disc, no cloud, no horizon glow concentration; the ground takes the same tint as the sky so there is no warm-key/cool-fill split, and shadows have no colour (neutral dark). Fix: a visible low sun disc with a bright horizon band, cool (blue-violet) shadow fill from the opposite sky, long soft shadows with 2–3 m penumbra, sparse cloud cards catching under-light.

Also noted: shadows are soft-edged but very low resolution at close range (`truck_day/wheel.png` shadow edge is a blurry 10-px smear), and cast shadows are entirely absent from tents and fleet in the overhead.

**Strong / must not regress**
- Three distinct times of day exist and are immediately recognisable at a glance (`truck_day/hero.png` vs `truck_dusk/hero.png` vs `truck_night/hero.png`); the dusk rim light on the truck and the night headlight pool on the main road are the two best lighting moments in the game.
- Exposure/tone mapping is consistent — no blown-out sky in day, no crushed blacks in the truck at night.
- Dust/spark particle motes at dusk and night (`truck_dusk/hero.png`, `truck_night/*.png`) add life; keep them.

---

## 10. Browser performance

Source: `perf/2026-09-04T12-46-27-505Z-ad7ef04+.json` (label `integrated-r1`, `?quality=fast`, software rasteriser — fps ignored) and `shots/round1/*/stats.json`.

| Category | Score |
|---|---|
| Composition | — |
| Silhouette | — |
| Geometry | 4 |
| Scale | — |
| Materials | 4 |
| Texture quality | 5 |
| Glass / transparency | — |
| Lighting | — |
| Shadows | — |
| Reflections | — |
| Color / atmosphere | — |
| Animation | — |
| Physics / ground contact | — |
| Detail density | 5 |
| Environmental integration | — |
| Visual cleanliness | 6 |
| Temporal stability | 4 |
| Browser performance | 4 |

Measured: 453 draw calls, **2.57 M triangles**, 277 shader programs, 275 textures, 319 geometries, 254 visible objects, 26 852 visible instances, 4 animals, JS heap 333.8 MB (stable, growth −0.3 MB over 3 loops). Boot: `readyMs` 43 031 ms of which **"Compiling shaders" 24 298 ms**, "Grading the road" 5 467 ms, "Assembling the truck" 3 991 ms, "Finding the pride" 3 124 ms, "Planting the forest" 3 033 ms, "Pitching camp" 1 743 ms. Drive sample: 19 frames, p50 16.7 ms, **p95/p99/max 188 ms, 2 long frames** in 0.6 s. Per view (`stats.json`): calls 347–512, triangles 2.07–2.85 M; `rear`/`mainroad` views are the heaviest (2.80–2.85 M); dusk and night add ~50 calls and ~300 k tris over day for the same view (extra lamp/emissive passes).

**Top three weaknesses**

1. **Triangle budget.** 2.1–2.85 M triangles for a 640×360 frame of one truck, grass and a handful of props is 3–5× what the pictures justify — the grass in `lion_pride.png` is flat cards, the lions are ~low-poly, so the load must be in the truck (kit detail: mesh grille, chains, ladders) and the instanced grass count (26 852 instances). Fix: LOD the hero truck (a 60 k-tri LOD1 beyond 15 m), reduce grass instance count by a distance-based density falloff (halve beyond 60 m), and merge small rack props.
2. **277 shader programs and a 24 s shader compile at boot.** 277 unique programs for this many materials means near-every mesh has its own material permutation; compilation dominates the 43 s boot. Fix: consolidate to ≤ 40 materials (shared PBR with per-instance colour attributes), pre-warm with `renderer.compile()` behind the loading screen, and cache with `KHR_parallel_shader_compile`.
3. **188 ms long frames while driving** (p95 = p99 = max = 188 ms, two hits in 0.6 s). Even on a software rasteriser that is a synchronous hitch — likely lazy shader compile or a geometry upload when a new chunk/vehicle enters view. Fix: pre-compile all program variants at boot, upload all geometry/textures before the first drive frame, and move terrain/grass generation to a worker or spread it over frames.

**Strong / must not regress**
- Heap is flat (334.8 → 334.5 MB over three loops, −0.3 MB) — no leak.
- Draw calls (350–510) are within a reasonable WebGL budget given the content; keep instancing.
- Boot stages are labelled and timed — keep the instrumentation.

---

## Cross-family defects

1. **Hard horizon / no aerial perspective** — visible in `truck_*/forest.png`, `truck_*/mainroad.png`, `camp_day/camp_beyond.png`, `camp_night/camp_fire_night.png`, `lions_day/lion_pride.png`, `lions_day/lion_far.png`, `lions_walk/walk_*.png`, `glass_r1/day/glass_inside.png`. Terrain ends in a razor edge (or a jagged dark strip) against the sky, with no fog gradient or distance desaturation. One fix (fog + far skirt) lifts road/terrain, vegetation, campground, lions and atmosphere at once.
2. **Blocky tyres and hovering wheels** — hero truck (`truck_*/wheel.png`, `truck_*/road.png`) and every fleet vehicle (`fleet/pickup_0_day.png`, `suv_0_day.png`, `trailer_0_day.png`, `motorcycle_0_day.png`). Same tread mesh, same missing contact shadow, same air gap.
3. **Glass is tint, not glass** — hero windscreen, side glass, wing mirror, interior mirror, and every fleet vehicle's windows (`glass_r1/day/*.png`, `truck_*/interior.png`, `fleet/ranger_0_day.png`, `fleet/safari-jeep_*`). No environment reflection anywhere in the game; the only specular surfaces are the snorkel and the gauge bezels.
4. **Missing cast shadows on secondary objects** — tents and fleet in `camp_day/camp_overhead.png`, roof-rack cargo onto the roof in `truck_*/rear.png`, lions' self-shadow (`lion_close.png`), grass clumps everywhere. Shadows exist only for the hero truck body and the trees.
5. **Vegetation is unlit and unanimated** — grass and bushes are the same brightness on the sun and shade sides in day (`lion_pride.png`), glow green at night (`truck_night/hero.png` left bush), and show no wind in the walk strip.
6. **Night ambient is flat** — truck, camp, fleet and lions at night all share the same blue-grey wash with no key direction (`truck_night/*.png`, `camp_night/*.png`, `fleet/*_night.png`).
7. **Single-texture syndrome** — cockpit (one crackle pattern for everything), camp props (one flat colour per primitive), lions (one tan mottle), fleet panniers/crates (uniform grey/brown). Material hierarchy is missing across every family except the hero truck exterior.

## Overall verdict

It does not yet read as one polished high-end safari game; it reads as a very good hero truck placed in a competent-but-generic environment, with animals that belong to a different, younger game. The truck exterior (silhouette, kit, dusk rim light, night headlight pool) is at 7–8 and would survive a screenshot with the glass fixed; road colour and time-of-day palette are right. Everything else sits at 4–5: campground props and fleet are untextured primitives with physics faults (the trailer is visibly broken), the glass reflects nothing, the horizon is a hard edge in every wide frame, night is a blue multiply, and performance carries 2.5 M triangles and 277 shaders for what is on screen. The single weakest area is the **lions** — head, body proportions, fur and foot-planting all fail together (Silhouette 3, Geometry 3, Detail density 3, Animation 3), and in a safari game the animals are the point; no amount of truck polish rescues a frame in which the lion looks like a bear-faced greyhound sliding over the grass.
