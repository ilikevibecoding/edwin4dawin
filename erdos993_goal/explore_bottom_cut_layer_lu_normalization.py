#!/usr/bin/env python3
"""Normalize the variable cut W to identity using its exact LU factors."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def doolittle(matrix: sp.Matrix):
    n = matrix.rows
    lower = sp.eye(n)
    upper = sp.zeros(n)
    for i in range(n):
        for j in range(i, n):
            upper[i, j] = sp.factor(
                matrix[i, j] - sum(lower[i, k] * upper[k, j] for k in range(i))
            )
        for j in range(i + 1, n):
            lower[j, i] = sp.factor(
                (
                    matrix[j, i]
                    - sum(lower[j, k] * upper[k, i] for k in range(i))
                )
                / upper[i, i]
            )
    assert sp.simplify(lower * upper - matrix) == sp.zeros(n)
    return lower, upper


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 11):
    _, _, _, m0, m1 = null_coordinate_data(d)
    q = d - 1
    n = q - 1
    w = m1[:n, 1:q]
    lower, upper = doolittle(w)
    left = sp.diag(*([sp.Integer(1)] * q))
    left[:n, :n] = lower
    right = sp.diag(*([sp.Integer(1)] * q))
    right[1:q, 1:q] = upper
    core0 = sp.simplify(left.inv() * m0 * right.inv())
    core1 = sp.simplify(left.inv() * m1 * right.inv())
    expected1 = sp.zeros(q)
    expected1[:n, 1:q] = sp.eye(n)
    assert core1 == expected1
    print(
        f"d={d}: L_entry_signs={sorted(set(sp.sign(x) for x in lower))}, "
        f"U_entry_signs={sorted(set(sp.sign(x) for x in upper))}, "
        f"core0_entry_signs={sorted(set(sp.sign(x) for x in core0))}, "
        f"core0_first_negative={first_negative_minor(core0) if d <= 8 else None}"
    )
    if d <= 5:
        print(core0)
