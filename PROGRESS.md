# Progress

## Current status

- Iteration: 1
- Consecutive all-pass iterations: 0
- Average FPS: renderCost 4–11 ms/frame in-page (≈90–250 fps indicative) on SwiftShader software rasterizer; rAF-measured FPS is meaningless here (headless renders on demand)
- One-percent-low FPS: n/a on software rasterizer (recorded 0.06 — an artifact of on-demand frame scheduling, not render cost)
- Average frame time: see renderCost above
- Draw calls: 389
- Triangle count: 300,437 (+ 6,044 points)
- Texture count: 165 (over the 80 budget — atlas/labels dedupe planned)
- Renderer: ANGLE Vulkan SwiftShader (software) in CI — all FPS numbers are
  indicative only, not a hardware benchmark. Target is a mid-range laptop GPU.
- Stopping-condition status: not met (iteration 1 of 12; most visual rubric items fail)

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
