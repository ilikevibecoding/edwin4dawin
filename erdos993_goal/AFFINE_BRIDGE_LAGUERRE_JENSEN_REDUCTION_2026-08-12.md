# Affine bridge: Laguerre--Jensen reserve reduction

This note replaces the informal ``Hahn boundary expectation'' description
of the weighted reserve by an exact univariate polynomial model.  The model
is all-order.  It does not by itself prove the remaining reflected-curvature
inequality.

## 1. Exponential diagonal and Jensen transform

Let

\[
 H(z,w)=X(z,w)R(z,w),\qquad
 \rho_h=[z^Dw^D](z+w)^hH(z,w).
\]

Define the exponential diagonal

\[
 \mathcal C_D(y)=[z^Dw^D]H(z,w)e^{y(z+w)}
                 =\sum_{h\ge0}c_hy^h.                 \tag{1}
\]

Termwise expansion of the exponential gives the exact identity

\[
 c_h={\rho_h\over h!}.                               \tag{2}
\]

Consequently, for `n=k+1`, the weighted reserve row is

\[
 \bar\rho_h={n\choose h}\rho_h
            =n^{\underline h}c_h.                    \tag{3}
\]

Thus

\[
 \sum_{h=0}^n\bar\rho_hy^h
 =\sum_{h=0}^n {n\choose h}\mathcal C_D^{(h)}(0)y^h   \tag{4}
\]

is exactly the degree-`n` Jensen polynomial of `C_D`.  In particular, the
reserve curvature is no longer an unexplained bivariate coefficient ratio:
it is the coefficient curvature of one explicit Jensen polynomial.

## 2. Exact two-colour Laguerre expansion

Write the positive reserve source as

\[
 R_0(z,w)=\sum_{p,q}r_{pq}z^pw^q,
 \qquad r_{pq}\ge0,
\]

and put

\[
 H=(1+z)^a(1+w)^aT^bR_0,
 \qquad T=z(1+z)+w(1+w).
\]

Expanding the `b` copies of `T` by the number `v` assigned to the
`z` colour gives

\[
 T^b=\sum_{v=0}^b{b\choose v}
 z^vw^{b-v}(1+z)^v(1+w)^{b-v}.                     \tag{5}
\]

The elementary coefficient polynomial

\[
 \Phi_{N,E}(y):=[z^N](1+z)^Ee^{yz}
 =\sum_{h=0}^N {E\choose N-h}{y^h\over h!}
 =L_N^{(E-N)}(-y)                                  \tag{6}
\]

is an associated Laguerre polynomial, including the integer parameters
below `-1` that occur when `N>E`.  Combining (1), (5), and (6) gives

\[
\boxed{
 \mathcal C_D(y)=
 \sum_{p,q}r_{pq}\sum_{v=0}^b{b\choose v}
 L_{D-p-v}^{(a-D+p+2v)}(-y)
 L_{D-q-b+v}^{(a+2b-D+q-2v)}(-y).
}                                                     \tag{7}
\]

Terms with a negative lower Laguerre index are interpreted as zero.
Formula (7) is the exact two-colour hypergeometric representation behind
the lowering score in (14c)--(14d) of the reflection note.

For a single summand, put

\[
 A=a+v,\quad B=a+b-v,\quad
 \alpha=D-p-v,\quad \beta=D-q-b+v.
\]

Its Jensen row is

\[
 a_h=\sum_{u=0}^h {n\choose h}{h\choose u}
 {A\choose\alpha-u}{B\choose\beta-h+u}.             \tag{8}
\]

Equivalently, if

\[
 U_u={{A\choose\alpha-u}\over u!},\qquad
 V_v={{B\choose\beta-v}\over v!},
\]

then

\[
 a_h=n^{\underline h}(U*V)_h.                       \tag{9}
\]

This is a more rigid target than generic PF-infinity: `U` and `V` are
contiguous Laguerre coefficient rows, and all source terms occur with the
specific positive weights in (7).

## 3. Exact MLR inside one atom

For fixed `h`, the conditional colour-allocation weights in (8) are

\[
 W_h(u)={h\choose u}{A\choose\alpha-u}
                  {B\choose\beta-h+u}.              \tag{10}
\]

