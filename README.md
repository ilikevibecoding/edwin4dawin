# ISD *Vigilance* — Imperial Star Destroyer (exterior + explorable interior)

A first-person / orbit-camera walkthrough of a 1,600 m Imperial-class Star Destroyer built with Vite
and Three.js. Everything is procedural — hull, plating, superstructure, TIE fighters, 25 rooms across
five decks, every texture — generated in code from primitives and canvas textures. No downloaded
models or textures, so nothing proprietary is copied; the Star Wars visual language (wedge hull,
tiered superstructure, twin deflector domes, ISD bridge with crew pits, black-floored white corridors,
ventral hangar with TIE racks) is recreated with original geometry.

The Kestrel light-freighter demo this grew out of is kept intact in `src/ship.js` (see
`PROGRESS.md` Part I).

## Run

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # production bundle in dist/
npm run publish    # build + push dist/ to the play branch (live demo link below)
```

Live demo (latest published build): https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/star-destroyer-play-c80b/index.html

## Controls

| Key | Interior | Exterior |
|-----|----------|----------|
| click | take the bridge (pointer lock) | |
| WASD / Shift | move / sprint | nudge orbit target · fly (F) |
| mouse | look | drag rotate · wheel zoom · right-drag pan |
| E | interact | |
| V | exterior view | board the ship |
| 1–5 | choose a deck inside the turbolift | camera stations 1–9 |
| F | | toggle orbit / fly camera |
| R | red alert | |
| M | mute | mute |
| F3 | stats overlay | stats overlay |

Doors open when you approach. The turbolift is at the aft end of every deck's lobby: step in, press a
deck number. Decks: 1 Bridge · 2 Command · 3 Crew · 4 Engineering · 5 Hangar.

## Layout

- `src/main.js` — bootstrap, staged loading, mode switching, loop, `window.debugAPI`.
- `src/exterior/` — `dims.js` (dimensional model shared with the interior), `hull.js` (skins,
  trench, stern, instanced multi-scale plating per z-chunk, hangar module, reactor bulb),
  `superstructure.js` (city tiers, tower, bridge module with the real window opening, domes, mast,
  turrets), `details.js` (hatches, ports, sensors, docking bays, machinery), `engines.js`,
  `batch.js`, `exttex.js`, `exterior.js` (assembly, lighting rig, LOD, camera stations).
- `src/interior/` — `layout.js` (decks / sectors / doors as data), `interior.js` (streaming,
  door-aware visibility graph, fixed light pool, red alert), `sector.js`, `doors.js`, `turbolift.js`,
  `corridor.js` (corridors + lobbies), `imperial.js` (shared Imperial toolkit), `builders.js`
  (panel grids, frames), `rooms/*.js` (one builder per room, auto-registered by `rooms/index.js`).
- `src/traffic/fighters.js` — instanced TIE fighters, racks, launch / patrol / return paths through
  the ventral bay, bay-door state, `PilotHook` and snapshot / apply for NPC and network work.
- `src/camera/director.js` — interior first-person ↔ exterior orbit / fly, fades, hand-off stations.
- `src/player.js` — controller with gravity, floors / pits / ramps / stairs, sprint.
- `src/perf/metrics.js`, `src/fx/audio.js` (event hooks + procedural ambience),
  `src/systems/reserved.js` (flight, atmospheric entry, landing gear, docking, surface contact,
  hangar deployment, camera phases, landing zones — interfaces for the next phases).
- `src/materials.js`, `src/textures.js`, `src/kit.js`, `src/post.js`, `src/space.js`, `src/hud.js`.

## Tools

```sh
node tools/check.mjs [url] --views a;b;c --out dir      # screenshots + stats per view (ad hoc: sector@x,z,yaw,pitch · ext@px,py,pz,lx,ly,lz)
node tools/shots.mjs <iteration>                        # full rubric run → shots/sd_iter_<N>/ (+ drift / door / lift / traffic / transition passes)
node tools/navtest.mjs                                  # walks every door both ways, rides the lift between decks, exercises traffic
node tools/tour.mjs <outDir> [url]                      # frame-paced tour (exterior sweep, bridge, blast door, lift ride, hangar launch) → frames + tour.mp4
node tools/publish.mjs                                  # build + push the play branch
```

`PLAN.md` holds the ship model and scene hierarchy, `docs/WORKSTREAMS.md` the contract used by the
parallel build workstreams, `PROGRESS.md` the iteration log with measured stats.
