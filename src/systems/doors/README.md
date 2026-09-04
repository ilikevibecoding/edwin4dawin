# sys-doors — ship-wide doors system (COORDINATION.md §9.1)

Owner D. Manifest: `src/systems/doors/index.js` (`id: "sys-doors"`, `kind: "system"`). Built after
every room; it reads each room manifest's `doors[]`, pairs entries by `id` and fills every hole with a
frame, lining, threshold, animated leaves and a status light. Rooms never build any door geometry.

## Declaring a door (room authors)

```js
import { doorOpening, doorAsWallOpening, WALL_T, FRAME_W } from "../../systems/doors/helper.js";

export default {
  id: "d4-lobby",
  bounds: { min: [-10, -72, 170], max: [10, -67.5, 181] },
  doors: [
    // pos = opening centre at FLOOR level on the bounds face, dir = outward normal (axis-aligned)
    { id: "d4-lobby-east", kind: "standard", pos: [10, -72, 171.75], dir: [1, 0, 0], to: "d4-corridor-east" },
    { id: "d4-hangar-aft", kind: "blast", pos: [0, -72, 170], dir: [0, 0, -1], to: "d4-hangar" },
    { id: "d4-bay-1", kind: "bay", w: 13.5, h: 10, pos: [0, -72, 94], dir: [0, 0, 1], to: "d4-fighter-bay" },
    { id: "d4-lobby-spare", kind: "hatch", pos: [-10, -72, 178], dir: [-1, 0, 0], to: null }, // future expansion
  ],
};
```

- Kinds and clear openings (`helper.js` `DOOR_KINDS`): standard 2.4 × 3.0, blast 4.0 × 4.0, hatch
  1.2 × 2.0, bay = your own `{ w, h }` on the entry.
- Both rooms sharing a door declare the **same `id`, same `pos`, opposite `dir`**, `to` = the other room.
- Cut a clean rectangular hole of exactly `doorHole(door)` in your wall on that face
  (`doorOpening(door)` gives the world AABB / wall-axis extents, `doorAsWallOpening()` a panelGrid
  opening). Keep wall panels `FRAME_W` (0.22 m) away from the hole edge: the frame's reveal covers that
  band on your face (a plate 5–14 cm proud of the wall, embedded 2 cm into it).
- Leave room beside the hole for the leaves of standard / hatch doors to slide into the wall: at least
  `w/2 − 2·lining + 0.07` m of wall on each side (standard 1.15 m, hatch 0.57 m). When a room is too
  narrow the system automatically splits that door's leaves top / bottom instead (an info log names the
  door). Add `split: "vertical"` or `split: "side"` to the entry to choose explicitly.
- Nothing else is needed: the system adds the door's static colliders and dynamic leaf colliders.

Unpaired doors are built **locked** (red light, never open) with a sealed slab behind the leaves:

| situation | light | console |
| --- | --- | --- |
| `to: null` / `to` missing | red | `console.log("[doors] <id>: future expansion, locked")` |
| `to` names a room that exists but does not declare the id | red | `console.warn(...)` |
| `to` names a room that does not exist (not loaded yet, typo) | red | `console.warn(...)` |

## What gets built (per door)

Everything is in a local frame: n = room A's `dir`, u across the opening, v up; the opening centre at
floor level is the origin. Room A's inner wall face is at n = −WALL_T, room B's at +WALL_T, the leaves
live in the middle of the gap (n = 0).

- **Tunnel lining** (`metal`, mid grey): floor track, two jambs and a soffit spanning the gap between the
  two inner faces so the raw wall edges are never visible. Standard / hatch: 2 cm black pocket slots in
  the jambs; blast / bay: slot in the soffit + sill and steel guide rails.
- **Reveal frames** on both room faces (`paintedMetal`, `impMid` plates, `impDark` lips, `gunmetal`
  corner blocks, recessed black seams, steel bolt heads): FRAME_W around the hole, embedded 2 cm into
  the wall panel and standing 5–14 cm proud depending on kind.
- **Threshold**: black/yellow chevron plate (module material `doorHazard`) for blast / bay, plain dark
  plate for standard / hatch; blast / bay sills carry the lower leaf's slot and steel track edges.
- **Leaves**: two per door, `THREE.InstancedMesh` per kind+split (`doors_leaves_standard_side`,
  `doors_leaves_blast_vertical`, `doors_leaves_hatch_side`, `doors_leaves_bay_vertical`, …). Standard /
  hatch slide sideways into wall pockets; blast / bay split top / bottom (thick armoured slabs with
  recessed panel lines, stiffener ribs, interlocking lugs and a black/yellow stripe band along the
  meeting edge). Material `doorLeaf`: dark gunmetal, roughness 0.55, metalness 0.6, shared worn-metal
  maps, per-instance tint.
- **Status lights**: one `InstancedMesh` (`doors_status_lights`, unlit, HDR `instanceColor`): a bar in
  the lintel housing and a small LED on the jamb control panel, on each face. Blue-white = ready / open,
  red = locked, amber = cycling. Colours are > 1.0 so they bloom (threshold 1.15).
- **Unpaired**: the lining spans just the declaring wall (2·WALL_T deep) and is capped with a sealed
  black slab, X-brace and red seal bar behind the leaves.
- **Colliders**: jambs + lintel static via `ctx.kit.collider`; leaves dynamic in `result.colliders`
  (`{min, max, tag: "door-leaf:<id>"}`, mutated in place every frame — parked out of the path once
  open ≥ 0.85).

Draw calls: up to 6 kit merges for the whole system (`metal`, `paintedMetal`, `darkGloss`, `emitBlue`,
`doorHazard` for blast/bay, `emitRedImp` for unpaired caps) + one instanced mesh per kind/split in use
+ one status-light mesh (≤ 6 beyond the kit merges with every kind present).

## Behaviour

- Auto-open when `ctx.player.position` is within **2.6 m** (horizontal, either side, player on the
  door's floor level) of the opening centre; smoothstep ease over **0.6 s**; closes **1.5 s** after the
  player is clear. Locked doors never auto-open. `ctx.audio.play("door-open" | "door-close", [x, y, z])`
  fires when a move starts (position = opening centre at mid height).
- All timing uses the `t` passed to `update(dt, t)`; a clock rewind (harness `setView`) keeps every
  timer relative.

## API (`debugAPI.api("sys-doors")` / integrator's registry)

| call | result |
| --- | --- |
| `setLocked(id, bool)` | `true` if the id exists. Locking an open door closes it (unless force-held) and turns the light red; the door stays shut with the player beside it. |
| `getState(id)` | `{ open: 0..1, locked: bool }` or `null` |
| `forceOpen(id)` | opens even when locked; counts as presence for 1.5 s, then the normal close delay applies |
| `list()` | `[{ id, kind, pos:[x,y,z], rooms:[a, b|null], locked }]` |
| `serialize()` | `{ doors: { id: { open, locked, t } } }` (t = last update time) |
| `apply(state)` | applies `{doors:{id:{open?, locked?}}}` (or the bare map); returns the number of doors updated |

## Harness views

`sys-doors-standard-closed` (east lobby door from 4 m), `sys-doors-standard-open` (1.8 m, shoot with
`SHOT_ADVANCE=2`), `sys-doors-blast` / `sys-doors-blast-open`, `sys-doors-blast-side`,
`sys-doors-standard-side`, `sys-doors-stairs` / `sys-doors-stairs-open` (side-sliding leaves).
`?only=d4-lobby,sys-doors` shows every lobby door locked-red (unpaired); the full configuration shows
paired doors opening.
