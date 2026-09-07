# W8 brief — the lower city (spec section 4)

Owner files: `src/worldgen.js` (only the Coruscant region: `REGIONS.coruscant`, `regionAt`, the plateau column fill
and the new surroundings), new `src/coruscant/lowercity.js` (+ `src/coruscant/lowercity/*`), `src/structures/hyperlane.js`
(bridge supports where the lane crosses the lower city only), `scripts/test-lowercity.mjs` (new). Do not edit layout.js,
city.js, spaceport.js, buildings, towers, ships, NPCs, economy.

Goal: the plateau no longer rises from an ocean. Around it, out to ~400 blocks from the plateau edge (region half
grows from 512 to 912 while the plateau itself stays exactly where it is), the ground becomes constructed urban depth:
terraces stepping down from y 60 to y ~20 in 3-4 levels, covered with dark blocky building masses (durasteel dark /
smooth stone / panel black / deck plate, lit windows sparse and warm, blue service lights), service decks (walkable
plates at each terrace with rails), freight trenches (6-10 wide, 15 deep, conveyor rails, containers), utility conduits
(pipes along walls, vent grates), ventilation wells (square shafts with grates and a warm glow deep inside), bridge
supports under the hyperlane (pylons every 24 blocks down to the lowest deck), traffic lanes (lit lane markers between
the masses at y 40 and y 75 for the ship traffic to use later), occasional enclosed industrial rooms (reactor rooms,
pump halls with visible machinery through steel glass), and localized haze (the sky/fog system already has region
blending: add a `lower` region kind with a slightly denser, cooler fog and no clouds; reuse `applyRegion` in
`src/sky.js` only if a tiny hook is needed - document it). Openings between masses must reveal 2-3 depth layers.
The bottom (y ~8-18) is a dark plated "reclamation floor" with warm furnace glows only where a plant sits, so a fall
never ends in a void: the world's bedrock stays.

Vertical connections (all three must be walkable end to end, entrances and exits aligned with real geometry):
1. Public lift: a lift tower on the plateau rim promenade (RIM = 6 blocks around the plateau in `layout.js` - read the
   constant, do not edit) at the south edge near x 3000: a glass cab shaft (a `Vehicle` is optional; a stair spiral
   inside the tower is the required fallback) from y 61 down to the y 40 service deck and the y 20 floor, with lit
   landings and signage blocks.
2. Freight/service route: a switchback ramp (3 wide, 1:4 slope with slab steps the player can walk) from the
   spaceport's west edge (x ~2560, z 0) down to a freight trench at y 30, with container stacks and a conveyor.
3. Unofficial route: a maintenance ladder/stair inside a ventilation well reachable from an undercity alley on the
   plateau's east side (an open grate in the RIM promenade floor), landing on a maintenance balcony at y 45 and
   continuing down.
Fall consequence: falling from the plateau lands on the y 40 deck or the y 20 floor (fall damage in survival, none in
creative); the nearest lift is within 120 blocks of any landing point.

Rules: deterministic (seeded noise from `src/noise.js` / `hash2`), chunk generation per lower-city chunk <= 6 ms, no
Math.random, no DOM; register the fill through the existing structure registry (see `src/structures/index.js` and how
`src/coruscant/city.js` registers its chunk filler with `gen.addStructure`) so it is lazy per chunk. Keep the frontier,
the ocean west of the lower city and the hyperlane track itself unchanged. Test: `scripts/test-lowercity.mjs` -
heights descend monotonically from the plateau outward, three routes walkable (flood fill on passable cells with
headroom), no cell of the lower city above y 59, chunk timing.

Verification: dev server on port 5216; shots from the plateau edge west (`?x=2500&z=0&y=130&yaw=90&pitch=-12`), south
edge (`?x=3000&z=520&y=140&yaw=180&pitch=-20`), the lift landing, the trench, the vent well; before/after against
`docs/overhaul/baseline/b0_plateau_edge_sea_west.png`.
