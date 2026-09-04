# Status — C: crew-engineering

Branch: `cursor/sd-crew-engineering-f9bd` · Last push: f0785ba2 · 2026-09-04 07:05 UTC
Run: `bc-5c9df309-dc4c-491e-8f9c-0acd3054f9bd` · Phase: 2

## Summary (3–6 lines, what a reviewer needs to know right now)

Agent C owns Deck 2 (crew + operations, floor y +40) and Deck 3 (engineering, floor y +12):
13 manifests on Deck 2 (9 rooms + lobby + 3 corridor arms) and 5 on Deck 3 (3 rooms + lobby + 1
corridor), 18 modules total, all under `src/rooms/deck2/**` and `src/rooms/deck3/**`.
**Phase 1 is pushed**: every module is a §7 manifest with a closed 1:1 shell (floor slab, panelled
walls with black seams, kick, light strip, cornice, ceiling with light channels, door holes from the
shared door table), 54 harness views, 0 registry warnings on a local shim of the §7/§8 contract.
**Phase 2 in progress**: six subagents detailing rooms in parallel (split below); a shared Imperial
props library (`_shared/props.js`) is in. Corridors still use my shell; they switch to D's
`corridorSegment` when `src/systems/corridor/corridor.js` lands.

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
| 1 | Lobbies + corridors, both decks (switch to D's corridor kit when it lands) | `src/rooms/deck2/{lobby,cor-w,cor-e,cor-n}/**`, `src/rooms/deck3/{lobby,cor}/**` | running (port 5101) |
| 2 | Medbay + crew quarters | `src/rooms/deck2/{medbay,quarters}/**` | running (5102) |
| 3 | Briefing + recreation lounge | `src/rooms/deck2/{briefing,rec}/**` | running (5103) |
| 4 | Mess hall/galley + armory + security/detention | `src/rooms/deck2/{mess,armory,security}/**` | running (5104) |
| 5 | Life support + escape-pod bay | `src/rooms/deck2/{lifesupport,escape}/**` | running (5105) |
| 6 | Engineering control, reactor chamber, hyperdrive room | `src/rooms/deck3/{engctl,reactor,hyperdrive}/**` | running (5106) |
| critic | Blind visual critic: sees only screenshots + §1/§11 brief, reports per view | (none) | after subagents report |

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
  budgets. Result for all 18: **0 warnings**, all 54 views captured (`p1_all`).
- Not yet: the real registry (A's scaffold not landed), D's doors (holes are visible as dark voids),
  a critic pass (Phase 2).

## Remaining
1. Phase 2 detail per room via subagents 1–6 (running) → commit per room as they report.
2. Blind critic pass over every view; fix findings; re-shoot; push.
3. Switch corridors to D's `corridorSegment` once `src/systems/corridor/corridor.js` exists; re-test
   on the real registry once `src/core/registry.js` lands (drop the shim).
4. Phase 3: budgets table, zero warnings, status complete.

## Blockers
- None. Scaffold (`src/core/registry.js`) not landed yet; I test with a local uncommitted shim that
  implements the §7/§8 contract as written.

## Requests for integrator
- Reactor pit: `d3-reactor` bounds go to y = +4 (8 m below the Deck 3 floor) for a pit under the core,
  mirroring the bridge's crew pits below its floor. Please confirm the Deck 3 envelope tolerates it,
  or I raise the pit floor to 11.5.
- Lift cabin door size: lobby walls leave a 2.4 × 3.0 hole at the anchor. If D's cabin door is a
  different size, note it in `docs/review/c-*.md` and I will match.
- `Frame`/`panelGrid` export: I am not copying them; greybox uses a local Imperial wall helper. When
  `src/kit/frame.js` / `src/kit/panels.js` land I will use them for detail passes where useful.

## Interface notes
- Corridor widths are 5.0 m (not 4.0) so a 4.0 m blast door between lobby and corridor leaves 0.5 m
  of wall on each side; door positions in the table above are updated accordingly (rooms north of the
  spine end at z 372.5, south rooms start at 377.5; `d2-cor-n` is x −2.5..2.5; `d3-cor` is x 4..9).
- Deck 3 shares helpers from `src/rooms/deck2/_shared/` (imports by relative path) because there is
  no `src/rooms/shared` in the ownership table; there is no `index.js` in `_shared`, so the registry
  glob does not pick it up.
- `d3-reactor` bounds min y = 4 (pit), everything else min y = floor − 0.5.
