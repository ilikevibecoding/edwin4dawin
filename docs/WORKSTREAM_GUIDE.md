# Workstream guide (read fully before touching code)

You are building one part of the ISD *Redoubt*, a Star Wars-inspired Imperial Star Destroyer demo in
Three.js (Vite, ES modules, everything procedural — no external assets, no downloads). `PLAN.md` is the
contract: coordinates, room boxes, doors, design language, budgets. This file explains how to work.

## Environment

```sh
ln -s /workspace/node_modules node_modules      # in a worktree: reuse the installed dependencies
npx vite --host 127.0.0.1 --port <PORT> --strictPort   # run in tmux; pick a unique port (see your brief)
node tools/view.mjs <view>[,<view>] shots/<yourstream> --url=http://127.0.0.1:<PORT>/   # screenshots
node tools/navtest.mjs http://127.0.0.1:<PORT>/                                            # regression
npx vite build                                                                             # must pass
```

- Only software GL (SwiftShader) exists here: a 960×540 frame takes 0.5–2 s. `frameMs` in stats is *relative*
  only. Judge performance by `calls`, `triangles`, `visibleLights`, `visibleObjects`, geometry memory.
- `tools/view.mjs` views: named (`bridge`, `hangar`, `ext_far`, `room_<id>` for every room) or inline:
  `int:x,y,z:yaw,pitch` (player feet position, degrees; yaw 0 looks toward −Z / the bow) and
  `ext:x,y,z:tx,ty,tz` (exterior camera position + look target). Add `--nudge=dx,dz` to walk with collision,
  `--sim=seconds` to advance doors/lifts/animators. Always look at your screenshots (Read the PNGs).
- Keep the world frame: `+X` starboard, `+Y` up, `−Z` forward. Metres. Human scale matters everywhere.

## Room contract (`src/core/room.js`)

Your room module exports `build(ctx)`. `ctx` gives you:

| member | meaning |
|---|---|
| `ctx.kit` | `Kit` — `box/boxMM/cyl/sphere/add(mat, geo, opts)`, `proto/place` (instancing), `collider(min,max,tag)`. All geometry is merged per material at the end: use it for everything static. |
| `ctx.def`, `ctx.box`, `ctx.inner` | room record (`box` nominal `[x0,x1,z0,z1]`, `inner` = box shrunk by 0.25 m = where wall faces are), `ctx.floor`, `ctx.h`, `ctx.ceil`, `ctx.accent` |
| `ctx.wall(side)` | `{frame, length, height, openings}` for `zmin|zmax|xmin|xmax` (U runs left→right seen from inside, N points into the room). Feed `openings` to `panelGrid` so doors/windows are carved. |
| `ctx.ceilingFrame()` | `{frame, w, d}` facing down |
| `ctx.shell(opts)` | floor slab + collider, ceiling with light channels, four panelled walls with openings carved. `opts.walls.zmin = false` skips a wall you build yourself; `opts.walls.zmin = {...}` passes panelGrid options. `skipFloor`, `ceiling:false`, `floorMat`, `floorColor`, `pilasterEvery`, `stripSpacing`, `wallStyles`. |
| `ctx.light(color, intensity, distance, pos)` / `ctx.spot(...)` | lights culled with the room. Budget: ≤ 8 point lights per room, ≤ 1 shadow-casting spot. Hang lights 0.4–0.8 m below fixtures. |
| `ctx.collider(min, max, tag)` | AABB. The player is a 0.32 m radius, 1.85 m capsule; steps ≤ 0.48 m are climbed automatically, anything taller blocks. Floors must be colliders (shell does this). |
| `ctx.interactable({object, material, id, label, key:'E', action?})` | raycast hover + prompt. Without `action`, `kind: 'bunk'|'mess'|'refresher'` runs the built-in sleep/eat/wash flows. |
| `ctx.animate((dt, t) => …)` | runs while the room is visible (screens, machinery, holograms). Keep it cheap. |
| `ctx.add(object3d)` | for animated meshes / shader effects (rare — prefer the kit). |
| `ctx.props` | the shared prop library (below). `ctx.IMP` palette, `ctx.rand()` seeded RNG. |

Doors are built by `DoorSystem` from `layout.js`: never build door slabs yourself; do carve the opening
(`ctx.wall(side).openings` already contains it). Door kinds `arch`/`open` are permanent openings.

## Helpers (`src/core/frame.js`, `src/core/props.js`)

