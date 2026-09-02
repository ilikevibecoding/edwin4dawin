#!/usr/bin/env python3
"""Print exact scaling data in the nested shifted Schur cascade."""

from __future__ import annotations

import sympy as sp

from explore_bottom_forward_nested_schur_cascade import (
    anchored_residual,
    family,
)
from explore_bottom_forward_shifted_closure import schur_top_left


def normalized(values):
    return [sp.factor(value / values[0]) for value in values]


def main() -> None:
    for n in range(3, 6):
        shift = 0
        current = schur_top_left(family(n, shift))
        print(f"n={n}", flush=True)
        for depth in range(1, n):
            target = family(n - depth, shift + 2 * depth)
            residual, rows, columns = anchored_residual(current, target)
            print(
                f" depth={depth} row0={sp.factor(rows[0])} "
                f"rows_norm={normalized(rows)} cols={list(map(sp.factor, columns))}",
                flush=True,
            )
            if residual.rows == 1:
                break
            current = residual[1:, 1:]


if __name__ == "__main__":
    main()
