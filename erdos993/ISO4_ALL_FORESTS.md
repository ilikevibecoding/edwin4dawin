# ISO_4 for every forest — exact statement, proof, verification

Erdős Problem #993 toolkit (`/workspace/erdos993`).  Everything below is exact
(integers, `Fraction`, sympy rationals).  The verification script is

* `iso4_subgraph_expansion.py` — marker `PASS_EXACT_ISO4_ALL_FORESTS`
  (printed only if every sympy identity, every Bernstein certificate, every
  integer-scan assertion and every per-forest assertion holds),

and it writes its record (with its own sha256, all counts, all identities as
strings, and a PROVED/EXPLORED status per item) to `results/iso4.json`.
Companion documents: `ISO2_ALL_FORESTS_THEOREM.md` (ISO_2, ISO_3, Lemma A).

**Status summary.**

| item | status |
|---|---|
| Lemma A′: exact inclusion–exclusion formula for p_5 | **PROVED** (derivation §1; exact on all 85 624 forests n ≤ 16; brute-force independent 5-sets on the 637 forests n ≤ 10) |
| Lemma F: closed forms D31 = S(e−2) − 2P4 − 3T, P5 = W2/2 − 3T − S, F = Σ_v C(d_v−1,2) W_v | **PROVED** (derivation §2; brute-force subgraph enumeration on the 308 forests n ≤ 9; identities on all forests n ≤ 16) |
| Lemma B′: Q_4 = Φ0 + cT·T + cP·P4 + 4(T+P4)² − 5p_3(T4+P5+F) | **PROVED** (sympy identity; checked numerically on all forests n ≤ 16) |
| Lemma G: six structural inequalities for forests | **PROVED** (proofs §4; checked on all forests n ≤ 16) |
| Lemma H: Q_4 ≥ L_I(n,e,S) or Q_4 ≥ L0(n,e,S) under explicit side conditions | **PROVED** (chain §5; checked on 170 783 (forest, Δ-variant) instances n ≤ 16) |
| Lemma I: the bounds and side conditions are positive for all n ≥ 15, 2 ≤ e ≤ n−1, 0 ≤ S ≤ C(e,2) | **PROVED** (exact integer scan 15 ≤ n ≤ 17; exact Bernstein certificates for real n ≥ 18) |
| **Theorem 3: ISO_4, i.e. Q_4 = 4p_4² + p_3² − 5p_3p_5 ≥ 0, for every forest, with equality iff p_3 = 0** | **PROVED** (n ≤ 14 exhaustive, 15 205 forests; n ≥ 15 by Lemmas H, I and the closed forms for e ∈ {0,1}) |
| Corollary: ISO_4 on the prefix (α ≥ 7), ratio (4p_4²+p_3²)/(5p_3p_5) > 1 | **PROVED** |
| Identity of the Q_4 minimizers and ratio minimizers for all n | **EXPLORED ONLY** (data n ≤ 18 and family comparison, §8) |

No PARTIAL item remains: the full statement closes.

---

## 0. Conventions

* F is a forest, n = |V| ≥ 1, e = |E| ≤ n−1 edges, degrees d_v, maximum degree Δ,
  independence number α.  p_k = number of independent k-sets, **p_k := 0 for k > α**.
* Q_r := r p_r² + p_{r−1}² − (r+1) p_{r−1} p_{r+1};  ISO_r means Q_r ≥ 0.
  L(α) = ⌈(2α−1)/3⌉, the prefix is 1 ≤ r ≤ L(α)−1; r = 4 is a prefix index iff α ≥ 7
  (asserted per forest in the script via `L_cutoff`).
