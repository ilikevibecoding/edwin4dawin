# Forced near-sector support-edge reduction

Date: 2026-08-13

Status: exact all-order reduction plus an exact counterexample to
first-positive-term payment.  This does **not** prove the forced selector
ceiling.  It identifies the two support-edge births which distinguish the
forced chart from the now-closed unforced chart, and shows that any forced
proof must retain at least two positive response terms (or use a genuinely
global tail argument).

## 1. Forced coordinates and shifted support

On the forced chart,

```text
s=2m+2a-3,       R=2m-6,       K=4m+a-e-4,
e in {1,2},      1<=a<=2m-2e-3.                       (1)
```

The coefficient `c_(R,s,h)` first becomes nonzero at

```text
h=a+2.
```

Write

```text
h=a+2+ell,       j=s-2h=R-1-2ell,       V=1+2ell.    (2)
```

Recall the active-box weights

```text
w_(j,h,v)=binom(j+v,j)[x^h]D(x)^v(1-x)^(-2j-1)>0,
D(x)=x(3-x)/(1-x)^2.                                  (3)
```

The exact expansion is

```text
c_(R,s,h)=sum_(v=0)^V w_(j,h,v) binom(R,j+v).          (4)
```

Replacing `R` by `R+2` retains all terms in (4) and introduces exactly two
support-edge births:

```text
c_(R+2,s,h)
 =sum_(v=0)^V w_(j,h,v) binom(R+2,j+v)
  +(R+2)w_(j,h,V+1)+w_(j,h,V+2).                      (5)
```

Thus the response coefficient is exactly

```text
d_h=sum_(v=0)^V w_(j,h,v)binom(R,j+v)(K-b_(j+v))
    -(R+2)w_(j,h,V+1)-w_(j,h,V+2),                    (6)

b_n={(R+2)(R+1)}/{(R+2-n)(R+1-n)}.                   (7)
```

Equations (4)--(6) are all-order identities.  They isolate the obstruction:
the common part is a TP positive mixture with increasing `b_n`, but the two
new boundary boxes are uncompensated negative births.  On the unforced
chart those boxes were inside the old support; on the forced chart they are
not.

There is one additional initial birth at `h=a+1`: `c_(R,s,a+1)=0` while
`c_(R+2,s,a+1)>0`.  Hence the forced response begins with a negative term
before (4) starts.

## 2. Exact failure of one-term payment

A tempting continuation of the unforced proof is: prove one sign change,
then ask the first positive weighted response term to pay the entire
negative head.  This statement is false.

Take the admissible forced cell

```text
(e,m,a,s,R,K)=(2,25,22,91,44,116).                    (8)
```

The support begins at `h=24`; the last negative coefficient is at `h=26`.
Exact integer evaluation gives

```text
negative weighted head =
3743032795539456463889015458784591620341859616244663139587294111299794566156910206124032,

first positive weighted term =
2576985367631470282679200274108789899774138671375897133971847551086940758797853799743488.
```

Their exact ratio is

```text
349411583134491989015872/507515110966978198229133 < 1. (9)
```

So the scalar architecture of unforced inequality (19), with only the
first post-head term retained, cannot prove the forced chart.

The next positive term is already

```text
694971784082036289693939478192373939544180715347824400609083774566203810505537895654272796721152,
```

and the first two positive terms divided by the negative head equal

```text
31410240722932191391840098838720/169171703655659399409711 > 1. (10)
```

This does not prove two-term payment all-order, but it sharply redirects the
proof: retain the two edge births in (6) and at least the first two positive
tail terms.  A one-term gap bound is structurally too weak.

## 3. Exact replay and remaining lemma

The companion replay
`verify_lower_selector_near_sector_forced_support_edge_reduction.py`
checks (4)--(6) coefficientwise by exact integer arithmetic, certifies the
counterexample (8)--(10), and records bounded diagnostics for the shifted
one-sign-change/two-term route.  The bounded diagnostics are evidence only.

The exact remaining forced lemma can now be stated without ambiguity:

> For the two chart families (1), the sequence defined by (6), preceded by
> the initial birth at `h=a+1`, has weighted positive tail larger than its
> weighted negative head at `K`; a sufficient sharpened form may retain the
> first two positive terms.

No scan is promoted to that lemma.  The replay reports

```text
PASS_EXACT_FORCED_SUPPORT_EDGE_REDUCTION_AND_COUNTEREXAMPLE_REPLAY.
```
