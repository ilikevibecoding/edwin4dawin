# Task and Ownership Ledger

Created before any concurrent work began. Every source file has exactly one owning agent.
An agent may **read** any file but may only **write** files it owns. Cross-area changes are
requested from the owner, or escalated to Opus 1 (lead) who owns all shared entry points.

## Agent roster and areas

| Agent | Role | Primary areas |
| --- | --- | --- |
| **Opus 1** | Lead architect / integrator | Architecture, repo layout, shared interfaces, build & startup, render-loop integration, asset manifest, integration sequencing, regression management, delivery |
| **Opus 2** | Player & combat systems | FPS controller, pointer lock, movement, collision, camera, weapons, aiming, firing, recoil, spread, reload, ammo, switching, hit detection, damage, armour, death |
| **Opus 3** | AI, objectives, round systems | Perception, patrol, investigate, suspicion, combat decisions, cover, pathfinding, nav recovery, hostages, extraction, timer, win/lose, difficulty, round reset |
| **Opus 4** | Testing, performance, tools, release | Playwright automation, deterministic hooks, screenshots, console monitoring, asset gallery, QA camera bookmarks, profiling, quality settings, resolution scale, accessibility, regression |
| **Fable 1** | Art direction, visual bible, interface | Visual target, colour script, shape language, lighting reference, material & scale standards, typography, HUD, menus, icons, minimap, mission graphics, loading screens, title treatment |
| **Fable 2** | Map architecture & composition | Office layout, modular arch kit, rooms, landmarks, doors/windows placement, walls/floors/ceilings, stairs, service spaces, exteriors, snow atmosphere, light placement, cover, sightlines, collision proxies |
| **Fable 3** | Props, materials, decals, storytelling | Prop library, furniture, electronics, utility objects, surface materials, texture sets, wear, decals, clutter, destruction variants, signs, storytelling, prop collision, LODs |
| **Fable 4** | Characters, weapons, animation, effects | FP arms, player equipment, enemies, hostages, variants, rigging, animation, weapon models & animation, muzzle/impact/smoke/glass FX, shell casings, character feedback |

## File ownership map

### Opus 1 — lead (shared entry points; **only Opus 1 writes these**)

```
index.html
package.json  tsconfig.json  vite.config.ts  playwright.config.ts
README.md  progress.md
docs/architecture.md  docs/asset-manifest.md  docs/ownership-ledger.md
src/main.ts
src/core/Game.ts            # root orchestrator + fixed-step loop
src/core/GameState.ts       # flow state machine (title -> ... -> victory/defeat)
src/core/EventBus.ts        # typed pub/sub between areas
src/core/Rng.ts             # deterministic PRNG
src/core/Time.ts            # deterministic clock + advanceTime
src/core/Registry.ts        # asset registry / manifest binding
src/core/Types.ts           # shared interfaces
```

### Opus 2 — player & combat

```
src/player/PlayerController.ts
src/player/PlayerCamera.ts
src/player/PlayerState.ts
src/player/Input.ts
src/combat/WeaponSystem.ts
src/combat/WeaponDefs.ts
src/combat/Ballistics.ts
src/combat/DamageModel.ts
src/combat/Interaction.ts
src/world/Collision.ts       # capsule/world solver (shared with Opus 3 read-only)
```

### Opus 3 — AI, objectives, rounds

```
src/ai/EnemyAgent.ts
src/ai/Perception.ts
src/ai/Behavior.ts
src/ai/CoverSystem.ts
src/ai/Hostage.ts
src/ai/NavGrid.ts
src/ai/Pathfinder.ts
src/mission/Mission.ts
src/mission/Objectives.ts
src/mission/Difficulty.ts
src/mission/RoundManager.ts
```

### Opus 4 — testing, tools, performance

```
tests/**
src/dev/TestHooks.ts
src/dev/QAMode.ts
src/dev/AssetGallery.ts
src/dev/Profiler.ts
src/dev/Checkpoints.ts
src/core/Quality.ts
docs/playwright-scenarios.md  docs/known-issues.md  docs/screenshot-index.md
docs/performance.md
tools/**
```

### Fable 1 — art direction & interface

```
src/ui/**            (UIRoot, Menus, Hud, Minimap, Icons, styles)
src/art/Palette.ts
src/art/Typography.ts
docs/visual-bible.md  docs/visual-quality-checklist.md
```

### Fable 2 — map architecture

```
src/world/ArchKit.ts
src/world/MapLayout.ts
src/world/MapBuilder.ts
src/world/Doors.ts
src/world/Glass.ts
src/world/Stairs.ts
src/world/Exterior.ts
src/world/LightingPlan.ts
```

### Fable 3 — props, materials, decals

```
src/assets/TextureLab.ts     # procedural PBR map painter
src/assets/Materials.ts      # material families
src/assets/GeomKit.ts        # beveled primitives / lathe / extrude helpers
src/assets/props/*.ts        # office, breakroom, restroom, maintenance, clutter, signage
src/fx/Decals.ts
```

### Fable 4 — characters, weapons, animation, FX

```
src/chars/CharacterRig.ts
src/chars/EnemyModels.ts
src/chars/HostageModels.ts
src/chars/Animation.ts
src/chars/FirstPersonArms.ts
src/weapons/WeaponModels.ts
src/weapons/ViewModel.ts
src/weapons/WeaponAnim.ts
src/fx/Particles.ts
src/fx/Impacts.ts
src/fx/Tracers.ts
src/fx/Smoke.ts
src/audio/**
```

## Conflict rules

1. Two agents never hold a write lock on the same file. Files are the unit of ownership.
2. Cross-area needs are expressed through interfaces in `src/core/Types.ts` and events on
   `src/core/EventBus.ts`. Only Opus 1 edits those two files; other agents request additions.
3. `src/world/Collision.ts` is authored by Opus 2 and consumed read-only by Opus 3 (nav bake)
   and Fable 2 (collision proxies register through `CollisionWorld.addStatic`).
4. Any new production asset must be registered in `docs/asset-manifest.md` and in
   `src/core/Registry.ts` **before** it is placed in the world. Unregistered assets fail the
   `tests/09-asset-registry.spec.ts` audit.
5. Opus 4 may file defects against any area but does not fix another area's file; it opens an
   entry in `docs/known-issues.md` addressed to the owner.

## Work sequencing

```
Opus 1 foundation  ──▶ Fable 2 graybox ──▶ Opus 2 controller/weapons ──▶ Opus 3 AI/mission
        │                    │                     │                          │
        └── Fable 1 UI ──────┴── Fable 3 props ────┴── Fable 4 chars/FX ──────┘
                                          │
                                    Opus 4 QA loop (continuous)
```
