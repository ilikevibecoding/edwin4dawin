# Corridor kit (`src/systems/corridor/`) — COORDINATION.md §9.3

Plain modules (no manifest). Import from any deck:

```js
import { corridorSegment, corridorJunction, openingFromDoor } from "../../systems/corridor/corridor.js";
import { impWall, impCeiling, impFloorSlab, impRib, impRail, MAT, col } from "../../systems/corridor/imperial.js";
import { impConsole, impSeat, impLocker, impBench, deckPlacard, statusBoard, floorDigit, firePoint, makeSignPlate } from "../../systems/corridor/props.js";
```

Dependencies: `three`, `src/kit.js`, `src/materials.js` (PALETTE), `src/systems/doors/helper.js`. Nothing else.

## `corridorSegment(kit, opts)`

```js
corridorSegment(kit, {
  from: [x, z], to: [x, z],           // centreline at floor level — axis-aligned (x or z); diagonals throw
  floorY,                             // deck floor (player feet)
  width = 3.0, height = 3.2,          // OUTER size = your room bounds. Walls are WALL_T = 0.16 inside the faces
  style = "imperial",
  openings = [],                      // { side:"L"|"R", u, w, h } | { side:"start"|"end", offset = 0, w, h }
  caps = { start: true, end: true },  // false = open end (no end wall) for a junction
  seed = 1, lights = null,            // lights: pass ctx.lights (one point per ~8 m, ≤ 14)
  collide = true, tag = "corridor",
}) → { length, dir: [dx, dz], right: [rx, rz], lightsAdded }
```

* `dir` is the unit vector from→to, `right = [-dz, dx]` (dir × up). Facing along `dir`, **L is your left,
  R your right**. For a corridor running +x, L is the -z wall; running -x, L is the +z wall.
* **L/R openings**: `u` = distance from `from` to the hole centre, hole cut at floor level, `w × h`.
* **start/end openings**: hole in the end cap, centred `offset` metres along `right` from the centreline.
* Use `openingFromDoor(doorEntry, { from, to })` to convert a manifest `doors[]` entry — it picks the side
  and uses `doorHole(kind)` so the hole is exactly the contract size (standard 2.4×3.0, blast 4×4,
  hatch 1.2×2.0, bay {w,h}). The doors system fills the hole.
* Ribs are skipped where they would cross a side opening (+0.35 m for the door frame); the wall light
  strip and the cable tray are broken at openings.

### What it builds (numbers)

| Element | Geometry |
|---|---|
| Floor | `impFloor`·impDark slab 0.12 below `floorY`; 1.0 m lighter centre strip 6 mm proud; 0.2 m black edge trims |
| Walls | WALL_T (0.16): black backing (`paintedMetal`·impBlack) 2.5 cm behind 1.2 m `impPanel`·impWhite/impGrey panels (~1 m rows), 0.32 m kick plates 1 cm proud, seams 2.5 cm |
| Wall strips | `emitWhite`, 6 cm tall, centre at exactly **2.1 m**, both walls, continuous between openings, in a black housing 1 cm recessed |
| Ceiling | slab 0.12 (panels + black seams); 0.6 m recessed channel along the centreline; 2.4 m `emitCoolSoft` diffusers with louvre fins centred between ribs |
| Ribs | every **4 m** (first at 4 m from `from`): dark frame 0.25 deep, 0.18 proud, floor plate, steel groove strip, blue/red indicator at 1.5 m, bolts; colliders on both posts |
| Cable tray | one wall (from `seed`), 2.55–2.65 m, 0.25 wide, three cables, brackets every 2 m |
| Greebles | ~8 % of eligible panels: vents (upper rows), junction boxes with conduits (mid rows), placards |
| Lights | one `point` per ~8 m at `height − 0.6`: colour 0xdfe8ff, intensity 14, distance 12, priority 0.4; spacing grows so a segment never pushes more than 14 |
| Colliders | wall backing slabs below head height (split at openings), rib posts, end caps |

