# Rank-seven order-23 leaf-root high-correlation bulk table

Date: 2026-08-17

Status: **proved exact finite table theorem for `n=23`, `r=1`, and
`B2>=30`; this is not by itself a positivity theorem for the complete
`B2>=6` band.**

## Statement

Let `T` be a tree on 23 vertices, let `q` be a leaf, and write

```text
x_v = deg_T(v)-1,
B2  = sum_v C(x_v,2).
```

If `B2>=30`, the artifact
`rank7_r1_high_correlation_bulk_b30plus_exact_20260817.json` gives, for
every possible excess `x` of the unique neighbour of `q` and every
attainable value of `c4=i4(T)`, the exact minimum of `c5=i5(T)` over all
trees with that `(B2,x,c4)` profile.

The table contains 656 `(B2,x)` profiles and 31,029 attainable
`(B2,x,c4)` rows.  It replaces the separate `B2=37,38,42,46` row censuses
and includes all of their rows without a gap.

## Exact finite reduction

Delete the leaves of `T`.  The vertices which remain have positive excess
and induce a tree, called the positive core.  If their excess weights are
`w_1,...,w_k`, then

```text
sum_i w_i = 21,
deg_core(i) <= w_i+1,
leaf_slots(i) = w_i+1-deg_core(i).
```

Conversely, every weighted core satisfying these inequalities reconstructs
a tree by attaching exactly `leaf_slots(i)` leaves at vertex `i`.  A leaf
root adjacent to excess `x` exists exactly when some weight-`x` vertex has
a positive leaf slot.  Thus the following enumeration is exhaustive:

1. all partitions of 21 whose `B2` is at least 30;
2. all nonisomorphic core-tree shapes of the corresponding order;
3. all distinct assignments of the partition weights to the core vertices;
4. the exact degree-capacity and root-slot filters.

For every survivor, the replay computes

```text
E = sum_(uv in E(core)) w_u w_v
V = sum_i C(w_i+1,4)
    + sum_(uv)[C(w_u,2)w_v+C(w_v,2)w_u]
    + sum_v sum_({u,z} subset N_core(v)) w_u w_z,
```

then uses the exact motif identities for `c4` and `c5`.  Minimization is
performed over every survivor having the same `(B2,x,c4)`.

## Coverage and replay audit

The deterministic census checks:

```text
excess partitions                       520
shape-assignment pairs            4,569,336
degree-feasible pairs               823,715
(B2,x) profiles                          656
exact (B2,x,c4) rows                  31,029
```

Two independent fresh invocations produced byte-identical JSON and
byte-identical console logs.  The bulk rows were also compared row-for-row
with the earlier independent `B2=38,x=4`, `B2=42,x=4`, and `B2=46,x=5`
tables (92, 92, and 73 rows respectively); every attainable row and exact
`c5` minimum agreed.

Representative first rows are

```text
(B2,x,c4,c5_min) = (37,4,5366,14837)
                 = (38,4,5384,14979)
                 = (42,4,5425,15136)
                 = (46,5,5491,15622).
```

## Scope boundary

This theorem supplies the exact root/correlation coupling for the high
`B2` leaf-root cells at order 23.  The terminal-broom positivity cone must
still consume these rows, and profiles with `r>1`, lower `B2`, or other
orders are not covered by this table.

## Replay

```powershell
python .\enumerate_rank7_r1_high_correlation_bulk.py `
  --n 23 --b2-min 30 `
  --output rank7_r1_high_correlation_bulk_b30plus_exact_20260817.json
```
