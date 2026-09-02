#!/usr/bin/env python3
"""Verify the consecutive pointed-reserve recurrence for leaf addition."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", positive=True)
k = r + 1
u, w, z = sp.symbols("u w z", positive=True)
rho_m, rho, rho_p = sp.symbols(
    "rho_m rho rho_p", nonnegative=True
)

# Normalize b_(r-1)=1 and reconstruct three following coefficients of
# B from its consecutive extension means u,w,z.
bm = sp.Integer(1)
b = u / r
bp = w * b / k
bpp = z * bp / (k + 1)

# H counts root-containing sets.  Leaf addition uses C=B-H and
# A=B+xC.
a = b + bm * (1 - rho_m)
ap = bp + b * (1 - rho)
app = bpp + bp * (1 - rho_p)
v = sp.factor(k * ap / a)
y = sp.factor((k + 1) * app / ap)

reserve = r + u**2 - u * w
reserve_next = k + w**2 - w * z
burden = r * (u + 1) * rho_m - k * u * rho
burden_next = k * (w + 1) * rho - (k + 1) * w * rho_p
pointed = reserve - burden
pointed_next = reserve_next - burden_next
denominator = u + r * (1 - rho_m)
denominator_next = w + k * (1 - rho)

drift = sp.factor(u + 1 - v)
drift_next = sp.factor(w + 1 - y)
assert sp.factor(drift - pointed / denominator) == 0
assert sp.factor(
    drift_next - pointed_next / denominator_next
) == 0

q_f = 1 + u - w
q_t = 1 + v - y
reserve_t = k - v + v * q_t
assert sp.factor(q_t - (q_f - drift + drift_next)) == 0
assert sp.factor(
    reserve_t
    - (
        k
        + v * (q_f - 1 - drift)
        + v * pointed_next / denominator_next
    )
) == 0

# Exact pointed-reserve threshold equivalent to the strong cascade.
epsilon = sp.symbols("epsilon", nonnegative=True)
cascade_margin = (
    2 * k * reserve_t
    - r * v * reserve / u
    - (r + 2 + r**2 / u) * drift
    - 2 * k * r * epsilon
)
threshold = sp.factor(
    denominator_next
    / (2 * k * v)
    * (
        r * v * reserve / u
        + (r + 2 + r**2 / u) * drift
        + 2 * k * r * epsilon
        - 2 * k * (k + v * (q_f - 1 - drift))
    )
)
assert sp.factor(
    cascade_margin
    - 2
    * k
    * v
    / denominator_next
    * (pointed_next - threshold)
) == 0

print("terminal pointed-reserve recurrence: PASS")
print("d_r = (R_r-B_r)/(u+r(1-rho_(r-1)))")
print("q_T = q_F-d_r+d_(r+1)")
print("strong cascade iff next pointed reserve >= exact threshold")
