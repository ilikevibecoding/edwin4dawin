# Star Destroyer conversion: progress log

Loop: baseline → plan → exterior silhouette → interior structure → bridge → hangar/traffic → materials,
lighting, atmosphere, audio hooks, animation → visual critique → technical verification → perf → merge
→ full review. Numbers come from `tools/check.mjs`, `tools/verify.mjs` and `tools/shots.mjs` on the
build machine (software WebGL: counts are transferable, frame times are not).

## M0 · Baseline (commit a727b08)

See `docs/BASELINE.md`: 5 rooms, 124 draw calls, 226 k tris, 22 lights always on, no exterior.

## M1 · Foundation and silhouette (commit 2178da7)

Built:
- `src/config/shipSpec.js`: hull (1600 m wedge, trench, ventral keel block), superstructure terraces,
  tower (neck, slab, domes, spire), engines, hangar well, two turbolift shafts, 4 decks, 27 rooms with
  bounds/doors/windows, 8 corridors, 8 reserved future systems.
- Interior registry: per-space kits, zone streaming (tower / engineering / hangar built on demand),
  portal culling (current space + 2 door hops), auto-derived corridors (junctions, room doors and lift
  portals become openings), instanced sliding doors with proximity logic and toggling colliders,
  turbolifts that physically carry the player (carry floors) and swap zones mid-ride, light pool (14
  points + 3 shadowed spots serve hundreds of fixtures with a constant shader light count).
- Player: walkable floors, stairs/ramps, step-up, run key; legacy freighter rooms re-themed to the
  Imperial palette and embedded as the command deck's auxiliary flight-control wing.
- Exterior skeleton with sun term injected into exterior materials (no interior light leaks), instanced
  plates / trench machinery / terrace greebles / turrets / domes / antennas / window rows in near/mid LOD
  groups, engines with glow, keel block with the real hangar well and a tractor sheet.
- Camera modes: exterior orbit/fly camera kept outside the hull, board (spline through the bridge
  windows) and exit (window bay or hangar well, fade for windowless rooms) transitions, per-mode FOV and
  near plane. Fighter traffic skeleton with `Pilot` hooks and serialisable state. Reserved systems, audio
  hooks with procedural ambience, perf monitor (fps, p95, JS ms, calls, tris, visible objects, texture MB,
  heap, load, shader compile, long tasks).

Measured (`tools/check.mjs`, 1280×720):

| View | Draw calls | Triangles | Visible objects | Lights |
| --- | --- | --- | --- | --- |
| ext_far | 245 | 108 k | 705 | 0 (sun term) |
| ext_mid | 240 | 62 k | 705 | 0 |
| ext_close | 209 | 125 k | 709 | 0 |
| bridge (shell) | 109 | 197 k | 709 | 14 |
| room:A-spine | 123 | 142 k | 709 | 14 |
| hangar (shell) | 191 | 1 133 k | 795 | 14 |
| cockpit (legacy wing) | 208 | 397 k | 709 | 16 |

Ready-to-first-frame on the build machine: ~20 s (software GL; texture generation + shader compile).
Texture memory estimate: 108 MB. Exterior draw calls are dominated by the six fighters (~35 meshes each,
fixed in the traffic workstream).

`tools/verify.mjs`: 19/19 — every room resolves to itself, doors open/close and toggle their colliders,
both lifts ride every deck carrying the player and streaming zones (tower → engineering → hangar), exit
and board transitions complete, traffic advances, reserved systems registered, budgets held.

Open issues carried into wave 1: hull too dark/flat from mid range; shells are placeholders for all 26
new rooms; hangar shell has a solid floor (well must be open); legacy cockpit key light blob (spot now
pooled without its frame shadow at that moment); exterior window rows invisible from far.

## Wave 1 (parallel workstreams, isolated worktrees) — integrated at commit 142031b

Eight agents, eight branches, each owning disjoint files (`docs/AGENT_GUIDE.md`): exterior hull detail
(`src/exterior/*`), bridge, command-deck rooms, crew-deck rooms (two agents), engineering rooms, hangar
deck + `src/hangar/machinery.js`, fighter traffic (`src/hangar/traffic.js`, `tie.js`). Two merge conflicts
(both in `src/exterior/hull.js`: the tractor sheet, the keel-plate hole sign) resolved by hand.

Shared fixes made during integration from the agents' reports: space resolution tolerates 2.6 m pits;
pooled spots honour each fixture's shadow range; light pool skips fixtures in culled spaces and favours
the current room; portal culling never draws rooms behind a second door; thin-wall-safe panel backing
plates; legacy mirror reflects only within 4.5 m; ventral keel raised so the hangar keel block is the
lowest point (the old hull wedge cut through the well); tractor sheet faces down and is faint; the lit
hangar is shown through the well from below the ship; `roomShell` accepts panel pitch / style mix;
touch controls for phones.

All 27 spaces now have finished interiors; the exterior has plating with sun + fill shading, layered
plates, trench machinery, superstructure city, turrets, engines, running lights; fighters are 3 meshes
with an instanced far LOD.

