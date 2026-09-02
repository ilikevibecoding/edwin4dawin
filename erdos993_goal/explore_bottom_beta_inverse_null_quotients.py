#!/usr/bin/env python3
"""Test whether null-coordinate bidiagonals peel off the beta dual factors."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import reverse_identity


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 11):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    reversal = reverse_identity(q)
    signs = checker(q)
    cdual = sp.simplify(signs * (reversal * basis.T * reversal).inv() * signs)
    bdual = sp.simplify(signs * basis.inv() * signs)
    _, left, right, _, _ = null_coordinate_data(d)
    left_quotient = sp.simplify(left.inv() * cdual)
    right_quotient = sp.simplify(bdual * right.inv())
    print(
        f"d={d}, left entries positive={all(x > 0 for x in left_quotient)}, "
        f"left first negative={first_negative_minor(left_quotient)}, "
        f"right entries positive={all(x > 0 for x in right_quotient)}, "
        f"right first negative={first_negative_minor(right_quotient)}"
    )
    if d <= 5:
        print(" left quotient:")
        print(left_quotient)
        print(" right quotient:")
        print(right_quotient)
