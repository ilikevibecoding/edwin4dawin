# Contributor guide for the Star Destroyer workstreams

Read this before touching a room, the hull, the hangar or the fighters. It is the contract that lets
many people (or agents) build one coherent ship in parallel.

## Ground rules

- Everything is procedural and original: no downloaded models, textures, fonts or sounds. Build with
  primitives + the procedural texture generators. Do not copy proprietary Star Wars assets or text.
- Edit only the files you own (listed in your task). Never edit `src/config/shipSpec.js`,
  `src/interior/registry.js`, `src/interior/rooms/index.js`, `src/main.js`, `src/kit.js`,
  `src/interior/lib.js`, `src/interior/shell.js`, `src/materials.js`, `src/textures.js` unless your
  task explicitly owns them. If you need a shared change, describe it in your report instead.
- Units are metres, ship forward is -Z, up +Y. Read `src/config/shipSpec.js` for every room's bounds,
  deck floor height (`roomFloorY(room)`), doors and windows. Rooms are axis-aligned boxes
  `{x0,x1,z0,z1,height}`; `room.doors` are `[x, z, width, facing, height?]` where `facing` is the outward
  wall normal ('+x','-x','+z','-z'). Leave those openings free: the door frames and sliding leaves are
  added automatically by the registry (`DoorSystem`) *after* your builder runs.
- Performance budgets per view: <= 300 draw calls, <= 1.5 M triangles, <= 20 active lights (pooled
  automatically), no per-frame allocations in update loops. Merge geometry through the Kit (one mesh per
  material per room). Prefer `InstancedMesh` for anything repeated more than ~20 times.
- Every room must be walkable from its doors: keep a clear 1.2 m path, add colliders for anything the
  player could walk into (`kit.collider(min, max, tag)`), and walkable surfaces for anything the player
  can stand on (`kit.floor(...)`, `kit.stairs(...)`). Risers <= 0.4 m are stepped automatically.
- No text in code comments narrating what the code does; explain intent only.

## Building blocks

```js
export function build(kit, ctx, room, lib) { ... }   // signature of every room builder
```

- `kit` (`src/kit.js`): `kit.box(mat, cx, cy, cz, sx, sy, sz, opts)`, `kit.boxMM(mat, [x0,y0,z0], [x1,y1,z1], opts)`,
  `kit.cyl(mat, cx, cy, cz, r, len, axis, opts)`, `kit.add(mat, geometry, { pos, rot|quat, color, uv, texel, uvRect })`,
  `kit.collider(min, max, tag)`, `kit.floor(x0, z0, x1, z1, y, extra)`, `kit.stairs(mat, x0, z0, x1, z1, y0, y1, axis)`.
  `opts.color` tints (vertex colours), `uv: "world"` (default, `texel` = tiles per metre) or `"keep"`.
- `lib` bundles `src/interior/lib.js` + `src/interior/shell.js` helpers: `Frame` (build on a wall plane:
  `frame.box(mat, u, v, n, su, sv, sn, opts)`, `frame.cylU/cylV/cylN`, `frame.collider(...)`),
  `wallFrame(kit, [x,z], [x,z], baseY)`, `ceilingFrame`, `panelGrid(frame, length, height, opts)` (the
  wall system, supports `openings`, `rows`, `styles`, `paints`), `porthole`, `pointLight(color, intensity,
  distance, [x,y,z])`, `windowSpot`, `roomShell(kit, ctx, room, opts)`, `roomWalls`, `wallLightBar(frame,
  u0, u1, v)`, `wallConsole(frame, u, width, screenMat)`, `IMPERIAL_STYLES`, `IMPERIAL_PAINTS`,
  `DARK_PAINTS`, `PALETTE`, `DOOR_H`, `WALL_T`.
- `roomShell` options: `style: "light"|"dark"`, `skipWalls: ["-z"]` (build that wall yourself),
  `openings: { "-z": [{u0,u1,v0,v1,type:"door"|"porthole"}] }`, `ceiling: false`, `floor: false`,
  `floorColor`, `lightMat`, `lightRows`, `lights: false` (then add your own via `ctx.lights`).
  It returns `{ y0, yTop, frames, w, d }` with `frames["-z"|"+z"|"-x"|"+x"] = { frame, length }`; frame
  normals point into the room, `u` runs left to right as seen from inside, `v` up from the floor.
