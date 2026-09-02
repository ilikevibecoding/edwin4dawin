# Complete-bipartite obstruction to universal `N_4`

Date: 2026-08-29

Status: **exact counterexample.**  The obstruction is bipartite and
triangle-free, but it is not a forest.

## Counterexample

Let

```text
G = K_{10,26}
```

and mark two vertices `u,v` in the side of size `10`.  For positive rank
`k`,

```text
i_k(K_{a,b}) = binom(a,k)+binom(b,k),
```

so the four marked rows are

```text
E = I(K_{10,26}),
U = V = I(K_{9,26}),
W = I(K_{8,26}).
```

Literal substitution into the closed rank-four formula gives

```text
N_4(G;u,v) = -36,102.
```

The verifier independently reconstructs all four rows by an induced-mask
independence-polynomial recurrence and obtains the same value.

The graph is connected, bipartite, and triangle-free.  It has `36` vertices,
`260` edges, and many 4-cycles, so it is not a forest.  Here
`alpha(G-{u,v})=26`.

## Exact family boundary

The verifier checks every same-side marked family cell

```text
K_{a,b},    2<=a<=60, 1<=b<=60.
```

Across `3,540` exact cells, `931` are negative.  Ordered by total graph
order `a+b`, the unique first negative cell is

```text
(a,b)=(10,26),    a+b=36,    N_4=-36,102.
```

This is minimal only within the displayed complete-bipartite same-side
family and parameter box; no global minimality among all bipartite graphs is
claimed.

## Replay and integrity

```text
python verify_iso_n4_complete_bipartite_counterexample_root.py
```

Success marker:

```text
PASS_EXACT_ISO_N4_COMPLETE_BIPARTITE_COUNTEREXAMPLE
```

Integrity:

```text
verify_iso_n4_complete_bipartite_counterexample_root.py
74920D762DD34897AB7D0C061E41FCB828F31690EDC8F13DDC4BDCCBCCE36D38

iso_n4_complete_bipartite_counterexample_exact_root_20260829.json
4506F53707CA9E7580C040B75B457694424051DAA931CFB6DFFCF4CD8A929930
```

## Consequence and exact scope

The proposed universal `N_4>=0` theorem is false for arbitrary simplicial
complexes, arbitrary graphs, triangle-free graphs, and bipartite graphs.
Accordingly, a Kruskal--Katona or local-LYM certificate using only downward
closure, flagness, triangle-freeness, or bipartiteness cannot prove the
needed auxiliary.

The still-plausible target is specifically the **forest restriction model**:
if `W=G-{u,v}`, then `P=I(W)`, while `A,B,C` are induced vertex restrictions
obtained by deleting the two marked neighborhoods; acyclicity constrains
those neighborhoods and their interaction.  This counterexample does not
refute all-forest `N_4`, forest ISO, or Erdos Problem 993.
