# Rubric 9 — Ships: the 20-point quality rubric, traffic, sound, landing, boarding

Goal: the sky over Coruscant is full of ships that look like Star Wars ships, sound like them, land like them, and can
be boarded and ridden. Every ship model is graded against the 20 points below; a model ships only at ≥ 16/20 with no
FAIL on points 1-8 (structure). `scripts/test-ships.mjs` checks the mechanical points automatically; the visual points
are the critic's.

## The 20-point ship rubric (per model)

| # | Point | Check |
| --- | --- | --- |
| 1 | Scale: hull length 14-40 blocks, wingspan/height in canon proportion (±20%) to the ship it evokes | automatic (grid dims) |
| 2 | Silhouette: recognisable from 120 blocks as its class (shuttle, starfighter, freighter, gunship, yacht, hauler, police speeder, bus) | critic |
| 3 | Symmetry: mirrored about the long axis unless the design is deliberately asymmetric (freighter cockpit) | automatic |
| 4 | Hull material variety: ≥ 5 block types on the exterior, panel lines (dark seams every 3-5 blocks), hazard/colour stripes | automatic (types) + critic |
| 5 | Engines: ≥ 2 engine blocks with emissive cores (blue/red/white), thrust glow scales with speed | automatic + critic |
| 6 | Cockpit: glass canopy with a visible pilot seat and console behind it | automatic (glass + seat + console adjacency) |
| 7 | Interior: an enclosed walkable volume (≥ 2 blocks headroom) with a floor, ≥ 4 seats or bunks, ≥ 1 console, lighting ≥ 6 everywhere | automatic (flood fill from the door) |
| 8 | Door/ramp: one boarding door or ramp reachable from the ground when landed, opening toward the pad; the interior flood fill reaches the cockpit | automatic |
| 9 | Landing gear / skids that extend on approach and retract after take-off | automatic (animation states) + critic |
| 10 | Class animation: shuttle wings fold up on landing, starfighter S-foils close, freighter ramp lowers, gunship side doors slide | automatic (state exists) + critic |
| 11 | Lights: navigation lights (red/green wingtips), landing lights when approaching, cabin light through windows at night | critic |
| 12 | Detail density: greebles (vents, antennae, guns, pipes) on ≥ 15% of exterior cells; no flat 5×5 untextured patches | automatic (surface variety) |
| 13 | Colour story: one primary hull colour, one accent, one dark seam colour; no rainbow | critic |
| 14 | Texture fit: block textures read correctly at ship scale (no wood grain, no wool on hulls) | critic |
| 15 | Motion: banked turns (roll ≤ 25°), pitch on climb/descent, smooth spline path, no popping; hover wobble when landed-hovering | critic (recording) |
| 16 | Sound: a low layered engine hum (60-140 Hz fundamentals + filtered noise), doppler and distance falloff, a landing whine and a take-off surge; nothing above 1.5 kHz dominant | automatic (analyser spectrum) + critic |
| 17 | Shadow and shading: casts a shadow, receives sun/fog, chrome specular on the hull | critic |
| 18 | Performance: instanced when far; a boarded ship is one voxel mesh ≤ 6k tris; ≤ 2 draw calls per far type | automatic |
| 19 | Collision: standing on the hull or inside works while it moves (Vehicle carry); no falling through when it banks | automatic (carry test) |
| 20 | Originality: no copied asset; the design evokes the class without being a 1:1 model | critic |

## Fleet acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| A | ≥ 8 models: Lambda-style shuttle (folding wings), X-wing-style starfighter (S-foils), YT-style freighter (ramp), LAAT-style gunship (side doors), Naboo-style chrome yacht, cargo hauler, police speeder, air bus; each ≥ 16/20 | `scripts/test-ships.mjs` report |
| B | ≥ 30 ships in the air over the city at any time within 300 blocks of the spaceport, on lanes that avoid buildings, plus landing/take-off cycles on every pad | census in CDP |
| C | Boarding: right-click a landed or slow ship within 6 blocks → the door opens and the player can walk in; the ship waits ≤ 20 s at a pad then flies its route with the player inside (walkable, Vehicle carry); right-click the door again or a "Leave ship" key exits on the next landing; HUD shows destination | CDP ride test hangar-to-hangar |
| D | Hum: the "hummingbird" sound is gone; per-ship hum with doppler; ≤ 8 simultaneous voices, nearest first | spectrum test |
| E | The spaceport shows ships being repaired: 2-3 docked ships with sparks, mechanics at work, a gantry | screenshot |
| F | Perf: ≤ +25 draw calls, ≤ +2 ms JS at 10 chunks vs baseline | bench |

## Design notes

- Far ships stay instanced per type as today; the ship the player targets/boards is promoted to a `ShipVehicle`
  (extends `Vehicle`, grid from the model, interiors from the model's interior box list) and the instanced copy is
  hidden; on exit the instance takes over again at the same route time.
- Animation states (gear, wings, ramp) are separate small voxel grids swapped/rotated by state; the state is a pure
  function of the route phase so it is deterministic and needs no network traffic.
- Engine hum: per audible ship a `loopStart` with two oscillators (sawtooth at f0, sine at 2·f0) into a low-pass
  at 400-900 Hz plus brown noise; f0 = 70-110 Hz per class, pitch × (1 + speed/600) for doppler, gain by distance.
