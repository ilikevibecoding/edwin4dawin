# Critic C — round 2 (candidate a8ca6eb vs incumbent 2f0f5ba)

Blind review. Frames looked at: **195** — every one of the 99 candidate frames under
`shots/round2/` (truck_day/dusk/night ×10, camp_day 6, camp_night 4, fleet 24,
lions_day 7, lions_dusk 3, lions_walk 12, glass 13 incl. sheet), the 86 matching
incumbent frames under `shots/round1/` (walk strip taken from `lions_walk_fixed/`),
and 10 incumbent glass frames (`shots/glass_r1/day/` all seven, plus
`glass_r1/dusk/glass_screen.png`, `glass_r1/night/glass_inside.png`,
`glass_r1/night/glass_screen.png` to have something to hold `dusk_ws`,
`night_int`, `night_ext` against).

Housekeeping the integrator should know before reading the scores:

- The round‑2 glass set is shot at **320×180**, not 640×360 (`file shots/round2/glass/ws_close.png`).
  Every other round‑2 frame is 640×360. Half the pixels means I cannot score glass
  texture/edge quality at parity with round 1; where the frame is too small to tell
  I have said so rather than guessed.
- `shots/round2/truck_*/hud.png` prints `build e524952`, not `a8ca6eb`. Either the
  HUD stamp or the capture manifest is wrong. It does not change the pictures, but it
  is exactly the kind of thing the HUD exists to catch.
- Scoring rule applied throughout: the frame, not the intent. Several round‑2 source
  comments describe fixes that are not in the frames.

---

## 1. Hero car (`truck_day|truck_dusk|truck_night/` hero, front, rear, wheel, detail, interior)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 7 | 7 | Same cameras; truck sits where the eye goes at all three hours |
| Silhouette | 7 | 7 | Roof rack, snorkel, jerrycans, spare read cleanly against sky at every hour |
| Geometry | 7 | 7 | Grille, bull bar, ladder, hinges all solid; no gaps; wheel arch/tyre join clean |
| Scale | 7 | 7 | Truck-to-acacia and truck-to-track proportions hold |
| Materials | 7 | 7 | Green paint has believable satin; tyres are rubber; orange kit is painted steel |
| Texture quality | 7 | 7 | Dust/scuff pass on the flanks is still the best texture in the game |
| Glass / transparency | 6 | 6 | Windscreen shows the interior; side panes slightly too clear (see §2) |
| Lighting | 7 | 6 | Day is good; dusk front lamp bar renders as a white slab (`truck_dusk/hero.png`, `truck_dusk/front.png`) |
| Shadows | 7 | 6 | Day contact shadow good; dusk/night self-shadowing under the wheel arches gone flat |
| Reflections | 5 | 5 | Paint has a hint of sky; chrome trim shows no environment; nothing in the lenses |
| Color / atmosphere | 6 | 5 | Truck fine; the sky behind it is what dropped (see §9) |
| Detail density | 8 | 8 | Best family in the game for small correct things |
| Environmental integration | 7 | 7 | Wheel-dust, dirt on sills, and the truck sits in the ruts |
| Visual cleanliness | 7 | 6 | Night starfield is “snow” behind the roof line; dusk lamp bar over-bright |

**Top three weaknesses in round 2**

1. `shots/round2/truck_dusk/hero.png` (also `truck_dusk/front.png`) — the front lamp
   cluster is a single flat white rectangle spanning the whole grille, no bulb centres,
   no lens shape, no falloff into the bezels; it reads as a missing texture, not as
   headlamps switched on at dusk. Round 1 at the same hour shows separate amber and
   white lamps with dark bezels. Fix: `src/vehicle/index.js` `setLights()` —
   `materials.headlight.emissiveIntensity = on ? 9.0 : 1.6` is tuned for night; at
   dusk exposure it saturates. Key it off the hour: `on ? (hour==='night' ? 9.0 : 3.5) : 1.6`,
   and drop `lensClear`/`lensRibbed` emissive from 2.2 to ~0.8 at dusk so the covers
   stop bleeding into one slab. `LAMP_HOT` in `src/vehicle/body.js` should also stop
   marking the cover lenses hot at dusk.
2. `shots/round2/truck_night/hero.png` — behind an otherwise good night truck the sky
   is a uniform dust of white points from the treeline up; there are more stars than
   dark pixels above 60° and the Milky Way band is a lighter grey smear with the same
   dot pitch. Fix: `src/sky.js` NIGHT_SKY `stars: 0.7 → 0.35`, `milkyWay: 0.85 → 0.6`,
   and in the fragment shader thin the dense grid `starGrid( o, px, 210.0, 0.06, …)`
   to fill `0.03` and the Milky‑Way dusting `starGrid( o + 3.9, px, 420.0, 0.35, …)`
   to fill `0.15`. Round 1 (`shots/round1/truck_night/hero.png`) with `stars` lower
   reads as a night sky.
