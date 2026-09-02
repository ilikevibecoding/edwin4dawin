# Affine bridge at `r=0`, even parity: an all-parameter theorem

This note proves the first unresolved slice of the original affine bridge.
It is an exact symbolic theorem for all parameters, not a finite scan.

Put

\[
A=(1+z)(1+w),\qquad T=z(1+z)+w(1+w),\qquad V=1+z+w.
\]

Let

\[
B^{\rm grp}_0=T^3K^{\rm aff}_0V+JA,
\qquad
B^{\rm bot}_0=(zw)^2T^3K^{\rm aff,bot}_0V+J^{\rm bot}_0A
\]

be the exact even kernels of the two affine reductions. Define

\[
F_{\rm grp}(c,m,x)=
[z^{m+5}w^{m+5}]
A^{2c+m+x-3}T^{2m-4}B^{\rm grp}_0,
\]

\[
F_{\rm bot}(m,x)=
[z^{m+5}w^{m+5}]
A^{m+x-3}T^{2m-5}B^{\rm bot}_0.
\]

## Theorem

For every `c>=1`, `m>=3`, and `x>=0`,

\[
F_{\rm grp}(c,m,x)>0.
\]

For every `m>=3` and `x>=0`,

\[
F_{\rm bot}(m,x)>0.
\]

Thus `(A_grp)` and `(A_bot)` hold strictly at `r=0`, `epsilon=0` on
their complete parameter domains.

## 1. Exact bounded hypergeometric extraction

Use the convention that a binomial coefficient is zero when its lower
index is outside its usual range. For any kernel monomial `z^p w^q`,
expansion of the `k` copies of `z(1+z)` chosen from `T^b` gives

\[
\begin{aligned}
&[z^{L}w^{L}]A^aT^bz^pw^q\\
&\quad=\sum_k\binom bk
 \binom{a+b-k}{L-q-b+k}
 \binom{a+k}{L-p-k}.                         \tag{1}
\end{aligned}
\]

This is the only coefficient-extraction identity used below.

For the group family, take

\[
a=2c+m+x-3,\quad b=2m-4,\quad L=m+5,
\quad k=m+\delta.
\]

The two lower indices in (1) become

\[
9-q+\delta,\qquad 5-p-\delta,                 \tag{2}
\]

and their sum is `14-p-q`. Hence only total kernel degrees at most 14
can contribute. The even group kernel starts in degree 12, so only its
degree 12, 13, and 14 slices survive, with at most three `delta` terms
per spatial monomial. Normalizing by the positive central binomial
coefficient gives

\[
R^{\rm grp}_\delta=
\frac{\binom{2m-4}{m+\delta}}{\binom{2m-4}{m-2}}
=\prod_{i=0}^{|\delta+2|-1}
 \frac{m-2-i}{m-1+i}.                         \tag{3}
\]

For the bottom family,

\[
a=m+x-3,\quad b=2m-5,\quad L=m+5,
\quad k=m+\delta.
\]

The lower indices are

\[
10-q+\delta,\qquad 5-p-\delta,                \tag{4}
\]

whose sum is `15-p-q`. Only total degrees 14 and 15 of the bottom
kernel survive. With normalization by `binomial(2m-5,m-2)`, the exact
ratio is

\[
R^{\rm bot}_\delta=
\begin{cases}
\displaystyle
\prod_{i=0}^{\delta+1}\frac{m-3-i}{m-1+i},
   &\delta\ge-2,\\[6pt]
\displaystyle
\prod_{i=0}^{-\delta-3}\frac{m-2-i}{m-2+i},
   &\delta<-2.
\end{cases}                                    \tag{5}
\]

Empty products are one. Equations (1)--(5) reduce the two apparently
large diagonal extractions to 82 and 34 bounded hypergeometric
summands, respectively.

## 2. The affine projection is exact here

The raw slope exports first give `T^3 K_0` in the group case and
`(zw)^2 T^3 K_0` in the bottom case. The bridge requires their parts
affine in `x`, because the quadratic part was proved separately.

The discarded group part has minimum total `(z,w)` degree 16, whereas
(2) permits degree at most 14. The discarded bottom part has minimum
total degree 17, whereas (4) permits degree at most 15. Therefore the
quadratic terms contribute identically zero to these `r=0` targets.
This also explains why a computation made from the unprojected kernel
would accidentally return the same number, although it would use the
wrong formal definition.

## 3. Positive closed form for the group family

Set

\[
C=c-1\ge0,\qquad M=m-3\ge0.
\]

Exact collection of (1)--(3) gives

