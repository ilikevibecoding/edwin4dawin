# Rank-five component-surplus theorem

Let `T` be a finite tree of order `n`.  Write `I_k(T)` for its independent
`k`-sets, `i_k(T)=|I_k(T)|`, and

`e(T)=sum_v binom(deg(v)-1,2)`.

For `S in I_4(T)`, put `F_S=T-N[S]` and let `c(F_S)` denote its number of
components.  Then

`binom(n-2,2) sum_{S in I_4(T)} c(F_S) >= e(T) 5 i_5(T).`

This statement is all-order.  It is not a finite-order extrapolation.

## Edge-local lemma

For every edge `uv`, put

`H_uv=T-(N[u] union N[v])`,

`h_uv=|H_uv|=n-deg(u)-deg(v)`.

The five companion proofs establish, for every edge,

`(n-2)(n-3)i_4(H_uv) <= 5 h_uv i_5(T).`                         (1)

They exhaust the endpoint-degree classes.  With
`c=deg(u)+deg(v)-2`, the partition is:

- `c=0`: only the one-edge tree, where the assertion is trivial;
- `c=1`: endpoint degrees `(1,2)`;
- `c=2`: `(1,3)` or `(2,2)`;
- `c=3,4`: `(1,4),(2,3),(1,5),(2,4),(3,3)`;
- `c>=5`: the high-degree-sum tail.

The corresponding all-order proofs are in:

- `RANK5_EDGE_LOCAL_LEAF_DEGREE2_THEOREM_2026-08-25.md`;
- `RANK5_EDGE_LOCAL_LEAF_DEGREE3_THEOREM_2026-08-25.md`;
- `RANK5_EDGE_LOCAL_DEGREE2_DEGREE2_THEOREM_2026-08-25.md`;
- `RANK5_EDGE_LOCAL_C3_C4_THEOREM_2026-08-25.md`;
- `RANK5_EDGE_LOCAL_HIGH_DEGREE_SUM_REDUCTION_2026-08-25.md`.

## Exact assembly

Let `TS_5(T)` be the token-sliding graph on independent 5-sets of `T`, and let
`m_2(T)` be the number of two-edge matchings.  Double counting gives

`|E(TS_5(T))| = sum_{uv in E(T)} i_4(H_uv),`                    (2)

`sum_{uv in E(T)} h_uv = n(n-1)-sum_v deg(v)^2 = 2m_2(T).`     (3)

Summing (1), then dividing by two, gives

`binom(n-2,2)|E(TS_5(T))| <= 5m_2(T)i_5(T).`                   (4)

Now set

`A_4=sum_{S in I_4(T)} |F_S|`,

`C_4=sum_{S in I_4(T)} c(F_S)`,

and `W=binom(n-2,2)`.  Three more exact counts are

`A_4=5i_5(T)`,

`C_4=A_4-|E(TS_5(T))|`,

`m_2(T)=W-e(T)`.

Consequently

`W C_4-e(T)A_4 = 5m_2(T)i_5(T)-W|E(TS_5(T))| >= 0`

by (4), proving the theorem.

## Reproducibility

Run

```powershell
python verify_rank5_component_surplus_all_order_theorem_root.py --max-order 13
```

The verifier checks the five dependency reports and their source hashes,
reconstructs the degree-class partition, and independently enumerates every
unlabelled tree through order 13.  On every tree it directly reconstructs the
independent sets, all edge-local residuals, the token-sliding graph, the
two-edge matchings, and both sides of the final margin identity.

## Boundary

This theorem closes the rank-five component-surplus lemma used in the current
rank-eight attack on Erdos Problem 993.  It is a genuine all-order lemma, but it
does not alone establish the full independence-sequence unimodality conjecture.
