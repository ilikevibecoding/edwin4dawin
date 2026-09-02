# Exact rank-3 leaf-curvature certificate

Date: 2026-07-26

Status: this note proves both leaf-curvature obligations (LM) and (BR) at
factorial rank 3 for every tree.  It is a local theorem, not a proof of
Erdős Problem 993.

## Statement

For a polynomial \(P=\sum p_kx^k\), write

\[
h_k=k!p_k,\qquad C_k(P)=h_k^2-h_{k-1}h_{k+1}.
\]

Then:

1. \(C_3(I(T))\ge0\) for every tree \(T\);
2. if \(T^+\) is obtained from \(T\) by adding one leaf at any vertex,
   then

\[
C_3(I(T^+))-C_3(I(T))\ge0.
\]

Thus the boundary reserve and leaf monotonicity in
`LEAF_CURVATURE_INDUCTION_REDUCTION_2026-07-26.md` are proved through
rank 3.

## Tree statistics

Let \(T\) have \(n\) vertices and \(e=n-1\) edges.  Put

\[
S=\sum_{v\in V(T)}\binom{d(v)}2
\]

and let \(R\) be the number of connected three-edge subsets of \(T\).
Inclusion-exclusion gives

\[
\begin{aligned}
i_2&=\binom n2-e,\\
i_3&=\binom n3-e(n-2)+S,\\
i_4&=\binom n4-e\binom{n-2}{2}
S(n-4)+\binom e2-R.
\end{aligned}
\tag{1}
\]

Consequently

\[
C_3(I(T))=36i_3^2-48i_2i_4.
\tag{2}
\]

## Line-graph lower bound

The line graph \(L(T)\) has \(e\) vertices and \(S\) edges.  Its number
of length-two paths is

\[
P_2=\sum_{w\in V(L(T))}\binom{d_{L(T)}(w)}2
\ge \frac{2S^2}{e}-S.
\]

Every such path belongs to a connected three-vertex subset, and any
connected three-vertex subset contains at most three such paths.
Connected three-vertex subsets of \(L(T)\) are exactly connected
three-edge subsets of \(T\).  Hence

\[
\tag{3}
R\ge \frac{2S^2/e-S}{3}.
\]

Substituting (3) into (2), and writing \(e=n-1\), gives the lower bound

\[
16S^2e+20S^2-12Se^3+16Se^2-4Se
+3e^5-15e^4+21e^3-9e^2
\tag{4}
\]

Expression (4) is \(C_3\) itself after the substitution, not \(C_3/3\).
It is a convex quadratic in \(S\), with real minimum

\[
\frac{e^2(e-1)^2(3e^2-15e-46)}{4e+5}.
\tag{5}
\]

This is nonnegative for \(e\ge8\).  The finitely many trees with
\(n=e+1\le8\) are checked exactly in the replay script; their minimum
rank-3 curvatures for orders \(1,\ldots,8\) are

\[
0,0,0,0,36,420,1584,4608.
\]

This proves the first assertion.

## Exact leaf increment

Attach a new leaf at a vertex \(p\) of degree \(d\).  Besides \(S,R\), put

\[
Z=\binom d2+\sum_{u\sim p}(d(u)-1).
\]

Then

\[
S^+=S+d,\qquad R^+=R+Z.
\tag{6}
\]

The two terms in \(Z\) count, respectively, the connected three-edge
sets containing the new edge and two old edges incident with \(p\), or
an old length-two continuation through a neighbor of \(p\).

Direct substitution of (1) into (2) gives

\[
C_3(I(T^+))-C_3(I(T))=3E,
\tag{7}
\]

where

\[
\begin{aligned}
E={}&24Sd-12Sn^2+28Sn-16S+16R(n-1)\\
&+12d^2-4dn^3+8dn^2-4dn\\
&+5n^4-30n^3+61n^2-52n+16\\
&+8n(n-1)Z.
\end{aligned}
\tag{8}
\]

We prove \(E\ge0\).

Put \(e=n-1\), and view in \(L(T)\) the \(d\) edges incident with \(p\).
They form a clique \(K_d\).  If \(\ell\) is the number of line-graph edges
from this clique to its complement, then

\[
Z=\binom d2+\ell.
\]

If \(d<e\), connectedness gives \(\ell\ge1\).  The complement has at most
\(\binom{e-d}{2}\) edges, so

\[
\ell\ge
\max\left\{
1,\,
S-\binom d2-\binom{e-d}{2}
\right\}.
\tag{9}
\]

Let

\[
A=\binom d2,\qquad B=\binom{e-d}{2},\qquad S_0=A+B+1.
\]

Use (3) in (8).  If \(S\le S_0\), use \(Z\ge A+1\); if \(S\ge S_0\),
use \(Z\ge S-B\).  Both substitutions are valid by (9), and the
coefficients of \(R,Z\) in (8) are positive.

The resulting lower bound in the first range is decreasing in \(S\), and
the one in the second range is increasing in \(S\).  Indeed, their
derivatives at \(S_0\), after removing the common positive factor, are

\[
\begin{aligned}
D_-&=16d^2-16de+18d-e^2-9e+16\le0,\\
D_+&=16d^2-16de+18d+5e^2-3e+16>0.
\end{aligned}
\tag{10}
\]

For \(1\le d\le e-1\) and \(e\ge5\), the first quadratic is convex in
\(d\), so its maximum occurs at an endpoint:

\[
D_-(1)=-e^2-25e+50<0,\qquad
D_-(e-1)=-e^2-7e+14<0.
\]

The real minimum of the second is

\[
\frac{16e^2+96e+175}{16}>0.
\]

It remains only to check the common value at \(S=S_0\).  Parameterize

\[
d=1+(e-2)t,\qquad 0\le t\le1.
\]

The common lower bound is a polynomial of degree four in \(t\).  Its five
Bernstein coefficients are

\[
\begin{aligned}
b_0&=\frac{(e-2)(5e^3-28e^2+65e-154)}3,\\
b_1&=\frac{e(e-2)(3e^2+4e-59)}3,\\
b_2&=\frac{(e-2)(23e^3-76e^2-7e-46)}9,\\
b_3&=\frac{e(e-2)(3e^2-2e-29)}3,\\
b_4&=\frac{(e-2)(e+1)(5e^2-9e-10)}3.
\end{aligned}
\tag{11}
\]

All are nonnegative for \(e\ge5\).  For example, after writing \(e=u+5\),
the five bracketed polynomials become

\[
\begin{gathered}
5u^3+47u^2+160u+96,\quad
3u^2+34u+36,\\
23u^3+269u^2+958u+894,\quad
3u^2+28u+36,\quad
5u^2+41u+70.
\end{gathered}
\]

Thus \(E\ge0\) when \(e\ge5\) and \(d<e\).  If \(d=e\), the old tree is
a star and direct substitution gives

\[
C_3(I(T^+))-C_3(I(T))
=e^2(e-1)(5e-1)\ge0.
\tag{12}
\]

Finally, all trees of old orders \(n\le5\), at every possible attachment
vertex, are checked exactly in the replay script.  The minimum increments
for \(n=1,\ldots,5\) are

\[
0,0,0,36,276.
\]

This proves rank-3 leaf monotonicity.

## Independent replay

Run:

```powershell
python .\verify_rank3_leaf_curvature_certificate.py
```

The script reconstructs all coefficient identities, verifies the
line-graph relaxations and Bernstein certificate symbolically over the
rationals, and performs the two stated finite checks with exact integers.
