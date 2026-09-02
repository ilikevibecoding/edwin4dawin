#!/usr/bin/env python3
"""Test the rectangular Catalan factorization of the deflated cut layer W."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import catalan_toeplitz, reverse_identity


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
    n = q - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    eq = checker(q)
    en = checker(n)
    reversal = reverse_identity(q)
    _, left_full, right_full, _, middle1 = null_coordinate_data(d)
    right_quotient = sp.simplify(eq * basis.inv() * eq * right_full.inv())
    left_quotient = sp.simplify(reversal * right_quotient.T * reversal)
    left_block = left_quotient[:n, :n]
    right_block = right_quotient[1:q, 1:q]

    catalan = catalan_toeplitz(q).T
    weights = sp.diag(*[sp.Rational(1, sp.binomial(d, r + 1)) for r in range(q)])
    left_rectangle = sp.simplify(left_block * en * catalan[:n, :] * eq)
    right_rectangle = sp.simplify(eq * catalan[:, 1:q] * en * right_block)
    cut = middle1[:n, 1:q]
    assert sp.simplify(left_rectangle * weights * right_rectangle - cut) == sp.zeros(n)
    print(
        f"d={d}, left entries positive={all(x > 0 for x in left_rectangle)}, "
        f"left first negative={first_negative_minor(left_rectangle)}, "
        f"right entries positive={all(x > 0 for x in right_rectangle)}, "
        f"right first negative={first_negative_minor(right_rectangle)}"
    )
    if d <= 5:
        print(" left rectangle:")
        print(left_rectangle)
        print(" right rectangle:")
        print(right_rectangle)
