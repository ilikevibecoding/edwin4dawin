# Cloudbreak Royale

A browser-based 3D battle royale in the spirit of the genre's biggest hit: drop from the sky onto a
procedurally generated island, loot chests, harvest materials, build walls / ramps / floors on a grid,
and outlast 39 AI opponents while the storm closes in.

Everything is generated at runtime — there are no external art or audio assets. The whole game is
vanilla JavaScript on top of [Three.js](https://threejs.org/), bundled with Vite.

## Play

```bash
npm install
npm run dev        # then open http://localhost:5173
```

`npm run build` produces a static site in `dist/` (serve it with any static file server, or `npm run preview`).

### Controls

| Action | Keys |
| --- | --- |
| Move / sprint / jump | `WASD` / `Shift` / `Space` |
| Look, fire / swing, aim | Mouse, `LMB`, `RMB` |
| Pickaxe, inventory slots | `1`, `2`–`6` (mouse wheel cycles) |
| Reload, interact / swap, drop item | `R`, `E`, `G` |
| Build mode, wall / floor / ramp | `Q`, `Z` / `X` / `C` |
| Build material, rotate ramp | `RMB`, `R` (while in build mode) |
| Full map, pause | `M`, `Esc` |

During the drop, steer with `WASD`; the glider opens automatically near the ground (or press `Space`).

### URL options

| Parameter | Effect |
| --- | --- |
| `?seed=1234` | Reproduce a specific island (towns, loot, storm path). |
| `?shadows=0` | Disable shadow maps (they are also disabled automatically on slow machines). |
| `?mute=1` | Start without audio. |
| `?rawmouse=0` | Use the OS-accelerated mouse instead of raw pointer input. |
| `?debug=1` | Show the frame rate next to the storm timer. |

## What's in the box

- **Island generation** — heightmap terrain with a coastline, seven named towns on flattened plateaus with
  roads, forests, rocks and cars; houses and warehouses are assembled from the same wall / floor / ramp
  pieces you build with, so every building is enterable, harvestable and destructible.
- **Drop phase** — pick a drop point on the map, skydive, glide and land; the 39 bots drop in at the same time.
- **Storm** — six shrinking phases with increasing damage, shown on the minimap and the full map.
- **Loot** — chests, ammo boxes and floor loot; pistol, SMG, assault rifle, pump shotgun and bolt sniper
  across five rarity tiers; four ammo types; bandages, med kits, small shields and shield potions.
- **Building** — 4 m grid, wood / brick / metal with different HP, turbo-build, placement validation,
  structural support with collapse of unsupported pieces, editing of the world by destroying pieces.
- **Combat** — hitscan weapons with spread, damage falloff, headshots, recoil, ADS and a sniper scope;
  the pickaxe harvests trees (wood), rocks (brick), cars (metal) and buildings.
- **Bots** — drop in, roam, move into the safe zone, use line of sight to spot targets, fight each other and
  you, shoot through / at structures, throw up walls when hit, and drop their loot when eliminated.
  A pacing controller keeps the number of survivors on a sensible curve over the match.
- **Presentation** — third-person camera with wall avoidance, tracers, muzzle flashes, particles, damage
  numbers, hit markers, kill feed, announcements, minimap, victory / elimination screens and a WebAudio
  synthesizer for every sound effect.
- **Performance** — instanced rendering for thousands of structure and prop pieces, chunked terrain,
  distance culling, adaptive resolution and automatic shadow fallback.

## Project layout

```
src/
  main.js         game bootstrap, loop, quality scaling, solid spawn/despawn
  world.js        terrain, towns, buildings, props, containers, loot placement, map image
  structures.js   wall / floor / ramp pieces (instanced parts + collision boxes)
  instancing.js   growable InstancedMesh pools with region-based frustum culling
  physics.js      spatial hash, collision resolution, raycasting, line-of-sight tests
  player.js       movement, camera, skydive/glider, vitals, inventory
  combat.js       weapons, harvesting, consumables, interactions
  building.js     build mode, placement rules, structural support
  bots.js         AI opponents
  storm.js        storm phases and visuals
  loot.js         items, pickups, chests, ammo boxes
  hud.js          HUD, minimap, full map, menus
  effects.js      particles, tracers, muzzle flash, damage numbers
  audio.js        procedural sound effects
  characters.js   blocky characters, weapons, pickaxe, glider models
  textures.js     procedural textures
  config.js       tuning constants
```

Cloudbreak Royale is an original game; it does not use any assets, names or code from other titles.
