# Star-Root Intersection Reduction

## Status

This note gives a rigorous partial proof of prefix isolated-root ratio
dominance (PIRD) for the depth-two star-root family.  Every term group
with a nonempty intersection of selected star centres is proved
nonnegative.  The entire remaining obstruction is one explicitly
described disjoint-centre bivariate polynomial.

The final disjoint-centre inequality is strongly supported by exact
enumeration but is not yet proved here.

## 1. The star-root family

Let \(q\) be adjacent to centres \(v_1,\dots,v_s\), and let \(v_i\)
have \(a_i\ge1\) pendant leaves.  Put

\[
M=\sum_{i=1}^s a_i,\qquad
S_a(x)=(1+x)^a+x,
\]

\[
K(x)=\prod_{i=1}^s S_{a_i}(x),
\qquad
L(x)=(1+x)^M.
\]

Then

\[
I(A-q;x)=K(x),\qquad
I(A-N[q];x)=L(x),
\]

and, after adding one isolated marked vertex,

\[
B(x)=(1+x)(K(x)+xL(x)).
\]

The desired all-ranks strengthening of PIRD is

\[
\Delta_k:=B_{k+1}K_k-B_kK_{k+1}\ge0
\qquad(k\ge0).
\tag{1}
\]

## 2. Expansion by selected centres

For \(R\subseteq[s]\), define

\[
A_R=\sum_{i\in R}a_i,
\qquad
g_R(x)=x^{|R|}(1+x)^{M-A_R}.
\]

Here \(R\) records the star centres selected by an independent set.
Consequently,

\[
K(x)=\sum_{R\subseteq[s]}g_R(x).
\tag{2}
\]

The numerator has the exact expansion

\[
B(x)
=(1+x)^2L(x)
+\sum_{\varnothing\ne R\subseteq[s]}(1+x)g_R(x).
\tag{3}
\]

Thus define

\[
f_R(x)=
\begin{cases}
(1+x)^2g_\varnothing(x),&R=\varnothing,\\
(1+x)g_R(x),&R\ne\varnothing.
\end{cases}
\]

Then \(B=\sum_R f_R\), and (1) is the sum over ordered pairs
\((R,T)\) of

\[
[x^{k+1}]f_R\,[x^k]g_T
-[x^k]f_R\,[x^{k+1}]g_T.
\tag{4}
\]

## 3. Grouping by \(R\cap T\)

For a fixed \(P\subseteq[s]\), group all ordered pairs satisfying
\(R\cap T=P\).  Introduce

\[
F_a(x,y)
=(1+x)^a(1+y)^a
+x(1+y)^a
+y(1+x)^a.
\tag{5}
\]

The centre \(i\notin P\) can be in neither set, in \(R\) only, or in
\(T\) only.  Therefore

\[
\sum_{R\cap T=P}g_R(x)g_T(y)
=(xy)^{|P|}
\prod_{i\notin P}F_{a_i}(x,y).
\tag{6}
\]

When \(P\ne\varnothing\), every admissible \(R\) is nonempty, so the
special empty-set term in (3) never occurs.  The complete bivariate
generating polynomial of the \(P\)-group is then

\[
H_P(x,y)
=(1+x)(xy)^{|P|}
\prod_{i\notin P}F_{a_i}(x,y).
\tag{7}
\]

Its contribution to (1) is

\[
[x^{k+1}y^k]H_P-[x^ky^{k+1}]H_P.
\tag{8}
\]

## 4. Homogeneous slices of \(F_a\)

Fix a total degree \(d\).  The coefficient of \(x^iy^{d-i}\) in
\(F_a\) is

\[
u_i=
\binom ai\binom a{d-i}
+\mathbf1_{i=1}\binom a{d-1}
+\mathbf1_{d-i=1}\binom ai,
\tag{9}
\]

with binomial coefficients zero outside their natural range.

The sequence \((u_i)_{i=0}^d\) is symmetric.  It is also unimodal
toward the centre:

- the base sequence
  \(\binom ai\binom a{d-i}\) is symmetric and log-concave in \(i\);
- the two added terms occur symmetrically at \(i=1,d-1\);
- the only comparison that the added term could spoil is
  \(u_1\le u_2\).

For \(d=4\), that comparison reduces to

\[
\binom a2^2\ge(a+1)\binom a3,
\]

or

\[
3a(a-1)\ge2(a+1)(a-2),
\]

which is immediate.  For \(d\ge5\), whenever the added term is
nonzero, \(a\ge d-1\), and the comparison reduces to

\[
\binom a2\binom a{d-2}
\ge(a+1)\binom a{d-1},
\]

equivalently

\[
a(a-1)(d-1)
\ge2(a+1)(a-d+2).
\tag{10}
\]