3. `shots/round2/truck_day/hero.png` — paint and chrome show no environment: the
   bonnet is a flat gradient, the snorkel a grey tube, the mirror housing shows no sky.
   At 640×360 a shipped title would still show the horizon line curving over the
   bonnet. Fix: `src/vehicle/materials.js` — give `paint` a `envMapIntensity` ≥ 0.6
   with `roughness ~0.35` and make sure the PMREM from `sky.js` (`u.uStars.value = env ? 0 : …`
   path already exists) is actually assigned to `scene.environment` for the day
   profile; `chrome`/`snorkel` want `metalness 1, roughness 0.25`.

**Regressions (r1 → r2)**

- Dusk lamp slab: `shots/round1/truck_dusk/front.png` → `shots/round2/truck_dusk/front.png`.
- Night sky density behind the hero: `shots/round1/truck_night/hero.png` → `shots/round2/truck_night/hero.png`.
- Hills in the hero backgrounds are now flat cobalt silhouettes:
  `shots/round1/truck_day/rear.png` → `shots/round2/truck_day/rear.png` (see §5).

**Keep**

- The truck itself at day: paint wear, orange kit, bull bar, tyre tread, mud on the
  sills (`truck_day/detail.png`, `truck_day/wheel.png`). Do not touch the body kit.
- Interior at day (`truck_day/interior.png`): the dash, gauges and wheel read as a real cab.
- Night headlamps and light bar on the hero **do** light the ground in front
  (`truck_night/hero.png`): keep the spot decay 0.4 in `src/vehicle/index.js`.

---

## 2. Car glass (`shots/round2/glass/` vs `shots/glass_r1/day/` + dusk/night screen/inside)

Mapping by content: ws_close/ws_mid ↔ glass_screen; side_sun/side_shade ↔ glass_side/glass_shade;
interior/int_side ↔ glass_inside; rear_dust ↔ glass_rear; mirror ↔ glass_mirror; moving ↔ glass_moving;
dusk_ws ↔ dusk/glass_screen; night_int ↔ night/glass_inside; night_ext ↔ night/glass_screen.

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 6 | 6 | Gauntlet framings are tighter and better chosen, but at 320×180 they lose the point |
| Geometry | 7 | 7 | Frames, mullions, wiper arms, mirror stalk all solid in both |
| Materials | 6 | 6 | Glass is a tinted pane; no thickness, no edge darkening in either round |
| Glass / transparency | 5 | 6 | Metrics: see 0.59–0.96, veil ≤ 0.15, hot 0, clip 0 — you can always see through, nothing blows out |
| Reflections | 4 | 4 | Nothing of the sky or the acacias is in any pane at any hour; `spread` 0.15–0.52 is dust, not reflection |
| Lighting | 6 | 6 | Night interior dash glow is right (`night_int`); dusk pane takes the sky colour |
| Visual cleanliness | 6 | 6 | No sorting errors visible; `flick` 0.098 on `moving` is the only temporal warning |
| Detail density | 6 | 6 | Dust on `rear_dust` and streaks on `ws_close` are the right small things |

**Top three weaknesses in round 2**

1. `shots/round2/glass/ws_close.png` and `side_sun.png` — no reflection at all. The
   windscreen at a raking 30° angle in full sun shows the cab interior and a light
   dust haze; a real pane at that angle is 20–30 % sky (Fresnel). `metrics.json`
   confirms it: `see` 0.88 on ws_close, `spread` 0.51 which the gauntlet header
   attributes to veil spread, not a specular. Fix: `src/vehicle/materials.js`
   `glass`/`glassSide` — MeshPhysicalMaterial with `transmission 0`, `roughness 0.08`,
   `envMapIntensity 1.0`, `ior 1.5`, and the sky PMREM assigned so the Fresnel term has
   something to reflect. Keep `opacity` where it is so `see` stays > 0.7.
2. `shots/round2/glass/mirror.png` — the mirror face is a flat orange‑brown gradient
   (the two “panes” are two brown rectangles); `see` for this pane is the lowest of the
   set at 0.59 and `veil` the highest at 0.149. It reflects nothing, which for a mirror
   is the whole job. Fix: `src/vehicle/mirrors.js` — render‑to‑texture with a
   `THREE.WebGLRenderTarget` 128×96 from a camera mirrored about the housing plane,
   or at minimum `envMap` with `metalness 1, roughness 0.02` so the sky shows.
