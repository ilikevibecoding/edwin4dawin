#!/usr/bin/env python3
"""Search structure in the checker inverse of the actual balanced tail."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def actual_checker(m: int) -> sp.Matrix:
    target = two_sided_data(2 * m + 3)[3][:m, :m]
    e = sp.diag(*[(-1) ** i for i in range(m)])
    return sp.simplify(e * target.inv() * e)


def boundary_normalize(matrix: sp.Matrix) -> sp.Matrix:
    return sp.Matrix(
        matrix.rows,
        matrix.cols,
        lambda i, j: sp.factor(matrix[i, j] * matrix[0, 0] / (matrix[i, 0] * matrix[0, j])),
    )


def shift(size: int) -> sp.Matrix:
    matrix = sp.zeros(size)
    for i in range(size - 1):
        matrix[i + 1, i] = 1
    return matrix


for m in range(2, 11):
    h = actual_checker(m)
    n = boundary_normalize(h)
    s = shift(m)
    displacements = {
        "Toeplitz": h - s * h * s.T,
        "Hankel": h - s * h * s,
        "commutator": s * h - h * s,
        "normalized_Toeplitz": n - s * n * s.T,
        "normalized_Hankel": n - s * n * s,
    }
    print(
        f"m={m}: symmetric={h == h.T}, persymmetric={h[::-1,::-1] == h.T}, "
        f"ranks={{" + ", ".join(f"{name}:{value.rank()}" for name, value in displacements.items()) + "}}",
        flush=True,
    )
    if m <= 5:
        print(" normalized=", n, flush=True)
