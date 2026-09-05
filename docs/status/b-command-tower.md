# Status — B: command tower (Deck 1)

Branch: `cursor/sd-command-tower-e845` · Last push: see git log · 2026-09-05 01:35 UTC
Run: bc-624cbbb1-95b2-4ce5-82bb-455f2d92e845 · Phase: 3 (finalisation) — four blind critic rounds applied; B's Deck 1 work is complete pending the scaffold

## Summary (3–6 lines, what a reviewer needs to know right now)

All 11 Deck 1 modules (`src/rooms/deck1/**`: bridge, observation, nav, comms, tactical, intel, officers, two side
passages, spine, lift lobby) are built to the §7/§8 contract, fully detailed, and have been through four blind critic
rounds (FAIL 17 → 4 → 1 → 1, the last FAIL — the officers' cabin — rebuilt afterwards; see Tested). Final full-deck
harness run `p3-final3`: **55 views, 0 registry warnings**, every room inside budget (bridge 103k tris / 23 calls /
22 desc against its 300k / 24 / 28 allowance; largest standard room spine 114k / 14 / 13; builds 22–177 ms). 14 of the
24 critic views have 0 clipped pixels, 7 more ≤ 26 px, the rest only holo/screen edge specks. Scaffold has not landed,
so testing runs through `src/rooms/deck1/_dev/` (registry/ctx/light-pool shim, closed door-leaf stand-ins, no-HMR Vite
config, own shots runner). Open interface items for A: wall thickness vs D's doors helper, N8AO leak, player floor
height, `metal` reading black at room scale (see Requests).

## Plan

Floor y = +240 everywhere (bridge crew pits +237.6). Deck envelope x ±88, z +458..+542, ceiling ≤ +264.
All bounds abut exactly; each room builds its own 0.3 m wall inside its bounds, so a shared wall is 0.6 m and D's
door assembly lines the gap. Door `pos` is on the bounds face at floor level, `dir` is the outward normal.
Bounds y: min 239.5 (floor slab is 0.2 m thick under +240), max = ceiling + ≥ 0.4 (ceiling structure); bridge 236..250.

```
x:   -88      -44        -23.6 -20              +20 +23.6       +44               +84 +88
z 458 +--------------------------+------------------+----------------------------+
      |  d1-observation (x-84..-20, z458..466)      |    (void)     |            |
z 466 +---------------+----------+   d1-bridge      +--------------+            |
      |   (void)      | d1-nav   |P|  x ±20         |S| d1-tactical | d1-officers|
z 486 |               | 468..486 |o|  z 458..512    |t| 468..486    | x 44..84   |
      |               +----------+r|  pits 237.6    |b+--------------+ z 458..512 |
      |               | d1-comms |t|  ceiling 248   | | d1-intel    | (cabins off|
z 508 |               | 490..508 | |                | | 490..504    |  a private |
z 512 +===============+==========+=+================+=+=============+ corridor) =+
      |                    d1-spine  x -84..+84, z 512..516                       |
z 516 +------------------------------+--------+------------------------------------+
                                     |d1-lobby|  x -8..8, z 516..526
z 522                                | lift   |  lift wall at z 522, cabin volume
z 526                                +--------+  x±2, z 522..526, y 240..243.6 kept FREE
```
`P` = `d1-corridor-port` x -23.6..-20, z 466..512 · `S` = `d1-corridor-stbd` x 20..23.6, z 466..512.

| Room id | Bounds min → max | Ceiling | Doors (id · pos · dir · kind · to) |
|---|---|---|---|
| `d1-bridge` | (-20, 236, 458) → (20, 250, 512) | 248 | `d1-bridge-aft` (0,240,512) (0,0,1) blast → d1-spine · `d1-bridge-port` (-20,240,506) (-1,0,0) standard → d1-corridor-port · `d1-bridge-stbd` (20,240,506) (1,0,0) standard → d1-corridor-stbd |
| `d1-observation` | (-84, 239.5, 458) → (-20, 246, 466) | 245.4 | `d1-observation-corridor` (-21.8,240,466) (0,0,1) standard → d1-corridor-port |
| `d1-nav` | (-44, 239.5, 468) → (-23.6, 245, 486) | 244.2 | `d1-nav-corridor` (-23.6,240,477) (1,0,0) standard → d1-corridor-port |
| `d1-comms` | (-44, 239.5, 490) → (-23.6, 245, 508) | 244.2 | `d1-comms-corridor` (-23.6,240,499) (1,0,0) standard → d1-corridor-port |
| `d1-tactical` | (23.6, 239.5, 468) → (44, 245, 486) | 244.2 | `d1-tactical-corridor` (23.6,240,477) (-1,0,0) standard → d1-corridor-stbd |
| `d1-intel` | (23.6, 239.5, 490) → (40, 244.2, 504) | 243.4 | `d1-intel-corridor` (23.6,240,497) (-1,0,0) blast → d1-corridor-stbd |
| `d1-officers` | (44, 239.5, 458) → (84, 244, 512) | 243.2 | `d1-officers-spine` (66,240,512) (0,0,1) standard → d1-spine |
| `d1-corridor-port` | (-23.6, 239.5, 466) → (-20, 244, 512) | 243.2 | shares `d1-bridge-port`, `d1-observation-corridor`, `d1-nav-corridor`, `d1-comms-corridor`; `d1-spine-port` (-21.8,240,512) (0,0,1) standard → d1-spine |
| `d1-corridor-stbd` | (20, 239.5, 466) → (23.6, 244.2, 512) | 243.2 | shares `d1-bridge-stbd`, `d1-tactical-corridor`, `d1-intel-corridor`; `d1-spine-stbd` (21.8,240,512) (0,0,1) standard → d1-spine |
| `d1-spine` | (-84, 239.5, 512) → (84, 244.2, 516) | 243.2 | shares `d1-bridge-aft`, `d1-spine-port`, `d1-spine-stbd`, `d1-officers-spine`; `d1-spine-lobby` (0,240,516) (0,0,1) blast → d1-lobby; `d1-spine-end-port` (-84,240,514) (-1,0,0) standard → d1-future-port (unpaired = locked); `d1-spine-end-stbd` (84,240,514) (1,0,0) standard → d1-future-stbd (unpaired = locked) |
| `d1-lobby` | (-8, 239.5, 516) → (8, 244.6, 526) | 244 | shares `d1-spine-lobby`; `lift: { id: "T1", pos: [0, 240, 522], dir: [0, 0, -1] }` — cabin box x ±2, z 522..526, y 240..243.6 left empty; my lift-door hole in the z=522 wall is 2.4 w × 3.0 h |

All ids/positions live once in `src/rooms/deck1/shared/plan.js` (`doorsFor(roomId)`), so both sides of a door can
never disagree. Apertures: `d1-bridge` → `["bridge"]` (glass 0.9 m into the reveal, 11 mullions + transom, sill,
lining x ±19, y 241.2..245.4, z 455.5..458.3). `d1-observation` → `["observation"]` (x -78..-50, y 241.5..244.5).

## Subagents
| # | Deliverable | Files | Status |
|---|---|---|---|
| 1 | Bridge (flagship): pits, walkway, window wall, stations, command dais, animated displays | `src/rooms/deck1/bridge/**` | done (51dcfe07) |
| 2 | Nav + tactical/holo planning rooms | `src/rooms/deck1/nav/**`, `src/rooms/deck1/tactical/**` | done (b23e6765) |
| 3 | Comms + sensors, intel room | `src/rooms/deck1/comms/**`, `src/rooms/deck1/intel/**` | done (356bcd37) |
| 4 | Officers' quarters (private corridor + cabins + wardroom) | `src/rooms/deck1/officers/**` | done (f0a80c75) |
| 5 | Observation gallery (window band) | `src/rooms/deck1/observation/**` | done (f4120da1) |
| 6 | Deck 1 corridors + lift lobby (spine, port/stbd passages, lobby) | `src/rooms/deck1/spine/**`, `src/rooms/deck1/corridor-port/**`, `src/rooms/deck1/corridor-stbd/**`, `src/rooms/deck1/lobby/**` | done (27f6d314) |
| C | Blind visual critic (screenshots + §11 brief only) | none (report only) | round 1: two critics on 22 shots · round 2: one critic on 24 · round 3: one critic on 24 · round 4: one critic on the final 24 (result below) |
| 1b | Bridge critic rounds 1–3 (same owner, resumed) | `src/rooms/deck1/bridge/**` | done (942b4a63, 9ef7ce24, cde48c42) |
| 2b | Nav + tactical + comms + intel critic rounds 2–3 | those four folders | done (c07fad9e, 35c32249) |
| 3b | Officers + observation critic rounds 2–3 | those two folders | done (583ebb25, 7160c11f) |
| 4b | Spine + passages + lobby critic rounds 2–3 | those four folders | done (2a8514d5, 34f6f087) |

Shared Deck-1 helpers (mine, not copies of ship.js): `src/rooms/deck1/shared/` — `imperial.js` (wall with openings,
floor, ceiling with recessed channels, light strip, railing, stairs, partition, corridor dressing, door reveal),
`doors.js` (§7 hole sizes; switches to D's helper when it lands), `palette.js` (§10 colours, falls back to hex until
the scaffold adds `PALETTE.imp*`), `plan.js`. Dev harness: `src/rooms/deck1/_dev/` (no `index.js` inside).

## Done
Critic round 3 fixes (pushed; each verified with a fresh harness run, 0 registry-shim warnings):
- `d1-bridge` (cde48c42): pit walls with a 6 m pilaster rhythm, manifold panel + riser bank + breaker cluster between
  the upper monitors, monitors on twin brackets with cable boxes, 5 cm `emitBlue` head strip in a lipped channel, kick
  band under the console row; holo wedge colours clamped to cyan (they saturated to white at 34 m), lintel strip 3.0 ×
  0.03 m recessed, AFT LOCK 01 header sign, 3.6 × 1.3 m status board + conduits/vents/junctions on the upper aft wall;
  the "hot lamp" over the door was the pendant mirrored in the ceiling slab — centre panel now dielectric `bridgeSeam`;
  aide standing consoles turned to face the dais with matte desks (313 → 10 clipped px), chair wing hairline
  segmented, pit floor plate bands + lane dashes, floor hatches, lit dais reveals on all sides, data terminal header;
  `pickScreen`: every third wall display live, the rest cycle 4 textures × 5 crops × 3 bezels. 101.2k tris / 23 calls /
  22 desc / 177 colliders / 181 ms. The harness now hides the HUD crosshair in captures (it sat on the door axis in
  `d1-bridge-aft` and read as an emissive blob).
- `d1-nav`, `d1-tactical`, `d1-comms`, `d1-intel` (35c32249, 567767b6): nav uplight channel + cable branches fill the
  canopy void, chart chest + map-tube rack replace the locker pair, dais rail box → step-light reveals; tactical holo
  field matte (the white blob was the gloss top mirroring the north wall), ~40 % fewer edge LEDs with label plates,
  per-seat jitter, downlight domes r 0.08; comms luminaires as flat louvred diffusers in a module-local `commsLamp`,
  tray metalwork `metalRough` in closed-bottom channels, sensor towers with glanded conduits + service pads; intel red
  perimeter strips, cans 20 → 40 cd, tighter table cone, pilaster height bug fixed, archive labels. After the
  subagent: the hub trays now jog out and cross the aisle lines midway between the sources (its unverified ±1.25 m move
  had made the "downlight" blobs worse — at roughness 1 the hot spot is wherever a tray underside passes closest to a
  source, E·cosθ ∝ 0.27/d³: 184 → 9 clipped px), beam flanges `metalRough` in comms and nav (59-px and 356-px glints
  gone), nav table control slabs matte. Nav 44.6k / 16 / 14; tactical 52.6k / 16 / 13; comms 77.5k / 16 / 14; intel
  35.6k / 13 / 14.
- `d1-officers`, `d1-observation` (7160c11f, 567767b6): wardroom second table by the door, pendants as points in deep
  shades, wall-wash can over a drinks cabinet / galley pass-through with crest; cabins with rug + low table, desk facing
  a half-height bulkhead with housed uplight, own ceiling slab with beams/vent/hung louvred luminaire, wall cabinet
  with reading-light rail; corridor threshold mats, louvred channel housing, amber floor lines, fire recess, ajar
  utility door with amber sconce; observation feature bay with half-width rhythm, housed raking key, side table,
  display case with ship model. After the subagent: module-local `offLamp` (warm, emissive 1.15) replaces
  `emitWarmSoft` (1.9) across the module — the cabin lens panes no longer clip (258 / 212 → 0 px); a matte `fabric`
  ceiling field in the wardroom (the semi-gloss shell mirrored the middle pendant as a 204-px patch: 291 → 12 px);
  raking key 200 → 140 cd; observation's white emitters on the transit spaces' non-specular `emitStrip`. Officers
  62.0k / 16 / 14 / 96; observation 31.2k / 15 / 14 / 43.
- `d1-spine`, `d1-lobby` (34f6f087): every third spine bay swaps to a half-width-module kit (seam pilasters, slatted
  grilles, half plates), 8 cm strip end-caps at each rib, continuous 0.2–0.48 m kick/scuff band with a cast top edge;
  lobby drum pool 9 → 6.5, header 2.4 → 1.8, corner fills 2.5 → 1.8 (side view mean 23.7 → 20.7), benches rebuilt as
  open steel end frames + split fabric cushions + armrest bars. Spine 114.3k / 14 / 13 / 201; lobby 14.1k / 16 / 5.

Critic round 2 fixes (pushed; each verified with a fresh harness run, 0 registry-shim warnings):
- Shared (f67b912a): ceilings and officers' plates off the chip-mapped `paintedMetal`; transit pool lights −0.7 EV;
  stand-in emissive cap 1.35–1.6, `blackGloss` roughness 0.3, `impPanel` dents/grime flattened (see Tested).
- `d1-bridge` (9ef7ce24): wall displays on arms with cable drops at varied heights/widths, every third swapped for a
  junction or vent cluster, different screen cell per neighbour; housed head-height strips + 3 m cable tray + conduit
  drops + junction boxes on the pit walls; raft louvres 0.12 m deep with 0.14 m diffusers; blast-door surround with a
  lit lintel (holo lines normal-blended — the 34 m white streak is gone); 18×13 mm keycaps in scuffed wells, chair
  back with seam grid/vents/readout, lecterns re-keyed; aft pendants 70/85 cd with two hooded console pods in the
  command camera's foreground; sill task lights hooded; beam flanges and holo plinth top off the mirror materials;
  module-local `bridgeLamp` diffuser (paid for by dropping `fabric`). 84.7k tris / 23 calls / 22 desc / 169 colliders /
  188 ms; clipped px per view 0–39 (all inside lamp diffusers).
- `d1-nav`, `d1-tactical`, `d1-comms`, `d1-intel` (c07fad9e): nav light canopy over the dais with the key spot
  housed in its channel, lockers with seams/hinges/handles/LEDs/plates (one ajar); tactical 0.22 m louvred downlight
  cans, pedestal + lectern readouts, `H-2` floor hatch with bolts/markers/stencils, west-row `distance` 9.5 (plot-table
  mirror streak); comms linear luminaires with housed points, sensor towers with control housing/screen/plates,
  per-seed rack LED fill + one open door + one pulled tray, dais plinth seams/toe strip/readout, aisle plate off
  paintedMetal; intel guard post (sign, intercom, reader, glazed door, monitor cluster), red floor strips both sides,
  checkpoint destination lighting, CLEAR / INNER GATE OPEN indicators, screen roughness 0.7. Nav 43.1k / 16 / 11;
  tactical 52.5k / 16 / 13; comms 74.6k / 15 / 14; intel 35.2k / 13 / 14.
- `d1-officers`, `d1-observation` (583ebb25): impPanel on every officers' surface above knee height, 1.5 cm recessed
  floor strips, hanging louvred cabin luminaires with the spot inside, beds with frame/bedding/pillow/blanket, bordered
  rugs, wardrobe recess, mirror + shelf, desk chairs, wardroom pendant shades (no ceiling wash), amber wainscot strip,
  locker-bay wash, trays/cups/plates, dark baize table top, intensities −0.45 EV, shadow-slot cones ≤ 1.35 rad;
  observation benches on legs with split fabric cushions, mid-grey apron, segmented fascia hairline, binocular viewer
  on the sill, soffit cans + under-sill fill, neutral pendants, module-local `obsScreen` atlas (star charts, hull cam,
  schedule) on bezelled displays. Officers 68.8k / 16 / 14 / 113; observation 29.5k / 15 / 13 / 42.
- `d1-spine`, passages, `d1-lobby` (2a8514d5): module-local non-specular `emitStrip` for every white strip/lens (the
  "blobs" were the channel strips mirroring the pool points, not emission); junction point inside the closed top slab
  off the channel axis, lathe bezel, blue floor accent removed; lobby bench on legs with split cushions, painted
  lift-queue lane instead of the raised pad, drum luminaire, header point inside its block, backlit numerals tamed;
  pools spine 5.8/8, stbd 2.8, port 2.2, lobby 9/2.5/2.4/1; the bridge's aft corner pendants reach 10 m instead of 20
  (they lit the port passage through the door wall at E ≈ 0.6). Transit views mean luminance 18–30 (was 42–60), 0
  clipped px.

Phase 2 detail (pushed; each verified with a fresh harness run, 0 registry-shim warnings):
- `d1-bridge` (51dcfe07): 24 descriptors (key spot parked in the reveal aimed at the walkway, 3 pendants, dais spot,
  6 pit light rafts, 4 wall washes, 4 low pit accents, holo glow); bridge console family with 23–26 emissives per unit
  (sill bank, nav table, helm pair, 5+3 units per pit with readout bars and detailed backs, officers' stations, aft
  bank); command chair, dais with lit reveal, aide pedestals, holo plinth projecting the §6.2 ship envelope at 1:1000
  as an additive wireframe with scan plane; animated 1024×512 screen atlas (radar, text columns, waveforms, schematic)
  redrawn at 8 Hz; ceiling with 8 transverse + 2 longitudinal beams, pendants, trays, pipes, vents, 4 recessed
  channels; pit walls with 8-display bands, racks, cabinets, ducts, cable trays; painted nosings/kick strips on every
  drop; window band with chamfered hexagonal mullion caps, head channel diffusers, sill instrument bars. Views +
  `d1-bridge-dais`, `-sill`. 55.9k tris / 22 calls / 24 desc / 158 colliders / 122 ms.
- `d1-nav`, `d1-tactical` (b23e6765): shader-animated holo primitives (`nav/holo.js`: Points + LineSegments with
  per-vertex animation classes — one `uTime` uniform, 2 draw calls per room), per-room 1024² screen atlas repainted at
  8 fps (`nav/ui.js`); nav: chart table with 8 control facets and rim indicators, 3600-star chart with grid disc and a
  7-waypoint hyperspace route, chart wall with animated route display + status columns, 9 stations with chairs, raised
  navigator dais with steps/rails/desk, ceiling beams/projector rig/trays/downlights, wall greebles; tactical: 5×3 m
  holo table with 10 edge panels projecting a fleet plot (wedge silhouettes, range rings, sweep, contacts), tier with
  lectern + 2 stations, 6.4 m animated display wall + fleet columns + weapons boards, 18-seat stepped briefing block
  with rails, ceiling rig. Views + `d1-nav-holo`, `-dais`, `d1-tactical-plot`, `-lectern`. Nav 31.7k / 15 / 13 /
  34 / 51 ms; tactical 39.5k / 15 / 14 / 43 / 60 ms.
- `d1-comms`, `d1-intel` (356bcd37): comms: 22 racks (drawer/LED-matrix/readout/vent modules, ~1900 LEDs emitted as
  batched geometry — `comms/lib.js LedBatch`), patch frames + cables, 5 cable trays, ducts/pipes, 4 operator stations
  with detailed backs, supervisor dais, signal wall with animated receiver display + blue/amber atlas, sensor dome, 2
  pedestals with instanced rotating dishes; intel: security lock (scanner arch with 6 red beams, barrier, offset gate
  with retracted ribbed leaves, guard desk, lockers), 7 data columns with scrolling red text, analysis table with
  pulsing red wireframe holo, monitor bank + cipher station, 6 archive cabinets, evidence hatch, red-only 14
  descriptors. Views + `d1-comms-dish`, `-station`, `d1-intel-gate`, `-table`. Comms 68.1k / 15 / 13 / 49 / 94 ms;
  intel 27.5k / 12 / 14 / 48 / 39 ms.
- `d1-observation` (f4120da1): reveal lining + heavy outer frame + inner frame, chamfered mullion caps, red lamp per
  mullion foot, 7 tilted sill instruments, leaning rail, 3 binocular viewers, 3 seating groups, 3 holo plinths (one
  additive LineSegments, 3 original wireframe ships rotating in update), refreshment counter, star-map wall, briefing
  niche, west end screen, coves + beams every 4 m + cable tray, south-wall greebles. Key spots hidden inside
  mullions (no visible source). Views + `d1-observation-counter`, `-viewer`. 16.2k tris / 16 calls / 12 desc /
  40 colliders / 48 ms.
- `d1-officers` (f0a80c75): 14 corridor doorways (stepped frames, leaves open/closed with status lamps, number + rank
  plates, intercoms), ribs + 2 cable trays + notice screens + end wall; 10 seeded cabins from one function (bunk with
  bedding, overhead cabinet + amber lamp, desk + screen + chair, locker, shelves, fresher hatch, personal items),
  captain's suite (W0), wardroom (wainscot, pilasters, table for 12 with settings, sideboard, fleet-status bank,
  viewscreen, pantry alcove), duty office, utility room. Views + `d1-officers-captain`, `-duty`. 72.5k tris /
  16 calls / 14 desc / 142 colliders / 160 ms.
