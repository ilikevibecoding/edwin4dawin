# Proof-chain audit after the two-network breakthrough

Date: 2026-08-03

## Result now proved

Sections 65--74 of `NYQUIST_RESERVE_INDUCTION_LEMMA_2026-08-02.md` now
give an all-order proof of the bottom Catalan sandwich theorem.  The two
rectangular factors in (346) are TN for every finite order:

\[
\mathcal L_q\text{ is TN by (424)--(436)},\qquad
\mathcal R_q\text{ is TN by (437)--(470)}.
\]

After the adjacent duplications and row-sum insertions of Section 65,
Cauchy--Binet therefore proves that

\[
T_q(t)=U D^{(m)}V+t(UP)D^{(1)}(RV)+tU D^{(1)}(PV)
\]

is TN for every `q` and every `t>=0`.  Its diagonal is positive, so the
terminal upper factor at `t=1` is nonsingular TN.

Combining this with the already-proved strict Catalan moment factor in
(319)--(323) proves the square quotient `Y_q` STP.  The implications already
established in Sections 54--60 then give:

1. the maximal bottom coefficient theorem (191);
2. the selected coefficient rectangle theorem (296);
3. strict total positivity of the actual Newton forward matrix (275);
4. strict total positivity of the actual reversed bottom Schur tail;
5. real stability of the bottom reverse-Borel endpoint family (23);
6. by the derivative closures in (19)--(20), real stability throughout the
   full hard-bottom reserve cone.

This is a proof of a major uniform lemma that had previously been supported
only by finite Neville audits.  The exact replay artifacts are
`full_left_core_network_proof_20260803.json` and
`full_right_factor_network_proof_20260803.json`.

## Why this is not yet a proof of Erdős 993

The proof above closes the hard-bottom **reserve** endpoint, not all of the
tree-unimodality chain.  At least the following independent uniform steps
remain.

1. **Hard-group reserve endpoint.**  The group endpoint (21) is the
   defect-one, two-step Catalan target

   \[
   S^{2m+1}Q^2(g_{3m+4,1}\otimes g_{3m+4,1}),
   \]

   whereas the theorem just proved handles the one-step defect-three target
   `S^(2m+1) Q(g_(3m+3,3) tensor g_(3m+3,3))`.  The formal identity
   `g_(N,1)=D g_(N+1,3)` relates them, but a second application of `Q` is not
   a generic stability preserver.

2. **Original affine target comparison.**  Negative-rootedness/Hurwitz
   stability of the reserve polynomial is only the reference half of the
   affine-increment proof.  One must still prove the required index-two
   comparison or an equivalent signed-block/utilization-convexity theorem
   for the original target polynomial, uniformly in all ten parity and
   parameter directions.

3. **Final propagation audit.**  Once the two affine packages are proved,
   the already-established quadratic kernel, positive-tail, finite-base,
   and pendant-reduction results must be assembled in one formal theorem
   chain to the independence-sequence inequality.  No new obstruction is
   currently known in those proved components, but this assembly has not
   yet been written as a gap-free final proof.

Accordingly, the present result must be described as a solved central lemma,
not as a solution of the 1987 conjecture.

## Next mathematical target

The closest structural continuation is the group endpoint.  If

\[
F_{M,d}=S^d(g_{M,3}\otimes g_{M,3})
         -S^{d-2}(g_{M-1,3}\otimes g_{M-1,3}),
\]

then the exact derivative relation `D g_(M,3)=g_(M-1,1)` gives the group
target as

\[
\boxed{
G_{N,d}=D_XD_Y\bigl(F_{N+1,d}-F_{N,d-2}\bigr).}
\]

Both `F` terms are now individually stable by the bottom theorem in the
relevant range.  The next sharp obligation is therefore to prove stability
of their one fixed contiguous difference.  Promoting its coefficient to an
extra variable and seeking uniform proper position is false already at
`m=1`, `Y=0`, `u=3`; the exact degree-eight specialization has only six real
roots (see `verify_group_bottom_difference_pencil_counterexample.py`).  The
required value `u=1` is not affected and continues to pass exact tests.  The
viable route is the fixed square-kernel's scaled-bottom nesting and a
parameter-dependent signed factorization, not the stronger pencil.

## Literature-status refresh

A fresh search on 2026-08-03 found no general proof or counterexample.  In
particular, Galvin and Sharpe, *Australasian Journal of Combinatorics* 94(1)
(2026), 93--121, explicitly describe the Alavi--Malde--Schwenk--Erdos tree
question as "still open":

https://ajc.maths.uq.edu.au/pdf/94/ajc_v94_p093.pdf

Li's March 2026 preprint proves unimodality for two special infinite tree
families and continues to state the general forest assertion as Conjecture
1.1, rather than resolving it:

https://arxiv.org/abs/2603.03025

The current Erdős Problems and formal-conjectures records also list Problem
993 as open.  This is a status check, not evidence for any mathematical step
in the present proof chain.

## Group-route update after the pencil obstruction

The false variable-`u` pencil is not the end of the transfer route.  The
already-proved two rectangular TN networks extend the bottom middle factor
from

`D0-R D1 R`

to

`D0-t R D1 R=(D0-t D1)+t P D1 R+t D1 P`

for every `0<=t<=1`.  Since `D0-tD1` is positive diagonal, the same
subtraction-free Cauchy--Binet network proves the scaled bottom family
`lambda B-T Bprev T^T` for every `lambda>=1`.  In particular, the kernel
`B+A1` at `lambda=2` is now proved uniformly.

Formal coefficient multiplication then gives the exact all-order nesting

`A2_d = B_d - T_U (B_(d-2)+A1_(d-2)) T_U^T`.

Thus the fixed group `Q^2` kernel is one Catalan congruence of a newly proved
scaled-bottom kernel.  See `prove_scaled_bottom_kernel_network.py` and
`scaled_bottom_kernel_network_proof_20260803.json`.

The initially observed Schur-tail signature through `m=7` is not uniform:
at `m=14` the exact full determinant is negative where the old formula
predicted positive.  This is certified by
`verify_group_schur_signature_transition.py`.  It has not produced a group
stability failure: three exact degree-59 Sturm restrictions at `m=14` still
have all 59 roots real, replayed by
`verify_group_m14_sturm_transition.py`.  The remaining group obligation is
therefore a parameter-dependent composition theorem for the nested networks,
not the false fixed-sign or proper-position claims.

The transition size also survives a wider exact coordinate audit.  At
`m=14`, 49 integer specializations of `Y` (a grid through `[-50,50]`, eight
values through `+-1000`, and twenty deterministic values through about
`+-5000`) each leave a degree-46 polynomial in `X` with exactly 46 real
roots by Sturm's theorem.  This is replayed by
`verify_group_m14_coordinate_sturm_screen.py`, with report
`group_m14_coordinate_sturm_screen_20260803.json`.  It is strong finite
evidence, not an all-order stability theorem.

The square-kernel nesting has now also been eliminated at the Schur level.
For `A=B-TPT^T`, with `P` the scaled-bottom `lambda=2` kernel, block `LDU`
and Woodbury give the exact all-order decomposition

`Sigma_A=-Ttilde K Ttilde^T-Ttail Sigma_P Ttail^T`,

where `K=(Pcc^(-1)-E)^(-1)` and
`Ttilde=Tc+Ttail Pfc Pcc^(-1)`.  The correction `E` is supported entirely
in the natural scaled-bottom core.  Exhaustive exact component audits
through `m=7` find the inherited summand STP and the core summand strictly
sign regular with signs `+,+,(-1)^k` for `k>=3`.  Their sum is the group
tail.  See `explore_group_nested_schur_decomposition.py` and
`group_nested_schur_decomposition_probe_20260803.json`.

Fast exact determinant arithmetic confirms that the old full-tail signature
fails at several later sizes (`14,15,22,32,33,40` through `m=40`), and fixed
Schur-boundary shifts through four positions do not remove the phenomenon.
See `scan_group_schur_determinant_signs_flint.py` and
`probe_group_shifted_schur_boundaries.py`.  The surviving proof target is a
composition/variation theorem for the two structured summands, not a fixed
minor-sign certificate.

## Quadratic-Euler parent update

The three defect-one group seeds now have one all-order negative-rooted
parent.  With `E=X D_X`,

`A_N=g_N+4(N-1)/(2N-3)g_(N-1)+(2N-1)/(2N-3)g_(N-2)`,

and `g_N,g_(N-1),g_(N-2)` are respectively the three quadratic Euler images
in (502) of the main note.  The parent is

`2(2N-1)X 2F2(-(N-1),N-1;3/2,2;-X/4)`.

Its nonzero factor is a multiplicative finite-free product of a Laguerre
polynomial and a positive combination of two consecutive fourth-kind
Chebyshev polynomials.  This proves its nonpositive real-root geometry in
all orders.  It also gives an exact Haar rank-two compression representation
for `g_N` after padding the root diagonal to dimension `2N-1`.  The identities,
finite-free factorization, and certified roots through `N=60` are replayed by
`verify_defect1_quadratic_euler_parent.py` and
`defect1_quadratic_euler_parent_20260804.json`.

This is a genuine structural narrowing, not yet the group proof.  The full
parent-to-group bounded-degree symbol fails already at `m=1`, so the result
must be used through the special Chebyshev/finite-free or rank-two-frame
model.  A local minor-orthogonal/mixed-characteristic composition theorem is
now the sharp route.  The first Schur transitions remain compatible with
sign regularity, but that also fails as a global certificate: the `m=32`
reversed tail already has mixed entry signs.  In contrast, 300 new exact
random line restrictions at `m=14,15`, and all designated restrictions at
`m=22,32,40`, remain completely real-rooted.  These are finite controls, not
a proof.

## Signed-quadratic Chebyshev update

The same parent now gives a second proved all-order lemma.  The signed
quadratic

\[
 g_N(X)Z^2-2g_{N-1}(X)Z+g_{N-2}(X)
\]

factors, before the common `1/(k+1)!` multiplier, into two consecutive
Chebyshev linear pencils.  It is therefore real stable, and degree-two Grace
apolarity proves the unsmoothed core

`g_N(X)g_N(Y)-2g_(N-1)(X)g_(N-1)(Y)+g_(N-2)(X)g_(N-2)(Y)`

real stable.  The replay is
`verify_defect1_signed_quadratic_factorization.py`, with report
`defect1_signed_quadratic_factorization_20260804.json`.

This closes the unshifted apolar core but not the group endpoint: the
required smoothing orders are `d,d-2,d-4`, and a common derivative of the
apolar core does not produce them.  The remaining group obligation is now
the corresponding graded higher-degree apolar contraction.  Forty further
exact degree-131 positive-direction restrictions at the first mixed-entry
size `m=32` all have 131 simple real roots; see
`fast_group_line_sturm_search_m32_20260803.json`.  This is finite evidence,
not a substitute for that contraction theorem.

## Positive-core and polarized-contraction update

The signed apolar core has now also been proved coefficientwise positive in
all orders.  With
`c_(N,a)=binom(N+a-1,N-a)/a!`, its `(a,b)` coefficient is
`c_(N,a)c_(N,b)` times the explicit positive rational factor in (517); the
only nontrivial bracket is increasing in `a,b` and has minimum `(N-1)^2`.

