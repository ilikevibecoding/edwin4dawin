# Affine bridge as one Newton sequence and one TP boundary inequality

The two `r=0` theorems now prove the group and bottom affine bridges at
both parities on their full parameter domains. This note converts every
remaining order `r>=1` into one exact forward-difference statement and
then derives the minimal positive-convolution induction step.

It is a reduction, not a proof of that final inequality.

## 1. Common notation

Let

\[
A=(1+z)(1+w),\quad T=z(1+z)+w(1+w),\quad V=1+z+w,
\]

\[
S=z^2+w^2+zw(z+w),\qquad W=z+w+zw=A-1.
\]

For either affine package write

\[
\Phi_r(K)=[z^{m+r+5}w^{m+r+5}]A^aT^bV^rK,             \tag{1}
\]

where

\[
\begin{array}{c|c|c|c}
&a&b&d\\ \hline
\text{group}&2c+m+x-3&2m+\epsilon-4&24\\
\text{bottom}&m+x-3&2m+\epsilon-5&26
\end{array}
\]

and `d` is the common bidegree of `B_epsilon` and `P_epsilon`. The
remaining affine coefficient is

\[
F_r=\Phi_r(B_\epsilon)+r\Phi_r(P_\epsilon).            \tag{2}
\]

The reserve kernel `P_epsilon` is coefficientwise positive.

## 2. Reciprocity removes the moving target

For a bidegree `(d,d)` kernel put

\[
K^\vee(z,w)=z^dw^dK(z^{-1},w^{-1}).
\]

The exact reciprocal identities are

\[
zwA(z^{-1},w^{-1})=A,
\]

\[
(zw)^2T(z^{-1},w^{-1})=S,
\qquad
zwV(z^{-1},w^{-1})=W.
\]

Therefore (1) becomes

\[
\Phi_r(K)=[z^Nw^N]A^aS^bW^rK^\vee,                  \tag{3}
\]

at the fixed target

\[
N_{\rm grp}=2c+4m+x+2\epsilon+8,
\qquad
N_{\rm bot}=4m+x+2\epsilon+8.                        \tag{4}
\]

The cancellation of `r` in (4) is exact: the reciprocal degree gains
`r` from `V^r`, while the original target also gains `r`.

## 3. Folding `B+rP` into one Newton base sequence

For either `K=B_epsilon` or `K=P_epsilon`, define the polynomial
sequence

\[
H_K(n)=[z^Nw^N]A^{a+n}S^bK^\vee.                    \tag{5}
\]

Since `W=A-1`, (3) gives

\[
\Phi_r(K)=\Delta^rH_K(0).                             \tag{6}
\]

The explicit factor `r` in (2) can also be absorbed into a forward
difference. For every polynomial sequence `h`,

\[
\Delta^r\!\left(n\nabla h(n)\right)\big|_{n=0}
=r\Delta^rh(0),                                       \tag{7}
\]

where `nabla h(n)=h(n)-h(n-1)`. For `r>=1`, this follows from

\[
\Delta^r(nq(n))\big|_{0}=r\Delta^{r-1}q(1)
\]

with `q=nabla h`; for `r=0` both sides of (7) vanish.

Now define the **single base sequence**

\[
\boxed{
G(n)=H_B(n)+n\bigl(H_P(n)-H_P(n-1)\bigr).}            \tag{8}
\]

Equations (2), (6), and (7) give the all-order identity

\[
\boxed{F_r=\Delta^rG(0).}                             \tag{9}
\]

Equivalently, because

\[
H_P(n)-H_P(n-1)
=[z^Nw^N]A^{a+n-1}S^bWP^\vee,
\]

the two terms in (8) are one diagonal extraction from

\[
A^{a+n-1}S^b\bigl(AB^\vee+nWP^\vee\bigr).            \tag{10}
\]

At the possible boundary `a=0,n=0`, (8) is the definition; the second
term is zero, so no negative power is needed.

Thus the whole affine bridge is exactly the following one-line lemma:

\[
\boxed{\Delta^rG(0)\ge0\quad\text{for every }r\ge0.}  \tag{11}
\]

The new `r=0` theorems prove the base `G(0)=F_0>0` for both packages
and both parities.

## 4. Exact binomial-convolution induction

Newton interpolation applied to (9) gives

\[
G(n)=\sum_{s\ge0}F_s\binom ns.                        \tag{12}
\]

The binomial matrix is a nonnegative totally positive kernel. At the
integer `n=r`, its triangularity makes the exact induction step

\[
\boxed{
G(r)\ge\sum_{s=0}^{r-1}\binom rsF_s.}                 \tag{13}
\]

Indeed, the left side minus the right side is exactly `F_r`. Hence
(13), together with the proved positive base, is a necessary and
sufficient binomial-convolution induction for the full bridge. This
does not prove (13); it identifies the precise scalar sign condition.

## 5. Positive atom recurrence

The condition can be made completely finite. For

\[
h_{\alpha,\beta;u,v}(n)
=\binom{n+\alpha}{u}\binom{n+\beta}{v},
\]

put

\[
D_r(\alpha,\beta;u,v)=\Delta^rh_{\alpha,\beta;u,v}(0).
\]

If `K^vee=sum k_ij z^i w^j`, expansion of `S^b` gives

\[
H_K(n)=\sum_{i,j}k_{ij}\sum_{t=0}^b\binom bt
h_{\alpha_t,\beta_t;u_{ijt},v_{ijt}}(n),              \tag{14}
\]

