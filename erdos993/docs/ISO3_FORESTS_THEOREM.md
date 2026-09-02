# Theorem: `ISO_3` holds for every forest

Replay: `python3 scripts/prove_iso3_forests.py` (exact arithmetic throughout —
sympy rationals and Python `Fraction`s, no floating point; about 8 s; prints
`PASS_EXACT_ISO3_ALL_FORESTS_ROOT`; report `reports/iso3_forests_proof.json`).
If any step failed the script would print `ISO3_FORESTS_INCOMPLETE` and exit
non-zero. **Every step is certified; nothing in this note is left open.**

This extends `docs/ISO3_TREES_THEOREM.md` (trees) to all forests. The tree
certificate is reused *and re-run* here, so the present proof is self-contained.

## Statement

Let `F` be a forest on `n` vertices with independence polynomial
`I(F;x) = sum_r p_r x^r`. Then

```text
Q_3(F) = 3 p_3^2 + p_2^2 - 4 p_2 p_4 >= 0.
```

(`ISO_r` is `Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0`; `ISO_1`,
`ISO_2` for all forests are proved in `REDUCTION_LEMMA_AND_PROVED_CASES.md`,
`ISO_3` for trees in `ISO3_TREES_THEOREM.md`.)

## Notation

`e` edges; `d_v` degree of `v`; `z` isolated vertices (`d_v = 0`); `l` leaves
(`d_v = 1`); `I` the set (and number) of internal vertices (`d_v >= 2`);
`c'` the number of non-trivial components (components with `>= 2` vertices);
`n' = n - z = e + c'` (a forest with `c'` components on `n'` vertices has
`n' - c'` edges).

```text
S  = sum_v C(d_v,2)          (pairs of edges sharing a vertex = 2-edge paths)
T3 = sum_v C(d_v,3)          (claws K_{1,3})
P  = sum_{uv in E} (d_u-1)(d_v-1)     (3-edge paths P_4)
D2 = sum_{v in I} d_v = 2e - l
```

Leaves and isolated vertices contribute `0` to `S`, `T3` and `D2`.

## Overview

The forest is treated in three cases:

| case | handled by |
|---|---|
| `I = 0` (every component is `K_1` or `K_2`) | Step A |
| `I >= 1`, `e <= 5` | Step D (26 explicit "cores" + any number of isolated vertices) |
| `I >= 1`, `e >= 6` (so `n >= e+1 >= 7`) | Steps 1–5 give `Q_3 >= G(n,e,l,S)`; two regimes `R1`/`R2`; monotonicity in `n` (Step B) reduces to `n = e+1` (Step C) |

Step E checks all `85,624` forests with `n <= 16` directly and verifies every
identity and inequality below on those actual forests.

## Step 1 — exact coefficient formulas (cited)

For every forest (`REDUCTION_LEMMA_AND_PROVED_CASES.md`, Theorem 3.1 and
Proposition 3.3, proved there by inclusion–exclusion over edge subsets):

```text
p_2 = C(n,2) - e
p_3 = C(n,3) - e(n-2) + S
p_4 = C(n,4) - e C(n-2,2) + S(n-4) + C(e,2) - P - T3
```

Re-verified exactly on all forests with `n <= 16` (Step E).

## Step 2 — `P >= 0`, `p_2 >= 0`

`P` is a sum of products of non-negative integers; `p_2 = C(n,2) - e >= 0` since
`e <= n - 1 <= C(n,2)` for `n >= 2` (and `p_2 = 0` for `n = 1`). Hence

```text
Q_3 >= 3 p_3^2 + p_2^2 - 4 p_2 (p_4 + P).
```

## Step 3 — Cauchy–Schwarz lower bound for `T3` (needs `I >= 1`)

Put `x_v = C(d_v,2)`. For `d_v >= 1`, `x_v (d_v - 2) = 2 x_v^2 / d_v - x_v`
(both sides equal `d_v(d_v-1)(d_v-2)/2`) and `C(d_v,3) = x_v (d_v-2)/3`.
Summing over `I` (the only vertices with `x_v != 0`):

```text
3 T3 = sum_I 2 x_v^2/d_v - S  >=  2 (sum_I x_v)^2 / (sum_I d_v) - S = 2 S^2 / D2 - S,
```