* Subgraph statistics (all computed from the edge list; "subgraph" = not necessarily induced):
  * S  = Σ_v C(d_v,2) — pairs of edges sharing a vertex = vertex pairs at distance 2,
  * M2 = C(e,2) − S — pairs of disjoint edges,
  * T  = Σ_v C(d_v,3) — claws K_{1,3};  T4 = Σ_v C(d_v,4) — stars K_{1,4},
  * P4 = Σ_{vw∈E} (d_v−1)(d_w−1) — 3-edge paths = vertex pairs at distance 3,
  * P5 — 4-edge paths = vertex pairs at distance 4,
  * F  — forks: trees with degree sequence (3,2,1,1,1) (a P_4 with a pendant edge at an inner vertex),
  * D31 — vertex-disjoint pairs {P_3, K_2} of subgraphs,
  * W_v = Σ_{a∼v} (d_a − 1),  W2 = Σ_v W_v²,
  * R  = C(n,2) − e − S — vertex pairs at distance ≥ 3 or in different components (R ≥ 0).
* Binomials are the polynomials C(x,k) = x(x−1)···(x−k+1)/k!.
* p_3 = C(n,3) − e(n−2) + S and p_4 = C(n,4) − e·C(n−2,2) + (n−3)S + M2 − P4 − T (Lemma A of the ISO_3 work).

---

## 1. Lemma A′ (counting independent 5-sets)

For every forest,

    p_5 = C(n,5) − e·C(n−2,3) + S·C(n−3,2) + M2·(n−4) − (P4 + T)(n−4) − D31 + (P5 + F + T4).

*Proof.*  p_5 = Σ_{A⊆E} (−1)^{|A|} C(n − |V(A)|, 5 − |V(A)|) (inclusion–exclusion
over edge sets A; the term is 0 when |V(A)| > 5).  A forest with |A| edges and
|V(A)| covered vertices has |V(A)| = |A| + (number of components of A) ≥ |A| + 1.

* |A| = 0: C(n,5).   |A| = 1: −e·C(n−2,3).
* |A| = 2: two edges sharing a vertex (S of them, |V(A)| = 3, factor C(n−3,2)) or
  disjoint (M2 of them, |V(A)| = 4, factor n−4).  Sign +.
* |A| = 3, |V(A)| ≤ 5: acyclic 3-edge graphs on 4 vertices are K_{1,3} (T of them) and
  P_4 (P4 of them), factor n−4; on 5 vertices the only acyclic 3-edge graph is
  P_3 ∪ K_2 (D31 of them), factor 1; 3K_2 needs 6 vertices.  Sign −.
* |A| = 4, |V(A)| ≤ 5: forces |V(A)| = 5 and A connected, i.e. a spanning tree of 5
  vertices: P_5 (P5), the fork (F) or K_{1,4} (T4), factor C(n−5,0) = 1.  Sign +.
* |A| ≥ 5 covers ≥ 6 vertices: no contribution.  ∎

Verified exactly against the core library's polynomials for all 85 624
non-isomorphic forests with n ≤ 16 (statistics from the concatenated edge
lists), and against brute-force enumeration of independent 5-sets (bitmasks)
for the 637 forests with n ≤ 10.

---

## 2. Lemma F (closed forms of the 5-vertex statistics)

For every forest,

    D31 = S(e−2) − 2P4 − 3T,
    P5  = Σ_v Σ_{{a,b}⊆N(v)} (d_a−1)(d_b−1) = Σ_v [W_v² − Σ_{a∼v}(d_a−1)²]/2 = W2/2 − 3T − S,
    F   = Σ_v C(d_v−1,2) · W_v = Σ_{vc∈E} (d_v−1)(d_c−1)(d_v+d_c−4)/2.

*Proof.*  **D31.** Fix a P_3 with centre v and ends a, b (S choices).  The edges
meeting {v,a,b} are d_v + d_a + d_b − 2 in number (va, vb counted twice), so the
edges disjoint from it number e − d_v − d_a − d_b + 2.  Summing, D31 = S(e+2) −
Σ_v C(d_v,2) d_v − Σ_v Σ_{a∼v} (d_v−1) d_a.  The first sum is 3T + 2S (identity
d·C(d,2) = 3C(d,3) + 2C(d,2)); the second, grouped per edge va, is Σ_{va∈E}
[(d_v−1)d_a + (d_a−1)d_v] = Σ_{va∈E} [2(d_v−1)(d_a−1) + d_v + d_a − 2] = 2P4 + Σ_v d_v² − 2e
= 2P4 + 2S.  Hence D31 = S(e+2) − 3T − 2S − 2P4 − 2S.

