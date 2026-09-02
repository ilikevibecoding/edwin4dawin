#!/usr/bin/env python3
"""Compare one Neville reduction of the affine core with the next size."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def first_column_reduce(matrix: sp.Matrix) -> tuple[sp.Matrix, list[sp.Expr]]:
    work = sp.Matrix(matrix)
    multipliers = []
    for row in range(work.rows - 1, 0, -1):
        multiplier = sp.cancel(work[row, 0] / work[row - 1, 0])
        multipliers.append(sp.factor(multiplier))
        work[row, :] = sp.simplify(work[row, :] - multiplier * work[row - 1, :])
    assert work[1:, 0] == sp.zeros(work.rows - 1, 1)
    return work[1:, 1:], multipliers


def diagonal_match(left: sp.Matrix, right: sp.Matrix):
    """Best boundary-anchored diagonal equivalence residual."""
    n = left.rows
    candidates = []
    for anchor_row in range(n):
        for anchor_column in range(n):
            if any(left[i, anchor_column] == 0 or right[i, anchor_column] == 0 for i in range(n)):
                continue
            if any(left[anchor_row, j] == 0 or right[anchor_row, j] == 0 for j in range(n)):
                continue
            rows = [sp.factor(left[i, anchor_column] / right[i, anchor_column]) for i in range(n)]
            columns = [sp.factor(left[anchor_row, j] / (rows[anchor_row] * right[anchor_row, j])) for j in range(n)]
            residual = sp.simplify(left - sp.diag(*rows) * right * sp.diag(*columns))
            candidates.append((residual.rank(), anchor_row, anchor_column, residual, rows, columns))
    return min(candidates, key=lambda item: item[0]) if candidates else None


for d in range(4, 12):
    _, _, _, m0, m1 = null_coordinate_data(d)
    _, _, _, s0, s1 = null_coordinate_data(d - 1)
    r0, multipliers = first_column_reduce(m0)
    # Apply exactly the same row operations to M1; its first column is zero,
    # but the row operations still change its remaining block.
    work1 = sp.Matrix(m1)
    for row, multiplier in zip(range(m1.rows - 1, 0, -1), multipliers):
        work1[row, :] = sp.simplify(work1[row, :] - multiplier * work1[row - 1, :])
    r1 = work1[1:, 1:]
    matched = diagonal_match(r0, s0)
    if matched is None:
        print(f"d={d}: no match")
        continue
    rank0, ar, ac, residual0, rows, columns = matched
    residual1 = sp.simplify(r1 - sp.diag(*rows) * s1 * sp.diag(*columns))
    print(
        f"d={d}: mult={multipliers}, anchor=({ar},{ac}), "
        f"rank0={rank0}, signs0={sorted(set(map(sp.sign,residual0)))}, "
        f"rank1={residual1.rank()}, signs1={sorted(set(map(sp.sign,residual1)))}",
        flush=True,
    )
