# Task and ownership ledger

Owner of this document: **Opus 1**. Created before any concurrent work began and
kept current. No agent may edit a file owned by another agent; integration fixes
that cross a boundary are made by Opus 1 and recorded here.

## File ownership

| Agent | Role | Files owned exclusively |
| --- | --- | --- |
| **Opus 1** | Lead architect & integrator | `index.html`, `vite.config.js`, `package.json`, `playwright.config.js`, `src/main.js`, `src/core/*` (engine, game, input, settings, events, rng, assets, manifest, qa, testing), `src/map/level.js`, `src/map/merge.js`, `src/map/shell.js`, `docs/*`, `progress.md`, `README.md` |
| **Opus 2** | Player & combat systems | `src/player/controller.js`, `src/player/combat.js`, `src/map/collision.js`, `src/weapons/defs.js` |
| **Opus 3** | AI, objectives & round systems | `src/ai/enemy.js`, `src/ai/hostage.js`, `src/mission/mission.js`, `src/mission/difficulty.js`, `src/map/nav.js` |
| **Opus 4** | Testing, performance, tools & release quality | `tests/**` (specs, helpers, tools) |
| **Fable 1** | Art direction, visual bible & interface | `src/art/palette.js`, `src/ui/styles.css`, `src/ui/hud.js`, `src/ui/menus.js`, `src/ui/icons.js`, `src/ui/minimap.js`, `src/map/lighting.js` |
| **Fable 2** | Map architecture & environmental composition | `src/map/layout.js`, `src/map/kit.js`, `src/map/doors.js`, `src/map/glass.js` |
| **Fable 3** | Props, materials, decals & storytelling | `src/props/library.js`, `src/props/dress.js`, `src/props/decals.js`, `src/props/signage.js`, `src/art/textures.js`, `src/art/materials.js` |
| **Fable 4** | Characters, weapons, animation & effects | `src/characters/models.js`, `src/characters/animation.js`, `src/characters/faces.js`, `src/weapons/models.js`, `src/weapons/viewmodel.js`, `src/weapons/icons.js`, `src/vfx/*`, `src/audio/*` |

Shared read-only contracts live in `docs/interfaces.md`. `src/art/geometry.js` is
a shared helper owned by Opus 1 and treated as frozen API by everyone else.

## Concurrency rule that was actually enforced

Content agents ran in two parallel waves, each writing only its own files:

* Wave 1 — Fable 3 (props/signage/decals) and Fable 4 (characters/animation).
* Wave 2 — Fable 4 (weapons/viewmodel/icons), Fable 1 (UI), Fable 4 (VFX + audio).

Opus 1 wrote the core, map shell, integration and test surface between waves, so
no two agents ever held the same file. Review rounds resumed the original agent
for its own files rather than letting a second agent touch them.

## Cross-boundary integration fixes made by Opus 1

These are the only edits made outside the owning agent's files, all recorded:

| Fix | File touched | Reason |
| --- | --- | --- |
| View-model root offset `(0, 0.155, 0.02)` | `src/core/game.js` (own file) | The authored arm rest pose put the weapon 36° below the overlay camera axis. Applied as an integration transform rather than editing Fable 4's authoring. Confirmed and kept by Fable 4. |
| `collapseRiggedMeshes()` applied to characters and enemy weapons | `src/ai/enemy.js`, `src/ai/hostage.js` | Draw-call reduction; does not change authored geometry. |
| `collapseByMaterial()` applied to door leaves | `src/map/doors.js` | Draw-call reduction. Agreed as a batching concern, not a design change. |
| Texture data-map downsampling | `src/art/textures.js` | VRAM budget. Central change in the foundry rather than per-material. |
| Emitter height, bloom threshold, exposure | `src/art/palette.js`, `src/map/lighting.js` | Lighting-plan correction after the first review pass; Fable 1 scope, executed by the lead during the remaster pass. |

## Task board

Legend: ✔ done · ▶ in progress · ⏸ queued

### Opus 1 — architecture & integration
- ✔ Lock stack, write `docs/interfaces.md`, repository layout
- ✔ `npm start` single documented command
- ✔ Renderer, post chain, fixed-step loop, resize, fullscreen
- ✔ Asset registry with mandatory-field validation
- ✔ Level assembly order, spatial batching, BVH
- ✔ Derived wall shell with carved openings
- ✔ `render_game_to_text()` / `advanceTime(ms)` / QA namespace
- ✔ Two parallel content waves dispatched and integrated
- ▶ Room-by-room audit cycles and regression management
- ▶ Final deliverable documents

### Opus 2 — player & combat
- ✔ Controller: accel/friction, crouch, jump, lean, landing, footstep noise
- ✔ Collision: grid broadphase, per-axis sweep, step-up
- ✔ Weapon handling: fire, spread, recoil patterns, ADS, reload state machine
- ✔ Hit detection with per-bone spheres, armour, falloff, penetration
- ✔ Grenades, melee, weapon switching
- ✔ **Bug fixed:** recoil now feeds the aim direction
- ✔ **Bug fixed:** one-shot input edges consumed once per simulation step

### Opus 3 — AI, objectives & round systems
- ✔ Multi-level navigation grid with automatic stair links
- ✔ Perception: vision cone + real LOS + hearing with wall muffling
- ✔ Patrol / suspicious / investigate / combat / cover / flank / search / stunned
- ✔ Cover selection, burst discipline, reload behaviour, stuck recovery
- ✔ Hostage held → secured → following → stopped → extracted, with guaranteed
  path recovery so extraction cannot become impossible
- ✔ Mission director, objective chain, timer, alarm, victory/defeat
- ✔ Four difficulties, total reset with no page reload

### Opus 4 — testing, performance, tools
- ✔ Playwright harness, helpers, deterministic input helpers
- ✔ Combat cause-and-effect suite (8 chains)
- ✔ Mission flow suite, AI behaviour suite
- ✔ Screenshot matrix tool, fast probe tool, performance profile
- ✔ Console-error monitoring surfaced through `__northstar.errors`
- ▶ Full regression matrix and accessibility checks

### Fable 1 — art direction & interface
- ✔ Visual bible: colour script, shape language, scale and material standards
- ✔ Lighting plan with four light families and named scenarios
- ✔ 13 menu screens, HUD, minimap, icon set, original title treatment
- ✔ Accessibility settings: reduced motion, reduced blood, colour-blind modes,
  UI scale, subtitles
- ▶ Consistency review passes

### Fable 2 — map architecture
- ✔ Original plan, all 22 required areas, double corridor loop
- ✔ Modular kit: walls, corners, openings, columns, ceilings, stairs, railings,
  trims, ducts, pipes, trays, drains, access panels, parapets
- ✔ 44 doors across 10 types with hardware, states and card readers
- ✔ 136 glass panes with intact / cracked / broken states
- ✔ Cover and sightline composition

### Fable 3 — props, materials, decals, storytelling
- ✔ 76 material families, procedural texture foundry
- ✔ 144 prop definitions, 947 placements
- ✔ 21 signage families and 14 decal families as atlases
- ✔ 13 original screen-content kinds
- ✔ Environmental storytelling pass

### Fable 4 — characters, weapons, animation, effects
- ✔ First-person arms with sleeves, gloves, articulated fingers, IK support hand
- ✔ 4 hostile variants, 5 heads, 2 hostage variants, operator body
- ✔ 25 procedural animation states
- ✔ 8 weapons with world/first-person/LOD models, icons, pickups
- ✔ View model with 20 actions
- ✔ 16 VFX families, 14 decal families, 109 synthesised sounds, 6 reverb spaces
