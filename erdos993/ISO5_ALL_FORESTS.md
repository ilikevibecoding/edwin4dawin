# ISO_5 for forests — Q_5 = 5p_5² + p_4² − 6p_4p_6 ≥ 0 — STATUS: PARTIAL

Script: `iso5_subgraph_expansion.py` (sha256 in `results/iso5.json`, ~90 s single core, exact
arithmetic only: ints / Fraction / sympy 1.14).  Every statement below marked PROVED is
either a complete proof in this file or an exact exhaustive computation performed by the
script; the script never prints `PASS_EXACT_ISO5_ALL_FORESTS` (the full statement is **not**
proved).  Marker printed by the script: `PASS_EXACT_ISO5_BASE_N_LE_20`.

Notation as in `ISO4_ALL_FORESTS.md`: n vertices, e edges, d_v degrees, Δ = max degree,
S = Σ C(d_v,2), T = Σ C(d_v,3), T4 = Σ C(d_v,4), T5 = Σ C(d_v,5),
W_v = Σ_{a∼v}(d_a−1), W2 = Σ_v W_v², e2_v = Σ_{{a,b}⊆N(v)} (d_a−1)(d_b−1),
P4 = Σ_{ab∈E}(d_a−1)(d_b−1) (3-edge paths), P5 = Σ_v e2_v (4-edge paths),
F = Σ_v C(d_v−1,2) W_v (forks), R = C(n,2) − e − S, μ = Σ_{d_v≥1}(d_v−1) = 2e − n′ = e − c′
(c′ = number of non-trivial components), and r = 5 is a prefix index iff α ≥ 9.

## 0. Summary

| item | status |
|---|---|
| Lemma A″ — p_6 by inclusion–exclusion over edge subsets with ≤ 6 vertices | **PROVED** (exact on all 15 205 forests n ≤ 14; every count cross-checked by brute force on the 637 forests n ≤ 10) |
| Closed forms of all 6-vertex statistics (degree/edge-local) | **PROVED** |
| Lemma B″ — exact sympy grouping of Q_5 | **PROVED** (symbolic identity + numeric on all forests n ≤ 14) |
| Lemma G″ — structural inequality toolbox (incl. P6 distance counting, tangent bounds for T4, T5) | **PROVED** |
| Lemma H″ — conditional lower bound Q_5 ≥ L(n,e,S,T,P4) | **PROVED** (under explicit side conditions) |
| Theorem D — Q_5 ≥ 0 (indeed Q_r ≥ 0 for all r) for every forest with Δ ≤ 2 | **PROVED** (via real-rootedness + Newton) |
| Exhaustive base — Q_5 ≥ 0 for every forest with n ≤ 20 | **PROVED** (3 269 193 forests, 0 negatives) |
| Sparse forests at scanned orders — Q_5 ≥ 0 for n ∈ {20,25,30,40,60} and e ≤ e_max(n) = 14, 18, 23, 32, 50 | **PROVED** (exact scan of L + Lemma H″) |
| Closing the analytic chain for all n (Bernstein certificate) | **NOT ACHIEVED** — EXPLORED: min L < 0 on the relaxed region for every n scanned; the 6-vertex-tree terms resist |
| ISO_5 for every forest | **PARTIAL** (n ≤ 20; Δ ≤ 2; sparse cases at scanned n) |

---

## 1. Lemma A″ (p_6 by inclusion–exclusion) — PROVED

For any graph, p_6 = Σ_{A⊆E} (−1)^{|A|} C(n − |V(A)|, 6 − |V(A)|) (expand Π_{uv∈E(U)}(1−1) over
6-subsets U).  In a forest every A is acyclic, so |V(A)| = |A| + c(A) and only |A| ≤ 5 contributes.
The acyclic edge-subgraphs with ≤ 6 vertices and their counts:

| \|A\| | \|V(A)\| | types (count symbol) | sign · factor |
|---|---|---|---|
| 1 | 2 | K_2 (e) | −C(n−2,4) |
| 2 | 3 | P_3 (S) | +C(n−3,3) |
| 2 | 4 | 2K_2 (M2) | +C(n−4,2) |
| 3 | 4 | K_{1,3} (T), P_4 (P4) | −C(n−4,2) |
| 3 | 5 | P_3 + K_2 (D31) | −(n−5) |
| 3 | 6 | 3K_2 (M3) | −1 |
| 4 | 5 | P_5 (P5), fork (F), K_{1,4} (T4) | +(n−5) |
| 4 | 6 | P_4 + K_2 (D41), K_{1,3} + K_2 (DTK), P_3 + P_3 (D33) | +1 |
| 5 | 6 | the six trees on 6 vertices: P_6 (P6), K_{1,5} (T5), double star S(2,2) (DS22, degrees 3,3,1,1,1,1), spider Y42 (degrees 4,2,1,1,1,1), caterpillar C322 (degrees 3,2,2,1,1,1, degree-3 vertex adjacent to two leaves), caterpillar C232 (degrees 3,2,2,1,1,1, degree-3 vertex adjacent to one leaf) | −1 |

    p_6 = C(n,6) − e·C(n−2,4) + S·C(n−3,3) + M2·C(n−4,2) − (T+P4)·C(n−4,2) − D31·(n−5) − M3
          + (P5+F+T4)·(n−5) + D41 + DTK + D33 − Z,      Z := P6 + T5 + DS22 + Y42 + C322 + C232.

(Lemma A / A′ for p_4, p_5 are re-verified by the same script.)  The formula is asserted
against the core polynomials on **every forest n ≤ 14** (15 205 forests); on the 637 forests
n ≤ 10 every one of the 18 counts (and C322 vs C232 separately) is compared with a
brute-force enumeration of all edge subsets with ≤ 5 edges and ≤ 6 vertices, classified by
component degree sequences (which separates all types except C322/C232, separated by a
second brute-force test), p_4, p_5, p_6 are compared with brute-force independent-set
counts, and the BFS distance counts dist_1..dist_5 are compared with e, S, P4, P5, P6.

### Closed forms — PROVED

Disconnected patterns (pairs of edge-disjoint subgraphs minus the vertex-sharing cases):

    M2  = C(e,2) − S                                   M3  = C(e,3) − S(e−2) + P4 + 2T
    D31 = S(e−2) − 2P4 − 3T                            D41 = P4(e−3) − 2P5 − 2F
    DTK = T(e−3) − 4T4 − F                             D33 = C(S,2) − 3T − P4 − 3T4 − F − P5

