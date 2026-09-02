#!/usr/bin/env python3
"""Inspect the c=1 Newton-grid middle matrix in the bottom TP factorization."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis, two_sided_data
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, neville_parameters, reverse_identity


def data(d: int):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    newton = coefficient_matrix([sp.Poly(sp.rf(X + 1, k), X) for k in range(q)])
    connection = sp.simplify(newton.inv() * basis)
    kernel = central_inverse_from_blocks(d).inv()
    reversal = reverse_identity(q)
    middle = sp.simplify(connection * kernel * reversal * connection.T * reversal)
    outside_right = reversal * newton.T * reversal
    _, _, _, target = two_sided_data(d)
    assert sp.simplify(newton * middle * outside_right - target) == sp.zeros(q)
    return newton, connection, middle


def shape(matrix: sp.Matrix):
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


for d in range(3, 13):
    newton, connection, middle = data(d)
    row_multipliers, pivots = neville_parameters(middle)
    column_multipliers, _ = neville_parameters(middle.T)
    parameters = row_multipliers + pivots + column_multipliers
    passing = all(value >= 0 for value in parameters)
    print(
        f"d={d} shape={shape(middle)} neville_nonnegative={passing} "
        f"row={list(map(sp.factor,row_multipliers))} "
        f"pivots={list(map(sp.factor,pivots))} "
        f"column={list(map(sp.factor,column_multipliers))}",
        flush=True,
    )
    if d <= 6:
        print(" middle=", middle.applyfunc(sp.factor), flush=True)
