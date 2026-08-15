# Progress

## Current status

- Iteration: 2 (in progress)
- Consecutive all-pass iterations: 0
- Average FPS: 24.98 (SwiftShader, indicative)
- One-percent-low FPS: 20
- Average frame time: 40.03 ms
- Draw calls: unreliable in iter 1 (composer info)
- Triangle count: unreliable in iter 1
- Texture count: 105
- Renderer: ANGLE / SwiftShader Device (Subzero)
- Stopping-condition status: looping — iteration 1 failed most visual and interaction items

## Art direction

Original unbranded expedition submarine **Nereid-4**. Cramped industrial pressure-hull interior, used and maintained, not abandoned. Palette: warm off-white / naval green hull, gunmetal machinery, restrained orange/yellow safety, dark rubber decks, green/amber instruments, deep blue-green exterior water.

## File ownership

- `src/submarine.js`, `src/layout.js`, `src/collision.js` — pressure hull
- `src/controlRoom.js` — control room
- `src/corridor.js` — corridor and electrical passage
- `src/crewQuarters.js` — crew, galley, washroom
- `src/engineRoom.js` — aft machinery
- `src/machinery.js` — reusable kits
- `src/materials.js` — PBR families and displays
- `src/water.js` — underwater exterior
- `src/environment.js` — lighting and PMREM
- `src/player.js`, `src/interact.js` — movement and interactions
- `src/post.js` — presentation
- `src/main.js`, `src/debug.js`, `tools/shots.mjs` — integration

## Iteration 1

### Implemented

- Vite + Three.js r185 WebGLRenderer project
- Walkable 22 m interior: control, corridor, crew, electrical, engine
- Procedural materials, pipe kits, debug API, Playwright suite
- Three interactions: sonar, rest, silent running

### Agent assignments

- All systems: lead (first integrated pass)

### Asset loops

#### Pressure hull
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Camera bug made every shot the same aft-facing bulkhead view. Hull curve is present but reads as an empty tube.

#### Control room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Not visible in `controlRoom.png` due to camera override.

#### Corridor
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Large undetailed surfaces; first bulkhead dominates.

#### Crew quarters
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Not framed.

#### Machinery room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Not framed; geometry through hatch looked broken.

#### Materials and wear
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Heavy grain hid surface response; materials read as noisy flats.

#### Underwater exterior
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Viewport camera never aimed at the window.

#### Lighting and post
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Dim single practical; grain too strong; GTAO too expensive on SwiftShader.

#### Collision and interactions
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: Movement z unchanged; hover IDs null; traversal ended in the port hull wall.

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png`, `corridor.png`, `engineRoom.png` all show the same empty tube and flat bulkhead rather than connected furnished rooms.

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` does not show helm, sonar, or generated displays.

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` is a bare hull ring, one light, and a dark bulkhead.

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` is the same bulkhead view.

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` / `machineryCloseup.png` do not show the motor, pumps, or catwalk.

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: Surfaces in all primary shots look matte and noisy, not painted steel vs oil vs rubber.

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: No readable contact wear; grain is uniform.

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: One overhead glow, crushed interiors beyond the hatch.

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: Film grain dominates every shot; highlights on the bulkhead rim bloom.

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` looks at a bulkhead, not water.

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: Cannot judge rooms; only tan hull + dark teal bulkhead are visible.

#### 12. The player can genuinely walk into the back
- PASS/FAIL: FAIL
- Evidence: `interactions.json` traversal `z: 2.575`, `x: -1.99`.

#### 13. Interactions work
- PASS/FAIL: FAIL
- Evidence: sonar/rest/silent hover IDs are null; movement `z0 == z1`.

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: SwiftShader; 404 favicon; draw-call metrics broken; player left the hull.

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: All four primary shots read as an early Three.js tube demo.

### Technical metrics

- FPS: 24.98
- One-percent-low FPS: 20
- Frame time: 40.03 ms
- Draw calls: 1 (bad capture)
- Triangles: 1 (bad capture)
- Textures: 105
- Programs: 30
- Console errors: 404 favicon
- Page errors: none
- WebGL errors: none recorded
- Renderer: SwiftShader

### Interaction tests

- Pointer lock: PASS (synthetic)
- Movement: FAIL
- Collision: PASS (vacuous — player also did not move)
- Sonar: FAIL
- Rest: FAIL
- Silent running: FAIL
- Full forward-to-aft traversal: FAIL

### Next iteration fix list

1. Stop player camera from overwriting debug views
2. Clamp collision to the hull and keep the center aisle clear
3. Drop GTAO on SwiftShader, reduce grain, raise key lights
4. Drive movement tests with both keyboard events and `setKey`
5. Add longitudinal service pipes so no view is an empty tube
6. Re-shoot and judge the actual rooms

### Commit

- Commit hash: 98791c09
- Commit message: Add Nereid-4 walkable submarine interior (iteration 1)

## Iteration 2

### Implemented

- Debug views no longer overwritten when the player is disabled
- Hull clamp, brighter lighting, cheaper post on software GL
- Frame-waited interaction tests and longitudinal service runs

### Agent assignments

- Player and interactions: lead
- Lighting and post: lead
- Pressure hull / corridor density: lead
- Performance: lead
