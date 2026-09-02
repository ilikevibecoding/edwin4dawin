#!/usr/bin/env python3
"""Test whether the checker inverse is diagonally Hankel or Toeplitz."""

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


def hankel_cross_consistent(matrix: sp.Matrix) -> bool:
    q = matrix.rows
    values = {}
    for i in range(q - 1):
        for j in range(q - 1):
            cross = sp.factor(
                matrix[i, j] * matrix[i + 1, j + 1]
                / (matrix[i + 1, j] * matrix[i, j + 1])
            )
            key = i + j
            if key in values and values[key] != cross:
                return False
            values[key] = cross
    return True


def toeplitz_cross_consistent(matrix: sp.Matrix) -> bool:
    q = matrix.rows
    values = {}
    for i in range(q - 1):
        for j in range(q - 1):
            cross = sp.factor(
                matrix[i, j] * matrix[i + 1, j + 1]
                / (matrix[i + 1, j] * matrix[i, j + 1])
            )
            key = i - j
            if key in values and values[key] != cross:
                return False
            values[key] = cross
    return True


for d in range(3, 16):
    _, qmatrix, q0, q1, _ = homotopy_data(d)
    full = sp.simplify(q0 + q1)
    print(
        f"d={d}: Q hankel={hankel_cross_consistent(full)} "
        f"toeplitz={toeplitz_cross_consistent(full)}; "
        f"Q0 hankel={hankel_cross_consistent(q0)}; "
        f"Q1 hankel={hankel_cross_consistent(q1)}"
    )
