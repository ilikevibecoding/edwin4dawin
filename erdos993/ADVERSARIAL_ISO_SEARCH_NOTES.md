# Adversarial search for prefix violations of WR_r / ISO_r (Erdős #993 project)

Script: `adversarial_iso_search.py` (uses only `forest_indep.py`, no other dependencies).
Data:   `results/adversarial_iso_search.json` (all records with exact fractions as
`"num/den"` strings, edge lists, exact polynomials; decimals are labelled `*_approx`).

Target of the project (recalled): for every forest and every prefix index
1 <= r <= L(alpha) − 1, L(alpha) = ceil((2 alpha − 1)/3),

    WR_r : p_{r−1} <= r p_r                      (slack  W_r = r p_r − p_{r−1} >= 0)
    ISO_r: Q_r = r p_r² + p_{r−1}² − (r+1) p_{r−1} p_{r+1} >= 0,
           i.e. rho_r := (r p_r² + p_{r−1}²) / ((r+1) p_{r−1} p_{r+1}) >= 1.

Everything below is exact (Python integers / `fractions.Fraction`); decimals are
approximations of exact fractions stored in the JSON.

## 1. Headline

**No violation found.**  Over all forests evaluated — 54,756,292 forests produced by
the annealer (every one checked exactly), roughly 6·10⁴ members of named families
scanned exactly, and *all* 823,065 non-isomorphic trees of order 20 enumerated
exhaustively — every prefix index had Q_r > 0 and W_r > 0.  Not a single exactly
tight case (Q_r = 0 or W_r = 0) occurred either.

* Smallest prefix ISO ratio ever seen: the star K_{1,99} (n = 100) at r = 2,
  rho_2 = 23537201/23527350 ≈ 1.000418704 (rho_2 − 1 = 9851/23527350).
  Re-verified with `indep_poly_from_edges` and with the independent recurrence
  I(G) = I(G − v) + x·I(G − N[v]).  At every size and in both modes the best
  r = 2 value found is *exactly* the star's value (Section 4); nothing beats the
  star at r = 2, and nothing at any other r comes within a factor n of it.
* Smallest normalised WR slack (r p_r − p_{r−1})/p_{r−1} ever seen: 11543/2917 ≈ 3.957
  (n = 20, r = 8 = L − 1).  WR is never anywhere near tight: the minimum grows with n
  (≈ 4.75, 5.50, 7.07, 10.24, 16.86 for n = 26, 30, 40, 60, 100).
* For r >= 3 the annealer never gets closer to rho = 1 than ≈ 1 + 0.95/n; the tightest
  structures are caterpillars with 1–3 hubs (Section 5), never deep trees: the KLYM
  (left,k,k) trees and Galvin's T_{m,t,1} were used as seeds and were never competitive.

## 2. What was run

* Objective: min over prefix r of rho_r (target `min`), each fixed prefix index
  (`r=3`, `r=4`, `r=5`, `r=6`, and `r=8,10,13,16,20,28` for the larger n), the
  moving top indices r = L(alpha) − 1 (`top`) and L(alpha) − 2 (`top1`), and the
  normalised WR slack (`wr`).  Every evaluated forest updates the per-r records of
  *all* prefix indices, whatever the run's target.
* Search: simulated annealing on energy log(rho_r − 1) (geometric temperature
  0.6 → 0.008 over each run), moves: leaf move (uniform or degree-biased target),
  prune-and-regraft of a subtree, swap of two subtrees; in forest mode additionally
  detach a subtree into a new component / attach a component under a vertex of
  another one.  Seeds: random Prüfer trees, stars, spiders (legs <= 2 and <= 3),
  caterpillars, brooms, double stars, subdivided stars, preferential-attachment
  trees, paths, KLYM (left,k,k) trees (`klym_3kk_tree`), Galvin T_{m,t,1}, random
  forests, matchings, star forests, and the best member of an exact family scan.
  Deterministic integer seeds per run (recorded in the JSON); runs are time-boxed,
  so evaluation counts (also recorded) vary between machines.
