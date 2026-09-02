# Exact rank-4 three-halves leaf certificate

Date: 2026-07-27

Status: **proved fixed-rank theorem, not a solution of Erdős Problem
993**.

## Theorem

For a tree \(T\), write

\[
L(T)=\left\lfloor\frac{2\alpha(T)+1}{3}\right\rfloor
\]

and

\[
Q_4(I(T))=8i_4(T)^2-i_3(T)i_4(T)-10i_3(T)i_5(T).
\]

If \(T^+\) is formed by attaching a leaf at any vertex of \(T\), then

\[
4<L(T)\quad\Longrightarrow\quad
Q_4(I(T^+))\ge Q_4(I(T)).
\tag{1}
\]

Moreover,

\[
L(T)=4,\quad L(T^+)=5
\quad\Longrightarrow\quad
Q_4(I(T^+))\ge0.
\tag{2}
\]

Consequently,

\[
\boxed{Q_4(I(T))\ge0\qquad(4<L(T))}
\tag{3}
\]

for every tree.

This proves the three-halves reserve and both leaf-induction obligations
globally at rank \(4\).  Together with the earlier rank-\(3\) theorem,
the proposed reserve is now proved at ranks \(3\) and \(4\), but the
all-rank statement remains open.

## Exact coefficient and leaf formulas

Let \(n=|V(T)|\), \(e=n-1\), and put

\[
S=\sum_v\binom{d(v)}2.
\]

Let \(R,H,W\) count connected three-edge subsets, three-edge stars, and
connected four-edge subsets.  Inclusion-exclusion gives

\[
\begin{aligned}
i_3&=\binom n3-e(n-2)+S,\\
i_4&=\binom n4-e\binom{n-2}2+S(n-4)+\binom e2-R,
\end{aligned}
\]

and

\[
\begin{aligned}
i_5={}&\binom n5-e\binom{n-2}3
+S\binom{n-3}2+(\binom e2-S)(n-4)\\
&-R(n-4)-\{S(e-2)-2R-H\}+W.
\end{aligned}
\]

If the new leaf is attached at \(p\), whose old degree is \(d\), then

\[
S^+=S+d,\quad R^+=R+Z,\quad
H^+=H+\binom d2,\quad W^+=W+Y,
\]

where

\[
Z=\binom d2+\sum_{a\sim p}(d(a)-1)
\]

and

\[
\begin{aligned}
Y={}&\binom d3
+\sum_{a\sim p}\binom{d(a)-1}{2}\\
&+(d-1)\sum_{a\sim p}(d(a)-1)\\
&+\sum_{a\sim p}\sum_{\substack{b\sim a\\b\ne p}}(d(b)-1).
\end{aligned}
\]

Substitution into \(Q_4\) gives the exact leaf increment.  The verifier
reconstructs it symbolically rather than storing an expanded formula.

## Normalized connected-shape coordinates

Put

\[
x_v=d(v)-1,\qquad \sum_vx_v=n-2,
\]

and define

\[
A_j=\frac1{n^j}\sum_vx_v^j,\qquad
t=\frac{x_p}{n},\qquad u=\frac1n.
\]

The connected-shape correlations are

\[
B=\frac1{n^2}\sum_{ab\in E(T)}x_ax_b,
\]

\[
T_c=\frac1{n^3}
\sum_{(a,b)\in\vec E(T)}\binom{x_a}{2}x_b,
\]

and

\[
P_5=\frac1{n^2}
\sum_v\sum_{\{a,b\}\subseteq N(v)}x_ax_b.
\]

At the attachment vertex, put

\[
q_1=\frac1n\sum_{a\sim p}x_a,\qquad
q_2=\frac1{n^2}\sum_{a\sim p}x_a^2,
\]

and let \(q_d\) be \(n^{-1}\) times the total \(x\)-mass at distance
two from \(p\).

After substituting these coordinates, the normalized exact increment is

\[
\frac{Q_4(I(T^+))-Q_4(I(T))}{n^6}
=F(u,A_2,A_3,A_4,t,B,T_c,P_5,q_1,q_2,q_d),
\tag{4}
\]

where \(F\) is an exact polynomial.

## Monotone reductions for \(n\ge20\)

Throughout \(0<u\le1/20\).  Direct differentiation of (4) shows that
\(F\) decreases in \(A_4,P_5,q_2,q_d,T_c\).  The two common positive
factors are

\[
1-5u+6u^2+2tu
\]

and

\[
1-6u+8u^2+3A_2u+6tu^2.
\]

They are bounded below by \(3/4\) and \(7/10\).

Let \(M=1-2u\) and \(m=M-t\).  After using

\[
A_4\le t^4+m(A_3-t^3),
\]

the effective \(A_3\)-derivative is \(J/24\), where

\[
\begin{aligned}
J={}&-12A_2u+64q_1u^2+42t^2u+58tu^2-59tu+5t\\
&-196u^3+264u^2-105u+11.
\end{aligned}
\]

On the domain,

\[
J\ge11-117u-196u^3>0.
\]

The connected-shape correlations satisfy

\[
T_c\le\frac{1-4u}{2}B.
\tag{5}
\]

After applying (5), the effective \(B\)-derivative is \(uK/2\), with

\[
\begin{aligned}
K={}&-6A_2u+32q_1u^2+16t^2u+54tu^2-22tu\\
&+22u^3+17u^2-20u+3.
\end{aligned}
\]

