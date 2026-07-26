# Task & Ownership Ledger — Northstar Rescue

Eight ownership areas per the project charter. The **lead session (Opus 1 role)**
orchestrates; bounded tasks are delegated to subagents running the listed
model class. Agents must not edit files outside their ownership without lead
approval. Shared entry points (`src/main.js`, `src/core/engine.js`,
`index.html`, `package.json`) are lead-only.

| Agent | Model class | Ownership | Primary files |
|---|---|---|---|
| **Opus 1 — Lead architect & integrator** | (this session) | Architecture, repo, shared interfaces, startup, render-loop integration, coordination, manifest stewardship, integration sequencing, final decisions, regression management, delivery | `src/main.js`, `src/core/engine.js`, `src/core/state.js`, `index.html`, `package.json`, docs/* |
| **Opus 2 — Player & combat** | claude-opus-5 | FP controller, pointer lock, movement, collision, camera, weapon handling/aim/fire/recoil/spread/reload/ammo/switch, hit detection, damage/armor/death, penetration, weapon-state integration | `src/game/player.js`, `src/game/weapons.js` |
| **Opus 3 — AI, objectives & rounds** | claude-opus-5 | Enemy perception/patrol/investigation/combat/search, pathfinding & recovery, hostage behavior, extraction, timer, victory/defeat, difficulty, clean restarts | `src/game/enemy.js`, `src/game/hostage.js`, `src/game/navigation.js`, `src/game/game.js` (mission sections, with lead) |
| **Opus 4 — Testing, performance, tools, release** | claude-opus-5 | Playwright automation, deterministic hooks, screenshots, console-error monitoring, gallery mode, camera checkpoints, profiling, loading, quality settings, resolution scaling, accessibility, regression matrix | `tests/**`, `tools/**`, `src/core/testhooks.js`, `src/core/qa*.js` |
| **Fable 1 — Art director, visual bible & interface** | claude-fable-5 | Visual target, color script, shape language, lighting references, material standards, typography, HUD, menus, icons, minimap style, mission graphics, loading screens, title treatment, consistency reviews | `docs/visual-bible.md`, `src/ui/**` |
| **Fable 2 — Map architecture & composition** | claude-fable-5 | Office layout, modular architectural kit, room composition, landmarks, doors/windows placement, stairs, service spaces, exterior views, snow atmosphere, light placement, cover placement, sightlines, collision proxies | `src/world/map.js`, `src/world/builder.js`, `src/world/archdetail.js`, `src/world/exterior.js` |
| **Fable 3 — Props, materials, decals & storytelling** | claude-fable-5 | Prop library, furniture, electronics, materials/textures, wear, decals, clutter, signage, storytelling, prop collision, LOD/optimization | `src/world/textures.js`, `src/world/materials.js` (table entries), `src/world/props/**`, `src/world/decals.js`, `src/world/decorate/**` |
| **Fable 4 — Characters, weapons, animation & effects** | claude-fable-5 | FP arms, enemies, hostages, variants, rigging, character/weapon animation, weapon models, muzzle/impact effects, smoke, glass FX, casings, feedback | `src/characters/**`, `src/fx/**`, `src/game/viewmodel.js` |

## Working rules

1. **File ownership is exclusive during a wave.** Two agents never edit the
   same file in the same wave. Cross-cutting needs go through the lead.
2. **No git operations by subagents** (no commit/push/branch). The lead
   commits integrated, verified states.
3. **No new npm dependencies** without lead approval.
4. **Asset registration is mandatory**: every production asset gets an entry
   in `assets/manifest/<domain>.js` (owned per agent, merged by the game) —
   see `docs/asset-manifest.md` for the schema.
5. **Verification**: after edits, run `node tools/shot.mjs` scenarios covering
   the affected state, inspect the screenshot, ensure zero console errors.
   Post findings to `docs/reports/<agent>.md` (per-agent file, no collisions).
6. **Dev servers**: reuse the tmux `vite-dev-server` session on port 5173;
   do not spawn additional servers on fixed ports.
7. **Determinism**: gameplay randomness must use `rng` from `src/core/rng.js`;
   cosmetic generation uses `worldRng` or a locally-seeded `Rng`.
8. **Units/conventions**: 1 unit = 1m, +Y up, north = −Z; yaw 0 faces north.
   Materials come from `getMaterial(name)`; new material names are registered
   in the shared table (Fable 3 owns the table content).

## Wave plan

- **Wave A (visual foundation)**: Fable 1 visual bible + UI pass; Fable 3
  texture/material library; Fable 2 architectural detail kit; Fable 4
  characters + viewmodel arms & weapon models.
- **Wave B (population)**: Fable 3 prop libraries + room decoration; Fable 4
  animations/VFX; Opus 2 combat feel polish; Opus 3 AI depth.
- **Wave C (quality)**: Opus 4 test matrix + performance; remaster passes;
  audits; fixes assigned by lead.
