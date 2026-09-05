# Status — C: crew-engineering

Branch: `cursor/sd-crew-engineering-f9bd` · Last push: 5e50b7b2 · 2026-09-05 03:20 UTC
Run: `bc-5c9df309-dc4c-491e-8f9c-0acd3054f9bd` · Phase: 3

## Summary (3–6 lines, what a reviewer needs to know right now)

Agent C owns Deck 2 (crew + operations, floor y +40) and Deck 3 (engineering, floor y +12): 18 modules
under `src/rooms/deck2/**` and `src/rooms/deck3/**`, all at **Phase 3 + a lighting round**: every room
has one shadow-casting key spot (`shadow: true`), 2–5 motion-lighting effects driven by live light
descriptors + one merged animated-emitter mesh, and a composition pass (key / fills ≤ 40 % / coloured
practicals). Two blind critic passes (15 → 72 PASS of 76) plus a third on the lit rooms (running).
Final full run (`p5_all`): **0 registry warnings**, every module ≤ 16 draw calls (incl. FX meshes) /
≤ 120k tris / ≤ 14 descriptors / build ≤ 150 ms; each room's own key is the shadow caster in all 76
views. Waiting on others: A's scaffold, D's doors/lifts/corridor kit — all drop-in for my rooms.

## Plan

Conventions used on both decks (all inside the §6.3 envelopes):
- Walls are 0.30 m thick and sit **inside** each room's bounds. Adjacent rooms share a bounds plane
  (gap 0), so the wall between two rooms is two back-to-back 0.30 m walls (0.60 total) and the doors
  system's tunnel lining spans exactly that. Door `pos` is on the shared plane, dirs opposite.
- Corridors are 4.0 m wide × 4.4 m high (a "blast" 4.0×4.0 door fits). Rooms are 4.6 m high unless noted.
- Bounds y: floor − 0.5 (slab) to ceiling + 0.5 (services void).
- Door kinds: room ↔ corridor = `standard` (2.4×3.0); lobby ↔ corridor arms and the two engineering
  volumes = `blast` (4.0×4.0); detention cells / pod hatches inside rooms are room-local geometry.
- Lift cabin volumes kept free: Deck 2 x −2..2, y 40..43.6, z 385..389 · Deck 3 x −2..2, y 12..15.6,
  z 565..569. Lobby walls leave a 2.4 w × 3.0 h clean hole at the anchor (standard door size) for D's
  cabin door; D: tell me in `docs/review/` if the cabin door is a different size.

### Deck 2 — crew & operations (floor y = 40, ceiling ≤ 56)

```
                 z=305 ┌──────────────────────┐
                       │  d2-escape (pods)    │  x −20..20, z 305..330
                 z=330 └──────────┬───────────┘
                                  │ d2-cor-n  x −2..2, z 330..370
     ┌───────────┐ ┌──────────┐   │   ┌───────────┐ ┌───────────┐
     │ d2-medbay │ │d2-quarter│   │   │d2-briefing│ │  d2-rec   │   (north of spine, max z 373)
     │ x−60..−36 │ │ x−33..−11│   │   │ x 11..33  │ │ x 36..60  │
     │ z 340..373│ │ z340..373│   │   │ z 348..373│ │ z 344..373│
z=373├───────────┴─┴──────────┴───┼───┴───────────┴─┴───────────┤
     │  d2-cor-w  x −62..−8       │ d2-lobby x −8..8, z 370..385│  d2-cor-e  x 8..62   (spine z 373..377)
z=377├───────────┬────────────┬───┤   lift T2 @ (0,40,385) ─►cabin z 385..389
     │  d2-mess  │ d2-armory  │   │   │d2-security│ │d2-lifesup │   (south of spine, min z 377)
     │ x−62..−30 │ x −27..−11 │   │   │ x 11..35  │ │ x 38..62  │
     │ z 377..412│ z 377..400 │   │   │ z 377..410│ │ z 377..415│
     └───────────┘ └──────────┘       └───────────┘ └───────────┘
```