On common support,

\[
 {W_{h+1}(u)\over W_h(u)}
 ={h+1\over h+1-u}
  {\beta-h+u\over B-\beta+h-u+1}.                  \tag{11}
\]

Both factors are nondecreasing in `u`; hence the conditional allocation
has monotone likelihood ratio as `h` increases.  Moreover the raw reserve
ratio is the expectation, under the `W_(h-1)` law, of

\[
 L_h(u)=
 {\alpha-u\over A-\alpha+u+1}
 +{\beta-h+1+u\over B-\beta+h-u}.                  \tag{12}
\]

Equations (11)--(12) give the promised exact MLR/lowering-score model.
The remaining issue is quantitative: MLR proves the direction of many
first-order comparisons, while reflected curvature needs a sharp bound on
the change of the expectation in (12).

The score is not monotone in general.  Its exact forward difference is

\[
 \begin{split}
 L_h(u+1)-L_h(u)={}&
 -{A+1\over(A-\alpha+u+1)(A-\alpha+u+2)}\\
 &+{B+1\over(B-\beta+h-u)(B-\beta+h-u-1)}.          \tag{12a}
 \end{split}
\]

The right-hand side increases with `u` wherever it is defined, so the score
is discretely convex and can be U-shaped.  This explains precisely why MLR
alone does not determine the change of its expectation.

There is one further exact simplification of the target.  If the adjacent
curvatures decrease through the left half,

\[
 K_h\ge K_{h+1}\qquad(1\le h\le\lfloor(n-2)/2\rfloor), \tag{12b}
\]

then they give all comparisons in (16) by chaining, except when the right
index crosses the midpoint.  Those crossing comparisons are the genuinely
two-sided part.  The same `69,440` high-degree atom cells satisfy (12a), so
the MLR calculation may first target this adjacent inequality and reserve a
separate reflection estimate only for the midpoint-crossing cases.  The
replay performs `190,336` such adjacent checks over those cells.

### 3.1 Exact closure equation for a positive atom mixture

Let a positive mixture have component rows `a_h(theta)` and fixed positive
weights `omega(theta)`.  At a fixed `h`, put

\[
 \pi(\theta)={\omega(\theta)a_{h-1}(\theta)\over a_{h-1}},\qquad
 x={a_h(\theta)\over a_{h-1}(\theta)},\quad
 y={a_{h+1}(\theta)\over a_h(\theta)},\quad
 z={a_{h+2}(\theta)\over a_{h+1}(\theta)}.          \tag{12c}
\]

When no component enters or leaves the support in these four layers, direct
cancellation gives the exact equivalence

\[
 \boxed{
 K_h\ge K_{h+1}
 \quad\Longleftrightarrow\quad
 (\mathbb E x)^3\mathbb E(xyz)\ge(\mathbb E(xy))^3.} \tag{12d}
\]

This is the valid closure condition; positive summation by itself is not a
closure theorem.  It also has a useful reserve-versus-covariance form.  Set

\[
 M=\mathbb E x,\quad C=\operatorname{Cov}(x,y),\quad
 d=xz-y^2.
\]

Then (12d) is exactly

\[
 \boxed{
 M^3\{\mathbb E(yd)+\mathbb E(y^3)-(\mathbb Ey)^3\}
 \ge
 (M\mathbb Ey+C)^3-(M\mathbb Ey)^3.}               \tag{12e}
\]

Thus the component curvature reserve `E(yd)` plus the cubic Jensen gap must
pay for the positive consecutive-ratio covariance.  In particular,
componentwise `d>=0` together with `Cov(x,y)<=0` is a sufficient closure
condition, but it is not the condition exhibited by the actual path atoms.

Some path atoms enter the support after layer `h-1`, so the closure equation
also needs an exact boundary-inflow version.  Keep `pi,x,y,z` only on the
atoms active at layer `h-1`, and normalize by their total layer-`h-1` mass.
Let `b_1,b_2,b_3` be the correspondingly normalized aggregate contributions
at layers `h,h+1,h+2` from atoms not active at layer `h-1`.  Then

