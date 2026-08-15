# Progress

## Current status

- Iteration: 4
- Consecutive all-pass iterations: 0
- Average FPS: 21 (SwiftShader — indicative only)
- One-percent-low FPS: 20
- Average frame time: 47.59 ms
- Draw calls: 720
- Triangle count: 77090
- Texture count: 124
- Renderer: ANGLE SwiftShader
- Stopping-condition status: 2/12 iterations complete, 0 consecutive all-pass, continuing

## Iteration 1

### Implemented

- Vite + Three.js + Playwright harness with `window.debugAPI`
- Cylindrical pressure hull, ribs, decks, circular bulkheads, continuous rooms
- Control room consoles, generated sonar/nav/depth displays, viewport frame
- Corridor pipes, valves, porthole, junction boxes
- Crew bunks, galley, washroom alcove
- Aft motor, gearbox, pumps, cabinets, catwalk, silent-running panel
- Procedural PBR canvas maps, lighting states, ACES + bloom + grade
- Underwater particles, terrain drift, floodlights
- Pointer lock, WASD, three interactions, collision world
- Screenshot suite `tools/shots.mjs`

### Agent assignments

- Pressure hull: lead (layout + hull + dressing)
- Control room: lead
- Corridor: lead
- Crew spaces: lead
- Machinery: lead
- Materials: lead
- Water: lead
- Lighting: lead
- Player and interactions: lead
- Performance: software-renderer path (no GTAO, no shadows)

### Asset loops

#### Pressure hull
- Attempts: 2
- Result: FAIL — cylinder and ribs read, but interior still looks like a tube with panels
- Remaining weaknesses: wood-like tan, empty volume, ribs not structurally dressed

#### Control room
- Attempts: 2
- Result: FAIL — consoles are blocky; screens only read in the dedicated sonar closeup
- Remaining weaknesses: no dense station composition, viewport not readable in room shot

#### Corridor
- Attempts: 2
- Result: FAIL — pipes exist but float; large undetailed green panels
- Remaining weaknesses: brackets, terminations, floor wear, porthole not in frame

#### Crew quarters
- Attempts: 1
- Result: FAIL — bunks are brown boxes; fabric does not read as cloth
- Remaining weaknesses: bedding, personal detail, galley barely in frame

#### Machinery room
- Attempts: 2
- Result: FAIL — motor is a dark unreadable blob; closeup framed a featureless curve
- Remaining weaknesses: layered readable machinery, lighter materials, catwalk

#### Materials and wear
- Attempts: 2
- Result: FAIL — panel seams visible, but no convincing paint/metal/oil/fabric split
- Remaining weaknesses: wear logic, roughness contrast, rust/grease/condensation

#### Underwater exterior
- Attempts: 1
- Result: FAIL — viewport shot looks at hull/periscope, not a deep-water view
- Remaining weaknesses: framing, depth layers, floodlight cones, window thickness

#### Lighting and post
- Attempts: 2
- Result: FAIL — flat ambient, blown highlights, GTAO disabled on SwiftShader
- Remaining weaknesses: room identity, contact shadows, balanced bloom

#### Collision and interactions
- Attempts: 1
- Result: FAIL — sonar works; rest/silent/traversal failed; movement just under threshold
- Remaining weaknesses: aim reliability, centerline blockers, walk time/yaw

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png`, `corridor.png` read as a cylinder, but as an empty tube with boxes, not a packed vessel.

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` is sparse blocky furniture. `sonarConsole.png` is the only shot with a real generated display.

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` has pipes and green placeholder panels; large undetailed hull regions remain.

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` shows stacked brown box bunks and little lived-in detail.

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` is a dark central blob in a tube. `machineryCloseup.png` is an unreadable dark curve.

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: hull looks like tiled tan wood; metals are flat black or chrome; fabric is a brown box.

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: no readable contact wear, grease, rust, or condensation in any primary shot.

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: even wash, hard isolated highlights, no room-specific key/fill/accent.

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: mild grade/grain present; no AO on software path; not enough to lift the image.

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` does not show a framed underwater exterior.

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: tan wood hull + olive placeholders + black blobs do not read as one naval palette.

