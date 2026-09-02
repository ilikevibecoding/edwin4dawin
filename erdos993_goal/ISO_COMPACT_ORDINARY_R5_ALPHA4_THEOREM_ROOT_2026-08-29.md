# All-forest ordinary ISO theorem at rank five with alpha(W)=4

## Theorem

For every ordinary unmarked leaf cell in a marked forest, if

\[
r=5,\qquad \alpha(W)=4,
\]

then, in doubled diagonal units,

\[
\boxed{G_5=A_5+B_5\ge784>0.}
\]

This is the layer \(r=\alpha(W)+1\), one rank below the top collar.

## Universal finite reduction

Since \(W\) is a forest, bipartiteness gives
\(|W|\le2\alpha(W)=8\).  Restoring the two marks bounds the
support-deleted core \(D\) by ten vertices.  The verifier generates every
unlabeled forest through order ten as a multiset of nonisomorphic tree
components, every marked pair with \(\alpha(W)=4\), and every support-neighbor
set that preserves acyclicity.

All induced-subgraph independence polynomials are computed by an exact
memoized bitmask leaf recurrence.  The original FML difference is recomputed
directly from \(A=C+XH\) and \(\mathrm{Full}=A+XC\) on every cell.

The exact classification contains

```
636 core forests
3,888 marked cores
102,347 reconstructed ordinary cells.
```

The component minima are

| expression | minimum | negative cells |
|---|---:|---:|
| \(A_5\) | 744 | 0 |
| \(B_5\) | 32 | 0 |
| isolate reserve \(L_N(C)\) | 548 | 0 |
| cross term \(2B_N(XC,XH)\) | -488 | 802 |
| coupled gap \(G_5\) | 784 | 0 |

Thus the A/B split happens to remain positive on this layer, but the
source-paired isolate/cross split already fails extensively.  Only the full
coupled statement is stable across both rank-five layers proved so far.

## Scope and replay

Together with the top-collar theorem at \(\alpha(W)=3\), this closes ordinary
rank-five FML for \(\alpha(W)=3,4\).  It does not cover
\(\alpha(W)\ge5\), the other FML modes away from their proved collar, higher
ranks, or the full conjecture.

Run

```powershell
python prove_iso_compact_ordinary_r5_alpha4_root.py
```

The terminal marker is
`PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_R5_ALPHA4`.
