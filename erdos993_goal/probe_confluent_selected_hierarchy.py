#!/usr/bin/env python3
"""Test root geometry of the selected last-m columns in the t=1 quotient."""

from fractions import Fraction as F

import sympy as sp

from probe_switch_gauge_quotient import confluent_quotient


X = sp.symbols("x")


def all_real_negative(poly):
    intervals = poly.intervals(eps=sp.Rational(1, 10**18))
    return (
        sum(multiplicity for _, multiplicity in intervals) == poly.degree()
        and all(interval[1] < 0 for interval, _ in intervals)
    )


def low_cancel(polynomials):
    levels = [polynomials]
    while len(levels[-1]) > 1:
        current = levels[-1]
        following = []
        for left, right in zip(current, current[1:]):
            multiplier = right.nth(0) / left.nth(0)
            reduced = sp.Poly(
                (right.as_expr() - multiplier * left.as_expr()) / X,
                X,
                domain=sp.QQ,
            )
            following.append(reduced)
        levels.append(following)
    return levels


def main():
    for m in range(2, 11):
        q = 2 * m + 2
        matrix = confluent_quotient(q, F(1))
        family = [
            sp.Poly(
                sum(
                    sp.Rational(matrix[row][column].numerator,
                                matrix[row][column].denominator)
                    * X**row
                    for row in range(q)
                ),
                X,
                domain=sp.QQ,
            )
            for column in range(q - m, q)
        ]
        levels = low_cancel(family)
        root_flags = [
            all(all_real_negative(poly) for poly in level) for level in levels
        ]
        positive_coefficients = [
            all(all(value > 0 for value in poly.all_coeffs()) for poly in level)
            for level in levels
        ]
        print(
            f"m={m} roots={root_flags} coefficients={positive_coefficients}"
        )


if __name__ == "__main__":
    main()
