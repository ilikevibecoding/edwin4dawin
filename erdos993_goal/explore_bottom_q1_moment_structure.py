#!/usr/bin/env python3
"""Test whether the rank-deficient Q1 form is diagonally Hankel or Toeplitz."""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data
from verify_bottom_universal_schur_tp import reverse_identity


def diagonal_hankel(matrix: sp.Matrix):
    n = matrix.rows
    # Solve log-free multiplicative equations M_ij=r_i c_j h_{i+j}
    variables = sp.symbols(f"r0:{n} c0:{n} h0:{2*n-1}", nonzero=True)
    # Instead use cross-ratio necessary identities after boundary normalization.
    normalized = sp.Matrix(
        n,
        n,
        lambda i, j: sp.factor(
            matrix[i, j] * matrix[0, 0] / (matrix[i, 0] * matrix[0, j])
        )
        if matrix[i, 0] and matrix[0, j]
        else sp.nan,
    )
    # For a diagonally Hankel matrix, normalized entries obey a rank-one
    # quotient system along each anti-diagonal. Ask SymPy for small n by
    # fixing r_0=c_0=1 and solving the rational polynomial equations.
    r = [sp.Integer(1)] + list(sp.symbols(f"r1:{n}"))
    c = [sp.Integer(1)] + list(sp.symbols(f"c1:{n}"))
    h = list(sp.symbols(f"h0:{2*n-1}"))
    equations = [
        sp.Eq(matrix[i, j], r[i] * c[j] * h[i + j])
        for i in range(n)
        for j in range(n)
        if matrix[i, j] != 0
    ]
    return bool(sp.solve(equations, r[1:] + c[1:] + h, dict=True, simplify=False))


for d in range(3, 9):
    q = d - 1
    _, _, _, q1, _ = homotopy_data(d)
    symmetric = q1 * reverse_identity(q)
    print(
        f"d={d} symmetric={symmetric == symmetric.T} "
        f"rank={symmetric.rank()} diagonal_hankel={diagonal_hankel(symmetric)}",
        flush=True,
    )
