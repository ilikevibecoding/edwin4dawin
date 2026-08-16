# Progress

## Current status

- Iteration: 3
- Consecutive all-pass iterations: 0
- Average FPS: renderCost ≈10 ms/frame in-page (≈98 fps indicative) on SwiftShader software rasterizer; rAF-measured FPS is meaningless here (headless renders on demand)
- One-percent-low FPS: n/a on software rasterizer (on-demand frame scheduling)
- Average frame time: see renderCost above
- Draw calls: 418
- Triangle count: 426,589
- Texture count: 225 (mostly tiny label canvases — see budget note in iter 2)
- Renderer: ANGLE Vulkan SwiftShader (software) in CI — all FPS numbers are
  indicative only, not a hardware benchmark. Target is a mid-range laptop GPU.
- Stopping-condition status: not met (iteration 3 of 12; 12/15 rubric items pass)

## Iteration 3

### Implemented

- Porthole read fixed end-to-end: root cause of the "pale wedges floating in
  the glass" was the hull-shell cutout ellipse being only 0.01 m larger than
  the sleeve bore while shell quads are 0.25 m long — leftover quads poked into
  the tube. Cutout widened past the quad footprint, sleeve rebuilt in matte
  near-black, wide matte boot disc added outboard, painted interior doubler pad
  covers the rim. Verified by ray probes + hide-bisection (tools/probe-ray.mjs,
  tools/probe-hide.mjs).
- Exposure grade now actually applies: environment states were writing
  toneMappingExposure ABSOLUTELY every frame, silently undoing the main.js
  base exposure. States now multiply BASE_EXPOSURE (0.86). Verified by pixel
  stats (crew mean 110 -> 101).
- glassThick de-mirrored (roughness 0.18, envMapIntensity 0.03) — the PMREM
  synthetic room's bright panels no longer reflect as hard pale quads in
  windows; grade contrast up to 1.11.
- Water: rock detail 3 + high-frequency displacement octave (kills faceted
  slabs), floodlight beams re-aimed with axis-alignment gain (visible through
  the viewport), rock floodlight pool boosted, backdrop horizon lifted,
  baseline screenshots frozen at sim t=40 (hero rock / beam crossover staging).
- Crew jacket rebuilt as an over-rail drape in near-black fabric (was a tan
  cone reading as a lampshade); valve station moved clear of the washroom
  alcove; motor nameplate no longer truncated (label canvas shrink-to-fit).
- Camera reframes: crewQuarters, forwardViewport, porthole (axial, pulled
  back), corridor.

### Rubric assessment (from shots/iter_3/*.png, all 10 opened and inspected)

#### 1. Spatial layout reads as a real submarine
- PASS
- Evidence: corridor.png/crewQuarters.png/aftWide.png — curved hull, rib
  rhythm + deep web frames, framed hatches, one continuous route with the
  motor visible from the crew space (walking.png).

#### 2. Control room looks production quality
- PASS
- Evidence: controlRoom.png — dense consoles with bezels + lamps, nav table
  with rolled charts and task lamp, periscope column, sonar bay; dome viewport
  now shows blue water + marine snow instead of a dark hole; right-edge rack
  reads as a detailed foreground occluder (valve wheel, bolted panel).

#### 3. Corridor passes the detail-density test
- PASS
- Evidence: corridor.png/walking.png — layered trays, conduit crossings,
  junction boxes, ballast main + spectacle flange, DC station, frame plates,
  signs, grates with clips; washroom partitions paneled with hardware.

#### 4. Crew quarters feel inhabited
- PASS
- Evidence: crewQuarters.png/walking.png — varied bedding (fold band, cuffs,
  slept-in rack), navy blanket, mug/jug/caddy/dominoes, jacket now reads as a
  dark hung drape over the rail, boots, postcard, paneled washroom with
  OCCUPIED/VACANT slider. Bedding still bright but has believable variation.

#### 5. Aft machinery room looks mechanically believable
- PASS
- Evidence: engineRoom.png/aftWide.png/machineryCloseup.png — motor with
  bolted end-bell + brushed drum band, cabled terminal box, sea main with red
  handwheels, lagged silencer, catwalk with yellow nosing, stern densified.

#### 6. Materials read as physical
- PASS
- Evidence: machineryCloseup.png (gloss drum vs satin rail vs red iron vs
  cream enamel), sonarConsole.png (crackle panel, brass bezel, glass), and the
  0.86 exposure + 1.11 contrast finally separate sage/cream/gunmetal in wide
  shots. PROPULSION MTR 1 nameplate fits.

