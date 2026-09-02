# Balanced subdivided-star occupancy balancing

Date: 2026-08-29

For a centre of degree `r` with `y` occupied arms, put

```text
A=1+x, B=1+2x,
F_y=B^y A^(r-y)+x A^y.
```

For `1<=v<=u<r`, direct expansion gives

```text
F_(u+1)F_(v-1)-F_uF_v
=x^5 B^(v-1) A^(r-u+v-2)
  sum_(i=0)^(u-v) A^(2(u-v-i))B^i >=coeff 0.       (1)
```

Thus an unequalizing transfer weakly increases the product.  Reversing such
transfers proves that, among equal-degree centres with a fixed total number
of occupied arms, the coefficientwise minimum is attained when the centre
occupancies differ by at most one.

For balanced arm counts `R=d*q+s`, apply (1) independently to the `s`
degree-`q+1` centres and the `d-s` degree-`q` centres.  If their occupied-arm
totals are `Y_hi,Y_lo`, the exact all-row lower is therefore the product of
the two balanced group rows.  The excluded-centre product
`H^0=B^(Y_hi+Y_lo)A^(R-Y_hi-Y_lo)` is distribution-independent, so subtracting
it gives the simultaneous coefficientwise lower for `E^0=F^0-H^0`.

This is an all-order structural theorem.  It removes the occupancy-histogram
dimension from the retained-`h_(j-1)` certificate, but does not by itself
prove the remaining scalar sign, terminal Newton `m=0`, or Erdos Problem 993.

Replay:

```powershell
python .\prove_balanced_subdivided_star_occupancy_balancing_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_BALANCED_OCCUPANCY_BALANCING
```
