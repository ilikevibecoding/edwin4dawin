#!/usr/bin/env python3
"""Search small Newton shifts after the c=1 and c=1/2 thresholds."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, neville_parameters, reverse_identity


def middle_matrix(d: int, c: sp.Rational):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    newton = coefficient_matrix([sp.Poly(sp.rf(X + c, k), X) for k in range(q)])
    connection = sp.simplify(newton.inv() * basis)
    kernel = central_inverse_from_blocks(d).inv()
    reversal = reverse_identity(q)
    return sp.simplify(connection * kernel * reversal * connection.T * reversal)


candidates = [sp.Rational(numerator, 16) for numerator in range(0, 17)]
for d in range(8, 14):
    records = []
    for c in candidates:
        middle = middle_matrix(d, c)
        try:
            row_multipliers, pivots = neville_parameters(middle)
            column_multipliers, _ = neville_parameters(middle.T)
            parameters = row_multipliers + pivots + column_multipliers
            negatives = sum(int(bool(value < 0)) for value in parameters)
            zeros = sum(int(bool(value == 0)) for value in parameters)
            first_bad = next((sp.factor(value) for value in parameters if value <= 0), None)
        except AssertionError as error:
            negatives = 999
            zeros = 999
            first_bad = str(error)
        records.append((negatives, zeros, c, first_bad))
    records.sort(key=lambda item: (item[0], item[1], item[2]))
    print(f"d={d} best={records[:10]}", flush=True)
