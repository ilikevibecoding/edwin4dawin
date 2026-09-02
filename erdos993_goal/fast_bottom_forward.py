#!/usr/bin/env python3
"""Fast exact-rational construction of the shifted forward matrices.

This is algebraically equivalent to ``maximal_tail_data`` followed by the
forward-difference transform, but it represents polynomials by coefficient
lists and matrices by ``fractions.Fraction``.  It avoids SymPy's expression
growth and is intended for larger exact reconnaissance.
"""

from __future__ import annotations

from fractions import Fraction as F
from functools import lru_cache
from math import comb


def catalan(n: int) -> int:
    return comb(2 * n, n) // (n + 1)


def zeros(rows: int, cols: int):
    return [[F(0) for _ in range(cols)] for _ in range(rows)]


def eye(n: int):
    out = zeros(n, n)
    for i in range(n):
        out[i][i] = F(1)
    return out


def matmul(a, b):
    rows, inner, cols = len(a), len(b), len(b[0])
    out = zeros(rows, cols)
    for i in range(rows):
        for k in range(inner):
            if a[i][k]:
                for j in range(cols):
                    out[i][j] += a[i][k] * b[k][j]
    return out


def inverse_upper(a):
    n = len(a)
    out = zeros(n, n)
    for j in range(n):
        for i in range(j, -1, -1):
            rhs = F(i == j)
            for k in range(i + 1, j + 1):
                rhs -= a[i][k] * out[k][j]
            out[i][j] = rhs / a[i][i]
    return out


def poly_mul_linear(coefficients, root_parameter: F):
    """Multiply increasing coefficients by x + root_parameter."""
    out = [F(0)] * (len(coefficients) + 1)
    for i, value in enumerate(coefficients):
        out[i] += root_parameter * value
        out[i + 1] += value
    return out


@lru_cache(maxsize=None)
def beta_coefficients(q: int):
    out = zeros(q, q)
    for p in range(q):
        poly = [F(4**p)]
        for i in range(p):
            poly = poly_mul_linear(poly, F(7, 2) + i)
        for i in range(q - 1 - p):
            poly = poly_mul_linear(poly, F(p + 5 + i))
        for degree, value in enumerate(poly):
            out[degree][p] = value
    return out


@lru_cache(maxsize=None)
def central_z(d: int):
    q = d - 1
    out = zeros(q, q)
    for i in range(q):
        p = i + 1
        for j in range(i, q):
            end = j + 1
            convolution = sum(
                F(catalan(r - p + 1) * catalan(end - r + 1), comb(d, r))
                for r in range(p, end + 1)
            )
            out[i][j] = (F(1, comb(d - 2, i)) if i == j else F(0)) - convolution
    return out


@lru_cache(maxsize=None)
def central_k(d: int):
    return inverse_upper(central_z(d))


@lru_cache(maxsize=None)
def right_coefficient_matrix(q: int):
    """The fixed-q central/Catalan factor K J H J."""
    d = q + 1
    k = central_k(d)
    h = [[F(catalan(i + j + 3)) for j in range(q)] for i in range(q)]
    jmat = [row[::-1] for row in eye(q)]
    return matmul(matmul(matmul(k, jmat), h), jmat)


@lru_cache(maxsize=None)
def polynomial_coefficient_matrix(q: int):
    """Coefficient columns of all fixed-q polynomials p_j."""
    return matmul(beta_coefficients(q), right_coefficient_matrix(q))


@lru_cache(maxsize=None)
def stirling_second(n: int, k: int) -> int:
    if n == k == 0:
        return 1
    if n == 0 or k == 0 or k > n:
        return 0
    return stirling_second(n - 1, k - 1) + k * stirling_second(n - 1, k)


@lru_cache(maxsize=None)
def factorial(n: int) -> int:
    return 1 if n < 2 else n * factorial(n - 1)


@lru_cache(maxsize=None)
def shifted_forward(n: int, shift: int):
    q = 2 * n + 2 + shift
    coefficients = polynomial_coefficient_matrix(q)
    first_column = q - n
    out = zeros(n, n)
    for order in range(n):
        for column in range(n):
            out[order][column] = factorial(order) * sum(
                coefficients[degree][first_column + column]
                * stirling_second(degree, order)
                for degree in range(order, q)
            )
    return out


def schur_top_left(a):
    n = len(a)
    return [
        [a[i][j] - a[i][0] * a[0][j] / a[0][0] for j in range(1, n)]
        for i in range(1, n)
    ]


def anchored_residual(left, right):
    n = len(left)
    rows = [left[i][0] / right[i][0] for i in range(n)]
    columns = [left[0][j] / (rows[0] * right[0][j]) for j in range(n)]
    residual = [
        [left[i][j] - rows[i] * right[i][j] * columns[j] for j in range(n)]
        for i in range(n)
    ]
    return residual, rows, columns


def determinant(a):
    a = [row[:] for row in a]
    n = len(a)
    value = F(1)
    for column in range(n):
        pivot = next((row for row in range(column, n) if a[row][column]), None)
        if pivot is None:
            return F(0)
        if pivot != column:
            a[pivot], a[column] = a[column], a[pivot]
            value = -value
        p = a[column][column]
        value *= p
        for row in range(column + 1, n):
            multiplier = a[row][column] / p
            for j in range(column + 1, n):
                a[row][j] -= multiplier * a[column][j]
    return value


if __name__ == "__main__":
    for n in range(1, 9):
        matrix = shifted_forward(n, 0)
        print(n, all(value > 0 for row in matrix for value in row), determinant(matrix) > 0)
