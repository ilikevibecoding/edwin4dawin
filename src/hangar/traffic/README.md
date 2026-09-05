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
| `traffic_beams` | `Mesh` | 9 unit cones (4 halo + 4 core tractor beams, 1 landing-light cone) stretched in the vertex shader from the emitters / the craft's lamp; each set collapses to nothing when its gate uniform is 0 |
| `traffic_glow` | `InstancedMesh` cap 64 | additive gaussian billboards: twin engine glows on every mover (brighter with speed and acceleration, never under ~5 px) plus one "hold" disc under a craft hovering in the hangar |
| `traffic_beacons` | `Points` | nav lights, landing-light flicker, shuttle fin beacon, emitter glow |
| `traffic_clamps` | `InstancedMesh` 2 per slot | rack clamp arms: folded flat under the beam (90°) at empty slots and while a fighter approaches, swung 25° onto the hull when closed |

Materials: `trafficHull` (fighters + clamps), `trafficShuttle`, `trafficGlow`, `trafficBeam`,
`trafficBeacon`. No canvas textures, no `THREE.Light`s. One pooled point-light *descriptor* rides with the
craft in the shaft (tractor fill) and is removed from `ctx.lights` when the beam is idle.

Geometry: fighter 944 tris (span 7.70 m, wing faces at |x| 3.85, nose −Z at yaw 0; spoked octagonal
viewport with dark glass and a lit rim, dark aft engine block with two recessed nozzles that carry no idle
emissive, a warm landing-lamp lens (r 0.28, emissive 0.3/0.26/0.19) set into the belly hatch's forward corner
where the lamp sprite and its light cone start; colours from `tieColours()` — frame 0x3a3e4b, hull 0x454a58, cells 0x08090c, dark 0x202329, i.e.
the Imperial greys cut 50–60 % and cooled, so the fighters read as dark blue-grey machines under the rack
floods; `trafficHull` is roughness 0.78 / metalness 0.15 / envMapIntensity 0.35 so the near-black cells do
not pick up a grey specular sheen), shuttle 1492 tris (21 m; plated fuselage with baked seams, glazed cockpit band, port boarding
hatch, four landing skids whose pads sit exactly `standHeight` = 2.85 m below the origin, three recessed
nozzles with a dim radial glow), clamp 36 tris. The live triangle total is kept under 40 000 by capping
fighter instances: `maxFighterInstances = floor((40000 − fixed) / 944)` where `fixed` is one parked
shuttle + clamps + beam cones + glow quads (38 with the 28-slot rack); the scheduler refuses arrivals while
the hangar holds `maxFighterInstances − maintenance − patrol` fighters. `api.stats()` reports the live
figure.

## World interfaces (systems build after rooms)

| source | call | fallback |
| --- | --- | --- |
| `d4-hangar` | `ctx.world.get("d4-hangar").result.api.rackSlots()` → `[{id,pos,yaw,tier,side,occupied}]` | both sides x ±70, tiers y −62/−46, z 28,38,…,88 (28 slots, none within 10 m of the bay doors) |
| `d4-shuttle-bay` | `…api.shuttlePad()` → `{pos,yaw}` (`pos.y` = pad top surface) | `{pos:[-110,-71.7,15], yaw:90}` |
| `d4-fighter-bay` | `…api.cradles()` → `[{pos,yaw}]` | `[[110,-67.8,-10],[110,-67.8,30]]`, yaw 0 |

Slots are read from `rackSlots()` once at build (positions, yaw and ids come from the hangar; the fallback
grid is only used when the hangar is absent). ~70 % of them (20 of 28, chosen from the seed) receive a
racked fighter and the hangar's slot objects get `occupied = true`; the flag is kept current as fighters
launch and dock, which is what drives the hangar's own cradle arms. Two fighters sit on the maintenance
cradles (`state: "maintenance"`), one shuttle parks on the pad with its skids on the pad top and its
wings parked at `fold` 0.5 (raised ~38°, clearly two wings plus the fin from any angle).

Hangar facts used here: floor y −72, aperture x ∈ [−36, 36], z ∈ [−30, 94], centre (0, −85, 32);
tractor emitters (±36, −73, −30) and (±36, −73, 94) — at build the beams read `d4-hangar`'s
`api.tractorPoints()` (first four entries) and fall back to these constants. The beams target any mover
inside the shaft column (x/z inside the hole, y −100 … −62, fading over 6 m at both ends).

## Paths (`paths.js`)

All paths are world-space `THREE.CatmullRomCurve3` (centripetal) with an arc-length table; position at
time `t` is `curve.getPointAt(profile((t − t0) / duration))`. `profile` is a monotone cubic through
(time fraction, arc fraction) knots, so control points are passed at exact times and flat spans are
exact dwells. Nothing integrates `dt`.

| id | duration | shape |
| --- | --- | --- |
| `arr:<slotId>:<v>` | 80 s | far point ≈ (±900, −1800, −3500) + variant offset → (0, −300, 32) 44 s → shaft entry (0, −150, 32) 52 s → **aperture centre at 60 s** (a straight ~8 m/s vertical climb, ~6 s inside the tractor column) → hover (0, −40, 32) 66–68 s → mid 71 s → 14 m and 5 m out along the slot's ±x axis (75 s, 78 s) → slot (80 s, zero speed) |
| `lau:<slotId>:<v>` | 60 s | unclamp dwell 0–3 s → 5 m / 14 m out (6 s, 9 s) → mid 12 s → hover 15–17 s → **aperture centre at 22 s** → shaft entry 28 s → (0, −300, 32) 33 s → departure ≈ (±900, −2000, 3900) + variant |
| `patrol:alpha` | 96 s loop | ~15 km loop at ~155 m/s; the lead passes (1550, 197, −901) at t 40 (+96 k) with the `sys-traffic-patrol` camera 100 m behind, 45 m right and 30 m above it |
| `patrol:beta` | 118 s loop | ~13 km loop under the keel plane, phased so its V is on the far side of the ship at t 40 |
| `custom:<n>` | length / 120 m/s | `api.spawn({ path: Vector3[] })`; smooth start/stop |