- `d1-spine`, `d1-corridor-port`, `d1-corridor-stbd`, `d1-lobby` (27f6d314): bay kit in `spine/dressing.js`
  (ribs, conduit runs, cable trays, handrails, grating strips, junction boxes, vents, intercoms, hatches, scuffs),
  signage atlas `spine/signage.js` (one 1024² canvas shared by the four rooms: 21 original labels, arrows, "01",
  chevrons; +2 materials per room), junction node at x 0 (heavy ribs, ceiling housing, floor medallion, 4 directory
  panels, chevrons at both blast doors), sealed future doors at both spine ends, door signs in the passages, sealed
  bulkhead at the starboard dead end, lobby arrival (lift surround with seams/bolts/indicator bar + `api.setIndicator(u)`
  for D, deck plates, fire point, directories, notice screens, floor strips, ceiling light frame). Views +
  `d1-spine-bay`, `d1-corridor-stbd-bulkhead`, `d1-lobby-indicator`. Spine 54.4k tris / 14 calls / 14 desc / 135
  colliders / 71 ms; passages ~14k / 13 / 6–7; lobby 8.2k / 15 / 5.

Phase 1 greybox (all 11 modules): closed floor/ceiling/walls with Imperial panelling (light-grey panels, black
recessed seams, kick, cornice, blue-white strip at 2.05 m), recessed ceiling light channels, door holes cut to §7
sizes with jamb liners + threshold plates (D's assembly goes on top), colliders, spawn, views, light descriptors.
- `d1-bridge`: window band (reveal lining z 455.5..458.3, 11 mullions, transom, glass, sill), fore platform, walkway
  with railings, two 2.4 m-deep pits with console rows + wall display bands, stairs both sides (with a
  `stairs-pending` blocker collider — see Requests), aft command deck with dais, chair, holo plinth, 6 aft stations,
  10 sill stations. Views: `d1-bridge-walkway`, `-pit`, `-window`, `-aft`, `-command`, `-pit-stbd`.
  Stats: 24.8k tris, 17 draw calls, 18 descriptors (1 spot key + 17 point), 84 colliders, build 56 ms.
- `d1-observation`: 28 m window band (7 panes), leaning rail, 6 bench/table groups, 4 display plinths. 7.3k tris /
  14 calls / 6 desc. Views `d1-observation-window`, `-along`, `-lounge`.
- `d1-nav`: octagonal star-chart table with holo sphere/cone, 7-screen chart wall, 8 plotting stations. 6.4k / 15 / 5.
- `d1-comms`: 26 equipment racks with LED columns, 4 operator stations, signal wall, 2 sensor pedestals. 7.6k / 15 / 6.
- `d1-tactical`: 5×3 m holo table with fleet markers, raised tier with rail + lectern, 5 display panels, 18 seats. 5.6k / 14 / 6.
- `d1-intel`: security vestibule (offset inner gate, scanner posts), 10 data columns, analysis table, 5 archive
  cabinets; red-only. 5.3k / 10 / 3.
- `d1-officers`: private corridor (x 64.2..67.8) with ribs/strip, wardroom (table, 12 seats, sideboard, viewscreen),
  4 + 6 cabins (bunk, desk, screen, locker, amber lamp), utility + duty office gaps. 38.6k / 13 / 10.
- `d1-corridor-port`, `d1-corridor-stbd`: corridor-kit look (centre strip, ribs every 4 m, ceiling channel). ~5.9k / 9 / 6.
- `d1-spine`: 168 m corridor, hazard thresholds at the two blast doors, 13 pools. 20.8k / 10 / 13.
- `d1-lobby`: lift wall with 2.4×3.0 hole + heavy surround + amber deck indicator, shaft side walls hugging the
  reserved cabin box, benches, hazard strip. 4.0k / 10 / 2.

## Tested
- Harness `p1c` (own runner, `/tmp/sd-shots/p1c`, 1280×720, SwiftShader): 37/37 views rendered, **0 registry-shim
  warnings** (checks: id format, duplicates, bounds vs envelope, spawn/views inside bounds, door pos on a face,
  door pairs id/pos/kind/dir/to, geometry outside bounds (aperture reveal allowed), descriptor shape/count, tris,
  calls, colliders, build time). 0 page errors.
- Whole-frame numbers (post stack on, current room + door neighbours visible): 36k–210k tris, 70–186 calls
  (includes the post passes and the exterior stand-in), 9–14 pool lights. Frame time 1.6–3.1 s/frame is SwiftShader
  and only useful relatively.
- Per-room build times 5–56 ms (budget 250). Largest room 38.6k tris (budget 120k), bridge 24.8k (300k).
- Phase 2 verification runs: `obs-verify`, `officers-verify`, `corr-4`, `leakfix`, `p2-verify` (all 11 rooms built
  together, 54 views registered, 22 shot; 0 warnings). Whole-frame with neighbours: 79–175 calls, 87k–309k tris; the
  pool renders 12–16 lights, the current room's descriptors always win (shim scores current room first, then
  priority, then distance/120).
