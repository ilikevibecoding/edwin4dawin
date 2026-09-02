# SEASIDE STRIKE

A Call of Duty–style first-person shooter built from scratch in **Three.js** (r185) with `postprocessing`, `n8ao`
and **Rapier** physics. Sunlit Mediterranean seaside plaza, M4A1 carbine with holographic sight, AI soldiers,
Domination-style objective, and a callable **air strike** killstreak.

## Play

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/ (relative base: runs from any sub-path)
npm run publish:play # build HEAD, snapshot dist/ onto the `cursor/play-6ead` branch, print a playable raw-CDN URL
```

Needs a WebGL2 browser with hardware acceleration (Chrome/Edge/Firefox on a desktop GPU); first load pulls
~170 MB of CC0 textures/models.

| Input | Action |
|---|---|
| Mouse | Look · **LMB** fire · **RMB** aim down sights |
| **W A S D** | Move · **Shift** sprint · **Ctrl / C** crouch · **Space** jump |
| **R** | Reload · **V** inspect weapon |
| **X** / **4** | Air strike (when ready) — opens the targeting map; click a location, **Esc** cancels |
| **F1** | Toggle HUD · **Esc** pause |

URL parameters: `?quality=potato|low|medium|high|ultra` (`potato` = half-resolution fallback for software GL / weak iGPUs), `&fov=62`, `&streaks=1` (air strike available immediately),
`&noEnemies=1`, `&god=1`, `&debug=1` (stats overlay), `&arms=<candidate>` (first-person arms variant),
`&msaa=0|2|4|8` (hardware MSAA on the HDR scene buffer; `high`/`ultra` default to 4×, resolved before the effects and
followed by SMAA).

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — game context, update order, event catalogue, physics and
rendering conventions, module ownership.

```
src/core        game loop, input, asset loader, Rapier wrapper, settings, debug/screenshot API
src/rendering   renderer, HDRI sky + analytic sun (cascaded shadow maps), N8AO, bloom, MSAA + SMAA, grading, camera FX
src/world       Seaside plaza: procedural buildings, plaza pattern, fountain/statue, props, trees, nav graph, minimap
src/weapons     M4A1 rig + view-model animator, worn-Cerakote surface shader + load-time AO/edge-wear bake,
                attachments (EXPS holo, Cronen rear sight, hand stop, PEQ laser, sling, receiver roll marks),
                procedural first-person arms (knit/leather glove, skin, sleeve) fitted to the rig sockets
src/ai          AI soldiers (Mixamo rig), pathing, cover, shooting, hitboxes, deaths
src/combat      hitscan, damage, explosions
src/fx          GPU particles, decals, muzzle flash, tracers, casings, explosions, debris
src/killstreaks air strike: targeting overlay, jets, bombs
src/ui          COD-style HUD, minimap, killfeed, hitmarkers, menus
src/audio       fully synthesized Web Audio sound design (no sound files)
src/game        match flow (objective, waves, score, respawn)
```

## Assets

All external assets are **CC0** and downloaded by `npm run fetch-assets` (`tools/asset-manifest.json`):
[Poly Haven](https://polyhaven.com) textures / HDRI / props, the [3dmodelscc0](https://3dmodelscc0.itch.io/free-cc0-guns-explosives-pack)
M4A1 & AK-47, and the three.js example `Soldier.glb` (Mixamo). Everything else (arms, holo sight, plaza pattern,
particles, decals, UI, audio) is generated procedurally at runtime.

## Visual review tooling

```bash
node tools/shot.mjs --out /tmp/shots/a.png --view weapon_hero --w 1600 --h 900     # deterministic headless screenshot
node tools/shot.mjs --list                                                           # registered review views
node tools/view.mjs "m=/assets/models/weapons/M4A1.glb&v=side&axes=1" /tmp/m4.png   # isolated model viewer
node tools/shot.mjs --record /tmp/demo --seconds 24 --fps 30 --w 1280 --h 720 --quality medium \
     --script tools/scripts/demo_gameplay.js                                         # deterministic gameplay video
```

Screenshots run in headless Chrome with software GL (slow but reproducible) and were used for the side-by-side
visual critique loop against Call of Duty reference frames during development. `--record` steps the fixed 60 Hz
simulation frame by frame (scripted input via `input.press/release/look`), draws only the captured frames and
encodes an MP4 with ffmpeg, so gameplay videos come out at full frame rate even on software GL.
