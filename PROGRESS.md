# Progress

## Current status

- Iteration: 4
- Consecutive all-pass iterations: 0
- Average FPS: 20.2 (SwiftShader software renderer; indicative only)
- One-percent-low FPS: 20
- Average frame time: 49.4 ms
- Draw calls: 670
- Triangle count: 93240
- Texture count: 72
- Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
- Stopping-condition status: iteration 2 complete, visual items still fail, continuing

## Art direction

Used, maintained, cramped expedition submarine. Industrial realism rather than science fiction. Warm off-white hull, desaturated naval green panels, gunmetal machinery, restrained amber and green instruments, deep blue-green exterior spill.

## File ownership

- Pressure hull: `src/submarine.js`, `src/geom.js`, `src/collision.js`
- Control room: `src/controlRoom.js`, `src/displays.js`
- Corridor: `src/corridor.js`
- Crew spaces: `src/crewQuarters.js`
- Machinery: `src/engineRoom.js`, `src/machinery.js`
- Construction kit: `src/kit.js`
- Materials: `src/materials.js`
- Water: `src/water.js`
- Lighting: `src/environment.js`
- Player and interactions: `src/player.js`, `src/interact.js`
- Presentation: `src/post.js`, `src/debug.js`, `src/main.js`

## Iteration 1

### Implemented

- Vite + Three.js + Playwright project scaffold
- Procedural PBR material families with canvas albedo, roughness, and normal maps
- Reusable pipe, valve, gauge, grate, hatch, and fastener kit
- Cylindrical pressure hull, ribs, bulkheads, and raised deck
- Control room, corridor, crew quarters, electrical passage, and engine room
- Underwater exterior particles, rocks, and floodlight cones
- First-person movement, three interactions, lighting states
- Debug camera API and full screenshot suite

### Agent assignments

- Pressure hull: lead
- Control room: lead
- Corridor: lead
- Crew spaces: lead
- Machinery: lead
- Materials: lead
- Water: lead
- Lighting: lead
- Player and interactions: lead
- Performance: lead

### Asset loops

#### Pressure hull
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: hull reads as a tube with thin hoop ribs; no window cutouts so the exterior is blocked; floor/ceiling transition is weak

#### Control room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: consoles are dark boxes; displays are unreadable; viewport is a blue circle behind furniture; lighting crushed

#### Corridor
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: sparse pipes and one sign; large empty wall regions; porthole camera missed the window

#### Crew quarters
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: bunks read as dark boxes; fabric not visible; crushed blacks hide the galley

#### Machinery room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: motor reads as a dark blob; pumps and cabinets lost in shadow; empty rear composition

#### Materials and wear
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: uniform orange-peel noise; no readable painted metal or oil; wear is global rather than contact-based

#### Underwater exterior
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: hull has no holes; viewport does not show terrain; particles read as white squares

#### Lighting and post
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: underexposed; grain too heavy; vignette and crushed corners hide geometry

#### Collision and interactions
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: furniture blocks the centerline; sonar raycast missed; rest/silent tests false-passed; traversal stopped at z=3.0

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` and `corridor.png` show a cylinder with hoop ribs, but rooms still feel like props dropped in a tube and the viewport is not a real opening.

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` and `sonarConsole.png` show block consoles, unreadable displays, and a pole blocking the viewport.

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` has ribs, a hatch, rails, and one KEEP CLEAR plate, with large empty wall and ceiling regions.

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` shows dark box bunks; bedding does not read as fabric.

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png`, `machineryCloseup.png`, and `aftWide.png` show a dark central mass and sparse side props, not layered machinery.

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: every primary shot shows the same pebbled noise; metals do not separate from paint.

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: no localized chips, grease, or foot traffic; noise is uniform.

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: crushed blacks in `forwardViewport.png`, `crewQuarters.png`, and `engineRoom.png`; rooms lack readable key/fill.

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: grain dominates every shot; GTAO skipped on SwiftShader; highlights and blacks are unbalanced.

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` is nearly black; `porthole.png` framed a wall panel instead of glass.

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: palette is consistent but so dark it collapses to muddy brown/green; not a designed interior set.

#### 12. The player can genuinely walk into the back
- PASS/FAIL: FAIL
- Evidence: `interactions.json` traversal ended at z=2.996; furniture colliders block the centerline.

#### 13. Interactions work
- PASS/FAIL: FAIL
- Evidence: sonar produced no status text; rest and silent-running reported pass only because the test accepted default cruising lighting.

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: SwiftShader ~20 fps; 446 draw calls; no page errors; visuals hide missing faces with darkness. A maybe is a fail.

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: all four primary shots read as a primitive Three.js blockout, not an indie/AA submarine game.

### Technical metrics

- FPS: 20.2
- One-percent-low FPS: 20
- Frame time: 49.4 ms
- Draw calls: 446
- Triangles: 67952
- Textures: 69
- Programs: 24
- Console errors: none (ReadPixels performance warnings on SwiftShader)
- Page errors: none
- WebGL errors: none
- Renderer: SwiftShader / ANGLE Vulkan

### Interaction tests

