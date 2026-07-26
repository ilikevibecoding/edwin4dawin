# Task & Ownership Ledger — Northstar Rescue

Lead: **Opus 1** (this session's primary agent) owns integration, shared entry points, and final decisions.
Subagents are dispatched as bounded work packages via the Task tool using the models below.
**Rule: no two agents may edit the same file concurrently.** File ownership is directory-scoped below.
Shared entry points (`index.html`, `src/main.js`, `src/game/game.js`, `package.json`, `vite.config.js`) are Opus 1 only.

| Role | Model | Owned directories / files | Scope |
|---|---|---|---|
| Opus 1 — Lead architect & integrator | claude-opus-5 (primary session) | `src/core/`, `src/game/`, `index.html`, `src/main.js`, root configs, `docs/` index files | Architecture, interfaces, build/startup, render-loop integration, manifest custody, sequencing, regression management, delivery |
| Opus 2 — Player & combat | claude-opus-5-thinking-high | `src/player/`, `src/weapons/` | FP controller, pointer lock feel, movement, collision behavior, camera, weapon handling/fire/recoil/spread/reload/ammo/switching, hit detection, damage/armor/death, penetration |
| Opus 3 — AI, objectives, rounds | claude-opus-5-thinking-high | `src/ai/`, `src/game/mission.js` (by delegation) | Perception (vision/hearing), patrol/investigate/search/combat, cover, pathfinding + recovery, hostage behavior/following, extraction, timer, victory/defeat, difficulty, clean retries |
| Opus 4 — Testing, performance, tools | claude-opus-5-thinking-high | `tests/`, `tools/`, `src/core/qa.js` (by delegation) | Playwright automation, deterministic hooks QA, screenshots, console-error monitoring, asset gallery, camera checkpoints, profiling, quality/resolution scaling checks, accessibility, integration matrix, final regression |
| Fable 1 — Art director & interface | claude-fable-5-thinking-high | `src/ui/`, `docs/visual-bible.md` | Visual target, color script, shape language, lighting refs, material/scale standards, typography, HUD, menus, icons, minimap, mission graphics, loading screens, title treatment, consistency reviews |
| Fable 2 — Map & environment | claude-fable-5-thinking-high | `src/map/` | Layout, modular architectural kit, room composition, landmarks, doors/windows placement, walls/floors/ceilings, stairs, service spaces, exterior views, snow atmosphere, light placement, cover, sightlines, collision proxies |
| Fable 3 — Props, materials, decals | claude-fable-5-thinking-high | `src/props/`, `src/materials/` | Prop library, furniture, electronics, utility objects, surface materials/texture sets, wear, decals, clutter, destruction variants, signage, storytelling, prop collision, LOD/optimization |
| Fable 4 — Characters, weapons art, FX | claude-fable-5-thinking-high | `src/characters/`, `src/vfx/` | FP arms, player equipment, enemies, hostages, variants, rigging, character anims, weapon models/anims, muzzle/impact/smoke/glass FX, casings, character feedback |

Cross-cutting: `src/core/audio.js` synth content may be extended by any owner **only** via the registered
sound-profile tables in their own directories; the audio engine itself is Opus 1.

Wave-1 file grants (exceptions to directory scoping):
- `src/weapons/models.js` and `src/weapons/viewmodel.js` → Fable 4 (weapon art + FP arms integration).
- `playwright.config.js` (root) → Opus 4.
- `tools/capture.js` core stays Opus 1/4; other agents create `tools/capture-<role>.js`.
- Subagents never edit `progress.md` (reports go to `docs/reports/`).

## Work-package log

| WP | Role | Status | Notes |
|---|---|---|---|
| WP-000 | Opus 1 | done | Stack lock, scaffold, coordination docs |
| WP-001 | Opus 1 | in progress | Engine foundation: loop, renderer, input, settings, audio core, test hooks, QA |
| WP-002 | Opus 1 (interfaces) | pending | Player controller + collision walking skeleton |
| WP-003 | Opus 1 (interfaces) | pending | Weapons walking skeleton (pistol fire/reload path) |
| WP-004 | Opus 1 + Fable 2 spec | pending | Graybox layout schema + full 22-area two-floor layout |
| WP-005 | Opus 1 | pending | Mission state machine, objectives, hostages, extraction, restart |
| WP-006 | Opus 1 (interfaces) | pending | Enemy AI walking skeleton (patrol/combat/search) |
| WP-007 | Opus 1 | pending | Full menu flow + HUD baseline |
| WP-008 | Opus 4 spec | pending | Playwright harness + baseline suite + capture tool |
| WP-010 | Fable 1 | pending | UI/HUD/menus full art pass + visual bible (docs/visual-bible.md, src/ui/*) |
| WP-011 | Fable 2 | pending | Map final architecture art pass (src/map/*): interiors, trim, stairs, glass, exterior snow, lighting placement |
| WP-012 | Fable 3 | pending | Props/materials/decals/signage mass production (src/props/*, src/materials/*) |
| WP-013 | Fable 4 | pending | Characters/animations/FP arms/weapon models/VFX (src/characters/*, src/vfx/*) |
| WP-014 | Opus 2 | pending | Combat feel deep pass (recoil patterns, ADS, penetration, feedback) |
| WP-015 | Opus 3 | pending | AI deep pass (cover, squad pressure, search patterns, hostage escort polish) |
| WP-016 | Opus 4 | pending | Full test matrix, perf profiling, quality tiers validation |
| WP-017 | All | pending | Audit waves (rank top-10 discrepancies, assign, fix, repeat) |
| WP-018 | Opus 1 | pending | Final validation + deliverables |
