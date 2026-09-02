# Stable path P4: unified affine monotonicity j-tail candidate

Date: 2026-08-02

This note isolates one common one-dimensional lemma that would prove all
remaining parameter-monotonicity increments in the group and repaired
bottom-pair affine packages.  The reduction and finite sums are exact;
the uniform sign and domination statements are not yet proved.

## Exact j-aggregation

Every monotonicity increment has the form

\[
[z^Nw^N]A^aT^bV^r(D+rR),                              \tag{1}
\]

where \(R\) is coefficientwise nonnegative and \(D\) is a bounded signed
kernel.  Expand

\[
V^r=\sum_{j=0}^r\binom rj w^j(1+z)^{r-j}.              \tag{2}
\]

Let \(J_j\) be the complete contribution of the term indexed by \(j\)
after also summing the exact \(T^b\) expansion.  Equivalently,

\[
J_j=\binom rj[z^Nw^N]
A^aT^b w^j(1+z)^{r-j}(D+rR),                           \tag{3}
\]

and the desired increment is

\[
\sum_{j=0}^r J_j.                                      \tag{4}
\]

Formula (3) is the one-axis aggregation of the previously validated
double-binomial central sum.

## Uniform candidate lemma

**Far-ray correction.**  The terminal-tail statement in this section is
false on the unbounded parameter domain.  It remains below as the exact
finite-range pattern that led to the stronger signed-Newton target later
in this note.  At

\[
(\epsilon,c,m,x,r,d)=(0,1,90,180,120,m)
\]

and again at ((0,1,120,240,160,m)), the group increment has sign pattern
(-,+,-), not (+,-).  The bottom (x)-increment also changes to this
two-transition pattern by ((\epsilon,m,x,r)=(1,120,240,180)).  All three
full increments are nevertheless strictly positive.

For each of the following increment families, in both parities and on
its full stable parameter domain:

\[
\text{group }x,c,m,qquad \text{bottom pair }x,m,
\]

the sequence \((J_0,\ldots,J_r)\) should satisfy:

1. it has at most one nonzero sign transition;
2. if any terms are negative, they form one contiguous terminal tail
   \(J_s,\ldots,J_r\);
3. that tail is absorbed by the two immediately preceding terms:

\[
J_{s-2}+J_{s-1}+\sum_{j=s}^rJ_j\ge0,                  \tag{5}
\]

with missing predecessor terms omitted.

All terms before \(s-2\) are then nonnegative, so (5) proves (4).

## Exact finite evidence

`stress_path_isolate_p4_affine_parameter_monotonicity_j_tail.py`
selects the largest recorded reserve-use order at each hard parameter
comparison (and a fixed interior order when the signed base never becomes
negative).  It covers

* 72 group comparisons: both parities, three directions, 12 hard points;
* 32 bottom-pair comparisons: both parities, two directions, eight hard
  points.

The exact result is:

* 104 cases;
* zero sign-pattern failures;
* zero nonterminal negative sets;
* maximum negative-tail length 10;
* maximum number of preceding terms needed 2.

The domination has substantial slack on this first finite grid.  The
largest ratio of two consecutive absolute tail terms is approximately
`0.3843486806`, and the largest total-tail-debt divided by the
two-predecessor sum is only approximately `0.0093625723`.  The first of
these observations does not persist on larger rays, as recorded below;
it must not be promoted to a uniform geometric-tail claim.

The machine-readable record is
`path_isolate_p4_affine_parameter_monotonicity_j_tail_stress_20260802.json`.
This is finite exact evidence, not a proof for unbounded parameters or
orders.

## Eventual reserve-utilization monotonicity

The half-reserve and full-reserve local audits separate each aggregated
layer exactly.  If

\[
H_j=2D_j+rR_j,\qquad F_j=D_j+rR_j,
\]

then (D_j=H_j-F_j) and (rR_j=2F_j-H_j).  Thus the exact reserve
utilization is

\[
u_j=-\frac{D_j}{rR_j}
\]

whenever (rR_j>0).  Global monotonicity of (u_j) is false.  In every
one of the eight first hard local cases with an actual negative
full-reserve tail, (u_j) is nondecreasing from (j=s-2) through (j=r),
where (s) is the first negative index.  The two remaining local cases
are group (c)-increments with no negative tail.  Larger proportional
rays later refute even this eventual version in four group (c)-cases,
so no monotone-likelihood-ratio statement is part of the current lemma.

The expanded exact local record, including half-reserve bottom-pair data,
is
`path_isolate_p4_affine_parameter_monotonicity_local_summands_20260802.json`.

## Exact common factor and failed short cone

All group increment kernels have a common factor (T^3), while all
bottom-pair increment kernels have a common factor ((zw)^2T^3).  After
extracting these factors the central form can be written at lower kernel
degree; schematically the affine integrand is

\[
T^3\{V^{r+1}L+(r+1)V^rT^2Q\}.
\]

This exposes the reserve as the derivative-like ((r+1)V^r) term and may
be useful for a tail pairing or summation-by-parts proof.  It does not by
itself give a certificate: the shortest tested HCU and paired reciprocal
cones fail for every reduced increment kernel.  In the group package the
paired-cone failure counts range from 161 to 189, and in the bottom pair
from 146 to 167.  The exact audit is
`path_isolate_p4_affine_parameter_monotonicity_reduced_integration_cone_20260802.json`.
Consequently that particular cone route is closed; any proof using the
common factor needs a larger cone or a direct one-dimensional pairing.

## Exact V-reaggregation and its delayed boundary defect

The common-factor identity has a stronger consequence than the original
`j`-split exposes.  In every one of the ten parity/direction kernels there
are exact polynomials `L,Q` and a common factor `C` (`C=T^3` for the group
package and `C=(zw)^2T^3` for the bottom package) such that

\[
D=C\{VL+T^2Q\},\qquad R=CT^2Q.
\]

Therefore

\[
V^r(D+rR)=C\{V^{r+1}L+(r+1)V^rT^2Q\}.                \tag{6}
\]

Instead of treating the inner copy of `V` as part of the signed kernel,
expand it together with the outer `V^r`.  This gives a new exact sequence
`K_0,...,K_{r+1}` whose sum is the same increment.  The reserve term is
now the derivative-like contribution `(r+1)V^rT^2Q`.

The first exact probe checks both difficult local points and all three
far-ray points that refuted the old terminal-tail claim.  In those five
cases the reaggregated sequence has sign pattern `(+,-)`, satisfies every
signed ultra-log-concavity inequality, is fully real-rooted, and has
exactly one positive root, which lies strictly above 1.  In particular:

* group `(m,x,r)=(90,180,120)`: degree 121, 120 negative roots and one
  positive root above 1;
* group `(120,240,160)`: degree 161, 160 negative roots and one positive
  root above 1;