`tools/verify.mjs` on the integrated branch: 19/20 — the one failure is the legacy flight-control wing
view at 332 draw calls against the 320 budget (its five freighter rooms are one space with ~35
materials; portal culling has since been tightened).

`tools/shots.mjs sd1_wave1` (build snapshot, 1280×720, 56 frames + checks; drift, interactions,
transitions and lift ride all pass):

| View | Calls | Triangles | Lights |
| --- | --- | --- | --- |
| ext_far | 79 | 152 k | sun term |
| ext_mid | 87 | 119 k | sun term |
| ext_close | 95 | 192 k | sun term |
| ext_tower | 92 | 200 k | sun term |
| ext_belly | 116 | 277 k | sun term |
| bridge | 193 | 441 k | 15 |
| bridgeAft (looks down the spine) | 348 | 663 k | 13 |
| hangarDeck | 132 | 285 k | 15 |
| room:reactor | 124 | 289 k | 14 |
| room:medbay | 262 | 593 k | 14 |
| room:lounge | 246 | 634 k | 14 |
| room:B-spine (corridor, sees every crew-deck door) | 327 | 674 k | 14 |
| room:cargo | 90 | 255 k | 15 |

Totals: 121 MB estimated texture memory (108 baseline), 85 shader programs, 1.7 s shader compile on the
build machine, JS heap 253 MB (includes the procedural texture canvases), zone build 1.1 s / 0.4 s / 0.3 s
(tower / engineering / hangar) on the build machine, ready in 26 s here (software GL).

Review after this merge: three independent visual critics (exterior, decks A+B, decks C+D) and one
technical reviewer; their fix lists drive wave 2.

## Review after wave 1

Three independent visual critics and one technical reviewer (see the agent reports) produced ranked fix
lists. Headline findings: the exterior collapsed to a flat white cutout beyond 1.3 km and the belly was
crushed and sparkling; the hangar read as a "blue pool" with no fighters visible, a flat bright ceiling
and an empty deck; the reactor was under-scaled and the hyperdrive off-palette; the officers' quarters
read as a corridor; emissive strips blew out and ceilings went void everywhere; the legacy wing kept its
freighter palette; decal labels named the wrong deck. The technical reviewer found that wall colliders
were left across corridor junctions and lift portals (the player could not walk between corridors on
foot; the automated checks had teleported past it), the light pool allocated per frame, culling fell back
to "draw everything" in lift shafts, and transitions had edge cases.

## Wave 2 (seven resumed workstreams + shared fixes) — integrated at commit fc80414

Shared fixes (integration branch): junction and lift-portal colliders cut (physical walk test added to
`verify.mjs`), door-state-aware portal culling (a neighbour behind a closed door is never drawn; corridor
views fell from ~430 to ~140 draw calls), nearest-space culling in shafts, lifts prebuild the destination
zone and serialise fully, sub-stepped player integration, allocation-free light pool, textured door
leaves with red/blue status lamps, corridor floor guide lights and bulkhead frames, room-name door signs,
generic Imperial decal texts, four extra console UI layouts, tamer emissives, matte ceilings, more
ambient, legacy wing re-lit cool with shuttered portholes, exterior sky cleaned (no dust streaks outside,
fainter galactic glow, calmer planet halo), mode manager drives `exterior.setMode`, NPC hooks
(`kit.marker`, `interior.navData`, fighter event listeners).

Workstreams: exterior (form lighting with a cast-shadow sun in orbit view, ventral detail, engines,
de-tiling, bridge face, neck), bridge (viewport alcove, pilastered walls, lit pits, blast-door surround),
command deck (officers' wardroom + cabins, projected tactical hologram, comms props, intel cool key,
theatre benches, lobby surrounds), crew deck forward (bedding, mirrors, dressed mess, medbay beds, pod
states), crew deck aft (lounge, briefing amphitheatre, armoury, cells, life support variants), engineering
(27 m reactor column with upper gallery, hero motivator, board variants, crane), hangar (clamp racks with
lit fighters, launch cradle, trussed ceiling, well shaft with blast leaves and beacons, populated deck,
flight-control cab, shuttle, cargo stacks).

`tools/verify.mjs`: 27/27 (rooms resolve, 35/35 spaces reachable, physical walks through junctions, a
door and to the lift portal, doors, both lifts across every deck carrying the player, transitions,
traffic, reserved systems, budgets, no page errors).

`tools/shots.mjs sd2_wave2` (build snapshot, 1280×720, 56 frames + checks) after the culling change:

| View | Calls | Triangles | Lights |
| --- | --- | --- | --- |
| ext_far | 97 | 411 k | sun |
| ext_mid | 101 | 420 k | sun |
| ext_close | 102 | 432 k | sun |
| ext_belly | 146 | 581 k | sun |
| bridge | 177 | 451 k | 15 |
| bridgeAft | 135 | 347 k | 15 |
| hangarDeck | 159 | 317 k | 15 |
| room:reactor | 105 | 241 k | 14 |
| room:officers | 137 | 219 k | 14 |
| room:B-spine (corridor) | 136 | 137 k | 6 |
| room:A-spine (corridor) | 139 | 152 k | 5 |
| room:flightControl (legacy wing) | 314 | 710 k | 16 |

