# ISD Vigilant — Star Destroyer demo

A Star Wars-inspired Imperial Star Destroyer you can orbit from outside and explore on foot inside,
built with Vite and Three.js. Everything is procedural and original: geometry is kit-bashed from
primitives, every texture (hull plating, panels, decals, console UI, planets, nebulae) is generated on a
canvas at load. No downloaded models, textures, fonts or sounds.

- **Exterior**: 1.6 km wedge hull with layered armour plates, equatorial trench machinery, terraced
  superstructure city, command tower with shield domes and spire, seven ion engines, turbolaser turrets,
  running lights, a ventral hangar well and reactor bulb. Sun + planet-shine shading, cast shadows in
  orbit view, three LOD layers, instanced detail.
- **Interior**: four decks, 27 spaces, all connected: bridge, auxiliary flight control, tactical holo
  room, comms/sensor control, restricted intel room, officers' quarters, observation gallery, lift
  lobbies, escape pod bay, crew quarters, refresher, mess hall and galley, medbay, rec lounge, briefing
  room, armoury, detention block, life support, engineering control, main reactor chamber, hyperdrive
  room, maintenance bay, main hangar, fighter maintenance, shuttle dock, cargo bay. Corridors,
  auto-opening doors, two turbolifts that physically carry you between decks.
- **Hangar traffic**: TIE-style fighters release from ceiling racks, drop through the well, patrol the
  hull and return under tractor capture, on deterministic tracks with a `Pilot` interface for future
  NPC or networked pilots.
- **Reserved for later phases**: flight control, atmospheric entry, landing supports, docking, surface
  contact, hangar deployment, descent camera, landing zones (`src/systems/reserved.js`).

## Run

```sh
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # production bundle in dist/
```

Starts in orbit. Drag to orbit, wheel to zoom, right-drag to pan, `WASD`/`QE` to fly the focus point,
`B` (or `V`) to board through the bridge windows. Inside: click to lock the pointer, `WASD` move,
`Shift` run, mouse look, `E` interact (bunks, dispensers, turbolift panels), `V` to fly back out, `F3`
stats overlay. On phones the same page shows touch controls (left half joystick, right half look,
on-screen Board / Interact / Run / Exterior buttons).

## Tooling

```sh
node tools/check.mjs [--base URL] [--out DIR] [--all] view...   # JPEG frames + per-view stats
node tools/check.mjs --list                                      # every debug view name
node tools/verify.mjs [--base URL]        # navigation / systems checks (rooms, walk, doors, lifts,
                                          # transitions, traffic, budgets); exit 1 on failure
SHOT_BUILD=1 node tools/shots.mjs <name>  # full review set on a static build snapshot
node tools/flythrough.mjs --scale 0.5     # offline flythrough video (orbit, boarding, bridge,
                                          # lift ride, hangar, exit) via ffmpeg
tools/live.sh                             # dev server + Cloudflare quick tunnel for a live link
```

All tools drive headless Chromium through `window.debugAPI` (`setView`, `teleport`, `walkTo`, `ride`,
`board`, `exitShip`, `advanceSim`, `advanceSky`, `getStats`, `connectivity`, ...).

## Documentation

- `docs/STAR_DESTROYER_PLAN.md` — scale spec, scene hierarchy, deck plan, camera modes, budgets
- `docs/STAR_DESTROYER_PROGRESS.md` — milestone log with measurements and review results
- `docs/BASELINE.md` — the freighter demo this grew from
- `docs/AGENT_GUIDE.md` — the contract the parallel workstreams built against (kit, shell, materials,
  budgets, testing)
- `PROGRESS.md` — the earlier freighter-phase iteration log

## Layout

- `src/main.js` — renderer, world assembly, modes, debug API, loop
- `src/config/shipSpec.js` — single source of truth for hull, decks, rooms, lifts, hangar
- `src/exterior/` — hull, plating shader, greebles, turrets, engines, ventral detail, lights
- `src/interior/` — registry (streaming, portal culling), shell, corridors, doors, lifts, `rooms/*`
- `src/hangar/` — fighter traffic, TIE model, hangar machinery
- `src/camera/` — orbit camera, mode manager and transitions
- `src/player.js`, `touch.js`, `interact.js`, `lightPool.js`, `lighting.js`, `post.js`, `perf.js`,
  `audio/ambience.js`, `systems/reserved.js`, `space.js`, `kit.js`, `textures.js`, `materials.js`
