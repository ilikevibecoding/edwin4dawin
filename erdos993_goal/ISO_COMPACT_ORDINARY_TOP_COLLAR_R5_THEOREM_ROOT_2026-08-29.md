# All-forest ordinary ISO theorem on the rank-five top collar

## Theorem

For every ordinary unmarked leaf cell in a marked forest, if

\[
r=5=\alpha(W)+2,
\]

then the coupled compact gap satisfies, in doubled diagonal units,

\[
\boxed{G_5=A_5+B_5\ge108>0.}
\]

This is the first boundary layer where the separate \(R\)-Schur piece really
can be negative.  Across the complete classification, \(B_5\) is negative
in eight cells and has minimum \(-4\), while \(A_5\ge104\).  The theorem
therefore uses the exact compensation in \(A_5+B_5\), not component signs.

## Why the exhaustive proof is universal

The top-collar equality forces \(\alpha(W)=3\).  Every forest is bipartite,
so \(|W|\le2\alpha(W)=6\).  Restoring the two marked vertices gives
\(|D|\le8\), where \(D=B-\{z,s\}\).

The verifier generates every unlabeled forest through order eight as a
unique multiset of nonisomorphic tree components.  It then enumerates every
marked pair with \(\alpha(D-\{u,v\})=3\) and every possible support-neighbor
set containing at most one vertex from each component of \(D\).  That last
condition is exactly what makes the reconstructed graph acyclic.

All four-minor independence polynomials are computed by literal subset
enumeration.  The original FML difference is also recomputed directly from
\(A=C+XH\) and \(\mathrm{Full}=A+XC\), independently checking the compact
split on every cell.

The exact classification contains:

```
154 core forests
722 marked cores
12,955 reconstructed ordinary cells.
```

Its component minima are

| expression | minimum | negative cells |
|---|---:|---:|
| \(A_5\) | 104 | 0 |
| \(B_5\) | -4 | 8 |
| isolate reserve \(L_N(C)\) | 50 | 0 |
| cross term \(2B_N(XC,XH)\) | 0 | 0 |
| coupled gap \(G_5\) | 108 | 0 |

## Scope and replay

This closes every forest-realizable ordinary cell on the single boundary
layer \(r=5=\alpha(W)+2\).  It does not cover rank five with
\(\alpha(W)\ge4\), ranks at least six, the isolate or collision modes at
rank five, or the full conjecture.

Run

```powershell
python prove_iso_compact_ordinary_top_collar_r5_root.py
```

The terminal marker is
`PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_TOP_COLLAR_R5`.
