# Vegetation loop 5/6 — report (`src/world/vegetation.ts` only)

Branch `cursor/veg5-loop-8213` (worktree `/home/ubuntu/wt-veg5`), every commit pushed. Baseline for the
before/after numbers: the lead branch at 6130eae7 (preview :4590). Defect log with the round-by-round
measurements: `DEFECTS.md`; capture tools in `tools/` (a queued single-browser session, an interleaved A/B
render-cost job, camera finders, the canopy statistics and the side-by-side crop scripts).

## What was visibly wrong (start of the loop, lead 6130eae7 and the re-implemented loop 5)

- The aerial canopy was a flat green mass: every crown a smooth ball with a lit half and a dark half, twice the
  reference's crown size, no gaps to the ground; the shade cyan (the sky's 4 % Fresnel was as bright as the
  shaded leaf's own diffuse), the lit tips grey-green.
- Near crowns (3–50 m) were balls of khaki plasticine: solid puff shells with a smooth shading gradient, no
  leaf, no branch, and an underside glowing mustard (full-strength translucency on a face turned to the camera).
- Trunks were pale grey posts under their own crowns (their crown's shadow probe falls behind the tree; the
  full sky irradiance on a 0.3 albedo was brighter than the shaded lawn beside them), with no limbs into the
  lobes and no root zone: a lollipop on a lawn.
- Palms at 10–60 m were frond *strips*; the species were the same crown in five tints.
- Grass was a scatter of specks on a 1.6 m lattice; the lawn read as a painted floor.
- From a ground camera the understory shrubs, cards only, were frame-filling blurred billboards at 2–4 m.
- The near pines dissolved into a teal haze at 10–60 m.
- Pose C (the dense park clump from 130 m) ran 65 k triangles over the 1.5 M budget; the palm grove 108 k over.

## What changed (concrete), and why it improves realism

**Light model per family (R1–R2, R11).** `foliageLighting()` parameterised per family (wrap / floor /
translucency); the crowns' translucency is a rim term `(1 − n·v)(1 − 0.5 n·v)` (a leaf mass is translucent at
its edges only — the mustard undersides are gone); the foliage families' sky reflection ×0.6; a `vegAmb` share
of the sky for the hard parts (trunk / limbs `mix(0.5, 0.22, occ) × mix(1, 0.45, height)`, root zone, palm
trunks), and the full per-fragment shadow on them (`vegHard`) — a trunk under a crown is lit by the sky it sees
low around the horizon, not the dome, so it now stands darker than the lawn its crown shades.

**Neighbour occlusion (R1, R12).** `occludePlants`: a spatial hash of the canopy plants; every plant carries how
much taller crown overlaps its own (packed into `aVar`), darkening its lower crown and its sky light in the
crown and card shaders; the understory receives it from the canopy over it (capped 0.88: a shrub in deep
shade is dark, not black). The inside of a dense stand goes dark while a lone tree stays lit all round; the
'buried' lower puffs of a park tree no longer stand lit like a lone tree's.

**Cards = the aerial canopy (R3, R7–R7c, R12b).** Per-card sun side from the screen-projected sun with a
terminator that follows the atlas leaf clusters (`dot(disc, sun) + (leaf − 0.68)` in a ±0.16 band), so a crown
from above is a mottled clump of lit tips over dark hollows rather than a shaded ball; base-of-crown darkening,
far-canopy modulation, card growth 25 → 15 % (gaps show); the bands calibrated against the reference island
canopy (`tools/canopy3.py`): shade [48, 54, 51] hue 147° vs the reference's [49, 56, 51] 135°, lit [137, 139,
110] vs [165, 153, 131], dark fraction 0.21 vs 0.15 (from 0.31 / hue 175° cyan at the start).

