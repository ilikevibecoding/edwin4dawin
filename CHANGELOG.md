# Changelog

All measurements below come from `node scripts/bench.mjs` (headless Chrome with SwiftShader software GL in the
build VM, 4 shared cores: FPS/GPU numbers are far below a real GPU; the comparable metrics are JS ms per frame,
long tasks, memory, draw calls, triangles, entity counts and load time). Reports live in `bench/*.json`.

## Unreleased - natural disasters, administrator panel, multiplayer, eyes, optimization

### Round 5 (user request): Star Wars expansion - Coruscant, Death Star interior, space train, spaceport, 1:1 gameplay, HD render pipeline
Plan and per-rubric acceptance criteria: `docs/STARWARS_PLAN.md`, `docs/rubrics/01..06` (each rubric carries a
"Status / decisions" section written by its builder with measurements and known gaps). Everything below is merged on
the integration branch and in the committed `dist/` build; landmark builders still running are listed at the end.

- **World foundation**: world height 256 (`WORLD_HEIGHT`, save/server/tests updated); `regionAt(x, z)` regions -
  frontier coast + ocean, the Coruscant plateau (1024 x 1024, top at y 60, centred on (3000, 0)), the space void
  around the Death Star - with per-region sky/fog (`sky.applyRegion`); a lazy `StructureRegistry`
  (`structures/index.js`) that lets every large structure fill chunk blocks deterministically on demand instead of
  keeping dense overlays in memory; 18 Star Wars blocks (durasteel, panels, glow panels, holo signs, consoles, deck
  plates, steel glass, chrome, lit/dark windows, city lamps, hull plates and trench, ...).
- **Minecraft 1:1 gameplay** (rubric 01; `items.js`, `doors.js`, `hud.js`, block entities in `world.js`, save v2):
  hunger and saturation with Minecraft food values (bread, apples, raw/cooked meat; furnace cooking and baking),
  chests with a 27-slot UI and shift-click quick-move, doors (two-block, NPCs open them ahead and close them behind),
  wheat crops that grow, item drops with Minecraft's pickup rule; block entities are journaled by the disaster
  manager so a reset restores a chest with its contents
  and nothing duplicates. The one-block step: auto-jump now schedules a full-strength jump on the next grounded tick
  (`autoJumpPending`), key taps are consumed on first read so they register at low frame rates, and double-tap flight
  only triggers from the air so bunny-hopping cannot start flying.
- **Space train** (rubric 03; `vehicles/`, `structures/hyperlane.js`, `structures/stations.js`): an elevated
  hyperlane (y 90) between the frontier station at x 262 (with a roof-deck mini spaceport) and the Coruscant station
  at x 2548 (glass concourse joined to the spaceport bridge by half-slab steps); a 3-car voxel train whose timetable
  is a pure function of the game tick (identical on every client), an interior you can walk around in while it moves;
  the vehicle manager carries players standing on any car. Hop on and off: the train's doors stay open below 16
  blocks/s (the whole dwell plus the first and last ~34 blocks of each ride) and the platform screens open along the
  whole platform while it rolls through, so you can walk into a departing train from the platform or step out of an
  arriving one; a walkway with railing runs the length of the hyperlane at car-sill height, so stepping off (or off
  the roof) lands you there instead of 40 blocks down. Independent verification found and this round fixed: the
  engine door that opened onto the drop, the hull passing through anyone on the track (a moving hull now shoves
  entities ahead of it; 2 HP on first contact), doors sealing on a rider in the doorway (nudged inside), riders
  carried into station canopies (the carry is refused and the train slides on), and a reload mid-ride stranding the
  player (the timetable tick is saved with the player). CDP checks: hop-off onto the walkway, hop-on from the platform,
  doorway sealing, reload while riding, track shove - all pass.
