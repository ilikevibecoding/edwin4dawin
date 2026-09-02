#!/usr/bin/env python3
"""Factor the recurrence correction through shifted Catalan beta bases."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import two_sided_data
from verify_bottom_universal_schur_tp import reverse_identity


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
    return coefficient_matrix(
        [
            sp.Poly(
                4**p
                * sp.rf(X + sp.Rational(2 * shift + 1, 2), p)
                * sp.rf(X + p + shift + 2, size - 1 - p),
                X,
            )
            for p in range(size)
        ]
    )


def minor_profile(matrix: sp.Matrix):
    positive = zero = negative = 0
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                sign = sp.sign(sp.factor(matrix.extract(rows, columns).det()))
                positive += int(bool(sign == 1))
                zero += int(bool(sign == 0))
                negative += int(bool(sign == -1))
    return positive, zero, negative


for m in range(4, 8):
    target = correction(m)
    size = target.rows
    reversal = reverse_identity(size)
    records = []
    for left_shift in range(1, 9):
        left = shifted_basis(size, left_shift)
        for right_shift in range(1, 9):
            right = shifted_basis(size, right_shift)
            middle = sp.simplify(left.inv() * target * reversal * right.inv().T)
            signs = sorted(set(sp.sign(value) for value in middle))
            nonzero = sum(int(bool(value != 0)) for value in middle)
            profile = minor_profile(middle) if size <= 4 else (None, None, None)
            score = (profile[2] if profile[2] is not None else 999, nonzero)
            records.append((score, left_shift, right_shift, signs, profile, middle))
    records.sort(key=lambda item: item[0])
    print(f"m={m} size={size}")
    for record in records[:5]:
        score, left_shift, right_shift, signs, profile, middle = record
        print(
            f" shifts=({left_shift},{right_shift}) nonzero={score[1]} "
            f"entry_signs={signs} minor_profile={profile}",
            flush=True,
        )
