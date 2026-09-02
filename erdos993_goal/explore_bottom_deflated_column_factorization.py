#!/usr/bin/env python3
"""Factor column polynomials of the deflated endpoint and its cut block."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


X = sp.symbols("x")


def column_polynomial(matrix: sp.Matrix, column: int) -> sp.Expr:
    return sp.factor(sum(matrix[row, column] * X**row for row in range(matrix.rows)))


for d in range(3, 10):
    _, _, _, middle0, middle1 = null_coordinate_data(d)
    endpoint = sp.simplify(middle0 + middle1)
    cut = middle1[:-1, 1:]
    print(f"d={d}")
    for name, matrix in (("endpoint", endpoint), ("cut", cut)):
        factors = [sp.factor_list(column_polynomial(matrix, j)) for j in range(matrix.cols)]
        degrees = [sp.Poly(column_polynomial(matrix, j), X).degree() for j in range(matrix.cols)]
        print(f" {name} degrees={degrees} factors={factors}", flush=True)