**P5.** A 4-edge path has a unique middle vertex v; choose two neighbours a, b of v
and extend at each end by a further edge: (d_a−1)(d_b−1) choices, and the two new
vertices are distinct from each other and from {v,a,b} because a coincidence would
close a cycle.  Σ_{{a,b}} (d_a−1)(d_b−1) = [W_v² − Σ_{a∼v}(d_a−1)²]/2, and
Σ_v Σ_{a∼v}(d_a−1)² = Σ_a d_a(d_a−1)² = Σ_a [6C(d_a,3) + 2C(d_a,2)] = 6T + 2S.

**F.** A fork has a unique vertex v of degree 3; choose the neighbour c that is
extended (and one of its d_c−1 further neighbours) and two more neighbours of v
(C(d_v−1,2) choices); again no coincidences are possible in a forest.  Grouping
per edge vc gives C(d_v−1,2)(d_c−1) + C(d_c−1,2)(d_v−1) = (d_v−1)(d_c−1)(d_v+d_c−4)/2.  ∎

All identities used are sympy-checked; both expressions for P5 and for F are
compared on every forest n ≤ 16, and D31, P4, T, P5, F, T4 are compared with a
brute-force enumeration of 3- and 4-edge subsets (plus BFS distance counts
dist_1 = e, dist_2 = S, dist_3 = P4, dist_4 = P5) on all 308 forests n ≤ 9.

---

## 3. Lemma B′ (exact expansion of Q_4)

Substituting Lemma A, A′ and F into Q_4 = 4p_4² + p_3² − 5p_3p_5 and eliminating
M2 = C(e,2) − S and D31 = S(e−2) − 2P4 − 3T (sympy, `Q4_grouped_identity`):

    Q_4 = Φ0(n,e,S) + cT(n,e,S)·T + cP(n,e,S)·P4 + 4(T + P4)² − 5 p_3 (T4 + P5 + F),

with

    Φ0 = S²(5e + 3n²/2 − 19n/2 + 5)
       + S(−7e²n/2 + 4e² + en³/6 − 3en²/2 + 125en/6 − 34e − n⁵/8 + 25n⁴/12 − 277n³/24 + 263n²/12 − 37n/3)
       + A(n,e),
    144·A(n,e) = 144e⁴ + 72e³n² − 720e³n + 864e³ − 12e²n⁴ + 156e²n³ − 456e²n² + 960e²n − 1008e²
               + 2en⁶ − 48en⁵ + 290en⁴ − 828en³ + 1112en² − 528en + n⁷ − 5n⁶ + 7n⁵ + n⁴ − 8n³ + 4n²,
    cT = −(3n+3)S − 4e² − en² + 25en − 42e + n⁴/2 − 19n³/3 + 31n²/2 − 29n/3,
    cP = E(n,e) − (3n−2)S,   E = (n⁴ − 11n³ + 26n² − 16n − 8e² − 2en² + 40en − 64e)/2.

The coefficients of T4, P5 and F are all exactly −5p_3, and the quadratic part is
exactly 4T² + 8T·P4 + 4P4².  Closed forms (sympy):
A(n,0) = n²(n−1)²(n−2)²(n+1)/144 (edgeless forest), A(n,1) = n(n−1)(n−2)²(n−3)²(n+8)/144
(one edge), Q_4(K_{1,m}) = A(m,0).  The fully expanded forms of Q_4 in
(n,e,S,M2,P4,T,D31,P5,F,T4) and in (n,e,S,T,T4,P4,W2,F) are stored as strings in
`results/iso4.json` (`identities_as_strings`).  Lemma B′ is also evaluated
numerically on every forest n ≤ 16 and compared with Q_4 from the polynomials.

