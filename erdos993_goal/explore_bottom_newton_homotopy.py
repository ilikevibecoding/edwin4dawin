#!/usr/bin/env python3
"""Inspect the affine complementary pencil after a rising-factorial change."""

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 8):
    q = d - 1
    reversal = reverse_identity(q)
    checker = sp.diag(*[(-1) ** index for index in range(q)])
    newton = coefficient_matrix(
        [sp.Poly(sp.rf(X, degree), X) for degree in range(q)]
    )
    basis = coefficient_matrix(cleared_catalan_basis(q))
    connection = sp.simplify(newton.inv() * basis)
    central_inverse = central_inverse_from_blocks(d)
    diagonal = sp.diag(*central_inverse.diagonal())
    right = reversal * connection.T * reversal
    constant = sp.simplify(
        checker * right.inv() * diagonal * connection.inv() * checker
    )
    linear = sp.simplify(
        checker
        * right.inv()
        * (central_inverse - diagonal)
        * connection.inv()
        * checker
    )
    print(f"d={d}")
    print("Q0=")
    print(constant)
    print("Q1=")
    print(linear)