- Pointer lock: PASS (engage true; Escape release limited in headless)
- Movement: FAIL (0.06 m travel; blocked)
- Collision: PASS (did not leave the bow)
- Sonar: FAIL
- Rest: FAIL (false pass in script; no fade or status)
- Silent running: FAIL (false pass in script; lighting unchanged)
- Full forward-to-aft traversal: FAIL (z=2.996)

### Next iteration fix list

1. Cut real holes in the hull for the viewport and portholes so the exterior is visible.
2. Raise exposure and add readable practical lighting in every room.
3. Reduce grain and hull normal intensity so painted steel can be seen.
4. Rebuild the propulsion motor and fill the engine-room camera frustum with layered machinery.
5. Densify corridor pipes, trays, and wall panels; reframe the porthole camera.
6. Clear a centerline walkway and add large interaction hit volumes.
7. Make generated displays strongly emissive and readable.
8. Tighten Playwright interaction tests so a maybe cannot pass.

### Commit

- Commit hash: afdf8485
- Commit message: Record iteration 1 screenshots and rubric failures.

## Iteration 2

### Implemented

- Brighter practical lighting and higher exposure
- Hull shader cutouts and softer materials
- Reframed debug cameras
- Horizontal propulsion motor
- Cleared bunk AABBs that blocked the aisle
- Silent-running interaction now works in Playwright

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `corridor.png` reads as a cylindrical hull with ribs and a hatch, but `controlRoom.png` still looks like boxes in a tube.

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` consoles remain dark boxes; displays still unreadable.

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` improved (pipes, rails, panels, KEEP CLEAR) but still has empty painted regions.

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: bunks reoriented; `crewQuarters.png` still too dark and boxy.

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` shows a dark motor mass and floating green wall plates.

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: hull still orange-peel; machinery matte black.

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: no localized wear readable in shots.

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: brighter than iter 1 but bloom washes `controlRoom.png`; `forwardViewport.png` is black.

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: bloom/grain still conceal geometry; viewport crushed to black.

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` is a blank dark field.

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: tan hull vs black machinery vs green plates still look assembled, not designed.

#### 12. The player can genuinely walk into the back
- PASS/FAIL: FAIL
- Evidence: traversal ended at z=3.38 because simulation was tied to a starved rAF loop.

#### 13. Interactions work
- PASS/FAIL: FAIL
- Evidence: silent running passed; sonar and rest produced no status.

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: 670 draw calls; SwiftShader ~20 fps; no page errors. Maybe is a fail.

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: still a Three.js blockout.

### Technical metrics

- FPS: 20.2
- Draw calls: 670
- Triangles: 93240
- Textures: 72
- Console errors: ReadPixels warnings
- Page errors: none
- Renderer: SwiftShader

### Interaction tests

- Pointer lock: PASS
- Movement: FAIL
- Collision: PASS
- Sonar: FAIL
- Rest: FAIL
- Silent running: PASS
- Traversal: FAIL

### Next iteration fix list

1. Decouple simulation from rAF so movement works under SwiftShader.
2. Open the bow with a real window bulkhead and a dedicated water vista.
3. Aim helper for interaction tests.
4. Reduce bloom and keep filling machinery/control density.

### Commit

- Commit hash: efe0d4cc
- Commit message: Record iteration 2 screenshots and start bow/vista fixes.

## Iteration 3

### Implemented

- Bow hull shortened; window vista added
- Fixed-interval simulation started (still throttled in headless)

### Rubric assessment

All visual items FAIL. `forwardViewport.png` still black. Sonar and silent running passed. Movement/rest/traversal failed due to timer throttle.

### Commit

- Commit hash: 5c189a08

## Iteration 4

### Implemented

- `debugAPI.simulateSeconds` unthrottles physics for tests
- Viewport frame changed from a solid box to four rails
- All Playwright interaction tests passed
- Traversal reached z=18.3 in the engine room

### Rubric assessment

#### 1–11, 15 visual items
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` still box consoles; `corridor.png` is the strongest shot but still sparse; `engineRoom.png` is primitive machinery; `forwardViewport.png` looks at a pillar and dark metal, not a water vista.

#### 12. The player can genuinely walk into the back
- PASS/FAIL: PASS
- Evidence: `interactions.json` traversal ended at z=18.3 with no teleport.

#### 13. Interactions work
- PASS/FAIL: PASS
- Evidence: pointer lock, movement, collision, sonar (`No immediate contact.`), rest (`6 hours pass.` / `Rested.` / restCycle), silent running toggle all recorded.

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: SwiftShader 20 fps / 50 ms; 670 draw calls; no page errors. Performance is indicative only, but the image still shows floating discs and primitive construction.

### Technical metrics

- FPS: 20 (SwiftShader)
- Draw calls: 670
- Triangles: 93240
- Textures: 73
- Page errors: none
- Renderer: SwiftShader

### Interaction tests

- Pointer lock: PASS
- Movement: PASS
- Collision: PASS
- Sonar: PASS
- Rest: PASS
- Silent running: PASS
- Full forward-to-aft traversal: PASS

### Next iteration fix list

1. Cut a real observation window in the bow bulkhead and aim the viewport camera through it.
2. Keep densifying control room, corridor, and engine room until the cold-look test can pass.

### Commit

- Commit hash: pending