by Cauchy–Schwarz (`(sum x_v^2/d_v)(sum d_v) >= (sum x_v)^2`), where
`D2 = sum_I d_v = 2e - l > 0` because `I >= 1` and every internal vertex has
`d_v >= 2` (so in fact `l <= 2e - 2`). Equality holds for stars.

## Step 4 — leaves, components and `S` (needs `I >= 1`)

**Lemma 4.** Let `F` be a forest with `I >= 1`. Then

* (a) `S <= C(l + 2 - 2c', 2) + e + c' - l - 1 <= Smax(l) := C(l,2) + e - l`;
* (b) `S >= e - c'` and `S >= I = e + c' - l`; consequently `l >= 2e - 2S`;
* (c) `1 <= S <= C(e,2)`, `2 <= 2c' <= l <= 2e - 2`.

*Proof.* Every non-trivial component is a tree on `>= 2` vertices and has
`>= 2` leaves, so `l >= 2c'`; `I >= 1` forces `c' >= 1`, so `l >= 2`;
`l <= 2e - 2` was shown in Step 3. `S >= 1` since some `d_v >= 2`; `S <= C(e,2)`
since `S` counts pairs of edges.

(a) `sum_I d_v = 2e - l` and `I = n' - l = e + c' - l`, so
`Y := sum_I (d_v - 1) = 2e - l - (e + c' - l) = e - c'`. Put `y_v = d_v - 1 >= 1`
for `v in I`; then `S = sum_I f(y_v)` with `f(y) = C(y+1,2) = y(y+1)/2`, which
is convex with increasing increments `f(y+1) - f(y) = y + 1`. If two entries
satisfy `y_i >= y_j >= 2`, replacing them by `(y_i + 1, y_j - 1)` keeps the sum
`Y` and all entries `>= 1`, and changes `S` by `(y_i + 1) - y_j >= 1 > 0`.
Repeating, `S` is maximised when one internal vertex takes
`y = Y - (I - 1) = l + 1 - 2c'` (this is `>= 1` because `l >= 2c'`) and the
other `I - 1` take `y = 1`:

```text
S <= f(l + 1 - 2c') + (I - 1) = C(l + 2 - 2c', 2) + e + c' - l - 1 =: h(c').
```

With `m = l + 2 - 2c' >= 2`,
`h(c'+1) - h(c') = C(m-2,2) - C(m,2) + 1 = (3 - 2m) + 1 = 4 - 2m = 4c' - 2l <= 0`,
so `h` is non-increasing in `c'` on `1 <= c' <= l/2` and `h(c') <= h(1) =
C(l,2) + e - l = Smax(l)`. (For `I = 1` the bound (a) is an equality.)

(b) `C(d,2) >= d - 1` for `d >= 1` (`(d-1)(d-2)/2 >= 0`), so
`S >= sum_I (d_v - 1) = e - c'`; and `C(d,2) >= 1` for `d >= 2`, so `S >= I =
e + c' - l`. Adding, `2S >= 2e - l`, i.e. `l >= 2e - 2S`. ∎

Both inequalities in (a), and (b), (c), are re-verified on all forests with
`n <= 16` in the script.

## Step 5 — the bound `G` and the two regimes (needs `I >= 1`)

With `c3 = C(n,3) - e(n-2)`, `c4 = C(n,4) - e C(n-2,2)`, Steps 1–3 give

```text
Q_3 >= G(n,e,l,S) := 3 (c3+S)^2 + p_2^2 - 4 p_2 ( c4 + S(n-4) + C(e,2) )
                     + (4 p_2 / 3) ( 2 S^2 / (2e - l) - S ).
```

`G` depends on `l` only through `(8 p_2/3) S^2/(2e-l)`, and
`dG/dl = (8 p_2/3) S^2/(2e-l)^2 >= 0` (checked symbolically), so `G` is
non-decreasing in `l` on `[0, 2e)`.

`Smax(x) = C(x,2) + e - x = (x^2 - 3x)/2 + e` is increasing on `[2, oo)`
(`Smax'(x) = x - 3/2`), with `Smax(2) = e - 1` and `Smax(e) = C(e,2)`.

