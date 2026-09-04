# Corridor kit (`src/systems/corridor/`) — COORDINATION.md §9.3

Plain modules (no manifest). Import from any deck:

```js
import { corridorSegment, corridorJunction, openingFromDoor } from "../../systems/corridor/corridor.js";
import { impWall, impCeiling, impFixture, impFloorSlab, impRib, impRail, MAT, col } from "../../systems/corridor/imperial.js";
import { impConsole, impSeat, impLocker, impBench, deckPlacard, sectionMarker, statusBoard, wallTerminal,
         ventPanel, junctionDrop, firePoint, makeSignPlate, Placer } from "../../systems/corridor/props.js";
import { textMaterials, stencilText, stencilDigit, textWidth } from "../../systems/corridor/text.js";
```

Dependencies: `three`, `src/kit.js`, `src/materials.js` (PALETTE), `src/systems/doors/helper.js`. Nothing else.

## Text (`text.js`) — real stencilled lettering

One 1024² canvas atlas (JetBrains Mono ExtraBold, drawn once per page): A–Z 0–9 `- / . : +` and the
arrows `← → ↑ ↓` in white / amber / blue / red / green / grey, plus outlined "big" numerals for deck
numbers. Two module-local materials share that texture, so text costs **2 draw calls per module**, total:

* `impText` — painted stencil (lit by the room; `color: "grey"` is worn floor paint)
* `impTextLit` — self-lit sign text (emissive map = the atlas)

Register them in the manifest: `materials: textMaterials`. Every prop below that carries text checks
`kit.materials.impText` and falls back to a plain plate when a module didn't register them.

```js
stencilText(kit, { text: "CARGO BAY", pos, normal, up = [0,1,0], size = 0.12, color = "white", lit = false,
                   align = "center" | "left" | "right", spacing = 1, maxWidth = null, tint }) → { width, height }
stencilDigit(kit, { digit: "4", pos, normal = [0,1,0], up = [0,0,-1], size = 2.4, color = "grey" })   // floor numeral
textWidth("CARGO BAY", 0.12)                                                                         // for sizing plates
```

`pos` is the centre of the row (or of the numeral cell); `size` is the glyph cell height. Glyph planes
are 1 mm off the wall you give them — put `pos` on the plate face, not inside it.

## `corridorSegment(kit, opts)`

```js
corridorSegment(kit, {
  from: [x, z], to: [x, z],           // centreline at floor level — axis-aligned (x or z); diagonals throw
  floorY,                             // deck floor (player feet)
  width = 3.0, height = 3.2,          // OUTER size = your room bounds. Walls are WALL_T = 0.16 inside the faces
  style = "imperial",
  openings = [],                      // { side:"L"|"R", u, w, h } | { side:"start"|"end", offset = 0, w, h }
  caps = { start: true, end: true },  // false = open end (no end wall) for a junction
  accent = "impBlue",                 // "impBlue" | "impAmber" | "impRed" | "impGreen" — corridor identity
  label = null,                       // "4-E" → section markers read "4-E 01", "4-E 02", … (needs textMaterials)
  seed = 1, lights = null,            // lights: pass ctx.lights (one point per ~8 m, ≤ 14)
  reserved = [],                      // [{ side:"L"|"R", u0, u1 }] wall spans the dressing must keep clear of
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
  strip, the floor accent lines and the dressing are broken at openings.
* **Identity**: `accent` colours the rib indicators (every 4th rib stays red), the floor edge lines, the
  section markers, the junction-box lamps and the terminal screens. Deck 4 uses amber + `"4-E"` on the
  starboard (east) run and blue + `"4-W"` on the port (west) run; the destination placards (`deckPlacard`
  "CARGO BAY →" / "← REPAIR BAY" / "SECTION 4-E END · SEALED") are placed by the room, not the kit.

### What it builds (numbers)

| Element | Geometry |
|---|---|
| Floor | `impFloor`·impDark slab 0.12 below `floorY`; **0.6 m** lighter centre inlay 6 mm proud; thin accent light lines (1.5 cm) along both inlay edges, one run per bay, broken 0.3 m short of ribs and openings; 0.2 m black edge trims |
| Walls | WALL_T (0.16): black backing (`paintedMetal`·impBlack) 2.5 cm behind 1.2 m `impPanel`·impWhite/impGrey panels (~1 m rows), 0.32 m kick plates 1 cm proud, seams 2.5 cm |
| Wall strips | `emitWhite`, 6 cm tall, centre at exactly **2.1 m**, both walls, continuous between openings, in a black housing 1 cm recessed |
| Ceiling | slab 0.12 (panels + black seams); 0.6 m recessed channel along the centreline; **housed fixtures** (`impFixture`) 2.4 m long centred between ribs: dark housing with end caps, louvre fins every 15 cm, a narrow 14 cm `emitCoolSoft` strip inside |
| Ribs | every **4 m** (first at 4 m from `from`): dark frame 0.25 deep, 0.18 proud, floor plate, steel groove strip, accent indicator at 1.5 m (every 4th red), bolts; colliders on both posts |
| Dressing | one item every **10 m** (2.5 bays), alternating walls, rotation from `seed`: cable tray (2.6 m, three cables, brackets) · pipe pair with clamps · junction box + conduit drop to the ceiling · louvred vent with 11 cm depth · wall terminal (bezelled screen + keypad, 1.4 m) · fire point (red cabinet, stencilled FIRE POINT) · stencilled section marker (`label` + running number). Runs are cut 0.5 m short of openings; point items stay out of the **1.8 m door-sign zone** beside every side opening (where `deckPlacard` goes) and out of any `reserved` span |
| Greebles | ~8 % of eligible panels: vents (upper rows), junction boxes with conduits (mid rows), blank placards |
| Lights | one `point` per ~8 m at `height − 0.6`: colour 0xdfe8ff, intensity 14, distance 12, priority 0.4; spacing grows so a segment never pushes more than 14 |
| Colliders | wall backing slabs below head height (split at openings), rib posts, end caps, terminals and fire cabinets |

Materials (draw calls): `impFloor impPanel paintedMetal metal emitWhite emitCoolSoft emitBlue emitRedImp
emitAmber` + one `screenImp*` for the terminals + `hazard` for the fire-point plate (+ `impText impTextLit`
when registered) = **11–13**. Measured on the dev harness (this VM): 130 m × 3.5 m segment with three
doors → 46k triangles, 13 kit meshes, 14 descriptors, 73 colliders, ~60 ms build. A 20 m segment is ~8k tris.

## `corridorJunction(kit, opts)`

```js
corridorJunction(kit, { center: [x, z], floorY, arms: ["N", "S", "E", "W"], width = 3.0, height = 3.2,
                        style = "imperial", accent = "impBlue", seed = 1, lights = null, collide = true })
  → { size, arms, lightsAdded }
