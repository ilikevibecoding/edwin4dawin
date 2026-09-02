# Independent audit of Section 73 and a Gegenbauer proof for the active-box polynomial

## 1. Section 73 audit

Put

\[
A_h=g_{M,s,h},\qquad B_h=g_{M-1,s,h},\qquad C_h=g_{M-2,s,h},
\]

and \(x_h=A_h/B_h,\ y_h=B_h/C_h\). If

\[
\mu_h={C_ht^h\over C(t)},
\]

then direct cancellation gives

\[
{B(t)\over C(t)}=\mathbb E y_H,\qquad
{A(t)\over C(t)}=\mathbb E(y_Hx_H),
\]

and hence

\[
{B(t)^2-A(t)C(t)\over C(t)^2}
=\mathbb E[y_H(y_H-x_H)]-\operatorname{Var}(y_H).
\]

Because \(C\) is negative-rooted, \(\mu\) is the law of a sum of independent
Bernoulli variables. For \(S_j=H-X_j\), the Efron--Stein resampling formula
has exactly the constant used in Section 73:

\[
\operatorname{Var}(y_H)
\leq\sum_jp_j(1-p_j)\mathbb E[(y_{S_j+1}-y_{S_j})^2].
\]

The deletion identities

\[
\sum_jp_j\Pr(S_j=h)=(h+1)\mu_{h+1},\qquad
\sum_j(1-p_j)\Pr(S_j=h)=(d-h)\mu_h
\]

follow by counting occupied and unoccupied coordinates on the events
\(H=h+1\) and \(H=h\), respectively. The averaging bound on the
conductance, the shift of the first energy sum, and the boundary conventions
in (73.8)--(73.9) are all correct. If the local inequality is strict at
\(h=0\), then its contribution has positive weight \(\mu_0>0\), so the final
Turan inequality is strict.

The citation "Section 124" in the current notebook refers to Section 124 of
NYQUIST_RESERVE_INDUCTION_LEMMA_2026-08-02.md, not a section of the current
file. Its negative-rootedness proof is valid: the path matching polynomial
factors over positive path eigenvalues, the binary slice is a stable
specialization of an elementary symmetric polynomial, and reciprocal pairing
of its negative zeros sends every nontrivial pair to a negative gamma zero.

## 2. Active-box polynomial

For integers \(j,h\geq0\), define

\[
W_{j,h}(z)=[x^h]{1-x\over
\{1-(2+3z)x+(1+z)x^2\}^{j+1}}.
\]

### Theorem

For \(h\geq1\), \(W_{j,h}\) has degree \(h\) and \(h\) distinct zeros, all in
\((-8/9,0)\). In particular its coefficient sequence is PF-infinity, and

\[
{[z^\ell]W_{j,h}\over\binom h\ell}
\]

is log-concave in \(\ell\).

### Proof

Let \(\lambda=j+1\), and for \(-8/9<z<0\) put

\[
y=\sqrt{1+z},\qquad
u={2+3z\over2\sqrt{1+z}}.
\]

The Gegenbauer generating function gives

\[
[x^h]\{1-(2+3z)x+(1+z)x^2\}^{-\lambda}
=y^h C_h^\lambda(u).
\]

Therefore

\[
W_{j,h}(z)=y^h\left(C_h^\lambda(u)-y^{-1}C_{h-1}^\lambda(u)\right). \tag{1}
\]

Moreover

\[
{du\over dz}={4+3z\over4(1+z)^{3/2}}>0,
\]

and \(u(-8/9)=-1,\ u(0)=1\). Thus \(z\mapsto u\) is an increasing
bijection from \((-8/9,0)\) onto \((-1,1)\).

Let

\[
-1<\xi_1<\cdots<\xi_h<1
\]

be the zeros of \(C_h^\lambda\). Gegenbauer polynomials with
\(\lambda> -1/2\) have simple zeros in \((-1,1)\), and consecutive degrees
strictly interlace. At \(u=\xi_i\), the sign in (1) is the opposite of the
sign of \(C_{h-1}^\lambda(\xi_i)\). These signs alternate, so (1) has one
zero in every interval \((\xi_i,\xi_{i+1})\), giving \(h-1\) zeros.

At the largest zero, \(C_{h-1}^\lambda(\xi_h)>0\), hence (1) is negative.
At \(u=1\), where \(z=0\) and \(y=1\), it is positive because

\[
C_h^\lambda(1)-C_{h-1}^\lambda(1)
=\binom{h+2\lambda-1}{h}
 -\binom{h+2\lambda-2}{h-1}>0
\]

for the integer \(\lambda=j+1\geq1\). Hence there is one additional zero
between \(\xi_h\) and \(1\). This gives \(h\) distinct zeros in
\((-8/9,0)\).

Finally, the coefficient of \(z^h\) in the first Gegenbauer coefficient is
positive (equivalently, choose the \(3zx\) term \(h\) times), while the
subtracted degree-\(h-1\) coefficient cannot affect it. Thus
\(\deg_zW_{j,h}=h\), so the zeros just found are all its zeros. Newton's
inequalities give the stated normalized log-concavity.

## 3. Consequence for the quantitative route

The theorem supplies the requested ultra-log-concavity of the active-box
law without an unverified stability-preserver hypothesis. Any remaining
use of this law in the Poincare argument must still track the normalization
and the equality/boundary cases, but the polynomial root claim itself is now
closed in all \(j,h\).
