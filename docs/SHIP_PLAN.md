# Ship development plan — Imperial-class Star Destroyer

Working title: **ISD *Vindicator***. This document is the design contract shared by every workstream
(exterior, bridge, interior rooms, hangar, fighters, cameras, performance). `src/spec.js` is the single
source of truth for every dimension listed here; if the two disagree, `spec.js` wins and this file is
updated.

## 1. Baseline (before this milestone)

Recorded in `shots/iter_baseline/` and `PROGRESS.md` (iterations 1–9):

| Metric (1280×720, SwiftShader software GL) | Value |
|---|---|
| Draw calls | 112–124 |
| Triangles | 226k–250k |
| Lights | 22 point/spot + hemisphere, all always on |
| Shader programs | 49 |
| Colliders | 69 AABBs |
| Bundle | 928 kB JS (307 kB gzip) |
| Frame time (software GL, relative only) | 2.4–2.8 s |

The baseline ship is the *Kestrel*: a 25 m light-freighter interior (corridor, cockpit, quarters,
galley, bathroom) with three interactions. There is no exterior, no vertical movement, no doors that
open, no camera other than the first-person eye, and the far field (planets at 2 km) is scaled for a
25 m ship.

## 2. Frame, scale and units

* Units are metres. `+X` starboard, `+Y` up, `-Z` forward (bow). Ship origin is on the centreline,
  roughly amidships.
* Hull length **1600 m** (bow tip `z = -1000`, stern `z = +600`), stern half-width **480 m**, hull
  thickness at the stern **130 m** (top plate `+52`, bottom plate `-78`). Bridge windows sit at
  `y ≈ 250`, 1200 m behind the bow tip and 250 m above the top plate: the vista the player gets from
  the bridge is the real hull, not a backdrop.
* The far field (stars, planets, nebulae, sun) is scaled ×60 so nothing out there is "next to" the
  ship any more: planets are 100–150 km away, stars at 260 km. Camera far plane 400 km; near plane is
  mode-dependent (0.1 m inside, 1–2 m outside) to keep 24-bit depth precision usable on a 1.6 km
  object.
* The *Kestrel* is preserved intact and docked on the hangar deck as the player's freighter (a scale
  reference: 25 m inside 220 m inside 1600 m). Its aft blast door now opens onto a boarding ramp.

## 3. Scene hierarchy

```
scene
├── space                     far field (scaled ×60): star layers, sun, nebulae, planets  [space.js]
├── dust                      near-camera streaks, exterior modes only
├── sun (DirectionalLight)    follows the space sun; adaptive shadow frustum tracks the camera
├── exterior                  [exterior/*]
│   ├── hull/<chunk-N>        lofted wedge hull, 16 z-chunks × THREE.LOD (3 levels)
│   ├── superstructure        terraces, tower neck, bridge module, shield domes, comms mast
│   ├── engines               3 main + 4 secondary bells, housing, glow, heat discoloration
│   ├── greebles              InstancedMesh per shape × material (hatches, boxes, vents, antennas…)
│   ├── weapons               turbolaser / ion batteries (LOD), sensor arrays
│   └── hangarMouth           ventral opening, containment-field plane, approach lights
├── interior                  [cells.js + rooms/*]  one Cell per room, toggled by the portal graph
│   ├── cell:<roomId>         group at room.origin; merged kit meshes; doors; props; light data
│   └── kestrel               the original interior + new exterior shell + ramp, parented to hangar
├── fighters                  [fighters/*]  TIE pool (InstancedMesh parts), shuttle, flight paths
└── camera                    first-person eye | orbit | fly | transition  [cameras.js]
```

## 4. Decks and rooms (all positions in `spec.js`)

| Deck | Floor y | Location in hull | Rooms |
|---|---|---|---|
| A — Bridge | 246 | bridge module, forward | `bridge`, `lobby_a`, `corridor_a`, `intel`, `tactical`, `comms`, `navigation` |
| B — Command | 232 | bridge module, below the bridge | `lobby_b`, `observation` (forward viewports), `corridor_b`, `officers_quarters`, `briefing`, `lounge`, `escape_pods` |
| C — Crew | 100 | superstructure terrace 1 | `lobby_c`, `corridor_c`, `crew_quarters`, `mess_hall`, `medbay`, `armory`, `detention` |
| D — Engineering | 48 | terrace 0 / main hull, aft | `lobby_d`, `corridor_d`, `engineering`, `hyperdrive`, `life_support`, `maintenance`, `reactor` (30 m tall) |
| E — Hangar | -40 | ventral bay, amidships | `hangar` (130×220×40, floor opening to space), `fighter_bay`, `shuttle_bay`, `cargo`, `lobby_e`, `flight_control` (raised) |

