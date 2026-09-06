# Street detail — report

Branch `cursor/street-loop-8213` (Street Detail Agent). Rubric 21 (street-level detail), 22 (lighting infrastructure),
supporting 29 (world density). Defect log: `DEFECTS.md`.

## What was built

**`src/world/roads.ts`** — the road network is now a graph: segments are stitched into `RoadChain`s (polylines with
a width, class and lane count), crossings and T's become `RoadNode`s with one `RoadRay` per arm, and every pair of
adjacent arms gets a `RoadCorner` (curb-return arc, radius by class). Stubs are trimmed to the edge of the road they
end on. The pavement mesh carries per-vertex intersection data (`vIsect`: along of the nearest node, the box reach
before/after it, marking flags), so the fragment shader knows where it is relative to the junction: lines stop 5 m
short of the box, stop bars and ladder / two-line crosswalks are laid on the approaches, arrows on arterial approach
lanes, and inside the box both carriageways shade identically (no lane-locked wear, no lines), so the overlap of the
two strips is invisible instead of z-fighting. Every marking and surface feature is box-filtered over the pixel
footprint (`fwidth`) and fades to its mean where it falls under a pixel: dashes become a 25 % stain, lane lines thin
to their coverage, manholes and cracks vanish. Surface: two-scale asphalt tone, 50–100 m paving-history bands, tyre
paths per lane, 5 × 3 m patch repairs, paving seams, crack zones, gutter grime, marking wear along the wheel paths,
manhole covers and kerb gullies. Night: a ground irradiance map (`uLampMap`, 8-bit sqrt-encoded, 2.5 m texels over the
dense districts) is sampled by the road and sidewalk materials for the lamp pools.

**`src/world/streets.ts`** (new) — sidewalks, curbs, signals, furniture and the lamp plan, chunked in 500 m cells:
- Curb + gutter + slab strips along every block face (`sideRuns` cuts each chain side at the curb-return tangent
  points), width by zone (downtown 3.6 m, mid-rise/hotel 2.7 m, industrial 2 m, suburb 1.5 m, none on lanes / parks
  / airport), the curb foot exactly on the pavement edge rows so nothing gaps or fights; the slab rides over the
  terrain where the ground rises above curb level. Curb returns at every corner, dished into ramps with a tactile
  pad; concrete with slab joints, tree wells (1.5 m, marked occupied), utility covers, gutter grime.
- A bayfront promenade where the downtown arterial runs near the water: pavers, parapet, bollards, benches,
  pedestrian lamps.
- Signalised arterial intersections: a mast arm per approach (pole on the verge, arm over the approach lanes,
  3-aspect heads per lane, pole-side head on two-lane approaches, pedestrian hand/walk heads, push button, street
  name blade), timed red/amber/green per direction (`uSignalTime`, per-vertex phase and parity), lit day and night.
  Stop signs with name blades on stop-controlled approaches elsewhere.
- Benches, bins, hydrants, bus shelters and utility cabinets at restrained densities in the dense zones.
- Lamp plan for `props.ts`: arterial double-arm poles both sides at 40 m, street single-arm at 45–55 m (one side per
  street in the low-density suburbs), a lamp at each corner kept clear of the signal poles, pedestrian lamps on the
  promenade, highway poles; footings 0.65–0.75 m behind the curb face, validated against a carriageway index so
  nothing stands in a road.
- Two draws per cell (sidewalk soup, large kit soup) plus a small kit soup within 450 m; sidewalks switch to a coarse
  index beyond 500 m; everything culled against the camera at 1.5 km; only the large kits cast (into the two fine
  cascades, within 300 m: drawn into both cascades the kits cost as much again as the street pass), nothing mirrored.

**`src/world/props.ts`** — lamps by kind (arterial 11 m double reach, street 8.5 m single arm, pedestrian lantern,
highway cobra) with arm yaw, hi/lo instanced LODs, and additive point sprites per chunk for the luminaires from 160 m
to 4 km at night.

