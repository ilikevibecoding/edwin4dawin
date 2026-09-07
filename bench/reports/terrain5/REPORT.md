# terrain5 — shoreline + ground textures (rubric 27; ground half of 28; supports 21/23/29)

Branch `cursor/terrain5-loop-8213`. Owned files: `src/world/terrain.ts` (whole terrain shader and the map / lot bakes),
new `src/world/groundDetail.ts`. Two one-line hooks in shared files (`city.ts`, `game.ts`, listed at the end).
Defect log with per-round detail: `DEFECTS.md` beside this report.

## Round table

| round | what | measured |
|---|---|---|
| 0 | detail tiles (`groundDetail.ts`), multi-scale taps, beach bands from the waterline, ripples, footprints, ruts | suburb 1.391 / beach 1.285 (pass B/A) — far over |
| 1 | palette re-graded for the tone curve (nothing above albedo 0.35 survived it), waterline rim takes the land's zone (the cell mosaic), anisotropy 2, single tap outside the seams | bands visible; rim mosaic gone |
| 2 | dryness ramp recentred (everything had come out dry), canopy floor only under closed canopy, beach mottle | judged on round-3 captures |
| 3 | per-yard baked tone, every built zone converges on the beach's scrub (pavement squares in the sand), pixel-wide paths, driftwood, mineral streaks, sea bed under the water plane costs nothing | suburb 1.346 |
| 4 | the pass budget: no anisotropy on the ground tile, narrower two-tap seam, micro fade at 0.7–1.2 m/px, pixel-widened wrack lines | suburb 1.291 / beach 1.288 |
| 5 | the lead's half-cell change (bake convention), the critic's findings: understory floor (brown mud), wandering sandy fringe under the litter (hard sand-to-canopy lines), per-shore rim width and tone (identical islets), the **lot map** — drives, paths, patios, beds, wear from the houses' footprints (flat lawns with boxes), port apron joints / tyre lanes / drips (white plane), the fringe ends 30–70 m from the coast (blotches) | glslang compile check added (caught a `vec2.z`) |
| 6 | zone id in its own R8 texture fetched by texel; the 300 m patch fbm baked into the freed channel; dry / bare ground in yard-shaped pieces | breakdown run lost to the holder race (fixed) |
| 7 | **lot lines** (hedge / fence on the bisector between neighbours, from the lot map), yard striping on the apron, four to seven noise octaves fewer per urban / beach pixel | r8 chain: _pending_ |
| 8 | park sports pitches, downtown slab joints, tighter band limits (n1 0.6–1.2, n2 fine 1.2–2.5, micro 0.5–0.9 m/px) | _pending_ |

## What was visibly wrong (baseline, seed 20260904)

- From the air the ground was a set of flat tints with one soft 20 m noise: lawn olive, dry-grass yellow, a beige
  sand fringe, a beige beach. Nothing under 3 m, nothing between 3 and 20 m, nothing per lot or per block.
