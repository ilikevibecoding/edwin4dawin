#!/usr/bin/env python3
"""Test sign-normalized quotients of the interior pair B,W."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def first_negative(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(4, 11):
    m0, m1 = null_coordinate_data(d)[3:]
    b, w = m0[:-1, 1:], m1[:-1, 1:]
    h = sp.simplify(w.inv() * b)
    g = sp.simplify(b * w.inv())
    e = sp.diag(*[(-1) ** i for i in range(d - 2)])
    print(f"d={d}", flush=True)
    for name, matrix in (
        ("E W^-1B", e * h),
        ("W^-1B E", h * e),
        ("E W^-1B E", e * h * e),
        ("B W^-1 E", g * e),
        ("E B W^-1", e * g),
    ):
        if any(value < 0 for value in matrix):
            bad = "negative entry"
        else:
            bad = first_negative(matrix)
        print(f" {name}: {bad}", flush=True)
