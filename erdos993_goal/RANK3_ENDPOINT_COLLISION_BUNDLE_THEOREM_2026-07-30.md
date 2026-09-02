# Rank-three endpoint-collision bundle theorem

Date: 2026-07-30

## Statement

Let \(H\) be a tree of order \(m\ge2\), and let \(v,s\) be distinct
vertices of \(H\).  Add a new leaf \(t\), either at \(v\) (the
**root-collision case**) or at \(s\) (the **support-collision case**).
Call the resulting tree \(C\), and let \(C_d\) be obtained by attaching
\(d\) new leaf children to \(t\).  In the normalization of
`recursive_blocks_fast(...,q=3,subtract_lower=False)`, put

\[
T_C(d)=2\bigl(d_3(C_d+z_s,v)-d_3(C_d,v)\bigr).
\]

Then

\[
T_C(d)=\sum_{j=0}^4c_j\binom dj
\]

and, in both endpoint cases,

\[
\boxed{c_1>0,\qquad c_2>0,\qquad c_3>0,\qquad c_4=32.}
\]

Consequently \(T_C(d)\ge T_C(0)\) for every \(d\ge0\).  Together with
the noncollision deepest-bundle theorem, this removes the last
rank-three obstruction to leaf-bundle pruning.

## High coefficients

Write

\[
\begin{gathered}
d_v=d_H(v),\qquad d_s=d_H(s),\\
A_v=\sum_{x\sim_Hv}(d_H(x)-1),\qquad
A_s=\sum_{x\sim_Hs}(d_H(x)-1),\\
a=1_{v\sim_Hs},\qquad
g=1_{\operatorname{dist}_H(v,s)=2}.
\end{gathered}
\]

In the root-collision case,

\[
\begin{aligned}
\frac{c_2}{2}={}&
6A_s+16A_v-7a^2-10ad_s-10ad_v-14ag+16am+19a\\
&+3d_s^2+9d_s+8d_v^2-25d_v-10g+48m+18,\\
c_3={}&12m+32a+140,\qquad c_4=32.
\end{aligned}
\]

In the support-collision case,

\[
\begin{aligned}
\frac{c_2}{2}={}&
6A_s+16A_v-7a^2-10ad_s-10ad_v-14ag+16am+25a\\
&+3d_s^2+3d_s+8d_v^2-25d_v-10g+30m,\\
c_3={}&12m+32a+92,\qquad c_4=32.
\end{aligned}
\]

The deliberately coarse lower bounds for \(c_2/2\) are

\[
\begin{array}{c|cc}
&a=0&a=1\\ \hline
\text{root collision}&98&122\\
\text{support collision}&38&68.
\end{array}
\]

For example, when \(a=0\) use
\(\min_{d\ge1}(8d^2-25d)=-18\), \(m\ge2\), and \(g\le1\).
When \(a=1\), \(g=0\), and the remaining two degree quadratics have
integer minima \((-38,2)\) in the root case and \((-38,-4)\) in the
support case.  Thus the high coefficients are strictly positive
without any global tree estimate.

## Exact first-coefficient split

Let \(W(F)\) and \(Q(F)\) denote the numbers of connected three- and
four-vertex sets in a forest.  Let \(M_x\) be the rooted wedge state
from

\[
B_x+2P_x=2M_x+3A_x+d_x.
\]

Put

\[
W_b=W(H-N_H[s]),\qquad W_u=W(H-N_H[v]).
\]

The exact leaf recurrence and the rooted three- and four-subtree
identities reduce \(c_1\), in either endpoint case, to

\[
\boxed{
c_1=L+
12Q(H)+18W(H)-8M_v-22M_s-6W_b+12W_u.
}
\tag{1}
\]

The local terms are as follows.  In each display the right side is
\(3L\).

For the root collision:

\[
\begin{aligned}
3L={}&-48A_sd_s+36A_sm+78A_s
-60A_vd_v+96A_vm+108A_v\\
&+18a^2m-165a^2-60ad_sm-126ad_s
-60ad_vm-234ad_v\\
&+36agm-294ag+48am^2+138am+177a\\
&-8d_s^3+18d_s^2m-27d_s^2+162d_sd_v
+54d_sm+233d_s\\
&-10d_v^3+48d_v^2m+120d_v^2-240d_vm+292d_v\\
&-60gm-126g+72m^2-360m+138.
\end{aligned}
\tag{2R}
\]

For the support collision:

\[
\begin{aligned}
3L={}&-48A_sd_s+36A_sm+18A_s
-60A_vd_v+96A_vm+180A_v\\
&+18a^2m-78a^2-60ad_sm-138ad_s
-60ad_vm-246ad_v\\
&+36agm-138ag+48am^2+186am+150a\\
&-8d_s^3+18d_s^2m-57d_s^2+162d_sd_v
+78d_sm+59d_s\\
&-10d_v^3+48d_v^2m+156d_v^2-312d_vm+238d_v\\
&-60gm-138g+42m^2-132m.
\end{aligned}
\tag{2S}
\]

