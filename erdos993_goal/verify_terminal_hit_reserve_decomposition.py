#!/usr/bin/env python3
"""Verify the exact hit-probability decomposition of terminal drift."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", positive=True)
k = r + 1
bm, b, bp = sp.symbols("bm b bp", positive=True)
hm, h = sp.symbols("hm h", nonnegative=True)

# B=I(F) and C=I(F-N_F(p)); H=B-C counts independent sets that hit
# N_F(p).  The terminal deletion polynomial is A=B+xC.
cm = bm - hm
c = b - h
a = b + cm
ap = bp + c

u = r * b / bm
v = k * ap / a
drift = u + 1 - v
cleared_drift = sp.factor(drift * bm * a)

coefficient_reserve = r * b**2 + bm**2 - k * bm * bp
hit_decomposition = (
    coefficient_reserve
    + k * bm * h
    - (r * b + bm) * hm
)
assert sp.expand(cleared_drift - hit_decomposition) == 0

# Normalize by bm*b.  If rho_j=H_j/B_j and
# R=r*coefficient_reserve/bm^2, terminal drift is equivalent to
# R+k*u*rho_r >= r*(u+1)*rho_(r-1).
rho_m, rho = sp.symbols("rho_m rho", nonnegative=True)
normalized_reserve = r * coefficient_reserve / bm**2
normalized = (
    normalized_reserve + k * u * rho - r * (u + 1) * rho_m
)
substituted = sp.factor(
    normalized.subs({rho: h / b, rho_m: hm / bm})
)
assert sp.factor(
    substituted - u * hit_decomposition / (bm * b)
) == 0

print("terminal hit-reserve decomposition: PASS")
print("cleared drift =", hit_decomposition)
print(
    "normalized target: R + (r+1)u*rho_r "
    ">= r(u+1)rho_(r-1)"
)
