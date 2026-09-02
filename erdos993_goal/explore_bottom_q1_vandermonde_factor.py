#!/usr/bin/env python3
"""Factor the rank-q-1 checker pencil coefficient through its exact null roots."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 11):
    q = d - 1
    _, _, _, q1, _ = homotopy_data(d)
    right_nodes = [sp.Integer(r) for r in range(5, d + 3)]
    left_nodes = [sp.Rational(1, r) for r in range(d + 2, 4, -1)]
    right = sp.Matrix([[node**j for j in range(q)] for node in right_nodes])
    left = sp.Matrix([[node**i for node in left_nodes] for i in range(q)])

    # Use the leading square row block of left and column block of right to
    # recover the unique central factor, then audit the full identity.
    middle = sp.simplify(left[: q - 1, :].inv() * q1[: q - 1, : q - 1] * right[:, : q - 1].inv())
    assert sp.simplify(left * middle * right - q1) == sp.zeros(q)
    print(f"d={d}, middle={middle}")
    print(" first negative middle minor:", first_negative_minor(middle))
    signs = sp.diag(*[(-1) ** i for i in range(q - 1)])
    signed_middle = sp.simplify(signs * middle * signs)
    print(" first negative checker-middle minor:", first_negative_minor(signed_middle))
    print(" diagonal:", [sp.factor(middle[i, i]) for i in range(q - 1)])
    print(" offdiagonal nonzeros:", [(i, j, sp.factor(middle[i, j])) for i in range(q - 1) for j in range(q - 1) if i != j and middle[i, j]])
