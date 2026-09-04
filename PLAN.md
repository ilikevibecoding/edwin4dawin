# ISD *Redoubt* — ship development plan

Transforming the Kestrel light-freighter interior demo into an Imperial-class Star Destroyer: one coherent,
enormous, explorable ship with a true-scale exterior, a command tower, a ventral hangar with fighter traffic,
and four connected interior decks. This document is the contract every workstream builds against.

## 0. Baseline (Kestrel, iteration 9 → `shots/iter_baseline`)

- 5 rooms (corridor, cockpit, quarters, galley, bathroom), ~22 m long, 22 lights, 69 AABB colliders.
- 110–171 draw calls, 226–366k triangles, 49 shader programs, 75 textures; `vite build` 928 kB JS.
- SwiftShader (software GL, the only GPU available here): 2.0–2.8 s/frame at 1280×720. Real-GPU fps is
  unmeasured on this machine; everything below is scored on draw calls / triangles / lights / texture memory,
  plus *relative* software frame times.
- Everything procedural (no external assets) — this stays true for the Star Destroyer.

## 1. World frame and scale

- Units: metres. `+X` starboard, `+Y` dorsal (up), `−Z` forward (bow). Yaw 0 looks toward the bow.
- Ship length 1600 m: bow apex `z = −1100`, stern plane `z = +500`. Half-width at the stern 450 m.
- Hull mid-plane (the equatorial trench) is `y = 0`. Dorsal plateau ≈ +46 m at the stern, ventral belly
  ≈ −74 m at the stern (the belly is deeper: hangar wells and the reactor bulb live there).
- Command tower top (bridge block) `y 195..235`; shield globes to `y ≈ 275`; comms mast to `y ≈ 305`.
- Human scale is enforced by the interior: doors 2.4–3.2 m, corridor ceilings 4.5 m, bridge ceiling 7 m,
  hangar ceiling 32 m above its deck, TIE fighter 6.4 m tall. The bridge windows look out over 1400 m of hull.

All analytic hull functions (`halfWidth(z)`, `dorsalY(x,z)`, `ventralY(x,z)`, tower/neck boxes, engine and
bay cut-outs) live in `src/core/layout.js` and are the single source of truth for the exterior and the interior.

## 2. Scene hierarchy

```
Scene
├─ sky (follows the camera; depthTest/depthWrite off; rendered first)   src/space.js
│   ├─ star layers (parallax), galactic band, nebulae, sun sprite, planets (shader), dust streaks
├─ sun (DirectionalLight, shadow frustum fitted per camera mode) + hemisphere fill
├─ exterior (group)                                                     src/exterior/*
│   ├─ hull (merged meshes per material, 3 LOD tiers)
│   ├─ superstructure / city terraces / turbolaser turrets / sensor domes
│   ├─ command tower (neck, bridge block, window bands, shield globes, comms mast)
│   ├─ engines (7 nozzles, emissive cores, heat glow), stern notch
│   ├─ greebles (InstancedMesh per prototype, LOD by camera distance)
│   ├─ running lights, window emissives, bay openings + containment fields
├─ interior (group) — RoomManager                                       src/core/room.js + src/rooms/**
│   ├─ cluster tower      (y 210): bridge, tactical, nav_station, observation, cmd_corridor, lift lobby,
│   │                              intelligence, briefing, comms, officers_quarters
│   ├─ cluster hangar     (y −40): hangar, fighter_maint, cargo_bay, repair_bay, shuttle_bay, hangar_lobby,
│   │                              flight_control (booth at y −22)
│   ├─ cluster engineering(y −10): eng_lobby, eng_corridor, engineering, reactor (40 m tall), hyperdrive,
│   │                              life_support
│   ├─ cluster crew       (y  +6): crew_lobby, crew_corridor, crew_quarters, mess, lounge, medbay,
│   │                              crew_connector, crew_corridor_fwd, armory, detention, escape_pods
│   └─ each Room: group{ kit meshes (1 per material), instanced props, lights, doors, colliders, animated }
├─ fighters (group): TIE fighters (parked instanced + flying), Lambda shuttle, tractor/field effects
└─ camera (PerspectiveCamera; interior near 0.05 / exterior near 1; far 6000 / 30000)
```

Only the current room and rooms reachable through *open* doors are rendered (door-portal culling); their
lights are the only enabled interior lights; the player only collides with their colliders. Room geometry is
built lazily per cluster (the turbolift ride is the streaming window) and disposed when the cluster has not
been visited for a while.

## 3. Interior layout (world metres; floor y; `h` = ceiling height)

