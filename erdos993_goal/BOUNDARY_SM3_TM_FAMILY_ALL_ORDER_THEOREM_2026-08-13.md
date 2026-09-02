# Boundary-SM3 `T_m` family: all-order compensator theorem

Date: 2026-08-13

Status: **all-order theorem for the full `T_m` plus isolates adversarial family.**
This closes the remaining inequality in the compensating-identity note. It does
not prove Boundary-SM3 for arbitrary forests or Erdos Problem #993.

## Theorem

Put `A=1+3x+x^2`,

```text
J_(m,q)=A^m((1+x)^(q+1)+x^q),
2m+q=3a+epsilon,   epsilon in {0,1}.
```

For every `m>=1` and `q>=0`,

```text
[x^(a+1)]J_(m,q) <= 3[x^a]J_(m,q).                 (1)
```

Consequently the preceding exact identity gives

```text
B >= 3*C(2m+q,a)+2*C(2m+q,a+1)-C(2m+q,a+2) > 0,
```

so Boundary-SM3 holds for this entire family.

## 1. Log-concavity and the tilted mode

Write `J=sum j_k x^k` and set `b_k=j_k/3^k`. Then (1) is
`b_(a+1)<=b_a`.

The coefficient row of `K_q=(1+x)^(q+1)+x^q` is binomial except that its
rank-`q` entry is `q+2`. Only the two adjacent log-concavity inequalities
change. For `q>=2`, the nontrivial excesses are positive; in particular,

```text
(q(q+1)/2)^2-C(q+1,3)(q+2)
 =q(q+1)(q^2+q+4)/12 > 0,
(q+2)^2-q(q+1)/2 > 0.
```

Cases `q=0,1` are immediate. Thus `K_q` is log-concave without internal
zeros. The row of `A^m` is PF, and convolution preserves log-concavity, so
the tilted row `(b_k)` is unimodal.

Normalize `(b_k)` to a probability law `S`. We use this lattice mean-mode
lemma: if a unimodal integer law has mean `mu`, variance `sigma^2`, and mode
`M`, then

```text
|mu-M| <= sqrt(3(sigma^2+1/12)).                    (2)
```

Proof: spread each atom uniformly over its unit cell. The resulting unimodal
density has unchanged mean and variance `sigma^2+1/12`. After translating a
mode to zero, its layer-cake/Khintchine representation is `X=UY`, with `U`
uniform on `[0,1]` and independent of `Y`. Hence

```text
Var(X)=E(Y^2)/3-E(Y)^2/4 >= E(Y)^2/12=(E X)^2/3.
```

This proves (2).

## 2. Exact moments

At `x=1/3`, the two summands of `J` form a mixture. The second-component
weight is

```text
w=3/(4^(q+1)+3).                                    (3)
```

One `A` factor has tilted mean `11/19` and variance `126/361`; a tilted
`1+x` factor is Bernoulli with mean `1/4` and variance `3/16`. Therefore

```text
mu =11m/19 +(1-w)(q+1)/4+wq,
sigma^2=126m/361 +(1-w)3(q+1)/16
        +w(1-w)(3q-1)^2/16.                         (4)
```

Since `a=(2m+q-epsilon)/3`,

```text
a-mu=5m/57+q/12-epsilon/3-1/4-w(3q-1)/4.           (5)
```

The exact uniform bounds are

```text
w(3q-1)/4 <= 3/38,
w(1-w)(3q-1)^2/16 <= 300/4489 < 1/14.              (6)
```

The maxima occur at `q=1` and `q=2`. Put `D_q=4^(q+1)+3`. For `q>=3`,
`D_q/D_(q+1)<1/3` and `(3q+2)/(3q-1)<=11/8`. Hence the successive mean and
variance correction ratios are less than `11/24` and
`4(11/8)^2/9=121/144`, respectively. Both are below one; `q=0,1,2` are
direct. Thus, using `epsilon<=1`,

```text
delta:=a-mu >= L:=5m/57+q/12-151/228,
sigma^2+1/12 <= V:=126m/361+3(q+1)/16+1/14+1/12.   (7)
```

## 3. Infinite tail and finite endpoint

If `L>=0` and `L^2>=3V`, (2) rules out every mode `M>=a+1`, proving (1).
The complement of

```text
1 <= m <= 151,       0 <= q <= 97                  (8)
```

is certified by two rational corners. At `(152,0)`,

```text
L=963/76,  L^2-3V=3749/10108,
d(L^2-3V)/dm=849/722,  d(L^2-3V)/dq=471/304.
```

At `(1,98)`,

```text
L=577/76,  L^2-3V=8919/20216,
d(L^2-3V)/dm=617/2166,  d(L^2-3V)/dq=641/912.
```

All are positive, and both derivatives increase with `m,q`, proving the
whole infinite tail. The residual rectangle has exactly `9,865` admissible
pairs. Exact integer multiplication finds zero failures; the minimum margin
is `4` at `(m,q,a)=(1,2,1)`. This is a finite endpoint of an analytic proof,
not a bounded scan standing in for an all-order result.

## 4. Replay

Run `python verify_boundary_sm3_tm_family_all_order.py`. It checks the rational
tail corners, mixture maxima, and all finite endpoint cases, and writes
`boundary_sm3_tm_family_all_order_exact_20260813.json`.
