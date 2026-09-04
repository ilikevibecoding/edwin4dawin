# Exterior visual review — ISD demo (procedural Three.js)

Independent visual critique of the ship's exterior. No source files were modified. Every claim below is tied to a
screenshot under `shots/review_exterior/` (paths are relative to that folder). All shots are 1280×720, taken with
`node tools/view.mjs … --w=1280 --h=720` against the dev server, except the `fighters/` and `beam/` sets, which were taken
with a small Playwright probe that used the same `debugAPI.setView()` and additionally called
`debugAPI.rig.setMinDistance(15)` so the orbit rig would allow an 80–100 m stand-off from a moving fighter. `crops_*.png`
are nearest-neighbour crops of the cited shots made for inspection; they contain no new rendering.

Camera-distance caveat for the inline views: `CameraRig.setOrbit` places the camera exactly where the spec says, but
clamps the *goal* radius to ≥ 120 m and eases toward it each frame (`radius += (goal − radius)·(1 − e^(−6·dt))`, dt clamped
to 0.1 s, `src/systems/camera.js`, `src/main.js`). With the tool's three settle frames, any spec closer than 120 m is
photographed from ≈105–115 m, not from the specified distance. "Close" distances quoted below are therefore the spec
value with this caveat; it does not change any finding (all of them are well inside the 360 m exterior-peek range).

Note for whoever reproduces these: `--sim=N` in `tools/view.mjs` is applied **per view**, so in a three-view batch the
third view is at simulation time ≈ 3N, not N. The `sim40/` and `sim60/` folders are labelled by the flag, not by the
resulting clock. The probe log (`beam/_stats_beam.txt`) records the actual clock for the beam shots.

State of the tree: the main pass was shot 14:53–16:45 UTC from the live Vite server while sibling workstreams were
editing the working tree (uncommitted at the time of writing: `HemisphereLight` 0.35 → 0.45 with a lighter ground colour,
`glass` opacity 0.08 → 0.045, lower interior emissive levels; committed at 17:02 UTC as `4d1d6b7d`: tower glazing
backdrop removed, interior never rendered inside the closed hull from outside). The exterior findings below do not
depend on those edits except #2, which was re-shot after `4d1d6b7d` (`recheck/`) and updated accordingly.

---

## 1. Verdict

At 1–3 km the ship is unmistakably an Imperial Star Destroyer — the dagger, the tower with twin globes, three big and
four small engines are all in the right places and proportions (`ext_-1400_700_-1900_0_20_-300.png`, `ext_mid.png`,
`ext_0_40_1100_0_0_500.png`). Under 900 m it stops reading as a warship and starts reading as a grey stone castle: one
tiled plating texture wrapped over everything including spheres and engine bells, uniform sugar-cube terraces with
crenellated parapets, a stepped pyramid instead of a slim bridge neck, no cast shadows, blown-out engine throats, and a
bridge whose glazing is a solid black slot from every distance.

---

## 2. Issues

Severity scale: **blocker** (breaks the demo) · **major** (visibly wrong to any viewer) · **minor** (visible to an
attentive viewer) · **polish**.

