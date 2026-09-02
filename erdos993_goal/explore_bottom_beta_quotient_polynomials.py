#!/usr/bin/env python3
"""Factor polynomial columns after peeling the null-coordinate bidiagonal."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis


X = sp.symbols("x")


for d in range(3, 11):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    signs = checker(q)
    _, _, right, _, _ = null_coordinate_data(d)
    transformed = sp.simplify(signs * right * signs * basis)
    # Its first column is supported only in the first row.  Read the remaining
    # block as coefficient columns of degree q-2 polynomials.
    block = transformed[1:, 1:]
    print(f"d={d}")
    for column in range(block.cols):
        polynomial = sp.Poly(sum(block[row, column] * X**row for row in range(block.rows)), X)
        print(f" p={column+1}: {sp.factor(polynomial.as_expr())}")
