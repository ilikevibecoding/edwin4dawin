#!/usr/bin/env python3
"""Factor Q1 through canonical bidiagonal bases of its null hyperplanes."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_affine_rank_defect import q1_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


X = sp.symbols("x")


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 11):
    q = d - 1
    n = q - 1
    _, _, q1 = q1_data(d)
    polynomial = sp.expand(sp.rf(X + 5, n))
    coefficients = [polynomial.coeff(X, i) for i in range(q)]

    left = sp.zeros(q, n)
    right = sp.zeros(n, q)
    for j in range(n):
        left[j, j] = coefficients[n - j - 1]
        left[j + 1, j] = coefficients[n - j]
        right[j, j] = coefficients[j + 1]
        right[j, j + 1] = coefficients[j]

    middle = sp.simplify(
        left[:n, :].inv() * q1[:n, :n] * right[:, :n].inv()
    )
    assert sp.simplify(left * middle * right - q1) == sp.zeros(q)
    q0_smaller = homotopy_data(d - 1)[2] if d > 3 else sp.ones(1, 1)
    row_scales = [sp.factor(middle[i, 0] / q0_smaller[i, 0]) for i in range(n)]
    column_scales = [
        sp.factor(middle[0, j] / (row_scales[0] * q0_smaller[0, j]))
        for j in range(n)
    ]
    diagonal_equivalent = sp.simplify(
        sp.diag(*row_scales) * q0_smaller * sp.diag(*column_scales) - middle
    ) == sp.zeros(n)
    print(f"d={d}, middle first negative={first_negative_minor(middle)}, q0(d-1) diagonal equivalent={diagonal_equivalent}")
    if d <= 5:
        print(middle)
