# City architecture — report (branch `cursor/facade3-loop-8213`)

Owner: City Architecture Agent (rubric 17 City skyline [hero], 18 Building geometry [hero], 19 Building
materials, 20 Rooftop density). Files owned: `src/world/city.ts`, `src/world/facade.ts` (plus one `city-close`
entry in `src/bench/views.ts` and the `brickell` district line in `src/world/map.ts`, both merged in the lead).
Defect log with per-round OBSERVE / CRITIQUE / CHANGE / EVIDENCE: `DEFECTS.md` (rounds 0-11 the glass and the
skyline, rounds 12-19 block fill, roofs and ground floors). Evidence stills: `/tmp/facade3/r4 … r16` (dev poses,
1920x1080 from R12 on) and `bench/out/city-r10-*`; the six before/after crops the task asked for are in
`/opt/cursor/artifacts/city_*.jpg`.

## Phase 4 (rounds 12-19): block fill, roofs at 130-500 m, ground floors

The user, looking at the skyline after phase 3: "that city is looking so much better". The lead's next brief named
the biggest remaining aerial giveaway at 200-500 m: towers isolated on uniform grey ground, whole blocks with
one or two buildings and large empty pale lots; then the pale blank slab roofs on the mid-rise and the suburbs;
then buildings that meet the ground as a line. The skyline massing and the glass were kept (the tower draws and
their recipes are untouched; the per-block streams of R15 keep them fixed through every later round).

### What a block is now (city.ts)

- **Parcels to the street line.** Each block is planned in exact block-local rectangles (`BlockPlan`), with what
  stood on it before (landmarks and their plazas, other districts, authored props) read once as foreign. Towers
  keep their draws; a podium liner of 3-8 storeys wraps them; every free edge is tiled with parcels of 12-30 m
  frontage (`parcelRow`, `streetWall`) whose count comes from the edge length so the wall fills the edge exactly,
  buildings shoulder to shoulder with party walls, heights 3-8 storeys downtown and 2-7 on the ring, families
  by neighbourhood, penthouse storeys and rails on some, coping on the rest. The parcel depth stops at the
  block inset: roads, pavements and props are the street builder's and are never entered.
- **Interiors and open space.** Behind the wall: a service alley and the tenants' striped parking downtown, a
  courtyard of lawn, pools and hedges on the residential blocks. A block the density roll leaves open is a
  designed one: a striped surface car park with its cars, booth and lamp; a pocket park (lawn, paver paths,
  hedges, pool; trees via `openSpaces`); or a paved square with planters and a fountain. Parking structures
  (open decks, stair tower, ramp hood, cars on the roof) on some parcels. The cars are their own instanced kind
  (`car`, 900 m, one cascade); beyond 900 m the lot shaders draw them as blobs in the stalls.
- **Podium roofs have a programme** (`podiumRoof`): roof parking, an amenity deck (pool, loungers, lawn,
  pergola, cabanas, planters), a plant yard (the tower's cooling towers and RTUs) or a green roof, over the
  largest free rectangle, a rail round the parapet.
- **Ground floors** (`groundFloor`): a shop parade's canopy over the pavement or a run of awnings, a tower's
  entrance canopy, a walk-up's stoop and door hood, on the face the builder names (`PlaceOpts.front`); the shader
  puts the entrance, lobby, shopfronts and loading dock on the same faces (`aStyle2.w = 10 + face`, `20 + face`
  for retail) and adds a base course and a single-storey lobby band.
- **Beachfront** (R16): the hotel block is planned the same way: tower with its entrance on the avenue, a
  rooftop pool deck on most slabs (bulkhead at one end, `amenityDeck` over the rest), a pool wing toward the
  beach whose whole roof is a resort deck (pool, loungers both sides, cabanas, bar pavilion), guest parking
  behind (striped lot or a 2-3 deck structure).
- **Sheds and big boxes** (R16): docks with yards, aprons, canopies and trailers; RTUs in rows down the bays,
  skylight domes, stacks, tanks; the strip mall's canopy and shopfronts face its car park.

### What a roof is now (facade.ts)

Six roof families per building from its seed, biased by facade style and roof area: pale TPO (0.50 weathered,
seams, corner grime, ponding stains), grey coating (0.30, rolled seams, chalky wear), gravel ballast (0.26, grain
while it spans pixels, a paver walkway), dark bitumen / EPDM (0.11, ponding with a sky sheen), standing-seam
metal (ribs every 0.45 m; never on glass towers), and on the sheds metal decking (galvanised / weathered white /
rusting, ribs every 0.3 m, panel laps, rust bloom and streaks, skylight strips). Every mark fades to the family's
mean as it goes sub-pixel, so a far roof is a tone, never a shimmer. Every flat roof has a coping and the
parapet upstand's shadow along the edges the sun stands beyond (reach = upstand / tan(elevation) in the roof's
own frame, masking direct light only), and a drainage stain from a low corner. The kit (`addRoofDetail`,
`addSmallRoofKit`, `infillRoof`) stands on every roof surface: RTUs with ducts, penthouses and bulkheads, tanks on
legs, cooling towers, screen walls, solar rows, cell masts and dishes, condensers, vents with caps, hatches,
skylights, pipe runs, rails; beyond 1.5 km the shader's pads stand in. A flat-roofed house carries a family
named by its block's roof colour instead of tile paint; pitched houses keep their tile slopes.

