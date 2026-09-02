#!/usr/bin/env python3
"""Test whether local-null deflation of Q1 returns a smaller affine pencil."""

from __future__ import annotations

import sympy as sp

from verify_bottom_affine_rank_defect import q1_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


X = sp.symbols("x")
S = sp.symbols("s")


def deflated(d: int) -> sp.Matrix:
    q = d - 1
    n = q - 1
    _, _, q1 = q1_data(d)
    polynomial = sp.expand(sp.rf(X + 5, n))
    coefficients = [polynomial.coeff(X, i) for i in range(q)]
    left = sp.zeros(q, n)
    right = sp.zeros(n, q)
    for j in range(n):
        left[j, j] = coefficients[n - j - 1]
        left[j + 1, j] = coefficients[n - j]
        right[j, j] = coefficients[j + 1]
        right[j, j + 1] = coefficients[j]
    return sp.simplify(left[:n, :].inv() * q1[:n, :n] * right[:, :n].inv())


def diagonally_equivalent(first: sp.Matrix, second: sp.Matrix) -> bool:
    size = first.rows
    row_scales = [sp.cancel(first[i, 0] / second[i, 0]) for i in range(size)]
    column_scales = [
        sp.cancel(first[0, j] / (row_scales[0] * second[0, j]))
        for j in range(size)
    ]
    return sp.simplify(sp.diag(*row_scales) * second * sp.diag(*column_scales) - first) == sp.zeros(size)


def main() -> None:
    for d in range(4, 11):
        middle = deflated(d)
        _, _, q0, q1, _ = homotopy_data(d - 1)
        pencil = q0 + S * q1
        target_cross_ratio = sp.cancel(middle[0, 0] * middle[1, 1] / (middle[0, 1] * middle[1, 0]))
        pencil_cross_ratio = sp.cancel(pencil[0, 0] * pencil[1, 1] / (pencil[0, 1] * pencil[1, 0]))
        candidates = sp.solve(sp.together(pencil_cross_ratio - target_cross_ratio), S)
        matches = []
        for candidate in candidates:
            if candidate.is_rational and diagonally_equivalent(middle, pencil.subs(S, candidate)):
                matches.append(candidate)
        print(f"d={d}, candidates={candidates}, exact_matches={matches}")


if __name__ == "__main__":
    main()
