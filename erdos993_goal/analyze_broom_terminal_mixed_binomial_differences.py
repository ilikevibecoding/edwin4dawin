#!/usr/bin/env python3
"""Audit pairwise mixed binomial coefficients for terminal brooms.

For a polynomial f(x,y), the coefficients in the product-binomial
basis binom(x,a)binom(y,b) are the mixed forward differences
Delta_x^a Delta_y^b f(0,0).  This checks each pair of the three broom
decorations, with the third decoration set to zero.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

from analyze_broom_terminal_binomial_differences import broom, grouped
from analyze_deepest_support_leaf_bundle_differences import (
    forward_coefficients,
)


PARAMETERS = ("root_leaves", "support_leaves", "isolates")
BLOCKS = ("shadow_phi", "component_square", "total")


def mixed_forward_coefficients(
    grid: list[list[int]],
) -> list[list[int]]:
    """Return Delta_x^a Delta_y^b f(0,0) for a rectangular grid."""
    x_transformed = [
        [0 for _ in range(len(grid[0]))] for _ in range(len(grid))
    ]
    for second in range(len(grid[0])):
        coefficients = forward_coefficients(
            [grid[first][second] for first in range(len(grid))]
        )
        for first, coefficient in enumerate(coefficients):
            x_transformed[first][second] = coefficient
    return [
        forward_coefficients(x_transformed[first])
        for first in range(len(x_transformed))
    ]


def main() -> None:
    checked = 0
    failures: list[dict] = []
    minima: dict[str, tuple[int, dict] | None] = {
        block: None for block in BLOCKS
    }
    bounds: dict[str, int] = {}
    for path_length in range(1, 9):
        for q in range(4, 9):
            bound = 2 * q + 6
            bounds[str(q)] = bound
            for first_parameter, second_parameter in itertools.combinations(
                PARAMETERS, 2
            ):
                grids = {
                    block: [
                        [0 for _ in range(bound + 1)]
                        for _ in range(bound + 1)
                    ]
                    for block in BLOCKS
                }
                for first in range(bound + 1):
                    for second in range(bound + 1):
                        kwargs = {
                            first_parameter: first,
                            second_parameter: second,
                        }
                        graph, root, support = broom(
                            path_length, **kwargs
                        )
                        values = grouped(graph, root, support, q)
                        for block in BLOCKS:
                            grids[block][first][second] = values[block]
                for block in BLOCKS:
                    coefficients = mixed_forward_coefficients(grids[block])
                    for first_order, row in enumerate(coefficients):
                        for second_order, coefficient in enumerate(row):
                            checked += 1
                            record = {
                                "path_length": path_length,
                                "rank_q": q,
                                "parameters": [
                                    first_parameter,
                                    second_parameter,
                                ],
                                "block": block,
                                "difference_orders": [
                                    first_order,
                                    second_order,
                                ],
                                "coefficient": coefficient,
                            }
                            if (
                                minima[block] is None
                                or coefficient < minima[block][0]
                            ):
                                minima[block] = (coefficient, record)
                            if coefficient < 0:
                                failures.append(record)
    report = {
        "status": (
            "PASS_BROOM_TERMINAL_PAIRWISE_BINOMIAL_POSITIVITY"
            if not failures
            else "FAIL_BROOM_TERMINAL_PAIRWISE_BINOMIAL_POSITIVITY"
        ),
        "maximum_path_length": 8,
        "ranks": "4..8",
        "degree_bounds": bounds,
        "parameter_pairs": [
            list(pair) for pair in itertools.combinations(PARAMETERS, 2)
        ],
        "checked_coefficients": checked,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "minima": {
            block: item[1] if item is not None else None
            for block, item in minima.items()
        },
        "warning": (
            "Pairwise restrictions with the third parameter zero do not "
            "by themselves prove full three-parameter positivity."
        ),
    }
    Path(
        "broom_terminal_mixed_binomial_differences_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
