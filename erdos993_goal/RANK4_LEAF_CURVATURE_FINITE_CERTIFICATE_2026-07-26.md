# Rank-4 leaf-curvature finite certificate

## Scope

This note gives exact identities for the fourth factorial curvature of a
tree and for its change under one leaf attachment.  It also records an
exhaustive check of every unlabeled tree through order 19.

The later note
`RANK4_GLOBAL_LEAF_CURVATURE_CERTIFICATE_2026-07-26.md` closes the
arbitrary-order case.  The present note retains the finite evidence,
extremal-family calculation, and earlier large-order bound.

## Statistics

For a tree \(T\) on \(n\) vertices, put \(e=n-1\) and

\[
S=\sum_v\binom{d(v)}2,
\]

and let:

- \(R\) be the number of connected 3-edge subsets;
- \(H=\sum_v\binom{d(v)}3\), the number of 3-edge stars;
- \(W\) be the number of connected 4-edge subsets.

If \(i_j\) denotes the number of independent \(j\)-sets, direct
inclusion-exclusion gives

\[
i_2=\binom n2-e,
\]

\[
i_3=\binom n3-e(n-2)+S,
\]

\[
i_4=\binom n4-e\binom{n-2}2+S(n-4)+\binom e2-R.
\]

Classifying a 3-edge subset by its connected components gives

\[
Q=S(e-2)-2R-H,
\]

where \(Q\) counts a connected adjacent edge pair together with a
disjoint edge.  Consequently,

\[
\begin{aligned}
i_5={}&\binom n5-e\binom{n-2}3+S\binom{n-3}2\\
&+\left(\binom e2-S\right)(n-4)-R(n-4)-Q+W.
\end{aligned}
\]

Equivalently,

\[
\begin{aligned}
120i_5={}&120H-120Rn+720R+60Sn^2-660Sn+1560S+120W\\
&+n^5-30n^4+295n^3-1170n^2+1864n-960.
\end{aligned}
\]

The rank-4 factorial curvature is therefore

\[
C_4=(4!i_4)^2-(3!i_3)(5!i_5)
    =576i_4^2-720i_3i_5.
\]

## Exact leaf updates

Attach a new leaf at a vertex \(p\) of old degree \(d\).  Put

\[
Z=\binom d2+\sum_{u\sim p}(d(u)-1).
\]

Then

\[
S^+=S+d,\qquad R^+=R+Z,\qquad
H^+=H+\binom d2.
\]

Let \(Y\) be the number of connected 3-edge subsets of \(T\) that
contain an edge incident with \(p\).  Adding the new leaf gives a
bijection between those sets and the new connected 4-edge subsets, so

\[
W^+=W+Y.
\]

Every connected 3-edge subtree is a 3-star or a 3-edge path.  Splitting
according to the role of \(p\) gives the local formula

\[
\begin{aligned}
Y={}&\binom d3
+\sum_{u\sim p}\binom{d(u)-1}{2}\\
&+(d-1)\sum_{u\sim p}(d(u)-1)\\
&+\sum_{u\sim p}\sum_{\substack{v\sim u\\v\ne p}}(d(v)-1).
\end{aligned}
\]

Substitution of these four updates into the displayed expression for
\(C_4\) gives an exact polynomial for
\(\Delta C_4=C_4(T+\text{leaf at }p)-C_4(T)\).  The verifier derives
this polynomial symbolically rather than relying on a copied expansion.

## Exhaustive result

The verifiers checked all 522,959 unlabeled trees of orders 1 through 19,
all 9,594,824 choices of an attachment vertex, and all coefficient and
local-update identities.  It found:

- no negative \(C_4\);
- no negative leaf increment \(\Delta C_4\).

The exact minima by old-tree order were:

| \(n\) | minimum \(C_4(T)\) | minimum \(\Delta C_4\) |
|---:|---:|---:|
| 1--5 | 0 | 0 |
| 6 | 0 | 576 |
| 7 | 576 | 10,800 |
| 8 | 13,104 | 66,384 |
| 9 | 92,304 | 245,232 |
| 10 | 363,456 | 704,448 |
| 11 | 1,126,224 | 1,680,048 |
| 12 | 2,943,936 | 3,620,160 |
| 13 | 6,737,184 | 7,057,440 |
| 14 | 14,135,616 | 12,824,784 |
| 15 | 27,513,504 | 21,519,216 |
| 16 | 50,278,464 | 34,216,992 |
| 17 | 86,471,280 | 52,999,920 |
| 18 | 142,185,456 | 79,463,520 |
| 19 | 223,663,104 | 116,074,080 |

