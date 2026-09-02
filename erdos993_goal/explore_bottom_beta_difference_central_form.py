#!/usr/bin/env python3
"""Transform the central form through exact forward differences of the beta basis."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def difference_matrix(size: int) -> sp.Matrix:
    # Column k forms Delta^k gamma_0 from gamma_0,...,gamma_k.
    return sp.Matrix(
        size,
        size,
        lambda p, k: (-1) ** (k - p) * sp.binomial(k, p) if p <= k else 0,
    )


def shape(matrix: sp.Matrix):
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


def minor_profile(matrix: sp.Matrix):
    positive = zero = negative = 0
    first_negative = None
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                determinant = sp.factor(matrix.extract(rows, columns).det())
                sign = sp.sign(determinant)
                positive += int(bool(sign == 1))
                zero += int(bool(sign == 0))
                negative += int(bool(sign == -1))
                if sign == -1 and first_negative is None:
                    first_negative = (rows, columns, determinant)
    return positive, zero, negative, first_negative


for d in range(3, 13):
    q = d - 1
    n = q - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    scaling = sp.diag(*[4**p for p in range(q)])
    gamma = basis * scaling.inv()
    difference = difference_matrix(q)
    newton = sp.simplify(gamma * difference)
    expected = coefficient_matrix(
        [
            sp.Poly(
                sp.ff(sp.Rational(-3, 2), k)
                * sp.rf(X + k + 5, n - k),
                X,
            )
            for k in range(q)
        ]
    )
    assert newton == expected
    change = sp.simplify(difference.inv() * scaling)
    central_form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    transformed = sp.simplify(change * central_form * change.T)
    orientations = {
        "plain": transformed,
        "reverse": reverse_identity(q) * transformed * reverse_identity(q),
        "right_reverse": transformed * reverse_identity(q),
    }
    records = []
    for name, matrix in orientations.items():
        entry_negative = sum(int(bool(value < 0)) for value in matrix)
        profile = minor_profile(matrix) if entry_negative == 0 and d <= 8 else None
        records.append((entry_negative, name, shape(matrix), profile))
    print(f"d={d} newton_shape={shape(newton)} records={records}", flush=True)