| id | Room | Bounds x | Bounds z | Ceiling y | Doors (id · pos · kind) |
|---|---|---|---|---|---|
| `d2-lobby` | Lift lobby (hub) | −8..8 | 370..385 | 44.4 | `d2-lobby-w` (−8,40,375) blast · `d2-lobby-e` (8,40,375) blast · `d2-lobby-n` (0,40,370) blast · lift `T2` (0,40,385) dir (0,0,−1) |
| `d2-cor-w` | Spine corridor, port arm | −62..−8 | 373..377 | 44.4 | `d2-lobby-w` · `d2-medbay-door` (−48,40,373) · `d2-quarters-door` (−22,40,373) · `d2-mess-door` (−46,40,377) · `d2-armory-door` (−19,40,377) |
| `d2-cor-e` | Spine corridor, starboard arm | 8..62 | 373..377 | 44.4 | `d2-lobby-e` · `d2-briefing-door` (22,40,373) · `d2-rec-door` (48,40,373) · `d2-security-door` (23,40,377) · `d2-lifesupport-door` (50,40,377) |
| `d2-cor-n` | Forward corridor to pods | −2..2 | 330..370 | 44.4 | `d2-lobby-n` · `d2-escape-door` (0,40,330) standard |
| `d2-medbay` | Medbay (wards, surgery, bacta) | −60..−36 | 340..373 | 45.0 | `d2-medbay-door` |
| `d2-quarters` | Crew quarters (stacked bunks) | −33..−11 | 340..373 | 44.6 | `d2-quarters-door` |
| `d2-briefing` | Briefing room (tiered, holo) | 11..33 | 348..373 | 46.0 | `d2-briefing-door` |
| `d2-rec` | Recreation lounge | 36..60 | 344..373 | 45.0 | `d2-rec-door` |
| `d2-mess` | Mess hall + galley | −62..−30 | 377..412 | 46.5 | `d2-mess-door` |
| `d2-armory` | Armory | −27..−11 | 377..400 | 44.6 | `d2-armory-door` |
| `d2-security` | Security office + detention block | 11..35 | 377..410 | 44.6 | `d2-security-door` |
| `d2-lifesupport` | Life support (air/water/waste) | 38..62 | 377..415 | 50.0 | `d2-lifesupport-door` |
| `d2-escape` | Escape-pod bay | −20..20 | 305..330 | 46.0 | `d2-escape-door` |

### Deck 3 — engineering (floor y = 12, ceiling ≤ 60, reactor ≤ 110)

```
z=549 ┌────────────┐
      │  d3-lobby  │ x −10..10, z 549..565 · lift T3 @ (0,12,565) dir (0,0,−1) → cabin z 565..569
z=565 └───────┬────┘   door d3-lobby-cor @ (6.5,12,565) blast
              │ d3-cor  x 4.5..8.5, z 565..612.5
z=572 ┌───────┼──┐
      │d3-engctl│  │  x −30..4.5, z 572..612.5   (window + door onto the reactor at z 612.5)
z=612.5├─────────┴──┴────────────┐
      │        d3-reactor        │  x −36..36, z 612.5..690, y 4..100 (pit + 88 m column)
z=690 ├──────────────────────────┤  door d3-reactor-hyper @ (0,12,690) blast
      │      d3-hyperdrive       │  x −30..30, z 690..752, y 12..40
z=752 └──────────────────────────┘
```

