# Uniform low/high matched local-pair payment

## Theorem

Use the hypotheses and notation of
`UNIFORM_LOW_HIGH_TAIL_PAIRWISE_REDUCTION_2026-08-27.md`.  In particular,
`k>=8`, the two positive factorial rows are `p,q`, `C=A_2`, and

```text
A_0-A_1>=2h,  A_1-A_2=h,  A_i-A_(i+1)>=h  (i>=2),
B_0-B_1>=2h,                 B_i-B_(i+1)>=h  (i>=1).
```

The earlier pairwise theorem shows that the tail-boost strong auxiliary

```text
H=C*M(1)+h*M'(1)
```

is a sum of nonnegative pair terms except for

```text
-h*C*p_1*p_2*K_q(1,2).                                      (1)
```

For every `k>=8`, the four pair terms

```text
left:  (0,1), (0,3), (2,3),
right: (k-3,k-2)
```

pay (1).  Consequently `H>=0` uniformly in rank.  Combined with the earlier
all-rank nonnegativity of the tail quadratic, this closes the tail-boost
strong auxiliary under the stated forest-high gap conditions.

## Normalization

If `h=0`, (1) vanishes.  For `h>0`, divide every ratio by `h` and set `h=1`.
Every strong pair term acquires the same positive homogeneous factor, so this
does not change the desired sign.  Put

```text
r=k-2 >= 6,       C=A_2 >= r,       x=B_r > 2,
d=B_(r-1)-B_r-1 >= 0,
u=B_(r-2)-B_(r-1)-1 >= 0,
v=B_r-B_(r+1)-1 >= 0.
```

The bounds `C>=r` and `x>2` follow from positivity of the terminal ratios and
the remaining unit gaps.  For the local factorial ratios

```text
s_i=q_(i+1)/q_i=B_i/(i+1),
```

write

```text
a=s_(r-2)=(x+2+d+u)/(r-1),
b=s_(r-1)=(x+1+d)/r,
z=s_r    =x/(r+1),
e=s_(r+1)=(x-1-v)/(r+2).
```

The adverse kernel is

```text
K_q(1,2)=q_(r-1)q_r(b-z).                                  (2)
```

## The three left payments

Divide all four paying terms and the magnitude of (1) by the positive factor
`C*p_1*p_2*q_(r-1)q_r`.  The endpoint hypotheses give the following lower
bounds.

For `(0,1)`, its normalized coefficient is

```text
2(A_0-C-2)/(A_0(C+1)) >= 2/((C+1)(C+3)) = alpha.            (3)
```

For `(0,3)`, using `A_3<=C-1`, its normalized coefficient is at least

```text
(C+1)(A_0-C-2)/(3A_0) >= (C+1)/(3(C+3)) = eta.             (4)
```

For `(2,3)`, the moving-index correction leaves a bracket at least `C`, so
its normalized coefficient is at least

```text
p_3/p_1=C(C+1)/6 = beta.                                   (5)
```

The three normalized kernel contributions are therefore at least

```text
alpha*b*z*(z-e),
eta*z*(a-e)/a,
beta*(a-b)/(a*b).                                           (6)
```

## The matched right payment

For the right pair `(k-3,k-2)`, the two left-kernel indices are both `2`.
With

```text
p_2/p_1=(C+1)/2,       p_3/p_2=C/3,
```

its exact strong kernel is

```text
C*(p_2^2-p_3*p_1)-p_3*p_1 = C*p_2^2/3.
```

The right adjusted-ratio gap is exactly `d`.  Its normalized contribution is

```text
gamma*d,       gamma=(C+1)/6.                              (7)
```

Thus it is enough to prove

```text
E = alpha*b*z*(z-e)
    +eta*z*(a-e)/a
    +beta*(a-b)/(a*b)
    +gamma*d
    -(b-z) >= 0.                                            (8)
```

Both unused neighboring slacks help: differentiating (8) gives

```text
dE/du = [eta*z*e/a^2 + beta/a^2]/(r-1) >= 0,
dE/dv = [alpha*b*z + eta*z/a]/(r+2) >= 0.
```

It therefore suffices to set `u=v=0`.

## Central slack and the zero-slack core

After setting `u=v=0`, clear the positive denominator

```text
6*r*(C+1)*(C+3)*(r+1)^2*(r+2)*(d+x+1)*(d+x+2).             (9)
```

In the shifted nonnegative variables

```text
R=r-6,       S=C-r,       Y=x-2,
```

the numerator has degree three in `d`.  The coefficients of `d`, `d^2`, and
`d^3` respectively contain 90, 55, and 29 monomials in `R,S,Y`; every one of
their exact integer coefficients is strictly positive.  The complete ordered
coefficient lists are embedded in the exact report.  Their hashes are

```text
d^1: 518F964D0856902977C28F30D8DB766B74947C0D9627A66E52E533A20B11F1DC
d^2: 439A81DE8E960DE1143DD93CB53199BCC430579E89DEE0A8B2E850811065EC44
d^3: 266131E37151868275F32D63D6B1BE6BC56636351E0D77F189DEC9DC18DA073B
```

Hence only the constant coefficient `d=0` remains.

At `d=0`, divide (8) by

```text
b-z=(x+r+1)/(r(r+1)).
```

The relative contributions of `(0,1)`, `(2,3)`, and `(0,3)` are exactly

```text
P = 2x(x+1)/((C+1)(C+3)(r+1)(r+2)),
Q = C(C+1)r(r+1)/(6(x+1)(x+2)),
T = r(C+1)x/((C+3)(r+2)(x+2)).                             (10)
```

We need `P+Q+T>=1`.

If `2<x<=4`, then `C>=r>=6` gives

```text
Q >= 6*7*6*7/(6*5*6)=49/5>1.                              (11)
```

If `x>=4`, exact multiplication gives

```text
P*Q = (1/3)*[r/(r+2)]*[x/(x+2)]*[C/(C+3)] >= 1/9.
```

Therefore `P+Q>=2/3` by AM-GM.  Also

```text
T = [r/(r+2)]*[x/(x+2)]*[(C+1)/(C+3)] >= 7/18.
```

Thus

```text
P+Q+T >= 2/3+7/18=19/18>1.                                (12)
```

Equations (9)--(12) prove (8), so the four selected pair terms pay (1).

## Exact replay

The producer reconstructs every symbolic identity above, embeds the 174
positive shifted coefficients, and replays 128 exact rational cases through
ranks 8--20 with `h` from 1 through 4, including central-gap sizes up to
`h*10^4`.

```text
prove_uniform_low_high_matched_local_pair_payment_root.py
811166967CB5479619F766B638FEA94077E0A2A4E75211AFCF8E8CABE77FB07B

uniform_low_high_matched_local_pair_payment_exact_root_20260828.json
20278F5C3881A8066ECFAC21A87C3DAE9FBD662986EE074241F8EDE249DC3077
```

Producer status:

```text
PASS_EXACT_ANALYTIC_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT
```

## Scope

This closes the single-pair payment and therefore the tail-boost strong
auxiliary for `k>=8`.  It does not by itself establish the remaining low/low
convolution cone, the forest assembly, or Erdős Problem 993.
