# Component-variance reduction for the forest ISO reserve

Date: 2026-07-29

## Status

The identities and rank-two component bound below are proved.  The
component-variance inequality (CV) is now also proved for every
forest at global rank three.  Its arbitrary-rank form remains
conjectural.  Proving it would establish the
elementary ISO reserve for forests, but would not by itself finish
PFSR, NCL, or Erdős Problem 993.

## One-down-link identity

Let \(F\) be a forest and fix a rank \(r\ge2\).  Choose an independent
\((r-2)\)-set \(K\) with probability proportional to

\[
h_K=i_1(H_K),\qquad H_K=F-N[K].
\]

Write \(c_K\) for the number of components of \(H_K\), and put

\[
A_K=\frac{2i_2(H_K)}{i_1(H_K)}.
\]

For a uniform extension of \(K\), \(A_K\) is the conditional mean of
the next extension count.  If

\[
M_2(H)=
\frac{i_1(H)^2+2i_2(H)^2-3i_1(H)i_3(H)}
     {i_1(H)^2},
\]

then the exact down-link decomposition is

\[
\boxed{
R_r(F)=(r-2)+2\mathbb E_\mu M_2(H_K)
-\operatorname{Var}_\mu(A_K).
}
\tag{1}
\]

This follows immediately from

\[
2M_2(H_K)=2+A_K^2-B_K,
\qquad
B_K=\frac{6i_3(H_K)}{i_1(H_K)},
\]

and the already verified common down-link identity for \(R_r\).

## Exact component reserve at rank two

For a residual forest \(H\), write

\[
h=|V(H)|,\qquad c=c(H),\qquad m=h-c,
\]

and let

\[
P=\binom m2-\sum_v\binom{\deg_H(v)}2.
\]

Thus \(P\) is the number of unordered pairs of disjoint edges.  The
sharp rank-two calculation gives

\[
\boxed{
M_2(H)=
\frac{c\{4h^2-3h(c+1)+4c\}}{2h^2}
+\frac{3P}{h}.
}
\tag{2}
\]

In particular,

\[
M_2(H)\ge
\frac{c\{4h^2-3h(c+1)+4c\}}{2h^2}
\ge\frac c2,
\tag{3}
\]

because the gap between the middle term and \(c/2\) is

\[
\frac{c\{3h(h-c-1)+4c\}}{2h^2}\ge0.
\]

Substitution into (1) yields

\[
\boxed{
R_r(F)\ge
r-2+\mathbb E_\mu c_K
-\operatorname{Var}_\mu(A_K).
}
\tag{4}
\]

Therefore the elementary ISO reserve would follow from:

> **Component-variance inequality (CV).**  In the operative forest
> range,
> \[
> \operatorname{Var}_\mu(A_K)
> \le r-2+\mathbb E_\mu c_K.
> \tag{CV}
> \]

Unlike a scalar curvature bound, (CV) explicitly retains the
acyclicity statistic that grows when the residual forest separates
into many components.

## Why a constant floor is insufficient

Replacing every local \(M_2(H_K)\) merely by the sharp rising constant
\(37/25\) is false as a lifting strategy.  Let \(D_t\) be the tree
formed from two copies of \(K_{1,t}\) by joining their centers through
one new middle vertex.  At global rank \(r=3\),

\[
\operatorname{Var}(A)=
\frac{t(2t^4+8t^3+2t^2-12t+5)}
{(t+1)^2(2t+1)^2}.
\]

At \(t=8\), order \(19\), every local rank-two fiber is rising, but

\[
3+\frac{24}{25}-\operatorname{Var}(A)
=-\frac{8677}{34425}<0.
\]

The exact reserve remains positive:

\[
R_3(D_t)=
\frac{8t^5+21t^4+38t^3+39t^2+8t+3}
{(t+1)^2(2t+1)^2}>0.
\]

The component-sensitive slack is

\[
1+\mathbb E c-\operatorname{Var}(A)
=
\frac{2t^5+8t^4+23t^3+33t^2+5t+2}
{(t+1)^2(2t+1)^2}>0.
\]

Thus components retain exactly the linear reserve that the constant
floor discards.  The exact replay is
`double_star_rank2_lift_obstruction_certificate_20260729.json`.

## Evidence and next target

The executable `scan_rank2_floor_downlink_lift.py` verifies (1)
exactly and audits (CV).  Every rising rank of every unlabeled tree
through order 15 gives 49,429 exact checks with no (CV) failure; the
record is `rank2_component_downlink_lift_n15_20260729.json`.  The
discarded bound \(\operatorname{Var}(A)\le r\) has three failures in
the same census.

A separate exact rank-three scan of 100,893 multi-hub caterpillars,
including orders in the hundreds, also found no failure; its smallest
sampled slack was \(22189/7560\).  The deterministic certificate is
`rank3_component_variance_caterpillars_100k_20260729.json`.

An exhaustive exact rank-three census of every unlabeled tree through
order 18 gives 204,976 rising checks and no failure.  Its minimum
slack is

\[
\frac{5239}{2205}=2.3759637\ldots
\]

at an eight-vertex tree.  The certificate is
`rank3_component_variance_all_trees_n18_20260729.json`.

At rank three, for a vertex \(v\),

\[
h_v=n-1-\deg(v),\qquad
c_v=\sum_{u\sim v}(\deg(u)-1),\qquad
A_v=h_v-3+\frac{2c_v}{h_v},
\]

and the down-link law gives mass proportional to \(h_v\).  It is
important to keep the two terms in \(A_v\) coupled.  The tempting
separate estimate

\[
\operatorname{Var}_{h}(\deg(v))
\le \frac12\mathbb E_h c_v
\]

is false: the caterpillar with consecutive hub leaf loads
\((97,70,99,48)\) has left side
\(150752367183/2508607396\) and right side
\(4258273/100172\).  The complete (CV) expression still passes there;
the covariance and the \(2c_v/h_v\) correction cannot be discarded.

The next mathematical target is a component-aware Poincaré proof of
(CV) for arbitrary rank, followed by the corresponding
two-measure/terminal analogue needed for the augmented variance
\(\Xi\) in NCL.  The complete rank-three forest proof and its symbolic
verifier are in
`RANK3_FOREST_COMPONENT_VARIANCE_2026-07-29.md` and
`verify_rank3_forest_component_variance.py`.

The rank-three result has now been sharpened by one full unit:

\[
\mathbb E c_v-\operatorname{Var}(h_v)
-2\operatorname{Cov}\left(h_v,\frac{2c_v}{h_v}\right)\ge1,
\]

and hence \(\operatorname{Var}(A_v)\le\mathbb E c_v\).
This sharp floor is proved symbolically outside a finite connected
base and exactly checked on every one of the 434 exceptional trees
through order 11.  See
`RANK3_FOREST_PAYMENT_FLOOR_2026-07-29.md`.

For arbitrary rank, writing \(A_K=h_K-3+2c_K/h_K\) separates a
bounded range-two term.  This reduces (CV) to the stronger
denominator-free payment

\[
\operatorname{Var}(h_K)
+2\operatorname{Cov}\left(h_K,\frac{2c_K}{h_K}\right)
\le r-3+\mathbb E c_K.
\]

After clearing the down-link mass, the inequality involves only
\(\sum h_K^j\), \(\sum c_K\), and \(\sum h_Kc_K\).  It has no
fiberwise denominators and passes 117,456 exact all-rank tree checks
through order 15.  See
`DENOMINATOR_FREE_COMPONENT_PAYMENT_2026-07-29.md`.
