# Status — B: command tower (Deck 1)

Branch: `cursor/sd-command-tower-e845` · Last push: 51c843f6 · 2026-09-04 07:05 UTC
Run: bc-624cbbb1-95b2-4ce5-82bb-455f2d92e845 · Phase: 1 done → 2 (detail) starting

## Summary (3–6 lines, what a reviewer needs to know right now)

Phase 1 greybox is pushed: 11 manifests under `src/rooms/deck1/**` (7 rooms, 2 side passages, spine, lift lobby) built
to the §7/§8 contract (bounds, paired door ids, spawn, ≥ 3 views each, light descriptors, `build(ctx)`), closed
Imperial shells at 1:1, both apertures glazed with reveal + mullions, lift anchor T1 respected. Harness run over all
37 views: **0 registry warnings** (my shim implements the §7 checks), all rooms far inside budgets. Scaffold has not
landed, so everything was tested through `src/rooms/deck1/_dev/` (throw-away registry/ctx shim + own shots runner).
Phase 2 (detail + blind critic) is running with six subagents on disjoint folders.

## Plan

Floor y = +240 everywhere (bridge crew pits +237.6). Deck envelope x ±88, z +458..+542, ceiling ≤ +264.
All bounds abut exactly; each room builds its own 0.3 m wall inside its bounds, so a shared wall is 0.6 m and D's
door assembly lines the gap. Door `pos` is on the bounds face at floor level, `dir` is the outward normal.
Bounds y: min 239.5 (floor slab is 0.2 m thick under +240), max = ceiling + ≥ 0.4 (ceiling structure); bridge 236..250.

```
x:   -88      -44        -23.6 -20              +20 +23.6       +44               +84 +88
z 458 +--------------------------+------------------+----------------------------+
      |  d1-observation (x-84..-20, z458..466)      |    (void)     |            |
z 466 +---------------+----------+   d1-bridge      +--------------+            |
      |   (void)      | d1-nav   |P|  x ±20         |S| d1-tactical | d1-officers|
z 486 |               | 468..486 |o|  z 458..512    |t| 468..486    | x 44..84   |
      |               +----------+r|  pits 237.6    |b+--------------+ z 458..512 |
      |               | d1-comms |t|  ceiling 248   | | d1-intel    | (cabins off|
z 508 |               | 490..508 | |                | | 490..504    |  a private |
z 512 +===============+==========+=+================+=+=============+ corridor) =+
      |                    d1-spine  x -84..+84, z 512..516                       |
z 516 +------------------------------+--------+------------------------------------+
                                     |d1-lobby|  x -8..8, z 516..526
z 522                                | lift   |  lift wall at z 522, cabin volume
z 526                                +--------+  x±2, z 522..526, y 240..243.6 kept FREE
```
`P` = `d1-corridor-port` x -23.6..-20, z 466..512 · `S` = `d1-corridor-stbd` x 20..23.6, z 466..512.

