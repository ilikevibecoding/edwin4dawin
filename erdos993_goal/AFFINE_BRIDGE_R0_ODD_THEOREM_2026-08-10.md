# Affine bridge at `r=0`, odd parity: an all-parameter theorem

This is the odd-parity companion to
`AFFINE_BRIDGE_R0_EVEN_THEOREM_2026-08-10.md`. It proves the remaining
`r=0` slice of both affine bridge families for all parameters.

Keep

\[
A=(1+z)(1+w),\qquad T=z(1+z)+w(1+w),\qquad V=1+z+w,
\]

and let `B^grp_1`, `B^bot_1` be the exact parts affine in `x` of the
odd kernels in the two-kernel reductions. Define

\[
F_{\rm grp}^{(1)}=
[z^{m+5}w^{m+5}]
A^{2c+m+x-3}T^{2m-3}B^{\rm grp}_1,
\]

\[
F_{\rm bot}^{(1)}=
[z^{m+5}w^{m+5}]
A^{m+x-3}T^{2m-4}B^{\rm bot}_1.
\]

## Theorem

For all `c>=1`, `m>=3`, and `x>=0`,

\[
F_{\rm grp}^{(1)}>0.
\]

For all `m>=3` and `x>=0`,

\[
F_{\rm bot}^{(1)}>0.
\]

Together with the even theorem, this closes `(A_grp)` and `(A_bot)` at
`r=0` for both parities.

## Bounded extraction

For a kernel monomial `z^p w^q`, use

\[
[z^Lw^L]A^aT^bz^pw^q
=\sum_k\binom bk
 \binom{a+b-k}{L-q-b+k}
 \binom{a+k}{L-p-k}.                         \tag{1}
\]

In the odd group case, put `k=m+delta`. The two lower indices become

\[
8-q+\delta,\qquad 5-p-\delta,                \tag{2}
\]

with sum `13-p-q`. Thus only total degrees 12 and 13 of the group
kernel contribute, with at most two terms for each spatial monomial.
After normalization by `binomial(2m-3,m-2)`,

\[
R^{\rm grp,1}_\delta=
\begin{cases}
\displaystyle
\prod_{i=0}^{\delta+1}\frac{m-1-i}{m-1+i},&\delta\ge-2,\\[6pt]
\displaystyle
\prod_{i=0}^{-\delta-3}\frac{m-2-i}{m+i},&\delta<-2.
\end{cases}                                    \tag{3}
\]

In the odd bottom case the lower indices are

\[
9-q+\delta,\qquad 5-p-\delta,                \tag{4}
\]

with sum `14-p-q`. Only total degree 14 contributes. Normalization by
`binomial(2m-4,m-2)` gives

\[
R^{\rm bot,1}_\delta=
\prod_{i=0}^{|\delta+2|-1}\frac{m-2-i}{m-1+i}. \tag{5}
\]

The parts of the raw kernels discarded by the affine-in-`x` projection
begin in total degree 16 for the group and 17 for the bottom. They are
therefore identically invisible to the maxima 13 and 14 in (2) and
(4).

## Positive group closed form

Set `C=c-1` and `M=m-3`. Exact collection of the 40 bounded terms from
(1)--(3) gives

\[
\boxed{
\frac{F_{\rm grp}^{(1)}}{\binom{2m-3}{m-2}}
=\frac{32(2M+5)(2M+7)P_{\rm grp}^{(1)}(C,M,x)}
{(M+3)(M+4)(M+5)(M+6)(M+7)(M+8)}.}           \tag{6}
\]

Writing `P_grp^(1)=sum C^i x^j p_ij(M)`, its seven nonzero blocks are

| `C^i x^j` | `p_ij(M)` |
|---|---|
| `C^3` | `12(2M+9)(M^2+10M+26)` |
| `C^2 x` | `6(2M+9)(M^2+10M+26)` |
| `C^2` | `2(24M^4+539M^3+4548M^2+17014M+23754)` |
| `C x` | `2(2M+9)(3M^3+61M^2+399M+854)` |
| `C` | `2(12M^5+377M^4+4684M^3+28870M^2+88232M+106878)` |
| `x` | `2(M+8)(2M+9)(3M^2+34M+97)` |
| `1` | `(M+8)(24M^4+517M^3+4251M^2+15638M+21594)` |

Every factor and coefficient is positive for `C,M,x>=0`; hence (6) is
strictly positive.

## Positive bottom closed form

The sole surviving bottom slice has the factorization

\[
[B^{\rm bot}_1]_{14}
=4z^2w^2(z+w)^6(z^2+w^2)
\bigl(m(z^2+zw+w^2)+2z^2+3zw+2w^2\bigr).     \tag{7}
\]

It is coefficientwise positive, so (7) already proves the odd bottom
claim. The corresponding collected identity is

\[
\boxed{
\frac{F_{\rm bot}^{(1)}}{\binom{2m-4}{m-2}}
=\frac{64(2M+3)(2M+5)(2M+7)
(3M^3+44M^2+216M+354)}
{(M+2)(M+3)(M+4)(M+5)(M+6)}.}                \tag{8}
\]

The apparent independence of `x` in (8) is structural: degree 14
forces both lower binomial indices in (4) to be zero.

## Replay and exact remaining boundary

Run

```text
python prove_affine_bridge_r0_odd.py
```

The exact record is `affine_bridge_r0_odd_exact_20260810.json`. It
checks the affine projection, the 40-term group and 11-term bottom
identities, coefficientwise positivity, and four direct transcription
guards.

The complete `r=0` boundary is now a theorem. What remains is the
order-dependent coefficient of

\[
V^r(B_\epsilon+rP_\epsilon),\qquad r\ge1,
\]

where the signed `B_epsilon` contribution and the positive reserve must
be retained together.
