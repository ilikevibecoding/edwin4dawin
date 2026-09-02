# A sharp rank-\((4,5)\) ratio theorem for trees

Date: 2026-07-28

Status: **proved theorem, with exact replayable finite bases**.  This is
a new rank-six induction input.  It does not by itself resolve Erdős
Problem 993.

## Theorem

For every tree \(T\) of order \(n\ge18\),

\[
\boxed{\frac{i_5(T)}{i_4(T)}
\ge
\frac{i_5(P_n)}{i_4(P_n)}
=\frac{(n-7)(n-8)}{5(n-3)}.}
\tag{1}
\]

Equality holds only for the path \(P_n\).

The known coefficientwise theorem that the path minimizes every
\(i_k(T)\) does not imply (1): a ratio of two separately minimized
quantities need not be minimized by the same object.  The proof below
establishes the ratio directly.

## 1. Degree and subtree statistics

Put

\[
x_v=d_T(v)-1,\qquad
B_j=\sum_v\binom{x_v}{j},
\]

\[
E=\sum_{uv\in E(T)}x_ux_v,
\]

and let \(V\) be the number of connected four-edge subtrees of \(T\).
Also put

\[
X=E-(n-3),\qquad W=V-(n-4).
\]

The path has \(B_2=B_3=X=W=0\).

## 2. A Zagreb-type structural inequality

The first ingredient is

\[
\boxed{7X\le 2(n-4)B_2-6B_3}
\qquad(n\ge15).
\tag{2}
\]

In the standard degree indices

\[
M_1=\sum_vd(v)^2,\quad
F=\sum_vd(v)^3,\quad
M_2=\sum_{uv\in E(T)}d(u)d(v),
\]

inequality (2) is exactly

\[
\boxed{(n+9)M_1-F-7M_2-4n^2+6n-16\ge0.}
\tag{3}
\]

### 2.1 All trees of order at least 19

Let \(N=n-2=\sum_vx_v\), discard the leaves \(x_v=0\), and let \(H\)
be the tree induced by the positive-\(x\) vertices.  Write

\[
m=\max_vx_v.
\]

The right side of (2) is

\[
R=\sum_vx_v(x_v-1)(N-x_v).
\tag{4}
\]

If \(m\ge7\), root \(H\) at a vertex of weight \(m\).  Every other
vertex has parent weight at most \(m\), so

\[
E\le m(N-m).
\]

Keeping only the root contribution in (4) gives

\[
\begin{aligned}
R-7X
&\ge m(m-1)(N-m)
 -7\bigl(m(N-m)-(N-1)\bigr)\\
&=m(N-m)(m-8)+7(N-1).
\end{aligned}
\]

For \(m=7\) this is \(42\), and for \(m\ge8\) it is positive.

It remains to consider \(m\le6\).  Root \(H\) again at a maximum
vertex and put \(y_v=x_v-1\) and \(Y=\sum_vy_v\).  Orient every edge
away from the root.  If \(c_v\) is the number of children of \(v\),
then

\[
c_{\rm root}\le m+1,\qquad c_v\le x_v
\quad(v\ne{\rm root}).
\]

Expanding \(x_{\rm parent}x_{\rm child}\) on every oriented edge gives

\[
\begin{aligned}
X
&=1-m+
\sum_vc_vy_v+
\sum_{{\rm parent}\to{\rm child}}
y_{\rm parent}y_{\rm child}\\
&\le
2B_2+(m-1)(Y-m+1).
\end{aligned}
\tag{5}
\]

For a multiset of positive weights with maximum \(m\), define

\[
G_m=
\sum_vx_v(x_v-1)(N-x_v)
-7\left(2B_2+(m-1)(Y-m+1)\right).
\tag{6}
\]

If a new part \(a\le m\) is added to a multiset of total \(N\ge17\),
then

\[
\Delta G_m
=a\sum_vx_v(x_v-1)+a(a-1)N
-7(a-1)(a+m-1).
\]

Because a part \(m\) is already present,
\(\sum_vx_v(x_v-1)\ge m(m-1)\).  Substituting \(N=17\) in the lower
bound proves \(\Delta G_m>0\) for every

\[
2\le m\le6,\qquad1\le a\le m.
\]

The minimum lower increments for \(m=2,3,4,5,6\) are respectively

\[
2,\ 6,\ 12,\ 20,\ 30.
\]

Repeatedly removing a part from any partition of \(N\ge23\), while
retaining a part \(m\), reduces it to \(17\le N\le22\).  The exact
finite partition minima of (6) are

\[
\begin{array}{c|rrrrrr}
m\backslash N&17&18&19&20&21&22\\ \hline
2&16&18&20&22&24&26\\
3&42&48&54&60&66&72\\
4&42&63&89&108&120&132\\
5&28&60&84&118&148&184\\
6&16&48&89&119&163&198
\end{array}
\]

and are all positive.  Equations (5)--(6) therefore prove (2) for
every \(N\ge17\), or \(n\ge19\).

### 2.2 Orders 15 through 18

Exact enumeration supplies the remaining four orders:

\[
\begin{array}{c|r|r|r}
n&\#\text{ unlabeled trees}&\min(3)&
\#\text{ trees attaining }0\\ \hline
15&7\,741&0&2\\
16&19\,320&0&1\\
17&48\,629&0&1\\
18&123\,867&0&1
\end{array}
\]

