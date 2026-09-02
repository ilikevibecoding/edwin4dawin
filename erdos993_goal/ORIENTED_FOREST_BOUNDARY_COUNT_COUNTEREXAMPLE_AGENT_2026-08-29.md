# Counterexample to the unrestricted oriented-forest boundary count

Date: 2026-08-29

Status: **exact route obstruction, realized inside the matching-contraction
image.**  This refutes the empty-interval-only payment, not the
matching-contraction identity, the Hall-excess identity, WR, unimodality, or
Erdos Problem 993.

The contracted picture has `alpha=81` units.  One component is a directed
star on 55 units: mark its center `p*` and direct its 54 edges away from the
center.  The other 26 units are isolated.  The operative residue-zero Hall
excess is

```text
e=alpha/3+1=28.
```

A subset `S` containing `p` has exactly 28 external out-neighbors precisely
when it omits exactly 28 of the 54 active leaves.  Its choices on all 26
isolated units are free.  Therefore the exact pointed count is

```text
2^26 C(54,28) = 125990575520198072205312.
```

The proposed empty-interval capacity is only

```text
28 C(81,28) = 124539090165099954146880.
```

Thus the pointed count exceeds the capacity by

```text
1451485355098118058432 > 0.
```

This is not merely an artifact of dropping inactive-edge restrictions.  It
comes from the following explicit forest `G` on 162 vertices.  Take matching
edges `c_i a_i` for `0<=i<=80`, add the 54 edges `c_0 a_j` for `1<=j<=54`,
and mark `p=c_0`.  With `A={a_0,...,a_80}`, the first 55 matching units form
the directed star and the remaining 26 matching edges are disjoint `K2`
components.  Both `alpha(G)` and `alpha(G-p)` equal 81.  Thus the failed
count occurs inside the exact matching-contraction image.

## The theorem row is nevertheless very positive

The exact independence polynomial is

```text
I(G)=x(1+x)^54(1+2x)^26+(1+x)(1+2x)^80.
```

At the pointed boundary rank `r=54`,

```text
i_54(G)       = 27697491361609637836580450636436085810,
h_53,p(G)     = 911146079535559263747259235,
54 i_54-h_53,p= 1495664533526009297095808775103801374505 > 0.
```

An exact Hall-interval replay gives total nonnegative long slack

```text
1495664533526009423086384295301873579817,
```

and exact-boundary count

```text
125990575520198072205312.
```

Their difference is the displayed positive pointed margin.  Therefore the
right repair is to retain positive nonempty long-interval slack; paying all
boundary sets from the empty interval alone is genuinely too coarse.

## Replay

Run

```powershell
python .\verify_oriented_forest_boundary_count_counterexample_agent.py
```

The script constructs the explicit forest, verifies the matching and
independence-number claims, performs the literal binomial subset count,
replays every Hall-interval type, checks the exact pointed margin, and
confirms this is the first failure in the marked-star family through
`alpha=500`.  Its required marker is

```text
COUNTEREXAMPLE_EXACT_ORIENTED_FOREST_BOUNDARY_COUNT_TARGET
```
