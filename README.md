# ISD Vindicator — Star Destroyer demo

A first-person / exterior-camera walkthrough of a Star Wars-inspired Imperial-class Star Destroyer,
built with Vite and Three.js. Everything is procedural: hull, rooms, props, fighters and every texture
(albedo, roughness/metalness, normal, emissive, decals, planets, nebulae) are generated in code at load.
No downloaded models or textures. Non-commercial personal demo.

**Live build:** https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/star-destroyer-play-9880/index.html
(rebuilt from this branch at least hourly by `tools/publish.sh`).

## What is aboard

* A 1600 m hull with terraced superstructure, command tower, shield domes, engines and a ventral hangar
  mouth, viewable from orbit / free-flight cameras and from inside through the bridge viewports.
* Five decks and 30 named spaces connected by automatic doors, corridors and turbolifts: command
  bridge, navigation, tactical holo room, comms & sensor control, intelligence room, officers' ready
  room, forward observation gallery, officers' quarters, briefing room, lounge, evacuation bay, crew
  quarters, mess hall & galley, medical bay, armory, detention block, engineering control, hyperdrive
  hall, life support, maintenance bay, reactor chamber, main hangar bay, fighter maintenance bay,
  shuttle bay, cargo hold, hangar flight control, plus lift lobbies and lift cars.
* The original *Kestrel* light freighter (the previous demo) is docked on the hangar deck with its
  interior and interactions intact; its aft blast door opens onto a boarding ramp.
* Scripted TIE-style fighter traffic through the hangar mouth (no NPC logic; pilot hooks reserved).

## Run

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # production bundle in dist/
```

Choose where to board on the start card. `WASD` move, `Shift` sprint, mouse look, `E` interact,
`1–5` pick a deck inside a turbolift, `V` exterior view ↔ back inside, `F` orbit ↔ free flight outside,
`1–9, 0` exterior camera presets, `F3` performance overlay, `H` help.

## Tooling

```sh
node tools/shots.mjs <tag>                     # every room + exterior preset -> shots/iter_<tag>/*.png + results.json
SHOT_QUICK=1 SHOT_SET=exterior node tools/shots.mjs <tag>
SHOT_QUICK=1 SHOT_VIEWS="room:bridge,cam:label:x/y/z:lx/ly/lz:fov:i" node tools/shots.mjs <tag>
node tools/smoke.mjs                           # load test: page errors, build log, stats
tools/publish.sh [--force]                     # build + smoke test + push the playable branch
```

`tools/shots.mjs` also exercises doors (approach opens them), walking between rooms, a turbolift
ride, the interior↔exterior camera transition and the Kestrel's interactions, and records draw calls,
triangles, active lights and visible cells per view. Rendering in this environment is software GL
(SwiftShader), so wall-clock frame times there are relative, not GPU numbers.

## Layout

- `src/spec.js` — every dimension: hull profile, terraces, tower, engines, decks, rooms, doors, hangar racks, camera presets
- `src/main.js` — renderer, scene, sun, environments, build sequence, input, debug API, loop
- `src/cells.js` — room cells, portal visibility, shared light pool · `src/doors.js` sliding doors · `src/lifts.js` turbolifts
- `src/player.js` — first-person controller with floors / ramps / stairs · `src/cameras.js` — orbit, fly, transitions
- `src/materials.js`, `src/textures*.js` — material library, light domains, procedural textures
- `src/exterior/` — hull, superstructure, engines, greebles, weapons · `src/rooms/` — one builder per room + the Imperial kit
- `src/fighters/` — TIE model, traffic scheduler, shuttle · `src/systems/`, `src/net.js` — reserved flight / landing / sync interfaces
- `src/ship.js` — the Kestrel interior (original demo) · `src/space.js` — far field
- `docs/SHIP_PLAN.md` — design contract · `docs/AGENT_GUIDE.md` — workstream contract · `PROGRESS.md` — evidence log
