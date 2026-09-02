#!/usr/bin/env python3
"""Test the strong interleaved-column certificate for M0+t M1."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def interleave(a: sp.Matrix, b: sp.Matrix, b_first: bool = False) -> sp.Matrix:
    columns = []
    for j in range(a.cols):
        pair = (b[:, j], a[:, j]) if b_first else (a[:, j], b[:, j])
        columns.extend(pair)
    return sp.Matrix.hstack(*columns)


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
    print(f"d={d}", flush=True)
    for name, matrix in (
        ("A,B", interleave(m0, m1)),
        ("B,A", interleave(m0, m1, True)),
        ("A,B_without_zero_B0", interleave(m0, m1)[:, [j for j in range(2 * m0.cols) if j != 1]]),
    ):
        print(f" {name}: first_negative={first_negative(matrix)}", flush=True)
