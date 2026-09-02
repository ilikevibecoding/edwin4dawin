#!/usr/bin/env python3
"""Print exact Neville parameters of the positive deflated cut layer W."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def staged_neville(matrix: sp.Matrix):
    work = sp.Matrix(matrix)
    stages = []
    for column in range(work.cols - 1):
        local = []
        for row in range(work.rows - 1, column, -1):
            multiplier = sp.factor(sp.cancel(work[row, column] / work[row - 1, column]))
            local.append((row, multiplier))
            work[row, :] = sp.simplify(work[row, :] - multiplier * work[row - 1, :])
        stages.append(local)
    return stages, [sp.factor(sp.cancel(work[i, i])) for i in range(work.rows)]


for d in range(3, 9):
    _, _, _, _, middle1 = null_coordinate_data(d)
    w = middle1[:-1, 1:]
    print(f"d={d}")
    for orientation, matrix in (("direct", w), ("transpose", w.T)):
        stages, pivots = staged_neville(matrix)
        print(f" {orientation} stages={stages}")
        print(f" {orientation} pivots={pivots}")
