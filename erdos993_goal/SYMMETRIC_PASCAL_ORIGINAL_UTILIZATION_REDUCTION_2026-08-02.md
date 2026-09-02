# Symmetric-Pascal original-utilization reduction

Date: 2026-08-02

This note records the exact lower-order reaggregation of the ten affine
parameter-increment families, the correction to the first global shape
conjecture, and the new generalized-Hurwitz/root-defect target.  Nothing
in this note is yet a uniform proof over the unbounded parameter domain.

## 1. Exact symmetric-Pascal identities

Put

\[
A=(1+z)(1+w),\qquad
T=z(1+z)+w(1+w),\qquad
V=1+z+w,\qquad q=zw,
\]

and define

\[
S_j^{(r)}=w^j(1+z)^{r-j}+z^j(1+w)^{r-j}.
\]

Two exact identities are

\[
A S_{j+2}^{(r)}=T S_{j+1}^{(r)}-qS_j^{(r)},             \tag{1}
\]

and

\[
S_j^{(r+1)}+S_{j+1}^{(r+1)}=V S_j^{(r)}.               \tag{2}
\]

The second follows term by term and is the main new simplification.

For every affine increment, after the already proved common positive
factor is removed, write

\[
D=VL+R,
\]

where `R` is the coefficientwise-positive reserve source.  Before
binomial weights let

* `N_j` be the order-`r+1` transform of `-L`;
* `R_j` be the order-`r` transform of `R`;
* `D_j` be the order-`r` transform of `D`.

Then (2) gives exactly

\[
N_j+N_{j+1}=R_j-D_j.                                  \tag{3}
\]

Thus the original utilization is

\[
h_j=-\frac{D_j}{R_j}
    =\frac{N_j+N_{j+1}}{R_j}-1.                        \tag{4}
\]

The original coefficient at split index `j` is

\[
C_j=\binom rj(D_j+rR_j)
   =\binom rj R_j(r-h_j).                              \tag{5}
\]

Consequently the positive coefficients of `C` are exactly the indices
where `h_j<r`.

If `E(y)=sum_j ell_j y^j` is the binomially weighted order-`r+1`
polynomial for `L`, and `P(y)=sum_j p_j y^j` is the weighted order-`r`
reserve polynomial, then the original polynomial also has the exact
differential reconstruction

\[
C(y)=(r+1)P(y)+E(y)+\frac{1-y}{r+1}E'(y).              \tag{6}
\]

## 2. Exact finite evidence and the correction to single-valley shape

The original 26-case focused grid has the following coefficient words:

* 18 cases: `(+, -)`;
* 6 far cases: `(-, +, -)`;
* 2 local group-`c` exceptions: all positive.

Hence the positive coefficients form one contiguous block in all 26
cases.  Both original weighted endpoint values at `2/3` and `3/2` are
strictly positive in every case.

The stronger claim that `h` itself always has a single valley is false.
An exact unrestricted but valid grid found, among others,

\[
(c,m,x,r)=(1,24,96,24)
\]

in the even group `m`-increment, where the adjacent slope word of `h` is
`(-,+,-)`, and

\[
(c,m,x,r)=(1,24,96,48),
\]

where it is `(+,-,+)`.  Similar bottom-pair examples occur.  These are
not failures of the required coefficient geometry: in the first example
every `C_j` is positive; in the second the coefficient word is `(+, -)`.
At every extra local extremum in the tested counterexamples, `h_j-r`
remains substantially negative.  Thus the correct target is the weaker
level-set statement

> the sublevel set `{j : h_j<r}` is an interval,

not global single-valley shape of `h`.

The focused exact analysis is replayed by
`analyze_path_isolate_p4_affine_parameter_monotonicity_symmetric_pascal_utilization.py`
and
`stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids.py`.
The broader correction is replayed by
`stress_path_isolate_p4_affine_parameter_monotonicity_symmetric_pascal_valley_location.py`.

## 3. Root-defect discovery

Certified Arb root isolation on the original one-variable polynomial

\[
C(y)=\sum_{j=0}^r C_jy^j
\]

reveals much stronger structure than the raw level set.

Across the full 26-case grid:

* 20 polynomials are completely real-rooted;
* 4 have exactly one nonreal conjugate pair;
* only the 2 already-positive local group-`c` exceptions have two
  conjugate pairs;
* every nonreal root has strictly negative real part;
* no polynomial has more than two positive roots.

