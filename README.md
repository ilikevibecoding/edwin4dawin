# AEGIS POINT — Interceptor Base Demo

A fictional first-person defense game set at a desert missile-interceptor base, built with
[Three.js](https://threejs.org/) and Vite. You operate three interceptor batteries while ballistic
threats descend through the atmosphere: track them on radar, assign a battery, authorize launch,
and watch the intercept play out in the sky.

Everything is procedural — no downloaded models, textures, or audio. Geometry is kit-bashed from
primitives and instancing, textures are canvas-generated, the sky is a custom shader, and all
sound is synthesized with the Web Audio API.

> This is a fictional entertainment experience, not a simulator. All systems, ranges, speeds,
> radar behavior, and procedures are invented and balanced purely for gameplay.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Playwright suite (deterministic, headless)
```

## How to play

1. Walk into the command shelter (WASD + mouse, `Shift` to sprint) and use the console (`E`).
2. Pick conditions (day / sunset / night), a scenario, and a battery, then press
   `START BALLISTIC MISSILES`.
3. Engage from the console: click a track on the scope, `ASSIGN`, then `AUTHORIZE LAUNCH` —
   or walk outside, look at a tracked threat, press `E` to assign and `F` to authorize.
4. Results are graded: intercepted, missed, decoy engaged, or base impact. `R` restarts.

| Key | Action |
|-----|--------|
| WASD / mouse | Move / look (pointer lock) |
| Shift | Sprint |
| E | Interact with console / assign aimed track |
| F | Authorize launch |
| 1 / 2 / 3 | Select battery |
| G | Toggle auto-engage |
| R | Restart scenario |
| Esc | Leave console |

## Scenarios

- `SINGLE TRACK` — one highly visible inbound target.
- `SATURATION` — 3–5 targets on different arcs within a short interval.
- `NIGHT RAID` — several targets plus harmless decoys, searchlights, and warning strobes.

## Batteries

- **PAC-X VANGUARD** — Patriot-inspired terminal battery: fast response, short window, agile.
- **HALO-9** — THAAD-inspired high-altitude battery: slower cycle, broad window, long contrails.
- **SENTINEL LR-1** — fictional long-range silo: limited rounds, biggest plume, most dramatic kill.

## Tech notes

- Modular source: `player`, `base`, `batteries`, `threats`, `interceptors`, `physics`, `radar`,
  `effects`, `weather`, `audio`, `post`, `ui`, `main` under `src/`.
- Object pooling for missiles, trails, particles, debris, flashes, and rings.
- Seeded RNG (`?seed=N`) for reproducible runs; `?test=1` exposes the automation API used by
  the Playwright suite (`tests/game.spec.js`) and the screenshot/video tools in `tools/`.
- Post pipeline: bloom, luminance-split grade, FXAA, dynamic resolution scaling (60 fps target).
- Iteration history, rubric scores, and observations live in `PROGRESS.md`.
