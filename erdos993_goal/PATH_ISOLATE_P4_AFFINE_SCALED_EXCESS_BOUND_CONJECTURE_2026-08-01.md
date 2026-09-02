# Stable path P4: scaled-excess affine reserve conjecture

Date: 2026-08-01

This note records a sharp numerical conjecture for the last affine
two-kernel obstruction. It is not yet a theorem.

## Two-kernel quantities

For either the positive-intersection package or the repaired bottom-pair
package, write the order-`r` target coefficient as

\[
  b_r+r p_r,
\]

where `b_r` is the signed affine base coefficient and `p_r` is the
coefficient of the positive reserve kernel. The required assertion is
`b_r+r p_r >= 0`.

Put

\[
  n=2m+x.
\]

The exact data support the stronger inequalities

\[
  (n+66)b_r+n r p_r\ge0
  \qquad\text{(bottom pair)},                       \tag{1}
\]

and the corrected group inequality

\[
  (n+79)b_r+n r p_r\ge0
  \qquad\text{(positive intersections)}.            \tag{2}
\]

When `b_r<0`, these are equivalent to

\[
  -\frac{b_r}{r p_r}\le\frac{n}{n+66}
\]

and

\[
  -\frac{b_r}{r p_r}\le\frac{n}{n+79},
\]

respectively. Either inequality immediately implies the required
unscaled compensation because the right-hand side is strictly below 1.

## Exact evidence

`verify_path_isolate_p4_affine_scaled_excess_bound.py` combines the
broad parameter grids and the proportional large rays. Its certificate
`path_isolate_p4_affine_scaled_excess_bound_stress_20260801.json`
contains 6,556 exact integer cases and no failure on its stratified grids:

- 2,950 bottom-pair cases for (1);
- 3,606 positive-intersection cases for (2).

The bottom-pair bound is used most heavily at

\[
  (\epsilon,m,x,r)=(1,3,12,11),
\]

where the exact utilization of the proposed bound is approximately
`0.9882548232`.

On the original stratified grid, the stronger but later falsified
constant 80 was used most heavily at

\[
  (\epsilon,c,m,x,r)=(1,1,12,24,20),
\]

where the exact utilization is approximately `0.9981256248`.
Thus the constants are tested close to equality, not merely with a large
numerical safety margin.

The constants are locally sharp on those grids. Replacing 66 by 67
creates a bottom-pair failure, and replacing 80 by 81 creates group
failures.

## Dense-scan correction

The first group constant 80 is false. A later dense audit around the
near-equality neighborhood made 5,330 additional group order checks and
found six failures, all in odd parity near

\[
(c,m,x)=(1,10,20).
\]

The worst utilization of the `C=80` bound is approximately
`1.0013871918`. The largest exact failure occurs at

\[
(\epsilon,c,m,x,r)=(1,1,10,20,18).
\]

All six failures become positive when 80 is replaced by 79. Every other
dense case that passed for 80 automatically passes for 79: if `b_r<0`,
lowering the constant increases the margin, while if `b_r>=0`, the
`C=79` expression is manifestly nonnegative. Thus the corrected current
group candidate is

