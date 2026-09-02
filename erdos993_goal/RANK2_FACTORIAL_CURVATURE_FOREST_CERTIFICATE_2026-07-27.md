# Rank-2 factorial curvature for every forest

Date: 2026-07-27

For every forest \(F\), with \(i_j=i_j(F)\),

\[
\boxed{4i_2^2-6i_1i_3\ge0.}
\tag{1}
\]

This is the rank-2 factorial-curvature inequality.  It supplies the
low-rank constraint needed by the rank-5 isolated-vertex payment
certificate.

Let \(n=|V(F)|\), let \(m=|E(F)|\), and put

\[
S=\sum_{v\in V(F)}\binom{d(v)}2.
\]

Because a forest has no triangles, elementary inclusion-exclusion gives

\[
i_2=\binom n2-m,\qquad
i_3=\binom n3-m(n-2)+S.
\]

Consequently

\[
4i_2^2-6ni_3
=n^3-n^2+2mn^2-8mn+4m^2-6nS.
\tag{2}
\]

The quantity \(S\) counts adjacent pairs among the \(m\) edges, hence
\(S\le\binom m2\).  Substitution in (2) gives a lower bound that is
quadratic in \(m\), with second derivative

\[
2(4-3n)\le0\qquad(n\ge2).
\]

It is therefore concave on the forest interval \(0\le m\le n-1\), so
its minimum occurs at an endpoint.  The two endpoint values are

\[
n^2(n-1)
\quad\text{and}\quad
2(n-1)(n-2),
\]

both nonnegative.  Orders zero and one are immediate.  This proves
(1).

After normalizing \(i_3=1\) and writing

\[
w=\frac{i_2}{i_3},\qquad v=\frac{i_1}{i_3},
\]

(1) becomes the sharp cone constraint

\[
v\le\frac23w^2.
\]

The symbolic replay is

```powershell
python .\verify_rank2_factorial_curvature_forests.py
```