3. `shots/round2/glass/moving.png` — `flick` 0.098 is 5–10× every other pane. In the
   frame the windscreen dust veil is a stippled pattern that will shimmer with motion.
   Fix: the dust/veil layer on the windscreen material (`src/vehicle/materials.js`,
   the `glass` dust map) is sampled at too high a frequency for 640 px; halve its UV
   repeat and raise `anisotropy` to 4 on the texture, or move the dust to a
   `sheen`-style term instead of a mapped alpha.

**Regressions**

- Capture resolution halved (`shots/glass_r1/day/glass_screen.png` 640×360 →
  `shots/round2/glass/ws_close.png` 320×180). Not a game regression, but the glass
  family can no longer be scored on texture or edge quality until this is restored.
- None visible in the glass itself at the pixel size I have.

**Keep**

- No blown highlights on any pane at any hour (`hot: 0`, `clipPct: 0` on all twelve).
- The dashboard is readable through the screen from outside at night (`night_ext.png`)
  and the gauges glow without flaring in `night_int.png`.
- `rear_dust.png`: the dust on the rear pane is the right density and lets the seats
  through.

---

## 3. Fleet (`fleet/`, twelve vehicles × day/night)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 6 | 6 | Same three‑quarter framing; fine |
| Silhouette | 6 | 7 | Camper, supply truck and trailer read as their type at a glance |
| Geometry | 6 | 6 | Boxy but no gaps; motorcycle is the weakest (wheels are thin discs) |
| Scale | 6 | 6 | Ranger and SUV are a touch tall for their wheelbase |
| Materials | 6 | 6 | Paint is one satin for every vehicle; canvas on the camper is the only different surface |
| Texture quality | 6 | 6 | Wear pass (`src/vehicles/wear.js`) shows rust streaks; tiling not visible |
| Glass / transparency | 5 | 5 | Fleet panes are flat tint with no interior visible |
| Lighting | 6 | 4 | Night: headlamps unlit on every vehicle; ground shows a blotchy pool with no source |
| Shadows | 6 | 5 | Night contact shadow under the chassis missing; day fine |
| Color / atmosphere | 6 | 5 | Cobalt hills behind `pickup_0_day.png` and `suv_0_day.png` |
| Detail density | 6 | 6 | Roof racks, spare wheels, jerrycans present |
| Environmental integration | 6 | 6 | Vehicles sit on the ground; no dust or ruts around them in either round |
| Visual cleanliness | 6 | 5 | Night lamp pools have hard rectangular edges |

**Top three weaknesses in round 2**

1. `shots/round2/fleet/safari-jeep_0_night.png`, `camper_0_night.png`,
   `expedition-truck_0_night.png` — the headlamps are dark grey discs while a bright
   irregular splodge sits on the ground ahead. Round 1
   (`shots/round1/fleet/safari-jeep_0_night.png`) shows lit lenses *and* a pool. Light
   from nowhere is worse than no light. Fix: `src/vehicles/materials.js`
   `setFleetLights(materials, on)` must switch the `headOn`/`lampBlueOn` materials to
   emissive (they are created in `parts.js` line ~521 but the emissive is never raised
   at night in the frame), and `lampPool()` in `src/vehicles/parts.js` should use a
   radial-gradient alpha texture on the `pool` plane, `len` 4.5 → 7, `w` 2.6 → 3.4, so
   the pool is a cone from the bumper rather than a rectangle 2 m out.
2. `shots/round2/fleet/motorcycle_0_day.png` — wheels are 12‑segment discs with a
   visible polygon rim; the tank is a box. Fix: `src/vehicles/kinds.js` motorcycle —
   `CylinderGeometry` radial segments 12 → 32 for the wheels, and a `LatheGeometry`
   tank instead of `pbox`.
3. `shots/round2/fleet/pickup_0_day.png` — hills behind are a saturated blue with dark
   spots (the new 460 m macro variation reads as leopard spots at this distance). Same
   cause as §5 item 1; fix there.

**Regressions**

- Unlit headlamps at night on every fleet vehicle:
  `shots/round1/fleet/*_0_night.png` → `shots/round2/fleet/*_0_night.png` (all twelve).
- Hills behind the day fleet: `shots/round1/fleet/pickup_0_day.png` → `shots/round2/fleet/pickup_0_day.png`.

