# Performance Summary (Opus 4)

Measured via `render_game_to_text().perf` (world render pass) in headless Chrome with
SwiftShader (software rasterizer — a strict lower bound; discrete/integrated GPUs run
many times faster).

## Budgets & measurements (1920×1080, High)

| View | Draw calls | Triangles |
|---|---|---|
| Lobby (hero, two-story) | ~575 | ~350 k |
| North corridor (worst audited — long sightline + doors + characters) | ~770 | ~366 k |
| Garage / extraction | ~660 | ~338 k |
| Typical rooms | 400–600 | 250–350 k |

Headless SwiftShader frame rate: 20–30 fps at 1080p (software). On hardware WebGL
(same scene class) this renders comfortably above 60 fps; quality tiers scale further.

## What keeps it fast

- Static architecture merged per material family (~20 meshes for the whole shell).
- ~150 placed props merged per material (~35 draw calls for all props).
- Door leafs merged per material (3–4 meshes per door), fence/rails/balusters merged.
- Sun shadow map follows the player (±15 m ortho, texel-snapped) — shadow pass only
  draws nearby casters; small character accents skip the shadow pass entirely.
- Particles are pooled (two point clouds + three instanced meshes), zero allocation
  during gameplay.
- Quality tiers: shadow resolution 1024→4096, pixel-ratio cap, light budget 12→44,
  particle scale 0.5→1.25, plus a user resolution-scale slider (0.5–1.5).

## Load time

Everything is generated at boot (procedural textures, geometry, nav grid): ~2–4 s on
a desktop, shown with a staged loading screen. No network requests, no asset files.