Proofs. D41: (P_4, edge) pairs with the edge outside the path: P4(e−3); subtract the edge
attached at an end (each P_5 arises twice) or at an inner vertex (each fork contains exactly
two P_4's whose complement edge hangs at an inner vertex).  DTK: T(e−3) minus the edge at the
centre (each K_{1,4} contains 4 claws) or at a leaf (each fork contains exactly one claw).
D33: unordered pairs of P_3's minus the pairs sharing an edge (union K_{1,3}: 3 per claw;
union P_4: 1 per P_4) or exactly a vertex (union K_{1,4}: 3 pairs of edge-disjoint P_3's per
K_{1,4}; union fork: 1; union P_5: 1).  M3 = C(e,3) − #(three edges, some two adjacent):
C(e,3) − [S(e−2) − (#triples with two adjacencies counted twice)], where triples containing two
adjacent pairs are claws (3 pairs each) and P_4's (2 pairs each).

6-vertex trees (all degree/edge-local; no coincidences are possible in a forest because a
coincidence would close a cycle):

    P6   = Σ_{cd∈E} (W_c − d_d + 1)(W_d − d_c + 1)     (unique middle edge cd; 2-step extensions avoiding the other end)
    T5   = Σ_v C(d_v,5)
    DS22 = Σ_{ab∈E} C(d_a−1,2)·C(d_b−1,2)
    Y42  = Σ_v C(d_v−1,3)·W_v                          (centre v, one extended neighbour, three further leaves)
    C322 = Σ_v C(d_v−1,2)·Σ_{c∼v}(W_c − d_v + 1)      (v with two leaves, spine v−c−x−y)
    C232 = Σ_v (d_v−2)·e2_v                            (spine a−v−b extended at both ends, one more leaf at v)

Also verified on every forest n ≤ 14: Σ_v W_v = 2S, W2 = 2P5 + 6T + 2S, 2F = Σ_{vc∈E}
(d_v−1)(d_c−1)(d_v+d_c−4).

---

## 2. Lemma B″ (exact grouping of Q_5) — PROVED

With p_4 = A4 − T − P4, A4 = C(n,4) − e·C(n−2,2) + (n−3)S + C(e,2) − S, sympy gives (identity
asserted, 24 monomials in (T,P4,T4,P5,F,Z)):

    Q_5 = Φ0(n,e,S) + cT·T + cP·P4 + quadTP(T,P4)
          + cP5_eff·P5 + cF_eff·F + cT4_eff·T4 + 5(P5 + F + T4)² + 6·p_4·Z,

    quadTP  = (6e + 2n² − 25n + 48)T² + 2(6e + 2n² − 23n + 37)T·P4 + (6e + 2n² − 21n + 31)P4²
    cP5_eff = cP5 − 2(2n−11)T − 4(n−3)P4
    cF_eff  = cF  − 4(n−4)T  − 2(2n−3)P4
    cT4_eff = cT4 − 2(2n+1)T − 4(n+3)P4
    coefficient of Z (= all six 6-vertex-tree counts) is exactly +6p_4 = 6(A4 − T − P4).

    Φ0 = S³(12 − 3n)
       + S²(7e²/2 + 5en²/2 − 45en/2 + 69e/2 + n⁴/8 − 11n³/4 + 119n²/8 − 33n/4 − 44)
       + S(−e³n − 2e³ − 5e²n³/6 + 25e²n²/2 − 125e²n/3 + 103e²/2 + en⁵/12 − 5en⁴/3 + 161en³/12
           − 214en²/3 + 377en/2 − 365e/2 − n⁷/120 + 29n⁶/120 − 65n⁵/24 + 185n⁴/12 − 1321n³/30
           + 6941n²/120 − 107n/4)
       + e⁵/2 − 3e⁴n/4 + e⁴/4 + e³n⁴/12 − 5e³n³/3 + 131e³n²/12 − 161e³n/6 + 23e³
       − e²n⁶/90 + 7e²n⁵/24 − 167e²n⁴/72 + 215e²n³/24 − 7801e²n²/360 + 34e²n − 99e²/4
       + en⁸/1440 − en⁷/36 + 221en⁶/720 − 125en⁵/72 + 8509en⁴/1440 − 863en³/72 + 767en²/60 − 21en/4
       + n⁹/2880 − 11n⁸/2880 + 23n⁷/1440 − 43n⁶/1440 + 49n⁵/2880 + 61n⁴/2880 − n³/30 + n²/80
    cT  = 3S² − 2Sen − 10Se − Sn³ + 8Sn² + 27Sn − 139S − 4e³ + e²n² + 4e²n + 12e² − en⁴/3 + 25en³/3
          − 269en²/3 + 908en/3 − 328e + n⁶/20 − 4n⁵/3 + 51n⁴/4 − 143n³/3 + 361n²/5 − 36n
    cP  = 3S² − 2Sen − Sn³ + 9Sn² − 67S − 4e³ + e²n² + 2e²n + 8e² − en⁴/3 + 7en³ − 197en²/3 + 210en
          − 220e + n⁶/20 − 7n⁵/6 + 121n⁴/12 − 215n³/6 + 793n²/15 − 26n
    cT4 = −10Se − Sn² + 51Sn − 168S + 2e²n + 16e² + 4en³/3 − 36en² + 458en/3 − 192e − n⁵/6 + 11n⁴/3
          − 107n³/6 + 91n²/3 − 16n
    cP5 = −10Se − Sn² + 27Sn − 72S + 2e²n + 4e² + 4en³/3 − 24en² + 278en/3 − 108e − n⁵/6 + 8n⁴/3
          − 71n³/6 + 58n²/3 − 10n
    cF  = −10Se − Sn² + 33Sn − 96S + 2e²n + 7e² + 4en³/3 − 27en² + 323en/3 − 129e − n⁵/6 + 35n⁴/12
          − 40n³/3 + 265n²/12 − 23n/2

Closed forms (sympy): Q_5(edgeless) = Φ0(n,0,0) = n²(n−1)²(n−2)²(n−3)²(n+1)/2880 = C(n,4)²(n+1)/5,
Q_5(K_{1,m}) = m²(m−1)²(m−2)²(m−3)²(m+1)/2880 = Q_5(edgeless on m vertices).  The full
expansion of Q_5 and every coefficient are stored as strings in `results/iso5.json`
(`identities`).  Lemma B″ is evaluated numerically on every forest n ≤ 14 against Q_5 from
the core polynomials.

---

## 3. Lemma G″ (structural inequalities, every forest) — PROVED

Each item is a complete proof; each is also asserted on every forest n ≤ 14.

1. **Distance counting.**  e + S + P4 + P5 + P6 ≤ C(n,2): in a forest the k-edge paths are
   exactly the vertex pairs at distance k (unique paths), and the distance classes are disjoint.
   Hence P5 ≤ R − P4 and P4 ≤ R.
2. **P4 ≤ S + 3T.**  Per edge, (d_a−1)(d_b−1) ≤ [(d_a−1)² + (d_b−1)²]/2; summing,
   P4 ≤ ½Σ_v d_v(d_v−1)² = Σ_v C(d_v,2)(d_v−1) = S + 3T.
3. **F ≤ (e−3)P4/2** for e ≥ 3 (ISO4 Lemma G2: per edge vc, d_v + d_c − 4 ≤ e − 3).
4. **T4 ≤ (Δ−3)T/4**, **C(Δ,2) ≤ S**, **Δ ≤ Δ_t(S,e) := ½ + (1 + 8S + (2e−1)²)/(4(2e−1)) = (2S + e²)/(2e−1)**
   (tangent bound √x ≤ (x + y²)/(2y), y = 2e−1; ISO4 Lemma G4).
5. **T ≤ Tup := (Δ_t − 2)S/3**: T = Σ C(d_v,2)(d_v−2)/3 ≤ (Δ−2)S/3 ≤ (Δ_t−2)S/3.
6. **T ≥ Tmin := 2S(S−e+1)/(3(e−1))** for e ≥ 2 (Cauchy–Schwarz on w_v = d_v − 1, ISO4 Lemma G5).
7. **p_4 ≥ p4lo := A4 − R − Tup**, from p_4 = A4 − T − P4 with items 1 and 5.
8. **Tangent bounds for T4 and T5.**  Put d* := 2S/(e−1) and D := Δ_t.  Solving the linear
   system (unique, sympy) for α, β, γ in

       C(d,4) − α(d−1) − βC(d,2) − γC(d,3) = (d−1)(d−d*)²(d−D)/24,
       C(d,5) − α′(d−1) − β′C(d,2) − γ′C(d,3) = (d−1)(d−d*)²(d + d* − 9/2)²/120

   gives α = d*²D/24, β = D/6 − Dd*/6 − d*²/12 + d*/3 − 1/3, γ = D/4 + d*/2 − 5/4,
   α′ = −d*²(d* − 9/2)²/120, β′ = −d*²/12 + 3d*/8 − 5/24, γ′ = d*²/10 − 9d*/20 + 23/80.
   For every non-isolated vertex 1 ≤ d_v ≤ Δ ≤ D, so the first remainder is ≤ 0 and the second
   is ≥ 0.  Summing over the non-isolated vertices (Σ(d_v−1) = μ ∈ [0, e−1], α ≥ 0, α′ ≤ 0):

       T4 ≤ T4up := α(e−1) + βS + γT,        T5 ≥ T5lo := α′(e−1) + β′S + γ′T,

   both exact at stars (d* = D = m, and the star has only one non-isolated vertex with d ≥ 2).
   Explicit rational forms (denominators 4(e−1)²(2e−1) and (e−1)⁴) are in the JSON.

---

## 4. Lemma H″ (conditional lower bound) — PROVED

Let e ≥ 2 (for e = 2 one has F = P4 = 0, so the F-step is void), and suppose at (n,e,S) the
**side conditions** hold:

    (SC1) cP5(n,e,S) ≤ 0,   (SC2) cF(n,e,S) ≤ 0,   (SC3) p4lo(n,e,S) ≥ 0,
    (SC4) 10·T4up(n,e,S,T) + cT4(n,e,S) ≤ 0   for T ∈ {Tmin, Tup} (T4up is affine in T).

Then for every forest with these (n,e,S) and any T, P4,

    Q_5 ≥ L(n,e,S,T,P4) := Φ0 + cT·T + cP·P4 + quadTP + cP5_eff·(R − P4) + cF_eff·(e−3)P4/2
                           + 5·T4up² + cT4_eff·T4up + 6·p4lo·T5lo.

Proof.  In Lemma B″: cP5_eff ≤ cP5 ≤ 0 and P5 ≤ R − P4 (G1); cF_eff ≤ cF ≤ 0 and
F ≤ (e−3)P4/2 (G3); 5(P5+F+T4)² ≥ 5T4²; x ↦ 5x² + cT4_eff·x is decreasing on [0, T4up]
because 10·T4up + cT4_eff ≤ 10·T4up + cT4 ≤ 0, and 0 ≤ T4 ≤ T4up (G8); finally
6p_4Z ≥ 6p_4T5 ≥ 6·p4lo·T5lo, using Z ≥ T5 ≥ T5lo, p_4 ≥ p4lo ≥ 0 (if T5lo < 0 the last
inequality is trivial since 6p_4Z ≥ 0 ≥ 6·p4lo·T5lo).  ∎

L is a quadratic in (T, P4) with coefficients rational in (n,e,S), denominator
48(e−1)⁴(2e−1)² (numerator: 647 terms, stored in the JSON).  L(K_{1,m}) = Q_5(K_{1,m})
exactly (sympy).  Numerically: Q_5 ≥ L on the 1 010 small forests (n ≤ 14) where the side
conditions hold, and on 183 larger trees (n ∈ {25,30,40}: 40 deterministic Prüfer trees per n
from a fixed LCG, all spiders, the path) — every side condition held there, minimal relative
slack 0 (stars).

**Consequence (PROVED for the scanned orders).**  Minimising L exactly over the relaxed region
T ∈ [Tmin, Tup], P4 ∈ [0, R] (exact rational quadratic minimisation on the rectangle) for every
integer pair (e, S), 2 ≤ e < n, 0 ≤ S ≤ C(e,2), and checking the side conditions:

| n | points (e,S) | e_max(n): L ≥ 0 and side conditions for all e ≤ e_max | first open e | global min of L (at e = n−1) |
|---|---|---|---|---|
| 20 | 1 158 | 14 | 15 | −5.3·10⁷ (S=81) |
| 25 | 2 323 | 18 | 19 | −4.6·10⁸ (S=153) |
| 30 | 4 088 | 23 | 24 | −2.7·10⁹ (S=240) |
| 40 | 9 918 | 32 | 33 | −4.1·10¹⁰ (S=466) |
| 60 | 34 278 | 50 | 51 | −1.8·10¹² (S=1125) |

Hence **Q_5 ≥ 0 for every forest of order n ∈ {20, 25, 30, 40, 60} with at most e_max(n) edges**
(this is rigorous: every such forest has (T,P4) inside the rectangle and satisfies Lemma H″).
The pattern e_max(n) ≈ 5n/6 (forests with at least ≈ n/6 components) is suggestive but is
**not** a theorem for other n (no certificate in n was attempted because L < 0 for trees).

---

## 5. Theorem D (Δ ≤ 2) — PROVED

For a linear forest (Δ ≤ 2) the independence polynomial is real-rooted: I(P_k; x) has
coefficients C(k−j+1, j), i.e. it is the matching generating polynomial of P_{k+1}, real-rooted
by Heilmann–Lieb, and a product of real-rooted polynomials is real-rooted.  Newton's
inequalities for a real-rooted polynomial with non-negative coefficients (all roots negative)
give, for 1 ≤ r ≤ α−1,

    p_r² ≥ p_{r−1}p_{r+1} · (r+1)(α−r+1)/(r(α−r)) ≥ p_{r−1}p_{r+1}·(r+1)/r,

so r·p_r² ≥ (r+1)p_{r−1}p_{r+1} and Q_r = r p_r² + p_{r−1}² − (r+1)p_{r−1}p_{r+1} ≥ p_{r−1}² ≥ 0;
for r ≥ α the term p_{r+1} vanishes.  In particular Q_5 ≥ 0 for every forest with Δ ≤ 2 (and the
same argument gives ISO_r for every r on claw-free graphs via Chudnovsky–Seymour; not needed
here).  (The 507 forests with Δ ≤ 2 and n ≤ 14 are among the exhaustively checked ones.)

---

## 6. Exhaustive base — PROVED: Q_5 ≥ 0 for every forest with n ≤ 20

3 269 193 non-isomorphic forests (3 258 430 of them prefix forests, α ≥ 9; for n ≥ 17 every
forest has α ≥ ⌈n/2⌉ ≥ 9), exact integer Q_5 from the core polynomials, **0 negatives**
(~17 s after the 48 s tree-polynomial precomputation).  Extremal data (ratio := (5p_5² + p_4²)/(6p_4p_6)):

| n | forests | prefix | min Q_5 (all forests) — argmin | min Q_5 / (n⁹/2880) | min Q_5 among prefix forests — argmin | min ratio (prefix) — argmin |
|---|---|---|---|---|---|---|
| 9 | 153 | 1 | 230 — P_9 | 0.0017 | 31 752 — edgeless | 3/2 — edgeless |
| 10 | 329 | 10 | 1 405 — P_10 | 0.0040 | 31 501 — K_{1,6} + 3K_1 | 41/30 — edgeless |
| 11 | 710 | 67 | 6 685 — P_11 | 0.0082 | 32 340 — two degree-5 hubs joined through a degree-2 vertex (5,5,2,1⁸) | 9/7 — edgeless |
| 12 | 1 601 | 361 | 26 264 — P_12 | 0.0147 | 50 369 — tree, degrees (4,4,3,2,2,1⁷) | 69/56 — edgeless |
| 13 | 3 658 | 1 604 | 88 200 — P_13 | 0.0240 | 103 805 — tree (3,3,3,3,2,2,2,1⁶) | 43/36 — edgeless |
| 14 | 8 599 | 5 892 | 260 100 — P_14 | 0.0363 | 275 140 — tree (3,3,3,2⁶,1⁵) | 7/6 — edgeless |
| 15 | 20 514 | 18 117 | 688 545 — P_15 | 0.0516 | 692 824 — tree (3,3,2⁹,1⁴) | 63/55 — edgeless |
| 16 | 49 905 | 48 809 | 1 633 599 — tree (3⁵,2⁴,1⁷) | 0.0685 | same | 149/132 — edgeless |
| 17 | 122 963 | 122 963 | 3 557 041 — tree (4,3⁴,2⁴,1⁸) | 0.0864 | same | 29/26 — edgeless |
| 18 | 307 199 | 307 199 | 7 172 133 — tree (5,4,4,4,2³,1¹¹) | 0.1041 | same | 201/182 — edgeless |
| 19 | 775 529 | 775 529 | 13 707 904 — tree (5,5,4,4,2³,1¹²) | 0.1223 | same | 23/21 — edgeless |
| 20 | 1 977 878 | 1 977 878 | 24 964 848 — tree (5,5,5,4,2³,1¹³) | 0.1404 | same | 87/80 — edgeless |

Level sequences of all argmins are in the JSON (`extremal.per_n`).  Observations:
* For 9 ≤ n ≤ 15 the absolute minimiser of Q_5 is the path (Q_5(P_n) has vanishing n¹⁰ term);
  from n = 16 on it is a tree with a few hubs of degree 3–5 carrying leaves, joined through
  degree-2 vertices (n = 20: four hubs of degrees 5,5,5,4, each with three leaves).  The
  minimum grows like ≈ 0.14·n⁹/2880 at n = 20 and the relative minimum is increasing.
* The ratio minimiser among prefix forests is the **edgeless** forest for every 9 ≤ n ≤ 20:
  ratio(edgeless) = 1 + (n+1)/((n−4)(n−5)) → 1⁺ (1.5, 1.367, 1.286, …, 1.0875 at n = 20).
  Adding edges increases the ratio at every order checked.
* min Q_5 = 0 for n ≤ 6 (forests with p_4 = p_5 = 0), min Q_5 = 1 at n = 7 and 25 at n = 8;
  Q_5 ≥ 1 for every forest with 7 ≤ n ≤ 20.

---

## 7. Why the chain does not close — EXPLORED

At trees (e = n−1) the relaxed minimum of L is negative for every n scanned, at hub-like
(S ≈ ⅓C(n−1,2), T = Tup, P4 ≈ R) points.  Exact loss decomposition Q_5 − L on spiders at n = 30
(hub of degree h, ℓ legs of length 2, the rest leaves), in units of n⁹/2880 (Q_5 itself is
≈ 0.49–0.50 in these units):

| (h, ℓ) | Q_5 | L | P5→R−P4 | F→(e−3)P4/2 | T4→T4up | 5Y²→5T4² | 6p_4(Z−T5) | 6p_4(T5−T5lo) |
|---|---|---|---|---|---|---|---|---|
| (29, 0) star | 0.495 | 0.495 | 0 | 0 | 0 | 0 | 0 | 0 |
| (25, 4) | 0.501 | −0.194 | 0 | 0.040 | 0.300 | 0.021 | 0.162 | 0.169 |
| (21, 8) | 0.493 | −0.228 | 0 | 0.144 | 0.248 | 0.015 | 0.178 | 0.132 |
| (15, 14) | 0.490 | −0.057 | 0 | 0.307 | 0.097 | 0.004 | 0.106 | 0.033 |

Resisting terms, in order: (i) **6p_4·(Z − T5)** — the five non-star 6-vertex trees (P6, DS22,
Y42, C322, C232) enter with the *same* positive coefficient 6p_4 ≈ 6C(n,4) as T5 and are of order
n⁵ for hub-like trees, i.e. they contribute at the leading order n⁹; they are not functions of
(e,S,T,P4) and the chain simply drops them; (ii) **T4 → T4up** — the tangent slack
(d−1)(d−d*)²(D−d)/24 is large at the many degree-2 vertices, and cT4_eff ≈ −n⁵/6 multiplies it;
(iii) **F ≤ (e−3)P4/2** is off by a factor up to 2 for spiders (F = (h−1)(h−2)ℓ/2 versus
(e−3)P4/2 = (h+ℓ−3)(h−1)ℓ/2);
(iv) **T5 → T5lo** (same tangent slack mechanism).  The distance-counting step P5 ≤ R − P4 is
tight for spiders.  For paths the losses are P5 → R − P4 (0.08) and F (0.08) only, and L > 0.

What a proof along these lines would need: lower bounds for Z − T5 = P6 + DS22 + Y42 + C322 +
C232 in terms of (S, T, P4, P5, F, W2, …) that are exact at stars *and* at spiders, plus a
T4 bound with double contact at both d = 2 and d = Δ (a cubic tangent with contact at two points
cannot be exact at both; a per-edge rather than per-vertex bound seems required), and a
two-variable treatment of (T, P4) (the corner T = Tup, P4 = R of the rectangle is far from any
forest: hub-like trees have P4 ≈ S·(ℓ/h)·…, and P4 ≤ S + 3T is not enough).  A Bernstein
certificate was therefore not attempted: the reduced bound is genuinely negative, not merely
uncertified.

---

## 8. Verification counts, runtime, files

* Lemma A/A′/A″ formulas vs core polynomials: all 15 205 forests n ≤ 14 (also the 183 larger trees).
* Brute-force cross-checks: 637 forests n ≤ 10 (18 subgraph counts, C322/C232, p_4/p_5/p_6 by
  independent-set enumeration, BFS distance classes 1..5).
* Lemma B″: sympy identity + 15 205 numeric evaluations.
* Lemma G″: every inequality (incl. Δ ≤ Δ_t, T ≤ Tup, T ≥ Tmin, μ ≤ e−1, T4 ≤ T4up, T5 ≥ T5lo,
  p_4 ≥ p4lo, P4 + P5 + P6 ≤ R, P4 ≤ S + 3T, 2F ≤ (e−3)P4, 4T4 ≤ (Δ−3)T, C(Δ,2) ≤ S) on all
  15 178 forests n ≤ 14 with e ≥ 2 (tangent bounds also on the 183 larger trees).
* Lemma H″: Q_5 ≥ L on 1 010 small forests + 183 larger trees where the side conditions hold.
* Region scans: 51 765 (e,S) points over n ∈ {20,25,30,40,60}, exact rational minimisation.
* Exhaustive base: 3 269 193 forests n ≤ 20, 0 negatives.
* Runtime: 88 s total (48 s tree polynomials to n = 20, 17 s exhaustive base, 20 s scans).
* Files: `iso5_subgraph_expansion.py`, `ISO5_ALL_FORESTS.md`, `results/iso5.json`
  (script sha256, all counts, identities as strings, status per item, extremal forests,
  loss decomposition, scan data).  No existing file was modified.

Anomalies: none (no negative Q_5, no failed assertion).  The only surprise worth recording is
that the ratio minimiser among prefix forests is the edgeless forest at every order 9 ≤ n ≤ 20.
