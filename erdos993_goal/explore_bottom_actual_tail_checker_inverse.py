#!/usr/bin/env python3
"""Inspect the checker inverse needed only for the actual m-by-m Erdos tail."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                if value < 0:
                    return order, rows, columns, value
    return None


for m in range(1, 11):
    d = 2 * m + 3
    _, _, _, maximal = two_sided_data(d)
    actual = maximal[:m, :m]
    signs = sp.diag(*[(-1) ** i for i in range(m)])
    checker_inverse = sp.simplify(signs * actual.inv() * signs)
    entry_signs = sorted(set(sp.sign(value) for value in checker_inverse))
    obstruction = first_negative_minor(checker_inverse) if m <= 7 else None
    print(
        f"m={m}, d={d}: entry_signs={entry_signs}; "
        f"first_negative_d_le_7={obstruction}"
    )
    if m <= 4:
        print(checker_inverse)