| # | View / screenshot | What is wrong | Why it matters | Severity | Suggested fix |
|---|---|---|---|---|---|
| 1 | `ext_200_30_720_0_0_520.png`, `crops_stern_bell.png`, `ext_stern.png`, `fighters/tie_patrol_t102.png`, `fighters/tie_patrol_t104.png` | Engine throats are pure white discs with a blue rim and a large bloom halo; no nozzle depth, no rib or ring detail is visible although `engines.js` builds ribs, rings, collars and a depth-gradient throat. The throat cone is `0.93·r` wide (nearly the whole aperture) at `engineGlow` emissive 3.0, so the entire opening clips to white after ACES + bloom (exterior bloom threshold 1.0, strength 0.4). | The engines are the hero element of every aft view; the built geometry is wasted. From aft the ship looks like it has three flashlights taped to it. | **major** | Material/lighting: drop `engineGlow` emissive to ≈1.2–1.5 and let only the core disc exceed the bloom threshold; make the throat gradient dark at the lip (linear 0.2) so the `hullDark` inner wall reads; narrow the throat cone to ≈0.8·r; use a smooth heat-stained dark material for the bell exterior instead of the plated `hull` texture (`uvScale [6,1]` currently tiles bricks around a cylinder). |
| 2 | `ext_0_214_120_0_214_172.png` (head-on, spec 52 m / effective ≈110 m), `crops_glazing_headon.png`, `ext_close.png`, `ext_0_235_-250_0_215_175.png`; re-shot after commit `4d1d6b7d`: `recheck/ext_0_214_120_0_214_172.png`, `recheck/crops_glazing_headon_recheck.png`, `recheck/ext_close.png`, `recheck/ext_0_235_-250_0_215_175.png` | Bridge glazing reads as a black bar. In the first pass it was solid black even though the stats show `rooms bridge\|tactical\|nav_station\|observation` resident with 15–16 lights (peek path active). After the technical-review commit that removed the dark backdrop landed, the re-shoot at ≈110 m shows a handful of console LEDs behind the pane (`recheck/crops_glazing_headon_recheck.png`) but the slot is still ≈95 % black; from 425 m (`recheck/ext_0_235…`) it is indistinguishable from the first pass. | The bridge windows are the single most iconic ISD feature and the boarding target of the demo. An unlit slot makes the tower look derelict, and the peek system's cost (≈1.2 M tris in these views vs 0.55–0.65 M elsewhere) buys almost nothing visible. | **major** | The rooms are there but far too dark relative to the sun-lit exterior exposure. Add a lit interior wash visible from outside: a warm emissive ceiling/backwall plane (≈0.35 linear) just inside the panes plus brighter console strips facing the glass; and a thin emissive window strip (below bloom threshold) so the bridge reads lit from 400 m–1 km where the peek rooms are not resident. Glass roughness 0.18 → 0.05 with a faint env reflection so the pane itself is visible. |
| 3 | `ext_close.png`, `crops_tower_lights.png`, `ext_tower.png`, `ext_0_214_120_0_214_172.png` | The tower is a medieval keep: globes are brick-tiled spheres with a visible meridian seam, the mast is a stack of bricks, the bridge block and terraces have crenellated parapets, and the same rectangular plating tile is on every surface regardless of curvature. | Kills the "machined Imperial" read at exactly the distance where players approach to board. | **major** | Materials/geometry: globes → smooth `hullDark` with 3–4 latitude panel bands and a small dish; mast → smooth box + lattice truss; drop parapet block height by ~70 % and replace with flat greeble strips; add a second, finer plating material for small parts so the big-plate texture stays on the hull only. |
| 4 | `ext_mid.png`, `ext_0_235_-250_0_215_175.png`, `ext_-160_70_60_0_200_190.png`, `ext_-560_10_-200_-450_0_-200.png` | The bridge neck is a stepped pedestal of three boxes (half-widths 95/80/70 m, depths 110/90/80 m, `layout.js TOWER.neck`) rather than the slim, continuously tapered slab of the reference design. In silhouette it is a ziggurat with a T on top. | Silhouette is the first thing read at 1–3 km; the neck proportion is what separates an ISD from a generic "wedge with tower". | **major** | Geometry: replace the three boxes with one tapered prism (e.g. half-width 75 → 65 m, depth 45 → 35 m, y 90 → 195) plus a thin base plinth; hang a few pylons/greebles on its sides so it is not a blank slab. |
| 5 | `ext_-300_120_450_-200_60_350.png`, `ext_-120_80_-400_-60_30_-300.png`, `ext_-140_95_-100_-74_66_-150.png`, `ext_250_180_600_0_200_200.png`, `ext_tower.png` | City blocks are uniform "sugar cubes": same height, same tile texture, same white window-dash strip on every face, arranged in straight rows. Terraces read as a Lego baseplate / castle wall. | This is the surface that fills most medium shots; repetition is the most obvious "procedural" tell. | **major** | Geometry: 3 block families (low wide slabs, tall narrow towers, long barracks), heights varied ×0.6–1.8, 10–15 % rotated 90°, dark recessed channels between blocks, and a per-block greeble kit (pipes, hatches, vents, tanks) instead of a single window strip. Vary the window strip: some faces none, some two rows. |
| 6 | `ext_-160_70_60_0_200_190.png` (tower from below), `ext_-120_80_-400_-60_30_-300.png`, `ext_mid.png`, `ext_-700_300_-900_0_40_-200.png` | No cast shadows anywhere on the exterior (`Kit.build` is invoked with `castShadow:false`; the instanced greebles and lights set it explicitly). 30 m terraces, the 40 m bridge block and the globes cast nothing on the hull; the underside of the bridge block is the same flat grey as its lit faces. Dorsal plateau and hull sides have nearly the same value in `ext_mid.png`. The exterior AO pass (`aoRadius 12`) is not producing visible contact darkening. | The ISD look depends on a hard key light and deep shadow bands under every overhang; without them the ship is a flat grey cut-out. | **major** | Lighting: one fitted shadow map from the sun covering the tower + superstructure only (castShadow on tower/city kits, receiveShadow on the hull plateau and city roofs); if shadow maps are off the table, bake a "shadow decal" (darkened plane) under the bridge block and each terrace step, and lower `HemisphereLight` (0.35) so the sun-facing/shadow contrast increases. |
| 7 | `ext_-560_10_-200_-450_0_-200.png`, `ext_-140_50_-1240_0_10_-1060.png`, `crops_tower_lights.png`, `ext_-60_40_-950_0_8_-1000.png` | Port running lights (`RED 0xff2a1e`) render orange/peach — indistinguishable from the amber position lights. In `crops_tower_lights.png` the port globe light is peach while the starboard one is clearly green. | Port/starboard colour is a navigation convention viewers know; here the ship appears to have amber on both sides. | **minor** | Lighting: keep the red channel below the bloom threshold (emissive ≈0.9 linear, pure `0xff0000`) so ACES does not desaturate it; make amber position lights smaller and steadier so the two classes separate. |
| 8 | `ext_400_-200_200_0_-60_0.png`, `beam/belly_starboard_sim0.png` (green blobs larger than the bow), `ext_bow.png`, `ext_-45_25_-1150_0_3_-1090.png` (bow strobe blown to a white flare), `ext_-330_5_-150_-260_0_-200.png` (trench-lip light half-buried in the hull edge) | Running lights are 1.6–2.2 m emissive spheres plus bloom; near ones balloon into ≈25–35 px blobs (at 1280×720), far ones stay large dots that do not attenuate; one trench-lip light is clipped by the hull. | Blobs the size of a turret break scale; the clipped light is a visible placement bug. | **minor** | Geometry/material: ≈0.8 m sphere + separate soft halo sprite with size attenuation and a pixel clamp; push trench-lip lights 1–2 m outboard of `halfWidth(z)`. |
| 9 | `ext_-45_25_-1150_0_3_-1090.png` (spec 78 m from the target, eased to ≈110 m; the tip looks 300 m+ away), `ext_-560_10_-200_-450_0_-200.png` (110 m off the trench, hull looks distant), `bridge_window.png` (mullions ≈40 px wide), `ext_bow.png` | The 70° vertical FOV (≈96° horizontal at 16:9) is used for the exterior orbit; everything near the camera stretches, everything 100 m away shrinks, so no exterior shot conveys the 1.6 km scale. The 120 m minimum orbit radius compounds it: you cannot get closer than ≈110 m to anything in orbit mode, so hull detail is always seen small and wide-angle. | Perceived scale is the whole point of a capital ship. | **major** | Camera: 40–45° FOV for the exterior rig (keep 70° for the interior walk), lower `MIN_DIST` to ≈40 m (the hull functions make collision trivial to test), and re-frame the named exterior views (`ext_far` in particular) so the ship spans ≥ 55 % of the frame. |
| 10 | `ext_far.png`, `ext_0_40_1100_0_0_500.png`, `bridge_window.png`, `ext_-2000_500_-300_0_20_-300.png`, `crops_ringed_planet.png`, `sim40/ext_150_-170_-60_0_-120_-80.png` | The cyan planet is a uniformly lit disc with a fresnel rim: no terminator, no clouds, no surface texture in any shot although the shader has cloud terms; it is lit from the camera side even when the sun is behind it. The ringed planet has a pole-pinch spike where its banding converges, a flat gradient, no ring shadow on the planet and no planet shadow on the ring. | A planet is in almost every wide shot; a shadeless ball says "placeholder" louder than any hull detail. | **major** | Material: Lambert term from `sunDirLocal` in the planet shaders, atmosphere rim only on the lit limb; 2-octave fbm clouds on the cyan planet; ringed planet banding by object-space latitude (not UV) to remove the pole spike; add a ring shadow band on the planet and a planet shadow on the ring. |
| 11 | `ext_0_235_-250_0_215_175.png`, `bridge_window.png`, `ext_-40_70_-1170_0_6_-1080.png` | Sun is a hazy orange-brown blob ≈150–200 px across (at 1280×720) with no crisp disc; the same forward hemisphere also holds the crescent moon, the ringed planet and the nebula. | The sky is cluttered and the key light source looks like a smudge. | **minor** | Material/camera: smaller halo sprite, core sprite above bloom threshold for a hard disc + small flare; move the moon or ringed planet out of the forward hemisphere so no view has four bodies at once. |
| 12 | `ext_200_30_720_0_0_520.png`, `crops_stern_face.png`, `ext_0_40_1100_0_0_500.png` | Bells sit on a flat stern wall like surface-mounted cans; the bell exteriors carry the hull plate tiling; two thin white light dashes float on the stern face; the small fourth engine glow reads as a bare disc. | The stern is a hero angle and currently the least believable one. | **minor** | Geometry: recess each bell 20–30 m into a shroud ring, add stepped machinery around the recess; replace the floating white dashes with recessed window rows or remove them. |
| 13 | `ext_-560_10_-200_-450_0_-200.png`, `ext_-330_5_-150_-260_0_-200.png` | From abeam the trench is a flat dark stripe; at 100 m it is a row of identical pillars/ledges with no recessed detail and no lighting inside. | The trench is the ISD's signature side detail; it is currently a painted band. | **minor** | Geometry/lighting: deepen the recess, add 2–3 sizes of greeble (tanks, ducts, hatch rows) with random spacing, and a few sparse cool interior lights. |
| 14 | `fighters/tie_patrol_t102.png`, `crops_tie_patrol_t102.png`, `fighters/fighter_launching_t42.png`, `crops_tie_launching_t42.png`, `fighters/tie_patrol_t104.png` | The TIE's halo sprite (`scale 2+7k`, up to 9 m, colour ≈(1.6,0.5,0.25)) is larger than the fighter; from 85 m the TIE reads as a dark hexagon in front of an orange-brown balloon, and once it is a few hundred metres out (`fighters/fighter_launching_t42.png`) as an orange dot with no silhouette. On the shadow side the fighter itself is black-on-black (`crops_tie_launching_t42.png`). | Fighters launching and patrolling are a headline feature; right now you see glowing balloons, not TIEs. | **major** | Material: halo max scale ≈2.5 m, opacity ≤0.3, colour toward red-orange (1.8,0.35,0.15); keep the two 1.5 m engine sprites; add a faint emissive edge on the wing frame/cockpit ring so the silhouette survives on the shadow side. |
| 15 | `beam/beam_close_t124.png`, `beam/belly_starboard_recovery_t123.png`, `sim60/ext_belly.png` | Tractor beam is a bright additive cone with five stacked bright rings; it swallows the fighter it is lifting (the TIE is barely visible inside from ≈65 m) and from 300 m reads as a glowing slinky. | Visually loud for a utility effect; obscures the very thing the viewer wants to see. | **minor** | Material: beam alpha ≈0.15 with a soft radial falloff, rings thinner and dimmer (2 visible at a time), fighter rendered after the beam; keep the "off at sim 0" behaviour (confirmed in `beam/belly_starboard_sim0.png`). |
| 16 | `ext_400_-200_200_0_-60_0.png`, `ext_200_-250_500_0_-100_330.png`, `ext_belly.png` | The belly is one flat plate with the same tile texture; apart from the two wells and the reactor bulb there is no macro structure (no ventral recess, no spines, only a few turret discs). The reactor bulb is a brick-tiled sphere with four black meridian lines painted on it. | The belly is what you see when you approach to board and when fighters launch. | **minor** | Geometry: a real inset hangar recess with side walls, 2–3 raised longitudinal spines, a handful of ventral turrets; smooth dark material with latitude bands for the bulb. |
| 17 | `ext_60_-140_-10_0_-68_-10.png`, `crops_well_field.png`, `ext_belly.png` | Containment field is close to opaque: from 70 m you see the hex pattern and a row of deck lights, but not the racked TIEs or the hangar volume behind. The blue formation lights along the plate edges alternate blue/white by distance and look like LED strips glued on. | The wells promise a look inside and do not deliver; the field looks like a lit ceiling. | **polish** | Material: lower the field base alpha and hex contrast (≈50 %) so rack rows show through; formation lights as smaller steady dots below the bloom threshold. |
| 18 | `ext_-120_80_-400_-60_30_-300.png`, `ext_-300_120_450_-200_60_350.png`, `ext_close.png` | Dorsal plating reads as stone flagstones at 50–150 m: very wide dark seams around large square-ish plates. A dark gap runs along the base of the terraces in `ext_-120_80…` (plinth or missing fill). | The one texture that is everywhere sets the material read for the whole ship. | **minor** | Material: seam width ×⅓, seam contrast down, add a finer secondary panel grid and 5–10 % raised/darker plates; close the terrace base gap with a fillet strip. |
| 19 | `ext_far.png`, `ext_-2000_500_-300_0_20_-300.png` | At the named far view the ship is a ≈200 px dark sliver against black space; no rim light, so only the engine glows are legible. Abeam at 2 km it is an almost black line. | The "hero at distance" shot has to read instantly. | **minor** | Lighting/camera: a faint cool bounce from the planet side (hemisphere ground colour tinted cyan, ≈0.15) and a re-framed `ext_far` at ≈1.8 km, three-quarter from the lit side. |
| 20 | `bridge_window.png`, `sim60/bridge_window.png` | Through the glazing, three mullions ≈40 px wide chop the view; a soft blue glow top-centre has no visible source; the interior sill is nearly black. No TIE was visible through the window at sim 60 either. | This is the payoff view of the boarding flight. | **polish** | Geometry/camera: slimmer mullions (they are slim in `tower.js`, the 70° FOV is what fattens them — see #9); tie the blue glow to a visible source or remove; route a patrol leg across the bow so the bridge sees traffic. |

---

## 3. What already works

- **Silhouette and proportion at distance.** `ext_-1400_700_-1900_0_20_-300.png` and `ext_mid.png` are immediately an
  ISD: dagger plan, superstructure set aft, tower with twin globes and mast, flat stern. `ext_0_40_1100_0_0_500.png`
  shows the correct 3 large + 4 small engine layout.
- **The bow spine from the bridge.** `bridge_window.png` — the raised twin spine strips either side of a dark groove
  converge to the bow exactly like the reference; this is the best single frame in the set.
- **Turrets at close range.** `crops_turrets_port.png` — octagonal housings, twin barrels, plinths along the terrace
  edge read as heavy turbolasers.
- **Hangar wells.** `ext_60_-140_-10_0_-68_-10.png`, `beam/beam_close_t124.png` — the amber frame plus hexagonal
  interference field is a strong, legible signature at 50–300 m, and the hangar deck light rows show through.
- **Running-light behaviour.** Port/starboard lights blink alternately (`beam/belly_starboard_sim0.png` vs
  `beam/belly_starboard_recovery_t123.png` show different lights lit at the same camera), white strobes on the bow/mast
  make the ship feel powered even when nothing else moves.
- **TIE geometry.** `crops_tie_patrol_t102.png` — hexagonal solar wings, cockpit ball, window frame are correct; the
  model is fine, only its glow treatment (#14) is not.
- **Traffic sequence.** The probe logs show the full cycle (racked → launching at t≈41 → patrol → returning at
  t≈117 → ascending under the beam at t≈121) and the beam is genuinely off at sim 0 (`beam/_stats_beam.txt`).
- **Weathering.** `ext_-120_80_-400_-60_30_-300.png` — warm ochre staining on some plates gives the hull a used look.
- **Draw-call budget.** Exterior-only views stay at 87–277 draw calls and 356 k–650 k triangles; the peak (538 calls,
  1.24 M tris in `ext_tower`) is the resident tower rooms, not the hull.

---

## 4. Top-10 fixes by impact

1. **Tame the engine throats** (#1) — emissive 3.0 → ≈1.3, narrower throat, dark lip gradient, smooth bell material.
   Every aft shot improves instantly.
2. **Make the bridge glazing read lit** (#2) — emissive interior backdrop + window strip; verify the peek rooms are
   actually in view of the panes.
3. **Cast shadows on the tower and superstructure** (#6) — one fitted sun shadow map, or baked shadow decals under
   the bridge block and terrace steps.
4. **Rebuild the neck as a tapered slab** (#4) — the single geometry change with the biggest silhouette payoff.
5. **De-castle the tower** (#3) — smooth globes and mast, drop the crenellations, second finer material for small parts.
6. **Break up the city blocks** (#5) — three block families, height variance, recessed channels, per-block greebles.
7. **Exterior FOV 40–45°** (#9) — restores scale in every exterior view and thins the bridge mullions (#20) for free.
8. **Shade the planets** (#10) — terminator, clouds, pole-spike fix, ring shadows.
9. **Shrink and recolour the TIE halo** (#14) — fighters become fighters instead of orange balloons.
10. **Fix the running lights** (#7, #8) — red that stays red, attenuating sprites, no light buried in the hull edge.

---

## Appendix A — screenshot index and measured stats

Numbers are as printed by `tools/view.mjs` (`calls / triangles / lights / objects / ms per frame`) or by the probe
script for the `fighters/` and `beam/` sets. Frame times are software GL (SwiftShader) on a shared machine and varied up
to 3× between runs of the same view (e.g. `ext_500_60_1000_0_0_480` 6283 ms in the first batch vs the equivalent
re-run views at 1.3–2.4 s), so treat them as relative only; calls and triangles are stable. The console output of the
first run of `ext_belly`, `bridge_window` and the sixteen inline rows marked † was lost, so those rows were re-measured
by re-running the identical view specs (`--sim` unset) and the PNGs in the folder are from the first run. Distances are
the specified camera→target distance (see the ≥120 m easing caveat at the top).

| Screenshot | Camera → target (m) | Calls | Tris | Lights | Objs | ms/frame | Rooms resident |
|---|---|---|---|---|---|---|---|
| `ext_far.png` | named | 87 | 356 k | 2 | 59 | 2442 | — |
| `ext_mid.png` | named | 195 | 551 k | 2 | 167 | 4275 | — |
| `ext_tower.png` | named | 538 | 1239 k | 16 | 431 | 7167 | bridge, tactical, nav_station, observation |
| `ext_bow.png` | named | 183 | 467 k | 2 | 155 | 5559 | — |
| `ext_stern.png` | named | 195 | 551 k | 2 | 167 | 4925 | — |
| `ext_close.png` | named | 515 | 1207 k | 16 | 431 | 8786 | bridge, tactical, nav_station, observation |
| `ext_belly.png` † | named (sim 0) | 247 | 628 k | 2 | 245 | 3837 | — |
| `bridge_window.png` † | named (sim 0) | 258 | 800 k | 10 | 201 | 4423 | bridge |
| `ext_-1400_700_-1900_0_20_-300.png` † | far front-quarter, 2.2 km | 87 | 356 k | 2 | 59 | 787 | — |
| `ext_-2000_500_-300_0_20_-300.png` † | far abeam, 2.1 km | 131 | 429 k | 2 | 103 | 816 | — |
| `ext_-700_300_-900_0_40_-200.png` † | 3/4 front-port, 1.0 km | 236 | 544 k | 2 | 208 | 1315 | — |
| `ext_500_60_1000_0_0_480.png` | stern engines (requested view), 725 m | 195 | 551 k | 2 | 167 | 6283 | — |
| `ext_0_40_1100_0_0_500.png` † | dead astern, 600 m | 195 | 551 k | 2 | 167 | 1839 | — |
| `ext_200_30_720_0_0_520.png` † | stern close, 285 m | 238 | 613 k | 2 | 211 | 2397 | — |
| `ext_-560_10_-200_-450_0_-200.png` | trench abeam (requested view), 110 m | 271 | 647 k | 2 | 245 | 6453 | — |
| `ext_-330_5_-150_-260_0_-200.png` † | trench close, 86 m | 238 | 606 k | 2 | 245 | 1648 | — |
| `ext_0_235_-250_0_215_175.png` | tower from the front, 425 m | 217 | 605 k | 2 | 262 | 6989 | — |
| `ext_-160_70_60_0_200_190.png` | tower from below, 245 m | 517 | 1209 k | 16 | 431 | 9328 | bridge, tactical, nav_station, observation |
| `ext_0_214_120_0_214_172.png` † | bridge glazing head-on, 52 m spec | 509 | 1202 k | 15 | 431 | 4092 | bridge, tactical, nav_station, observation |
| `ext_250_180_600_0_200_200.png` † | tower aft-starboard, 470 m | 239 | 613 k | 2 | 211 | 2808 | — |
| `ext_-300_120_450_-200_60_350.png` † | port aft dorsal, 155 m | 253 | 629 k | 2 | 228 | 3639 | — |
| `ext_-120_80_-400_-60_30_-300.png` † | dorsal plating / terraces, 127 m | 240 | 625 k | 2 | 278 | 3409 | — |
| `ext_-140_95_-100_-74_66_-150.png` † | port terrace edge, 88 m spec | 372 | 1020 k | 15 | 431 | 2493 | bridge, tactical, nav_station, observation |
| `ext_-45_25_-1150_0_3_-1090.png` | bow tip, 78 m spec | 252 | 549 k | 2 | 224 | 5883 | — |
| `ext_-140_50_-1240_0_10_-1060.png` † | bow from port-forward, 230 m | 234 | 515 k | 2 | 206 | 2360 | — |
| `ext_-40_70_-1170_0_6_-1080.png` † | bow lights, 117 m | 244 | 546 k | 2 | 224 | 2195 | — |
| `ext_-60_40_-950_0_8_-1000.png` † | bow dorsal close, 84 m spec | 117 | 356 k | 2 | 260 | 1759 | — |
| `ext_400_-200_200_0_-60_0.png` † | belly from starboard-below, 470 m (first-run frame had a recovery beam active, i.e. the clock had advanced; use `beam/` for beam claims) | 254 | 629 k | 2 | 228 | 4255 | — |
| `ext_200_-250_500_0_-100_330.png` † | belly aft, reactor bulb, 300 m | 255 | 630 k | 2 | 228 | 4044 | — |
| `ext_60_-140_-10_0_-68_-10.png` | wells from below, 94 m spec | 243 | 626 k | 2 | 245 | 7287 | — |
| `sim40/ext_belly.png` | named, `--sim=40` (clock ≈ 40) | 259 | 635 k | 2 | 253 | 6255 | — |
| `sim40/ext_150_-170_-60_0_-120_-80.png` | wells, `--sim=40` (clock ≈ 80) | 261 | 646 k | 2 | 261 | 5167 | — |
| `sim60/ext_120_-220_-700_0_-100_-900.png` | bow from below, `--sim=60` (clock ≈ 60) | 163 | 403 k | 2 | 286 | 2203 | — |
| `sim60/ext_belly.png` | named, `--sim=60` (clock ≈ 120, beam active) | 277 | 644 k | 2 | 269 | 5588 | — |
| `sim60/bridge_window.png` | named, `--sim=60` (clock ≈ 180) | 282 | 815 k | 10 | 217 | 5487 | bridge |
| `fighters/tie_launching_t42.png` | probe, 84 m from TIE #0 (launching) | 225 | 611 k | — | — | 7865 | — |
| `fighters/tie_patrol_t102.png` | probe, 84 m from TIE #0 (patrol, aft) | 261 | 628 k | — | — | 9266 | — |
| `fighters/tie_patrol_t104.png` | probe, 95 m from TIE #0 (patrol, aft-below) | 246 | 623 k | — | — | 7817 | — |
| `beam/belly_starboard_sim0.png` | probe, clock 0.6, no fighters out | 254 | 629 k | — | — | 2698 | — |
| `beam/belly_starboard_recovery_t123.png` | probe, clock 123.8, TIE #0 ascending | 292 | 649 k | — | — | 3546 | — |
| `beam/beam_close_t124.png` | probe, clock 125, ≈65 m from the beam | 275 | 636 k | — | — | 2124 | — |
| `recheck/ext_0_214_120_0_214_172.png` | re-shot after `4d1d6b7d`, 52 m spec | 509 | 1202 k | 15 | 431 | 3401 | bridge, tactical, nav_station, observation |
| `recheck/ext_close.png` | re-shot after `4d1d6b7d`, named | 515 | 1207 k | 15 | 431 | 3253 | bridge, tactical, nav_station, observation |
| `recheck/ext_0_235_-250_0_215_175.png` | re-shot after `4d1d6b7d`, 425 m | 217 | 605 k | 2 | 262 | 2181 | — |

`fighters/fighter_launching_t42.png` is a second framing of the same t≈42 launch (stats not captured separately).
`crops_*.png` are crops of: `ext_0_235_-250_0_215_175.png` (tower lights), `ext_0_214_120_0_214_172.png` (glazing),
`ext_200_30_720_0_0_520.png` (stern bell, stern face), `ext_-140_95_-100_-74_66_-150.png` (turrets),
`ext_60_-140_-10_0_-68_-10.png` (well field), `sim40/ext_150_-170_-60_0_-120_-80.png` (ringed planet),
`fighters/tie_patrol_t102.png` and `fighters/tie_launching_t42.png` (TIEs).

## Appendix B — observations checked against the source (read-only)

- Exterior kit meshes never cast shadows: `Kit.build` is called with `{ castShadow: false, receiveShadow: true }`
  (`src/exterior/common.js`), and the instanced greebles/run-lights set `castShadow = false` explicitly (`hull.js`,
  `lights.js`) — so the hull can receive shadows but nothing on it casts any; consistent with #6.
- `engineGlow` is `emit("#6fb4ff", 3.0)` (`src/materials.js`) and the throat cone spans `0.93·r` (`src/exterior/engines.js`)
  — consistent with the clipped white discs in #1.
- Exterior post: exposure 1.04, bloom strength 0.4 / radius 0.45 / threshold 1.0, AO radius 12 (`src/post.js`).
- Run lights: `RED 0xff2a1e`, `GREEN 0x27ff6a`, `AMBER 0xffb040`, sphere size 1.6 m (2.2 m strobes), alternate blink on
  the trench lips (`src/exterior/lights.js`) — consistent with #7/#8 and with the alternating pattern noted in §3.
- Fighter halo sprite: base scale 5, throttle-scaled to `2 + 7k`, colour (1.6, 0.5, 0.25) (`src/fighters/index.js`) —
  consistent with the oversized balloon in #14.
- Tower neck: three stacked boxes, half-widths 95/80/70 m, depths 110/90/80 m (`src/core/layout.js TOWER.neck`) — #4.
- Exterior peek: rooms are resident when the camera is within 360 m of `GLAZING_CENTER (0,213,170)` (`src/main.js`),
  which the head-on shot satisfies — the dark glazing in #2 is therefore a lighting/exposure gap, not a culling one.
  Glass at HEAD `4d1d6b7d`: colour `0x6d8a96`, roughness 0.2, opacity 0.08 (`src/materials.js`); the uncommitted working
  tree lowers it to opacity 0.045 — either way the pane is not what hides the interior.
- Camera FOV 70° (`src/main.js`), orbit radius clamped to 120–6000 m with per-frame easing (`src/systems/camera.js`) — #9.
- `HemisphereLight` is 0.35 at HEAD and 0.45 in the uncommitted working tree (`src/main.js`); the #6 fix suggestion to
  lower it applies to whichever value lands, the point being sun/shadow contrast, not absolute fill.
