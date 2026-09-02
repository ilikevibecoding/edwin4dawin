#!/usr/bin/env python3
"""Inspect the nilpotent generator after conjugating the direct homotopy."""

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 14):
    q = d - 1
    B = coefficient_matrix(cleared_catalan_basis(q))
    J = reverse_identity(q)
    C = J * B.T * J
    Z = central_inverse_from_blocks(d)
    D = sp.diag(*Z.diagonal())
    P = sp.simplify(D.inv() * (D - Z))
    left = sp.simplify(B * P * B.inv())
    right = sp.simplify(C.inv() * (D - Z) * D.inv() * C)
    print(f"d={d}")
    for name, matrix in (("B P B^-1", left), ("C^-1 O D^-1 C", right)):
        print(name)
        print(matrix)
        print("signs")
        for row in range(q):
            print(" ", "".join("+" if x > 0 else "-" if x < 0 else "0" for x in matrix.row(row)))