More importantly, the group endpoint has the exact two-slot form (520).  The
stable positive polarization

`Phi_N=g_N+g_(N-1)(z1+z2)+g_(N-2)z1z2`

is acted on by
`S^(d-4)(S^2-D_z1D_w1)(S^2-D_z2D_w2)` and then the state variables are set
to zero.  Expanding the four multi-affine states gives exactly the coefficients
`1,-2,1` and derivative orders `d,d-2,d-4`.  This turns the former vague
graded-apolar obligation into two matched rank-one complement contractions,
the differential analogue of the proved nested scaled-bottom identity (491).

No generic preserver claim is being made: the natural shifted-triangle symbol
fails at the first endpoint.  The remaining proof target is special-input
closure of (520), most plausibly by realizing the Chebyshev/finite-free
polarization as a Borcea--Branden mixed determinant or by a direct composition
of the scaled-bottom network.  The replay is
`verify_defect1_positive_apolar_core.py` with report
`defect1_positive_apolar_core_20260804.json`.

## Squarefree-core closure and graded-lift audit

Sinclair's 2026 squarefree-algebra stability theorem supplies an independent
all-order proof of the same signed core.  The signed polarization

`Psi_N=g_N z1z2-g_(N-1)(z1+z2)+g_(N-2)`

and the positive inverted polarization `Phi_N` are both stable.  Their
squarefree product modulo `z1^2,z2^2` is stable, and its top `z1z2`
coefficient is exactly the signed core.  This identity is now replayed for
`3<=N<=30` by the updated positive-core verifier.  The argument is all order;
the finite range is only an expansion check.

The tempting graded extension is also now decided.  A four-marker lift with
directional pairs `D_X+-cD_zi` has top squarefree coefficient exactly equal
to the unsmoothed group contraction whenever the two factor parameters obey
`2ab=1`.  But exact Sturm restrictions show that the rational pair
`a=3/4,b=2/3` has unstable individual lifts.  For `a=1,b=1/2`, even the full
squarefree convolution after the actual first endpoint smoothing has a
degree-11 restriction with only nine real roots.  Hence the endpoint cannot
be obtained by asserting stability of this larger marker parent; only its
top graded coefficient retains the observed stability.

The generalized-singular-value convolution route has likewise been sharply
localized.  Its support agrees with the even group source after one `S`
derivative is peeled, but the ambient factorial weights do not: the first
exact comparison has 46 distinct ratios.  The correctly normalized target
symbols are irreducible over `QQ[z,w]` at `m=1,2,3` (degrees `8,12,16`), so
there is no literal product of the two proposed bottom symbols.  These
negative results are recorded by
`probe_group_squarefree_derivative_lift.py`,
`probe_group_full_squarefree_convolution.py`,
`verify_group_gsv_convolution_identity.py`, and
`probe_group_gsv_symbol_factorization.py` with their JSON reports.

The remaining group obligation is unchanged but narrower: prove stability of
the top graded coefficient in (524), equivalently the special contraction
(520), without promoting either false stronger parent.  A mixed determinant
for that coefficient itself, or a direct composition theorem for the nested
scaled-bottom network, remains viable.

## Inverse-Bezout/Stieltjes update

For every squarefree equal-direction polynomial `q`, direct evaluation of
the Bezout kernel at its roots proves that `Bez(q,q')^(-1)` is Hankel.  After
checkerboard conjugation its moments are

`mu_k=sum_r (-r)^k/q'(r)^2`.

The terminal monic orthogonal polynomial is `(-1)^n q(-x)/lc(q)`.  If `T_s`
denotes the order-`s` trailing principal minor of the Bezout matrix, the
off-diagonal Jacobi parameters are exactly

`beta_k=T_(n-k-1)T_(n-k+1)/T_(n-k)^2`.

Exact symbolic extraction at `(4,5)` and `(7,7)` reconstructs the full
three-term recurrence and finds every `alpha` and `beta` numerator and
denominator coefficientwise nonnegative in `gamma`; the `beta` data are
even in `gamma`.  This turns the equal-direction target into a concrete
positive Jacobi-parameter problem.  It is equivalent to positivity of the
translation-invariant Hermite/trailing-minor chain, so it is a structural
reformulation rather than a completed new proof.  See Section 107 and
`analyze_equal_direction_inverse_bezout_jacobi.py`.

## Odd-path--Laguerre mixed-characteristic update

The defect-one seed now has an explicit positive-semidefinite matrix model.
Before the `1/a!` multiplier,

`p_N(T)=sum_a binom(N+a-1,N-a)T^a`

is the reversed matching polynomial of the odd path `P_(2N-1)` and equals

`det(TI_N+(0 direct-sum tridiag(1,2,1)_(N-1)))`.

Its nonzero roots are therefore
`-4 cos^2(j*pi/(2N))`.  Moreover `N!g_N` is its degree-`N`
multiplicative finite-free convolution with the monic Laguerre polynomial
`N!L_N(-T)`.  This gives the seed a concrete PSD path/Laguerre random-matrix
model rather than only a hypergeometric factorization.

The whole positive polarization has the stronger exact formula (529).  Let
`A_N=0 direct-sum tridiag(1,2,1)_(N-1)` and mark the two endpoints of the
path block.  Then `N!Phi_N` is obtained by applying

`(1+D_U+z1 D_left+z2 D_right)^N`

to `det(TI+UA_N+e_left E_left+e_right E_right)` and setting the auxiliary
variables to zero.  A single endpoint state uses one of the `N` slots; the
two labeled states use two distinct slots, producing the falling factorials
`N` and `N(N-1)` and exactly the coefficients `g_N,g_(N-1),g_(N-2)`.

This explains why literal GSV multiplication had the wrong factorials: it
lost the without-replacement coupling between two explicit endpoints and the
mixed-characteristic slots.  The remaining group target is now a two-endpoint
exclusion theorem for two explicit PSD path pencils.  The identities are
replayed by `verify_defect1_path_laguerre_model.py` and
`defect1_path_laguerre_model_20260804.json` (6,478 coefficient checks through
`N=80`, plus the polarized mixed-characteristic identity through `N=14`).

## Marker-parent obstruction and linear-cone update

The symmetric derivative-slot parent

`H_(N,d)=(1+TS)^d gg-2T^2(1+TS)^(d-2)hh+T^4(1+TS)^(d-4)jj`

has `[T^d]H_(N,d)=G_(N,d)` exactly.  Its state selector is the polarization
of `(1-qT^2)^2`, so the slot-selection polynomial itself is stable.  This is
the cleanest common normalization found so far.

Three exact obstructions prevent overclaiming it.  The bounded-degree
algebraic symbol fails at `N=d=7` on a degree-18 line with only 16 real
roots; the reverse-Borel parent fails on a degree-14 line with only four;
and `H_(7,6)` itself has a degree-14 line with only 12 real roots.  The
actual top coefficient remains clean, and `H_(7,7)` passed 300 exact lines,
but no generic marker-parent theorem is available.

The counterexamples exposed a simpler candidate theorem for the target
itself.  Since `G_(N,d+1)=S G_(N,d)`, one stable smoothing order controls all
larger ones.  Exact threshold mapping suggests the uniform cone

`2d-N>=5  =>  G_(N,d) real stable`.

The first order in that cone passed 20 exact positive-direction Sturm lines
for every `4<=N<=39`, with zero failures.  The immediately lower order gave
exact failures in 24 sizes; the complete replay contains 1,003 lines.  A
separate 333-cell map through `N=30` agrees.  This remains finite evidence,
not a proof.  It is nevertheless a major reduction because every Erdős
endpoint satisfies `2d-N=m+6`, strictly inside the cone.  The reports are
`group_linear_smoothing_cone_probe_20260804.json` and
`group_target_smoothing_threshold_probe_20260804.json`.

### Top homogeneous cone update

The highest-degree homogeneous component of `G_(N,d)` is now proved stable
throughout the relevant cone `2d-N>=5` (with `0<=N-d<=d-5`).  At the boundary
`N=2d-5`, its palindromic row polynomial is a quadratic Euler multiplier of
a hypergeometric seed.  Gamma transformation turns the seed into a Jacobi
polynomial and the target into a combination of only the top three monic
Jacobi polynomials.  The last recurrence coupling is reduced by an explicit
strictly smaller positive amount, so the target is the characteristic
polynomial of a real symmetric tridiagonal matrix.  A two-factor Euler
lowering identity propagates the result from the boundary through the whole
cone.  This is an all-order theorem, not a finite root screen.  Section 88 of
the main note contains the proof; `verify_group_top_homogeneous_cone.py` and
`group_top_homogeneous_cone_20260804.json` replay 46 exact boundary sizes and
325 exact lowering identities.  The unresolved item is now the interlacing
or common homogenized-stability relation among all homogeneous layers.

The second-highest homogeneous component is now proved as well, for every
cell in the same cone with `N-d>=1`.  Its row polynomial has an exact
quadratic Euler-selector formula with parameters
`p=d+1, alpha=N-d-1`.  Gamma transformation again gives a quadratic
differential image of `P_floor(p/2)^(alpha,+/-1/2)`.  The last modified
Jacobi coupling is strictly smaller than the original one; after introducing
the cone slack `q=p-7-alpha`, both parity calculations have the same
strictly positive polynomial numerator (equation (558)).  Section 89 gives
the proof.  `verify_group_second_homogeneous_cone.py` and
`group_second_homogeneous_cone_20260804.json` replay the row identity and
negative root counts in 325 exact cone cells.  This strengthens the layer
evidence to two consecutive all-order theorems, but does not yet establish
the common homogenized stability of their sum with every lower layer.

## Wishart and mixed-determinant update

The path--Laguerre model is now literal rather than merely finite-free.  For
standard complex Gaussian `Z` of size `N` and
`A_N=0 direct-sum C_(N-1)`, the Gaussian minor moment gives

`N!g_N(X)=E det(XI+A_N^(1/2)ZZ* A_N^(1/2))`.

Deleting one or both path endpoints and the same number of Gaussian columns
gives `(N-r)!g_(N-r)`.  The labeled choices restore the common scale by
`(N)_r(N-r)!=N!`, exactly explaining the state-slot factors in (529).

There is also a direct instance of Borcea--Branden's ordered-partition mixed
determinant.  For positive-definite `A` and rank-one all-ones `J`,

`det(A) eta(XA^(-1),J,...,J)=sum_R (n)_(|R|)det(A[R])X^(n-|R|)`.

This follows immediately from Jacobi complementation and the injections of
the complementary indices into the labeled rank-one factors.  A positive
limit handles the singular path covariance, and a block-supported
two-variable version represents `g_N(X)g_N(Y)` by PSD matrix pencils.
Borcea--Branden's master theorem therefore covers every unsigned ingredient.
The only missing step is to place the two correlated endpoint/column
deletions, their signs `1,-2,1`, and total order `d` into one ordered-
partition pencil.  The observed cone `2d-N>=5` is the precise proposed range
for that final exclusion composition.

