# Deweighted third-convexity reduction

Date: 2026-08-02

Write the utilization in the form

\[
u_j=\frac{v_j}{n-j},\qquad d=n-j.
\]

Define

\[
a_j=d\,\Delta v_j+v_j,
\qquad
b_j=2a_j+d(d-1)\Delta^2v_j.
\]

Direct subtraction gives the exact identities

\[
\Delta u_j=\frac{a_j}{d(d-1)},
\]

\[
\Delta^2u_j=\frac{b_j}{d(d-1)(d-2)},                 \tag{1}
\]

and

\[
b_{j+1}-b_j=(d-1)(d-2)\Delta^3v_j.                  \tag{2}
\]

It follows immediately that the sign pattern of `Delta^3 v` controls
the monotonicity of `b`.  In particular, if the nonzero signs of
`Delta^3 v` are constant or have the single transition `+,-`, then `b`
is monotone or first rises and then falls.  It has no strict interior
minimum.  Therefore

\[
\boxed{S(\Delta^3v)\subseteq(+,-)
       \quad\text{and}\quad b_0,b_{\rm last}>0}
\]

imply `b_j>0` for every `j`, hence strict discrete convexity of `u` by
(1).  Here the displayed sign condition includes the one-block and
zero-block cases.  Thus the utilization theorem can alternatively be
reduced to a third-order single-peak shape theorem for the deweighted
common quotient, together with two boundary inequalities.

For the present affine kernels,

\[
v_j=(n-j)u_j
\]

is the quotient of two transforms by the same order-`n-1` coefficient
kernel:

\[
v_j=
\frac{\Psi_j((1+z)(-L))}{\Psi_j(T^2Q)},
\quad
\Psi_j(H)=\binom{n-1}{j}[z^Nw^N]
A^aT^bw^j(1+z)^{n-1-j}H.
\]

The denominator source `T^2Q` is coefficientwise positive.  This common
quotient is structurally cleaner than `u`, although the literal source
kernel still has the TP2 obstruction recorded in
`path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order_20260802.json`.

The first exact audit covers eight complete saved hard sequences, with
lengths through 241.  Every identity check passes.  Seven cases have
strictly positive third forward differences throughout; the remaining
small group case has one `+,-` transition with a four-index negative
tail.  Both endpoints of `b` are positive in every case, so the corrected
lemma certifies every utilization curvature inequality.  The certificate is
`path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity_analysis_20260802.json`.

The broader 26-case focused grid independently confirms the same
criterion in all 24 genuinely signed cases, through length 271.  Eighteen
have sign word `[+]` for `Delta^3 v`, and six have `[+,-]`; there are no
other sign words and both endpoints of `b` are positive in every case.
The two remaining records are the already-positive local group-`c`
exceptions, where utilization shape is not required.  These fields are
recorded in
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids_stress_20260802.json`.

A tempting strengthening is false uniformly.  Although `Delta^2 v` is
strictly positive and log-concave in the eight saved sequences, two
small group-`x` grid cases have a short nonpositive curvature tail, and
the bottom `(m,x,r)=(180,360,270)` ray has 41 exact log-concavity
failures.  Thus the proof target should remain the one-transition sign
pattern of `Delta^3 v`, not log-concavity or real-rootedness of the
curvature sequence.

This is a sufficient reduction, not yet a uniform proof.  Its value is
that it converts hundreds of unrelated-looking rational inequalities
into one higher-order quotient-shape statement plus two endpoints.

## Exact obstructions to short positive-source proofs

Several natural attempts to turn the common quotient into a standard
one-dimensional expectation are now excluded.

- No polynomial statistic of the positive reserve exponents with total
  degree at most five reproduces the numerator outputs in either hard
  representative.  Full-column modular ranks increase by one after the
  numerator is adjoined at every degree `0,...,5`.
- Grouping reserve atoms by total degree, either coordinate, minimum,
  maximum, or absolute coordinate difference also fails: in every case
  the grouped columns have full column rank and adjoining the numerator
  raises the rank by one.
- Signed difference has more columns than output rows and therefore
  spans by interpolation, but its naturally ordered kernel has mixed
  adjacent `2 x 2` minors (`864/186` and `808/180` positive/negative in
  the two hard cases).  It is not TP2 in either orientation.
- For the two grouped kernels whose adjacent minors do have one uniform
  sign (total degree and the `w` coordinate), adding any single
  numerator-only boundary atom still fails.  All 58 group candidates and
  all 19 bottom candidates have exact modular rank-gap certificates.

The corresponding records are
`path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation_probe_20260802.json`,
`path_isolate_p4_affine_parameter_monotonicity_deweighted_grouped_source_probe_20260802.json`,
and
`path_isolate_p4_affine_parameter_monotonicity_grouped_plus_boundary_probe_20260802.json`.

There are long literal TP2-compatible atom chains (lengths 100 and 93),
so a nontrivial positive change of source remains conceivable.  However,
the tested longest group chain is numerically infeasible for the reserve,
and the apparent 19-atom bottom fit is rigorously false: the selected
matrix has rank 19 while adjoining the reserve raises it to 20 modulo
each of three primes.  See
`path_isolate_p4_affine_parameter_monotonicity_tp2_chain_cone_probe_20260802.json`.
