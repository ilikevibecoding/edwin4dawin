# Northstar Rescue — architecture summary

Owner: **Opus 1**.

## One-command start

```bash
npm install
npm start          # → http://127.0.0.1:5173/
```

`npm start` runs Vite with `--host 127.0.0.1 --port 5173 --strictPort`. Nothing is
fetched from the network at runtime, so the game also works fully offline.

Useful query parameters:

| Parameter | Effect |
| --- | --- |
| `?quality=low\|medium\|high\|ultra` | Force a quality preset (bypasses saved settings) |
| `?autostart=1` | Skip the menus and deploy straight into the mission |
| `?difficulty=recruit\|operator\|veteran\|blackout` | With `autostart` |
| `?loadout=breacher\|assault\|infiltrator\|marksman` | With `autostart` |
| `?qa=1` | Enable the development QA overlays |
| `?sens=`, `?fov=` | Override sensitivity / field of view |

Production build: `npm run build` then `npm run preview`.

## Layer diagram

```
                       ┌───────────────────────────────┐
   index.html ───────► │  src/main.js                  │  boots, installs test hooks
                       └───────────────┬───────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │  src/core/game.js  (Game)     │  state machine + fixed step
                       └──┬────────┬────────┬──────┬───┘
             ┌────────────┘        │        │      └─────────────┐
             ▼                     ▼        ▼                    ▼
      core/engine.js        core/input.js  ui/hud.js       core/qa.js
      renderer + post       pointer lock   ui/menus.js     core/testing.js
             │                     │
             ▼                     ▼
      ┌──────────────────────────────────────────────────────────────┐
      │ map/level.js — build order is load-bearing                    │
      │   1 map/shell.js   walls/floors/ceilings/stairs/roofs         │
      │   2 map/glass.js   individually breakable panes               │
      │   3 map/lighting.js fixtures + pooled emitters                │
      │   4 props/dress.js  944 placements from props/library.js      │
      │   5 map/doors.js    44 doors with hardware and states         │
      │   6 map/nav.js      navigation grid probed from collision     │
      └──────────────────────────────────────────────────────────────┘
             │                                   │
             ▼                                   ▼
      map/collision.js                    mission/mission.js
      AABB grid + BVH rays                ai/enemy.js · ai/hostage.js
             ▲                                   │
             └──────── player/controller.js ◄─────┘
                       player/combat.js
```

## Key decisions and why

**All assets are generated in code.** Textures are painted with Canvas2D, models
are built from `BufferGeometry`, audio is synthesised in WebAudio. There is no
asset pipeline, no fetch at runtime, nothing to 404, and every byte is original.
The cost is a ~20 s procedural build on first load, which the loading screen
covers, and a fixed VRAM budget that the texture foundry manages centrally.

**Walls are derived, not placed.** `src/map/layout.js` declares rooms as
rectangles that tile the building footprint. `src/map/shell.js` samples every
rectangle edge at 0.25 m, asks what lies on each side, and emits a two-skin wall
(each face carrying the finish of the room it faces) carved by the openings
table. A gap in the shell would require two adjacent rectangles to disagree about
a shared edge, which the room table makes impossible. It also means each face of
every wall automatically has the correct finish.

**Static geometry is batched by (spatial cell, material).** The first
implementation merged by material alone, which produced ~76 map-spanning meshes
and therefore zero frustum culling: every triangle in the building was submitted
every frame (2 923 draw calls, 1.7 M triangles in the lobby). Partitioning into
12–24 m cells first restores culling while keeping the merge benefit — the same
view now costs 353 draw calls and 86 k triangles.

**Simulation is fixed-step at 120 Hz** with an accumulator. `advanceTime(ms)`
runs the identical stepping code, which is what makes Playwright runs reproduce
real play exactly. One-shot input edges are cleared after each step, because
leaving them set for a whole frame made a single keypress act several times.

**The first-person view model lives in its own scene** rendered by a second
camera after a depth clear. Arms and weapons therefore cannot clip world
geometry or be cut by the world near plane, which removes an entire class of
defect without per-frame depth tricks.

**Character hits use per-bone spheres, not mesh rays.** `raycastHitboxes()`
tests analytic spheres attached to bones. It is exact enough for a tactical
shooter, cheap enough to run for every pellet of a shotgun blast, and it keeps
characters out of the static BVH so the BVH never needs rebuilding.

