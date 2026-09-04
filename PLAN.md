# Ship development plan — Imperial Star Destroyer conversion

Working title of the ship: **ISD *Vigilance***. The existing Kestrel freighter interior (5 rooms, ~25 m)
becomes one deck-fragment of a 1,600 m Imperial-class Star Destroyer. Everything remains procedural
(no downloaded models or textures): the ship's silhouette, plating, greebles, rooms and TIE fighters are
all generated in code from primitives and canvas textures, which sidesteps licensing entirely while
keeping the Star Wars visual language (wedge hull, tiered superstructure, twin deflector domes, ISD
bridge with crew pits, black-floored white corridors, ventral hangar with TIE racks).

## 0. Baseline (before any change)

- Source: branch `cursor/spaceship-interior-demo-ad4e`, commit `ad511782`.
- Views: `shots/iter_baseline/{cockpit,corridor,windshield}.png`.
- Stats (SwiftShader software GL, 1280x720): 110-124 draw calls, 226-251k triangles, 22 lights,
  66 geometries, 75 textures, 49 programs, ~2.5 s/frame (software GL — CPU-only VM, frame time is not
  representative of a GPU; relative numbers and draw-call / triangle budgets are what we track).
- Ship footprint: corridor 16 m x 2.8 m, cockpit 4.8 m wide, three side rooms. One coordinate system,
  forward = -Z, up = +Y. Player is a 0.32 m capsule, eye 1.7 m, fixed floor y = 0.

## 1. Coordinate system and scale

- World units are metres. Ship centreline x = 0, bow at z = -800, stern at z = +800 (forward = -Z as
  in the existing controller). Trench (hull equator) at y = 0.
- Hull: 1,600 m long, 920 m wide at the stern, dorsal plateau ~+45 m aft / +12 m at the bow, ventral
  plateau ~-40 m aft. Superstructure ("city") block on the dorsal plateau z 150..700, up to y ≈ 110.
  Tower neck to y ≈ 165, bridge module y 165..200 (x ±110, z 590..650), deflector domes r 22 at
  x ±70, comm mast to y ≈ 255. Reactor bulb r 70 under the ventral plateau at z ≈ +250. Three main
  ion engines r 42 + four secondaries at the stern. Ventral hangar opening x ±25, z -45..+45.
- Interior decks are placed at their true positions inside the hull so windows show the real
  exterior (bridge → hull stretching forward and down; hangar opening → space below).

| Deck | Floor y | Lift lobby (x, z) | Rooms |
|------|---------|-------------------|-------|
| 1 Bridge | 180 | (0, 640) | Main bridge (windows z 592, crew pits 1.8 m deep), restricted command / intelligence room, communications & sensor control |
| 2 Command | 150 | (0, 610) | Tactical ops / holo table, secondary navigation & flight control, briefing room, officers' quarters, observation gallery |
| 3 Crew | 60 | (0, 450) | Crew quarters, mess hall + galley, medical bay, recreation lounge, armoury, security & detention block, escape-pod bay, life support (air / water / waste) |
| 4 Engineering | 10 | (0, 560) | Engineering control, main reactor chamber (vertical shaft with gantry), hyperdrive room, maintenance & repair bay, cargo & logistics bay |
| 5 Hangar | -30 | (0, 0) | Main hangar (ventral opening, TIE racks, blast doors, flight-control tower), fighter maintenance & refuelling, shuttle / secondary docking bay, cargo lifts |

Decks are connected by the turbolift: a real cab with a call panel at each lobby; the ride closes the
doors, animates the cab (light streaks, rumble hook) and teleports the player to the destination
lobby while the doors are closed. Within a deck everything is walkable (corridors, stairs, ramps).

## 2. Scene hierarchy

```
scene
├─ space                    starfield layers, planets (radius/distance ×8 vs Kestrel), nebulae, sun, dust
├─ exterior                 ExteriorShip: hull chunks (LOD 0/1/2 per z-chunk), superstructure, tower,
│  ├─ hull/chunk_k          engines, turrets (InstancedMesh), greebles (InstancedMesh), trench,
│  ├─ superstructure        hangar opening (real hole; interior hangar shows through)
│  ├─ engines               materials fog:false, exterior-only sun light (shadowed) + blue fill
│  └─ traffic               TIE fighters (merged geometry, LOD), flight paths, scheduler, AI hooks
├─ interior                 InteriorShip: decks → sectors (rooms / corridors / lobbies)
│  ├─ deck_1_bridge/sector_*   each Sector = group + colliders + lights + doors + interactables,
│  ├─ deck_2_command/...       built lazily per deck (streaming), toggled by the visibility graph
│  └─ ...                      (current sector + door-connected neighbours), lights follow visibility
├─ camera                   one PerspectiveCamera; CameraDirector switches interior FP / exterior orbit / fly
└─ lights                   hemisphere fill (interior), sun (exterior), per-sector practicals
```

