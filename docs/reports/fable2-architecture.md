# Fable 2 — Architecture & Environmental Composition (Wave A detail pass)

Owner: Fable 2. Files touched: `src/world/archdetail.js`, `src/world/exterior.js`,
`src/world/lighting.js`, `assets/manifest/architecture.js`, this report.
Nothing outside the ownership list was edited; `builder.js` and `map.js` are
untouched.

## Summary

The structural graybox now reads as a built, maintained (and in the basement,
less-maintained) corporate facility. All detail geometry is merged through a
shared `DetailBatch` (mirrors the builder's `Batch`, plus custom-material,
cylinder/cone/disc support and world-space UV baking). The two detail passes
add **39 meshes / draw calls total** (measured at runtime via
`window.__f2Meshes`), inside the ≤40 target. Emissive fixtures share **5
materials** (`fix_cool`, `fix_warm`, `exit_green`, `lamp_cool`, `glow`),
inside the ≤6 budget. All randomness is `Rng(20260214)` / `Rng(20260221)` —
fully deterministic.

## A. Interior detail (`archdetail.js`)

1. **Baseboards** — 0.09 m tall, 0.012 m proud, `baseboard` material, both
   sides of every interior wall run (from `world._wallRuns`), interrupted at
   every floor-reaching hole (from `world._holes`). Skipped in garage/loading
   (bare industrial concrete) and suppressed where stair openings meet floors.
2. **Ceilings by zone**
   - *Tile zones* (office/lobby/exec/break/rr/corridor/server): recessed
     0.6×1.2 m troffers — slim aluminum trim frame + emissive lens
     (`@fix_cool` 2.35, exec rooms `@fix_warm`) on a per-room grid
     (`fixtureGrid`, ~3.4 m spacing). Point lights in `lighting.js` sit on
     this grid. Deterministic water-stained tiles (cloned `ceiling_tile`,
     tinted) in copy/mail, break room, waiting, east hall.
   - *Service zones* (basement/garage/loading/mech/stair/janitor/archive):
     per-room specs of painted duct runs (`metal_painted`), thin conduits
     (`metal_dark`), red sprinkler mains with drop heads (`@pipe_red`), and
     bare strip lights (housing + emissive tube). Everything ≥2.35 m above
     the room floor — no ducts below 2.2 m, so no duct colliders needed.
3. **Columns** — cubicles: 0.35 m concrete on a ~7 m grid with painted lower
   band; lobby: two 0.32 m steel columns with warm wood wrap; garage: 0.4 m
   concrete with safety-yellow base band every ~6 m. Every column has an
   AABB collider and was placed ≥1.2 m clear of all door spans; verified
   against escort/patrol routes (S40 passes).
4. **Window dressing** — laminate sill boards + 0.9 m fin-tube radiator
   covers (`metal_painted`, 0.22 m deep, flush to wall, AABB colliders)
   under every exterior window; `interiorTo` windows skipped, low-sill
   glazing skipped.
5. **Egress signage** — emissive green EXIT boxes above `d_plaza_vest`,
   `d_vest_lobby`, both stairwell doors, garage doors and the basement
   corridor doors (double-sided where the route runs both ways); twin-head
   emergency light units in both stairwells and the basement
   corridor/utility/loading.
6. **Stair upgrades** — aluminum nosing strips on every tread (flush; step
   height unchanged, S12 passes), dual handrails with posts on both flights,
   safety-yellow warning lines at top and bottom landings.
7. **Parapet caps** — continuous `metal_painted` coping with a snow cap along
   exterior wall tops; reads from the plaza and the courtyard.

## B. Exterior (`exterior.js`)

1. **Entrance** — dark-steel canopy (posts collidable) with snow-loaded
   panel over the vestibule doors, warm wall lamps either side, and a
   Northstar-blue accent band across the facade.
