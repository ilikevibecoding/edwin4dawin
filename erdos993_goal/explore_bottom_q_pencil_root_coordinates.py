#!/usr/bin/env python3
"""Transform the full affine Q pencil to the null-root evaluation basis."""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data
from verify_bottom_universal_schur_tp import reverse_identity


def shape(matrix: sp.Matrix):
    return [
        "".join("+" if value > 0 else "-" if value < 0 else "." for value in matrix.row(i))
        for i in range(matrix.rows)
    ]


def evaluation_column(q: int, node):
    if node == "infinity":
        return sp.eye(q)[:, q - 1]
    return sp.Matrix([node**power for power in range(q)])


for d in range(3, 11):
    q = d - 1
    n = q - 1
    _, _, q0, q1, _ = homotopy_data(d)
    reversal = reverse_identity(q)
    form0 = q0 * reversal
    form1 = q1 * reversal
    roots = [sp.Rational(1, 5 + index) for index in range(n)]
    print(f"d={d} q={q}")
    for extra in (sp.Integer(0), sp.Rational(1, 4), sp.Rational(1, q + 4), "infinity"):
        columns = [evaluation_column(q, root) for root in roots]
        columns.append(evaluation_column(q, extra))
        transform = sp.Matrix.hstack(*columns)
        if transform.det() == 0:
            continue
        reduced0 = sp.simplify(transform.inv() * form0 * transform.inv().T)
        reduced1 = sp.simplify(transform.inv() * form1 * transform.inv().T)
        assert reduced1[-1, :] == sp.zeros(1, q)
        assert reduced1[:, -1] == sp.zeros(q, 1)
        print(
            f" extra={extra} G0={shape(reduced0)} G1={shape(reduced1)}",
            flush=True,
        )
        if d <= 5:
            print("  G0=", reduced0.applyfunc(sp.factor), flush=True)
            print("  G1=", reduced1.applyfunc(sp.factor), flush=True)
