# Star Destroyer conversion plan

Milestone: turn the Kestrel interior demo into one coherent, enormous, Star Wars-inspired Imperial
Star Destroyer with an exterior orbit view and a fully explorable interior. No NPCs, missions,
combat, planetary travel or landing gameplay in this milestone; those systems get reserved stubs only.

All geometry and textures stay procedural and original. No third-party models or Lucasfilm assets are
used; the design borrows the *visual language* (wedge hull, terraced superstructure, T-shaped bridge
tower with two shield domes, ventral hangar, ion engines, dark-grey / black / grey-white interiors with
red, blue and amber instrument lighting) without copying any proprietary file.

## 1. Baseline (existing project)

Recorded in `docs/BASELINE.md` from `shots/iter_sd0_baseline/` (existing harness, current machine):
five rooms (corridor, cockpit, quarters, galley, refresher) in a 16 m freighter, 124 draw calls,
226 k triangles, 22 lights, 69 colliders, ~900 KB bundle, WebGL2 + n8ao + bloom post stack, adaptive
resolution scaler, deterministic screenshot harness (`tools/shots.mjs`). Everything in that list is a
working system that is kept and extended.

## 2. Coordinates, scale and the exterior spec

Units are metres. Ship forward is **-Z**, up is **+Y**, ship origin is the hull centroid.
`src/config/shipSpec.js` is the single source of truth for every dimension below.

| Element | Spec |
| --- | --- |
| Length | 1600 m (bow z = -800, stern z = +800) |
| Beam | 900 m at the stern, wedge outline to a point at the bow |
| Main hull | dorsal shallow pyramid to a centreline ridge (60 m at the stern), deeper ventral keel (-95 m) |
| Side trench | equatorial greebled channel, 18 m tall, both flanks, full length |
| Superstructure | terraced block z 150..560, x ±160, three terraces to y = 130 |
| Command tower | neck x ±45, z 480..560, y 130..250; bridge slab x ±135, z 470..590, y 250..290 |
| Shield domes | r = 22 m at (±90, 305, 530); comms spire on the centreline |
| Engines | 3 main ion engines r = 60 m, 4 auxiliaries r = 24 m on the stern wall |
| Ventral hangar | main bay opening 110 × 64 m centred at z = 160 on the belly; secondary bay ahead of it |
| Turbolasers | 8 heavy dual turrets on the superstructure flanks, 16 light emplacements along the trench |
| Sensors / antennas | dome clusters on the terraces, mast arrays on the slab, dishes on the tower flanks |
| Scale references | window rows (2.5 m pitch), hatches (4 m), docking pads (60 m), running lights, the interior itself |

Exterior detail is layered so the hull looks good from three ranges:

- **Far (> 3 km)**: base hull facets with the plating texture (macro paint variation, soot gradients
  behind the engines, heat discolouration on the stern, dust on horizontal surfaces) and emissive
  window strips.
- **Medium (600 m – 3 km)**: instanced raised armour plates (seams are the gaps), trench greebles,
  turrets, domes, engines, terrace blocks.
- **Close (< 600 m)**: small instanced greebles (hatches, vents, antennas, conduits, pads), turret
  detail, window bezels.

Implemented as `THREE.LOD` groups per hull chunk plus `InstancedMesh` for every repeated element;
all exterior textures come from one procedural atlas so the exterior renders in a few dozen draw calls.

## 3. Scene hierarchy

```
scene
├─ space                 starfield, planets, nebulae (existing)
├─ exterior              LOD chunks, instanced plates/greebles, turrets, engines, exterior lights
│   ├─ hull/<chunk>      (LOD 0..2)
│   ├─ superstructure
│   ├─ tower
│   ├─ engines
│   └─ hangarMouth       blast doors + tractor field, shared with the interior hangar
├─ interior              one Group per zone, streamed by the registry
│   ├─ zone:tower        deck A (bridge level) + deck B (crew level) + lift 1
│   ├─ zone:engineering  deck C + lift 2 landing
│   └─ zone:hangar       deck D + lift 2 landing
├─ traffic               TIE-style fighters (instanced far LOD + detailed near LOD)
└─ camera                single PerspectiveCamera driven by the active mode controller
```

## 4. Deck plan (rooms, connections, zones)

