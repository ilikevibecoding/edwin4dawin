# Progress

## Current status

- Iteration: 0 (scaffolding)
- Consecutive all-pass iterations: 0
- Average FPS: —
- One-percent-low FPS: —
- Average frame time: —
- Draw calls: —
- Triangle count: —
- Texture count: —
- Renderer: —
- Stopping-condition status: loop not started

## Art direction

Original unbranded expedition DSV **Abyssal Surveyor**. Warm off-white / naval-green pressure hull, gunmetal machinery, restrained amber/green instruments, deep blue-green exterior. Cramped industrial construction, used but maintained.

## File ownership

- Pressure hull / layout: `src/layout.js`, `src/submarine.js`, `src/geom.js`
- Control room: `src/controlRoom.js`
- Corridor: `src/corridor.js`
- Crew spaces: `src/crewQuarters.js`
- Machinery: `src/engineRoom.js`, `src/machinery.js`, `src/pipes.js`
- Materials: `src/materials.js`, `src/textures.js`
- Water: `src/water.js`
- Lighting: `src/environment.js`
- Player / interactions: `src/player.js`, `src/interact.js`
- Post: `src/post.js`
- Integration / debug API: `src/main.js`
- Screenshots: `tools/shots.mjs`

## Iteration 0

### Implemented

- Vite + Three.js + Playwright scaffold
- Shared layout, seeded textures, PBR material families
- Cylindrical hull, ribs, bulkheads, rooms, water RT, lighting, post, player, three interactions, debug API

### Next iteration fix list

1. Run first screenshot suite and score the rubric from images
2. Fix compile/runtime errors discovered during build
3. Raise visual density on any empty surfaces
