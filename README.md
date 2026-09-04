# IRONVEIL RANGE — first-person interceptor base demo

A polished first-person defense demo built with **Three.js**: operate fictional interceptor
batteries at a desert air-defense test range while ballistic threats descend through the
atmosphere. Everything — terrain, vehicles, launchers, textures, audio — is generated
procedurally in code. No downloaded assets.

> **Fictional entertainment demo.** Systems are loosely visually inspired by publicly
> recognizable platforms (Patriot / THAAD) but every range, speed, radar behavior, guidance
> rule and probability is invented and tuned purely for gameplay. Nothing here reflects real
> procedures or performance.

## Run

Requires **Node.js 20.19+ (or 22.12+)** and npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build (static site, deployable to any web host or CDN):

```bash
npm run build      # outputs dist/ with relative paths
npm run preview    # serve the build at http://localhost:4173
```

## Play

- **WASD** move · **SHIFT** sprint · mouse look (click to lock pointer)
- **Q** raises the handheld **TACOM pad** anywhere on the base: tactical radar
  plot, per-track ASSIGN/FIRE buttons, battery chips, ENGAGE ALL, and raid
  setup (conditions/scenario/start) — no need to walk back to the C2 shelter
- Press **TAB** anywhere (or walk to the C2 shelter console and press **E**)
  for the full fire-direction console
- Console: pick **conditions** (day/sunset/night), a **scenario**
  (`SINGLE TRACK`, `SATURATION`, `NIGHT RAID`), a **battery**, then
  **START BALLISTIC MISSILES**
- Select a track on the radar display or list → **ASSIGN** → **AUTHORIZE LAUNCH**
- Outdoors: look at a tracked threat → **E** assigns, **F** fires.
  Press **F** again to salvo more interceptors at the same threat (fire
  control automatically rolls to the next ready battery while one reloads);
  press **1/2/3** mid-engagement to re-point a specific battery at it.
  With nothing aimed, **F** engages the most urgent track automatically.
- Engagements are **per track and concurrent**: assign several tracks at once,
  put one battery on several missiles (rounds queue and fire as it cycles),
  or several batteries on one missile. Queued rounds show as `Q n` badges.
- **V** cycles cinematic chase cams: ride the newest interceptor out
  (missile cam), then the most urgent inbound threat, then back to first person.
- **1/2/3** select battery · **H** settings (reduced motion, volume, quality) · **R** restart after debrief

## Batteries (fictional)

| System | Style | Profile |
|--------|-------|---------|
| RAMPART PX-4 | Patriot-inspired | fast, agile, terminal-phase, 8 rounds |
| HALBERD HA-9 | THAAD-inspired | slower spin-up, high-altitude window, 6 rounds |
| SENTINEL LR-1 | entirely fictional | 3 rounds, longest reach, biggest plume |

## Tests

One-time setup: `npx playwright install chromium` (downloads the test browser).

```bash
npm test           # Playwright: deterministic gameplay + boot + budgets
npm run shots      # deterministic screenshot sweep into shots/
```

The game exposes a deterministic test API on `window.__game` (seeded RNG + fixed-step
`step()` driving), which the Playwright suites use.

## Code map

`src/main.js` integration + game state · `player.js` FPS controller · `base.js` terrain/base ·
`batteries.js` launchers · `threats.js` ballistic threats · `interceptors.js` guidance ·
`physics.js` flight math + collision · `radar.js` tracking/PPI/holo display · `effects.js`
particles/trails/explosions · `weather.js` sky/time-of-day · `audio.js` procedural WebAudio ·
`post.js` composer chain · `ui.js` HUD/console DOM · `textures.js` canvas textures ·
`util.js` RNG/pool/events.

See `PROGRESS.md` for the iteration log and rubric scoring.
