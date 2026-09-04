# Technical validation — ISD *Redoubt* demo (Three.js r185 + Vite)

Validator run on branch `cursor/technical-validation-d67b` (source identical to `cursor/star-destroyer-ship-a618`
@ `7af90b0b`; only `tools/` and `reviews/` were added). Dev server `http://127.0.0.1:5173/`, headless Chrome
141 on SwiftShader (software GL). New scripts: `tools/walktest.mjs` (doors / spawn walks / lifts / stairs) and
`tools/validate_tech.mjs` (boot, transitions, streaming, leak probe, fighters, sync). Raw logs, JSON and the
screenshots referenced below are in `reviews/evidence/` (copied from `/tmp/val` and `shots/validator`).

Measurement caveats — read before the numbers:

- Software GL: a frame costs 1–16 s. Every wall-clock figure (boot, transition, frame time) is *relative*;
  the machine also carried 3–5 other Chrome instances from parallel agents (load average 13–19 during the
  runs, 6 at the end). Draw calls, triangles, lights, counts, positions and pass/fail results are deterministic
  and unaffected.
- `jsHeapMB` is `performance.memory.usedJSHeapSize` after `window.gc()` (`--js-flags=--expose-gc`,
  `--enable-precise-memory-info`). `geometries`/`textures`/`programs` are `renderer.info.memory/programs`, i.e.
  GPU-side counts of *uploaded* resources.
- Navigation tests freeze the app's `requestAnimationFrame` loop and drive the simulation with
  `debugAPI.nudge/simulate` (the same code path the frame loop uses), so they are exact and fast.

## 1. Summary

| # | Area | Result | Evidence (one line) |
|---|---|---|---|
| 1 | Loading | **PASS** | `vite build` 622 ms → `dist/assets/index-1RYNZkFK.js` 1.48 MB (481 kB gz) + 6.8 kB CSS; `smoke.mjs dist` OK, 0 page errors; 0 console errors; 13 warnings (9× `toNonIndexed`, 4× GL ReadPixels from the test harness). Boot 7.1–15.5 s over five page loads at load 6–18 (5.6 s in `perf/integrated_v1` at low load); procedural materials 71–78 % of boot, `hullPlate` alone 52–62 % of material time. |
| 2 | Collision / navigation | **FAIL** | Doors 62/66 directions pass; **`hg_lobby` is a 2 m floor void (player falls out of the ship, both directions)**; **`hg_cargo` arch blocked on its axis** (stair tower + ops banks + cart, 9–13 of 20 one-metre lanes passable). Lifts 24/24, stairs 10/10. Spawn walks: 1 fall (hangar well recovery lane), 8 straight-line obstructions (routable). |
| 3 | Camera transitions | **PASS** | 5 `board()` (default, `ext_far`, after 3 exits) land on the bridge at (0, 210, 176.5) yaw 0; 4 `exitToExterior()` put the camera 115–403 m from the nearest room box, outside the hull; 0 NaN frames, 0 black canvas frames in 230 sampled frames. |
| 4 | Rooms / streaming | **PARTIAL** | `ensureCluster`: hangar 1399 ms, engineering 909, crew 1379, tower 1054 (2.3× load-inflated). All four built: 34 rooms, heap 328 MB; `trimClusters(2)` → 21 rooms / 2 clusters, heap 251 → 244 MB, geometries 777 → 559 (**drops**). But: a built-but-never-visited cluster is never trimmed; `releaseCluster` leaks GPU geometries for `ctx.add()` objects (hangar +14 / rebuild); `captureEnvironment()` leaks one PMREM texture per cluster change; ~50 MB heap retained after a cluster's first visit. |
| 5 | Fighters | **PASS** | `traffic_test.mjs` 19/19. 120 s patrol: 473 flying samples (349 patrol), 0 inside any room box, 0 inside the hull, shaft legs inside the well footprint. |
| 6 | Sync | **PARTIAL** | Snapshot 1.1–1.25 kB. Applied on a fresh page: doors identical, 16 fighter states identical, max pose error 0.0000 m, alert 1→1, +5 s replay 0.0000 m. But `DoorSystem.apply()` does not re-pose slabs / colliders (open door renders closed and blocks); `lift` is snapshotted but never applied; `locked`/`forceOpen` not in the snapshot. |
| 7 | Asset references | **PASS** | No `url()`, `@font-face`, loaders, `fetch`, `new Image/Audio`; system font stacks only. 92 requests at load, all same-origin (1 doc, 90 module scripts, 1 CSS). `dist/assets` = 1 JS + 1 CSS. The 2 URL strings inside the bundle are inert (SVG namespace in three, a citation in the n8ao shader). |
| 8 | Extensibility (static) | **PARTIAL** | `traffic` API complete and tested; `SYSTEMS` filled; room contract coherent; all 34 rooms have audio profiles. Gaps: `flight.js` is dead code; no `Door.lock()/unlock()`, no door event bus; lifts have `snapshot()` but no `apply()`; `ctx.add()` has no dispose path; controlled fighters escape pool accounting; no snapshot schema version. |
| 9 | Mobile | **PASS** (2nd run) | `mobiletest.mjs` 11/11 (first run died in `page.screenshot` after check 8: 30 s default timeout at load 18 — harness limitation, see D-15). Portrait shot shows the bridge glazing as a black slab — by the exterior's design (backdrop plane), see D-8. |
| 10 | Performance | **FAIL vs PLAN §9** | 8 of 19 views over budget: calls > 250 in bridge 411, bridge_window 383, cmd_corridor 427, hangar 354, hangar_well 447, crew_corridor 380; tris > 1.2 M in hangar 1.88 M, hangar_well 2.26 M; exterior close ext_tower 538 / ext_close 515 calls (> 400) — 330 / 307 without the four "peeked" tower rooms, which the tower's own opaque backdrop hides (raycast: 98 % of glazing rays never reach an interior mesh). Lights: 14 room lights + sun + hemi = 16 visible vs "≤ 12 point/spot". Heap ≤ 247 MB (budget 600) ✓. Programs grow 43 → 343. |

Ranked defects are in §12; D-1 (`hg_lobby` floor void) is the release blocker, D-2 (`hg_cargo`) the other navigation
failure.

## 2. Loading

Commands: `npx vite build` (`reviews/evidence/build.log`), `node tools/smoke.mjs dist` (`smoke.log`),
`node tools/validate_tech.mjs` (`validate_tech_main.log`), `node tools/perf.mjs validator`, `tools/view.mjs`.

```
vite v8.2.2 building client environment for production...  ✓ 97 modules transformed.
dist/index.html                     2.08 kB │ gzip:   0.80 kB
dist/assets/index--YF8Tg75.css      6.76 kB │ gzip:   1.94 kB
dist/assets/index-1RYNZkFK.js   1,482.92 kB │ gzip: 481.46 kB      ✓ built in 622ms
smoke stats {"mode":"exterior","calls":131,"triangles":429188,"geometries":86,"textures":43,"programs":43, ...
  "boot":{"space":1547,"exterior":351,"boot":10880,"totalMs":10880}, "jsHeapMB":57}   smoke OK   exit=0
```

Boot timings (`getStats().boot`, ms) across the five page loads of this session and the reference report
("ready" = `page.goto` → `debugAPI.ready`, which includes the first rendered frame):

| run (load avg) | ready (`debugAPI.ready`) | boot.total | materials Σ | hullPlate | space | exterior |
|---|---|---|---|---|---|---|
| `perf/integrated_v1` (reference, low load) | 10 284 | 5 586 | 4 266 | 2 441 | 980 | 137 |
| `view.mjs` (`view_gap2.log`, load ≈ 6) | 16 546 | 7 146 | 5 066 | 2 656 | 1 457 | 232 |
| `view.mjs` (`view_gap.log`, load ≈ 12) | 22 101 | 9 176 | 7 026 | 3 859 | 1 426 | 327 |
| `smoke.mjs dist` (load ≈ 16) | – | 10 880 | 8 504 | 5 303 | 1 547 | 351 |
| `validate_tech.mjs` (load ≈ 16) | 26 631 | 12 689 | 9 694 | 5 545 | 2 056 | 406 |
| `perf.mjs validator` (load ≈ 18) | 35 623 | 15 492 | 12 139 | 7 013 | 2 432 | 365 |

Relative structure is stable: procedural materials are 71–78 % of `boot.total` and `hullPlate` alone is
52–62 % of the material time (37–49 % of the whole boot; one 2.4–7 s main-thread task before the first frame). Long tasks after `ready` (validate_tech):
`[{"t":12752,"dur":413},{"t":13166,"dur":13451},{"t":26627,"dur":1205},{"t":27834,"dur":1275},{"t":29110,"dur":1721}]`
— the 13.4 s task is the first frame (43 program compiles + first SwiftShader render); it is what separates
`boot.total` from `ready`.

Console over the whole validate_tech session (two pages, ~50 min): `{"debug":4,"warning":13}`, **0 errors,
0 page errors**. Unique warnings:

- 9 × `THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.` — emitted by
  `src/rooms/tower/tactical.js:337,424,425` and `src/rooms/tower/bridge.js:684,688` (they call
  `.toNonIndexed()` on already non-indexed geometry; `src/core/kit.js:224` guards it correctly). → D-12
- 4 × `GL Driver Message … GPU stall due to ReadPixels` — caused by `debugAPI.capturePixels` used by the
  sampler / smoke tool, not by the app's own frame.
- No texture-size, shader-compile or `Material.onBeforeCompile` warnings.

## 3. Collision / navigation (`tools/walktest.mjs`)

Method: for every door in `layout.DOORS` and both directions, the player is teleported 3 m in front of the door
plane inside room A (`setView({mode:'interior', pos, yaw})`, so the cluster is built and the room is current),
then walked toward B in 0.5 m `nudge` steps with `simulate(0.1)` between steps (doors, lifts and room streaming
advance). Pass = player ≥ 1 m past the door plane and `rooms.roomAt` reports B. Recorded per direction: distance
walked, distance at which the door's `target` became 1 ("open at"), distance at which its collider was
disabled ("unblocked at"), colliders hit, gap detection (a `fall()` probe every step: player y < floor − 1 →
GAP). From the doorway the player then walks the straight line to B's `spawn` (report: ok / blocked by which
collider / deflected / fell). Static probe: colliders standing 0.48–1.85 m above the sill within 2 m in front of
each door on both sides. Three doors use documented approach overrides because the generic "3 m in front of the
door centre" point is not walkable by design (`br_tac`/`br_nav`: 3 m in front is the bridge crew pit → outer
ledge x ±12..14; `hg_fc`: the flight-control front is glass with a 1.2 m gap at z −11.2..−10). The generic
approach was still run for those and logged as INFO.

Result: **66 door directions, 62 PASS, 4 FAIL** (full table in §3.4).

### 3.1 FAIL — `hg_lobby` (hangar ↔ hangar_lobby, blast door at z −90): floor void

```
FAIL hg_lobby  blast  hangar       → hangar_lobby  {"y":-56.1,"onGround":false} GAP {"at":[0,-40,-90.68], ...}
FAIL hg_lobby  blast  hangar_lobby → hangar        {"y":-56.1,"onGround":false} GAP {"at":[0,-40,-91.5],  ...}
```

`hangar` box is z −90..70 and `hangar_lobby` is z −110..**−92**; the door plane is at z −90 (`layout.js:237`).
Every other lobby/corridor pair shares its edge (212, 262, −122). Here the 2 m × 6 m strip z −92..−90,
x −3..3 belongs to neither room: `BuildContext.shell()` floors exactly `def.box`, `buildLobby` floors its own box,
and unlike `tactical.js` (`doorPocket`), `reactor.js` (airlock lining) or the hangar arches, nobody builds a
pocket. The `doorFrame` hazard sill is a 8 mm visual box without a collider. The player steps off the lobby
threshold (or off the hangar floor) and free-falls; the safety tether only fires at **y < −400**
(`player.js:167`), i.e. after a 360 m fall from the −40 deck. The lobby is the hangar deck's only turbolift
access, so the hangar cluster cannot be reached or left on foot without falling.

Evidence: `reviews/evidence/hg_lobby_void_from_lobby.png` (standing at z −93.6 looking down: the black strip
between the lobby threshold and the door sill with stars showing through), `hg_lobby_fall_from_hangar.png`
(after the fall: hull underside and planet from below).

### 3.2 FAIL — `hg_cargo` (hangar ↔ cargo_bay, arch x 40, z −50..−30): approach blocked

```
FAIL hg_cargo arch hangar    → cargo_bay {"at":[36.88,-40,-40], "note":"walked 14 m without entering cargo_bay",
      "hits":["stair_side[37.2,-40,-40.8→37.4,-30.8,-31.2]","cart[38.07,-40,-40.39→38.87,-39,-39.76]"]}
      lane scan: span z -50..-30 → passable lanes -49.5,-48.5,-47.5,-45.5,-41.5,-33.5,-32.5,-31.5,-30.5;
                 blocked -46.5,-44.5,-43.5,-42.5,-40.5,-39.5,-38.5,-37.5,-36.5,-35.5,-34.5
FAIL hg_cargo arch cargo_bay → hangar    {"at":[39.19,-40,-39.87], "hits":["cart[...]","cart[...]"]}
      lane scan: passable -49.5..-45.5, -41.5, -39.5, -38.5, -34.5..-30.5; blocked -44.5,-43.5,-42.5,-40.5,-37.5,-36.5,-35.5
static: hg_cargo side hangar 5 collider(s): computer[39.11,-40,-45.1→39.75,-37.6,-41.9];
        computer[39.11,-40,-38.1→39.75,-37.6,-34.9]; cart ×3 [38.07..39.16, -41.13..-39.76]
```

`starboardStrip()` in `src/rooms/hangar/hangar.js` places the scissor stair tower at x 32..40, z −46..−29
(`props.stairs` at (36, −31.2) climbing to z −40.8, landing z −46..−40.8, tower columns at z −46.3 and −25) —
i.e. exactly in front of the 20 m cargo arch — and puts two 3.2 m `computerBank`s **inside the arch opening**
(against `xw − 0.6` at z −43.5 and −36.5) plus `toolCart(38.6, −40.4)`. The middle 12 m of the arch is
unreachable from the deck; the remaining lanes are the 3–4 m strips at both ends, which the lane scan confirms
(the z −33.5..−30.5 lanes are only reachable after climbing onto flight A's treads). Screenshot:
`hg_cargo_blocked_from_hangar.png` (player at the failure point, arch visible behind the ops bank and the rail).

### 3.3 Spawn walks, blockers, lifts, stairs

Straight-line walks from the doorway to the destination room's `spawn`: 53 of the 62 directions that got
through the door reached it (the 4 failing directions never reached the doorway, so no spawn walk was run);
the 9 that did not:

| destination via door | result | interpretation |
|---|---|---|
| hangar via `hg_shuttle` | **FELL** at (−3.95, −40, 49.39), y −56.1 after 20 m | the line from the shuttle-bay door (z 70) to the hangar spawn (−30, −80) crosses the well's aft rim through the unrailed recovery lane (x −10..10 at z 50); the deck ends without any guard → 360 m fall to the tether. **Hazard** (D-6). |
| bridge via `br_tac` / `br_nav` | deflected 12.95 m short at (∓12.55, 210, 196.8) | the pit railing; circulation is the outer ledge → walkway. Not a defect. |
| nav_station via `br_nav` | deflected 0.41 m short | console beside the spawn. Cosmetic. |
| hangar via `hg_maint_a` | blocked 20.3 m short by `cradle[-34.5..-27.5, -61.4..-60.1]` | maintenance cradle on the direct line; routable. |
| hangar via `hg_maint_b` | blocked 40.9 m short by 3 `cart` colliders at x −34.6..−33.3 | tool carts on the line; routable. |
| hangar via `hg_repair` | deflected 58.4 m short at (24, −40, −57.8) | well railing; routable. |
| hangar via `hg_fc` | blocked 71 m short by the gallery railing / column | spawn is on the deck (y −40), the door is on the gallery (y −22): expected. |
| engineering via `eng_ctrl_reactor` | blocked 19.7 m short by `console[-0.95..0.95, 293.5..294.35]` | a console sits on the door axis 5.5 m from the airlock; routable, but the spawn view is blocked. |

Colliders within 2 m in front of a door (static probe, 8 door sides): `br_tac`/`br_nav` bridge side —
pit railing (1.8 m ledge; by design); `corr_off` officers side — two partitions (an entry vestibule; fine);
`hg_cargo` hangar side — 2 computer banks + 3 carts (**real blocker**, above); `hg_fc` both sides — chair,
glass front, consoles (glass front by design); `crew_corr_conn`/`conn_fwd` connector side — the connector's own
side walls + a cabinet at the edge (lateral, not in the path). Only `hg_cargo` blocks passage.

Blast-door timing (not a failure, a UX nit): blast doors open at 0.7/s and their collider drops at openness 0.8
(1.14 s); the 3.2 m trigger is reached in 0.76 s walking (4.2 m/s) or 0.4 s sprinting, so the player bumps into
every blast door for 0.4–0.7 s ("door open at 0.5 m, unblocked at 6 m" rows). → D-13

Turbolifts — **24/24 PASS** (4 lobbies × 2 cabs × 3 destinations): walk into the cab, `lifts.startRide(cab,
dest)`, step `lifts.update` to the end (5.65 s simulated per ride, 0–2152 ms wall for the synchronous
destination-cluster build), arrival room = destination lobby, player inside the destination cab
(e.g. `pos=-3,-40,-111.35`), walked out into the lobby, both clusters built afterwards
(`trimClusters(2)` in `LiftSystem.update` keeps origin + destination).

Stairs — **10/10 PASS**: bridge pit port/starboard, aft (z 200) and forward (z 181.2) flights
(210 → 208.6 → 210); hangar stair tower up (36, −30) → landing (−32) → tower head (−22) → gallery → through the
glass gap into `flight_control` and back, and down; reactor west/east switchbacks −10 → −5 → 0 onto the catwalk
ring, and down; briefing tiers door → two-step onto tier 0 (210.6) → 210.3 → 210 → back to the door.
One test-path correction was needed (the stair-head railing sits 0.15 m behind flight B's top step: step forward
1.5 m before turning onto the gallery) — that is a legitimate layout, not a defect.

### 3.4 Door table (66 directions)

Generated from `reviews/evidence/walktest_full.json`. "through" = distance walked until the player was ≥ 1 m past
the door plane and inside the destination room; "door open at" / "unblocked at" = distance from the start at
which the door's `target` became 1 and its collider was disabled (— for arches / open doorways, which have no
slab); "walk to spawn" = straight-line walk from the doorway to the destination room's `spawn`.

