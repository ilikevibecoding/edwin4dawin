#!/usr/bin/env python3
"""Seek diagonal-equivalence plus low-rank updates between consecutive Z_d blocks."""

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks


def fitted_residual(old: sp.Matrix, new: sp.Matrix) -> tuple[sp.Matrix, list[sp.Expr], list[sp.Expr]]:
    q = old.rows
    left = [sp.Integer(1)] + [None] * (q - 1)
    right = [None] * q
    right[0] = sp.factor(new[0, 0] / old[0, 0])
    for i in range(q - 1):
        right[i + 1] = sp.factor(new[i, i + 1] / (left[i] * old[i, i + 1]))
        left[i + 1] = sp.factor(new[i + 1, i + 1] / (right[i + 1] * old[i + 1, i + 1]))
    scaled = sp.diag(*left) * old * sp.diag(*right)
    return sp.simplify(new - scaled), left, right


for d in range(3, 22):
    old = central_inverse_from_blocks(d)
    larger = central_inverse_from_blocks(d + 1)
    q = d - 1
    leading = larger[:q, :q]
    trailing = larger[1:, 1:]
    lead_residual, _, _ = fitted_residual(old, leading)
    trail_residual, _, _ = fitted_residual(old, trailing)
    print(
        f"d={d}: leading rank={lead_residual.rank()}, "
        f"trailing rank={trail_residual.rank()}, "
        f"leading nnz={sum(x != 0 for x in lead_residual)}, "
        f"trailing nnz={sum(x != 0 for x in trail_residual)}"
    )