---

## 4. Lemma G (structural inequalities, every forest)

1. **P4 + P5 ≤ R = C(n,2) − e − S.**  In a forest a k-edge path is determined by its
   endpoints (unique paths), so P4, P5 are the numbers of vertex pairs at distance 3
   and 4, while e and S count the pairs at distance 1 and 2.
2. **F ≤ (e−3)·P4/2.**  Per edge vc, the edges meeting {v,c} are d_v + d_c − 1 ≤ e, so
   d_v + d_c − 4 ≤ e − 3 in the per-edge form of F (terms with (d_v−1)(d_c−1) = 0 vanish).
3. **T4 ≤ (Δ−3)·T/4.**  Per vertex, C(d,4) = C(d,3)(d−3)/4 ≤ C(d,3)(Δ−3)/4 (both sides 0 if d ≤ 2).
4. **C(Δ,2) ≤ S**, hence Δ ≤ Δ_max(S) := ⌊(1+√(1+8S))/2⌋ ≤ Δ_t(S,e) := 1/2 + (1 + 8S + (2e−1)²)/(4(2e−1)).
   The last step is the tangent bound √x ≤ (x + y²)/(2y), y = 2e−1 > 0
   (identity (x+y²)/(2y) − √x = (√x − y)²/(2y)); Δ_t is affine in S and equals
   (1+√(1+8S))/2 at S = C(e,2).
5. **e ≥ 2 ⇒ T ≥ Tmin := 2S(S−e+1)/(3(e−1)).**  Let w_v = d_v − 1 over the
   non-isolated vertices, m := Σ w_v = 2e − n′ = e − c′ where n′ is the number of
   non-isolated vertices and c′ ≥ 1 the number of non-trivial components, so
   0 ≤ m ≤ e − 1.  Σ w_v² = 2S − m and Σ w_v³ = 6T + m (identities (d−1)² = 2C(d,2) − (d−1),
   (d−1)³ = 6C(d,3) + (d−1)).  Cauchy–Schwarz (Σ w²)² ≤ (Σ w)(Σ w³) gives
   (2S − m)² ≤ m(6T + m), i.e. T ≥ (2/3)(S²/m − S) for m ≥ 1; this is decreasing in m,
   so m ≤ e−1 yields T ≥ Tmin.  If m = 0 then S = T = 0 = Tmin.
6. **n ≥ 7 ⇒ p_3 > 0**, since p_3 − S = (n−2)(n(n−1) − 6e)/6 ≥ (n−1)(n−2)(n−6)/6.

Each inequality is asserted on every forest n ≤ 16 (together with m = e − c′ ≤ e−1,
the Cauchy–Schwarz inequality itself, Δ ≤ Δ_max(S) ≤ Δ_t).

---

## 5. Lemma H (the lower bound)

Let n ≥ 7, e ≥ 2, and put

    cP_eff := E(n,e) − (5/2)(e−5) p_3,
    c      := cT − (5/4)(Δ_t − 3) p_3,            (Δ_t = Δ_t(S,e) from G4)
    L0     := Φ0 − 5 p_3 R + (2 − 3n) S R,
    L_I    := L0 + Tmin (4 Tmin + c).

Then

* if S ≤ e−2, cP_eff ≥ 0 and c ≥ 0:                    **Q_4 ≥ L0(n,e,S)**;
* if S ≥ e−1, cP_eff ≥ 0 and (c ≥ 0 or 8Tmin + c ≥ 0):  **Q_4 ≥ L_I(n,e,S)**.

