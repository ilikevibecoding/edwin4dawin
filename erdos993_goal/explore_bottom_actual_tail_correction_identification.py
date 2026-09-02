#!/usr/bin/env python3
"""Try to identify the TP recurrence correction with known bottom kernels."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data
from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def actual(m: int) -> sp.Matrix:
    return two_sided_data(2 * m + 3)[3][:m, :m]


def anchored_correction(m: int) -> sp.Matrix:
    current = actual(m)[:-1, :-1]
    previous = actual(m - 1)
    n = previous.rows
    row_scales = [sp.factor(current[i, 0] / previous[i, 0]) for i in range(n)]
    column_scales = [
        sp.factor(current[0, j] / (row_scales[0] * previous[0, j]))
        for j in range(n)
    ]
    residual = sp.simplify(
        current - sp.diag(*row_scales) * previous * sp.diag(*column_scales)
    )
    return -residual[1:, 1:]


def diagonal_equivalence(left: sp.Matrix, right: sp.Matrix) -> bool:
    if left.shape != right.shape or not left.rows:
        return False
    rows, columns = left.shape
    if any(left[i, 0] == 0 or right[i, 0] == 0 for i in range(rows)):
        return False
    if any(left[0, j] == 0 or right[0, j] == 0 for j in range(columns)):
        return False
    row_scales = [sp.factor(left[i, 0] / right[i, 0]) for i in range(rows)]
    column_scales = [
        sp.factor(left[0, j] / (row_scales[0] * right[0, j]))
        for j in range(columns)
    ]
    return sp.simplify(
        left - sp.diag(*row_scales) * right * sp.diag(*column_scales)
    ) == sp.zeros(rows, columns)


def orientations(matrix: sp.Matrix):
    reversal = sp.eye(matrix.rows)[:, ::-1]
    checker = sp.diag(*[(-1) ** i for i in range(matrix.rows)])
    base = {
        "plain": matrix,
        "transpose": matrix.T,
        "reverse_both": reversal * matrix * reversal,
        "reverse_transpose": reversal * matrix.T * reversal,
    }
    if matrix.det() != 0:
        inverse = matrix.inv()
        base.update(
            {
                "checker_inverse": checker * inverse * checker,
                "checker_inverse_transpose": checker * inverse.T * checker,
                "reverse_checker_inverse": reversal * checker * inverse * checker * reversal,
            }
        )
    return base


for m in range(4, 9):
    correction = anchored_correction(m)
    k = correction.rows
    candidates = {}
    basis, _, _, target = two_sided_data(k + 1)
    candidates["beta"] = basis
    candidates["two_sided_target"] = target
    _, _, q0, q1, _ = homotopy_data(k + 1)
    candidates["q0"] = q0
    candidates["q1"] = q1
    _, _, _, middle0, _ = null_coordinate_data(k + 1)
    candidates["middle0"] = middle0
    _, _, _, _, middle1 = null_coordinate_data(k + 2)
    candidates["cut_W"] = middle1[:k, 1:]
    matches = []
    for family, candidate in candidates.items():
        for orientation, oriented in orientations(candidate).items():
            if diagonal_equivalence(correction, oriented):
                matches.append(f"{family}:{orientation}")
    print(f"m={m} k={k} matches={matches}", flush=True)
