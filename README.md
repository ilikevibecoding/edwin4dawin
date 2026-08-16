# DSV Tethys — a deep-sea submarine walkthrough

A small first-person demo where you walk continuously through the interior of a
deep-sea expedition submarine — from the forward control room, down the
corridor past the crew quarters, and into the aft machinery and propulsion
compartment. Outside the viewports: floodlit rock, marine snow, and open black
water at 213 m.

Everything is procedural. Every mesh, texture, normal map, label, decal and the
underwater environment is generated in code (JavaScript canvas + Three.js
geometry) — no downloaded models, textures, HDRIs or audio.

## Run it

```bash
npm install
npm run dev       # dev server (prints a local URL)
npm run build     # production bundle to dist/
npm run preview   # serve the production build
```

Open the URL, click to capture the mouse, and walk.

## Controls

| Input | Action |
| --- | --- |
| Click | Capture mouse (pointer lock) |
| `W A S D` | Move |
| Mouse | Look |
| `E` | Interact (sonar ping, bunk rest, silent running switch) |
| `Esc` | Release mouse |

Interactables highlight a prompt when centered: the sonar console in the
control room, a bunk in the crew quarters, and the silent-running switch.
Lighting states (cruising / rest cycle / silent running) crossfade the whole
boat.

## Test suite

Deterministic Playwright suite: renders ten canonical camera views and runs
pointer-lock, movement, collision, full bow-to-stern traversal, sonar, rest and
silent-running interaction tests against a frozen simulation time.

```bash
npm run shots         # full suite -> shots/iter_N/ (see tools/shots.mjs)
npm run shot -- --views porthole --out shots/tmp   # render specific views
```

The app exposes `window.debugAPI` (camera poses, sim-time control, interaction
triggers, metrics) for the suite; see `src/debug.js`.

## Project layout

- `src/` — engine and content modules (hull, rooms, machinery, water,
  lighting, player, interactions, post pipeline). Module ownership and
  engineering contracts are documented in `ART_DIRECTION.md`.
- `tools/` — Playwright tooling: `shots.mjs` (full suite), `shot.mjs`
  (single-view renders), probe scripts for pixel/scene debugging.
- `ART_DIRECTION.md` — visual language, palette, canonical dimensions,
  budgets, module contracts.
- `PROGRESS.md` — iteration log: rubric scoring, metrics, and fix lists for
  the autonomous development loop that built this.
