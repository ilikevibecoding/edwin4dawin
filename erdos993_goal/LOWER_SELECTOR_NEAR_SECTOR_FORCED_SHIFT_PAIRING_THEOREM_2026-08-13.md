# Forced near-sector selector ceiling by a one-step shift pairing

Date: 2026-08-13

Status: all-order theorem.  This closes the forced near-sector selector
ceiling and its quasi-Jacobi real-anchor orientation.  It does not prove the
separate rotating half-angle continuation.

## 1. Target and support

On the forced chart,

```text
s=2m+2a-3,       R=2m-6,       K=4m+a-e-4,
e in {1,2},      m>=7,          1<=a<=2m-2e-3.
```

Write

```text
c_h=[t^h]G_(N-2,s),       c_h^+=[t^h]G_(N-1,s),
T=floor(s/2)=m+a-2.
```

Then `c_h` starts at `h=a+2`, while `c_h^+` starts at `h=a+1`.  The
selector-ceiling target is

```text
K G_(N-2,s)(K)-G_(N-1,s)(K)>0.                    (1)
```

We prove the stronger coefficient pairing

```text
c_h^+ < K^2 c_(h+1),             a+1<=h<=T-2,     (2)
c_(T-1)^+ + K c_T^+ < K^2 c_T.                    (3)
```

Multiplying (2) by `K^h`, multiplying (3) by `K^(T-1)`, and summing
partitions every term of `K G_(N-2,s)(K)` and `G_(N-1,s)(K)`.  Hence
(2)--(3) imply (1) directly, without a sign-change or tail-payment lemma.

## 2. Elementary coefficient-ratio lemma

If

```text
F(x)=prod_(i=1)^n (1+lambda_i x)=sum_k f_k x^k,
lambda_i>=1,
```

then

```text
f_(k-1)/f_k <= k/(n-k+1).                          (4)
```

Indeed,

```text
sum_(|S|=k-1) lambda_S sum_(i notin S)lambda_i
```

is at least `(n-k+1)f_(k-1)` and equals `k f_k`.  Iterating (4), if
`x_0=k/(n-k+1)`, gives

```text
f_(k-r)/f_k <= x_0^r.                              (5)
```

Only the special case with every `lambda_i` equal to `1` or `2` is used
below.

## 3. Every interior pair

Fix `a+1<=h<=T-2` and put `j=s-2h`, so `j>=5`.  The positive response
formula gives, for

```text
F=(1+x)^(R+s-h-1)(1+2x)^(R-s+2h+2)=sum f_kx^k,
```

the exact identities

```text
c_h^+=binom(R+2,j)[x^h](1+x)^3F,
c_(h+1)=binom(R,j-2)f_(h+1).                       (6)
```

The number of linear factors in `F` is `2R+h+1`.  Thus (5), with

```text
x_0=(h+1)/(2R+1),
```

implies

```text
[x^h](1+x)^3F/f_(h+1) <=x_0(1+x_0)^3.             (7)
```

The chart bounds give `x_0<=4/5`.  Also

```text
binom(R+2,j)/binom(R,j-2)={(R+2)(R+1)}/{j(j-1)}.  (8)
```

Consequently

```text
c_h^+/c_(h+1)
 <5(R+2)(R+1)/{j(j-1)}
 <=(R+2)(R+1)/4<K^2,                               (9)
```

because `j>=5`, `R>=8`, and `K>=2R+7`.  This proves (2).

## 4. The final two-term block

Use the common polynomial

```text
F=(1+x)^(R+s-T)(1+2x)^(R-s+2T)=sum f_kx^k.
```

It has `2R+T` linear factors.  Directly from the response formula,

```text
c_T=R f_T,
c_(T-1)^+=binom(R+2,3)[x^(T-1)](1+x)^3F,
c_T^+=(R+2)[x^T](1+x)^2(1+2x)^2F.                 (10)
```

Set `x_1=T/(2R+1)`.  Since `a<=2m-2e-3`, one has `x_1<=5/6`.  Applying
(5) in (10) yields

```text
c_(T-1)^+/c_T
 <={(R+2)(R+1)/6} x_1(1+x_1)^3
 <(6/7)(R+2)(R+1),                                (11)

c_T^+/c_T
 <={(R+2)/R}(1+x_1)^2(1+2x_1)^2
 <30.                                              (12)
```

For `m>=11`, hence `R>=16`, `K>=2R+7` and

```text
K^2-(6/7)(R+2)(R+1)-30K
 >={22R^2-242R-1139}/7>0.                          (13)
```

Equations (11)--(13) prove (3) for every `m>=11`.  The remaining ranks
`m=7,8,9,10` contain exactly 88 admissible `(e,m,a)` cells.  Exact integer
evaluation verifies (2)--(3) in every one; this is an exhaustive finite base
of the all-order argument, not an extrapolating scan.

## 5. Consequence

The shift pairing proves (1) for both forced chart families in every order.
By the already-proved selector Turan identity, both positive selector roots
are below `K=N_D-1`.  The quasi-Jacobi theorem therefore gives the required
positive-root orientation at the real anchor throughout the complete forced
near-sector chart.

Together with the three unforced theorems, the near-sector selector ceiling
and real-anchor orientation are now proved in all orders on every chart.
The remaining near-sector obligation is the rotating half-angle
continuation from that anchor.

The companion replay is
`prove_lower_selector_near_sector_forced_shift_pairing.py`.

