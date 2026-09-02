#!/usr/bin/env python3
"""Express Q1 J in the evaluation basis at its null polynomial's roots."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data
from verify_bottom_universal_schur_tp import reverse_identity


def shape(matrix: sp.Matrix):
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


def bandwidth(matrix: sp.Matrix):
    positions = [(i, j) for i in range(matrix.rows) for j in range(matrix.cols) if matrix[i, j] != 0]
    return max((abs(i - j) for i, j in positions), default=0)


for d in range(3, 16):
    q = d - 1
    n = q - 1
    _, _, _, q1, _ = homotopy_data(d)
    form = sp.simplify(q1 * reverse_identity(q))
    # ker(Q1 J)=J E coeff((x+5)_n), the reversed coefficients of p(-x).
    # Its associated polynomial has roots 1/5,1/6,...,1/(n+4).
    roots = [sp.Rational(1, 5 + index) for index in range(n)]
    vandermonde = sp.Matrix(q, n, lambda power, column: roots[column] ** power)
    square = vandermonde[:n, :]
    reduced = sp.simplify(square.inv() * form[:n, :n] * square.inv().T)
    assert sp.simplify(vandermonde * reduced * vandermonde.T - form) == sp.zeros(q)
    nonzero = sum(int(bool(value != 0)) for value in reduced)
    print(
        f"d={d} n={n} nonzero={nonzero}/{n*n} bandwidth={bandwidth(reduced)} "
        f"shape={shape(reduced)}",
        flush=True,
    )
    if d <= 7:
        print(reduced.applyfunc(sp.factor), flush=True)
