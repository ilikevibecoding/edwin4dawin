# Boundary-SM3 `T_m` family: exact compensating identity

Date: 2026-08-13

Status update: the identities and binomial positivity below are all-order
exact.  The formerly open adjacent-coefficient inequality for `J_(m,q)` is
proved in `BOUNDARY_SM3_TM_FAMILY_ALL_ORDER_THEOREM_2026-08-13.md`.  Hence
Boundary-SM3 is proved for this full two-parameter family, but not for
arbitrary forests; Erdos Problem #993 remains open.

## 1. Independent replay of the route counterexample

Let `T_m` have a center joined to `m` support vertices, each support having
two leaves, and put

```text
A(x)=1+3x+x^2,       U(x)=1+x.
```

Splitting on the center gives

```text
I(T_m)=A^m+xU^(2m).                                  (1)
```

For `m=17`, let `F=T_17 union 3K_1`, add `p` adjacent to the center and all
three isolates, and finally add a leaf at `p`.  Then

```text
I(F)=A^17 U^3, plus xU^37 from the center-selected state,
    =A^17 U^3+xU^37,
I(H)=A^17,
beta=38,              r=25.
```

The graph-DP replay in
`verify_boundary_sm3_second_split_counterexample.py` was rerun.  Its labelled
forest/tree dynamic program agrees coefficient-for-coefficient with (1), and
again gives

```text
D_25(H)                         =   -107,372,408,
3f_26+f_25-f_24                 =   -339,459,400,
B=D_26(F)+D_25(F)+D_25(H)       = 57,086,629,816,
B-f_25                          =   -446,831,808.
```

Thus the second conditional split and the strong target `B>=f_r` are false.
The actual Boundary-SM3 margin is very positive.  This is a **route
counterexample**, not a Boundary-SM3 counterexample and not a nonunimodal
tree.

## 2. The full two-parameter family

Retain `m>=1` branches and let `q>=0` isolates of `F` also be adjacent to
`p`.  Then

```text
P=A^m,
C=A^m U^q,
X=xU^n,                 n=2m+q,
I(F)=C+X,
I(H)=P,
beta=n+1.
```

At an exceptional boundary `beta` is `1` or `2 mod 3`.  Equivalently, write

```text
n=3a+epsilon,           epsilon in {0,1}.
```

Then

```text
r=floor(2 beta/3),      n-r=a.                        (2)
```

For a polynomial `Y=sum y_k x^k`, set

```text
Q_r(Y)=D_(r+1)(Y)+D_r(Y)=3y_(r+1)+2y_r-y_(r-1).
```

The family boundary is

```text
B=Q_r(C)+Q_r(X)+D_r(P).                               (3)
```

## 3. Exact compensation

Both `C` and `P` are palindromic, of degrees `n` and `2m`.  Using (2),

```text
Q_r(C)=3c_(a-1)+2c_a-c_(a+1),
D_r(P)=3p_(a-q)-p_(a-q+1).                            (4)
```

The two terms in (4), which come from different graphs and can have opposite
signs, combine exactly:

```text
Q_r(C)+D_r(P)
 =[x^(a+1)] P {U^q(3x^2+2x-1)+x^q(3x-1)}
 =[x^(a+1)] P(3x-1){U^(q+1)+x^q}.                    (5)
```

The factorization uses

```text
3x^2+2x-1=(3x-1)(1+x).
```

Define the compensating polynomial

```text
J_(m,q)(x)=A(x)^m {U(x)^(q+1)+x^q}.
```

If `j_k=[x^k]J_(m,q)`, (5) becomes the particularly sharp adjacent-row
identity

```text
Q_r(C)+D_r(P)=3j_a-j_(a+1).                           (6)
```

This explains why separately demanding payment from `F` or `H` loses the
right structure: the closed-deleted deficit is absorbed before the remaining
center-selected binomial state is used.

For `X=xU^n`, symmetry of the binomial coefficients gives

```text
Q_r(X)=3 C(n,a)+2 C(n,a+1)-C(n,a+2).                 (7)
```

Moreover

```text
C(n,a+2)/C(n,a+1)=(2a+epsilon-1)/(a+2)<2,
```

so (7) is strictly positive in every admissible order.  Combining (3), (6),
and (7) yields the exact unsplit normal form

```text
B = 3j_a-j_(a+1)
    +3 C(n,a)+2 C(n,a+1)-C(n,a+2).                   (8)
```

Consequently the clean sufficient target for this entire family is now

```text
j_(a+1) <= 3j_a.                                     (9)
```

Unlike the refuted conditional split, (9) keeps the compensating `F/H`
combination intact.  The companion all-order theorem now proves it.

At the `m=17,q=3` witness the two summands of (8) are

```text
3j_12-j_13 = 50,511,333,028,
binomial term = 6,575,296,788,
```

which sum to the actual margin `57,086,629,816`.

## 4. Exact bounded audit

Run

```text
python analyze_boundary_sm3_tm_family.py
```

The default exact-integer scan covers

```text
1 <= m <= 300,       0 <= q <= 600,
120,200 admissible exceptional parameter pairs.
```

It asserts (6)--(8) at every pair.  The results are

```text
negative-D_r(H) pairs                              26,393
second conditional split failures                  2,999
strong single-target failures                      2,999
failures of 3j_a-j_(a+1) >= 0                          0
failures of the positive binomial term                 0
actual Boundary-SM3 failures                           0
```

The first route failure by order is exactly `m=17,q=3`, giving a 57-vertex
tree.  The smallest compensator margin in the scanned rectangle is `4`, at
`m=1,q=2`.  These are finite certificates and search evidence only; zero
failures do not prove (9) in all orders.

## 5. Artifacts

```text
72027D3836E6DB3FCE44B4D1689D666BE364F0DA0ADD8A502651F71075BA2CDB
  analyze_boundary_sm3_tm_family.py
F82B8890A5AA45683A83DA75853E790C11D13B9F829F7183D7B7A1F7A3799C31
  boundary_sm3_tm_family_exact_20260813.json
```

The companion theorem closes the all-order compensator sign.  Promotion is
justified at the scope of this `T_m` plus isolates family only.