| door | kind | from → to | through | door open at | unblocked at | walk to spawn |
|---|---|---|---|---|---|---|
| br_corr | blast | bridge → cmd_corridor | PASS 7.5 m | 0.5 | 6 | ok 1.5 m |
| br_corr | blast | cmd_corridor → bridge | PASS 4 m | 0.5 | 0.5 | ok 4.5 m |
| br_tac | slide | bridge → tactical | PASS 5 m | 0.5 | 3 | ok 15.5 m |
| br_tac | slide | tactical → bridge | PASS 4.5 m | 0.5 | 3 | deflected 12.95 m short |
| br_nav | slide | bridge → nav_station | PASS 5 m | 0.5 | 3 | deflected 0.41 m short |
| br_nav | slide | nav_station → bridge | PASS 4.5 m | 0.5 | 3 | deflected 12.95 m short |
| tac_corr | slide | tactical → cmd_corridor | PASS 4.5 m | 0.5 | 3 | ok 24 m |
| tac_corr | slide | cmd_corridor → tactical | PASS 4.5 m | 0.5 | 3 | ok 4.5 m |
| nav_corr | slide | nav_station → cmd_corridor | PASS 4.5 m | 0.5 | 3 | ok 24 m |
| nav_corr | slide | cmd_corridor → nav_station | PASS 4.5 m | 0.5 | 3 | ok 4.5 m |
| obs_corr | slide | observation → cmd_corridor | PASS 4.5 m | 0.5 | 3 | ok 73 m |
| obs_corr | slide | cmd_corridor → observation | PASS 4.5 m | 0.5 | 3 | ok 4.5 m |
| corr_lift_t | blast | cmd_corridor → lift_lobby_tower | PASS 4 m | 0.5 | 2 | ok 2.5 m |
| corr_lift_t | blast | lift_lobby_tower → cmd_corridor | PASS 4 m | 0.5 | 0.5 | ok 1.5 m |
| corr_intel | secure | cmd_corridor → intelligence | PASS 6 m | 0.5 | 4 | ok 6 m |
| corr_intel | secure | intelligence → cmd_corridor | PASS 4 m | 0.5 | 0.5 | ok 49.5 m |
| corr_brief | slide | cmd_corridor → briefing | PASS 4.5 m | 0.5 | 3 | ok 6.5 m |
| corr_brief | slide | briefing → cmd_corridor | PASS 4 m | 0.5 | 0.5 | ok 22 m |
| corr_comms | slide | cmd_corridor → comms | PASS 4.5 m | 0.5 | 3 | ok 6.5 m |
| corr_comms | slide | comms → cmd_corridor | PASS 4 m | 0.5 | 0.5 | ok 22 m |
| corr_off | slide | cmd_corridor → officers_quarters | PASS 4.5 m | 0.5 | 3 | ok 6.5 m |
| corr_off | slide | officers_quarters → cmd_corridor | PASS 4 m | 0.5 | 0.5 | ok 49 m |
| hg_shuttle | blast | hangar → shuttle_bay | PASS 8 m | 0.5 | 6 | ok 8 m |
| hg_shuttle | blast | shuttle_bay → hangar | PASS 4 m | 0.5 | 0.5 | **FELL** (well) |
| hg_maint_a | arch | hangar → fighter_maint | PASS 6.5 m | — | — | ok 30.5 m |
| hg_maint_a | arch | fighter_maint → hangar | PASS 4 m | — | — | blocked 20.29 m short (cradle) |
| hg_maint_b | arch | hangar → fighter_maint | PASS 6.5 m | — | — | ok 29.5 m |
| hg_maint_b | arch | fighter_maint → hangar | PASS 4 m | — | — | blocked 40.94 m short (cart ×3) |
| hg_cargo | arch | hangar → cargo_bay | **FAIL** blocked at (36.88, −40, −40) | — | — | — |
| hg_cargo | arch | cargo_bay → hangar | **FAIL** blocked at (39.19, −40, −39.87) | — | — | — |
| hg_repair | arch | hangar → repair_bay | PASS 6.5 m | — | — | ok 20 m |
| hg_repair | arch | repair_bay → hangar | PASS 4 m | — | — | deflected 58.39 m short |
| hg_lobby | blast | hangar → hangar_lobby | **FAIL** gap at z −90.68 | 0.5 | 6 | — |
| hg_lobby | blast | hangar_lobby → hangar | **FAIL** gap at z −91.5 | 0.5 | 0.5 | — |
| hg_fc | open | hangar → flight_control | PASS 4 m | — | — | ok 4.5 m |
| hg_fc | open | flight_control → hangar | PASS 4 m | — | — | blocked 71.18 m short (railing ×2, column) |
| eng_lobby_corr | blast | eng_lobby → eng_corridor | PASS 7.5 m | 0.5 | 6 | ok 2.5 m |
| eng_lobby_corr | blast | eng_corridor → eng_lobby | PASS 4 m | 0.5 | 0.5 | ok 3.5 m |
| eng_corr_ctrl | blast | eng_corridor → engineering | PASS 7.5 m | 0.5 | 6 | ok 3.5 m |
| eng_corr_ctrl | blast | engineering → eng_corridor | PASS 4 m | 0.5 | 0.5 | ok 2.5 m |
| eng_corr_hyper | blast | eng_corridor → hyperdrive | PASS 7.5 m | 0.5 | 6 | ok 3.5 m |
| eng_corr_hyper | blast | hyperdrive → eng_corridor | PASS 4 m | 0.5 | 0.5 | ok 53.5 m |
| eng_corr_life | blast | eng_corridor → life_support | PASS 7.5 m | 0.5 | 6 | ok 3.5 m |
| eng_corr_life | blast | life_support → eng_corridor | PASS 4 m | 0.5 | 0.5 | ok 53.5 m |
| eng_ctrl_reactor | blast | engineering → reactor | PASS 7 m | 0.5 | 0.5 | ok 5.5 m |
| eng_ctrl_reactor | blast | reactor → engineering | PASS 4 m | 0.5 | 0.5 | blocked 19.67 m short (console) |
| crew_lobby_corr | blast | crew_lobby → crew_corridor | PASS 7.5 m | 0.5 | 6 | ok 2.5 m |
| crew_lobby_corr | blast | crew_corridor → crew_lobby | PASS 4 m | 0.5 | 0.5 | ok 3.5 m |
| crew_corr_q | slide | crew_corridor → crew_quarters | PASS 4.5 m | 0.5 | 3 | ok 3.5 m |
| crew_corr_q | slide | crew_quarters → crew_corridor | PASS 4 m | 0.5 | 0.5 | ok 48 m |
| crew_corr_mess | slide | crew_corridor → mess | PASS 4.5 m | 0.5 | 3 | ok 3.5 m |
| crew_corr_mess | slide | mess → crew_corridor | PASS 4 m | 0.5 | 0.5 | ok 18.5 m |
| crew_corr_conn | open | crew_corridor → crew_connector | PASS 4 m | — | — | ok 18.5 m |
| crew_corr_conn | open | crew_connector → crew_corridor | PASS 4 m | — | — | ok 2.5 m |
| crew_corr_lounge | slide | crew_corridor → lounge | PASS 4.5 m | 0.5 | 3 | ok 3.5 m |
| crew_corr_lounge | slide | lounge → crew_corridor | PASS 4 m | 0.5 | 0.5 | ok 18.5 m |
| crew_corr_med | slide | crew_corridor → medbay | PASS 4.5 m | 0.5 | 3 | ok 3.5 m |
| crew_corr_med | slide | medbay → crew_corridor | PASS 4 m | 0.5 | 0.5 | ok 48 m |
| conn_fwd | open | crew_connector → crew_corridor_fwd | PASS 4 m | — | — | ok 2.5 m |
| conn_fwd | open | crew_corridor_fwd → crew_connector | PASS 4 m | — | — | ok 18.5 m |
| fwd_armory | secure | crew_corridor_fwd → armory | PASS 6 m | 0.5 | 4 | ok 2.5 m |
| fwd_armory | secure | armory → crew_corridor_fwd | PASS 4 m | 0.5 | 0.5 | ok 48 m |
| fwd_det | secure | crew_corridor_fwd → detention | PASS 6 m | 0.5 | 4 | ok 2.5 m |
| fwd_det | secure | detention → crew_corridor_fwd | PASS 4 m | 0.5 | 0.5 | ok 12.5 m |
| fwd_pods | blast | crew_corridor_fwd → escape_pods | PASS 7.5 m | 0.5 | 6 | ok 2.5 m |
| fwd_pods | blast | escape_pods → crew_corridor_fwd | PASS 4 m | 0.5 | 0.5 | ok 34.5 m |

