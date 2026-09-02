# Rank-eight low/high base-payment hard-face theorem

Date: 2026-08-20

Status: **exact theorem on the full cumulative-tail hard face; not the full
base-payment cone and not the low/high theorem.**

## Statement

Let `M0` be the rank-eight margin of a high base satisfying
`delta1=h`, and let `p_i=a_i/i!`, `q_j=b_j/j!`.  On the face

```text
a0=a2=b3=b4=b5=b6=b7=0,
h,ta,a3,...,a7,tb,b0,b1,b2 >= 0,
```

one has the strengthened base-margin payment

```text
M0 >= 7!*8!*h*p1*p2*K_q(1,2).
```

Combined with the exact pairwise derivative reduction, this face pays the
sole negative derivative pair for the strong auxiliary.  Off this face a
separate no-gap argument is still required.

## Two-block cumulative factorization

Put

```text
X  = ta+a3+a4+a5+a6+a7,
S  = tb+b2,
T  = S+b1,
U  = T+b0,
S0 = b2,
T0 = b2+b1,
U0 = b2+b1+b0.
```

The exact face polynomial has 3,304,270 nonzero coefficients and 3,332
negative coefficients in the raw monomial basis.  Their entire negative
part is nevertheless only

```text
-7*h*tb^6*X^2
 *(X*S^2*T^2*U^2 + 2*h*S0^2*T0^2*U0^2).
```

Thus there are two cumulative negative blocks, with demands 7 and 14.

The exact positive coefficient reserve contains the following four source
families coefficientwise:

```text
1    * h   * X   * tb^8 * S^2*T^2*U^2,
35   * h   * X^5 * tb^4 * S^2*T^2*U^2,
147  * h^2 * X   * tb^7 * S0^2*T0^2*U0^2,
8610 * h^2 * X^3 * tb^5 * S0^2*T0^2*U0^2.
```

Only small portions are needed.  Allocate coefficients `(1,13)` to the
first block and `(1,49)` to the second.  Exact midpoint AM-GM gives

```text
4*1*13 = 52 >= 7^2,
4*1*49 = 196 = 14^2.
```

The source families are disjoint, every negative coefficient is reproduced
by the two displayed blocks, and every unused coefficient remains
nonnegative.  This is a uniform lift in all five low tail slacks: it does
not obtain the result by checking the slacks one at a time.

## Scope

The theorem covers exactly the stated hard face.  It does not certify terms
involving `a0`, `a2`, or `b3,...,b7`; it therefore does not yet prove the
full base-margin payment, either tail auxiliary, the low/high cone, forest
`Q8`, PGC, or Problem 993.

## Replay and hashes

```powershell
python .\verify_rank8_low_high_base_payment_hard_face_amgm.py
```

```text
verify_rank8_low_high_base_payment_hard_face_amgm.py
  8D95452625F2458EE9942A39FD6B7FB93FA62F93B216670C8B802CAE19DEE572
rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json
  61A48385D356468133A1D08BDD2D585D28D0B027565ACF7207C467445DF0A6B6
```
