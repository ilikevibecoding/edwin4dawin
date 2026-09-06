# terrain5 — shoreline + ground textures (rubric 27; ground half of 28; supports 21/23/29)

Branch `cursor/terrain5-loop-8213`. Owned files: `src/world/terrain.ts` (whole terrain shader), new `src/world/groundDetail.ts`.
No other builder's file was touched. Defect log with per-round detail: `DEFECTS.md` beside this report.

_Status: in progress — rounds 0–3 implemented; captures of round 3 and the perf A/B are queued behind the machine's
Chrome slot gate (two slots, held for 1–2 h at a time by other builders' sessions). This file is updated per round._

## What was visibly wrong (baseline, seed 20260904)

- From the air the ground was a set of flat tints with one soft 20 m noise: lawn olive, dry-grass yellow, a beige
  sand fringe, a beige beach. Nothing under 3 m, nothing between 3 and 20 m, nothing per lot or per block.
- The beach was near-white (albedo 0.72 under the post's tone curve), with no wet or damp band, no footprints, and
  its seaward edge was a **10 m cell mosaic** of beach and sandbar cells (the jittered zone lookup) along every shore.
- Under trees the ground was only tinted by the canopy density; no litter floor, no paths in parks, no verge wear.

## What changed (concrete)

1. `groundDetail.ts` (new): two 1024² RGBA8 tileable textures built at start-up from canvas stamps and periodic
   noise (no assets). *ground*: grass clumps, bare-patch mask, soil grain/pebbles, footprints. *sand*: grain +
   shell + mineral specks, wind-ripple height, ripple normal. Means exported for the far field; mipmapped, 2× aniso.
2. Multi-scale detail in the terrain shader: micro tile (3 m) and meso tile (27 m) sampled through `textureGrad`
   with explicit gradients (the taps sit in zone branches, where implicit derivatives are undefined), anti-tiled by a
   second turned/rescaled tap under a slow noise weight (single tap where the weight is 0 or 1), fading to the
   channel means at 1.6 and 14 m/px; the 3 m and 5–11 m procedural octaves replaced by their means where subpixel.
   Macro variation stays procedural (125 m and 312 m noises), meso from the tile and the per-yard bake, micro from
   the tile.
3. Shoreline: the beach is shaded by metres from the *visible* waterline (h = 0.05, where the water plane
   discards) — height/slope near the line, the map's coast distance farther out — with film / wet / damp / dry
   bands sharing the water shader's swash width `4 + 12·exposure`. Ragged damp limit with dry rises and damp
   tongues 5–15 m across, tide pools in the low damp sand, roughness 0.16 (film) → 0.42 (wet) → 0.72 (damp) →
   0.95 (dry). Sea/sandbar cells above the waterline take the zone of the land behind them, which removed the mosaic.
4. Sand: grain, shell hash and heavy-mineral specks; wind ripples aligned to the prevailing wind (atmosphere
   `windDir`) with their normal folded into the shading normal; darker ripple troughs; wind-strung magnetite
   streaks on the dry sand; footprints (heel-and-toe tile, with normal tilt) where the beach is trodden — baked
   density around marinas, road ends and hotel frontages — and in patches over the walked sand near the water;
   patrol tyre ruts with analytic normal tilt; swash-limit mineral streak; two wrack lines with debris grain;
   driftwood every 10–30 m along the old line.
5. Grounding: leaf-litter floor under closed canopy (cover squared, so gappy planting keeps the open ground),
   dirt paths in parks (kept as pixel-wide fading lines out to 5 m/px), worn dusty verges beside the baked
   streets, gravel margins and packed dirt at industrial lots (soil tile at a 12 m repeat as crushed stone).
6. Per-yard tone: the baked block tone is now per 20 m lot in two rows along the block's long side (the same
   lots `city.ts` fills), so from 150 m up the suburb is a patchwork of kept, dry and paved yards on the street
   grid rather than one olive field.
7. Palette: every ground albedo re-graded to where the post's tone curve still has slope (sun-lit albedo above
   ~0.35 rendered within a few levels of white): dry sand 0.47, damp 0.24, wet 0.14, film 0.10, lawn 0.06–0.10,
   dry grass 0.19, soil 0.21, litter 0.03–0.06.
