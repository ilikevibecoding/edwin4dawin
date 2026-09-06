# Vegetation loop 5/6 — defect log (`src/world/vegetation.ts` only)

Branch `cursor/veg5-loop-8213`, work preview :4591 (`/tmp/veg5-dist`), baseline preview :4590 (lead branch at
6130eae7). Stills: `bench/scripts/shot.mjs` at 1920×1080, `quality=high`, `freeze=1`, `seed=20260904`, `time=15`.
Poses: **A** `?bench=dev&cam=-6000,130,-2300&hdg=0&pch=-25` (RES_LOW west of downtown), **C** `cam=-4950,130,2000`
(dense park clump, the triangle stress pose), **aerial-a** (bench view), **prq** = `plane-rear-quarter`,
**island** = `island-pass`. Canopy measurements: box (700,560)–(1300,800) of the aerial-a still, green-dominant
mask (`g > r`, `g > 1.12 b`), mean sRGB, luminance p10/p50/p90 (`/tmp/veg5/canopy.py`, copied below as
`canopy.py`). Reference (`bench/reference/reference_a.png`, same box and mask): mean [86, 93, 76], p10 55, p50
85, p90 133; lit band (top 20 %) [134, 141, 113] hue 76° sat 0.20; shade band (bottom 20 %) [49, 56, 46].

Baseline (lead 6130eae7): A 179 calls / 0.89 M tris, C 237 / 1.53 M, prq 229 / 1.01 M, island 255 / 0.55 M.

## Rounds 1–5 — re-implementation of the lost loop 5 (commit 708908bf)

The previous vegetation agent's loop-5 commits were lost with the VM; rounds 1–5 rebuilt them from its report.

### R1 — crown light model, occlusion, palette
- **Wrong**: every side of a 3D crown lit alike (wrap 0.5 / floor 0.14 + the env-map diffuse three adds in
  `RE_IndirectSpecular`): the canopy at pose A read as a flat green mass; no crown in a dense stand went dark.
- **Changed**: `foliageLighting()` parameterised per family (`FoliageLight`): crowns wrap 0.22 / floor 0.05 /
  translucent rim 0.8, palms 0.6 / 0.28 / 0.7, cards 0.5 / 0.14 / 0.5. Sky light weighted by a crown-space
  hemisphere (`vegUp`, cap → underside) and by a neighbour-density occlusion (`vegOcc`; `occludePlants()`
  spatial hash over all plants, packed into the fraction of `aVar.x` under the layout variant), applied in
  `RE_IndirectDiffuse` **and** `RE_IndirectSpecular`. Sunlit albedo warmed, shade cooled. Normal lean 0.3 → 0.15.
- **Why**: a crown is a scattering volume: the lit cap and the buried lower crown differ by more than a Lambert
  term; the occlusion carries the darks of a dense stand that a per-plant shadow probe cannot.
- **Measured**: aerial-a mean [89.5, 103.8, 85.0] (too light, too blue: hue 112°, p10 80 — no darks).

### R2 — gain / desaturation retune, occlusion in the direct term
- **Wrong**: R1's canopy mean 10 % above the reference and blue-shifted; the mask picked up cyan water (fixed the
  measurement: `g > 1.12 b`).
- **Changed**: `CANOPY_GAIN` (0.92, 0.72, 0.72), `CANOPY_DESAT` 0.48; ambient tint (1, 0.98, 0.82); the direct
  term darkened by the occlusion too (`1 - 0.3 vOcc`); `vegUp` 0.35–1.0.
- **Measured**: mean [81.7, 92.7, 74.3], hue 104°, p10 71 / p90 112 — mean on the reference, contrast still low.

### R3 — mid-distance cards (the aerial view is cards)
- **Wrong**: at aerial-a the island is drawn as cards, so the crown shader's split did not reach the frame; the
  cards had one flat level per plant.
- **Changed**: per-card sun side (`vDisc`: screen-plane offset from the crown centre in crown radii): the crown
  as a rough ball against the view-space sun; lit ×[1.38, 1.28, 1.02], shade ×[0.42, 0.48, 0.54]; whole-card
  occlusion darkening (`1 - 0.5 vCardOcc`) with the base darkened further; far canopy (> 800 m) converges on
  `uCanopyMean` but keeps a 0.6–1.25 lit/shade modulation. Loop 5's terminator rule (screen-projected sun,
  +0.25 R) was **not** reproduced here — see R7.