\[
 \boxed{
 K_h\ge K_{h+1}
 \Longleftrightarrow
 (M+b_1)^3\{\mathbb E(xyz)+b_3\}
 \ge\{\mathbb E(xy)+b_2\}^3.}                    \tag{12f}
\]

Equivalently, if
`S_act=M^3 E(xyz)-(E(xy))^3` is the active-atom slack, the exact inflow
budget is

\[
\begin{split}
 S_{\rm act}
 &+\{(M+b_1)^3-M^3\}\mathbb E(xyz)
 +(M+b_1)^3b_3\\
 &\ge \{\mathbb E(xy)+b_2\}^3-\{\mathbb E(xy)\}^3. \tag{12g}
\end{split}
\]

Thus births at layers `h` and `h+1` create an explicit new debit through
`b_2`, while their layer-`h` and layer-`h+2` mass creates the two displayed
credits.  In the 953 reflected left windows of the hard records, 209 contain
such births (28,620 atom-window incidences), and none contains an atom death.
The other 744 windows are governed directly by (12d)--(12e).  The birth
windows are not the tight empirical regime: their smallest full adjacent
curvature quotient is approximately `1.0200332704482418`, at the bottom
point `(parity,m,x,n,h)=(1,20,40,43,6)`.

## 4. The degree balance is exactly path-normalized

The reserve contains a common `A^2T^5`.  After removing it, the four exact
positive source cores have minimum total degree

\[
 8\quad\hbox{(group)},\qquad 9\quad\hbox{(bottom)}. \tag{13}
\]

Their minimum layers are, in both parities,

\[
\begin{aligned}
 C_{g,8}&=4z^2w^2(z^2+w^2)(z^2+zw+w^2),\\
 C_{b,9}&=(z+w)C_{g,8}.                             \tag{14}
\end{aligned}
\]

The adjusted powers of `T` are `2m+epsilon+1` in the group package and
`2m+epsilon` in the bottom package.  Since `D=m+n+4`, (13) gives in both
packages

\[
 \boxed{\deg\mathcal C_D=2n-\epsilon-1.}             \tag{15}
\]

Thus the Jensen transform in (4) stops almost exactly halfway through its
underlying Laguerre polynomial.  This is the structural fact missing from
the generic PF counterexample: the path normalization forces the relevant
curvatures into the first half of a degree `2n-1` or `2n-2` object.

## 5. Sharpened curvature target

For the Jensen row `a_h=bar(rho)_h`, put

\[
 K_h={a_h^2\over a_{h-1}a_{h+1}}.
\]

The exact hard records satisfy the stronger statement

\[
 \boxed{K_i\ge K_j\quad
  (j-i\ge2,\ i+j\le n-2).}                         \tag{16}
\]

There are `125,579` exact comparisons, with smallest quotient
`K_i/K_j` approximately `1.000161127666326`.  Once the already observed
endpoint slack `n>=2t+4` is proved, every reflected-curvature comparison
in (14) is a direct instance of (16), because its indices have sum
`2t+2<=n-2`.

For one product of the two Laguerre factors in (7), the following tempting
finite pattern survived `69,440` exact cells:

> If `alpha+beta>=2n-2`, then the Jensen row (8) satisfies (16).

The sweep covers `4<=n<=10`, all `0<=alpha,beta<=2n`, and eight successive
values of each excess capacity `A-alpha` and `B-beta`.  This pattern is
**false all-order**: the bounded excess-capacity window hid a very small
failure.  In the one-colour specialization

\[
 (n,A,B,\alpha,\beta)=(32,489,0,62,0),
\]

which still has `alpha+beta=2n-2`, one has

\[
 K_{15}={1020672\over882895}
 <{1507713\over1304192}=K_{16},                    \tag{17}
\]

and the quotient is exactly

\[
 {K_{15}\over K_{16}}
 ={443717419008\over443717423045}<1.               \tag{18}
\]

There is a substantial surviving all-order subcase, which also locates the source
of that failure.  For a one-colour atom set

\[
 n=2h+2+s,\qquad \alpha=2n-2+r,\qquad A=\alpha+t,
 \quad h\ge1,\ s,r\ge0.                            \tag{18a}
\]

In fact, the wider range `0<=t<=2h+29s` implies `K_h>=K_(h+1)`.  Indeed

