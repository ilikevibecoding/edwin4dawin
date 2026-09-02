# Affine endpoint southwest-square propagation

Date: 2026-08-02

This note records an exact all-order propagation identity for the two
fixed endpoint evaluations used by the Descartes single-valley lemma.
The identity is proved.  Uniform square entry over the unbounded stable
parameter domain is not yet proved.

## Fixed endpoint polynomial

Let `lambda=p/q>0` in lowest terms and put

\[
U_\lambda=1+z+\lambda w.
\]

For any one of the ten affine parity/direction families, the exact
reaggregated endpoint polynomial, up to the already extracted common
positive factors, is

\[
U_\lambda^r\{B_\lambda+rP\},
\qquad
B_\lambda=U_\lambda L+T^2Q,
\qquad
P=T^2Q\succeq0.                                      \tag{1}
\]

Multiplying both `B_lambda` and `P` by `q` clears denominators without
changing signs.

## Reciprocal recurrence

Reciprocal reversal in the common bidegree takes `U_lambda` to the
positive integer kernel

\[
W_\lambda=pz+qw+qzw.                                  \tag{2}
\]

After the reciprocal outer factors have been included, write the scaled
polynomial at order `r` as

\[
F_r=W_\lambda^r(B^\vee_\lambda+rP^\vee).
\]

Then

\[
F_{r+1}=W_\lambda F_r+W_\lambda^{r+1}P^\vee.          \tag{3}
\]

Every coefficient of the second term is nonnegative.  The desired
diagonal coefficient becomes a fixed reciprocal target `(N,N)`,
independent of `r`.  Therefore, if every coefficient of `F_r` in the
southwest square

\[
0\le i,j\le N                                           \tag{4}
\]

is nonnegative at one order, (3) proves that the whole square remains
nonnegative at every later order.  This is an exact theorem, not a
finite-pattern inference.

## Exact finite entry evidence

At `(m,x)=(12,24)`, with `c=1` in the group package, all twenty
parity/direction/endpoint instances for

\[
\lambda=2/3,\ 3/2
\]

enter the square between orders 9 and 16.  Every earlier central value
is nonnegative.  The only zero values are the two odd-bottom-`x` values
at `r=0`; every other checked central value is strictly positive.

On the two difficult proportional rays (even group `m` and odd bottom
`x`), the entry orders are:

| `m` | group `2/3` | bottom `2/3` | group `3/2` | bottom `3/2` |
|---:|---:|---:|---:|---:|
| 3 | 1 | 2 | 2 | 3 |
| 6 | 5 | 5 | 6 | 6 |
| 12 | 12 | 12 | 14 | 14 |
| 24 | 29 | 29 | 33 | 33 |
| 48 | 66 | 65 | 75 | 74 |

There are no negative central values in any pre-entry prefix.  All entry
orders in the table are strictly below `2m`.  Thus the natural uniform
tail target is:

> For every stable parameter point and each affine family, the reciprocal
> southwest square is nonnegative at `r=2m` for both endpoints.

By (3), this single target would prove both endpoint inequalities for all
`r>=2m`.  The remaining compact range `r<2m` would still need a uniform
argument.

The same recurrence at `lambda=1` targets the desired increment directly.
On the same two difficult rays, its entry orders for `m=3,6,12,24,48`
are respectively

\[
1,5,13,30,67\quad\hbox{(group)},\qquad
2,5,13,30,66\quad\hbox{(bottom)}.
\]

All ten entries are below `2m`, and no pre-entry desired coefficient is
negative.  Therefore the cleanest current architecture is to prove the
ordinary (`lambda=1`) square uniformly at `r=2m`, settling the entire
tail `r>=2m` directly, and reserve the two-endpoint Descartes argument for
the compact range `r<2m`.  The exact direct-ray report is
`path_isolate_p4_affine_parameter_monotonicity_lambda1_southwest_rays_probe_20260802.json`.

The exact computations are replayed by
`probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry.py`
and
`probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_rays.py`,
with machine-readable reports
`path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry_probe_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_rays_probe_20260802.json`.

## Failed global strengthening

