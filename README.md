# Operation Blackout

A first-person shooter built entirely in the browser on **Three.js + WebGL 2**, targeting the
look and feel of a modern AAA military shooter. Every asset — textures, materials, weapon
meshes, sky, audio — is generated procedurally at load time; there are no binary art assets in
this repository.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the production bundle
```

## Controls

| Action | Bind |
| --- | --- |
| Move | `W` `A` `S` `D` |
| Sprint / tactical sprint | `Shift` (double-tap forward for tac-sprint) |
| Jump / mantle | `Space` |
| Crouch | `Ctrl` or `C` |
| Prone | `Z` |
| Slide | `Ctrl` while sprinting |
| Lean | `Q` / `E` |
| Fire | Left mouse |
| Aim down sights | Right mouse |
| Reload | `R` |
| Melee | `V` |
| Frag grenade | `G` |
| Swap weapon | `1` `2` or `X` |
| Fire mode | `B` |
| **Killstreaks** | `3` UAV · `4` Air strike · `5` Cluster strike |
| Scoreboard | `` ` `` |
| Pause | `Esc` |

### Air strikes

Reach the required killstreak and press the killstreak key to open the targeting tablet. Move
the reticle over the map, then click to confirm. Jets run in along the painted heading and
walk a line of ordnance through the target, with full shockwave, debris, suppression and
audio treatment.

## Architecture

The engine is a small system registry. Each subsystem implements the `System` interface from
`src/core/System.ts`, declares its dependencies by name, and is updated in an explicit order.
Physics runs on a fixed 120 Hz step; everything else runs per frame.

```
src/
  core/        engine loop, input, timing, math, shared contracts
  procgen/     procedural PBR texture + material library, IBL environment
  physics/     Rapier world, character controller, ragdolls, queries
  render/      lighting, sky/atmosphere, post-processing stack
  world/       level geometry, props, destructibles, navigation data
  player/      movement, stances, camera rig
  weapons/     weapon definitions, procedural models, viewmodel animation
  combat/      ballistics, penetration, damage, hit registration
  ai/          enemy behaviour, perception, pathfinding, squad logic
  fx/          particles, decals, tracers, explosions, debris
  audio/       procedural WebAudio synthesis, spatialisation, reverb
  ui/          HUD, menus, killfeed, minimap, scoreboard
  killstreaks/ UAV, air strike, cluster strike
```

Modules depend on the interfaces in `src/core/Contracts.ts`, never on each other's
implementation files, which keeps the dependency graph acyclic.

## Visual QA harness

`tools/screenshot.mjs` boots the production build in headless Chrome (SwiftShader, so it works
without a GPU), drives the game through a scripted list of camera and gameplay states via
`window.__SHOT__(name)`, and writes PNGs plus a console-error log.

```bash
npm run build:fast
node tools/screenshot.mjs --out shots/run1 --quality high
node tools/screenshot.mjs --only airstrike --width 1920 --height 1080
```

## Quality tiers

Quality is auto-detected from the GPU string and corrected at runtime by an adaptive
resolution controller that holds ~60 fps. Force a tier with `?quality=low|medium|high|ultra`.
