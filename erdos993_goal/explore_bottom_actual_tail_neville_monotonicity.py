#!/usr/bin/env python3
"""Compare bidiagonal/Neville coordinates in the two-step actual-tail recurrence."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data
from verify_bottom_universal_schur_tp import neville_parameters


def actual(m: int) -> sp.Matrix:
    return two_sided_data(2 * m + 3)[3][:m, :m]


def matched_pair(m: int):
    current = actual(m)[:-1, :-1]
    previous = actual(m - 1)
    n = previous.rows
    row_scales = [sp.factor(current[i, 0] / previous[i, 0]) for i in range(n)]
    column_scales = [
        sp.factor(current[0, j] / (row_scales[0] * previous[0, j]))
        for j in range(n)
    ]
    scaled_previous = sp.diag(*row_scales) * previous * sp.diag(*column_scales)
    return current, scaled_previous


def coordinates(matrix: sp.Matrix):
    row_multipliers, pivots = neville_parameters(matrix)
    column_multipliers, _ = neville_parameters(matrix.T)
    return row_multipliers, pivots, column_multipliers


for m in range(3, 8):
    current, previous = matched_pair(m)
    current_coordinates = coordinates(current)
    previous_coordinates = coordinates(previous)
    print(f"m={m}")
    for name, current_values, previous_values in zip(
        ("row", "pivot", "column"), current_coordinates, previous_coordinates
    ):
        signs = [sp.sign(sp.factor(p - c)) for c, p in zip(current_values, previous_values)]
        ratios = [sp.factor(c / p) for c, p in zip(current_values, previous_values)]
        print(
            f" {name}: previous-current signs={signs} ratios_current/previous={ratios}",
            flush=True,
        )
