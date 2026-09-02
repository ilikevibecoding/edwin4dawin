# Rank-five component-surplus token-sliding reduction

Date: 2026-08-25

Status: **exact all-order reduction; final average-degree inequality open**.
This note does not prove the branching-surplus bound, connected `Q8`, or
Erdos Problem 993.

## Setup

Let `T` be a tree of order `n`.  For every independent four-set `S`, put

```text
F_S = T-N[S],       a_S=|V(F_S)|,       C_S=components(F_S),
A4=sum_S a_S,       C4=sum_S C_S.
```

Write

```text
e=sum_v C(deg(v)-1,2),       W=C(n-2,2),
m2=number of unordered two-edge matchings of T.
```

Let `TS5(T)` be the token-sliding graph whose vertices are the independent
five-sets of `T`; two states are adjacent when one token slides across one
edge of `T` and the resulting five-set remains independent.

## Exact identities

Every pair `(S,x)` with `x in V(F_S)` is an independent five-set with one
distinguished member, so

```text
A4 = 5 i5(T).                                                (1)
```

Since every `F_S` is a forest,

```text
C_S = a_S-|E(F_S)|.
```

A residual edge `uv in E(F_S)` gives the two independent five-sets
`S+u` and `S+v`, which differ by the valid slide `u<->v`.  Conversely every
edge of `TS5(T)` uniquely recovers its common independent four-set `S` and
the residual tree edge.  Therefore

```text
sum_S |E(F_S)| = |E(TS5(T))|,
C4 = A4-|E(TS5(T))|.                                      (2)
```

Equivalently, if `q1(I)` is the number of vertices outside an independent
five-set `I` having exactly one neighbor in `I`, then `q1(I)` is exactly the
degree of `I` in `TS5(T)`.  Hence

```text
sum_I q1(I) = 2|E(TS5(T))|.                               (3)
```

Among the `C(n-1,2)` unordered pairs of tree edges, the adjacent pairs number

```text
sum_v C(deg(v),2) = e+n-2.
```

It follows that

```text
m2 = C(n-1,2)-(e+n-2) = W-e.                              (4)
```

Combining (1)--(4) gives the exact margin identity

```text
W C4-e A4 = 5 m2 i5(T)-W |E(TS5(T))|.                    (5)
```

Thus the branching-surplus candidate

```text
W C4 >= e A4
```

is equivalent, without loss or relaxation, to the token-graph density bound

```text
average_degree(TS5(T)) <= 10 m2/W.                        (TS)
```

This is a sharper target than the earlier pointwise private-neighbor bound:
that pointwise strengthening is false, whereas `(TS)` only controls the
average over all independent five-sets.

## Exact diagnostic

The verifier independently constructs residual forests, private-neighbor
degrees, token-slide edges, degree surplus, and two-edge matchings.  Every
identity above was checked on all 979 nonisomorphic trees of orders 6 through
12.  It checked 120,065 independent four-sets, 85,397 independent five-sets,
and 98,989 token-slide edges.  There were no negative candidate margins.
All 16 nonstar zero margins had `i5=0`; among active rows (`i5>0`), equality
was attained only by stars in this census.

```text
verify_rank5_component_surplus_token_sliding_reduction_root.py
  C082868751825EFA9FD98DEBFA37EEF7F609C56C5A330E9B846D36833A526164

rank5_component_surplus_token_sliding_reduction_exact_20260825.json
  E15E1D8C93E4A557B212FB6494E79C31C849B228BBD153DB1D8FD4D3F7EFA2C9
```

The all-order content is the double-counting reduction (1)--(5).  The finite
census is evidence only.  A proof of `(TS)`, or a finite tree violating it,
remains the next task on this route.
