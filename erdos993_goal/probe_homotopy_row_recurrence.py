#!/usr/bin/env python3
"""Search short purely-row-dependent recurrences in the reversed sandwich."""

from __future__ import annotations

import argparse
from fractions import Fraction as F

import sympy as sp

from verify_newton_checker_offdiag_homotopy import constant_and_linear


def solve_recurrence(lower, n, offsets):
    # Terms are (row lag, column lag); seek coefficients independent of k.
    equations = []
    rhs = []
    for k in range(n + 1):
        equations.append(
            [
                lower[n - row_lag][k - col_lag]
                if n >= row_lag and 0 <= k - col_lag <= n - row_lag
                else F(0)
                for row_lag, col_lag in offsets
            ]
        )
        rhs.append(lower[n][k])
    a = sp.Matrix([[sp.Rational(x.numerator, x.denominator) for x in row] for row in equations])
    b = sp.Matrix([sp.Rational(x.numerator, x.denominator) for x in rhs])
    try:
        solution = sp.linsolve((a, b))
    except Exception:
        return None
    if solution is sp.EmptySet or not solution:
        return None
    item = next(iter(solution))
    if any(x.free_symbols for x in item):
        return "underdetermined"
    return tuple(sp.factor(x) for x in item)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, default=12)
    args = parser.parse_args()
    a, b = constant_and_linear(args.q)
    patterns = {
        "two": ((1, 1), (1, 0)),
        "sokal3": ((1, 1), (1, 0), (2, 1)),
        "width4": ((1, 1), (1, 0), (2, 1), (2, 0)),
        "defect3": ((1, 1), (1, 0), (2, 1), (3, 1)),
    }
    for label, t in (("zero", F(0)), ("one", F(1)), ("two", F(2))):
        upper = [[a[i][j] + t * b[i][j] for j in range(args.q)] for i in range(args.q)]
        lower = [list(reversed(row)) for row in reversed(upper)]
        print(label)
        for name, offsets in patterns.items():
            first_failure = None
            solutions = []
            for n in range(1, args.q):
                solution = solve_recurrence(lower, n, offsets)
                solutions.append(solution)
                if solution is None and first_failure is None:
                    first_failure = n
            print(name, "failure", first_failure, "first", solutions[:5])


if __name__ == "__main__":
    main()
