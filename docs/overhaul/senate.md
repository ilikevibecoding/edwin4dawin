# The Galactic Senate as a centrepiece (P4)

Rubric: `docs/rubrics/17_senate.md`. Test: `node scripts/test-senate.mjs` (93 offline checks) and
`node scripts/test-senate.mjs --url http://localhost:PORT` (+7 in one headless Chrome). Stats:
`node scripts/landmark-stats.mjs senate` (122 rooms, 0 unreachable, 0 unlit).

Files owned by P4: `src/coruscant/landmarks/senate.js`, `src/senate/**`, `src/ui/senate.js`, `src/ui/senate.css`,
`scripts/test-senate.mjs`, `docs/rubrics/17_senate.md`, this document. Nothing outside these files was changed; the
runtime is **not wired into `game.js` / `save.js` yet** — see "Hooks for the integrator".

## 1. Architecture

The Senate is one landmark blueprint (`LANDMARK` in `landmarks/senate.js`, lot 167 x 175, family `senate`), built in
polar coordinates around the drum's centre `G.CX, G.CZ` (local 83, 79). Everything is a function of the landmark's
seed; there is no `Math.random`. The drum is a vertical section of concentric bands (bins = whole-block radii):

| Band (bins) | What | Levels |
| --- | --- | --- |
| 0..30 | **pit floor**, 61 blocks across, concentric light rings; the four ground tunnels open onto it | y 1 |
| 0..5 | **podium column** with blue rings; the **Chancellor's dais** on top (rail, console, holo, four aides' seats, `chancellor` work record); the Chancellor's lift inside; 47 blocks of air above the Chancellor to the dome | dais y 14 |
| 31..36 / 37..42 | **bowl ring 1** (24 pods, walk y 3) and **ring 2** (28 pods, walk y 6); eight radial stairs on the half-diagonals from the pit to ring 2; slab bridges carry ring 1 over the four tunnels | y 3 / 6 |
| 43 / 44..52 | inner wall; **inner band rooms** at levels 1 and 6 (hearing chambers, meeting rooms, guard posts, archive, server room, diplomatic reception, the **Jedi liaison lounge**) | y 1, 6 |
| 40..45 / 46..52 | **three wall tiers** of 30 hanging pods each (console, four seats, holo, lit underside), a 7-wide **gallery ring** behind every tier with a rail between pods; the middle tier is staggered half a slot so every pod front hangs over air | y 11, 16, 21 |
| 44..52 | **public viewing gallery** with stepped seats and a rail | y 26 |
| 53 | the **enclosing wall** (105 across): plaster with chrome pilasters, gold bands at the gallery, lit slits up to the dome | 1..dome |
| 54..55 / 56 | **service ring** (deck plate, striped panels) and its wall — the staff route on every level | 1, 6, 11, 16, 21 |
| 57..61 | **room band**: the twelve delegation suites (tiers 11 and 16), the Chancellor's office, hall of records, press offices, senators' lounges, canteens, kitchens, guard barracks, freight stores | 1, 6, 11, 16, 21 |
| 62 / 63..66 | outer wall; **public corridor ring** (stone with gold banding), visitor stairs east and west, service stairs north | every level |
| 67..68 | the ribbed **skin**, lit cornice at y 27, four entrances (S security screening, N loading dock, E press, W diplomatic) | — |

Above the drum (top y 26) sits the dome (`DOME_R` 83.56, centre y -21.56) with its lit oculus; the chamber is carved
to the dome's inner surface, so the pit-to-ceiling air at the axis is 61 blocks and 47 above the dais.

Approach (south): forecourt paving, a gold-edged lit spine, paired chrome colonnades with lit capitals (12 columns),
six statue plinths flanking the arch and repeating every eight blocks, city lamps between them, Senate Guard kiosks at
the arch and at the gate, gate pylons, and the **boulevard gate deck** at y 35 on twin stalks with its lift, stair
tower and bridge. Corner shuttle pads north-west and north-east.

Vertical circulation for the player is by stairs: visitor stairs at the east and west corridor (alternating south /
north stretches, one flight per level, a radial flight up to the public gallery), service stairs at the north corridor
(alternating east / west), the radial bowl stairs, the internal suite stairs. Lifts (20) serve NPCs: four public
lifts in the lobby ring, twelve delegation lifts (lobby -> suite reception), the Chancellor's lift, the deck lift, the
shuttle-pad lifts.