* Sizes / budgets (main pass): trees n = 20, 26, 30, 40, 60, 100 (120–280 s each,
  20–56 SA runs of 6–9 s), forests n = 20, 30, 50 (90–170 s each).  Supplementary
  pass: trees n = 60, 100, targets r = 3,4,5,7,8,9 (294 s).  Exhaustive
  certification of all trees of order 20 (11 s).  Total 1749 s ≈ 29 min, single
  process.  Throughput 10k (n = 100) to 63k (n = 20) exact evaluations per second
  (the hot loop packs each polynomial into one Python integer, n+1 bits per
  coefficient; exactness argument in the script docstring; the packed DP is checked
  against `indep_poly_from_edges` at start-up and every record is recomputed with
  the core from its edge list at the end — all 510 records verified).
* Floats are used only to steer the annealer and as a 1e-9-relative pre-filter for
  record updates; every verdict (violation, record comparison) is an exact integer
  or `Fraction` comparison.

## 3. Best rho_r found per (mode, n, r)

Notation for structures: `cat(spine degrees a-2-b)` is a caterpillar whose non-leaf
vertices form a path with the listed degrees, i.e. `a-2-b` = two stars K_{1,a−1} and
K_{1,b−1} joined through one degree-2 vertex; `a-2-b-2-c` = three stars joined through
two degree-2 vertices; `dstar(a-b)` = two adjacent hubs of degrees a, b; `a-b-c` =
three consecutive hubs (triple star).  "alpha, L" are those of the extremal forest.
Rows marked `[exact scan]` come from the exact family scan (the annealer's own record
at that index was slightly worse); all other rows were found by the annealer (and, at
every index where they overlap, coincide with the family-scan optimum).

#### trees, n = 20 (certified: exact optimum over all 823,065 trees at every r)

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 1 | 13, 9 | 59/342 | 1.7251e-01 | 3.450 | 1.7251e-01 | every tree (rho_1 depends only on n) |
| 2 | 19, 13 | 371/29070 | 1.2762e-02 | 0.255 | 1.2762e-02 | K_{1,19} |
| 3 | 18, 12 | 58411/801420 | 7.2884e-02 | 1.458 | 7.3529e-02 | cat(16-2-3) = K_{1,15} –v– K_{1,2} |
| 4 | 18, 12 | 1983/24101 | 8.2279e-02 | 1.646 | 8.3333e-02 | cat(10-2-9) = K_{1,9} –v– K_{1,8} |
| 5..12 | 19, 13 | | | | | K_{1,19} (star value) |
| L−1 = 6 | 11, 7 | 290273/1027458 | 2.8252e-01 | 5.650 | | spider, legs 2^8 1^3 |
| L−2 = 5 | 11, 7 | 10280845/47525856 | 2.1632e-01 | 4.326 | | spider, legs 2^8 1^3 |

Min normalised WR slack: 11543/2917 ≈ 3.957 at r = 8 (max-degree-4 tree, 2 pendant K2s).

#### trees, n = 26

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 2 | 25, 17 | 319/44850 | 7.1126e-03 | 0.185 | 7.1126e-03 | K_{1,25} |
| 3 | 24, 16 | 33543/662800 | 5.0608e-02 | 1.316 | 5.1383e-02 | cat(20-2-5) |
| 4 | 24, 16 | 1216/22725 | 5.3509e-02 | 1.391 | 5.6277e-02 | cat(13-2-12) |
| 5 | 24, 16 | 13037/219450 | 5.9408e-02 | 1.545 | 6.1905e-02 | cat(13-2-12) |
| 6 | 24, 16 | 4975835/72959208 | 6.8200e-02 | 1.773 | 6.8421e-02 | dstar(13-13) |
| 7..16 | 25, 17 | | | | | K_{1,25} (star value) |
| L−1 = 8 | 14, 9 | 1680295/7057739 | 2.3808e-01 | 6.190 | | spider, legs 2^11 1^3 |
| L−2 = 7 | 14, 9 | 1091543/5732471 | 1.9041e-01 | 4.951 | | spider, legs 2^11 1^3 |

