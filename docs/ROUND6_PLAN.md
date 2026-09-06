# Round 6 — From skeleton to a living city

The user's brief (verbatim themes): the scale of Coruscant is right; now every building needs a specific purpose and
a sign you read as you walk in; hundreds of NPCs with ~20 voice lines each, working in the buildings and on the ships;
rooms that are used for something specific; a well-thought-out economy in Star Wars credits (how money is earned, what
it buys, ships you can purchase); at least 30 far more detailed ships in the sky with a 20-point quality rubric each,
low Star Wars engine hums instead of "hummingbirds", landing animations (the shuttle's wings fold), interiors you enter
with right-click and ride in; a cleaner, futuristic, shader-lit space train; skyscraper crowns in the Star Wars idiom
(reference images: 500-Republica-style tiered spires with lit vertical strips, a tower with a glowing blue spine and
cantilevered landing decks, Zakuul needle spires); view distance 32; a creative/survival toggle; a much bigger spaceport
with its own train station; a bigger map. The Death Star is out of scope this round.

Rubrics (acceptance criteria per workstream, each signed off by an independent critic and measured):

| # | Rubric | Owner | Files (exclusive unless noted) |
| --- | --- | --- | --- |
| 07 | `07_city_life.md` — building purposes, entrance signs, room functions, NPC population and dialog | W4 (NPCs), W5 (purposes/signs) | W4: `src/npc/coruscant/**`, `src/npc/dialog/**`, `src/npc/skins-sw.js`, `src/coruscant/city.js` (population hook only); W5: `src/coruscant/purposes.js` (catalogue; skeleton by the integrator), `src/coruscant/signs.js`, `src/economy/**`, `src/ui/shop.*`, `src/hud.js` (wallet + toast) |
| 08 | `08_economy.md` — credits, earning, spending, vendors, ship purchase | W5 | as above + `src/save.js` (wallet/inventory fields), `src/player.js` (credits field) |
| 09 | `09_ships.md` — 20-point ship quality rubric, ≥ 30 ships, hums, landing animation, interiors, boarding | W2 | `src/ships/**`, `src/vehicles/ship.js` (new), `scripts/test-ships.mjs` |
| 10 | `10_train_v2.md` — futuristic train, emissive strips, interior, hum | W3 | `src/vehicles/train.js`, `src/vehicles/trainAudio.js`, `src/vehicles/voxelMesh.js` (emissive attribute), `src/structures/stations.js` (platform dressing only) |
| 11 | `11_towers_v2.md` — Star Wars skyscraper crowns and new tower families | W1 | `src/coruscant/towers/**`, `src/coruscant/crowns.js` (new), `scripts/test-coruscant-towers.mjs` |
| 12 | `12_spaceport_v2.md` — spaceport ×4, dedicated train station, map growth | W6 | `src/coruscant/spaceport.js`, `src/coruscant/layout.js` (SPACEPORT rect + plateau growth), `src/structures/stations.js` (Coruscant station only, coordinate with W3), `src/vehicles/route.js`, `src/structures/hyperlane.js`, `src/worldgen.js` (REGIONS.coruscant only) |
| 13 | `13_view_distance.md` — view distance up to 32 with a far-LOD layer | W7 | `src/render/farlod.js` (new), `src/terrain.js`, `src/quality.js`, `src/ui/adminPanel.js` (VIEW_DISTANCES only) |
| — | Creative / survival mode toggle | integrator (done first) | `src/game.js`, `src/player.js`, `src/ui/adminPanel.js`, `src/save.js` |

## Shared contracts (written by the integrator before the builders start)

- **Game mode** — `game.mode` is `'creative'` or `'survival'` (`game.setMode(m)`, persisted in the save, `?mode=` URL
  param, F4 panel toggle). Creative: flight allowed, no hunger drain, no damage, block placement does not consume
  items, blocks break instantly. Survival: no flight (unless `?fly=1` or the admin "watch" button granted it), hunger,
  damage, finite items. Builders read `game.mode` and never write it.
- **Vehicle use** — right-click on a vehicle within reach calls `vehicle.onUse(player, game, hit)` (`VehicleManager.
  raycast(origin, dir, maxDist)` tests vehicle world AABBs; the nearest hit closer than the block hit wins). Ships
  implement boarding there; the train ignores it.
- **Purposes** — `purposeFor(lot, layout)` in `src/coruscant/purposes.js` returns `{ id, category, kind, name, roles,
  sells, hours, greeting }` deterministically per lot (`lot.seed`). `roles` = `[{ job, count, rooms: [roomKinds] }]`
  is what the NPC planner staffs; `sells` is what the vendor UI offers; `name` goes on the sign. W5 extends the
  catalogue; W4 only reads it.
- **Room metadata** — every landmark/tower room record has `kind`, `x, y, z, w, d` and a `floor` box; spots/work/beds
  are pruned to standable cells. NPC planners pick targets inside `floor`.
- **Audio** — new engine sounds live in the owner's own module (`src/ships/audio.js`, `src/vehicles/trainAudio.js`)
  using `game.audio.ctx` / `game.audio.master`; `src/audio.js` is not edited by builders.
- **Performance budget** — no workstream may add more than 40 draw calls or 6 ms JS/frame at 10 chunks in the Senate
  view on the Light preset (`scripts/bench.mjs`; baseline `bench/r5b_coruscant_senate_light.json`: 141 draw calls,
  JS 2.7 ms, 467 MB). Instancing for ships and crowds is mandatory. Nothing touches the deterministic disaster core.
- **Tests** — every workstream ships or extends a headless test (`scripts/test-*.mjs`) that runs offline where
  possible; `npm test` must stay green; builders run their own suite plus `npm run test-unit` before reporting.

## Process

1. Integrator: mode toggle, vehicle use hook, purposes skeleton, rubrics — committed on the branch.
2. Wave 1 builders in worktrees off the branch: W1 towers, W2 ships, W3 train, W4 NPCs, W5 economy/signs.
3. Wave 2 (as slots free): W6 spaceport + map, W7 view distance.
4. Each builder reports with screenshots (CDP shots via `scripts/shots.mjs` or `/tmp/smoke.mjs`), test output and
   bench numbers; the integrator merges, re-runs the full suite, then launches critics per rubric and fix rounds.
5. CHANGELOG round-6 entry, rubric status tables, PR body, `dist/` rebuild, CDN link refresh.
