#!/usr/bin/env python3
"""Factor row polynomials of the t=3 mixed kernel."""

from fractions import Fraction as F

import sympy as sp

from probe_mixed_kernel_root_scan import mixed_kernel


x = sp.symbols("x")


def main():
    for q in range(2, 10):
        matrix = mixed_kernel(q, F(3))
        print(f"\nq={q}")
        for p, row in enumerate(matrix):
            polynomial = sum(
                sp.Rational(value.numerator, value.denominator) * x**degree
                for degree, value in enumerate(reversed(row))
            )
            print(p, sp.factor(polynomial))


if __name__ == "__main__":
    main()
