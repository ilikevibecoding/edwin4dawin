#!/usr/bin/env python3
"""Inspect row polynomials of the hard upper factor of checker((L^-1 C)^-1)."""

import sympy as sp

from probe_confluent_transition_sections import inverse_matrix
from probe_newton_full_neville_patterns import transformed


x = sp.symbols("x")


def checker_inverse(q):
    inverse = inverse_matrix(transformed(q))
    return [
        [(-1 if (i + j) % 2 else 1) * inverse[i][j] for j in range(q)]
        for i in range(q)
    ]


def upper_factor(q):
    work = checker_inverse(q)
    for column in range(q - 1):
        for row in range(q - 1, column, -1):
            multiplier = work[row][column] / work[row - 1][column]
            assert multiplier > 0
            for j in range(column, q):
                work[row][j] -= multiplier * work[row - 1][j]
    assert all(work[i][j] == 0 for i in range(q) for j in range(i))
    return work


def row_polynomials(q):
    upper = upper_factor(q)
    return [
        sp.Poly(
            sum(
                sp.Rational(upper[i][j].numerator, upper[i][j].denominator)
                * x ** (j - i)
                for j in range(i, q)
            ),
            x,
        )
        for i in range(q)
    ]


def main():
    for q in range(2, 11):
        print(f"\nq={q}")
        for i, polynomial in enumerate(row_polynomials(q)):
            real = polynomial.count_roots(-sp.oo, sp.oo)
            negative = polynomial.count_roots(-sp.oo, 0)
            print(
                i,
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