\[
\boxed{
\frac{F_{\rm grp}}{\binom{2m-4}{m-2}}
=\frac{16(2M+3)(2M+5)P_{\rm grp}(C,M,x)}
{(M+2)(M+3)(M+4)(M+5)(M+6)(M+7)(M+8)}.}       \tag{6}
\]

Write

\[
P_{\rm grp}(C,M,x)=\sum_{i,j}C^ix^jp_{ij}(M).
\]

The nonzero blocks are the following. Every coefficient displayed in
the last column is positive.

| `C^i x^j` | `p_ij(M)` |
|---|---|
| `C^4` | `24(2M+7)(2M+9)(M^2+10M+26)` |
| `C^3 x` | `24(2M+7)(2M+9)(M^2+10M+26)` |
| `C^3` | `12(2M+7)(12M^4+257M^3+2095M^2+7627M+10418)` |
| `C^2 x^2` | `6(2M+7)(2M+9)(M^2+10M+26)` |
| `C^2 x` | `2(2M+7)(48M^4+1069M^3+8979M^2+33479M+46626)` |
| `C^2` | `6(2M+7)(24M^5+688M^4+7960M^3+46295M^2+134801M+156772)` |
| `C x^2` | `2(2M+7)(2M+9)(3M^3+61M^2+399M+854)` |
| `C x` | `2(2M+7)(24M^5+745M^4+9167M^3+56093M^2+170428M+205458)` |
| `C` | `2(48M^7+1956M^6+33948M^5+325459M^4+1858799M^3+6313451M^2+11787229M+9315768)` |
| `x^2` | `2(M+8)(2M+7)(2M+9)(3M^2+34M+97)` |
| `x` | `2(M+8)(2M+7)(24M^4+508M^3+4131M^2+15068M+20667)` |
| `1` | `(M+8)(96M^6+2892M^5+36870M^4+252071M^3+969333M^2+1980328M+1674162)` |

Consequently `P_grp>0` for all `C,M,x>=0`. Every other factor in
(6), including the central binomial coefficient, is positive. This
proves the group assertion.

The group kernel itself is not coefficientwise positive in its three
surviving slices. Thus (6) is a genuine positive hypergeometric
aggregation, rather than a hidden coefficientwise-positive kernel
argument.

## 4. Two positive proofs for the bottom family

The two surviving total-degree slices factor as

\[
\begin{aligned}
[B^{\rm bot}_0]_{14}
={}&2z^2w^2(z+w)^6(z^2+w^2)\\
&\cdot\bigl(2m(z^2+zw+w^2)+3z^2+5zw+3w^2\bigr),
                                                               \tag{7}
\end{aligned}
\]

and

\[
[B^{\rm bot}_0]_{15}=z^2w^2(z+w)^5Q_{15}(z,w;m),       \tag{8}
\]

where

\[
\begin{aligned}
Q_{15}={}&m(46z^6+106z^5w+210z^4w^2+228z^3w^3
 +210z^2w^4+106zw^5+46w^6)\\
&+73z^6+195z^5w+365z^4w^2+430z^3w^3
 +365z^2w^4+195zw^5+73w^6.
\end{aligned}
\]

Both slices are coefficientwise positive, while `A` and `T` are
coefficientwise nonnegative. Since no other slice can reach the target,
(7)--(8) already prove the bottom assertion directly.

For comparison with the group certificate, exact collection of the 34
summands in (4)--(5) also gives

\[
\boxed{
\frac{F_{\rm bot}}{\binom{2m-5}{m-2}}
=\frac{32(2M+3)(2M+5)P_{\rm bot}(M,x)}
{(M+2)(M+3)(M+4)(M+5)(M+6)},}                  \tag{9}
\]

where

\[
\begin{aligned}
P_{\rm bot}(M,x)={}&
48M^5+1086M^4+9872M^3+44901M^2+101944M+92262\\
&+2x(2M+7)(6M^3+85M^2+404M+642).
\end{aligned}
\]

This is strictly positive for `M,x>=0`.

## 5. Exact replay and remaining boundary

Run

```text
python prove_affine_bridge_r0_even.py
```

The script loads the original sparse kernel exports, performs the
affine projection, derives the bounded sums, checks (6) and (9), checks
every coefficient of both positive polynomials, and writes
`affine_bridge_r0_even_exact_20260810.json`. Four small direct
coefficient extractions are included only as transcription guards; the
proof is the all-parameter symbolic identity above.

This theorem does **not** prove either full affine bridge. The next
unsettled slices are `epsilon=1` at `r=0`, followed by the genuinely
order-dependent expressions `B_epsilon+rP_epsilon` for `r>=1`. The
present result does show that the very first affine obstruction is not
a boundary counterexample: both even families are strictly positive,
and their positivity has a short finite-hypergeometric certificate.
