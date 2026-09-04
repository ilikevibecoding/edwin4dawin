# Runtime APIs and extension points

Everything a later phase (NPCs, multiplayer, flight/landing) or the test harness talks to.

## `window.debugAPI` (used by `tools/shot.mjs` and `tools/review.mjs`)

| member | what it does |
|---|---|
| `ready` | true once the first frame has rendered |
| `views` / `exteriorViews` | registered interior view names / exterior preset names |
| `setView(name)` | interior mode, teleport to the view's eye position (`y` honoured), face its yaw/pitch, freeze |
| `setPose(x, z, yawDeg, pitchDeg, feetY = null)` | arbitrary interior pose; with `feetY` null the floor of the room under (x,z) nearest the current deck is used |
| `setExteriorView(preset)` / `setExteriorPose(cam[3], look[3])` | exterior camera placement (auto-orbit off) |
| `walk(keyCodes[], seconds)` | hold keys for `seconds` of **simulated** time (dt-summed), resolves with the feet position |
| `unfreeze()` | hand control back to the player after a `setView` |
| `board(cluster?)` / `leave()` | the camera transitions (promises) |
| `ride(lobbyId, cluster)` | ride the lobby's first turbolift to a cluster |
| `openDoor(id)` / `unlockAll()` / `doors()` | door control and `{ id, s, p, l }` states |
| `currentRoom()` / `rooms()` / `roomInfo()` | current room id, all room ids, per-room build times |
| `getStats()` | see below |
| `snapshot()` | full sync snapshot (see `SyncRegistry`) |
| `capturePixels(x, y, w, h)` | RGBA bytes of a screen region from the next frame |
| `advanceSky(dt)` | advance the far field only |
| `setPixelRatio(r)` / `directRender` / `freezeGrain` | render controls for deterministic captures |
| `pressE()` / `pressKey(code, key)` / `interact(id)` / `hovered()` / `status()` / `fadeOpacity()` | interaction + HUD probes |
| `player`, `zone`, `lifts`, `modes`, `exteriorCam`, `traffic`, `flightSystems`, `space`, `post`, `scene`, `renderer`, `layout` | live objects |

`getStats()` returns `frameMs`, `fps`, `worstMs` (1% low), `calls`, `triangles`, `geometries`, `textures`,
`programs`, `heapMB`, `longTasks`, `longTaskMs`, `loadMs`, `visibleRooms`, `colliders`, `lightDescs`,
`lights`, `mode`, `room`, `qualityLevel`, `pixelRatio`, `buildMs {materials, exterior, interior}`,
`precompile {done, ms}`, `exteriorTris`, `greebles {instances, drawCalls, trianglesVisible}`,
`traffic {fighters, airborne}`, `syncBytes`. **`calls` and `triangles` come from `renderer.info` and
include the shadow-map passes (sun + 2 spots), the N8AO pre-pass and ~25 post-processing quads**, so a
"frame" is 2–3× the visible scene geometry. In the development container frame times are software GL.

## Rooms (`src/interior/rooms/<cluster>/*.js`)

`registerRoom(id, builder)` in the cluster's `index.js`; `builder(kit, ctx)` with the `ctx` described in
`docs/WORKSTREAMS.md` plus: `ctx.expandBounds(min, max)` (grow the room's streaming / current-room bounds,
used by turbolift cabs), `ctx.portal(otherId)`, `ctx.view(name, x, eyeY, z, yaw, pitch)`. Layout flags per
room: `hero` (streams from 3.5× the cluster radius outside), `sub` (built by its host room), `booth`,
`floorY` (own floor), `floorDrop` (pit depth for bounds), `exterior: "all" | "traffic"` (what the room
can see outside — drives exterior/greeble/fighter/sun/sky culling). Light descriptors are plain objects;
`priority` and `dim` may be mutated at runtime by animators (the pool re-sorts every frame).

## Fighter traffic (`src/hangar/traffic.js`)

`createTraffic({ mats, audio, zone })` → `{ group, fighters, update(dt, t, cameraPos), setPilot(id,
controller), on(event, cb) → unsubscribe, launch(id), recall(id), getState(), applyState(s), stats }`.
Events: `launch`, `dock`, `passing` (a fighter is in the well), `flyby` (fast pass near the camera),
`wellOpen` / `wellClose` (also on `hangarBus`). A pilot controller is `{ update(fighter, dt, api) }`; the
default `ScriptedPilot` follows the spline paths. A custom pilot writes `fighter.pos`, `fighter.fwd`,
`fighter.roll` (and may set `fighter.s = "manual"`); the traffic system still handles LOD, exhaust flares,
instance upload and events. `hangarBus` (`src/hangar/hangarBus.js`) is the event bus the hangar room
uses to animate blast doors, beacons and tractor beams from traffic events.

## Doors and turbolifts

`Door` (`src/interior/doors.js`): `state` closed|opening|open|closing, `progress` 0..1, `locked`,
`forceClosed`, `open()/close()` via `setState`, `unlock()`, `onChange(cb)`, `getState()/applyState()`
(drives the status light). `LiftSystem` (`src/interior/lifts.js`): `rideFrom(lobbyId, cluster)`,
`ride(lift, cluster)`, `getState()`; `onArrive(cluster)` callback (the integration lead uses it to
re-stream the destination and snap the light pool).

## Sync (`src/core/sync.js`)

`SyncRegistry.register(name, { getState(), applyState(s) })`, `snapshot()` → `{ seq, t, s: {...} }`,
`apply(snapshot)`, `size()`. Registered: `doors`, `lifts` (state only), `traffic` (fully replayable),
`player`. Intended cadence ~10 Hz; a snapshot is ~2 KB. Nothing here talks to a network yet.

## Reserved flight / landing systems (`src/systems/flight.js`)

`createFlightSystems(traffic)` → `flight` (FlightController state machine: station|cruise|approach|
atmosphere|landing|landed), `atmosphere` (AtmosphereEntry), `gear` (LandingGear), `docking`
(DockingSystem), `contact` (SurfaceContact), `hangarDeploy` (HangarDeployment), `cameraStage`
(orbit|atmosphere|ground limits), `landingZones` (registry). They are state + events only and are **not
ticked by the main loop** in this milestone; `debugAPI.flightSystems` exposes them.

## Materials

Keys and palette: `docs/WORKSTREAMS.md`. `NO_SHADOW_KEYS` lists emissive/glass/decal keys whose merged
meshes do not cast shadows (`kit.build(group, { noShadow })`). Every `onBeforeCompile` material sets a
`customProgramCacheKey`; per-room clones only change uniforms, so they share programs. Pool lights never
change `castShadow` (it is part of the program key).
