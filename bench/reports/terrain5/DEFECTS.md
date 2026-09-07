# terrain5 — shoreline + ground textures: defect log

Branch `cursor/terrain5-loop-8213`. Files: `src/world/terrain.ts` (whole terrain shader), `src/world/groundDetail.ts` (new).
Captures: `?bench=dev`, seed 20260904, freeze, 1280×720, same camera/time per site. Sites (anchors found in the map data,
5 / 30 / 150 / 500 / 1500 m looking at the anchor): Garza beach (−112, 2798), marina shore (415, 2056), downtown
waterfront (−2212, −4419), suburb yards (−6000, −2579), park (−4946, 1870), highway embankment (571, 1450), island
keys (2915, −2515); plus the fixed `aerial-a`, `plane-rear-quarter` and a top-down over Garza.
Perf: interleaved A/B of the terrain pass only (terrain shown minus hidden, everything else off; two pages, one
SwiftShader browser; ratio of medians over 6 rounds) at the suburb (`cam=-6000,130,-2300&hdg=0&pch=-25`) and beach
(`cam=-2600,260,-4400&hdg=-70&pch=-30`) views. Budget +12 %.

## Round 0 — observe / first implementation (commits 18c446d5, 0945b58a, 6e674330)

Visibly wrong (baseline, all sites):
- Beach at 5–150 m: near-white flat sand (albedo 0.72 under the tone curve clips to white), no wet/damp bands, no
  footprints, ripples only a metre-scale noise; the wet-sand/seabed boundary is a **hard 10 m cell mosaic** where
  the jittered zone lookup alternates beach and sandbar cells along the whole shoreline (beach_30m_base D3–G4).
- Suburb / park at 30–500 m: one olive-yellow tint with a soft 20 m blotch; no per-scale texture (nothing under
  3 m, nothing between 3 and 20 m), no bare patches, paths or verge wear; at 5 m the ground is a flat colour.
- Downtown waterfront, embankments, keys: the same fringe-sand ramp everywhere, no grounding under trees beyond the
  canopy tint.
- Good, kept: the colour families (lawn / dry / sandy soil), the seabed seagrass, the far suburb roof mottle at
  1.2–3.8 km, the district street lattice baked into `uDetailTex`.

Changed:
- `groundDetail.ts`: two 1024² RGBA8 tileable textures built at startup (canvas + periodic noise, no assets):
  ground = grass clumps R, bare-patch mask G, soil grain / pebbles B, footprints A; sand = grain + shells + mineral
  specks R, wind-ripple height G, ripple normal xz BA. Mipmapped, repeat, means exported for the far field.
- `terrain.ts`: detail taps through `textureGrad` with explicit gradients (`gDwx/gDwy` taken once in uniform
  control flow; every tap sits in a zone branch, where the implicit derivative is undefined); anti-tiling by a
  second turned/rescaled tap blended by a slow noise, variance restored; micro (3 m) and meso (27 m) tiles fade to
  their means at 1.6 and 14 m/px; the beach shaded by metres from the waterline (height / slope near the line,
  map coast distance farther out) with film / wet / damp / dry bands sharing the water shader's swash width
  (4 + 12·exposure); ripple normals folded into the shading normal after `normal_fragment_maps`; footprints at
  trodden spots (baked density around marinas, road ends, hotel frontages in `uDetailTex.r` over beach cells) and
  patrol tyre ruts with analytic normal tilt; sandy-scrub transition at the beach top; linear-filtered zone
  texture for one-tap bilinear canopy / coast / exposure; `vSlope` varying.
- Waterline measured from h = 0.05 (the water plane discards above it), so the film starts at the drawn edge.

Why it reduces the defect: detail now exists at three scales and fades by footprint instead of aliasing; the
moisture bands are measured from the same line and swash width the water uses.

Remains after round 0: the wet/damp bands were **not visible** in captures although the emissive probes showed the
band masks were right (diagnosed round 1: tone curve); the cell mosaic at the waterline remained; perf +39 %
(suburb) / +29 % (beach) — far over budget.

Perf (round 0 build vs base): suburb 1.391, beach 1.285 (ratio of median terrain-pass ms).

## Round 1 — palette for the tone curve, waterline rim, cheaper taps (commit a739d75c)

