# Permanent-isolate shift for the terminal payment

Date: 2026-08-29

Status: **exact algebraic identity.**

Let the untruncated terminal payment for a base `G` be

```text
Phi_G(t)=sum_(k>=0) d_k C(t-1,k).
```

A permanent isolated vertex is indistinguishable from one additional vertex
in the terminal `t`-isolate family.  Therefore

```text
Phi_(G disjoint_union z K1)(t)=Phi_G(t+z).
```

Vandermonde's identity gives

```text
d'_m = sum_(k>=m) C(z,k-m)d_k.                     (1)
```

In particular, for one permanent isolate,

```text
d'_1=d_1+d_2.                                      (2)
```

Consequently, once degrees 1 and 2 are nonnegative for a base, adjoining one
permanent isolate preserves degree 1.  Iteration handles any number of
isolated components, using the all-forest degree-2 theorem after every step.

This identity does not prove degree 1 for bases without isolated components,
the complete terminal payment, unimodality, or Erdos Problem 993.

Exact replay:

```powershell
python .\verify_terminal_payment_permanent_isolate_shift_agent.py
```