- Rendering artifact traced (not Deck 1 geometry): in `d1-lobby-side` a faint dashed blue line of the spine's
  `emitBlue` floor-strip edges shows through two solid walls. Probes: gone with `?post=0` (direct render), gone when
  the spine's `kit_emitBlue` mesh is hidden, persists with bloom disabled and with N8AO at full res → it is the N8AO
  pass in `src/post.js` under SwiftShader. Reported under Requests.
- Critic round 1 (two blind critics, 22 shots, images + §11 brief only): PASS `d1-nav-holo`, `d1-tactical-plot`
  (marginal), `d1-comms-station` (marginal), `d1-spine-junction`, `d1-corridor-stbd-bulkhead`; FAIL the five bridge
  frames, `d1-nav-dais`, `d1-tactical-overview`, `d1-comms-racks`, both intel, both observation, all three officers,
  `d1-spine-bay`, `d1-lobby-side`. Systemic findings: (1) emissive strips clip to white with 2× bloom halos; (2) the
  stock `screenImp` texture repeats ≥ 12× in the rooms without their own atlas; (3) bare light sources read as blobs
  (~20 counted); (4) glowing outlines standing in for objects (thresholds, floor plates, holo "hairballs", scanner
  lattice); (5) exposure ladder inverted (corridors brightest, destination rooms darkest; bridge window not the key);
  (6) floor chip map reads as spilled fluid, random panel dots as pitting. Fixed once in shared code + harness
  (6d27326a): recessed 4 cm strip emitters between lips, 8 cm channel emitters, gloss centre strip, stand-in
  emissive 1.6–1.9, clean floor stand-in, fog halved. Room-specific fix lists dispatched to all six owners (running).
  The critics' full reports are in this run's transcript; the ranked cross-room lists were forwarded verbatim.
