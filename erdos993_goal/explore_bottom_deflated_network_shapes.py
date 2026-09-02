#!/usr/bin/env python3
"""Print zero/sign shapes of the deflated factors for network design."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def shape(matrix: sp.Matrix) -> list[str]:
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


for d in range(3, 9):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    signs = checker(q)
    reversal = reverse_identity(q)
    _, left_full, right_full, middle0, middle1 = null_coordinate_data(d)
    right = sp.simplify(signs * basis.inv() * signs * right_full.inv())
    left = reversal * right.T * reversal
    central = central_inverse_from_blocks(d)
    assert sp.simplify(middle0 - left * sp.diag(*central.diagonal()) * right) == sp.zeros(q)
    off_diagonal = signs * (central - sp.diag(*central.diagonal())) * signs
    assert sp.simplify(middle1 - left * off_diagonal * right) == sp.zeros(q)
    print(f"d={d}")
    for name, matrix in (
        ("left", left),
        ("right", right),
        ("middle0", middle0),
        ("middle1", middle1),
        ("cut", middle1[:-1, 1:]),
    ):
        print(f" {name}: {shape(matrix)}")
