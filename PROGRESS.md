# Progress

## Current status

- Iteration: 12 (stopping condition: iteration 12 complete)
- Consecutive all-pass iterations: 0
- Average FPS: 20.3 (SwiftShader, indicative only)
- One-percent-low FPS: 20
- Average frame time: 49.29 ms
- Draw calls: 2878
- Triangle count: 335183
- Texture count: 105
- Renderer: ANGLE (Google, Vulkan 1.3.0, SwiftShader Device Subzero)
- Stopping-condition status: **fired — iteration 12 complete**. Not two consecutive all-pass.

## Final summary

### Why the stopping condition fired

Iteration 12 finished with a clean production install, production build, preview server, and a full regenerated Playwright suite. Interaction and traversal tests passed. Visual rubric items did not reach two consecutive all-pass cycles. The loop stops because numbered iteration 12 is complete.

### Which rubric items passed

- **12. The player can genuinely walk into the back** — `shots/iter_12/interactions.json` traversal z=7.875
- **13. Interactions work** — pointer lock, sonar, rest, silent running, movement, collision all pass

### Which items remain weak

- 1 spatial construction still reads as a simple tube with frames, not plated shipbuilding
- 2 control room has real generated displays but sparse side structure
- 3 corridor has hatch/pipes/stencil but large clean wall regions
- 4 crew bunks remain geometric; fabric improved but not convincing
- 5 machinery still primitive clusters; motor does not read as a hero asset
- 6–7 materials/wear are canvas maps that often look like blotchy noise
- 8–9 lighting and post are present but flat in several views
- 10 underwater view is a teal disc with highlights, not layered motion
- 11 palette is mostly consistent tan/green/orange but hatch rust looks like camouflage
- 14 ~20 fps on SwiftShader, ~2878 draw calls
- 15 cold-look fails: still a Three.js prototype, not an AA submarine game

### Strongest screenshot

`shots/iter_12/corridor.png` — cylindrical hull, ribs, open hatch, CTRL stencil, pipes, and a view through to the helm.

### Weakest screenshot

`shots/iter_12/engineRoom.png` — catwalk and primitive blocks; does not sell a propulsion compartment.

### Final metrics

- FPS: 20.3 (indicative; software renderer)
- One-percent-low FPS: 20
- Frame time: 49.29 ms
- Draw calls: 2878
- Triangles: 335183
- Renderer: SwiftShader Device (Subzero)

### Known technical limitations

- Headless Chromium uses SwiftShader; FPS is not a hardware benchmark
- `renderer.info` draw-call count is high because most meshes are unbatched
- Pointer lock is tested in headless with a documented caveat
- GPU ReadPixels stalls appear as console warnings during screenshots
- No page or WebGL errors

### Remaining visual limitations

- Geometry is still mostly primitives with bevels, not sculpted construction
- Wear maps are large-scale noise rather than contact-logical masks
- Forward window does not show readable terrain or parallax layers
- Engine room camera and assets never reached hero density
- Fabric reads better than iteration 1 but still hard-edged

### What five additional iterations would improve

1. Boolean-style hatch coamings and plated hull panels between every rib
2. A lathed, labeled propulsion motor filling the aft wide shot
3. Window shader that composites the water RT without glass washout
4. Merge/instance kits to drop draw calls below ~400
5. Contact-only wear (rails, sills, deck center) instead of uniform noise

### System descriptions

- **Pressure-hull system:** Inverted cylinder along Z, T-ribs as XY tori, ring bulkheads, parked hatch discs, raised deck with grate pits, wainscot green, shared overhead pipe bank
- **Control room:** Helm with three canvas displays (heading/depth/status), sonar and nav stations, seats, chart, viewport ring and glass
- **Crew spaces:** Four bunks with mattress/blanket/pillow, lockers, fold table, galley, washroom alcove
- **Aft machinery:** Scaled motor + gearbox + shaft, pumps, compressor, cabinets, catwalk, valves, gauges, silent-running panel
- **Procedural materials:** Canvas albedo/roughness/normal families for paint, steel, oil, rubber, fabric, glass, rust, wet, grate
- **Underwater environment:** Separate scene to RT — fog, particles, rocks, flood cones, painted ridge backdrop
- **Lighting:** Room practicals, window spill, rest/silent states, PMREM from tinted RoomEnvironment
- **Post-processing:** ACES, GTAO, bloom, vignette/grain/grade shader
- **Collision and interaction:** Capsule vs AABB, raycast E-prompts, sonar ping + Web Audio, rest fade, silent-running toggle, `window.debugAPI`

