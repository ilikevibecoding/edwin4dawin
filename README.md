# ISD *Redoubt* — an explorable Imperial Star Destroyer

A Star Wars-inspired Imperial I-class Star Destroyer you can orbit, board and walk through, built with Vite
and Three.js. Everything is procedural: hull, rooms, props, fighters, textures, decals, screens — no
downloaded models or textures. Non-commercial fan demo.

- **Exterior**: 1,600 m wedge hull with trench, terraced superstructure, command tower, engines, reactor
  bulb, ventral hangar wells with containment fields; orbit / free-fly cameras; LOD'd instanced greebles.
- **Interior**: four connected decks (command tower, hangar deck, engineering, crew deck) — 34 rooms and
  corridors linked by automatic doors and turbolifts; door-portal visibility culling; per-cluster streaming.
- **Hangar**: TIE-fighter racks over a belly well; scripted launch / patrol / recovery traffic with hooks for
  future NPC pilots and network sync.
- Live playable build: https://raw.githack.com/ilikevibecoding/edwin4dawin/cursor/star-destroyer-play-a618/index.html

## Run

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # production bundle in dist/
```

Exterior: drag to orbit, wheel to zoom, `F` free-fly (WASD, Q/E down/up, Shift fast), `Enter` to board.
Interior: click to lock the pointer, `WASD` move, `Shift` sprint, mouse look, `E` interact (turbolift
panels, bunks, dispensers, launch control), `V` exterior view, `Shift+R` red alert, `F3` stats, `Esc` release.

## Tools

```sh
node tools/view.mjs <view>[,<view>] [outDir] [--url=...] [--nudge=dx,dz] [--sim=seconds]   # screenshots
node tools/navtest.mjs [url]     # navigation / doors / lifts / transitions regression
node tools/perf.mjs <tag> [url]  # per-view stats -> perf/<tag>.{json,md}
node tools/shots.mjs <iter>      # rubric screenshot set
node tools/smoke.mjs dist        # loads a built bundle headlessly, fails on page errors
tools/publish.sh                 # build + smoke + push the playable branch (PUBLISH_LOOP=3600 for hourly)
```

Headless rendering here is software GL (SwiftShader); frame times printed by the tools are relative only.

## Layout

- `PLAN.md` — the ship development plan: world frame, scene hierarchy, room layout, cameras, budgets.
- `docs/WORKSTREAM_GUIDE.md` — how to build a room / feature against the core contracts.
- `src/core/` — `layout.js` (hull functions, rooms, doors, lifts), `room.js` (BuildContext, RoomManager),
  `kit.js` (geometry batching + instancing), `frame.js` (Imperial panel grid), `props.js`, `palette.js`.
- `src/systems/` — `player.js`, `camera.js`, `transitions.js`, `doors.js`, `lifts.js`, `audio.js`,
  `atmosphere.js`, `sync.js`, `flight.js` (reserved landing/flight interfaces).
- `src/exterior/` — hull, superstructure, tower, engines, greebles. `src/fighters/` — TIE model + traffic.
- `src/rooms/<cluster>/<room>.js` — one module per room; `src/rooms/index.js` registry.
- `src/materials.js`, `src/textures.js`, `src/space.js`, `src/post.js`, `src/lighting.js`, `src/hud.js`.
- `PROGRESS.md` — iteration log with measurements and review results.
