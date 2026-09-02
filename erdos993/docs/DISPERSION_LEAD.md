# A single-level sufficient condition: the dispersion inequality (lead, not a theorem)

Replay: `python3 scripts/probe_dispersion.py --trees-max 19 --forests-max 16`
(report `reports/dispersion_probe.json`).

## Setting

For a forest `F` on `n` vertices and `0 <= k < alpha`, let `U_k` be the uniform
distribution on the independent `k`-sets `T`, and

```text
e(T) = n - |N[T]|        (number of one-vertex extensions of T; N[T] = closed neighbourhood)
```

Everything below is exact and machine-checked in the script (the DP for the
joint distribution of `(|T|, |N[T]|)` is cross-checked against brute force).

## Four exact facts

**(i)** `E_k[e] = (k+1) p_{k+1} / p_k` (each independent `(k+1)`-set is an
extension of exactly `k+1` of its subsets).

**(ii)** For an independent `k`-set `S` and any `T = S - {v}`,
`e(S) = e(T) - |N[v] ∩ Free(T)| <= e(T) - 1`. Summing over the `k` subsets of
every `S` and over all `S`:

```text
k (k+1) p_{k+1}  <=  sum_{|T| = k-1} e(T)^2  -  k p_k .
```

**(iii)** Consequently, writing `mu = E_{k-1}[e] = k p_k / p_{k-1}`,

```text
Var_{U_{k-1}}(e) <= E_{U_{k-1}}(e)     ==>     k p_k^2 >= (k+1) p_{k-1} p_{k+1}     (FLC_k),
```

and `FLC_k` implies `ISO_k` with `Q_k = [k p_k^2 - (k+1) p_{k-1} p_{k+1}] + p_{k-1}^2 >= p_{k-1}^2`.
(`FLC` = "factorial log-concavity": the sequence `r! p_r` is log-concave;
equivalently the average number of extensions of a random independent set is
non-increasing in its size.)

**(iv)** `sum_{|T|=k} e(T)(e(T)-1) = (k+1)(k+2) p_{k+2} + 2 M_k`, where
`M_k = #{(T, uv in E) : u, v both free for T}`. Hence

```text
DISPERSION_k :  Var_k(e) <= E_k(e)   <=>   (k+1)^2 p_{k+1}^2 - (k+1)(k+2) p_k p_{k+2}  >=  2 M_k p_k ,
```

i.e. the dispersion inequality is exactly `FLC_{k+1}` strengthened by the
explicit non-negative term `2 M_k p_k`. In probabilistic language it says
`E_k[e(e-1)] <= (E_k e)^2`: the extension count is sub-Poissonian.

So the chain is

```text
DISPERSION_{r-1}  ==>  FLC_r  ==>  ISO_r  ==>  (with WR_r and the Levit–Mandrescu tail)  unimodality,
```

and the framework needs it only for `r <= L(alpha) - 1`, i.e. `DISPERSION_k`
for `k <= L(alpha) - 2`.

## Evidence

- All trees with `n <= 19` and all forests with `n <= 16`: `DISPERSION_k`
  holds at every prefix level. The maximal ratio `Var/E` is attained by the
  star `K_{1,m}` at level `k = 1`, where it equals `(m-1)/(m+1)` exactly
  (`-> 1`, never reaching it; at levels `k >= 2` the star has `e` constant,
  `Var = 0`).
- Structured families to order ~250 (paths, double brooms, `T_{3,m,n}`,
  `T*_{3,m,n}`, bushes, spiders, multi-arm stars): no failure; typical ratios
  `0.13–0.55`. In particular the published non-log-concave trees satisfy the
  dispersion inequality on the whole prefix with ratio `~0.13`.
- `FLC` itself holds at *every* index for all trees `n <= 20` and fails, in
  the non-log-concave families, exactly at the indices where log-concavity
  fails (all in the tail `r >= L`).

## What is proved about it

`DISPERSION_1` holds for every forest: with `M_1 = n e - 2e - 2S`
(`S = sum_v C(d_v,2)`), the inequality reads
`2 (C(n,2)-e)^2 - 3n C(n,3) + 2n(n-2) e - n S >= 0`; using `S <= C(e,2)` the
right side is concave in `e` for `n >= 5` with values `n^2(n-1)/2` at `e = 0`
and `(n-1)(n-2)` at `e = n-1`, and `n <= 4` is checked directly. (This is the
dispersion analogue of the `ISO_2` theorem; it is consistent with the star's
ratio `(m-1)/(m+1)`.)

## Why it is interesting, and what it is not

- It is a **single-level** statement about one uniform measure `U_k`, not a
  relation between three consecutive coefficients, so it is amenable to
  coupling / correlation arguments rather than only to algebraic "payment"
  inductions. In covariance form it says
  `sum_{v != w} Cov_k(F_v, F_w) <= sum_v P_k(F_v)^2` where `F_v` is the event
  "`v` is free"; pairs at distance `>= 3` tend to be negatively correlated
  (fixed size), pairs at distance `<= 2` positively.
- Negative association of `U_k` would make it easy, but `U_k` is **not**
  negatively associated even on paths (`P_4`, `k = 2`: the occupation events of
  the two vertices at distance 2 are positively correlated), so a proof must
  control the positive short-range covariances against `sum_v P(F_v)^2`.
- It is stronger than the framework needs, and it is **not proved** for
  `k >= 2`. It is recorded here because it is the cleanest candidate found in
  this project for a statement that could be proved by a genuinely different
  method than coefficient algebra, and because it has real slack on every
  family except stars (which are handled exactly).
