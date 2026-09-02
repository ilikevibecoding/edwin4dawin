# Unforced near-sector scalar payment theorem

Date: 2026-08-13

Status: all-order theorem.  This proves residual scalar inequality (19) of
`LOWER_SELECTOR_NEAR_SECTOR_FAR_UNFORCED_CEILING_THEOREM_2026-08-13.md`
for every unforced near-sector chart cell with `g>=3`.  Together with the
positive active-box bounds in that note, it proves the selector ceiling on
the complete unforced `g>=3` chart.  It does not address `g=1,2`, the forced
chart, or rotating half-angle continuation.

## 1. The scalar residual

Use the unforced coordinates

```text
s=2m-4+sigma,       y=2g-4,
K=2s+kappa,         kappa=3-sigma-e,
(e,sigma) in {(0,0),(1,0),(1,1),(2,1)}.
```

Thus `y` is even and `y>=2` when `g>=3`.  The four possible values and the
parity of `s` are

```text
kappa       0   1   2   3
s parity   odd odd even even.                            (1)
```

Put

```text
A=(s+y)(s+y+1),
b_h=A/((y+h)(y+h+1)).                                  (2)
```

If `b_0<=K`, the active-box estimate already makes every response
coefficient nonnegative.  Suppose therefore that `b_0>K`, and let `H` be
the last nonnegative integer for which `b_H>K`.  The remaining scalar
claim is

```text
(K-b_(H+1)) K L_H > (H+1)(b_0-K),                     (3)

L_H={(s-2H)(s-2H-1)(2s+2y-1)}
    /{(y+2H+1)(y+2H)(H+1)}.                           (4)
```

This is exactly inequality (19) in the preceding note.

## 2. A parity gap lemma

Set

```text
p=y+H,        n=p+1,
E=A-Ky(y+1)>0,
Delta=K n(n+1)-A.                                     (5)
```

The definition of `H` says

```text
Kp(p+1)<A<=Kn(n+1).                                   (6)
```

In fact the second inequality is strict.  More quantitatively,

```text
Delta >= E/(2s).                                      (7)
```

Here is an exact proof which uses the chart parity rather than a Diophantine
approximation.  For an integer `q>y`, define

```text
B_q=2q(q+1)-2y-1.
```

The positive root in `s` of

```text
(s+y)(s+y+1)=(2s+kappa)q(q+1)                        (8)
```

lies respectively in

```text
kappa=0: (B_q-1/2, B_q),
kappa=1: (B_q,     B_q+1/2),
kappa=2: (B_q+1/2, B_q+1),
kappa=3: (B_q+1,   B_q+3/2).                         (9)
```

To verify (9), let `Disc_q` be the discriminant in (8).  The exact lower
and upper square comparisons are

```text
 kappa       Disc_q-(lower)^2                 Disc_q-(upper)^2
   0     4q(q+1)-4y^2-8y-3                    -4y(y+1)
   1     4(q(q+1)-y(y+1))                      1-4y^2
   2     4q(q+1)-4y^2+1                       -4y(y-1)
   3     4(q(q+1)-y(y-1))                      1-4(y-1)^2,
```

where `(lower,upper)` is `(B_q-1,B_q)`, `(B_q,B_q+1)`,
`(B_q+1,B_q+2)`, or `(B_q+2,B_q+3)`, respectively.  The left column is
positive and the right column negative because `q>=y+1` and `y>=2`.
This proves (9).  Combining (1), (6), and (9) gives the complete integer
interval

```text
             least s                 greatest s
kappa=0      B_p                     B_n-2
kappa=1      B_p+2                   B_n
kappa=2      B_p+1                   B_n-1
kappa=3      B_p+3                   B_n+1.           (10)
```

For fixed `n`,

```text
Delta(s)=-s^2+B_n s+kappa*n(n+1)-y(y+1).             (11)
```

Hence `2 Delta-s` is concave in `s`, so its minimum on each interval in
(10) is at an endpoint.  Direct substitution at those eight endpoints,
followed by writing `n=y+1+r` with `r>=0` and `y=2+Y` with `Y>=0`, gives

```text
kappa=0,2:  2 Delta-s >= 0,
kappa=1:    2 Delta-s >= 1-2y^2,
kappa=3:    2 Delta-s >= -2y(y-2).                   (12)
```

