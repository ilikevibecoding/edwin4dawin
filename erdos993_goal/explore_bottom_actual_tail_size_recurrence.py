#!/usr/bin/env python3
"""Search for low-rank recurrences between consecutive actual Erdos tails."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def actual(m: int):
    d = 2 * m + 3
    return two_sided_data(d)[3][:m, :m]


def best_diagonal_residual(block: sp.Matrix, smaller: sp.Matrix):
    n = smaller.rows
    candidates = []
    for anchor_row in range(n):
        for anchor_column in range(n):
            if any(
                block[i, anchor_column] == 0 or smaller[i, anchor_column] == 0
                for i in range(n)
            ):
                continue
            if any(
                block[anchor_row, j] == 0 or smaller[anchor_row, j] == 0
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
            candidates.append((residual.rank(), residual))
    return min(candidates, key=lambda item: item[0])


previous = actual(1)
for m in range(2, 8):
    current = actual(m)
    n = m - 1
    print(f"m={m}", flush=True)
    for row_side, rows in (("first", slice(0, n)), ("last", slice(1, m))):
        for column_side, columns in (("first", slice(0, n)), ("last", slice(1, m))):
            rank, residual = best_diagonal_residual(current[rows, columns], previous)
            print(
                f" {row_side}-{column_side}: rank={rank}, "
                f"entry_signs={sorted(set(sp.sign(value) for value in residual))}"
            , flush=True)
    previous = current
