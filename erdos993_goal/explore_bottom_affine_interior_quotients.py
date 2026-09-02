#!/usr/bin/env python3
"""Inspect the interior B+tW of the bordered deflated pencil."""

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


def shape(matrix: sp.Matrix):
    return ["".join("+" if x > 0 else "-" if x < 0 else "." for x in matrix.row(i)) for i in range(matrix.rows)]


for d in range(4, 11):
    m0, m1 = null_coordinate_data(d)[3:]
    b = m0[:-1, 1:]
    w = m1[:-1, 1:]
    quotients = {
        "B": b,
        "W": w,
        "B^-1W": sp.simplify(b.inv() * w),
        "W^-1B": sp.simplify(w.inv() * b),
        "WB^-1": sp.simplify(w * b.inv()),
        "BW^-1": sp.simplify(b * w.inv()),
    }
    print(f"d={d}", flush=True)
    for name, matrix in quotients.items():
        bad = first_negative(matrix) if name in ("B", "W") else None
        print(
            f" {name}: rank={matrix.rank()}, shape={shape(matrix)}, "
            f"charpoly={sp.factor(matrix.charpoly().as_expr()) if name in ('B^-1W','W^-1B') else '-'}, "
            f"first_negative={bad}",
            flush=True,
        )
