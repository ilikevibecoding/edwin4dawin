# Stable path P4: affine parameter-monotonicity candidate

Date: 2026-08-01

This note records a new reduction candidate for the remaining
positive-intersection affine bridge.  The identities are exact, but the
uniform monotonicity statement is not yet proved.

## Exact setup

Put

\[
 q=zw,\qquad A=(1+z)(1+w),\qquad
 T=z(1+z)+w(1+w),\qquad V=1+z+w.
\]

For parity \(\epsilon\in\{0,1\}\), define

\[
 F_\epsilon(c,m,x;r)=
 [z^{m+r+5}w^{m+r+5}]
 A^{2c+m+x-3}T^{2m+\epsilon-4}V^r
 (B_\epsilon(c,m,x)+rP).
 \tag{1}
\]

Here \(P\) is the already-certified positive reserve kernel and is
independent of \(c,m,x,\epsilon\).  The required affine theorem is
\(F_\epsilon(c,m,x;r)\ge0\) on

\[
 c\ge1,\qquad m\ge3,\qquad x,r\ge0.
\]

## Three exact increment identities

At fixed \(r\), the \(x\)-increment is the central coefficient with the
same outer powers as (1) and finite kernels

\[
 D_x=A B_\epsilon(c,m,x+1)-B_\epsilon(c,m,x),
 \qquad R_x=(A-1)P.
 \tag{2}
\]

The \(c\)-increment has

\[
 D_c=A^2B_\epsilon(c+1,m,x)-B_\epsilon(c,m,x),
 \qquad R_c=(A^2-1)P.
 \tag{3}
\]

For the \(m\)-increment, align the old target with the new target by
multiplying the old integrand by \(q=zw\).  The kernels are

\[
 D_m=AT^2B_\epsilon(c,m+1,x)-qB_\epsilon(c,m,x),
 \qquad R_m=(AT^2-q)P.
 \tag{4}
\]

In each case the exact increment is the relevant central coefficient of

\[
 V^r(D_d+rR_d),\qquad d\in\{x,c,m\}.
 \tag{5}
\]

Every \(R_d\) is coefficientwise nonnegative.  Thus the only issue in
(5) is compensation of the signed base \(D_d\).

This reserve assertion is uniform: \(P\) has its existing positive
product certificate, while \(A-1\), \(A^2-1\), and \(AT^2-q\) are
ordinary coefficientwise-nonnegative polynomials (the coefficient of
\(q\) in \(AT^2\) is 2 before subtracting \(q\)).  Hence no parameter or
order restriction is hidden in the reserve directions.

If all three increments are nonnegative, every parameter triple reduces
coordinatewise to \((c,m,x)=(1,3,0)\).  Both parities at that base point
are already certified for every order by southwest-square entry at order
one in
`path_isolate_p4_group_affine_southwest_square_entry_rays_x0_probe_20260801.json`.
Consequently the three monotonicity lemmas would close the complete group
affine package.

## Exact hard-point evidence

`probe_path_isolate_p4_group_affine_parameter_monotonicity.py` checks 12
adversarial parameter triples, both parities, all three directions, and
orders \(0\le r\le40\).  Its certificate
`path_isolate_p4_group_affine_parameter_monotonicity_probe_20260801.json`
contains

* 72 parameter comparisons;
* 2,952 exact central-coefficient checks;
* zero negative combined increments;
* zero negative reserve increments;
* 978 negative base increments.

Thus the finite success is genuine order-dependent compensation rather
than separate positivity of the base.

Whenever a base increment is negative, define the fraction of the
available reserve that it consumes by

\[
 \rho_d=-\frac{[\mathrm{diag}]V^rD_d}
 {r[\mathrm{diag}]V^rR_d}.
 \tag{6}
\]

The largest observed fraction is

\[
 \rho_m\approx0.4751968326215884
\]

at

\[
 (\epsilon,c,m,x,r)=(1,1,16,40,26).
\]

The maxima by parity and direction are approximately

\[
\begin{array}{c|ccc}
\epsilon&x&c&m\\ \hline
0&0.461179699&0.274219848&0.461966824\\
1&0.474918936&0.286662513&0.475196833
\end{array}
\]

This suggests the stronger uniform half-reserve inequalities

\[
 [\mathrm{diag}]V^r(D_d+\tfrac12 rR_d)\ge0,
 \qquad d\in\{x,c,m\}.
 \tag{7}
\]

Equation (7) is a conjectural strengthening, not a theorem.

## Current certificate attempts

Applying the exact \(V\)-derivative integration step to (7) produces six
finite kernels.  None of the raw kernels lies in the currently
implemented global HCU or paired cone: the paired-cone failure counts are
188, 212, and 215 in both parities for the \(x,c,m\) directions.  Hence
the shortest raw global-cone proof fails even though all tested central
coefficients are positive.

