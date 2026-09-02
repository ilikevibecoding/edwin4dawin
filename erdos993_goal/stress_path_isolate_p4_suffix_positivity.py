#!/usr/bin/env python3
"""Stress the stronger suffix-positivity pattern in the P4 sums.

For both the bottom group and the intersection-lift residual, order
the binomial convolution by the number u of isolates selected in the
left copy.  The observed summands change sign at most once, from
negative to positive, and every suffix sum is nonnegative.

This stronger pattern may admit a telescoping proof.  The checks here
are exact finite evidence only.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_intersection_lift import (
    make_kernel,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


def suffix_audit(values: list[int]):
    transitions = 0
    seen_positive = False
    for value in values:
        if value > 0:
            seen_positive = True
        elif value < 0 and seen_positive:
            transitions += 1
    suffixes = []
    total = 0
    for index in range(len(values) - 1, -1, -1):
        total += values[index]
        suffixes.append((index, total))
    return transitions, suffixes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--q-max", type=int, default=17)
    parser.add_argument("--x-max", type=int, default=5)
    parser.add_argument("--layer-max", type=int, default=14)
    args = parser.parse_args()

    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    bottom_suffix_checks = 0
    lift_suffix_checks = 0
    sign_pattern_checks = 0
    failures = []
    minima = {"bottom": None, "lift": None}
    try:
        for q in range(6, args.q_max + 1):
            for x in range(args.x_max + 1):
                length = 2 * q - 4 + x
                maximum = min(
                    args.layer_max + 1, 2 * q - 3
                )
                states_q = direct.terminal_series(
                    q,
                    length,
                    maximum,
                    return_states=True,
                )
                states_q1 = direct.terminal_series(
                    q - 1,
                    length,
                    maximum,
                    return_states=True,
                )
                states_q2 = direct.terminal_series(
                    q - 2,
                    length,
                    maximum,
                    return_states=True,
                )
                kernel_q = make_kernel(states_q, states_q1)
                kernel_q1 = make_kernel(states_q1, states_q2)

                for j in range(maximum + 1):
                    bottom_values = [
                        math.comb(j, u)
                        * kernel_q(u, j - u)
                        for u in range(j + 1)
                    ]
                    transitions, suffixes = suffix_audit(
                        bottom_values
                    )
                    sign_pattern_checks += 1
                    if transitions:
                        failures.append(
                            {
                                "kind": "bottom_sign_pattern",
                                "q": q,
                                "x": x,
                                "j": j,
                                "transitions": transitions,
                            }
                        )
                    for u, value in suffixes:
                        bottom_suffix_checks += 1
                        record = {
                            "q": q,
                            "x": x,
                            "j": j,
                            "u": u,
                            "value": value,
                        }
                        if (
                            minima["bottom"] is None
                            or value
                            < minima["bottom"]["value"]
                        ):
                            minima["bottom"] = record
                        if value < 0:
                            failures.append(
                                {
                                    "kind": "bottom_suffix",
                                    **record,
                                }
                            )

                for j in range(maximum):
                    for h in range(j + 1):
                        d = j - h
                        lift_values = [
                            math.comb(d, u)
                            * (
                                kernel_q(
                                    h + u + 1,
                                    j - u + 1,
                                )
                                - kernel_q1(
                                    h + u, j - u
                                )
                            )
                            for u in range(d + 1)
                        ]
                        transitions, suffixes = suffix_audit(
                            lift_values
                        )
                        sign_pattern_checks += 1
                        if transitions:
                            failures.append(
                                {
                                    "kind": "lift_sign_pattern",
                                    "q": q,
                                    "x": x,
                                    "j": j,
                                    "h": h,
                                    "transitions": transitions,
                                }
                            )
                        for u, value in suffixes:
                            lift_suffix_checks += 1
                            record = {
                                "q": q,
                                "x": x,
                                "j": j,
                                "h": h,
                                "u": u,
                                "value": value,
                            }
                            if (
                                minima["lift"] is None
                                or value
                                < minima["lift"]["value"]
                            ):
                                minima["lift"] = record
                            if value < 0:
                                failures.append(
                                    {
                                        "kind": "lift_suffix",
                                        **record,
                                    }
                                )
    finally:
        direct.path_row_series = original

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_SUFFIX_POSITIVITY_STRESS"
            if not failures
            else "FAIL"
        ),
        "q_range": f"6..{args.q_max}",
        "x_range": f"0..{args.x_max}",
        "layer_cap": args.layer_max,
        "bottom_suffix_checks": bottom_suffix_checks,
        "intersection_lift_suffix_checks": (
            lift_suffix_checks
        ),
        "single_sign_transition_checks": sign_pattern_checks,
        "minima": minima,
        "failure_count": len(failures),
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_suffix_positivity_stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