Materials (draw calls): `impFloor impPanel paintedMetal metal emitWhite emitCoolSoft emitBlue emitRedImp
emitAmber` = **9**. Measured on the dev harness (this VM): 130 m × 3.5 m segment with three doors →
41k triangles, 9 kit meshes, 14 descriptors, 69 colliders, **65 ms** build. A 20 m segment is ~8k tris.

## `corridorJunction(kit, opts)`

```js
corridorJunction(kit, { center: [x, z], floorY, arms: ["N", "S", "E", "W"], width = 3.0, height = 3.2,
                        style = "imperial", seed = 1, lights = null, collide = true })
  → { size, arms, lightsAdded }
```

A `width × width` room with the same floor / ceiling / rib language: open on the listed arms
(N = −z, S = +z, E = +x, W = −x), panelled walls with strips on the others, corner posts, portal beams
and floor plates over each open arm, one fixture in the middle, one point light. Start each arm's
`corridorSegment` at the junction edge (`center ± width/2`) with `caps.start: false` so floors, walls
and ribs butt without overlapping. Measured: a 3.5 m four-way junction plus four 10 m arms (one end
door, one L door, one R hatch) → 14.4k triangles, 9 kit meshes, 5 descriptors, 33 colliders, 23 ms.

## Lower-level builders (`imperial.js`)

All axis-aligned; every collider is an exact AABB. Rooms of the Deck 4 aft complex are built from these.

* `impWall(kit, { plane:"x"|"z", at, inward:±1, a0, a1, y0, h, holes:[{min,max}], seed, panelW=1.2, kick=true, stripYs=[2.1], tint="impWhite", tint2="impGrey", greebles=0.08, collide=true, tag })` —
  `at` is the room's bounds face, `inward` the direction into the room; the panel faces end up exactly
  WALL_T inside. `holes` are world AABBs — hand every wall the same `doorOpening(door)` list, each wall
  keeps the ones on its face. Multiple `stripYs` give one strip band per level (stairwells); `stripYs: []`
  gives a plain wall. Strips run the whole wall length, so a wall whose levels differ along its length
  (a switchback stairwell) is best built as several `impWall` segments (`a0..a1`) with their own `stripYs` —
  the panel seams line up because each segment ends `SEAM/2` short of its edge (see `src/hangar/stairs/`).
  Holes may overlap (a hatch poking into a window band): the backing slabs are the exact rectangle minus
  the union of the holes.
* `impCeiling(kit, { x0,x1,z0,z1, y, thick=0.12, channels:[{ axis, at, width=0.6, c0, c1, fixtureAt:[…] | spacing, fixtureLen=2.4, fins=true }] })` — `y` is the visible face; slab above it.
* `impFloorSlab(kit, { x0,x1,z0,z1, y, thick=0.12, tint="impDark", mat="impFloor" })` — top face at `y`.
* `impRib(kit, { axis, at, c0, c1, y0, h, depth=0.25, proud=0.18, index })`.
* `impRail(kit, { a:[x,z], b:[x,z], y0, height=1.02, wall=true|false, wallSide:[dx,dz], mid=true })` — handrail
  at 1.02 m, wall-mounted (brackets) or balustrade (posts + kick plate), with a collider.

## Props (`props.js`)

`impConsole` (2.0 × 0.9 matte-black operations console, sloped panel, 3 `screenImp*` displays, dense
red/blue/amber fields), `impSeat`, `impLocker` (0.6 × 2.0 × 0.5), `impBench`, `deckPlacard`,
`statusBoard` (2×2 displays + legend), `floorDigit` (7-segment deck numeral, 1 cm proud), `firePoint`
(red wall cabinet on a hazard plate), `makeSignPlate(materials, {…})` → `{ group, material }` for
interactables (own material instance so the hover tint works). `Placer` places boxes/cylinders in a yawed
local frame and gives AABB colliders. Local frames follow the player yaw convention: yaw `a` makes local
−z face world `(−sin a, −cos a)`; a console's operator side is local +z, a locker's door local +z.

Rooms built with the kit so far: `src/hangar/{lobby,corridor-east,corridor-west,stairs,control}/`.
