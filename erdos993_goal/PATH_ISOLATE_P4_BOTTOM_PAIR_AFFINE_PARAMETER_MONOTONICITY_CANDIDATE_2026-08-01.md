# Stable path P4: bottom-pair affine parameter-monotonicity candidate

Date: 2026-08-01

This note records a new finite-base reduction candidate for the repaired
bottom-pair affine bridge.  The increment identities are exact; their
uniform positivity is not yet proved.

## Exact setup and increments

For parity \(\epsilon\in\{0,1\}\), write

\[
F_\epsilon(m,x;r)=[z^{m+r+5}w^{m+r+5}]
A^{m+x-3}T^{2m+\epsilon-5}V^r(B_\epsilon(m,x)+rP_\epsilon(m)).
\tag{1}
\]

The domain is \(m\ge3\), \(x,r\ge0\).  The reserve is independent of
\(x\) and is affine in \(m\).

The exact \(x\)-increment has kernels

\[
D_x=A B_\epsilon(m,x+1)-B_\epsilon(m,x),
\qquad
R_x=(A-1)P_\epsilon(m).
\tag{2}
\]

For the \(m\)-increment, align the old central target with the new one by
multiplication by \(q=zw\).  Then

\[
D_m=AT^2B_\epsilon(m+1,x)-qB_\epsilon(m,x),
\tag{3}
\]

\[
R_m=AT^2P_\epsilon(m+1)-qP_\epsilon(m).
\tag{4}
\]

The required increments are the central coefficients of

\[
V^r(D_d+rR_d),\qquad d\in\{x,m\}.
\tag{5}
\]

The reserve directions are now uniformly certified.  After the shift
\(m=3+M\), exact ordinary expansion gives no negative coefficient in any
of the four parity/direction kernels.  The \(x\)-reserve has 851 terms
and the \(m\)-reserve has 1,110 terms in each parity; the minimum nonzero
coefficient is 3.  The exact hashes and degree audits are recorded in
`path_isolate_p4_bottom_pair_affine_parameter_monotonicity_kernels_20260801.json`.
Thus the remaining monotonicity obligation is entirely the central
compensation of the signed bases \(D_x,D_m\).

If both are uniformly nonnegative, every bottom-pair affine case reduces
to \((m,x)=(3,0)\).  That base point is already certified for every order
by the reciprocal southwest-square propagation theorem.

## Exact finite evidence

`probe_path_isolate_p4_bottom_pair_affine_parameter_monotonicity.py`
checks eight hard parameter pairs, both parities, both directions, and
orders \(0\le r\le50\).  Its exact record
`path_isolate_p4_bottom_pair_affine_parameter_monotonicity_probe_20260801.json`
contains

* 32 parameter comparisons;
* 1,632 central-coefficient checks;
* zero negative combined increments;
* zero negative reserve increments;
* 902 negative base increments.

The signed base is frequently negative, so this again requires genuine
order-dependent compensation.

The largest observed fraction of the reserve used is

\[
0.5262780902640639
\]

at

\[
(\epsilon,m,x,r,d)=(1,20,40,26,x).
\]

This value is greater than \(1/2\).  Therefore the half-reserve
strengthening suggested by the positive-intersection group data is
already false for the bottom pair and must not be used here.  The actual
full-reserve monotonicity statement remains consistent with every test.

The maxima by parity and direction are approximately

\[
\begin{array}{c|cc}
\epsilon&x&m\\ \hline
0&0.515328956&0.511750104\\
1&0.526278090&0.522276422
\end{array}
\]

## Reciprocal all-order audit

The reciprocal targets shift by one under \(x\mapsto x+1\) and by four
under \(m\mapsto m+1\).  Aligning the old full polynomial by \(q\) or
\(q^4\), respectively, produces a fixed southwest square and a positive
reserve propagation law.  The audit
`probe_path_isolate_p4_bottom_pair_affine_parameter_monotonicity_square_entry.py`
tests square entry and every pre-entry central coefficient.  All 32
sampled parity/direction comparisons enter the square, with zero reserve
failures, zero pre-entry central failures, and maximum entry order 25.
Thus these sampled comparisons are certified for every order \(r\ge0\).
The exact record is
`path_isolate_p4_bottom_pair_affine_parameter_monotonicity_square_entry_probe_20260801.json`.
This remains finite parameter evidence; a uniform moving-boundary theorem
is still required.

At the current worst point, summing the exact double-binomial array over
one index leaves a one-sign-transition `j` sequence with 9 or 10 negative
aggregates, depending on parity/direction.  Thus simple termwise
positivity fails, but the remaining obstruction is again a
one-dimensional terminal-tail domination inequality.  See
`path_isolate_p4_affine_parameter_monotonicity_local_summands_20260802.json`.

The same pattern survives a unified 104-case group/bottom stress: every
negative `j`-set is terminal, and at most two preceding positive terms
absorb it.  The uniform candidate lemma is stated in
`PATH_ISOLATE_P4_AFFINE_PARAMETER_MONOTONICITY_J_TAIL_CANDIDATE_2026-08-02.md`.

Far-ray correction: this terminal-tail statement is finite-range only.
The odd bottom (x)-increment at ((m,x,r)=(120,240,180)) has exact sign
pattern (-,+,-), not (+,-), although its full total remains positive
and every signed ultra-log-concavity inequality still holds.  The linked
note replaces the false terminal lemma by a two-boundary-block target.

Canonical-split correction: the two-boundary pattern disappears after
using the exact factorization

\[
D=(zw)^2T^3\{VL+T^2Q\},\qquad R=(zw)^2T^5Q.
\]

The increment is therefore reaggregated as
`V^(r+1)L+(r+1)V^rT^2Q`.  At the local hard point and the far
`(m,x,r)=(120,240,180)` counterexample to the old split, the resulting
sequence again has one terminal negative tail and its polynomial is fully
real-rooted with exactly one positive root above 1.  The reaggregated
one-tail statement is now the leading bottom-pair target; see the unified
note and
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_probe_20260802.json`.

## Consequence if proved

Together, the group and bottom-pair monotonicity packages would replace
both remaining affine inequalities by two already-certified base points:

\[
(c,m,x)=(1,3,0)
\quad\hbox{and}\quad
(m,x)=(3,0).
\]

That would complete the affine part of the stable-P4 argument and allow
the protected-induction assembly to resume.