The all-order Gaussian/Jacobi identities are replayed through `N=40`, with
228 endpoint normalizations and nontrivial mixed determinants through size
seven, by `verify_defect1_wishart_mixed_determinant_model.py` and
`defect1_wishart_mixed_determinant_model_20260804.json`.

## General homogeneous-layer and Bezout update

The homogeneous-layer calculation has now been generalized exactly.  For
deficit `s<=r=N-d`, removing the forced monomial leaves a degree `p=d+s`
row.  Its coefficient is the explicit three-state convolution (560)--(561)
in the main note.  Dividing its selector by `binom(p,j)` and using the
quotient (562) shows, in all orders, that it is a reflection-symmetric
polynomial in `j` and therefore a polynomial in `lambda=j(p-j)` of degree at
most `floor(s/2)+2`.

The apparent lower-layer exception has also disappeared.  For `s>r`, remove
the formal endpoint zeros and write `k=s-r`.  The residual degree is `N-k`,
the Jacobi parameter is `k`, and the same selector is simply evaluated at
`kN+h(N-k-h)`.  Uniformly across the full diamond, the residual degree and
parameter are therefore

`p_s=N-|r-s|, alpha_s=|r-s|`.

Hence every homogeneous layer is a finite-band Jacobi modification, with
the bandwidth controlled by `floor(s/2)+3`.  This proves the complete
selector/bandwidth statement uniformly; it does not yet prove the required
positivity of every growing boundary block.

The exact finite audit is notably clean.  Across all 552 layers in complete
diamonds through `d=12`, the formula matches the full group coefficient
matrix, every selector obeys the proved degree bound, the Jacobi support is
consecutive, and every residual row has only negative real zeros.  All 516
consecutive rows strictly interlace.  That last statement was then certified
without floating point: all 516 adjacent Bezout matrices are positive
definite by exact integer leading-principal-minor tests, in sizes through 19;
all their entries are positive as well.  An exhaustive initial probe also
finds all 4,153,899 square minors of 17 Bezout matrices strictly positive.
The replays and reports are
`verify_group_general_homogeneous_layers.py`,
`group_general_homogeneous_layers_20260804.json`,
`verify_group_adjacent_layer_bezout.py`, and
`group_adjacent_layer_bezout_20260804.json`, plus the explicitly finite
`probe_group_adjacent_bezout_total_positivity.py` and its JSON report.

This is substantial new compatibility evidence but not the full group proof.
The immediate algebraic target is now explicit: factor the adjacent
Bezoutian (567) uniformly as a positive Gram/network matrix.  That would
cover every layer, but one must still prove the global compatibility of all
homogenizing-variable coefficients; pairwise interlacing alone is not being
treated as sufficient.  The mixed-determinant correlated-deletion route
remains the best candidate for closing that global step in one construction.

## Spectral determinant and quadrature-bridge update

The positive polarization now has a single Hermitian determinantal
representation.  With `p=N!g_N`, `q=N!g_(N-1)`, and `r=N!g_(N-2)`, stability
of `Phi_N` implies both the positive-residue expansion of `q/p` and the
Rayleigh inequality `H=q^2-pr>=0` on the real axis.  Factor
`H=b conjugate(b)`.  The residues give a PSD root diagonal `A` and a vector
`u`; the values `b(lambda_j)/q(lambda_j)` give unit phases for a second vector
`v`.  The rank-two determinant lemma then gives, in all orders,

`N! Phi_N(X;z1,z2)=det(XI+A+z1 uu*+z2 vv*)`.

The endpoint vectors both have squared norm `N`.  This representation is
replayed through `N=30` by
`verify_defect1_phi_spectral_determinant.py` and its JSON report.

The two endpoint contractions also collapse to a single mixed derivative.
For rank-one directions `E_i=a_i a_i*`, `F_i=b_i b_i*`, put an off-diagonal
Hermitian bridge between the two determinant blocks.  Give the first bridge
phase `1`, the second phase `i`, scale both by `1/sqrt(2)`, and add the block
identity.  Expanding two derivatives in each bridge shows that the equal-pair
terms give `-D_Ei D_Fi`, the four-bridge term gives the desired double
endpoint product, and the only unwanted cross cycle is proportional to
`Re(1 conjugate(i))=0`.  Hence equation (572) is an all-size identity even
when the two endpoint vectors within a block are nonorthogonal.

Combining this with the spectral determinant gives the exact reduction

`(N!)^2 G_(N,d)=D_I^(d-4) D_B1^2 D_B2^2 det((XI+A) direct-sum (YI+A))`.

This completely removes the former without-replacement normalization gap.
It is not yet the proof: each bridge direction has eigenvalues
`1+-N/sqrt(2)` and therefore one negative eigenvalue.  Ordinary PSD
directional closure is unavailable.  The remaining group theorem is now an
indefinite mixed-discriminant statement for exactly two quadrature rank-one
bridges after `d-4` identity derivatives, conjecturally in the observed cone
`2d-N>=5`.  `probe_two_endpoint_psd_lift.py` records the exact larger-size
cross-cycle cancellation and the failure of equal real phases.

## Generic-obstruction and positive-kernel update

The single-determinant reduction is now sharply separated from false generic
extensions.  Exact positive-direction Sturm witnesses rule out arbitrary
two-slot determinants, equal single-slot polynomials, target Gram
normalization by itself, and even target Gram normalization together with the
uniform atom bound `w_i<=27/10`.  The last failure occurs at `N=8,d=7` on a
degree-nine line with only seven real roots.  The mixed compound tensor is
also indefinite at the smallest case, and the natural principal-minor
selector has negative coefficients in the cone.  Therefore the remaining
proof must use the exact consecutive-seed spectral alignment or the original
without-replacement mixed-characteristic slots.

An all-order positive generating identity has been added:

`G_(N,d)=[u^N v^N] E_X(u)E_Y(v)L^(d-4)(L^2-uv)^2`,

where `E_X=exp(Xu/(1-u)^2)` and
`L=u/(1-u)^2+v/(1-v)^2`.  The factor `L^2-uv` has the explicit nonnegative
Taylor decomposition (577).  This is an exact formal identity, replayed by
`verify_group_diagonal_kernel_identity.py`; positivity alone is not being
confused with stability.

Ordering the coefficient diagonals by increasing total degree produces a
totally nonnegative triangle in every finite case tested.  All 182,528 minors
in six complete matrices through `N=8` are nonnegative, exactly.  Since the
same phenomenon survives below the known stability threshold, it is logged
as an explanation of the homogeneous-layer rigidity, not as a global proof.
The replay is `probe_group_coefficient_triangle_tn.py` and
`group_coefficient_triangle_tn_exhaustive_small_20260804.json`.

The active target is now a slot-preserving ordered-partition realization of
the two quadrature contractions, before the `N` labeled Wishart slots are
collapsed to the indefinite rank-one bridges, or an all-order Bezout/network
factorization together with a separate global compatibility theorem.

## August 4 normalization and shortcut audit

The earlier displayed seed generating function was corrected from
`(1-u)^2 exp(Xu/(1-u)^2)` to `E_X(u)=exp(Xu/(1-u)^2)`.  The corrected positive
kernel identity passed 21 target comparisons, and its quadratic-exponential
coordinate version passed 15 seed and 20 full-target exact comparisons.
The latter has coefficientwise nonnegative finite factors but no direct
stability proof, since its core factor specializes on the diagonal to a
polynomial with a quadratic of discriminant `-8`.

Separately, all 32 actual spectral-factor choices at `(N,d)=(7,7)` have
certified negative coefficients in the proposed principal-minor selector;
the best normalized minimum is approximately `-0.1090973902941`.  The
certificate uses 384-bit Arb root balls and outward-rounded interval
arithmetic.  A corrected rooted
PatternBoost phase search screened 71,400 instances and replayed 40 exactly,
with no legal rebound.  These are obstruction/search results, not a proof or
counterexample.  Full details are in
`ROOTED_PHASE_SPECTRAL_SELECTOR_AND_QUADRATIC_KERNEL_AUDIT_2026-08-04.md`.

The quadratic coordinate has additionally split the group target into 21
generalized one-step bottom targets.  Their exact formula uses defects
`2-i,2-j`; the outer coefficient matrix has rank four and is anti-TN, with a
TN factorization after reversing one index.  Two diagonal pieces are already
derivative images of the proved defect-three bottom theorem.  The full
marker parent is exactly false, so the remaining obligation is a
mixed-defect bottom theorem together with fixed-value anti-TN composition.
This is a sharper restatement of the hard-group endpoint, not its proof.

## Equal-direction Hermite certificate update

The bivariate criterion of Raghavendra--Ryder--Srivastava reduces the live
group theorem to real-rootedness of `G_(N,d)(gamma+t,t)` for every real
`gamma`, because the required positivity of the top homogeneous part is
already proved in Section 88 of the main note.  Centering gives
`Q(x,c)=G(x+c,x-c)`, whose Hermite moment matrix depends polynomially on
`a=c^2`.  Coefficientwise positivity of all leading Hermite minors is a
complete sufficient certificate by Sylvester's criterion and the Hermite
root-count theorem.

All 78 centered Hermite minors at the first six true endpoints pass exactly
and have strictly positive rational coefficients; the below-cone control
`(7,5)` fails in the high minors and has positive parameter zeros.  A second
exact certificate has now advanced three endpoints farther.  Fraction-free
Bareiss elimination over `QQ[gamma]` proves coefficientwise nonnegativity
with positive constant term for every leading Bezout minor at `(19,15)`
(all 23 sizes), `(22,17)` (all 27 sizes), `(25,19)` (all 31 sizes), and
`(28,21)` (all 35 sizes).
Symmetry handles negative `gamma`, and the already-proved top homogeneous
condition then makes the last three cells rigorous complete bivariate
stability certificates, not finite line samples.  See Sections 96--97,
`probe_group_equal_direction_subdiscriminants.py`, and the reports
`equal_direction_bezout_flint_N19_d15_20260804.json` and
`equal_direction_bezout_flint_N22_d17_20260804.json`, together with
`equal_direction_bezout_flint_N25_d19_20260804.json` and
`equal_direction_bezout_flint_N28_d21_20260804.json`.  The new replay is
`certify_equal_direction_bezout_flint_bareiss.py`.

This extends the exact finite frontier from six endpoints to nine and makes
larger discovery runs practical.  An all-order factorization of the Bezout
family is still missing, so the group lemma and full conjecture remain open.

The strongest local network signal is now complete rather than sampled.  At
`(N,d)=(7,7)`, all `3,431` nonempty square minors of the `7 by 7` Bezout
matrix are nonzero polynomials with coefficientwise nonnegative rational
coefficients.  The below-cone control `(7,5)` fails this property at order
four, with a negative coefficient in the minor on rows `(0,2,3,4)` and
columns `(1,2,3,4)`.  The exact reports are
`equal_direction_bezout_flint_tp_N7_d7_20260804.json` and
`equal_direction_bezout_flint_tp_control_N7_d5_20260804.json`; the replay is
`probe_equal_direction_bezout_flint_total_positivity.py`.  This sharply
supports a planar-network or Neville-elimination proof target, but remains a
finite structural certificate rather than the missing all-order theorem.

