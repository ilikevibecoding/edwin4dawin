# Stable path P4: positive-intersection affine two-kernel reduction

This note isolates the exact proposition still required for the
positive-intersection half of the stable path P4 argument. It is a
reduction, not a proof of that proposition.

## Domain and variables

Let

\[
q=zw,\qquad A=(1+z)(1+w),\qquad V=1+z+w,
\]

\[
T=z(1+z)+w(1+w),
\]

and work on

\[
c\ge1,\qquad m\ge3,\qquad x\ge0,
\]

for either parity \(\epsilon\in\{0,1\}\). The common path-count and
denominator factors removed below are strictly positive, so their
removal preserves the desired sign.

## Quadratic part already closed

The bounded signed kernel has the exact split

\[
K_\epsilon=K^{\rm aff}_\epsilon-x^2(z-w)^2D_\epsilon,
\]

where \(K^{\rm aff}_\epsilon\) is affine in \(x\) and
\(D_\epsilon\) is coefficientwise positive. The reserve identity and
the all-power HCU/Schur theorem prove that the complete contribution of
the displayed quadratic term is nonnegative after the required central
diagonal extraction. This is the theorem in
`PATH_ISOLATE_P4_QUADRATIC_KERNEL_NONNEGATIVITY_THEOREM_2026-08-01.md`.

Thus only \(K^{\rm aff}_\epsilon\) remains.

## Exact all-order two-kernel identity

For Newton order \(k=r+1\ge1\), the affine residual, after removing the
common positive multiplier

\[
A^{2c+m+x-3}T^{2m+\epsilon-4},
\]

is the central diagonal extraction of

\[
V^r(B_\epsilon+rP),                                      \tag{1}
\]

where

\[
P=JA,
\qquad
B_\epsilon=T^3K^{\rm aff}_\epsilon V+JA.                 \tag{2}
\]

The factor \(P\) is independent of the parity. Its reciprocal is HCU
after the shift \(c=1+C,m=3+M\), and its quotient by \(e_1=z+w\) lies
in the paired cone. The latter certificate consists of 17 HCU layers
and the single positive atom

\[
2p_2^8,\qquad p_2=z^2+w^2.
\]

Because the cone is closed under the reciprocal multipliers appearing
in (1), the entire \(rP\) contribution is nonnegative for every
\(r,C,M,x\ge0\). This is the exact grouped-\(P\)-tail theorem recorded
in `PATH_ISOLATE_P4_GROUP_P_TAIL_THEOREM_2026-08-01.md`.

## Why the reserve cannot be discarded

The separate claim that the extraction of \(V^rB_\epsilon\) is always
nonnegative is false. In an exact 2,640-case stress audit, it was
negative 302 times. The first example is

\[
(\epsilon,c,m,x,r)=(0,1,3,4,9),
\]

where

\[
B=-89\,859\,503\,014\,088,
\qquad
P=2\,014\,625\,652\,947\,460.
\]

The full value \(B+rP\) is positive. Across all 2,640 audited full
expressions there was no negative value. The largest observed fraction
of the available reserve needed to compensate a negative base was

\[
0.37429710931095317
\]

at \((\epsilon,c,m,x,r)=(1,1,12,24,20)\). These are exact-integer
computations; the decimal is only the displayed ratio approximation.
They are evidence, not a uniform proof.

## Low-order front already proved

Newton orders \(0,1,2,3,4,5,6\) have uniform positive rational
certificates for both parities and all three coordinate recurrences
\(x,c,m\) on \(c\ge1,m\ge3,x\ge0\). The 42 exact certificates have no
negative coefficient. See
`PATH_ISOLATE_P4_POSITIVE_INTERSECTION_INITIAL_MULTIPLICATIVE_ORDER6_THEOREM_2026-08-01.md`.

## Remaining proposition

It remains to prove, for each parity and all
\(c\ge1,m\ge3,x,r\ge0\), that the required central diagonal coefficient
of

\[
V^r(B_\epsilon+rP)
\]

is nonnegative. Orders through six and the entire positive \(rP\) tail
are theorems, but neither statement alone controls the signed base at
every higher order. A successful certificate must retain the
order-dependent compensation in (1); any proof that separates \(B\)
from \(rP\) as two nonnegative objects cannot work.

The most direct remaining route is to factor the common positive
hypergeometric term in the diagonal coefficients of \(B_\epsilon\) and
\(P\), then prove the exact ratio bound

\[
-\frac{[\mathrm{diag}]V^rB_\epsilon}
       {r[\mathrm{diag}]V^rP}\le1
\]

whenever the numerator is positive. The bounded degrees of
\(K^{\rm aff}_\epsilon\) make a finite creative-telescoping certificate
plausible.

There is also a finite-entry formulation. After reciprocity, the target
is the fixed point

\[
N=2c+4m+x+2\epsilon+8,
\]

and

\[
F_r=A^aS^bW^r(B^\vee_\epsilon+rP^\vee)
\]

satisfies

\[
F_{r+1}=WF_r+A^aS^bW^{r+1}P^\vee.
\]

Therefore coefficientwise nonnegativity on the fixed southwest square
\(0\le i,j\le N\) at any one order propagates to every later order.
All 22 exact sample cases enter this cone. See
`PATH_ISOLATE_P4_AFFINE_SOUTHWEST_SQUARE_PROPAGATION_LEMMA_2026-08-01.md`.

Equivalently, every coefficient in the bridge has the explicit positive
shifted-binomial forward-difference weight from
`SHIFTED_BINOMIAL_PRODUCT_FORWARD_DIFFERENCE_THEOREM_2026-08-01.md`.
That formula and the direct polynomial extraction agree in 42 independent
exact bridge comparisons.