* bottom `(120,240,180)`: degree 181, 180 negative roots and one positive
  root above 1.

The exact identity and first root certificates are replayed by
`probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v.py`
and recorded in
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_probe_20260802.json`.

**Further far-ray correction.**  Reaggregation restores one-tail geometry
through all tests up to `m=150`, but not uniformly.  At the even group
`m`-increment

\[
(c,m,x,r)=(1,180,360,240)
\]

the reaggregated degree-241 sequence has exact blocks

\[
K_0,\ldots,K_6<0;\qquad K_7,\ldots,K_{72}>0;\qquad
K_{73},\ldots,K_{241}<0.                              \tag{7}
\]

The full increment is still strictly positive.  Thus reaggregation
postpones and substantially shrinks the initial defect, but does not
remove the two-boundary phenomenon on the unbounded domain.

The expanded 26-case exact audit includes one hard representative of
every parity/direction family, all ten directions at `(m,x,r)=(60,120,90)`,
the first refuting rays at `m=120`, and the two worst rays at `m=150,180`.
Every full increment is positive.  Every genuinely signed case has
`L_j<0`, `R_j>0`, and satisfies every signed ultra-log-concavity
inequality.  Write

\[
u_j=-\frac{L_j}{(r+1)R_j},\qquad K_j=(r+1)R_j(1-u_j).  \tag{8}
\]

In every signed case, the decreases of `u_j` form one initial prefix and
all later steps are nondecreasing.  Hence `u` has a single valley.  Before
`m=180`, `u_0<1` and this gives the observed `(+,-)` pattern.  At (7),
`u_0>1`, `u` decreases through index 45 to a value below 1, and then
increases; this gives exactly `(-,+,-)`.  The two boundary debts in (7)
are only approximately `1.82136e-5` of the positive middle block.

Certified Arb isolation shows that the polynomial in (7) is fully
real-rooted, with 239 negative roots and positive roots near
`0.08635871682` and `1.73909007659`.  Thus the positive roots again
straddle 1.  The exact blocks, complete coefficient arrays, utilization
ratios, and root balls are recorded in
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_far_refutation_probe_20260802.json`.
The 26-case audit is
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids_stress_20260802.json`.

The leading uniform shape target is therefore a **single-valley
utilization lemma**: prove (8) is first nonincreasing and then
nondecreasing, hence has sign pattern contained in `(-,+,-)`.  The
reaggregation remains useful because it exposes this clean ratio
geometry, not because it eliminates the first boundary forever.  The
initial proposal to prove a direct positive-middle/boundary-debt
comparison has now been superseded by the two-endpoint lemma below.

A farther exact proportional-ray stress takes the two first-refuting
directions to `m=210,240,300`, with `x=2m`, `r=4m/3` for the even group
`m`-increment and `r=3m/2` for the odd bottom `x`-increment.  All six
cases have exactly the predicted single utilization valley, at most the
three blocks `(-,+,-)`, no signed ultra-log-concavity failure, and a
strictly positive full increment.  The largest combined negative-boundary
mass divided by the positive-middle mass is approximately
`1.51688924e-5`; all six weighted totals at `y=1/2`, `2/3`, and `3/2`
are also positive.
At `m=300` the group and bottom sequences contain respectively 322 and
344 negative terms, so this is not a small-tail effect.  The replayable
exact record is
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_farther_rays_stress_20260802.json`.

There is an unconditional elementary way to turn the shape information
into the desired value at `y=1`.  Fix any `0<a<1<b`.  If a real polynomial has its positive
coefficients in one contiguous interval, its coefficient signs are
contained in `(-,+,-)` and Descartes' rule gives at most two positive
zeros.  If both `K(a)` and `K(b)` are positive but `K(1)` is not, the
intermediate value theorem forces too many positive zeros: two already
contradict a one-transition pattern, while a genuine `(-,+,-)` pattern
also has forced exterior zeros below `a` and above `b`, giving at
least three or four.  Therefore

\[
K(a)>0,\quad K(b)>0,\quad\hbox{single-valley utilization}
\quad\Longrightarrow\quad K(1)>0.                    \tag{9}
\]

The complete proof, including the zero-at-1 case counted with
multiplicity, is in
`DESCARTES_SINGLE_VALLEY_TWO_ENDPOINT_LEMMA_2026-08-02.md`.  This removes
real-rootedness, signed ultra-log-concavity, and direct boundary-mass
domination from the logical requirements.  The affine package is now
reduced to proving the single-valley statement and two fixed endpoint
inequalities uniformly.  The pairs `(1/2,3/2)` and `(2/3,3/2)` are being
audited; the reciprocal second pair may be algebraically preferable.

The reciprocal pair `(2/3,3/2)` also admits an exact fixed-parameter
all-order certificate.  For `U_lambda=1+z+lambda*w`, reciprocal reversal
replaces `U_lambda` by a positive kernel `W_lambda` and makes the moving
diagonal target a fixed southwest square.  The order recurrence is

\[
F_{r+1}=W_\lambda F_r+W_\lambda^{r+1}P,
\]

with `P` coefficientwise nonnegative.  Hence entry into the nonnegative
square propagates forever.  At the common local point `(m,x)=(12,24)`,
all twenty parity/direction/endpoint cases enter between orders 9 and 16;
there are no negative pre-entry central values and only two trivial zero
values, both at `r=0` in the odd bottom `x`-family.  Thus every `r` is
certified at those parameter points.  The exact report is
`path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry_probe_20260802.json`.
This is not yet uniform in the unbounded parameters: the observed entry
threshold grows with `m`, so a second parameter argument is still needed.
On the two difficult rays at `m=3,6,12,24,48`, all twenty endpoint cases
enter strictly before `r=2m`; the maximum entry is 75 at `m=48`, with no
negative pre-entry central values.  This isolates the next endpoint tail
target: prove the fixed reciprocal square nonnegative at `r=2m`
uniformly, after which propagation handles all `r>=2m`.  The exact ray
report is
`path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_rays_probe_20260802.json`,
and the derivation is summarized in
`ENDPOINT_SOUTHWEST_SQUARE_PROPAGATION_2026-08-02.md`.
At `lambda=1`, the two difficult rays enter at orders
`1,5,13,30,67` (group) and `2,5,13,30,66` (bottom) for
`m=3,6,12,24,48`.  Every entry is below `2m`, with no negative
pre-entry desired coefficient.  Thus the preferred split is now direct
ordinary-square propagation for `r>=2m`, and the Descartes
single-valley/two-endpoint mechanism only for `r<2m`.  See
`path_isolate_p4_affine_parameter_monotonicity_lambda1_southwest_rays_probe_20260802.json`.
Immediately before direct entry at `m=12,24`, all last negative square
coefficients lie on the top/right edge or, in one `m=12` group layer, the
adjacent line.  At `m=24` there are only 28 group and 12 bottom negatives,
all exactly on the edges.  This reduces the proposed uniform `r=2m`
tail theorem to an interior lemma plus a one-dimensional edge inequality;
see
`path_isolate_p4_affine_parameter_monotonicity_lambda1_boundary_layer_probe_20260802.json`.
At `r=2m`, the complete difficult-ray edges at `m=12,24,48` are already
positive with only half of the available reserve:
`B_edge+m P_edge>0`.  The worst utilization rises from about `0.354` to
`0.421` in the group family and from `0.392` to `0.427` in the bottom
family, remaining below `1/2`; all six edge sequences are log-concave.
See
`path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_edges_analysis_20260802.json`.
More strongly, the entire difficult-family southwest squares at
`m=12,24,48` satisfy `B+mP>=0` at `r=2m`, with zero negative coefficients;
the exact group minimum is always 2, while the bottom minima are
`54,102,198=4m+6`.  This half-reserve square
inequality is now the leading uniform tail target.  At `m=12`, all ten
affine families also pass the complete half-reserve edge test, with worst
utilization about `0.39944`.  See
`path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_half_square_probe_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_all_family_edges_analysis_20260802.json`.
The changing reciprocal targets also expose a viable parameter induction
for the half-reserve square: compare the new square with the old one
shifted by `zw`, `(zw)^2`, or `(zw)^4` under `x`, `c`, or `m` elevation.
Every such aligned truncated difference is nonnegative in all ten affine
families at `(c,m,x)=(1,3,0)` and in every direction of the two difficult
families at `(m,x)=(12,24)`.  The global untruncated differences are
false; square alignment and truncation are essential.  See
`path_isolate_p4_affine_parameter_monotonicity_r2m_half_square_parameter_recurrence_probe_20260802.json`.

