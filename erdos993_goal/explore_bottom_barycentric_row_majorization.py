#!/usr/bin/env python3
"""Test prefix-majorization of adjacent rows of the compressed kernel H."""

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def super_ballot(size: int) -> sp.Matrix:
    return sp.Matrix(
        size,
        size,
        lambda row, column: (
            sp.Rational(2 * row + 1, column + 1)
            * sp.binomial(2 * row, row)
            * sp.binomial(2 * (column - row), column - row)
            if row <= column
            else 0
        ),
    )


for d in range(3, 31):
    q = d - 1
    central_form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    transform = super_ballot(q)
    compressed = sp.simplify(transform * central_form * transform.T)
    peak = (d + 1) // 3 - 1
    failures = []
    counts = {"positive": 0, "negative": 0}
    for row in range(1, q):
        expected = 1 if row <= peak else -1
        running = sp.Integer(0)
        for column in range(q):
            running = sp.factor(running + compressed[row, column] - compressed[row - 1, column])
            if expected * running <= 0:
                failures.append((row, column, running, expected))
                break
            counts["positive" if expected > 0 else "negative"] += 1
        if failures:
            break
    print(f"d={d}, peak={peak}, counts={counts}, first_failure={failures[:1]}")
