# Status — D: hangar + ship systems (Deck 4 + infrastructure)

Branch: `cursor/sd-hangar-systems-c071` · Last push: (see git) · 2026-09-04 06:05 UTC
Run: `bc-27044d48-9403-4636-af76-59d715aec071` · Phase: 0

## Summary (3–6 lines, what a reviewer needs to know right now)

Phase 0. Branch created from `cursor/star-destroyer-ship-9544` (bd233952). Deck 4 laid out inside the
§6.3 envelope (x ±150, z -80..+270, floor -72, ceiling ≤ -10) with the §6.2 hangar aperture and the
`d4-lobby` lift anchor fixed. Ten rooms + four systems planned below; door ids are paired in this file
so the doors system and the registry can be checked against it. No scaffold yet on the integration
branch, so testing runs through a dev harness inside `src/hangar/_dev/` that implements the §7/§8
contract (registry shim, light pool, streaming, `debugAPI` for the shots harness). It is removed or
retired the moment `src/core/registry.js` lands.

## Plan

Deck 4, floor y = **-72** unless noted. -Z is forward (bow). Main hangar has the §6.2 floor aperture
(x ±36, z -30..+94, through y -85..-72); D owns everything at y > -85 in it.

```
            z=-80  ─────────────────────────────────────────────────────────  (forward)
                   │                 d4-hangar  x ±80, z -70..170              │
 d4-shuttle-bay    │  ┌──────── aperture x ±36, z -30..94 ────────┐  │ d4-fighter-bay
 x -140..-80       │  │  (open to space below, keel y=-85)        │  │ x 80..140
 z -40..70         │  └────────────────────────────────────────────┘  │ z -40..70
 ── z=70 ──        │  racks along x=±70 walls (two tiers)             │ ── z=70 ──
 d4-repair-bay     │                                                  │ d4-cargo-bay
 x -140..-80       │            balcony y -60 on aft wall             │ x 80..140
 z 70..170         │                                                  │ z 70..170
            z=170  ─────────────────────────────────────────────────────────────
  d4-corridor-west x -140..-10, z 170..173.5 │ d4-lobby x ±10, z 170..181 │ d4-corridor-east x 10..140
                                             │ lift door (0,-72,181)      │ d4-stairs x 4..10, z 181..193
            z=181                            │ cabin x ±2, z 181..185     │  -72 → -60 switchback
  d4-control (flight control tower) x ±12, y -60..-55, z 170..181 — sits above the lobby, window band
  on the z=170 face looks forward over the hangar deck, hatch onto the hangar balcony at y -60.
```

| Room id | Bounds min | Bounds max | Purpose |
|---|---|---|---|
| `d4-hangar` | [-80, -85, -70] | [80, -12, 170] | Main hangar: aperture lip + rails + warning lights + bay-door machinery (y > -85), rack tiers, gantries, cranes, floods, deck markings, aft-wall balcony (y -60) |
| `d4-fighter-bay` | [80, -72, -40] | [140, -50, 70] | Fighter maintenance + refuel: cradles, fuel lines, tool gantries |
| `d4-shuttle-bay` | [-140, -72, -40] | [-80, -50, 70] | Shuttle bay: landing pad, folded-wing shuttle-style craft, boarding ramp |
| `d4-cargo-bay` | [80, -72, 70] | [140, -52, 170] | Cargo + logistics: crate stacks, loader, conveyors, manifest terminals |
| `d4-repair-bay` | [-140, -72, 70] | [-80, -52, 170] | Maintenance/repair: lift jacks, parts racks, welding bays, diagnostic screens |
| `d4-lobby` | [-10, -72, 170] | [10, -68.4, 181] | Lift lobby; lift `T4` at (0, -72, 181) dir (0,0,-1); cabin volume x ±2, y -72..-68.4, z 181..185 kept free |
| `d4-corridor-east` | [10, -72, 170] | [140, -68.8, 173.5] | Corridor kit segment along the hangar aft wall |
| `d4-corridor-west` | [-140, -72, 170] | [-10, -68.8, 173.5] | Corridor kit segment |
| `d4-stairs` | [4, -72, 181] | [10, -55, 193] | Switchback stairwell -72 → -60 (stair geometry + colliders; teleport interactables at foot/top until the player can step) |
| `d4-control` | [-12, -60, 170] | [12, -55, 181] | Hangar flight-control tower: consoles, traffic board, window band over the hangar |

Door pairs (same id on both sides; pos = opening centre at floor level on the bounds face):