`bp.meta.senate` (world coordinates) is the contract for the runtime and other systems:

```
centre, radius { hall, drum }, levels[5], tiers[3], galleryY, dais, deck,
delegations[12] { id, name, senator, world, concern, palette, emblem, tier, size, layout, artifact, view, extraRoom,
                  suite { rooms[], y, entry, podDoor, arc, lift, lobbyDoor }, pod { tier, k, spot, seats[] } },
pods[3][30] { tier, k, delegation|null, spot, seats[4] }, bowlPods (52),
liaison { room, spot, route[] }, petition { room, desk }, hearing, chancellorOffice,
routes { visitor[16], service[13] }, stairs { visitor[10], service[4] }, publicLifts[4]
```

## 2. The twelve delegations (`src/senate/delegations.js`)

All original inventions — no canon worlds, senators or legislation. The table drives both the blueprint and the
simulation. Every pair differs in at least four of palette, size, layout order, artifact, view, tier, extra room
(`suiteDifferences`, asserted pairwise by the test).

| id | Delegation | Senator | Concern | Tier | Size | Layout (clockwise) | Artifact | View | Extra room |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kessar | Kessar Reach | Asha Merin | public services, lower-level infrastructure | 1 | L | lounge, records, reception, office, aides | planters | chamber | — |
| veth | Veth Combine | Doran Vex | mining exports, low port charges | 1 | M | reception, office, aides, records, lounge | ore crates | city | workshop |
| orrin | Orrin Shoals | Maela Tirsk | fisheries, honest customs | 1 | S | records, reception, lounge, office, aides | water tank | skylight | — |
| talvane | Talvane | Cassius Orell | fiscal restraint, the old houses | 1 | XL | aides, office, reception, lounge, records | banners | chamber | shrine |
| dhessen | Dhessen Hub | Pell Andrassy | trade lanes, port capacity | 1 | M | office, reception, aides, lounge, records | route map | city | — |
| cavarra | Cavarra Belt | Ryn Holloway | settler freight, light inspection | 1 | M | reception, lounge, records, aides, office | mineral display | skylight | kitchenette |
| sennet | Sennet Prime | Ilvara Quen | archives, evidence, procedure | 2 | L | records, office, reception, aides, lounge | library wall | chamber | — |
| brakka | Brakka Delta | Tomas Greel | shipyards, port expansion | 2 | M | aides, reception, office, records, lounge | ship model | city | workshop |
| tyrell | Tyrell Verge | Nessa Vahl | relief shipments, clinics | 2 | S | lounge, reception, aides, office, records | medical tank | skylight | — |
| ossara | Ossara | Bren Talwick | forest exports, lower-level air and water | 2 | XL | office, aides, reception, records, lounge | garden | chamber | — |
| quell | Quell Ministries | Hadrik Sol | orderly customs, complete records | 2 | M | reception, records, office, lounge, aides | records vault | city | shrine |
| halcyon | Halcyon Drift | Jory Kest | spacer fleets, open lanes, cheap landings | 2 | L | lounge, aides, reception, records, office | star charts | skylight | kitchenette |

Each suite: its own lift from the grand lobby ring (the lobby shows twelve lift doors with plaque lights), a public
entrance from the corridor ring at its tier, a reception, a senator's office (`executive_office`, an `executive` work
record), an aides' room, records, a lounge, the optional sixth room, a back door from every room onto the service
ring, and a private **pod door** through the chamber wall onto the delegation's own pod (`pod.k`). Sizes are 34 / 38 /
42 / 46 blocks of arc at radius 59.

## 3. The two routes (`bp.meta.senate.routes`)

Both are walked end to end by the test's flood fill with the engine's rules (step up 1, drop <= 3, slabs) and no lift.
They share no waypoint and read differently underfoot (visitor: 63 % smooth stone, 15 % gold, 11 % glow; service: deck
plate, striped panel, dark durasteel).

- **Visitor** (16 waypoints): plaza gate -> avenue between the colonnades -> arch -> security screening hall -> grand
  lobby (south) -> corridor ring east -> east visitor stairs, one flight per level (6, 11, 16, 21) -> radial flight
  to the public gallery (26) -> the gallery rail -> around to the north side of the gallery: the reveal of the whole
  chamber.
