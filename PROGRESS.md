# Progress

## Current status

- Iteration: 13 (performance / glitch pass after the original stop)
- Consecutive all-pass iterations: 0
- Average FPS: 55 render-side on SwiftShader (indicative; 1% lows hitch on first compiles)
- One-percent-low FPS: ~1.5 on first hitch, then ~20–55
- Average frame time: 18 ms (render duration, not the old 50 ms interval lock)
- Draw calls: 91–138
- Triangle count: 108704
- Texture count: 69–72
- Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
- Stopping-condition status: original stop already fired at iteration 12. This pass does not claim two all-passes. Visual rubric items still fail. Interactions still pass.

## Art direction

Used, maintained, cramped expedition submarine. Industrial realism rather than science fiction. Warm off-white / naval-green hull, gunmetal machinery, restrained amber and green instruments, deep blue-green exterior spill.

## File ownership

- Pressure hull: `src/submarine.js`, `src/geom.js`, `src/collision.js`
- Control room: `src/controlRoom.js`, `src/displays.js`
- Corridor: `src/corridor.js`
- Crew spaces: `src/crewQuarters.js`
- Machinery: `src/engineRoom.js`, `src/machinery.js`
- Construction kit: `src/kit.js`
- Materials: `src/materials.js`
- Water / vista: `src/water.js`, `src/vista.js`
- Lighting: `src/environment.js`
- Player and interactions: `src/player.js`, `src/interact.js`
- Presentation: `src/post.js`, `src/debug.js`, `src/main.js`

## Iteration 13

### Implemented

- Stopped glass from writing depth over the underwater vista
- Merged static meshes after converting to non-indexed geometry (671 → ~100 draw calls)
- Replaced the 50 ms `setInterval` FPS lock with rAF + measured render time
- Fixed vibration drift (`+= sine` every frame)
- Removed shader-discard hull holes that leaked jagged water through the cylinder
- Closed the open stern cap; removed floating lining plates
- One shadow map, cheaper materials, smaller textures, fewer particles
- Brighter room lights, less fog/grain
- Bow window insert so the viewport is a teal water plane instead of a black void

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
- Remaining weaknesses: still a faceted tube with thin ribs

#### Control room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: box consoles; window now readable but still a flat insert

#### Corridor
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: strongest room; still sparse and aliased

#### Crew quarters
- Attempts: 0 this pass
- Result: FAIL
- Remaining weaknesses: block bunks

#### Machinery room
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: primitive masses; better aft wall, still not a hero engine room

#### Materials and wear
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: weaker orange-peel; still no contact wear

#### Underwater exterior
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: window is no longer black; still a flat teal card with dots

#### Lighting and post
- Attempts: 1
- Result: FAIL
- Remaining weaknesses: brighter, less muddy; still flat

#### Collision and interactions
- Attempts: 1
- Result: PASS
- Remaining weaknesses: same headless pointer-lock limits

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `shots/iter_14/corridor.png` is still a tube with props.

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `shots/iter_14/controlRoom.png` is box consoles and a small window.

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `shots/iter_14/corridor.png` has pipes and a hatch, with large empty hull patches.

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: bunks through the hatch remain stacked boxes.

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `shots/iter_14/engineRoom.png` is dark primitives.

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: hull noise is still generic.

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: no readable contact wear.

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: brighter than iter_12, still mostly one warm wash.

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: ACES/bloom/grade present; grain reduced. A maybe is a fail.

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: viewport is no longer black; it is a flat teal card. Fail.

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: tan/olive/black is consistent. A maybe is a fail.

#### 12. The player can genuinely walk into the back
- PASS/FAIL: PASS
- Evidence: `shots/iter_14/interactions.json` traversal ended at z=18.3.

#### 13. Interactions work
- PASS/FAIL: PASS
- Evidence: sonar, rest, silent running, movement, collision all passed.

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: draw calls dropped to ~100 and merge errors are gone, but 1% lows hitch and the image still has aliasing / primitive construction.

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: still reads as a Three.js / student demo.

### Technical metrics

- FPS: 55 (SwiftShader render timing; indicative)
- One-percent-low FPS: 1.5 on compile hitch
- Frame time: 18 ms
- Draw calls: 91–138
- Triangles: 108704
- Textures: 69–72
- Programs: 27
- Console errors: none after the merge fix (SwiftShader ReadPixels warnings only)
- Page errors: none
- WebGL errors: none
- Renderer: SwiftShader / ANGLE Vulkan

### Interaction tests

- Pointer lock: PASS
- Movement: PASS
- Collision: PASS
- Sonar: PASS
- Rest: PASS
- Silent running: PASS
- Full forward-to-aft traversal: PASS

### Next iteration fix list