| id | Room | Bounds x | Bounds z | y | Doors (id · pos · kind) |
|---|---|---|---|---|---|
| `d3-lobby` | Lift lobby | −10..10 | 549..565 | 11.5..16.5 | `d3-lobby-cor` (6.5,12,565) blast · lift `T3` (0,12,565) dir (0,0,−1) |
| `d3-cor` | Engineering corridor | 4.5..8.5 | 565..612.5 | 11.5..16.9 | `d3-lobby-cor` · `d3-engctl-cor` (4.5,12,590) standard · `d3-cor-reactor` (6.5,12,612.5) blast |
| `d3-engctl` | Engineering control (two levels, big window on the reactor) | −30..4.5 | 572..612.5 | 11.5..22.5 | `d3-engctl-cor` · `d3-engctl-reactor` (−12,12,612.5) standard |
| `d3-reactor` | Reactor chamber (ring catwalk at y 12 around an 88 m core) | −36..36 | 612.5..690 | 4..100 | `d3-cor-reactor` · `d3-engctl-reactor` · `d3-reactor-hyper` (0,12,690) blast |
| `d3-hyperdrive` | Hyperdrive room (horizontal motivator, coil banks) | −30..30 | 690..752 | 11.5..40.5 | `d3-reactor-hyper` |

Views: ≥ 3 per room, named `<roomId>-<what>` (e.g. `d2-mess-hall`, `d2-mess-galley`, `d2-mess-door`).

