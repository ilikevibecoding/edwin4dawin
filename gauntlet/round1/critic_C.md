# Critic C — Round 1: baseline and defect inventory

Scored blind from the frames only (`shots/round1/**`, `shots/glass_r1/day/**`), plus `stats.json` and `perf/2026-09-04T12-46-27-505Z-ad7ef04+.json` (label `integrated-r1`) for the performance category. Scale per `gauntlet/RUBRIC.md`: 7 = a player would not complain, 9–10 = marketing screenshot. The weakest frame of a family sets its floor. `—` = the frames cannot show it.

Frame sizes as delivered: truck and glass frames 640×360; camp and lion frames 512×288; fleet frames 480×270. Fine detail judgments (texture resolution, tyre tread) were made with that in mind.

---

## 1. Hero car (`shots/round1/truck_day`, `truck_dusk`, `truck_night`)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | 7 |
| 3 | Geometry | 6 |
| 4 | Scale | 7 |
| 5 | Materials | 5 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | 3 |
| 8 | Lighting | 4 |
| 9 | Shadows | 4 |
| 10 | Reflections | 2 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | 4 |
| 13 | Physics / ground contact | 4 |
| 14 | Detail density | 7 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | 4 |

### Top three weaknesses

1. **Paint is a flat, banded colour, not a clear-coated automotive finish.**
   Frame: `shots/round1/truck_day/hero.png` (door and rear quarter panel), confirmed in `shots/glass_r1/day/glass_side.png` and `glass_moving.png`.
   What is wrong: the green body colour shows fine horizontal streak lines running the length of the door and quarter panel (reads as a low-resolution gradient or a stretched noise texture sampled along one axis). There is no specular hot-spot from the sky, no Fresnel brightening on the roof edge or bonnet crease, and the sky/ground gradient that any real car body shows (blue on top, warm on the lower panels) is absent. The colour is the same value on the roof, door and sill even though those face the sky, the horizon and the ground respectively.
   Fix: give the body paint a proper two-layer look — base colour with roughness around 0.35–0.45 and a clear-coat layer (clearcoat 1.0, clearcoatRoughness 0.05–0.1) that samples an environment map (the actual sky and horizon, not a generic HDR) so the roof picks up blue and the sills pick up red dirt. Remove or replace whatever produces the horizontal streaks: if it is a dirt/wear overlay, it needs to be projected in UV space with visible grain in both directions, not smeared along U. Add subtle metallic flake only if the target is a metallic paint; otherwise leave metalness at 0.

2. **Tyres hover; the contact shadow is a dark gap rather than a squash.**
   Frame: `shots/round1/truck_day/wheel.png` (front tyre, bottom edge), `shots/round1/truck_day/road.png`, `shots/round1/truck_day/rear.png` (rear axle and underbody).
   What is wrong: in `wheel.png` there is a visible dark band between the bottom of the tread and the dirt; the tyre is perfectly circular where it meets the ground and the dirt is undisturbed. In `rear.png` the rear axle/underbody appears to float above the surface with light passing under the rear tyre. There is no rut, no displaced dirt, no darkening of the tread where it touches.
   Fix: (a) lower the wheel rest position by the amount of the visible gap or raycast each wheel to the terrain height so the tread bottom sits 1–2 cm below the terrain surface; (b) add a tyre-contact decal (soft dark ellipse, ~1.3× tyre width, alpha 0.6, fading at the rim) projected on the ground under each wheel; (c) flatten the bottom 3–4 % of the tyre mesh (vertex squash) so the contact patch is a chord, not a tangent point; (d) darken the lower 15 cm of tyre sidewall and the wheel arch lip with a red-dust mask so the truck looks like it has driven on the surface it stands on.

3. **Lights do not work at dusk or night, and the truck does not respond to its own hour.**
   Frame: `shots/round1/truck_night/hero.png`, `shots/round1/truck_night/front.png`, `shots/round1/truck_night/rear.png`, `shots/round1/truck_dusk/hero.png`, `shots/round1/truck_dusk/mainroad.png`.
   What is wrong: at night the headlamp lenses are dark grey discs with only the small amber running lamps lit; in `truck_night/wheel.png` the same lamps read as glowing amber, and in `truck_night/forest.png` the tail lamps glow red while in `truck_night/rear.png` they are dim red decals — the lamp state is inconsistent between views of the same hour. No headlight beam falls on the ground in front of the truck in `hero.png` or `front.png`, yet in `truck_night/forest.png` the grass to the sides is lit while the road is not. At dusk (`truck_dusk/hero.png`) the light bar, headlamps and tail lamps are all off, and the whole truck is simply tinted orange with no rim light and no cast shadow.
   Fix: drive one `lightsOn` state from the hour (on for dusk and night in every view). Give each lamp an emissive lens material (emissive colour 1.0/0.95/0.8 at intensity ≥ 4 for headlamps, 1.0/0.1/0.05 at 3 for tail lamps, bloom-friendly), plus two spot lights per headlamp pair (angle ~35°, penumbra 0.5, distance 40 m, intensity tuned so the road ahead reads at roughly 0.5 luma at 8 m). Add a small volumetric cone or a ground-projected light decal so the beam is legible from the hero camera. At dusk add a warm key light from the sun's position with a long shadow; a colour grade alone is not dusk lighting.

### Strong — must not regress
- Hard-surface detail on the front end in `shots/round1/truck_day/detail.png`: grille bars, winch drum with cable, bumper diamond plate, headlamp bezels, amber indicators and tow points all read at close range. This is the best-modelled thing in the game.
- Silhouette and roof-rack dressing in `truck_day/hero.png`: light bar, jerry cans, storage boxes, snorkel and ladder give an unmistakable expedition-truck outline.
- Tyre tread and rim geometry in `truck_day/wheel.png`.
- Interior night gauges in `truck_night/interior.png`: green back-lit dials read correctly and the warm A-pillar flare at dusk (`truck_dusk/interior.png`) is a good idea even if the pillar itself is soft.

---

