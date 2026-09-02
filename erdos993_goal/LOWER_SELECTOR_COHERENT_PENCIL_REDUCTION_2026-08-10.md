# Lower selector extension: coherent adjacent pencils

## Status

This note gives one all-order extension and isolates two sharp remaining
inequalities for the full lower selector range.  It does not claim those two
inequalities have been proved.

Let

\[
 G_q(t)=G_{N-q,s}(t),\qquad
 \Gamma_{N,s}(t)=G_0(t)-2tG_1(t)+t^2G_2(t),
 \qquad d_s=\lfloor s/2\rfloor.
\]

The relevant complete range is `0<=s<=2N-5`.  Put

\[
 a=\max(0,s-N+1).
\]

Then `t^a` is the exact common forced factor of `Gamma`.

## 1. Unit-interval exclusion extends without the old reserve

Formula (74.6) gives, with `R=2M-s-1`, `j=s-2h`,

\[
 [t^h]G_{M,s}
 =\sum_{k=0}^h
 {R\choose j+k}{j+k\choose j}
 {2R+h-k\choose h-k}.                              \tag{1}
\]

Use the convention that a binomial coefficient is zero outside its natural
support.  For fixed `j,h,k`, both binomial factors depending on `R` are
nonnegative, nondecreasing, and convex on the nonnegative integers.
Products of nonnegative nondecreasing convex sequences are again convex,
and sums preserve all three properties.  Hence every coefficient in (1) is
nondecreasing and convex in `R`.  One size step in `M` is two steps in `R`,
so the same holds across consecutive path sizes.

For `s<=2N-5`, the three exponents `R,R-2,R-4` are all nonnegative.  Thus
the first and second size differences of every coefficient are
nonnegative.  The identity

\[
 \Gamma=(G_0-2G_1+G_2)+2(1-t)(G_1-G_2)+(1-t)^2G_2 \tag{2}
\]

proves

\[
 \Gamma_{N,s}(t)>0\quad(0\le t<1),\qquad
 \Gamma_{N,s}(1)>0\quad(s\ge2).                    \tag{3}
\]

Strictness at `t=1` follows from a strictly convex supported summand in
(1); only the known layers `s=0,1` have the boundary equality.  Therefore
every positive root in an extended selector theorem is still strictly
larger than one.  This part is an all-order proof, not a finite scan.

## 2. The correct lower replacement for endpoint compatibility

Direct positive compatibility of `G_0` and `G_2` is false in the lower
range.  For example, at `(N,s)=(5,4)`,

\[
 G_0=131t^2+140t+5,\qquad G_2=9t^2,
\]

and the discriminant of `G_0+uG_2` is `-60(3u-283)`.

The correlated quadratic ray needed by the moving-root argument behaves
differently.  Define

\[
 F_u=G_0+uG_1,qquad H_u=G_1+uG_2,qquad
 Q_u=F_u+uH_u=G_0+2uG_1+u^2G_2.                    \tag{4}
\]

The sharp candidate is:

> **Coherent adjacent-pencil lemma.**  For `2<=s<=2N-6` and `u>0`,
> after retaining the forced zero roots, `H_u` is in proper position with
> `F_u`.  Consequently `Q_u/t^a` has `d_s-a` simple negative roots.

Each of `F_u` and `H_u` is already negative-rooted by the all-order adjacent
compatibility theorem of Section 75.  Therefore only their orientation is
missing.  With `W(f,g)=f'g-fg'`, it is the scalar quadratic inequality

\[
 \mathcal W_u(t)=W_{01}(t)+uW_{02}(t)+u^2W_{12}(t),
 \qquad W_{ij}=W(G_i,G_j).                           \tag{5}
\]

A particularly sharp sufficient statement is

\[
 \boxed{W_{02}(t)^2-4W_{01}(t)W_{12}(t)<0}          \tag{6}
\]

for real nonzero `t`, after the forced even power of `t` is removed, with
the orientation fixed at one value of `u`.  Equation (6) looks like a
Christoffel--Darboux/Gram determinant inequality and is substantially
weaker than the false endpoint compatibility.

The Lagrange formula gives an equivalent coefficient form:

\[
 Q_u(t)=[z^s]B_t(z)A_t(z)^{2N-s-5}{A_t(z)^2+u\}^2. \tag{7}
\]

Thus (5)--(6) are also a direct signed-pencil target for the rank-two factor
in (7).

## 3. One discriminant inequality also forces the Turan sign

The two scalar-looking obligations (6) and (9) are not independent.  Put

