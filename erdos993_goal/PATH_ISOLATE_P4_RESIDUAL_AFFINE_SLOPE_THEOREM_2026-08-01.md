# Stable path P4: universal positive support-distance slope

Date: 2026-08-01

Let \(P_\epsilon(z,w,c,m,s,x)\) be the reduced stable two-layer
residual integrand exported by
`derive_path_isolate_p4_group_integrand.py`, after removal of the
common factor

\[
T^{2m+\epsilon-4},\qquad
T=z(1+z)+w(1+w).
\]

The two parity integrands satisfy the exact identity

\[
\boxed{
P_\epsilon=A_\epsilon(z,w,c,m,x)+sJ(z,w)
=T^3K_\epsilon(z,w,c,m,x)+(s+1)J(z,w).
}
\tag{1}
\]

In particular, the dependence on the support distance \(s\) is
affine, and its slope is independent of the parity and of all four
parameters \(c,m,s,x\).

## Positive slope factorization

The universal slope has 276 nonzero monomials, all positive, and
factors as

\[
\begin{aligned}
J={}&z^2w^2(1+z)(1+w)(z+w)(z^2+w^2)T^5\\
&\quad\cdot
\bigl(2z^2w^2+4z^2w+3z^2+4zw^2+8zw+6z
      +3w^2+6w+4\bigr)\\
&\quad\cdot\bigl(
z^5w+z^5+3z^4w+3z^4+2z^3w^3+4z^3w^2
+5z^3w+3z^3\\
&\qquad\qquad
+4z^2w^3+8z^2w^2+5z^2w+z^2
+zw^5+3zw^4+5zw^3+5zw^2+zw\\
&\qquad\qquad
+w^5+3w^4+3w^3+w^2
\bigr).
\end{aligned}
\tag{2}
\]

Every displayed factor has nonnegative coefficients.  The smallest
coefficient of the expanded slope is \(2\).

## Newton consequence

Put \(n=s+1\),

\[
R=\frac{(1+z)(1+w)}{zw},\qquad
U=R-1=\frac{1+z+w}{zw}.
\]

For the Newton transform in \(n\), the two affine pieces in (1)
contribute

\[
\frac{T^3K_\epsilon}{1-tU}
+\frac{JRt}{(1-tU)^2}.
\]

Thus the coefficient of Newton order \(k\ge1\) is the coefficient
extraction of

\[
\boxed{
T^3K_\epsilon U^k+kJRU^{k-1}.
}
\tag{3}
\]

The second summand in (3) is now an unconditional positive term for
every order and every admissible parameter choice.  All remaining
sign difficulty is confined to the lower-degree kernel
\(K_\epsilon\), which has only degree \(2\) in each of \(c,m,x\) and
degree at most \(17\) in each of \(z,w\).  This is a substantially
smaller target than the original 2,944-term signed residual.

The exact verifier is
`prove_path_isolate_p4_residual_affine_slope.py`; its machine-readable
certificate is
`path_isolate_p4_residual_affine_slope_20260801.json`.  It checks both
sparse parity exports, the parity identity, the complete factorization
(2), coefficient positivity, and the two \(T^3\) divisibilities in
(1).