## Subagents
| # | Deliverable | Files | Status |
|---|---|---|---|
| — | Phase 1 greybox of all 18 manifests + shell/doors/materials/props helpers (C directly, for consistency) | `src/rooms/deck2/_shared/*`, all `index.js` | done (48e88572, f0785ba2) |
| 1 | Lobbies + corridors, both decks (switch to D's corridor kit when it lands) | `src/rooms/deck2/{lobby,cor-w,cor-e,cor-n}/**`, `src/rooms/deck3/{lobby,cor}/**` | done (34d3f4d1) |
| 2 | Medbay + crew quarters | `src/rooms/deck2/{medbay,quarters}/**` | done (4636ab65) |
| 3 | Briefing + recreation lounge | `src/rooms/deck2/{briefing,rec}/**` | done (41dbe04c) |
| 4 | Mess hall/galley + armory + security/detention | `src/rooms/deck2/{mess,armory,security}/**` | done (cf4eece6) |
| 5 | Life support + escape-pod bay | `src/rooms/deck2/{lifesupport,escape}/**` | done (14170d02) |
| 6 | Engineering control, reactor chamber, hyperdrive room | `src/rooms/deck3/{engctl,reactor,hyperdrive}/**` | done (7f353bc1, b82c6224) |
| critic | Blind visual critic: sees only screenshots + §1/§11 brief, reports per view | (none) | done: pass 1 on `p2_all` 15 PASS / 61 FIX; pass 2 on `p3_all` 72 PASS / 4 FIX (mild); round 3 fixed the residuals |

Ports: C = 5173, subagents 5101–5106. Harness runs are serialised through `flock /tmp/c-shots.lock`.

## Done
- All 18 manifests (Phase 1 greybox): bounds, doors (from `_shared/doors.js`, one table, both rooms of
  a pair pull the same entry), spawn, ≥ 3 views each (54 total), closed shells at 1:1 via
  `_shared/shell.js` (0.30 m walls inside bounds, kick 0.4 m, light strip at 2.05 m, cornice, ceiling
  light channels, ribs on corridors, door holes cut to §9.1 sizes, window reveals + glass).
- `d3-reactor`: ring catwalk (8 m) at y 12 around a r 9 core column (y 4.5..98) with amber bands, four
  radial bridges to a r 13 service platform, rails, pit floor at y 4.
- `d3-hyperdrive`: 9 m motivator cylinder on three cradles, coil banks along both walls, rails.
- `d3-engctl` ↔ `d3-reactor` share a window (x −26..−2, y 13.2..17.5) on the z 612.5 plane.
- `_shared/materials.js`: `imperialExtras(shared)` returns ONLY the §10 Imperial keys the shared
  library does not provide yet (impPanel, impFloor, blackGloss, emitWhite/Blue/RedImp/Amber/Green,
  screenImp0..3, holo), so modules render before and after the scaffold; A's keys win when present.
- `_shared/props.js`: placer + console (sloped screen bank, indicator field), indicators, chair,
  wall screen, crate, locker bank, 3-tier bunks, table+benches, pipe, duct, tank, pillar, stairs,
  holo table, floor lines, drop light, cabinet, hazard strip.

### Phase 2 — what exists per room (all pushed)
- `d2-lobby` / `d3-lobby`: corner pillars, light coffer, hub ring + floor lanes to every door, directory
  boards, benches + screens, comms pedestal, fire point, cabinets; lift hole and 1.5 m either side kept
  clear. d3 adds heavy pipe mains with wall terminations, a duct and two coolant tanks.
- `d2-cor-w/e/n`, `d3-cor`: one generator (`deck2/cor-w/corridor.js`): bulkhead frames + numbered
  markers every 4 m, 3 conduit runs per side, service bays with cabinets/crates every 8 m, junction
  boxes, kick-level strips, hazard strip + status panel + header marker at every door, dead-end
  bulkheads with angled overhead screens. d3 adds an r 0.22 engineering main with amber bands.
- `d2-medbay`: reception arc counter + sit console, 8-bed ward in bays (headboard monitors, lamps,
  curtain rails), 3 bacta-style glass tanks with teal cores, glass surgical bay (table, light ring),
  pharmacy shelving, vitals boards, gurneys, carts.
- `d2-quarters`: 10 bays / 60 bunks (open foot frames, ladders, lamps, pinned cards), slot lockers +
  fold-out desks, alternating mess/lounge nooks, washroom alcove (basins, showers, dryers, washers),
  duty console, laundry carts.
- `d2-briefing`: 3-tier seating blocks (36 seats, desk rows, aisle rails), carpet aisle, holo dais with
  animated schematic, 13 m display wall, coffer with blue ring, duty consoles, cabinets, crates.
- `d2-rec`: dispenser bar with lit back-bar and stools, 4 holo-game tables, info column, media wall
  with bench rows, lounge clusters, exercise corner, hydration station, drop lights.
- `d2-mess`: 16 long tables with drop lights and tableware, hand-wash trough, tray return, 10 m serving
  line with sneeze guards and heat lamps, queue lane, half-wall galley (vats, hood + duct, sinks,
  dishwasher, prep islands, cooler door), service run at 5 m.
- `d2-armory`: barred issue cage with counter, hatch and gate, rifle/pistol racks, armour lockers,
  charge-crate stacks, maintenance bench, blast-shield test alcove, red no-go line.
- `d2-security`: duty desk, scanner checkpoint, 8-screen monitor wall, evidence lockers, barred gate,
  6-cell detention block (one force-field cell), holding benches, glass interrogation room.
- `d2-lifesupport`: 4 water tanks with manifold + pump skids, 6 scrubber cabinets + duct trunk, filter
  and O2 skids, two digesters with sump curb, +4.5 m perimeter catwalk with open stair, control station.
- `d2-escape`: 10 pod hatches with collars, muster platforms and status pillars, runway with muster
  line and boarding lanes, O2 rack, emergency lockers, control console, 10-pod status board.
- `d3-engctl`: three console arcs facing a 24 m window onto the reactor, command post with holo
  schematic, 23 m continuous control sill, +4 m mezzanine with stairs, status-screen wall, 19 power
  cabinets with cable risers, systems bay islands, ceiling trunks converging on a gauge header.
- `d3-reactor`: segmented containment core with coolant spines and a pulsing energy channel, struts to
  the walls at y 35/65, pit machinery (pumps, exchangers, floodlights), ledges with rails at y 40/70,
  catwalk consoles/valve stations/crates, bridge portal arches, core platform pedestals.
- `d3-hyperdrive`: 9 m motivator with end caps, 6 field coils, 3 cradles, top gantry + stair tower, 14
  coil banks with power trunks, aft housing bulkhead with blue rings, consoles, coolant tanks, ducts.

Final numbers (`p5_all`, all 18 modules loaded, 76 views, 0 warnings, after the lighting round;
calls include the rooms' own animated FX meshes):

| Module | calls | tris | lights | colliders | build ms |
|---|---|---|---|---|---|
| `d2-armory` | 16 | 30,148 | 14 | 48 | 88.2 |
| `d2-briefing` | 16 | 50,334 | 11 | 75 | 63.6 |
| `d2-cor-e` | 15 | 29,020 | 13 | 80 | 46.4 |
| `d2-cor-n` | 14 | 21,396 | 10 | 57 | 30.5 |
| `d2-cor-w` | 15 | 28,472 | 13 | 73 | 30.3 |
| `d2-escape` | 16 | 85,396 | 14 | 89 | 78.4 |
| `d2-lifesupport` | 16 | 69,198 | 14 | 58 | 84.8 |
| `d2-lobby` | 15 | 17,868 | 13 | 21 | 32.2 |
| `d2-medbay` | 16 | 69,804 | 14 | 116 | 82.5 |
| `d2-mess` | 16 | 50,380 | 14 | 88 | 50.6 |
| `d2-quarters` | 16 | 72,840 | 14 | 192 | 79.8 |
| `d2-rec` | 16 | 39,906 | 14 | 71 | 43.6 |
| `d2-security` | 16 | 44,532 | 14 | 101 | 57.6 |
| `d3-cor` | 15 | 24,256 | 12 | 68 | 24.5 |
| `d3-engctl` | 16 | 102,728 | 13 | 111 | 149.1 |
| `d3-hyperdrive` | 16 | 110,088 | 14 | 121 | 143.6 |
| `d3-lobby` | 16 | 20,120 | 13 | 26 | 27.6 |
| `d3-reactor` | 16 | 119,964 | 14 | 139 | 131.4 |

Whole frame per view (active set = room + door neighbours, pool 12 point / 4 spot, one shadow map):
51–157 draw calls, 56k–528k tris. Sum of all 18 modules: 986k tris, 282 calls, 238 descriptors.

### Lighting round (all rooms)
- **Shadows**: one `shadow: true` key spot per room, placed inside a real fixture and aimed at the
  room's centre of interest (surgery pendant, bar fixture, issue-cage panel so the bars stripe the
  counter, gantry flood across the reactor bridge, high-bay over the hyperdrive cradle, corridor first
  fixture aimed down the deck …). `shadowLight` = the room's own key in all 76 views.
- **Motion lighting** via live descriptors (rig mirrors `intensity/color/pos/target` per frame) paired
  with one merged animated-emitter mesh per room (vertex-attribute or colour-buffer driven, net 0–1
  calls): rotating beacons (armory range, escape FAULT pod, corridor dead ends, d3 blast doors, sump),
  red alert sweep along the detention strips with a moving light, scanner-gate veil translating the
  lane, hyperdrive fore→aft coil charge with a travelling blue light and housing burst, reactor core
  breathe synced to gantry pools + sweeping energy bands + upward-chasing ledge markers, bacta pulses,
  seeded faulty fixtures, heat-lamp flicker, screen jitter, breathing status lamps, directory-board
  refresh chases, game-table charge sequences, gauge needles swinging.
- **Environment**: per-room cube capture on room change (emissives ×0.3, 128², PMREM). Rooms retuned
  fills (GAIN ~1.7, fills ≥ 1.6 m under emitters) and swapped gloss/metal keys where the captured
  environment made them mirrors.
- **Pool rules found necessary** (rig, proposed for A's pool): a neighbour room's spots are never live
  (their cones pass through the shared wall without a shadow map → blown lobes on gloss); neighbour
  points carry a 1.5× weight penalty so a room keeps its own fills.

### Critic loop (blind: images + §1/§11 brief only)
Pass 1 on `p2_all`: 15 PASS / 61 FIX. Ten fleet-wide patterns; the four that lived in my shared layer
were fixed once (`e587688d`): bare emitters at 2.0–2.4 blown past the bloom threshold → 1.3–1.6 and
housings; worn-metal texel 1 on big dark boxes read as "dirty concrete" → texel 2.5 + clean panelled
pillar faces; one teal Kestrel screen everywhere → four procedural Imperial UI layouts
(`_shared/screens.js`); missing door surrounds / bare upper walls → shell `doorDressing` and
`serviceBand`. The per-room items went back to the six room subagents (commits `cb8c5a05`, `56b20cb8`,
`812a805e`, `cdf340d6`, `7fae7f43`, `3e1e2edb`): housed fixtures everywhere with fills ≥ 1.2 m below
emitters (root cause of the remaining blobs: fills 1.5 cm under their own emitters), state variants
(bunks, tanks, cells, pods, appliances, racks, coil joints), placeholder geometry replaced (seats,
consoles tops, holos, crates, posters), foreground anchors / re-framed cameras, style drift removed.
The "blown white dot" in every image was the HUD crosshair, not geometry (hidden in the rig).
Pass 2 on `p3_all`: **72 PASS / 4 FIX (all mild)**, 0 bare emissive blow-outs, one regression (a mess
hood lamp). Residual classes: reactor core clipping white, ceilings with too few visible fixtures
(hyperdrive), under-exposed floors, cameras with 35–50 % empty foreground, speckle migrated onto props,
small placeholder clusters. Round 3 (all six subagents, commits `0447bb7d`, `20ca0e83`, `24bc30ba`,
`999e641b`, `d6fb34be`, `f5f40d92`) addressed every listed item: core emission capped at 1.85 with an
amber→orange→white gradient by geometry (0 % clipped pixels in all reactor views), visible housed
fixtures in every room incl. hyperdrive high-bays, floor fills / one-step lighter deck tints, cameras
re-framed with foreground anchors (names kept), texel 4 / clean `impPanel` plates on big bodies, prop
states (locker rows, pumps, coils, cells, pods, filter vessels, bays), placeholder clusters replaced.
Shared-layer follow-ups from the passes: props texel default 2.5 (`c58133c0`), a clean procedural
Imperial wall-panel map for `impPanel` (`289916ae`), shell `ceiling.mat`/`ceiling.texel` clean path,
`console` screenMat arrays (`624f7d92`).

Phase 1 numbers (local shim, all 18 modules loaded, streaming = room + door neighbours, light pool
12 point / 4 spot):

| Module | calls | tris | lights | colliders | build ms |
|---|---|---|---|---|---|
| `d2-armory` | 5 | 5,304 | 4 | 5 | 17.5 |
| `d2-briefing` | 4 | 6,888 | 4 | 5 | 12.2 |
| `d2-cor-e` | 5 | 6,048 | 6 | 9 | 9 |
| `d2-cor-n` | 5 | 4,536 | 5 | 6 | 6.8 |
| `d2-cor-w` | 5 | 5,868 | 6 | 9 | 6.7 |
| `d2-escape` | 5 | 9,408 | 6 | 5 | 11.9 |
| `d2-lifesupport` | 5 | 10,200 | 6 | 5 | 13 |
| `d2-lobby` | 5 | 3,264 | 4 | 8 | 3.9 |
| `d2-medbay` | 4 | 8,760 | 6 | 5 | 9.5 |
| `d2-mess` | 4 | 10,704 | 6 | 5 | 11.3 |
| `d2-quarters` | 4 | 7,464 | 6 | 5 | 7.8 |
| `d2-rec` | 4 | 7,608 | 6 | 5 | 9.2 |
| `d2-security` | 5 | 8,760 | 6 | 5 | 8.9 |
| `d3-cor` | 6 | 5,268 | 6 | 7 | 5.7 |
| `d3-engctl` | 6 | 11,568 | 6 | 6 | 14.4 |
| `d3-hyperdrive` | 7 | 19,848 | 7 | 25 | 23.5 |
| `d3-lobby` | 6 | 3,996 | 4 | 6 | 7.7 |
| `d3-reactor` | 6 | 24,340 | 9 | 24 | 30.9 |

Whole-frame per view (active set ≤ 6 rooms): 29–51 draw calls, 4k–56k tris, ≤ 12 pool lights.

## Tested
- How: local uncommitted rig `sandbox-c/` (excluded via `.git/info/exclude`) implementing §7 discovery
  (`import.meta.glob("src/rooms/deck{2,3}/**/index.js")`), §8 ctx, descriptor → light, §9.4 pool
  (12 point / 4 spot nearest-by-priority), §9.5 active set (room containing the player + door
  neighbours), and a harness that accepts any registered view name. Screenshots stay in `/tmp/c-shots`.
- Validation: bounds inside the deck envelope, doors paired by id with identical pos / opposite dir /
  same kind, pos on a bounds face, no AABB overlaps, unique view names, spawn present, per-module
  budgets. Result for all 18: **0 warnings**, 54 views (`p1_all`), then 76 views (`p2_all`).
- Every subagent iterated on its own screenshots (2–5 rounds each) and reported what it judged wrong
  and fixed: blown-out `blackGloss` floors under point lights (three rooms; fixed in the shared
  fallback: roughness 0.3 / env 0.5), props in door approaches, coplanar faces, floating brackets,
  views that showed nothing, empty walls/floors, repetitive bays (quarters), screen specular hotspots
  (fixed by tilting overhead screens).
- Door clearance: a throwaway script intersected every geometry/collider AABB with each door approach
  box (hole ± 1 m, 1.5 m into the room) for the six Deck 3 door instances — only the shell's kick plates
  and wall colliders touch the approach, and they end exactly at the hole edges.
- Not yet: the real registry (A's scaffold not landed), D's doors (holes are dark voids), the blind
  critic's findings (running).

## Remaining
0. **Stopped by the user on 2026-09-05 09:02 UTC** mid round 4 (exposure polish from critic pass 3:
   49 PASS / 27 FIX). Committed and verified on this branch: rounds 1–3, the lighting round, and the
   round-4 fixes for medbay, quarters, briefing, rec, life support and escape. The round-4 edits still
   in progress for the hubs/corridors, mess/armory/security and engctl/reactor/hyperdrive are parked
   **unverified** on `cursor/sd-crew-engineering-wip-f9bd` (syntax-checked only) — re-run the harness
   before merging any of it. Open items from pass 3 for those rooms: reactor entry/core/bridge are
   80–85 % black with clipping core cells (make the core the key), clipped hanging panels in engctl and
   hyperdrive-side, lobby keys straight overhead (no pillar shadows), d3-lobby sphere beacons need
   cages, security interrogation pendant does not light the table, armory cage speculars, floors under
   20 % in ~12 views.
1. Re-test on the real registry once `src/core/registry.js` lands (drop the shim); switch corridors to
   D's `corridorSegment` once `src/systems/corridor/corridor.js` exists (my corridor generator keeps
   its dressing either way); re-shoot once D's doors fill the holes.
2. Accepted residuals from critic pass 2: `d2-security-door` still ~55 % of frame under 20 % grey (dark
   grey + red is the spec'd accent; pushing further needs lighter walls or > 14 lights); three 1-px
   clipped lines on the mess serving header seen head-on at 20 m; lift holes undressed by contract.
3. Optional: promote duplicated local props into `_shared/props.js` (barWall, statusBoard, doorPanel,
   stool, zoneRect, floorLane, open stairs, bunk head/foot options, wallScreen portrait/uvRect).
4. Interactables are not yet registered in my rooms (contract shape known; hooks for "use console",
   "open locker" are cheap to add once A's Interactions wiring is in the registry).

## Blockers
- None. Scaffold (`src/core/registry.js`) not landed yet; I test with a local uncommitted shim that
  implements the §7/§8 contract as written.

## Preview build (Decks 2 & 3 only — not the official ship link)
The user asked me directly for a playable link, so a production build of my rig (Decks 2 & 3, no
exterior, holes where D's doors/lifts go) is published on my own branch, separate from A's play
branch: `cursor/sd-crew-engineering-play-f9bd` →
https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/sd-crew-engineering-play-f9bd/index.html
(githack shows a one-click "Open the page" interstitial; rebuilt after the lighting round). Keys: WASD, mouse, T/Y next/previous room,
L switch deck in a lobby, F3 stats. A: ignore or delete it once the integrated build is up.

## Requests for integrator
- Contract proposal — **live light descriptors**: rooms mutate `desc.intensity / color / pos / target`
  in `update(dt, t)` and the pool mirrors them each frame (my rig does; cost is a few assignments per
  live light). This is how my rooms do motion lighting (beacons, chases, flicker, charge sequences)
  without creating THREE lights. If the pool copies descriptors once, these effects freeze.
- Contract proposal — **`shadow: true` key spot**: each room marks one spot descriptor `shadow: true`;
  the pool's single shadow-casting slot goes to the visible one in the player's room (else nearest
  spot). My rig implements exactly this; every Deck 2/3 room now has such a key.
- Environment: a per-room cube capture from the player's eye on room change (emissives dimmed ×0.3,
  128², PMREM) makes metals reflect the real room — same recipe as Kestrel's `captureEnvironment`,
  just re-run on room change. Worth having in `src/core` for all decks.
- Reactor pit: `d3-reactor` bounds go to y = +4 (8 m below the Deck 3 floor) for a pit under the core,
  mirroring the bridge's crew pits below its floor. Please confirm the Deck 3 envelope tolerates it,
  or I raise the pit floor to 11.5.
- Lift cabin door size: lobby walls leave a 2.4 × 3.0 hole at the anchor. If D's cabin door is a
  different size, note it in `docs/review/c-*.md` and I will match.
- `Frame`/`panelGrid` export: not needed any more — Decks 2/3 have their own Imperial wall helper.
- `blackGloss` (§10 says roughness 0.18): at 0.18 a long grazing sightline mirrors the environment map
  into a blown-out band (seen in briefing, quarters, engctl). My fallback uses roughness 0.3 /
  envMapIntensity 0.5; consider the same for the shared key, or keep 0.18 only for the bridge.
- `darkGloss`: please set `vertexColors: true` (like the new `blackGloss`) so indicator plates and
  signage backs can be tinted per deck without another material key.
- Fog: my rig uses FogExp2 0.006; the Kestrel value 0.03 would swallow the 77 m reactor chamber and
  the 54 m corridor arms — please pick the interior fog per room size or per deck.
- Harness: hide `#crosshair` while shooting (`page.addStyleTag({content:"#crosshair{display:none}"})`)
  — it shows as a 6 px white dot at (640, 360) in every screenshot and the critic read it as a bare bulb.
- Light pool: my rooms push `type: "spot"` descriptors in escape, lifesupport, armory and reactor (≤ 4
  each, within the 4-spot pool) — please keep the spot pool at 4 or tell me to convert them.

## Interface notes
- Corridor widths are 5.0 m (not 4.0) so a 4.0 m blast door between lobby and corridor leaves 0.5 m
  of wall on each side; door positions in the table above are updated accordingly (rooms north of the
  spine end at z 372.5, south rooms start at 377.5; `d2-cor-n` is x −2.5..2.5; `d3-cor` is x 4..9).
- Deck 3 shares helpers from `src/rooms/deck2/_shared/` (imports by relative path) because there is
  no `src/rooms/shared` in the ownership table; there is no `index.js` in `_shared`, so the registry
  glob does not pick it up.
- `d3-reactor` bounds min y = 4 (pit), everything else min y = floor − 0.5.
