# sys-traffic — fighter traffic for the Deck 4 hangar

Manifest `index.js` (`id: "sys-traffic"`, `kind: "system"`, `owner: "D"`, COORDINATION.md §9.6).
Everything is procedural, time-parametric and deterministic from `ctx.seed`: a client that knows the
seed and the module time `t` renders the same traffic without any message traffic.

| file | what |
| --- | --- |
| `index.js` | manifest: build, per-frame `update(dt, t)`, public `api` |
| `craft.js` | fighter / shuttle / clamp geometry builders (vertex colours + baked emissive, one material each) |
| `paths.js` | Catmull-Rom flight paths, monotone time→arc-length profiles, `PathRegistry` |
| `scheduler.js` | deterministic arrival/launch schedule, slot occupancy, mover and instance caps |
| `effects.js` | tractor beams, engine glow, beacons, rack clamps (one draw call each) |
| `materials.js` | module-local materials (`manifest.materials(shared)`) incl. the shuttle fold shader |
| `hooks.js` | documented no-op seams for a future gameplay / server layer |

## Draw calls (6, fixed)

| object | kind | notes |
| --- | --- | --- |
| `traffic_fighters` | `InstancedMesh` cap 48 | racked, maintenance, patrol and hangar movers; matrices rewritten every frame |
| `traffic_shuttles` | `InstancedMesh` cap 2 | per-instance `aFold` attribute (0 spread .. 1 folded) drives the wings and ramp in the vertex shader |
| `traffic_beams` | `Mesh` | 8 unit cones (4 halo + 4 core) stretched in the vertex shader from the emitters to the craft in the shaft; `uOn` = 0 when idle |
| `traffic_glow` | `InstancedMesh` cap 64 | additive engine-glow billboards for movers, brighter with speed and acceleration |
| `traffic_beacons` | `Points` | nav lights, landing-light flicker, shuttle fin beacon, emitter glow |
| `traffic_clamps` | `InstancedMesh` 2 per slot | rack clamp arms: folded up under the beam when open, 25° onto the hull when closed |

Materials: `trafficHull` (fighters + clamps), `trafficShuttle`, `trafficGlow`, `trafficBeam`,
`trafficBeacon`. No canvas textures, no `THREE.Light`s. One pooled point-light *descriptor* rides with the
craft in the shaft (tractor fill) and is removed from `ctx.lights` when the beam is idle.

Geometry: fighter 900 tris (span 7.70 m, wing faces at |x| 3.85, nose −Z at yaw 0), shuttle 1042 tris
(21 m, origin 2.85 m above the pad when parked on its skids), clamp 48 tris. The live triangle total is
kept under 40 000 by capping fighter instances: `maxFighterInstances = floor((40000 − fixed) / 900)`
(38 with the 28-slot rack); the scheduler refuses arrivals while the hangar holds
`maxFighterInstances − maintenance − patrol` fighters. `api.stats()` reports the live figure.

## World interfaces (systems build after rooms)

| source | call | fallback |
| --- | --- | --- |
| `d4-hangar` | `ctx.world.get("d4-hangar").result.api.rackSlots()` → `[{id,pos,yaw,tier,side,occupied}]` | both sides x ±70, tiers y −62/−50, z 0,10,…,60 (28 slots) |
| `d4-shuttle-bay` | `…api.shuttlePad()` → `{pos,yaw}` | `{pos:[-110,-72,15], yaw:90}` |
| `d4-fighter-bay` | `…api.cradles()` → `[{pos,yaw}]` | `[[110,-67.8,-10],[110,-67.8,30]]`, yaw 0 |

At build ~70 % of the slots (20 of 28, chosen from the seed) receive a racked fighter and the hangar's
slot objects get `occupied = true`; the flag is kept current as fighters launch and dock. Two fighters
sit on the maintenance cradles (`state: "maintenance"`), one shuttle parks on the pad with wings folded.

Hangar facts used here: floor y −72, aperture x ∈ [−36, 36], z ∈ [−30, 94], centre (0, −85, 32);
tractor emitters (±36, −73, −30) and (±36, −73, 94). The beams target any mover inside the shaft column
(x/z inside the hole, y −100 … −62, fading over 6 m at both ends).

## Paths (`paths.js`)

All paths are world-space `THREE.CatmullRomCurve3` (centripetal) with an arc-length table; position at
time `t` is `curve.getPointAt(profile((t − t0) / duration))`. `profile` is a monotone cubic through
(time fraction, arc fraction) knots, so control points are passed at exact times and flat spans are
exact dwells. Nothing integrates `dt`.

| id | duration | shape |
| --- | --- | --- |
| `arr:<slotId>:<v>` | 80 s | far point ≈ (±900, −1800, −3500) + variant offset → (0, −300, 32) → **aperture centre at 60 s** → hover (0, −40, 32) 63–66 s → mid → 14 m and 5 m out along the slot's ±x axis (74 s, 77 s) → slot (80 s, zero speed) |
| `lau:<slotId>:<v>` | 60 s | unclamp dwell 0–3 s → 5 m / 14 m out (6 s, 9 s) → mid → hover 15–17 s → **aperture centre at 21 s** → (0, −300, 32) 27 s → departure ≈ (±900, −2000, 3900) + variant |
| `patrol:alpha` | 96 s loop | ~2 km loop, passes (1550, 197, −901) — 50 m from the `sys-traffic-patrol` camera |
| `patrol:beta` | 118 s loop | ~1.6 km loop under the keel plane |
| `custom:<n>` | length / 120 m/s | `api.spawn({ path: Vector3[] })`; smooth start/stop |

