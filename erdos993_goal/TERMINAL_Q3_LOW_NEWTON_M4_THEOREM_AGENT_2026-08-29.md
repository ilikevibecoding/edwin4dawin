# Terminal q3 payment: exact Newton-degree-4 theorem

Date: 2026-08-29

Status: exact proof for tree bases of order `n>=15` of the `m=4`
Newton coefficient inside the pinned, normalized, untruncated terminal-payment
framework.  This note does not prove `m=0,1,2,3`, forest-base closure, the
whole terminal payment, unimodality, or Erdős Problem 993.

## Statement and notation

Let `G` be a tree of order `n>=15`, let `w` be its marked vertex, and put
`F=G-w` and `N=|F|=n-1`.  Fix a supported target `j>=3`; thus `N>=j` and
`b=f_j(F)>0`.  Put `a=f_2(F)` and `s=t-1`.  In the notation of the pinned
terminal split,

```text
delta=(j+1)a*A*U+L,             L=a*P*Q,
Q=(j+1)b(c+R)-3(P+a)e.
```

All coefficients below are Newton coefficients in the basis `binom(s,m)`.
Then `delta_4>=0`.

The Newton product kernel is

```text
kappa(p,q;m)=m!/((m-p)!(m-q)!(p+q-m)!)              (1)
```

when `max(p,q)<=m<=p+q`, and is zero otherwise.

## 1. The exact negative remainder

Write `e_0=z_j+h_j+b` and `p_0=P_0`.  Pascal expansion gives

```text
P_1=(N^2+N+2)/2,       P_2=N+2,       P_3=1.        (2)
```

The nonnegative first summand `(j+1)b(c+R)` may be discarded wherever it
occurs in `Q_1` or `Q_2`.  Direct Newton multiplication then gives the valid
lower coefficients

```text
Q_1 >= -3[e_0 P_1+b(p_0+a+P_1)],
Q_2 >= -3e_0 P_2-6b(P_1+P_2),
Q_3  = -3[e_0+3b(P_2+1)],
Q_4  = -12b.                                          (3)
```

Substituting (2)--(3) into (1), and summing every pair which can have union
degree four, yields

```text
[P Q]_4 >= -6[
    6N^3 b+56N^2 b+5N^2 e_0+194N b+26N e_0
    +2ab+4bp_0+294b+46e_0].                           (4)
```

The unconditional one-edge incidence lemma from the degree-six theorem says
`z_j<=j b`.  Since `H` is induced in `F`, `h_j<=b`, and therefore

```text
e_0<= (j+2)b.                                         (5)
```

Also, `a<=binom(N,2)`.  Finally, `p_0=i_3(G)+i_2(G)` counts a subset of all
three-sets in `G union K1`, so

```text
p_0<=binom(N+2,3).                                    (6)
```

Every occurrence of (5)--(6) and of `a` on the right side of (4) has a
negative sign.  Hence replacing them by their upper bounds preserves a lower
bound.  Exact simplification gives

```text
L_4=a[P Q]_4 >= -2ab Q_4^*,                           (7)

Q_4^* = 20N^3+15N^2j+207N^2+78Nj
        +739N+138j+1158.
```

## 2. A retained positive anchor payment

The pinned anchor theorem gives

```text
A_2>=a(N^2+3N+8),       A_3>=a(3N+10),       A_4=4a. (8)
```

Every Newton coefficient of `A` and `U` is nonnegative.  We retain only the
following kernels in `[A U]_4`:

```text
from A_2:  6U_2+12U_3+6U_4,
from A_3:  4U_1+12U_2+12U_3+4U_4,
from A_4:  U_0+4U_1+6U_2+4U_3+U_4.                  (9)
```

These weights are the corresponding values of (1).  Containment shadows and
the two immediate coefficients give

```text
U_0/b>=1,     U_1/b>=1,
U_2/b>=j/(r+1),
U_3/b>=j(j-1)/((r+1)(r+2)),
U_4/b>=j(j-1)(j-2)/((r+1)(r+2)(r+3)),               (10)
```

where `r=N-j>=0`.  Because `F` is a forest,

```text
a=f_2(F)>=binom(N-1,2).                              (11)
```

Let `E_4` denote the result of inserting (8) and (10) into (9), after
dividing by `ab`.  Explicitly,

```text
E_4=(N^2+3N+8)(6R_2+12R_3+6R_4)
   +(3N+10)(4+12R_2+12R_3+4R_4)
   +4(5+6R_2+4R_3+R_4),                             (12)
```

with `R_2,R_3,R_4` equal to the last three ratios in (10).  Equations
(8)--(12) imply

```text
(j+1)a[A U]_4 >= (j+1)a^2 b E_4.                    (13)
```

## 3. Exact positivity on the whole integer cone

By (7), (11), and (13), it is enough to prove

```text
(j+1)binom(N-1,2)E_4 - 2Q_4^* >= 0.                 (14)
```

Set `j=3+k` and `N=j+r`, so `k,r>=0`.  The hypothesis `N>=14` is exactly
`k+r>=11`.  Clearing the positive denominator in (14) produces

```text
(r+1)(r+2)(r+3).                                    (15)
```

The integer cone is covered without interpolation as follows.

* On `r=11+q`, `k,q>=0`, the cleared numerator has 42 monomials.  Every
  coefficient is a positive integer; the minimum coefficient is `3`.
* For each `r=0,1,...,10`, write `k=11-r+q`, `q>=0`.  The resulting
  one-variable polynomial has degree eight and every coefficient is a
  positive integer; the minimum coefficient in every strip is `3`.

Thus (14) holds throughout `N>=14`, `N>=j>=3`.  Combining (7), (13), and
(14) proves `delta_4>=0`.

## Exact replay and scope

`prove_terminal_q3_low_newton_m4_agent.py` reconstructs (1)--(14) in exact
SymPy arithmetic, asserts every kernel, verifies the symbolic identity (4),
checks the substitution leading to (7), and audits all 12 pieces of the
integer-cone cover coefficient by coefficient.  It pins the upstream tail,
anchor, and unconditional incidence certificates before doing any algebra.

At freeze time:

```text
source SHA-256:
1F1413450B5DF1C43EC3CDA8BC431431895FB17CF0B5CBC91ADFA7703D749A3B

report SHA-256:
59C5AA65CAC57E274A6E3B64B3A43515016790376A1FC97FC65527D353A90989

status:
PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M4
```
