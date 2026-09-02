# Stable path P4: positive-intersection multiplicative recurrences through order 6

For the positive-intersection two-layer lift, remove the known factor

\[
(1+z)^{2c+2m+x-1}
\]

from its Newton polynomial in the support-distance coordinate. Let the
remaining quotient coefficients be \(Q_{\epsilon,k}(c,m,x)\). On

\[
c\ge1,\qquad m\ge3,\qquad x\ge0,
\]

both parities satisfy, for every \(0\le k\le6\), the three exact
multiplicative recurrences corresponding to

\[
x\mapsto x+1,qquad c\mapsto c+1,qquad m\mapsto m+1.
\]

Their baseline quotient multipliers are respectively

\[
1+2z,qquad (1+2z)^2,qquad (1+2z)^2,
\]

with the explicit central-binomial factor included in the \(m\)
recurrence.

## Exact certificates

After shifting

\[
c=1+C,\qquad m=3+M,
\]

all 42 rational recurrence numerators have nonnegative ordinary
monomial coefficients in \(C,M,x\). The common positive denominators
are

\[
D_0(m)=\prod_{i=1}^{10}(m+i),
\qquad
D_1(m)=\prod_{i=2}^{10}(m+i).
\]

For the shifted \(m\)-recurrence they telescope by

\[
\frac{D_0(m)}{D_0(m+1)}=\frac{m+1}{m+11},
\qquad
\frac{D_1(m)}{D_1(m+1)}=\frac{m+2}{m+11},
\]

so the only additional denominator is the positive factor \(m+11\).

At the new top order \(k=6\), the six numerator certificates have the
following degree lists and term counts:

\[
\begin{array}{c|c|c|c}
\epsilon&\text{coordinate}&\deg_{C,M,x}&\text{terms}\\ \hline
0&c&(13,22,12)&1495\\
0&x&(13,21,11)&1462\\
0&m&(14,23,12)&1833\\
1&c&(12,20,11)&1174\\
1&x&(12,19,10)&1144\\
1&m&(13,21,11)&1462
\end{array}
\]

Every coefficient is nonnegative; the smallest positive top-order
coefficient is \(64/155925\).

The replay script is
`prove_path_isolate_p4_positive_intersection_initial_multiplicative_order5_sparse.py --order 6`.
The full machine-readable record is
`path_isolate_p4_positive_intersection_initial_multiplicative_order0_to_6_20260801.json`.

This theorem advances the finite certified front by one order. It does
not replace the remaining all-order affine two-kernel domination.
