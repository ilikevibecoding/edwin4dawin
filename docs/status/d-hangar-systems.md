# Status — D: hangar + ship systems (Deck 4 + infrastructure)

Branch: `cursor/sd-hangar-systems-c071` · Last push: 7dddea11 · 2026-09-04 10:20 UTC
Run: `bc-27044d48-9403-4636-af76-59d715aec071` · Phase: 2 (critic loop running)

## Summary (3–6 lines, what a reviewer needs to know right now)

All of Deck 4 and all four D systems exist and pair: 10 rooms (`d4-hangar`, four bays, lobby, two
corridors, stairs, control tower) + `sys-doors`, `sys-lifts`, `sys-traffic` + the corridor kit.
Full-deck harness run (13 modules, 59 views): **0 registry warnings, 0 budget warnings, 0 page
errors**, every door paired, load 9.7 s on this VM, heaviest whole frame 199 calls / 901k tris (budget
450 / 1.5 M). Every module is within its §12 budget (table below). Early deliverables for B/C are on
the branch: `src/systems/corridor/corridor.js`, `src/systems/doors/helper.js`, `src/systems/lifts/helper.js`
(each with a README). No scaffold on the integration branch yet, so testing runs through the dev
harness in `src/hangar/_dev/` (implements §7/§8/§9.4/§9.5; retire when `src/core/registry.js` lands).
Two blind critics are reviewing the 59 shots now; their findings and fixes land next.

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
| 1 | Doors system + helper | `src/systems/doors/**` | done (00891e1c) |
| 2 | Turbolift system | `src/systems/lifts/**` | done (50fc3007) |
| 3 | Corridor kit + aft complex (lobby, corridors, stairs, control tower) | `src/systems/corridor/**`, `src/hangar/lobby/`, `src/hangar/corridor-east/`, `src/hangar/corridor-west/`, `src/hangar/stairs/`, `src/hangar/control/` | done (716fd34a) |
| 4 | Main hangar | `src/hangar/hangar/**` | done (7dddea11) |
| 5 | Fighter traffic system | `src/hangar/traffic/**` | done (402eb1c0) |
| 6 | Side bays (fighter, shuttle, cargo, repair) | `src/hangar/fighter-bay/`, `src/hangar/shuttle-bay/`, `src/hangar/cargo-bay/`, `src/hangar/repair-bay/`, `src/hangar/bays-shared/` | done (3ec3c85d) |
| 7 | Blind visual critics ×2 (images + brief only) | none | running on the 59 full-deck shots |

Dev harness (D only, not a deliverable): `src/hangar/_dev/` — registry shim implementing §7/§8,
`harness.html` entry served by Vite, `shots.mjs` that accepts any registered view name and writes to
`/tmp/sd-shots/` (never into git). Harness runs are serialised with `flock /tmp/sd-shots.lock`.

## Done

Per module, from the full-deck run `full1` (all 13 modules loaded, 59 views). Budgets: room ≤ 120k tris /
≤ 16 materials / ≤ 14 descriptors / ≤ 400 colliders / ≤ 250 ms; hangar ≤ 300k / 24 / 28; traffic ≤ 40k
tris / ≤ 6 draw calls.

| Module | build ms | materials (draw calls) | tris | light descriptors | colliders | views |
|---|---|---|---|---|---|---|
| `d4-hangar` | 130.5 | 21 | 224.9k | 26 | 107 | deck, aperture, racks, aft-wall, balcony, bay-door, exterior |
| `d4-fighter-bay` | 82.6 | 13 | 67.1k | 11 | 90 | door, cradles, gantry, racks |
| `d4-shuttle-bay` | 54.6 | 15 | 53.0k | 13 | 72 | door, pad, gantry, staging, booth |
| `d4-cargo-bay` | 81.7 | 14 | 80.1k | 12 | 61 | door, racking, loader, conveyor |
| `d4-repair-bay` | 82.5 | 14 | 65.6k | 13 | 127 | door, jacks, welding, benches |
| `d4-lobby` | 22.8 | 12 | 11.5k | 6 | 23 | lift, hangar-door, east-wall, directory |
| `d4-corridor-east` | 53.6 | 9 | 40.7k | 14 | 69 | long, cargo-door, end |
| `d4-corridor-west` | 44.4 | 9 | 39.5k | 14 | 69 | long, repair-door, end |
| `d4-stairs` | 21.8 | 10 | 20.5k | 10 | 92 (+2 interactables) | foot, well, landing, top |
| `d4-control` | 46.8 | 16 | 27.1k | 11 | 39 | window, consoles, holo, board, hatch |
| `sys-doors` | 48.1 | 6 kit + 5 instanced | 20.9k | 0 | 85 (26 dynamic leaves) | standard closed/open/side, blast closed/open/side, stairs closed/open |
| `sys-lifts` | 10.9 | 12 kit + 4 | 3.3k | 1 | 9 (+2 dynamic) | door, door-open, cabin, panel |
| `sys-traffic` | 12.9 | 6 (all instanced/points) | 34.1k | 0 | 0 | approach (exterior), racks, hover, patrol (exterior) |