*Proof (chain of inequalities, all with p_3 > 0 by G6).*

    Q_4 = Φ0 + cT·T + cP·P4 + 4T² + 8T·P4 + 4P4² − 5p_3(T4 + P5 + F)          (Lemma B′)
        ≥ Φ0 + cT·T + cP·P4 + 4T² − 5p_3(T4 + P5 + F)                          (drop 8T·P4 + 4P4² ≥ 0)
        ≥ Φ0 − 5p_3R + [cP + 5p_3 − (5/2)(e−3)p_3]·P4 + cT·T + 4T² − 5p_3T4    (G1: P5 ≤ R − P4;  G2: F ≤ (e−3)P4/2)
        = Φ0 − 5p_3R + cP_eff·P4 − (3n−2)S·P4 + cT·T + 4T² − 5p_3T4            (cP = E − (3n−2)S)
        ≥ Φ0 − 5p_3R + (2−3n)S·R + cT·T + 4T² − 5p_3T4                          (cP_eff ≥ 0;  G1: P4 ≤ R, S ≥ 0, 3n−2 > 0)
        ≥ L0 + 4T² + c·T                                                          (G3, G4: T4 ≤ (Δ−3)T/4 ≤ (Δ_t−3)T/4).

Let g(T) = 4T² + cT.  If S ≤ e−2 then Tmin ≤ 0, we only know T ≥ 0, and c ≥ 0 gives
g(T) ≥ 0, i.e. Q_4 ≥ L0.  If S ≥ e−1 then Tmin ≥ 0 and T ≥ Tmin (G5); g is convex with
g′(Tmin) = 8Tmin + c ≥ 0 (implied by c ≥ 0 as well), so g is non-decreasing on
[Tmin, ∞) and g(T) ≥ g(Tmin) = Tmin(4Tmin + c), i.e. Q_4 ≥ L_I.  ∎

Remarks.  Δ_t may be replaced by any Δ′ with Δ ≤ Δ′ (the chain only uses G3 with
Δ ≤ Δ′); the script uses Δ′ = Δ_max(S) for the integer scan and Δ_t for the
certificates.  Clearing denominators (sympy):

    144·L0 = 720S²e + 216S²n² − 936S²n + 1152S² − 504Se²n + 576Se² + 24Sen³ − 216Sen² + 2712Sen − 3024Se
             − 18Sn⁵ + 300Sn⁴ − 1758Sn³ + 2796Sn² − 1320Sn + 144e⁴ + 72e³n² − 720e³n + 864e³ − 12e²n⁴ + 156e²n³
             − 456e²n² + 240e²n + 432e² + 2en⁶ − 48en⁵ + 290en⁴ − 348en³ − 328en² + 432en
             + n⁷ − 5n⁶ − 53n⁵ + 241n⁴ − 308n³ + 124n²,
    24(2e−1)·c = −60S² − 30Se² − 84Sen − 84Se − 10Sn³ + 30Sn² + 52Sn − 18S + 30e³n − 252e³ − 5e²n³ − 33e²n²
                 + 1010e²n − 1560e² + 24en⁴ − 274en³ + 678en² − 914en + 828e − 12n⁴ + 137n³ − 327n² + 202n,
    2·cP_eff = −5Se + 25S + 5e²n − 18e² − 5en³/6 + en²/2 + 40en/3 − 14e + n⁴ − 41n³/6 + 27n²/2 − 23n/3,

and 144(e−1)²(2e−1)·L_I is a polynomial (denominator verified; 1 615-character string in
the JSON).  24(2e−1)c is concave in S (S²-coefficient −60), 2cP_eff is affine in S.

In the exhaustive run, whenever the side conditions hold for a forest with n ≤ 16 (with
Δ′ = Δ_max(S) and with Δ′ = Δ_t: 170 783 instances) the inequality Q_4 ≥ bound is
asserted; it is tight (slack 0) for the star K_{1,12} with Δ′ = Δ_max = 12, so the
chain cannot be sharpened without using more structure.  The side conditions fail
in 341 instances, all with n ≤ 12 (at n = 13, 14 they hold at every integer point
(e,S) for both Δ′ variants, but the bound is ≤ 0 at 72 resp. 33 of the 594 resp. 752
(e,S,Δ′) integer points, so the analytic part cannot start below n = 15 with this bound).

