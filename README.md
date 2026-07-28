# Northstar Rescue

A single-player tactical first-person shooter that runs in the browser. A response operator enters
the **Northstar Administrative Center** — a snowbound regional headquarters cut off by a winter
storm — to locate two civilian hostages, secure them, escort them to the vehicle bay and extract.

Everything in this repository is original and generated from code. There are **no binary asset
files**: all geometry is built from primitives at load time, all textures are painted into offscreen
canvases and derived into full PBR sets, and all audio is synthesised with the Web Audio API.

---

## Play it from a link (nothing to install)

`npm run build:cdn` folds the whole game into one self-contained file — no external
requests, because every texture, mesh and sound is generated in code — so it plays straight from a
CDN at **full quality**. Same code, same assets, same `high` graphics preset as running it locally;
nothing is stripped.

**Primary link (jsDelivr):**

<https://cdn.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@v1.0.1/dist/northstar-rescue.xhtml>

Mirrors, in case one is blocked or slow in your region — all of these are the identical file and were
each verified to boot and reach gameplay:

| Host | Link |
| --- | --- |
| jsDelivr (Fastly) | `https://fastly.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@v1.0.1/dist/northstar-rescue.xhtml` |
| jsDelivr (Gcore) | `https://gcore.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@v1.0.1/dist/northstar-rescue.xhtml` |
| jsDelivr (Quantil) | `https://quantil.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@v1.0.1/dist/northstar-rescue.xhtml` |
| githack (CDN) | `https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/v1.0.1/dist/northstar-rescue.xhtml` |
| githack (direct) | `https://raw.githack.com/ilikevibecoding/edwin4dawin/v1.0.1/dist/northstar-rescue.xhtml` |
| htmlpreview | `https://htmlpreview.github.io/?https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/v1.0.1/dist/northstar-rescue.html` |

Click the canvas to capture the mouse. Expect 15–60 s on first load while the textures, geometry and
navigation mesh are generated — the loading screen names each step. Add `?qa=1` to any link to enable
the development tools.

### Why the published file is `.xhtml`