The next complete matrix strengthens that conclusion: all `705,431`
nonempty square minors at `(10,9)` pass the same coefficientwise exact test.
Across all nine certified endpoint matrices, every one of the `40,950`
solid minors is strictly positive for every `gamma>=0`.  Coefficientwise
positivity holds through matrix size 19; at sizes 23, 27, 31, and 35 there
are respectively 4, 6, 12, and 12 mixed-sign exceptions, all certified
positive on the whole axis by exact compactified Bernstein subdivision.  Hence the raw
coefficientwise conjecture is too strong, but the finite Neville/initial-
minor condition survives through size 35.  See
`equal_direction_bezout_flint_tp_N10_d9_20260804.json`,
`certify_equal_direction_bezout_flint_solid_minors.py`, and the four
`equal_direction_bezout_flint_solid_axis*_20260804.json` reports.  A uniform
formula or induction for these positive Neville parameters remains the live
gap.

Every mixed-sign exception is the southeast off-diagonal solid block and its
transpose.  The affected orders are 17--18 at size 23, 18--20 at size 27,
19--24 at size 31, and 21--26 at size 35.  Consequently the
non-coefficientwise part of the finite audit is one distinct boundary polynomial per order; all remaining
solid minors lie in the coefficientwise-positive bulk.  This is the sharpest
current formulation of the candidate all-order network lemma.

Gasca--Pena reduces the target further: strict total positivity of an `n by
n` matrix is equivalent to positivity of the `n^2` initial solid minors,
those touching the first row or first column.  All mixed-sign exceptions
above are noninitial.  Exact aggregation across the nine endpoints therefore
gives `4,209/4,209` coefficientwise-nonnegative initial minors with positive
constant term, or `2,190` distinct polynomials after transposition symmetry.
See `equal_direction_bezout_initial_nine_20260804.json` and
`equal_direction_bezout_solid_constants_nine_20260804.json`.  The minimal
live lemma is now uniform coefficientwise positivity of this initial-minor
family; Gasca--Pena plus the equal-direction criterion would then complete
the group theorem.

## Diagonal lower-tail homotopy update

The diagonal base now has a smaller exact certificate than its full Hermite
matrix.  Splitting the quadratic-coordinate kernel into homogeneous outer
pieces gives `H_(N,0)=T_2=A_2+T_3`.  Exact rational isolation at
`N=4,7,10,13,16,19,22` proves the raw component ladder and the lower-tail
chain `T_6 prec T_5 prec T_4 prec T_3`.  The stronger claim
`T_3 prec T_2` is exactly false beginning at `N=16`, so it is not being used.

Instead put `R_N(X,Z)=T_3(X)+Z A_2(X)`.  At the first eight endpoint sizes
`N=4,7,10,13,16,19,22,25`, all `7,19,31,43,55,67,79,91` Bernstein coefficients of
`Disc_X R_N` on `[0,1]` are strictly positive.  The extra root enters from
negative infinity at `Z=0+`, so this gives a rigorous finite homotopy proof
that `R_N(X,1)=H_(N,0)` is real-rooted at all eight sizes.  The all-order target
is now lower-tail interlacing plus Bernstein positivity, followed by the one
full centered discriminant from Section 97.  Replays:
`certify_diagonal_component_tail_sturm.py`,
`certify_diagonal_lower_tail_homotopy.py`, and their August 4 JSON reports.

The equivalent Bezout pencil `T_3+tH_(N,0)` now has every leading and every
solid minor coefficientwise nonnegative through the complete `16 by 16`
case `N=10`; all 923 minors of the `6 by 6` case `N=5` also pass.  This is
independent exact evidence for a uniform planar-network or Neville
factorization.  The extended replay report is
`diagonal_homotopy_bezout_tp_N10_20260804.json`.

## Stable row--column Wishart lift

The factorial/Laguerre normalization now has an all-order stable lift which
retains both the row coordinates and the labeled Gaussian-column slots.  For
every PSD covariance `A`,

`W_A(x,c)=sum_(|R|=|C|)|R|! det(A[R]) x_(R^c)c_C`

equals

`det(A) eta(A^(-1/2)diag(x)A^(-1/2),c_1J,...,c_NJ)`.

Cauchy--Binet and Jacobi complementation prove the identity; the
Borcea--Branden ordered-partition theorem proves real stability in all
orders.  Diagonalization gives the Wishart/finite-free seed, and a coordinate
deletion tied to one column deletion gives the correctly normalized endpoint
state.  The only remaining transport step is therefore the two-pair
without-replacement contraction joining this lift to the Strongly Rayleigh
selector proved in Section 99 of the main note.  Exact random-PSD stress tests
of that final covariance class pass 1,620 affine-line certificates through
`N=10`; this is evidence, not the contraction theorem.  Replays:
`prove_wishart_row_column_stable_lift.py`,
`probe_finite_free_coordinate_endpoint_contraction.py`, and their August 4
reports.

## Size-biased endpoint refinement

The remaining row--column compatibility can now be stated without an
auxiliary choice of column labels.  If `P_A(x)=W_A(x,1)` and
`E_x=sum_i x_i partial_(x_i)`, then the correctly normalized endpoint
states are

`Q_e=partial_(x_e) E_x P_A` and
`R_(ef)=partial_(x_e)partial_(x_f) E_x(E_x-1)P_A`.

This follows termwise from
`(N-k)(N)_k=N(N-1)_k` and its two-deletion analogue.  It is an all-order
identity.  Exact algebraic-symbol tests show that the resulting operator is
not a universal stability preserver (the first size-biased row-symbol
failure occurs at `N=5`).  Full averaging over all Gaussian-column labels
also fails: at `(N,d)=(4,5)` an exact degree-eleven affine restriction has
only nine real roots.  Generic partial symmetrization therefore cannot close
the gap, so the path/Wishart image remains essential.

For that image, `A_N=0 direct-sum BB^*`, with `B` the unsigned incidence
matrix of a path.  Consequently `N!g_N` is the colored matching polynomial

`sum_k (N)_k binom(2N-1-k,k) X^(N-k)`:

choose a matching of the subdivision path and inject its edges into `N`
distinct colors.  This gives a concrete new Amini relaxed-hypergraph target:
show that its stable pair-contraction completion, after the prescribed
fixed-cardinality smoothing, equals the two-endpoint `1,-2,1` group
contraction.  That last equality is under investigation and is not yet a
proof of the group lemma.

## Tuned endpoint completion

The local coefficient equality is now solved.  The multiaffine part of

`(1-lambda*(x1+x2+x3+x4))*product_i(1+x_i)`

is a stable local completion with subset-size coefficient `a_s=1-s lambda`.
For its two reflected endpoint copies, every balanced one-deletion
contaminant is a complementary pair.  Column symmetry and path reflection
make all such pairs act as the same one-endpoint Wishart state, and their
aggregate coefficient is

`8 a_1 a_3+6 a_2^2=2(24 lambda^2-28 lambda+7)`.

Thus `lambda=(7+-sqrt(7))/12` cancels the contaminants exactly.  Since
`a_4<0`, a positive rescaling normalizes the three balanced endpoint grades
to `1,-2,1`.  This is an all-order identity, replayed by
`prove_tuned_endpoint_relaxed_completion.py`.  The only unresolved step on
this route is now path-specific preservation of stability under the required
balanced-grade extraction; a generic projection theorem would be false.
Indeed, the normalized eight-variable universal complement kernel restricts
on its complete diagonal to `(t^4-1)^2`, so it has the nonreal roots `+-i`.

## Colored-cycle endpoint model

The signed endpoint core now has an all-order positive combinatorial model.
Writing `F_N=N!g_N`, forcing one boundary edge of its subdivision path uses
one fresh color and gives `N F_(N-1)`; forcing both gives
`N(N-1)F_(N-2)`.  Gluing corresponding endpoints of two copies of
`P_(2N-1)` produces `C_(4N-4)`.  Inclusion--exclusion at the two shared
vertices proves that

`F_N(X)F_N(Y)-2[N F_(N-1)(X)][N F_(N-1)(Y)]`

`+[N(N-1)F_(N-2)(X)][N(N-1)F_(N-2)(Y)]`

is exactly the positive colored matching polynomial of that cycle, with
separate injective color sets on its two arcs.  This is proved in all orders
and replayed by `verify_colored_cycle_endpoint_inclusion_model.py` with its
August 4 report.  The remaining obstruction is sharply isolated: the target
uses derivative orders `d,d-2,d-4`, because each forced boundary pair has
already consumed two color slots.  A stability theorem for this graded
color-slot derivative, rather than the ordinary uniform derivative of the
cycle polynomial, is still required.

The natural optional-token/binomial marker parent does not supply that
theorem.  Although its `T^d` coefficient is exactly the target, the parent
at `(N,d)=(7,7)` has an exact squarefree degree-fourteen positive-direction
restriction with only twelve real roots, on
`(X,Y,T)=(-27,-23,27)+tau(5,8,13)`.  Thus the cycle/token interpretation must
be used directly at the fixed grade; stability of the entire marker parent
is now ruled out even at a true endpoint.

## Stable matched-column selector

The distinct Gaussian-column part of the endpoint contraction is now
settled uniformly.  The polynomial

`1-(z1+z2)e1(c)+2z1z2e2(c)`

is the upper-half-plane inversion of the multivariate matching polynomial of
`K_(2,N)`, hence is stable.  Grace pairing with the signed reversal of a
second copy proves that

`1-2e1(c)e1(h)+4e2(c)e2(h)`

is stable.  Its diagonal grade weights are exactly
`1,-2N^2,N^2(N-1)^2`, the required matched one-column and ordered
two-distinct-column factors.  The remaining compatibility is therefore only
the fixed-grade coupling of this selector to the row deletions on the
special path/Wishart support; the direct universal composition is already
known to be false.  Replay:
`prove_matched_column_injection_apolar_stability.py` and its August 4 report.

Pairing the columns first also reduces each local endpoint gadget from four
types to three: the matched column label and the two endpoint rows.  Amini's
standard `lambda=1` coefficients are `1,0,-1,-2`.  For the two reflected
endpoints every partial balanced complement is a `1/2` pair and therefore
contains the zero singleton coefficient.  Only empty/full and full/empty
survive; positive scaling by `1/2` gives exactly `1,-2,1`.  This removes the
earlier irrational local tuning, but not the final fixed-grade cycle
contraction.  Replay:
`prove_three_way_endpoint_completion_after_column_pairing.py` and its report.

## Inverse-Bezout/Stieltjes update

For `q_gamma(t)=G_(N,d)(t+gamma,t)`, checkerboard conjugation of the inverse
Bezoutian is exactly the finite Hankel moment matrix

`H_(i,j)=sum_r (-r)^(i+j)/q_gamma'(r)^2`.

The terminal monic orthogonal polynomial is the signed reversal of
`q_gamma`, and its Jacobi parameters satisfy

`beta_k=T_(n-k-1)T_(n-k+1)/T_(n-k)^2`,

where `T_s` is the order-`s` trailing principal Bezout minor.  Exact
extraction at `(4,5)` and `(7,7)` reconstructs the target polynomial and
gives coefficientwise-nonnegative numerators and denominators for every
`alpha_k,beta_k`.  This is an exact Stieltjes reformulation, not yet the
missing all-order positive formula.

