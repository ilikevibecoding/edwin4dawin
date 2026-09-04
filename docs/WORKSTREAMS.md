# ISD Vigilant — workstream guide

This is the contract every workstream builds against. Read it fully before writing code.

## The ship in one paragraph

An Imperial I-class Star Destroyer, 1,600 m long, built entirely in code (Three.js, no external
assets). World units are metres. Forward is **-Z** (bow at z = -800, stern at z = +800), +Y is up,
x = 0 is the centreline, the knife-edge plane is y = 0. Every dimension lives in
`src/config/layout.js`: hull profile functions (`halfWidth(z)`, `dorsalY(z)`, `keelY(z)`), terraces,
tower, engines, reactor bulb, hangar wells, interior clusters, room boxes, doors, lifts, spawns.
**Never hard-code a coordinate that the layout already defines** — import it.

Four interior clusters, each streamed as a unit, connected by turbolifts:

| cluster | floor y | rooms |
|---|---|---|
| tower (Bridge Deck) | 190 | bridge, corridorT, holo, comms, intel, briefing, liftLobbyT, observation |
| crew (Deck 7) | 50 | spineC, crossC, liftLobbyC, crewQuarters, officersQuarters, mess, lounge, medbay, armory, detention |
| eng (Deck 12) | 8 | liftLobbyE, reactor, engControl, hyperdrive, corrEW, corrEE, spineE, lifeSupport, maintenance, cargo |
| hangar (Deck 19) | -20 | liftLobbyH, hangar (+ flightControl booth), fighterMaint, shuttleBay, escapePods |

Room boxes are `[x0, z0, x1, z1]` on the cluster floor with clear height `h`. Adjoining rooms share a
plane; each room owns a 0.25 m wall inside its own box. Doors (`DOORS` in the layout) are built by the
framework in the shared plane — rooms only have to **leave the opening** (`buildShell` does this).

## Architecture (who owns what)

```
src/main.js                 orchestrator (loop, debug API)            — integration lead only
src/config/layout.js        all dimensions                           — integration lead only (ask for changes)
src/kit.js                  geometry batching, loft/prism/instanced   — shared, additive changes only
src/core/*                  frame, zone streaming, light pool, perf, audio, sync
src/materials/imperial.js   material library + palette (IMP)         — additive changes only
src/interior/impKit.js      shared Imperial props                     — additive changes only
src/interior/shell.js       room shells                               — read only
src/interior/doors.js, lifts.js, corridors.js                        — read only
src/interior/rooms/<cluster>/*.js   room builders                     — the cluster's workstream
src/exterior/hull.js        hull skeleton                             — exterior workstream
src/exterior/greebles.js    exterior detail                           — exterior workstream
src/hangar/tie.js, shuttle.js, traffic.js                            — hangar/fighter workstream
tools/shot.mjs              screenshot CLI                            — shared
```

Rule: a workstream edits only files in its own area plus **additive** helpers in `impKit.js` /
`imperial.js` (new exported functions / new material keys, never changing existing ones).

## Building a room

```js
// src/interior/rooms/tower/holo.js
import { buildShell } from "../../shell.js";
import { console as impConsole, chair, holoTable, ceilingLight, pointLightDesc, railing, ... } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { STD } from "../../../config/layout.js";

export function buildHolo(kit, ctx) {
  const { room, floorY: y } = ctx;           // room = layout spec; ctx.id = "holo"
  const [x0, z0, x1, z1] = room.box;
  buildShell(kit, ctx, ctx.id, room, {       // floor + ceiling + 4 walls with door openings + colliders + walkable
    wall: { pitch: 4, tone: IMP.wallMid, bandMat: "lightBand" },   // impWall options
    ceiling: { lightPitch: 5 },
    floor: { mat: "impGloss", tone: IMP.white },
    skip: [],                                // e.g. ["ceiling"] to build your own
    extraOpenings: { north: [{ type: "window", u0: 4, u1: 9, v0: 1.0, v1: 2.6 }] },
  });
  holoTable(kit, ctx, [(x0 + x1) / 2, y, (z0 + z1) / 2], 2.0, { content: "ship" });
  ...
  ctx.view("holo", (x0 + x1) / 2, y + STD.eye, z1 - 2, 0, -6);   // camera view for the screenshot harness
}
```
Register it in your cluster's `index.js`: `registerRoom("holo", buildHolo)`.

### ctx API
- `ctx.id`, `ctx.room` (layout spec), `ctx.floorY`, `ctx.mats` (material library), `ctx.kit`
- `kit.box / boxMM / cyl / add / instanced / collider / object` — see `src/kit.js`. Everything added
  through the kit is merged into one mesh per material key (one draw call each).
