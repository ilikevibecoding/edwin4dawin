#!/usr/bin/env python3
"""Test diagonal equivalence of two-step central M-matrix blocks."""

from __future__ import annotations

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks


def diagonal_equivalence(left: sp.Matrix, right: sp.Matrix):
    if left.shape != right.shape:
        return None
    n, m = left.shape
    for i in range(n):
        for j in range(m):
            if (left[i, j] == 0) != (right[i, j] == 0):
                return None
    row_scales: list[sp.Expr | None] = [None] * n
    column_scales: list[sp.Expr | None] = [None] * m
    for start in range(n):
        if row_scales[start] is not None:
            continue
        row_scales[start] = sp.Integer(1)
        changed = True
        while changed:
            changed = False
            for i in range(n):
                for j in range(m):
                    if right[i, j] == 0:
                        continue
                    ratio = sp.factor(left[i, j] / right[i, j])
                    if row_scales[i] is not None and column_scales[j] is None:
                        column_scales[j] = sp.factor(ratio / row_scales[i])
                        changed = True
                    elif row_scales[i] is None and column_scales[j] is not None:
                        row_scales[i] = sp.factor(ratio / column_scales[j])
                        changed = True
    if any(value is None for value in row_scales + column_scales):
        return None
    reconstructed = sp.diag(*row_scales) * right * sp.diag(*column_scales)
    if sp.simplify(left - reconstructed) != sp.zeros(n, m):
        return None
    return row_scales, column_scales


for d in range(5, 16):
    old = central_inverse_from_blocks(d - 2)
    new = central_inverse_from_blocks(d)
    n = old.rows
    matches = []
    for start in range(3):
        block = new[start : start + n, start : start + n]
        result = diagonal_equivalence(block, old)
        if result is not None:
            matches.append((start, result))
    print(f"d={d} matches={matches}", flush=True)
