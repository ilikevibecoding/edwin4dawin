# Theorem: `ISO_3` holds for every tree

Replay: `python3 scripts/prove_iso3_trees.py` (exact arithmetic throughout;
prints `PASS_EXACT_ISO3_ALL_TREES_ROOT`; report `reports/iso3_trees_proof.json`).

## Statement

Let `T` be a tree on `n` vertices with independence polynomial
`I(T;x) = sum_r p_r x^r`. Then

```text
Q_3(T) = 3 p_3^2 + p_2^2 - 4 p_2 p_4 >= 0.
```

(`ISO_r` is `Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0`; `ISO_1`,
`ISO_2` for all forests are proved in `REDUCTION_LEMMA_AND_PROVED_CASES.md`.)

## Notation

`e = n - 1`; `d_v` = degree of `v`; `l` = number of leaves;
`I` = set of internal vertices (`d_v >= 2`), `|I| = n - l`;

```text
S  = sum_v C(d_v,2)          (pairs of edges sharing a vertex = 2-edge paths)
T3 = sum_v C(d_v,3)          (claws K_{1,3})
P  = sum_{uv in E} (d_u-1)(d_v-1)     (3-edge paths P_4)
```

For `n <= 6` the statement is checked directly (all trees with `n <= 14` are
in fact checked in the script). Assume `n >= 7`.

## Step 1 — exact coefficient formulas

By inclusion–exclusion over the edge subsets contained in a `k`-set of
vertices (a `k`-set of a forest contains at most `k-1` edges, and any set of
edges inside a `k`-set is a sub-forest on at most `k` vertices):

```text
p_2 = C(n,2) - e
p_3 = C(n,3) - e(n-2) + S
p_4 = C(n,4) - e C(n-2,2) + [ S (n-3) + (C(e,2) - S) ] - (P + T3)
    = C(n,4) - e C(n-2,2) + S (n-4) + C(e,2) - P - T3
```

(For `p_4`: single edges lie in `C(n-2,2)` four-sets; two edges sharing a
vertex lie in `n-3` four-sets, two disjoint edges in exactly one; the
`3`-edge sub-forests on `4` vertices are the `P_4`s and the claws, each in
exactly one four-set; nothing else fits in four vertices.)
Verified exactly on all 5,447 trees with `n <= 14`.

## Step 2 — drop `P`

`P >= 0` and `p_2 > 0`, so `Q_3 >= 3 p_3^2 + p_2^2 - 4 p_2 (p_4 + P)`.

## Step 3 — a Cauchy–Schwarz lower bound for `T3`

Put `x_v = C(d_v,2)`. For `d_v >= 1`, `x_v (d_v - 2) = 2 x_v^2 / d_v - x_v`
(both sides equal `d_v (d_v-1)(d_v-2)/2`), and `C(d_v,3) = x_v (d_v-2)/3`.
Summing over `I` (leaves contribute `0` to `S` and `T3`):

```text
3 T3 = sum_I 2 x_v^2 / d_v - S  >=  2 (sum_I x_v)^2 / (sum_I d_v) - S = 2 S^2 / D2 - S,
D2 = sum_I d_v = 2e - l = 2(n-1) - l,
```

by Cauchy–Schwarz `(sum x_v^2/d_v)(sum d_v) >= (sum x_v)^2`. Equality holds
for stars, so this bound is exact on the extremal family.

## Step 4 — leaves versus `S`

`sum_I (d_v - 1) = sum_v (d_v - 1) = 2(n-1) - n = n - 2`, every internal
vertex has `d_v - 1 >= 1`, and `y -> y(y+1)/2` is convex; by the standard
exchange (majorisation) argument `S = sum_I C(d_v,2)` is maximised when one
internal vertex takes `d_v - 1 = l - 1` and the other `n - l - 1` take `1`:

```text
S <= Smax(l) := C(l,2) + n - l - 1.
```

Also `S >= n - 2` (since `C(d,2) >= d - 1`) and `S <= C(e,2) = Smax(n-1)`.

## Step 5 — reduction to one polynomial

