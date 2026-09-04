# Kestrel — first-person spaceship interior demo

A small first-person walkthrough of a Star Wars-style ship interior in flight, built with Vite and
Three.js. Everything is procedural: geometry is kit-bashed from primitives, every texture (albedo,
roughness/metalness, normal, emissive, decals, planets, nebulae) is generated on a canvas at load.
No downloaded models or textures.

Rooms: main corridor with two portholes, cockpit with a slanted viewport, crew quarters with a bunk,
galley, bathroom. Three interactions (bed, galley dispenser, sink) via raycast from screen centre.

## Run

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # production bundle in dist/
```

Click to lock the pointer. `WASD` to move, mouse to look, `E` to interact, `F3` for the stats overlay.

## Screenshot harness

```sh
npm run shots -- <iteration>          # shots/iter_<N>/*.png + results.json
SHOT_QUICK=1 SHOT_VIEWS=cockpit,window npm run shots -- <iteration>   # partial re-check
```

`tools/shots.mjs` drives headless Chromium through `window.debugAPI` (`setView`, `advanceSky`,
`capturePixels`, `lookAt`, `interact`), captures the four rubric views plus QA views, measures sky
drift against an interior control region, and exercises all three interactions.

## Layout

- `src/main.js` — renderer, scene, environment capture, adaptive quality, debug API, loop
- `src/player.js` — pointer-lock first-person controller, capsule-vs-box collision, head bob
- `src/ship.js` — the ship interior (corridor, cockpit, quarters, galley, bathroom, lights)
- `src/space.js` — starfield layers, planets with atmosphere halos, rings, nebulae, dust, drift
- `src/interact.js` — hover highlight, prompts, the three scripted events
- `src/post.js` — N8AO → bloom → ACES/sRGB → SMAA → vignette/grain/shadow-lift
- `src/kit.js`, `textures.js`, `materials.js`, `lighting.js`, `hud.js` — helpers
- `PROGRESS.md` — iteration log with rubric scoring