## 2. Car glass (`shots/glass_r1/day/glass_*.png`, `truck_*/interior.png`)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | — |
| 3 | Geometry | 4 |
| 4 | Scale | 6 |
| 5 | Materials | 3 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | 3 |
| 8 | Lighting | 4 |
| 9 | Shadows | 4 |
| 10 | Reflections | 1 |
| 11 | Color / atmosphere | 4 |
| 12 | Animation | 3 |
| 13 | Physics / ground contact | — |
| 14 | Detail density | 5 |
| 15 | Environmental integration | 3 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **The windscreen has no environment reflection at any angle; it is a hole with a faint diagonal smear.**
   Frame: `shots/glass_r1/day/glass_screen.png` (windscreen from the front quarter, roughly 50–60° to the camera), also `shots/round1/truck_day/detail.png`.
   What is wrong: at this grazing angle a real windscreen would show a bright band of sky and the acacia line; here the glass is almost perfectly transparent, the interior (dash, seats, wheel) is fully visible at uniform brightness, and the only surface cue is one faint light diagonal streak. There is no Fresnel falloff toward the edges, no darker tint band at the top, no visible edge thickness where the glass meets the rubber seal. Meanwhile the snorkel beside it carries a blown-white specular blob, which makes the glass look even flatter by comparison.
   Fix: a physical glass material with transmission ≈ 0.9, ior 1.5, roughness 0.02–0.05, metalness 0, and a real environment map (sky + horizon, updated with the hour) so Fresnel reflection appears automatically at grazing angles; tint the interior seen through it about 15–20 % darker; add a 4–6 cm dark ceramic frit band around the perimeter and a 10 cm graded tint band at the top. Give the pane a visible thickness (≈ 6 mm) at the seal so the edge catches light. Reduce the snorkel's specular by raising its roughness to ~0.5 (it is textured rubber/plastic, not chrome).

2. **The wing mirror reflects a flat tan blur, not the scene behind the truck.**
   Frame: `shots/glass_r1/day/glass_mirror.png`.
   What is wrong: the mirror face is a uniform orange-tan gradient with no horizon, no road, no sky — it reads as an unlit painted panel. In `glass_shade.png` the same mirror shows a sky-coloured blur, so the material is picking up ambient colour rather than a reflection. The amber repeater lamp on the housing is nicer than the mirror itself.
   Fix: render the mirror with a dedicated reflection probe or a planar/cube reflection camera (low resolution, 128–256 px, updated every other frame) mapped to the mirror face; metalness 1.0, roughness 0.0, no base colour tint. If a live reflection is too expensive, at minimum use the sky environment map with a horizon line so the mirror shows blue above and red dirt below.

