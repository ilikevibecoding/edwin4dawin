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
highway cobra, 30 m high mast with a crown ring of luminaires) with arm yaw, hi/lo instanced LODs, and additive point
sprites per chunk for the luminaires from 160 m to 4 km at night (per-kind size and gain: a mast is a 3.6 m point at
2.5× gain). The lamp material is its own batched PBR material carrying `uFocalPx`, so poles, arms and housings are
inflated to a pixel across at any depth. High masts stand on an 85 × 116 m grid along the container terminal's truck
lanes (`buildPort`).

### Round 3 — surfaces and lighting infrastructure for the 100–600 m read (h03 defects 9 and 10)

- **Asphalt** (`roads.ts`): pale–dark–pale lane rhythm — wheel paths 26 % paler, an oil-drip strip 12 % darker
  along each lane centre, both masked to the carriageway and averaged to a stain when a lane falls under 2.5 px;
  manholes every 26 m in 70 % of the cells plus 15 cm valve covers every 9 m in half of them (all fading with the
  pixel footprint); ghost markings — a 22 % restripe line 3.55 m off-centre on 60 % of the arterial repaving bands, an
  18 % blacked-out parking-lane line on half the dense streets; runway concrete in 7.5 m slabs with sealed 6 cm
  joints and alternate-slab tones.
- **Kerb stones** (`streets.ts`): 1 m joints on the curb top and face, offset 0.3 m from the 1.5 m slab joints.
- **Thin members** (`batching.ts`, `streets.ts`, `props.ts`): `THIN_VERTEX_PARS` / `THIN_VERTEX_MAIN` — a vertex
  attribute `aThin` (offset of the vertex from its member's axis) lets the vertex shader push every pole, arm,
  housing, signal pole, mast arm, head and lens out to at least `THIN_PX` = 1.2 px across at its depth
  (`uFocalPx` = pixels per metre at 1 m, set from the camera each frame). Poles and mast arms read as 1 px lines
  from the air out to the 600 m lamp cull instead of dropping out at ~150 m.
- **High masts**: the `mast` lamp kind on the terminal grid and in pairs on the verges 12 m in from every highway end
  on land (the interchanges — the highways share no nodes with the surface grid); 40 m pool at 1.2 peak.
- **Lamp lines**: arterial verge lamps every 40 m both sides wherever a chain has no sidewalk run (`planVergeLamps`:
  the causeway approaches through the parks); the highway / causeway poles built here in round 3 passed to the
  highway furniture module at the merge with the lead (its median twin-arm poles).
- **Tooling**: `slotwait.sh` (blocking `flock` on both Chrome slots, atomic claim) so the capture browser no longer
  loses the slot race to the other builders' blocking waiters.

### Round 4 — plazas and surface lots (h03 defect 9: city_500m F5–H6, city_north A8–H8)

`buildPlazas` rates the free ground of every dense block on a 5 m grid (land only; samples within 9 m of a road are
left out of the ratio because the game marks roads occupied 3 m past their edge in 10 m cells). Blocks over 85 % free
become striped surface lots (every downtown one, half of the mid-rise ones), downtown blocks 12–85 % free become paved
plazas, and the downtown apron — the 93 m margin beyond the last block row that `city_north` looks across — is ringed
with lots (three cells in four, 6 m planted gaps, 3 m to the district edge). Paving (`pave`) is a 10 m quad grid
refined to 2.5 m along the roads, stopped at the sidewalk back, 8 cm over the ground, drawn in the sidewalk material:
`K_PLAZA` 0.9 m pavers in two greys (albedo 0.28–0.38) with a dark band every fourth course; `K_LOT` aged asphalt
(0.11–0.17) with 2.6 m bay lines in double rows of 5 m bays either side of 6.5 m aisles, the bays a shade darker, oil
drips at the bay heads. Lots carry parked cars (two boxes, 12 paints, 42 % of the bays, nose to the aisle) and a street
lamp on the bay-row line every 14 bays; plazas carry concrete planters with clipped shrubs and benches along the
frontages (one cell in three) and in the open (one in twelve), their cells marked occupied for the vegetation. Cars and
planters live in a `yard` soup per cell (never a caster, never mirrored) drawn to 650 m, with a one-box far shape past
300 m.

## Counts (node harness over the generated world)

| item | count |
|------|------:|
| sidewalk runs / curb returns | 23 117 / 22 163 |
| signalised intersections / mast arms | 601 / 2 250 |
| stop signs | 9 911 |
| lamps (arterial / street / ped / highway) | 2 478 / 35 574 / 52 / 123 (round 2); 39 817 street-planned after round 4 (highway poles now the highway module's, + verge lamps, lot lamps, masts) |
| sidewalk triangles (fine / far index) | 2.52 M / 0.83 M |
| kit triangles (large / small) | 0.37 M / 1.09 M |
| plazas / lots (round 4, merged tree) | 72 / 38 |
| parked cars / planters | 5 996 / 1 780 |
| paving triangles / yard triangles (near / far shapes) | 44 k / 217 k / 93 k |
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

Round 2 bench (build 5a857b5d): cockpit-city 263 / 1 140 k, bridge-low 263 / 758 k, skyline-high 230 / 1 242 k,
night 258 / 1 297 k.

### Rounds 3–5: the critic's views, before / after (hourly snapshots, same URLs, 1280 × 720)

h07 = integration build 61706b38 (16:17, everything but rounds 3–4 of this branch), h08 = 9a64e1fb (17:17, this
branch merged at edf280b5: rounds 3 and 4 before the budget trims). The h08 column is what the plazas, lots, masts and
thin members cost as first built; round 5's trims (far shapes for signals and shelters past 300 m, 3-D range for the
small kit, open boxes, 33 % bays, far index from 400 m, 1.2 km cull) are estimated by the node frustum harness at
−99 k in city_north, −54 k in city_200m, −165 k in city_500m and −30 k in street_2m, to be confirmed by the next
snapshot / own capture.

| view | h07 calls / tris | h08 calls / tris | Δ | after trims |
|------|-----------------:|-----------------:|--:|------------:|
| city_north | 284 / 1 441 k | 289 / 1 572 k | +5 / +131 k | |
| city_200m | 260 / 1 380 k | 263 / 1 467 k | +3 / +87 k | |
| city_500m | 217 / 999 k | 220 / 1 088 k | +3 / +89 k | |
| street_2m | 265 / 1 250 k | 267 / 1 325 k | +2 / +75 k | |
| harbor | 277 / 1 063 k | 281 / 1 055 k | +4 / −7 k | |
| night | 265 / 1 309 k | 265 / 1 295 k | 0 / −14 k | |
| highway_bridge | 276 / 797 k | 274 / 790 k | −2 / −7 k | |
| skyline_high | 241 / 1 243 k | 241 / 1 233 k | 0 / −10 k | |
| cockpit | 276 / 1 158 k | 276 / 1 152 k | 0 / −6 k | |

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
- **Highway agent**: done — the highway furniture module lights the highways and causeways since the merge of
  7ec36aaa; the streets keep only the interchange masts at the highway ends. If the module wants them too, they are
  `planHighwayEndMasts` (a pair 12 m in from each end on land, `mast` kind).
- **Traffic agent**: the lots carry static parked cars (two boxes, `street-yards` soup); if the traffic system grows
  parked cars of its own, drop `parkCars` in favour of its models — the bay geometry is 2.6 m bays in double rows
  either side of 6.5 m aisles, 16.5 m period, from the lot corner in the district frame.
