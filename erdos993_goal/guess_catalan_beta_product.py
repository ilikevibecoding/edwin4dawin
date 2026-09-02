#!/usr/bin/env python3
"""Guess rational-in-row formulas for normalized entries of Rbar*Vbar."""

from __future__ import annotations

import argparse
from fractions import Fraction as F

import sympy as sp

from fast_bottom_forward import catalan, matmul
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-gap", type=int, default=6)
    parser.add_argument("--rows", type=int, default=30)
    args = parser.parse_args()
    q = args.rows + args.max_gap + 2
    v = beta_checker_inverse(q)
    r = [
        [F((-1) ** (j - i) * catalan(j - i)) if j >= i else F(0) for j in range(q)]
        for i in range(q)
    ]
    rv = matmul(r, v)
    x = sp.symbols("x")
    for gap in range(1, args.max_gap + 1):
        data = [
            (i, sp.Rational(rv[i][i + gap] / rv[i][i]))
            for i in range(args.rows)
        ]
        found = None
        for numerator_degree in range(0, min(16, len(data) - 1)):
            candidate = sp.factor(
                sp.rational_interpolate(data[:20], numerator_degree, X=x)
            )
            if all(sp.cancel(candidate.subs(x, i) - y) == 0 for i, y in data):
                found = candidate
                break
        print("gap", gap, "formula", found)
        ratios = [(i, sp.factor(data[i + 1][1] / data[i][1])) for i in range(len(data) - 1)]
        ratio_found = None
        for numerator_degree in range(0, min(16, len(ratios) - 1)):
            candidate = sp.factor(
                sp.rational_interpolate(ratios[:20], numerator_degree, X=x)
            )
            if all(sp.cancel(candidate.subs(x, i) - y) == 0 for i, y in ratios):
                ratio_found = candidate
                break
        print("  row ratio", ratio_found)


if __name__ == "__main__":
    main()
