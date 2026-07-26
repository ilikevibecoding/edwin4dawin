# Agent Working Agreement — Northstar Rescue

Applies to every subagent work package. The lead (Opus 1) enforces these.

## Environment

- Dev server may already run at http://127.0.0.1:5173 (tmux session `vite-dev-server`). Do
  NOT kill it. If you need your own, run `npx vite --port <your assigned port> --strictPort`
  in a tmux session and point tools at it with `SERVER=http://127.0.0.1:<port>`.
- Screenshot/state pipeline: `SERVER=... node tools/capture.js <scenario...>` writes
  `artifacts/shots/*.png` + state JSON. Add scenarios for your needs in your OWN tool file
  (`tools/capture-<yourrole>.js`, copy the harness) rather than editing `tools/capture.js`.
- Quick QA in the browser: `/?qa=1&test=1` exposes `window.__qa` (teleport, freezeAI,
  spawnEnemy, setLighting('neutral'|'production'|'dark'|'emergency'), camera(checkpoint),
  cameraOrbit(x,y,z,radius,height,angle), gallery, showCollision, showNav) and the standard
  `window.render_game_to_text()` / `window.advanceTime(ms)` hooks.
- ALWAYS review your screenshots by reading the PNG files. Iterate until they meet the bar.

## Hard rules

1. Touch ONLY files inside your assigned ownership list. Never edit shared entry points
   (`index.html`, `src/main.js`, `src/game/game.js`, `package.json`, configs), `progress.md`,
   `docs/ownership-ledger.md`, or another agent's directories.
2. Consume cross-domain functionality through the stable interfaces:
   `getMaterial(name)` (materials), `registerAsset(id, meta)` (registry), `bus` events,
   `worldUVs()` (uv tiling), layout data from `src/map/layout.js`.
3. Register EVERY production asset via `registerAsset()` AND append an entry to your domain
   manifest `docs/manifest/<domain>.json` (create the file if missing; it's yours alone).
4. Zero console errors/warnings introduced. Verify with the capture tool output before finishing.
5. Performance budget: keep total scene < ~350k triangles and < ~450 draw calls at any
   camera; prefer merged geometry + shared materials. Check `window.__qa.perf()`.
6. Keep determinism: no `Math.random()` in gameplay-affecting code (cosmetic-only randomness
   should use `cosmeticRng` from `src/core/rng.js`).
7. Real-world scale (1 unit = 1m) and visual-bible conformance (`docs/visual-bible.md`).
8. Do not commit or push; the lead integrates. Leave the working tree with your changes.
9. Write your completion report to `docs/reports/<your-wp-id>.md`: what changed, asset IDs
   added, screenshots taken (paths), known issues, scores per the per-asset rubric.
10. The game must remain fully playable after your changes — run at least the `menu-flow`
    and `combat` capture scenarios to prove it.