Visibly wrong:
- Sun-lit ground with albedo above ~0.35 all renders within a few 8-bit levels of white: dry sand 0.72, damp
  0.45 and wet 0.3 were indistinguishable after the ACES-like post curve (calibration ladder `cal_k05..k90`:
  0.45 → 226, 0.65 → 236, 0.90 → 243; the curve's slope lives below 0.35).
- Beach/sandbar cell mosaic along the waterline (baseline defect still present).
- Meso tile (27 m) lattices a lawn at 1500 m (15 px repeat).
- Perf far over budget.

Changed:
- Every ground albedo re-graded to where the curve has slope: dry sand 0.56 (→ ~232), damp 0.24 (~200), wet 0.14
  (~168), film 0.10, lawn 0.06–0.10, dry grass 0.19, soil 0.21, litter 0.03–0.05, pave 0.09–0.13, farmland,
  marsh, rock, road, beyond-map country likewise.
- Sea / sandbar cells above the waterline take the zone of the land 12 m uphill (beach where that is sea too), in
  `TERRAIN_FRAG_MAIN` before the zone branch: the jittered boundary between rim and beach is never seen.
- Damp limit ragged (runnel noise) with tide pools in the low damp sand; meso tile given a second turned tap
  blended by a ~100 m noise.
- Cost: anisotropy 2 (was max 16) on the detail textures; single tap outside the blend zones (weights step over
  0.42–0.58 of the noise so most pixels take one tap); band noises gated by their blend factors.

Remains: bands now visible but too smooth / uniform at 30–150 m; parks and yards nearly all dry grass (olive
mustard); the litter floor a hard dark blotch under sparse trees; footprints only in the damp band; perf not yet
re-measured (the A/B browser launch failed while the machine's Chrome slots were saturated).

## Round 2 — lawn/dry balance, canopy floor, beach mottle (commit d9607f28)

Visibly wrong (round-1 captures): park_150m and suburb_500m a single mustard tone — the dryness ramp was centred
at 0.44 of a noise averaging 0.625 so almost every pixel came out dry; canopy floor applied from a thin cover
onward, so gappy planting sat on scorched-looking dark rings; the damp band a clean contour; dry sand still the
brightest thing in frame at 0.56; footprints confined to the damp band.

Changed:
- `openGround`: dryness ramp centred on the noise mean (lawn and dry come in equal measure at dryness 0.25).
- `canopyFloor` only under closed canopy (cover squared) and the litter a shade lighter and warmer.
- Beach: dry sand 0.47 with darker ripple troughs; damp band mottled — dry islands on the slight rises, damp
  tongues into the dry, 5–15 m across (runnel noise both ways); footprint patches over the walked dry sand within
  ~40 m of the water too.

Remains: to be judged on the round-2 captures (queued behind the Chrome slot gate); perf still to be measured
against the base.

## Round 3 — per-yard bake, cheaper noise, seabed, beach edges (commits 663219e5 … db3a98c5)

Judged on the round-0/1 captures again while the Chrome gate was saturated (rounds 2 and 3 are captured together
on the round-3 build; round 2's captures were dropped from the queue so as not to hold a slot twice):
- suburb_500m / park_150m: one tone across every yard — the baked `det.g` was a hash per street block, so the
  only variation between 150 m and 1.2 km was the 27 m tile's mottle; real sprawl from the air is a patchwork of
  yards on the street grid.
- keys_30m (the ocean-front hotel beach the anchor search found), downtown_30m: a **mosaic of pavement squares in
  the sand** along the back of the beach: the jittered 10 m zone lookup dithers the hotel / downtown ground
  against the beach, and the two differ too much for a dither to pass as a boundary.
- park paths break into dashes and vanish past ~1 m/px (from about 150 m up), so the park reads as flat at 500 m.
- Round-0 perf far over budget; the sea bed under the water plane was shaded with the full noise stack although
  the water is opaque over it (water.ts shades its own bed, alpha 1).
- No driftwood / debris beyond the wrack-line grain; the dry sand had no mid-scale features between the grain
  and the damp mottle.

Changed:
- `bakeDetail`: `det.g` is a per-lot tone (20 m lots in two rows along the block's long side — the lots
  `city.ts` fills — 70 %, the block 30 %), so from 150 m up the suburb is a patchwork of kept / dry / paved yards
  on the street grid; mowing-stripe direction and the dry/green bias follow it per yard.
- Every built zone that meets a beach (mid-rise, downtown, hotel, industrial, golf, lot, construction, stadium,
  marina, road) converges on the beach's sandy scrub through the same `sandy` fringe the parks and yards use, so
  both sides of the jittered boundary carry the same colour.
- Park paths: once thinner than a pixel the line widens to the pixel and pales in proportion, kept to 5 m/px.
- Driftwood every 10–30 m along the older wrack line (bleached grey to dark bark, a shadow side), 1.5–3 m long;
  wind-strung heavy-mineral streaks (4–10 m by 0.5 m, along the prevailing wind) on the dry sand in patches.
- Cost: the sea bed / bars under the water plane return a depth tint with no noise and no taps (never seen);
  the 3 m noise and the 5–11 m fbm octaves are replaced by their means past 2 / 4 m/px (`fbm3Band`); mid-rise
  ground computed once in the 6/8 branch; the unreachable sandbar branch removed.

Remains: captures and perf pending the Chrome gate; no building contact tone (no footprints available to the
terrain); the h = 0.05 waterline is faceted by the bilinear height read (shared with water.ts).

## Round 4 — the pass budget (commits 7c73e6a7, 0b6f7ee3)

Reasoned from the round-0 measurement (+39 % suburb, +29 % beach) and the pixel budget of the suburb perf view
(130 m, pitch −25°: the 3 m tiles are live over the lower 60 % of the frame, the 27 m tile over 86 %; each land
pixel there took 3–5 detail taps over the base's two, and the 2× anisotropy doubled every oblique fetch):
- ground tile without anisotropy (its clumps and grain are noise-like and forgive the streak blur); the sand
  tile keeps 2× for its oriented ripples and prints and is only read on beaches;
- the two-tap anti-tiling seam narrowed from 0.42–0.58 to 0.45–0.55 of the noise (about a fifth of the pixels
  take both taps, a 2–3 m seam between one-tap fields);
- micro tiles (3 m ground, 2.5 m sand) fade out over 0.7–1.2 m/px instead of 0.9–1.6 (under three pixels across
  there);
- wrack lines and the swash-limit streak widened to the pixel and paled in proportion once thinner than one, so
  from 150 m up the beach keeps its thin dark lines (they broke into dashes past ~1 m/px).

Round 3 is served on 4602 and round 4 on 4603 so the A/B attributes the perf work; measured together when the
gate frees a slot.

Measured (the batch ran after the session was cut off): terrain pass B/A, ratio of medians over 6 interleaved
rounds — round 3 suburb 1.346; round 4 suburb 1.291, beach 1.288 (round 0 was 1.391 / 1.285). The tap work of
round 4 bought 5 points; the budget is 1.12, so the pass is still 17 points over. Draw calls identical (61 / 47).

## Round 5 — the lead's half-cell change, the critic's coast and suburb findings (commits 1d096ae1 … 209f63fb)

Merged the lead (fast-forward: the tip of round 4 was already in it). The lead's `MAP_HALF_CELL` puts texel i of
every map texture at x = −HALF + i·CELL (the `heightAt()` convention); the detail bake evaluated its texels at
(i + 0.5)·CELL, so streets, yard tones and trample were read 4.9 m off the road meshes — the bake now evaluates
at i·CELL. Shore and dune work re-read against the shifted height: the beach profile is measured from the drawn
waterline (h − 0.05 along the slope), which moved with the mesh, so nothing else needed to change.

Critic (h03 visual-2 §11, h04 progress views), what is mine and what was done:
- **Brown mud under the wooded keys (highway_200m, 120 m)** — mine: the canopy floor was the litter colour
  (0.062, 0.045, 0.022, an orange-brown) over most of the closed hammock, and between the crowns it read as mud.
  Now mostly shrub and fern understory (dark greens) with grey-brown litter in patches.
- **Hard sand-to-canopy lines (shore_beach F2-H3, island_pass B3)** — shared: the trees have no trunks or
  understory at the edge (Vegetation), and the ground under the edge trees was pale sand. The sandy fringe now
  wanders ±0.4 m in height on the 20–125 m noises, ramps over 1.8 m of height instead of 1.1, and is covered
  55 % by the litter under the canopy; on the beach zone itself the litter floor comes in under the canopy above
  h 0.5–1.3. The trunks and the scrub band are requested from Vegetation (see REPORT).
- **Identical islet rims (highway_aerial A3-H4)** — the rim *width* is the map's beach zone (map.ts, not mine);
  the *look* was mine: one dry-sand albedo and one scrub line (8–25 m up, h 1–2) on every islet. A 300 m noise
  now sets, per shore, how far the scrub and the dune grass come down (to 3–9 m and h 0.5–1.1 on the vegetated
  shores) and the sand's tone (0.47 → 0.39 albedo on the grey shores). The constant-width bright *foam* band is
  the water's (requested).
- **Perfectly elliptical lagoon (cloudy C4-D4, highway_aerial D4-D5)** — not mine: the waterline is the height
  field (map.ts); reported to the lead.
- **Quay without fenders / bollards / tide stain (harbor A6-D8)** — not mine (quay geometry: city / props);
  reported.
- **Flat white port apron (harbor A5-D8)** — mine. The round-1 regrade had already taken the pavement to
  0.135–0.093; now 6 m panel joints (pixel-widened, gone past 1.5 m/px), tyre-blackened lanes along the yard,
  oil drips close up.
- **Suburb lots flat lawns with boxes on them (foliage_suburb, highway_along)** — mine, and the biggest
  change of the round: the terrain now knows the houses. `city.ts` collects every footprint it places
  (`CityBuild.footprints`, one line in `place()`), `game.ts` hands them to `terrain.stampLots()` (one line), and
  the terrain bakes a **lot map**: 2048² RGBA8 (9.8 m texels), each texel the house nearest to it within 21 m —
  the offset to its centre (quantised on a grid shared by all texels, so every texel of a house decodes the same
  centre and a hash of it picks the drive's side), its yaw over 2π, its half sizes (4 bits each). The suburb
  ground reads it with one unfiltered fetch (foot < 2.5 m/px only) and lays, in the house's own frame: the drive
  (2.8 m, concrete or asphalt by the hash) from the garage end of the front to the kerb, the front path (1 m),
  a patio behind the back door, mulched beds with shrubs 0.25–1.7 m from the walls and the shade under the
  eaves, and the lawn worn to soil along the drive. The houses' own placement RNG cannot be replayed on the
  terrain, so this is the only route to features that line up with the instanced houses. Two one-line hooks
  in shared files (city.ts, game.ts) — listed for the lead in the REPORT.
- **Bare sand blotches on the island (cloudy A5-A6)** — mine: the sandy shore fringe was a height band
  (h < 2.3) and on the low islands (1.5–2.5 m all over) it spread inland as pale blotches; it now also ends
  30–70 m from the coast. The 125 m bare patches of the open ground belong to the dry ground only now, and the
  suburb's sandy lots come from the baked per-yard tone (whole yards, on the grid) instead of noise blobs.

A real compile check was added to the loop: the assembled terrain shaders go through glslang (WASM, Vulkan
GLSL rules; uniforms blocked and bound by a wrapper) after the parser check — it caught a `vec2.z` swizzle in
the yard code that the parser passed and that would have blanked the terrain in the integration build.

## Round 6 — the pass budget, second pass (commits beeffc51, 2f9e9b4a)

Cost structure first (a variant probe recompiles the shader with one feature stubbed out at a time and measures
the pass interleaved with the unmodified one; see the measurement below when the gate gives a slot). Two changes
that are wins whatever the breakdown says:
- the zone id has its own R8 texture, fetched by texel (`texelFetch`): the id was read through a bilinear tap
  at a texel centre (4 fetches and the lerps for a value that is one texel), twice near the water;
- the 300 m patch noise (`fbm3`, three octaves of value noise per pixel for every land pixel) is baked into the
  channel the id freed in the smooth-field texture and comes with the canopy tap; a 300 m field at 9.8 m
  texels loses nothing.
And the suburb's sandy-lot noise (`fbm3Band`, up to three octaves) is gone with the per-yard tone change of
round 5.

The round-5 breakdown run was lost: the slot holder closed the browser under it. Its idle test read the clients'
keepalive file, a client's truncate-then-write left the file empty for an instant, `Number('') = 0` read as idle
since 1970. The keepalive is now written to a temp file and renamed, the holder ignores unparseable values and
counts a client's open page as activity (capped at 45 min per page so a killed client cannot pin the slot).

## Round 7 — lot lines, yard striping, four noises fewer (commit 8a7650d7)

Merged the lead again (street and waterphys merges; `game.ts` touched on both sides, no conflict; tsc clean).

Visibly wrong / asked for (h03/h04, still open after round 5):
- **Hedges / fences at the lot lines** (the critic's list for the suburbs): the lots had paving, beds and wear
  but nothing divided one from the next, so a block still read as one lawn with houses on it from 150 m.
- **Yard striping on the port apron** (asked with the joints and tyre marks): the apron had joints, lanes and
  drips but no paint.
- Cost: `midriseGround` ran a three-octave fbm of its own per pixel over the whole urban ring and the suburb's
  urban edge; the beach ran a three-octave fbm for the bands' along-shore meander and a 285 m noise for the
  islet field, per beach pixel, when the 125 m, 22 m and baked 300 m noises were already in hand; the runnel
  fbm kept its 7 and 3.5 m octaves at any distance; the carriageway tint hashed every land pixel.

Changed:
- **Lot lines from the lot map.** The lot map gives every point its nearest house; the boundary between two
  houses' regions is the perpendicular bisector of their centres — the lot line. A yard pixel reads the texel
  18 m along the front (neighbours stand 14-30 m apart, so it is the neighbour's), decodes that house, and if it
  is a real neighbour along the street (8-40 m, not the house behind) draws the bisector from 3 m in front of the
  wall line to 7-10 m behind the houses as a hedge (1.1 m, dark green) on 42 % of the lines, a fence (0.4 m, the
  weathered boards and their shadow one dark line from the air) on 32 %, nothing on the rest. The two sides of a
  line are drawn by two different houses' pixels, so everything about it — position, extent, style — is computed
  from the pair (the midpoint, the mean half depth from both texels, a hash of the midpoint), never from one
  house. Widened to the pixel and paled once thinner, gone with the yard at 2.5 m/px.
- **Painted striping** on the industrial aprons: container-bay lines every 2.6 m across the lanes in 45 m bands
  with gaps, a lane line every 13 m along, 0.12 m of yellow paint worn away where the tyre lanes run;
  pixel-widened, gone past 0.8 m/px.
- Cost: `midriseGround`'s lawns from `0.55 n3 + 0.45 n2`; the beach's `wander` from `n3` and `n2`, `isle` from
  the baked 300 m field; `runnel` through `fbm3Band` (its fine octaves stop at 2 m/px); the carriageway hash
  under `if (carriage > 0.0)`. Four to seven value-noise octaves fewer per urban-ring / beach pixel.

Measured on the round-8 chain (captures, A/B and the CPU-tick variant breakdown all on this build, 4607).

## Round 8 — parks from 500 m, downtown paving, band limits (commit 30a8b4a5)

Reasoned without new captures (the slot queue: eight builders' waiters ahead of two slots), on what the round-4
captures and the rubric still say about the parks and the downtown ground:
- park_500m / park_1500m: a park is a green with paths that have gone subpixel — nothing that says 'park' rather
  than 'lawn' from 500 m. From the air a park is its sports fields: the flattest, most even green in it, with a
  white outline.
- downtown_5m / downtown_30m: the ground between the street meshes is one grey with the 22 m noise on it — a plane
  at 5 m where every real downtown ground is paving with joints.
- Cost: the 3 m noise (n1) ran to 2 m/px, the 22 m noise's 5-11 m octaves to 4 m/px, the 3 m tile to 1.2 m/px,
  where they were already 2-5 px across and averaging out.

Changed:
- Sports pitches in the parks: in about half of the 200 m park cells, where the trees leave room (canopy < 0.4),
  a mown rectangle (104 × 68 or 72 × 48 m, any orientation) a shade lighter and yellower than the park's turf,
  with its perimeter, halfway line and centre circle in 0.12 m white close up (pixel-widened, gone past 1 m/px).
  Placed by a hash per cell, so one may be cut by a park edge or a pond — accepted for now (a bake could check).
- Downtown paving: 3 m slab joints close up (pixel-widened, gone past 1.2 m/px).
- Band limits: n1 fades 0.6-1.2 m/px (was 1-2), n2's fine octaves 1.2-2.5 (was 2-4), the micro tile 0.5-0.9
  (was 0.7-1.2). One to four value-noise octaves and up to two tile taps fewer over the middle of every aerial
  frame; nothing that was resolvable is lost.

Built as r9 (4608); its captures and A/B are chained after the r8 chain on the same held browser.