- **Service** (13 waypoints): loading dock (north) -> dock storage -> freight store -> north service stairs (levels 6,
  11) -> service ring at tier 11 -> around the ring past the suites' back doors -> Kessar Reach's pod door -> the pod.

## 4. Sessions (`src/senate/session.js`)

Two sessions a game day, convening at 09:00 and 15:00 (`SESSION_SLOTS`), each 3.25 hours:
`recess -> convening (+0) -> session (+0.5) -> vote (+2.5) -> adjourned (+2.75) -> recess (+3.25)`.
`SenateSim.advance(hour)` returns the transitions crossed since the last sample **in order, never skipping a state**
(a clock jump from mid-session to the next day still emits vote, adjourned, recess, then the new convening). The three
scenarios rotate across sessions (`scenarioForSession(n)`, n = day * 2 + slot). During `session` every delegation
speaks once, one line every ten game minutes, in a seeded order that differs between sessions.

Events on `game.events` (the runtime `Senate.tick()` samples `game.sky.time` every 250 ms):

| Event | Payload | When |
| --- | --- | --- |
| `senate:session` | `{ state, scenario, session, day, slot, title }` | every transition |
| `senate:vote` | `{ scenario, tally, session }` | entering `vote` |
| `senate:result` | `{ scenario, outcome: 'pass'|'fail', effects, headline, tally, session }` | entering `adjourned` |
| `senate:speaker` | `{ scenario, delegation, senator, world, position, line }` — `line` is the spoken sentence ("Tyrell Verge stands for the measure. Clinics on level 12 …"), the name travels in `senator` | during `session` |
| `senate:influence` | `{ scenario, delegation, delta, cause, position }` | `game.senate.influence()` |

`serialize()` / `restore()` carry day, state, session, the influence log (<= 400 entries), the results (<= 30) and the
last result; a mid-session save restores and continues with the same transitions as an uninterrupted run.

## 5. The three scenarios (`src/senate/scenarios.js`)

| id | Title | Sponsor | Effects (pass / fail) | Baseline tally |
| --- | --- | --- | --- | --- |
| `infrastructure` | Lower-Level Lift Restoration Act | Kessar Reach | `{ publicFunds: 12000, service: 'lift', outcome: 'funded' }` / `{ publicFunds: 0, service: 'lift', outcome: 'deferred' }` | 60-37-3 **pass** |
| `customs` | Port Inspection Standards Motion | Quell | `{ detentionRate: 0.33, inspections: 'strict' }` / `{ detentionRate: 0.10, inspections: 'routine' }` | 39-58-3 **fail** |
| `portfees` | Landing Fee Schedule Revision | Dhessen Hub | `{ landingFee: 180, portCapacity: 2 }` / `{ landingFee: 120, portCapacity: 0 }` | 56-41-3 **pass** |

Vote arithmetic (`vote(scenario, log)`): the twelve delegations vote individually from their published position
(for / against / undecided, one-line reason each); the rest of the chamber is an **aggregated bloc of 88** whose lean
is published per scenario (e.g. 42 % for, 38 % against, 20 % undecided) and whose undecided share follows the
individual majority (ties abstain). `pass` iff for > against. `tally = { individual, bloc, total, byDelegation, pass }`
with `individual + bloc = total`; the board shows the split so a player can see what is simulated and what is
aggregated.

