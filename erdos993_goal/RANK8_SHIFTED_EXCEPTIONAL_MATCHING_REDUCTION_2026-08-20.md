# Rank-eight shifted exceptional-core matching reduction

Date: 2026-08-20

Status: **exact structural reduction, with two new whole-family cells closed
conditional on the rank-seven `Q7` theorem.  No WROM tree stream and no
symbolic tensor are used.**

## 1. The exceptional band has exactly twelve cells

For a forest, bipartite matching gives

```text
alpha(A)=|A|-nu(A).
```

Hence a tree core with `21<=n<=26` and `alpha(A)<=13` lies in exactly one of

```text
n=21: alpha=11,12,13
n=22: alpha=11,12,13
n=23: alpha=12,13
n=24: alpha=12,13
n=25: alpha=13
n=26: alpha=13.
```

There are twelve cells, not a broad unstructured order band.

For the terminal family

```text
I(G_t;x)=(1+x)^t I(A;x)+xI(A-q;x),
```

the first required sibling count is

```text
t0=14-alpha(A).
```

Because the construction adds one support and `t` leaves,

```text
|G_t0|=|A|+t0+1,
alpha(G_t0)=14,
nu(G_t0)=nu(A)+1.
```

The twelve cells map to the six `alpha=14` boundary orders 23 through 28:

| core `n` | core `alpha` | `t0` | threshold order | threshold matching |
|---:|---:|---:|---:|---:|
| 21 | 11 | 3 | 25 | 11 |
| 21 | 12 | 2 | 24 | 10 |
| 21 | 13 | 1 | 23 | 9 |
| 22 | 11 | 3 | 26 | 12 |
| 22 | 12 | 2 | 25 | 11 |
| 22 | 13 | 1 | 24 | 10 |
| 23 | 12 | 2 | 26 | 12 |
| 23 | 13 | 1 | 25 | 11 |
| 24 | 12 | 2 | 27 | 13 |
| 24 | 13 | 1 | 26 | 12 |
| 25 | 13 | 1 | 27 | 13 |
| 26 | 13 | 1 | 28 | 14 |

## 2. The matching-quotient certificate already proves the threshold value

The completed matching-quotient boundary report stores `q_negative=0` in
every `alpha=14` cell through its maximum possible order 28.  The independent
polynomial census supplies the base through order 18.  Since every
non-edgeless forest has a pendant edge, these no-gap certificates imply the
standalone corollary

```text
Q8(F)>=0 for every forest F with alpha(F)=14.
```

The six threshold cells used here are backed by 29,431,868,032 exact pendant
support states.  Therefore

```text
Q8(G_t0)>=0
```

for every one of the twelve exceptional cells, without a new enumeration.

The same report has `q_negative=0` in every `alpha=13` cell through maximum
order 26, so it also proves

```text
Q8(F)>=0 for every forest F with alpha(F)=13.
```

This useful standalone boundary corollary was implicit in the coupled PGC
certificate but had not been isolated as the exceptional-core payment.

## 3. Two entire terminal-family cells are now closed

For core cells `(n,alpha)=(21,13),(22,13)`:

1. `Q8(A)>=0` by the `alpha=13` matching-quotient corollary.
2. `alpha(A-q)>=12`, so `Q7(A-q)>=0` conditional on the rank-seven target
   theorem.
3. The exact all-root order-21/22 census proves residual `Delta0` through
   `Delta4` nonnegative.
4. The existing all-order packages prove residual `Delta5` through
   `Delta15` nonnegative.

The literal terminal identity therefore proves

```text
Q8(G_t)>=0 for every t>=1
```

in those two cells, conditional only on the named rank-seven dependency.

For the remaining `alpha=13` cells at orders 23--26, both reserve terms are
paid the same way.  Since the threshold value is already paid separately,
only residual `Delta1` through `Delta4` remain.

## 4. Every high shifted coefficient is already paid

The two reserve terms in the exact terminal identity are multiples of
`p7(t)`, hence have degree seven.  The residual packages prove `Delta5`
through `Delta15` nonnegative all-order.  After shifting from `1` to `t0`,
residual coefficient `C_j` is a nonnegative binomial sum of the original
`Delta^k`, `k>=j`.

Therefore, in every one of the twelve exceptional cells,

```text
C8,...,C15 >= 0.
```

The entire unresolved shifted band is only `C1` through `C7`; `C0` is paid
by the `alpha=14` matching boundary.

## 5. Why threshold positivity does not close the other six cells

Let `P=I(G_t;x)=sum p_jx^j` at the threshold and `H=I(A-q;x)=sum h_jx^j`.
Adding one more sibling leaf gives

```text
p'_j=p_j+p_(j-1)-h_(j-2).
```

Put `d_j=p_(j-1)-h_(j-2)`.  Exact expansion gives the first shifted
coefficient

```text
C1=
 16(2p8d8+d8^2)
 -(p7d8+p8d7+d7d8)
 -18(p7d9+p9d7+d7d9).
```

Thus `Q8(P)>=0` alone does not determine `C1`.  The exact relaxed jet

```text
(p7,p8,p9,d7,d8,d9)=(1,1,0,1,0,1)
```

has

```text
Q8(P)=15,
C1=-37.
```

This is explicitly a relaxed non-graph witness, not a forest
counterexample.  It proves that the boundary report's aggregate
`q_negative=0` statistic cannot be promoted algebraically to a shifted-family
certificate.  Per-support full/reduced jets or a new structural inequality
are required.

## 6. Exact remaining matrix

```text
alpha=13, core orders 23--26:
    C0 and C5--C15 paid;
    Q8(A) and conditional Q7(A-q) paid;
    only residual Delta1--Delta4 remain.

alpha=12, core orders 21--22:
    C0 and C8--C15 paid;
    residual Delta1--Delta15 paid;
    only reserve-coupled C1--C7 remain.

alpha=12, core orders 23--24:
    C0 and C8--C15 paid;
    C1--C7 remain, with residual Delta1--Delta4 also open.

alpha=11, core orders 21--22:
    C0 and C8--C15 paid;
    residual Delta1--Delta15 paid;
    only reserve-coupled C1--C7 remain.
```

This is the precise finite-state obstruction after exploiting all currently
stored matching-boundary information.

## 7. Replay and hashes

Run

```powershell
python .\verify_rank8_shifted_exceptional_matching_reduction.py
```

Expected marker:

```text
PASS_EXACT_RANK8_SHIFTED_EXCEPTIONAL_MATCHING_REDUCTION
```

Current SHA-256 values are

```text
verify_rank8_shifted_exceptional_matching_reduction.py
22B515E8FB7D19C60D2096E1954C3205BA96EFF536DC943A606FAAB775424557

rank8_shifted_exceptional_matching_reduction_exact_20260820.json
83557E53337D7521301A82CBBF8A772CF1BDCED0B7B828F3202A450D520B3F20
```
