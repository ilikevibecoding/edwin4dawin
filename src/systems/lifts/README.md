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
   lobby side: 1.7 m to the viewer's left of the door centre, 2.4 m to the viewer's right (call panel),
   3.6 m high, 0.4 m proud of the bounds face. Flush wall panelling (≤ 3 cm proud) may run behind it;
   consoles, lockers, pipes, benches — and any door surround/header of the lobby's own — must stay
   outside. The lobby ceiling must be ≥ 3.6 m at that wall (the lintel indicator hood tops out at
   3.6 m). The floor in front of the door must be flat and at `pos[1]`: the system lays a 4 cm sill
   plate 0.38 m into the lobby.

## 2. What the system builds (per lift)

Everything is expressed in the cabin's local frame so a lift may face ±X or ±Z.

- **Cabin shell** filling the reserved box: black cores + the lobbies' dark `impFloor` deck plate, interior
  3.2 w × 3.6 d × 3.0 h; light-grey `impPanel` fields with black seams, kick plates, a vent and an
  equipment panel in the top row, a varied middle row (inset plate / louvred vent / indicator cluster /
  plain — no two neighbours alike); head-height light line in the middle seam; four corner posts with
  blue-white strips; grey ceiling with a recessed channel holding a housed fixture (dark housing,
  narrow diffuser, louvre fins); floor border frame; grab rails at 1.02 m running post to post on the
  back and left walls and from the deck-select housing to the back post on the right wall, brackets
  every ≤ 0.8 m; back-wall **deck readout plate** (matte black: 7-segment deck digit + up/down arrows,
  `DECK` label, `T<deck>` id). Dark plates that face the cabin light (readout, indicator clusters, vent
  recesses, hood face) use the module's clean matte `liftMatte` — gloss mirrors the light over the digit
  and the worn/painted maps mottle on near-black tints.
- **Deck-select panel** on the cabin's right-hand wall (facing the doors from inside; +X for T4) at
  1.2 m: four recessed deck buttons `1–4` with lit rings (current deck blue, target amber, fault red,
  decks without a lobby dim red), a 7-segment deck readout, READY / TRANSIT lamps, a small screen.
  Interactable `lift-<id>-panel`, key `E`, label `Select deck`.
- **Two sliding leaves** (1.24 m each, two `THREE.InstancedMesh`es: gunmetal body with stiles, rails
  and horizontal panel lines + light-grey painted insets recessed 7 mm) in the lobby's hole; they slide
  1.07 m sideways into the wall so 7 cm of leaf edge stays visible in the reveal when open (2.14 m clear
  passage); a blue-white light seam runs down each meeting edge (amber while moving, red in transit);
  a header track above the opening and a dark **sill plate** (4 cm, light edge lines, leaf guide slot)
  bridging lobby and cabin floors.
- **Heavy frame**: 0.46 m jambs (reveal 1.14 → 1.60 m either side) in two bands with horizontal panel
  lines, a vertical light strip in the groove between the bands, a thin lit reveal strip on each jamb's
  inner face, foot blocks; two-band lintel to 3.3 m with a `TURBOLIFT` plate and a hooded **lintel
  indicator** (3.3–3.6 m, 0.34 m proud): 7-segment deck readout + up/down chevrons. Clear opening
  2.28 × 2.9. Lobbies must not build their own surround or header there.
- **Call panel** in the lobby, 0.35 m to the viewer's right of the jamb at 1.2 m (0.36 × 0.6 housing):
  recessed call button with a lit ring, status bar, `DECK <n>` label, `TURBOLIFT` plate. Interactable
  `lift-<id>-call`, key `E`, label `Call turbolift`.
- **Colliders**: static `lift-wall` / `lift-frame` via `ctx.kit.collider`; two dynamic `lift-door`
  AABBs (returned as `colliders`, mutated in place every frame) so closed leaves block the player.
- **Light**: one point descriptor per cabin, deep and low in the cabin (2.6 m in, 2.2 m up, distance
  4 m) so it never pools on the lobby floor; priority 0.4 while the player is out in the lobby (the
  room's own lights win), 0.75 when they stand at the door (< 3.2 m) or inside the cabin, 0.05 beyond
  14 m; the ride animates its position/intensity.
- **Draw calls**: kit merges (~14 material keys, ~4.5k triangles for one cabin) + 3 InstancedMeshes
  (leaf bodies, leaf insets, lamps — shared by every cabin on the ship) + 2 small interactable face
  meshes per cabin (hidden beyond 40 m, so at most one cabin's pair is ever drawn): ≤ 5 draw calls
  beyond the kit merges.

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

`?only=d4-lobby,d4-stairs,sys-doors,sys-lifts`, views `sys-lifts-door`, `sys-lifts-door-open` (carries
`advance: 2` so the leaves are open), `sys-lifts-cabin`, `sys-lifts-panel`. `debugAPI.interact("lift-T4-panel")` then
`debugAPI.pressKey("Digit2")` starts a ride; `debugAPI.api("sys-lifts").callTo(1)` from inside the
cabin exercises the "unavailable" path while only Deck 4 exists.
