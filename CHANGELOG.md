# Changelog

All measurements below come from `node scripts/bench.mjs` (headless Chrome with SwiftShader software GL in the
build VM, 4 shared cores: FPS/GPU numbers are far below a real GPU; the comparable metrics are JS ms per frame,
long tasks, memory, draw calls, triangles, entity counts and load time). Reports live in `bench/*.json`.

## Unreleased - natural disasters, administrator panel, multiplayer, eyes, optimization

### How to reproduce each disaster
Open the game, press `F4` (or `` ` ``), pick a tab, set a seed, press **Preview** then **Start** and confirm.
Equivalent console commands (same seed => identical destruction, verified by `node scripts/test-disasters.mjs`):

```js
game.disasters.command({type:'start', disaster:'tsunami', seed:7, params:{waterHeight:5, waveHeight:4, direction:'west', speed:6, duration:60, damage:0.5, intensity:0.7, center:[0,0], radius:110}})
game.disasters.command({type:'start', disaster:'tornado', seed:7, params:{start:[-70,20], heading:75, speed:4, wander:0.35, radius:9, duration:75, intensity:0.8}})
game.disasters.command({type:'start', disaster:'beam',    seed:7, params:{target:[0,0], beamRadius:5, chargeTime:10, strength:0.7, destructionRadius:18, duration:18, intensity:0.7}})
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
- **Tsunami & flood** (`src/disasters/tsunami.js`, `tsunami/`) - deterministic wave front with a crest mesh,
  foam and spray, real water blocks rising column by column behind the front (buoyancy, swimming and currents use
  the normal water physics), gradual structural damage by material with floating debris, receding phase that
  drains the streets, silt/damage left behind, ambient roar loop, NPC evacuation to upper floors / swimming with
  calls for help, animals panicking; preview shows the flooded extent.
- **Tornado** (`src/disasters/tornado.js`, `tornado/`) - seeded travelling path with wobble, layered rotating
  funnel (scrolling noise shader) connected to a cloud deck, dust skirt, orbiting debris ring, storm lighting,
  wind field applied to players/NPCs/animals/debris by mass and distance with speed caps, church bell + shouts,
  gradual material-aware destruction along the path, rope-out ending, preview ribbon + radius.
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
- **Performance tooling** - `PerfMonitor` (frame/JS/GPU timing via `EXT_disjoint_timer_query`, draw calls,
  memory, long tasks, entity counters, network bytes, load time) shown on `F3` and in the admin panel;
  `scripts/bench.mjs`, `scripts/cdp.mjs`, `scripts/test-unit.mjs`, `scripts/test-disasters.mjs`,
  `scripts/mp-test.mjs`.
- Static low-detail meshes (`buildStaticLOD`) for NPCs and animals beyond 28-32 blocks: one draw call per entity
  instead of ~8-9 (busy town scene draw calls -54%).

### Changed / optimized
- Chunk pipeline: packed vertex attributes, 16-bit indices, cheaper lighting seeds, exact worldgen shortcuts,
  AABB frustum culling per chunk (-31% geometry memory, faster load, about half the streaming JS while walking).
- Relighting after disaster edits is coalesced per chunk and only marks neighbours whose border light actually
  changed; remesh work is budgeted per frame.
- NPC shouts are globally throttled; name-tag and debris shader programs are pre-compiled at load.

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

Disaster JS time is dominated by the shared relight/remesh pipeline running at its per-frame budgets (a SwiftShader
relight costs ~10x a real machine's); the disasters' own `simulate`/`render` code measures 0.05-0.3 ms per tick/frame.
Each disaster start shows one 650-800 ms frame in this VM (material compilation + first relight burst).

Correctness (same run): build + 4/4 unit tests; 39/39 lifecycle checks (preview isolation, pause, deterministic
replay hash, complete restore to the pristine hash `a1f4d590`, save isolation) for all three disasters; 8/8
multiplayer checks with 3 clients incl. a late joiner (idle traffic 1.45 KB/s in, 0.01 KB/s out per client, tick
skew <= 1); identical journal hashes across two independent browser pages per disaster (seed 11, tick 300:
tsunami `0a49d87c:46894`, tornado `fcb6e0cf:84`, beam `06d55efa:122`); `?admin=0` refuses every command and hides
the panel; 0 exceptions and 0 console errors across 23 page sessions.

### Known imperfections
- Frame times in this build VM are dominated by SwiftShader; disaster carving/flooding windows are bounded by the
  manager's relight/remesh budgets (3 relights + ~10 remeshes per frame) rather than by the disaster code itself.
- Buildings sliced by the beam crater or the tornado leave floating voxel fragments (expected voxel behaviour).
- NPCs and animals are client-side ambience: their reactions are deterministic per client but are not
  synchronized between players; only players, block edits and disasters are authoritative.
- Heat shimmer is a distorted noise sleeve rather than a post-process; the tornado funnel is a layered shader
  mesh rather than volumetric.
- Debris spawned from a chunk that has not been relit yet is seeded sky-lit and may read too bright for a frame.