**Keep**

- Day silhouettes and wear pass (`fleet/supply-truck_0_day.png`, `fleet/camper_0_day.png`).
- Variety: twelve kinds are recognisable as twelve kinds.

---

## 4. Campground (`camp_day/`, `camp_night/`)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 6 | 6 | Gate, mess tent and fire views all well framed |
| Silhouette | 6 | 7 | Mess awning, watchtower and tents read cleanly against sky |
| Geometry | 6 | 6 | Chairs, tables, poles solid; awning cloth is a flat sheet |
| Scale | 6 | 6 | Chairs to tables to tents believable |
| Materials | 6 | 6 | Canvas is canvas; ground is one dirt |
| Texture quality | 6 | 6 | Awning cloth pattern tiles at ~1.5 m — visible in `camp_mess.png` |
| Lighting | 6 | 5 | Day under the awning is a black slab; night fire light is weaker than r1 |
| Shadows | 6 | 4 | `camp_mess.png`: ground under the awning is near-black with a hard edge |
| Color / atmosphere | 6 | 4 | Cobalt hills at day; “snowstorm” sky at night |
| Detail density | 6 | 7 | More props: crates, lantern posts, firewood stack |
| Environmental integration | 6 | 6 | Props sit on the ground; no worn paths between them in either round |
| Visual cleanliness | 6 | 5 | Night sky noise; hard shadow terminator |

**Top three weaknesses in round 2**

1. `shots/round2/camp_day/camp_mess.png` — the ground under the mess awning is a flat
   near‑black polygon (RGB ~12,10,8 against ~180,120,80 dirt beside it: about 3.5 stops)
   with a razor edge, and the chairs inside it are unreadable. Under a tarp in daylight
   the ground is skylit; at most 1–1.5 stops down. Round 1
   (`shots/round1/camp_day/camp_mess.png`) had a grey shadow with ground detail
   through it. Fix: `src/sky.js` DAY profile `shadow: { intensity: 1.0 }` → `0.72`,
   `radius: 1.2 → 2.5`; and the `hemi` intensity `0.5 → 0.8` so the shadow floor has
   skylight. `src/campground/materials.js` line 46 multiplies `through` by the shadow
   term for the awning — cap it: `through *= mix(1.0, shadow, 0.6)`.
2. `shots/round2/camp_night/camp_fire_night.png` — the sky is 60 % of the frame and
   is a dense white speckle from horizon to zenith with a lighter grey band; the fire
   is a small orange smear whose light barely reaches the chairs 3 m away. Round 1
   (`shots/round1/camp_night/camp_fire_night.png`) had a visible flame and a warm pool
   out to the tents. Fix: sky per §1 item 2; fire: `src/campground/fire.js`
   `new THREE.PointLight(0xff9448, 0, 24, 1.5)` — the distance 24 with decay 1.5 gives
   almost nothing at 4 m; set decay `1.0`, and raise the flame system’s `tier` count
   `Math.round(22 * tier)` → `Math.round(34 * tier)` with flame scale ×1.3 so the
   fire reads as the subject of the frame.
3. `shots/round2/camp_day/camp_gate.png` and `camp_beyond.png` — the hills behind the
   camp are a flat cobalt band 2 stops darker than the sky at their base with no
   internal value, sitting on a cream plain. Round 1 had grey‑green hills in haze.
   Fix in §5 item 1.

**Regressions**

- Hard black awning shadow: `shots/round1/camp_day/camp_mess.png` → `shots/round2/camp_day/camp_mess.png`.
- Fire light and flame: `shots/round1/camp_night/camp_fire_night.png` → `shots/round2/camp_night/camp_fire_night.png`.
- Night sky: `shots/round1/camp_night/camp_gate_night.png` → `shots/round2/camp_night/camp_gate_night.png`.
- Distant hills: `shots/round1/camp_day/camp_beyond.png` → `shots/round2/camp_day/camp_beyond.png`.

**Keep**

- Prop count and layout (`camp_day/camp_mess.png` chairs and tables, `camp_day/camp_gate.png` firewood/lantern posts).
- The watchtower silhouette (`camp_day/camp_mess.png`, top-left).
- Lantern glow on the tents at night (`camp_night/camp_mess_night.png`, `camp_night/camp_arrive_night.png`) — warm, not blown.

---

