# Stable path P4: intersection-compensation replacement route

The earlier attempt to prove every fixed-intersection group
separately is false: the bottom group \(H(j,0)\) can be negative.
The exact first exhibited obstruction is recorded in
`PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_COUNTEREXAMPLE_2026-07-30.md`.

The full P4 coefficient remains positive at that obstruction because
the neighboring group \(H(j,1)\) is much larger.  This motivates the
replacement decomposition

\[
\{H(j,0)+H(j,1)\}+\sum_{h=2}^{j}H(j,h).
\]

The two proof targets are therefore

\[
H(j,0)+H(j,1)\ge0
\tag{1}
\]

and

\[
H(j,h)\ge0\qquad(h\ge2).
\tag{2}
\]

## Exact bottom-pair formulas

Write \(j=2m+\epsilon\), \(q=m+s+2\), and
\(L=2q-4+x\).  Let

\[
R(c,m,s,x,\epsilon)=
\frac{G(c,m,s,x,\epsilon)}
{\binom{2m+\epsilon}{m}}.
\]

The binomial ratios give

\[
\frac{H(2m,0)+H(2m,1)}{\binom{2m}{m}}
=R(0,m,s,x,0)+mR(1,m-1,s,x,1),
\tag{3}
\]

and

\[
\frac{H(2m+1,0)+H(2m+1,1)}
{\binom{2m+1}{m}}
=R(0,m,s,x,1)+(m+1)R(1,m,s-1,x,0).
\tag{4}
\]

These identities align both groups at the same \(q,L,j\) and turn
the needed cancellation into a two-term symbolic object.

## Current exact evidence

`stress_path_isolate_p4_bottom_pair_lift.py` made 4,770 exact
positivity checks and 4,770 exact unnormalized two-layer lift checks
with no failure on

\[
3\le m\le12,\quad -1\le s\le14,\quad
x\in\{0,4,12,20,32,40,44,45,48,52,56,60,80,100,120\},
\]

for both parities, subject to \(q\ge5\).  In particular, the sweep
includes the full dangerous excess band around the failed
groupwise lift.

At \((m,s,x,\epsilon)=(8,6,45,0)\),

\[
H_0=1\,615\,133\,332\,049\,538\,994\,398,
\]

\[
H_1=683\,891\,607\,665\,863\,502\,737\,216,
\]

so the bottom pair is positive.  At \(m=10\), the same parameter
slice has \(H_0<0\), but

\[
H_0+H_1
=26\,982\,682\,698\,281\,504\,430\,558\,524>0.
\]

This is finite evidence, not yet an all-parameter proof.  The next
exact symbolic target is (3)--(4) on \(s=6\), the first diagonal
where the separate \(H_0\) lift fails.  A second target is the
surviving two-layer lift for every \(c=h\ge1\); if uniform, it
reduces (2) to the already proved \(h=j\) and \(h=j-1\) edges.

The second target has now passed a separate stratified audit:
`stress_path_isolate_p4_positive_intersection_lift.py` made 19,432
exact group-positivity checks and 19,432 exact lift checks with no
failure on

\[
1\le c\le4,\quad 0\le m\le10,\quad -1\le s\le14,
\]

for both parities and

\[
x\in\{0,12,20,32,40,44,45,48,52,56,60,80,100,120\}.
\]

Together with the bottom-pair audit, the replacement route currently
has 48,404 exact checks and no failure.  This is still computational
evidence; the uniform algebraic proofs remain the required step.

## Conditional finite-base reduction

Two uniform lift statements would now finish the fixed-intersection
part of stable P4:

\[
G(c,m+1,s,x,\epsilon)\ge G(c,m,s,x,\epsilon)
\qquad(c\ge1),
\tag{5}
\]

and

\[
B_\epsilon(m+1,s,x)\ge B_\epsilon(m,s,x),
\qquad
B_\epsilon=H(2m+\epsilon,0)+H(2m+\epsilon,1).
\tag{6}
\]

For \(h=c\ge2\), write \(j-h=2m+\epsilon\).  Repeated use of
(5) lowers \(m\) to zero, where the group is one of the already
proved edges \(h=j\) or \(h=j-1\).  Thus (5) proves every summand in
\(\sum_{h\ge2}H(j,h)\).