| Room id | Bounds min → max | Ceiling | Doors (id · pos · dir · kind · to) |
|---|---|---|---|
| `d1-bridge` | (-20, 236, 458) → (20, 250, 512) | 248 | `d1-bridge-aft` (0,240,512) (0,0,1) blast → d1-spine · `d1-bridge-port` (-20,240,506) (-1,0,0) standard → d1-corridor-port · `d1-bridge-stbd` (20,240,506) (1,0,0) standard → d1-corridor-stbd |
| `d1-observation` | (-84, 239.5, 458) → (-20, 246, 466) | 245.4 | `d1-observation-corridor` (-21.8,240,466) (0,0,1) standard → d1-corridor-port |
| `d1-nav` | (-44, 239.5, 468) → (-23.6, 245, 486) | 244.2 | `d1-nav-corridor` (-23.6,240,477) (1,0,0) standard → d1-corridor-port |
| `d1-comms` | (-44, 239.5, 490) → (-23.6, 245, 508) | 244.2 | `d1-comms-corridor` (-23.6,240,499) (1,0,0) standard → d1-corridor-port |
| `d1-tactical` | (23.6, 239.5, 468) → (44, 245, 486) | 244.2 | `d1-tactical-corridor` (23.6,240,477) (-1,0,0) standard → d1-corridor-stbd |
| `d1-intel` | (23.6, 239.5, 490) → (40, 244, 504) | 243.4 | `d1-intel-corridor` (23.6,240,497) (-1,0,0) blast → d1-corridor-stbd |
| `d1-officers` | (44, 239.5, 458) → (84, 244, 512) | 243.2 | `d1-officers-spine` (66,240,512) (0,0,1) standard → d1-spine |
| `d1-corridor-port` | (-23.6, 239.5, 466) → (-20, 244, 512) | 243.2 | shares `d1-bridge-port`, `d1-observation-corridor`, `d1-nav-corridor`, `d1-comms-corridor`; `d1-spine-port` (-21.8,240,512) (0,0,1) standard → d1-spine |
| `d1-corridor-stbd` | (20, 239.5, 466) → (23.6, 244, 512) | 243.2 | shares `d1-bridge-stbd`, `d1-tactical-corridor`, `d1-intel-corridor`; `d1-spine-stbd` (21.8,240,512) (0,0,1) standard → d1-spine |
| `d1-spine` | (-84, 239.5, 512) → (84, 244, 516) | 243.2 | shares `d1-bridge-aft`, `d1-spine-port`, `d1-spine-stbd`, `d1-officers-spine`; `d1-spine-lobby` (0,240,516) (0,0,1) blast → d1-lobby; `d1-spine-end-port` (-84,240,514) (-1,0,0) standard → d1-future-port (unpaired = locked); `d1-spine-end-stbd` (84,240,514) (1,0,0) standard → d1-future-stbd (unpaired = locked) |
| `d1-lobby` | (-8, 239.5, 516) → (8, 244.6, 526) | 244 | shares `d1-spine-lobby`; `lift: { id: "T1", pos: [0, 240, 522], dir: [0, 0, -1] }` — cabin box x ±2, z 522..526, y 240..243.6 left empty; my lift-door hole in the z=522 wall is 2.4 w × 3.0 h |

All ids/positions live once in `src/rooms/deck1/shared/plan.js` (`doorsFor(roomId)`), so both sides of a door can
never disagree. Apertures: `d1-bridge` → `["bridge"]` (glass 0.9 m into the reveal, 11 mullions + transom, sill,
lining x ±19, y 241.2..245.4, z 455.5..458.3). `d1-observation` → `["observation"]` (x -78..-50, y 241.5..244.5).

## Subagents
| # | Deliverable | Files | Status |
|---|---|---|---|
| 1 | Bridge (flagship): pits, walkway, window wall, stations, command dais, animated displays | `src/rooms/deck1/bridge/**` | Phase 2 running |
| 2 | Nav + tactical/holo planning rooms | `src/rooms/deck1/nav/**`, `src/rooms/deck1/tactical/**` | Phase 2 running |
| 3 | Comms + sensors, intel room | `src/rooms/deck1/comms/**`, `src/rooms/deck1/intel/**` | Phase 2 running |
| 4 | Officers' quarters (private corridor + cabins + wardroom) | `src/rooms/deck1/officers/**` | Phase 2 running |
| 5 | Observation gallery (window band) | `src/rooms/deck1/observation/**` | Phase 2 running |
| 6 | Deck 1 corridors + lift lobby (spine, port/stbd passages, lobby) | `src/rooms/deck1/spine/**`, `src/rooms/deck1/corridor-port/**`, `src/rooms/deck1/corridor-stbd/**`, `src/rooms/deck1/lobby/**` | Phase 2 running |
| C | Blind visual critic (screenshots + §11 brief only) | none (report only) | after each batch |