Min normalised WR slack: 94733/19927 ≈ 4.754 at r = 10.

#### trees, n = 30

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 2 | 29, 19 | 428/82215 | 5.2059e-03 | 0.156 | 5.2059e-03 | K_{1,29} |
| 3 | 28, 19 | 1504103/35768600 | 4.2051e-02 | 1.262 | 4.2735e-02 | cat(23-2-6) |
| 4 | 28, 19 | 17633/407676 | 4.3252e-02 | 1.298 | 4.6154e-02 | cat(15-2-14) |
| 5 | 28, 19 | 2690639/57004350 | 4.7201e-02 | 1.416 | 5.0000e-02 | cat(15-2-14) |
| 6 | 28, 19 | 1342564/25219821 | 5.3234e-02 | 1.597 | 5.4348e-02 | dstar(15-15) |
| 7..18 | 29, 19 | | | | | K_{1,29} (star value) |
| L−1 = 10 | 17, 11 | 32790748131/150192345202 | 2.1833e-01 | 6.550 | | spider, legs 2^12 1^5 |
| L−2 = 9 | 17, 11 | 72700257489/406274906560 | 1.7894e-01 | 5.368 | | spider, legs 2^12 1^5 |

Min normalised WR slack: 135206/24577 ≈ 5.501 at r = 12.

#### trees, n = 40

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 2 | 39, 26 | 1541/548340 | 2.8103e-03 | 0.112 | 2.8103e-03 | K_{1,39} |
| 3 | 38, 25 | 3071/103880 | 2.9563e-02 | 1.183 | 3.0030e-02 | cat(31-2-8) |
| 4 | 38, 25 | 180367/6191349 | 2.9132e-02 | 1.165 | 3.1746e-02 | cat(20-2-19) |
| 5 | 38, 25 | 24131881/778645560 | 3.0992e-02 | 1.240 | 3.3613e-02 | cat(20-2-19) |
| 6 | 38, 25 | 164089/4816056 | 3.4071e-02 | 1.363 | 3.5651e-02 | dstar(20-20) |
| 7 | 38, 25 | 43512081/1162346848 | 3.7435e-02 | 1.497 | 3.7879e-02 | dstar(20-20) |
| 8..25 | 39, 26 | | | | | K_{1,39} (star value) |
| L−1 = 12 | 20, 13 | 3373596907/19714456410 | 1.7112e-01 | 6.845 | | spider, legs 2^19 1 |
| L−2 = 11 | 20, 13 | 9590530/66117129 | 1.4505e-01 | 5.802 | | spider, legs 2^19 1 |

Min normalised WR slack: 93746129/13252319 ≈ 7.074 at r = 16.

#### trees, n = 60

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 2 | 59, 39 | 3511/2925810 | 1.2000e-03 | 0.072 | 1.2000e-03 | K_{1,59} |
| 3 | 58, 39 | 55843209/3008725060 | 1.8560e-02 | 1.114 | 1.8797e-02 | cat(47-2-12) |
| 4 | 58, 39 | 655487/37341189 | 1.7554e-02 | 1.053 | 1.9481e-02 | cat(30-2-29) |
| 5 | 58, 39 | 1960995689/107427917520 | 1.8254e-02 | 1.095 | 2.0202e-02 | cat(30-2-29) |
| 6 | 58, 39 | 14367265/732103008 | 1.9625e-02 | 1.177 | 2.0964e-02 | dstar(30-30) |
| 7 | 57, 38 | (17-digit)/(18-digit) | 2.0895e-02 | 1.254 | 2.1771e-02 | cat(20-2-19-2-20) |
| 8 | 57, 38 | (15-digit)/(17-digit) | 2.1876e-02 | 1.313 | 2.2624e-02 | cat(20-2-19-2-20) |
| 9 | 57, 38 | (16-digit)/(17-digit) | 2.3102e-02 | 1.386 | 2.3529e-02 | cat(20-21-2-19) |
| 10 | 57, 38 | 12253816531879/502067978776958 | 2.4407e-02 | 1.464 | 2.4490e-02 | cat(20-21-20) (triple star) |
| 11..38 | 59, 39 | | | | | K_{1,59} (star value) |
| L−1 = 20 | 32, 21 | (22-digit)/(23-digit) | 1.2602e-01 | 7.561 | | spider, legs 2^27 1^5 |
| L−2 = 19 | 32, 21 | (20-digit)/(21-digit) | 1.1190e-01 | 6.714 | | spider, legs 2^27 1^5 |

