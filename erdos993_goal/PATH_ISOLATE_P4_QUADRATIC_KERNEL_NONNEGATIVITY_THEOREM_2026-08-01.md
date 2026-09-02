# Stable path P4: all-order nonnegativity of the quadratic kernel part

## 1. Center-unimodal homogeneous rows

For integers \(a\ge b\ge0\), write

\[
s_{(a,b)}(z,w)=\sum_{i=0}^{a-b}z^{a-i}w^{b+i}.
\]

Call a symmetric bivariate polynomial **HCU** if every homogeneous
component is a nonnegative linear combination of these two-variable Schur
polynomials.  Equivalently, on every fixed total degree its coefficient
row rises weakly from either edge to the center.

HCU polynomials are closed under nonnegative sums and products.  In two
variables this follows directly from

\[
s_{(a,b)}s_{(c,d)}
=\sum_{i=0}^{\min(a-b,c-d)}s_{(a+c-i,b+d+i)}.
\]

## 2. Paired-binomial lemma

Put

\[
e_1=z+w,\qquad p_2=z^2+w^2,\qquad T=e_1+p_2.
\]

For all integers \(A\ge1\) and \(B\ge0\), the polynomial
\(e_1^A p_2^B\) is HCU.  Indeed,

\[
e_1p_2^B=(z+w)(z^2+w^2)^B
\]

has coefficient row

\[
\binom B0,\binom B0,\binom B1,\binom B1,\ldots
\]

up to the center, hence is HCU; multiplication by the HCU polynomial
\(e_1^{A-1}\) preserves the property.

Consequently, after expanding

\[
e_1p_2T^R
=\sum_{b=0}^{R}\binom Rb e_1^{R-b+1}p_2^{b+1},
\tag{1}
\]

every summand is HCU for every integer \(R\ge0\).

## 3. Group curvature factor

The polynomial `Core` in the curvature/reserve theorem has homogeneous
decomposition

\[
\begin{aligned}
C_2&=s_{(2,0)},\\
C_3&=3s_{(3,0)}+2s_{(2,1)},\\
C_4&=3s_{(4,0)}+2s_{(3,1)}+3s_{(2,2)},\\
C_5&=s_{(5,0)}+2s_{(4,1)}+s_{(3,2)},\\
C_6&=zw\,p_2^2.
\end{aligned}
\tag{2}
\]

The first four layers are HCU.  In the exceptional last layer, the factor
\(p_2^2\) merely raises the exponent of \(p_2\) in each summand of (1),
while \(zw\) shifts both exponents equally.  Hence

\[
T^R e_1p_2\,\mathrm{Core}
\]

is HCU for every \(R\ge0\).  So is its product with any powers of
\((1+z)(1+w)=1+e_1+zw\) and \(1+z+w=1+e_1\).

## 4. Bottom-pair curvature factor

Write the positive bottom-pair slope quotient as
\(R_\epsilon(z,w,m)=R_{\epsilon,0}+mR_{\epsilon,1}\).  Exact Schur
expansion gives:

- every homogeneous layer of both \(R_{\epsilon,0}\) and
  \(R_{\epsilon,1}\) below total degree 10 is HCU;
- the degree-10 layer is

\[
2(m+1)(zw)^3p_2^2
\]

for \(\epsilon=0\), and

\[
(2m+3)(zw)^3p_2^2
\]

for \(\epsilon=1\).

The same paired-binomial argument therefore proves that

\[
T^R e_1p_2R_\epsilon
\]

is HCU for every \(R,m\ge0\), in both parities.

## 5. Diagonal-curvature lemma

If \(F\) is HCU, symmetry and center monotonicity on total degree
\(2N-2\) give

\[
\begin{aligned}
-[z^Nw^N](z-w)^2F
&=2\left([z^{N-1}w^{N-1}]F-[z^Nw^{N-2}]F\right)\\
&\ge0.
\end{aligned}
\tag{3}
\]

## 6. Application to every Newton order

Let \(k\ge0\), let \(V=1+z+w\), and use the exact coefficient alignment
of the stable lift.

For a positive-intersection group, the contribution from
\([x^2]K^{\mathrm{group}}_\epsilon\), after clearing the \((zw)^{-k}\)
in \(U^k\), is

\[
-x^2[z^{m+k+2}w^{m+k+2}](z-w)^2
(1+z)^{E_g}(1+w)^{E_g}
V^kT^{2m+\epsilon+1}e_1p_2\,\mathrm{Core},
\tag{4}
\]

where \(E_g=2c+m+x-2\ge0\).  The multiplier in (4) is HCU by Sections
2--3, so (3) proves that (4) is nonnegative.

For the bottom pair, the corresponding contribution is

\[
-x^2[z^{m+k+2}w^{m+k+2}](z-w)^2
(1+z)^{E_b}(1+w)^{E_b}
V^kT^{2m+\epsilon}e_1p_2R_\epsilon,
\tag{5}
\]

where \(E_b=m+x-2\ge1\) in the stable range \(m\ge3\).  Sections 2 and
4 again make the multiplier HCU, so (5) is nonnegative.

Therefore the complete quadratic-in-\(x\) portion of the signed kernel is
nonnegative after coefficient extraction for every Newton order, every
admissible parameter choice, and both parities, in both the
positive-intersection and repaired bottom-pair lifts.

The remaining signed-kernel problem is only affine in \(x\).

## 7. Exact certificates

The finite polynomial identities behind the all-parameter proof are
checked independently by:

- `prove_path_isolate_p4_curvature_reserve_identity.py`;
- `prove_path_isolate_p4_group_curvature_mcu.py`;
- `prove_path_isolate_p4_bottom_pair_curvature_mcu.py`.

Their certificates are, respectively:

- `path_isolate_p4_curvature_reserve_identity_20260801.json`;
- `path_isolate_p4_group_curvature_mcu_20260801.json`;
- `path_isolate_p4_bottom_pair_curvature_mcu_20260801.json`.

All three report `PASS` statuses.  The group verifier additionally checks
26,163 center-difference inequalities through \(T^{40}\); this finite
sweep is only a sanity audit, not a substitute for the all-power proof.