What each delivers:
- **Doors** (§9.1): 15 door ids paired across Deck 4 (3 `to: null` future doors locked red). Frames,
  tunnel lining, sills, instanced leaves (side-sliding when ≥ 1.15 m of wall exists on both sides, else
  top/bottom split; blast/bay always split), lintel + jamb status lights (blue-white/red/amber), auto-open
  2.6 m / 0.6 s / close after 1.5 s, `door-open|close` audio events, dynamic leaf colliders. API
  `setLocked/getState/forceOpen/list/serialize/apply`. README in the folder.
- **Lifts** (§9.2): cabin per `lift` manifest (only T4 on this branch; T1–T3 wired automatically when
  B/C's lobbies merge), 3.2 × 3.6 × 3.0 interior, deck-select panel + call panel interactables, HUD deck
  picker (keys 1–4), 3–6 s ride with strip sweep, `lift-ride` loop, `player.shake`, teleport to the target
  cabin, "Deck N unavailable" fallback. API `callTo/state/serialize/apply`. README in the folder.
- **Corridor kit** (§9.3): `corridorSegment` / `corridorJunction` + Imperial wall/ceiling/rib/rail/prop
  builders (`imperial.js`, `props.js`) usable by every deck; both Deck 4 corridors are built with it.
- **Traffic** (§9.6): 900-tri fighter + 1042-tri shuttle, 36 craft (20 racked, 2 in maintenance
  cradles, 1 parked shuttle, ≤ 16 movers incl. 10 on two patrol loops), Catmull-Rom arrivals (aperture
  centre at t = 40 s exactly) and launches, banked orientation, tractor-beam cones from the four
  emitter points, engine glow, beacons, animated clamps, occupancy written back to the hangar's live
  slot objects; events `launch|dock|depart|arrive`; `spawn/list/setController/setSchedule/serialize/apply`;
  8 documented hook stubs in `hooks.js`. README in the folder.
- **Rooms**: closed volumes with holes only at contract doors/lift/window; scale references (doors,
  1.02 m rails, 0.9 m consoles, 1.2 m crates) in every room; ≥ 3 views each.

## Tested

- Harness tag `full1` (`/tmp/sd-shots/full1/`, not in git): 13 modules, 59 views, **0 registry
  warnings, 0 `[budget]` warnings, 0 page errors**, load 9.7 s. Whole-frame per view: 75–199 draw
  calls, 138k–901k triangles (includes post passes and the doors/lifts/traffic systems); 16/16 pool
  lights in every view with a neighbour loaded (12 in the stairs).
- Doors (`/tmp/doors-test.mjs`, 30/30; `/tmp/doors-unit.mjs`, 19/19): approach opens in 1 s, closes
  2.5 s after leaving, locked stays shut, `setLocked` cycles lights red→amber→blue-white, `forceOpen`,
  `serialize`→`apply` round-trip on all 13 doors, closed leaf stops the player 0.36 m before the plane.
- Lifts (`/tmp/lifts-test.mjs`, 27/27): door proximity, call panel, closed leaves block, deck picker
  keys, unavailable-deck fallback, timeout, serialize/apply mid-ease, synthetic `d1-lobby` two-cabin
  ride 6.6 s → teleport to (0, 240, 523.2) and back.
- Traffic (`/tmp/traffic-test.mjs`, 24/24): 15 movers at t = 40 with exactly one fighter in the shaft at
  (0, −85, 32); sweep 120→220 s: ≤ 15 movers, ≤ 35.3k live tris, never two craft in the shaft;
  `serialize`→`apply` identical and replay-exact; events fire; 5 draw calls.
- Aft complex (`/tmp/sd-aft-interact.mjs`, 10/10): stair totems hover/teleport, room becomes
  `d4-control` after the climb. Bays (`/tmp/bays-check.mjs`): 20 collider walks, 0 failures.
- Hangar (`/tmp/hangar-coll.mjs`, 15/15): aperture rails/hazard bars, walls, balcony rails block; door
  holes open; 20 of 28 clamps closed matching traffic occupancy; launch re-opens a clamp within 2 s.

## Remaining
1. Critic findings (two blind critics on the 59 shots) → fixes → re-shoot → update this file.
2. Re-run the full deck once B's `d1-lobby` / C's `d2-lobby`, `d3-lobby` merge, to confirm T1–T3
   cabins and orientations.
3. Retire `src/hangar/_dev/` when `src/core/registry.js` lands; move view checks to `tools/shots.mjs`.

## Blockers
None. No scaffold yet — working against the contract text with the local shim.

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
  `ctx.teleport` with a fade. Step colliders are tagged `"step"` (0.18 rise); when `player.js` can step
  up 0.2 m the totems can go.
- Materials: Deck 4 uses the §10 names `impPanel impFloor blackGloss emitWhite emitBlue emitRedImp
  emitAmber emitGreen screenImp0..3 holo` and `PALETTE.imp*` exactly as announced; they come from
  `src/hangar/_dev/shim-materials.js` today. Two tuning notes for the real ones: `blackGloss` at
  roughness 0.18 turns every nearby point light into a blown blob on lobby/control floors (0.25 reads
  better); `emitRedImp` above ~1.3 linear turns orange through ACES — a locked door's red never blooms
  while the blue-white does. A shared black/yellow chevron material (`hazardImp`) would let rooms match
  the blast-door leaves (doors and hangar carry module-local copies for now).
- Interactables: modules push `{ id, key, label, object, material, action: async () => {} }`; please
  have the shared `Interactions` call `action()` on E (Kestrel's hardcodes bed/galley/bathroom).
- Light pool: the room the player stands in should keep its descriptors before neighbours get any
  (the shim adds a fixed bonus for the current room); with `d4-hangar`'s 26 descriptors active as a
  neighbour, the bays otherwise lose all their pools.
- Audio placeholder ids used: `door-open`, `door-close`, `lift-arrive`, `lift-ride` (loop, `.stop()`).
- `ctx.teleport(roomId)` should refresh streaming for the target deck (lifts call it before
  `teleport({pos, yaw})`).
- Systems return `colliders` (array of `{min,max,tag}` mutated in place) for animated leaves; the
  registry should concatenate them with the active rooms' colliders every frame (the shim does).

## Interface notes
- Future-expansion doors use `to: null` (not an unknown room id) so the registry's "neighbour does not
  declare the door" check stays quiet; the doors system builds `to: null` locked with an info log, and
  warns only when `to` names a room that exists but does not declare the id. Doors whose `to` names a
  room that does not exist (B's `d1-future-*`) are also built locked, with a `[doors]` warning.
- **Lift door opening = 2.4 w × 3.0 h, centred on the lift anchor** (`LIFT_DOOR` in
  `src/systems/lifts/helper.js`). B and C already cut that size on decks 1–3 — confirmed, no change
  needed. `liftCabinBox(lift)` returns the 4 × 4 × 3.6 volume to keep free.
- Door-hole helpers for every deck: `src/systems/doors/helper.js` exports `doorHole(kindOrDoor)`,
  `doorOpening(door)` (world AABB + u/v extents on the wall), `doorAsWallOpening(door, from, to)`
  (a `panelGrid`-style opening record), `WALL_T` 0.16, `FRAME_W` 0.22.
- Corridor kit (`src/systems/corridor/corridor.js`) signature is §9.3 plus `caps: {start, end}` and
  `openings: [{ side: "L"|"R"|"start"|"end", u, w, h, offset }]`; documented at the top of the file.
- Room-to-system interfaces inside D (documented in the READMEs): `d4-hangar` `api.rackSlots()`
  returns live slot objects (traffic writes `occupied`, the hangar's hinged clamp arms follow),
  `api.tractorPoints()`, `api.landingPads()`; `d4-shuttle-bay` `api.shuttlePad()` (pos.y = pad top);
  `d4-fighter-bay` `api.cradles()`.
- Standard/hatch doors slide sideways only when both rooms leave ≥ 1.15 m (standard) / 0.57 m (hatch)
  of wall beside the hole; otherwise the doors system splits them top/bottom (or set `split` on the
  manifest entry). Most Deck 4 standard doors sit 0.55 m from a corner and therefore split — this is a
  layout consequence, not a deviation.
- `d4-hangar-aft-wall` view moved from the plan's (0,−72,40) — inside the aperture hole — to the aft
  apron (0,−72,100) yaw 180 so the camera stands on the deck.
