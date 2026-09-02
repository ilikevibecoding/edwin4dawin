# H–K degree-two frozen-cell cone screen (ordinary-parent j00 cores) — 2026-09-02

Marker: `SEARCHED_EXACT_GENERATORS_ISO_N6_BUNDLE_G1_ORDINARY_PARENT_HK_DEGREE2_FROZEN_SCREEN_ROOT`

Producer: `search_iso_n6_bundle_g1_ordinary_parent_hk_degree2_frozen_screen_root.py`
(sha256 `D498A718F3DA96B58E690D79C31703B2FC2915B65340A43C62E3485BFE923297`)

Report: `iso_n6_bundle_g1_ordinary_parent_hk_degree2_frozen_screen_root_20260902.json`
(sha256 `1BC8D7C55FF4A4D54508561F74FA06A82CD568CFFBF2C8C4AD3F9A0ABF3C09C3`)

Pinned inputs (sha256 checked fail-closed):
`iso_n6_bundle_g1_ordinary_parent_hk_lower_exact_root_20260901.json` (22F1F54F…),
`iso_n6_bundle_g1_ordinary_parent_hk_jmask_dominance_exact_root_20260901.json` (7B25D57E…),
`iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json` (6AE97573…),
`iso_n6_bundle_g1_ordinary_parent_hk_lower_n8_census_root_20260901.json` (08CD091C…).

## 0. Verdict in one line

All 24 j00 cores (32 labels; `k01`/`k10` share a class by the u↔v symmetry) are
**LP-infeasible** in the degree-two H–K frozen-cell cone.  This is a **cone
obstruction only**: no negative forest cell was found (the order-8/9 census of
every realizable (H,K) instance has every core strictly positive, minimum 2751
over orders 8–9), and nothing here is a theorem or a counterexample.  No exact
replay script was produced because no core was feasible.

## 1. Domain and coordinates

H is a finite forest with two distinct marks u,v (adjacent or nonadjacent),
n = |H| = 8 + s with s ≥ 0.  K = H − S where S = N(p) for an actual ordinary
parent p (p ∉ H, p is not a mark), so S meets every component of H at most
once.  The K-mask `k{ku}{kv}` records which marks survive in K.

Coordinates (all nonnegative integers): `s`, `k = |K|`, occupation counts
`HW_r` (independent r-sets avoiding both marks), `HA_r` (containing v only),
`HB_r` (containing u only), `HZ_r` (containing both; nonadjacent only, r ≥ 3),
r = 2..7, and the analogous `KW_r, KA_r, KB_r, KZ_r` for K (`KA` only if v
survives, `KB` only if u survives, `KZ` only if both survive and nonadjacent).
The target lower classes are written with generic symbols; for the adjacent
geometry `HZ_r = KZ_r = 0`, and categories of deleted marks are 0 in K.  The
rank-2 both-marks count is the structural constant (1 nonadjacent / 0
adjacent).  Variables per cone: 26 (adjacent k00) … 48 (nonadjacent k11).

## 2. Generator families and validity justifications

Each family is described and justified in the report
(`generator_families`, `constraint_justifications`, `frozen_domain_notes`).

1. **Monomials** of total degree ≤ 2 in the coordinates: products of
   nonnegative quantities.
2. **Containment / order** (`containment_{W,A,B,Z}r`: `H*_r − K*_r ≥ 0`
   because K is an induced subforest of H containing the surviving marks;
   `order_H_minus_K`: n − k ≥ #deleted marks; K-order constraints
   `K_order_A/B`), and **isolate-multiply upper bounds**
   `H*_r ≤ Σ_j C(|S'|,j) K*_{r−|T|−j}` (independent sets of H split as
   mark part ∪ part in K ∪ part in S' = S − {u,v}; only the degree-≤2
   expansions are kept, higher-degree ones are omitted and listed).
3. **Star-attachable consequences** — only what is rigorous in the
   coordinates: `k ≥ e(H)` (|S| ≤ c(H) = n − e(H), with
   e(H) = C(n,2) − i_2(H) expressed through `HW2+HA2+HB2+[nonadj]`), and in
   the nonadjacent k00 mask the exact equality |N(u)∩N(v)| = 0 (both marks
   deleted ⇒ distinct components ⇒ no common neighbour) plus the edgeless
   N(u)∪N(v) pair bound.  No other star-attachable inequality was derivable
   in these coordinates and none was added (stated in `excluded_generators`).
4. **Forest extension / pair / mark-neighbourhood constraints** separately on
   H and on K, reusing the q-free-script arguments: extension double counts
   `(avail − r + 2) X_{r−1} ≥ (r−1) X_r`, forest pair bounds
   `C(m,2) − (m−1) ≤ W_2 ≤ C(m,2)` (safe form `m(m−3)/2` for K where m may be
   < 3), cross-category deletions `W_{r−1} ≥ A_r, B_r`, `A_{r−1}, B_{r−1},
   W_{r−2} ≥ Z_r`, disjoint/independent mark neighbourhoods (adjacent:
   N(u), N(v) disjoint and their union independent; nonadjacent: at most one
   common neighbour, N(u)∪N(v) induces ≤ 1 − |N(u)∩N(v)| edges),
   inclusion–exclusion `W_r ≥ A_{r+1} + B_{r+1} − Z_{r+2}`.
