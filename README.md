# Frontier Craft

A playable, browser-based **Minecraft-style voxel sandbox** with a large **Red Dead Redemption–inspired frontier town** built out of blocks inside the world and populated by autonomous townsfolk, horses, cattle and a steam train.

Everything is generated at runtime from code: pixel-art textures, character skins, sounds, terrain and the town itself. No third-party game assets are used.

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
| Break block | hold left mouse |
| Place block / talk to a townsperson | right mouse |
| Select hotbar slot | `1`–`9` or mouse wheel |
| Inventory (creative block palette) | `E` |
| Skip time 2 hours | `T` |
| Debug overlay | `F3` |
| Pause menu (render distance, sound, time, view bobbing) | `Esc` |

`Ctrl` is intentionally not used for sprinting because `Ctrl+W` closes the browser tab.

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
  town/                   town layout, building generators, overlay store
  npc/                    skins, humanoid model, A* pathfinding, NPC AI
  entities/               animals and the train
```
