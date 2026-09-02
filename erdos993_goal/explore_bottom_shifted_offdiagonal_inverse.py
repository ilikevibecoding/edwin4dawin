#!/usr/bin/env python3
"""Test checker-inverse total positivity of the shifted central offdiagonal block."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 10):
    q = d - 1
    n = q - 1
    z = central_inverse_from_blocks(d)
    off = z - sp.diag(*z.diagonal())
    shifted = -off[:n, 1:q]
    signs = sp.diag(*[(-1) ** i for i in range(n)])
    checker_inverse = sp.simplify(signs * shifted.inv() * signs)
    print(
        f"d={d}, shifted first negative={first_negative_minor(shifted)}, "
        f"checker-inverse entries positive={all(x > 0 for x in checker_inverse)}, "
        f"checker-inverse first negative={first_negative_minor(checker_inverse)}"
    )
