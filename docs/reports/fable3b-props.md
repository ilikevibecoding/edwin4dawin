# Fable 3b — Facility Props, Signage & Decal System

Owner: Fable 3b (facilities props, signage & decals artist).
Files touched: `src/world/props/breakroom.js`, `src/world/props/restroom.js`,
`src/world/props/maintenance.js`, `src/world/props/signage.js`,
`src/world/decals.js` (all new), `src/world/decorate/facilities.js`,
`src/world/decorate/serviceAreas.js`, `src/world/decorate/basement.js`
(stubs filled), `assets/manifest/props-facilities.js`, this report.
No other files modified, no dependencies added, no git operations.

## What was built

**93 registered prop factories** across four new libraries, all following the
`registerProp` contract (Group + `userData.assetId` + local-AABB colliders,
`tiny:true` clutter distance-culled by the existing bucket):

| library | factories | highlights |
| --- | --- | --- |
| `breakroom.js` | 16 | FROSTBYTE vending machine (1.9 m, emissive product-grid canvas — landmark), GlacierPure water cooler, cabinet runs (param length), sink counter, fridge, coffee/kettle/microwave, round tables, cafe chairs + stack, tiny mug/snack clutter, dispenser pair, trash+recycle pair |
| `restroom.js` | 9 | stall system (param count, 1.9 m, per-stall colliders), 2-basin sink counter with fake mirror (roughness 0.08 `metal_brushed` plane), toilet, urinal (+divider), hand dryer, dispensers, pedal bin, floor drain, janitor mop sink |
| `maintenance.js` | 54 | archive ROLLING RACK (2.2 m, end handwheel — landmark), server rack (3 emissive LED-front variants), electrical/transformer/HVAC/pump/water-heater plant kit, pipe runs (param length/count), fire extinguisher + glass cabinet, janitor kit, utility shelving (param fill), boxes/crates/pallets (incl. shrink-wrapped), dock leveler + shutter control, garage kit (cones, bumpers, tires, compressor, tool cabinet), copy-room kit, training kit (lectern, tables), hall bench + water fountain |
| `signage.js` | 14 | backlit NORTHSTAR DYNAMICS lobby logo (star-north mark copied from `ui/menus.js`, half-lit letter cells per bible), directory board, ceiling-hung wayfinding (double-sided), door plates beside **all 35 labeled doors** (auto-generated from `map.js DOORS`), dept plates, 6 original safety-poster designs, evacuation diagram **drawn from the real `ROOMS` rects per level**, corkboards with seeded layered papers, laminated notices, M/W pictograms, stairwell level plates, garage bay letters, tiny equipment/shipping labels, whiteboard scribbles |

All sign/poster/label art is original fiction (Northstar Dynamics, Frostbyte,
GlacierPure, "BLIZZARD PROTOCOL", division names) rendered into **one shared
2048×2560 paper atlas** (height-bucketed shelf packer, deduped by content key)
so the entire paper signage set is a single material.

### Draw-call strategy

- One paper-atlas `MeshStandardMaterial` for every non-emissive sign.
- Emissive canvases (vending front, server-rack fronts, logo) and specials
  (carafe gloss, cooler bottle, recycle blue, safety yellow…) are cached at
  module level, so `placeProps`' merge-by-material collapses repeats into one
  mesh per decorator section.
- Measured with the QA perf counter: my three decorators + static decal pass
  add **+64…99 draw calls** in the heaviest views. The base scene without
  this content already renders 258–1162 calls depending on view (shadow pass
  included), i.e. the <240 budget is exceeded scene-wide before any 3b
  content; flagged below for coordination.

## Rooms dressed (20 + global signage)

- **facilities.js** — break_room (kitchen run north wall, uppers flanking the
  0.85 sill windows, fridge/vending/cooler east, 2 tables, corkboard, bins;
  medkit 23.2,1.4 clear), restroom_m/w (stalls west, sinks + mirror corridor
  side, urinals M north), restroom_hall (pictograms, evac, bench, print),
  janitor (cart, mop sink, shelving, cones; door swing clear), copy_mail
  (work counter, mail sorter, cutting table, paper stacks, shelving,
  recycling; west windows clear), hallway_w (corkboard, plant_util, wayfind),
  storage_n (shelving rows, ladder, chair stack; ammo 21,8.8 reachable),
  facilities office (workbench, key cabinet, clipboard wall, boot tray,
  hooks), training (4×2 table rows facing north, stacked chairs, lectern,
  whiteboard, poster wall). Plus the global pass: lobby logo band + directory,
  door/dept plates everywhere, posters, evac diagrams, notices.
- **serviceAreas.js** — archive (4 rolling-rack rows E-W, 1.1 m aisles,
  reading table, step stool; hostage Reid 45.6,17.2 clear r=1.2), server_room
  (2×3 racks with LED fronts, CRAC, cable tray, UPS pair, KVM cart; aisles
  ≥1.1 m, both pickups reachable), mech_room (panel wall, transformer, pipe
  manifolds, bench, filter shelf), east_hall + north_corridor (fire cabinets,
  3+2 wayfinding signs, corkboard, bench, fountain, plants; 1.4 m lanes),
  stairwells (level plates, extinguishers, pipe runs).
