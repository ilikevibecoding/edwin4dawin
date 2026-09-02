#!/usr/bin/env python3
"""Inspect adjacent-row generating polynomials of the compressed kernel."""

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


T = sp.symbols("t")


def super_ballot(size: int) -> sp.Matrix:
    return sp.Matrix(
        size,
        size,
        lambda row, column: (
            sp.Rational(2 * row + 1, column + 1)
            * sp.binomial(2 * row, row)
            * sp.binomial(2 * (column - row), column - row)
            if row <= column
            else 0
        ),
    )


def power_to_bernstein(polynomial: sp.Poly, degree: int) -> list[sp.Expr]:
    # t^j = sum_{k=j}^degree binom(k,j)/binom(degree,j) B_{k,degree}(t).
    return [
        sp.factor(
            sum(
                polynomial.nth(power)
                * sp.binomial(index, power)
                / sp.binomial(degree, power)
                for power in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


for d in range(3, 31):
    q = d - 1
    central_form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    transform = super_ballot(q)
    compressed = sp.simplify(transform * central_form * transform.T)
    peak = (d + 1) // 3 - 1
    failures = []
    print(f"d={d}, peak={peak}")
    for row in range(1, q):
        expected = 1 if row <= peak else -1
        polynomial = sp.Poly(
            sum(
                (compressed[row, column] - compressed[row - 1, column]) * T**column
                for column in range(q)
            ),
            T,
        )
        bernstein = power_to_bernstein(polynomial, q - 1)
        passes = all(expected * value >= 0 for value in bernstein) and any(
            expected * value > 0 for value in bernstein
        )
        if not passes:
            failures.append((row, sp.factor(polynomial.as_expr()), bernstein))
        if d <= 10:
            print(
                f"  row={row}, expected={expected:+d}, "
                f"factor={sp.factor(polynomial.as_expr())}, bernstein_ok={passes}"
            )
    print(f"  failures={len(failures)}")
