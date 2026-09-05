# Frontier Craft

A playable, browser-based **Minecraft-style voxel sandbox** with a large **Red Dead Redemption–inspired frontier town** built out of blocks inside the world and populated by autonomous townsfolk, horses, cattle and a steam train.

Everything is generated at runtime from code: pixel-art textures, character skins, sounds, terrain and the town itself. No third-party game assets are used.

## Play in the browser (no install)

The production build is committed in `dist/`, so it can be served straight from a GitHub-backed CDN:

**https://cdn.githubraw.com/ilikevibecoding/edwin4dawin/07112786e18f92fce4f8ef15cbc77d4d578e44ca/dist/index.html**

That link is pinned to a commit so it never goes stale. To play the latest build on this branch use
`https://cdn.githubraw.com/ilikevibecoding/edwin4dawin/cursor/minecraft-western-town-54d6/dist/index.html`
(CDN caches may lag behind pushes). After changing the source, run `npm run build` and commit `dist/` to refresh the hosted build.

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173
npm run build      # production bundle in dist/
```

Requires a WebGL-capable browser. Click the game once to grab the mouse.

## Controls

| Action | Key |
| --- | --- |
| Move | `W` `A` `S` `D` |
| Jump / swim up | `Space` |
| Sprint | double-tap `W` or hold `R` |
| Sneak | `Shift` |
| Fly (creative flight) | double-tap `Space`; while flying hold `Space` to rise, `Shift` to descend, sprint for double speed; double-tap `Space` again or land to stop |
| Break block | hold left mouse |
| Place block / talk to a townsperson | right mouse |
| Select hotbar slot | `1`–`9` or mouse wheel |
| Inventory (creative block palette) | `E` |
| Skip time 2 hours | `T` |
| Debug overlay (FPS, frame/JS/GPU ms, draw calls, memory, entities, network) | `F3` |
| Disaster / administrator control panel | `F4` or `` ` `` |
| Pause menu (render distance, sound, time, view bobbing) | `Esc` |

`Ctrl` is intentionally not used for sprinting because `Ctrl+W` closes the browser tab.

## Disasters (administrator controls)

Three deterministic, fully reversible disasters can be triggered manually from the in-game control panel (`F4`):

- **Tsunami & flood** – a wave front rolls in from a chosen direction, the streets fill with real water blocks that rise gradually, fragile structures break into floating debris, townsfolk evacuate to upper floors or swim and call for help, then the water drains. Params: flood height, crest height, direction, speed, duration, damage, intensity, center, radius.
- **Tornado** – a rotating funnel travels along a seeded path, rips light structures into orbiting debris, throws people and animals, darkens the sky and rings the church bell. Params: spawn location, heading, path wobble, funnel radius, travel speed, duration, intensity.
- **Orbital beam** – an original ring station charges above the target, a beam descends slowly and carves a scorched, magma-lit crater with a shockwave, sparks, smoke and debris. Params: target, beam radius, charge time, impact strength, destruction radius, duration, intensity.

Panel features: disaster tabs, schema-driven parameter form (with "use my position" / "use crosshair target"), seed input for reproducible runs, **Preview** (visual only, no world changes), **Start** (with an explicit warning + confirmation), **Pause/Resume**, **Stop** (graceful wind-down / beam retract), **Reset/Restore** (every touched block is journaled and restored, gradually and completely), **Replay** (same seed), a live intensity slider, a copyable console command, and a save section.

Determinism: the simulation runs at 20 ticks/s using only the seed, the tick counter and the world state, so the same seed and parameters always produce the same destruction (`node scripts/test-disasters.mjs` verifies replay hashes and complete restore for every disaster). From the console: `game.disasters.command({type:'start', disaster:'tornado', seed:7, params:{start:[-70,20], heading:75}})`, plus `preview`, `pause`, `resume`, `set` (live params), `stop`, `reset`, `replay`. `game.disasters.pauseAtTick = N` pauses exactly at tick N for tests.

Permissions and saves: in single player you are the world owner and have admin access (append `?admin=0` to play as a normal player). Online, only clients that present the server's admin token can open the panel or issue commands. Player block edits persist in `localStorage`; disaster damage is **never** written to that save unless an administrator explicitly commits it from the panel.

## Multiplayer

```bash
ADMIN_TOKEN=secret PORT=8765 npm run server     # WebSocket relay + authority (Node, `ws`)
npm run dev
# admin:  http://localhost:5173/?server=ws://localhost:8765&admin=secret&name=Sheriff
# player: http://localhost:5173/?server=ws://localhost:8765&name=Dusty
```

The server keeps a 20 Hz tick, relays block edits and player states (10 Hz, interest-managed to 160 blocks), stamps disaster commands with an authoritative start tick and seed and broadcasts them, so every client runs the identical deterministic simulation; late joiners receive the edit history and replay the running disaster. Rate limits, size limits and one-disaster-at-a-time are enforced server-side. NPCs and animals are client-side ambience and are not synchronized. `node scripts/mp-test.mjs` runs an automated two-client (plus late joiner) check.

