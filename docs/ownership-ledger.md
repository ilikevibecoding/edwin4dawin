# Task & Ownership Ledger — Northstar Rescue

**Rule:** no two agents edit the same file concurrently. If you need a change in a file you
do not own, request it from the owner (or from Opus 1, the lead) rather than editing it.

Shared entry points (`src/main.js`, `src/game.js`, `index.html`, `package.json`,
`playwright.config.js`, `progress.md`, this ledger) are **Opus 1 only**.

---

## Agent roster and file ownership

| Agent | Role | Owned paths |
| --- | --- | --- |
| **Opus 1** | Lead architect & integrator | `src/main.js`, `src/game.js`, `src/core/**`, `src/physics/**`, `index.html`, `vite.config.js`, `package.json`, `playwright.config.js`, `docs/**`, `progress.md`, `README.md` |
| **Opus 2** | Player & combat systems | `src/player/**`, `src/weapons/**` |
| **Opus 3** | AI, objectives, round systems | `src/ai/**`, `src/mission/**` |
| **Opus 4** | Testing, performance, tools, release quality | `tests/**`, `tools/**`, `src/qa/**` |
| **Fable 1** | Art direction, visual bible, interface | `src/art/palette.js`, `src/ui/**`, `docs/visual-bible.md` |
| **Fable 2** | Map architecture & environmental composition | `src/map/**` |
| **Fable 3** | Props, materials, decals, environmental storytelling | `src/art/materials.js`, `src/art/texgen.js`, `src/art/noise.js`, `src/props/**`, `src/fx/decals.js` |
| **Fable 4** | Characters, weapons art, animation, effects | `src/characters/**`, `src/fx/effects.js`, `src/fx/weather.js`, `src/fx/postfx.js`, `src/audio/**` |

Shared read-only contracts every agent depends on:

- `src/core/events.js` — the `EVT` catalogue and the global `bus`.
- `src/core/assets.js` — `assets.register()` / `assets.tag()`.
- `src/core/settings.js` — `settings` + `QUALITY_PRESETS`.
- `src/map/layout.js` — room rectangles, checkpoints, spawn data (Fable 2 owns edits).
- `src/physics/world.js` — `CollisionWorld`, `SURFACE`, `SURFACE_PROPS`.

---

## Interface contracts (fixed by Opus 1; do not change signatures without asking)

```
LevelBuild(collision).build()        -> { group, doorSpecs:Map, glassPanes[], stats }
DoorSystem(collision, scene)         -> .createFromSpecs(map) .update(dt) .get(id) .nearest(pos,r)
                                        .reset() .toJSON(pos, maxDist)
LightingRig(scene, engine)           -> .update(dt, camPos) .setScenario(name) .specs[]
PropPopulator(scene, collision, lvl) -> .populate() .reset() .findInteractable(eye,dir,pos)
                                        .interactablesNear(pos, r) -> []
NavGrid(collision)                   -> .build() .findPath(from,to) .isWalkable(v)
                                        .nearestWalkable(v) .randomPointNear(v, r)
WeaponSystem(game)                   -> .update(dt, playing) .reset(loadout) .toJSON()
                                        .adsFactor .current .fire() .reload() .select(slot)
ViewModel(game)                      -> .update(dt) .reset() .onFire() .onReload(kind)
CombatSystem(game)                   -> .update(dt, playing) .reset() .hasKeycard
                                        .traceShot(origin, dir, weapon)
EnemyManager(game)                   -> .update(dt) .updateVisual(dt) .reset(difficulty)
                                        .toJSON(eye, forward) .spawnAt(pos, variant) .list
HostageManager(game)                 -> .update(dt) .updateVisual(dt) .reset() .toJSON(pos)
                                        .findInteractable(eye, dir) .list
MissionDirector(game)                -> .update(dt) .reset(difficulty) .toJSON() .outcome
                                        .findInteractable(...) .interactablesNear(pos,r)
EffectsSystem(game)                  -> .update(dt) .reset() .spawnImpact(...) .muzzleFlash(...)
DecalSystem(game)                    -> .update(dt) .reset() .add(point, normal, kind, size)
AudioEngine()                        -> .resume() .play(name, opts) .playDoor(res, door) ...
UIManager(game)                      -> .mount() .update(dt) .onStateChange(...) .hudState()
                                        .setLoadProgress(p, task) .onLevelReady() .resetHud()
QAMode(game)                         -> .update(dt) .aiFrozen .api (window.__NORTHSTAR_QA__)
AssetGallery(game)                   -> .open() .close() .visible
Weather(game)                        -> .update(dt, camPos)
PostFX(game)                         -> .update(dt)
```

---

## Work log