\[
 a_j={n\choose j}{A\choose\alpha-j},\qquad
 K_j={(j+1)(n-j+1)(\alpha-j+1)(A-\alpha+j+1)
       \over j(n-j)(\alpha-j)(A-\alpha+j)}.        \tag{18b}
\]

After the positive denominator is cleared, the numerator of
`K_h-K_(h+1)` has the exact form

\[
 P(t)=C_0+C_2t(t+2h+2).                            \tag{18c}
\]

The endpoint polynomials `P(0)` and `P(2h+29s)` have respectively 55 and 63
monomials in `h,s,r`, all with positive integer coefficients (the smallest
coefficient is 1).  If `C_2>=0`, (18c) is increasing for `t>=0`; if
`C_2<0`, it is decreasing.  Its minimum on `[0,2h+29s]` is therefore one of
those two positive endpoints.  This proves the subcase exactly.  The
counterexample above has `t=427>2h=30`, so it lies beyond the proved
capacity window (`s=0`) rather than contradicting it.  The same raw
coefficientwise endpoint method stops at 29: `P(2h+30s)` has the negative
coefficient `-6h^5s`, so extending the constant requires a sharper grouping.

The same endpoint argument permits a degree defect.  Put

\[
 \alpha=2n-2+q-s,\qquad q\ge0.                    \tag{18d}
\]

Thus `alpha` may lie as far as `s` below `2n-2`.  After substituting
`r=q-s` in (18c), both `P(0)` and `P(2h+28s)` are again coefficientwise
positive in `h,s,q`.  Consequently

\[
 \boxed{q\ge0,\quad 0\le t\le2h+28s
        \quad\Longrightarrow\quad K_h\ge K_{h+1}} \tag{18e}
\]

for every one-colour atom.  This version matches the actual path geometry
much more closely.  Across all 4,062,983 active atom-window incidences in
the 953 required reflected windows, the source-degree defect `delta`
satisfies `delta<=s-1`, and the total excess capacity is at most
`2h+11s` (hence well inside `2h+28s`).  Therefore every required atom lies
in the proved range after its two colours are merged.  The remaining
atomwise step is precisely to transport (18e) through the two-colour split;
80,000 additional exact randomized cells in this full defect/capacity range
had no failure, but this split-preservation statement is not yet proved.

The degree hypothesis is nevertheless substantive.  At

\[
 (n,A,B,\alpha,\beta)=(12,5,20,1,11),
\]

one has

\[
 K_4={529\over312}<{6272\over3699}=K_6.            \tag{19}
\]

Therefore the next proof step is not a generic theorem about products of
Laguerre polynomials, even in the high-degree range.  It must prove (16)
directly for the path mixture, most naturally by proving the exact balance
(12e) from the MLR kernel (11), the convex score difference (12a), and the
specific source weights in (7).

This distinction is visible inside the actual source, not only in a
synthetic counterexample.  At the exact group point
`(parity,c,m,x,n,h)=(0,30,3,0,32,15)`, the Laguerre decomposition has 528
active atoms: 82 individually fail `d>=0`, and `Cov(x,y)>0`.  Nevertheless
the full mixture has `K_15/K_16` approximately `1.0001261911471888`, because
in (12e) the normalized left reserve exceeds the covariance penalty by a
factor approximately `1.0227843355585244`.  The replay reconstructs all four
layers exactly before making these comparisons.

This replaces the broad phrase "prove a path-specific Hahn inequality" by
one precise Jensen--Laguerre mixture inequality with an exact covariance
budget and explicit warnings showing why atomwise and generic-PF proofs fail.

## 6. Replay

Run:

```text
python verify_affine_bridge_laguerre_jensen_reduction.py
```

SHA-256:

```text
verify_affine_bridge_laguerre_jensen_reduction.py
4D3AA52C7C7BAB7FED9206B0F34F7871AEFC78962444B60A2A61DF50BCF73702

affine_bridge_laguerre_jensen_reduction_exact_20260812.json
FB6E7E3AF38338CABF907B5519CEB84CEBD06D4AE4C5025D7F6059FFDCA05B77
```

The identities (1)--(15) are exact and all-order.  The counts supporting
(16) and the high-degree two-colour lemma are finite evidence only.
