#!/usr/bin/env python3
"""Fit recurrences for the real-rooted residual row-polynomial chain."""

from fractions import Fraction as F

import sympy as sp

from probe_mixed_kernel_root_scan import mixed_kernel


x = sp.symbols("x")


def residuals(q):
    out = []
    for p, row in enumerate(mixed_kernel(q, F(3))):
        polynomial = sp.Poly(
            sum(
                sp.Rational(value.numerator, value.denominator) * x**degree
                for degree, value in enumerate(reversed(row))
            ),
            x,
        )
        tail = sp.Poly(1, x)
        for root_parameter in range(q + 4 - p, q + 4):
            tail *= sp.Poly(x + root_parameter, x)
        quotient, remainder = sp.div(polynomial, tail)
        assert remainder.is_zero
        out.append(quotient.monic())
    return list(reversed(out))  # degree 0,1,...,q-1


def fit_three_term(polynomials):
    records = []
    for k in range(1, len(polynomials) - 1):
        target = polynomials[k + 1]
        current = polynomials[k]
        previous = polynomials[k - 1]
        a, b = sp.symbols("a b")
        difference = sp.Poly(
            target.as_expr() - (x + a) * current.as_expr() + b * previous.as_expr(),
            x,
        )
        solution = sp.solve(difference.all_coeffs(), (a, b), dict=True)
        records.append((k, solution, sp.factor(difference.as_expr())))
    return records


def fit_four_term(polynomials):
    records = []
    for k in range(2, len(polynomials) - 1):
        target = polynomials[k + 1]
        current = polynomials[k]
        previous = polynomials[k - 1]
        previous2 = polynomials[k - 2]
        a, b, c = sp.symbols("a b c")
        difference = sp.Poly(
            target.as_expr()
            - (x + a) * current.as_expr()
            + b * previous.as_expr()
            + c * previous2.as_expr(),
            x,
        )
        solution = sp.solve(difference.all_coeffs(), (a, b, c), dict=True)
        records.append((k, solution, sp.factor(difference.as_expr())))
    return records


def main():
    for q in range(3, 13):
        records = fit_three_term(residuals(q))
        print(f"q={q}")
        for k, solution, difference in records:
            print(f"  k={k} solution={solution}")
            if not solution:
                print(f"    unresolved_difference={difference}")
                break
        four_records = fit_four_term(residuals(q))
        for k, solution, difference in four_records:
            print(f"  four k={k} solution={solution}")
            if not solution:
                print(f"    unresolved_four_difference={difference}")
                break


if __name__ == "__main__":
    main()