```

A `width × width` room with the same floor / ceiling / rib language: open on the listed arms
(N = −z, S = +z, E = +x, W = −x), panelled walls with strips on the others, corner posts, portal beams
and floor plates over each open arm, one housed fixture in the middle, one point light. Start each arm's
`corridorSegment` at the junction edge (`center ± width/2`) with `caps.start: false` so floors, walls
and ribs butt without overlapping. Measured: a 3.5 m four-way junction plus four 10 m arms (one end
door, one L door, one R hatch) → ~15k triangles, 5 descriptors, 33 colliders.

## Lower-level builders (`imperial.js`)

All axis-aligned; every collider is an exact AABB. Rooms of the Deck 4 aft complex are built from these.

* `impWall(kit, { plane:"x"|"z", at, inward:±1, a0, a1, y0, h, holes:[{min,max}], seed, panelW=1.2, kick=true, stripYs=[2.1], stripGaps=[[a,b]…], clear=[[a,b]…], tint="impWhite", tint2="impGrey", greebles=0.08, collide=true, tag })` —
  `at` is the room's bounds face, `inward` the direction into the room; the panel faces end up exactly
  WALL_T inside. `holes` are world AABBs — hand every wall the same `doorOpening(door)` list, each wall
  keeps the ones on its face. Multiple `stripYs` give one strip band per level (stairwells); `stripYs: []`
  gives a plain wall. `stripGaps` are along-axis ranges where the strip is replaced by plain panel — use
  them to route the strip around a status board or a plaque instead of running it behind. `clear` spans
  (world coordinates along the wall) get plain panels only — list every placard, board and terminal you
  mount on a greebled wall, or a random junction box/vent will eventually land under one (the corridor
  kit clears 1.8 m beside each door and its `reserved` spans automatically). Strips run the
  whole wall length, so a wall whose levels differ along its length (a switchback stairwell) is best built
  as several `impWall` segments (`a0..a1`) with their own `stripYs` — the panel seams line up because each
  segment ends `SEAM/2` short of its edge (see `src/hangar/stairs/`). Holes may overlap (a hatch poking
  into a window band): the backing slabs are the exact rectangle minus the union of the holes.
* `impCeiling(kit, { x0,x1,z0,z1, y, thick=0.12, channels:[{ axis, at, width=0.6, c0, c1, fixtureAt:[…] | spacing, fixtureLen=2.4, fixtureMat, fins=true }] })` — `y` is the visible face; slab above it.
  Each channel gets housed `impFixture`s; `fixtureMat: "emitBlue"` makes a coloured rectangular channel
  (the control tower's holo-table channel) instead of a disc.
* `impFixture(kit, { axis, at, c0, c1, y, width=0.5, mat=emitCoolSoft, fins=true, stripW=0.14 })` — one
  housed ceiling fitting inside a channel (dark housing, louvres, narrow emitter). Stairwell soffits and
  landing ceilings use it directly.
* `impFloorSlab(kit, { x0,x1,z0,z1, y, thick=0.12, tint="impDark", mat="impFloor" })` — top face at `y`.
* `impRib(kit, { axis, at, c0, c1, y0, h, depth=0.25, proud=0.18, index, accent=null })` — `accent` =
  material key for the indicator (every 4th rib red); without it indicators alternate blue/red.
* `impRail(kit, { a:[x,z], b:[x,z], y0, y1=y0, height=1.02, wall=true|false, wallSide:[dx,dz], mid=true, infill="panel"|"none", postEvery=1.4, newel=0.07 })` —
  handrail at 1.02 m above the run; `y1 ≠ y0` makes a **sloped** run (stair flights) where the rails follow
  the slope and posts, newel caps and the panel infill stay vertical (sheared, not rotated). `wall: true`
  = steel tube on L-brackets with wall plates; `wall: false` = balustrade with square newel posts on base
  plates, top + mid rails and a dark sheet infill 0.12..0.84 m above the run, plus a collider.

## Props (`props.js`)

Everything is kit-bashed (one draw call per material key); text is real stencil lettering when the
module registered `textMaterials`.

* `impConsole({ pos, yaw, w=2.0, d=0.9, layout=0..3, screens=[…], gloss })` — matte-black operations
  console with a sloped instrument panel; **four layouts**: 0 three bezelled displays in a row, 1 one wide
  main display + two small, 2 two stacked tall panes + a lamp column, 3 a single wide bezelled plotter
  with a keyboard shelf. `screens` cycles `screenImp*` keys per display; `gloss` is the material key for the
  glossy panel skin (rooms pass `"impFloor"` tinted black to stay inside the 16-material budget).
* `impSeat({ pos, yaw, gloss })` — pedestal operator chair: base disc, column, tilted pan, backrest, armrests.
* `impLocker({ pos, yaw, w=0.6, h=2.0, d=0.5, status, label })` — louvred vents top and bottom, recessed
  pull handle, status lamp, optional lit stencilled `label` plate.
* `impBench({ pos, yaw, len=1.8, gloss })` — slatted seat on two dark legs with a foot rail.
* `deckPlacard({ pos, normal, w, h, title, sub, arrow: "←"|"→"|"↑"|"↓", accent, lit })` — black plate, accent
  bar, lit stencilled title, painted subtitle, optional arrow glyph. Wayfinding at eye level (centre 1.7 m).
* `sectionMarker({ pos, normal, text, accent, w=0.56, h=0.2 })` — small painted section label with accent bar.
* `statusBoard({ pos, normal, w, h, screens, title, legendRows, gloss, seed })` — 2×2 bezelled displays
  with a stencilled header and legend rows. Mount it wholly above the 2.1 m wall strip (bottom edge ≥ 2.3 m)
  so the strip runs continuous underneath; `impWall.stripGaps` is the fallback when it must sit lower.
* `matteScreens(base, roughness=0.42)` → `{ screenMatte0..3 }` — matte clones of the harness `screenImp0-3`
  (same textures) for the manifest hook `materials: (base) => ({ ...textMaterials(), ...matteScreens(base) })`.
  The stock screens are roughness 0.15 and mirror every ceiling pool as a white blob on wall-mounted
  displays; put the whole room on `screenMatte*` so the material count stays the same.
* `wallTerminal({ pos, normal, screen, accent, gloss })`, `ventPanel({ pos, normal, w, h, depth })`,
  `junctionDrop({ pos, normal, ceilY, accent, code })` — the corridor dressing items, usable on any wall.
* `firePoint({ pos, yaw, hazard=true })` — red cabinet with a stencilled FIRE POINT label; `hazard: false`
  drops the chevron plate (use one hazard treatment per room).
* `makeSignPlate(materials, { w, h, text, arrow, emissive, pos, normal })` → `{ group, material }` — lit
  plate with stencilled text for interactables (own material instance so the hover tint works).
* `floorDigit` — legacy 7-segment numeral; prefer `stencilDigit` from `text.js`.
* `Placer` places boxes/cylinders in a yawed local frame and gives AABB colliders. Local frames follow the
  player yaw convention: yaw `a` makes local −z face world `(−sin a, −cos a)`; a console's operator side is
  local +z, a locker's door local +z.

Rooms built with the kit so far: `src/hangar/{lobby,corridor-east,corridor-west,stairs,control}/`.
