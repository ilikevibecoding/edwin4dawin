# Rank-3 three-quarters cascade for trees

Date: 2026-07-26

This note proves the strengthened pendant cascade at rank three for
every tree.  It is an unconditional infinite-family result, but it does
not settle the higher ranks of Erdős Problem 993.

## 1. Statement

Let \(\ell p\) be a pendant edge of a tree \(G\), and put
\(F=G-\{\ell,p\}\).  With

\[
G_k(P)=kp_k^2+p_{k-1}p_k-(k+1)p_{k-1}p_{k+1},
\qquad
H_k(P)=\frac{kG_k(P)}{p_{k-1}},
\]

we prove

\[
\boxed{\quad 3H_3(I(G))\geq4H_2(I(F))\quad}
\tag{1}
\]

whenever rank three lies in the required prefix
\(3<L(G)=\lfloor(2\alpha(G)+1)/3\rfloor\).  The inequality is strict
when the rank occurs.

Stars already satisfy the three-quarters cascade at every prefix rank,
as shown in `verify_terminal_pgc_stars.py`.  We therefore assume below
that \(G\) is not a star.

## 2. Four low-rank forest statistics

Let \(n,e\) be the numbers of vertices and edges of \(G\).  Put

\[
Z=\sum_v\binom{d(v)}2
\]

and let \(T\) be the number of connected three-edge subtrees.  Elementary
inclusion-exclusion gives

\[
\begin{aligned}
i_2&=\binom n2-e,\\
i_3&=\binom n3-e(n-2)+Z,\\
i_4&=\binom n4-e\binom{n-2}2
Z(n-3)+\binom e2-Z-T.
\end{aligned}
\tag{2}
\]

Write \(d=d(p)\) and

\[
S=\sum_{u\in N(p)}(d(u)-1).
\]

Deleting \(\ell,p\) removes \(d\) edges and
\(\binom d2+S\) incident edge-pairs.  Substitution of (2) into (1)
shows that, after multiplication by the positive denominator
\(i_2(G)(n-2)\), the desired gap is

\[
9(n-2)G_3(I(G))-8i_2(G)G_2(I(F)).
\tag{3}
\]

## 3. Degree-excess form

Since \(G\) is a tree, write \(e=n-1\) and

\[
x_v=d(v)-1,\qquad E=\sum_vx_v=e-1.
\]

Define

\[
M_2=\sum_vx_v^2,\qquad
M_3=\sum_vx_v^3,\qquad
J=\sum_{uv\in E(G)}x_ux_v,
\qquad x=x_p=d-1.
\]

Then

\[
Z=\frac{M_2+E}{2},
\qquad
T=\frac{M_3-E}{6}+J.
\tag{4}
\]

Exact simplification of (3) gives \((e-1)\mathcal B/2\), where

\[
\begin{aligned}
\mathcal B={}&36e(e-1)J-24e(e-1)S+\frac{27}{2}M_2^2\\
&+\left(-9e^3+\frac{69}{2}e^2+\frac32e-27\right)M_2
+6e(e-1)M_3+D(e,x),
\end{aligned}
\tag{5}
\]

and

\[
\begin{aligned}
D(e,x)={}&6e^5-58e^4+8e^3x+\frac{331}{2}e^3
-12e^2x^2-36e^2x\\
&-\frac{335}{2}e^2-4ex^2+28ex+\frac{81}{2}e+\frac{27}{2}.
\end{aligned}
\tag{6}
\]

## 4. Structural and moment bounds

The edges from \(p\) to its nonleaf neighbours contribute \(xS\) to
\(J\), so

\[
J\geq xS.
\tag{7}
\]

The vertices with positive \(x_v\) induce a connected subtree.  Since
\(G\) is not a star, that subtree has at least two vertices.  If \(a\)
is its smallest positive weight, every weighted spanning tree has weight
at least the complete-graph minimum spanning tree, the star of weight
\(a(E-a)\).  Hence

\[
J\geq a(E-a)\geq E-1=e-2.
\tag{8}
\]

Combining (7)--(8),

\[
36J-24S
\geq\left(36-\frac{24}{x}\right)(e-2).
\tag{9}
\]

Two elementary moment inequalities give

\[
M_3\geq3M_2-2E,
\qquad
M_3\geq\frac{M_2^2}{E}.
\tag{10}
\]

The first follows by summing
\(z^3-3z^2+2z=z(z-1)(z-2)\geq0\) over integer \(z=x_v\).
The second is Cauchy--Schwarz.  The first bound is stronger for
\(E\leq M_2\leq2E\), and the second for \(M_2\geq2E\).

## 5. Uniform positivity for \(e\geq8\)

Use (9) in (5), and in the range \(M_2\geq2E\) use the second bound in
(10).  The resulting quadratic in \(M_2\) has leading coefficient

\[
A=\frac{27}{2}+6e
\]

and linear coefficient

\[
C=-9e^3+\frac{69}{2}e^2+\frac32e-27.
\]

Its unconstrained minimum is

\[
V(e,x)=D(e,x)+
\left(36-\frac{24}{x}\right)e(e-1)(e-2)-\frac{C^2}{4A}.
\tag{11}
\]

The denominator of (11) is \(8x(4e+9)>0\).  Put

\[
e=8+y,\qquad x=1+u(e-3),
\qquad y\geq0,\quad0\leq u\leq1.
\]

The exact numerator of (11), viewed as a cubic in \(u\), has Bernstein
coefficients

\[
\begin{aligned}
\beta_0={}&(y+8)(84y^5+2764y^4+34897y^3+210754y^2
+599397y+612264),\\
\beta_1={}&\frac{y+8}{3}(84y^6+3436y^5+58033y^4+517706y^3
+2557269y^2+6547920y+6636512),\\
\beta_2={}&\frac{y+8}{3}(168y^6+6876y^5+114750y^4+998113y^3
+4745252y^2+11561009y+11042632),\\
\beta_3={}&(y+6)(y+8)(84y^5+2636y^4+30769y^3+162050y^2
+351237y+153064).
\end{aligned}
\tag{12}
\]

Every coefficient is positive, so \(V(e,x)>0\) for
\(e\geq8\) and \(1\leq x\leq e-2\).

In the other range \(E\leq M_2\leq2E\), use the first bound in (10).
The derivative of that quadratic at its right endpoint is

\[
-\frac32(e-1)(6e^2-29e-54)<0
\qquad(e\geq8).
\]

The quadratic is therefore decreasing throughout that interval, and its
minimum is its value at \(M_2=2E\), where the two moment bounds agree.
That value is already positive by (11)--(12).

## 6. The two finite boundary cases

If rank three is required, then \(\alpha(G)\geq6\), so a connected
nonstar has \(e\geq6\).  The only cases not covered above are
\(e=6,7\).  Applying the same two quadratic bounds on the exact interval

\[
x^2+E-x\leq M_2\leq
\min\{x^2+(E-x)^2,\ E^2-2E+2\}
\]

gives the following exact smallest lower bounds:

\[
\begin{array}{c|ccccccccc}
(e,x)&(6,1)&(6,2)&(6,3)&(6,4)&(7,1)&(7,2)&(7,3)&(7,4)&(7,5)\\
\hline
\min\mathcal B&
1293/2&1320&588&2232&
334957/74&471709/74&392973/74&4136&8252
\end{array}
\]

All are positive.  The script
`verify_rank3_three_quarters_trees.py` reconstructs every identity,
checks the Bernstein coefficients with exact rational arithmetic, and
recomputes these continuous interval minima.  It prints `PASS`.

This completes the proof of (1) for every tree.