**Influence** (`influence(scenarioId, delegationId, delta, cause)`, `cause` in `evidence` (cap 2), `petition` (1),
`favour` (1); total cap 3, and 1 for the scenario's published *firm* delegation): positions are base values
(for +2, undecided 0, against -2) plus the clamped influence, read as for at >= +1 and against at <= -1. So one
conversation moves an undecided delegation one step, never flips a decided one, and a firm delegation cannot be flipped
at all. The tally is a pure function of the log (replay gives the identical tally).

## 6. The Jedi liaison and the cast

- `liaisonSpot()` — a standable cell in the `liaison_lounge` (inner band, level 6, just south of the east passage) with
  a direct opening onto bowl ring 2: the liaison steps straight into the chamber.
- `liaisonRoute()` — Temple gate -> street waypoints (A* over the layout's ground grid, `src/senate/route.js`, corner
  waypoints <= 40 blocks apart) -> east press entry -> lobby ring -> east stairs to level 6 -> east passage -> alcove;
  `when` lists the arrival (30 min before convening) and departure (recess) hours of both sessions.
- `castPlaces()` — Senator Asha Merin (Kessar Reach: office, pod, entry), Ilen Rook (petition office desk with a
  `clerk` work record), Seran Vale (the liaison alcove).

## 7. UI (`src/ui/senate.js`, `src/ui/senate.css`)

Passive DOM overlays (no pointer events, never a `hud.screen`), dark blue-black backdrop with gold and chrome accents:

- `#senate-board` (top right) while the player is inside the chamber or a suite: state badge, the scenario on the floor
  (or next on the agenda), question and sponsor, the live tally bar (for / against / undecided), the individual / bloc
  split, time to the next transition, the last speaker and the last result (PASSED / FAILED).
- `#senate-plaque` (top centre) at a suite entrance or inside it: emblem swatch from the palette, delegation, senator
  and world, the position on the current scenario with its reason, the room you are in.
- `#senate-subtitle` above the hotbar while a speaker line is fresh (the fallback when `game.dialog.say` is absent).

`plaqueText()` / `boardText()` are for tests. The UI module is imported dynamically by the runtime only when
`document` exists, so `src/senate/senate.js` imports under Node.

## 8. Hooks for the integrator

`game.js` (after `game.events` and `game.coruscant` exist):

```js
import { Senate } from './senate/senate.js';
this.senate = new Senate(this);            // in the constructor / world setup
if (this.senate) this.senate.tick();       // in the per-frame update (it samples every 250 ms itself)
```

`save.js`: carry a `senate` key — `this.senate = data.senate || null`, `setSenate(data) { this.senate = data; }`, include
it in the serialized save. Until then the runtime falls back to `localStorage['frontier-craft:senate']`.

Other systems subscribe, the Senate never imports them:

- economy / spaceport: `game.events.on('senate:result', ({ scenario, effects }) => …)` — `publicFunds` + `service:
  'lift'`, `detentionRate`, `landingFee` + `portCapacity`.
- W4 (city life): `game.senate.seatsFor(id)` gives a delegation's four pod seats, `game.senate.podSeats()` every
  wall-tier seat, `bp.meta.spots` (1316 `seat`) the bowl and gallery; `senate:session { state: 'convening' }` is the
  cue to seat the delegations, `'recess'` to leave. `game.senate.castPlaces()` for Merin, Rook and Vale;
  `game.senate.liaisonRoute()` for Seran Vale's walk.
- screens / dialogue: `game.senate.resultText()` one-line headline, `game.senate.lastResult`, `game.senate.positions(id)`.
- W4 `rooms.js` may register the new kinds below explicitly; today they resolve by keyword inference.

## 9. New room kinds

35 kinds appear in the blueprint; the ones marked *inferred* are new and resolve through `roomFunction`'s keyword
inference to the base shown (`convocation_chamber`, `chancellor_podium`, `vestibule`, `senators_lounge` keep working).

| kind | rooms | staffing base | jobs |
| --- | --- | --- | --- |
| `aides_office` | 12 | `open_plan_office` (inferred) | clerk x4, aide x2, journalist x2, customs officer, teller |
| `archive` | 5 | registered | archivist, clerk |
| `chancellor_office` | 1 | `open_plan_office` (inferred) | clerk x4, aide x2, … |
| `chancellor_podium` | 1 | `council_chamber` (inferred) | senator x3, aide x2, speaker |
| `convocation_chamber` | 1 | `council_chamber` (inferred) | senator x3, aide x2, speaker |
| `delegation_kitchenette` | 2 | `kitchen` (inferred) | cook x2 |
| `delegation_lounge` | 12 | `lounge` (inferred) | bartender |
| `delegation_reception` | 12 | `lobby_atrium` (inferred) | receptionist x2, concierge, guard, … |
| `delegation_records` | 12 | `archive` (inferred) | archivist, clerk |
| `delegation_salon` | 2 | `lounge` (inferred) | bartender |
| `delegation_workshop` | 2 | `workshop` (inferred) | mechanic x2, technician, … |
| `diplomatic_reception`, `diplomatic_vestibule`, `grand_lobby` (4), `vestibule` | 7 | `lobby_atrium` (inferred) | receptionist x2, concierge, guard, … |
| `executive_office` | 12 | registered | executive, senator, advocate, officer |
| `freight_storage` | 2 | `storage` (inferred) | stock, dock worker, cargo droid |
| `guard_barracks` | 1 | `barracks` (inferred) | guard x2 |
| `guard_post` (5), `security_screening` | 6 | `security_post` (inferred) | guard x2, officer, customs officer |
| `hall_of_records` | 1 | `archive` (inferred) | archivist, clerk |
| `hearing_chamber` | 5 | `council_chamber` (inferred) | senator x3, aide x2, speaker |
| `landing_pad` (2), `loading_dock_storage` | 3 | `hangar` (inferred) | mechanic x2, deck officer, astromech, pilot |
| `liaison_lounge`, `senators_lounge` (3) | 4 | `lounge` (inferred) | bartender |
| `meeting_room` | 6 | registered | executive, advocate, aide x2 |
| `petition_office`, `press_office` (3) | 4 | `open_plan_office` (inferred) | clerk x4, aide x2, journalist x2, … |
| `restroom` | 1 | registered | maintenance droid |
| `senate_kitchen` | 1 | `kitchen` (inferred) | cook x2 |
| `server_room` | 2 | registered | technician |
| `staff_canteen` | 2 | `restaurant` (inferred) | cook, waitress droid, barista |
| `stair_tower` | 1 | `stairwell` (inferred) | — |
| `storage` | 2 | registered | stock, dock worker, cargo droid |

Work records placed by the blueprint: chancellor 1, guard 33, desk 170, comms 48, receptionist 20, executive 12,
archivist 10, server 10, cook 9, bartender 7, witness 4, stock 4, technician 4, deck officer 2, clerk 1.

## 10. Budget (rubric row 19)

Blueprint build (`buildSignature`, min of 5 warm builds, Node): **12.7-20 ms** against the 53 ms pre-change baseline
(limit 80 ms). `landmark-stats`' single cold build prints 50-120 ms on this host while its load average sits at 10-13
on four cores; the warm figure is the one to compare.

`scripts/bench.mjs`, plaza camera `?x=2975&z=120&y=97.2&yaw=0&pitch=-2&quality=light&rd=10&time=0.5`, 30 s, headless
Chrome on SwiftShader. Recorded before the rebuild (quiet host) and as an A/B pair under identical load
(pre-P4 landmark file swapped in, then HEAD, back to back):

| run | draw calls | JS ms/frame | triangles | memory MB | frame ms |
| --- | --- | --- | --- | --- | --- |
| before, quiet host (`/tmp/p4/bench/p4_before_plaza.json`) | 139.5 | 4.6 | 818 k | 503 | 222 |
| A/B before, loaded host (`p4_ab_before.json`) | 137.0 | 9.4 | 818 k | 501 | 690 |
| A/B after, loaded host (`p4_ab_after.json`) | 139.2 | 10.2 | 903 k | 509 | 808 |

Delta at the plaza: **+2.2 draw calls** (budget +20), **+0.8 ms JS** (budget +4), +10 % triangles, +8 MB. The frame
time is SwiftShader's software rasterisation of the extra triangles and does not apply to a GPU.

## 11. Known gaps

- The runtime is not installed in `game.js` yet (hooks above); `test-senate --url` installs it on the page itself
  when `game.senate` is absent, so the CDP checks run today.
- Session **attendance** is left to W4: the Senate publishes the cue (`senate:session`), the seats (`seatsFor`,
  `podSeats`) and the speakers (`senate:speaker`), but does not move NPCs itself (the Senate never imports NPC modules).
- The dome's ribs read as lit lines at night through the cornice ring and the lit slits, not as per-rib emissive
  strips; a per-rib pass would cost draw calls the budget does not have.
- Suites are reached by the player through the corridor ring and the stairs; the delegation lifts are NPC lifts (no
  player lift controls exist in the engine).
- `landmark-stats` reports 3 *sparse* rooms (large hearing chambers / galleries with few props); none dark, none
  unreachable.
- The A/B numbers were taken on a heavily shared host (fps ~1 under SwiftShader); relative deltas are sound, absolute
  frame times are not representative.