- `pointLightDesc(ctx, color, intensity, distance, [x,y,z], priority)` and `spotLightDesc(...)` — light
  *descriptors*; the light pool turns the 12 best into real lights. Budget: ≤ 12 per room, priority 2
  for the room's key light, 1 for fills, 0 for accents. `ceilingLight()` adds a fixture + descriptor.
- `walkable(ctx, x0, z0, x1, z1, y)` / `ramp(...)` / `stairs(...)` / `catwalk(...)` — surfaces the
  player can stand on (pits, platforms). The shell adds the room floor.
- `ctx.add(object3D)` — dynamic objects (animated props, own materials). `ctx.animate((dt, t) => …)`
  runs only while the room is visible.
- `ctx.interactables.push({ object, material, id, label, key: "E", onActivate(api, item) })` — the
  object needs its **own material instance** (the highlight tints `material.emissive`).
- `ctx.view(name, x, eyeY, z, yawDeg, pitchDeg)` — named camera for `tools/shot.mjs --view name`.
  yaw 0 looks toward -Z, +90 toward -X. Add 2–4 views per room covering its best angles.
- `ctx.portal(otherRoomId)` — declare an always-open connection (no door) for visibility culling.

### Materials (keys for the kit)
Structure: `impPanel`, `impPanel1` (light panels, tint by `color`), `impPaintedMetal` (dark painted
steel: ribs, trim, consoles), `impMetal`, `impMetalRough`, `hullPlate`, `hullDark`. Floors: `impDeck`
(dark plates), `impGloss` (black gloss), `impGrate`. Soft: `impRubber`, `impFabric`. Glass: `glass`,
`glassDark`, `darkGloss`. Emissive: `emitRed`, `emitBlue`, `emitAmber`, `emitGreen`, `emitWhite`,
`emitWarm`, `emitEngine`, `emitHolo`, `lightBand`, `lightBandWarm`, `lightBandRed`, `lightSoft`,
`leds`, `blink`, `blinkSparse`, `blinkDense` (animated indicator grids — use `uv: "keep"`),
`screen0..4` (animated tactical displays, 3/4 red-alert variants — `uv: "keep"`), `holo`, `holoWire`,
`beam`. Decals: `impDecal` (16-cell Aurebesh-style stencil sheet, `uvRect: impDecalRect(i)`),
`deckMarks` (hangar deck markings, `deckMarkRect(i)`), `hazard`. Palette: `IMP.*` in
`src/materials/imperial.js`.

## Design language (non-negotiable)
Imperial: light-grey panelled walls framed in black ribs, recessed white light bands, black gloss or
dark ribbed decks, hard edges, red/blue/amber/white indicator lights, blue tactical screens, minimal
signage in Aurebesh-style stencils, exposed machinery only where it belongs (engineering, hangar).
Each room must have: a clear purpose readable at a glance, its own lighting mood (colour + key light
direction), practical furniture/equipment at human scale, believable circulation (you can walk to
every door), wear where hands and boots go, and enough secondary detail that no wall is a flat sheet
within 3 m of where the player can stand. No copied proprietary assets — everything is original
geometry in the spirit of the films.

## Budgets (per room, measured with tools/shot.mjs)
- draw calls: ≤ 28 for a normal room, ≤ 60 for hero rooms (bridge, hangar, reactor)
- triangles: ≤ 150k normal, ≤ 450k hero (merged geometry; use `kit.instanced` for ≥ 20 repeats)
- light descriptors ≤ 12 (hero ≤ 20); at most 2 spot descriptors with shadows per room
- colliders ≤ 150 per room; build time ≤ 150 ms per room (log printed by the harness)

## Testing your work
```sh
ln -s /workspace/node_modules node_modules      # if your worktree has none (same machine)
npx vite --host 127.0.0.1 --port <YOUR PORT> --strictPort &    # each workstream uses its own port
node tools/shot.mjs --url http://127.0.0.1:<PORT>/ --out /tmp/<name> --view holo --view holo_b
node tools/shot.mjs --url ... --pose "x,z,yaw,pitch"           # arbitrary player pose
node tools/shot.mjs --url ... --ext bridge --extpose "cx,cy,cz,lx,ly,lz"   # exterior
node tools/shot.mjs --url ... --list                            # all registered view names
```
Look at every screenshot you take (Read the png). Iterate until the room passes a cold look: would a
Star Wars fan recognise it, does it feel designed, is anything empty / floating / z-fighting / blown
out / black? Headless Chromium here uses software GL: frame times are meaningless, draw calls and
triangles are what to report.

## Reporting
Finish with: files changed; each room/feature delivered; screenshots taken (paths); draw calls +
triangles per view; anything unfinished or known-bad. Commit on your branch with clear messages.
