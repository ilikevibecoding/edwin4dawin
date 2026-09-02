#!/usr/bin/env python3
"""Test real-rootedness and adjacent Wronskians for the t=1 quotient columns."""

from fractions import Fraction as F

import sympy as sp

from probe_switch_gauge_quotient import confluent_quotient


X = sp.symbols("x")


def polynomials(q):
    matrix = confluent_quotient(q, F(1))
    return [
        sp.Poly(
            sum(
                sp.Rational(matrix[row][column].numerator,
                            matrix[row][column].denominator)
                * X**row
                for row in range(q)
            ),
            X,
        )
        for column in range(q)
    ]


def all_negative_real_roots(poly):
    intervals = poly.intervals(eps=sp.Rational(1, 10**20))
    if sum(multiplicity for _, multiplicity in intervals) != poly.degree():
        return False
    return all(interval[1] < 0 for interval, _ in intervals)


def main():
    for q in range(2, 11):
        family = polynomials(q)
        real_rooted = [all_negative_real_roots(poly) for poly in family]
        wronskian_roots = []
        for left, right in zip(family, family[1:]):
            value = sp.Poly(
                left.as_expr() * sp.diff(right.as_expr(), X)
                - sp.diff(left.as_expr(), X) * right.as_expr(),
                X,
            )
            wronskian_roots.append(value.count_roots(-sp.oo, sp.oo))
        print(
            f"q={q} negative_real={real_rooted} "
            f"adjacent_wronskian_real_roots={wronskian_roots}"
        )


if __name__ == "__main__":
    main()