The crude bound \(K\ge3-48u>0\) suffices.

Every edge from \(p\) to a neighbor contributes \(tq_1\) to \(B\).
Every distance-two vertex has a parent neighbor with positive integral
excess.  Therefore

\[
B\ge tq_1+uq_d.
\tag{6}
\]

After equality in (5) and (6), the \(q_d\)-derivative is \(u^2E/6\),
where

\[
\begin{aligned}
E={}&-48A_2u+96q_1u^2+48t^2u+102tu^2-66tu\\
&+66u^3-29u^2-1.
\end{aligned}
\]

Since

\[
tu(48t+102u-66)\le0,
\]

we have

\[
E\le-1+67u^2+66u^3<0.
\]

Finally, every unordered vertex pair occurs at distance two at most once
in a tree, so

\[
P_5\le\frac{M^2-A_2}{2}.
\tag{7}
\]

Every replacement above lowers \(F\).

## The grouped rooted-moment relaxation

If \(q_1=0\), then \(p\) is the center of a star.  That case is handled
separately below.  Otherwise integrality gives \(q_1\ge u\) and
\(m\ge u\).

Partition all normalized \(x\)-mass into four disjoint groups:

1. the root \(p\), of mass \(t\);
2. neighbors of \(p\), of total mass \(q=q_1\);
3. vertices at distance two, of total mass \(q_d\);
4. all remaining vertices, of total mass \(r\).

Parameterize the full feasible relaxation by

\[
\begin{aligned}
t&=(1-3u)s,\\
h&=(1-3u)(1-s),\\
q&=u+ha,\\
q_d&=h(1-a)w,\\
r&=h(1-a)(1-w),
\end{aligned}
\qquad
0\le s,a,w\le1.
\tag{8}
\]

For a group of total mass \(y\), write its second moment as
\(y^2z\), where \(0\le z\le1\).  Cauchy and the pointwise bound
\(x_v/n\le y\) give

\[
\text{third moment}\ge y^3z^2,\qquad
\text{fourth moment}\le y\cdot\text{third moment}.
\tag{9}
\]

Because the effective third-moment derivative is positive and the
fourth-moment derivative is negative, (9) gives the minimizing group
moments.  With independent variables \(z_N,z_D,z_R\in[0,1]\),

\[
\begin{aligned}
A_2={}&t^2+q^2z_N+q_d^2z_D+r^2z_R,\\
A_3={}&t^3+q^3z_N^2+q_d^3z_D^2+r^3z_R^2,\\
A_4={}&t^4+q^4z_N^2+q_d^4z_D^2+r^4z_R^2.
\end{aligned}
\tag{10}
\]

Also \(q_2=q^2z_N\).  Substitute (5)--(10) into \(F\).  The result is
an exact polynomial

\[
G(u,s,a,w,z_N,z_D,z_R)
\]

of coordinate degrees

\[
(6,5,5,5,3,3,3).
\]

Every rooted tree of order at least \(20\), except the separately treated
star-center case, maps into this unit box, and \(G\) is a lower bound
for its normalized leaf increment.

## Exact adaptive Bernstein certificate

Put \(u=v/20\).  The initial tensor Bernstein expansion on
\([0,1]^7\) has a negative coefficient \(-1/48\); this is only a
failure of the coarse Bernstein enclosure, not a negative value of
\(G\).

Subdivide at midpoints, cycling through

\[
(v,s,a,w,z_N,z_D,z_R).
\]

The exact deterministic subdivision tree has:

- 108 terminal boxes;
- maximum depth 14;
- no unresolved box;
- smallest terminal Bernstein coefficient

\[
\frac{5006347}{3686400000}>0.
\]

Since a polynomial on a box lies between the minimum and maximum of its
Bernstein coefficients, \(G>0\) throughout the full domain.

The exact replay is

```powershell
python .\verify_rank4_three_halves_leaf_certificate.py
```

It reconstructs \(F\), verifies every derivative identity and sign
bound, rebuilds \(G\), and recomputes all 108 exact terminal boxes.

## Star-center case

For a star with \(\ell\) leaves, coefficients of ranks at least two are
binomial coefficients.  Direct simplification gives

\[
Q_4(K_{1,\ell+1})-Q_4(K_{1,\ell})
=\frac{\ell^2(\ell-2)(\ell-1)^2(7\ell-5)}{144}\ge0.
\]

This covers the only rooted tree omitted by (8).

## Orders below 20

Every unlabeled tree through order 19 and every attachment vertex was
checked with exact integer arithmetic:

- 522,959 unlabeled trees;
- 9,594,824 attachment vertices;
- zero failures of (1);
- zero failures of (2).

The durable output is

`rank4_three_halves_leaf_finite_n19_20260727.json`.

Audit its coverage and every stored witness with

```powershell
python .\verify_rank4_three_halves_finite_output.py
```

There are two negative unrestricted \(Q_4\) values and three negative
unrestricted leaf increments among the tiny trees.  Their cutoffs are
only \(2\) or \(3\), so rank \(4\) is outside the prefix and they do not
contradict (1)--(3).  The audit explicitly replays these exceptions.

Combining the finite audit, the \(n\ge20\) grouped certificate, and the
star-center formula proves the theorem.
