# OPERATION BLACKOUT

A first-person shooter built in Three.js, aiming at modern-military-shooter
production values. Every asset — textures, models, animation, audio, level
geometry — is **generated procedurally at runtime**. Nothing is downloaded and
there are no binary art assets in the repository.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

Click to lock the pointer and deploy.

| | |
|---|---|
| Move | `W` `A` `S` `D` |
| Sprint / Crouch / Prone | `Shift` / `Ctrl` or `C` / `X` |
| Jump, Slide | `Space`, sprint + `Ctrl` |
| Fire / Aim | `LMB` / `RMB` |
| Reload / Melee / Grenade | `R` / `V` / `G` |
| Swap weapon | `1` `2` or mouse wheel |
| **Killstreak (airstrike)** | `Z` or `B` |
| Lean | `Q` / `E` |
| Pause & settings | `Esc` |

## Airstrikes

Killstreaks accumulate on kills and reset on death: **UAV** at 3, **airstrike**
at 5, **care package** at 7, **attack helicopter** at 9.

Pressing `Z` with an airstrike available raises a rugged tactical tablet whose
screen is a live canvas-rendered map derived from the actual level geometry —
enemy blips, a sweep line, grid coordinates and a SATCOM readout. The camera
locks while you move the target cursor and pick the run-in heading with `A`/`D`.
A ground designator and a dashed attack line project into the world so you can
see the strike box in the scene rather than only on the tablet.

Confirming sends two aircraft in from beyond the map edge along the chosen
heading. They release a stick of seven bombs on ballistic arcs, and the impacts
walk across the map 0.16s apart. Standing too close earns a concussion flash,
a violent view punch and several seconds of tinnitus.

## Architecture

`Engine` owns a fixed-timestep loop and an ordered list of `Subsystem`s.
Subsystems never import each other — they resolve dependencies by name through
a service registry and talk over a typed event bus, so any one of them can be
stubbed or replaced. The interfaces they agree on live in `src/core/Contracts.ts`.

```
src/core/        engine loop, event bus, input, settings, contracts
src/render/      renderer, HDR post stack, sky + IBL, shadow rig
src/render/textures/  procedural PBR texture generation
src/world/       level geometry, buildings, props, terrain, navigation
src/physics/     Rapier world, character controller, ragdolls, debris
src/player/      movement, stances, layered camera
src/weapons/     viewmodels, animation, ballistics, recoil
src/vfx/         GPU particles, decals, explosions, tracers
src/ai/          enemy models, procedural animation, behaviour, squads
src/killstreaks/ airstrike, tablet, aircraft, other streaks
src/ui/          HUD, minimap, menus
src/audio/       synthesized sound bank, spatialization, reverb
```

### Rendering

The frame runs entirely in a half-float HDR buffer until the final display
transform:

```
world ─▶ SSAO ─▶ viewmodel ─▶ [atmosphere · bloom · DoF · grade] ─▶ CA ─▶ SMAA ─▶ sharpen
```

- **Atmosphere** reconstructs world position from depth and integrates
  exponential height fog analytically, with a two-lobe Henyey-Greenstein
  in-scattering term. Fog colour is sampled from the sky's own measured
  radiance so distant ground dissolves into the sky rather than ending at a
  visible seam.
- **Sky** is Rayleigh + Mie single scattering with two animated procedural
  cloud decks, baked to a PMREM cubemap so image-based ambient always matches
  the visible sky.
- **Shadows** fit a texel-snapped orthographic camera to a fixed region ahead
  of the player. Fitting to the whole view frustum sounds more correct but at
  an 80° FOV yields a bounding sphere hundreds of metres across, which is far
  too coarse for contact shadows.
- **Grade** applies exposure, white balance, AgX or ACES tone mapping, then
  lift/gamma/gain, split toning, vignette, luminance-scaled grain and dither,
  fused into a single shader pass.
- The **viewmodel** is drawn after the world with the depth buffer cleared, and
  confined to the front 2% of the depth range via `gl.depthRange` so
  screen-space effects can identify weapon pixels and skip aerial fog on them.

### Textures

All PBR maps derive from a shared float height/feature field, so a crack in the
albedo is also a crack in the normal, darker in AO, and rougher. Normals are
computed from height expressed in **metres** against real texel spacing, which
makes them resolution- and scale-independent. AO is horizon-based over the
height field rather than inverted height. Maps are packed ORM-style
(R=AO, G=roughness, B=metalness) into one texture bound to three slots.

### Offline review

`tools/shot.mjs` drives the game in headless Chrome (SwiftShader), poses a named
camera from `src/dev/shots.ts`, steps the simulation deterministically until it
settles, and writes a PNG. This is what makes visual regressions reviewable.

```bash
./tools/cap.sh street gameplay ads firefight overview interior golden airstrike
```

Diagnostic overlays: append `?nofill` to isolate direct sun, `?white` to
override all materials, `?normals` to inspect shading normals.