The square truncation is essential.  A first exact audit of the stronger
global parameter recurrence at `r=2m` finds thousands of negative raw
coefficients in the group families (1,366--3,612 in the tested direction
remainders).  Hence a proof must exploit the fixed southwest square; full
coefficientwise positivity of the untruncated recurrence is false.
The exact partial record is
`path_isolate_p4_affine_parameter_monotonicity_endpoint_r2m_recurrence_group0_partial_analysis_20260802.json`,
generated with the `--group0` option of
`analyze_path_isolate_p4_affine_parameter_monotonicity_endpoint_r2m_recurrence.py`.

The last-negative geometry is much smaller than the full square.  For the
direct `lambda=1` difficult rays:

* at `m=12`, the group has 24 last-layer negatives, all on the top/right
  edge or the immediately adjacent line; the bottom has 14, all exactly
  on the two edges;
* at `m=24`, the group has 28 and the bottom has 12, every one exactly on
  the top or right edge.

The worst northeast-corner offsets at `m=24` are 35 (group) and 30
(bottom).  Thus a plausible uniform `r=2m` proof splits into an interior
positivity lemma and a one-dimensional edge-polynomial inequality.  The
exact positions and values are in
`path_isolate_p4_affine_parameter_monotonicity_lambda1_boundary_layer_probe_20260802.json`.

At the proposed tail split `r=2m`, the complete top edges for the two
difficult rays were checked at `m=12,24,48`.  Every edge coefficient is
positive even after replacing the available reserve `2mP` by only `mP`:

\[
B_{\rm edge}+mP_{\rm edge}>0.                          \tag{5}
\]

The worst exact utilizations `-B/(2mP)` across the edges are approximately
`0.3536,0.3941,0.4212` in the group family and
`0.3920,0.4162,0.4270` in the bottom family.  Thus they remain below
`1/2`, with substantial exact slack.  All six complete edge sequences
are ordinarily log-concave with zero failures.  This makes (5), together
with an interior-positivity lemma, the leading uniform `r=2m` target.
The exact edge audit is
`path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_edges_analysis_20260802.json`.

The half-reserve statement is not confined to the edge.  On the complete
`r=2m` southwest squares in both difficult families at `m=12,24,48`,

\[
B+mP\succeq0\quad\hbox{throughout the square}.         \tag{6}
\]

There are zero negative coefficients.  The exact minimum is 2 in all
three group squares and 54, 102, 198 in the bottom squares, the latter
following the simple pattern `4m+6`.  Thus (6) is now the
leading uniform tail target; it leaves the second copy of `mP` as spare
reserve in the desired `B+2mP`.  See
`path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_half_square_probe_20260802.json`.

At `m=12`, the complete edge version of (6) was also checked in every one
of the ten parity/direction families.  All ten pass, all ten edge
sequences are log-concave, and the largest utilization is approximately
`0.39944`.  See
`path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_all_family_edges_analysis_20260802.json`.

There is also a parameter-induction invariant that respects the changing
square target.  Let `H(c,m,x)` denote the half-reserve reciprocal
polynomial at `r=2m`.  The target grows by 1 under `x->x+1`, by 2 under
`c->c+1`, and by 4 under `m->m+1`.  Accordingly the aligned candidate
inequalities inside the enlarged southwest square are

\[
\begin{aligned}
H(c,m,x+1)&\succeq zw\,H(c,m,x),\\
H(c+1,m,x)&\succeq (zw)^2H(c,m,x),\\
H(c,m+1,x)&\succeq (zw)^4H(c,m,x).
\end{aligned}                                           \tag{7}
\]

The corresponding global untruncated inequalities are false, but the
square-truncated inequalities (7) pass every exact test so far: all
ambient parameter directions in all ten affine families at the stable
boundary `(c,m,x)=(1,3,0)`, and all directions in the two difficult
families at `(m,x)=(12,24)`.  There are zero negative aligned-difference
coefficients in these tests.  The exact report is
`path_isolate_p4_affine_parameter_monotonicity_r2m_half_square_parameter_recurrence_probe_20260802.json`.

Thus a uniform proof of (7), together with finite boundary squares, would
prove (6) on the full stable parameter domain and close the direct tail
`r>=2m`.

## Enlarged aligned-recurrence audit and original-coordinate geometry

