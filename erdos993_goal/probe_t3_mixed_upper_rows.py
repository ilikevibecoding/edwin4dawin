#!/usr/bin/env python3
"""Inspect polynomial rows of the upper factor after row Neville elimination."""

from fractions import Fraction as F

import sympy as sp

from probe_mixed_kernel_root_scan import mixed_kernel


x = sp.symbols("x")


def upper_factor(q):
    work = [row[:] for row in mixed_kernel(q, F(3))]
    for column in range(q - 1):
        for row in range(q - 1, column, -1):
            multiplier = work[row][column] / work[row - 1][column]
            assert multiplier > 0
            for j in range(column, q):
                work[row][j] -= multiplier * work[row - 1][j]
    assert all(work[i][j] == 0 for i in range(q) for j in range(i))
    return work


def main():
    for q in range(2, 10):
        upper = upper_factor(q)
        print(f"\nq={q}")
        previous = None
        for row in range(q):
            # Column j is the coefficient of degree q-1-j.
            polynomial = sp.Poly(
                sum(
                    sp.Rational(value.numerator, value.denominator)
                    * x ** (q - 1 - column)
                    for column, value in enumerate(upper[row])
                ),
                x,
            )
            quotient = sp.Poly(polynomial.as_expr() / x ** (q - 1 - (q - 1)), x)
            real = polynomial.count_roots(-sp.oo, sp.oo)
            negative = polynomial.count_roots(-sp.oo, 0)
            print(
                row,
                "degree",
                polynomial.degree(),
                "real",
                real,
                "negative",
                negative,
                "factor",
                sp.factor(polynomial.as_expr()),
            )


if __name__ == "__main__":
    main()
