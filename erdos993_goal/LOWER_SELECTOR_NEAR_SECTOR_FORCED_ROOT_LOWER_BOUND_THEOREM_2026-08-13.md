# Forced near-sector selector root is greater than `5/4`

Date: 2026-08-13

Status: all-order theorem.  This closes the forced-chart upper endpoint
condition in the one-polar strip reduction.

## 1. Active summands and their size ratios

On a forced near-sector chart, write `m>=7`, `a>=1`,

```text
s=2m+2a-3,       R=2m-6.
```

The all-range Lagrange formula gives

```text
[t^h]G_(M,s)=sum_c F_R(h,c),

F_R(h,c)=binom(R,j+c)binom(j+c,j)
           binom(2R+h-c,h-c),       j=s-2h,          (1)
```

with `R=2M-s-1`.  Thus the three selector rows `G_2,G_1,G_0`
use respectively `R,R+2,R+4` in (1).

For one nonzero summand put

```text
n=j+c,       ell=h-c.
```

Since `s` is odd,

```text
1<=n<=R, ell>=0,
n+ell=j+h=s-h >=(s+1)/2=m+a-1>=m.                  (2)
```

The two consecutive size ratios are

```text
q=F_(R+2)/F_R,
r=F_(R+4)/F_(R+2),                                  (3)
```

where, for `X=R,R+2`,

```text
Q_X(n,ell)=
 {(X+2)(X+1)}/{(X+2-n)(X+1-n)}
 product_(i=1)^4 {(2X+ell+i)}/{(2X+i)}.             (4)
```

## 2. Two elementary ratio bounds

First,

```text
q>=9/4,       r>=9/4.                                (5)
```

Indeed, the two factors in the first quotient in (4) are each at least
`1+n/(X+1)`, while the last four are each at least
`1+ell/(2X+4)`.  By (2), it is enough to minimize

```text
2 log(1+n/(X+1))+4 log(1+(m-n)/(2X+4))              (6)
```

on `0<=n<=m`.  It is concave, so its minimum is at an endpoint.  For
`X=R=2m-6` the two endpoint bounds are

```text
((3m-5)/(2m-5))^2 >9/4,
((5m-8)/(4m-8))^4 >625/256>9/4.                    (7)
```

For `X=R+2`, they are

```text
((3m-3)/(2m-3))^2 >9/4,
((5m-4)/(4m-4))^4 >625/256>9/4.                    (8)
```

Second,

```text
q<=r^2.                                              (9)
```

This holds factor by factor.  For `b>0`,

```text
(1+ell/(b+4))^2-(1+ell/b)
 =ell{(b-4)/(b(b+4))+ell/(b+4)^2}>=0               (10)
```

for the four factors, since `b=2R+i>=17`.  For either of the two `n`
factors, with denominator `b=R+2-n` or `R+1-n`, the same calculation with
shift two gives

```text
(1+n/(b+2))^2-(1+n/b)
 =n{(b-2)/(b(b+2))+n/(b+2)^2}>=0.                  (11)
```

Here `b>=2` is immediate except for the single boundary `b=1`, where
`n=R>=8` makes the right side `n(n-3)/9>0`.  Multiplying (10)--(11)
proves (9).

## 3. The fixed value `5/4`

Put `tau=5/4`.  The first inequality in (5) gives, term by term,

```text
4F_(R+2)-5F_R>0.                                    (12)
```

For the second selector response, divide its summand by `16F_R`.  It is

```text
qr-(5/2)q+25/16.                                    (13)
```

If `r>=5/2`, (13) is positive.  Otherwise (9), whose coefficient is now
negative, and (5) give

```text
(13)>=r^2(r-5/2)+25/16
     >=(9/4)^2(9/4-5/2)+25/16
      =19/64>0,                                     (14)
```

because the cubic on the middle interval is increasing.  Summing the
positive terms proves coefficientwise

```text
4G_1-5G_2>=_coeff 0,
16G_0-40G_1+25G_2>=_coeff 0,                        (15)
```

and each polynomial has a positive active coefficient.

Consequently

```text
G_1(5/4)/G_2(5/4)>5/4,
Gamma(5/4)>0.                                       (16)
```

The ratio in (16) has a fixed point `t_*>5/4`; strict selector Turan gives
`Gamma(t_*)<0`.  The selector has exactly two positive roots and is positive
before, between, and after them with the usual alternating sign.  Equations
(16) therefore force its smaller positive root to satisfy

```text
rho_1>5/4.                                          (17)
```

This is precisely the forced-chart upper inequality needed in the one-polar
strip reduction, because the chart bound `B<5R` implies
`B/(4R)<5/4<rho_1`.

The companion replay verifies the ratio identities and elementary
factorwise inequalities symbolically, then independently checks every
active summand through `m<=35` and every forced near-sector coefficient
through `d<=50`.  The proof above is all-order; those bounded checks are
transcription evidence.
