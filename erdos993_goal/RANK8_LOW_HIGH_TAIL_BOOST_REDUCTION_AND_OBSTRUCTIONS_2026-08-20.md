# Rank-eight low/high full-convolution tail-boost reduction

Date: 2026-08-20

Status: **exact reduction with exact method obstructions; not a low/high cone theorem.**

## Exact one-inversion form

After factorial de-scaling, write the low adjusted next-ratios as

```text
F_i=A_i+i h.
```

The low cone has one and only one possible inversion:

```text
F_1-F_2=-t,  0<=t<=h.
```

Indeed its ratio gaps have the exact form

```text
delta0>=2h,
delta1=h-t,
delta2>=h+t,
delta3,...,delta7>=h.
```

The high partner has decreasing adjusted ratios throughout.

## Tail-boost representation

Put `C=A_2-t` and lower the low row's ratio at index two from `A_2` to
`C`.  The resulting base row is a high row:

```text
A_1-C=h,
C-A_3>=h.
```

Multiplying every base coefficient at indices at least three by

```text
lambda=1+t/C
```

changes only the index-two ratio, from `C` to `C+t`, and recovers the
original low row exactly.  The six high gaps from indices two through seven
give

```text
C>=6h,  hence  1<=lambda<=7/6.
```

This representation is exact, including boundary cases.

## Two-inequality reduction

Split each convolution coefficient into the head and tail contributions

```text
c_k(lambda)=u_k+lambda v_k,  k=7,8,9.
```

For

```text
M(lambda)=c_8(lambda)^2-c_7(lambda)c_9(lambda)-h c_7(lambda)c_8(lambda),
```

exact expansion gives

```text
M(lambda)=q0+lambda q1+lambda^2 q2,

q2=v8^2-v7 v9-h v7 v8.
```

Writing `M0=M(1)` and `d=M'(1)=q1+2q2`, the target is

```text
M(1+t/C)=M0+(t/C)d+(t/C)^2q2.
```

The high/high theorem gives `M0>=0`.  Therefore the complete low/high cone
would follow from the following two sharply stated auxiliary inequalities:

```text
q2>=0,
C M0+h d>=0.                                      (LH-tail)
```

If `d>=0`, convexity gives `M(1+t/C)>=M0`.  If `d<0`, then `t<=h` and
`(LH-tail)` give

```text
M(1+t/C)>=M0+(h/C)d>=0.
```

Thus the broad low/high problem is reduced to these two exact tail
inequalities on a high base satisfying the single boundary equality
`delta1=h`.

## Exact method obstructions

Three tempting shortcuts fail.

1. **Tail monotonicity fails.**  At `h=1`, take base ratios
   `[9,7,6,5,4,3,2,1,0]` and high-partner ratios
   `[1009,1007,1006,1005,1004,1003,1002,1001,1000]`.  Here `C=6`,
   `lambda=7/6`, and

   ```text
   M'(1)=-2948130178562995665302039011360069000636800<0.
   ```

   Both `M(1)` and `M(7/6)` are positive, so this is an obstruction to a
   monotonicity proof, not a cone counterexample.

2. **The minimal three-mass MLR payment fails.**  With `h=t=1`, low ratios
   `[49,23,23,21,18,17,13,10,2]`, and high ratios
   `[201,163,124,123,108,88,62,47,9]`, the proposed boundary payment is

   ```text
   -314022094309129485121780798
   /26986051604919033938882588555 < 0.
   ```

   The full adjusted drop remains strictly positive.  Any proof must retain
   additional gap-weighted MLR mass rather than only the three boundary
   masses.

3. **Naive coefficientwise positivity fails even on the zero-slack face.**
   In terminal variables `x,y`, the cleared auxiliary `C M0+h d` has six
   negative monomial coefficients, including `-7 h x^4 y^12`.  These are
   enclosure obstructions only; they are not negative values of the
   auxiliary inequality.

The exact replay records all six negative monomials and reconstructs both
rational witnesses.

## Scope guard

This note does not prove or disprove the low/high cone.  It does not address
the low/low cone, complete forest `Q8`, rank-eight PGC, or Problem 993.  The
remaining theorem target is exactly the pair of inequalities `(LH-tail)`;
negative derivative and coefficient witnesses above are method obstructions
only.

## Replay and hashes

```powershell
python .\analyze_rank8_low_high_tail_boost_reduction.py
```

```text
analyze_rank8_low_high_tail_boost_reduction.py
  EECF94D2DC0D65CE2517768E9A8EBE9E552FDECF8E07FDDAD2D7D50F57A97E32
rank8_low_high_tail_boost_reduction_exact_20260820.json
  2ABAAE9134E9F65EA2DE3934F5D84D3903873EDD39E9BFC1D6F1F99654A124E0
```