#### 7. Wear and grime follow physical logic
- FAIL (close)
- Evidence: deck wear strips, chips, rib grime read at deck level
  (walking.png), but crown panels near lamp fixtures still render hot-clean —
  upper-half grime and lamp-adjacent scorch/dust shadows are missing
  (corridor.png).

#### 8. Lighting reads as intentional
- FAIL (close)
- Evidence: sonarConsole.png/engineRoom.png/controlRoom.png now carry clear
  key pools, practical accents and falloff; but the corridor/crew crown still
  shows hot paint patches under each fixture and the mid-tunnel stays evenly
  bright (corridor.png, crewQuarters.png).

#### 9. Post-processing is active and balanced
- PASS
- Evidence: AO grounds furniture and machines; bloom confined to lamps and
  displays; vignette + grain subtle; no blown highlights or banding.

#### 10. Underwater view sells depth and motion
- PASS
- Evidence: forwardViewport.png — hero pinnacle silhouette center-left, lit
  seabed pool below, floodlight glow, layered marine snow; porthole.png now
  shows clean open water with a depth gradient + snow (no more wedges/facets).
  Deterministic t=40 staging documented in views.js.

#### 11. One cohesive palette across every room
- PASS
- Evidence: sage cabinets / cream crown / gunmetal machines / oxide-red
  accents recur in every room; label style consistent (all shots).

#### 12. The player can genuinely walk into the back
- PASS
- Evidence: traversal test walked z=0.9 -> z=19.55 (motor guardrail) through
  both hatches without teleports; interactions.json.

#### 13. Interactions work
- PASS
- Evidence: interactions.json — pointer lock + look, movement 2.40 m,
  collision at z=2.43, sonar s1+s2 both green with the widened poll window,
  rest full sequence (fade, "6 hours pass.", restCycle, return, "Rested."),
  silent running both ways.

#### 14. Technical quality is clean
- PASS
- Evidence: zero console/page/WebGL errors (console.txt); 418 draws / 426,589
  tris / 225 textures healthy; iter-2 defects (nameplate truncation, jacket
  cone, porthole wedges) all fixed and verified in shots.

#### 15. The cold-look test
- FAIL (close)
- Evidence: sonarConsole/machineryCloseup/aftWide/controlRoom would pass a
  cold look as high-end indie; the corridor/crew axis is one notch too evenly
  bright to fully sell "submarine at depth" (ties to items 7-8).

### Technical metrics

- renderCost ≈10 ms/frame (1600×900 high, SwiftShader — indicative only).
  drawCalls 418; triangles 426,589; textures 225. Console errors: 0.
  Page errors: 0. WebGL errors: 0.

### Interaction tests

- Pointer lock PASS, movement PASS (2.40 m), collision PASS (z=2.43),
  traversal PASS (z=19.55), sonar PASS (s1+s2), rest PASS, silent running
  PASS. ALL REQUIRED TESTS PASSED.

### Next iteration fix list (worst first)

1. Crown lighting shaping (corridor + crew): kill per-fixture hot paint
   patches (lamp emissive vs point intensity balance, subtle fixture-adjacent
   grime/dust shadow), deepen upper-half falloff so the tunnel vaults away
   (lighting agent).
2. Upper-half wear pass riding on 1: crown panel streaks/grime that survive
   the lighting (lighting agent).
3. Side-porthole exterior interest at t=40: stage a readable rock/parallax
   event in the stbd porthole sight cone; keep the clean water read as the
   default for the others (water agent).
4. Cold-look re-check after 1-3; micro-reframe crewQuarters to drop the
   cropped porthole ring at frame edge (lead).

## Iteration 2

## Iteration 2

### Implemented

- Five parallel agent passes integrated: machinery hero pass (motor end-bell,
  fins, terminal box, stern densification, steering gear, drip tray, overhead
  trunking/silencer, props), control-room detail pass (sonar bay back, nav
  table, console bezels/lamps, overhead tray + intercom, periscope, DC gear),
  corridor density pass (double trays, conduit crossings, junction boxes,
  ballast main w/ spectacle flange, DC station, frame plates, electrical
  passage), crew inhabited pass (varied bedding + navy blanket, slept-in bunk,
  jacket/boots/postcard, paneled washroom + interior, galley/mess props,
  curtain), underwater depth pass (rock conveyor with strata, re-aimed
  floodlight beams, sharper particles, darker backdrop, porthole rock).