## Independent colored-cycle core proof

The entire unsmoothed common-scale endpoint core has a second all-order
proof, independent of the earlier Chebyshev proof in Section 82.  With
`p_N` the raw path seed and
`B_N(X^a)=N!X^a/a!`, the normalized core is
`(B_N tensor B_N)` applied to

`p_N p_N-2p_(N-1)p_(N-1)+p_(N-2)p_(N-2)`.

After removing `XY`, the raw bracket is exactly the multivariate matching
polynomial of `C_(2N-2)`, with two consecutive vertex blocks specialized to
`X+2` and `Y+2`.  Heilmann--Lieb proves its stability.  The algebraic symbol
of `B_N` is the homogenized Laguerre polynomial
`N!Y^N L_N(-X/Y)`, so `B_N` preserves stability.  This gives an all-order
alternative proof for the normalized colored-cycle core, replayed by
`prove_colored_cycle_core_stability.py` and
`colored_cycle_core_stability_theorem_20260804.json`.

Because the core was already proved, this is not counted as a newly closed
frontier.  It confirms that normalization is not an obstruction for the
unsmoothed signed core.  It does not close the group endpoint because the target uses the
nonuniform derivative orders `d,d-2,d-4`; the remaining gap is precisely the
fixed-cardinality/graded conditioning coupling the two interface-edge
occupations to the smoothing slots.

## Third homogeneous layer theorem

The layer deficit `s=2` is now proved real stable throughout the full linear
cone `2d-N>=5`.  Its degree-three selector becomes a combination of four
consecutive monic Jacobi polynomials.  Comparing with a Jacobi matrix whose
last `2 by 2` block is modified reduces real-rootedness to positivity of one
new squared coupling.

For all upper offsets `r=N-d>=2`, even and odd parity reduce in the slack
coordinates `alpha=r-2`, `q=d-r-5` to the identical ratio.  Its essential
numerator has 104 strictly positive coefficients and its squared denominator
base has 21 strictly positive coefficients.  The four cases from `r=0,1`
and parity have separate shifted one-variable certificates with every
coefficient positive; `r<0` follows by derivative closure.  Thus the top
three homogeneous layers are now uniform theorems, not finite audits.

Replay: `prove_group_third_homogeneous_cone.py` and
`group_third_homogeneous_cone_theorem_20260804.json`.  The independent
168-cell extraction is `analyze_group_third_homogeneous_jacobi.py` and its
report.  This does not yet give the shared-homogenizing-variable
compatibility or settle all lower layers; `s=3` is the next layer target.

## Fourth homogeneous layer theorem

The layer deficit `s=3` is now also proved real stable throughout
`2d-N>=5`.  Its selector still has degree three, so the transformed row is a
combination of four consecutive monic Jacobi polynomials and the proof again
reduces to one modified squared coupling.

For every upper offset `r>=3`, both parities reduce in the slack coordinates
`alpha=r-3`, `q=d-r-5` to the identical rational function.  Its essential
numerator has 135 strictly positive coefficients and its squared denominator
base has 28.  The six cases from `r=0,1,2` and parity have exact shifted
one-variable certificates with every coefficient positive.  The selector
formula is derived directly from the all-order defect sum, and its boundary
shift is independently compared with 28 exact rows.

Replay: `prove_group_fourth_homogeneous_cone.py` and
`group_fourth_homogeneous_cone_theorem_20260804.json`.  The separate
200-cell extraction is `analyze_group_fourth_homogeneous_jacobi.py`; the
boundary comparison is `verify_group_fourth_homogeneous_boundaries.py`.
Consequently the top four homogeneous layers are uniform theorems.

This still does not prove all layers or their shared-homogenizer
compatibility.  For the next layer `s=4`, an exact degree-four selector has
been derived.  Its five-term Jacobi expansion reduces to a cubic strictly
interlacing a quartic, equivalently positivity of four fixed `4 by 4`
Bezout principal minors.  All four are positive in 80 exact cone cells;
uniform parameter factorizations are the next obligation.  Replay:
`derive_group_fifth_homogeneous_selector.py` and
`analyze_group_fifth_homogeneous_tail_schur.py` with their August 4 reports.

## Fifth homogeneous layer theorem

The layer deficit `s=4` is now proved real stable throughout `2d-N>=5`.
Its five-term Jacobi expansion has the exact Schur form

`K=A4*p_(n-4)-rho*B3*p_(n-5)`, with `rho>0`,

where `A4` and `B3` are monic quartic and cubic polynomials.  Strict
interlacing of `B3` with `A4` is equivalent to positive definiteness of their
fixed `4 by 4` Bezout matrix and realizes `K` as the characteristic
polynomial of a real symmetric four-vertex Jacobi extension.

For every upper offset `r>=4`, both parities are identical in the cone slack
coordinates.  The four leading Bezout-minor numerators have respectively
300, 1,128, 2,346, and 945 strictly positive coefficients; their denominators
have 300, 1,128, 2,346, and 946.  All eight families from `r=0,1,2,3` and
parity likewise have positive certificates, with numerator counts 24, 47,
68, and 43.  The 18 smaller valid cone cells are exact negative-root base
cases.  Forty-one independent exact comparisons verify the quartic, cubic,
and full Bezout matrix against directly constructed rows.

Replay: `prove_group_fifth_homogeneous_cone.py` and
`group_fifth_homogeneous_cone_theorem_20260804.json`.  Full coefficient
reports come from `derive_group_fifth_homogeneous_tail_schur_flint.py`; the
direct selector and formula-to-row replays are
`derive_group_fifth_homogeneous_selector.py` and
`verify_group_fifth_homogeneous_tail_schur_theorem.py`.  Thus the top five
homogeneous layers are uniform theorems.

This still does not settle all lower layers or their common homogenizing
variable.  The next layer `s=5` has the same degree-four selector bound and
five-term Jacobi bandwidth, so the same quartic/cubic tail criterion is the
immediate continuation.

## Sixth homogeneous layer theorem

The layer deficit `s=5` is now also proved real stable throughout the full
cone.  It has the same five-term Jacobi bandwidth, so the quartic/cubic Schur
tail from the preceding section applies unchanged.

Both upper parities collapse to identical cone-slack formulas.  The four
Bezout-minor numerators contain 351, 1,326, 2,775, and 1,080 strictly positive
coefficients; the denominators contain 351, 1,326, 2,775, and 1,081.  All ten
lower-offset/parity families have positive certificates with counts 26, 51,
74, and 46.  Twenty-two smaller cells are exact negative-root base cases,
and 45 exact comparisons match the symbolic quartic, cubic, and Bezout
matrix to directly constructed rows.

Replay: `prove_group_sixth_homogeneous_cone.py` and
`group_sixth_homogeneous_cone_theorem_20260804.json`; full coefficient
reports use `derive_group_fifth_homogeneous_tail_schur_flint.py --layer 5`.
The selector and cross-check replays are
`derive_group_sixth_homogeneous_selector.py` and
`verify_group_sixth_homogeneous_tail_schur_theorem.py`.

Therefore the top six homogeneous layers are uniform theorems.  The next
layer `s=6` has a six-term Jacobi band and reduces to a fixed quintic/quartic
interlacing test, equivalently a `5 by 5` Bezout matrix.  All-layer coverage
and the shared homogenizing-variable compatibility remain open.

## Seventh homogeneous layer theorem

The layer deficit `s=6` is now proved real stable throughout `2d-N>=5`.
Its six-term Jacobi band has a quintic/quartic Schur representation, reducing
the layer to positive definiteness of a fixed `5 by 5` Bezout matrix.

Both upper parities are identical in cone-slack coordinates.  The five
Bezout-minor numerators have 528, 2,016, 4,371, 7,260, and 2,849 strictly
positive coefficients; the denominators have 528, 2,016, 4,371, 7,260, and
2,850.  All twelve lower-offset/parity families have positive certificates
with counts 32, 63, 93, 120, and 75.  Thirty-four smaller cells are exact
base cases, and 49 exact comparisons match the symbolic quintic, quartic,
and complete Bezout matrix to direct rows.

Replay: `prove_group_seventh_homogeneous_cone.py` and
`group_seventh_homogeneous_cone_theorem_20260804.json`; full certificates use
`derive_group_seventh_homogeneous_tail_schur_flint.py`.  The selector and
cross-check replays are `derive_group_seventh_homogeneous_selector.py` and
`verify_group_seventh_homogeneous_tail_schur_theorem.py`.

Therefore the top seven homogeneous layers are uniform theorems.  Layer
`s=7` has the same degree-five selector and quintic/quartic tail; all-layer
coverage and shared-homogenizer compatibility remain open.

## Eighth homogeneous layer theorem

Layer deficit `s=7` is now proved real stable throughout the cone by the same
quintic/quartic Schur tail.  Both upper parities are identical.  The five
Bezout-minor numerators have 595, 2,278, 4,950, 8,256, and 3,159 positive
coefficients; the denominators have 595, 2,278, 4,950, 8,256, and 3,160.

All fourteen lower-offset/parity families are positive.  Their generic term
counts are 34, 67, 99, 128, and 79; the final offset has 33, 66, 98, 127, and
78.  Thirty-eight smaller cells are exact base cases, and 53 exact
comparisons match the symbolic quintic, quartic, and full Bezout matrix to
direct rows.

Replay: `prove_group_eighth_homogeneous_cone.py` and
`group_eighth_homogeneous_cone_theorem_20260804.json`; full certificates use
`derive_group_seventh_homogeneous_tail_schur_flint.py --layer 7`.  The
selector and cross-check replays are
`derive_group_eighth_homogeneous_selector.py` and
`verify_group_eighth_homogeneous_tail_schur_theorem.py`.

Thus the top eight homogeneous layers are uniform theorems.  The repeated
positive Schur-tail certificates now motivate an all-layer factorization;
`s=8` would otherwise require a sextic/quintic tail and `6 by 6` Bezout
matrix.  Shared-homogenizer compatibility remains separately open.

## Ninth homogeneous layer theorem

Layer deficit `s=8` is now proved real stable throughout `2d-N>=5`.  Its
seven-term Jacobi band gives a monic sextic/quintic Schur tail.  The monic
Euclidean algorithm extracts five Jacobi couplings; strict positivity of
these couplings constructs the interlacing tail directly and avoids a much
larger `6 by 6` Bezout-minor expansion.

The first two upper couplings have the universal four-linear-factor formula.
The next three have 253/253, 1,653/1,653, and 5,994/5,995
numerator/denominator terms.  Every coefficient is positive in the two cone
slack variables.  Even and odd upper tails are identical.

All sixteen lower-offset/parity families have five positive couplings.  The
largest boundary certificate has 97 terms.  Fifty-four smaller cells are
exact negative-root base cases, and 67 exact comparisons match the symbolic
sextic/quintic tails to independently constructed residual rows.

