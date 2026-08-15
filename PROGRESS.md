# Progress

## Current status

- Iteration: 12 (final)
- Consecutive all-pass iterations: 0
- Average FPS: 24.55 (SwiftShader, indicative)
- One-percent-low FPS: 20
- Average frame time: 40.73 ms
- Draw calls: 1312 meshes
- Triangle count: 174754
- Texture count: 98
- Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
- Stopping-condition status: **stopped — iteration 12 complete**

## Final summary

### Why the stopping condition fired

Iteration 12 finished. The second stop rule is two consecutive all-pass full-scene iterations. That never happened. Visual rubric items 1–11 and 15 still fail on newly generated screenshots. Interaction items 12 and 13 pass on runtime tests.

This is a working first-person walkthrough, not a photorealistic AA interior. The screenshots do not support a photorealism claim.

### Which rubric items passed

- **12. The player can genuinely walk into the back** — `shots/iter_12/interactions.json` traversal `z: 20.71`
- **13. Interactions work** — pointer lock, movement, collision, sonar, rest, and silent running all recorded ok

### Which items remain weak

- Spatial density and hatch construction
- Control-room instrumentation (one readable sonar screen, otherwise block consoles)
- Corridor still has large clean wall spans
- Crew bunks read as boxes with grid fabric
- Engine room is the weakest hero shot — primitives, not a plant
- Materials are mottled noise, not layered wear
- Underwater view is silt blobs + a floodlight, not a ridge sliding past
- Lighting is flat with hot spots
- Post is present (ACES, bloom, grade) but GTAO is off on SwiftShader
- Cold-look test fails

### Strongest screenshot

`shots/iter_12/corridor.png` — curved hull, pipes, oval hatch, and a view into the control room. Closest to “this is a submarine.”

### Weakest screenshot

`shots/iter_12/engineRoom.png` — still reads as a tube of boxes, valves, and an orange rail.

### Final metrics

- FPS: 24.55
- One-percent-low FPS: 20
- Frame time: 40.73 ms
- Draw calls: 1312
- Triangle count: 174754
- Renderer: SwiftShader Device (Subzero), WebGL 2.0

Treat FPS as indicative. This environment has no discrete GPU.

### Known technical limitations

- Software GL: GTAO disabled, one shadow caster, pixel ratio 1
- `THREE.Clock` deprecation warning
- Canvas `getImageData` readback warnings during texture bake
- Traversal drifts to `x: -1.04` while still reaching the stern
- Draw-call count is mesh count, not GPU render.info
- No downloaded assets; everything is procedural primitives + canvas maps

### Remaining visual limitations

- Consoles and bunks are beveled boxes
- Bulkhead hatches lack convincing door mass in several views
- Fabric has a weave map but no folds that read at shot distance
- Machinery is kit-bashed primitives, not a connected propulsion train
- Exterior water lacks a readable large terrain feature in the viewport
- Wear is uniform noise, not contact logic

### What five more iterations would do

1. Rebuild the engine-room hero as a lathed motor + gear case + shaft that fills `engineRoom.png` and `machineryCloseup.png`
2. Give every hatch a thick ring, parked door, and wheel that survive the corridor camera
3. Replace chair-blocked display framing with locked close-up clusters of generated CRTs
4. Instance/merge bolts and pipes to cut 1312 meshes toward a few hundred
5. Author a viewport-only water card with a 60–90 s ridge parallax that is impossible to miss

### System descriptions

- **Pressure-hull system** — 22 m Z-axis cylinder, radius 1.52 m, inverted skin, circular ribs, longitudinal stringers, raised decks, oval hatches at four bulkheads, hull AABB clamp
- **Control room** — helm / sonar / nav consoles, generated canvas displays, switch banks, periscope column, three seats, forward oval viewport
- **Crew spaces** — four bunks, lockers, fold-down table, galley, washroom alcove, book and locker photo
- **Aft machinery** — lathed motor housing, gear box, shaft, pumps, compressor, cabinets, valves, gauges, catwalk rails, silent-running panel
- **Procedural materials** — canvas albedo / roughness / normal families for paint, metal, oil, rubber, fabric, glass, pipes
- **Underwater environment** — forward dome, particle layers, ridge + near rock, flood spots, porthole water cards
- **Lighting** — room keys and fills, rest-cycle reds, silent-running dim, PMREM from a painted probe scene
- **Post-processing** — ACES, optional GTAO, bloom, vignette / grain / grade shader
- **Collision and interaction** — capsule vs AABB, pointer lock, WASD, E raycast + proximity, sonar ping (Web Audio), rest fade, silent-running toggle

