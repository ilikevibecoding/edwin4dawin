#!/usr/bin/env python3
"""Inspect exact Neville multipliers of the missing reverse-TP matrix."""

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def indexed_neville(matrix: sp.Matrix):
    work = sp.Matrix(matrix)
    multipliers = {}
    for column in range(work.cols - 1):
        for row in range(work.rows - 1, column, -1):
            multiplier = sp.cancel(work[row, column] / work[row - 1, column])
            multipliers[row, column] = sp.factor(multiplier)
            work[row, :] = work[row, :] - multiplier * work[row - 1, :]
    pivots = [sp.factor(work[index, index]) for index in range(work.rows)]
    return multipliers, pivots


for d in range(3, 10):
    target = two_sided_data(d)[3]
    left, pivots = indexed_neville(target)
    right, _ = indexed_neville(target.T)
    print(f"d={d}")
    print("  row multipliers")
    for key, value in left.items():
        print(f"    {key}: {value}")
    print("  column multipliers")
    for key, value in right.items():
        print(f"    {key}: {value}")
    print(f"  pivots: {pivots}")
