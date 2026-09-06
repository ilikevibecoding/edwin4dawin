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
