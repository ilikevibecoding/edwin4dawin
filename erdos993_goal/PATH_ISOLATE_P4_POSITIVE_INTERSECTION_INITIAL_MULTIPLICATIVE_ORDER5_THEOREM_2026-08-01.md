# Stable path P4: positive-intersection multiplicative recurrences through order 5

Date: 2026-08-01

Let

\[
F_\epsilon(z)=(1+z)^{2c+2m+x-1}
\sum_{k\ge0}Q_{\epsilon,k}(c,m,x)z^k
\]

be the formal quotient of the normalized positive-intersection lift
residual, with \(c\ge1\), \(m\ge3\), \(x\ge0\), and
\(\epsilon\in\{0,1\}\).  Then for every \(0\le k\le5\), coefficientwise
in the formal Newton variable,

\[
\begin{aligned}
Q_{\epsilon,k}(c+1,m,x)
&\ge Q_{\epsilon,k}(c,m,x)
 +4Q_{\epsilon,k-1}(c,m,x)
 +4Q_{\epsilon,k-2}(c,m,x),\\
Q_{\epsilon,k}(c,m,x+1)
&\ge Q_{\epsilon,k}(c,m,x)
 +2Q_{\epsilon,k-1}(c,m,x),
\end{aligned}
\tag{1}
\]

where coefficients with negative subscripts are zero.  With the actual
central-binomial normalization, the corresponding \(m\)-recurrence is

\[
\rho_\epsilon(m)Q_{\epsilon,k}(c,m+1,x)
\ge Q_{\epsilon,k}(c,m,x)
 +4Q_{\epsilon,k-1}(c,m,x)
 +4Q_{\epsilon,k-2}(c,m,x),
\tag{2}
\]

where

\[
\rho_0(m)=\frac{2(2m+1)}{m+1},
\qquad
\rho_1(m)=\frac{2(2m+3)}{m+2}.
\]

Equivalently, the formal quotient satisfies the multiplicative lower
bounds

\[
Q(c+1)\succeq(1+2z)^2Q(c),\qquad
Q(x+1)\succeq(1+2z)Q(x),
\]

and the normalized analogue for \(m\), through quotient order 5.

## Exact denominator reduction

At order 5 all support values are put over the common positive
denominators

\[
D_0(m)=\prod_{i=1}^{9}(m+i),
\qquad
D_1(m)=\prod_{i=2}^{9}(m+i).
\]

The \(c\)- and \(x\)-residuals in (1) retain these denominators.  For
the \(m\)-residual, the identities

\[
\frac{D_0(m)}{D_0(m+1)}=\frac{m+1}{m+10},
\qquad
\frac{D_1(m)}{D_1(m+1)}=\frac{m+2}{m+10}
\]

cancel the denominator in \(\rho_\epsilon\).  Thus, after multiplication
by the positive factor \((m+10)D_\epsilon(m)\), the two \(m\)-numerators
are ordinary polynomials.

After the main-region shift

\[
c=1+C,\qquad m=3+M,
\]

all 36 residual numerators (two parities, six orders, three coordinates)
have nonnegative ordinary monomial coefficients in \(C,M,x\).  Hence
(1)--(2) hold throughout the stated domain.

For the newly added orders 4 and 5, the certificate sizes range from 448
to 1,232 nonzero monomials.  Their smallest positive coefficients range
from \(64/4725\) upward; none is negative.

## Consequence for the grouped finite numerator

The grouped coordinate numerator has maximum orders

\[
J_x=3,\qquad J_c=J_m=5.
\]

Its fixed base kernel at tail index \(r=0\) is exactly the corresponding
multiplicative recurrence residual at order \(J_d\).  Therefore this
theorem proves the required diagonal nonnegativity of all six fixed base
endpoints in the main region.

The theorem does not by itself control the elevated expression
\(V^r(B_d+rP_d)\) for arbitrary \(r>0\); that remains the infinite-tail
domination problem.

## Replayable certificate

The verifier is
`prove_path_isolate_p4_positive_intersection_initial_multiplicative_order5_sparse.py`.
Its machine-readable record is
`path_isolate_p4_positive_intersection_initial_multiplicative_order0_to_5_20260801.json`,
which reports
`PASS_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_INITIAL_MULTIPLICATIVE_ORDER0_TO_5`
with 36 certificates and zero negative ordinary coefficients.