For the bottom pair, repeated use of (6) lowers every \(m\ge3\) to
the fixed layers \(j=6,7\).  The layers \(j\le5\) are covered by the
existing direct stable-layer certificates.  The remaining base work
is therefore finite: certify the \(j=6,7\) bottom pairs for all
ranks and stable excess.  The \(j=6,h=0\) component already has an
all-rank certificate.  The paired \(j=7\) base is now also a theorem:
its normalized numerator has 668 positive monomials and no negative
coefficient.  See
`PATH_ISOLATE_P4_BOTTOM_PAIR_FIXED_BASES_THEOREM_2026-07-30.md`.

Both paired bases have now been replayed in the same format.  The
\(j=6\) normalized numerator has 550 nonzero monomials, and the
\(j=7\) numerator has 668; neither has a negative coefficient.

Accordingly, the failed all-\(c\) lift has been replaced by two
strictly weaker uniform inequalities plus finite bases, without
changing the later protected-induction architecture.

The \(h\ge1\) lift also has a Newton finite-base reduction.  On this
restricted domain the old factor becomes
\[
F_\epsilon=(1+z)^{2c+2m+x-1}z^\epsilon P_\epsilon,
\]
and coefficientwise recurrences in \(c,m,x\) reduce all cases to the
eight polynomials at
\[
(c,m)\in\{(1,3),(2,2),(3,1),(4,0)\},\qquad x=0.
\]
All eight bases are already exact positive polynomials.  A dedicated
danger-band audit across \(x=44,45,46\) made 20,083 recurrence
comparisons with no failure.  See
`PATH_ISOLATE_P4_POSITIVE_INTERSECTION_NEWTON_FINITE_BASE_REDUCTION_2026-07-30.md`.

## First exact repaired diagonal

The bottom-pair positivity and layer lift are now theorems on
\(s=6\), the first diagonal where the old \(H(j,0)\)-only lift
fails.  After multiplying by the positive denominator
\(\prod_{i=1}^{11}(m+i)\), all four parity/quantity polynomials have
nonnegative tensor Newton expansions in \(M=m-3\) and \(x\).  The
four certificates contain 273, 273, 247, and 247 nonzero
coefficients, with no negative coefficient, no degree-audit
violation, and no off-grid validation failure.  See
`PATH_ISOLATE_P4_BOTTOM_PAIR_S6_NEWTON_THEOREM_2026-07-30.md`.

## Full-\(s\) Newton structure of the bottom-pair lift

For fixed \(m,x,\epsilon\), let

\[
F_{m,x,\epsilon}(z)=
\sum_{r\ge0}
\left.\Delta_s^r
\{B_\epsilon(m+1,s,x)-B_\epsilon(m,s,x)\}
\right|_{s=-1}z^r.
\]

Every one of 50 complete exact sample polynomials has

\[
F_{m,x,\epsilon}(z)
=z(1+z)^{2m+x-1}P_{m,x,\epsilon}(z),
\]

with \(P\) coefficientwise positive.  The audit includes
\(m=4,5,6,8,10\), \(x=0,4,12,32,45\), and both parities.  It made
3,930 Newton-coefficient checks, 1,540 exact divisions by \(1+z\),
and 2,240 quotient-coefficient checks, with no failure.  Every case
had exactly one remaining factor \(z\); the smallest quotient
coefficient was \(29,616\).

This is finite evidence in \(m,x\), but it gives a concrete
all-\(s\) proof target for (6): establish the displayed factor and
the coefficientwise positivity of \(P\) uniformly.

There is now a sharper finite-base reduction.  Exact data support
coefficientwise monotonicity of \(P\) separately in \(m\) and \(x\).
The audit contains 84 complete polynomials and 3,940 coefficient
comparisons with no failure.  Both base polynomials
\(P_\epsilon(3,0;z)\) have strictly positive coefficient lists.
Therefore proving the factorization and the two coordinate
recurrences reduces the entire bottom-pair lift to two explicit
finite polynomials.  See
`PATH_ISOLATE_P4_BOTTOM_PAIR_NEWTON_FINITE_BASE_REDUCTION_2026-07-30.md`.