One convenient independent check of the endpoint overlap algebra is
to evaluate the general noncollision closed formula on \(C\) and add
the following corrections (here \(n=|C|=m+1\), and all degrees and
distance-two counts in the corrections are taken in \(C\)):

\[
\begin{aligned}
R_v={}&-26+24n+16n^2-34d_v-4d_v^2-20nd_v
-28d_s-8A_v+56a,\\
R_s={}&-88+4n+6n^2-32d_v+90d_s-20d_s^2
-16nd_s-40A_s.
\end{aligned}
\]

Thus \(c_1=c_1^{\rm general}+R_v\) or
\(c_1=c_1^{\rm general}+R_s\), respectively.

## Positivity of the first coefficient

The same two rooted-wedge injections as in the noncollision theorem
give

\[
\begin{aligned}
&12Q(H)+18W(H)-8M_v-22M_s-6W_b+12W_u\\
&\qquad\ge
12\bigl(Q(H)-W(H)\bigr)+20W_u+16W_b.
\end{aligned}
\tag{3}
\]

For every tree other than \(K_{1,3}\) and \(K_{1,4}\),
\(Q(H)-W(H)\ge-1\).  The two exceptions have
\(Q(H)-W(H)=-2\).  Moreover,

\[
W(H-N_H[x])\ge
\max(0,m-d_x-2A_x-1).
\tag{4}
\]

After using (3), subtracting \(12\), and applying (4), the coefficients
of \(A_v,A_s\) are

\[
\begin{array}{c|cc}
&A_v&A_s\\ \hline
\text{root}&32m-20d_v+36&12m-16d_s+26\\
\text{support}&32m-20d_v+60&12m-16d_s+6.
\end{array}
\]

The \(A_v\) part is minimized at

\[
A_v^{(0)}=a(d_s-1)+g.
\]

For the \(A_s\) part put \(C_s\) equal to the coefficient displayed
above and \(R=m-d_s-1\).  Its lower bound is

\[
\begin{cases}
C_sA_s^{(0)}+16(R-2A_s^{(0)}),&C_s\ge32,\\
C_sR/2,&0\le C_s\le32,\\
C_sR,&C_s\le0,
\end{cases}
\qquad
A_s^{(0)}=a(d_v-1)+g.
\tag{5}
\]

There are only three distance patterns.  Put

\[
d_v=x+1,\qquad d_s=y+1,\qquad x,y,r\ge0,
\]

and write

\[
m=
\begin{cases}
x+y+r+2,&v\sim s,\\
x+y+r+3,&\operatorname{dist}(v,s)=2,\\
x+y+r+4,&\operatorname{dist}(v,s)\ge3.
\end{cases}
\tag{6}
\]

Substitution of (6) into all three branches of (5) finishes the sign
check.  In the root case, every coefficient of all nine resulting
polynomials in \(x,y,r\) is nonnegative and every constant is
positive.  In the support case, the only negative monomials are
\(rx\), and, in two far-endpoint branches, \(x\).  Combining \(rx\)
with the \(rx^2\) and \(r\) terms gives nonnegative integer
quadratics; their nine minima are

\[
240,213,246,\quad48,57,150,\quad60,141,270.
\]

The two exceptional pure-\(x\) polynomials become coefficientwise
positive after writing \(x=z+1\); their coefficient lists are

\[
(38,258,304,84),\qquad(38,276,385,147).
\]

All remaining coefficients and constants are positive.  Before the
two exceptional tree costs are applied, the resulting universal lower
bounds are \(36\) in the root case and \(14\) in the support case.
For \(K_{1,3}\) and \(K_{1,4}\), replacing \(-12\) by \(-24\) in
(3) costs exactly \(12\), leaving the still-positive bounds \(24\)
and \(2\).  Hence the lower bound for \(c_1\) is strict in every
integer degree pattern and for every \(m\ge2\).

## Independent verification

- `derive_rank3_endpoint_collision_coefficients.py` derives the
  endpoint formulas directly from the independence-count and
  residual-edge leaf recurrences.
- `certify_rank3_endpoint_collision_bundles.py` proves the exact split,
  the high-coefficient bounds, and all eighteen infinite polynomial
  sign certificates.
- `verify_rank3_endpoint_collision_coefficients.py` replays the compact
  formulas against the original five-block recurrence on every tree
  \(H\) through order eight: 4,044 marked endpoint configurations and
  20,220 coefficient checks, with zero discrepancies.  It also
  performs 400 exact \(c_1\) checks on random trees through order 100,
  again with zero discrepancies.
- The machine-readable certificates are
  `rank3_endpoint_collision_local_split_20260730.json` and
  `rank3_endpoint_collision_coefficient_replay_20260730.json`.
