#!/usr/bin/env python3
"""Stress the fixed-intersection grouping for stable path P4.

Let A and B be the subsets of the j ordinary isolates selected in the
two polarized copies.  The subset-union rule fixes |A union B|=j.
This script groups the complete distinguished-isolate P4 kernel by

    h = |A intersect B|.

It verifies both that each h-group is nonnegative and that their sum
is exactly c_(q,j+1)-c_(q-1,j).
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_cross_polarizations import (
    cross_polarization,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=24)
    parser.add_argument("--layer-max", type=int, default=16)
    parser.add_argument("--x-max", type=int, default=12)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    failures = []
    reconstruction_failures = []
    group_checks = 0
    coefficient_checks = 0
    minimum = None
    try:
        for q in range(5, args.q_max + 1):
            maximum = min(args.layer_max, 2 * q - 3)
            for x in range(args.x_max + 1):
                length = 2 * q - 4 + x
                states_q = direct.terminal_series(
                    q,
                    length,
                    maximum + 1,
                    return_states=True,
                )
                states_lower = direct.terminal_series(
                    q - 1,
                    length,
                    maximum + 1,
                    return_states=True,
                )
                upper_series = direct.terminal_series(
                    q, length, maximum + 1
                )
                lower_series = direct.terminal_series(
                    q - 1, length, maximum
                )
                pair_cache: dict[tuple[int, int], int] = {}

                def pair(a: int, b: int) -> int:
                    tag = (a, b)
                    if tag not in pair_cache:
                        pair_cache[tag] = int(
                            sum(
                                sign
                                * cross_polarization(
                                    states_q,
                                    states_lower,
                                    phase_name,
                                    a,
                                    b,
                                )
                                for phase_name, sign in (
                                    ("new", 1),
                                    ("old", -1),
                                    ("lower", -1),
                                )
                            )
                        )
                    return pair_cache[tag]

                for layer in range(maximum + 1):
                    grouped_total = 0
                    for intersection in range(layer + 1):
                        group = 0
                        remaining = layer - intersection
                        for left_only in range(remaining + 1):
                            right_only = remaining - left_only
                            a = layer - right_only
                            b = layer - left_only
                            weight = math.factorial(layer) // (
                                math.factorial(intersection)
                                * math.factorial(left_only)
                                * math.factorial(right_only)
                            )
                            group += weight * pair(a, b)
                        grouped_total += group
                        group_checks += 1
                        record = {
                            "q": q,
                            "x": x,
                            "input_layer_j": layer,
                            "intersection_h": intersection,
                            "value": group,
                        }
                        if minimum is None or group < minimum[0]:
                            minimum = (group, record)
                        if group < 0:
                            failures.append(record)

                    expected = int(
                        upper_series[layer + 1]
                        - lower_series[layer]
                    )
                    coefficient_checks += 1
                    if grouped_total != expected:
                        reconstruction_failures.append(
                            {
                                "q": q,
                                "x": x,
                                "input_layer_j": layer,
                                "grouped_total": grouped_total,
                                "expected": expected,
                            }
                        )
    finally:
        direct.path_row_series = original

    passed = not failures and not reconstruction_failures
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_INTERSECTION_GROUP_STRESS"
            if passed
            else "FAIL"
        ),
        "q_range": f"5..{args.q_max}",
        "layer_cap": args.layer_max,
        "stable_x_range": f"0..{args.x_max}",
        "intersection_group_checks": group_checks,
        "coefficient_reconstruction_checks": coefficient_checks,
        "negative_group_count": len(failures),
        "reconstruction_failure_count": len(
            reconstruction_failures
        ),
        "minimum_group": minimum[1] if minimum else None,
        "first_negative_groups": failures[:50],
        "first_reconstruction_failures": (
            reconstruction_failures[:50]
        ),
        "warning": (
            "Exact finite evidence only.  Uniform nonnegativity of "
            "the fixed-intersection group is the remaining theorem."
        ),
    }
    Path(
        "path_isolate_p4_intersection_group_stress_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
