# Global rank-4 leaf-curvature theorem

## Theorem

Let \(T\) be any tree and let \(T^+\) be obtained by attaching a new
leaf at any vertex \(p\) of \(T\).  Then

\[
C_4(I(T^+))\ge C_4(I(T)).
\]

Moreover, \(C_4(I(T))\ge0\) for every tree.

The leaf-increment theorem is proved algebraically for every
\(|V(T)|\ge20\), with a finite exhaustive certificate for orders below
20.  The curvature statement follows from the leaf-increment theorem
and the star base used in the leaf-induction reduction.

## Exact coefficient formula

Let \(n=|V(T)|\), \(e=n-1\), and put

\[
S=\sum_v\binom{d(v)}2.
\]

Let \(R,H,W\) respectively count connected 3-edge subsets, 3-edge
stars, and connected 4-edge subsets.  Then

\[
\begin{aligned}
i_3&=\binom n3-e(n-2)+S,\\
i_4&=\binom n4-e\binom{n-2}2+S(n-4)+\binom e2-R,
\end{aligned}
\]

and

\[
\begin{aligned}
120i_5={}&120H-120Rn+720R+60Sn^2-660Sn+1560S+120W\\
&+n^5-30n^4+295n^3-1170n^2+1864n-960.
\end{aligned}
\]

Thus

\[
C_4=576i_4^2-720i_3i_5.
\]

If the new leaf is attached at \(p\), of old degree \(d\), the exact
updates are

\[
S^+=S+d,\quad R^+=R+Z,\quad
H^+=H+\binom d2,\quad W^+=W+Y,
\]

with

\[
Z=\binom d2+\sum_{u\sim p}(d(u)-1)
\]

and

\[
\begin{aligned}
Y={}&\binom d3
+\sum_{u\sim p}\binom{d(u)-1}{2}\\
&+(d-1)\sum_{u\sim p}(d(u)-1)\\
&+\sum_{u\sim p}\sum_{\substack{v\sim u\\v\ne p}}(d(v)-1).
\end{aligned}
\]

Substituting these identities gives the exact polynomial
\(\Delta C_4=C_4(T^+)-C_4(T)\).  The verifier derives it directly.

## Connected-shape coordinates

Put

\[
x_v=d(v)-1,\qquad X=\sum_vx_v=n-2,
\]

and write

\[
M_j=\sum_vx_v^j,\qquad
\Pi=\sum_{uv\in E(T)}x_ux_v.
\]

Every connected 3-edge subtree is a star or a path, so

\[
H=\frac{M_3-X}{6},\qquad R=H+\Pi.
\]

Every connected 4-edge subtree is a 4-star, a subdivided 3-star, or a
4-edge path.  Hence

\[
\begin{aligned}
W={}&\frac{M_4-2M_3-M_2+2X}{24}\\
&+\sum_{(u,v)\in\vec E(T)}\binom{x_u}{2}x_v\\
&+\sum_v\sum_{\{a,b\}\subseteq N(v)}x_ax_b.
\end{aligned}
\tag{1}
\]

Let

\[
u=\frac1n,\quad
A_j=\frac{M_j}{n^j},\quad
t=\frac{x_p}{n},\quad
M=\frac Xn=1-2u,\quad m=M-t.
\]

Normalize the two correlation terms in (1) by

\[
B=\frac{\Pi}{n^2},\qquad
T_c=\frac1{n^3}
\sum_{(a,b)\in\vec E(T)}\binom{x_a}{2}x_b,
\]

and

\[
P_5=\frac1{n^2}
\sum_v\sum_{\{a,b\}\subseteq N(v)}x_ax_b.
\]

For the neighborhood of \(p\), put

\[
q_1=\frac1n\sum_{a\sim p}x_a,\qquad
q_2=\frac1{n^2}\sum_{a\sim p}x_a^2,
\]

and let \(q_d\) be \(n^{-1}\) times the total \(x\)-mass at distance
two from \(p\).

In these coordinates,

\[
\frac{\Delta C_4}{n^6}
=F(u,A_2,A_3,A_4,t,B,T_c,P_5,q_1,q_2,q_d),
\tag{2}
\]

where \(F\) is an exact polynomial.  It is reconstructed symbolically
by `verify_rank4_global_leaf_curvature.py`.

## Monotone reductions for \(n\ge20\)

Assume \(0\le u\le1/20\).

### Moments

The \(x\)-mass away from \(p\) is \(m\).  Therefore

\[
A_4\le t^4+m(A_3-t^3)
\tag{3}
\]

and Cauchy--Schwarz gives

\[
A_3\ge t^3+\frac{(A_2-t^2)^2}{m}.
\tag{4}
\]

The derivative of \(F\) in \(A_4\) is

