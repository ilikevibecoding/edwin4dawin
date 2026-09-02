#!/usr/bin/env python3
"""Test displacement rank of the symmetric rational-Bernstein kernel."""

from __future__ import annotations

import sympy as sp

from fast_bottom_forward import beta_coefficients, central_k, matmul


def transpose(a):
    return [list(row) for row in zip(*a)]


def reverse_rows(a):
    return list(reversed(a))


def reverse_columns(a):
    return [list(reversed(row)) for row in a]


def main():
    for q in range(2, 16):
        b = beta_coefficients(q)
        k = central_k(q + 1)
        kj = reverse_columns(k)
        s = matmul(matmul(b, kj), transpose(b))
        # Coefficient matrix of (x-y) Pi(x,y), with one extra row/column.
        displacement = [[sp.Rational(0) for _ in range(q + 1)] for _ in range(q + 1)]
        for i in range(q):
            for j in range(q):
                value = sp.Rational(s[i][j].numerator, s[i][j].denominator)
                displacement[i + 1][j] += value
                displacement[i][j + 1] -= value
        rank = sp.Matrix(displacement).rank()
        print(q, rank, flush=True)


if __name__ == "__main__":
    main()