Every endpoint difference in this substitution has nonnegative integer
coefficients in `(r,Y)`.  For completeness, after subtracting the right
side asserted in (12), the lower- and upper-endpoint differences are

```text
kappa=0:
  16Y^3+48Y^2r+108Y^2+48Yr^2+236Yr+230Y
    +16r^3+126r^2+286r+149,
  4Y^2+12Yr+26Y+6r^2+42r+39;

kappa=1:
  2(2Y+2r+5)(4Y^2+8Yr+16Y+4r^2+20r+19),
  0;

kappa=2:
  2(8Y^3+24Y^2r+54Y^2+24Yr^2+118Yr+125Y
    +8r^3+63r^2+151r+102),
  2(2Y^2+6Yr+15Y+3r^2+21r+27);

kappa=3:
  2(2Y+2r+5)(4Y^2+8Yr+16Y+4r^2+20r+23),
  0.                                                        (12a)
```

This is an explicit positive-coefficient certificate, not a finite scan.
There is also a short comparison with `E`.  Expanding (5),

```text
E=s^2+s(1-2y^2)+(1-kappa)y(y+1).                    (13)
```

For `kappa=0,2`, (13) is at most `s^2`, while (12) gives
`Delta>=s/2`.  For `kappa=1`, (13) is exactly
`s(s+1-2y^2)`.  For `kappa=3`, multiplication of the last line of (12) by
`s` exceeds (13), since the difference is

```text
4sy-s+2y(y+1)>0.
```

These three observations prove (7), and in particular prove `Delta>0`.

## 3. The common height inequality

Divide the left side of (3) by the right side and use (2), (4), and (5).
The ratio is exactly

```text
 Delta K (s-2H)(s-2H-1)(2s+2y-1)y(y+1)
 ----------------------------------------------------------------.        (14)
 (y+H+1)(y+H+2)(y+2H+1)(y+2H)(H+1)^2 E
```

By (7) and `K>=2s`, the leading factor `Delta K/E` is at least one.  It
therefore remains only to prove

```text
(s-2H)(s-2H-1)(2s+2y-1)y(y+1)
 >(p+1)(p+2)(y+2H+1)(y+2H)(H+1)^2.                 (15)
```

The least entries in (10) have the especially simple forms

```text
2p^2+2H-1,  2p^2+2H+1,
2p^2+2H,    2p^2+2H+2,                             (16)
```

respectively.  Thus, uniformly in all four charts,

```text
s-2H>=2p^2-1,
s-2H-1>=2p^2-2,
2s+2y-1>=4p^2.                                     (17)
```

Also `p=H+y>=2`, and

```text
y+2H+1<=2p-1,   y+2H<=2p-2,   H+1<=p-1.           (18)
```

Using (17)--(18), then cancelling `2(p-1)(p+1)`, reduces (15) to the
stronger elementary inequality

```text
4p^2(2p^2-1)y(y+1)
 >(p+2)(2p-1)(p-1)^2.                              (19)
```

Indeed the right side of (19) is less than `4p^4`, whereas its left side
is at least `24p^2(2p^2-1)>4p^4` for `p>=2`.  This proves (15) strictly.
Together with (14) and the parity gap lemma, it proves (3).

## 4. Consequence and scope

The active-box response bound gives a single negative head followed by a
positive tail, and its coefficient-growth injection reduces payment of the
head to (3).  The theorem above therefore proves

```text
sum_h (K c_(R,s,h)-c_(R+2,s,h)) K^h>0             (20)
```

for every unforced near-sector cell with `m>=7` and `g>=3`, without the
far-unforced condition `Phi>0`.  Equivalently,

```text
G_(N-1,s)(K)<K G_(N-2,s)(K).
```

Thus the selector ceiling and the quasi-Jacobi real-anchor orientation are
complete on the unforced `g>=3` chart.  Still outside this theorem are the
unforced `g=1,2` cells, the forced chart, and the rotating half-angle
continuation from the real anchor.

The companion replay
`prove_lower_selector_near_sector_unforced_scalar_payment.py` checks every
algebraic identity above symbolically, checks the endpoint certificates as
positive-coefficient polynomials, and independently evaluates exact chart
cells.  It reports

```text
PASS_EXACT_UNFORCED_NEAR_SECTOR_SCALAR_PAYMENT_THEOREM_REPLAY.
```