## 5. Road & terrain (road, mainroad, hero backgrounds, lion_far/pride backgrounds, camp_beyond)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 7 | 7 | Mainroad leading lines are good in both |
| Geometry | 6 | 6 | Ruts and verge are modelled; hills are smooth blobs |
| Scale | 6 | 6 | Track width to truck right; hills read as ~1 km, which is fine |
| Materials | 6 | 6 | Dirt is dry dirt; no wet/dry variation |
| Texture quality | 6 | 6 | Ground macro tile visible at ~90 m in `mainroad.png` (repeating dark patch) |
| Lighting | 6 | 6 | Day ground lit well; far plain a stop brighter than near ground |
| Shadows | 6 | 6 | Truck shadow on the road fine; no shadow from the far hills onto the plain (acceptable) |
| Color / atmosphere | 6 | 4 | Hills are saturated cobalt, spotted, hard-edged against the sky |
| Detail density | 6 | 6 | Roadside sign, fence posts, stones on the verge |
| Environmental integration | 6 | 6 | Track wear pattern is right; grass to dirt edge is a hard line |
| Visual cleanliness | 6 | 5 | Macro-spots on hills; bright horizon band |

**Top three weaknesses in round 2**

1. `shots/round2/truck_day/mainroad.png` — the far hills are a saturated blue
   (≈ RGB 70,110,190) with dark blue spots 1–2° across and a hard crest against a
   pale sky; the base of the hills is ≈ 2 stops darker than the sky they stand on
   and there is no haze gradient up the slope. Real scrub hills at 1–2 km in dry air
   are desaturated grey‑green‑blue, lighter at the base than the crest, and never
   more saturated than the sky. Round 1 (`shots/round1/truck_day/mainroad.png`)
   had this. Fix: `src/terrain.js` `buildFarHills()` — the fog blend “cooled a little
   further” term has over‑cooled: clamp the hill air colour to the scene fog colour
   without the extra blue shift, raise the haze fraction at the crests from 0.62 to
   0.8, and desaturate the `uHillMacro` macro variation from ±14 % to ±6 % with the
   warmth channel only (the value channel is what reads as spots). The crest tint
   0.06 is fine; the problem is the air, not the albedo.
2. `shots/round2/truck_day/mainroad.png`, `truck_day/forest.png` — the horizon has a
   distinct pale band about 3° tall, brighter than the sky above it and brighter than
   the plain below, so the hills sit in a light box. Fix: `src/sky.js` DAY profile
   `hazeFalloff` — soften (9.0 → 5.5) so the horizon glow fades into the zenith
   rather than forming a band, and `warm` down a step.
3. `shots/round2/lions_day/lion_far.png`, `lion_pride.png` — the plain behind the
   pride is a cream flat with sparse tufts to the hills; round 1 had denser grass
   carrying the ground to the treeline. Fix: `src/forest.js` grass scatter density
   for the plain biome (the tuft instancer) — restore the round‑1 count or raise
   the far cut distance so the ground does not go bald 60 m out.

**Regressions**

- Hills: `shots/round1/truck_day/mainroad.png` → `shots/round2/truck_day/mainroad.png`;
  `shots/round1/truck_dusk/mainroad.png` → `shots/round2/truck_dusk/mainroad.png`;
  `shots/round1/camp_day/camp_beyond.png` → `shots/round2/camp_day/camp_beyond.png`.
- Plain grass density: `shots/round1/lions_day/lion_far.png` → `shots/round2/lions_day/lion_far.png`.

**Keep**

- The track itself: ruts, crown, stones, tyre marks (`truck_day/road.png`, `truck_day/mainroad.png`).
- The roadside sign and fence line on `mainroad.png` — right scale, right wear.

---

## 6. Vegetation (forest, backgrounds)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Silhouette | 6 | 6 | Acacia canopies read; trunks fine |
| Geometry | 5 | 5 | Canopies are card clusters with visible flat leaf planes at 20 m |
| Scale | 6 | 6 | Acacia to truck right |
| Materials | 5 | 5 | Leaves are opaque cards; no translucency at any hour |
| Texture quality | 5 | 5 | Leaf card texture is 4–5 leaves repeated; visible on `truck_day/forest.png` foreground canopy |
| Lighting | 5 | 5 | Canopies are one flat green with no light side / shade side |
| Shadows | 6 | 6 | Trees cast onto the ground; canopy self-shadow missing |
| Color / atmosphere | 6 | 5 | Grass gone warmer and sparser on the plain |
| Detail density | 6 | 5 | Fewer tufts on the plain (`lion_far.png`), forest unchanged |
| Environmental integration | 6 | 6 | Trunks meet the ground; grass clumps have no dirt collar |
| Visual cleanliness | 6 | 6 | No popping visible in statics |

**Top three weaknesses in round 2**