Replay: `prove_group_ninth_homogeneous_cone.py` and
`group_ninth_homogeneous_cone_theorem_20260804.json`.  Upper, parity,
boundary, and direct-row certificates are
`analyze_group_arbitrary_layer_schur_pattern.py`,
`verify_group_ninth_homogeneous_upper_parity.py`,
`analyze_group_ninth_homogeneous_boundaries.py`, and
`verify_group_ninth_homogeneous_tail_theorem.py`.

Therefore the top nine homogeneous layers are uniform theorems.  At `s=8`,
a third nontrivial coupling appears, so the earlier prospective induction
with only two bottom obstructions does not extend.  The corrected uniform
target is a positive recurrence for the growing block of nontrivial Jacobi
couplings.  All remaining layers and shared-homogenizer compatibility are
still open.

## Tenth homogeneous layer theorem

Layer deficit `s=9` is proved real stable throughout the cone.  It shares
the sextic/quintic tail order of `s=8`.  Its first two Jacobi couplings have
the universal product form, while the remaining three have positive
numerator/denominator term counts 276/276, 1,830/1,830, and 6,669/6,670.
Even and odd upper tails are identical.

All eighteen boundary-offset/parity families have five positive couplings;
their largest polynomial has 103 terms.  Fifty-eight smaller cells are exact
negative-root bases, and 71 exact comparisons match the symbolic tails to
direct residual rows.

Replay: `prove_group_tenth_homogeneous_cone.py` and
`group_tenth_homogeneous_cone_theorem_20260804.json`, supported by the
`group_tenth_homogeneous_*_20260804.json` upper, parity, boundary, and
verification reports.

Thus the top ten homogeneous layers are uniform theorems.  The paired blocks
`s=2h,2h+1` share their Jacobi-tail order; the open uniform task is to derive
the block-to-block recurrence and prove every newly entering coupling
positive.  Shared-homogenizer compatibility is still open.

## Eleventh homogeneous layer theorem

Layer deficit `s=10` is proved real stable throughout `2d-N>=5`.  Its
eight-term Jacobi band gives a monic septic/sextic Schur tail and six
Euclidean Jacobi couplings.  The first three are the universal product
couplings with shifts 12, 14, and 16.  The next two have positive
numerator/denominator term counts 1,176/1,176 and 4,186/4,186.  The terminal
unreduced common-denominator certificate has a 34,715-term positive
numerator and three positive denominator factors with 8,778, 3,828, and
1,081 terms.  Even and odd upper tails are identical.

All twenty boundary-offset/parity families have six positive couplings;
their largest reduced boundary polynomial has 157 terms.  Seventy-seven
smaller cells are exact negative-root base cases, and 75 exact comparisons
match the symbolic tails to direct residual rows.

Replay: `prove_group_eleventh_homogeneous_cone.py` and
`group_eleventh_homogeneous_cone_theorem_20260805.json`, supported by the
`group_eleventh_homogeneous_*_20260805.json` upper, parity, boundary, and
verification reports.  Exact scalar-unit normalization in the rational
arithmetic was regression-checked and changes no represented rational
function or sign.

Therefore the top eleven homogeneous layers are uniform theorems.  Exact
scalar specializations of all couplings remain positive through layers 100,
80, and 60 at three different cone points, but this is only evidence for the
needed arbitrary-layer recurrence.  The unresolved proof chain remains:
prove that recurrence for every layer, prove shared-homogenizer
compatibility, then discharge the original affine-target comparison and
final propagation obligations.

## Twelfth homogeneous layer theorem

Layer deficit `s=11` is proved real stable throughout the cone.  It shares
the septic/sextic tail of `s=10`.  Its first three couplings are the
universal products with shifts 14, 16, and 18; the next two have positive
term counts 1,275/1,275 and 4,560/4,560.  Its terminal exact
common-denominator certificate has a 37,949-term positive numerator and
positive denominator factors with 9,591, 4,186, and 1,176 terms.  Upper
parities are identical.

All 22 boundary families have six positive couplings, 83 smaller cells are
exact negative-root bases, and 79 exact comparisons reproduce direct rows.
Replay: `prove_group_twelfth_homogeneous_cone.py` and
`group_twelfth_homogeneous_cone_theorem_20260805.json`.

Thus the top twelve homogeneous layers are uniform theorems.  The two
complete paired blocks `s=8,9` and `s=10,11` now expose a nested positive
Jacobi structure, but the arbitrary-block recurrence, common homogenizer,
original affine-target comparison, and final propagation remain open.

## Thirteenth homogeneous layer theorem

Layer deficit `s=12` is proved real stable throughout `2d-N>=5`.  Its
octic/septic tail has three universal and four exceptional positive Jacobi
couplings.  The first three exceptional numerator/denominator counts are
465/465, 3,321/3,321, and 12,403/12,403.  The terminal certificate has an
83,027-term positive numerator and positive denominator factors with 20,910,
8,001, and 3,160 terms.  Upper parities coincide.

All 24 boundary families pass, as do 105 exact base cells and 83 symbolic
row comparisons.  Replay:
`prove_group_arbitrary_homogeneous_cone.py --layer 12` and
`group_thirteenth_homogeneous_cone_theorem_20260805.json`.

Therefore the top thirteen homogeneous layers are uniform theorems.  The
fixed-three-exceptional-coupling guess is false at this layer.  Exact scalar
data instead give the regular split, for `s=2h,2h+1`, into
`floor((h+1)/2)` universal couplings followed by `ceil((h+1)/2)` exceptional
ones.  This is audited through layer 100 at one cone point and through 80
and 60 at two others, but the multivariate block-growth recurrence remains
unproved.  Shared-homogenizer and downstream transfer obligations are also
unchanged.

## Fourteenth homogeneous layer theorem and an all-layer selector sign

Layer deficit `s=13` is proved real stable throughout the cone.  Its three
universal couplings have shifts 16, 18, and 20.  The exceptional certificates
have positive counts 496/496, 3,570/3,570, 13,366/13,366, followed by an
89,675-term positive terminal numerator with positive denominator factors
of sizes 22,578, 8,646, and 3,403.  All 26 boundaries, 87 row comparisons,
and 111 base cells pass.  Replay:
`group_fourteenth_homogeneous_cone_theorem_20260805.json`.  Thus the top
fourteen layers are uniform theorems.

There is also a new genuine all-layer result.  If `c_m` is the highest
Newton coefficient of the selector, its even-layer leading coefficient is
the alternating coefficient of `B_M(-u)B_M(u)`, where `B_M` is the path
independence polynomial.  In odd layers it is the corresponding odd
Wronskian coefficient.  The simple negative roots of `B_M` give the needed
alternating signs in both cases, while the remaining cone factor is
positive.  Hence `c_m>0` for every upper layer.  The proof and symbolic
replay are recorded in Section 121 and
`group_top_selector_coefficient_theorem_20260805.json`.

This proves one uniform component of the block-growth induction, not the
whole Jacobi recurrence.  The lower selector terms, all exceptional
couplings, shared homogenizer, affine comparison, and final propagation
remain to be proved.

## All-order selector-degree locality audit

The universal Jacobi prefix is now proved at arbitrary order.  For a
degree-`D` linear combination of continuant solution pairs, the induced Weyl
quotient differs from the unmodified quotient by
`O(y^(-(2m-D+1)))`.  Hankel/J-fraction uniqueness therefore fixes the first

\[
        \left\lfloor(2m-D-1)/2\right\rfloor
        =m-1-\left\lfloor D/2\right\rfloor
\]

couplings.  For the actual selector `D=m`, this proves the exact
`floor((m-1)/2)` universal prefix and confines every unresolved sign to the
last `floor(m/2)` couplings.  The proof uses only the continuant Casoratian
degree bound and the standard Hankel formulas, so it is independent of all
finite-layer expansions.

`prove_group_selector_degree_locality.py` replays the polynomial identities
and Euclidean prefixes exactly through tail order 40.  Its report
`group_selector_degree_locality_theorem_20260805.json` records 11,479 degree
checks and 858 prefix checks.  Status: **proved all-order reduction**, not yet
the positivity theorem for the exceptional suffix.

## Gamma-selector identity and two-outlier audit

The pre-binomial row has a palindromic gamma expansion
`C_s(z)=sum_h gamma_h z^h(1+z)^(p-2h)`.  The elementary coefficient quotient

\[
 {\binom{p-2h}{j-h}\over\binom pj}
 ={\prod_{r<h}(j(p-j)-r(p-r))\over(p)_{2h}}
\]

proves the all-order identity `c_h=gamma_h/(p)_(2h)` for the Newton selector.
The gamma and Jacobi descriptions are therefore exactly equivalent.

Exact Sturm counts at four widely separated cone points, through all layers
`s<=80`, find exactly two gamma roots in `[1,infinity)` and all remaining
roots negative.  The report
`group_selector_gamma_root_pattern_probe_20260805.json` contains 324 exact
root counts and 7,372 identity checks.  The root pattern is not yet promoted
to a theorem.  If proved from the path recurrence, it would identify the
pre-binomial obstruction as exactly two unit-circle conjugate pairs at every
order, leaving a fixed-rank repair problem rather than a growing arbitrary
tail.

## Unsigned path-slice gamma theorem

For
`P_M(u)=sum_i binom(2M-i-1,i)u^i`, the path matching theorem gives
`P_M=prod_r(1+lambda_r u)` with every `lambda_r>0`.  The binary
homogenization of `A_(M,s)` is exactly

\[
 [u^s]P_M(xu)P_M(yu)
 =e_s(\lambda_1x,\lambda_1y,\ldots,
      \lambda_{M-1}x,\lambda_{M-1}y).
\]

Real stability of elementary symmetric polynomials, followed by positive
scaling and diagonalization, proves that every `A_(M,s)` is negative-rooted.
Palindromicity then pairs its roots reciprocally, and the substitution
`t=z/(1+z)^2` proves that every component gamma polynomial `G_(M,s)` is
negative-rooted as well.  This is an all-order theorem, replayed by
`prove_path_slice_gamma_negative_rooted.py` and
`path_slice_gamma_negative_rooted_theorem_20260805.json` (14,876 exact
coefficient checks and 1,082 exact Sturm checks).  The root-pattern gap has
therefore narrowed to the signed combination
`G_(N,s)-2tG_(N-1,s)+t^2G_(N-2,s)`.

## Factorial form of the two-outlier window

If `C(z)=(1+z)^p Gamma(z/(1+z)^2)`, coefficientwise multiplication by the
outer window `binom(p+2alpha,alpha+j)`, followed by the same gamma transform,
has coefficients

\[
 [t^k]S={ (p+2\alpha)!\over(p-2k)!(\alpha+k)!}
 \sum_{h\le k}{\gamma_h(p-2h)!\over
 (p+\alpha-h)!(k-h)!}.
\]

This is an all-order factorial identity and yields
`S_(p,alpha)[(t+c)Gamma]=cS_(p,alpha)[Gamma]
+tS_(p-2,alpha+1)[Gamma]`.  It exposes an induction on the negative gamma
roots and a hidden Sturm pair in the gamma coordinate.  The candidate lemma
states that two roots in `[1,infinity)`, all other roots negative, and
`p-alpha>=4m-3` force the windowed gamma polynomial to be negative-rooted.
`probe_two_outlier_gamma_binomial_window.py` checks the identity and 1,248
exact rational Sturm instances through `m=14`; the report is
`two_outlier_gamma_binomial_window_probe_20260805.json`.  The factorial
identity is proved; the root-preservation lemma is not yet proved.