There is also an exact Euler-transfer reformulation.  Since the reserve
has the factor

\[
T^2Q=(z+w)S
\]

and `E=z d/dz+w d/dw` satisfies
`E(V^(r+1))=(r+1)(z+w)V^r`, diagonal integration by parts gives

\[
[z^Nw^N]F E(G)=[z^Nw^N](2NF-E(F))G.
\]

Consequently the complete reaggregated increment is exactly

\[
[z^Nw^N]A^{a-1}T^{b-1}V^{r+1}H,
\]

where

\[
H=ATL+2NATS-aT E(A)S-bA E(T)S-AT E(S).              \tag{10}
\]

This does not by itself close the proof.  Every one of the ten local
parity/direction representatives has negative ordinary coefficients in
`H` (between 201 and 342 in the first audit).  All thirteen tested
reciprocal HCU/paired-cone instances fail: the HCU failure counts range
from 92 to 170 and the paired-cone failure counts from 17 to 23.  The two
farther-ray representatives also retain hundreds of negative monomials.
Thus (10) is an exact alternative reduction, but raw coefficient positivity
and the already implemented short central cones are not its certificate.
See
`path_isolate_p4_affine_parameter_monotonicity_euler_transfer_probe_20260802.json`.

At the first refuting point (7), the exact cross-determinants controlling
the direction of (8),

\[
\Delta_j=L_{j+1}R_j-L_jR_{j+1},
\]

are positive for `0<=j<=44` and negative for `45<=j<=239`, with no zero
or extra transition.  Their signed ultra-log-concavity inequalities also
all hold.  The determinant polynomial is not fully real-rooted (it has 12
nonreal roots), and it has no recurrence in the same tested compact class,
so its one-transition proof remains a genuine signed-sum problem.  The
exact determinant array is in
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_utilization_determinant_20260802.json`.

Full real-rootedness is not uniform across the ten families.  Certified
Arb isolation at the common ray `(m,x,r)=(60,120,90)` gives, in every one
of the ten parity/direction cases, exactly 88 negative real roots, one
positive root above 1, and one nonreal conjugate pair.  Both weighted
endpoint evaluations `K(1/2)` and `K(3/2)` are nevertheless positive in
all ten cases.  Thus the tempting theorem “`K` is always real-rooted” is
false, but the sharper observed alternative “all but at most one
conjugate pair are real and negative, with at most two positive roots”
remains viable.  The exact root isolation and integer endpoint signs are
in
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_ray_roots_probe_20260802.json`.
In three representative `m=60` families, merging the negative roots of
`K` with the 90 negative reserve roots gives perfect alternation except
for exactly two `R,R` adjacencies, with no run longer than two.  This is
the minimal possible generalized-interlacing defect when `K` has only 88
negative roots.  The certified merged orders are in
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_generalized_interlacing_probe_20260802.json`.
This quasi-root geometry is structurally interesting but is no longer a
logical prerequisite after the Descartes two-endpoint lemma (9).

Several short explanations of this geometry have been ruled out exactly.
The reserve-only polynomial is fully real-rooted with only negative roots,
and the `L`-polynomial in each saved signed case has all but one conjugate
pair of its roots negative real.  Adding `(r+1)R` makes the recorded
`K`-polynomials fully real-rooted.  Nevertheless the negative roots of
`K` and `R` do not interlace, so ordinary Obreschkoff compatibility is not
the mechanism.  Modular-rank audits find no recurrence of order at most 6
and tested polynomial degree at most 12 for the far `K`-sequences, and no
banded radius-at-most-4, degree-at-most-12 operator taking `R` to `L`.
See
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_interlacing_probe_20260802.json`,
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_holonomic_recurrence_probe_20260802.json`,
and
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_ell_reserve_operator_probe_20260802.json`.