- `panelGrid(frame, length, height, opts)`: Imperial wall system. Styles `plate/panel/vent/hatch/pipes/screen`,
  automatic kick, light bands (any row < 0.35 m tall), cornice, `pilasterEvery`, `accent` emissive key,
  `tints`, `rows`, `panelW`, `depth`, `collide`, `tag`. `imperialRows(h)` gives good default rows.
- `imperialCeiling(frame, w, d, {stripSpacing, dir})`, `pilaster`, `porthole`.
- Props (all take `kit` and world positions, `yaw` about +Y, 0 faces −Z): `consoleStation`, `chair`,
  `holoTable`, `pillar`, `railing`, `stairs` (returns `{top}`; each step is a collider), `crate`,
  `cargoContainer`, `barrel`, `pipeRun`, `cableBundle`, `doorFrame`, `computerBank`, `emblem`,
  `floorGrate`, `ceilingStrip`, `wallPanel(kit, frame, u, v, …)`, `lockerRow(kit, frame, u0, n)`, `bunk`.
  `Placer(kit, pos, yaw)` gives you `box/boxMM/cyl/add/decal/collider` in a local rotated frame.
- Atlases: `screenRect(i)` / `ledRect(i)` (0..15) with `uv:'keep', uvRect` on `screen` / `leds`;
  `DECAL.*` + `decalRect(i)` for stencils (`EMBLEM`, `RESTRICTED`, `HAZARD_BAND`, `DECK_A`, `NUMBER0..3`,
  `ARROW`, `TEXT_A/B/C`, `WARNING`, `SPEC_PLATE`, `BAY_CODE`, `EMBLEM_RED`).

## Materials (`src/materials.js`, tint with vertex colour via `color:`)

`plate` (interior plating), `paintedMetal` (dark structural steel, dielectric), `metal`, `metalRough`,
`deckBlack`, `deckGrey`, `hull`, `hullDark` (exterior), `rubber`, `fabric`, `hazard` (yellow/black),
`hazardRed` (red/white), `grate` (cut-out quad), `darkGloss`, `glass`, emissives `emitWhite`,
`emitWhiteSoft` (diffuser, uv 'keep'), `emitWarmSoft`, `emitRed`, `emitBlue`, `emitAmber`, `emitGreen`,
`emitCyan`, `emitViolet`, `engineGlow`, atlases `screen`, `leds`, `decal`, `holo` (additive), `field`
(animated containment shader). Do not add materials to `materials.js` (shared file) — if you truly need a
new material, create it inside your module and add the mesh with `ctx.add(new THREE.Mesh(...))`.

## Design language (non-negotiable)

Dark durasteel plating, black gloss or grey decks, recessed white light strips, black control panels with
red/blue/amber indicator matrices, angular trapezoid door frames, hazard bands, Aurebesh-style stencils and
the cog emblem, hard-edged architecture, practical machinery, cables/pipes/vents, functional wear. Each room
owns an accent (`ctx.accent`) and a purpose; nothing is a random filler. Human scale: consoles ~1.0 m, chairs
0.5 m seat, railings 1.05 m, doors 2.4–3.6 m, corridors 4.5 m tall. Nothing empty, duplicated, obviously
procedural, or floating. Every surface a player can stand near needs secondary detail (seams, bolts,
stencils, indicator clusters). Sightlines and practical circulation (2 m clear paths) matter.

## Budgets (per room, visible set is current + neighbours)

≤ 150k triangles for ordinary rooms, ≤ 400k for the bridge / hangar / reactor; ≤ 8 lights; shadow spot ≤ 1;
build time ≤ 400 ms per room (`rooms.stats().buildTimes` / `buildMs`); no new textures > 1024².
Prefer `kit.proto/place` for anything repeated more than ~6 times.

## Files you may edit

Only the files listed in your brief. Never edit `src/core/*`, `src/systems/*`, `src/materials.js`,
`src/textures.js`, `src/main.js`, `src/rooms/index.js`, `PLAN.md`. If you need a core change, describe it
precisely in your report (function, signature, why) instead of making it — the lead integrates core changes.

## Reporting (final message)

1. What you built (per room / feature), with the screenshot paths you checked.
2. Measured stats per view (`calls`, `triangles`, `visibleLights`, `buildMs`).
3. What you tested (`navtest`, walking, doors, interactions) and results.
4. What remains unfinished / known issues / requests for core changes.
Commit your work on your branch with clear messages; do not merge.