## Two-positive-root base theorem

The abstract window lemma is now proved in gamma degree two.  Normalize the
two roots `b_1,b_2>=1` as
`Gamma(t)=(1-u t)(1-v t)`, `0<=u,v<=1`.  At the boundary `alpha=p-5`, the
windowed gamma polynomial is

\[
 F^0-(u+v){N\over p(p-1)}t(F^0)'
 +uv{N(N-1)\over(p)_4}t^2(F^0)'',\qquad N=2p-5.
\]

The Jacobi adjoint filtration shows that only the quadratic term changes
the terminal coupling, and its ratio to the base coupling is `uv` times the
already-proved top-layer ratio in `(0,1)`.  The coefficient multiplier is
coordinatewise decreasing on `[0,1]^2`, since
`2(k-1)/(p-2)<=1`; its worst case is `u=v=1`, whose strict positivity is
already (545).  This proves negative-rootedness at the boundary.  The Euler
multiplier `(E+alpha)(p+alpha-E)` propagates it to every `alpha<=p-5`.

Therefore the two-outlier window theorem is rigorous when there are no
additional negative gamma roots.  `prove_two_positive_gamma_base.py` and
`two_positive_gamma_base_theorem_20260805.json` replay 5,625 exact Sturm
instances through `p=80`.  The remaining abstract obligation is precisely
to adjoin the negative factors `t+c` while preserving the required Sturm
relation.

## Complex-zero-decreasing reduction of the remaining window lemma

The remaining abstract failure mode is now only one conjugate pair.  If the
input gamma polynomial has two roots at least one and all other roots
negative, then its palindromic lift has exactly four nonreal zeros: the two
positive gamma roots each produce one conjugate-reciprocal pair, while every
negative gamma root produces two negative roots.  The shifted binomial
window is a complex-zero-decreasing diagonal operator, since

\[
 {p+2\alpha\choose\alpha+j}
 ={(p+2\alpha)!\over(\alpha+j)!(p+\alpha-j)!}
\]

is, up to scale, the product of a reciprocal-factorial CZDS and its
degree-`p` reversal.  Hence the lifted output has at most four nonreal
zeros.

Separately, the proved quadratic base and the exact recursion
`S[(t+c)Gamma]=cS[Gamma]+tS_shift[Gamma]` prove strict coefficient
positivity for every number of appended negative factors at reserve
`p-alpha>=4 deg(Gamma)-3`.  Thus the output gamma polynomial has no
nonnegative real root.  A conjugate pair in gamma space accounts for four
nonreal roots after the palindromic lift, so there can be at most one such
pair.  The remaining obligation is therefore one discriminant/no-double-
root inequality, rather than an unrestricted all-root interlacing theorem.

The replay `prove_two_outlier_czds_reduction.py` records 70,200 exact
coefficient-positivity checks, 3,600 transform identities, and 3,600 exact
Sturm bounds through gamma degree 16; its report is
`two_outlier_czds_reduction_theorem_20260805.json`.

## Cubic two-outlier theorem audit

The abstract window lemma is now proved when there is exactly one appended
negative factor.  Normalize

\[
 \Gamma(t)=(1-ut)(1-vt)(t+c),\qquad 0<u,v\le1,\ c>0.
\]

At the sharp boundary `p-alpha=9`, the Mobius/Jacobi image is a combination
of the top four monic Jacobi polynomials.  A modification of only the final
two Jacobi diagonals realizes this combination as the characteristic
polynomial of a real symmetric tridiagonal matrix provided one new squared
coupling is positive.  After its positive denominators are cleared, the
coupling numerator has degree `(2,2,2)` in `(u,v,c)`.

In each parity, conversion to the tensor Bernstein basis of bidegree `(2,2)`
in `(u,v)` leaves 27 coefficient functions: the coefficients of `1,c,c^2`
at nine tensor indices.  Every one is a polynomial in the boundary parameter
`r` with strictly positive coefficients.  The common denominators factor
entirely into positive linear terms.  Thus the coupling is positive for all
`r>=0`, not merely for sampled orders.  Coefficient positivity locates the
resulting real roots on the negative axis, and the Euler multiplier step
propagates the boundary theorem to every `p-alpha>=9`.

`prove_two_outlier_one_negative_factor.py` rejects floating-point atoms,
stores all 54 exact Bernstein certificates, checks the free terminal-matrix
identity, verifies six exact Jacobi/window comparisons, and runs 2,556
independent rational Sturm checks through `p=80`.  Its report is
`two_outlier_one_negative_factor_theorem_20260805.json`.  Status: **proved
all-order gamma-degree-three case**.  This is a strict extension of the
quadratic base, but it does not yet handle two or more appended negative
factors and therefore does not by itself resolve Erdős Problem 993.

## Minimal quartic two-outlier boundary audit

The degree-four input
`Gamma=(1-ut)(1-vt)(t+c)(t+d)` has now been proved negative-rooted under the
window transform at both smallest sharp-reserve representatives
`(p,alpha)=(13,0)` and `(14,1)`.  The proof parameterizes
`c+d=2q+z`, `cd=q^2`, where `q>0,z>=0`, and computes the output
discriminant exactly.

The raw discriminants have 12,090 and 25,082 terms and thousands of
negative power coefficients.  After tensor Bernstein conversion in the
bounded variables `(u,v)`, however, their 14,278 and 28,054 nonzero
coefficients are all strictly positive.  Every tensor index also has a
positive `z^0` term, so positivity is strict for `q>0` even on all
`u,v` endpoints and the repeated-factor face `z=0`.  The CZDS theorem then
turns positive discriminant into real-rootedness because at most one
conjugate pair was possible; coefficient positivity locates every root on
the negative axis.

`prove_two_outlier_two_negative_minimal_boundary.py` reconstructs the two
discriminants, factorizes them, audits all 42,332 positive Bernstein
coefficients and 290 strict-support indices, and performs 56 independent
exact transform/discriminant/Sturm replays.  The report is
`two_outlier_two_negative_minimal_boundaries_theorem_20260805.json`.
Status: **both minimal gamma-degree-four parity representatives proved**.
The proof is not yet all-order in the boundary parameter `r`; propagation
from these two bases is now the precise quartic gap.

Exact follow-up screens at `(15,2)` and `(16,3)` also pass the same
Bernstein discriminant cone.  The latter converts 46,074 raw terms with
22,885 negative coefficients into 49,950 positive and zero negative
Bernstein/power coefficients, with strict endpoint support.  This is strong
finite evidence for propagation, but it is deliberately not counted as an
all-order theorem.  The independent replays are
`probe_two_outlier_two_negative_next_boundaries.py` and its dated `p15` and
`p16` JSON reports.

The remaining quartic obligation has now been reduced exactly to a
common-interlacer statement.  For
`G_c=(1-ut)(1-vt)(t+c)`, put
`U=S_(p,alpha)[G_c]` and `V=t*S_(p-2,alpha+1)[G_c]`.  Recursion (718) gives

`S_(p,alpha)[(t+d)G_c]=dU+V`.

At reserve `p-alpha>=13`, the all-order cubic theorem proves `U` and `V`
separately real-rooted (the second cubic row still has reserve at least ten).
Therefore the quartic theorem is equivalent to positive compatibility of
this adjacent cubic pair, or equivalently to one common interlacer.  This is
a fixed structural statement and avoids treating the growing quartic
discriminant as the primary object.

`verify_two_outlier_adjacent_cubic_common_interlacing.py` provides an
independent exact finite audit.  At the sharp boundary through `p=30`, it
uses rational root-isolating intervals for 324 parameter cells and certifies
all 3,078 common-interlacer interval overlaps.  Its report is
`two_outlier_adjacent_cubic_common_interlacing_20260805.json`.  The recursion
and compatibility equivalence are all-order; the root-isolation range is
finite evidence for the one remaining adjacent-cubic compatibility lemma.

The common interlacer is now explicit.  On the sharp quartic boundary, the
current cubic row has an all-order positive symmetric Jacobi realization
`M`: a direct reserve-thirteen replay of the cubic terminal-coupling proof
certifies all 54 Bernstein/c-power coefficient functions in both parities.
The report is `cubic_jacobi_tail_reserve13_theorem_20260805.json`, generated
by `prove_cubic_jacobi_tail_reserve13.py`.

Let `C(y)=det(yI-M[1:,1:])`, deleting the first Jacobi vertex.  Cauchy
interlacing makes `C` an interlacer of the current cubic row.  Exact evidence
shows that its roots alternate with those of the adjacent cubic row `H` as

`0<c_1<h_1<c_2<h_2<...<c_(n-1)<h_(n-1)<1`.

Because the second polynomial in the quartic recursion transforms to
`yH(y)`, the same `C` then interlaces both cubic summands and proves their
positive compatibility.  This alternation is now the sole quartic
obligation; the matrix existence and the reduction are all-order.

`verify_adjacent_cubic_trailing_minor_interlacer.py` reconstructs the matrix
and all polynomials over `QQ` and uses rational root intervals.  Through
`p=24`, all 216 parameter cells and all 3,456 strict inequalities pass.  Its
report is `adjacent_cubic_trailing_minor_interlacer_20260805.json`.  A direct
Darboux difference with hoped-for inertia `(1,1)` is false—the final block
can have inertia `(2,1)`—and is retained only as an obstruction in
`adjacent_cubic_darboux_inertia_probe_20260805.json`.

Correction (2026-08-06): the fixed first-deletion trailing minor is **not**
a uniform common interlacer.  The earlier 216-cell audit began at `c=1/10`
and missed a small-`c` order exchange.  At the exact rational parameters
`(p,alpha,u,v,c)=(13,0,1/2,1/2,1/25)`, rational root isolation gives
`0<h_1<c_1`, whereas interlacing of the trailing minor with `yH` would
require `0<c_1<h_1`.  At `c=1/20` the intended order returns.  The exact
degree-ten resultant has a unique positive collision parameter between
those two rational values.

Crucially, the actual current/adjacent cubic pair retains strict interval
overlap on both sides of the collision, so this is an obstruction to the
chosen explicit minor, not a quartic counterexample.  The exact replay and
report are `disprove_fixed_trailing_minor_uniformity.py` and
`fixed_trailing_minor_uniformity_obstruction_20260806.json`.  Section 132 of
the main notebook supersedes the uniform claim in Section 131.  The valid
quartic target is again abstract positive compatibility (749), requiring a
parameter-dependent or recursively inherited common interlacer.

The corrected compatibility route has now been proved exactly at both
minimal parity representatives.  For the actual cubic summands `U` and
`V=tH`, their Jacobi-coordinate resultant factors as `c^2 R_p(s,q,c)`, with
`s=u+v,q=uv`.  After substituting back `s=u+v,q=uv` and converting `u,v` to
the full tensor Bernstein basis, one global sign makes all 1,331
coefficients positive for `(13,0)` and all 2,197 positive for `(14,1)`.
Consequently the two individually real-rooted cubic summands have no common
root for any `0<=u,v<=1,c>0`; exact overlap at `u=v=1/2,c=1` propagates over
the connected domain and proves positive compatibility.