| # | Task | Owner | Status |
| --- | --- | --- | --- |
| T01 | Stack selection, repo layout, engine, fixed-step loop, resize, pointer lock, fullscreen | Opus 1 | done |
| T02 | Collision world, capsule sweep, slab raycast, surface table | Opus 1 | done |
| T03 | Procedural PBR texture factory + 19 material families | Fable 3 | done |
| T04 | Colour script, shape language, lighting zones | Fable 1 | done |
| T05 | Modular architecture kit (walls, frames, ceiling grid, stairs, rails, ducts) | Fable 2 | done |
| T06 | Northstar Administrative Center floor plan (26 rooms, 2 storeys) | Fable 2 | done |
| T07 | Wall derivation, slabs, glazing, roofs, collision emission | Fable 2 | done |
| T08 | Doors: geometry, hardware, swing, collision, locks, signage | Fable 2 | done |
| T09 | Lighting rig: sun, sky, fog, fixtures, light culling, scenarios | Fable 1 | done |
| T10 | First-person controller: movement, crouch, jump, camera feel, damage | Opus 2 | done |
| T11 | Architecture asset manifest registration | Fable 2 | done |
| T12 | Prop library + populator + prop manifest | Fable 3 | done |
| T13 | Navigation grid + A* + recovery | Opus 3 | done |
| T14 | Weapon definitions, weapon system, ammo, recoil, spread | Opus 2 | done |
| T15 | Combat: hit traces, penetration, damage, armour, hitmarkers | Opus 2 | done |
| T16 | First-person arms + weapon view models + animation | Fable 4 | done |
| T17 | Enemy characters, rigs, animation | Fable 4 | done |
| T18 | Enemy AI: perception, patrol, investigate, combat, cover, search | Opus 3 | done |
| T19 | Hostages: behaviour, follow, secure, extraction | Opus 3 | done |
| T20 | Mission director: objectives, timer, difficulty, victory/defeat, reset | Opus 3 | done |
| T21 | VFX: muzzle, impacts, smoke, glass, casings, blood | Fable 4 | done |
| T22 | Decals: impacts, wear, footprints, blood | Fable 3 | done |
| T23 | Weather: snow, breath vapour, storm | Fable 4 | done |
| T24 | Post-processing: bloom, vignette, grade, AA | Fable 4 | done |
| T25 | Procedural audio engine + full sound set | Fable 4 | done |
| T26 | UI: title, menus, briefing, loadout, loading, HUD, end cards | Fable 1 | done |
| T27 | QA mode, asset gallery, debug overlays | Opus 4 | done |
| T28 | Playwright harness, scenario matrix, screenshot capture | Opus 4 | done |
| T29 | Full-game audit passes 1-4 | all | done |
| T30 | Regression matrix and final validation | Opus 4 | done |

---

## Integration round 2 — defects found by playing the built game

| # | Defect | Found by | Owner | Status |
| --- | --- | --- | --- | --- |
| D01 | The player could not move at all: `moveCapsule` resolves against a copy and the controller never wrote it back | lead, physics probe | Opus 1 | fixed |
| D02 | W/S inverted relative to the look direction | lead, direction sweep | Opus 2 | fixed |
| D03 | The game auto-paused on start under automation: a *refused* pointer lock was reported as *losing* one | lead | Opus 1 | fixed |
| D04 | The mezzanine was unreachable — no stair-head slabs, decks on top of the upper floor, no landings | Opus 3 | Fable 2 | fixed at source |
| D05 | Tall ground walls ran through the storey above and sealed the mezzanine openings | Opus 3 | Fable 2 | fixed |
| D06 | **Every aperture in a north–south wall was cut at the mirror of its doorway** | Opus 3 + Opus 4 independently | Fable 2 | fixed |
| D07 | 8 400 draw calls per frame | lead | Opus 1 | fixed (→ ~870) |
| D08 | The first-person weapon filled the centre of the screen as an unlit black silhouette | lead, screenshot review | Fable 4 | fixed |
| D09 | Characters cost ~390 draw calls (≈100 sub-meshes each) | lead, draw-call attribution | Fable 4 | fixed (≈7.5/char) |
| D10 | The acoustic ceiling read as green-brown camouflage | lead, screenshot review | Fable 3 | fixed |
| D11 | Cubicle fabric read as a high-contrast gingham mesh | lead, screenshot review | Fable 3 | fixed |
| D12 | Carpet read as near-black | lead, luminance sweep | Fable 3 | fixed |
| D13 | Wood veneer read as orange-and-black tiger stripe | Fable 1 consistency review | Fable 3 | fixed |
| D14 | The announcer was drawn through the objective list and timer; objectives clipped | lead, screenshot review | Fable 1 | fixed |
| D15 | The records archive rendered at 7/255 — unfightable | Fable 1 luminance sweep | Fable 1 / Fable 2 | fixed (→ 56) |
| D16 | Light culling scored priority over distance, so a room's own fixtures lost to distant accents | lead | Fable 1 | fixed |
| D17 | A hostile alerted itself with its own gunfire; the garrison went loud on the first shot | Opus 4 | Opus 3 | fixed |
| D18 | One gunshot heard by six guards counted as six alerts | Opus 3 | Opus 3 | fixed |
| D19 | Server-rack status LEDs never rendered (world-metre UVs sampled a corner of the face texture) | Fable 3 | Fable 3 | fixed |
| D20 | Seven quality-preset knobs never reached the renderer when quality changed mid-session | Opus 4 | Opus 1 | fixed |
| D21 | Ducts, pipes, cable trays, floor drains, access panels, the loading dock, half walls and atrium columns were specified but never built | lead, manifest audit | Fable 2 | fixed |
| D22 | `advanceTime(1000)` silently simulated 100 ms | Opus 4 | Opus 1 | fixed |
| D23 | The loading screen never completed (pending-start timer on a paused system) | Opus 4 | Opus 1 | fixed |
| D24 | Snow particles and a scrim plane sat inside the playable volume and were counted as surfaces | Opus 4 | Fable 4 | fixed |
| D25 | Enemies held a fully-extended aim pose while repositioning | Fable 4 | Opus 3 | fixed |