Patrol flights fly as five-ship Vs (`FORMATION` in `index.js`): member *i* trails the lead by 0/20/40 m
along the loop (a `t0` offset of `behind / speed`) and sits ±16/±32 m right and 3/6 m below it in the
flight's tangent frame, so the echelon banks with the leader. The offset is part of the serialized state.

Orientation: nose along the tangent with banked roll from lateral acceleration; arrivals blend to a
level hover yaw (aft-facing, turned 8° toward the docking wall) then to the slot yaw during the final
approach; launches hold the slot yaw while backing out, level off at the hover, then follow the tangent.
`FlightPath.keys` exposes the fractions used for effects (`shaft`, `hover`, `approach`, `settle`,
`unclamp`, `clear`).

## Effects (`effects.js`, driven from `update`)

* **Tractor beams** — while a mover is inside the shaft column, four pale-blue halo cones (radius 1.0 m at
  the emitter, 2.8 m at the craft) plus four thin core threads converge on it from the emitters. The shader
  makes them read as light, not geometry: the body is `pow(|N·V|, 1.6)` — brightest where the wall faces the
  camera, zero at the silhouette (a 0.5 floor when viewed along the axis) — the halo dims 1.0 → 0.3 from
  emitter to craft and fades out over its last 12 % (alpha 0.14 at the centre), the core runs in at alpha
  0.24 × (0.6 → 1.0) and brightens ×2.5 over the last 25 % into the focus on the target; faint scanlines
  (0.85 ± 0.15, 3.2 m period) travel toward the craft with a slow pulse. Strength fades over 6 m at both
  ends of the column and the pooled tractor point light follows.
* **Landing light** — the craft in the shaft (else the first hangar mover) carries an 18 m warm flickering
  cone from its chin, angled forward-down, and a warm lamp sprite over the chin lens (colour 1.3/1.15/0.9 at
  peak — a hot centre just past the bloom threshold, never a clipped disc — dropping to 30 % on the
  flicker's off beats; 0.5 m sprite).
* **Engine glow** — every mover has two additive gaussian quads at its nozzle exits (`FIGHTER_ENGINES` /
  `SHUTTLE_ENGINES`), scaled by speed and acceleration; racked craft have none (nozzles are dark recesses).
  The glow shader ends in a soft shoulder `c = 1.4·(1 − e^(−c/1.4))`, so a pair of nozzles seen head-on
  (both unoccluded, 1.44 m apart) keeps a hot centre instead of merging into a clipped white disc.
* **Hold glow** — a soft additive disc 4.6 m under a hangar mover that is level and slow (the hover and the
  final approach) so it reads as held in the air; gated by the flight phase, never on the shaft climb.
* **Clamps** — closed (25° onto the hull) on occupied slots, folded flat under the beam otherwise; they
  close over the arrival's last 2 s (`keys.settle` → 1) and open during a launch's unclamp dwell.

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
{ id, type: "fighter"|"shuttle", state, pathId, t0, duration, from, to, position:[x,y,z], yaw, offset? }
state ∈ racked | launching | patrol | arriving | docking | maintenance
```

`offset` (`[right, up]` metres in the tangent frame) is present on formation members only.

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

Every view carries its own `time`; none relies on an external advance.

| view | camera | moment |
| --- | --- | --- |
| `sys-traffic-approach` | exterior, (20, −108, 8) → (0, −82, 34): 39 m below/beside the aperture | t 40 — arrival A0 is exactly at the aperture centre, all four beams on, engine glow and landing light lit; it stays in the column for t 58–62 |
| `sys-traffic-racks` | on the deck at (−42, −72, 40) outside the aperture rail, yaw 108, pitch 18 | t 40 — both port rack tiers, closed clamps on occupied slots, folded clamps on empty ones |
| `sys-traffic-hover` | exterior, (20, −52, 46) → (0, −40, 32): 27 m from the hover point, looking up | t 47 — A0 holds level at the hover (66–68 s after its t0 = −20), engines toward the camera, hold glow under it, landing light sweeping down |
| `sys-traffic-patrol` | exterior, on alpha's loop 100 m behind / 45 m right / 30 m above the lead (`PATROL_CAM`) | t 40 — the five-ship V passes its first control point, 70–115 m from the camera, 3/4 rear view, nothing at frame centre |

## Known integration notes

* `d4-hangar/racks.js` builds its own cradle arms at every slot and animates them from `slot.occupied`
  (`api.clampState()`); this module sets that flag, so both sets of hardware agree. A 7.7 m fighter
  approaching along the slot's ±x axis (§9.6) still passes through the hall-side hangar arm while it is
  open, and the overhead beam blocks vertical entry; if that shows in combined docking shots the hangar
  arms need to swing further clear (or be left to this module's clamps). This module's clamps fold flat
  under the beam when open so its own hardware never intersects an approaching fighter.
* The shuttle's origin is `standHeight` (2.85 m) above `shuttlePad().pos.y`; the pad top must be at
  `pos.y` for the skid pads to touch (it is, since the shuttle bay's fix round).
* The harness HUD draws a crosshair at the exact frame centre in every view; it is not part of this module.
* Racked fighters are static instances; only movers rewrite matrices (≤ 16 + external spawns).
