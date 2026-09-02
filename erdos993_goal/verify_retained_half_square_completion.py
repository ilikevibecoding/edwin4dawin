#!/usr/bin/env python3
"""Verify the square completion behind the blocked-reserve split."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", real=True)
a, p_k, u, p = sp.symbols("a p_k u p", real=True)
local_raw, adjustment, drift_factor = sp.symbols(
    "local_raw adjustment drift_factor", real=True
)

# Pointwise completed-square integrand.
phi = (
    local_raw
    - adjustment
    + 2 * (r - 2) * drift_factor
    + 2 * r**2 * (p_k - p) ** 2
    - 2 * (a - u - r * (p_k - p)) ** 2
)

# On averaging, E[a]=u and E[p_k]=p.  Expand the nonlocal part and
# replace centered first moments by zero.
expanded = sp.expand(
    phi
    - (local_raw - adjustment)
    - 2 * (r - 2) * drift_factor
)

aa, pp, ap = sp.symbols("aa pp ap", real=True)
moments = {
    (0, 0): 1,
    (1, 0): u,
    (0, 1): p,
    (2, 0): aa,
    (0, 2): pp,
    (1, 1): ap,
}
averaged = sum(
    coefficient * moments[monomial]
    for monomial, coefficient in sp.Poly(
        expanded, a, p_k
    ).terms()
)

variance_a = aa - u**2
variance_p = pp - p**2
covariance_ap = ap - u * p

assert sp.expand(
    averaged
    - (
        -2 * variance_a
        + 4 * r * covariance_ap
    )
) == 0

print("retained-half square completion: PASS")
print(
    "E[Phi_K] = E[M2_raw-J+2(r-2)D]"
    " -2 Var(A) +4r Cov(A,p)"
)