5. **Frozen G2..G10 cross cells** (H,K): imported **only** where the pair is
   literally in a certified domain:
   * `G3(H,K)`, `G3(H,K−u)`, `G3(H,K−v)`, `G3(H,K−u−v)`, `G3(H,0)`: G3 is
     certified for every finite two-marked forest C and every induced marked
     minor D ⊆ C, including the empty minor.
   * `G4..G7(H,K)`: G4 and G5..G10 are certified for every forest-realizable
     sibling-bundle cell (C,D) = (B−s, B−N[s]); with B = H + p, C = H,
     D = H − N(p) = K, and B is a forest because S meets each component of H
     at most once.  G8 depends only on the C-rows (so (H,K) duplicates
     (H,H)); G9 = 630 and G10 = 0 after row substitution.
   * `G4..G7(H,H−u−v)` only in nonadjacent k00, where u,v lie in distinct
     components so s ∼ {u,v} realizes the bundle cell; G3(H,H−u−v) always.
   * **Excluded**: G2 on any cross pair (G2 is certified only in parent modes
     D = C, C−u, C−v, C−p with p a single ordinary vertex; |S| is a variable
     here), all (U,U), (U,W), (V,V), (V,W), (W,W) first-argument states of the
     older q-free scripts and all K-internal cells outside mask k11 (the first
     argument would carry an absent mark, which is outside every certified
     domain), and G4..G7(H,H−u−v) outside nonadjacent k00.
6. **Internal frozen cells**: `G2..G8(H,H)`, `G2..G7(H,H−u)`, `G2..G7(H,H−v)`,
   and for mask k11 the same on K.  These are the D = C / C−u / C−v modes
   certified for every geometry.  Frozen cell counts per cone: 26 (adjacent
   k00), 27 (k01/k10), 50 (k11), 30 (nonadjacent k00).

## 3. Validation before solving (mandatory, fail-closed)

Realizable (H,K) instances were enumerated at orders 2..9 (307 forests,
11 304 attachable relation instances, 711 360 ordered marked instances;
validation restricted to orders 8 and 9): every generator column was evaluated
exactly in int64 on every instance of its (geometry, mask) group.

| cone | variables | atoms | rows | instances (n=8,9) | violated |
|---|---|---|---|---|---|
| adjacent k00 | 26 | 1191 | 378 | 0 (no realizable instance) | — |
| adjacent k01 / k10 | 32 | 2217 | 561 | 15 870 | 0 |
| adjacent k11 | 38 | 3674 | 780 | 51 770 | 0 |
| nonadjacent k00 | 31 | 2770 | 528 | 59 816 | 0 |
| nonadjacent k01 / k10 | 37 | 4177 | 741 | 119 980 | 0 |
| nonadjacent k11 | 48 | 9852 | 1225 | 270 306 | 0 |

**No generator was violated**; nothing had to be removed.  The census also
reproduces the 20260901 order-8 minima and witnesses of the lower classes
exactly (e.g. 4418 / 3912 / 4114 / 3524 for nonadjacent k01).

The adjacent k00 mask has **no realizable instance** at any order 2..9 (two
adjacent marks cannot both be neighbours of an ordinary parent in a forest);
its four cores are flagged `scope-pending` and were solved for completeness
only — their generators could not be census-validated.

## 4. LP results (HiGHS dual simplex, float)

All 32 labels: `INFEASIBLE_CONE_OBSTRUCTION_ONLY` (HiGHS status 8, infeasible,
each in < 0.05 s at presolve).  Infeasibility was confirmed independently by
the L1-closest-cone-point LP: the minimal L1 residual is far above tolerance
(211–815 against target L1 norms 1212–3408; residual support 51–90
monomials, dominated by `k·HW5`, `k·HW4`, `HA2·HW5`, `HB2·HW5`, `HW2·HW3`,
`HA4·HB3`).  The LP machinery was sanity-checked on a synthetic target inside
the cone (feasible, exact rational reconstruction with 36-atom support).
Peak RSS 1.64 GiB, wall 87 s, ≤ 2 threads.

## 5. Honesty statement

* LP infeasibility is only an obstruction to this degree-two generator cone;
  it is not a negative forest cell and says nothing about the truth of the
  24 core inequalities.
* No core was LP-feasible, so no rational reconstruction and no exact replay
  script was written; no `PASS_` marker exists for any H–K core.
* Orders 2..7 in the census carry no claim (the lower classes are stated for
  n ≥ 8); they are recorded as finite evidence only.
* Excluded generators are listed with reasons in Section 2 and in the report's
  `excluded_generators`.
