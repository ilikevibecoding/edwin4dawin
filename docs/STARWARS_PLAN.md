# Frontier Craft → Star Wars expansion: master plan

This document is the contract for the expansion the user asked for: a real, walkable Death Star, a Coruscant city at
least ten times the western town with fully furnished interiors, a spaceport with a rideable space train, Minecraft-
faithful gameplay (jumping, chests, doors, food), and, later, spaceship travel between worlds. It defines the shared
architecture every builder agent must build against, the phases, and links to the four rubrics in `docs/rubrics/`.
Rubrics are acceptance criteria: nothing is "done" until an independent critic and a verification run sign it off.

## 0. Constraints that shape everything

- **One voxel world, several regions.** Coruscant, the frontier and the Death Star live in the same coordinate space so
  a train or a ship can physically carry the player between them (chunks stream as it moves). Regions are decided by
  world position in `src/worldgen.js` (`regionAt(x, z)`): `frontier` (existing, |x|,|z| < ~700), `ocean` (in
  between), `coruscant` (plateau centred at (3000, 0), 1024×1024 blocks = 64×64 chunks), `space` (void, black sky,
  the Death Star centred at (0, 128, -4000)).
- **World height 256** (`CHUNK_HEIGHT`), so skyscrapers reach y 250 and a 200-block Death Star fits. Every hard-coded
  128 is gone (`save.js`, `server/index.mjs`, unit test). Clouds move to y 200 in the frontier and are absent over
  Coruscant/space.
- **Lazy structures, not dense overlays.** `worldgen` gets a `StructureRegistry`: a structure declares an AABB and a
  `fillChunk(chunkBlocks, cx, cz)` that writes only the blocks inside that chunk, deterministically from the seed. The
  western town keeps its dense `TownStore` behind this interface; Coruscant and the Death Star generate per chunk (with
  an LRU of building blueprints). Generation must stay under ~6 ms per chunk on average so streaming keeps up with the
  train at 30 blocks/s (2 chunks/s per row).
- **Vehicles are moving voxel structures.** A vehicle owns a small block grid, a pose (position along a path, yaw) and
  a mesh built by the normal chunk mesher. Player/NPC collision samples world blocks AND vehicle blocks (transform into
  vehicle space); anything standing on a vehicle is carried by its per-tick displacement. That is what makes "walk
  around inside the train while it moves, jump on and off" work without glitches.
- **Determinism and multiplayer.** World generation is a pure function of (seed, x, y, z). Vehicles run on the shared
  20 TPS clock (position = f(tick)), so every client agrees where the train is. Block edits keep syncing as today.
- **Performance budget** (Cinematic, real GPU): ≥ 60 fps at 10 chunks in Coruscant's densest district; ≤ 1500 draw
  calls; chunk generation ≤ 6 ms avg; the SwiftShader test VM is used for correctness and relative numbers only.
- **Art.** Everything is procedural pixel art in the Minecraft idiom; use the whole palette (and add the blocks the
  rubrics list: durasteel plates, dark panels, glowstone/lamps, glass panes, black/grey/red terracotta, quartz, sea
  lantern, iron bars, etc.). No copyrighted textures or text; the Death Star and Coruscant are our own voxel designs
  inspired by the films.

## 1. Phases

| Phase | Goal | Depends on |
| --- | --- | --- |
| F (foundation) | Height 256, region system, lazy `StructureRegistry`, per-region sky, vehicle core, gameplay 1:1 pack (jump ✔, doors, chests, food, animal drops), item registry | — |
| C (Coruscant) | Layout (districts, street grid at several levels, skybridges, undercity), 6+ tower families with interiors, civic landmarks (senate dome, temple-like spire), spaceport with pads, ship models + traffic, lighting | F |
| T (transit) | Hyperlane track frontier ↔ Coruscant (elevated), two stations, the space train (rideable interior), boarding/alighting, schedule | F (vehicles) |
| D (Death Star) | Exterior shell in the space region, hangar bay you can walk into, decks (corridors, control rooms, detention block, trash compactor, tractor beam, throne room, reactor shaft, superlaser dish interior), lighting, turbolifts (vertical vehicles) | F |
| R (review) | Critics per rubric, verification (tests, determinism, perf), fixes, docs, demo recordings | C, T, D |
| S (later) | Spaceship travel: board a ship at the spaceport, fly to the Death Star hangar / other worlds | C, T, D |
| N (later) | Coruscant population (see §3) | C |

Phases C, T and D run in parallel across many builder agents in isolated worktrees with strict file ownership, as in
the disaster rounds; each has a critic. Phase F is done first because everyone codes against its interfaces.

## 2. Rubrics

- `docs/rubrics/01_death_star.md` — Death Star exterior + full interior.
- `docs/rubrics/02_coruscant.md` — Coruscant city (≥ 10× the town) with furnished interiors, spaceport and ship traffic.
- `docs/rubrics/03_minecraft_gameplay.md` — Minecraft-faithful movement and interaction (jump, doors, chests, food, combat/drops, crafting later).
- `docs/rubrics/04_spaceport_space_train.md` — Spaceport + rideable space train (and the later spaceship travel).
- `docs/rubrics/05_render_quality.md` — The "4K Minecraft with shaders" look: 64x HD tiles, normal/material maps, cascaded sun shadows, HDR bloom + filmic tone mapping, atmospheric sky, water reflections, presets.
- `docs/rubrics/06_landmarks.md` — Coruscant signature buildings, one builder per building (Senate, Jedi Temple, Monument Plaza, Opera, 500 Republica, Chancellery, Uscru undercity, medcenter, detention centre, the Works, HoloNet tower, CoCo Town market).

## 3. NPC plan for Coruscant (design only for now; the user wants interiors first)

- **Population model**: the city is far too big for 39 hand-scheduled NPCs. Use a *district population* system: each
  district declares archetypes (office workers, residents, dock workers, security droids, vendors) and a density; NPCs
  are spawned/despawned within ~96 blocks of the player from a deterministic per-district pool (seeded, so the same
  people appear at the same places at the same time of day), capped at ~120 humanoids + 60 droids near the player.
- **Schedules by building metadata**: every generated building already records `spots`, `beds`, `work`, `door` (same
  record shape as the town). Coruscant buildings add `lobby`, `elevator`, `balcony`, `hangar` spots so an NPC's day is
  apartment → turbolift → skybridge → office → cantina → home.
- **Navigation**: the current A* is per-block; Coruscant needs a two-level graph: a coarse graph of platforms/
  skybridges/lift shafts (precomputed per district from the layout) and local A* inside a building or on a platform.
  Turbolifts are vehicles NPCs can ride (same carry mechanic as the train).
- **Crowd rendering**: far NPCs use the existing static LOD; add an instanced "crowd" renderer (one draw call per
  skin family) for the >60-block band so plazas look busy.
- **Traffic**: ships and speeders are the "NPCs" of the sky: lane graph between pads and skylanes, with landing/
  takeoff scripts at the spaceport (built in Phase C as pure visuals, upgraded to boardable in Phase S).
- **Interaction**: the same right-click talk with district-flavoured lines; vendors sell food (ties into the food
  system); security reacts to block breaking in civic areas.
- **Multiplayer**: NPCs stay client-side ambience (as today) unless a server-authoritative mode is added later.

## 4. Working method

Same loop as the disaster rounds: baseline → builders in isolated worktrees with file ownership → harsh critics per
rubric → independent verification (unit, determinism, multiplayer, performance) → merge only measured improvements →
changelog. Every rubric row must be demonstrated in the running game (screenshots/recordings) and measured.