Every view is under the 360-call / 1.6 M-triangle guard; the legacy wing remains the heaviest space
(five freighter rooms in one space with ~35 materials). Totals: 139 MB estimated texture memory (mips
included; the technical reviewer's independent count was ~140 MB), 127 shader programs, 1.9 s shader
compile on the build machine, JS heap 299 MB in Chromium (procedural texture canvases included), zone
build 1.3 s / 0.65 s / 0.55 s (tower / engineering / hangar) on the build machine's CPU, ready in ~30 s
there (software GL; the same page reaches its first frame in a few seconds on a laptop GPU).

Evidence frames of that stage were superseded by `docs/evidence/final/*.jpg`.

## Final review and wave 3 — integrated at commit 7c1ee93

The final acceptance critic (wave-2 frames) passed the interior outright: 24 purpose-clear finished rooms
plus the auxiliary flight-control wing and lobbies; bridge and hangar the two richest spaces; fighter
traffic visible; one coherent Imperial language with deck-coded accents (A cool blue-white, B amber, C
amber/teal industrial, D hazard orange); ceilings and labels fixed. It asked for one more exterior pass
and a few room touch-ups, which became wave 3:

- Exterior: ventral wedge rebuilt as geometry with recessed channels and a shaded hemispherical reactor
  bulb; sun one stop lower with a view-independent lit/shadow side on the roof halves; large patch tint
  variation; six varied docking pads; engine cores as radial gradients with concentric throats and soft
  plumes; neck with recessed channels, storeys, window rows, pipes and ladders.
- Hangar: racked fighters slewed so pods show between the wings from every deck view, a lit TIE always in
  frame from the well, dressed far deck (hose reels, fuel line, carts, loader), lit cradle TIE, 1.5×
  shuttle with panelled wings, gear, lit ramp and crew hatch, equipment bays and a status board.
- Engineering: 5.6 m drive housing with coils around a banded, breathing core in the middle of the
  hyperdrive room; reactor column as a contained beam with drifting bands, field rings and clamped hoops.
- Command deck: officers' wardroom composed into the door view with a calm ceiling; comms spine capped;
  observation rows all different. Shared: light pool scores neighbouring spaces' fixtures at 22 % of the
  current room's so small rooms beside the hangar keep their own lights; the sky-drift check now uses the
  bridge windows (the wing's side portholes are shuttered).

`tools/verify.mjs`: 27/27. `tools/shots.mjs sd3_final` (build snapshot, 1280×720, 51 views + checks; sky
drift through the bridge windows 22 % of pixels changed vs 0 % on the interior control region; all three
legacy interactions respond; exit/board transitions, a lift ride and traffic advance all pass):

| View | Calls | Triangles | Lights |
| --- | --- | --- | --- |
| ext_far | 96 | 451 k | sun |
| ext_mid | 100 | 461 k | sun |
| ext_close | 101 | 473 k | sun |
| ext_tower | 100 | 486 k | sun |
| ext_belly (incl. hangar seen through the well) | 145 | 634 k | sun |
| ext_stern | 101 | 486 k | sun |
| bridge | 131 | 353 k | 14 |
| bridgeAft | 134 | 348 k | 15 |
| hangarDeck | 117 | 236 k | 15 |
| room:reactor | 107 | 249 k | 14 |
| room:hyperdrive | 114 | 273 k | 14 |
| room:officers | 137 | 219 k | 14 |
| room:shuttleDock | 100 | 280 k | 16 |
| room:B-spine (corridor) | 142 | 139 k | 6 |
| room:flightControl (legacy wing, heaviest) | 314 | 711 k | 16 |

Every view is within the 360 draw-call / 1.6 M-triangle guard; 46 of 51 views are under 200 calls.
Totals: 140 MB estimated texture memory (mips included), 131 shader programs, 2.0 s shader compile on
the build machine, JS heap 307 MB in Chromium (procedural texture canvases included), zone build
1.36 s / 0.51 s / 0.45 s (tower / engineering / hangar) on the build machine's CPU, page ready in ~30 s
there under software GL. Evidence frames: `docs/evidence/final/*.jpg`.

### Remaining limitations (honest list)

- Frame rate was never measured on a real GPU here (software WebGL only): draw calls, triangles,
  texture memory and light counts are the measured proxies; the adaptive scaler and per-view budgets are
  what protect frame rate on real hardware.
- The legacy auxiliary flight-control wing keeps its freighter geometry (re-lit and re-palletted) and is
  the heaviest single space at 314 draw calls.
- Depth precision: one far plane (60 km, for the far field) with a 5 cm near plane inside; layered hull
  plates seen through the bridge windows at 500 m+ rely on LOD ranges rather than a reversed depth
  buffer.
- Cast shadows exist only in orbit view (directional sun); inside, three pooled shadow spots carry the
  key lights and the rest of the lighting is unshadowed.
- Fighters use scripted/formation pilots only; NPC crew, boarding gameplay, flight and landing remain
  reserved stubs by design of this milestone.
- The GitHub pull request could not be opened from this agent ("must be a collaborator"); the branch is
  pushed and up to date.