Modules (new files are additive; existing files are extended, not replaced):

- `src/main.js` — bootstrap, mode switching, loop, debug API (views for both modes), stats.
- `src/camera/director.js` — interior (Player), exterior orbit (drag / wheel / pan), fly (WASD), fades,
  transitions with matched positions (interior → exterior spawns the camera outside the room's hull
  position).
- `src/player.js` — extended: sprint, gravity + floor colliders, ramps / stairs, dynamic collider set.
- `src/interior/layout.js` — the deck / room / door / corridor registry above (data only).
- `src/interior/sector.js` — Sector class (lazy build, visibility, collider + light ownership).
- `src/interior/interior.js` — deck assembly, visibility graph, current-sector tracking, streaming.
- `src/interior/doors.js` — sliding doors (auto-open by proximity), blast doors, portal registry.
- `src/interior/turbolift.js` — lift cabs, panels, ride sequence, deck streaming trigger.
- `src/interior/corridor.js`, `src/interior/kitImperial.js` — Imperial corridor and room-detail kit
  (white panel walls, black gloss floor, recessed light strips, chamfered ceilings, consoles, cables).
- `src/interior/rooms/*.js` — one builder per room: `build<Room>(kit, ctx)`.
- `src/exterior/hull.js`, `superstructure.js`, `engines.js`, `weapons.js`, `details.js`, `exterior.js`.
- `src/traffic/fighters.js` — TIE model + path scheduler + `PilotHook` interface + snapshot for network.
- `src/fx/audio.js` — AudioBus with named events and positional ambience placeholders.
- `src/fx/anim.js` — mechanical animation registry (rotating dishes, blinking beacons, doors, cranes).
- `src/perf/metrics.js` — fps, frame-time p50/p95, draw calls, triangles, visible objects, geometries,
  textures, programs (shader compiles), texture memory estimate, JS heap, long tasks, load time.
- `tools/shots.mjs` — exterior + interior rubric views, walk-through connectivity test, perf capture.
- `tools/publish.mjs` — builds `dist/` and pushes it to the play branch for the live demo link.

## 3. Build order and gates

1. Baseline (done) → this plan.
2. Framework: sectors, layout, doors, lift, camera director, metrics, palette. Gate: game launches,
   old controls work, new HUD, debug views.
3. Exterior silhouette + scale (hull, superstructure, tower, engines, plating instancing, LOD chunks).
   Gate: recognisable from far / medium / close screenshots; draw calls bounded.
4. Interior structure: all decks with corridors, lobbies, lift, room shells and doors. Gate: automated
   walk-through visits every room through doors and the lift; no collider gaps.
5. Bridge polish. 6. Hangar + TIE traffic. 7. Materials / lighting / atmosphere / audio hooks /
   mechanical animation. 8. Visual critics (multi-distance exterior, every room). 9. Technical
   validation (loading, collision, navigation, transitions, references, extensibility).
   10. Perf measurement after each milestone. 11. Merge only improvements. 12. Re-review after merges.

Parallel workstreams run in isolated git worktrees, each owning disjoint files (see §2). Shared files
(`main.js`, `materials.js`, `textures.js`, `kit.js`, `layout.js`) are edited only by the integrator.

## 4. Performance plan (measured, not asserted)

- Exterior: plating and greebles are `InstancedMesh` per hull chunk with 3 LOD levels switched by
  camera distance; chunks are frustum-culled by bounding sphere; turrets / details instanced; one
  shadowed directional light; hull materials share two texture sets.
- Interior: sectors hidden unless current or adjacent (occlusion by room graph); lights of hidden
  sectors are off; decks built lazily (during the lift ride); per-sector merged geometry (a handful
  of draw calls per room); exterior hidden inside rooms without windows; ≤ 3 shadowed lights active.
- Effects pooled (door glows, engine sprites, tractor beams); TIEs share one geometry / material.
- Budget targets at 1080p on a mid-range GPU: ≤ 350 draw calls and ≤ 1.2 M triangles per view,
  ≤ 16 active lights, texture memory ≤ 160 MB. Verified per view via `debugAPI.getStats()` and
  recorded in PROGRESS.md; frame time on this CPU-only VM is reported as software-GL relative only.

## 5. Future-phase reservations (not implemented, only interfaces)

`src/systems/reserved.js` documents and stubs: `FlightControl`, `AtmosphericEntry`, `LandingGear`,
`Docking`, `SurfaceContact`, `HangarDeployment`, `CameraTransition(orbit→atmosphere→ground)`,
`LandingZones`. Traffic exposes `PilotHook` and snapshot / apply for NPC pilots and multiplayer.