\[
-15(1-5u+6u^2+2tu)<0.
\]

After replacing \(A_4\) by the right side of (3), the derivative in
\(A_3\) is \(3J\), where

\[
\begin{aligned}
J={}&-12A_2u+64q_1u^2+42t^2u+54tu^2-59tu+5t\\
&-208u^3+274u^2-107u+11.
\end{aligned}
\]

On the domain,

\[
J\ge11-119u-208u^3>0.
\]

Consequently both replacements lower \(F\).

Write

\[
A_2=t^2+m^2z,\qquad 0\le z\le1.
\]

The resulting lower-bound moments are

\[
A_3=t^3+m^3z^2,\qquad
A_4=t^4+m^4z^2.
\tag{5}
\]

### Four-edge path term

Each unordered vertex pair occurs at distance two at most once in a
tree.  Hence

\[
P_5\le\frac{M^2-A_2}{2}.
\tag{6}
\]

The derivative of \(F\) in \(P_5\) is negative, so replacing \(P_5\)
by the right side of (6) lowers \(F\).

### Edge correlations

For an edge \(ab\), its contribution to the middle term of (1) is

\[
\binom{x_a}{2}x_b+\binom{x_b}{2}x_a
=\frac{x_ax_b(x_a+x_b-2)}2.
\]

Since \(x_a+x_b\le X\),

\[
T_c\le\frac{1-4u}{2}B.
\tag{7}
\]

After replacing \(T_c\) by this upper bound, the derivative of \(F\) in
\(B\) is \(36uK\), with

\[
\begin{aligned}
K={}&-6A_2u+32q_1u^2+16t^2u+52tu^2-22tu\\
&+16u^3+22u^2-21u+3.
\end{aligned}
\]

Using \(A_2,t\le1\),

\[
K\ge3-49u>0.
\]

Thus the minimizing relaxation has

\[
B=T_c=0.
\tag{8}
\]

### Local neighborhood

The elementary bounds are

\[
q_2\le q_1^2,\qquad q_d\le m-q_1.
\tag{9}
\]

Both corresponding derivatives of \(F\) are negative.  After making
the replacements in (9), the second derivative in \(q_1\) is

\[
-24u\left(
15A_2u+30tu^2-48u^3+40u^2-30u+5
\right)<0.
\]

The factor in parentheses is at least

\[
5-30u-48u^3>0.
\]

The relaxed expression is therefore concave in \(q_1\), so its minimum
on \(0\le q_1\le m\) occurs at

\[
q_1=0\quad\text{or}\quad q_1=m.
\tag{10}
\]

## Final Bernstein certificate

Put

\[
t=M s,\qquad m=M(1-s),\qquad 0\le s\le1.
\]

Apply (5)--(10) to (2), and put \(u=v/20\).  There are two resulting
polynomials, according to the two endpoints in (10), on

\[
(v,s,z)\in[0,1]^3.
\]

Split the \(z\)-interval into

\[
[0,\tfrac12]\quad\text{and}\quad[\tfrac12,1].
\]

Each of the four polynomials has degree \((6,5,3)\) in its three box
variables.  Their smallest tensor-product Bernstein coefficients are:

| endpoint | \(z\)-half | smallest coefficient |
|---|---:|---:|
| \(q_1=0\) | first | \(18064377/16000000\) |
| \(q_1=0\) | second | \(6937407/8000000\) |
| \(q_1=m\) | first | \(893997/640000\) |
| \(q_1=m\) | second | \(162747873/160000000\) |

All are strictly positive.  A polynomial on a box lies between the
minimum and maximum of its Bernstein coefficients, so

\[
\Delta C_4>0
\qquad(n\ge20).
\]

The exact symbolic verifier is:

```powershell
python .\verify_rank4_global_leaf_curvature.py
```

It reconstructs (2), checks every derivative identity and reduction,
computes all four Bernstein expansions, and verifies the exact rational
minimum coefficients.

## Orders below 20

Every unlabeled tree through order 19 and every attachment vertex were
checked with exact integer arithmetic:

- 522,959 unlabeled trees;
- 9,594,824 attachment vertices;
- no negative \(C_4\);
- no negative \(\Delta C_4\).

The durable outputs are:

- `rank4_leaf_curvature_identity_n16_20260726.json`;
- `rank4_leaf_curvature_identity_n17_only_20260726.json`;
- `rank4_fast_n18_20260726.json`;
- `rank4_fast_n19_exhaustive_20260726.json`.

The scanners are `verify_rank4_leaf_curvature_identities.py` and
`scan_rank4_leaf_curvature_fast.py`.

Audit the four durable outputs and their combined coverage with:

```powershell
python .\verify_rank4_finite_output_bundle.py
```

This completes the proof of the theorem.
