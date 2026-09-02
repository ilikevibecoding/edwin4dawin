# Maximum-set Hall-excess reduction of WR and the pointed boundary

Date: 2026-08-29

Status: **exact all-graph reduction.**  The final Hall-excess boundary
payment remains open for forests, so this is not a proof of WR, unimodality,
or Erdos Problem 993.

Fix a graph `G`, a maximum independent set `A` of size `alpha`, and put
`C=V(G)-A`.  For every independent `Y` contained in `C`, write

```text
y=|Y|,  d=|N(Y) intersect A|,  e=d-y.
```

Maximality of `A` gives `e>=0`: otherwise replacing `N(Y) intersect A` by
`Y` would make an independent set larger than `A`.  Partitioning every
independent set by its exact `C`-part proves the Boolean-interval identity

```text
I(G;x)=sum_(Y independent in C) x^y (1+x)^(alpha-d).       (1)
```

The top degree of the `Y` interval is `alpha-e`; it depends only on the Hall
excess.

For `W_r=r i_r-i_(r-1)`, the contribution of `Y` is

```text
w_r(Y)=r C(alpha-d,r-y)-C(alpha-d,r-1-y).                  (2)
```

There are exactly three cases.

1. If `e>=alpha-r+2`, the interval ends below rank `r-1` and contributes 0.
2. If `e=alpha-r+1`, the interval ends exactly at rank `r-1` and contributes
   exactly `-1`.
3. If `e<=alpha-r`, the interval reaches rank `r` and its contribution is
   nonnegative.  When `y<=r`, it is exactly

```text
C(alpha-d,r-y) [r(alpha-e-r)+y] / (alpha-e-r+1).           (3)
```

Consequently

```text
W_r = LongSlack_r - #{Y independent in C: e=alpha-r+1}.   (4)
```

Thus WR is reduced to paying one unit for every exact Hall-excess boundary
set.  No shorter interval matters and every longer interval is already
positive.

## Pointed form

Suppose `alpha(G-p)=alpha(G)` and choose `A` maximum while avoiding `p`.
Let `h_(r-1,p)` count independent `(r-1)`-sets containing `p`.  In

```text
r i_r(G)-h_(r-1,p)(G),                                    (5)
```

an interval with `p notin Y` contributes only the nonnegative term
`r C(alpha-d,r-y)`.  An interval with `p in Y` has (2)--(3).  Therefore the
only negative terms in the pointed boundary are exactly

```text
Y independent in C, p in Y, e=alpha-r+1,                  (6)
```

again with weight one apiece.  This turns the remaining pointed coefficient
inequality into a concrete boundary-count payment retaining the marked
vertex and the maximum-set exchange structure.

## Replay

Run

```powershell
python .\verify_maxset_hall_excess_wr_reduction_root.py
```

The verifier reconstructs (1)--(6) over every nonempty forest in the
NetworkX graph atlas, for every rank and every eligible pointed maximum set.
Its required marker is

```text
PASS_EXACT_MAXSET_HALL_EXCESS_WR_POINTED_REDUCTION
```