- Critic fix rounds verified so far (fresh harness run each, 0 shim warnings): comms (3da1af20), corridors + lobby
  (3ebc2455), nav + tactical (072a96b1: `navtac-c-verify` — blown-pixel scan ≥ 236 lum finds 4 px in `d1-nav-dais`,
  ≤ 348 px in 28 tiny bezel highlights in `d1-tactical-overview`; the run-2 mottled ceiling is gone with the matte
  tinted ceiling; mean luminance 19 (nav-dais) / 25 (nav-holo) / 28–30 (tactical) — nav-dais stays the darkest view
  on Deck 1 by design of its wall-wash key, see the exposure ladder under Requests). Intel (da355adb: `intel-c-verify`
  + `-verify3` — blown pixels 627 → 0 in `d1-intel-gate`, 0 in table/columns, 7 in the vestibule; mean luminance 13–21
  = the −1.5 EV room of the ladder; every point is a recessed can 20 cm above the ceiling plane so the ceiling can
  never blob, which also leaves the ceiling unlit — the per-room ambient under Requests would lift it). Bridge
  (942b4a63: `bridge-c-verify`/`-verify2`/`-verify3` — the bridge owner traced the critics' "long dark hangar with a
  rail" to the harness, not the room: the exterior stand-in's floor slab topped out at 239.5, 1.9 m above the pit
  floors, so every above-deck camera saw both pits filled with a grey plane; fixed in `_dev/harness.js` (floor stops
  at 236 under the bridge footprint). Two follow-ups after its run: the pit floors dropped paintedMetal's chip map
  (the same spilled-fluid blotches as round 1) and the `screenImp` stand-ins went from roughness 0.15 to 0.42 — at
  0.15 every console screen facing a pool spot mirrored it as a white blob; blown pixels in `d1-bridge-sill` 166 → 6).