| Door id | Pos | Kind | Room A (dir) | Room B (dir) |
|---|---|---|---|---|
| `d4-hangar-aft` | (0, -72, 170) | blast | d4-hangar (0,0,1) | d4-lobby (0,0,-1) |
| `d4-lobby-east` | (10, -72, 171.75) | standard | d4-lobby (1,0,0) | d4-corridor-east (-1,0,0) |
| `d4-lobby-west` | (-10, -72, 171.75) | standard | d4-lobby (-1,0,0) | d4-corridor-west (1,0,0) |
| `d4-lobby-stairs` | (7, -72, 181) | standard | d4-lobby (0,0,1) | d4-stairs (0,0,-1) |
| `d4-control-stairs` | (7, -60, 181) | standard | d4-control (0,0,1) | d4-stairs (0,0,-1) |
| `d4-control-gantry` | (-8, -60, 170) | hatch | d4-control (0,0,-1) | d4-hangar (0,0,1) |
| `d4-cargo-aft` | (111, -72, 170) | standard | d4-cargo-bay (0,0,1) | d4-corridor-east (0,0,-1) |
| `d4-repair-aft` | (-111, -72, 170) | standard | d4-repair-bay (0,0,1) | d4-corridor-west (0,0,-1) |
| `d4-hangar-fighter` | (80, -72, 15) | bay 14×10 | d4-hangar (1,0,0) | d4-fighter-bay (-1,0,0) |
| `d4-hangar-shuttle` | (-80, -72, 15) | bay 16×12 | d4-hangar (-1,0,0) | d4-shuttle-bay (1,0,0) |
| `d4-hangar-cargo` | (80, -72, 120) | bay 10×8 | d4-hangar (1,0,0) | d4-cargo-bay (-1,0,0) |
| `d4-hangar-repair` | (-80, -72, 120) | bay 14×10 | d4-hangar (-1,0,0) | d4-repair-bay (1,0,0) |
| `d4-fighter-cargo` | (111, -72, 70) | standard | d4-fighter-bay (0,0,1) | d4-cargo-bay (0,0,-1) |
| `d4-shuttle-repair` | (-111, -72, 70) | standard | d4-shuttle-bay (0,0,1) | d4-repair-bay (0,0,-1) |
| `d4-hangar-bow` | (0, -72, -70) | blast | d4-hangar (0,0,-1) | `to: null` — locked "forward sections" door (future expansion showcase) |

Systems (kind `system`, built after rooms + exterior):

| Id | Folder | Contract |
|---|---|---|
| `sys-doors` | `src/systems/doors/` | §9.1 — pairs `doors[]` by id, builds assemblies, auto-open, locked unpaired, API, `helper.js` `doorHole(kind)` |
| `sys-lifts` | `src/systems/lifts/` | §9.2 — cabins in the four lobbies' reserved volumes, call panels, deck picker, ride theatre, teleport |
| (plain module) | `src/systems/corridor/corridor.js` | §9.3 — `corridorSegment`, `corridorJunction` for every deck owner |
| `sys-traffic` | `src/hangar/traffic/` | §9.6 — TIE-style + shuttle-style craft, splines through aperture centre (0,-85,32), racks, tractor beam, AI hooks, `hooks.js` stubs |

Rack interface (hangar ↔ traffic, both D): `d4-hangar` returns `api.rackSlots()` →
`[{ id, pos:[x,y,z], yaw, occupied }]`; `sys-traffic` reads it through `ctx.world.get("d4-hangar")`.

## Subagents

| # | Deliverable | Files | Status |
|---|---|---|---|
| 1 | Doors system + helper | `src/systems/doors/**` | planned |
| 2 | Turbolift system | `src/systems/lifts/**` | planned |
| 3 | Corridor kit + aft complex (lobby, corridors, stairs, control tower) | `src/systems/corridor/**`, `src/hangar/lobby/`, `src/hangar/corridor-east/`, `src/hangar/corridor-west/`, `src/hangar/stairs/`, `src/hangar/control/` | planned |
| 4 | Main hangar | `src/hangar/hangar/**` | planned |
| 5 | Fighter traffic system | `src/hangar/traffic/**` | planned |
| 6 | Side bays (fighter, shuttle, cargo, repair) | `src/hangar/fighter-bay/`, `src/hangar/shuttle-bay/`, `src/hangar/cargo-bay/`, `src/hangar/repair-bay/` | planned |
| 7 | Blind visual critic (images + brief only) | none | after first shot round |

Dev harness (D only, not a deliverable): `src/hangar/_dev/` — registry shim implementing §7/§8,
`harness.html` entry served by Vite, `shots.mjs` that accepts any registered view name. Harness runs
are serialised with `flock /tmp/sd-shots.lock`.

## Done
- Phase 0: branch, plan, status file.

## Tested
Nothing yet.

## Remaining
1. Dev harness (registry shim, light pool, streaming, debugAPI) so modules can be screenshotted now.
2. `doors/helper.js` `doorHole(kind)` + corridor kit signature (early deliverables for B and C).
3. Phase 1 greybox of all ten rooms + four systems as manifests with bounds/doors/spawn/views.
4. Phase 2 detail per room, critic loop, budgets in this file.

## Blockers
None. No scaffold yet — working against the contract text with a local shim.

## Requests for integrator
- `d4-hangar` bounds extend to y = -85 (the aperture lip/rails/machinery D owns per §6.2 sit below
  the -72 floor). Please let the Deck 4 envelope floor be -85 for the hangar, or exempt it from the
  envelope check, so the manifest stays warning-free.
- Fog: Kestrel's `FogExp2(0x0a0c10, 0.03)` hides anything beyond ~60 m; the hangar has 240 m
  sightlines. Suggest per-room fog density from the manifest (e.g. `fog: 0.004`) or a global 0.003.
- Player vertical: Deck 4 has two floor levels (-72 deck, -60 balcony/control). Doors between them are
  at matching floor heights so no step-up is needed, but `player.setPose` currently zeroes `y`; the
  shim keeps `y` from `teleport`/`spawn`. Please keep `position.y` from `teleport({pos})` in the real
  Player.
- Stairs: until the player can walk steps, `d4-stairs` uses two interactables (foot/top) that
  `ctx.teleport` with a fade. Remove when step-up lands.

## Interface notes
- Future-expansion doors use `to: null` (not an unknown room id) so the registry's "neighbour does not
  declare the door" check stays quiet; the doors system builds `to: null` locked with an info log, and
  warns only when `to` names a room that exists but does not declare the id.
