# Rooted-phase, spectral-selector, and quadratic-kernel audit

This note records three independent August 4 checks on the remaining
homogeneous-group route.  None resolves Erdős Problem 993.

## 1. Rooted PatternBoost phase search

For a rooted tree `(T,r)`, write

`A(x)=I(T;x)` and `E(x)=I(T-r;x)`.

Attaching a new root to the roots of `m` disjoint copies gives the exact tree
independence polynomial

`P_m(x)=A(x)^m+xE(x)^m`.

This is a sum of two product phases and is not covered by an ordinary forest
product search.  `patternboost_root_phase_search.py` measured 12,000 rooted
states from 200 adversarial PatternBoost corpus trees, retained the strongest
600 metric roots, screened 71,400 root/exponent instances through `m=120`,
and replayed the best 40 with exact integers.  The corrected report
`patternboost_root_phase_rebound_200x600m120_20260804.json` contains no
counterexample and no legal post-descent rebound.

An earlier report, `patternboost_root_phase_200x600m120_20260804.json`, ranked
the largest adjacent ratio anywhere after the mode.  That score confounded a
flat descending shoulder with a genuine re-ascent and produced a misleading
value near `0.998645`.  The scoring rule was replaced by a trough-to-later-rise
test.  The old number is invalid and must not be cited as proximity to a
counterexample.

Consequence: this finite search gives additional negative evidence against a
counterexample in a genuinely new construction family.  It is not a theorem
about that family or about all trees.

## 2. Actual spectral-factor selector

The determinant representation of the group polynomial contains a scalar
spectral factor of `H=q^2-pr`.  Each nonreal conjugate pair permits a factor
choice.  For every such choice, `probe_actual_spectral_selector.py` evaluates
the proposed multiaffine principal-minor selector

`d! - 2(d-2)! A(S_x)A(S_y) + (d-4)! B(S_x)B(S_y)`.

At the first actual endpoint `(N,d)=(7,7)`, all 32 factor choices were first
replayed at 80-digit precision.  Every choice has negative selector
coefficients.  The best choice still has normalized minimum

`-0.10909739029412867215399440726893697`

and 46 negative coefficients.  The discovery report is
`actual_spectral_selector_n7_20260804.json`.

This obstruction is now rigorous.  The exact factorization is

`H=7X^2Q(X)`,

where `Q` is a monic squarefree degree-ten integer polynomial with five
nonreal conjugate root pairs.  `certify_actual_spectral_selector_n7.py` uses
certified 384-bit Arb root balls, selects one member of each pair in all 32
ways, and evaluates the selector by outward-rounded complex interval
arithmetic.  Every choice has a coefficient whose entire interval is
strictly negative.  The normalized witness intervals have radii of order
`10^-112`, while their centers range from about `-0.109` to `-0.283`.  The
replay report is
`actual_spectral_selector_n7_arb_certificate_20260804.json`.

Consequence: choosing a more favorable scalar spectral phase cannot make this
particular principal-minor selector coefficientwise nonnegative, already at
the smallest tested endpoint.  This is a certified finite impossibility
result for the selector shortcut.  It says nothing negative about stability
of the actual group polynomial itself.

## 3. Corrected generating function and quadratic-exponential coordinates

The seed polynomial has the exact ordinary generating function

`E_X(u)=exp(Xu/(1-u)^2)`, so `[u^N]E_X(u)=g_N(X)`.

The prefactor `(1-u)^2` that appeared in an earlier written version was a
normalization error.  The verification code had expanded the correct shifted
seed coefficients, so the kernel computation itself survives; the displayed
formula and its reports have now been corrected.  The exact group identity is

`G_(N,d)=[u^N v^N]E_X(u)E_Y(v)L^(d-4)(L^2-uv)^2`,

where `L=u/(1-u)^2+v/(1-v)^2`.

Now put `u=t/(1+t)` and `v=s/(1+s)`, and define

`a=t(1+t)`, `b=s(1+s)`, `L=a+b`,

`M=(1+t)(1+s)L^2-ts`.

Residue substitution gives the all-order identity

`G_(N,d)=[t^N s^N](1+t)^(N-3)(1+s)^(N-3)`

`            * exp(Xa+Yb) L^(d-4) M^2`.

