# One-Deep Bivariate Binomial-Closure Reduction

## Status

This note gives an exact intersection decomposition for the remaining
one-deep PIRD minor.  Together with the binomial-central convolution
theorem, it proves every homogeneous degree allocation in which

1. the inward branch centre is not selected by both independent sets;
2. the special empty-intersection correction is omitted; and
3. the inward rooted-bridge slice lies in its RBC range.

It also identifies, without hidden cross terms, the three pieces still
requiring compensation: inward tail allocations, the aggregate
inward-intersection term, and the special empty-intersection
correction.

## 1. A uniform branch notation

At the distinguished root \(q\), label the arbitrary inward branch by
\(0\) and the side-star branches by \(1,\ldots,s\).  For each branch
write \(A_v\) for the polynomial when its centre is absent and \(R_v\)
for the polynomial when its centre is present.  Thus

\[
\begin{array}{c|c|c}
v&A_v&R_v\\ \hline
0&E&Q:=xJ=P-E,\\
i\ge1&(1+x)^{a_i}&x.
\end{array}
\tag{1}
\]

For \(U\subseteq\{0,\ldots,s\}\), put

\[
g_U(x)=
\prod_{v\in U}R_v(x)
\prod_{v\notin U}A_v(x).
\tag{2}
\]

Here and below the two displayed products in (2) are multiplied, not
added.  Then

\[
C(x)=\sum_Ug_U(x)=P(x)K(x),
\qquad
D(x)=g_\varnothing(x)=E(x)L(x),
\tag{3}
\]

and the terminal polynomial is

\[
B(x)=(1+x)\{C(x)+xD(x)\}.
\tag{4}
\]

Equivalently,

\[
B=\sum_U f_U,\qquad
f_U=
\begin{cases}
(1+x)^2g_\varnothing,&U=\varnothing,\\
(1+x)g_U,&U\ne\varnothing.
\end{cases}
\tag{5}
\]

## 2. Exact intersection decomposition

For each branch define the two-copy, no-double-centre factor

\[
F_v(x,y)
=A_v(x)A_v(y)
R_v(x)A_v(y)
+A_v(x)R_v(y).
\tag{6}
\]

For the inward branch this is precisely

\[
F_0(x,y)
=E(x)E(y)+Q(x)E(y)+E(x)Q(y)
=P(x)P(y)-Q(x)Q(y).
\tag{7}
\]

For a side star it is the already proved factor

\[
F_i(x,y)
=(1+x)^{a_i}(1+y)^{a_i}
+x(1+y)^{a_i}
+y(1+x)^{a_i}.
\tag{8}
\]

Group the ordered pairs \((U,V)\) in
\(B(x)C(y)=\sum_{U,V}f_U(x)g_V(y)\) by their exact centre
intersection \(W=U\cap V\).  If \(W\ne\varnothing\), the whole group
is

\[
\boxed{
H_W(x,y)
=(1+x)
\prod_{v\in W}R_v(x)R_v(y)
\prod_{v\notin W}F_v(x,y).
}
\tag{9}
\]

For the empty group, (5) has one extra factor \(1+x\) when
\(U=\varnothing\).  Therefore

\[
\boxed{
H_\varnothing(x,y)
=(1+x)
\left\{
\prod_{v=0}^sF_v(x,y)
+xD(x)C(y)
\right\}.
}
\tag{10}
\]

Equations (9)--(10) partition \(B(x)C(y)\) exactly.  Hence the PIRD
minor is

\[
\Delta_k
=
\sum_{W\subseteq\{0,\ldots,s\}}
\left(
[x^{k+1}y^k]H_W
-[x^ky^{k+1}]H_W
\right).
\tag{11}
\]

## 3. The groups not containing the inward centre

Suppose \(0\notin W\).  Remove the outer factor \(1+x\) from (9), and
call the remaining symmetric polynomial \(G_W\).  Its contribution is

