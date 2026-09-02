# Terminal quarter-payment through local rank two

Date: 2026-07-26

Scope note: the theorem proved here is correct for local ranks
\(r=1,2\).  The corresponding factor-four statement at every rank is
false; an exact Galvin-family prefix counterexample is recorded in
`TERMINAL_PAYMENT_GALVIN_BOUNDARY_2026-07-26.md`.  The global
counterexample does not affect either low-rank certificate below.

For a rooted forest \((R,q)\), write

\[
B_j=i_j(R),\qquad C_j=i_j(R-q).
\]

Attach the path \(q-p-\ell\).  At local rank \(r\), put

\[
\begin{aligned}
a&=B_r+C_{r-1},&
a^+&=B_{r+1}+C_r,\\
\Lambda&=aB_r+B_r^2
 +2(r+1)(a^+B_r-aB_{r+1}),\\
M&=B_{r-1}\bigl((r+1)a^++B_r\bigr)-rB_ra.
\end{aligned}
\]

The terminal quarter-payment inequality is

\[
\tag{TQ}
\boxed{\quad
4M^2\leq B_{r-1}(a+B_{r-1})\Lambda.
\quad}
\]

This note proves (TQ) for every forest at \(r=1\) and \(r=2\).
The result is a low-rank theorem, not a proof of Erdős Problem 993.

## 1. Rank one

Let \(R\) have \(n\) vertices and \(m\) edges.  Substitution of

\[
B_0=C_0=1,\quad B_1=n,\quad
B_2=\binom n2-m,\quad C_1=n-1
\]

shows that the cleared quarter-payment gap is concave in \(m\).
Every forest has \(0\leq m\leq n-1\), so it is enough to check the two
endpoints.  They are

\[
\begin{aligned}
m=0:\quad&4n^3+3n^2+14n-16,\\
m=n-1:\quad&4n^3+7n^2+2n-8.
\end{aligned}
\]

After writing \(n=1+y\), these become

\[
4y^3+15y^2+32y+5
\]

and

\[
4y^3+19y^2+28y+5,
\]

respectively.  Both have positive coefficients.

## 2. Rank two

Let \(d=\deg_R(q)\), and put

\[
Z=\sum_{v\in V(R)}\binom{\deg(v)}2.
\]

The required coefficients are

\[
\begin{aligned}
B_1&=n,\\
B_2&=\binom n2-m,\\
B_3&=\binom n3-m(n-2)+Z,\\
C_1&=n-1,\\
C_2&=\binom{n-1}2-(m-d).
\end{aligned}
\]

Let \(Q(n,m,d,Z)\) be the left side of (TQ) minus its right-side
square after moving all terms to the nonnegative side:

\[
Q=B_1(a+B_1)\Lambda-4M^2.
\]

Exact differentiation gives

\[
\frac{\partial^2Q}{\partial d^2}
=\frac{\partial^2Q}{\partial Z^2}
=-72n^2.
\]

Thus \(Q\) is separately concave in \(d\) and \(Z\), and its minimum
over their feasible rectangle is attained at a corner.

The elementary forest bounds are

\[
0\leq d\leq m,
\qquad
\max(0,2m-n)\leq Z\leq\binom m2.
\]

For the lower bound on \(Z\), sum
\(\binom{\deg(v)}2\geq\deg(v)-1\); the upper bound simply says that the
number of adjacent pairs of edges is at most the number of all pairs of
edges.

It remains to check the two values of \(d\) at the two values of \(Z\).
Rank \(r=2\) is required only when \(\alpha(R)\geq5\), hence \(n\geq5\).
The integer parameter regions are finite unions of orthants:

- if \(2m\leq n\), write \(n=2m+s\); the roots forced by \(n\geq5\)
  are
  \[
  (m,s)=(0,5),(1,3),(2,1),(3,0);
  \]
- if \(2m\geq n\), write \(m=c+t,\ n=2c+t\), where \(c=n-m\geq1\);
  the roots are
  \[
  (c,t)=(1,3),(2,1),(3,0);
  \]
- at the common upper endpoint \(Z=\binom m2\), write \(n=m+c\);
  the roots are
  \[
  (m,c)=(0,5),(1,4),(2,3),(3,2),(4,1).
  \]

At both degree endpoints, every power coefficient of every shifted
polynomial is nonnegative.  This proves \(Q\geq0\), and hence (TQ), at
rank two.

## 3. Independent verification

`verify_terminal_quarter_payment_rank2_forests.py` reconstructs all
coefficient formulas, verifies both concavity identities, performs every
orthant substitution with exact rational arithmetic, and checks 864
shifted power coefficients at rank two.  It prints `PASS`.