The uniform coefficient front has now reached quotient order \(4\).
For each \(k=0,1,2,3,4\), both parities, the coefficient
\([z^k]P_\epsilon\) and its unnormalized \(m\)- and \(x\)-coordinate
recurrences have positive-coefficient rational certificates after
the shift \(m=3+M\).  This gives 30 exact certificates with no
negative numerator or denominator coefficient.  The complete record
is
`path_isolate_p4_bottom_pair_initial_quotient_order0_to_4_20260730.json`.

Moreover, both quotient packages satisfy the same stronger empirical
path-extension law.  One added excess vertex contributes the
coefficientwise baseline multiplier \(1+2z\), while either
two-vertex coordinate contributes \((1+2z)^2\).  For the bottom pair
this passed 3,940 complete-polynomial comparisons; for the
\(h\ge1\) package it passed 19,680 comparisons on 290 polynomials.
The bottom-pair law is already a uniform theorem through quotient
order \(4\), with 20 positive rational certificates.  The exact
records are
`path_isolate_p4_bottom_pair_quotient_multiplicative_stress_20260730.json`,
`path_isolate_p4_positive_intersection_quotient_multiplicative_stress_20260730.json`,
and
`path_isolate_p4_bottom_pair_initial_multiplicative_recurrence_order0_to_4_20260730.json`.

## Universal positive support-distance slope

The reduced stable two-layer integrand has now been split exactly as

\[
P_\epsilon=T^3K_\epsilon+(s+1)J,
\]

where \(J\) is independent of \(\epsilon,c,m,s,x\) and is a
276-term coefficientwise-positive polynomial with an explicit
positive product factorization.  Moreover, \(J\) contains \(T^5\),
while \(K_\epsilon\) has degree only \(2\) in each of \(c,m,x\) and
degree at most \(17\) in each rank variable.  Consequently every
positive-intersection Newton coefficient splits into one universal
positive term and one bounded-degree signed term:

\[
T^3K_\epsilon U^k+kJRU^{k-1}.
\]

This localizes the remaining all-order proof to domination of the
single \(K_\epsilon\) contribution.  See
`PATH_ISOLATE_P4_RESIDUAL_AFFINE_SLOPE_THEOREM_2026-08-01.md`.

The bottom-pair lift has the same structure.  Its reduced integrand
is

\[
P^{\mathrm{pair}}_\epsilon
=z^2w^2T^3K^{\mathrm{pair}}_\epsilon
+(s+1)J^{\mathrm{pair}}_\epsilon,
\]

where each slope has 678 positive monomials, is independent of \(x\),
is only linear in \(m\), and contains the same positive \(T^5\)
factor.  The two parities are linked exactly by

\[
J^{\mathrm{pair}}_1-J^{\mathrm{pair}}_0
=zw(1+z)(1+w)J^{\mathrm{group}}\succeq0.
\]

See
`PATH_ISOLATE_P4_BOTTOM_PAIR_AFFINE_SLOPE_THEOREM_2026-08-01.md`.
# 2026-08-01 curvature/reserve compression

The quadratic isolate-coordinate part of every bounded signed kernel is
now known exactly.  In both group parities,

\[
[x^2]K_\epsilon=-(z-w)^2D,
\qquad J=T^3\Lambda D,
\]

with coefficientwise-positive \(D\) and \(\Lambda\).  The two bottom-pair
parities satisfy the same identity with their respective positive factors
\(D^{\mathrm{pair}}_\epsilon\).  See
`PATH_ISOLATE_P4_CURVATURE_RESERVE_THEOREM_2026-08-01.md` and its exact
certificate.  Consequently, the sole quadratic danger is a discrete
curvature term; it is nonnegative on diagonal extraction once the
remaining homogeneous coefficient rows are shown to rise toward their
centers.  This center-unimodality preservation lemma is the current proof
target.

That target is now complete.  The HCU/Schur decomposition proves the
needed center-unimodality for every power of \(T\), every Newton order,
and both parity packages.  Hence the full quadratic-in-\(x\) contribution
of both bounded kernels is nonnegative after extraction.  The remaining
signed-kernel analysis is affine in \(x\); see
`PATH_ISOLATE_P4_QUADRATIC_KERNEL_NONNEGATIVITY_THEOREM_2026-08-01.md`.

## 2026-08-01 all-order positive tail and affine residual