Turbolifts: two cars per lobby, same `(x, z)` on every deck. A ride closes the doors, animates the
shaft lights, moves the player to the destination car and reopens (canon turbolifts also travel
horizontally, which is how the hangar lobby joins the network). 30 named spaces plus lift cars.

## 5. Design language

Imperial: near-black and gunmetal structure, light-grey hull plating outside, white/grey wall panels
with black trim inside, red / blue / amber instrument lighting, low-key illumination, hard edges,
hazard chevrons, stencilled Aurebesh-style glyph labels (original glyph set), functional wear. Each room
gets its own accent (bridge: cold blue + red; engineering: amber + white; medbay: white + teal;
detention: red; hangar: sodium-amber + blue containment field; reactor: white-hot core).

## 6. Rendering and performance strategy

* **Cells + portals.** One `Cell` per room. Visible set = current cell + neighbours through doors
  (+ second ring through *open* doors). Everything else is `visible = false`. Rooms are enclosed, so
  this is the occlusion culling.
* **Light pool.** A fixed set of point/spot lights (no shader recompiles). Each cell declares its
  lights as data; on cell change the pool is re-assigned by priority. Emissives carry the rest.
* **Light domains.** Interior materials ignore the sun (shader patch), exterior materials ignore
  point/spot lights and use a space environment map. Interior fog density is per zone.
* **Exterior LOD.** Hull chunks with 3 LOD levels; greebles instanced with density that drops with
  distance; far LOD is texture-only (no overlapping geometry → no z-fighting at 1 km).
* **Fighters.** One `InstancedMesh` per TIE part; flight paths as splines with a deterministic clock so
  state is a `(pathId, phase, u)` tuple (network-friendly).
* **Budgets** (interior view, GPU class "laptop"): ≤ 200 draw calls, ≤ 600k triangles, ≤ 10 active
  lights, ≤ 2 shadow casters. Exterior view: ≤ 300 draw calls, ≤ 1.5 M triangles.
* **Instrumentation.** `perf.js`: frame time EMA + p95, draw calls, triangles, programs, geometries,
  textures + estimated texture memory, visible cells/objects, long tasks, JS heap, load time.
  `F3` overlay and `debugAPI.getStats()`. `tools/perf.mjs` records all views to JSON.

## 7. Workstreams and file ownership

| Workstream | Files | Owner |
|---|---|---|
| Architecture, spec, cells, doors, lifts, player, cameras, main loop | `spec.js cells.js doors.js lifts.js player.js cameras.js main.js hud.js perf.js` | orchestrator |
| Exterior hull & silhouette | `exterior/hull.js superstructure.js engines.js` | agent EXT-A |
| Exterior detail & textures | `exterior/greebles.js weapons.js textures_hull.js` | agent EXT-B |
| Bridge | `rooms/bridge.js textures_bridge.js` | agent BRIDGE |
| Hangar complex | `rooms/hangar.js fighter_bay.js shuttle_bay.js cargo.js flight_control.js` | agent HANGAR |
| Fighters | `fighters/tie.js traffic.js shuttle.js` | agent FIGHTERS |
| Tower / command rooms | `rooms/{intel,tactical,comms,navigation,observation,officers_quarters,briefing,lounge,escape_pods}.js` | agents ROOMS-1/2 |
| Crew / engineering rooms | `rooms/{crew_quarters,mess_hall,medbay,armory,detention,engineering,hyperdrive,life_support,maintenance,reactor}.js` | agents ROOMS-3/4 |
| Audio, atmosphere | `audio.js` | agent FX |
| Validation | `tools/shots.mjs tools/perf.mjs tools/walk.mjs` | agent QA |

Agents work in isolated git worktrees, edit only their files, and report (changed / tested / left).
Every room ships with a `spawn` view; the harness screenshots every room and every exterior preset,
critics review, owners fix, repeat until pass.

## 8. Loop

1. Baseline (done) → 2. this plan → 3. exterior silhouette and scale → 4. interior structure and
connections → 5. bridge → 6. hangar and fighter traffic → 7. materials / lighting / atmosphere / sound
hooks / animation → 8. visual critics (near, mid, far, every room) → 9. technical validation (loading,
collision, navigation, doors, lifts, transitions, asset refs, extensibility) → 10. perf measurement →
11. merge only improvements → 12. re-run the full review after every merge.

## 9. Reserved for future phases (interfaces only)

`systems/flight.js` (attitude / velocity — today it drives the slow bank of the far field),
`systems/landing.js` (landing supports, surface contact, landing zones registry),
`systems/docking.js` (docking ports: hangar mouth, tower aft port), `fighters/ai.js`
(`PilotController` interface the traffic scheduler already calls), `net.js` (`getState/applyState`
for doors, lifts, fighters). No NPCs, missions, planets-as-destinations, combat or landing gameplay in
this milestone.