- Phase 3 full-deck run `p3-all` (all 11 rooms built together, every registered view): **55 views, 0 registry-shim
  warnings**, every room inside budget — bridge 74.4k tris / 23 calls / 22 desc / 167 colliders / 143 ms; spine
  109k / 14 / 14 / 201 / 146 ms; officers 91k / 16 / 14 / 148 / 139 ms; comms 77k / 15 / 14 / 50 / 110 ms; tactical
  49k / 16 / 13; nav 40k / 16 / 11; intel 34k / 13 / 14; passages 27k / 14–15 / 6–7; observation 21.6k / 16 / 11;
  lobby 11.6k / 15 / 5. Whole frame with door-neighbours: 81–203 calls, 90k–622k tris, 12–16 pool lights (the
  corridor cameras activate up to six rooms → 78 descriptors offered, 62 dropped by the pool).
- Critic round 2 (one blind critic, 24 final shots): PASS `d1-bridge-window`, `d1-nav-holo`, `d1-tactical-plot`,
  `d1-comms-station`, `d1-intel-gate`, `d1-intel-table`, `d1-spine-bay`; FAIL `d1-observation-window` (bench = black
  slabs in a black room), `d1-officers-corridor` (blotched walls), `d1-officers-cabin` (blown lamp, slab bed),
  `d1-spine-junction` (brightest frame, strips clip); the other 13 MARGINAL. Ranked systemic list: (1) emissives still
  clip (strips, downlights, warm lamps); (2) exposure inverted (transit spaces 1.5–2 stops over the bridge); (3) grime
  moved from floors to ceilings/walls (paintedMetal's chip map on ceilings, officers' plates); (4) one wall-monitor
  template tiled at one height; (5) slab furniture / featureless cabinets; (6) ceiling voids in destination rooms.
  Systemic fixes (f67b912a): shared `ceiling()` and the bridge ceiling draw in `impPanel`/`bridgeFloor` instead of
  paintedMetal (tint-compensated, no extra draw call); officers' `cleanPlate` likewise (the blotches were flaked dents
  with metalness > 0 rendering black); transit pool lights −0.7 EV; stand-in emissives capped 1.35–1.6, `blackGloss`
  roughness 0.3, `impPanel` dents/grime flattened. Room lists (items 4–6 + every FAIL/MARGINAL line) dispatched to
  four owners: bridge, officers + observation, nav/tactical/comms/intel, corridors + lobby.

