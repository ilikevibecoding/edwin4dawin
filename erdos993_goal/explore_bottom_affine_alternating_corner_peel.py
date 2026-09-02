#!/usr/bin/env python3
"""Test an alternating first-column / last-row Neville corner peel."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def peel(m0: sp.Matrix, m1: sp.Matrix):
    a0, a1 = sp.Matrix(m0), sp.Matrix(m1)
    row_multipliers = []
    for row in range(a0.rows - 1, 0, -1):
        mu = sp.factor(sp.cancel(a0[row, 0] / a0[row - 1, 0]))
        row_multipliers.append(mu)
        a0[row, :] = sp.simplify(a0[row, :] - mu * a0[row - 1, :])
        a1[row, :] = sp.simplify(a1[row, :] - mu * a1[row - 1, :])
    assert a0[1:, 0] == sp.zeros(a0.rows - 1, 1)
    a0, a1 = a0[1:, 1:], a1[1:, 1:]
    assert a1[-1, :] == sp.zeros(1, a1.cols)

    column_multipliers = []
    # Work left-to-right so the right-neighbor denominator is still unchanged.
    # The inverse column operations are positive bidiagonal factors.
    for column in range(a0.cols - 1):
        mu = sp.factor(sp.cancel(a0[-1, column] / a0[-1, column + 1]))
        column_multipliers.append(mu)
        a0[:, column] = sp.simplify(a0[:, column] - mu * a0[:, column + 1])
        a1[:, column] = sp.simplify(a1[:, column] - mu * a1[:, column + 1])
    return a0[:-1, :-1], a1[:-1, :-1], row_multipliers, column_multipliers


def diagonal_residual(left: sp.Matrix, right: sp.Matrix):
    n = left.rows
    best = None
    for ar in range(n):
        for ac in range(n):
            if any(left[i, ac] == 0 or right[i, ac] == 0 for i in range(n)):
                continue
            if any(left[ar, j] == 0 or right[ar, j] == 0 for j in range(n)):
                continue
            rs = [sp.factor(left[i, ac] / right[i, ac]) for i in range(n)]
            cs = [sp.factor(left[ar, j] / (rs[ar] * right[ar, j])) for j in range(n)]
            residual = sp.simplify(left - sp.diag(*rs) * right * sp.diag(*cs))
            record = (residual.rank(), ar, ac, residual, rs, cs)
            if best is None or record[0] < best[0]:
                best = record
    return best


for d in range(5, 12):
    m0, m1 = null_coordinate_data(d)[3:]
    p0, p1, rows, columns = peel(m0, m1)
    s0, s1 = null_coordinate_data(d - 2)[3:]
    match = diagonal_residual(p0, s0)
    if match is None:
        print(f"d={d}: no constant match")
        continue
    rank0, ar, ac, residual0, rs, cs = match
    residual1 = sp.simplify(p1 - sp.diag(*rs) * s1 * sp.diag(*cs))
    shape = lambda a: ["".join("+" if x > 0 else "-" if x < 0 else "." for x in a.row(i)) for i in range(a.rows)]
    print(
        f"d={d}: row_mult_nonnegative={all(x >= 0 for x in rows)}, "
        f"col_mult_nonnegative={all(x >= 0 for x in columns)}, "
        f"p1_shape={shape(p1)}, rank0={rank0}, "
        f"rank1={residual1.rank()}, residual1_signs={sorted(set(map(sp.sign,residual1)))}",
        flush=True,
    )