Thus every genuinely signed case has at most two roots outside the open
left half-plane.  The small group examples with a defect have one
left-half-plane conjugate pair.  The far two-boundary cases are fully
real-rooted: for example, the degree-240 group polynomial at
`(m,x,r)=(180,360,240)` has 238 negative roots and two positive roots,
one below 1 and one above 1.  The degree-270 bottom polynomial has the
analogous `268+2` split.

The reserve polynomial is completely negative-rooted in every saved
case.  Merging its negative roots with those of `C` gives runs of length
at most two; only one to three same-polynomial adjacencies occur even at
degree 240.  This is strong generalized-interlacing evidence, but not a
proof.

The replayable records are

* `path_isolate_p4_affine_parameter_monotonicity_original_root_defect_analysis_20260802.json`;
* `path_isolate_p4_affine_parameter_monotonicity_original_adjacent_interlacing_probe_20260802.json`;
* the root fields in
  `path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids_stress_20260802.json`.

## 4. Why a right-half-plane bound would prove the shape lemma

Suppose a real polynomial `C` has at most two roots in the open right
half-plane and no unresolved imaginary-axis obstruction.  Factor all
left-half-plane roots into `H`.  Each negative real root contributes a
positive-coefficient linear factor, and each conjugate left-half-plane
pair contributes a positive-coefficient quadratic factor.  Hence `H`
has positive coefficients.  The remaining factor has degree at most
two.

Convolution with a positive sequence is variation diminishing.
Therefore the coefficient word of `C` has at most two sign changes.  In
the 24 genuinely signed affine families, the leading coefficient is
negative throughout the exact grid.  Once that boundary sign is proved
uniformly, the forbidden orientation `(+,-,+)` is excluded, and the
positive coefficients form one contiguous block.  The two group-`c`
exceptions can be treated separately in their already-positive regime.

This creates a new precise shape target:

> **Generalized Hurwitz index-two lemma.**  The original affine
> coefficient polynomial has at most two roots in the open right half
> plane; in the genuinely signed regime its leading coefficient is
> negative.

Together with the two endpoint inequalities, this would feed directly
into the existing Descartes/two-endpoint argument.

## 5. Parity--Hurwitz index lemma

Write

\[
C(t)=E(t^2)+tO(t^2).
\]

A self-contained homotopy argument now proves the following.  If `E`
and `O` are real-rooted, have the same number `p` of positive roots,
their negative roots strictly alternate in the classical Hurwitz
orientation, and their leading coefficients have the same sign, then
`C` has exactly `p` roots in the open right half-plane.

The proof deforms the ordered roots without allowing a root of `C` to
cross the imaginary axis.  Such a crossing would require a common
negative root of `E` and `O`, which strict interlacing forbids.  The pair
is deformed to

\[
E=QE_0,\qquad O=QO_0,
\]

where `Q` has `p` positive roots and

\[
(1+t)^{\deg C-2p}=E_0(t^2)+tO_0(t^2).
\]

At that representative,

\[
C(t)=Q(t^2)(1+t)^{\deg C-2p},
\]

which visibly has exactly `p` right-half-plane roots.  The full proof is
in `PARITY_HURWITZ_INDEX_LEMMA_2026-08-02.md`.

On the full 26-case focused grid, `E` and `O` are fully real-rooted,
their negative roots strictly alternate in the required orientation,
their leading signs agree, and each has the same `p<=2` positive roots.
The distribution is `p=0` in 2 cases, `p=1` in 18 cases, and `p=2` in 6
cases.  Thus the proved lemma independently recovers the certified
right-half-plane index in all 26 cases.  A separate exact boundary
audit also certifies matching nonzero leading parity signs in all 26
cases.

The diagnostic `probe_generalized_hb_parity_root_bound.py` also shows
why the hypotheses must not be weakened casually: wrong orientation
can produce arbitrarily large right-half-plane index in the tested
degrees.  Under the stated orientation, 5,000 exact generated cases had
right-half-plane index exactly `p` for `p=0,1,2`, as the proof predicts.

There is a second exact certificate worth preserving.  Define

\[
M(u)=E(u)O(u)-2u\bigl(E'(u)O(u)-E(u)O'(u)\bigr).
\]

For real `omega`, direct differentiation gives

\[
\frac{d}{d\omega}\arg C(i\omega)
=\frac{M(-\omega^2)}{|C(i\omega)|^2}.                 \tag{7}
\]

