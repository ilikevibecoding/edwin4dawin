#!/usr/bin/env python3
"""Inspect the corank-one correction in the actual-tail size recurrence."""

from __future__ import annotations

from itertools import combinations

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
            candidates.append(
                (residual.rank(), anchor_row, anchor_column, residual)
            )
    return min(candidates, key=lambda item: item[0])


def tn_profile(matrix: sp.Matrix):
    zero = positive = negative = 0
    first_negative = None
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                determinant = sp.factor(matrix.extract(rows, columns).det())
                sign = sp.sign(determinant)
                if sign == 0:
                    zero += 1
                elif sign == 1:
                    positive += 1
                else:
                    negative += 1
                    if first_negative is None:
                        first_negative = (rows, columns, determinant)
    return zero, positive, negative, first_negative


def diagonal_equivalence(left: sp.Matrix, right: sp.Matrix) -> bool:
    if left.shape != right.shape:
        return False
    rows, columns = left.shape
    row_scales = [sp.factor(left[i, 0] / right[i, 0]) for i in range(rows)]
    column_scales = [
        sp.factor(left[0, j] / (row_scales[0] * right[0, j]))
        for j in range(columns)
    ]
    return sp.simplify(
        left - sp.diag(*row_scales) * right * sp.diag(*column_scales)
    ) == sp.zeros(rows, columns)


previous = actual(1)
for m in range(2, 8):
    current = actual(m)
    rank, anchor_row, anchor_column, residual = best_diagonal_residual(
        current[:-1, :-1], previous
    )
    correction = -residual
    profile = tn_profile(correction)
    right_null = correction.nullspace()
    left_null = correction.T.nullspace()
    inner = correction[1:, 1:]
    candidate = actual(m - 2) if m >= 3 else sp.zeros(0)
    print(
        f"m={m} anchor=({anchor_row},{anchor_column}) rank={rank} "
        f"TN(zero,pos,neg)={profile[:3]} first_negative={profile[3]}",
        flush=True,
    )
    print(
        f" right_null={right_null[0].T if right_null else None} "
        f"left_null={left_null[0].T if left_null else None}",
        flush=True,
    )
    if m >= 3:
        print(
            f" inner_diag_equiv_actual_m-2={diagonal_equivalence(inner, candidate)}",
            flush=True,
        )
    previous = current