- The beach was near-white (albedo 0.72 under the post's tone curve), with no wet or damp band, no footprints, and
  its seaward edge was a **10 m cell mosaic** of beach and sandbar cells (the jittered zone lookup) along every shore.
- Under trees the ground was only tinted by the canopy density; no litter floor, no paths in parks, no verge wear.
- (h03/h04) the wooded keys stood on brown mud from 120 m; the suburbs were flat lawns with boxes on them; the
  port apron a white plane; the islets each had the same bright rim; the sand met the canopy along a hard line.

## What changed (concrete)

1. `groundDetail.ts` (new): two 1024² RGBA8 tileable textures built at start-up from canvas stamps and periodic
   noise (no assets). *ground*: grass clumps, bare-patch mask, soil grain/pebbles, footprints. *sand*: grain +
   shell + mineral specks, wind-ripple height, ripple normal. Means exported for the far field; mipmapped; the sand
   tile 2× anisotropic for its oriented ripples, the ground tile isotropic (noise-like content, half the fetch cost).
2. Multi-scale detail in the terrain shader: micro tile (3 m) and meso tile (27 m) sampled through `textureGrad`
   with explicit gradients (the taps sit in zone branches, where implicit derivatives are undefined), anti-tiled by a
   second turned/rescaled tap under a slow noise weight (single tap where the weight is 0 or 1, a 2–3 m seam
   between), fading to the channel means at 0.9 and 14 m/px; the 3 m and 5–11 m procedural octaves replaced by
   their means where subpixel. Macro variation from the baked 300 m fbm and the 125 m noise, meso from the tile and
   the per-yard bake, micro from the tile.
3. Shoreline: the beach is shaded by metres from the *visible* waterline (h = 0.05, where the water plane
   discards) — height/slope near the line, the map's coast distance farther out — with film / wet / damp / dry
   bands sharing the water shader's swash width `4 + 12·exposure`. Ragged damp limit with dry rises and damp
   tongues 5–15 m across, tide pools in the low damp sand, roughness 0.16 (film) → 0.42 (wet) → 0.72 (damp) →
   0.95 (dry). Sea/sandbar cells above the waterline take the zone of the land behind them (the mosaic is gone).
   The sandy fringe where land meets beach wanders ±0.4 m in height, ramps over 1.8 m, ends 30–70 m from the
   coast and is covered by the litter under the trees; a 300 m field sets each shore's scrub reach and sand tone.
4. Sand: grain, shell hash and heavy-mineral specks; wind ripples aligned to the prevailing wind (atmosphere
   `windDir`) with their normal folded into the shading normal; darker ripple troughs; wind-strung magnetite
   streaks on the dry sand; footprints (heel-and-toe tile, with normal tilt) where the beach is trodden — baked
   density around marinas, road ends and hotel frontages — and in patches over the walked sand near the water;
   patrol tyre ruts with analytic normal tilt; swash-limit mineral streak; two wrack lines with debris grain;
   driftwood every 10–30 m along the old line; sea oats in patches on the upper beach.
5. Grounding: shrub-and-fern understory with litter patches under closed canopy (cover squared, so gappy planting
   keeps the open ground), dirt paths in parks (kept as pixel-wide fading lines out to 5 m/px), sports pitches,
   worn dusty verges beside the baked streets, gravel margins and packed dirt at industrial lots, and — from the
   **lot map** — each house's drive, front path, patio, mulched beds against the walls, the eaves' shade, the lawn
   worn along the drive and the **lot lines** (hedges / fences on the bisector between neighbours).
6. Per-yard tone: the baked block tone is per 20 m lot in two rows along the block's long side (the same lots
   `city.ts` fills); the dry, sandy and watered yards come in whole lots on the street grid.
7. Palette: every ground albedo re-graded to where the post's tone curve still has slope (sun-lit albedo above
   ~0.35 rendered within a few levels of white): dry sand 0.47 / 0.39, damp 0.24, wet 0.14, film 0.10, lawn
   0.06–0.10, dry grass 0.19, soil 0.21, litter 0.03–0.06, apron 0.09–0.135 with joints, lanes, drips and paint.
8. Cost: the sea bed under the opaque water plane is a plain depth tint (no noise, no taps); the zone id fetched
   by texel; the 300 m fbm baked; the urban ring's lawns, the beach's meander and the islet field from noises
   already in hand; every noise and tile band-limited by the pixel footprint.

## Why it improves realism

Real ground from 5 m to 1.5 km is texture at every scale — blades, clumps and bare spots; worn areas, paths and
yards; blocks and land use — and the eye reads the scale of a scene from which of those it can resolve. A
single tint with one noise gives no scale at all, which is why the baseline read as a model. The beach in
particular is a moisture gradient measured from the waterline (the swash sets it), with the wet sand dark and
glossy and the dry sand pale and matte; drawing it as bands of distance from the drawn waterline, sharing the
water shader's swash width, makes the two shaders describe one beach. And a suburb from the air is lots: drives,
paths, fences and hedges on a grid, each yard its owner's — which the terrain can only draw once it knows where
the houses are (the lot map).

## What remains weak (self-criticism)

- The waterline itself is polygonal at 5–30 m: both the water's discard and the terrain mesh read the 10 m
  height texture bilinearly, so the h = 0.05 contour has 10 m facets. Needs a shared bicubic height read (Water).
- Wind ripples are only resolvable within ~15 m (9.6 cm wavelength; the normal averages out in the mips), so at
  5–30 m the dry sand reads from its footprints, streaks and grain rather than from ripples.
