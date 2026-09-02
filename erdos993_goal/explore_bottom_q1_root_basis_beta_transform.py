#!/usr/bin/env python3
"""Inspect how the root-evaluation Vandermonde sits in the beta basis."""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import reverse_identity


def shape(matrix: sp.Matrix):
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


for d in range(3, 13):
    q = d - 1
    n = q - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    roots = [sp.Rational(1, 5 + index) for index in range(n)]
    vandermonde = sp.Matrix(q, n, lambda power, column: roots[column] ** power)
    transformed = sp.simplify(basis.inv() * checker(q) * reverse_identity(q) * vandermonde)
    print(
        f"d={d} shape={shape(transformed)} rank={transformed.rank()}",
        flush=True,
    )
    if d <= 7:
        print(transformed.applyfunc(sp.factor), flush=True)
