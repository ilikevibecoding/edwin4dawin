# CASTELLAN RIDGE — Ballistic Missile Interceptor Range (Fictional Demo)

A polished first-person defense demo built with [Three.js](https://threejs.org/). You operate three fictional
interceptor batteries at a desert test range while ballistic practice targets descend through the atmosphere.
Everything — terrain, base, launchers, missiles, smoke, UI, audio — is generated procedurally in code.
No downloaded models, textures, or sounds.

> **Safety & realism boundary** — This is a fictional entertainment experience. Battery silhouettes are
> *visually inspired* by recognizable platforms (Patriot / THAAD), but every range, speed, radar behavior,
> guidance rule, probability and procedure in this demo is invented and balanced purely for gameplay.
> Nothing here reflects how real air-defense systems work.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # Playwright: deterministic gameplay tests + visual gallery (shots/)
```

## How to play

1. Click **ENTER THE RANGE** (pointer lock, WASD + Shift, mouse look).
2. Walk to the command shelter (TOC) and press **E** at the console — or press **TAB** anywhere.
3. Pick conditions (day / sunset / night) and a scenario, then press **START BALLISTIC MISSILES**.
4. Watch the radar sweep detect inbound tracks on the holographic display.
5. Select a track (click its holo blip or list row), select a battery, **ASSIGN**, then **AUTHORIZE LAUNCH**.
6. Outdoors: look at a tracked threat — press **E** to assign the selected battery, **F** to authorize.
7. Read the debrief, press **R** to restart instantly.

| Battery | Style | Fictional niche |
|---|---|---|
| **RAMPART** | Patriot-inspired box canisters | fast, low-altitude terminal defense |
| **ZENITH** | THAAD-inspired erecting tube rack | slow prep, wide high-altitude window |
| **SENTINEL LR-X** | entirely fictional twin silo | two rounds, longest reach, maximum spectacle |

Scenarios: `SINGLE TRACK`, `SATURATION` (3–5 arcs), `NIGHT RAID` (targets + harmless decoys, searchlights).

## Controls

`WASD` move · `Shift` sprint · `mouse` look · `E` interact / assign · `F` authorize · `1·2·3` battery ·
`TAB` console · `R` restart · `H` help · `M` mute · `F3` performance HUD · `ESC` pause (click to re-enter).
Reduced-motion setting (start screen) disables head-bob and camera shake.

The fixed-timestep simulation self-corrects on slow machines (up to 0.25 s of catch-up per
frame), and an adaptive quality scaler steps down post-processing, pixel ratio and shadows
if the frame rate can't hold.

## Testing hooks

The page exposes `window.__game` (deterministic seed via `?seed=`, manual stepping via `?manual=1`) used by
the Playwright suites in `tests/`. `npm test` runs gameplay assertions and captures the screenshot gallery
used for visual QA in `shots/`.

`node cinematic.mjs` renders a smooth 24 fps demo video of the deterministic sim offline: it steps the game
exactly 1/24 s per frame, screenshots every frame into `cine/`, and the frames assemble with
`ffmpeg -framerate 24 -i 'cine/f%05d.jpg' …`. `SAVE_FROM=<n>` skips re-screenshotting frames before `n`
(the sim is deterministic, so partial re-captures after storyboard-only edits are safe).

## Module map

`src/main.js` wiring + loop · `player.js` FPS controller · `base.js` terrain + base · `batteries.js` launchers ·
`threats.js` inbound targets · `interceptors.js` guidance · `physics.js` shared flight math · `radar.js` tracks + holo display ·
`effects.js` pooled particles/trails/explosions · `weather.js` sky/lighting/wind · `audio.js` procedural WebAudio ·
`post.js` bloom/grade chain · `ui.js` HUD + console DOM.
