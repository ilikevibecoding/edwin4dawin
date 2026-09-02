# ISO_2 and ISO_3 for every forest — exact statements, proofs, verification

Erdős Problem #993 toolkit (`/workspace/erdos993`).  Everything below is exact
(integers, rationals, sympy).  The two verification scripts are

* `iso2_all_forests_proof.py` — marker `PASS_EXACT_ISO2_ALL_FORESTS`
* `iso3_subgraph_expansion.py` — marker `PASS_EXACT_ISO3_ALL_FORESTS`

and both write their records (with their own sha256) to
`results/iso2_iso3.json`.

**Status summary.**

| item | status |
|---|---|
| Theorem 1: ISO_2 (Q_2 ≥ 0) for **every** forest, with the sharp bound Q_2 ≥ 2n²−3n+2 and the star as unique extremal | **PROVED** (sympy identities + exhaustive check n ≤ 14) |
| Corollary: WR_2 for every forest with n ≥ 4, hence on the whole prefix | **PROVED** |
| Lemma A: exact subgraph-count formulas for p_2, p_3, p_4 | **PROVED** (inclusion–exclusion; checked on all 85 624 forests n ≤ 16) |
| Theorem 2: ISO_3 (Q_3 ≥ 0) for **every** forest | **PROVED** (analytic bound for n ≥ 14 + exhaustive check of the 6 606 forests with n ≤ 13) |
| Identity of the Q_3 minimizers / ratio minimizers for all n | **EXPLORED ONLY** (data for n ≤ 16, §5) |

---

## 0. Conventions

* F is a forest with vertex set V, n = |V| ≥ 1, e = |E(F)| edges, degrees d_v,
  independence number α.  A forest satisfies 0 ≤ e ≤ n−1.
* p_k = number of independent k-subsets of V; **p_k := 0 for k > α**.
  So p_0 = 1, p_1 = n, and the identities below hold for all k regardless of α.
* Q_r := r p_r² + p_{r−1}² − (r+1) p_{r−1} p_{r+1}  (ISO_r means Q_r ≥ 0);
  WR_r means p_{r−1} ≤ r p_r;  L(α) = ⌈(2α−1)/3⌉; the *prefix* is 1 ≤ r ≤ L(α)−1.
