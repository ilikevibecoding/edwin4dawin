# Architecture — Northstar Rescue (LOCKED)

## Stack (locked at project start — do not rewrite the foundation)

| Layer | Choice | Rationale |
|---|---|---|
| Renderer | **Three.js** (WebGL2, `WebGLRenderer`) | Mature, headless-testable via SwiftShader, full PBR + shadows |
| Build/dev | **Vite** | Instant dev server, one-command startup, static build |
| Language | **JavaScript ES modules** (no framework) | Zero build friction for 8 concurrent agents |
| UI | **DOM + CSS overlay** (single `#ui-root` above one `#game-canvas`) | Resolution-independent, crisp text, easy Playwright assertions |
| Audio | **WebAudio**, 100% procedurally synthesized | Original-by-construction, no licensed samples |
| Textures | **Procedural canvas-generated PBR sets** (base/normal/roughness/emissive) | Original-by-construction, tunable, no binary bloat |
| Physics | Custom kinematic capsule vs. static AABB world + swept rays | Deterministic, fast, sufficient for a tactical FPS |
| Navigation | Baked multi-level 0.5 m grid + A* + LOS smoothing | Handles two floors + stairs; shared by enemies & hostages |
| Testing | **Playwright** (system Chrome channel), deterministic sim stepping | Required by spec |

- **One canvas**: `#game-canvas`. All 3D through it. UI is DOM on top.
- **Startup**: `npm start` → http://127.0.0.1:5173 (documented in README).
- **Units**: 1 world unit = 1 meter. Y-up, right-handed (Three.js default). Yaw = rotation about +Y, `yaw=0` faces −Z, positive yaw turns left (CCW from above). Pitch positive looks up.
- **Fixed timestep**: simulation at 120 Hz fixed steps, accumulated from RAF; `window.advanceTime(ms)` switches the engine to manual deterministic stepping (test mode).
- **Determinism**: all gameplay randomness from a seeded RNG (`src/core/rng.js`); mission seed set at mission start (fixed seed in test mode).

## Module map

```
index.html            single canvas + #ui-root; boots src/main.js
src/main.js           bootstrap, error capture, Game construction
src/core/             engine loop, renderer, input, settings, audio engine, events, rng, testhooks, qa
src/game/             game state machine (title→…→playing→end), mission orchestration, difficulty
src/player/           FP controller, capsule collision, interaction
src/weapons/          weapon defs, state machines, ballistics, viewmodel rig
src/ai/               navgrid bake + A*, enemy AI, hostage AI
src/map/              layout data (source of truth), builders (floors/walls/doors/glass/stairs/exterior), light plan
src/props/            parametric prop library + per-room placement + decals + signage
src/materials/        procedural texture generators + PBR material families + palette
src/characters/       procedural rigged humanoids, animation system, FP arms
src/vfx/              particles: muzzle, impacts, glass, smoke, flash, snow, casings, tracers
src/ui/               DOM screens: title/settings/difficulty/briefing/loadout/loading/HUD/pause/end
tests/                Playwright specs
tools/                capture.js screenshot/state pipeline
docs/                 coordination + manifests + checklists + evidence index
```

## Shared interfaces (stable contracts)

- `Game` state machine states: `title | settings | difficulty | briefing | loadout | loading | playing | paused | victory | defeat`.
- `world` (mission runtime) owns: `map` (meshes/colliders/doors/navgrid), `player`, `enemies[]`, `hostages[]`, `projectiles/fx`, `objectives`, `timer`, `rng`.
- Collision world: array of `{min:Vector3-like, max, material, tag, dynamic?, ref?}`; ray + AABB queries in `src/core/collide.js`.
- Events (`src/core/events.js` bus): `shot-fired`, `impact`, `noise` {pos, radius, type}, `enemy-killed`, `player-damaged`, `hostage-secured`, `door-state`, `objective-changed`, `mission-ended`…
- Test hooks: `window.render_game_to_text()` (JSON string), `window.advanceTime(ms)`, `window.__consoleErrors`, QA API `window.__qa` (enabled with `?qa=1`).
- Materials registry: `src/materials/index.js` exports `getMaterial(name)`; all agents must consume materials through it.
- Asset registration: every production asset registers an ID in its domain manifest (`docs/manifest/*.json`) and via `registerAsset()` (`src/core/assets.js`) so QA's gallery + asset-ID overlay can enumerate them.

## Rendering & lighting plan

- ACES filmic tone mapping, exposure ≈ 1.1, physically-based materials, fog for exterior depth.
- Light budget: 1 shadow-casting directional (cold winter sun), hemisphere ambient (sky/snow bounce),
  emissive fixture materials + a bounded set of point/spot fills per zone (culled by distance), 1–3
  shadow spots in hero areas only.
- Quality tiers Low/Medium/High/Ultra: pixel-ratio cap, shadow map size (1024/2048/4096), fill-light
  count, particle density, anisotropy; resolution scale 50–100% independent.
- Anti-aliasing: MSAA via context (antialias:true). Bloom: none (restraint) — emissives tuned instead.
  Vignette: subtle CSS overlay. Motion blur: none (off by default per spec).
