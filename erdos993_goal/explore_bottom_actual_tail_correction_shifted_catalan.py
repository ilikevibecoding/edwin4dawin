#!/usr/bin/env python3
"""Identify the actual-tail correction among shifted Catalan beta kernels."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import two_sided_data
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def actual(m: int) -> sp.Matrix:
    return two_sided_data(2 * m + 3)[3][:m, :m]


def correction(m: int) -> sp.Matrix:
    current = actual(m)[:-1, :-1]
    previous = actual(m - 1)
    n = previous.rows
    row_scales = [sp.factor(current[i, 0] / previous[i, 0]) for i in range(n)]
    column_scales = [
        sp.factor(current[0, j] / (row_scales[0] * previous[0, j]))
        for j in range(n)
    ]
    residual = sp.simplify(
        current - sp.diag(*row_scales) * previous * sp.diag(*column_scales)
    )
    return -residual[1:, 1:]


def shifted_basis(size: int, shift: int) -> sp.Matrix:
    # C_{x+shift+p}/C_{x+shift} has a=shift+1/2, b=shift+2.
    polynomials = [
        sp.Poly(
            4**p
            * sp.rf(X + sp.Rational(2 * shift + 1, 2), p)
            * sp.rf(X + p + shift + 2, size - 1 - p),
            X,
        )
        for p in range(size)
    ]
    return coefficient_matrix(polynomials)


def diagonal_equivalence(left: sp.Matrix, right: sp.Matrix) -> bool:
    if left.shape != right.shape:
        return False
    n = left.rows
    row_scales = [sp.factor(left[i, 0] / right[i, 0]) for i in range(n)]
    column_scales = [
        sp.factor(left[0, j] / (row_scales[0] * right[0, j]))
        for j in range(n)
    ]
    return sp.simplify(
        left - sp.diag(*row_scales) * right * sp.diag(*column_scales)
    ) == sp.zeros(n)


for m in range(4, 9):
    target = correction(m)
    size = target.rows
    form = central_inverse_from_blocks(size + 1).inv() * reverse_identity(size)
    matches = []
    bases = {shift: shifted_basis(size, shift) for shift in range(1, 10)}
    for left_shift, left in bases.items():
        for right_shift, right in bases.items():
            candidate = left * form * right.T * reverse_identity(size)
            for label, oriented in (
                ("plain", candidate),
                ("transpose", candidate.T),
                ("reverse", reverse_identity(size) * candidate * reverse_identity(size)),
            ):
                if diagonal_equivalence(target, oriented):
                    matches.append((left_shift, right_shift, label))
    print(f"m={m} size={size} matches={matches}", flush=True)
