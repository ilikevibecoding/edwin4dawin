# Progress

## Current status

- Iteration: 5 (in progress)
- Consecutive all-pass iterations: 0
- Average FPS: 23.49 (SwiftShader, indicative)
- One-percent-low FPS: 20
- Average frame time: 42.57 ms
- Draw calls: 1290 meshes
- Triangle count: 171544
- Texture count: 95
- Renderer: ANGLE / SwiftShader Device (Subzero)
- Stopping-condition status: looping — interactions pass as of iteration 4; visual rubric still fails

## Art direction

Original unbranded expedition submarine **Nereid-4**. Cramped industrial pressure-hull interior, used and maintained. Palette: warm off-white / naval green hull, gunmetal machinery, restrained orange/yellow safety, dark rubber decks, green/amber instruments, deep blue-green exterior water.

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

- First integrated walkable scene and Playwright suite

### Rubric assessment

All visual and most interaction items FAIL. Evidence: every primary shot was the same aft-facing bulkhead because `Player.update` overwrote debug cameras. Traversal ended at `z: 2.57`, `x: -1.99`.

### Commit

- Commit hash: 98791c09

## Iteration 2

### Implemented

- Debug cameras no longer overwritten; hull clamp; SwiftShader skips GTAO; brighter lights

### Rubric assessment

Cameras work. Underwater rocks were parked at `z = 6.4` and intersected the interior as giant black triangles. Movement/traversal still failed. Visual items FAIL.

### Commit

- Commit hash: 999bf5ae

## Iteration 3

### Implemented

- Rocks stay forward of the bow; `simulateWalk`; motor fin `lookAt` removed; porthole water cards

### Interaction tests

- Pointer lock, movement, collision, sonar, rest, traversal: PASS
- Silent running: FAIL (hover null)

### Rubric assessment

Primary shots show real rooms. Control room is sparse box furniture. Corridor was black. Engine room reads as primitives. Viewport is a small oval in a flat cap. Cold-look FAIL.

### Commit

- Commit hash: 880abc73

## Iteration 4

### Implemented

- Control-room camera looks aft at console faces
- Larger viewport opening
- Silent-running hover + trigger fallback
- Corridor fill light

### Asset loops

#### Pressure hull
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: Faceted cylinder; empty stretches of paint; ribs are thin tori

#### Control room
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: `controlRoom.png` still shows console backs / empty aisle more than generated displays

#### Corridor
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: `corridor.png` is a flat dark-gray field — camera still inside or facing an unlit volume

#### Crew quarters
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: Bunks read as boxes; curtains are hard panels; little personal clutter

#### Machinery room
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: Glossy primitives, orange arch, sparse silhouette; not a believable plant

#### Materials and wear
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: Mottled noise, not painted steel / oil / fabric

#### Underwater exterior
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: Flat cyan oval + blob particles; no terrain silhouette

#### Lighting and post
- Attempts: 4
- Result: FAIL
- Remaining weaknesses: Hot bloom on practicals; little AO on SwiftShader; crushed far hatches

#### Collision and interactions
- Attempts: 4
- Result: PASS (runtime)
- Remaining weaknesses: Traversal drifts to `x: -1.04`

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `walking.png` / `crewQuarters.png` show a tube with furniture; `corridor.png` is blank

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` — block consoles, no readable generated displays in frame

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` is unlit noise

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` — box bunks, hard curtains, empty left wall

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` — primitives and a glossy black capsule

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: All primary shots — plastic beige + grid fabric

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: Uniform mottling, no contact wear

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: One hot practical per room; black beyond hatches

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: Bloom on lights; no readable AO; grain only obvious on the black corridor frame

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` — hazy cyan disk, no ridge

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: Palette is consistent (tan / green / orange) but rooms still look like the same demo kit; corridor missing

#### 12. The player can genuinely walk into the back
- PASS/FAIL: PASS
- Evidence: `interactions.json` traversal `z: 20.71`

#### 13. Interactions work
- PASS/FAIL: PASS
- Evidence: `interactions.json` — pointer lock, movement, collision, sonar, rest, silent running all ok

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: SwiftShader ~23 fps; corridor view broken; floating blocks in `walking.png`

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: Four primaries still read as a Three.js blockout

### Technical metrics

- FPS: 23.49
- One-percent-low FPS: 20
- Frame time: 42.57 ms
- Draw calls: 1290
- Triangles: 171544
- Textures: 95
- Programs: 27
- Console errors: none (canvas readback warnings only)
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

1. Reframe corridor from a known-good z (6.9 looking forward)
2. Remove interior water volumes that can swallow the camera
3. Put the motor in the engine-room frustum
4. Enlarge helm display facing the control camera
5. Re-shoot and judge

### Commit

- Commit hash: 90de3215
- Commit message: Reframe room cameras and enlarge the forward viewport (iteration 4)

## Iteration 5

### Implemented

- Corridor camera moved to z=6.95 looking forward
- Exterior water cards only; motor pulled into the wide shot
- Larger helm display