- Full-deck run `p3-final` after the round-2 fixes: **55 views, 0 registry-shim warnings**, every room inside budget
  (bridge 84.7k tris / 23 calls / 22 desc / 169 colliders / 169 ms; spine 109k / 14 / 13 / 201 / 148 ms; comms
  74.6k / 15 / 14; officers 68.8k / 16 / 14; tactical 52.5k / 16 / 13; nav 43.1k / 16 / 11; intel 35.2k / 13 / 14;
  observation 29.5k / 15 / 13; passages 27k / 14–15; lobby 13.8k / 16 / 5). Whole frame 82–202 calls, 106k–661k tris,
  12–16 pool lights. Mean luminance per view: bridge 18–27, transit 18–29, lobby 24, nav 20–25, tactical 26–28, comms
  22–32, officers 22–30, observation 29–38, intel 13–19 — the ladder is no longer inverted. Clipped pixels: 0 in 13 of
  the 24 critic views, ≤ 40 in the bridge views (lamp diffusers), ≤ 260 elsewhere (holo cores, screen highlights,
  cabin lens).
- Critic round 3 (one blind critic, the same 24 views from `p3-final`): PASS 9 (`d1-bridge-walkway`,
  `d1-bridge-window`, `d1-nav-holo`, `d1-comms-station`, `d1-intel-gate`, `d1-intel-vestibule`,
  `d1-observation-window`, `d1-spine-junction`, `d1-corridor-stbd-bulkhead`), MARGINAL 14, FAIL 1
  (`d1-officers-wardroom`: "table isolated in a black hall"). Round 1 → 2 → 3: FAIL 17 → 4 → 1, PASS 5 → 7 → 9.
  Its ranked list: (1) destination rooms crush to black away from the emissives (floors/ceilings pure black — see the
  per-room ambient request); (2) bare, evenly lit panel grid above console height; (3) a few emissives still clip
  (channels, comms downlights, holo cores, the tactical table's mirror blob); (4) one stock locker prop recurs in nav,
  tactical and the wardroom; slab furniture; (5) footprints sized for the bridge, not the function (cabin, wardroom);
  (6) functional wear absent or misreading. DoD words still attached to 10 views (bridge pit/dais/command, nav dais,
  tactical overview, observation lounge, officers corridor/cabin/wardroom, spine bay). Round-3 lists went to the four
  owners (all done, see Done); the harness now closes every paired door with a leaf stand-in (4e8d0d39) so a corridor
  luminaire 40 m away no longer reads as a white blob inside the bridge's aft doorway.

- Final full-deck run `p3-final2` after the round-3 fixes: **55 views, 0 registry-shim warnings**, every room inside
  budget (bridge 101.2k tris / 23 calls / 22 desc / 177 colliders / 181 ms; spine 114.3k / 14 / 13 / 201 / 143 ms;
  comms 77.5k / 16 / 14; officers 62.0k / 16 / 14; tactical 52.6k / 16 / 13; nav 44.6k / 16 / 14; intel 35.6k / 13 /
  14; observation 31.2k / 15 / 14; passages 27.4k / 26.7k / 14–15; lobby 14.1k / 16 / 5). Whole frame 83–224 calls,
  133k–710k tris, 12–16 pool lights, well inside the 450 / 1.5 M / 16 frame budget. Mean luminance per view: bridge
  18–30, transit 18–30, lobby 20–22, nav 22–30, tactical 20–28, comms 20–29, officers 20–29, observation 29–45, intel
  16–20. Clipped pixels (≥ 236 luminance): 0 in 18 of the 24 critic views; ≤ 26 px in the bridge aft/command/walkway/
  pit-stbd (1–4 px lamp-diffuser specks, one 6 × 7 px raft diffuser), 12 in the wardroom, 9 in comms racks; the only
  three-digit counts are 1–3 px-tall holo-icon and screen-edge highlights in `d1-nav-holo` and the two tactical views.
- Critic round 4 (one blind critic, the 24 critic views from `p3-final2` plus the six nav/tactical/observation views
  re-shot after 567767b6): PASS 8 (`d1-bridge-dais`, `d1-bridge-walkway`, `d1-comms-racks`, `d1-comms-station`,
  `d1-nav-dais`, `d1-nav-holo`, `d1-tactical-overview`, `d1-tactical-plot`), MARGINAL 15, FAIL 1 (`d1-officers-cabin`:
  slab bunk/cabinet/desk, bunk read as a bench, bare floor). Rounds 1 → 4: FAIL 17 → 4 → 1 → 1, every remaining
  MARGINAL carries only "minor" instances. Its ranked list: (1) bare floors / black ceilings; (2) the light strips
  read as pure-white bars (they measure 0 px ≥ 236 — no bloom — but tonemap to ≈ 230/255); (3) slab furniture;
  (4) intel's red fill light (by design: the plan's red-only restricted section at −1.5 EV — kept); (5) identical
  modules in a row (rack rows, railing posts, cabin doors); (6) bridge command/window frames below the bridge mean.
  Fixes applied after the pass, each verified in a harness run: transit `emitStrip` #b9ccff at 1.0 and the officers'
  strips on the module's warm `offLamp` (both families now read blue-white / warm, not white; 0 clipped px); a
  2.4 m plate grid on the bridge's fore platform and aft deck + aft pendants 100 cd (command frame mean 21.4 → 23.6,
  window 18.2 → 19.4); the observation bench's bare-metal edge trim → `metalRough` (the "sofa base patch" was its
  mirror of a soffit can); and the cabin rebuilt by the officers owner (c5216f93): bunk module with drawer base,
  blanket/sheet/pillow, 1.15 m headboard with reading lamp, footboard and kit trunk; wall cabinet at 60 % of the
  bunk with doors/handles/label/lit rail/shelf; desk modesty panel; settee on legs; armchair + round-base table on
  the rug; kit bag, scuff band, 2 m approach lines, threshold mat; beams + cable trays overhead. Cabin mean 26.2,
  0 clipped px. Not addressed: the intel accent (design), rack/railing/door repetition (functional uniformity), and
  the remaining "minor" bare-floor notes on the bridge walkway and tactical views.