**Navigation is probed from the finished collision world**, not derived from the
room table. Each 0.4 m column collects every solid top with head clearance, and
neighbouring nodes link when the step between them is climbable. Stairs become
ordinary navigation with no hand-authored links, and a route blocked by a prop is
genuinely blocked.

## `render_game_to_text()` schema

Returns a JSON string. Top level:

| Field | Meaning |
| --- | --- |
| `schema` | `northstar-rescue/state@1` |
| `coordinateSystem` | Convention, unit, yaw/pitch definition, floor heights |
| `gameMode` | `boot` `menu` `loading` `playing` `paused` `victory` `defeat` |
| `paused`, `menuScreen`, `levelReady` | Flow state |
| `frame`, `simTimeSeconds`, `fps` | Timing |
| `difficulty`, `loadout` | Selected options |
| `consoleErrors` | Count of captured errors |
| `player` | position, eye, yaw/pitch, view yaw/pitch (with recoil), recoil, velocity, speed, health, armour, movement state, grounded, crouched, leaning, floor, ground surface, alive, room |
| `weapon` | active weapon, slot, magazine, magazine size, reserve, reloading + progress, aiming, ADS factor, spread degrees, utility stock, grenades in flight, shot statistics |
| `mission` | state, objective (id/title/detail/step/total), timer, alarm, difficulty, hostages, extraction, enemies (total/alive/alerted/inCombat/list) |
| `nearbyDoors` | id, kind, state, open amount, position, passable, distance |
| `interactables` | kind, verb, distance, id, key |
| `victory`, `defeat` | Booleans |
| `stats` | Mission summary |
| `render` | draw calls, triangles, programs, geometries, textures, pixel ratio, viewport |

Per-hostage: `id, name, state, alive, health, discovered, position, room, floor,
inExtractionZone, distance`.
Per-enemy: `id, variant, alive, health, state, awareness, position, yaw, room,
weapon, magazine, distance, hasLineOfSight`.

## `window.advanceTime(ms)`

Steps the simulation deterministically in 1/120 s increments, clears input edges
per step, then updates the HUD and renders once. Returns `{ steps, seconds }`.

## QA namespace — `window.__northstar.qa`

`teleport(checkpointOrRoomOrXYZ)`, `checkpoints()`, `giveWeapon(id)`,
`giveAmmo(n)`, `godMode(bool)`, `spawnEnemy(roomOrPos, variant)`, `killAll()`,
`freezeAI(bool)`, `setLighting(scenario)`, `lightingScenarios()`,
`openDoor(id, bool)`, `unlockAllDoors()`, `breakGlass(i)`, `resetMission()`,
`setObjective(idOrIndex)`, `secureHostages()`, `forceVictory()`,
`forceDefeat()`, `showCollision(bool)`, `showNav(bool)`, `showAssetIds(bool)`,
`openGallery(assetId)`, `closeGallery()`, `galleryList()`, `screenshotState()`,
`report()`, `setNoclip(bool)`.

None of these draw UI unless called. `?qa=1` only sets a flag; the player build
has no debug overlay.

## Performance summary

Measured under Chromium with SwiftShader software rasterisation (no GPU), which
is roughly two orders of magnitude slower than real hardware. Structural numbers
are the meaningful ones.

| Metric | Value |
| --- | --- |
| Level build | ~20 s (procedural textures, geometry, batching, navigation) |
| Static triangles | ~1.01 M (shell 233 k, props 693 k, fixtures 42 k) |
| Static batches | ~1 100 across three groups, spatially partitioned |
| Collision AABBs | 949 in a 4 m uniform grid |
| Navigation nodes | ~46 700 active on a 0.4 m multi-level grid |
| Draw calls, measured across twelve interior viewpoints | 192 (courtyard) – 1 353 (server room), median ~700 |
| Triangles submitted, same twelve viewpoints | 43 k – 832 k, median ~500 k |
| Worst case | Server room: looking through the interior glass partition down the mid-block corridor with no occlusion culling |
| Texture memory | ~110 MB (base colour at authored size, data maps halved) |
| JS heap in play | ~215 MB |
| Quality presets | low / medium / high / ultra with shadow, light, particle, decal, clutter and resolution scaling |

The quality ladder exists precisely so weak hardware has somewhere to go: `low`
disables sun shadows, drops to five dynamic lights, 0.75 resolution scale, halves
base-colour textures and thins small clutter to 35%.