Min normalised WR slack: 1047213629355/102289342117 ≈ 10.238 at r = 24.

#### trees, n = 100

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 2 | 99, 66 | 9851/23527350 | 4.1870e-04 | 0.042 | 4.1870e-04 | K_{1,99} |
| 3 | 98, 65 | 254062867/23862554100 | 1.0647e-02 | 1.065 | 1.0739e-02 | cat(79-2-20) |
| 4 | 98, 65 | 3215527/329631069 | 9.7549e-03 | 0.975 | 1.0965e-02 | cat(50-2-49) |
| 5 | 98, 65 | 3203622401/321096224320 | 9.9771e-03 | 0.998 | 1.1198e-02 | cat(50-2-49) |
| 6 | 98, 65 | 206219123/19534791158 | 1.0557e-02 | 1.056 | 1.1439e-02 | dstar(50-50) |
| 7 | 97, 65 | (15-digit)/(17-digit) | 1.0950e-02 | 1.095 | 1.1688e-02 | cat(33-2-33-2-33) |
| 8 | 97, 65 | (18-digit)/(20-digit) | 1.1237e-02 | 1.124 | 1.1945e-02 | cat(33-2-33-2-33) |
| 9 | 97, 65 | (19-digit)/(21-digit) | 1.1639e-02 | 1.164 | 1.2210e-02 | cat(33-2-33-2-33) |
| 10 | 97, 65 | (21-digit)/(22-digit) | 1.2073e-02 | 1.207 | 1.2484e-02 | cat(33-35-33) (triple star) |
| 11 | 97, 65 | (22-digit)/(24-digit) | 1.2520e-02 | 1.252 | 1.2768e-02 | cat(33-35-33) |
| 12 | 97, 65 | (21-digit)/(23-digit) | 1.2962e-02 | 1.296 | 1.3062e-02 | cat(33-35-33) |
| 13 | 97, 65 | (25-digit)/(27-digit) | 1.3348e-02 | 1.335 | 1.3365e-02 | cat(25-51-25) |
| 14..65 | 99, 66 | | | | | K_{1,99} (star value) |
| L−1 = 32 | 50, 33 | (24-digit)/(25-digit) | 7.9874e-02 | 7.987 | | spider, legs 2^49 1 |
| L−2 = 31 | 50, 33 | (22-digit)/(23-digit) | 7.3847e-02 | 7.385 | | spider, legs 2^49 1 |

Min normalised WR slack: 2738312581239965029/162387765521198746 ≈ 16.863 at r = 38.
(The long fractions are in the JSON.)