With `c3 = C(n,3) - e(n-2)`, `c4 = C(n,4) - e C(n-2,2)`, Steps 1–3 give

```text
Q_3 >= G(n,l,S) := 3 (c3+S)^2 + p_2^2 - 4 p_2 ( c4 + S(n-4) + C(n-1,2) )
                   + (4 p_2 / 3) ( 2 S^2 / (2n-2-l) - S ).
```

`G` is non-decreasing in `l` (it depends on `l` only through
`2S^2/(2n-2-l)`). `Smax` is continuous and increasing on `[2, oo)` with
`Smax(2) = n-2 <= S <= C(n-1,2) = Smax(n-1)`, so there is a unique real
`lambda in [2, n-1]` with `Smax(lambda) = S`, and Step 4 gives `l >= lambda`.
Hence

```text
Q_3 >= G(n, lambda, Smax(lambda)) =: K(n, lambda).
```

`K~(n,lambda) := 12 (2n-2-lambda) K(n,lambda)` is a polynomial with integer
coefficients (printed in the report), and `2n-2-lambda >= n-1 > 0`, so it
suffices to show `K~ >= 0` for real `lambda in [2, n-1]`, `n >= 7`.

## Step 6 — positivity certificate for `K~`

Write `lambda = 2 + a`, `n = 3 + a + b` with real `a, b >= 0`, `a + b = n - 3 >= 4`.

**(6a) `a, b >= 2`.** Substituting `a -> a+2`, `b -> b+2`,

```text
K~(a+2, b+2) = a^4 (a^2 - a b + 10 b^2) + R(a,b),
```

where every coefficient of `R` is non-negative (25 monomials, checked
symbolically) and `a^2 - ab + 10 b^2 = (a - b/2)^2 + (39/4) b^2 >= 0`.

**(6b) `0 <= a <= 2, b >= 4` (and symmetrically `0 <= b <= 2, a >= 4`).**
Expanding `K~(a, b+4)` in powers of `b`, each coefficient is a univariate
polynomial in `a` with no real root in `(0,2)` and non-negative values at
`0, 1, 2` (exact real-root isolation), hence non-negative on `[0,2]`; so
`K~(a, b+4) >= 0` for `b >= 0`. Same with the roles of `a`, `b` swapped.

**(6c) the compact pieces `{0<=a<=2, 2<=b<=4, a+b>=4}` and
`{2<=a<=4, 0<=b<=2, a+b>=4}`.** Exact Bernstein-coefficient subdivision: a
polynomial all of whose Bernstein coefficients on a box are non-negative is
non-negative on the box; boxes lying entirely in `a + b < 4` are irrelevant.
Both pieces certify after one subdivision level. (The routine is self-tested:
it refuses `(a-4)^2 - 1/10` and accepts `(a-4)^2 + 1/10` on `[3,5]x[1,2]`.)

These pieces cover `{a, b >= 0, a + b >= 4}`: if `a, b >= 2` use (6a);
otherwise one variable is `< 2`, the other is `> 2`, and it is either `>= 4`
(6b) or in `(2,4)` (6c).

## Step 7 — small orders

Trees with `n <= 6` (indeed `n <= 14`) satisfy `Q_3 >= 0` by direct exact
computation. Together with Steps 1–6 this proves the theorem for all trees. ∎

## Remarks

- The bound is far from tight for `n >= 7` (normalised lower bound
  `G/(p_2 p_3) >= 0.27`), whereas the true minimum of `Q_3/(p_2 p_3)` over
  trees is about `1.09` (double brooms). The slack is what makes the crude
  bounds `P >= 0` and Cauchy–Schwarz sufficient.
- `K~(a,b)` is negative at some real points with `a + b <= 2.5` (`n <= 5.5`),
  which is why the certificate is restricted to `n >= 7`.
- For forests the same chain holds numerically (33,000 random forests,
  bound never negative) but the region acquires extra parameters (`e`, number
  of isolated vertices); a certificate has not been produced. See
  `STATUS_2026-09-02.md`.
