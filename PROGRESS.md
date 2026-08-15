# Progress

## Current status

- Iteration: 6
- Consecutive all-pass iterations: 0
- Average FPS: ~20 (SwiftShader, indicative only)
- One-percent-low FPS: 20
- Average frame time: ~49 ms
- Draw calls: ~2850
- Triangle count: ~332000
- Texture count: 103
- Renderer: ANGLE / SwiftShader Device (Subzero) — software renderer
- Stopping-condition status: 0 of 2 consecutive all-pass; loop continues toward iteration 12

## Art direction

Original unbranded expedition DSV **Abyssal Surveyor**. Warm off-white / naval-green pressure hull, gunmetal machinery, restrained amber/green instruments, deep blue-green exterior.

## File ownership

- Pressure hull / layout: `src/layout.js`, `src/submarine.js`, `src/geom.js`
- Control room: `src/controlRoom.js`
- Corridor: `src/corridor.js`
- Crew spaces: `src/crewQuarters.js`
- Machinery: `src/engineRoom.js`, `src/machinery.js`, `src/pipes.js`
- Materials: `src/materials.js`, `src/textures.js`
- Water: `src/water.js`
- Lighting: `src/environment.js`
- Player / interactions: `src/player.js`, `src/interact.js`
- Post: `src/post.js`
- Integration / debug API: `src/main.js`
- Screenshots: `tools/shots.mjs`

## Iteration 1

### Implemented

- Full module split and first integrated scene

### Rubric assessment

All 15 items FAIL. Evidence in `shots/iter_1/`. Hatch spokes blocked the walkway; lighting crushed; movement tests used non-registering KeyboardEvents.

### Interaction tests

- Pointer lock / sonar / rest / silent: pass
- Movement / traversal: fail

### Commit

- 133c88e2 — Add walkable submarine interior demo (iteration 1)

## Iteration 2

### Implemented

- Parked hatch doors, brighter lights, less grain, larger motor, holdKey tests

### Rubric assessment

Still all visual FAILs. Cameras sat on bulkhead rings. `shots/iter_2/`.

### Interaction tests

- Movement / traversal still fail (rAF starved inside Playwright evaluate)

### Commit

- a27e6544 — Improve hull, lighting, cameras, and interaction tests (iter 2)

## Iteration 3

### Implemented

- Room-center cameras, `stepPlayer`, water terrain in frustum

### Rubric assessment

Hull still fighting longitudinal hoops. Movement pass, traversal z=0.76 fail (crew table in the path). `shots/iter_3/`.

### Commit

- 0ff093d3 — Reframe cameras, fix stepPlayer tests, strengthen water (iter 3)

## Iteration 4

### Implemented

- Cleared centerline furniture/rails, wider hatch colliders, control camera on helm

### Rubric assessment

#### 1. Spatial layout
- FAIL: cylinder exists but ribs/hatch rings were still longitudinal hoops (`controlRoom.png`, `corridor.png`)

#### 12–13. Walk / interactions
- PASS: traversal z=7.875, all interaction tests pass (`interactions.json`)

#### 15. Cold-look
- FAIL: chrome pillars and boxy rooms

### Interaction tests

- All pass

### Commit

- 3aa4d509 — Clear centerline path and reframe control-room view (iter 4)

## Iteration 5

### Implemented

- Ribs and hatch coamings oriented on the hull cross-section (the pillar bug)

### Asset loops

#### Pressure hull
- Attempts: 5
- Result: improved — cylinder and frames now read
- Remaining weaknesses: walls still too smooth; plates between ribs thin

#### Control room
- Attempts: 5
- Result: improved — generated displays readable
- Remaining weaknesses: stations still boxy; viewport water is a glow

#### Corridor
- Attempts: 5
- Result: improved — hatch, stencil, pipes, ribs
- Remaining weaknesses: large clean wall regions; faceted circles

#### Crew quarters
- Attempts: 5
- Result: FAIL
- Remaining weaknesses: bunks still simple blocks; fabric weak

#### Machinery room
- Attempts: 5
- Result: FAIL
- Remaining weaknesses: motor reads as a glossy black capsule; green box cabinets

#### Materials and wear
- Attempts: 5
- Result: FAIL
- Remaining weaknesses: wear maps too large-scale; metals still chrome-heavy

#### Underwater exterior
- Attempts: 5
- Result: FAIL
- Remaining weaknesses: `forwardViewport.png` still a tinted disc; porthole better cyan

#### Lighting and post
- Attempts: 5
- Result: PARTIAL
- Remaining weaknesses: grain reduced; still flat in some rooms

#### Collision and interactions
- Attempts: 5
- Result: PASS (runtime)

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `corridor.png` / `controlRoom.png` now show a tube with frames, but still read as a simple cylinder rather than constructed plating

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` has real display graphics (heading/depth/status) but empty hull sides

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` has pipes, hatch, stencil; still large undetailed tan regions

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` bunks are gray boxes with orange bars

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` black capsule + green slabs + two rails

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: hatch rust is blotchy noise; walls matte tan

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: wear not localized to handles/decks

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: functional warm overheads; little contact shadow identity

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: grain/bloom present but image still reads ungraded in close views

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` pale disc + glass highlights; no readable terrain

#### 11. One cohesive palette
- PASS/FAIL: FAIL
- Evidence: tan/green/orange is consistent, but rooms do not yet feel like one finished vessel

#### 12. The player can genuinely walk into the back
- PASS/FAIL: PASS
- Evidence: `interactions.json` traversal z=7.875

#### 13. Interactions work
- PASS/FAIL: PASS
- Evidence: pointer lock, sonar, rest, silent, movement, collision all pass

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: no page/WebGL errors; 2854 draw calls; SwiftShader ~20 fps; software renderer recorded

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` / `corridor.png` / `engineRoom.png` / `forwardViewport.png` still read as a Three.js prototype

### Technical metrics

- FPS: 20.3 (indicative)
- Draw calls: 2854
- Triangles: 332091
- Textures: 103
- Console / page / WebGL errors: none
- Renderer: SwiftShader

### Interaction tests

- Pointer lock: pass
- Movement: pass
- Collision: pass
- Sonar: pass
- Rest: pass
- Silent running: pass
- Full forward-to-aft traversal: pass

### Next iteration fix list

1. Make the motor read as painted industrial equipment, not a black capsule
2. Put readable terrain in the forward window
3. Add curved plates and more corridor greebles
4. Improve bunk fabric
5. Reduce draw calls

### Commit

- 3bcd8c92 — Orient hull ribs and hatch rings on the pressure-hull frames (iter 5)

## Iteration 6

### Implemented

- Merged motor fins, PROP MOTOR label, higher-segment viewport, brighter silt, curved plates between ribs, clearer glass

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
