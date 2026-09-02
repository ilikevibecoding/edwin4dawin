# Utilization discrete-convexity / TP3 reduction

Date: 2026-08-02

## Exact setting

For a reaggregated affine increment write

\[
K_j=L_j+nR_j=nR_j(1-u_j),\qquad
u_j=-\frac{L_j}{nR_j},\qquad n=r+1,
\]

where the signed regime has `L_j<0` and `R_j>0`.

## Convexity lemma

Assume

\[
u_{j+1}-2u_j+u_{j-1}>0                         \tag{1}
\]

at every interior index.  Then the first differences
`u_j-u_(j-1)` are strictly increasing.  Consequently they change sign
at most once, so `u` first decreases and then increases (either portion
may be empty).  Equivalently, `u` has a single valley.

Every strict sublevel set of a convex sequence is an interval.  Since
`K_j>0` exactly when `u_j<1`, the positive coefficients of `K` form one
contiguous interval.  Thus the coefficient signs are contained in

\[
(-,+,-).                                           \tag{2}
\]

Combined with the already-proved Descartes two-endpoint lemma, (1) and
the two endpoint inequalities imply `K(1)>0`.

## Denominator-free form

Because all reserve values are positive, (1) is equivalent to

\[
-L_{j+1}R_{j-1}R_j
+2L_jR_{j-1}R_{j+1}
-L_{j-1}R_jR_{j+1}>0.                              \tag{3}
\]

It is also the consecutive `3 x 3` determinant inequality

\[
\det\begin{pmatrix}
R_{j-1}&(j-1)R_{j-1}&-L_{j-1}\\
R_j&jR_j&-L_j\\
R_{j+1}&(j+1)R_{j+1}&-L_{j+1}
\end{pmatrix}>0.                                   \tag{4}
\]

After factoring the positive product
`R_(j-1) R_j R_(j+1)`, (4) is exactly the second difference in (1).
This is the natural TP3/Chebyshev-system formulation of the remaining
shape theorem.

## Exact evidence

In the 26-case focused exact grid, 24 cases have `L_j<0` throughout and
all 24 pass every inequality (1) with exact rational arithmetic.  They
include the group two-boundary case `(c,m,x,r)=(1,180,360,240)`, where
all 239 interior inequalities are strict.  The remaining two cases are
group `c`-increments in which `L` changes sign but every `K_j` is already
positive, so the utilization shape is not needed.

The proportional-ray extensions at `m=210` and `m=240` pass in both hard
families, again with zero strict-convexity failures even though every
`K` sequence has all three sign blocks.  At `m=240` the hard group case
has sign blocks `-` on `0,...,19`, `+` on `20,...,92`, and `-` on
`93,...,321`; the hard bottom case has blocks `-` on `0,...,14`, `+` on
`15,...,114`, and `-` on `115,...,361`.  In each case the utilization
first differences decrease on an initial prefix and then increase
strictly, with no nonpositive second difference.

The next exact proportional-ray extension at `m=300` also passes both
hard families.  The group case `(m,x,r)=(300,600,400)` has sign blocks
`-` on `0,...,33`, `+` on `34,...,113`, and `-` on `114,...,401`.
The bottom case `(m,x,r)=(300,600,450)` has sign blocks `-` on
`0,...,31`, `+` on `32,...,139`, and `-` on `140,...,451`.  Both are in
the genuinely signed regime, both have strictly discrete-convex
utilization, and their weighted totals are positive at `1/2`, `2/3`,
and `3/2`.  The certificate is
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_farther_rays_m300_stress_20260802.json`.

The record is
`path_isolate_p4_affine_parameter_monotonicity_utilization_convexity_analysis_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_convexity_grid_status_analysis_20260802.json`.
The largest far-ray certificate is
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_farther_rays_m240_stress_20260802.json`.

## Relation to total positivity