3. **Side glass tint, transparency and edge sorting are inconsistent between panes.**
   Frame: `shots/glass_r1/day/glass_side.png` (sunlit driver's side), `shots/glass_r1/day/glass_inside.png` (from the passenger seat), `shots/glass_r1/day/glass_rear.png`.
   What is wrong: the driver's side glass has a heavy amber-brown cast and the interior behind it reads as one flat amber tone; the rear cab glass in `glass_rear.png` is a paler tan and shows the seat cushion as a bright cream rectangle with no reflection of the rack bars crossing in front of it; from inside (`glass_inside.png`) the side window has a hard black band along its bottom edge where the glass meets the door, as if the pane stops short of the seal or a second dark plane is sorting in front of it. All three panes are supposedly the same glass on the same truck.
   Fix: one shared glass material for all panes (same tint, same transmission), tint driven by a light grey-green, not amber; check that the interior amber is not a lighting bake leaking through. Fix the black band by extending the glass mesh into the door channel and checking `depthWrite`/render order on the inner door trim so the trim does not draw in front of the glass. In `glass_rear.png` the seat headrest needs its own shading; a uniform cream rectangle behind glass looks like a placeholder card.

### Strong — must not regress
- `shots/glass_r1/day/glass_shade.png`: shaded-side glass shows the roof lining behind it and the mirror picks up a sky-coloured tone — this is the direction all the panes should go.
- `shots/glass_r1/day/glass_inside.png`: rearview mirror and speedometer read correctly from the passenger seat.
- The dusty diagonal streak with sun flare on the windscreen in `shots/round1/truck_day/interior.png` is a good gesture toward a lived-in screen; keep the idea, make it directional.

---

## 3. Campground (`shots/round1/camp_day`, `camp_night`)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 5 |
| 2 | Silhouette | 6 |
| 3 | Geometry | 5 |
| 4 | Scale | 7 |
| 5 | Materials | 5 |
| 6 | Texture quality | 5 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 4 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | 6 |
| 12 | Animation | 3 |
| 13 | Physics / ground contact | 6 |
| 14 | Detail density | 6 |
| 15 | Environmental integration | 6 |
| 16 | Visual cleanliness | 5 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **The gate is over-exposed with an oversized hard shadow slab across the road.**
   Frame: `shots/round1/camp_day/camp_gate.png`, and at night `shots/round1/camp_night/camp_gate_night.png`.
   What is wrong: in the day frame the sand between the sign posts and the boom is blown to near-white (no texture survives), and a single broad dark shadow runs from the left sign post diagonally to the bottom-centre of the frame — far larger than the thin posts that would cast it, with a hard edge and no penumbra. At night the same road is a pale, almost white moonlit slab with the same hard dark band across it, so the artefact is in the shadow caster/ground, not the sun. The sign text ("DEAD SLOW", and the camp name on the second board) is fuzzy at a distance where it should be legible.
   Fix: check the shadow caster on the gate assembly — something (probably the sign back-board or a collision proxy) is casting a shadow the size of a wall. Make the proxy `castShadow=false` or shrink it to the post footprint. Bring the ground albedo down or tone-map the sun so mid-day sand sits at ~0.75 luma, not 0.95. Give the shadow map a PCF/soft penumbra (radius 2–3 px at 2048). Re-render the sign texture at 1024 px wide with text rendered as vector-to-canvas at 2× so it survives 512 px frames.

2. **The "arrive" view does not arrive: camp is a distant strip, and the road shows shadows from nothing.**
   Frame: `shots/round1/camp_day/camp_arrive.png`, `shots/round1/camp_night/camp_arrive_night.png`.
   What is wrong: the watchtower and camp occupy a thin band at the horizon a third of the way up the frame; the truck is small; two-thirds of the frame is empty road and grass. The road carries long dark diagonal shadow streaks whose casters are not in frame and whose length does not match any visible object. At night the truck's headlamps are two small dots with no beam on the road, and the horizon under the hills glows a pale band brighter than the sky above it.
   Fix: move the camera 30–40 m closer and drop it to ~1.6 m so the watchtower and gate fill the upper half of the frame and the truck is a third of the frame width. Find the off-screen shadow casters (likely grass or fence proxies) and either bring them in or stop them casting. Headlamp fix as per hero-car weakness 3. Horizon band fix under Cross-family.

3. **Canvas and fire are placeholders: the mess fly is a rigid folded plane and the fire is a yellow blob.**
   Frame: `shots/round1/camp_day/camp_mess.png`, `shots/round1/camp_night/camp_fire_night.png`.
   What is wrong: the mess-tent fly is two flat olive planes meeting at a straight ridge with no sag between poles, no guy-line tension wrinkles, and a uniform flat-shaded top surface; it does not read as fabric. The campfire in `camp_fire_night.png` is a single bright yellow-white disc with a circular glow; there is no flame shape, no smoke, no ember spill, and the logs are not visible inside the glow.
   Fix: build the fly as a subdivided plane (e.g., 16×8) with a catenary sag between pole tops (5–8 % of span) and vertex noise near the edges; canvas material roughness 0.9, subtle woven normal map, and 10–15 % transmission so the sun shows through the fabric. Fire: replace the disc with 3–4 additive flame billboards (cross-fading sprite sheet, 8–16 frames) plus a low-lying smoke sprite, and an animated point light (flicker ±15 %) with a warm colour; keep the ground glow but reduce its radius so it does not read as a spotlight.

### Strong — must not regress
- `shots/round1/camp_night/camp_mess_night.png`: string lights along the canopy edge, warm underside, lit hut windows and stone wall make a coherent night mood — the most game-like frame in the camp set.
- `shots/round1/camp_night/camp_fire_night.png`: chairs and ground around the fire receive believable warm light; the surrounding camp stays dark.
- `shots/round1/camp_day/camp_overhead.png`: layout reads — parked vehicles in a row, tent footprints, a clear dirt-to-scrub boundary.
- `shots/round1/camp_day/camp_beyond.png`: at distance the camp with its radio mast, tents and vehicles sits properly in the landscape.

---

## 4. Campground vehicles / fleet (`shots/round1/fleet`)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 3 |
| 2 | Silhouette | 5 |
| 3 | Geometry | 4 |
| 4 | Scale | 6 |
| 5 | Materials | 4 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | 3 |
| 8 | Lighting | 5 |
| 9 | Shadows | 5 |
| 10 | Reflections | 2 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 4 |
| 14 | Detail density | 5 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **The supply-truck shot is shot from behind a wall.**
   Frame: `shots/round1/fleet/supply-truck_0_day.png`, `shots/round1/fleet/supply-truck_0_night.png`.
   What is wrong: the lower half of the frame is a featureless cream slab (the roof of an adjacent vehicle or a tent) with a spare-wheel/drum object sitting on it in the foreground; the supply truck itself is behind and above, partially hidden, and its cab appears rotated relative to its bed as if the model is canted. The frame cannot be used to judge the vehicle.
   Fix: this is a camera placement bug first — raise the fleet camera or offset it laterally until the subject vehicle's full silhouette is unobstructed (frame the subject at ~60 % of frame width, ~30° off the front quarter, 1.5–1.8 m camera height). Then check the supply-truck rig: the cab/bed misalignment suggests a child transform has a leftover rotation.

2. **The utility truck is a painted box: flat windows, no glass, no panel detail.**
   Frame: `shots/round1/fleet/utility_0_day.png`.
   What is wrong: the orange cab is a rectangular block with the windows painted as flat black rectangles on the surface (no transparency, no reflection, no interior visible), a single-tone orange with no wear, and headlamps that are flat discs. Next to the hero truck in the same camp this looks two generations older. At night (`utility_0_night.png`) the headlamps do glow and light the ground, which is the only redeeming frame.
   Fix: give the cab real glass panes (same shared glass material as the hero truck), bevel the cab edges (2–3 cm chamfer), add door seams, a grille, mirror stalks and a scuffed edge-wear mask on the orange paint; roughness ~0.5 for a work truck finish.

3. **Trailer and parked props are tilted and cut off; the trailer sits in a cactus garden.**
   Frame: `shots/round1/fleet/trailer_0_day.png`, `shots/round1/fleet/trailer_0_night.png`.
   What is wrong: the trailer body is tipped up ~15° with its hitch off frame left; a black post occludes the right edge; a second trailer wheel is cut off on the right; the yellow jerry can in the foreground floats slightly proud of the dirt. The vegetation around the trailer is agave/aloe-type rosettes with yellow flower spikes — a desert-succulent palette that does not match the acacia-and-grass savanna in every other frame.
   Fix: either hitch the trailer (nose on a jack stand at ~5° pitch) or lay the A-frame on the ground with the correct pitch computed from wheel radius and hitch height; snap the jerry can to the terrain with a raycast; move the fleet camera so no foreground post cuts the frame. Swap the succulent set for the standard grass/shrub set around the fleet parking, or restrict the succulents to one designed bed.

### Strong — must not regress
- Night headlamps on `utility_0_night.png`, `safari-jeep_1_night.png`, `suv_0_night.png` and `pickup_0_night.png`: glowing lenses with a lit ground pool in front — this is exactly what the hero truck lacks.
- The safari jeeps (`safari-jeep_1_day.png`, `safari-jeep_2_day.png`) and SUV (`suv_0_day.png`): roll cage, rack clutter and two-tone body read as a coherent fleet with the hero truck.
- Camp signage and boom barrier appear in the fleet backgrounds and tie the parking to the gate.

---

## 5. Road and terrain (`truck_*/road|mainroad|forest`, `camp_arrive`, `camp_beyond`, `camp_gate`)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | — |
| 3 | Geometry | 5 |
| 4 | Scale | 5 |
| 5 | Materials | 4 |
| 6 | Texture quality | 5 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 4 |
| 9 | Shadows | 4 |
| 10 | Reflections | 2 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 4 |
| 14 | Detail density | 5 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **Scattered rocks are flat grey confetti that does not belong to the dirt.**
   Frame: `shots/round1/truck_day/road.png`, `shots/round1/truck_day/hero.png` (foreground), `shots/round1/truck_dusk/road.png`, `shots/round1/truck_night/road.png`, `shots/round1/camp_day/camp_gate.png`.
   What is wrong: dozens of small uniform grey shards lie on the red dirt with the same flat blue-grey tone regardless of hour — at dusk they stay light grey while the ground goes deep red, at night they stay brighter than anything around them. They have no shadow, no embedding, and read as triangles pasted on the surface.
   Fix: give the rock scatter a proper material — base colour sampled from the underlying terrain (blend 40 % toward the dirt colour), roughness 0.9, a per-instance random dark tint, and normals so they shade with the sun. Sink each instance 30 % into the terrain and add a small contact darkening. Cull rocks under ~10 cm at this camera distance; fewer, larger, embedded rocks read far better than many flat shards. Make sure the scatter uses the same lighting and fog as the terrain so it grades with the hour.

2. **Distant terrain is blown to white and the far hills are untextured smooth lumps.**
   Frame: `shots/round1/truck_day/mainroad.png` (khaki hill), `shots/round1/camp_day/camp_beyond.png`, `shots/round1/camp_day/camp_gate.png`, `shots/round1/truck_day/rear.png`, `shots/round1/lions_day/lion_medium.png`.
   What is wrong: the middle-distance hills are a single smooth khaki value with no texture, no vegetation, no shading breaks; behind them the far range is over-exposed to near white so the horizon is a bright band that fights the sky for attention. In `lion_pride.png` the same distant slopes appear as alternating bright tan and hard black bands.
   Fix: aerial perspective should go toward the sky colour at the horizon (a desaturated blue-grey at ~0.7 luma), not toward white; lower fog colour brightness and/or reduce distant terrain albedo. Give the mid hills a low-frequency albedo variation (two-tone noise, ±10 %) and a scatter of dark tree-blob impostors so they read as vegetated slopes. Investigate the black bands on the far slopes — they look like shadow-map far-cascade acne or an unlit backface; clamp the shadow distance or add a bias in the last cascade.

3. **The waterhole is a flat pale-blue disc with a hard edge and no reflection.**
   Frame: `shots/round1/lions_day/lion_side.png`, `shots/round1/lions_day/lion_medium.png`, `shots/round1/lions_walk/walk_00.png`, `shots/round1/lions_day/lion_far.png`.
   What is wrong: the water is a uniform light blue-grey plane, brighter than the sky it should reflect, meeting the red mud at a razor edge with no wet band, no shallows gradient, no reflection of the acacia or the lions beside it.
   Fix: give the water a reflective material (planar reflection or at least the sky environment map with Fresnel; roughness 0.05), a darker deep colour (0.15/0.25/0.3), a shoreline depth fade using terrain height (alpha to 0 over the last 1.5 m), and a 1–2 m darker wet-mud ring around the edge on the terrain texture.

### Strong — must not regress
- Close-range dirt in `shots/round1/truck_day/hero.png` and `truck_day/road.png`: the red laterite with pale gravel streaks and tyre ruts is convincing and grades well at dusk.
- Road ruts and camber in `truck_day/mainroad.png` and `camp_day/camp_arrive.png` read as a real two-track.
- Sky and clouds in `camp_day/camp_beyond.png` and `camp_day/camp_arrive.png`.

---

## 6. Vegetation (`forest`, `mainroad`, `camp_beyond`, `lion_far`, `lion_pride`)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 5 |
| 2 | Silhouette | 5 |
| 3 | Geometry | 4 |
| 4 | Scale | 5 |
| 5 | Materials | 4 |
| 6 | Texture quality | 5 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 3 |
| 9 | Shadows | 3 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | 5 |
| 14 | Detail density | 6 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 3 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **Grass tufts glow at dusk and night as if self-lit.**
   Frame: `shots/round1/truck_dusk/forest.png`, `shots/round1/truck_dusk/mainroad.png`, `shots/round1/truck_night/hero.png` (right edge), `shots/round1/truck_night/forest.png`, `shots/round1/lions_dusk/lion_medium_dusk.png`.
   What is wrong: the straw-coloured tufts go whitish-pink at dusk and remain bright yellow-green at night while the ground around them drops to dark red; in `truck_night/forest.png` the grass beside the road is lit as if by headlamps while the road itself is not. The tufts are brighter than the sky in several frames. They read as fibre-optic decorations.
   Fix: the grass material is either unlit/emissive or has a lighting model that ignores the sun's intensity. Make it a lit material (Lambert or standard, roughness 1, no emissive), take the hour's ambient and sun colour, and clamp translucency so back-lit tufts brighten by at most ~1.5× rather than blowing out. At night the tufts should be within ±20 % of the ground luma unless a headlamp is on them.

2. **Acacia canopies are flat sliced slabs with hard leaf-card edges; distant trees are black cut-outs.**
   Frame: `shots/round1/lions_day/lion_far.png` (camera inside a canopy), `shots/round1/truck_day/hud.png` (top-right canopy), `shots/round1/truck_dusk/forest.png`, `shots/round1/lions_walk/walk_00.png` (horizon), `shots/round1/lions_day/lion_pride.png`.
   What is wrong: up close the canopy is a few large green polygon cards with straight cut edges and no leaf structure (`lion_far.png` is entirely blocked by them, which is also a camera bug). At mid distance the canopies read as flat horizontal slabs of a single green. At the horizon the tree line is rendered as hard-edged black rectangles against pale hills, like paper cut-outs — no colour, no atmospheric fade.
   Fix: canopy cards need an alpha-cut leaf texture (irregular silhouette, alpha test ~0.5) with a normal map or per-card normal pointing outward, plus 2–3 layers of cards at different heights for depth. Distant trees should be fogged like the terrain (they are clearly not receiving fog) and should have a dark green/olive albedo, not black. Move the `lion_far` camera out of the canopy — or cull the canopy that the camera is inside (near-plane fade on vegetation within 1.5 m of the camera).

3. **Grass sits on the ground like cards, not in it; no shadow, no root darkening, wrong scale next to the lion.**
   Frame: `shots/round1/lions_day/lion_close.png`, `shots/round1/lions_day/lion_far.png` (foreground), `shots/round1/truck_day/hero.png`.
   What is wrong: each tuft is the same bright value at its base as at its tips, casts no shadow on the dirt, and the ground directly under it is untouched; the tufts are as tall as the lying lion's shoulder and much wider than its head, so the lion looks like a toy in a lawn.
   Fix: darken the bottom 30 % of the tuft texture (vertical gradient multiply to ~0.5) to fake root shadow and ambient occlusion; add a small dark ground decal under each tuft or let the grass cast into the shadow map with a low-res caster; scale grass so mature tufts are ~40–60 cm high (knee height against the lion's shoulder at ~90 cm) and thin out the density near the lions so they read.

### Strong — must not regress
- Acacia silhouette at mid distance in `shots/round1/truck_day/forest.png` and `shots/round1/lions_day/lion_medium.png`: the flat-topped umbrella shape is instantly "savanna".
- Mixed straw/green tuft palette in `lions_day/lion_close.png` and `lion_side.png` gives good variety at close range.
- Backlit grass at dusk in `lions_dusk/lion_close_dusk.png` is a genuinely pretty rim-light moment — keep the idea once the intensity is clamped.

---

## 7. Lions (`shots/round1/lions_day`, `lions_dusk`)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 4 |
| 2 | Silhouette | 3 |
| 3 | Geometry | 3 |
| 4 | Scale | 5 |
| 5 | Materials | 4 |
| 6 | Texture quality | 4 |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 4 |
| 10 | Reflections | 3 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | 3 |
| 13 | Physics / ground contact | 5 |
| 14 | Detail density | 3 |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 5 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **The lion's head reads as a bear or a dog; the body is a smooth blob.**
   Frame: `shots/round1/lions_day/lion_face.png`, `shots/round1/lions_day/lion_close.png`.
   What is wrong: the skull is a rounded ball with a very short, flat muzzle; the mouth is a straight dark line; the nose is a black blob; the ears are round discs stuck onto the top of the head; the eyes are two orange spheres set wide. There is no brow ridge, no cheek ruff, no whisker pads, no chin. The body is a single smooth volume with stubby legs and paws that are rounded blobs without toes or claws. Fur is a flat noise texture with no directional grain and no length at the belly, tail tuft or ear rims.
   Fix: re-sculpt the head — lengthen the muzzle by ~40 %, add a defined nose bridge and cheek mass, set the eyes forward-facing with an almond lid shape and a dark tear line, triangular ears with a dark back and pale inner rim, a dark line from the corner of the mouth. Add a tail tuft (dark, 15 cm), four toes per paw with a visible dew claw, and a subtle belly line. For the material: a directional fur normal/flow map (grain from spine outward) and a darker dorsal stripe; roughness 0.8; small wet specular on the nose only. A short shell-fur pass on the ear rims and tail tuft would sell the silhouette.

2. **Camera placement bugs make three of ten lion frames unusable.**
   Frame: `shots/round1/lions_day/lion_far.png` (camera inside an acacia canopy; lions are specks near the horizon), `shots/round1/lions_dusk/lion_pride_dusk.png` (a large white/grey rounded shape — the truck's bonnet or fender — intrudes from the bottom right), `shots/round1/lions_day/lion_seat.png` (seat back and headrest cover the lions; the pride is a few pixels between the B-pillar and the headrest).
   What is wrong: in `lion_far.png` the top-right 40 % of the frame is flat green canopy cards and a trunk; in `lion_pride_dusk.png` the unexplained pale object is the brightest thing in frame and pulls the eye away from the pride; in `lion_seat.png` the composition is 80 % seat fabric.
   Fix: for `lion_far` move the camera down/out of the canopy or fade vegetation within 1.5 m of the near plane; for `lion_pride_dusk` either exclude the truck from that camera's layer mask or move the camera 1 m forward of the bonnet; for `lion_seat` shift the camera 20 cm toward the window and lower the headrest in the composition, so the lions sit in the open glass area rather than behind the seat.

3. **The pride is a few tan specks on a field; the second lion is spotted like a hyena.**
   Frame: `shots/round1/lions_day/lion_pride.png`, `shots/round1/lions_day/lion_close.png` (left mid-ground animal), `shots/round1/lions_dusk/lion_close_dusk.png`.
   What is wrong: in `lion_pride.png` the lions are 10–15 px each on a busy red-and-green ground; nothing draws the eye and the far hills with their black shadow bands dominate. The second animal in `lion_close.png` has a spotted coat, thin dark legs and a low-slung back — it reads as a hyena or leopard, not a member of the pride, and it is shaded much darker than the lion beside it under the same sun.
   Fix: for the pride view, frame from lower and closer (camera at 1.2 m, 12–15 m from the nearest animal) so the nearest lion is at least 80 px tall; break the ground with a bare patch or a fallen log where the pride lies so the animals sit on a quieter value. Give the second animal the same base coat as the adult (uniform tawny, faint rosettes only if it is meant to be a cub, and then scale it to cub size ~50 % height) and make sure it receives the same sun (check that its material is not a different, unlit or double-sided variant).

### Strong — must not regress
- `shots/round1/lions_dusk/lion_close_dusk.png`: warm key, strong rim on the shoulder and back-lit grass — the best animal frame in the set, and the fur reads better here than in any day frame.
- `shots/round1/lions_dusk/lion_medium_dusk.png`: sun glare, acacia silhouette and the lying lion make a composition worth keeping once the grass glow is tamed.
- Eyes in `lions_day/lion_face.png` have a highlight and a visible pupil; the small bird in `lion_side.png` is a nice touch of life.

---

## 8. Lion feet / ground contact (`shots/round1/lions_walk/walk_00..07.png` and close/medium/far/seat)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | 6 |
| 2 | Silhouette | 3 |
| 3 | Geometry | 3 |
| 4 | Scale | 4 |
| 5 | Materials | — |
| 6 | Texture quality | — |
| 7 | Glass / transparency | — |
| 8 | Lighting | 5 |
| 9 | Shadows | 3 |
| 10 | Reflections | — |
| 11 | Color / atmosphere | — |
| 12 | Animation | 3 |
| 13 | Physics / ground contact | 3 |
| 14 | Detail density | — |
| 15 | Environmental integration | 4 |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | 4 |
| 18 | Browser performance | — |

### Top three weaknesses

1. **The legs cycle but the body barely advances: the lion is treadmilling.**
   Frame: `shots/round1/lions_walk/walk_00.png` through `walk_07.png` (fixed camera).
   What is wrong: across the eight consecutive moments the legs go through most of a full stride (front-left forward in 00, hind-right forward in 02–03, front-right forward in 05–06), but the head moves only ~10 px to the right at 512 px width and the spine stays at exactly the same height. A stride of that leg amplitude should move the body roughly one body-length; the feet must therefore be sliding backward on the ground under the body. There is no head bob, no shoulder roll, no vertical oscillation.
   Fix: lock root motion to the animation — advance the root by stride length × cycle fraction per frame (or compute forward speed from the animation's foot speed) so a planted foot has zero world velocity. Add ±2–3 cm vertical bob on the spine at twice the stride frequency, and a small head nod in counter-phase. If the walk clip is looped without root motion, drive the transform from the clip's root bone instead of a constant speed.

2. **The legs are thin rods that bend at the wrong place and cross under the body.**
   Frame: `shots/round1/lions_walk/walk_05.png` (hind legs form an X under the hips), `walk_02.png` and `walk_06.png` (front leg bends forward at mid-length, like a knee facing the wrong way), all frames for overall leg thickness.
   What is wrong: the walking lion's legs are much thinner than a lion's (roughly the thickness of the tail), with no visible elbow/wrist or stifle/hock masses; in `walk_05.png` the two hind legs overlap into a single crossed shape; in `walk_02.png` the lifted forelimb hinges forward at the middle so the foot swings ahead of the knee, reading as a back-bent dog leg. The body is over-long and the back flat, so the silhouette reads as a hyena or a greyhound.
   Fix: re-proportion the walking mesh to the same body as the lying lion (shoulder height ≈ 0.9 m, body length ≈ 1.8 m nose-to-rump, leg diameter ≈ 12–15 cm at the forearm); add elbow/wrist and stifle/hock volumes; correct the forelimb hierarchy so the wrist bends backward (paw trails the forearm on lift) and the elbow bends backward, and set joint limits so hind legs cannot cross the sagittal plane (widen the hip spacing by ~10 cm and add a lateral offset in the walk clip).

3. **No feet-ground relationship: contact shadow is faint, paws vanish into grass, and the cub clips into the adult.**
   Frame: `shots/round1/lions_walk/walk_06.png`, `walk_07.png` (cub's head inside the adult's hind legs), `walk_00.png` and `walk_03.png` (paws), `shots/round1/lions_walk/lion_close.png` (front paws of the lying lion).
   What is wrong: the paws end in tapered points hidden by grass cards, so there is no visible planted foot; the shadow under the walker is a faint soft smudge that does not darken at the paw; no dust, no bent grass. The trailing cub in `walk_06`/`walk_07` overlaps the adult's hind legs — its head intersects the adult's thigh. In `lion_close.png` the lying lion's front paws sit on top of the dirt with no pressure darkening, though the contact itself is acceptable.
   Fix: sink each paw 1–2 cm with a foot IK raycast to the terrain and add a per-paw contact decal (dark ellipse ~20 cm, alpha 0.5) that fades when the paw lifts; cull grass within 25 cm of each paw or push grass cards away with a simple radial displacement; add a small dust puff on plant at walking speed. For the cub, add a follow offset of at least one adult body-length behind the adult's rump with a separation radius so it never enters the adult's bounds.

### Strong — must not regress
- The strip is temporally clean: no flicker, no popping, no shadow acne across `walk_00`–`walk_07`; the tail arc and leg phases are consistent frame to frame.
- The lying lions in `lions_walk/lion_close.png` and `lion_medium.png` sit convincingly on the ground with belly contact.
- Camera and lighting are stable and identical across the strip, which is exactly what is needed to judge the fix.

---

## 9. Lighting and atmosphere (all frames, day/dusk/night)

| # | Category | Score |
|---|----------|-------|
| 1 | Composition | — |
| 2 | Silhouette | — |
| 3 | Geometry | — |
| 4 | Scale | — |
| 5 | Materials | — |
| 6 | Texture quality | — |
| 7 | Glass / transparency | — |
| 8 | Lighting | 4 |
| 9 | Shadows | 4 |
| 10 | Reflections | 2 |
| 11 | Color / atmosphere | 5 |
| 12 | Animation | — |
| 13 | Physics / ground contact | — |
| 14 | Detail density | — |
| 15 | Environmental integration | — |
| 16 | Visual cleanliness | 4 |
| 17 | Temporal stability | — |
| 18 | Browser performance | — |

### Top three weaknesses

1. **Dusk is a colour grade, not a light.**
   Frame: `shots/round1/truck_dusk/hero.png`, `shots/round1/truck_dusk/front.png`, `shots/round1/truck_dusk/mainroad.png`, `shots/round1/truck_dusk/road.png`.
   What is wrong: the entire frame is tinted orange with a pale, washed horizon and a heavy fog impression. There is no sun disc, no long shadow from the truck or the trees, no rim light on the truck's roof line, and the truck's sides facing away from the horizon are as bright as those facing it. Compare with `lions_dusk/lion_close_dusk.png` and `lion_medium_dusk.png`, which do have a low sun with glare and rim light — so the two families are not lit by the same sky.
   Fix: place the directional sun at 4–6° elevation for the dusk hour with colour ~1.0/0.55/0.3 and intensity high enough to give a clear key/fill contrast (~3:1), enable long shadows (extend the shadow camera far plane for low sun), add a visible sun disc and horizon glow in the sky dome, and reduce fog density at dusk so the horizon is a saturated orange-to-violet gradient rather than pale cream. Apply the same sky/sun to the truck views as the lion views use.

2. **Night ground is daylight-saturated red under a blue sky; there is a pale cyan horizon band.**
   Frame: `shots/round1/truck_night/hero.png`, `shots/round1/truck_night/front.png`, `shots/round1/truck_night/road.png`, `shots/round1/camp_night/camp_arrive_night.png`, `shots/round1/camp_night/camp_gate_night.png`.
   What is wrong: at night the foreground dirt keeps its warm saturated red-brown as if under daylight, while the sky is deep blue with stars; the moonlit sand at the camp gate is nearly white with a hard black shadow band across it. Along the horizon in the truck and camp night frames there is a pale cyan-white band, brighter than the sky above and the hills below, that reads as an unfogged skybox seam or a fog colour that does not match the night sky.
   Fix: desaturate and cool the moonlight (colour ~0.55/0.65/0.9, intensity so the ground sits at ~0.15 luma) and drop ambient to a deep blue so the dirt goes grey-purple, not red; reduce moon shadow contrast (soft penumbra, shadow strength ~0.6). Match the fog colour at night to the sky-dome colour at the horizon (sample the sky texture at elevation 0) so no band appears; check for a sky-dome bottom cap or a horizon ring mesh drawn without fog.

3. **Distant exposure and horizon are blown out in every day frame; nothing reflects the sky.**
   Frame: `shots/round1/truck_day/rear.png`, `shots/round1/camp_day/camp_gate.png`, `shots/round1/camp_day/camp_beyond.png`, `shots/round1/fleet/safari-jeep_1_day.png`, `shots/round1/fleet/utility_0_day.png`, `shots/round1/lions_day/lion_medium.png`.
   What is wrong: the far hills go to near-white, and the sun-facing sand at the camp gate clips. At the same time no surface in the game — paint, glass, mirror, water, wet mud — shows the sky, so the scene has bright haze but no environment. `truck_day/hero.png` gives no readable sun direction: the truck shadow is soft and central, the tree shadows are barely there.
   Fix: install a single scene environment map built from the actual sky dome per hour (PMREM from the sky, re-generated on hour change) and apply it to all standard materials; tone-map with a filmic curve (ACES or AgX) with exposure set so that mid-day sand peaks at ~0.85 luma and distant fogged terrain never exceeds the sky's horizon value. Raise sun elevation contrast at noon so cast shadows are visible with a readable direction.

### Strong — must not regress
- Night sky with stars and clouds in `camp_night/camp_fire_night.png`, `camp_gate_night.png` and `truck_night/hero.png`.
- The warm string-light and campfire pools in `camp_night/camp_mess_night.png` and `camp_fire_night.png` — local lights are believable where they exist.
- Dusk on the lions (`lions_dusk/lion_close_dusk.png`) shows the target look for the whole game at that hour.
- Day clouds in `camp_day/camp_beyond.png` / `camp_arrive.png` are soft and well placed.

---

## 10. Browser performance (`perf/2026-09-04T12-46-27-505Z-ad7ef04+.json`, label `integrated-r1`; `shots/*/stats.json`)

| # | Category | Score |
|---|----------|-------|
| 1–17 | (not a picture category) | — |
| 18 | Browser performance | 4 |

Figures used (quality `fast`, SwiftShader — fps ignored):

- Draw calls: 453 in the drive loop; 347–512 across the beauty views (highest: `truck_dusk/rear` 512, `truck_night/rear` 504, `mainroad` ≈ 495–500).
- Triangles: 2.57 M in the drive loop; 2.07–2.85 M across views. `mainroad` and `rear` views exceed 2.8 M.
- Shader programs: 277 (drive), 283–285 (truck views). Textures: 275–289. Geometries: 319–335.
- Visible objects 254, visible instances 26 852, animals 4.
- JS heap: 333.8 MB; three loops at 334.8 / 334.9 / 334.5 MB, growth −0.3 MB (stable).
- Boot: `readyMs` 43 031 ms. Stages: "Compiling shaders" 24 298 ms, "Grading the road" 5 467 ms, "Assembling the truck" 3 991 ms, "Finding the pride" 3 124 ms, "Planting the forest" 3 033 ms, "Pitching camp" 1 743 ms, "Parking the fleet" 565 ms; sky 45 ms, signs 56 ms, noise kernel 9 ms.
- Long frames: 2 of 19 sampled frames, max 188 ms (p50 16.7 ms, p95/p99 188 ms). `fpsLow1` 5.3.
- Console errors: none (two Canvas2D `willReadFrequently` warnings in stats.json).

### Top three weaknesses

1. **277–285 shader programs and a 24 s shader compile stage.**
   Source: `perf/…ad7ef04+.json` boot stage "Compiling shaders" = 24 298 ms of a 43 031 ms boot; `stats.json` `programs` 277–285 in every view.
   What is wrong: close to 300 distinct programs for one scene means almost every material variant compiles its own shader; even discounting the software rasteriser this dominates boot and will cause hitching on first sight of any new material (the 188 ms long frames are consistent with late compiles).
   Fix: consolidate materials — one shared standard material per surface class (paint, glass, canvas, dirt, grass, rock, metal) with per-instance colour via vertex colour or instance attributes rather than per-object material clones; make sure defines (fog, shadow, skinning, vertex colours, map slots) are uniform across a class so three.js can share programs. Pre-compile with `renderer.compileAsync(scene, camera)` during the loading screen and target < 60 programs.

2. **2.5–2.85 M triangles at "fast" quality with ~450–510 draw calls.**
   Source: `stats.json` `triangles` for `mainroad` (2.80 M day / 2.80 M dusk / 2.81 M night) and `rear` (2.54–2.85 M); drive loop 2.57 M, 453 calls.
   What is wrong: at the lowest quality preset the scene still pushes ~2.6 M triangles and 450+ draw calls; the "rear" views cost 60–100 more calls than "hero" (the roof-rack clutter and the camp behind), and "mainroad" is the heaviest view in every hour. On integrated GPUs this will not hold 60 fps.
   Fix: LOD the hero truck (rack clutter, winch, ladder collapse to a single mesh at > 15 m), instance-merge the camp furniture and fence posts, and give grass/rocks a distance cutoff at "fast" (halve `visibleInstances` from 26 852). Target ≤ 1.2 M triangles and ≤ 250 calls at `fast`, ≤ 2 M / 400 at `high`.

3. **Boot is 43 s with 5.5 s spent grading the road and ~4 s assembling the truck, and the drive loop shows 188 ms hitches.**
   Source: `perf/…ad7ef04+.json` `readyMs` 43 031, "Grading the road" 5 467 ms, "Assembling the truck" 3 991 ms, "Finding the pride" 3 124 ms, "Planting the forest" 3 033 ms; `longFrames` 2, `frameMs.max` 188.
   What is wrong: even removing the shader stage, ~19 s of CPU work runs on the main thread before the player sees anything; road grading and forest planting are procedural passes that should be either cached or off-thread. Two 188 ms frames in a 0.6 s sample means the player will feel a stall every few seconds early in the drive.
   Fix: move road grading and forest placement into a Web Worker (the noise kernel already compiles in 9 ms, so the heavy part is the CPU loop), cache the generated buffers in IndexedDB keyed by build rev, and stream the truck sub-assemblies after the first frame. Profile the two long frames — if they are shader compiles, the pre-compile in weakness 1 removes them; if they are geometry uploads, chunk the uploads across frames.

### Strong — must not regress
- Heap is flat: 334.8 → 334.5 MB over three loops (−0.3 MB). No leak.
- No console errors at boot or in the drive loop.
- Textures (275–289) and geometries (319–335) are reasonable counts for this much content; the problem is programs and triangles, not asset count.
- Sky (45 ms), signs (56 ms) and noise kernel (9 ms) boot stages are already negligible.

---

## Cross-family defects

1. **Blown-out white horizon / distant terrain in every day frame.** `truck_day/rear.png`, `truck_day/mainroad.png`, `camp_day/camp_beyond.png`, `camp_day/camp_gate.png`, `camp_day/camp_arrive.png`, `fleet/safari-jeep_1_day.png`, `fleet/utility_0_day.png`, `lions_day/lion_medium.png`. Far hills clip to near-white and fight the sky. Fog colour / aerial perspective should approach the sky's horizon colour, not white; filmic tone-mapping and lower distant albedo.

2. **Flat grey rock "confetti" scattered on the dirt, unlit and un-graded by hour.** `truck_day/hero.png`, `truck_day/road.png`, `truck_dusk/road.png`, `truck_night/road.png`, `camp_day/camp_gate.png`, `camp_day/camp_beyond.png`. Same fix as Road weakness 1.

3. **Grass sprites glow at dusk/night and cast no shadows in any hour.** `truck_dusk/forest.png`, `truck_dusk/mainroad.png`, `truck_night/hero.png`, `truck_night/forest.png`, `lions_dusk/lion_medium_dusk.png`, `camp_night/camp_arrive_night.png`. The grass material ignores the hour's light.

4. **Oversized hard-edged shadow slabs from unseen or proxy casters.** `camp_day/camp_gate.png`, `camp_night/camp_gate_night.png`, `camp_day/camp_arrive.png`; and the black bands on the far slopes in `lions_day/lion_pride.png` and `lions_walk/walk_00.png`. Audit `castShadow` on proxies/sign back-boards and the far shadow cascade.

5. **Distant trees render as pure black cut-outs with no fog.** `lions_walk/walk_00.png`–`walk_07.png` horizon, `lions_day/lion_pride.png`, `lions_day/lion_medium.png`, `truck_day/forest.png` far tree line. Vegetation impostors are not receiving fog/atmosphere.

6. **Pale cyan-white horizon band at night.** `truck_night/hero.png`, `truck_night/mainroad.png`, `camp_night/camp_arrive_night.png`, `camp_night/camp_gate_night.png`. Fog colour does not match the night sky at the horizon, or an unfogged ring/cap is drawn.

7. **Mottled cream "marble" texture on every interior surface.** `truck_day/interior.png`, `truck_dusk/interior.png`, `glass_r1/day/glass_inside.png` (dash, wheel, door trim), `lions_day/lion_seat.png` and `lions_walk/lion_seat.png` (grey herringbone seat and speckled dash), `camp_day/camp_interior.png` (grey blurred pillar and tube frame). One noise texture is doing duty as leather, vinyl, plastic and fabric; each needs its own material.

8. **Vehicle lamp state is inconsistent with the hour and between views.** Hero truck dark at night in `truck_night/hero.png` / `front.png` / `rear.png` while its lamps glow in `truck_night/wheel.png` and `forest.png`; fleet vehicles lit in `fleet/*_night.png`. One hour-driven lamp state for all vehicles.

9. **Camera placement bugs.** `lions_day/lion_far.png` and `lions_walk/lion_far.png` (inside canopy), `fleet/supply-truck_0_day.png` / `_night.png` (behind a slab), `lions_dusk/lion_pride_dusk.png` (white bonnet intrusion), `lions_day/lion_seat.png` (headrest blocks the subject), `camp_day/camp_interior.png` (blurred A-pillar dominates), `camp_day/camp_arrive.png` (subject too far). Deterministic cameras are only useful if they show the subject; each of these needs a re-frame before round 2 (silhouette, scale, composition) can be scored fairly.

10. **HUD text collision.** `truck_day/hud.png`, `truck_dusk/hud.png`, `truck_night/hud.png`: the build stamp ("build … 2026-09-04 12:01Z") overlaps the "L LIGHT" / "H HORN" control hints at the bottom right. Move the build stamp to the top right or above the hints with 8 px clearance.

11. **No environment reflection anywhere.** Paint (`truck_day/hero.png`), glass (`glass_r1/day/glass_screen.png`), mirror (`glass_mirror.png`), water (`lions_day/lion_side.png`), eyes (`lions_day/lion_face.png`, tiny). A single per-hour PMREM environment from the sky dome would lift four families at once.

## Overall verdict

It does not yet read as one polished high-end safari game; it reads as a very good hero-truck model dropped into a placeholder world. The truck's hard-surface detail (`truck_day/detail.png`), the camp at night (`camp_mess_night.png`, `camp_fire_night.png`) and the lion at dusk (`lion_close_dusk.png`) each individually approach the bar, but the connective tissue fails: nothing reflects the sky, the horizon clips to white by day and shows a seam by night, dusk is a tint rather than a sun, grass glows, rocks are confetti, and half the deterministic cameras are pointed at a canopy, a slab or a headrest. The single weakest area is the lions — the head is a bear's, the walking mesh is a hyena's, and the walk strip shows the feet sliding under a rigid spine — because in a safari game the animals are the reason the player is driving, and right now the truck is more convincing than anything it is driving toward. Second to that is glass/reflections as a system defect, since it drags the hero car, the fleet and the water down together.
