# Adjacent-cubic collision topology theorem

Status: **proved in all odd and even orders**.  Both 15-record tail sign packages,
the small-reserve exceptions, the prefix floor, and the dependency validator pass.
This note states how those certificates close the higher-root half of adjacent-cubic
compatibility and prove the gamma-degree-four window theorem.

## 1. Shared-prefix setup

Let `A` be the final 3 by 3 tail of the Darboux current matrix and let `H` be
the final 2 by 2 tail of the adjacent matrix:

\[
A=\begin{pmatrix}
a_0&\sqrt{b_1}&0\\
\sqrt{b_1}&a_1&\sqrt{b_2}\\
0&\sqrt{b_2}&a_2
\end{pmatrix},\qquad
H=\begin{pmatrix}d_0&\sqrt f\\ \sqrt f&d_1\end{pmatrix}.
\]

Both full matrices attach these tails, through the same squared coupling, to the
same leading classical Jacobi prefix.  Write

\[
n_A(y)=(y-a_1)(y-a_2)-b_2,\quad
q_A(y)=(y-a_0)n_A(y)-b_1(y-a_2),
\]
\[
n_H(y)=y-d_1,\qquad q_H(y)=(y-d_0)(y-d_1)-f.
\]

At a common full eigenvalue that is not a removable pole, eliminating the shared
prefix gives equality of the two tail Weyl functions.  Its numerator is the cubic

\[
C(y)=n_A(y)q_H(y)-n_H(y)q_A(y).
\]

More explicitly, if `p_m` and `p_(m-1)` are the consecutive characteristic
polynomials of the shared prefix and `rho^2` is the common squared coupling, the
two full characteristic polynomials are

\[
F_A=p_mq_A-\rho^2p_{m-1}n_A,\qquad
F_H=p_mq_H-\rho^2p_{m-1}n_H.                                  \tag{0}
\]

At a common zero, cross-multiplying (0) gives both `p_m C=0` and
`p_(m-1) C=0`.  Consecutive Jacobi characteristic polynomials are coprime, so
**every** common full eigenvalue satisfies `C(y)=0`; no division by a possibly
vanishing tail determinant is hidden here.

With \(\delta=a_0-d_0\), direct cancellation gives the useful form

\[
C(y)=n_A(y)\{\delta (y-d_1)-f\}
       +b_1(y-d_1)(y-a_2).                                      \tag{1}
\]

Eliminating the tail blocks instead shows that, at a common full eigenvalue, the
difference between the numbers of full eigenvalues strictly below \(y\) is exactly
the difference between the numbers of eigenvalues of `A` and `H` strictly below
\(y\).  The prefix Schur complements are identical because the two tail Weyl
values agree.  Eliminating the first tail coordinates once more reduces this
difference to the trailing block

\[
B=\begin{pmatrix}a_1&\sqrt{b_2}\\\sqrt{b_2}&a_2\end{pmatrix}
\]

versus the scalar \(d_1\).  In formulas, away from poles the two congruences are

\[
\operatorname{In}(yI-J_A)=\operatorname{In}(yI-A)+
 \operatorname{In}\!\left(yI-P-\rho^2{n_A\over q_A}ee^T\right),
\]
\[
\operatorname{In}(yI-A)=\operatorname{In}(yI-B)+
 \operatorname{In}\!\left({q_A\over n_A}\right),                 \tag{1a}
\]

with identical formulas for `H`.  At `C=0` the two scalar Weyl quantities in
each line agree, so they cancel from the inertia difference.  Here positive
inertia of `yI-J` counts eigenvalues of `J` strictly below `y`.

This also covers the genuine pole case: if
`q_A=q_H=0`, (0) forces `p_(m-1)=0` while `p_m!=0`.  Eliminating the invertible
prefix then contributes the same block to both full inertias (its endpoint Weyl
value is zero), while irreducibility gives `n_A n_H != 0` and the two tail
first-coordinate Schur complements are the same zero.  The opposite apparent pole would require
`n_H=n_A=0`, i.e. `y=d_1` and `n_A(d_1)=0`; item 2 below certifies
`n_A(d_1)<0`, so it cannot occur.  Thus the inertia comparison needs no
genericity assumption.

## 2. Exact sign package

