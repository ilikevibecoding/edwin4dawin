# Workstream brief — ISD Vigilance

Read this before touching any file. It is the contract between the integrator and the parallel
workstreams. `PLAN.md` has the ship model and coordinate system; this file has the rules.

## The ship in one paragraph

Imperial-class Star Destroyer, 1,600 m, bow at z = -800, stern at z = +760, forward = -Z, up = +Y.
Interior decks sit at their true positions inside the hull (`src/interior/layout.js`); rooms are
built in deck-local coordinates (floor at y = 0) by a builder `build<Name>(kit, ctx)` registered in
`src/interior/rooms/index.js` (any exported function named `build<Name>` in `src/interior/rooms/*.js`
is picked up automatically; the layout names the builder in lower camel case, e.g. builder
`"tactical"` → `export function buildTactical`).

## Ownership (do not edit files you do not own)

Shared, integrator-only: `src/main.js`, `src/materials.js`, `src/textures.js`, `src/kit.js`,
`src/interior/{layout,interior,sector,doors,turbolift,corridor,imperial,builders}.js`, `index.html`,
`src/style.css`, `tools/*`. If you need a change there, write it in your report ("Requested shared
changes") with the exact code; do not make it. Put helpers you need in your own files. Never edit
another workstream's files.

## Building a room

```js
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, impWall, impFloor, impCeiling, impConsole, impChair, wallScreen, equipmentRack, crate, pit, stairs, platform, railing, pipeRun, pillar, hologram, doorOpenings, wallSegment } from "../imperial.js";
import { pointLight, wallFrame, Frame, panelGrid } from "../builders.js";
import { rng } from "../../kit.js";

export function buildTactical(kit, ctx) {
  const [min, max] = ctx.bounds;         // deck-local clear interior volume
  roomShell(kit, ctx, { ... });          // floor + ceiling + 4 walls with door openings cut automatically
  impConsole(kit, ctx, { x, z, yaw, w: 2.2, screens: [0, 2], chair: true });
  ctx.light(pointLight(0x4a9dff, 3, 6, [x, 2.4, z]));   // registers a light (auto-hidden with the room)
  ctx.anim((dt, t) => { ... });          // per-frame hook, only runs while the room is visible
  ctx.mesh(object3d);                    // standalone / animated meshes (not merged)
  ctx.interactable({ object, material, id, label: "Activate", key: "E", action: async (api) => {...} });
  kit.collider([x0, y0, z0], [x1, y1, z1], "tag");   // extra AABB collider (deck-local)
}
```

- `ctx`: `{ kit, materials, sector, deck, bounds, doors, traffic, audio, floorY, seed, light, mesh, anim, interactable, audioZone, collider }`.
- `ctx.doors` are the layout door defs touching the room (`{a, b, pos:[x,z], wall:"x"|"z", w, h, style}`).
  The door frames and leaves are built by the door system; your walls only need the openings, which
  `impWall` / `roomShell` cut for you (`doorOpenings(ctx, side)` if you build a wall by hand).
  Keep a 2.5 m clear approach in front of every door.
- Wall sides are `"zmin" | "zmax" | "xmin" | "xmax"` of the bounds. `wallSegment(bounds, side)` gives
  `from → to` for `wallFrame` (see `src/interior/builders.js` for the local frame convention: U along
  the wall, V up, N into the room; panels sit at negative n).
- Kit materials (`kit.box("impPanel", ...)` etc.): `impPanel`, `impPanel1`, `paintedMetal`, `metal`,
  `metalRough`, `floorGloss`, `rubber`, `fabric`, `hazard`, `darkGloss`, `decal`, `grate`, `leds`,
  `emitWhite`, `emitWhiteSoft`, `emitBlue`, `emitRed`, `emitRedSoft`, `emitAmber`, `emitGreen`,
  `impScreen0..4` (blue tactical / blue engineering / blue navigation / red / amber), `holo`,
  `forceField`, `bridgeGlass`, plus the Kestrel set (`painted*`, `deck`, `screen0..3`, `emitTeal`…).
  Tint with `{ color: PALETTE.impGrey }`; use `uv: "keep"` for painted panels and screens.
- Colliders: the player is a 0.32 m radius capsule, eye 1.7 m, steps up 0.45 m. Every solid the
  player could walk into needs `kit.collider(...)` (consoles, racks, crates via the helpers already
  do). Pits: use `pit()`; raised floors: `platform()` + `stairs()`.
- Custom materials: create once, guarded, and register on `ctx.materials` with a unique prefix:
  `if (!ctx.materials.tac_holoRing) ctx.materials.tac_holoRing = new THREE.MeshBasicMaterial(...)`.
  Use `makeCanvas`/`toTexture`/`fbm` from `src/textures.js` for procedural textures. No external
  assets, no downloads.
- Room-name and deck signage: stencil decals (`decalRect(i)`), `wallScreen`, lit lettering boxes.

## Design language (Imperial)

Dark polished black deck (`floorGloss`), light grey bevelled panels with black seams, recessed white
light strips, black consoles with blue readouts (red for alerts / detention / security, amber for
engineering), hard edges, chamfers, no curves except pipes / tanks / domes. Warning stripes are
sparse and purposeful. Each room needs: a clear purpose readable at a glance, one dominant light
colour that differs from its neighbours, practical machinery, cables / conduits / vents, storage,
signage, wear (scuffs, grime in corners, mismatched replacement panels), and human-scale props
(chairs, railings 1.05 m, consoles 0.95 m, doors 2.6–3.4 m). No empty walls, no empty floors, no
copy-paste rows without variation, nothing floating, nothing intersecting the doorways.

## Budgets (per room, measured with `debugAPI.getStats()`)

- ≤ 160k triangles and ≤ 40 draw calls per ordinary room; bridge ≤ 400k / 60; hangar ≤ 600k / 80
  (the hangar's TIE fighters are instanced and not counted against it).
- ≤ 6 point/spot lights per ordinary room (`ctx.light`), ≤ 10 bridge, ≤ 10 hangar; at most one
  shadow-casting spot per room. `impCeiling` already adds a budgeted grid; pass `lights: false` if
  you place your own.
- Textures you create: ≤ 1024², prefer 512² or smaller; reuse the shared sets.
- Animated meshes (`ctx.mesh`) are separate draw calls: keep them few (≤ 8).

## Testing (mandatory, this VM has software WebGL — screenshots take 10–40 s each)

1. In your worktree: `ln -s /workspace/node_modules node_modules` if `node_modules` is missing.
2. Start a dev server on your assigned port in tmux:
   `tmux -f /exec-daemon/tmux.portal.conf new-session -d -s <name> -c "$PWD" -- bash -lc 'npx vite --host 127.0.0.1 --port <PORT> --strictPort'`
3. Screenshot: `node tools/check.mjs http://127.0.0.1:<PORT>/ --w 960 --h 540 --out /tmp/shots/<name> --views <view,view,...>`
   Views: names from `src/main.js` `INTERIOR_VIEWS` / `exterior.stations`, or ad hoc:
   `<sectorId>@x,z,yawDeg,pitchDeg` (deck-local, e.g. `d2_tactical@-12,-16,-90,-5`) and
   `ext@px,py,pz,lx,ly,lz` for the exterior. Look at every PNG with the Read tool and fix what you see.
4. `--eval "debugAPI.walkTo(x, z, 6)"` moves the player with the real controller (collision test);
   `--eval "debugAPI.current()"` prints the current sector and visible set.
5. Check the console: the tool prints page errors; there must be none from your files.
6. Verify budgets from the printed stats.

## Reporting (final message)

- What was built (per room / per feature), with the screenshot paths you checked.
- Measured stats per view (calls, triangles, lights).
- Known gaps and anything unfinished, honestly.
- Requested shared changes (exact code) if any.
- Files changed (must be only your own).
