# Full-square reserve: realizability status

Date: 2026-07-29

## Status

The pointed full-square reserve

\[
R_T\ge \zeta^2
\tag{PFSR}
\]

remains a candidate for terminal pairs of forests.  It is not proved,
and it is not needed outside the live negative-cross branch.  No
counterexample to Erdős Problem 993 is claimed here.

Pure scalar induction cannot prove (PFSR).  There is now an exact
rational counterexample inside the two-step coefficient recurrence

\[
F=C+xD,\qquad T=F+xC
\]

that satisfies coefficientwise \(D\le C\), the curvature box, both
lower ISO reserves, and all three available smaller C12 inequalities.
At rank \(r=200\) it has

\[
\zeta=1.6486423464\ldots,\qquad
R_T=0.0956397633\ldots,
\]

and hence

\[
R_T-\zeta^2=-2.6223818231\ldots.
\]

The certificate is
`recursive_cone_pfsr_counterexample_certificate_20260729.json`.
Its coefficient windows are not known to be independence-polynomial
windows of forests.  It is a negative control, not a graph
counterexample.

## Exact tree realizability searches

`search_bouquet_pfsr_realizability.py` constructs every candidate as
an actual rooted tree.  For a bouquet root it forms the exact child
products \(C,D\), then tests \(F=C+xD,\ T=F+xC\) at every rising rank.
It also supports one additional rooted wrapping level, which contains
the star-fork construction.

The first flat run tested 34,569 exact trees through order 700.  It
found no live negative cross and no PFSR failure.  Its closest rising
cross was

\[
\frac{F_{r-1}T_k}{T_rF_r}
=0.9943247445491725.
\]

The wrapped run through order 500 tested 3,283 exact trees.  Its
closest rising cross was

\[
0.9957500103325231.
\]

Thus the finite search has approached the live boundary to within
about \(0.425\%\), but has not crossed it.

A resumed wrapped evolutionary run through order 1,000 tested another
20,812 exact rooted trees.  It found no live negative cross, PFSR
failure, or NCL failure.  Its closest rising cross was

\[
0.9977658192613237,
\]

about \(0.2234\%\) below the live boundary.  The exact search record is
`wrapped_bouquet_pfsr_resume1000_seed993207_20260729.json`.

The exact published Bautista--Ramos recurrence families are being
tested separately by `scan_pattern_wrapped_pfsr.py`.  These families
are useful because they can have several consecutive failures of
ordinary log-concavity while remaining finite trees by construction.

## Star-fork scale check

The star-fork family supplies rigorous live negative-cross examples
at astronomical finite orders.  Its PFSR margin is extremely large:
the certified \(m=60\) and \(m=100\) examples remain positive, even
though other proposed auxiliary inequalities fail.

The exact \(m=190\) replay additionally refutes the standalone
linear-minus-square absorption sublemma: its surplus is
\(-3.0001008208\ldots\times10^{58}\).  This is not a PFSR, NCL, or
C12 failure.  In the same certificate the PFSR margin is
\(+4.4128025199\ldots\times10^{59}\), while the complete NCL margin is
\(+1.5054500426\ldots\times10^{119}\).  The certificate is
`star_fork_square_absorption_counterexample_m190_20260729.json`.

A low-precision sweep at \(m=240\) initially printed a negative
reserve with values quantized to powers of two.  This was numerical
cancellation, not a mathematical failure.  Recomputing the same point
at 220 decimal digits gives

\[
\zeta=3.9467518953\ldots,\qquad
\frac{R_T}{\zeta^2}
=3.8656176276\ldots\times10^{73}.
\]

Accordingly, all floating PFSR failures from insufficient precision
are rejected unless replayed by the rational-interval verifier.

The leaf-bundle extension of the same locator found a much smaller
failure of terminal downward sign preservation at

\[
m=40,\qquad t=\left\lfloor\frac{71}{50}2^{40}\right\rfloor,\qquad
r=31\,226\,130\,228\,797.
\]