- **Coruscant** (rubric 02 + 06; `coruscant/`): a 3-level street grid (boulevards, streets, skylanes) over the
  plateau with 421 tower lots, 8 plazas and 12 signature-landmark lots; tower families (residential, office, spire,
  slab, stepped, industrial) with a room library so every floor has lit, furnished, reachable rooms; blueprints are
  cached in an LRU and filled per chunk. Signature landmarks (one dedicated builder each, verified by
  `scripts/landmark-stats.mjs`: deterministic, every room lit + furnished + reachable on foot): CoCo Town market
  halls, Jedi Temple (five spires, archives, council chamber), Galactic Senate (dome, rotunda, chancellor suite),
  Uscru undercity strip (neon canyon, gangways, cantinas), Monument Plaza (Umate rock, radial light strips,
  pavilions), the Works foundry (smelter hall, magma trench, cooling towers). Far-skyline impostors
  (`coruscant/skyline.js`): one draw call of inset tower boxes + a ground sheet with a long fog and a lit-window
  lattice at night, hidden inside the streamed radius, so the city reads to ~1000 blocks; Coruscant fog starts at
  0.85x render distance.
- **Spaceport and ships** (rubric 03; `coruscant/spaceport.js`, `ships/`): terminal, landing pads, control tower;
  voxel freighters, shuttles and speeders on Catmull-Rom lanes routed along the boulevard corridors (validated
  against every lot by `test-spaceport.mjs`), landing / take-off cycles with engine glow.
