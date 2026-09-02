#!/usr/bin/env python3
"""Verify the exact rank-two pointed ISO calculation for forests.

The coefficient inequality is asserted for forests on n>=2 vertices.
The one-vertex pointed boundary fiber has margin -1 and is excluded.
"""

from __future__ import annotations

import sympy as sp


n, m, wedge_sum, degree = sp.symbols(
    "n m wedge_sum degree", nonnegative=True
)

# A forest on n vertices and m edges has these first coefficients.
# wedge_sum=sum_v binomial(deg(v),2).
b1 = n
b2 = n * (n - 1) / 2 - m
b3 = (
    n * (n - 1) * (n - 2) / 6
    - m * (n - 2)
    + wedge_sum
)

r = 2
u = sp.factor(2 * b2 / b1)
rho1 = 1 / n
rho2 = sp.factor((n - 1 - degree) / b2)

iso_reserve = sp.factor(
    2 * (2 * b2**2 + b1**2 - 3 * b1 * b3) / b1**2
)
occupancy_burden = sp.factor(
    2 * (u + 1) * rho1 - 3 * u * rho2
)
pointed_margin = sp.factor(iso_reserve - 2 * occupancy_burden)

expected_numerator = (
    -6 * wedge_sum * n
    - 12 * degree * n
    + 4 * m**2
    + 2 * m * n**2
    - 8 * m * n
    + 8 * m
    + n**3
    + 9 * n**2
    - 12 * n
)
assert sp.factor(pointed_margin - expected_numerator / n**2) == 0

# In a forest, wedge_sum <= C(m,2), degree <= m, and m <= n-1.
# Substituting the first two upper bounds leaves a concave quadratic
# Q_n(m), whose endpoint values on [0,n-1] are nonnegative.
lower_numerator = sp.factor(
    expected_numerator.subs(
        {
            wedge_sum: m * (m - 1) / 2,
            degree: m,
        }
    )
)
assert sp.Poly(lower_numerator, m).LC() == 4 - 3 * n
endpoint_zero = sp.factor(lower_numerator.subs(m, 0))
endpoint_tree = sp.factor(lower_numerator.subs(m, n - 1))
assert sp.factor(
    endpoint_zero - n * (n**2 + 9 * n - 12)
) == 0
assert sp.factor(endpoint_tree - 2 * (n - 2)) == 0

print("rank-two pointed ISO forest theorem (n>=2): PASS")
print("pointed margin numerator =", expected_numerator)
print("lower endpoint m=0 =", endpoint_zero)
print("lower endpoint m=n-1 =", endpoint_tree)

# Terminal-set extension.  W has t vertices, all but at most one of
# which are isolated in F; D is the number of forest edges incident
# with W.  Then h_1=t and
# h_2=C(n,2)-C(n-t,2)-D.
t, incident = sp.symbols("t incident", positive=True)
h1 = t
h2 = t * (2 * n - t - 1) / 2 - incident
rho1_terminal = h1 / n
rho2_terminal = h2 / b2
terminal_burden = sp.factor(
    2 * (u + 1) * rho1_terminal - 3 * u * rho2_terminal
)
terminal_margin = sp.factor(iso_reserve - 2 * terminal_burden)
terminal_numerator = sp.factor(terminal_margin * n**2)
expected_terminal_numerator = (
    -12 * incident * n
    - 6 * wedge_sum * n
    + 4 * m**2
    + 2 * m * n**2
    - 8 * m * n
    + 8 * m * t
    + n**3
    + 8 * n**2 * t
    + n**2
    - 6 * n * t**2
    - 6 * n * t
)
assert sp.factor(
    terminal_numerator - expected_terminal_numerator
) == 0

# Here incident<=m, wedge_sum<=C(m,2), and the t-1 isolated members
# of W force m<=n-t.  The resulting lower quadratic is concave in m.
terminal_lower = sp.factor(
    expected_terminal_numerator.subs(
        {
            incident: m,
            wedge_sum: m * (m - 1) / 2,
        }
    )
)
assert sp.Poly(terminal_lower, m).LC() == 4 - 3 * n
terminal_at_zero = sp.factor(terminal_lower.subs(m, 0))
terminal_at_upper = sp.factor(terminal_lower.subs(m, n - t))
assert sp.factor(
    terminal_at_zero
    - n * (n**2 + 8 * n * t + n - 6 * t**2 - 6 * t)
) == 0
assert sp.factor(
    terminal_at_upper
    - (
        12 * n**2 * t
        - 12 * n**2
        - 9 * n * t**2
        + 11 * n * t
        - 4 * t**2
    )
) == 0

z = sp.symbols("z", nonnegative=True)
print("rank-two terminal-set pointed ISO theorem: PASS")
print(
    "terminal lower endpoint m=0, n=t+z =",
    sp.factor(terminal_at_zero.subs(n, t + z)),
)
print(
    "terminal lower endpoint m=n-t, n=t+z =",
    sp.factor(terminal_at_upper.subs(n, t + z)),
)
