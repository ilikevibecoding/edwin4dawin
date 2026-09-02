#!/usr/bin/env python3
"""Verify the ISO-reserve reformulation of terminal compensation."""

from __future__ import annotations

import sympy as sp


r, u, v, w, y = sp.symbols(
    "r u v w y", positive=True, finite=True
)
k = r + 1
q_t = 1 + v - y
q_f = 1 + u - w
h = 2 * k * q_t - r * q_f

# The normalized reserve belonging to
#
#   j p_j^2 + p_(j-1)^2 - (j+1) p_(j-1) p_(j+1)
#
# is j - mu + mu*q, where mu is the extension mean and q is the
# normalized GSB curvature.
reserve_t = k - v + v * q_t
reserve_f = r - u + u * q_f

base = (r + 2) * v - 2 * k**2 + r**2 * v / u
cascade = 2 * k * reserve_t - r * v * reserve_f / u

assert sp.simplify(v * h - base - cascade) == 0

d = u + 1 - v
base_factored = (
    (u - r) * (r * u - r + 2 * u) / u
    - (r + 2 + r**2 / u) * d
)
assert sp.simplify(base - base_factored) == 0

# Consequently, when u >= r and d >= 0, the displayed strong reserve
# cascade below implies
#
#   v H >= 2 k r epsilon.
epsilon = sp.symbols("epsilon", nonnegative=True, finite=True)
strong_residual = sp.expand(
    cascade
    - (r + 2 + r**2 / u) * d
    - 2 * k * r * epsilon
)
conclusion_residual = sp.simplify(
    v * h - 2 * k * r * epsilon - strong_residual
)
expected_nonnegative_remainder = (
    (u - r) * (r * u - r + 2 * u) / u
)
assert (
    sp.simplify(
        conclusion_residual - expected_nonnegative_remainder
    )
    == 0
)

print("terminal ISO-reserve cascade reduction: PASS")
