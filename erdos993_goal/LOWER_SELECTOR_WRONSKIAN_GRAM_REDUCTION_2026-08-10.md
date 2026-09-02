# Lower selector: Wronskian Gram and central-surplus reduction

## Status

This note records exact all-order algebra and a finite exact replay.  It
does **not** claim an all-order proof of the remaining real-axis Wronskian
inequality.

Put

\[
 G_q=G_{N-q,s},\qquad W_{ij}=W(G_i,G_j)=G_i'G_j-G_iG_j',
\]

and define

\[
 T=G_1^2-G_0G_2,\qquad S=(G_1')^2-G_0'G_2'.
\]

## 1. Exact Gram identity

Direct expansion gives

\[
 D_W:=W_{02}^2-4W_{01}W_{12}=(T')^2-4TS.          \tag{1}
\]

Equivalently,

\[
 -D_W=4\det\begin{pmatrix}T&T'/2\\T'/2&S\end{pmatrix}. \tag{2}
\]

This also eliminates the apparently separate positive-axis Turan
obligation.  If `D_W(t)<0` for `t>0`, then `T` cannot vanish there, because
at a zero of `T`, (1) gives `D_W=(T')^2>=0`.  The first nonzero coefficient
of `T` is positive in every admissible nonterminal case, so `T(t)>0` on the
whole positive axis.

## 2. The proposed derivative coefficient bound is false

Write

\[
 T_n=[t^n]T,\qquad S_n=[t^n]S,
\]

with absent coefficients interpreted as zero.  The initially proposed
bound was

\[
 S_{n-2}\mathrel{?\ge} \left\lfloor{n^2\over4}\right\rfloor T_n,
 \qquad n\ge2.                                      \tag{3}
\]

It already fails at `(N,s,n)=(9,5,2)`:

\[
 T_2=2075872,\qquad S_0=2074240<T_2.              \tag{3a}
\]

There are 445 failed coefficients in 188 parameter cells through `N=20`,
including failures with `s>=N`.  Hence (3) and its claimed one-central-split
consequence cannot be used as an all-order route.

For reference, define

\[
 c_n=4\left\lfloor{n^2\over4}\right\rfloor
     =n^2-\epsilon_n,
 \quad \epsilon_n=\begin{cases}1,&n\text{ odd},\\0,&n\text{ even},\end{cases}
\]

and

\[
 \delta_n=4S_{n-2}-c_nT_n,
 \qquad \delta_0=\delta_1=0.                       \tag{4}
\]

For every total index `m`, coefficient extraction in (1) gives the exact
decomposition

\[
 [t^{m-2}](-D_W)
 =\sum_{i+j=m}T_i\delta_j
  +{1\over2}\sum_{i+j=m}
       \bigl((i-j)^2-\epsilon_i-\epsilon_j\bigr)T_iT_j. \tag{5}
\]

Conditional on the false assertion `delta_n>=0`, all quadratic factors
would be nonnegative except the central pair at `m=4r+2`, leading to

\[
 \sum_{i+j=4r+2}T_i\delta_j
 +{1\over2}\mathop{\sum_{i+j=4r+2}}_{(i,j)\ne(2r+1,2r+1)}
   \bigl((i-j)^2-\epsilon_i-\epsilon_j\bigr)T_iT_j
 >T_{2r+1}^2.                                      \tag{6}
\]

The decomposition (5) is exact, but (6) is not a valid reduction because
some `delta_n` are negative.  The weaker inequality

\[
 S_{n-2}\ge\left(\left\lfloor{n^2\over4}\right\rfloor-1\right)T_n
\]

survives the current exact scan (with a zero lower bound at `n=2`), but it
leaves a multi-index central band rather than a single central term and is
not an all-order theorem.

## 3. What coefficientwise negativity does and does not prove

The finite replay finds

\[
 D_W=-t^eP_{N,s}(t),
\]

where `e` is even and every coefficient of `P_(N,s)` is strictly positive.
This proves `D_W(t)<0` for `t>0`, and by (1) proves positive-axis Turan.
It does **not** by itself prove `D_W(t)<0` for negative `t`: a polynomial
with positive coefficients may have negative real zeros.  The replay also
certifies separately by exact Sturm arithmetic that the displayed cores
have no real zeros in its finite range.  An all-order proof still needs
either a real-axis Gram/SOS argument or a theorem excluding negative roots
of `P_(N,s)`.

## 4. Sign-regular coefficient-kernel factorization

Formula (77.1) gives an exact matrix factorization.  For fixed `s`, define

\[
 \mathcal W_s(k,h)
 =w_{s-2h,h,k-s+2h},
\]

and set it to zero outside `0<=k-s+2h<=h`.  Then

\[
 [t^h]G_{R,s}=\sum_k {R\choose k}\mathcal W_s(k,h). \tag{7}
\]

The binomial matrix `({R choose k})` is totally nonnegative.  Therefore
total nonnegativity of `mathcal W_s` after reversing its `h` columns would,
by Cauchy--Binet, prove the observed sign regularity

\[
 \operatorname{sgn}\det([t^{h_j}]G_{R_i,s})
 =(-1)^{q(q-1)/2}                                  \tag{8}
\]

for increasing `R_i,h_j` and every order `q`.

Section 77 proves only that each fixed row polynomial in the active index
is PF-infinity.  That one-row fact does not prove total nonnegativity of the
two-dimensional connection matrix, because both `j=s-2h` and the shift of
the active index vary with the column.  The missing clean theorem is a
planar-network or bidiagonal-production factorization of `mathcal W_s`.
Exact scans of its minors make this a strong route, but not yet a proof.

Even full sign regularity of the coefficient kernel would not alone settle
the negative real axis in (89.3); a compound-matrix argument must still
connect those minors to the quadratic Wronskian discriminant.  This
distinguishes the promising TP factorization from the false inference that
positive coefficients of `-D_W` exclude negative roots.

## 5. Exact Hurwitz strengthening

After the even forced power is removed, every replayed core

\[
 P_{N,s}(t)=-D_W(t)/t^e
\]

is strictly Hurwitz stable.  The replay verifies this with exact rational
Routh arrays, not floating-point roots.  In Hermite--Biehler form, write

\[
 P(t)=E(t^2)+tO(t^2).
\]

The all-order real-axis target is equivalently that `E(-x)` and
`x O(-x)` have simple alternating real zeros with the directed
Hermite--Biehler orientation.  This is plausibly compatible with the
sign-regular connection matrix in (7): the Hurwitz matrix interleaves the
even and odd coefficient columns, while its minors are compound expressions
in that kernel.

What remains missing is an actual compound factorization of the Hurwitz
matrix of `P`; finite Routh positivity cannot replace it.

One tempting Christoffel--Darboux target is false.  Polarize the Turan kernel
as

\[
 \mathcal K(t,u)=G_1(t)G_1(u)
 -{G_0(t)G_2(u)+G_2(t)G_0(u)\over2}.               \tag{9}
\]

Then `mathcal K(t,t)=T` and
`partial_t partial_u mathcal K(t,u)|_(u=t)=S`.  Therefore a path-specific
positive decomposition

\[
 \mathcal K(t,u)=\sum_r c_r f_r(t)f_r(u),\qquad c_r>0, \tag{10}
\]

would give the all-real sum of squares

\[
 -D_W=4\sum_{r<q}c_rc_q
       \bigl(f_r f_q'-f_r'f_q\bigr)^2.             \tag{11}
\]

But the coefficient matrix of (9) is not positive semidefinite (already
`(N,s)=(6,4)` has a negative eigenvalue).  Positive semidefiniteness is
invariant under polynomial-basis congruence, so no change to a path or
orthogonal-polynomial basis can make (10) true.  Thus the naive polarized
Turan CD decomposition is ruled out; any real-axis SOS must use a different
kernel or a more structured indefinite cancellation.

## 6. Exact replay

`verify_lower_selector_wronskian_gram_reduction.py` checks (1), records the
counterexamples to (3), verifies the exact decomposition (5), the positive
first Turan coefficient, the even forced order, and strict coefficientwise
negativity of `D_W`, together with exact Routh--Hurwitz positivity, for
`5<=N<=20` and
`2<=s<=2N-6`.  It writes
`lower_selector_wronskian_gram_exact_20260810.json`.
