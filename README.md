# Trailhead

First-person walk-around and arcade drive of a procedurally built Jeep on a dirt two-track in a pine forest. Vite + Three.js. No downloaded models or textures.

## Play it

Self-contained `demo/index.html` (no runtime fetches). Needs WebGL2.

| Link | |
|------|--|
| [rawcdn.githack.com](https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/cursor/jeep-forza-demo-2084/demo/index.html) | CDN edge, runs the demo |
| [htmlpreview](https://htmlpreview.github.io/?https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/jeep-forza-demo-2084/demo/index.html) | Renders from raw GitHub |
| [cdn.jsdelivr.net](https://cdn.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@cursor/jeep-forza-demo-2084/demo/index.html) | Fastest raw file; jsDelivr serves `.html` as text |

## Run

```bash
npm install
npx playwright install chromium
npm run dev
```

Click the canvas to lock the pointer.

- **On foot:** WASD walk (W is forward along your look), mouse look, E to climb in / lights / engine
- **In the Jeep:** WASD drive (W throttle, S brake/reverse, A/D steer), C chase/cockpit camera, E climb out
- Space is a handbrake. Shift sprints on foot.

## Beauty shots

```bash
npm run dev
node tools/shots.mjs --iter 1
```

Screenshots land in `shots/iter_N/`. The harness talks to `window.debugAPI.setView(name)`.

## Modules

| File | Owns |
|------|------|
| `src/player.js` | First-person capsule, pointer lock, chase/cockpit cameras |
| `src/drive.js` | Arcade throttle, steer, terrain follow |
| `src/vehicle/*` | Jeep body, wheels, interior, lights, kit-bash details |
| `src/forest.js` | Designed pine corridor along the trail |
| `src/road.js` | Dirt two-track, ruts, puddles, rocks |
| `src/interact.js` | Prompts and climb in / lights / engine |
| `src/post.js` | ACES, bloom, GTAO, vignette, grain |
| `src/main.js` | Boot, loop, debug API |

See `PROGRESS.md` for the scoring loop and `AGENT_BRIEF.md` for per-asset ownership.
