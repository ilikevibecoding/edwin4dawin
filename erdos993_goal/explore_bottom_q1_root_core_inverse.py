#!/usr/bin/env python3
"""Inspect inverse and sign regularity of the triangular root core."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker, homotopy_data
from verify_bottom_universal_schur_tp import reverse_identity


def triangular_core(d: int):
    q = d - 1
    n = q - 1
    _, _, _, q1, _ = homotopy_data(d)
    form = q1 * reverse_identity(q)
    roots = [sp.Rational(1, 5 + index) for index in range(n)]
    vandermonde = sp.Matrix(q, n, lambda power, column: roots[column] ** power)
    square = vandermonde[:n, :]
    reduced = sp.simplify(square.inv() * form[:n, :n] * square.inv().T)
    return sp.simplify(
        (-1) ** (n - 1) * checker(n) * reduced * checker(n) * reverse_identity(n)
    )


def shape(matrix: sp.Matrix):
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


def bandwidth(matrix: sp.Matrix):
    return max(
        (abs(i - j) for i in range(matrix.rows) for j in range(matrix.cols) if matrix[i, j]),
        default=0,
    )


for d in range(3, 16):
    core = triangular_core(d)
    inverse = sp.simplify(core.inv())
    signed_inverse = sp.simplify(checker(core.rows) * inverse * checker(core.rows))
    print(
        f"d={d} n={core.rows} inverse_bandwidth={bandwidth(inverse)} "
        f"inverse_shape={shape(inverse)} signed_inverse_shape={shape(signed_inverse)}",
        flush=True,
    )
    if d <= 8:
        print(" inverse=", inverse.applyfunc(sp.factor), flush=True)
