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
- **Measured** (R6b, `366fd5fb` + fork/disc retune): A 187 / 0.89 M (R3 0.86 M: the limbs and discs of the
  level 1-2 crowns), low pass 186 / 0.90 M; discs and trunks read at 100-150 m (`r4-low`), console clean.

## Round 7 — the aerial canopy: card sun side and contrast
- **Wrong** (aerial-a vs the reference, same box and mask): p10 69 / p90 116 against the reference's 55 / 133;
  shade band [62, 71, 61] against [49, 56, 46]; lit band [117, 126, 90] (sat 0.29) against [134, 141, 113]
  (sat 0.20): the island canopy a flat mid-green mass of balls, the reference a dark canopy with pale
  yellow-green lit tips and deep gaps. Cause: R3's card sun side was a sphere against the view-space sun,
  and with the sun behind the camera (the aerial views) ~85 % of every disc came out lit.
- **Changed**: the sun's screen direction decides the lit side; the terminator sits at `0.25 - 0.4 sunV.z`
  disc radii toward the sun (40 % lit with the sun beside the camera, ~50 % behind it, 25 % ahead — well past
  a sphere's terminator, because a crown shades itself), fading when the sun is straight behind the camera;
  lit ×[1.6, 1.5, 1.28] (paler, yellower), shade ×[0.36, 0.42, 0.48] (deeper); far modulation 0.5–1.4. The
  3D crowns' sunlit/shade albedo split tilts its hemisphere toward the sun (was straight up) so the tone does
  not step at the 420 m handover (first cut of R7 — fixed terminator +0.25 R, shade ×0.34 — put the cards a
  full stop darker than the 3D crowns in front of them at pose A: a visible band at NEAR_DISTANCE; rejected).
- **Measured**: see the R7b line in the summary (aerial-a mean / p10 / p90 / bands).

## Round 8 — near palms: finned fronds
- **Wrong** (prq, low passes): inside ~60 m a frond is a flat painted strip — the leaflet comb is texture, so
  the frond's edge is straight and its cross-section has no depth; palms read as paper cut-outs.
- **Changed**: a near palm tier (`palmHiBatch`, cells inside `PALM_HI_DISTANCE` 150 m, falling back to the
  strip palms when full): each frond is two rows of five fins hinged on the rachis, each turned down about it
  by its own angle (28–42° + 20° of variation, steeper toward the tip) — a V cross-section and a serrated
  edge — carrying the same texture slice as the strip, so the handover is seamless; the fins quiver about
  the rachis in the wind (edge moves, hinge does not). 284 triangles a palm against 102, only inside 150 m.
- **Why**: the leaflet groups of a coconut frond hang at different angles; that is what reads as leaflets at
  30–60 m, not the comb's gaps (which the mip average closes at that distance).
- **Cost**: pose A (52 hi palms) +15 k triangles; prq none in range (the marina palms stand 200 m off).

## Round 9 — species
- **Wrong**: species differed by shape class only: a ficus and a domed broadleaf were one squash range on the
  same trunk; sea grape, pine and hardwood all wore the same leaf-cluster cards.
- **Changed**: leaf-cluster tiles per species — hardwood clusters (tiles 0-1), the sea grape's big round
  leaves with a dark centre (tile 2, cards ×1.35), pine needle tufts (tile 3, cards ×0.8), mangrove cards
  ×0.85; the spreading (low-squash) broadleaf crown sits on a short, stout trunk (trunk 0.36 → 0.72 with the
  squash, radius ×1.5 → ×0.9) — a ficus — while the domed crown gets the long slender one; pine bark
  reddish-brown; mangrove prop roots (R6). Species mixes (map.ts) untouched: pine and mangrove stay rare in
  the city and bay views — that is planting data the lead owns.

## Round 10 — grass near the camera
- **Wrong**: at ground level (landing, taxi, the low passes) the lawns, park floors and dune ridges were a
  flat texture to the horizon; the trees stood on a painted surface.
- **Changed**: `GrassField`: tufts on a jittered 1.6 m lattice within 60 m of the camera over lawns and
  parks (patches of lush and worn), the golf course (short, mown), the wetland prairie and airport (tall,
  seed heads), the upper beach (dune grass where the ground shader draws it: h > 0.95, in noise patches),
  none on roads, lots, water or building footprints; height 0.12–0.95 m by ground, colour the ground's own
  lawn/dry-grass mix (linear albedos from `openGround`), stood on the local ground plane (finite differences
  of the height field), yawed at random; three crossed quads with a blade cut-out texture (three tiles),
  alpha-to-coverage, lit as a ground surface (normals up, both faces); wind: the tips lean to the crowns'
  gust field in world space plus a quick flutter; chunk-cached (20 m), frustum-culled by chunk, faded over
  the last 15 m, and skipped entirely when the camera is more than 72 m above the ground (the aerial views
  pay nothing). One draw, ≤ 6000 instances (≈ 1300 in a ground view, 8 k triangles).

### R7b — measured, and what it missed
- **Measured** (`r10`/`r11` aerial-a, canopy region mask — every pixel of the box that is neither water nor sand,
  `tools/canopy3.py`; the old green-dominant mask dropped the darkest crowns and a third of the reference's
  box was water): reference mean [80, 86, 77], p10 / p50 / p90 52 / 78 / 130, shade band [46, 53, 47]
  (sat 0.12), lit band [124, 133, 119] (sat 0.10); ours [72, 83, 69], 57 / 75 / 110, shade [48, 59, 56]
  (sat 0.19, hue 164°: cyan), lit [107, 117, 90] (sat 0.24). The elevation-aware terminator and the warmer
  ambient moved the numbers by under one unit: the box is cards at `vFar` ≈ 0-0.3 where the multipliers
  barely changed, and the real fault was in the *shape* of the shading, not its level.
- **Wrong** (side by side, `cmp-ref-r11-aerial*.png`): every crown a ball — a smooth lit half and a smooth dark
  half — twice the apparent size of the reference's crowns, no gaps to the ground; the reference canopy is a
  mottled clump of small lit tips over dark hollows, with sand showing between crowns at the shore.

## Round 7c — mottled terminator, canopy bands, sky reflection
- **Changed**: the card terminator follows the atlas leaf clusters: `dot(vDisc, sunDir) + (t.r - 0.68)` against
  a ±0.16 band, so the raised clusters on the sun side are lit and the hollows between them stay in shade
  (the atlas disc is kept under the channel ceiling — `0.5 + 0.5 lobes` — so the cluster peaks stay separate
  instead of clipping to one plateau); lit ×[2.0, 1.9, 1.75], shade ×[0.3, 0.32, 0.25] (deep and no bluer
  than the leaf), far modulation 0.42–2.0, far card growth 25 → 15 % (gaps show); 3D crowns: the sunlit cap
  gated by the same leaf-cluster noise (`+0.5 (leaf - 0.5)`), sunlit ×[1.45, 1.36, 1.2], shade
  ×[0.44, 0.48, 0.42]; the foliage families' sky reflection (`RE_IndirectSpecular`) ×0.6 — the 4 % Fresnel of
  a blue sky was as bright as the shaded leaf's own diffuse, which is where the cyan shade came from.
- **Measured**: r15 aerial-a (below).

## Round 10b — grass density; Round 6c — hard shadows on bark
- **Wrong** (`r10-park`, eye level under the park canopy): the tufts a scatter of specks on a 1.6 m lattice
  (a lawn read as a painted floor with the odd weed); the trunks pale grey under their own crowns — the
  probe shadow floor of 0.2 and the horizon sky light lit them like concrete posts against the dark lawn.
- **Changed**: lattice 0.8 m with a per-tuft rank against the camera distance (full inside 18 m, a quarter at
  60 m; the rank is the lattice hash so the same tufts stand from every camera), tufts 1.6–2.2× wider than
  tall (a splayed clump), cap 12 000 instances (≤ 72 k triangles, ground views only); the hard parts of a
  crown (trunk, limbs, root zone: `vegHard`) take the full per-fragment shadow with no leaf floor.
- **Also**: the hardwood leaf-cluster tiles redrawn as 120–150 small leaves in 4–6 overlapping bunches (the
  two dozen big ellipses radiating from the tile centre read as hands at 5–10 m).

### Rounds 7c / 8 / 9 / 10 / 10b / 6c — verified (`r12`, `r14`, build 5d48600d)
- **Budgets** (`r12`): pose C 242 calls / **1 564 816** tris (main 1 214 678, reflection 187 064, shadow 141 076,
  wake 21 972; without vegetation 838 032 → vegetation 727 k: 886 level-1 crowns × 268, 242 level-2 × 548,
  101 709 cards, 182 + 61 palms); aerial-a 290 / 1 095 378; pose A 187 / 890 180. `r14` ground views: park
  263 / 1 284 777, palm grove 175 / **1 607 852** (2 347 level-1 crowns: the level-1 band had no budget), prq
  231 / 1 040 379, island 255 / 552 937. The level-1 budget (R6c, commit 0d8c5ac6: `HI_BUDGET` 700 nearest
  first, level-1 fringe 18/6, understory 1.6 km / 450 / 900) was written after this build — measured in `r15`.
- **Grass** (`r14-park`, eye level): the 0.8 m lattice with rank thinning reads as a lawn with tufts to ~40 m,
  the sunlit strip across it convincing; on the shaded lawn the tufts are a shade darker than the ground and
  stand out as specks (they take the crown shadow but not the terrain's canopy darkening — noted, terrain.ts).
- **Trunks** (`r14-park`, `r14-beach`): still pale grey posts in the shade — the R6c shadow floor was the wrong
  fix: the crown's shadow (a light-facing card at the crown centre) falls *behind* the tree, so its own trunk is
  never in it; the trunk's colour is the full sky irradiance on a 0.3 albedo, brighter than the shaded lawn
  beside it, which the terrain darkens under canopy. → R11.
- **Near crowns** (`r14-park`, 3–10 m under the canopy): smooth khaki balls — the puffs are solid shells, the
  rim dissolve alone does not say "leaves"; the undersides glow mustard (the translucency term at full strength
  on a face turned to the camera: `back` ≈ 1, `ndl` ≈ −1 → 0.8 × sun through metres of leaves). → R11.
- **Pine tufts** (`r14-park`): the needle-tuft tile reads as flat starbursts (5 bunches of 26 two-pixel spokes).
  → R11.
- **Black box** (`r8-park`, `s1` sweep 3 of 100 stations, `bb-*` bisection pending): a solid black rectangle
  with 8-px stepped edges, always rows 139–313 of 540 (26–58 % of the frame height) whatever the station or
  heading, ~190 px wide, at headings 0 and 270 (sun ahead / to the side) never 90 / 180; the vegetation instance
  data has no non-finite values (in-page probe over 829 tiles). The fixed screen band and the coarse steps say
  a NaN in a screen-space pass (a bloom mip, or the reflection blur) rather than a world object.
- **Palm fins** (`r14-palm`, `r14-beach`): the finned fronds resolve as leaflet combs at 10–30 m; the camera
  finder put the palm station inside an understory shrub (a near-black card fills the frame: shade
  ×[0.3, 0.32, 0.25] under a 0.6 occlusion — a shrub in deep shade is dark, not black; noted for R12).
- **Terrain, not mine** (`r14-beach`): 2 × 2 m axis-aligned green squares on the pale ground of the shaded
  grove behind the beach (the ground type per cell shows as a checkerboard where lawn and sand meet) — a
  terrain.ts request.

## Round 11 — bark under the canopy, translucency as a rim, leaf-shell puffs, pine tufts (commit c8876734)
- **Changed**: `vegAmb` — the share of the sky the hard parts see, set by the colour stage and applied to the
  indirect diffuse and specular: trunk / limbs `mix(0.5, 0.22, vOcc) × mix(1, 0.45, height in crown)`, root
  zone `mix(0.55, 0.3, vOcc)`, palm trunks `mix(0.7, 0.3, vOcc)`. Crown translucency × `(1 − n·v)(1 − 0.5 n·v)`
  (`rim: true` in `CROWN_LIGHT`; palms and cards are one leaf and keep theirs). Inside 150 m the puffs open
  leaf-cluster hollows over their whole face — `cut = max(rim band, clusters − mix(1.1, 0.72, close))`, a
  soft coverage ramp of ±0.03 — and the crown material is double-sided so the far side of the shell shows
  through them at 45 %. Pine tile: nine bottle-brushes of 70 fine needles (1.2 px, 9–20 px long) fanned about
  twigs radiating from the tile centre, tip half brighter.
- **Why**: a trunk under a crown is lit by the sky it sees around the horizon, not the whole dome; a leaf mass
  is translucent at its edges only; a crown at 5–50 m is a shell of clusters with hollows, not a ball.
- **Measured**: `r16` (below).