- **Measured**: mean [84.3, 93.5, 72.5] (ref [86, 93, 76]), hue 93°, p10 69 / p90 116 (ref 55 / 133). A 185 /
  0.86 M, C 241 / 1.51 M (base 1.53 M), prq 231 / 1.01 M, island 255 / 0.55 M.

### R4 — silhouettes, understory, palms, city scale
- **Wrong**: crowns too spherical (lobes tight against the main puff); bare lawn under every suburb crown; the
  palm frond a solid strip; 13 m palms and hardwoods between the downtown towers.
- **Changed**: lobe radius 0.7–1.15 and size 0.5–0.85, lump 0.42, `ROUND_MAIN` 0.88, broadleaf squash 0.58–1.05;
  a cards-only understory family (shrub / tussock, 45 % density-gated under PARK / RES_LOW, 30 % in the
  hammock) drawn to 2.5 km, thinned at 600 / 1200 m, shadows inside 350 m; RES_LOW candidates 3 → 2. Palm
  frond texture as a 40-leaflet comb with the alpha threshold following the sampled mip (`fwidth(vMapUv)`),
  brighter palm palette. Street trees clamped (palms 6–10 m, sea grape 3–6, broadleaf 6–10). `HEIGHTS[0]` min 6.
- **Failed candidates kept out** (from the loop-5 report): sphere-normal card shading judged "invisible from
  the air" there (kept in R3 with a steeper ramp — measured, not assumed, in R7); crown wrap/floor on palms;
  fixed alpha threshold on the comb; understory at 0.55 with 3 RES_LOW candidates (1.8 M tris at pose C).

### R5 — budget
- **Changed**: `ULTRA_DISTANCE` 220 → 170 m, `ULTRA_BUDGET` 420 level-2 crowns a frame (cells nearest first,
  fallback level 1); `GROW_SIDE` 3.3 (the wider lobes reach further).
- **Measured**: C 1.51 M (base 1.53 M) with the understory added; every measured view ≤ 255 calls.

## Round 6 — branch hierarchy, bark, grounding, wind hierarchy (commit 366fd5fb + this round)
- **Wrong** (pose A low pass, 45 m): a near crown is puffs on a stick — no limbs, the trunk a flat grey-brown
  tube, the tree standing on untouched lawn with no contact darkening; the whole crown swayed as one body,
  fronds rigid on a swaying trunk.
- **Changed**: level 1–2 crown geometry gains three limb prisms (`branchPrisms`, `BRANCH_PART` 22–24) the vertex
  stage runs from the fork to each lobe's centre (`lobeCentre` / `branchEnds`, shared with the puffs): a round
  crown forks just under its main puff (−0.95 squash) so the limbs show against the sky before they enter the
  lobes from below, a spreading crown at its short trunk's top, a pine at the tier's height; a mangrove's limbs
  are prop roots arching from low on the trunk to the ground. A root-zone mound (`rootDisc`, `DISC_PART`) at
  the trunk base — leaf litter / earth with a noise-ragged rim faded by alpha-to-coverage, none under
  mangroves or tussocks. Bark on trunk and limbs furrowed along the grain and darkened toward the ground
  (`vRel.y` carries the height). Foliage light model gated to the leaf parts only. Wind: lobes rock on their
  limbs (own phase, 2.1 / 3.4 rad/s, 1.2 % of the lobe size), fringe leaf clusters flutter (4–6 rad/s, own
  phase), palm fronds bob on their petioles with the tip lagging the base (dead fronds still); the trunk sway
  is unchanged (the motion character the user set).
- **Why**: limbs and a grounded base are what tells a tree from a lollipop at 30–150 m; layered motion at
  three scales reads as wind through a canopy instead of a synchronised wave.
- **Cost**: +26 triangles per level 1–2 crown (≤ 420 level-2 + the level-1 cells inside 420 m).
- **Remains**: limbs are buried where the lobes overlap the main puff (only the fork shows); the disc is a
  uniform ellipse from the air (R6b: smaller, lighter). Motion to be verified in the island-pass / prq clips.
