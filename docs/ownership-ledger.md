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