The global-cone variants also fail.  Multiplying the reduced integration
kernel by as many as 30 extra copies of `V` gives no HCU entry in any of
the ten families.  No scale `lambda` makes `L+lambda*S_0` HCU after
writing `T^2Q=(z+w)S_0`, and an enlarged numerical cone allowing both HCU
pieces and certified diagonal-curvature atoms still fails 105--146 rows
per family.  The exact first two audits and the replayable numerical cone
audit are
`path_isolate_p4_affine_parameter_monotonicity_v_power_hcu_entry_search_20260802.json`,
`path_isolate_p4_affine_parameter_monotonicity_l_plus_s0_hcu_20260802.json`,
and
`path_isolate_p4_affine_parameter_monotonicity_curvature_cone_analysis_20260802.json`.
Thus the surviving information is genuinely the transformed ratio shape,
not membership in any currently implemented static kernel cone.
Nor can the inner `T`-binomial sum be discarded: at the saved group far
case 150 of 180 individual `k`-rows have negative totals, and at the
bottom far case 186 of 240 do.  Many rows have nonterminal signs.  The
positive result appears only after the complete `k`-aggregation; see
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_k_rows_probe_20260802.json`.

## Larger proportional-ray stress and two corrections

`stress_path_isolate_p4_affine_parameter_monotonicity_large_rays.py`
checks the exact increments at

\[
(m,x)=(30,60),(45,90),(60,120)
\]

and at each of the three orders

\[
r=m-5,\quad r=\lfloor4m/3\rfloor,\quad r=\lfloor3m/2\rfloor.
\]

Both parities and all five directions give 90 cases.  The actual
two-predecessor candidate survives every case:

* every full increment is nonnegative;
* every negative set is a contiguous terminal tail;
* every sequence has at most one nonzero sign transition;
* the longest tail has 50 terms;
* at most two preceding terms are needed;
* the worst tail debt is approximately `0.1628570181` of the two
  preceding terms.

The report's machine status is `FAIL` only because it deliberately also
tests the stronger eventual-utilization claim.  Exactly four group
(c)-cases fail that extra claim; none fails the actual tail-domination
lemma.  The artifact is
`path_isolate_p4_affine_parameter_monotonicity_large_rays_20260802.json`.

The ray audit also refutes uniform geometric decay inside the negative
tail.  The largest ratio of consecutive absolute tail terms is about
`31.10087065`: a tail may begin with a tiny negative term, grow to a
peak, and only then decay.  Therefore the proof must control the whole
negative block, not sum a geometric series beginning at its onset.

## Refined log-concave peak candidate

Recomputing all 104 first-grid cases with internal tail-shape diagnostics
finds that every absolute negative tail is log-concave, with zero exact
log-concavity violations.  Each of these first tails peaks at its first
term; the total tail debt is at most approximately `1.4224272251` times
the peak, and the peak is at most approximately `0.0081973947` of the
two-predecessor sum.

A focused audit of five worst long-ray cases, including the case with the
31-fold first jump, also has zero log-concavity violations.  Four tails
peak at the first negative term and the exceptional tail peaks at the
second.  Across these five cases the debt is at most approximately
`1.9616111064` times the peak.  The exact record is
`path_isolate_p4_affine_parameter_monotonicity_tail_shape_probe_20260802.json`.

The complete 90-case ray recomputation preserves the structural claims:
zero log-concavity violations, every magnitude tail unimodal, and every
peak in the first two negative positions.  It corrects the numerical
constant: the maximum debt/peak ratio is approximately `2.6063143797`,
so a factor 2 is false on the larger grid.  A factor 3 survives these
cases.  The peak is at most approximately `0.0856750259` of the two
preceding positives, and the largest post-peak ratio is approximately
`0.9287514871`.

This motivates a more structured sufficient lemma:

1. the absolute negative tail is log-concave and peaks in its first two
   positions;
2. its total mass is at most three times its peak;
3. the two preceding positive aggregates sum to at least three times the
   peak.

These three statements imply (5).  They remain conjectural, and the
factor 3 still needs larger-ray testing because ultra-log-concavity alone
does not force a uniform constant.  The log-concavity, early-peak, and
predecessor-margin parts survive all exact tests through (m=60); the
next section records their failure as a global formulation.

## Far-ray refutation and replacement invariant

The subsequent exact audit
`path_isolate_p4_affine_parameter_monotonicity_tail_shape_large_asymptotic_probe_20260802.json`
checks the two apparent worst directions at (m=90,120).  It refutes the
terminal-tail and factor-3 lemmas on the full domain.  In each refuting
case the first coefficient is already negative, a positive middle block
appears, and a second negative block occurs at the far end.  Hence there
are exactly two sign transitions and neither boundary block alone is the
whole negative set.

The robust exact facts in all four far-ray cases are:

* the full increment is strictly positive;
* the half-reserve increment is negative;
* every ordinary Turan inequality holds;
* every signed ultra-log-concavity/Newton inequality holds;
* the sign sequence has at most two transitions.

Saving the exact first refuting sequences sharpens the block description.
For the group (m=90,r=120) case the blocks are

\[
J_0,J_1<0;\qquad J_2,\ldots,J_{45}>0;\qquad
J_{46},\ldots,J_{120}<0.
\]

For the bottom (m=120,r=180) case they are

\[
J_0,\ldots,J_3<0;\qquad J_4,\ldots,J_{69}>0;\qquad
J_{70},\ldots,J_{180}<0.
\]

Thus the new initial defect is a short boundary block, not uncontrolled
oscillation.  The exact sequences and block sums are in
`path_isolate_p4_affine_parameter_monotonicity_far_sign_blocks_probe_20260802.json`.

Thus the current replacement target is a **two-boundary-block lemma**:
the (j)-sequence is signed ultra-log-concave, has sign pattern contained
in (-,+,-), and its positive middle block dominates the sum of both
negative boundary blocks.  The earlier terminal-tail lemma is the special
case where the initial negative block is empty.

Exact root counts at the first hard local points support the same split.
The bottom full-reserve polynomials are real-rooted, while the group
polynomials have exactly one nonreal conjugate pair; their reserve-only
polynomials have only negative real roots.  The next proof target is to
turn this root defect into a uniform at-most-two-transition theorem and a
quantitative middle-block domination inequality.

The broader 104-case root audit corrects full real-rootedness as a global
claim.  Some all-positive base sequences have 14 or 16 nonreal roots.
However, among the 21 cases that actually contain negative coefficients,
every polynomial has exactly one positive real root and at most one
nonreal conjugate pair.  Thus root control remains relevant precisely in
the signed regime, but it must be stated conditionally; unrestricted
real-rootedness is false.  These counts are included in
`path_isolate_p4_affine_parameter_monotonicity_j_tail_stress_20260802.json`.

Certified Arb root isolation of the two saved far polynomials gives an
even cleaner signed-regime picture.  The group degree-120 polynomial has
118 negative roots and positive roots in certified balls around
`0.02869083075` and `2.62557532699`.  The bottom degree-180 polynomial has
178 negative roots and positive roots around `0.05675971444` and
`2.50814984911`.  Both are fully real-rooted and have one positive root
on each side of 1.  The independently replayable certificate is
`path_isolate_p4_affine_parameter_monotonicity_far_roots_20260802.json`.

For these cases the desired positive total is exactly the statement that
1 lies between the two positive roots.  This suggests a root-bracketing
form of the replacement theorem: in the signed regime there are at most
two positive roots (and at most one nonreal conjugate pair), with any two
positive roots straddling 1.

The subsequent proportional-ray stress through `m=180` confirms that
the two-positive-root phenomenon persists in the old split.  Across the
eight group/bottom worst-direction cases at `m=90,120,150,180`, all
polynomials are fully real-rooted, have at most two positive roots, and
have one positive root on each side of 1 whenever two occur.  Every
signed ultra-log-concavity inequality holds and every full increment is
positive.  The initial negative block reaches length 19, but the combined
boundary debt is at most approximately `2.78021e-7` of the positive
middle block in the group family and approximately `3.90310e-9` in the
bottom family.  See
`path_isolate_p4_affine_parameter_monotonicity_far_sign_block_rays_stress_20260802.json`.

## Raw-kernel variation-diminution check

A separate evaluated-kernel audit tests whether the one-transition
output could follow directly from a one-transition input under a
totally-positive binomial transform.  At five hard large-ray cases, the
raw homogeneous coefficient rows and their two-variable Schur
differences have as many as three sign transitions.  The odd group
(c)-increment also has multiple transitions after aggregation by total
degree and by imbalance.  Thus classical variation diminution does not
apply directly to the raw increment kernel.  A successful use of total
positivity would first require a finer signed decomposition.  See
`path_isolate_p4_affine_parameter_monotonicity_kernel_geometry_20260802.json`.

## Relation to the original affine bridge

The same terminal-tail/two-predecessor pattern was independently found
for the original positive-intersection affine bridge on 24 hard cases,
including proportional rays through \((m,x)=(60,120)\).  There the
negative tail reached length 36, but two preceding terms still sufficed.

Thus (5) is not an isolated numerical coincidence of one increment
kernel.  It is now the common candidate mechanism for the original
bridge and all parameter-monotonicity reductions.

## Proof target

A proof should retain the inner \(T^b\) sum.  Earlier modular-rank audits
ruled out low-degree one-term rational ratios and compact low-order
polynomial recurrences after aggregating the original bridge all the way
to \(J_j\).  The viable targets are therefore:

1. find a finer decomposition whose input has controlled sign variation,
   then prove the terminal sign pattern through the positive
   binomial-product transform;
2. prove the refined log-concave peak lemma and pair that peak with the
   \(j=s-1,s-2\) layers using exact binomial-ratio inequalities; or
3. find a larger HCU/paired cone whose projection is precisely (5).

Proving the replacement two-boundary-block lemma uniformly for the ten
parity/direction kernels would close both affine packages by monotonicity
and reduce them to their already-certified minimal base points.

## Direct `r=2m` square route

A second route now bypasses the one-variable `j`-sign theorem on the
entire tail.  At `r=2m`, the stronger half-reserve square

\[
B+mP\succeq0
\]

passes exactly in every tested family and parameter direction, including
the difficult far ray `(m,x)=(24,48)`.  Reciprocal order propagation then
settles every `r>=2m`, leaving the Descartes two-endpoint lemma only for
the compact range `r<2m`.

The leading proof target for this square is an aligned induction in
`c,m,x`.  After positive outer factors are removed, the aligned
differences have finite signed cores smoothed by `A^aT^bV^{2m}`.  Pairing
the `V`-layers by `j<->2m-j` proves all outer pairs in the tested cases;
a growing central block remains.  Exact binomial weighting is essential.
At the hard ray the weighted central half-widths grow from 0 at `m=12`
to 5 (`x`) and 4 (`m`) at `m=24`, and to 6 and 5 in the group family at
`m=27`.  A simple `2m/3+constant` pair cutoff was tested and refuted at
`m=27`.

The aligned core is affine in the ambient parameter `x`.  Its second
aligned `x`-difference is nonnegative on every tested protected quadrant,
including `(m,x)=(24,48)`, although its raw slope has many negative
coefficients and its central reflected pairs are not individually
positive.  This supplies a promising convexity-style reduction of the
`x` induction but still requires a uniform central-block smoothing lemma.
Full details and exact artifact names are in
`ENDPOINT_SOUTHWEST_SQUARE_PROPAGATION_2026-08-02.md`.

### Correction on the super-proportional ray

The half-reserve strengthening and its aligned induction are false on
the full stable domain.  At `(m,x)=(19,76)`, all four difficult aligned
recurrences have hundreds of protected negative coefficients, and the
half-reserve square `B+mP` itself has 869 group and 951 bottom negatives.
This refutes the spare-reserve proof target recorded above.

Crucially, the actual full-reserve square `B+2mP` has zero negatives at
the same point.  Thus the corrected tail architecture retains direct
square entry at `r=2m` and all-order propagation, but must prove the full
square directly; parameter monotonicity of the half-square is no longer
available.  See the final correction section of
`ENDPOINT_SOUTHWEST_SQUARE_PROPAGATION_2026-08-02.md`.

A further super-proportional audit shows that even the full square is not
uniform: at `(m,x)=(12,96)=(12,8m)` it has 328 group and 466 bottom
off-diagonal negatives.  The desired diagonal remains strictly positive,
and in fact all 25 of its `j`-aggregates are positive.  Thus square entry
is only a balanced-parameter tool.

Termwise diagonal positivity also has a moving threshold: the first
tested all-positive multipliers are about `x/m=4,6,8` at
`m=15,24,30`, consistent with `x` of order `m^2/4`.  In the intervening
region the exact sequences retain a terminal negative block but positive
total.  This returns the uniform proof burden to the signed-block
domination/root-bracketing theorem developed above; square positivity and
termwise positivity now serve as complementary boundary regimes.

## Scalar reflection pairing: current leading tail lemma

Let `J_0,...,J_r` be the exact `j`-aggregates of a full affine increment,
including their binomial weights.  The weights are symmetric, so define

\[
P_j=J_j+J_{r-j},\qquad 0\le j\le\lfloor r/2\rfloor.    \tag{10}
\]

The scalar pairing (10) is much weaker than the false coefficientwise
polynomial pairing and exactly matched to the desired diagonal.  It has
now passed 52 exact cases with every inequality strict:

* all ten parity/direction families at the stable boundary;
* the difficult group and bottom families at `m=12,24,30`;
* `x=0,2m,4m,6m,8m` among the sampled points;
* orders `r=2m,3m,4m`.

There are zero negative and zero zero reflected pairs.  Hence every
tested full increment is a sum of positive scalar pairs.  The replayable
record is
`path_isolate_p4_affine_parameter_monotonicity_scalar_reflection_pairs_probe_20260802.json`.

The pair sequence has additional shape.  In every one of the 52 cases
its minimum occurs at an endpoint, never in the interior.  Direct shape
audits on the hard signed cases find that it is strictly unimodal: it
increases once and then decreases toward the fold.  Ordinary
log-concavity holds everywhere except possibly the final one or two
indices next to that fold.  Across the full 52-case audit, all 52
log-concavity failures occur at offsets exactly 1 or 2 from the center;
there are no others.  Thus a viable proof can split into a log-concave
prefix theorem and two local fold inequalities.

Two tempting explanations are false.  The palindromization

\[
K(t)+t^rK(1/t)
\]

need not be real-rooted: a degree-24 signed hard case has only six real
roots and eighteen nonreal roots.  Also, reflecting the inner `T^b`
index `k` as well as `j` does not produce positive fourfold atoms; the
first tested hard group case already has 15 negative fourfold blocks.
The complete `k`-aggregation is essential.

The corrected uniform tail target is therefore:

> For every affine family and every `r>=2m`, prove `P_j>0` for
> `0<=j<=floor(r/2)`—equivalently, prove the reflected-pair prefix shape
> and its endpoint/fold inequalities.

This would settle the entire tail directly, without a whole-square
statement.  The compact range `r<2m` still uses the two-boundary-block /
Descartes endpoint architecture.

### Asymptotic correction and folded central-block replacement

The pointwise scalar-pair conjecture above is false asymptotically.  An
exact reserve-utilization stress at `x=2m,r=2m` gives maxima about
`0.9301` at `m=90`, but at `m=120` the central group and bottom pairs use
about `1.0963` and `1.0876` copies of their reflected reserve.  Thus the
central reflected pair is negative.  The earlier tentative `3/4`
utilization bound is also false already at `m=60`.

The failure is highly localized.  At `m=120`, exactly four reflected
pairs are negative, at indices `117,...,120`.  The cumulative symmetric
central block becomes positive at half-width 5 in the group family and
4 in the bottom family.  At `m=150`, exactly the eleven pairs
`140,...,150` are negative in both families, and adding the first
positive outer pair (half-width 11) pays their entire combined debt.
Every full increment remains strictly positive.  See
`path_isolate_p4_affine_parameter_monotonicity_scalar_central_blocks_probe_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_scalar_pair_utilization_stress_20260802.json`.

The corrected folded lemma is:

1. the reflected scalar sequence `P_j=J_j+J_{r-j}` has sign pattern
   contained in `(+,-)` on `0<=j<=floor(r/2)`;
2. its terminal central negative block is dominated by the first one or
   two preceding positive reflected pairs.

This is the folded analogue of the earlier terminal-tail payment lemma,
but it removes the second boundary block and halves the index range.  It
is now the leading uniform target for `r>=2m`; the stronger claim that
each reflected pair is positive must not be used.

The asymptotic checkpoints at `m=180` and `m=210` continue to support
this folded-block statement.  At `x=r=2m`, the hard group and bottom
families have respectively 18 and 26 consecutive negative central
increments at those two values of `m`; the symmetric cumulative block
first becomes positive at half-widths 19 and 27.  Thus at both scales
the first two positive exterior reflected pairs pay the entire central
debt.

A proposed auxiliary constant must, however, be corrected.  At `m=210`
the group debt is `2.89227243368299` times its largest negative term, but
the bottom debt is `3.099196576113851` times its largest negative term.
Therefore the tentative bound "debt at most three peaks" is false.  The
direct two-term payment remains very strong: the first two positive
exterior terms total `11.98959519166273` peaks in the group family and
`19.66027203100599` peaks in the bottom family.  The exact record is
`path_isolate_p4_affine_parameter_monotonicity_scalar_central_blocks_m210_probe_20260802.json`.

Consequently the proof target should compare the negative ratio-sum
directly with the first two exterior ratios, without inserting a fixed
three-peak envelope.  That formulation is both stronger numerically and
immune to the refuted intermediate constant.

### Further correction at `m=240`: folding retains two boundary blocks

The one-block folded sign claim is itself false at a larger exact
checkpoint.  For the hard group family at `m=240,x=r=480`, the negative
reflected-pair indices are

\[
0,1,2\quad\hbox{and}\quad206,207,\ldots,240.
\]

Thus the folded sign pattern is `(-,+,-)`, not `(+,-)`.  The central
block is nevertheless paid immediately: its 35 negative central terms
have debt/peak `2.799477967`, while the first exterior positive term is
`5.5036` peaks.  The bottom family has only the central block
`207,...,240`; its first two exterior terms provide about `3.153946`
times the whole central debt.  Every full total remains positive.

An enhanced exact replay computes the boundary payments directly.  In
the group family, the first two positive terms adjacent to the low block
pay its total debt by a factor of `69769.9445846508`; the first two terms
adjacent to the central block pay that debt by a factor of
`11.729933781922487`.  Thus the new low-index defect is extremely small,
not a near counterexample.  The enhanced record is
`path_isolate_p4_affine_parameter_monotonicity_scalar_central_blocks_m240_group_probe_20260802.json`.

This correction reunifies the compact and tail geometries.  The uniform
folded target must be a **two-boundary-block lemma**: the folded sequence
has sign pattern contained in `(-,+,-)`, and the positive middle block
(or suitable first one/two boundary-adjacent terms) dominates both
negative blocks.  Folding still shortens and regularizes the problem,
but it does not permanently remove the low-index boundary defect.  See
`path_isolate_p4_affine_parameter_monotonicity_scalar_central_blocks_m240_probe_20260802.json`.

### Coordinate integration-by-parts audit

The derivative-like reserve also permits a coordinate Euler transfer.
Because `(r+1)V^r=partial_z(V^(r+1))=partial_w(V^(r+1))` and the hard
reserve kernels are divisible by both `z` and `w`, averaging the two
coefficient-level integrations by parts gives the exact identity

\[
2\,[z^Nw^N]A^aT^bV^r(D+rR)
=[z^Nw^N]A^{a-1}T^{b+3}V^{r+1}\,H_{\rm ibp},
\]

for a bounded symmetric kernel `H_ibp`.  Independent small-parameter
integer checks match exactly in the hard group and bottom families.

This identity does not give a short cone certificate.  After substituting
`c=C+1,m=M+3,r=2m+R`, the hard group kernel has 1,557 negative ordinary
coefficients and 811 negative Schur/HCU differences; the bottom kernel
has 873 and 501.  Multiplication by `V^rho` for
`rho=1,2,3,4,6,8,12` makes both defect counts grow, and no tested
smoothed kernel is HCU.  Thus coordinate integration by parts is a valid
alternative reduction, but fixed `V`-smoothing is refuted as its proof
mechanism.  The derivation and replay are in
`derive_path_isolate_p4_affine_parameter_monotonicity_ibp_kernel.py` and
`path_isolate_p4_affine_parameter_monotonicity_ibp_kernel_20260802.json`.

There is one exact useful separation inside this failed cone route.  On
writing `r=2m+R`, the coefficient of the excess order `R` in `H_ibp` is
coefficientwise strictly positive: it has 385 terms with minimum 2 in
the group family and 669 terms with minimum 3 in the bottom family.  All
ordinary negative coefficients lie in the boundary slice `R=0`.  Thus
the coordinate transfer independently confirms that extra order supplies
only positive bounded-kernel reserve; the unresolved sign geometry is
concentrated at `r=2m` together with the effect of the extra `V^R`
smoothing.  In contrast, the extra-`x` slope remains signed (670 and 641
negative coefficients), so this identity does not give `x`-monotonicity.

The reciprocal endpoints survive a super-proportional test that refutes
whole-square entry.  At `m=12,x=96=8m`, for both hard families and both
`lambda=2/3,3/2`, the desired central endpoint coefficient is positive
at every order `0<=r<=2m`.  Nevertheless none of the four southwest
squares has entered by `r=2m`; their final negative counts are 276 and
325 at `lambda=2/3`, and 819 and 983 at `lambda=3/2`.  Hence endpoint
positivity remains viable, while a uniform endpoint whole-square theorem
at `r=2m` is false.  See
`path_isolate_p4_affine_parameter_monotonicity_endpoint_superproportional_m12_x96_probe_20260802.json`.

Continuing the same exact recurrences beyond `2m`, the four squares enter
at orders 45 and 47 for `lambda=2/3`, and 51 and 52 for
`lambda=3/2` (group, then bottom), again with zero negative desired
coefficients before entry.  Order propagation therefore certifies both
endpoint inequalities for **all orders** at this super-proportional
parameter point.  The obstacle is now uniform control of the
parameter-dependent entry/pre-entry range, not a failure of either
endpoint inequality.

The reduced reserve factorization is now explicit in the two hardest
families.  The group `Q` kernel has 230 positive terms and factors into
eight positive symmetric/paired factors; the bottom `Q` has 376 positive
terms and factors into seven such factors.  Their minimum coefficients
are 2 and 3.  By contrast, the corresponding signed `L` kernels are
irreducible over the rationals at this level (2,456 and 1,593 terms,
with 1,160 and 745 negative coefficients).  This explains why the
reserve polynomials have much cleaner root geometry, but it also rules
out a matching elementary factorization of `L` as the direct source of
the single-valley theorem.  See
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_factor_structure_20260802.json`.