- Lead pass: global contrast (stronger N8AO, grade contrast, deeper vignette),
  hull fixes (deadlight stowed flush, deep web frames, deck wear strips, rib
  grime), glass sheen reduced, condensation slimmed to a rim arc, valve station
  moved out of the washroom alcove, all camera framings updated per agent
  suggestions.

### Rubric assessment (from shots/iter_2/*.png, all 10 opened and inspected)

#### 1. Spatial layout reads as a real submarine
- PASS
- Evidence: corridor.png/crewQuarters.png/aftWide.png — curved hull with rib
  rhythm and deep web frames, tight framed hatches, one continuous route with
  the motor visible from the crew space (walking.png).

#### 2. Control room looks production quality
- FAIL (close)
- Evidence: controlRoom.png — dense consoles, nav table, periscope, overhead
  trays now read well; but the right-edge foreground rack is a blurred blob
  eating a quarter of the frame, and the forward viewport reads as a dark hole.

#### 3. Corridor passes the detail-density test
- PASS
- Evidence: corridor.png/walking.png — layered trays + conduits + junction
  boxes, ballast main with spectacle flange and valve gear, DC station, frame
  number plates, signs, grates with clips; nothing reads as an empty slab.

#### 4. Crew quarters feel inhabited
- FAIL (close)
- Evidence: crewQuarters.png/walking.png — varied bedding, props, paneled
  washroom with slider plate all read; but the hanging jacket reads as a
  floating tan lampshade at frame center, and bedding still reads bright-white.

#### 5. Aft machinery room looks mechanically believable
- PASS
- Evidence: engineRoom.png/aftWide.png/machineryCloseup.png — motor with bolted
  end-bell and cabled terminal box, sea main with red handwheels + blanked
  flange, trunking + lagged silencer overhead, catwalk with yellow nosing,
  stern no longer empty.

#### 6. Materials read as physical
- FAIL (close)
- Evidence: gloss motor vs satin rails vs red iron wheels now separate
  (machineryCloseup.png), but wide shots still collapse toward one warm beige;
  crown paint too clean/hot near lamps.

#### 7. Wear and grime follow physical logic
- FAIL (close)
- Evidence: deck wear strips, chips and streaks exist (walking.png) but the
  crown brightness still flattens them; grime is invisible in upper half.

#### 8. Lighting reads as intentional
- FAIL (close)
- Evidence: warm pools + practicals + instrument glow read (sonarConsole.png),
  but crown lamps produce hot paint patches and corners still don't fall off;
  cool viewport spill barely visible.

#### 9. Post-processing is active and balanced
- PASS
- Evidence: AO clearly grounds the motor, table legs and bunks; bloom sits only
  on lamps/displays; vignette + grain subtle; no blown highlights or banding.

#### 10. Underwater view sells depth and motion
- FAIL
- Evidence: forwardViewport.png — through the glass reads as a black starfield:
  particles read as white stars, no rock or floodlight cone visible at the
  baseline time; porthole.png rock reads as flat faceted slabs.

#### 11. One cohesive palette across every room
- PASS
- Evidence: sage cabinets / cream crown / gunmetal machines / oxide-red accents
  recur in every room; label style consistent (all shots).

#### 12. The player can genuinely walk into the back
- PASS
- Evidence: traversal test walked z=0.9 → z=19.55 (motor guardrail) through
  both hatches without teleports; interactions.json.

#### 13. Interactions work
- FAIL (flake)
- Evidence: sonar s2 ("No immediate contact.") poll window (20 s) expired on
  the software rasterizer before the 2.4 s-sim status change; s1, rest, silent
  running, lock, movement, collision, traversal all PASS. Window widened to
  60 s for iter 3; must re-verify green.

#### 14. Technical quality is clean
- FAIL
- Evidence: zero console/page/WebGL errors; 416 draws / 425k tris healthy; but
  the sonar flake above, the truncated motor nameplate ("OPULSION MTR",
  machineryCloseup.png) and the jacket artifact count as defects. Texture count
  224 exceeds the original 80 budget — nearly all are tiny label canvases
  (≤256×64); budget reinterpreted in ART_DIRECTION.md as 80 large textures
  (unchanged) + small label canvases exempt, since GPU memory impact is
  negligible (<8 MB total).

#### 15. The cold-look test
- FAIL (close)
- Evidence: aft shots (aftWide.png, machineryCloseup.png) would pass a cold
  look as high-end indie; control/crew shots still read a notch too bright and
  carry the two artifacts above.