1. `shots/round2/truck_day/forest.png` — the foreground acacia canopy is a set of flat
   yellow‑green cards with a hard black outline where the alpha cuts, no interior
   shading, and the same 5‑leaf sprite repeated ~40 times. Fix: `src/forest.js`
   canopy material — enable `MeshStandardMaterial.alphaToCoverage`‑style soft edge
   (or `alphaTest 0.5` with a 2‑px mip‑faded alpha), bake a per‑card ambient
   occlusion gradient into the vertex colour (dark at the trunk, light at the tips),
   and use ≥ 3 leaf sprites per atlas.
2. `shots/round2/lions_day/lion_far.png` — grass on the plain thins to nothing by ~60 m
   and the ground is a bare cream flat to the hills. Fix as §5 item 3.
3. `shots/round2/truck_dusk/forest.png` — canopies are black cut‑outs against the
   dusk sky with no rim light or translucency, while the sun is 6° up behind them.
   Fix: `src/forest.js` leaf material — add a `sheen`/back‑light term (or a simple
   `emissive = leafColor * saturate(dot(-L, N)) * 0.4` in an `onBeforeCompile`) so low
   sun comes through the canopy.

**Regressions**

- Plain grass density: `shots/round1/lions_day/lion_pride.png` → `shots/round2/lions_day/lion_pride.png`.

**Keep**

- Acacia silhouettes on the horizon at dusk (`truck_dusk/mainroad.png`).
- Roadside grass tufts and dead brush near the track (`truck_day/hero.png`, left).

---

## 7. Lions (`lions_day/`, `lions_dusk/`, `lions_walk/` statics)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 6 | 6 | Pride and seat views framed well |
| Silhouette | 4 | 5 | R2 body is more cat (deeper chest, tucked belly); r1 was a box |
| Geometry | 4 | 4 | R2 head loft has a slab face; paws are black blocks |
| Scale | 5 | 5 | Lion to truck OK; cubs OK |
| Materials | 5 | 5 | Fur is a flat tan; no pelt direction |
| Texture quality | 4 | 4 | Face paint on r2 is a low-res stamp; eye is a pin |
| Lighting | 5 | 3 | Dusk: lions are dark blobs against glare (`lions_dusk/lion_close_dusk.png`) |
| Shadows | 5 | 5 | Ground shadow present; no self-shadow under belly |
| Reflections | 3 | 2 | R1 eyes had a wet highlight; r2 eyes have none |
| Color / atmosphere | 5 | 5 | Coat colour right for both |
| Detail density | 4 | 4 | No whiskers, no ear tufts, no tail tuft reading |
| Environmental integration | 5 | 5 | Sit on the ground; no flattened grass under them |
| Visual cleanliness | 5 | 5 | No z-fighting visible |

**Top three weaknesses in round 2**

1. `shots/round2/lions_day/lion_face.png` — the eyes are two ~3‑px dark buttons set
   high on the brow ridge, 40 % further apart than the muzzle width, the left one
   almost lost under the ear; the face below them is a flat wedge with a painted
   lip line and a nose stamp. Round 1 (`shots/round1/lions_day/lion_face.png`) had two
   amber eyes with a highlight that a viewer locks onto. This is the frame a player
   sees when they stop the truck. Fix: `src/wildlife/lion/headspec.js` `eye: [0.05, 0.056, 0.175]`
   — drop y from 0.056 to ~0.04 (below the brow ridge row at 0.03 in the loft table)
   and pull forward z 0.175 → 0.19 so the orbit sits at the muzzle root; `eyeR 0.0263 → 0.032`;
   and in `src/wildlife/lion/textures.js` give the iris an amber ramp with a specular
   dot (`MeshStandardMaterial roughness 0.1` on the eyeball, separate from the pelt).
2. `shots/round2/lions_dusk/lion_close_dusk.png` — the lion is a silhouette ≈ 3 stops
   under the glare behind it with no rim light, while the dusk key is at 6° elevation
   and would wrap the coat. Fix: `src/sky.js` DUSK profile `rim: { intensity: 0.45 }` → 0.9
   and `fill: intensity 14` aimed at the wildlife anchor; or give the lion material a
   back‑light `sheen` in `src/wildlife/lion/textures.js`.
3. `shots/round2/lions_walk/lion_close.png`, `lions_day/lion_close.png` — the paws are
   solid near‑black blocks distinct from the tan leg, reading as boots. Fix:
   `src/wildlife/lion/feet.js` — paw albedo should be the leg albedo × 0.85, not the
   pad colour over the whole foot; pad colour only on the underside.

