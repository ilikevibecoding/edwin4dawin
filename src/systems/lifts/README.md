# `sys-lifts` — turbolift network (COORDINATION.md §9.2)

Owner: Agent D. Files: `src/systems/lifts/**`. The system is built **after every room**; it scans
`ctx.world.rooms` for lobby manifests that carry `lift` and drops one cabin prefab per lift, then wires
all cabins into one network (deck picker → doors close → ride → teleport → doors open).

## 1. Declaring a lift (lobby owners)

```js
import { LIFT_DOOR, liftDoorHole, liftCabinBox, liftLobbyClearance } from "../../systems/lifts/helper.js";

export default {
  id: "d2-lobby", name: "Deck 2 Lift Lobby", kind: "room", deck: 2, owner: "B",
  bounds: { min: [-10, 40, 375], max: [10, 44.5, 385] },
  lift: { id: "T2", pos: [0, 40, 385], dir: [0, 0, -1] },
  // ...doors, spawn, views, build()
};
```

- `lift.pos` — centre of the lift DOOR at floor level, **on the room's bounds face** (the same
  convention as a door `pos`).
- `lift.dir` — axis-aligned unit vector pointing **from the cabin into the lobby** (the face's inward
  normal, i.e. the opposite of a door's `dir` on that face). The cabin is built behind the wall,
  opposite `dir`.
- `lift.id` — unique on the ship (`T1`…`T4`). The cabin's deck number is `manifest.deck`; if that is
  missing, the digits in the id are used.
- `manifest.name` is what riders read on arrival: `Deck 2 — Deck 2 Lift Lobby`.

### What the lobby must do / keep free

1. **Cut the door hole.** Leave a clean `LIFT_DOOR` hole (`liftDoorHole()` → 2.4 w × 3.0 h) through
   the wall, centred on `pos`, exactly like a standard door hole (`doorAsWallOpening`-style
   `{u0,u1,v0,v1}` from `pos ± 1.2`, `0..3.0`). The wall slab is `WALL_T` = 0.16 thick just inside the
   bounds face, as for doors. Do **not** build a frame — the lifts system builds it. The open leaves
   slide into the wall slab either side of the hole, so keep the slab solid for 1.3 m each side.
2. **Reserve the cabin volume.** `liftCabinBox(lift)` = the 4.0 across × 4.0 deep × 3.6 high AABB
   behind the wall (it starts at the bounds face and extends 4 m away from the lobby). Nothing else may
   occupy it — no room bounds, no geometry, no colliders. The cabin shell fills it completely, so no
   light leaks either way.
3. **Keep the lobby footprint clear.** `liftLobbyClearance(lift)` is the AABB the system uses on the
   lobby side: 1.6 m to the viewer's left of the door centre, 2.3 m to the viewer's right (call panel),
   3.6 m high, 0.4 m proud of the wall. Flush wall panelling (≤ 3 cm proud) may run behind it; consoles,
   lockers, pipes, benches must stay outside. The lobby ceiling must be ≥ 3.6 m at that wall (the lintel
   indicator housing tops out at 3.6 m). The floor in front of the door must be flat and at `pos[1]`:
   the system lays a 2 cm threshold plate and a hazard sill 0.38 m into the lobby.

## 2. What the system builds (per lift)

Everything is expressed in the cabin's local frame so a lift may face ±X or ±Z.

- **Cabin shell** filling the reserved box: black cores + dark gloss floor plate, interior
  3.2 w × 3.6 d × 3.0 h; light-grey `impPanel` fields with black seams, kick plates, a vent and an
  equipment panel per wall; head-height light line in the middle seam; four corner posts with
  blue-white strips; grey ceiling with a recessed light channel (diffuser + grille ribs); floor border
  frame; handrail at 1.02 m on the back wall + short rails on both side walls; back-wall placard
  (`TURBOLIFT`, `T<deck>`).
- **Deck-select panel** on the cabin's right-hand wall (facing the doors from inside; +X for T4) at
  1.2 m: four lit deck buttons `1–4`, a 7-segment deck readout, READY / TRANSIT lamps, a small screen.
  Interactable `lift-<id>-panel`, key `E`, label `Select deck`.
- **Two sliding leaves** (1.24 m each, `THREE.InstancedMesh`) in the lobby's hole, sliding 1.22 m
  sideways into the wall; **heavy frame** (posts to 3.3 m, lintel, black lips → clear opening
  2.28 × 2.94, 0.11 m proud of the wall) with two vertical light strips and a hooded **lintel
  indicator** (3.3–3.6 m, 0.34 m proud): 7-segment deck readout + up/down chevrons; a `TURBOLIFT`
  decal above the door. Lobbies should not build their own surround or header there.
- **Call panel** in the lobby, 0.35 m to the viewer's right of the frame at 1.2 m: lit call button,
  status bar, `DECK <n>` label. Interactable `lift-<id>-call`, key `E`, label `Call turbolift`.
- **Colliders**: static `lift-wall` / `lift-frame` via `ctx.kit.collider`; two dynamic `lift-door`
  AABBs (returned as `colliders`, mutated in place every frame) so closed leaves block the player.
- **Light**: one point descriptor per cabin in the ceiling channel (priority 0.9 when the player is
  within 14 m, else 0.05); the ride animates its position/intensity.
- **Draw calls**: kit merges (12 material keys, ~3.3k triangles for one cabin) + 2 InstancedMeshes
  (leaves, lamps — shared by every cabin on the ship) + 2 small interactable face meshes per cabin
  (hidden beyond 40 m, so at most one cabin's pair is ever drawn): ≤ 4 draw calls beyond the kit merges.

## 3. Behaviour (all on the module clock `t`)

- Doors auto-open (0.6 s smooth ease) when the player is within 2.4 m of the door centre on the lobby
  side or anywhere inside the cabin; they close 1.5 s after the player is clear.
- `E` on the call panel: doors open, held ≥ 2 s, `audio.play("lift-arrive")`.
- `E` on the deck-select panel: HUD `Turbolift — press 1–4 for deck`, then a `keydown` listener for
  `Digit1–4` / `Numpad1–4` for 8 s (removed on pick, timeout → `Turbolift — no deck selected`, or when
  the player leaves the cabin).
- Pick / `callTo(deck)`: doors close (0.6 s) → transit 3 s to an adjacent deck, +1.5 s per extra deck
  (4.5 s, 6 s; capped at 6 s): HUD `Turbolift in transit`, `audio.loop("lift-ride")` (stopped on arrival),
  `player.shake(0.02, 3)`, two rings of blue light sweep the three walls (down when rising, up when
  descending), lintel/panel readouts count through the decks in amber → `ctx.teleport({ pos: feet
  1.2 m inside the TARGET cabin, yaw: facing its doors })` → target doors open, `audio.play("lift-arrive")`,
  HUD `Deck N — <target lobby name>`. Only a player standing inside the departing cabin is teleported;
  the theatre plays either way.
- Deck without a lobby on this build: doors shut for 1.4 s, the button and readout blink red, then HUD
  `Deck N unavailable` and the doors reopen. Selecting the current deck just holds the doors open.
- Indicators: current deck blue, unavailable decks dim red, picker white pulse, target amber, fault red;
  lobby lintel strip / cabin header white when open, amber while moving, red while riding.

## 4. API (`ctx.world.systems` → `sys-lifts` `result.api`, or `debugAPI.api("sys-lifts")` in the harness)

| call | effect |
| --- | --- |
| `callTo(deck, cabinId?)` | ride the cabin the player is in (or `cabinId`, or the nearest) to `deck`; `true` when a ride starts or the current deck is reselected, `false` when the deck is unavailable / a ride is in progress |
| `call(cabinId?)` | call panel action: open + hold the doors |
| `select(cabinId?)` | deck-select action: HUD prompt + key listener |
| `cabins()` | `[{ id, deck, roomId, name, pos, dir, spawn, yaw }]` |
| `state()` | `{ cabins: { T4: { deck, doorsOpen: 0..1, riding } }, currentRide: null \| { from, to, t0, duration } }` |
| `serialize()` | JSON-safe snapshot `{ v, t, cabins, ride, lastArrival }` |
| `apply(s)` | restore a snapshot (timers are re-based onto the current clock); restarts the ride loop if mid-transit |

Audio ids used: `door-open`, `door-close`, `lift-arrive`, `lift-ride` (loop handle `.stop()`).

Helpers in `helper.js`: `LIFT_DOOR`, `LIFT_VOLUME`, `liftDoorHole()`, `liftCabinBox(lift)`,
`LIFT_LOBBY_CLEARANCE`, `liftLobbyClearance(lift)`, `liftSpawn(lift)` (feet 1.2 m inside the doors +
yaw facing them — where a rider stands after arriving).

## 5. Dev harness

`?only=d4-lobby,sys-lifts`, views `sys-lifts-door`, `sys-lifts-door-open` (shoot with
`SHOT_ADVANCE=2`), `sys-lifts-cabin`, `sys-lifts-panel`. `debugAPI.interact("lift-T4-panel")` then
`debugAPI.pressKey("Digit2")` starts a ride; `debugAPI.api("sys-lifts").callTo(1)` from inside the
cabin exercises the "unavailable" path while only Deck 4 exists.