The reciprocal increment has a positive-reserve propagation law.  After
aligning adjacent reciprocal targets by \(q^1,q^2,q^4\) in the
\(x,c,m\) directions, respectively, coefficientwise nonnegativity on the
fixed southwest square at one order propagates to every later order.
The dedicated finite-entry audit is
`probe_path_isolate_p4_group_affine_parameter_monotonicity_square_entry.py`.
On the same 12 hard points, both parities and all three directions, all
72 increments enter the square.  There are no reserve failures, no
pre-entry central failures, and the maximum entry order is 33.  Hence
these 72 sampled comparisons are certified for every order \(r\ge0\),
not merely through the bounded order used in the first audit.  The exact
record is
`path_isolate_p4_group_affine_parameter_monotonicity_square_entry_probe_20260801.json`.
This remains finite parameter evidence and does not by itself establish
uniform entry over unbounded parameters.

## Local double-sum structure

At the worst hard point in each parity, the exact central double sum was
aggregated separately along its two summation axes.  For the full-reserve
\(c\)-increment, every `k`-aggregate and every `j`-aggregate is
nonnegative in both parities.  The same is true even with only half the
reserve.  Thus the `c` direction may admit a direct one-axis summand
proof.

A 24-case follow-up at each hard parameter point's most demanding
recorded order refines this claim.  Twenty-two cases are nonnegative on
every `k`-aggregate and 22 on every `j`-aggregate; no case fails both
axes.  The two exceptional parameter shapes switch which axis works.
This initially suggested a two-region parameter-cone partition.  See
`path_isolate_p4_group_affine_c_monotonicity_aggregates_stress_20260802.json`.

A wider 80-case grid refutes that simple strengthening.  Six cases have
negative aggregates on both axes, first at
\((\epsilon,c,m,x,r)=(0,1,20,0,20)\).  Across the grid, 53 cases pass
both axes, 6 only the `k` axis, 15 only the `j` axis, and 6 neither.
Thus even the easier `c` direction ultimately needs a tail-domination or
larger-grouping argument; one-axis termwise positivity is not uniform.
The correction is recorded in
`path_isolate_p4_group_affine_c_monotonicity_partition_stress_20260802.json`.

The `x` and `m` directions are not termwise positive after either
aggregation.  At full reserve their `j`-aggregate sequences have one sign
transition and only 2--6 negative entries on the tested group cases;
half reserve creates substantially larger negative sets.  This supports
a one-dimensional tail-domination argument for `x,m`, while retaining
`c` as the easier separate lemma.  The exact arrays are in
`path_isolate_p4_affine_parameter_monotonicity_local_summands_20260802.json`.

A unified 104-case stress across all group and bottom monotonicity
directions finds no exception to the stronger rule: every negative
`j`-set is a terminal tail, and at most the two immediately preceding
positive aggregates absorb the complete tail.  See
`PATH_ISOLATE_P4_AFFINE_PARAMETER_MONOTONICITY_J_TAIL_CANDIDATE_2026-08-02.md`.

Far-ray correction: the terminal-tail rule is false on the full domain.
At the even group (m)-increment points ((c,m,x,r)=(1,90,180,120))
and ((1,120,240,160)), the exact sign pattern is (-,+,-), while the
total increment remains positive and every signed ultra-log-concavity
inequality holds.  The current replacement target is therefore a
two-boundary-block domination theorem, as recorded in the linked note.

Canonical-split correction: the two-boundary pattern is itself an
artifact of leaving an exact inner factor `V` inside the signed kernel.
For every group increment,

\[
D=T^3\{VL+T^2Q\},\qquad R=T^5Q,
\]

so the same increment is obtained from
`V^(r+1)L+(r+1)V^rT^2Q`.  Expanding all `r+1` copies of `V` together
restores a single terminal negative tail at the far counterexamples and
makes the three certified hard polynomials fully real-rooted with one
positive root above 1.  This exact reaggregation, rather than the old
two-boundary split, is now the leading group proof target; see the linked
unified note and
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_probe_20260802.json`.

Second far-ray correction: even the canonical split eventually regains a
small initial negative block.  At `(c,m,x,r)=(1,180,360,240)` its blocks
are `K[0:6]<0`, `K[7:72]>0`, and `K[73:241]<0`, while the total remains
positive.  The exact utilization ratio decreases to one minimum and then
increases, explaining the two crossings.  The uniform target is therefore
the single-valley/two-boundary lemma in the linked note, not a terminal
tail theorem.

## Proof target

The cleanest remaining target is either:

1. prove the half-reserve inequalities (7) directly from the exact
   double-binomial central sum; or
2. prove uniform reciprocal square entry, including all pre-entry target
   coefficients, for the three aligned increment families.

Either route would reduce the whole positive-intersection affine bridge
to the already-certified base point.  The repaired bottom-pair affine
package would still remain as a separate final obstruction.
