#!/usr/bin/env python3
"""Inspect Catalan factors inside the affine checker-inverse derivative Q1."""

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import (
    catalan_toeplitz,
    central_inverse_from_blocks,
    reverse_identity,
)


for d in range(3, 13):
    q = d - 1
    B = coefficient_matrix(cleared_catalan_basis(q))
    J = reverse_identity(q)
    C = J * B.T * J
    E = checker(q)
    U = catalan_toeplitz(q).T  # upper, U[p,r]=Catalan_(r-p+1)
    left = sp.simplify(E * C.inv() * U)
    right = sp.simplify(U * B.inv() * E)
    print(f"d={d}")
    for name, matrix in (("E C^-1 U", left), ("U B^-1 E", right)):
        print(" ", name)
        for row in range(q):
            print("   ", "".join("+" if x > 0 else "-" if x < 0 else "0" for x in matrix.row(row)))
