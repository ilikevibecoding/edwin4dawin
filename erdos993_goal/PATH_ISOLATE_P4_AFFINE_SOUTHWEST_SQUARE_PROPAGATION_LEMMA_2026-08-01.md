# Stable path P4: affine southwest-square propagation lemma

This lemma gives a finite-entry route for the all-order affine bridge. It
does not by itself prove that uniform entry occurs.

## Reciprocal setup

Put

\[
A=(1+z)(1+w),\qquad
S=z^2+w^2+zw(z+w),\qquad
W=z+w+zw.
\]

For fixed admissible \((c,m,x,\epsilon)\), define

\[
a=2c+m+x-3,
\qquad
b=2m+\epsilon-4,
\]

and the fixed reciprocal extraction target

\[
N=2c+4m+x+2\epsilon+8.
\]

Let \(B^\vee_\epsilon,P^\vee\) be the reciprocal affine base and
positive reserve kernels of bidegree \((24,24)\). Define

\[
F_r=A^aS^bW^r(B^\vee_\epsilon+rP^\vee).              \tag{1}
\]

The desired order-\(r+1\) affine coefficient is
\([z^Nw^N]F_r\), up to a common positive scalar.

## Propagation identity

Direct algebra gives

\[
\boxed{F_{r+1}=WF_r+A^aS^bW^{r+1}P^\vee.}             \tag{2}
\]

Every coefficient of \(W\), \(A\), \(S\), and \(P^\vee\) is
nonnegative.

## Southwest-square lemma

Let

\[
\mathcal S_N=\{(i,j):0\le i\le N,\ 0\le j\le N\}.
\]

If every coefficient of \(F_{r_0}\) indexed by \(\mathcal S_N\) is
nonnegative, then the same is true for \(F_r\) for every \(r\ge r_0\).

Indeed, the coefficient of \(WF_r\) at \((i,j)\) is

\[
[z^{i-1}w^j]F_r+[z^iw^{j-1}]F_r+[z^{i-1}w^{j-1}]F_r,
\]

where coefficients with a negative index are zero. Each predecessor of
a point in \(\mathcal S_N\) is again in \(\mathcal S_N\), and the second
term of (2) is coefficientwise nonnegative. This proves the claim by
induction.

In particular, one verified entry order proves every later desired
central coefficient automatically.

## Exact finite evidence

`probe_path_isolate_p4_group_affine_southwest_square_entry.py` tested 11
parameter points in both parities, through order 40, using exact integer
arithmetic. Every case entered the square cone, at orders between 0 and
24, and no case subsequently left. The record is
`path_isolate_p4_group_affine_southwest_square_entry_probe_20260801.json`.

The thresholds are not bounded by a small universal constant in these
samples: for \((c,m,x)=(1,3,48)\), entry occurs at order 24 in both
parities. Thus the remaining proof needs a parameter-dependent entry
bound together with control of the pre-entry central coefficients.

A larger ray audit upgrades this to all-order finite evidence. It checks
86 zero-excess parameter triples, hence 172 parity cases, on the two
extreme rays \(c=1\), \(m=3\), and three balanced rays through parameter
20. Every pre-entry target coefficient is nonnegative, every case enters,
and the maximum entry order is 28. Propagation then certifies every later
order. See
`PATH_ISOLATE_P4_AFFINE_ALL_ORDER_RAY_AUDIT_2026-08-01.md`.

The last negative coefficients before entry are frequently on the
boundary of \(\mathcal S_N\). This makes a boundary-layer estimate a
more precise next target than global HCU or full coefficientwise
positivity, both of which are unnecessarily strong.
