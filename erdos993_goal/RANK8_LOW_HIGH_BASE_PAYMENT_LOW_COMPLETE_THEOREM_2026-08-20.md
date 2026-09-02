# Rank-eight low/high base-payment low-complete theorem

Date: 2026-08-20

Status: **exact theorem with every low-side slack arbitrary and high-tail
slacks `b3,...,b7` zero.  This is not yet the full base-payment theorem.**

## Theorem

For the high base with `delta1=h`, let

```text
p_i=a_i/i!,   q_j=b_j/j!,
K_q(1,2)=q_6^2-q_5*q_7.
```

If all low-side slacks `a0,a2,a3,...,a7` and the high-side slacks
`b0,b1,b2` are arbitrary nonnegative, while

```text
b3=b4=b5=b6=b7=0,
```

then

```text
M0 >= 7!*8!*h*p1*p2*K_q(1,2).
```

This is exactly the proposed payment of the sole negative derivative pair
on this subcone.

## No-gap chain

The boundary `a0=a2=0` is proved by the independently audited uniform
two-block AM-GM certificate in

```text
X=ta+a3+a4+a5+a6+a7.
```

The `a0` dependence is exactly quadratic:

```text
P(a0)=P(0)+a0*L+a0^2*Q.
```

Over the full cumulative-`X` hard ring, `L` has 2,141,690 terms and `Q`
has 1,341,798 terms; both are coefficientwise nonnegative, with minimum
positive coefficient 1.

The joint `a0,a2` expansion has `a0` degree at most 2 and `a2` degree at
most 6.  All 18 slices with `a2` exponent `1,...,6` and `a0` exponent
`0,1,2` were formed independently.  Every nonzero slice is coefficientwise
nonnegative; the smallest positive coefficient is 1.  The `a2=0` slices
are precisely the hard face and the two already certified `a0` terms.

Thus there is no gap in the low-side slack coverage.

## Remaining gap

Only simultaneous high-tail slacks `b3,...,b7` remain.  Single-slack
coefficient checks do not cover their mixed products, so they are not used
to promote this note to a full-cone theorem.

This note does not by itself prove the strong auxiliary, low/high cone,
forest `Q8`, PGC, or Problem 993.

## Replay and hashes

```powershell
python .\assemble_rank8_low_high_base_payment_low_complete.py
```

```text
assemble_rank8_low_high_base_payment_low_complete.py
  6C58FC1B9084244C981F13058BB4BDFEF98ADA2226A99925974FBEC533DDECF9
rank8_low_high_base_payment_low_complete_exact_20260820.json
  3D145197F66A33AEDD57124745442E855D2E15EFD23A1E8C14165C15E066C43B
```