#### forests, n = 20

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 1 | 20, 13 | 21/380 | 5.5263e-02 | 1.105 | 1.7251e-01 | 20 K1 (edgeless) |
| 2 | 19, 13 | 371/29070 | 1.2762e-02 | 0.255 | 1.2762e-02 | K_{1,19} |
| 3 | 19, 13 | 333/5432 | 6.1303e-02 | 1.226 | 7.3529e-02 | K_{1,15} + 4 K1 |
| 4 | 19, 13 | 2215967/28865925 | 7.6768e-02 | 1.535 | 8.3333e-02 | K_{1,12} + 7 K1 |
| 5..12 | 20, 13 | | | | | 20 K1 (edgeless = binomial value) |
| L−1 = 6 | 11, 7 | 717/2626 | 2.7304e-01 | 5.461 | | 9 K2 + 2 K1 |
| L−2 = 5 | 11, 7 | 9971/47012 | 2.1209e-01 | 4.242 | | 9 K2 + 2 K1 |

#### forests, n = 30

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 1 | 30, 20 | 31/870 | 3.5632e-02 | 1.069 | 1.0961e-01 | 30 K1 |
| 2 | 29, 19 | 428/82215 | 5.2059e-03 | 0.156 | 5.2059e-03 | K_{1,29} |
| 3 | 29, 19 | 1379819/39174608 | 3.5222e-02 | 1.057 | 4.2735e-02 | K_{1,23} + 6 K1 |
| 4 | 29, 19 | 2060522/48894615 | 4.2142e-02 | 1.264 | 4.6154e-02 | K_{1,19} + 10 K1 |
| 5 | 28, 19 | 2690639/57004350 | 4.7201e-02 | 1.416 | 5.0000e-02 | cat(15-2-14) (a tree) [exact scan] |
| 6..19 | 30, 20 | | | | | 30 K1 |
| L−1 = 10 | 17, 11 | 15845749917/73061099936 | 2.1688e-01 | 6.507 | | spider(legs 2^2 1^5) + 10 K2 |
| L−2 = 9 | 17, 11 | 17903354573/100468395360 | 1.7820e-01 | 5.346 | | spider(legs 2^2 1^5) + 10 K2 |

#### forests, n = 50

| r | alpha, L | rho_r − 1 (exact) | approx | (rho_r−1)·n | star: rho_r − 1 | extremal structure |
|---|---|---|---|---|---|---|
| 1 | 50, 33 | 51/2450 | 2.0816e-02 | 1.041 | 6.3350e-02 | 50 K1 |
| 2 | 49, 33 | 1213/690900 | 1.7557e-03 | 0.088 | 1.7557e-03 | K_{1,49} |
| 3 | 49, 33 | 19009455/1005709024 | 1.8902e-02 | 0.945 | 2.3127e-02 | K_{1,39} + 10 K1 |
| 4 | 48, 32 | 10232/466829 | 2.1918e-02 | 1.096 | 2.4155e-02 | cat(25-2-24) (a tree) [exact scan] |
| 5 | 48, 32 | 59426/2584395 | 2.2994e-02 | 1.150 | 2.5253e-02 | cat(25-2-24) (a tree) [exact scan] |
| 6 | 48, 32 | 3124463/125523002 | 2.4892e-02 | 1.245 | 2.6427e-02 | dstar(24-24) + 2 K1 |
| 7 | 48, 32 | 876807784319/32877359849037 | 2.6669e-02 | 1.333 | 2.7685e-02 | dstar(21-21) + 8 K1 [exact scan] |
| 8..32 | 50, 33 | | | | | 50 K1 |
| L−1 = 16 | 26, 17 | (15-digit)/(16-digit) | 1.4533e-01 | 7.266 | | spider, legs 2^23 1^3 (a tree) |
| L−2 = 15 | 26, 17 | 1589186728919/12555922255250 | 1.2657e-01 | 6.328 | | spider, legs 2^23 1^3 (a tree) |

Forest WR minima: 3.957 (n = 20, r = 8), 5.524 (n = 30, r = 12), 8.838 (n = 50, r = 20) —
attained by trees (max degree 3–4, many pendant K2s), never by disconnected forests.

## 4. Comparison with the star at r = 2