### Evidence (before = R11 build on port 4583, after = R16 build bf7ea526; 1920x1080, 14:00, seed 20260904)

The crops in `/opt/cursor/artifacts/`:

| Crop | Pose | What it shows |
| --- | --- | --- |
| `city_01_block_fill_500m` | `city_500m` | the CBD from the SE: blocks filled to the street line, podiums, lots with cars, squares, roof families |
| `city_02_block_fill_200m` | `city_200m` | the east side at 200-400 m: street walls, alleys, parking decks, podium programmes |
| `city_03_roofs_220m` | `roofs_220m` | straight down onto mid-rise roofs: families, coping, upstand shadow, kit |
| `city_04_ground_floors` | `ground_a` / `ground_b` | canopies, awnings, stoops, lobbies at street level |
| `city_05_beachfront_300m` | `hotel_300m` | the hotel slabs from over the sea: rooftop pool decks, pool wings, guest parking |
| `city_06_sheds_260m` | `industrial_260m` | the sheds: deck roofs, kit, docks with trailers |

EVIDENCE_TABLE

## Phase 3 (rounds 0-11): the skyline and the glass — kept

1. **A coated dielectric** (R2). F0 per glass family and per-pane grain; the diffuse colour is the room behind
   the pane; the mirrored sky is looked up by height and stays crisp at every distance.
2. **The sun in a pane is the solar disc** (R8): glass never uses the GGX sun term; an analytic disc from each
   pane's own tilted normal, carrying the cascade's shadow; tilts follow installation tolerance.
3. **The far field is the tilt distribution's band** (R9): as panes go sub-pixel the disc hands over to a
   sub-degree band, so a distant tower reads as dark sky-coloured glass graded by height with a floor rhythm,
   blazing only where the sun's image lands. (R10: the aureole at the true mirror point; R11: what stands behind
   the glass is seen through the coating twice, a per-building blind palette, lit ceilings by day.)
4. **Skyline** (R3): two high-rise clusters either side of the river with a height gradient to the bay,
   log-normal heights, three spaced peaks, fourteen massing recipes and sixteen named landmarks; one rotation
   convention (the 2·rot yaw bug fixed in R1); `city-close` bench view.

## Self-scores (rubric v2, 1-10)

| # | Category | Base | After phase 3 | Now | Why not higher |
| --- | --- | --- | --- | --- | --- |
| 17 | City skyline (hero) | 4 | 7 | 7.5 | The skyline is unchanged by design; the street walls and podiums give the base of the clusters a plinth from 500 m, which the silhouette was missing. From 3.5-6 km the mid-rise ring is still a field of similar warm boxes; no supertall past 272 m. |
| 18 | Building geometry (hero) | 4 | 7 | 8 | Blocks are now built to the street line with party walls, podiums, decks, courtyards; canopies, awnings, stoops and lobbies stand proud of the walls. Plans are still boxes, drums and their unions; window frames and balconies are shader relief beyond 600 m. |
| 19 | Building materials | 3 | 7 | 7.5 | Six roof families with marks that fade correctly; asphalt, pavers, turf, precast decks, metal decking, rust. Masonry weathering is still procedural bands; brick and stone have no relief; the pale coating still runs bright under the 14:00 sun where it is chosen. |
| 20 | Rooftop density | 2 | 8 | 8.5 | Every roof surface carries a kit sized for its tier; podium programmes; resort decks; shed kits with docks. Ducts are runs and elbows only; no ladders, gantries, cable trays; the small kit stops at 700 m. |

## Round table