A dedicated recurrence search sharpens the negative evidence for the
utilization determinant itself.  On the exact degree-239 far-ray
determinant, modular full rank excludes order 1 through degree 80 and
orders 2--6 through degrees 50,36,28,22,18.  After removing the outer
binomial weights, the determinant still has the single sign transition
`+` on `0,...,44` and `-` on `45,...,239`, but a stronger search again
finds no recurrence: order 1 through degree 100 and orders 2--6 through
degrees 60,40,30,24,20 are all full rank.  Thus neither the binomial
weights nor a hidden short holonomic relation explains the single
valley.  See
`path_isolate_p4_affine_parameter_monotonicity_determinant_recurrence_probe_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_reduced_determinant_recurrence_probe_20260802.json`.

The low-degree differential-module explanation also fails.  In the hard
group family, none of the nine `(c,m,x)` coefficient slices of `L` lies
in the module generated by `Q,z Q_z,w Q_w` with arbitrary polynomial
multipliers of total degree at most six; the augmented modular ranks are
strictly larger for every slice.  One required family already refutes
this proposed uniform certificate, so no bottom-family reconstruction is
needed.  See
`path_isolate_p4_affine_parameter_monotonicity_L_Q_derivative_module_probe_20260802.json`.

Adding the complete second-derivative tier
`z^2Q_zz,zwQ_zw,w^2Q_ww` does not help: again zero of the nine group
parameter slices enter the module with multiplier degree at most six.
This rules out the natural first- and second-order bounded differential
operators; higher unrestricted derivative modules would no longer be a
compact explanation of the observed ratio shape.  See
`path_isolate_p4_affine_parameter_monotonicity_L_Q_derivative_module_order2_probe_20260802.json`.