The certificate and report are
`prove_quartic_minimal_compatibility_resultants.py` and
`quartic_minimal_compatibility_resultants_20260806.json`.  This is an
independent proof of the already known minimal quartic theorem, but it uses
the exact object that must propagate along the infinite boundary.  The
remaining quartic gap is a uniform total-positivity or coefficient-cone
proof for the growing residual resultants.

Correction and refinement (2026-08-06): actual-resultant nonvanishing is a
finite-boundary mechanism, not the uniform invariant.  It continues at
`(p,alpha)=(15,2)`, where all `2197/2197` Bernstein/c-power controls are
positive.  At `(16,3)`, the global controls are `3349` positive and `26`
negative.  Exact subdivision localizes the obstruction to the two symmetric
corner neighborhoods, and exact specialization shows that the resultant
really does vanish for positive `c`.

The vanishing is harmless.  At the interior point `u=1/100,v=99/100`, the
degree-fourteen residual resultant has a unique simple positive zero in
`(290493/1054534,353419/1282965)`.  Rational root isolation at the two
endpoints proves that the lower seven branches remain alternating and only
the largest roots exchange order.  Hence the unique collision is a
same-index largest-root collision, so weak interlacing survives.  The exact
replay is `certify_quartic_compatibility_p16_branch_collision.py`, with
report `quartic_compatibility_p16_branch_collision_20260806.json`.

Status: the no-common-root propagation claim is rejected beyond `p=15`.
The surviving all-order quartic target is branch-aligned weak interlacing of
the adjacent cubic rows.  No full forest theorem is claimed.

One half of that weak-interlacing target is now proved in every boundary
order.  If `M=LL^T` is the positive Jacobi matrix for the current cubic row
and `J_H` is the adjacent cubic matrix, then
`L^T L-(J_H direct-sum 0)` is supported on its final three coordinates.
An exact Schur-complement calculation proves that this difference has at
most one negative direction throughout both parity families.

The decisive radical majorant has all `27/27` positive Bernstein controls.
The squared radical gap has only three exceptional central controls; the
two symmetric neighboring controls absorb them via
`B20+B02 >= (3/4)B11`.  All six resulting paired order-polynomials factor
into positive factors with coefficientwise-positive residuals.  The two
nontrivial denominator factors have all `8/8` positive controls in each
parity.  Hence the difference has interior inertia `(2,1,n-3)` and at most
one negative direction on the boundary.

By the min--max principle, for ordered roots of the current row and the
adjacent row with its forced zero, this proves `v_i<=u_(i+1)` for every
`i`.  The certificate is
`audit_one_sided_darboux_bernstein.py`, with report
`one_sided_adjacent_cubic_darboux_inertia_20260806.json`; the independent
direct-matrix replay verifies 48 tail identities, 24 Schur identities, and
41 exact root inequalities in
`one_sided_adjacent_cubic_darboux_replay_20260806.json`.

Current quartic gap: only the complementary inequalities
`u_i<=v_(i+1)` remain.  This is genuine all-order progress but not yet the
quartic theorem or the full forest conjecture.

## Closest adjacent-cubic branch: quadratic Turan proof

The first of the complementary inequalities is now proved in every order.
Put

\[
 X_j=S_{p-2j,\alpha+j}[1],\qquad
 Y_j=S_{p-2j,\alpha+j}[(1-ut)(1-vt)].
\]

At `t=-z`, the exact row recursion is

\[
 Y_j=X_j+(u+v)zX_{j+1}+uvz^2X_{j+2}.                 \tag{764}
\]

The source-one rows obey

\[
 X_{j+1}=\eta_jX_j',\qquad
 \eta_j={p+\alpha-j\over(p-2j)(p-2j-1)}.             \tag{765}
\]

They are derivative rows of one negative-rooted hypergeometric polynomial.
On any interval where the relevant rows are positive, their value sequence
is log-concave in `j`.  Indeed, for a negative-rooted polynomial `F`, write
`S_m=sum_i(t-r_i)^(-m)`.  Then

\[
 {F'^2\over FF''}={1\over1-S_2/S_1^2},\qquad
 {d\over dt}{S_2\over S_1^2}
 ={2(S_2^2-S_1S_3)\over S_1^3}\le0,                 \tag{766}
\]

where `S_1S_3-S_2^2=sum_(i<j)q_iq_j(q_i-q_j)^2`.
Moving left from zero therefore only strengthens the strict binomial-row
log-concavity present at `t=0`.

The interval needed below reaches past the first zero of `X_0`, but not the
first zero of `X_1`.  To see this, let `z` be the magnitude of the closest
zero of `X_1`.  With `F=X_0`, the hypergeometric differential equation at
`F'(-z)=0` gives

\[
 {z^2\eta_0\eta_1F''(-z)\over F(-z)}
 =-{z(p+\alpha)(p+\alpha-1)\over
        (p-2)(p-3)(1+4z)}=-K.                        \tag{767}
\]

Here `F(-z)<0`.  If `r=p-alpha>=13`, then

\[
4(p-2)(p-3)-(p+\alpha)(p+\alpha-1)
=3r^2-19r+24+(4r-18)\alpha>0,                        \tag{768}
\]

so `0<K<1`.  Consequently
`Y_0(-z)=F(-z)(1-uvK)<0`; hence the closest zero of `Y_0`
occurs before the closest zero of `X_1`.  The first zero of
`U=cY_0+tY_1` occurs earlier still.

It remains to check the Turan determinant on precisely this interval.  Set
`a=(u+v)z`, `b=uvz^2`, so `a^2>=4b`.  Direct expansion gives

\[
\begin{aligned}
Y_1^2-Y_0Y_2={}&D_0+aE_1+b(E_2+4D_2)+(a^2-4b)D_2\\
               &+abE_3+b^2D_3,                       \tag{769}
\end{aligned}
\]

where

\[
\begin{array}{lll}
D_0=X_1^2-X_0X_2,&D_2=X_2^2-X_1X_3,&D_3=X_3^2-X_2X_4,\\
E_1=X_1X_2-X_0X_3,&E_3=X_2X_3-X_1X_4,&
E_2+4D_2=3X_2^2-2X_1X_3-X_0X_4.
\end{array}
\]

All these terms are nonnegative.  If `X_0>=0`, this follows from positivity
and log-concavity of `X_0,...,X_4`: in particular
`X_1X_3<=X_2^2` and `X_0X_4<=X_2^2`.  If `X_0<0`, the terms containing
`-X_0` only become positive, while log-concavity of the positive tail
`X_1,...,X_4` handles the rest.  Thus `Y_1^2>=Y_0Y_2` up to the first zero
of `Y_0`.

At the closest zero `t=-z_U` of `U`, one has
`cY_0=z_UY_1`, and therefore

\[
 H(-z_U)=cY_1-z_UY_2
 ={z_U(Y_1^2-Y_0Y_2)\over Y_0}\ge0.                  \tag{770}
\]

The already proved cubic positive-compatibility theorem identifies this as
the first branch (there is exactly one zero of `H` before the first zero of
`Y_1`).  Hence, for closest-root magnitudes,

\[
                         u_1\le h_1.                 \tag{771}
\]

`prove_adjacent_cubic_closest_root_turan.py` checks the formal decomposition,
the logarithmic-derivative sum of squares, the reserve inequality, 216 exact
row-convolution identities, and 216 rational Turan evaluations.  Its report
is `adjacent_cubic_closest_root_turan_theorem_20260806.json`.  SHA-256:
`D6FDC4C929290040599AAA1D06D33988D2011E19E3F13AB261AB70D0B3C4A1E7`
for the replay and
`B01F9B82E9A7B97421660A6C45690F6708B7C77B0D718121C42448345D142680`
for the report.

Status: the complementary inequality is proved for `i=1`.  The higher
branches `u_i<=h_i`, `i>=2`, remain open; this section does not claim the
quartic theorem or the forest conjecture.

## Adjacent-cubic collision topology and all-order quartic theorem

The higher complementary inequalities are now proved in every odd and even
boundary order.  After the Darboux factorization, the current cubic Jacobi
matrix and its adjacent row have one common classical prefix and tails of sizes
three and two.  If `n_A,q_A` and `n_H,q_H` are the two tail numerator/denominator
pairs, every common full eigenvalue lies on the cubic

\[
 C(y)=n_A(y)q_H(y)-n_H(y)q_A(y).
\]

This statement is pole-safe: cross multiplication by the two consecutive prefix
characteristic polynomials forces `C(y)=0` without dividing by a tail determinant.
Exact Schur-complement congruences reduce the difference of the two full inertias
at such a collision to the trailing current `2 by 2` block versus the adjacent
terminal scalar.

Two 15-record all-order certificates classify that finite collision problem.  In
both parity families they prove the spectral bracketing signs, the lower-tail
resultant sign, the resolvent ceiling, and positivity of the four collision-cubic
interval controls on `[1/4,a2]`.  The interval proof uses exact FLINT rational
reduction followed by Bernstein conversion in `u,v`.  Its degree-two `c` slices
are positive by `A,D,4AD-B^2>0`; its nontrivial cubic slices have positive endpoints
and negative discriminant; the remaining slices are coefficientwise positive.
This refinement is necessary because some isolated middle `c` controls change
sign, even though their complete slice stays positive.

Thus every equal-tail-inertia collision is a ground-tail collision below `1/4`.
The exact shared-prefix floor is above `1/4` except for odd `r=0,1` and even `r=0`;
an exact dyadic Bernstein audit places those three collisions below `1/20`, beneath
their separately certified prefix floors.  A rank-one Schur argument then shows
that every equal-index full collision is the common ground eigenvalue.

At the derivative-row base point, strict interlacing gives `u_i<h_i`.  Connected
continuation can change this order only at an equal-index collision.  Higher-index
collisions are excluded by the tail theorem and the ground collision is controlled
by the already proved Turan inequality.  Hence `u_i<=h_i` for every index.  Together
with the one-sided Darboux inequalities `v_i<=u_(i+1)`, these are exactly the two
overlap inequalities for a common interlacer of the current cubic row and the
equal-degree shifted adjacent row `tH`.

The factorial recursion therefore proves

\[
 S_{p,\alpha}[(1-ut)(1-vt)(t+c)(t+d)]
\]

negative-rooted for all `0<=u,v<=1`, `c,d>0`, and `p-alpha>=13`.  This is the
all-order gamma-degree-four window theorem.

The validator `verify_adjacent_cubic_collision_topology_theorem.py` produces
`adjacent_cubic_collision_topology_theorem_20260806.json` with status
`ALL_ORDER_ADJACENT_CUBIC_COMPATIBILITY_AND_QUARTIC_WINDOW_PROVED`.  It checks both
15-record parity reports, the `1/20` exceptions, the exact collision identities,
the prefix-floor theorem, the one-sided Darboux theorem, the ground Turan theorem,
and the cubic input theorem.  This does **not** yet prove arbitrary appended
negative factors or the signed forest-selector two-outlier root pattern, so no full
forest theorem is claimed here.