Let \(\lambda_-<\lambda_+\) be the eigenvalues of `B`, and let \(\mu_-<\mu_+\)
be the eigenvalues of `H`.  The certificate checks the following rational signs for
both parity families, for every integer reserve \(r\ge0\), every
\(0\le u,v\le1\), and every \(c>0\):

1. \(\delta\ge0\) and \(d_1>a_2\).
2. \(b_2-(d_1-a_1)(d_1-a_2)>0\), hence
   \(\lambda_-<d_1<\lambda_+\).
3. Put
   \[
   T=a_1+a_2,\quad L=T-d_0-d_1,\quad
   M=d_0d_1-f-a_1a_2+b_2,\quad
   \Delta=(a_1-a_2)^2+4b_2.
   \]
   The signs \(-L>0\) and
   \[
   L^2\Delta-(2M+LT)^2>0                                      \tag{2}
   \]
   imply \(q_H(\lambda_-)>0\).  The certificate forms the left side of (2) as
   \[
   -4\operatorname{Res}(n_A,q_H)
   =-4\{M^2+LMT+L^2(a_1a_2-b_2)\},                            \tag{2a}
   \]
   an identical but substantially smaller exact expression.  Indeed,
   \[
   2q_H(\lambda_-)=2M+LT-L\sqrt\Delta>0.
   \]
   Since \(\lambda_-<a_2<d_1<\mu_+\), this gives
   \(\lambda_-<\mu_-\).
4. If \(\delta>0\), put \(z=d_1+f/\delta\).  The three certified signs
   \[
   \delta(z-a_1)>0,\qquad \delta(z-a_2)>0,\qquad
   \delta^2 n_A(z)>0                                          \tag{3}
   \]
   give \(z>\lambda_+\).  If \(\delta=0\), the corresponding inequality is
   immediate from \(-f<0\).
5. After the affine substitution
   \(y=1/4+t(a_2-1/4)\), let `K_0,...,K_3` be the four degree-three
   Bernstein controls of \(C(y)\).  Three separately certified pivot-denominator
   factors `D_0,D_1,D_2` are positive.  The exact engine reduces
   \[
   D_0D_1D_2^kK_k\qquad(0\le k\le3)                           \tag{4}
   \]
   over the rational multivariate function field and then converts only \(u,v\)
   to Bernstein form.  Each remaining fixed-index slice is a polynomial in \(c\):

   * for `K_0`, every slice is `A+B c+D c^2`, with exact certificates
     `A>0`, `D>0`, and `4AD-B^2>0`;
   * for `K_1`, every cubic slice is either coefficientwise positive or has
     positive constant and leading coefficients and strictly negative cubic
     discriminant, so its unique real root is negative;
   * for `K_2,K_3`, every \(c\)-power control is coefficientwise positive.

   Thus every scaled, and hence every unscaled, `K_k` is positive.  The slice
   discriminants are essential: some middle \(c\)-power controls really change
   sign as real functions of \(r\), so the stronger raw-control claim is false.

Every atomic sign, quadratic gap, and negative cubic discriminant above has a
nonnegative-power certificate in \(r\), with a positive constant term.  The
denominators and the three factors in (4) have independent positive certificates.

## 3. The finite tail lemma

At a Weyl collision, equality of the two tail counts is equivalent to equality of
the count for `B` and the count for the scalar \(d_1\).  By item 2, this can happen
only in

\[
y<\lambda_-\qquad\hbox{or}\qquad d_1<y<\lambda_+.             \tag{4}
\]

The second interval is impossible.  There \(n_A(y)<0\), \(y-d_1>0\), and
\(y-a_2>0\).  Items 1 and 4 give
\(\delta(y-d_1)-f<0\), so both terms on the right of (1) are positive.

In the first interval, item 3 gives \(y<\lambda_-<\mu_-\).  Thus `H` has no
eigenvalue below \(y\), and equality of the tail counts says that `A` has none
either.  This is therefore the tail ground branch.

Finally \(\lambda_-<a_2\).  If \(a_2\le1/4\), every point of the lower interval
is already below \(1/4\).  If \(a_2>1/4\), item 5 and (1) exclude a collision on
\([1/4,a_2]\).  Consequently:

> Every equal-inertia tail Weyl collision is a ground-branch collision below
> \(1/4\).

