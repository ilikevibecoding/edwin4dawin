# ISD Vigilant — Imperial Star Destroyer demo

A first-person / exterior-orbit walkthrough of an Imperial-class Star Destroyer built with Vite and
Three.js. Everything is procedural: the 1,600 m hull, the interior decks, every texture (armour
plating, panels, decks, indicator grids, tactical screens, Aurebesh-style stencils, planets) is
generated in code at load. No downloaded models or textures; a personal, non-commercial fan project.

**Live demo** (updated hourly from the working branch):
https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/star-destroyer-play-14e2/index.html
(click "Open the page" if githack shows an interstitial once).

## Run

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # production bundle in dist/
npm run preview    # serve dist/ on 4173 (or: npx vite preview --port 5174)
```

Exterior view: drag to orbit, wheel to zoom, right-drag to pan, WASD/QE to fly, `1`–`8` camera
presets, `F` to board (flies to the bridge windows or the hangar well, then fades inside).
Interior: click to lock the pointer, `WASD` move, `Shift` sprint, mouse look, `E` interact (consoles,
keypads, turbolift panels — then `1`–`3` to pick a deck), `F` back to the exterior, `F3` stats overlay.

## What is in the ship

Exterior (`src/exterior/`): lofted wedge hull with knife-edge trenches, keel with the hangar and
shuttle launch wells cut through it, stepped dorsal superstructure, command tower with bridge module,
shield domes and sensor mast, seven thrusters, reactor bulb; instanced surface detail with LOD.

Interior (`src/interior/`): four decks (bridge deck, crew deck, engineering, ventral hangar) with
28 rooms, 7 corridors, 4 turbolift lobbies and 8 turbolift cabs — see `docs/SHIP_PLAN.md` for the
full list and `src/config/layout.js` for every coordinate. Doors open automatically as you approach
(locked doors need the keypad), turbolifts ride between decks, rooms stream in and out around you.

Hangar (`src/hangar/`): TIE fighters on ceiling racks launch down through the ventral well, fly
patrol loops around the ship and return; scripted pilots behind a `PilotController` hook.

## Tooling

```sh
node tools/shot.mjs --url http://127.0.0.1:5173/ --out /tmp/s --view bridge --ext reveal   # screenshots
node tools/shot.mjs --list                                                                 # view names
node tools/review.mjs <label>        # full review: every view + navigation tests -> shots/review_<label>/
tools/publish.sh                     # build + push the live demo (FROM_HEAD=1 builds the last commit)
```

Headless Chromium in the development container runs software GL, so frame times reported by the
tools are not GPU-representative; draw calls, triangles, programs, heap and build times are.

## Layout of the source

- `docs/` — `SHIP_PLAN.md` (scale, hierarchy, build order), `WORKSTREAMS.md` (conventions for the
  room/exterior workstreams), `API.md` (debug API, traffic/pilot hooks, sync, reserved flight
  systems), `REVIEW_RUBRIC.md`
- `src/main.js` — renderer, scene, build order, main loop, `window.debugAPI`
- `src/config/layout.js` — the single source of truth for all dimensions
- `src/core/` — `frame.js` (plane frames), `zone.js` (rooms + streaming), `lightpool.js`,
  `perf.js`, `audio.js` (procedural ambience/events), `sync.js` (network snapshots)
- `src/materials/` — Imperial palette, material library, procedural textures
- `src/interior/` — `impKit.js` (shared props), `shell.js`, `corridors.js`, `doors.js`, `lifts.js`,
  `rooms/<cluster>/*.js`
- `src/exterior/` — `hull.js`, `greebles.js`
- `src/hangar/` — `tie.js`, `shuttle.js`, `traffic.js`
- `src/camera/` — exterior orbit camera, mode manager with transitions
- `src/systems/flight.js` — reserved flight / landing / docking interfaces (no gameplay yet)
- `docs/SHIP_PLAN.md`, `docs/WORKSTREAMS.md`, `PROGRESS.md`
