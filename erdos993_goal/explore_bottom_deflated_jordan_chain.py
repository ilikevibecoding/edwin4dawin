#!/usr/bin/env python3
"""Build the canonical zero-first-coordinate Jordan chain of the deflated relative nilpotent."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, min(matrix.shape) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 8):
    _, _, _, m0, m1 = null_coordinate_data(d)
    q = d - 1
    relative = sp.simplify(m0.inv() * m1)
    chain = [sp.eye(q)[:, 0]]
    tail = relative[:, 1:q]
    for _ in range(1, q):
        solution = sp.simplify(tail.solve_least_squares(chain[-1]))
        vector = sp.Matrix.vstack(sp.zeros(1, 1), solution)
        assert sp.simplify(relative * vector - chain[-1]) == sp.zeros(q, 1)
        chain.append(vector)
    jordan_basis = sp.Matrix.hstack(*chain)
    shift = sp.zeros(q)
    for j in range(1, q):
        shift[j - 1, j] = 1
    assert sp.simplify(relative * jordan_basis - jordan_basis * shift) == sp.zeros(q)
    tail_basis = jordan_basis[1:q, 1:q]
    tail_inverse = sp.simplify(tail_basis.inv())
    alternating = sp.diag(*[(-1) ** r for r in range(q - 1)])
    print(f"d={d}")
    for name, matrix in (
        ("S", jordan_basis),
        ("M0*S", sp.simplify(m0 * jordan_basis)),
        ("S^-1", sp.simplify(jordan_basis.inv())),
        ("D*T", sp.simplify(alternating * tail_basis)),
        ("D*T^-1", sp.simplify(alternating * tail_inverse)),
        ("T^-1*D", sp.simplify(tail_inverse * alternating)),
        ("D*T^-1*D", sp.simplify(alternating * tail_inverse * alternating)),
    ):
        signs = sorted(set(sp.sign(x) for x in matrix))
        print(f" {name}: signs={signs}, first negative={first_negative_minor(matrix)}")
    if d <= 5:
        print(jordan_basis)
