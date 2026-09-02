# Lower shifted selectors reduce to one alpha-zero Q-sharp theorem

## Status

This note records an exact all-order reduction for the lower homogeneous
layers in (565).  It does **not** claim the remaining Q-sharp theorem below.
The identities, the forced-zero statement, and a finite exact Sturm replay are
implemented in `verify_lower_qsharp_reduction.py`.

Put

\[
 r=N-d,\qquad k=s-r>0,\qquad P=d+s=N+k,\qquad P_-=N-k=P-2k.
\]

Let

\[
 C_s(z)=\sum_{j=0}^{P}{P\choose j}
 R_{N,d,s}\{j(P-j)\}z^j
       =\sum_h\gamma_hz^h(1+z)^{P-2h}
\]

be the palindromic pre-selector from (709).  Its gamma polynomial is

\[
 \Gamma_{N,s}(t)=G_{N,s}(t)-2tG_{N-1,s}(t)+t^2G_{N-2,s}(t).
\]

## 1. Exact shifted-selector derivative identity

Homogenize `C_s` to degree `P`.  The normalized central mixed derivative is

\[
 \boxed{
 D_s(x,y)={P_-!\over P!}(\partial_x\partial_y)^k C_s(x,y).}
 \tag{1}
\]

The coefficient of `x^h y^(P_--h)` in (1) is

\[
 {P_-\choose h}R_{N,d,s}\{kN+h(P_--h)\}.             \tag{2}
\]

Indeed, put `j=k+h`.  Then

\[
 j(P-j)=kN+h(P_--h)
\]

and

\[
 {P_-!\over P!}{P\choose k+h}(k+h)_k(P-k-h)_k
 ={P_-\choose h}.                                    \tag{3}
\]

Thus (1) is exactly the shifted pre-selector in (565), not merely a root-
count analogy.

In gamma coordinates one central mixed derivative is the second-order
operator

\[
 \mathcal D_P f
 =t(4t-1)f''+\{P-1-(4P-6)t\}f'+P(P-1)f.             \tag{4}
\]

Consequently the shifted gamma polynomial is

\[
 {P_-!\over P!}\mathcal D_{P-2k+2}\cdots
 \mathcal D_{P-2}\mathcal D_P\Gamma_{N,s}.           \tag{5}
\]

Generic preservation under (4) is false.  For example, at the sharp broad
window reserve `P=17`, the polynomial

\[
 (t+1/100)(t+1/300)(t+1/800)
 (t-1001/1000)(t-501/500)
\]

has three negative and two greater-than-one roots, but its image under
`mathcal D_17` has a nonreal conjugate pair.  Hence (5) must use the special
path-selector structure.

## 2. The stronger artificial-row reduction

Apply the alpha-zero binomial window to the same pre-selector:

\[
 \mathcal Q^\sharp_{N,d,s}(z)
 =\sum_{j=0}^{P}{P\choose j}^2
 R_{N,d,s}\{j(P-j)\}z^j.                              \tag{6}
\]

Equivalently, if

\[
 W_{N,d,s}(t)=S_{P,0}[\Gamma_{N,s}](t),                \tag{7}
\]

then

\[
 \mathcal Q^\sharp(z)=(1+z)^P
 W\!\left({z\over(1+z)^2}\right).                    \tag{8}
\]

Differentiating (6) centrally and using (3) gives the **actual** lower row:

\[
 \boxed{
 \widetilde Q^{(s)}_{N,d}(x,y)
 ={P_-!\over P!}(\partial_x\partial_y)^k
 \mathcal Q^\sharp_{N,d,s}(x,y).}                     \tag{9}
\]

Therefore the following single statement closes every lower layer.

> **Q-sharp theorem (remaining).**  If `2d-N>=5`, then for every
> `0<=s<=2N-d`, the polynomial `W_(N,d,s)=S_(d+s,0)[Gamma_(N,s)]`
> has only nonpositive real roots.

Indeed, (8) then makes `mathcal Q^sharp` real stable, and mixed derivatives
preserve real stability.  Equation (9) supplies (565).

## 3. Forced zeros are exact and harmless

For `s>=N`, put

\[
 a=s-N+1.
\]

The path slice `A_(N,s)` starts at `z^a`.  In the three terms of (709), the
other two path sizes start strictly later.  Palindromicity gives the same gap
at the other endpoint.  Hence

\[
 \boxed{
 \mathcal Q^\sharp_{N,d,s}(x,y)=(xy)^a\mathcal R_{N,d,s}(x,y),
 \qquad W_{N,d,s}(t)=t^a\widehat W_{N,d,s}(t).}         \tag{10}
\]

For `s<N`, `a=0` and both endpoint coefficients are nonzero.  Thus the zero
roots seen at and below the terminal layer are forced monomial factors; they
do not obstruct real stability.

## 4. What is already covered by the old selector/window theorems

Write the cone slack as

\[
 d=r+5+\delta,\qquad N=2r+5+\delta,\qquad s=r+k.
\]

If `delta>=2k`, then `N>=2s+5`, so the selector theorem applies to
`Gamma_(N,s)`.  The alpha-zero window with `P=N+k` also meets the fixed-
ceiling reserve.  Thus (7)--(9) already prove all lower layers with

\[
 k\le\lfloor\delta/2\rfloor.                            \tag{11}
\]

The Q-sharp theorem is needed to remove the remaining strip
`delta<2k`.

## 5. Two tempting shortcuts are false

First, (5) is not a generic real-rootedness preserver, as the exact example
after (5) shows.

Second, although the exact decomposition

\[
 W=K_0-2tK_1+t^2K_2,\qquad
 K_q=S_{P-2q,q}[G_{N-q,s}]                              \tag{12}
\]