Reading the columns: no door failed to open — `target` flipped to 1 on the first step in all 52 directions
with a slab (11 blast, 12 slide, 3 secure doors) (the player starts inside the 3.2 m trigger). "Unblocked at" in the first direction of each pair
matches the kind speeds exactly (walk rate 5 m/s: slide 1.4/s → 3 m, secure 1.0/s → 4 m, blast 0.7/s → 6 m,
collider off at openness 0.8), i.e. the player reaches every closed blast door before it clears (D-13); the
second direction of each pair shows 0.5 because the test runs A → B then B → A back-to-back and the door is
still open when the player is re-placed 3 m away. Screenshots of the four failures and one shot per stair test
are in `reviews/evidence/`.

## 4. Camera transitions (`tools/validate_tech.mjs --only=transitions`)

Per frame the sampler records mode, `modes.busy`, camera position/quaternion finiteness, `hud.fadeOpacity()`
and the mean luminance of a 320 × 16 px strip of the WebGL canvas (`debugAPI.capturePixels`). "Black" = strip
luminance < 3 (8-bit). The fade is a DOM overlay, so the canvas is never expected to go black; NaN frames and
black frames while the overlay is transparent would be the failures.

| transition | wall (ms) | frames (avg ms) | NaN | black (unfaded) | canvas lum | end state |
|---|---|---|---|---|---|---|
| board() from the default view (1300, 420, 900) | 164 969 | 34 (5223) | 0 | 0 (0) | 4.7..48.5 | bridge, player (0, 210.3, 176.5) yaw 0, cam (0, 212, 176.5); modes `E×29 I×5` |
| exitToExterior() from tower (bridge) | 33 892 | 10 | 0 | 0 | 23..35 | cam (60, 225, 60) → nearest room nav_station 115.3 m, outside hull; visible bridge, tactical, nav_station, observation (peek) |
| board() from `ext_far` (2600, 900, 1900) | 168 967 | 57 (3188) | 0 | 0 (0) | 4.7..48.9 | bridge (0, 210, 176.5), cam (0, 211.7, 176.5); `E×51 I×6` |
| exit from hangar | 37 628 | 9 | 0 | 0 | 33..51 | cam (140, −170, −10) → cargo_bay 143.9 m, outside hull; **visible hangar, fighter_maint, cargo_bay, repair_bay, flight_control (peek off)** |
| board() after the hangar exit | 212 436 | 35 (6688) | 0 | 0 (0) | 4.6..51.1 | bridge, same pose |
| exit from engineering | 37 895 | 8 | 0 | 0 | 34..176 | cam (260, 20, 700) → reactor 402.8 m, outside hull; visible engineering, reactor |
| board() after the engineering exit | 172 899 | 35 (5424) | 0 | 0 (0) | 4.5..177 | bridge, same pose |
| exit from crew (crew_corridor) | 17 064 | 8 | 0 | 0 | 32..107 | cam (120, 130, −330) → escape_pods 181.7 m, outside hull; visible crew_corridor, crew_connector, crew_corridor_fwd |
| board() after the crew exit | 157 371 | 34 (5202) | 0 | 0 (0) | 4.7..36.4 | bridge, same pose |

All nine PASS. Wall times are SwiftShader frame cost (`flyTo` is 2.5–6 s of wall-clock by design,
`clamp(dist/700, 2.5, 6)`, plus 500 + 700 ms fades; the rest is 34–57 frames at 3–7 s each). The `board()` from
`ext_far` needs 57 frames because the flight covers 3.5 km. Screenshots `t01…t09_*.png`.

Two observations, not failures:

- After `exitToExterior()` from a non-tower cluster, `rooms.peek` is switched off by the frame loop
  (`main.js:575`: peek only while the camera is < 360 m from the bridge glazing) and `refreshVisibility()`
  then falls back to "current room + portal neighbours" (`room.js:498-512`; `current` is never cleared on
  exit): the whole hangar cluster (5 rooms) keeps rendering inside the closed hull from an exterior camera.
  Cost measured in §11.1. → D-8
- `t01_board_default_view.png` (and the other `board()` shots) show the bridge behind the "Click to resume"
  card: headless Chrome never grants pointer lock, so the app treats the programmatic boarding as paused. The
  HUD subtitle reads "Main Command Bridge — Imperial I-class Star Destroyer Redoubt" and the player/camera
  values above are the real evidence of the landing; the card is expected in this harness.
- The black overlay holds for `fadeIn(500)` + synchronous `enterInterior()` (tower build if the prefetch has
  not finished, 1.05 s here) + the first interior frame (≈ 90 new shader programs) + `fadeOut(700)`. CSS opacity
  transitions run on the compositor, so a slow first frame shows the last exterior frame fading in, then a pop
  to the bridge — on real GPUs this is a few hundred ms; a `renderer.compileAsync()` during the fade would
  remove the risk (D-9).

## 5. Rooms / streaming (`--only=streaming,leak`)

```
start (tower only):  {"heapMB":239.8,"geometries":527,"textures":82,"programs":325,"built":10,"clusters":["tower"],"roomTriangles":493456}
ensureCluster(hangar): 1399 ms   ensureCluster(engineering): 909 ms   ensureCluster(crew): 1379 ms   ensureCluster(tower): 1054 ms
all four built:      {"heapMB":327.8,"geometries":288,"textures":80,"programs":325,"built":34,"clusters":["hangar","engineering","crew","tower"],"roomTriangles":2827098}
before trim:         {"heapMB":251.1,"geometries":777,"textures":88,"programs":329,"built":34, ...}
after trimClusters(2): {"heapMB":243.5,"geometries":559,"textures":86,"programs":329,"built":21,"clusters":["crew","tower"],"roomTriangles":1369700}  → PASS
unvisited built cluster survives trimClusters(2): {"cluster":"hangar","stillBuilt":true,"clusters":["crew","tower","hangar"]}
rooms over the 400 ms build budget: none        rooms over the triangle budget: fighter_maint 172k, shuttle_bay 174k
```

- Build times are load-inflated ≈ 2.3× (integrated_v1 measured the same clusters at 0.4–0.6 s); no single room
  exceeds 400 ms even here. All 34 room builders run; two side rooms exceed the 150 k-triangle guide
  (fighter_maint 172 k, shuttle_bay 174 k).
- Memory: heap 240 → 328 MB with all four clusters resident (+88 MB), 251 MB after the env captures and GC,
  244 MB after `trimClusters(2)`; GPU geometries 777 → 559; `built` 34 → 21 rooms in exactly two clusters
  (`crew`, `tower`). ✓
- **`trimClusters()` ignores clusters that were built but never became `current`** (`clusterVisit` has no entry
  → `visited.indexOf(c) === -1 < keep`): a prefetched/`ensureCluster`ed cluster stays resident forever. → D-10
- Leak probe (build → render → release, twice per cluster, GC between):

```
WARN hangar:      geometries before 277 → built 453 → released 321 → built 492 → released 335 (leaked 44, 58); textures 77→81; heap 83.5→86.6→88 MB
WARN engineering: geometries before 335 → built 396 → released 339 → built 404 → released 343 (leaked 4, 8);   textures 81→85; heap 88→135.8→136.6 MB
PASS crew:        geometries before 343 → built 516 → released 343 → built 516 → released 343 (leaked 0, 0);   textures 85→89; heap 90.6→141.5→142.3 MB
interior group children after releases: room_bridge:54 … room_officers_quarters:25 (tower only — no orphan groups)
```

  - Geometries: `releaseCluster()` disposes `kit` meshes and lights only; objects handed in through
    `ctx.add()` (35 call sites: hangar `bridge`/`plat`, cargo lift group, repair arc, reactor shell, hyperdrive
    rings, medbay glass/liquid/bubbles, bridge/tactical/comms holograms …) are removed from the scene with the
    group but their geometries (and any custom materials/programs) are never disposed → **+14 GPU geometries per
    hangar rebuild, +4 per engineering rebuild**; the first hangar round also uploads ~30 persistent fighter-pool /
    rack meshes (one-off). Crew (no `ctx.add`) is clean. → D-5
  - Textures: **+1 per cluster change** (77 → 81 → 85 → 89 over 12 cluster changes): `captureEnvironment()`
    (`main.js:267`) disposes its cube render target but not the previous `pmrem.fromCubemap()` render target
    whose `.texture` was the old `scene.environment`. Every lift ride leaks one PMREM texture (~4 MB GPU). → D-4
  - Heap: **≈ 50 MB retained after the first visit of each cluster** (hangar +3, engineering +48, crew +51 MB,
    stable on the second round). It is not GPU memory and not unreleased room groups (scene graph is clean);
    I could not attribute it within the session (a CDP `queryObjects` probe crashed the SwiftShader page).
    Bounded by 4 clusters (≈ 200 MB) so the 600 MB budget holds, but worth a heap snapshot on real hardware.

