# Bahía Vista — seaplane over an original tropical coastal metropolis

A browser flight experience (Three.js / WebGL2, TypeScript, Vite). You fly a procedurally built bush
floatplane over a 20 km × 20 km coastal city inspired by the *feel* of a Vice-City-style bay: a dense
downtown skyline on the mainland, a long barrier island with beachfront hotels, causeways with arched
channel spans, small residential islands, mangrove wetlands, sandbars, a port with cranes and a cruise
terminal, an airport, a stadium, golf courses, marinas, and boat traffic leaving wakes. Every asset is
generated in code at start-up (geometry, textures, world layout) — nothing is copied from any game.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # static build in dist/
npm run preview    # serve dist/ on http://127.0.0.1:4173
```

Controls: `Shift`/`Ctrl` throttle (or mouse wheel), `W`/`S` pitch (S pulls the nose up), `A`/`D` roll,
`Q`/`E` rudder / water rudder, `F` flaps, `B` brakes, `C` chase ↔ cockpit camera, `V` cockpit, mouse drag
orbits the chase camera, `T` advances the time of day, `Y` cycles weather, `R` resets to the seaplane
base, `G` spawns airborne, `H` hides the HUD.

URL parameters: `?quality=low|medium|high|ultra`, `?time=<hour>`, `?weather=clear|scattered|cloudy|storm`,
`?seed=<n>`.

## Deterministic benchmark mode

`?bench=<view>` freezes the world in one of the canonical views (`aerial-a`, `cockpit-city`, `bridge-low`,
`skyline-high`, `island-pass`, `harbor`, `water-landing`, `sunset`, `cloudy`, `night`, plus the aircraft
inspection views `plane-rear-quarter`, `plane-front-quarter`, `glass-sun`). Every view fixes camera, time,
weather, seeds, aircraft state and pre-simulates the world with a fixed timestep, so two captures of the
same build are pixel-identical. `window.__bench` exposes `step(n)`, `render()`, `renderSync()`,
`profile(n)`, `metrics()`, `landmarks()` for the capture scripts.

```bash
npm run preview &                                   # serve the build on :4173
node bench/scripts/capture.mjs --tag iterNN         # stills, flight stills, clips, metrics, console
python3 bench/scripts/postprocess.py --tag iterNN --results   # 8x8 grid overlays, crops, flicker, JPEG copies
python3 bench/scripts/metrics.py --tag iterNN       # objective composition metrics vs the reference
python3 bench/scripts/aggregate.py --tag iterNN     # median critic scores, disagreements, score tables
node bench/scripts/flighttest.mjs                   # automated takeoff / climb / turn / stall / landing test
```

The reference analysis lives in `bench/reference/` (the reference frame is a visual reference only and is
never loaded by the game). Critic protocol and rubric: `bench/CRITIC_PROTOCOL.md`, `bench/rubric.json`.
Per-round results (scores, defects, metrics, compact frames): `bench/results/<tag>/`.

## Deploy

`bash tools/publish-pages.sh` builds, stamps a build id, and pushes the static site to the `gh-pages`
branch. It prints the live links (see `CHANGELOG.md` for the current build id). GitHub Pages must be
enabled once by a repository admin for `https://ilikevibecoding.github.io/edwin4dawin/`; until then
the `play.html` entry served through githack (with the assets on jsDelivr) is the working live link.

## Layout

- `src/world/` geography (`map.ts`), terrain clipmap, water, sky + clouds, atmosphere, roads, bridges,
  city/facades, vegetation, props, traffic
- `src/plane/` aircraft geometry, canvas PBR textures, model, flight model, cameras, effects
- `src/render/` post pipeline (aerial perspective, cloud shadows, bloom, grade), wake render target
- `src/bench/` deterministic benchmark views and driver
- `bench/` reference package, capture/analysis scripts, results