For `N>=3`, every finite polynomial factor outside the exponential is
coefficientwise nonnegative.  `verify_group_quadratic_exponential_kernel.py`
checks the one-variable seed normalization for `N=1,...,15` and compares 20
full two-variable targets for `5<=N<=9` exactly.  The replay report is
`group_quadratic_exponential_kernel_20260804.json`.

The raw stability shortcut is false.  Exact diagonal specialization gives

`M(t,t)=t^2(2t^2+4t+1)(2t^2+4t+3)`,

and the final quadratic has discriminant `-8`.  Thus `M` is not real stable.
The coordinate identity remains potentially useful for a Hermite/Jensen or
coefficient-extraction theorem, but coefficientwise positivity of its factors
does not prove the target.

## Route decision

These checks close two easy continuations: a positive principal-minor selector
obtained by changing spectral phase, and a direct real-stability factorization
of the quadratic-coordinate kernel.  The live options are now a theorem about
the full quadratic-exponential coefficient extractor, a slot-preserving
composition theorem for the original determinant, or the independent C12
pendant-pair inequality route.  The conjecture remains unresolved.

## 4. Generalized-bottom component decomposition

The corrected quadratic coordinates give more than a positive kernel.  Define

`B_N[P]=[t^N s^N](1+t)^(N-3)(1+s)^(N-3)`

`       * exp(Xt(1+t)+Ys(1+s))P(t,s)`.

For a monomial `t^i s^j` from the outer copy of `M`, put

`C_(i,j)=B_N[t^i s^j L^(d-4)M]`.

If

`g_(n,e)(X)=sum_a binom(n+a-e,n-a)X^a/a!`,

then direct extraction gives the all-order identity

`C_(i,j)=S^(d-2)(g_(N-i,2-i) tensor g_(N-j,2-j))`

`          -S^(d-4)(g_(N-i-1,2-i) tensor g_(N-j-1,2-j))`.

Thus all 21 outer-kernel pieces are generalized one-step bottom targets, not
arbitrary positive summands.  Also

`D^h g_(n,e)=g_(n-h,e-2h)`.

In particular, the `(1,1)` and `(3,3)` pieces are derivatives of members of
the already-proved defect-three bottom family in the relevant cone.

The `6 by 6` coefficient matrix of `M` has rank four.  Reversing its second
index makes it totally nonnegative, and it has an explicit factorization as
a `6 by 4` TN matrix times a `4 by 6` TN matrix.  The fixed calculation is a
theorem: `verify_quadratic_component_bottom_decomposition.py` checks 189
component formulas and all 1,341 minors of the three matrices exactly, with
report `quadratic_component_bottom_decomposition_20260804.json`.

Finite stability evidence tracks the correct boundary.  In five cells inside
the candidate cone, all 105 components passed 8,400 exact line restrictions.
Immediately below the cone, 38 of 84 components have exact nonreal-rooted
restrictions in a 7,442-line audit.  The reports are
`quadratic_kernel_monomial_components_5cells_80lines_20260804.json` and
`quadratic_kernel_monomial_components_below_cone_20260804.json`.

At `(N,d)=(7,7)`, the 30 adjacent component pairs have a uniform clean
orientation when both original indices increase over 1,500 exact line
restrictions; several opposite orientations fail.  This does **not** align
with the total-nonnegative factorization of the outer coefficient matrix,
which reverses one index: in that reversed-column order three adjacent
forward pencils already have exact line failures.  Reversing the row order
instead meets four exact failures.  Thus the direct ``TN weights plus an
ordered proper-position array'' shortcut is unavailable; the natural-order
screen remains only finite evidence for a possible apolar/exterior
contraction.  The tempting simultaneous marker
parent is false: `B_N[L^(d-4)M(t,s)M(Ut,Vs)]` has a degree-nine exact line
restriction with only five real roots, and even either one-marker parent has
an immediate exact failure.  See
`quadratic_component_proper_position_n7_20260804.json`,
`quadratic_full_marker_parent_n7_1000lines_20260804.json`, and the two
`quadratic_one_marker_*` reports.

The genuinely multiaffine encoding needed for a direct application of the
Purbhoo total-nonnegative exterior action is also false.  At `N=d=7`,

`sum_(i,j in supp M) C_(i,j)(X,Y) z_i w_j`

