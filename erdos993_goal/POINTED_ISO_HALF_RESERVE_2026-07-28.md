# Pointed ISO half-reserve inequality

Date: 2026-07-28

Status: the exact reduction and the rank-two theorem below are proved.
The all-rank pointed inequality is conjectural.  This is not a solution
of Erdős Problem 993.

## 1. The pointed inequality

Let \(F\) be a forest rooted at \(q\), and write

\[
B=I(F;x)=\sum_jb_jx^j.
\]

Let \(h_j\) count the independent \(j\)-sets containing \(q\), and put

\[
\rho_j=\frac{h_j}{b_j},\qquad
u=r\frac{b_r}{b_{r-1}}.
\]

The normalized ISO reserve is

\[
R_r(B)=
\frac{r\{rb_r^2+b_{r-1}^2-(r+1)b_{r-1}b_{r+1}\}}
{b_{r-1}^2}.
\]

Define the pointed occupancy burden

\[
\mathcal B_{r,q}
=r(u+1)\rho_{r-1}-(r+1)u\rho_r.
\]

The terminal drift identity is

\[
\frac{uD_U}{b_{r-1}b_r}=R_r(B)-\mathcal B_{r,q}.
\]

The computations suggest the sharper inequality

\[
\boxed{
R_r(B)\ge2\mathcal B_{r,q}.
}
\tag{PISO}
\]

When \(\mathcal B_{r,q}\le0\), (PISO) follows from the ordinary ISO
reserve.  Its content is the case in which the probability of occupying
the root falls rapidly enough to create a positive burden.

In coefficient form, (PISO) is

\[
\boxed{
rb_r^2+b_{r-1}^2-(r+1)b_{r-1}b_{r+1}
+2(r+1)b_{r-1}h_r
-2(rb_r+b_{r-1})h_{r-1}
\ge0.
}
\tag{1}
\]

Thus (PISO) says that at least half the unpointed ISO reserve remains
after paying for a positive root-occupancy burden.  Together with the
ordinary ISO inequality \(R_r(B)\ge0\), it immediately implies the
one-step terminal drift inequality: positive burdens use (PISO), while
nonpositive burdens use ordinary ISO directly.

The factor \(2\) is asymptotically sharp.  Take \(F=K_{1,m}\), root it
at the center, and use \(r=2\).  Then \(\rho_1=1/(m+1)\) and
\(\rho_2=0\); the ratio \(\mathcal B_{2,q}/R_2(B)\) tends to \(1/2\)
as \(m\to\infty\).

## 2. Rank-two theorem

> **Theorem.**  Inequality (PISO) holds at \(r=2\) for every rooted
> forest on at least two vertices.  More generally, it holds for the
> full terminal hit event:
> a set \(W\) whose vertices are isolated in \(F\), except for at most
> one vertex.

The order restriction is necessary only for the degenerate boundary
fiber consisting of one pointed vertex: its coefficient-form margin is
\(-1\).  That fiber has no independent two-set and never belongs to the
operative branch \(u\ge2\).  Whenever the normalized form is used, we
also assume \(b_2>0\).

Let \(F\) have \(n\) vertices and \(m\) edges.  Let the root have degree
\(d\), and put

\[
S=\sum_{v\in V(F)}\binom{\deg(v)}2.
\]

Because \(F\) has no triangles,

\[
b_1=n,\qquad
b_2=\binom n2-m,
\]

\[
b_3=\binom n3-m(n-2)+S.
\tag{2}
\]

The root-containing coefficients are

\[
h_1=1,\qquad h_2=n-1-d.
\tag{3}
\]

Substitution of (2)--(3) into (PISO) gives

\[
R_2(B)-2\mathcal B_{2,q}=\frac{\mathcal N}{n^2},
\]

where

\[
\begin{aligned}
\mathcal N={}&
-6Sn-12dn+4m^2+2mn^2-8mn+8m\\
&+n^3+9n^2-12n.
\end{aligned}
\tag{4}
\]

In a forest,

\[
S\le\binom m2,\qquad d\le m,\qquad 0\le m\le n-1.
\tag{5}
\]

The first inequality holds because \(S\) counts pairs of incident
edges, while there are only \(\binom m2\) pairs of edges in total.
Using the first two bounds in (5), the numerator in (4) is at least