The rational-interval replay
`star_fork_downward_counterexample_m40_leaf0_20260729.json` certifies

\[
r-u=0.0339085047\ldots>0,\qquad
(r+1)-v=-0.0931684598\ldots<0.
\]

Thus a rooted tree can begin decreasing while its one-vertex terminal
extension is still increasing.  This refutes the downward
sign-preservation shortcut only.  At the same point the full C12
margin is \(+6.2452260455\ldots\times10^{13}\), the PFSR margin is
\(+6.2452260455\ldots\times10^{13}\), and the NCL margin is
\(+3.2051307661\ldots\times10^{27}\).

## What the obstruction says

The abstract failure has normalized upper ISO reserve only

\[
\frac{\mathcal R_k(T)}{T_{k-1}^2}
=\frac{R_T}{k}
\approx 4.76\times10^{-4}.
\]

By contrast:

* all 43,595 PatternBoost trees have positive ordered reserve at every
  rising rank;
* the smallest observed normalized full ISO reserve there is
  \(2.8492939140\ldots\);
* 5,000 random products of one to six PatternBoost tree polynomials
  have minimum \(2.8562156318\ldots\);
* all 15,338,720 rising-rank checks among every distinct forest
  polynomial through order 20 have minimum \(37/25\), attained by
  \(K_{1,4}\) at rank two.  This includes 1,425,505 distinct forest
  polynomials at order 20.  The exact replay is
  `forest_iso_reserve_floor_n20_20260729.json`.

These computations do not prove a reserve floor.  They show that the
abstract PFSR counterexample lies far outside the observed forest
coefficient cone.  Any proof of (PFSR), or of the weaker full NCL
package, must use forest realizability beyond local recurrence,
curvature, containment, and smaller C12 constraints.

The rank-two part of the observed floor is now a theorem.  If \(F\)
is any forest with \(i_2(F)>i_1(F)\), then

\[
\frac{i_1(F)^2+2i_2(F)^2-3i_1(F)i_3(F)}{i_1(F)^2}
\ge\frac{37}{25},
\]

with equality only for \(K_{1,4}\).  The proof uses the exact
triangle-free formula for \(i_3\), the forest bound
\(\sum_v\binom{\deg(v)}2\le\binom{|E|}2\), and concavity in the edge
count.  See `RANK2_FOREST_ISO_FLOOR_2026-07-29.md` and
`rank2_forest_iso_floor_certificate_20260729.json`.  Lifting this sharp
base reserve through the common down-link decomposition is now the
concrete arbitrary-rank task.

The sharp base calculation has a stronger component-sensitive form.
For a residual forest \(H\) of order \(h\), with \(c\) components and
\(P\) pairs of disjoint edges,

\[
M_2(H)=
\frac{c\{4h^2-3h(c+1)+4c\}}{2h^2}+\frac{3P}{h}
\ge\frac c2.
\]

Together with the exact one-down-link identity, this reduces the
elementary ISO reserve to

\[
\operatorname{Var}_\mu(A_K)
\le r-2+\mathbb E_\mu c(H_K).
\]

The component-variance inequality remains unproved for arbitrary
rank, but it survives the current exact and structured tests.  In
particular, an exact
rank-three census of every unlabeled tree through order 18 gives
204,976 rising checks, no failures, and minimum slack
\(5239/2205\).  A further 100,893 multi-hub caterpillar checks,
including orders in the hundreds, also give no failure.  The balanced
two-star family shows that replacing the local reserve by the
constant \(37/25\) fails from order 19 onward, while the
component-sensitive slack stays positive with an explicit positive
numerator.  A simpler attempt to pay separately for degree variance
is false, so any proof must preserve the covariance inside
\(A_K\).  See `COMPONENT_VARIANCE_ISO_REDUCTION_2026-07-29.md`.

The full forest case at global rank three is now a theorem.  Writing
\(z_v=2c_v/h_v\), one has \(\operatorname{Var}(z_v)\le1\), while the
remaining covariance payment reduces to a nonnegative degree-moment
polynomial.  After Cauchy--Schwarz, its lower bound is a quadratic
whose global minimum is