### Technical metrics

- renderCost ≈10 ms/frame (1600×900 high, SwiftShader — indicative only).
  drawCalls 416; triangles 424,719; textures 224. Console errors: 0.
  Page errors: 0. WebGL errors: 0.

### Interaction tests

- Pointer lock PASS, movement PASS (2.44 m), collision PASS (z=2.43),
  traversal PASS (z=19.55), rest PASS, silent running PASS.
- Sonar FAIL (poll-window flake on s2; fixed window for next run).

### Next iteration fix list (worst first)

1. Underwater through-glass read: smooth rock shading, rock + floodlight cone
   visible at baseline through the forward viewport, particles less star-like,
   floodlit haze near the glass (lead).
2. Crew jacket silhouette: replace lampshade-cone read with a flat hung-coat
   form, darker fabric (lead).
3. Motor nameplate truncation fix (lead).
4. Global exposure trim: slightly lower gain / stronger contrast, cool the
   crown-lamp hot patches (lead).
5. Re-run interaction suite; sonar must go green with widened window (lead).

## Iteration 1

## Iteration 1

### Implemented

- Full integrated base: hull (curved shell, ribs, bulkheads, tall-oval pressure
  doors, forward viewport wall, stern dome, bilge), 4 rooms with furniture,
  machinery, displays, underwater exterior, lighting states, post chain.
- Robust headless test loop: `pumpFrame` (render + `gl.finish`) drives the sim
  from Node-side polls; shadow maps render once at boot (all casters static);
  shadow casters converted from point lights to single-face spots; HUD fades and
  interaction sequences are frame-driven (in-page timers are throttled headless).
- All interaction tests pass: pointer lock (Escape exit needs `exitPointerLock`
  fallback in headless — noted, not a product bug), mouse look, movement,
  collision (blocked by helm seat at z=2.43), full traversal to z=19.55 (motor
  guardrail — catwalk legitimately dead-ends there), sonar, rest, silent running,
  debug-API triggers. Zero console/page errors (see shots/iter_1/console.txt).

### Agent assignments (iteration 1 = lead-built integrated base)

- All systems built by lead to establish contracts; parallel agents start iter 2.

### Rubric assessment (from shots/iter_1/*.png, all 10 opened and inspected)

#### 1. Spatial layout reads as a real submarine
- FAIL (close)
- Evidence: corridor.png/crewQuarters.png show curved hull, ribs, tight route,
  hatch framing the next compartment. But surfaces read pale/plastery, rib
  flanges are washed out, and the tall oval hatches look thin-walled.

#### 2. Control room looks production quality
- FAIL
- Evidence: controlRoom.png is dominated by the sonar bay's blank back panel and
  two undetailed green cabinet slabs; consoles too small in frame. Gauges and
  displays exist (forwardViewport.png) but the composition and detail density fail.

#### 3. Corridor passes the detail-density test
- FAIL
- Evidence: corridor.png has ribs/pipes/tray/rails/grates, but the washroom
  partition is a large undetailed white slab; crown conduits blown white; overall
  wash kills material separation.

#### 4. Crew quarters feel inhabited
- FAIL
- Evidence: crewQuarters.png — bunks/bedding present but bedding reads pale and
  hard; floating deadlight disc (port porthole cover) reads as a bug; large
  empty deck area; washroom slab undetailed.

#### 5. Aft machinery room looks mechanically believable
- FAIL (closest of the room shots)
- Evidence: engineRoom.png/aftWide.png show motor, manifold with red wheels,
  cabinets, fans, hoist, catwalk. Motor face is a featureless dark blob; fins
  read as shiny stacked sheets (machineryCloseup.png); crossing pipes lack
  hangers; stern area behind motor too empty/pale.

#### 6. Materials read as physical
- FAIL
- Evidence: all shots — one pale beige impression dominates; painted steel,
  plastic and fabric families don't separate; oily/bare metal contrast weak.

#### 7. Wear and grime follow physical logic
- FAIL
- Evidence: wear exists (deck strip, chips, streaks) but is drowned by the wash;
  KEEP CLEAR floor stencil renders mirrored (walking.png).

#### 8. Lighting reads as intentional
- FAIL
- Evidence: pools of light exist but fill floods everything; corners never fall
  off; cool viewport spill barely visible (forwardViewport.png).

