# Rank-eight `V_8` finite reduction and exact lower-band certificate

Date: 2026-08-16

Status: **proved for every forest `F` with `alpha(F)>=14`**.  Orders
14--29 are covered by exact exhaustive certificates, and every order at
least 30 is covered by the analytic reduction.  This proves the standalone
`V_8` residual theorem only; it does not by itself prove `Q_8`, the full
rank-eight pendant step, or Erdos Problem 993.

## 1. Statement and moment identity

For `I(F;x)=sum_j b_j x^j`, put

```text
V_8(F)=10 b_6 b_7+136 b_6 b_8-98 b_7^2.
```

For a uniform independent six-set `S`, write

```text
X=|V(F-N[S])|,  C=components(F-N[S]),  u=E[X]=7b_7/b_6.
```

The exact residual-forest double count in
`UNIFORM_VK_LARGE_ORDER_REDUCTION_2026-08-16.md` specializes to

```text
V_8/(b_6 b_7)=3u-41+17(Var(X)+2E[C])/u.             (1)
```

Thus the already-proved uniform theorem gives `V_8>=0` from order 31.
The next section improves that endpoint by one full order.

## 2. Analytic theorem for every order at least 30

The proved sharp forest rank-(4,5) path ratio is

```text
mu_4=5b_5/b_4 >= (n-7)(n-8)/(n-3).                  (2)
```

For a forest, the exact discrete two-extension transfer is

```text
mu_(j+1) >= g(mu_j),
g(t)=2 Phi(t)/t,
Phi(q)=C(q-1,2) at integers q>=2,
```

with linear interpolation between consecutive integers.  On
`q<=t<=q+1`,

```text
g(t)=2(q-1)-(q-1)(q+2)/t,                            (3)
```

so `g` is increasing.

At `n=30`, three exact endpoints are

```text
mu_4 >= 506/27,
mu_5 >= 4012/253,
mu_6 >= 1533/118,
mu_7 >= 2222/219.
```

Consequently

```text
10+17mu_7-14mu_6 >= 7787/12921 > 0,                 (4)
```

which is exactly `V_8/(b_6b_7)`.

The path-ratio endpoint in (2) increases with `n`, and (3) preserves
that order.  It remains only to check that the final functional
`M(t)=10+17g(t)-14t` is increasing over the reached range.  On
`q<=t<=q+1`,

```text
M'(t) >= [3q^2-11q-48]/(q+1)^2 > 0  for q>=7.
```

Here `mu_6>=1533/118>12`, so (4) proves

```text
V_8(F)>0 for every forest F with |F|>=30.             (5)
```

No independence-number restriction is needed in (5).

## 3. Exact orders 14--20

`scan_rank8_v8_forest_polynomials.py` constructs every distinct full
independence polynomial of a forest through order 20.  It checks the
classical free-tree counts, checks the independently frozen counts of
distinct forest-polynomial rows, and filters the exact theorem range
`alpha>=14`.  Polynomial deduplication is logically safe: both `alpha`
and `V_8` depend only on the full row.

The eligible counts at orders 14--20 are

```text
1, 15, 156, 1326, 9880, 62738, 339029.
```

There are no negative eligible rows.  The global minimum is

```text
V_8=175207032
```

at the edgeless order-14 forest, with polynomial `(1+x)^14`.

## 4. Exact orders 21--24

`verify_forest_v8_medium_trees.rs` uses the canonical WROM free-tree
successor and signed 128-bit integer polynomial recursion.  Disconnected
coverage is exact: either every component has order at most 12, or there
is a unique component of order at least 13 and an exact remainder of
order at most 11.  Canonical component multisets enumerate every
unlabeled forest once.

| order | free trees | eligible forests (`alpha>=14`) | minimum `V_8` |
|---:|---:|---:|---:|
| 21 | 2,144,505 | 1,922,933 | 985,659,794 |
| 22 | 5,623,756 | 7,765,929 | 1,487,037,358 |
| 23 | 14,828,074 | 26,973,172 | 2,024,481,632 |
| 24 | 39,299,897 | 82,791,524 | 2,961,176,736 |

