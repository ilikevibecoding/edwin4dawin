# Workstream guide (read fully before writing code)

You are building one part of a Star Wars-inspired Imperial Star Destroyer in a Three.js (r185) + Vite
project. Everything is procedural: no downloaded models or textures, ever. Geometry is kit-bashed
from primitives through `Kit` and merged per material; textures are canvas-generated.

## Rules

1. Edit only the files assigned to you. Never edit `src/main.js`, `src/spec.js`, `src/cells.js`,
   `src/doors.js`, `src/kit.js`, `src/materials.js`, `src/rooms/imperial_kit.js` or another
   workstream's files. If you need a change there (a new material, a spec value, a helper), write it
   down in your final report under "Requests for the orchestrator" with the exact code you want.
2. You may create new files under your own directory / prefix (e.g. `src/rooms/bridge_*.js`,
   `src/exterior/greebles_*.js`). New textures go in your own `src/textures_<name>.js`; register a
   material by returning it from your builder and using `kit.materials[key] = material` **only** for
   keys prefixed with your workstream name (e.g. `bridge_holo`). Give every new lit material a light
   domain with `setDomain(material, "interior"|"exterior")` from `src/materials.js`.
3. Keep the design language: dark metallic structure, pale grey enamel wall panels with black trim,
   illuminated control panels, hard-edged architecture, practical machinery, hazard chevrons, cables,
   vents, pipes, railings, low-key lighting with red / blue / amber instrument accents. Star Wars
   Imperial, not generic sci-fi. Your room / area must still have its own purpose, layout, accent and
   atmosphere. No placeholder cubes, no empty walls, no obviously repeating filler.
4. Everything the player can reach must have colliders; everything walkable must have floors (`kit.floor`,
   `kit.ramp`, `kit.stairs`). Doors are built by the system; you must leave the openings (the shell
   helper does this from `ctx.doors`).
5. Performance: merge into as few materials as reasonable; use `kit.instance` for anything repeated
   more than ~8 times; declare lights as data with `kit.light` (max ~8 per room; the runtime pool has
   16 points + 3 spots shared by visible rooms); no per-frame allocations in `kit.onUpdate` callbacks.
6. Verify visually with the harness (below) at least twice, and fix what you see. Report with evidence.

## Project layout

```
src/spec.js               all dimensions, decks, rooms (ROOMS, ROOM_BY_ID), doors, HANGAR, TOWER, ENGINES…
src/kit.js                Kit: add/box/boxMM/cyl/collider/floor/ramp/stairs/light/instance/interactable/onUpdate/attach
src/materials.js          material keys (below), PALETTE, setDomain
src/textures.js           noise + texture generators (TexGen, fbm, worley, makeCanvas, toTexture…)
src/textures_imperial.js  Imperial textures, decal atlas: impDecalRect(IMP_DECAL.<name>)
src/rooms/imperial_kit.js Frame, wallFrame, ceilingFrame, floorFrame, roomWalls, openingsFor, impWall, impCeiling,
                          impFloor, impConsole, impChair, impRailing, impPillar, impWallGear, impWallLight,
                          impCrate, impRoomShell, impDefaultLights, lux
src/rooms/<room>.js       one builder per room: export function build<Room>(kit, ctx, room)
src/exterior/hull.js      lofted hull skeleton (EXT-A)   greebles.js / weapons.js (EXT-B)
src/fighters/tie.js traffic.js shuttle.js (FIGHTERS)
tools/shots.mjs           screenshot harness; tools/smoke.mjs load test
```

## Room builder contract

```js
export function buildBridge(kit, ctx, room) { ... }
```
* Coordinates are room-local: origin at the **floor centre**, `x` right (starboard), `y` up, `-z`
  forward (toward the bow). `room.size = [w, h, d]`; the clear interior spans `x ∈ [-w/2, w/2]`,
  `y ∈ [0, h]`, `z ∈ [-d/2, d/2]`. Walls sit on those bounds and are 0.4 m thick outward.
* `ctx.doors` = `roomDoors(room.id)`: `{ side: "N"|"S"|"E"|"W", lx, ly, lz, w, h, type, other }` in
  room-local coords. `N` is the -z wall. `ly` > 0 means a raised doorway (reach it with stairs).