On all 26 focused cases, every coefficient of `M(-x)` is strictly
positive.  Hence the phase on the imaginary axis is strictly increasing
and there can be no imaginary-axis root.  This is an algebraically
simpler orientation certificate than isolating all negative parity
roots.  Coefficientwise positivity of `M(-x)` does not by itself bound
the right-half-plane index, so parity real-rootedness and the `p<=2`
bound remain essential.

The parity certificate has since been extended to a 72-case harsh grid.
Seventy-one cases lie in the equal-positive-count/same-leading-sign chamber
of the lemma above.  One bottom case lies in a second proved chamber: the
even part has one additional positive root, the parity leading signs are
opposite, and the oriented negative roots still alternate.  The second
homotopy representative is `(b-t)(1+t)^(D-1)` times the common positive-root
factor.  The predicted right-half-plane index agrees with independent exact
root isolation in all 72 cases.  See
`path_isolate_p4_affine_parameter_monotonicity_wide_grid_extended_parity_hurwitz_certificate_20260802.json`
and the updated proof in `PARITY_HURWITZ_INDEX_LEMMA_2026-08-02.md`.

## 5a. Nyquist reserve induction

A sharper comparison route now avoids proving full target-parity
real-rootedness.  For equal-degree real polynomials `A,B`, define

\[
H_{A,B}(u)=E_A(u)O_B(u)-O_A(u)E_B(u).
\]

Then

\[
\operatorname{Im}\frac{A(i\omega)}{B(i\omega)}
=-\frac{\omega H_{A,B}(-\omega^2)}{|B(i\omega)|^2}.       \tag{7a}
\]

Two self-contained argument-principle lemmas follow.

1. If `B` is Hurwitz stable, both endpoint ratios are positive, and
   `H_(A,B)(-x)>0` on the nonnegative half-line, then `A` and `B` have the
   same right-half-plane index.
2. If `B` is Hurwitz stable and `H_(A,B)(-x)` has at most one positive root,
   then, in the no-imaginary-root case, `A` has at most two right-half-plane
   roots.

For consecutive reserve orders set

\[
S_r(t)=(1+t)R_{r-1}(t).
\]

In all 72 harsh-grid cases, every coefficient of
`H_(R_r,S_r)(-x)` is strictly positive.  The same is true in all eight
complete saved cases, including degrees 180 and 240, for the comparisons
with `(1+t)^h R_(r-h)`, `h=1,2,3,4`.  The group reserve has a positive
constant base at order zero; the bottom reserve has an elementary stable
base by order two.  However, this imaginary-cross coefficient positivity is
not uniform: on the exact worst group ray `x=2m,r=2m`, it first fails at the
tested point `m=240` and has four negative leading coefficients at `m=300`.

The reserve induction survives in a cleaner form.  Define

\[
J_{A,B}(x)=E_A(-x)E_B(-x)+xO_A(-x)O_B(-x).
\]

Then `J_(A,B)(w^2)/|B(iw)|^2` is the real part of `A(iw)/B(iw)`.
If `J_(A,B)(x)>0` on the nonnegative half-line, the ratio curve stays in the
open right half-plane and has zero winding.  Every coefficient of
`J_(R_r,S_r)` is strictly positive in all 72 harsh cases and on the exact
far-edge cases `m=240,300`, through degree 600.  Thus uniform positivity of
this real-part numerator is now the correct reserve-side proof target.

For the target/same-order-reserve pair, all eight complete saved cases have
reflected cross sign word `[-,+]`, but the wider exact audit rules out that
word as a uniform theorem.  Of 72 harsh-grid cases, 62 have at most one
coefficient sign change and 10 have two; several of those ten genuinely
have two positive cross roots.

Neighboring stable reserve references substantially sharpen the result.
The fixed references `(1+t)^h R_(r-h)` for `h=1,2,3,4` give respectively
63, 69, 70, and 69 one-crossing coefficient certificates out of 72.  Their
failures are complementary.  The exact grid is covered 72/72 by the simple
piecewise choice `R_r` on `x=8m,r=m` and `(1+t)^4 R_(r-4)` elsewhere.
No fixed positive blend of the drop-3 and drop-4 references among the nine
weights `1/16,...,16` is universal, and exact root isolation shows genuine
multi-crossing bottom exceptions for both pure references.  Consequently
the target half of the Nyquist route now requires either a provable
parameter-regime split or a stronger winding lemma; the original single
`[-,+]` target is closed.

