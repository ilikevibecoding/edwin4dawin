#!/usr/bin/env python3
"""Verify the exact ISO-reserve recurrence after adding an isolated vertex."""

from __future__ import annotations

import sympy as sp


r, u, w, h = sp.symbols(
    "r u w h", positive=True, finite=True
)
k = r + 1

# Consecutive extension means of B are u,w,h.  The two consecutive ISO
# reserves are R=R_r(B) and R_next=R_(r+1)(B).
reserve = r + u**2 - u * w
reserve_next = k + w**2 - w * h

# If T=(1+x)B, binomial convolution gives these exact transformed
# extension means.
v = u * (k + w) / (u + r)
y = w * (k + 1 + h) / (k + w)

q_t = 1 + v - y
reserve_t = k - v + v * q_t
drift = u + 1 - v

assert sp.factor(drift - reserve / (u + r)) == 0
assert sp.factor(
    y - (w + 1 - reserve_next / (k + w))
) == 0

recurrence = (
    u * reserve_next / (u + r)
    + (u - r) / u
    + r * (u + 2) * reserve / (u * (u + r))
    - r * reserve**2 / (u * (u + r) ** 2)
)
assert sp.factor(reserve_t - recurrence) == 0

q_f = 1 + u - w
likelihood_gap = sp.factor(w - v)
assert sp.factor(
    likelihood_gap + (u - r + r * q_f) / (u + r)
) == 0

# In the branch u>=r and q_f>=0, the likelihood-deficit term vanishes.
# The strong reserve-cascade margin therefore clears to the polynomial
# below.
strong_margin = (
    2 * k * reserve_t
    - r * v * reserve / u
    - (r + 2 + r**2 / u) * drift
)
cleared = sp.factor(strong_margin * u * (u + r) ** 2)
expected = (
    r * (u - r - 2) * reserve**2
    + (u + r)
    * (r**2 * u + 2 * r**2 - r * u**2 + 4 * r - 2 * u)
    * reserve
    + 2 * u**2 * k * (u + r) * reserve_next
    + 2 * k * (u - r) * (u + r) ** 2
)
assert sp.factor(cleared - expected) == 0

print("isolated-pendant ISO-reserve recurrence: PASS")
