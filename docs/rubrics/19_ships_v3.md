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
| 1-6 | — | todo | — |