At orders \(16,17,18\), only the path attains equality.  At order 15
there is one additional equality tree, the once-subdivided
seven-leaf star.  This proves (2).

## 3. Connected-four-subtree reserves

The second ingredient is the pair

\[
\boxed{W\ge B_2+B_3,}
\tag{7}
\]

\[
\boxed{W\ge B_2+B_3+X,}
\tag{8}
\]

valid for every tree of order at least \(9\).

These have a short leaf induction.  Let \(p\) be a vertex of a tree
\(T\), let \(d=d_T(p)\), and attach a new leaf at \(p\).  Let
\(P(T,p)\) be the number of connected three-edge subtrees of \(T\)
that contain \(p\), and put

\[
q=\sum_{u\in N(p)}(d_T(u)-1).
\]

The changes in the four statistics are

\[
\Delta V=P(T,p),\quad
\Delta E=q,\quad
\Delta(B_2+B_3)=\binom d2.
\]

Consequently, if

\[
J_0=W-B_2-B_3,\qquad
J_1=W-B_2-B_3-X,
\]

then

\[
\Delta J_0=P(T,p)-1-\binom d2,
\qquad
\Delta J_1=P(T,p)-q-\binom d2.
\tag{9}
\]

To bound \(P(T,p)\), enumerate the neighbors \(u_1,\ldots,u_d\), put
\(x_i=d_T(u_i)-1\), and let

\[
r=\sum_i\sum_{w\in N(u_i)\setminus\{p\}}(d_T(w)-1).
\]

Classifying a connected three-edge subtree by the role of \(p\)
gives the exact formula

\[
P(T,p)=
\binom d3+(d-1)q+\sum_i\binom{x_i}{2}+r.
\tag{10}
\]

Formula (10) implies

\[
P(T,p)\ge1+\binom d2\qquad(|T|\ge7),
\tag{11}
\]

\[
P(T,p)\ge q+\binom d2\qquad(|T|\ge6).
\tag{12}
\]

For completeness, the only low-degree cases are as follows.

- For (11), \(d\ge6\) follows from the first term of (10).  For
  \(d=5,4\), the tree is larger than the corresponding star, so
  \(q\ge1\).  For \(d=3\), either \(q\ge2\), or \(q=1\) and a vertex
  at distance three forces \(r\ge1\).  For \(d=2\), either \(q\ge2\),
  or \(q=1\) and again \(r\ge1\).  For \(d=1\), a length-three path
  begins at \(p\).
- For (12), \(d\ge5\) follows from
  \(\binom d3\ge\binom d2\).  The cases \(d=4,3\) use respectively
  \(q\ge1\) and either \(q\ge2\) or \(r\ge1\).  For \(d=2\), either
  some \(x_i\ge2\), or the order condition forces \(r\ge1\).  For
  \(d=1\), (10) reads
  \(P=\binom q2+r\), which is at least \(q\).

There are only 23 unlabeled trees of order 8 and 47 of order 9.
Exact evaluation gives

\[
\min_{|T|=8}J_1=0,\qquad
\min_{|T|=9}J_0=\min_{|T|=9}J_1=0.
\]

Equations (9), (11), and (12) now prove (7)--(8) by induction.

## 4. Exact motif decomposition

Inclusion-exclusion for independent four- and five-sets, followed by
the degree identities

\[
\sum_vx_v^2=n-2+2B_2,\qquad
\sum_vx_v^3=n-2+6B_2+6B_3,
\]

gives

\[
\begin{aligned}
L(T)
&:=5(n-3)i_5(T)-(n-7)(n-8)i_4(T)\\
&=A B_2-B B_3-CX+5(n-3)W,
\end{aligned}
\tag{13}
\]

where

\[
\begin{aligned}
A&=\frac32n^3-20n^2+\frac{133}{2}n-20,\\
B&=4n^2-35n+49,\\
C&=4n^2-30n+34.
\end{aligned}
\]

The verifier checks (13) symbolically.

Also, since \(x_v\le n-2\),

\[
B_3
=\sum_v\binom{x_v}{2}\frac{x_v-2}{3}
\le\frac{n-4}{3}B_2.
\tag{14}
\]

## 5. Completion of the ratio proof

Assume \(n\ge18\).

If \(X\le0\), use (7) in (13) and discard the nonnegative term
\(-CX\).  Since the coefficient of \(B_3\) is negative, (14) yields

\[
L(T)\ge
\frac{n^3-8n^2-19n+302}{6}\,B_2.
\tag{15}
\]

If \(X\ge0\), use (8).  The coefficient of \(X\) becomes
\(-B\).  Applying (2) and then (14) again gives exactly the same
lower bound (15).

The cubic coefficient in (15) equals \(1600/3\) at \(n=18\), and it
is strictly increasing thereafter.  Thus \(L(T)\ge0\).

Finally,

\[
i_4(P_n)=\binom{n-3}{4},\qquad
i_5(P_n)=\binom{n-4}{5},
\]

so \(L(T)\ge0\) is precisely (1).  If \(T\) is not a path, then some
vertex has \(x_v\ge2\), hence \(B_2>0\), and (15) is strict.  This
proves the equality statement.

## Exact replay

```powershell
python .\verify_tree_rank45_path_ratio.py
```

The command verifies the symbolic identities, the 30 bounded-excess
partition cells, 199,557 unlabeled trees in the Zagreb base, and the
two tiny connected-subtree bases.
