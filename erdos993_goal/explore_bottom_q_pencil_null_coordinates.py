#!/usr/bin/env python3
"""Transform the affine pencil into canonical coordinates of Q1's nullspaces."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_affine_rank_defect import q1_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


X = sp.symbols("x")


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 11):
    q = d - 1
    n = q - 1
    _, _, q0, q1, _ = homotopy_data(d)
    polynomial = sp.expand(sp.rf(X + 5, n))
    coefficients = [polynomial.coeff(X, i) for i in range(q)]

    left = sp.zeros(q, n)
    right = sp.zeros(n, q)
    for j in range(n):
        left[j, j] = coefficients[n - j - 1]
        left[j + 1, j] = coefficients[n - j]
        right[j, j] = coefficients[j + 1]
        right[j, j + 1] = coefficients[j]

    left_full_first = sp.Matrix.hstack(sp.eye(q)[:, 0], left)
    left_full_last = sp.Matrix.hstack(left, sp.eye(q)[:, q - 1])
    right_full_first = sp.Matrix.vstack(sp.eye(q)[0, :], right)
    right_full_last = sp.Matrix.vstack(right, sp.eye(q)[q - 1, :])

    print(f"d={d}")
    for name, left_full, right_full in (
        ("first-first", left_full_first, right_full_first),
        ("first-last", left_full_first, right_full_last),
        ("last-first", left_full_last, right_full_first),
        ("last-last", left_full_last, right_full_last),
    ):
        transformed0 = sp.simplify(left_full.inv() * q0 * right_full.inv())
        transformed1 = sp.simplify(left_full.inv() * q1 * right_full.inv())
        signs0 = "".join("+" if x > 0 else "-" if x < 0 else "0" for x in transformed0)
        print(
            f" {name}: q0 signs={signs0}, q0 first-negative={first_negative_minor(transformed0)}, "
            f"q1 nonzero positions={[(i,j) for i in range(q) for j in range(q) if transformed1[i,j]]}"
        )
        if d <= 5 and name == "first-first":
            print(" q0 transformed:")
            print(transformed0)
            print(" q1 transformed:")
            print(transformed1)
