# Fable 3a — Core Office Prop Library & Main Office Dressing

Owner: fable3a · Files: `src/world/props/{furniture,electronics,clutter}.js`,
`src/world/decorate/{lobbyFront,officeFloor}.js`, `assets/manifest/props-core.js`, this report.

## What was built

**68 props** registered through `registerProp()`, all with floor pivots,
real-world scale, local-AABB colliders for anything ≥0.3m, and deterministic
rng variation:

| Module | Count | IDs | Contents |
|---|---|---|---|
| `furniture.js` | 26 | FURN-001…026 | reception L-desk, standard/exec desks, composed cubicle workstation (1.35m fabric panels + desk + chair + monitor), 4.2×1.4 boat conference table, task/conference chairs (incl. tipped variant), armchair, 3-seat sofa, coffee/side/console tables (console has an emissive-shade lamp — no extra lights), filing cabinets (2/4-drawer, open-drawer option), mobile drawer unit, open shelving (office/parts styles), bookcase w/ binders, whiteboard stand + wall whiteboard, coat stand, credenza, bench, stanchion pair w/ sagging rope, entry mat runner, floor + desk plants |
| `electronics.js` | 20 | ELEC-001…020 | 24" monitor (6 canvas screen variants), dual-monitor arm, PC tower w/ LED, keyboard w/ key texture, mouse+pad, laptop (open/closed), desk phone, headset stand, dock, desk printer, 1.2m floor copier w/ glowing panel, ceiling projector + wall projection screen, wall clock (hands at 07:42), TV panel (news dashboard), security monitor wall (3×2 greyscale cam feeds), UPS box, network switch shelf w/ static LED dots, floor cable bundle, wall cable tray |
| `clutter.js` | 22 | CLUT-001…022 | paper sheet/stack, folder stack, binder row, notebook+pen, pen cup, stapler, tape dispenser, mugs (2 tints), lidded coffee cup, translucent water bottle, photo frame, sticky-note cluster, desk organizer, ID badge (ice-blue lanyard — red is reserved for danger), backpack, briefcase, umbrella, wall calendar, magazine stack, tray+decanter, labeled crate stack |

### Shared-material strategy (draw calls)

All screens live in **one 1024px emissive canvas atlas** (`prop_screens`,
emissiveIntensity 1.6): spreadsheet, ops dashboard, code editor, memo,
NorthstarOS login, off-dark, 6 camera feeds, TV news, projection slide, clock
face, lamp gradient, copier panel, LED strips. Printed matter (whiteboard
scribbles, magazine covers, calendar, photo, shipping label, memo text) shares
**one print atlas** (`prop_print`). All flat-colored parts (foliage, binders,
notes, coats, rope, mugs…) share **one vertex-tinted material** (`prop_tint`)
so `placeProps` merges them into a single batch per section. Everything else
uses `getMaterial()` from the shared library. All fictional branding
("NorthstarOS", "NSN-24", "FY26 · Q3 REVIEW — NORTHSTAR DYNAMICS").

## Rooms dressed (9)

**`lobbyFront.js` — 79 placements (44 solid / 35 tiny)**
- **lobby**: reception L-desk facing the vestibule doors w/ login monitor,
  phone, badge, clutter; credenza + printer along the north wall; two
  armchair+coffee-table waiting groups on the west; stanchion pair near
  reception; mat runner from the doors; floor plants.
- **vestibule**: two walk-off mats, slat bench, leaning umbrella, blown-in
  paper sheets.
- **security**: desk + dashboard monitor facing the 3×2 security-cam wall on
  the south wall, tipped task chair, filing cabinets (one drawer open), switch
  shelf, calendar, backpack. Medkit/ammo pickups untouched (±0.4m clear).
- **waiting**: 3-seat sofa + coffee table w/ magazines, two armchair pairs w/
  side tables, TV panel on the west (x=14) wall, wall clock, coat stand,
  plants, briefcase.

**`officeFloor.js` — 274 placements (121 solid / 153 tiny)**
- **cubicles**: 12 workstations in 4 pods (2×2, 2×1, 2×2, 2×1) with ≥1.6m
  aisles; door lanes at z=30 x28–32 and x24–26/x34–36 at z=14 kept clear, plus
  the 1.4m main aisle; 4 perimeter desks, filing-cabinet clusters, floor
  copier corner (SE), whiteboard stand, wall clock, plants, cable bundles
  along the north wall. Panels give crouch cover; the two marked corridors
  stay long-sightline.