- Grass has no normal map; the turf's relief is albedo only.
- No contact tone under the mid-rise / downtown blocks (only houses are in the lot map; the paved ground there
  would not show one anyway) and none per tree (the vegetation's instance positions are not available).
- The sports pitches are placed by a hash per 200 m cell, so one can be cut by a park edge or a pond.
- Perf: the pass budget (see below).

## Performance (interleaved A/B, terrain pass only, ratio of medians; SwiftShader)

Rounds 0–4 wall-clock (6 rounds); from round 8 the CPU ticks of the browser's process tree per frame (the machine
runs at load 8–9, where wall time swings 2× with scheduling and CPU time does not).

| build | suburb view | beach view |
|---|---|---|
| round 0 | 1.391 | 1.285 |
| round 3 | 1.346 | — |
| round 4 | 1.291 | 1.288 |
| round 7 (r8 chain) | _pending_ | _pending_ |

Draw calls unchanged (61 / 47 in the reduced perf scene, identical A and B). Textures added: 2 × 1024² RGBA8
(detail tiles) + the lot map (2048² RGBA8) + the zone id (2048² R8; the zone texture's own footprint unchanged).

Where the pass goes (variant breakdown, r8 build): _pending_.

## Rubric self-scores

_to be judged on the r8 captures._

## Highest-value next attack

The pass budget if the r8 numbers are still over it: the detail taps are the remaining cost above the base
(the base ran 11–14 noise octaves per suburb pixel against this build's 5), so the next cut is structural —
a bilinear-nearest-mip filter on the ground tile (half the fetch work per tap) or the meso tile's second tap.

## Failed / reverted candidates

- Film colour matched to the water shader's zero-depth bed (0.34): invisible after the tone curve; replaced by the
  re-graded 0.10 film with a request to the Water agent to darken their zero-depth bed instead.
- Canopy floor from thin cover onward: scorched-looking rings under gappy planting; now the square of the cover.
- Dryness ramp centred at 0.44 of a noise averaging 0.625: nearly every yard and park came out dry; recentred.
- Sandy fringe as a height band alone: spread over the low islands as pale blotches; now also ends 30–70 m from
  the coast.
- Litter floor as the whole canopy floor: read as brown mud from 120 m; now understory greens with litter patches.
- Wall-clock perf probes: a 2× spread at load 8–9; replaced by CPU-tick accounting of the browser's process tree.

## Requests to other builders

- **Water (water.ts)**: (1) darken the bed at zero depth — `bed *= mix(0.72, 1.0, smoothstep(0.0, 0.45, depth))`
  reaches the terrain's film-saturated sand (albedo ≈ 0.10) at the line only if the factor at depth 0 is ≈ 0.27,
  not 0.72; today the water's edge is brighter than the wet sand beside it. (2) The h = 0.05 discard contour is
  faceted by the bilinear height read; a bicubic `terrainHeightW` (4-tap trick) would smooth it — I will match it
  in the terrain vertex shader if you take it. (3) The critic's constant-width bright foam band on every islet and
  the faint foam edge (h03 aerial-a) are the water's: the terrain's per-shore rim width and tone now vary, the
  foam should follow the exposure the same way.
- **Vegetation (vegetation.ts)**: trunks and a scrub band at the hammock's edge where it meets the sand (the hard
  canopy-to-sand line is half a terrain problem, now softened, and half the trees' having no understory at the
  edge); dune grass tussocks on the upper beach (the terrain draws khaki patches from h ≈ 1.0 to the scrub line;
  instanced tussocks there would give the strip its height). Please keep the beach below h ≈ 0.9 clear.
- **Lead / map.ts**: the perfectly elliptical lagoon (cloudy C4-D4, highway_aerial D4-D5) is the height field's
  outline; the terrain follows it.
- **City / props**: the quay without fenders, bollards or a tide stain (harbor A6-D8) is quay geometry.
- **Street detail (roads.ts/props.ts)**: nothing needed; the drives now come from the lot map.

## Shared-file hunks

- `src/world/city.ts`: `CityBuild.footprints` (every ground-standing body `place()` puts down: centre, size,
  height, yaw, kind, style) — one field, one push in `place()`.
- `src/game.ts`: `this.terrain.stampLots(this.city.footprints)` after `buildCity`.
Both are additive; nothing else in either file is changed.