**Regressions**

- Face/eyes: `shots/round1/lions_day/lion_face.png` → `shots/round2/lions_day/lion_face.png`.
- Dusk exposure of the lions: `shots/round1/lions_dusk/lion_close_dusk.png` → `shots/round2/lions_dusk/lion_close_dusk.png`;
  `shots/round1/lions_dusk/lion_pride_dusk.png` → `shots/round2/lions_dusk/lion_pride_dusk.png` (grass detail gone to black).

**Keep**

- Body silhouette in profile (`lions_walk/walk_03.png`): deeper chest, sloping back,
  tail root at the right height — better than round 1’s box.
- The cub sitting on the right in the walk strip is the right size.

---

## 8. Lion feet & gait (`lions_walk/walk_00..07` vs `lions_walk_fixed/walk_00..07`)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Animation | 4 | 5 | R2 has a readable diagonal walk; r1 legs hinged in one plane |
| Physics / ground contact | 4 | 5 | Feet stay at ground level across the strip; no sinking |
| Geometry | 4 | 4 | Legs are two capsules; no wrist/hock bend readable |
| Temporal stability | 5 | 5 | No jitter frame to frame; no texture crawl |
| Visual cleanliness | 5 | 5 | Nothing pops |

**Top three weaknesses in round 2**

1. `shots/round2/lions_walk/walk_03.png` (and 01, 05) — the tail is a straight
   stiff rod at a fixed angle in all eight frames; a walking lion’s tail swings
   ~20° laterally and the tip lags. Fix: `src/wildlife/lion/pose.js` tail loop —
   `anim.tailSway` is arriving as 0 in the walk; drive it from the gait phase in
   `behaviour.js` (`tailSway = 0.35, tailPhase = gaitPhase * 2π`) and raise the
   per‑bone yaw gain `k * 0.7` → `k * 1.1`.
2. `shots/round2/lions_walk/walk_02.png` → `walk_04.png` — stride length is short:
   the front paw lands about one body‑depth ahead of where it lifted, which at the
   pride’s walking speed reads as shuffling. Fix: `src/wildlife/lion/rig.js` /
   `feet.js` step length parameter — increase stride to ~0.9 × shoulder height and
   lower cadence to match speed so feet do not slide.
3. `shots/round2/lions_walk/walk_00..07` — the black paw blocks (see §7 item 3)
   make every plant read as a boot hitting the ground; the contact reads correctly
   but the shape is wrong. Fix as §7 item 3.

**Regressions**

- None. The strip is better than round 1 in every category it can show.

**Keep**

- Feet stay on the ground plane across all eight frames (`walk_00.png` … `walk_07.png`).
- Diagonal gait timing (left‑fore/right‑hind together).

---

## 9. Lighting & atmosphere (day, dusk, night — sky, fog, shadows, exposure, colour)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Lighting | 6 | 6 | Day key/fill balance good; night moon fine; dusk lamps too hot |
| Shadows | 6 | 5 | Day shadows harder and darker than round 1 (camp_mess) |
| Color / atmosphere | 6 | 4 | Cobalt hills, banded horizon, snow‑dense stars |
| Visual cleanliness | 6 | 5 | Star noise; horizon band |
| Composition | 6 | 6 | Dusk gradient still leads the eye to the sun |

**Top three weaknesses in round 2**

1. `shots/round2/truck_night/hero.png`, `camp_night/camp_fire_night.png`,
   `glass/night_ext.png` — the starfield. Counted on a 40×40 px patch at 70° elevation:
   ~110 lit pixels vs ~25 in round 1. The Milky Way band is not a band, it is a
   50 % denser version of the same field. This is the first thing anyone sees at
   night. Fix: `src/sky.js` NIGHT_SKY `stars 0.7 → 0.35`, `milkyWay 0.85 → 0.6`;
   shader `starGrid` fills 0.06 → 0.03 and 0.35 → 0.15; leave the sparse bright grid
   (96 cells, fill 0.03) alone so first‑magnitude stars remain.
2. `shots/round2/truck_day/mainroad.png` (and every day frame with horizon) — hills
   as saturated blue silhouettes under a pale horizon band; see §5 item 1 and 2 for
   the two parameters (`buildFarHills` air cooling + `hazeFalloff`).
3. `shots/round2/camp_day/camp_mess.png` — day shadow intensity 1.0 with radius 1.2
   gives a black hard‑edged slab. Fix as §4 item 1 (`shadow.intensity 0.72`,
   `radius 2.5`, `hemi 0.8`).

