#!/usr/bin/env python3
"""Print factored Neville multipliers/pivots for the direct homotopy target."""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import T, homotopy_data


def neville(matrix: sp.Matrix):
    work = sp.Matrix(matrix)
    stages = []
    for column in range(work.cols - 1):
        local = []
        for row in range(work.rows - 1, column, -1):
            multiplier = sp.factor(sp.cancel(work[row, column] / work[row - 1, column]))
            local.append((row, multiplier))
            work[row, :] = sp.Matrix(1, work.cols, [
                sp.cancel(work[row, j] - multiplier * work[row - 1, j])
                for j in range(work.cols)
            ])
        stages.append(local)
    return stages, [sp.factor(sp.cancel(work[i, i])) for i in range(work.rows)]


for d in range(3, 9):
    target, _, _, _, _ = homotopy_data(d)
    stages, pivots = neville(target)
    print(f"d={d}")
    for column, local in enumerate(stages):
        print(f" column={column}")
        for row, value in local:
            print(f"  row={row}: {value}")
    print(" pivots:")
    for index, value in enumerate(pivots):
        print(f"  {index}: {value}")
