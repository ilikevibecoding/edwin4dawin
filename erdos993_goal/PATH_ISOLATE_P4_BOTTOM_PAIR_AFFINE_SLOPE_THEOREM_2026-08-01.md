# Stable path P4: positive affine slope of the bottom-pair lift

Date: 2026-08-01

Let \(P^{\mathrm{pair}}_\epsilon(z,w,m,s,x)\) be the reduced
coefficient-extraction integrand for

\[
B_\epsilon(m+1,s,x)-B_\epsilon(m,s,x),
\qquad
B_\epsilon=H(2m+\epsilon,0)+H(2m+\epsilon,1),
\]

after removal of the common factor

\[
T^{2m+\epsilon-5},\qquad
T=z(1+z)+w(1+w).
\]

Then the dependence on the support distance is exactly affine:

\[
\boxed{
P^{\mathrm{pair}}_\epsilon
=z^2w^2T^3K^{\mathrm{pair}}_\epsilon(z,w,m,x)
+(s+1)J^{\mathrm{pair}}_\epsilon(z,w,m).
}
\tag{1}
\]

The signed kernel \(K^{\mathrm{pair}}_\epsilon\) has degree at most
\((17,17,3,2)\) in \((z,w,m,x)\).  All unbounded support-distance
dependence is carried by the positive slope.

## Positive slope

For both parities, \(J^{\mathrm{pair}}_\epsilon\) has 678 nonzero
monomials and no negative coefficient.  It is independent of \(x\),
linear in \(m\), and factors as

\[
\begin{aligned}
J^{\mathrm{pair}}_\epsilon={}&
z^2w^2(1+z)(1+w)(z+w)(z^2+w^2)T^5\\
&\cdot
\bigl(2z^2w^2+4z^2w+3z^2+4zw^2+8zw+6z
      +3w^2+6w+4\bigr)\\
&\cdot R_\epsilon(z,w,m),
\end{aligned}
\tag{2}
\]

where \(R_\epsilon\) has 80 nonzero monomials, degree at most
\((7,7,1)\), and every coefficient is positive.  The smallest
coefficient in \(R_\epsilon\) is \(1\).

## Exact parity relation

Let \(J^{\mathrm{group}}\) be the universal 276-term slope from the
positive-intersection lift.  The two bottom-pair slopes satisfy

\[
\boxed{
J^{\mathrm{pair}}_1-J^{\mathrm{pair}}_0
=zw(1+z)(1+w)J^{\mathrm{group}}.
}
\tag{3}
\]

Thus the odd slope exceeds the even slope by a manifestly positive
polynomial.  Equations (1)--(3) show that the positive-intersection
and bottom-pair packages are driven by the same universal positive
residual mechanism; their remaining difference is confined to the
bounded-degree constant kernels.

The exact verifier is
\`prove_path_isolate_p4_bottom_pair_affine_slope.py\`; its certificate
is \`path_isolate_p4_bottom_pair_affine_slope_20260801.json\`.  The
sparse source exports are
\`path_isolate_p4_bottom_pair_lift_integrand_parity0_terms_20260801.json\`
and
\`path_isolate_p4_bottom_pair_lift_integrand_parity1_terms_20260801.json\`.