\[
 T=G_1^2-G_0G_2,\qquad S=(G_1')^2-G_0'G_2'.
\]

Direct expansion gives the exact identity

\[
 \boxed{W_{02}^2-4W_{01}W_{12}=(T')^2-4TS}.       \tag{8a}
\]

Consequently (6) alone prevents `T` from vanishing on the positive axis:
at a putative zero `T(t_0)=0`, equation (8a) would give
`D_W(t_0)=T'(t_0)^2>=0`.  The first nonzero coefficient of `T` is positive
(also after the forced lower-cone power of `t`), so continuity gives (9)
on the whole positive axis.  Thus (6) closes both the coherent-pencil
orientation and the fixed-point input.

Equation (8a) also identifies the exact Gram candidate

\[
 -D_W=4\det\begin{pmatrix}T&T'/2\\T'/2&S\end{pmatrix}. \tag{8b}
\]

The exact replay suggests the sharper coefficient relation

\[
 [t^{n-2}]S\ge\left\lfloor{n^2\over4}\right\rfloor[t^n]T,
 \qquad n\ge2.                                      \tag{8c}
\]

It reduces coefficientwise positivity of the Gram determinant to one
central odd-split surplus when the total derivative index is `2 mod 4`;
all other paired indices follow from
`4 floor(i^2/4)+4 floor(j^2/4)-2ij>=0`.  Relation (8c) and that last
central surplus are evidence-backed reductions, not yet all-order proofs.

There is a second exact Turan representation.  Let

\[
 P(z)=B_t(z)A_t(z)^{R-4},\quad
 C(z,w)={A_t(z)^2-A_t(w)^2\over z-w},\quad
 H(z,w)=P(z)P(w)C(z,w)^2.
\]

Symmetrizing the two products in `T` gives

\[
 T=H_{s-1,s-1}-H_{s-2,s},\qquad H_{ij}=[z^iw^j]H. \tag{8d}
\]

Every coefficient of `H` is nonnegative, since
`[z^iw^j]C=[z^{i+j+1}]A^2`.  The required inequality is therefore an
anti-diagonal central-dominance statement.  It is not a generic TP2
consequence: already at `R=5,t=1`, the leading coefficient block of `H` is

\[
 \begin{pmatrix}4&32\\32&198\end{pmatrix},\qquad \det=-232.
\]

Thus a valid network proof must establish central Schur-unimodality after
the special `C^2` smoothing; it cannot assert ordinary TP2 of `H`.

## 3A. Conditional moving-root extension

Assume the coherent adjacent-pencil lemma.  Order the roots of
`Q_u/t^a` continuously as

\[
 \lambda_1(u)<\cdots<\lambda_{d_s-a}(u)<0.
\]

At `u=0` these are the nonzero roots of `G_0/t^a`.  If
`s<=2N-6`, then `G_2` is nonzero and has the same top degree, so after
division by `u^2t^a` the roots remain bounded as `u` tends to infinity;
some may tend to the additional forced zero roots of `G_2`.  Hence
`lambda_i(u)+u` is negative initially and positive for large `u`.  At a
crossing `lambda_i(u_i)=-u_i`,

\[
 \Gamma_{N,s}(-u_i)=Q_{u_i}(-u_i)=0.               \tag{8}
\]

Simplicity of `Q_(u_i)` makes the crossings distinct.  Thus (4)--(8) give
exactly `d_s-a` negative roots of `Gamma/t^a` throughout the lower range.

The remaining two roots are positive once one proves the all-range Turan
inequality

\[
 G_1(t)^2-G_0(t)G_2(t)>0\qquad(t>0).                \tag{9}
\]

Indeed, the fixed-point argument of Section 67 then gives two roots above
one, and degree exhaustion completes the theorem.  Exact scans find every
nonzero coefficient in (9) positive, so (9) is the second precise scalar
bottleneck.

## 4. The terminal family has a different exact pattern

At `s=2N-5` one has `G_2=0`, so a two-positive-root theorem is impossible.
Here `a=N-4`, and direct specialization of (1) gives

\[
 {\Gamma_{N,2N-5}(t)\over t^{N-4}}=c_0+c_1t-c_2t^2, \tag{10}
\]

where

\[
\begin{split}
 c_0&=4\left\{{N+4\choose8}+{N+3\choose8}\right\}>0,\\
 c_1&=4\sum_{k=0}^3{3\choose k}{N+5-k\choose8}>0,\\
 c_2&=4\left\{{N+1\choose4}+{N\choose4}\right\}>0.
\end{split}                                             \tag{11}
\]

Consequently the terminal core has exactly one negative and one positive
root.  This includes, but is not limited to, `(N,d,s)=(5,5,5)`; it is the
whole terminal family for `d=5`.

## 5. Exact replay

`verify_lower_selector_coherent_pencil.py` checks (1)--(11) over a finite
range.  It exact-Sturm certifies the negativity of the Wronskian
discriminant core in (6), the coefficientwise Turan signal, the selector
root pattern, and the terminal formula.  These checks are evidence for
(6) and (9), not their all-order proofs.
