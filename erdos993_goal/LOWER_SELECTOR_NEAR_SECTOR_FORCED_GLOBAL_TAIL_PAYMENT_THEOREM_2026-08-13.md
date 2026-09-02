# Forced near-sector global-tail payment

Date: 2026-08-13

Status: all-order theorem.  The weighted positive part of the forced
response is larger than its weighted negative part in every admissible
forced near-sector cell.  This proves the global-tail alternative left open
in `LOWER_SELECTOR_NEAR_SECTOR_FORCED_SUPPORT_EDGE_REDUCTION_2026-08-13.md`.
It does not assert the stronger first-two-positive-terms inequality or an
all-order one-sign-change theorem.

## 1. Statement

On the forced chart, let

```text
s=2m+2a-3,       R=2m-6,       K=4m+a-e-4,
e in {1,2},      m>=7,          1<=a<=2m-2e-3,
T=floor(s/2)=m+a-2.                                      (1)
```

Write

```text
c_h=[t^h]G_(N-2,s),       c_h^+=[t^h]G_(N-1,s),
d_h=Kc_h-c_h^+,           q_h=d_hK^h.                   (2)
```

The old support starts at `h=a+2`, while the shifted support starts at
`h=a+1`.  Define the exact weighted debt and credit

```text
H=sum_(q_h<0)(-q_h),       P=sum_(q_h>0)q_h.             (3)
```

Then, in every cell (1),

```text
P>H.                                                        (4)
```

No hypothesis about the number or location of sign changes is needed.

## 2. Shift pairing

The elementary coefficient-ratio lemma for

```text
F(x)=product_(i=1)^n(1+lambda_i x)=sum_k f_kx^k,
lambda_i>=1,
```

is

```text
f_(k-1)/f_k <= k/(n-k+1).                              (5)
```

Indeed, double-counting pairs consisting of a weighted `(k-1)`-subset and
one omitted element gives

```text
(n-k+1)f_(k-1)
 <=sum_(|S|=k-1)lambda_S sum_(i notin S)lambda_i
 =k f_k.
```

Applied to the positive coefficient formula for the response rows, (5)
gives the forced shift-pairing inequalities

```text
c_h^+<K^2c_(h+1),                 a+1<=h<=T-2,       (6)
c_(T-1)^+ + Kc_T^+<K^2c_T.                            (7)
```

For completeness, the all-order bounds behind (6) are

```text
c_h^+/c_(h+1)
 <5(R+2)(R+1)/{j(j-1)}
 <=(R+2)(R+1)/4<K^2,
j=s-2h>=5,
```

using `K>=2R+7`.  For (7), the same ratio lemma gives

```text
c_(T-1)^+/c_T <(6/7)(R+2)(R+1),
c_T^+/c_T<30.                                         (8)
```

When `m>=11`, hence `R>=16`,

```text
K^2-(6/7)(R+2)(R+1)-30K
 >={22R^2-242R-1139}/7>0;                            (9)
```

the numerator is `621` at `R=16` and is increasing thereafter.  The
remaining `m=7,8,9,10` comprise exactly 88 admissible cells, and direct
integer evaluation of (6)--(7) is an exhaustive base joined to (9), not an
extrapolating scan.

## 3. Exact partition and payment

Multiply (6) by `K^h` and sum from `h=a+1` to `T-2`.  Multiply (7) by
`K^(T-1)`.  The left sides then contain, exactly once, every term
`c_h^+K^h`, `a+1<=h<=T`.  The right sides contain, exactly once, every term
`c_hK^(h+1)`, `a+2<=h<=T`.  Therefore

```text
G_(N-1,s)(K)<K G_(N-2,s)(K),                        (10)
sum_(h=a+1)^T q_h>0.                                (11)
```

By (3), the left side of (11) is exactly `P-H`.  Hence (11) is equivalent
to (4), proving the all-order global-tail payment lemma.

This argument absorbs the initial negative birth and both uncompensated
support-edge births globally.  It does not need to assign either edge birth
to a particular later positive coefficient.

## 4. Scope

The first-positive-only payment is already known to be false at
`(e,m,a)=(2,25,22)`.  The bounded observation that the first two positive
terms always pay remains a possible strengthening, but it is no longer a
gap for the forced selector ceiling: (4) is the requested global-tail
alternative in every order.

The companion exact replay is
`prove_lower_selector_near_sector_forced_global_tail_payment.py`; it writes
`lower_selector_near_sector_forced_global_tail_payment_exact_20260813.json`.