---

## 6. Lemma I (positivity of the bound and of the side conditions)

Let n ≥ 15, 2 ≤ e ≤ n−1, 0 ≤ S ≤ C(e,2).  Then cP_eff > 0, c > 0, L0 > 0 for S ≤ e−1
and L_I > 0 for S ≥ e−1, where c and L_I are taken with Δ′ = Δ_t in (a) and with
Δ′ = Δ_max(S) in (b).  (Since Δ_max ≤ Δ_t, p_3 > 0 and Tmin ≥ 0 in case I, positivity
for Δ_t implies positivity for Δ_max; either variant is a valid instance of Lemma H.)
Consequently Lemma H applies with all side conditions satisfied and Q_4 > 0 for every
forest with n ≥ 15 and e ≥ 2.

**(a) n ≥ 18 — exact Bernstein certificates (six polynomials).**  Parametrise
e = 2 + t(n−3), t ∈ [0,1] (covers 2 ≤ e ≤ n−1), and S affinely: S = (e−1) + σ(e−1)(e−2)/2
for the interval [e−1, C(e,2)], S = σ(e−1) for [0, e−1], σ ∈ [0,1].  Write n = 18 + s,
s ≥ 0.  Each of

    144(e−1)²(2e−1)·L_I on S ∈ [e−1, C(e,2)]  (degree 10 in n),
    144·L0                on S ∈ [0, e−1]       (degree 7),
    24(2e−1)·c  at S = 0 and at S = C(e,2)     (degree 5; c concave in S ⇒ positive on the whole S-range),
    2·cP_eff    at S = 0 and at S = C(e,2)     (degree 4; affine in S),

is a polynomial Σ_k c_k(t,σ) s^k with c_k ∈ ℚ[t,σ].  The script certifies, with exact
integer Bernstein coefficients on [0,1]² and adaptive bisection, that c_0 > 0 (all
Bernstein coefficients > 0 on every leaf box) and c_k ≥ 0 for k ≥ 1; hence every
polynomial is > 0 for every real n ≥ 18 and every admissible (e,S).  Bisection was
only needed for the three lowest coefficients of the L_I polynomial (5 boxes each);
the total is 23 + 8 + 6 + 6 + 5 + 5 boxes.  The machinery is validated on
controls (a polynomial negative in one point is rejected; (2t−1)² is rejected in the
strict mode and accepted in the non-strict mode; a positive polynomial with negative
Bernstein coefficients is accepted only after bisection).  Since the multipliers
144(e−1)²(2e−1), 144, 24(2e−1), 2 are positive for e ≥ 2, the signs transfer to
L_I, L0, c, cP_eff.

**(b) 15 ≤ n ≤ 17 — exact integer scan.**  At every integer point (e,S) with
2 ≤ e ≤ n−1, 0 ≤ S ≤ C(e,2) (468, 574, 695 points) the side conditions are verified
with Δ′ = Δ_max(S) and the applicable bound is > 0:

| n | points (case I / case II) | min bound | attained at |
|---|---|---|---|
| 15 | 377 / 91 | 3022347/169 ≈ 17 883.7 | e = 14, S = 30 (case I) |
| 16 | 469 / 105 | 4088618/49 ≈ 83 441.2 | e = 15, S = 36 (case I) |
| 17 | 575 / 120 | 205 550 | e = 16, S = 45 (case I) |

The same scan is continued for 18 ≤ n ≤ 40 as a cross-check of (a) (minimum
416 074.7 at n = 18, increasing to 3.86·10⁸ at n = 40).

**(c) e ∈ {0,1}.**  All statistics other than n, e vanish and Q_4 = A(n,e):
A(n,0) = n²(n−1)²(n−2)²(n+1)/144 > 0 for n ≥ 3, A(n,1) = n(n−1)(n−2)²(n−3)²(n+8)/144 > 0 for n ≥ 4.

---

## 7. Theorem 3 — ISO_4 holds for every forest (PROVED)

