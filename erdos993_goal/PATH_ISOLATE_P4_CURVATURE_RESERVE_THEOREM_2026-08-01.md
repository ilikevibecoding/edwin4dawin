# Stable path P4: curvature/reserve identity

## Statement

Put

\[
T=z(1+z)+w(1+w)
\]

and

\[
\Lambda=2z^2w^2+4z^2w+3z^2+4zw^2+8zw+6z
        +3w^2+6w+4.
\]

Let `Core` be the positive 21-term polynomial in
`PATH_ISOLATE_P4_RESIDUAL_AFFINE_SLOPE_THEOREM_2026-08-01.md`, and define

\[
D^{\mathrm{group}}
=z^2w^2(1+z)(1+w)(z+w)(z^2+w^2)T^2\,\mathrm{Core}.
\]

For each parity \(\epsilon\in\{0,1\}\), the bounded group kernel satisfies

\[
[x^2]K^{\mathrm{group}}_\epsilon
=-(z-w)^2D^{\mathrm{group}},
\qquad
J^{\mathrm{group}}=T^3\Lambda D^{\mathrm{group}}.
\]

The first identity is identical in both parities.  The polynomial
\(D^{\mathrm{group}}\) has 102 monomials, all positive, and its smallest
coefficient is 1.

For the bottom-pair lift, let \(R_\epsilon(z,w,m)\) denote the positive
80-term quotient in the bottom-pair affine-slope theorem and put

\[
D^{\mathrm{pair}}_\epsilon
=(1+z)(1+w)(z+w)(z^2+w^2)T^2R_\epsilon.
\]

Then, for both parities,

\[
[x^2]K^{\mathrm{pair}}_\epsilon
=-(z-w)^2D^{\mathrm{pair}}_\epsilon,
\qquad
J^{\mathrm{pair}}_\epsilon
=z^2w^2T^3\Lambda D^{\mathrm{pair}}_\epsilon.
\]

Each \(D^{\mathrm{pair}}_\epsilon\) has 285 monomials in \(z,w,m\), all
positive, and its smallest coefficient is 1.

## Diagonal-curvature consequence

Let \(F(z,w)\) be symmetric.  On total degree \(2N-2\), suppose its
coefficient row rises weakly from either edge to the center.  Then

\[
\begin{aligned}
-[z^Nw^N](z-w)^2F
&=2\bigl([z^{N-1}w^{N-1}]F-[z^Nw^{N-2}]F\bigr)\\
&\ge 0.
\end{aligned}
\]

Thus the apparently negative quadratic term contributes nonnegatively
after diagonal extraction whenever its remaining symmetric multiplier has
center-unimodal homogeneous coefficient rows.  The unresolved bridge is
now the preservation of that row-shape property by the explicit factors
appearing in the Newton lift.

## Verification

`prove_path_isolate_p4_curvature_reserve_identity.py` reconstructs the
four sparse integrands, performs all divisions and comparisons exactly
over the integers, checks coefficientwise positivity, and writes
`path_isolate_p4_curvature_reserve_identity_20260801.json`.

The certificate status is
`PASS_PATH_ISOLATE_P4_CURVATURE_RESERVE_IDENTITY`.

## Completed coefficient-shape bridge

The center-unimodality condition above is now proved for the full
multiplier in every Newton order, for both group parities and both
bottom-pair parities.  The proof expands
\(T=(z+w)+(z^2+w^2)\), uses paired binomial coefficients to establish
Schur positivity after the universal \((z+w)(z^2+w^2)\) prefactor, and
checks the finite exceptional homogeneous layers exactly.  Therefore the
entire quadratic-in-\(x\) signed-kernel contribution is nonnegative.
See `PATH_ISOLATE_P4_QUADRATIC_KERNEL_NONNEGATIVITY_THEOREM_2026-08-01.md`.

