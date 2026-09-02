# Rank-2 adaptive child-weighted certificate

Date: 2026-07-26

Status: the theorem below is proved.  It establishes the diagonal adaptive
child-weighted invariant through rank 2 for every planted tree.  It is not a
proof of Erdős Problem 993.

## Statement

Let a planted rooted tree have \(q\) children.  Write

\[
 U=\prod_{i=1}^q A_i,\qquad
 D=x\prod_{i=1}^q U_i,
\]

and let

\[
 u_k=k![x^k]U,\qquad d_k=k![x^k]D.
\]

For a sequence \(p\), put

\[
 M_p(k)=p_k^2-p_{k-1}p_{k+1},
\]

and put

\[
 X_{u,d}(k)
 =2u_kd_k-u_{k+1}d_{k-1}-d_{k+1}u_{k-1}.
\]

Then, for \(k=0,1,2\),

\[
\boxed{\quad |q-2|M_u(k)+qX_{u,d}(k)\ge0.\quad}
\]

This is the diagonal part of the adaptive child-weighted factorial
invariant (ACWF).

## Forest coordinates

Delete the planted root.  What remains is a forest \(F\) on \(n\) vertices
with \(q\) components.  Let \(R\) contain the child root in each component.
Put

\[
 e=|E(F)|=n-q,\qquad
 s=\sum_{v\in R}d_F(v),\qquad
 S=\sum_{v\in V(F)}\binom{d_F(v)}2.
\]

There is only one marked vertex in each component.  Hence every edge is
incident with at most one member of \(R\), and every unordered pair of
edges is counted at most once as an adjacent pair.  Therefore

\[
\tag{1} 0\le s\le e,\qquad 0\le S\le\binom e2.
\]

If

\[
 U=\sum u_k^{\rm raw}x^k,\qquad
 J=D/x=\sum j_kx^k,
\]

then elementary inclusion-exclusion in a forest gives

\[
\begin{aligned}
u_1^{\rm raw}&=n,\\
u_2^{\rm raw}&=\binom n2-e,\\
u_3^{\rm raw}&=\binom n3-e(n-2)+S,\\
j_1&=e,\\
j_2&=\binom e2-e+s.
\end{aligned}
\tag{2}
\]

The formula for \(u_3^{\rm raw}\) subtracts triples containing a specified
edge and adds back exactly the adjacent pairs of edges.

## Ranks 0 and 1

Rank 0 is immediate.  At rank 1, (2) gives

\[
M_u(1)=3n-2q,\qquad X_{u,d}(1)=2q.
\]

Consequently

\[
|q-2|(3n-2q)+2q^2\ge0,
\]

because \(n\ge q\).

## Rank 2

Factorial scaling and (2) give

\[
\begin{aligned}
M_u(2)
&=4(u_2^{\rm raw})^2-6n u_3^{\rm raw}\\
&=-6nS+3n^3-2n^2q-5n^2+4q^2,
\\[3pt]
X_{u,d}(2)
&=8u_2^{\rm raw}e-6u_3^{\rm raw}-6n j_2\\
&=-6S+2n^2q+6n^2-3nq^2+5nq
  -6ns-14n-8q^2+12q.
\end{aligned}
\tag{3}
\]

There are three cases.

### One child

For \(q=1\), the target in (3) is

\[
3n^3+n^2-12n+8-6(n+1)S-6ns.
\]

Using (1), with \(e=n-1\), this is at least

\[
(n-1)(n-2)\ge0.
\]

### Two children

For \(q=2\), the target is

\[
4(5n^2-3S-3ns-8n-4).
\]

Using (1), with \(e=n-2\), this is at least

\[
2(n-2)(n+13)\ge0.
\]

### At least three children

For \(q\ge3\), put

\[
a=n(q-2)+q.
\]

Substitution in (3), followed by (1), gives

\[
\begin{aligned}
(q-2)M_u(2)+qX_{u,d}(2)
&\ge
(n-q)
\left(
6nq^2-13nq+4n+7q^2-q
\right).
\end{aligned}
\tag{4}
\]

The coefficient \(6q^2-13q+4\) of \(n\) in the second factor is positive
for every \(q\ge3\).  Since \(n\ge q\), that factor is at least

\[
3q(2q^2-2q+1)>0.
\]

Thus (4) is nonnegative.  The case \(q=0\) is the direct leaf state
\((U,D)=(1,x)\), so it is immediate as well.

This proves the stated rank-2 theorem.

## Stronger unary reserve through rank 2

The same forest calculation proves the sharper inequality that arose from
the one-child closure problem.  Let

\[
A=U+xJ,\qquad a_k=k![x^k]A,
\]

and define the divided-power shift

\[
(\sigma u)_k=k u_{k-1}.
\]

Adding a new parent above the old root produces the state
\((A,xU)\).  The following reserve is stronger than its mixed part:

\[
\tag{5}
H_k=M_a(k)+2X_{a,\sigma u}(k).
\]

At ranks 0 and 1 one obtains

\[
H_0=1,\qquad H_1=3n+5.
\]

At rank 2, direct substitution of (2) gives

\[
\tag{6}
H_2
=3\left[
n^3+6n^2+n-nq^2-3nq-3q^2-q
-2(n+3)(S+s)
\right].
\]

The bounds in (1) imply

\[
S+s\le \binom e2+e=\binom{e+1}2.
\]

Using \(e=n-q\) in (6) therefore gives

\[
\tag{7}
H_2\ge
6(n-q)(nq+n+3q-1)\ge0.
\]

Thus the empirically sharp unary mixed reserve

\[
\boxed{\quad M_a(k)+2X_{a,\sigma u}(k)\ge0\quad}
\]

is also proved for \(k=0,1,2\).  The 4-vertex star makes (7) an equality
at rank 2 after taking its center as the old root.

## Reproduction

`verify_rank2_adaptive_child_weighted_certificate.py` checks all algebraic
identities and lower-bound factorizations symbolically over the integers.
