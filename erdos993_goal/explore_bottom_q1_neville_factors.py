#!/usr/bin/env python3
"""Inspect Neville factors of the rank-(q-1) affine derivative Q1."""

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


for d in range(3, 9):
    q1 = homotopy_data(d)[3]
    print(f"d={d}")
    for name, matrix in (("Q1", q1), ("Q1T", q1.T)):
        table, pivots = neville_table(matrix)
        print(f" {name}")
        for key in sorted(table):
            print(f"  {key}: {table[key]}")
        print(" pivots", pivots)
