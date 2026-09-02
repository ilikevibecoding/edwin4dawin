#!/usr/bin/env python3
"""Print exact factorizations of small checker-homotopy flag coefficients.

This is reconnaissance for an all-order formula.  It deliberately reuses the
independent exact constructors from the coefficientwise verifier and only
prints data; it does not form part of a certificate.
"""

from __future__ import annotations

import argparse
from fractions import Fraction as F

from sympy import Rational, factorint

from verify_newton_checker_offdiag_homotopy import constant_and_linear


def determinant_coefficients(a, b):
    """Multilinear determinant coefficients for the affine columns a+t*b."""
    from itertools import combinations

    n = len(a)
    out = [F(0) for _ in range(n + 1)]

    def det(matrix):
        work = [row[:] for row in matrix]
        sign = 1
        value = F(1)
        for col in range(n):
            pivot = next((row for row in range(col, n) if work[row][col]), None)
            if pivot is None:
                return F(0)
            if pivot != col:
                work[col], work[pivot] = work[pivot], work[col]
                sign *= -1
            p = work[col][col]
            value *= p
            for row in range(col + 1, n):
                m = work[row][col] / p
                for j in range(col + 1, n):
                    work[row][j] -= m * work[col][j]
        return sign * value

    for ell in range(n + 1):
        for selected in combinations(range(n), ell):
            selected = set(selected)
            matrix = [
                [b[i][j] if j in selected else a[i][j] for j in range(n)]
                for i in range(n)
            ]
            out[ell] += det(matrix)
    return out


def signed_factorization(value: F):
    if value == 0:
        return "0"
    sign = "-" if value < 0 else ""
    value = abs(value)
    num = factorint(value.numerator)
    den = factorint(value.denominator)
    return f"{sign}{num}/{den}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--q", type=int, required=True)
    parser.add_argument("--c", type=int, required=True)
    parser.add_argument("--r", type=int, required=True)
    args = parser.parse_args()

    constant, linear = constant_and_linear(args.q)
    cols = list(range(args.r - args.c, args.r + 1))
    a = [[constant[i][j] for j in cols] for i in range(args.c + 1)]
    b = [[linear[i][j] for j in cols] for i in range(args.c + 1)]
    coefficients = determinant_coefficients(a, b)
    base = coefficients[0]
    print(f"q={args.q} c={args.c} r={args.r}")
    for ell, value in enumerate(coefficients):
        normalized = value / base
        print(
            ell,
            value,
            "normalized=", normalized,
            "factors=", signed_factorization(normalized),
            "sympy=", Rational(normalized.numerator, normalized.denominator),
        )


if __name__ == "__main__":
    main()
