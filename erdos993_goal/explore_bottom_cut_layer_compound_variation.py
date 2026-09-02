#!/usr/bin/env python3
"""Inspect sign variation in compounds across the two-sided cut smoothing."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def compound(matrix: sp.Matrix, order: int):
    row_sets = list(itertools.combinations(range(matrix.rows), order))
    column_sets = list(itertools.combinations(range(matrix.cols), order))
    result = sp.Matrix(
        len(row_sets),
        len(column_sets),
        lambda i, j: sp.factor(
            matrix.extract(row_sets[i], column_sets[j]).det(method="domain-ge")
        ),
    )
    return result


def changes(values):
    signs = [sp.sign(value) for value in values if value != 0]
    return sum(signs[i] != signs[i - 1] for i in range(1, len(signs)))


def variation_summary(matrix: sp.Matrix):
    row_changes = [changes(matrix.row(i)) for i in range(matrix.rows)]
    column_changes = [changes(matrix.col(j)) for j in range(matrix.cols)]
    negatives = sum(int(bool(value < 0)) for value in matrix)
    positives = sum(int(bool(value > 0)) for value in matrix)
    return max(row_changes, default=0), max(column_changes, default=0), negatives, positives


for d in range(4, 10):
    q = d - 1
    n = q - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    signs = checker(q)
    reversal = reverse_identity(q)
    _, _, right_full, _, middle1 = null_coordinate_data(d)
    right_quotient = sp.simplify(signs * basis.inv() * signs * right_full.inv())
    left_quotient = sp.simplify(reversal * right_quotient.T * reversal)
    central = central_inverse_from_blocks(d)
    off = central - sp.diag(*central.diagonal())
    signed_off = signs * off * signs
    left = left_quotient[:n, :n]
    cut = signed_off[:n, 1:q]
    right = right_quotient[1:q, 1:q]
    print(f"d={d}")
    for order in range(1, n + 1):
        lc = compound(left, order)
        cc = compound(cut, order)
        rc = compound(right, order)
        assert compound(left * cut * right, order) == lc * cc * rc
        print(
            f" k={order}: central={variation_summary(cc)}, "
            f"left-central={variation_summary(lc * cc)}, "
            f"central-right={variation_summary(cc * rc)}, "
            f"full={variation_summary(lc * cc * rc)}"
        )
