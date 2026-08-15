# Progress

## Current status

- Iteration: 2 (visual repair in progress)
- Consecutive all-pass iterations: 0
- Average FPS: 20.3 (SwiftShader, indicative only)
- One-percent-low FPS: 20
- Average frame time: 49.3 ms
- Draw calls: captured incorrectly in iter 1 (info reset); geometries 1393
- Triangle count: captured incorrectly in iter 1
- Texture count: 105
- Renderer: ANGLE / SwiftShader Device (Subzero) — software renderer
- Stopping-condition status: 0 of 2 consecutive all-pass; loop continues

## Iteration 1

### Implemented

- Full module split, cylindrical hull, rooms, materials, water RT, lighting, post, player, three interactions, debug API, Playwright suite

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
- Remaining weaknesses: curvature hidden by inner liner and flat panels; hatches spawned spokes in the walkway

#### Control room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: helm spokes rendered as vertical poles; consoles still boxy; viewport read as a glow disc

#### Corridor
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: rectangular panel walls; sparse mid-walls; pole in frame

#### Crew quarters
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: bunks read as black boxes; fabric not visible; dark lighting

#### Machinery room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: reads as another corridor; motor not hero-scale; empty-looking aft

#### Materials and wear
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: wear maps exist but crushed lighting hid them; metals too mirror-like on spokes

#### Underwater exterior
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: dark teal blob with a single highlight; terrain not readable

#### Lighting and post
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: crushed blacks, heavy grain, blown ceiling bloom

#### Collision and interactions
- Attempts: 1
- Result: PARTIAL
- Remaining weaknesses: sonar/rest/silent pass; movement/traversal failed because synthetic KeyboardEvents did not register

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `corridor.png` and `walking.png` read as rectangular paneled halls; `crewQuarters.png` shows rings in a box

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` dominated by two vertical chrome poles; displays exist but stations are sparse boxes

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` / `walking.png` have pipes and a sign but large flat olive walls

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` bunks are black rectangles with an orange stripe

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` and `aftWide.png` look like a pipe corridor, not a propulsion space; `machineryCloseup.png` shows a generic cylinder

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: surfaces mostly matte olive; wear only readable on a few edges

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: chipped maps exist on some panels (`sonarConsole.png` desk) but most surfaces are uniform

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: crushed floors, hot ceiling squares, little window spill on interior

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: grain overwhelms geometry in every primary shot; bloom on ceiling lights

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` is a dark circle with one cyan point; `porthole.png` is a glow through a slot

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: palette is consistent green/orange but rooms do not yet read as one vessel of different functions

#### 12. The player can genuinely walk into the back
- PASS/FAIL: FAIL
- Evidence: `interactions.json` traversal z=-8.443 (did not leave spawn)

#### 13. Interactions work
- PASS/FAIL: FAIL
- Evidence: sonar/rest/silent pass; movement fail; pointer lock recorded pass with headless caveat

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: no page/WebGL errors; software renderer ~20 fps; metrics drawCalls/triangles wrong; hatch geometry in walkway

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: all four primaries read as a Three.js prototype, not an indie/AA submarine game

### Technical metrics

- FPS: 20.3
- One-percent-low FPS: 20
- Frame time: 49.3 ms
- Draw calls: 1 (instrumentation bug)
- Triangles: 1 (instrumentation bug)
- Textures: 105
- Programs: 37
- Console errors: none (GPU stall warnings only)
- Page errors: none
- WebGL errors: none
- Renderer: SwiftShader software

### Interaction tests

- Pointer lock: pass (headless caveat)
- Movement: fail
- Collision: pass
- Sonar: pass
- Rest: pass
- Silent running: pass
- Full forward-to-aft traversal: fail

### Next iteration fix list

1. Remove walkway hatch spokes; park doors against the bulkhead
2. Brighten lighting, reduce grain/AO, expose hull curvature
3. Reframe all debug cameras away from poles and blank walls
4. Make motor a readable hero asset; densify engine room
5. Rebuild bunks as visible fabric; light the crew space
6. Brighten water RT with nearer rocks and particles
7. Fix holdKey movement/traversal tests and metrics capture

### Commit

- Commit hash: 133c88e2
- Commit message: Add walkable submarine interior demo (iteration 1)

## Iteration 2

### Implemented

- Open hatches parked to starboard with in-plane wheels
- Removed full inner liner; wainscot only so the cylinder reads
- Thicker structural ribs
- Brighter key/fill/practicals; lighter fog
- Reduced grain, bloom, and AO
- Brighter water, nearer ridge/rock
- Reframed all debug cameras
- Larger finned propulsion motor
- Lighter bunk mattresses and crew practicals
- `debugAPI.holdKey` and corrected screenshot tests
- Renderer info captured after each frame

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
