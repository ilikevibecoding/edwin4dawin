# Pointed Hall payment by immediate covered supersets

Date: 2026-08-29

Status: **exact all-order partial payment.**  A smaller closed hard family
remains, so this is not a proof of the pointed boundary, WR, ISO,
unimodality, or Erdos Problem 993.

Fix a graph `G`, a maximum independent set `A` of size `alpha` avoiding the
marked vertex `p`, and put `C=V(G)-A`.  At rank `r`, let `Y` be a remaining
hard pointed Hall-boundary set.  Thus `Y` is independent, `Y subset C`,
`p in Y`, and, with `y=|Y|` and `d=|N_A(Y)|`,

```text
d-y=alpha-r+1.                                      (1)
```

Suppose there is a vertex `z in C-Y` such that `Y+z` is independent and

```text
N_A(Y+z)=N_A(Y).                                    (2)
```

Put `W=Y+z`.  Its excess is one less than (1), namely `alpha-r`, so its
Boolean interval ends exactly at rank `r`.  Since it contains `p`, its exact
contribution to the pointed row is

```text
r C(alpha-d,r-|W|)-C(alpha-d,r-1-|W|)=|W|.          (3)
```

Indeed `alpha-d=r-|W|`, making the two binomial coefficients in (3) equal
to `1` and `r-|W|`.

## Collision-free fractional allocation

Join each eligible boundary set `Y` to every immediate successor `W`
satisfying (2).  Split the one negative unit of `Y` uniformly across its
successors.  The load arriving at a fixed `W` is at most its number of
one-vertex predecessors.  Every predecessor is `W-{z}` for a distinct
`z in W`, so there are at most `|W|` of them.  Equation (3) says that this
is exactly the capacity of `W`.  Hence all boundary sets with at least one
such successor are paid simultaneously.

These intervals do not collide with the earlier private-neighbor payment:
the immediate successors here contain `p`, while every `Y-{p}` target from
the `delta>=2` payment avoids `p`.  The empty interval also avoids `p`.

The entire unresolved Hall family is therefore reduced further to hard
boundary sets `Y` for which every independently addable vertex outside `Y`
introduces at least one new `A`-neighbor.  Call these sets **closed hard
sets**.

## Replay

Run

```powershell
python .\verify_pointed_hall_immediate_superset_payment_root.py
```

The verifier checks (3) in 4,499,950 exact integer cells, constructs a
literal alpha-six out-star example with three successors, and reconstructs
the hard family in every NetworkX atlas forest.  Its marker is

```text
PASS_EXACT_POINTED_HALL_IMMEDIATE_SUPERSET_PAYMENT
```