- **conference**: boat table at (46.3,38.6) + 10 sled chairs, credenza,
  projection screen (west wall) + ceiling projector, "Q3 ROLLOUT" wall
  whiteboard (east), open glowing laptop, table clutter. Voss hostage spot
  (48.5,41.6)±1.2m and the guard patrol loop verified clear.
- **exec_corridor**: two console tables w/ emissive-shade lamps, bench w/
  briefcase, plants; central 1.4m escort lane untouched.
- **exec_office**: exec desk at (56.8,38.5) — moved west off the enemy patrol
  waypoint at (58.5,38) — leather exec chair, 2 guest chairs, 3-unit bookcase
  wall, sofa + coffee table, credenza w/ tray+decanter, plants.
- **it_room**: 4 dual-monitor workbenches (chairs tucked under so the patrol
  line x≈49.6 routes through), parts shelving, labeled RMA crate stack, wall
  cable trays + switch shelf + UPS, "STANDUP — WK 47" whiteboard, **low
  0.45m cabinet under the keycard pickup at (53.4,16.2)** so the bobbing
  pickup (y≈0.5±0.05) reads as sitting on it without clipping.

## Verification

Screenshots (all probed with zero console errors): `artifacts/f3a_baseline*.png`,
`f3a_cubicles*.png`, `f3a_cubicles_final.png`, `f3a_lobby*.png`,
`f3a_security2.png`, `f3a_waiting*.png`, `f3a_vestibule*.png`,
`f3a_conference1-3.png`, `f3a_execcorr.png`, `f3a_exec1.png`, `f3a_it1-3.png`,
`f3a_easthall*.png`.

Scale sanity confirmed in-shot: desk tops ~0.75m (hip height), monitors
~0.42m panels, cubicle panels chest-high crouch cover, keycard on the 0.45m
cabinet, nothing floating or intersecting, screens glowing.

**Tests**: `tests/02-movement-combat.spec.js` + `tests/03-mission.spec.js` —
**all 10 pass**. (First combined run had 3 failures, every one
`Execution context was destroyed … navigation` — Vite HMR full-reloads caused
by parallel agents saving files mid-test, not placement issues; each passed on
re-run: 02 spec 6/6, 03 spec S31+S40+S42 3/3, S43 1/1.)

**Perf** (cubicle checkpoint view, yaw 0):

| | drawCalls | triangles |
|---|---|---|
| baseline before this work | 371 | ~42k |
| after full dressing | 474 | ~122k |

Props add **~103 draw calls** for both fully-dressed sections (static
per-material merges + shadow pass + clutter buckets; all small items are
`tiny:true` and distance-cull at 34m).

## Discrepancies / coordination notes

1. **The <220 drawCalls target is unreachable as specified** — the *empty*
   cubicle view already measured 371 before any props existed (weather,
   characters, architecture). My contribution is +103. If the global budget
   matters, the win is elsewhere (e.g. shadow-pass load); flagging to the lead.
2. **Created `src/world/decals.js` stub (outside my seven files, required)** —
   `src/fx/vfx.js` dynamically imports it and Vite hard-fails (500, app
   unloadable) when the file is missing. It exports empty
   `spawnImpactDecal`/`spawnBloodDecal`. The Fable 3 decal owner should
   replace it keeping those names.
3. **`whiteboard_wall` prop id was already registered** by props-facilities
   signage; mine is registered as `whiteboard_wall_office`.
4. **placeProps ground-snap gotcha**: a wall-mounted prop whose pivot sits
   exactly on a wall collider boundary snaps to the wall TOP (security wall
   ended up above the ceiling at y≈3.16). Keep wall-prop pivots ≥4cm inside
   the room (security wall placed at z=43.8 against the z=43.84 face).
5. Test runs are flaky **only** while other agents are saving files (HMR
   full reload destroys the page mid-eval). My probe wrapper stubs
   `/@vite/client` to survive this; the shared playwright specs do not.