Shared Deck-1 helpers (mine, not copies of ship.js): `src/rooms/deck1/shared/` — `imperial.js` (wall with openings,
floor, ceiling with recessed channels, light strip, railing, stairs, partition, corridor dressing, door reveal),
`doors.js` (§7 hole sizes; switches to D's helper when it lands), `palette.js` (§10 colours, falls back to hex until
the scaffold adds `PALETTE.imp*`), `plan.js`. Dev harness: `src/rooms/deck1/_dev/` (no `index.js` inside).

## Done
Phase 1 greybox (all 11 modules): closed floor/ceiling/walls with Imperial panelling (light-grey panels, black
recessed seams, kick, cornice, blue-white strip at 2.05 m), recessed ceiling light channels, door holes cut to §7
sizes with jamb liners + threshold plates (D's assembly goes on top), colliders, spawn, views, light descriptors.
- `d1-bridge`: window band (reveal lining z 455.5..458.3, 11 mullions, transom, glass, sill), fore platform, walkway
  with railings, two 2.4 m-deep pits with console rows + wall display bands, stairs both sides (with a
  `stairs-pending` blocker collider — see Requests), aft command deck with dais, chair, holo plinth, 6 aft stations,
  10 sill stations. Views: `d1-bridge-walkway`, `-pit`, `-window`, `-aft`, `-command`, `-pit-stbd`.
  Stats: 24.8k tris, 17 draw calls, 18 descriptors (1 spot key + 17 point), 84 colliders, build 56 ms.
- `d1-observation`: 28 m window band (7 panes), leaning rail, 6 bench/table groups, 4 display plinths. 7.3k tris /
  14 calls / 6 desc. Views `d1-observation-window`, `-along`, `-lounge`.
- `d1-nav`: octagonal star-chart table with holo sphere/cone, 7-screen chart wall, 8 plotting stations. 6.4k / 15 / 5.
- `d1-comms`: 26 equipment racks with LED columns, 4 operator stations, signal wall, 2 sensor pedestals. 7.6k / 15 / 6.
- `d1-tactical`: 5×3 m holo table with fleet markers, raised tier with rail + lectern, 5 display panels, 18 seats. 5.6k / 14 / 6.
- `d1-intel`: security vestibule (offset inner gate, scanner posts), 10 data columns, analysis table, 5 archive
  cabinets; red-only. 5.3k / 10 / 3.
- `d1-officers`: private corridor (x 64.2..67.8) with ribs/strip, wardroom (table, 12 seats, sideboard, viewscreen),
  4 + 6 cabins (bunk, desk, screen, locker, amber lamp), utility + duty office gaps. 38.6k / 13 / 10.
- `d1-corridor-port`, `d1-corridor-stbd`: corridor-kit look (centre strip, ribs every 4 m, ceiling channel). ~5.9k / 9 / 6.
- `d1-spine`: 168 m corridor, hazard thresholds at the two blast doors, 13 pools. 20.8k / 10 / 13.
- `d1-lobby`: lift wall with 2.4×3.0 hole + heavy surround + amber deck indicator, shaft side walls hugging the
  reserved cabin box, benches, hazard strip. 4.0k / 10 / 2.

## Tested
- Harness `p1c` (own runner, `/tmp/sd-shots/p1c`, 1280×720, SwiftShader): 37/37 views rendered, **0 registry-shim
  warnings** (checks: id format, duplicates, bounds vs envelope, spawn/views inside bounds, door pos on a face,
  door pairs id/pos/kind/dir/to, geometry outside bounds (aperture reveal allowed), descriptor shape/count, tris,
  calls, colliders, build time). 0 page errors.
- Whole-frame numbers (post stack on, current room + door neighbours visible): 36k–210k tris, 70–186 calls
  (includes the post passes and the exterior stand-in), 9–14 pool lights. Frame time 1.6–3.1 s/frame is SwiftShader
  and only useful relatively.
- Per-room build times 5–56 ms (budget 250). Largest room 38.6k tris (budget 120k), bridge 24.8k (300k).
- Critic: not yet (Phase 2).

## Remaining
1. Phase 2 detail per room via subagents (running): density, materials, animated displays, per-room lighting balance
   (the greybox is too dark away from the walkway/centre lights), critic loop, push after each room.
2. Replace corridor greybox with D's `corridorSegment` when it lands; switch `doorHole` import to D's helper.
3. Delete `_dev/` and re-test on the real registry when `SCAFFOLD READY`.
4. Phase 3 budgets/warnings/status.

## Blockers
- None. Scaffold not landed: I mimic `ctx` locally (see Summary); the Imperial material names from §10 are provided
  as stand-ins by the harness only, rooms reference them by the §10 names.

## Requests for integrator
- **Player floor height.** The bridge pits (+237.6) and stairs need the player to follow floor height (Kestrel's
  `Player.setPose` zeroes y and never changes it). Suggestion: colliders tagged `"floor"` carry a top y the player
  snaps to, or `ctx.player.setFloor(y)`. Until then I block the stair tops with colliders tagged `stairs-pending`
  — drop them once the player can step down.
- **Per-room base fill.** In 40 m-wide rooms the 12+4 pool cannot light the walls; a per-room ambient in the manifest
  (`ambient: { sky, ground, intensity }` applied to the shared hemisphere while the room is current) would let
  light-grey panels read as light grey without spending descriptors. Proposal only; I build to the contract.
- `tools/shots.mjs` filters `SHOT_VIEWS` against the hard-coded Kestrel list, so custom view names are dropped. Until
  the scaffold version lands I run my own runner (`src/rooms/deck1/_dev/shots.mjs`, writes to `/tmp/sd-shots/`).
- Lift door opening size in the lobby wall is not specified in §9.2. I cut 2.4 w × 3.0 h centred on the anchor;
  please confirm or state the cabin door size so D and I match.
- Registry envelope check: my bounds use y min 239.5 (floor slab) and y max ceiling + 0.4..0.6 (ceiling structure),
  the bridge 236..250 as in the §7 example. Please keep the y check tolerant of that (or tell me the exact rule).
- The bridge window reveal geometry extends to z 455.5 inside the aperture rect only (§6.2 grants B that volume);
  the manifest bounds start at z 458 like the example. If the registry checks geometry vs bounds, allow the aperture volume.

## Interface notes
- **Wall thickness vs D's doors helper (needs A's ruling).** D's `src/systems/doors/helper.js` (branch
  `cursor/sd-hangar-systems-c071`) assumes `WALL_T = 0.16` per room, tunnel lining 0.32 m, `FRAME_W` 0.22. B and C
  both build 0.30 m walls inside their bounds (inner faces 0.60 m apart). With 0.16 the frame would sit 0.14 m
  inside my wall and the lining would stop 0.14 m short of each inner face. Proposal: fix the contract at 0.30 per
  room (matches two decks already built), or let the doors system take an optional `wallT` per room manifest
  (default 0.16). My `doorReveal()` already lines my full 0.30 m hole edges in dark metal, so until this is settled
  the gap reads as a dark reveal, not raw panel edges.
- D's `LIFT_DOOR` (2.4 × 3.0) and `liftCabinBox()` (x ±2, z 522..526, y 240..243.6 for T1) match what the lobby
  cuts and keeps free — no change needed.
- Console/screen materials: rooms use `screenImp0..3`, `emitWhite/Blue/RedImp/Amber/Green`, `impPanel`, `impFloor`,
  `blackGloss`, `holo` from §10 plus existing `paintedMetal/metal/metalRough/darkGloss/glass/hazard/fabric/decal`.
  No `manifest.materials()` extras yet.
- `d1-spine-end-port/stbd` are deliberately unpaired (`to: d1-future-*`) so D builds them locked (§9.1).
