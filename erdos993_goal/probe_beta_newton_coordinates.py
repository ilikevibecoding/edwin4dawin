#!/usr/bin/env python3
"""Expose the explicit Newton-type lower factor of the beta matrix.

For n=q-1, define

    ell_r(x) = x^r prod_{i=r}^{n-1} (1 + x/(i+5)).

The coefficient columns of ell_r form the unit-lower-triangular factor L in
the LU decomposition of the beta coefficient matrix B.  This script checks
that identity exactly, forms Y=L^{-1} C for the selected raw coefficient
rectangle, and displays primitive integer row representatives for small m.
"""

from fractions import Fraction as F
from functools import reduce
from math import gcd, lcm

from fast_bottom_forward import (
    beta_coefficients,
    matmul,
    polynomial_coefficient_matrix,
    zeros,
)


def poly_mul_linear(coefficients, constant):
    out = [F(0)] * (len(coefficients) + 1)
    for degree, value in enumerate(coefficients):
        out[degree] += constant * value
        out[degree + 1] += value
    return out


def beta_newton_lower(q):
    n = q - 1
    out = zeros(q, q)
    for r in range(q):
        polynomial = [F(0)] * r + [F(1)]
        for i in range(r, n):
            following = [F(0)] * (len(polynomial) + 1)
            for degree, value in enumerate(polynomial):
                following[degree] += value
                following[degree + 1] += value / F(i + 5)
            polynomial = following
        for degree, value in enumerate(polynomial):
            out[degree][r] = value
    return out


def inverse_lower_unit(matrix):
    n = len(matrix)
    out = zeros(n, n)
    for column in range(n):
        for row in range(column, n):
            rhs = F(row == column)
            for k in range(column, row):
                rhs -= matrix[row][k] * out[k][column]
            out[row][column] = rhs / matrix[row][row]
    return out


def primitive_integer_row(row):
    denominator = reduce(lcm, (value.denominator for value in row), 1)
    integers = [value.numerator * (denominator // value.denominator) for value in row]
    common = reduce(gcd, (abs(value) for value in integers if value), 0)
    return [value // common for value in integers]


def selected(m):
    q = 2 * m + 2
    full = polynomial_coefficient_matrix(q)
    return [row[q - m : q] for row in full]


def main():
    for m in range(1, 7):
        q = 2 * m + 2
        lower = beta_newton_lower(q)
        inverse = inverse_lower_unit(lower)
        upper = matmul(inverse, beta_coefficients(q))
        assert all(upper[i][j] == 0 for i in range(q) for j in range(i))
        assert all(upper[i][j] > 0 for i in range(q) for j in range(i, q))
        assert matmul(lower, upper) == beta_coefficients(q)

        coordinates = matmul(inverse, selected(m))
        assert all(value > 0 for row in coordinates for value in row)
        print(f"m={m} q={q} exact_beta_newton_lu=PASS")
        if m <= 3:
            for r, row in enumerate(coordinates):
                print(f"  r={r} primitive={primitive_integer_row(row)}")


if __name__ == "__main__":
    main()