\[
Q_n(m)=
-3m^2n+4m^2+2mn^2-17mn+8m+n^3+9n^2-12n.
\tag{6}
\]

For \(n\ge2\), \(Q_n(m)\) is concave in \(m\).  It is therefore enough
to check the endpoints of \(0\le m\le n-1\):

\[
Q_n(0)=n(n^2+9n-12)\ge0,
\]

\[
Q_n(n-1)=2(n-2)\ge0.
\]

This proves (PISO) at rank two.  The second endpoint is the star
extremizer and explains the sharp constant.

For the terminal-set extension, let \(t=|W|\), let \(t-1\) members of
\(W\) be isolated in \(F\), and let \(D\) be the number of edges
incident with \(W\).  Then

\[
h_1=t,\qquad
h_2=\binom n2-\binom{n-t}2-D.
\tag{7}
\]

The same substitution gives

\[
\begin{aligned}
n^2\{R_2(B)-2\mathcal B_{2,W}\}
={}&-12Dn-6Sn+4m^2+2mn^2-8mn+8mt\\
&+n^3+8n^2t+n^2-6nt^2-6nt.
\end{aligned}
\tag{8}
\]

Now \(D\le m\), \(S\le\binom m2\), and the \(t-1\) isolated vertices
force \(m\le n-t\).  After the first two substitutions, (8) is again
a concave quadratic in \(m\).  Put \(n=t+z\).  At its two possible
endpoints the lower bounds are

\[
m=0:\quad
(t+z)(3t^2+10tz-5t+z^2+z),
\tag{9}
\]

\[
\begin{aligned}
m=n-t:\quad&
3t^3+15t^2z-5t^2\\
&+12tz^2-13tz-12z^2.
\end{aligned}
\tag{10}
\]

For \(t=1\), (10) is \(2(z-1)\), the rooted-star calculation above;
the internal rank-two case has \(z\ge1\).  For \(t\ge2\), every grouped
coefficient in (9)--(10) is nonnegative:

\[
3t^2-5t>0,\qquad
t(15t-13)>0,\qquad
12(t-1)\ge0.
\]

This proves the rank-two inequality in precisely the terminal
generality needed by the pendant reduction.

The executable `verify_rank2_pointed_iso_forest.py` checks every
algebraic identity in this proof.

## 3. Exact evidence above rank two

The rooted-tree audit through order \(16\) checked 497,380 rooted
trees and 2,504,773 ranks with \(u\ge r\), with no failure.  The largest
observed burden-to-reserve ratio was

\[
\frac{113}{233}=0.4849785408\ldots,
\]

again at rank two on a star rooted at its center.  The exact minimum
pointed margin was \(7/64\).

For terminal supports in the first 10,000 PatternBoost records,
570,000 prefix ranks passed.  The largest burden-to-reserve ratio was
only \(0.08118037\ldots\), despite 2,234 genuine decreases of the
neighbor-hit probability.

These computations make (PISO) a substantially more structured target
than terminal drift itself.  A higher-rank proof should seek to
average the rank-two edge-pair argument over residual forests obtained
after fixing an independent \((r-2)\)-set.

A tempting rank-dependent strengthening is already false for
disconnected forests.  Replacing the factor \(2\) in (PISO) by \(r\)
fails for

\[
F=K_{1,3}\sqcup37K_1,
\]

rooted at a leaf of the \(K_{1,3}\), at \(r=20\).  Exact values are

\[
u=\frac{1232}{59},\qquad
R_r(B)=\frac{142770}{3481},\qquad
\mathcal B_{r,q}=\frac{7280}{3481},
\]

so

\[
R_r(B)-r\mathcal B_{r,q}
=-\frac{2830}{3481}<0,
\]

while the half-reserve margin remains

\[
R_r(B)-2\mathcal B_{r,q}
=\frac{128210}{3481}>0.
\]

Thus the constant \(2\), not a rank-growing factor, is the viable
forest-wide target.