Rooms are compressed toward the tower and the belly so the walk is explorable, but every room sits at
a position that matches the exterior: the bridge windows are on the slab's forward face, the hangar
well is the belly opening, the lift between them travels the real ~330 m.

**Deck A – command level (y = 265, tower slab)**
1. Main bridge (forward, crew pits either side of the command walkway, forward windows over the hull)
2. Auxiliary flight control (the existing cockpit, re-themed; port-forward corner windows)
3. Tactical operations / holo-table room (aft-port of the bridge)
4. Communications & sensor control (aft-starboard)
5. Restricted command / intelligence room (locked-feel door, red lighting, behind comms)
6. Officers' quarters (port side)
7. Observation gallery (starboard aft, tall windows toward the stern and the domes)
21. Turbolift 1 (A ↔ B), lift lobby aft of the bridge

**Deck B – crew level (y = 252, tower neck / upper superstructure)**
8. Crew briefing room
9. Armoury & equipment storage
10. Security & detention block (cells, force-field style doors, control desk)
11. Medical bay (beds, bacta-style tank, diagnostic screens)
12. Crew quarters (existing quarters re-themed + extra bunk bay)
13. Mess hall & food preparation (existing galley extended into a long hall)
14. Recreation lounge
15. Refresher (existing bathroom re-themed)
16. Life support: air, water and waste processing (loud, cold, pipes)
17. Emergency escape pod bay (pod hatches in a ring, evacuation markings)
21. Turbolift 1 landing and Turbolift 2 head (B ↔ C ↔ D)

**Deck C – engineering (y = 18, hull core aft, z ≈ 640)**
18. Engineering control room
19. Main reactor chamber (vertical core with catwalk ring, the tallest interior)
20. Hyperdrive / propulsion room (stacked motivators, heat shimmer, amber)
21. Maintenance & repair bay (droid-scale workshop, parts racks, gantry crane)

**Deck D – hangar (y = -60, belly, z ≈ 160)**
22. Main hangar (110 × 64 × 38 m, launch/recovery well open to space, fighter racks overhead,
    control tower, catwalks, gantries, blast doors, cranes, containers, tractor field)
23. Fighter maintenance & refuelling gallery (starboard wing of the hangar)
24. Shuttle / secondary docking bay (forward, docking cradle reserved for a future shuttle)
25. Cargo storage & logistics bay (aft, container stacks, cargo lifts to the well deck)

Connections: corridors with sliding doors between every adjacent pair on a deck; both lifts are real
moving platforms with doors at each landing; short stairs between the bridge walkway and the pits,
between the hangar deck and its catwalks, and between the reactor floor and its ring.

## 5. Player, cameras and modes

- `interior` mode: existing first-person controller, extended with walkable floors (steps, stairs,
  lift platforms), door and lift interactions, room streaming by zone.
- `exterior` mode: orbit camera (drag to orbit, wheel to zoom, WASD/right-drag to fly), clamped to
  stay outside the hull, near plane 1 m, far 30 km.
- Transitions: `Board` from the exterior flies the camera along a spline to the bridge windows and
  crossfades into the interior at the bridge; `Exit ship` from any room dollies out through the
  nearest window/hangar mouth into the orbit view. No cuts, the interior is hidden only once the camera
  is outside the hull.
- Reserved systems (`src/systems/reserved.js`): flight control, atmospheric entry, landing supports,
  docking, surface contact, hangar deployment, orbit→atmosphere→ground camera, landing zones. Each is
  an interface with a no-op implementation and a registry entry so future phases plug in.

## 6. Hangar and fighter traffic

`src/hangar/traffic.js` owns the fighters: a `FighterTraffic` scheduler, `Fighter` state machine
(`parked → release → launch → patrol → approach → capture → parked`), spline paths generated from the
hangar spec, and a `Pilot` interface (`ScriptedPilot` by default) so NPC pilots or networked
entities can drive a fighter later without touching the hangar. State is serialisable
(`{ id, state, phase, t }`) and deterministic in time for network-friendly sync. Machinery (blast doors,
cranes, cargo lifts, warning beacons, tractor field) lives in `src/hangar/machinery.js` and exposes the
same serialisable pattern for doors.

## 7. Performance plan and budgets

