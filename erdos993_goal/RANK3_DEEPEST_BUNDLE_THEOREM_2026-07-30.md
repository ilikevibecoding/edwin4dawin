# Rank-three deepest-bundle theorem

Date: 2026-07-30

## Statement

Let \(C\) be a tree of order \(n\), let \(v,s\) be distinct protected
vertices, and let \(t\notin\{v,s\}\) be a leaf outside the
\(v\)-\(s\) path.  Write \(p\) for the parent of \(t\), and assume
\(p\notin\{v,s\}\).  Let \(C_d\) be obtained from \(C\) by attaching
\(d\) new leaf children to \(t\).  In the normalization of
`recursive_blocks_fast(...,q=3,subtract_lower=False)`, put

\[
T_C(d)=\sum_{\rm five\ blocks}
   \bigl(d_3(C_d+z_s,v)-d_3(C_d,v)\bigr).
\]

Then \(T_C(d)\) has degree four in the binomial basis:

\[
T_C(d)=\sum_{j=0}^4 c_j(C;v,s,t)\binom dj .
\]

For every core order \(n\ge6\),

\[
\boxed{c_1\ge0,\qquad c_2>0,\qquad c_3>0,\qquad c_4=32.}
\]

More precisely,

\[
c_3=12n+32\,1_{v\sim s}+92
\]

and \(c_2\) is twice

\[
\begin{aligned}
{}&6A_s+16A_v-7a^2-10ad_s-10ad_v-14ag+16an+23a\\
&\quad-20b-16c+4d_p+3d_s^2+9d_s+8d_v^2-25d_v\\
&\quad-10g+26n-24 ,
\end{aligned}
\]

where

\[
\begin{gathered}
a=1_{v\sim s},\quad b=1_{v\sim p},\quad
c=1_{s\sim p},\quad g=1_{\operatorname{dist}(v,s)=2},\\
A_x=\sum_{y\sim x}(d_y-1).
\end{gathered}
\]

The elementary lower bounds for the displayed half of \(c_2\) are
\(32\) when \(a=0\) and \(108\) when \(a=1\).

Consequently,

\[
\boxed{T_C(d)\ge T_C(0)\quad(d\ge0,\ n\ge6).}
\]

This is the exact bundle-pruning inequality needed at the
rank-three boundary.

## Exact formula for \(c_1\)

The first coefficient is independently replayed from the original
five-block recurrence by
`prove_rank3_deepest_bundle_first_coefficient.py`.  The following
notation gives its closed form.

Let

\[
\begin{gathered}
a=1_{\operatorname{dist}(v,s)=1},\quad
g=1_{\operatorname{dist}(v,s)=2},\\
b=1_{\operatorname{dist}(v,p)=1},\quad
h=1_{\operatorname{dist}(v,p)=2},\\
c=1_{\operatorname{dist}(s,p)=1},\quad
k=1_{\operatorname{dist}(s,p)=2}.
\end{gathered}
\]

Put \(L=C-t\), let \(W(F)\) be the number of wedges of a forest \(F\),
let \(Q(F)\) be its number of connected four-vertex sets, and write
\(D(F)=Q(F)-W(F)\).  Also put

\[
\begin{aligned}
B_s&=\sum_{y\sim s}d_y^2,\\
P_s^L&=\sum_{\substack{y\sim_Ls\\z\sim_Ly,\ z\ne s}}d_L(z),\\
W_b&=W(L-N_L[s]),\\
W_u&=W(C-N_C[v]-t),\\
D_v&=D(C-\{v,t\}),\qquad D_s=D(C-\{s,t\}).
\end{aligned}
\]

Then

\[
\begin{aligned}
c_1={}&
32A_p+24A_sd_s+12A_sn-133A_s
-12A_vd_v+32A_vn+4A_v\\
&+9B_s+18P_s^L-36Q(C)+8D_v+40D_s\\
&+66W(C)-6W_b+12W_u\\
&+6a^2n-55a^2-20ad_sn-6ad_s-20ad_vn-42ad_v\\
&+12agn-104ag+16an^2+38an+11a\\
&+23b^2-20bd_p-8bd_v+46bh-20bn+15b\\
&-6c^2-34cd_p-40cd_s-6ck-16cn+162c\\
&+16d_p^2+12d_pn-108d_p\\
&+4d_s^3+6d_s^2n-55d_s^2+54d_sd_v+18d_sn+58d_s\\
&-2d_v^3+16d_v^2n+28d_v^2-104d_vn+168d_v\\
&-20gn-6g-20h-16k+8n^2-96n+152.
\end{aligned}
\]

The terms \(D_v,D_s\), rather than bare four-subtree counts, are
important.  An independent replay caught and corrected precisely
this transcription point.

