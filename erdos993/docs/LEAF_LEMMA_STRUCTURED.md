# The structured leaf lemma and its exact certificates (r = 2, 3)

Replay: `python3 scripts/certify_leaf_lemma_degree3.py --r 2 3 --smax 3 --degree4 3,0`
(report `reports/leaf_lemma_certificates.json`, marker
`PASS_EXACT_LEAF_LEMMA_DEGREE3_CERTIFICATES`); exploratory searches:
`scripts/search_leaf_certificate_structured.py`.

## 1. Why this inequality

`docs/LEAF_INDUCTION_PROBE.md` showed that the single inequality

```text
R_r(T, l) := Q_r(T) - Q_r(T - l) - Q_{r-1}(T - l - v) >= 0        (l a leaf, v its neighbour)
```

would prove `ISO_r` for every forest at every index by induction on the number
of vertices (base case: edgeless forests, binomial coefficients), and that
`R_r > 0` on every one of 2.1 million (tree, leaf, index) instances, but that
`R_r` is *not* a nonnegative combination of the induction hypotheses and the
obvious coordinate relations. The induction only needs the inequality for
**one** leaf per forest, so we may choose the leaf.

## 2. The deepest-leaf structure

Root a non-trivial component anywhere and let `l` be a deepest leaf. Its
neighbour `v` then has `s >= 0` further children, all leaves, and either a
parent `w` or none (then the component is the star `K_{1,s+1}`). Put
`F' = T` minus `v` and its `s+1` leaf children, and

```text
gamma = I(F' - w),    delta = I(F' - N[w]),    beta = I(F') = gamma + x delta      (exact),
b = I(T - l - v) = (1+x)^s beta,   a = I(T - l) = b + x gamma,   p = I(T) = (1+x)^{s+1} beta + x gamma.
```

(`v ∈ S` forces `w ∉ S` and all leaves of `v` out; the leaves are isolated in
`T - l - v`.) In the no-parent case `gamma = beta`, `delta = 0`. So the leaf
lemma becomes a statement about a forest `F'` with one marked vertex `w`,
through the coordinates `(gamma_k, delta_k)`, with `s` as a parameter.

## 3. Relations that are true for every forest `F'` and vertex `w`

Every generator below is a polynomial in the coordinates that is `>= 0` for all
actual `(F', w)`; each has a one-line proof.

- `gamma_k >= 0`, `delta_k >= 0`, `gamma_k - delta_k >= 0` (`F' - N[w]` is an
  induced subforest of `F' - w`, so it has no more independent `k`-sets).
- Single-mark relation (built into `beta = gamma + x delta`): an independent
  `k`-set of `F'` containing `w` is `w` plus an independent `(k-1)`-set of
  `F' - N[w]`.
- **Super-multiplicativity.** If `X` is an induced subforest of `Y` then
  `i_j(Y) i_k(X) >= C(j+k, j) i_{j+k}(X)`: every ordered splitting `S = J ⊔ K`
  of an independent `(j+k)`-set `S` of `X` gives a distinct pair
  `(J, K) ∈ I_j(Y) × I_k(X)`. Applied to all pairs among `F' ⊇ F'-w ⊇ F'-N[w]`.
- Edge-count bounds: `p_2 <= C(p_1, 2)` and `2 p_2 >= p_1 (p_1 - 3)` for every
  forest (a forest on `n` vertices has `e <= n - 1` edges, and
  `2 p_2 = n(n-1) - 2e`; the second form is chosen so that it also holds for the
  empty forest `n = 0`, which does occur as `F' - N[w]`).
- **Induction hypothesis:** `Q_i(beta), Q_i(gamma), Q_i(delta) >= 0` for
  `1 <= i <= r` (`F'`, `F' - w`, `F' - N[w]` are smaller forests).

A Handelman/Positivstellensatz-type certificate is an identity

```text
m(gamma, delta) · R_r  ==  sum_j lambda_j · g_j,      lambda_j >= 0,
```

with `m` a positive combination of the linear generators (constant term
forced positive, so `m > 0` on the whole domain) and each `g_j` a product of
generators. Its existence proves `R_r >= 0` for every forest of the given
configuration `(r, s)`. The float LP (HiGHS) only proposes a support; the
coefficients are then re-solved exactly over the rationals and the identity is
verified symbolically (sympy) before anything is called certified.

## 4. Results

| configuration | degree-2 certificate | degree-3 (linear multiplier) | degree-4 (quadratic multiplier) |
| --- | --- | --- | --- |
| `r = 1`, any `s` | yes | — | — |
| `r = 2`, `s = 0,1,2,3` | yes (needs super-multiplicativity and the single-mark relation) | yes, exact | — |
| `r = 2`, star-like (no parent), `s <= 3` | yes | yes | — |
| `r = 3`, `s = 1,2,3` | no | **yes, exact** | — |
| `r = 3`, `s = 0` | no | no | **yes, exact** (29,161 candidate products, support 179) |
| `r = 3`, star-like, `s = 1,2,3` | no | yes (float) | — |
| `r = 3`, star-like, `s = 0` | no | no | not tried |
| `r = 4`, `s = 0..3` | no | no | no (`s = 1..3` infeasible; `s = 0` numerically unresolved) |

All "yes, exact" entries are rational identities verified symbolically and
stored with their coefficients in `reports/leaf_lemma_certificates.json`.

Consequences and limits:

- The leaf lemma — hence the inductive mechanism — is now **proved exactly at
  `r = 2` and `r = 3` for every forest whose deepest-leaf neighbour has at
  most four leaf children** (and, at `r = 2`, for star-like components). These
  are the first certified cases beyond `r = 1`; the earlier LP found none
  because it lacked super-multiplicativity and the single-mark relation.
- Because `ISO_2` and `ISO_3` are already proved for all forests by other
  means (`docs/REDUCTION_LEMMA_AND_PROVED_CASES.md`, `docs/ISO3_FORESTS_THEOREM.md`),
  these certificates do not enlarge the set of proved `ISO` indices; their
  value is that they show *how* an inductive proof can be assembled and what
  it costs.
- The cost grows with `r`: `r = 2` needs degree 3 (or degree 2 with structure),
  `r = 3` needs degree 3–4, and `r = 4` is infeasible through degree 4. A
  proof for all `r` therefore needs either a certificate family whose degree
  grows with `r` (found by hand, not by LP), or additional relations between
  `(gamma, delta)` that collapse the degree. The candidate missing relations
  are of the kind identified in `docs/ISO4_TREES_PROBE.md`: second moments of
  the distance-2 counts, i.e. how `I(F' - N[w])` relates to `I(F' - w)` through
  the degrees of the neighbours of `w` — the two-mark objects of the handoff.
- All results are for `s <= 3`; a theorem for all `s` needs a certificate that
  is polynomial in `s` (the binomial factor `(1+x)^{s+1}` makes the target a
  polynomial in `s`), which was not attempted.

## 5. A cautionary example that the method caught

A first version of this search used the recursion that deletes `v` instead of
the leaf, `I(T) = I(T - v) + x I(T - N[v])`. Its residual is **negative** on
stars (`-m^3/2 + 3m^2/2 + m` for `K_{1,m}`, `m >= 4`), so the "infeasible for
`s >= 2`" pattern it produced was the LP correctly refusing to prove a false
statement — and a generator (`p_2 >= C(p_1 - 1, 2)`) that fails for the empty
forest briefly produced a spurious feasible certificate at `r = 3, s = 0`.
Both were removed. The exact-replay discipline of the handoff is what makes
this kind of search safe.