## Counts (node harness over the generated world)

| item | count |
|------|------:|
| sidewalk runs / curb returns | 23 117 / 22 163 |
| signalised intersections / mast arms | 601 / 2 250 |
| stop signs | 9 911 |
| lamps (arterial / street / ped / highway) | 2 478 / 35 574 / 52 / 123 |
| sidewalk triangles (fine / far index) | 2.48 M / 0.83 M |
| kit triangles (large / small) | 0.37 M / 1.09 M |
| street cells | 558 |
| lamp map | 3449 × 2559 texels, 2.5 m, 8.8 MB |

Per-view upper bounds within the cull radii (no frustum): `bridge-low` 253 k tris / 46 draws, `street2m` 424 k / 66,
`c500` 350 k / 59, `cockpit-city` 6 k / 4, `skyline-high` 0.

## Budgets (renderer counters after the settle frames, 1280 × 720)

Round 0 is the base commit `6130eae7` served from the same worktree; the caps are 400 draw calls / 1.5 M
triangles per view, with ≤ +25 calls / ≤ +150 k triangles aimed for in `cockpit-city`, `bridge-low`, `skyline-high`.

| view | round 0 | round 1 | Δ round 1 | round 2 | Δ round 2 |
|------|--------:|--------:|----------:|--------:|----------:|
| cockpit-city | 263 / 1 047 k | 267 / 1 335 k | +4 / +289 k | | |
| bridge-low | 264 / 747 k | 267 / 792 k | +3 / +45 k | | |
| skyline-high | 231 / 1 187 k | 237 / 1 557 k | +6 / +369 k | | |
| night (bench) | — | 262 / 1 471 k | | | |
| street2m | 205 / 702 k | 257 / 1 406 k | +52 / +704 k | | |
| street2m-night | 206 / 697 k | 265 / 1 432 k | +59 / +736 k | | |
| isect60 (r1 pose) | 118 / 277 k | 141 / 627 k | +23 / +350 k | | |
| c100 | 130 / 349 k | 158 / 810 k | +28 / +461 k | | |
| c500 | 170 / 589 k | 210 / 1 184 k | +40 / +595 k | | |
| c500-night | 173 / 591 k | 220 / 1 218 k | +47 / +627 k | | |

Round 1's triangle deltas at +4…6 draw calls in the high views were the lamps: 38 k poles (2.6 k before) drawing
their 6-sided coarse shape out to 2.5 km, 0.2 px wide. Round 2 leaves lamp geometry out beyond 600 m per 250 m
cell (the night dots carry on to 4 km); the street systems themselves are bounded by the cull radii above.

## Rounds

See `DEFECTS.md`. Round 0 = baseline, round 1 = first build (shader compile fix, terrain z-fight, footing validation,
lamp density, LODs), round 2 = the surface read (aged asphalt, repaving bands, paler wheel paths, matte roughness,
aggregate grain, darker concrete, apex ramps), night pools at a gain that grades instead of clipping, lamp budget,
cameras re-posed over the carriageway.

## Self-scores

To be filled from the round captures (21 street-level detail, 22 lighting infrastructure).

## Requests to other agents

- **Terrain agent**: the baked street band in `suburbGround` still draws its own kerb/verge tone under the new
  sidewalk strips in the suburbs (RES_LOW, 1.5 m walk at the pavement edge); consider narrowing the band to the
  carriageway so the two do not double up. The ground under the dense districts could carry a faint plot / paving
  tone rather than plain grey now that sidewalks define the block edges.
- **City agent**: buildings could leave the 0.6 m apron behind the walk (the slab back edge is at
  `hw + 0.3 + walkWidth(zone)` from the centreline); the sidewalk and furniture footprints are reported through
  `markOccupied`.
- **Highway agent**: highway/causeway lamps are still planned here (`planHighwayLamps`, 123 poles); hand-off ready
  when `highway.ts` wants them.