For odd \(r=0,1\) and even \(r=0\), the same four-control calculation is made on
\([1/20,a_2]\), giving the stronger small-reserve bound \(y<1/20\).

## 4. Shared-prefix floor

The shared prefix is the shifted Jacobi matrix with

\[
(\alpha,\beta,m)=(2r+1,1/2,r+3)\quad\hbox{(odd)},
\]
\[
(\alpha,\beta,m)=(2r+2,-1/2,r+4)\quad\hbox{(even)}.
\]

Exact rational LDL certificates give a prefix minimum above \(1/4\) for odd
\(2\le r<100\) and even \(1\le r<100\).  For \(r\ge100\), Krasikov's explicit
Jacobi extreme-zero bound reduces, after reflection, to six univariate polynomial
inequalities with nonnegative coefficients after the shift \(r\mapsto r+100\).
It gives the same strict quarter floor.  The three small reserves have an exact
LDL floor above \(1/20\).

Combining this floor with the finite tail lemma, an equal-index common eigenvalue
lies below both diagonal blocks in each full block decomposition.  After eliminating
the positive tail block, the shared prefix is changed by a rank-one negative
semidefinite term.  Such an update has at most one nonpositive direction; because
the common eigenvalue supplies a zero direction, it has no negative direction.
Hence the common eigenvalue is the ground eigenvalue of each full matrix.  Thus no
same-index collision above the ground branch is possible.

## 5. Continuation

In the interior parameter domain \(0<u,v<1\), \(c>0\), both Jacobi spectra are
simple and depend continuously on the parameters.  The domain is connected.  At
the limiting boundary \(u=v=0, c=\infty\), the current and adjacent rows tend,
after harmless positive rescaling, to `X_0` and `X_1`.  The exact identity
`X_1=eta_0 X_0'` and strict derivative interlacing give

\[
u_i<h_i<u_{i+1}.
\]

The gaps are strict at this fixed-order limit, so the same orientation holds at
some finite large \(c\) and small positive \(u,v\), providing an actual interior
base point.

The sign of \(h_i-u_i\) can change only at a same-index common eigenvalue.  The
tail lemma says this is impossible for \(i\ge2\); the already proved Turán ground
theorem gives \(u_1\le h_1\) everywhere.  Hence

\[
u_i\le h_i\qquad(1\le i\le\deg H).
\]

Let the roots of the equal-degree second summand `tH` be
`v_1=0` and `v_(i+1)=h_i`.  The previously certified Darboux inequality is

\[
v_i\le u_{i+1},
\]

while the new inequality is exactly `u_i<=v_(i+1)`.  These are the two interval-
overlap inequalities for a common interlacer of `U` and `tH`; equivalently, every
positive combination of the two summands is real-rooted.  Boundary parameters
follow by continuity.  Notice that this does **not** assert the stronger and false
fixed alternation `h_i<=u_(i+1)`.

## 6. Quartic consequence

For the cubic input

\[
G_c=(1-ut)(1-vt)(t+c),
\]

the factorial recursion for one more negative factor is

\[
S_{p,\alpha}[(t+d)G_c]=dU+tH.
\]

The common-interlacer conclusion above makes this polynomial real-rooted for every
`d>0` on the sharp reserve-thirteen boundary.  Its coefficients are strictly
positive, so every root is negative.  The already proved Euler-multiplier step then
propagates the result to every larger reserve.  Thus completion of the two parity
certificates proves the all-order gamma-degree-four window theorem.  Further
appended negative factors require the separate PF-constrained induction described
in `ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md`; this section does
not claim the full forest conjecture.

## 7. Certificate and scope

The independent dependency validator is
`verify_adjacent_cubic_collision_topology_theorem.py`; its report is
`adjacent_cubic_collision_topology_theorem_20260806.json`, with status
`ALL_ORDER_ADJACENT_CUBIC_COMPATIBILITY_AND_QUARTIC_WINDOW_PROVED`.
It checks the two 15-record parity reports, all quadratic and cubic slice
discriminants, the collision identities, the prefix floors, the three `1/20`
exceptions, the one-sided Darboux theorem, the ground Turan theorem, and the cubic
input theorem.  This proves the quartic window statement only; arbitrary gamma
degree and the signed forest-selector two-outlier pattern remain separate obligations.
