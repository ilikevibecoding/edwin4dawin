# Sharp rank-three forest payment floor

Date: 2026-07-29

## Theorem

Under the rank-three down-link law of
`RANK3_FOREST_COMPONENT_VARIANCE_2026-07-29.md`, let

\[
h_v=|V(F-N[v])|,\qquad
c_v=c(F-N[v]),\qquad
z_v=\frac{2c_v}{h_v}.
\]

Then every positive-mass forest satisfies

\[
\boxed{
\mathbb E c_v-\operatorname{Var}(h_v)
-2\operatorname{Cov}(h_v,z_v)\ge1.
}
\tag{PF3}
\]

Since \(A_v=h_v-3+z_v\) and
\(\operatorname{Var}(z_v)\le1\), this implies

\[
\boxed{\operatorname{Var}(A_v)\le\mathbb E c_v.}
\tag{CV3+}
\]

The constant in (PF3) is sharp, with equality for the three-vertex
path.

## Proof structure

Use the nonnegative parameters from the rank-three forest proof:

\[
I,\quad T,\quad N,\quad
X_j=\sum x_v^j,\quad
Q=\sum_{uv\in E}x_ux_v.
\]

After multiplying (PF3) by the square \(M^2\) of the down-link mass,
the numerator is exactly

\[
\mathcal C+MX_3+6MQ+\mathcal B X_2+5X_2^2.
\tag{1}
\]

If \(\mathcal B\ge0\), nonnegativity follows from
\(\mathcal C\ge0\).  If \(\mathcal B<0\), Cauchy--Schwarz gives
\(X_2^2\le NX_3\), and the quadratic in \(X_2\) is nonnegative when

\[
\Delta=4(M+5N)\mathcal C-N\mathcal B^2\ge0.
\tag{2}
\]

For \(I=0\) and \(T\ge1\), both \(\mathcal C\) and
\(\Delta/4\) become polynomials with nonnegative coefficients after
the integer-domain shift \(T=U+1\).  Every isolated-vertex increment
has the same property, while

\[
\mathcal B(I)-\mathcal B(0)
=2I(5I+2N+12T+7)\ge0.
\]

For a single nontrivial component and at least two isolates, the
same coefficientwise argument works after \(I=J+2\).  With exactly
one isolate,

\[
\mathcal C=
2N^4-N^3-6N^2+14N+4\ge0,
\]

and

\[
\Delta=
8(N-1)
(N^5+4N^4+13N^3+22N^2+20N-8)\ge0.
\]

For a connected tree with no isolate,

\[
\mathcal C=N^2(N^2-5N-1),
\qquad
\Delta=4N^3(N-10)(N+1)^2.
\]

Thus the symbolic proof covers \(N\ge10\).  The remaining connected
trees have order at most 11.  There are 434 trees in the complete
order-three-through-eleven census; their integer numerators are
checked directly, with equality only at \(P_3\).

A forest consisting only of isolates has constant \(h\) and \(z\),
so (PF3) reduces to \(n-1\ge1\).

## Verification

Run `verify_rank3_forest_payment_floor.py`.  It reconstructs (1) from
the original forest moment identities, verifies every
coefficientwise positivity claim and factorization symbolically, and
performs the complete exceptional-tree census.  It writes
`rank3_forest_payment_floor_certificate_20260729.json`.

This proves the sharp \(q=1\) instance of the observed arbitrary-rank
floor.  Extending (PF3) to all independent \(q\)-set down-links would
prove arbitrary-rank (CV) with room to spare.