In all nine (mode, n) configurations the best rho_2 found equals the star's value
*exactly* (JSON `star_comparison_r2`): rho_2(K_{1,m}) − 1 = 2(2m² + m + 1) /
((m+1) m (m−1)(m−2)), m = n − 1, i.e. 371/29070, 319/44850, 428/82215, 1541/548340,
3511/2925810, 9851/23527350 for n = 20, 26, 30, 40, 60, 100.

This is not a search artefact but a theorem for trees, and reduces to a
one-parameter check for forests:

* For a tree of order n, p_1 = n and p_2 = C(n,2) − (n−1) are the same for every tree,
  and p_3 = C(n,3) − (n−1)(n−2) + Σ_v C(d_v, 2) (inclusion–exclusion; a 3-set of a
  forest contains at most two edges, and two edges in a 3-set share a vertex).
  rho_2 = (2p_2² + p_1²)/(3 p_1 p_3) is therefore minimised by maximising the convex
  sum Σ C(d_v,2) under Σ d_v = 2(n−1), d_v >= 1 — uniquely by the star.  So the star
  is the exact minimiser of rho_2 over trees of every order n.
* For a forest with m edges, p_1 = n, p_2 = C(n,2) − m, p_3 = C(n,3) − m(n−2) + Σ C(d_v,2),
  and Σ C(d_v,2) <= C(m,2) with equality iff all edges share a vertex.  Hence the
  minimiser over forests of order n lies in {K_{1,m} ∪ (n−1−m) K_1 : 0 <= m <= n−1};
  scanning this whole family exactly (m = 0 .. n−1) the argmin is m = n − 1 for
  n = 20, 30, 50, 100 (next best m = n − 2 is worse by a factor ≈ 2).  So for these n
  the star is the exact minimiser of rho_2 over *all* forests of order n.

Consequently the star's r = 2 slack is the true floor at r = 2 and nothing "beats the
star's slack" there; at every other index the best value found is larger by a factor
of order n (Section 6).

## 5. Tightest structures per prefix index (what the search learned)

The extremal structures are strikingly simple and stable across n:

| index | tightest structure found (trees) | comment |
|---|---|---|
| r = 1 | any tree (rho_1 fixed by n); forests: edgeless | trivial |
| r = 2 | star K_{1,n−1} | provably optimal (Section 4) |
| r = 3 | K_{1,a} –v– K_{1,b}: a big star and a small star joined through one degree-2 vertex, small star with a ≈ 0.10–0.19 n leaves (a,b) = (2,15), (4,19), (5,22), (7,30), (11,46), (19,78) for n = 20..100 | beats the star by only 0.1–1.3 % of the excess |
| r = 4, 5 | the same with the two stars balanced (a,b) = (8,9), (11,12), (13,14), (18,19), (28,29), (48,49) | beats the star by 5–11 % of the excess at n = 100 |
| r = 6 (and 7 at n = 40) | balanced double star (two adjacent hubs) | |
| r = 7–9 (n = 60, 100) | three balanced stars joined through two degree-2 vertices (33-2-33-2-33) | |
| r = 10–13 (n = 60, 100) | triple star (three adjacent hubs, 33-35-33; at r = 13 unbalanced 25-51-25); at n = 60, r = 9 a mixed form 20-21-2-19 | |
| larger r (r >= 5, 7, 7, 8, 11, 14 for n = 20, 26, 30, 40, 60, 100) | the star again | its binomial tail C(n−1, r) |
| r = L(alpha) − 1, L − 2 | spider with almost all legs of length 2 (subdivided star), alpha ≈ n/2 | rho − 1 ≈ 0.08–0.28, far from tight |

Forests: r = 1 edgeless; r = 2 the star; r = 3 (and r = 4 for n <= 30) a star plus a few
isolated vertices (K_{1,15}+4K1, K_{1,23}+6K1, K_{1,39}+10K1); for r = 4–7 at n = 50 the
tree structures above, sometimes with 2–8 isolated vertices added; for larger r the
edgeless forest (binomial coefficients).  Forests are tighter than trees at r = 3 by
about 16 % of the excess (n = 20) shrinking to about 11 % (n = 50), never by an order
of magnitude, and never at r = 2.

