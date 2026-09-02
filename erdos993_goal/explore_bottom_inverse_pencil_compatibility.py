#!/usr/bin/env python3
"""Test common-network compatibility patterns for Q0+t Q1.

If an interleaving of the columns (or rows) of Q0 and Q1 is TN, the mixed
determinants in every pencil minor acquire a direct Cauchy--Binet sign proof.
"""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


def first_negative_minor(matrix: sp.Matrix):
    limit = min(matrix.rows, matrix.cols)
    for order in range(1, limit + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


def interleave_columns(first: sp.Matrix, second: sp.Matrix) -> sp.Matrix:
    return sp.Matrix.hstack(*[piece[:, j] for j in range(first.cols) for piece in (first, second)])


for d in range(3, 9):
    _, _, q0, q1, _ = homotopy_data(d)
    print(f"d={d}")
    candidates = {
        "columns q1,q0": interleave_columns(q1, q0),
        "columns q0,q1": interleave_columns(q0, q1),
        "rows q1,q0": interleave_columns(q1.T, q0.T).T,
        "rows q0,q1": interleave_columns(q0.T, q1.T).T,
    }
    for name, candidate in candidates.items():
        print(f" {name}:", first_negative_minor(candidate))
