# Terminal q3 payment: exact Newton-degree-4 theorem

Date: 2026-08-29

Status: exact all-order proof/audit of the `m=4` Newton coefficient, obtained
from a symbolic large-order proof and the pinned finite all-real-`t` base.

Put `N=|F|`, `a=f_2(F)`, and `b=f_j(F)`.  Reconstructing every Newton kernel
in `L=aPQ`, dropping only positive pieces of `Q_1,...,Q_4`, and using

```text
e_0 <= (j+2)b,       P_0 <= binom(N+2,3),       a <= binom(N,2)
```

gives

```text
L_4 >= -2ab Q4,
Q4=20N^3+15N^2j+207N^2+78Nj+739N+138j+1158.    (1)
```

The positive anchor coefficients obey

```text
A_2 >= a(N^2+3N+8),
A_3 >= a(3N+10),
A_4 = 4a.                                           (2)
```

Retain the twelve Newton kernels from these anchor degrees to `U_0,...,U_4`,
use `U_0,U_1>=b`, the three ordinary containment shadows, and
`a>=binom(N-1,2)`.  The remaining sufficient inequality is

```text
(j+1)aE4 >= 2Q4.                                    (3)
```

Write `j=3+k`, `N=j+r`.  After clearing the positive denominator
`(r+1)(r+2)(r+3)`, exact expansion proves (3) throughout `N>=14` as follows:

- for `r>=11`, substitute `r=11+q`; all 42 bivariate coefficients in `k,q`
  are positive, with minimum coefficient `3`;
- for each `0<=r<=10`, the condition `N>=14` is `k>=11-r`; substituting
  `k=11-r+q` gives a nine-term polynomial in `q`, every coefficient positive
  (again minimum `3`).

Thus the symbolic proof covers `N>=14`, equivalently base-tree order
`|G|>=15`.  The pinned finite certificate covers every `|G|<=14` and every
real `t>=1` with nonnegative ordinary power coefficients.  Since

```text
s^k = sum_m m! S(k,m) binom(s,m)
```

has nonnegative coefficients, that finite certificate also proves its
Newton coefficient `m=4`.  The two ranges cover every order.

Independent replay:

- `audit_terminal_q3_low_newton_m4_large_order_agent.py`
- `terminal_q3_low_newton_m4_all_order_independent_audit_20260829.json`
- status `PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M4_AUDIT`

This closes only Newton degree 4, not degrees 0 through 3 or Erdős Problem
993.

