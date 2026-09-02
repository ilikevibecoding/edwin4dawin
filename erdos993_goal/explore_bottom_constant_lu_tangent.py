#!/usr/bin/env python3
"""Inspect the affine tangent after exact LU normalization of the TN constant core."""

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
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 10):
    _, _, _, m0, m1 = null_coordinate_data(d)
    lower, upper = doolittle(m0)
    tangent = sp.simplify(lower.inv() * m1 * upper.inv())
    nonzero = [(i, j) for i in range(tangent.rows) for j in range(tangent.cols) if tangent[i, j]]
    bandwidth = (
        min(j - i for i, j in nonzero),
        max(j - i for i, j in nonzero),
    )
    print(
        f"d={d}: entry_signs={sorted(set(sp.sign(x) for x in tangent))}, "
        f"rank={tangent.rank()}, bandwidth={bandwidth}, "
        f"first_negative={first_negative_minor(tangent) if d <= 7 else None}"
    )
    if d <= 5:
        print(tangent)