- Final full-deck run `p3-final3` after the round-4 fixes: **55 views, 0 registry-shim warnings**, every room inside
  budget (bridge 102.8k tris / 23 calls / 22 desc / 177 colliders / 177 ms; spine 114.3k / 14 / 13 / 201 / 143 ms;
  comms 77.5k / 16 / 14; officers 65.5k / 15 / 14 / 98; tactical 52.6k / 16 / 13; nav 44.6k / 16 / 14; intel 35.6k /
  13 / 14; observation 31.2k / 15 / 14; passages 27.4k / 26.7k / 14–15; lobby 14.1k / 16 / 5). Whole frame 83–223
  calls, 133k–713k tris, 12–16 pool lights. Clipped pixels (≥ 236 luminance): 0 in 29 of the 55 views and in 14 of
  the 24 critic views; ≤ 26 px in another 7 critic views (1–4 px lamp-diffuser specks); the only three-digit counts
  are 1–3 px-tall holo-icon and screen-edge highlights (`d1-nav-holo`, the tactical views, `d1-nav-corner`).

## Remaining
1. Replace corridor greybox with D's `corridorSegment` when it lands; switch `doorHole` import to D's helper.
2. Delete `_dev/` and re-test on the real registry when `SCAFFOLD READY`.

## Blockers
- None. Scaffold not landed: I mimic `ctx` locally (see Summary); the Imperial material names from §10 are provided
  as stand-ins by the harness only, rooms reference them by the §10 names.

## Requests for integrator
- **`metal` / `metalRough` read as black at room scale.** They are metalness 1 with only the dim interior env map to
  reflect; every subagent independently moved mullions, nosings, flanges and trays to `paintedMetal` + grey tints.
  A shared dielectric-ish trim material (`steelPainted`: metalness ≈ 0.3, IMP.mid base) in §10 would save every deck
  the same discovery. Also please check the real `impFloor`: the stand-in (metalness 0.6, dark tint) renders as a
  void at E ≈ 1.5 — the bridge pits switched to painted grey plating.
- **Exposure ladder (critic proposal, worth adopting deck-wide in §11).** Bridge = 0 EV reference; corridors ≤ +1;
  officers' country −0.5; intel −1.5; observation 0 with star-light as key. Today transit spaces are the brightest
  surfaces and destination rooms the darkest, so the three decks will not read as one ship unless A sets a common
  strip/emitter level in the shared materials (a clipped `emitWhite` at 2.4 under ACES + bloom threshold 1.15 is the
  main offender; 1.6–1.9 with narrow recessed emitters reads right).
- **"Blob" rule for the light pool (found by the comms pass, worth a line in §9.4).** The blown fixtures the critics
  saw were not emitters but housings/ceilings lit at point-blank range by pool points 0.1–0.6 m away (inverse-square
  × bloom threshold 1.15; even black paint blows past ~0.5 m through its specular term). Rules that fixed it: every
  point descriptor sits inside a closed dark housing ≥ 1.2 m below the ceiling; anything that must hang near a surface
  is a downward spot whose cone never reaches its own can or the ceiling.
