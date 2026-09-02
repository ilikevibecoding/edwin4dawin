# Smallest obstruction to the source-paired ordinary sub-split

## Exact witness

Although

\[
G_N(C,H)=L_N(C)+2B_N(XC,XH)
\]

is the correct source-paired compensation identity, its two summands are not
separately nonnegative.  Take the order-seven forest with edges

```
(0,1), (1,2), (1,4), (1,5),
```

fixed-label graph6 `FgP??`, marks \(u=3,v=6\), ordinary leaf \(z=0\) with
support \(s=1\), and rank \(r=4\).  Literal independent-set enumeration
gives, in doubled diagonal units,

```
adjacent N             =  820
nested N polar         =  -80
A_4                    =  740
B_4                    =   98

L_N(C)                 =  950
2 B_N(XC,XH)           = -112
coupled G_4            =  838
```

Thus the negative cross term is paid exactly by the isolate reserve.

## Minimality

The verifier exhausts every atlas forest of orders four through six, every
ordinary marked configuration, and every collar rank
\(2\le r\le\alpha(W)+2\): 36 forests, 487 configurations, and 1,263 rank
cells.  There are no negative isolate, cross, or full-gap cells, and their
respective minima are \(14,4,18\).  Hence order seven is minimal for this
sub-split obstruction.

This does not refute the coupled gap, the rank-four top-collar theorem,
forest ISO, or Erdos Problem #993.

## Replay

Run

```powershell
python verify_iso_compact_ordinary_source_paired_subsplit_counterexample_root.py
```

The terminal marker is
`PASS_EXACT_ISO_COMPACT_ORDINARY_SOURCE_PAIRED_SUBSPLIT_COUNTEREXAMPLE`.