#### 12. The player can genuinely walk into the back
- PASS/FAIL: FAIL
- Evidence: `interactions.json` traversal stayed at z≈10.45. Fold-down table collider blocks the centerline.

#### 13. Interactions work
- PASS/FAIL: FAIL
- Evidence: pointer lock and sonar passed. Rest and silent running did not change status. Movement delta −0.145 vs −0.15 threshold.

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: no page/WebGL errors, but 21 fps on SwiftShader, 718 draw calls, floating props, featureless closeup.

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: all four primaries read as a primitive Three.js tube demo, not an indie/AA submarine game.

### Technical metrics

- FPS: 21
- One-percent-low FPS: 20
- Frame time: 47.22 ms
- Draw calls: 718
- Triangles: 78920
- Textures: 124
- Programs: 33
- Console errors: 0
- Page errors: 0
- WebGL errors: 0
- Renderer: SwiftShader (software). FPS is indicative only.

### Interaction tests

- Pointer lock: pass
- Movement: fail (delta −0.145)
- Collision: pass
- Sonar: pass
- Rest: fail
- Silent running: fail
- Full forward-to-aft traversal: fail

### Next iteration fix list

1. Reframe cameras off the tube axis; fix viewport and machinery closeups
2. Replace placeholder green panels with detailed racks; fill eye-level volume
3. Recolor machinery to readable gunmetal/blue-gray; rebuild motor silhouette
4. Make consoles and generated screens dominate the control-room frame
5. Clear the walkable centerline; fix movement yaw and interaction aiming
6. Darker naval hull, stronger wear, practical light pools
7. Rebuild the window so the underwater view is unmistakable

### Commit

- Commit hash: 35d15643
- Commit message: Record iteration 1 screenshots and rubric failures.

## Iteration 2

### Implemented

- Bow ring opening so the hull no longer occludes the viewport
- Larger circular viewport; lighter machinery colors
- Fold-down table moved off the walkable centerline
- Cameras reframed; motor work light added
- Interaction tests wait for prompts

### Rubric assessment

All 15 items FAIL. `controlRoom.png` looks at hull/void instead of stations. `forwardViewport.png` shows floodlight blobs in a dark void, not terrain. `engineRoom.png` is still a black box in a tube. `crewQuarters.png` has a curtain clipping a bunk. Rest/silent prompts never appeared. Movement delta 0 (synthetic keydown). Traversal only 0.38 m — bulkhead friction.

### Technical metrics

- FPS: 21 · frame 47.59 ms · draw 720 · tris 77090 · textures 124 · page errors 0
- Renderer: SwiftShader

### Interaction tests

- Pointer lock: pass · Collision: pass · Sonar: pass
- Movement: fail · Rest: fail · Silent: fail · Traversal: fail

### Next iteration fix list

1. Use Playwright `keyboard.down('w')` / `press('e')` instead of synthetic events
2. Start walk tests in open corridor, widen hatch colliders
3. Place a large lit rock immediately outside the bow window
4. Frame cameras on consoles, bunks, and the motor — not the tube axis
5. Remove clipping curtain; enlarge interact volumes

### Commit

- Commit hash: 7520b71e
- Commit message: Record iteration 2 screenshots and harden interaction tests.

## Iteration 3

### Implemented

- Control-room camera framed on the sonar station
- Larger transparent interact volumes
- Playwright real keyboard events
- Rocks added outside the bow (still mostly out of frame)

### Rubric assessment

All 15 items FAIL. `controlRoom.png` now reads as a sonar station with a generated display — strongest shot so far — but still sparse. `forwardViewport.png` remains a dark void with floodlight blobs. Movement delta −0.019 m; rest/silent prompts timed out; traversal z=8.39 from 8.6.

### Next iteration fix list

1. `holdForward` plus `aimInteract` so tests hit the real movement and raycast paths
2. Center a large unlit rock silhouette in the viewport
3. Keep densifying rooms and lighting

### Commit

- Commit hash: pending
- Commit message: Iteration 3 screenshots; reliable interact/move helpers