## Structural reduction for \(n\ge18\)

In \(L=C-t\), define

\[
A_x=\sum_{y\sim_Lx}(d_L(y)-1),\qquad
B_x=\sum_{y\sim_Lx}d_L(y)^2,
\]

and

\[
P_x=\sum_{\substack{y\sim_Lx\\z\sim_Ly,\ z\ne x}}d_L(z).
\]

If \(M_x\) is the rooted wedge family consisting of wedges centered
at a neighbor of \(x\), together with wedges centered at distance two
that use the inward edge, then

\[
B_x+2P_x=2M_x+3A_x+d_x.
\]

The exact formula above and the rooted three- and four-subtree
identities split as

\[
c_1=\mathcal L+
12Q(L)+18W(L)-8M_v-22M_s-6W_b+12W_u ,
\]

where \(\mathcal L\) is the explicit local polynomial recorded and
symbolically re-derived in
`certify_rank3_first_coefficient_large_order.py`.

The rooted wedge families are disjoint from the corresponding
outside wedges:

\[
M_v+W_u\le W(L),\qquad M_s+W_b\le W(L).
\]

Hence

\[
c_1\ge
\mathcal L+12\{Q(L)-W(L)\}+20W_u+16W_b.
\]

Two elementary forest facts finish the structural part.

First, for every tree \(H\) of order at least six,

\[
Q(H)-W(H)\ge-1.
\]

Indeed, if a diameter endpoint is deleted and its parent has degree
\(d\), with its possible nonleaf neighbor of degree \(e\), then

\[
\Delta(Q-W)=\frac{(d-1)(d-4)}2+e-1\ge0
\]

unless the tree is a star.  Directly, the only trees with
\(Q-W=-2\) are \(K_{1,3}\) and \(K_{1,4}\); all larger trees therefore
have defect at least \(-1\).

Second, \(L-N[x]\) has

\[
r=n-d_x-2,\qquad e=n-d_x-A_x-2.
\]

Every forest with \(r\) vertices and \(e\) edges has at least
\(\max(0,2e-r)\) wedges.  Thus

\[
W(L-N[x])\ge\max(0,n-d_x-2A_x-2).
\]

Substitution leaves three polynomial branches, according as

\[
C_s=12n-16d_s+14
\]

is at least \(32\), between \(0\) and \(32\), or at most \(0\).
All possible triples \(v,s,p\) give exactly twenty truncated distance
patterns.  Exact forward-difference reduction checks:

- 60 parent-degree monotonicity inequalities;
- 3 root-difference growth identities;
- 60 root monotonicity inequalities;
- 504 lower-branch support endpoints;
- 56 lower-branch order differences and 56 terminal values;
- 896 middle-branch residue values;
- 896 upper-branch support endpoints and 448 residue values.

Every shifted polynomial has nonnegative coefficients.  The smallest
relaxed value is

\[
94
\]

at \(n=18\), pattern `000000`,
\((d_v,d_s,d_p)=(3,1,2)\).

## Finite range

The corrected bit-mask census checks every nonisomorphic tree and
every valid marked quadruple through order seventeen:

| \(n\) | trees | marked quadruples | minimum \(c_1\) |
|---:|---:|---:|---:|
| 6 | 6 | 252 | 4 |
| 7 | 11 | 860 | 24 |
| 8 | 23 | 3,030 | 32 |
| 9 | 47 | 9,492 | 72 |
| 10 | 106 | 31,136 | 112 |
| 11 | 235 | 95,976 | 168 |
| 12 | 551 | 302,850 | 240 |
| 13 | 1,301 | 935,000 | 328 |
| 14 | 3,159 | 2,904,924 | 420 |
| 15 | 7,741 | 8,932,248 | 516 |
| 16 | 19,320 | 27,530,048 | 628 |
| 17 | 48,629 | 84,369,810 | 756 |

Total: 81,129 trees and 125,115,626 marked quadruples, with zero
failures.  The optimized evaluator is separately compared with the
closed formula on 4,206 configurations, and the closed formula is
separately compared with the original recurrence on the same corpus.

## Executable certificates

- `derive_rank3_deepest_bundle_coefficients.py`
- `rank3_deepest_bundle_high_coefficients_20260729.json`
- `prove_rank3_deepest_bundle_first_coefficient.py`
- `rank3_deepest_bundle_first_coefficient_20260730.json`
- `certify_rank3_first_coefficient_large_order.py`
- `rank3_first_coefficient_large_order_20260730.json`

This theorem settles all nonconstant binomial coefficients of the
rank-three deepest bundle.  It does not, by itself, settle the full
Erdős conjecture: the remaining proof program must still close the
terminal caterpillar/ordinary-leaf step at rank three and the four
\(q\ge4\) local recurrences.
