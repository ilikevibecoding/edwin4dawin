# Rank-five residual-component moment reduction

## Status

The moment identity, the order-only floor, and the branching-surplus inequality
in this note are now proved exactly.  The latter was closed on 2026-08-25 by
the all-order edge-local proof and exact assembly in
`RANK5_COMPONENT_SURPLUS_ALL_ORDER_THEOREM_2026-08-25.md`.  This still is not
by itself a proof of the remaining rank-eight terminal cells or Problem 993.

## Exact residual-forest identity

Let `T` be a tree and, for every independent four-set `S`, put

```text
F_S = T-N[S],   a_S=|V(F_S)|,   C_S=number of nonempty components of F_S.
```

Write expectation for uniform `S` in `I_4(T)` and

```text
mu = E[a_S] = 5 i_5(T)/i_4(T).
```

Every extension of `S` to an independent five-set chooses one vertex of
`F_S`, hence

```text
sum_S a_S = 5 i_5(T).
```

Because `F_S` is a forest,

```text
i_2(F_S)=a_S(a_S-3)/2+C_S.
```

Double-counting an independent six-set together with one of its fifteen
four-subsets gives

```text
sum_S i_2(F_S)=15 i_6(T).
```

Substitution in the normalized rank-five reserve therefore yields the exact
identity

```text
V = 2(Var(a_S)+2 E[C_S])/(5 mu).
```

For a tree of the relevant orders, `a_S<=n-5`.  Also
`C_S>=1` whenever `a_S>0`, so pointwise

```text
C_S >= 1[a_S>0] >= a_S/(n-5).
```

Thus the following floor is rigorous:

```text
V >= 4/(5(n-5)).
```

The order-only floor is too weak to close the current relaxed Delta2 scout.

## Branching-surplus theorem

Put

```text
e(T)=sum_v C(deg(v)-1,2),   W=C(n-2,2),
A_4=sum_S a_S=5i_5(T),      C_4=sum_S C_S.
```

The proved inequality is

```text
W C_4 >= e(T) A_4.                                      (CS)
```

Since `C_S=a_S-|E(F_S)|`, it is equivalently

```text
(W-e(T)) A_4 >= W sum_S |E(F_S)|.
```

Here `W-e(T)` is exactly the number of two-edge matchings of `T`: among the
`C(n-1,2)` edge pairs, the adjacent pairs number

```text
sum_v C(deg(v),2)=e(T)+n-2.
```

Combining (CS) with the moment identity immediately gives the rigorous floor

```text
V >= 8e(T)/(5(n-2)(n-3)).
```

This stronger floor still does not by itself close the fully relaxed Delta2
scout: the surviving fake-negative endpoints discard root/global coupling.
The proof of (CS) partitions edges by endpoint-degree sum, proves the local
bound

```text
(n-2)(n-3)i_4(T-(N[u] union N[v]))
    <= 5(n-deg(u)-deg(v))i_5(T),
```

and sums it using the token-sliding and two-matching identities.  See the
2026-08-25 theorem note and its independently replayable verifier.

## Exact leaf-extension reduction

Let `G` be obtained from an order-`n` tree `T` by adding a leaf at `p`.  Put

```text
B=T-p,   D=T-N[p],   r=deg_T(p)-1,
j_4=i_4(B)-i_4(D).
```

The exact recurrences are

```text
C_4(G)=C_4(T)+C_3(B)+j_4,
A_4(G)=A_4(T)+5i_4(B),
e(G)=e(T)+r.
```

The `j_4` term is necessary: if an independent four-set in `B` contains a
neighbor of `p`, the new leaf survives as an isolated residual component.

For the margin `M(T)=W C_4-e A_4`, direct subtraction gives

```text
M(G)-M(T)
=(n-2)C_4(T)
 +C(n-1,2)(C_3(B)+j_4)
 -r A_4(T)
 -5(e(T)+r)i_4(B).                                     (L)
```

Two sufficient local claims are

```text
(n-2)C_4(T) >= r A_4(T),                               (L1)
C(n-1,2)(C_3(B)+j_4) >= 5(e(T)+r)i_4(B).               (L2)
```

An all-order proof of (L1) and (L2) would give an alternative leaf-monotonicity
proof of (CS).  Neither claim is promoted to theorem here; they are no longer
needed because the edge-local proof establishes (CS) directly.

## Evidence and rejected shortcuts

- (CS) passed every free tree through order 16: 32,478 trees, with equality
  on stars and positive slack on every tested nonstar.
- The exact leaf recurrence (L) and both sufficient claims passed 5,480 leaf
  rows through child order 12.
- The fixed-vertex strengthening underlying (L1), with maximum degree in
  place of `r`, passed every free tree through order 15 at rank four.
- Deterministic random trees through order 1,000 passed the resulting
  normalized `V` floor.
- A tempting pointwise residual-component inequality is false already at
  order 7.
- A tempting pointwise private-neighbor/two-matching inequality is false at
  order 12.  The aggregate candidate survives those witnesses.

Relevant executable diagnostics are

```text
probe_rank5_component_surplus_floor_root.py
verify_rank5_component_surplus_leaf_reduction_root.py
probe_rank5_v_branching_surplus_floor_root.py
probe_fixed_rank_maxdegree_component_ratio_root.py
probe_rank5_fixed_vertex_component_pointwise_root.py
probe_rank5_private_neighbor_matching_bound_root.py
```