**Regime R1: `S >= e - 1`.** Since `e - 1 <= S <= C(e,2)`, there is a unique
real `lambda in [2, e]` with `Smax(lambda) = S`, namely
`lambda = (3 + sqrt(9 - 8e + 8S))/2`. By Lemma 4(a), `Smax(l) >= S =
Smax(lambda)` with `l >= 2`, so `l >= lambda`, and monotonicity in `l` gives

```text
Q_3 >= G(n,e,lambda,Smax(lambda)) =: K(n,e,lambda),      K~ := 12 (2e - lambda) K.
```

`K~(n,e,lambda)` is a polynomial with integer coefficients (checked; printed
in the report and below), and `2e - lambda >= e > 0`.

**Regime R2: `1 <= S <= e - 1`.** By Lemma 4(b), `l >= 2e - 2S > 0`, so
monotonicity in `l` on `[2e-2S, l]` gives

```text
Q_3 >= G(n,e,2e-2S,S) = G0(n,e,S) := 3 (c3+S)^2 + p_2^2 - 4 p_2 ( c4 + S(n-4) + C(e,2) ),
```

because at `l = 2e - 2S` the Cauchy–Schwarz term is `2S^2/(2S) - S = 0`
(identity checked symbolically). Explicitly

```text
G0 = n^5/12 - n^4/12 - n^3/12 + n^2/12 + e n^4/6 - 2 e n^3 + 29 e n^2/6 - 3 e n
     - e^2 n - e^2 + 2 e^3 - S n^3 + 7 S n^2 - 6 S n - 2 S e n - 4 S e + 3 S^2 .
```

The two regimes overlap at `S = e - 1` and together cover every forest with
`I >= 1`.

```text
K~(n,e,lambda) =
  48e^4 - 24e^3 lambda - 72e^3 n - 48e^3 - 24e^2 lambda^2 n + 8e^2 lambda^2 + 108e^2 lambda n
  - 16e^2 lambda + 4e^2 n^4 - 72e^2 n^3 + 284e^2 n^2 - 216e^2 n + 10e lambda^4 + 12e lambda^3 n
  - 80e lambda^3 - 12e lambda^2 n^3 + 92e lambda^2 n^2 - 116e lambda^2 n + 150e lambda^2
  - 2e lambda n^4 + 72e lambda n^3 - 410e lambda n^2 + 340e lambda n + 2e n^5 - 2e n^4 - 2e n^3
  + 2e n^2 - 9 lambda^5 + 4 lambda^4 n^2 - 4 lambda^4 n + 54 lambda^4 + 6 lambda^3 n^3
  - 62 lambda^3 n^2 + 56 lambda^3 n - 81 lambda^3 - 18 lambda^2 n^3 + 150 lambda^2 n^2
  - 132 lambda^2 n - lambda n^5 + lambda n^4 + lambda n^3 - lambda n^2 .
```

At `n = e + 1` this is exactly the tree polynomial `K~(n,lambda)` of
`ISO3_TREES_THEOREM.md` (checked symbolically against the recorded
`K_tilde_ab` of `reports/iso3_trees_proof.json`).

## Step A — `I = 0`

Every component is `K_1` or `K_2`, so `I(F;x) = (1+2x)^e (1+x)^z`,
`p_k = sum_j C(e,j) 2^j C(z,k-j)`, and `Q_3` is a polynomial in `(e,z)`:

```text
Q_3 = ( 64e^5 + 144e^4 z - 208e^4 + 128e^3 z^2 - 320e^3 z + 224e^3 + 56e^2 z^3 - 168e^2 z^2
        + 208e^2 z - 80e^2 + 12e z^4 - 32e z^3 + 52e z^2 - 32e z + z^5 - z^4 - z^3 + z^2 ) / 12 ,
```

which coincides with `G0(2e+z, e, 0)` (consistent with Step 1: `S = T3 = P = 0`).
Two independent proofs that it is `>= 0`:

1. *Newton.* `(1+2x)^e (1+x)^z` is real-rooted, so by Theorem 7.1 of
   `REDUCTION_LEMMA_AND_PROVED_CASES.md` `Q_3 >= p_2^2 > 0` whenever
   `alpha = e + z >= 4`; if `alpha <= 3` then `p_4 = 0` and `Q_3 = 3p_3^2 + p_2^2 >= 0`.
