#!/usr/bin/env python3
"""Verify the exact two-component mixture formula for terminal drift."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", positive=True)
k = r + 1
bm, b, bp = sp.symbols("bm b bp", positive=True)
cm, c = sp.symbols("cm c", nonnegative=True)

# A=B+xC, so a_r=b_r+c_(r-1) and a_(r+1)=b_(r+1)+c_r.
a = b + cm
ap = bp + c

u = r * b / bm
w = k * bp / b
v = k * ap / a
q_f = 1 + u - w
avoid_probability = c / b
u_c = r * c / cm

# Rank-r sets of A split into:
#   p absent: a rank-r set of B, extension mean w+c_r/b_r;
#   p present: p plus a rank-(r-1) set of C, extension mean r c_r/c_(r-1).
mixture = sp.factor(
    b / a * (w + avoid_probability)
    + cm / a * u_c
)
assert sp.factor(v - mixture) == 0

absent_margin = q_f - avoid_probability
present_margin = u + 1 - u_c
drift_mixture = sp.factor(
    b / a * absent_margin
    + cm / a * present_margin
)
assert sp.factor((u + 1 - v) - drift_mixture) == 0

# Clear the harmless cm=0 denominator to record the coefficient form
# of the present-component comparison.
present_cleared = sp.factor(
    (u + 1 - u_c) * bm * cm
)
assert sp.factor(
    present_cleared
    - ((r * b + bm) * cm - r * bm * c)
) == 0

absent_cleared = sp.factor(
    (q_f - avoid_probability) * bm * b
)
assert sp.factor(
    absent_cleared
    - (
        r * b**2
        + bm * b
        - k * bm * bp
        - bm * c
    )
) == 0

print("terminal drift mixture decomposition: PASS")
print(
    "u+1-v = (b/a)(q_F-c_r/b_r)"
    "+(c_(r-1)/a)(u+1-r c_r/c_(r-1))"
)