## Reproduction

Run:

```powershell
python .\verify_rank4_leaf_curvature_identities.py `
  --max-order 17 `
  --direct-update-max-order 10 `
  --out .\rank4_leaf_curvature_identity_n17_20260726.json
```

The run ends with:

```text
rank-4 leaf-curvature finite identity certificate: PASS
```

The JSON output includes every extremal witness, the derived symbolic
formulas, and aggregate check counts.

Orders 18 and 19 were checked with the equivalent, faster directed-edge
message verifier:

```powershell
python .\scan_rank4_leaf_curvature_fast.py `
  --min-order 18 --max-order 18 `
  --out .\rank4_fast_n18_20260726.json
```

The order-19 scan was split into three contiguous index ranges and
combined by `aggregate_rank4_fast_chunks.py`; the aggregate certificate
is `rank4_fast_n19_exhaustive_20260726.json`.

## Exact extremal-family theorem

The order-14 through order-19 minimum-increment witnesses are the trees
\(T(7,4)\), \(T(7,5)\), \(T(8,5)\), \(T(9,5)\),
\(T(9,6)\), and \(T(10,6)\), where \(T(a,b)\) consists of two hubs
separated by one degree-2 vertex, with \(a\) and \(b\) pendant leaves on
the respective hubs.  Attaching the new leaf at the second hub changes
\(T(a,b)\) to \(T(a,b+1)\).

The independence polynomial has the closed form

\[
I(T(a,b);x)
=x(1+x)^{a+b}
+\big((1+x)^a+x\big)\big((1+x)^b+x\big).
\]

Symbolic expansion proves

\[
C_4(T(a,b+1))-C_4(T(a,b))\ge0
\]

for every pair of nonnegative integers \(a,b\).  For \(b\ge2\), setting
\(b=B+2\) makes all 28 coefficients of the resulting polynomial in
\(a,B\) strictly positive.  The two remaining cases are

\[
\Delta(a,0)
=3a^2(a-1)(a+1)(3a^2+11a-18),
\]

and, for \(b=1\), \(\Delta(a,1)=3a\,q(a)\), where after \(a=A+1\),

\[
q(A+1)
=3A^5+40A^4+145A^3+272A^2+212A+192.
\]

This proves rank-4 leaf monotonicity at either hub throughout the
two-parameter family that contains the current exact extremizers.
Reproduce with:

```powershell
python .\verify_rank4_subdivided_double_star.py
```

## Arbitrary-tree theorem for large order

There is also a rigorous uniform theorem:

> If \(T\) has \(n\ge120\) vertices, attaching a leaf at any vertex of
> \(T\) strictly increases \(C_4\).

Here is the reduction.  Put

\[
x_v=d(v)-1,\qquad r_v=\frac{x_v}{n},\qquad
A_j=\sum_v r_v^j,\qquad t=\frac{x_p}{n}.
\]

Since \(\sum_vx_v=n-2\), all \(r_v,t,A_2,A_3,A_4\) lie in
\([0,1]\), and \(\sum_vr_v\le1\).

The connected-subtree statistics have uniform expansions

\[
S=n^2\left(\frac{A_2}{2}+\frac{E_S}{2n}\right),
\quad |E_S|\le1,
\]

\[
R=n^3\left(\frac{A_3}{6}+\frac{2E_R}{3n}\right),
\quad |E_R|\le1,
\]

\[
H=n^3\left(\frac{A_3}{6}+\frac{E_H}{6n^2}\right),
\quad |E_H|\le1,
\]

\[
W=n^4\left(\frac{A_4}{24}+\frac{29E_W}{24n}\right),
\quad |E_W|\le1.
\]

For completeness, these follow from the exact shape decompositions

\[
R=H+\sum_{uv\in E(T)}x_ux_v
\]

and

\[
\begin{aligned}
W={}&\sum_v\binom{x_v+1}{4}
+\sum_{(u,v)\in\vec E(T)}\binom{x_u}{2}x_v\\
&+\sum_v\sum_{\{u,w\}\subseteq N(v)}x_ux_w.
\end{aligned}
\]

The inequalities

\[
\sum_{uv\in E(T)}x_ux_v\le\frac12\left(\sum_vx_v\right)^2,
\]

together with the analogous all-pairs bounds for the last two terms,
give the displayed error constants.

The local statistics satisfy

\[
d=n\left(t+\frac{E_d}{n}\right),\quad |E_d|\le1,
\]

\[
Z=n^2\left(\frac{t^2}{2}+\frac{3E_Z}{2n}\right),
\quad |E_Z|\le1,
\]

\[
Y=n^3\left(\frac{t^3}{6}+\frac{8E_Y}{3n}\right),
\quad |E_Y|\le1.
\]

Substitution in the exact leaf-increment polynomial gives

\[
\frac{\Delta C_4}{n^6}
=L(A_2,A_3,A_4,t)+\mathcal E_n,
\]

where

\[
L=21-45A_2+48A_3-15A_4
-20t^3+36t^2-18t.
\]

For \(0\le r\le1\),

\[
45r^2-48r^3+15r^4\le\frac{53}{4}r.
\]

The verifier certifies this by the positive degree-30 Bernstein
coefficients of

\[
\frac{53}{4}-45r+48r^2-15r^3.
\]

Also,

\[
20t^3-36t^2+18t\le\frac{11}{4}.
\]

Its exact maximum is

\[
\frac{54+6\sqrt6}{25}<\frac{11}{4}.
\]

It follows that

\[
L\ge21-\frac{53}{4}\sum_vr_v-\frac{11}{4}\ge5.
\]

As a first coarse bound, a full symbolic expansion and coefficient norm
give

\[
|\mathcal E_n|
\le \frac{4034}{n}
+\frac{22189}{n^2}
+\frac{43084}{n^3}
+\frac{37338}{n^4}
+\frac{15732}{n^5}
+\frac{2880}{n^6}.
\]

This already proves the theorem for \(n\ge813\).  Retaining the exact
connected-shape variables sharpens it substantially.

Write

\[
B=\frac1{n^2}\sum_{uv\in E(T)}x_ux_v
\]

and

\[
T_c=\frac1{n^3}
\sum_{(u,v)\in\vec E(T)}\binom{x_u}{2}x_v.
\]

For the local neighborhood of \(p\), put

\[
q_1=\frac1n\sum_{u\sim p}x_u,\qquad
q_2=\frac1{n^2}\sum_{u\sim p}x_u^2.
\]

The tree identities imply

\[
T_c\le\frac B2,\qquad q_2\le q_1^2,\qquad
0\le q_1\le1-t.
\]

After exact substitution, the coefficient of \(1/n\) in
\(\Delta C_4/n^6\) is \(-3Q_1\), where

\[
\begin{aligned}
Q_1={}&-36A_2^2+12A_2A_3
+A_2(20t^3+36t^2-72t-186)\\
&+A_3(-32t^2+24t+142)
+A_4(10t-25)\\
&-96B+120T_c
+(40t-24)q_1+20q_2\\
&-40t^3+128t^2-90t+142.
\end{aligned}
\]

The moment part is nonpositive using
\(A_4\le A_3\le A_2\), because its remaining one-variable factor is

\[
20t^3+4t^2-48t-44\le0.
\]

The correlation part is at most \(-36B\).  The \(q_1\)-part is convex,
so its maximum occurs at \(q_1=0\) or \(q_1=1-t\).  The two resulting
one-variable polynomials are nonpositive on
\([0,\frac15]\) and \([\frac15,1]\), respectively.  Exact Bernstein
certificates are included in the verifier.  Consequently

\[
Q_1\le142
\quad\text{and hence}\quad
[n^{-1}]\frac{\Delta C_4}{n^6}\ge-426.
\]

The coefficient norm of all remaining terms gives

\[
\frac{\Delta C_4}{n^6}
\ge 5-\frac{426}{n}
-\frac{19925}{n^2}
-\frac{39927}{n^3}
-\frac{39188}{n^4}
-\frac{20448}{n^5}
-\frac{6888}{n^6}.
\]

The right side is positive at \(n=120\), where it is approximately
\(0.0430237\), and increases thereafter.  Thus
\(\Delta C_4>0\) for every \(n\ge120\).

Reproduce the symbolic derivation, Bernstein check, coefficient norm,
and exact threshold with:

```powershell
python .\verify_rank4_asymptotic_leaf_curvature.py
```

The sharper moment-and-correlation reduction in
`RANK4_GLOBAL_LEAF_CURVATURE_CERTIFICATE_2026-07-26.md` closes the
remaining orders and proves global rank-4 leaf monotonicity.