### Cluster TOWER (floor y = 210, inside bridge block x ±120, z 170..230)
| room | x | z | h | doors |
|---|---|---|---|---|
| bridge | −14..14 | 172..206 | 7 | aft z=206 x −2..2 (blast) → cmd_corridor; port x=−14 z 186..189 → tactical; stbd x=14 z 186..189 → nav_station. Forward glazing z=172, x −13..13, y 211..216.5, leaning out 12°. Crew pits y 208.6 at x ∈ [−12,−4] and [4,12], z 176..202, steps at both ends. |
| tactical | −34..−16 | 172..206 | 6 | east x=−16 z 186..189 → bridge; aft z=206 x −26..−23 → cmd_corridor. Forward windows (shuttered). |
| nav_station | 16..34 | 172..206 | 6 | west x=16 z 186..189 → bridge; aft z=206 x 23..26. Forward windows. |
| observation | −84..−62 | 172..206 | 6 | aft z=206 x −75..−72. Forward windows x −83..−63. |
| cmd_corridor | −84..60 | 206..212 | 4.5 | the transverse spine; every door above/below opens onto it |
| lift_lobby_tower | −6..6 | 212..222 | 4.5 | fwd z=212 x −2..2; cabs on aft wall: A x −5..−1, B x 1..5, z 222..225 |
| intelligence | −60..−40 | 212..228 | 4.5 | z=212 x −51..−49 (narrow, secured, vestibule) |
| briefing | −38..−8 | 212..228 | 5 | z=212 x −24..−21 |
| comms | 8..38 | 212..228 | 5 | z=212 x 21..24 |
| officers_quarters | 40..60 | 212..228 | 4 | z=212 x 48..51 |

Tower face windows (exterior, z = 170): continuous slot x −34..34 and x −84..−62, y 211..216.5.

### Cluster HANGAR (floor y = −40)
| room | x | z | h | doors / notes |
|---|---|---|---|---|
| hangar | −40..40 | −90..70 | 32 | floor opening x −22..22, z −70..50; well down to the belly (y = −68) with the containment field at the bottom. aft z=70 x −10..10 (20×14 blast) → shuttle_bay; port x=−40: arches z −50..−30 and z 0..20 (20×12) → fighter_maint; stbd x=40: arch z −50..−30 → cargo_bay, arch z 40..56 → repair_bay; fwd z=−90 x −3..3 (6×4) → hangar_lobby. Stair tower x 32..40, z −46..−22 up to flight_control. |
| fighter_maint | −80..−44 | −60..30 | 18 | arches to hangar through the 4 m wall |
| cargo_bay | 44..80 | −60..−24 | 18 | arch to hangar; cargo lift platform |
| repair_bay | 44..80 | 30..90 | 14 | arch to hangar |
| shuttle_bay | −30..30 | 72..170 | 26 | floor opening x −14..14, z 110..160; Lambda shuttle parked z 80..105 |
| hangar_lobby | −8..8 | −110..−92 | 5 | aft z=−92 x −3..3 → hangar; cabs on fwd wall z −113..−110: A x −5..−1, B x 1..5 |
| flight_control | 40..52 | −20..0 | 4 (floor −22) | glass front at x=40 over the hangar; reached by the stair tower |

Exterior: the belly is cut by both wells (hangar and shuttle) and shows the fields glowing from below.

### Cluster ENGINEERING (floor y = −10)
| room | x | z | h | doors |
|---|---|---|---|---|
| eng_lobby | −6..6 | 252..262 | 4.5 | cabs fwd z 249..252; aft z=262 x −2..2 → eng_corridor |
| eng_corridor | −70..70 | 262..270 | 4.5 | aft wall: engineering x −3..3; hyperdrive x −56..−52; life_support x 52..56 |
| engineering | −20..20 | 270..300 | 6 | control room; window into the reactor; aft z=300 x −3..3 (airlock passage z 300..304) → reactor |
| reactor | −32..32 | 304..368 | 40 | core column, catwalk ring at y 0, gantries |
| hyperdrive | −70..−38 | 270..340 | 12 | motivator cylinders, coils, glow rings |
| life_support | 38..70 | 270..340 | 10 | scrubbers, water tanks, waste processing, pipes |

### Cluster CREW (floor y = +6)
| room | x | z | h | doors |
|---|---|---|---|---|
| crew_lobby | −6..6 | −122..−112 | 4.5 | cabs aft z −112..−109; fwd z=−122 x −2..2 → crew_corridor |
| crew_corridor | −62..62 | −130..−122 | 4.5 | fwd wall z=−130: crew_quarters x −50..−47, mess x −20..−17, crew_connector x −3..3 (open), lounge x 17..20, medbay x 47..50 |
| crew_quarters | −62..−36 | −170..−130 | 4.5 | bunk bays, refresher (interactable: Sleep / Wash up) |
| mess | −32..−4 | −170..−130 | 5 | galley counter, dispensers (interactable: Eat) |
| lounge | 4..32 | −170..−130 | 5 | holo-game table, seating, viewscreens |
| medbay | 36..62 | −170..−130 | 4.5 | bacta tank, beds, surgical droid alcove |
| crew_connector | −3..3 | −170..−130 | 4.5 | longitudinal link between the two corridors |
| crew_corridor_fwd | −62..62 | −178..−170 | 4.5 | aft wall: connector x −3..3 (open); fwd wall z=−178: armory x −50..−47, detention x −14..−11, escape_pods x 33..36 |
| armory | −62..−36 | −206..−178 | 4.5 | weapon racks, armour lockers |
| detention | −30..4 | −220..−178 | 4.5 | cell block corridor, control desk, cells |
| escape_pods | 8..62 | −206..−178 | 4.5 | pod hatches with status panels, launch tubes |