Mechanism (heuristic, first order): for a double star S(a,b), p_k = C(a+b, k) +
C(a, k−1) + C(b, k−1), i.e. a binomial sequence with a relative boost of p_k that
*decreases* with k, which lowers Q_r = r p_r² + p_{r−1}² − (r+1) p_{r−1} p_{r+1} because
p_{r−1} is boosted more than p_r and p_{r+1}.  With a = b = m/2 the first-order effect
on rho_r − 1 is (3 − r)/(2^{r−1} m): zero at r = 3 (explaining why r = 3 needs the
extra subdivision vertex and an unbalanced split), negative for r >= 4 (explaining the
balanced double star at r = 4–6), and exponentially small for large r (explaining
why the star returns for large r).  The K_{1,a} –v– K_{1,b} and 3-hub variants push
the same mechanism one index further.

## 6. How close does the search get to rho = 1, and how does it scale with n?

Best (rho_r − 1) found, multiplied by n (trees; approximate decimals):

| r | n=20 | n=26 | n=30 | n=40 | n=60 | n=100 |
|---|---|---|---|---|---|---|
| 2: (rho−1)·n² | 5.105 | 4.808 | 4.685 | 4.496 | 4.320 | 4.187 |
| 2: (rho−1)·n | 0.255 | 0.185 | 0.156 | 0.112 | 0.072 | 0.042 |
| 3: (rho−1)·n | 1.458 | 1.316 | 1.262 | 1.183 | 1.114 | 1.065 |
| 4: (rho−1)·n | 1.646 | 1.391 | 1.298 | 1.165 | 1.053 | 0.975 |
| 5: (rho−1)·n | 1.905 | 1.545 | 1.416 | 1.240 | 1.095 | 0.998 |
| 6: (rho−1)·n | 2.198 | 1.773 | 1.597 | 1.363 | 1.177 | 1.056 |
| 7: (rho−1)·n | 2.564 | 1.977 | 1.779 | 1.497 | 1.254 | 1.095 |
| 8: (rho−1)·n | 3.030 | 2.209 | 1.948 | 1.613 | 1.313 | 1.124 |
| 9: (rho−1)·n | 3.636 | 2.485 | 2.143 | 1.720 | 1.386 | 1.164 |
| 10: (rho−1)·n | 4.444 | 2.817 | 2.368 | 1.839 | 1.464 | 1.207 |

Forests (n = 20, 30, 50): r = 2: 0.255, 0.156, 0.088 (·n; = 5.10, 4.69, 4.39 ·n²);
r = 3: 1.226, 1.057, 0.945; r = 4: 1.535, 1.264, 1.096; r = 5: 1.750, 1.416, 1.150.

Reading:

* r = 2: rho_2 − 1 = 4/n² + O(1/n³) exactly (the star formula above:
  2(2m²+m+1)/((m+1)m(m−1)(m−2)) with m = n−1); (rho−1)·n² decreases 5.10 → 4.19 and
  tends to 4.  This is the only index with second-order tightness.
* r >= 3: rho_r − 1 = Θ(1/n).  (rho−1)·n is still drifting slowly downwards at n = 100
  (the second-order terms are ≈ (r+1)/n of the leading one), the log-log slopes
  −1.19 (r = 3) … −1.76 (r = 10) fitted over n = 20..100 (JSON `scaling`) are
  transients of this drift, not different exponents.  The binomial/star baseline is
  1/(n−1−r) + r/((n−1−r)(n−r)) ≈ 1/n; the multi-hub optima go below 1/n (0.975/n at
  r = 4, 0.998/n at r = 5 for n = 100), and the first-order analysis of Section 5
  predicts the limit (rho_4 − 1)·n → 7/8 for the balanced double star.  Nothing
  suggests an approach to rho = 1 faster than c/n at any fixed r >= 3, let alone a
  crossing.
