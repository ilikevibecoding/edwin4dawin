#!/usr/bin/env python3
"""Apply finite-difference/Pascal transforms directly to the actual tail."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def pascal(size: int) -> sp.Matrix:
    return sp.Matrix(size, size, lambda i, j: sp.binomial(i, j) if j <= i else 0)


def first_negative(matrix: sp.Matrix):
    if any(value < 0 for value in matrix):
        return 1, "entry"
    if matrix.rows > 7:
        return None
    for order in range(2, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                if value < 0:
                    return order, rows, columns, value
    return None


for m in range(1, 13):
    actual = two_sided_data(2 * m + 3)[3][:m, :m]
    p = pascal(m)
    j = sp.eye(m)[:, ::-1]
    lower = p
    upper_reversed = j * p.T * j
    candidates = {
        "left": sp.simplify(lower.inv() * actual),
        "right_reversed": sp.simplify(actual * upper_reversed.inv()),
        "both_reversed": sp.simplify(lower.inv() * actual * upper_reversed.inv()),
        "both_same": sp.simplify(lower.inv() * actual * p.inv().T),
    }
    print(f"m={m}", flush=True)
    for name, matrix in candidates.items():
        print(f" {name}: first_negative={first_negative(matrix)}", flush=True)
