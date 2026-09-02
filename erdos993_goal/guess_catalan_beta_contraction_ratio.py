#!/usr/bin/env python3
"""Guess formulas for (Rbar Vbar)[s,s+k] / Vbar[s,s+k]."""

from __future__ import annotations

from fractions import Fraction as F

import sympy as sp

from fast_bottom_forward import catalan, matmul
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse


def main():
    max_gap = 12
    rows = 35
    q = rows + max_gap
    v = beta_checker_inverse(q)
    r = [
        [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0) for j in range(q)]
        for i in range(q)
    ]
    rv = matmul(r, v)
    x = sp.symbols("s")
    for gap in range(1, max_gap + 1):
        data = [
            (s, sp.Rational(rv[s][s + gap] / v[s][s + gap]))
            for s in range(rows)
        ]
        found = None
        for numerator_degree in range(0, 20):
            candidate = sp.factor(sp.rational_interpolate(data[:28], numerator_degree, X=x))
            if all(sp.cancel(candidate.subs(x, s) - y) == 0 for s, y in data):
                found = candidate
                break
        print(gap, found)


if __name__ == "__main__":
    main()
