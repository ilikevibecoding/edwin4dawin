# Rank-seven order-23 high-correlation leaf-root direct theorem

Date: 2026-08-17

Status: **proved exact finite positivity theorem for `n=23`, root degree
`r=1`, `B2>=26`, and terminal-broom coefficients `Delta0,...,Delta6`.**

This theorem closes the exact leaf-root cells which remained negative in
the scalar `c5,c6,c7,a,b` enclosure.  It is not a theorem for roots of
degree greater than one or for the complete `B2>=6` band.

## Statement

Let `A` be a tree on 23 vertices, let `q` be a leaf of `A`, and set

```text
x_v = deg_A(v)-1,
B2  = sum_v C(x_v,2).
```

If `B2>=26`, then each of the seven low Newton coefficients of the exact
rank-seven terminal-broom residual is strictly positive:

```text
Delta0(A,q),...,Delta6(A,q) > 0.
```

The exact global minima in ranks 0 through 6 are respectively

```text
6242419741127570784
12871137801824780800
14084832295739144320
12989755173931687914
10284715190425150358
6391460145288756036
3115233972696532036.
```

Every minimum occurs at `B2=26`.

## Exhaustive positive-core parametrization

Delete every leaf of `A`.  The remaining positive-excess vertices induce
a tree.  Give vertex `v` of this positive core weight `x_v`.  If its core
degree is `d_v`, the number of leaves attached to it is forced:

```text
leaf_slots(v)=x_v+1-d_v.
```

Hence every tree of the stated order occurs in the following finite list:

1. every partition of `21=n-2` with `B2>=26`;
2. every nonisomorphic tree shape of the partition length;
3. every distinct assignment of the partition weights to that shape;
4. every assignment surviving `d_v<=x_v+1`.

Conversely, attaching `leaf_slots(v)` leaves at every surviving weighted
core vertex constructs a tree of order 23.  A leaf root is then specified
by choosing a core vertex with a positive leaf slot.

The replay uses one case per eligible root-neighbour vertex.  Multiple
pendant leaves incident with the same neighbour have identical rooted
coefficients and are collapsed.  Automorphism-equivalent weighted-core
assignments can occur more than once; this is a safe overcount, not a gap.

## Direct exact coefficient computation

For each weighted core the replay computes the independence polynomial of
`A` through rank 7 by tree DP.  For every eligible root-neighbour vertex it
also computes the independence polynomial of

```text
J=A-N[q]=A-{q, neighbour(q)}.
```

Thus all inputs are exact integers:

```text
c_k=i_k(A),          0<=k<=7,
a=i_4(J),
b=i_5(J),
i_5(A-q)=c5-a,
i_6(A-q)=c6-b.
```

These values are substituted into the exact symbolic terminal-broom
decomposition and its Newton coefficients.  No Newton interval, moment
cone, or scalar relaxation is used in the final sign check.

As internal audits, every weighted core also satisfies the independent
degree-motif formulas for `c2,c3,c4,c5`.

## Coverage

The complete replay covers

```text
excess partitions                              579
shape-assignment pairs                   9,762,741
degree-feasible weighted cores           1,622,246
root-neighbour vertex cases             10,067,186
additional same-neighbour leaf roots
  collapsed by symmetry                 13,223,190
```

The report records exact rank minima for every feasible `B2` value and an
explicit attaining witness for each stored minimum.

## Independent explicit-tree audit

The independent audit reconstructs ordinary 23-vertex trees from the
stored weighted-core witnesses and runs a separate vertex-by-vertex forest
DP for `A`, `A-q`, and `J`.  It verifies all 735 stored global/orderwise
minimum witnesses and the deletion recurrence

```text
i_k(A)=i_k(A-q)+i_(k-1)(J).
```

It also repairs the sharpest false scalar point.  The scalar enclosure at

```text
B2=35, x=4, c4=5331, c5=14568
```

allowed fractional `c6,c7,b` and a negative `Delta0`.  Its actual tree has

```text
I(A)[0..7]   = [1,23,231,1365,5331,14568,28686,41254],
I(A-q)[0..7] = [1,22,210,1172,4286,10828,19342,24544],
```

and all seven exact low residuals are positive; their minimum is
`3593736288043850872`.  The negative scalar point was therefore an
enclosure obstruction, not a tree counterexample.

A second, independently written verifier deduplicates the stored witnesses
by their full JSON fingerprints, reconstructs all 332 distinct trees, and
matches the global minima across all 104 reported `B2` levels.  Its files
are

```text
verify_rank7_r1_high_correlation_direct_delta_stored_witnesses_independent.py
rank7_r1_high_correlation_direct_delta_stored_witness_audit_20260817.json.
```

## Replay

```powershell
python .\verify_rank7_r1_high_correlation_direct_delta.py `
  --n 23 --b2-min 26 `
  --output rank7_r1_high_correlation_direct_delta_b26plus_exact_20260817.json

python .\audit_rank7_r1_high_correlation_direct_delta.py
```

## Remaining scope

This exact theorem removes every leaf-root obstruction found by the
root-conditioned scalar scan (`B2=26,27,28,29,35,37,38,42,46`).  The
remaining connected-tree proof still requires the other root-degree
profiles and any lower-correlation cells not already closed by an existing
analytic or finite theorem.

After the separate `B2=5` pure-cubic sweep finishes, the weakest exact
inventory of the remaining `B2>=6` tail is

```text
n=23, r=1, 6<=B2<=25;
n=23, r>=2, B2>=6;
24<=n<=38, every root degree, B2>=6.
```

The positive scalar-corner scan for the first line is evidence only and is
not used to delete that line from the theorem obligations.
