#!/usr/bin/env python3
"""Check full three-parameter binomial coefficients for one broom case."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from analyze_broom_terminal_binomial_differences import broom, grouped
from analyze_deepest_support_leaf_bundle_differences import (
    forward_coefficients,
)
from stress_sibling_theta_core_recursive_phase_split import JET_CACHE


BLOCKS = ("shadow_phi", "component_square", "total")


def triple_forward_coefficients(
    cube: list[list[list[int]]],
) -> list[list[list[int]]]:
    """Return all Delta_x^a Delta_y^b Delta_z^c f(0,0,0)."""
    size_x = len(cube)
    size_y = len(cube[0])
    size_z = len(cube[0][0])
    after_x = [
        [[0 for _ in range(size_z)] for _ in range(size_y)]
        for _ in range(size_x)
    ]
    for second in range(size_y):
        for third in range(size_z):
            coefficients = forward_coefficients(
                [cube[first][second][third] for first in range(size_x)]
            )
            for first, coefficient in enumerate(coefficients):
                after_x[first][second][third] = coefficient
    after_y = [
        [[0 for _ in range(size_z)] for _ in range(size_y)]
        for _ in range(size_x)
    ]
    for first in range(size_x):
        for third in range(size_z):
            coefficients = forward_coefficients(
                [after_x[first][second][third] for second in range(size_y)]
            )
            for second, coefficient in enumerate(coefficients):
                after_y[first][second][third] = coefficient
    result = [
        [[0 for _ in range(size_z)] for _ in range(size_y)]
        for _ in range(size_x)
    ]
    for first in range(size_x):
        for second in range(size_y):
            coefficients = forward_coefficients(after_y[first][second])
            for third, coefficient in enumerate(coefficients):
                result[first][second][third] = coefficient
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path-length", type=int, required=True)
    parser.add_argument("--rank", type=int, required=True)
    parser.add_argument("--extra", type=int, default=6)
    args = parser.parse_args()
    bound = 2 * args.rank + args.extra
    cubes = {
        block: [
            [
                [0 for _ in range(bound + 1)]
                for _ in range(bound + 1)
            ]
            for _ in range(bound + 1)
        ]
        for block in BLOCKS
    }
    for root_leaves in range(bound + 1):
        for support_leaves in range(bound + 1):
            for isolates in range(bound + 1):
                graph, root, support = broom(
                    args.path_length,
                    root_leaves=root_leaves,
                    support_leaves=support_leaves,
                    isolates=isolates,
                )
                values = grouped(graph, root, support, args.rank)
                for block in BLOCKS:
                    cubes[block][root_leaves][support_leaves][isolates] = (
                        values[block]
                    )
    failures: list[dict] = []
    minima: dict[str, dict | None] = {}
    nonzero_orders: dict[str, list[int]] = {}
    checked = 0
    for block in BLOCKS:
        transformed = triple_forward_coefficients(cubes[block])
        minimum: dict | None = None
        maximum_orders = [0, 0, 0]
        for first, plane in enumerate(transformed):
            for second, row in enumerate(plane):
                for third, coefficient in enumerate(row):
                    checked += 1
                    record = {
                        "block": block,
                        "difference_orders": [first, second, third],
                        "coefficient": coefficient,
                    }
                    if minimum is None or coefficient < minimum["coefficient"]:
                        minimum = record
                    if coefficient:
                        maximum_orders[0] = max(maximum_orders[0], first)
                        maximum_orders[1] = max(maximum_orders[1], second)
                        maximum_orders[2] = max(maximum_orders[2], third)
                    if coefficient < 0:
                        failures.append(record)
        minima[block] = minimum
        nonzero_orders[block] = maximum_orders
    failure_counts = {
        block: sum(item["block"] == block for item in failures)
        for block in BLOCKS
    }
    report = {
        "status": (
            "PASS_BROOM_TERMINAL_TRIPLE_BINOMIAL_POSITIVITY"
            if not failures
            else "FAIL_BROOM_TERMINAL_TRIPLE_BINOMIAL_POSITIVITY"
        ),
        "path_length": args.path_length,
        "rank_q": args.rank,
        "degree_bound": bound,
        "checked_coefficients": checked,
        "failure_count": len(failures),
        "failure_counts_by_block": failure_counts,
        "first_failures": failures[:50],
        "minima": minima,
        "maximum_nonzero_orders_by_axis": nonzero_orders,
        "jet_cache_entries": len(JET_CACHE),
        "warning": (
            "This is one exact terminal parameter/rank case; a symbolic "
            "formula or a degree-complete family argument is still needed."
        ),
    }
    output = Path(
        "broom_terminal_triple_binomial_"
        f"L{args.path_length}_q{args.rank}_20260729.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
