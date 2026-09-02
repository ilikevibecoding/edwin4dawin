# Denominator-free component payment

Date: 2026-07-29

## Status

This is a sufficient arbitrary-rank strengthening of the
component-variance inequality.  Its reduction is proved, and it
survives every exact tree check currently completed, but the
arbitrary-rank payment inequality itself is not yet proved.

## Reduction

Fix a forest \(F\), let \(q=r-2\), and choose an independent
\(q\)-set \(K\) with probability proportional to

\[
h_K=|V(F-N[K])|.
\]

Because the residual graph \(H_K=F-N[K]\) is a forest with \(c_K\)
components,

\[
A_K=\frac{2i_2(H_K)}{i_1(H_K)}
=h_K-3+z_K,\qquad
z_K=\frac{2c_K}{h_K}.
\]

Since \(0\le c_K\le h_K\), one has
\(0\le z_K\le2\) and

\[
\operatorname{Var}(z_K)\le1.
\]

Consequently

\[
\operatorname{Var}(A_K)
\le1+\operatorname{Var}(h_K)
+2\operatorname{Cov}(h_K,z_K).
\]

Thus (CV) follows from

\[
\boxed{
\operatorname{Var}(h_K)
+2\operatorname{Cov}(h_K,z_K)
\le q-1+\mathbb E c_K.
}
\tag{DFP}
\]

Although \(z_K\) contains \(1/h_K\), the down-link weighting cancels
every denominator in (DFP).

## Exact polynomial form

Let the sums below run over all independent \(q\)-sets \(K\), and put

\[
\begin{aligned}
S&=\sum_Kh_K, &
H_2&=\sum_Kh_K^2, &
H_3&=\sum_Kh_K^3,\\
C_0&=\sum_Kc_K, &
C_1&=\sum_Kh_Kc_K.
\end{aligned}
\]

The down-link law has total mass \(S=(q+1)i_{q+1}(F)\).  Direct
expansion shows that (DFP) is exactly

\[
\boxed{
(q-1)S^2-SH_3-3SC_1+H_2^2+4H_2C_0\ge0.
}
\tag{P_q}
\]

Equivalently, if \(e_K=h_K-c_K\) is the number of residual edges and

\[
E_0=\sum_Ke_K,\qquad E_1=\sum_Kh_Ke_K,
\]

then

\[
(P_q)=(q-1)S^2+H_2^2+SH_2-SH_3+3SE_1-4H_2E_0.
\tag{P'_q}
\]

These forms use only integer counts.  No coefficient ratio or
fiberwise denominator remains.

At \(q=1\), \((P_q)\) is precisely the covariance payment proved in
`RANK3_FOREST_COMPONENT_VARIANCE_2026-07-29.md`.

## Evidence

`scan_rank2_floor_downlink_lift.py` now checks the split

\[
(q+\mathbb Ec-\operatorname{Var}A)
=\underbrace{(q-1+\mathbb Ec-\operatorname{Var}h
-2\operatorname{Cov}(h,z))}_{\text{(DFP) slack}}
+\underbrace{(1-\operatorname{Var}z)}_{\ge0}
\]

exactly.  The completed moment-DP census now covers 1,999,403 ranks
in all 205,006 unlabeled trees through order 18, including decreasing
ranks, and found:

- zero (DFP) failures;
- zero component-variance failures;
- exact agreement of the split at every rank.

The replay is
`denominator_free_payment_tree_dp_exhaustive_n18_20260729.json`.

An independent tree dynamic program tracks
\((1,h,h^2,h^3,e,he)\) for every rank without enumerating independent
sets.  It was cross-checked term-for-term against brute enumeration
on random trees through order 10.  A first large audit then checked
14,077 ranks in 222 paths, stars, random Prüfer trees, and
multi-hub caterpillars of orders up to 100, again with no failure.
Its replay is
`denominator_free_payment_tree_dp_200_20260729.json`.

## The stronger observed floor is false

The order-18 census suggested the sharper inequality

\[
\boxed{(P_q)\ge qS^2.}
\tag{F}
\]

After subtracting \(qS^2\), (F) becomes the rank-free moment
inequality

\[
\boxed{
H_2^2+4H_2C_0-SH_3-3SC_1\ge S^2.
}
\tag{U}
\]

At \(q=1\), (U) is the proved one-unit rank-three payment.  It also
survived all 1,999,403 ranks through tree order 18 and the exact
collective-link audit through order 16.  Those finite observations do
not extend to the known phase-separated families.

Galvin's tree \(T_{14,8}\), of order \(239\), has six ranks
\(112\le q\le117\) where (U) fails.  Its worst normalized gap is
\(-0.8598823980\ldots\), at \(q=113\).  The actual payment
\((P_q)\) remains positive at every rank.  Therefore:

- the \(qS^2\) budget in \((P_q)\) is essential;
- collective link compatibility for the rank-free form is false in
  general;
- the successful small-order compatibility census remains a useful
  diagnostic but is not a proof route.

The exact replay is
`edge_survival_payment_reduction_certificate_20260729.json`.

## Edge-survival form

Let

\[
E_q=\sum_{|K|=q} e(F-N[K])
\]

be the number of rank-\(q\) independent sets with a marked surviving
residual edge, and put

\[
S=(q+1)i_{q+1},\quad
B=(q+1)(q+2)i_{q+2},\quad
C=(q+1)(q+2)(q+3)i_{q+3}.
\]

Expanding \(H_2,H_3\) in falling-factorial counts introduces the sum
of residual wedges \(W_q\).  The exact double count

\[
\sum_K h_Ke(F-N[K])
=(q+1)E_{q+1}+2W_q+2E_q
\]

cancels every wedge term and reduces the target to

\[
\boxed{
(P_q)=qS^2+B^2-CS+2SE_q
-3(q+1)SE_{q+1}-4E_q^2\ge0.
}
\tag{ES}
\]

Equivalently, with

\[
x=B/S,\quad y=C/B,\quad
t=2E_q/S,\quad z=(q+1)E_{q+1}/E_q,
\]

\[
\frac{P_q}{S^2}
=q+x(x-y)+t\left(1-t-\frac32z\right).
\]

This isolates the remaining obligation as compensation between an
adjacent factorial-ratio defect and the extension ratio of a marked
surviving edge.  See
`EDGE_SURVIVAL_PAYMENT_REDUCTION_2026-07-29.md`.

The next proof target is \((P_q)\), preferably in the edge-survival
form (ES).  Its advantage is that it can be attacked by double
counting extension vertices and surviving forest edges, without
rational fiber quantities.

Several natural attempts to split \((P_q)\) further are false.  In
particular, neither the bound
\(2\mathbb Ec_K\ge3\operatorname{Var}(h_K)\) nor a Cauchy-only
replacement of the covariance survives large multi-hub
caterpillars.  A conditional-mean martingale shortcut is also false:
connector trees built from a path and a star have between-link
variance growing linearly with their order.  Their complete payment
has large positive component surplus.  An exact deletion
decomposition also has
between-fiber terms that can exceed their nominal rank budget.  In
all these negative controls, the complete \((P_q)\) margin remains
positive.  Any proof must preserve the cancellation between its
moment and component terms.
