# Pointed Hall boundary as an oriented-forest boundary count

Date: 2026-08-29

Status: **exact reduction with an exact obstruction to its empty-only
closure.**  The matching contraction below is valid, but the unrestricted
oriented boundary-count inequality is false.  This is not a counterexample
to the weak ratio, unimodality, or Erdos Problem 993.

Let `G` be a forest, let `A` be a maximum independent set of size `alpha`,
and put `C=V(G)-A`.  Suppose the marked vertex `p` belongs to `C`.  For an
independent set `Y` contained in `C`, write

```text
y=|Y|,  d=|N_A(Y)|,  e=d-y.
```

The maximum-set Boolean-interval decomposition shows that the only negative
terms in the pointed boundary payment

```text
r i_r(G)-h_(r-1,p)(G)
```

are the sets `Y` containing `p` with

```text
e=alpha-r+1,                                      (1)
```

each with weight one.

## Matching contraction

The complement `C` is a minimum vertex cover.  Since forests are bipartite,
Konig's theorem gives

```text
nu(G)=|C|.
```

Fix a maximum matching `M`.  Every matching edge meets `C`, while the
`|C|` disjoint matching edges have only `|C|` vertices of `C` available.
Consequently every edge of `M` has exactly one endpoint in `C`, and `M`
matches every `c in C` to a distinct vertex `m(c) in A`.

Contract each matched edge `c m(c)` to one unit, and retain each unmatched
vertex of `A` as a singleton unit.  There are exactly `alpha` units.  Every
remaining edge has one of two forms:

```text
c_i a_j: orient the unit edge i -> j;
c_i c_j: leave the unit edge inactive.
```

Contracting edges in a forest leaves a forest.  In particular no loops,
parallel unit edges, or opposite directed pair can occur.

Map `Y` to the set `S` of units whose matched `C` vertex lies in `Y`.  Then
the external directed boundary is exactly

```text
out(S)-S = {unit(a): a in N_A(Y)-m(Y)},
```

and hence

```text
|out(S)-S|=|N_A(Y)|-|Y|=e.                        (2)
```

The map is injective and sends `p in Y` to the marked unit `p* in S`.
Dropping the restriction that `S` use only matched units, and dropping the
independence restrictions represented by inactive `C--C` edges, can only
increase the count.

## The proposed oriented counting target

It would have been enough to prove the following purely finite-forest
statement.

> Let `D` be any partially oriented forest on `alpha` vertices, let `p*` be
> a vertex, and let `e=alpha-r+1` at either pointed boundary residue.  The
> number of subsets `S` containing `p*` with exactly `e` external out-neighbors
> is at most `e C(alpha,e)`.

At the two required residue classes this means

```text
alpha=3k:    r=2k,    e=k+1;
alpha=3k+2:  r=2k+1,  e=k+2.
```

The empty Boolean interval (`Y=empty`) contributes positive slack

```text
r C(alpha,r)=e C(alpha,e),                         (3)
```

because `e=alpha-r+1`.  Thus the proposed oriented count bound would have
paid every negative boundary unit using the empty interval alone.

## Exact obstruction inside the contraction image

The proposed count theorem is false.  At `alpha=81`, take a directed star on
55 units, marked at its center and directed toward its 54 leaves, together
with 26 isolated units.  For the operative `e=28`, the pointed count is

```text
2^26 C(54,28) = 125990575520198072205312,
```

while the empty capacity is only

```text
28 C(81,28) = 124539090165099954146880.
```

This contracted forest is realized exactly by a 162-vertex forest: use the
81 matching edges `c_i a_i`, add `c_0 a_j` for `1<=j<=54`, and mark
`p=c_0`.  Both `alpha(G)` and `alpha(G-p)` are 81.  The actual pointed row at
`r=54` is nevertheless positive by

```text
1495664533526009297095808775103801374505.
```

Positive nonempty long intervals supply the missing payment.  Therefore the
matching-contraction reduction remains useful, but any viable closure must
retain that long-interval slack; the empty-interval-only route is closed.
The exact obstruction is frozen in
`ORIENTED_FOREST_BOUNDARY_COUNT_COUNTEREXAMPLE_AGENT_2026-08-29.md`.

## Replay and scope

Run

```powershell
python .\verify_oriented_forest_hall_boundary_reduction_root.py
```

The verifier reconstructs every contraction arising from every eligible
pointed maximum independent set and every maximum matching in the NetworkX
forest atlas.  It checks (2) set-for-set, the forest/simple-edge property,
the count domination, and (3), and pins the exact all-order obstruction.
Those bounded checks audit the reduction; they do not prove the weak ratio.