## 6. Fighters

`node tools/traffic_test.mjs` → **19/19 checks passed** (`reviews/evidence/traffic_test.log`): API contract,
16 fighters (12 racked + 4 maintenance), 4081 m patrol loop, full launch → field_pass:out → depart → return →
field_pass:in → dock cycle, re-dock exactly at the rack slot, pool ≤ 4 drawn, patrol 75 s at 55.1 m/s,
≥ 40 m hull clearance on 800 spline samples (min 50.2 m), launch/recovery legs inside the well footprint down
to y −108, scheduler every ~35 s with 2 in flight, recall shortens the patrol, `setController` override and
release, snapshot/apply replays to identical poses, `update()` 8.5 µs/step with 0 KB heap growth over 3000 steps.

validate_tech `fighters` (120 s of `simulate` in 0.25 s steps, positions read from `traffic.fighters[i].pos`
= `object.position`):
`PASS fighters: 473 flying samples over 120 s ({"launching":36,"lowering":16,"patrol":349,"returning":16,"ascending":40,"docking":16}), 349 patrol samples; room-box violations 0; patrol samples inside the hull 0`
(room-box test = every `ROOMS` box extruded floor..floor+h; hull test = `layout.insideHull`). Shaft-state
samples (launching/returning/ascending) all lie inside the hangar well footprint x −22..22, z −70..50 by
construction of the launch/recovery curves.

## 7. Sync

```
main run:  snapshot: 1250 bytes; doors {"br_corr":{"o":1,"t":1},"br_tac":{"o":1,"t":1},"eng_ctrl_reactor":{"o":0.56,"t":1}}; lift null; traffic fighters 16; alert 1
rerun:     snapshot: 1132 bytes; doors {"br_corr":{"o":1,"t":1},"br_tac":{"o":1,"t":1},"eng_ctrl_reactor":{"o":0.77,"t":1}}; lift null; traffic fighters 16; alert 1
```

Fresh page → `setView("bridge")` (builds the tower so the bridge doors exist) → `sync.apply(snapshot)`. The main
run's comparison FAILed on the +5 s replay (`after +5 s: 260.3102 m`, `validate_tech_main.log`) because page 1's
live frame loop kept advancing its clock while page 2 booted; the rerun (`validate_leak_sync.log`) freezes both
loops and is the valid measurement:

```
PASS sync apply on a fresh page: doors match=true, fighter state mismatches 0, max pos error 0.0000 m
     (after +5 s: 0.0000 m, clocks 14.100 vs 14.117, tolerance 1.01 m, state mismatches 0), clock 9.100 → 9.117, alert 1 → 1
   applied door records (before any tick): {"br_corr":{"openness":1,"target":1,"slabMoved":0,"colliderEnabled":true},
                                            "br_tac":{"openness":1,"target":1,"slabMoved":0,"colliderEnabled":true},"eng_ctrl_reactor":"not built"}
   after one tick: {"br_corr":{"openness":1,"slabMoved":0,"colliderEnabled":true},"br_tac":{"openness":0.977,"slabMoved":2.7,"colliderEnabled":false}}
   WARN doors logically open but slabs unmoved / collider still enabled after apply: br_corr, br_tac
```

- Snapshot size 1132–1250 bytes (`t`, doors in motion, `lift`, 16 fighter records with full-precision times,
  `alert`). Door records, all 16 fighter states and poses (to 0.1 mm) and the alert level are reproduced
  exactly; after another 5 s of `simulate` on both pages the poses still agree (the first attempt showed a
  260 m divergence — page 1's *live* frame loop had advanced its clock while page 2 was booting; with both loops
  frozen it is 0.0000 m, and `traffic_test` covers the airborne replay independently).
- **`DoorSystem.apply()` only writes `openness`/`target`**; slab positions and the door collider are updated in
  `update()` only when `openness` changes. A door received as open (o = 1, t = 1) therefore stays visually shut
  with its collider enabled as long as the local player is near it (br_corr above, `target` stays 1) and, when
  nobody is near, pops to open and slides shut (br_tac: 0.977 after one tick). `buildDoor()` likewise ignores a
  pre-applied openness. → D-3
- `SyncState.snapshot()` includes `lift` but `apply()` never applies it and `LiftSystem` has no `apply()`;
  `doors.snapshot()` omits `locked`/`forceOpen`; there is no schema/version field. → D-11

## 8. Asset references

- `rg` over `src/`, `index.html`, `src/style.css` for `https?://`, `url(`, `@import`, `@font-face`, image /
  font / audio / model extensions, `new Image`, `new Audio`, `fetch(`, `XMLHttpRequest`, `*Loader`, `Worker(`:
  **no hits** except `main.js:415-418` (`toDataURL` of a generated canvas texture, debug export).
  Fonts are system stacks (`"Segoe UI", "Helvetica Neue", Arial` and a monospace variable). Favicon is `data:,`.
- Imports outside `src/`: `three` (59), `three/addons/*` (20), `n8ao` (1) — all bundled npm packages.
- Runtime network audit (Playwright request log until `debugAPI.ready` + 2 frames):
  `{"total":92,"byOrigin":{"http://127.0.0.1:5173":{"n":92,"types":{"document":1,"script":90,"stylesheet":1}}}}`
  `foreign requests: 0`.
- `dist/assets/` = `index-1RYNZkFK.js` (1 482 920 B) + `index--YF8Tg75.css` (6 766 B) — only JS/CSS. The two URL
  strings inside the bundle are `http://www.w3.org/1999/xhtml` (three.js SVG namespace constant) and
  `https://jcgt.org/published/0007/04/01/` (a citation inside the n8ao shader source); neither is fetched.

## 9. Extensibility review (static)

What is present and coherent:

- `src/fighters/traffic.js`: `requestLaunch(id?)`, `requestRecall(id)`, `setController(id, ctrl)`, `on(event,
  fn)` (`launch`, `depart`, `return`, `dock`, `recall`, `field_pass`), `snapshot()/apply()`, deterministic
  clock-driven poses — exactly the list `HANGAR_DEPLOYMENT_API` promises, and all exercised by `traffic_test`.
- `src/core/systems.js` `SYSTEMS` is filled once in `main.js:135` (`fighters, audio, hud, rooms, doors, lifts,
  lighting, exterior, space, camera, player`) and consumed by `audio.js` and `atmosphere.js` without import
  cycles. Not registered: `sync`, `modes`/transitions, `atmosphere`, `interactions`, `post`.
- Room contract (`BuildContext`): `kit`, `wall/ceilingFrame/shell`, `light/spot` (culled per room and budgeted),
  `collider`, `interactable`, `animate`, `add`, `props`, `rand`; systems that own room-tied geometry plug in via
  `manager.extras` (`roomBuilt/roomReleased/refreshVisibility`), used by lifts and doors. `doorsOf()` correctly
  maps door planes that sit off a room's own wall. All 34 rooms have a builder and an explicit ambience profile
  in `audio.js` `ROOM_PROFILES` (checked programmatically: 34/34, no orphans).
- `SyncState` is a clean façade: snapshot = clock + deltas, scripted motion is a pure function of the clock.

Concrete gaps:

1. `src/systems/flight.js` is **not imported anywhere** (`rg` over `src/`: 0 references). `FlightState` is never
   instantiated, `LANDING_SUPPORTS`/`LANDING_CAMERA_PLAN`/`LANDING_ZONES` are data with no consumer, and
   `HANGAR_DEPLOYMENT_API` is an array of strings rather than an interface anything checks. The header claims
   "hooks the ship, hangar and camera systems already call or expose" — only the hangar half is true.
2. Doors: `r.locked` is honoured by `update()` but there is **no `lock(id)/unlock(id)`**, no `isLocked`, and
   `locked`/`forceOpen` are not part of `snapshot()`; door events go only to `audio.event` (no `on()` bus like
   traffic has); `apply()` does not re-pose (D-3).
3. Lifts: `startRide()` and `snapshot()` exist, **no `apply()`**; `SyncState.apply()` drops `snap.lift`.
4. Room contract: `ctx.add()` objects and any custom materials they carry have **no dispose path** on
   `releaseCluster()` (D-5); there is no `ctx.onRelease(fn)` hook for rooms that allocate their own resources.
5. Traffic controller: a fighter under `setController` keeps its scripted `state` (e.g. `racked`), so
   `get airborne()` does not count it and `requestLaunch()`'s `maxObjects` guard can exceed the 4-mesh pool
   (`acquire()` then fails silently → invisible fighter); controller ownership is not in the snapshot, so a peer
   applying it resumes scripted motion for that fighter; `parked.hide()` does handle it.
6. Sync: no `version`/schema field, player pose not included (fine for now, but undocumented), two clocks
   (`sync.clock` and `traffic.clock`) both serialized.
