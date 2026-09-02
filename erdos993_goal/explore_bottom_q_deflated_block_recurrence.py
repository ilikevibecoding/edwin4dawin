#!/usr/bin/env python3
"""Test d-to-d-1 recurrence of the top-right deflated affine block."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


for d in range(4, 16):
    _, _, _, middle0, middle1 = null_coordinate_data(d)
    n = d - 2
    block0 = middle0[:n, 1 : n + 1]
    block1 = middle1[:n, 1 : n + 1]
    _, _, smaller0, smaller1, _ = homotopy_data(d - 1)

    row_scales = [sp.factor(block0[i, 0] / smaller0[i, 0]) for i in range(n)]
    column_scales = [
        sp.factor(block0[0, j] / (row_scales[0] * smaller0[0, j]))
        for j in range(n)
    ]
    reconstructed0 = sp.diag(*row_scales) * smaller0 * sp.diag(*column_scales)
    constant_match = sp.simplify(reconstructed0 - block0) == sp.zeros(n)

    ratios = set()
    for i in range(n):
        for j in range(n):
            denominator = row_scales[i] * smaller1[i, j] * column_scales[j]
            if denominator != 0:
                ratios.add(sp.factor(block1[i, j] / denominator))
    linear_match = len(ratios) == 1
    print(
        f"d={d}, constant_match={constant_match}, linear_match={linear_match}, "
        f"t_scales={ratios if len(ratios) <= 4 else 'mixed'}"
    )
