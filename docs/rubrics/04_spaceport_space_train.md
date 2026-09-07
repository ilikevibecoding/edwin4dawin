# Rubric 4 — Spaceport and the rideable space train (and later, spaceship travel)

Goal: a spaceport at the edge of the frontier and one at Coruscant, connected by an elevated hyperlane along which a
space train runs on a schedule. The player can walk around inside the moving train, sit, look out, jump off and jump
back on, with no glitches. The same vehicle system later carries the player in spaceships between worlds.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Vehicle core: a moving voxel structure with its own block grid, pose (position along a path, yaw), mesh from the chunk mesher; player and NPC collision includes vehicle blocks; anything standing on the vehicle is carried exactly (no drift, no jitter at 20 TPS with render interpolation) | Unit test: player standing on a 30 blocks/s vehicle stays within 0.02 blocks of its spot for 60 s; jump inside lands on the same spot |
| 2 | Boarding/alighting: walking or jumping onto the moving vehicle attaches you; stepping/jumping off detaches you with the vehicle's velocity added (you fly off realistically); no fall-through when the vehicle moves under you | Recording |
| 3 | The train: ≥ 4 cars (engine + passenger cars + observation car) with walkable aisles, seats, windows, doors that open at stations, interior lighting; total length ≥ 60 blocks | Walk-through recording inside while moving |
| 4 | Hyperlane: an elevated track (y ~90 over the ocean) with supports every 32 blocks, station approaches, from the frontier spaceport (south-east of Dustwater) to Coruscant's spaceport (3000 blocks); generated lazily as a structure | Aerial screenshots along the route |
| 5 | Stations: platform with edge doors, waiting hall, timetable board (text), stairs to ground/boulevard; at Coruscant the station connects to the spaceport concourse | Walk from the frontier station into the train, ride to Coruscant, walk out into the spaceport |
| 6 | Schedule: the train runs on the shared 20 TPS clock (position = f(tick)) so it is identical for every client; dwell 20 s at each end, ride ~100 s at 30 blocks/s, smooth accel/decel; departure/arrival announcements in chat | Two clients see the train within 0.5 blocks |
| 7 | Streaming keeps up: chunks along the hyperlane generate ahead of the train (predictive preload along the path); no holes/pop-in under the train | Ride recording without missing chunks |
| 8 | Performance: the ride stays ≥ 60 fps on a real GPU; the train ≤ 12 draw calls | Bench during the ride |
| 9 | Robustness: pause/`T` time skip/teleport away and back do not desync the train; leaving the train mid-ride puts you on the ocean or track supports without invisible walls | Edge-case test |
| 10 | Later (Phase S): spaceships are vehicles too: board at a pad, take off, fly (scripted or piloted) to the Death Star hangar, land; the same carry mechanic | — |

## Design notes

- `src/vehicles/vehicle.js`: `Vehicle { grid: Uint8Array(w*h*d), origin, pose(t) → {x,y,z,yaw}, mesh }`; yaw limited to
  multiples of 90° for the train (axis-aligned collision), arbitrary for ships (rotate the player's position into vehicle
  space with the inverse yaw).
- Collision: `collectBoxes(world, region)` gains `vehicles.collectBoxes(region)`; each vehicle contributes boxes of its
  solid cells within the region transformed to world space.
- Carry: after the player's move, if the player's box rests on a vehicle cell (contact from above) or is inside its
  aisle volume with feet on its floor, record `player.vehicle = v`; at the start of the next tick move the player by the
  vehicle's displacement since the last tick before running normal physics. The same for NPCs later.
- Path: a polyline with per-segment speeds; the train's schedule is a periodic function of the tick.
- Interior: seats (stairs blocks), tables, lamps, glass panes, sliding doors (open at stations via a state flag).
