#!/usr/bin/env python3
"""Print normalized actual tails and recurrence corrections for pattern finding."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def actual(m: int) -> sp.Matrix:
    d = 2 * m + 3
    return two_sided_data(d)[3][:m, :m]


def best_diagonal_residual(block: sp.Matrix, smaller: sp.Matrix):
    n = smaller.rows
    candidates = []
    for anchor_row in range(n):
        for anchor_column in range(n):
            row_scales = [
                sp.factor(block[i, anchor_column] / smaller[i, anchor_column])
                for i in range(n)
            ]
            column_scales = [
                sp.factor(
                    block[anchor_row, j]
                    / (row_scales[anchor_row] * smaller[anchor_row, j])
                )
                for j in range(n)
            ]
            residual = sp.simplify(
                block - sp.diag(*row_scales) * smaller * sp.diag(*column_scales)
            )
            candidates.append((residual.rank(), residual))
    return min(candidates, key=lambda item: item[0])


def boundary_normalize(matrix: sp.Matrix) -> sp.Matrix:
    return sp.Matrix(
        matrix.rows,
        matrix.cols,
        lambda i, j: sp.factor(
            matrix[i, j] * matrix[0, 0] / (matrix[i, 0] * matrix[0, j])
        ),
    )


for m in range(3, 7):
    previous = actual(m - 1)
    current = actual(m)
    _, residual = best_diagonal_residual(current[:-1, :-1], previous)
    correction = -residual[1:, 1:]
    print(f"m={m}")
    print(" actual_boundary_normalized=")
    print(boundary_normalize(current))
    print(" correction_inner_boundary_normalized=")
    print(boundary_normalize(correction))
    print(" correction_inner_factor_entries=")
    print(correction.applyfunc(sp.factor))
