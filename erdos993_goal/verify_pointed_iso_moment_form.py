#!/usr/bin/env python3
"""Verify the exact moment form of the pointed ISO half-reserve."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", positive=True)
bm, b, bp = sp.symbols("bm b bp", positive=True)
hm, h = sp.symbols("hm h", nonnegative=True)

# Consecutive extension means and normalized ISO reserve.
u = r * b / bm
w = (r + 1) * bp / b
coefficient_reserve = (
    r * b**2 + bm**2 - (r + 1) * bm * bp
)
reserve = r * coefficient_reserve / bm**2
assert sp.factor(reserve - (r + u**2 - u * w)) == 0

rho_m_symbol, rho_symbol = sp.symbols(
    "rho_m_symbol rho_symbol", nonnegative=True
)
rho_m = hm / bm
rho = h / b
burden_rho = (
    r * (u + 1) * rho_m_symbol
    - (r + 1) * u * rho_symbol
)
burden = burden_rho.subs(
    {rho_m_symbol: rho_m, rho_symbol: rho}
)
pointed_coefficient = (
    coefficient_reserve
    + 2 * (r + 1) * bm * h
    - 2 * (r * b + bm) * hm
)
assert sp.factor(
    reserve - 2 * burden
    - r * pointed_coefficient / bm**2
) == 0

# Uniform independent (r-1)-set moment notation:
# e = number of residual vertices,
# q = number of residual edges,
# Y = indicator that the set hits W,
# X = 1-Y,
# L = number of addable vertices in W.
variance_e, mean_q = sp.symbols(
    "variance_e mean_q", nonnegative=True
)
p, covariance, mean_xl = sp.symbols(
    "p covariance mean_xl", real=True
)

reserve_moment = r + u + 2 * mean_q - variance_e
burden_moment = (
    (r - u) * p
    - (r + 1) * covariance
    - (r + 1) * mean_xl
)

# Double counting gives
# u*rho_r = E[Y e] + E[X L] = p*u + Cov(Y,e) + E[X L].
rho_from_moments = (
    p * u + covariance + mean_xl
) / u
assert sp.expand(
    burden_rho.subs(
        {
            rho_m_symbol: p,
            rho_symbol: rho_from_moments,
        }
    )
    - burden_moment
) == 0

# Completing the square with g=e-(r+1)Y.
variance_g = (
    variance_e
    + (r + 1) ** 2 * p * (1 - p)
    - 2 * (r + 1) * covariance
)
pointed_moment = sp.expand(reserve_moment - 2 * burden_moment)
completed_square_rhs = (
    r
    + u
    + 2 * mean_q
    - 2 * (r - u) * p
    + 2 * (r + 1) * mean_xl
    + (r + 1) ** 2 * p * (1 - p)
)
assert sp.expand(
    pointed_moment - (completed_square_rhs - variance_g)
) == 0

print("pointed ISO moment form: PASS")
print(
    "burden = (r-u)E[Y]-(r+1)Cov(Y,e)"
    "-(r+1)E[(1-Y)L]"
)
print(
    "R-2B = RHS-Var(e-(r+1)Y), with "
    "RHS=r+u+2E[q]-2(r-u)E[Y]"
    "+2(r+1)E[(1-Y)L]+(r+1)^2 Var(Y)"
)
