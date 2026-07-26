# Architecture — Northstar Rescue

## Locked technical stack (do not rewrite)

- **Rendering**: [three.js 0.170] WebGL2, single `<canvas>`, forward renderer,
  ACES tone mapping, MSAA. No post-processing composer; grading via tone
  mapping + restrained CSS vignette.
- **App**: vanilla ES modules, **Vite 5** dev server/bundler. No framework.
- **UI**: DOM/CSS overlays (menus + HUD) — resolution independent, crisp,
  Playwright-friendly. 2D canvas for minimap/briefing map.
- **Audio**: WebAudio, 100% runtime-synthesized (zero shipped media files).
- **Testing**: Playwright (`@playwright/test`) + `tools/shot.mjs` QA loop.
- **Assets**: 100% procedural (geometry + canvas-generated textures) —
  guarantees originality, zero missing files, zero licensing risk.

## Startup

- `npm start` → http://127.0.0.1:5173 (strict port).
- `npm test` → Playwright suite. `npm run shot` → one-off screenshot probe.

## Conventions

- 1 world unit = 1 meter. +Y up. **North = −Z**, east = +X.
- Yaw 0 faces north (−Z); positive yaw rotates counterclockwise (seen from
  above): 90° = west. `render_game_to_text()` documents this per snapshot.
- Fixed timestep sim: 60 Hz (`Engine.stepSim`), render decoupled via RAF.
- Deterministic mode (`?test=1`): RAF renders only; `advanceTime(ms)` steps
  the sim; `rng` seeded (default 42, `?seed=` override).

## Module graph (ownership in docs/ownership-ledger.md)

```
main.js ── boot, mode flow, session lifecycle
├─ core/    engine (renderer+loop), input, state, settings, audio, sounds,
│           rng, events, testhooks (render_game_to_text/advanceTime/__qa)
├─ ui/      style.css, menus (all screens), hud, briefingMap, weaponIcons
├─ world/   map (DATA: rooms/doors/windows/glass/stairs/spawns),
│           builder (derives walls/floors/colliders from data),
│           worldRuntime (colliders, raycast, groundAt),
│           materials, lighting
├─ game/    game (GameSession: mission controller), player, weapons, doors,
│           enemy, hostage, navigation (grid A* + stair links), constants
├─ characters/ bodies (graybox now; full rigs later)
└─ fx/      vfx (tracers, impacts, smoke, flashes)
```

## Key invariants

1. **Geometry/collision/nav coherence**: walls, colliders and nav-blocking
   all derive from `map.js` data in one pass (`builder.js`). Never hand-place
   a wall mesh without its collider.
2. **Sessions are disposable**: restart = dispose + rebuild `GameSession`.
   No global mutable gameplay state outside the session (except settings).
3. **Events over imports**: combat/UI cross-talk uses `core/events.js`
   channels (`noise`, `impact`, `kill`, `subtitle`, `announce`, …).
4. **Materials by name**: `getMaterial(name)` everywhere; upgrading a
   material upgrades every user.
5. **All randomness deterministic**: gameplay uses `rng`; cosmetics use
   seeded `worldRng` so every build of the world is identical.

## Performance strategy

- Static architecture merged per-material (`Batch`) → few draw calls.
- Props merged per room chunk in the prop pass; small-prop chunks get
  distance culling (LOD strategy).
- Light budget by quality preset (4/8/12/16 dynamic lights); one shadowed
  directional (sun). Quality presets also scale pixel ratio, shadow map size,
  particle counts.
- Collision: AABB slab raycasts over a few hundred boxes — no physics engine.