2. *Polynomial certificate.* `Q_3(e, z+2)` has only non-negative coefficients
   (21 monomials, listed in the report), so `Q_3 >= 0` for `e >= 0`, `z >= 2`;
   `Q_3(e,0) = 4e^2 (e-1)^2 (4e-5)/3`, which is `0` at `e in {0,1}` and positive
   for integers `e >= 2`; `Q_3(e,1) = 4e^2 (4e^3 - 4e^2 + 2e + 1)/3 >= 0` for
   `e >= 0` (the cubic is increasing — its derivative `12e^2 - 8e + 2` has
   negative discriminant — and equals `1` at `e = 0`). Both univariate facts are
   certified by exact real-root isolation.

Numerically re-checked for all `e, z <= 30` (`Q_3 >= 0`, and `Q_3 >= p_2^2`
when `alpha >= 4`).

## Step B — monotonicity in `n` for `n >= e + 1`

Write `lambda = 2 + a`, `e = 2 + a + b`, `n = 3 + a + b + c` (so `a, b, c >= 0`
encode `2 <= lambda <= e`, `n >= e + 1`).

**(B1')** `K~(n,e,lambda) - K~(e+1,e,lambda)` is a polynomial in `(a,b,c)` with
55 monomials, all with positive integer coefficients, and no constant term
(it vanishes at `c = 0`); it is printed in the report as
`K_tilde_abc_minus_tree`. Hence, for all real `2 <= lambda <= e` and
`n >= e + 1`,

```text
K~(n,e,lambda) >= K~(e+1,e,lambda).
```

**(B1)** The successor difference `K~(n+1,e,lambda) - K~(n,e,lambda)` likewise
has 55 positive coefficients in `(a,b,c)` (`DeltaK_abc` in the report).

**(B2)** Write `S = s`, `e = 1 + s + u`, `n = 2 + s + u + c` (so `s, u, c >= 0`
encode `0 <= S <= e - 1`, `n >= e + 1`). Then

```text
G0(n+1,e,S) - G0(n,e,S) =
  5c^4/12 + 7c^3 s/3 + 7c^3 u/3 + 9c^3/2 + 9c^2 s^2/2 + 9c^2 s u + 19c^2 s/2 + 9c^2 u^2/2
  + 25c^2 u/2 + 145c^2/12 + 11c s^3/3 + 11c s^2 u + 11c s^2/2 + 11c s u^2 + 17c s u + 31c s/2
  + 11c u^3/3 + 23c u^2/2 + 33c u/2 + 12c + 13s^4/12 + 13s^3 u/3 + s^3/2 + 13s^2 u^2/2
  + 9s^2 u/2 + 5s^2/12 + 13s u^3/3 + 15s u^2/2 + 23s u/6 + 12s + 13u^4/12 + 7u^3/2
  + 41u^2/12 + 4u + 4 ,
```

all 35 coefficients positive. Telescoping over the integers
`m = e+1, ..., n-1` (each with `c = m - e - 1 >= 0`):

```text
G0(n,e,S) >= G0(e+1,e,S)     for all integers n >= e+1, 0 <= S <= e-1.
```

No shift of variables was needed in any of (B1), (B1'), (B2): the differences
are manifestly non-negative on the whole parameter cone.

## Step C — the base case `n = e + 1`

**(C1) Regime R1, `e >= 6`.** `K~(e+1,e,lambda) = K~_tree(a,b)` with
`a = lambda - 2`, `b = e - lambda`, i.e. the polynomial

```text
a^6 - a^5 b + 11a^5 + 10a^4 b^2 - 18a^4 b + 49a^4 + 48a^3 b^3 - 30a^3 b^2 - 67a^3 b + 113a^3
+ 63a^2 b^4 + 62a^2 b^3 - 221a^2 b^2 - 78a^2 b + 142a^2 + 33a b^5 + 72a b^4 - 143a b^3
- 278a b^2 - 4a b + 92a + 6b^6 + 18b^5 - 30b^4 - 114b^3 - 72b^2 + 24b + 24 ,
```

and `e >= 6` means `a + b = e - 2 >= 4`. It is `>= 0` on
`{a, b >= 0, a + b >= 4}` by the three certificates of the tree proof, which
the script re-runs:

* (C1a) `a, b >= 2`: `K~(a+2,b+2) = a^4 (a^2 - ab + 10b^2) + R(a,b)` with `R`
  having only non-negative coefficients (25 monomials) and
  `a^2 - ab + 10b^2 = (a - b/2)^2 + 39b^2/4`;
* (C1b) `0 <= a <= 2, b >= 4` (and symmetrically): each of the 7 coefficients
  of `K~(a, b+4)` as a polynomial in `b` is a univariate polynomial in `a` that
  is `>= 0` on `[0,2]` (exact Sturm root counting: no root in `(0,2)`, values
  `>= 0` at `0` and `2`, `> 0` at `1`);
* (C1c) the compact pieces `{0<=a<=2, 2<=b<=4, a+b>=4}` and
  `{2<=a<=4, 0<=b<=2, a+b>=4}`: exact Bernstein-coefficient subdivision (all
  Bernstein coefficients on a box `>= 0` implies the polynomial is `>= 0` on
  the box; boxes inside `a + b < 4` are irrelevant). Both pieces certify after
  one subdivision level.

Coverage: if `a, b >= 2` use (C1a); otherwise one variable is `< 2`, the other
`> 2`, and it is either `>= 4` (C1b) or in `(2,4)` (C1c).

Consequently, by (B1') and (C1), `K~(n,e,lambda) >= 0`, hence
`K(n,e,lambda) >= 0`, for all `e >= 6`, `n >= e+1`, `2 <= lambda <= e`.

**(C2) Regime R2, `e >= 5`.**

```text
G0(e+1,e,S) = 3S^2 - e(e-1)^2 S + e^2 (e-1)^2 (e-2)/4 .
```

Substituting `S = e - 1 - w`, `e = 5 + v` (`w, v >= 0` encode `S <= e-1`, `e >= 5`):

```text
G0 = v^5/4 + 17v^4/4 + v^3 w + 107v^3/4 + 13v^2 w + 303v^2/4 + 50v w + 90v + 3w^2 + 56w + 28 ,
```

all 11 coefficients positive. So `G0(e+1,e,S) >= 28 > 0` for `e >= 5`,
`S <= e - 1`. (Elementary reading: `G0(e+1,e,S)` is a convex quadratic in `S`
with vertex `e(e-1)^2/6 >= e - 1` for `e >= 3`, hence decreasing on `[0,e-1]`,
and `G0(e+1,e,e-1) = (e-1)^2 (e^3 - 6e^2 + 4e + 12)/4 > 0` for `e >= 5`; it is
negative at `(e,S) = (3,2)` and `(4,3)`, which is one reason `e <= 5` is
handled separately.)

Consequently, by (B2) and (C2), `G0(n,e,S) >= 0` for all integers `n >= e+1`,
`e >= 5`, `0 <= S <= e-1`.

## Step D — `I >= 1` and `e <= 5`

Let `F'` be the forest obtained from `F` by deleting its `z` isolated vertices
("core"): `F'` has no isolated vertex, the same `e` and `I`, and `n' = e + c'`
vertices. Since `I >= 1`, some component has `>= 2` edges, so `c' <= e - 1` and
`3 <= n' <= 2e - 1 <= 9`. Enumerating all forests on `3..9` vertices
(`erdos993lib.trees.forest_polys`) and keeping those without a `K_1`
component, not all of whose components are `K_2`, with `e <= 5`, gives exactly
26 cores (1, 3, 7, 15 with `e = 2, 3, 4, 5`). Since
`I(F;x) = (1+x)^z I(F';x)`, `p_k(F) = sum_j p_j(F') C(z,k-j)` and
`Q_3(F' + zK_1)` is an explicit polynomial in `z`; the script computes each one
exactly and certifies `>= 0` for every integer `z >= 0` by exact real-root
isolation (all real roots are negative and the value at `z = 0` is positive, so
in fact each polynomial is positive for every real `z >= 0`). Every one of the
26 polynomials even has positive coefficients:

| # | n' | component orders | e | l | S | I(F';x) | 12 Q_3(F' + z K_1) |
|---|----|------------------|---|---|---|---------|---------------------|
| 1 | 3 | 3 | 2 | 2 | 1 | [1, 3, 1] | z^5 + 18z^4 + 65z^3 + 84z^2 + 48z + 12 |
| 2 | 4 | 4 | 3 | 2 | 2 | [1, 4, 3] | z^5 + 25z^4 + 143z^3 + 323z^2 + 312z + 108 |
| 3 | 4 | 4 | 3 | 3 | 3 | [1, 4, 3, 1] | z^5 + 25z^4 + 131z^3 + 263z^2 + 264z + 144 |
| 4 | 5 | 5 | 4 | 2 | 3 | [1, 5, 6, 1] | z^5 + 32z^4 + 257z^3 + 838z^2 + 1092z + 468 |
| 5 | 5 | 5 | 4 | 3 | 4 | [1, 5, 6, 2] | z^5 + 32z^4 + 245z^3 + 766z^2 + 1080z + 576 |
| 6 | 5 | 5 | 4 | 4 | 6 | [1, 5, 6, 4, 1] | z^5 + 32z^4 + 221z^3 + 598z^2 + 840z + 720 |
| 7 | 5 | 3+2 | 3 | 4 | 1 | [1, 5, 7, 2] | z^5 + 30z^4 + 265z^3 + 984z^2 + 1480z + 732 |
| 8 | 6 | 6 | 5 | 2 | 4 | [1, 6, 10, 4] | z^5 + 39z^4 + 407z^3 + 1761z^2 + 3072z + 1776 |
| 9 | 6 | 6 | 5 | 3 | 5 | [1, 6, 10, 5, 1] | z^5 + 39z^4 + 395z^3 + 1653z^2 + 2856z + 1620 |
| 10 | 6 | 6 | 5 | 4 | 6 | [1, 6, 10, 6, 1] | z^5 + 39z^4 + 383z^3 + 1569z^2 + 2904z + 2016 |
| 11 | 6 | 6 | 5 | 3 | 5 | [1, 6, 10, 5] | z^5 + 39z^4 + 395z^3 + 1677z^2 + 3120z + 2100 |
| 12 | 6 | 6 | 5 | 4 | 7 | [1, 6, 10, 7, 2] | z^5 + 39z^4 + 371z^3 + 1461z^2 + 2688z + 2004 |
| 13 | 6 | 6 | 5 | 5 | 10 | [1, 6, 10, 10, 5, 1] | z^5 + 39z^4 + 335z^3 + 1137z^2 + 2040z + 2400 |
| 14 | 6 | 4+2 | 4 | 4 | 2 | [1, 6, 11, 6] | z^5 + 37z^4 + 407z^3 + 1919z^2 + 3864z + 2748 |
| 15 | 6 | 4+2 | 4 | 5 | 3 | [1, 6, 11, 7, 2] | z^5 + 37z^4 + 395z^3 + 1787z^2 + 3408z + 2160 |
| 16 | 6 | 3+3 | 4 | 4 | 2 | [1, 6, 11, 6, 1] | z^5 + 37z^4 + 407z^3 + 1895z^2 + 3600z + 2220 |
| 17 | 7 | 5+2 | 5 | 4 | 3 | [1, 7, 16, 13, 2] | z^5 + 44z^4 + 585z^3 + 3370z^2 + 8444z + 7620 |
| 18 | 7 | 5+2 | 5 | 5 | 4 | [1, 7, 16, 14, 4] | z^5 + 44z^4 + 573z^3 + 3226z^2 + 7976z + 7056 |
| 19 | 7 | 5+2 | 5 | 6 | 6 | [1, 7, 16, 16, 9, 2] | z^5 + 44z^4 + 549z^3 + 2914z^2 + 6728z + 5376 |
| 20 | 7 | 4+3 | 5 | 4 | 3 | [1, 7, 16, 13, 3] | z^5 + 44z^4 + 585z^3 + 3346z^2 + 8132z + 6852 |
| 21 | 7 | 4+3 | 5 | 5 | 4 | [1, 7, 16, 14, 6, 1] | z^5 + 44z^4 + 573z^3 + 3178z^2 + 7352z + 5520 |
| 22 | 7 | 3+2+2 | 4 | 6 | 1 | [1, 7, 17, 16, 4] | z^5 + 42z^4 + 577z^3 + 3516z^2 + 9520z + 9420 |
| 23 | 8 | 4+2+2 | 5 | 6 | 2 | [1, 8, 23, 28, 12] | z^5 + 49z^4 + 783z^3 + 5579z^2 + 17912z + 21324 |
| 24 | 8 | 4+2+2 | 5 | 7 | 3 | [1, 8, 23, 29, 16, 4] | z^5 + 49z^4 + 771z^3 + 5375z^2 + 16760z + 18960 |
| 25 | 8 | 3+3+2 | 5 | 6 | 2 | [1, 8, 23, 28, 13, 2] | z^5 + 49z^4 + 783z^3 + 5555z^2 + 17552z + 20220 |
| 26 | 9 | 3+2+2+2 | 5 | 8 | 1 | [1, 9, 31, 50, 36, 8] | z^5 + 54z^4 + 1001z^3 + 8448z^2 + 32808z + 47964 |

(Cores with the same component orders but different `I(F';x)` are different
trees of that order, e.g. rows 9/11 are the two trees on 6 vertices with `S = 5`.)
The polynomials are cross-checked against direct computation for `z <= 6`, and
the script verifies that every forest with `n <= 16`, `I >= 1`, `e <= 5` is
indeed (one of these cores) `+ z K_1` (by exact division of `I(F;x)` by
`(1+x)^z`).

Remark: this step uses the exact `Q_3`, not the bound `G`, because `G` can be
negative for tiny `n` where the bound is lossy (e.g. `K~(6,5,lambda) < 0` at
`lambda = 7/2`, see the remarks), whereas `Q_3(F' + zK_1)` itself is a clean
polynomial in `z`.

## Step E — direct verification

All `85,624` non-isomorphic forests with `n <= 16` (counts match OEIS A005195)
satisfy `Q_3 >= 0` by exact computation (`min Q_3 = 0`, attained by `K_1` and
`K_2`, where `p_2 = p_3 = 0`). On each of them the
script also checks: the formulas of Step 1; `P >= 0`, `p_2 >= 0`; for `I >= 1`
the Cauchy–Schwarz bound, both inequalities of Lemma 4(a), Lemma 4(b), (c),
`Q_3 >= G(n,e,l,S)`; in `R1` the exact inequality
`12(2e - lambda) Q_3 >= K~(n,e,lambda)` at `lambda = (3 + sqrt(9-8e+8S))/2`
(computed exactly in `Q(sqrt D)`); in `R2` `Q_3 >= G(n,e,l,S) >= G0(n,e,S)`;
and for `I = 0` that `I(F;x) = (1+2x)^e (1+x)^z` and `Q_3 = G0(2e+z,e,0)`.

## Proof of the theorem

Let `F` be a forest.

* If `I = 0`: Step A.
* If `I >= 1` and `e <= 5`: `F = F' + zK_1` for one of the 26 cores; Step D.
* If `I >= 1` and `e >= 6`: then `n >= n' = e + c' >= e + 1 >= 7`. By Step 5,
  `Q_3 >= G(n,e,l,S)`, and
  * if `S >= e - 1` (R1): `Q_3 >= K(n,e,lambda) = K~(n,e,lambda) / (12(2e-lambda))`
    with `2 <= lambda <= e`; `K~(n,e,lambda) >= K~(e+1,e,lambda) >= 0` by (B1')
    and (C1);
  * if `S <= e - 1` (R2): `Q_3 >= G0(n,e,S) >= G0(e+1,e,S) >= 0` by (B2) and
    (C2) (which need only `e >= 5`, `0 <= S <= e-1`).

In every case `Q_3(F) >= 0`. ∎

## What is certified, and what is not

Certified by the script (35 `PASS` steps, exact arithmetic):

* self-tests of all four certificate routines on a known-negative and a
  known-positive polynomial (coefficient certificate; Sturm interval
  certificate; integer certificate via exact root isolation; Bernstein
  subdivision) and of the exact sign routine in `Q(sqrt D)`;
* the symbolic identities of Step 5 (`K~` integral, `dG/dl`, `G0` identity,
  properties of `Smax`), and agreement of the `Fraction` implementations with
  the symbolic ones;
* Step A (identity, coefficient certificate for `z >= 2`, univariate
  certificates for `z = 0, 1`, numeric check `e, z <= 30`);
* Steps (B1), (B1'), (B2) (all coefficients non-negative, no shift);
* Step (C1) (agreement with the tree polynomial; (C1a), (C1b), (C1c); coverage;
  and the remark `K~(6,5,7/2) = -7947/32 < 0`), Step (C2) (closed form and
  coefficient certificate; plus the remark on the weaker `l >= 2` bound);
* Step D (26 cores; each `Q_3(F'+zK_1) >= 0` for all integers `z >= 0`; coverage
  for `n <= 16`);
* Steps 1–5 and E on all forests with `n <= 16`.

Cited, not re-proved here: the coefficient formulas (Theorem 3.1, Proposition
3.3 of `REDUCTION_LEMMA_AND_PROVED_CASES.md`; re-verified numerically for
`n <= 16`) and, for the *alternative* proof of Step A only, Newton's
inequalities (Theorem 7.1 there). Elementary lemmas proved in this note:
Steps 2, 3, 4 and the reductions of Step 5; the convexity argument of Lemma 4(a)
and the case split are the only non-machine-checked ingredients, and they are
written out above.

**No step is missing.** The marker `PASS_EXACT_ISO3_ALL_FORESTS_ROOT` is printed
only when every step passes; a failing step prints `FAIL`, the marker
`ISO3_FORESTS_INCOMPLETE`, and exits non-zero (both failure paths were exercised
on modified copies of the script).

## Remarks

* **The `c' = 1` relaxation covers all forests.** Regime R1 uses only
  `S <= Smax(l) = C(l,2) + e - l`, which is the `c' = 1` value `h(1)` of the true
  bound `h(c')` of Lemma 4(a). Since `h` is non-increasing in `c'`, the bound
  used is *weaker* than the truth for `c' >= 2`; so nothing is lost in validity
  (only in sharpness), and the R1 argument applies verbatim to every forest with
  `I >= 1`. Isolated vertices enter only through `n`, which is handled by the
  monotonicity certificates (B1'), (B2).
* **Why `l >= 2e - 2S` in R2.** The plan of record suggested using only
  `l >= 2` when `S < e - 1`. That would also work: the script checks (as a
  remark step, not used in the proof) that `3(2e-2) G(e+1,e,2,S)` with
  `S = e-1-w`, `e = 5+v` has only non-negative coefficients. But at `l = 2` the
  Cauchy–Schwarz term `2S^2/(2e-2) - S` is negative for `S < e - 1`, whereas
  Lemma 4(b) gives the stronger `l >= 2e - 2S`, at which that term vanishes
  exactly. This makes the R2 polynomial `G0` denominator-free and its
  certificates (B2), (C2) pure coefficient-positivity statements.
* **Why `e <= 5` needs Step D.** `K~(6,5,lambda) = -9lambda^5 + 224lambda^4 -
  721lambda^3 - 1810lambda^2 + 7700lambda - 3000` equals `-7947/32` at
  `lambda = 7/2`, so the tree certificate cannot be pushed to `n = e+1 = 6`,
  and `G0(e+1,e,e-1) < 0` at `e = 3, 4`. Rather than patching the bounds, Step D
  certifies the exact `Q_3` for the finitely many cores.
* **Where the parameters are real and where integer.** (B1'), (C1), (A) for
  `z >= 2`, and (C2) hold for real parameters in the stated cones; (B2) is used
  by telescoping over integer `n`; Step D and the `z = 0, 1` cases of Step A
  are integer statements (some of those polynomials are negative at non-integer
  points, which is why exact root isolation plus finite integer checks is used
  there).
* The bound is far from tight (already for trees `G/(p_2 p_3) >= 0.27` while
  `Q_3/(p_2 p_3) >= 1.09` on trees); the slack is what allows the crude
  `P >= 0` and Cauchy–Schwarz estimates to suffice, exactly as in the tree case.
* Together with `ISO_1`, `ISO_2` (all forests) and `WR_3` (Theorem 11.2 of
  `REDUCTION_LEMMA_AND_PROVED_CASES.md`), this closes the item
  "`ISO_3` for forests remains open" of that document's Section 11; `ISO_r`
  for `r >= 4` is untouched.