where

\[
\alpha_t=a+b-t,\quad \beta_t=a+t,
\]

\[
u_{ijt}=N-i-2t,\qquad v_{ijt}=N-j-2b+2t.              \tag{15}
\]

The shifted-binomial theorem gives the coefficientwise-positive sum

\[
D_r(\alpha,\beta;u,v)=
\sum_{\substack{p,q\ge0\\\max(p,q)\le r\le p+q}}
\binom\alpha{u-p}\binom\beta{v-q}
\frac{r!}{(p+q-r)!(r-p)!(r-q)!}.                      \tag{16}
\]

It also has the exact two-branch Pascal recurrence

\[
\boxed{
D_r(\alpha,\beta;u,v)
=D_{r-1}(\alpha,\beta+1;u-1,v)
 +D_{r-1}(\alpha,\beta;u,v-1).}                       \tag{17}
\]

To prove (17), interpret both terms on the right as coefficient
extractions. Their added multiplier is

\[
z(1+w)+w=z+w+zw=W.
\]

Thus (11) or (13) is a finite signed linear form in positive atoms,
and increasing `r` applies the positive two-branch convolution (17).
This is the exact finite-difference/TP reduction requested; no infinite
series or limiting argument remains.

## 6. The minimal spatial TP step

There is an even more local form of the induction. Define the complete
reciprocal coefficient arrays

\[
\mathcal F_r(i,j)=[z^iw^j]A^aS^bW^r(B^\vee+rP^\vee),
\]

\[
\mathcal R_r(i,j)=[z^iw^j]A^aS^bW^rP^\vee\ge0.
\]

The identity

\[
W^{r+1}(B^\vee+(r+1)P^\vee)
=W\,W^r(B^\vee+rP^\vee)+W^{r+1}P^\vee
\]

gives the positive Pascal convolution

\[
\begin{aligned}
\mathcal F_{r+1}(i,j)={}&
\mathcal F_r(i-1,j)+\mathcal F_r(i,j-1)
+\mathcal F_r(i-1,j-1)+\mathcal R_{r+1}(i,j).         \tag{18}
\end{aligned}
\]

The exact kernels `B` and `P` are symmetric in `z,w`. Hence, by
symmetry, the central target step is

\[
\boxed{
2\mathcal F_r(N-1,N)+\mathcal F_r(N-1,N-1)
+\mathcal R_{r+1}(N,N)\ge0.}                          \tag{19}
\]

Equation (19) is the smallest local TP/Pascal sign condition that
implies `F_(r+1)>=0`. Full southwest-square nonnegativity is sufficient
for (19), but much stronger than necessary.

This also exposes why the now-proved central `r=0` value cannot by
itself propagate: multiplication by `W` asks for the two off-central
predecessors `(N-1,N)` and `(N-1,N-1)`, not the preceding central
coefficient `(N,N)`. A successful induction must control at least the
weighted boundary triple in (19), or an equivalent Newton inequality
(13).

## 7. A tempting scalar Turan induction is false

Write

\[
b_r=\Phi_r(B),\qquad p_r=\Phi_r(P)>0,
\qquad F_r=b_r+rp_r.
\]

The most natural scalar TP attempt would prove monotonicity of
`F_r/p_r`. Its step determinant is

\[
\mathcal T_r
=p_rb_{r+1}-p_{r+1}b_r+p_rp_{r+1},                   \tag{20}
\]

because

\[
\frac{F_{r+1}}{p_{r+1}}-\frac{F_r}{p_r}
=\frac{\mathcal T_r}{p_rp_{r+1}}.
\]

Condition `T_r>=0` would propagate positivity from `r=0`, but it is
false immediately, even though the bridge values are positive.

For the even group case `(c,m,x)=(1,3,0)` at `r=0`,

\[
(b_0,p_0)=(159444,1232),
\]

\[
(b_1,p_1)=(7633376,341548),
\]

and

\[
\mathcal T_0=-44632672944<0,
\]

while `F_0=159444` and `F_1=7974924` are both positive.

For the even bottom case `(m,x)=(3,0)`,

\[
(b_0,p_0)=(61508,1232),\qquad
(b_1,p_1)=(4272688,352524),
\]

and

\[
\mathcal T_0=-15984785008<0,
\]

again with both bridge values positive. These are exact integers from
the existing central-ratio audit, not floating-point tests.

Therefore a scalar common-reserve ratio monotonicity proof cannot be
the induction. The TP state must retain the shifted spatial coefficients
in (19), or equivalently the full binomial/Newton data in (13).

## 8. Exact replay and remaining lemma

Run

```text
python verify_affine_bridge_single_newton_sequence.py
```

The record is
`affine_bridge_single_newton_sequence_reduction_20260810.json`. It
checks the reciprocal identities and targets, the common kernel
bidegrees, the abstract sequence identity through order 64 as a
transcription guard, the atom recurrence, both `r=0` theorem records,
and the exact Turan counterexamples.

The genuine remaining lemma is either of the equivalent statements:

1. all Newton coefficients in (11) are nonnegative;
2. the TP-binomial inequalities (13) hold for every `r>=1`;
3. the boundary-triple inequalities (19) hold for every `r>=0`.

The third is the most local induction target. It is strictly weaker
than southwest-square positivity and strictly richer than any induction
using only the central scalar sequence.