holds, the three `K_q` do not have a common interlacer in general.  Already
at `(N,d,s)=(5,5,1)`,

\[
\begin{aligned}
 K_0&=8(20t^3+90t^2+30t+1),\\
 K_1&=36(2t^2+6t+1),\\
 K_2&=20(2t+3).
\end{aligned}
\]

For `K_0+2uK_1+u^2K_2`, the two roots escaping linearly are governed by

\[
 160c^2-144c+40,
\]

whose discriminant divided by four is
`72^2-160*40=-1216`.  Thus the positive pencil is nonreal for large `u`.
The diagonal-crossing proof of Section 82 cannot simply be replayed on
(12).

## 6. Replay scope

`verify_lower_qsharp_reduction.py` checks (1)--(3), (6)--(10), and the
alpha-zero window identity exactly through `d=12`.  It also performs exact
Sturm counts for every lower layer through `d=8`, after removing the forced
zero in (10).  Those finite counts support the Q-sharp theorem but are not its
all-order proof.

## 7. Fixed-grade factorial normalization: exact but not sufficient

There is an exact finite-multiplier factorization of the artificial row.
Write the binary homogenization of the pre-selector as

\[
 C_s(x,y)=\sum_{j=0}^{P}c_jx^jy^{P-j},\qquad
 c_j={P\choose j}R_{N,d,s}\{j(P-j)\}.
\]

Let `L` be the classical factorial multiplier

\[
                       L(x^j)={x^j\over j!}.
\]

Then coefficient cancellation gives the all-order identity

\[
 \boxed{
 {1\over P!}\mathcal Q^\sharp_{N,d,s}(x,y)
       =(L_xL_y)C_s(x,y).}                            \tag{13}
\]

Indeed, the coefficient on the right is

\[
 {c_j\over j!(P-j)!}
 ={1\over P!}{P\choose j}c_j
 ={1\over P!}{P\choose j}^2
 R_{N,d,s}\{j(P-j)\}.
\]

This is genuinely a product of separate finite stability preservers.  On
degree at most `P`, the algebraic symbol of `L` is

\[
 \sum_{j=0}^{P}{P\choose j}{x^jy^{P-j}\over j!}
       =y^P L_P(-x/y),                                \tag{14}
\]

up to the harmless conventional scalar, and the Laguerre polynomial has
positive roots.  Thus `L_x` and `L_y` preserve real stability.

However, (13) does **not** turn the new all-grade Strongly-Rayleigh raw
selector theorem into a proof of Q-sharp.  The unique binary preimage in
(13) is exactly `C_s`, and `C_s` is not stable: its gamma polynomial
`Gamma_(N,s)` has the two positive selector roots proved in Section 82.
Each such root produces a nonreal reciprocal pair under
`t=z/(1+z)^2`.  Therefore Pólya--Schur preservation has no stable input at
the collapsed fixed-grade level.

The raw selector theorem lives before this collapse, in the labeled
deletion-slot variables.  To use it one still needs a slot-preserving stable
contraction with the path/Wishart object that reaches the right-hand side of
(13) without first passing through the nonstable binary polynomial `C_s`.
The separate factorial multipliers verify the normalization bookkeeping but
do not supply that missing contraction.

## 8. Exact obstruction from the true raw fixed-grade row

The distinction in the last paragraph is already visible at the first
nontrivial middle grade.  Put

\[
 p_M(x,u)=\sum_i {2M-i-1\choose i}x^{M-i}u^i
\]

and let `B_(N,d,s)` be the coefficient of `u^s` in the true raw path row

\[
 S^d(p_Np_N)-2S^{d-2}(p_{N-1}p_{N-1})
              +S^{d-4}(p_{N-2}p_{N-2}),
 \qquad S=\partial_x+\partial_y.                       \tag{15}
\]

At the middle grade `(N,d,s)=(6,5,1)`, both (15) and the normalized
Q-sharp row have degree `P=6`.  Their ascending coefficient vectors are

\[
\begin{split}
 B={}&(1200,42816,266178,472368,266178,42816,1200),\\
 {1\over6!}Q^\sharp={}&
 (1/72,11/30,23/12,29/9,23/12,11/30,1/72).
\end{split}                                               \tag{16}
\]

Both polynomials have six negative roots.  Nevertheless the coefficientwise
ratio `m_j=([x^jy^(6-j)]Q^sharp/6!)/([x^jy^(6-j)]B)` is **not** a finite
multiplier sequence.  Its degree-six algebraic symbol, after clearing the
positive denominator, is

\[
\begin{split}
 97356511109(z^6+1)&+432210520170(z^5+z)\\
 &+908540802000(z^4+z^2)+1147582084000z^3.            \tag{17}
\end{split}
\]

Exact Sturm counting gives only two real roots for (17), instead of six.

This rules out not only one collapsed multiplier but a product of separate
finite multipliers in `x` and `y`.  If those sequences were `a_j` and
`b_j`, their action on degree `P` would have ratio
`m_j=a_j b_(P-j)`.  Reversal preserves the class of finite multiplier
sequences, and their pointwise product is the composition of the two
diagonal preservers.  Hence `m` itself would have to be a finite multiplier
sequence, contradicting (17).

The reason is transparent before summation.  A term with `i` path edges and
`a` derivatives on the first copy has raw falling factors

\[
 (N-q-i)_a\,(N-q-s+i)_{d-2q-a}.
\]

The factorial normalization of `g_(N-q)` acts on the two **initial**
spectral exponents, so its ratio depends on `q,i,a`, not only on the final
exponents `j,P-j`.  After the internal allocations are summed, no separate
final-exponent multiplier survives.  Thus the all-grade raw selector still
requires a genuinely slot-preserving transport; the naive fixed-grade
multiplier route is exactly false.