**Theorem 3.**  For every forest F (with p_k := 0 for k > α),

    Q_4(F) = 4p_4² + p_3² − 5p_3p_5 ≥ 0,

with equality iff p_3 = 0, i.e. iff α ≤ 2 (F ∈ {K_1, K_2, 2K_1, P_3, K_2+K_1, P_4, 2K_2}).

*Proof.*  n ≤ 14: exhaustive exact check of all 15 205 non-isomorphic forests
(the script checks all 85 624 forests with n ≤ 16, and Q_4 = 0 ⇔ p_3 = 0 on each).
n ≥ 15, e ∈ {0,1}: Lemma I(c).  n ≥ 15, e ≥ 2: by Lemma I the side conditions of
Lemma H hold at (n,e,S), so Q_4 ≥ L0 > 0 (S ≤ e−2) or Q_4 ≥ L_I > 0 (S ≥ e−1).  In
particular Q_4 > 0 whenever n ≥ 5, and p_3 = 0 forces p_4 = p_5 = 0 hence Q_4 = 0.  ∎

**Corollary.**  ISO_4 holds for every forest and every α; whenever r = 4 is a prefix
index (α ≥ 7, so p_3p_5 > 0), the ratio (4p_4² + p_3²)/(5p_3p_5) is > 1.

Additionally (not needed for the proof) Q_4 ≥ 0 was verified from the exact
polynomials for all 122 963 forests with n = 17 and all 307 199 forests with n = 18.

---

## 8. Exploration (data only, EXPLORED — not proved for general n)

**Q_4 minimizers over all forests of order n** (unique argmin in every row for n ≥ 5).
TS(a,b,c) is the *subdivided triple star*: centres of K_{1,a}, K_{1,b}, K_{1,c} joined
through two subdivision vertices (spine c1–m1–c2–m2–c3, spine degrees a+1, 2, b+2, 2, c+1);
T(a,b) is the *subdivided double star* (spine c1–m–c2, degrees a+1, 2, b+1).

| n | forests | min Q_4 | argmin | Q_4(star) | Q_4(edgeless) |
|---|---|---|---|---|---|
| 5 | 10 | 1 | P_5 | 20 | 150 |
| 6 | 20 | 16 | P_6 | 150 | 700 |
| 7 | 37 | 104 | P_7 | 700 | 2 450 |
| 8 | 76 | 500 | P_8 | 2 450 | 7 056 |
| 9 | 153 | 1 950 | P_9 | 7 056 | 17 640 |
| 10 | 329 | 6 005 | TS(2,1,2) | 17 640 | 39 600 |
| 11 | 710 | 15 742 | TS(2,2,2) | 39 600 | 81 675 |
| 12 | 1 601 | 36 573 | TS(2,2,3) | 81 675 | 157 300 |
| 13 | 3 658 | 77 062 | TS(3,2,3) | 157 300 | 286 286 |
| 14 | 8 599 | 151 988 | TS(3,3,3) | 286 286 | 496 860 |
| 15 | 20 514 | 281 667 | TS(3,3,4) | 496 860 | 828 100 |
| 16 | 49 905 | 495 080 | TS(4,3,4) | 828 100 | 1 332 800 |
| 17 | 122 963 | 836 365 | TS(4,4,4) | 1 332 800 | 2 080 800 |
| 18 | 307 199 | 1 358 280 | T(8,7) | 2 080 800 | 3 162 816 |

**Prefix forests (α ≥ 7): min Q_4 and min ratio (4p_4²+p_3²)/(5p_3p_5), n ≤ 16.**

