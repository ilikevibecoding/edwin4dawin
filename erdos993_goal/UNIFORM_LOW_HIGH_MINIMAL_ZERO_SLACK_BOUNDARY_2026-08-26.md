# Uniform low/high strong auxiliary: minimal zero-slack boundary

## Result

For every integer `k >= 8` and every real `m >= 0`, take the ratio rows

```text
L = (k+1, k-1, k-2, ..., 1, 0),
R = (m+k+1, m+k-1, m+k-2, ..., m+1, m).
```

Let `a_0=b_0=1`, generate `a,b` by these ratios, let `c=a*b` be the
binomial convolution, and let `v` be the same convolution after replacing
`a_0,a_1,a_2` by zero.  Put

```text
M(c) = c_k^2 - c_(k-1)c_(k+1) - c_(k-1)c_k
```

and let `B(c,v)` be its polarized derivative.  Then

```text
(k-2) M(c) + B(c,v) > 0.
```

This is a rigorous all-rank theorem for the minimal one-parameter boundary
of the abstract low/high strong auxiliary.  It is not, by itself, a proof of
Erdos Problem 993.

## Closed form

The factorially de-scaled coefficient rows have generating functions

```text
P_k(z) = ((k+1)(1+z)^k - 1)/k,
P_n(z) = ((n+1)(1+z)^n - 1)/n,  n=m+k.
```

Consequently, for `r>=1`,

```text
c_r = r!/(kn) * ((k+1)(n+1) C(k+n,r)
                  -(k+1) C(k,r) -(n+1) C(n,r)).
```

If `u=c-v`, the deleted head gives

```text
u_r = b_r + r(k+1)b_(r-1) + C(r,2)(k^2-1)b_(r-2).
```

Because `B(c,c)=2M(c)`, the target is

```text
H = k M(c) - B(c,u).
```

Set

```text
f(x)=product(x+j, j=2..k),
A=f(m+k), B0=f(m), D=f(0)=k!.
```

Direct substitution of `c_(k-1),c_k,c_(k+1)` and the three head terms gives

```text
H = N / (2k(k+m)^2(m+2)(m+3)),

N = A D CAD + A B0 CAB - D B0 CDB - B0^2 CBB,
```

where

```text
CAD = 2(k+1)^2(k+m)^2(m+2)(m+3)(k+m+1),

CAB = (k-1)(k+1)(k+m+1)^2 P,

P = k^5-6k^4-2k^3m+5k^3+4k^2m+10k^2
    +2km^2+12km+6k-4m-4,

CDB = (k+1)(k+m+1) Q,

Q = k^4m^2+4k^4m+4k^4+k^3m^2+6k^3m+6k^3
    +2k^2m^3+9k^2m^2+10k^2m+4k^2
    +4km^3+21km^2+28km+6k
    +4m^4+22m^3+36m^2+20m+4,

CBB = 2(k+1)(k+m+1)^3(2k^2+km-k+2).
```

The producer and independent auditor both verify this rational identity
symbolically with `A,B0,D` left algebraically independent.

## Sign proof for `k>=10`

First,

```text
CAB-CBB = k(k+1)(k+m+1)^2 W,

W = (2k-4)m^2 + (-2k^3+6k^2+2k-16)m
    +k^5-7k^4+11k^3+k^2-6k-12.
```

Its discriminant is `-4 S(k)`, where

```text
S(k)=k^6-12k^5+43k^4-64k^3+31k^2+16k-16.
```

Every coefficient of `S(t+8)` is positive, so `W>0` for `k>=8,m>=0`.
Thus `CAB>CBB>0`.

Next, `f(m+k)-f(m)` has nonnegative coefficients.  Its constant and linear
coefficients, divided by `D`, are respectively

```text
Cat_k-1,
Cat_k (H_(2k)-H_(k+1)) - (H_k-1).
```

For `k>=10`, `Cat_k-1>=k^3` and `Cat_k>=4k^2`.  These follow from the
base value `Cat_10=16796` and
`Cat_(k+1)/Cat_k=2(2k+1)/(k+2)>=3`.  Also

```text
H_(2k)-H_(k+1) >= (k-1)/(2k),
H_k-1 <= k-1,
```

so the linear coefficient is at least `k^2`.  Therefore

```text
A-B0 >= D(k^3+k^2m).
```

The possibly signed part of `N` obeys

```text
A CAB - D CDB - B0 CBB
 = B0(CAB-CBB) + (A-B0)CAB - D CDB
 >= D Wlower,

Wlower=(k^3+k^2m)CAB-CDB.
```

Write `Wlower=sum(w_i m^i,i=0..5)`.  Exact expansion shows that
`w_0,w_1,w_2,w_3,w_5` become positive-coefficient polynomials after
`k=t+10`.  Moreover,

```text
4 w_3 w_5 - w_4^2 = 4(k+1)^2 R(k),

R(k)=k^12-16k^11+58k^10-32k^9-63k^8+108k^7
     -144k^6-60k^5+147k^4+4k^3+22k^2+84k+63.
```

Every coefficient of `R(t+12)` is positive.  Hence, for `k>=12`,

```text
w_3 m^3+w_4 m^4+w_5 m^5
 =m^3(w_3+w_4m+w_5m^2) >= 0,
```

and `Wlower>0`.

For `k=10,11`, exact Sturm sequences independently show that
`d Wlower/dm` has zero roots on `(0,infinity)` and is positive at zero.
The producer also supplies a different certificate: split at `m=34` and
`m=47`, respectively; on the lower interval use `m=L t/(1+t)`, and on the
upper interval use `m=L+t`.  After clearing `(1+t)^4`, every coefficient is
strictly positive.  Since `Wlower(0)>0`, both finite cases follow.

Finally `A D CAD>0`, so `N>0` and therefore `H>0`.

## Ranks 8 and 9

Direct EGF expansion factors `H` as

```text
(k-2)(k+1)(m+k+1) Q_k(m),
```

and every coefficient of `Q_8` and `Q_9` is strictly positive.  The complete
integer coefficient lists are embedded in both reports and are independently
reconstructed from the EGF formula rather than from the producer's ratio-row
iteration.

## Replayable artifacts

```text
prove_uniform_low_high_minimal_zero_slack_boundary_root.py
  SHA256 382D3DBF104D57138CC3B525A72DAAE354EE919602EBC20EA6C14D3522BFEEF2

uniform_low_high_minimal_zero_slack_boundary_theorem_exact_root_20260826.json
  SHA256 ECB419E90D6304C22703D83BD12279E7C7D3987C5D24398D928CB625BFA1BB07

audit_uniform_low_high_minimal_zero_slack_boundary_independent_root.py
  SHA256 0C95810B7EB791B3C6C920EE5504BE0BAD0E9B970B14CF03BA92C3B5861C078A

uniform_low_high_minimal_zero_slack_boundary_independent_audit_root_20260826.json
  SHA256 6882D4816C85345946B89DBAE66811178B1A2F825849BF5287AF98BF6E1517F1
```