Connectedness does not rescue the rank-weighted strengthening.  An
exact sample of 1,000 Prüfer trees of orders at most 200, with four
roots per tree, produced 355 failures of
\(R_r\ge r\mathcal B_{r,q}\) among 125,560 checks in the branch
\(u\ge r\).  The largest value of
\(r\mathcal B_{r,q}/R_r\) was approximately \(3.03314\), on a
195-vertex tree at \(r=61\).  The original factor-two inequality had
zero failures in the same audit.  The full exact witness is stored in
`random_connected_tree_rank_weighted_pointed_iso_1k_20260728.json`.

## 4. Consecutive pointed-reserve recurrence

The same decomposition propagates exactly to the next rank, for either
a singleton root or the full terminal hit event \(H=B-C\).  Define the
three consecutive extension means of \(B\) by

\[
u=r\frac{b_r}{b_{r-1}},\qquad
w=(r+1)\frac{b_{r+1}}{b_r},\qquad
z=(r+2)\frac{b_{r+2}}{b_{r+1}}.
\]

Put

\[
R=r+u^2-uw,\qquad
R^+=(r+1)+w^2-wz,
\]

\[
\mathcal B=
r(u+1)\rho_{r-1}-(r+1)u\rho_r,
\]

\[
\mathcal B^+=
(r+1)(w+1)\rho_r-(r+2)w\rho_{r+1},
\]

and let

\[
P=R-\mathcal B,\qquad P^+=R^+-\mathcal B^+.
\]

Thus \(P,P^+\) are the two consecutive pointed reserves that are
exactly equivalent to terminal one-step drift.  If

\[
d=u+1-v,\qquad d^+=w+1-y,
\]

then direct cancellation gives

\[
\boxed{
d=\frac{P}{u+r(1-\rho_{r-1})},
\qquad
d^+=\frac{P^+}{w+(r+1)(1-\rho_r)}.
}
\tag{11}
\]

Consequently the two curvatures obey the particularly simple
rank-shift identity

\[
\boxed{
q_T=q_F-d+d^+.
}
\tag{12}
\]

The upper ISO reserve therefore has the exact recurrence

\[
\boxed{
R_T
=(r+1)+v(q_F-1-d)
+\frac{vP^+}{w+(r+1)(1-\rho_r)}.
}
\tag{13}
\]

This turns the strong reserve cascade into a lower bound on the next
pointed reserve \(P^+\).  If

\[
\varepsilon=(d-q_F)_+=(w-v)_+,
\qquad
C_r=r+2+\frac{r^2}{u},
\]

then (SR) is equivalent to

\[
\boxed{
P^+\ge
\frac{w+(r+1)(1-\rho_r)}{2(r+1)v}
\left[
r\frac vuR+C_rd+2r(r+1)\varepsilon
-2(r+1)\{r+1+v(q_F-1-d)\}
\right].
}
\tag{14}
\]

The executable `verify_terminal_pointed_reserve_recurrence.py` checks
(11)--(14) symbolically.  This is the pointed analogue of the
isolated-pendant recurrence: forest drift is controlled by \(P\),
while compensated curvature is precisely a one-rank lower bound on
\(P^+\).

The pointed half-reserve theorem at the next rank is **not by itself**
strong enough to prove (14).  The sign-aware consequence of ordinary
ISO plus (PISO) is

\[
P^+\ge
\begin{cases}
R^+-\mathcal B^+,&\mathcal B^+\le0,\\
R^+/2,&\mathcal B^+>0.
\end{cases}
\tag{15}
\]

Although (15) pays the threshold in every rooted tree through order
\(16\), it fails on the exact two-level tree having six branches and
six leaves on each branch.  For a terminal leaf, at coefficient rank
\(16\) (so \(r=15\)), this tree has order \(36\), independence number
\(31\), and exact sign-aware deficit

\[
-\frac{
2943212869491734812639331677590399
}{
4830508860346437653618232679731200
}<0.
\]

The actual strong-reserve cascade remains positive there:

\[
\frac{
13797886372446964241154713891178317
}{
30571023282365608684357298397968
}>0.
\]

Thus the obstruction is only the loss in replacing the actual
\(P^+=R^+-\mathcal B^+\) by \(R^+/2\).  A full proof must retain more
of the next-rank terminal-hit burden, rather than combine two
standalone copies of (PISO).  The exact audit is
`scan_two_level_three_comparisons.py`; the witness is in
`two_level_three_comparisons_adaptive_t8_m50_20260728.json`.