\[
  (n+79)b_r+n r p_r\ge0.                              \tag{2'}
\]

It remains a finite-data conjecture and must not be cited as a theorem.
The bottom constant 66 survived 682 additional dense order checks around
its 98.8%-utilization case.

The corrected group constant 79 subsequently survived a wider exact
rectangle of 52,808 order checks:

\[
 \epsilon\in\{0,1\},\quad c=1,\quad 3\le m\le16,\quad
 0\le x\le40,\quad 0\le r\le45.
\]

There were no failures.  The new worst utilization is approximately
`0.9930679651` at

\[
 (\epsilon,c,m,x,r)=(1,1,9,21,18).
\]

This strengthens the finite evidence but does not prove (2').  See
`path_isolate_p4_group_scaled_excess_C79_wide_dense_20260801.json`.

The proportional rays

\[
  (m,x)=(30,60),(40,80),(50,100),(60,120)
\]

were checked through order 100 for the bottom pair and order 80 for the
group. The raw fraction of reserve used rises toward 1 along these rays,
so no fixed constant bound below 1 can replace (1)--(2).

## Refuted simpler bounds and certificates

The fixed `3/8` reserve bound fails for the bottom pair. The fixed `5/8`
bound also fails on the large rays. The first one-variable candidates
`m/(m+19)` and `m/(m+20)` fit the proportional rays but fail on broader
small-`m`, large-`x` grids. The scaled excess `n=2m+x` repairs both
defects.

After the direct `V`-derivative integration-by-parts step, the kernels
corresponding to (1)--(2) are neither coefficientwise nonnegative nor in
the currently implemented HCU/paired cone. The four reciprocal kernels
have 279, 279, 364, and 365 failed paired-cone layers. Therefore a proof
must use the actual central extraction or a larger cone; raw global
kernel positivity cannot certify these bounds.

## Current proof target

Expand the central coefficient of

\[
  A^aT^bV^r\bigl((n+C)B+n rP\bigr),
\]

with `C=66` or `79`, using

\[
  T^b=\sum_k\binom bk
  z^k(1+z)^k w^{b-k}(1+w)^{b-k}
\]

and the trinomial expansion of `V^r`. Since `B` and `P` have bounded
bidegree, this is a finite hypergeometric sum over explicit shifted
binomial products. The immediate objective is a creative-telescoping or
summand-pairing certificate for (1)--(2). The near equality in the group
case should be retained as a regression test for every proposed
symbolic decomposition.

## Exact central double-sum reduction

For a kernel monomial (z^p w^q), put

\[
H_{p,q}=[z^Nw^N]z^pw^qA^aT^bV^r.
\]

Expanding (T^b), then writing

\[
V^r=\sum_{j=0}^r\binom rj w^j(1+z)^{r-j},
\]

gives the exact finite identity

\[
\boxed{
H_{p,q}=\sum_{k=0}^b\sum_{j=0}^r
\binom bk\binom rj
\binom{a+b-k}{N-q-b+k-j}
\binom{a+k+r-j}{N-p-k}.}
\tag{3}
\]

The usual zero convention is used for out-of-range binomial
coefficients. Formula (3) was compared with independent bivariate
polynomial extraction for both kernels, both parities, and 32 hard
parameter/quantity cases; every exact integer comparison agrees. See
`verify_path_isolate_p4_affine_central_hypergeometric_reduction.py` and
`path_isolate_p4_affine_central_hypergeometric_reduction_20260801.json`.

## Local-summand and one-axis corrections

Neither the sharp candidate bounds nor the unscaled target are
nonnegative term by term in (3). At the near-sharp points, the local
((k,j)) array has many negative entries and up to two sign changes
along a row.

Summing one index first gives useful but nonuniform patterns. On the
large-excess group point ((c,m,x,r)=(1,12,24,20)), even parity is
nonnegative in every (k)-aggregate and odd parity in every
(j)-aggregate. These statements fail as uniform rules at zero excess.
A 12-case hard-point audit finds five failures of the parity-specific
rules. The (j)-aggregate sequences nevertheless have at most one sign
transition in all 12 cases; the failed cases have only a short negative
tail. This is evidence for a one-dimensional tail-domination lemma, not
a proof of it. The exact records are
`path_isolate_p4_affine_scaled_excess_local_summands_C0_20260801.json`
and
`path_isolate_p4_group_affine_parity_aggregates_stress_20260801.json`.

## Group j-tail stress and correction

A broader adversarial audit selected the largest-reserve-use order for
each of the 24 hardest distinct group parameter tuples in the broad and
proportional-ray records.  Every exact `C=0` j-aggregate sequence had at
most one sign transition, and every negative set was a terminal tail.
The tail is not uniformly short: its length reaches 36 at

\[
 (\epsilon,c,m,x,r)=(1,1,60,120,55).
\]

The claim that the single preceding positive aggregate always absorbs
the tail is false in three cases.  The corrected finite pattern is that
at most the two immediately preceding positive aggregates absorb the
entire negative tail.  The maximum required width was 2 in all 24 hard
cases.  This is still only finite evidence, since both the sign pattern
and the two-term tail inequality need uniform proofs.  The exact record
is
`path_isolate_p4_group_affine_j_tail_domination_stress_20260801.json`.

The resulting j-aggregate is not itself a low-degree hypergeometric
term.  A modular-rank audit proves, separately for the six longest hard
blocks (`m=40,50,60`, `x=2m`, both parities), that no identity

\[
 \frac{J_{j+1}}{J_j}=\frac{P(j)}{Q(j)}
\]

can hold on the recorded block when
`deg(P)+deg(Q) <= 20`.  Full column rank modulo one of the recorded
primes is an exact nonexistence certificate over the rationals for each
degree pair.  Thus a simple one-term Gosper recurrence is not the right
certificate for this aggregate.  See
`probe_path_isolate_p4_group_affine_j_ratio_rational.py` and
`path_isolate_p4_group_affine_j_ratio_rational_probe_20260801.json`.

A second modular-rank audit also found no compact higher-order
recurrence after aggregation.  On the same six longest blocks, every
data-supported recurrence

\[
 \sum_{h=0}^{s} P_h(j)J_{j+h}=0
\]

with `2 <= s <= 6` and the tested polynomial degrees (up to 12 when the
block length permits) has full column rank modulo a recorded prime.
Thus the currently viable routes should retain the inner `k`-sum or the
reciprocal forward-difference atoms instead of first collapsing to
`J_j`.  See
`probe_path_isolate_p4_group_affine_j_holonomic_recurrence.py` and
`path_isolate_p4_group_affine_j_holonomic_recurrence_probe_20260801.json`.

Simple linear regroupings of the full `(k,j)` array also fail.  On ten
hard points, each of the eight directions `k`, `j`, `k+j`, `k-j`,
`2k+j`, `k+2j`, `2k-j`, and `k-2j` has negative line aggregates in at
least eight cases; both negative counts and sign-transition counts grow
on the large rays.  Hence there is no evidence that a fixed small-slope
diagonal aggregation exposes termwise positivity.  The record is
`path_isolate_p4_group_affine_local_line_aggregates_probe_20260801.json`.
Allocating the exact common factor `T | gcd(B,P)` to the outer positive
power lowers the kernel degree but leaves essentially the same failures;
see
`path_isolate_p4_group_affine_common_T_local_line_aggregates_probe_20260801.json`.
The quotient does clarify the positive direction: `P/T` lies in both
the shifted HCU and paired cones in both parities.  However
`B/T+rP/T` enters neither cone for any tested `0 <= r <= 100`, so no
fixed-order global-cone entry follows from that allocation.  See
`path_isolate_p4_group_affine_common_T_quotient_cone_20260801.json`.

Weakening the scaled bound all the way to the exact `C=0` target does
not repair the direct integration cone.  After the `V` integration step,
both parities fail HCU and paired-cone audits, with 369 paired failures;
allocating the available outer `A*T` increases the count to 423.  See
`path_isolate_p4_affine_exact_C0_integration_cone_20260801.json`.

## Parameter-monotonicity reduction candidate

A later exact calculation exposes a different possible route for the
positive-intersection package.  Write its central affine value as

\[
F_\epsilon(c,m,x;r)=[z^{m+r+5}w^{m+r+5}]
A^{2c+m+x-3}T^{2m+\epsilon-4}V^r(B_\epsilon+rP).
\]

The exact increments in each of `x`, `c`, and `m` again have two-kernel
form `V^r(D_d+rR_d)`, with coefficientwise-positive reserve directions

\[
(A-1)P,\qquad (A^2-1)P,\qquad (AT^2-zw)P.
\]

On 12 hard parameter triples, both parities and all three directions,
2,952 bounded-order central checks have no negative increment.  The
largest observed reserve fraction is approximately `0.4751968326`,
suggesting that half the reserve may suffice uniformly.  A separate
reciprocal southwest-square audit certifies the same 72 parameter
comparisons for every order: all enter the propagating square, with no
pre-entry central failure and maximum entry order 33.

If these three monotonicity statements are proved uniformly, all group
affine cases reduce to `(c,m,x)=(1,3,0)`, which is already certified for
all orders.  The direct half-reserve integration kernels still fail the
raw global HCU/paired cone, so a central-sum proof or a uniform moving
square argument is required.  See
`PATH_ISOLATE_P4_GROUP_AFFINE_PARAMETER_MONOTONICITY_CANDIDATE_2026-08-01.md`.

The same reduction survives for the repaired bottom pair in the `m` and
`x` directions.  Its exact finite audit contains 1,632 nonnegative
central increments and no failure.  Unlike the group package, half the
reserve is false: the worst sampled bottom increment uses approximately
`0.5262780903` of its reserve.  The full reserve directions themselves
are now uniformly coefficientwise nonnegative after `m=3+M`, with 851
and 1,110 positive terms in the `x` and `m` directions.  A reciprocal
audit certifies all orders for 32 sampled comparisons, with zero
pre-entry central failures and maximum square-entry order 25.  See
`PATH_ISOLATE_P4_BOTTOM_PAIR_AFFINE_PARAMETER_MONOTONICITY_CANDIDATE_2026-08-01.md`.