### Final commit hash

Recorded after this file is committed.

## Art direction

Original expedition submarine **Nereid-4**. Used, maintained, cramped, industrial. Warm off-white / naval green hull, gunmetal machinery, restrained safety orange/yellow, dark decks, green/amber instruments, deep blue-green water.

## File ownership

Unchanged from iteration 1. Lead integrated all rooms.

## Iterations 1–11 (condensed)

| Iter | Result | Notes |
| --- | --- | --- |
| 1 | FAIL | Player camera overwrote every debug view |
| 2 | FAIL | Views worked; rocks intersected the hull |
| 3 | Interactions mostly PASS | Rooms visible; corridor black; silent-running hover fail |
| 4 | Interactions PASS | Viewport enlarged; corridor still black |
| 5 | Interactions PASS | Corridor camera fixed; best architectural shot appears |
| 6 | Interactions PASS | Control camera looks forward; engine aisle clutter |
| 7 | Interactions PASS | Motor off walkway; helm sonar added |
| 8 | Interactions PASS | Control camera offset; sonar readable |
| 9 | Interactions PASS | Darker water, closer rocks |
| 10 | Interactions PASS | Crew book + photo |
| 11 | Interactions PASS | Engine work lamp |
| 12 | STOP | Production preview suite; same visual fails |

## Iteration 12

### Implemented

- `npm ci`, production build, `USE_PREVIEW=1` Playwright suite
- Final screenshots in `shots/iter_12/`
- This summary

### Agent assignments

- All systems: lead (integration and evaluation)

### Asset loops

#### Pressure hull
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: Faceted cylinder, thin ribs, empty paint fields

#### Control room
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: One good sonar screen; furniture still boxy

#### Corridor
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: Best room, still not dense enough for the cold-look test

#### Crew quarters
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: Hard bunks, little fabric read

#### Machinery room
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: Hero shot never became a plant

#### Materials and wear
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: Uniform noise

#### Underwater exterior
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: Particles + glow, no obvious ridge

#### Lighting and post
- Attempts: 12
- Result: FAIL
- Remaining weaknesses: Flat keys, no GTAO on software GL

#### Collision and interactions
- Attempts: 12
- Result: PASS
- Remaining weaknesses: X drift on long walks

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `corridor.png` shows a tube; `engineRoom.png` does not read as a packed vessel

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` has a sonar sweep but block consoles and sparse walls

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` — pipes and boxes exist; large undetailed beige spans remain

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` — box bunks; book/photo are small

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` — primitives and an orange rail

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: All primaries — mottled paint, glossy floor, grid fabric

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: No contact-specific wear in any primary

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: Flat wash; hatch interiors go black

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: ACES + bloom + grain exist; GTAO off; bloom on the viewport glow

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` — teal haze and blobs, no terrain silhouette

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: Palette is consistent (tan / green / orange) but that is not enough while rooms still look like one demo kit; a maybe is a fail

#### 12. The player can genuinely walk into the back
- PASS/FAIL: PASS
- Evidence: `interactions.json` `z: 20.71`

#### 13. Interactions work
- PASS/FAIL: PASS
- Evidence: `interactions.json` all six interaction fields ok; no page errors

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: SwiftShader ~25 fps; 1312 meshes; X drift; Clock warning

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: The four primaries would be guessed as a Three.js / student submarine demo, not an AA game

### Technical metrics

- FPS: 24.55
- One-percent-low FPS: 20
- Frame time: 40.73 ms
- Draw calls: 1312
- Triangles: 174754
- Textures: 98
- Programs: 28
- Console errors: none (warnings only)
- Page errors: none
- WebGL errors: none
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

Stopped. If work continued, start with the engine-room hero and hatch mass.

### Commit

- Commit hash: pending
- Commit message: Final iteration 12 production preview and progress summary
