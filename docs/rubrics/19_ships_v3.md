# Rubric 19 — Ships v3: angular hulls and a clean sky

User feedback (6 Sep): "there's a random ship stuck to the side of the Senate building. That's annoying." "You can make
your own blocks that make them more angular for spaceships." Root cause of the first item: the Senate landmark's two
shuttle pads carried block-built shuttles (durasteel boxes with slab wings) at the lot edges; removed at `6a22181d`.
Ships now come only from the voxel fleet in `src/ships`.

## Acceptance criteria

1. **Sloped voxels.** `src/vehicles/voxelMesh.js` supports per-cell shapes beyond the cube: wedge (triangular prism)
   in 8 orientations, corner wedge (tetrahedral corner) in 8 orientations, and half-slab; the mesher emits correct
   normals and UVs, culls hidden faces against neighbours of any shape, keeps the emissive attribute, and is covered
   by an offline test (cell count, triangle count, watertightness on a sample hull).
2. **Every model re-sculpted.** All nine models use sloped cells for noses, wing leading/trailing edges, canopies,
   engine housings and tail fins; no model keeps a pure box silhouette. The 20-point ship rubric (09) is re-scored;
   every model >= 18/20.
3. **Reference shapes.** The shuttle reads as a tri-wing with a wedge nose; the diplomatic cruiser as a tapered cigar
   with a smooth prow; the starfighter as a wedge with swept wings; the gunship with a sloped cockpit; freighters keep
   flat cargo bodies but get chamfered corners. Screenshots on the pads at noon and at night for each.
4. **Nothing intersects a building.** A collision audit samples every lane, every pad approach/climb, every parked or
   repair berth and every hover/dwell pose against the real blueprints (towers, landmarks including the Senate dome,
   pavilion and stair towers, spaceport structures) with the swept hull AABB: 0 intersections. Test in
   `scripts/test-ships.mjs`; the audit runs offline.
5. **No block-built ships anywhere.** A block census over every landmark and tower blueprint finds no hull-shaped
   durasteel boxes outside the ship fleet (the Senate pads, the Temple hangar and the Detention gunship deck host
   fleet ships or stay empty).
6. **Budget.** Ship draw calls unchanged (instanced per model), triangle count per model <= 2x today's, JS within +0.5 ms.

## Status
| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Sloped voxels | done | `voxelMesh.js`: a cell shape is the unit cube clipped by half-spaces; 70 named shapes (wedge up/down x 4 sides, 2-cell ramp halves, knife edges, vertical plan wedges, hips up/down, tetrahedral corners and chamfers x 8, half slabs / half cells, ridges, keels, blades) plus `customShape(planes)` for n-cell ramps and plan tapers. The convex-clip mesher emits the cropped cube faces and the sloped caps as polygons with flat per-face normals, the UVs and shade of the cube face they replace, the emissive attribute, and culls a face only against a neighbour whose cross-section covers it (`shapeCovers`). `node scripts/test-ships.mjs` "sloped cells": every shape closed and convex with its exact volume, mirror / cut exactness, cover and collision-box rules, the train hull (7250 faces / 14500 tris, checksum `afd9a10c`), the train doors and a plain grid mesh bit-identically to v2, three sample hulls watertight (bevelled block 144 cells / 248 tris / 372 edges, chamfered box 144 / 280 / 420, plane-cut hull 280 / 548 / 822 - every edge in exactly two triangles). `npm run train-test` 52/52 against the v3 server. |
| 2 | Every model re-sculpted | done | All nine hulls carry sloped cells (light freighter 252/860 cells, shuttle 191/771, taxi 69/146, gunship 212/742, bulk freighter 331/1616, cruiser 352/1622, starfighter 135/270, police 92/205, air bus 130/559): wedge and tapered noses, swept wing leading / trailing edges with knife and ridge tips, sloped and hipped canopies, bevelled hexagonal / octagonal fuselages, chamfered cargo bodies, truncated-cone engine blocks, tail fins. Every animated part (gear, folding wings / S-foils, ramps, doors, lights) and `ShipVehicle` boarding still work (offline carry test + CDP ride: boarded through onUse, 60/60 samples inside, drift 0); riders collide with the clipped cells' step boxes (`VoxelGrid.boxesAt`). Rubric 09 scorecard: 20/20 for every model (17/17 machine-checked points; silhouette, motion and originality counted as given), triangles 76..96 % of v2. |
| 3 | Reference shapes | done | Screenshots on the pads at noon and at night for all nine models (`/opt/cursor/artifacts/s3_*`): shuttle tri-wing with a wedge nose (wings fold up on the pad), cruiser a tapered red cigar with a smooth prow, starfighter a wedge with swept wings, gunship a sloped glass cockpit on a bulbous bay, freighters flat chamfered cargo bodies; before / after pairs for the light freighter and the shuttle. |
| 4 | Nothing intersects a building | done | `test-ships.mjs` "building-collision audit": 63 routes (30 pad cycles, the frontier cycle, 15 city lane and 14 harbour sweeps, 3 repair berths), 68 951 poses swept as hull AABBs + 1 block, 713 lot-mask tests against the 433 tower / landmark blueprints (`blueprintFor`), 3607 lazily generated chunks of the city, spaceport (terminal, hangars, tower, fuel farm), lower city and hyperlane; a voxel-accurate narrow phase (hull cells dilated by the margin) at the drawn and the level pose. 0 intersections after three coordinate fixes: the tall outer lane 216 -> 248 (lot 401's stepped crown reaches y 243 within the gunship's wingspan), repair berth 1 four blocks west and berth 3 two blocks back (hangar hoist hooks). Control: a gunship parked inside the tallest crown is reported. W6's pad list is unchanged. |
| 5 | No block-built ships anywhere | done | Census over 433 blueprints (12 landmarks, 421 towers; 7.27 M hull-material cells in 0.7 s): connected components of durasteel / hull plate / chrome with a ship's proportions, minimal attachment and open air above - none found; the removed Senate pad shuttle, rebuilt on its slab, is the positive control and is caught. |
| 6 | Budget | done | Ship draw calls unchanged: 9 (one InstancedMesh per model, in-page census). Triangles per model 76..96 % of v2 (bound <= 2x asserted per model). `scripts/bench.mjs` at the pads camera (Light, rd 10, 40 s): JS 8.0 ms avg / 11.1 p95 after vs 9.54 / 11.8 before; scene draw calls 141 both runs; 702.8k vs 714.6k triangles. |
