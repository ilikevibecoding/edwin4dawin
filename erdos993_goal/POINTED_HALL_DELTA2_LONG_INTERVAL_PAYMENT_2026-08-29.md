# Pointed Hall boundary: exact delta-at-least-two payment

Date: 2026-08-29

Status: **exact all-graph partial payment.**  The `delta<=1` family remains
open, so this is not a proof of the pointed boundary, WR, ISO, unimodality,
or Erdos Problem 993.

Fix a graph `G`, a maximum independent set `A` of size `alpha` avoiding a
marked vertex `p`, and put `C=V(G)-A`.  At rank `r`, let `Y` be a negative
pointed Hall-boundary set.  Thus `Y` is an independent subset of `C`,
`p in Y`, and, writing `y=|Y|` and `d=|N_A(Y)|`,

```text
d-y=alpha-r+1.
```

Put

```text
Z=Y-{p},
delta=|N_A(Y)-N_A(Z)|.
```

The map `Y -> Z` is injective.  Because `p notin Z`, the Boolean interval
indexed by `Z` contributes only positive rank-`r` mass.  Its contribution to
the pointed row is exactly

```text
r C(alpha-|N_A(Z)|,r-|Z|)
 = r C(r-y-1+delta,r-y+1).                         (1)
```

If `delta>=2`, the binomial coefficient in (1) is at least one.  Hence this
distinct positive interval supplies at least `r` units and in particular
pays the one negative unit indexed by `Y`.  All `delta>=2` boundary sets are
therefore closed without using the empty interval.

## Exact structure of the remaining hard family

Suppose `delta<=1`.  Every A-neighbor of `p`, except possibly one, already
lies in `N_A(Z)`.  Thus for each such neighbor `a` there is a witness
`z in Z` with the length-two path

```text
p-a-z.
```

When `G` is a forest, one `z` cannot witness two distinct A-neighbors
`a,a'` of `p`, since `p-a-z-a'-p` would be a 4-cycle.  Consequently

```text
|Z| >= deg_A(p)-delta >= deg_A(p)-1.               (2)
```

Equations (1)--(2) reduce the entire unresolved Hall payment to boundary
sets that almost completely cover the A-neighborhood of the marked vertex
by distinct distance-two witnesses.  No claim about that residual family is
made here.

## Replay

Run

```powershell
python .\verify_pointed_hall_delta2_payment_agent.py
```

The verifier replays (1), the injective allocation, and the forest witness
claim over every eligible maximum set and point in every NetworkX atlas
forest.  Its required marker is

```text
PASS_EXACT_POINTED_HALL_DELTA2_LONG_INTERVAL_PAYMENT
```

