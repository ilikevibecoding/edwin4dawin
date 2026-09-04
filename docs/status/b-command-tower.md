# Status — B: command tower (Deck 1)

Branch: `cursor/sd-command-tower-e845` · Last push: (first push) · 2026-09-04 06:10 UTC
Run: bc-624cbbb1-95b2-4ce5-82bb-455f2d92e845 · Phase: 0

## Summary (3–6 lines, what a reviewer needs to know right now)

Phase 0: branch created from `cursor/star-destroyer-ship-9544`, Kestrel code read (kit, ship Frame/panelGrid/porthole,
materials, main, shots). Deck 1 plan below: 11 manifests (7 rooms + 3 corridors + lobby), all inside the §6.3 envelope,
both apertures and the lift anchor exactly as fixed in §6.2/§6.3. Scaffold (`src/core/registry.js`) has not landed
yet, so I test with a local dev harness under `src/rooms/deck1/_dev/` that builds the same `ctx` as §8 and turns light
descriptors into a capped set of THREE lights. It is throw-away and will be deleted when the registry lands.

## Plan

Floor y = +240 everywhere (bridge crew pits +237.6). Deck envelope x ±88, z +458..+542, ceiling ≤ +264.
All bounds abut exactly; each room builds its own 0.3 m wall inside its bounds, so a shared wall is 0.6 m and D's
door assembly lines the gap. Door `pos` is on the bounds face at floor level, `dir` is the outward normal.

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
| `d1-observation` | (-84, 240, 458) → (-20, 246, 466) | 245.4 | `d1-observation-corridor` (-21.8,240,466) (0,0,1) standard → d1-corridor-port |
| `d1-nav` | (-44, 240, 468) → (-23.6, 245, 486) | 244.2 | `d1-nav-corridor` (-23.6,240,477) (1,0,0) standard → d1-corridor-port |
| `d1-comms` | (-44, 240, 490) → (-23.6, 245, 508) | 244.2 | `d1-comms-corridor` (-23.6,240,499) (1,0,0) standard → d1-corridor-port |
| `d1-tactical` | (23.6, 240, 468) → (44, 245, 486) | 244.2 | `d1-tactical-corridor` (23.6,240,477) (-1,0,0) standard → d1-corridor-stbd |
| `d1-intel` | (23.6, 240, 490) → (40, 244, 504) | 243.4 | `d1-intel-corridor` (23.6,240,497) (-1,0,0) blast → d1-corridor-stbd (locked look: red status, vestibule) |
| `d1-officers` | (44, 240, 458) → (84, 244, 512) | 243.2 | `d1-officers-spine` (66,240,512) (0,0,1) standard → d1-spine |
| `d1-corridor-port` | (-23.6, 240, 466) → (-20, 244, 512) | 243.2 | shares `d1-bridge-port`, `d1-observation-corridor`, `d1-nav-corridor`, `d1-comms-corridor`; `d1-spine-port` (-21.8,240,512) (0,0,1) standard → d1-spine |
| `d1-corridor-stbd` | (20, 240, 466) → (23.6, 244, 512) | 243.2 | shares `d1-bridge-stbd`, `d1-tactical-corridor`, `d1-intel-corridor`; `d1-spine-stbd` (21.8,240,512) (0,0,1) standard → d1-spine |
| `d1-spine` | (-84, 240, 512) → (84, 244, 516) | 243.2 | shares `d1-bridge-aft`, `d1-spine-port`, `d1-spine-stbd`, `d1-officers-spine`; `d1-spine-lobby` (0,240,516) (0,0,1) blast → d1-lobby; `d1-spine-end-port` (-84,240,514) (-1,0,0) standard → d1-future-port (unpaired = locked); `d1-spine-end-stbd` (84,240,514) (1,0,0) standard → d1-future-stbd (unpaired = locked) |
| `d1-lobby` | (-8, 240, 516) → (8, 244, 526) | 244 | shares `d1-spine-lobby`; `lift: { id: "T1", pos: [0, 240, 522], dir: [0, 0, -1] }` — cabin box x ±2, z 522..526, y 240..243.6 left empty; my lift-door hole in the z=522 wall is 2.4 w × 3.0 h |

Apertures: `d1-bridge` → `["bridge"]` (glazing + mullions + sill fill x ±19, y 241.2..245.4; reveal lining z 455.5..458
per §6.2). `d1-observation` → `["observation"]` (window band x -78..-50, y 241.5..244.5).

## Subagents
| # | Deliverable | Files | Status |
|---|---|---|---|
| 1 | Bridge (flagship): pits, walkway, window wall, stations, command dais, animated displays | `src/rooms/deck1/bridge/**` | planned |
| 2 | Nav + tactical/holo planning rooms | `src/rooms/deck1/nav/**`, `src/rooms/deck1/tactical/**` | planned |
| 3 | Comms + sensors, intel room | `src/rooms/deck1/comms/**`, `src/rooms/deck1/intel/**` | planned |
| 4 | Officers' quarters (private corridor + cabins + wardroom) | `src/rooms/deck1/officers/**` | planned |
| 5 | Observation gallery (window band) | `src/rooms/deck1/observation/**` | planned |
| 6 | Deck 1 corridors + lift lobby (spine, port/stbd corridors, lobby) | `src/rooms/deck1/spine/**`, `src/rooms/deck1/corridor-port/**`, `src/rooms/deck1/corridor-stbd/**`, `src/rooms/deck1/lobby/**` | planned |
| C | Blind visual critic (screenshots + brief only) | none (report only) | planned |

Shared Deck-1 helpers (mine, not copies of ship.js): `src/rooms/deck1/shared/` — Imperial wall/floor/ceiling builders,
door-hole sizes (same numbers as §7), local material extras. Dev harness: `src/rooms/deck1/_dev/` (no `index.js`
inside, so the registry glob never picks it up).

## Done
- (nothing yet)

## Tested
- (nothing yet)

## Remaining
1. Dev harness (ctx builder, light-descriptor → THREE lights capped at 12+4, view registry, stats, own shots runner).
2. Phase 1 greybox: all 11 manifests, closed shells at 1:1, doors cut, spawn + ≥ 3 views each. Push.
3. Phase 2 detail with 6 subagents + blind critic, one room at a time through the harness (serial).
4. Phase 3 budgets/warnings/status.

## Blockers
- None. Scaffold not landed: I mimic `ctx` locally (see Summary); the Imperial material names from §10 are provided
  as stand-ins by the harness only, rooms reference them by the §10 names.

## Requests for integrator
- `tools/shots.mjs` filters `SHOT_VIEWS` against the hard-coded Kestrel list, so custom view names are dropped. Until
  the scaffold version lands I run my own runner (`src/rooms/deck1/_dev/shots.mjs`, writes to `/tmp/sd-shots/`, never
  into git).
- Lift door opening size in the lobby wall is not specified in §9.2. I cut 2.4 w × 3.0 h (standard door size) centred
  on the anchor; please confirm or state the cabin door size so D and I match.

## Interface notes
- `d1-bridge` bounds start at z 458 (deck envelope) like the §7 example, but the window reveal lining extends forward
  to z 455.5 inside the aperture rect only, as §6.2 grants B that volume.