| Round | Subject | Files | Evidence | Outcome |
| --- | --- | --- | --- | --- |
| 0 | baseline (lead 6130eae7) | – | `bench/out/city-r0-base` | scored 4 / 4 / 3 / 2 |
| 1 | yaw fix (2·rot), `city-close` view | city.ts, views.ts | `/tmp/facade3/rot_*` | advanced |
| 2 | glass as a coated dielectric | facade.ts | `r1_cc`, `r1_skyline` | advanced |
| 3 | skyline depth (brickell cluster, height gradient, recipes) | city.ts, map.ts | `skyline_before_after` | advanced |
| 4 | rooftop kit | city.ts, facade.ts | `r4/` | advanced |
| 5 | fronts and backs at street level | facade.ts | `r5/` | advanced |
| 6 | mechanical floors | facade.ts | `r7/` | advanced |
| 7 | every roof surface, membrane tones, shop fronts | city.ts, facade.ts | `r7/` | advanced |
| 8 | the sun in a pane is the solar disc | facade.ts | `r8/` | advanced (GGX lobe rejected) |
| 9 | the far field is the tilt band | facade.ts | `r9/` | advanced |
| 10 | aureole at the mirror point, grid off the lobe | facade.ts | `r10*/` | advanced (12° probe mask rejected) |
| 11 | behind the glass through the coating twice | facade.ts | `r11/` | advanced |
| 12 | block fill I: parcels to the street line | city.ts | `r12/` vs `r12base/` | advanced |
| 13 | block fill II: open space, interiors, parking decks, cars | city.ts, facade.ts | `r13/` | advanced |
| 14 | roof families, parapet shadow, kit on mid-rise | facade.ts, city.ts | `r14/` | advanced |
| 15 | ground floors, podium programmes, stable streams, car LOD | city.ts, facade.ts | `r15/` | ROUND15_OUTCOME |
| 16 | beachfront resorts, shed roofs, flat house roofs, docks | city.ts, facade.ts | `r16/` | ROUND16_OUTCOME |
| 17 | ROUND17 | | | |
| 18 | ROUND18 | | | |
| 19 | ROUND19 | | | |

## Budgets (1920x1080 stills, seed 20260904; gate 400 calls / 1.5 M tris)

BUDGET_TABLE

The per-mesh breakdown (`*.tris.json` beside each still) shows where a view's triangles are: in `city_north`
(R14, 1.54 M) the city's own meshes (`city-*`) were 299 k (19 %); `roads` alone is 374,208 in every pose (the
same number from three cameras, i.e. one merged mesh drawn whole), `cards` + `crowns-*` (vegetation) 270 k,
`street-kits*` 140 k, `sidewalks*` 73 k. The city's share after R15 (cars to 900 m and one cascade, `roofcyl`
at six segments) is in the table.

## Residual defects (self-critique)

RESIDUALS

## Failed / reverted candidates

- GGX sun lobe on glass at any roughness (R8); tilt tail `0.004 + 0.06·h⁴` (R8); probe sun mask 12° (R10);
  membrane albedos 0.8 / 0.6 / 0.5 (R4); roof kit rng from the district rng (R4, reshuffled the lots);
  street poses at `y = 2` (under the terrain).
- Cars as `roofbig` kind (R13): drawn to 1.6 km and casting into two cascades they cost ~40 k tris in the budget
  view; now their own kind (R15).
- Lawn at park-turf albedo 0.24-0.32 (R13): a green flag from 500 m; now 0.06-0.14.
- A district-wide rng for towers and fill (R12-R14): every fill tweak reshuffled which block got which tower;
  R15's per-block streams and position-hashed seeds fixed it (one reshuffle, then stable).
- `areaFree` (10 m occupancy cells) for a block's own placements (`fillHotel`, `fillIndustrial` until R16):
  nothing could stand within ~15 m of the body just placed; exact block-local rectangles now.

## Requests to other agents

- **Street builder (`cursor/street-loop-8213`)**: (a) `roads` is 374 k triangles in every pose (the same count
  from three cameras and in a 200 m street pose): a merged mesh drawn whole; tiling it by district / frustum
  would give every bench view back a quarter of its triangle budget. (b) The city now lays down its own surfaces
  for what is inside the block line: asphalt lots with stall stripes (`LOT`), paver squares (`PLAZA`), turf
  (`LAWN`), the alleys and courtyards; the kerb / pavement between the block inset and the road is still the
  street builder's, and the `openSpaces` list (kind `park` / `plaza` / `lot`, rect + rot) says where the
  designed open blocks are so the pavement can meet them (a kerb cut at the lots, a paved edge at the squares).
  (c) The parcels stop at `b.streetWidth / 2 + 3` from the block edge; if the sidewalk grows past 3 m the
  street wall would need the same inset.
- **Vegetation**: `openSpaces` of kind `park` are the pocket parks (lawn with paths): they want trees;
  kind `lot` wants none; the hotel blocks' lots are in the list now too.
- **Lighting**: the hour as a shared uniform (`uHour` beside `uNight`) for the offices' lit fraction to taper
  after 21:00; a warmer, wider aureole around a low sun for the west faces' mirrored haze.
- **Lead**: the Chrome slot gate (two slots for ten builders) was the phase's critical path: R15 and R16 waited
  in the flock queue for over an hour behind two-hour batch holders; a per-builder time slice (or a third slot
  when the load is under 20) would double the round rate.
