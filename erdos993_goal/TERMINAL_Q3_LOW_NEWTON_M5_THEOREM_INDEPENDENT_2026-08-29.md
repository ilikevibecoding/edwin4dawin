# Terminal q3 payment: exact Newton-degree-5 theorem

Date: 2026-08-29

Status: exact all-order proof/audit of the `m=5` Newton coefficient.  The
formerly conditional estimate `q_j(F)<=1` is unconditional by the forest
incidence theorem used in the degree-6 proof.

Put `N=|F|`, `a=f_2(F)`, and `b=f_j(F)`.  Exact Newton multiplication in

```text
delta=(j+1)a*A*U+L,       L=a*P*Q
```

and deletion of the sole positive contribution in the low remainder give

```text
L_5 >= -30ab P5,
P5=5N^2+2Nj+40N+7j+95.                              (1)
```

Here the unconditional incidence bound gives `e_0<=(j+2)b`.  The anchor
coefficients satisfy

```text
A_2 >= a(N^2+3N+8),
A_3 >= a(3N+10),
A_4 = 4a.                                           (2)
```

Retaining the nine positive Newton kernels with anchor degree two through
four and using the ordinary containment shadows for `U_1,...,U_4` gives a
sufficient inequality `(j+1)aE>=30P5`.  Set `j=3+k`, `N=j+r`.  Its positive
denominator is `(r+1)(r+2)(r+3)`; the numerator is

```text
10k^8 +45k^7r +280k^7 +80k^6r^2 +1105k^6r +3460k^6
+70k^5r^3 +1695k^5r^2 +11760k^5r +23980k^5
+30k^4r^4 +1255k^4r^3 +15190k^4r^2 +69090k^4r +100720k^4
+5k^3r^5 +445k^3r^4 +9185k^3r^3 +72980k^3r^2 +239335k^3r +260980k^3
+60k^2r^5 +2540k^2r^4 +33915k^2r^3 +195220k^2r^2 +482875k^2r +403650k^2
+245kr^5 +6235kr^4 +59105kr^3 +258785kr^2 +497270kr +324240k
+190r^5 +3360r^4 +23680r^3 +81660r^2 +123730r +62580.
```

All 39 coefficients are positive (the smallest is `5`).  Thus (1)--(2)
prove `delta_5>=0` for all supported `N>=j>=3`.

Independent replay:

- `audit_terminal_q3_low_newton_m5_conditional_agent.py`
- `terminal_q3_low_newton_m5_independent_audit_20260829.json`
- status `PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M5_AUDIT`

This closes only Newton degree 5, not the lower degrees or Erdős Problem 993.

