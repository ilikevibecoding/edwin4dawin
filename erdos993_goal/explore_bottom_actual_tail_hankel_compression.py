#!/usr/bin/env python3
"""Peel square Catalan-Hankel boundary blocks from the actual Erdos tail."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    reverse_identity,
    shifted_catalan,
)


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
    q = d - 1
    reversal = reverse_identity(q)
    h = sp.Matrix(q, q, lambda i, j: shifted_catalan(i + j + 2))
    k = central_inverse_from_blocks(d).inv()
    left = h[:m, :]
    right = (reversal * h * reversal)[:, :m]
    left0 = left[:, :m]
    right0 = right[:m, :]
    p = sp.simplify(left0.inv() * left)
    qfactor = sp.simplify(right * right0.inv())
    core = sp.simplify(p * k * qfactor)
    target = sp.simplify(left * k * right)
    assert sp.simplify(target - left0 * core * right0) == sp.zeros(m)
    print(
        f"m={m}: P_nonnegative={all(x >= 0 for x in p)}, "
        f"Q_nonnegative={all(x >= 0 for x in qfactor)}, "
        f"core_entry_signs={sorted(set(sp.sign(x) for x in core))}, "
        f"core_first_negative={first_negative_minor(core) if m <= 7 else None}"
    )
    if m <= 4:
        print(" core=")
        print(core)