### Turbolift network
Four lobbies (tower / hangar / engineering / crew), two cabs each (4×3×3 m). Interact with the cab panel to
choose a deck; doors close, ride (shaft light animation, hum), player is moved to the same cab position in
the destination lobby, doors open. The ride time is the streaming window for the destination cluster.

## 4. Camera modes and transitions
- **Interior**: first-person, WASD + Shift sprint, gravity, step-up 0.45 m, stairs, railings.
- **Exterior orbit**: drag to orbit, wheel to zoom (120..6000 m), auto-rotate when idle; `F` toggles free-fly.
- **Board** (Enter / click): camera flies to the bridge glazing, fades, interior starts on the bridge walkway
  looking along the same axis. **Exterior view** (`V`) from inside: fade, exterior camera appears outside the
  nearest hull feature of the current cluster looking back at it, so the player always sees *where they were*.
- Reserved for later phases (interfaces only, in `src/systems/flight.js`): flight control, atmospheric entry,
  landing supports, docking, surface contact, hangar deployment, orbit→atmosphere→ground camera, landing zones.

## 5. Fighter traffic (no NPCs)
TIE fighters hang in ceiling racks over the hangar well; a scheduler lowers one, releases it through the field,
flies a patrol spline around the ship, returns, and is tractor-beamed back into the rack. Interfaces:
`traffic.requestLaunch(id)`, `requestRecall(id)`, `setController(id, ctrl)` (a future pilot AI overrides the
scripted path), `on(event)`, `snapshot()/apply()` for network sync.

## 6. Design language
Dark durasteel plating (`#3c4046`–`#7d838b`), black gloss floors, recessed white light strips, black control
panels with red/blue/amber indicator matrices, angular door frames, hazard bands (black/red or black/yellow),
Aurebesh-style stencils and an Imperial-style cog emblem drawn procedurally. Each room keeps the language but
owns its accent: bridge cold blue + red, hangar amber work-lights, reactor white-blue core glow, medbay
clinical white, detention hard red, mess warm amber, hyperdrive violet-blue.

## 7. Workstreams (one owner per file set, isolated worktrees)
| stream | files |
|---|---|
| core / architecture (lead) | `src/core/*`, `src/systems/{player,camera,transitions,doors,lifts,sync}.js`, `src/main.js`, `materials.js`, `textures.js`, `space.js`, `hud.js`, tools |
| exterior hull | `src/exterior/*` |
| bridge | `src/rooms/tower/bridge.js` |
| hangar + fighters | `src/rooms/hangar/{hangar,flight_control}.js`, `src/fighters/*` |
| tower rooms | `src/rooms/tower/{tactical,nav_station,observation,intelligence,briefing,comms,officers_quarters}.js` |
| deck rooms | `src/rooms/hangar/{fighter_maint,cargo_bay,repair_bay,shuttle_bay}.js`, `src/rooms/engineering/*` |
| crew rooms | `src/rooms/crew/*` |
| corridors / lobbies / stairs | `src/rooms/common/*` |
| atmosphere / post / lighting | `src/systems/atmosphere.js`, `src/post.js` |
| audio placeholders | `src/systems/audio.js` |
| critics / validators / perf | reports only (`REVIEW.md`), no source edits |

## 8. Loop
1. baseline → 2. plan (this file) → 3. exterior silhouette + scale → 4. interior structure + connections
(grey-box, navigable) → 5. bridge → 6. hangar + traffic → 7. materials / lighting / atmosphere / audio hooks /
animation → 8. visual critics (exterior far/mid/near, every room) → 9. technical validation (loading, collision,
navigation, transitions, references, extensibility) → 10. performance after each milestone → 11. merge only
verified improvements → 12. re-review after every merge. Playable build published hourly to the play branch.

## 9. Performance budget (targets, measured with `debugAPI.getStats()` + `tools/shots.mjs`)
- ≤ 250 draw calls and ≤ 1.2 M triangles in any interior view; ≤ 400 calls / 2.5 M triangles exterior close.
- ≤ 12 active point/spot lights, ≤ 2 shadowed spots + the sun. Texture memory ≤ 256 MB. JS heap ≤ 600 MB.
- First frame ≤ 6 s on a laptop (procedural textures + first cluster), other clusters stream during lift rides.
- Adaptive quality (pixel ratio + AO quality) stays; content is never removed to hit frame rate.
