# Operation Blacksite

A first-person shooter built in Three.js, targeting the visual and mechanical
vocabulary of a modern military shooter. It runs in a browser with no
downloaded assets: every texture is synthesised on the GPU at load time, every
model is generated from primitives in code, and every sound is built from a Web
Audio graph.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck, then production bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run shot` | Headless deterministic screenshot capture |

## Controls

| | |
| --- | --- |
| `WASD` | Move |
| `Mouse` | Look |
| `Shift` | Sprint (hold for tactical sprint) |
| `Ctrl` / `C` | Crouch — press while sprinting to slide |
| `X` | Prone |
| `Space` | Jump, or mantle onto a ledge |
| `LMB` / `RMB` | Fire / aim down sights |
| `R` | Reload (faster with a round still chambered) |
| `B` | Cycle fire mode |
| `1` `2` | Primary / sidearm |
| `I` | Inspect weapon |
| `3` `4` `5` | Recon sweep / airstrike / ammo drop |
| `Esc` | Pause |

A gamepad works if one is connected.

## Airstrike

Earned at five consecutive kills. Deployment is two-stage: press `4`, look at
the ground where the ordnance should land and press fire to mark it, then sweep
the view to set the attack heading and fire again to commit.

A pair of aircraft ingress on that bearing, release a stick of retarded bombs
that walks across the mark, and break away climbing. The HUD shows an inbound
countdown and the attack axis. Detonation audio is delayed by the real transit
time at 343 m/s, which is most of what makes it feel like ordnance rather than a
particle effect.

## Architecture

Systems are registered on the engine and driven in a fixed order —
`fixedUpdate` at 120 Hz for anything that must be framerate-independent,
`update` once per frame, `lateUpdate` for cameras. They communicate through a
typed signal bus (`src/core/Signals.ts`) rather than by direct reference, so
gameplay code emits and presentation code listens.

```
src/
  core/       Engine loop, signal bus, input, quality tiers
  render/     Post pipeline, procedural texture forge, materials, sky, lighting
  physics/    BVH collision, capsule character sweeps, rigid bodies
  world/      Procedural level, buildings, props
  player/     Movement, stance, camera dynamics
  weapons/    Weapon data, view model, ballistics, procedural weapon meshes
  ai/         Enemy behaviour and procedural soldier animation
  vfx/        GPU particles, decals
  killstreaks/ Airstrike, aircraft, streak progression
  audio/      Procedural Web Audio synthesis
  ui/         Canvas HUD, DOM menus
  game/       Mission flow, camera shake, capture harness
```

### Rendering

A hand-built deferred-style post stack rather than `EffectComposer`, so every
pass can be scheduled against one shared depth buffer:

```
normal prepass → world colour → GTAO → volumetrics → TAA →
motion blur → depth of field → view-model overlay → bloom → composite → SMAA
```

Depth-dependent effects all run before the first-person weapon is drawn, so the
weapon is never occluded by world AO, smeared by world motion blur, or defocused
by world DOF — which is how shipped shooters separate the two.

Notable pieces:

- **GTAO** with horizon search and a normal-aware bilateral denoise, plus a
  full-resolution sun-direction contact trace so props are visibly bedded into
  the surfaces they stand on.
- **Volumetric lighting** raymarched against the sun's shadow cascades, so light
  shafts fall through doorways and window slats rather than being a screen-space
  radial blur that only works when the sun is on screen.
- **TAA** with YCoCg neighbourhood variance clipping and adaptive feedback. The
  other stochastic passes — GTAO slice rotation, DOF aperture jitter, volumetric
  ray offsets — all dither with blue noise and rely on this accumulation.
- **Dual-filter bloom** with a Karis-averaged first downsample, which is what
  keeps it from flickering on tracers and sparks.
- **AgX** display transform in Rec.2020, so muzzle flashes and explosion cores
  desaturate toward white along a smooth path instead of clipping to a flat
  yellow.

### Surfaces

`src/render/TextureForge.ts` bakes every PBR map on the GPU from a single GLSL
`surface()` function per material. Height is authored first and albedo,
roughness, metalness, and AO are derived from it, so a mortar recess is
simultaneously deeper, darker, rougher, and more occluded — the way a real one
is. Independently authored maps almost never agree, and that disagreement is
what makes procedural surfaces look fake.

A shared world-space triplanar detail layer is blended over everything with
reoriented normal mapping, which fills the centimetre-scale band that the base
maps run out of long before the camera does.

## Automated visual review

`tools/shoot.mjs` boots the built game in headless Chrome with a software
rasteriser, drives a deterministic capture harness (`?shot=1`), and writes PNGs.
The harness freezes the clock, ticks the engine by hand, poses the camera at
authored vantage points, and resets volatile state between scenarios, so two
captures of the same scenario differ only if the render actually changed.

```bash
npx vite build --outDir dist-shot
node tools/shoot.mjs street rooftop golden --fast --dist dist-shot --out captures
```

Scenarios: `street`, `alley`, `rooftop`, `interior`, `ads`, `golden`,
`overcast`, `night`, `airstrike`, `firefight`. `--warmup N` samples any point on
an effect's timeline, which is how the airstrike's beats were tuned.

`tools/diagnose.mjs` reports per-stage render-target statistics — mean and peak
colour of the AO, volumetric, bloom, and LDR buffers — which is how you tell a
black screen caused by a failed shader from one caused by a broken exposure.

## Quality tiers

`src/core/Config.ts` probes the GPU at boot and selects one of four tiers, or
honours `?q=low|medium|high|ultra`. The tier drives render scale, shadow cascade
count and resolution, AO sample count, volumetric step count, particle and decal
budgets, and which post passes run at all.