* `ctx.materials` = the material library; `ctx.audio` = audio bus (`play(name, worldPos)`);
  `ctx.accentKey(room)` = emissive key matching `room.accent`.
* Start with `impRoomShell(kit, room, ctx.doors, opts)` (walls with door openings + floor + ceiling),
  or build your own shell with `impWall` / `Frame` when the room needs a special shape (pits, tiers,
  multi-level). A default walkable floor over the whole footprint is added for you; add
  `kit.floor` / `kit.stairs` / `kit.ramp` for raised platforms and pits (and a collider under any
  raised platform edge so the player cannot walk through it from below).
* Lights: `kit.light({ type: "point"|"spot", pos, color, intensity, distance, priority, target, angle, penumbra, shadow, dim })`.
  Use `lux(dropHeight)` for intensity (≈1.4·h²). One `shadow: true` spot per room max.
* Animation: `kit.onUpdate((dt, t) => ...)` runs only while the room is visible. Animated meshes
  must be created with `new THREE.Mesh(...)` and registered with `kit.attach(mesh)`; static geometry
  goes through `kit.add/box/cyl` (merged, cannot move).
* Interactables: `kit.interactable({ object, material, id, label, key: "E", onActivate: async ({hud}) => {...} })`.
* Screens: material keys `scrBlue0/1 scrRed0/1 scrAmber0/1 scrGreen0/1 scrWhite0/1` on a
  `PlaneGeometry` with `uv: "keep"` (see `Frame.screen`). Decals: `frame.decal(IMP_DECAL.x, u, v, n, size)`.

## Material keys

Imperial interior: `impPanel impPanel1 impPanel2` (pale enamel; tint with `color: PALETTE.impWhite|impGrey`),
`impTrim` (matte black), `impMetal impMetalRough` (brushed dark metal; tint `impGreyDark|impCharcoal|impGrey`),
`impDeck` (dark grid deck), `impGloss` (black gloss), `hexPanel`, `chevronY chevronR`, emissives
`emitBlue emitBlueSoft emitRedImp emitAmber emitWhite emitWhiteSoft emitGreen emitCyan`, `holo holoBright`,
`viewGlass`, `decalImp`, `field` (containment field), `glowDisc`, `leds`, Kestrel legacy keys
(`painted metal deck rubber fabric hazard glass decal emitTeal emitWarm emitOrange emitRed emitCool …`).
Exterior: `hullPlate hullPlate1` (tint `PALETTE.hullLight|hullMid|hullDark`), `hullGreeble` (tint
`hullTrench|hullDark`), `hullTrim`, `cityLights`, `engineGlow engineCore`, `extEmitWhite extEmitRed extEmitBlue`.
`PALETTE` has all named colours.

Vertex colour tints: pass `color:` in the kit call. UV modes: `uv: "world"` (default; `texel` = tiles per
metre), `"keep"` (geometry UVs, for screens / decals / diffusers), `"scale"` (+ `uvScale`).

## Verify

```sh
cd <your worktree>
npx vite --host 127.0.0.1 --port <your port> --strictPort   # in the background (tmux)
SHOT_QUICK=1 SHOT_VIEWS=room:bridge node tools/shots.mjs <tag> http://127.0.0.1:<port>/
#   -> shots/iter_<tag>/room_bridge.png  (+ results.json with draw calls / triangles / lights)
# free camera inside a room (world coords; interior cell logic on):
SHOT_QUICK=1 SHOT_VIEWS="cam:pits:-8/247.4/238:0/246.5/222:70:i" node tools/shots.mjs <tag> http://127.0.0.1:<port>/
# exterior free camera:  cam:label:x/y/z:lx/ly/lz:fov
node tools/smoke.mjs http://127.0.0.1:<port>/          # loads, prints page errors + build log
```
Rendering here is software GL (SwiftShader): ~2–3 s per frame is normal; frame times are not
performance numbers. Report draw calls, triangles and light counts from `results.json` instead.
World position of a room point: `room.origin + local`. Room origins / sizes: `node -e "import('./src/spec.js').then(m=>console.log(m.ROOM_BY_ID.bridge))"`.

## Report format (final message)

* Changed: files and what they contain.
* Tested: harness commands run, screenshot paths, draw calls / triangles / lights for your area, page errors.
* Left unfinished / known issues.
* Requests for the orchestrator (exact code).
