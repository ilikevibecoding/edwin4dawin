# Trailhead

First-person walk-around of a procedurally built Jeep on a dirt two-track in a pine forest. Vite + Three.js. No downloaded models or textures.

## Run

```bash
npm install
npx playwright install chromium
npm run dev
```

Click the canvas to lock the pointer. WASD to walk, mouse to look, E to interact (climb in, headlights, check engine).

## Beauty shots

```bash
npm run dev
node tools/shots.mjs --iter 1
```

Screenshots land in `shots/iter_N/`. The harness talks to `window.debugAPI.setView(name)`.

## Modules

| File | Owns |
|------|------|
| `src/player.js` | First-person capsule, pointer lock, head bob |
| `src/vehicle/*` | Jeep body, wheels, interior, lights, kit-bash details |
| `src/forest.js` | Pines, deciduous trees, undergrowth |
| `src/road.js` | Dirt two-track, ruts, puddles, rocks |
| `src/interact.js` | Ray-adjacent prompts and the three interactions |
| `src/post.js` | ACES, bloom, GTAO, vignette, grain |
| `src/main.js` | Boot, loop, debug API |

See `PROGRESS.md` for the scoring loop and `AGENT_BRIEF.md` for per-asset ownership.