\[
\frac{2(N-2)(N+1)^2}{N(N+6)}\ge0,\qquad N=n-2.
\]

Consequently \(\operatorname{Var}(A_v)\le1+\mathbb E c_v\) for every
forest of order at least four.  Isolated vertices are handled by an
explicit monotonicity in the same degree-moment discriminant.  See
`RANK3_FOREST_COMPONENT_VARIANCE_2026-07-29.md` and
`rank3_forest_component_variance_certificate_20260729.json`.

The rank-three theorem is now sharp by one additional unit:

\[
\mathbb E c_v-\operatorname{Var}(h_v)
-2\operatorname{Cov}(h_v,2c_v/h_v)\ge1,
\]

so in fact \(\operatorname{Var}(A_v)\le\mathbb E c_v\).
The symbolic argument covers every forest except a finite connected
base, and all 434 exceptional trees through order 11 pass exact
integer replay.  See `RANK3_FOREST_PAYMENT_FLOOR_2026-07-29.md`.

At arbitrary rank, the same range-two split produces a sharper
denominator-free target.  For \(q=r-2\), let

\[
S=\sum_Kh_K,\quad H_j=\sum_Kh_K^j,\quad
C_0=\sum_Kc_K,\quad C_1=\sum_Kh_Kc_K.
\]

It is enough to prove

\[
(q-1)S^2-SH_3-3SC_1+H_2^2+4H_2C_0\ge0.
\]

This is equivalent to the covariance payment left after using
\(\operatorname{Var}(2c_K/h_K)\le1\).  It contains only integer
extension and component counts, and passes all 1,999,403 ranks of
every unlabeled tree through order 18, including decreasing ranks.  It is
now the concrete arbitrary-rank proof target; see
`DENOMINATOR_FREE_COMPONENT_PAYMENT_2026-07-29.md`.

A separate exact moment-DP audit adds 14,077 all-rank checks on 222
paths, stars, random Prüfer trees, and multi-hub caterpillars up to
order 100, with no failure.  The DP was cross-checked against brute
enumeration through order 10; its replay is
`denominator_free_payment_tree_dp_200_20260729.json`.

The order-18 data originally suggested the sharper floor
\(P_q\ge qS^2\), equivalently

\[
H_2^2+4H_2C_0-SH_3-3SC_1\ge S^2.
\]

That strengthening is false.  Galvin's order-239 tree \(T_{14,8}\)
has six failing ranks, with worst normalized gap
\(-0.8598823980\ldots\) at \(q=113\), while the actual
rank-budgeted payment remains positive throughout.  Hence the
one-deletion collective compatibility statement is also false in
general despite passing 97,487 exact small-order checks.

The surviving exact target has the smaller edge-survival form

\[
P_q=qS^2+B^2-CS+2SE_q
-3(q+1)SE_{q+1}-4E_q^2\ge0,
\]

where \(B=(q+1)(q+2)i_{q+2}\),
\(C=(q+1)(q+2)(q+3)i_{q+3}\), and \(E_q\) counts a marked
surviving residual edge.  This follows from an exact falling-factorial
expansion in which all wedge terms cancel.  See
`EDGE_SURVIVAL_PAYMENT_REDUCTION_2026-07-29.md`.

## Current proof target

The live negative-cross statement remains

\[
\begin{aligned}
\mathcal N={}&
2kR_T-\frac C uR_F
+k(r+2)(u-r)\left(\frac1r+\frac su\right)\\
&+\zeta\left(r+2+\frac{r^2}{u}\right)
-2k\{s\delta+\theta\zeta^2\}\ge0.
\end{aligned}
\]

The next useful dichotomy is:

1. find a finite rooted tree realizing a PFSR failure, then test the
   complete NCL and outer C12 margins exactly; or
2. prove a forest-specific reserve/variance inequality that excludes
   the very small-\(R_T/k\) regime of the abstract witness.

The second route is a realizability theorem, not another scalar
rearrangement.