2. **Plaza furniture** — two snow-capped benches, bike rack, 9 m flagpole
   with stylized flag, lamp posts (emissive heads + additive glow discs —
   zero dynamic lights), bollard row along the south gate, trash bin,
   planters with snow-capped shrubs. Every solid piece has an AABB collider;
   the spawn→door sightline stays open.
3. **Snow & trails** — trampled-snow strips (polygon-offset planes ~0.01
   above grade) from the gate to the entrance and around the plaza; drift
   variation against the facade.
4. **Backdrop** (all beyond map-bounds colliders) — ring of snowy conifers
   (cone stacks), four fogged low-poly building silhouettes, a north parking
   area with five snow-covered cars (visible from break/training/facilities
   windows), and a perimeter fence.
5. **East courtyard** — paved-under-snow court with a bare tree, benches,
   planters, and a snow-capped star obelisk (Northstar motif); composed for
   the exec-office and east-corridor window views.
6. **Garage ramp** — the extraction shutter previously opened onto void.
   Added a 20 m stepped concrete ramp climbing east to grade between
   retaining walls, snow-dusted, with colliders sealing every path past the
   ramp edges. The extraction zone (x 54–61, z 5–11) is untouched and the
   S40 victory sequence reads correctly (`f2_extraction_open.png`,
   `f2_ramp_view.png`).
7. **Snow-field repair** (builder-core issue, fixed via my geometry domain):
   `builder.js#buildExterior` emits one 220×190 m snow plane at y=-0.04 that
   spans the *entire* map — including both open stair shafts, where it
   rendered as a bright ceiling. Since it is merged into the world `snow`
   mesh, its four corner vertices are the only vertices beyond |x−32| > 90;
   `fixSnowField` sinks exactly those to y=-4.6 and lays a fresh
   non-overlapping ring of snow planes with holes under the building
   footprint and the ramp trench, plus a concrete patch at the NW basement
   landing.

## Break-room "stray concrete strip" — root cause

Reported as a concrete strip crossing the break-room vinyl (rect 22,0–34,10).
It is **not** a stair platform or roof slab: `builder.js#buildWalls` builds
level-b (basement) walls from y=0.02 down, i.e. their tops rise **2 cm above
the ground-floor slab** (slab top y=0). Wherever a basement wall line crosses
under a ground-floor room with no ground wall directly above (utility/loading
partition under the break room at z=8 and x=30), the wall top shows through
the floor as a concrete strip. The "diagonal" look in the original screenshot
was two perpendicular strips meeting under a wide-angle camera. Fix (in my
domain, no `builder.js` edit): `archdetail.js#coverBasementWallLips` detects
every such crossing and lays a flush 0.28 m cover strip in the *room's own
floor material* with world-space UVs, so patches blend invisibly into the
slab. Verified in `f2_break_fixed.png` and the full checkpoint sweep.

Same-class issue in the lobby: neighbouring 3.0/3.2 m roof slabs protrude
into the 4.4 m lobby volume as dark bands. Covered with an intentional
`drywall_accent` bulkhead band around the lobby perimeter
(`addLobbyBulkhead`).

## C. Lighting (`lighting.js`)

Cold blizzard-overcast rig: hemisphere 0xc2d4e2/0x5a6068 @1.18 (ceiling
readability with zero point lights), low SE winter sun (position 74,26,66 →
target 32,0,20) so window pools land on south/east floors, sky/fog 0x93a8bc
(near 28 / far 130 — backdrop silhouettes sit half-fogged).

16 point lights, priority-sliced to the quality budget (4/8/12/16). All
positions sit on the archdetail fixture grid, ≥0.6 m from walls, decay 2.

