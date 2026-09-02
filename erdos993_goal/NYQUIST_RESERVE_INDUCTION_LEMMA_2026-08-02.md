# Nyquist comparison and reserve-order induction

## Status

The complex-analytic lemmas in this note are proved.  Sections 65--74 now
also give an all-order planar-network proof of the complete bottom Catalan
sandwich, closing the hard-bottom reverse-Borel reserve endpoint that was
previously only finitely certified.  The proof uses two explicit TN
rectangular factors and is recorded in
`full_left_core_network_proof_20260803.json` and
`full_right_factor_network_proof_20260803.json`.

This does **not** yet close the affine tree problem.  The independent uniform
obligations still include:

1. the hard-group reverse-Borel reserve endpoint (the defect-one `Q^2`
   analogue of the now-proved defect-three `Q` theorem);
2. an index-two winding comparison, utilization-convexity theorem, or
   equivalent direct positivity argument for the original affine target in
   every parameter regime.

The exact implication audit is in `PROOF_CHAIN_AUDIT_2026-08-03.md`.

## 1. Parity cross and the Nyquist ratio

For real polynomials of equal degree write

\[
 A(t)=E_A(t^2)+tO_A(t^2),\qquad
 B(t)=E_B(t^2)+tO_B(t^2)
\]

and define

\[
 H_{A,B}(u)=E_A(u)O_B(u)-O_A(u)E_B(u).
\]

For real \(\omega\), direct multiplication gives

\[
 \operatorname{Im}\frac{A(i\omega)}{B(i\omega)}
 =-\frac{\omega H_{A,B}(-\omega^2)}{|B(i\omega)|^2}.       \tag{1}
\]

Thus a coefficientwise-positive polynomial \(H_{A,B}(-x)\) forces the
positive-frequency Nyquist curve of \(A/B\) to lie strictly in the lower
half-plane.

## 2. Fixed-half-plane comparison lemma

**Lemma.**  Let \(A,B\in\mathbb R[t]\) have the same degree and positive
constant and leading coefficients.  Suppose \(B\) has no zero in the closed
right half-plane and

\[
 H_{A,B}(-x)>0\quad(x\geq0).
\]

Then \(A\) and \(B\) have the same number of zeros in the open right half
plane.  In particular, \(A\) is Hurwitz stable.

**Proof.**  By (1), \(A(i\omega)/B(i\omega)\) lies strictly in the lower
half-plane for \(\omega>0\).  Its limits at \(0\) and \(+\infty\) are positive
real numbers.  Hence its argument has a continuous branch in \((-\pi,0)\)
whose total change from \(0\) to \(+\infty\) is zero.  Real symmetry gives
zero total argument change on the entire imaginary-axis part of a large
right-half-plane contour.  The quotient tends to a positive real constant on
the semicircle, so the semicircle contributes zero in the limit.  The
argument principle therefore gives

\[
 N_+(A)-N_+(B)=0.
\]

Since \(N_+(B)=0\), the claim follows.  The strict half-plane condition also
excludes imaginary-axis zeros of \(A\).  \(\square\)

Coefficientwise positivity of \(H_{A,B}(-x)\) is more than the lemma needs,
but it is an exact finite algebraic certificate for the required half-line
positivity.

## 2a. Positive-real comparison lemma

Define the second parity product

\[
 J_{A,B}(x)=E_A(-x)E_B(-x)+xO_A(-x)O_B(-x).
\]

Direct multiplication also gives

\[
 \operatorname{Re}\frac{A(i\omega)}{B(i\omega)}
 =\frac{J_{A,B}(\omega^2)}{|B(i\omega)|^2}.             \tag{1a}
\]

**Lemma.**  Under the equal-degree and positive-endpoint hypotheses of the
fixed-half-plane lemma, suppose \(B\) is Hurwitz stable and
\(J_{A,B}(x)>0\) for every \(x\geq0\).  Then \(A\) and \(B\) have the same
right-half-plane zero count.

**Proof.**  Equation (1a) puts the entire imaginary-axis ratio curve in the
open right half-plane.  It therefore has a continuous argument in
\((-\pi/2,\pi/2)\) with zero net change because both endpoint ratios are
positive.  The same right-half-plane argument-principle contour used above
gives \(N_+(A)-N_+(B)=0\).  Positivity also excludes imaginary-axis zeros of
\(A\). \(\square\)

This lemma is strictly better suited to the reserve induction: it allows the
imaginary part to change sign any number of times, provided the ratio never
leaves the open right half-plane.

## 3. One-crossing index bound

**Lemma.**  Under the same equal-degree and nonzero-endpoint hypotheses,
assume \(B\) is Hurwitz stable, neither polynomial vanishes on the imaginary
axis, and the nonzero coefficient sign word of \(H_{A,B}(-x)\) has at most one
sign change.  Then

\[
 N_+(A)\leq2.
\]

**Proof.**  Descartes' rule gives at most one positive zero of
\(H_{A,B}(-x)\).  By (1), the positive-frequency Nyquist curve of \(A/B\)
therefore changes between the upper and lower half-planes at most once.  On
each of the at most two open intervals its continuous argument is confined
to a strip of width \(\pi\).  Since both endpoint ratios are real and
nonzero, the total argument change is an integral multiple of \(\pi\) and
has absolute value at most \(2\pi\).  The right-half-plane argument principle
gives

\[
 |N_+(A)-N_+(B)|\leq2.
\]

Now \(N_+(B)=0\).  \(\square\)

For the final tree application, imaginary-axis zeros must either be excluded
uniformly or handled by a boundary version of this lemma.  The existing
parity chamber certificates exclude them in all saved cases, but this is not
yet a uniform argument.

## 4. Reserve-order induction

For a fixed affine family and fixed external parameters, let

\[
 R_r(t)=\sum_{j=0}^r R_{r,j}t^j
\]

be the positive reserve at order \(r\), with its moving diagonal target, and
put

\[
 S_r(t)=(1+t)R_{r-1}(t).
\]

The original proposed uniform certificate was

\[
 H_{R_r,S_r}(-x)\ \text{has strictly positive coefficients}.       \tag{2}
\]

It is **not uniform**: the worst group ray \(x=2m,r=2m\) first violates (2)
at the tested point \(m=240\), and has four negative leading reflected-cross
coefficients at \(m=300\).  The corrected proposed certificate is

\[
 J_{R_r,S_r}(x)
 =E_{R_r}(-x)E_{S_r}(-x)+xO_{R_r}(-x)O_{S_r}(-x)
 \quad\hbox{has strictly positive coefficients}.        \tag{2a}
\]

If (2a) holds, the positive-real comparison lemma proves inductively that
all \(R_r\) are Hurwitz stable.  The group-family base is the positive
constant \(R_0\).  In the hard bottom family, \(R_0=0\), \(R_1\) is a
positive constant after deleting the trailing zero, and \(R_2\) is a
positive-coefficient quadratic, hence Hurwitz stable; induction starts at
the first full-degree order.

The aggregation itself has the compact generating form

\[
 R_r(y)=[z^Nw^N]\,H(z,w)A^aT^b(1+z+yw)^r,             \tag{3}
\]

where \(N\) increases by one with \(r\).  Formula (3) follows by summing the
binomial index \(j\) before taking the diagonal coefficient.  It is the
starting point for a uniform proof of (2a).

## 5. Exact evidence

The following checks use exact integer coefficients.

* All 72 wide-grid hard cases pass both the original stronger test (2) and
  the corrected positive-real test (2a), with no zero coefficients through
  degree 72:
  `path_isolate_p4_affine_parameter_monotonicity_wide_reserve_order_nyquist_induction_20260802.json`.
* Eight complete saved cases, including degrees 180 and 240, pass not only
  for \(S_r=(1+t)R_{r-1}\) but also for
  \((1+t)^hR_{r-h}\), \(h=1,2,3,4\):
  `path_isolate_p4_affine_parameter_monotonicity_reserve_order_nyquist_crossings_probe_20260802.json`.
* On the asymptotically harsher group edge \(x=2m,r=2m\), (2) fails at
  \(m=240\) and \(m=300\), but (2a) remains strictly coefficient-positive in
  both exact computations, through degree 600:
  `path_isolate_p4_affine_parameter_monotonicity_group_reserve_factor_far_edge_stress_20260802.json`.
  At \(m=240\), the unique positive imaginary-cross root is rigorously
  bracketed at \(x\approx0.0069049720015\), and Arb interval evaluation puts
  the ratio crossing on the positive real ray:
  `path_isolate_p4_affine_parameter_monotonicity_far_reserve_nyquist_crossing_orientation_20260802.json`.
* The reserve phase numerator itself has strictly positive coefficients in
  all 72 wide cases:
  `path_isolate_p4_affine_parameter_monotonicity_wide_reserve_phase_positivity_20260802.json`.
  This independently excludes imaginary roots along any homotopy on which
  the same positivity can be proved, but phase monotonicity alone does not
  determine the Hurwitz index.
* For the target polynomial \(C\) and same-order reserve \(R_r\), the
  original eight complete saved cases have reflected cross sign word
  `[-,+]`, but the 72-case audit disproves that word as a uniform law.
  It gives 62 cases with at most one coefficient sign change and 10 with
  two; exact root isolation shows that several of the latter genuinely
  have two positive cross roots:
  `path_isolate_p4_affine_parameter_monotonicity_wide_target_reserve_nyquist_crossings_20260802.json`.
* Neighboring stable references repair every finite exception, but no
  single tested order drop is uniform on the 72-case grid.  The fixed
  reference \((1+t)^4R_{r-4}\) has at most one coefficient sign change in
  69/72 cases; drops 1, 2, and 3 give 63/72, 69/72, and 70/72 respectively.
  A simple exact 72/72 rule on this grid is: use \(R_r\) when
  \(x=8m,r=m\), and \((1+t)^4R_{r-4}\) otherwise.  This is finite evidence,
  not yet a uniform parameter theorem.  A positive blend of the drop-3
  and drop-4 references was also tested; no fixed blend weight among
  \(1/16,\ldots,16\) is universal.
* Exact positive-root isolation confirms that the exceptional coefficient
  patterns are not all Descartes overcounts: one low-order bottom drop-4
  cross has three positive roots, while the far bottom drop-3 cross has
  two.  Thus a genuine regime split or a stronger winding argument is
  required.  The records are in the `wide_target_drop*_reserve_nyquist`,
  `wide_target_blended_reserve_nyquist`, and
  `neighbor_reserve_cross_positive_roots` JSON files dated 20260802.

## 6. Failed simplifications

The finite positivity in (2), and the replacement positivity (2a), are not
atomwise and are not explained by any of the
tested natural groupings.  Individual source/T-expansion atoms, symmetrized
atom pairs, fixed \(k\)-layers, source-degree slices, and full
\(z\leftrightarrow w\), \(k\leftrightarrow b-k\) swap orbits all have exact
negative reflected coefficients in small hard cases.  Likewise, no
nontrivial three-term or bounded low-order recurrence in \(r\) was found
before the tested neighbor span became dimensionally full.

For the hardest group reserve, after absorbing \(q^2A^2T^2\) into the
extraction parameters, the remaining source factors as

\[
 (z+w)(z^2+w^2)F(z,w)G(z,w)^2.
\]

In the representative degree-12 case, the bare source and the source after
multiplication by \(z+w\) each leave one negative cross coefficient;
multiplication by \(z^2+w^2\) makes the full cross strictly positive, and
the factors \(F,G,G\) preserve positivity.  This points to the complete
factorization, rather than generic symmetry or generic positive mixtures, as
the next proof target.

## 7. Homogeneous stability reformulation

There is a stronger exact reformulation of (3).  For a fixed final kernel

\[
 K(z,w)=H(z,w)A^aT^b
\]

define the homogeneous ternary polynomial

\[
 \mathcal P_{r,N}(s,x,y)
 =[z^Nw^N]K(z,w)(s+xz+yw)^r.                         \tag{8}
\]

Its coefficients are

\[
 [s^{r-h-j}x^hy^j]\mathcal P_{r,N}
 =\binom{r}{h,j,r-h-j}K_{N-h,N-j}.                  \tag{9}
\]

The reserve is the specialization

\[
 R_r(t)=\mathcal P_{r,N}(1,1,t).                    \tag{10}
\]

Consequently, real stability of `mathcal P` would prove at once that every
reserve has only real nonpositive zeros, hence is Hurwitz stable.  This is now
the cleanest candidate theorem for the reserve half of the proof.

Certified Arb isolation on the 72-case harsh grid gives a stronger finite
fact than the Nyquist calculation: all 72 current reserves and all 72 raw
preceding reserves are completely real-rooted, with every root strictly
negative.  Raw consecutive orders strictly interlace in 15 cases; the other
57 merged root words have exactly one repeated label, so ordinary strict
Sturm induction is too narrow.  The exact record is
`path_isolate_p4_affine_parameter_monotonicity_wide_reserve_sturm_interlacing_20260802.json`.

The ternary strengthening itself has passed 1,200 random positive-direction
hyperbolicity-line tests for the hardest group source, spread over the bare,
smoothed, and complete factor stages.  It also passed tests for both source
types occurring on the 72-case grid (the hard group `m` source and the hard
bottom `x` source).  See `group_reserve_multivariate_stability_probe_20260802.json`
and
`path_isolate_p4_affine_parameter_monotonicity_wide_reserve_multivariate_stability_probe_20260802.json`.
These are necessary tests only, not a proof of real stability.

There is additional exact slice evidence.  Writing

\[
 \mathcal P_{r,N}(s,x,y)=\sum_{j=0}^r f_j(s,x)y^j,
\]

every tested binary form `f_j` is negative-real-rooted after setting `s=1`,
and the roots of consecutive `f_j` strictly interlace at every level, for the
bare, smoothed, and complete hard group kernels.  No scalar three-term
continuant recurrence for these forms exists in the first tested cases, so a
dense determinantal/mixed-discriminant representation rather than a Jacobi
tridiagonal representation may be required.

## 8. Reverse-total-positivity and hypergeometric structure

For the bare kernel there is an exact matrix factorization.  Put

\[
 U_{i,k}=[z^i]\{z(1+z)\}^k=\binom{k}{i-k}.
\]

Then the coefficient matrix of `T^b` is

\[
 M=U D J U^{\mathsf T},                              \tag{11}
\]

where `D=diag(binomial(b,k))` and `J` reverses the `b+1` columns.  The matrix
`U` is a planar-network path matrix and hence totally nonnegative.  Expanding
minors of (11) by Cauchy--Binet shows that every `k`-minor of `M` has sign
`(-1)^(k(k-1)/2)`.  Multiplication by `A^a` is left and right multiplication
by binomial Toeplitz matrices and preserves this reverse sign regularity.

The fixed primitive matrices `A,T,z+w,z^2+w^2,F,G` and the complete matrices
of `T^2,T^3,T^4` have also been exhaustively checked over the integers; every
minor has the predicted reverse-TN sign.  The replayable certificate is
`group_reserve_primitive_reverse_total_positivity_certificate_20260802.json`.
Reverse total positivity alone is not sufficient: a strict reverse-TP test
kernel can have negative coefficients in the positive-real numerator.  The
missing hypothesis is therefore a stronger Pascal/Toeplitz or mixed-
determinantal property of the exact factorization.

At a fixed `T`-expansion index `k` and source monomial `z^p w^q`, the reserve
summand is a terminating hypergeometric polynomial.  Its adjacent coefficient
ratio identifies it explicitly as a terminating `3F2` (up to its support
zeros), and every tested summand has only nonpositive real roots.  Neighboring
`k`-summands interlace through their common support.  However, partial sums in
`k` can acquire a nonreal pair before the complete binomial `T^b` sum restores
real-rootedness.  Thus an atomwise positive-mixture proof is invalid.  The
records are in `group_reserve_hypergeometric_summands_probe_20260802.json`.

## 9. Additional closed shortcut

Comparing the target with `Q(t)R_{r-2}` for each of eight natural fixed
index-two quadratics fails coefficientwise positive-real orientation in all
72 harsh cases.  This is structurally unsurprising because the target's
right-half-plane index varies between zero and two while a fixed index-two
reference cannot match both regimes.  The exact audit is
`path_isolate_p4_affine_parameter_monotonicity_wide_target_quadratic_defect_reserve_20260802.json`.

## 10. Reverse-Borel--Laguerre reduction

The most economical route to the ternary stability statement (8) is a
reverse Borel transform.  For a bivariate coefficient kernel `K`, define

\[
 \mathcal B_N[K](X,Y)
 =\sum_{h,j\geq0}K_{N-h,N-j}\frac{X^hY^j}{h!j!}.       \tag{12}
\]

Multiplication before the transform becomes constant-coefficient
differentiation after it:

\[
 \mathcal B_N[S(z,w)K(z,w)]
 =S(\partial_X,\partial_Y)\mathcal B_N[K](X,Y).        \tag{13}
\]

This follows immediately for a monomial `S=z^p w^q` by shifting the two
coefficient indices, and hence follows for every polynomial `S` by
linearity.

There is a precise stability bridge from (12) to (8).

**Jensen-component lemma.**  Suppose `Phi(X,Y)=mathcal B_N[K](X,Y)` is real
stable and has nonnegative coefficients.  Then every polynomial
`mathcal P_{r,N}` in (8) is real stable.

**Proof.**  For a positive integer `M`, put

\[
 f_M(s,x,y)=(1+s/M)^M\Phi(x,y).
\]

This is real stable and has nonnegative coefficients.  The standard
same-phase homogenization theorem for stable polynomials says that every
homogeneous component of such a polynomial is stable or zero: homogenize,
differentiate the homogenizing variable the required number of times, and
specialize that variable to zero.  The degree-`r` homogeneous component of
`f_M` therefore is stable.  As `M` tends to infinity these components
converge coefficientwise to the degree-`r` homogeneous component of
`e^s Phi(x,y)`.  Stability is closed under coefficientwise limits, and

\[
 r!\,[e^s\Phi(x,y)]_{\mathrm{hom},r}
 =\sum_{h+j\leq r}
   \binom{r}{h,j,r-h-j}K_{N-h,N-j}s^{r-h-j}x^hy^j
 =\mathcal P_{r,N}(s,x,y).
\]

Thus `mathcal P_{r,N}` is stable.  \(\square\)

For the bare kernel, introduce

\[
 P_N^a(X)=\mathcal B_N[(1+z)^a](X)
 =\sum_{h=0}^N\binom a{N-h}\frac{X^h}{h!}
 =L_N^{(a-N)}(-X).                                  \tag{14}
\]

The elementary derivative identities

\[
 \partial P_N^a=P_{N-1}^a,\qquad
 (\partial+\partial^2)P_N^a=P_{N-1}^{a+1},\qquad
 (1+\partial)P_N^a=P_N^{a+1}                        \tag{15}
\]

give the exact Laguerre convolution

\[
 B_N^{a,b}:=\mathcal B_N[A^aT^b]
 =T(\partial_X,\partial_Y)^b
   \{P_N^a(X)P_N^a(Y)\}.                            \tag{16}
\]

Writing `Q=zw`, the basic source operators act by

\[
 A(D)B_N^{a,b}=B_N^{a+1,b},\quad
 T(D)B_N^{a,b}=B_N^{a,b+1},\quad
 Q(D)B_N^{a,b}=B_{N-1}^{a,b}.                       \tag{17}
\]

In particular, because `G=AT^2-Q`,

\[
 G(D)^2B_N^{a,b}
 =B_N^{a+2,b+4}-2B_{N-1}^{a+1,b+2}+B_{N-2}^{a,b}.  \tag{18}
\]

Thus the apparently complicated `G^2` factor is an exact discrete second
difference, reminiscent of a Christoffel or Turan transform of adjacent
generalized-Laguerre kernels.  The other fixed factors also have finite shift
formulas; after multiplication, the complete group source

\[
 (z+w)(z^2+w^2)F G^2
\]

is a 48-term integer linear combination of shifted `B_N^{a,b}` kernels.
All identities (13)--(18), the complete 48-term expansion, and the Jensen
coefficient identity have been replayed over exact rationals in
`group_reserve_reverse_borel_laguerre_identity_certificate_20260802.json`.

The remaining reserve theorem can therefore be stated sharply:

> Prove that the reverse-Borel transforms (12) of the complete hard group
> and hard bottom kernels are real stable throughout their admissible
> integer parameter cones.

This statement is strictly stronger than the required Hurwitz conclusion,
but it has passed 200 random positive-direction line tests for the two hard
source types on the wide grid, with no failure.  The exact test record is
`path_isolate_p4_affine_parameter_monotonicity_wide_reserve_reverse_borel_stability_probe_20260802.json`.
The bare group transform fails analogous tests, whereas the complete
`(z+w)(z^2+w^2)FG^2` transform passes them; the fixed source factors are
therefore essential rather than cosmetic.

## 11. Endpoint reduction of the full reserve cones

The reverse-Borel formulation also removes two of the three unbounded
parameters.  From (13),

\[
 \mathcal B_N[AK]=(1+\partial_X)(1+\partial_Y)\mathcal B_N[K],
 \qquad
 \mathcal B_{N-1}[K]=\partial_X\partial_Y\mathcal B_N[K].       \tag{19}
\]

Derivatives preserve real stability, as do `1+c partial_X` for `c>=0`.
The operators in (19) commute.  Thus increasing the external `A` exponent
and decreasing the common diagonal index both preserve stability.

For the hard group case (parity zero, `m`-coordinate), exact factorization
of the actual reserve source gives

\[
 R_{\rm source}=Q^2A^2T^2H_{\rm group},\qquad
 H_{\rm group}=(z+w)(z^2+w^2)FG^2.
\]

After shifting away `Q^2`, its effective transform has

\[
 a=m+x+1,\qquad b=2m+1,\qquad N=m+r+4.
\]

Write `x=2m+u` and `r=2m-v`, where `u,v>=0`.  Then

\[
 \Phi_{m,x,r}
 =\{(1+\partial_X)(1+\partial_Y)\}^{u}
  (\partial_X\partial_Y)^v\Phi_m^{\rm end},             \tag{20}
\]

where the sole group endpoint family is

\[
 \Phi_m^{\rm end}
 =\mathcal B_{3m+4}
   [H_{\rm group}A^{3m+1}T^{2m+1}].                    \tag{21}
\]

Consequently, stability of (21) for every admissible `m` proves stability
throughout the complete cone `x>=2m`, `r<=2m`.  Extra group parameter `c`
increments only add even powers of `A` and are covered by the same closure.

The hard bottom source admits the parallel exact factorization

\[
 R_{\rm source}=A^2T^2H_{{\rm bottom},m},
\quad
 H_{{\rm bottom},m}
 =(z+w)(z^2+w^2)(A-1)F L_m(z,w),                       \tag{22}
\]

where `L_m` is symmetric, linear in `m`, and has 80 nonnegative monomial
coefficients.  The apparent 80-term residual has the compact exact form

\[
 L_m=G\{T+(2m+3)QA\}+2Q^2A.                           \tag{22a}
\]

Thus the bottom source is a three-term contiguous combination built from
the same `G=AT^2-Q` shift operator that occurs squared in the group source.
This does not by itself preserve stability under addition, but it reduces the
bottom algebra to the same small Laguerre-shift module as the group endpoint.
Its effective parameters are

\[
 a=m+x-1,\qquad b=2m+1,\qquad N=m+r+3.
\]

The bottom cone therefore reduces to

\[
 \Psi_m^{\rm end}
 =\mathcal B_{3m+3}
   [H_{{\rm bottom},m}A^{3m-1}T^{2m+1}].              \tag{23}
\]

Equations (20)--(23), both original-source factorizations, and the complete
sparse expansion of `L_m` are certified in
`reserve_reverse_borel_endpoint_reduction_certificate_20260802.json`.
The reserve theorem has therefore been reduced from two infinite
three-parameter cones to **two one-parameter endpoint families**.

## 12. A proper-position reduction for the bottom endpoint

Put `N=3m+3`, `a=3m-1`, and `b=2m+1`, and temporarily remove the fixed
factor

\[
 C=(z+w)(z^2+w^2)(A-1)F.
\]

The two blocks in (22a) have the exact contiguous forms

\[
 P_{N,a,b}:=\mathcal B_N[A^aT^bGT]
 =B_N^{a+1,b+3}-B_{N-1}^{a,b+1},                    \tag{24}
\]

and

\[
 Q_{N,a,b}:=\mathcal B_N[A^aT^bQA\{(b+2)G+2Q\}]
 =(b+2)B_{N-1}^{a+2,b+2}-bB_{N-2}^{a+1,b}.          \tag{25}
\]

Here `b+2=2m+3`, so (24)--(25) are exactly the two terms in the compact
bottom residual.  They also satisfy the formal derivative identity

\[
 A^aT^bQA\{(b+2)G+2Q\}
 =QAT\,\frac{\partial}{\partial T}\{A^aT^bG\}.       \tag{26}
\]

The endpoint arithmetic fixes the generalized-Laguerre defect:

\[
 a=N-4,\qquad 3b=2N-3.                               \tag{27}
\]

Consequently the seed in (14) is not a moving negative-order family but

\[
 P_N^{N-d}(X)=\frac{(N-d)!}{N!}X^dL_{N-d}^{(d)}(-X),
 \qquad d=4,                                         \tag{28}
\]

and the parallel group endpoint has `d=3`.  Equations (24)--(28) have been
checked over exact rationals in
`bottom_endpoint_laguerre_contiguous_identity_certificate_20260802.json`.

The numerical evidence identifies a sharply oriented proper-position
lemma.  On 600 exact positive-direction affine-line tests for `1<=m<=15`,

\[
 P_{N,a,b}+UQ_{N,a,b}
\]

had no nonreal zero, while the reverse orientation
`Q+UP` failed 453 of the 600 tests.  The record is
`bottom_endpoint_compact_proper_position_probe_20260802.json`.  Repeating
the test after successively deleting every fixed factor in `C` left the
same forward orientation with zero failures in all six factor packages
(240 tests per package); hence the relation is already present in the bare
Laguerre pair (24)--(25).  That localization is recorded in
`bottom_endpoint_proper_position_factor_repair_probe_20260802.json`.

The proposed uniform bottom lemma is therefore:

> **Bottom contiguous proper-position lemma.**  For `a=N-4` and
> `3b=2N-3`, the polynomial `P_{N,a,b}+UQ_{N,a,b}` defined by
> (24)--(25) is real stable.

This remains a proof obligation.  It cannot be replaced by separate
stability of all three positive summands in (22a): the isolated `Q^2A`
summand fails exact affine-line stability tests.  Nor is the bare
constant-coefficient symbol `GT+UQA((b+2)G+2Q)` stable.  The proper-position
effect is created by the action on the fixed-defect Laguerre seed.

## 13. The single-`G` repair and derivative orientation

Before the fixed source factors are applied, define

\[
 R_{N,a,b}:=\mathcal B_N[A^aT^bG]
 =B_N^{a+1,b+2}-B_{N-1}^{a,b}.                       \tag{29}
\]

The raw base `B_N^{a,b}` is not stable at the first endpoint values: it
failed 67 of 600 exact affine-line tests over `1<=m<=20`.  In contrast,
`R`, `T(D)R`, `G(D)R`, and the coupled derivative block all had zero
failures in the same 600 tests.  Thus one application of
`G=AT^2-Q` is the exact observed stability repair.  The record is
`bare_endpoint_laguerre_chain_stability_probe_20260802.json`.

There is an even sharper first-order relation.  Put

\[
 D_{N,a,b}:=
 \mathcal B_N\left[QA\frac{\partial}{\partial T}
                   \{A^aT^bG\}\right].              \tag{30}
\]

For `2<=m<=15`, the orientation

\[
 R_{N,a,b}+U D_{N,a,b}                               \tag{31}
\]

had zero failures in 560 exact three-variable line tests.  The reverse
orientation failed 491 of those 560 tests.  At `m=1`, (31) had one sampled
failure, whereas multiplication of both terms by the extra `T(D)` gives
the bottom pair (24)--(25), which passed all tests.  Replacing the derivative
block by `G(D)R` fails in both orientations.  These distinctions are recorded
in `endpoint_G_repair_proper_position_probe_20260802.json`.

Three attractive ways to overgeneralize (29)--(31) are false:

1. The full deformation obtained by replacing `T` with `T+SQA` is not
   stable; it failed 30 of 160 exact line tests for `1<=m<=10`.
2. Individual terms of the binomial expansion of `T^b` are often unstable
   even after applying `G`, and neither adjacent nor symmetrized slices have
   a consistent proper-position orientation.
3. The bare constant-coefficient symbol is not stable.

The corresponding records are
`endpoint_T_shift_family_stability_probe_20260802.json` and
`G_repair_T_slice_proper_position_probe_20260802.json`.  Therefore the
remaining theorem must retain the complete binomial Laguerre convolution;
it is not a termwise closure statement.

## 14. Wishart-cut interpretation and rank-four `G`

The factorial normalization in (12) has an exact random-matrix meaning.  If
`Z` is an `n` by `a` standard real Gaussian matrix and

\[
 \chi_{n,a}(X):=n!P_n^a(X),
\]

then

\[
 \chi_{n,a}(X)=\mathbb E\det(XI_n+ZZ^{\mathsf T}).    \tag{32}
\]

Indeed, the coefficient of `X^(n-k)` on both sides is
`binom(n,k)(a)_k`.  The complete binomial Laguerre convolution (16) can
therefore be rewritten as

\[
 B_N^{a,b}=\frac{b!}{(N!)^2}\sum_{k=0}^b
 \binom Nk\binom N{b-k}
 \chi_{N-k,a+k}(X)\chi_{N-b+k,a+b-k}(Y).             \tag{33}
\]

Each summand is the product of two expected Wishart characteristic
polynomials.  In each block the row and column dimensions have constant sum
`N+a`; the index `k` transfers `k` dimensions from rows to columns in the
first block, and `b-k` in the second.  Thus (33) is a weighted two-cut
Wishart mixture.  This makes finite-free or mixed-characteristic techniques
natural candidates, while the failed slice tests show that a generic positive
mixture theorem is insufficient.

The `G` correction itself has rank four as a separable kernel.  With

\[
 \phi_0(z)=1+z,\quad
 \phi_1(z)=z(1+z)^2,\quad
 \phi_2(z)=z^2(1+z)^3,
\]

one has

\[
 G(z,w)=\phi_2(z)\phi_0(w)+\phi_0(z)\phi_2(w)
       +2\phi_1(z)\phi_1(w)-zw.                     \tag{34}
\]

For the defect-four seed `f=P_N^(N-4)`, the four univariate images in
(34) are respectively

\[
 P_{N-2}^{N-1},\quad P_N^{N-3},\quad
 P_{N-1}^{N-2},\quad P_{N-1}^{N-4},                 \tag{35}
\]

and `P_(N-1)^(N-2)=X P_(N-2)^(N-1)/(N-1)`.  The
rank-four coefficient kernel has signature `(2,2)`, so (34) is a signed
Christoffel/Turan correction rather than a positive Gram decomposition.
Equations (32)--(35) and 145 exact component checks are recorded in
`wishart_cut_laguerre_identity_certificate_20260802.json`.

## 15. Hermite/matching lift, smoothing threshold, and excluded lifts

The dimension-transfer sequence in (33) has a compact one-variable
generating function.  Put

\[
 F_{N,a}(X,U)=\sum_{k=0}^N\binom Nk
  \chi_{N-k,a+k}(X)U^k.
\]

Then exact coefficient extraction gives

\[
 F_{N,a}(X,U)
 =N![z^N](1+z)^a\exp\{(X+U)z+Uz^2\},                 \tag{36}
\]

and the complete two-cut convolution is the fixed component

\[
 B_N^{a,b}=\frac{b!}{(N!)^2}[U^b]
 F_{N,a}(X,U)F_{N,a}(Y,U).                           \tag{37}
\]

Formula (36) is also a partial-matching exponential generating function.
The factor `U z` marks a selected unmatched movable vertex, `U z^2`
marks a movable--movable dimer with labelled weight `2U`, and `(1+z)^a`
accounts for the `a` fixed vertices.  In differential form the transferred
Wishart polynomials obey

\[
 \chi_{N-k-1,a+k+1}
 =\frac{1}{N-k}(D+D^2)\chi_{N-k,a+k}.                \tag{38}
\]

Thus the binomial cut sum is an exact generalized-Hermite heat flow.  If
`mathscr U` is the umbral map defined by

\[
 \mathscr U(e^{Xt})=e^{X(t+t^2)},
\]

then

\[
 \mathscr U(D+D^2)=D\mathscr U.                     \tag{39}
\]

Equations (36)--(39) have been checked in 392 exact symbolic cases in
`matching_hermite_umbral_identity_certificate_20260802.json`.  They give
two possible proof languages for the endpoint lemma: a fixed-component
matching argument, or ordinary differentiation after umbral conjugacy.
Neither is yet a proof because coefficient extraction in `U` and the inverse
umbral map do not preserve stability without an additional hypothesis.

There is finite evidence for precisely such an additional ``enough
smoothing'' hypothesis.  Exact affine-line scans of

\[
 \mathcal B_N[A^{N-4}T^bG]
 \quad\hbox{and}\quad
 \mathcal B_N[A^{N-3}T^bG^2]
\]

over `4<=N<=21` show an eventual stable-looking region beginning near
`N/2` for the first family and near `(N-3)/2` for the second.  Every sampled
Erdos endpoint lies beyond the observed entry level.  The boundary is not
perfectly represented by one rounded linear formula in the current samples,
so this is a theorem target rather than a conjectured exact threshold.  See
`fixed_defect_G_smoothing_threshold_probe_20260802.json`.

Two stronger shortcuts are false.  First, the whole exponential tail

\[
 \sum_{k\geq0}\mathcal B_N[A^{N-d}G^gT^{b+k}]U^k/k!
\]

is not stable, even when `b` is the Erdos endpoint; 59 of the sampled
endpoint lines failed.  Hence the desired statement is genuinely about a
fixed component or its oriented neighbor, not a stable parent series.  This
is recorded in `repaired_exponential_T_tail_stability_probe_20260802.json`.

Second, although

\[
 G=\det\begin{pmatrix}AT^2&z\\w&T\end{pmatrix},      \tag{40}
\]

the standard total-degree homogenization and separate polarization of the
bare repaired endpoint is not the Plucker vector of one Grassmannian point.
For `m=1,2`, respectively 4,495 and 4,745 of 5,000 sampled exact quadratic
Plucker relations were nonzero; a single such relation is already a rigorous
disproof of this lift.  Explicit rational violations are saved in
`naive_grassmannian_plucker_lift_disproof_20260802.json`.  This excludes only
the naive single-point lift.  It does not exclude a mixed-characteristic,
sum-of-minors, or totally-nonnegative-operator representation, which is the
remaining determinantal route.

## 16. Hypergeometric finite-free factors and a uniform interlacing theorem

The umbral images of all three fixed-defect seeds have terminating
hypergeometric forms.  With `mathscr U(e^(Xt))=e^(X(t+t^2))`, exact
coefficient comparison gives

\[
\begin{aligned}
 \mathscr U(P_N^{N-1})
  &=NX\,{}_2F_2(-(N-1),N+1;3/2,2;-X/4),\\
 \mathscr U(P_N^{N-3})
  &={(N-1)X^2\over2}\,{}_2F_2(-(N-2),N;3/2,3;-X/4),\\
 \mathscr U(P_N^{N-4})
  &={X^2\over2}\,{}_2F_2(-(N-2),N-1;1/2,3;-X/4).
                                                        \tag{41}
\end{aligned}
\]

Up to normalization, their nonzero factors are respectively the
multiplicative finite-free convolutions

\[
 P_n^{(1/2,1/2)}\boxtimes_n L_n^{(1)},\qquad
 P_n^{(1/2,1/2)}\boxtimes_n L_n^{(2)},\qquad
 P_n^{(-1/2,1/2)}\boxtimes_n L_n^{(2)}.              \tag{42}
\]

The real-negative-rootedness required here is therefore a direct instance
of the positive-root theorem of Martinez-Finkelshtein--Morales--Perales,
*Real roots of hypergeometric polynomials via finite free convolution*
(arXiv:2309.10970).  The hypotheses are met with equality or strict
inequality in each Jacobi--Laguerre factor.

More importantly, the previously experimental consecutive-degree
interlacing has a short uniform proof.  For `alpha,beta>-1` and `c>0`, put

\[
 J_n(x)={}_2F_1(-n,n+\alpha+\beta+1;\alpha+1;x)
\]

and let the diagonal operator `T_c` be defined by

\[
 T_c(x^k)={x^k\over(c)_k}.
\]

Then

\[
 T_cJ_n={}_2F_2(-n,n+\alpha+\beta+1;\alpha+1,c;x).   \tag{43}
\]

The exponential symbol of `T_c` is

\[
 \sum_{k\ge0}{z^k\over(c)_k k!}
 ={}_0F_1(;c;z)
 =\Gamma(c)z^{(1-c)/2}I_{c-1}(2\sqrt z).             \tag{44}
\]

Its zeros are `-j_(c-1,k)^2/4`, hence all real and negative.  The
Polya--Schur theorem therefore says that `T_c` is a multiplier sequence.
Consecutive Jacobi polynomials interlace, so every real linear combination
of `J_n,J_(n-1)` is real-rooted by Hermite--Kakeya--Obreschkoff.  Applying
`T_c` to each such combination and invoking the converse HKO implication
proves that the two polynomials in (43) also interlace.  This covers (41)
with

\[
 (\alpha,\beta,c)=(1/2,1/2,2),\ (1/2,1/2,3),\
 (-1/2,1/2,3).                                      \tag{45}
\]

Thus the Stieltjes/compression representation of each consecutive ratio is
now a theorem rather than finite evidence.  Equations (41)--(45) and 123
exact transformation checks are recorded in
`jacobi_multiplier_interlacing_transfer_certificate_20260802.json`; the
finite-free identities and 80 earlier root-isolation checks are in
`umbral_hypergeometric_finite_free_structure_certificate_20260802.json`.

For the defect-three pair `g_N=mathscr U(P_N^(N-3))` and
`h_N=g_(N-1)`, coefficient ratios also give the exact contiguous
differential identity

\[
\begin{aligned}
2(N-1)(N-3)h_N={}&(2N(N-1)-NX)g_N\\
 &+\{X^2-2(2N-1)X\}g_N'+4X^2g_N''.                 \tag{46}
\end{aligned}
\]

The arbitrary-coefficient residual simplifies identically to zero, with 37
complete exact polynomial checks, in
`defect3_contiguous_differential_relation_certificate_20260802.json`.

The 2015 Johnston--Jordaan quasi-orthogonality theorem was also checked
against these parameters.  It proves useful Laguerre expansions, but its
sharp interlacing statements concern fixed numerator gaps one and two.  In
our defect-three family the gap grows with the degree, so that paper alone
does not supply (43); the multiplier-sequence argument above does.

## 17. What the transformed core tests do and do not prove

After umbral conjugacy, the unsmoothed bottom and group cores are

\[
 (D_X+D_Y)^2(g_N(X)g_N(Y))-g_{N-1}(X)g_{N-1}(Y)      \tag{47}
\]

and

\[
 (D_X+D_Y)^4(g_N(X)g_N(Y))
 -2(D_X+D_Y)^2(g_{N-1}(X)g_{N-1}(Y))
 +g_{N-2}(X)g_{N-2}(Y),                             \tag{48}
\]

with defect three in (47) and defect one in (48).  On 1,200 exact
positive-direction affine-line tests (`1<=m<=20`, 30 lines per case), there
were 17 failures, all at small parameters.  The bottom core had no sampled
failure for `5<=m<=20`, and the group core none for `6<=m<=20`.  This is
recorded in `umbral_repaired_core_stability_probe_20260802.json`.  It
supports an eventual-core theorem plus finitely many smoothed base cases;
it does not prove such a threshold.

The inverse Borel shortcut is false.  Including the forced `X^2` factor,
the defect-three seed is a coordinatewise `T_1(x^k)=x^k/k!` image of a
Jacobi polynomial, and `T_1^(-1)DT_1` is the backward shift
`x^k -> x^(k-1)`.  Nevertheless, pulling (47) and its endpoint derivatives
back through `T_1` produced nonstable Chebyshev kernels: all 30 sampled
lines failed for each of the first three endpoint parameters.  Thus the
forward multiplier is performing essential stability repair, and a proof
must quantify that repair rather than remove it.

Finally, the independent-root-direction strengthening is also false.
Writing the rigorous consecutive ratio as a Stieltjes transform and
replacing the tied resolvents `1/(z-r_i)` by independent variables produces
a homogeneous multiaffine coefficient polynomial.  At the endpoint its
subset coefficient is

\[
 d(d-1)-\Lambda_U(S)\Lambda_V(S),\qquad d=b+2,       \tag{49}
\]

where the positive residues in each block sum to `N`.  Already for `m=1,2`
some coefficients in (49) are negative.  Hence no independent-variable
stable-operator theorem can prove the endpoint.  The remaining statement is
genuinely a tied-resolvent or bivariate-kernel phenomenon.

## 18. Universal Catalan lowering and the common endpoint operator

The three fixed-defect umbral families have a degree-lowering operator that
is independent of the defect.  Define the formal differential operator

\[
 \Phi(D)=\sum_{j\geq1}(-1)^{j-1}C_jD^j
 =D-2D^2+5D^3-14D^4+42D^5-\cdots,                 \tag{50}
\]

where `C_j` is the `j`th Catalan number.  Its closed form and inverse
relation are

\[
 \Phi(t)={\sqrt{1+4t}-1\over\sqrt{1+4t}+1},
 \qquad t={\Phi(t)\over(1-\Phi(t))^2}.             \tag{51}
\]

If `g_(N,d)` denotes any of the defect `d=1,3,4` umbral seeds used above,
then coefficient comparison gives the exact identity

\[
 g_{N-1,d}=\Phi(D)g_{N,d}.                          \tag{52}
\]

Because the polynomials terminate, (50) is an ordinary finite differential
operator on every instance.  Put `S=D_X+D_Y` and

\[
 Q=S^2-\Phi(D_X)\Phi(D_Y).                          \tag{53}
\]

Equations (47)--(48) now collapse to one structure:

\[
 \text{bottom core}=Q\{g_N(X)g_N(Y)\},\qquad
 \text{group core}=Q^2\{g_N(X)g_N(Y)\}.            \tag{54}
\]

Consequently the full endpoint families are, up to their already removed
positive constants,

\[
 S^bQ^r\{g_N(X)g_N(Y)\},\qquad r=1\text{ (bottom)},
 \quad r=2\text{ (group)}.                         \tag{55}
\]

This is an exact unification, not a numerical fit.  It passed 81 complete
lowering checks and 24 complete two-variable core checks in
`catalan_lowering_operator_identity_certificate_20260802.json`.

There are two important cautions.  First, writing
`E=Phi(D)` gives `D=E/(1-E)^2`, so (53) has a suggestive nonnegative formal
coefficient expansion in the commuting lowering variables; positivity of
that expansion alone does not imply stability.  Second, the
Borcea--Branden algebraic symbol of `S^bQ`, on the relevant bounded-degree
spaces, failed exact positive-direction line tests already at the first
three endpoint parameters.  Thus `Q` is not a global stability preserver.
The proof must use its action on these special interlacing seeds.

One initially promising formulation was oriented proper position.  Let

\[
 A=S^{b+2}(g_N\otimes g_N),\qquad
 B=S^b(g_{N-1}\otimes g_{N-1}).                    \tag{56}
\]

The forward pencil `A+uB` is generally nonstable in exact tests, whereas
the reverse pencil `B+uA` had no failure on an initial 600 exact
positive-direction lines (30 for every `1<=m<=20`).  The forward orientation
failed 535 of the same 600 lines.  That initial record is
`catalan_smoothed_proper_position_probe_20260802.json`.

This observation is now superseded.  A later wide-range exact search found a
failure already at `m=1`; see Section 22.  Hence `B+uA` is not uniformly real
stable and cannot supply the HKO shortcut to `A-B`.

A natural two-block refinement does not prove the pencil.  Splitting the
target as

\[
 S^b\{g''\otimes g+g\otimes g''\}
 +S^b\{2g'\otimes g'-g_{N-1}\otimes g_{N-1}\}
\]

produces an empirically stable middle block (zero failures on 300 exact
lines) and an edge block with failures only at `m=1`.  However, both
orientations of the pencil between these two blocks fail repeatedly (43 and
105 of 300 lines).  Thus the successful proper position is genuinely the
contiguous `B+uA` relation in (56), not a consequence of separately pairing
the edge and middle pieces.  See
`bottom_edge_middle_proper_position_probe_20260802.json`.

Nor does the successful pencil follow from interlacing/compression alone.
Replacing the hypergeometric pair by a generic monic negative-rooted
polynomial `p` and an arbitrary Hermitian compression `q`, with the same
endpoint relation `N=3m+3`, `d=2m+3`, produced 17 exact nonreal-line
witnesses among 480 tests for `1<=m<=5`.  Even the symmetric compression
`q=p'/N` failed at `m=1` and `m=5`.  These witnesses are saved in
`generic_compression_endpoint_pencil_probe_20260802.json`.  A proof must
therefore use the Jacobi-multiplier/Catalan structure of the actual pair,
not merely its real-rootedness and consecutive interlacing.

## 19. Fixed-size mixed determinant and the compression boundary

The endpoint difference has an exact matrix-polarization form.  Let `p` be
monic of degree `N`, let `q` be a monic interlacer realized as the endpoint
principal minor of a Hermitian matrix `G`, and put

\[
 M(X,Y)=\operatorname{diag}(XI-G,YI-G).
\]

Let `e,f` be the two distinguished compression coordinates in the two
blocks, and define

\[
 C_c=I+c(ef^*+fe^*),\qquad
 c^2={N^2\over d(d-1)}.                            \tag{57}
\]

The matrix determinant lemma gives

\[
 \det(M+tC_c)=p(X+t)p(Y+t)-c^2t^2q(X+t)q(Y+t).
\]

Consequently

\[
 d![t^d]\det(M+tC_c)
 =S^d(p\otimes p)-N^2S^{d-2}(q\otimes q).          \tag{58}
\]

Equivalently, (58) is a fixed-size sum of principal minors.  Every retained
minor has weight one, except a minor avoiding both distinguished coordinates
has weight `1-c^2`.  At the bottom endpoint `N=3m+3`, `d=2m+3`, one has
`c>1`; hence `C_c` has exactly one negative eigenvalue.  This both explains
the earlier PSD budget obstruction and isolates the sole indefinite
direction.

The mixed-determinant theorem of Borcea--Branden does not by itself prove
(58).  Their Theorem 2.6 permits arbitrary Hermitian *constant* terms but
requires every variable coefficient matrix to be positive semidefinite.
Expression (58) is instead a fixed coefficient of a mixed discriminant in
the indefinite variable direction `C_c`; the paper explicitly distinguishes
mixed determinants from mixed discriminants.  Direct random symmetric-matrix
tests also give exact nonreal coefficients of `[t^d]det(zI-A+tB)` for
indefinite Hermitian `B`, so no unrestricted Hermitian-direction theorem is
available.

Moderately balanced generic compressions initially looked universal: the
endpoint target in (58) had no failure on 1,600 exact positive-direction
lines for `1<=m<=8`.  Adversarial residue tests corrected that impression.
When the compression measure was concentrated by a factor `10^12` near an
interior root, the same target failed on 122 of 960 exact lines; endpoint-
concentrated measures often still passed.  See
`generic_compression_endpoint_target_probe_20260802.json` and
`spiky_compression_endpoint_target_probe_20260802.json`.  Thus the relative
position of the compression vector and `G`, not just the inertia of `C_c`,
is essential.

Universal Catalan lowering is also insufficient.  For generic distinct
negative roots, setting `h=Phi(D)p` produced only four target failures and
three reverse-pencil failures among 1,280 exact lines, all at `m=2,3`.
However, the repeated-root algebraic-symbol seed `p=X^N` fails both the
target and reverse pencil at every tested endpoint through `m=30`.  Hence
there is no eventual global stability-preserver theorem for `S^bQ`; the
actual Jacobi-multiplier root geometry remains indispensable.  The records
are `generic_catalan_lowered_endpoint_pencil_probe_20260802.json` and
`catalan_monomial_endpoint_probe_20260802.json`.

Finally, the strict nonzero factors of the defect-three pair do possess the
unique endpoint Jacobi-matrix realization supplied by the Stieltjes
algorithm.  Exact extraction through `N=20` confirms positive squared
off-diagonal entries, but after the first two entries the rational recurrence
parameters become large rather than collapsing to a simple classical Jacobi
formula.  This rules out the naive simple-path-coefficient shortcut while
leaving a structured matching or finite-free representation open.  See
`defect3_jacobi_parameters_20260802.json`.

At this stage of the search the apparent remaining lemma was the reverse
proper-position pencil (56) for the specific Jacobi-multiplier seed.  Section
22 records an exact counterexample to that stronger pencil.  The actual
endpoint difference remains viable, but proper position is no longer an
available route to it.

## 20. Chebyshev path identity and a common rank-one finite-free lift

The defect-three seed has an especially simple inverse-Borel form that was
obscured by the hypergeometric normalization.  Put `n=N-2` and let
`T_1(X^k)=X^k/k!`.  Then

\[
 g_N(X)=T_1\{X^2U_n(1+X/2)\},                     \tag{59}
\]

where `U_n` is the Chebyshev polynomial of the second kind.  Thus the
preimages satisfy the path recurrence

\[
 F_N=(X+2)F_{N-1}-F_{N-2},\qquad
 F_N=X^2U_{N-2}(1+X/2).                           \tag{60}
\]

Moreover `D T_1=T_1 B`, where `B(X^k)=X^(k-1)` is the backward shift.
Consequently the entire endpoint pencil is exactly `T_1 tensor T_1` applied
to the corresponding backward-shift Chebyshev kernel.  Equations (59)--(60),
the intertwining relation on the monomial basis through degree 100, and four
complete endpoint conjugacy checks are recorded in
`defect3_chebyshev_borel_identity_certificate_20260802.json`.  This is an
identity, not the missing stability statement; the inverse-Borel kernel is
known to be nonstable.

There is a stronger common-degree finite-free formulation.  Normalize

\[
 J_n(X)={U_n(1+X/2)\over n+1},\qquad
 H_n(X)={2g_N(X)\over(n+1)X^2},
\]

and define `rev_n f(Z)=Z^n f(1/Z)`.  If
`L_n(X)={}_1F_1(-n;3;X)`, then the *same ambient-degree factor* gives

\[
\begin{aligned}
 \operatorname{rev}_n H_n
   &=\operatorname{rev}_n J_n\boxtimes_n\operatorname{rev}_n L_n,\\
 \operatorname{rev}_n H_{n-1}
   &=\operatorname{rev}_n J_{n-1}\boxtimes_n\operatorname{rev}_n L_n.
                                                               \tag{61}
\end{aligned}
\]

The second line uses degree-`n` reversal, so both sides have a zero root.
This is materially stronger than two separate convolutions in degrees `n`
and `n-1`: the consecutive pair is acted on by one common operator.  Forty-
nine exact checks through `n=50` are in
`defect3_common_finite_free_factor_certificate_20260802.json`.

Equation (61) also has an explicit coupled matrix lift.  Let

\[
 K_n=2I-A(P_n).
\]

Then `J_n(X)=det(I+X K_n^(-1))`, and

\[
 K_n^{-1}-\operatorname{diag}(K_{n-1}^{-1},0)=vv^*,\qquad
 v={1\over\sqrt{n(n+1)}}(1,2,\ldots,n)^T.          \tag{62}
\]

Thus the two negative-semidefinite matrices whose characteristic
polynomials are the reversed Chebyshev pair differ by one positive rank-one
update.  The Laguerre factor in (61) has positive roots.  Applying the
Marcus--Spielman--Srivastava expected-characteristic-polynomial formula with
one common positive matrix and one common Haar rotation therefore realizes
the two reversed transformed seeds as a coupled pair; samplewise, after the
standard Hermitian similarity, the previous matrix is a positive rank-one
update of the current matrix.  The rank-one identity was checked exactly
through `n=50`, and the characteristic/convolution identities through
`n=12`, in
`defect3_rankone_random_matrix_lift_certificate_20260802.json`.

Two controls delimit this route.  First, forcing a common double zero in an
otherwise generic compression pair still produced four exact reverse-pencil
failures among 800 lines, so nullity two and rank-one interlacing alone are
not sufficient (`double_zero_generic_compression_pencil_probe_20260802.json`).
Second, arbitrary indefinite mixed-discriminant coefficients produced 185
exact failures already in dimensions 3--7
(`indefinite_mixed_discriminant_real_rootedness_probe_20260802.json`).

The common Laguerre average in (61), together with the rank-one path coupling
(62), does not preserve the full two-block proper-position pencil (56): the
exact failure is given in Section 22.  It may still preserve the single
endpoint difference `A-B`, which is the weaker statement actually required.
Neither the generic compression theorem nor the unrestricted Hermitian
mixed-discriminant theorem can establish that weaker claim automatically.

## 21. Complete exponential kernels and quantitative smoothing

The Chebyshev identities can be summed over the dimension.  Put

\[
 \psi(t)={t\over(1-t)^2}.
\]

For defects three and one respectively, the complete seed generating
functions are

\[
\begin{aligned}
 \sum_{N\geq2}g_{N,3}(X)t^{N-2}
  &={(1-t)^2\over t^2}\{e^{X\psi(t)}-1-X\psi(t)\},\\
 \sum_{N\geq1}g_{N,1}(X)t^{N-1}
  &={e^{X\psi(t)}-1\over t}.                         \tag{63}
\end{aligned}
\]

Consequently all derivatives beyond the forced zero multiplicity are pure
Sheffer kernels:

\[
\begin{aligned}
 \sum_{N\geq2}g_{N,3}^{(r)}(X)t^{N-2}
  &={t^{r-2}\over(1-t)^{2r-2}}e^{X\psi(t)},&&r\geq2,\\
 \sum_{N\geq1}g_{N,1}^{(r)}(X)t^{N-1}
  &={t^{r-1}\over(1-t)^{2r}}e^{X\psi(t)},&&r\geq1. \tag{64}
\end{aligned}
\]

These are exact formal-power-series identities.  They were checked in 61
complete seed cases, 383 derivative coefficient cases, and 18 symbolic
two-block kernels in
`defect3_exponential_generating_kernel_certificate_20260802.json`.

The two-block formulas are also compact.  Set `a=psi(t)`, `c=psi(u)` and
let `K_(d,j)` denote `S^d` applied to the product of the two complete
defect-`j` series.  For `d>=1`,

\[
 K_{d,1}={1\over tu}\{(a+c)^de^{aX+cY}
               -a^de^{aX}-c^de^{cY}\}.             \tag{65}
\]

For defect three and `d>=3`, with
`C_t=(1-t)^2/t^2` and `C_u=(1-u)^2/u^2`,

\[
\begin{aligned}
K_{d,3}=C_tC_u\{&(a+c)^de^{aX+cY}\\
 &-e^{aX}[a^d(1+cY)+dc a^{d-1}]\\
 &-e^{cY}[c^d(1+aX)+da c^{d-1}]\}.                 \tag{66}
\end{aligned}
\]

Thus the bottom target is exactly the diagonal coefficient

\[
 [t^nu^n]\{K_{b+2,3}-tuK_{b,3}\},qquad
 n=N-2,                                             \tag{67}
\]

and its reverse proper-position pencil replaces the minus sign by
`tu K_(b,3)+U K_(b+2,3)`.  The group target has an especially revealing
factorization:

\[
\begin{aligned}
&K_{b+4,1}-2tuK_{b+2,1}+t^2u^2K_{b,1}\\
={1\over tu}\{&e^{aX+cY}(a+c)^b((a+c)^2-tu)^2\\
 &-e^{aX}a^b(a^2-tu)^2-e^{cY}c^b(c^2-tu)^2\}.      \tag{68}
\end{aligned}
\]

The common factor `((a+c)^2-tu)` in (67)--(68) is the generating-function
version of the Catalan operator `Q` in (53), since `t=Phi(a)` and
`u=Phi(c)`.  Equations (63)--(68) reduce both endpoint lemmas to diagonal
coefficients of one positive exponential kernel plus two explicit boundary
corrections.  This is a potentially more tractable total-positivity or
matching formulation than the raw hypergeometric polynomials.

The amount of smoothing can be varied by replacing the actual `T_3` with
`T_c(X^k)=X^k/(c)_k`.  On 1,800 exact affine lines (`1<=m<=15`), the reverse
pencil had no failure for

\[
 c=1/2,1,2,3,4,5,8,16,64,
\]

whereas the unsmoothed Chebyshev family had four failures.  Because the
correct unsmoothed limit is `T_c(cX)`, those four limit witnesses were then
replayed with `X,Y` scaled by `c` and the pencil variable by `c^2`.  The
actual value `c=3` repaired all four exactly.  Persistent failures appeared
by `c=16` in the `m=1` witness, by `c=256` in the `m=5` witness, and by
`c=1024` in the `m=11` witness; the `m=8` witness had a nonmonotone isolated
failure at `c=16`.  Hence a uniform sufficient smoothing bound is plausible,
but monotonicity in `c` is false.  See
`jacobi_multiplier_parameter_proper_position_probe_20260802.json` and
`jacobi_multiplier_transition_witness_probe_20260802.json`.

Finally, the rank-one Haar lift does not prove the pencil samplewise.  A
floating-point signed-permutation realization found 87 robust sample-pencil
failures among 2,400 lines through `m=6`, even though the averaged endpoint
continues to pass exact tests.  The common Laguerre average therefore creates
the observed stability rather than merely preserving a pointwise matrix
relation (`rankone_laguerre_sample_pencil_probe_20260802.json`).

## 22. Total positivity applies, but the proper-position shortcut is false

The derivative arrays in (64) are genuine totally positive exponential
Riordan arrays.  Indeed

\[
 \psi(t)={t\over(1-t)^2},\qquad
 {t^{r-2}\over(1-t)^{2r-2}},\qquad
 {t^{r-1}\over(1-t)^{2r}}
\]

are Pólya-frequency functions: each is in the Edrei product form consisting
of a nonnegative monomial and positive powers of `(1-t)^(-1)`.  Zhu's total-
positivity theorem for exponential Riordan arrays therefore applies to the
coefficient matrices of both derivative kernels.  Removing the conventional
row factors `n!` is a positive diagonal rescaling and preserves total
positivity.  This gives exact coefficient-minor and moment inequalities, but
does not imply multivariate proper position.

In fact the proposed reverse pencil (56) is false already for `m=1`.  Thus
`N=6`, `b=3`, and on the positive-direction affine line

\[
 X=-5+10q,\qquad Y=-170+3q,\qquad U=-59+12q,
\]

the specialization of `B+UA`, after multiplication by a positive common
denominator and removal of the coefficient gcd, has ascending coefficient
list

\[
\begin{split}
(&-4344894557703000,-2543179528385595,9087597350371200,\\
 &-4369261798338045,835525270960625,-73505575945998,\\
 &3075244420311,-58865180586,413061480).
\end{split}                                                    \tag{69}
\]

The degree-eight polynomial (69) is squarefree.  An exact Sturm count gives
only six real roots, so the remaining two form a nonreal conjugate pair.
Independently, the coordinate Wronskian

\[
 W_X=(\partial_XB)A-B(\partial_XA)
\]

takes the exact values

\[
 W_X(-50,-50)=2838826036110296000>0,
 \qquad
 W_X(-50,0)=-{192563841958000\over27}<0.             \tag{70}
\]

The complete reproducible calculation, including rational line coefficients
and isolating intervals for all six real roots, is in
`reverse_proper_position_counterexample_20260802.json`, generated by
`verify_reverse_proper_position_counterexample.py`.

This does **not** refute the required endpoint difference `A-B`; the earlier
exact tests of that difference still stand.  It refutes the stronger HKO
route that tried to obtain the difference from stability of every pencil
member.  A still stronger shifted parent-pencil lift also fails on 12 of its
first 30 exact lines at `m=1`, showing that the endpoint differentiation is
itself part of the stability repair.  The remaining target must therefore be
proved directly (or disproved directly), most plausibly by exploiting the
diagonal coefficient and boundary-correction structure in (66)--(68), not by
uniform proper position.

## 23. Derivative threshold and the Catalan-predecessor kernel

There is a positive expansion that makes the amount of endpoint
differentiation explicit.  Write `E=Phi(D)`, so that

\[
 D={E\over(1-E)^2},\qquad
 A(i,r):=[E^i]D^r=
 \begin{cases}
  \delta_{i0},&r=0,\\
  \binom{i+r-1}{i-r},&r\geq1,\ i\geq r,\\
  0,&\text{otherwise}.
 \end{cases}                                             \tag{71}
\]

For a degree-`N` defect-three seed put `v_i=Phi(D)^i g_N`,
`0<=i<=N`.  The inverse relation in (71) gives the exact finite identity

\[
 g_N^{(r)}=\sum_{i=0}^N A(i,r)v_i.                       \tag{72}
\]

Hence, for

\[
 F_{N,d}=S^d(g_N\otimes g_N)
          -S^{d-2}(g_{N-1}\otimes g_{N-1}),
\]

one has

\[
 F_{N,d}=\sum_{i,j=0}^N C_d(i,j)v_i(X)v_j(Y),            \tag{73}
\]

where `C_d(i,j)` is the coefficient of `E^iF^j` in

\[
 (D(E)+D(F))^{d-2}
 \bigl((D(E)+D(F))^2-EF\bigr).                          \tag{74}
\]

Equations (71)--(74) were checked in 187 complete derivative cases and six
complete endpoint expansions.  In the first two endpoint sizes (`N=6,9`),
every minor of `C_d J`, where `J` reverses the columns, is nonnegative.  Thus
the coefficient kernel again has the reverse-total-nonnegative sign pattern
seen in Section 8.

That sign pattern is not the missing theorem.  Already for `N=6,d=4`, the
truncated polynomial `sum C_d(i,j)E^iF^j` on the positive-direction line

\[
 E=-7+4q,\qquad F=7+4q                              \tag{75}
\]

is squarefree of degree 12 and has **no real roots** by an exact Sturm
count.  Its lowest total-degree part is

\[
 (E+F)^{d-2}(E^2+EF+F^2),                            \tag{76}
\]

which already explains the obstruction.  The full exact coefficient list
and the exhaustive minor counts are in
`endpoint_predecessor_kernel_structure_20260802.json`, generated by
`verify_endpoint_predecessor_kernel_structure.py`.

The composed target behaves very differently.  Broad exact affine-line
searches found a sharp-looking derivative threshold.  Since

\[
 F_{N,d+1}=S F_{N,d},                                  \tag{77}
\]

stability at one order propagates to every higher order.  For
`N=6,9,12,15,18`, failures persisted at low orders and disappeared at or
before

\[
 d_0=\left\lfloor{N+3\over2}\right\rfloor.            \tag{78}
\]

Targeted exact tests through `N=39` likewise found no failure at `d_0` or
above, while orders immediately below it continued to fail in most sizes.
The Erdős endpoint has `N=3m+3` and `d=2m+3`, which lies safely above (78).
This remains finite evidence, not a proof.  Together with the counterexample
(75), it says that differentiation repairs stability only after the kernel
is composed with the special Catalan/Laguerre chain; neither the kernel nor
reverse total positivity alone can explain the repair.

## 24. A rigorous stable decomposition of every non-edge term

The bottom target admits a second decomposition in which every term except
the two extreme derivative terms is provably stable.  Put `g=g_N`,
`h=g_(N-1)`, and for `0<=a<=d-2` define

\[
\begin{aligned}
 C_a(X,Y)={}&\binom d{a+1}g^{(a+1)}(X)g^{(d-a-1)}(Y)\\
 &-\binom{d-2}a h^{(a)}(X)h^{(d-a-2)}(Y).          \tag{79}
\end{aligned}
\]

Then the exact binomial expansion is

\[
 F_{N,d}=g(X)g^{(d)}(Y)+g^{(d)}(X)g(Y)
           +\sum_{a=0}^{d-2}C_a(X,Y).               \tag{80}
\]

Every `C_a` is real stable.  This follows uniformly from one new proper-
position relation.  Let `n=N-2`,

\[
 J_n(X)={}_2F_1(-n,n+2;3/2;-X/4),
 \qquad T_c(X^k)={X^k\over(c)_k}.
\]

Direct coefficient comparison gives

\[
\begin{aligned}
 g_N&={N-1\over2}X^2T_3J_n,\\
 g_N'&=(N-1)XT_2J_n,\\
 g_{N-1}&=(N-2)XT_2(XJ_{n-1}).                     \tag{81}
\end{aligned}
\]

The roots of `J_n` and `XJ_(n-1)` interlace: ordinary consecutive Jacobi
interlacing supplies all roots in `(-4,0)`, and the extra factor adds the
right endpoint zero.  As in (43)--(45), `T_2` is a Pólya--Schur multiplier
sequence.  HKO and (81) therefore show that `h` is in proper position with
`g'`.  Differentiating their stable pencil preserves the orientation, so

\[
 h^{(a)}\ll g^{(a+1)}\qquad(a\geq0).                \tag{82}
\]

For completeness, if `q/p` and `s/r` map the upper half-plane into the
same open half-plane, then

\[
 \lambda p(X)r(Y)-q(X)s(Y)                          \tag{83}
\]

is stable for every `lambda>0`: a zero would make the product
`(q/p)(X)(s/r)(Y)` positive real, which is impossible because the sum of
the two open-half-plane arguments lies strictly between `0` and `2pi`.
Apply (83) using (82) and

\[
 {\binom d{a+1}\over\binom{d-2}a}
 ={d(d-1)\over(a+1)(d-a-1)}>0                      \tag{84}
\]

to prove the claim for (79).

This decomposition does not yet prove (80), because the stable cone is not
closed under these sums.  At `N=6,d=5`, on the exact positive-direction line

\[
 X=-147+5q,\qquad Y=-72+21q,                        \tag{85}
\]

the sum `C_0+C_(d-2)` is squarefree of degree seven but has only five real
roots.  The sum of the two extreme terms in (80) is squarefree of degree
seven with only three real roots.  Thus both naive pairwise addition and a
separate edge lemma are false, even though the prescribed complete sum
continues to pass exact tests.  The identities (81), ten complete
decomposition checks, the theorem chain, and primitive integer
coefficients for both controls are in
`defect3_derivative_pair_stability_certificate_20260802.json`, generated by
`verify_defect3_derivative_pair_stability.py`.

The remaining bottom problem is consequently narrower than (55): prove
stability of the **specific binomial symmetrization** (80), using the common
proper-position chain (82) to control the cancellation of the two edge
terms.  It is not necessary to prove stability of the individual Catalan
kernel, the reverse pencil, or an arbitrary positive sum of the `C_a`.

There is no stable fixed parent from which (80) follows by one derivative.
Indeed (80) is the `d`th `Z`-derivative at zero of

\[
 g_N(X+Z)g_N(Y+Z)
 -{Z^2\over d(d-1)}g_{N-1}(X+Z)g_{N-1}(Y+Z).       \tag{86}
\]

At `m=2`, the specialization

\[
 X=-38+q,\qquad Y=7+11q,\qquad Z=-13+34q            \tag{87}
\]

of (86) has degree 18, sixteen real roots counting multiplicity, and one
nonreal conjugate pair by an exact Sturm calculation.  The primitive
coefficients and all real isolating intervals are in
`fixed_endpoint_parent_counterexample_20260802.json`, generated by
`verify_fixed_endpoint_parent_counterexample.py`.  Thus the prescribed
endpoint differentiation is essential even at the exact subtraction scale.

## 25. The broad threshold theorem is false; the actual pair has a rigid stable lift

The threshold pattern (78) does not hold for an arbitrary proper-position
pair.  A smallest exact counterexample is

\[
 g={X^4\over4}-{X^2\over2}+{1\over8},\qquad
 g'=X^3-X,qquad
 h=X^3+111X^2-100X-10.                              \tag{88}
\]

Here `g` has four real roots, `h` has three real roots, their leading
coefficients agree, and

\[
 {h\over g'}=1+{100\over X+1}+{10\over X}+{1\over X-1}. \tag{89}
\]

The positive residues in (89) certify the required proper-position
orientation.  Nevertheless, at `N=4,d=floor((N+3)/2)=3`, the target on

\[
 X=167+31q,\qquad Y=-79+35q                         \tag{90}
\]

is squarefree of degree five with only three real roots.  Its primitive
integer coefficients, in ascending order, are

\[
 44003971448, 82108256889, -53455660464,
 -15021176904, 5820972588, 1168890030.             \tag{91}
\]

Thus `h<<g'` and equal leading coefficients alone are insufficient.

The actual defect-three pair has two further exact structures.  For
`2<=j<=N`, direct simplification of the hypergeometric coefficient gives

\[
 [X^j]g_N={ (N+j-3)!\over (N-j)!(2j-3)!j!},\qquad
 {[X^j]g_{N-1}\over[X^j]g_N}={N-j\over N+j-3}.       \tag{92}
\]

Consequently, with `g=g_N` and `h=g_(N-1)`, one has the much simpler
contiguous relation

\[
 (N-3)h+Xh'=Ng-Xg',                                 \tag{93}
\]

and, after `a` differentiations,

\[
 X\{h^{(a+1)}+g^{(a+1)}\}
 =(N-a)g^{(a)}-(N+a-3)h^{(a)}.                      \tag{94}
\]

There is also an exact discrete defect identity

\[
 g_N^{[3]}-g_{N-1}^{[3]}=g_N^{[4]},                 \tag{95}
\]

where the superscript in brackets denotes the defect.  Moreover, (81) with
`T_3` and ordinary consecutive Jacobi interlacing shows

\[
 h\ll g                                                     \tag{96}
\]

in addition to (82).  This second relation can also be packaged as a useful
stable deletion--contraction lift.  Put `L=2N-3`, `a_N=g_N+g_(N-1)`, and

\[
 K_N(X;z_1,\ldots,z_L)
 =\sum_{j=2}^N [X^j]a_N\,X^j
 {e_{N-j}(z_1,\ldots,z_L)\over\binom L{N-j}}.       \tag{97}
\]

The polynomial `K_N` is stable: it is the polarization, in the homogenizing
variable, of the negative-rooted polynomial `a_N`.  If the first `L-1`
variables are set to one, then the two minors of the distinguished last
variable are exactly

\[
 K_N|_{z_L=0}=g_N,qquad
 \partial_{z_L}K_N=g_{N-1}.                          \tag{98}
\]

Indeed, for `k=N-j`, the two binomial ratios in (98) are `(L-k)/L` and
`k/L`; their quotient is `k/(L-k)=(N-j)/(N+j-3)`, exactly (92).

Equations (92)--(98), 3,534 direct coefficient checks through `N=60`, and
the exact counterexample (88)--(91) are recorded in
`defect3_contiguous_pair_structure_certificate_20260802.json`, generated by
`verify_defect3_contiguous_pair_structure.py`.  The bottom endpoint must
therefore exploit the rigid contiguous or deletion--contraction structure,
not a theorem about arbitrary interlacers.  A separate exact adversarial
scan retained both proper-position relations, the common double largest
root, and equal leading coefficients; 1,470 threshold-line tests across 147
accepted models through degree 12 found no counterexample.  This is evidence
for a narrower theorem, not a proof; the record is
`double_proper_position_threshold_probe_20260802.json`.

## 26. A rank-one Hermitian lift explains the exact endpoint order

The second proper-position relation (96) gives a useful determinant model.
After making `g` monic, write its real roots as the spectrum of a Hermitian
matrix `A`.  The positive-residue representation of `h/g` supplies a vector
`v` such that

\[
 g(X)=\det(XI-A),\qquad
 h(X)=g(X)v^*(XI-A)^{-1}v,qquad \|v\|^2=N.          \tag{99}
\]

The last normalization is exactly the equality of the leading coefficients
of `h` and `g'`.  Put `c^2=1/(d(d-1))`.  The Schur complement and the matrix
determinant lemma give the exact block lift

\[
\begin{aligned}
 &\det\begin{pmatrix}
 (X+t)I-A & ct,vv^*\\
 ct,vv^* & (Y+t)I-A
 \end{pmatrix}\\
 &\hspace{12mm}=g(X+t)g(Y+t)-c^2t^2h(X+t)h(Y+t).    \tag{100}
\end{aligned}
\]

Thus the `d`th derivative at `t=0` of (100) is exactly the bottom target.
The matrix multiplying `t` in (100) has spectrum

\[
 1\quad(2N-2\hbox{ times}),\qquad
 1+{N\over\sqrt{d(d-1)}},\qquad
 1-{N\over\sqrt{d(d-1)}}.                          \tag{101}
\]

It therefore has precisely one negative eigenvalue at the Erdős endpoint.
This is why the fixed parent (86) is nonstable while a sufficiently high
derivative can still be stable.

There is a sharp necessary derivative-cone calculation.  On a general
positive-direction line, scale the two diagonal blocks by positive numbers
`alpha,beta`, and put `x=1/alpha`, `y=1/beta`.  If `r=2N-d`, the coefficient
of degree `r` associated with the direction matrix is

\[
 \sum_k\binom Nk\binom N{r-k}
 \left(1-{k(r-k)\over d(d-1)}\right)x^ky^{r-k}.     \tag{102}
\]

Hence every leading coefficient in every positive direction is nonnegative
exactly when

\[
 d(d-1)\geq \max_k k(2N-d-k)
             =\left\lfloor{(2N-d)^2\over4}\right\rfloor. \tag{103}
\]

The first integer satisfying (103) is

\[
 d_* =\left\lfloor{2N\over3}\right\rfloor+1.       \tag{104}
\]

For the bottom family `N=3m+3`, (104) is **exactly** `d=2m+3`.
At this order (103) is strict; at `d-1=2m+2` it fails.  Thus the endpoint
order is not an accidental amount of smoothing: it is the first order at
which the unique negative rank-one direction passes the elementary
derivative-cone obstruction.

Condition (103) is not sufficient for an arbitrary compression.  At
`N=4,d=3`, let

\[
 g=(X+2)(X+1)X(X-1),\qquad
 h=4X^3+{160\over21}X^2-{76\over21}X-{48\over7}.   \tag{105}
\]

Here `h/g` has positive residues proportional to `(1,1,18,1)`, so (99)
holds and (103) is satisfied.  Nevertheless, on

\[
 X=26+20q,\qquad Y=37+27q                           \tag{106}
\]

the target is squarefree of degree five with only three real roots.  Its
primitive coefficients are

\[
 848089037320, 3127212951573, 4611501990884,
 3399427758000, 1252700461719, 184610414520.       \tag{107}
\]

The missing hypothesis in (105) is precisely the other relation (82): the
roots of `h` and `g'` do not alternate.  The block lift, spectrum, symbolic
coefficient calculation, 100 exact endpoint arithmetic checks, and (105)--
(107) are in `bottom_rankone_inertia_lift_certificate_20260802.json`, made
by `verify_bottom_rankone_inertia_lift.py`.  A viable bottom theorem is now
sharply localized: prove that (82), (96), and the boundary order (104)
together upgrade the necessary one-negative derivative-cone condition to
full bivariate stability.  The generic rank-one version is false.

## 27. Even the two proper positions and common double root are insufficient

The last abstract formulation at the end of Section 26 is still too broad.
There is an exact counterexample already at `N=4,d=3`.  Put

\[
 c={3978197409\over62500000},\qquad
 g=X^2(X+70)(X+56),\qquad h=4X^2(X+c).              \tag{108}
\]

Both polynomials have only nonpositive roots and share the largest root zero
with multiplicity two.  Their leading coefficients have the required
normalization `leading(h)=leading(g')=4`.  Moreover,

\[
 {h\over g}={396802591/218750000\over X+70}
             +{478197409/218750000\over X+56},      \tag{109}
\]

so both residues are positive and `h<<g`.  For the other proper-position
relation, after cancelling the common factor `X`, set

\[
 p={g'\over X}=4X^2+378X+7840,\qquad
 q={h\over X}=4X^2+4cX.                             \tag{110}
\]

One has `p(-c)<0`, the two roots of `p` are negative, and hence their exact
order is

\[
 r_1(p)<-c<r_2(p)<0.
\]

Equivalently, the roots of `p` and `q` alternate.  The orientation is also
certified without numerical roots: the Wronskian

\[
 q'p-qp'={1928052591X^2+245000000000X+7797266921640
              \over3906250}                         \tag{111}
\]

has positive leading coefficient and discriminant
`-5458138197319193848/762939453125<0`.  Thus `h<<g'` as well.

Nevertheless, on the positive-direction affine line

\[
 X=-92+45z,\qquad Y=-38+11z,                        \tag{112}
\]

the order-three target is a squarefree quintic with exactly three real
roots and one nonreal conjugate pair.  Its primitive coefficients in
ascending order are

\[
\begin{split}
 &-42798503501301350008520,
 -125698469931817192419286,\\
 & 80680141333901096946957,
 263632683774247297641780,\\
 &-232351869338063593750000,
 49146152343750000000000.                           \tag{113}
\end{split}
\]

The exact Sturm certificate is
`double_proper_common_root_counterexample_20260802.json`, generated by
`verify_double_proper_common_root_counterexample.py`; the randomized finder
is `probe_common_double_root_random_fast.py`.  Thus the favorable finite
sweeps in the two-proper-position family sampled a non-adversarial region.
The actual endpoint must use the coefficient multiplier (92), equivalently
the deletion--contraction lift (97)--(98), *together with* its root geometry.
Neither the two proper-position relations nor the common double boundary
root can replace that rigid structure.

## 28. The multiplier is an eigenvalue-aligned rank-one subtraction

The rigid multiplier has a stronger matrix interpretation.  Normalize
`a=g+h` to be monic, write

\[
 a(X)=\prod_{i=1}^N(X+r_i),\qquad r_i\geq0,qquad L=2N-3. \tag{114}
\]

The coefficient of `X^(N-1)` in the actual `a` is `NL`, so

\[
 \sum_i r_i=NL.                                      \tag{115}
\]

The multiplier (92), or equivalently (93), says

\[
 g={E+N-3\over L}a,\qquad h={N-E\over L}a,qquad
 E=X{d\over dX}.                                    \tag{116}
\]

Taking logarithmic derivatives of (114) gives the exact resolvent identity

\[
 {h(X)\over a(X)}={1\over L}\sum_{i=1}^N{r_i\over X+r_i}. \tag{117}
\]

Thus the rank-one weights are not arbitrary: they are exactly `r_i/L`,
proportional to the eigenvalues themselves.  Put `R=diag(r_1,...,r_N)` and
`v_i=sqrt(r_i/L)`.  The matrix determinant lemma now gives

\[
 g(X)=\det(XI+C),\qquad
 C=R-vv^*=R^{1/2}\left(I-{\mathbf1\mathbf1^T\over L}\right)R^{1/2},
                                                               \tag{118}
\]

and

\[
 h(X)=\det(XI+R)-\det(XI+C).                         \tag{119}
\]

Since `L>N` for `N>=4`, the middle matrix in (118) is positive definite;
therefore `C` is positive semidefinite.  More explicitly, every nonzero
principal minor has the universal form

\[
 \det C[S]=\left(\prod_{i\in S}r_i\right)
             \left(1-{|S|\over L}\right).           \tag{120}
\]

Equations (114)--(120) are checked for the actual defect-three pair through
`N=60`, and by 35 exact rational determinant models plus 145 principal-minor
checks, in `normalized_rankone_diagonal_lift_certificate_20260802.json`,
generated by `verify_normalized_rankone_diagonal_lift.py`.

There is also a compression form of (119).  Since `||v||^2=N`, put
`u=v/sqrt(N)`.  Then

\[
 R=C+Nuu^*,qquad
 {h(X)\over N}=\det\bigl(XI+C|_{u^\perp}\bigr).       \tag{120a}
\]

The second equality follows either from the bordered determinant formula or
from the fact that the compressions of `C` and `R` to `u^perp` coincide.
Thus `h/N` is not merely an interlacer: it is the characteristic polynomial
of one distinguished codimension-one compression of the same PSD matrix
whose characteristic polynomial is `g`.  In this language `g'/N` is the
uniform spectral-deletion polynomial, and the extra relation `h<<g'`
compares the distinguished compression with that uniform one.

This alignment explains why the counterexample (108) is still irrelevant to
the actual pair: although it has both proper positions, its compression
weights are not proportional to its diagonal eigenvalues.  Conversely,
random normalized multiplier pairs without `h<<g'` do fail the endpoint, so
(118) alone is not sufficient.  The surviving abstract bottom lemma is now:

> Let `a` be negative-rooted with a double zero and (115), define `g,h` by
> (116), and assume `h<<g'`.  Then at `d=floor(2N/3)+1`, prove that
> `S^d(g tensor g)-S^(d-2)(h tensor h)` is real stable.

This statement retains both pieces that the exact controls show are needed:
the eigenvalue-aligned rank-one subtraction (118) and the second
proper-position relation.  It is still a conjectural lemma, not a proof.

## 29. Weighted-star and exact leaf-deletion formulation

The aligned subtraction also has a direct matching-polynomial form.  The
rational arrowhead

\[
 B_X=\begin{pmatrix}1&\mathbf1^T/L\\
                     r&XI+R\end{pmatrix}             \tag{121}
\]

is diagonally similar (on the positive support) to the symmetric weighted
star having center activity one, leaf activities `X+r_i`, and edge-square
weights `w_i=r_i/L`.  Its Schur complement gives

\[
 \det B_X=g(X),\qquad
 h(X)=\sum_iw_i\prod_{j\ne i}(X+r_j).                \tag{122}
\]

Thus `g` is the weighted matching determinant of the star, while `h` is
exactly its one-edge part with the minus sign removed.

For a set `I` of leaves, let `g_I,h_I,a_I` denote the corresponding
polynomials after deleting those leaves.  Multiaffinity in the leaf
activities gives the exact derivative identities

\[
 D^kg=k!\sum_{|I|=k}g_I,\qquad
 D^kh=k!\sum_{|I|=k}h_I.                             \tag{123}
\]

Consequently the normalized endpoint target is

\[
 {F_{N,d}\over d!}
 =\sum_{|I|+|J|=d}g_I(X)g_J(Y)
 -{1\over d(d-1)}
   \sum_{|I|+|J|=d-2}h_I(X)h_J(Y).                  \tag{124}
\]

There is a useful same-index-set rewrite.  Put
`W(I)=sum_(i in I)w_i`.  Expanding the two one-edge parts in the second sum
of (124), and adjoining their two selected endpoints to the deleted sets,
gives

\[
 {F_{N,d}\over d!}
 =\sum_{|K|+|M|=d}\left{
   g_K(X)g_M(Y)-{W(K)W(M)\over d(d-1)}a_K(X)a_M(Y)
                         \right}.                  \tag{125}
\]

Each summand in braces is individually real stable.  Indeed `g_K/a_K`
maps the upper half-plane strictly into one open half-plane (apart from
degenerate zero weights), as follows from the positive-residue star
resolvent.  Hence the product of the two ratios cannot equal the positive
real number `W(K)W(M)/(d(d-1))`.  Equivalently, the summand is the matching
determinant of the two residual stars coupled by one center--center edge of
square weight `W(K)W(M)/(d(d-1))`.

Equation (125) does not finish the proof: real-stable polynomials are not
closed under arbitrary addition, and earlier controls show that this is a
real obstruction.  It does, however, identify the remaining issue very
precisely: prove compatibility of this *specific complete level-`d` sum*.
The critical denominator has a literal counting meaning--it is the number
of ordered choices of the two distinguished deleted positions.  The
arrowhead, one-edge, derivative, and deletion identities are checked in
`normalized_rankone_diagonal_lift_certificate_20260802.json`, generated by
the extended `verify_normalized_rankone_diagonal_lift.py`.

## 30. The aligned seed has an explicit fourth-kind preimage

The sum seed `a_N=g_N+g_(N-1)` is not an arbitrary negative-rooted
polynomial.  Put `n=N-2`, `L=2N-3`, and let `W_n` be the Chebyshev
polynomial of the fourth kind, normalized by

\[
 W_n(\cos\theta)={\sin((n+1/2)\theta)\over\sin(\theta/2)}.
\]

If `T_3(X^k)=X^k/(3)_k`, exact contiguous summation gives, in the raw
hypergeometric normalization,

\[
\begin{split}
 a_N(X)
 &= {L\over2}X^2\,{}_2F_2(-n,n+1;3/2,3;-X/4)\\
 &= {X^2\over2}T_3\{W_n(1+X/2)\}.                  \tag{126}
\end{split}
\]

The leading coefficient in (126) is `1/N!`; multiplying by `N!` gives the
monic normalization in (114).  Before applying `T_3`, all nonzero roots are
explicit:

\[
 X_k=-4\sin^2{\pi k\over2n+1},\qquad 1\leq k\leq n. \tag{127}
\]

Thus the actual diagonal spectrum in Section 28 is a Laguerre-multiplier
(equivalently finite-free multiplicative convolution) image of a rigid path
spectrum.  This provides a second possible compatibility mechanism for
(125): pull the complete deletion level back through `T_3` and seek a common
interlacing family on the explicitly rooted fourth-kind side.  The
contiguous identity, the `T_3` identity, the classical recurrence, and the
monic root-sum normalization are checked exactly for `3<=N<=60` in
`defect3_fourth_kind_seed_identity_certificate_20260802.json`, generated by
`verify_defect3_fourth_kind_seed_identity.py`.  This is a structural
reduction, not yet the missing compatibility theorem.

## 31. Two controls on the complete-level search

The stable summands in (125) do **not** form an ordinary common-interlacing
family.  There is an exact aligned `N=4,L=5,d=3` control with root
magnitudes `(0,0,5,15)`.  On the positive-direction line

\[
 X=-39+4z,\qquad Y=29+z,                            \tag{128}
\]

the summands indexed by deleted pairs
`(empty,{0,2,3})` and `({0},{0,1})` are both completely real-rooted
quintics, but their first interlacing intervals are disjoint: the first
polynomial has smallest root `-29`, while the second polynomial's second
root is strictly below `-29`.  Hence no degree-four polynomial can interlace
both.  The primitive coefficients and exact rational root intervals are in
`level_summand_no_common_interlacing_certificate_20260802.json`, generated
by `verify_level_summand_no_common_interlacing.py`.  Compatibility of the
complete sum must therefore be stronger than the usual common-interlacer
criterion.

The affine-line finder also required a numerical correction.  A full exact
quintic can have a leading coefficient only about `1.18*10^(-12)` times its
largest middle coefficient.  Relative leading-term trimming had silently
turned such quintics into quartics and manufactured apparent complex pairs.
The finder now retains every nonzero leading term, and exact Sturm replay
confirms five real roots in the regression case.  The check is
`affine_line_screen_degree_regression_certificate_20260802.json`, generated
by `verify_affine_line_screen_degree_regression.py`.  All counterexample
claims continue to require exact replay; no actual Erdős endpoint failure
has been found.

## 32. Multiaffine operator and relaxed-hypergraph comparison

The star model can be polarized before diagonalizing the leaf activities.
Let

\[
 \mathcal A=\prod_{i=1}^N x_i\prod_{j=1}^N y_j,
 \quad U=\sum_i\partial_{x_i}+\sum_j\partial_{y_j},
 \quad E_x=\sum_iw_i\partial_{x_i},\quad
 E_y=\sum_jw_j\partial_{y_j}.                       \tag{129}
\]

Then the complete bottom target is exactly

\[
 \left\{U^d(1-E_x)(1-E_y)-U^{d-2}E_xE_y\right\}\mathcal A, \tag{130}
\]

followed by `x_i=X+r_i`, `y_j=Y+r_j`.  Repeated derivatives of one leaf
vanish because `mathcal A` is multiaffine, so (130) is also the fully
polarized form of (124).

This connects the problem to two theorems of Amini, *Stable multivariate
generalizations of matching polynomials* (arXiv:1905.02264).  First, a
uniform fixed-cardinality induced-subgraph average of matching polynomials
is stable (Corollary 4.7); this covers the positive `U^d` deletion average.
Second, Theorem 5.6 proves stability of relaxed-hypergraph matching
operators built from the local preserver

\[
 1-\sum_{S\subseteq e, |S|>1}(|S|-1)\partial^S.     \tag{131}
\]

The negative term in (130) is precisely a four-vertex contraction selecting
one weighted leaf from each star together with both centers.  A bare
four-derivative `1-c partial^e` is not a stability preserver; (131) shows
which lower two- and three-vertex contractions normally repair it.  The
new concrete proof target is therefore to polarize the `d` deletion slots
and determine whether the binomial `U^(d-2)` smoothing at
`d=floor(2N/3)+1` supplies exactly a positive specialization of the relaxed
completion (131).  If so, Amini's Lieb--Sokal/MAP argument would prove the
bottom lemma directly.  This identification is exact, but the required
operator factorization has not yet been established.

## 33. The raw multiaffine Amini lift is exactly obstructed

The most direct version of the proposal at the end of Section 32 is false:
the polynomial in all `2N` leaf activities produced by (130) is not stable,
even for the first actual endpoint `N=6,d=5`.  This failure occurs before the
special diagonal shifts `x_i=X+r_i`, `y_i=Y+r_i`, and can be certified without
approximating any algebraic root.

The aligned seed has two zero weights and four positive weights whose sum is
`W=N=6`.  Give the two zero-weight leaf activities on one side the values
`z_0,z_1`, give all four positive-weight leaves the common activity `t`, and
translate every leaf by `u`.  The one-star matching and one-edge parts then
reduce exactly to

\[
 G(u)=(z_0+u)(z_1+u)(t+u)^3(t+u-W),\qquad
 H(u)=W(z_0+u)(z_1+u)(t+u)^3.                       \tag{132}
\]

Thus the target and its partial derivatives in the zero-weight coordinates
depend on the actual four algebraic weights only through their rational sum
`W=6`.  At the real assignments

\[
 (z_0,z_1,t)_X=(20,-19,14),\qquad
 (z_0,z_1,t)_Y=(-25,-13,2),                         \tag{133}
\]

the order-five target `P` has the exact values

\[
 P=23005693440,\quad P_0=1182960000,\quad
 P_1=-1517976576,\quad P_{01}=-69254784.            \tag{134}
\]

Consequently its Rayleigh difference is

\[
 P_0P_1-PP_{01}=-202451240387543040<0.              \tag{135}
\]

A real multiaffine stable polynomial must have every Rayleigh difference
nonnegative at every real assignment.  Hence (135) rules out stability of
the fully polarized target, and therefore rules out applying Proposition 4.2
or Theorem 5.6 directly to (130).  Any Amini-type proof must build a different
stable parent whose **specialization** produces the shifted two-variable
target; it cannot simply prove the raw leaf polynomial stable.  Equations
(132)--(135) are checked in
`multiaffine_bottom_rayleigh_obstruction_certificate_20260802.json`, generated
by `verify_multiaffine_bottom_rayleigh_obstruction.py`.  This obstruction does
not affect the actual bivariate endpoint, which continues to pass all exact
tests.

## 34. The actual pair is a consecutive Nikishin step-line pair

The hypergeometric derivative chain has a stronger published
multiple-orthogonal interpretation.  Lima and Loureiro define the monic type-II
step-line polynomials

\[
 P_n^\delta(x;a,b,c)\ \sim\
 {}_2F_2\!\left(\begin{matrix}-n,
 c+b+1+\lfloor(n+\delta)/2\rfloor\\a+1,b+1
 \end{matrix};x\right),\qquad \delta\in\{0,1\},       \tag{136}
\]

for a Nikishin system of two positive measures when
`a>-1`, `b>-1`, and `c>max(0,a-b)`.  Put

\[
 n=N-2,\qquad \delta_0=N\pmod2,\qquad
 a_0=0,\quad b_0={1\over2},\quad
 c_0=\left\lfloor{N\over2}\right\rfloor-{1\over2}.   \tag{137}
\]

Then, after the change `x=-X/4` and monic normalization, the pair

\[
 g_N''(X),\qquad g_{N-1}''(X)                         \tag{138}
\]

is exactly

\[
 P_n^{\delta_0}(x;a_0,b_0,c_0),\qquad
 P_{n-1}^{\delta_0}(x;a_0,b_0,c_0).                  \tag{139}
\]

Thus the two polynomials are not merely interlacers: they are consecutive
type-II multiple orthogonal polynomials for one and the same Nikishin
step-line system.

The identification persists through the complete common derivative chain.
For `k>=2`, let `ell=k-2` and set

\[
\begin{split}
 a_k&=\ell,\qquad b_k=\ell+{1\over2},\\
 \delta_k&=(N-k)\pmod2,\\
 c_k&=c_0+\left\lfloor{\ell+\delta_0\over2}\right\rfloor.
                                                               \tag{140}
\end{split}
\]

Then the monic forms of `g_N^(k)` and `g_(N-1)^(k)` are respectively
`P_(N-k)^delta_k` and `P_(N-k-1)^delta_k` with the same parameters
`(a_k,b_k,c_k)`.  Indeed their second upper parameters reduce exactly to

\[
 c_k+b_k+1+\left\lfloor{N-k+\delta_k\over2}\right\rfloor
 =N+k-2                                             \tag{141}
\]

and `N+k-3` for the consecutive polynomial.  Moreover the parameter update
from `k` to `k+1` is

\[
 (\delta,a,b,c)\longmapsto(1-\delta,a+1,b+1,c+\delta), 
                                                               \tag{142}
\]

which is exactly the Hahn derivative formula proved by Lima--Loureiro,

\[
 {d\over dx}P_{r+1}^{\delta}(x;a,b,c)
 =(r+1)P_r^{1-\delta}(x;a+1,b+1,c+\delta).          \tag{143}
\]

Equations (137)--(143) and every coefficient in both chains for
`4<=N<=60` are checked over exact rationals in
`defect3_nikishin_step_line_certificate_20260803.json`, generated by
`verify_defect3_nikishin_step_line.py` (70,148 coefficient identities,
3,420 parameter identities, and 1,653 derivative-shift identities).

This supplies a genuinely stronger candidate mechanism for the complete
binomial sum: seek a multiple Christoffel--Darboux or third-order bilinear
concomitant identity for (80).  It is not yet that identity.  The standard
multiple Christoffel--Darboux kernel pairs type-II polynomials with type-I
functions, whereas (80) is a symmetric type-II/type-II convolution and also
contains the two antiderivative edge levels `k=0,1`.  Those differences must
be handled explicitly before the Nikishin identification becomes a proof.

## 35. Complementary Nikishin shifts and the exact diagonal kernel

At the actual endpoint

\[
 N=3m+3,\qquad d=2m+3,                              \tag{144}
\]

the two derivative orders paired by the binomial convolution have a rigid
additional symmetry.  Put `ell=d-k` and assume `k,ell>=2`.  For the parameters
in (140), direct parity arithmetic gives

\[
\begin{gathered}
 (N-k)+(N-\ell)=2N-d=4m+3,\\
 a_k+a_\ell=d-4=2m-1,\qquad
 b_k+b_\ell=d-3=2m,\\
 \delta_k+\delta_\ell=1,\qquad
 c_k+c_\ell=N+m-2=4m+1.                            \tag{145}
\end{gathered}
\]

The second upper hypergeometric parameters also have constant sum,

\[
 (N+k-2)+(N+\ell-2)=2N+d-4=8m+5.                  \tag{146}
\]

Thus every parameter group in the two complementary type-II factors has a
`k`-independent total, and the two factors lie on opposite step lines.  This
is stronger than the separate Hahn chains in Section 34 and is the precise
arithmetic pattern needed for a possible bilinear addition or adjoint
concomitant formula.  It is not, by itself, such a formula.

There is a complementary exact generating kernel.  Set

\[
 \phi(t)={t\over(1-t)^2}.
\]

For every `N>=3`, coefficient extraction gives

\[
 g_N(X)=[t^N](1-t)^2\exp\{X\phi(t)\}.              \tag{147}
\]

Consequently the complete bottom target is

\[
\begin{split}
 F_{N,d}(X,Y)=[t^Nu^N]&(1-t)^2(1-u)^2
  (\phi(t)+\phi(u))^{d-2}\\
 &\times\left((\phi(t)+\phi(u))^2-tu\right)
  \exp\{X\phi(t)+Y\phi(u)\}.                     \tag{148}
\end{split}
\]

The normalization in (148) is `F`, not `F/d!`; the latter normalization is
specific to the leaf-deletion sum (124).  The homogeneous slice of total
degree `r` is therefore obtained by replacing the final exponential in
(148) by

\[
 {\left(X\phi(t)+Y\phi(u)\right)^r\over r!}.        \tag{149}
\]

This turns the surviving slice-chain evidence into a concrete diagonal-
extraction problem.  In the corrected finite probe, the homogenized target
had no exact affine-line failure in 30 trials at each `1<=m<=5`; all 1,125
adjacent-slice pencil trials were also clean, with exact replay required for
every numerical suspect.  The report is
`bottom_homogenized_slice_chain_probe_20260803.json`.  This is finite evidence,
not a stability theorem.

Equations (144)--(149) were checked over exact rationals in
`bottom_diagonal_kernel_complementarity_certificate_20260803.json`, generated
by `verify_bottom_diagonal_kernel_and_complementarity.py`: 1,885 seed
coefficient checks, 1,054 complete target coefficient checks through `m=6`,
and 60,600 complementary-parameter identities through `m=100`.

There is also an exact distinguished-pair refinement of (125).  For an
unordered pair `P` of leaves, first delete `P`; if its two leaves lie in
opposite stars, add a center--center edge of square weight `w_iw_j/2`, and
then average over all further `d-2` leaf deletions.  Call the resulting sum
`R_P`.  Double counting the pairs inside each final deletion set gives

\[
 {F_{N,d}\over d!}={1\over\binom d2}\sum_P R_P.     \tag{150}
\]

Every `R_P` is stable by the fixed-cardinality induced-subgraph theorem,
because after `P` is fixed the graph and its possible center edge are fixed.
Grouping the prefixes by type recovers three stable blocks exactly:

\[
\begin{aligned}
 \sum_{P\subset X}R_P
   &={1\over2(d-2)!}S^{d-2}(g''\mathbin\otimes g),\\
 \sum_{P\text{ cross}}R_P
   &={1\over(d-2)!}S^{d-2}
       \left(g'\mathbin\otimes g'-\tfrac12h\mathbin\otimes h\right),\\
 \sum_{P\subset Y}R_P
   &={1\over2(d-2)!}S^{d-2}(g\mathbin\otimes g''). \tag{151}
\end{aligned}
\]

The middle block is stable because `h<<g'`; the two edge blocks are
derivatives of stable products.  However, the collection in (150) does not
have the hoped-for global common interlacer, and even the natural sequential
first-leaf grouping produced numerical sibling gaps at `m=1,2`.  The
route-selection record is
`distinguished_pair_prefix_interlacing_probe_20260803.json`; because this
last obstruction is numerical rather than an exact Sturm certificate, it is
used only to deprioritize the naive interlacing-family shortcut.  Identity
(150) remains available for a stronger partial-symmetrization argument.

## 36. Universal type-I dual and a positive complementary pairing

The type-I side of the shifted Nikishin chain collapses much more strongly
than the parameter arithmetic in Section 35 suggests.  For `k>=2`, put
`n=N-k` and let

\[
 Q_k(x)=Q_n^{\delta_k}(x;a_k,b_k,c_k)               \tag{152}
\]

be the normalized type-I function in the same system as the monic form of
`g_N^(k)`.  The Rodrigues formula in the Lima--Loureiro paper, followed by
`n-1` integrations by parts, gives

\[
 \int_0^\infty e^{zx}Q_k(x)\,dx
 ={z^{n-1}\over(n-1)!}
 {}_2F_1\left(N-2,N-\tfrac32;2N-3;z\right).        \tag{153}
\]

All dependence on `k` has disappeared except the forced initial monomial.
Indeed

\[
\begin{aligned}
 a_k+n&=N-2,\\
 b_k+n&=N-\tfrac32,\\
 c_k+b_k+n+\left\lfloor{n+\delta_k\over2}\right\rfloor
 &=2N-3.                                           \tag{154}
\end{aligned}
\]

The remaining Gauss function is a Catalan power:

\[
 {}_2F_1\left(N-2,N-\tfrac32;2N-3;z\right)
 =C(z/4)^{,2N-4},\qquad
 C(w)={1-\sqrt{1-4w}\over2w}.                      \tag{155}
\]

Thus the moments of the entire moving type-I chain share one universal
Toeplitz tail.  More explicitly, if `j=n-1+q`, then

\[
 \int_0^\infty x^jQ_k(x)\,dx
 ={j!\over(n-1)!}[z^q]C(z/4)^{2N-4},               \tag{156}
\]

and all moments below `n-1` vanish.

This universal tail can be paired exactly with the type-II chain.  Let
`P_ell` denote the monic type-II polynomial of degree `N-ell` in the shifted
system `(a_ell,b_ell,c_ell,delta_ell)`, and set

\[
 J_{k,\ell}=\int_0^\infty P_\ell(x)Q_k(x)\,dx,
 \qquad R=k-\ell+1.                                \tag{157}
\]

If `R<0`, then `J_(k,ell)=0` by (156).  For `R>=0`, exact terminating
summation gives

\[
 J_{k,\ell}=
 {(-1)^R\binom{N-\ell}{R}
  (N-R-1)_R(N-R-\tfrac12)_R(2-2R)_R
  \over
  (2N-R-2)_R(2N-2R-2)_R}.                         \tag{158}
\]

In particular, `J_(k,k+1)=1`, `J_(k,k)=0`, and every entry with `R>=2`
is strictly positive: `(2-2R)_R` consists of `R` negative factors and the
prefactor `(-1)^R` cancels their sign.  At the Erdos anti-diagonal
`ell=d-k`,

\[
 R=2k-d+1,                                         \tag{159}
\]

so every nonzero complementary pairing has even gap and is positive.

The summation behind (158) is not the generic Whipple product that was first
suspected.  After shifting the moment index, its hypergeometric part is

\[
 {}_4F_3\left(\begin{matrix}
 -R,2N-R-2,N-2,N-\tfrac32\\
 N-R-1,N-R-\tfrac12,2N-3
 \end{matrix};1\right)
 ={(2-2R)_R\over(2N-2R-2)_R}.                     \tag{160}
\]

Equation (160) follows from Theorem 2.1 of Wenchang Chu,
*Transformation formulae for terminating balanced 4F3-series and
implications* (Hacet. J. Math. Stat. 52 (2023), 391--397), with

\[
 n=R,\quad c=2N-4,\quad e=2N-2R-2,
 \quad a=4N-2R-6.                                  \tag{161}
\]

The transformed `3F2` cancels two equal upper/lower parameters and its
finite sum is `(c+1)_R/R!`, producing (160).

The consecutive type-II member representing `g_(N-1)^(ell)` has an exactly
parallel positive pairing.  Let `H_ell` be its monic form, of degree
`N-ell-1`, and put

\[
 \widehat J_{k,\ell}=\int_0^\infty H_\ell(x)Q_k(x)\,dx,
 \qquad R=k-\ell.                                  \tag{162}
\]

It vanishes for `R<0`, while for `R>=0`

\[
 \widehat J_{k,\ell}=
 {(-1)^R\binom{N-\ell-1}{R}
  (N-R-2)_R(N-R-\tfrac32)_R(-2R)_R
  \over
  (2N-R-4)_R(2N-2R-4)_R}.                         \tag{163}
\]

Every nonzero entry in (163) is positive.  Its terminating hypergeometric
factor collapses under the same Chu transformation:

\[
 {}_4F_3\left(\begin{matrix}
 -R,2N-R-4,N-2,N-\tfrac32\\
 N-R-2,N-R-\tfrac32,2N-3
 \end{matrix};1\right)
 ={(-2R)_R\over(2N-2R-4)_R}.                      \tag{164}
\]

Equations (153)--(156) passed 14,550 exact parameter checks, 43,650
Gauss--Catalan coefficient checks, and 43,650 moment checks through `N=100`
in `defect3_universal_typeI_laplace_certificate_20260803.json`, generated by
`verify_defect3_universal_typeI_laplace.py`.  Equations (157)--(161) passed
7,713 complete cross-system pairings for each of the two type-II chains
through `N=30`, 1,767 and 1,710 direct balanced-sum checks respectively
through `N=60`, and 5,150 positive Erdos anti-diagonal checks through `m=100`
in
`defect3_typeI_typeII_pairing_certificate_20260803.json`, generated by
`verify_defect3_typeI_typeII_pairing.py`.

This is the first exact positive duality linking the two complementary halves
of the binomial convolution, but it is not yet the stability theorem.  The
full triangular matrix `(J_(k,ell))` is entrywise nonnegative, yet small exact
minor audits already show negative `2` by `2` minors, including the leading
minor at `N=5`.  Hence ordinary total positivity of the complete change-of-
basis matrix is false.  The remaining target is narrower: determine whether
the even-gap Erdos anti-diagonal, with its binomial normalizations, is a
positive Gram or sign-regular kernel despite failure of total positivity away
from that anti-diagonal.

## 37. Positive Catalan connection between the two type-II chains

The consecutive chain can be eliminated in favor of the main Hahn chain with
strictly positive coefficients.  Work in the standard MOP variable
`x=-X/4`.  Let `P_ell` be the monic form of `g_N^(ell)` and `H_ell` the monic
form of `g_(N-1)^(ell)`.  If

\[
 r=N-\ell-1,
\]

then

\[
 H_\ell(x)=\sum_{j=0}^{r}
 {r^{\underline j}C_{j+1}\over4^j}
 P_{\ell+1+j}(x),                                  \tag{165}
\]

where `C_j` is the `j`th Catalan number and `P_N=1`.  Every coefficient in
(165) is strictly positive.

This identity follows without a new hypergeometric summation.  The Catalan
lowering relation (52) is

\[
 g_{N-1}=\Phi(D_X)g_N,
 \qquad
 \Phi(z)=\sum_{q\ge1}(-1)^{q-1}C_qz^q.             \tag{166}
\]

After `X=-4x`,

\[
 \Phi(-D_x/4)=-\sum_{q\ge1}{C_q\over4^q}D_x^q.    \tag{167}
\]

The Hahn derivative law gives
`D_x^qP_ell=(N-ell)^(underline q)P_(ell+q)`.  Dividing (167) by the leading
coefficient of its `q=1` term and putting `j=q-1` gives exactly (165).

Thus Sections 21 and 34 are not separate Catalan and Nikishin phenomena:
the Catalan inverse is the positive triangular connection matrix between the
two shifted type-II chains.  The complete table through `N=60` passed
1,009,489 expanded-basis coefficient operations, 34,219 exact polynomial
coefficient identities, and 34,219 positivity checks in
`defect3_positive_catalan_connection_certificate_20260803.json`, generated
by `verify_defect3_positive_catalan_connection.py`.

Substituting (165) into (80) places the entire interior target in one type-II
basis.  The first convolution lies on the order anti-diagonal `i+j=d`; the
correction expands onto `i+j>=d` with positive Catalan connection
coefficients and retains its single minus sign.  Therefore (165) does not by
itself make the kernel positive.  It does, however, reduce the missing
theorem to sign-regularity of one explicit anti-diagonal-plus-Catalan-tail
matrix in a single AT-system basis; there is no longer a mismatch between
two moving polynomial families.

## 38. The reversed anti-diagonal core is an M-matrix

Use (165) to expand the complete bottom target in the monic derivative basis
`P_0,...,P_N` in the variable `x=-X/4`.  Up to the common nonzero factor
`(-4)^(2N-d)`, the first convolution weights are

\[
 u_k={\binom dk\over (N-k)!(N-d+k)!},               \tag{168}
\]

and the consecutive-chain correction weights are

\[
 v_a={\binom{d-2}a\over (N-1-a)!(N-d+a+1)!}.       \tag{169}
\]

Let `A_(r,s)` be the resulting symmetric coefficient matrix.  Reverse its
second index and take the square core

\[
 L_{r,j}=A_{r,d-j},\qquad 0\le r,j\le d.           \tag{170}
\]

Then `L` is lower triangular.  Above the diagonal `r<j`, no term can occur
because every Catalan correction in (165) only increases the two derivative
orders.  On the diagonal,

\[
 L_{r,r}=\begin{cases}
 u_r,&r=0,d,\\
 u_r-v_{r-1},&1\le r\le d-1,
 \end{cases}                                      \tag{171}
\]

and these quantities are positive because

\[
 {u_r\over v_{r-1}}={d(d-1)\over r(d-r)}>1.        \tag{172}
\]

Every strict lower entry is a nonempty sum of Catalan connection products
with the single correction minus sign, so

\[
 L_{r,j}<0\quad(r>j).                               \tag{173}
\]

Consequently `L=D(I-B)` with `D` positive diagonal and `B` strictly lower
triangular and entrywise nonnegative.  It is a nonsingular triangular
M-matrix, and

\[
 L^{-1}=(I+B+\cdots+B^d)D^{-1}\ge0                \tag{174}
\]

entrywise.  This gives a concrete inverse-positive kernel inside the bottom
endpoint, stronger than mere positivity of the dual pairings.

The full construction, symmetry, signs, and inverse were checked exactly for
`1<=m<=20` in `bottom_catalan_core_mmatrix_certificate_20260803.json`,
generated by `verify_bottom_catalan_core_mmatrix.py`: 31,190 full-matrix
symmetry checks, 7,330 zero upper entries, 500 positive diagonal entries,
7,330 negative lower entries, and 15,160 nonnegative inverse entries.

Inverse-positivity still falls short of the desired variation-diminishing
theorem.  The inverse is not totally nonnegative: already at `m=1`, its minor
on rows `(1,2)` and columns `(0,1)` is `-307800/7`.  Hence the next step
cannot simply invoke total positivity of `L^(-1)`; it must combine the
M-matrix order with the AT/Nikishin basis or account for the lower-degree
blocks outside the core (170).

## 39. Universal Catalan normalization and a strictly-TP Schur tail

The factorials in (168)--(169) conceal a universal coefficient matrix.  Put

\[
 \mathcal C(z)=\sum_{n\geq0}C_nz^n,
 \qquad A_n=[z^n]\mathcal C(z)^2=C_{n+1}.            \tag{175}
\]

If `A_(r,s)` is the coefficient matrix in Section 38, define

\[
 \widetilde A_{r,s}
 =4^{r+s-d}(N-r)!(N-s)!A_{r,s}.                     \tag{176}
\]

Then the complete matrix, not only its core, is the truncation through
`0<=r,s<=N` of the `N`-independent bivariate series

\[
 \sum_{r,s\geq0}\widetilde A_{r,s}z^rw^s
 =(z+w)^{d-2}\left((z+w)^2
       -zw\mathcal C(z)^2\mathcal C(w)^2\right).   \tag{177}
\]

Indeed, a correction summand with `p=a+1` loses all four moving factorials:

\[
 v_{p-1}\,{(N-p)!\over(N-r)!}{A_{r-p}\over4^{r-p}}
 { (N-d+p)!\over(N-s)!}{A_{s-d+p}\over4^{s-d+p}}
 ={\binom{d-2}{p-1}A_{r-p}A_{s-d+p}
    \over (N-r)!(N-s)!4^{r+s-d}}.                  \tag{178}
\]

Consequently the core in (170), after the same positive diagonal scalings,
has an exact Toeplitz factorization.  Let

\[
 T_{r,p}=A_{r-p}\quad(r\geq p),
 \quad U=\operatorname{diag}\binom d0,\ldots,\binom dd,
 \quad V=\operatorname{diag}
   \left(0,\binom{d-2}0,\ldots,\binom{d-2}{d-2},0\right).
\]

Then

\[
 \widetilde L=U-TVT.                                \tag{179}
\]

Formula (179) proves the triangular M-matrix signs in Section 38 without any
remaining `N`-dependent calculation.

There is a dual M-matrix behind the eliminated correction block.  Index its
rows and columns by `1<=p,q<=d-1`.  If `K` is the central matrix occurring in
the Schur-tail factorization after reversal, then

\[
 (K^{-1})_{p,q}=\begin{cases}
 0,&p>q,\\
 \displaystyle {1\over\binom{d-2}{p-1}}
  -{1\over\binom dp},&p=q,\\
 \displaystyle-\sum_{r=p}^q{A_{r-p}A_{q-r}\over\binom dr},&p<q.
 \end{cases}                                       \tag{180}
\]

Thus `K^(-1)` is upper triangular with positive diagonal and strictly
negative upper entries, and `K>=0` entrywise.  Equations (179)--(180) are the
two complementary triangular M-matrices on the two sides of the same Schur
elimination.

Partition `widetilde A` after index `d`, and let

\[
 \Sigma=\widetilde A_{>d,>d}
 -\widetilde A_{>d,\leq d}
  \widetilde A_{\leq d,\leq d}^{-1}
  \widetilde A_{\leq d,>d}.                        \tag{181}
\]

At the Erdos values `N=d+m`, `d=2m+3`, the residual matrix

\[
 R_m=-\Sigma J_m                                  \tag{182}
\]

appears to be strictly totally positive.  This is substantially stronger
than entrywise negativity of `Sigma`: all 4,699 minors for `m<=7` are
strictly positive in exact rational arithmetic, and complete Neville
elimination of both `R_m` and `R_m^T` has positive multipliers and pivots
through `m=20` (3,080 exact parameters).  No all-`m` proof is claimed yet.

The surrounding factors are explicit Catalan Hankel matrices.  If `T_1`
denotes the tail rows of the connection matrix and `K` is as in (180), then

\[
 R_m=(T_1J_{d-1})K(T_1^TJ_m),                      \tag{183}
\]

where both outside factors are strictly totally positive Catalan Hankel
submatrices.  The middle factor is entrywise positive but is not itself
totally nonnegative, so Cauchy--Binet closure alone does not prove (182).
The now-isolated missing statement is therefore a specific
Catalan--inverse-M-matrix--Catalan total-positivity theorem.

Equations (175)--(183) and all finite checks above are replayed by
`verify_bottom_universal_schur_tp.py`, with the report
`bottom_universal_schur_tp_certificate_20260803.json`.

## 40. The Schur tail is a rational Chebyshev collocation matrix

The total-positivity conjecture (182) has a finite-dimensional strengthening
that removes the opaque Schur complement.  Fix `d` and put `q=d-1`.  The
infinite tail in (181) has rank at most `q`, because its factorization (183)
has exactly `q` central columns.  Therefore it is enough to prove reverse sign
regularity of the maximal `q` by `q` tail; every Erdos tail has size
`m<q` and is a leading submatrix.

Let

\[
 H_{i,p}=C_{i+p+3},\qquad 0\leq i,p<q,              \tag{184}
\]

and retain the upper inverse-M-matrix `K` of (180), so that the maximal
reversed tail is

\[
 R^{\max}_d=H KJ_qHJ_q.                              \tag{185}
\]

The rows of `H` have a continuous rational interpolation.  For real `x>=0`,

\[
 {C_{x+p+3}\over C_{x+3}}
 =4^p{(x+\tfrac72)_p\over(x+5)_p}.                  \tag{186}
\]

Define the row vector on the right of (186) to be `b(x)`, and define `q`
rational functions by

\[
 (f_0(x),\ldots,f_{q-1}(x))=b(x)KJ_qHJ_q.           \tag{187}
\]

At nonnegative integers, (185)--(187) give

\[
 (R^{\max}_d)_{i,j}=C_{i+3}f_j(i).                  \tag{188}
\]

All functions in (187) have the same positive denominator on `[0,infinity)`:

\[
 D_q(x)=(x+5)_{q-1}.
\]

Put

\[
 n_j(x)=D_q(x)f_j(x).                               \tag{189}
\]

Every `n_j` is a polynomial of degree exactly `q-1`.  Let `M_d` be its
monomial coefficient matrix,

\[
 n_j(x)=\sum_{r=0}^{q-1}(M_d)_{r,j}x^r.             \tag{190}
\]

The remaining Schur-tail statement is implied by the concrete assertion

\[
 M_d\text{ is strictly totally positive for every }d\geq3. \tag{191}
\]

Indeed, for any increasing nonnegative nodes `x_1<...<x_k`, evaluation of
(190) factors through the ordinary positive generalized Vandermonde matrix.
Strict total positivity of `M_d`, positive row factors `C_(x_i+3)`, and the
positive common denominator then make the collocation matrix in (188)
strictly totally positive.  Equivalently, the ordered polynomials
`n_0,...,n_(q-1)` form an extended complete Chebyshev system on the positive
axis.  Their prefix Wronskians have degrees

\[
 \deg W(n_0,\ldots,n_{k-1})=k(q-k).                 \tag{192}
\]

The evidence for (191) is exact rather than floating point.  Through
`d=7`, all 1,267 minors of the five coefficient matrices are strictly
positive; every coefficient of every prefix Wronskian is positive (90
checks), so the Wronskians are positive on `[0,infinity)`.  Complete Neville
elimination of both `M_d` and `M_d^T` has positive multipliers and diagonal
pivots through `d=12` (570 exact parameters).  Equations (184)--(190) were
also checked directly against 505 entries of the original Schur complements.

This is a sharper missing lemma than (182): prove total positivity of one
explicit degree-graded polynomial coefficient array.  It also explains the
previous empirical total positivity and identifies the appropriate proof
language as a rational Chebyshev/continued-fraction argument.  The exact
record is `bottom_schur_chebyshev_coefficient_certificate_20260803.json`,
generated by `verify_bottom_schur_chebyshev_coefficients.py`.

The superficially related almost-strictly-sign-regular staircase theorem does
not apply to the complete reversed matrix: its nonzero entries already have
two incompatible signs, and no diagonal row/column signing makes them
uniform.  Likewise, the direct Cauchy--Binet expansion of the bordered minors
contains terms of both signs already at `m=1`.  Any proof of (191) must use
the cancellation encoded by the Catalan/upper-M-matrix composition, rather
than ordinary sign coherence of the uncontracted factors.

## 41. A two-sided rational-Bernstein kernel is the exact missing lemma

The coefficient matrix in Section 40 has a more symmetric factorization.
Write `q=d-1` and clear the denominator in (186) before applying the central
matrix.  This gives the degree-`q-1` polynomial basis

\[
 \beta_p(x)=4^p(x+\tfrac72)_p(x+p+5)_{q-1-p},
 \qquad 0\leq p<q.                                  \tag{193}
\]

If `B_d` is its monomial coefficient matrix,

\[
 \beta_p(x)=\sum_{r=0}^{q-1}(B_d)_{r,p}x^r,         \tag{194}
\]

and `Z_d=K_d^(-1)` is the upper triangular M-matrix in (180), define

\[
 \mathcal S_d=B_dK_dJ_qB_d^{\mathsf T}.             \tag{195}
\]

The middle factor `K_dJ_q` is symmetric, so `mathcal S_d` is symmetric.
Equivalently, it is the bivariate monomial coefficient matrix of

\[
 \Pi_d(x,y)=\beta(x)K_dJ_q\beta(y)^{\mathsf T}.     \tag{196}
\]

This two-sided kernel recovers the one-sided polynomials (189) exactly.
Let

\[
 y_j=q-1-j,\qquad
 (V_{\rm dec})_{r,j}=y_j^r,
 \qquad
 \Delta_{j,j}={C_{y_j+3}\over D_q(y_j)}.           \tag{197}
\]

Since the `j`th column of `J_qH J_q` is
`C_(y_j+3)J_qb(y_j)^T`, equations (187)--(190) give

\[
 M_d=\mathcal S_dV_{\rm dec}\Delta
     =(\mathcal S_dJ_q)(J_qV_{\rm dec})\Delta.      \tag{198}
\]

The matrix `J_qV_dec` is totally nonnegative: it is the generalized
Vandermonde matrix for decreasing nonnegative nodes written in decreasing
power order.  It is also nonsingular, and `Delta` is positive diagonal.
Consequently, Cauchy--Binet shows that the single assertion

\[
 \boxed{\ \mathcal S_dJ_q\text{ is strictly totally positive for every }
 d\geq3\ }                                         \tag{199}
\]

implies (191).  Strictness in the product follows because every selected set
of columns of the nonsingular totally nonnegative Vandermonde factor has at
least one nonzero maximal minor, while every corresponding minor of
`mathcal S_dJ_q` is positive.

This formulation exposes the special rational-Bernstein structure that was
hidden in the direct Catalan-Hankel product.  Adjacent basis polynomials obey

\[
 {\beta_{p+1}(x)\over\beta_p(x)}
 =4{x+p+\tfrac72\over x+p+5},                      \tag{200}
\]

so each step replaces one negative integer root by a negative half-integer
root.  The matrix `B_d` itself is strictly totally positive in every exact
test.  A beta-integral representation of the quotient in (200) gives a
promising route to a planar or continuous Cauchy--Binet proof for this outside
factor.  The hard point is to incorporate the **specific** central inverse
`K_d`: arbitrary positive upper triangular matrices, arbitrary inverse
M-matrices, and arbitrary totally positive outside factors all have explicit
small counterexamples to the analogous claim.  Thus (199) is a structured
Catalan/rational-Bernstein theorem, not an instance of a generic closure law.

The identities in (193)--(198) passed 104 cleared-basis checks, 2,028
symmetry-entry checks, and 1,014 exact coefficient-factorization checks for
`3<=d<=15`.  Through `d=7`, all 1,267 minors of `B_d` and all 1,267 minors of
`mathcal S_dJ_q` were strictly positive; all 1,267 minors of
`J_qV_dec` were nonnegative.  Complete Neville elimination of each of `B_d`,
`B_d^T`, `mathcal S_dJ_q`, and its transpose produced 2,236 positive exact
parameters through `d=15`.  These finite results do not prove (199).  They
are recorded in
`bottom_schur_two_sided_reverse_tp_certificate_20260803.json`, generated by
`verify_bottom_schur_two_sided_reverse_tp.py`.

## 42. The rational Catalan basis is a strict Descartes system

The outside basis in (193) has an all-order total-positivity proof at the
level of functions, rather than only finite coefficient-matrix evidence.  Put

\[
 a={7\over2},\qquad b=5,\qquad \delta=b-a={3\over2}.
\]

Before clearing the common denominator, the basis in (186) is

\[
 b_p(x)=4^p{(x+a)_p\over(x+b)_p}.
\]

The beta integral gives

\[
 { (x+a)_p\over(x+b)_p}
 ={B(x+a+p,\delta)\over B(x+a,\delta)}
 ={1\over B(x+a,\delta)}
  \int_0^1t^{x+a+p-1}(1-t)^{\delta-1}\,dt.         \tag{201}
\]

Thus, apart from positive row and column factors, the kernel `b_p(x)` is the
Hankel moment kernel

\[
 h(x,p)=\int_0^1t^{x+p}t^{a-1}(1-t)^{\delta-1}\,dt. \tag{202}
\]

For arbitrary increasing real numbers
`x_1<...<x_k` with `x_1>=0` and arbitrary increasing nonnegative integers
`p_1<...<p_k`, Andreief's identity writes the determinant of (202) as

\[
 {1\over k!}\int_{(0,1)^k}
  \det[t_j^{x_i}]_{i,j=1}^k
  \det[t_j^{p_i}]_{i,j=1}^k
  \prod_{j=1}^k t_j^{a-1}(1-t_j)^{\delta-1}\,dt_j. \tag{203}
\]

On the chamber `0<t_1<...<t_k<1`, both generalized Vandermonde determinants
in (203) are strictly positive.  Their product is symmetric in the `t_j`, so
the complete integral is strictly positive.  Hence `b_p(x)` is a strictly
totally positive kernel on `[0,infinity) x {0,1,...}`.  Multiplication by the
common factor `D_q(x)>0` shows that every ordered subfamily of the cleared
polynomials `beta_p(x)` is an extended Chebyshev system on `[0,infinity)`;
in particular, every all-subset Wronskian has the positive orientation.

This proves that the rational Catalan interpolation itself introduces no
variation defect.  It does **not** by itself prove that the monomial
coefficient matrix `B_d` is totally positive: coalescing all evaluation nodes
at zero directly certifies consecutive derivative rows, whereas arbitrary
coefficient minors use arbitrary derivative orders.  More importantly, it
does not prove (199), because the inverse-M-matrix `K_d` lies between two
copies of the Descartes kernel.  The remaining task is therefore genuinely a
compatibility theorem for that central form, not total positivity of the
outside Catalan interpolation.

## 43. Off-diagonal homotopy and the affine complementary pencil

There is a sharper deformation of the remaining target (199).  Write

\[
 Z_d=D_d+(Z_d-D_d),\qquad D_d=\operatorname{diag}Z_d,
\]

where `Z_d` is the upper-triangular M-matrix in (189), and introduce

\[
 Z_d(t)=D_d+t(Z_d-D_d),\qquad
 A_d(t)=B_dZ_d(t)^{-1}J_qB_d^TJ_q.                \tag{204}
\]

Then `A_d(1)=mathcal S_dJ_q`, so (199) is the endpoint `t=1`.  At the other
endpoint,

\[
 A_d(0)=B_dD_d^{-1}J_qB_d^TJ_q,                  \tag{205}
\]

which is a product of the two rational-Bernstein basis orientations and a
positive diagonal matrix.  Moreover `Z_d(t)` is upper triangular with
positive, `t`-independent diagonal.  Hence its determinant is a positive
constant and `Z_d(t)^{-1}`, and therefore `A_d(t)`, has polynomial entries.
Indeed, if

\[
 Z_d=D_d(I-N_d),
\]

then `N_d` is strictly upper triangular and entrywise nonnegative, and

\[
 Z_d(t)^{-1}=(I-tN_d)^{-1}D_d^{-1}
 =\sum_{\ell=0}^{q-1}t^\ell N_d^\ell D_d^{-1}.   \tag{206}
\]

The decisive simplification comes from taking complementary minors.  Put

\[
 C_d=J_qB_d^TJ_q,\qquad
 E_q=\operatorname{diag}(1,-1,1,-1,\ldots)
\]

and define the checker-signed inverse

\[
 \begin{aligned}
 Q_d(t)&=E_qA_d(t)^{-1}E_q\\
 &=E_qC_d^{-1}Z_d(t)B_d^{-1}E_q\\
 &=Q_{0,d}+tQ_{1,d},                              \tag{207}\\
 Q_{0,d}&=E_qC_d^{-1}D_dB_d^{-1}E_q,\\
 Q_{1,d}&=E_qC_d^{-1}(Z_d-D_d)B_d^{-1}E_q.
 \end{aligned}
\]

Thus the inverse side is **affine**, even though the direct side can have
degree `q-1`.  If `I,J` are equally sized index sets, Jacobi's
complementary-minor identity and the checker signs give the sign-free formula

\[
 \det A_d(t)[I,J]
 =\det A_d(t)\,\det Q_d(t)[J^c,I^c].              \tag{208}
\]

The full determinant in (208) is a positive constant.  In particular, every
minor of order `k` on the direct side has degree at most `q-k`.  More
importantly, coefficientwise positivity of a direct minor is exactly
coefficientwise positivity of its complementary minor in the affine pencil.

This exposes substantial endpoint structure.  Since checker-signed inverses
of strictly totally positive matrices are strictly totally positive,

\[
 Q_{0,d}=(E_qC_d^{-1}E_q)D_d(E_qB_d^{-1}E_q)      \tag{209}
\]

is strictly totally positive once the coefficient-basis version of the
outside total-positivity statement is supplied.  Exact computation also
shows that `Q_{1,d}` is totally nonnegative of rank `q-1`, with every proper
minor strictly positive.  Its one-dimensional right and left kernels are
forced by the strict upper triangular middle factor:

\[
 \ker Q_{1,d}=\operatorname{span}(E_qB_de_0),
 \qquad
 \ker Q_{1,d}^T=\operatorname{span}(E_qC_d^Te_{q-1}). \tag{210}
\]

The exact finite certificate is unusually uniform.  For `3<=d<=9`, all 203
Gasca--Pena initial minors of `A_d(t)` had numerator polynomials with all 959
coefficients strictly positive.  Through `d=7`, all 1,267 minors passed
coefficientwise, comprising 4,825 positive coefficients.  Over the same
exhaustive range, all 1,267 minors of `Q_{0,d}` were positive, while
`Q_{1,d}` had 1,262 positive minors and exactly the five expected zero full
determinants.  The identities in (207)--(208) passed 203 entry checks.  These
results are recorded in
`bottom_reverse_tp_offdiagonal_homotopy_certificate_20260803.json`, generated
by `verify_bottom_reverse_tp_offdiagonal_homotopy.py`.

The remaining all-order lemma can now be stated precisely:

\[
 \boxed{\begin{minipage}{0.86\linewidth}
 For every `d>=3`, every Gasca--Pena initial minor of `A_d(t)` has a
 numerator with nonnegative coefficients and a positive constant term.
 \end{minipage}}                                  \tag{211}
\]

Equivalently, by (208), the corresponding complementary minors of the affine
pencil `Q_{0,d}+tQ_{1,d}` are coefficientwise positive.  Lemma (211) would
make `A_d(t)` strictly totally positive for every `t>=0`; taking `t=1` would
prove (199), hence the bottom Schur-tail lemma.  Neither total positivity of
`Q_{0,d}` nor total nonnegativity of `Q_{1,d}` alone proves the pencil claim:
minors of a sum do not obey a generic positivity closure theorem.  The next
step must exploit their shared Catalan/beta-moment origin, for example through
a common-measure Andreief representation or a compatible planar-network
factorization.

## 44. A consecutive-integer Sturm grid for the central kernel

The same central form has an unexpectedly rigid one-variable zero geometry.
Define the symmetric polynomial kernel

\[
 \Pi_d(x,y)=\boldsymbol\beta_d(x)K_dJ_q
             \boldsymbol\beta_d(y)^T,\qquad q=d-1,                 \tag{212}
\]

where

\[
 \beta_p(x)=4^p(x+7/2)_p(x+p+5)_{d-2-p},\qquad 0\leq p\leq d-2.
\]

It has degree `d-2` in each variable.  Evaluate the first variable at the
consecutive negative integers `x=-k`, with `3<=k<=d+2`.  Since
`beta_p(-k)=0` for `p<=k-5`, the row
`boldsymbol beta_d(-k)` starts with `k-4` zeros.  Upper triangularity of
`K_d` preserves these zeros.  Reversal then restricts the surviving
`y`-basis indices to `0<=p<=d-k+2`.  Every such basis element contains the
common factor

\[
 R_{d,k}(y)=(y+d-k+7)_{k-4}\quad(k\geq4),
 \qquad R_{d,3}(y)=1.                              \tag{213}
\]

Thus the divisibility in

\[
 \Pi_d(-k,y)=R_{d,k}(y)P_{d,k}(y)                 \tag{214}
\]

is structural, not experimental.  Exact calculation reveals the stronger
sign rule

\[
 (-1)^{\,k-3-\mathbf1_{k>g_d}}P_{d,k}(y)
 \quad\hbox{has every monomial coefficient strictly positive},
 \qquad
 g_d=\left\lfloor{d+1\over3}\right\rfloor+2.      \tag{215}
\]

Consequently, for every `y>=0`, the signs of `Pi_d(-k,y)` alternate as `k`
runs from `3` through `d+2`, except at the single adjacent pair
`k=g_d,g_d+1`.  If (215) holds for all `d`, the intermediate value theorem
places one root of `Pi_d(x,y)` in every interval between the nodes
`-3,-4,...,-d-2` except

\[
 (-g_d-1,-g_d).                                   \tag{216}
\]

There are exactly `d-2` such sign-changing intervals, equal to the degree in
`x`.  Hence all roots are simple, negative, and exhausted by these intervals.
The location of the unique missing interval advances once every three values
of `d`, matching the defect-three arithmetic of the original maximal tail.

The replayable certificate
`bottom_kernel_integer_sturm_pattern_certificate_20260803.json`, generated by
`verify_bottom_kernel_integer_sturm_pattern.py`, proves (213)--(215) exactly
over the rationals for every `3<=d<=20`.  It checks 207 integer evaluations,
207 forced-factor identities, 1,518 strict normalized coefficients, and 189
adjacent sign comparisons.  These are symbolic polynomial assertions valid
for every real `y>=0` in the checked range, rather than sampled numerical root
tests.

Two all-order obligations remain.  First, the strict coefficient assertion
(215) needs a closed proof, presumably from the triangular solve
`boldsymbol beta_d(-k)K_d`.  Second, sectionwise real-rootedness is only the
order-one part of total positivity: one must upgrade the interlacing grid to
the higher-order Chebyshev determinants required by (199) or (211).  Thus the
Sturm grid is a new exact route to the missing lemma, but not yet a proof of
that lemma.

## 45. Barycentric residues and the super-ballot compression

The sign assertion (215) admits a sharper discrete reformulation.  Put

\[
 p_d(x)=(x+3)_d=\prod_{a=0}^{d-1}(x+a+3),
 \qquad \lambda_a=a+3.
\]

For a polynomial of degree at most `d-2`, barycentric interpolation at the
nodes `-lambda_a` gives a partial-fraction expansion with residues divided by

\[
 p_d'(-\lambda_a)=(-1)^a a!(d-1-a)!.
\]

Apply this in both variables to `Pi_d`.  If `E` is the `d` by `d-1`
evaluation matrix `E_(a,p)=beta_p(-lambda_a)` and `W` is the diagonal matrix
of reciprocal derivatives, then

\[
 {\Pi_d(x,y)\over p_d(x)p_d(y)}
 =v(x)^TG_dv(y),
 \quad v_a(x)={1\over x+\lambda_a},
 \quad G_d=WE(K_dJ_q)E^TW.                         \tag{217}
\]

The degree defect implies `G_d 1=0`.  Let `Delta` be the adjacent-difference
matrix with `Delta_(a,a)=-1`, `Delta_(a,a+1)=1`.  Direct evaluation of the
cleared Catalan basis gives the exact all-order identity

\[
 WE=-\Delta^T\Tau_q,                               \tag{218}
\]

where `Tau_q` is the positive upper-triangular super-ballot triangle

\[
 (\Tau_q)_{a,p}=
 {2a+1\over p+1}{2a\choose a}{2p-2a\choose p-a},
 \qquad 0\leq a\leq p<q.                          \tag{219}
\]

For completeness, (219) follows by summing the first `a+1` barycentric
residues.  The summand at index `i` is

\[
 {4^p(-1)^i(\tfrac12-i)_p\over i!(p+1-i)!}>0,
\]

and the proposed partial sum in (219) has exactly this first difference in
`a`, with the Catalan initial value at `a=0`.  Thus (218)--(219) are closed
identities, not empirical pattern matching.

Define the compressed symmetric form

\[
 H_d=\Tau_q(K_dJ_q)\Tau_q^T.                       \tag{220}
\]

Equations (217)--(220) give

\[
 G_d=\Delta^TH_d\Delta.                            \tag{221}
\]

Because `K_dJ_q` is strictly positive on and above its anti-diagonal and
zero beyond it, the same is true of `H_d`:

\[
 (H_d)_{a,b}>0\iff a+b\leq q-1,
 \qquad (H_d)_{a,b}=0\iff a+b>q-1.                 \tag{222}
\]

The residue signs now become a one-dimensional unimodality statement.  For
`y>=0`, put

\[
 u_a(y)=\sum_{b=0}^{q-1-a}
 { (H_d)_{a,b}\over(y+b+3)(y+b+4)}.                \tag{223}
\]

Indeed,

\[
 \Delta v(y)_b=-{1\over(y+b+3)(y+b+4)},
\]

so the barycentric residue vector in (217), apart from the positive factor
`p_d(y)`, is

\[
 u_0(y),\quad u_1(y)-u_0(y),\quad\ldots,\quad
 u_{q-1}(y)-u_{q-2}(y),\quad-u_{q-1}(y).           \tag{224}
\]

Consequently, the all-`d` sign rule (215) is equivalent to strict unimodality
of (223), with its unique maximum at

\[
 h_d=\left\lfloor{d+1\over3}\right\rfloor-1.       \tag{225}
\]

There is also a positive beta-moment certificate for every adjacent
difference.  Let

\[
 D_{d,a}(t)=\sum_{b=0}^{q-1}
 \bigl((H_d)_{a,b}-(H_d)_{a-1,b}\bigr)t^b.
\]

Since

\[
 {1\over(y+b+3)(y+b+4)}
 =\int_0^1t^{y+b+2}(1-t)\,dt,
\]

we have

\[
 u_a(y)-u_{a-1}(y)
 =\int_0^1t^{y+2}(1-t)D_{d,a}(t)\,dt.              \tag{226}
\]

For every `3<=d<=30`, except the explicit pair `(d,a)=(4,1)`, every
coefficient of `D_(d,a)` in the degree-`d-2` Bernstein basis has the strict
sign predicted by (225): positive before the peak and negative after it.
The exception is

\[
 D_{4,1}(t)=-{8\over3}t(5t-1),
\]

whose moment in (226) is nevertheless strictly negative for every `y>=0`.
Thus a closed proof of these Bernstein signs would prove the all-order Sturm
rule by a manifestly positive integral.

The exact certificate
`bottom_barycentric_sturm_reduction_certificate_20260803.json`, generated by
`verify_bottom_barycentric_sturm_reduction.py`, contains 2,658 direct
super-ballot transform checks, 2,865 barycentric factorization checks, 8,554
support checks (4,494 strictly positive entries), 406 adjacent-row
polynomials, and 8,117 strict signed Bernstein coefficients.  This is a
substantial simplification of the first obligation after (216), but it still
does not supply the closed Bernstein-coefficient formula, nor does the
order-one residue argument imply the higher-order total positivity in (199).

## 46. Closed inverse and beta-moment transform of the super-ballot triangle

The triangle in (219) has a simpler algebraic structure than its original
formula suggests.  Put

\[
 A_a=(2a+1){2a\choose a},\qquad c_n={2n\choose n},
\]

and let `U_c` be the upper Toeplitz matrix
`(U_c)_(a,p)=c_(p-a)`.  Then

\[
 \Tau_q=\operatorname{diag}(A_a)U_c
        \operatorname{diag}\left({1\over p+1}\right).             \tag{227}
\]

Since

\[
 \sum_{n\geq0}c_nz^n=(1-4z)^{-1/2},\qquad
 \sqrt{1-4z}=1-2\sum_{n\geq1}C_{n-1}z^n,
\]

(227) gives the closed inverse

\[
 (\Tau_q^{-1})_{a,p}
 ={(a+1)s_{p-a}\over(2p+1){2p\choose p}},\qquad
 s_0=1,\quad s_n=-2C_{n-1}\ (n\geq1).             \tag{228}
\]

Thus all off-diagonal entries of `Tau_q^(-1)` are negative; no numerical
matrix inversion is needed in the barycentric reduction.

The beta-moment vector in (223) is also transformed in closed form.  If

\[
 w_a(y)={1\over(y+a+3)(y+a+4)},
\]

then, for every `p>=0`,

\[
 (\Tau_q^Tw(y))_p
 ={4^p(y+\tfrac72)_p\over(y+3)_{p+2}}.             \tag{229}
\]

To prove (229), write

\[
 A_a=4^a{(\tfrac32)_a\over a!},\qquad
 c_{p-a}=4^{p-a}{(\tfrac12)_{p-a}\over(p-a)!},
\]

factor out `((1/2)_p/p!)/((y+3)(y+4))`, and apply the balanced
Pfaff--Saalschutz evaluation

\[
 {}_3F_2\!\left(
 \begin{matrix}-p,\frac32,y+3\\[1mm]\frac12-p,y+5\end{matrix};1
 \right)
 ={(p+1)!(y+\tfrac72)_p\over(\tfrac12)_p(y+5)_p}.
\]

Finally, adjacent rows of `Tau_q` have exactly one crossing.  For `a>=1`
and `p>=a`, direct cancellation gives

\[
 (\Tau_q)_{a,p}-(\Tau_q)_{a-1,p}
 =(\Tau_q)_{a-1,p}{p+1\over a(2(p-a)+1)}>0,        \tag{230}
\]

whereas the preceding entry is
`-(Tau_q)_(a-1,a-1)<0`.  Consequently the order-one problem can be written
as a single weighted-tail comparison.  If

\[
 x=Z_d^{-1}J_q\Tau_q^Tw(y),
\]

then (223) is `u=Tau_q x`, and (230) says that the sign of
`u_a-u_(a-1)` is determined by whether the positive tail in row `a`
outweighs the one newly removed diagonal term.  Formula (229) makes the
right-hand side of this upper-triangular M-matrix solve explicit.  The
remaining step is to prove that comparison changes direction exactly at
(225); (228)--(230) do not yet supply that inequality or the higher-order
total positivity required by (199).

The replayable report
`bottom_super_ballot_inverse_moment_certificate_20260803.json`, generated by
`verify_bottom_super_ballot_inverse_moment.py`, checks (227)--(228) on both
sides through size 60, checks (230) through size 60, and checks (229) as a
symbolic rational identity through `p=20`: 296,971 exact checks in all.  The
generating-function, Pfaff--Saalschutz, and direct algebra above prove the
displayed identities for every index; the finite ranges are independent
audits rather than the basis for the all-order claims.

## 47. Exact obstructions to four tempting upgrades

The new one-crossing identity (230) suggests an ordinary
variation-diminishing proof, but the required transform is not sign regular.
Let `C_Ber` be the power-to-degree-`d-2`-Bernstein coefficient matrix and put

\[
 X_d=K_dJ_q\Tau_q^TC_{\rm Ber}.                    \tag{231}
\]

Then the Bernstein rows in Section 45 are `(Delta Tau_q)X_d`.  Although all
entries of `X_d` are positive, neither `X_d` nor `X_dJ_q` is strictly totally
positive.  In the correctly reversed orientation, `X_4J_3` already has the
exact minor

\[
 \det(X_4J_3)[\{0,1\},\{1,2\}]=-{184\over9}.       \tag{232}
\]

Thus the standard variation-diminishing theorem cannot be applied after the
factorization (231).  The exact obstruction is recorded in
`bottom_sturm_variation_transform_obstruction_certificate_20260803.json`,
generated by `verify_bottom_sturm_variation_transform.py`.

Three related nesting shortcuts also fail and should not be recycled without
new structure.

1. The signed barycentric-residue matrix has mixed `2` by `2` minors already
   at `d=3`; deleting the unique Sturm gap does not repair it uniformly.
2. After the natural diagonal matching, consecutive compressed forms `H_d`
   have full-rank differences.  The same holds for the proposed two-boundary
   Schur nesting of the symmetric central forms `K_dJ_q` from `d` to `d+2`.
3. The exact basis nesting

   \[
   \beta_p^{(d+1)}(x)=(x+d+3)\beta_p^{(d)}(x)       \tag{233}
   \]

   holds for every old column, but the corresponding leading and trailing
   blocks of `Z_(d+1)` are not a diagonal congruence plus a low-rank or
   sign-coherent correction of `Z_d`; the residual rank grows with `d`.

These failures leave (211) and the direct Bernstein sign lemma after (226) as
the two strongest routes.  Formulae (227)--(230) sharpen the latter, but no
all-`d` weighted-tail inequality or higher-order total-positivity theorem has
yet been proved.

## 48. Exact rank defect and maximal minors of the affine pencil

The linear coefficient `Q_(1,d)` of the affine complementary pencil in
(210) has a completely explicit rank defect.  This does not prove the mixed
minor statement (211), but it proves its highest-degree boundary in every
order and identifies the two boundary polynomials exactly.

Put `q=d-1`, `n=d-2`, and write the beta basis without its harmless positive
column scales as

\[
 P_p(x)=\prod_{i<p}(x+a_i)\prod_{i\ge p}(x+b_i),
 \qquad a_i=i+\tfrac72,\quad b_i=i+5.              \tag{234}
\]

An elementary evaluation triangularization at
`-b_0,...,-b_(n-1)`, followed by the leading-coefficient functional, gives

\[
 \det B_d
 =4^{n(n+1)/2}\prod_{0\le i\le j<n}(b_j-a_i)
 =4^{n(n+1)/2}\prod_{0\le i\le j<n}
      \left(j-i+\tfrac32\right)>0.                 \tag{235}
\]

Let `Z^circ=Z_d-diag(Z_d)`.  It is strictly upper triangular, and its first
superdiagonal follows immediately from the two endpoint terms of the
Catalan convolution in (180):

\[
 Z^\circ_{i,i+1}
 =-2\left\{{1\over\binom d{i+1}}+{1\over\binom d{i+2}}\right\}<0,
 \qquad 0\le i<q-1.                                \tag{236}
\]

Thus `rank Z^circ=q-1`, its right nullspace is spanned by `e_0`, and its
left nullspace is spanned by `e_(q-1)^T`.  Since

\[
 Q_{1,d}=E_q(J_qB_d^TJ_q)^{-1}Z^\circ B_d^{-1}E_q, \tag{237}
\]

the corresponding right and left null vectors are

\[
 v=E_qB_de_0,
 \qquad u^T=e_{q-1}^T(J_qB_d^TJ_q)E_q.             \tag{238}
\]

The first beta polynomial is
`beta_0(x)=(x+5)_n`.  Hence the generating polynomials of the two null
vectors are

\[
 \sum_{i=0}^n v_i z^i=\prod_{r=5}^{d+2}(r-z),
 \qquad
 \sum_{i=0}^n u_i z^i=\prod_{r=5}^{d+2}(1-rz).     \tag{239}
\]

In particular, the null roots are the consecutive integers
`5,...,d+2` on one side and their reciprocals on the other.  More strongly,
every maximal minor of `Q_(1,d)` is strictly positive.  To see this, put

\[
 \alpha_d=(-1)^{q-1}\prod_{i=0}^{q-2}Z^\circ_{i,i+1}>0,
 \qquad \gamma_d={\alpha_d\over(\det B_d)^2}>0.    \tag{240}
\]

The adjugate of a rank-`q-1` strictly upper triangular matrix is
`alpha_d e_0e_(q-1)^T`.  Applying the adjugate product identity to (237)
therefore gives

\[
 \operatorname{adj}Q_{1,d}=\gamma_d vu^T.          \tag{241}
\]

If `c_j=[x^j](x+5)_n`, the cofactor signs in (241) cancel the alternating
signs of (239), leaving the closed positive formula

\[
 \det Q_{1,d}[\widehat i,\widehat j]
 =\gamma_d c_jc_{n-i}>0
 \qquad(0\le i,j\le n).                            \tag{242}
\]

Equations (234)--(242) prove, for every `d`, the rank, both null polynomials,
and all order-`q-1` minors of the linear pencil coefficient.  They explain
the single zero full determinant and all positive maximal minors observed in
Section 43.  The replayable report
`bottom_affine_rank_defect_certificate_20260803.json`, generated by
`verify_bottom_affine_rank_defect.py`, checks (235) through `d=25`, (236)
through `d=60`, the null identities through `d=15`, and all 284 maximal
minors through `d=10`.

The lower-order minors of `Q_(1,d)` and, more importantly, the mixed
coefficients of minors of `Q_(0,d)+tQ_(1,d)` are not determined by the
adjugate.  A Vandermonde factorization through the roots in (239) was tested:
its middle matrix is checker-positive entrywise, but it develops a negative
`3` by `3` minor at `d=7`.  Thus (239)--(242) are a genuine all-order
boundary theorem, not yet a common planar-network factorization or a proof
of (211).

## 49. Canonical null-coordinate deflation of the affine pencil

The alternating null vectors in (239) give a sparse coordinate system in
which the remaining affine problem has a one-corner block form.  Write

\[
 (x+5)_n=\sum_{i=0}^n c_i x^i,
 \qquad c_i>0,quad n=q-1.                          \tag{243}
\]

Define the `q` by `n` lower-bidiagonal matrix `L` and the `n` by `q`
upper-bidiagonal matrix `R` by

\[
 L_{j,j}=c_{n-j-1},\quad L_{j+1,j}=c_{n-j},
 \qquad
 R_{j,j}=c_{j+1},\quad R_{j,j+1}=c_j.              \tag{244}
\]

The signs in (239) give `u^TL=0` and `Rv=0`.  Since `Q_(1,d)` has rank
`n`, there is a unique `n` by `n` matrix `W_d` such that

\[
 Q_{1,d}=L W_d R.                                  \tag{245}
\]

Complete the two rectangular matrices at opposite boundaries:

\[
 \overline L=[L\ e_n],
 \qquad
 \overline R=\begin{bmatrix}e_0^T\\R\end{bmatrix}.             \tag{246}
\]

Both completions are nonsingular totally nonnegative bidiagonal matrices.
In these coordinates the affine pencil is

\[
 Q_{0,d}+tQ_{1,d}
 =\overline L\{M_{0,d}+tM_{1,d}\}\overline R,       \tag{247}
\]

with the exact support pattern

\[
 M_{1,d}=\begin{pmatrix}0&W_d\\0&0\end{pmatrix}.   \tag{248}
\]

Here the row partition is `n+1` and the column partition is `1+n`.
The opposite corner of the constant part also vanishes:

\[
 (M_{0,d})_{n,0}=0.                                \tag{249}
\]

This last zero is structural.  The bottom coordinate of
`overline L^(-1)` is proportional to `u^T`, while the first coordinate
column of `overline R^(-1)` is proportional to `v`.  Equations (208),
(238), and the diagonal nature of `D_d` give

\[
 u^TQ_{0,d}v=e_n^TD_de_0=0.                        \tag{250}
\]

Thus the new missing lemma is the coefficientwise total nonnegativity of
the sparse bordered pencil in braces in (247).  It is strictly smaller than
the original formulation in two ways: the variable part is confined to one
`n` by `n` corner, and the constant part has the complementary corner zero.
If this lemma holds for every `d`, Cauchy--Binet with the two TN bidiagonal
outside factors proves coefficientwise TN of `Q_(0,d)+tQ_(1,d)` and hence
the reverse-TP target by Jacobi complementation.

The exact certificate
`bottom_q_pencil_null_deflation_certificate_20260803.json`, generated by
`verify_bottom_q_pencil_null_deflation.py`, checks 1,010 entries of (247),
505 support assertions in (248)--(249), all 505 initial minors through
`d=12`, and all 1,267 minors through `d=7`.  Every checked minor polynomial
has nonnegative coefficients.  Separately, all initial minors of the
rank-deficient `Q_(1,d)` pass exactly through `d=40`, and exhaustive tests
show `W_d` strictly totally positive through `d=10`.

This deflation is not a disguised size recurrence: neither `W_d` nor the
top-right affine block is diagonally equivalent to the `d-1` pencil, and the
natural relative nilpotent remains dense.  Its signs do become separable by
rows or columns, but that alone is not a total-positivity-preserving flow.
The likely all-order mechanism is instead a planar network with a scaled
cut layer matching the complementary support in (248)--(249).

## 50. The beta coefficient matrix and the constant pencil are STP in all orders

The constant endpoint in Section 43 can be removed from the conjectural
part.  More generally, let

\[
 P_p(x)=\prod_{i<p}(x+a_i)\prod_{i\ge p}(x+b_i),
 \qquad 0<a_i<b_i,
\]

with the cross inequalities `a_i<b_j` whenever `i<=j`.  Let `B` be the
coefficient matrix of `P_0,...,P_n`, with coefficient degree increasing down
the rows.  Then `B` is strictly totally positive.  The special values in
(234), together with the positive column factors `4^p`, give the beta matrix
`B_d`.

It suffices to check the Gasca--Pena initial minors.  Fix an order `k`.
For the first `k` columns, factor the common polynomial

\[
 G_k(x)=\prod_{i=k-1}^{n-1}(x+b_i).                \tag{251}
\]

The remaining `k` switch polynomials have degree `k-1`; call their square
coefficient matrix `F_k`.  Evaluation triangularization at the negative
`b_i` gives

\[
 \det F_k=\prod_{0\le i\le j<k-1}(b_j-a_i)>0.      \tag{252}
\]

Coefficient convolution gives

\[
 B[:,0{:}k]=T(G_k)F_k,                             \tag{253}
\]

where `T(G_k)` is the lower-Toeplitz coefficient matrix of `G_k`.  It is a
product of the positive bidiagonal Toeplitz matrices associated with the
factors `x+b_i`.  For every allowed consecutive set of `k` rows, the solid
minor of `T(G_k)` is strictly positive: in its layered-path network, take
`k` parallel paths using the same schedule of `r` down steps, where `r` is
the first selected row and `0<=r<=deg G_k`.  Equations (252)--(253) therefore prove
every initial minor using the first `k` columns positive.

For an arbitrary consecutive block of `k` columns beginning at `ell`, the
common factor is

\[
 G_{\ell,k}(x)=
 \prod_{i<\ell}(x+a_i)
 \prod_{i\ge\ell+k-1}(x+b_i).                     \tag{254}
\]

The first `k` rows of `T(G_(ell,k))` form a lower triangular matrix with
positive constant term on the diagonal, and the residual switch determinant
again has the positive product form (252), with shifted indices.  This proves
the other family of initial minors.  Hence

\[
 \boxed{\ B_d\text{ is strictly totally positive for every }d\ge3.\ }       \tag{255}
\]

Now `C_d=J_qB_d^TJ_q` is also STP.  Jacobi complementation says that for any
STP matrix `M`, the checker-signed inverse `E_qM^{-1}E_q` is STP.  Therefore

\[
 Q_{0,d}
 =(E_qC_d^{-1}E_q)D_d(E_qB_d^{-1}E_q)              \tag{256}
\]

is a product of two STP matrices and a positive diagonal matrix, and is
itself STP.  Thus the positive constant coefficient in every pencil minor
is now an all-order theorem, not finite evidence.

The replayable report `bottom_beta_switch_tp_certificate_20260803.json`,
generated by `verify_bottom_beta_switch_tp.py`, checks 4,899 basis entries
and (235) through `d=25`; it audits 27,131 block-factorization entries, 559
positive switch determinants, 559 positive Toeplitz solid minors, and all
1,014 initial minors of both `B_d` and `Q_(0,d)` through `d=15`.  The proof
above establishes (255)--(256) for all `d`.  What remains in the affine route
is solely the nonconstant coefficientwise TN of the deflated mixed pencil
in (247), not either endpoint matrix by itself.

## 51. The deflated constant core is TN by one Neville step

The constant matrix `M_(0,d)` in (247) is also totally nonnegative in all
orders.  This is not an additional conjecture: the bidiagonal null
coordinates in (246) peel off exactly one Neville-elimination stage of the
beta coefficient matrix.

Put

\[
 G_d^{\rm dual}=E_qB_d^{-1}E_q,
 \qquad
 \mathcal R_d=G_d^{\rm dual}\overline R^{-1}.      \tag{257}
\]

Its checker inverse is

\[
 E_q\mathcal R_d^{-1}E_q=(E_q\overline R E_q)B_d.  \tag{258}
\]

The matrix `E_q overline R E_q` is lower bidiagonal.  In the notation
(243), its zeroth row is unchanged, while for `r>=1` it performs the row
operation

\[
 \operatorname{row}_r\longmapsto
 c_{r-1}\operatorname{row}_r-c_r\operatorname{row}_{r-1}.        \tag{259}
\]

Since the first column of `B_d` is `(c_0,...,c_n)^T`, (259) zeros that
column below its positive first entry.  Applied bottom-to-top, these are
precisely the first-column Neville eliminations of the STP matrix `B_d`.
Consequently

\[
 (E_q\overline R E_q)B_d
 =\begin{pmatrix}c_0&*\\0&\widehat B_d\end{pmatrix},              \tag{260}
\]

where `widehat B_d` is STP.  Hence the matrix in (260) is nonsingular TN,
and Jacobi complementation applied to (258) proves `mathcal R_d` TN.

The left quotient is not independent.  Directly from
`C_d=J_qB_d^TJ_q` and the reversed coefficients in `overline L`,

\[
 \overline L^{-1}(E_qC_d^{-1}E_q)=J_q\mathcal R_d^TJ_q, \tag{261}
\]

which is TN as well.  Substituting the two quotients in (256) and then in
(247) gives the exact factorization

\[
 M_{0,d}=(J_q\mathcal R_d^TJ_q)D_d\mathcal R_d.    \tag{262}
\]

The diagonal `D_d` is positive, so (262) proves

\[
 \boxed{\ M_{0,d}\text{ is totally nonnegative for every }d\ge3.\ }        \tag{263}
\]

Its sole entrywise zero is the complementary corner in (249); all other
entries are positive.  Thus both the original constant pencil `Q_(0,d)` and
the deflated constant core `M_(0,d)` are now controlled uniformly.

The exact report `bottom_beta_neville_quotient_certificate_20260803.json`,
generated by `verify_bottom_beta_neville_quotient.py`, audits 1,014 entries
in each quotient identity, 819 entries and all 819 initial minors of the
unreduced Neville blocks, and 1,014 entries of (262) through `d=15`.  It also
checks 3,801 exhaustive positive-or-zero minors through `d=7`.

After (263), the affine route has one sharply isolated missing assertion:
adding the top-right cut layer `tM_(1,d)` in (248) preserves
coefficientwise total nonnegativity of every minor.  Neither endpoint nor
the outer basis factors remain conjectural.

## 52. Two exact obstructions and a surviving Jordan-chain factor

Two natural attempts to split the remaining affine pencil into separately
totally nonnegative factors fail in small exact examples.

First, let

\[
 R_d=M_{0,d}^{-1}M_{1,d}.
\]

This is nilpotent of rank `q-1`.  There is a canonical Jordan chain
`s_0,...,s_(q-1)` obtained by taking `s_0=e_0` and, at each step, solving
`R_ds_j=s_(j-1)` with zeroth coordinate zero.  If `S_d` has these chain
vectors as columns, then

\[
 R_dS_d=S_dJ_{\rm shift},\qquad
 M_{0,d}+tM_{1,d}=(M_{0,d}S_d)(I+tJ_{\rm shift})S_d^{-1}.       \tag{264}
\]

The attractive middle factor in (264) is TN.  Exact exhaustive tests also
find that `M_(0,d)S_d` is TN through `d=10`.  However, neither `S_d` nor its
inverse has a compatible fixed sign regularity: mixed entry signs appear at
`d=4`, and the obvious alternating row/checker normalizations already have
negative minors of order at most two.  Thus (264) does not give a direct
three-TN-factor proof.  The positivity of the absorbed factor is a surviving
pattern, but it still needs a different treatment of the inverse chain
factor.

Second, the two-sided smoothing in the original homotopy cannot be discarded.
Writing

\[
 A_d(t)=B_dZ_d(t)^{-1}(J_qB_d^TJ_q),
\]

one might hope that the one-sided factor `B_dZ_d(t)^(-1)` is already TP.
It is not.  At `d=6`, its order-two minor on rows `{0,1}` and columns
`{3,4}` is exactly

\[
 -{6912\over3025}
 \left(56882616t^3+349061541t^2+356077813t-528273900\right),   \tag{265}
\]

which is positive at `t=0` but negative at `t=1` (where its value is
`-323133331968/605`).  Consequently the full TP phenomenon genuinely uses
both beta smoothing factors.  The scripts
`explore_bottom_deflated_jordan_chain.py` and
`explore_bottom_one_sided_homotopy_tp.py` replay these exact obstructions.

These failures leave the sparse two-sided cut-layer statement after (263)
as the strongest affine route.  Neville elimination of the full deflated
pencil continues to produce positive rational functions of `t` in every
tested size, but a uniform determinant or planar-network formula is still
required.

## 53. An exact indefinite-direction determinant lift, and its sharp limitation

The compression representation (120a) gives a compact determinant parent for
the entire bottom target.  For the balanced parameters

\[
 N=3m+3,\qquad d=2m+3,
\]

put

\[
 \mathcal P(X,Y,z)=g(X+z)g(Y+z)
 -{z^2\over d(d-1)}h(X+z)h(Y+z).                  \tag{266}
\]

If `u` is the unit compression vector in (120a) and
`alpha=N/sqrt(d(d-1))`, the matrix determinant lemma gives the exact identity

\[
 \mathcal P(X,Y,z)=
 \det\!\begin{pmatrix}
 (X+z)I+C&\alpha z uu^*\\
 \alpha z uu^*&(Y+z)I+C
 \end{pmatrix}.                                    \tag{267}
\]

Moreover, the normalization in (266) was forced precisely so that

\[
 \left.\partial_z^d\mathcal P(X,Y,z)\right|_{z=0}
 =S^d(g\otimes g)-S^{d-2}(h\otimes h)=F_{N,d}(X,Y). \tag{268}
\]

Thus the target is a high directional derivative of one determinant.  The
direction matrix in (267) is

\[
 B_\alpha=
 \begin{pmatrix}I&\alpha uu^*\\\alpha uu^*&I\end{pmatrix},
\]

with eigenvalues

\[
 1\quad(2N-2\hbox{ times}),\qquad 1+\alpha,\qquad 1-\alpha.    \tag{269}
\]

Here `alpha>1`, so this is exactly a one-negative-direction derivative, not
a standard Renegar derivative in a positive semidefinite direction.  Direct
upper-half-plane searches also show that the undifferentiated parent (266)
is not stable; the stability, if proved through (267), must be created by the
particular high derivative.

There is no theorem for arbitrary matrices with the inertia in (269).  This
can be disproved exactly already for `m=1`, where `N=6`, `d=5`, and
`alpha=3/sqrt(5)`.  Diagonalize `B_alpha`, and take the diagonal test matrix
whose entries are

\[
 (3,0,0,-3,1,0,3,-1,-3,3,-2,-2).
\]

The coefficient of `s^5` in `det(tI-A+sB_alpha)` is

\[
 q(t)=576t^7+{4578\over5}t^6-{24444\over5}t^5-7497t^4
      +10492t^3+12213t^2-{23274\over5}t-{8532\over5}.          \tag{270}
\]

An exact Sturm count gives only five real roots, although `deg q=7`; hence
the remaining two roots form a nonreal conjugate pair.  Therefore
`D_(B_alpha)^d det` is not hyperbolic on the full symmetric-matrix space.
The replay script `explore_bottom_indefinite_direction_hyperbolicity.py`
derives (270), performs the exact real-root count, and also finds failures
for every tested balanced size `1<=m<=6`.

Equations (267)--(268) remain useful, but (270) isolates what any successful
proof must retain: the paired block spectrum `(XI+C,YI+C)`, the distinguished
compression vector `u`, and ultimately the aligned Hahn/Nikishin structure
of (116)--(120a).  Inertia alone cannot prove the bottom lemma.

## 54. Actual-size Newton reduction of the Schur tail

The maximal `(d-1)`-square coefficient theorem used in Sections 42--52 is
stronger than the balanced endpoint needs.  The collocation formula for the
Schur tail yields a smaller exact reduction at the actual size.

Put

\[
 d=2m+3,\qquad q=d-1=2m+2,
\]

and let `p_0(x),...,p_(q-1)(x)` and

\[
 D_q(x)=\prod_{r=0}^{q-2}(x+5+r)                  \tag{271}
\]

be the polynomial family and common denominator in the maximal-tail
collocation formula.  If `R_m` is the actual reversed `m` by `m` Schur tail,
then its columns are not the first `m` maximal columns.  Reversal shows that
they are the **last** `m` columns:

\[
 (R_m)_{i,j}={C_{i+3}\over D_q(i)}
              p_{q-m+j}(i),\qquad 0\le i,j<m.     \tag{272}
\]

This distinction is what the maximal affine-pencil route suppresses.

Let `P_m=(binom(i,k))_(0<=i,k<m)` be the lower Pascal matrix and define

\[
 \mathcal D_m(k,j)=
 \Delta^k p_{q-m+j}(0)
 =\sum_{s=0}^k(-1)^{k-s}\binom ks p_{q-m+j}(s).    \tag{273}
\]

Newton interpolation on the only nodes that occur in (272) gives the exact
factorization

\[
 \boxed{
 R_m=operatorname{diag}\left({C_{i+3}\over D_q(i)}\right)_{i=0}^{m-1}
       P_m\mathcal D_m.}                           \tag{274}
\]

The diagonal is positive, and `P_m` is nonsingular totally nonnegative.
Consequently

\[
 \boxed{\ \mathcal D_m\text{ STP for every }m\ge1
         \quad\Longrightarrow\quad R_m\text{ STP for every }m\ge1.\ }  \tag{275}
\]

This is strictly weaker than proving the maximal `(2m+2)`-square coefficient
matrix STP, and it is tailored exactly to the Erdős balance `N=3m+3`.

The entries of `mathcal D_m` are positive in every computed size through
`m=7`.  Every minor is strictly positive through `m=5` (1, 5, 19, 69, and
251 minors respectively).  Degree-cancelling elimination of the selected
polynomials also retains positive coefficients and only strictly negative
real roots at every level through `m=4`.  These facts are finite evidence,
not yet the all-order proof of (275).  The exact identity and audits are
replayed by `explore_bottom_actual_forward_difference_factor.py`; the factor
components and size/elimination diagnostics are in
`explore_bottom_forward_factor_components.py`,
`explore_bottom_forward_size_recurrence.py`, and
`explore_bottom_selected_polynomial_elimination.py`.

The obvious one-step closures do not quite finish the induction.  After one
Schur pivot of `mathcal D_m`, matching a diagonally scaled
`mathcal D_(m-1)` leaves an entrywise positive residual of rank `m-2` with
zero first row and column.  At `m=3` its inner block is a scaled
`mathcal D_1`; from `m=4` onward a further positive correction remains.
Thus a shifted-parameter family, rather than the single balanced sequence,
is likely required to close the recurrence.  The new missing statement is
the actual-size discrete-Chebyshev assertion (275), not the maximal affine
pencil of Section 52.

## 55. Initial-minor, Jordan-gauge, and moment-lift diagnostics

The actual-size reduction (274) can be narrowed once more at the level of
certificates.  Strict total positivity of `mathcal D_m` is equivalent to
positivity of its `m^2` Gasca--Pena initial minors: the consecutive row
blocks using the first `k` columns and the consecutive column blocks using
the first `k` rows.  Exact computation confirms all of them through `m=5`
(as a subset of the exhaustive audit in Section 54).  Their integer
factorizations contain large irreducible factors already for `m=2,3`, so a
naive factorial product formula is not visible.  The script
`explore_bottom_actual_initial_minors.py` isolates precisely this smaller
certificate family.

There is one useful but nonuniform planar factorization in the affine route.
For the deflated pencil, put

\[
 R=M_0^{-1}M_1=S J_{\rm shift}S^{-1}.
\]

The Jordan basis is not unique: it may be replaced by `SP`, where `P` is an
invertible upper-Toeplitz matrix commuting with `J_shift`.  Therefore

\[
 M_0+tM_1=(M_0SP)(I+tJ_{\rm shift})(P^{-1}S^{-1}).       \tag{276}
\]

At `d=4`, the exact gauge

\[
 P=I-{89\over20}J_{\rm shift}+3J_{\rm shift}^2          \tag{277}
\]

makes both outside factors in (276) totally nonnegative.  Thus the
coefficientwise-TN pencil has a genuine three-network-factor proof in this
size.  The same gauge mechanism is not immediately uniform: constrained and
unconstrained semialgebraic searches at `d=5` leave incompatible initial
minor inequalities, while no exact infeasibility theorem has yet been
extracted.  The exact `d=4` certificate and the larger-size searches are in
`explore_bottom_jordan_toeplitz_gauge.py` and
`explore_bottom_jordan_gauge_semialgebraic.py`.

A still stronger columnwise compatibility shortcut is false exactly.  If
every determinant obtained by choosing each column independently from
`M_0` or `M_1` were nonnegative, every pencil coefficient would be a sum of
nonnegative terms.  At `d=4`, rows `{0,1}`, columns `{1,2}`, and the choice
`(M_0[:,1],M_1[:,2])` give

\[
 -{3389\over155247840000}<0.                       \tag{278}
\]

The compensating column choice makes the complete coefficient positive, so
the mixed-minor proof requires an actual cancellation or path-switching
involution.  This obstruction is replayed by
`explore_bottom_deflated_column_compatibility.py`.

Finally, the beta integral gives an exact inner moment lift.  Up to positive
row factors, every selected kernel section has the form

\[
 p_j(x)=\int_0^1 t^x F_j(t)t^{5/2}(1-t)^{1/2}\,dt,          \tag{279}
\]

where the coefficient columns of `F_j` are `diag(4^p)K_dV`.  A Chebyshev
system for the `F_j` on `(0,1)` would prove the actual collocation matrix TP
by Andreief composition.  It is false already for `m=2`: the two-column
Wronskian is a positive multiple of

\[
\begin{split}
 16515072000t^8+108213043200t^7+314030161920t^6
 &+526635171840t^5+554783311360t^4\\
 &+353960314880t^3+117540875520t^2
   +8119325696t-3852808983,
\end{split}                                                    \tag{280}
\]

which is negative at `t=1/10` and positive at `t=3/20`.  Hence the outer
moment transform genuinely repairs an inner sign defect.  The surviving
planar-network strategy must therefore attach the Catalan/beta entrance and
exit layers before uncrossing the central inverse-M-matrix paths; none of
the three factors is sufficiently positive in isolation.

## 56. Exact obstructions and a nested shifted Schur cascade

Two plausible shortcuts to the missing total-positivity lemma can now be
excluded rigorously.  First, the negative `2` by `2` minors of the bare
central factor are not confined to the simplest crossing pattern.  That
classification holds through `d=9`, but at `d=10` the minor on rows
`{0,1}` and columns `{2,3}` is

\[
 -{1870400\over28083}<0.                            \tag{281}
\]

Nor do adjacent row ratios have only one turn: the maximum number of sign
changes in their cross differences is two at `d=10` and three by `d=14`.
The exhaustive exact audit through `d=30` checks 1,023,526 central
two-minors.  It is recorded in
`bottom_central_two_minor_crossings_20260803.json` and
`bottom_central_ratio_turning_20260803.json`.

Second, the direct distinguished-pair partial symmetrization does not give
a stable quadratic parent.  At `(N,d)=(6,5)` let `r` be the unique root in
`(14,15)` of

\[
 Q(r)=r^4-54r^3+810r^2-3600r+3240.                \tag{282}
\]

The same-leaf cross-prefix form, reduced modulo `Q`, is

\[
 -{8\over27}
 (357476r^3-19502549r^2+298932318r-1252793142)<0, \tag{283}
\]

whereas the complete endpoint value is

\[
 F_{6,5}(1,1)=19609447680>0.                       \tag{284}
\]

Block-swap symmetry puts these directions in invariant orthogonal
subspaces, so the coefficient quadratic form has at least two positive
eigenvalues.  A homogeneous stable quadratic has at most one.  Thus the
obvious orbit-polynomial parent is exactly obstructed, not merely missed by
a numerical search.  The Sturm isolation and exact reductions are replayed
by `verify_distinguished_pair_parent_obstruction.py` and recorded in
`distinguished_pair_parent_exact_obstruction_20260803.json`.

The actual-size forward-difference route has simultaneously strengthened.
An initial symbolic run proved all 923 minors of `mathcal D_6` strictly
positive and checked entries and (274) through `m=8`.  A later direct
exact-rational implementation extended the exhaustive audit through `m=10`:
the counts are

\[
 1,5,19,69,251,923,3431,12869,48619,184755,       \tag{284a}
\]

for a total of 250,942 strictly positive minors and no zero or negative one.
Complete Neville elimination of the matrix and its transpose gives 9,920
positive multipliers and pivots through `m=30`.  These are finite
certificates, not an all-size theorem.  More importantly, introduce
the shifted family `C(n,s)` by fixing

\[
 q=2n+2+s
\]

and taking forward differences `0,...,n-1` of the last `n` polynomials in
the fixed-`q` maximal family.  The balanced target is `C(m,0)`, while size
reduction at fixed `q` sends `(n,s)` to `(n-1,s+2)`.

After the top-left Schur pivot of `C(n,s)`, diagonally match its first row
and column to `C(n-1,s+2)`.  In every exact case checked, the residual has
zero first row and column, is strictly positive everywhere else, and has
rank `n-2`.  Delete the zero boundary and repeat against `C(n-2,s+4)`.
The process continues with ranks

\[
 n-2,n-3,\ldots,1,0,                              \tag{285}
\]

and every matching scale remains positive.  This has been checked through
`n=7` at shift zero and `n=6` at shift two.  The compact replay is
`explore_bottom_forward_nested_schur_cascade.py`; its JSON report deliberately
uses a smaller range because the exact expressions grow rapidly.

The cascade is the strongest new positive signal, but entrywise positivity
of successive corrections is not itself a total-positivity closure theorem.
The missing step is now concrete: identify the cascade with a Neville or
planar-network factorization whose edge weights are all positive.  The
relevant cancellation model is the negative-edge involution of Li--Li--Yang--
Zhang.  Here the central M-matrix already has the exact local form

\[
 -Z_{p,q}=
 \sum_{r=p}^{q}{C_{r-p+1}C_{q-r+1}\over\binom dr},
 \qquad p<q,                                      \tag{286}
\]

so a negative direct jump has precisely the weight of its positive Catalan
two-step detours.  A successful proof must attach the two beta networks and
pair the first offending direct jump with such a detour.  No complete
involution or all-size cascade identity has yet been obtained.

The compact finite cascade pattern does **not** extend indefinitely.  A
direct `Fraction` implementation of the same formulas, checked against the
SymPy construction, reaches larger sizes without expression expansion.  At
`n=9`, the `7` by `7` inner residual after the first match has every proper
minor strictly positive but negative determinant.  At `n=10`, the first six
inner residuals are entrywise positive, while the depth-seven `2` by `2`
residual has all four entries negative:

\[
 \det R_{9,1}<0,\qquad R_{10,7}<0\quad\hbox{entrywise}.          \tag{287}
\]

Thus (285) is finite evidence only and the naive positive-correction
induction is false.  This does not affect the verified strict total
positivity of the original forward matrices through `m=10`; it only removes
the proposed proof of it.  The exact reconstruction, its 30-entry symbolic
cross-check, the complete minor audits, and the two-sided Neville audits are
in `fast_bottom_forward.py`,
`bottom_actual_forward_fast_certificate_20260803.json`, and
`bottom_forward_cascade_obstruction_20260803.json`, generated by
`verify_bottom_actual_forward_fast.py` and
`verify_bottom_forward_cascade_obstruction.py`.

## 57. Symmetric mixed differences and an exact Sturm hierarchy

The actual-size forward matrix has a symmetric reduction that is cleaner
than (273).  Retain `q=2m+2`, let `B_q` be the beta coefficient matrix in
(194), and put

\[
 A_m(k,p)=\Delta^k\beta_p(0),\qquad
 0\leq k<m,\quad 0\leq p<q.                       \tag{288}
\]

Thus `A_m` consists of the first `m` rows of the full forward-difference
transform of `B_q`.  Define the symmetric matrix

\[
 T_m=A_mK_dJ_qA_m^{\mathsf T},\qquad d=q+1.        \tag{289}
\]

Let `P_m=(binom(i,k))` and let `J_m` reverse `m` coordinates.  The beta
evaluation identity

\[
 {C_{r+p+3}\over C_{r+3}}
 ={\beta_p(r)\over D_q(r)},\qquad
 \bigl(\beta_p(r)\bigr)_{0\leq r<m,\,0\leq p<q}
 =P_mA_m                                                   \tag{290}
\]

gives, with

\[
 S_m=\operatorname{diag}\left(
 {C_{m-j+2}\over D_q(m-1-j)}
 \right)_{j=0}^{m-1}>0,
\]

the exact all-size factorization

\[
 \boxed{\ \mathcal D_m
   =(T_mJ_m)(J_mP_m^{\mathsf T}J_m)S_m.\ }         \tag{291}
\]

The middle factor is nonsingular totally nonnegative.  It follows that the
new sufficient statement

\[
 \boxed{\ T_m\text{ is strictly sign regular with }
 \operatorname{sign}\det T_m[I,J]
   =(-1)^{k(k-1)/2}\quad(|I|=|J|=k)\ }             \tag{292}
\]

implies `T_mJ_m` STP, hence implies (275) by Cauchy--Binet.  This is not a
new logical obligation beyond the bottom lemma, but it exposes its symmetric
mixed-forward-difference core and removes the final Catalan collocation
factor from the conjectural object.

The sign rule (292) has been checked for every minor through `m=10`: the
same counts

\[
 1,5,19,69,251,923,3431,12869,48619,184755
\]

give 250,942 exact nonzero minors with the prescribed signs.  All 385
entries of (291) through `m=10` agree exactly.  The replayable record is
`bottom_mixed_forward_sign_regular_certificate_20260803.json`, generated by
`verify_bottom_mixed_forward_sign_regular.py`.  The factorization (291) is
an algebraic identity for every `m`; the audit of (292) is finite evidence.

There is a compatible polynomial signal, but its precise limitation matters.
Start with the last `m` polynomial columns `p_(q-m),...,p_(q-1)`.  At each
stage replace adjacent polynomials `f,g` by

\[
 {\operatorname{lc}(g)\over\operatorname{lc}(f)}f-g,           \tag{293}
\]

which cancels the leading degree.  Through `m=10`, every polynomial at every
stage has all coefficients strictly positive and all roots strictly negative;
this comprises 220 exact Sturm-counted polynomials and 3,355 positive
coefficients.  However, the raw columns do **not** form one ordinary common
interlacing chain.  Already at `m=4`, each of the three adjacent Wronskians
has exactly two negative roots.  Hence a proof of (292) may use the complete
degree-cancelled hierarchy, but cannot invoke pairwise proper position of the
raw columns.  These exact facts are recorded in
`bottom_selected_sturm_hierarchy_certificate_20260803.json`, generated by
`verify_bottom_selected_sturm_hierarchy.py`.

## 58. A selected coefficient rectangle and dual endpoint hierarchies

There is a direct coefficient-level strengthening of the actual-size bottom
lemma which is smaller than the maximal square target (191).  Retain
`q=2m+2` and define the `q` by `m` selected coefficient rectangle

\[
 \mathcal C_m(r,j)=[x^r]p_{q-m+j}(x),
 \qquad 0\le r<q,\quad0\le j<m.                  \tag{294}
\]

Let

\[
 \mathfrak S_m(k,r)=k!\,\left\{\!\!\begin{matrix}r\\k\end{matrix}\!\!\right\},
 \qquad 0\le k<m,\quad0\le r<q,
\]

where the braces denote Stirling numbers of the second kind.  The monomial
formula for forward differences gives the exact all-size identity

\[
 \boxed{\ \mathcal D_m=\mathfrak S_m\mathcal C_m.\ }           \tag{295}
\]

The rectangular Stirling matrix is totally nonnegative.  Moreover, for any
minor using row set `I`, its submatrix on the same degree columns `I` is
triangular with positive diagonal `k!`.  Therefore Cauchy--Binet proves the
clean sufficient statement

\[
 \boxed{\ \mathcal C_m\text{ STP for every }m\ge1
          \quad\Longrightarrow\quad
          \mathcal D_m\text{ STP for every }m\ge1.\ }          \tag{296}
\]

This coefficient rectangle has much stronger exact evidence than was
previously recorded.  Complete Neville elimination of `mathcal C_m` and its
transpose through `m=30` gives 19,375 strictly positive multipliers and 930
strictly positive pivots, with no zero or negative parameter.  At `m=30`
alone the two orientations have respectively 1,395 and 435 positive
multipliers.  These are precisely the two Gasca--Pena families of initial
minors needed for rectangular strict total positivity.

One orientation has an equivalent polynomial cancellation description.  Put
`G_j^(0)=p_(q-m+j)` and recursively cancel the lowest coefficient by

\[
 G_j^{(s+1)}(x)=
 {G_{j+1}^{(s)}(x)-
  \dfrac{G_{j+1}^{(s)}(0)}{G_j^{(s)}(0)}G_j^{(s)}(x)\over x}.
                                                               \tag{297}
\]

Through `m=30`, every coefficient of every polynomial in (297) is strictly
positive: 199,640 exact coefficient inequalities.  Through `m=10`, all 55
polynomials in this low-endpoint hierarchy also have all roots strictly
negative by exact Sturm counts.  Thus (293) and (297) provide positive
high- and low-endpoint cancellation triangles.  This is not yet an all-size
proof: even the more refined claim that every child in (297) interlaces its
parent fails at `m=4`, despite real-rootedness of the child.

The right boundary of the high-endpoint triangle (293) gives another useful
factorization.  If

\[
 \phi_r=F_r^{(m-1-r)},\qquad0\le r<m,
\]

where `F` denotes the hierarchy in (293), then the degrees of the `phi_r`
are the consecutive integers `m+2,...,2m+1`.  Back-substitution in (293)
expresses every selected raw polynomial as a positive path sum of the
`phi_r`; in matrix form,

\[
 \mathcal C_m=\Phi_m R_m,                          \tag{298}
\]

where `R_m` is lower triangular and is the path matrix of the triangular
back-substitution network whenever the cancellation multipliers are
positive.  Direct two-sided Neville elimination of both `Phi_m` and `R_m`
passes exactly through `m=20`.

A tempting square completion of `Phi_m` is nevertheless false and must not
be used as an induction lemma.  Prepending

\[
 \phi_0^{(m+2)},\phi_0^{(m+1)},\ldots,\phi_0'
\]

to `phi_0,...,phi_(m-1)` gives an upper-triangular `2m+2` square coefficient
matrix.  It has all 184,755 minors nonnegative at `m=4` and complete positive
transpose Neville elimination through `m=19`, but at `m=20` the order-26
minor on rows `0,...,25` and columns `16,...,41` is strictly negative.  The
first negative multiplier occurs at elimination column 25, row 41.  This
exact obstruction removes only the derivative completion, not (296), (297),
or the directly audited boundary matrix.

The replayable reports are
`bottom_selected_coefficient_neville_certificate_20260803.json`, generated by
`verify_bottom_selected_coefficient_neville.py`, and
`bottom_derivative_completed_boundary_tn_certificate_20260803.json`,
generated by `verify_bottom_derivative_completed_boundary_tn.py`.  The
Sturm reconnaissance is in `probe_bottom_dual_endpoint_hierarchy.py`; all
finite ranges above are evidence for the remaining uniform coefficient
lemma, not substitutes for it.

## 59. A super-ballot switch theorem and a confluent coordinate candidate

The beta and super-ballot factors have an exact cancellation which turns one
of the experimental bridges into an all-order theorem.  Put `n=q-1`, let
`B_q` be the beta coefficient matrix in (194), and retain the super-ballot
triangle `Tau_q` from (219).  Define

\[
 \gamma_p(x)=(x+3)_p(x+p+5)_{q-1-p}
 ={(x+3)_{q+1}\over(x+p+3)(x+p+4)},
 \qquad0\le p<q.                                  \tag{299}
\]

Then

\[
 \boxed{\ B_q\Tau_q^{-1}
   =\bigl([x^r]\gamma_p(x)\bigr)_{0\le r,p<q}.\ } \tag{300}
\]

This follows directly from the barycentric identity (218).  If `E` evaluates
the beta basis at `-3,-4,...,-q-3` and `W` is the reciprocal-derivative
diagonal, then

\[
 WE\Tau_q^{-1}=-\Delta^T.                         \tag{301}
\]

The `p`th column on the right of (301) is supported only at nodes `p` and
`p+1`.  The polynomial in (299) vanishes at every other node, while its two
remaining values are

\[
 (-1)^p p!(q-p)!,\qquad
 (-1)^p(p+1)!(q-p-1)!,                            \tag{302}
\]

which are exactly the values obtained after undoing `W`.  Both sides of
(300) have degree at most `q-1`, so the `q+1` node values prove the identity.

There is a useful total-positivity consequence.  Let `L_q` be the unit lower
triangular coefficient matrix whose `r`th polynomial column is

\[
 \ell_r(x)=x^r\prod_{i=r}^{q-2}\left(1+{x\over i+5}\right). \tag{303}
\]

The common-tail construction in Section 50 gives `B_q=L_qU_q`.  The same
lower factor applies to (299), so

\[
 B_q\Tau_q^{-1}=L_q(U_q\Tau_q^{-1}).               \tag{304}
\]

The polynomials (299) are precisely the switch family of Section 50 with
`a_i=i+3` and `b_i=i+5`.  Their coefficient matrix is therefore STP in all
orders.  Uniqueness of unit-lower LU factorization, or equivalently its
positive Neville factorization, proves

\[
 \boxed{\ U_q\Tau_q^{-1}\text{ is nonsingular TN for every }q.\ } \tag{305}
\]

This explains the exact two-sided Neville audit through `q=30`; the finite
audit is no longer the reason to believe (305), because (299)--(304) prove it
for every size.  After division of row `r` by `(r+5)_(q-1-r)`, these upper
matrices are truncations of one universal array.  Its first rows include

\[
 R_{0,p}={12\over(p+3)(p+4)},\qquad
 R_{1,p}={5p(7p+25)\over(p+3)^2(p+4)^2},           \tag{306}
\]

consistent with the switch proof but not needed for it.

A second coordinate family gives a sharper candidate for the still-missing
coefficient theorem.  For `0<=t<5`, put

\[
 g_p^{(t)}(x)=(x+t)^p(x+p+5)_{q-1-p},qquad
 G_q(t)=\bigl([x^r]g_p^{(t)}(x)\bigr)_{r,p},       \tag{307}
\]

and let `U_q(t)=L_q^{-1}G_q(t)` be its upper factor relative to the fixed
common-tail lower matrix (303).  For the full fixed-`q` coefficient matrix
`C_q=B_qK_dJ_qH_qJ_q`, set

\[
 \widehat Z_q(t)=U_q(t)^{-1}C_q.                   \tag{308}
\]

For every `0<t<5`, `G_q(t)` is STP by the switch theorem with the constant
root sequence `a_i=t` and `b_i=i+5`.  At `t=0`, it is a positive column
scaling of (303).  The basis has the elementary differential law

\[
 {\partial\over\partial t}g_p^{(t)}
 ={p\over p+4-t}\bigl(g_{p-1}^{(t)}-g_p^{(t)}\bigr). \tag{309}
\]

Thus `G_q'(t)=G_q(t)A_q(t)` and, since `L_q` is independent of `t`, also
`U_q'(t)=U_q(t)A_q(t)`, where `A_q(t)` is upper bidiagonal with

\[
 A_{p-1,p}={p\over p+4-t},\qquad
 A_{p,p}=-{p\over p+4-t}.                          \tag{310}
\]

The transition matrix from `s` to `t`, for `0<=s<t<5`, is a time-ordered
product of nonnegative upper-bidiagonal pure-death steps and is TN.  Hence

\[
 \widehat Z_q(s)=T_q(s,t)\widehat Z_q(t),
 \qquad T_q(s,t)\text{ TN}.                       \tag{311}
\]

The distinguished endpoint `t=1` has exceptionally strong exact evidence:

\[
 \boxed{\ \widehat Z_q(1)\text{ passes strict two-sided Neville elimination for }
          2\le q\le50.\ }                          \tag{312}
\]

There are 20,825 positive multipliers in each orientation over this range,
and every pivot is positive.  If (312) is proved for every `q`, then
`C_q=U_q(1)\widehat Z_q(1)` is STP, which proves (296) and the bottom
forward lemma.
Equation (311) would simultaneously prove the entire interval `0<=t<=1`.

The endpoint cannot simply be enlarged without proof.  Exact elimination at
`t=3/2` first fails at `q=11`, while `t=2` first fails at `q=4`.  Nor can
(312) be split into already-positive central factors: the shifted upper beta
factor times `K_d` fails at `q=5`; the natural super-ballot compressed first
factor fails at `q=7`; and its pairwise Wronskian system also acquires an
interior root at `q=7`.  The `t=1` inverse is dense, and neither one-step nor
two-step deletion gives diagonal nesting in the checked ranges.  These
obstructions leave (312) as a genuine global confluent-coordinate lemma, not
a consequence of the discarded factorwise, interlacing, or production-matrix
shortcuts.

The replayable certificate
`confluent_switch_bridge_certificate_20260803.json`, generated by
`verify_confluent_switch_bridge.py`, checks (300) entrywise through `q=30`,
audits both Neville orientations of (305) through `q=30`, and audits (312)
through `q=50`.  The all-order claims (300) and (305) are proved above; the
finite range in (312) remains evidence for the new uniform obligation, not a
substitute for its proof.

## 60. Barycentric endpoint obstruction and a Catalan--Newton quotient

The confluent coordinate flow has an algebraically distinguished endpoint,
but exact computation now shows that this endpoint cannot prove the uniform
coefficient theorem.  Write

\[
 Z_q^{\rm dir}(t)=G_q(t)^{-1}C_q
\]

for the direct quotient, as opposed to the upper-factor quotient in (308).
At `t=3`, the basis `g_p^(3)` has a universal barycentric bridge to the
gap-two switch basis (299).  If `G_q(3)=Gamma_qT_q`, then

\[
 (T_q)_{a,p}=
 {(-1)^p\over(p+1)!}
 \sum_{i=0}^{a}(-1)^i\binom{p+1}{i}i^p,
 \qquad a\le p,                                  \tag{313}
\]

with zero entries for `a>p` and diagonal

\[
 (T_q)_{p,p}={(p+1)^p\over(p+1)!}.               \tag{314}
\]

The inverse is entrywise positive.  More explicitly, its connection
coefficients are determined by

\[
 {y(y+1)\over(y+p)(y+p+1)}
 =\sum_{a=1}^{p}c_{a,p}{y^a\over(y+2)_a},         \tag{315}
\]

where

\[
 c_{a,p}=
 {(a+1)(p-1)^{\underline{a-1}}\over p^a(p+1)^a}
 \sum_{k=1}^{a}k\binom{a+1}{k+1}p^{a-k}>0.       \tag{316}
\]

This bridge led to a positive normalized-CDF cancellation hierarchy through
`q=40`, comprising 11,480 exact positive weights, and to simple common-tail
row factorizations.  The evidence is nevertheless finite for a substantive
reason.  At the actual Erdos size `m=25`, `q=52`, the last `m` columns of
`Z_q^(dir)(3)` fail transpose Neville elimination at column 5, row 20.  The
corresponding `6` by `6` minor on quotient rows `0,...,5` and selected
columns `15,...,20` (full columns `42,...,47`) is a strictly negative exact
rational number, while its adjacent denominator minors are positive.  The
same selected quotient passes in both orientations for every `m<=24`, and
the `t=1` quotient still passes at `m=25`.  A parallel selected rectangle of
the stronger symmetric mixed kernel also first fails at `m=25`.  Thus the
`t=3` endpoint and its full-interlacing proposal are false; equations
(313)--(316) remain valid identities but cannot close the conjecture.

The surviving coordinate reduction is simpler than (308).  Let `L_q` be the
common Newton lower factor (303), let `U_q^(beta)=L_q^(-1)B_q`, and define

\[
 \boxed{\ Y_q=L_q^{-1}C_q
       =U_q^{(\beta)}K_dJ_qH_qJ_q.\ }             \tag{317}
\]

Here `H_q=(C_(i+j+3))` is the Catalan Hankel matrix.  Since `L_q` is
nonsingular TN, the all-order assertion

\[
 \boxed{\ Y_q\text{ is STP for every }q\ }        \tag{318}
\]

implies the maximal coefficient theorem (191), hence the selected theorem
(296) and the bottom induction lemma.  Exact two-sided Neville elimination
of (317) passes for every `2<=q<=60`: there are 35,990 positive multipliers
in each orientation and 1,829 positive pivots, with no zero parameter.
This is exact finite evidence, not a proof of (318).

One complete Neville orientation of the checker inverse of (317) is now
explained in all orders.  Put

\[
 E_q=\operatorname{diag}(1,-1,1,-1,\ldots),
 \qquad
 Y_q^\#=E_qY_q^{-1}E_q.
\]

Since `Z_d=K_d^(-1)`, direct inversion gives

\[
 Y_q^\#=A_qQ_q,
 \quad
 A_q=E_qJ_qH_q^{-1}J_qE_q,
 \quad
 Q_q=E_qZ_d(U_q^{(\beta)})^{-1}E_q.               \tag{319}
\]

The matrix `A_q` is STP for every `q`: `H_q` is a strictly totally positive
moment matrix, and checker inversion followed by simultaneous row and column
reversal preserves strict total positivity.  The second factor in (319) is
upper triangular.  Consequently right multiplication by it does not change
the lower Neville factor.  In zero-based indices, the lower Neville
multiplier in elimination column `c` and row `r`, with

\[
 0\le c\le q-2,\qquad c+1\le r\le q-1,
 \qquad i=q-r,
\]

has the following simple formula in every exact case checked:

\[
 \boxed{
 m_{q,c,r}=
 {2i(2i+5)(q+i+3)\over
  (q-i)(q+i+3-c)(q+i+2-c)}>0.}                   \tag{320}
\]

Formula (320) is the expected Jacobi/Beta Neville factor of the reversed
checker inverse of the moment matrix for the weight
`t^(5/2)(1-t)^(1/2)`.  It has been checked entrywise against both factors in
(319) through `q=30`, for 4,495 exact identities.  Even without using the
closed formula, the all-order strict total positivity of `A_q` proves that
all of these lower multipliers are positive.  Thus the remaining part of
(318) is no longer a two-sided mystery: after removing the all-order Catalan
lower factor, prove that the terminal upper factor in (319) is TN.

Several immediate descriptions of that upper factor are false.  The bare
upper factor `Q_q` first has a negative order-three minor at `q=5` and is
not even entrywise nonnegative from `q=7`.  Row-polynomial real-rootedness
fails at `q=3`; Hurwitz stability fails at `q=5`; and the triangular
evaluation split at nodes `0,-5,-6,...` fails already at `q=3`.  The complete
product nevertheless retains positive transpose Neville parameters through
`q=60`.  The precise remaining obligation is therefore a one-sided
Catalan-smoothed upper-network theorem, not any of the discarded ordinary
interlacing, Hurwitz, or factorwise-TP claims.

The endpoint obstruction is replayed by
`verify_t3_selected_direct_obstruction.py` and recorded in
`t3_selected_direct_obstruction_20260803.json`.  The Catalan Neville formula
is replayed by `verify_newton_checker_catalan_neville.py` and recorded in
`newton_checker_catalan_neville_20260803.json`.  The square audit of (317) is
generated by `verify_newton_full_quotient_neville.py` in
`newton_full_quotient_neville_20260803.json`.

## 61. The good smoothing factor is an explicit Jacobi triangle

The upper factor contributed by `A_q` in (319) is not opaque.  The moment
representation of the shifted Catalan matrix is, up to a positive constant,

\[
 (H_q)_{r,s}=\int_0^4 x^{r+s}x^{5/2}(4-x)^{1/2}\,dx.
\]

Let `P` be the lower-triangular coefficient matrix of the monic orthogonal
polynomials for this measure and let `D` be their squared-norm diagonal.
Thus

\[
 PH_qP^T=D,
 \qquad H_q^{-1}=P^TD^{-1}P.
\]

The checker-reversed inverse in (319) consequently has the exact Gaussian
factorization

\[
 A_q=(E_qJ_qP^TJ_qE_q)(E_qJ_qD^{-1}PJ_qE_q).     \tag{321}
\]

The first parenthesis is lower triangular and the second is upper
triangular.  Write the latter as `U_q^(J)`.  Its row `i` corresponds to
`n=q-1-i`.  After division by its positive diagonal entry, its `k`th entry
has the closed form

\[
 \boxed{
 { (U_q^{(J)})_{i,i+k}\over (U_q^{(J)})_{i,i}}
 =4^k{n\choose k}
 { (n+\tfrac72-k)_k\over(2n+4-k)_k},
 \quad 0\leq k\leq n.}                           \tag{322}
\]

Indeed, the orthogonal polynomial before monic normalization is

\[
 p_n(x)=P_n^{(1/2,5/2)}(x/2-1).
\]

Equivalently, with `t=x/4`,

\[
 P_n^{(1/2,5/2)}(2t-1)
 ={(-1)^n(\tfrac72)_n\over n!}
 {}_2F_1\!\left(\begin{matrix}-n,n+4\\[1mm]\tfrac72\end{matrix};t\right).
\]

Taking the ratio of its coefficients of degrees `n-k` and `n`, inserting
the checker sign, and changing from `t` back to `x` gives (322) directly.
Thus (322) is an all-order identity, not a fitted formula.  It also shows
that the normalized row polynomial is a reciprocal transform of `p_n`.
Its zeros are negative and consecutive rows interlace, because the zeros of
the Jacobi polynomials lie in `(0,4)` and interlace.  This explains exactly
which classical smoothing repairs the sign defects of the bare `Q_q` in
(319).  The remaining target is now the concrete statement

\[
 \boxed{\ U_q^{(J)}Q_q\text{ is TN for every }q.\ }              \tag{323}
\]

The super-ballot conjugations suggested by Section 46 do not make (323)
local: each of `Z Tau^(-1)`, `Tau Z`, and the two natural conjugates remains
dense, and its checker Neville test already has a negative parameter at
`q=3`.  Hence the sparse-death-chain shortcut is unavailable.

The indexing and every coefficient in (322) have been audited exactly
through `q=50` (22,099 identities) by
`verify_newton_checker_jacobi_upper.py`, with report
`newton_checker_jacobi_upper_20260803.json`.  A separate FLINT-rational
implementation, `stress_newton_full_quotient_flint.py`, independently
reproduces the two-sided audit of (317) and has passed orders `q=70` and
`q=80`.  These larger computations remain finite evidence for (318), while
(321)--(322) are all-order identities.

## 62. A universal beta triangle gives an exact two-sided sandwich

The right side of (323) also has an all-order normalization.  Put `n=q-1`
and define a universal upper triangle `W=(W_(r,p))` by

\[
 4^p(x+\tfrac72)_p
 =\sum_{r=0}^p W_{r,p}x^r(x+r+5)_{p-r}.           \tag{324}
\]

Multiplication by `(x+p+5)_(n-p)` and comparison with the Newton columns
(303) immediately gives

\[
 U_q^{(\mathit{beta})}=S_qW_q,
 \qquad
 (S_q)_{r,r}=(r+5)_{n-r},                         \tag{325}
\]

where `W_q` is the leading `q` by `q` truncation.  Thus all dependence on
the ambient size in this beta upper factor is a positive row scaling.  The
same identity can be divided by `(x+5)_p` to give the rational connection

\[
 4^p{(x+\tfrac72)_p\over(x+5)_p}
 =\sum_{r=0}^pW_{r,p}{x^r\over(x+5)_r}.           \tag{326}
\]

Let `V=W^(-1)`.  Inverting (326) yields, for every `j`,

\[
 {x^j\over(x+5)_j}
 =\sum_{p=0}^jV_{p,j}
   4^p{(x+\tfrac72)_p\over(x+5)_p}.               \tag{327}
\]

Equations (325)--(327) explain the previously observed size independence of
the inverse coordinates.  For example,

\[
 V_{0,j}={(-1)^j7^j\over3\cdot5\cdots(2j+1)}.
\]

The triangle `W_q` is nonsingular TN in every order.  Indeed, positive row
scaling identifies it with the upper Neville factor of the all-order STP
beta switch matrix from Sections 50 and 59.  Jacobi complementation then
proves

\[
 \overline V_q:=E_qV_qE_q\quad\hbox{is nonsingular TN}.          \tag{328}
\]

Using (325) in (319), and using the fact that `S_q` commutes with `E_q`,
gives the exact factorization

\[
 Q_q=(E_qZ_dE_q)\overline V_qS_q^{-1}.            \tag{329}
\]

Consequently the terminal factor required in (318) is, up to positive
diagonal scaling,

\[
 \boxed{
 U_q^{(J)}Q_q
 =U_q^{(J)}(E_qZ_dE_q)\overline V_qS_q^{-1}.}      \tag{330}
\]

Both outside triangles in (330) are TN for every order and have explicit
classical origins: Jacobi on the left and the beta-switch connection on the
right.  The middle matrix is the checker form of the explicit Catalan upper
M-matrix (180).  This is a sharper statement of the missing lemma: prove
total nonnegativity of this **specific two-sided sandwich**.

Neither smoother can be discarded.  The right-smoothed product is `Q_q`,
which has the obstructions listed after (320).  The left-smoothed product
`U_q^(J)(E_qZ_dE_q)` passes only through `q=4`; at `q=5` its transpose
Neville elimination has the exact negative multiplier

\[
 -{22357032708\over93921051259}
\]

in zero-based elimination column `2`, row `4`.  The complete sandwich (330),
in contrast, has passed independent exact FLINT elimination through
`q=100`, including 9,900 positive multipliers at `q=100`.  This is strong
finite evidence but leaves the all-order sandwich theorem unproved.

## 63. Closed Neville weights for the universal beta smoother

The TN assertion (328) has a completely explicit all-order bidiagonal
factorization.  More precisely, in zero-based Neville elimination of
`W_q^T`, the multiplier in elimination column `c` and row `r` is

\[
 \boxed{
 \mu^{(W)}_{c,r}
 ={2(r+3)^c(2r+5-2c)\over(r+4)^{c+1}}>0,
 \qquad0\leq c<r.}                                \tag{331}
\]

For the checker inverse `overline V_q^T`, the corresponding multiplier is

\[
 \boxed{
 \mu^{(\overline V)}_{c,r}
 ={(2c+7)(r+4)^c\over(2r+1)(r+3)^c}>0.}           \tag{332}
\]

Here is an all-order derivation.  Put `a=7/2`, `b=5`, and

\[
 F_p(x)=4^p{(x+a)_p\over(x+b)_p},
 \qquad \psi_r(x)={x^r\over(x+b)_r}.
\]

Equation (326) is `F_p=sum_r W_(r,p) psi_r`.  For `s>=0` and `0<=h<=c`,

\[
 {F_{s+h}(x)\over F_s(x)}
 =4^h{(x+s+a)_h\over(x+s+b)_h}.
\]

The elementary consecutive-ratio Wronskian identity

\[
 \operatorname {Wr}_{0\leq i,h\leq c}
 \left[4^h{(x+A)_h\over(x+B)_h}\right]
 ={4^{c(c+1)/2}\prod_{j=1}^c j!(B-A)_j
   \over\prod_{h=0}^{c-1}(x+B+h)^{c+1}}          \tag{333}
\]

follows by induction on `c` (or by comparing its poles and its value at
infinity after one column difference).  Since

\[
 \psi_k^{(k)}(0)={k!\over(b)_k},
 \qquad \psi_k^{(i)}(0)=0\quad(i<k),
\]

the initial solid minor

\[
 D_{r,c}=\det[W_{k,p}]_{0\leq k\leq c,\ r-c\leq p\leq r}
\]

is the Wronskian in (333), divided by the fixed triangular derivative
Jacobian.  Hence

\[
 D_{r,c}=C_c
 \left({4^{r-c}(a)_{r-c}\over(b)_r}\right)^{c+1},
 \quad
 C_c=4^{c(c+1)/2}
      \prod_{j=1}^c(b-a)_j\prod_{j=0}^c(b)_j.     \tag{334}
\]

The standard Neville ratio

\[
 \mu^{(W)}_{c,r}
 ={D_{r,c}D_{r-2,c-1}\over
   D_{r-1,c-1}D_{r-1,c}}
\]

now reduces immediately to (331).

For completeness, Jacobi complementation gives the initial minor of
`overline V_q^T` in the form

\[
 \overline D_{r,c}={D_{r,r-c-1}\over D_{r,r}}.    \tag{335}
\]

Substitution of (334) into the same Neville ratio, using

\[
 {C_j\over C_{j-1}}=4^j(b-a)_j(b)_j,
\]

gives (332).  Thus the two outside networks in (330) have explicit positive
edge weights (320) and (332); no unproved total-positivity claim remains in
either smoother.  The exact audit `verify_beta_universal_neville.py` checks
40,424 nesting identities and 20,825 instances of each of (331) and (332)
through `q=50`, recorded in `beta_universal_neville_20260803.json`.

## 64. A coefficientwise off-diagonal homotopy

The two-sided sandwich in (330) admits a deformation with a much stronger
finite positivity pattern than pointwise Neville elimination reveals.  Put

\[
 M_q=E_qZ_dE_q,\qquad
 M_{0,q}=\operatorname {diag}M_q,\qquad
 M_{1,q}=M_q-M_{0,q},
\]

and, suppressing the harmless positive diagonal factor `S_q^(-1)`, define

\[
 T_q(t)=U_q^{(J)}(M_{0,q}+tM_{1,q})\overline V_q.  \tag{336}
\]

Thus `T_q(0)` is a product of two TN triangles and a positive diagonal
matrix, while `T_q(1)` is exactly the terminal factor in (330).  For
`0<=c<=r<q`, let

\[
 \Delta_{q,c,r}(t)=
 \det T_q(t)[\,0{:}c+1,\ r-c{:}r+1\,].            \tag{337}
\]

These are precisely the top-edge solid minors used by transpose Neville
elimination.  Exact computation gives the remarkably clean rule

\[
 \begin{cases}
 \Delta_{q,c,c}(t)\text{ is a positive constant},\\
 [t^\ell]\Delta_{q,c,r}(t)>0
   \quad(0\leq\ell\leq c+1),&r>c.
 \end{cases}                                      \tag{338}
\]

If (338) holds for every `q`, then every required initial minor is positive
for every `t>=0`.  The Gasca--Pena criterion therefore makes `T_q(t)`
nonsingular TN for every `t>=0`; at `t=1` this proves (323), hence (318) and
the bottom induction lemma.

The evidence for (338) is exact and substantially larger than the earlier
endpoint tests.  The FLINT-polynomial Bareiss audit
`verify_newton_checker_offdiag_homotopy.py` verifies every instance through
`q=50`: 22,099 initial minors, 292,824 strictly positive rational
coefficients, and 22,099 structural zeros.  At the largest order alone it
checks 1,275 minors and 22,100 positive coefficients.  The report is
`newton_checker_offdiag_homotopy_20260803.json`.  This is finite evidence,
not an all-order proof.

There is a useful strengthening.  For arbitrary contiguous row and column
intervals put

\[
 \Gamma_{q,a,b,k}(t)=
 \det T_q(t)[\,a{:}a+k,\ b{:}b+k\,].              \tag{339}
\]

Through `q=25`, every structurally nonzero polynomial in (339) is
coefficientwise positive.  More precisely, it is zero when `b<a`, is a
positive constant when `b=a`, and, when `b>a`, has degree exactly `k` with
all `k+1` coefficients positive.  At `q=25` this gives exactly
`binom(28,4)=20,475` positive coefficients.  Across `2<=q<=25`, the audit
checks 38,024 contiguous minors and 118,754 positive coefficients.  The
replay is `probe_homotopy_contiguous_minors.py`, with report
`newton_checker_offdiag_contiguous_20260803.json`.

The solid minors obey the Desnanot--Jacobi relation

\[
 \begin{split}
 \Gamma_{a,b,k}\Gamma_{a+1,b+1,k-2}
 ={}&\Gamma_{a,b,k-1}\Gamma_{a+1,b+1,k-1}\\
   &-\Gamma_{a,b+1,k-1}\Gamma_{a+1,b,k-1}.        \tag{340}
 \end{split}
\]

Thus (339) places the missing lemma in an octahedron-recurrence family and
points toward either a parameter-shifted condensation proof or a planar
network with `t` marking the off-diagonal central jumps.  The subtraction in
(340) means coefficientwise positivity does not follow formally from
smaller sizes; a genuine dominance identity or a subtraction-free network
is still required.

Two tempting shortcuts are false.  Expanding a determinant by choosing
columns from the constant and linear matrices is not termwise positive: the
first negative mixed-column determinant occurs at `q=9`, `c=4`, `r=8`, for
the choice `{0,3}`, and equals

\[
 -{319973879052617674374268727705038652143598963\over
 17052732930882976464647867562196992000000000000}.
\]

The sum of all mixed terms of the same degree is nevertheless positive.
Likewise, the simple involution that moves the first selected linear column
one place to the right succeeds through `q=12` but fails at `q=13` (already
for selections `{4,5}` and `{0,4,5}`).  Any cancellation proof must therefore
act on the finer Catalan/path expansion, rather than merely pair subsets of
matrix columns.

## 65. A subtraction-free three-branch factorization

The signed middle factor in (336) has an exact Catalan-square decomposition
that converts the coefficientwise conjecture into two rectangular TN
claims.  Let

\[
 (R_q)_{i,j}=(-1)^{j-i}C_{j-i+1}\quad(i\leq j),
 \qquad P_q=I_q-R_q,                              \tag{341}
\]

and put

\[
 D^{(0)}_{i,i}={1\over\binom{d-2}{i}},\qquad
 D^{(1)}_{i,i}={1\over\binom d{i+1}},\qquad
 D^{(m)}=D^{(0)}-D^{(1)}>0.                       \tag{342}
\]

Formula (180) gives, in checker form,

\[
 M_q=D^{(0)}-R_qD^{(1)}R_q,qquad M_{0,q}=D^{(m)}. \tag{343}
\]

The elementary identity

\[
 D^{(1)}-R_qD^{(1)}R_q
 =P_qD^{(1)}R_q+D^{(1)}P_q                       \tag{344}
\]

therefore turns (336) into the subtraction-free sum

\[
 \boxed{
 T_q(t)=U D^{(m)}V
       +t(UP)D^{(1)}(RV)
       +tU D^{(1)}(PV),}                          \tag{345}
\]

where `U=U_q^(J)` and `V=overline V_q`.  In particular, the entrywise
positivity of the linear coefficient no longer requires any cancellation.

Interleave, for each `s=0,...,q-1`, the two columns and two rows

\[
 \begin{aligned}
 \mathcal L_q&=ig((UP)_{:0},U_{:0},
                    (UP)_{:1},U_{:1},\ldots\big),\\
 \mathcal R_q&=ig((RV)_{0:},(PV)_{0:},
                    (RV)_{1:},(PV)_{1:},\ldots\big)^T.          \tag{346}
 \end{aligned}
\]

The decisive new finite observation is

\[
 \boxed{\mathcal L_q\text{ and }\mathcal R_q\text{ are TN}.}   \tag{347}
\]

If (347) holds for every `q`, it proves the entire coefficientwise homotopy
lemma.  Indeed, duplicate each `U_:s` immediately after itself in
`mathcal L_q`.  Duplicating an adjacent column preserves TN.  In
`mathcal R_q`, insert

\[
 V_{s:}=(RV)_{s:}+(PV)_{s:}
\]

between the adjacent rows `(RV)_(s:)` and `(PV)_(s:)`; inserting the sum of
two adjacent rows between them also preserves TN, by multilinearity of every
minor.  The resulting `q` by `3q` and `3q` by `q` matrices have, in each
three-state block, the common order

\[
 (UP,RV),\qquad(U,V),\qquad(U,PV).
\]

Putting the positive diagonal weights

\[
 tD^{(1)}_{s,s},\qquad D^{(m)}_{s,s},\qquad
 tD^{(1)}_{s,s}                                   \tag{348}
\]

on those states makes their product exactly (345).  Cauchy--Binet then
writes every minor of `T_q(t)` as a polynomial in `t` with nonnegative
coefficients.  The strict coefficients required in (338) follow once one
exhibits one nonzero compatible intermediate set for each structurally
allowed degree.

The evidence for (347) is exhaustive rather than a chamber-minor sample.
For every `2<=q<=7`, `verify_homotopy_interleaved_branches.py` checks every
minor of both rectangular matrices.  At `q=7` this is 116,279 exact minors
per factor; 21,317 are positive and 94,962 are the forced staircase zeros.
Across the full range, 138,435 minors per factor pass.  The report is
`homotopy_interleaved_branches_20260803.json`.  The two factors have exactly
the same positive/zero counts because, after transposition and reversal,
they occupy the same doubled-staircase positroid cell.

There is also an all-order orthogonal-polynomial explanation for the left
branch split.  If the normalized `n`th row of `U` is

\[
 U_n(z)=\sum_{k=0}^n u_{n,k}z^k
\]

and

\[
 p_n(x)=\sum_{h=0}^n(-1)^h u_{n,n-h}x^h,
 \qquad U_n(z)=z^np_n(-1/z),                      \tag{349}
\]

then `p_n` is the Jacobi polynomial orthogonal for the moment sequence
`C_(r+3)`.  Let `nu` be the positive measure on `(0,4)` with moments
`int x^r dnu=C_(r+2)` and define its second-kind polynomial

\[
 q_{n-1}(x)=\int_0^4{p_n(x)-p_n(y)\over x-y}\,d\nu(y).
\]

Direct coefficient comparison gives the exact identity

\[
 {(UP)_n(z)\over z}
 =-z^{n-1}q_{n-1}(-1/z),                          \tag{350}
\]

where `(UP)_n(z)` denotes the normalized row polynomial obtained by the
row convolution with `P=I-R`.  Thus the
two interleaved left columns are the reciprocal Jacobi polynomial and its
positive-measure second-kind companion.  This identifies the likely
all-order mechanism behind `mathcal L_q`: a Stieltjes/Hurwitz continued-
fraction network, rather than an accidental Catalan cancellation.

On the right side the same Catalan block has a useful exact boundary
identity.  In the rational connection (327),

\[
 F_p(-2)=4^p{(3/2)_p\over(3)_p}=C_{p+1}.
\]

Evaluating (327) at `x=-2` therefore yields

\[
 (R_qV)_{0,j}	ext{ with checker signs removed}
 =(-1)^j{2^{j+1}\over(j+2)!},                    \tag{351}
\]

or, in the checker form used in (346),

\[
 (R_q\overline V_q)_{0,j}={2^{j+1}\over(j+2)!}>0. \tag{352}
\]

The remaining proof obligation is now sharply localized: construct the
Stieltjes/planar networks certifying the two doubled-staircase matrices in
(347), or derive their chamber minors from (349)--(352).  Once (347) is
proved, no determinant-level cancellation remains in the homotopy.

## 66. Newton-square coordinates and explicit left Wronskians

The left doubled staircase in (346) has a substantially simpler coordinate
description than its raw Neville multipliers suggest.  Normalize the
degree-`n` Jacobi row as in (349), writing

\[
 U_n(z)=\sum_{k=0}^n u_{n,k}z^k.
\]

Complete the truncated second-kind row in (350) to a degree-`n` polynomial
`H_n` by

\[
 H_n(z)=\sum_{k=0}^n h_{n,k}z^k,
 \qquad {(UP)_n(z)\over z}=2\sum_{k=0}^{n-1}h_{n,k}z^k.       \tag{353}
\]

The two families obey the same co-recursive Jacobi recurrence

\[
 F_n=(1+a_nz)F_{n-1}-b_nz^2F_{n-2},                         \tag{354}
\]

where

\[
 a_n={2(4n^2+8n+9)\over(2n+1)(2n+3)},\qquad
 b_n={(n-1)(n+2)(2n-1)(2n+3)\over
       n(n+1)(2n+1)^2},                                    \tag{355}
\]

but with initial rows

\[
 U_0=H_0=1,\qquad
 U_1=1+{14\over5}z,\qquad H_1=1+{3\over10}z.                \tag{356}
\]

Equivalently, these are the characteristic polynomials of two Jacobi
matrices which differ only in the first diagonal entry.  Their Cholesky
pivots are respectively

\[
 \delta_n={(n+3)(2n+5)\over(n+1)(2n+3)},\qquad
 \epsilon_n={n(2n+1)\over(n+1)(2n+3)},                      \tag{357}
\]

so both Jacobi matrices are positive definite in every order.  This gives a
positive continued-fraction interpretation of the two branches, not merely
root-level interlacing.

There is an even sharper coefficient formula.  Put

\[
 d_m=4^m m!\left({7\over2}\right)_m,
 \qquad X_m(n)=n^{\underline m}(n+4)_m.
\]

After reversing both axes of `mathcal L`, dividing the degree-`n` row by its
positive leading coefficient `u_(n,n)`, and applying positive column
scalings, its two columns in block `m` are

\[
 \boxed{
 {d_m u_{n,n-m}\over u_{n,n}}=X_m(n)
 =\prod_{j=2}^{m+1}\big((n+2)^2-j^2\big)}                  \tag{358}
\]

and

\[
 \boxed{
 {d_{m+1}h_{n,n-m-1}\over u_{n,n}}
 ={4(m+1)(2m+7)n^{\underline{m+1}}(n+4)_{m-2}P_m(n)
   \over(2n+3)(2n+5)},}                                    \tag{359}
\]

where

\[
 P_m(n)=n^3+3(m+3)n^2+{48m+119\over4}n
       +{3(15m^2+56m+47)\over4(m+1)}.                      \tag{360}
\]

For `m=0,1`, the negative-index Pochhammer in (359) is read as

\[
 (n+4)_{-2}={1\over(n+2)(n+3)},\qquad
 (n+4)_{-1}={1\over n+3};
\]

the corresponding factors cancel because

\[
 P_0(n)={(n+3)(4n^2+24n+47)\over4},\qquad
 P_1(n)={(n+3)(4n^2+36n+59)\over4}.
\]

Thus every even column is exactly the Newton basis at the square nodes
`(n+2)^2`; the complicated Catalan convolution is confined to the explicit
cubic (360).

Unlike the Wronskian formulas below, (358)--(360) already have a short
all-order proof.  Formula (358) is immediate from the Jacobi entry formula
following (330).  Taking coefficients in (354) and putting `k=n-m-1`
gives

\[
 h_{n,n-m-1}=h_{n-1,n-m-1}
 +a_nh_{n-1,n-m-2}-b_nh_{n-2,n-m-3}.            \tag{360a}
\]

Substitution of (359)--(360), followed by cancellation of consecutive gamma
factors, reduces (360a) identically to zero.  The boundary values
`h_(n,0)=1` and (356) agree, proving (359) by induction.  Thus the finite
audit below is a replay of an algebraic identity for the column formulas;
only the uniform Wronskian reduction remains conjectural.

The first family of chamber Wronskians now has a closed all-order candidate.
Multiply every row by the positive common factor

\[
 \rho(n)=(n+2)(2n+3)(2n+5)
\]

and omit harmless positive column constants.  Denote the resulting ordered
functions from (358)--(359) by

\[
 F_0,F_1,F_2,F_3,\ldots=(X_0,H_0,X_1,H_1,\ldots).
\]

With `x=n+2`, direct symbolic reduction gives, for `r>=1`,

\[
 \operatorname {Wr}(F_0,\ldots,F_{2r-1})
 =A_r E_r(x^2),                                             \tag{361}
\]

\[
 \operatorname {Wr}(F_0,\ldots,F_{2r})
 =B_r x O_r(x^2),                                           \tag{362}
\]

for positive constants `A_r,B_r`, where

\[
 E_r(y)=-{}_2F_1\left(-r,-r-{1\over2};-{1\over2};4y\right),\tag{363}
\]

\[
 O_r(y)={}_2F_1\left(-r-1,-r-{3\over2};-{3\over2};4y\right).
                                                                    \tag{364}
\]

The exceptional first Wronskian is

\[
 F_0=x(4x^2-1)>0.                                           \tag{365}
\]

The signs in (363)--(364) make positivity elementary on the required domain
`x>=2`.  In (363), the constant coefficient is `-1` and every other
coefficient is positive; already

\[
 [y]E_r(y)=4r(2r+1)\ge12.
\]

In (364), only the linear coefficient is negative.  If it is `-c_r`, the
quadratic coefficient is

\[
 2r(2r+1)c_r,
\]

so the quadratic and linear terms have positive sum for `r>=1` and `y>=4`;
all higher terms are positive.  Consequently every Wronskian in
(361)--(365) is strictly positive for `n>=0`.

Equations (358)--(364) have two independent exact checks.  The program
`verify_left_newton_wronskian.py` replays 1,681 coefficient identities
through `n=40` and the first fourteen symbolic Wronskians (through `r=7`),
including their positive proportionality constants; its report is
`left_newton_wronskian_20260803.json`.  The earlier all-minor audit of
`mathcal L` remains independent evidence.

This does **not yet** complete the left TN proof.  The prefix Wronskians
(361)--(365) certify the first pruned-Neville chamber family.  Because the
staircase has a repeated pivot at every level, a rigorous TN certificate
must also cover the shifted chamber families created after each structural
zero row is deleted.  Exact Wronskians of those consecutive shifted blocks
factor into the expected staircase zeros times polynomials positive on the
admissible interval, but a uniform formula in both the shift and block size
is still missing.  The left obligation in (347) has therefore been reduced
from arbitrary Catalan minors to this explicit two-parameter Wronskian
identity.  The right obligation remains the mixed rational-interpolation
determinant described after (352).

## 67. Exact Catalan--Racah connection inside the left staircase

The odd column in (359) has an unexpectedly sparse description in the
Newton-square basis (358).  Retain the complete positive normalization in
(359), and write

\[
 G_m(n):={d_{m+1}h_{n,n-m-1}\over u_{n,n}}.
\]

For integral `n>=0`, the all-order identity is

\[
 \boxed{
 G_m(n)=\sum_{r\ge0}c_{r,m}X_{m+1+r}(n),\qquad
 c_{r,m}=(-1)^r{(5/2)_r\over
 (4)_r(m+2)_r(m+9/2)_r}.}                         \tag{366}
\]

The sum is automatically finite because `X_k(n)=0` for integral `k>n`.
The same coefficient can be written in the explicitly Catalan form

\[
 c_{r,m}=(-1)^r{C_{r+2}\over
 2^{r+1}(m+2)_r\prod_{j=0}^{r-1}(2m+9+2j)}.       \tag{367}
\]

Thus the entire difference between the two interleaved branches is a
single checker hypergeometric connection kernel; no unstructured Catalan
convolution remains.

At the terminal interpolation node `n=m+1+R`, division by the first Newton
pivot turns (366) into the balanced terminating sum

\[
 {G_m(m+1+R)\over X_{m+1}(m+1+R)}
 ={}_4F_3\!\left(\begin{matrix}
 -R,\;5/2,\;2m+R+6,\;1\\
 4,\;m+2,\;m+9/2
 \end{matrix};1\right).                           \tag{368}
\]

This is a Racah-polynomial value: in the DLMF convention it is

\[
 R_R\!\left(-{5\over2};
 3,\;2m+2,\;m+1,\;{3\over2}-m\right).             \tag{369}
\]

The rational expression supplied by (359) and (360) is

\[
 {(2m+7)\Phi_m(R)\over
 (R+2m+3)(R+2m+4)(R+2m+5)
 (2R+2m+5)(2R+2m+7)},                              \tag{370}
\]

where

\[
\begin{aligned}
 \Phi_m(R)={}&4(m+1)R^3
 +24(m+1)(m+2)R^2\\
 &+(36m^3+204m^2+371m+203)R\\
 &+16m^4+136m^3+428m^2+590m+300.
\end{aligned}                                      \tag{371}
\]

The evaluation is now proved in all orders.  Indeed, use the standard Racah
recurrence (1.2.3) of Koekoek--Swarttouw
([arXiv:math/9602214](https://arxiv.org/abs/math/9602214)) with

\[
 \alpha=3,\quad\beta=2m+2,\quad\gamma=m+1,\quad
 \delta={3\over2}-m,\quad x=-1.
\]

Since `lambda(x)=x(x+gamma+delta+1)=-5/2`, the value `S_R` in (368)
satisfies

\[
 -{5\over2}S_R=A_RS_{R+1}-(A_R+C_R)S_R+C_RS_{R-1},          \tag{372}
\]

where

\[
 A_R={(R+4)(R+m+2)(R+2m+6)(2R+2m+9)\over
 4(R+m+3)(2R+2m+7)},
\]

\[
 C_R={R(R+m+4)(R+2m+2)(2R+2m+3)\over
 4(R+m+3)(2R+2m+5)}.                                      \tag{373}
\]

Both denominators are positive and `A_R>0` for `m,R>=0`.  Direct rational
substitution of (370)--(371) into (372) gives zero identically.  The initial
values are

\[
 S_0=1,
 \qquad
 S_1={8m^2+42m+37\over4(m+2)(2m+9)},                       \tag{374}
\]

which agree with the first two terminating sums in (368).  Recurrence
induction proves (368)--(371), and hence (366), for every `m,R>=0`.

This closes the Newton connection formula, but it does not by itself remove
the alternating signs in (366); the shifted chamber determinants still have
to be summed or represented by a positive network.

The exact program `verify_left_newton_connection.py` symbolically checks the
zero recurrence residual and the two initial values, then independently
audits (366)--(371) through `q=35`.  Its report
`left_newton_connection_20260803.json` records 595 Newton coefficients, 595
reconstructions, 595 hypergeometric values, and 595 Catalan rewritings, all
in exact rational arithmetic.

There is a useful literature guardrail here.  Karp's Theorem 1.1 in
*Wronskians, total positivity, and real Schubert calculus*
([arXiv:2110.02301](https://arxiv.org/abs/2110.02301)) says that nonvanishing
of every prefix Wronskian characterizes a totally nonnegative **complete**
flag.  The paper explicitly notes that the reverse implication fails for an
arbitrary partial flag.  Our `q` by `2q-1` doubled staircase is rectangular,
and total nonnegativity requires minors from non-prefix column sets.
Therefore (361)--(365) cannot be promoted to (347) by quoting that theorem
alone; the shifted chambers or an explicit positive completion/network are
genuine remaining obligations.

## 68. A totally-positive Racah kernel and a positive moment density

The quotient in (368) isolates a second two-index kernel:

\[
 T(R,m):={G_m(m+1+R)\over X_{m+1}(m+1+R)}
 ={(2m+7)\Phi_m(R)\over
 (R+2m+3)(R+2m+4)(R+2m+5)
 (2R+2m+5)(2R+2m+7)}.                         \tag{375}
\]

Exact computation reveals that this is not merely entrywise positive.  Every
minor of the square truncation `[T(R,m)]_{R,m=0}^{q-1}` is strictly positive
through `q=8`; there are 12,869 such minors at `q=8`.  More importantly, all
minors of order two are now proved positive without a size bound.  Put the
rows at `r,r+b` and the columns at `m,m+a`, with `a,b>0`.  Direct cancellation
gives

\[
 \det T[\{r,r+b\},\{m,m+a\}]
 ={2ab(2m+7)(2m+2a+7)\,P(m,r,a,b)\over
 D(m,r,a,b)},                                      \tag{376}
\]

where `P` has 3,893 monomials, all with strictly positive integer
coefficients (the smallest is 256), and the expanded denominator `D` has
9,056 monomials, again all strictly positive.  Thus (376) proves strict
`TP_2` for all real `m,r>=0`, not only for lattice indices.  The exact
certificate is `verify_racah_kernel_tp.py`, with report
`racah_kernel_tp_20260803.json`.

The contiguous order-three chamber also has an all-parameter certificate:

\[
 \det[T(r+i,m+j)]_{i,j=0}^{2}>0\qquad(m,r\ge0).       \tag{377}
\]

After cancellation its numerator has degree 21 and 225 strictly positive
coefficients (the smallest is 37,748,736), while its denominator has 406
strictly positive coefficients.  This is checked by
`analyze_racah_kernel_order3.py`.  Arbitrary order-three gaps were not
expanded: that route is unnecessary if the contiguous chambers can be
handled in all orders.

Indeed, Fekete's classical criterion says that positivity of every solid
(consecutive-row, consecutive-column) minor implies strict total positivity.
The sharper initial-minor criterion of Gasca--Pena needs only solid minors
touching the first row or first column.  For (375) those are the two
one-parameter Casoratians

\[
 \Delta_k^{\rm top}(m)=\det[T(i,m+j)]_{i,j=0}^{k-1},
 \qquad
 \Delta_k^{\rm left}(r)=\det[T(r+i,j)]_{i,j=0}^{k-1}. \tag{378}
\]

Through `k=7`, every numerator in (378) is a polynomial with strictly
positive coefficients and every denominator is a product of positive linear
factors.  The exact factor discovery file is
`analyze_racah_kernel_boundary_minors.py`, with report
`racah_kernel_boundary_minors_20260803.json`.  An all-`k` recurrence or
network for the two numerator families would therefore prove that (375) is
strictly totally positive.

There is also an analytic route.  Define

\[
\begin{aligned}
 A_m&=-2m(m+2)(2m-1)(2m+5),\\
 B_m&={1\over2}(m-1)(2m+3)^2(2m+5),\\
 C_m&={1\over2}(m+3)(2m-1)(2m+1)^2,
\end{aligned}                                      \tag{379}
\]

and

\[
 Q_m(u)=12(1+u^2)+u^{2m+1}(B_m+A_mu^2+C_mu^4).      \tag{380}
\]

Partial fractions in `R` give the exact Hausdorff-moment representation

\[
 \boxed{
 T(R,m)={2(2m+7)\over(2m+1)(2m+3)}
 \int_0^1u^{,2R+2m+4}Q_m(u)\,du.}                 \tag{381}
\]

The density in (381) is strictly positive on `0<u<1`.  For `m>=1`, put
`D_m=24+B_m`.  The identities

\[
 24+A_m+B_m+C_m=0,
 \qquad
 D_m-C_m=(2m-1)(2m^2+7m-3)>0                       \tag{382}
\]

give the subtraction-free factorization

\[
\begin{aligned}
 Q_m(u)=(1-u)\bigg[&12(1+u)+24\sum_{i=2}^{2m}u^i\\
 &+(D_m-C_m)u^{2m+1}(1+u)\\
 &+C_mu^{2m+1}(1+u)(1-u^2)\bigg]>0.                \tag{383}
\end{aligned}
\]

The exceptional case is elementary:

\[
 Q_0(u)={3\over2}(1-u)(u^4+u^3+u^2-7u+8)>0,        \tag{384}
\]

because `8-7u>=1` on the unit interval.  Hence every column of (375) is a
strict Hausdorff moment sequence.  The program
`verify_racah_kernel_moment.py` checks (381)--(384) symbolically and audits
all 3,431 minors of the associated density collocation kernel through size
seven, exactly; its report is `racah_kernel_moment_20260803.json`.

Equations (381)--(384) do not yet prove total positivity in the second index.
They expose the remaining clean alternative: prove that

\[
 K(u,m)=u^{2m+4}Q_m(u)                              \tag{385}
\]

is a strictly totally positive kernel, and then compose it with the standard
kernel `u^{2R}` by Cauchy--Binet/Andreief.  Thus the left-factor obstruction
has now been reduced to either the two boundary Casoratian families (378) or
the explicit five-monomial density kernel (385).  Neither all-order step has
yet been completed, and the right rational-interpolation factor remains a
separate obligation.

## 69. Falling-factorial and Laguerre factorization of the shifted odd chambers

The Racah quotient can be inserted back into the actual odd-column square,
not merely studied in isolation.  Let `Z` be the lower-triangular matrix whose
zeroth column is `X_0=1` and whose column `c>=1` is `G_{c-1}`.  For a solid
block beginning in column `c>=1`, put the first row at `c+s` and write
`R=s+i`.  Factoring the positive Newton term `X_c(c+R)` from row `i` leaves

\[
 E_j(R;c)=R^{\underline j}(R+2c+4)_j
 T(R-j,c+j-1),\qquad 0\le j<k.                     \tag{386}
\]

All entries have the common positive row denominator

\[
 d_c(R)=(R+2c+1)(R+2c+2)(R+2c+3)
 (2R+2c+3)(2R+2c+5).                              \tag{387}
\]

Cancellation in (386) is exact and gives the polynomial

\[
 \boxed{
 F_j(R;c):=d_c(R)E_j(R;c)
 =R^{\underline j}(R+2c+1)_j(2c+2j+5)
 \Phi_{c+j-1}(R-j).}                              \tag{388}
\]

This formula makes the previously missing shifted chamber parameters
explicit.  The program `analyze_left_odd_solid_minors.py` evaluates

\[
 \det[E_j(s+i;c)]_{i,j=0}^{k-1}                    \tag{389}
\]

symbolically in both `a=c-1>=0` and `s>=0`.  Every numerator coefficient and
every denominator coefficient is strictly positive through `k=8`.  Thus
(389) is proved for **all** starting columns and all admissible row shifts in
each of the first eight minor orders.  The boundary family `c=0`, containing
the exceptional column `X_0`, is likewise proved through order eight.

The interior numerators have an especially rigid support.  For every checked
`k>=2`, their total degree and `s`-degree are

\[
 d_k={ (k+2)(k+3)\over2},
 \qquad e_k={k(k+1)\over2}+3,                       \tag{390}
\]

and every monomial `a^i s^j` with `0<=j<=e_k` and `i+j<=d_k` occurs with a
strictly positive coefficient.  Hence the number of numerator terms is

\[
 { (k^2+k+8)(k^2+9k+10)\over8}.                    \tag{391}
\]

The interior denominator also has the uniform checked form

\[
\begin{aligned}
 D_k(a,s)={}&(2a+s+3)(2a+s+4)^2
 \prod_{h=2}^{k-1}(2a+s+3+h)^3\\
 &\mathrel{}\times(2a+s+k+3)^2(2a+s+k+4)\\
 &\mathrel{}\times\prod_{r=0}^{2}(2a+2s+2k+1+2r),
 \qquad k\ge2.                                    \tag{392}
\end{aligned}
\]

The positivity in (389) is explained by a finite Newton transform.  Expand
(388) in the falling-factorial basis:

\[
 F_j(R;c)=\sum_{\ell=j}^{2j+3}A_{\ell j}(c)
 R^{\underline\ell}.                              \tag{393}
\]

Every nonzero `A_{ell j}(c)` is a polynomial with strictly positive
coefficients in `c-1`.  More importantly, the rectangular coefficient matrix
`A(c)` is itself coefficientwise totally nonnegative through five columns:
the exact `12` by `5` audit has 3,248 positive minors, 2,939 structural
zeros, and no negative or mixed-sign minor.  This is recorded by
`verify_left_odd_factorial_factorization.py` in
`left_odd_factorial_factorization_20260803.json`.

For integral `s>=0`, the matrix

\[
 P_s(i,\ell)=(s+i)^{\underline\ell}
 =\ell!\binom{s+i}{\ell}                           \tag{394}
\]

is a Pascal path matrix and is totally nonnegative.  Equations (387), (393),
and (394) therefore give an actual positive factorization of every shifted
odd block at each width for which `A(c)` is known to be TN.  A uniform planar
network for `A(c)` would prove the entire odd-column square `Z` TN at once.

The column-generating polynomials of `A(c)` have a classical all-order form.
Set

\[
 \Lambda_n^{(\alpha)}(z):=n!L_n^{(\alpha)}(-z),
 \qquad \alpha=2c+j,                               \tag{395}
\]

and define

\[
 \kappa_j={3(2c+2j-3)(2c+2j+3)\over4},             \tag{396}
\]

\[
 \mu_j={(c+j-2)(2c+2j-3)(2c+2j+1)(2c+2j+3)
 \over4(c+j)}.                                     \tag{397}
\]

Then

\[
 \boxed{
 \sum_{\ell}A_{\ell j}(c)z^\ell
 =4(c+j)(2c+2j+5)z^j p_j(z),}                      \tag{398}
\]

where

\[
 p_j(z)=\Lambda_{j+3}^{(2c+j)}(z)
 -\kappa_j\Lambda_{j+1}^{(2c+j)}(z)
 +\mu_j\Lambda_j^{(2c+j)}(z).                     \tag{399}
\]

This is not a guessed finite pattern.  It follows from the Poisson/Newton
identity

\[
 e^{-z}\sum_{R\ge0}F_j(R;c){z^R\over R!}
 =\sum_{\ell}A_{\ell j}(c)z^\ell                  \tag{400}
\]

and the single symbolic cubic identity, with `t=c+j` and `x=p+2t+1`,

\[
 {\Phi_{t-1}(p)\over4t}
 =x(x+1)(x+2)-{3(2t-3)(2t+3)\over4}x
 +{(t-2)(2t-3)(2t+1)(2t+3)\over4t}.               \tag{401}
\]

The verifier `verify_left_odd_laguerre_transform.py` proves (401)
symbolically and independently reconstructs (398)--(399) through `j=10`.
Its report is `left_odd_laguerre_transform_20260803.json`.

For `t>=2`, the normalized cubic in (401) has positive coefficients and
discriminant

\[
 {1296t^6-6984t^4+13105t^2-8748\over16t^2}>0.       \tag{402}
\]

Indeed, after `y=t^2` the numerator is increasing and equals 14,872 at
`y=4`.  Thus it has three negative real roots.  Consequently `p_j` is an
unsigned type-II multiple-Laguerre polynomial with multi-index
`(j,1,1,1)` and weight parameters greater than `-1`; the lone `t=1`
boundary seed is handled directly.  This explains both the positive
coefficients and the observed strict negative-root interlacing.

The remaining all-order left task is now sharply localized: construct a
planar network or positive production rule for the coefficient matrix
`A(c)` in (393).  That would close the odd square.  One must then lift the
interleaved even columns `X_j`; the generic insertion lemma is false, so the
specific Laguerre/Darboux structure must be retained.  The right factor in
(347) remains independent and open.

## 70. Full interleaved falling-factorial coefficient matrix

The even insertions can be retained instead of handled after the odd square.
Let

\[
 \rho(n)=(n+2)(2n+3)(2n+5),
\]

and form the interleaved polynomial sequence

\[
 E_m(n)=\rho(n)X_m(n),\qquad
 O_m(n)={\rho(n)h_m(n)\over4(m+1)(2m+7)}.
                                                               \tag{403}
\]

(The omitted odd-column scale is strictly positive.)  Define the infinite
coefficient matrix `M` by

\[
 E_m(n)=\sum_{\ell\ge0}M_{\ell,2m}n^{\underline\ell},\qquad
 O_m(n)=\sum_{\ell\ge0}M_{\ell,2m+1}n^{\underline\ell}.          \tag{404}
\]

Then the full left collocation matrix factors as the Pascal path matrix
`[n^{\underline\ell}]` times `M`.  Thus total nonnegativity of `M`, with no
subsequent insertion lemma, proves total nonnegativity of the complete
interleaved left factor.

The program `verify_full_left_factorial_factorization.py` reconstructs every
column in (404) independently and audits all minors of the first ten columns
and their twelve supporting rows.  It finds 194,806 positive minors, 451,839
structural zeros, and no negative minor.  The per-order counts are

\[
\begin{array}{c|rrrrrrrrrr}
 k&1&2&3&4&5&6&7&8&9&10\\ \hline
 +&55&1023&8316&32105&60955&57731&27580&6391&631&19\\
 0&65&1947&18084&71845&138629&136309&67460&15884&1569&47.
\end{array}                                                       \tag{405}
\]

There is also a subtraction-free pair reduction hidden in these columns.
Put `D_m=E_m-4O_m`.  Direct cancellation gives the all-order identity

\[
\boxed{
 D_m(n)={2(2m+5)\over m+1}
 n^{\underline m}(n+2)(n+4)_{m-2}\,q_m(n),}                       \tag{406}
\]

where the gamma-ratio convention handles `m=0,1`, and

\[
 q_m(n)=4m(m+1)n^2+(16m^2+22m+3)n+15m^2+27m+9.                   \tag{407}
\]

For `m>=2`, after shifting `n=m+p`, every factor on the right of (406)
has positive coefficients in `p`; its Poisson transform therefore has
positive coefficients.  The two boundary cases are direct.  Moreover

\[
 (E_m,O_m)=(D_m,O_m)
 \begin{pmatrix}1&0\\4&1\end{pmatrix}.                            \tag{408}
\]

Hence the original paired matrix is a product of the reduced matrix and a
fixed totally nonnegative block-bidiagonal matrix.  A second cancellation,

\[
 R_m=8(m+1)(2m+7)O_m-D_{m+1},                                    \tag{409}
\]

again has positive falling-factorial coefficients and expresses `O_m` as a
positive combination of `R_m` and the neighboring `D_{m+1}`.  This reduces
the residual degrees of both interleaved families to `m+1` and explains why
a block-bidiagonal factorization should exist.

## 71. Explicit complete-Neville pattern for the full left matrix

Exact complete Neville elimination of the matrix `M` in (404) reveals a
closed, entirely positive pattern.  Let `p_j` be the diagonal pivots.  The
proposed all-order formulas are

\[
 p_{2m}={(m+2)(2m+1)(2m+3)(2m+5)(4m+3)\over3},                  \tag{410}
\]

\[
 p_{2m+1}={3(2m+5)(4m+5)\over2(m+1)(m+2)}.                      \tag{411}
\]

For elimination below an even column `2m`, the only nonzero multipliers,
at gaps one, two, and three, are

\[
 a_m={4(m+1)(m+3)\over(m+2)(2m+1)(4m+3)},\quad
 b_m={3\over(m+1)(2m+5)},\quad
 c_m={1\over(m+3)(2m+3)}                                      \tag{412}
\]

for `m>=1`.  The boundary values are `a_0=5/2`, `b_0=12/25`, while
the displayed formula for `c_0` remains valid.  Below an odd column `2m+1`
there is only one nonzero multiplier,

\[
 d_m={(2m-1)(2m+3)\over(m+1)(2m+5)(4m+5)},\qquad m\ge1,          \tag{413}
\]

and `d_0=0`.

The transpose elimination has an equally rigid two-color form.  Its
nonzero multipliers in even row `2r` occur at columns `r+k`,
`0<=k<=r-1`, and equal

\[
 u_{r,k}={2r(2r+5)(k+1)(k+2)(2k+3)^2\over9}.                    \tag{414}
\]

Those in odd row `2r+1` occur at columns `r+1+q`, `0<=q<=r-1`, and
equal

\[
 v_q={9\over(q+1)(q+3)(2q+3)(2q+5)}.                            \tag{415}
\]

Every quantity (410)--(415) is strictly positive except the intentional
boundary zero `d_0`.  Therefore a direct all-index verification of these
Neville parameters would immediately give a Loewner--Whitney product of
nonnegative elementary bidiagonal matrices and a positive diagonal matrix;
that would prove `M` totally nonnegative and finish the entire left factor.

The verifier `verify_full_left_neville_pattern.py` computes (404) from the
original polynomials, performs rational Neville elimination independently
on `M` and `M^T`, and compares every observed parameter with
(410)--(415).  The exact audit passes through size 32: 32 pivots, 60 nonzero
left multipliers, and 240 nonzero right multipliers, with no mismatch and no
nonpositive value.  Its report is `full_left_neville_pattern_20260803.json`.
This is finite verification, not yet the all-index algebraic proof.  But the
remaining left-side obligation is now a single explicit identity for the
complete Neville factorization, rather than an unspecified network search.

## 72. The twice-reduced core has elementary Neville weights

The pair cancellations (406) and (409) simplify the factorization much more
than the direct pattern (410)--(415) suggests.  Let `N` be the coefficient
matrix of the interleaved core

\[
 D_0,R_0,D_1,R_1,D_2,R_2,\ldots .                                \tag{416}
\]

If `B_1` is block diagonal with repeated block
`[[1,0],[4,1]]`, and `B_2` is lower bidiagonal with

\[
 (B_2)_{2m,2m}=1,qquad
 (B_2)_{2m+1,2m+1}=(B_2)_{2m+2,2m+1}
 ={1\over8(m+1)(2m+7)},                                         \tag{417}
\]

and all other diagonal entries one, then the exact column identities give

\[
 M=NB_2B_1.                                                       \tag{418}
\]

Both right factors are totally nonnegative.  Hence it suffices to prove the
core `N` totally nonnegative.

The core is upper Hessenberg: every column has only one entry below its
diagonal position.  Its proposed Neville pivots are

\[
 \pi_{2m}=2(2m+1)(2m+5)(4m+3),                                  \tag{419}
\]

\[
 \pi_{2m+1}={2(m+1)(2m+3)(2m+5)(2m+7)(4m+5)\over m+2}.          \tag{420}
\]

The only nonzero left-elimination multiplier in column `j` lies at row
`j+1`.  For `m>=1` and `m>=0`, respectively, it is

\[
 \lambda_{2m}={4m\over(2m+1)(4m+3)},qquad
 \lambda_{2m+1}={2m+1\over(m+1)(4m+5)},                          \tag{421}
\]

with the intentional boundary value `lambda_0=0`.

The transpose elimination is even simpler.  Its nonzero multipliers are

\[
 \eta_{2r,j}=1,qquad r\le j\le2r-1,                             \tag{422}
\]

and

\[
 \eta_{2r+1,j}=2(r+1)(2r+7),qquad r+1\le j\le2r.                \tag{423}
\]

There are no others.  Thus the conjectured complete factorization of `N`
uses only positive diagonal weights, a positive lower bidiagonal matrix,
and a two-color triangular network whose edge weights are `1` and
`2(r+1)(2r+7)`.

The independent verifier `verify_full_left_core_neville.py` constructs
(416) from the original formulas and checks (419)--(423) through size 40.
All 40 pivots, all 38 nonzero left multipliers, and all 380 nonzero transpose
multipliers agree exactly; every nonzero parameter is positive.  The report
is `full_left_core_neville_20260803.json`.

This is the cleanest left-side reduction obtained so far.  The all-order
proof now requires only an algebraic derivation of (419)--(423).  Once that
derivation is written, complete Neville elimination gives a positive
bidiagonal factorization of every finite leading truncation of `N`; (418)
and the Pascal collocation factor then prove the entire left factor TN.

## 73. All-order positive layer proof of the full left factor

The pattern in (419)--(423) admits a direct proof.  It is useful to retain
the intermediate layer number.  For `0<=s<=m`, put `d=m-s` and define

\[
 \mathcal D_{m,s}(n)=n^{\underline{2m-s}}(n+2)(n+4)_{s-2}
 Q^D_{m,s}(n),                                                   \tag{424}
\]

\[
 \mathcal R_{m,s}(n)=n^{\underline{2m+1-s}}(n+2)(n+4)_{s-2}
 Q^R_{m,s}(n),                                                   \tag{425}
\]

where negative rising-factorial orders have their gamma-ratio meaning, and

\[
\begin{aligned}
 Q^D_{m,s}(n)={2(2m+5)\over m+1}\big[&4m(m+1)n^2\\
 &+(22m^2+25m+3-3s(2m+1))n\\
 &+15m^2+27m+9+3(4m+5)d+3d(d-1)\big],             \tag{426}
\end{aligned}
\]

\[
\begin{aligned}
 Q^R_{m,s}(n)={2(2m+5)(2m+7)\over m+2}\big[&
 (2m+1)(2m+3)n^2\\
 &+(16m^2+41m+21+6(m+1)d)n\\
 &+3(m+2)(5m+6)+12(m+2)d+3d(d-1)\big].            \tag{427}
\end{aligned}
\]

At `s=0`, the factor
`(n+2)(n+4)_{-2}=1/(n+3)` cancels from the quadratics and gives exactly the
two-term seed columns

\[
 \mathcal D_{m,0}=\pi_{2m}n^{\underline{2m}}
 [1+\lambda_{2m}(n-2m)],                           \tag{428}
\]

\[
 \mathcal R_{m,0}=\pi_{2m+1}n^{\underline{2m+1}}
 [1+\lambda_{2m+1}(n-2m-1)],                       \tag{429}
\]

with (419)--(421); the `m=0` even seed is simply `30`.  In the
falling-factorial coefficient matrix, (428)--(429) are the columns of a
positive diagonal matrix followed by the positive lower-bidiagonal seed
factor.

The layer evolution consists of only two positive additions.  For
`1<=s<=m`, direct substitution in (426)--(427) gives

\[
 \boxed{\mathcal D_{m,s}=\mathcal D_{m,s-1}
                    +\mathcal R_{m-1,s-1},}                      \tag{430}
\]

\[
 \boxed{\mathcal R_{m,s}=\mathcal R_{m,s-1}
       +2(m+1)(2m+7)\mathcal D_{m,s-1}.}                         \tag{431}
\]

After the common falling/rising factors are cancelled, these are just the
two cubic polynomial identities

\[
 (n+s+1)Q^D_{m,s}=(n-2m+s)Q^D_{m,s-1}+Q^R_{m-1,s-1},             \tag{432}
\]

\[
 (n+s+1)Q^R_{m,s}=(n-2m+s-1)Q^R_{m,s-1}
 +2(m+1)(2m+7)Q^D_{m,s-1}.                                      \tag{433}
\]

Thus every layer is an upper-bidiagonal column operation with weights `1`
and `2(m+1)(2m+7)`.  In transpose form, for layer `s` this is the lower
bidiagonal matrix

\[
 F_s=I+\sum_{r\ge s}\left(e_{2r,2r-1}
 +2(r+1)(2r+7)e_{2r+1,2r}\right),                                \tag{434}
\]

which is totally nonnegative.  The finite-width product
`B=...F_3F_2F_1` is precisely the two-color network predicted by
(422)--(423).

Finally, setting `s=m` in (426)--(427) gives respectively the exact
quadratics in (406) and (409).  Therefore

\[
 N=L\,\operatorname{diag}(\pi_0,\pi_1,\ldots)B^T,                \tag{435}
\]

where `L` is lower bidiagonal with the nonnegative subdiagonal entries
(421).  Every finite truncation of all three factors in (435) is TN, so the
core `N` is TN.  Equations (417)--(418) then prove the full interleaved
coefficient matrix `M` TN.  Composing with the Pascal path matrix in (394),
and restoring only positive row and column scales, proves:

\[
 \boxed{\text{The complete interleaved left factor }\mathcal L
 \text{ in the three-branch homotopy is totally nonnegative in all orders.}}
                                                                    \tag{436}
\]

The program `prove_full_left_core_network.py` is an exact symbolic
certificate for this derivation.  It checks (432)--(433), both seeds, both
endpoints, and both original pair reductions as identities in the
independent variables `m,s,n`; all nine residuals are identically zero.  Its
report is `full_left_core_network_proof_20260803.json`.  Unlike the earlier
finite minor audits, (424)--(436) are an all-order proof.  The remaining
three-branch obstruction is now entirely on the right factor `mathcal R`.

## 74. All-order Catalan network proof of the full right factor

The right obstruction in (346) also has a positive network, but its natural
boundary is hidden by a two-step Catalan cancellation.  Write

\[
 A_p=(R\overline V)_{p:},\qquad B_p=(P\overline V)_{p:},
 \qquad P=I-R,                                                   \tag{437}
\]

and let `C=C(-z)` be the alternating Catalan series, so that

\[
 C=1-zC^2.                                                       \tag{438}
\]

Define coefficient rows `h_s=(h_(s,d))_(d>=0)` by the generating functions

\[
 h_{2a+1}(z)=z^{2a+1}C^{2a+4},                                  \tag{439}
\]

\[
 h_{2a}(z)=z^{2a}C^{2a+2}{(a+1)C+1\over a+1}.                   \tag{440}
\]

In particular,

\[
 h_0=C^2(1+C)=\sum_{d\ge0}(-1)^d C_{d+2}z^d,
 \qquad h_1=2C^2-h_0=zC^4.                                     \tag{441}
\]

Put

\[
 c_{2a+1}={a+1\over a+2},\qquad
 c_{2a}={a+2\over a+1}\quad(a\ge1).                            \tag{442}
\]

Equation (438) gives, identically for every `s>=1`,

\[
 \boxed{h_{s+1}=c_szh_{s-1}-h_s.}                               \tag{443}
\]

For `p,s>=0`, define

\[
 Y_{p,s,j}=\sum_{d\ge0}h_{s,d}\overline V_{p+d,j}.              \tag{444}
\]

The sums are finite in every finite truncation.  From (441) and the Catalan
Toeplitz definition of `R`,

\[
 Y_{p,0}=B_{p-1},\qquad
 Y_{p,1}=2A_p-B_{p-1},                                          \tag{445}
\]

where `B_(-1):=Y_(0,0)` is a harmless formal boundary row.  Shifting the
coefficient index in (443) gives the positive reconstruction rule

\[
 \boxed{
 Y_{p+1,s-1}={Y_{p,s}+Y_{p,s+1}\over c_s}.}                     \tag{446}
\]

It remains to prove that the boundary matrix

\[
 K_{s,j}=Y_{0,s,j}=\sum_dh_{s,d}\overline V_{d,j}               \tag{447}
\]

is TN.  This admits a closed rational-Newton calculation.  Recall from
(326) and (328) the rational functions

\[
 F_d(x)=4^d{(x+7/2)_d\over(x+5)_d},\qquad
 \psi_j(x)={x^j\over(x+5)_j}.
\]

Set `tilde F_d=(-1)^dF_d` and `tilde psi_j=(-1)^j psi_j`.  Since
`overline V=EVE`,

\[
 \widetilde\psi_j=\sum_d\overline V_{d,j}\widetilde F_d.        \tag{448}
\]

The triangular change of basis

\[
 \widetilde F_d=\sum_sG_s h_{s,d}                               \tag{449}
\]

has the following explicit entries:

\[
 G_0={1\over2},                                                  \tag{450}
\]

\[
 G_{2a}=2^{2a-2}(a+1)
 { (x+1)_{a+1}(x+7/2)_{a-1}\over(x+5)_{2a}}quad(a\ge1),        \tag{451}
\]

\[
 G_{2a+1}=-2^{2a-1}(a+3)
 { (x+1)_{a+1}(x+7/2)_a\over(x+5)_{2a+1}}quad(a\ge0).          \tag{452}
\]

For a short verification of (449), make the Catalan substitution
`z=-y(1-y)`, `C=1/(1-y)`.  Then

\[
 h_{2a}={y^{2a}(a+2-y)\over(a+1)(1-y)^3},\qquad
 h_{2a+1}=-{y^{2a+1}\over(1-y)^3}.                              \tag{453}
\]

Gauss's quadratic transformation gives

\[
 \sum_{d\ge0}\widetilde F_dz^d
 ={}_2F_1(1,x+7/2;x+5;4y(1-y))
 ={}_2F_1(2,2x+7;x+5;y).                                       \tag{454}
\]

Writing the last series as `sum A_d y^d`, multiplication by `(1-y)^3`
shows that its coefficient is the third difference
`A_d-3A_(d-1)+3A_(d-2)-A_(d-3)`.  Separating even and odd `d`, and using the
duplication formula for rising factorials, gives exactly (451)--(453).
This proves (449), and (447)--(449) therefore give the connection identity

\[
 \boxed{\widetilde\psi_j=\sum_{s=0}^jG_sK_{s,j}.}               \tag{455}
\]

The consecutive ratios in this rational Newton basis are

\[
 {G_1\over G_0}=-3{x+1\over x+5},                              \tag{456}
\]

\[
 {G_{2a+1}\over G_{2a}}
 =-{2(a+3)\over a+1}{x+a+5/2\over x+2a+5}\quad(a\ge1),         \tag{457}
\]

\[
 {G_{2a+2}\over G_{2a+1}}
 =-{2(a+2)\over a+3}{x+a+2\over x+2a+6}\quad(a\ge0).          \tag{458}
\]

Thus, apart from nonzero scalar factors,

\[
 G_s=G_0\prod_{i=1}^s{x-\alpha_i\over x+i+4},                  \tag{459}
\]

where

\[
 \alpha_1=-1,\qquad
 \alpha_{2a}=-(a+1),\qquad
 \alpha_{2a+1}=-(a+5/2)\quad(a\ge1).                           \tag{460}
\]

We record the elementary rational-Newton minor lemma used here.  If
`phi_j=(-1)^j x^j/(x+5)_j` is expanded in a basis of the form (459), and
`Delta_(c,r)` is the initial solid connection minor with source indices
`0,...,c` and target indices `r-c,...,r`, then its Neville multiplier is

\[
 \mu_{c,r}={\Delta_{c,r}\Delta_{c-1,r-2}\over
                  \Delta_{c-1,r-1}\Delta_{c,r-1}}
 =-{\alpha_{c+1}\over\alpha_{c+1}+r+4}
   \prod_{i=1}^c{\alpha_i+r+3\over\alpha_i+r+4}
   \left({r+4\over r+3}\right)^c.                              \tag{461}
\]

For completeness, evaluate (455) at the first `c+1` numerator nodes.
The `G` evaluation matrix is triangular, and the target determinant, with
`m=r-c`, is

\[
 \det[\phi_{m+j}(\alpha_i)]
 =\prod_i\phi_m(\alpha_i)
   {(-1)^{c(c+1)/2}\prod_{k=0}^{c-1}(m+5+k)^{k+1}
    \prod_{i<j}(\alpha_j-\alpha_i)
    \over\prod_i(\alpha_i+m+5)_c}.                              \tag{462}
\]

Taking the cross ratio of four instances of (462) proves (461); the
triangular `G` determinants cancel.  Some later numerator nodes coincide
with earlier poles.  Formula (461) remains valid there by perturbing the
nodes, applying the generic rational identity, and specializing back; both
the connection coefficients and (461) are regular at the specialization.

The products in (461) telescope.  They give

\[
 \boxed{\mu^K_{0,r}={1\over r+3},}                              \tag{463}
\]

\[
 \boxed{
 \mu^K_{2a+1,r}=
 {(a+2)(2r-2a+1)(r+4)^{2a+1}\over
  (2r+1)(r+3)^{2a+2}}>0,}                                      \tag{464}
\]

\[
 \boxed{
 \mu^K_{2a,r}=
 {(2a+5)(r-a+2)(r+4)^{2a}\over
  (2r+1)(r+3)^{2a+1}}>0\quad(a\ge1).}                          \tag{465}
\]

These are positive throughout the Neville range `r>c`.  Moreover,
`K_(s,s)=h_(s,s) overline V_(s,s)>0`, by (439)--(440) and the positive
diagonal in Section 63.  Hence `K^T` has a complete factorization into
nonnegative lower bidiagonal matrices and a positive diagonal matrix.
Therefore `K` is TN in every order.

Finally, iterate (446).  Let `W_(p,t;s)` be the coefficient of boundary row
`Y_(0,s)` in `Y_(p,t)`.  Then

\[
 W_{0,t;s}=\delta_{t,s},\qquad
 W_{p+1,t;s}={W_{p,t+1;s}+W_{p,t+2;s}\over c_{t+1}}.             \tag{466}
\]

This is the path matrix of a planar triangular zigzag network with positive
edge weights `1/c_(t+1)`.  With sinks ordered

\[
 (0,0),(0,1),(1,0),(1,1),\ldots,(q-2,0),(q-2,1),(q-1,0),       \tag{467}
\]

Lindstrom's lemma makes `W` TN.  Equation (445) is recovered from the
positive local block

\[
 (Y_{p,0},Y_{p,1})\longmapsto
 (B_{p-1},A_p)=
 \left(Y_{p,0},{Y_{p,0}+Y_{p,1}\over2}\right),                 \tag{468}
\]

whose matrix is lower triangular with positive entries and determinant
`1/2`.  Thus

\[
 (B_{-1},A_0,B_0,A_1,\ldots,B_{q-2},A_{q-1})^T
   =S W K                                                        \tag{469}
\]

is TN.  Delete the first formal row and append the genuine zero row
`B_(q-1)`.  The result is precisely the right factor in (346).  We have
proved

\[
 \boxed{
 \mathcal R_q=((R\overline V)_{0:},(P\overline V)_{0:},
 \ldots)^T\text{ is totally nonnegative for every }q.}          \tag{470}
\]

The exact certificate `prove_full_right_factor_network.py` checks the two
Catalan layer identities, both parity third-difference identities, both
closed `G` coefficient identities, and both parity forms of (461) as
symbolic zero residuals.  Independently, it reconstructs the complete right
factor exactly at `q=12`, checks all 66 predicted boundary Neville
multipliers there, and audits every minor of the zigzag and final right
matrices at `q=7`.  Its report is
`full_right_factor_network_proof_20260803.json`.  Equations (437)--(470), not
the finite audit, are the all-order proof.

## 75. Closure of the bottom Catalan sandwich theorem

Combining (436) and (470) with the three-state construction in Section 65
proves that every minor of `T_q(t)` in (345) is a polynomial in `t` with
nonnegative coefficients.  In particular,

\[
 \boxed{T_q(t)\text{ is TN for every }q\text{ and every }t\ge0.} \tag{471}
\]

Its diagonal is already supplied by the first branch
`UD^(m)V`: both branches containing `P` have zero diagonal, while
`U`, `D^(m)`, and `V` have positive diagonal.  Thus `T_q(t)` is nonsingular.
At `t=1`, (343)--(345) identify it with the terminal factor (330), up to the
harmless positive diagonal `S_q^(-1)`.  This proves (323).

There is no hidden strictness gap in passing back to the square quotient.
In (321), the lower Jacobi factor has every structurally allowable minor
positive.  The constant branch `UD^(m)V` likewise makes every structurally
allowable upper minor of `T_q(t)` positive.  For arbitrary equally sized row
and column sets `I,J`, choose the initial intermediate set
`K={0,...,k-1}` in Cauchy--Binet.  Both corresponding allowable triangular
minors are positive, so their summand is positive.  Consequently

\[
 Y_q^\#\text{ and hence }Y_q\text{ are STP for every }q.        \tag{472}
\]

This proves (318), and the implication chain already established in
Sections 54, 58, and 60 now gives (191), (296), (275), and the bottom Schur-
tail theorem.  Returning through (144)--(148), (23), and the derivative
closures (19)--(20) proves:

\[
 \boxed{
 \text{The hard-bottom reverse-Borel reserve endpoint, and therefore the
 complete hard-bottom reserve cone, is real stable.}}           \tag{473}
\]

Equation (473) is a solved uniform lemma.  It is not yet the full affine
tree theorem: the defect-one group `Q^2` endpoint and the original-target
index comparison listed in the updated Status remain independent proof
obligations.

## 76. Exact transfer of the group endpoint to a contiguous bottom difference

The solved bottom theorem gives a substantially narrower formulation of the
remaining group endpoint.  Let `g_(N,j)` denote the fixed-defect `j` umbral
seed.  Differentiating the complete generating functions in Section 21 gives
the all-order identity

\[
 \boxed{D_Xg_{N,3}(X)=g_{N-1,1}(X).}                         \tag{474}
\]

Indeed,

\[
 \sum_{N\ge2}g_{N,3}'(X)t^{N-2}
 ={(1-t)^2\over t^2}{t\over(1-t)^2}
   \left(e^{X t/(1-t)^2}-1\right)
 ={e^{X t/(1-t)^2}-1\over t},                              \tag{475}
\]

which is the defect-one generating function with its index shifted by one.
For the solved bottom kernel write

\[
 F_{M,d}=S^d(g_{M,3}\otimes g_{M,3})
          -S^{d-2}(g_{M-1,3}\otimes g_{M-1,3}).              \tag{476}
\]

The direct defect-one group target is

\[
 G_{N,d}=S^d(g_{N,1}\otimes g_{N,1})
 -2S^{d-2}(g_{N-1,1}\otimes g_{N-1,1})
 +S^{d-4}(g_{N-2,1}\otimes g_{N-2,1}).                       \tag{477}
\]

Using (474) term by term gives the exact reduction

\[
 \boxed{
 G_{N,d}=D_XD_Y\left(F_{N+1,d}-F_{N,d-2}\right).}            \tag{478}
\]

Thus both terms inside the parentheses are individually covered by the
bottom theorem; the only new issue is their specific minus orientation.
The natural sharpened candidate at this stage was the multivariate pencil

\[
 \boxed{F_{N+1,d}-uF_{N,d-2}\text{ is real stable}.}           \tag{479}
\]

The opposite plus orientation failed immediate exact/numerical line tests,
while an initial random search found no failure in the minus orientation.
Only `u=1` followed by `D_XD_Y` is required for (478).  Section 77 gives an
exact counterexample to the stronger variable-`u` assertion (479), without
affecting that required fixed specialization.

There is a second rigid signal.  Form the universal normalized coefficient
matrix of

\[
 (z+w)^{d-4}\left((z+w)^2-zw\mathcal C(z)^2
                         \mathcal C(w)^2\right)^2,             \tag{480}
\]

take its Schur tail after index `d`, and reverse the tail columns.  Apart
from the one-dimensional `m=1` base, exhaustive exact minor audits through
`m=7` give the strict sign signature

\[
 \epsilon_1=+1,\qquad \epsilon_2=+1,
 \qquad \epsilon_k=(-1)^k\quad(k\ge3).                         \tag{481}
\]

There are exactly `binom(m,k)^2` nonzero minors of order `k`, all with the
sign (481).  Exact Sturm counts on one positive-direction line through
`m=5` find all roots real for both the inner difference in (478) and its
`D_XD_Y` image.  The all-order identities (474) and (478), the complete
finite sign audit, and those Sturm checks are replayed by
`analyze_group_bottom_transfer.py`, with report
`group_bottom_transfer_20260803.json`.

Equations (474) and (478) are theorems.  Equation (479) is false by Section
77, while the all-order extension of (481), or another argument restricted
to `u=1`, remains a proof obligation.  The exact transfer still replaces the
raw defect-one `Q^2` problem by one fixed contiguous difference between two
members of the now-controlled bottom family.

## 77. Exact Sturm audit and obstruction for the stronger pencil

The coefficient normalization makes the structure of (479) especially
transparent.  In the common defect-three derivative basis, put

\[
 U(z,w)=zw\mathcal C(z)^2\mathcal C(w)^2,
 \qquad K(z,w)=(z+w)^2-U(z,w).
\]

Then the universal coefficient series of the pencil in (479), before the
positive ambient factorial scalings, is

\[
 \boxed{
 (z+w)^{d-4}K(z,w)\bigl((z+w)^2-uU(z,w)\bigr).}     \tag{482}
\]

At `u=0` this is the already-solved contiguous bottom member; at `u=1` it
is the square kernel (480).  Thus the requested group point lies on a
one-parameter deformation beginning at the proved bottom theorem, rather
than being an unrelated second kernel.

The earlier numerical screen of this pencil has now been replaced by exact
Sturm counting on deterministic positive-direction affine lines.  For each
`1<=m<=6`, with

\[
 N=3m+4,\qquad d=2m+5,
\]

twelve independently generated restrictions

\[
 (X,Y,u)=(a_0+a_1t,b_0+b_1t,c_0+c_1t),
 \qquad a_1,b_1,c_1>0,
\]

were formed over the integers.  In all `72` cases the exact Sturm real-root
count equals the full degree of the restricted polynomial.  The replay
script `verify_group_bottom_difference_pencil_sturm.py` records every line,
degree, exact count, and a SHA-256 digest of the primitive coefficient list
in `group_bottom_difference_pencil_sturm_20260803.json`.

Those `72` tests nevertheless miss an exact obstruction already at `m=1`.
Set `N=d=7`, specialize `Y=0` and `u=3`, and clear the positive denominator.
The pencil becomes the degree-eight polynomial

\[
\begin{split}
 3X^8+770X^7+74200X^6+3360504X^5+75678960X^4
 {}&+838965120X^3\\
 &+4294200960X^2+8808156000X+5164992000.
                                                               \tag{483}
\end{split}
\]

An exact Sturm count gives only six real roots, so the remaining two roots
are a nonreal conjugate pair.  Equivalently, if

\[
 f=F_{8,7},\qquad g=F_{7,5},
\]

then the Wronskian `g partial_X f-f partial_X g`, after `Y=0`, is negative at
`X=0` and positive at `X=100`; hence `f` and `g` are not in uniform proper
position.  The exact values are

\[
 -5150901000,qquad
 {482811737656211256352091000\over3969}.             \tag{484}
\]

The replay is `verify_group_bottom_difference_pencil_counterexample.py`,
with report `group_bottom_difference_pencil_counterexample_20260803.json`.
Thus (479) is false.  This does **not** affect the required `u=1` polynomial,
which continues to pass all exact tests.  It does show why randomized line
evidence must not be promoted to a proper-position lemma.  The sharp
remaining task is now the fixed square kernel (480): prove the all-order
signed Schur-tail pattern (481), or find a different argument specialized
to `u=1`.

## 78. A scaled-binomial extension of the solved bottom network

Although the variable-`u` pencil is false, the all-order bottom network has
a different one-parameter extension which is exactly adapted to the square
kernel.  Retain the checker Catalan matrix `R`, put `P=I-R`, and use the
positive diagonals `D^(0),D^(1),D^(m)` from (342).  For `0<=t<=1`, define

\[
 M_q(t)=D^{(0)}-tR D^{(1)}R.                       \tag{485}
\]

The same elementary identity as (344) gives

\[
 \boxed{
 M_q(t)=\bigl(D^{(0)}-tD^{(1)}\bigr)
       +tP D^{(1)}R+tD^{(1)}P.}                   \tag{486}
\]

Every diagonal entry in the first summand is strictly positive throughout
this interval, because `D^(0)>D^(1)>0`.  The other two summands use exactly
the interleaved rectangular factors proved TN in Sections 73--74.  Repeating
the three-state Cauchy--Binet construction of Section 65, with diagonal
weights

\[
 tD^{(1)}_{s,s},\qquad
 D^{(0)}_{s,s}-tD^{(1)}_{s,s},\qquad
 tD^{(1)}_{s,s},                                  \tag{487}
\]

therefore proves

\[
 \boxed{U_q^{(J)}M_q(t)\overline V_q
        \text{ is nonsingular TN for every }q\text{ and }0\le t\le1.}
                                                               \tag{488}
\]

The strictness argument in Section 75 is unchanged.  In universal
coefficient language, if `B_e` is the binomial anti-diagonal and `T_U` is
the lower Toeplitz matrix of

\[
 U(z)=z\mathcal C(z)^2,
\]

then (488) proves the scaled bottom family

\[
 A^{(1)}_e(\lambda)
 =\lambda B_e-T_U B_{e-2}T_U^{\mathsf T},
 \qquad \lambda\ge1,                              \tag{489}
\]

after dividing by the harmless positive scalar `lambda` and putting
`t=1/lambda`.  In particular,

\[
 A^{(1)}_e(2)=B_e+A^{(1)}_e(1)                    \tag{490}
\]

has the same all-order strict reversed-Schur-tail conclusion as the solved
bottom kernel.

This is precisely the middle object in the square case.  Formal coefficient
multiplication gives the all-order nesting identity

\[
 \boxed{
 A^{(2)}_d
 =B_d+T_U\bigl(-B_{d-2}-A^{(1)}_{d-2}(1)\bigr)T_U^{\mathsf T}
 =B_d-T_U A^{(1)}_{d-2}(2)T_U^{\mathsf T}.}        \tag{491}
\]

Indeed, expanding the right side is

\[
 B_d-2T_UB_{d-2}T_U^{\mathsf T}
 +T_U^2B_{d-4}(T_U^{\mathsf T})^2,
\]

the coefficient matrix of
`(z+w)^(d-4)((z+w)^2-U(z)U(w))^2`.

Equations (485)--(491) are all-order identities, and (488) uses only the two
rectangular TN networks already proved.  The replay
`prove_scaled_bottom_kernel_network.py` checks 44,280 middle-matrix entries,
1,640 positive weights, 26,896 instances of the universal nesting, and all
17,567 minors of the `lambda=2` Schur tails through `m=7`; its report is
`scaled_bottom_kernel_network_proof_20260803.json`.

Thus the remaining group problem is no longer an unexplained `Q^2` tail.
It is one Catalan congruence of the newly proved scaled-bottom kernel (490).
What remains is the composition theorem converting (488) and (491) into the
parameter-dependent signed factorization of the fixed group tail.  Section
79 records why the initially guessed fixed signature (481) is too rigid.

## 79. The fixed Schur signature changes at `m=14`

The finite signature in (481) does not extend unchanged to all sizes.  At
`m=13`, exact Gaussian elimination of the reversed group Schur tail has
pivot signs

\[
 (+,+,\underbrace{-,\ldots,-}_{11}),              \tag{492}
\]

so its determinant is negative, in agreement with (481).  At `m=14`, the
exact pivot signs are instead

\[
 \boxed{(+,+,\underbrace{-,\ldots,-}_{11},+),}     \tag{493}
\]

whose product is negative.  Formula (481) predicted a positive determinant
at even order fourteen, so (493) is an exact counterexample to the proposed
all-order signature.  The replay
`verify_group_schur_signature_transition.py` records the exact signs and
digests of the rational determinants in
`group_schur_signature_transition_20260803.json`.

This is not a counterexample to the fixed group polynomial's real stability.
Three exact positive-direction restrictions of the actual defect-one target
at `m=14` have degree `59`, and exact Sturm counting finds all `59` roots
real in each case, including the lines

\[
 (X,Y)=(1+2t,2+3t),\quad(-10+5t,17+7t),\quad
 (100+t,-100+2t).                                  \tag{494}
\]

These counts are replayed without constructing the full bivariate expansion
by `verify_group_m14_sturm_transition.py`, with coefficient digests in
`group_m14_sturm_transition_20260803.json`.

A broader exact coordinate audit gives the same conclusion.  For the
`m=14`, `N=46`, `d=33` group polynomial, specialize `Y` at the 21-point grid
`-50,-45,...,50`, at `+-100,+-200,+-500,+-1000`, and at twenty additional
deterministically chosen integers between `-5000` and `5000`.  Each of the
49 resulting polynomials in `X` has degree `46`, and exact Sturm counting
finds all `46` roots real.  The reproducible calculation is
`verify_group_m14_coordinate_sturm_screen.py`; its compact report is
`group_m14_coordinate_sturm_screen_20260803.json`.  This is a finite screen,
not a proof of bivariate real stability.

Thus the sign transition invalidates only the fixed-sign Schur-tail proof
route.  Equations (488)--(491) survive unchanged.  The remaining composition
theorem must allow its terminal pivot signs to depend on `m`, or bypass the
Schur-minor signature and prove real stability directly from the nested
scaled-bottom networks.

## 80. Exact two-component Schur decomposition of the group tail

The nesting (491) admits a second, more informative elimination.  Put

\[
 A=A^{(2)}_d=B_d-TPT^{\mathsf T},\qquad
 P=A^{(1)}_{d-2}(2),\qquad T=T_U.                  \tag{495}
\]

At the group endpoint truncate through `n=3m+5`, with `d=2m+5`.  Split the
rows of `T` into `T_0` on `0,...,d` and `T_1` on `d+1,...,n`.  In the latent
coordinates of `P`, put

\[
 C=\{0,\ldots,d-2\},\qquad F=\{d-1,\ldots,n\}.
\]

If `B_0=B_d[0:d,0:d]`, define

\[
 E=T_0^{\mathsf T}B_0^{-1}T_0.                    \tag{496}
\]

Because `T` is strictly lower triangular and `B_0^{-1}` is anti-diagonal,
the last two latent boundary coordinates pair only with the zero top row;
hence `E` is supported entirely on `C x C`.  Write the block Schur data of
the scaled-bottom matrix as

\[
 H=P_{FC}P_{CC}^{-1},\qquad
 \Sigma_P=P_{FF}-P_{FC}P_{CC}^{-1}P_{CF},
\]

and put

\[
 K=(P_{CC}^{-1}-E_{CC})^{-1},\qquad
 \widetilde T=T_{1C}+T_{1F}H.                     \tag{497}
\]

Woodbury followed by the block `LDU` factorization of `P` gives the exact
all-order identity

\[
 \boxed{
 \Sigma_A=-\widetilde T K\widetilde T^{\mathsf T}
           -T_{1F}\Sigma_PT_{1F}^{\mathsf T}.}    \tag{498}
\]

Indeed,

\[
 \Sigma_A=-T_1(P^{-1}-E)^{-1}T_1^{\mathsf T},
\]

and, with the `C,F` block order,

\[
 (P^{-1}-E)^{-1}
 =\begin{pmatrix}I&0\\H&I\end{pmatrix}
  \begin{pmatrix}K&0\\0&\Sigma_P\end{pmatrix}
  \begin{pmatrix}I&H^{\mathsf T}\\0&I\end{pmatrix}.          \tag{499}
\]

Thus the group tail is the sum of a finite core correction and a congruence
image of the already-solved scaled-bottom Schur tail.  This is an exact
decomposition, not a numerical ansatz.

The two summands have strikingly rigid but different finite signatures.
After reversing the `m` output columns, exhaustive exact audits through
`m=7` show:

* the inherited scaled-bottom summand is STP: all
  `binom(m,k)^2` minors of every order `k` are positive;
* for `m>=3`, the core summand is strictly sign regular with signs
  `+,+,(-1)^k` for orders `k>=3`.

Their entrywise-positive sum is the actual group tail.  The competition
between these two structured pieces explains why the old signature can hold
for many sizes and then change: total positivity is not closed under adding
this particular sign-regular correction.  The exact block reconstruction,
ranks, inertias, and all component minors through `m=7` are replayed by
`explore_group_nested_schur_decomposition.py`, with report
`group_nested_schur_decomposition_probe_20260803.json`.

A separate exact determinant scan shows that the `m=14` transition is not
isolated.  Through `m=40`, the old full-determinant sign also fails at
`m=15,22,32,33,40` (besides the one-dimensional base exception).  Moving
the Schur boundary by any fixed shift among `0,...,4` does not remove the
terminal transitions through `m=16`.  These finite facts are recorded by
`scan_group_schur_determinant_signs_flint.py` and
`probe_group_shifted_schur_boundaries.py`.  They rule out fixed-sign and
fixed-boundary variants of the old certificate, but do not contradict real
stability.

Equation (498) is now the sharp composition target: combine the solved
scaled-bottom network with the explicitly isolated core correction using a
variation or mixed-characteristic argument that does not require every
minor of their sum to retain one sign.

## 81. A negative-rooted quadratic-Euler parent for the three group seeds

There is a second all-order reduction of the defect-one triple which is not
visible in the Catalan lowering basis.  Put

\[
 g=g_{N,1},\qquad h=g_{N-1,1},\qquad j=g_{N-2,1},
 \qquad E=X{d\over dX}.
\]

The consecutive coefficient ratios are

\[
 {[X^k]h\over[X^k]g}={N-k\over N+k-1},\qquad
 {[X^k]j\over[X^k]g}
 ={(N-k)(N-k-1)\over(N+k-1)(N+k-2)}.              \tag{500}
\]

The unique linear combination with coefficient ratio equal to the reciprocal
of a quadratic is

\[
 \boxed{
 A_N=g+{4(N-1)\over2N-3}h+{2N-1\over2N-3}j.}     \tag{501}
\]

If `Delta=2(N-1)(2N-1)`, direct coefficient cancellation in (500) gives

\[
\boxed{
\begin{aligned}
 g&={(E+N-1)(E+N-2)\over\Delta}A_N,\\
 h&={(N-E)(E+N-2)\over\Delta}A_N,\\
 j&={(N-E)(N-E-1)\over\Delta}A_N.
\end{aligned}}                                                   \tag{502}
\]

These are all-order identities.  Writing `n=N-1`, the parent itself has the
closed form

\[
 \boxed{
 A_N=2(2N-1)X\,
 {}_2F_2\left(\begin{matrix}-n,n\\3/2,2\end{matrix};-X/4\right).} \tag{503}
\]

Moreover, `A_N` has only nonpositive real roots.  The nonzero factor in
(503) is the degree-`n` multiplicative finite-free convolution of

\[
 J_n(X)={}_2F_1\left(\begin{matrix}-n,n\\3/2\end{matrix};-X/4\right)
 \quad\hbox{and}\quad
 L_n(X)={}_1F_1\left(\begin{matrix}-n\\2\end{matrix};X\right).    \tag{504}
\]

The Laguerre factor has positive roots.  The roots of `J_n` are negative and
real by an elementary fourth-kind Chebyshev identity.  If
`x=1+X/2` and `W_r(cos theta)=sin((r+1/2)theta)/sin(theta/2)`, then

\[
 \boxed{
 J_n(X)={1\over2}\left{{W_{n-1}(x)\over2n-1}
                    +{W_n(x)\over2n+1}\right\}.}                 \tag{505}
\]

Consecutive fourth-kind polynomials are in proper position, so the positive
combination in (505) is real-rooted.  Both summands are positive for `x>1`,
so it has no positive-`X` root.  The standard sign-preservation theorem for
multiplicative finite-free convolution now proves the assertion for `A_N`.
The exact replay `verify_defect1_quadratic_euler_parent.py` verifies (500)--
(505), the finite-free coefficient convolution, and certified root isolation
through `N=60`; its report is
`defect1_quadratic_euler_parent_20260804.json`.

There is also a useful rank-two projection interpretation.  Normalize `A_N`
to be monic, write `A_N(X)=prod_(i=1)^N(X+r_i)`, put `L=2N-1`, and append
`N-1` zero entries to `R=diag(r_1,...,r_N)`.  If `Q` is a Haar orthonormal
`L` by `2` frame, Cauchy--Binet and

\[
 \mathbb E\sum_{a=1}^2Q_{ia}^2={2\over L},\qquad
 \mathbb E\det Q[\{i,j\},:]^2={1\over\binom L2}
\]

give

\[
 \boxed{
 X^{N-1}g(X)=
 \mathbb E_Q\det\{XI_L+R^{1/2}(I-QQ^{\mathsf T})R^{1/2}\}.}      \tag{506}
\]

Thus the main seed is an expected characteristic polynomial of a positive
semidefinite rank-two compression of one diagonal parent.  Equations (502)
also show that the three seeds are the ordered survive/hit states of two
successive without-replacement Euler contractions.  This makes a local
minor-orthogonal or mixed-characteristic composition theorem a natural
remaining target for the group endpoint.

Two cautions are already exact.  First, the differential relation

\[
 2N(N-1)h=(2N^2-NX)g+{X^2-2(2N-1)X\}g'+4X^2g''                 \tag{507}
\]

is valid in every degree, but its second-order operator is not a general
stability preserver.  Its bounded-degree symbol contains

\[
 q_N(X,U)=(2N-X)U^2+X(2-X)U+2(N-1)X^2,
\]

whose discriminant in `U` is

\[
 X^2\{X^2+(8N-12)X+4-16N(N-1)\}.
\]

At `X=6-4N` this is strictly negative for `N>1`.  Second, even the complete
parent-to-group operator in (502) is not a global bounded-degree stability
preserver: at `m=1`, the positive-direction symbol line with bases
`(-11,-3,4,19)` and directions `(1,7,2,5)` has degree eleven and four
nonreal roots.  Hence (501)--(506) must be used through the special
Chebyshev/finite-free parent or its rank-two frame model, not through a
generic symbol theorem.
The exact degree-eleven polynomial, its seven real and four nonreal roots,
and coefficient digest are replayed by
`verify_defect1_parent_group_symbol_counterexample.py`, with report
`defect1_parent_group_symbol_counterexample_20260804.json`.

The larger exact stress tests continue to support the fixed target.  Two
hundred deterministic random positive-direction lines at `m=14` and one
hundred at `m=15` have respectively all `59` and all `63` roots real by exact
Sturm chains.  The three designated lines at each of `m=22,32,40` likewise
have all roots real, through degree `163`.  The fast replay is
`fast_group_line_sturm_search.py`, with the size-specific reports, together
with `group_transition_sizes_root_lines_20260803.json`.  These are finite
tests, not a proof.

Finally, sign regularity survives the first determinant transitions but is
not an all-order substitute.  At `m=14`, every order `11`, `12`, and `13`
minor has one sign (132,496, 8,281, and 196 exact minors); the analogous
high-order counts at `m=15` also agree.  By `m=32`, however, the first-order
reversed Schur tail already has 581 positive and 443 negative entries.
Therefore the actual stability seen in the line tests is strictly broader
than any fixed or size-dependent sign-regularity theorem for that Schur
tail.

## 82. Chebyshev factorization of the signed defect-one quadratic

The quadratic-Euler parent has a stronger two-variable consequence.  For
every `N>=3`, put

\[
 \mathcal F_N(X,Z)=g_{N,1}(X)Z^2-2g_{N-1,1}(X)Z+g_{N-2,1}(X).       \tag{508}
\]

Then `mathcal F_N` is real stable.  This is an all-order theorem, not a root
screen.  To see the hidden factorization, write `n=N-1`,

\[
 J_n(X)={}_2F_1\left(\begin{matrix}-n,n\\3/2\end{matrix};-X/4\right),
 \qquad E=X D_X,
\]

and define

\[
 Q_n(k,Z)=(n+k)(n+k+1)Z^2-2(n-k)(n+k)Z
                         +(n-k)(n-k-1).                         \tag{509}
\]

At `x=1+X/2`, introduce two parity-interleaved Chebyshev families

\[
\begin{array}{c|cc}
 n& P_n^-(X)&P_n^+(X)\\ \hline
 2r&V_r(x)=U_r(x)-U_{r-1}(x)&W_r(x)=U_r(x)+U_{r-1}(x)\\
 2r+1&U_r(x)&2T_{r+1}(x).
\end{array}                                                     \tag{510}
\]

The cases `n=0,1` use the same formulas, with `U_(-1)=0`.  Direct use of
the Chebyshev recurrence gives the exact identity

\[
 \boxed{Q_n(E,Z)J_n(X)
 =n\{ZP_n^-(X)-P_{n-2}^-(X)\}
    \{ZP_n^+(X)-P_{n-2}^+(X)\}.}                    \tag{511}
\]

Within each parity, the lower-degree `P_(n-2)^+` and `P_(n-2)^-`
strictly interlace their corresponding `P_n^+` and `P_n^-`.  All roots lie
in `(-4,0)` in the `X` coordinate.  Consequently

\[
 {P_{n-2}^{\pm}(X)\over P_n^{\pm}(X)}
\]

maps the upper half-plane to the lower half-plane.  Each linear pencil in
(511), and hence their product, is therefore real stable in `(X,Z)`.

It remains to return from the quasi-Jacobi factor to the defect-one seeds.
Let `M_gamma` be the diagonal coefficient operator

\[
 \mathcal M_\gamma\left(\sum_{k\ge0}a_kX^k\right)
 =\sum_{k\ge0}{a_k\over(k+1)!}X^k.                              \tag{512}
\]

Coefficient comparison in (503)--(504) gives

\[
 \boxed{\mathcal F_N(X,Z)
 ={X\over n}\mathcal M_\gamma\{Q_n(E,Z)J_n(X)\}.}              \tag{513}
\]

The sequence `gamma_k=1/(k+1)!` is a Polya--Schur multiplier sequence: its
exponential generating function is

\[
 \sum_{k\ge0}{t^k\over k!(k+1)!}
 ={I_1(2\sqrt t)\over\sqrt t},                                  \tag{514}
\]

whose zeros are all negative real numbers.  The multivariate multiplier
theorem says that applying (512) in `X` preserves real stability in the
remaining variables.  Equations (511)--(514) prove (508).

There is an immediate apolar corollary.  Reverse the `Z` coefficients in a
second copy and use the degree-two Grace pairing.  It gives

\[
 \boxed{g_N(X)g_N(Y)-2g_{N-1}(X)g_{N-1}(Y)
                    +g_{N-2}(X)g_{N-2}(Y)\text{ is real stable}.} \tag{515}
\]

This is exactly the unsmoothed signed core of the hard group expression.
It does not by itself prove (477), because the three terms there have
derivative orders `d,d-2,d-4`, rather than one common derivative order.
Indeed the tempting base
`S^4(g_N tensor g_N)-2S^2(g_(N-1) tensor g_(N-1))+
g_(N-2) tensor g_(N-2)` already fails a positive-direction line test at
`N=4`, and also at the first endpoint `N=d=7`.  Thus the remaining step is a
graded, higher-degree apolar contraction that retains the two derivative
offsets; ordinary differentiation of (515) is insufficient.

The exact replay `verify_defect1_signed_quadratic_factorization.py` checks
(509)--(513), both parity recurrences, and the output identity for
`3<=N<=101`.  Its report is
`defect1_signed_quadratic_factorization_20260804.json`.  The all-order proof
is the displayed Chebyshev recurrence/interlacing and multiplier-sequence
argument; the finite range is only replay evidence.

## 83. Positive apolar core and its two-slot polarized contraction

The stable core (515) has an additional property that is not automatic for a
signed apolar pairing: every coefficient in its support is strictly positive.
For `1<=a<=N`, the defect-one coefficient formula is

\[
 [X^a]g_N(X)={1\over a!}{N+a-1\choose N-a}.                   \tag{516}
\]

Write `c_(N,a)` for the right side.  Directly taking the two consecutive
ratios in `N` gives

\[
\begin{split}
 &[X^aY^b]\{g_N(X)g_N(Y)-2g_{N-1}(X)g_{N-1}(Y)
                         +g_{N-2}(X)g_{N-2}(Y)\}\\
 &\quad=c_{N,a}c_{N,b}
 {2(a+b-1)\{ab+(2N^2-4N+1)(a+b)-3N^2+6N-2\}
  \over
  (N+a-2)(N+a-1)(N+b-2)(N+b-1)}.                \tag{517}
\end{split}
\]

The bracket in braces is increasing separately in `a` and `b` for `N>=2`.
At `a=b=1` it is `(N-1)^2`; every remaining factor in (517) is positive.
Thus (517) is a uniform strict-positivity proof.  In particular, the standard
homogenization of (515) to total degree `2N` is again real stable.  The shared
homogenizing variable does not by itself encode the derivative offsets, so
this observation is not being used as an illicit ordinary-derivative shortcut.

There is, however, an exact stable polarization which records those offsets.
The inverted quadratic

\[
 R_N(X,U)=U^2\mathcal F_N(X,-1/U)
          =g_N(X)+2g_{N-1}(X)U+g_{N-2}(X)U^2                 \tag{518}
\]

is real stable, because `U -> -1/U` preserves the upper half-plane.  Its
degree-two polarization

\[
 \Phi_N(X;z_1,z_2)=g_N(X)+g_{N-1}(X)(z_1+z_2)
                         +g_{N-2}(X)z_1z_2                   \tag{519}
\]

is therefore real stable in all three variables and has nonnegative
coefficients.  Put `T_i=D_(z_i)D_(w_i)` and retain
`S=D_X+D_Y`.  Expansion of the four multi-affine state coefficients gives the
all-order identity

\[
 \boxed{
 G_{N,d}=
 \left.
 S^{d-4}(S^2-T_1)(S^2-T_2)
 \{\Phi_N(X;z_1,z_2)\Phi_N(Y;w_1,w_2)\}
 \right|_{z_1=z_2=w_1=w_2=0}.}                  \tag{520}
\]

Indeed, choosing neither state slot gives `S^d(g_N tensor g_N)`; choosing
one of the two slots gives two copies of
`-S^(d-2)(g_(N-1) tensor g_(N-1))`; choosing both gives the final
`S^(d-4)(g_(N-2) tensor g_(N-2))`.  Thus the hard endpoint is precisely two
successive rank-one complement contractions of one positive stable
polarization.  This is the differential counterpart of the nested Catalan
identity (491).

The representation sharply identifies both the opportunity and the caution.
The constant-coefficient symbol
`S^(d-4)(S^2-z_1w_1)(S^2-z_2w_2)` is not stable on arbitrary inputs, and the
natural shifted-triangle master symbol already has a positive-direction line
with nonreal roots at `N=d=7`.  Hence (520) still requires a theorem for this
special polarized input.  Borcea--Branden's mixed-determinant theorem is now
the closest exact template: a complement sum of principal minors of
positive-semidefinite matrix pencils is stable, and (520) has exactly two
matched rank-one slots.  The remaining task is to realize the Chebyshev /
finite-free representation of (519) in that mixed-determinant form, or to
prove the equivalent two-slot contraction directly from the scaled-bottom
network (488)--(491).

The replay `verify_defect1_positive_apolar_core.py` checks (516)--(517) over
a long exact range and (520) at the first endpoint sizes, with report
`defect1_positive_apolar_core_20260804.json`.  Formula (517) and the
multi-affine expansion proving (520) are all-order identities; the finite
checks are only transcription audits.

## 84. Squarefree-algebra closure of the core, and the exact graded obstruction

The stable core (515) also follows from a closure theorem which is almost
perfectly adapted to the square kernel.  In the squarefree algebra

\[
 \mathcal A_2=\mathbb R[t_1,t_2]/(t_1^2,t_2^2),
\]

Sinclair's Proposition 3.7 states that the squarefree product of two
multi-affine real-stable polynomials is real stable.  Polarize (508) and pair
it with (519), using the same two squarefree variables:

\[
\begin{aligned}
 \Psi_N(X;t_1,t_2)
   &=g_N(X)t_1t_2-g_{N-1}(X)(t_1+t_2)+g_{N-2}(X),\\
 \Phi_N(Y;t_1,t_2)
   &=g_N(Y)+g_{N-1}(Y)(t_1+t_2)+g_{N-2}(Y)t_1t_2.
                                                               \tag{521}
\end{aligned}
\]

Both factors are real stable: `Psi_N` is the ordinary degree-two
polarization of (508), while `Phi_N` is its inverted polarization (519).
The top squarefree coefficient of their product is

\[
 \boxed{
 [t_1t_2]\{\Psi_N(X;t)\Phi_N(Y;t)\}_{\rm sf}
 =g_N(X)g_N(Y)-2g_{N-1}(X)g_{N-1}(Y)
                  +g_{N-2}(X)g_{N-2}(Y).}          \tag{522}
\]

Coefficient extraction is differentiation followed by a real
specialization, so Sinclair's theorem gives a second all-order stability
proof of (515).  Unlike the Grace-pairing proof, (522) exhibits the signed
core as ordinary multiplication in a nilpotent algebra.  This is a genuine
new closure mechanism, not another root screen.

The derivative offsets can also be encoded exactly in that algebra, but the
obvious stable-factor argument fails.  For real `c`, put

\[
 L_{N,c}(X;\mathbf u)=
 \left.
 \prod_{i=1}^2
  \{1+u_{i,+}(D_X+cD_{z_i})\}
  \{1+u_{i,-}(D_X-cD_{z_i})\}
 \Phi_N(X;z_1,z_2)\right|_{z_1=z_2=0}.             \tag{523}
\]

If `2ab=1`, direct squarefree multiplication gives

\[
 \boxed{
 [u_{1,+}u_{1,-}u_{2,+}u_{2,-}]
 \{L_{N,a}(X;\mathbf u)L_{N,b}(Y;\mathbf u)\}_{\rm sf}
 =S^4(g_N\otimes g_N)-2S^2(g_{N-1}\otimes g_{N-1})
                         +g_{N-2}\otimes g_{N-2}.} \tag{524}
\]

For each slot, the two complementary singleton allocations contribute
`2D_XD_Y-2abD_zD_w`; the same-side double allocation is just `D_X^2` or
`D_Y^2`, since the state variables are multi-affine.  Thus (524), followed
by `S^(d-4)`, is exactly the group target.

However the individual factors in (523) need not be stable.  Exact
positive-direction Sturm restrictions already give only one real root out
of three for `(N,c)=(3,3/4)`, and only two out of four for
`(N,c)=(4,2/3)`.  These two rational parameters satisfy
`2(3/4)(2/3)=1`, so even a particularly natural exact factor pair for
(524) is unavailable.  More strongly, for `a=1,b=1/2` the full squarefree
convolution, after the actual first endpoint smoothing
`N=7,S^(d-4)=S^3`, has an exact positive-direction line of degree eleven
with only nine real roots.  Hence neither stability of the factors nor
stability of the complete marker parent can be used to infer stability of
its top coefficient.  These obstructions leave the required top coefficient
itself untouched.

The other new convolution normalization is equally sharp but does not
factor literally.  After peeling the harmless final `S` derivative, the
two bottom differential symbols multiply to the even group source, which
suggests Marcus's generalized-singular-value convolution.  The supports do
match, but the required ambient factorial normalization does not: at the
first tested endpoint it produces 46 distinct coefficient ratios rather
than one.  Exact factorization of the correctly normalized target symbols
over `QQ[z,w]` finds them irreducible at `m=1,2,3`, of total degrees
`8,12,16`.  Thus there is no literal two-bottom factorization in those
coordinates.  A size-changing or non-product determinantal convolution is
still possible, but would require a genuinely new normalization theorem.

The updated replay `verify_defect1_positive_apolar_core.py` checks (522) for
`3<=N<=30` in addition to the 5,307 seed coefficients, 73,805 strict core
coefficients, and the first five endpoint contractions.  The graded-lift
and full-parent counterexamples are recorded by
`probe_group_squarefree_derivative_lift.py` and
`probe_group_full_squarefree_convolution.py`.  The GSV mismatch and exact
irreducibility screen are recorded by
`verify_group_gsv_convolution_identity.py` and
`probe_group_gsv_symbol_factorization.py`, with compact JSON reports.  The
only theorem still missing for the group endpoint is therefore a closure
principle for the **top graded coefficient** in (524), or equivalently the
special two-slot contraction (520); generic squarefree multiplication and
literal GSV symbol multiplication are now both decided.

## 85. Odd-path--Laguerre mixed-characteristic model of the polarization

The defect-one coefficients in (516) have a concrete matching interpretation
that removes the remaining abstract hypergeometric layer.  Define the inverse
factorial seed

\[
 p_N(T)=\sum_{a=1}^N {N+a-1\choose N-a}T^a.         \tag{525}
\]

Writing `k=N-a` shows that its coefficient is
`binom(2N-1-k,k)`, the number of `k`-matchings of the path on `2N-1`
vertices.  Equivalently, if

\[
 C_r=\operatorname{tridiag}(1,2,1)_{r\times r},
 \qquad A_N=0\oplus C_{N-1},
\]

then the path continuant gives the all-order identities

\[
 \boxed{
 p_N(T)=T\det(TI_{N-1}+C_{N-1})
       =\det(TI_N+A_N)
       =T\prod_{j=1}^{N-1}
          \left(T+4\cos^2{j\pi\over2N}\right).}    \tag{526}
\]

Thus the raw parent is the characteristic polynomial of an explicit positive
semidefinite path Jacobi matrix.  Let

\[
 q_N(T)=N!L_N(-T),
\]

the monic Laguerre polynomial with negative roots.  In the usual degree-`N`
multiplicative finite-free convolution, coefficient comparison gives

\[
 \boxed{N!g_N(T)=p_N\boxtimes_N q_N.}              \tag{527}
\]

Indeed the coefficient of `T^a` in `q_N` is
`N! binom(N,a)/a!`; division by the finite-free normalization
`binom(N,N-a)=binom(N,a)` leaves exactly `N!/a!`.  Formula (527) is
therefore an all-order identity and a positive-semidefinite random-matrix
model for the seed.

There is an even sharper mixed-characteristic form which keeps both state
slots.  In `A_N`, let `E_L,E_R` be the two endpoint coordinate projectors of
the `C_(N-1)` block and put

\[
 \Delta_N(T,U,e_L,e_R)=
 \det(TI_N+UA_N+e_LE_L+e_RE_R).                    \tag{528}
\]

Deleting either endpoint gives `A_(N-1)`; deleting both gives `A_(N-2)`.
Since `Delta_N` is multi-affine in the endpoint fields, the multinomial
expansion yields

\[
 \boxed{
 N!\Phi_N(T;z_1,z_2)=
 \left.
 (1+D_U+z_1D_{e_L}+z_2D_{e_R})^N
 \Delta_N(T,U,e_L,e_R)
 \right|_{U=e_L=e_R=0}.}                          \tag{529}
\]

The constant state is `(1+D_U)^N Delta_N=N!g_N`.  A single endpoint state
can occupy any one of the `N` identical mixed-characteristic slots, giving
`N(N-1)!g_(N-1)=N!g_(N-1)`.  The two labeled endpoint states occupy two
distinct slots, giving
`N(N-1)(N-2)!g_(N-2)=N!g_(N-2)`.  Terms containing a repeated endpoint
derivative vanish, so (529) has no unwanted powers of `z_1,z_2`.

This representation explains the earlier GSV factorial mismatch: the state
slots are coupled **without replacement** to the two endpoints of one path
pencil.  Treating the two bottom symbols as an ordinary product discards that
endpoint--slot coupling.  Substitution of (529) into (520) now turns the
remaining group theorem into a precise two-endpoint exclusion statement for
two positive-semidefinite path mixed-characteristic pencils.  This is much
narrower than seeking an arbitrary determinantal representation of (519): the
matrices are explicit tridiagonal path matrices, and the only non-product
feature is the two labeled slots sampled without replacement.

The replay `verify_defect1_path_laguerre_model.py` checks (525)--(527) through
`N=80` (6,478 exact coefficient checks) and (529) through `N=14`, with report
`defect1_path_laguerre_model_20260804.json`.  The continuant recurrence,
finite-free coefficient cancellation, and multinomial calculation are the
all-order proofs.  Equation (529) does not yet prove (520), but it replaces
the proposed abstract Lax representation by the explicit mixed-characteristic
matrix pencil on which a final complement theorem would have to act.

## 86. Binomial marker parent, its exact obstructions, and a linear smoothing cone

There is an exact way to put every derivative order in (477) into one graded
polynomial.  For arbitrary `N,d` with `d>=4`, define

\[
 \boxed{
 H_{N,d}(X,Y,T)=
 (1+TS)^d(g_N\otimes g_N)
 -2T^2(1+TS)^{d-2}(g_{N-1}\otimes g_{N-1})
 +T^4(1+TS)^{d-4}(g_{N-2}\otimes g_{N-2}).}       \tag{530}
\]

Then

\[
 \boxed{[T^d]H_{N,d}=G_{N,d}.}                    \tag{531}
\]

This is the diagonalization of a symmetric multi-affine derivative-slot
parent.  One state occupies a uniformly chosen two-subset of the `d` slots;
both labeled states occupy two disjoint two-subsets.  The scalar selector is

\[
 \Theta_{d,q}(u_1,\ldots,u_d)=
 1-{2q\over\binom d2}e_2(\mathbf u)
   +{q^2\over\binom d4}e_4(\mathbf u).             \tag{532}
\]

Its diagonal is `(1-qU^2)^2`.  Therefore (532) is the degree-`d`
polarization of a real-rooted polynomial and is itself real stable in the
slot variables.  This explains why (530) passes many more tests than the
earlier ad hoc graded lifts.

Nevertheless, the convenient stronger theorems are false.  The diagonal
Borcea--Branden algebraic symbol of the marker operator already has, at
`N=d=7`, the positive-direction line with bases

\[
 (-4,14,-13,6,16,13,15)
\]

and directions

\[
 (4,8,8,4,9,2,10),
\]

on which its degree-eighteen restriction has only sixteen real roots.  The
reverse-Borel version fails even more strongly: at the first tested line its
degree-fourteen restriction has only four real roots.  Finally the full
marker parent `H_(7,6)` has the exact line

\[
 (X,Y,T)=(5,31,50)+t(21,24,15)                    \tag{533}
\]

with only twelve real roots out of fourteen.  Thus neither a universal
operator theorem, the raw odd-path parent, nor an all-`d` marker-parent
theorem can prove the top coefficient.  These counterexamples do not touch
the top coefficient at the actual endpoint.  The stronger parent itself is
now also known to fail there: at `(N,d)=(7,7)`, the exact
positive-direction line

`(X,Y,T)=(-27,-23,27)+tau(5,8,13)`

has degree fourteen, is squarefree, and has only twelve real roots (the
remaining pair is approximately `-1.6464628128 +- 0.0413844612 i`).  Its
primitive coefficient digest is
`1c79974138c60f4cdaaa366e7ab1b71000977833d2e6675ddd2ccb41aeb41d16`.
This supersedes the earlier clean finite sample of that parent.  The target
`[T^d]H_(N,d)=G_(N,d)` is unaffected: coefficient extraction can be stable
even when the full marker parent is not.  The exact replay is
`group_binomial_marker_endpoint_m0to3_60lines_20260804.json`.

The failed stronger parents revealed a sharper target.  Since

\[
 G_{N,d+1}=S G_{N,d},                              \tag{534}
\]

stability at one smoothing order propagates to every larger order.  A fast
exact map of the target polynomial, rather than of (530), gives the apparent
uniform cone

\[
 \boxed{2d-N\ge5\quad\Longrightarrow\quad
        G_{N,d}\text{ is real stable}.}            \tag{535}
\]

The statement (535) is still a conjectural lemma, not a proved theorem.  Its
boundary was tested on twenty deterministic exact positive-direction lines
for every `4<=N<=39`, with no failure.  The immediately preceding order was
also tested; twenty-four sizes produced exact counterexamples.  Altogether
the replay contains 1,003 exact Sturm restrictions.  A broader `333`-cell
threshold map through `N=30` gives the same boundary.  The original group
endpoint lies strictly inside this cone, because

\[
 N=3m+4,\qquad d=2m+5,qquad 2d-N=m+6.             \tag{536}
\]

Thus a proof of the linear smoothing cone (535), which is stronger but more
regular than the isolated endpoint, would finish the complete group lemma by
(534).  The reports are `group_linear_smoothing_cone_probe_20260804.json`
and `group_target_smoothing_threshold_probe_20260804.json`; exact lower-side
failures show that a substantially order-free strengthening is impossible.

## 87. Wishart linearization and a literal mixed-determinant model

The finite-free identity (527) has a concrete Gaussian form.  If `A>=0` is
`n` by `n` and `Z` is a standard complex Gaussian `n` by `r` matrix, the
minor moment formula gives

\[
 \mathbb E\det\{XI_n+A^{1/2}ZZ^*A^{1/2}\}
 =\sum_{k=0}^n(r)_k e_k(A)X^{n-k}.                 \tag{537}
\]

For the path covariance `A_N=0 direct-sum C_(N-1)`, equation (526) says that
`e_k(A_N)=binom(2N-1-k,k)`.  Consequently

\[
 \boxed{
 N!g_N(X)=
 \mathbb E\det\{XI_N+A_N^{1/2}ZZ^*A_N^{1/2}\},
 \qquad Z\in\mathbb C^{N\times N}.}               \tag{538}
\]

Deleting one endpoint of the path block gives `A_(N-1)` and deleting both
gives `A_(N-2)`.  If the same number `r=1,2` of Gaussian columns is deleted,
the expected characteristic polynomial is `(N-r)!g_(N-r)`.  The labeled
without-replacement choices restore the common scale because

\[
 (N)_r(N-r)!=N!.                                  \tag{539}
\]

Thus the three states in (519) are literal joint row/column deletion states
of one Wishart linearization.  This is the probabilistic counterpart of the
slot formula (529), not merely an analogy.

There is also an exact Borcea--Branden mixed-determinant representation.  Let
`J` be the all-ones rank-one matrix and let `eta` be the ordered-partition
mixed determinant of their Theorem 2.6.  For every positive-definite `A`,
Jacobi complementation gives

\[
 \boxed{
 \det(A)\,\eta(XA^{-1},\underbrace{J,\ldots,J}_{n})
 =\sum_{R\subseteq[n]}(n)_{|R|}\det A[R]X^{n-|R|}.} \tag{540}
\]

Indeed, if the indices assigned to `XA^(-1)` form `S`, every complementary
index must be assigned to a distinct labeled rank-one `J` factor, producing
`(n)_(n-|S|)`; Jacobi's identity replaces
`det(A)det(A^(-1)[S])` by `det A[S']`.  The singular path covariance follows
by replacing `A_N` with `A_N+epsilon I` and taking a coefficientwise limit.
The block-diagonal two-variable version, with `J_X` and `J_Y` supported on
their respective blocks, gives the product `g_N(X)g_N(Y)` as one mixed
determinant of positive-semidefinite matrix pencils.

Equations (537)--(540) put every unsigned ingredient of the group endpoint
inside the exact hypotheses of the mixed-determinant stability theorem.  The
remaining problem is now only to encode the two correlated endpoint/column
deletions, with signs `1,-2,1` and total marked order `d`, as one ordered
partition pencil.  The cone `2d-N>=5` is the observed range in which this
last exclusion composition should be possible.  The replay
`verify_defect1_wishart_mixed_determinant_model.py` checks the path/Wishart
identities through `N=40`, 228 endpoint normalizations, and the mixed-
determinant formula on nontrivial positive-definite matrices through size
seven.  The Gaussian minor moment and Jacobi identity are the all-order
proofs; only the final signed coupling remains open.

## 88. The top homogeneous layer is proved throughout the linear cone

The apparent boundary in (535) is exact for the highest-degree homogeneous
component, and that statement has an all-order Jacobi-matrix proof.  Put

\[
 r=N-d,\qquad D=d+2r,
\]

and define

\[
 c_j=[z^j](1+z)^{d-4}(1+z+z^2)^2,
 \qquad
 Q_{d,r}(z)=\sum_{j=0}^d {d+2r\choose r+j}c_jz^j.             \tag{541}
\]

Up to a positive factorial and a monomial `z^r`, this is the binary row
polynomial of the top homogeneous component of `G_(N,d)`.  The cone boundary
is `r=d-5`.  At that boundary write

\[
 Q^0_d(z)=\sum_{j=0}^d{d\choose j}{3d-10\choose d-5+j}z^j.
\]

If `E=zD_z` and `Lambda=E(d-E)`, coefficient comparison gives

\[
 Q_{d,d-5}=\left\{1-{2\Lambda\over d(d-1)}
 +{\Lambda(\Lambda-d+1)\over d(d-1)(d-2)(d-3)}\right\}Q^0_d. \tag{542}
\]

Both polynomials are palindromic.  With `t=z/(1+z)^2`, the quadratic
hypergeometric transformation gives

\[
 Q^0_d(z)=C_d(1+z)^dF^0_d(t),\qquad
 F^0_d(t)={}_2F_1\left(-{d\over2},{1-d\over2};d-4;4t\right), \tag{543}
\]

where `C_d>0`.  Conjugating `Lambda` through this change of variables and
using the differential equation in (543) twice reduces (542) to

\[
 \boxed{
 F_d(t)=F^0_d(t)-{2(2d-5)\over d(d-1)}t(F^0_d)'(t)
 +{2(2d-5)\over d(d-1)(d-2)}t^2(F^0_d)''(t).}                \tag{544}
\]

In particular, if `F^0_d=sum f_k t^k`, the multiplier in (544) is

\[
 \rho_k=1-{2(2d-5)k\over d(d-1)}
       +{2(2d-5)k(k-1)\over d(d-1)(d-2)}.                   \tag{545}
\]

It decreases for `0<=k<=floor(d/2)` and its last value is
`3/(2(2n-1))` for `d=2n`, and `(3n-1)/((2n-1)(2n+1))` for
`d=2n+1`.  Hence every coefficient of `F_d` is positive.

It remains to prove, rather than assume, that `F_d` is real-rooted.  Put
`n=floor(d/2)`, `alpha=d-5`, and

\[
 \beta=\begin{cases}-1/2,&d=2n,\\+1/2,&d=2n+1.\end{cases}
\]

Under `t=-y/(4(1-y))`, formula (543) becomes the ordinary Jacobi polynomial
`P_n^(alpha,beta)(1-2y)`.  More precisely,

\[
 K_d(y)=(1-y)^nF_d\left(-{y\over4(1-y)}\right)
\]

is a linear combination of only the top three monic Jacobi polynomials:

\[
 {K_d\over\operatorname{lc}K_d}=p_n+A_dp_{n-1}+B_dp_{n-2}. \tag{546}
\]

Here is a short reason that no lower term occurs.  Conjugation sends
`tD_t` to `T=y(1-y)D_y+ny`.  The operator in (544) is quadratic in `T`.
Its formal adjoint in the Jacobi weight
`y^alpha(1-y)^beta` raises degree by at most two.  Therefore (546) is
orthogonal to every polynomial of degree at most `n-3`.  Boundary terms
vanish because `alpha>=0` and `beta>-1`.

Let `b_(n-1)>0` be the last subdiagonal coefficient in the monic Jacobi
recurrence for `p_n`.  A leading-coefficient calculation in the same
adjoint identity gives

\[
 {B_d\over b_{n-1}}=
 \begin{cases}
 { (3n-5)(4n-5)(6n-11)
  \over3(n-1)(2n-3)(12n-19)},&d=2n,\\[6pt]
 { (3n-4)(4n-3)(6n-7)
  \over3(n-1)(2n-1)(12n-13)},&d=2n+1.
 \end{cases}                                                \tag{547}
\]

The positive slack from one is respectively

\[
 {2(3n-4)(8n-13)\over3(n-1)(2n-3)(12n-19)},\qquad
 {(6n-5)(8n-9)\over3(n-1)(2n-1)(12n-13)}.                  \tag{548}
\]

Consequently `0<B_d<b_(n-1)`.  By the monic recurrence, (546) can be
rewritten as

\[
 K_d/\operatorname{lc}K_d
 =(y-a_{n-1}+A_d)p_{n-1}-(b_{n-1}-B_d)p_{n-2}.
\]

This is the characteristic polynomial of a real symmetric Jacobi matrix:
only its final diagonal and final off-diagonal have changed, and the latter
is `sqrt(b_(n-1)-B_d)`.  Hence every zero of `K_d`, and therefore every zero
of `F_d`, is real.  The strict positivity following (545) forces all zeros
of `F_d` to be negative.  Finally
`Q_(d,d-5)=(1+z)^dF_d(z/(1+z)^2)` has only negative zeros (with the expected
extra root `-1` in odd degree).

The rest of the cone follows without another root argument.  Directly from
(541), up to a positive scalar,

\[
 \boxed{Q_{d,r-1}=(E+r)(d+r-E)Q_{d,r}.}                     \tag{549}
\]

Both first-order Euler multipliers preserve negative real-rootedness on
degree at most `d`.  Iterating (549) from `r=d-5` proves the top homogeneous
component for every `0<=r<=d-5`, exactly `2d-N>=5`.

The replay `verify_group_top_homogeneous_cone.py` checks (541)--(545), the
top-three Jacobi expansion, exact negative root counts for all `5<=d<=50`,
and 325 instances of (549).  Its report is
`group_top_homogeneous_cone_20260804.json`.  Equations (542)--(549), rather
than that finite range, are the proof.  This closes a necessary all-order
piece of (535); the remaining step is compatibility/interlacing of the lower
homogeneous layers, not the top layer itself.

## 89. The second-highest homogeneous layer is also proved on the full cone

The Jacobi-matrix argument is not confined to the leading row.  Let
`r=N-d>=1`, put

\[
 p=d+1,\qquad \alpha=r-1,
\]

and remove the forced monomial `z^alpha` from the row polynomial of total
degree `2N-d-1`.  Up to a positive scalar, the remaining degree-`p`
polynomial is

\[
 Q^{(1)}_{N,d}(z)=\sum_{j=0}^{p}{p+2\alpha\choose\alpha+j}
 c^{(1)}_jz^j,                                      \tag{550}
\]

where

\[
 c^{(1)}_j={p\choose j}
 -2{N-2\over N-1}{p-2\choose j-1}
 +{N-3\over N-1}{p-4\choose j-2}.                  \tag{551}
\]

This formula follows directly from the defect-one input layer.  For the
scaled seed `P_M=M!g_M`, that layer is

\[
 2M(M-1)(X+Y)(XY)^{M-1}.
\]

Moreover,

\[
 S^k\{(X+Y)(XY)^M\}
\]

has row coefficient proportional to a single Pascal entry of order `k+1`.
The three state sizes `N,N-1,N-2` therefore give (551); their common
factorial ratios are respectively
`1,-2(N-2)/(N-1),(N-3)/(N-1)`.  Thus (550) is an
all-order coefficient identity, not a guessed fit.

Let

\[
 Q^0_{p,\alpha}(z)=\sum_{j=0}^{p}{p\choose j}
 {p+2\alpha\choose\alpha+j}z^j,
 \qquad \Lambda=E(p-E).
\]

Then (551) is equivalently

\[
 Q^{(1)}_{N,d}=\left\{1-
 {2(N-2)\Lambda\over(N-1)p(p-1)}+
 { (N-3)\Lambda(\Lambda-p+1)
  \over(N-1)p(p-1)(p-2)(p-3)}\right\}Q^0_{p,\alpha}. \tag{552}
\]

The same quadratic transformation as in (543) gives

\[
 Q^0_{p,\alpha}=C(1+z)^pF^0(t),\qquad
 F^0(t)={}_2F_1\left(-{p\over2},{1-p\over2};\alpha+1;4t\right).
\]

Here `p+alpha=N`.  The hypergeometric differential equation now gives the
general conjugation identities

\[
 \Lambda F^0=N t(F^0)',\qquad
 \Lambda(\Lambda-p+1)F^0=N(N-1)t^2(F^0)''.         \tag{553}
\]

Consequently the gamma polynomial of (550) is

\[
 F=F^0-A t(F^0)'+B t^2(F^0)'',                    \tag{554}
\]

with

\[
 A={2N(N-2)\over(N-1)p(p-1)},\qquad
 B={N(N-3)\over p(p-1)(p-2)(p-3)}.                \tag{555}
\]

Thus its `k`th coefficient is the corresponding positive coefficient of
`F^0` times `rho_k=1-Ak+Bk(k-1)`.  These multipliers decrease through
`0<=k<=n=floor(p/2)` in the cone `alpha<=p-7`, and their last value is
positive.  One manifest certificate is obtained by writing
`q=p-7-alpha>=0`.  After clearing positive denominators, the even-`p` last
value has numerator

\[
 12\alpha^2+2\alpha q^2+28\alpha q+96\alpha
 +q^3+17q^2+98q+184,
\]

and the odd-`p` numerator is

\[
 12\alpha^2+2\alpha q^2+36\alpha q+136\alpha
 +q^3+21q^2+142q+308.                              \tag{556}
\]

Hence `F` has strictly positive coefficients.

For real-rootedness, set

\[
 \beta=-1/2\ (p=2n),\qquad \beta=+1/2\ (p=2n+1).
\]

The transform `K(y)=(1-y)^nF(-y/(4(1-y)))` is again a quadratic differential
image of `P_n^(alpha,beta)(1-2y)`.  The adjoint argument from Section 88
shows

\[
 K/\operatorname{lc}K=p_n+A_1p_{n-1}+B_1p_{n-2}.  \tag{557}
\]

If `b_(n-1)` is the last monic Jacobi recurrence coefficient, the same norm
calculation gives `B_1/b_(n-1)>0`.  Its strict upper bound has a particularly
clean certificate.  After putting `q=p-7-alpha` and clearing the positive
parity-dependent denominator, the numerator of
`1-B_1/b_(n-1)` is

\[
\begin{split}
 \mathcal S(\alpha,q)={}&12\alpha^3q+48\alpha^3
 +20\alpha^2q^2+194\alpha^2q+458\alpha^2\\
 &+11\alpha q^3+171\alpha q^2+872\alpha q+1458\alpha\\
 &+2q^4+43q^3+343q^2+1200q+1552.
                                                               \tag{558}
\end{split}
\]

Every coefficient is positive.  Therefore
`0<B_1<b_(n-1)` in the entire cone, for both parities.  Equation (557) is
again the characteristic polynomial of a real symmetric tridiagonal matrix
with final coupling `sqrt(b_(n-1)-B_1)`.  All zeros of `K` and `F` are real;
coefficient positivity forces the zeros of `F` to be negative.  The inverse
gamma transform proves that the complete second-highest binary homogeneous
component is real stable.

The replay `verify_group_second_homogeneous_cone.py` checks (550)--(555)
against the full coefficient matrix, exact gamma identities, and exact
negative root counts in all 325 cells with `6<=d<=30` and
`1<=N-d<=d-5`.  Its report is
`group_second_homogeneous_cone_20260804.json`.  Sections 88--89 now prove the
top two homogeneous layers throughout (535).  What remains is an all-layer
version of the same Jacobi boundary modification, together with the
compatibility needed for the shared homogenizing variable.

## 90. Arbitrary upper layers have a finite-band Jacobi selector

The two preceding calculations are the first cases of an exact all-layer
identity.  Put `r=N-d`, let `s` be the deficit from the highest total degree,
and first assume that `0<=s<=r`.  Define

\[
 p=d+s,\qquad \alpha=r-s,\qquad \ell=p+2\alpha=2N-d-s.
\]

For the integer-scaled seed `P_M=M!g_M`, its coefficient at defect `i` is

\[
 u_{M,i}=(M)_i{2M-i-1\choose i}.
\]

Consequently the defect-`s` input layer is

\[
 H_{M,s}(X,Y)=\sum_{i=0}^s u_{M,i}u_{M,s-i}
                  X^{M-i}Y^{M-s+i}.                         \tag{559}
\]

Apply the three derivative orders `d,d-2,d-4` and cancel their common
falling-factorial scale.  After removing the forced factor `z^alpha`, the
binary row of total degree `ell` is, up to one positive scalar,

\[
 \boxed{
 Q^{(s)}_{N,d}(z)=\sum_{j=0}^p{\ell\choose\alpha+j}
 C^{(s)}_jz^j,}                                             \tag{560}
\]

where

\[
 \boxed{
 C^{(s)}_j=\sum_{q=0}^2(1,-2,1)_q\sum_{i=0}^s
 {2(N-q)-i-1\choose i}
 {2(N-q)-s+i-1\choose s-i}
 {d-2q\choose p-q-i-j}.}                                   \tag{561}
\]

Formula (561) is obtained by choosing
`p-q-i-j` of the `d-2q` derivatives on the first variable in the state
`M=N-q`; every remaining factorial is independent of `i` and cancels into
the common scale.  Thus (560)--(561) are all-order coefficient identities.

They also explain exactly why the Jacobi bandwidth grows with the layer.
Divide (561) by `{p\choose j}`.  The elementary binomial quotient is

\[
 {{p-s-2q\choose j+i-s-q}\over{p\choose j}}
 ={(j)_{s+q-i}(p-j)_{i+q}\over(p)_{s+2q}}.                  \tag{562}
\]

The inner sum is invariant under `j -> p-j`, by pairing `i` with `s-i`.
It is a polynomial in `j` of degree at most `s+2q`.  Every polynomial with
that reflection symmetry is a polynomial in

\[
 \lambda=j(p-j).
\]

It follows that there is an exact selector polynomial

\[
 \boxed{
 {C^{(s)}_j\over{p\choose j}}=R_{N,d,s}(j(p-j)),\qquad
 \deg R_{N,d,s}\le \left\lfloor{s\over2}\right\rfloor+2.} \tag{563}
\]

Equivalently, with `E=zD_z`, `Lambda=E(p-E)`, and

\[
 Q^0_{p,\alpha}(z)=\sum_{j=0}^p{p\choose j}
 {p+2\alpha\choose\alpha+j}z^j,
\]

we have

\[
 Q^{(s)}_{N,d}=R_{N,d,s}(\Lambda)Q^0_{p,\alpha}.             \tag{564}
\]

The gamma transform of the base is again

\[
 {}_2F_1(-p/2,(1-p)/2;\alpha+1;4t),
\]

and `p+alpha=N` for every layer.  Expanding the selector in the Newton basis

\[
 \Lambda(\Lambda-p+1)(\Lambda-2p+4)\cdots
 \{\Lambda-(k-1)(p-k+1)\}
\]

turns its `k`th term into `(N)_k t^kD_t^k` on this hypergeometric seed.
The Jacobi adjoint argument from Sections 88--89 therefore proves that the
transformed layer is a combination of at most

\[
 \boxed{\left\lfloor{s\over2}\right\rfloor+3}
\]

consecutive top Jacobi polynomials.  This finite-band theorem is all order.
It also shows why a fixed top-three or scalar continuant argument cannot
settle every layer: the necessary boundary rank genuinely grows with `s`.

The same identity covers every lower layer as well.  If `s>r`, put

\[
 k=s-r,
 \qquad p_-=N-k=2N-d-s,
 \qquad j=k+h.
\]

The formal row (560) has `k` zero coefficients at each end.  Removing those
zeros from the actual binary row and using

\[
 j(d+s-j)=kN+h(p_--h)
\]

gives

\[
 \boxed{
 \widetilde Q^{(s)}_{N,d}(z)=
 \sum_{h=0}^{p_-}{p_-\choose h}{p_-+2k\choose k+h}
 R_{N,d,s}\{kN+h(p_--h)\}z^h.}                    \tag{565}
\]

Thus every layer, above or below the middle, has the same Jacobi template:

\[
 \boxed{
 p_s=N-|r-s|,\qquad \alpha_s=|r-s|.}              \tag{566}
\]

For `s<=r` one removes the forced factor `z^(r-s)` and uses the selector
`R(lambda)`; for `s>r` there is no forced monomial and one uses the shifted
selector `R((s-r)N+lambda)`.  The base coefficients in both cases are

\[
 {p_s\choose h}{p_s+2\alpha_s\choose\alpha_s+h}.
\]

This proves the finite-band Jacobi description across the complete
homogeneous diamond `0<=s<=2N-d`, including the constant terminal layer.

An exact discovery audit now supplies a strong additional compatibility
signal.  In all 552 layers of the complete diamonds with `5<=d<=12` and
`0<=r<=d-5`, formulas (560) and (565) agree with the full group coefficient
matrix; every selector respects the bound (563), every Jacobi expansion has
the predicted consecutive finite support, and every residual row has only
negative real zeros.  More importantly, all 516 adjacent residual rows
strictly interlace.  Replacing numerical root comparison by the exact
Bezoutian

\[
 {Q^{(s+1)}(x)Q^{(s)}(y)-Q^{(s+1)}(y)Q^{(s)}(x)\over x-y}
                                                                    \tag{567}
\]

gives 516 positive-definite integer matrices throughout the same complete
diamonds (sizes through 19); every one is also entrywise positive.
Sylvester's criterion makes each recorded interlacing certificate exact.
As an additional structural probe, every one of 4,153,899 square minors in
17 initial Bezout matrices (sizes through 11) is strictly positive.  The
replays are
`verify_group_general_homogeneous_layers.py`,
`group_general_homogeneous_layers_20260804.json`,
`verify_group_adjacent_layer_bezout.py`, and
`group_adjacent_layer_bezout_20260804.json`; the total-positivity probe is
`probe_group_adjacent_bezout_total_positivity.py` with report
`group_adjacent_layer_bezout_tp_probe_20260804.json`.

The finite Bezout audit is not yet the missing theorem.  The new sharp target
is to factor (567), uniformly in `N,d,s`, as a positive Gram matrix (or a
planar-network product).  Such a factorization would prove every adjacent
layer interlacing at once.  A further global compatibility argument would
still be required to combine all powers of the homogenizing variable:
pairwise interlacing alone is not being assumed sufficient.  Nevertheless
(559)--(566) replace the former guessed pattern by an exact complete-diamond
finite-band Jacobi theorem and isolate its remaining positivity problem as
one explicit family of Bezout matrices.

## 91. A single spectral determinant and the quadrature bridge identity

The mixed-characteristic representation (529) can be compressed to one
Hermitian determinant.  Define the commonly normalized consecutive seeds

\[
 p=N!g_N,\qquad q=N!g_{N-1},\qquad r=N!g_{N-2}.
\]

Then `p` is monic, while the leading coefficients of `q,r` are respectively
`N` and `N(N-1)`, and

\[
 N!\Phi_N(X;z_1,z_2)=p(X)+q(X)(z_1+z_2)+r(X)z_1z_2.          \tag{568}
\]

The already proved stability of `Phi_N` gives two facts.  First,
`p+zq` is stable, so `q/p` has a partial-fraction expansion

\[
 {q(X)\over p(X)}=\sum_{j=1}^N{w_j\over X-\lambda_j},
 \qquad w_j\ge0,qquad \sum_jw_j=N,                         \tag{569}
\]

where the zeros `lambda_j` of `p` are nonpositive.  Second, the Rayleigh
difference

\[
 H(X)=q(X)^2-p(X)r(X)
\]

is nonnegative for every real `X`.  Hence scalar spectral factorization gives
a degree-`N-1` complex polynomial `b` such that

\[
 H=b\overline b.
\]

At a zero `lambda_j` of `p`, this identity says
`|b(lambda_j)|=|q(lambda_j)|`.  Choose phases
`theta_j=b(lambda_j)/q(lambda_j)` whenever the denominator is nonzero and
arbitrary unit phases at common zeros.  Put

\[
 A=\operatorname{diag}(-\lambda_1,\ldots,-\lambda_N),\qquad
 u_j=\sqrt{w_j},\qquad v_j=\sqrt{w_j}\theta_j.
\]

Then `A>=0`, `||u||^2=||v||^2=N`, and partial-fraction interpolation gives

\[
 p\,u^*(XI+A)^{-1}u=q,
 \qquad p\,u^*(XI+A)^{-1}v=b.
\]

The rank-two matrix determinant lemma now proves the exact representation

\[
 \boxed{
 N!\Phi_N(X;z_1,z_2)=
 \det\{XI_N+A+z_1uu^*+z_2vv^*\}.}                          \tag{570}
\]

Repeated roots follow by a coefficientwise perturbation and limit.  Thus the
path/Wishart mixture was not an obstruction to a single determinant: the
Rayleigh difference supplies precisely the missing relative phases.

There is also an exact determinant identity for the two matched
contractions.  Let `M_X,M_Y` be arbitrary Hermitian pencils and let
`E_i=a_ia_i^*`, `F_i=b_ib_i^*` be two rank-one endpoint directions in the
two blocks; the vectors for different `i` need not be orthogonal.  Put

\[
 K_i(\theta_i)=
 \begin{pmatrix}0&\theta_i a_ib_i^*\\
 \overline{\theta_i}b_ia_i^*&0\end{pmatrix},
 \qquad B_i=I+{1\over\sqrt2}K_i(\theta_i),
 \qquad \theta_1=1,\quad\theta_2=i.                         \tag{571}
\]

At the block diagonal pencil `M_X direct-sum M_Y`, expand
`D_(B_1)^2D_(B_2)^2`.  An odd number of off-diagonal derivatives vanishes.
Two equal bridge derivatives give

\[
 D_{K_i}^2\det(M_X\oplus M_Y)
 =-2(D_{E_i}\det M_X)(D_{F_i}\det M_Y).
\]

The only unwanted even term uses one derivative from each bridge.  It is
proportional to `Re(theta_1 overline(theta_2))` and is therefore zero.  Four
bridge derivatives give four times the product of the two double-endpoint
minors.  Consequently

\[
 \boxed{
 D_{B_1}^2D_{B_2}^2\det(M_X\oplus M_Y)
 =(S^2-D_{E_1}D_{F_1})(S^2-D_{E_2}D_{F_2})
   \{\det M_X\det M_Y\}.}                                  \tag{572}
\]

This is an all-size minor-expansion identity.  The relative phase `i` is
essential beyond the saturated `2 by 2` case: equal real phases leave a
nonzero cross-cycle term.

Combining (520), (570), and (572) yields the sharpest single-object reduction
so far.  With the two copies of the spectral data in (570),

\[
 \boxed{
 (N!)^2G_{N,d}=
 D_I^{d-4}D_{B_1}^2D_{B_2}^2
 \det\{(XI_N+A)\oplus(YI_N+A)\}.}                           \tag{573}
\]

No without-replacement normalization remains in (573).  The remaining issue
is geometric rather than combinatorial.  On the two-dimensional bridge
subspace, each `B_i` has eigenvalues

\[
 1+{N\over\sqrt2},\qquad 1-{N\over\sqrt2},                 \tag{574}
\]

and equals the identity elsewhere.  Thus it has one negative eigenvalue for
`N>=2`, so ordinary PSD directional-derivative closure does not prove (573)
stable.  The exact target is now an indefinite mixed-discriminant theorem for
two quadrature rank-one bridges after `d-4` identity derivatives.  The
observed cone `2d-N>=5` is the candidate range for that theorem.

The spectral prerequisites are replayed exactly through `N=30` by
`verify_defect1_phi_spectral_determinant.py`, with report
`defect1_phi_spectral_determinant_20260804.json`.  The quadrature identity is
checked symbolically for generic `2 by 2` pencils and exactly on larger
generic matrices, including nonorthogonal endpoint vectors, by
`probe_two_endpoint_psd_lift.py` and
`two_endpoint_psd_lift_probe_20260804.json`.  Those finite checks audit the
formulas; the proofs are the Rayleigh spectral factorization and the bridge
minor expansion above.

## 92. Exact generic obstructions, the positive diagonal kernel, and a TN triangle

The determinant reduction (573) does not extend to an arbitrary two-slot
determinant, even after imposing the Gram normalization of the actual
endpoint vectors.  Exact Sturm restrictions give the following successive
counterexamples.

* Allowing unequal one-slot polynomials already fails at `N=d=5`.
* Equal one-slot polynomials alone fails at `N=7,d=6`.
* Imposing `||u||^2=||v||^2=N` and `|u^*v|^2=N` still fails for geometric
  spectra.  A concentrated example at `N=8,d=7` has maximum atom `3` and a
  degree-nine restriction with only seven real roots.
* Even the uniform bound `w_i<=27/10` is insufficient: another exact
  `N=8,d=7` geometric-spectrum example has a degree-nine restriction with
  only seven real roots.

Thus neither inertia, the endpoint Gram matrix, nor a uniform residue cap can
be the missing hypothesis.  The theorem must retain the alignment between
the roots, residues, and phases of the consecutive special polynomials
`g_N,g_(N-1),g_(N-2)`.  The mixed exterior-power tensor of the five directions
in (573) is likewise indefinite already at `N=d=5`, and the natural
principal-minor selector has negative coefficients inside the cone.  These
facts rule out the generic compound-PSD and strongly-Rayleigh-selector
shortcuts.

For orientation, if `lambda_i` are the nonzero roots of `p_N=N!g_N`, the
positive residues are

\[
 w_i={N p_{N-1}(\lambda_i)\over p_N'(\lambda_i)}.             \tag{575}
\]

An exact-polynomial/high-precision root-difference profile through `N=80`
finds `sum_i w_i=N`, monotone weights from the most negative root toward the
origin, and maximum `2.71578717708` at `N=80`, apparently tending to `e`.
This is discovery evidence only; more importantly, the `27/10`
counterexample proves that a bound of this kind cannot by itself close the
argument.  The replay is `analyze_defect1_spectral_weights.py` with report
`defect1_spectral_weight_profile_20260804.json`; the exact generic failures
are in the size-specific reports emitted by
`probe_generic_determinant_two_slot_cone.py`.

There is a useful all-order generating identity which keeps the special
alignment.  Put

\[
 \phi(u)={u\over(1-u)^2},\qquad
 E_X(u)=e^{X\phi(u)},\qquad
 L=\phi(u)+\phi(v).
\]

Since `[u^N]E_X(u)=g_N(X)`, shifting the two seed indices and replacing each
`S` derivative by multiplication by `L` gives

\[
 \boxed{
 G_{N,d}=[u^Nv^N]E_X(u)E_Y(v)L^{d-4}(L^2-uv)^2.}              \tag{576}
\]

The kernel in (576) is coefficientwise nonnegative.  Indeed,

\[
 L^2-uv=\phi(u)^2+\phi(v)^2
 +uv\left\{{2\over(1-u)^2(1-v)^2}-1\right\},                 \tag{577}
\]

and every Taylor coefficient on the right is nonnegative.  Formula (576)
is the generating-series version of the nested Catalan square (491), but it
has the advantage of displaying an ordinary positive convolution of the
special seed sequence.  `verify_group_diagonal_kernel_identity.py` replays
21 symbolic target identities and the positive kernel truncations through
order 20; the proof is the formal coefficient shift above.

The positive convolution has a striking finite total-positivity shadow.
For fixed `(N,d)`, arrange the coefficient diagonals of `G_(N,d)` by
increasing total degree, putting

\[
 \mathcal T_{t,a}=[X^aY^{t-a}]G_{N,d}.                         \tag{578}
\]

Every one of the 182,528 square minors in the six complete small matrices
through `N=8` is nonnegative.  Bounded-order exact audits in larger matrices
are equally clean.  However the same triangular total nonnegativity persists
below `2d-N=5`, where exact line counterexamples to real stability are known.
It can therefore explain coefficient positivity and the exceptionally rigid
homogeneous layers, but it is not by itself the missing global compatibility
theorem.  The exhaustive replay is
`probe_group_coefficient_triangle_tn.py` with report
`group_coefficient_triangle_tn_exhaustive_small_20260804.json`.

The sharp remaining route is consequently slot-preserving rather than
generic spectral.  In (529) the two endpoint states occupy distinct labeled
mixed-characteristic slots; collapsing those slots produces the norm-`N`
indefinite bridges in (571).  A successful ordered-partition or planar-network
composition must apply the phase-quadrature cancellation before that collapse,
so that the local endpoint bridges remain positive and the
without-replacement exclusion is retained.  Equivalently, one may factor the
all-order adjacent Bezout family (567) and then prove the additional global
compatibility not supplied by (578).  No claim of completion is made here.

## 93. Phase audit and quadratic-exponential coordinates

The written normalization in the first version of (576) contained an
incorrect factor `(1-u)^2`.  The seed generating function is
`E_X(u)=exp(Xu/(1-u)^2)`, as now displayed above.  The diagonal-kernel replay
already used the correct shifted seed coefficients; its statement and report
have been corrected and rerun.

At `(N,d)=(7,7)`, all 32 scalar spectral factors of the actual
`H=q^2-pr` give negative coefficients in the proposed principal-minor
selector.  The best normalized minimum is about `-0.1090973902941`, with 46
negative coefficients.  Thus changing the spectral phase does not rescue
that selector.  This is now a certified finite obstruction: 384-bit Arb root
balls and outward-rounded interval arithmetic isolate a strictly negative
witness for every factor choice.  The replay is
`certify_actual_spectral_selector_n7.py` with report
`actual_spectral_selector_n7_arb_certificate_20260804.json`.

The changes `u=t/(1+t)`, `v=s/(1+s)` give the exact alternative form

`G_(N,d)=[t^N s^N](1+t)^(N-3)(1+s)^(N-3)`

`            * exp(Xt(1+t)+Ys(1+s)) L^(d-4) M^2`,

with `L=t(1+t)+s(1+s)` and `M=(1+t)(1+s)L^2-ts`.  All finite factors are
coefficientwise nonnegative for `N>=3`.  However

`M(t,t)=t^2(2t^2+4t+1)(2t^2+4t+3)`,

so the negative discriminant of the last factor rules out a direct stable
factor proof.  Exact normalization and target comparisons are in
`verify_group_quadratic_exponential_kernel.py` and
`group_quadratic_exponential_kernel_20260804.json`.  The combined audit is
`ROOTED_PHASE_SPECTRAL_SELECTOR_AND_QUADRATIC_KERNEL_AUDIT_2026-08-04.md`.

## 94. Generalized-bottom decomposition of the quadratic kernel

For the coefficient extractor `B_N` in Section 93, expand the outer copy of
`M` and set `C_(i,j)=B_N[t^i s^j L^(d-4)M]`.  With the generalized seed

`g_(n,e)(X)=sum_a binom(n+a-e,n-a)X^a/a!`,

one has exactly

`C_(i,j)=S^(d-2)(g_(N-i,2-i) tensor g_(N-j,2-j))`

`          -S^(d-4)(g_(N-i-1,2-i) tensor g_(N-j-1,2-j))`.

Also `D^h g_(n,e)=g_(n-h,e-2h)`.  Hence every outer-kernel piece is a
generalized one-step bottom target, and the odd diagonal pieces `(1,1)` and
`(3,3)` are derivative images of the proved defect-three bottom theorem.

The coefficient matrix of `M` has rank four and becomes TN after reversing
the second index.  An explicit `6 by 4` times `4 by 6` TN factorization and
all its minors are certified by
`verify_quadratic_component_bottom_decomposition.py`; its report checks 189
component identities and 1,341 minors exactly.

In five cells inside the proposed cone, 105 components pass 8,400 exact line
tests.  Below the cone, 38 of 84 components have exact failures.  Adjacent
component pencils at the first endpoint are clean in the two increasing
original-index directions, but that order conflicts with the one-index
reversal needed to make the outer coefficient matrix TN: three adjacent
column pencils fail in the TN-compatible order (and four row pencils fail if
the other index is reversed).  The full two-marker parent and both one-marker
parents also fail exact line tests.  Therefore the remaining route is a
mixed-defect generalized-bottom theorem plus a genuinely apolar/exterior
fixed-value anti-TN composition, not an ordinary ordered-chain or
marker-parent stability argument.  Details and report names are in
`ROOTED_PHASE_SPECTRAL_SELECTOR_AND_QUADRATIC_KERNEL_AUDIT_2026-08-04.md`.

The degree-one multiaffine marker encoding does not restore the exterior-
algebra shortcut.  At `N=d=7`, the full bilinear parent
`sum C_(i,j)z_iw_j` has an exact degree-nine line with only seven real roots,
and a fixed-column linear parent has an exact degree-eight line with only six
real roots.  These are replayed by
`probe_quadratic_component_multiaffine_parent.py` and
`quadratic_component_multiaffine_parent_n7_20260804.json`.  Hence the adjacent
natural-index screens do not extend to a common stable family, and Purbhoo's
TN exterior action cannot be invoked on this naive parent.  A successful
exterior proof would have to realize the particular final contraction through
a different stable lift.

## 95. Square-root lowering collapses all components to one bottom member

The mixed-defect description in Section 94 can be compressed to one formal
operator identity.  Define the delta-series

\[
 \mathcal R(D)={\sqrt{1+4D}-1\over2}.
\]

It satisfies

\[
 D=\mathcal R(1+\mathcal R),\qquad
 \Phi(D)={\mathcal R\over1+\mathcal R}.                    \tag{579}
\]

The generalized seed has the coefficient representation

\[
 g_{n,e}(X)=[z^n](1-z)^{e-1}
             \exp\left\{{Xz\over(1-z)^2}\right\}.
\]

Since `D_X` acts as multiplication by `z/(1-z)^2`, equation (579) says that
`mathcal R(D_X)` acts as multiplication by `z/(1-z)`.  Therefore, for every
nonnegative integer `k`,

\[
 \boxed{\mathcal R(D)^k g_{n,e}=g_{n-k,e-k}.}               \tag{580}
\]

Let

\[
 F=F_{N+1,d-2}
 =S^{d-2}(g_{N+1,3}\otimes g_{N+1,3})
  -S^{d-4}(g_{N,3}\otimes g_{N,3}),
\]

which belongs to the already-proved bottom family.  The component formula of
Section 94 and (580) now give, without parity cases,

\[
 \boxed{C_{i,j}=\mathcal R_X^{,i+1}\mathcal R_Y^{,j+1}F.} \tag{581}
\]

Summing (581) with the coefficient matrix of `M` gives

\[
 \boxed{G_{N,d}=\mathcal R_X\mathcal R_Y
                   M(\mathcal R_X,\mathcal R_Y)F.}           \tag{582}
\]

Finally, because `D_X=mathcal R_X(1+mathcal R_X)` and similarly in `Y`, the
definition of `M` reduces (582) to the two-term operator identity

\[
 \boxed{
 G_{N,d}=\left\{D_XD_Y(D_X+D_Y)^2
                 -\mathcal R_X^2\mathcal R_Y^2\right\}
          F_{N+1,d-2}.}                                     \tag{583}
\]

Equations (579)--(583) are formal all-order identities.  The independent
replay `verify_quadratic_component_square_root_lowering.py` checks 88 seed
instances, all 189 component instances from the earlier audit, nine complete
group comparisons, and nine compact-operator comparisons; its report is
`quadratic_component_square_root_lowering_20260804.json`.

This removes the need to prove 21 unrelated mixed-defect statements.  The
sharp group obligation is now: prove that the particular operator in (583)
preserves stability on this threshold subfamily of the solved bottom cone.
It is not a generic stability preserver.  The root-independent symmetric
multiaffine polarization of the universal bottom coefficient kernel already
has, at size seven and order five, an exact degree-fourteen affine restriction
with only six real roots.  This obstruction is replayed by
`probe_universal_bottom_polarization.py` and
`universal_bottom_polarization_n7_d5_20260804.json`; the special seed/network
geometry must remain in any proof of (583).

As a larger finite control, every one of the 84 components at the true group
endpoints `(N,d)=(13,11),(16,13),(19,15),(22,17)` passed 25 exact affine-line
tests, 2,100 restrictions in total.  The report is
`quadratic_kernel_monomial_components_true_endpoints_m3to6_20260804.json`.
These tests support (583) but are not its proof.

## 96. Equal-direction hyperbolicity reduction and positive Hermite certificates

There is a sharper way to formulate the remaining bivariate stability
obligation.  Theorem 7 of Raghavendra--Ryder--Srivastava, *Real Stability
Testing* (ITCS 2017, DOI `10.4230/LIPIcs.ITCS.2017.5`), says that a nonzero
bivariate polynomial `P` of total degree `n` is real stable if and only if

1. `t -> P(gamma+t,t)` is real-rooted for every real `gamma`; and
2. its degree-`n` homogenization is strictly positive at `(t,1-t,0)` for
   every `0<t<1`.

The second condition is already proved for the group cone: it is exactly
strict positivity of the top homogeneous component on the positive
projective interval, supplied by Section 88.  Hence the full group endpoint
is equivalent to the single one-parameter assertion

\[
 \boxed{t\longmapsto G_{N,d}(\gamma+t,t)
        \text{ is real-rooted for every }\gamma\in\mathbb R.}       \tag{584}
\]

This is much weaker than controlling every positive-direction affine line.
Because `G` is symmetric, center the line by putting

\[
 Q_{N,d}(x,c)=G_{N,d}(x+c,x-c),\qquad a=c^2.                        \tag{585}
\]

Every coefficient of `Q` is an even polynomial in `c`, hence a polynomial
in `a`.  Its degree in `x` is `n=2N-d`, and its leading coefficient is a
positive constant.  Let `s_j(a)` be the Newton power sums of its formal
roots and put

\[
 H_n(a)=(s_{i+j}(a))_{0\le i,j<n},\qquad
 \Delta_k(a)=\det(s_{i+j}(a))_{0\le i,j<k}.                       \tag{586}
\]

By Sylvester's Hermite-matrix theorem, `Q(.,c)` has only real roots if and
only if `H_n(c^2)` is positive semidefinite.  Thus the elementary sufficient
certificate

\[
 \boxed{\Delta_k(a)\text{ has strictly positive coefficients for every }
        1\le k\le n}                                             \tag{587}
\]

proves (584), because Sylvester's criterion then makes `H_n(a)` positive
definite for every `a>=0`.

Exact computation gives a strikingly clean finite signal.  At the first
six true endpoints

\[
 (N,d)=(4,5),(7,7),(10,9),(13,11),(16,13),(19,15),
\]

all `3+7+11+15+19+23=78` polynomials `Delta_k(a)` have strictly positive
rational coefficients.  The full discriminants are dense, with respective
degrees `3,21,55,103,165,241`; the largest audited certificate therefore has
`242` positive terms.  These degrees obey the observed formula
`binom(4m+3,2)-(m-1)(m-2)`, whose deficit from the generic discriminant
degree agrees with the repeated top-layer slopes `+1,-1`.
At `(N,d)=(7,5)`, below the cone, the pattern fails exactly where it should:
`Delta_6,\ldots,Delta_9` acquire negative coefficients and positive real
zeros (the first is near `a=41245.167`).  Hence (587) is not a generic
artifact of symmetry or of the positive coefficient triangle; it detects
the real-stability threshold.

The replay is `probe_group_equal_direction_subdiscriminants.py`, with report
`group_equal_direction_subdiscriminants_20260804.json`.  The one-parameter
reduction and Hermite criterion are theorems; the six-endpoint positivity
audit is finite evidence.  The new sharp proof target is an all-order
coefficient-positive factorization of the Hermite minors in (586), or a
single Gram/network factorization of `H_n(a)` valid for `a>=0`.  Such a
factorization, together with Section 88, would close the entire group lemma
without a generic stability-preserver theorem for (583).

## 97. Discriminant continuation, local Bezout certificates, and exact controls

The Hermite formulation admits a useful topological reduction which is
strictly smaller than (587).  The leading coefficient of `Q_(N,d)(x,c)` in
`x` is a positive constant.  Therefore it is enough to prove

1. `Q_(N,d)(x,0)` has distinct real roots; and
2. `Disc_x Q_(N,d)(x,c)` is nonzero for every real `c`.

Indeed, the roots vary continuously with `c`, and a conjugate pair cannot
leave the real axis without first colliding.  Since the discriminant is an
even polynomial in `c`, the finite certificate in Section 96 proves item 2
at the first six endpoints by the stronger statement that every coefficient
of `Disc_x Q` as a polynomial in `a=c^2` is positive.  Thus the all-order
target can be reduced to the diagonal base plus **one** positive polynomial
per endpoint; positivity of every lower Hermite minor is sufficient but is
not necessary.

There is a complementary local certificate.  Put

`q_gamma(t)=G_(N,d)(t+gamma,t)`

and let `B_gamma` be the coefficient matrix of

`(q_gamma(x)q_gamma'(y)-q_gamma(y)q_gamma'(x))/(x-y)`.

The matrix is positive definite exactly when `q_gamma` has distinct real
roots.  Its entries are coefficientwise nonnegative in `gamma` in all cases
tested.  At the first nine true endpoints

`(4,5),(7,7),(10,9),(13,11),(16,13),(19,15),(22,17),(25,19),(28,21)`

every leading principal minor is coefficientwise nonnegative with positive
constant term.  This comprises complete exact certificates of sizes
`3,7,11,15,19,23,27,31,35`.  In particular, the last three determinants for
`(19,15)`, formerly stalled in the separate symbolic run, pass at sizes
21--23; the fraction-free run then passes all 27 sizes at `(22,17)` and all
31 sizes at `(25,19)`, followed by all 35 sizes at `(28,21)`.
Together with the already-proved top homogeneous condition and the symmetry
between positive and negative `gamma`, this is a rigorous finite proof of
the bivariate group target through the ninth endpoint, not merely a line
screen.  By contrast, the false neighboring case `(7,5)` passes
sizes one through four and then acquires negative coefficients at sizes five
through nine.  The local distinction is in fact stronger than the former
solid-minor sample: every one of the `3,431` nonempty square minors of the
`7 by 7` true Bezout matrix is a nonzero polynomial with coefficientwise
nonnegative coefficients.  In the false `9 by 9` control, the first
coefficientwise obstruction already occurs at order four, for rows
`(0,2,3,4)` and columns `(1,2,3,4)`; its degree-44 determinant has minimum
coefficient
`-5011/140981608539995347353600000000`.  Thus complete coefficientwise total
positivity is sensitive to the proposed cone rather than being an automatic
feature of this Bezout basis.  These observations make a planar-network or
Neville-elimination factorization of the true Bezout family a concrete
all-order target.  They are finite evidence, not yet such a factorization.
The complete minor replays are
`equal_direction_bezout_flint_tp_N7_d7_20260804.json` and
`equal_direction_bezout_flint_tp_control_N7_d5_20260804.json`; the original
leading-minor replay is
`probe_equal_direction_bezout_certificate.py`.  The faster independent
replay `certify_equal_direction_bezout_flint_bareiss.py` performs one exact
Bareiss elimination over `QQ[gamma]` and records every leading determinant;
its complete reports are
`equal_direction_bezout_flint_N19_d15_20260804.json` and
`equal_direction_bezout_flint_N22_d17_20260804.json`, and
`equal_direction_bezout_flint_N25_d19_20260804.json`, and
`equal_direction_bezout_flint_N28_d21_20260804.json`.

The complete-minor signal persists at the next endpoint: every one of the
`705,431` nonempty square minors of the `11 by 11` matrix for `(10,9)` is a
nonzero polynomial with coefficientwise nonnegative coefficients.  More
importantly for a prospective Neville factorization, all `40,950` solid
minors across the nine endpoint matrices of sizes
`3,7,11,15,19,23,27,31,35` are strictly positive for every `gamma>=0`.  At
the first five sizes this follows coefficientwise.  At sizes 23, 27, 31,
and 35, respectively 4, 6, 12, and 12 high-order solid minors have some
negative monomial coefficients.  Each exceptional determinant is nevertheless certified
positive on the full nonnegative axis: after compactifying
`gamma=u/(1-u)`, exact Bernstein subdivision gives nonnegative Bernstein
coefficients with positive interval endpoints.  Thus the easy
coefficientwise strengthening eventually fails, while the actual finite
solid-minor/Neville condition survives through the whole certified frontier.
The exceptions are maximally localized.  At every affected order they are
only the southeast off-diagonal solid block and its transpose: orders 17--18
at size 23, 18--20 at size 27, 19--24 at size 31, and 21--26 at size 35.
Hence the nontrivial
finite boundary has collapsed from thousands of determinants to one distinct
polynomial family per affected order; every other solid minor is
coefficientwise nonnegative.
The replays and reports are
`probe_equal_direction_bezout_flint_total_positivity.py`,
`equal_direction_bezout_flint_tp_N10_d9_20260804.json`,
`certify_equal_direction_bezout_flint_solid_minors.py`, and the reports
`equal_direction_bezout_flint_solid_axis_N19_d15_20260804.json`,
`equal_direction_bezout_flint_solid_axis_N22_d17_20260804.json`, and
`equal_direction_bezout_flint_solid_axis_N25_d19_20260804.json`, together
with `equal_direction_bezout_flint_solid_axis_locations_N28_d21_20260804.json`.
This is a complete finite planar-network signature through size 35, but an
all-order formula or induction for its positive Neville parameters is still
missing.

There is a decisive reduction inside that signature.  The Gasca--Pena
criterion says that an `n by n` real matrix is strictly totally positive if
and only if its `n^2` **initial minors** are positive: these are the solid
minors whose row interval or column interval begins at index zero.  Every
mixed-sign exception above lies at the opposite southeast corner and is
therefore noninitial.  Across the nine endpoint matrices, all `4,209`
initial minors are coefficientwise nonnegative in `gamma` and have positive
constant term; symmetry leaves only `2,190` distinct polynomial identities.
Consequently the Gasca--Pena theorem gives a second exact proof that each of
the nine finite Bezout matrices is strictly totally positive for every
`gamma>=0`.  The replay aggregate is
`aggregate_equal_direction_bezout_initial_certificate.py`, with report
`equal_direction_bezout_initial_nine_20260804.json`; positive constants at
`gamma=0` are independently checked by
`verify_equal_direction_bezout_solid_constants.py` and
`equal_direction_bezout_solid_constants_nine_20260804.json`.

The all-order network target is therefore smaller than the former
solid-minor conjecture:

> **Initial-Bezout lemma.**  For `N=3m+4`, `d=2m+5`, every initial minor of
> `Bez_t(G_(N,d)(t+gamma,t), partial_t G_(N,d)(t+gamma,t))` has
> coefficientwise nonnegative `gamma`-coefficients and positive constant
> term.

The Gasca--Pena criterion, symmetry in `gamma`, and the already-proved top
homogeneous condition would make this lemma sufficient for the full group
stability theorem.  It remains unproved uniformly in `m`.

Centering does not make the coefficient statement easier.  Although
`G(t+gamma,t)` is a positive translation of
`Q_c(x)=G(x+c,x-c)` with `c=gamma/2`, rewriting the centered Bezout matrix in
`a=c^2` destroys coefficientwise positivity already at `(7,7)`: only 4 of
49 entries are coefficientwise nonnegative, and the `(0,0)` entry has a
negative coefficient.  The exact all-minor replay is
`probe_centered_equal_direction_bezout_tp.py`, with report
`centered_equal_direction_bezout_tp_N7_d7_20260804.json`.  Thus the one-sided
shift/Pascal coordinate is an essential part of the candidate lemma rather
than cosmetic normalization.

The apparently related Pólya-frequency Toeplitz test requires an important
correction.  Positivity of the finite `(n+1) by (n+1)` principal Toeplitz
block is not the Aissen--Schoenberg--Whitney infinite Toeplitz criterion.
The false control `(N,d,gamma)=(7,5,64)` passes shifted solid Toeplitz minors
through order 192.  After multiplying its ascending coefficients by 10080,
they are

`[2918222361998592,1296964639886016,205496059271168,`
`16254891662464,736945199872,20375242160,349449072,3627904,20868,51]`.

The shifted solid minor of order 193 and shift six is negative.  Its absolute
determinant has 1417 decimal digits and SHA-256 digest
`752baf4ab83d3bb3d82a77090f68a8255b48b8230f4f1d4630988780054020f6`.
Thus the Toeplitz criterion is correct but hides the obstruction at an
impractically high order; the finite Bezout certificate detects it locally.

Two further exact structural facts guide the continuation.  If

`H_(N,c)=D_x^4(g_N(x+c)g_N(x-c))`
`        -2D_x^2(g_(N-1)(x+c)g_(N-1)(x-c))`
`        +g_(N-2)(x+c)g_(N-2)(x-c)`,

then `Q_(N,d)=D_x^(d-4)H_(N,c)`.  High-precision scans through `N=22` show
that `H_(N,c)` has at most four nonreal roots, uniformly over the tested
range of `c`; at large `c` it has exactly two conjugate pairs.  This is a
rank-four/quasi-Laguerre signal, but the bound alone does not imply that the
specified derivative is real-rooted.  Also, with
`Phi(D)=R(D)/(1+R(D))`, index shifting gives the all-order size recurrence

`Phi(D_X)^3 Phi(D_Y)^3 G_(N+3,d+2)=S^2G_(N,d)`.             (588)

At the endpoints, (588) links `m+1` to `m`.  Its inverse is a raising or
integration operator and is not presently known to preserve stability, so
this is an exact induction identity rather than a completed induction.

Several tempting strengthenings were checked and rejected exactly.  The
one-step inverse-Borel/matching preimage of the diagonal base is not
real-rooted (for `4<=N<=20` it has no real roots in the tested family).  A
fixed degree-lowering semigroup in `a=c^2` agrees at the first layer but fails
at the second for every nontrivial endpoint.  Scalar four-degree size
recurrences, a literal centered finite-free convolution, normalized marker
parents, and direct interlacing of the three derivative summands also fail.
Finally, the derivative-cone shortcut applied after the spectral collapse is
too weak: a bridge direction has eigenvalues
`1+N/sqrt(2),1-N/sqrt(2),1,...,1`, and its fourth elementary symmetric
function is already negative.  This confirms that a successful
mixed-characteristic proof must retain the labeled pre-collapse slots.

At that pre-collapse level, the raw coordinate-deletion operator has a
nonnegative homogeneous selector.  On `2N` coordinate variables with two
disjoint marked pairs it is

`d! e_d -(d-2)!(z_a z_b e_(d-2)+z_c z_e e_(d-2))`
`       +(d-4)!z_a z_b z_c z_e e_(d-4)`,

where each elementary symmetric polynomial omits the variables already
displayed.  Every subset weight is positive, and exact affine screens of its
five-variable partial diagonalization are clean in and below the proposed
cone.  The corresponding raw path-determinant group is likewise clean in the
tested cells.  This separates the two issues: endpoint exclusion itself has
a Strongly-Rayleigh-looking selector, while the factorial/Laguerre
normalization which changes the raw path determinant into `g_N` remains the
unresolved compatibility step.

## 98. A shared-variable square parent and a lower-tail homotopy

The diagonal base in Section 97 has a more structured stable-parent
candidate.  Polarize the two consecutive states as in (519), but use one
common spectral variable:

\[
 P_N(x;z_1,z_2,w_1,w_2)=
 (D_x^2-D_{z_1}D_{w_1})(D_x^2-D_{z_2}D_{w_2})
 \{\Phi_N(x;z_1,z_2)\Phi_N(x;w_1,w_2)\}.             \tag{589}
\]

Its marker-free specialization is exactly the diagonal source `H_(N,0)`.
The polynomial is symmetric separately in each marker pair, so Grace--Walsh
polarization reduces its stability to the trivariate diagonalization
`z_1=z_2=z`, `w_1=w_2=w`.  If

\[
 f_N(x,z)=g_N(x)+2zg_{N-1}(x)+z^2g_{N-2}(x)
          =[u^N](1+zu)^2e^{x\phi(u)},
\]

then the diagonalized operator is

\[
 D_x^4-\tfrac12D_x^2D_zD_w+\tfrac14D_z^2D_w^2.
\]

Direct coefficient extraction gives the exact square-kernel identity

\[
 \boxed{
 \bar P_N(x,z,w)=[u^Nv^N]e^{xL}
 \{L^2(1+zu)(1+wv)-uv\}^2,
 \qquad L=\phi(u)+\phi(v).}                         \tag{590}
\]

This is an all-order identity.  Exact rational line certification finds all
roots real in the shared-variable parent through `N=12`; apparent floating
point failures at the larger tested degrees were conditioning artifacts and
disappear under exact FLINT/Sturm certification.  The parent is not a generic
closure theorem: replacing the special seed by random stable determinant
models produces failures from degree three onward.  Thus (590), like (583),
must be proved from the special Sheffer/Chebyshev geometry.

There is a useful finite decomposition of the marker-free specialization.
In the quadratic coordinates of Section 94, write the first copy of

`M=(1+t)(1+s)(t(1+t)+s(1+s))^2-ts`

as the sum of its homogeneous parts `M_2+...+M_6`.  Let `A_r` be the
diagonal coefficient extraction with outer factor `M_r` and the second copy
of `M` intact, and set

\[
 T_r=A_r+A_{r+1}+\cdots+A_6.                         \tag{591}
\]

Then `T_2=H_(N,0)`.  Exact rational root isolation proves, at
`N=4,7,10,13,16,19,22`, that every `A_(r+1)` strictly interlaces `A_r` and
that the lower tail

\[
 T_6\prec T_5\prec T_4\prec T_3                         \tag{592}
\]

strictly interlaces.  The initially tempting final relation
`T_3\prec T_2` is false from `N=16` onward, even though `T_2` remains
real-rooted.  This exact obstruction prevents an illicit promotion of the
whole tail to a Sturm chain.

The failed last step has a sharper one-parameter repair.  Put

\[
 R_N(x,z)=T_3(x)+zA_2(x),\qquad 0\le z\le1.           \tag{593}
\]

At `z=0`, (592) supplies the real-rooted lower tail.  Because `A_2` has one
degree more than `T_3` and both leading coefficients are positive, the new
root enters from negative infinity for small positive `z`.  It therefore
suffices to show

\[
 \operatorname{Disc}_x R_N(x,z)>0\quad(0\le z\le1).   \tag{594}
\]

At the first eight endpoint sizes `N=4,7,10,13,16,19,22,25`, every exact Bernstein
coefficient on `[0,1]` of the discriminant in (594) is strictly positive.
The discriminant degrees are respectively `6,18,30,42,54,66,78,90`, so this checks
`7,19,31,43,55,67,79,91` exact inequalities.  Together with rational isolation for
(592), this is a rigorous finite proof that `H_(N,0)` is real-rooted at those
sizes.  It is not yet the all-order proof.  The replays are
`certify_diagonal_component_tail_sturm.py` and
`certify_diagonal_lower_tail_homotopy.py`, with the main, `N19`, `N22`, and `N25`
dated JSON reports.
The new diagonal target is the pair of all-order statements (592) and
Bernstein positivity in (594); it is materially smaller than all Hermite
minors and survives the exact `N=16` obstruction to the naive tail proof.

The Bernstein condition has an equivalent coefficient-positive form which
may be better suited to the Bezout machinery.  Put `z=t/(1+t)` and let
`n=deg H_(N,0)`.  Since `H_(N,0)=T_3+A_2`,

\[
 R_N\left(x,{t\over1+t}\right)
 ={T_3(x)+tH_{N,0}(x)\over1+t}.
\]

The discriminant is homogeneous of degree `2n-2` under scalar multiplication,
so

\[
 \boxed{(1+t)^{2n-2}
 \operatorname{Disc}_xR_N\left(x,{t\over1+t}\right)
 =\operatorname{Disc}_x\{T_3(x)+tH_{N,0}(x)\}.}       \tag{595}
\]

Consequently the positive Bernstein coefficients in (594) are, up to the
positive binomial normalizations, exactly the ordinary power coefficients of
the discriminant on the right of (595).  The diagonal target can therefore
be phrased as coefficientwise positivity of one Bezout determinant for the
positive pencil `T_3+tH`, closely paralleling the successful local
certificates in Section 97.

This parallel is already exact at the matrix level.  Every entry of
`Bez_x(T_3+tH,(T_3+tH)')` is coefficientwise positive through `N=13` (484
entries at the largest audited size).  Every leading and every solid minor is
coefficientwise nonnegative through the complete `16 by 16` case `N=10`, and
all 923 minors of the `6 by 6` case `N=5` pass.  The replay
`probe_diagonal_homotopy_bezout_total_positivity.py` records these exact
counts; the extended exact report is
`diagonal_homotopy_bezout_tp_N10_20260804.json`.  A coefficientwise
totally-nonnegative planar-network factorization
of this Bezout matrix would simultaneously prove the lower-tail homotopy and
its discriminant endpoint; finding that factorization is now the most local
version of the diagonal subproblem.

Finally, the current-literature audit remains consistent with the status of
the problem.  Grace M. X. Li's March 2026 preprint *Unimodality of
independence polynomials of two family of trees* (arXiv:2603.03025) proves
unimodality for the two previously known infinite non-log-concave tree
families by chromatic-symmetric-function and injection methods, but does not
prove the full Alavi--Malde--Schwenk--Erdos conjecture or the group endpoint
above.  A separate 2026 public exhaustive computation reports forests
through 29 vertices and structural reductions, again without a full proof.
Thus none of (589)--(594) duplicates a known resolution found in the updated
search, and the full conjecture remains open at the time of this note.

## 99. The raw two-pair deletion selector is Strongly Rayleigh

The positive selector left open at the end of Section 97 can be settled in
all orders.  Let `O={x_1,...,x_M}` be ordinary coordinate variables and let
`(a_1,a_2)` and `(b_1,b_2)` be the two marked pairs.  For `M>=4`, put

\[
\begin{split}
 \Sigma_M={}&24e_4(O,a_1,a_2,b_1,b_2)
 -2a_1a_2e_2(O,b_1,b_2)\\
 &-2b_1b_2e_2(O,a_1,a_2)+a_1a_2b_1b_2.             \tag{596}
\end{split}
\]

Every squarefree coefficient is positive: it is `24`, `22`, or `21`
according as the selected four-set completes zero, one, or two marked pairs.
The stronger fact is

\[
 \boxed{\Sigma_M\text{ is real stable for every }M\ge4.}       \tag{597}
\]

Here is a direct proof.  The polynomial is symmetric separately in the
ordinary block and in each marked pair.  Diagonalize those blocks to
`x_i=x`, `a_1=a_2=y`, `b_1=b_2=z`.  Polarization reduces (597) to stability
of

\[
\begin{split}
 S_M(x,y,z)={}&M(M-1)(M-2)(M-3)x^4\\
 &+8M(M-1)(M-2)x^3(y+z)\\
 &+M(M-1)x^2\{11(y+z)^2+26yz\}\\
 &+44Mxyz(y+z)+21y^2z^2.                              \tag{598}
\end{split}
\]

For real `y,z` with `s=y+z` nonzero, put `x=sa` and
`r=yz/s^2<=1/4`.  Apart from the positive factor `s^4`, (598) is the quartic

\[
 F_{M,r}(a)=Aa^4+Ba^3+M(M-1)(11+26r)a^2+44Mra+21r^2, \tag{599}
\]

where `A=M(M-1)(M-2)(M-3)` and
`B=8M(M-1)(M-2)`.  Its discriminant is

\[
 16M^3r^2(M-2)(M-1)^2E(M,r).                         \tag{600}
\]

After `M=n+4` and `q=1-4r`, the exact expansion of `E` has 35 terms and
every coefficient in `(n,q)` is strictly positive.  Thus (600) is positive
for `M>=4`, `r<=1/4`, `r!=0`.  At `r=0`, the two nonzero roots are real
because their quadratic discriminant is

`4M^2(M-2)(M-1)^2(5M+1)>0`.

The double zero splits into two real roots on both sides: after `a=rb`, the
limiting small-root quadratic has discriminant
`44M(23M+21)>0`.  Hence all four roots are real near `r=0`, and (600)
continues them without collision over both intervals `r<0` and
`0<r<=1/4`.  The omitted case `y+z=0` is a quadratic in `x^2`; its sum and
product are positive and its discriminant is positive after `M=n+4` by a
positive-coefficient expansion.  Therefore `S_M` is hyperbolic in the
`x` direction for all real `y,z`.

All coefficients of `S_M` are positive, so the positive orthant lies in the
same component of `{S_M!=0}` as the `x` direction.  Garding's
hyperbolicity-cone theorem makes every positive direction hyperbolic, which
is equivalent to real stability of the homogeneous polynomial.  Block
polarization now proves (597).  The all-order symbolic replay is
`prove_raw_two_pair_selector_stability.py`, with report
`raw_two_pair_selector_stability_20260804.json`.

This closes the raw endpoint-exclusion half of the mixed-characteristic
route.  It does not yet prove the defect-one group lemma: the marked raw
coordinate slots must still be transported through the factorial/Laguerre
normalization which produces the actual `g_N` seeds.  The inverse-Borel
shortcut does not perform that transport and is already known to fail.  The
remaining conceptual task on this route is therefore precise: construct a
slot-preserving stable lift of that normalization, or show that its
finite-free/Laguerre action commutes with the stable selector (596) on the
special path family.

## 100. Exact audit of three normalization transports

The theorem (597) suggests three natural ways to attach the stable selector
to the Laguerre normalization.  All three stronger parents are exactly
false, including after the endpoint smoothing; the target coefficient
itself is not affected.

First let `B_N(X^k)=N!X^k/k!`.  Its finite-degree algebraic symbol is the
homogeneous Laguerre polynomial

\[
 F_N(X,U)=N!\sum_{k=0}^N {N\choose k}{X^kU^{N-k}\over k!}.
\]

The algebraic symbol of normalization followed by the two-pair contraction
is

`a1 a2 b1 b2 S^4(F_N(X,U)F_N(Y,V))`

` -(a1 b1+a2 b2)S^2(F_N(X,U)F_N(Y,V))+F_N(X,U)F_N(Y,V)`.

At the first actual endpoint `N=4`, even after the required extra `S`
derivative, an exact positive-direction restriction has degree seven and
only five real roots (digest
`795d5127939c792975ec016d5f4b01c27c9364b71f9d2883d254b70bf95e4dc9`).
Thus the composite is not a universal stability preserver.

Second, retaining all `N` mixed-characteristic slots independently gives

\[
 \left.\prod_{j=1}^N
 (h_j+D_U+a_jD_{e_1}+b_jD_{e_2})\Delta_N
 \right|_{U=e_1=e_2=0}.                              \tag{601}
\]

Diagonalizing the slot markers recovers (529), but (601) is not stable:
at `N=4` an exact restriction has degree eight and only six real roots
(digest
`60b42be9befcf4171df149c2e4012a7a2277e74198ed4d2fb082fba509e72915`).
Hence the successful lift must retain a more constrained ordered-partition
coupling; full independence of the slot markers is too strong.

Third there is a useful exact homogeneous coefficient identity.  Put

\[
 p_n(X,T)=\sum_a {n+a-1\choose n-a}X^aT^{n-a}
          =\det(XI_n+TA_n).
\]

Then `N!g_N(X)=N![T^N]e^T p_N(X,T)`, while the two endpoint states are
represented at the common ambient normalization by `Tp_(N-1)` and
`T^2p_(N-2)`.  Therefore, with

\[
\begin{split}
 K_N={}&S^4\{p_N(X,T)p_N(Y,U)\}\\
 &-2TU S^2\{p_{N-1}(X,T)p_{N-1}(Y,U)\}
 +T^2U^2p_{N-2}(X,T)p_{N-2}(Y,U),
\end{split}                                             \tag{602}
\]

one has the all-order identity

\[
 (N!)^2H_N(X,Y)=[T^NU^N]e^{T+U}K_N.                    \tag{603}
\]

The hoped-for proof would make `S^(d-4)K_N` stable before extracting the
coefficient.  This is false already at `(N,d)=(4,5)`: the exact restriction
with bases `(14,5,-24,20)` and directions `(16,12,14,15)` has degree seven
and only three real roots (digest
`65bdde67a8054c145fdc161c808ee0e0bbcae3c4a29b6607c30f55109c9c457c`).
Thus the exponential coefficient extraction performs essential stability
repair and cannot be postponed behind a stronger homogeneous parent.

The replays are `probe_laguerre_normalized_contraction_symbol.py`,
`probe_slot_resolved_mixed_characteristic_lift.py`, and
`probe_homogeneous_path_normalization_kernel.py`, with their dated JSON
reports.  These obstructions leave two viable normalization routes: a
weighted ordered-partition contraction using the proved Strongly Rayleigh
selector (597), or the all-order Bezout/network factorization suggested by
(595).

## 101. A stable row--column Wishart lift in all orders

The ordered-partition route now has the correct stable ambient polynomial.
For every positive-semidefinite `N by N` matrix `A`, define

\[
 \mathcal W_A(\mathbf x,\mathbf c)
 =\sum_{\substack{R,C\subseteq[N]\\|R|=|C|}}
 |R|!\det A[R],\mathbf x^{R^c}\mathbf c^C.          \tag{604}
\]

Then

\[
 \boxed{\mathcal W_A\text{ is real stable for every }A\succeq0.} \tag{605}
\]

For `A` positive definite, put `C=A^(-1/2)`, `D_x=diag(x_1,...,x_N)`,
and `J=11^*`.  The exact mixed-determinant identity is

\[
 \boxed{\mathcal W_A(\mathbf x,\mathbf c)
 =\det(A)\,\eta(CD_xC,c_1J,\ldots,c_NJ).}             \tag{606}
\]

Indeed, a rank-one `J` pencil can receive at most one coordinate in the
ordered partition.  If `k` coordinates go to `k` distinct labeled `J`
pencils, their assignments contribute `k!c_C`.  Cauchy--Binet expands the
principal minor of `CD_xC`; Jacobi complementation followed by a second
Cauchy--Binet sum gives exactly `det A[R]x^(R^c)`.  This proves (606).
Borcea--Branden Theorem 2.6 now proves (605), since every coefficient matrix
of `CD_xC` and every `c_jJ` is positive semidefinite.  Singular `A` follows
by `A+epsilon I` and a coefficientwise limit.

Diagonalizing `x_i=X,c_j=1` gives

\[
 P_A(X)=\sum_R (N)_{|R|}\det A[R]X^{N-|R|},           \tag{607}
\]

the square-Wishart/finite-free characteristic polynomial.  Deleting a
coordinate `e` and one labeled column gives, at the common scale,

\[
 Q_e(X)=N\sum_{R\subseteq[N]\setminus\{e\}}
 (N-1)_{|R|}\det A[R]X^{N-1-|R|},                    \tag{608}
\]

and deleting two coordinates and two distinct columns gives the analogous
factor `N(N-1)(N-2)_(|R|)`.  For the path covariance `A_N`, (607)--(608) are
exactly `N!g_N,N!g_(N-1),N!g_(N-2)`.

This removes the former need to guess a stable independent-slot lift such as
(601): the correct lift is the ordered-partition polynomial (604).  The
remaining compatibility theorem is now precise.  One must tie the two path
endpoint coordinate deletions to two **distinct** column-slot deletions in
each copy, and then apply the two-pair selector (596) before diagonalization.
The selector is Strongly Rayleigh by Section 99, and the ambient polynomial
is stable by (605); what remains is the exact weighted contraction lemma
joining them.

The all-order identity and its exact replays through order five are in
`prove_wishart_row_column_stable_lift.py` and
`wishart_row_column_stable_lift_20260804.json`.  A broader exact stress test
of the resulting two-endpoint covariance class passed 1,620 affine-line
certificates for random rational PSD matrices through `N=10`, including the
whole cone boundary range tested.  The replay is
`probe_finite_free_coordinate_endpoint_contraction.py` with its two dated
reports.  These finite lines support the weighted contraction theorem but
do not replace its proof.

## 102. Size-biased endpoint algebra and the path-incidence matching model

The row--column lift gives an exact intrinsic formula for the endpoint
normalizations.  Write

\[
 P_A(\mathbf x)=\mathcal W_A(\mathbf x,\mathbf 1),\qquad
 E_x=\sum_i x_i\partial_{x_i}.
\]

On the monomial indexed by a principal-minor set `R` of size `k`, `E_x`
has eigenvalue `N-k`.  Therefore the common-scale one- and two-endpoint
states are exactly

\[
 \boxed{Q_e=\partial_{x_e}E_xP_A,\qquad
 R_{ef}=\partial_{x_e}\partial_{x_f}E_x(E_x-1)P_A.}       \tag{609}
\]

Indeed `(N-k)(N)_k=N(N-1)_k` and
`(N-k)(N-k-1)(N)_k=N(N-1)(N-2)_k`.  Thus a row deletion is tied not to an
independent column derivative but to size-biasing by the number of unused
column slots.  Formula (609) is the exact algebraic form of the
without-replacement condition left open after (608).

The dual homogeneous lift makes the same fact visible before
diagonalization:

\[
 \widehat{\mathcal W}_A(\mathbf x,\mathbf h)
 =\mathbf h^{[N]}\mathcal W_A(\mathbf x,-\mathbf h^{-1})
 =\sum_{|R|=|C|}(-1)^{|R|}|R|!\det A[R]
     \mathbf x^{R^c}\mathbf h^{C^c}.                      \tag{610}
\]

The map `h_j -> -1/h_j`, followed by multiplication by `prod h_j`,
preserves the upper half-plane, so (610) is stable.  An endpoint state in
(609) deletes one marked row and one of the still-unused `h` coordinates.

Several tempting stronger closure statements are now exactly excluded.
The simple marker polynomial `P+z_1Q_e+z_2Q_f+z_1z_2R_(ef)` is not stable,
already on the path covariance.  The full Borcea--Branden algebraic symbol
of the direct row/column evaluation operator fails at `(N,d)=(4,5)`: an
exact positive-direction restriction has degree eleven and only nine real
roots.  Rewriting with (609) does not make the operator a universal row
preserver either; its exact symbol first fails at `N=5`, where a degree-five
restriction has only one real root.  A symmetrized diagonal version also
fails at `(4,5)`.  Even full averaging over every Gaussian-column label does
not repair the direct row--column symbol: at `(N,d)=(4,5)` an exact affine
restriction again has degree eleven but only nine real roots.  Thus neither
column exchangeability nor partial symmetrization supplies the missing
closure theorem.  These obstructions do not touch the special Wishart image
or the target polynomial, but they prove that the final lemma must use the
ordered-partition/path geometry rather than Euler commutators alone.  The
replays are `probe_multivariate_endpoint_wishart_lift.py`,
`probe_row_column_contraction_algebraic_symbol.py`,
`probe_size_biased_row_contraction_symbol.py`, and
`probe_size_biased_row_diagonal_symbol.py`, together with
`probe_symmetrized_row_column_contraction_symbol.py`, with their dated
reports.

For the actual covariance there is an additional exact combinatorial
specialization.  Let `B` be the unsigned edge--vertex incidence matrix of
the path on `N` vertices.  Then

\[
 C_{N-1}=BB^*,\qquad A_N=0\oplus C_{N-1}.
\]

The coefficient `e_k(C_(N-1))=binom(2N-1-k,k)` counts `k`-matchings of the
subdivision path on `2N-1` vertices.  Hence

\[
 N!g_N(X)=\sum_k (N)_k{2N-1-k\choose k}X^{N-k}.             \tag{611}
\]

Equivalently, (611) counts matchings in the three-partite, three-uniform
hypergraph whose vertices are path edges, path vertices, and `N` colors,
with hyperedges `(e,v,c)` whenever `v` is incident to `e`.  A matching first
chooses a matching of the subdivision path and then injects its incidences
into distinct colors, giving `(N)_k`.  Differentiation in `X` simply removes
unused colors:

\[
 D_X^r\{N!g_N(X)\}
 =(N)_r\sum_k (N-r)_k{2N-1-k\choose k}X^{N-r-k}.             \tag{612}
\]

This identifies the special structure absent from the false universal
symbols.  Amini's relaxed-hypergraph operator supplies a stable completion
of each three-edge by its pair contractions.  The sharp next question is
whether, after the fixed-cardinality smoothing (612), those pair
contractions assemble into the two endpoint factors `1,-2,1`.  Establishing
that exact coefficient identity would turn Amini's theorem into the missing
weighted contraction lemma; no such identity is asserted yet.

## 103. A tuned stable four-way completion cancels the endpoint contaminants

The local coefficient problem in Section 102 has an exact solution after the
two path endpoints are kept as reflected copies.  For four derivative types
`x_1,...,x_4`, let

\[
 a_s=1-s\lambda,\qquad
 P_\lambda(\mathbf x)=\operatorname {MAP}\left[
 (1-\lambda e_1(\mathbf x))\prod_{i=1}^4(1+x_i)\right]
 =\sum_{S\subseteq[4]}a_{|S|}\mathbf x^S.             \tag{613}
\]

For every positive `lambda`, the polynomial before `MAP` is a product of
stable linear factors.  Amini's multiaffine-part lemma therefore makes
`P_lambda(partial)` a stability-preserving local differential operator.
Apply one copy at the left endpoint and one at the right endpoint, with the
four types being the endpoint row in copy A, the endpoint row in copy B, an
unused Gaussian-column slot in A, and an unused slot in B.

In the balanced one-endpoint grade, the two chosen local subsets must be
complements.  After column symmetrization and path reflection, every such
complementary pair acts identically: each Wishart copy has one endpoint row
and one unused column removed.  The two desired full/empty choices have
total coefficient `2a_4`; the other fourteen choices have aggregate

\[
 8a_1a_3+6a_2^2
 =2(24\lambda^2-28\lambda+7).                         \tag{614}
\]

Consequently either tuning

\[
 \boxed{\lambda={7-\sqrt7\over12}\quad\hbox{or}\quad
        \lambda={7+\sqrt7\over12}}                    \tag{615}
\]

cancels every partial-contraction contaminant in that grade.  Both values
have `a_4=1-4lambda<0`.  Scaling the product of the four derivative
directions by `-1/a_4>0` normalizes the balanced zero-, one-, and two-endpoint
grades to

\[
                         \boxed{1,-2,1}.               \tag{616}
\]

The zero grade is empty/empty, and the two-endpoint grade forces full/full,
so neither has additional terms.  Equations (613)--(616) are all-order
identities and commute with the ordinary color-removal derivatives in
(612).  Their exact symbolic replay is
`prove_tuned_endpoint_relaxed_completion.py`, with report
`tuned_endpoint_relaxed_completion_20260804.json`.

This closes the local coefficient-matching question posed after (612), but
not yet the group lemma.  The remaining obligation is a stability-preserving
realization of the **balanced-grade extraction** on the special path/Wishart
image.  Generic multigraded projection is not a stability closure operation,
so (616) cannot simply be projected out of the stable completion without a
path-specific apolar, symmetric-homogenization, or planar-network argument.
There is a particularly short exact obstruction to the strongest universal
apolar shortcut.  Form the eight-variable complement kernel from the two
copies of (613), retain balanced grades zero, one, and two, and apply the
positive normalization in (616).  On setting all eight variables equal to
`t`, that kernel is exactly `(t^4-1)^2`.  Its roots `+i,-i` disprove real
stability.  Thus the path/Wishart support condition is logically essential,
not merely an artifact of the present proof language.

## 104. The signed endpoint core is a positive colored-cycle polynomial

The path interpretation in (611) geometrizes the complete unsmoothed
endpoint inclusion--exclusion.  Put `F_N=N!g_N`, and regard `F_N(X)` as the
colored matching polynomial of the subdivision path `P_(2N-1)`: a matching
edge receives one of `N` colors injectively, while every unused color
contributes `X`.  Forcing either boundary edge uses one fresh color and
leaves `P_(2N-3)`; forcing both boundary edges uses two distinct fresh colors
and leaves `P_(2N-5)`.  Consequently

\[
 \boxed{F_N^{\mathrm L}=F_N^{\mathrm R}=N F_{N-1},\qquad
        F_N^{\mathrm {LR}}=N(N-1)F_{N-2}.}             \tag{617}
\]

Take two copies of `P_(2N-1)` and identify their corresponding left
endpoints and their corresponding right endpoints.  The resulting ordinary
graph is the cycle `C_(4N-4)`, divided into two arcs.  A pair of matchings of
the two paths is a matching of this cycle precisely when neither identified
endpoint is used twice.  Inclusion--exclusion at those two vertices and
(617) therefore give the exact positive identity

\[
\begin{aligned}
 \mathcal C_N(X,Y)
  ={}&F_N(X)F_N(Y)
       -2\,[N F_{N-1}(X)]\,[N F_{N-1}(Y)]\\
    &+[N(N-1)F_{N-2}(X)]\,[N(N-1)F_{N-2}(Y)],          \tag{618}
\end{aligned}
\]

where `C_N` counts matchings of `C_(4N-4)`, with edges on the two arcs
colored injectively from two separate `N`-color sets and unused colors
weighted by `X` and `Y`.  Thus the apparently signed three-term endpoint
core is itself a positive colored-matching object in every order; its minus
signs only remove the two forbidden double occupations created before the
endpoints are glued.

The desired group polynomial is not simply `S^d C_N`.  In its middle term
the two forced boundary edges have already consumed one color on each arc,
so only `d-2` unused-color removals remain; in the last term four such color
slots have been consumed, leaving `d-4`.  Equivalently, the remaining lemma
must prove stability for a graded color-slot derivative in which each forced
boundary pair carries derivative degree two.  Identity (618) turns this
from a generic signed row--column contraction into a concrete cyclic
matching problem, but it does not by itself prove that graded derivative
closure.

The all-order inclusion--exclusion proof is replayed exactly for `N=3,...,10`
and derivative orders through ten by
`verify_colored_cycle_endpoint_inclusion_model.py`; its report is
`colored_cycle_endpoint_inclusion_model_20260804.json`.

## 105. The matched distinct-column selector is stable in all orders

The without-replacement column factor in the Wishart lift has its own exact
stability theorem.  For endpoint labels `z_1,z_2` and column variables
`c_1,...,c_N`, define

\[
 M_N(\mathbf z;\mathbf c)
 =1-(z_1+z_2)e_1(\mathbf c)+2z_1z_2e_2(\mathbf c).             \tag{619}
\]

This is the upper-half-plane inversion, up to one harmless global sign, of
the multivariate matching polynomial of `K_(2,N)`.  Hence (619) is real
stable.  Its signed degree-two reversal in the endpoint variables is stable
as well.  Apply the degree-two Grace pairing, or equivalently take the top
squarefree coefficient of the two endpoint variables, between (619) and a
reversed second copy.  Sinclair's squarefree product theorem gives

\[
 \boxed{
 J_N(\mathbf c,\mathbf h)
 =1-2e_1(\mathbf c)e_1(\mathbf h)
       +4e_2(\mathbf c)e_2(\mathbf h)
 \quad\hbox{is real stable}.}                               \tag{620}
\]

On the complete column diagonal, the three endpoint grades in (620) are

\[
 \boxed{1,\quad -2N^2,\quad N^2(N-1)^2.}                    \tag{621}
\]

These are exactly the zero-, one-, and two-endpoint factors obtained by
choosing one column in each Wishart copy and then two distinct columns in
each copy.  Thus the distinct-column matching and the matching of the two
endpoint labels across the copies are not the unresolved obstruction: their
joint selector is Strongly Rayleigh in every order.

What remains is the coupling of (620) to the row-deletion/fixed derivative
grade.  The direct coefficientwise row--column composition is not a generic
stability closure operation, consistently with the exact symbol failures in
Section 102.  A successful final composition must use the equal row/column
support of the path Wishart lift or the equivalent colored-cycle geometry.
The exact replay of (619)--(621) is
`prove_matched_column_injection_apolar_stability.py`, with report
`matched_column_injection_apolar_stability_20260804.json`.

## 106. Column pairing reduces the local completion from four ways to three

After (620), an endpoint event has only three unmatched local types: its
matched column label, the endpoint row in copy A, and the endpoint row in
copy B.  For a three-edge, Amini's standard `lambda=1` relaxed completion
has subset-size coefficients

\[
                         a_0,a_1,a_2,a_3=1,0,-1,-2.           \tag{622}
\]

In the balanced one-event grade of the two reflected endpoints, the local
subsets are complements.  The six partial `1/2` complementary allocations
all contain the factor `a_1=0`; hence they vanish individually.  Only the
empty/full and full/empty allocations remain, with coefficient

\[
                    2a_0a_3=-4.                              \tag{623}
\]

Scaling the product of the three endpoint directions by the positive factor
`1/2` gives the three endpoint grades

\[
                         \boxed{1,-2,1}.                      \tag{624}
\]

Thus the irrational tuning in (615) is unnecessary once the distinct-column
matching is performed first: the ordinary Amini completion cancels every
local contaminant term by term.  The global obligation is unchanged but now
cleaner.  One must realize the fixed-grade contraction of the two reflected
three-way gadgets around the special path/Wishart cycle.  The universal
projection is still false, so (622)--(624) do not alone complete the group
lemma.  Their exact replay is
`prove_three_way_endpoint_completion_after_column_pairing.py`, with report
`three_way_endpoint_completion_after_column_pairing_20260804.json`.

## 107. The inverse Bezoutian is a Stieltjes moment matrix

The equal-direction Bezout certificate in Section 97 has an exact hidden
one-dimensional form.  Let `q=q_gamma` have degree `n`, let
`B=Bez(q,q')` in the ascending monomial basis, and assume first that `q` is
squarefree with roots `r_1,...,r_n`.  If

`V_(j,k)=r_j^k`,

then evaluation of the Bezout kernel at pairs of roots gives

\[
                 VB V^{\mathsf T}
                 =\operatorname {diag}(q'(r_1)^2,\ldots,q'(r_n)^2).
                                                               \tag{625}
\]

Consequently

\[
 \boxed{(B^{-1})_{ij}=\sum_{s=1}^n{r_s^{i+j}\over q'(r_s)^2}.} \tag{626}
\]

Identity (626) is algebraic, so it remains valid by continuation whenever
the discriminant is nonzero.  In particular `B^{-1}` is Hankel.  With
`D=diag(1,-1,1,-1,...)`, the matrix

\[
             H=DB^{-1}D,qquad
             H_{ij}=\sum_s{(-r_s)^{i+j}\over q'(r_s)^2},       \tag{627}
\]

is the moment matrix of positive atoms on the positive axis exactly when the
roots of `q` are negative and simple.  The monic orthogonal polynomials for
these moments obey

\[
 p_{k+1}(x)=(x-\alpha_k)p_k(x)-\beta_kp_{k-1}(x),
 \qquad \beta_k>0,                                           \tag{628}
\]

and the terminal polynomial is
`p_n(x)=(-1)^n q(-x)/lc(q)`.  Thus positivity of the `n-1` off-diagonal
Jacobi parameters in (628), together with the already manifest positive
coefficients of `q`, is another sufficient and necessary real-rootedness
certificate.

There is a useful complementary-minor formula.  If `T_s` is the trailing
principal minor of `B` of order `s`, with `T_0=1`, Jacobi complementation
gives

\[
 \det H[0:k-1]={T_{n-k}\over T_n},
 \qquad
 \boxed{\beta_k={T_{n-k-1}T_{n-k+1}\over T_{n-k}^2}.}          \tag{629}
\]

The trailing minors are the translation-invariant Hermite
subdiscriminants from Section 96.  Hence this is not being counted as an
independent proof of their positivity; it identifies their precise Jacobi
meaning and reduces the prospective recurrence certificate to `n-1`
positive rational functions.

Exact symbolic extraction is clean at the first two endpoints.  At
`(N,d)=(4,5)` all three `alpha` and both `beta` parameters have numerators
and denominators coefficientwise nonnegative in `gamma`; for example

\[
 \beta_2={9\gamma^2+4312\over162},\qquad
 \beta_1={3(3\gamma^6+4264\gamma^4+2203328\gamma^2+231608064)
             \over4(9\gamma^2+4312)^2}.                       \tag{630}
\]

At `(7,7)`, all seven `alpha` and all six `beta` parameters have the same
property.  Every `beta` numerator and denominator is an even polynomial in
`gamma`; their numerator degrees are `62,42,26,14,6,2`.  The complete
three-term recurrence reconstructs `q(-x)` exactly.  The replay is
`analyze_equal_direction_inverse_bezout_jacobi.py`, with reports
`equal_direction_inverse_bezout_jacobi_N4_d5_20260804.json` and
`equal_direction_inverse_bezout_jacobi_N7_d7_20260804.json`.

This exposes a second sharp all-order formulation: prove coefficientwise
positivity of the Hermite/trailing-minor chain `T_s`, or equivalently
positivity of every `beta_k` in (629), for
`N=3m+4,d=2m+5`.  A closed Jacobi recurrence for those ratios would settle
the equal-direction lemma.  No such uniform formula has yet been derived.

## 108. An independent cycle--Laguerre proof of the stable core

The positive cycle interpretation in Section 104 gives an independent and
shorter graph-theoretic proof of the all-order core theorem already obtained
by Chebyshev factorization in Section 82.  Define the inverse-factorial path seed

\[
 p_N(T)=\sum_a {N+a-1\choose N-a}T^a
\]

as in (525), put `F_N=N!g_N`, and let the degree-`N` Laguerre multiplier be

\[
             \mathcal B_N(T^a)={N!\over a!}T^a.              \tag{631}
\]

Then `mathcal B_N p_j=(N!/j!)F_j` for every `j<=N`.  Consequently the
common-scale colored-cycle core in (618),

\[
\begin{split}
 \mathcal C_N={}&F_N(X)F_N(Y)-2N^2F_{N-1}(X)F_{N-1}(Y)\\
 &+N^2(N-1)^2F_{N-2}(X)F_{N-2}(Y),
\end{split}
\]

is `mathcal B_N tensor mathcal B_N` applied to

\[
 R_N=p_N(X)p_N(Y)-2p_{N-1}(X)p_{N-1}(Y)
          +p_{N-2}(X)p_{N-2}(Y).                            \tag{632}
\]

The polynomial (632) is stable for a direct graph-theoretic reason.  Let
`D_r(T)` be the matching continuant of the `r`-vertex path with every vertex
variable specialized to `T+2`.  Thus

\[
 D_0=1,\quad D_1=T+2,\quad D_r=(T+2)D_{r-1}-D_{r-2},
 \qquad p_N(T)=T D_{N-1}(T).                                \tag{633}
\]

Split the cycle `C_(2N-2)` into two consecutive `(N-1)`-vertex arcs and
assign vertex variable `X+2` on one arc and `Y+2` on the other.  Decomposing
its multivariate matching polynomial according as zero, one, or both of the
two interface edges are selected gives

\[
 \boxed{
 {R_N(X,Y)\over XY}
  =D_{N-1}(X)D_{N-1}(Y)-2D_{N-2}(X)D_{N-2}(Y)
       +D_{N-3}(X)D_{N-3}(Y)
  =\mu_{C_{2N-2}}(\mathbf z).}                              \tag{634}
\]

The signs `1,-2,1` in (634) are exactly the matching signs of the two
interface edges.  The Heilmann--Lieb theorem makes the multivariate matching
polynomial real stable; block diagonalization and the positive translations
`X -> X+2`, `Y -> Y+2` preserve stability.  Multiplication by `XY` proves
that `R_N` is stable.

Finally `mathcal B_N` is a finite-degree stability preserver.  Its algebraic
symbol is

\[
 \sum_{a=0}^N{N\choose a}{N!\over a!}X^aY^{N-a}
   =N!Y^N L_N(-X/Y),                                       \tag{635}
\]

which is stable because every zero of `L_N` is positive.  Applying this
preserver separately in `X` and `Y` to (632) proves

\[
       \boxed{\mathcal C_N(X,Y)\text{ is real stable for every }N\ge3.}
                                                                    \tag{636}
\]

This is an all-order proof, not a finite screen, but it proves the same core
statement as (515) and is therefore not counted as a new closed frontier.
The independent replay
`prove_colored_cycle_core_stability.py` checks (631)--(635) exactly through
`N=30`; its report is
`colored_cycle_core_stability_theorem_20260804.json`.  A separate exact
Sturm probe of 330 positive-direction lines through `N=13` is recorded by
`probe_colored_cycle_core_stability.py` and
`colored_cycle_core_stability_probe_20260804.json`.

The alternative proof confirms the entire unsmoothed endpoint-exclusion and
inverse-factorial-normalization stage simultaneously.  It does not by itself
prove the group target: `G_(N,d)` takes derivative orders `d,d-2,d-4` in the
three interface grades, whereas an ordinary derivative of (636) acts with
one common order.  The remaining obligation is now isolated as a
fixed-cardinality conditioning of the stable cycle core, rather than a
question about whether the normalized signed core is stable at all.

## 109. The third-highest homogeneous layer is proved in the full cone

The finite-band theorem of Section 90 can be completed uniformly for layer
deficit `s=2`.  First suppose `r=N-d>=2` and put

\[
 p=d+2,\qquad \alpha=r-2,\qquad q=d-r-5=p-\alpha-9\ge0.      \tag{637}
\]

The selector in (563) has degree three.  In the Newton basis at
`lambda_j=j(p-j)`, its four coefficients are

\[
\begin{split}
 c_0={}&(\alpha+p-2)(2\alpha+2p-3),\\
 c_1={}&-{2\{2\alpha^2+4\alpha p-14\alpha
                    +2p^2-14p+19\}\over p(p-1)},\\
 c_2={}&{2\alpha^2+4\alpha p-27\alpha
                    +2p^2-27p+56\over p(p-1)(p-2)(p-3)},\\
 c_3={}&{2(3\alpha+3p-10)\over
                    p(p-1)(p-2)(p-3)(p-4)(p-5)}.             \tag{638}
\end{split}
\]

Under the gamma--Jacobi transform, the `k`th Newton factor becomes
`(N)_k(T)_k`, where

\[
                       T=y(1-y)D_y+ny,
 \qquad n=\lfloor p/2\rfloor.                               \tag{639}
\]

The classical Jacobi structure relation makes `T` tridiagonal in the monic
basis.  Hence (638)--(639) give exactly

\[
             K=p_n+A p_{n-1}+B p_{n-2}+C p_{n-3}.            \tag{640}
\]

There is only one positivity condition needed to make (640) a Jacobi
characteristic polynomial.  If

`p_(k+1)=(y-a_k)p_k-b_kp_(k-1)`, `b_k>0`,

then comparison in the basis `p_(n-2),p_(n-3)` changes the final two
diagonals to

\[
 \delta_n=a_{n-1}-A+{C\over b_{n-2}},\qquad
 \delta_{n-1}=a_{n-2}-{C\over b_{n-2}},                     \tag{641}
\]

and changes the last squared coupling to

\[
 u^2=\delta_n\delta_{n-1}
 -\{(a_{n-1}-A)a_{n-2}+B-b_{n-1}\}.                         \tag{642}
\]

Substitution of the monic Jacobi recurrence coefficients into (642) gives
the same expression in both parities:

\[
 \boxed{
 {u^2\over b_{n-1}}=
 {2(4\alpha+2q+13)^2(4\alpha+2q+15)P(\alpha,q)
  \over
  (\alpha+q+4)^2(\alpha+q+5)^2(\alpha+q+6)(\alpha+q+7)
  Q(\alpha,q)^2}.}                                          \tag{643}
\]

Here `P` has 104 nonzero monomials and `Q` has 21; every coefficient of
both polynomials is a strictly positive integer.  Thus (643) is positive
for all `alpha,q>=0`.  The complete coefficient lists, rather than only
their digests, are recorded in
`group_third_homogeneous_cone_theorem_20260804.json`.

The two offsets not covered by (637) have shorter one-variable
certificates.  For `r=0,1` and the two parities, the only nonmanifest
numerator in (642), after `n=m+n_0`, has respectively 8, 8, 10, and 10
strictly positive coefficients, with `n_0=4,4,3,3`.  The corresponding
denominator bases have respectively 6, 6, 6, and 6 positive coefficients
and are squared.  The finitely smaller Jacobi degrees are direct base cases.
For `r<0`, the derivative identity (534) reduces the assertion to `r=0`.

Therefore `u^2>0` throughout `2d-N>=5`.  Equations (641)--(642) realize
`K` as the characteristic polynomial of a real symmetric tridiagonal
matrix.  All of its roots are real; positivity of the original binary row
coefficients forces every root to be negative.  Hence

\[
 \boxed{\text{The complete homogeneous layer }s=2
        \text{ is real stable throughout }2d-N\ge5.}        \tag{644}
\]

The all-order symbolic replay is
`prove_group_third_homogeneous_cone.py`; it independently reconstructs
(638)--(643), proves the parity collapse, records the 104 and 21 positive
coefficients, and verifies all four boundary-offset formulas.  The separate
finite audit `analyze_group_third_homogeneous_jacobi.py` checks the modified
coupling exactly in 168 cone cells.  Together with Sections 88--89, the top
three homogeneous layers are now proved uniformly.  The next unresolved
layer `s=3` still has the same four-term Jacobi bandwidth, but a different
selector; proving its analogue of (643) is the immediate continuation.

## 110. The fourth-highest homogeneous layer is also proved in the full cone

The same Jacobi realization closes layer deficit `s=3`.  For the upper
offsets `r=N-d>=3`, put

\[
 p=d+3,\qquad \alpha=r-3,\qquad
 q=d-r-5=p-\alpha-11\ge0.                              \tag{645}
\]

Direct simplification of the defect sum (561) gives the degree-three Newton
selector

\[
\begin{split}
 c_0={}&{2(\alpha+p-3)(\alpha+p-2)(2\alpha+2p-5)\over3},\\
 c_1={}&-{4\over3p(p-1)}\{2\alpha^3+6\alpha^2p-30\alpha^2
       +6\alpha p^2-60\alpha p+109\alpha\\
     &\hspace{42mm}{}+2p^3-30p^2+109p-120\},\\
 c_2={}&{2\over3p(p-1)(p-2)(p-3)}
       \{2\alpha^3+6\alpha^2p-63\alpha^2
       +6\alpha p^2-126\alpha p+337\alpha\\
     &\hspace{42mm}{}+2p^3-63p^2+337p-504\},\\
 c_3={}&{12(\alpha+p-4)^2\over
       p(p-1)(p-2)(p-3)(p-4)(p-5)}.                    \tag{646}
\end{split}
\]

The symbolic verifier derives (646) from the four values of (561), rather
than assuming the displayed formulas.  Equations (639)--(642) apply without
change: the gamma transform is again

\[
                 K=p_n+A p_{n-1}+B p_{n-2}+C p_{n-3},    \tag{647}
\]

and real-rootedness reduces to the positivity of the one modified squared
coupling `u^2`.  In the slack coordinates (645), both parities simplify to
the identical expression

\[
 \boxed{
 {u^2\over b_{n-1}}=
 {2(4\alpha+2q+17)^2(4\alpha+2q+19)P_3(\alpha,q)
  \over
  3(\alpha+q+6)^2(\alpha+q+7)^2(\alpha+q+8)(\alpha+q+9)
  Q_3(\alpha,q)^2}.}                                    \tag{648}
\]

The polynomial `P_3` has 135 nonzero monomials and `Q_3` has 28; every
coefficient is a strictly positive integer.  Their complete coefficient
lists are stored in
`group_fourth_homogeneous_cone_theorem_20260804.json`, so (648) is an exact
coefficientwise certificate for every `alpha,q>=0`.

There are six lower-offset cases.  For `r=0,1,2` in the two parities, shift
the Jacobi degree by its cone minimum `n_0=3,3,3,3,4,4`.  The corresponding
nonmanifest numerator and denominator then have respectively
`14,14,13,13,14,14` coefficients, all strictly positive.  The shifted
selector identity (565) is used symbolically, and an independent direct-row
comparison agrees in 28 exact cells.  The finitely smaller degrees are base
cases, while `r<0` again follows from derivative closure.

Thus the modified coupling in (648) and in every boundary case is positive.
The same real symmetric Jacobi-matrix construction as in Section 109 proves

\[
 \boxed{\text{The complete homogeneous layer }s=3
        \text{ is real stable throughout }2d-N\ge5.}      \tag{649}
\]

The all-order replay is `prove_group_fourth_homogeneous_cone.py`; it derives
(646), reconstructs both parity formulas, proves their equality, and writes
all 135 and 28 essential coefficients plus the six boundary certificates.
The independent extractor `analyze_group_fourth_homogeneous_jacobi.py`
checks the modified coupling in 200 exact cone cells, and
`verify_group_fourth_homogeneous_boundaries.py` supplies the 28 exact
symbolic-to-row comparisons.  Hence the top four homogeneous layers are now
uniform theorems.

For the next layer `s=4`, the selector has degree four and the Jacobi
bandwidth is five.  Dividing the transformed row at `p_(n-4)` gives the
fixed-degree Schur form

\[
                 K=A_4(y)p_{n-4}(y)-B_3(y)p_{n-5}(y).      \tag{650}
\]

If the cubic `B_3` strictly interlaces the quartic `A_4`, (650) attaches a
real symmetric four-vertex Jacobi tail and proves the layer.  The exact
selector has already been derived, and all four leading principal Bezout
minors for `(A_4,B_3)` are positive in 80 exact cone cells.  This finite
evidence is recorded by `derive_group_fifth_homogeneous_selector.py` and
`analyze_group_fifth_homogeneous_tail_schur.py`; the remaining task is to
factor those four fixed-size minors uniformly in the cone parameters.

## 111. A quartic/cubic Schur tail proves the fifth-highest layer

The fixed-size Bezout target at the end of Section 110 can be completed for
layer deficit `s=4`.  For upper offsets `r=N-d>=4`, put

\[
 p=d+4,\qquad \alpha=r-4,\qquad
 q=d-r-5=p-\alpha-13\ge0.                              \tag{651}
\]

Direct symbolic evaluation of (561) at the five Newton nodes gives

\[
\begin{split}
c_0={}&{(\alpha+p-4)(\alpha+p-3)(2\alpha+2p-7)
                   (2\alpha+2p-5)\over6},\\
c_1={}&-{1\over3p(p-1)}\{4\alpha^4+16\alpha^3p-104\alpha^3
 +24\alpha^2p^2-312\alpha^2p+725\alpha^2\\
&\quad+16\alpha p^3-312\alpha p^2+1450\alpha p-2005\alpha
 +4p^4-104p^3+725p^2-2005p+1980\},\\
c_2={}&{1\over6p(p-1)(p-2)(p-3)}
 \{4\alpha^4+16\alpha^3p-228\alpha^3
 +24\alpha^2p^2-684\alpha^2p+2375\alpha^2\\
&\quad+16\alpha p^3-684\alpha p^2+4750\alpha p-8763\alpha
 +4p^4-228p^3+2375p^2-8763p+10938\},\\
c_3={}&{2\{6\alpha^3+18\alpha^2p-103\alpha^2
 +18\alpha p^2-206\alpha p+520\alpha
 +6p^3-103p^2+520p-827\}\over(p)_6},\\
c_4={}&{18\alpha^2+36\alpha p-155\alpha+18p^2-155p+334
                   \over(p)_8}.                         \tag{652}
\end{split}
\]

Thus the gamma transform is a combination of five consecutive monic Jacobi
polynomials.  Instead of modifying a growing matrix directly, divide at the
bottom polynomial in that band:

\[
 \boxed{K(y)=A_4(y)p_{n-4}(y)-\rho B_3(y)p_{n-5}(y),
        \qquad \rho>0,}                                  \tag{653}
\]

where `A_4` and `B_3` are monic of degrees four and three.  Formula (653) is
the Schur complement of a four-vertex Jacobi tail.  Such a real symmetric
tail exists exactly when `B_3` strictly interlaces `A_4`.

Let

\[
 {A_4(x)B_3(y)-A_4(y)B_3(x)\over x-y}
       =\sum_{i,j=0}^3\mathcal B_{ij}x^iy^j.              \tag{654}
\]

The orientation in (654) is chosen positive at one cone point.  Sylvester's
criterion and the classical Bezout--Hermite interlacing criterion say that
strict positivity of the four leading principal minors of `mathcal B` is
equivalent to the required strict interlacing.

Exact rational-function reduction in the slack coordinates (651) gives the
same `A_4`, `B_3`, and four Bezout minors in both parities.  For orders one
through four, the reduced numerators contain respectively

\[
                     300,\quad1128,\quad2346,\quad945      \tag{655}
\]

nonzero monomials; every coefficient is strictly positive.  The denominators
have respectively `300,1128,2346,946` positive monomials.  Hence
`mathcal B` is positive definite for every `alpha,q>=0`.

All lower offsets are uniform as well.  For `r=0,1,2,3`, both parities use
the shifted selector (565) and the Jacobi-degree shift `n=m+5`.  In each of
the eight resulting families, the four numerator term counts are

\[
                         24,\quad47,\quad68,\quad43,        \tag{656}
\]

and all numerator and denominator coefficients are positive.  The 18 valid
cone cells below Jacobi degree five have been checked exactly: every residual
row has all of its roots strictly negative.  Finally, the derived quartic,
cubic, and all 16 Bezout entries agree with independently constructed exact
rows in 41 upper/boundary cells.

It follows from (653)--(656) that every transformed row is the characteristic
polynomial of a real symmetric Jacobi extension.  Positivity of the original
binary coefficients again places all roots on the negative axis.  Therefore

\[
 \boxed{\text{The complete homogeneous layer }s=4
        \text{ is real stable throughout }2d-N\ge5.}      \tag{657}
\]

The all-order replay is `prove_group_fifth_homogeneous_cone.py`, with theorem
report `group_fifth_homogeneous_cone_theorem_20260804.json`.  The individual
full-coefficient rational-function reports are generated by
`derive_group_fifth_homogeneous_tail_schur_flint.py`; the direct selector
derivation is `derive_group_fifth_homogeneous_selector.py`.  The 41 formula
comparisons and 18 base cases are replayed by
`verify_group_fifth_homogeneous_tail_schur_theorem.py`.  The independent
80-cell discovery audit remains
`analyze_group_fifth_homogeneous_tail_schur.py`.

Consequently the top five homogeneous layers are uniform theorems.  The next
layer `s=5` still has selector degree four and the same five-term Jacobi
bandwidth, so the quartic/cubic tail method applies again with a new exact
selector.  The remaining global obligations are unchanged: all layers and
their compatibility through the shared homogenizing variable must still be
proved.

## 112. The same Schur tail proves the sixth-highest layer

Layer deficit `s=5` has the same degree-four selector bound and therefore the
same five-term Jacobi bandwidth.  For upper offsets `r>=5`, use

\[
 p=d+5,\qquad \alpha=r-5,\qquad
 q=d-r-5=p-\alpha-15\ge0.                              \tag{658}
\]

The five Newton coefficients are derived directly from (561), not fitted.
Their two endpoint formulas are

\[
\begin{split}
c_0={}&{(\alpha+p-5)(\alpha+p-4)(\alpha+p-3)
 (2\alpha+2p-9)(2\alpha+2p-7)\over15},\\
c_4={}&{2(\alpha+p-5)
 (18\alpha^2+36\alpha p-179\alpha+18p^2-179p+446)
 \over(p)_8}.                                          \tag{659}
\end{split}
\]

The complete middle coefficients `c_1,c_2,c_3` are recorded in
`group_sixth_homogeneous_selector_20260804.json` and are reconstructed by
`derive_group_sixth_homogeneous_selector.py` from the symbolic defect sum.

Applying the construction (653)--(654) again gives

\[
                    K=A_4p_{n-4}-\rho B_3p_{n-5},
                    \qquad\rho>0.                         \tag{660}
\]

In the slack coordinates (658), the even and odd quartic, cubic, and four
Bezout minors are identical.  The four reduced numerator term counts are

\[
                    351,\quad1326,\quad2775,\quad1080,     \tag{661}
\]

and the denominator counts are `351,1326,2775,1081`.  Every coefficient is
strictly positive, so the Bezout matrix is positive definite for every
`alpha,q>=0`.

There are ten lower-offset families from `r=0,1,2,3,4` and parity.  Their
shifted four-minor numerator counts are uniformly

\[
                         26,\quad51,\quad74,\quad46,        \tag{662}
\]

with every numerator and denominator coefficient positive.  The shift is
`n=m+5` for `r<=3` and `n=m+6` for `r=4`.  The 22 valid cone cells below the
tail range are exact negative-root base cases.  Forty-five independent exact
comparisons verify `A_4`, `B_3`, and every Bezout entry against directly
constructed rows.

Equations (660)--(662), Sylvester's criterion, and the inverse Jacobi-tail
construction therefore prove

\[
 \boxed{\text{The complete homogeneous layer }s=5
        \text{ is real stable throughout }2d-N\ge5.}      \tag{663}
\]

The all-order replay is `prove_group_sixth_homogeneous_cone.py`, with report
`group_sixth_homogeneous_cone_theorem_20260804.json`.  Full coefficient
reports are generated by
`derive_group_fifth_homogeneous_tail_schur_flint.py --layer 5`; the direct
formula and row/base checks are
`derive_group_sixth_homogeneous_selector.py` and
`verify_group_sixth_homogeneous_tail_schur_theorem.py`.

Thus the top six homogeneous layers are uniform theorems.  At `s=6` the
selector degree rises to five, giving a six-term Jacobi band.  The same Schur
idea reduces that layer to a monic quintic/quartic interlacing problem and a
fixed `5 by 5` Bezout matrix.  This is the immediate next target; all-layer
and shared-homogenizer compatibility remain separate obligations.

## 113. A quintic/quartic Schur tail proves the seventh-highest layer

At layer deficit `s=6` the selector degree rises to five.  For upper offsets
`r>=6`, put

\[
 p=d+6,\qquad \alpha=r-6,\qquad
 q=d-r-5=p-\alpha-17\ge0.                              \tag{664}
\]

Direct evaluation of the defect sum at the six Newton nodes gives six exact
coefficients `c_0,...,c_5`; they are recorded in
`group_seventh_homogeneous_selector_20260804.json` and reconstructed by
`derive_group_seventh_homogeneous_selector.py`.  The resulting six-term
Jacobi band has the Schur form

\[
                  K=A_5p_{n-5}-\rho B_4p_{n-6},
                  \qquad\rho>0,                           \tag{665}
\]

with monic quintic `A_5` and monic quartic `B_4`.  Strict interlacing is now
equivalent to positive definiteness of their `5 by 5` Bezout matrix.

Both upper parities again become identical in the coordinates (664).  The
five leading Bezout-minor numerators have respectively

\[
             528,\quad2016,\quad4371,\quad7260,\quad2849   \tag{666}
\]

strictly positive coefficients.  The denominator counts are
`528,2016,4371,7260,2850`, also all positive.  Thus the complete Bezout matrix
is positive definite for every `alpha,q>=0`.

For the twelve lower-offset/parity families `r=0,...,5`, the five shifted
minor numerator counts are uniformly

\[
                         32,\quad63,\quad93,\quad120,\quad75. \tag{667}
\]

Every numerator and denominator coefficient is positive.  The 34 valid cone
cells below Jacobi degree six are exact negative-root base cases, and 49
independent comparisons match the symbolic quintic, quartic, and full
Bezout matrix to directly constructed rows.

The inverse Jacobi-tail construction and Sylvester's criterion therefore
give

\[
 \boxed{\text{The complete homogeneous layer }s=6
        \text{ is real stable throughout }2d-N\ge5.}      \tag{668}
\]

The all-order replay is `prove_group_seventh_homogeneous_cone.py`, with
report `group_seventh_homogeneous_cone_theorem_20260804.json`.  Full rational
certificates come from
`derive_group_seventh_homogeneous_tail_schur_flint.py`; direct selector and
formula/base verification are
`derive_group_seventh_homogeneous_selector.py` and
`verify_group_seventh_homogeneous_tail_schur_theorem.py`.

Thus the top seven homogeneous layers are uniform theorems.  Layer `s=7`
still has selector degree five and the same quintic/quartic Schur tail, so it
is the immediate continuation.  All-layer coverage and the common
homogenizing-variable compatibility remain open.

## 114. The eighth-highest layer is proved by the same quintic tail

Layer deficit `s=7` retains selector degree five.  With

\[
 p=d+7,\qquad \alpha=r-7,\qquad
 q=d-r-5=p-\alpha-19\ge0,                              \tag{669}
\]

the direct defect-sum calculation gives the six Newton coefficients recorded
in `group_eighth_homogeneous_selector_20260804.json`.  The transformed row
again has the Schur representation

\[
                    K=A_5p_{n-5}-\rho B_4p_{n-6},
                    \qquad\rho>0.                         \tag{670}
\]

The upper even and odd quintic, quartic, and five Bezout minors are identical
in the slack coordinates (669).  Their numerator term counts are

\[
             595,\quad2278,\quad4950,\quad8256,\quad3159,  \tag{671}
\]

and the denominator counts are `595,2278,4950,8256,3160`.  Every coefficient
is strictly positive.

All fourteen lower-offset/parity families `r=0,...,6` are positive.  For
`r<=5`, their five numerator counts are

\[
                         34,\quad67,\quad99,\quad128,\quad79; \tag{672}
\]

the final offset `r=6` has the slightly shorter positive counts
`33,66,98,127,78`.  The 38 smaller valid cells are exact negative-root base
cases, and 53 independent comparisons match the quintic, quartic, and every
Bezout entry to direct rows.

Thus Sylvester's criterion and the inverse Jacobi-tail construction prove

\[
 \boxed{\text{The complete homogeneous layer }s=7
        \text{ is real stable throughout }2d-N\ge5.}      \tag{673}
\]

The all-order replay is `prove_group_eighth_homogeneous_cone.py`, with report
`group_eighth_homogeneous_cone_theorem_20260804.json`.  Full rational
certificates are generated by
`derive_group_seventh_homogeneous_tail_schur_flint.py --layer 7`; the direct
selector and exact formula/base checks are
`derive_group_eighth_homogeneous_selector.py` and
`verify_group_eighth_homogeneous_tail_schur_theorem.py`.

Consequently the top eight homogeneous layers are uniform theorems.  At
`s=8` the selector degree rises to six and the Schur tail becomes a
sextic/quintic pair with a fixed `6 by 6` Bezout matrix.  More importantly,
the repeated coefficientwise positivity now points to a possible all-layer
Schur-tail theorem; finding its uniform positive factorization is preferable
to treating indefinitely many layers one at a time.  Shared-homogenizer
compatibility remains a separate final obligation.

## 115. A positive sextic Jacobi tail proves the ninth-highest layer

For layer deficit `s=8`, the direct defect-sum interpolation has degree six.
For upper offsets `r>=8`, use

\[
 p=d+8,\qquad \alpha=r-8,\qquad
 q=d-r-5=p-\alpha-21\ge0.                              \tag{674}
\]

The seven-term Jacobi band admits the Schur representation

\[
                  K=A_6p_{n-6}-\rho B_5p_{n-7},
                  \qquad\rho>0,                          \tag{675}
\]

where `A_6` and `B_5` are monic.  Instead of expanding the six Bezout
principal minors, run the monic Euclidean algorithm on `(A_6,B_5)`.  It gives
five Jacobi couplings.  Positivity of all five is equivalent to strict
interlacing of `B_5` and `A_6` and directly constructs the required real
symmetric six-vertex Jacobi tail.

The first two couplings have the universal product form

\[
 \frac{(\alpha+q+t)(\alpha+q+t+1)
       (3\alpha+q+t)(3\alpha+q+t+1)}
      {(4\alpha+2q+2t-1)(4\alpha+2q+2t+1)^2
       (4\alpha+2q+2t+3)},\qquad t=10,12.                \tag{676}
\]

The remaining three couplings are new at this layer: the earlier conjecture
that only the bottom two couplings are nontrivial is false.  Their reduced
numerator/denominator term counts are respectively

\[
             (253,253),\qquad(1653,1653),\qquad(5994,5995). \tag{677}
\]

Every coefficient in all six polynomials is strictly positive in
`alpha,q`.  The even and odd sextic and quintic tails agree
coefficient-for-coefficient in (674), so (676)--(677) prove the entire upper
range.

There are sixteen lower-offset families, `r=0,...,7` and parity.  Their five
positive coupling counts (numerator and denominator counts agree) are

\[
\begin{array}{c|c}
r&\text{counts}\cr
0&(5,5,18,45,85)\cr
1&(5,5,18,43,81)\cr
2&(5,5,18,41,77)\cr
3&(5,5,18,41,75)\cr
4&(5,5,18,41,73)\cr
5&(5,5,18,41,77)\cr
6&(5,5,18,45,85)\cr
7&(5,5,20,51,97).
\end{array}                                               \tag{678}
\]

Both parities have the displayed counts and strictly positive coefficients.
Sixty-seven independent exact comparisons match the symbolic sextic and
quintic to directly constructed residual rows.  The 54 valid cone cells
below the tail threshold are exact negative-root base cases.

The positive Euclidean couplings, inverse Jacobi-tail construction, boundary
exhaustion, and base cases therefore prove

\[
 \boxed{\text{The complete homogeneous layer }s=8
        \text{ is real stable throughout }2d-N\ge5.}      \tag{679}
\]

The all-order replay is `prove_group_ninth_homogeneous_cone.py`, with report
`group_ninth_homogeneous_cone_theorem_20260804.json`.  The upper coupling
certificate is `analyze_group_arbitrary_layer_schur_pattern.py`; parity,
boundary, and row/base replays are
`verify_group_ninth_homogeneous_upper_parity.py`,
`analyze_group_ninth_homogeneous_boundaries.py`, and
`verify_group_ninth_homogeneous_tail_theorem.py`.

Thus the top nine homogeneous layers are uniform theorems.  The appearance
of a third nontrivial coupling at `s=8` rules out the simplest two-obstruction
induction, but all three new couplings remain coefficientwise positive.  The
next target is a recurrence describing how new positive couplings enter as
the layer grows.  All-layer coverage and shared-homogenizer compatibility
remain separate obligations.

## 116. The paired sextic tail proves the tenth-highest layer

Layer deficit `s=9` has the same selector degree and tail order as `s=8`.
For upper offsets, set

\[
 p=d+9,\qquad \alpha=r-9,\qquad
 q=d-r-5=p-\alpha-23\ge0.                              \tag{680}
\]

The transformed row again has a monic sextic/quintic Schur tail and five
Euclidean Jacobi couplings.  The first two are the universal product
couplings (676), now with `t=12,14`.  The three nontrivial reduced
numerator/denominator counts are

\[
             (276,276),\qquad(1830,1830),\qquad(6669,6670). \tag{681}
\]

Every coefficient is positive in `alpha,q`, and the upper even and odd tails
are identical.  Thus all upper-offset `s=9` rows have the required positive
six-vertex Jacobi extension.

All eighteen boundary families, `r=0,...,8` and parity, are also positive.
Their five numerator counts (equal to their denominator counts) are

\[
\begin{array}{c|c}
r&\text{counts}\cr
0&(5,5,20,51,97)\cr
1&(5,5,19,48,91)\cr
2&(5,5,19,46,87)\cr
3&(5,5,19,44,83)\cr
4&(5,5,19,44,81)\cr
5&(5,5,19,44,79)\cr
6&(5,5,19,44,81)\cr
7&(5,5,19,48,91)\cr
8&(5,5,21,54,103).
\end{array}                                               \tag{682}
\]

Seventy-one independent exact comparisons match the symbolic sextic and
quintic to directly constructed residual rows.  The 58 valid cells below
the tail threshold have all roots strictly negative.  Hence

\[
 \boxed{\text{The complete homogeneous layer }s=9
        \text{ is real stable throughout }2d-N\ge5.}      \tag{683}
\]

The replay is `prove_group_tenth_homogeneous_cone.py`, with report
`group_tenth_homogeneous_cone_theorem_20260804.json`.  Its upper certificate
is `group_tenth_homogeneous_schur_pattern_probe_20260804.json`; parity,
boundary, and direct-row reports are
`group_tenth_homogeneous_upper_parity_20260804.json`,
`group_tenth_homogeneous_boundary_jacobi_20260804.json`, and
`group_tenth_homogeneous_tail_verification_20260804.json`.

Together, `s=8,9` establish the first complete paired block beyond the
earlier two-obstruction pattern:

\[
 \boxed{\text{tail order }h+2\text{ is shared by }s=2h,2h+1,
        \text{ with a growing positive bottom block}.}    \tag{684}
\]

Equation (684) is at present a proved description of the computed blocks,
not yet an induction for arbitrary `h`.  Deriving the transition from one
paired block to the next is now the main all-layer task.  Shared-homogenizer
compatibility remains separate.

## 117. A positive septic Jacobi tail proves the eleventh-highest layer

Layer deficit `s=10` is the first member of the next paired block.  For upper
offsets put

\[
 p=d+10,\qquad \alpha=r-10,\qquad
 q=d-r-5=p-\alpha-25\ge0.                              \tag{685}
\]

The direct defect-sum selector has degree seven, and the transformed row has
the Schur form

\[
                  K=A_7p_{n-7}-\rho B_6p_{n-8},
                  \qquad\rho>0,                          \tag{686}
\]

with `A_7` and `B_6` monic.  Their monic Euclidean algorithm has six Jacobi
couplings.  The first three are the universal product couplings (676), with

\[
                         t=12,14,16.                      \tag{687}
\]

The next two reduced couplings have respectively

\[
              (1176,1176),\qquad(4186,4186)              \tag{688}
\]

numerator/denominator terms, all strictly positive in `alpha,q`.  For the
terminal coupling, retaining the exact common denominator avoids a harmful
intermediate rational expansion.  Its numerator has 34,715 strictly
positive terms; its three denominator factors have 8,778, 3,828, and 1,081
strictly positive terms.  This is an exact rational certificate, not a
sampling check.  Normalizing each intermediate rational function by its
nonzero scalar unit merely replaces `(P,Q)` by `(P/c,Q/c)` and was separately
regression-checked on `s=4`; it changes neither coupling nor sign.

The even and odd upper tails agree coefficient-for-coefficient.  There are
twenty lower-offset families, `r=0,...,9` and parity.  Each has six positive
couplings.  The numerator counts, equal to the denominator counts, are

\[
\begin{array}{c|c}
r&\text{counts}\cr
0&(5,5,5,40,75,141)\cr
1&(5,5,5,38,71,135)\cr
2&(5,5,5,36,67,129)\cr
3&(5,5,5,36,65,125)\cr
4&(5,5,5,36,63,121)\cr
5&(5,5,5,36,63,119)\cr
6&(5,5,5,36,63,121)\cr
7&(5,5,5,36,67,129)\cr
8&(5,5,5,40,75,141)\cr
9&(5,5,5,44,83,157).
\end{array}                                               \tag{689}
\]

At `r=8` the even and odd Jacobi degree shifts are ten and nine; at `r=9`
both are eleven.  Seventy-five exact comparisons match the symbolic septic
and sextic to directly constructed residual rows.  The 77 valid cone cells
below the tail threshold have exactly the required number of strictly
negative roots.  Consequently

\[
 \boxed{\text{The complete homogeneous layer }s=10
        \text{ is real stable throughout }2d-N\ge5.}      \tag{690}
\]

The all-order replay is `prove_group_eleventh_homogeneous_cone.py`, with
report `group_eleventh_homogeneous_cone_theorem_20260805.json`.  Its upper,
parity, boundary, and direct-row reports are
`group_eleventh_homogeneous_schur_pattern_probe_20260805.json`,
`group_eleventh_homogeneous_upper_parity_20260805.json`,
`group_eleventh_homogeneous_boundary_jacobi_20260805.json`, and
`group_eleventh_homogeneous_tail_verification_20260805.json`.

Thus the top eleven homogeneous layers are uniform theorems.  As independent
evidence for the intended all-layer recurrence, exact scalar specializations
of every Jacobi coupling are positive through `s=100` at `(alpha,q)=(0,0)`,
through `s=80` at `(1,2)`, and through `s=60` at `(5,7)`.  These computations
are evidence only: the next proof obligation is the symbolic block-to-block
recurrence, followed by shared-homogenizer compatibility.

## 118. The paired septic tail proves the twelfth-highest layer

Layer deficit `s=11` has the same degree-seven selector and septic/sextic
Schur tail as `s=10`.  In upper cone coordinates the first three Jacobi
couplings are again (676), now with

\[
                         t=14,16,18.                      \tag{691}
\]

The next two reduced numerator/denominator pairs contain

\[
              (1275,1275),\qquad(4560,4560)              \tag{692}
\]

strictly positive terms.  The terminal unreduced common-denominator
certificate has 37,949 positive numerator terms and positive denominator
factors with 9,591, 4,186, and 1,176 terms.  Both upper parities are
coefficientwise identical.

All 22 lower-offset/parity families have six positive couplings.  The
largest boundary numerator or denominator has 165 terms.  Seventy-nine
exact comparisons match the symbolic tails to directly constructed rows,
and all 83 smaller valid cone cells are exact negative-root base cases.
Therefore

\[
 \boxed{\text{The complete homogeneous layer }s=11
        \text{ is real stable throughout }2d-N\ge5.}      \tag{693}
\]

The replay is `prove_group_twelfth_homogeneous_cone.py`, with report
`group_twelfth_homogeneous_cone_theorem_20260805.json`.  Its supporting
upper, parity, boundary, and row reports are the four
`group_twelfth_homogeneous_*_20260805.json` certificates.

Consequently the top twelve homogeneous layers are uniform theorems, and
`s=10,11` give the second complete paired block after `s=8,9`.  The shared
tail order, the shift by two in each universal coupling, and the nesting of
the terminal denominator factors sharpen the required block-to-block
recurrence.  They do not yet constitute its proof.

## 119. An octic Jacobi tail proves the thirteenth-highest layer

Layer deficit `s=12` raises the selector degree and Schur-tail order to
eight.  Its seven upper Jacobi couplings split into three universal product
couplings, with shifts `t=14,16,18`, and four exceptional couplings.  The
first three exceptional numerator/denominator term counts are

\[
          (465,465),\qquad(3321,3321),\qquad(12403,12403).  \tag{694}
\]

Every coefficient is strictly positive.  The terminal exact
common-denominator certificate has 83,027 positive numerator terms and
positive denominator factors with 20,910, 8,001, and 3,160 terms.  The even
and odd upper tails are identical.

All 24 boundary-offset/parity families have seven positive couplings; the
largest reduced boundary polynomial has 231 terms.  Eighty-three exact
comparisons reproduce directly constructed residual rows, and the 105
smaller valid cone cells are exact negative-root base cases.  Hence

\[
 \boxed{\text{The complete homogeneous layer }s=12
        \text{ is real stable throughout }2d-N\ge5.}      \tag{695}
\]

The generic theorem assembler is `prove_group_arbitrary_homogeneous_cone.py`.
Its replay report is
`group_thirteenth_homogeneous_cone_theorem_20260805.json`, supported by the
four `group_thirteenth_homogeneous_*_20260805.json` certificates.

Thus the top thirteen homogeneous layers are uniform theorems.  This layer
also disproves the temporary fixed-width-three guess: the exceptional
positive suffix grows to width four.  Exact scalar audits through `s=100`
identify the sharper law.  For `s=2h` or `s=2h+1`, the `h+1` couplings have
a universal prefix of length `floor((h+1)/2)` and an exceptional suffix of
length `ceil((h+1)/2)`.  The audit report is
`group_universal_prefix_growth_audit_20260805.json`; the law is exact at
three scalar cone specializations but remains to be proved symbolically.

## 120. The paired octic tail proves the fourteenth-highest layer

Layer deficit `s=13` shares the octic/septic Schur tail of `s=12`.  Its
three universal couplings have shifts `t=16,18,20`; the next three reduced
couplings have positive numerator/denominator term counts

\[
          (496,496),\qquad(3570,3570),\qquad(13366,13366). \tag{696}
\]

The terminal unreduced certificate has 89,675 positive numerator terms and
positive denominator factors with 22,578, 8,646, and 3,403 terms.  Upper
parities coincide.  All 26 boundary families have seven positive couplings,
with largest reduced boundary polynomial size 241.  Eighty-seven exact row
comparisons and 111 exact negative-root base cells pass.  Therefore

\[
 \boxed{\text{The complete homogeneous layer }s=13
        \text{ is real stable throughout }2d-N\ge5.}      \tag{697}
\]

The replay is `prove_group_arbitrary_homogeneous_cone.py --layer 13`, with
report `group_fourteenth_homogeneous_cone_theorem_20260805.json`.  Hence the
top fourteen homogeneous layers are uniform theorems, and `s=12,13` form a
third complete paired block.

## 121. The highest Newton-selector coefficient is positive in every layer

The top selector coefficient admits an all-order path factorization.  Put

\[
 B_M(u)=\sum_i{2M-i-1\choose i}u^i=I(P_{2M-2};u),
 \qquad M=N-2.                                             \tag{698}
\]

The path independence polynomial `B_M` has simple negative roots.  In the
defect sum (561), only the `q=2` summand can contribute the highest power of
`j`.  If `s=2h` and `m=h+2`, direct leading-coefficient extraction gives

\[
 c_m={(-1)^m[u^s]B_M(-u)B_M(u)\over(p)_{s+4}}.             \tag{699}
\]

Writing `B_M(u)=prod_k(1+u/rho_k)` with `rho_k>0` makes the product in (699)
equal to `prod_k(1-u^2/rho_k^2)`.  Its coefficient at `u^(2h)` has sign
`(-1)^h=(-1)^m`; hence `c_m>0`.

For `s=2h+1`, the odd leading term cancels by reflection.  Define

\[
 W_M(u)=u\{B_M(-u)B_M'(u)-(B_M(-u))'B_M(u)\}.              \tag{700}
\]

The next coefficient gives

\[
 c_m={(-1)^m(p-s-3)[u^s]W_M(u)\over2(p)_{s+4}}.            \tag{701}
\]

The root product yields

\[
 W_M(u)=2u\sum_k{1\over\rho_k}
              \prod_{\ell\ne k}(1-u^2/\rho_\ell^2).       \tag{702}
\]

Thus `[u^(2h+1)]W_M` has sign `(-1)^h=(-1)^m`.  Moreover
`p-s-3=alpha+q+s+2>0` in the upper cone, so (701) is positive.  Equations
(699)--(702) prove

\[
 \boxed{c_{\lfloor s/2\rfloor+2}>0
        \quad\text{for every upper layer }s.}              \tag{703}
\]

This is a genuine arbitrary-layer theorem, not a finite extrapolation.  The
replay `prove_group_top_selector_coefficient.py` verifies the coefficient
extraction symbolically for `s=2,...,12`, with report
`group_top_selector_coefficient_theorem_20260805.json`.  It does not yet
prove every exceptional Jacobi coupling, but it identifies the entering
highest selector term as a path-root-positive object and is the first
uniform algebraic component of the block-growth induction.

## 122. Selector-degree locality proves the universal Jacobi prefix in every layer

The universal-prefix pattern is not an empirical coincidence.  It follows from
a general continuant locality lemma.  Let two polynomial sequences satisfy the
same monic three-term recurrence

\[
 x_{r+1}=(y-a_r)x_r-b_r x_{r-1},
\]

and normalize the two fundamental solutions so that `u_r` is monic of degree
`r` and `v_r` is monic of degree `r-1`.  For arbitrary scalars
`w_0=1,w_1,...,w_D`, put

\[
 A=\sum_{j=0}^D w_j u_{m-j},\qquad
 B=\sum_{j=0}^D w_j v_{m-j}.                             \tag{704}
\]

For `j>=1`, the cross determinant

\[
             u_m v_{m-j}-v_m u_{m-j}                    \tag{705}
\]

has degree at most `j-1`.  This follows by starting with the adjacent
constant Casoratian and applying the three-term recurrence to the larger
index.  Consequently

\[
 {B\over A}-{v_m\over u_m}
 ={\sum_{j=1}^D w_j(u_m v_{m-j}-v_m u_{m-j})\over A u_m}
 =O\!\left(y^{-(2m-D+1)}\right).                         \tag{706}
\]

Write either rational function at infinity as

\[
 {1\over y}\sum_{k\ge0}{\mu_k\over y^k}.
\]

The first `L` Jacobi couplings in its monic J-fraction depend only on
`mu_0,...,mu_{2L}` (equivalently, this is the standard Hankel-determinant
formula for the recurrence coefficients).  Equation (706) therefore makes
the first

\[
 \boxed{L=\left\lfloor{2m-D-1\over2}\right\rfloor
       =m-1-\left\lfloor{D\over2}\right\rfloor}          \tag{707}
\]

couplings of `(A,B)` identical to those of `(u_m,v_m)`.  Only the final
`floor(D/2)` couplings can depend on the selector.

For the full layer selector, `D=m=floor(s/2)+2`.  Hence its `m-1`
couplings split, at every order, into

\[
 \boxed{\left\lfloor{m-1\over2}\right\rfloor
        \text{ universal positive couplings},\qquad
        \left\lfloor{m\over2}\right\rfloor
        \text{ exceptional couplings}.}                 \tag{708}
\]

More generally, deleting the highest `r` selector coefficients puts
`D=m-r` in (707), giving exactly the previously observed prefix
`floor((m-1+r)/2)`.  Thus the scalar audits through layer 100 have now been
replaced by an all-order proof.  The exact rational replay
`prove_group_selector_degree_locality.py` verifies 11,479 cross-determinant
degree instances and 858 coupling-prefix instances through tail order 40;
its report is `group_selector_degree_locality_theorem_20260805.json`.

This theorem removes the universal half of the arbitrary-layer recurrence.
The remaining all-order obligation is precisely the positivity of the final
`floor(m/2)` selector-dependent couplings.

## 123. The Newton selector is exactly a gamma polynomial with two outliers

There is a second all-order identity behind the selector.  Let

\[
 A_{M,s}(z)=\sum_{i=0}^s
 {2M-i-1\choose i}{2M-s+i-1\choose s-i}z^i.
\]

Summing (561) over `j` before applying the outer binomial window gives the
palindromic pre-binomial row

\[
 C_s(z)=(1+z)^{d-4}\{(1+z)^4A_{N,s}(z)
 -2z(1+z)^2A_{N-1,s}(z)+z^2A_{N-2,s}(z)\}.           \tag{709}
\]

Write its gamma expansion as

\[
 C_s(z)=\sum_{h=0}^{m}\gamma_hz^h(1+z)^{p-2h},
 \qquad m=\lfloor s/2\rfloor+2.                         \tag{710}
\]

Then the Newton coefficients in (563) satisfy the exact identity

\[
                         \boxed{c_h={\gamma_h\over(p)_{2h}}}. \tag{711}
\]

Indeed,

\[
 {{p-2h\choose j-h}\over{p\choose j}}
 ={(j)_h(p-j)_h\over(p)_{2h}}
 ={\prod_{r=0}^{h-1}\{j(p-j)-r(p-r)\}\over(p)_{2h}}, \tag{712}
\]

which is exactly the Newton basis used in (563).  Thus the previously
separate palindromic-gamma and Jacobi-selector descriptions are the same
object, coefficient for coefficient.

An exact Sturm audit reveals a remarkably small root defect.  At four cone
points `(alpha,q)=(0,0),(1,2),(5,7),(20,30)`, in every layer `0<=s<=80`,
the degree-`m` polynomial

\[
                         \Gamma_s(t)=\sum_h\gamma_ht^h
\]

has exactly two roots in `[1,infinity)` and all other roots are negative;
at `s=0` the two positive roots coalesce at `1`.  This is 324 exact Sturm
counts through gamma degree 42, plus 7,372 independent exact checks of
(711).  Under `t=z/(1+z)^2`, each negative gamma root gives a pair of
negative roots of `C_s`, while the two positive roots give exactly two
conjugate-reciprocal pairs on the unit circle.  Thus every layer has a
uniform rank-four nonreal defect before the binomial-window repair, matching
the independent rank-four signal in Section 97.

The replay is `probe_group_selector_gamma_root_pattern.py`, with report
`group_selector_gamma_root_pattern_probe_20260805.json`.  Equation (711) is
proved in all orders; the two-outlier root location is presently exact
finite evidence.  Proving it from the path recurrence would reduce the
growing exceptional suffix to two fixed circular factors plus a
negative-rooted factor.

## 124. Every unsigned path-slice gamma factor is negative-rooted in all orders

The negative part of the two-outlier pattern has an all-order proof.  Put

\[
 P_M(u)=\sum_i {2M-i-1\choose i}u^i.
\]

This is the matching generating polynomial of the path on `2M-1` vertices,
so

\[
                    P_M(u)=\prod_{r=1}^{M-1}(1+\lambda_ru),
                    \qquad \lambda_r>0.                         \tag{713}
\]

The binary homogenization of the row `A_(M,s)` from (709) is

\[
 H_{M,s}(x,y)=[u^s]P_M(xu)P_M(yu)
 =e_s(\lambda_1x,\lambda_1y,\ldots,
      \lambda_{M-1}x,\lambda_{M-1}y).                           \tag{714}
\]

The multivariate elementary symmetric polynomial is real stable.  Positive
scaling of variables and diagonalization preserve stability, so (714) is a
stable binary form.  Consequently `A_(M,s)(z)=H_(M,s)(z,1)` has only
negative real zeros.  Its coefficients are invariant under `i -> s-i`, so
it is palindromic.  Pairing reciprocal negative roots writes it as a product
of factors

\[
 z^2+a_rz+1=(1+z)^2\{1+(a_r-2)t\},\qquad
 t={z\over(1+z)^2},\quad a_r\ge2.                               \tag{715}
\]

Thus the gamma polynomial `G_(M,s)` of every `A_(M,s)` has only negative
real zeros.  This removes an empirical hypothesis from Section 123.  In

\[
 \Gamma_s(t)=G_{N,s}(t)-2tG_{N-1,s}(t)+t^2G_{N-2,s}(t),          \tag{716}
\]

all three unsigned components are now proved negative-rooted; the remaining
root-location obligation is solely the signed three-size coupling in (716).

The proof replay `prove_path_slice_gamma_negative_rooted.py` checks 14,876
coefficient identities and 1,082 exact Sturm counts through `M=50` and
`s=30`; its report is
`path_slice_gamma_negative_rooted_theorem_20260805.json`.  Equations
(713)--(715), not the finite range, are the all-order proof.

## 125. Exact factorial factorization of the two-outlier window operator

There is also a simple all-order coefficient formula for the proposed
two-outlier repair lemma.  For an arbitrary polynomial
`Gamma(t)=sum_h gamma_h t^h`, define

\[
 C(z)=(1+z)^p\Gamma\!\left({z\over(1+z)^2}\right),\qquad
 W(z)=\sum_{j=0}^p{p+2\alpha\choose\alpha+j}[z^j]C(z)z^j,
\]

and write `W(z)=(1+z)^pS(z/(1+z)^2)`.  Direct factorial cancellation gives

\[
 \boxed{
 [t^k]S={ (p+2\alpha)!\over(p-2k)!(\alpha+k)!}
 \sum_{h\le k}{\gamma_h(p-2h)!\over
 (p+\alpha-h)!(k-h)!}.}                                      \tag{717}
\]

Thus the gamma-to-gamma window is a positive diagonal scaling, followed by
the Pascal/exponential convolution kernel `1/(k-h)!`, followed by another
positive diagonal scaling.  It also gives the exact recursion

\[
 S_{p,\alpha}[(t+c)\Gamma]
 =cS_{p,\alpha}[\Gamma]+tS_{p-2,\alpha+1}[\Gamma].              \tag{718}
\]

Equation (718) isolates a promising induction on the negative roots of
`Gamma`: in the gamma coordinate, the two terms form the observed Sturm
pair, whereas their inverse images in the original `z` coordinate obscure
that interlacing.

The precise candidate needed by the group cone is now:

> If `deg Gamma=m`, two roots of `Gamma` lie in `[1,infinity)`, all other
> roots are negative, and `p-alpha>=4m-3`, then `S` in (717) is
> negative-rooted.

The bound is exactly the minimum reserve available in the even forest
layers and is conservative in many tested instances.  The new replay
`probe_two_outlier_gamma_binomial_window.py` verifies (717) independently
and gives 1,248 exact Sturm certificates at rational root configurations,
through `m=14` and output gamma degree 31, including the equality boundary
`p-alpha=4m-3`.  Its report is
`two_outlier_gamma_binomial_window_probe_20260805.json`.  Formula (717) is
proved all order; the boxed two-outlier root assertion remains the principal
lemma to prove.

## 126. The two-positive-root base of the window lemma is proved

The candidate lemma in Section 125 is now a theorem when no negative gamma
roots are present.  Let its two roots be `b_1,b_2>=1`, and put
`u=1/b_1`, `v=1/b_2`.  After a positive rescaling,

\[
                         \Gamma(t)=(1-ut)(1-vt),
                         \qquad 0\le u,v\le1.                    \tag{719}
\]

It is enough to work at the boundary `alpha=p-5`; decreasing `alpha` is the
root-preserving Euler step

\[
 Q_{p,\alpha-1}\doteq(E+\alpha)(p+\alpha-E)Q_{p,\alpha}.         \tag{720}
\]

At the boundary, put `N=p+alpha=2p-5`.  Equation (717), or equivalently the
hypergeometric differential identities (553), gives

\[
 F=F^0-(u+v){N\over p(p-1)}t(F^0)'
 +uv{N(N-1)\over p(p-1)(p-2)(p-3)}t^2(F^0)''.                  \tag{721}
\]

After the Jacobi change of variables from Section 88, (721) lies in the
top-three span `p_n+A p_(n-1)+B p_(n-2)`.  The constant and first-order
terms cannot reach `p_(n-2)` in the adjoint degree filtration.  Hence

\[
                         {B(u,v)\over b_{n-1}}
 =uv\,{B(1,1)\over b_{n-1}}.                                  \tag{722}
\]

Equations (547)--(548) already prove
`0<B(1,1)/b_(n-1)<1` in both parities.  Therefore (722) leaves a positive
Jacobi coupling for every `0<=u,v<=1`; the arbitrary coefficient `A` only
changes the last diagonal entry.

It remains to locate the real roots on the negative axis.  If
`F^0=sum_k f_k t^k`, its coefficient multiplier in (721) is

\[
 \rho_k=1-(u+v){N k\over p(p-1)}
 +uv{N(N-1)k(k-1)\over p(p-1)(p-2)(p-3)}.                     \tag{723}
\]

For `k<=floor(p/2)`, each partial derivative of (723) with respect to `u`
or `v` is nonpositive, because at `alpha=p-5`

\[
 { (N-1)(k-1)\over(p-2)(p-3)}={2(k-1)\over p-2}\le1.          \tag{724}
\]

Thus (723) is minimized at `u=v=1`, where strict positivity was proved in
(545).  All coefficients of `F` are positive, so its real zeros are
negative.  Equations (720)--(724) prove

\[
 \boxed{p-\alpha\ge5,\ b_1,b_2\ge1
 \quad\Longrightarrow\quad
 S_{p,\alpha}[(t-b_1)(t-b_2)]\text{ is negative-rooted}.}       \tag{725}
\]

The exact replay `prove_two_positive_gamma_base.py` checks 5,625 rational
Sturm instances through `p=80`, 5,625 independent transform identities, and
1,596 coefficient-monotonicity inequalities.  Its report is
`two_positive_gamma_base_theorem_20260805.json`.  The remaining abstract
step is now exactly the induction that adjoining a factor `t+c`, `c>0`,
preserves the appropriate gamma-coordinate Sturm relation with three units
of reserve.

## 127. The abstract window has at most one unresolved conjugate pair

The possible failure of the Section 125 lemma is now uniformly rank two.
Normalize the constant term of `Gamma` to be positive and factor it as

\[
 \Gamma(t)=A(t-b_1)(t-b_2)\prod_{i=1}^{m-2}(t+c_i),
 \qquad A,c_i>0,\quad b_1,b_2\geq1.                           \tag{726}
\]

In the original palindromic coordinate, each negative factor gives

\[
 (1+z)^2\left({z\over(1+z)^2}+c_i\right)
       =z+c_i(1+z)^2,                                        \tag{727}
\]

which has two negative real zeros.  Each exceptional factor gives

\[
 z-b_i(1+z)^2,                                                \tag{728}
\]

whose discriminant is `1-4b_i<0`.  All unused degree is carried by roots
at `-1`.  Consequently

\[
 C(z)=(1+z)^p\Gamma\!\left({z\over(1+z)^2}\right)
 \quad\hbox{has exactly four nonreal zeros}.                  \tag{729}
\]

The window multiplier

\[
 \lambda_j={p+2\alpha\choose\alpha+j}
 ={(p+2\alpha)!\over(\alpha+j)!(p+\alpha-j)!}                \tag{730}
\]

is complex-zero-decreasing on degree-at-most-`p` polynomials.  Apart from
the positive constant, its first reciprocal factorial is the
standard-basis CZDS `1/Gamma(j+alpha+1)`; its second is the degree-`p`
reversal of the same CZDS.  Reversal preserves the number of nonreal zeros,
and products of diagonal CZDS are CZDS.  Thus the windowed polynomial `W`
has at most four nonreal zeros.

There is also an all-order coefficient-positivity induction.  The
degree-two theorem in Section 126 has strictly positive output
coefficients.  If `Gamma=(t+c)Gamma_0`, equation (718) gives

\[
 S_{p,\alpha}[\Gamma]
 =cS_{p,\alpha}[\Gamma_0]+tS_{p-2,\alpha+1}[\Gamma_0].        \tag{731}
\]

Under `p-alpha>=4m-3`, the two reserves on the right are at least the
inductive threshold `4(m-1)-3`.  Hence every coefficient of `S` is strictly
positive.  In particular, `S` has no nonnegative real zero.  A nonreal
conjugate pair of `S` lifts through `t=z/(1+z)^2` to four nonreal zeros of
`W`.  Combining this observation with (729)--(731) proves

\[
 \boxed{\text{Every real zero of }S\text{ is negative, and }S
        \text{ has at most one nonreal conjugate pair}.}      \tag{732}
\]

Thus the entire abstract lemma has been reduced to excluding one pair,
equivalently to proving the sign of one discriminant or a no-double-root
continuation statement.  The exact replay
`prove_two_outlier_czds_reduction.py` checks 70,200 strict coefficient
inequalities, 3,600 transform identities, and 3,600 exact Sturm bounds
through gamma degree 16 and window degree 72.  Its report is
`two_outlier_czds_reduction_theorem_20260805.json`.  The finite range is a
replay only; (726)--(732) are the all-order reduction.

## 128. One additional negative gamma factor is repaired in all orders

The first nontrivial extension of the degree-two base is now a theorem.
Normalize a cubic with the required root pattern as

\[
 \Gamma(t)=(1-ut)(1-vt)(t+c),\qquad
 0<u,v\le1,\quad c>0.                                      \tag{733}
\]

Its coefficients are

\[
 (\gamma_0,\gamma_1,\gamma_2,\gamma_3)
 =\bigl(c,1-c(u+v),cuv-(u+v),uv\bigr).                     \tag{734}
\]

It is enough to prove the boundary `p-alpha=9`.  Put

\[
 (p,\alpha,n)=
 \begin{cases}
 (2r+10,2r+1,r+5),&p\text{ even},\\
 (2r+9,2r,r+4),&p\text{ odd},
 \end{cases}\qquad r\ge0.                                 \tag{735}
\]

Under the same Jacobi change as in Section 88,

\[
 K(y)=(1-y)^nS\!\left(-{y\over4(1-y)}\right)
     =V_0p_n+V_1p_{n-1}+V_2p_{n-2}+V_3p_{n-3}.             \tag{736}
\]

This identity follows directly from (717).  If `N=p+alpha`, the contribution
of `gamma_h` is `(N)_h/(p)_(2h)` times the top-four coefficient vector of
the falling adjoint operator `(T)_h`, where
`T=y(1-y)D_y+ny`.  The exact recurrence implementation independently
matches (736) against the coefficient transform and the Mobius substitution
in both parities.

Write the monic Jacobi recurrence as

\[
 p_{j+1}=(y-a_j)p_j-b_jp_{j-1},\qquad b_j>0,               \tag{737}
\]

and put `A=V_1/V_0`, `B=V_2/V_0`, `C=V_3/V_0`.  Modifying only the last two
Jacobi diagonals realizes (736) as a characteristic polynomial if the new
terminal squared coupling

\[
 e=b_{n-1}-B+{C(A+a_{n-2}-a_{n-1})\over b_{n-2}}
                 -{C^2\over b_{n-2}^2}                    \tag{738}
\]

is positive.  Clearing `V_0^2b_(n-2)^2` gives

\[
 R=b_{n-1}V_0^2b_{n-2}^2-V_2V_0b_{n-2}^2+V_3V_1b_{n-2}
   +V_3V_0(a_{n-2}-a_{n-1})b_{n-2}-V_3^2.                 \tag{739}
\]

The two Jacobi subdiagonals are positive rational functions of `r`.
After substituting (734), `R` has degree `(2,2,2)` in `(u,v,c)`.  Its
positive common denominator is, respectively,

\[
\begin{aligned}
 D_e={}&(8r+11)^2(8r+13)^4(8r+15)^3
        (8r+17)^2(8r+19)^2(8r+21)^2,\\
 D_o={}&(8r+7)^2(8r+9)^4(8r+11)^3
        (8r+13)^2(8r+15)^2(8r+17)^2.                      \tag{740}
\end{aligned}
\]

Convert the numerator to the tensor Bernstein basis of bidegree `(2,2)`
in `(u,v)`.  At each of its nine tensor indices, the coefficients of
`1,c,c^2` are polynomials in `r` with every coefficient strictly positive.
There are 27 such certificates in each parity.  Hence `R>0` throughout
`0<=u,v<=1`, `c>0`, `r>=0`; (738) is positive and (736) is real-rooted.

The coefficient-positivity induction (731) makes every coefficient of `S`
strictly positive at reserve nine, so `V_0` is nonzero and all real roots
of `S` are negative.  The Mobius change in (736) therefore proves that all
roots are real and negative.  Finally the Euler step (720) propagates from
the boundary to the whole cone.  Thus

\[
 \boxed{p-\alpha\ge9,\quad b_1,b_2\ge1,\quad c>0
 \Longrightarrow
 S_{p,\alpha}[(t-b_1)(t-b_2)(t+c)]
 \text{ is negative-rooted}.}                              \tag{741}
\]

The exact certificate is
`prove_two_outlier_one_negative_factor.py`, with report
`two_outlier_one_negative_factor_theorem_20260805.json`.  It contains all
54 rational-function Bernstein certificates, rejects every floating-point
atom, verifies the positive denominator factors and the terminal matrix
identity, performs six independent exact Jacobi/window comparisons, and
checks 2,556 rational Sturm instances through `p=80`.  Equation (741) is an
all-order theorem; the remaining abstract obligation begins with two or
more additional negative factors.

## 129. Both minimal quartic boundary representatives are negative-rooted

The next gamma degree is

\[
 \Gamma(t)=(1-ut)(1-vt)(t+c)(t+d),\qquad
 0\leq u,v\leq1,\quad c,d>0.                              \tag{742}
\]

At the sharp reserve `p-alpha=13`, the two smallest parity representatives
are `(p,alpha,n)=(13,0,6)` and `(14,1,7)`.  Parameterize the two negative
factors by

\[
 q=\sqrt{cd}>0,\qquad z=c+d-2\sqrt{cd}\geq0,               \tag{743}
\]

so their product is

\[
 (t+c)(t+d)=t^2+(2q+z)t+q^2.                              \tag{744}
\]

This parameterization covers the entire positive `(c,d)` quadrant,
including the repeated-factor face `z=0`.  Equation (717) constructs each
window image `S` exactly over `QQ[u,v,q,z]`.  Let `Delta` be its
discriminant in `t`.  For `(p,alpha)=(13,0)`, `Delta` has 12,090 power-basis
terms, multidegree `(10,10,20,10)` in `(u,v,q,z)`, and 5,998 negative
power coefficients.  For `(14,1)`, the corresponding numbers are 25,082,
`(12,12,24,12)`, and 12,468.  Thus positivity is invisible in the ordinary
power basis.

Convert only `u,v` to their full tensor Bernstein bases, leaving `q,z` in
the ordinary power basis.  The two discriminants become

\[
 \Delta=\sum_{i,j}B_i(u)B_j(v)
       \sum_{a,b}d_{ijab}q^az^b,\qquad d_{ijab}\geq0.       \tag{745}
\]

In the degree-six case there are 14,278 nonzero `d_(ijab)`; in the
degree-seven case there are 28,054.  Every nonzero coefficient is strictly
positive and none is negative.  More strongly, at every one of the 121 or
169 Bernstein indices `(i,j)`, respectively, there is a positive term with
`b=0`.  Since `q>0`, (745) is strictly positive for every
`0<=u,v<=1`, `q>0`, `z>=0`, including all endpoints and `z=0`.

The factorization audit gives a positive rational unit times one
irreducible factor of exponent one in each parity.  Independent exact
specializations agree simultaneously with the direct window transform,
the factorial formula (717), and the univariate discriminant; exact Sturm
counts place all six or seven roots on the negative axis.

The exact argument needs only the all-order reduction (732), not the finite
replay.  That reduction permits at most one nonreal conjugate pair and
excludes nonnegative real roots.  For a real polynomial with `s` nonreal
conjugate pairs, the discriminant has sign `(-1)^s`.  The strict positivity
of (745) therefore forces `s=0`.  Hence

\[
 \boxed{S_{13,0}[\Gamma]\ \hbox{and}\ S_{14,1}[\Gamma]
        \text{ have only distinct negative real roots}.}    \tag{746}
\]

The certificate script is
`prove_two_outlier_two_negative_minimal_boundary.py`; its report is
`two_outlier_two_negative_minimal_boundaries_theorem_20260805.json`.  It
uses only exact `fmpq` polynomial arithmetic, verifies all 42,332 positive
Bernstein coefficients, checks strict support at all 290 tensor indices,
and performs 56 independent transform, discriminant, and Sturm replays.
Equation (746) proves both minimal parity representatives.  It does not yet
propagate along the infinite boundary `(p,alpha)=(2r+13,2r)` and
`(2r+14,2r+1)` for `r>0`; that is the remaining quartic obligation.

Two subsequent exact FLINT screens show that the same cone is not confined
to the bases.  At `(p,alpha)=(15,2)`, all 28,054 nonzero Bernstein/power
coefficients of the discriminant are positive.  At `(16,3)`, the
discriminant has multidegree `(14,14,28,14)`, 46,074 raw power terms (22,885
negative), but after the same `(u,v)` Bernstein conversion all 49,950
nonzero coefficients are positive, with positive `z^0` support at all 225
tensor indices.  These are exact finite extensions, not an induction; they
identify coefficient-cone propagation as a plausible all-order route.  The
reproducible finite probe is
`probe_two_outlier_two_negative_next_boundaries.py`, with reports
`two_outlier_two_negative_next_boundary_p15_probe_20260805.json` and
`two_outlier_two_negative_next_boundary_p16_probe_20260805.json`.

## 130. The quartic gap is exactly adjacent-cubic positive compatibility

There is a sharper all-order formulation of the remaining quartic step.
Fix

\[
 G_c(t)=(1-ut)(1-vt)(t+c),\qquad 0\leq u,v\leq1,\quad c>0,
\]

and define

\[
 U_{p,\alpha}=S_{p,\alpha}[G_c],\qquad
 V_{p,\alpha}=tS_{p-2,\alpha+1}[G_c].                       \tag{747}
\]

The exact recursion (718) gives, for every `d>0`,

\[
 \boxed{S_{p,\alpha}[(t+d)G_c]=dU_{p,\alpha}+V_{p,\alpha}.} \tag{748}
\]

At quartic reserve `p-alpha>=13`, the cubic theorem (741) applies to
`U_(p,alpha)`.  It also applies to the polynomial before the leading `t` in
`V_(p,alpha)`, since its reserve is

\[
 (p-2)-(\alpha+1)=p-\alpha-3\geq10.
\]

Thus both polynomials in (747) are already real-rooted: `U` has strictly
negative roots, while `V` has one root at zero and all remaining roots
strictly negative.  Their coefficients and leading coefficients are
nonnegative and positive, respectively.  Consequently the missing
degree-four theorem is no longer an individual root-location assertion.  It
is precisely

\[
 \boxed{U_{p,\alpha}\text{ and }V_{p,\alpha}
        \text{ are positively compatible}.}                 \tag{749}
\]

Indeed, (749) says that every nonnegative linear combination is
real-rooted, and (748) is exactly the required quartic family.  Conversely,
letting `c,d` range over the positive quadrant supplies every positive
combination in (749), up to scale.  By the standard common-interlacer
criterion for two real-rooted polynomials with positive leading
coefficients, (749) is equivalent to the existence of one degree-`n-1`
polynomial interlacing both `U` and `V`.  In terms of their ordered roots
`u_1<...<u_n` and `v_1<...<v_n`, this reduces to the interval-overlap
inequalities

\[
 u_i<v_{i+1}\quad\hbox{and}\quad v_i<u_{i+1},
 \qquad 1\leq i<n.                                         \tag{750}
\]

Equation (749), rather than positivity of a growing discriminant, is now
the preferred all-order quartic target.  It also explains the earlier
numerical observation that the two neighboring cubic rows need not be in
one fixed proper-position orientation: proper position is stronger than
the common-interlacer condition (750).

An independent exact finite audit constructs both rows directly from (717),
isolates every root in a rational interval, and checks (750) without
floating-point roots.  On the sharp boundary `alpha=p-13`, for every
`13<=p<=30`, every unordered pair
`u,v in {1/10,1/2,1}`, and `c in {1/10,1,10}`, all 324 pairs pass all 3,078
strict overlap inequalities.  The replay is
`verify_two_outlier_adjacent_cubic_common_interlacing.py`, with report
`two_outlier_adjacent_cubic_common_interlacing_20260805.json`.  The reduction
(747)--(750) is all-order; the 324-case root-isolation audit is finite
evidence, not yet the proof of (749).

## 131. A candidate common interlacer from the cubic Jacobi matrix

The abstract common interlacer in Section 130 has a concrete candidate.  It
is enough to work on the quartic boundary `p-alpha=13`; the Euler multiplier
(720) then propagates the result into the cone.  Let

\[
 K_U(y)=(1-y)^nU_{p,\alpha}\!\left(-{y\over4(1-y)}\right).
\]

The two-vertex construction of Section 128 applies directly at reserve
thirteen, not only after abstract Euler propagation.  In both boundary
parities

\[
 (p,\alpha,n)=(2r+13,2r,r+6),\qquad
 (2r+14,2r+1,r+7),                                      \tag{751}
\]

the polynomial `K_U` is the characteristic polynomial of an explicit
positive symmetric Jacobi matrix `M`.  The terminal squared coupling has
the same tensor Bernstein degree `(2,2)` in `(u,v)` and degree two in `c` as
at reserve nine.  All 54 Bernstein/c-power coefficient functions in the two
parities are coefficientwise positive rational functions of `r>=0`.
Therefore this particular Jacobi realization exists in every order on the
whole boundary (751), not merely at the finitely checked orders.

Delete the **first** row and column of `M`, and put

\[
 C(y)=\det(yI-M[1:,1:]).                                  \tag{752}
\]

Cauchy's theorem immediately gives `K_U \prec C`.  Let

\[
 K_H(y)=(1-y)^{n-1}S_{p-2,\alpha+1}[G_c]
       \!\left(-{y\over4(1-y)}\right),                    \tag{753}
\]

where `G_c=(1-ut)(1-vt)(t+c)`.  If the roots of `C` and `K_H` are denoted
in increasing order by `c_1<...<c_(n-1)` and
`h_1<...<h_(n-1)`, respectively, the relation observed on the initial
parameter grid is

\[
 \boxed{0<c_1<h_1<c_2<h_2<\cdots<c_{n-1}<h_{n-1}<1.}      \tag{754}
\]

If uniform, this would be exactly the missing quartic statement in fixed
form.  The Jacobi
transform of `V_(p,alpha)` in (747) is, up to a nonzero constant,
`yK_H(y)`, whose zeros are `0,h_1,...,h_(n-1)`.  Thus (754) says that `C`
interlaces `yK_H`; (752) says that the same `C` interlaces `K_U`.  Hence,
wherever (754) holds, `C` is a literal common interlacer for the adjacent
cubic pair.  Equations
(748)--(749) then prove every quartic row on the boundary, and (720) proves
the entire reserve-thirteen cone.

The matrix-existence part is already an all-order theorem.  Its exact
certificate is `prove_cubic_jacobi_tail_reserve13.py`, with report
`cubic_jacobi_tail_reserve13_theorem_20260805.json`; it contains the 54
positive Bernstein rational functions and six independent Jacobi/window
identity replays.  At this stage the proposed remaining obligation was the
alternation (754); Section 132 gives an exact obstruction to its uniform
form.

An independent exact finite audit reconstructs `M`, verifies its full
characteristic polynomial against (717), forms (752), and isolates every
root in rational intervals.  For every `13<=p<=24`, every unordered pair
`u,v in {1/10,1/2,1}`, and `c in {1/10,1,10}`, all 216 matrices satisfy both
strict interlacings, comprising 3,456 exact interval inequalities.  The
replay is `verify_adjacent_cubic_trailing_minor_interlacer.py`, with report
`adjacent_cubic_trailing_minor_interlacer_20260805.json`.  This audit
identifies the same explicit interlacer in every sampled cell, but its
smallest sampled value was `c=1/10`.

A useful control excludes a tempting stronger matrix shortcut.  If the
current matrix is first Darboux-transformed and compared directly with
`0 direct-sum` the adjacent matrix, their difference is confined to a final
`3 by 3` block, but that block can have inertia `(2,1)`, not `(1,1)`.
`probe_adjacent_cubic_darboux_inertia.py` records ten rational-parameter
obstructions.  This excludes that rank-two difference theorem independently
of the subsequent failure of the fixed-minor target.

## 132. The fixed trailing minor is not uniform; compatibility survives

Equation (754) is false for sufficiently small `c`.  An exact rational
obstruction occurs already at the smallest odd boundary representative

\[
 (p,\alpha,u,v,c)=(13,0,1/2,1/2,1/25).                  \tag{755}
\]

Let `h_1` be the first positive zero of `K_H` and `c_1` the first zero of
the trailing minor (752).  Rational root-isolating intervals prove

\[
                         0<h_1<c_1,                       \tag{756}
\]

the reverse of the first required inequality in (754).  At `c=1/20`, the
same exact calculation gives `0<c_1<h_1`.  The resultant of `C` and `K_H`,
specialized at `p=13,u=v=1/2`, has degree ten in `c` and exactly one positive
zero, lying strictly between `1/25` and `1/20`.  Thus the two polynomials
really collide and exchange their first-root order; this is not numerical
root noise.

This does **not** disprove the quartic statement.  At both rational values
the actual degree-`n` pair `K_U` and `yK_H` still satisfies every strict
interval-overlap inequality (750).  Therefore a common interlacer exists,
but the fixed principal minor (752) is not it throughout the parameter
domain.  As `c` tends to zero, recursion (718) explains the failure:
`S[(t+c)Q]` tends to `tS[Q]`, so the natural common interlacer becomes the
one inherited recursively from the adjacent quadratic rows and is not a
fixed coordinate deletion of `M`.

The exact replay is `disprove_fixed_trailing_minor_uniformity.py`, with
report `fixed_trailing_minor_uniformity_obstruction_20260806.json`.  It
certifies (756), the reversed strict inequality at `c=1/20`, the unique
positive collision interval, and the continued current/adjacent interval
overlap on both sides.  The quartic target reverts to the abstract positive
compatibility statement (749), with a parameter-dependent or recursive
common interlacer required.

A second direct shortcut was tested and rejected.  Rotating only the first
two Jacobi coordinates before taking a principal compression repairs (755)
and many other small-`c` cells, but exact-parameter numerical stress finds
small-`c` cases where no angle in that two-dimensional family works.  This
is consistent with the `c=0` recursive interlacer having support across the
whole Jacobi chain.  No claim from this rotation probe enters the proof.

## 133. The actual compatibility resultant proves both minimal boundaries

The failed minor resultant in Section 132 is not the relevant collision
polynomial.  Return to the actual cubic summands in (747), after the Jacobi
change of variables, and retain their natural (nonmonic) normalizations:

\[
 \mathcal U_c=K_{U_{p,\alpha}},\qquad
 \mathcal V_c=-{y\over4}K_{H_{p-2,\alpha+1}}.             \tag{757}
\]

Both are degree `n`; the factor `-y/4` is exactly the transformed leading
`t` in (747).  At either minimal boundary `(p,alpha)=(13,0),(14,1)`, compute

\[
 \mathcal R_{p}(u,v,c)=
       \operatorname {Res}_y(\mathcal U_c,\mathcal V_c). \tag{758}
\]

Writing `s=u+v`, `q=uv`, exact factorization gives

\[
                         \mathcal R_p=c^2R_p(s,q,c)       \tag{759}
\]

up to a nonzero rational unit.  The residual degrees in `(s,q,c)` are
`(10,9,10)` for `p=13` and `(12,11,12)` for `p=14`; each residual is one
irreducible exponent-one factor.  Substitute `s=u+v,q=uv` and convert the
full `u,v` dependence to the tensor Bernstein basis, leaving `c` in the
ordinary power basis.  After one global sign, **every** coefficient is
strictly positive:

\[
 1331/1331\quad(p=13),\qquad 2197/2197\quad(p=14).         \tag{760}
\]

Thus `R_p(u+v,uv,c)` never vanishes for
`0<=u,v<=1,c>0`.  The cubic theorem already makes the two polynomials in
(757) individually real-rooted.  Their interval-overlap order can change
only when a root of one meets a root of the other, which (758)--(760)
exclude.  One exact rational cell `u=v=1/2,c=1` satisfies all 10 or 12
strict overlap inequalities, respectively.  Connectedness of the parameter
domain therefore proves positive compatibility throughout each minimal
boundary.  This is an independent compatibility proof of (746), avoiding
the quartic discriminant.

The exact certificate is
`prove_quartic_minimal_compatibility_resultants.py`, with report
`quartic_minimal_compatibility_resultants_20260806.json`.  It constructs the
two raw resultants from (717), verifies the `c^2` factorization, certifies all
3,528 positive Bernstein coefficients, and fixes the overlap orientation by
rational root isolation.

Unlike the fixed-minor proposal, this mechanism targets precisely the
abstract compatibility statement (749).  Its all-order gap is also clear:
along (751) the degree of the residual resultant grows with `r`.  A uniform
Sylvester/Bezout total-positivity factorization, or a recurrence proving the
one-sign Bernstein coefficient cone, is now the preferred quartic target.

## 134. Resultant nonvanishing stops at p=16; the collisions are branch-aligned

The actual-resultant certificate in Section 133 propagates one further
boundary step.  At `(p,alpha)=(15,2)`, the factorization (759) has residual
degrees `(12,11,12)` in `(s,q,c)`, and all `2197/2197` coefficients remain
positive after the same `u,v` Bernstein conversion.  Thus the no-collision
proof establishes compatibility there as well.

At `(p,alpha)=(16,3)`, however, the residual degrees are `(14,13,14)`.  The
global box has `3349` positive and `26` negative Bernstein/c-power control
coefficients.  Dyadic subdivision proves positivity on fourteen of the
sixteen depth-two parameter boxes.  The two persistent boxes are the
symmetric corner neighborhoods of `(u,v)=(0,1)` and `(1,0)`.  This is not a
weakness of the basis alone: at `u=0,v=1` the degree-fourteen specialization
in `c` has five negative real roots and one positive real root.

More importantly, the obstruction persists in the interior.  At

\[
                  u={1\over100},\qquad v={99\over100},                 \tag{761}
\]

the exact degree-fourteen residual resultant has one simple positive zero,
isolated in

\[
 {290493\over1054534}<c_*<{353419\over1282965}.                         \tag{762}
\]

Rational root isolation at both endpoints of (762) proves that the lower
seven branches of the two degree-eight rows continue to alternate.  Only
the two largest roots exchange order across the interval.  Since (762)
contains exactly one simple resultant zero, at `c_*` the collision is a
same-index collision of the largest roots.  Numerically the common root is
about `0.99438591756`, but the classification itself uses only rational
isolating intervals and the unique-zero count.

Consequently, uniform nonvanishing of (758) is false from `p=16` onward and
cannot be the all-order quartic proof.  The compatibility statement is not
injured: a same-index collision is weakly interlacing, and every positive
linear combination retains the common factor.  The correct uniform target
is therefore stronger in structure but weaker in separation:

\[
 \boxed{\text{the adjacent cubic rows weakly interlace, and every common
 root is branch-aligned.}}                                               \tag{763}
\]

The exact finite records are
`quartic_compatibility_resultant_p15_probe_20260806.json`,
`quartic_compatibility_resultant_p16_probe_20260806.json`, and
`quartic_compatibility_resultant_p16_subdivision_20260806.json`.  The exact
interior collision and branch classification are replayed by
`certify_quartic_compatibility_p16_branch_collision.py`, with report
`quartic_compatibility_p16_branch_collision_20260806.json`.

## 135. A Darboux inertia theorem proves one overlap inequality in all orders

The rank-three Darboux comparison rejected in Section 131 contains a valid
one-sided theorem.  Work on the reserve-thirteen boundary (751).  Let `M`
be the positive Jacobi matrix whose characteristic polynomial is the
current cubic row `K_U`, and write its Cholesky factorization as

\[
                              M=LL^T.                         \tag{764}
\]

The Darboux partner `A=L^TL` has the same spectrum as `M`.  Let `J_H` be
the positive Jacobi matrix for the adjacent cubic row `K_H`, and embed it
as

\[
                       B=J_H\mathbin\oplus 0,                 \tag{765}
\]

with `J_H` in the first `n-1` coordinates.  The classical Jacobi prefixes
of `A` and `B` agree.  Consequently

\[
                         D=A-B                                \tag{766}
\]

vanishes outside its final `3 by 3` principal block.

All entries of this block are obtained from the two cubic terminal tails
and the final three Cholesky pivots.  Eliminating the positive last pivot
by a Schur complement leaves

\[
 \mathcal S=
 \begin{pmatrix}
 x&\sqrt{\rho_1}-\sqrt{\rho_2}\\
 \sqrt{\rho_1}-\sqrt{\rho_2}&z
 \end{pmatrix},
 \qquad \rho_1,\rho_2>0.                                    \tag{767}
\]

Put

\[
 L_* =\rho_1+\rho_2-xz,
 \qquad G_*=L_*^2-4\rho_1\rho_2.                            \tag{768}
\]

Then

\[
 \det\mathcal S=-L_*+2\sqrt{\rho_1\rho_2}.                 \tag{769}
\]

The exact symbolic calculation gives `L_*>0` and `G_*>=0` in both
parities, for every `r>=0`, `0<=u,v<=1`, and `c>0`.  The certificate is
small after cancellation.  The numerator of `L_*` has degree `(2,2,2)`
in `(u,v,c)`, and all `27/27` tensor-Bernstein/c-power controls are
coefficientwise positive in `r`.  Its two nontrivial denominator factors
each have `8/8` positive controls.

The numerator of `G_*` has degree `(4,4,4)` and 91 power terms.  In odd
parity its Bernstein controls comprise 88 positive, 3 mixed, and 34 zero;
in even parity they comprise 88 positive, 1 negative, 2 mixed, and 34
zero.  In both cases the only nonpositive or mixed controls are
`(i,j,k)=(1,1,k)`, `k=0,1,2`.  They are absorbed by their two symmetric
neighbors using the exact Bernstein inequality

\[
 B_2^4(u)B_0^4(v)+B_0^4(u)B_2^4(v)
 \ \ge {3\over4}B_1^4(u)B_1^4(v),                           \tag{770}
\]

which is just `6(a^2+b^2)>=12ab` after removing positive boundary
factors.  Each of the six paired controls

\[
                         b_{11k}+{3\over4}b_{20k}             \tag{771}
\]

factors into manifestly positive linear factors times a polynomial in `r`
whose every coefficient is positive.  Thus `G_*>=0` on the closed box and
is strict away from the degree-drop corner `u=v=0`; that corner follows by
continuity.  Equations (768)--(771) give `det mathcal S<=0`.  In the
interior, `mathcal S` has inertia `(1,1)`, so (766) has inertia

\[
                              (2,1,n-3).                      \tag{772}
\]

At the parameter boundary it still has at most one negative direction.

Let the roots of `K_U` and `yK_H` be

\[
 0<u_1\le\cdots\le u_n<1,
 \qquad 0=v_1\le v_2\le\cdots\le v_n<1.                    \tag{773}
\]

Since `A` and `B` have these two spectra and `A-B` has at most one
negative direction, the min--max principle gives

\[
                    \boxed{v_i\le u_{i+1}\quad(1\le i<n).}  \tag{774}
\]

This is one complete half of the common-interlacer criterion (750), in
both parities and every boundary order.  It also explains why the old
`(2,1)` inertia pattern was not a failure: only the number of negative
directions is relevant for (774).  The remaining quartic obligation is now
only the complementary inequality

\[
                              u_i\le v_{i+1}.                 \tag{775}
\]

The derivation and caches are
`prove_one_sided_adjacent_cubic_darboux_inertia.py`; the exact sign audit is
`audit_one_sided_darboux_bernstein.py`, with report
`one_sided_adjacent_cubic_darboux_inertia_20260806.json`.  An independent
replay matches 48 direct tail entries, 24 Cholesky/Schur expressions, and
41 rational root-isolation inequalities; it is
`verify_one_sided_adjacent_cubic_darboux_inertia.py`, with report
`one_sided_adjacent_cubic_darboux_replay_20260806.json`.
