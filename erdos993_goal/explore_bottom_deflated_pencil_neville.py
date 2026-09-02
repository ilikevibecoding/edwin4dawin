#!/usr/bin/env python3
"""Print Neville factors of the null-deflated affine pencil."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import T, null_coordinate_data


def neville(matrix: sp.Matrix):
    work = sp.Matrix(matrix)
    stages = []
    for column in range(work.cols - 1):
        local = []
        for row in range(work.rows - 1, column, -1):
            if work[row - 1, column] == 0:
                local.append((row, None))
                continue
            multiplier = sp.factor(sp.cancel(work[row, column] / work[row - 1, column]))
            local.append((row, multiplier))
            work[row, :] = sp.simplify(work[row, :] - multiplier * work[row - 1, :])
        stages.append(local)
    return stages, [sp.factor(sp.cancel(work[i, i])) for i in range(work.rows)]


for d in range(3, 8):
    _, _, _, middle0, middle1 = null_coordinate_data(d)
    pencil = middle0 + T * middle1
    print(f"d={d}")
    for orientation, matrix in (("direct", pencil), ("transpose", pencil.T)):
        stages, pivots = neville(matrix)
        print(f" {orientation}")
        for column, local in enumerate(stages):
            print(f"  col={column}: {local}")
        print("  pivots:", pivots)
