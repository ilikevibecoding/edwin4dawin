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
frontages (one cell in three) and in the open (one in twelve); the planters reserve no ground (round 6: the city's
`markOccupied` rounds any radius up to whole 10 m cells, so marking them blanked the plazas' street trees), the lots are
marked whole so no tree stands in a bay row. Cars and
planters live in a `yard` soup per cell (never a caster, never mirrored) drawn to 650 m, with a one-box far shape past
300 m.

### Round 5 — budget trims and the eye-level read (h07 → h08 measured, see DEFECTS 5.1–5.3)

Far shapes for the signals and shelters past 300 m per cell, open-bottom boxes for cars and planters, 33 % of the bays
taken, the small kit's 300 m range measured in three dimensions, sidewalk far index from 400 m, everything culled at
1.2 km; the wheel-path rhythm half again as strong under 5 cm/px with a 2 m binder/fuel mottle; plazas in 10.8 m paving
fields a tone apart with 0.6 m granite strips, base 0.26–0.36.

### Round 6 — the h08 regression read and the terminal hardstand (h03 defect 9: harbor A5–D8)

The plaza trees: h08 had lost every downtown street tree in the plazas because each planter's `markOccupied(1.2)`
blanked a 30 m square (the city rounds the radius up to whole cells). Planters now reserve nothing; shelters, promenade
samples and masts mark only the cells their footprint touches (`occupy`); the lots are marked cell by cell. The
downtown block interiors keep 2 226 of 3 375 free cells (1 482 on h08; the rest is the lots, on purpose).

The port terminal hardstand (`buildPortYard`): the island is paved edge to edge, short of the roads and the quay
walls, in a `K_YARD` kind of the sidewalk material in 250 m tiles (one per cell), +26 k triangles world-wide: aged
asphalt-concrete 0.17–0.25 in 7.5 m slabs a tone apart (±6 %) with 30 m staining blotches (±15 %) and darker wear
fields; the north yard's slot grid — yellow lines at the stacks' 12.6 × 5.25 m pitch in the 9 × 4 block layout of
`buildPort` — with oil stains under three bays in five; on the truck lanes (two 7 m lanes about v = 92, an aisle 16 m
before each block row) polished wheel tracks, drips and an 8 % lane-wide darkening. Every line is box-filtered, so at
0.5 m/px a block's grid is a faint tone and at 2 m/px the 9 × 4 blocks and the lanes still read. The props' painted
lane lines sit 2 cm above the paving; the masts' pools light the yard at night through the lamp map. The first tone
(0.36–0.46, the critic's "0.35–0.45") rendered at sRGB 171 against the 99 of the terrain ground it covers — near-white
under this renderer's sun, as the walks were in round 1 — and was brought down to 0.17–0.25 (a8360bfe).

### Round 7 — plazas as designed ground, streets with parked cars, plazas lit (the h09 read at 200 m; DEFECTS 7.1–7.6)

- **Planting beds** (`K_PLAZA`, shader only): about a third of the 10.8 m paving fields, picked by a smooth per-field
  noise so they cluster two to six with 2.7 m paved paths between, each a lawn-and-groundcover fill with a mulch margin
  inside a 0.45 m concrete kerb. From 200–500 m a plaza is grey paving with lawn groups instead of one flat plane.
- **Curbside parking** (`parkCurb`): 6.2 m bays 1.2 m in from the curb along the dense districts' 12–14 m grid
  streets (the traffic drives 1.8 m from the centreline there; the arterials' outer lane leaves no room), from 8 m past
  each corner, clear of bus stops and hydrants, 60 % taken downtown and 45 % in the mid-rise rings, one car in six a
  van, noses with the traffic; 11.3 k cars. Where another carriageway overlaps the street the bay is skipped.
- **Yard LOD**: the two-box near shapes are drawn within 160 m in three dimensions (was 300 m horizontal), so from
  200 m up every car and planter is its one-box far shape; the parking lanes come in under the h09 street-triangle
  count in the three aerial views (node estimate city_north 225 → 216 k, city_200m 210 → 207 k, city_500m 197 → 195 k;
  street_2m 287 → 302 k).
- **Plaza lanterns**: pedestrian lamps over one open cell in ten of every plaza (394), so the plazas are lit spaces at
  night with their own dots and 5 m pools.

### Round 8 — the h10 read: the lamp budget root cause, cars at eye level, bed tone (DEFECTS 8.1–8.5)

- **Headless frame harness** (`/tmp/street/frame-entry.ts`, node): the full world with the CSM cascade fitting,
  `ViewCull` and every system's `updateLod`, then triangles per system and per pass (camera, each cascade, mirror).
  It found what the camera-only frustum harness had missed: a lamp is drawn up to four times a frame and the props'
  2.5 km chunk LOD keeps its fine shape over the whole 600 m lamp range, so round 7's 394 lanterns (128 triangles)
  cost street_2m 94 k and city_north 48 k, which put city_north 3 k over the cap in h10.
- **Lamp diet** (`props.ts`, feaf5ba8): open-tube poles, 8-gon fine / 4-gon coarse shapes, one glowing head box in the
  coarse shape (arterial/street 52 / 32 triangles, were 84–76 / 60; lantern 42 / 16, were 128 / 80), and the mirror
  and shadow batches always take the coarse shape. Measured in h11: city_north −107 k (estimate −107 k), street_2m
  −126 k, city_200m −90 k, city_500m −25 k; every view under the cap.
- **Cars at eye level** (380606fc): a belted body with a dark sill band for tyres, arches and underside, and a raked
  cabin with glass sides and the roof in the paint (28 triangles, were 20; the soup shades faces by belt line, no extra
  geometry). Far shapes unchanged.
- **Bed tone** (72a88424): the bed lawn into the parks' turf family (0.060–0.136, was 0.15–0.34: lime from 200 m) and
  the mulch to dark bark.

### Round 9 — signal heads from the air, arterial pole spacing (DEFECTS 9.1–9.3)

- **Signal heads** (8ac38df2): FDOT-pattern heads — highway-yellow housing and visors on a 0.66 × 1.42 m black
  backplate (a two-sided 4-triangle sheet), near and far shapes, thin-flagged: from 200 m a head is a 2 × 5 px dark
  tab with a yellow line down it at the arm's end, where a dark housing merged with the asphalt. +3.5–6.5 k a view.
- **Arterial poles at most 40 m apart** (d7baee2b): `ceil` instead of `floor` for the run intervals (29–40 m over the
  block lengths; a 100 m block had 44 m), verge lamps 35 m; arterial lamps 3 571 → 4 109.
- **Parked cars cast at eye level** (bf6bc550, defect 7.5 with the diet's headroom): the yard's near shapes cast into
  the finest cascade only within their 160 m range (+56.5 k in street_2m, +0 in the aerial views).
- **High-mast night dots** (321eb1cf): the port's masts were one faint pixel each from the night view's 2.3 km (the
  1.5 px floor of every lamp dot, found by differencing the h07 and h11 night frames over the terminal); mast dots now
  hold 3 px, so the terminal carries its row of bright points at night. *Superseded by round 10: the h12 night frame
  was unchanged, because the dots were not being drawn at all.*

### Round 10 — the h12 read, and the lamp dots' root cause (DEFECTS 10.1–10.4)

- **The lamp dots never rendered against anything but the sky** (d37ed6d9). The renderer runs a logarithmic depth
  buffer; the dot `ShaderMaterial` had none of the `logdepthbuf` chunks, so each dot's hardware z (0.9998 at 2.3 km,
  0.996 at 100 m) was tested against the scene's log z (0.71 for water 200 m behind a mast, 0.42 for a facade at
  100 m) and lost. Every night frame since round 1 showed the lit head geometry within 600 m and the pools of the lamp
  map — never a dot: the bench night view's downtown at 3.7 km has windows and no street lamps, the terminal no masts.
  Rounds 9's 3 px floor and c1db632d's depth write were reasoned from frames without a working dot and changed
  nothing. With the chunks in (as `plane/parts/lights.ts` has them) the dots test and write the same log depth as
  everything else, and the sprite moves 0.6 m toward the camera so its own housing box does not hide its centre
  within LAMP_FAR. **Seen in h13** (9719cbd1): the first night frame with the dots — the port's row of masts and yard
  lamps at 2.3 km, the suburban grid as strings of warm dots along its streets, the shore road to the causeway as a
  lamp line, the downtown's ground lit between the towers; at 2.3–4 km the dots match the causeway heads' brightness.
  Counters and day frames unchanged. Not yet seen at 200 m (4.5 px sprites), where the gain could prove strong.
- **h12 read** (5d1a1da5, this branch at ac0bb6ad): bed tone, the belted cars with their shadows and the yellow
  heads on backplates all seen (DEFECTS 10.3); counters in the budget table (DEFECTS 10.2): street_2m +71.5 k for the
  cars' shadows, near shapes and backplates (estimate +72 k), the aerial views +3.5–7 k, every view under the cap.

### Round 11 — street-level surface realism at the street_2m camera (DEFECTS 11.1–11.7)

The lead merged first (762b199d: the half-cell terrain fix — `heightAt()` and the rendered ground agree, so the
kerbs and footings placed on the CPU height field now meet the ground they were computed for; re-checked on the 10 %
grades of the suburban grid in round 15). Then the road shader's eye-level layer (9894f05d): the asphalt at 2 m read
as one tone with crisp paint because every wear term of rounds 2–3 was sized for the aerial footprint and faded within
25 m of the camera.

- **Tonal patchwork**: mill-and-fill lane rectangles 12–40 m long in a third of the 48 m cells of every lane (tone
  0.72–1.22 with a sealed 5 cm joint), patches 4.5 → 7 %, black 4.5 cm longitudinal joints at every lane edge and
  27 m transverse joints, the utility trench scars kept; **alligator cracking** (a Worley F2−F1 cell network at
  0.4 m cells) in the worst of the crack zones, at eye level only.
- **Gutter**: grime graded to the kerb with run-off streaks, leaf litter and grit in the last half metre.
- **Paint age**: a third of the repaving bands carry the old coat at half brightness, flaked away in 0.8 m bites; the
  round-3 ghost markings kept. **Manholes** on the centreline or the lane centres, the gullies at the kerb.
- **Tyre polish**: roughness −0.24 in the wheel paths at eye level (−0.10 from the air), so the sky's sheen sits in
  the wheel paths; and a **2 % crown** applied to the shading normal after `normal_fragment_maps` (the across vector
  from the screen-space derivatives of the uv), which shifts the sheen band across the road without touching the mesh.
- Every term is box-filtered or fades with the pixel footprint: from the air the tone changes only by the lane-wide
  patches. Before / after served from their own ports (`r103b` on the pre-round build, `r104` on round 11).

### Round 12 — sidewalk life downtown (DEFECTS 12.1–12.5)

- **Street trees in grates** (0f4113f1): a 1.2 m cast-iron pit grate 1.05 m from the kerb every 12–16 m on three
  downtown faces in four and half the mid-rise ring's, a street of palms or of shade trees per chain, planted
  through the vegetation system — `Vegetation` takes an optional street-tree list (`Streets.streetTrees`: archetype,
  position, height), so the trees take its species, crown tiers, cards, wind and shadows and the palette needs no
  coordination. 6 004 trees. The tree pits keep clear of every lamp, shelter and rank placed on the walk.
- **Kerb-side furniture**: newspaper-box ranks (1–3 coin boxes in publisher colours with dark windows) and blue
  mailboxes near the corners, inverted-U bike racks at the back of the walk, black litter cans mid-block downtown:
  1 955 / 277 / 1 302 / 740, on top of the benches, bins, hydrants, shelters, cabinets and bollards of round 1.
- **Awnings and blade signs at the retail bases**: `city.ts` exposes the ground massings (`BuildingBatches.groundBoxes`,
  additive); `dressRetail` finds every retail-style box whose face looks at the run from 2.3–9 m behind the kerb, cuts
  it into 5–8 m shopfronts and hangs an awning (1.3 m out at 18°, valance, six canvases) over 55 % of them and a blade
  sign (lit at night, `EM_SIGN`) at one end of 35 %: 1 482 awnings, 879 signs.
- Pedestrian impostors skipped: a flat card at 2 m reads as a cut-out.
- Cost as first built (frame harness): street_2m +184 k (113 k of it the trees' 3D crowns, 58 k the small kit),
  city_north +88 k (69 k the crowns) — paid back in round 15.

### Round 13 — the kerbed arterial medians (DEFECTS 13.1–13.2)

- `traffic.ts` now editable: the 4-lane arterials' inner lane moves from 1.5 to 2.6 m off the centreline (other 4-lane
  roads unchanged), the offset the round-7 report had asked for. The road shader lays those arterials' lanes from
  1.0 m (edges 1.0 / 4.2 / 7.4 m: lane line, ghost, edge line, arrows, wheel paths, mill-and-fill and manholes all
  follow `laneO`).
- **The median** (574ef15b): a 2 m raised strip — 0.3 m kerb tops, 0.15 m faces, a 1.4 m planting strip of the plaza
  beds' turf with a mulched bed (`K_MEDIAN` in the sidewalk shader) and a palm every 18–24 m through the vegetation
  list — with rounded noses, between **openings 21 m past the box of every signalised junction, arterial crossing and
  chain end** (the painted left-turn pocket the traffic uses), a crosswalk cut at the minor streets, and 10 m
  mid-block gaps in three stretches of five over 140 m. 449 pieces, 40.2 km, 1 871 palms, +94 k walk triangles
  world-wide (+4–12 k per bench view).

### Round 14 — the frontage street beside the coastal highway (DEFECTS 14.1; highway agent's request 3)

- A street whose edge runs within 8 m of a highway or causeway shoulder, parallel to it, is flagged per row in the
  road info buffer (class code + 0.25; `highwayGap` / `frontageAt` in `roads.ts`) and the shader tones it down to
  three quarters of the asphalt with no bright repaving bands and its dashes worn to a trace (c194f415): from the
  air it stops reading as 22 m of pale pavement with yellow dashes beside the highway. The grid's southernmost
  street runs 2.5 km against the shoulder (edge gap −0.3 m over 1.2 km, opening to 23 m at the ends).
- **The planted buffer**: where the strip between the walk and the shoulder leaves 2.2 m, a sea-grape hedge every
  5–7 m down its middle and a palm every fourth where 3.5 m remain (`plantFrontageBuffer`, through the vegetation
  list): 175 plants, 0.6–9.9 m clear of every road edge. Where the street abuts the shoulder the tone alone
  separates them. No change in the four bench views (frame harness).

### Round 15 — the budget round (DEFECTS 15.1–15.3)

Rounds 12–13 had put the frame harness at street_2m 1 218 k / city_north 979 k for the four street-side systems,
which with h13–h14's other systems (329 / 519 k) is 1 547 k / 1 497 k: over and at the cap. Four changes that
alter nothing visible, each verified in the harness:

- **The small kit in 250 m cells** (`SMALL_CELL`): it was built per 500 m cell with the cell's box as its only cull,
  so at eye level three or four whole cells of it drew — 140 k at street_2m, most of it behind or beside the
  camera. Its own quarter-cells: 140 → 49 k (street_2m), 32 → 8 k (city_north), 58 → 26 k (city_200m); +1 draw.
- **Walk LOD in three dimensions** (`WALK_NEAR` 400 → 250 m, measured to the cell box in 3D): the 0.15 m kerb face
  the far index drops is 0.8 px at 250 m from eye level and a pixel straight down from 200 m up. city_north's fine
  walk rows 58 → 14 k, city_500m −22 k.
- **Lamp LOD in three dimensions** (`LAMP_LOD` 150 m): a 0.15 m pole is 1.4 px at 150 m and the thin-member
  inflation holds its silhouette either way; from the air every pole is the 4-gon. city_500m −24 k.
- **Lamps and the large kit cast into the finest cascade only**: in the second cascade's 0.5 m texels a pole or a
  mast arm is under a texel and a shelter roof a 3 × 7 texel blot seen at a grazing angle. city_north −48 k,
  city_200m −68 k, street_2m −57 k of shadow triangles.
- Tried and dropped: more palm streets (a palm costs a third of a crown at eye level but keeps 3D fronds to 650 m
  against a crown's 420 m: −11 k at street_2m, +4–11 k from the air) and a thinner tree row (the aerial vegetation
  pass is bound by its own tier budgets, so the street trees displace park trees rather than add: −7 / +1 k).

## Counts (node harness over the generated world)

| item | count |
|------|------:|
| sidewalk runs / curb returns | 23 117 / 22 163 |
| signalised intersections / mast arms | 601 / 2 250 |
| stop signs | 9 911 |
| lamps (arterial / street / ped / highway) | 2 478 / 35 574 / 52 / 123 (round 2); 39 817 street-planned after round 4 (highway poles now the highway module's, + verge lamps, lot lamps, masts); round 7: arterial 3 571 / street 36 215 / ped 446 / mast 15 = 40 247; round 9: arterial 4 109 / street 36 215 / ped 446 / mast 15 = 40 785 |
| sidewalk triangles (fine / far index) | 2.52 M / 0.83 M |
| kit triangles (large / small) | 0.37 M / 1.09 M (round 9: 1.48 M near kits together, 0.20 M far kits) |
| plazas / lots (round 4, merged tree) | 72 / 38 (round 7 tree: 71 / 40) |
| parked cars (lots / curbside) / planters | 5 018 / 11 283 / 1 773 (round 7; the lots held 5 996 at 42 % occupancy in round 4) |
| paving triangles (plazas + lots 47 k, port yard 26 k) / yard triangles (near / far shapes) | 70 k / 396 k / 181 k (round 7, with the parking lanes; 203 k / 85 k in round 5) |
| street cells | 558 (566 in round 7) |
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

| view | h07 calls / tris | h08 calls / tris | Δ h07→h08 | h09 (after trims + round 6) | Δ h07→h09 |
|------|-----------------:|-----------------:|----------:|----------------------------:|----------:|
| city_north | 284 / 1 441 k | 289 / 1 572 k | +5 / +131 k | 283 / 1 466 k | −1 / +25 k |
| city_200m | 260 / 1 380 k | 263 / 1 467 k | +3 / +87 k | 262 / 1 420 k | +2 / +40 k |
| city_500m | 217 / 999 k | 220 / 1 088 k | +3 / +89 k | 210 / 920 k | −7 / −80 k |
| street_2m | 265 / 1 250 k | 267 / 1 325 k | +2 / +75 k | 268 / 1 307 k | +3 / +57 k |
| harbor | 277 / 1 063 k | 281 / 1 055 k | +4 / −7 k | 286 / 1 072 k | +9 / +10 k |
| night | 265 / 1 309 k | 265 / 1 295 k | 0 / −14 k | 262 / 1 289 k | −3 / −21 k |
| highway_bridge | 276 / 797 k | 274 / 790 k | −2 / −7 k | | |
| skyline_high | 241 / 1 243 k | 241 / 1 233 k | 0 / −10 k | 240 / 1 231 k | −1 / −12 k |
| cockpit | 276 / 1 158 k | 276 / 1 152 k | 0 / −6 k | 275 / 1 147 k | −1 / −11 k |

h09 = 1989b9fb (18:17, this branch at 2b537141: rounds 3–6 with the trims). The trims measured −107 k in city_north
(estimate −99 k), −168 k in city_500m (estimate −165 k), −47 k in city_200m (estimate −54 k), −18 k in street_2m
(estimate −30 k); every view is under the 1.5 M cap, and the three aerial city views sit within +40 k / +3 calls of
h07 while carrying the lots, plazas, cars, poles, masts and the terminal hardstand.

| view | h09 calls / tris | h10 (rounds 3–7) | Δ h09→h10 | h11 (lamp diet) | Δ h10→h11 | Δ h07→h11 |
|------|-----------------:|-----------------:|----------:|----------------:|----------:|----------:|
| city_north | 283 / 1 466 k | 285 / 1 503 k | +2 / +37 k | 285 / 1 396 k | 0 / −107 k | +1 / −45 k |
| city_200m | 262 / 1 420 k | 262 / 1 447 k | 0 / +27 k | 262 / 1 357 k | 0 / −90 k | +2 / −23 k |
| city_500m | 210 / 920 k | 212 / 934 k | +2 / +14 k | 212 / 909 k | 0 / −25 k | −5 / −90 k |
| street_2m | 268 / 1 307 k | 273 / 1 410 k | +5 / +103 k | 273 / 1 285 k | 0 / −126 k | +8 / +35 k |
| harbor | 286 / 1 072 k | 287 / 1 073 k | +1 / +1 k | 287 / 1 068 k | 0 / −5 k | +10 / +5 k |
| night | 262 / 1 289 k | 262 / 1 289 k | 0 | 262 / 1 289 k | 0 | −3 / −20 k |
| skyline_high | 240 / 1 231 k | 240 / 1 231 k | 0 | 240 / 1 231 k | 0 | −1 / −12 k |
| cockpit | 275 / 1 147 k | 275 / 1 147 k | 0 | 275 / 1 147 k | 0 | −1 / −11 k |

h10 = 5b3fcb77 (19:17, this branch at bcf7ffa4: round 7's lanterns and parking lanes) went 3 k over the cap in
city_north; the headless frame harness traced the +37 k / +103 k to the lamps being drawn into the mirror and two
cascades at their fine shape (DEFECTS 8.1). h11 = b0850ffa (20:17, feaf5ba8: the lamp diet) measured −107 k in
city_north against an estimate of −107 k, −126 k in street_2m (estimate −140 k), −90 k in city_200m (−138 k), −25 k
in city_500m (−51 k). Every view is under the 1.5 M cap with ≥ 100 k of headroom, and the three aerial city views sit
below h07 — before any of this branch's rounds 3–9 — while carrying the lots, plazas, beds, cars, poles, masts,
signals and the hardstand. Rounds 8–9's later commits (cars, bed tone, backplates, arterial poles) are estimated by
the frame harness at +5–8 k a view (street_2m +9 k with the cars' near shapes), to be read in h12.

| view | h11 calls / tris | h12 (rounds 8–9: cars, beds, heads, poles, cars' shadows) | Δ h11→h12 | estimate | Δ h07→h12 |
|------|-----------------:|----------------------------------------------------------:|----------:|---------:|----------:|
| city_north | 285 / 1 396 k | 285 / 1 401 k | 0 / +5 k | +5–8 k | +1 / −40 k |
| city_200m | 262 / 1 357 k | 262 / 1 364 k | 0 / +7 k | +5–8 k | +2 / −16 k |
| city_500m | 212 / 909 k | 212 / 912 k | 0 / +3.5 k | +3.5 k | −5 / −87 k |
| street_2m | 273 / 1 285 k | 275 / 1 356 k | +2 / +71.5 k | +72 k (shadows 56.5, cars 9, plates 6.5) | +10 / +106 k |
| harbor | 287 / 1 068 k | 287 / 1 068.5 k | 0 / +0.1 k | 0 | +10 / +5 k |
| night | 262 / 1 289 k | 262 / 1 289 k | 0 | 0 | −3 / −20 k |
| skyline_high | 240 / 1 231 k | 240 / 1 231 k | 0 | 0 | −1 / −12 k |
| cockpit | 275 / 1 147 k | 275 / 1 147 k | 0 | 0 | −1 / −11 k |

h12 = 5d1a1da5 (21:17, this branch at ac0bb6ad). The frame harness's estimates held to within 3 k in every view.
Every view is under the 1.5 M cap (city_north by 99 k); street_2m's +71.5 k is the price of the cars' shadows at eye
level (defect 7.5) and stays 144 k under the cap. Round 10's dot fix (d37ed6d9) adds no triangles: the 40 785 point
sprites were already drawn (and discarded by the depth test) in every night frame.

## Rounds

See `DEFECTS.md`. Round 0 = baseline, round 1 = first build (shader compile fix, terrain z-fight, footing validation,
lamp density, LODs), round 2 = the surface read (aged asphalt, repaving bands, paler wheel paths, matte roughness,
aggregate grain, darker concrete, apex ramps), night pools at a gain that grades instead of clipping, lamp budget,
cameras re-posed over the carriageway; round 3 = the h03 surfaces and lighting infrastructure (wheel-path rhythm, oil
strip, ghost markings, ironwork, slab grid, kerb stones; thin members, masts, verge lamps); round 4 = plazas and lots;
round 5 = budget trims and the eye-level read; round 6 = the plaza-tree regression and the terminal hardstand; round 7 =
plaza planting beds, curbside parking with the yard LOD that pays for it, plaza lanterns; round 8 = the h10 budget root
cause (the lamp diet, measured in h11), cars at eye level, bed tone; round 9 = signal heads from the air, arterial
pole spacing; round 10 = the h12 read and the lamp dots' root cause (no log depth in the dot shader: no dot ever
rendered against ground or buildings), fixed for h13.

## Self-scores (h03 critic → h12 frames, 0–10; the critic's h03 scores in brackets)

| frame | 21 street-level detail | 22 lighting infrastructure | seen in h12 (5d1a1da5: rounds 3–9) |
|-------|-----------------------:|---------------------------:|-------------|
| city_north | 7 (5) | 6 (3) | apron lots with cars, plazas with fields, planters and beds in the parks' turf tone, poles along the six-lane avenue as pixel lines 29–40 m apart; the signal heads are yellow points on black tabs at the arm ends — legible at 8× zoom, a 2 × 5 px feature at 200 m |
| city_200m | 7 (6) | 6 (4) | lots and poles at A5–D8; the lamp line along the bayfront arterial |
| city_500m | 7 (5) | 5 (4) | plazas read as paved fields with bed groups, planters and the street trees; poles are sub-pixel at 500 m by day |
| street_2m | 7 (5) | 7 (6) | wheel-path rhythm, oil strip, ghost markings, ironwork, kerb stones; signal mast arms with yellow housings and lit aspects, the lamp arms over the avenue; kerbside cars with sill band, raked cabin and their shadows |
| harbor | 7 (4) | 6 (3) | masts over the yards; the hardstand at median sRGB 126 with slab tones, truck-lane darkening and the slot grid (was 171 in h09, near-white) |
| night | — | 7 (5) | h13: the port's masts and yard lamps as a row of bright points at 2.3 km, the suburban grid as lamp lines, the shore road to the causeway as a lamp line, the downtown's ground lit between the towers — the first night frame in which the lamp dots rendered (DEFECTS 10.1); h12 and every frame before it had the causeway line and the windows only. The city_north / port300 / street_2m night frames are still queued (own capture, `r102`) |

Not claimed: the night read at 200 m (lamp lines along the avenues at 4.5 px a sprite, the lanterns, the lot lamps,
the lit aspects of the yellow heads, the pools under the poles). Round 10 found that the lamp dots — the "lines of
light" from the air — had never rendered against ground or buildings (DEFECTS 10.1, the log depth); h13 is the first
frame with them, at 2.3–4 km. The branch's own night jobs (`r100`–`r102`) have been queued on the two builder slots
since 15:58 / 18:39, the slots held by other agents' sessions for 4–9 h.

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
- **Vegetation agent**: the plazas are paved fields with planters (72 downtown blocks, `buildPlazas`); the street trees
  in them come from the downtown 2 % cell density. A plaza-aware pass (say 6–8 % inside the plaza rects, palms and sea
  grape) would give the critic's "trees kit"; the rects can be exposed from `Streets` on request.
- **Terrain agent**: the port island's ground is now covered by the yard paving except a 2.5 m strip along the quay
  walls (the paving stops where any of a cell's samples is under 0.9 m); that strip reads as the quay coping.
- **Traffic agent**: the lots carry static parked cars (two boxes, `street-yards` soup); if the traffic system grows
  parked cars of its own, drop `parkCars` in favour of its models — the bay geometry is 2.6 m bays in double rows
  either side of 6.5 m aisles, 16.5 m period, from the lot corner in the district frame. The curbside cars
  (`parkCurb`, round 7) stand 1.2 m in from the curb of the 12–14 m grid streets, i.e. 4.8–5.8 m from the centreline,
  assuming the street traffic keeps to `laneOff0` = 1.8 m; if that offset grows past ~2.6 m the parking lane must go.
  Conversely, a kerbed median on the arterials (the gauntlet's "medians with curbs and planting strips", defect 1.15)
  needs the arterial `laneOff0` moved from 1.5 m to ~2.6 m first: with the inner lane at 1.5 m a car body starts
  0.6 m from the centreline and no median wider than paint fits.
