# Double-broom BB Newton sector

Date: 2026-08-29

Status: **exact all-order sector theorem.**  The mixed sectors remain open, so
this is not the double-broom theorem, all-forest ISO, or a solution of Erdős
Problem 993.

Put

\[
\phi=z+w+zw,\qquad \delta=\frac{(z-w)^2}{2},
\]

and for a polynomial `P` define the exact ISO kernel

\[
K(P)=zwP(z)P(w)+\frac{z-w}{2}
\bigl(P'(z)P(w)-P(z)P'(w)\bigr).
\]

If `P_t=(1+x)^tP`, direct differentiation gives

\[
K(P_t)=((1+z)(1+w))^tK(P)
-t\delta((1+z)(1+w))^{t-1}P(z)P(w).
\]

The all-`B` part of the nested four-minor is

\[
K(P_{t+2})-2(1+zw)K(P_{t+1})+(1+zw)^2K(P_t).
\]

Taking its `h`-th Newton coefficient in `t` yields exactly

\[
\mathcal B_h(P)=
(z+w)^2\phi^hK(P)-\delta P(z)P(w)
\left(h(z+w)^2\phi^{h-1}+2(z+w)\phi^h\right).
\tag{1}
\]

## Universal coefficient proof

Let

\[
P(x)=\prod_s(1+\lambda_sx),\qquad \lambda_s\ge0.
\]

The logarithmic-derivative identity gives

\[
K(P)=zwP(z)P(w)-\delta\sum_s\lambda_s^2
\prod_{q\ne s}(1+\lambda_qz)(1+\lambda_qw).
\tag{2}
\]

Fix a monomial in the `lambda` variables having `a` exponents equal to two
and `b` exponents equal to one.  In `P(z)P(w)` its coefficient is

\[
(zw)^a(z+w)^b,
\]

and in the sum in (2) it is

\[
a(zw)^{a-1}(z+w)^b.
\]

For convenience set

\[
A_{B,H}(q)=[z^qw^q](z+w)^B\phi^H,
\]

and

\[
D_{B,H}(q)=[z^qw^q]\delta(z+w)^B\phi^H.
\]

Since

\[
(z+w)^B\phi^H=
\sum_{c=0}^H\binom Hc(zw)^c(z+w)^{B+H-c},
\]

only one `c` contributes to any fixed bidegree.  Hence `A>=0`.  If
`c=2q-2-B-H` and `T=B+H-q+1`, the two terms in `D` differ by

\[
\binom Hc\left(\binom{2T}{T-1}-\binom{2T}{T}\right)
=-\binom Hc\frac{\binom{2T}{T}}{T+1}\le0,
\]

with the usual zero convention outside the support.

Writing `R=r-a`, the coefficient of the fixed root monomial in
`[z^rw^r] mathcal B_h(P)` is exactly

\[
A_{b+2,h}(R-1)
-aD_{b+2,h}(R+1)
-hD_{b+2,h-1}(R)
-2D_{b+1,h}(R).
\tag{3}
\]

Every term in (3) is nonnegative.  This proves coefficientwise positivity in
the `lambda_s`, and therefore numerical nonnegativity whenever all
`lambda_s>=0`.

For the path independence polynomial the exact factorization is

\[
P_m(x)=\prod_{j=1}^{\lfloor(m+1)/2\rfloor}
\left(1+4\cos^2\frac{j\pi}{m+2}\,x\right),
\]

so all factor weights are positive and (3) proves the complete BB sector for
every double-broom path length, rank, and Newton order.

## Verification and boundary

`prove_iso_double_broom_bb_sector_agent.py` independently expands generic
linear factors, compares every literal root monomial with (3), and directly
replays path rows.  Those computations audit the formulas; the displayed
monomial classification and central-binomial identity are the all-order
proof.

The exact five-group expansion also contains `BX+BY`, `XY`, and `BZ`.  Those
groups can be negative separately and are not covered by this theorem.  They
must be paid jointly before the connected double-broom terminal family is
closed.