The positive-intersection package is now uniformly proved through
Newton order \(6\). Both parities and all three coordinate recurrences
\(x,c,m\) have exact positive rational certificates on
\(c\ge1,m\ge3,x\ge0\), for 42 certificates in total. See
`PATH_ISOLATE_P4_POSITIVE_INTERSECTION_INITIAL_MULTIPLICATIVE_ORDER6_THEOREM_2026-08-01.md`.

There is also an exact all-order theorem for the grouped positive tail.
After the shift \(c=1+C,m=3+M\), all six reciprocal tail polynomials
factor as \(e_1Q\). Each \(Q\) lies in the paired HCU cone, apart from
one explicitly positive atom in each coordinate package:

\[
2p_2^9,\qquad 4qp_2^9,\qquad qp_2^{11}
\]

for the \(x,c,m\) coordinates respectively. Cone closure proves the
full \(rP\) contribution nonnegative at every Newton order. See
`PATH_ISOLATE_P4_GROUP_P_TAIL_THEOREM_2026-08-01.md`.

After subtracting the already proved quadratic-in-\(x\) term, the exact
remaining order-\(k=r+1\) kernel is

\[
V^r(B_\epsilon+rP),
\qquad
P=JA,
\qquad
B_\epsilon=T^3K^{\rm aff}_\epsilon V+JA.
\]

The separate base \(V^rB_\epsilon\) is not always nonnegative: an exact
2,640-case audit found 302 negative bases. Nevertheless, none of the
2,640 combined expressions was negative, and the worst sampled case
used only about \(37.43\%\) of its available \(rP\) reserve. Therefore
the remaining theorem must preserve this order-dependent compensation.
The exact reduction is
`PATH_ISOLATE_P4_GROUP_AFFINE_TWO_KERNEL_REDUCTION_2026-08-01.md`.

The affine tail also has a preserved finite-entry cone. In reciprocal
variables, coefficientwise nonnegativity on the fixed southwest square
through the target propagates to every later Newton order. An exact audit
of 86 structured zero-excess parameter triples in both parities checks
all pre-entry target coefficients and proves square entry, thereby
certifying all Newton orders for 172 finite parity cases. The maximum
entry order is 28. See
`PATH_ISOLATE_P4_AFFINE_ALL_ORDER_RAY_AUDIT_2026-08-01.md`.

The bottom-pair package now has the same exact affine two-kernel form and
the same southwest-square propagation law. Its reciprocal fixed target
is \(N=4m+x+2\epsilon+8\), the \(c=0\) specialization of the group
target. A 20-case structured audit checks every pre-entry coefficient and
then propagates through all later orders, with no failure and maximum
entry order 24. See
`PATH_ISOLATE_P4_BOTTOM_PAIR_AFFINE_TWO_KERNEL_REDUCTION_2026-08-01.md`.

## 2026-08-01 scaled-excess reserve conjecture

The combined affine obstruction now has a sharper candidate inequality.
With (n=2m+x), exact data support

\[
(n+66)b_r+n r p_r\ge0
\]

for the repaired bottom pair and

\[
(n+79)b_r+n r p_r\ge0
\]

for positive intersections. The original group constant 80 passed 3,606
stratified cases but failed six of 5,330 later dense checks; 79 passes all
of those accumulated cases. The bottom constant 66 passed its original
2,950 cases and 682 later dense checks. These remain conjectural bounds.
Fixed `3/8` and `5/8` bounds and the first one-variable rational bounds
are false.

The corrected scaled kernels do not enter the existing HCU/paired cone,
so the current target is a direct finite hypergeometric central-sum
certificate. See
`PATH_ISOLATE_P4_AFFINE_SCALED_EXCESS_BOUND_CONJECTURE_2026-08-01.md`.

## Correction to exploratory target-row HCU labels

An exploratory target-row routine had capped each rank variable at the
central target while testing a homogeneous row of twice that degree.
That retained only the central monomial, so its reported target-row HCU
labels were vacuous. The cap has been corrected to twice the target.
The corrected audit still gives no negative central coefficient for the
positive \(P\) tail, but it records HCU failures for many signed bases
and combined rows. The central-coefficient values from the old probes
remain valid. None of the exact HCU/Schur theorems above used this
truncated routine, so the correction changes no proved statement.