Orientation: nose along the tangent with banked roll from lateral acceleration; arrivals blend to a
level hover yaw (aft-facing, turned 8° toward the docking wall) then to the slot yaw during the final
approach; launches hold the slot yaw while backing out, level off at the hover, then follow the tangent.
`FlightPath.keys` exposes the fractions used for effects (`shaft`, `hover`, `approach`, `settle`,
`unclamp`, `clear`).

## Schedule (`scheduler.js`)

Two candidate streams at fixed intervals (`60 / arrivalsPerMinute`, `60 / launchesPerMinute`, defaults
2 and 2). Arrival `t0`s start at −20 s so the first arrival is **exactly at the aperture centre at
t = 40 s** (the harness screenshot); launch `t0`s start at 8 s, which keeps launches out of the shaft
and the hover while an arrival uses them. A candidate becomes a flight only if a slot is free (arrival)
or a fighter is ready (launch), the hangar mover cap holds (6 = 16 − 10 patrol fighters) and the instance
cap holds. Slot choice is `unit(seed, kind, index)`. Generation is lazy and strictly time-ordered:
replaying from the start to any `t` yields the same flights on every client; jumping `t` backwards
rebuilds from the seed.

## States

```
{ id, type: "fighter"|"shuttle", state, pathId, t0, duration, from, to, position:[x,y,z], yaw }
state ∈ racked | launching | patrol | arriving | docking | maintenance
```

`arriving` → `docking` when the craft leaves the hover for its slot; `racked` when it settles.
`launching` fighters leave the world at the end of their path (`depart`), arrivals appear at their far
point. `from`/`to` are slot ids, `"space"`, `"shuttle-pad"` or `"cradle-<n>"`.

## API (`ctx.world.api("sys-traffic")`)

| call | effect |
| --- | --- |
| `spawn({ type, path, duration?, id? })` | `path` = known id (`"patrol:alpha"`, `"arr:<slot>:<v>"`, …) or `Vector3[]` / `[x,y,z][]`; returns the craft id (or `null` when the shuttle mesh is full) |
| `list()` / `get(id)` | plain state objects, sorted by id |
| `setController(id, fn(dt, fighter))` | `fn` writes `fighter.position` / `fighter.quaternion`; the spline is skipped while set; `null` restores the script |
| `on(event, cb)` / `off(event, cb)` | events `launch` (clamps release), `arrive` (reaches the aperture centre), `dock` (settled), `depart` (left the traffic volume); `cb(plainState)`; `on` returns an unsubscribe |
| `setSchedule({ arrivalsPerMinute, launchesPerMinute })` / `getSchedule()` | rates take effect for the next candidates; returns the current schedule incl. caps |
| `serialize()` / `apply(state)` | plain JSON: seed, time, schedule (rates, cursors, occupancy, live flights), every craft, custom paths; `apply` rebuilds and re-poses at the saved time |
| `slots()` | rack slots with occupancy |
| `stats()` | crafts, movers, inShaft, fighter/shuttle instances, live triangles, active draw calls |

Time jumps are safe in both directions; the harness `advance(n)` and `setView` both work.

## Hooks (`hooks.js`)

No-op seams, each with JSDoc describing the future implementation, called at these moments:

| hook | called |
| --- | --- |
| `flightControl(fighter, dt, t)` | every frame before a scripted mover is posed |
| `atmosphericEntry(fighter, {altitude, speed})` | a launching craft reaches its departure point |
| `landingGear(fighter, extended)` | arrival reaches the aperture centre (true) / launch clears the keel (false) |
| `docking(fighter, slot)` | a fighter settles into its rack slot |
| `surfaceContact(craft, pad)` | shuttle parked on the pad at build |
| `hangarDeploy(fighter, slot)` | a racked fighter is released for launch |
| `cameraOrbitToGround(fighterId)` | never by this module — reserved for the camera system |
| `landingZones()` | once at build, to collect extra pads |

## Views

`sys-traffic-approach` (exterior, t 40: fighter in the shaft + beams), `sys-traffic-racks` (port racks,
t 40), `sys-traffic-hover` (t 43: the arrival at the hover point), `sys-traffic-patrol` (exterior, t 40:
alpha-0 passing the camera).

## Known integration notes

* `d4-hangar/racks.js` builds fixed "open" clamp arms at ±4.0 m from every slot centre (8 m gap). A
  7.7 m fighter approaching along the slot's ±x axis (§9.6) passes through the hall-side arm, and the
  overhead beam blocks vertical entry; the hangar arms need to swing clear (or be left to this module's
  animated clamps) before combined docking shots look right. This module's clamps fold up under the beam
  when open so its own hardware never intersects an approaching fighter.
* Racked fighters are static instances; only movers rewrite matrices (≤ 16 + external spawns).