has an exact positive-direction affine restriction of degree nine with only
seven real roots on the first deterministic trial.  Even the row-linear
parent with one fixed column has a degree-eight restriction with only six
real roots after five trials.  Thus the clean adjacent natural-index pencils
do not form a common stable multiaffine family.  The exact replay is
`probe_quadratic_component_multiaffine_parent.py`, with report
`quadratic_component_multiaffine_parent_n7_20260804.json`.  Purbhoo's theorem
remains relevant only if the *specific final contraction* can be represented
as an exterior action on some different stable lift; it cannot be applied to
the naive component-marker parent.

Consequence: the live group subproblem is now a generalized-bottom theorem
for the mixed defect/index array followed by a fixed-value anti-TN
composition.  It cannot be replaced by stability of a marker parent.

There is a sharper exact collapse.  With
`R(D)=(sqrt(1+4D)-1)/2`, one has

`R(D)^k g_(n,e)=g_(n-k,e-k)`.

Hence, for the solved defect-three bottom member `F=F_(N+1,d-2)`, every
component is

`C_(i,j)=R_X^(i+1)R_Y^(j+1)F`,

and their prescribed weighted sum is exactly

`G_(N,d)=(D_XD_Y(D_X+D_Y)^2-R_X^2R_Y^2)F_(N+1,d-2)`.

The formal proof and exact replay are in Section 95 of the main note,
`verify_quadratic_component_square_root_lowering.py`, and
`quadratic_component_square_root_lowering_20260804.json`.  This supersedes
the formulation as 21 separate mixed-defect obligations: the live theorem is
one special square-root-lowering preservation statement on the solved bottom
family.  It remains unproved and is not a generic preserver; the exact failed
root-independent polarization is recorded in
`universal_bottom_polarization_n7_d5_20260804.json`.

The larger true endpoints `(13,11),(16,13),(19,15),(22,17)` add 2,100 clean
exact component restrictions, recorded in
`quadratic_kernel_monomial_components_true_endpoints_m3to6_20260804.json`.

## 5. Heterogeneous rooted-product search

For different rooted branches `(T_i,r_i)`, a central-root tree has

`P(x)=product I(T_i;x)+x product I(T_i-r_i;x)`.

This family strictly extends the identical-branch power search.  The beam
search `patternboost_heterogeneous_root_beam_search.py` measured 7,200 rooted
states from 120 adversarial PatternBoost trees, selected 60 branch types, and
explored 152,708 heterogeneous products through 24 branches.  Thirty
finalists were rebuilt with exact integers, including one best finalist at
every branch depth and tree orders from 61 through 1,441.  Every replay was
unimodal and none had a legal post-descent rebound.  The report is
`patternboost_heterogeneous_root_beam_r120_t60_w300_d24_20260804.json`.

This closes another finite counterexample lane; it is not a theorem about all
central-root trees.

## 6. Equal-direction Hermite reduction

Theorem 7 of Raghavendra--Ryder--Srivastava (ITCS 2017) reduces bivariate
real stability to the family `t -> P(gamma+t,t)`, together with positivity of
the top homogeneous part on the positive projective interval.  Section 88
already proves the latter condition for the group cone.  For the symmetric
group target, write

`Q_(N,d)(x,c)=G_(N,d)(x+c,x-c)` and `a=c^2`.

The Newton power sums of `Q` give its Hermite moment matrix `H(a)`.  If every
leading principal minor of `H(a)` has positive coefficients as a polynomial
in `a`, then `H(a)` is positive definite for every `a>=0`; Sylvester's
Hermite theorem then proves every equal-direction restriction real-rooted.
Together with Section 88 this would finish the group endpoint.

The exact replay `probe_group_equal_direction_subdiscriminants.py` verifies
this coefficientwise positivity for all 78 Hermite minors at the first six
true endpoints `(4,5)` through `(19,15)`.  The full discriminants are dense
with degrees `3,21,55,103,165,241`.  The control `(N,d)=(7,5)` below the cone
fails: its sixth through ninth minors acquire negative coefficients and
positive real zeros.  Thus the certificate sees the known threshold and is
not a generic consequence of symmetry.  The report is
`group_equal_direction_subdiscriminants_20260804.json`.

This is now the sharpest live route: prove the coefficientwise-positive
Hermite minors, or factor the whole Hermite matrix as a positive Gram/network
matrix for every `a>=0`.  The finite audit is not the all-order proof.
