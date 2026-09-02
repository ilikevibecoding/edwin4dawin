# Rank-eight low/high partner-tail structural reduction

Date: 2026-08-20

Status: **exact terminal-compression and kernel-monotonicity theorems; not a
complete base-payment theorem.**

## Corrected terminal compression

Let

```text
P = M0 - 7!*8!*h*p1*p2*K_q(1,2).
```

The `b7` gap may be absorbed into the partner terminal ratio.  If its value
is `z`, then

```text
P(tb,b7=z) = P(tb+z,b7=0) + z*c7*q8.
```

After this sets `b7=0`, the same operation for `b6=z` gives

```text
P_actual - P_shifted
 = z*q7*[c7*(2*tb+h+9*a1)-2*c8] + z^2*q7*(c7-q7).
```

Both correction factors are coefficientwise nonnegative on the full
remaining cone.  For the corrected linear factor the independent audit found
371,056 terms, zero negative coefficients, and minimum coefficient 7.  For
`c7-q7` it found 126,988 terms, zero negatives, and minimum 1.  Consequently
any proof with `b6=b7=0` extends to arbitrary nonnegative `b6,b7`.

The earlier v1 formula with `2*h` in place of `h` was algebraically false and
is withdrawn.  Its source hash begins `521DBD79...` and its report hash begins
`CFD5026B...`; neither may be cited as evidence.

Corrected producer hashes:

```text
source F428BF4B0B27D0099041EF630937E7E95114E0674121A620F115AFC9B7C9F557
report A5648D9EEBCE43C6D8CFFB7A52C790710FB85ACB91302511886D27D85E9B77C1
```

Independent corrected audit hashes:

```text
source 707FAE18FB1BC8CE0966E7F11DD2C4FD076F7276BE8188D26384E8A5E2B87502
report 10E8B341308525B658873D9F5FA6E5764BD7DD4E09FA46CF0A8C734EB5D040D5
```

## Prefix-gap kernel monotonicity

For a partner gap `b_r`, put

```text
H_n = q_n'/q_n = sum_(u=0)^min(n-1,r) 1/B_u.
```

For every pair `i<k`, write `a=7-i`, `b=8-k`, so `a>=b`, and

```text
K_q(i,k)=q_a*q_b-q_(a+1)*q_(b-1).
```

If `b>0`, set

```text
rho = b*B_a / ((a+1)*B_(b-1)).
```

Direct differentiation gives

```text
K'/(q_a*q_b)
 = H_a+H_b-rho*(H_(a+1)+H_(b-1)).
```

The only apparently adverse case is `a<=r`.  Then both boundary score jumps
are active, `B_a<=B_(b-1)`, and `H_a+H_b>=1/B_(b-1)`.  Exact cancellation
gives the strictly positive lower bound

```text
K'/(q_a*q_b) >= (a+1-b)/((a+1)*B_(b-1)).
```

All other cases are manifestly nonnegative; `b=0` is immediate.  Therefore
every rank-eight partner MLR kernel is nondecreasing under every prefix-gap
lift.  Differentiating the pairwise MLR identity then shows that the
un-subtracted high/high margin `M0` is also nondecreasing.

Exact replay hashes:

```text
source DECBBF1D1F987CA851B1750033BDEE90FBAE828DE97566C1EA10B83C05D8E87C
report A35434A86A52F45CFC2C1CC01B817629C41AFBBFB82A656F81DCDA43F0A71798
```

## Remaining dependency

After terminal compression only `b3,b4,b5` remain on the partner-tail side.
For their target kernel `K=q6^2-q5*q7`,

```text
r=3,4: K' = 2*H*K,
r=5:   K' = 2*(H+1/B5)*K + q5*q7/B5.
```

Thus the remaining gap is quantitative rather than a sign ambiguity: the
nonnegative MLR derivative reserve must pay this positive target derivative,
including its `r=5` boundary term.  The theorem here does not make that
payment and does not claim the full low/high cone, Q8, PGC, or Problem 993.