- **Screen materials must be anti-glare (§10 `screenImp0–3`, and any deck's own atlas material).** A screen at
  roughness 0.15–0.18 mirrors whichever pool spot faces it as a clipped white blob with a bloom halo (that was the
  round-1 "hot spot" on the nav route plot, on every bridge sill console and on the tactical banks). Roughness 0.42
  with `envMapIntensity` ≤ 0.4 keeps a faint sheen and no blob; bridge, nav, tactical, intel and the harness stand-ins
  all use that now. Please set the real `screenImp*` the same way, or every room that used the shared screens
  inherits the blobs back the moment the stand-ins are deleted.
- **`paintedMetal` (and the worn `metal` set) must not cover room-scale surfaces.** Its chip/blotch map reads as
  dirt specks on ceilings, mould blotches on wall plates and spilled fluid on floors — that was critic round 2's
  systemic finding #3 after round 1 had already moved it off the floors. Deck 1 now uses it only for trim, kick bands
  and housings < 0.5 m²; ceilings, plates and pit floors are clean panel/deck materials with tint compensation. For
  §10: `impPanel`/`impFloor`/ceiling panels should carry wear only at kick height, and a clean "painted steel" for
  beams/trays would let rooms stop tinting the worn map.
- **Shadow-casting slot 0 needs a bias / cone rule (§9.4).** The pool's one shadow-casting spot renders a shadow map
  whose frustum is 2× the descriptor's `angle`; a 1.5 rad pool that lands in slot 0 becomes a 172° shadow camera with
  ~8 cm texels and stripes every lit wall near the player with acne (officers' corridor, round 2). A `shadow.bias`
  / `normalBias` on the slot-0 light in the pool, or clamping shadow casters to ≤ 1.3 rad, removes it; until then my
  rooms keep pools at ≤ 1.35 rad and give the tight fixtures the higher priority.
- **Pool lights leak through shared walls (found by the intel round, matters for every deck).** Pool lights cast no
  shadows, so a neighbour room's descriptors light every surface in the current room that faces them. Repro:
  `d1-intel-vestibule` with `d1-corridor-stbd` active — the corridor's two nearest cool-white points (5 m away, behind
  the 0.3 m wall) turned the guard booth's light-grey back panel pink-white inside a red-only room; with intel alone
  it is red (`/tmp/sd-shots/intel-c-probe`). I darkened that panel, but the general fix belongs in §9.4: either fill
  the pool from the current room first and admit neighbour descriptors only within ~3 m of the shared door (where
  they are visible through it anyway), or let a room set `lights.neighbours: false` in its manifest. Red-only,
  amber-only and dark rooms (intel, any brig/reactor mood room on other decks) will show this the moment a lit
  corridor is adjacent.
- **Blast-door lintels vs 3.2–3.4 m ceilings.** A 4.0 m `blast` opening is taller than the spine (243.2), corridor
  (243.2) and intel (243.4) ceilings; the top 0.6–0.8 m of the hole sits in the ceiling void and my `doorReveal`
  lintel ends at 244.05 — which is why intel and spine bounds now end at y 244.2. D's 4 m leaves will be partly hidden
  above the ceiling on those doors (harmless visually: the opening reads as ceiling-high); if D prefers, its helper
  could clamp leaf height to the lower of the two rooms' ceilings.
- **Light intensities.** Practical values to make pools read on dark Imperial surfaces are ~2× the E·h² ≈ 1 rule
  (bridge runs E ≈ 2–3, rafts 62 cd at 4 m). Worth a line in §9.4, together with the pool scoring ratio (in my shim
  0.1 priority ≡ 12 m of distance) so rooms can tune fills deliberately.
- **Batched small emissives.** ~1900 LEDs as individual `BoxGeometry` adds cost ~40 % of a room's build time;
  `comms/lib.js LedBatch` builds them as one hand-made 5-face geometry per material. A shared `kit.batchBoxes()` would
  let every room have dense indicators within the 250 ms budget.
- **Intel door.** The room's mood depends on the blast door being opaque and closed by default; if D's doors idle open
  (auto-open on approach is fine), please keep leaves closed at rest.
- **N8AO pass leaks thin hidden emissives through walls (software GL).** Repro: harness view `d1-lobby-side`
  (rooms d1-lobby + d1-spine): a dashed blue line of the spine's 1 cm floor-strip edges is drawn across the lobby's
  north wall. Disappears with direct rendering (`?post=0`) and when the spine's `kit_emitBlue` mesh is hidden;
  unchanged with bloom off or `halfRes: false`. Probably a depth-buffer precision difference in N8AO's beauty target
  at world coordinates ~500 m from the origin. Please check on a GPU; if it reproduces, a 32-bit depth texture on the
  N8AO target or a tighter camera near plane per mode would be the first things to try.
- **Vite HMR kills harness runs in a shared working tree.** Any file save by another agent full-reloads the page
  mid-run. `src/rooms/deck1/_dev/vite.harness.config.mjs` (hmr off, watch off) + a reload-resilient runner fixed it
  for us; `tools/shots.mjs` users will hit the same thing once several agents share a checkout.
- **Player floor height.** The bridge pits (+237.6) and stairs need the player to follow floor height (Kestrel's
  `Player.setPose` zeroes y and never changes it). Suggestion: colliders tagged `"floor"` carry a top y the player
  snaps to, or `ctx.player.setFloor(y)`. Until then I block the stair tops with colliders tagged `stairs-pending`
  — drop them once the player can step down.
- **Per-room base fill.** In 40 m-wide rooms the 12+4 pool cannot light the walls; a per-room ambient in the manifest
  (`ambient: { sky, ground, intensity }` applied to the shared hemisphere while the room is current) would let
  light-grey panels read as light grey without spending descriptors. Proposal only; I build to the contract.
- `tools/shots.mjs` filters `SHOT_VIEWS` against the hard-coded Kestrel list, so custom view names are dropped. Until
  the scaffold version lands I run my own runner (`src/rooms/deck1/_dev/shots.mjs`, writes to `/tmp/sd-shots/`).
- Lift door opening size in the lobby wall is not specified in §9.2. I cut 2.4 w × 3.0 h centred on the anchor;
  please confirm or state the cabin door size so D and I match.
- Registry envelope check: my bounds use y min 239.5 (floor slab) and y max ceiling + 0.4..0.6 (ceiling structure),
  the bridge 236..250 as in the §7 example. Please keep the y check tolerant of that (or tell me the exact rule).
- The bridge window reveal geometry extends to z 455.5 inside the aperture rect only (§6.2 grants B that volume);
  the manifest bounds start at z 458 like the example. If the registry checks geometry vs bounds, allow the aperture volume.

## Interface notes
- **Wall thickness vs D's doors helper (needs A's ruling).** D's `src/systems/doors/helper.js` (branch
  `cursor/sd-hangar-systems-c071`) assumes `WALL_T = 0.16` per room, tunnel lining 0.32 m, `FRAME_W` 0.22. B and C
  both build 0.30 m walls inside their bounds (inner faces 0.60 m apart). With 0.16 the frame would sit 0.14 m
  inside my wall and the lining would stop 0.14 m short of each inner face. Proposal: fix the contract at 0.30 per
  room (matches two decks already built), or let the doors system take an optional `wallT` per room manifest
  (default 0.16). My `doorReveal()` already lines my full 0.30 m hole edges in dark metal, so until this is settled
  the gap reads as a dark reveal, not raw panel edges.
- D's `LIFT_DOOR` (2.4 × 3.0) and `liftCabinBox()` (x ±2, z 522..526, y 240..243.6 for T1) match what the lobby
  cuts and keeps free — no change needed.
- Console/screen materials: rooms use `screenImp0..3`, `emitWhite/Blue/RedImp/Amber/Green`, `impPanel`, `impFloor`,
  `blackGloss`, `holo` from §10 plus existing `paintedMetal/metal/metalRough/darkGloss/glass/hazard/fabric/decal`.
  No `manifest.materials()` extras yet.
- `d1-spine-end-port/stbd` are deliberately unpaired (`to: d1-future-*`) so D builds them locked (§9.1).