Karlin's variation-diminishing theorem says that a TP3 kernel preserves
two-crossing structure.  A modern formulation for preservation of
quasi-concavity/two crossings is given by Choi and Smith,
[Ordinal Aggregation Results via Karlin's Variation Diminishing Property](https://www.lonessmith.com/wp-content/uploads/2017/05/KarlinQSArticle-1.pdf),
especially their TP3 decomposition lemma.  That theorem does not by
itself prove (4): the remaining task is to represent the three columns
`R_j`, `jR_j`, and `-L_j` through a common TP3 kernel, or prove the
consecutive minors directly from the exact binomial-product sums.
The underlying convexity-preservation theorem goes back to Karlin's
[Total Positivity and Convexity Preserving Transformations](https://statistics.stanford.edu/technical-reports/total-positivity-and-convexity-preserving-transformations)
(Stanford technical report, 1961; published in the 1963 AMS Convexity
proceedings).  Its hypotheses clarify the present obstruction: one needs
a genuinely one-dimensional TP3 kernel and a common positive reference
measure, not merely log-concavity of each atom separately.

A recent quotient formulation is Theorem 4.7 of Derbazi,
[On Preserving or Reversing Higher-Order Unimodality and Convexity by
Sign-Regular Kernels](https://arxiv.org/abs/2502.13136) (2025).  In the
ordinary convex case it gives convexity of `(Lu)/(Lv)` when `u/v` is
convex, `v` is positive, and the same one-dimensional TP3 kernel `L`
transforms both sequences.  This is almost exactly the desired abstract
shape theorem, but the ordered-source and positive-denominator
hypotheses are substantive here rather than formalities.

The useful reduction is therefore precise:

> Prove (3), uniformly for each of the ten affine
> parity/direction kernels on the stable parameter domain.

This replaces the global single-valley conjecture by one local
denominator-free inequality.

## Common-order transform

The numerator and reserve can in fact be put under the same exact
binomial-product transform in all ten families.  Put `n=r+1` and

\[
\Phi_j(H)=\binom nj[z^Nw^N]A^aT^b
             w^j(1+z)^{n-j}H.
\]

If `Q` is the reserve source and

\[
S=\frac{T^2Q}{1+z},
\]

then

\[
L_j=\Phi_j(L),\qquad nR_j=(n-j)\Phi_j(S).            \tag{5}
\]

The quotient defining `S` is polynomial in every family.  The exact
ten-case expansion verifies that `Q` is divisible by both `1+z` and
`1+w`; structurally, every reserve already contains
`A=(1+z)(1+w)`, while the removed powers of `zw` and `T` are coprime to
`A`.  The certificate is
`path_isolate_p4_affine_parameter_monotonicity_common_order_kernel_20260802.json`.

For a monomial source atom `z^p w^q` and a fixed term `k` of `T^b`, the
common kernel is a product of three binomial coefficients:

\[
\binom nj
\binom{a+b-k}{N-q-b+k-j}
\binom{a+k+n-j}{N-p-k}.                              \tag{6}
\]

Its adjacent ratio is the product of three decreasing rational factors
in `j`, so every individual atom is strictly log-concave.  This makes a
TP3/Cauchy--Binet proof of (3) plausible and is the current leading
structural route.

The literal monomial-source version of this route is now rigorously
excluded.  In the hard group case, among the 297 positive reserve atoms,
1,545 atom pairs have adjacent `2 x 2` minors of both signs as the output
row changes.  In the hard bottom case, 1,436 of the 36,046 pairs have
the same obstruction.  Reversing the order of a column pair reverses
both signs and cannot make both minors nonnegative.  Therefore **no
ordering whatsoever** of the literal positive reserve atoms makes the
common kernel TP2, hence it cannot make it TP3.  The exact first
conflicts use group atoms `(2,11),(7,10)` at row pairs `(0,1),(7,8)` and
bottom atoms `(0,9),(4,8)` at row pairs `(0,1),(4,5)`.  See
`path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order_20260802.json`.

Consequently Derbazi's quotient theorem cannot be applied directly to
the literal monomial expansion.  A successful quotient proof would
need a different one-dimensional source representation (for example,
one obtained after exact summation-by-parts or aggregation) for which
the denominator weights stay positive and the resulting kernel is TP3.

There is an important obstruction to the shortest version of that
argument.  After exact specialization in the hard group and bottom
families, `S` is coefficientwise positive, but `-L` is not: it has
216 negative source coefficients out of 348 in the group case and 166
out of 280 in the bottom case.  Their supports also differ.  Thus
`-L/Phi(S)` is not the expectation of a single positive atom statistic;
the proof must use signed variation diminution, an atom-space
summation-by-parts, or a boundary decomposition.  See
`path_isolate_p4_affine_parameter_monotonicity_common_order_atom_sources_20260802.json`.

The natural symmetric-coordinate shortcut also fails.  The hard `-L`
sources are symmetric, but rewriting them in
`A=(1+z)(1+w)` and `V=1+z+w` only reduces 348 and 280 ordinary monomials
to 187 and 144 terms; 93 and 70 coefficients are still negative.  The
symmetric reserve core `T^2Q/A` has 156 and 118 terms with 77 and 59
negative `A,V` coefficients.  Moreover the common-order reserve source
`T^2Q/(1+z)=(1+w)T^2Q/A` is necessarily asymmetric.  Aggregating `-L`
by total degree does give `(-,+,-)` in both hard cases, but several
homogeneous slices contain both signs, so this projection is not a
positive one-dimensional source decomposition.  These exact audits are
included in the same atom-source certificate.

The exceptional group-`c` family does not admit a separate raw-factor
shortcut either.  In both parities its reserve `Q` is the same,
parameter-independent, coefficientwise-positive 176-term polynomial,
while `L` is irreducible with 2,083/2,079 terms.  More decisively, after
the stable shift `m=M+3,x=X`, the leading `c^2` slice of `L` has 250
terms, 178 of them negative, with minimum `-19094` in both parities.
That slice is invariant under every translation `c=C+c0`; therefore no
fixed large-`c` threshold can ever make `L` coefficientwise
nonnegative.  See
`path_isolate_p4_affine_parameter_monotonicity_group_c_factor_structure_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_group_c_source_threshold_20260802.json`.

A complementary certified root audit reveals a rigid near-TP pattern at
the output level.  In all four saved hard cases, the reserve polynomial
has only simple negative roots.  The positive-coefficient numerator
polynomial `-sum L_j lambda^j` has exactly one nonreal conjugate pair and
all remaining roots negative.  Merging its negative roots with the
reserve roots produces perfect alternation except for exactly two
`R,R` adjacencies, never a run longer than two.  This holds at degrees
26/25, 27/26, 121/120, and 181/180.  Strict interlacing is therefore
false, but the defect is uniformly minimal and may be the root-theoretic
shadow of the convexity determinant.  See
`path_isolate_p4_affine_parameter_monotonicity_ell_reserve_root_interlacing_20260802.json`.

## Universal triple-copy curvature kernel

The cubic determinant (3) has a sharper common-kernel form.  With three
independent copies and `x_i=w_i/(1+z_i)`, put `d=n-j` and

\[
B_i=d(d+1)x_i^2(x_j+x_k)
-2(d^2-1)x_i(x_j^2+x_k^2)
+d(d-1)x_jx_k(x_j+x_k).
\]

After removing common positive binomial and monomial factors, twice the
curvature numerator is the cyclic coefficient extraction of the averaged
tensor

\[
\frac13\sum_i(-L_i)S_jS_kB_i.
\]

The three insertions satisfy the exact cancellation

\[
B_1+B_2+B_3=2\sum_{i\ne j}x_i^2x_j>0,
\]

independent of `d`: every quadratic and linear `d` term cancels.  Hence
decomposing `-L=S+E` exposes a canonical strictly positive reserve
baseline and a single cyclic error extraction involving the fixed source
mismatch `E`.  This does not yet bound that error, but it reduces the
nonlinear ratio inequality to a bounded-degree universal insertion.  See
`UTILIZATION_CURVATURE_TRIPLE_COPY_KERNEL_2026-08-02.md` and
`path_isolate_p4_affine_parameter_monotonicity_utilization_curvature_triple_kernel_20260802.json`.

The unextracted tensor is not coefficientwise positive: exact negative
coefficients occur immediately in both hard families at `d=2`.  Thus the
remaining theorem must use positivity created by the outer common
binomial-product transform; no raw six-variable coefficient cone can
finish the argument.  The counter-certificate is
`path_isolate_p4_affine_parameter_monotonicity_triple_curvature_source_coefficients_20260802.json`.

## Deweighted third-convexity alternative

There is a second exact reduction.  Write `v_j=(n-j)u_j`, `d=n-j`, and

\[
a_j=d\Delta v_j+v_j,
\qquad
b_j=2a_j+d(d-1)\Delta^2v_j.
\]

Then

\[
\Delta^2u_j=\frac{b_j}{d(d-1)(d-2)},
\qquad
\Delta b_j=(d-1)(d-2)\Delta^3v_j.
\]

Hence a one-transition sign pattern `(+,-)` for `Delta^3 v`, together
with positivity of the two endpoints of `b`, is sufficient for strict
convexity of `u`.  All 24 genuinely signed cases in the focused exact
grid satisfy this criterion; 18 have `Delta^3 v>0` throughout and six
have a single positive-to-negative transition.  See
`DEWEIGHTED_THIRD_CONVEXITY_REDUCTION_2026-08-02.md`.

The deweighted sequence has the exact common-quotient form

\[
v_j=\frac{\Psi_j((1+z)(-L))}{\Psi_j(T^2Q)},
\qquad
\Psi_j(H)=\binom{n-1}{j}[z^Nw^N]
A^aT^bw^j(1+z)^{n-1-j}H.
\]

Its denominator source is coefficientwise positive.  Nevertheless no
polynomial statistic `h(p,q)` of total degree at most five represents
the numerator outputs as `Psi(h T^2Q)` in either hard representative:
exact modular ranks give full-column-rank augmented obstructions at
every degree.  Thus a moment/covariance proof, if one exists, must use a
non-polynomial statistic or a genuine summation-by-parts representation.

Natural one-dimensional aggregations do not supply that representation.
Exact modular rank gaps exclude total degree, either coordinate,
minimum, maximum, and absolute difference.  Signed difference is
overcomplete but has mixed adjacent `2 x 2` minors, and therefore is not
TP2 in either orientation.  Adding one numerator-only boundary atom to
the two grouped bulks with uniform minor signs is also exactly excluded
for every candidate.  These obstructions leave a genuinely nonlocal
summation-by-parts/change-of-source construction, or the direct
triple-copy extraction inequality, as the viable routes.
