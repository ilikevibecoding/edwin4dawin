#!/usr/bin/env python3
"""Explore exact structure of the checker-signed affine inverse pencil.

This is deliberately diagnostic: it prints primitive integer scalings,
nullvectors, displacement ranks, and Neville data for Q0 and Q1.
"""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


def primitive_integer_matrix(matrix: sp.Matrix) -> tuple[sp.Integer, sp.Matrix]:
    denominators = [sp.denom(sp.cancel(value)) for value in matrix]
    scale = sp.ilcm(*[int(value) for value in denominators])
    integral = matrix.applyfunc(lambda value: sp.Integer(scale) * value)
    common = sp.igcd(*[abs(int(value)) for value in integral if value])
    return sp.Integer(scale) / common, integral / common


def neville_table(matrix: sp.Matrix) -> tuple[list[list[sp.Expr]], list[sp.Expr]]:
    work = sp.Matrix(matrix)
    stages: list[list[sp.Expr]] = []
    for column in range(work.cols - 1):
        local: list[sp.Expr] = []
        for row in range(work.rows - 1, column, -1):
            multiplier = sp.factor(work[row, column] / work[row - 1, column])
            local.append(multiplier)
            work[row, :] = sp.simplify(work[row, :] - multiplier * work[row - 1, :])
        stages.append(local)
    return stages, [sp.factor(work[i, i]) for i in range(work.rows)]


for d in range(3, 10):
    _, _, q0, q1, _ = homotopy_data(d)
    scale0, integer0 = primitive_integer_matrix(q0)
    scale1, integer1 = primitive_integer_matrix(q1)
    print(f"d={d}, q={d-1}")
    print(f" Q0 integer scale={scale0}")
    print(integer0)
    print(f" Q1 integer scale={scale1}")
    print(integer1)
    print(" Q1 right nullspace:", [list(v) for v in q1.nullspace()])
    print(" Q1 left nullspace:", [list(v) for v in q1.T.nullspace()])
    null = q1.nullspace()[0]
    z = sp.symbols("z")
    print(" Q1 right-null polynomial:", sp.factor(sum(null[i] * z**i for i in range(d - 1))))
    left = q1.T.nullspace()[0]
    print(" Q1 left-null polynomial:", sp.factor(sum(left[i] * z**i for i in range(d - 1))))
    if d <= 7:
        for name, matrix in (("Q0", q0), ("Q1", q1)):
            stages, pivots = neville_table(matrix)
            print(f" {name} Neville stages:", stages)
            print(f" {name} pivots:", pivots)
