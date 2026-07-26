# OPERATION BLACKOUT — build contract

A browser-native, AAA-target first-person shooter built on Three.js. Everything is
generated procedurally at load time: there are **no binary art assets**, no CDN
fetches and no network dependencies at runtime. Textures are synthesised on the
GPU or on canvas, geometry is authored in code, and audio is synthesised with
WebAudio.

## Commands

```bash
npm run dev         # vite dev server on http://127.0.0.1:5173
npm run typecheck   # tsc --noEmit  (must be clean)
npm run build       # production build (must succeed)
npm run capture -- --shots hero --out shots/x --width 1600 --height 900
```

The dev server is normally already running in the `vite-dev` tmux session. Check
before starting another one:

```bash
tmux -f /exec-daemon/tmux.portal.conf ls
curl -sf -o /dev/null http://127.0.0.1:5173/ && echo up
```

## Screenshots

`tools/capture.mjs` drives headless Chrome with SwiftShader, waits for the engine
to report ready, poses the camera at a named vantage point, steps frames so
temporal effects converge, and writes a PNG. A shot takes a couple of seconds.

```bash
node tools/capture.mjs --list                     # available vantage points
node tools/capture.mjs --shots hero,alley --out shots/mine --width 1600 --height 900
```

Register new vantage points with `registerVantages()` from `src/core/Vantage.ts`
so the critique loop can frame reproducible shots.

**Always look at the PNG you produced.** A change is not done until it has been
visually verified.

## Architecture

`Engine` (`src/core/Engine.ts`) owns the render loop and a registry of `System`s.
A `System` declares a unique `key`, an `order`, and any of `init` / `update` /
`lateUpdate` / `render` / `resize` / `onQualityChange` / `dispose`. Systems are
sorted by `order`; `render` runs after every `lateUpdate`, and only the post
pipeline implements it.

Systems never import each other. They communicate two ways:

1. **Events** — `ctx.events.emit('fx:explosion', {...})`. The complete vocabulary
   is in `src/core/Events.ts`. Use this for anything fire-and-forget.
2. **Interfaces** — `ctx.get<IPhysics>('physics')`. Declared in
   `src/core/Interfaces.ts`. Use this only where a caller needs a return value.

Both files are the shared contract. **Extend them additively; never repurpose or
delete an existing member**, because other agents are writing against them
concurrently. If you need a new event or method, add it.

Every subsystem must degrade gracefully when a dependency is missing — use
`ctx.tryGet()` and null-check. Agents land at different times and the game must
boot at every intermediate state.

## Quality settings

`src/core/Quality.ts` defines presets from `low` to `cinematic`. Never hard-code
a shadow resolution, particle budget, sample count or draw distance: read it from
`ctx.quality` and implement `onQualityChange`. Headless capture runs the `high`
preset so screenshots exercise the real feature set.

## Layers and groups

`Layers` and `Groups` in `src/core/GameContext.ts` are shared. The world camera
never draws `Layers.VIEWMODEL`; the weapon is rendered in a second pass with its
own camera and near plane. Attach `setHitMeta(obj, { surface, group, ... })` to
anything that should respond correctly to raycasts, damage and impact effects.

## Conventions

- TypeScript strict mode. `npm run typecheck` must pass.
- Units are metres, seconds, radians. Y is up. Gravity is -9.81 m/s².
- Allocate no `Vector3`/`Quaternion`/`Matrix4` inside `update`. Use module-scoped
  scratch objects; the loop runs 120+ times a second.
- Dispose geometries, materials and render targets in `dispose()`.
- Pool anything spawned at a high rate (particles, decals, tracers, casings).
- Prefer instancing and merged geometry. Watch draw calls; the budget is ~1500.
- Comments explain constraints and intent, never what the next line does.

## Visual bar

The target is a modern Call of Duty. Concretely that means: physically plausible
light with a strong key and coloured bounce, no flat ambient wash; grounded
contact shadows; high-frequency surface detail at every distance so nothing reads
as untextured; material variation and grime rather than uniform colour; artistic
composition with foreground framing and depth cues; convincing atmospheric
perspective; and restrained, filmic post-processing. Untextured primitives,
uniform lighting and blown-out bloom are automatic failures.
