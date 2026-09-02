#!/usr/bin/env python3
"""Inspect exact Neville multipliers of the checker inverse Q_d(1)."""

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


def neville_table(matrix: sp.Matrix):
    work = sp.Matrix(matrix)
    q = matrix.rows
    table = {}
    for column in range(q - 1):
        for row in range(q - 1, column, -1):
            multiplier = sp.factor(work[row, column] / work[row - 1, column])
            table[(row, column)] = multiplier
            work[row, :] -= multiplier * work[row - 1, :]
    return table, [sp.factor(work[i, i]) for i in range(q)]


for d in range(3, 8):
    _, _, q0, q1, _ = homotopy_data(d)
    Q = sp.simplify(q0 + q1)
    print(f"d={d}")
    for name, matrix in (("Q", Q), ("QT", Q.T)):
        table, pivots = neville_table(matrix)
        print(f" {name} multipliers")
        for key in sorted(table):
            print(f"  {key}: {sp.factor(table[key])}")
        print(" pivots", pivots)
