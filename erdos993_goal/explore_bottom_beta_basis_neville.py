#!/usr/bin/env python3
"""Inspect Neville factors of the beta-basis coefficient matrix."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import neville_parameters


for q in range(1, 10):
    basis = coefficient_matrix(cleared_catalan_basis(q))
    left_mult, left_pivots = neville_parameters(basis)
    right_mult, right_pivots = neville_parameters(basis.T)
    print(f"q={q}")
    print(" column Neville:", [sp.factor(x) for x in left_mult])
    print(" column pivots:", [sp.factor(x) for x in left_pivots])
    print(" row Neville:", [sp.factor(x) for x in right_mult])
    print(" row pivots:", [sp.factor(x) for x in right_pivots])
