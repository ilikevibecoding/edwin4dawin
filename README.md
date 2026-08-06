# AEGIS RIDGE

A first-person, single-scene demo set at a **fictional** air-defence interceptor
site. You walk the pad, inspect three very different launcher batteries, take the
console in the command shelter, and try to intercept incoming ballistic targets
before they reach the ground.

Built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/).
**Every asset is generated procedurally at runtime** — no models, no image files,
no audio files. Terrain, structures, vehicles, missiles, textures, sky, particle
sprites and every sound are produced from primitives, noise, canvas drawing,
custom shaders and WebAudio synthesis.

## This is entertainment, not a simulator

Everything here is invented and balanced for spectacle and readability:

- Systems are only *visually* inspired by publicly recognisable platforms. All
  designations, markings and callsigns are fictional.
- Ranges, speeds, radar behaviour, guidance, discrimination, probabilities and
  procedures are gameplay abstractions, not representations of real capability.
- The engagement cue is a deliberately simplified prediction model. It is not a
  fire-control solution and is not intended to resemble one.

## Running it

```bash
npm install
npx playwright install chromium   # only needed for the tests
npm run dev                       # http://127.0.0.1:5173
```

Production build:

```bash
npm run build && npm run preview
```

## Controls

| Input | Action |
|---|---|
| Mouse | Look (click the canvas to capture the pointer) |
| `W` `A` `S` `D` | Move |
| `Shift` | Sprint |
| `Space` | Jump |
| `C` / `Ctrl` | Crouch |
| `Q` | Take / release the C2 console (stand near it first) |
| `Tab` | Designate the next firm track |
| `E` | Assign the selected battery to the designated track (or press the console control you are looking at) |
| `F` | Authorize launch |
| `1` `2` `3` | Select the terminal / high-altitude / Sentinel battery |
| `R` or `T` | Start or restart the scenario |
| `P` | Pause the simulation |
| `Esc` | Settings and accessibility |
| `F1` or `` ` `` | Performance overlay |

Left-click designates the threat under the crosshair when outdoors, and presses
controls or selects tracks when docked at the console.

## The loop

1. Pick conditions (day / sunset / night), a threat scenario and a primary battery.
2. Deploy to the site and walk around, or go straight to the shelter.
3. Press `START BALLISTIC MISSILES`.
4. Watch the radar acquire and firm the inbound tracks.
5. Designate a track, assign a battery, authorize the launch.
6. Watch the round leave the rail, arc through the sky and close.
7. Read the result: intercepted, missed (with the reason), decoy, or impact.
8. Restart immediately.

### Scenarios

- **SINGLE TRACK** — one highly visible inbound. Training profile.
- **SATURATION** — three to five targets on divergent arcs inside a short window.
- **NIGHT RAID** — several targets plus harmless decoys, under searchlights.

Spawn points, arcs and timing vary slightly on every run while staying
reproducible for a given seed.

### Batteries

| Battery | Character | Rounds |
|---|---|---|
| **HAWKEYE 1** — terminal | Fast to react, tight basket, best on low close threats | 8 |
| **LONGVIEW 2** — high-altitude | Slower to prepare, very wide basket, long dramatic contrails | 6 |
| **IRONWOOD 3** — Sentinel test | Fictional, three rounds only, longest flight, biggest plume | 3 |

## Accessibility

- **Reduced motion** disables head bob and heavily damps camera shake and
  chromatic aberration (`Esc` → Settings).
- **Audio cue subtitles** print every important sound cue on screen.
- Every gameplay state visible in the world is also printed in the HUD panels:
  active threat count, which tracks are held, which battery is selected, whether
  it is ready / preparing / reloading / expended, what is assigned, what is in
  flight, and why the last engagement succeeded or failed.
- Quality presets (`LOW` … `ULTRA`) and a dynamic-resolution controller keep the
  frame rate stable on weaker hardware.

## Project layout

```
src/
  main.js          bootstrap, game loop, scenario state machine, test harness
  config.js        every tunable: batteries, scenarios, time-of-day, quality
  state.js         shared game state + event bus
  player.js        first-person controller, capsule collision, head bob
  base.js          terrain, apron, shelter, radar site, props, perimeter
  batteries.js     the three launcher families and their fire-control state
  threats.js       incoming re-entry bodies and decoys
  interceptors.js  interceptor airframes, staging and guidance
  physics.js       drag/gravity integration, lead solution, PN, collision world
  radar.js         detection and track model, PPI scope, holographic console
  effects.js       pooled particles, ribbon trails, fireballs, debris, decals
  weather.js       analytic sky, cloud deck, star field, lighting rig
  audio.js         procedural WebAudio synthesis
  post.js          bloom, grade, tone map, film grain, SMAA, dynamic resolution
  ui.js            DOM HUD, briefing/debrief, console bar, world markers
  util/            rng, noise, canvas textures, materials, geometry kit-bash
tools/
  capture.mjs      deterministic screenshot harness for the self-eval loop
  balance.mjs      render-free gameplay balance probe
tests/
  game.spec.js     Playwright gameplay + performance + determinism suite
```

## Testing

```bash
npm test                    # full Playwright suite
node tools/balance.mjs      # fast, render-free balance telemetry
node tools/capture.mjs --out shots/run1   # screenshot sweep of every scene
```

The page accepts `?test=1` to enter deterministic mode, which fixes the timestep,
seeds every random stream and exposes `window.__GAME` for driving the simulation
(`runFor`, `runUntil`, `render`, `autoEngage`, `snapshot`, `measureSim`, …). Use
`?seed=`, `?quality=` and `?scenario=` to pin a run.

`PROGRESS.md` carries the iteration log: scores against the quality rubric,
observations, performance results and the running fix list.
