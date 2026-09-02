#!/usr/bin/env python3
"""Test and inspect the c=1/2 Newton-grid middle matrix."""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import initial_minors
from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis, two_sided_data
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, neville_parameters, reverse_identity


def data(d: int):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    newton = coefficient_matrix(
        [sp.Poly(sp.rf(X + sp.Rational(1, 2), k), X) for k in range(q)]
    )
    connection = sp.simplify(newton.inv() * basis)
    kernel = central_inverse_from_blocks(d).inv()
    reversal = reverse_identity(q)
    middle = sp.simplify(connection * kernel * reversal * connection.T * reversal)
    outside_right = reversal * newton.T * reversal
    _, _, _, target = two_sided_data(d)
    assert sp.simplify(newton * middle * outside_right - target) == sp.zeros(q)
    return newton, connection, middle


for d in range(3, 21):
    _, connection, middle = data(d)
    try:
        row_multipliers, pivots = neville_parameters(middle)
        column_multipliers, _ = neville_parameters(middle.T)
        parameters = row_multipliers + pivots + column_multipliers
        first_bad = next((sp.factor(value) for value in parameters if value <= 0), None)
    except AssertionError as error:
        first_bad = str(error)
        parameters = []
    initial_first_bad = None
    for minor in initial_minors(middle):
        determinant = sp.factor(minor.det(method="domain-ge"))
        if determinant <= 0:
            initial_first_bad = determinant
            break
    print(
        f"d={d} q={d-1} entry_signs={sorted(set(sp.sign(v) for v in middle))} "
        f"neville_count={len(parameters)} first_bad={first_bad} "
        f"initial_first_bad={initial_first_bad}",
        flush=True,
    )
    if first_bad is not None or initial_first_bad is not None:
        break
