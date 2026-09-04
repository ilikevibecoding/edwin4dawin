# ISD Vigilant — ship development plan

Milestone: transform the Kestrel light-freighter demo into a fully explorable Imperial-class Star
Destroyer (exterior + interior), no NPCs / missions / landing gameplay. Everything is procedural
Three.js geometry generated at load; no external assets (so nothing proprietary is copied — the
design is original work in the visual language of the films).

## 1. Baseline (done)

`shots/iter_baseline/` — the Kestrel interior before the transformation: 5 rooms, 110–171 draw
calls, 226k–366k triangles, 22 lights, 49 shader programs (`results.json`). Frame times in this
environment come from software GL (SwiftShader) and are not GPU-representative; draw calls,
triangles, light count, programs, build time and heap are the comparable numbers.

## 2. Scale & coordinate frame

Metres. Forward = -Z (bow z = -800, stern z = +800). y = 0 is the knife-edge plane. 1,600 m long,
960 m wide at the stern, ~390 m tall including the tower. All numbers in `src/config/layout.js`.

Hull profile (linear taper bow → stern): `halfWidth(z)`, dorsal plateau `dorsalY(z)` (3 → 61 m),
keel `keelY(z)` (-3 → -81 m), knife-edge trenches 4 m deep. Terraces T1 (z 120→800, +18 m) and T2
(z 300→800, +18 m), tower base (z 500→700, +20 m), neck (y → 178), bridge module (x ±96, y 178→208,
z 548→652), shield domes r 17 at (±60, 222, 612), sensor mast to y 262. Three main + four secondary
thrusters on the stern face, reactor bulb r 55 under z 540, ventral hangar well (x ±24, z 130→250)
and shuttle well (x ±20, z 310→360) cut through the keel.

## 3. Scene hierarchy

```
scene
├─ space (stars, planets, nebulae; SPACE_SCALE 25 so nothing shows parallax)
├─ sun (DirectionalLight, shadow frustum fitted per camera mode) + hemisphere fill
├─ exterior
│   ├─ hull meshes (lofted wedge, keel strips w/ wells, stern, terraces, tower, engines, bulb)
│   └─ greebles (instanced detail, turbolasers, sensors, hatches, windows, running lights; LOD tiers)
├─ interior (ZoneManager root)
│   ├─ room_<id> × 32 (own merged meshes per material, colliders, walkables, light descriptors,
│   │                    interactables, animators, camera views)
│   ├─ doorFrames_<cluster> × 4 (all static door frames of a cluster merged)
│   └─ door_<id> × 45 (moving panels + status light only)
├─ traffic (TIE fighters on racks / paths, LOD)
└─ light pool (12 point + 2 shadow spots re-targeted to the visible rooms)
```

## 4. Interior clusters (28 rooms + 7 corridors, 4 lobbies, 8 turbolifts)

| cluster | deck | floor y | rooms |
|---|---|---|---|
| tower | 1 | 190 | **bridge** (hero), corridorT, holo, comms, intel (ISB, locked), briefing, liftLobbyT, observation |
| crew | 7 | 50 | spineC, crossC, liftLobbyC, crewQuarters, officersQuarters, mess+galley, lounge (viewports), medbay, armory (locked), detention (locked) |
| eng | 12 | 8 | liftLobbyE, **reactor** (hero, 26 m pit), engControl (window into reactor), hyperdrive, corrEW/corrEE/spineE, lifeSupport, maintenance, cargo |
| hangar | 19 | -20 | liftLobbyH, **hangar** (hero, launch well + blast doors + racks) with flightControl booth, fighterMaint, shuttleBay (Lambda shuttle, own well), escapePods |

Every cluster is streamed as a unit: only the current room plus rooms reachable through an open door
or open portal are rendered; the exterior camera streams whole clusters by distance. Turbolifts
connect the lobbies (ride = seal doors → strobe/shake/deck counter → teleport → far doors open).

## 5. Build order (the loop)

1. ✅ Baseline screenshots + stats.
2. ✅ Plan + layout + scene hierarchy (this document, `layout.js`).
3. ✅ Exterior silhouette and scale (hull loft) → ⏳ detail pass (greebles workstream).
4. ✅ Interior structure: shells, corridors, doors, lifts, streaming, light pool.
5. ⏳ Bridge (workstream).
6. ⏳ Hangar + fighter traffic (workstream).
7. ⏳ Rooms: crew / engineering / tower secondary (three workstreams); materials, lighting,
   atmosphere, sound hooks, mechanical animation come with each room.
8. Visual critics (independent agents) review exterior at 50 m / 500 m / 3 km and every room view.
9. Technical review: loading, collision, navigation (walk every door, ride every lift), camera
   transitions, budgets, extensibility hooks.
10. Performance measured after every merge (`tools/review.mjs` → `shots/review_<n>/results.json`).
11. Merge only improvements that keep the game launching and the core loop intact.
12. Re-run 8–10 after every merge; publish the live build (hourly job + after milestones).

## 6. Performance strategy

Merged geometry per material per room (≈ 20–30 draw calls per visible room), door frames merged per
cluster, room/portal streaming, per-room frustum culling, InstancedMesh + LOD tiers for exterior
detail and fighters, one 2048² hull texture with a distance-faded detail normal, fixed light pool (no
shader recompiles), two shadowed spots + one fitted directional shadow, adaptive render scale,
procedural audio (no downloads). Budgets in `docs/WORKSTREAMS.md`; measurements in `results.json`.

## 7. Reserved for later phases (interfaces exist, no gameplay)

`src/systems/flight.js`: FlightController, AtmosphereEntry, LandingGear, DockingSystem,
SurfaceContact, HangarDeployment, CameraStage (orbit → atmosphere → ground), LandingZoneRegistry.
`src/hangar/traffic.js`: PilotController hook per fighter, launch/dock events, serialisable state.
`src/core/sync.js`: snapshot registry for doors, lifts, traffic, player. Dorsal landing/docking pads
are reserved in the exterior detail.