#### 9. Post-processing is active and balanced
- FAIL
- Evidence: ACES+bloom+AO+vignette+grain active (no blown highlights now), but
  AO too weak to ground objects; overall contrast too low.

#### 10. Underwater view sells depth and motion
- FAIL
- Evidence: forwardViewport.png shows water + particles through glass (huge
  improvement over opaque), but particles are white blobs, no rocks/floodlight
  cones in frame, side ports show the shroud interior as beige.

#### 11. One cohesive palette across every room
- FAIL
- Evidence: palette is consistent but degenerates to "everything beige" — the
  greens/gunmetals/ambers don't separate under the current wash.

#### 12. The player can genuinely walk into the back
- PASS
- Evidence: traversal test walked control room -> engine room (z=19.55, motor
  guardrail) with no teleports; interactions.json.

#### 13. Interactions work
- PASS
- Evidence: interactions.json — pointer lock+look, prompts via hover ids, sonar
  status pair, rest full sequence (fade, 6 hours pass., restCycle, return,
  Rested.), silent running both ways, debug triggers.

#### 14. Technical quality is clean
- FAIL
- Evidence: no console/page/WebGL errors; 389 draws / 300k tris are healthy; but
  floating deadlight disc (crewQuarters.png), mirrored stencil, condensation
  decal reads as a speckle rectangle (porthole.png) are visual defects.

#### 15. The cold-look test
- FAIL
- Evidence: current shots read as a clean but pale procedural demo, not an
  indie/AA production. Contrast, material separation, and hero detail missing.

### Technical metrics

- renderCost: 4–11 ms/frame (in-page, 1600×900 high) — SwiftShader software;
  indicative only. drawCalls 389; triangles 300,437; points 6,044; textures 165;
  programs 52. Console errors: 0. Page errors: 0. WebGL errors: 0.

### Interaction tests

- Pointer lock: PASS (native Escape exit not delivered by headless Chrome —
  exitPointerLock fallback used and recorded)
- Movement: PASS (2.35 m in 1.3 s sim)
- Collision: PASS (blocked at z=2.43 by helm seat)
- Sonar: PASS; Rest: PASS; Silent running: PASS
- Full forward-to-aft traversal: PASS (z=19.55)

### Next iteration fix list (worst first)

1. Global contrast/lighting: kill the wash — stronger AO, lower fill/env, deeper
   corners, exposure/grade contrast (lead).
2. Aft machinery hero pass: motor end-bell face, darker fins, cable/hanger
   logic, layered stern background (machinery agent).
3. Corridor/washroom detail density: partition paneling, crown conduit tone,
   junction/cable believability (corridor agent).
4. Control room composition + nav/console detail + camera (control agent).
5. Materials separation pass rides on 1 (lead) + per-room accents.
6. Underwater: rocks in viewport cone, floodlight cones visible, smaller
   particles, darker water, fix side-port view (water agent).
7. Crew quarters: bedding contrast, deadlight fix, washroom interior,
   inhabited props (crew agent).
8. Hull: rib bolts/flange tone, hatch ring slimming, condensation decal fix,
   stencil mirror fix (hull agent + lead).

### Commit

- Commit: recorded after this write (see git log: "Iteration 1: ...")

## Iteration 0 (base build)

### Implemented

- Project scaffolding: Vite + three 0.185 + Playwright + n8ao.
- ART_DIRECTION.md with palette, dimensions, ownership, engineering contracts.
- Core systems: seeded RNG, canvas texture toolkit, 12+ PBR material families,
  collision (capsule vs AABB + hull clamp + step assist), greeble kits (pipes,
  valves, gauges, cables, rails, grates, lamps, fans), static merge, instanced
  fasteners.
- Pressure hull: curved shell w/ porthole cutouts, T-profile ribs, bulkheads with
  open pressure doors, forward viewport bulkhead, stern dome, decks + bilge.
- Rooms v1: control room (helm/sonar/nav + animated displays), corridor + aft
  electrical passage, crew quarters (bunks/galley/mess/washroom), engine room
  (motor, gear, shaft, pumps, manifold, compressor, cabinets, hoist, fans).
- Underwater exterior: backdrop, 3 particle layers + silt + bubbles + biolum,
  rock conveyor + ridges, seabed, floodlight cones.
- Lighting states (cruising/restCycle/silentRunning/maintenanceLights), PMREM.
- Player (pointer lock, WASD, bob, sway), HUD, 3 interactions, post chain
  (N8AO + bloom + ACES + grade), debug API, Playwright suite.