7. `player.onFall` is an absolute `y < −400`, not relative to the current room floor (360–610 m falls).
8. `SYSTEMS` has no entry for `sync`/`modes`, so a room module cannot trigger a transition or snapshot.

## 10. Mobile (`node tools/mobiletest.mjs`)

Pixel 5 emulation (Playwright `devices["Pixel 5"]`, `hasTouch`, `isMobile`, 851 × 393 landscape then 393 × 851
portrait). Two runs, logs in `reviews/evidence/mobiletest_run1_timeout.log` and `mobiletest_run2.log`:

```
run 2 (load ≈ 8):
PASS touch mode detected
PASS mobile quality profile pixelRatio=0.66 level=1
PASS start card dismissed by tap
PASS touch drag orbits the exterior camera dtheta=1.20
PASS BOARD button enters the interior
PASS virtual stick walks the player dz=-2.16
PASS look drag turns the player dyaw=0.67
PASS lift menu opens
PASS menu entry tap starts the turbolift ride dest=hangar_lobby
PASS EXTERIOR button leaves the interior
PASS buttons fit in portrait
11/11 checks passed                                   exit=0
```

- Run 1 (load ≈ 18) passed the same first 8 checks and then died in `page.screenshot` for `04_lift_menu.png`
  (`page.screenshot: Timeout 30000ms exceeded`): the tool never raises Playwright's 30 s default, and a
  SwiftShader frame took longer than that under load. Harness defect, not an app defect (D-15). Run 2 is the
  result that counts: **11/11**, no page errors, touch UI present (`body.touch`, `#touch-ui`), quality profile
  `level 1`, `pixelRatio 0.66`.
- The tool's own screenshots are in `shots/mobile/` (`01_start_card` … `05_portrait`); `03_interior_touch.png`
  and `05_portrait.png` are copied to `reviews/evidence/mobile_*.png`. The touch button block fits the
  portrait viewport (`#touch-buttons` right/bottom ≤ `innerWidth/innerHeight`).
- Two things visible in `mobile_05_portrait.png` that the checks do not cover: (1) the bridge glazing reads as
  a solid black slab on the tower block. I re-ran the same sequence on a desktop page and a control
  (`bridge` → `exitToExterior()`, `peek_probe.log`): the state is identical in both (`peek: true`, visible
  bridge, tactical, nav_station, observation; camera (60, 225, 60)) and the slab is there too
  (`exit_tower_portrait_glazing_black.png`),
  so it is not a mobile or lift-cancel state bug — it is the tower's outward-facing backdrop plane, which also
  defeats the exterior peek (D-8, §11.1). (2) The mobile flow rides the lift to `hangar_lobby`: a phone user
  who then walks forward falls through the `hg_lobby` void (D-1) exactly like the desktop player.
- Not covered by the tool and not measured here: real touch latency, thermal throttling, actual mobile GPU
  frame times (SwiftShader frame cost is meaningless for that), or the adaptive quality stepping
  (`main.js:220-261`: mobile levels ratio 0.5/0.66/0.85, start at level 1, step down after 30 frames slower
  than 52 fps, step up after 600 frames faster than 75 fps). Note the mobile floor is pixel ratio 0.5 with n8ao
  "Performance" — content is never removed, so the hangar's 1.9–2.3 M triangles and 350–450 draw calls (§11)
  reach a phone unchanged.

## 11. Performance summary (`node tools/perf.mjs validator`, default 19 views; `perf/validator.md`)

Budgets (PLAN §9): interior ≤ 250 calls & ≤ 1.2 M tris; exterior close ≤ 400 calls & ≤ 2.5 M; ≤ 12 active
point/spot lights (+ sun, hemi → `visibleLights` ≤ 14); heap ≤ 600 MB. Frame ms is SwiftShader under load
(relative only). Calls/tris match `perf/integrated_v1` exactly except hangar/cmd_corridor, which dropped with
the shadow-map commit `ff6e2c25`.

| view | calls | tris | lights | heap MB | programs | frame ms (sw) | budget |
|---|---|---|---|---|---|---|---|
| ext_far | 87 | 356 k | 2 | 157.9 | 43 | 2560 | ok |
| ext_mid | 195 | 551 k | 2 | 82.2 | 43 | 3292 | ok |
| ext_tower | **538** | 1239 k | **16** | 86.1 | 69 | 7373 | **calls > 400, lights** |
| ext_close | **515** | 1207 k | **16** | 83.9 | 69 | 9179 | **calls > 400, lights** |
| ext_belly | 247 | 628 k | 2 | 84.3 | 69 | 9496 | ok |
| bridge | **411** | 1144 k | **16** | 90.2 | 130 | 14266 | **calls > 250, lights** |
| bridge_window | **383** | 1143 k | **16** | 87.6 | 130 | 13310 | **calls, lights** |
| cmd_corridor | **427** | 826 k | **16** | 91.2 | 151 | 13668 | **calls, lights** |
| hangar | **354** | **1876 k** | **16** | 140.4 | 187 | 15194 | **calls, tris > 1.2 M, lights** |
| hangar_well | **447** | **2255 k** | **16** | 141.7 | 226 | 14599 | **calls, tris, lights** |
| shuttle_bay | 183 | 1021 k | 10 | 142.5 | 226 | 14312 | ok |
| reactor | 176 | 903 k | 14 | 190.1 | 273 | 16396 | ok |
| engineering | 197 | 908 k | 14 | 190.4 | 273 | 15310 | ok |
| hyperdrive | 188 | 720 k | 9 | 191.4 | 284 | 13243 | ok |
| crew_corridor | **380** | 928 k | 12 | 243.5 | 318 | 13147 | **calls > 250** |
| crew_quarters | 181 | 682 k | 10 | 246.0 | 337 | 12239 | ok |
| mess | 171 | 515 k | 10 | 247.1 | 337 | 8929 | ok |
| medbay | 247 | 740 k | 10 | 244.8 | 343 | 6686 | ok |
| detention | 169 | 724 k | 10 | 244.9 | 343 | 5209 | ok |

- **8 of 19 views over budget** (D-7): draw calls in bridge (411), bridge_window (383), cmd_corridor (427),
  hangar (354), hangar_well (447), crew_corridor (380); triangles in hangar (1.88 M) and hangar_well
  (2.26 M); exterior close-ups ext_tower (538) and ext_close (515) exceed 400 only because of the peeked tower
  rooms — 330 / 307 calls without them — and those rooms are hidden behind the tower's own backdrop plane
  (§11.1 b). The bridge is 64 % over its call budget with a single visible room.
- Lights: `rooms.lightBudget = 14` (`main.js:125`) versus PLAN's 12 → `visibleLights` 16 (14 + sun + hemi) in
  every tower/hangar view. Either the budget or the plan needs changing; the exterior peek also keeps 14 room
  lights on for `ext_tower`/`ext_close`.
- Heap max 247 MB ✓ (600). Textures 43–88 ✓.
- Shader programs grow 43 → 130 (bridge) → 343 (after 19 views; 395 in integrated_v1 after 25). Lights are
  culled with `.visible`, so each new combination of point/spot counts is a new three.js program-cache key for
  every material in view; nothing pre-compiles. On real GPUs this is the room-change hitch. → D-9

### 11.1 Interior rooms rendered for exterior cameras (two mechanisms, one defect: D-8)

**(a) After `exitToExterior()` from a non-tower cluster.** `reviews/evidence/exit_cost.mjs`: `setView(room)` →
`exitToExterior()` → wait `mode === "exterior" && !busy` → 2 frames → `getStats()`; then `rooms.group.visible =
false` → 2 frames → `getStats()` with the same camera. The difference is what the interior costs in that frame
(`exit_cost.log`):

| exit from | camera | `peek` | rooms still rendered | calls with / without | tris with / without | lights | wasted |
|---|---|---|---|---|---|---|---|
| hangar | (140, −170, −10) | false | hangar, fighter_maint, cargo_bay, repair_bay, flight_control | 636 / 327 | 2 487 k / 630 k | 16 / 2 | **309 calls, 1.86 M tris, 14 lights** |
| engineering | (260, 20, 700) | false | reactor, engineering | 344 / 283 | 1 112 k / 615 k | 14 / 2 | 61 calls, 497 k tris, 12 lights |
| crew | (120, 130, −330) | false | crew_corridor, crew_connector, crew_corridor_fwd | 535 / 403 | 1 134 k / 630 k | 12 / 2 | 132 calls, 504 k tris, 10 lights |

The frame after leaving the hangar is 636 calls / 2.49 M triangles — 59 % over the exterior-close call budget
(400) and at the 2.5 M triangle ceiling — and 49 % of those calls and 75 % of those triangles are the hangar
cluster drawn inside the hull. Only the hangar itself is arguably visible from below through the open wells (the exterior already has
its own shaft lights for that); the four side rooms and the engineering/crew rooms have no line of sight from
outside. Mechanism: `refreshVisibility()` with `peek === false` renders `current` + its open-door neighbours
(`room.js:498-512`), and `rooms.current` is never cleared when the mode changes to exterior, so the cluster the
player left stays "current" until the next boarding. (The `perf.mjs` exterior views do not show this because
they run before any interior visit — `current` is still null there: `ext_belly` renders 247 calls / 2 lights,
no room.)