### Symmetric-Pascal correction and original root defect

The later symmetric-Pascal identity

\[
S_j^{(r+1)}+S_{j+1}^{(r+1)}=V S_j^{(r)}
\]

reconstructs the original order-`r` coefficient polynomial directly.
Its first suggested global utilization single-valley statement is false
on a wider valid grid, but the needed level set remains contiguous in
every tested case.  More strongly, certified root isolation finds that
20 of the 26 focused original polynomials are fully real-rooted; the four
remaining genuinely signed cases have only one conjugate pair, always in
the open left half-plane.  The two already-positive group-`c` exceptions
have two left-half-plane pairs.  Every case has at most two positive
roots.  This replaces global utilization convexity by a possible
generalized-Hurwitz index-two lemma.  Exact statements, counterexamples,
and failed differential/quasi-orthogonal shortcuts are collected in
`SYMMETRIC_PASCAL_ORIGINAL_UTILIZATION_REDUCTION_2026-08-02.md`.

### Strict discrete convexity of utilization

A stronger shape than the single-valley property has emerged.  For

\[
u_j=-\frac{L_j}{(r+1)R_j},
\]

every saved complete utilization sequence satisfies the strict local
inequality

\[
u_{j+1}-2u_j+u_{j-1}>0.                              \tag{11}
\]

