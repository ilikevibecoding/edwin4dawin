# Stable path P4: bottom-pair affine two-kernel reduction

This note gives the exact affine residual and finite-entry mechanism for
the bottom-pair lift

\[
B_\epsilon(m+1,s,x)-B_\epsilon(m,s,x),
\qquad
B_\epsilon=H(2m+\epsilon,0)+H(2m+\epsilon,1).
\]

It is a reduction plus exact all-order finite evidence, not a uniform
proof for every \(m,x\).

## Exact two-kernel form

Put

\[
q=zw,\qquad A=(1+z)(1+w),\qquad
T=z(1+z)+w(1+w),\qquad V=1+z+w.
\]

After the already proved quadratic-in-\(x\) contribution is removed, let
\(K^{\rm aff}_\epsilon\) be the remaining kernel and
\(J^{\rm pair}_\epsilon\) the positive support-distance slope. Define

\[
P_\epsilon=J^{\rm pair}_\epsilon A,
\]

\[
B_\epsilon^{\rm ker}
=q^2T^3K^{\rm aff}_\epsilon V+J^{\rm pair}_\epsilon A.
\]

For Newton order \(k=r+1\ge1\), the affine residual is the coefficient
extraction from

\[
A^{m+x-3}T^{2m+\epsilon-5}V^r
\left(B_\epsilon^{\rm ker}+rP_\epsilon\right),          \tag{1}
\]

at the moving original target

\[
(m+r+5,m+r+5).                                          \tag{2}
\]

The kernels in parentheses have common bidegree \((26,26)\).
The reserve \(P_\epsilon\) has 774 nonzero monomials, all positive, and
is linear in \(m\). The signed base has 2,516 terms in even parity and
2,518 in odd parity, with degree at most \((26,26,3,1)\) in
\((z,w,m,x)\).

The derivation is
`analyze_path_isolate_p4_bottom_pair_affine_two_kernel.py`, recorded in
`path_isolate_p4_bottom_pair_affine_two_kernel_20260801.json`.

## Independent target validation

The outer exponents and target (2) were checked directly against the
combinatorial definition of the unnormalized bottom-pair lift at
\((m,x)=(3,0)\), both parities, and the first three nontrivial Newton
orders. All six exact integer comparisons agree. See
`verify_path_isolate_p4_bottom_pair_two_kernel_target.py` and
`path_isolate_p4_bottom_pair_two_kernel_target_20260801.json`.

## Reciprocal fixed target and propagation

Set

\[
S=z^2+w^2+zw(z+w),\qquad W=z+w+zw.
\]

Reciprocity turns (2) into the fixed target

\[
\boxed{N=4m+x+2\epsilon+8.}                            \tag{3}
\]

With \(a=m+x-3\), \(b=2m+\epsilon-5\), put

\[
F_r=A^aS^bW^r
\left((B_\epsilon^{\rm ker})^\vee+rP_\epsilon^\vee\right).
\]

Since \(P_\epsilon^\vee\) is coefficientwise positive,

\[
F_{r+1}=WF_r+A^aS^bW^{r+1}P_\epsilon^\vee.             \tag{4}
\]

Thus coefficientwise nonnegativity on the southwest square
\(0\le i,j\le N\) at one order propagates to every later order, exactly
as in the positive-intersection package.

## Exact all-order finite audit

The parameter points

\[
(m,x)=(3,0),(4,0),(6,0),(10,0),(20,0),
\]

\[
(3,4),(3,12),(3,24),(3,48),(10,24)
\]

were checked in both parities. For every one of the 20 parity cases:

- every pre-entry target coefficient is nonnegative;
- a southwest-square entry order exists;
- (4) certifies every later order.

Hence every sampled case is certified for all Newton orders. The maximum
entry order is 24, and there are no pre-entry central failures. The audit
is `probe_path_isolate_p4_bottom_pair_affine_southwest_square_entry.py`,
with record
`path_isolate_p4_bottom_pair_affine_southwest_square_entry_20260801.json`.

The remaining theorem is the uniform moving-boundary entry and pre-entry
central inequality for all \(m\ge3,x\ge0\), both parities.