The finite audit of (7) has now been enlarged in three directions.  It
includes every applicable ambient parameter direction in all ten affine
families at the stable boundary, the two difficult families at
`(m,x)=(12,24)`, and the difficult far ray `(m,x)=(24,48)`.  Every aligned
square difference is nonnegative, with exact integer arithmetic and zero
failures.  The replayable artifact is
`path_isolate_p4_affine_parameter_monotonicity_r2m_half_square_parameter_recurrence_probe_20260802.json`.

In original rather than reciprocal coordinates the protected square is a
northeast quadrant.  Its lower coordinate is

\[
L=3m+5+\mathbf 1_{\{\text{original coordinate}=m\}}.       \tag{8}
\]

The aligned comparisons become `new-old` for ambient `x` and `c`, and
`new-(zw)^3 old` for ambient `m`.  A complete support audit at
`m=3,6,12` finds many negative coefficients globally but none in the
protected quadrant.  Almost every global negative crosses just one of
the two coordinate barriers; a total-degree cutoff is false.  Thus the
coordinate square is essential.  See
`path_isolate_p4_affine_parameter_monotonicity_aligned_difference_support_analysis_20260802.json`.

After the positive outer factors are removed, the three aligned
differences have finite signed cores

\[
\begin{aligned}
C_x&=A S(x+1)-S(x),\\
C_c&=A^2 S(c+1)-S(c),\\
C_m&=AT^2V^2S(m+1)-(zw)^3S(m).
\end{aligned}                                             \tag{9}
\]

This reduces a possible proof of (7) to finite-core smoothing by
`A^aT^bV^{2m}`.  The exact one-axis layer audits are in the
`aligned_core_layer_positivity` reports.

## Reflection pairing: exact success, correction, and current lemma

Expand `V^{2m}` by its `j`-layers and pair `j` with `2m-j`.  The two
binomial weights in a pair agree, and the pair kernel has the exact form

\[
[z(1+w)]^j\{(1+w)^{2m-2j}+z^{2m-2j}\}.                  \tag{10}
\]

All reflected pairs are coefficientwise nonnegative on the protected
quadrant in every boundary family at `m=3`, and in all tested difficult
families at `m=12`.  At `(m,x)=(24,48)`, however, only a short central
band fails: group/bottom `x` fail for `j=21,22,23,24`, while group/bottom
`m` fail for `j=22,23,24`; the `c` recurrence has no failing pair.  This
corrects the stronger all-pairs conjecture.  The exact reports are the
three `aligned_core_j_reflection_pairs` artifacts.

The failed central pairs can still be grouped.  It is important to use
their exact weights `binom(2m,j)`: an initial unweighted audit was only a
structural signal and is not a certificate.  The corrected weighted
central blocks at `(m,x)=(24,48)` become nonnegative at half-width 5 in
both `x` recurrences and half-width 4 in both `m` recurrences.  Since all
subsequent reflected pairs are individually nonnegative, this proves the
tested aligned differences by a central-block-plus-outer-pairs split.

The required block width is not fixed.  On the hard proportional ray the
first nonnegative cumulative half-widths are

| `m` | group `x` | bottom `x` | group `m` | bottom `m` |
|---:|---:|---:|---:|---:|
| 9 | 0 | 0 | 0 | 0 |
| 12 | 0 | 0 | 0 | 0 |
| 15 | 1 | 1 | 0 | 0 |
| 18 | 2 | 2 | 1 | 1 |
| 21 | 4 | 4 | 3 | 3 |
| 24 | 5 | 5 | 4 | 4 |
| 27 | 6 | not rerun | 5 | not rerun |

At `m=27` the simple tentative cutoff
`j<=2m/3+4` (`x`) or `j<=2m/3+5` (`m`) is false: respectively two and
five protected coefficients still fail at the predicted pair.  The
current target is therefore a uniform growing-central-block inequality,
not a fixed finite certificate or that linear cutoff formula.  Exact
weighted records are in the `aligned_core_central_blocks` artifacts.

## Second aligned `x` difference

The symbolic finite core (9) is affine in `x`.  This motivates testing
the second aligned difference.  In both difficult families it is
nonnegative throughout the protected quadrant at

\[
(m,x)=(3,0),(6,0),(12,0),(18,0),(24,0),(24,48),         \tag{11}
\]

