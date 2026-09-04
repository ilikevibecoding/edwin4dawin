# Changelog

All measurements below come from `node scripts/bench.mjs` (headless Chrome with SwiftShader software GL in the
build VM: FPS/GPU numbers are far below a real GPU; the comparable metrics are JS ms per frame, long tasks,
memory, draw calls, triangles, entity counts and load time). Reports live in `bench/*.json`.

## Unreleased - disasters, multiplayer, eyes, optimization

### Baseline (before this round)
| scenario | load (in-page) | js avg / p95 / max ms | draw calls | heap MB | long tasks | entities |
| --- | --- | --- | --- | --- | --- | --- |
| spawn overlook | 1.13 s | 5.98 / 17.1 / 226.9 | (not measured*) | 115 | 3 (459 ms, incl. load burst) | 39 NPCs, 43 animals, <=168 particles |
| town center | 0.79 s | 6.95 / 24.6 / 217.4 | (not measured*) | 96 | 4 (702 ms) | 39 NPCs, 43 animals, <=290 particles |

`*` the first baseline reported draw calls of the hand pass only (Three resets `renderer.info` per render call);
fixed in `PerfMonitor.beginFrame` (autoReset off + manual reset). The town-center view after the fix: ~256 draw calls, ~198k triangles.

### Added
- `src/perf.js` PerfMonitor (frame/JS/GPU timing via EXT_disjoint_timer_query, draw calls, memory, long tasks,
  entity counters, network bytes, load time) shown on F3; `scripts/bench.mjs` (headless benchmark with scripted
  steps), `scripts/cdp.mjs` (Chrome DevTools helper), `scripts/test-unit.mjs`, `scripts/test-disasters.mjs`
  (lifecycle, preview isolation, pause, deterministic replay hash, full restore for every registered disaster).
- Disaster foundation: `DisasterManager` (command driven: preview/start/pause/resume/stop/set/reset/replay, seeded
  determinism, 20 TPS simulation, per-tick edit budget, `pauseAtTick` testing aid, authority hooks for a network
  client), `BlockJournal` (first-touch originals, batched newest-first restore, order-independent hash),
  instanced pooled `DebrisSystem` (one draw call, gravity/collision/buoyancy/force field, speed clamps),
  `Effects` (camera shake, lighting/fog overrides, flashes), bulk world edits (`World.setBlockRaw` +
  `relightChunk`, budgeted `Terrain.remeshDirty`), new blocks (scorched stone, ash, magma, charred planks).
- NPC/animal reaction API: `alert()`, `clearAlert()`, `applyImpulse()`, `eachNear()`; panic evacuation to upper
  floors / away from the threat, swimming and drifting in flood water with calls for help, airborne tumbling
  and stun on landing, panicking livestock.
- `Permissions` (single player = owner/admin unless `?admin=0`; online admin only via server token) and
  `SaveManager` (player edits persist to localStorage; disaster damage is journaled separately and never saved
  unless an administrator commits it).
- Player `addForce`/`impulse`, shared `uFlash` uniform for lighting flashes.

### Fixed
- Shops, saloon, general store and hotel had their goods shelves/bookshelves placed IN the back wall, so the
  outside of those buildings showed bookshelf textures. Shelves now stand inside against an intact wall
  (counter / keeper walkway / shelf / wall).

### In progress (builder branches, merged only after review)
- Tsunami & flood, Tornado, Orbital Beam disasters; admin control panel; multiplayer server/client; NPC/animal
  eyes + blinking; streaming/mesh optimizations.
