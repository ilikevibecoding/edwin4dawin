#!/usr/bin/env python3
"""Search for low-rank d-to-d-1 recurrences of deflated boundary blocks."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def diagonal_match_residual(block: sp.Matrix, smaller: sp.Matrix):
    n = smaller.rows
    candidates = []
    for anchor_row in range(n):
        for anchor_column in range(n):
            if any(
                smaller[i, anchor_column] == 0 or block[i, anchor_column] == 0
                for i in range(n)
            ):
                continue
            if any(
                smaller[anchor_row, j] == 0 or block[anchor_row, j] == 0
                for j in range(n)
            ):
                continue
            row_scales = [
                sp.factor(block[i, anchor_column] / smaller[i, anchor_column])
                for i in range(n)
            ]
            column_scales = [
                sp.factor(
                    block[anchor_row, j]
                    / (row_scales[anchor_row] * smaller[anchor_row, j])
                )
                for j in range(n)
            ]
            residual = sp.simplify(
                block - sp.diag(*row_scales) * smaller * sp.diag(*column_scales)
            )
            candidates.append((residual.rank(), residual, row_scales, column_scales))
    if not candidates:
        return None
    _, residual, row_scales, column_scales = min(candidates, key=lambda item: item[0])
    return residual, row_scales, column_scales


for d in range(4, 11):
    _, _, _, m0, m1 = null_coordinate_data(d)
    _, _, _, s0, s1 = null_coordinate_data(d - 1)
    n = d - 2
    print(f"d={d}")
    for row_side, rows in (("first", slice(0, n)), ("last", slice(1, n + 1))):
        for column_side, columns in (("first", slice(0, n)), ("last", slice(1, n + 1))):
            matched = diagonal_match_residual(m0[rows, columns], s0)
            if matched is None:
                print(f" {row_side}-{column_side}: unavailable")
                continue
            residual0, row_scales, column_scales = matched
            residual1 = sp.simplify(
                m1[rows, columns]
                - sp.diag(*row_scales) * s1 * sp.diag(*column_scales)
            )
            signs0 = sorted(set(sp.sign(value) for value in residual0))
            signs1 = sorted(set(sp.sign(value) for value in residual1))
            print(
                f" {row_side}-{column_side}: "
                f"rank0={residual0.rank()} signs0={signs0}; "
                f"rank1={residual1.rank()} signs1={signs1}"
            )