Every displayed minimum is strictly positive.  The detailed exact report
is `rank8_v8_forest_orders21_24_exact_20260816.json`.

## 5. Exact orders 25--29 and closure of the finite band

Combining Sections 2--4 with the order-20 report leaves exactly

```text
25 <= |F| <= 29,  alpha(F)>=14.                         (6)
```

The same Rust verifier checks every WROM free tree and splits every
disconnected forest canonically into either all components of order at
most `floor(n/2)`, or its unique larger component plus an exact
small-forest remainder.  This is a disjoint exhaustive partition.

| order | free trees | eligible forests (`alpha>=14`) | minimum `V_8` |
|---:|---:|---:|---:|
| 25 | 104,636,890 | 233,492,567 | 6,248,384,816 |
| 26 | 279,793,450 | 631,168,028 | 16,005,146,410 |
| 27 | 751,065,460 | 1,686,705,630 | 39,962,180,160 |
| 28 | 2,023,443,032 | 4,514,955,632 | 115,475,854,032 |
| 29 | 5,469,566,585 | 12,132,227,370 | 293,387,717,238 |

Every minimum is strictly positive.  At orders 27--29 every forest is
bipartite and hence has `alpha>=ceil(n/2)>=14`; the eligible totals above
agree exactly with the Euler transform of the independently asserted
free-tree counts:

```text
1686705630, 4514955632, 12132227370.
```

The two largest scans were partitioned for low-memory parallel replay.
The order-29 tree stream used 12 congruence classes of accepted canonical
WROM indices.  Each process independently replayed the full successor
stream, asserted the classical total of `5469566585`, and evaluated one
disjoint congruence class.  A second 12-way pass shared each order-28 tree
polynomial between the order-28 tree check and the order-29 class formed
by adjoining an isolated vertex.  The shard counts sum exactly to
`2023443032`.  An independent monolithic order-28 run agreed on both the
minimum and its witness polynomial:

```text
[1,28,351,2600,12650,42504,100947,170544,203490].
```

Coefficient arithmetic through `i_8` is exact in `u32`: every state has
at most 29 vertices, so every coefficient is at most
`C(29,8)=4292145`; every nonnegative multiplication addend and partial sum
counts a subfamily of the final independent sets.  The signed `V_8`
products are evaluated in `i128`.

Combining this exact band with (5) proves

```text
V_8(F)>=0 for every forest F with alpha(F)>=14.          (7)
```

## 6. Replay

```powershell
python .\scan_rank8_v8_forest_polynomials.py --maximum 20
rustc -O --target x86_64-pc-windows-gnu .\verify_forest_v8_medium_trees.rs -o .\verify_forest_v8_medium_trees_native.exe
.\verify_forest_v8_medium_trees_native.exe
python .\assemble_rank8_v8_high_band_phases.py
python .\verify_rank8_v8_alpha14_finite_reduction.py
```

The first command prints

```text
PASS_EXACT_V8_FOREST_POLYNOMIAL_CENSUS_THROUGH_ORDER_20
```

The medium replay terminates with

```text
PASS_EXACT_FOREST_V8_ALPHA14_ORDERS21_24
```

The source also accepts monolithic `--target 25` through `--target 29`,
or the logged `--phase` / `tree-shard` modes used by the high-band report.
The two fast certificate assemblers terminate with

```text
PASS_EXACT_FOREST_V8_ALPHA14_ORDERS25_29
PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS
```

The detailed high-band certificate is
`rank8_v8_forest_orders25_29_exact_20260816.json`; the final analytic and
finite-band assembly is
`rank8_v8_alpha14_finite_reduction_exact_20260816.json`.
`write_rank8_v8_certificate_hashes.py` verifies that every redirected
process stderr file is empty and writes SHA-256 hashes for the note,
sources, reports, and every nonempty exact-scan transcript to
`rank8_v8_alpha14_certificate_hashes_20260816.json`.
