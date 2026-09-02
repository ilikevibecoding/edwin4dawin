# Rank-three component-variance theorem for forests

Date: 2026-07-29

## Theorem

Let \(F\) be a forest of order at least four.  At global rank three,
choose a vertex \(v\) with probability proportional to

\[
h_v=|V(F-N[v])|=n-1-d_v.
\]

Let \(c_v\) be the number of components of \(F-N[v]\), and put

\[
A_v=h_v-3+\frac{2c_v}{h_v}
\]

on the positive-mass vertices.  Then

\[
\boxed{\operatorname{Var}_h(A_v)\le1+\mathbb E_hc_v.}
\tag{CV3}
\]

Thus the component-variance inequality is proved for every forest at
rank three.

## Covariance reduction

Set \(z_v=2c_v/h_v\).  Since \(0\le c_v\le h_v\), one has
\(0\le z_v\le2\) and therefore

\[
\operatorname{Var}_h(z_v)\le1.
\tag{1}
\]

Also \(A_v=n-4-d_v+z_v\).  Consequently (CV3) follows once

\[
\mathcal B:=
\mathbb E_hc_v-\operatorname{Var}_h(d_v)
+2\operatorname{Cov}_h(d_v,z_v)\ge0.
\tag{2}
\]

If \(F\) has \(C\) components, then

\[
c_v=C-1+\sum_{u\sim v}(d_u-1).
\]

Writing \(S_j=\sum_vd_v^j\) and
\(Q_d=\sum_{uv\in E}d_ud_v\) gives the exact identities

\[
\sum_vc_v=n(C-1)+S_2-S_1,
\qquad
\sum_vd_vc_v=(C-1)S_1+2Q_d-S_2.
\tag{3}
\]

These identities expand (2) without any inequality.

## Nonnegative parameterization

Remove the \(I\) isolated vertices.  Suppose first that a nonempty
forest remains, and let \(T+1\) be its number of components.  On its
vertices set

\[
x_v=d_v-1,\quad
N=\sum_vx_v,\quad
X_j=\sum_vx_v^j,\quad
Q=\sum_{uv\in E}x_ux_v.
\]

All these variables are nonnegative.  If \(M=\sum_vh_v\), exact
expansion gives

\[
M^2\mathcal B
=\mathcal C+MX_3+6MQ+\mathcal B_1X_2+5X_2^2,
\tag{4}
\]

where

\[
\begin{aligned}
M={}&I^2+2IN+4IT+3I\\
&+N^2+4NT+N+4T^2+4T,
\end{aligned}
\]

and

\[
\begin{aligned}
\mathcal B_1={}&10I^2+4IN+24IT+14I\\
&-6N^2-8NT+4N+8T^2+8T.
\end{aligned}
\tag{5}
\]

The symbolic certificate records the full constant
\(\mathcal C=\mathcal C(I,N,T)\).

At \(I=0\), it has the compact form

\[
\begin{aligned}
\mathcal C_0={}&N^4(T+2)
+N^3(8T^2+12T-3)\\
&+N^2T(24T^2+32T-5)\\
&+16NT^2(2T^2+3T+1)
+16T^3(T+1)^2.
\end{aligned}
\tag{6}
\]

For \(T\ge1\), every displayed coefficient is nonnegative.  For
\(T=0\), \(\mathcal C_0=N^3(2N-3)\ge0\) when \(N\ge2\).
The isolated-vertex increment
\(\mathcal C-\mathcal C_0\) is nonnegative: all coefficients are
manifestly nonnegative except the linear coefficient's apparent
\(-3N^2\), which occurs inside
\(N^2(N^2+4N-3)\ge0\) for \(N\ge1\).

If \(\mathcal B_1\ge0\), (4) is now nonnegative.  Otherwise \(N>0\),
and Cauchy--Schwarz gives \(X_2^2\le NX_3\).  Hence

\[
M^2\mathcal B\ge
\mathcal C+\left(5+\frac MN\right)X_2^2
+\mathcal B_1X_2.
\tag{7}
\]

The global minimum of this quadratic is nonnegative precisely when

\[
\Delta=4(M+5N)\mathcal C-N\mathcal B_1^2\ge0.
\tag{8}
\]

At \(I=0\),

\[
\Delta=8N^3(N-2)(N+1)^2\ge0
\]

when \(T=0\).  When \(T\ge1\), \(\Delta/4\) is a polynomial whose
only negative-looking groups are

\[
\begin{aligned}
&N^4(39T-6),\\
&N^3(232T^2-2T-4),\\
&N^2T(92T-16),\\
&NT^2(128T-16),
\end{aligned}
\]

and all are nonnegative.  The remaining terms have positive
coefficients.  Adding isolates increases \(M\) and \(\mathcal C\),
and changes

\[
\mathcal B_1-\mathcal B_1|_{I=0}
=2I(5I+2N+12T+7)\ge0.
\]

Thus, while \(\mathcal B_1<0\), adding isolates decreases its square
and can only improve (8).  This proves \(\mathcal B\ge0\).

The exceptional base \(T=0,N=1,I=0\) is the three-vertex path and is
checked directly; adding one isolate makes both
\(\mathcal B_1\) and \(\mathcal C\) positive.  A forest consisting
only of isolates has constant \(A_v\).  This covers the degenerate
cases and completes the proof.

Combining (1) and (2) proves (CV3).

## Verification

Run `verify_rank3_forest_component_variance.py`.  It symbolically
checks (3)--(8), the isolated-vertex increments, and the factorizations,
then writes
`rank3_forest_component_variance_certificate_20260729.json`.

This closes the component-variance bridge only at global rank three.
The arbitrary-rank form and the stronger terminal variance required
by NCL remain open.
