# Unforced near-sector `g=2` selector ceiling

Date: 2026-08-13

Status: all-order theorem.  This proves the selector ceiling on both
unforced `g=2` charts.  Combined with the companion scalar-payment theorem,
the unforced ceiling is now complete for every `g>=2`.  The unforced `g=1`
family, forced chart, and rotating half-angle continuation remain separate.

## 1. Boundary response

For `g=2`,

```text
R=s-1,       K=2s+kappa,       kappa in {0,1},
s odd,       s>=11.                                      (1)
```

Put `A=s(s+1)` and, for `h>=1`,

```text
b_h=A/{h(h+1)}.                                         (2)
```

The active-box expansion from the `g>=3` proof still applies after the
zero initial coefficient is removed: its largest active binomial index is
`s-h<=R`.  Hence

```text
q_h=c_(R+2,s,h)/c_(R,s,h) <= b_h                    (h>=1), (3)
```

and `b_h` decreases.  The same positive summand injection gives

```text
c_(h+1)/c_h >= L_h,
L_h={(s-2h)(s-2h-1)(2s-1)}/{(2h+1)(2h)(h+1)}.          (4)
```

At the exceptional initial index, direct extraction gives

```text
c_0=0,       c_(R+2,s,0)=s+1,
d_0=Kc_0-c_(R+2,s,0)=-(s+1),
c_1=2s(s-1).                                            (5)
```

Let `H` be the last positive integer with `b_H>=K`.  Thus

```text
KH(H+1)<=A<K(H+1)(H+2).                                (6)
```

## 2. Exact gap and height bounds

Set

```text
Delta=K(H+1)(H+2)-A.                                   (7)
```

The quadratic boundary is exact when `kappa=0` and lies strictly between
successive integers when `kappa=1`.  With `B_h=2h(h+1)-1`, (6) and oddness
of `s` give

```text
kappa=0: B_H   <=s<=B_(H+1)-2,
kappa=1: B_H+2 <=s<=B_(H+1).                           (8)
```

Since `2Delta-s` is concave in `s`, substitution at the endpoints proves

```text
kappa=0: 2Delta>s, hence 2Delta>=s+1,
kappa=1: 2Delta>=s+1.                                  (9)
```

After subtracting the asserted right side, the lower and upper endpoint
differences are respectively

```text
kappa=0: (8H+7)(2H^2+2H-1),    3(2H^2+6H+1),
kappa=1: 2(2H+1)(4H^2+4H+3),   0.
```

The first pair is strictly positive and the second pair is nonnegative for
`H>=1`.  Since all quantities are integral and `A=s(s+1)`, (9) implies
uniformly

```text
Delta>=A/(2s),             Delta K/A>=1.               (10)
```

The other required estimate is

```text
A L_H/{(H+1)(H+2)} > HA/2+1.                           (11)
```

After clearing positive denominators, (11) is

```text
2A(s-2H)(s-2H-1)(2s-1)
 >(HA+2)(2H+1)(2H)(H+1)^2(H+2).                       (12)
```

For `kappa=0`, substitute `s=2H(H+1)-1+u`, `H=3+r`; for `kappa=1`,
substitute `s=2H(H+1)+1+u`, `H=2+r`.  In both cases the difference in
(12) has 36 strictly positive coefficients in `r,u`.  The only admissible
smaller cases are `(kappa,H,s)=(0,2,11)` and `(1,1,11)`; their cleared
differences are respectively `41328` and `389520`.  Thus (11) is an
all-order positive-coefficient certificate.

## 3. Payment

For `1<=h<=H`, (4) and (11) imply `K L_h>=K L_H>1`, so `c_hK^h` increases.
Equations (2)--(3) therefore bound the negative response from indices
`1,...,H` in units of `c_HK^H` by

```text
H(b_1-K)<HA/2.                                         (13)
```

Equation (5) and monotonicity give the additional initial loss

```text
(s+1)/(c_HK^H) <= (s+1)/(2s(s-1)K)<1.                 (14)
```

The first index after `H`, using (4), contributes at least

```text
(K-b_(H+1))K L_H
 =Delta K L_H/{(H+1)(H+2)}
 >=A L_H/{(H+1)(H+2)}                                 (15)
```

in the same units, by (10).  Inequality (11) says (15) strictly exceeds
the sum of (13)--(14).  All later positive terms may be discarded.  Hence

```text
sum_h (Kc_(R,s,h)-c_(R+2,s,h))K^h>0,
G_(N-1,s)(K)<K G_(N-2,s)(K).                          (16)
```

This proves the selector ceiling, and hence the quasi-Jacobi real-anchor
orientation, on both unforced `g=2` charts.

The companion replay
`prove_lower_selector_near_sector_unforced_g2_ceiling.py` checks the
gap and positive-coefficient certificates and exact response sums and reports

```text
PASS_EXACT_UNFORCED_NEAR_SECTOR_G2_CEILING_THEOREM_REPLAY.
```