**Near crowns (R6, R11, R13–13b, R14).** Three limb prisms from the trunk top to each lobe's centre (a
mangrove's are prop roots to the ground), bark with grain and furrows, a leaf-litter root zone that fades into
the lawn; inside 150 m the puffs wear the species' **leaf carpet** — two seamless leaf-texture tiles (hardwood
leaves, pine needles) laid over the faces in world space, sampled triplanar, with gaps that open in the hollows
of a cluster field and show the far side of the shell (dark; back faces cut wider so the sky shows through a
crown's underside); the puff normals perturbed cluster by cluster; the silhouette dissolved with leaf noise.
Inside 40 m the leaf split is greener and fuller than the cards' hazed aerial split (lit hue ~80°, saturation
~0.45 against 52° / 0.27); the per-leaf shade is divided by the coverage (the atlas' clear texels are black and
a mip-blended sample darkened every sparse tile — the teal near pines).

**Species (R4, R8, R9, R13).** Metre-based species sizing kept; sea grape with big round leaves (a 20 cm leaf
on a 2 m card), slash pine as conical tiers with needle-tuft bottle-brushes and a needle carpet, mangrove with
prop roots and small dense leaves, ficus-like spreading broadleaf (stout short trunk, low squash) vs domed
hardwood, tussocks with blade tufts; the palms' near tier draws **finned fronds** (a leaflet comb at 10–60 m)
inside 150 m with a dynamic alpha threshold, a lime palette against the olive hardwoods; the leaf atlas is
un-flipped (`flipY = false` — the fringe cards had read the wrong species' tiles all along).

**Wind hierarchy (R6).** Trunk sway moves the whole plant (slow, height-squared), each lobe rocks on its own
branch at its own phase and a higher frequency, the leaf-cluster cards flutter small and quick; phases from the
plant position, so nothing waves in step. The user-stated wind strength is untouched.

**Grass (R10, R10b).** A 0.8 m lattice of splayed tufts (1.6–2.2× wider than tall), per-tuft rank against the
camera distance (full inside 18 m, a quarter at 60 m; the rank is the lattice hash so the same tufts stand from
every camera), terrain-aligned, wind-bent; ≤ 12 000 instances / 72 k triangles, ground views only.

**Understory in 3D (R14).** Inside 60 m the shrubs and tussocks draw from the crown batches (level 2 inside
30 m) instead of their cards.

**Budget (R5, R6c).** `ULTRA_DISTANCE` 170 → 80 m (a 10 m crown at 80 m is 80 px, held by level 1),
`ULTRA_BUDGET` 420, a level-1 budget of 700 nearest cells first (a dense park clump under a 130 m aerial held
890 level-1 crowns, most 15–20 px tall), level-1 fringe 24/8 → 18/6, understory cards 1.6 km / full 450 / half
900, shadows 350; city street trees clamped (downtown / bayfront / hotel rows).

## Performance (calls / triangles; ≤ 400 / ≤ 1.5 M everywhere; console clean)

| view | baseline (lead 6130eae7) | r18 (before R14) | r19 (R14) |
|---|---|---|---|
| pose C (park clump, 130 m) | 237 / 1 530 k | 243 / 1 485 754 | R19_POSEC |
| pose A (RES_LOW, 130 m) | 179 / 890 k | 187 / 883 618 | — |
| aerial-a | — | 290 / 1 094 024 | R19_AERIAL |
| plane-rear-quarter | 229 / 1 010 k | 231 / 936 987 | — |
| island-pass | 255 / 550 k | 255 / 551 653 (r17) | — |
| park, eye level | — | 264 / 1 220 879 | R19_PARK |
| low (25 m over the park) | — | 185 / 1 134 647 | R19_LOW |
| mid (park edge, eye level) | — | 254 / 1 389 843 | R19_MID |
| palm grove, eye level | — | 176 / 1 293 544 (r15) | R19_PALM |
| beach, eye level | — | — | R19_BEACH |

Shader cost (interleaved A/B, `tools/session.mjs` job `ab`, median ms/frame, SwiftShader): AB_RESULT.

## What remains weak (my own criticism)

- The crown is still a **shell**: the leaf carpet and its gaps read as foliage at 5–50 m, but there is no
  interior — the gaps show the darkened far side of the same shell (or the sky), never inner branches or
  layered leaves. Branch hierarchy stops at the three limbs into the lobes; there are no twigs.
- The carpet's leaves are **flat ellipses in world projection**: convincing at 5–20 m, but a puff seen along
  its own face at 1–3 m smears them (the triplanar blend hides the seams, not the stretch).
- The **aerial canopy's lit band** is dimmer and greener than the reference's hazed pinkish-beige tips (p90 133
  vs 155); the last gap is the atmosphere's (haze and exposure over 4 km), not the leaf's.
- Everything in **shade is teal** at 15:00 — the sky IBL is strongly cyan and the terrain's shaded lawn reads
  hue 156°; the foliage matches it (consistent, but it makes the shade of a crown less green than a leaf's).
- A **tussock** is a spreading puff cluster with a needle carpet — a passable clump of dune grass at 5 m+, not
  blades.
- **Not mine, found on the way**: a solid black box smeared by the bloom from the city's `house` kind at the
  horizon in some park stations (bisected in `DEFECTS.md`, stations listed for the city builder); the terrain's
  2 × 2 m ground-type checkerboard where lawn meets sand behind the beach; the shaded lawn's teal.

## Rubric categories affected — self-scores

- **28 Vegetation** — from ~5.5 (flat canopy, plasticine puffs, lollipop trunks, sprite palms) to **7.5**: leaf
  geometry (cards, carpet, fringe clusters, finned fronds), branch hierarchy (limbs, prop roots), species and
  size variation (metre-sized species with distinct leaves and silhouettes), trunks and bark, translucency (a
  rim), grounding (root zone, hard shadows on bark, understory in 3D near the camera), propagated wind. Short
  of 8 for the shell interior and the twig-less branching.
- **27 Sand and shoreline** (support) — 6.5 → **7**: dune tussocks and sea grape on the ridge, palms leaning
  seaward, the understory occlusion and grass at the beach stations; the sand-to-grass boundary itself is
  terrain.ts's (the checkerboard noted).
- **29 World density** (support) — the parks and suburbs read as planted (street rows clamped to street-tree
  size, understory under the canopy, a canopy that does not dwarf the houses); +0.5 at most from vegetation.

## Highest-value next attack

An **interior** for the near crowns: a second, smaller shell of leaf cards inside each puff (or the fringe cards
seeded through the puff volume rather than on its surface), lit as the shaded hollow, so the carpet's gaps open
onto layered leaves and twig lines instead of the far wall — that is what separates 'foliage texture' from
'a tree' at 3–20 m. Second: a *nearest-crown* LOD metric instead of the cell box distance (186 level-2 crowns
sit under every 130 m aerial pose for nothing: 52 k triangles).

## Failed / reverted candidates (do not repeat)

- A shadow *floor* of 0.2 on the trunks (R6c first attempt): the trunk was never in its own crown's shadow —
  the pale posts were the sky term, fixed by `vegAmb` instead.
- Noise hollows over the puff face (R11): too few and too round to read as leaves; replaced by the leaf carpet.
- A hard pick of one triplanar plane by the dominant normal axis (R13): straight seams across the puffs;
  replaced by the fourth-power blend.
- Pine needle tufts as 5 bunches of 26 two-pixel spokes (R9): flat starbursts; nine → ten bottle-brushes of 70
  fine needles, two at the tile centre (a ring otherwise).
- Hardwood clusters as two dozen big ellipses radiating from the tile centre: hands at 5–10 m.
- `ULTRA_DISTANCE` alone as the pose-C budget lever below 100 m: the level-2 count under an aerial camera is
  fixed by the cell-box metric (186 crowns at 130, 100 and 80 m).
- (loop 5, from its report) hemisphere-only crown lighting without the per-plant occlusion; per-card random
  sun side; card growth 25 %.

## Shared-file hunks

None. Every change is in `src/world/vegetation.ts`; `map.ts` canopy classes and `terrain.ts` untouched
(requests to terrain.ts noted in `DEFECTS.md`: the ground-type checkerboard, the shaded lawn's tone under
canopy). The bench tools live under `bench/reports/veg5/tools/` and `bench/out/veg5/`.
