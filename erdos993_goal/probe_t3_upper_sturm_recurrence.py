#!/usr/bin/env python3
"""Fit three-term recurrences for upper-factor boundary polynomials."""

import sympy as sp

from probe_t3_mixed_upper_rows import upper_factor


x = sp.symbols("x")


def polynomials(q):
    out = []
    for row in upper_factor(q):
        polynomial = sp.Poly(
            sum(
                sp.Rational(value.numerator, value.denominator)
                * x ** (q - 1 - column)
                for column, value in enumerate(row)
            ),
            x,
        )
        out.append(polynomial.monic())
    return list(reversed(out))


def main():
    for q in range(3, 13):
        sequence = polynomials(q)
        print(f"q={q}")
        for k in range(1, len(sequence) - 1):
            a, b = sp.symbols("a b")
            difference = sp.Poly(
                sequence[k + 1].as_expr()
                - (x + a) * sequence[k].as_expr()
                + b * sequence[k - 1].as_expr(),
                x,
            )
            solution = sp.solve(difference.all_coeffs(), (a, b), dict=True)
            print(f"  k={k} solution={solution}")
            if not solution:
                break


if __name__ == "__main__":
    main()
