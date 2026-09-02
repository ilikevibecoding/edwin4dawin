# Same-order rank-three forest mixtures

Date: 2026-07-29

## Statement

For a forest \(G\), let

\[
x(G)=(S,H_2,H_3,C_0,C_1)
\]

be its rank-three residual moment vector, and write

\[
Q(x)=H_2^2+4H_2C_0-SH_3-3SC_1-S^2.
\]

If \(G_1,\ldots,G_t\) are forests of one common order \(n\ge17\)
and \(\lambda_j\ge0\), then

\[
\boxed{Q\left(\sum_j\lambda_jx(G_j)\right)\ge0.}
\]

Because \(Q\) is homogeneous of degree two, it is enough to consider
\(\sum_j\lambda_j=1\).

## Degree-moment formula

First consider one forest with component count \(c\).  Let
\(s_2,s_3\) and \(p\) denote
\(\sum_vd_v^2,\sum_vd_v^3\), and
\(\sum_{uv\in E}d_ud_v\).  Direct expansion gives

\[
\begin{aligned}
Q={}&-12c^3+8c^2n^2+32c^2n-8c^2
+cn^4-12cn^3-43cn^2+26cn\\
&+(12c+6n^2-18n)p+5s_2^2\\
&+(16cn-10c-15n^2+9n)s_2\\
&+(2c+n^2-3n)s_3+28n^3-20n^2.
\end{aligned}
\]

Both the coefficient of \(s_3\) and one sixth of the coefficient of
\(p\) equal

\[
S=2c+n^2-3n.
\]

There is one necessary correction when these statistics are averaged
over a mixture.  The coordinate \(C_1\) contains a \(c^2\) term.
If \(c\) now denotes the mean component count, then the actual
mixture payment is

\[
Q_{\rm mix}=Q_{\rm mean}-6S\operatorname{Var}(c).
\]

Put \(m=n-c\), the mean number of edges.  Every forest in the
mixture has between \(0\) and \(n-1\) edges, so

\[
\operatorname{Var}(c)=\operatorname{Var}(|E|)
\le m(n-1-m).
\]

For each forest,

\[
p\ge s_2-m,
\]

because \((d_u-1)(d_v-1)\ge0\) on every edge.  Cauchy's inequality,
applied across all vertices in the mixture, gives

\[
s_3\ge\frac{s_2^2}{2m}
\]

when \(m>0\).  Substitution produces a quadratic lower bound

\[
2mQ\ge As_2^2+Bs_2+C
\]

with

\[
\begin{aligned}
A={}&8m+n^2-n,\\
B={}&-2m(16mn+2m-7n^2+7n),\\
C={}&2m\bigl(
14m^2n^2+2m^2n-8m^2\\
&\qquad-mn^4-10mn^3+21mn^2-10mn\\
&\qquad+n^5-4n^4+5n^3-2n^2
\bigr).
\end{aligned}
\]

Here the component-variance upper bound has already been subtracted,
so this is a lower bound for the true mixture payment, not merely for
the expression obtained by substituting mean component count.

## Positivity

One has

\[
4AC-B^2=4mE(m,n).
\]

At the tree boundary \(m=n-1\),

\[
E(n-1,n)=(n-1)^3(n-2)^2(2n-33).
\]

Put \(p_0=n-1-m\).  Exact division gives

\[
E(m,n)=E(n-1,n)+p_0R(n,p_0),
\]

where

\[
\begin{aligned}
R(n,p_0)={}&
2n^6-22n^5+91n^4-372n^3+945n^2-1040n+396\\
&+4(n-1)(3n^3-11n^2+19n-99)p_0\\
&+4(8n^2+8n+33)p_0^2.
\end{aligned}
\]

Every coefficient of this polynomial becomes coefficientwise
nonnegative after \(n=N+17\).  Thus \(E\ge0\), and \(A>0\), so the
quadratic lower bound is globally nonnegative.  When \(m=0\), every
forest in the mixture is edgeless and

\[
Q=n^2(n-1)^2(n-2)\ge0.
\]

## Verification

`verify_same_order_rank3_mixture.py` symbolically rederives every
displayed identity and writes
`same_order_rank3_mixture_certificate_20260729.json`.

This lemma does not by itself prove collective link compatibility:
residual links of one ambient forest can have different orders.  It
does isolate that cross-order interaction as the remaining issue.