The exact complex-analysis proof, generating identity

\[
R_r(y)=[z^Nw^N]H(z,w)A^aT^b(1+z+yw)^r,
\]

and the finite certificates are recorded in
`NYQUIST_RESERVE_INDUCTION_LEMMA_2026-08-02.md`.

A further saved-case reduction compares each parity part `P` with the
corresponding negative-rooted reserve part `R`.  Cancel their leading
terms:

\[
S(u)=R_{\rm lead}P(u)-P_{\rm lead}R(u).
\]

For all 16 parity parts in the eight complete saved cases, `S` has a
single nonzero coefficient sign, all its roots are negative and real,
and merging the negative roots of `S` and `R` produces exactly one
same-polynomial adjacency with maximum run length two.  Thus `S` and
`R` miss strict interlacing at exactly one location.  This is unusually
close to the recent completed-interlacing framework, but it is not yet
a proof: the natural reserve differential modules are absent, the raw
Bezoutian difference has full rank, and the required uniform mixed
recurrence has not been identified.

## 6. Exact endpoint update

For the original aggregation the endpoint polynomial is

\[
U_\lambda^r(D+rR),
\]

not the earlier `V`-reaggregated expression.  The bounded base `D` is
independent of `lambda`, and the exact order recurrence is still

\[
F_{r+1}=W_\lambda F_r+W_\lambda^{r+1}R^\vee.          \tag{8}
\]

At `(m,x)=(12,24)`, both hard families enter the full nonnegative
reciprocal square at order 13 for both `lambda=2/3` and `3/2`, with no
negative pre-entry central value.  At the super-proportional point
`(m,x)=(12,96)`, none of the four full squares enters by order 40, but
the desired central endpoint coefficient remains positive at every
tested order.  Hence endpoint positivity survives; uniform whole-square
entry is simply too strong there.

The exact record is
`path_isolate_p4_affine_parameter_monotonicity_original_endpoint_southwest_entry_probe_20260802.json`.

## 7. Closed shortcuts

The following proposed explanations have now been tested and rejected.

1. The exact two-copy source

   \[
   (U_1R_2-U_2R_1)
   (w_1(1+z_2)-w_2(1+z_1))
   \]

   has no separation by total degree, copy imbalance, or the other
   elementary exponent statistics tested.  The hard instances have
   more than 100,000 mixed-sign terms.

2. `L` and `R` have gcd 1 in all ten symbolic families.  The reserve is
   coefficient-positive, but no large common factor cancels the signed
   source.

3. The original polynomial does not lie in the reserve differential
   module through derivative order 4 and multiplier degree 12 on the far
   case.

4. Allowing a quadratic multiplier on the original polynomial still
   gives no intersection with the reserve differential module through
   derivative order 4 and multiplier degree 20.

5. There is no relation using neighboring reserve orders
   `R_r,...,R_(r-6)` with multiplier degree through 6 on the far case.

The corresponding records are the two-copy source, `L/R` factor,
differential-module, quadratic-completion, and reserve-order
quasi-orthogonality JSON files dated 20260802.

The nearest literature framework is order-two quasi-orthogonality and
completed interlacing by two additional points; see
https://arxiv.org/abs/2604.25692 and https://arxiv.org/abs/1912.00353.
The required short mixed recurrence is absent in the natural derivative
and neighboring-order modules tested here, so those papers provide
language and possible techniques, not a theorem that can currently be
imported.

## 8. Current next target

The next useful attack should be one of:

1. prove coefficientwise positivity of the consecutive-order positive-real
   numerator `J_(R_r,(1+t)R_(r-1))(x)` from the exact reserve factorization;
2. prove a uniform parameter split selecting a neighboring stable reserve
   reference whose target cross has at most one positive root (the current
   exact candidate is `R_r` on `x=8m,r=m` and drop 4 elsewhere), or replace
   this split by a stronger winding-number estimate;
3. alternatively prove the four parity hypotheses uniformly:
   real-rootedness, oriented negative interlacing, the appropriate one of
   the two positive-root chambers, and their leading-sign orientation;
4. prove an early-region bound `h_j<r` and an eventual one-sided tail
   theorem, which would establish the level-set interval without global
   root location.

The Nyquist reserve induction is currently the sharpest structural lead.
Its reserve-side analytic implication is proved, but the uniform
consecutive-order coefficient sign and the target-side regime theorem remain
conjectural proof targets rather than completed lemmas.