1. Rebuild control-room stations and the bow window as a thick opening with a layered underwater vista.
2. Rebuild the propulsion motor and fill the engine-room frustum.
3. Panelize hull materials and add contact wear.
4. Add corridor cable-tray density until empty hull patches are gone.

### Commit

- Commit hash: pending
- Commit message: Cut draw calls and fix the worst viewport/glitch failures.

## Iteration 12

### Implemented

- Full numbered loop through iteration 12
- Production clean install, build, and preview verification (`shots/iter_final`)
- Interaction and traversal tests remain green from iteration 4 onward

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
- Attempts: multiple across iterations 1–6
- Result: FAIL
- Remaining weaknesses: cylinder plus hoop ribs still reads as a tube; lining plates look pasted on

#### Control room
- Attempts: multiple
- Result: FAIL
- Remaining weaknesses: consoles remain boxy; displays are small and hard to read from the rubric camera

#### Corridor
- Attempts: multiple
- Result: FAIL
- Remaining weaknesses: strongest room, but still missing cable-tray density, hatch wheels in-frame, and localized wear

#### Crew quarters
- Attempts: 2
- Result: FAIL
- Remaining weaknesses: bunks are compact boxes; fabric reads weakly under the scene lighting

#### Machinery room
- Attempts: multiple
- Result: FAIL
- Remaining weaknesses: motor and pumps are primitive masses; floating green plates; empty rear composition

#### Materials and wear
- Attempts: 2
- Result: FAIL
- Remaining weaknesses: hull orange-peel is global; wear is not contact-logical in screenshots

#### Underwater exterior
- Attempts: multiple
- Result: FAIL
- Remaining weaknesses: viewport often reads as a dark void; terrain silhouette is inconsistent; no convincing floodlit motion

#### Lighting and post
- Attempts: 3
- Result: FAIL
- Remaining weaknesses: rooms are dim or muddy; bloom/grain do not hide the primitive construction

#### Collision and interactions
- Attempts: 3
- Result: PASS
- Remaining weaknesses: headless pointer-lock release is limited; simulation must be stepped under SwiftShader timer throttle

### Rubric assessment

#### 1. Spatial layout and submarine silhouette
- PASS/FAIL: FAIL
- Evidence: `shots/iter_final/corridor.png` and `controlRoom.png` show a cylinder with ribs, but rooms still feel like props in a tube.

#### 2. Control-room quality
- PASS/FAIL: FAIL
- Evidence: `shots/iter_final/controlRoom.png` is box consoles, a periscope pole, and a tiny dark window.

#### 3. Corridor detail density
- PASS/FAIL: FAIL
- Evidence: `shots/iter_final/corridor.png` has pipes, rails, KEEP CLEAR, and a hatch, with large undetailed hull regions remaining.

#### 4. Crew quarters feel inhabited
- PASS/FAIL: FAIL
- Evidence: bunks visible through the corridor hatch are stacked boxes; fabric and galley do not read as lived-in.

#### 5. Aft machinery room looks mechanically believable
- PASS/FAIL: FAIL
- Evidence: `shots/iter_12/engineRoom.png` is dark primitive masses, noisy pipe caps, and floating plates.

#### 6. Materials read as physical
- PASS/FAIL: FAIL
- Evidence: hull noise is uniform orange-peel; metals do not separate cleanly from paint.

#### 7. Wear and grime follow physical logic
- PASS/FAIL: FAIL
- Evidence: no readable contact wear, chips, or grease in the primary shots.

#### 8. Lighting reads as intentional
- PASS/FAIL: FAIL
- Evidence: corridor has a usable overhead pool; control and engine remain muddy; viewport has almost no readable key light.

#### 9. Post-processing is active and balanced
- PASS/FAIL: FAIL
- Evidence: ACES, bloom, vignette, and grain are present, but grain and dim exposure hide geometry. A maybe is a fail.

#### 10. Underwater view sells depth and motion
- PASS/FAIL: FAIL
- Evidence: `shots/iter_final/forwardViewport.png` is a near-black field with one particle and a sliver of rock.

#### 11. One cohesive palette across every room
- PASS/FAIL: FAIL
- Evidence: tan hull / olive boxes / black pipes are consistent, but the set still looks assembled rather than designed. A maybe is a fail.

#### 12. The player can genuinely walk into the back
- PASS/FAIL: PASS
- Evidence: `shots/iter_final/interactions.json` traversal ended at z=18.3 with no teleport.

#### 13. Interactions work
- PASS/FAIL: PASS
- Evidence: pointer lock, movement, collision, sonar, rest (`6 hours pass.` / `Rested.`), and silent running all passed on production preview.

#### 14. Technical quality is clean
- PASS/FAIL: FAIL
- Evidence: no page errors; SwiftShader 20 fps / 50 ms; 671 draw calls; floating plates and noisy pipe caps remain visible.