Every pure CDN — jsDelivr, `raw.githubusercontent.com`, statically — deliberately serves `.html` as
`text/plain` so it cannot be used to host web pages, which means a browser shows the source instead
of running the game. `.xhtml` is served as `application/xhtml+xml`, which browsers render. Two things
break inside an XML document, and both are handled at the packaging layer so the game source stays
ordinary HTML-targeting code: Chromium will not run module scripts in XML
([crbug.com/717643](https://crbug.com/717643)), so that flavour is built as a classic IIFE; and
`innerHTML` demands well-formed XML, so `tools/xml-compat-shim.js` routes it through the HTML parser.
The `.html` flavour is the plain inline-module build, for local use and for hosts that serve real
`text/html`.

## Run it locally

```bash
npm install
npm start
```

Then open **<http://127.0.0.1:5173>** in a Chromium-based browser. You can also just open
`dist/northstar-rescue.html` from disk — it needs no server.

The first load spends 15–60 s generating textures, geometry and the navigation mesh; the loading
screen reports each step. A production build is `npm run build` followed by `npm run preview`.

| Command | What it does |
| --- | --- |
| `npm start` | Vite dev server on `127.0.0.1:5173` — **the documented way to run the game** |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serve the production bundle on `127.0.0.1:4173` |
| `npm test` | The full Playwright scenario matrix (63 tests) |
| `npm run build:cdn` | Single-file bundles (`.html` inline module, `.xhtml` for CDNs) |
| `npm run shots` | Capture the canonical screenshot matrix into `artifacts/screenshots/` |

Append `?qa=1` to the URL to enable development tools (QA panel on `` ` ``, perf overlay on `F3`,
asset gallery). The normal player build exposes none of it.

---

## Controls

| Action | Binding |
| --- | --- |
| Move | `W` `A` `S` `D` |
| Look | Mouse (click the canvas to capture the pointer) |
| Slow walk (quiet) | `Shift` |
| Crouch | `Ctrl` or `C` (hold, or toggle — see Settings) |
| Jump | `Space` |
| Fire | Left mouse |
| Aim down sights | Right mouse (hold, or toggle) |
| Reload | `R` |
| Interact / secure hostage | `E` (hold for timed actions) |
| Weapon slots | `1` primary, `2` secondary, `3` knife, `4` flash, `5` smoke |
| Last weapon | `Q` |
| Throw flash / smoke | `G` / `H` |
| Inspect weapon | `I` |
| Objectives (full list) | Hold `Tab` |
| Minimap | `M` |
| Fullscreen | `F` (`Esc` exits fullscreen) |
| Pause | `Esc` |

Every binding is rebindable on the Controls screen. The mission briefing carries the detailed
instructions; the in-game HUD deliberately stays minimal.

---

## Architecture

```
index.html            single primary <canvas> + a DOM overlay for HUD and menus
src/main.js           bootstrap; installs the automation contract on `window`
src/game.js           the Game object: state machine, system wiring, text-state contract

src/core/             engine (fixed-timestep loop, resize, quality), input, events,
                      settings, seeded RNG, asset registry, static batching
src/physics/          collision world: AABB grid broadphase, slab raycast, capsule sweep
src/art/              colour script, tileable noise, procedural PBR texture factory,
                      material families
src/map/              floor-plan data, modular architecture kit, level builder, doors,
                      lighting rig, architecture manifest
src/props/            prop library, room-by-room populator, prop manifest
src/characters/       rig, animation, enemy and hostage models, weapon models, view model
src/player/           first-person controller, combat and hit resolution
src/weapons/          weapon definitions and the weapon system
src/ai/               navigation grid, perception, enemy behaviour, hostage behaviour
src/mission/          objectives, difficulty presets, mission director
src/fx/               effects, decals, weather, post-processing
src/audio/            synthesised sound engine, sfx/vox/ambience/music recipes
src/ui/               UI manager, HUD, minimap, icons, one module per screen
src/qa/               development-only QA mode and asset gallery
tests/                Playwright scenario matrix
tools/                screenshot matrix, room audit, diagnostic probes
docs/                 manifest, ledger, checklists, known issues, visual bible
```

### Conventions everything obeys

- **Units are metres.** Y-up, right-handed: +X east, +Y up, +Z south, so **−Z is north**, the front
  of the building. Yaw 0 faces −Z and increases counter-clockwise seen from above; positive pitch
  looks up.
- **Simulation runs at a fixed 1/120 s timestep** behind an accumulator, decoupled from rendering.
  Systems register as *fixed* (gameplay, frozen on pause), *frame* (presentation, also frozen on
  pause) or *realtime* (menus, transitions, QA — never frozen).
- **Every random draw comes from a seeded stream** (`src/core/rng.js`), so procedural art and
  gameplay rolls replay identically and screenshot comparisons mean something.
- **Every production asset is registered** in `src/core/assets.js` and mirrored in
  `docs/asset-manifest.md`. An object tagged with an unregistered ID warns at load and fails
  `tests/assets.spec.js`.
- **Walls are derived from the room rectangles**, not hand-placed, which is what guarantees no gap
  can open between rooms and every partition runs to the structural deck so light cannot leak.

### Rendering

Three.js r169 on WebGL2, forward-rendered with one shadow-casting directional sun whose frustum is
fitted to the player, a hemisphere fill tuned to snow bounce, and a pool of local fixtures of which
only the nearest N are enabled each frame. Static geometry is merged per material into
spatially-bucketed batches after the level is built (~5 600 meshes into ~870 batches), and the
shadow map refreshes on a cadence set by the quality preset. A hand-rolled composite pass adds
restrained bloom, a cold-blue/warm-tungsten grade, vignette, grain and FXAA. The first-person
weapon renders in a separate overlay scene with its own camera and a cleared depth buffer, so it can
never intersect the world.

---

## Automation contract

```js
window.render_game_to_text()   // concise JSON of the player-relevant simulation state
window.advanceTime(ms)         // deterministically advance the simulation, then render
window.__NORTHSTAR__           // the Game instance
window.__NORTHSTAR_QA__        // QA API — only when QA mode is enabled
window.__NORTHSTAR_READY__     // true once the level has finished building
```

`render_game_to_text()` reports the coordinate convention, game mode, player position/orientation/
velocity/health/armour/movement state, active weapon with magazine and reserve ammunition, mission
timer and objective states, hostage states, relevant enemies, nearby doors and interactables, the
HUD snapshot, performance counters and the victory/defeat outcome.

`advanceTime(ms)` feeds the engine in 80 ms slices so arbitrarily large values are fully simulated
with no clamping — the same inputs produce the same state twice.

See `docs/playwright-scenarios.md` for the scenario matrix and what each one proves.

---

## Documentation

| File | Contents |
| --- | --- |
| `progress.md` | The original project prompt (immutable), stack decisions, phase log, integration findings |
| `docs/asset-manifest.md` | Every registered asset with its full metadata |
| `docs/ownership-ledger.md` | Agent ownership, interface contracts, task log |
| `docs/visual-bible.md` | Colour script, shape language, material and scale standards |
| `docs/visual-quality-checklist.md` | Checkable visual requirements plus the room-by-room verdict |
| `docs/playwright-scenarios.md` | Scenario checklist and current pass state |
| `docs/known-issues.md` | Ranked defect list with owners |
| `docs/screenshot-index.md` | Before-and-after and graybox-to-final evidence index |
| `artifacts/` | Screenshot matrix, room audit, performance summary, per-test state dumps |

---

## Originality

No Counter-Strike, Valve or other third-party asset, source file, texture, sound, animation, model,
name, logo or map layout was used or reproduced. The map is an original two-storey plan with its own
footprint, adjacency graph and sightline structure; it is not a reproduction of `cs_office` or any
other existing level. All company, room, character and weapon names and all insignia are invented
for this project. Every texture and sound is generated procedurally by code in this repository.
