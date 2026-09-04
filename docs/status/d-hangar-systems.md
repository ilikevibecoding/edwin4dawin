# Status — D: hangar + ship systems (Deck 4 + infrastructure)

Branch: `cursor/sd-hangar-systems-c071` · Last push: eeaa2618 · 2026-09-04 23:55 UTC
Run: `bc-27044d48-9403-4636-af76-59d715aec071` · Phase: 3 (two critic loops done; final hangar round landed; waiting on A's scaffold to merge)

## Summary (3–6 lines, what a reviewer needs to know right now)

All of Deck 4 and all four D systems exist and pair: 10 rooms (`d4-hangar`, four bays, lobby, two
corridors, stairs, control tower) + `sys-doors`, `sys-lifts`, `sys-traffic` + the corridor kit.
Full-deck harness run (13 modules, 59 views): **0 registry warnings, 0 budget warnings, 0 page
errors**, every door paired, load 9.7 s on this VM, heaviest whole frame 199 calls / 901k tris (budget
450 / 1.5 M). Every module is within its §12 budget (table below). Early deliverables for B/C are on
the branch: `src/systems/corridor/corridor.js`, `src/systems/doors/helper.js`, `src/systems/lifts/helper.js`
(each with a README). No scaffold on the integration branch yet, so testing runs through the dev
harness in `src/hangar/_dev/` (implements §7/§8/§9.4/§9.5; retire when `src/core/registry.js` lands).
One full critic loop is done: two blind critics scored the first 59-view set at a 4.1–4.2 mean (clipped
emitters/flat light, Kestrel textures reading as grime and cracked concrete, mixed hazard palettes,
Earth-depot dressing, lorem placards, rack slots over bay doors, vanishing door leaves, kiosks in the stair
path). Every finding was mapped to a fix (per-module lists in each fix commit); the global ones landed in the
harness (clean `impPanel`, dark reflective `impFloor`, black/yellow `hazard`, emitters tuned to bloom, a
lit-ceiling bootstrap environment). A second blind critic scored the fixed set 6.1/10 (from 4.1) and
ranked the main hangar lowest; its final round (plated deck sheet, stencilled apron, housed floods with
real pools, dressed bow/aft walls, lit shaft lining, crew hatches beside every bay door) is on the branch.
Final full-deck run `full-final`: 13 modules, 61 views, 0 warnings, 0 page errors, load 12.1 s.

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

Per module, from the final full-deck run `full-final` (all 13 modules loaded, 61 views, post-critic). Budgets:
room ≤ 120k tris / ≤ 16 materials / ≤ 14 descriptors / ≤ 400 colliders / ≤ 250 ms; hangar ≤ 300k / 24 / 28;
traffic ≤ 40k tris / ≤ 6 draw calls. (Build times are with all 13 modules building back to back.)

| Module | build ms | materials (draw calls) | tris | light descriptors | colliders | views |
|---|---|---|---|---|---|---|
| `d4-hangar` | 203 (155 alone) | 22 (+1 field shader) | 287.8k | 27 | 159 | deck, aperture, racks, aft-wall, balcony, bay-door, exterior |
| `d4-fighter-bay` | 113 | 13 | 82.2k | 11 | 96 | door, cradles, gantry, racks |
| `d4-shuttle-bay` | 68 | 15 | 62.7k | 13 | 80 | door, pad, gantry, staging, booth |
| `d4-cargo-bay` | 111 | 14 | 93.6k | 14 | 72 | door, racking, loader, conveyor |
| `d4-repair-bay` | 94 | 14 | 76.3k | 14 | 133 | door, jacks, welding, benches |
| `d4-lobby` | 21 | 14 | 12.5k | 6 | 23 | lift, hangar-door, east-wall, directory |
| `d4-corridor-east` | 79 | 13 | 45.4k | 14 | 72 | long, cargo-door, end |
| `d4-corridor-west` | 68 | 13 | 44.8k | 14 | 72 | long, repair-door, end |
| `d4-stairs` | 40 | 11 | 28.9k | 10 | 89 (+2 interactables) | foot, well, landing, top |
| `d4-control` | 69 | 16 | 32.1k | 11 | 53 | window, consoles, holo, board, hatch |
| `sys-doors` | 35 | 8 kit + 6 instanced | 30.7k | 0 | 88 (30 dynamic leaves) | standard closed/open/side, blast closed/open/side, stairs closed/open, sealed, bay-apron |
| `sys-lifts` | 25 | 14 kit + 5 | 5.5k | 1 | 9 (+2 dynamic) | door, door-open, cabin, panel |
| `sys-traffic` | 13 | 6 (all instanced/points) | 34.6k | 0 | 0 | approach (exterior), racks, hover, patrol (exterior) |

Whole frame per view (includes post passes and the three systems): 67–200 draw calls, 170k–1.03 M
triangles (budget 450 / 1.5 M; heaviest hangar frame after round 3: balcony view 183 calls / 1.02 M
tris); load 11.2 s on this VM (budget 12 s — the hangar's ~200 ms build and the canvas atlases are the
cost; see Remaining).

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

- Harness tag `full2` (`/tmp/sd-shots/full2/`, not in git; results.json + log attached to the run as
  artifacts): 13 modules, 61 views, **0 registry warnings, 0 `[budget]` warnings, 0 page errors**, load
  12.2 s. Pre-critic baseline `full1`: 59 views, 0 warnings, load 9.7 s, 75–199 calls, 138k–901k tris.
- Critic loop: two blind critics (images + brief only) scored `full1` — critic A (hangar, traffic, bays;
  28 frames) mean 4.2/10, critic B (lobby, corridors, stairs, control, doors, lifts; 31 frames) mean
  4.1/10. Ranked fixes from both: (1) emitters clip to white, no pools/contact shadows; (2) materials read
  as grimy plaster / cracked concrete, mixed hazard palettes; (3) door leaves vanish when open, thin frames,
  identical slabs; (4) copy-pasted dressing (lorem placards, identical bays, repeated screens, Earth-depot
  props); (5) stairwell (3/10 ×4) and scale cues in the hangar. All items were mapped to fixes per module
  (each fix commit message + the subagents' "critic items → what changed" lists); global ones landed in the
  harness.
- Second blind critic on a 16-frame cross-section of `full2`: **mean 6.1/10** (from 4.1–4.2). Per frame:
  blast door 7.5, lobby 7.0, open standard door 7.0, lift cabin 7.0, cargo racking 6.5, corridor 6.5,
  control window 6.5, fighter bay 6, shuttle bay 6, repair bay 6, stairwell 6 (was 3), traffic approach 5.5,
  hangar deck/aperture/racks 5, hangar aft wall 4. Verdict: "systems and corridors are near-shippable; the
  main hangar is the weakest room". Two of its readings were checked and are not bugs: "half-size fighters"
  compares 7 m fighters with the 10 m bay doors (it assumed 4 m doors — so the bay doors need human-scale
  cues beside them), and "rack IDs repeated on both tiers" misread `P1-xx`/`P2-xx`. Its hangar items
  (bare deck near the cameras, floods lighting walls instead of racks, ceiling reading as a void, aft/bow
  walls as tiled billboards, unlit shaft) went to a final hangar round; the global ones landed in the
  harness (clean `metal`/`paintedMetal`, lifted hemisphere ground term).
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
- Hangar (`/tmp/hangar-coll2.mjs`, 21/21): aperture rails/bars, walls, stairs, rack columns, clutter,
  gantry, balcony rails, crew hatches block; door holes open; maintenance hatch decorative. Traffic
  cross-check (`/tmp/hangar-traffic.mjs`): 28 slots read, 20 occupied → 18 after launches, clamp state
  equals occupancy at t ≈ 0 and at the end, 0 mismatches.
- Hangar final round (critic pass 2 items, harness tag `hangar-final5`, all 7 hangar views): every item
  mapped to a change — deck: 8 m plate sheet (seams, rivets, tie-down rings, per-plate tone, roughness
  from the G channel), taxi lane with yellow edges + `HOLD SHORT` bars, `FLIGHT DECK 4` / `DECK 4` /
  pad `01–06` / `BAY n` stencils, contact shadows under clutter; lighting: four louvred rib floods at
  `layout.FLOODS` with lit lenses, two apron spot pools (0.24 rad) either side of the lane, two spots
  re-aimed at the port tiers, lit fascia strips under every tier platform; ceiling: emissive cells + long
  light channels with diffusers; walls: bow wall dressed like the side walls (catwalk ring, gallery at
  y −60, housed red beacons on ribs, recessed bands, blast portal), aft wall blast-door portal + service
  gallery + recessed louvred vents + `HANGAR CONTROL` balcony with rail/lit fascia/soffit lamps; aperture:
  0.3 m steel lip turning into the hole, two lit lining rows down the shaft, lit rail strip with post caps,
  2 m dashed hazard band; scale cues: a 2.4 × 3.0 crew hatch + console/locker group within 6 m of every
  bay door; crane parked over the aft apron at t = 40 with hook down. Foreground deck band in the racks
  view measured 12 → 57–69/255. Pixel-diffed: bay-door and exterior views unchanged.
- Full deck after the final round (harness tag `full-final`, port 5100, all 13 modules): **0 registry
  warnings, 0 page errors**, hangar 287,178 tris / 27 descriptors / 21 materials / 156 colliders /
  207 ms while the other 12 modules build alongside; hangar views 132–170 calls, 864k–986k tris.

- Third blind critic (7 final hangar frames, images + brief only): **mean 5.6/10** (deck 6, aperture
  5.5, racks 6, aft wall 5, balcony 6, bay door 6.5, exterior 4; the hangar was 4–5 in pass 2). Verdict:
  "composition, signage and props are now right — the hall feels 240 m long — but surfaces and light are
  still greybox: flat clean plates, unshadowed walls, a uniform clipped ceiling grid, no grounding
  shadows". Of the 11 pass-2 items it marked 5 fixed, 5 partly, 1 not (crane not visible in any frame).
  Two of its findings were not bugs: the "stray white point" at the frame centre in two views was the
  HUD crosshair (the harness no longer draws it in shots), and the exterior frame's "hull ends in hard
  edges" is A's hull not being on the branch yet. Its ranked items went to a hangar round 3 (deck wear
  contrast + contact shadows, fewer housed ceiling floods under clip, rack spot overshoot, apron pools
  from the balcony, baked AO / gradient / cornice on the aft wall, lit or removed wall rectangles, larger
  stencils, support towers under the control balcony, thinner lit balcony rail, bow-wall feature,
  containment-field body ≤ 5 %, rail sign text, housed bay-door bars, hazard-band blotches, lit junction
  boxes, crane parked in view) and a traffic round 3 (soft tractor-beam cones with length falloff at
  half opacity; dark blue-grey TIE albedo).

- Hangar round 3 + traffic round 3 (every critic-3 item has a change against it; full lists in the two
  commit messages): deck — five per-plate tone steps (adjacent plates measured 56/67/70/77), seam grime,
  tyre tracks along both lanes (~25 % darker than the plate beside), pad scuff arcs, drag marks at doors,
  contact shadows 0.5–0.9 m past every footprint (62 % darker under a crate) + bands under tiers and
  wall bases; ceiling — housed louvred floods at 16 m, strips under the bloom threshold; rack spots
  re-aimed at tier 1 (520, wall behind mid-grey, port = starboard); apron pools on pads 03/04 from the
  balcony; aft/bow walls — baked AO flanks on every rib, upper two-thirds 35–40 % darker, gunmetal bands,
  1.4 m cornice, recessed amber-lit vents, 17.8 m DECK / 4 panels, buttress towers + fascia girder + knee
  struts under the control balcony, `FORWARD SECTIONS — SEALED` band on the bow wall; thin lit
  handrail; field body 0.002 (space near-black); `APERTURE — KEEP CLEAR` rail plate; caged jamb bars;
  the hazard-band blotches were the bay-door point light mirrored in the glossy leaves (moved off-axis);
  lit junction boxes; crane parked over the lane at z 66, hook at y −40, in the deck and balcony frames.
  Traffic — beams brightest facing the camera and zero at the silhouette with length falloff (halo
  alpha 0.14), TIE albedo dark blue-grey (frames `0x3a3e4b`, cells `0x08090c`), rougher hull; 22/22.
  Build-time work in the same round: ~800 decals batched per material, row-filtered panel cuts,
  back-face-culled wall boxes (frames pixel-identical). Scripts: collisions 24/24, clamp/occupancy 0
  mismatches. Full deck `full-r3`: 13 modules, 61 views, 0 warnings, 0 page errors, load 11.2 s.
- A stray `node -e` unused-import checker left by a subagent had pinned one of the four CPUs at 94 %
  for nine hours (inflating every build-time reading, including the 281 ms hangar outlier); killed by
  PID. All timings above are from after that.

- Fourth blind critic (round-3 frames): **mean 6.2/10** (deck 6.5, aperture 6, racks 6.5, aft wall 6,
  balcony 6.5, bay door 7, exterior 5) — hangar trajectory 4–5 → 5.6 → 6.2; the bay door is at the
  corridors' 7. Its key finding is about legibility, not absence: it reported "no crane in any frame",
  "no per-plate variation", "no contact shadows", "no wall gradient / rib AO" — all of which round 3
  built and measured. 2× crops show them present but within a couple of values of their surroundings
  (the crane is a dark girder on a dark ceiling whose lit strip reads as one more ceiling strip). Round 4
  therefore has one rule — every change is judged on a 640×360 downscale of the frame — and targets the
  critic's top five: floor patchwork + directional wear + near-black contact AO, ceiling per-bay variation
  with dark segments and a light-grey hazard-banded crane with work lights in the middle third of the
  deck frame, dark metal channels with lenses on every bare strip (rack rails, jamb bars, wall strips,
  port/starboard floods) and the far-wall streak, 2–3× stronger end-wall gradient/AO plus lit slot
  grilles and one large-scale feature per end wall, and the near aperture lip (the "speckle panel" under
  the KEEP CLEAR plate is the non-slip band's blotchy wear at a grazing angle). Traffic: the arriving
  fighter's landing lamp clips to a white disc at the beam focus — being brought under clip.

## Remaining
1. Hangar round 4 + traffic lamp fix in flight; fifth blind critic pass on the round-4 frames afterwards.
   The hangar critic loop closes there unless it reports a geometry bug: four passes have taken it from
   4–5 to 6.2 with every item mapped to a change, and the remaining spread to the corridors' 7 is the
   lighting model (see Requests: shadow-casting key light), which no dressing pass can supply.
2. Load time 12.1 s with all 13 modules is at the §12 limit: the hangar builds in ~200 ms (limit 250) and
   the text/hazard/decal canvas atlases cost ~1 s; candidates are lazy per-room building (A's streaming
   plan already builds in chunks) and sharing one text atlas across modules.
3. Re-run the full deck once B's `d1-lobby` / C's `d2-lobby`, `d3-lobby` merge, to confirm T1–T3
   cabins and orientations (`liftLobbyClearance()` left 1.7 / right 2.4 m beside the lift door).
4. Retire `src/hangar/_dev/` when `src/core/registry.js` lands; move view checks to `tools/shots.mjs`
   (it already blocks the Vite HMR client and supports per-view `time` / `advance`).
5. Two sets of clamp hardware per rack slot (hangar cradle arms + traffic clamps) agree via
   `slot.occupied` but are doubled geometry; the open cradle arm still crosses the ±x final-approach
   line for ~1 s of docking. Cheapest fix: hangar arms swing to 90° when the slot is empty.

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
  (the shim adds a fixed bonus for the current room); with `d4-hangar`'s 27 descriptors active as a
  neighbour, the bays otherwise lose all their pools.
- **Shadow-casting key light (same ask as B's "shadow slot" and C's `shadow: true` proposal).** Three
  independent blind critics, on three decks, rank "no contact shadows, unshadowed walls, props floating
  tonally" as the top remaining item; we are faking it with baked AO bands and contact-shadow decals.
  Proposal: an optional `shadow: true` on a light descriptor; the pool reserves one spot slot (two on
  high tier) with a 1024 shadow map for the highest-priority shadow-flagged descriptor of the current
  room only (never neighbours), `renderer.shadowMap` PCFSoft, kit meshes `receiveShadow`, instanced
  leaves/craft `castShadow`. One shadowed spot per room is the cheapest change with the largest visual
  return left in the whole build; the hangar would flag its two apron floods, each bay its key flood.
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
  needed (C asked for this in `docs/review/`; that folder is A's, so the answer is here and in the
  lifts README). `liftCabinBox(lift)` returns the 4 × 4 × 3.6 volume to keep free. Checked against the
  branches: B `T1 (0, 240, 522) dir (0,0,-1)`, C `T2 (0, 40, 385)`, `T3 (0, 12, 565)`, all `dir (0,0,-1)`
  with 2.4 × 3.0 holes — the network will pair T1–T4 as-is.
- **Wall thickness (answer to B's interface note).** Decks 1–3 build 0.30 m walls; the doors and lifts
  systems assumed 0.16 everywhere, which would have buried the frames, headers and status lights inside
  those walls and left 0.14 m of raw hole edge. Fixed on D's side without a contract change: a room may
  declare **`wallT: 0.30`** on its manifest (optional, default 0.16, read by `wallThickness()` in
  `src/systems/doors/helper.js`). The doors system puts each face's lining, frame, header, status
  lights and colliders on that room's own inner face — a 0.30 room pairs with a 0.16 room (Deck 4 stays
  0.16) — and the lift's whole lobby-side frame (jambs, header, lintel, hood, sill front, call panel)
  moves out to the lobby's face; `liftLobbyClearance(lift, wallT)` grows by the difference. B and C:
  add `wallT: 0.30` to every room manifest (one line each; `_shared/room.js` on C's side can spread it).
  Verified: node test (13/13) with 0.16/0.16, 0.30/0.16, 0.30/0.30 and an unpaired 0.30 door; the
  existing doors (21/21) and lifts (28/28) tests unchanged at 0.16; harness shots with `d4-lobby` at a
  synthetic 0.30 show the complete blast-door and lift frames standing 0.14 m further into the room.
  If A instead fixes the contract at 0.30 for everyone, flipping `WALL_T` is the only change needed.
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