#### 15. The cold-look test
- PASS/FAIL: FAIL
- Evidence: an uninformed viewer would call this a Three.js / student procedural demo, not an indie or AA submarine game.

### Technical metrics

- FPS: 20
- One-percent-low FPS: 20
- Frame time: 50 ms
- Draw calls: 671
- Triangles: 93242
- Textures: 74
- Programs: 33
- Console errors: none (SwiftShader ReadPixels performance warnings only)
- Page errors: none
- WebGL errors: none
- Renderer: SwiftShader / ANGLE Vulkan

### Interaction tests

- Pointer lock: PASS
- Movement: PASS
- Collision: PASS
- Sonar: PASS
- Rest: PASS
- Silent running: PASS
- Full forward-to-aft traversal: PASS

### Next iteration fix list

1. Rebuild control-room stations as layered beveled assemblies with readable generated screens facing the rubric camera.
2. Rebuild the propulsion motor and fill the engine-room frustum with connected pipes, catwalks, and cabinets that do not float.
3. Make the bow window a thick framed opening with a bright, layered underwater vista that reads in five seconds.
4. Replace global orange-peel with panelized painted steel and contact-based wear.
5. Add corridor cable trays, hatch wheels, and supported pipe runs until no large empty hull patch remains.

### Commit

- Commit hash: bed9f458
- Commit message: Complete iteration 12 and record the final production verification.

## Final summary

### Why the stopping condition fired

Iteration 12 completed. Every numbered iteration regenerated screenshots, recorded metrics, and was committed. Two consecutive all-pass iterations did not occur because visual rubric items 1–11, 14, and 15 remained fails.

### Which rubric items passed

- 12. Walkable continuous route from control room to aft machinery
- 13. Pointer lock, movement, collision, sonar, rest, and silent running

### Which items remain weak

- 1–5 spatial and room quality
- 6–7 materials and wear
- 8–9 lighting and post
- 10 underwater view
- 11 palette cohesion (maybe → fail)
- 14 technical image quality
- 15 cold-look test

### Strongest screenshot

`shots/iter_final/corridor.png` — cylindrical hull, ribs, pipes, rails, KEEP CLEAR, and a hatch into the next compartment.

### Weakest screenshot

`shots/iter_final/forwardViewport.png` — nearly black, does not sell a thick window or travelling underwater.

### Final metrics

- FPS: 20
- One-percent-low FPS: 20
- Frame time: 50 ms
- Draw calls: 671
- Triangle count: 93242
- Renderer: ANGLE SwiftShader (software). Treat FPS as indicative only.

### Known technical limitations

- Headless Chrome uses SwiftShader; GTAO was disabled to avoid ReadPixels stalls
- `setInterval` is throttled in this environment; tests step simulation via `debugAPI.simulateSeconds`
- Escape does not always release pointer lock in headless
- Draw-call count is high (~670) because kit parts are not fully instanced/merged

### Remaining visual limitations

- Primitive box consoles and machinery
- Global orange-peel instead of painted-panel construction
- Engine room does not read as a layered propulsion space
- Viewport does not show a convincing deep-water scene
- Fabric, condensation, and contact wear are not visible in the rubric cameras

### What five additional iterations would improve

1. Hero propulsion motor and connected pump/pipe systems framed for `engineRoom.png`
2. Control-room stations rebuilt around readable Canvas displays
3. A thick bow window and a three-layer underwater vista with floodlights
4. Panelized hull materials with edge chips and deck traffic
5. Draw-call merge/instancing so a real GPU can hold 60 fps with more detail

### System descriptions

- **Pressure-hull system:** inverted cylinder along Z, T-beam ribs, circular bulkheads with hatch openings, raised deck, optional lining plates, shader and geometry cutouts for windows
- **Control room:** helm, nav, sonar, seats, periscope, gauges, generated displays, forward window frame
- **Crew spaces:** four bunks, lockers, fold-down table, galley, washroom alcove
- **Aft machinery:** lathe/cylinder motor, gear case, pumps, compressor, cabinets, valves, catwalk rails, silent-running panel
- **Procedural materials:** canvas albedo/roughness/normal families for paint, metal, oil, rubber, fabric, glass, rust
- **Underwater environment:** particle layers, rock lathes, floodlight cones, plus a dedicated bow vista group
- **Lighting:** room spots/points, rest-cycle and silent-running multipliers, PMREM probe
- **Post-processing:** ACES, optional GTAO, bloom, vignette/grain grade
- **Collision and interaction:** AABB world, capsule player, raycast plus proximity aim, three E interactions

### Final commit hash

`bed9f4584d172014324cae4541689da698b42f17`
