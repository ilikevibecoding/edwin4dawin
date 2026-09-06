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

## Pass 2 — the overhaul spec (`docs/overhaul/SPEC.md`)

Wave 1 gave the city its scale, purposes, crowd, ships, train, towers, lower city and view distance. Pass 2 turns the
spec's systems sections into play: persistent people with thirty lines each, a named cast, a real economy with
physical shipments, building programs with dossiers and scores, a Senate that sits, factions, and surprises. Same
rules as wave 1: exclusive files, one headless Chrome per builder, a test per workstream, `npm test` green, nothing
pushed by builders (the integrator merges).

| # | Workstream | Spec | Owner | Files (exclusive unless noted) |
| --- | --- | --- | --- | --- |
| P1 | Thirty lines per persistent NPC, the 13-anchor cast, speech + subtitles | 11, 12, 13 | P1 | `src/npc/dialog/**`, `src/npc/cast/**` (new), `src/npc/coruscant/talk.js`, `src/npc/coruscant/bubbles.js`, `src/npc/coruscant/index.js` (cast registration + persistent staff only), `src/ui/adminPanel.js` (a "Dialogue" section only), `scripts/test-dialog.mjs`, `scripts/test-cast.mjs` |
| P2 | Economy v2: goods chains, business inventories, atomic transfers, price rule, ledger, physical shipments, visible state | 10 | P2 | `src/economy/**`, `src/coruscant/purposes.js` (supplies/consumes fields), `src/ui/shop.*`, `src/hud.js` (economy toasts), `src/ui/adminPanel.js` (an "Economy" section only), `scripts/test-economy.mjs`, `scripts/sim-economy.mjs` |
| P3 | Twenty building programs, dossiers, four-differences rule, building rubric scorer | 6, 7, 17 | P3 | `src/coruscant/programs/**` (new), `src/coruscant/rooms/**`, `src/coruscant/buildings.js` (program dispatch), `src/coruscant/landmarks/*` except `senate.js`, `scripts/dossiers.mjs`, `scripts/room-similarity.mjs`, `scripts/score-buildings.mjs`, `scripts/programs/*.mjs`, `docs/overhaul/scores/**`, `docs/overhaul/dossiers/**` |
| P4 | Senate centrepiece: chamber volume, 12 playable delegation suites, sessions, 3 policy scenarios, Jedi liaisons, two routes | 8 | P4 | `src/coruscant/landmarks/senate.js`, `src/senate/**` (new), `src/ui/senate.*` (new), `scripts/test-senate.mjs` |
| P5 | Factions, reputation/suspicion/warrants, information spread; eight stateful surprises | 14, 15 | P5 (after P1/P2 land) | `src/factions/**` (new), `src/events/**` (new; the surprise state machines), `scripts/test-factions.mjs`, `scripts/test-surprises.mjs` |
| P6 | Crowd appearance from `composeAppearance` (2x atlas cells, species with head geometry, emissive droid lights), cast models | 11 | P6 (after W4 merge) | `src/npc/coruscant/crowd.js`, `src/npc/skins-sw.js`, `src/npc/appearance/**` |
| — | Gauntlet + acceptance runs (§18, §19): three world assessments, held-out 25%, failure log | 18, 19 | independent verifiers after P1-P6 | `docs/overhaul/gauntlet.md`, `docs/overhaul/failure_log.md`, `docs/overhaul/acceptance/**` |

### Pass-2 shared contracts (integrator, on the branch before the builders start)

- **Event bus** — `game.events` (`src/events.js`): `on(name, fn) -> off`, `once`, `emit(name, ...args)`, `recent(prefix)`.
  Names are `<system>:<event>`. Systems never import each other's modules to react; they subscribe. Reserved names:
  `economy:transfer {from, to, good, qty, credits, reason}`, `economy:stock {business, good, qty, target}`,
  `economy:shipment {id, state, from, to, goods}`, `senate:session {state, scenario}`, `senate:vote {scenario, tally}`,
  `senate:result {scenario, outcome, effects}`, `npc:trade`, `npc:talk {npc, lineId}`, `faction:reputation {faction, delta, cause}`,
  `event:<id> {state}` for surprises. Everything emitted must reflect real state - a listener may read `game.economy`,
  `game.senate`, `game.factions` for the details.
- **Economy read API** (P2 keeps these stable; P1/P3/P5 read them): `game.economy.business(lotId)` ->
  `{ id, name, kind, stock: Map(good -> qty), target: Map, funds, hours, suppliers: [lotId], customers: [lotId], open(hour) }`;
  `game.economy.quote(lotId, good) -> { buy, sell, stock, factor }` (price rule: base x clamp(target/stock, 0.75, 1.75) +
  bounded disruption); `game.economy.shipments()` -> live shipment records with a physical position (a crate stack, a
  hold, a courier); `game.economy.ledger.sources / sinks` (imports, exports, public funds, wages, consumption, maintenance,
  disposal). Transfers are atomic (`transfer(t)` returns `true` or a reason string, never partial).
- **Dialog API** (P1): `game.dialog.lineFor(npc, ctx)` selects by eligibility from the NPC's own bank; every line
  `{ id, speaker, text, delivery, trigger, priority, cooldown, refs, audio }`; `game.dialog.say(npc, line)` shows the
  subtitle, speaks through Web Speech where a voice exists, otherwise records the line in the unvoiced manifest.
  State refs read `game.economy`, `game.senate`, `game.factions`, `game.events.recent()` and never invent facts.
- **Cast API** (P1): `game.cast.get(id)` for the 13 anchors (`vela_marr`, `brin_tal`, `tessa_venn`, `d4lt`, `seli_noor`,
  `nera_vos`, `ilen_rook`, `asha_merin`, `seran_vale`, `tavi_renn`, `koro_den`, `mira_sol`, `ral_drenn`): identity,
  home/work lot ids, schedule, relationships, disposition, interaction history (persisted in the save under `cast`).
  Cast members are full NPC models (W9 `composeAppearance` + `buildAppearanceModel`), never crowd instances.
- **Senate API** (P4): `game.senate.state` (`recess | convening | session | vote | adjourned`), `schedule` (in game hours),
  `scenarios[3]` with delegation positions, `delegations[12]` with suite lot/room ids, `vote()` tally, `effects` applied
  through events only (P2/P5 subscribe); `liaisonSpot()` for the Jedi liaison.
- **Programs API** (P3): `programFor(lot, purpose)` -> `{ id, name, address, owner, purpose, staff, customers,
  circulation, roomGraph, materials, interactions, inputs, outputs }`; `scripts/score-buildings.mjs` scores every
  manifested playable building 0-5 in the ten weighted categories of §17 and writes `docs/overhaul/scores/`.
- **Budget** — per workstream at the Senate view, Light preset, rd 10: <= +4 ms JS, <= +20 draw calls, <= +40 MB heap.
- **Save** — new persistent state goes under its own key (`economy`, `cast`, `senate`, `factions`, `events`) with
  defaults, so old saves load; nothing writes to another system's key.
