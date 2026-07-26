# Task & Ownership Ledger

The eight agent roles and the files/systems they own. **Rule: no two agents edit the
same file concurrently. All shared entry points (`src/main.ts`, `index.html`,
`src/game/game.ts`, config files) may only receive broad changes from Opus 1.**

Because the execution environment schedules a single lead process with dispatchable
sub-agents, the roles below are honored as *ownership areas and review lanes*: work is
dispatched per-lane, integrated only by Opus 1, and every production change is recorded
here and in `docs/progress.md` under the owning role's name.

| Role | Area | Owned paths |
|---|---|---|
| **Opus 1** — Lead architect & integrator | Architecture, shared interfaces, build/startup, render-loop integration, asset manifest, integration, final decisions | `index.html`, `src/main.ts`, `src/core/**`, `src/game/game.ts`, `src/game/types.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `docs/**` |
| **Opus 2** — Player & combat | FPS controller, pointer lock, movement, collision response, camera, weapon handling/fire/recoil/spread/reload/ammo/switching, hit detection, damage/armor/death | `src/game/player.ts`, `src/game/combat.ts`, `src/game/weapons/**` |
| **Opus 3** — AI, objectives & rounds | Enemy perception/patrol/investigate/search/combat, cover, pathfinding, hostage behavior & following, extraction, mission timer, victory/defeat, difficulty, clean round reset | `src/game/ai/**`, `src/game/nav.ts`, `src/game/mission.ts`, `src/game/hostage.ts`, `src/game/difficulty.ts` |
| **Opus 4** — Testing, performance, tools, release | Playwright suites, deterministic hooks, screenshots, console monitoring, asset gallery, profiling, quality settings, resolution scaling, accessibility, regression matrix | `tests/**`, `playwright.config.ts`, `src/dev/**`, `tools/**` |
| **Fable 1** — Art director & interface | Visual bible, color script, typography, HUD, menus, icons, minimap, loading screens, title treatment, consistency review | `docs/visual-bible.md`, `src/ui/**`, `src/assets/icons.ts`, `styles/**` |
| **Fable 2** — Map architecture | Original layout, modular architectural kit, rooms, doors/windows placement, stairs, exteriors, snow atmosphere, environmental light placement, cover & sightlines, collision proxies | `src/world/layout.ts`, `src/world/mapbuilder.ts`, `src/world/kit/**`, `src/world/lighting.ts`, `src/world/snow.ts` |
| **Fable 3** — Props, materials, decals, storytelling | Prop library, furniture, electronics, materials/textures, wear, decals, clutter, signage, storytelling placement, prop collision, LOD/optimization | `src/assets/textures/**`, `src/assets/materials.ts`, `src/assets/models/props/**`, `src/world/decals.ts`, `src/world/propplacement.ts` |
| **Fable 4** — Characters, weapons, animation, FX | FP arms, enemies, hostages, rigs, character anims, weapon models & anims, muzzle/impact/smoke/glass FX, casings | `src/assets/models/characters/**`, `src/assets/models/weapons/**`, `src/fx/**`, `src/game/animation/**` |

## Cross-cutting contracts (owned by Opus 1, consumed by everyone)

- `src/game/types.ts` — shared type definitions & interfaces.
- `src/assets/registry.ts` — runtime asset registry; every production asset registers
  its manifest ID here at creation time (enforces "no unregistered assets").
- `src/core/*` — engine services (time, input, audio bus, events, rng, settings).

## Dispatch log

| # | Date | Role | Bounded task | Status |
|---|---|---|---|---|
| 1 | 2026-07-26 | Opus 1 | Stack lock, scaffold, coordination docs | done |
| 2 | 2026-07-26 | Opus 1 | Core engine: loop, fixed timestep, advanceTime, input, pointer lock, settings, rng | done |
| 3 | 2026-07-26 | Opus 2 | FP controller + capsule/AABB collision + weapon prototype | done |
| 4 | 2026-07-26 | Fable 2 | Full graybox layout, all 22 required areas, doors, stairs | done |
| 5 | 2026-07-26 | Opus 3 | Nav grid + A*, enemy FSM v1, hostage follow v1, mission flow | done |
| 6 | 2026-07-26 | Opus 4 | Playwright baseline, test hooks, screenshot pipeline, QA mode | done |
| 7 | 2026-07-26 | Fable 1 | Menu system, HUD, visual bible, title treatment | done |
| 8 | 2026-07-26 | Fable 3 | Material/texture library v1 (procedural PBR) | done |
| 9 | 2026-07-26 | Fable 3 | Prop library wave 1 (desks, chairs, cabinets, electronics) | done |
| 10 | 2026-07-26 | Fable 4 | Characters v1 (enemy, hostage, FP arms), weapon models | done |
| 11 | 2026-07-26 | Fable 4 | VFX: muzzle, impacts, tracers, casings, snow, glass | done |
| 12 | 2026-07-26 | Opus 1 | Audio synthesis engine + full sound set | done |
| 13 | 2026-07-26 | Fable 2/3 | Full-map final art pass: all rooms furnished, lit, decaled | done |
| 14 | 2026-07-26 | Opus 4 | Full Playwright matrix + room-by-room audit | done |
| 15 | 2026-07-26 | All | Remaster passes 1–10 + two clean full-game audits | done |
