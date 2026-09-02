#!/usr/bin/env python3
"""Exact replay of the polynomial c6/c7 endpoint factorization."""

import sympy as sp


c4, c5, V, Z = sp.symbols("c4 c5 V Z", positive=True)

c6_lo_old = (25 * c5**2 - 4 * c4 * c5) / (39 * c4)
c6_hi_old = (1 - (2 + c4 / c5) / 12) * c5**2 / c4
c6_old = c6_lo_old + (c6_hi_old - c6_lo_old) * V

g6_lo = (25 * c5 - 4 * c4) / (39 * c4)
g6_hi = (10 * c5 - c4) / (12 * c4)
g6 = g6_lo + (g6_hi - g6_lo) * V
c6_new = c5 * g6

c7_lo_old = (72 * c6_new**2 - 9 * c5 * c6_new) / (105 * c5)
c7_hi_old = (1 - (2 + c5 / c6_new) / 14) * c6_new**2 / c5
c7_old = c7_lo_old + (c7_hi_old - c7_lo_old) * Z

g7_lo = g6 * (72 * g6 - 9) / 105
g7_hi = g6 * (12 * g6 - 1) / 14
c7_new = c5 * (g7_lo + (g7_hi - g7_lo) * Z)

assert sp.factor(c6_old - c6_new) == 0
assert sp.factor(c7_old - c7_new) == 0
print("PASS exact c6=c5*g6 and c7=c5*g7 polynomial endpoint identities")
