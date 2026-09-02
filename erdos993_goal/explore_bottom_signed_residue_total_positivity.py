#!/usr/bin/env python3
"""Test total positivity of the row-signed barycentric residue matrix."""

import itertools

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def all_rectangular_minors(matrix: sp.Matrix):
    positive = negative = zero = 0
    first_bad = None
    for order in range(1, min(matrix.rows, matrix.cols) + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value > 0:
                    positive += 1
                elif value < 0:
                    negative += 1
                    first_bad = first_bad or (rows, columns, value)
                else:
                    zero += 1
    return positive, negative, zero, first_bad


for d in range(3, 11):
    q = d - 1
    basis = cleared_catalan_basis(q)
    variable = basis[0].gens[0]
    central_form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    x_nodes = [-3 - row for row in range(d)]
    y_nodes = list(reversed(range(q)))
    x_eval = sp.Matrix(d, q, lambda row, column: basis[column].eval(x_nodes[row]))
    y_eval = sp.Matrix(q, q, lambda row, column: basis[column].eval(y_nodes[row]))
    kernel = sp.simplify(x_eval * central_form * y_eval.T)
    derivatives = sp.diag(
        *[
            (-1) ** row * sp.factorial(row) * sp.factorial(d - 1 - row)
            for row in range(d)
        ]
    )
    residues = sp.simplify(derivatives.inv() * kernel)
    peak = (d + 1) // 3 - 1
    signs = sp.diag(*[1 if row <= peak else -1 for row in range(d)])
    signed = sp.simplify(signs * residues)
    assert all(value > 0 for value in signed)
    deletion_results = []
    for deleted in sorted({peak, peak + 1}):
        square = signed.extract([row for row in range(d) if row != deleted], range(q))
        if d <= 8:
            square_counts = all_rectangular_minors(square)
            deletion_results.append(
                (deleted, square_counts[1], square_counts[2], square_counts[3])
            )
        else:
            deletion_results.append((deleted, None, None, None))
    if d <= 8:
        counts = all_rectangular_minors(signed)
        print(
            f"d={d}: +{counts[0]} -{counts[1]} 0={counts[2]}, "
            f"first_bad={counts[3]}, deletions={deletion_results}"
        )
    else:
        # Record initial/boundary minors at larger sizes.
        bad = []
        for order in range(1, q + 1):
            row_blocks = [range(start, start + order) for start in range(d - order + 1)]
            column_blocks = [range(start, start + order) for start in range(q - order + 1)]
            for rows in row_blocks:
                for columns in column_blocks:
                    value = sp.factor(signed.extract(rows, columns).det())
                    if value <= 0:
                        bad.append((tuple(rows), tuple(columns), value))
                        break
                if bad:
                    break
            if bad:
                break
        print(f"d={d}: contiguous_minor_first_bad={bad[:1]}")