- **Death Star** (rubric 04; `deathstar/`): the station used by the superlaser event is now also a real place 3900
  blocks out in the space region: a full shell with the equatorial trench, and a walkable interior generated from
  deck plans (hangar 327 with its control room, corridors with blast doors, detention block, throne room, reactor
  shaft), reached through the hangar mouth (`?x=0&y=130&z=-3880` or the panel's Travel button).
- **Render pipeline** (rubric 05; `render/`): 64 px refined tiles with procedural normal + material atlases
  (`hdTiles.js`, `materials.js`, `materialMaps.js`; every tile classified, `test-textures.mjs`), per-pixel PBR-lite
  lighting with a tangent frame from a new `aFace` mesher attribute, 2-cascade texel-snapped sun shadows with PCF,
  half-float HDR target with a 5-level bloom capped at +0.35, ACES filmic tone mapping with time-of-day exposure,
  vignette, depth-gated FXAA, Rayleigh/Mie sky shared with fog, water and metal reflections, animated water with
  Fresnel. Presets: Cinematic (all on), Balanced, Light (the old direct path; software GL auto-selects it); the
  shared shading chunk is bound by terrain, entities, debris, vehicles, ships and the tsunami crest.
- **Admin panel**: a Travel section (frontier town, frontier station, spaceport, Senate, Monument Plaza, skyline,
  Death Star exterior, Death Star hangar) that streams the target chunks and teleports (flying where needed).
- Tests: `npm test` now runs unit (11), textures (11), Coruscant towers (6), spaceport (15), Death Star (8) and the
  40 disaster lifecycle/replay/restore checks; `test-disasters.mjs` folds door states and crop stages into the world
  hash (NPCs opening doors and crops growing were the cause of the intermittent "reset restores the sampled world
  region" failure). Multiplayer 8/8.
- Measured after the landmark merge (SwiftShader VM, Light preset, `bench/r5_*.json`): frontier town 148 draw calls,
  202k tris, JS 3.1 ms/frame, 227 MB heap (0 exceptions); Coruscant Senate view at 10 chunks: 629 chunks, 144 draw calls,
  1.08M tris, JS 2.3 ms/frame, 506 MB heap, GPU-bound in software GL (171 ms; unmeasured on a real GPU). Full suite on
  the merged tree: unit 11, textures 11, towers 6, spaceport 15, Death Star 8, disasters 40/40 (ALL PASS), multiplayer
  8/8; all twelve landmark harnesses OK.
- Measured (R1, SwiftShader, `bench/r1_*.json`): Light preset A/B before/after the pipeline 105.3 -> 93.5 ms frame,
  3.75 -> 3.35 ms JS, 146 draw calls both; Cinematic 408 draw calls (shadow pass 144 chunk + 59 object draws of 374
  loaded chunks), +58.6 MB GPU memory at 1280x713; noon mean luminance Cinematic/Light 1.024 with real maps; bloom
  source mask 0.166% of pixels. Real-GPU 60 fps at 1080p is unmeasured in this VM.
- All twelve signature landmarks are in (the six above plus the Detention Center, HoloNet tower, Medical Facility,
  Opera House, 500 Republica and the Chancellery; `docs/rubrics/06_landmarks.md` has the per-landmark harness table).
- Known gaps: NPCs for Coruscant are planned (`docs/STARWARS_PLAN.md`, population plan) but not spawned;
  clouds cast no shadows; the Coruscant daytime haze is deliberately bright (city smog) and steel-glass roofs still
  read bright at noon; the "leave the planet by spaceship" journey is the next big project.

### Round 4 (user feedback): Death Star superlaser, friendlier panel, wave-swept villagers, flight, view distance
- **Orbital beam rebuilt as a Death-Star-inspired superlaser event.** New battle station (`beam/station.js`,
  `stationGeometry.js`, `stationShaders.js`): a 138^3 voxel volume greedy-meshed into one geometry (37k quads), with an
  equatorial trench, a concave superlaser dish with 8 rim emitters and a centre emitter, panel plating, hundreds of
  window lights, quantised sun shading, a fog term capped at ~28% so it stays visible 300 blocks out, charge-driven
  green bounce light at night; 2 draw calls. New sequence (`orbitalBeam.js`): arrival from 380 blocks out / y 380 to
  225 blocks out / y 210 in the chosen bearing while NPCs stop and crane their heads (`npcs.watch`, "What's that in the
  sky?" lines), charge with 4 green tributary beams igniting 0.5 s apart into a pulsing focus, a 1.6 s diagonal green
  main beam, impact with a destruction wave (dust wall + shock ring racing out to `waveRadius` 62 blocks, debris
  fountains, people and animals knocked down, scorched ground, roofs torn open toward the blast, streets left intact),
  crater with a wide magma lake, aftermath with the station departing. New params `approachTime`, `tributaries`,
  `stationBearing`, `waveRadius`; `destructionRadius` default 28.
- **Villagers react**: `npcs.watch()` curiosity behaviour; `npcs/animals.sweep()` knocks entities into a tumbling
  flight (water sweep: helpless flailing, bobbing and drifting for 4-6 s with "The water took me!" lines, never below
  the flooded floor; dry blast: knock-down with a proper stun and "Get down!" lines); the flood front sweeps everyone it
  passes (77 of 82 in a default run) and the player (knock-down, murky tumble, buoyant for a few seconds, one-time
  "Hold Space to swim up" hint); tornado +50-60% block damage with occasional masonry near the core; flood damage 0.65.
- **Panel redesign**: disaster cards with pixel icons, primary sliders + Advanced, bearing lines, Start & watch,
  status strip with phase names, quality and view-distance selectors, keyboard focus trap, 720p fit.
- **Quality presets** (`quality.js`): Cinematic (default: 10-chunk view distance, 1800 debris, 3000 particles, doubled
  relight/remesh budgets), Balanced, Light; the simulation edit budget stays fixed (400/tick) for deterministic
  multiplayer. **View distance** up to 24 chunks (pause menu and panel; the explicit choice is remembered).
- **Creative flight**: double-tap `Space`; `?fly=1`.
- Fixes: a Start issued during a restore is queued instead of refused; wave-thrown bodies only stagger on landing;
  a flood deeper than 7 blocks no longer deadlocks the front at ~5 blocks (the crest pacing now waits only for columns
  that are behind schedule, not for columns waiting on the staircase), and the journal cap is 800k cells so a 14-block
  flood of the whole town (~530k water blocks) fills completely; regression check in `test-disasters.mjs`.
- Critics (round 4, integrated build): Death Star sequence ACCEPT WITH NITS (all must-fix items landed: player
  no longer re-hit by the wave, dry blast, intact streets, lower placement, bigger magma pool, night hull), flood
  ACCEPT WITH NITS (burial regression fixed), panel ACCEPT WITH NITS (all five fixes landed). Tests: unit 4/4,
  lifecycle 39/39 (beam run to tick 700), multiplayer 8/8.
- Measured (SwiftShader VM, load 6-8, Cinematic defaults): town view 192 draw calls / 287k tris / 132 MB at 10 chunks
  (144 / 192k / 96 MB at 7 chunks, js 4.3 ms); tornado js 28.7 ms avg, tsunami 40.8 ms (debris 856), beam 17.5 ms
  (debris 915), 0 exceptions. 24 chunks: 2053 chunks, 818 draw calls, 1.78M tris, ~550 MB heap.

### How to reproduce each disaster
Open the game, press `F4` (or `` ` ``), pick a tab, set a seed, press **Preview** then **Start** and confirm.
Equivalent console commands (same seed => identical destruction, verified by `node scripts/test-disasters.mjs`):

```js
game.disasters.command({type:'start', disaster:'tsunami', seed:7, params:{waterHeight:5, waveHeight:4, direction:'west', speed:6, duration:60, damage:0.5, intensity:0.7, center:[0,0], radius:110}})
game.disasters.command({type:'start', disaster:'tornado', seed:7, params:{start:[-70,20], heading:75, speed:4, wander:0.35, radius:9, duration:75, intensity:0.8}})
game.disasters.command({type:'start', disaster:'beam',    seed:7, params:{target:[0,0], stationBearing:225, approachTime:14, chargeTime:10, tributaries:4, strength:0.7, destructionRadius:28, waveRadius:62, duration:22, intensity:0.7}})
game.disasters.command({type:'pause'}); ({type:'resume'}); ({type:'set', params:{intensity:1}}); ({type:'stop'}); ({type:'reset'}); ({type:'replay'})
```

Multiplayer: `ADMIN_TOKEN=secret npm run server`, then open two tabs with `?server=ws://localhost:8765&admin=secret`
and `?server=ws://localhost:8765`; commands from the admin tab run identically (same server-stamped tick and
seed) in both. `npm run mp-test` automates this with three headless clients including a late joiner.

### Added
- **Disaster foundation** - `DisasterManager` (command driven: preview/start/pause/resume/stop/set/reset/replay,
  seeded determinism, 20 TPS simulation independent of frame rate, per-tick edit / relight / remesh budgets,
  `pauseAtTick` testing aid, authority hooks for the network client), `BlockJournal` (first-touch originals,
  batched newest-first restore, order-independent FNV hash used by the replay tests), instanced pooled
  `DebrisSystem` (one draw call for up to 600 chunks, gravity/collision/buoyancy/force fields, speed clamps),
  `Effects` (camera shake, lighting/fog overrides, flashes), bulk world edits (`World.setBlockRaw` +
  `relightChunk`, budgeted `Terrain.remeshDirty`, border-light diffing so untouched neighbours are not remeshed),
  new blocks (scorched stone, ash, magma, charred planks).
- **Tsunami & flood** (`src/disasters/tsunami.js`, `tsunami/`) - deterministic wave front rendered as a voxel
  crest (unit water columns quantised to whole blocks, staircase + breaking lip, clipped by walls so it wraps
  around facades, world water tile with foam on toe and lip, fades when the camera is inside/under a roof), real
  water blocks placed the moment the front passes and deepened oldest-first so full depth follows within ~5 blocks
  of the crest, textured spray chips, gradual structural damage by material with floating debris that settles as
  the water leaves, receding phase that drains the streets with a final sweep, subtle overcast sky, ambient roar
  loop, NPC evacuation to upper floors / swimming (body-height water detection) with calls for help, animals
  panicking; preview shows the flooded extent with direction chevrons and the entry ribbon.
- **Tornado** (`src/disasters/tornado.js`, `tornado/`) - seeded travelling path with wobble, chunky pixel-smoke
  funnel (nearest-filtered coarse noise, banded alpha, stepped silhouette, ragged tip) dissolving into a storm
  deck, instanced dust skirt at the base, orbiting debris ring, storm sky (dome/fog/sun/clouds blend to the deck
  colour within 120 blocks, fading over the whole rope-out), wind field applied to players/NPCs/animals/debris
  by mass and distance with speed caps (a captured player is ejected after ~4 s), church bell + shouts, gradual
  outside-in, roof-first material-aware destruction along the path (interiors survive until the roof is gone),
  rope-out ending, preview ribbon + radius.
- **Orbital beam** (`src/disasters/orbitalBeam.js`, `beam/`) - original ring station charging above the target
  (motes spiralling into a focus sphere, rising hum), slow visible descent with shimmer sleeve and cloud rings,
  impact flash/shockwave/sparks/smoke columns/debris, deterministic crater growth (scorched floor, magma pool that
  glows at night, ash rim, charred wood), damage/knockback in the column, stop retracts the beam, preview marker.
- **Administrator panel** (`src/ui/adminPanel.js`, `F4`) - disaster tabs, schema-driven parameter form with
  "my position" / "crosshair target" pickers, seed, preview, start with warning + confirmation, pause/resume,
  stop, reset/restore, replay, live intensity slider, copyable console command, save commit/discard, live perf
  readout. Hidden for non-admins.
- **Multiplayer** (`server/index.mjs`, `src/net/client.js`, `src/net/remotePlayers.js`) - server-authoritative
  WebSocket relay: 20 Hz tick, 10 Hz interest-managed player state, block edit relay + history for late joiners,
  disaster commands stamped with authoritative tick + seed and broadcast, admin token, per-client rate/size
  limits, one active disaster; remote avatars with interpolation, name tags and held blocks.
- **Permissions and save isolation** - `Permissions` (single player = owner/admin unless `?admin=0`; online admin
  only via server token), `SaveManager` (player edits persist to localStorage and re-apply on load; disaster
  damage is journaled separately and never saved unless an administrator commits it from the panel).
- **NPC / animal eyes** - human eyes are two clearly separated eyes (white + iris + 1 px skin gap, brows on the
  brow row, iris contrast checked against the skin tone), natural unsynchronised blinking (`npc/blink.js`);
  pig and chicken eyes redrawn with whites/pupils/glint; horse eyes thicker with coat-aware contrast, lashes and
  nostrils moved so they no longer read as low eyes; cow side-eye widened.
- **Creative flight** - double-tap `Space` toggles flight (Minecraft rules: Space rises, Shift descends, sprint doubles
  the speed to ~22 blocks/s, landing ends flight, switching off mid-air gives normal fall damage); quick taps are latched
  so they are not lost between slow frames; disaster wind only buffets a flying observer; `?fly=1` starts airborne.
- **Performance tooling** - `PerfMonitor` (frame/JS/GPU timing via `EXT_disjoint_timer_query`, draw calls,
  memory, long tasks, entity counters, network bytes, load time) shown on `F3` and in the admin panel;
  `scripts/bench.mjs`, `scripts/cdp.mjs`, `scripts/test-unit.mjs`, `scripts/test-disasters.mjs`,
  `scripts/mp-test.mjs`.
- Static low-detail meshes (`buildStaticLOD`) for NPCs and animals beyond 28-32 blocks: one draw call per entity
  instead of ~8-9 (busy town scene draw calls -54%).
- Shared storm-sky override (`Effects.setEnvironment({skyColor, skyMix, cloudAlpha})` applied by `Sky.applyOverride`)
  used by the tornado and flood; magma emits light 13 and burns players (NPCs path around it and walk off it).

### Changed / optimized
- Chunk pipeline: packed vertex attributes, 16-bit indices, cheaper lighting seeds, exact worldgen shortcuts,
  AABB frustum culling per chunk (-31% geometry memory, faster load, about half the streaming JS while walking).
- Relighting after disaster edits is coalesced per chunk and only marks neighbours whose border light actually
  changed; remesh work is budgeted per frame.
- NPC shouts are globally throttled (one per 3 s, no repeated line within 20 s); name-tag and debris shader
  programs are pre-compiled at load; debris keeps an ambient light floor and re-samples light every 0.2 s.
- Disaster relighting uses a time-based per-frame budget that catches up faster once the event is over.

### Fixed
- Shops, saloon, general store and hotel had their goods shelves/bookshelves placed IN the back wall, so the
  outside of those buildings showed bookshelf textures. Shelves now stand inside against an intact wall.
- Deputies no longer stack on one work spot; horses no longer spawn on stable roofs.
- Player collision floating-point drift (getting blocked by floor blocks when leaving buildings).
- Found by verification: after a disaster reset, player edits on formerly damaged cells were dropped from the save
  for the rest of the session (the exclusion set was never cleared); now cleared on restore and covered by
  `test-disasters.mjs`.

### Measured (independent verification run, `bench/verify_*.json`)
Machine load during the run was 10-18 on 4 cores (other agents), so absolute numbers are 2-3x worse than the
quiet-machine baseline taken earlier; the fair comparison is the same-load A/B below, where the pre-disaster tree
(`aacb7652`, first commit with `perf.js`) and HEAD were alternated under identical load.

| same-load A/B (30 s, 2 rounds) | before: spawn | after: spawn | before: town | after: town |
| --- | --- | --- | --- | --- |
| load time (in-page) | 3067 / 1781 ms | 1272 / 1307 ms | 2663 / 1266 ms | 1204 / 1193 ms |
| fps (SwiftShader) | 4.78 / 4.56 | 5.76 / 6.32 | 3.94 / 3.77 | 4.68 / 4.28 |
| heap avg | 114.0 / 116.8 MB | 108.1 / 107.6 MB | 95.9 / 95.8 MB | 90.5 / 90.0 MB |
| draw calls | 257 / 258 | 90 / 90 | 256 / 256 | 145 / 145 |
| long tasks per 30 s | 3 / 8 | 5 / 5 | 6 / 5 | 9 / 8 |
| steady-state JS avg / p95 (town, after t=5 s) | 3.78 / 6.4 and 6.12 / 11.3 ms | | 4.63 / 6.7 and 5.44 / 5.2 ms | |

Verdict: no regression in load time, memory or steady-state JS; draw calls 2.8x / 1.8x lower, fps higher.

| scenario (30 s; beam 45 s), load 12-18 | fps | js avg / p95 ms | draw calls avg (max) | tris | heap avg MB | long tasks | particles / debris max | exceptions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spawn overlook | 5.4 | 2.2 / 4.9 | 90 (92) | 155k | 108 | 6 | 144 / 0 | 0 |
| town centre | 4.3 | 4.8 / 15.9 | 145 (156) | 192k | 92 | 8 | 220 / 0 | 0 |
| town, walking | 3.4 | 17.3 / 31.0 | 120 (178) | 194k | 102 | 7 | 179 / 0 | 0 |
| town + tornado | 3.6 | 46.6 / 98.0 | 153 (173) | 203k | 100 | 14 | 434 / 105 | 0 |
| town + tsunami | 3.4 | 40.3 / 73.9 | 165 (212) | 199k | 105 | 15 | 372 / 600 (cap) | 0 |
| town + orbital beam | 3.3 | 22.5 / 37.3 | 144 (163) | 203k | 98 | 9 | 299 / 600 (cap) | 0 |

Final pass on the finished code with the machine quiet (load 3-4, `bench/final_*.json`), same scenarios:

| scenario | fps | js avg / p95 / max ms | draw calls avg (max) | heap avg (max) MB | long tasks | particles / debris max | exceptions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| spawn overlook (baseline: 11.2 fps, js 5.98 / 17.1, 115 MB, ~257 draw calls) | 15.2 | 1.7 / 4.9 / 874 (load) | 90 (92) | 109 (115) | 5 | 152 / 0 | 0 |
| town centre (baseline: 10.1 fps, js 6.95 / 24.6, 96 MB, ~256 draw calls) | 12.6 | 3.2 / 13.7 / 359 | 144 (156) | 93 (100) | 6 | 279 / 0 | 0 |
| town, walking | 11.4 | 4.5 / 16.6 / 349 | 104 (180) | 107 (124) | 6 | 231 / 0 | 0 |
| town + tornado | 10.1 | 12.0 / 48.0 / 376 | 150 (173) | 112 (143) | 9 | 574 / 155 | 0 |
| town + tsunami | 8.6 | 21.0 / 50.3 / 386 | 152 (176) | 117 (151) | 8 | 391 / 552 | 0 |
| town + orbital beam (45 s) | 10.4 | 6.5 / 24.3 / 382 | 135 (169) | 100 (111) | 8 | 433 / 600 (cap) | 0 |

Against the pre-change baseline (same machine class, quiet): lower JS time, lower memory, 1.8-2.8x fewer draw calls and
higher fps in both baseline scenarios; disasters add 3-18 ms of JS per frame in this software-GL VM (relight/remesh
of touched chunks), with zero exceptions in every run.

Disaster JS time is dominated by the shared relight/remesh pipeline running at its per-frame budgets (a SwiftShader
relight costs ~10x a real machine's); the disasters' own `simulate`/`render` code measures 0.05-0.3 ms per tick/frame.
Each disaster start shows one 650-800 ms frame in this VM (material compilation + first relight burst).

Correctness (same run): build + 4/4 unit tests; 39/39 lifecycle checks (preview isolation, pause, deterministic
replay hash, complete restore to the pristine hash `a1f4d590`, save isolation) for all three disasters; 8/8
multiplayer checks with 3 clients incl. a late joiner (idle traffic 1.45 KB/s in, 0.01 KB/s out per client, tick
skew <= 1); identical journal hashes across two independent browser pages per disaster (seed 11, tick 300:
tsunami `0a49d87c:46894`, tornado `fcb6e0cf:84`, beam `06d55efa:122`); `?admin=0` refuses every command and hides
the panel; 0 exceptions and 0 console errors across 23 page sessions.

### Review rounds
Independent critics reviewed each disaster on the integrated build. Round 1: beam ACCEPT WITH NITS (station
pop-in, dim night glow, roar restart on cancel - all fixed), tornado REJECT (interiors gutted while facades stood,
sunny sky above the funnel, smooth cone), tsunami REJECT (smooth translucent crest with a dry street under it,
NPCs standing on the street bottom under water). Round 2 reworked both (see Added) and re-reviewed them: tornado
ACCEPT WITH NITS by day but REJECT at night (black screen, invisible funnel), tsunami ACCEPT WITH NITS with the
crest hidden from porches and swimmers' heads in ceilings still open. Round 3 fixed those (night floor + lightning,
enclosed-room test + per-column fade, ceiling clamp + open-sky escape, body-height animal water test); the tornado
re-check is ACCEPT WITH NITS including night storms (remaining nits: speckled rather than peeled roofs, glass rarely
breaks, faint vanilla-cloud squares through the deck during a flash) and the tsunami re-check is ACCEPT (remaining
nits: a 1-2 s "inside the wave" tint before the real water reaches the player, a pale lip band when the eye sits in
the hump, three pasture animals beyond the fog still under the surface, and the 68-77 s budgeted restore at 4 fps).
Beam: ACCEPT WITH NITS, all nits fixed in the same round.

### Known imperfections
- The default 110-block flood is paced by the manager's edit budget: the front runs at ~80-90% of the nominal
  speed across the widest part of the disc and the drain takes ~40 s, so the whole event lasts ~105 s.
- With outside-in exposure the tornado finds more valid targets and uses its full rip budget (about 2.5x the
  block damage of the first version over the same path); lower `intensity` or `damage` for a gentler storm.
- Frame times in this build VM are dominated by SwiftShader; disaster carving/flooding windows are bounded by the
  manager's relight/remesh budgets (3 relights + ~10 remeshes per frame) rather than by the disaster code itself.
- Buildings sliced by the beam crater or the tornado leave floating voxel fragments (expected voxel behaviour).
- NPCs and animals are client-side ambience: their reactions are deterministic per client but are not
  synchronized between players; only players, block edits and disasters are authoritative.
- Heat shimmer is a distorted noise sleeve rather than a post-process; the tornado funnel is a layered shader
  mesh rather than volumetric.
- Debris spawned from a chunk that has not been relit yet is seeded sky-lit and may read too bright for a frame.
