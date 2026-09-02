#!/usr/bin/env python3
"""Search positive Newton grids (x+c)_k that make the central middle TN."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis, two_sided_data
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def newton_basis(size: int, c: sp.Rational) -> sp.Matrix:
    return coefficient_matrix([sp.Poly(sp.rf(X + c, k), X) for k in range(size)])


def minor_score(matrix: sp.Matrix):
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
    return negative, positive, zero, first_negative


for d in range(3, 9):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    kernel = central_inverse_from_blocks(d).inv()
    reversal = reverse_identity(q)
    _, _, _, target = two_sided_data(d)
    records = []
    candidates = [sp.Rational(numerator, 2) for numerator in range(1, 2 * d + 15)]
    for c in candidates:
        newton = newton_basis(q, c)
        connection = sp.simplify(newton.inv() * basis)
        middle = sp.simplify(connection * kernel * reversal * connection.T * reversal)
        outside_right = reversal * newton.T * reversal
        assert sp.simplify(newton * middle * outside_right - target) == sp.zeros(q)
        score = minor_score(middle)
        entry_negative = sum(int(bool(value < 0)) for value in middle)
        records.append((score[0], entry_negative, c, score[1], score[2], score[3]))
    records.sort(key=lambda item: item[:2])
    print(f"d={d} best={records[:12]}", flush=True)