## 5. Exact moment form

Choose a uniform independent \((r-1)\)-set \(S\).  Let \(e=e(S)\)
and \(q=q(S)\) be the numbers of vertices and edges in the residual
forest \(F-N[S]\).  Let \(Y\) indicate that \(S\) hits the terminal
set \(W\), put \(X=1-Y\), and let \(L\) be the number of addable
vertices of \(W\).  Double counting pointed extensions gives

\[
u\rho_r
=\mathbb E(Ye)+\mathbb E(XL)
=u\mathbb EY+\operatorname{Cov}(Y,e)+\mathbb E(XL).
\tag{15}
\]

Consequently

\[
\boxed{
\mathcal B_{r,W}
=(r-u)\mathbb EY
-(r+1)\operatorname{Cov}(Y,e)
-(r+1)\mathbb E(XL).
}
\tag{16}
\]

The ordinary ISO reserve is

\[
R_r=r+u+2\mathbb Eq-\operatorname{Var}(e).
\tag{17}
\]

Thus (PISO) is exactly

\[
\begin{aligned}
0\le{}&
r+u+2\mathbb Eq-\operatorname{Var}(e)
-2(r-u)\mathbb EY\\
&+2(r+1)\operatorname{Cov}(Y,e)
+2(r+1)\mathbb E(XL).
\end{aligned}
\tag{18}
\]

Completing the square with \(g=e-(r+1)Y\) rewrites this as

\[
\begin{aligned}
\operatorname{Var}(g)\le{}&
r+u+2\mathbb Eq-2(r-u)\mathbb EY\\
&+2(r+1)\mathbb E(XL)
+(r+1)^2\operatorname{Var}(Y).
\end{aligned}
\tag{19}
\]

The executable `verify_pointed_iso_moment_form.py` checks
(15)--(19), including their equivalence to the coefficient form.

## 6. Exact down-link decomposition and its obstruction

Delete a uniformly random member of \(S\), leaving an independent
\((r-2)\)-set \(K\).  Conditional on \(K\), the deleted vertex is
uniform on the residual forest \(F-N[K]\).  Write

\[
A_K=\mathbb E(e\mid K),\quad
p_K=\mathbb E(Y\mid K),\quad
C_K=\operatorname{Cov}(Y,e\mid K),
\]

\[
Z_K=\mathbb E(XL\mid K).
\]

Let \(M_r=R_r-2\mathcal B_{r,W}\), and let \(M_2(K)\) be the formal
rank-two pointed margin on this residual fiber.  The laws of total
variance and covariance give the exact identity

\[
\boxed{
\begin{aligned}
M_r={}&\mathbb E M_2(K)
+(r-2)\{1-2p+2\mathbb E(C_K+Z_K)\}\\
&-\operatorname{Var}(A_K)
+2r\operatorname{Cov}(A_K,p_K),
\end{aligned}
}
\tag{20}
\]

where \(p=\mathbb EY=\mathbb Ep_K\), and the expectation over \(K\)
uses its natural size-biased law.

This identifies the exact martingale correction needed to lift the
rank-two theorem.  The correction is not nonnegative term by term.
Already among trees of order at most eight in the branch \(u\ge r\),
31 of 516 rooted-rank instances have a negative formal correction;
the minimum is

\[
-\frac{1765}{882}.
\]

After applying pointed rank two only on genuine residual hit events
and ordinary rank two on inherited or one-vertex boundary fibers, the
correction still has 29 negative instances, with minimum

\[
-\frac{1933}{882}.
\]

All 516 full margins remain nonnegative.  Therefore “average the
rank-two theorem and discard the between-fiber term” is invalid, but
(20) isolates exactly what a successful averaging proof must pay.
The symbolic verifier is
`verify_downlink_pointed_iso_decomposition.py`, and the exact finite
audit is `scan_downlink_pointed_correction.py`.

As an independent stress test, the public 210-vertex double-spherical
tree that obstructs a different spectral-energy proof route has no
ordinary-ISO or pointed-ISO failure.  All 12,810 root/rank checks in
the branch \(u\ge r\) pass; the smallest pointed margin is
approximately \(172.0497\).  This audit is
`audit_public_d14_pointed_iso.py`.