**(b) The exterior "peek" renders rooms that the tower hides.** `ext_tower` and `ext_close` render the four
glazed tower rooms (`peek: true`, `rooms.setExteriorPeek`, intended per `room.js:228` "so the bridge is lit
behind its windows"). But `src/exterior/tower.js:105-107` puts an opaque, outward-facing `hullDark` backdrop
plane at z 170.9 across every glazing slot ("dark backdrop facing outward only (culled from inside)") — inside
the glass pane (z 169.5) and in front of the rooms (bridge box starts at z 172). Raycast from the two exterior
cameras through a 2 m × 1.5 m grid over all four slots, skipping transparent materials
(`reviews/evidence/peek_raycast.mjs`, `.log`):

```
ext_tower  cam (-220,260,-60): 234 rays → exterior first 229 (backdrop z=170.9 ×170, jambs/mullions ×54, hull ×5),
                                          INTERIOR first 5 (paintedMetal at z=170.3 — window-frame slivers inside the wall thickness)
ext_close  cam (-90,230,90):   234 rays → exterior first 219 (backdrop ×150 …), INTERIOR first 15 (plate z=170.7, paintedMetal z=170.1)
```

98 % / 94 % of the rays that pass the glass stop at the tower's own backdrop; the only interior geometry that
can be seen is the 1–2 m of window frame that pokes forward of z 170.9. What the peek costs
(`peek_pixels.log`, same camera, `rooms.group.visible` on/off):

| view | with peek | rooms hidden | budget (≤ 400 calls) |
|---|---|---|---|
| ext_tower | 538 calls, 1 239 k tris, 16 lights | **330 calls, 608 k tris, 2 lights** | over → within |
| ext_close | 515 calls, 1 207 k tris, 16 lights | **307 calls, 576 k tris, 2 lights** | over → within |

So both exterior close-up budget overruns in §11 are the peek, and the peek is rendering into an opaque
plane. The black slab on the bridge block in every close exterior shot (`exit_tower_portrait_glazing_black.png`,
`mobile_05_portrait.png`) is that backdrop, not the unlit bridge. The exterior and rooms workstreams
implemented contradictory intents: either the backdrop goes (and the peek finally shows the lit bridge as
`room.js:228` intends — at 200+ calls it should then be limited to the bridge, not four rooms) or the peek goes
(saves ~210 calls, 630 k tris and 14 lights in every close exterior frame). A pixel diff could not decide it
independently — the exterior frame is not deterministic even with `freezeGrain` (2–4 % of pixels change between
two identical-state frames: starfield/animation), which is why the raycast was used.

## 12. Defects, ranked

Severity: **Blocker** = a player cannot complete the intended path; **High** = visible/functional bug on the
main path; **Medium** = correctness/perf/leak; **Low** = polish, noise, harness.

| # | sev | defect | repro | fix (file · function) |
|---|---|---|---|---|
| D-1 | **Blocker** | Floor void between `hangar_lobby` (z ≤ −92) and the `hg_lobby` blast door (z −90): player falls out of the ship in both directions; the hangar deck's only lift access is unusable on foot. | `node tools/walktest.mjs --only=doors --doors=hg_lobby` → 2× `GAP at z -90.68 / -91.5`, y −56 and falling. Or `setView({mode:'interior',pos:[0,-40,-93],yaw:180})`, walk +z. | `src/core/layout.js` `R("hangar_lobby", …, [-8, 8, -110, -92])` → `-90` so the lobby shares the hangar's edge like every other lobby/corridor pair (check the lobby's `floorDecal` z's stay inside); or build a z-axis pocket for z −92..−90, x −3..3 in `src/rooms/common/hangar_lobby.js` `extras` (floor slab + collider, lintel, side walls — see `doorPocket()` in `src/rooms/tower/tactical.js`). Add a layout unit test: every door's two rooms must share the door plane or one of them must own a pocket. |
| D-2 | **High** | `hg_cargo` arch (x 40, z −50..−30) approach blocked on its axis: scissor stair tower (x 32..40, z −46..−29), two `computerBank`s inside the arch opening (z −45.1..−41.9, −38.1..−34.9), `toolCart` at (38.6, −40.4). Only the 3–4 m end lanes pass. | `walktest --doors=hg_cargo` → both directions FAIL, lane scan 9/20 and 13/20 lanes; static probe 5 colliders in the 2 m approach. | `src/rooms/hangar/hangar.js` `starboardStrip()`: move the tower + ops banks aft under the gallery (e.g. z −20..−3, where the gallery already runs) or shift the arch in `layout.js` `D("hg_cargo", …, -50, -30)` to `-60..-48`… within `cargo_bay`'s z −60..−24 and away from the tower; remove the two `computerBank`s at `xw − 0.6` z −43.5/−36.5 and the cart from the opening. Regression guard: `walktest` static probe must report 0 colliders in a door's own opening. |
| D-3 | Medium | `DoorSystem.apply()` (and `buildDoor()`) do not pose slabs / colliders from `openness`: a synced open door renders closed and blocks while the local player is near; otherwise it pops open then closes. | `validate_tech --only=sync` → `WARN doors logically open but slabs unmoved / collider still enabled after apply: br_corr, br_tac`. | `src/systems/doors.js`: extract the slab/collider update in `update()` into `pose(r)` (`e = easeInOut(r.openness)`, `s.group.position = base + dir·e·travel`, `c.enabled = openness < 0.8`) and call it at the end of `buildDoor()` and for each record in `apply()`; also apply `closeTimer` so a door applied at t = 1 is not slammed on the next tick when nobody is near. |
| D-4 | Medium | `captureEnvironment()` leaks the previous PMREM render target on every cluster change (+1 texture per lift ride / cluster change, never freed). | Leak probe: textures 77 → 81 → 85 → 89 over 12 cluster changes, `renderer.info.memory.textures` never decreases. Code: `main.js:287` `scene.environment = pmrem.fromCubemap(cubeRT.texture).texture` with no reference kept. | `src/main.js` `captureEnvironment()`: `const rt = pmrem.fromCubemap(cubeRT.texture); scene.environment = rt.texture; if (envRT) envRT.dispose(); envRT = rt;` (keep `spaceEnv` for the exterior separately). |
| D-5 | Medium | `releaseCluster()` does not dispose objects added via `ctx.add()` (35 sites): GPU geometries leak per rebuild (hangar +14, engineering +4 per cycle), custom materials keep their programs. | `validate_tech --only=leak` → `WARN hangar … leaked 44, 58`, `WARN engineering … leaked 4, 8`, `PASS crew … 0, 0`. | `src/core/room.js` `BuildContext.add()`: record `this.added.push(obj)`; `RoomManager.releaseCluster()`: traverse `added`, dispose geometries and any material not owned by `this.materials`; add `ctx.onRelease(fn)` for rooms with their own render targets/textures (medbay, reactor, hyperdrive). |
| D-6 | Medium | Hangar well recovery lane (x −10..10 on the aft rim z 50) has no guard; walking from the shuttle-bay door toward the hangar spawn drops into the well and the tether only fires at absolute y < −400 (360 m below the deck). | `walktest`: `hg_shuttle shuttle_bay → hangar … SPAWN WALK FELL {"gap":[-3.95,-40,49.39],"fell":{"y":-56.1}}`. | `src/rooms/hangar/hangar.js` `wellRailings()` / recovery lane: add a knee-high invisible collider (or drop the lane floor to a ramp with side rails) across the lane mouth, disabled only while a fighter is in `returning`/`ascending` (traffic exposes `states`); `src/systems/player.js:167`: tether at `rooms.current.floor − 25` instead of `−400`. |
| D-7 | Medium | PLAN §9 budget overruns: calls > 250 in 6 interior views (bridge 411, cmd_corridor 427, hangar_well 447 …), tris > 1.2 M in hangar/hangar_well; `lightBudget` 14 vs plan 12. (The exterior close-up overruns are D-8 b.) | `node tools/perf.mjs validator` (§11). | Bridge/hangar: merge more per-material (the kit already merges; the extra calls are instanced props, decals and `ctx.add` meshes — check `kit.meshes.length` per room via `rooms.stats()`), cut the hangar side rooms from the portal set when their arch is farther than ~60 m (the r-portal culling already exists for shadows), or raise the plan; set `rooms.lightBudget = 12` in `src/main.js:125` or amend PLAN §9. |
| D-8 | Medium | Interior rooms rendered for exterior cameras. **(a)** After `exitToExterior()` from hangar / engineering / crew the camera is > 360 m from the glazing, `peek` turns off (`main.js:575`), `rooms.current` is never cleared and `refreshVisibility()` renders the current cluster inside the closed hull: hangar exit 636 calls / 2.49 M tris, of which 309 calls / 1.86 M tris / 14 lights are interior. **(b)** The peek itself renders the four glazed tower rooms (≈ 210 calls, 630 k tris, 14 lights) behind the tower's opaque outward-facing backdrop plane (`tower.js:105-107`, z 170.9): 94–98 % of glazing rays never reach an interior mesh; ext_tower/ext_close are 538/515 calls with, 330/307 without. | (a) `exit_cost.mjs` / `validate_tech` exit_hangar → `visible hangar \| fighter_maint \| cargo_bay \| repair_bay \| flight_control`, `peek:false`. (b) `peek_raycast.mjs`, `peek_pixels.mjs` (§11.1); any close exterior shot shows the glazing as a black slab. | (a) `src/systems/transitions.js` `exit()` / `applyMode()`: `rooms.current = null` (or `rooms.setExteriorPeek(true)` + `refreshVisibility(true)`) when leaving the interior; `src/core/room.js` `refreshVisibility()`: if `!peek` and the mode is exterior, render nothing. (b) decide the intent: remove the backdrop `back` plane in `src/exterior/tower.js` (then limit the peek to `bridge` — 4 rooms is 200+ calls) **or** drop the peek (`main.js:575` `near = false`, `room.js` `setExteriorPeek`) and keep the backdrop; either way the exterior close-ups land inside the 400-call budget. |
| D-9 | Medium | Shader program count 43 → 343–395 as rooms are visited; per-room light-count changes (`.visible` toggling in `cullLights()`) create new program-cache keys for every material; no `renderer.compileAsync()` before the fade-out. Room changes and the first boarding hitch on real GPUs. | `perf/validator.md` programs column; `rooms.stats()` programs 325 with the tower alone. | `src/core/room.js` `cullLights()`: keep the number of enabled point and spot lights constant (fixed pools; park unused lights with `intensity 0`), so the key stays constant; `src/systems/transitions.js` `board()`: `await renderer.compileAsync(scene, camera)` after `enterInterior()` while the overlay is opaque; same in `LiftSystem.update()` before the doors open. |
| D-10 | Low | `trimClusters(keep)` never releases a built cluster without a `clusterVisit` entry (`indexOf === -1 < keep`) — prefetched / `ensureCluster`ed clusters stay resident. | `validate_tech --only=streaming` → `unvisited built cluster survives trimClusters(2): {"cluster":"hangar","stillBuilt":true}`. | `src/core/room.js` `trimClusters()`: `const rank = visited.indexOf(c); if (rank === -1 \|\| rank >= keep) this.releaseCluster(c);` and/or stamp `clusterVisit` in `ensureCluster()`. |
| D-11 | Low | Sync/API gaps: `SyncState.apply()` ignores `lift`; no `LiftSystem.apply()`; `doors.snapshot()` omits `locked`/`forceOpen`; no `lock()/unlock()`; no door event bus; no snapshot `version`; controlled fighters not counted by `traffic.airborne` and not flagged in the snapshot. | Static (§9). | `src/systems/lifts.js`: `apply({cab, dest, phase, t})` reconstructing `ride`; `src/systems/sync.js` `apply()`: call it; `src/systems/doors.js`: `lock(id, on)`, include `l`/`f` flags in `snapshot()`, add `on(event, fn)` mirroring traffic; `src/fighters/traffic.js` `get airborne()`: count `f.controller` too and serialize `ctrl: !!f.controller`. |
| D-12 | Low | 9 console warnings `THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.` | Load the bridge/tactical (`validate_tech` console section). | `src/rooms/tower/tactical.js:337,424,425`, `src/rooms/tower/bridge.js:684,688`: `g.index ? g.toNonIndexed() : g` (as `src/core/kit.js:224`). |
| D-13 | Low | Blast doors (0.7/s, collider off at 0.8 → 1.14 s) with a 3.2 m trigger are reached in 0.4–0.76 s: the player bumps into every blast door (`unblocked at 6 m` rows). | `walktest` door table: all `blast` rows entered from the closed side. | `src/systems/doors.js` `update()`: per-kind trigger distance, e.g. `near.z < 3.2 * (1.4 / r.kind.speed)` (≈ 6.4 m for blast), or start blast doors opening on `rooms` portal look-ahead. |
| D-14 | Low | Boot: `hullPlate` procedural texture is 52–62 % of material generation and 37–49 % of `boot.total` (2.4 s of 5.6 s at low load; 7.0 s of 15.5 s under load) on the main thread before the first frame; first frame compiles 43 programs. | `getStats().boot.materials` in any run. | `src/textures.js` hullPlate: generate at half resolution + `generateMipmaps`, move the noise passes to an `OffscreenCanvas` worker, or persist the generated bitmaps in IndexedDB keyed by version. |
| D-15 | Low | Test harness: `tools/mobiletest.mjs` uses Playwright's 30 s default for `page.screenshot`, which fails on software GL under load (first run died after check 8). | `node tools/mobiletest.mjs` at load ≥ 15. | `tools/mobiletest.mjs`: `page.setDefaultTimeout(300000)` after `newPage()` (the other tools already do). |
| D-16 | Low | `flight.js` is dead code with a misleading header; `HANGAR_DEPLOYMENT_API` is a string list. | `rg flight.js src` → only itself. | Either import it where the hooks are meant to live (`main.js` owns a `FlightState`, `transitions.js` reads `phase`) and turn the API list into a runtime assertion in `createFighters()`, or move the constants to `docs/`. |

## 13. Reproduction commands

```
npx vite build                                     # §2
node tools/smoke.mjs dist                          # §2
node tools/walktest.mjs http://127.0.0.1:5173/ --json=/tmp/walktest.json            # §3 (≈ 25 min on software GL)
node tools/walktest.mjs --only=doors --doors=hg_cargo,hg_lobby                      # D-1, D-2 with lane scans
node tools/validate_tech.mjs http://127.0.0.1:5173/ --json=/tmp/validate_tech.json  # §2 console, §4, §5, §6, §7
node tools/validate_tech.mjs --only=leak,sync                                       # §5 leak probe, §7
node tools/traffic_test.mjs                         # §6
node tools/mobiletest.mjs                           # §10
node tools/perf.mjs validator                       # §11 → perf/validator.md
node reviews/evidence/exit_cost.mjs                 # §11.1 a (interior cost after exitToExterior)
node reviews/evidence/peek_raycast.mjs              # §11.1 b (glazing rays vs backdrop)
node reviews/evidence/peek_pixels.mjs               # §11.1 b (calls with / without the peeked rooms)
node reviews/evidence/netaudit.mjs                  # §8 (network requests by origin)
node reviews/evidence/doorgaps.mjs                  # §3.1 (static: doors whose rooms do not share the door plane)
node reviews/evidence/audio_profiles.mjs            # §9 (rooms vs ROOM_PROFILES)
```

Evidence files (`reviews/evidence/`):

- Logs / JSON: `build.log`, `smoke.log`, `walktest_full.log/.json` (66 doors + lifts + stairs), `walk_fail.log/.json`
  (hg_cargo / hg_lobby re-run with lane scans), `walk_stairs.log` (stairs-only run), `validate_tech_main.log/.json`
  (boot, console, transitions, streaming, fighters, sync), `validate_leak_sync.log/.json` (leak probe, sync),
  `traffic_test.log`, `mobiletest_run1_timeout.log`, `mobiletest_run2.log`, `perf_validator.log` +
  `perf_validator.md/.json` (copies of `perf/validator.*`), `netaudit.txt`, `exit_cost.log`, `peek_probe.log`
  (state after the mobile exit sequence vs control), `peek_pixels.log`, `peek_raycast.log`, `view_gap.log`,
  `view_gap2.log` (screenshot runs at the `hg_lobby` void).
- One-off scripts used for the numbers above: `exit_cost.mjs`, `netaudit.mjs`, `doorgaps.mjs`,
  `audio_profiles.mjs`, `peek_probe.mjs`, `peek_pixels.mjs`, `peek_raycast.mjs` (they import
  `playwright-core` / `src/core/layout.js` by absolute `/workspace/...` path and write screenshots to
  `shots/validator/`; run them from the repo root with the dev server up).
- Screenshots: `hg_lobby_void_from_lobby.png` (lobby threshold, black strip with stars, door sill beyond),
  `hg_lobby_from_hangar_side_door_closed.png` (the closed blast door hides the void from the hangar side — why
  it is easy to miss), `hg_lobby_fall_from_hangar.png` (after the fall: hull underside and planet),
  `hg_cargo_blocked_from_hangar.png` (stair stringer and ops banks across the cargo arch),
  `board_default_view.png`, `exit_tower.png`, `exit_hangar.png`, `exit_engineering.png`, `exit_crew.png`,
  `exit_tower_portrait_glazing_black.png`, `mobile_03_interior_touch.png`, `mobile_05_portrait.png`,
  `stairs_bridge_pit_port_aft.png`, `stairs_hangar_tower_gallery.png`, `stairs_reactor_west_catwalk.png`,
  `stairs_briefing_tiers.png`.