* r near L − 1 (moving index): rho − 1 stays between 0.08 and 0.28 for all n tested,
  attained by subdivided stars; (rho−1)·n *grows* (5.7 → 8.0), so the top of the prefix
  is the least tight region.
* WR: the normalised slack is >= 3.957 everywhere and grows roughly like n/6.

## 7. Validation of the search itself

* Exhaustive certification at n = 20 (`exhaustive_trees` in the JSON): all 823,065
  non-isomorphic trees enumerated with `tree_level_sequences`, 0 prefix violations of
  WR or ISO; the annealer's record equals the exact optimum at *every* key
  (r = 1..12, L−1, L−2) for rho, and at r = 1..6, 8, 10, 11, 12, L−1, L−2 for the WR
  slack (WR had one restart per size; it missed the exact WR minimum at r = 7 and 9 by
  2–3 %, irrelevant for tightness).
* Exact family scan vs annealer: at n <= 40 the annealer matched or beat the best of
  ~10⁴ scanned family members at every index (at r = 3, 4 it found the K_{1,a}–v–K_{1,b}
  structures before that family was added to the scan).  At n = 60 and n = 100 the
  main pass had not fully converged at r = 3, 4, 5, 7, 8, 9 (it stopped on the best
  seeded family member, 0.3–1 % above the later optimum); a supplementary pass seeded
  with the extended families converged exactly onto the family optima and found no
  non-family structure below them, except at n = 60, r = 9 where a mixed form
  (20-21-2-19) beats the best family member by 5·10⁻⁵ relative.  Four forest records
  (n = 30 r = 5; n = 50 r = 4, 5, 7) come from the exact scan rather than the
  annealer (its own values were 0.02–0.8 % higher).  The residual uncertainty for the
  n >= 60 tables is therefore "possibly a slightly better caterpillar of the same
  kind", not a different regime.
* Every recorded forest was recomputed from its edge list with
  `forest_indep.indep_poly_from_edges` (510/510 agree: 255 rho records + 255 WR records);
  the headline forest was also
  recomputed with the independent recurrence I(G) = I(G−v) + x I(G−N[v]) (agrees); the
  n = 20 optimum at r = 2 was additionally checked with `indep_poly_bruteforce` during
  development (agrees).

## 8. Anomalies / caveats

* None that affect the verdict.  No violation, no exactly-tight case, no record with a
  polynomial disagreement.
* The runs are time-boxed, so exact evaluation counts (and therefore the exact set of
  forests visited) depend on the machine; the seeds are deterministic and every
  extremal forest is stored explicitly, so every number in the tables can be
  re-derived from the JSON with `indep_poly_from_edges` alone.
* The `top`/`top1` targets let alpha float; their minimisers have alpha ≈ n/2
  (subdivided stars).  For a fixed alpha near n − 1 the top-of-prefix index is again
  covered by the star rows of the tables.
* WR records were a secondary objective (one restart per size); they are far from
  tight and were not pursued further.
* Total runtime 1749 s (main 1431 s, supplementary 294 s, certification 11 s,
  post-processing ≈ 13 s); 54.76 million annealer evaluations plus the scans.

## 9. Reproduction

    python3 adversarial_iso_search.py                       # main pass (~24 min)
    python3 adversarial_iso_search.py --phases tree:60,tree:100 \
        --targets r=3,r=4,r=5,r=7,r=8,r=9 --scale 0.6 --merge  # supplementary pass
    python3 adversarial_iso_search.py --exhaustive-trees 20  # exact n=20 certification,
                                                             # family merge, derived tables
    python3 adversarial_iso_search.py --scale 0.03           # 1-minute smoke test

The JSON has sections `headline`, `star_baseline_r2`, `star_comparison_r2`,
`rho_records`, `wr_records`, `family_scan`, `family_scan_merged_into_records`,
`scaling`, `exhaustive_trees`, `runs`, `log`.