| # | pr | name | pos | color | i / d | serves |
|---|----|------|-----|-------|-------|--------|
| 1 | 0 | lobby | 31, 3.8, 35 | 0xd9e2e6 | 60 / 18 | hero path |
| 2 | 0 | cubicles_e | 30.8, 2.6, 22 | 0xdfe8dd | 42 / 14 | hero path |
| 3 | 0 | garage_w | 49, −1.0, 8 | 0xd8dfe4 | 40 / 14 | hero path / extraction |
| 4 | 0 | garage_e | 59, −1.0, 8 | 0xd8dfe4 | 36 / 13 | hero path / extraction |
| 5 | 1 | conference | 48.7, 2.6, 39 | 0xe8e4d2 | 30 / 12 | objective |
| 6 | 1 | vestibule | 31, 2.85, 42 | 0xdde6e8 | 22 / 10 | spawn approach + security |
| 7 | 1 | service_nav | 30.5, −1.25, 10 | 0x9adf9a | 18 / 15 | basement corridor (green nav) |
| 8 | 1 | archive | 44, 2.6, 20 | 0xdfe4da | 26 / 11 | objective route |
| 9 | 2 | server_cool | 60, 2.5, 18 | 0x86b8ff | 24 / 9 | server room (cool blue) |
| 10 | 2 | exec_warm | 59, 2.6, 39 | 0xffd9a8 | 22 / 10 | exec suite (warm) |
| 11 | 2 | corridor_e | 52, 2.5, 12 | 0xd8e4d8 | 26 / 14 | east hall + IT approach |
| 12 | 2 | break | 29.5, 2.6, 5 | 0xe4e8dc | 26 / 11 | break room / training edge |
| 13 | 3 | waiting | 16, 2.6, 34 | 0xe0e6e0 | 20 / 11 | waiting / west hall |
| 14 | 3 | it | 52, 2.6, 20 | 0xdfe8e0 | 20 / 10 | IT room |
| 15 | 3 | stairwell_warm | 58, −0.5, 26.5 | 0xffc890 | 16 / 10 | east stairwell (emergency warm) |
| 16 | 3 | loading | 37, −1.0, 4 | 0xd8dcd2 | 20 / 10 | loading + utility spill |

Rooms beyond the 16-light cap (restrooms, mech, copy, training, facilities,
storage, janitor, utility interior) are carried by emissive troffers/strip
tubes + the 1.18 hemisphere — verified readable in the checkpoint sweep
("dim but readable" for basement per the visual bible). Scenarios
`default` / `neutral` / `emergency` / `dusk` all work (`setScenario`
restores per-light color/intensity from the plan on return to default).

## Verification

- **Checkpoint sweep** — all 29 checkpoints captured and reviewed
  (`artifacts/f2_cp_*.png`, plus `f2_spawn`, `f2_a_*` close-ups,
  `f2_rr_ceiling2`, `f2_break_fixed`, `f2_extraction_open`, `f2_ramp_view`,
  `f2_stats` — 39 shots). Zero console errors/warnings on every capture.
- **Tests** —
  `npx playwright test tests/03-mission.spec.js --grep "S40"` → **1 passed**
  (full rescue + extraction with all new colliders live).
  `npx playwright test tests/02-movement-combat.spec.js --grep "S12"` →
  **1 passed** (stair traversal with nosings/handrails).
- **Perf** — 39 added draw calls (≤40 target), 5 emissive materials (≤6),
  no per-frame work added (snowfall VFX intentionally left to Fable 4's
  Wave B).

## Remaining discrepancies / notes for other Fables

- `builder.js#buildWalls` basement-wall 2 cm lip and the oversized roof
  slabs are builder-core; my covers are flush cosmetic patches. If builder
  is ever revised to clamp level-b walls at y=0, `coverBasementWallLips`
  and `addLobbyBulkhead` become harmless no-ops visually.
- Restrooms/utility/mech rely on emissives + hemisphere (16-light cap). If a
  future preset raises the budget, next lights to add: restroom hall,
  utility work light, mech room.
- The `@glow` discs under plaza lamps are additive-transparent and skip
  shadow casting by design; at extreme grazing angles they can read as faint
  halos — accepted (cheaper than real lights).
- Exterior backdrop is fog-tuned for far=130; if Fable 4's snowfall changes
  fog, re-check silhouette readability from the plaza.
