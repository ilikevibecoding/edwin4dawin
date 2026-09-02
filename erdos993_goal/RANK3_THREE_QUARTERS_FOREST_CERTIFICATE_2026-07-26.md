# Rank-3 three-quarters cascade for every forest

Date: 2026-07-26

This note extends the connected-tree result in
`RANK3_THREE_QUARTERS_TREE_CERTIFICATE_2026-07-26.md` to disconnected
forests.  Together they prove

\[
\boxed{\quad
3H_3(I(G))\geq4H_2(I(G-\{\ell,p\}))
\quad}
\tag{1}
\]

for every pendant edge \(\ell p\) of every forest whenever rank three
lies in the required prefix.  This is still a low-rank theorem, not a
resolution of all ranks of Erdős Problem 993.

## 1. Component-excess variables

Let \(G\) have \(e\) edges, \(c\) components, and \(h\) nontrivial
components, so \(n=e+c\).  On the nonisolated vertices put

\[
x_v=d(v)-1,\qquad E=\sum_vx_v=e-h,
\]

and define

\[
M_j=\sum_vx_v^j,\qquad
J=\sum_{uv\in E(G)}x_ux_v.
\]

As in the connected proof,

\[
Z=\frac{M_2+E}{2},\qquad
T=\frac{M_3-E}{6}+J.
\tag{2}
\]

Let \(x=d(p)-1\) and
\(S=\sum_{u\in N(p)}(d(u)-1)\).  After clearing the positive
denominators in (1), the exact gap is

\[
\Delta=9(n-2)G_3(I(G))-8i_2(G)G_2(I(F)).
\tag{3}
\]

Substitution of (2) shows that the coefficients of \(J,S,M_3\) in
\(\Delta\) are, respectively,

\[
18(n-2)K,\qquad -12(n-2)K,\qquad3(n-2)K,
\]

where

\[
K=n^2-n-2e=2i_2(G)>0.
\]

If \(x\geq1\), then \(J\geq xS\), and therefore

\[
18J-12S
=\left(18-\frac{12}{x}\right)J
+\frac{12}{x}(J-xS)\geq0.
\tag{4}
\]

We may drop this contribution.  The remaining expression is a convex
quadratic in \(M_2\).  As before,

\[
M_3\geq3M_2-2E\quad(E\leq M_2\leq2E),
\qquad
M_3\geq\frac{M_2^2}{E}\quad(M_2\geq2E).
\tag{5}
\]

## 2. Exact orthant certificate for \(x\geq1\)

Rank three in the prefix implies \(\alpha(G)\geq6\).  Since \(G\) has
an edge, \(n\geq7\).

When \(h\geq2\), write

\[
x=1+X,\quad E=x+a,\quad h=2+H,\quad c=h+v.
\]

Then \(X,a,H,v\geq0\), and \(n\geq7\) becomes

\[
X+a+2H+v\geq2.
\]

Its nonnegative integer lattice is the union of the seven orthants
rooted at

\[
\begin{gathered}
(2,0,0,0),(0,2,0,0),(0,0,1,0),(0,0,0,2),\\
(1,1,0,0),(1,0,0,1),(0,1,0,1).
\end{gathered}
\tag{6}
\]

When \(h=1\), disconnectedness gives \(c=2+v\), and
\(n\geq7\) becomes \(X+a+v\geq3\).  Its lattice is the union of the ten
orthants rooted at the weak compositions of \(3\) into
\((X,a,v)\).

In the first region of (5), put

\[
M_2=E(1+t),\qquad0\leq t\leq1.
\]

The lower bound is quadratic in \(t\).  At every orthant in (6), and at
eight of the ten \(h=1\) orthants, all three exact Bernstein
coefficients have nonnegative power coefficients in the unbounded
variables.

The two remaining roots are

\[
(X,a,v)=(2,1,0),\qquad(3,0,0).
\]

The first root itself is infeasible because
\(M_2\geq x^2+a=10>2E=8\); every other lattice point in that orthant is
covered by the three positive shifts

\[
(3,1,0),\quad(2,2,0),\quad(2,1,1).
\]

At the second root, region-one feasibility forces \(a\geq1\), and the
shift \((3,1,0)\) has nonnegative coefficients.  This proves positivity
throughout the first moment region.

In the second region of (5), minimize the resulting quadratic over the
entire real line.  Its leading coefficient is positive, and the
denominator of its vertex value is

\[
16\left(
4c^2+8ce-4c+4e^2-3e-9h
\right)>0.
\]

The exact numerator has nonnegative power coefficients on every orthant
above except at three individual parameter tuples.  All nonexceptional
points in the two special orthants are covered by the shifts

\[
\begin{gathered}
(3,1,0),(2,2,0),(2,1,1),\\
(3,0,1),(5,0,0).
\end{gathered}
\]

At the three uncovered tuples, the quadratic vertex lies below the
feasible moment interval.  The feasible moment is forced, and direct
exact substitution gives the positive lower bounds

\[
4119,\qquad12400,\qquad42030.
\tag{7}
\]

## 3. A pendant \(K_2\) component

It remains to allow \(x=0\), meaning that the pendant component is
\(K_2\).  Then \(S=0\).

If \(E>0\), another nontrivial component exists, so write

\[
E=1+a,\qquad h=2+H,\qquad c=h+v.
\]

In the first moment region, every exact Bernstein coefficient has
nonnegative power coefficients in \(a,H,v\).  In the second region, the
numerator of the unconstrained vertex value also has entirely
nonnegative power coefficients.  Its denominator is

\[
\begin{aligned}
16(&16H^2+16Ha+16Hv+64H+4a^2+8av+37a\\
&+4v^2+36v+65)>0.
\end{aligned}
\]

If \(E=0\), every nontrivial component is \(K_2\), and
\(\alpha(G)=c\).  Since rank three is required, put

\[
c=6+y,\qquad
h=1+u(c-1),\qquad y\geq0,\quad0\leq u\leq1.
\]

The exact gap is degree six in \(u\); all seven Bernstein coefficients
have positive power coefficients in \(y\).

## 4. Independent verification

`verify_rank3_three_quarters_forests.py` reconstructs (2)--(5), builds
every orthant transformation, checks every power and Bernstein
coefficient with exact rational arithmetic, and evaluates (7).  It
prints `PASS`.

Combined with the connected certificate, this proves (1) for every
forest.