## Testing and measurement

```bash
npm test                                   # unit tests + disaster lifecycle/replay/restore (needs the dev server)
npm run mp-test                            # multiplayer synchronization checks (starts its own server)
npm run bench -- --url http://localhost:5173/ --seconds 30 --label spawn --out bench/spawn.json
npm run bench -- --url "http://localhost:5173/?x=-8&z=2" --walk --label walk --out bench/walk.json
```

`scripts/bench.mjs` runs the game headlessly, samples `game.perf` (frame/JS/GPU ms, draw calls, triangles, heap, long tasks, entities, network) every second and writes a JSON report with a screenshot; `--steps` triggers disasters at given times. See `CHANGELOG.md` for the measured before/after numbers.

## What's inside

**Minecraft core** – chunked 16×128×16 voxel world, hidden-face culling, smooth lighting + ambient occlusion, sky/block flood-fill lighting, 20-TPS Minecraft movement physics (acceleration/friction/jump/step-up/auto-jump/swimming), block raycasting with selection outline, breaking progress with crack stages and chip particles, placement rules for slabs/doors/beds/lanterns, item drops, stacks, 9-slot hotbar, hearts/hunger/XP, first-person hand with swing + view bobbing, day/night cycle with sun, moon, stars, blocky clouds and distance fog, procedural pixel textures with per-tile mipmaps.

**World** – plains, forests (oak/birch/spruce), hills, mountains with snow caps, rivers and lakes, sand/gravel and a dry cactus biome, caves and ores, flowers and tall grass, trails, and an infinite railway.

**Dustwater** – a main street with boardwalks, cross streets, back streets and alleys, lamp posts, hitching rails with horses, wagons, benches, market stalls and a well. Buildings with walkable interiors: saloon (bar, piano, tables, rooms upstairs, batwing doors), sheriff's office with jail cells, bank with teller cage and vault, hotel and boarding house with balconies, general store, gunsmith, doctor, telegraph, barber, assay office, undertaker, tailor, bath house, post office, photographer, newspaper, blacksmith with forge and chimney, livery stable, train depot with platform and water tower, freight warehouses, church with steeple, fenced graveyard, houses with porches and outhouses, and a ranch with barn, paddock, cattle pen, pig pen, chicken run and wheat field. Signs are rendered with an original pixel font.

**Life** – ~40 named NPCs with procedurally painted western outfits (cowboys, sheriff and deputies, bartender, pianist, shopkeepers, doctor, banker, preacher, blacksmith, ranchers, rail workers, townswomen, travelers). They path-find over the live voxel world (and around blocks you place), follow daily schedules (open shops in the morning, fill the saloon in the evening, go home or sleep at the hotel at night, sheriff and deputies keep patrolling), gather in groups, sit on benches and pews, look at you when you approach, and answer when right-clicked. Horses, cattle, pigs and chickens wander their pens; a train arrives at the depot, waits and departs; chimneys smoke; lanterns light the streets at night.

## Demo URL parameters

`?x=&z=&y=&yaw=&pitch=&time=&rd=` set the starting position, view, time of day (0–1, 0.5 = noon) and render distance, e.g. `http://localhost:5173/?x=-30&z=11&y=58&yaw=180&time=0.78` starts inside the saloon at sunset.

## Project layout

```
src/
  main.js, game.js        bootstrap, game loop, interaction, integration
  constants.js            block/world/physics constants
  textures.js, font.js    procedural texture atlas and bitmap fonts
  blocks.js               block registry (shapes, textures, light, hardness)
  noise.js, rng.js        simplex noise + deterministic RNG
  worldgen.js             terrain/biomes/trees/caves/ores + structure overlays
  world.js                chunks, block access, flood-fill lighting
  mesher.js, terrain.js   chunk geometry (culling, AO, special shapes), streaming, world shader
  player.js, input.js     Minecraft-style physics + controls
  interaction.js, items.js raycasting, highlight, cracks, inventory, drops
  hud.js, hand.js         HUD/menus and the first-person hand
  sky.js, particles.js, audio.js, entityMaterial.js
  perf.js, permissions.js, save.js   performance monitor, admin permissions, persistent player edits
  disasters/              manager (commands, budgets, journal/restore), base class, debris, effects;
                          tsunami.js + tsunami/, tornado.js + tornado/, orbitalBeam.js + beam/
  ui/adminPanel.js        administrator control panel (DOM)
  net/                    multiplayer client + remote player avatars (server in server/index.mjs)
  town/                   town layout, building generators, overlay store
  npc/                    skins, blink, humanoid model + static LOD, A* pathfinding, NPC AI
  entities/               animals and the train
scripts/                  bench.mjs, cdp.mjs, test-unit.mjs, test-disasters.mjs, mp-test.mjs
```
