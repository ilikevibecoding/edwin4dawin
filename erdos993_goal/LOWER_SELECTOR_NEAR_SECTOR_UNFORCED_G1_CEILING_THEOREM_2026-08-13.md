# Unforced near-sector `g=1` selector ceiling

Date: 2026-08-13

Status: all-order theorem.  This closes the sole unforced `g=1` family.
Together with the `g=2` and `g>=3` companion theorems, the selector ceiling
and quasi-Jacobi real-anchor orientation are now complete on the entire
unforced near-sector chart.  The forced chart and rotating half-angle
continuation remain separate obligations.

## 1. Shifted boundary response

The `g=1` chart has

```text
R=s-3,       K=2s,       s odd,       s>=11.             (1)
```

For `h>=3`, put `u=h-2` and `A=(s-1)(s-2)`.  The active-box expansion has
largest active index `s-h<=R`, so exactly as before

```text
q_h=c_(R+2,s,h)/c_(R,s,h) <= b_h=A/{u(u+1)}.            (2)
```

The positive summand injection gives

```text
c_(h+1)/c_h >= L_h,
L_h={(s-2h)(s-2h-1)(2s-5)}/{(2h-1)(2h-2)(h+1)}.       (3)
```

The two exceptional initial responses are obtained directly from the same
positive coefficient formula:

```text
d_1=-2s(s-1),
d_2=-s(s-3)(s-1)(2s^2-23s+50)/6,
c_3=(s-5)(s-4)(s-3)(s-1)(2s^2-s-9)/9.                (4)
```

Both `d_1,d_2` are negative for `s>=11`.  Moreover

```text
c_3K^3+d_1K+d_2K^2
 =2s^2(s-1){8s^6-100s^5+382s^4-149s^3
             -1809s^2+2610s-18}/9 >0.                 (5)
```

After `s=11+x`, the right side of (5) has ten strictly positive
coefficients in `x`.  Thus the combined exceptional loss, in units of
`c_3K^3`, is strictly less than one.

## 2. Parity gap

Let `U` be the last positive integer with

```text
2s U(U+1)<=A,                                         (6)
```

and put `H=U+2`.  Then every possibly negative ordinary response lies at
`3<=h<=H`.  Set

```text
Delta=2s(U+1)(U+2)-A.                                 (7)
```

Writing `S=s-2`, the equality boundary for an integer `q` is

```text
S(S+1)=2(S+2)q(q+1).                                  (8)
```

If `Q=q(q+1)`, its positive root lies strictly between `2Q+1/2` and
`2Q+1`: square comparison uses

```text
(2Q+2)^2 < 4Q^2+12Q+1 < (2Q+3)^2.
```

Since `S` is odd, (6) and its strict successor inequality give the exact
interval

```text
2U(U+1)+3 <=s<=2(U+1)(U+2)+1.                         (9)
```

The concave quadratic `2Delta-s` is minimized at an endpoint.  Its two
endpoint values are

```text
16U^3+30U^2+38U+17,       6U^2+18U+11.                (10)
```

They are positive, so `Delta>s/2>A/(2s)` and therefore

```text
Delta K/A>1.                                          (11)
```

## 3. Height payment

Except at two cells isolated below, the height certificate is

```text
A L_H/{(U+1)(U+2)} > UA/2+1.                          (12)
```

After clearing positive denominators this becomes

```text
2A(s-2H)(s-2H-1)(2s-5)
 >(UA+2)(2H-1)(2H-2)(H+1)(U+1)(U+2).                 (13)
```

For `U>=3`, substitute `s=2U(U+1)+3+w` and `U=3+r`.  The difference in
(13) has 36 strictly positive coefficients in `(r,w)`.  For `U=2`, the
same difference after `s=19+w` is

```text
4w^5+290w^4+8300w^3+112030w^2+636456w+674280.
```

For `U=1`, the only chart values are `s=11,13`, and the cleared differences
are `17040,168528`.  Thus (12) holds everywhere except `(U,s)=(2,15)` and
`(2,17)`.

On the range where (12) holds, (3) makes `c_hK^h` increase through the
negative head.  Equations (2) and (5) bound all loss in units of `c_HK^H`
by

```text
U(b_3-K)+1 < UA/2+1.                                  (14)
```

The first positive response after `H`, using (3) and (11), is at least

```text
(K-b_(H+1))K L_H
 =Delta K L_H/{(U+1)(U+2)}
 >A L_H/{(U+1)(U+2)},                                 (15)
```

which pays (14) by (12).

It remains only the two isolated cells where the deliberately coarse
height certificate fails.  Direct exact evaluation of the full response
from the positive coefficient formula gives

```text
(U,s)=(2,15): 152909548480775417400,
(U,s)=(2,17): 273406902871412125796736.                (16)
```

Both are positive.  These are exhaustive isolated boundary evaluations
deduced from (9), not a growing scan.

Consequently, for every unforced `g=1` chart cell,

```text
sum_h (Kc_(R,s,h)-c_(R+2,s,h))K^h>0,
G_(N-1,s)(K)<K G_(N-2,s)(K).                          (17)
```

The companion replay
`prove_lower_selector_near_sector_unforced_g1_ceiling.py` verifies all
positive-coefficient certificates, the two exhaustive exceptions, and an
independent exact response box.  It reports

```text
PASS_EXACT_UNFORCED_NEAR_SECTOR_G1_CEILING_THEOREM_REPLAY.
```