\[
[x^ky^k]G_W-[x^{k-1}y^{k+1}]G_W.
\tag{12}
\]

Apart from the harmless common shift \((xy)^{|W|}\), every
homogeneous degree allocation in \(G_W\) is a convolution of

- one homogeneous slice of the inward factor \(F_0\); and
- homogeneous slices of side-star factors \(F_i\).

Every side-star slice is binomially central.  By the convolution
theorem in
`BINOMIAL_CENTRAL_CONVOLUTION_THEOREM_2026-07-29.md`, if the chosen
inward slice satisfies RBC, the complete allocated slice is
binomially central.  At its even central degree this gives

\[
[x^ky^k]G_W
\ge
\frac{r+1}{r}
[x^{k-1}y^{k+1}]G_W
\tag{13}
\]

where \(r=k-|W|\) is the central index after the common
\((xy)^{|W|}\) shift.  (For \(r=0\), the off-central coefficient
vanishes.)  In particular (12) is nonnegative.

Because the comparison is linear, all degree allocations for which
the inward slice lies in its RBC range may be summed immediately.
No ultra-log-concavity or product closure for the full inward
polynomial is needed.

For \(W=\varnothing\), the same argument proves the generic product
\((1+x)\prod_vF_v\).  It does not include the oriented correction
\((1+x)xD(x)C(y)\) in (10).

## 4. The exact unresolved aggregate

The intersection groups containing the inward centre should not be
estimated separately.  Summing (9) over all \(W\ni0\) gives

\[
\begin{aligned}
\sum_{W\ni0}H_W
&=(1+x)Q(x)Q(y)
\prod_{i=1}^s\{F_i(x,y)+xy\}\\
&=(1+x)Q(x)Q(y)K(x)K(y).
\end{aligned}
\tag{14}
\]

Thus their combined central contribution is exactly the ordinary
log-concavity gap of the root-present phase \(QK\):

\[
(QK)_k^2-(QK)_{k-1}(QK)_{k+1}.
\tag{15}
\]

This gap need not be nonnegative for arbitrary forest factors, so
splitting it into individual intersection groups would impose a false
strengthening.

Similarly, summing the generic portions of all groups with
\(0\notin W\) gives

\[
(1+x)F_0(x,y)K(x)K(y).
\tag{16}
\]

Adding (14) uses \(F_0+Q(x)Q(y)=P(x)P(y)\), and therefore recovers the
ordinary log-concavity part of \(C=PK\).  The correction left by
(10) contributes exactly

\[
C_k(D_k+D_{k-1})
-C_{k+1}(D_{k-1}+D_{k-2}).
\tag{17}
\]

Equations (15)--(17) sum to

\[
\Delta_k
=C_k^2-C_{k-1}C_{k+1}
+C_k(D_k+D_{k-1})
-C_{k+1}(D_{k-1}+D_{k-2}),
\tag{18}
\]

as required.

## 5. What is now left

The bivariate tensorization problem has been reduced to three
explicit obligations:

1. **Prefix RBC:** prove RBC for the single arbitrary inward rooted
   factor in its inductive prefix.  This is proved for endpoint-rooted
   paths at every rank and has no failure in more than \(8.3\) million
   exact prefix checks on adversarial rooted trees.
2. **Tail allocations:** control the degree allocations in (12) whose
   inward slice lies outside that prefix.  The unrestricted RBC
   statement is false, so these terms must be paired with reserve from
   the side-star block rather than discarded.
3. **Exceptional aggregate:** combine (15) and (17) with the central
   surplus left by the generic groups.  Algebraically this is the
   GSB--deletion half-payment inequality (HP) in
   `ONE_DEEP_GSB_DELETION_RESERVE_2026-07-29.md`.

This is a strict reduction: arbitrary products of rooted factors no
longer appear.  There is one rooted-bridge factor, explicit star
factors, and one completely identified exceptional payment.