- **basement.js** — service_corridor (locker bank, cones, cable tray, drain
  decals; 1.2 m lane), utility (2 water heaters, pump manifolds, workbench,
  drums, tool wall; medkit 19.2,1.2 clear), loading (dock leveler at shutter,
  pallets, crates, packing table, hand truck, shipping shelf, control box),
  garage (5 painted parking bays with 0.12 m stripes + bumpers along south
  wall, cones, tire stack, tool cabinet, compressor, oil stains;
  **extraction x 53–62 / z 4.5–11.5 and both door-to-van lanes untouched**).

Placement totals: 128 + 72 + 62 explicit placements plus the generated
35-door plate pass. All door spans ±0.9 m, patrol waypoints ±0.6 m, hostages
±1.2 m, pickups ±0.4 m and stair platforms verified against `map.js` data.

## Decal system (`src/world/decals.js`)

- `placeStaticDecals(world, group)` — ~75 quads merged into **one mesh / one
  draw call** off a 1024² alpha atlas (12 regions: carpet wear ellipses along
  main aisles, door-handle wall scuffs, threshold dirt, water stains, leak
  ring, tape residue, cable marks, fading vestibule footprint trail ×7 steps,
  oil stains, garage lane arrows + worn stripe, drain rings). Deterministic
  (`Rng(771003)` + fixed anchor list). `polygonOffset -2` planes at 0.005 —
  grazing-angle checked, no z-fighting.
- `spawnImpactDecal(surface, point, normal)` — EXACT signature for the VFX
  agent; 5 surface families (concrete/drywall/wood/metal/tile) as pooled
  `InstancedMesh` (24×5 = 120, oldest recycled), oriented to normal with
  `worldRng` rotation/size jitter. Module is import-safe (no world work at
  import; pools lazily attach to the group captured during the static pass —
  spawns before world build are safely ignored).
- `spawnBloodDecal(point, normal)` — 40-instance pool, dark desaturated pool
  sprite, returns early when `getSetting('reducedBlood')` is on.

## Verification

- **47 screenshots** in `artifacts/f3b_*.png` covering every checkpoint room
  plus close-ups (vending face, wayfind signs ×3, restroom interiors ×4,
  archive ladder, garage lines, loading interior, lobby logo, stair plates).
  Each was read; three rounds of fixes landed (floating dispensers, urinal
  depth, janitor overlap, box stack on packing table, cable-tray height,
  lobby logo re-laid out as a `band` variant to fit the bulkhead frieze,
  mug/snack sets re-seated on tables, wayfind canvas widened + auto-shrink
  font after a long-label overlap was spotted at `[37,12]`).
- **Console**: zero errors/warnings across the final screenshot batches.
- **Playwright**: `tests/02-movement-combat.spec.js` + `tests/03-mission.spec.js`
  — all 10 scenarios pass with this content in (S40 escort route through the
  basement intact). Note: individual runs on the shared VM intermittently
  time out (S12/S13 once, S43 twice) purely from CPU contention — several
  sibling agents run headless browsers concurrently (load avg ≈ 12–14); each
  affected test passes on re-run / passed in a full run. A manual S43 probe
  confirms the scenario itself is healthy with 3b content in: 24 chunks of
  `advanceTime(30000)` reach `mode=defeat`, ~1 s per chunk, except one random
  49 s stall (host CPU starvation) that is what breaks the 120 s timeout.
- **Perf**: 3b delta +64…99 draw calls in the heaviest views (see strategy
  above).

## Discrepancies / coordination notes

1. **Draw-call budget**: the <240 target is already exceeded by the base
   scene (258–1162 depending on view, shadow pass included). My content is
   material-cached and section-merged (+64…99). A scene-wide pass (shadow
   caster culling / atlasing across owners) is needed to reach 240 — outside
   any one owner's files.
2. **`whiteboard_wall` id**: sibling 3a renamed theirs to
   `whiteboard_wall_office`; mine keeps `whiteboard_wall`. No collision.
3. **VFX contract**: import `spawnImpactDecal(surface, point, normal)` /
   `spawnBloodDecal(point, normal)` from `src/world/decals.js`. `surface`
   accepts the collider `surface` strings (`concrete`, `drywall`, `wood`,
   `metal`, `tile`; unknown → concrete). Runtime pools cap at 120 + 40.
4. **Restroom stall tops** overlap the 1.8 m frosted-window sill by ~0.1 m on
   the west wall — reads fine (windows are frosted); noted in the manifest.
5. **Copier**: per spec I did not depend on 3a's electronics copier; copy_mail
   is dressed with my own work-counter/sorter/cutting-table kit.