Measured, never asserted. `src/perf.js` tracks fps, frame time (EMA + p95), draw calls, triangles,
visible objects, geometries, textures, estimated texture memory, JS heap (where exposed), load time,
shader compile time, long tasks. `debugAPI.getStats()` and the F3 overlay expose it; the harness
records it per view.

Budgets (1080p, mid-range GPU): ≤ 300 draw calls and ≤ 1.5 M triangles in any view, ≤ 24 dynamic
lights active (only the current zone's lights are enabled), ≤ 200 MB texture memory, ready in < 6 s
on a laptop, no long task > 250 ms after load. Techniques: LOD per exterior chunk, instancing for every
repeated element, zone streaming (build + show only the active zone and its lift shaft), portal-style
culling of the exterior from windowless rooms, one texture atlas for exterior detail, baked
vertex-colour macro lighting on the hull, PCF shadows only from the sun, pooled effects for fighters
and beacons, AABB colliders only.

The software renderer on the build machine cannot measure GPU frame time; it records CPU-side numbers
(draw calls, triangles, JS frame cost, memory) which are the ones that predict GPU cost, and the
adaptive scaler still protects frame rate on real hardware.

## 8. Workstreams, ownership and workflow

Shared foundation first (this branch, single owner): `shipSpec.js`, `interior/lib.js` (extracted from
`ship.js`), `interior/registry.js`, `interior/doors.js`, `interior/lifts.js`, Imperial materials,
`perf.js`, camera modes, exterior skeleton, traffic skeleton, harness views.

Parallel agents then work in isolated git worktrees, each owning disjoint files:

| Workstream | Owns | Deliverable |
| --- | --- | --- |
| Exterior hull & silhouette | `src/exterior/hull*.js`, `hullTextures.js` | wedge, terraces, tower, engines, trench, LODs |
| Exterior detail | `src/exterior/greebles.js`, `turrets.js`, `exteriorLights.js` | plates, greebles, turrets, sensors, windows |
| Bridge | `src/interior/rooms/bridge.js` | the cinematic bridge |
| Command deck rooms | `rooms/{flightControl,tactical,comms,intel,officers,observation}.js` | deck A |
| Crew deck rooms | `rooms/{briefing,armory,detention,medbay,crewQuarters,mess,lounge,refresher,lifeSupport,escapePods}.js` | deck B |
| Engineering rooms | `rooms/{engineering,reactor,hyperdrive,maintenance}.js` | deck C |
| Hangar | `rooms/hangar.js`, `rooms/{fighterMaint,shuttleDock,cargo}.js`, `src/hangar/machinery.js` | deck D |
| Fighter traffic | `src/hangar/traffic.js`, `tie.js` | fighters + pilot hooks |
| Materials / lighting / atmosphere | `src/materials.js`, `textures.js`, `lighting.js`, `post.js` | Imperial material set, per-zone lighting |
| Audio hooks | `src/audio/ambience.js` | procedural ambience + event hooks |
| Camera & transitions | `src/camera/*.js` | orbit camera, boarding, exit |
| Performance | `src/perf.js`, LOD/instancing helpers | measurements + optimisations |
| Validation | `tools/*.mjs` | screenshot views, collision/navigation/transition checks |

Every agent reports what changed, what was tested (with the harness), and what is unfinished. Merges go
through the integration branch only after the full harness run passes; visual critics and technical
verifiers review after each merge.

## 9. Loop and acceptance

1. Baseline → 2. this plan → 3. exterior silhouette and scale → 4. interior structure and connections
→ 5. bridge → 6. hangar and traffic → 7. materials, lighting, atmosphere, sound hooks, animation →
8. visual critique from far/medium/close and every room → 9. technical verification (loading, collision,
navigation, transitions, asset references, extensibility) → 10. perf after every milestone →
11. merge only improvements that keep the game working → 12. re-run the full review.

Acceptance is the user's list: game launches with core systems intact; the ship reads as a massive Star
Destroyer from every distance; ≥ 10 substantial connected distinct rooms (target 25); bridge and hangar
at the highest detail; fighter traffic works without NPCs; exterior and interior views stable;
architecture ready for NPCs, flight and landing; no unfinished, empty, duplicated or obviously procedural
areas; performance within the measured budgets; one coherent ship.