### Final commit hash

`31dc06da86b2ee2b0c6ec2a40027857af5343ec0`

## Art direction

Original unbranded expedition DSV **Abyssal Surveyor**. Warm off-white / naval-green hull, gunmetal machinery, restrained instrument green/amber, deep blue-green exterior.

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

## Iteration log (abbreviated)

### Iteration 1

First integrated scene. All visual items fail. Movement tests fail (synthetic key events). Commit `133c88e2`.

### Iteration 2

Parked hatches, brighter lights, less grain. Cameras still on bulkhead rings. Commit `a27e6544`.

### Iteration 3

`stepPlayer` added. Movement pass. Traversal blocked by crew table. Commit `0ff093d3`.

### Iteration 4

Cleared centerline. All interaction tests pass (traversal z=7.875). Ribs still longitudinal hoops. Commit `3aa4d509`.

### Iteration 5

Ribs and hatch rings oriented on hull frames. Spatial read improves. Commit `3bcd8c92`.

### Iterations 6–11

Motor fins merged, cameras reframed, water backdrop, dome replaced with ring bulkhead, bunk fabric and brackets. Interactions stay green. Visual items remain fail. Commits `fe75999d` … `4208ea42`.

### Iteration 12

Clean `npm ci`, production build, preview on :4173, full shot suite `shots/iter_12/`. Stopping condition fires.

### Rubric assessment (iteration 12)

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `corridor.png` / `controlRoom.png` show a tube with ribs and a hatch, but still a simple cylinder rather than constructed plating

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `controlRoom.png` has readable generated displays; sides remain sparse boxes

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `corridor.png` has pipes, hatch, CTRL stencil; large undetailed tan/green walls remain

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: `crewQuarters.png` bunks are still hard-edged blocks with simple bedding

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `engineRoom.png` is a catwalk over primitive clusters

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: hatch rust is blotchy camouflage; walls read as flat paint

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: wear is uniform noise, not contact-logical

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: warm overheads exist; several views still feel ambient-flat

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: ACES/GTAO/bloom/grain are in code and faintly visible; not a balanced cinematic grade

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `forwardViewport.png` is a teal disc with glass highlights

#### 11. One cohesive palette
- PASS/FAIL: FAIL
- Evidence: tan/green/orange is shared, but hatch texture breaks the maintained-vessel look

#### 12. The player can genuinely walk into the back
- PASS/FAIL: PASS
- Evidence: traversal z=7.875 in `interactions.json`

#### 13. Interactions work
- PASS/FAIL: PASS
- Evidence: all seven interaction fields pass

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: no page/WebGL errors; SwiftShader ~20 fps; 2878 draw calls

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: the four primaries still read as a Three.js prototype, not an indie/AA submarine game

### Technical metrics (iteration 12)

- FPS: 20.3
- One-percent-low FPS: 20
- Frame time: 49.29 ms
- Draw calls: 2878
- Triangles: 335183
- Textures: 105
- Programs: 38
- Console errors: none (ReadPixels performance warnings only)
- Page errors: none
- WebGL errors: none
- Renderer: SwiftShader software

### Interaction tests (iteration 12)

- Pointer lock: pass
- Movement: pass
- Collision: pass
- Sonar: pass
- Rest: pass
- Silent running: pass
- Full forward-to-aft traversal: pass

### Next iteration fix list

1. Hero motor and connected plumbing that fill `engineRoom.png`
2. Window compositing that shows terrain and particles
3. Contact-logical wear and plated hull panels
4. Batch/instance to cut draw calls
5. Crew fabric with supporting hardware and personal detail

### Commit

- Commit hash: 31dc06da
- Commit message: Final iteration 12 production verify and progress summary