At \(d=5\), (10) reduces after division by \(2\) to
\(a^2+3\ge0\); increasing \(d\) increases the left side and
decreases the right side.  The cases \(d\le3\) follow directly from
(9).  This proves the slice-unimodality claim.

## 5. Products preserve the required slice property

The convolution of two nonnegative symmetric unimodal sequences is
symmetric unimodal.  One elementary proof writes each sequence as a
nonnegative sum of centred interval indicators; the convolution of two
such indicators is a symmetric unimodal trapezoid.

For a fixed total degree \(d\), a homogeneous slice of
\(\prod_iF_{a_i}\) is a sum, over \(d_1+\cdots+d_t=d\), of
convolutions of the degree-\(d_i\) slices of the factors.  Every such
convolution is centred at

\[
\frac{d_1}{2}+\cdots+\frac{d_t}{2}=\frac d2.
\]

Their sum is therefore symmetric unimodal about \(d/2\).
Multiplication by a power of \(xy\) shifts both indices equally and
preserves the assertion.

## 6. Every nonempty-intersection group is nonnegative

Let

\[
G_P(x,y)=(xy)^{|P|}\prod_{i\notin P}F_{a_i}(x,y).
\]

This polynomial is symmetric in \(x,y\).  From (7),

\[
\begin{aligned}
&[x^{k+1}y^k](1+x)G_P
-[x^ky^{k+1}](1+x)G_P\\
&\qquad=
[x^ky^k]G_P
-[x^{k-1}y^{k+1}]G_P.
\end{aligned}
\tag{11}
\]

The two coefficients on the right lie in the homogeneous slice of
total degree \(2k\).  The first is central and the second is one step
away from the centre.  Section 5 therefore makes (11) nonnegative.

We have proved:

> **Nonempty-intersection theorem.** For every list
> \(a_1,\dots,a_s\ge1\), every \(k\ge0\), and every nonempty
> \(P\subseteq[s]\), the sum of the terms (4) over all ordered pairs
> \((R,T)\) with \(R\cap T=P\) is nonnegative.

## 7. The sole remaining group

For \(P=\varnothing\), put

\[
G(x,y)=\prod_{i=1}^sF_{a_i}(x,y).
\]

The special first term in (3) contributes exactly
\(x(1+x)L(x)K(y)\).  Hence the complete empty-intersection group is

\[
\boxed{
H_\varnothing(x,y)
=(1+x)\bigl(G(x,y)+xL(x)K(y)\bigr).
}
\tag{12}
\]

By the theorem above, the full star-root inequality (1) will follow
from the single oriented-central inequality

\[
[x^{k+1}y^k]H_\varnothing
\ge
[x^ky^{k+1}]H_\varnothing
\qquad(k\ge0).
\tag{13}
\]

Equivalently,

\[
\begin{aligned}
&[x^ky^k]G-[x^{k-1}y^{k+1}]G\\
&\quad+
K_k(L_k+L_{k-1})
-K_{k+1}(L_{k-1}+L_{k-2})
\ge0.
\end{aligned}
\tag{14}
\]

The first line is nonnegative by the slice theorem.  The second line
can be negative, including in the relevant prefix at rank \(6\), so
the compensation in (14) is substantive.

## 8. Exact computational checks

`find_min_star_root_pird_failure.py` exhausts branch multisets in
increasing rooted-tree order.

Through rooted-tree order \(50\):

- branch multisets: \(173{,}525\);
- all-rank minors: \(6{,}498{,}178\);
- negative all-rank minors: \(0\);
- prefix minors at \(r\ge6\): \(2{,}371{,}672\);
- negative prefix minors: \(0\).

Reports:

- `star_root_pird_allranks_n50_20260729.json`;
- `star_root_pird_prefix_n50_20260729.json`.

`probe_star_root_pairwise_decomposition.py` independently expands all
centre subsets.  Through rooted-tree order \(18\), it checked
\(78{,}011\) intersection-group/rank combinations and found:

- no negative nonempty-intersection group;
- no negative empty-intersection group;
- no failure of ordinary or ultra log-concavity in any homogeneous
  slice of (12);
- no slice whose mode lies strictly to the left of its centre.

The same computation also finds exact failures of finer proposed
groupings:

- a symmetrized individual-pair term is negative already for branch
  list \((1,1)\);
- an intersection-and-union interval term is negative for branch list
  \((3)\).

Thus the intersection grouping is not a cosmetic regrouping of
individually nonnegative terms.

Report:

`star_root_bivariate_slices_ulc_n18_20260729.json`.

## 9. Next proof obligation

Prove (13), preferably through the stronger observed statement:

> Every homogeneous coefficient slice of
> \(H_\varnothing(x,y)\) is ultra-log-concave and has a mode at or to
> the right of its centre.

Only the oriented central comparison in odd total degree is required
for (13).  Once it is proved, the depth-two star-root case of PIRD is
complete; the deepest-support reduction then leaves at most one
arbitrary inward branch.