This has been checked with exact rational arithmetic throughout the
26-case focused grid.  Exactly 24 cases are in the genuinely signed
regime `L_j<0` for every index, and all 24 are strictly discretely convex.
The other two are the group `c`-increments at the first local points;
there `L` changes sign, but every final `K_j` is already positive, so no
utilization valley is needed.  Thus there are zero relevant convexity
failures.  The first two-boundary group case at `m=180` has 241
utilization values and all 239 inequalities in (11) are strict.  In
every genuinely signed saved case the first differences are strictly
increasing from the first index to the last.

The next proportional-ray checkpoint at `m=210` also passes exactly in
both hard families.  Both final `K` sequences have all three sign blocks,
but the utilization has zero strict-convexity failures, and the weighted
endpoint totals at `2/3` and `3/2` remain positive.  See
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_farther_rays_m210_stress_20260802.json`.

The substantially larger `m=240` checkpoint also passes exactly in both
hard families.  The group case has blocks `-[0,19], +[20,92],
-[93,321]`, while the bottom case has `-[0,14], +[15,114],
-[115,361]`.  Both have positive weighted totals at `2/3` and `3/2`,
strictly convex utilization at every interior index, and no reserve
sign failure.  See
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_farther_rays_m240_stress_20260802.json`.

The `m=300` checkpoint passes as well.  Its group blocks are
`-[0,33], +[34,113], -[114,401]`, and its bottom blocks are
`-[0,31], +[32,139], -[140,451]`.  Both utilization sequences are
strictly discretely convex and all weighted endpoint totals at `1/2`,
`2/3`, and `3/2` are positive.  See
`path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_farther_rays_m300_stress_20260802.json`.

Equation (11) immediately implies that `u_j` has at most one minimum,
so it proves the required single-valley shape and hence the
`(-,+,-)` coefficient pattern.  This is now the cleanest shape target:
prove one four-term rational inequality uniformly, rather than analyze a
global determinant sign transition.  The exact saved-sequence audit is
`path_isolate_p4_affine_parameter_monotonicity_utilization_convexity_analysis_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_convexity_grid_status_analysis_20260802.json`.

### Common-order TP3 reduction

For `n=r+1`, define

\[
\Phi_j(H)=\binom nj[z^Nw^N]A^aT^b
             w^j(1+z)^{n-j}H.
\]

