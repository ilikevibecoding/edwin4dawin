# ISO addability covariance and switching reduction

Date: 2026-08-29

Status: **exact graph-general equivalence and exact finite diagnostics, not a
proof of forest ISO and not a solution of Erdős Problem 993.**  The reduction
fixes all ordered/unordered conventions and identifies the precise global
transport that remains open.

## Exact covariance identity

Let

```text
I(G;x)=sum_j p_j x^j
```

and fix a rank `k` with `N=p_k>0`.  For a vertex `v`, let

```text
a_v = #{independent k-sets A for which A+v is independent}.
```

For distinct `u,v`, let `J_uv` count the independent `k`-sets to which both
vertices are individually addable.  Every pair sum below is over **unordered**
pairs.  Define

```text
q  = sum_(uv nonedge) (N J_uv-a_u a_v),
S0 = sum_v a_v^2,
S1 = sum_(uv edge) a_u a_v.
```

Three direct double counts give

```text
sum_v a_v = (k+1)p_(k+1),
2 sum_(uv nonedge) J_uv = (k+1)(k+2)p_(k+2),
2 sum_(uv nonedge) a_u a_v = (sum_v a_v)^2-S0-2S1.
```

Substitution proves, for every finite simple graph and every rank,

```text
S0+2S1+(k+1)N^2-2q
 = (k+1){(k+1)p_(k+1)^2+p_k^2-(k+2)p_k p_(k+2)}.       (1)
```

Consequently the ISO inequality at `r=k+1` is exactly

```text
2q <= S0+2S1+(k+1)N^2.                               (2)
```

This differs from the public prefix-GSB covariance budget: the final payment
is the fixed common-mark capacity `(k+1)N^2`, not `N d1`.

## Residual-forest variance form

Choose a uniform independent `k`-set `A`.  Let

```text
T(A)=|V(G)-N[A]|,
H(A)=|E(G[V(G)-N[A]])|.
```

Thus `T` is the number of addable vertices and `H` is the number of edges
induced by them.  Adjacent vertices can both be individually addable, so the
`2 E H` term must not be dropped.  Expanding `Var(T)` gives

```text
{S0+2S1+(k+1)N^2-2q}/N^2
 = k+1+E T+2 E H-Var(T).                              (3)
```

Therefore forest ISO is equivalent to

```text
Var(T) <= k+1+E T+2 E H.                              (4)
```

For a forest the addable induced graph is again a forest.  Equation (4)
isolates the exact place where acyclicity must enter.

## Symmetric-difference fibers

Group ordered pairs of independent sets by their intersection `C` and union
`U`.  In one fiber let

```text
n0(C,U) = # ordered pairs of sizes (k+1,k+1),
n2(C,U) = # ordered pairs of sizes (k,k+2).
```

Then the same ISO reserve is exactly

```text
p_k^2 + sum_(C,U){(k+1)n0(C,U)-(k+2)n2(C,U)}.          (5)
```

Inside a forest fiber, the symmetric difference is a bipartite forest.
Switching a set of its connected components converts a `(k,k+2)` orientation
to a balanced orientation precisely when the switched color imbalances sum
to one.

The exact audit through every nonisomorphic tree of order at most ten finds:

```text
947 rank rows,
17,644 negative fibers,
13,674 negative fibers with no subset of component imbalances summing to one.
```

Moreover, the aggregate negative part alone can be `252/100` times `p_k^2`.
Thus it is invalid to discard positive fibers and pay only negative fibers
from the `p_k^2` reserve.  A proof must transport both balanced-fiber surplus
and common-mark capacity across fibers, with a recoverable inverse.

## Bipartite boundary control

The forest hypothesis cannot be weakened to bipartiteness.  A labelled
`4`-by-`20` bipartite graph with left-neighborhood bitmasks

```text
[1048575,1046527,917503,523763]
```

has `24` vertices, `74` edges, and independence coefficients beginning

```text
(1,24,202,1150,4850,...).
```

At rank two its ISO reserve is

```text
2*202^2+24^2-3*24*1150 = -616.
```

This graph contains many cycles.  It is not a forest and is not a
counterexample to Erdős Problem 993.  It is an exact control showing that a
valid proof of (2), (4), or (5) must use forest acyclicity/sparsity rather than
bipartiteness alone.

## Replay and pins

Run

```powershell
python .\verify_iso_addability_covariance_root.py
python .\search_iso_bipartite_counterexample_root.py
python .\analyze_iso_switching_fibers_root.py
```

The covariance replay checks `3,089` graphs and `18,050` rank cells, including
both forests and nonforests, and ends with

```text
PASS_EXACT_ISO_ADDABILITY_COVARIANCE_EQUIVALENCE
```

SHA-256 pins:

```text
verify_iso_addability_covariance_root.py
8CD3D762F7BF7D7E0454D697C28AA512C2762B0A0CF38328D871C37730C5C4F2

iso_addability_covariance_exact_root_20260829.json
96EF8DDC2823A6314320D9336E4647B16AC0EFE6137A7FCDBEDC653D7A2DC92D

search_iso_bipartite_counterexample_root.py
F7A913BB775863E71CD95507DA4FDB99442C145C54058E82B0005E035D791370

iso_bipartite_counterexample_root_20260829.json
3EE8BF0E93B5DBD8E1D8AE15227B4A05C55AE09F847E77852668D5E4C9B28881

analyze_iso_switching_fibers_root.py
36768BCD66EFFF355067AC54AE3C5A59BEFCC97DCAB6FA961071FE0AF0A02E1A

iso_switching_fibers_exact_root_20260829.json
B5DFBCB7BEA01C53ACF378A0FF7D544099901F4CA569D1A428409487BDBECE44
```

The remaining theorem-strength obligation is the nonnegativity of (1) for
forests, or equivalently a global proof of (2), (4), or (5).