* Subgraph statistics (all computed from the edge list):
  * S  = Σ_v C(d_v,2) = number of pairs of edges sharing a vertex (= induced P_3's, as forests have no triangles),
  * M2 = C(e,2) − S = number of pairs of disjoint edges,
  * T  = Σ_v C(d_v,3) = number of claws K_{1,3} (as subgraphs),
  * P4 = Σ_{vw∈E} (d_v−1)(d_w−1) = number of paths with 3 edges (as subgraphs).
* Binomials are the polynomials C(x,k) = x(x−1)···(x−k+1)/k!.  For integer
  x ≥ 0 they are the usual counts; the only place a negative argument can occur
  is e·C(n−2,2) at n = 1, where it is multiplied by e = 0.

---

## 1. Lemma A (counting independent 2-, 3-, 4-sets)

For every forest,

    p_2 = C(n,2) − e,
    p_3 = C(n,3) − e(n−2) + S,
    p_4 = C(n,4) − e·C(n−2,2) + (n−3)·S + M2 − P4 − T.

*Proof.*  p_k = C(n,k) − #{k-sets containing at least one edge}, and by
inclusion–exclusion over non-empty edge sets A ⊆ E,

    #{k-sets ⊇ some edge} = Σ_{∅≠A⊆E} (−1)^{|A|+1} · C(n − |V(A)|, k − |V(A)|),

where V(A) is the set of vertices covered by A and the term is 0 if |V(A)| > k.

* k = 2: only |A| = 1 contributes: e.
* k = 3: |A| = 1 gives e(n−2); |A| = 2 with |V(A)| = 3 means two edges sharing a
  vertex, S such pairs, each contributing 1; three edges on 3 vertices would form
  a triangle — impossible in a forest.
* k = 4: |A| = 1 gives e·C(n−2,2); |A| = 2: S sharing pairs (|V(A)| = 3, each
  contributes n−3) and M2 disjoint pairs (|V(A)| = 4, each contributes 1);
  |A| = 3 with |V(A)| = 4 is an acyclic 3-edge graph on 4 vertices, i.e. a
  P_4 or a K_{1,3}, each contributing 1: P4 + T in total (a P_4 subgraph has a
  unique middle edge vw and is obtained by choosing another neighbour of v and
  another of w — (d_v−1)(d_w−1) choices, all distinct since there is no
  triangle; a claw is its centre plus 3 of its neighbours); |A| = 3 on 3
  vertices is a triangle and |A| ≥ 4 on ≤ 4 vertices contains a cycle — none
  exist. ∎

Verified exactly against the core library's polynomials for all 85 624
non-isomorphic forests with n ≤ 16 (statistics computed directly from the
concatenated edge lists), in both scripts (`n ≤ 14` in the ISO_2 script, `n ≤ 16`
in the ISO_3 script).

---

## 2. Theorem 1 — ISO_2 holds for every forest (PROVED)

**Theorem 1.**  For every forest F of order n ≥ 1,

    Q_2(F) = 2 p_2² + p_1² − 3 p_1 p_3  ≥  2n² − 3n + 2  ≥ 1,

with equality if and only if F is the star K_{1,n−1} (K_1 for n = 1, K_2 for
n = 2).  In particular ISO_2 holds strictly for every forest, for every n and α
(whether or not r = 2 is a prefix index).  Writing m = n−1 for the number of
leaves of the star, the extremal value is 2n² − 3n + 2 = 2m² + m + 1, attained
with p_1 = m+1, p_2 = C(m,2), p_3 = C(m,3).

*Proof.*  By Lemma A, with f(n,e) := 2(C(n,2)−e)² + n² − 3n[C(n,3) − e(n−2) + C(e,2)],

    Q_2 = f(n,e) + 3n·(C(e,2) − S).                                   (2.1)

(i) *S ≤ C(e,2), with equality iff every two edges meet.*  S counts pairs of
edges sharing a vertex; two distinct edges share at most one vertex, so every
such pair is counted once and S ≤ C(e,2).  Equality means all edges pairwise
intersect; in a triangle-free graph this forces a common vertex, i.e. the edge
set is a star (for e ≤ 1 trivially).  Hence Q_2 ≥ f(n,e), with equality iff the
non-trivial part of F is a star.

(ii) *Closed form of f.*  Expanding (sympy-verified),

    f(n,e) = n²(n+1)/2 + e·(n² − 5n/2) + e²·(2 − 3n/2),
    f(n,0) = n²(n+1)/2,    f(n,n−1) = 2n² − 3n + 2 = 2m² + m + 1,
    ∂²f/∂e² = 4 − 3n < 0  for n ≥ 2,
    f(n,0) − f(n,n−1) = (n−1)(n² − 2n + 4)/2 ≥ 0, with equality only at n = 1.

(iii) *Minimisation over 0 ≤ e ≤ n−1.*  For n = 1 the only forest is K_1 with
e = 0 and Q_2 = f(1,0) = 1 = 2·1 − 3 + 2.  For n ≥ 2, f is strictly concave in
e, so on the interval [0, n−1] it lies above the chord through (0, f(n,0)) and
(n−1, f(n,n−1)); since f(n,0) > f(n,n−1), this gives f(n,e) > f(n,n−1) for
0 ≤ e < n−1 and f(n,n−1) = 2n² − 3n + 2 at e = n−1.  Combining with (i),

    Q_2 ≥ f(n,e) ≥ 2n² − 3n + 2,

with equality throughout iff e = n−1 (F is a tree) and S = C(e,2) (its edges
pairwise meet), i.e. iff F = K_{1,n−1}.  Finally 2n² − 3n + 2 ≥ 1 for all
integers n ≥ 1 (its minimum over the integers is 1 at n = 1). ∎

**Exhaustive confirmation (script `iso2_all_forests_proof.py`).**  All 15 205
non-isomorphic forests with 1 ≤ n ≤ 14: (a) the Lemma A formulas for p_1, p_2,
p_3 agree with the core polynomials; (b) Q_2 − f(n,e) = 3n(C(e,2) − S) ≥ 0, with
equality exactly for the n forests per order whose edge set is a star
(K_{1,k} + (n−1−k)K_1, 0 ≤ k ≤ n−1); (c) Q_2 ≥ 2n² − 3n + 2 with equality only
for the star K_{1,n−1}, which is the **unique** minimizer of Q_2 at every order
n ≤ 14 (values 1, 4, 11, 22, 37, 56, 79, 106, 137, 172, 211, 254, 301, 352 for
n = 1..14).

---

## 3. Corollary — WR_2 and the prefix (PROVED)

**Corollary.**  For every forest, p_1 ≤ 2p_2 ⟺ 2e ≤ n(n−2).  It holds for every
forest with n ≥ 4, and fails only for K_1, K_2 and P_3.

*Proof.*  2p_2 − p_1 = n(n−1) − 2e − n = n(n−2) − 2e.  For n ≥ 4, e ≤ n−1 gives
2e ≤ 2(n−1) ≤ n(n−2), because n(n−2) − 2(n−1) = (n−2)² − 2 ≥ 2 > 0 for n ≥ 4
(at n = 4: 2e ≤ 6 ≤ 8).  For n ≤ 3 one checks directly: n = 3 fails iff e = 2
(P_3: p_1 = 3 > 2 = 2p_2), n = 2 fails iff e = 1 (K_2), n = 1 always fails
(p_2 = 0). ∎

**When is r = 2 a prefix index?**  r = 2 lies in the prefix iff 2 ≤ L(α)−1,
i.e. L(α) = ⌈(2α−1)/3⌉ ≥ 3, i.e. 2α−1 > 6, i.e. **α ≥ 4** (L(3) = 2, L(4) = 3).
Since α ≤ n this forces n ≥ 4, so WR_2 holds for every forest for which r = 2 is
a prefix index; ISO_2 holds for every forest whatsoever (Theorem 1).  The
equivalence "r = 2 in prefix ⟺ α ≥ 4" and the inclusion "α ≥ 4 ⇒ n ≥ 4 ⇒ WR_2 and
Q_2 > 0" were checked on all 15 205 forests n ≤ 14.

---

## 4. Theorem 2 — ISO_3 holds for every forest (PROVED)

### 4.1 Exact expansion (Lemma B)

Substituting Lemma A into Q_3 := 3p_3² + p_2² − 4p_2 p_4 gives (sympy) the
polynomial in (n, e, S, M2, P4, T)

    Q_3 = n²(n−1)²(n+1)/12 + n(n−1)(n² − 11n + 12)/6 · e + (n−1)² e²
          − [n(n−1)(n−4) + 2ne]·S + 3S² − 4p_2·M2 + 4p_2·(P4 + T),      p_2 = C(n,2) − e,

and, after M2 = C(e,2) − S, the reduced form used in the proof:

    Q_3 = n²(n−1)²(n+1)/12 + n(n−1)(n−2)(n−9)/6 · e − (n+1) e² + 2 e³
          + 3 S² − (K·S − M·T) + M·P4,                                        (B)
    K := n(n−1)(n−6) + 2(n+2) e,      M := 4 p_2 = 2n(n−1) − 4e.

Both forms were verified symbolically, and (B) also numerically on all 85 624
forests with n ≤ 16.  Sanity checks that follow from (B): the edgeless forest
has Q_3 = n²(n−1)²(n+1)/12 and the star K_{1,m} has Q_3 = m²(m−1)²(m+1)/12.

### 4.2 Structural facts (Lemma C)

For every forest: (i) p_2 ≥ C(n,2) − (n−1) = (n−1)(n−2)/2 > 0 for n ≥ 3, so
M > 0.  (ii) If e ≥ 1, let n′ be the number of non-isolated vertices and c′ ≥ 1
the number of non-trivial components; then e = n′ − c′ and

    Σ_{v : d_v ≥ 1} (d_v − 1) = 2e − n′ = e − c′ ≤ e − 1.

### 4.3 Per-vertex bound (Lemma D)

K·S − M·T = Σ_v c(d_v) with c(d) := K·C(d,2) − M·C(d,3).  One has (sympy)

    c(d) = (d−1)·h(d),   h(d) := d(3K + 2M − M d)/6,
    φ(n,e) := (3K+2M)²/(24M)  satisfies  φ − h(d) = M (d − d*)²/6 ≥ 0,  d* = (3K+2M)/(2M),

so h(d) ≤ φ for every real d (as M > 0), and φ ≥ 0.  Vertices with d_v ≤ 1
contribute c(d_v) = 0, hence, for e ≥ 1, by Lemma C(ii),

    K·S − M·T = Σ_{d_v ≥ 2} (d_v − 1) h(d_v) ≤ φ · Σ_{d_v ≥ 1} (d_v − 1) ≤ (e − 1)·φ(n,e).

### 4.4 Monotonicity (Lemma E)

3K + 2M = n(n−1)(3n−14) + (6n+4)e is positive for n ≥ 5 and increasing in e,
while M = 2n(n−1) − 4e is positive and decreasing in e; hence φ(n,e) is
increasing in e on [0, n−1] and

    φ(n,e) ≤ φ(n,n−1) = C_n := (n−1)(n−2)(3n−2)²/48        (0 ≤ e ≤ n−1, n ≥ 5).

### 4.5 The theorem

**Theorem 2.**  Every forest F satisfies Q_3(F) = 3p_3² + p_2² − 4p_2p_4 ≥ 0;
Q_3(F) > 0 unless F ∈ {K_1, K_2} (where p_2 = 0).  Quantitatively, for n ≥ 14:

    e = 0:          Q_3 = n²(n−1)²(n+1)/12 > 0;
    1 ≤ e ≤ n−1:    Q_3 ≥ B_n(e) := n²(n−1)²(n+1)/12 + n(n−1)(n−2)(n−9)/6 · e − (n+1)e² − (e−1)·C_n > 0.

Consequently ISO_3 holds for every forest and every α, in particular whenever
r = 3 is a prefix index (which happens iff L(α) ≥ 4 iff α ≥ 6), and then the
ratio (3p_3² + p_2²)/(4p_2p_4) = 1 + Q_3/(4p_2p_4) exceeds 1.

*Proof.*  Let n ≥ 14.  If e = 0 then S = T = P4 = 0 and (B) gives the stated
value.  Let 1 ≤ e ≤ n−1.  In (B) the terms 2e³, 3S² and M·P4 are ≥ 0 (M > 0 by
Lemma C(i)); dropping them and applying Lemma D and then Lemma E (e−1 ≥ 0),

    Q_3 ≥ n²(n−1)²(n+1)/12 + n(n−1)(n−2)(n−9)/6·e − (n+1)e² − (e−1)φ(n,e) ≥ B_n(e).

B_n is a quadratic in e with leading coefficient −(n+1) < 0, hence concave, so
on [1, n−1] it is at least min(B_n(1), B_n(n−1)).  Now (sympy)

    B_n(1)   = (n⁵ + n⁴ − 25n³ + 59n² − 48n − 12)/12 = [n³(n² + n − 25) + 59n² − 48n − 12]/12 > 0   (n ≥ 5),
    B_n(n−1) = (n−1)·β(n)/48,   β(n) = 3n⁴ − 48n³ + 92n² − 80n + 32 = 3n³(n−16) + 92n² − 80n + 32,

and β(14) = 480, β(15) = 9407, while for n ≥ 16 both 3n³(n−16) ≥ 0 and
92n² − 80n + 32 > 0 (negative discriminant).  So B_n(e) > 0 for all n ≥ 14,
1 ≤ e ≤ n−1, and Q_3 > 0.  (β(13) = −5233 < 0: the analytic bound alone does not
reach below n = 14.)

For n ≤ 13 the statement is checked exhaustively on all 6 606 non-isomorphic
forests (1+2+3+6+10+20+37+76+153+329+710+1601+3658): Q_3 ≥ 0 everywhere, with
Q_3 = 0 exactly for K_1 and K_2. ∎

**Verification performed by `iso3_subgraph_expansion.py`:** 21 sympy identities
(Lemma B in all three displayed forms, M = 4p_2, c = (d−1)h, the completed
square, 3K+2M, φ(n,n−1) = C_n, the e²-coefficient of B_n, B_n(1) and its
regrouping, β(n) and its factorisation, β(13), β(14), β(15), the closed forms for
the star / edgeless forest / T(a,a) / T(a+1,a), their n⁵- and n⁴-coefficients,
and the edgeless ratio); for every one of the 85 624 forests with n ≤ 16: Lemma A,
identity (B), Lemma C, Q_3 ≥ 0, and — for n ≥ 5, e ≥ 1 — every inequality of the
chain Q_3 ≥ (B minus dropped terms) ≥ … − (e−1)φ ≥ B_n(e) in exact rational
arithmetic, with B_n(e) > 0 for n ≥ 14; additionally B_n(e) > 0 for every
integer 1 ≤ e ≤ n−1 and 14 ≤ n ≤ 400, and min_e B_n(e) ≤ 0 for 5 ≤ n ≤ 13.  The
minimum of Q_3 − B_n(e) over forests with e ≥ 1 is 2 (attained at e = 1, where the
only loss is the dropped 2e³), so the bound is essentially tight at that end.

---

## 5. Exploration of ISO_3 (data for n ≤ 16 — NOT proved for general n)

Restricting to forests for which r = 3 is a prefix index (α ≥ 6):

| n | forests α≥6 | min Q_3 | unique minimizer | Q_3(K_{1,n−1}) | Q_3(edgeless) | min ratio | ≈ | ratio minimizer | ratio(K_{1,n−1}) | ratio(edgeless) |
|---|---|---|---|---|---|---|---|---|---|---|
| 6 | 1 | 525 | 6K_1 | 200 | 525 | 19/12 | 1.5833 | 6K_1 | 2 | 19/12 |
| 7 | 7 | 496 | K_{1,5}+K_1 | 525 | 1176 | 7/5 | 1.4000 | 7K_1 | 19/12 | 7/5 |
| 8 | 32 | 825 | T(3,2) | 1176 | 2352 | 13/10 | 1.3000 | 8K_1 | 7/5 | 13/10 |
| 9 | 109 | 1683 | T(3,3) | 2352 | 4320 | 26/21 | 1.2381 | 9K_1 | 13/10 | 26/21 |
| 10 | 302 | 3171 | T(4,3) | 4320 | 7425 | 67/56 | 1.1964 | 10K_1 | 26/21 | 67/56 |
| 11 | 710 | 5553 | T(4,4) | 7425 | 12100 | 7/6 | 1.1667 | 11K_1 | 67/56 | 7/6 |
| 12 | 1601 | 9233 | T(5,4) | 12100 | 18876 | 28639/25080 | 1.1419 | K_{1,9}+2K_1 | 7/6 | 103/90 |
| 13 | 3658 | 14631 | T(5,5) | 18876 | 28392 | 8891/7920 | 1.1226 | K_{1,10}+2K_1 | 103/90 | 62/55 |
| 14 | 8599 | 22359 | T(6,5) | 28392 | 41405 | 253507/228800 | 1.1080 | K_{1,11}+2K_1 | 62/55 | 49/44 |
| 15 | 20514 | 33029 | T(6,6) | 41405 | 58800 | 412903/376752 | 1.0960 | K_{1,11}+3K_1 | 49/44 | 43/39 |
| 16 | 49905 | 47505 | T(7,6) | 58800 | 81600 | 53413/49176 | 1.0862 | K_{1,12}+3K_1 | 43/39 | 199/182 |

Here T(a,b) (a ≥ b ≥ 1) is the *subdivided double star*: the stars K_{1,a} and
K_{1,b} with their centres joined to one common new vertex (n = a+b+3, degree
sequence a+1, b+1, 2, 1^{a+b}; S = C(a+1,2)+C(b+1,2)+1, T = C(a+1,3)+C(b+1,3),
P4 = a+b).  Observations (all for n ≤ 16 only):

* **Q_3 minimizer.**  Over *all* forests of order n, the unique minimizer of Q_3 is
  T(⌈(n−3)/2⌉, ⌊(n−3)/2⌋) for 5 ≤ n ≤ 16 (P_5 = T(1,1), T(2,1), T(2,2), T(3,2), …,
  T(7,6)); n = 4: P_4 (Q_3 = 9), n = 3: K_{1,2} (Q_3 = 1), n = 1, 2: K_1, K_2
  (Q_3 = 0).  Among prefix forests (α ≥ 6) the same tree is the unique minimizer for
  8 ≤ n ≤ 16 (T(2,2) has α = 5 and drops out at n = 7, where K_{1,5}+K_1 wins).
  Unlike Q_2, **the star is not the Q_3 minimizer**.  Closed forms (sympy):
  Q_3(T(a,a)) = (8a⁵ + 21a⁴ + 38a³ + 39a² + 8a + 3)/3 (n = 2a+3) and
  Q_3(T(a+1,a)) = (8a⁵ + 41a⁴ + 100a³ + 139a² + 90a + 27)/3 (n = 2a+4).  All of
  Q_3(edgeless), Q_3(K_{1,n−1}) and Q_3(T) equal n⁵/12 + O(n⁴); the double
  structures win at order n⁴ (n⁵/12 − 13n⁴/16 + … for T(a,a) versus
  n⁵/12 − n⁴/2 + … for the star).  Whether T(⌈(n−3)/2⌉,⌊(n−3)/2⌋) minimizes Q_3
  for all n is **open** here.
* **Ratio.**  The minimal ratio (3p_3² + p_2²)/(4p_2p_4) over prefix forests is
  attained by the edgeless forest for 6 ≤ n ≤ 11 (value 1 + 1/(n−3) + 3/((n−2)(n−3)))
  and by a star plus isolated vertices for 12 ≤ n ≤ 16 (K_{1,n−3}+2K_1 for
  n = 12, 13, 14; K_{1,n−4}+3K_1 for n = 15, 16).  It decreases monotonically
  (1.583, 1.400, 1.300, 1.238, 1.196, 1.167, 1.142, 1.123, 1.108, 1.096, 1.086)
  and tends to 1 (already for the edgeless forest it is 1 + O(1/n)), so ISO_3 —
  like every ISO_r on binomial-type sequences — admits **no uniform
  multiplicative margin**; what is uniform is the additive slack Q_3 (order n⁵
  for every forest by Theorem 2).

---

## 6. Verification record

| script | forests checked | sympy identities | runtime | marker | sha256 |
|---|---|---|---|---|---|
| `iso2_all_forests_proof.py` | 15 205 (all n ≤ 14) | 12 | ≈ 0.8 s | `PASS_EXACT_ISO2_ALL_FORESTS` | `3c8c218d060c3810d55df8d8c848807850e83b4a7ae4ea96ab38c935409d8ca1` |
| `iso3_subgraph_expansion.py` | 85 624 (all n ≤ 16); proof uses the 6 606 with n ≤ 13 | 21 | ≈ 7 s | `PASS_EXACT_ISO3_ALL_FORESTS` | `5d5ba942c17985a1646d9fb415c889b8f0821434e22066099a2de706adc59e42` |

Both scripts recompute their own sha256 at run time and store it, together with
all counts and the per-order data above, in `results/iso2_iso3.json`
(keys `iso2`, `iso3`; `status` fields separate PROVED from EXPLORED).  Run with
`python3 iso2_all_forests_proof.py` and `python3 iso3_subgraph_expansion.py`
from `/workspace/erdos993`; each prints its marker only if every assertion holds.
Theorem 1 and its corollary use no finite enumeration at all (the n ≤ 14 run
only confirms them); Theorem 2 uses enumeration exactly for the 6 606 forests
with n ≤ 13, all larger orders being covered by the algebraic bound B_n(e).