All ten parity/direction families satisfy the exact identities

\[
L_j=\Phi_j(L),\qquad
nR_j=(n-j)\Phi_j\!\left(\frac{T^2Q}{1+z}\right).     \tag{12}
\]

The required quotient is polynomial: the explicit all-family audit
finds `Q` divisible by both `1+z` and `1+w` in all ten cases.  This is
also forced structurally because every reserve has the factor
`A=(1+z)(1+w)` and the extracted powers of `zw` and `T` are coprime to
`A`.  Thus the convexity determinant is now a common-kernel TP3 problem,
not a comparison of unrelated coefficient extractions.  See
`path_isolate_p4_affine_parameter_monotonicity_common_order_kernel_20260802.json`.

The naive positive-mixture conclusion is nevertheless false.  In exact
hard specializations the common reserve source is coefficientwise
positive, but `-L` has 216 negative coefficients among 348 group terms
and 166 among 280 bottom terms, and its support does not coincide with
the reserve support.  Hence a valid TP3 proof must incorporate signed
variation diminution or atom-space boundary summation rather than treat
the utilization as the expectation of a positive source statistic.  The
source audit is
`path_isolate_p4_affine_parameter_monotonicity_common_order_atom_sources_20260802.json`.

Rewriting the symmetric numerator in the natural generators
`A=(1+z)(1+w)` and `V=1+z+w` does not collapse this obstruction.  The
hard group/bottom `-L` sources still have respectively 187/144 terms and
93/70 negative coefficients; the symmetric reserve cores remain signed
in this basis as well.  Although total-degree projection produces a
clean `(-,+,-)` pattern, the middle homogeneous slices contain mixed
signs.  Thus neither a positive radial source nor a short symmetric-basis
TP3 proof is available from this conversion.

The common monomial kernel itself also fails the minimum order condition
needed for a direct quotient theorem.  In the hard group specialization,
1,545 pairs among the 297 positive reserve atoms have adjacent `2 x 2`
minors of both signs.  In the hard bottom specialization, the count is
1,436 pairs among 269 atoms.  Since reversing either column pair reverses
both signs, no source ordering can make the literal kernel TP2, and hence
none can make it TP3.  This gives an exact obstruction to applying
Derbazi's 2025 quotient-convexity theorem directly to the monomial
sources.  Any successful common-transform proof must first find a
different one-dimensional source representation, presumably by a
nontrivial aggregation or summation-by-parts identity.  See
`path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order_20260802.json`.

The tempting separate treatment of the two exceptional group-`c` cases
by large-`c` coefficientwise positivity is impossible.  Their common
reserve `Q` is clean and parameter-independent, but each `L` is
irreducible.  The invariant leading `c^2` slice contains 178 negative
coefficients in both parities (minimum `-19094`), so translating by any
fixed `c0` can never make the source coefficientwise nonnegative.  See
`path_isolate_p4_affine_parameter_monotonicity_group_c_factor_structure_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_group_c_source_threshold_20260802.json`.

### Universal triple-copy curvature identity

There is a sharper representation of the convexity numerator which does
not require ordering the source atoms.  Put

\[
f_j=-\Phi_j(L),\quad s_j=\Phi_j(S),\quad
g_j=(n-j)s_j=nR_j,\qquad d=n-j.
\]

Then

\[
C_j=f_{j+1}g_jg_{j-1}-2f_jg_{j+1}g_{j-1}
       +f_{j-1}g_{j+1}g_j
\]

is the numerator of the strict-convexity inequality.  With three source
copies and `x_i=w_i/(1+z_i)`, the only required insertion is

\[
B_i=d(d+1)x_i^2(x_j+x_k)
-2(d^2-1)x_i(x_j^2+x_k^2)
+d(d-1)x_jx_k(x_j+x_k).
\]

After common positive extraction factors, twice `C_j` is the cyclic
coefficient extraction of the averaged tensor

\[
\frac13\sum_i(-L_i)S_jS_kB_i.
\]

The decisive cancellation is

\[
B_1+B_2+B_3=2\sum_{i\ne j}x_i^2x_j>0,
\]

independent of `d`.  Thus writing `-L=S+E` isolates a canonical positive
`S^3` baseline and a single cyclic error tensor.  The raw tensor is not
coefficientwise positive in either hard family, so the remaining proof
must exploit positivity created by the outer binomial-product extraction.
See `UTILIZATION_CURVATURE_TRIPLE_COPY_KERNEL_2026-08-02.md` and the two
certificates named there.

### Deweighted third-convexity reduction

Put `v_j=(n-j)u_j` and `d=n-j`, and define

\[
a_j=d\Delta v_j+v_j,
\qquad
b_j=2a_j+d(d-1)\Delta^2v_j.
\]

Then direct subtraction gives

\[
\Delta^2u_j=\frac{b_j}{d(d-1)(d-2)},
\qquad
b_{j+1}-b_j=(d-1)(d-2)\Delta^3v_j.                 \tag{13}
\]

Therefore, if the nonzero signs of `Delta^3 v` are constant or have the
single transition `+,-`, the sequence `b` has no interior minimum.  The
two endpoint inequalities `b_0>0,b_last>0` then prove every utilization
curvature inequality at once.

This criterion passes all 24 genuinely signed cases in the exact
26-case focused grid: 18 have sign word `[+]` and six have `[+,-]`, with
both endpoints of `b` positive in every case.  The remaining two cases
are the already-positive local group-`c` exceptions.  This is strictly
weaker and more robust than log-concavity of `Delta^2 v`: that tempting
strengthening has exact failures and is not the target.  See
`DEWEIGHTED_THIRD_CONVEXITY_REDUCTION_2026-08-02.md`.

The quotient `v` does not arise from a hidden low-degree polynomial
statistic of the positive reserve atoms.  In both representative hard
families, modular full-column-rank certificates exclude
`Psi(U)=Psi(hW)` for every polynomial `h(p,q)` of total degree at most
five.  Degree six already has at least as many basis terms as output
rows and would be mere interpolation.  See
`path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation_probe_20260802.json`.

The six natural one-dimensional aggregations do not rescue this route.
Total degree, either coordinate, minimum, maximum, and absolute
difference all have exact rank gaps after the numerator is adjoined.
Signed difference is overcomplete but its grouped kernel has mixed
adjacent minors, so it is not TP2 in either orientation.  Even adjoining
one numerator-only boundary atom to the two uniformly ordered grouped
bulks is impossible for every candidate in both hard cases.  Long
TP2-compatible literal atom chains exist, but the tested chains do not
give an exact positive reserve representation; an apparent bottom fit
at floating-point precision is refuted by modular rank.  The detailed
certificates are summarized in
`DEWEIGHTED_THIRD_CONVEXITY_REDUCTION_2026-08-02.md`.