| n | forests with α ≥ 7 | min Q_4 | argmin Q_4 | min ratio | argmin ratio |
|---|---|---|---|---|---|
| 7 | 1 | 2 450 | 7K_1 | 5/3 | 7K_1 |
| 8 | 8 | 2 416 | K_{1,5} + 2K_1 | 29/20 | 8K_1 |
| 9 | 42 | 2 852 | T(3,3) | 4/3 | 9K_1 |
| 10 | 171 | 6 005 | TS(2,1,2) | 53/42 | 10K_1 |
| 11 | 557 | 15 742 | TS(2,2,2) | 17/14 | 11K_1 |
| 12 | 1 516 | 36 573 | TS(2,2,3) | 85/72 | 12K_1 |
| 13 | 3 658 | 77 062 | TS(3,2,3) | 52/45 | 13K_1 |
| 14 | 8 599 | 151 988 | TS(3,3,3) | 25/22 | 14K_1 |
| 15 | 20 514 | 281 667 | TS(3,3,4) | 37/33 | 15K_1 |
| 16 | 49 905 | 495 080 | TS(4,3,4) | 173/156 | 16K_1 |

For n ≥ 13 every forest has α ≥ ⌈n/2⌉ ≥ 7, so the prefix count equals the total count;
for 10 ≤ n ≤ 16 the prefix argmin of Q_4 coincides with the global one.  The ratio minimizer is
always the edgeless forest, with ratio (n²−6n+13)/((n−3)(n−4)) = 1 + (n+1)/((n−3)(n−4)) → 1
(sympy): **ISO_4 has no uniform multiplicative margin on forests**, the star
K_{1,n−1} having ratio (n²−8n+20)/((n−4)(n−5)); the additive slack Q_4 is of order n⁷.

**Asymptotics of families (sympy closed forms).**
Q_4(edgeless) = n⁷/144 − 5n⁶/144 + …, Q_4(K_{1,n−1}) = n⁷/144 − n⁶/12 + …;
Q_4(T(a,a)) = a²(a+1)²(28a³ + 9a² − 48a + 20)/36 = (7/1152)n⁷ − (229/2304)n⁶ + … (n = 2a+3), i.e. ≈ 0.875·n⁷/144;
Q_4(TS(a,a−1,a)) = (279a⁷ + 730a⁶ + 314a⁵ + 60a⁴ + 391a³ − 102a² − 72a + 64)/16 = (31/3888)n⁷ − (937/5832)n⁶ + … (n = 3a+4), i.e. ≈ 1.148·n⁷/144.
So the TS family cannot remain minimal; exhaustively it still is at n = 17 and the
minimizer becomes T(8,7) at n = 18.  Within the families {edgeless, star, path, S(a,b)
double star, T(a,b), D3(a,b) (hubs at distance 3), best TS(a,b,c)}, the balanced T(a,b)
is minimal for every 18 ≤ n ≤ 30 and for n = 40, 50, 100.  The true minimizer for n ≥ 19
is **open** here.

---

## 9. Verification counts, reproduction

* `python3 iso4_subgraph_expansion.py` — single process, runtime 29.3 s (loaded 4-core
  machine); 35 sympy identities; 6 Bernstein certificates (53 boxes); integer scans
  15 ≤ n ≤ 17 (proof) and 18 ≤ n ≤ 40 (cross-check); 85 624 forests n ≤ 16 with all
  lemma identities and inequalities asserted per forest (brute force: 308 forests n ≤ 9
  for subgraph counts, 637 forests n ≤ 10 for independent 5-sets); Q_4 ≥ 0 for the
  430 162 forests with n ∈ {17, 18}; family data n ≤ 30, 40, 50, 100.
* Output `results/iso4.json`: status per item, theorem text, all identities as strings
  (Q_4 in both variable sets, Φ0, cT, cP, E, L0, L_I, c, cP_eff, closed forms), certificate
  and scan records, per-order minimizers with level sequences and degree sequences,
  script sha256 `86afd13c841e4fdd5bd2372620931bd0bb0a0daa4836747dd805737913913d4e`.
* Anomalies: none.  Observations: the chain of Lemma H is tight for stars (slack 0 at
  K_{1,12}); the lower bound is not positive at all integer (e,S) for n ≤ 14, so the
  exhaustive range n ≤ 14 is exactly what the analytic part requires.
