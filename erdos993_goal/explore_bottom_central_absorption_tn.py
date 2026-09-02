#!/usr/bin/env python3
"""Test whether the central M-matrix is absorbed by a Neville quotient."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker, initial_minors
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks


def all_minors(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                yield rows, columns, sp.factor(matrix.extract(rows, columns).det())


for d in range(3, 16):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    signs = checker(q)
    _, _, right_full, _, _ = null_coordinate_data(d)
    right_quotient = sp.simplify(signs * basis.inv() * signs * right_full.inv())
    central = central_inverse_from_blocks(d)
    absorbed = sp.simplify(central * right_quotient)
    first_bad = None
    positive = zero = 0
    source = all_minors(absorbed) if d <= 7 else (
        (tuple(range(minor.rows)), tuple(), sp.factor(minor.det(method="domain-ge")))
        for minor in initial_minors(absorbed)
    )
    for rows, columns, determinant in source:
        if determinant < 0:
            first_bad = (rows, columns, determinant)
            break
        positive += int(bool(determinant > 0))
        zero += int(bool(determinant == 0))
    print(
        f"d={d} absorbed_entry_signs={sorted(set(sp.sign(x) for x in absorbed))} "
        f"positive={positive} zero={zero} first_bad={first_bad}",
        flush=True,
    )
    if first_bad is not None:
        break