- Lights: push template lights into `ctx.lights.warm / cool / teal` (PointLight) or `ctx.lights.spots`
  (SpotLight with target). They are *fixtures*: the LightPool renders the nearest 14 points + 3 shadowed
  spots. Give each room 3-10 fixtures, intensities ~2-8 (candela-ish after the 0.8 scale in `pointLight`).
- Crew hooks: `kit.marker("seat" | "station" | "idle" | "spawn" | "waypoint", [x, y, z], yawRadians, { id })`
  records where future NPCs sit, stand or idle (no characters are added now). Register one per seat /
  console; the registry exposes them via `interior.navData(zone).markers`.
- Interactables: `ctx.interactables.push({ id, key: "E", label: "Open locker", object: mesh, material,
  freeze: false, action: async ({ hud }) => {...} })`. `object` must be a Mesh/Group added to the scene by
  you (not merged into the kit) with its own material instance (the hover highlight edits emissive).
- Materials (keys for `kit`): `painted painted1 painted2 metal metalRough paintedMetal deck grate rubber
  fabric hazard satinBlack darkGloss glass decal leds emitTeal(blue-white) emitWarm(amber) emitOrange
  emitRed emitCool(white) emitBlue emitAmber emitWhite emitWarmSoft emitCoolSoft emitBlueSoft emitRedSoft
  emitWhiteSoft emitAmberSoft screen0..screen3 (blue-white UI) screen4 (blue tactical) screen5 (red alert) screen6
  (amber engineering)`. Tint painted/metal/fabric/deck with `color: lib.PALETTE.x`.
- `PALETTE`: `cream` (light grey-white panel), `creamDark`, `orange` (dark red accent), `tealPaint`
  (blue-slate), `slate`, `gunmetal`, `darkMetal`, `steel`, `impWhite`, `impGrey`, `impGreyDark`,
  `impBlack`, `impRed`, `impBlue`, `impAmber`, fabrics `fabricCream/fabricTeal/fabricOrange`.
- Animated / moving things: build them as separate `THREE.Mesh`/`Group` objects (clone a material), add
  them to `ctx.group` if provided or return them via `ctx.dynamic.push({ object, update(dt) })`; the
  registry calls `update(dt)` for the active zone only.

## Design language (Imperial)

Hard-edged, functional, intimidating. Light grey-white wall panels with black kick/trim bands, dark
grey decks, satin-black consoles with blue-white / red / amber instrument light, recessed white light
channels, grated pits, railings, cable trays, pipe runs, hazard chevrons used sparingly, stencilled unit
markings. Each room keeps the shared shell and adds one accent colour, its own light level and its own
purpose-driven equipment (see `room.accent` and `room.purpose`). No two rooms should feel like the same
room with different furniture. Nothing should look unfinished: no bare shells, no empty walls longer than
~4 m without a fixture, panel, vent, pipe or console.

## Testing your work

```bash
npm ci                                     # once per worktree
npx vite --host 127.0.0.1 --port 51XX &    # pick a port unique to your task
node tools/check.mjs --base http://127.0.0.1:51XX/ --out /tmp/myshots room:bridge room:comms
node tools/verify.mjs --base http://127.0.0.1:51XX/          # navigation / systems checks
```

`tools/check.mjs --list` prints every view. Views named `room:<id>` stand just inside the room's first
door looking at the room centre; you can teleport anywhere with `window.debugAPI.teleport(x, z, yawDeg,
pitchDeg)` from a Playwright script if you need another angle (copy `tools/check.mjs`). Look at the
JPEGs, fix, repeat. The build machine renders with software WebGL (slow frames, correct pixels): judge
lighting, scale, density and readability from the images, not frame rate.

Add your room's key view(s) to the report as image paths. Report format:

```
## <workstream>
Changed: files
Built: what exists now, room by room / feature by feature
Tested: commands run, views inspected, verify.mjs result
Measured: draw calls / triangles for your views (from check.mjs output)
Unfinished / known issues:
Requests for shared files (spec, registry, materials):
```
