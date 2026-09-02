#!/usr/bin/env python3
"""Inspect one-sided products in the deflated variable cut layer W."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_beta_neville_quotient import audit_nonnegative_minors
from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 10):
    q = d - 1
    n = q - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    signs = checker(q)
    reversal = reverse_identity(q)
    _, left_full, right_full, _, middle1 = null_coordinate_data(d)
    right_quotient = sp.simplify(signs * basis.inv() * signs * right_full.inv())
    left_quotient = sp.simplify(reversal * right_quotient.T * reversal)
    central = central_inverse_from_blocks(d)
    off = central - sp.diag(*central.diagonal())
    signed_off = signs * off * signs

    left_block = left_quotient[:n, :n]
    central_block = signed_off[:n, 1:q]
    right_block = right_quotient[1:q, 1:q]
    assert sp.simplify(left_block * central_block * right_block - middle1[:n, 1:q]) == sp.zeros(n)

    candidates = {
        "central": central_block,
        "central*right": sp.simplify(central_block * right_block),
        "left*central": sp.simplify(left_block * central_block),
        "full": sp.simplify(left_block * central_block * right_block),
    }
    print(f"d={d}")
    for name, matrix in candidates.items():
        print(
            f" {name}: entry signs={sorted(set(sp.sign(x) for x in matrix))}, "
            f"first negative minor={first_negative_minor(matrix)}"
        )
