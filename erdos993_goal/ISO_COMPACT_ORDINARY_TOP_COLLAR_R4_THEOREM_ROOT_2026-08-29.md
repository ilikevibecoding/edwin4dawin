# All-forest ordinary ISO theorem on the rank-four top collar

## Theorem

For every ordinary unmarked leaf cell in a marked forest, if

\[
r=4=\alpha(W)+2,
\]

then the coupled compact gap satisfies, in doubled diagonal units,

\[
G_4=A_4+B_4\ge126>0.
\]

## Why the exhaustive proof is universal

The top-collar equality forces \(\alpha(W)=2\).  Every forest is bipartite,
so one bipartition class has at least half the vertices and
\(|W|\le2\alpha(W)=4\).  Restoring the two marked vertices shows that
\(D=B-\{z,s\}\) has at most six vertices.

The verifier therefore enumerates every unlabeled forest \(D\) through
order six, every marked pair for which \(\alpha(D-\{u,v\})=2\), and every
possible neighbor subset of the support \(s\) in \(D\).  It adjoins \(s\)
and its leaf \(z\), retains exactly the acyclic reconstructions, and computes
all four minor rows by literal independent-subset enumeration.  This covers
every possible original forest cell up to isomorphism.

The exact classification contains 41 core forests, 129 marked cores, and
1,453 reconstructed cells.  The component minima are

| expression | minimum |
|---|---:|
| \(A_4\) | 120 |
| \(B_4\) | 0 |
| isolate reserve \(L_N(C)\) | 68 |
| cross term \(2B_N(XC,XH)\) | 4 |
| coupled gap \(G_4\) | 126 |

## Scope and replay

This closes every forest-realizable ordinary cell on the single boundary
layer \(r=4=\alpha(W)+2\).  It does not yet cover rank four with
\(\alpha(W)\ge3\), ranks at least five, or the full conjecture.

Run

```powershell
python prove_iso_compact_ordinary_top_collar_r4_root.py
```

The terminal marker is
`PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_TOP_COLLAR_R4`.
