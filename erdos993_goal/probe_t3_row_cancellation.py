#!/usr/bin/env python3
"""Inspect adjacent monic row cancellations of the t=3 mixed kernel."""

from fractions import Fraction as F

import sympy as sp

from probe_mixed_kernel_root_scan import mixed_kernel


x = sp.symbols("x")


def rows(q):
    out = []
    for row in mixed_kernel(q, F(3)):
        polynomial = sp.Poly(
            sum(
                sp.Rational(value.numerator, value.denominator) * x**degree
                for degree, value in enumerate(reversed(row))
            ),
            x,
        )
        out.append(polynomial.monic())
    return out


def main():
    for q in range(3, 9):
        polynomials = rows(q)
        print(f"\nq={q}")
        for p in range(q - 1):
            candidates = [
                polynomials[p] - polynomials[p + 1],
                polynomials[p + 1] - polynomials[p],
            ]
            child = next(
                candidate
                for candidate in candidates
                if all(value > 0 for value in candidate.all_coeffs())
            )
            tail = sp.Poly(1, x)
            for root_parameter in range(q + 4 - p, q + 4):
                tail *= sp.Poly(x + root_parameter, x)
            quotient, remainder = sp.div(child, tail)
            assert remainder.is_zero
            print(
                f"p={p} child={sp.factor(child.as_expr())} "
                f"reduced={sp.factor(quotient.as_expr())}"
            )


if __name__ == "__main__":
    main()
