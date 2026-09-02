#!/usr/bin/env python3
"""Test diagonal Hankel/Toeplitz structure of the deflated checker inverse."""

from __future__ import annotations

import sympy as sp

from explore_bottom_q1_deflation_pencil_match import deflated


def cross_ratios(matrix: sp.Matrix, mode: str):
    groups: dict[int, set[sp.Expr]] = {}
    for i in range(matrix.rows - 1):
        for j in range(matrix.cols - 1):
            key = i + j if mode == "hankel" else j - i
            ratio = sp.factor(
                matrix[i, j] * matrix[i + 1, j + 1]
                / (matrix[i, j + 1] * matrix[i + 1, j])
            )
            groups.setdefault(key, set()).add(ratio)
    return all(len(values) == 1 for values in groups.values()), groups


for d in range(4, 16):
    middle = deflated(d)
    signs = sp.diag(*[(-1) ** i for i in range(middle.rows)])
    inverse = sp.simplify(signs * middle.inv() * signs)
    hankel, hgroups = cross_ratios(inverse, "hankel")
    toeplitz, tgroups = cross_ratios(inverse, "toeplitz")
    print(f"d={d}, diagonal-Hankel={hankel}, diagonal-Toeplitz={toeplitz}")
    if d <= 6:
        print(" hankel cross ratios:", hgroups)
