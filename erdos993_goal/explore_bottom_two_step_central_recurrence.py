#!/usr/bin/env python3
"""Search for the two-step recurrence of the symmetric central form K_d J."""

from __future__ import annotations

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def central_form(d: int) -> sp.Matrix:
    q = d - 1
    return central_inverse_from_blocks(d).inv() * reverse_identity(q)


def diagonal_residual(block: sp.Matrix, smaller: sp.Matrix):
    n = smaller.rows
    best = None
    for anchor_row in range(n):
        for anchor_column in range(n):
            if any(block[i, anchor_column] == 0 or smaller[i, anchor_column] == 0 for i in range(n)):
                continue
            if any(block[anchor_row, j] == 0 or smaller[anchor_row, j] == 0 for j in range(n)):
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
            record = (residual.rank(), anchor_row, anchor_column, residual)
            if best is None or record[0] < best[0]:
                best = record
    return best


for d in range(5, 13):
    old = central_form(d - 2)
    new = central_form(d)
    n = old.rows
    print(f"d={d} old={old.shape} new={new.shape}")
    for row_start in range(3):
        for column_start in range(3):
            block = new[row_start : row_start + n, column_start : column_start + n]
            result = diagonal_residual(block, old)
            if result is None:
                print(f" block({row_start},{column_start}) unavailable")
                continue
            rank, anchor_row, anchor_column, residual = result
            signs = sorted(set(sp.sign(value) for value in residual))
            print(
                f" block({row_start},{column_start}) rank={rank} "
                f"anchor=({anchor_row},{anchor_column}) signs={signs}",
                flush=True,
            )
