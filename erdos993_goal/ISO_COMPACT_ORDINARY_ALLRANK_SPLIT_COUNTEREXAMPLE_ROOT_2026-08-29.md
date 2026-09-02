# Exact P8 obstruction to the all-rank compact A/B split

## Result

The strict-prefix compact ordinary-leaf decomposition

\[
A_r=\operatorname{diag}\bigl((z+w)N(C)+2zw\,B_N(H,C)\bigr),\qquad
B_r=\operatorname{diag}\bigl(-\tfrac12(z-w)^2[R(C+H)-R(H)]\bigr)
\]

cannot be promoted to separate nonnegativity throughout the induction-closed
collar \(2\le r\le \alpha(W)+2\).  The smallest possible order is eight:
an explicitly labelled path \(P_8\) has \(B_5=-2\) at
\(r=\alpha(W)+2\), while \(A_5=390\) and the coupled full gap is
\(A_5+B_5=388\).

All quantities below are in doubled diagonal units.

## Exact witness

Take the path on vertices \(0,\ldots,7\) with edges

```
(0,1), (0,5), (1,2), (2,3), (3,4), (5,6), (6,7).
```

Its path order is `4-3-2-1-0-5-6-7`, its fixed-label graph6 string is
`GhE?GC`, the marked vertices are \(u=5,v=7\), and the ordinary leaf is
\(z=4\) with support \(s=3\).  Put \(C=B-\{z,s\}\) and
\(H=B-N[s]\).  Literal independent-subset enumeration gives

```
C_E = (1,6,10,4)    H_E = (1,5,6,1)    S_E = (2,11,16,5)
C_U = (1,5, 7,2)    H_U = (1,4,4)      S_U = (2, 9,11,2)
C_V = (1,5, 6,1)    H_V = (1,4,3)      S_V = (2, 9, 9,1)
C_W = (1,4, 4,1)    H_W = (1,3,2)      S_W = (2, 7, 6,1)
```

where \(S=C+H\).  Hence \(\alpha(W)=3\), and at \(r=5\):

```
adjacent N term       = 146
nested N polar term   = 244
A_5                   = 390

[R(S)-R(H)]_(4,4)     = 4
[R(S)-R(H)]_(3,5)     = 5
B_5 = 2(4-5)          = -2

A_5+B_5               = 388
```

The full independence polynomial is \((1,8,21,20,5)\).

## Minimal-order certificate

The verifier exhausts every unlabeled forest in the NetworkX graph atlas of
orders four through seven, every admissible ordinary leaf and unordered
marked pair, and every collar rank \(2\le r\le\alpha(W)+2\).  The exact
census is:

| order | forests | configurations | cells |
|---:|---:|---:|---:|
| 4 | 6 | 13 | 13 |
| 5 | 10 | 78 | 156 |
| 6 | 20 | 396 | 1,094 |
| 7 | 37 | 1,390 | 4,882 |
| total | 73 | 1,877 | 6,145 |

There are no negative \(A\), \(B\), or coupled-gap cells in this census;
the respective minima are \(12,0,18\).  Thus order eight is minimal for this
separate-\(B\) obstruction.

## Scope

This result refutes only the proposed componentwise all-rank proof
\(A_r\ge0\) and \(B_r\ge0\) on the induction-closed collar.  It does not
refute the strict-prefix census, the coupled inequality \(A_r+B_r\ge0\),
forest independent-set unimodality, or Erdos Problem #993.  Any continuing
proof must retain the compensation between \(A_r\) and \(B_r\), or supply a
separate rigorous cross-rank telescope.

## Replay

Run:

```powershell
python verify_iso_compact_ordinary_allrank_split_counterexample_root.py
```

The terminal marker is
`PASS_EXACT_ISO_COMPACT_ORDINARY_ALLRANK_SPLIT_COUNTEREXAMPLE`.  The verifier
rewrites
`iso_compact_ordinary_allrank_split_counterexample_exact_root_20260829.json`
from literal enumeration and checks the witness and the complete lower-order
census by exact integer arithmetic.