with zero exact failures.  The raw slope is not positive: after the fixed
outer factors it still has hundreds or thousands of protected negative
coefficients.  Thus (11) is genuinely supplied by the additional
`A=(1+z)(1+w)` smoothing and not by a coefficientwise-positive slope.
The report is
`path_isolate_p4_affine_parameter_monotonicity_second_x_difference_probe_20260802.json`.

Reflection does not trivialize the second difference.  In the far group
case its reflected pairs pass for `j=0,...,19` but fail for
`j=20,...,24`, with 93 negative protected coefficients in the central
pair.  Consequently the viable second-difference lemma is again a
central-block domination statement.  The total positivity in (11)
remains useful evidence for reducing the ambient `x` induction to its
boundary, but it is not yet a proof.

## Far-`x` refutation of the half-reserve induction

The preceding half-reserve program is not uniform on the full stable
domain.  The first deliberately super-proportional audit at

\[
(m,x)=(19,76)=(19,4m)                                  \tag{12}
\]

finds that every tested aligned recurrence fails on the protected
quadrant.  The exact negative counts are 930 and 797 for the difficult
group `x,m` recurrences, and 1002 and 875 for the difficult bottom
`x,m` recurrences.  Thus (7), and hence the proposed monotone parameter
induction, is false.  The replayable direct report is
`path_isolate_p4_affine_parameter_monotonicity_full_aligned_quadrant_m19_x76_probe_20260802.json`.

The failure belongs to the spare-reserve strengthening, not yet to the
actual square required for the conjecture.  At the same point (12), the
half-reserve square `B+mP` has 869 group negatives and 951 bottom
negatives, so (6) is also false.  In contrast, the genuine full-reserve
square

\[
B+2mP                                                   \tag{13}
\]

has **zero** negative coefficients in both families.  Therefore the
direct order-propagation architecture survives, but its `r=2m` entry
must prove (13) without the spare copy of `mP` and without (7).

An exact shifted-core experiment explains why the false recurrence
looked convincing on the earlier rays.  At `(m,x)=(24,48)`, translating
`z=rho+Z,w=rho+W` makes every core coefficient nonnegative for the
uniform choice `rho=10/11`; three of the four cores admit smaller exact
thresholds.  But the certificate is nonmonotone in `x,c` and fails again
on super-proportional rays.  It is an eventual-region diagnostic, not a
uniform proof.  The shift reports are the
`shifted_core_positivity_*_probe_20260802.json` artifacts.

The corrected tail target is now:

> Prove the full-reserve reciprocal square (13) directly at `r=2m` for
> every stable parameter point; then use the already-proved order
> recurrence to propagate it to every `r>=2m`.

## Second correction: the full square is also only a bounded-ratio tool

The proposed uniform form of the corrected target is false.  At

\[
(m,x)=(12,96)=(12,8m),                                 \tag{14}
\]

the full-reserve square has 328 group negatives and 466 bottom
negatives.  The worst positions are extreme off-diagonal coefficients,
such as `(158,0)`, and require approximately `9.414 mP` and `10.010 mP`,
far more than the available `2mP`.  Thus no `r=2m` whole-square theorem
can hold on the entire stable domain.

The desired diagonal behaves completely differently.  At (14), its
full-reserve value is strictly positive in both families, its
half-reserve value is also positive, and every one of the `2m+1=25`
`j`-aggregates is positive.  The square failure is therefore purely an
off-diagonal strengthening failure and does not refute the affine
increment.

This gives the corrected role of the square method:

* on balanced rays (verified through `x=4m` in the hard cases), square
  entry plus order propagation is viable;
* on super-proportional rays, one must prove the diagonal directly.

Termwise diagonal positivity eventually holds, but its threshold is not
linear in `m`.  Exact `r=2m` audits give first tested positive
multipliers `x/m` of 4 at `m=15`, 6 at `m=24`, and 8 at `m=30`,
consistent with a scale near `x\asymp m^2/4`.  Below that threshold a
terminal negative `j`-block remains while the full total is still
positive.  Consequently the signed-block domination lemma from the main
affine note remains the uniform mechanism; whole-square and termwise
positivity are useful boundary regimes, not a complete proof by
themselves.
