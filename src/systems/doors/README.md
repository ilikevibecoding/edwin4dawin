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
  band on your face (a plate 5–14 cm proud of the wall, embedded 2 cm into it). A second, stepped-back
  surround band extends another 0.2 m beyond FRAME_W where your wall has room (clamped to your bounds;
  it sits 2–7 cm proud, so anything you build outside FRAME_W and further proud simply covers it).
- **Wall thickness.** The system assumes your inner wall face is `WALL_T` = 0.16 m inside your bounds
  face. If your walls are thicker, declare it once on the room manifest — `wallT: 0.30` — and the
  lining, frames, header, status lights and colliders on your face move out to your real face
  (`wallThickness(manifest)` in `helper.js`; each side of a shared door uses its own room's value, so a
  0.30 room can pair with a 0.16 room). Without it a thick wall buries the frame inside the slab.
- Leave room beside the hole for the leaves of standard / hatch doors to slide into the wall: at least
  `w/2 − 2·lining − 0.034` m of wall on each side (standard 1.05 m, hatch 0.47 m). When a room is too
  narrow the system automatically splits that door's leaves top / bottom instead (an info log names the
  door). Add `split: "vertical"` or `split: "side"` to the entry to choose explicitly.
- `to` also drives the dressing on each face: a standard / hatch door whose far room id ends in `-bay`
  gets a black/yellow threshold apron on the near side (blast / bay leaves already carry their hazard
  band), a door to `d4-stairs` gets a stair pictogram plate, a `to: null` door gets a red SEALED
  cross-bar. Threshold plates are the only floor geometry the system
  adds: a 1.2 cm sill under the frame plus (bay-bound faces) a 0.55 m apron into the room.
- Nothing else is needed: the system adds the door's static colliders and dynamic leaf colliders.

Unpaired doors are built **locked** (red light, never open) with a sealed slab behind the leaves:

| situation | light | console |
| --- | --- | --- |
| `to: null` / `to` missing | red | `console.log("[doors] <id>: future expansion, locked")` |
| `to` names a room that exists but does not declare the id | red | `console.warn(...)` |
| `to` names a room that does not exist (not loaded yet, typo) | red | `console.warn(...)` |

## What gets built (per door)

Everything is in a local frame: n = room A's `dir`, u across the opening, v up; the opening centre at
floor level is the origin. Room A's inner wall face is at n = −wallT(A), room B's at +wallT(B) (each
room's `wallT`, default WALL_T 0.16), the leaves live on the shared plane (n = 0) inside the gap.

- **Tunnel lining** (`metal`, mid grey): two jambs and a soffit spanning the gap between the two inner
  faces so the raw wall edges are never visible. Standard / hatch: 2 cm black pocket slots in the jambs;
  vertical-split doors: slot in the soffit + sill and steel guide rails.
- **Reveal frames** on both room faces (`paintedMetal`, `impMid` plates, `impDark` lips, `gunmetal`
  corner blocks, recessed black seams, steel bolt heads): FRAME_W around the hole, embedded 2 cm into
  the wall panel and standing 5–14 cm proud depending on kind, plus the stepped-back 0.2 m outer band
  (≥ 0.42 m of visible frame) and a thin `emitWhite` reveal strip on each lip so the reveal never reads
  as a black slit.
- **Header**: a black housing across the lintel with the leaf track (channel + steel rail) along its
  bottom and the full-width status bar behind a four-rail steel bezel, recessed 3 mm (a housed lamp, not
  a flat square).
- **Sill / threshold** for every kind: dark plate raised 1.2 cm spanning jamb to jamb on both faces,
  with a lighter nosing along each edge (steel; thin yellow line on blast / bay, whose one hazard element
  is the leaf band). Vertical-split doors: black slot + steel track edges; side-sliding: floor track.
- **Leaves**: two per door, `THREE.InstancedMesh` per kind+split (`doors_leaves_standard_side`,
  `doors_leaves_blast_vertical`, `doors_leaves_hatch_side`, `doors_leaves_bay_vertical`, …). Standard /
  hatch: lighter gunmetal body with broad light-grey face insets, a steel meeting-edge bar and a
  recessed latch channel carrying the **centre light seam** (a status-coloured strip that rides on the
  leaf). Blast / bay: thick armoured slabs with `impMid` plates, stiffener ribs, interlocking lugs with
  4 cm of relief over a black shadow gap and the black/yellow band along the meeting edge. Material
  `doorLeaf`: roughness 0.45, metalness 0.7, shared worn-metal maps, per-instance tint. **Open leaves
  never vanish**: side / top leaves stop with 10 cm of their edge (bar + seam / band) in the reveal, the
  bottom leaf keeps 3.5 cm above the sill.
- **Status lights**: one `InstancedMesh` (`doors_status_lights`, unlit, HDR `instanceColor`): the header
  bar, two housed LEDs (control panel on +u, lamp on −u) per face, and one seam per standard / hatch
  leaf. Blue-white = ready / open, red = locked, amber = cycling. Blue-white is > 1.15 so it blooms;
  red/amber sit at 1.3 so ACES keeps them saturated.
- **Variants by `to`** (per face): `to: null` → red cross-bar across the frame with a self-lit SEALED
  decal (module material `doorDecal`, canvas atlas) and a red line, on top of the red header/seams/LEDs;
  far room `*-bay` (standard / hatch kinds) → black/yellow apron 0.55 m into the room (`doorHazard`);
  far room `d4-stairs` → stair pictogram plate on the −u jamb.
- **Unpaired**: the lining spans just the declaring wall (2·wallT deep) and is capped with a sealed
  black slab, X-brace and red seal bar behind the leaves.
- **Colliders**: jambs (incl. outer band) + lintel + sealed bar static via `ctx.kit.collider`; leaves
  dynamic in `result.colliders` (`{min, max, tag: "door-leaf:<id>"}`, mutated in place every frame —
  parked once open ≥ 0.85: side/top leaves at their visible stop, the bottom leaf below the floor).

Draw calls: up to 8 kit merges for the whole system (`metal`, `paintedMetal`, `darkGloss`, `emitBlue`,
`emitWhite`, `doorHazard`, `doorDecal`, `emitRedImp`) + one instanced mesh per kind/split in use + one
status-light mesh (≤ 6 beyond the kit merges with every kind present). Two canvas textures (chevrons —
shared with the dev shim's `hazard`/`hazardImp` when present — and the 512 × 256 decal atlas).

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

`sys-doors-standard-closed` (east lobby door from 4 m), `sys-doors-standard-open` (1.8 m; the view
carries `advance: 2` so the leaves are open), `sys-doors-blast` / `sys-doors-blast-open`,
`sys-doors-blast-side`, `sys-doors-standard-side`, `sys-doors-stairs` / `sys-doors-stairs-open`
(side-sliding leaves), `sys-doors-sealed` (the `to: null` corridor-end door from 4 m),
`sys-doors-bay-apron` (corridor → cargo-bay door with its threshold apron). `?only=d4-lobby,sys-doors`
shows every lobby door locked-red (unpaired); the full configuration shows paired doors opening.
