#!/usr/bin/env python3
"""Factor the target through forward-b and backward-a positive Newton bases."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis, two_sided_data
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def forward_difference(size: int) -> sp.Matrix:
    return sp.Matrix(
        size,
        size,
        lambda p, k: (-1) ** (k - p) * sp.binomial(k, p) if p <= k else 0,
    )


def backward_difference(size: int) -> sp.Matrix:
    n = size - 1
    matrix = sp.zeros(size)
    for k in range(size):
        for s in range(k + 1):
            matrix[n - s, k] = (-1) ** s * sp.binomial(k, s)
    return matrix


def all_minors(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                yield rows, columns, sp.factor(matrix.extract(rows, columns).det())


def minor_profile(matrix: sp.Matrix):
    positive = zero = negative = 0
    first_negative = None
    for rows, columns, determinant in all_minors(matrix):
        sign = sp.sign(determinant)
        positive += int(bool(sign == 1))
        zero += int(bool(sign == 0))
        negative += int(bool(sign == -1))
        if sign == -1 and first_negative is None:
            first_negative = (rows, columns, determinant)
    return positive, zero, negative, first_negative


for d in range(3, 16):
    q = d - 1
    reversal = reverse_identity(q)
    signs = sp.diag(*[(-1) ** k for k in range(q)])
    scaling = sp.diag(*[4**p for p in range(q)])
    basis = coefficient_matrix(cleared_catalan_basis(q))
    gamma = basis * scaling.inv()

    transform_b = forward_difference(q) * signs * reversal
    transform_a = backward_difference(q) * signs * reversal
    newton_b = sp.simplify(gamma * transform_b)
    newton_a = sp.simplify(gamma * transform_a)
    assert all(value >= 0 for value in newton_b)
    assert all(value >= 0 for value in newton_a)

    right_b = sp.simplify(transform_b.inv() * scaling)
    right_a = sp.simplify(transform_a.inv() * scaling)
    kernel = central_inverse_from_blocks(d).inv()
    _, _, _, target = two_sided_data(d)
    records = []
    families = {
        "b": (newton_b, right_b),
        "a": (newton_a, right_a),
    }
    for left_name, (outside_left, inner_left) in families.items():
        for right_name, (right_basis, inner_right) in families.items():
            middle = sp.simplify(
                inner_left * kernel * reversal * inner_right.T * reversal
            )
            outside_right = reversal * right_basis.T * reversal
            assert sp.simplify(outside_left * middle * outside_right - target) == sp.zeros(q)
            entry_signs = sorted(set(sp.sign(value) for value in middle))
            profile = minor_profile(middle) if d <= 8 else None
            records.append((left_name + right_name, entry_signs, profile))
    print(f"d={d} records={records}", flush=True)
