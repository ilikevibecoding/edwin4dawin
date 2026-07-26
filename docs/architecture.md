# Architecture — Northstar Rescue

## Locked technical stack (decided 2026-07-26, do not rewrite)

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript 7 (strict) | Interface contracts across 8 ownership lanes |
| Build/dev | Vite 8 | One-command startup, instant HMR, static production build |
| 3D | Three.js r185, WebGL2 | Mature, Playwright/SwiftShader-compatible, full PBR |
| UI | DOM overlay (HTML/CSS) + canvas minimap | Resolution-independent, crisp text, accessible |
| Audio | WebAudio, 100% synthesized at runtime | Original by construction; zero binary assets |
| Textures | Procedural (OffscreenCanvas → CanvasTexture) | Original by construction; parameterized wear |
| Models | Procedural Three.js geometry builders | Original by construction; exact real-world scale |
| Physics | Custom capsule-vs-AABB + swept raycasts | Deterministic, tiny, sufficient for office FPS |
| Tests | Playwright 1.62 driving system Chrome | Required automation |

**No runtime network requests. No binary media assets. Everything is generated from
code at load time** — this makes "missing asset" and "copied asset" defects impossible
by construction and keeps the repo reviewable.

## One-command startup

```bash
npm run dev        # development server on http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the production build
npm test           # full Playwright matrix (starts its own server)
```

## Units & coordinate convention

- 1 world unit = 1 meter. +Y up. -Z is "map north" (the direction the player faces at
  spawn). Yaw 0 faces -Z, positive yaw turns left (Three.js convention).
- Player: capsule radius 0.35 m, standing eye height 1.62 m, crouched eye 1.08 m.
- Doors 0.9–1.8 m wide × 2.05 m; ceilings 2.7 m (offices), 3.4–4.2 m (lobby/garage).

## Simulation model (deterministic)

- Fixed timestep 1/120 s accumulator inside `GameClock`. Rendering interpolates.
- `window.advanceTime(ms)` (test mode `?test=1`) advances the accumulator directly and
  steps simulation + one render synchronously; RAF-driven stepping is suspended.
- All gameplay randomness flows through a seeded `Rng` (`?seed=N`), so identical input
  scripts produce identical states.
- `window.render_game_to_text()` returns the canonical JSON state snapshot.

## Module graph (ownership boundaries in `docs/ownership-ledger.md`)

```
main.ts ─ boots Engine + Game
core/     engine(renderer,resize,quality) clock input(pointerlock) audio events rng settings
game/     game(state machine) player combat weapons/ ai/ nav mission hostage difficulty types
world/    layout mapbuilder kit/ doors glass lighting collision decals propplacement snow
assets/   textures/ materials registry models/{props,characters,weapons} icons
fx/       particles muzzle impacts tracers casings glassbreak screenfx
ui/       hud menus minimap subtitles damage
dev/      testhooks qa gallery
```

## Rendering plan

- ACESFilmic tone mapping, physically-correct lights, sRGB output.
- Shadow budget: 1 directional (cold sun through glass, 2048px PCFSoft) + up to 3
  shadow spots in hero areas. All other interior lights are non-shadow points with
  short decay; architectural AO is baked into procedural textures + per-room grime.
- Static architecture merged per material family (target < 600 draw calls).
- Quality tiers Low/Medium/High/Ultra switch: shadow resolution, renderer pixel ratio
  (resolution scale), light count, particle density, post FX (bloom on High+).

## Round/state machine

`boot → title → settings/difficulty/briefing/loadout → loading → playing ⇄ paused →
victory | defeat → (restart → loading) | (menu → title)`

Mission logic: infiltrate → find hostage A/B → interact (follow) → escort to garage
extraction zone → hold until extraction timer → victory. Defeat on player death or
mission timer expiry or hostage death.