**Regressions**

- Night sky: every `shots/round1/*_night/*.png` → `shots/round2/*_night/*.png`.
- Day hills and horizon band: `shots/round1/truck_day/mainroad.png` → `shots/round2/truck_day/mainroad.png`.
- Day shadow depth: `shots/round1/camp_day/camp_mess.png` → `shots/round2/camp_day/camp_mess.png`.
- Dusk lamp exposure: `shots/round1/truck_dusk/front.png` → `shots/round2/truck_dusk/front.png`.

**Keep**

- Dusk sky gradient and sun aureole (`truck_dusk/hero.png`, `glass/dusk_ws.png`) —
  warm to blue‑grey, no banding.
- Day exposure on the truck and near ground (`truck_day/hero.png`).
- Night ground under the hero headlamps (`truck_night/hero.png`) — the pool is the
  right colour temperature and reach.

---

## 10. HUD (`truck_*/hud.png`)

| category | round 1 | round 2 | note |
|---|---|---|---|
| Composition | 6 | 6 | Title top-left, speed bottom-right, key hints bottom-left — standard and fine |
| Texture quality | 6 | 6 | Type is crisp; tracking on the title is wide but consistent |
| Color / atmosphere | 5 | 5 | White type over a bright day sky loses the hint row (`truck_day/hud.png`) |
| Visual cleanliness | 6 | 5 | Build stamp says `e524952`; candidate is `a8ca6eb` |
| Detail density | 5 | 5 | Speed, cam name, hints; no compass, no time-of-day, no gear |

**Top three weaknesses in round 2**

1. `shots/round2/truck_day/hud.png` — the key‑hint row (CLICK / DRAG / WASD …) is
   white 11‑px type on a bright dirt/sky background with no scrim; contrast at the
   `H HORN` line is under 2:1. Fix: `src/hud.js` — add a 40 % black‑to‑transparent
   gradient behind the hint block, or a 1 px dark text shadow (`text-shadow: 0 1px 2px #000c`).
2. `shots/round2/truck_night/hud.png` — build stamp does not match the build under
   test. Fix: `__BUILD_REV__` in the Vite define (`vite.config` / build script) is
   read from the wrong ref; take it from `git rev-parse --short HEAD` at build time.
3. `shots/round2/truck_dusk/hud.png` — “47 km/h” and “CHASE CAM” sit 8 px from the
   frame edge with no safe margin. Fix: `src/hud.js` root padding 8 → 24 px.

**Regressions**

- None in layout; the build stamp is the only change and it is wrong.

**Keep**

- Type hierarchy and placement; the speed readout is legible at every hour.

---

## Overall

**Three weakest families in round 2, ranked**

1. **Lighting & atmosphere** — the sky and the hills are in every frame, and round 2
   made both worse: snow‑dense stars at night, saturated spotted cobalt hills under a
   pale band by day, black slab shadows. Net regression across all three hours.
2. **Lions** — the round‑2 head loft lost the eyes, which is the one thing a lion
   face needs; dusk lions are unlit blobs; paws are boots. The body silhouette and
   gait improved, and that is the only reason this is not first.
3. **Fleet** — every night frame regressed (unlit lamps, sourceless ground pools);
   day is flat with the same cobalt background problem.

**Single highest‑leverage fix**

`src/sky.js` + `src/terrain.js buildFarHills()`: fix the air. Bring the night
`stars`/`milkyWay` back down to a real dark‑sky density, stop over‑cooling the far
hill air and fade the day horizon band (`hazeFalloff`), and drop the day
`shadow.intensity` to ~0.72 with a wider radius. Those four parameters touch every
frame in the game at every hour — hero, fleet, camp, lions, road — and they are the
difference between round 2 reading as a regression and reading as a step forward,
because the truck, the camp props and the lion gait actually did improve underneath.

**What a first‑time player notices in the first ten seconds of the hero view**

- **Day** (`shots/round2/truck_day/hero.png`): a good‑looking expedition truck on a
  red dirt track — then the eye goes past it to the horizon and finds a saturated
  blue cardboard hill range with dark spots on it under a bright white band. The
  truck earns trust; the background spends it.
- **Dusk** (`shots/round2/truck_dusk/hero.png`): a lovely warm sky and long shadows —
  and a blown white rectangle where the truck’s face should be. They will assume the
  headlamp texture failed to load.
- **Night** (`shots/round2/truck_night/hero.png`): headlamps lighting the trail, moonlit
  truck, then a sky that looks like it is snowing. They will ask whether the weather
  is meant to be snow.
