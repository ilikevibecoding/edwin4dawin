#!/usr/bin/env python3
"""Search per-column A/B orientations for a TN interleaving certificate."""

from __future__ import annotations

from itertools import combinations, product

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def oriented(a: sp.Matrix, b: sp.Matrix, bits) -> sp.Matrix:
    columns = []
    for j, bit in enumerate(bits):
        columns.extend((b[:, j], a[:, j]) if bit else (a[:, j], b[:, j]))
    return sp.Matrix.hstack(*columns)


def nonnegative_order_two(matrix: sp.Matrix) -> bool:
    for rows in combinations(range(matrix.rows), 2):
        for columns in combinations(range(matrix.cols), 2):
            if sp.factor(matrix.extract(rows, columns).det()) < 0:
                return False
    return all(value >= 0 for value in matrix)


def first_negative(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 9):
    m0, m1 = null_coordinate_data(d)[3:]
    q = d - 1
    survivors = []
    for bits in product((0, 1), repeat=q):
        matrix = oriented(m0, m1, bits)
        if nonnegative_order_two(matrix):
            survivors.append(bits)
    print(f"d={d}: order2_survivors={survivors}", flush=True)
    for bits in survivors[:4]:
        print(f" {bits}: all_first_negative={first_negative(oriented(m0,m1,bits))}", flush=True)
