# Task & Ownership Ledger

Eight-agent responsibility map onto this repository. **Rule: one owner per
file.** Any cross-cutting change to shared entry points (`src/main.js`,
`index.html`, `package.json`, `src/core/events.js`) goes through Opus 1.
Subagents receive bounded work packages scoped to the file sets below and
must not touch files outside their package.

| Agent | Role | Owned paths |
| --- | --- | --- |
| **Opus 1** | Lead architect & integrator | `src/main.js`, `src/core/loop.js`, `src/core/events.js`, `src/core/rng.js`, `src/core/settings.js`, `src/assets/registry.js`, `index.html`, `vite.config.js`, `package.json`, `progress.md`, `docs/*`, `tools/*` |
| **Opus 2** | Player & combat | `src/player/player.js`, `src/player/weapons.js`, `src/core/input.js`, `src/world/collision.js` |
| **Opus 3** | AI, objectives & rounds | `src/ai/*` (`aimanager.js`, `enemy.js`, `hostage.js`, `navgrid.js`), `src/game/mission.js`, `src/game/difficulty.js` |
| **Opus 4** | Testing, performance, tools | `tests/*`, `playwright.config.js`, `src/core/testhooks.js`, `src/dev/qa.js`, `tools/screenshot-matrix.mjs` |
| **Fable 1** | Art director & interface | `src/ui/*`, `src/styles.css`, `docs/visual-bible.md`, UI/HUD graphics, consistency reviews |
| **Fable 2** | Map architecture & composition | `src/world/layout.js`, `src/world/mapbuilder.js`, `src/world/doors.js`, `src/world/glass.js`, `src/world/lighting.js`, `src/assets/archkit.js` |
| **Fable 3** | Props, materials, decals | `src/assets/materials.js`, `src/assets/textures.js`, `src/assets/props_*.js`, `src/assets/decals.js`, prop placement data |
| **Fable 4** | Characters, weapons, animation, FX | `src/assets/characters.js`, `src/assets/weapons_models.js`, `src/player/viewmodel.js`, `src/fx/fx.js`, `src/audio/audio.js` (sound design) |

## Shared interfaces (frozen; changes require Opus 1 sign-off)

- `Game` object on `window.NSR`: `.player .weapons .world .ai .mission .fx
  .audio .ui .lighting .loop .rng`, methods `hitscan`, `hitscanPenetrating`,
  `damageEntity`, `queryInteract`, `doInteract`, `spawnPickup`, `onDetonate`.
- Event bus topics (`src/core/events.js`): `weapon-fired`, `enemy-*`,
  `hostage-*`, `door-*`, `glass-break`, `footstep`, `impact`, `mission-*`,
  `objective-updated`, `settings-changed`, `subtitle`, `ui-*`.
- Character visual contract (used by `enemy.js`/`hostage.js`):
  `game.characters.buildEnemy(outfit, weaponId, id)` / `buildHostage(variant,
  id)` returning `{ group, setMoving(m, run), setCrouch(c), setAim(a),
  setState(s, fear), die(), update(dt) }`.
- Viewmodel contract: `game.viewmodel.render(dt)` reading `game.weapons`
  state; installed by Fable 4 without touching weapon logic.
- Material contract: `getMaterial(key)` and `roomMaterials(style)` from
  `src/assets/materials.js`; consumers never construct materials directly.
- Asset registration: every production asset calls `registerAsset()` in
  `src/assets/registry.js`; `npm run manifest` regenerates
  `docs/asset-manifest.md`. Unregistered production assets are a defect.

## Work-package log

| # | Package | Owner | Status |
| --- | --- | --- | --- |
| WP-01 | Engine foundation, state flow, test hooks | Opus 1 | done |
| WP-02 | Player controller + weapons logic | Opus 2 | done (graybox feel pass pending) |
| WP-03 | Graybox map compile (22 areas) + doors/glass | Fable 2 | done (art pass pending) |
| WP-04 | AI (enemies, hostages, nav) + mission flow | Opus 3 | done (tuning pending) |
| WP-05 | UI screens + HUD baseline | Fable 1 | done (beauty pass pending) |
| WP-06 | Playwright smoke suite + QA mode | Opus 4 | done |
| WP-07 | Procedural texture/material library (final tier) | Fable 3 | pending |
| WP-08 | Architecture visual kit (trim, columns, ceiling grid, baseboards) | Fable 2 | pending |
| WP-09 | Prop library: furniture & electronics | Fable 3 | pending |
| WP-10 | Prop library: break room / restroom / maintenance / clutter | Fable 3 | pending |
| WP-11 | Characters (arms, enemies, hostages) + animation | Fable 4 | pending |
| WP-12 | Weapon viewmodels + animations | Fable 4 | pending |
| WP-13 | VFX upgrade + decals | Fable 4 | pending |
| WP-14 | Lighting final pass + fixtures | Fable 2 + Fable 1 | pending |
| WP-15 | Mission/AI full-loop test matrix | Opus 4 | pending |
| WP-16 | Signage & environmental storytelling | Fable 3 | pending |
| WP-17 | Performance & quality scaling validation | Opus 4 | pending |
| WP-18 | Full-game audits & remaster passes | all, led by Opus 1 | pending |