8. Cost: the sea bed under the opaque water plane is a plain depth tint (no noise, no taps — it is never seen);
   anisotropy 2; band noises gated by their blend factors; mid-rise ground computed once.

## Why it improves realism

Real ground from 5 m to 1.5 km is texture at every scale — blades, clumps and bare spots; worn areas, paths and
yards; blocks and land use — and the eye reads the scale of a scene from which of those it can resolve. A
single tint with one noise gives no scale at all, which is why the baseline read as a model. The beach in
particular is a moisture gradient measured from the waterline (the swash sets it), with the wet sand dark and
glossy and the dry sand pale and matte; drawing it as bands of distance from the drawn waterline, sharing the
water shader's swash width, makes the two shaders describe one beach.

## What remains weak (self-criticism)

- No building contact tone: the terrain has no building footprints (they are placed in `city.ts` from its own
  RNG); the far-field roof mottle stands in beyond 1.2 km only.
- The waterline itself is polygonal at 5–30 m: both the water's discard and the terrain mesh read the 10 m
  height texture bilinearly, so the h = 0.05 contour has 10 m facets. Needs a shared bicubic height read.
- Wind ripples are only resolvable within ~15 m (9.6 cm wavelength; the normal averages out in the mips), so at
  5–30 m the dry sand reads from its footprints, streaks and grain rather than from ripples.
- Grass has no normal map; the turf's relief is albedo only.
- Perf: see below — the budget is +12 % and the first rounds were far over it.

## Performance (interleaved A/B, terrain pass only, ratio of medians over 6 rounds; SwiftShader)

| build | suburb view | beach view |
|---|---|---|
| round 0 | 1.391 | 1.285 |
| round 3 | _pending_ | _pending_ |

Draw calls unchanged (61 / 47 in the reduced perf scene, identical A and B). Textures added: 2 × 1024² RGBA8.

## Rubric self-scores

_pending round-3 captures._

## Highest-value next attack

_pending._

## Failed / reverted candidates

- Film colour matched to the water shader's zero-depth bed (0.34): invisible after the tone curve; replaced by the
  re-graded 0.10 film with a request to the Water agent to darken their zero-depth bed instead.
- Canopy floor from thin cover onward: scorched-looking rings under gappy planting; now the square of the cover.
- Dryness ramp centred at 0.44 of a noise averaging 0.625: nearly every yard and park came out dry; recentred.

## Requests to other builders

- **Water (water.ts)**: (1) darken the bed at zero depth — `bed *= mix(0.72, 1.0, smoothstep(0.0, 0.45, depth))`
  reaches the terrain's film-saturated sand (albedo ≈ 0.10) at the line only if the factor at depth 0 is ≈ 0.27,
  not 0.72; today the water's edge is brighter than the wet sand beside it. (2) The h = 0.05 discard contour is
  faceted by the bilinear height read; a bicubic `terrainHeightW` (4-tap trick) would smooth it — I will match it
  in the terrain vertex shader if you take it.
- **Vegetation (vegetation.ts)**: dune grass tussocks on the upper beach are drawn by the terrain as khaki
  patches from h ≈ 1.0 to the scrub line; instanced tussocks there (density from the same `vnoise(wp*0.05+4)`
  patches, or simply on beach cells with h > 1.0) would give the strip its height. Please keep the beach below
  h ≈ 0.9 clear of planting.
- **Street detail (roads.ts/props.ts)**: driveways/pads on the lots would let the terrain's per-yard tone be
  read as yards; nothing needed from you for the verge — the worn verge is baked from the same street lattice.
- **Lead / city.ts**: a building-footprint stamp into a shared texture channel would allow a contact tone under
  houses and blocks (I can expose `MapTextures.stampFootprints(rects)` if wanted).

## Shared-file hunks

None. Only `src/world/terrain.ts` and the new `src/world/groundDetail.ts` are changed (plus this report).
