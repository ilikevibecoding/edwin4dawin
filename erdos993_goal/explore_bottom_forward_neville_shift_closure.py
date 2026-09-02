#!/usr/bin/env python3
"""Test size closure after one genuine Neville-elimination stage.

For C(n,s), eliminate the first column bottom-to-top (and separately the
first row right-to-left via the transpose), then compare the trailing block
with C(n-1,s+2), which is formed from the same fixed-q polynomial family.
Exact diagonal equivalence would give a direct Neville induction.
"""

from __future__ import annotations

import sympy as sp

from explore_bottom_forward_nested_schur_cascade import family
from explore_bottom_forward_size_recurrence import diagonal_match, signs


def first_neville_stage(matrix: sp.Matrix) -> tuple[sp.Matrix, list[sp.Expr]]:
    work = sp.Matrix(matrix)
    multipliers = []
    for row in range(work.rows - 1, 0, -1):
        multiplier = sp.cancel(work[row, 0] / work[row - 1, 0])
        multipliers.append(multiplier)
        work[row, :] = sp.simplify(work[row, :] - multiplier * work[row - 1, :])
    assert work[1:, 0] == sp.zeros(work.rows - 1, 1)
    return work[1:, 1:], multipliers


def main() -> None:
    for shift in (0, 2, 4, 6):
        for n in range(2, 9):
            current = family(n, shift)
            target = family(n - 1, shift + 2)
            records = []
            for orientation, matrix in (("rows", current), ("columns", current.T)):
                trailing, multipliers = first_neville_stage(matrix)
                if orientation == "columns":
                    trailing = trailing.T
                match = diagonal_match(trailing, target)
                records.append(
                    {
                        "orientation": orientation,
                        "multipliers_positive": all(value > 0 for value in multipliers),
                        "residual_rank": match[0],
                        "residual_signs": signs(match[3]),
                        "exact_diagonal_match": match[0] == 0,
                    }
                )
            print(f"n={n} shift={shift} records={records}", flush=True)


if __name__ == "__main__":
    main()
